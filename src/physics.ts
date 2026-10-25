import { CAR_CONFIGS, canVehicleHaveHitch, createDefaultEngineState, createDefaultFuelSystem, createDefaultFluidTank, ensureVehicleFluidTank, liquidTypeToStainType, createDefaultVehicleDamage, ensureVehicleDamage, getVehicleFuelCapPosition, getVehicleAxleGeometry, isTrailerVehicle, isRoadMachinery, getVehicleDriveType, SPEED_KMH_TO_PX_S, PX_S_TO_SPEED_KMH, getLPGDefaultCapacity, cycleVehicleDiffLock, getVehicleDiffCapabilities, ensureVehicleDiffLock,   getVehicleHeadlightDynamicState } from './vehicleHelpers';
import { applyPowertrain } from './powertrainVariants';
import { Building, GameWorld, InputState, Particle, Pedestrian, Player, SkidMark, Vehicle, WheelState, StreetProp, FluidStainType, FluidStain, Roundabout, RollingStockCar, WorldWind, RoadSegment, Intersection } from './types';
import { getBuildingLayout, constrainPlayerToInterior } from './buildingInteriors';
import { constrainPlayerToBusInterior } from './busInteriorSystem';
import { sound } from './audio';
import { trafficDiagnostics, isVehicleDisabledOrCrashed } from './aiTraffic';
import { performanceConfig } from './performanceConfig';
import { createDefaultPlayerInventory, addPlayerNotification, getPlayerTotalCarriedWeight } from './items';
import { defaultBodyState } from './sensations';
import { updateBodySystem, distributeImpactDamage, applyDriverVehicleCrashTrauma, addInjuryToPart } from './bodySystem';
import { updateMedicineSystem } from './medicineSystem';
import { updateWorldItemsThermodynamics } from './itemThermalSystem';
import { GuardrailPhysics } from './guardrailPhysics';
import { AGRICULTURAL_FIELDS, getTerrainSlope } from './terrainElevation';
import { getRiverWaterAt, getUniversalWaterDepthAt } from './riverSystem';
import { getBiomeSampleAt } from './biomeSystem';
import { calculateClimateAtmosphere, createInitialCalendarState, isWorldFreezing } from './calendarSystem';
import { getEffectiveWeatherWeights } from './weatherTransition';
import {
  ImpactZone,
  calculateStructureStiffness,
  crushFromEnergy,
  nodeZone,
  normalAndTangential,
  severityFromEnergy,
  strikeEnergy,
  totalCapPx
} from './damageModel';
import {
  ensureVehicleNodeBeam,
  stepNodeBeamSimulation,
  applyNodeBeamImpact,
  stepNodeBeamContinuousContact,
  advanceCrashStroke
} from './nodeBeamPhysics';

export { isWorldFreezing };

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

/**
 * Последний рубеж защиты кинематики автомобиля.
 *
 * Любая ошибка в столкновениях, буксировке или сетке могла записать NaN в
 * x/y/vx/vy/angle. После этого Math.max/min и cos/sin только размножали NaN,
 * HUD показывал «NaN», а Canvas получал нефинитные координаты. Здесь мы
 * восстанавливаем последнее корректное состояние и жёстко ограничиваем
 * безразмерные выбросы.
 */
function sanitizeVehicleKinematics(vehicle: Vehicle): void {
  const v = vehicle as any;
  const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
  const last = v._lastGoodKinematics as { x: number; y: number; angle: number } | undefined;

  if (!finite(vehicle.x) || !finite(vehicle.y) || !finite(vehicle.angle)) {
    if (last) {
      vehicle.x = last.x;
      vehicle.y = last.y;
      vehicle.angle = last.angle;
    } else {
      if (!finite(vehicle.x)) vehicle.x = 0;
      if (!finite(vehicle.y)) vehicle.y = 0;
      if (!finite(vehicle.angle)) vehicle.angle = 0;
    }
    if (!finite(vehicle.vx)) vehicle.vx = 0;
    if (!finite(vehicle.vy)) vehicle.vy = 0;
    if (!finite(vehicle.angularVelocity)) vehicle.angularVelocity = 0;
  }

  if (!finite(vehicle.vx)) vehicle.vx = 0;
  if (!finite(vehicle.vy)) vehicle.vy = 0;
  if (!finite(vehicle.angularVelocity)) vehicle.angularVelocity = 0;
  if (!finite(vehicle.steerAngle)) vehicle.steerAngle = 0;
  if (!finite(vehicle.lateralVelocity)) vehicle.lateralVelocity = 0;

  // Абсолютные предохранители: даже без NaN машина не должна улетать
  // со сверхзвуковой скоростью из-за накопленной ошибки импульса.
  const speedAbs = Math.hypot(vehicle.vx, vehicle.vy);
  const maxLinear = 3000;
  if (speedAbs > maxLinear) {
    const k = maxLinear / speedAbs;
    vehicle.vx *= k;
    vehicle.vy *= k;
  }
  if (vehicle.angularVelocity > 25) vehicle.angularVelocity = 25;
  if (vehicle.angularVelocity < -25) vehicle.angularVelocity = -25;

  if (!finite(vehicle.speed)) {
    const cosA = Math.cos(vehicle.angle);
    const sinA = Math.sin(vehicle.angle);
    vehicle.speed = vehicle.vx * cosA + vehicle.vy * sinA;
  }
  if (!finite(vehicle.speed)) vehicle.speed = 0;

  vehicle.angle = ((vehicle.angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  v._lastGoodKinematics = { x: vehicle.x, y: vehicle.y, angle: vehicle.angle };
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

/**
 * Global player preference: when 'auto', manual (MT) gearboxes of the player's
 * car shift up/down by themselves (PauseMenu > Game > "КПП: Авто").
 * Lives at module scope because the fixed-timestep sim reads it every frame.
 */
let playerAutoShiftPref: 'auto' | 'manual' = 'manual';
export function setManualAutoShiftPref(mode: 'auto' | 'manual'): void {
  playerAutoShiftPref = mode;
}

export function isArticulatedRoller(car: Vehicle): boolean {
  return car.type === 'roller_heavy_tandem' || car.type === 'roller_compact_sidewalk' || car.type === 'roller_pneumatic';
}

/**
 * Реальное пятно контакта кузова с прямоугольным препятствием (стена, здание).
 * Раньше точка контакта бралась «по центру носа», а ширина — по всему кузову, поэтому удар
 * правой половиной мял весь перед одинаково. Теперь пятно берётся по узлам живого контура,
 * которые зашли в препятствие: центр и ширина вдоль стены. Нормаль направлена от препятствия к машине.
 */
function computeBoxContactPatch(
  car: Vehicle,
  box: { x: number; y: number; width: number; height: number },
  nX: number,
  nY: number
): { x: number; y: number; widthPx: number } {
  const fallback = {
    x: car.x - nX * (car.length / 2),
    y: car.y - nY * (car.width / 2),
    widthPx: car.width
  };
  const nodes = car.damage?.nodeBeam?.nodes;
  const pts: { x: number; y: number }[] = [];
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  if (nodes && nodes.length >= 8) {
    const perim = car.damage!.nodeBeam!.perimeterCount ?? 16;
    for (let i = 0; i < Math.min(perim, nodes.length); i++) {
      const n = nodes[i];
      pts.push({ x: car.x + n.x * cosA - n.y * sinA, y: car.y + n.x * sinA + n.y * cosA });
    }
  } else {
    const hl = car.length / 2;
    const hw = car.width / 2;
    for (const [lx, ly] of [[hl, -hw], [hl, hw], [-hl, -hw], [-hl, hw], [hl, 0], [-hl, 0], [0, -hw], [0, hw]]) {
      pts.push({ x: car.x + lx * cosA - ly * sinA, y: car.y + lx * sinA + ly * cosA });
    }
  }

  const tX = -nY;
  const tY = nX;
  const margin = 1.0;
  let inside = pts.filter(p =>
    p.x >= box.x - margin && p.x <= box.x + box.width + margin &&
    p.y >= box.y - margin && p.y <= box.y + box.height + margin
  );
  if (inside.length === 0) {
    // Ни один узел не зашёл (касание рёбрами): берём ближайшие к препятствию вдоль нормали
    let minProj = Infinity;
    for (const p of pts) minProj = Math.min(minProj, p.x * nX + p.y * nY);
    inside = pts.filter(p => p.x * nX + p.y * nY <= minProj + 1.5);
  }
  if (inside.length === 0) return fallback;

  let minS = Infinity, maxS = -Infinity;
  let deepest = inside[0];
  let deepestProj = Infinity;
  for (const p of inside) {
    const sCoord = p.x * tX + p.y * tY;
    if (sCoord < minS) minS = sCoord;
    if (sCoord > maxS) maxS = sCoord;
    const proj = p.x * nX + p.y * nY;
    if (proj < deepestProj) { deepestProj = proj; deepest = p; }
  }
  const sCenter = (minS + maxS) / 2;
  const sDeep = deepest.x * tX + deepest.y * tY;
  return {
    x: deepest.x + tX * (sCenter - sDeep),
    y: deepest.y + tY * (sCenter - sDeep),
    widthPx: Math.max(4, Math.min(car.width, maxS - minS + 3))
  };
}

export function getVehicleCollisionOBBs(car: Vehicle, extraMargin = 0.5): VehicleCollisionOBB[] {
  const dmg = car.damage;

  // The renderer uses the node-beam perimeter. Derive the collision proxy from
  // that same live contour so a visibly crushed car cannot keep colliding as
  // its original rectangle. The energy damage record also bounds the hull while
  // a newly hit mesh is still settling. We retain an OBB for the SAT solver.
  const perimeterCount = dmg?.nodeBeam?.perimeterCount ?? 16;
  const perimeter = dmg?.deformedVertices?.slice(0, perimeterCount) ?? [];
  let minLocalX = Infinity;
  let maxLocalX = -Infinity;
  let minLocalY = Infinity;
  let maxLocalY = -Infinity;

  for (const vertex of perimeter) {
    const x = vertex.localX + (Number.isFinite(vertex.offsetX) ? vertex.offsetX : 0);
    const y = vertex.localY + (Number.isFinite(vertex.offsetY) ? vertex.offsetY : 0);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minLocalX = Math.min(minLocalX, x);
    maxLocalX = Math.max(maxLocalX, x);
    minLocalY = Math.min(minLocalY, y);
    maxLocalY = Math.max(maxLocalY, y);
  }

  const hasLivePerimeter = perimeter.length >= 8 &&
    Number.isFinite(minLocalX) && Number.isFinite(maxLocalX) &&
    Number.isFinite(minLocalY) && Number.isFinite(maxLocalY) &&
    maxLocalX - minLocalX > car.length * 0.20 &&
    maxLocalY - minLocalY > car.width * 0.20;

  const frontC = dmg?.frontCrumple || 0;
  const rearC = dmg?.rearCrumple || 0;
  const leftD = dmg?.leftDent || 0;
  const rightD = dmg?.rightDent || 0;

  // A hit records energy immediately, but the visual mesh reaches its target
  // over subsequent microsteps. Never let that short settling interval restore
  // the original collision hull.
  const scalarMinX = -car.length / 2 + rearC;
  const scalarMaxX = car.length / 2 - frontC;
  const scalarMinY = -car.width / 2 + leftD;
  const scalarMaxY = car.width / 2 - rightD;
  const collisionMinX = hasLivePerimeter ? Math.max(minLocalX, scalarMinX) : scalarMinX;
  const collisionMaxX = hasLivePerimeter ? Math.min(maxLocalX, scalarMaxX) : scalarMaxX;
  const collisionMinY = hasLivePerimeter ? Math.max(minLocalY, scalarMinY) : scalarMinY;
  const collisionMaxY = hasLivePerimeter ? Math.min(maxLocalY, scalarMaxY) : scalarMaxY;

  const effL = hasLivePerimeter
    ? Math.max(car.length * 0.45, collisionMaxX - collisionMinX)
    : Math.max(car.length * 0.45, car.length - (frontC + rearC));
  const effW = hasLivePerimeter
    ? Math.max(car.width * 0.45, collisionMaxY - collisionMinY)
    : Math.max(car.width * 0.45, car.width - (leftD + rightD));

  const centerLongShift = hasLivePerimeter
    ? (collisionMaxX + collisionMinX) / 2
    : (-frontC + rearC) / 2;
  const centerLatShift = hasLivePerimeter
    ? (collisionMaxY + collisionMinY) / 2
    : (-rightD + leftD) / 2;

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

  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  const centerX = car.x + cosA * centerLongShift - sinA * centerLatShift;
  const centerY = car.y + sinA * centerLongShift + cosA * centerLatShift;

  const halfL = effL / 2 + extraMargin;
  const halfW = effW / 2 + extraMargin;

  const corners = [
    { x: centerX + cosA * halfL - sinA * halfW, y: centerY + sinA * halfL + cosA * halfW },
    { x: centerX + cosA * halfL + sinA * halfW, y: centerY + sinA * halfL - cosA * halfW },
    { x: centerX - cosA * halfL + sinA * halfW, y: centerY - sinA * halfL - cosA * halfW },
    { x: centerX - cosA * halfL - sinA * halfW, y: centerY - sinA * halfL + cosA * halfW }
  ];

  return [
    {
      centerX,
      centerY,
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
  box: { x: number; y: number; width: number; height: number },
  velX: number = 0,
  velY: number = 0
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

  const bCenterX = box.x + box.width / 2;
  const bCenterY = box.y + box.height / 2;
  const dirX = obb.centerX - bCenterX;
  const dirY = obb.centerY - bCenterY;

  let minOverlap = 999999;
  let smallestAxisX = 0;
  let smallestAxisY = 0;

  // Ось удара выбирается не только по минимальному перекрытию, но и по
  // направлению движения. Раньше при скорости 1500 px/s машина за один кадр
  // заходила в стену глубже, чем её полширины, и SAT выбирал поперечную ось:
  // машину выталкивало вбок, она не тормозила и проходила сквозь здание.
  let impactOverlap = 0;
  let impactAxisX = 0;
  let impactAxisY = 0;
  let bestApproach = -Infinity;

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

    // Нормаль ориентируем от препятствия к машине.
    let orientedX = axis.x;
    let orientedY = axis.y;
    if (dirX * orientedX + dirY * orientedY < 0) {
      orientedX = -orientedX;
      orientedY = -orientedY;
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      smallestAxisX = orientedX;
      smallestAxisY = orientedY;
    }

    // approach > 0 — машина движется в сторону препятствия по этой оси.
    const approach = -(velX * orientedX + velY * orientedY);
    if (approach > bestApproach) {
      bestApproach = approach;
      impactAxisX = orientedX;
      impactAxisY = orientedY;
      impactOverlap = overlap;
    }
  }

  const speedSq = velX * velX + velY * velY;
  // Ось удара берём только если её перекрытие сопоставимо с минимальным.
  // Иначе при скольжении вдоль стены «ось движения» (вдоль стены) имела бы
  // огромное перекрытие и машину отбрасывало бы назад вместо бокового скольжения.
  const impactAxisComparable = impactOverlap <= minOverlap * 2.5 + 2.0;
  const useImpactAxis =
    speedSq > 36 &&
    bestApproach > 1.0 &&
    impactOverlap > 0 &&
    impactAxisComparable &&
    Number.isFinite(impactOverlap);

  return {
    collided: true,
    normalX: useImpactAxis ? impactAxisX : smallestAxisX,
    normalY: useImpactAxis ? impactAxisY : smallestAxisY,
    depth: useImpactAxis ? impactOverlap : minOverlap
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
    const res = checkOBBBoxCollision(obb, box, car.vx || 0, car.vy || 0);
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

// Circle-Vehicle collision for pedestrian, circular props, poles, and trees against vehicle body
export function checkPedestrianVehicleCollision(
  px: number,
  py: number,
  radius: number,
  car: Vehicle
): { x: number; y: number; collided: boolean; normalX: number; normalY: number } {
  // Broadphase distance check
  const dx = px - car.x;
  const dy = py - car.y;
  const halfL = car.length / 2;
  const halfW = car.width / 2;
  const maxDim = halfL + radius + 15;
  if (dx * dx + dy * dy > maxDim * maxDim) {
    return { x: px, y: py, collided: false, normalX: 0, normalY: 0 };
  }

  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  // Transform circular obstacle/pedestrian into car local space
  const localX = dx * cosA + dy * sinA;
  const localY = -dx * sinA + dy * cosA;

  // --- REALISTIC DEFORMED PERIMETER POLYGON COLLISION ---
  // If the vehicle has softbody deformation vertices, check against the true 16-node perimeter polygon!
  // This ensures that when a car wraps around a round pole or tree, the pole can nestle deeply inside
  // the V-shaped crumpled metal cavity without being pushed out by a ghost un-deformed rectangle.
  const dmg = car.damage;
  const verts = dmg?.deformedVertices;
  if (verts && verts.length >= 16 && !isArticulatedRoller(car)) {
    let minDistSq = Infinity;
    let closestX = localX;
    let closestY = localY;
    let bestSegIdx = 0;

    for (let i = 0; i < 16; i++) {
      const nextIdx = (i + 1) % 16;
      const vi = verts[i];
      const vj = verts[nextIdx];

      const ax = vi.localX + (vi.offsetX || 0) + (vi.elasticX || 0);
      const ay = vi.localY + (vi.offsetY || 0) + (vi.elasticY || 0);
      const bx = vj.localX + (vj.offsetX || 0) + (vj.elasticX || 0);
      const by = vj.localY + (vj.offsetY || 0) + (vj.elasticY || 0);

      const abx = bx - ax;
      const aby = by - ay;
      const segLenSq = abx * abx + aby * aby;
      let t = 0;
      if (segLenSq > 0.0001) {
        t = Math.max(0, Math.min(1, ((localX - ax) * abx + (localY - ay) * aby) / segLenSq));
      }
      const qx = ax + t * abx;
      const qy = ay + t * aby;
      const dSq = (localX - qx) * (localX - qx) + (localY - qy) * (localY - qy);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestX = qx;
        closestY = qy;
        bestSegIdx = i;
      }
    }

    // 2D Ray-casting point-in-polygon test (is circle center inside vehicle sheet metal?)
    let inside = false;
    for (let i = 0, j = 15; i < 16; j = i++) {
      const vi = verts[i];
      const vj = verts[j];
      const xi = vi.localX + (vi.offsetX || 0) + (vi.elasticX || 0);
      const yi = vi.localY + (vi.offsetY || 0) + (vi.elasticY || 0);
      const xj = vj.localX + (vj.offsetX || 0) + (vj.elasticX || 0);
      const yj = vj.localY + (vj.offsetY || 0) + (vj.elasticY || 0);

      const denom = (yj - yi) === 0 ? 0.0001 : (yj - yi);
      const intersect = ((yi > localY) !== (yj > localY)) &&
        (localX < (xj - xi) * (localY - yi) / denom + xi);
      if (intersect) inside = !inside;
    }

    if (inside) {
      // Circle center is inside the car body metal
      const d = Math.sqrt(minDistSq);
      let dirX = localX - closestX;
      let dirY = localY - closestY;
      let dLen = Math.hypot(dirX, dirY);
      let outNx = 0;
      let outNy = 0;
      if (dLen > 0.001) {
        // Points outward from surface toward circle center
        outNx = -dirX / dLen;
        outNy = -dirY / dLen;
      } else {
        const vi = verts[bestSegIdx];
        const vj = verts[(bestSegIdx + 1) % 16];
        const segX = (vj.localX + (vj.offsetX || 0)) - (vi.localX + (vi.offsetX || 0));
        const segY = (vj.localY + (vj.offsetY || 0)) - (vi.localY + (vi.offsetY || 0));
        const sLen = Math.hypot(segY, -segX) || 1;
        outNx = segY / sLen;
        outNy = -segX / sLen;
      }

      const overlap = radius + d;
      const pushLocalX = outNx * overlap;
      const pushLocalY = outNy * overlap;

      const pushWorldX = pushLocalX * cosA - pushLocalY * sinA;
      const pushWorldY = pushLocalX * sinA + pushLocalY * cosA;

      const pDist = Math.hypot(pushWorldX, pushWorldY);
      return {
        x: px + pushWorldX,
        y: py + pushWorldY,
        collided: true,
        normalX: pDist > 0.001 ? pushWorldX / pDist : 0,
        normalY: pDist > 0.001 ? pushWorldY / pDist : 0
      };
    } else if (minDistSq < radius * radius) {
      // Circle center is outside car body, but circle perimeter overlaps the deformed boundary
      const dist = Math.sqrt(minDistSq);
      const overlap = radius - dist;
      let normLocalX = 0;
      let normLocalY = 0;
      if (dist > 0.0001) {
        normLocalX = (localX - closestX) / dist;
        normLocalY = (localY - closestY) / dist;
      } else {
        const vi = verts[bestSegIdx];
        const vj = verts[(bestSegIdx + 1) % 16];
        const segX = (vj.localX + (vj.offsetX || 0)) - (vi.localX + (vi.offsetX || 0));
        const segY = (vj.localY + (vj.offsetY || 0)) - (vi.localY + (vi.offsetY || 0));
        const sLen = Math.hypot(segY, -segX) || 1;
        normLocalX = segY / sLen;
        normLocalY = -segX / sLen;
      }

      const pushLocalX = normLocalX * overlap;
      const pushLocalY = normLocalY * overlap;

      const pushWorldX = pushLocalX * cosA - pushLocalY * sinA;
      const pushWorldY = pushLocalX * sinA + pushLocalY * cosA;

      const pDist = Math.hypot(pushWorldX, pushWorldY);
      return {
        x: px + pushWorldX,
        y: py + pushWorldY,
        collided: true,
        normalX: pDist > 0.001 ? pushWorldX / pDist : 0,
        normalY: pDist > 0.001 ? pushWorldY / pDist : 0
      };
    }

    return { x: px, y: py, collided: false, normalX: 0, normalY: 0 };
  }

  // Fallback for articulated machinery or un-initialized meshes: OBB loop
  const obbs = getVehicleCollisionOBBs(car, 0);
  let curX = px;
  let curY = py;
  let hasCollided = false;

  for (const obb of obbs) {
    const oDx = curX - obb.centerX;
    const oDy = curY - obb.centerY;
    const oCosA = Math.cos(obb.angle);
    const oSinA = Math.sin(obb.angle);

    const oLocalX = oDx * oCosA + oDy * oSinA;
    const oLocalY = -oDx * oSinA + oDy * oCosA;

    const closestX = Math.max(-obb.halfL, Math.min(oLocalX, obb.halfL));
    const closestY = Math.max(-obb.halfW, Math.min(oLocalY, obb.halfW));

    const diffX = oLocalX - closestX;
    const diffY = oLocalY - closestY;
    const distSq = diffX * diffX + diffY * diffY;

    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;

      const localPushX = (diffX / dist) * overlap;
      const localPushY = (diffY / dist) * overlap;

      const pushX = localPushX * oCosA - localPushY * oSinA;
      const pushY = localPushX * oSinA + localPushY * oCosA;

      curX += pushX;
      curY += pushY;
      hasCollided = true;
    } else if (distSq <= 0.0001) {
      const dLeft = oLocalX + obb.halfL;
      const dRight = obb.halfL - oLocalX;
      const dTop = oLocalY + obb.halfW;
      const dBottom = obb.halfW - oLocalY;
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

      const pushX = localPushX * oCosA - localPushY * oSinA;
      const pushY = localPushX * oSinA + localPushY * oCosA;

      curX += pushX;
      curY += pushY;
      hasCollided = true;
    }
  }

  const pushDx = curX - px;
  const pushDy = curY - py;
  const pushDist = Math.hypot(pushDx, pushDy);
  const normX = pushDist > 0.0001 ? pushDx / pushDist : 0;
  const normY = pushDist > 0.0001 ? pushDy / pushDist : 0;

  return { x: curX, y: curY, collided: hasCollided, normalX: normX, normalY: normY };
}

export function checkPedestrianRollingStockCollision(
  px: number,
  py: number,
  radius: number,
  car: RollingStockCar
): { x: number; y: number; collided: boolean } {
  const dx = px - car.x;
  const dy = py - car.y;
  const halfL = car.length / 2;
  const halfW = car.width / 2;
  const maxDim = halfL + radius + 10;
  if (dx * dx + dy * dy > maxDim * maxDim) {
    return { x: px, y: py, collided: false };
  }

  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);

  // Transform pedestrian point into car local coordinates
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  // Clamped closest point on car body OBB
  const closestX = Math.max(-halfL, Math.min(halfL, localX));
  const closestY = Math.max(-halfW, Math.min(halfW, localY));

  const diffX = localX - closestX;
  const diffY = localY - closestY;
  const distSq = diffX * diffX + diffY * diffY;

  if (distSq < radius * radius && distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;
    const normLocalX = diffX / dist;
    const normLocalY = diffY / dist;

    const pushLocalX = normLocalX * overlap;
    const pushLocalY = normLocalY * overlap;

    const pushWorldX = pushLocalX * cos - pushLocalY * sin;
    const pushWorldY = pushLocalX * sin + pushLocalY * cos;

    return { x: px + pushWorldX, y: py + pushWorldY, collided: true };
  } else if (distSq <= 0.0001) {
    const dLeft = localX + halfL;
    const dRight = halfL - localX;
    const dTop = localY + halfW;
    const dBottom = halfW - localY;
    const minD = Math.min(dLeft, dRight, dTop, dBottom);

    let pushLocalX = 0;
    let pushLocalY = 0;
    if (minD === dLeft) pushLocalX = -(radius + dLeft);
    else if (minD === dRight) pushLocalX = radius + dRight;
    else if (minD === dTop) pushLocalY = -(radius + dTop);
    else pushLocalY = radius + dBottom;

    const pushWorldX = pushLocalX * cos - pushLocalY * sin;
    const pushWorldY = pushLocalX * sin + pushLocalY * cos;

    return { x: px + pushWorldX, y: py + pushWorldY, collided: true };
  }

  return { x: px, y: py, collided: false };
}

export function constrainPlayerToCarInterior(
  player: Player,
  car: RollingStockCar,
  dt: number
): void {
  let px = player.carLocalX ?? 0;
  let py = player.carLocalY ?? 8;

  const playerRadius = 4.8;
  const halfL = car.length / 2;
  const halfW = car.width / 2;

  // 1. Boundary of outer car hull and end gangways
  const minX = -halfL + 4 + playerRadius;
  const maxX = halfL - 4 - playerRadius;
  const minY = -halfW + 3 + playerRadius;
  const maxY = halfW - 3 - playerRadius;

  px = Math.max(minX, Math.min(maxX, px));
  py = Math.max(minY, Math.min(maxY, py));

  const isPlatskart = (car.type && car.type.includes('platskart')) ||
    (car.name && car.name.toLowerCase().includes('плацкарт'));

  // 2. Define interior wall segments [{ x1, y1, x2, y2 }]
  const nwVestEnd = -halfL + 36; // -209
  const wcEndX = -halfL + 85;    // -160
  const saloonStartX = wcEndX;   // -160
  const saloonEndX = halfL - 75; // 170
  const srvEndX = halfL - 33;    // 212

  const walls: { x1: number; y1: number; x2: number; y2: number }[] = [
    // Non-working vestibule bulkhead at nwVestEnd (-209)
    // Passageway door is at y in [2, 16]
    { x1: nwVestEnd, y1: -halfW + 2, x2: nwVestEnd, y2: 2 },
    { x1: nwVestEnd, y1: 16, x2: nwVestEnd, y2: halfW - 2 },

    // Working vestibule bulkhead at srvEndX (212)
    // Passageway door is at y in [2, 14]
    { x1: srvEndX, y1: -halfW + 2, x2: srvEndX, y2: 2 },
    { x1: srvEndX, y1: 14, x2: srvEndX, y2: halfW - 2 },

    // WC sanitary cabins (y in [-halfW + 2, 0], x in [-209, -160])
    // WC front wall at y = 0 with 2 cabin doors: door 1 at [-202, -192], door 2 at [-178, -168]
    { x1: nwVestEnd, y1: 0, x2: nwVestEnd + 7, y2: 0 },
    { x1: nwVestEnd + 17, y1: 0, x2: nwVestEnd + 31, y2: 0 },
    { x1: nwVestEnd + 41, y1: 0, x2: wcEndX, y2: 0 },
    // Dividing wall between WC cabin 1 and WC cabin 2 at -184.5
    { x1: (nwVestEnd + wcEndX) / 2, y1: -halfW + 2, x2: (nwVestEnd + wcEndX) / 2, y2: 0 },
    // End wall separating WC from passenger saloon
    { x1: wcEndX, y1: -halfW + 2, x2: wcEndX, y2: 0 },

    // Conductor's compartment in service zone (x in [170, 212], y in [-halfW + 2, 0])
    // Divider bulkhead between saloon and conductor compartment
    { x1: saloonEndX, y1: -halfW + 2, x2: saloonEndX, y2: 0 },
    // Front corridor wall at y = 0 with door at [178, 190]
    { x1: saloonEndX, y1: 0, x2: saloonEndX + 8, y2: 0 },
    { x1: saloonEndX + 20, y1: 0, x2: srvEndX, y2: 0 }
  ];

  // Compartment partitions & corridor doors
  const saloonL = saloonEndX - saloonStartX; // 330
  const numComps = 9;
  const compW = saloonL / numComps; // 36.67

  for (let i = 0; i < numComps; i++) {
    const compX = saloonStartX + i * compW;

    // Transverse partition wall between compartments (i > 0)
    if (i > 0) {
      walls.push({
        x1: compX,
        y1: -halfW + 2,
        x2: compX,
        y2: isPlatskart ? 0 : 1.5
      });
    }

    if (!isPlatskart) {
      // In Kupe: longitudinal corridor wall at y = 1.5
      // Door opening is from compX + 11 to compX + compW - 11 (~14.7 px wide)
      walls.push({
        x1: compX,
        y1: 1.5,
        x2: compX + 11,
        y2: 1.5
      });
      walls.push({
        x1: compX + compW - 11,
        y1: 1.5,
        x2: compX + compW,
        y2: 1.5
      });
    }
  }

  // 3. Resolve collision against all interior wall segments
  for (const wall of walls) {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = ((px - wall.x1) * dx + (py - wall.y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const closestX = wall.x1 + t * dx;
    const closestY = wall.y1 + t * dy;

    const distDx = px - closestX;
    const distDy = py - closestY;
    const distSq = distDx * distDx + distDy * distDy;
    const minDist = playerRadius + 1.2;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      if (dist > 0.001) {
        px += (distDx / dist) * overlap;
        py += (distDy / dist) * overlap;
      } else {
        px += minDist;
      }
    }
  }

  // 4. Resolve collision against solid interior furniture & equipment
  const furnitureBoxes: { minX: number; maxX: number; minY: number; maxY: number }[] = [];

  // Titan copper boiler & fireplace hearth in service zone
  furnitureBoxes.push({
    minX: saloonEndX + 4,
    maxX: saloonEndX + 20,
    minY: 14.5,
    maxY: halfW - 2
  });

  // Conductor's desk inside conductor compartment
  furnitureBoxes.push({
    minX: saloonEndX + 22,
    maxX: srvEndX - 3,
    minY: -halfW + 3,
    maxY: -halfW + 15
  });

  // Toilets inside WC cabins
  const cabinW = (wcEndX - nwVestEnd) / 2;
  furnitureBoxes.push({
    minX: nwVestEnd + 4,
    maxX: nwVestEnd + 10,
    minY: -halfW + 3,
    maxY: -halfW + 12
  });
  furnitureBoxes.push({
    minX: nwVestEnd + cabinW + 4,
    maxX: nwVestEnd + cabinW + 10,
    minY: -halfW + 3,
    maxY: -halfW + 12
  });

  // Compartment dining tables & berths
  for (let i = 0; i < numComps; i++) {
    const compX = saloonStartX + i * compW;

    // Dining table by window in every compartment
    furnitureBoxes.push({
      minX: compX + 13.5,
      maxX: compX + compW - 13.5,
      minY: -halfW + 2,
      maxY: -halfW + 15.5
    });

    if (isPlatskart) {
      // Platskart side berths (боковушки) on bottom wall
      furnitureBoxes.push({
        minX: compX + 2,
        maxX: compX + compW - 2,
        minY: 14.0,
        maxY: halfW - 2
      });
    }
  }

  // Resolve box collisions
  for (const box of furnitureBoxes) {
    const closestX = Math.max(box.minX, Math.min(px, box.maxX));
    const closestY = Math.max(box.minY, Math.min(py, box.maxY));

    const distDx = px - closestX;
    const distDy = py - closestY;
    const distSq = distDx * distDx + distDy * distDy;
    const minDist = playerRadius + 0.5;

    if (distSq < minDist * minDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      px += (distDx / dist) * overlap;
      py += (distDy / dist) * overlap;
    } else if (distSq <= 0.0001) {
      const dLeft = px - box.minX;
      const dRight = box.maxX - px;
      const dTop = py - box.minY;
      const dBottom = box.maxY - py;
      const minD = Math.min(dLeft, dRight, dTop, dBottom);

      if (minD === dLeft) px = box.minX - minDist;
      else if (minD === dRight) px = box.maxX + minDist;
      else if (minD === dTop) py = box.minY - minDist;
      else py = box.maxY + minDist;
    }
  }

  player.carLocalX = px;
  player.carLocalY = py;
}

// --- EXACT ORIENTED BOUNDING BOX (OBB) SAT COLLISION DETECTION ---
export interface VehicleCollisionResult {
  collided: boolean;
  normalX: number;
  normalY: number;
  overlap: number;
  contactX: number;
  contactY: number;
  contactWidthPx?: number;
  isNarrow?: boolean;
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

/**
 * Вычисляет геометрическое пятно контакта между двумя сталкивающимися автомобилями.
 * Проецирует внешние узлы/контуры кузовов вдоль нормали и касательной контакта,
 * определяя точный центр контакта, ширину зоны смятия (widthPx) и флаг узкого удара (isNarrow).
 */
export function computeVehicleVehicleContactPatch(
  carA: Vehicle,
  carB: Vehicle,
  nX: number,
  nY: number
): { contactX: number; contactY: number; widthPx: number; isNarrow: boolean } {
  const tX = -nY;
  const tY = nX;

  // Точки внешнего периметра carA в мировых координатах
  const ptsA: { x: number; y: number }[] = [];
  const cosA = Math.cos(carA.angle);
  const sinA = Math.sin(carA.angle);
  const nodesA = carA.damage?.nodeBeam?.nodes;
  if (nodesA && nodesA.length >= 8) {
    const perim = carA.damage!.nodeBeam!.perimeterCount ?? 16;
    for (let i = 0; i < Math.min(perim, nodesA.length); i++) {
      const n = nodesA[i];
      ptsA.push({
        x: carA.x + n.x * cosA - n.y * sinA,
        y: carA.y + n.x * sinA + n.y * cosA
      });
    }
  } else {
    const hlA = carA.length * 0.5;
    const hwA = carA.width * 0.5;
    for (const [lx, ly] of [
      [hlA, -hwA], [hlA, hwA], [-hlA, -hwA], [-hlA, hwA],
      [hlA, 0], [-hlA, 0], [0, -hwA], [0, hwA]
    ]) {
      ptsA.push({
        x: carA.x + lx * cosA - ly * sinA,
        y: carA.y + lx * sinA + ly * cosA
      });
    }
  }

  // Точки внешнего периметра carB в мировых координатах
  const ptsB: { x: number; y: number }[] = [];
  const cosB = Math.cos(carB.angle);
  const sinB = Math.sin(carB.angle);
  const nodesB = carB.damage?.nodeBeam?.nodes;
  if (nodesB && nodesB.length >= 8) {
    const perim = carB.damage!.nodeBeam!.perimeterCount ?? 16;
    for (let i = 0; i < Math.min(perim, nodesB.length); i++) {
      const n = nodesB[i];
      ptsB.push({
        x: carB.x + n.x * cosB - n.y * sinB,
        y: carB.y + n.x * sinB + n.y * cosB
      });
    }
  } else {
    const hlB = carB.length * 0.5;
    const hwB = carB.width * 0.5;
    for (const [lx, ly] of [
      [hlB, -hwB], [hlB, hwB], [-hlB, -hwB], [-hlB, hwB],
      [hlB, 0], [-hlB, 0], [0, -hwB], [0, hwB]
    ]) {
      ptsB.push({
        x: carB.x + lx * cosB - ly * sinB,
        y: carB.y + lx * sinB + ly * cosB
      });
    }
  }

  // 1. Узлы фронта контакта carA вдоль +n
  let maxProjA = -Infinity;
  for (const p of ptsA) {
    const proj = p.x * nX + p.y * nY;
    if (proj > maxProjA) maxProjA = proj;
  }
  const frontA = ptsA.filter(p => p.x * nX + p.y * nY >= maxProjA - 3.5);

  // 2. Узлы фронта контакта carB вдоль -n
  let minProjB = Infinity;
  for (const p of ptsB) {
    const proj = p.x * nX + p.y * nY;
    if (proj < minProjB) minProjB = proj;
  }
  const frontB = ptsB.filter(p => p.x * nX + p.y * nY <= minProjB + 3.5);

  // Касательные проекции фронтов контакта
  let sMinA = Infinity, sMaxA = -Infinity;
  for (const p of (frontA.length > 0 ? frontA : ptsA)) {
    const s = p.x * tX + p.y * tY;
    if (s < sMinA) sMinA = s;
    if (s > sMaxA) sMaxA = s;
  }

  let sMinB = Infinity, sMaxB = -Infinity;
  for (const p of (frontB.length > 0 ? frontB : ptsB)) {
    const s = p.x * tX + p.y * tY;
    if (s < sMinB) sMinB = s;
    if (s > sMaxB) sMaxB = s;
  }

  let sCenter: number;
  let widthPx: number;
  const sMin = Math.max(sMinA, sMinB);
  const sMax = Math.min(sMaxA, sMaxB);

  if (sMax >= sMin - 0.5) {
    sCenter = (sMin + sMax) * 0.5;
    widthPx = Math.max(4.0, sMax - sMin);
  } else {
    // Касательное/угловое соприкосновение
    sCenter = (sMinA + sMaxA + sMinB + sMaxB) * 0.25;
    const spanA = Math.max(4.0, sMaxA - sMinA);
    const spanB = Math.max(4.0, sMaxB - sMinB);
    widthPx = Math.min(spanA, spanB);
  }

  const minVehW = Math.min(carA.width, carB.width);
  // Prevent broad or head-on impacts from collapsing into a narrow central dent due to projection jitter
  if (widthPx < minVehW * 0.5 && Math.abs(sMaxA - sMinA) > minVehW * 0.35 && Math.abs(sMaxB - sMinB) > minVehW * 0.35) {
    widthPx = minVehW * 0.85;
  }

  // Координата контакта вдоль нормали — плоскость соприкосновения
  const hContact = (maxProjA + minProjB) * 0.5;
  const contactX = hContact * nX + sCenter * tX;
  const contactY = hContact * nY + sCenter * tY;

  const isNarrow = widthPx < minVehW * 0.38;

  return {
    contactX,
    contactY,
    widthPx: Math.max(4.0, Math.min(Math.max(carA.width, carB.width), widthPx)),
    isNarrow
  };
}

export function checkVehicleVehicleCollision(carA: Vehicle, carB: Vehicle): VehicleCollisionResult {
  const obbsA = getVehicleCollisionOBBs(carA, 0.8);
  const obbsB = getVehicleCollisionOBBs(carB, 0.8);

  const cdx = carB.x - carA.x;
  const cdy = carB.y - carA.y;
  const radA = Math.max(carA.length, carA.width) * 0.7 + 10;
  const radB = Math.max(carB.length, carB.width) * 0.7 + 10;
  const speedExpansion = (Math.hypot(carA.vx || 0, carA.vy || 0) + Math.hypot(carB.vx || 0, carB.vy || 0)) * 0.05;
  const maxDist = radA + radB + speedExpansion;

  if (cdx * cdx + cdy * cdy > maxDist * maxDist) {
    return { collided: false, normalX: 0, normalY: 0, overlap: 0, contactX: 0, contactY: 0 };
  }

  // Относительная скорость сближения
  const relVx = (carB.vx || 0) - (carA.vx || 0);
  const relVy = (carB.vy || 0) - (carA.vy || 0);

  let collided = false;
  let finalNormalX = 0;
  let finalNormalY = 0;
  let finalOverlap = 0;

  // Проверяем все пары OBB между двумя автомобилями через Separating Axis Theorem (SAT)
  for (const obbA of obbsA) {
    for (const obbB of obbsB) {
      const candidateAxes = [
        obbA.axes[0],
        obbA.axes[1],
        obbB.axes[0],
        obbB.axes[1]
      ];

      let obbCollided = true;
      let minOverlap = 999999;
      let minAxisX = 0;
      let minAxisY = 0;

      for (const axis of candidateAxes) {
        let minA = 999999, maxA = -999999;
        for (const p of obbA.corners) {
          const proj = p.x * axis.x + p.y * axis.y;
          if (proj < minA) minA = proj;
          if (proj > maxA) maxA = proj;
        }

        let minB = 999999, maxB = -999999;
        for (const p of obbB.corners) {
          const proj = p.x * axis.x + p.y * axis.y;
          if (proj < minB) minB = proj;
          if (proj > maxB) maxB = proj;
        }

        const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
        if (overlap <= 0) {
          obbCollided = false;
          break; // Найдена разделяющая ось: OBB не пересекаются
        }

        // Ориентируем ось строго от carA к carB
        let orientedX = axis.x;
        let orientedY = axis.y;
        if (cdx * orientedX + cdy * orientedY < 0) {
          orientedX = -orientedX;
          orientedY = -orientedY;
        }

        // Скорость сближения вдоль оси: v_close = (vA - vB) . n > 0
        const closingSpeed = -relVx * orientedX - relVy * orientedY;

        // Выбираем ось минимального геометрического проникновения (MTV).
        // При близких значениях перекрытия (в пределах 15%) отдаём предпочтение вектору сближения.
        const isBetter = (overlap < minOverlap * 0.88) ||
          (overlap < minOverlap * 1.15 && closingSpeed > 0 && minOverlap < 999999);

        if (isBetter || minOverlap === 999999) {
          minOverlap = overlap;
          minAxisX = orientedX;
          minAxisY = orientedY;
        }
      }

      if (obbCollided && minOverlap > 0 && minOverlap < 999999) {
        collided = true;
        if (minOverlap > finalOverlap) {
          finalOverlap = minOverlap;
          finalNormalX = minAxisX;
          finalNormalY = minAxisY;
        }
      }
    }
  }

  if (!collided || finalOverlap <= 0) {
    return { collided: false, normalX: 0, normalY: 0, overlap: 0, contactX: 0, contactY: 0 };
  }

  // Расчёт физического пятна контакта по реальным узлам кузова
  const patch = computeVehicleVehicleContactPatch(carA, carB, finalNormalX, finalNormalY);

  return {
    collided: true,
    normalX: finalNormalX,
    normalY: finalNormalY,
    overlap: finalOverlap,
    contactX: patch.contactX,
    contactY: patch.contactY,
    contactWidthPx: patch.widthPx,
    isNarrow: patch.isNarrow
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
  switch (prop.type as string) {
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
      if (prop.isOpen) return { shape: 'none', resistance: 0, displayNameRu: 'открытый шлагбаум КПП' };
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
      if (prop.isOpen) return { shape: 'none', resistance: 0, displayNameRu: 'открытые въездные ворота' };
      return { shape: 'box', halfWidth: 36, halfHeight: 4.5, resistance: 2.20, displayNameRu: 'въездные ворота' };
    case 'wicket_gate':
      if (prop.isOpen) return { shape: 'none', resistance: 0, displayNameRu: 'открытая калитка' };
      return { shape: 'box', halfWidth: 12, halfHeight: 2.5, resistance: 0.15, displayNameRu: 'калитка' };
    case 'garden_path_tile':
      return { shape: 'none', resistance: 0, displayNameRu: 'садовая дорожка'};
    case 'catenary_pole':
    case 'railway_catenary_mast':
      return { shape: 'none', resistance: 0, displayNameRu: 'опора контактной сети'};
    case 'railway_km_post':
      return { shape: 'none', resistance: 0, displayNameRu: 'километровый столб'};
    case 'rail_switch':
      return { shape: 'none', resistance: 0, displayNameRu: 'стрелочный перевод'};
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

/**
 * Ширина пятна контакта пропа, px — «тень» хитбокса на нормаль удара.
 * Передаётся в урон как contactWidthPx: узкий столб (круг r=3.2 → 6.4 px)
 * продавливает кузов глубже, чем стена на ту же энергию (см. CONE_SPREAD
 * в damageModel.ts). Box: полу-ширина тени = |hw·(n·u)| + |hh·(n·v)|.
 */
export function propContactWidthPx(hitbox: PropHitbox, propAngle: number, nx: number, ny: number): number {
  if (hitbox.shape === 'circle') {
    return Math.max(1, (hitbox.radius ?? 3) * 2);
  }
  const cos = Math.cos(propAngle);
  const sin = Math.sin(propAngle);
  const shadowHalf = Math.abs((hitbox.halfWidth ?? 3) * (nx * cos + ny * sin)) +
    Math.abs((hitbox.halfHeight ?? 3) * (-nx * sin + ny * cos));
  return Math.max(1, shadowHalf * 2);
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
      // Вектор от пропа к машине: машина выталкивается из препятствия, а нормаль удара
      // (normalAndTangential) указывает на препятствие. Раньше знак был обратным, и
      // круглые пропы (столбы, фонари) не деформировали машину — она проезжала их насквозь.
      const pushX = prop.x - res.x;
      const pushY = prop.y - res.y;
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

// --- BEAMNG-GRADE REALISTIC CRASH PARTICLES EMITTER ---
export function emitBeamNGCrashParticles(
  world: GameWorld,
  options: {
    contactX: number;
    contactY: number;
    normalX: number;
    normalY: number;
    tangentX?: number;
    tangentY?: number;
    impactSpeed: number;
    scrapeSpeed?: number;
    vehicleA: Vehicle;
    vehicleB?: Vehicle;
    hasWindshieldCrack?: boolean;
    hasHeadlightBreak?: boolean;
    hasTaillightBreak?: boolean;
    hasRadiatorPuncture?: boolean;
    isGuardrail?: boolean;
    isConcrete?: boolean;
    guardrailType?: string;
  }
) {
  if (!world.particles) world.particles = [];
  const pList = world.particles;
  const {
    contactX,
    contactY,
    normalX,
    normalY,
    impactSpeed,
    scrapeSpeed = 0,
    vehicleA,
    vehicleB,
    hasWindshieldCrack = false,
    hasHeadlightBreak = false,
    hasTaillightBreak = false,
    hasRadiatorPuncture = false,
    isConcrete = false
  } = options;

  // 1. INCANDESCENT METAL FRICTION SPARKS (BeamNG high-velocity directional streaks)
  const totalFriction = impactSpeed + scrapeSpeed * 1.4;
  if (totalFriction > 12) {
    // Tangent vector along scraping interface
    let tx = options.tangentX ?? -normalY;
    let ty = options.tangentY ?? normalX;
    const tLen = Math.hypot(tx, ty) || 1;
    tx /= tLen;
    ty /= tLen;

    // Alignment with relative sliding velocity
    const relVx = (vehicleA.vx || 0) - (vehicleB ? (vehicleB.vx || 0) : 0);
    const relVy = (vehicleA.vy || 0) - (vehicleB ? (vehicleB.vy || 0) : 0);
    if (relVx * tx + relVy * ty < 0) {
      tx = -tx;
      ty = -ty;
    }

    const sparkCount = Math.min(48, Math.floor(6 + totalFriction * 0.32));
    for (let i = 0; i < sparkCount; i++) {
      // BeamNG sparks eject backward along scraping tangent + rebound outward from collision normal
      const cone = (Math.random() - 0.5) * 0.95;
      const cosC = Math.cos(cone);
      const sinC = Math.sin(cone);

      // Blend normal rebound (45%) and scrape backward direction (55%)
      const baseDirX = normalX * 0.45 - tx * 0.55;
      const baseDirY = normalY * 0.45 - ty * 0.55;
      const bLen = Math.hypot(baseDirX, baseDirY) || 1;
      const dirX = (baseDirX / bLen) * cosC - (baseDirY / bLen) * sinC;
      const dirY = (baseDirX / bLen) * sinC + (baseDirY / bLen) * cosC;

      // High initial ejection velocity (70 - 320 px/s)
      const spd = 65 + Math.random() * (totalFriction * 2.2 + 80);
      const sparkInheritVx = vehicleA.vx * 0.32 + (vehicleB ? vehicleB.vx * 0.2 : 0);
      const sparkInheritVy = vehicleA.vy * 0.32 + (vehicleB ? vehicleB.vy * 0.2 : 0);

      pList.push({
        x: contactX + (Math.random() - 0.5) * 5,
        y: contactY + (Math.random() - 0.5) * 5,
        vx: dirX * spd + sparkInheritVx,
        vy: dirY * spd + sparkInheritVy,
        radius: 0.8 + Math.random() * 1.3, // Micro-scaled filings
        color: '#ffffff', // Blackbody thermal cooling calculated by renderer
        secondaryColor: Math.random() < 0.6 ? '#fef08a' : '#fbbf24',
        alpha: 1.0,
        life: 0,
        maxLife: 0.12 + Math.random() * 0.22,
        type: 'spark',
        streakLength: 0.035 + Math.random() * 0.035,
        z: 0.6 + Math.random() * 1.2,
        vz: 12 + Math.random() * 30,
        bounces: 1
      });
    }
  }

  // 2. TEMPERED SAFETY GLASS SHARDS & POLYCARBONATE LENS SPLINTERS
  if (hasWindshieldCrack || hasHeadlightBreak || hasTaillightBreak) {
    // Front windshield / side tempered glass nuggets (crystalline granules)
    if (hasWindshieldCrack) {
      const pebbleCount = Math.floor(18 + Math.min(26, impactSpeed * 0.25));
      for (let g = 0; g < pebbleCount; g++) {
        const spreadAngle = Math.atan2(normalY, normalX) + (Math.random() - 0.5) * 1.8;
        const spd = 45 + Math.random() * (impactSpeed * 2.2 + 80);
        pList.push({
          x: contactX + (Math.random() - 0.5) * 8,
          y: contactY + (Math.random() - 0.5) * 8,
          vx: Math.cos(spreadAngle) * spd + vehicleA.vx * 0.25,
          vy: Math.sin(spreadAngle) * spd + vehicleA.vy * 0.25,
          radius: 0.35 + Math.random() * 0.40, // Micro safety glass nuggets (0.35 - 0.75px)
          aspect: 1.1 + Math.random() * 0.4,
          color: 'rgba(224, 242, 254, 0.88)',
          alpha: 0.95,
          life: 0,
          maxLife: 300.0,
          type: 'glass_shard',
          glassSubtype: 'safety_pebble',
          z: 1.4 + Math.random() * 1.8,
          vz: 24 + Math.random() * 45,
          angle: Math.random() * Math.PI * 2,
          angularVelocity: (Math.random() - 0.5) * 26,
          shapeSeed: Math.floor(Math.random() * 10000),
          bounces: 2,
          splatted: false,
          isGrounded: false
        });
      }
    }

    // Headlight clear & amber polycarbonate splinters
    if (hasHeadlightBreak) {
      const hlCount = 10 + Math.floor(Math.random() * 8);
      for (let h = 0; h < hlCount; h++) {
        const spreadAngle = Math.atan2(normalY, normalX) + (Math.random() - 0.5) * 1.5;
        const spd = 50 + Math.random() * (impactSpeed * 2.0 + 70);
        const isAmber = (h % 3 === 0);
        pList.push({
          x: contactX + (Math.random() - 0.5) * 6,
          y: contactY + (Math.random() - 0.5) * 6,
          vx: Math.cos(spreadAngle) * spd + vehicleA.vx * 0.25,
          vy: Math.sin(spreadAngle) * spd + vehicleA.vy * 0.25,
          radius: 0.45 + Math.random() * 0.50,
          aspect: 1.2 + Math.random() * 0.5,
          color: isAmber ? '#fbbf24' : '#f8fafc',
          alpha: 0.92,
          life: 0,
          maxLife: 300.0,
          type: 'glass_shard',
          glassSubtype: 'headlight',
          z: 1.2 + Math.random() * 1.6,
          vz: 22 + Math.random() * 40,
          angle: Math.random() * Math.PI * 2,
          angularVelocity: (Math.random() - 0.5) * 28,
          shapeSeed: Math.floor(Math.random() * 10000),
          bounces: 2,
          splatted: false,
          isGrounded: false
        });
      }
    }

    // Taillight ruby red splinters
    if (hasTaillightBreak) {
      const tlCount = 10 + Math.floor(Math.random() * 8);
      for (let t = 0; t < tlCount; t++) {
        const spreadAngle = Math.atan2(normalY, normalX) + (Math.random() - 0.5) * 1.5;
        const spd = 45 + Math.random() * (impactSpeed * 2.0 + 60);
        pList.push({
          x: contactX + (Math.random() - 0.5) * 6,
          y: contactY + (Math.random() - 0.5) * 6,
          vx: Math.cos(spreadAngle) * spd + vehicleA.vx * 0.25,
          vy: Math.sin(spreadAngle) * spd + vehicleA.vy * 0.25,
          radius: 0.45 + Math.random() * 0.50,
          aspect: 1.2 + Math.random() * 0.5,
          color: '#ef4444',
          alpha: 0.92,
          life: 0,
          maxLife: 300.0,
          type: 'glass_shard',
          glassSubtype: 'taillight',
          z: 1.2 + Math.random() * 1.6,
          vz: 20 + Math.random() * 38,
          angle: Math.random() * Math.PI * 2,
          angularVelocity: (Math.random() - 0.5) * 26,
          shapeSeed: Math.floor(Math.random() * 10000),
          bounces: 2,
          splatted: false,
          isGrounded: false
        });
      }
    }
  }

  // 3. BODY PANEL DEBRIS: TORN PAINT FLAKES & DARK PLASTIC BUMPER CLIPS
  if (impactSpeed > 22 || scrapeSpeed > 20) {
    // Paint flakes (thin sheet metal flakes, matching vehicle body color with primer back)
    const flakeCount = Math.min(18, Math.floor(4 + impactSpeed * 0.16));
    for (let f = 0; f < flakeCount; f++) {
      const ang = Math.atan2(normalY, normalX) + (Math.random() - 0.5) * 2.0;
      const spd = 30 + Math.random() * (impactSpeed * 1.6 + 50);
      pList.push({
        x: contactX + (Math.random() - 0.5) * 6,
        y: contactY + (Math.random() - 0.5) * 6,
        vx: Math.cos(ang) * spd + vehicleA.vx * 0.2,
        vy: Math.sin(ang) * spd + vehicleA.vy * 0.2,
        radius: 0.50 + Math.random() * 0.55,
        aspect: 1.3 + Math.random() * 0.5,
        color: vehicleA.color,
        secondaryColor: '#475569', // Bare metal / dark primer
        alpha: 0.90,
        life: 0,
        maxLife: 300.0,
        type: 'debris',
        debrisSubtype: 'metal_flake',
        z: 1.0 + Math.random() * 1.5,
        vz: 18 + Math.random() * 32,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 22,
        shapeSeed: Math.floor(Math.random() * 10000),
        bounces: 2,
        splatted: false,
        isGrounded: false
      });
    }

    // Plastic bumper clips & black fascia fragments
    const clipCount = Math.min(10, Math.floor(2 + impactSpeed * 0.1));
    for (let c = 0; c < clipCount; c++) {
      const ang = Math.atan2(normalY, normalX) + (Math.random() - 0.5) * 1.8;
      const spd = 25 + Math.random() * (impactSpeed * 1.4 + 40);
      pList.push({
        x: contactX + (Math.random() - 0.5) * 6,
        y: contactY + (Math.random() - 0.5) * 6,
        vx: Math.cos(ang) * spd + vehicleA.vx * 0.2,
        vy: Math.sin(ang) * spd + vehicleA.vy * 0.2,
        radius: 0.55 + Math.random() * 0.60,
        aspect: 1.2 + Math.random() * 0.5,
        color: '#1e293b', // Dark ABS plastic
        alpha: 0.92,
        life: 0,
        maxLife: 300.0,
        type: 'debris',
        debrisSubtype: 'plastic_chunk',
        z: 1.0 + Math.random() * 1.4,
        vz: 16 + Math.random() * 28,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 18,
        shapeSeed: Math.floor(Math.random() * 10000),
        bounces: 2,
        splatted: false,
        isGrounded: false
      });
    }

    // Concrete chips if hitting concrete building, curb or post
    if (isConcrete) {
      const chipCount = 6 + Math.floor(Math.random() * 6);
      for (let k = 0; k < chipCount; k++) {
        const ang = Math.atan2(normalY, normalX) + (Math.random() - 0.5) * 1.6;
        const spd = 20 + Math.random() * 65;
        pList.push({
          x: contactX + (Math.random() - 0.5) * 6,
          y: contactY + (Math.random() - 0.5) * 6,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          radius: 0.45 + Math.random() * 0.55,
          aspect: 1.1 + Math.random() * 0.5,
          color: '#94a3b8',
          alpha: 0.88,
          life: 0,
          maxLife: 300.0,
          type: 'debris',
          debrisSubtype: 'concrete_chip',
          z: 0.8 + Math.random() * 1.2,
          vz: 14 + Math.random() * 25,
          angle: Math.random() * Math.PI * 2,
          angularVelocity: (Math.random() - 0.5) * 16,
          shapeSeed: Math.floor(Math.random() * 10000),
          bounces: 2,
          splatted: false,
          isGrounded: false
        });
      }
    }
  }

  // 4. UNDERCARRIAGE DISLODGED ROAD DUST (BeamNG crash puff)
  if (impactSpeed > 36) {
    const dustPuffCount = 2 + Math.floor(Math.random() * 3);
    for (let d = 0; d < dustPuffCount; d++) {
      pList.push({
        x: contactX + (Math.random() - 0.5) * 10,
        y: contactY + (Math.random() - 0.5) * 10,
        vx: vehicleA.vx * 0.25 + (Math.random() - 0.5) * 20,
        vy: vehicleA.vy * 0.25 + (Math.random() - 0.5) * 20,
        radius: 12 + Math.random() * 14,
        targetRadius: 28 + Math.random() * 16,
        color: '#78716c',
        alpha: 0.35,
        initialAlpha: 0.35,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.5,
        type: 'dust'
      });
    }
  }

  // 5. RADIATOR COOLANT AEROSOL BURST (BeamNG pressurized radiator punch)
  if (hasRadiatorPuncture && impactSpeed > 28) {
    const steamCount = 5 + Math.floor(Math.random() * 5);
    for (let s = 0; s < steamCount; s++) {
      const ang = Math.atan2(normalY, normalX) + (Math.random() - 0.5) * 1.2;
      const spd = 30 + Math.random() * 60;
      pList.push({
        x: contactX + (Math.random() - 0.5) * 8,
        y: contactY + (Math.random() - 0.5) * 8,
        vx: Math.cos(ang) * spd + vehicleA.vx * 0.3,
        vy: Math.sin(ang) * spd + vehicleA.vy * 0.3,
        radius: 6 + Math.random() * 8,
        color: '#f8fafc',
        alpha: 0.65,
        initialAlpha: 0.65,
        life: 0,
        maxLife: 1.0 + Math.random() * 0.8,
        type: 'engine_smoke',
        isSteam: true,
        tempC: 108,
        buoyancy: 16,
        expansionRate: 15
      });
    }
  }
}

function subdivideNodes(car: Vehicle) {
  if (!car.damage?.deformedVertices) return;
  const verts = car.damage.deformedVertices;
  if (verts.length >= 64) return;

  for (let i = 0; i < verts.length; i++) {
    const nextIdx = (i + 1) % verts.length;
    const v1 = verts[i];
    const v2 = verts[nextIdx];

    if ((v1.plasticStrain || 0) > 1.2 || (v2.plasticStrain || 0) > 1.2) {
      const newNode: any = {
        localX: (v1.localX + v2.localX) / 2,
        localY: (v1.localY + v2.localY) / 2,
        offsetX: (v1.offsetX + v2.offsetX) / 2,
        offsetY: (v1.offsetY + v2.offsetY) / 2,
        targetOffsetX: ((v1.targetOffsetX || 0) + (v2.targetOffsetX || 0)) / 2,
        targetOffsetY: ((v1.targetOffsetY || 0) + (v2.targetOffsetY || 0)) / 2,
        plasticStrain: 0,
        structuralType: v1.structuralType
      };
      verts.splice(i + 1, 0, newNode);
      i++;
    }
  }
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
  /** Физическая ширина пятна контакта (px) либо legacy-аргумент narrow */
  contactWidthOrNarrow?: number | boolean,
  /** Физическая ширина пятна контакта (px), если 8-й аргумент был boolean */
  contactWidthPx?: number
) {
  const effContactWidth: number = typeof contactWidthOrNarrow === 'number'
    ? Math.max(1.5, Math.min(car.width, contactWidthOrNarrow))
    : (typeof contactWidthPx === 'number'
        ? Math.max(1.5, Math.min(car.width, contactWidthPx))
        : (contactWidthOrNarrow ? 4.5 : car.width));

  car.damage = ensureVehicleDamage(car);
  // Сетка узлов теперь фиксированной топологии (включая колёсные узлы) и
  // синхронизируется целиком; старый subdivideNodes только раздувал массив
  // deformedVertices и ломал соответствие индексов.
  let spawnedMissingPowertrain = false;
  if (!car.engineState) {
    car.engineState = createDefaultEngineState(car.type);
    spawnedMissingPowertrain = true;
  }
  if (!car.fuelSystem) {
    car.fuelSystem = createDefaultFuelSystem(car.type);
  }
  if (spawnedMissingPowertrain) {
    applyPowertrain(car);
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
    if (scrapeSpeed > 14 && world.particles) {
      const normDist = Math.hypot(contactX - car.x, contactY - car.y) || 1;
      emitBeamNGCrashParticles(world, {
        contactX,
        contactY,
        normalX: (contactX - car.x) / normDist,
        normalY: (contactY - car.y) / normDist,
        impactSpeed: 0,
        scrapeSpeed,
        vehicleA: car,
        isConcrete: effContactWidth < Math.min(25, car.width * 0.40)
      });
    }
    return;
  }

  // Damage Cooldown Protection: prevent duplicate hits from trivial micro-scrapes,
  // but NEVER drop a harder subsequent blow in multi-car pileups or sustained impact!
  const prevImpactSpeed = (car as any).lastImpactSpeed || 0;
  if (car.lastDamageTime && (now - car.lastDamageTime < 0.10) && (impactSpeed <= prevImpactSpeed * 1.15)) {
    // Continuous scraping during cooldown still emits directional sparks
    if (world.particles && scrapeSpeed > 14) {
      const normDist = Math.hypot(contactX - car.x, contactY - car.y) || 1;
      emitBeamNGCrashParticles(world, {
        contactX,
        contactY,
        normalX: (contactX - car.x) / normDist,
        normalY: (contactY - car.y) / normDist,
        impactSpeed: 0,
        scrapeSpeed,
        vehicleA: car,
        isConcrete: effContactWidth < Math.min(25, car.width * 0.40)
      });
    }
    return;
  }
  car.lastDamageTime = now;
  (car as any).lastImpactSpeed = impactSpeed;

  const dmg = car.damage;
  const eng = car.engineState;
  const fuel = car.fuelSystem;
  const halfL = car.length / 2;
  const halfW = car.width / 2;

  // Старые/повреждённые сохранения могли содержать NaN в агрегатах урона.
  // Без этого existingDepthPx = NaN превращал весь ход смятия в NaN.
  const damageScalars = [
    'frontCrumple', 'rearCrumple', 'leftDent', 'rightDent',
    'frontLeftDent', 'frontRightDent', 'rearLeftDent', 'rearRightDent',
    'wheelRubResistance', 'steeringDrift'
  ] as const;
  for (const key of damageScalars) {
    if (!Number.isFinite((dmg as any)[key])) (dmg as any)[key] = 0;
  }

  // Local coordinates relative to car center & heading
  const dx = contactX - car.x;
  const dy = contactY - car.y;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  const localX = dx * cosA + dy * sinA;  // +halfL = front, -halfL = rear
  const localY = -dx * sinA + dy * cosA; // -halfW = left, +halfW = right

  let normX = Math.max(-1, Math.min(1, localX / halfL));
  const normY = Math.max(-1, Math.min(1, localY / halfW));

  // Safeguard: if vehicle is moving forward or stopped, frontal/head-on impacts must register on the front (+), never rear
  const isReversing = (car.speed || 0) < -2.0;
  if (!isReversing && localX >= -halfL * 0.8 && normX < 0.20) {
    normX = Math.max(0.35, Math.abs(normX));
  }

  // Dynamic Mass & Kinetic Momentum Factor
  const impactKmh = impactSpeed * PX_S_TO_SPEED_KMH;
  const scrapeKmh = scrapeSpeed * PX_S_TO_SPEED_KMH;

  const isExtremeStriker = strikerMass >= 40000;
  const isHeavyRigidTrailer = car.type.startsWith('trailer_semi');
  const isCommercialHeavy = car.type.startsWith('truck_') || car.type === 'cement_mixer' || car.type === 'garbage_truck' || car.type === 'fire_ladder' || car.type === 'fire_engine' || car.type === 'bus' || car.type === 'bus_minibus' || car.type === 'truck_tow' || car.type === 'truck_armored';
  const isMachinery = isRoadMachinery(car.type);

  if ((isHeavyRigidTrailer || isMachinery || isCommercialHeavy) && impactKmh < 10 && scrapeKmh < 10) {
    return; // Heavy I-beam chassis / commercial truck frames do not dent from minor nudges or scrapes
  }

  // --- ENERGY-BASED CRASH MODEL (чистая физика энергии и масс, без эвристик) ---
  const crashE = strikeEnergy(car.mass, strikerMass, impactSpeed);

  let severity = severityFromEnergy(crashE);

  if ((car as any).hasHeavySuspension) {
    severity *= 0.75;
  }
  if (isCommercialHeavy) {
    severity *= 0.65; // Heavy steel channel frame rails absorb heavy impacts, but bumper and front fascia crumple realistically
  }
  if (isHeavyRigidTrailer) {
    severity *= 0.30;
  }
  if (isMachinery) {
    severity *= 0.15;
  }

  // Направление удара по точке контакта — тот же геометрический тест,
  // что и в блоках FRONT/REAR/SIDE ниже.
  const impactZone: ImpactZone = normX > 0.20 ? 'front' : (normX < -0.25 ? 'rear' : 'side');

  // Жёсткость структуры: адаптируется под массу кузова и назначение ТС (грузовики/техника/пикапы жестче, малолитражки податливее).
  const structureStiffness = calculateStructureStiffness(car);

  // Уже накопленная глубина в зоне удара: повторный удар продолжает ход по кривой силы
  // (смятый металл не работает заново), см. crushFromEnergy.existingDepthPx.
  const existingZoneDepthRaw = impactZone === 'front'
    ? dmg.frontCrumple
    : impactZone === 'rear'
      ? dmg.rearCrumple
      : (normY < 0 ? dmg.leftDent : dmg.rightDent);
  const existingZoneDepth = Number.isFinite(existingZoneDepthRaw) ? existingZoneDepthRaw : 0;

  const crushZoneParams = {
    zone: impactZone,
    length: car.length,
    width: car.width,
    contactWidthPx: effContactWidth,
    structureStiffness,
    intrusionZoneFraction: isExtremeStriker ? 1.0 : 0.70,
    maxZoneLengthPx: (isMachinery || isHeavyRigidTrailer) ? 3.5 : undefined
  };

  // Глубина деформации по кривой «сила–смятие» (зона → кабина → упор), см. crushFromEnergy.
  const crush = crushFromEnergy({
    energy: crashE,
    ...crushZoneParams,
    existingDepthPx: existingZoneDepth
  });
  if (!Number.isFinite(crush.depthPx)) crush.depthPx = 0;
  if (!Number.isFinite(crush.totalCapPx)) crush.totalCapPx = 0;
  if (!Number.isFinite(crush.zoneLengthPx)) crush.zoneLengthPx = 0;

  // Целевая глубина вмятины для многокадрового сжатия softbody (см. stepNodeBeamContinuousContact).
  // This is an absolute stroke from the intact body, not the stroke of only
  // this hit. Without the already absorbed depth, a repeated impact reset the
  // visual target and the mesh stopped matching recorded damage.
  if (car.activeCrumple) {
    const ac = car.activeCrumple;
    ac.targetCrushPx = Math.min(
      crush.totalCapPx,
      Math.max(ac.targetCrushPx || 0, existingZoneDepth + crush.depthPx)
    );
    // Силовая модель хода: торможение и глубина считаются по той же кривой, что и урон.
    // Только для удара о неподвижное препятствие (скорость решается здесь, а не импульсным контактом).
    if (!ac.crushModel && !ac.preserveVelocity && ac.initialNormalSpeed !== undefined) {
      ac.crushModel = {
        zone: impactZone,
        length: car.length,
        width: car.width,
        contactWidthPx: effContactWidth,
        structureStiffness,
        intrusionZoneFraction: crushZoneParams.intrusionZoneFraction,
        maxZoneLengthPx: crushZoneParams.maxZoneLengthPx,
        share: (Number.isFinite(strikerMass) && strikerMass > 0) ? strikerMass / (car.mass + strikerMass) : 1
      };
      ac.crushStartPx = existingZoneDepth;
    }
  }

  // 1. BEAMNG.DRIVE 2D NODE-BEAM PHYSICAL DEFORMATION ENGINE
  if (dmg.deformedVertices && (impactKmh > 5.0 || isExtremeStriker || scrapeKmh > 10.0)) {
    const contactDist = Math.hypot(contactX - car.x, contactY - car.y) || 1;
    applyNodeBeamImpact(
      car,
      contactX,
      contactY,
      (contactX - car.x) / contactDist,
      (contactY - car.y) / contactDist,
      impactSpeed,
      scrapeSpeed,
      world,
      strikerMass,
      effContactWidth,
      crush.depthPx
    );
  }

  const isTrailer = isTrailerVehicle(car);

  // 2. Structural crumple & component damage logic (Radiator, Oil pan, Fuel tank, Suspension, Engine & Transmission)
  // Глубина деформации направления: energy / F_zone, ограничена зоной + кабиной
  // (см. crushFromEnergy). Масса ударителя уже учтена в энергии, поэтому
  // отдельные множители sqrt(reducedMassRatio) здесь больше не нужны.

  if (normX > 0.20 && impactKmh > 8.0) {
    // --- FRONTAL COLLISION ---
    // maxFrontCrush = полный ход (зона деформации + вмятина кабины)
    const maxFrontCrush = crush.totalCapPx;
    const zoneFront = Math.max(0.001, crush.zoneLengthPx);
    dmg.frontCrumple = Math.min(maxFrontCrush, dmg.frontCrumple + crush.depthPx);

    if (!isTrailer) {
      // Mechanical engine and transmission shock / crushing
      // (fill = доля исчерпанной зоны деформации, > 1 = деформация пошла в кабину)
      const frontFill = dmg.frontCrumple / zoneFront;
      const engShock = severity * (isExtremeStriker ? 80 : 35) + frontFill * 25;
      eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - engShock);

      const transShock = severity * (isExtremeStriker ? 70 : 28) + frontFill * 20;
      eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - transShock);

      // --- IMMEDIATE ENGINE STALL ON IMPACT ---
      // Transmission jerk / rotational flywheel shock / inertia fuel safety cutoff
      if (impactKmh > 16.0 || severity > 0.12 || isExtremeStriker) {
        eng.engineRunning = false;
        eng.engineRPM = 0;
      }

      // Radiator puncture (starts rapid coolant loss & overheating)
      if (severity > 0.25 || dmg.frontCrumple > 2.0 || isExtremeStriker) {
        eng.radiatorPunctured = true;
      }

      // Oil pan puncture (starts oil loss, knocking, then seizure)
      if (severity > 0.40 || dmg.frontCrumple > 3.8 || isExtremeStriker) {
        eng.oilPunctured = true;
      }

      // Engine knock from internal mechanical damage
      if (eng.engineHealth <= 50 || severity > 0.42 || isExtremeStriker) {
        eng.engineKnocking = true;
      }

      // Battery disconnect / dead starter / severe engine bay smash
      if (eng.engineHealth <= 30 || severity > 0.45 || dmg.frontCrumple > 4.2 || isExtremeStriker) {
        eng.starterWorking = false;
        eng.engineRunning = false;
        eng.engineRPM = 0;
      }

      // Complete engine block seizure
      if (eng.engineHealth <= 15 || severity > 0.55 || dmg.frontCrumple > 5.5 || isExtremeStriker) {
        eng.starterWorking = false;
        eng.engineRunning = false;
        eng.isSeized = true;
        eng.engineRPM = 0;
      }

      // Transmission jamming / locking up
      if (eng.transmissionHealth <= 20 || (severity > 0.50 && Math.random() < 0.75) || isExtremeStriker) {
        eng.transmissionJammed = true;
      }
    }

    if (normY < -0.22) {
      dmg.frontLeftDent = Math.min(zoneFront * 0.85, dmg.frontLeftDent + crush.depthPx * 0.85);
      dmg.frontLeftSuspensionDamage = Math.min(1.0, dmg.frontLeftSuspensionDamage + severity * 0.85);
      dmg.steeringDrift = Math.max(-1.0, dmg.steeringDrift - severity * 0.7);
      dmg.wheelRubResistance += severity * 18;
      if (severity > 0.30 || isExtremeStriker) dmg.leftHeadlightBroken = true;
    } else if (normY > 0.22) {
      dmg.frontRightDent = Math.min(zoneFront * 0.85, dmg.frontRightDent + crush.depthPx * 0.85);
      dmg.frontRightSuspensionDamage = Math.min(1.0, dmg.frontRightSuspensionDamage + severity * 0.85);
      dmg.steeringDrift = Math.min(1.0, dmg.steeringDrift + severity * 0.7);
      dmg.wheelRubResistance += severity * 18;
      if (severity > 0.30 || isExtremeStriker) dmg.rightHeadlightBroken = true;
    } else {
      dmg.frontLeftDent = Math.min(zoneFront * 0.65, dmg.frontLeftDent + crush.depthPx * 0.6);
      dmg.frontRightDent = Math.min(zoneFront * 0.65, dmg.frontRightDent + crush.depthPx * 0.6);
      dmg.frontLeftSuspensionDamage = Math.min(1.0, dmg.frontLeftSuspensionDamage + severity * 0.6);
      dmg.frontRightSuspensionDamage = Math.min(1.0, dmg.frontRightSuspensionDamage + severity * 0.6);
      dmg.wheelRubResistance += severity * 14;
      if (severity > 0.38 || isExtremeStriker) {
        dmg.leftHeadlightBroken = true;
        dmg.rightHeadlightBroken = true;
      }
    }

    if (!isTrailer) {
      if (severity > 0.45 || dmg.frontCrumple > 5.0 || isExtremeStriker) {
        dmg.hoodBuckled = true;
      }
    }
    if (severity > 0.50 || dmg.frontCrumple > 6.0 || isExtremeStriker) {
      dmg.windshieldCracked = true;
    }
  } else if (normX < -0.25 && impactKmh > 8.0) {
    // --- REAR IMPACT ---
    const maxRearCrush = crush.totalCapPx;
    const zoneRear = Math.max(0.001, crush.zoneLengthPx);
    dmg.rearCrumple = Math.min(maxRearCrush, dmg.rearCrumple + crush.depthPx);

    if (!isTrailer) {
      // Rear fuel tank puncture threshold
      const isPlayerInvolved = car.isPlayerControlled || ((world as any).player && (world as any).player.inVehicleId === car.id);
      if (isPlayerInvolved || isExtremeStriker) {
        if (severity > 0.55 || dmg.rearCrumple > 4.5 || isExtremeStriker) {
          fuel.tankPunctured = true;
        }
      } else {
        if (severity > 0.85 || dmg.rearCrumple > 9.0) {
          fuel.tankPunctured = true;
        }
      }

      // Rear impacts can shock transmission driveshaft and differential
      const rearTransShock = severity * 22 + (dmg.rearCrumple / zoneRear) * 15;
      eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - rearTransShock);
      if (eng.transmissionHealth <= 15 || (severity > 0.80 && Math.random() < 0.45) || isExtremeStriker) {
        eng.transmissionJammed = true;
      }
    }

    if (car.fluidTank && (severity > 0.40 || dmg.rearCrumple > 3.8 || isExtremeStriker)) {
      car.fluidTank.isPunctured = true;
    }

    if (normY < -0.22) {
      dmg.rearLeftDent = Math.min(zoneRear * 0.85, dmg.rearLeftDent + crush.depthPx * 0.85);
      dmg.rearLeftSuspensionDamage = Math.min(1.0, dmg.rearLeftSuspensionDamage + severity * 0.85);
      if (severity > 0.38 || isExtremeStriker) dmg.leftTaillightBroken = true;
    } else if (normY > 0.22) {
      dmg.rearRightDent = Math.min(zoneRear * 0.85, dmg.rearRightDent + crush.depthPx * 0.85);
      dmg.rearRightSuspensionDamage = Math.min(1.0, dmg.rearRightSuspensionDamage + severity * 0.85);
      if (severity > 0.38 || isExtremeStriker) dmg.rightTaillightBroken = true;
    } else {
      dmg.rearLeftSuspensionDamage = Math.min(1.0, dmg.rearLeftSuspensionDamage + severity * 0.6);
      dmg.rearRightSuspensionDamage = Math.min(1.0, dmg.rearRightSuspensionDamage + severity * 0.6);
      if (severity > 0.48 || isExtremeStriker) {
        dmg.leftTaillightBroken = true;
        dmg.rightTaillightBroken = true;
      }
    }

    if (severity > 0.65 || isExtremeStriker) {
      dmg.rearGlassCracked = true;
    }
  } else if (impactKmh > 8.0) {
    // --- SIDE IMPACT / T-BONE ---
    // Глубина бока считается той же моделью E/F, но с силой дверной структуры
    // (MEAN_FORCE.side в damageModel.ts) — направление различается только
    // физикой зоны, а не эмпирическими коэффициентами.
    const maxSideDent = crush.totalCapPx;
    const sideDent = crush.depthPx;

    if (normY < 0) {
      dmg.leftDent = Math.min(maxSideDent, dmg.leftDent + sideDent);
      dmg.frontLeftSuspensionDamage = Math.min(1.0, dmg.frontLeftSuspensionDamage + severity * 0.75);
      dmg.rearLeftSuspensionDamage = Math.min(1.0, dmg.rearLeftSuspensionDamage + severity * 0.75);
      dmg.steeringDrift = Math.max(-1.0, dmg.steeringDrift - severity * 0.55);
    } else {
      dmg.rightDent = Math.min(maxSideDent, dmg.rightDent + sideDent);
      dmg.frontRightSuspensionDamage = Math.min(1.0, dmg.frontRightSuspensionDamage + severity * 0.75);
      dmg.rearRightSuspensionDamage = Math.min(1.0, dmg.rearRightSuspensionDamage + severity * 0.75);
      dmg.steeringDrift = Math.min(1.0, dmg.steeringDrift + severity * 0.55);
    }
    dmg.wheelRubResistance += severity * 16;

    if (car.fluidTank && (severity > 0.42 || dmg.leftDent > 2.5 || dmg.rightDent > 2.5 || isExtremeStriker)) {
      car.fluidTank.isPunctured = true;
    }

    if (!isTrailer) {
      if (impactKmh > 20.0 || severity > 0.16 || isExtremeStriker) {
        eng.engineRunning = false;
        eng.engineRPM = 0;
      }

      if (severity > 0.35 || isExtremeStriker) {
        eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - severity * (isExtremeStriker ? 48 : 22));
        eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - severity * (isExtremeStriker ? 44 : 18));
        if (eng.transmissionHealth <= 20 || (severity > 0.55 && Math.random() < 0.55) || isExtremeStriker) {
          eng.transmissionJammed = true;
        }
        if (eng.engineHealth <= 20 || (severity > 0.60 && Math.random() < 0.50) || isExtremeStriker) {
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

  // 5. Volumetric Glass Shrapnel & Body Part Detachment on High-Speed Crash
  if (!world.detachedParts) world.detachedParts = [];

  // Emit comprehensive BeamNG-grade crash particles (directional sparks, safety glass nuggets, lens fragments, paint flakes, plastic clips, road dust)
  const normDist = Math.hypot(contactX - car.x, contactY - car.y) || 1;
  const colNormX = (contactX - car.x) / normDist;
  const colNormY = (contactY - car.y) / normDist;

  const hasWindshieldCrack = (severity > 0.35 || dmg.windshieldCracked);
  const hasHeadlightBreak = (normX > 0.12 && (dmg.leftHeadlightBroken || dmg.rightHeadlightBroken || severity > 0.30));
  const hasTaillightBreak = (normX < -0.15 && ((dmg.rearCrumple ?? 0) > 2.5 || severity > 0.35));
  const hasRadiatorPuncture = (eng.radiatorPunctured || ((dmg.frontCrumple ?? 0) > 3.5 && normX > 0.20));

  emitBeamNGCrashParticles(world, {
    contactX,
    contactY,
    normalX: colNormX,
    normalY: colNormY,
    impactSpeed,
    scrapeSpeed,
    vehicleA: car,
    hasWindshieldCrack,
    hasHeadlightBreak,
    hasTaillightBreak,
    hasRadiatorPuncture,
    // Бетонная крошка — только от узких жёстких препятствий (столб, стена,
    // проп, отбойник — все они передают isNarrowImpact=true). Масса удара
    // для этого НЕ используется: «встречка» с грузовиком (mass>10000) или
    // царапание рейки отбойника не должны ронять бетонные сколы.
    isConcrete: effContactWidth < Math.min(25, car.width * 0.40)
  });

  // Physical Detachable Body Parts (Hood, Front Bumper, Rear Bumper, Left/Right Doors)
  if (impactSpeed > 32 || severity > 0.50) {
    // Hood detachment
    if ((dmg.frontCrumple > 7.5 || (severity > 0.60 && normX > 0.20)) && !dmg.hoodDetached) {
      dmg.hoodDetached = true;
      dmg.hoodBuckled = true;
      world.detachedParts.push({
        id: 'hood_' + car.id + '_' + Date.now(),
        vehicleId: car.id,
        partType: 'hood',
        color: car.color,
        x: car.x + cosA * (halfL * 0.3),
        y: car.y + sinA * (halfL * 0.3),
        vx: car.vx * 0.5 + cosA * (60 + impactSpeed * 0.8) + (Math.random() - 0.5) * 40,
        vy: car.vy * 0.5 + sinA * (60 + impactSpeed * 0.8) + (Math.random() - 0.5) * 40,
        angle: car.angle + (Math.random() - 0.5) * 0.6,
        angularVelocity: (Math.random() - 0.5) * 12.0,
        length: halfL * 0.75,
        width: halfW * 1.6,
        life: 0,
        maxLife: 240,
        strain: severity
      });
    }

    // Front Bumper detachment
    if ((dmg.frontCrumple > 6.0 || (severity > 0.48 && normX > 0.25)) && !dmg.frontBumperDetached) {
      dmg.frontBumperDetached = true;
      world.detachedParts.push({
        id: 'bumper_f_' + car.id + '_' + Date.now(),
        vehicleId: car.id,
        partType: 'bumper_front',
        color: car.color,
        x: car.x + cosA * (halfL * 0.9),
        y: car.y + sinA * (halfL * 0.9),
        vx: car.vx * 0.4 + cosA * (50 + impactSpeed * 0.6) + (Math.random() - 0.5) * 30,
        vy: car.vy * 0.4 + sinA * (50 + impactSpeed * 0.6) + (Math.random() - 0.5) * 30,
        angle: car.angle + (Math.random() - 0.5) * 0.8,
        angularVelocity: (Math.random() - 0.5) * 15.0,
        length: 6,
        width: halfW * 2.1,
        life: 0,
        maxLife: 240,
        strain: severity
      });
    }

    // Rear Bumper detachment
    if ((dmg.rearCrumple > 5.0 || (severity > 0.48 && normX < -0.25)) && !dmg.rearBumperDetached) {
      dmg.rearBumperDetached = true;
      world.detachedParts.push({
        id: 'bumper_r_' + car.id + '_' + Date.now(),
        vehicleId: car.id,
        partType: 'bumper_rear',
        color: car.color,
        x: car.x - cosA * (halfL * 0.9),
        y: car.y - sinA * (halfL * 0.9),
        vx: car.vx * 0.4 - cosA * (50 + impactSpeed * 0.6) + (Math.random() - 0.5) * 30,
        vy: car.vy * 0.4 - sinA * (50 + impactSpeed * 0.6) + (Math.random() - 0.5) * 30,
        angle: car.angle + (Math.random() - 0.5) * 0.8,
        angularVelocity: (Math.random() - 0.5) * 15.0,
        length: 6,
        width: halfW * 2.1,
        life: 0,
        maxLife: 240,
        strain: severity
      });
    }

    // Left Door detachment (порог ≈ 0.58 м вмятины двери — дверь срывает с петель)
    if ((dmg.leftDent > 5.5 || (severity > 0.52 && normY < -0.35)) && !dmg.leftDoorDetached) {
      dmg.leftDoorDetached = true;
      world.detachedParts.push({
        id: 'door_l_' + car.id + '_' + Date.now(),
        vehicleId: car.id,
        partType: 'door_left',
        color: car.color,
        x: car.x - sinA * (halfW * 0.8),
        y: car.y + cosA * (halfW * 0.8),
        vx: car.vx * 0.4 - sinA * (40 + impactSpeed * 0.5) + (Math.random() - 0.5) * 25,
        vy: car.vy * 0.4 + cosA * (40 + impactSpeed * 0.5) + (Math.random() - 0.5) * 25,
        angle: car.angle + (Math.random() - 0.5) * 0.9,
        angularVelocity: (Math.random() - 0.5) * 10.0,
        length: halfL * 0.6,
        width: 5,
        life: 0,
        maxLife: 240,
        strain: severity
      });
    }

    // Right Door detachment (порог ≈ 0.58 м вмятины двери — дверь срывает с петель)
    if ((dmg.rightDent > 5.5 || (severity > 0.52 && normY > 0.35)) && !dmg.rightDoorDetached) {
      dmg.rightDoorDetached = true;
      world.detachedParts.push({
        id: 'door_r_' + car.id + '_' + Date.now(),
        vehicleId: car.id,
        partType: 'door_right',
        color: car.color,
        x: car.x + sinA * (halfW * 0.8),
        y: car.y - cosA * (halfW * 0.8),
        vx: car.vx * 0.4 + sinA * (40 + impactSpeed * 0.5) + (Math.random() - 0.5) * 25,
        vy: car.vy * 0.4 - cosA * (40 + impactSpeed * 0.5) + (Math.random() - 0.5) * 25,
        angle: car.angle + (Math.random() - 0.5) * 0.9,
        angularVelocity: (Math.random() - 0.5) * 10.0,
        length: halfL * 0.6,
        width: 5,
        life: 0,
        maxLife: 240,
        strain: severity
      });
    }
  }

  // 6. Camera Micro-Freeze & Directional Impact Shockwave
  if (impactSpeed > 28 && (car.isPlayerControlled || (world as any)._lastPlayer?.currentVehicleId === car.id)) {
    world.impactFreezeTimer = Math.min(0.045, 0.016 + impactSpeed * 0.0002);
    if ((world as any).camera) {
      const cam = (world as any).camera;
      cam.shakeTimer = Math.min(0.85, 0.30 + impactSpeed * 0.005);
      cam.shakeIntensity = Math.min(22.0, 5.0 + impactSpeed * 0.14);
      cam.shakeVx = -cosA * Math.min(35.0, impactSpeed * 0.28);
      cam.shakeVy = -sinA * Math.min(35.0, impactSpeed * 0.28);
    }
  }

  // Set NPC emergency hazard lights & stop state if vehicle was disabled or crashed
  if (!car.isPlayerControlled && isVehicleDisabledOrCrashed(car)) {
    car.turnSignal = 'hazard';
    car.brakeLightsOn = true;
    car.targetSpeed = 0;
    car.idmAcceleration = 0;
    if (Math.hypot(car.vx || 0, car.vy || 0) < 0.5) {
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

// --- FLUID SPREADING: liquids flatten out into a thin film instead of staying round drops ---
// Film growth slows as the fluid spreads (r grows ~ sqrt(t) like a real thin film) and as the spill ages.
const FILM_SPREAD_RATE: Partial<Record<FluidStainType, number>> = { fuel: 2.6, water: 3.0, coolant: 1.8, oil: 0.9 };
const FILM_CAP_MULT: Partial<Record<FluidStainType, number>> = { fuel: 3.4, water: 2.2, coolant: 2.8, oil: 2.6 };

export function updateFluidSpread(st: FluidStain, dt: number) {
  const rate = FILM_SPREAD_RATE[st.type];
  if (rate === undefined) return; // sand and other granular spills don't flow
  if (st.filmCap === undefined) {
    const base = Math.max(st.maxRadius, 6);
    st.filmCap = Math.min(90, base * (FILM_CAP_MULT[st.type] ?? 2.5) * (0.8 + Math.random() * 0.4));
    st.spreadElong = 0.5 + Math.random() * 1.1;
    st.spreadAngle = Math.random() * Math.PI * 2;
  }
  if (st.radius >= st.filmCap) return;
  const ageFactor = Math.max(0, 1 - (st.life / Math.max(1, st.maxLife)) * 1.5);
  if (ageFactor <= 0) return;
  const growth = (rate * ageFactor * dt) / (1 + st.radius * 0.12);
  st.radius = Math.min(st.filmCap, st.radius + growth);
  // Let later merges grow the film up to its cap too
  if (st.maxRadius < st.filmCap) st.maxRadius = st.filmCap;
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

  const isOldHeavyTruck = carType === 'truck_dumper'|| carType === 'truck_dump'|| carType === 'truck_zil_dump'|| carType === 'truck_heavy'||
    carType === 'truck_tractor'|| carType === 'truck_semi'|| carType === 'truck_flatbed'|| carType === 'truck_covered'|| carType === 'truck_tanker'||
    carType === 'cement_mixer'|| carType === 'garbage_truck'|| carType === 'fire_engine'||
    carType === 'fire_ladder'|| carType === 'fire_rescue'|| carType === 'van_flatbed';

  const durability = (car as any).durability ?? 100;
  const engineHealth = eng.engineHealth ?? 100;

  const isOldCar = carType === 'sedan_classic'|| carType === 'coupe_old'|| carType === 'pickup_old'||
    carType === 'muscle_classic'|| durability < 65 || engineHealth < 70;

  const isDiesel = fuelTypeStr === 'diesel'|| isTractor || (isOldHeavyTruck && carType !== 'truck_zil_dump') || carType === 'pickup_heavy'|| carType === 'delivery_truck'|| carType === 'van_camper';
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

  // 3. Obtain Atmospheric State & Thermodynamic Properties
  const atmo = getAtmosphereState(world, world.timeHour);
  const outsideTemp = atmo.outsideTemp;
  const cond = atmo.condensationFactor;
  const isCold = atmo.isCold;
  const isFreezing = atmo.isFreezing;

  // Determine Smoke Color, Initial Size, Lifetime & Initial Gas Opacity
  let smokeColor = '#94a3b8';
  let initialRadius = 1.8 + Math.random() * 0.8;
  let maxLife = 0.50 + Math.random() * 0.30;
  let initialAlpha = 0.32 + throttle * 0.20;
  let isSteamPlume = false;
  let exhaustGasTemp = Math.max(55, temp * 0.85 + throttle * 35);
  let buoyancyForce = isTractor ? 26 : (isCold ? 14 : 6);
  let expansionBloomRate = 8.5;

  const isLpgActive = car.hasGBO && fuel && fuel.gboActive !== false && (fuel.gboLevel === undefined || fuel.gboLevel > 0) && temp >= 40;

  if (isLpgActive) {
    isSteamPlume = true;
    exhaustGasTemp = 80;
    if (outsideTemp > 16.0) {
      // Warm / summer: virtually invisible clean water vapor & heat shimmer
      smokeColor = '#ffffff';
      initialAlpha = 0.015 + Math.random() * 0.012;
      maxLife = 0.25 + Math.random() * 0.15;
      initialRadius = 1.2 + Math.random() * 0.5;
      expansionBloomRate = 5.0;
    } else {
      // Cool / winter / autumn: thick brilliant white steam condensation
      smokeColor = outsideTemp < 4 ? '#ffffff' : '#f8fafc';
      initialAlpha = 0.60 + cond * 0.32 + throttle * 0.08; // dense white steam
      maxLife = 0.95 + cond * 0.85 + Math.random() * 0.40;
      initialRadius = 2.6 + cond * 1.5 + Math.random() * 1.2;
      expansionBloomRate = 12.0;

      // Condensed water droplets dripping from exhaust onto asphalt
      if (Math.random() < (0.18 + cond * 0.25) * dt * 60) {
        if (Math.abs(car.speed) < 2.0 && Math.random() < 0.12) {
          addOrGrowFluidStain(world, exhaustAnchor.x, exhaustAnchor.y, 'water');
        }
      }
    }
  } else if (temp < 42) {
    // Cold Engine Vapor: massive rich condensate steam clouds with unburned hydrocarbons
    isSteamPlume = true;
    exhaustGasTemp = 50;
    smokeColor = isFreezing ? '#ffffff' : (outsideTemp < 8 ? '#f8fafc' : '#e2e8f0');
    initialAlpha = 0.65 + cond * 0.25 + Math.random() * 0.10;
    maxLife = 0.85 + cond * 0.75 + Math.random() * 0.35;
    initialRadius = 2.6 + cond * 1.4 + Math.random() * 1.2;
    expansionBloomRate = 11.5;

    // Cold engine drops water condensate
    if (Math.random() < 0.15 * dt * 60 && Math.abs(car.speed) < 2.5) {
      addOrGrowFluidStain(world, exhaustAnchor.x, exhaustAnchor.y, 'water');
    }
  } else if (engineHealth < 40 || oilLevel < 20) {
    // Burning Oil Smoke: thick pungent translucent blue-gray clouds
    smokeColor = '#64748b';
    initialAlpha = 0.72 + Math.random() * 0.15;
    maxLife = 0.95 + cond * 0.40 + Math.random() * 0.45;
    initialRadius = 2.6 + cond * 0.8 + Math.random() * 1.2;
    expansionBloomRate = 9.0;
  } else if (isOldHeavyTruck) {
    // Old Heavy Truck: Dark slate indigo / soot diesel clouds
    const blueSootColors = isCold 
      ? ['#263346', '#334155', '#475569'] // Lightened by water vapor condensation in cold air
      : ['#1a2230', '#222b3d', '#151d2a'];
    smokeColor = blueSootColors[Math.floor(Math.random() * blueSootColors.length)];
    initialAlpha = 0.82 + Math.min(0.15, throttle * 0.15) + (isCold ? 0.08 : 0);
    maxLife = 1.10 + cond * 0.65 + Math.random() * 0.50;
    initialRadius = 3.0 + cond * 1.4 + Math.random() * 1.5;
    expansionBloomRate = 11.0;
    exhaustGasTemp = 120;
    buoyancyForce = 22;
  } else if (isTractor) {
    // Tractor MTZ: Dark charcoal / black diesel soot puffs with condensation plume in cold
    const tractorColors = isCold 
      ? ['#1e293b', '#334155', '#475569'] 
      : ['#0f172a', '#1e293b', '#111827'];
    smokeColor = tractorColors[Math.floor(Math.random() * tractorColors.length)];
    initialAlpha = 0.85 + Math.min(0.12, throttle * 0.12) + (isCold ? 0.08 : 0);
    maxLife = 1.05 + cond * 0.70 + Math.random() * 0.45;
    initialRadius = 2.8 + cond * 1.5 + Math.random() * 1.4;
    expansionBloomRate = 12.0;
    exhaustGasTemp = 125;
    buoyancyForce = 28;
  } else if (isOldCar) {
    // Old classic car: gray-blue or brownish-gray exhaust with prominent steam in cold
    const oldCarColors = isCold
      ? ['#94a3b8', '#cbd5e1', '#e2e8f0']
      : ['#475569', '#52525b', '#3f3f46'];
    smokeColor = oldCarColors[Math.floor(Math.random() * oldCarColors.length)];
    initialAlpha = 0.55 + Math.min(0.25, throttle * 0.22) + cond * 0.25;
    maxLife = 0.70 + cond * 0.65 + Math.random() * 0.35;
    initialRadius = 2.2 + cond * 1.2 + Math.random() * 1.2;
    expansionBloomRate = 9.5;
    isSteamPlume = isCold;
  } else if (isDiesel) {
    // Standard Diesel
    smokeColor = isCold ? '#64748b' : '#334155';
    initialAlpha = 0.60 + throttle * 0.25 + (isCold ? 0.20 : 0);
    maxLife = 0.80 + cond * 0.60 + Math.random() * 0.35;
    initialRadius = 2.4 + cond * 1.2 + Math.random() * 1.2;
    expansionBloomRate = 9.5;
  } else {
    // Modern Standard Warm Petrol Engine:
    if (outsideTemp >= 18.0) {
      // Warm dry day: almost completely invisible clean hot gas shimmer
      smokeColor = '#cbd5e1';
      initialAlpha = 0.035 + throttle * 0.09;
      maxLife = 0.30 + Math.random() * 0.15;
      initialRadius = 1.5 + Math.random() * 0.6;
      expansionBloomRate = 6.0;
      isSteamPlume = false;
    } else if (outsideTemp >= 11.0) {
      // Cool day: mild light grey-white condensate puffs
      smokeColor = '#e2e8f0';
      initialAlpha = 0.25 + throttle * 0.18 + cond * 0.18;
      maxLife = 0.55 + cond * 0.35 + Math.random() * 0.25;
      initialRadius = 2.0 + cond * 0.8 + Math.random() * 0.8;
      expansionBloomRate = 8.5;
      isSteamPlume = true;
    } else {
      // Cold day (< 11°C): thick, billowy white steam condensation!
      smokeColor = isFreezing ? '#ffffff' : '#f8fafc';
      initialAlpha = 0.65 + throttle * 0.20 + cond * 0.20;
      maxLife = 0.95 + cond * 0.80 + Math.random() * 0.40;
      initialRadius = 2.7 + cond * 1.4 + Math.random() * 1.2;
      expansionBloomRate = 12.0;
      isSteamPlume = true;

      // Occasional water condensate droplets from tailpipe in cold weather
      if (Math.random() < (0.12 + cond * 0.15) * dt * 60 && Math.abs(car.speed) < 2.0) {
        addOrGrowFluidStain(world, exhaustAnchor.x, exhaustAnchor.y, 'water');
      }
    }
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

  // Atmospheric wind bias at moment of ejection
  pVx += atmo.wind.vx * 0.16;
  pVy += atmo.wind.vy * 0.16;

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
    underVehicle: !isTractor,
    isSteam: isSteamPlume,
    tempC: exhaustGasTemp,
    buoyancy: buoyancyForce,
    expansionRate: expansionBloomRate
  });
}

// --- MODULAR VEHICLE TICK SYSTEMS (ENGINE, COOLING, OIL, FUEL, SUSPENSION) ---
export function updateVehicleSystems(car: Vehicle, dt: number, world: GameWorld) {
  let spawnedMissingPowertrain = false;
  if (!car.engineState) {
    car.engineState = createDefaultEngineState(car.type, !car.isParked, !!car.isParked);
    spawnedMissingPowertrain = true;
  }
  if (!car.fuelSystem) {
    car.fuelSystem = createDefaultFuelSystem(car.type, !!car.isParked);
  }
  if (spawnedMissingPowertrain && !isTrailerVehicle(car)) {
    applyPowertrain(car);
  }
  car.damage = ensureVehicleDamage(car);

  const eng = car.engineState;
  const fuel = car.fuelSystem;
  const dmg = car.damage;

  // Step BeamNG 2D Node-Beam simulation (viscoelastic spring-dampers, plastic flow & elastic recovery)
  // Во время активного сжатия (stepNodeBeamContinuousContact) солвер уже сделал шаг в этом кадре —
  // второй шаг с тем же dt удваивал бы пластику и скорость отскока.
  if (dmg.nodeBeam) {
    if (dmg.nodeBeam.steppedThisTick) {
      dmg.nodeBeam.steppedThisTick = false;
    } else {
      stepNodeBeamSimulation(dmg.nodeBeam, dt, car);
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
    const baseHeat = car.acOn ? 2.9 : 2.4; // A/C compressor adds extra load and heat generation
    // Combustion heat scales quadratically with RPM and linearly with throttle
    // Heavy road machinery runs with steady governed industrial diesel RPM without runaway heat spikes
    // Powertrain variant: engine thermal character * firmware load (turbo boost adds extra heat)
    const pwHeatMult = (eng.heatMult ?? 1.0) * (1 + (eng.turboBoost ?? 0) * 0.35);
    const heatGen = isMachinery
      ? (1.2 + Math.pow(rpmNorm, 1.1) * 2.6) * (0.45 + throttleRatio * 0.55) * pwHeatMult
      : (baseHeat + Math.pow(rpmNorm, 1.8) * 8.8) * (0.45 + throttleRatio * 0.55) * pwHeatMult;

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
        // Steam clouds burst into air above radiator anchor
        const atmo = getAtmosphereState(world, world.timeHour);
        const cond = atmo.condensationFactor;
        const radSteamRadius = (4 + Math.random() * 5) * (1.0 + cond * 0.75);
        const radSteamAlpha = 0.65 + cond * 0.28;
        const radSteamLife = (0.7 + Math.random() * 0.4) * (atmo.isCold ? 1.55 : 0.85);

        world.particles.push({
          x: radAnchor.x + (Math.random() * 6 - 3),
          y: radAnchor.y + (Math.random() * 6 - 3),
          vx: -cosA * 10 + (Math.random() * 20 - 10) + atmo.wind.vx * 0.22,
          vy: -sinA * 10 - 18 + (Math.random() * 20 - 10) + atmo.wind.vy * 0.22,
          radius: radSteamRadius,
          color: atmo.outsideTemp < 5 ? '#ffffff' : '#f8fafc',
          alpha: radSteamAlpha,
          initialAlpha: radSteamAlpha,
          life: 0,
          maxLife: radSteamLife,
          type: 'engine_smoke',
          isSteam: true,
          tempC: 110,
          buoyancy: 26,
          expansionRate: 13
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
          radius: 0.60 + Math.random() * 0.70,
          aspect: 1.2 + Math.random() * 0.4,
          color: debrisColors[Math.floor(Math.random() * debrisColors.length)],
          secondaryColor: '#334155',
          alpha: 1.0,
          life: 0,
          maxLife: 300.0,
          type: 'debris',
          debrisSubtype: 'metal_flake',
          angle: Math.random() * Math.PI * 2,
          angularVelocity: (Math.random() - 0.5) * 25,
          shapeSeed: Math.floor(Math.random() * 10000),
          z: 1.2 + Math.random() * 1.5,
          vz: 24 + Math.random() * 35,
          bounces: 2,
          splatted: false
        });
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
          radius: 0.9 + Math.random() * 1.3,
          color: '#ffffff',
          secondaryColor: Math.random() < 0.6 ? '#fef08a' : '#fbbf24',
          alpha: 1.0,
          life: 0,
          maxLife: 0.45 + Math.random() * 0.55,
          type: 'spark',
          streakLength: 0.045,
          z: 0.8 + Math.random() * 1.2,
          vz: 18 + Math.random() * 32,
          bounces: 1
        });
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
    // Powertrain variant: engine appetite * firmware map
    if (eng.consumptionMult !== undefined) {
      consumptionRate *= eng.consumptionMult;
    }
    // Turbo enrichment under boost (spoken: fuel mixture goes richer under load)
    if ((eng.turboBoost ?? 0) > 0.05) {
      consumptionRate *= 1 + (eng.turboBoost ?? 0) * 0.6;
    }
    if (car.acOn) {
      consumptionRate *= 1.15; // A/C compressor parasite load (+15% fuel consumption)
    }
    // Firmware-aware chip tuning discount (only eco maps actually save fuel; power maps already cost more)
    if (eng.chipLevel === 1) {
      consumptionRate *= 0.88; // eco ECU map: optimized timing & AFR
    } else if ((car as any).hasChiptuning && eng.chipLevel === undefined) {
      consumptionRate *= 0.85; // legacy chiptuning vehicles
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
    if (car.acOn) {
      eng.batteryCharge = Math.max(0, eng.batteryCharge - 0.08 * dt); // A/C blower & electronics discharge
    }
    if (car.recircOn) {
      eng.batteryCharge = Math.max(0, eng.batteryCharge - 0.02 * dt); // Recirculation flap & fan discharge
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

  // Active Sitting Posture Physics (Сидение в кресле автобуса, поезда или квартиры)
  if (player.sittingState) {
    const seat = player.sittingState;
    // Check if player intended to stand up via WASD / Space movement
    if (input.forward || input.backward || input.left || input.right || input.handbrake) {
      player.sittingState = null;
      sound.playUseItem();
    } else {
      // First-principles physiological recovery while sitting:
      // Restores energy and relaxes body
      if (player.needs) {
        if (player.needs.energy < 100) {
          player.needs.energy = Math.min(100, player.needs.energy + dt * 0.4);
        }
      }
      if (player.bodyState) {
        if (player.bodyState.painLevel > 0) {
          player.bodyState.painLevel = Math.max(0, player.bodyState.painLevel - dt * 0.25);
        }
      }

      // Update position relative to moving parent vehicle / train carriage
      if (seat.type === 'bus_seat' && seat.targetId && world && world.vehicles) {
        const bus = world.vehicles.find(v => v.id === seat.targetId);
        if (bus) {
          const cos = Math.cos(bus.angle);
          const sin = Math.sin(bus.angle);
          const lx = seat.localX ?? 0;
          const ly = seat.localY ?? 0;
          player.x = bus.x + lx * cos - ly * sin;
          player.y = bus.y + lx * sin + ly * cos;
          player.angle = bus.angle + (seat.angle || 0);
          player.busLocalX = lx;
          player.busLocalY = ly;
        } else {
          player.sittingState = null;
        }
      } else if (seat.type === 'train_seat' && seat.targetId && world && world.rollingStock) {
        const car = world.rollingStock.find(c => c.id === seat.targetId);
        if (car) {
          const cos = Math.cos(car.angle);
          const sin = Math.sin(car.angle);
          const lx = seat.localX ?? 0;
          const ly = seat.localY ?? 0;
          player.x = car.x + lx * cos - ly * sin;
          player.y = car.y + lx * sin + ly * cos;
          player.angle = car.angle + (seat.angle || 0);
          player.carLocalX = lx;
          player.carLocalY = ly;
        } else {
          player.sittingState = null;
        }
      } else {
        // Stationary furniture seat in building / apartment
        player.x = seat.worldX;
        player.y = seat.worldY;
        player.angle = seat.angle || player.angle;
      }

      player.vx = 0;
      player.vy = 0;
      player.speed = 0;
      return;
    }
  }

  // Bus Saloon Interior Movement (Хождение внутри движущихся автобусов)
  if (player.insideBusId && world) {
    const bus = (world.vehicles || []).find(v => v.id === player.insideBusId);
    if (bus) {
      let moveX = 0;
      let moveY = 0;
      if (input.forward) moveY -= 1; // Screen Up
      if (input.backward) moveY += 1; // Screen Down
      if (input.left) moveX -= 1;    // Screen Left
      if (input.right) moveX += 1;   // Screen Right

      const len = Math.hypot(moveX, moveY);
      const walkSpeed = input.sprint ? 120 : 70;

      if (player.busLocalX === undefined) player.busLocalX = bus.length / 2 - 14;
      if (player.busLocalY === undefined) player.busLocalY = 5.5;

      const busCos = Math.cos(bus.angle);
      const busSin = Math.sin(bus.angle);

      if (len > 0.01) {
        moveX /= len;
        moveY /= len;

        const rotAngle = cameraAngle + Math.PI / 2;
        const cosCam = Math.cos(rotAngle);
        const sinCam = Math.sin(rotAngle);
        const worldMoveX = moveX * cosCam - moveY * sinCam;
        const worldMoveY = moveX * sinCam + moveY * cosCam;

        const localMoveX = worldMoveX * busCos + worldMoveY * busSin;
        const localMoveY = -worldMoveX * busSin + worldMoveY * busCos;

        player.busLocalX += localMoveX * walkSpeed * dt;
        player.busLocalY += localMoveY * walkSpeed * dt;
        player.walkCycle += dt * (input.sprint ? 14 : 8);
        player.speed = walkSpeed;
        player.angle = Math.atan2(worldMoveY, worldMoveX);
      } else {
        player.speed = 0;
      }

      constrainPlayerToBusInterior(player, bus, dt);

      player.x = bus.x + player.busLocalX * busCos - player.busLocalY * busSin;
      player.y = bus.y + player.busLocalX * busSin + player.busLocalY * busCos;

      player.vx = 0;
      player.vy = 0;
      return;
    } else {
      player.insideBusId = null;
    }
  }

  // Train Carriage Interior Movement (Хождение внутри движущихся пассажирских вагонов)
  if (player.insideCarId && world) {
    const car = (world.rollingStock || []).find(c => c.id === player.insideCarId);
    if (car) {
      let moveX = 0;
      let moveY = 0;
      if (input.forward) moveY -= 1; // Screen Up
      if (input.backward) moveY += 1; // Screen Down
      if (input.left) moveX -= 1;    // Screen Left
      if (input.right) moveX += 1;   // Screen Right

      const len = Math.hypot(moveX, moveY);
      const walkSpeed = input.sprint ? 130 : 75;

      if (player.carLocalX === undefined) player.carLocalX = 0;
      if (player.carLocalY === undefined) player.carLocalY = 9;

      const carCos = Math.cos(car.angle);
      const carSin = Math.sin(car.angle);

      if (len > 0.01) {
        moveX /= len;
        moveY /= len;

        // Rotate screen-space input based on camera angle (standard orthogonal game view)
        const rotAngle = cameraAngle + Math.PI / 2;
        const cosCam = Math.cos(rotAngle);
        const sinCam = Math.sin(rotAngle);
        const worldMoveX = moveX * cosCam - moveY * sinCam;
        const worldMoveY = moveX * sinCam + moveY * cosCam;

        // Transform world movement vector into carriage local axes
        const localMoveX = worldMoveX * carCos + worldMoveY * carSin;
        const localMoveY = -worldMoveX * carSin + worldMoveY * carCos;

        player.carLocalX += localMoveX * walkSpeed * dt;
        player.carLocalY += localMoveY * walkSpeed * dt;
        player.walkCycle += dt * (input.sprint ? 14 : 8);
        player.speed = walkSpeed;
        player.angle = Math.atan2(worldMoveY, worldMoveX);
      } else {
        player.speed = 0;
      }

      // Constrain player strictly within interior passenger coach walls and compartments
      constrainPlayerToCarInterior(player, car, dt);

      // Calculate world coordinates from carriage position and local offset
      player.x = car.x + player.carLocalX * carCos - player.carLocalY * carSin;
      player.y = car.y + player.carLocalX * carSin + player.carLocalY * carCos;

      player.vx = 0;
      player.vy = 0;
      return;
    } else {
      player.insideCarId = null;
    }
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
    // 45 - 80 kg: heavily encumbered, scales down from 0.45 to 0.10
    // 80+ kg: extreme overencumbrance, slows to a crawl (down to 0.02)
    let weightPenalty = 1.0;
    if (carriedWeight > 8) {
      if (carriedWeight <= 25) {
        weightPenalty = 1.0 - ((carriedWeight - 8) / 17) * 0.25;
      } else if (carriedWeight <= 45) {
        weightPenalty = 0.75 - ((carriedWeight - 25) / 20) * 0.30;
      } else if (carriedWeight <= 80) {
        weightPenalty = 0.45 - ((carriedWeight - 45) / 35) * 0.35;
      } else {
        weightPenalty = Math.max(0.02, 0.10 - ((carriedWeight - 80) / 40) * 0.08);
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

      let isStandingOnIce = false;
      if (isWorldFreezing(world)) {
        const river = getRiverWaterAt(player.x, player.y);
        if (river.inWater && !river.isBridge) {
          isStandingOnIce = true;
        } else if (world.puddles && world.puddles.length > 0) {
          for (let i = 0; i < world.puddles.length; i++) {
            const pud = world.puddles[i];
            if (Math.hypot(player.x - pud.x, player.y - pud.y) < Math.max(pud.radiusX, pud.radiusY)) {
              isStandingOnIce = true;
              break;
            }
          }
        }
      }

      const accelRate = isStandingOnIce ? (canSprint ? 2.2 : 3.5) : 10;
      player.vx += (targetVx - player.vx) * Math.min(1.0, accelRate * dt);
      player.vy += (targetVy - player.vy) * Math.min(1.0, accelRate * dt);

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

  // Collision with rolling stock (trains, passenger cars, locomotives, freight cars)
  if (world && world.rollingStock) {
    for (const car of world.rollingStock) {
      const col = checkPedestrianRollingStockCollision(newX, newY, pedRadius, car);
      if (col.collided) {
        newX = col.x;
        newY = col.y;
      }
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

        // Calculate relative normal velocity (from car towards player along collision normal)
        const carVx = Math.cos(car.angle) * (car.speed || 0);
        const carVy = Math.sin(car.angle) * (car.speed || 0);
        const playerVx = player.vx || 0;
        const playerVy = player.vy || 0;

        const relVx = carVx - playerVx;
        const relVy = carVy - playerVy;

        const normX = res.normalX || 0;
        const normY = res.normalY || 0;

        // Projected impact velocity along the collision normal (px/s -> km/h)
        const normalImpactPxS = relVx * normX + relVy * normY;
        const impactSpeedKmh = Math.round(Math.max(0, normalImpactPxS) * PX_S_TO_SPEED_KMH);

        // ONLY apply impact trauma if the vehicle is ACTUALLY striking the player along the normal at >= 12 km/h!
        // Touching, brushing against, or walking into a parked/idling car applies ZERO damage.
        if (impactSpeedKmh >= 12 && player.needs) {
          const now = Date.now() / 1000;
          if (!player.lastHurtTime || now - player.lastHurtTime > 0.5) {
            player.lastHurtTime = now;
            const carType = car.type || '';
            const isTruck = carType.includes('truck') || carType.includes('bus') || carType.includes('cement') || carType.includes('garbage') || carType.includes('fire');
            
            let impactForce = impactSpeedKmh * 1.45;
            if (isTruck) impactForce *= 1.6;

            const impactAngle = Math.atan2(normY, normX);
            const impulseMag = Math.min(550, impactSpeedKmh * 7.0);
            player.vx += normX * impulseMag;
            player.vy += normY * impulseMag;

            if (!player.isInvincible && !player.isCleanMode) {
              distributeImpactDamage(player, impactForce, impactAngle, true);
              sound.playHurt();

              if (impactSpeedKmh < 20) {
                addPlayerNotification(player, `Легкий толчок бампером (${impactSpeedKmh} км/ч). Ссадины и легкие ушибы.`, 'info');
              } else if (impactSpeedKmh < 40) {
                addPlayerNotification(player, `Сбит автомобилем на скорости ${impactSpeedKmh} км/ч! Ушибы!`, 'warning');
              } else if (impactSpeedKmh < 70) {
                addPlayerNotification(player, `Тяжелое столкновение (${impactSpeedKmh} км/ч)! Перелом кости!`, 'warning');
              } else {
                addPlayerNotification(player, `Критический наезд на высокой скорости (${impactSpeedKmh} км/ч)!`, 'warning');
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

export interface AtmosphereState {
  outsideTemp: number;         // Ambient air temperature in °C
  wind: WorldWind;             // Unified atmospheric wind vector
  condensationFactor: number;  // 0.0 to 1.8 (water vapor condensation intensity into visible micro-droplets)
  dissipationRate: number;     // Dispersion & evaporation rate multiplier based on wind shear & temperature
  airDensityRatio: number;     // Archimedes buoyancy factor relative to 20°C
  isCold: boolean;             // outsideTemp < 12°C
  isFreezing: boolean;         // outsideTemp <= 2°C
}

/**
 * Updates the global atmospheric wind simulation vector based on weather weights,
 * macro direction shifts, and boundary layer multi-frequency turbulence.
 */
export function updateWorldWind(world: GameWorld, dt: number): WorldWind {
  const safeDt = Number.isFinite(dt) ? Math.min(0.1, Math.max(0.001, dt)) : 0.016;
  const weights = getEffectiveWeatherWeights(world);

  if (!world.wind) {
    const initSpeed = 22 * weights.clear 
      + 34 * weights.overcast 
      + 26 * weights.drizzle 
      + 72 * weights.rain 
      + 155 * weights.storm 
      + 38 * weights.snow 
      + 168 * weights.blizzard 
      + 6 * weights.fog;
    const initAngle = 0.42; // natural prevailing westerly/southwesterly wind
    world.wind = {
      speed: Math.max(5, initSpeed),
      angle: initAngle,
      vx: Math.cos(initAngle) * initSpeed,
      vy: Math.sin(initAngle) * initSpeed,
      gust: 1.0,
      targetAngle: initAngle,
      targetSpeed: initSpeed,
      turbulenceTimer: 0
    };
  }

  const wind = world.wind;
  wind.turbulenceTimer = (wind.turbulenceTimer || 0) + safeDt;
  const t = wind.turbulenceTimer;

  // Determine continuous target speed based on smooth weather profile (px/s, ~10 px/s = 3.6 km/h)
  let targetSpeed = 22 * weights.clear 
    + 34 * weights.overcast 
    + 26 * weights.drizzle 
    + 72 * weights.rain 
    + 155 * weights.storm 
    + 38 * weights.snow 
    + 168 * weights.blizzard 
    + 6 * weights.fog;
  targetSpeed = Math.max(5, Math.min(195, targetSpeed));
  wind.targetSpeed = targetSpeed;

  // Severe storms and blizzards accelerate wind transitions; calm weather changes lazily
  const stormFactor = Math.max(weights.storm, weights.blizzard);
  const steerRate = 0.35 + stormFactor * 0.45;
  wind.speed += (targetSpeed - wind.speed) * Math.min(1.0, steerRate * safeDt);

  // Slow macro shift in prevailing wind direction (squall fronts create stronger directional shifts)
  const shiftChance = (0.015 + stormFactor * 0.05) * safeDt;
  if (Math.random() < shiftChance) {
    const maxShift = 0.35 + stormFactor * 0.65;
    wind.targetAngle = (wind.targetAngle ?? wind.angle) + (Math.random() - 0.5) * maxShift;
  }
  if (wind.targetAngle !== undefined) {
    let diff = wind.targetAngle - wind.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    wind.angle += diff * Math.min(1.0, 0.28 * safeDt);
  }

  // Multi-frequency boundary-layer turbulence (macro surge, convective eddy, high-freq buffeting)
  const gustFreq1 = 0.55 + stormFactor * 1.6;  // Long atmospheric wave (period ~5-11s)
  const gustFreq2 = 1.8 + stormFactor * 3.2;   // Intermediate eddy (period ~1.5-3.5s)
  const gustFreq3 = 4.5 + stormFactor * 5.8;   // Rapid micro-flutter (period ~0.6-1.4s)
  const gustMag = 0.14 + 0.52 * stormFactor + 0.18 * weights.rain;

  const rawGust = 1.0 
    + Math.sin(t * gustFreq1) * (gustMag * 0.52) 
    + Math.sin(t * gustFreq2 + 1.25) * (gustMag * 0.34) 
    + Math.cos(t * gustFreq3 + 2.70) * (gustMag * 0.14);
  wind.gust = Math.max(0.35, Math.min(2.35, rawGust));

  // Compute effective velocity vector
  const effectiveSpeed = wind.speed * wind.gust;
  wind.vx = Math.cos(wind.angle) * effectiveSpeed;
  wind.vy = Math.sin(wind.angle) * effectiveSpeed;

  return wind;
}

/**
 * Calculates ambient outside air temperature in °C based on time of day, calendar date, season, and weather.
 */
export function getOutsideTemperature(world: GameWorld, timeHour?: number): number {
  if (typeof (world as any)?.outsideTemp === 'number' && Number.isFinite((world as any).outsideTemp)) {
    return (world as any).outsideTemp;
  }
  let hour = 12;
  if (typeof timeHour === 'number' && Number.isFinite(timeHour)) {
    hour = timeHour;
  } else if (world && typeof world.timeHour === 'number' && Number.isFinite(world.timeHour)) {
    hour = world.timeHour;
  }

  if (world?.calendar) {
    const cal = { ...world.calendar, timeHour: hour };
    const atmo = calculateClimateAtmosphere(cal, world.weather || 'clear');
    return atmo.temperature;
  }

  // Fallback to default calendar state (October 8, 2026)
  const defaultCal = createInitialCalendarState(2026, 10, 8, hour);
  return calculateClimateAtmosphere(defaultCal, world?.weather || 'clear').temperature;
}

/**
 * Computes thermodynamic atmospheric state: ambient temperature, wind, water vapor condensation curve,
 * and turbulent dispersion factors.
 */
export function getAtmosphereState(world: GameWorld, timeHour?: number): AtmosphereState {
  const safeHour = typeof timeHour === 'number' && Number.isFinite(timeHour)
    ? timeHour
    : (typeof world.timeHour === 'number' && Number.isFinite(world.timeHour) ? world.timeHour : 12);
  const outsideTemp = getOutsideTemperature(world, safeHour);
  const wind = world.wind || {
    speed: 24,
    angle: 0.38,
    vx: 22,
    vy: 9,
    gust: 1.0,
    targetAngle: 0.38,
    targetSpeed: 24
  };

  const isHumid = world.weather === 'rain' || world.weather === 'storm' || world.weather === 'fog' || world.weather === 'snow' || world.weather === 'blizzard' || world.weather === 'drizzle';
  // Clausius-Clapeyron condensation curve:
  // Starts triggering below 14°C, reaches ~1.0 around 0°C, and >1.3 in severe cold.
  let condensationFactor = Math.max(0, (14.0 - outsideTemp) / 12.0);
  if (isHumid) {
    condensationFactor += (world.weather === 'fog' ? 0.35 : 0.20);
  }
  condensationFactor = Math.min(1.8, condensationFactor);

  // Evaporation in ambient air:
  // In hot dry weather (>20°C): high evaporation, steam vanishes rapidly
  // In freezing weather (<4°C): low evaporation, droplets persist and linger
  const tempEvap = Math.max(0.35, (outsideTemp + 8.0) / 18.0);
  // Wind shear accelerates dissipation:
  const effectiveWindSpeed = wind.speed * (wind.gust ?? 1.0);
  const windDisperse = 1.0 + (effectiveWindSpeed / 75.0) * 0.85;
  const dissipationRate = tempEvap * windDisperse;

  const airDensityRatio = (273.15 + 20) / (273.15 + Math.max(-30, outsideTemp));

  return {
    outsideTemp,
    wind,
    condensationFactor,
    dissipationRate,
    airDensityRatio,
    isCold: outsideTemp < 12.0,
    isFreezing: outsideTemp <= 0.0
  };
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
  if (world?.gameMode === 'freeroam') {
    car.fogLevel = 0.0;
    return 0.0;
  }
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
  
  // Recirculation factor makes humidity accumulate 1.8x faster because we are breathing the same air
  const recircFactor = car.recircOn ? 1.8 : 1.0;
  const wetClothesRate = wetRatio > 0.12 ? (wetRatio - 0.12) * 0.045 * recircFactor : 0;

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
  } else if (car.recircOn) {
    // Air recirculation causes gradual fogging even in warm weather due to moisture buildup
    isCondensationCondition = true;
    coldGlassFactor = 0.5;
  }

  // Respiration moisture only condenses when glass is cold or air is saturated
  const breathCondensationRate = isCondensationCondition
    ? passengerCount * 0.009 * (1.0 + coldGlassFactor) * recircFactor
    : (car.recircOn ? passengerCount * 0.004 : 0.0);

  // 6. Heater / Blower state
  const heaterMode = car.heaterMode || 'off';
  const fanSpeed = heaterMode === 'high'? 1.0 : heaterMode === 'med'? 0.65 : heaterMode === 'low'? 0.35 : 0.0;

  // A/C compressor is active when enabled, engine is running and fan speed is not zero
  const isAcActive = !!(car.acOn && car.engineState?.engineRunning && fanSpeed > 0);

  let coldBlowerFogRate = 0.0;
  let warmBlowerDryRate = 0.0;
  let acDryRate = 0.0;

  if (fanSpeed > 0) {
    if (engineTemp < 55) {
      // COLD BLOWER: When engineTemp < 55°C, heater core is cold and damp, blowing wet cold air directly onto glass
      const coldFraction = Math.max(0, Math.min(1.0, (55 - engineTemp) / 35));
      coldBlowerFogRate = fanSpeed * (0.016 + 0.032 * coldFraction);
      if (isAcActive) {
        coldBlowerFogRate *= 0.1; // A/C dries incoming air, neutralizing the cold damp core effect!
      }
    } else if (engineTemp > 65) {
      // WARM HEATER DRYING: Effective drying when engineTemp > 65°C
      const warmFraction = Math.max(0, Math.min(1.0, (engineTemp - 65) / (90 - 65)));
      warmBlowerDryRate = fanSpeed * (0.032 + 0.078 * warmFraction);
    } else {
      // Lukewarm transition (55°C - 65°C)
      const lukewarmFraction = (engineTemp - 55) / 10;
      warmBlowerDryRate = fanSpeed * lukewarmFraction * 0.015;
    }

    if (isAcActive) {
      // A/C dehumidification drying effect scales with fan speed
      acDryRate = fanSpeed * 0.14;
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

  let evaporationRate = warmBlowerDryRate + windowDraftDryRate + naturalDryAirEvaporation + acDryRate;

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

  // Invincibility / Creative Mode / Freeroam vitals override
  const isFreeroam = world?.gameMode === 'freeroam';
  if (player.isInvincible || player.isCreativeMode || player.isCleanMode || isFreeroam) {
    player.isInvincible = true;
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
      player.bodyState.painPulse = 0;
      player.bodyState.shockLevel = 0;
      player.bodyState.bloodLoss = 0;
      player.bodyState.panicLevel = 0;
      player.bodyState.dizziness = 0;
      player.bodyState.coPoisoning = 0;
      player.bodyState.temperature = 36.6;
      player.bodyState.wetness = 0;
      player.bodyState.shiverIntensity = 0;
      player.bodyState.comfort = 100;
      for (const k of ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'] as const) {
        if (player.bodyState[k]) {
          player.bodyState[k].injuries = [];
        }
      }
    }
  }

  // --- BODY STATE & PHYSIOLOGICAL SIMULATION ---
  const bs = player.bodyState;
  const weights = getEffectiveWeatherWeights(world);
  const liquidPrecip = weights.rain * 1.0 + weights.drizzle * 0.45 + weights.storm * 1.45;
  const frozenPrecip = weights.snow * 0.70 + weights.blizzard * 1.50;
  const isRaining = liquidPrecip > 0.05;

  // Shelter detection: vehicles, indoor buildings, or protective canopies/roofs overhead
  const isVehicleSheltered = !!(player.isInVehicle && player.currentVehicleId);
  const isBuildingSheltered = !!player.isInsideBuilding;
  let isCanopySheltered = false;
  if (!isVehicleSheltered && !isBuildingSheltered && world.buildings) {
    for (const b of world.buildings) {
      if (b.type === 'gas_station_canopy' || (b as any).hasCanopy || (b.type as string) === 'canopy') {
        if (player.x >= b.x && player.x <= b.x + b.width && player.y >= b.y && player.y <= b.y + b.height) {
          isCanopySheltered = true;
          break;
        }
      }
    }
  }

  const isSheltered = isVehicleSheltered || isBuildingSheltered || isCanopySheltered;
  const isExposedToRain = !isSheltered && (liquidPrecip > 0.04);
  const isExposedToSnow = !isSheltered && (frozenPrecip > 0.05);

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
    const isAcActive = !!(curVehicle.acOn && curVehicle.engineState?.engineRunning && heaterMode !== 'off');

    if (heaterMode !== 'off') {
      let modeTarget = heaterMode === 'low'? 22 : heaterMode === 'med'? 27 : 34;

      // If A/C is active, it cools down the incoming target temperature
      if (isAcActive) {
        if (heaterMode === 'low') {
          modeTarget = 16; // Chilled air conditioning
        } else if (heaterMode === 'med') {
          modeTarget = 21; // Gentle cooled dry climate
        } else {
          modeTarget = 26; // Warm but dried climate
        }
      }

      // If engine is cold (<50°C) and AC is OFF, blowing air is cold!
      // But if AC is ON, it can cool the cabin even if the engine is cold or hot.
      if (isAcActive) {
        targetCabinTemp = modeTarget;
      } else {
        const maxAirFromEngine = Math.max(outsideTemp - 2.5, engTemp - 6);
        targetCabinTemp = Math.min(modeTarget, maxAirFromEngine);
      }
    }

    // Cooling/heating transfer rate
    let transferSpeed = heaterMode !== 'off'? 0.14 : 0.07;
    if (curVehicle.recircOn) {
      transferSpeed *= 1.4; // 40% faster heating/cooling since we recycle the cabin air and don't draw outside ambient air!
    }
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

    if (isFreeroam) {
      curVehicle.windshieldRainLevel = 0;
      curVehicle.fogLevel = 0;
    } else {
      // Wipers and windshield rain level (exterior water on the glass with aerodynamic airflow)
      if (isRaining) {
        const carSpeedKmh = Math.abs(curVehicle.speed || 0) * 3.6;
        // Faster forward travel sweeps through more volumetric raindrops per second
        const speedAccFlux = 1.0 + Math.min(2.2, carSpeedKmh / 50.0);

        if (!curVehicle.wipersOn) {
          // Build up water on the screen
          curVehicle.windshieldRainLevel = Math.min(100, curVehicle.windshieldRainLevel + 16 * speedAccFlux * dt);
        } else {
          // Clear rain quickly with wipers
          curVehicle.windshieldRainLevel = Math.max(0, curVehicle.windshieldRainLevel - 45 * dt);
        }

        // High-speed aerodynamic shear blow-off: beyond ~65 km/h, the rush of air over the windshield
        // shears and blows away surface water beads
        if (carSpeedKmh > 65) {
          const aeroBlowOff = Math.min(28, (carSpeedKmh - 65) * 0.45);
          curVehicle.windshieldRainLevel = Math.max(0, curVehicle.windshieldRainLevel - aeroBlowOff * dt);
        }
      } else {
        // Dry out gradually; ambient wind and forward travel accelerate drying
        const carSpeedKmh = Math.abs(curVehicle.speed || 0) * 3.6;
        const windDryBonus = (world.wind ? (world.wind.speed * 0.05) : 0) + Math.min(25, carSpeedKmh * 0.25);
        curVehicle.windshieldRainLevel = Math.max(0, curVehicle.windshieldRainLevel - (15 + windDryBonus) * dt);
      }

      // Mathematical update of windshield fogging (moisture & temperature balance)
      updateFog(curVehicle, player, world, dt, timeHour);
    }
  }

  if (isFreeroam) {
    return;
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
  if (!isSheltered && (isExposedToRain || isExposedToSnow)) {
    // Water resistance of equipped clothing across body parts
    const torsoWaterResist = player.equippedClothing?.torso?.outerwear?.clothingStats?.waterResistance
      ?? player.equippedClothing?.torso?.jacket?.clothingStats?.waterResistance
      ?? player.equippedClothing?.torso?.shirt?.clothingStats?.waterResistance
      ?? 0;
    const legsWaterResist = player.equippedClothing?.legs?.outerwear?.clothingStats?.waterResistance
      ?? player.equippedClothing?.legs?.shirt?.clothingStats?.waterResistance
      ?? 0;
    const headWaterResist = player.equippedClothing?.head?.outerwear?.clothingStats?.waterResistance ?? 0;
    const bodyWaterResist = (torsoWaterResist * 0.50 + legsWaterResist * 0.35 + headWaterResist * 0.15);

    let wetFlux = 0;
    if (isExposedToRain) {
      // Liquid rain directly penetrates and soaks non-waterproof fabric rapidly
      const rainPenetration = Math.max(0.04, 1.0 - (bodyWaterResist / 100));
      wetFlux += liquidPrecip * 5.4 * rainPenetration;
    }
    if (isExposedToSnow) {
      // Driving snow cakes onto clothes; body temperature (36°C) melts surface snow into ice water
      const snowPenetration = Math.max(0.06, 1.0 - (bodyWaterResist / 100));
      wetFlux += frozenPrecip * 3.4 * snowPenetration;
    }

    bs.wetness = Math.min(100, bs.wetness + wetFlux * dt);
  } else {
    // Realistic slow drying:
    // Natural room temp (20°C): 0.025 - 0.035 %/sec (40-50 minutes for completely soaked wool/jeans)
    // Heated building (21°C): 0.055 %/sec
    // In vehicle:
    //   If blower is blowing warm (>60°C): 0.18 + fanSpeed * 0.45 %/sec (~3-5 minutes to dry)
    //   If A/C is active (dehumidification): +0.15 %/sec
    //   If open window draft: +0.06 %/sec
    //   If cold blower or heater off: 0.015 %/sec
    // Near campfire / barrel fire / stove: 0.6 - 1.4 %/sec
    let dryRate = 0.028; // base natural air drying
    if (player.isInsideBuilding) {
      dryRate = 0.055;
    } else if (curVehicle) {
      const heaterMode = curVehicle.heaterMode || 'off';
      const fanSpeed = heaterMode === 'high' ? 1.0 : heaterMode === 'med' ? 0.65 : heaterMode === 'low' ? 0.35 : 0.0;
      const engTemp = curVehicle.engineTemp ?? 20;
      let blowerDry = 0;
      if (fanSpeed > 0 && engTemp > 60) {
        blowerDry = fanSpeed * (0.15 + Math.min(0.40, (engTemp - 60) / 35));
      }
      const acDry = (curVehicle.acOn && fanSpeed > 0) ? 0.15 : 0;
      const draftDry = curVehicle.windowOpen ? 0.06 : 0;
      dryRate = 0.015 + blowerDry + acDry + draftDry;
    }
    bs.wetness = Math.max(0, bs.wetness - dryRate * dt);
  }

  // Keep equipped clothing items synchronized with the player's clothing wetness
  if (player.equippedClothing) {
    for (const slot of Object.values(player.equippedClothing)) {
      for (const item of Object.values(slot || {})) {
        if (item) {
          item.wetness = Math.round(bs.wetness * 10) / 10;
          if (item.clothingStats) {
            item.clothingStats.wetness = item.wetness;
          }
        }
      }
    }
  }

  // 2. Body Temperature dynamics (Thermodynamic heat balance, wind chill, clothing wind shear, hypothermia)
  const outsideTemp = getOutsideTemperature(world, timeHour);
  let ambientTemp = outsideTemp;
  let isEnclosed = false;
  let hasDraft = false;
  let windKmh = 0;

  if (curVehicle) {
    ambientTemp = curVehicle.heaterTemp ?? outsideTemp;
    isEnclosed = !curVehicle.windowOpen;
    hasDraft = !!curVehicle.windowOpen;
    windKmh = curVehicle.windowOpen ? 15 : 0;
  } else if (player.isInsideBuilding) {
    ambientTemp = 21.0; // heated indoor environment
    isEnclosed = true;
    windKmh = 0;
  } else {
    const rawWindSpeed = world.wind ? (world.wind.speed * (world.wind.gust ?? 1.0)) : 24;
    windKmh = rawWindSpeed * 0.36;
    hasDraft = windKmh > 12;

    // Atmospheric Wind Chill Index (JAG/TI standard formula):
    // In sub-zero weather and gale wind (blizzard/storm), wind shear strips skin boundary heat massively
    if (outsideTemp <= 10.0 && windKmh > 4.5) {
      const vPow = Math.pow(windKmh, 0.16);
      const windChill = 13.12 + 0.6215 * outsideTemp - 11.37 * vPow + 0.3965 * outsideTemp * vPow;
      ambientTemp = Math.min(outsideTemp, windChill);
    }
    
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
            bs.wetness = Math.max(0, bs.wetness - 1.2 * fireProx * dt);
          }
        }
      }
    }

    if (bs.wetness >= 70 && Math.random() < 0.04 * dt) {
      addPlayerNotification(player, 'Одежда промокла до нитки! Ледяная влажная ткань холодит кожу, начинается озноб.', 'warning');
    }
  }

  // 1.5 Indoor heating radiators, convector stoves & radiant sources
  let isNearRadiator = false;
  let radiatorProximity = 0;
  let indoorRadiatorTempBoost = 0;

  if (player.isInsideBuilding && player.insideBuildingId) {
    const bld = world.buildings?.find(b => b.id === player.insideBuildingId);
    if (bld) {
      const layout = getBuildingLayout(bld, player.currentFloor || 0, player.insideApartmentId || undefined);
      if (layout && layout.furniture) {
        for (const f of layout.furniture) {
          if (f.type === 'radiator' || f.type === 'stove') {
            const fx = f.x + f.width / 2;
            const fy = f.y + f.height / 2;
            const dist = Math.hypot(player.x - fx, player.y - fy);
            if (dist < 42) {
              const prox = 1.0 - (dist / 42);
              if (prox > radiatorProximity) {
                radiatorProximity = prox;
                isNearRadiator = true;
                indoorRadiatorTempBoost = (f.type === 'stove' ? 45.0 : 38.0) * prox;
              }
            }
          }
        }
      }
    }
  }

  bs.nearRadiator = isNearRadiator;
  if (isNearRadiator && indoorRadiatorTempBoost > 0) {
    ambientTemp = Math.max(ambientTemp, 22.0 + indoorRadiatorTempBoost);
    // Accelerated drying right in front of radiator / stove (~1.4 to 3.2% per sec)
    const radiatorDryRate = 1.4 + radiatorProximity * 1.8;
    bs.wetness = Math.max(0, bs.wetness - radiatorDryRate * dt);
  }

  // Realistic Clothing Thermal Dynamics:
  // A. Wind Penetration (Ветропродуваемость): loose knitted wool sweaters / t-shirts (windResistance 15)
  // allow high wind to penetrate and flush out trapped air, destroying up to 85% of their insulation!
  const torsoWindResist = player.equippedClothing?.torso?.outerwear?.clothingStats?.windResistance
    ?? player.equippedClothing?.torso?.jacket?.clothingStats?.windResistance
    ?? player.equippedClothing?.torso?.shirt?.clothingStats?.windResistance
    ?? 5;
  const legsWindResist = player.equippedClothing?.legs?.outerwear?.clothingStats?.windResistance
    ?? player.equippedClothing?.legs?.shirt?.clothingStats?.windResistance
    ?? 10;
  const avgWindResist = (torsoWindResist * 0.60 + legsWindResist * 0.40);
  const windRetention = isSheltered ? 1.0 : ((avgWindResist / 100) + (1.0 - (avgWindResist / 100)) * Math.exp(-windKmh / 14.0));

  // B. Bare Head & Hands Penalty: In freezing weather (<4°C), uncovered head radiates 35% of heat, bare hands 22%
  const hasHat = !!player.equippedClothing?.head?.outerwear;
  const hasGloves = !!player.equippedClothing?.hands?.outerwear;
  let exposurePenalty = 0;
  if (ambientTemp < 4.0 && !isSheltered) {
    if (!hasHat) exposurePenalty += 0.35;
    if (!hasGloves) exposurePenalty += 0.22;
  }

  // C. Wet Fabric Conductivity: water conducts heat 24x faster than dry still air.
  // Soaked clothes crush insulation and draw substantial latent heat of evaporation (2260 kJ/kg)
  const wetConductiveLoss = (bs.wetness / 100) * 0.90;
  const wetInsulationRatio = Math.max(0.06, 1.0 - wetConductiveLoss);
  const evaporativeChilling = (bs.wetness / 100) * 6.8;
  const feltAmbient = ambientTemp - evaporativeChilling;

  // Effective thermal envelope
  const effectiveInsulation = totalInsulation * windRetention * wetInsulationRatio * Math.max(0.12, 1.0 - exposurePenalty);
  const effectiveAmbientTemp = feltAmbient < 18.0 ? feltAmbient + (effectiveInsulation * 0.22) : feltAmbient;
  const isTooHotClothes = feltAmbient >= 25.0 && totalInsulation > 30;

  let sweatRate = 0;
  if (isTooHotClothes && !player.isInVehicle) {
    // Hot day in heavy clothes
    sweatRate = Math.max(0, (totalInsulation * 0.035) - (totalBreathability * 0.015));
    player.needs.thirst = Math.max(0, player.needs.thirst - sweatRate * dt);
    player.needs.energy = Math.max(0, player.needs.energy - (totalMobilityPenalty * 0.04) * dt);
    bs.temperature = Math.min(39.0, bs.temperature + (sweatRate * 0.008) * dt);
  }

  if (effectiveAmbientTemp < 18.0) {
    ambientTemp = effectiveAmbientTemp;

    // Player is exposed to cold
    const coldDeficit = (18.0 - ambientTemp) / 10;
    const wetConductiveMultiplier = 1.0 + (bs.wetness / 100) * 3.6; // wet clothes cause severe conductive cooling
    const draftMultiplier = hasDraft ? (1.35 + Math.min(1.2, windKmh / 35)) : (isEnclosed ? 0.85 : 1.15);

    // Shivering thermogenesis attempt by the body
    let shiveringHeatProduction = 0;
    if (bs.temperature < 36.5 && bs.temperature > 33.5) {
      shiveringHeatProduction = 0.018 * Math.min(1.0, (36.5 - bs.temperature) / 1.5);
      // Shivering burns energy & calories
      player.needs.hunger = Math.max(0, player.needs.hunger - 0.022 * dt);
      player.needs.energy = Math.max(0, player.needs.energy - 0.8 * dt);
    }

    const coolingRate = Math.max(0.012, 0.048 * coldDeficit * wetConductiveMultiplier * draftMultiplier - shiveringHeatProduction);
    bs.temperature = Math.max(28.0, bs.temperature - coolingRate * dt);

    // Hypothermia stages
    if (bs.temperature < 35.0) {
      const hypothermiaSeverity = (35.0 - bs.temperature);
      player.needs.health = Math.max(0, (player.needs.health ?? 100) - (0.25 + hypothermiaSeverity * 0.45) * dt);

      if (bs.temperature < 32.5 && !player.isFainting && !player.isHospitalized && !player.needsHospitalEvacuation) {
        player.isFainting = true;
        player.faintTimer = 16;
        sound.playGroan();
        addPlayerNotification(player, `ВЫ ПОТЕРЯЛИ СОЗНАНИЕ ОТ ТЯЖЕЛОЙ ГИПОТЕРМИИ (${bs.temperature.toFixed(1)}°C)! Срочно требуется тепло!`, 'warning');
      }
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
  } else if (bs.temperature < 36.6) {
    // Rewarming condition: only if clothes are dry (wetness < 20%) OR we are near a heat source / radiator / fire / ambient > 28°C!
    if (bs.wetness < 20 || isNearRadiator || ambientTemp > 28.0) {
      const warmFactor = Math.min(1.8, Math.max(0, (ambientTemp - 18.0) / 12));
      const radiatorBonus = isNearRadiator ? (0.22 + radiatorProximity * 0.40) : 0;
      const heatRate = 0.06 + 0.16 * warmFactor + radiatorBonus;
      bs.temperature = Math.min(36.6, bs.temperature + heatRate * dt);
    }
  }

  // 2.5 Compute Psychological & Physical Comfort index (0 to 100%)
  const isPlayerMoving = Math.hypot(player.vx, player.vy) > 8;
  const dryScore = Math.max(0, 1.0 - (bs.wetness || 0) / 25) * 25; // up to 25 pts
  const thermalScore = Math.max(0, 1.0 - Math.abs(bs.temperature - 36.6) / 1.0) * 25; // up to 25 pts
  const radiatorScore = isNearRadiator ? 15 : 0; // up to 15 pts bonus for cozy radiant heat
  const nutritionScore = ((Math.min(100, player.needs.hunger) / 100) * 0.5 + (Math.min(100, player.needs.thirst) / 100) * 0.5) * 20; // up to 20 pts
  const seatScore = (player.sittingState || player.isInVehicle ? 15 : (isPlayerMoving ? 0 : 8)); // up to 15 pts
  const painPenalty = Math.min(1.0, (bs.effectivePain || 0) / 35 + (bs.panicLevel || 0) / 35 + (player.needs.nausea || 0) / 40);
  const healthScore = Math.max(0, (1.0 - painPenalty)) * 15; // up to 15 pts

  const rawComfort = dryScore + thermalScore + radiatorScore + nutritionScore + seatScore + healthScore;
  bs.comfort = Math.min(100, Math.max(0, Math.round(rawComfort)));

  // Comfort benefits:
  if (bs.comfort > 50) {
    // Soothe panic faster in comfortable conditions
    bs.panicLevel = Math.max(0, (bs.panicLevel || 0) - 2.5 * dt);
  }

  // 3. Hydration & Energy sync
  bs.hydration = player.needs.thirst;
  bs.energy = player.needs.energy;

  // 4. Update Pharmacokinetics & Body Physiology Systems
  updateMedicineSystem(player, dt);
  updateBodySystem(player, input, dt, Date.now() / 1000);

  // 4.1. Update Item Thermodynamics & Thermal Contact Burns
  updateWorldItemsThermodynamics(world, player, dt);

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

  // 1. Drain Hunger (Голод) - Physiological Basal Metabolic Rate + physical work (balanced for 24-min full day)
  let hungerDrain = 0.035; // Resting BMR (~2.1 units per in-game hour)
  if (input.sprint && !player.isInVehicle && player.speed > 50) {
    hungerDrain = 0.13; // Intense running exertion
  } else if (isPlayerMoving && !player.isInVehicle) {
    hungerDrain = 0.065; // Walking / standard physical effort
  }
  player.needs.hunger = Math.max(0, player.needs.hunger - hungerDrain * dt);

  // 2. Drain Thirst (Жажда) - Depletes ~2x faster than food, accelerates with physical exertion & heat sweating
  let thirstDrain = 0.065; // Resting hydration consumption (~3.9 units per in-game hour)
  if (input.sprint && !player.isInVehicle && player.speed > 50) {
    thirstDrain = 0.22; // High-intensity sprinting
  } else if (isPlayerMoving && !player.isInVehicle) {
    thirstDrain = 0.11; // Active walking
  }
  // Ambient heat sweating adds to fluid loss
  if (ambientTemp > 24.0 && !player.isInVehicle) {
    thirstDrain += Math.min(0.20, (ambientTemp - 24.0) * 0.02);
  }
  player.needs.thirst = Math.max(0, player.needs.thirst - thirstDrain * dt);

  // 3. Energy / Stamina (Усталость / Выносливость)
  const isDrowsy = player.needs.sleepiness > 75;
  const isDehydrated = player.needs.thirst < 25;
  const isStarving = player.needs.hunger < 15;

  let maxEnergy = 100;
  if (isDrowsy) maxEnergy = Math.min(maxEnergy, 70);
  if (isDehydrated) maxEnergy = Math.min(maxEnergy, 55);
  if (isStarving) maxEnergy = Math.min(maxEnergy, 60);

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
    let recoveryRate = 26;
    if (isDrowsy) recoveryRate *= 0.65;
    if (isDehydrated) recoveryRate *= 0.45;
    if (isStarving) recoveryRate *= 0.70;
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
    // If the skip is positive and exceeds a normal frame tick (which is dt / 60 <= 0.005)
    if (deltaHours > 0.08 && !player.isSleeping) {
      // Dynamic sleepiness accumulation for skipped hours (approx 3.8 units per hour)
      const skippedSleepiness = deltaHours * 3.8;
      player.needs.sleepiness = Math.min(100, player.needs.sleepiness + skippedSleepiness);
      
      // Update consecutive wake hours to reflect skipped time
      player.consecutiveWakeHours = (player.consecutiveWakeHours || 0) + deltaHours;

      // Also adjust hunger and thirst during the skipped hours so skipping time has physiological costs!
      const hungerDrainPerHour = 2.1;
      const thirstDrainPerHour = 3.9;
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
    // 24 real minutes = 24 in-game hours (1 in-game hour per 60 real seconds)
    const elapsedHours = dt * (1 / 60);
    player.consecutiveWakeHours = (player.consecutiveWakeHours || 0) + elapsedHours;
  }

  // A. Base fatigue accumulation rate (calibrated for 24-minute full day cycle)
  let baseRate = 0.082;

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
  // Applies ONLY if the player took a daytime nap (woke up between 09:00 and 20:00)
  // and then tries to stay awake at night. It must NOT trigger if the player just woke up from normal night sleep!
  let circadianCrashModifier = 1.0;
  const isNightTime = timeHour >= 22 || timeHour < 6;
  const lastSleepWasDaytime = player.lastSleepEndHour !== undefined && (player.lastSleepEndHour >= 9.0 && player.lastSleepEndHour <= 20.0);
  if (isNightTime && wakeHours < 6.0 && lastSleepWasDaytime) {
    circadianCrashModifier = 1.30; // mild adjustment for waking up from an extended afternoon nap
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
    // Starvation damage (gradual organ & tissue depletion)
    player.needs.health = Math.max(0, player.needs.health - 0.25 * dt);
  }
  if (player.needs.thirst <= 0) {
    // Dehydration damage (severe cellular dehydration & circulatory collapse)
    player.needs.health = Math.max(0, player.needs.health - 0.65 * dt);
  }
  if (
    player.needs.hunger > 60 &&
    player.needs.thirst > 60 &&
    player.needs.energy > 30 &&
    (bs.temperature >= 36.2 && bs.temperature <= 37.3) &&
    player.needs.health < 100 &&
    player.needs.health > 0
  ) {
    player.needs.health = Math.min(100, player.needs.health + 0.85 * dt);
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

type Road = RoadSegment;

interface StaticSurfaceCell {
  roads: Road[];
  intersections: Intersection[];
  roundabouts: any[];
  parkings: any[];
  sidewalks: any[];
  driveways: any[];
  fields: any[];
}

const SURFACE_CELL_SIZE = 500;
let lastIndexedWorldForSurface: GameWorld | null = null;
const surfaceSpatialGrid = new Map<number, StaticSurfaceCell>();

function getSurfaceGridKey(cx: number, cy: number): number {
  return ((cx & 0xffff) << 16) | (cy & 0xffff);
}

function getOrCreateSurfaceCell(cx: number, cy: number): StaticSurfaceCell {
  const key = getSurfaceGridKey(cx, cy);
  let cell = surfaceSpatialGrid.get(key);
  if (!cell) {
    cell = {
      roads: [],
      intersections: [],
      roundabouts: [],
      parkings: [],
      sidewalks: [],
      driveways: [],
      fields: []
    };
    surfaceSpatialGrid.set(key, cell);
  }
  return cell;
}

export function ensureSurfaceSpatialIndex(world: GameWorld): void {
  if (lastIndexedWorldForSurface === world && surfaceSpatialGrid.size > 0) {
    return;
  }
  lastIndexedWorldForSurface = world;
  surfaceSpatialGrid.clear();

  // Index Roads
  const roads = world.roads || [];
  for (let i = 0; i < roads.length; i++) {
    const road = roads[i];
    const halfWidth = road.width / 2 + 10;
    let rMinX = road._minX;
    let rMaxX = road._maxX;
    let rMinY = road._minY;
    let rMaxY = road._maxY;

    if (rMinX === undefined || rMaxX === undefined || rMinY === undefined || rMaxY === undefined) {
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

    const minCx = Math.floor((rMinX - halfWidth) / SURFACE_CELL_SIZE);
    const maxCx = Math.floor((rMaxX + halfWidth) / SURFACE_CELL_SIZE);
    const minCy = Math.floor((rMinY - halfWidth) / SURFACE_CELL_SIZE);
    const maxCy = Math.floor((rMaxY + halfWidth) / SURFACE_CELL_SIZE);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        getOrCreateSurfaceCell(cx, cy).roads.push(road);
      }
    }
  }

  // Index Intersections
  const intersections = world.intersections || [];
  for (let i = 0; i < intersections.length; i++) {
    const inter = intersections[i];
    const halfW = inter.width / 2 + 4;
    const halfH = inter.height / 2 + 4;
    const minCx = Math.floor((inter.x - halfW) / SURFACE_CELL_SIZE);
    const maxCx = Math.floor((inter.x + halfW) / SURFACE_CELL_SIZE);
    const minCy = Math.floor((inter.y - halfH) / SURFACE_CELL_SIZE);
    const maxCy = Math.floor((inter.y + halfH) / SURFACE_CELL_SIZE);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        getOrCreateSurfaceCell(cx, cy).intersections.push(inter);
      }
    }
  }

  // Index Roundabouts
  const roundabouts = world.roundabouts || [];
  for (let i = 0; i < roundabouts.length; i++) {
    const rb = roundabouts[i];
    const r = rb.radius + 6;
    const minCx = Math.floor((rb.x - r) / SURFACE_CELL_SIZE);
    const maxCx = Math.floor((rb.x + r) / SURFACE_CELL_SIZE);
    const minCy = Math.floor((rb.y - r) / SURFACE_CELL_SIZE);
    const maxCy = Math.floor((rb.y + r) / SURFACE_CELL_SIZE);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        getOrCreateSurfaceCell(cx, cy).roundabouts.push(rb);
      }
    }
  }

  // Index Parkings
  const parkings = world.parkings || [];
  for (let i = 0; i < parkings.length; i++) {
    const pk = parkings[i];
    const minCx = Math.floor(pk.x / SURFACE_CELL_SIZE);
    const maxCx = Math.floor((pk.x + pk.width) / SURFACE_CELL_SIZE);
    const minCy = Math.floor(pk.y / SURFACE_CELL_SIZE);
    const maxCy = Math.floor((pk.y + pk.height) / SURFACE_CELL_SIZE);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        getOrCreateSurfaceCell(cx, cy).parkings.push(pk);
      }
    }
  }

  // Index Sidewalks
  const sidewalks = world.sidewalks || [];
  for (let i = 0; i < sidewalks.length; i++) {
    const sw = sidewalks[i];
    const minCx = Math.floor(sw.x / SURFACE_CELL_SIZE);
    const maxCx = Math.floor((sw.x + sw.width) / SURFACE_CELL_SIZE);
    const minCy = Math.floor(sw.y / SURFACE_CELL_SIZE);
    const maxCy = Math.floor((sw.y + sw.height) / SURFACE_CELL_SIZE);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        getOrCreateSurfaceCell(cx, cy).sidewalks.push(sw);
      }
    }
  }

  // Index Driveways
  const driveways = world.driveways || [];
  for (let i = 0; i < driveways.length; i++) {
    const dw = driveways[i];
    const minCx = Math.floor(dw.x / SURFACE_CELL_SIZE);
    const maxCx = Math.floor((dw.x + dw.width) / SURFACE_CELL_SIZE);
    const minCy = Math.floor(dw.y / SURFACE_CELL_SIZE);
    const maxCy = Math.floor((dw.y + dw.height) / SURFACE_CELL_SIZE);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        getOrCreateSurfaceCell(cx, cy).driveways.push(dw);
      }
    }
  }

  // Index Agricultural fields
  for (let i = 0; i < AGRICULTURAL_FIELDS.length; i++) {
    const f = AGRICULTURAL_FIELDS[i];
    const b = f.bounds;
    const minCx = Math.floor(b.x / SURFACE_CELL_SIZE);
    const maxCx = Math.floor((b.x + b.width) / SURFACE_CELL_SIZE);
    const minCy = Math.floor(b.y / SURFACE_CELL_SIZE);
    const maxCy = Math.floor((b.y + b.height) / SURFACE_CELL_SIZE);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        getOrCreateSurfaceCell(cx, cy).fields.push(f);
      }
    }
  }
}

export function getRoadsNearPoint(world: GameWorld, px: number, py: number): Road[] {
  ensureSurfaceSpatialIndex(world);
  const cx = Math.floor(px / SURFACE_CELL_SIZE);
  const cy = Math.floor(py / SURFACE_CELL_SIZE);
  const cell = surfaceSpatialGrid.get(getSurfaceGridKey(cx, cy));
  return cell ? cell.roads : (world.roads || []);
}

export function getSurfaceTypeAt(world: GameWorld, x: number, y: number): { type: string; grip: number; extraDrag: number } {
  // 0. Check River "Быстрица" and aquatic fluid bodies
  const riverWater = getRiverWaterAt(x, y);
  const isFreezing = isWorldFreezing(world);
  if (riverWater.inWater && !riverWater.isBridge) {
    if (isFreezing) {
      // Solid frozen northern river ice sheet: driftable glaze ice surface
      return {
        type: 'ice',
        grip: 0.12,
        extraDrag: 0.5
      };
    }
    const d = riverWater.depth;
    return {
      type: 'water',
      grip: Math.max(0.08, 0.44 - d * 0.24),
      extraDrag: 45 + d * 150
    };
  } else if (!riverWater.inWater && riverWater.surfaceType === 'river_mud') {
    return { type: isFreezing ? 'frozen_ground' : 'mud', grip: isFreezing ? 0.45 : 0.55, extraDrag: isFreezing ? 2 : 10 };
  } else if (!riverWater.inWater && riverWater.surfaceType === 'river_sand') {
    return { type: isFreezing ? 'frozen_sand' : 'sand', grip: isFreezing ? 0.50 : 0.68, extraDrag: isFreezing ? 1 : 5 };
  }

  ensureSurfaceSpatialIndex(world);
  const cx = Math.floor(x / SURFACE_CELL_SIZE);
  const cy = Math.floor(y / SURFACE_CELL_SIZE);
  const cell = surfaceSpatialGrid.get(getSurfaceGridKey(cx, cy));

  if (cell) {
    // 1. Check roads in this cell
    const roads = cell.roads;
    for (let i = 0; i < roads.length; i++) {
      const road = roads[i];
      const halfWidth = road.width / 2 + 6;

      const rMinX = road._minX ?? Math.min(road.x1, road.x2);
      const rMaxX = road._maxX ?? Math.max(road.x1, road.x2);
      const rMinY = road._minY ?? Math.min(road.y1, road.y2);
      const rMaxY = road._maxY ?? Math.max(road.y1, road.y2);

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

    // 2. Check intersections in this cell
    const intersections = cell.intersections;
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

    // 3. Check roundabouts in this cell
    const roundabouts = cell.roundabouts;
    for (let i = 0; i < roundabouts.length; i++) {
      const rb = roundabouts[i];
      const dx = x - rb.x;
      const dy = y - rb.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= rb.radius && dist >= rb.innerRadius) {
        return { type: 'asphalt', grip: 1.00, extraDrag: 0 };
      }
    }

    // 4. Check parking areas & sidewalks & driveways in this cell
    const parkings = cell.parkings;
    for (let i = 0; i < parkings.length; i++) {
      const pk = parkings[i];
      if (x >= pk.x && x <= pk.x + pk.width && y >= pk.y && y <= pk.y + pk.height) {
        return { type: 'concrete', grip: 0.98, extraDrag: 0 };
      }
    }

    const sidewalks = cell.sidewalks;
    for (let i = 0; i < sidewalks.length; i++) {
      const sw = sidewalks[i];
      if (x >= sw.x && x <= sw.x + sw.width && y >= sw.y && y <= sw.y + sw.height) {
        return { type: 'concrete', grip: 0.98, extraDrag: 1 };
      }
    }

    const driveways = cell.driveways;
    for (let i = 0; i < driveways.length; i++) {
      const dw = driveways[i];
      if (x >= dw.x && x <= dw.x + dw.width && y >= dw.y && y <= dw.y + dw.height) {
        return { type: 'concrete', grip: 0.98, extraDrag: 0 };
      }
    }

    // 5. Check Agricultural Fields in this cell
    const fields = cell.fields;
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const b = f.bounds;
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
        if (f.type === 'plowed') {
          return { type: 'dirt_road', grip: 0.50, extraDrag: 36 };
        } else if (f.type === 'wheat') {
          return { type: 'grass', grip: 0.58, extraDrag: 24 };
        } else if (f.type === 'clover') {
          return { type: 'grass', grip: 0.60, extraDrag: 20 };
        } else if (f.type === 'sunflower') {
          return { type: 'dirt_road', grip: 0.54, extraDrag: 28 };
        } else if (f.type === 'pasture') {
          return { type: 'grass', grip: 0.58, extraDrag: 20 };
        }
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

export function getSurfaceOffroadProps(surfType: string, isWet: boolean, isStormWeather: boolean, isSnowy: boolean = false) {
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
      bermColor = isSnowy ? '#cbd5e1' : '#3a200f';
      grooveColor = isSnowy ? '#334155' : '#150c05';
      break;
    case 'dirt_road':
      isOffroad = true;
      baseSink = isSnowy ? 0.45 : (isWet ? (isStormWeather ? 0.85 : 0.65) : 0.10);
      wetExtraDrag = isSnowy ? 25 : (isWet ? (isStormWeather ? 55 : 38) : 2);
      wetGripMult = isSnowy ? 0.50 : (isWet ? 0.55 : 0.98);
      bermColor = isSnowy ? '#e2e8f0' : (isWet ? '#442614' : '#6e4726');
      grooveColor = isSnowy ? '#475569' : (isWet ? '#1c1007' : '#3d2514');
      break;
    case 'grass':
      isOffroad = true;
      baseSink = isSnowy ? 0.55 : (isWet ? (isStormWeather ? 0.70 : 0.52) : 0.24);
      wetExtraDrag = isSnowy ? 32 : (isWet ? (isStormWeather ? 48 : 34) : 9);
      wetGripMult = isSnowy ? 0.45 : (isWet ? 0.52 : 0.92);
      bermColor = isSnowy ? '#f1f5f9' : (isWet ? '#2f3b1b' : '#3f5922');
      grooveColor = isSnowy ? '#cbd5e1' : (isWet ? '#1b1f0e' : '#1e3810');
      break;
    case 'sand':
      isOffroad = true;
      baseSink = isWet ? 0.72 : 0.58;
      wetExtraDrag = isWet ? 42 : 24;
      wetGripMult = isWet ? 0.60 : 0.85;
      bermColor = isSnowy ? '#f1f5f9' : (isWet ? '#78350f' : '#b45309');
      grooveColor = isSnowy ? '#94a3b8' : (isWet ? '#451a03' : '#78350f');
      break;
    case 'gravel_road':
      isOffroad = true;
      baseSink = isSnowy ? 0.25 : (isWet ? 0.22 : 0.06);
      wetExtraDrag = isSnowy ? 18 : (isWet ? 12 : 2);
      wetGripMult = isSnowy ? 0.60 : (isWet ? 0.78 : 0.98);
      bermColor = isSnowy ? '#e2e8f0' : '#64748b';
      grooveColor = isSnowy ? '#94a3b8' : '#334155';
      break;
    case 'rock':
      baseSink = 0.05;
      wetExtraDrag = 2;
      wetGripMult = isSnowy ? 0.45 : (isWet ? 0.80 : 1.0);
      bermColor = isSnowy ? '#e2e8f0' : '#78716c';
      grooveColor = isSnowy ? '#64748b' : '#44403c';
      break;
    default: // asphalt, concrete
      baseSink = 0.0;
      wetExtraDrag = 0;
      wetGripMult = isSnowy ? 0.40 : (isWet ? 0.65 : 1.0);
      bermColor = isSnowy ? '#cbd5e1' : '#1e293b';
      grooveColor = isSnowy ? '#475569' : '#0f172a';
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
  sanitizeVehicleKinematics(vehicle);
  const prevAngularVelocity = vehicle.angularVelocity;
  // Update turn signal timer
  if (vehicle.turnSignal !== 'none') {
    vehicle.turnSignalTimer = (vehicle.turnSignalTimer || 0) + dt;
  } else {
    vehicle.turnSignalTimer = 0;
  }

  // Update headlight thermal inertia / fade state
  getVehicleHeadlightDynamicState(vehicle, dt);

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
    const isSliding = Math.abs(vehicle.lateralVelocity || 0) > 12.0 || (input.handbrake && currentSpeedKmh > 6.0);

    // Front axle lateral velocity and motion angle relative to vehicle heading (Caster & Slip Angle)
    // Front axle is offset by wheelbase along heading; yaw rotation adds angular velocity * wheelbase
    const steerWheelBase = cfg.wheelBase || 40;
    const frontAxleLatVel = (vehicle.lateralVelocity || 0) + (vehicle.angularVelocity || 0) * steerWheelBase;
    const vForward = Math.max(8.0, Math.abs(vehicle.speed));
    const frontMotionAngle = (Math.abs(vehicle.speed) > 2.0)
      ? Math.atan2(frontAxleLatVel, vForward) * Math.sign(vehicle.speed || 1)
      : 0;

    // Determine if the player is actively counter-steering to catch a slide:
    // In our coordinate system:
    // - angularVelocity > 0: vehicle is yawing CLOCKWISE (nose right, tail stepping out to the left).
    //   Counter-steering requires steering LEFT (input.left / steeringAxis < -0.05).
    // - angularVelocity < 0: vehicle is yawing COUNTER-CLOCKWISE (nose left, tail stepping out to the right).
    //   Counter-steering requires steering RIGHT (input.right / steeringAxis > 0.05).
    // Normal corner turn-in has steer and yaw in the SAME direction and is NEVER counter-steering!
    const yawVel = vehicle.angularVelocity || 0;
    const hasAnalogSteer = typeof input.steeringAxis === 'number' && Math.abs(input.steeringAxis) > 0.005;
    let steerInputDir = 0;
    if (hasAnalogSteer) {
      if (input.steeringAxis! < -0.05) steerInputDir = -1;
      else if (input.steeringAxis! > 0.05) steerInputDir = 1;
    } else if (input.left) {
      steerInputDir = -1;
    } else if (input.right) {
      steerInputDir = 1;
    }

    const isCounterSteerLeft = isSliding && yawVel > 0.25 && steerInputDir < 0;
    const isCounterSteerRight = isSliding && yawVel < -0.25 && steerInputDir > 0;
    const isCounterSteeringForLimit = isCounterSteerLeft || isCounterSteerRight;

    // 1. Physical Steering Rack Limit: full lock authority for drifts, scandinavian flicks, and tight slides
    // High-speed natural hydraulic damping provides smooth steering weight at top speed without blocking lock
    const highSpeedDamp = Math.max(0.68, 1.0 - Math.pow(speedRatio, 1.25) * 0.32);
    const dynamicMaxSteer = isCounterSteeringForLimit
      ? cfg.maxSteerAngle 
      : cfg.maxSteerAngle * highSpeedDamp;

    // 2. Physical Steering Rack Speed (Steering Weight & Lack of Power Steering)
    // Without power steering (ГУР), turning wheels on the spot (0 km/h) is physically exhausting and slow.
    // As the car rolls, steering gets lighter.
    // If the player is counter-steering to catch a slide, we boost steering speed heavily to mimic caster self-alignment!
    let desiredSteer = vehicle.steerAngle; // Default stay

    let targetDesiredSteerTemp = 0;
    if (hasAnalogSteer) {
      const clampedAxis = Math.max(-1.0, Math.min(1.0, input.steeringAxis!));
      targetDesiredSteerTemp = clampedAxis * dynamicMaxSteer;
    } else if (input.left) {
      targetDesiredSteerTemp = -dynamicMaxSteer;
    } else if (input.right) {
      targetDesiredSteerTemp = dynamicMaxSteer;
    }

    const isCounterSteering = isCounterSteeringForLimit;
    const isFightingCaster = isSliding && (
      (steerInputDir > 0 && yawVel > 0.6) ||
      (steerInputDir < 0 && yawVel < -0.6)
    );

    const isArticulatedMachinery = vehicle.type === 'roller_heavy_tandem' || 
                                    vehicle.type === 'roller_compact_sidewalk' || 
                                    vehicle.type === 'roller_pneumatic';

    const isPerformanceCar = ['sports', 'supercar', 'muscle', 'muscle_classic', 'coupe_gt', 'hatch_hot', 'sedan_classic'].includes(cfg.type);
    const steerRateMultiplier = isCounterSteering ? 2.6 : (isFightingCaster ? 0.65 : 1.0);
    let steerRate = cfg.turnSpeed * (isArticulatedMachinery ? 0.90 : (isPerformanceCar ? 1.05 : 0.65)) * steerRateMultiplier; 
    if (currentSpeedKmh < 10.0 && !isArticulatedMachinery) {
      // Standstill steering weight (hydraulic/electric power steering keeps sports cars responsive)
      const standstillFactor = isPerformanceCar ? 0.75 : (0.4 + (currentSpeedKmh / 10.0) * 0.6);
      steerRate *= standstillFactor;
    } else if (!isCounterSteering && !isArticulatedMachinery) {
      // Natural high-speed steering resistance and hydraulic caster centering
      const speedDampFactor = isPerformanceCar ? 0.35 : 0.65;
      steerRate *= Math.max(0.55, 1.0 - speedRatio * speedDampFactor);
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
      // 3. Physical Caster Trail & Self-Aligning Torque (SAT / Самовозврат и контр-руление)
      // Runs ONLY when the steering input is neutral: the same caster loop running
      // while the player is actively steering would race the steering rack and
      // collapse the steer angle back to zero, making the car impossible to steer.
      // When hands are off the wheel or steering is neutral, caster smoothly pulls the front wheels back to center (0).
      // During a deep power drift or slide (isDriftActive), dynamic caster helps maintain counter-steering smoothly without oscillation.
      if (!isArticulatedMachinery) {
        const isTrueDrift = vehicle.isDrifting && currentSpeedKmh > 15.0 && Math.abs(vehicle.lateralVelocity || 0) > 28.0;
        let casterTarget = 0;
        if (isTrueDrift) {
          // Counter-steer caster aligns gently with the front motion angle, clamped and damped (gain <= 0.65 to guarantee asymptotic stability)
          const clampedMotionAngle = Math.max(-dynamicMaxSteer * 0.70, Math.min(dynamicMaxSteer * 0.70, frontMotionAngle * 0.60));
          casterTarget = clampedMotionAngle;
        }

        const centerRate = steerRate * 1.35 * Math.max(0.35, Math.min(1.0, currentSpeedKmh / 15.0));
        const delta = casterTarget - vehicle.steerAngle;
        if (Math.abs(delta) > 0.002) {
          const step = Math.sign(delta) * Math.min(Math.abs(delta), centerRate * dt);
          vehicle.steerAngle += step;
        } else {
          vehicle.steerAngle = casterTarget;
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
    // engineAccel — только тяга/торможение двигателем (НЕ тормоза, НЕ сопротивление
    // и НЕ уклон: они приходят в пятна контакта отдельными силами). Раньше сюда
    // складывалось всё сразу, а потом ещё раз применялось через шины и кузов —
    // силы считались дважды, и машина «клевала»/дрожала при торможении.
    let engineAccel = 0;
    // Требуемое замедление от рабочего тормоза и ручника (в px/s²). Превращается
    // в силы на колёсах позже, где ограничивается сцеплением и не может
    // развернуть колесо через ноль.
    let brakeAccelDemand = 0;
    let handbrakeAccelDemand = 0;
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

      // --- Powertrain Variant: engine-specific RPM bands (motor + firmware + governor) ---
      if (eng.idleRPM !== undefined) {
        idleRPM = eng.idleRPM;
      }
      if (eng.redlineRPM !== undefined) {
        redlineRPM = Math.max(idleRPM + 600, eng.redlineRPM);
      }
      if (eng.maxRPMLimit !== undefined) {
        maxRPM = Math.max(redlineRPM + 100, eng.maxRPMLimit);
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
          // CVT: continuously variable belt — no stepped shifts at all (pulley ratio varies)
          if (eng.transmissionKind === 'CVT') {
            eng.shiftCooldown = 0;
            // keep virtual first gear; ratio behavior handled in RPM coupling below
          } else if (eng.engineRunning && eng.shiftCooldown <= 0) {
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
              // DSG dual-clutch: nearly instant; AMT robot: slow and jerky; classic AT: torque-converter pace
              eng.shiftCooldown = eng.transmissionKind === 'DSG' ? 0.11 : eng.transmissionKind === 'AMT' ? 0.8 : 0.35;
              sound.playGearShift();
              if (eng.transmissionKind === 'AMT') {
                vehicle.speed *= 0.86; // characteristic robotized "clunk" jolt on engagement
              }
            } else if (eng.engineRPM < downshiftRPM && eng.currentGear > 1) {
              eng.currentGear--;
              eng.shiftCooldown = eng.transmissionKind === 'DSG' ? 0.11 : eng.transmissionKind === 'AMT' ? 0.8 : 0.35;
              sound.playGearShift();
              if (eng.transmissionKind === 'AMT') {
                vehicle.speed *= 0.88;
              }
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

        // Game setting "КПП: Авто" — manual gearbox shifts by itself for the player,
        // exactly like a proper automatic: early up, low-rpm down, with a cooldown
        if (playerAutoShiftPref === 'auto' && eng.engineRunning && eng.currentGear !== -1
            && (vehicle.isPlayerControlled || (player && (player.currentVehicleId === vehicle.id || player.vehicleId === vehicle.id)))) {
          const maxFwdGear = (eng.gearRatios?.length || 7) - 2;
          const autoT = ((eng as any)._autoShiftTimer || 0) - dt;
          if (autoT > 0) {
            (eng as any)._autoShiftTimer = autoT;
          } else if (eng.shiftCooldown <= 0 && eng.engineRPM > redlineRPM * 0.94 && eng.currentGear >= 1 && eng.currentGear < maxFwdGear) {
            eng.currentGear++;
            eng.shiftCooldown = 0.45;
            (eng as any)._autoShiftTimer = 0.7;
            sound.playGearShift();
          } else if (eng.shiftCooldown <= 0 && eng.engineRPM < redlineRPM * 0.30 && eng.currentGear > 1) {
            eng.currentGear--;
            eng.shiftCooldown = 0.45;
            (eng as any)._autoShiftTimer = 0.7;
            sound.playGearShift();
          }
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

        // Final drive (главная пара) from powertrain variants: legacy cars without
        // a variant transmissionKind keep historical behavior anchored at 3.9
        const isLegacyPowertrain = eng.transmissionKind === undefined;
        const fd = isLegacyPowertrain ? 3.9 : Math.max(2.0, eng.finalDriveRatio || 3.9);
        const fdAccel = fd / 3.9;   // short pair multiplies wheel torque
        const fdSpeed = 3.9 / fd;    // ... and lowers speed at redline per gear

        let currentGearRatio = eng.gearRatios[eng.currentGear + 1] !== undefined ? eng.gearRatios[eng.currentGear + 1] : 0;
        
        // Apply Transfer Case LOW multiplier
        if (eng.hasTransferCase && eng.transferCaseMode === 'LOW') {
          currentGearRatio *= 3.0;
        }

        const gearRatio = Math.abs(currentGearRatio);
        const v_speed = Math.abs(vehicle.speed);
        
        // Variant top-speed factors: tire speed rating + power reserve (powerPw)
        const pwTopSpeedMult = (eng.tireTopSpeedMult ?? 1) * Math.pow(Math.max(0.5, eng.powerMult ?? 1), 0.35);
        const maxSpeedPx = (cfg.maxSpeed || 150) * pwTopSpeedMult * SPEED_KMH_TO_PX_S;
        const reverseMaxSpeedPx = (cfg.reverseMaxSpeed || 35) * SPEED_KMH_TO_PX_S;

        // Speed corresponding to redline in current gear
        let speedAtRedline = maxSpeedPx;
        if (eng.currentGear === -1) {
          speedAtRedline = reverseMaxSpeedPx;
        } else if (eng.currentGear > 0 && gearRatio > 0) {
          speedAtRedline = maxSpeedPx * (topGearRatio / Math.max(0.2, gearRatio)) * fdSpeed;
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

        // Powertrain variant response: flywheel inertia / sport cams / ECU map
        if (eng.rpmResponseMult !== undefined && eng.rpmResponseMult !== 1.0) {
          const resp = eng.rpmResponseMult;
          rpmRiseRate *= resp;
          rpmDecayRate *= Math.max(0.45, 0.9 + (resp - 1.0) * 0.55);
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
          } else if (eng.transmissionKind === 'CVT' && eng.transmissionType === 'AUTO') {
            // Belt CVT: engine stays pinned in its power band while the pulley ratio
            // varies continuously with speed. No stepped gears, no shift shock.
            const cvtThrottle = eng.isDieselRunaway ? 1.0 : effectiveThrottle;
            const cvtTargetRPM = idleRPM + (redlineRPM - idleRPM) * (0.16 + cvtThrottle * 0.52);
            coupledRPM = Math.max(Math.min(wheelDrivenRPM, cvtTargetRPM), idleRPM + 120);
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
        
        // Apply Chip Tuning torque boost (+15% torque) — only for legacy non-variant vehicles
        if (vehicle.hasChiptuning && eng.chipLevel === undefined) {
          T_factor *= 1.15;
        }

        // --- Powertrain variant: engine & firmware base torque ---
        if (eng.powerMult !== undefined) {
          T_factor *= eng.powerMult;
        }

        // --- Turbocharger / supercharger boost dynamics (spool-up & lag) ---
        if (eng.turboSpec && eng.turboSpec.boostMax > 0) {
          const spec = eng.turboSpec;
          const loadThrottle = eng.isDieselRunaway ? 1.0 : effectiveThrottle;
          const rpmReady = Math.min(1.0, Math.max(0, (eng.engineRPM - spec.spoolRPM) / Math.max(500, spec.spoolRPM * 0.55)));
          const boostTarget = loadThrottle > 0.05 ? spec.boostMax * rpmReady : 0;
          const prevBoost = eng.turboBoost ?? 0;
          eng.turboBoost = Math.max(0, prevBoost + (boostTarget - prevBoost) * Math.min(1.0, spec.lagRate * dt));
          // Forced induction multiplies available torque (+ extra heat load)
          T_factor *= 1 + eng.turboBoost;
          if (eng.turboBoost > 0.02) {
            eng.temperature = Math.min(145, (eng.temperature ?? 85) + eng.turboBoost * (spec.isSupercharged ? 1.5 : 3.0) * dt);
          }
        }

        // --- Firmware knock risk at high sustained load (маловатый октан + агрессивные углы) ---
        if ((eng.knockRisk ?? 0) > 0 && effectiveThrottle > 0.5 && eng.engineRPM > idleRPM + (redlineRPM - idleRPM) * 0.7
            && Math.random() < (eng.knockRisk ?? 0) * 0.5 * dt) {
          eng.engineKnocking = true;
          T_factor *= 0.85;
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
          // Direct mechanical ratio scaling with a raised floor so top gears
          // (4-10-speed boxes) keep meaningful thrust for real top speed
          gearAccelMult = 0.45 + 0.65 * Math.pow(ratioFraction, 0.9);
        }

        // Transfer case / Tractor range low-gear reduction (пониженная передача)
        if (eng.hasTransferCase && eng.transferCaseMode === 'LOW') {
          gearAccelMult *= 2.5; // 2.5x torque multiplier in LOW range!
        }
        if (eng.tractorRange === 1) {
          gearAccelMult *= 2.8; // 2.8x torque multiplier in Tractor Low Range!
        }

        // Final drive torque scaling (short pair = more wheel thrust, long pair = less)
        gearAccelMult *= fdAccel;

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
          // 2. Sub-Octane Fuel (generalized: engine/firmware minimum octane requirement)
          const reqOctane = (eng.minOctaneRequirement !== undefined)
            ? eng.minOctaneRequirement
            : ((vehicle.requiredFuel as string) === 'ai98' ? 98
              : (vehicle.requiredFuel as string) === 'ai100' ? 100
              : vehicle.requiredFuel === 'ai95' ? 95
              : vehicle.requiredFuel === 'ai92' ? 92 : 0);
          const tankOctane = fuel.octaneNumber;
          if (reqOctane > 0 && tankOctane > 0 && tankOctane < reqOctane) {
            const octaneDeficit = Math.min(8, reqOctane - tankOctane);
            fuelFactor *= Math.max(0.45, 1.0 - octaneDeficit * 0.06);
            const knockChance = (0.02 + 0.05 * (eng.knockRisk ?? 0.15)) * dt;
            if (throttle > 0.7 && Math.random() < knockChance) {
              eng.temperature += 4 + octaneDeficit;
              eng.engineKnocking = true;
              vehicle.speed *= 0.965;
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
          // Automatic transmission creep in D/R: только если машина уже катится.
          // Крол с полного нуля давал «стоящие» машины, которые сами уезжали
          // и дёргались на месте.
          if (eng.transmissionType === 'AUTO'&& brake === 0 && throttle === 0 && Math.abs(vehicle.speed) > 0.6 && Math.abs(vehicle.speed) * PX_S_TO_SPEED_KMH < 5.8) {
            effectiveThrottle = 0.16;
          }
          if (eng.isDieselRunaway) {
            effectiveThrottle = 1.0;
          }

          if (effectiveThrottle > 0) {
            // Engine power drops off smoothly as vehicle approaches top speed for current gear
            // (fade only in the final ~5% of the gear's speed range, so usable speed stays close to redline)
            const headroom = Math.max(6, gearMaxSpeedPx * 0.045);
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
            driveAccel = (cfg.acceleration || 30) * speedScaleFactor * gearAccelMult * T_factor * fuelFactor * effectiveThrottle * clutchGrip * speedCapFactor * (eng.transmissionEfficiency ?? 0.97);
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
        // Engine-off in-gear mechanical compression drag (holding car on slope or coasting)
        const inGear = eng.currentGear !== 0 && (!eng.autoGearMode || (eng.autoGearMode !== 'N' && eng.autoGearMode !== 'P'));
        const clutchEngaged = (eng.clutchPedal ?? 1.0) > 0.45;
        if (inGear && clutchEngaged && Math.abs(vehicle.speed) > 0.3) {
          const compBrake = 180.0 * (SPEED_KMH_TO_PX_S / 2.7778) * (eng.clutchPedal ?? 1.0);
          engineAccel -= Math.sign(vehicle.speed) * compBrake;
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

    const curCal = world.calendar || createInitialCalendarState(2026, 10, 8, typeof world.timeHour === 'number' ? world.timeHour : 12);
    const curAtmo = calculateClimateAtmosphere(curCal, world.weather || 'clear');
    const isFreezingAtStart = curAtmo.isFreezing || curAtmo.surfaceTemp <= 0;
    const isSnowCoveredAtStart = curAtmo.isSnowCovered;
    const isRainingWeather = world.weather === 'rain' || world.weather === 'storm' || world.weather === 'drizzle';
    const isStormWeather = world.weather === 'storm' || world.weather === 'blizzard';
    const isSnowyWeather = world.weather === 'snow' || world.weather === 'blizzard' || isSnowCoveredAtStart;

    const isOffroaderVeh = ['offroad_hardcore', 'suv', 'suv_luxury', 'suv_classic_box', 'pickup', 'pickup_heavy', 'tractor_mtz82', 'tractor_mtz80', 'tractor_mtz80_old', 'truck_armored', 'truck_dump'].includes(cfg.type);
    const isLowClearanceVeh = ['supercar', 'sports', 'coupe_gt', 'hatch_hot', 'micro_car', 'retro_bubble', 'sedan_compact', 'moto_sport'].includes(cfg.type);
    const clearanceFactor = isOffroaderVeh ? 0.50 : (isLowClearanceVeh ? 1.85 : 1.0);

    const frontOffroad = getSurfaceOffroadProps(frontSurf.type, isRainingWeather, isStormWeather, isSnowyWeather);
    const rearOffroad = getSurfaceOffroadProps(rearSurf.type, isRainingWeather, isStormWeather, isSnowyWeather);

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

      // Surface adhesion and weather grip limit calculation
      const centerSurf = getSurfaceTypeAt(world, vehicle.x, vehicle.y);
      const isFreezingAtBrake = curAtmo.isFreezing || curAtmo.surfaceTemp <= 0;
      const isSnowCoveredAtBrake = curAtmo.isSnowCovered;

      const localWeatherWeights = getEffectiveWeatherWeights(world, isFreezingAtBrake);
      let localWeatherGrip = localWeatherWeights.effectiveGrip;
      if (isSnowCoveredAtBrake) localWeatherGrip = Math.min(localWeatherGrip, 0.36);
      else if (isFreezingAtBrake && curAtmo.surfaceTemp <= 0) localWeatherGrip = Math.min(localWeatherGrip, 0.45);

      const surfaceAdhesion = localWeatherGrip * centerSurf.grip;
      const maxAdhesionBrake = cfg.brakingForce * speedScaleFactor * surfaceAdhesion;

      // Modern ABS electronically pulses brakes right at peak adhesion limit
      const hasABS = ['supercar', 'sports', 'coupe_gt', 'sedan_luxury', 'suv_luxury', 'crossover_compact', 'wagon_modern', 'sedan_polo'].includes(cfg.type);

      if (bForce > maxAdhesionBrake * 1.02 && Math.abs(vehicle.speed) > 2.0) {
        if (hasABS) {
          vehicle.isBrakeLocked = false;
          vehicle.absActive = true;
          bForce = maxAdhesionBrake * 0.95;
        } else {
          // Classic hydraulic brakes without ABS lock the wheels ("юз")!
          vehicle.isBrakeLocked = true;
          vehicle.absActive = false;
          // Kinetic sliding friction is lower than peak static grip
          bForce = maxAdhesionBrake * 0.82;
        }
      } else {
        vehicle.isBrakeLocked = false;
        vehicle.absActive = false;
      }
      
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
      // Natural rolling resistance, cold transmission viscous drag (-30°C frost) and aerodynamic drag (v^2)
      // Note: Handbrake strictly applies physical braking torque to the REAR contact patches (fBrakeRL/fBrakeRR),
      // where it authentically locks the rear tires and reduces lateral grip.
      // It does NOT apply artificial linear deceleration to engineAccel!
      const vAbs = Math.abs(vehicle.speed);
      const tireRollingMult = eng?.tireRollingMult ?? 1.0;
      let rollingResistance = (3.0 + vAbs * 0.008) * tireRollingMult;
      
      // Cold gear oil / ATF viscosity drag (< 15°C)
      const transTemp = eng?.transmissionTemp ?? 20;
      if (transTemp < 15) {
        const coldViscousDrag = Math.min(18.0, (15 - transTemp) * 0.55);
        rollingResistance += coldViscousDrag;
      }

      if (extraDrag > 0) {
        rollingResistance += extraDrag * (0.55 + 0.45 * tireRollingMult);
      }
      
      let aeroCoeff = 0.000045;
      if (['truck_box', 'truck_dump', 'truck_zil_dump', 'truck_semi', 'truck_tanker', 'truck_water', 'truck_flatbed', 'truck_covered', 'cement_mixer', 'garbage_truck', 'bus', 'delivery_truck', 'truck_tow', 'fire_engine', 'fire_ladder', 'fire_rescue', 'pickup_heavy', 'truck_armored'].includes(cfg.type)) {
        aeroCoeff = 0.000085;
      } else if (cfg.type.startsWith('tractor_') || ['suv', 'suv_luxury', 'offroad_hardcore', 'suv_classic_box', 'van', 'van_camper', 'van_cargo_old'].includes(cfg.type)) {
        aeroCoeff = 0.000065;
      } else if (['supercar', 'sports', 'coupe_gt', 'hatch_hot', 'moto_sport'].includes(cfg.type)) {
        aeroCoeff = 0.000032;
      }
      
      const aeroDrag = aeroCoeff * vAbs * vAbs;
      const totalDrag = rollingResistance + aeroDrag;

      const isEngineActive = eng ? (eng.engineRunning || eng.isDieselRunaway) : false;
      const activeThrottle = isEngineActive ? throttle : 0;

      // Parking brake holds stationary vehicle (parking on hill or standstill)
      if (isHandbraking && vAbs * PX_S_TO_SPEED_KMH < 2.0 && activeThrottle === 0) {
        vehicle.speed = 0;
        engineAccel = 0;
      } else if (vAbs > 1) {
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
      } else if (activeThrottle === 0 && (!eng || eng.transmissionType !== 'AUTO'|| eng.autoGearMode === 'P'|| eng.autoGearMode === 'N' || !isEngineActive)) {
        vehicle.speed = 0;
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

    // Slope calculation for physical rigid-body gravity forces (applied in chassis force summation)
    const slope = getTerrainSlope(vehicle.x, vehicle.y);

    // Apply engine acceleration
    vehicle.speed += engineAccel * dt;

    const maxSpeedPx = cfg.maxSpeed * SPEED_KMH_TO_PX_S;
    const reverseMaxSpeedPx = cfg.reverseMaxSpeed * SPEED_KMH_TO_PX_S;

    // Hard speed limits
    if (vehicle.speed > maxSpeedPx) vehicle.speed = maxSpeedPx;
    if (vehicle.speed < -reverseMaxSpeedPx) vehicle.speed = -reverseMaxSpeedPx;
    const isEngineActiveForStop = eng ? (eng.engineRunning || eng.isDieselRunaway) : false;
    const activeForward = isEngineActiveForStop && input.forward;
    const activeBackward = isEngineActiveForStop && input.backward;
    if (Math.abs(vehicle.speed) * PX_S_TO_SPEED_KMH < 0.7 && !activeForward && !activeBackward) {
      vehicle.speed = 0;
    }

    // --- FIRST-PRINCIPLES 4-WHEEL DYNAMICS & PACEJKA BRUSH TIRE SIMULATION ---
    const { rearAxleDist: geomRearAxleDist, wheelBase: geomWheelBase } = getVehicleAxleGeometry(vehicle);
    const wheelBase = Math.max(16, geomWheelBase);
    const isSoloMoto = cfg.type.startsWith('moto_') || cfg.type === 'moped_soviet';
    const halfTrack = isSoloMoto ? 0 : Math.max(3.5, (cfg.width || 20) * 0.42);
    const trackWidth = halfTrack * 2;
    const baseTireWidth = (cfg.width || 20) * 0.16 + 2.0;

    const isArticulated = vehicle.type === 'roller_heavy_tandem' || 
                          vehicle.type === 'roller_compact_sidewalk' || 
                          vehicle.type === 'roller_pneumatic';

    // Mass properties & Moments of Inertia (includes powertrain variant hard-parts mass)
    const totalMass = Math.max(300, ((cfg.mass || 1400) + (vehicle.massBonusKg || 0)) * massRatio);
    const fallbackIz = (totalMass / 12) * ((cfg.length || 45) ** 2 + (cfg.width || 20) ** 2) * 1.15;
    // Инерция берётся из реальной массы узлов сетки (включая ступицы колёс),
    // а не из прямоугольника. Так кузов с тяжёлым двигателем спереди и
    // облегчённой кормой поворачивается иначе, чем однородная плита.
    const nbSystem = vehicle.damage?.nodeBeam;
    const nodeInertia = nbSystem?.nodeInertia;
    const nodeMass = nbSystem?.totalNodeMass;
    const inertiaScale = nodeMass && nodeMass > 1 ? totalMass / nodeMass : 1;
    let Iz = fallbackIz;
    if (typeof nodeInertia === 'number' && Number.isFinite(nodeInertia) && nodeInertia > 1e-3) {
      const candidate = nodeInertia * inertiaScale * 1.05;
      // Защита от вырожденной/повреждённой сетки: инерция не должна уходить
      // на порядки от физически разумного прямоугольника.
      if (candidate > fallbackIz * 0.45 && candidate < fallbackIz * 2.2) {
        Iz = candidate;
      }
    }

    // Center of gravity distances to axles (52% front, 48% rear)
    const Lf = wheelBase * 0.52;
    const Lr = wheelBase * 0.48;

    // Current vehicle orientation and velocity vectors
    const curAngle = vehicle.angle;
    // cosA/sinA/vLong/vLat are refreshed on every tire sub-step (see TIRE SUB-STEPPING below)
    let cosA = Math.cos(curAngle);
    let sinA = Math.sin(curAngle);

    // Physical continuous velocities in world space (preserving ballistic momentum & collision impulses)
    let curVx = Number.isFinite(vehicle.vx) ? vehicle.vx : cosA * (vehicle.speed || 0);
    let curVy = Number.isFinite(vehicle.vy) ? vehicle.vy : sinA * (vehicle.speed || 0);
    let curYaw = Number.isFinite(vehicle.angularVelocity) ? vehicle.angularVelocity : 0;

    // Body coordinate velocities: vLong (+ forward, - reverse), vLat (+ right, - left)
    let vLong = curVx * cosA + curVy * sinA;
    let vLat = -curVx * sinA + curVy * cosA;

    // --- 1. DYNAMIC 3D WEIGHT TRANSFER (PACEJKA NORMAL LOAD Fz ON 4 WHEELS) ---
    const g_acc = 580.0; // px/s^2 equivalent to ~9.81 m/s^2 in world scale
    const hCg = 6.2;     // effective Center of Gravity height in pixels
    const Fz_f0 = totalMass * g_acc * (Lr / wheelBase) * 0.5;
    const Fz_r0 = totalMass * g_acc * (Lf / wheelBase) * 0.5;

    // Body accelerations for weight transfer
    const aLongEst = engineAccel;
    const aLatEst = vLong * curYaw;

    const dFz_long = totalMass * aLongEst * (hCg / wheelBase);
    const dFz_lat_f = isSoloMoto ? 0 : totalMass * aLatEst * (hCg / Math.max(8, trackWidth)) * (Lr / wheelBase);
    const dFz_lat_r = isSoloMoto ? 0 : totalMass * aLatEst * (hCg / Math.max(8, trackWidth)) * (Lf / wheelBase);

    // 4 individual wheel normal loads (clamped to prevent negative unweighting)
    const Fz_FL = Math.max(Fz_f0 * 0.06, Fz_f0 - dFz_long * 0.5 - dFz_lat_f);
    const Fz_FR = Math.max(Fz_f0 * 0.06, Fz_f0 - dFz_long * 0.5 + dFz_lat_f);
    const Fz_RL = Math.max(Fz_r0 * 0.06, Fz_r0 + dFz_long * 0.5 - dFz_lat_r);
    const Fz_RR = Math.max(Fz_r0 * 0.06, Fz_r0 + dFz_long * 0.5 + dFz_lat_r);

    // --- 2. 4-WHEEL CONTACT PATCH WORLD COORDINATES ---
    const tFLX = vehicle.x + cosA * Lf - sinA * (-halfTrack);
    const tFLY = vehicle.y + sinA * Lf + cosA * (-halfTrack);
    const tFRX = isSoloMoto ? (vehicle.x + cosA * Lf) : (vehicle.x + cosA * Lf - sinA * halfTrack);
    const tFRY = isSoloMoto ? (vehicle.y + sinA * Lf) : (vehicle.y + sinA * Lf + cosA * halfTrack);

    const tRLX = vehicle.x - cosA * Lr - sinA * (-halfTrack);
    const tRLY = vehicle.y - sinA * Lr + cosA * (-halfTrack);
    const tRRX = isSoloMoto ? (vehicle.x - cosA * Lr) : (vehicle.x - cosA * Lr - sinA * halfTrack);
    const tRRY = isSoloMoto ? (vehicle.y - sinA * Lr) : (vehicle.y - sinA * Lr + cosA * halfTrack);

    // Surface & Weather grip calculations
    const isFreezing = curAtmo.isFreezing || curAtmo.surfaceTemp <= 0;
    const isSnowCovered = curAtmo.isSnowCovered;

    const weatherWeights = getEffectiveWeatherWeights(world, isFreezing);
    let weatherGrip = weatherWeights.effectiveGrip;
    let isWetSurface = weatherWeights.isWetSurface;
    let isSnowySurface = weatherWeights.snow > 0.1 || weatherWeights.blizzard > 0.1;
    let isIcySurface = (isFreezing && isWetSurface) || weatherWeights.blizzard > 0.2;

    if (isSnowCovered) {
      weatherGrip = Math.min(weatherGrip, 0.36);
      isSnowySurface = true;
    } else if (isFreezing && curAtmo.surfaceTemp <= 0) {
      weatherGrip = Math.min(weatherGrip, 0.45);
      isIcySurface = true;
    }

    // Sample terrain surface under EACH individual wheel
    const surfFL = getSurfaceTypeAt(world, tFLX, tFLY);
    const surfFR = getSurfaceTypeAt(world, tFRX, tFRY);
    const surfRL = getSurfaceTypeAt(world, tRLX, tRLY);
    const surfRR = getSurfaceTypeAt(world, tRRX, tRRY);

    const offroadFL = getSurfaceOffroadProps(surfFL.type, isWetSurface, isStormWeather, isSnowySurface);
    const offroadFR = getSurfaceOffroadProps(surfFR.type, isWetSurface, isStormWeather, isSnowySurface);
    const offroadRL = getSurfaceOffroadProps(surfRL.type, isWetSurface, isStormWeather, isSnowySurface);
    const offroadRR = getSurfaceOffroadProps(surfRR.type, isWetSurface, isStormWeather, isSnowySurface);

    // Heavy mass load damping for commercial vehicles cutting through fluid films
    const heavyMassLoadDamping = Math.min(0.68, Math.max(0, (totalMass - 1500) / 22000));

    let stainFL = 1.0;
    let stainFR = 1.0;
    let stainRL = 1.0;
    let stainRR = 1.0;

    if (world.stains && world.stains.length > 0) {
      for (let i = 0; i < world.stains.length; i++) {
        const st = world.stains[i];
        const rSt = st.radius || 15;
        let baseGripReduction = 0.35;
        if (st.type === 'oil' || st.type === 'fuel') baseGripReduction = 0.28;
        else if (st.type === 'coolant') baseGripReduction = 0.38;
        else if (st.type === 'water') baseGripReduction = isFreezing ? 0.12 : 0.52;
        else if (st.type === 'sand') baseGripReduction = 0.65;

        const effectiveGrip = baseGripReduction + (1.0 - baseGripReduction) * heavyMassLoadDamping;

        if (Math.hypot(tFLX - st.x, tFLY - st.y) < rSt + 6) { stainFL = Math.min(stainFL, effectiveGrip); if (st.type === 'water') { if (isFreezing) isIcySurface = true; else isWetSurface = true; } }
        if (Math.hypot(tFRX - st.x, tFRY - st.y) < rSt + 6) { stainFR = Math.min(stainFR, effectiveGrip); if (st.type === 'water') { if (isFreezing) isIcySurface = true; else isWetSurface = true; } }
        if (Math.hypot(tRLX - st.x, tRLY - st.y) < rSt + 6) { stainRL = Math.min(stainRL, effectiveGrip); if (st.type === 'water') { if (isFreezing) isIcySurface = true; else isWetSurface = true; } }
        if (Math.hypot(tRRX - st.x, tRRY - st.y) < rSt + 6) { stainRR = Math.min(stainRR, effectiveGrip); if (st.type === 'water') { if (isFreezing) isIcySurface = true; else isWetSurface = true; } }
      }
    }

    if (world.puddles && world.puddles.length > 0) {
      for (let i = 0; i < world.puddles.length; i++) {
        const pud = world.puddles[i];
        const rPud = Math.max(pud.radiusX, pud.radiusY);
        const pudGripBase = isFreezing ? 0.12 : (isWetSurface ? 0.58 : 0.66);
        const effectivePudGrip = pudGripBase + (1.0 - pudGripBase) * heavyMassLoadDamping;

        if (Math.hypot(tFLX - pud.x, tFLY - pud.y) < rPud + 4) { stainFL = Math.min(stainFL, effectivePudGrip); if (isFreezing) isIcySurface = true; else isWetSurface = true; }
        if (Math.hypot(tFRX - pud.x, tFRY - pud.y) < rPud + 4) { stainFR = Math.min(stainFR, effectivePudGrip); if (isFreezing) isIcySurface = true; else isWetSurface = true; }
        if (Math.hypot(tRLX - pud.x, tRLY - pud.y) < rPud + 4) { stainRL = Math.min(stainRL, effectivePudGrip); if (isFreezing) isIcySurface = true; else isWetSurface = true; }
        if (Math.hypot(tRRX - pud.x, tRRY - pud.y) < rPud + 4) { stainRR = Math.min(stainRR, effectivePudGrip); if (isFreezing) isIcySurface = true; else isWetSurface = true; }
      }
    }

    // Tire puncture and flat tire damage penalty
    const dmg = vehicle.damage as any;
    const tireDmgFL = (dmg?.flatTireFL || dmg?.wheelPopFL) ? 0.35 : 1.0;
    const tireDmgFR = (dmg?.flatTireFR || dmg?.wheelPopFR) ? 0.35 : 1.0;
    const tireDmgRL = (dmg?.flatTireRL || dmg?.wheelPopRL) ? 0.35 : 1.0;
    const tireDmgRR = (dmg?.flatTireRR || dmg?.wheelPopRR) ? 0.35 : 1.0;

    // Combined coefficient of friction (mu) for each individual wheel contact patch
    // Powertrain variant tire set: grip in dry / wet / ice conditions (studded advantage on ice)
    const tireSetGripMult = eng?.tireGripMult ?? 1.0;
    const tireSetWetMult = eng?.tireWetGripMult ?? 1.0;
    const tireSetIceMult = eng?.tireIceGripMult ?? 1.0;
    let muFL = weatherGrip * stainFL * surfFL.grip * offroadFL.wetGripMult * tireDmgFL;
    let muFR = weatherGrip * stainFR * surfFR.grip * offroadFR.wetGripMult * tireDmgFR;
    let muRL = weatherGrip * stainRL * surfRL.grip * offroadRL.wetGripMult * tireDmgRL;
    let muRR = weatherGrip * stainRR * surfRR.grip * offroadRR.wetGripMult * tireDmgRR;
    if (tireSetGripMult !== 1.0) {
      muFL *= tireSetGripMult; muFR *= tireSetGripMult; muRL *= tireSetGripMult; muRR *= tireSetGripMult;
    }
    if (isWetSurface && tireSetWetMult !== 1.0) {
      muFL *= tireSetWetMult; muFR *= tireSetWetMult; muRL *= tireSetWetMult; muRR *= tireSetWetMult;
    }
    if (isIcySurface && tireSetIceMult !== 1.0) {
      muFL *= tireSetIceMult; muFR *= tireSetIceMult; muRL *= tireSetIceMult; muRR *= tireSetIceMult;
    }

    if (vehicle.isHeavySuspended) {
      muFL *= 1.10; muFR *= 1.10; muRL *= 1.10; muRR *= 1.10;
    }

    // Differential lock states
    const dlState = vehicle.diffLock;
    const isRearLocked = !!dlState?.rear;
    const isFrontLocked = !!dlState?.front;
    const isCenterLocked = !!dlState?.center;
    const driveType = getVehicleDriveType(vehicle.type);

    // --- 3. POWERTRAIN DRIVE & BRAKE DISTRIBUTION ON 4 WHEELS ---
    const totalPropulsionForce = engineAccel * totalMass;
    let fDriveFL = 0, fDriveFR = 0, fDriveRL = 0, fDriveRR = 0;

    if (driveType === 'RWD') {
      const halfDrive = totalPropulsionForce * 0.5;
      const isPerformanceRwd = ['sports', 'supercar', 'muscle', 'muscle_classic', 'coupe_gt', 'hatch_hot', 'sedan_classic'].includes(cfg.type);

      if (isRearLocked || isSoloMoto) {
        fDriveRL = halfDrive;
        fDriveRR = halfDrive;
      } else if (isPerformanceRwd) {
        // Limited-Slip Differential (LSD / 1.5-way clutch pack / viscous differential):
        // Under acceleration, clutch pack locks the two axle shafts together (locking coefficient 0.75).
        // Prevents open-diff single-wheel torque evaporation and ensures both rear wheels
        // spin up together under full throttle for controllable power oversteer.
        const lsdLockCoeff = 0.75;
        const maxTracRL = muRL * Fz_RL * (cfg.grip || 1.0);
        const maxTracRR = muRR * Fz_RR * (cfg.grip || 1.0);
        const totalAxleTraction = maxTracRL + maxTracRR;

        if (Math.abs(totalPropulsionForce) > totalAxleTraction) {
          // Engine exceeds combined axle grip: both wheels break into power wheelspin
          fDriveRL = halfDrive;
          fDriveRR = halfDrive;
        } else {
          // Distribute with LSD torque bias ratio (TBR ~ 3:1)
          const diffTrac = maxTracRR - maxTracRL;
          fDriveRL = halfDrive - diffTrac * lsdLockCoeff * 0.5;
          fDriveRR = halfDrive + diffTrac * lsdLockCoeff * 0.5;
        }
      } else {
        // Open differential: torque bias limited by wheel with lesser grip
        const maxTracRL = muRL * Fz_RL * (cfg.grip || 1.0);
        const maxTracRR = muRR * Fz_RR * (cfg.grip || 1.0);
        const minTrac = Math.min(maxTracRL, maxTracRR) * 1.15;
        if (Math.abs(halfDrive) > minTrac) {
          fDriveRL = Math.sign(halfDrive) * minTrac;
          fDriveRR = Math.sign(halfDrive) * minTrac;
        } else {
          fDriveRL = halfDrive;
          fDriveRR = halfDrive;
        }
      }
    } else if (driveType === 'FWD') {
      const halfDrive = totalPropulsionForce * 0.5;
      if (isFrontLocked || isSoloMoto) {
        fDriveFL = halfDrive;
        fDriveFR = halfDrive;
      } else {
        const maxTracFL = muFL * Fz_FL * (cfg.grip || 1.0);
        const maxTracFR = muFR * Fz_FR * (cfg.grip || 1.0);
        const minTrac = Math.min(maxTracFL, maxTracFR) * 1.15;
        if (Math.abs(halfDrive) > minTrac) {
          fDriveFL = Math.sign(halfDrive) * minTrac;
          fDriveFR = Math.sign(halfDrive) * minTrac;
        } else {
          fDriveFL = halfDrive;
          fDriveFR = halfDrive;
        }
      }
    } else {
      // AWD / 4WD
      const qDrive = totalPropulsionForce * 0.25;
      fDriveFL = qDrive; fDriveFR = qDrive; fDriveRL = qDrive; fDriveRR = qDrive;
    }

    // Brake force distribution (Standard: 60% front, 40% rear; MTZ tractor: split left/right)
    const baseBrakeF = (brake || 0) * (cfg.brakingForce || 220) * speedScaleFactor * totalMass / 1400.0;
    let fBrakeFL = baseBrakeF * 0.30;
    let fBrakeFR = baseBrakeF * 0.30;
    let fBrakeRL = baseBrakeF * 0.20;
    let fBrakeRR = baseBrakeF * 0.20;

    if (isTractor && !latchEnabled) {
      fBrakeFL = (brakeLeftVal || 0) * (cfg.brakingForce || 220) * speedScaleFactor * 0.5;
      fBrakeRL = (brakeLeftVal || 0) * (cfg.brakingForce || 220) * speedScaleFactor * 0.5;
      fBrakeFR = (brakeRightVal || 0) * (cfg.brakingForce || 220) * speedScaleFactor * 0.5;
      fBrakeRR = (brakeRightVal || 0) * (cfg.brakingForce || 220) * speedScaleFactor * 0.5;
    }

    // Handbrake: applies strictly to rear wheels (RL, RR)
    const isHandbrakePulled = !!isHandbraking;
    const handbrakeBrakeF = isHandbrakePulled ? (cfg.brakingForce || 220) * speedScaleFactor * totalMass / 1400.0 * 0.95 : 0;
    fBrakeRL += handbrakeBrakeF * 0.5;
    fBrakeRR += handbrakeBrakeF * 0.5;

    // --- 4. INDIVIDUAL WHEEL BRUSH TIRE SIMULATION ---
    const steerAngle = vehicle.steerAngle || 0;
    const cosSteer = Math.cos(steerAngle);
    const sinSteer = Math.sin(steerAngle);

    const computeWheelForce = (
      xb: number, yb: number,
      isFront: boolean, isLeft: boolean,
      Fz: number, mu: number,
      fDrive: number, fBrake: number
    ): WheelState => {
      // Linear hub velocity in body coordinates (V + omega x r)
      const vHubX = vLong - curYaw * yb;
      const vHubY = vLat + curYaw * xb;

      // Transform into wheel rolling direction
      let vTireLong = vHubX;
      let vTireLat = vHubY;

      if (isFront && !isArticulated) {
        vTireLong = vHubX * cosSteer + vHubY * sinSteer;
        vTireLat = -vHubX * sinSteer + vHubY * cosSteer;
      }

      // Max friction capacity (Kamm friction circle radius)
      const baseGrip = cfg.grip || 1.0;
      const Fmax = Math.max(10.0, mu * Fz * baseGrip);

      // Check for locked wheel state (handbrake on rear or locked brakes without ABS)
      const isWheelLocked = (isHandbrakePulled && !isFront) || (vehicle.isBrakeLocked && fBrake > 0);

      let fx = 0;
      let fy = 0;
      let isSlipping = false;
      let slipRatio = 0;
      let slipAngle = 0;

      const vFwd = Math.abs(vTireLong);

      // Brush tire model cornering curve: ~8-9 degrees peak slip angle.
      // Declared here so both the locked and rolling branches feed one common
      // skidIntensity evaluation below.
      const alphaPeak = isFront ? 0.16 : 0.14;

      if (isWheelLocked) {
        // Locked sliding tire: full kinetic friction opposing contact motion
        const contactSpeed = Math.hypot(vTireLong, vTireLat);
        isSlipping = contactSpeed > 2.0;
        slipRatio = -1.0;
        slipAngle = Math.atan2(vTireLat, Math.max(2.0, vFwd));

        if (contactSpeed > 0.5) {
          const kineticMu = 0.82;
          fx = -(vTireLong / contactSpeed) * Fmax * kineticMu;
          // Locked tires lose ~78% of lateral cornering stiffness!
          fy = -(vTireLat / contactSpeed) * Fmax * kineticMu * (isHandbrakePulled && !isFront ? 0.22 : 0.28);
        }
      } else {
        // Rolling tire under propulsion and service braking
        const c_rr = 0.015;

        // Service brake is strictly dissipative: it opposes existing wheel rolling velocity, never propels from rest
        let effectiveBrakeForce = 0;
        if (vFwd > 1.0) {
          // Oppose existing wheel rolling velocity
          effectiveBrakeForce = Math.sign(vTireLong) * fBrake;
        } else if (fDrive !== 0 && fBrake > 0) {
          // At rest, brakes oppose drive torque demand up to brake capacity
          effectiveBrakeForce = Math.sign(fDrive) * Math.min(fBrake, Math.abs(fDrive));
        }
        const effectiveRollingDrag = vFwd > 0.5 ? Math.sign(vTireLong) * c_rr * Fz : 0;
        const netDemand = fDrive - effectiveBrakeForce - effectiveRollingDrag;

        if (Math.abs(netDemand) > Fmax) {
          // Longitudinal traction broken (wheelspin under power or brake skid)
          isSlipping = true;
          slipRatio = Math.sign(netDemand) * Math.min(3.0, Math.abs(netDemand) / Fmax);
          fx = Math.sign(netDemand) * Fmax * 0.88; // dynamic kinetic friction
        } else {
          fx = netDemand;
          slipRatio = vFwd > 1.0 ? (netDemand / Fmax) * 0.15 : 0;
        }

        // Available lateral cornering capacity per Kamm's friction circle: Fx^2 + Fy^2 <= Fmax^2
        // In physical combined slip (Pacejka/brush model), severe longitudinal wheelspin (|slipRatio| > 1.0)
        // dramatically derates the tire's lateral stiffness and peak cornering capacity:
        // normalized lateral capacity = sqrt(max(0, 1 - (fx/Fmax)^2)) / sqrt(1 + (excess_spin * 1.8)^2)
        const excessWheelspin = isSlipping ? Math.max(0, Math.abs(slipRatio) - 0.75) : 0;
        const spinDerate = excessWheelspin > 0 ? 1.0 / Math.sqrt(1.0 + excessWheelspin * excessWheelspin * 3.5) : 1.0;
        const fLatLimit = Math.sqrt(Math.max(0, Fmax * Fmax - fx * fx)) * spinDerate;

        // Smooth slip angle calculation with speed-dependent regularization
        // Below 25 px/s (~9 km/h), regularize the denominator to prevent high-frequency chatter
        const vFwdDenom = Math.max(25.0, vFwd);
        slipAngle = -Math.atan2(vTireLat, vFwdDenom);

        const absAlpha = Math.abs(slipAngle);

        // Low-speed cornering force fade-in: prevents elastic chatter when creeping or parking
        const speedGripFactor = Math.min(1.0, Math.max(0.08, vFwd / 20.0));

        // Smooth adhesion -> kinetic slide blend with hysteresis. A tire that
        // was sliding last frame keeps a lower slide threshold, so save/re-grip
        // transitions cannot oscillate frame-by-frame (low-speed shimmy).
        const prevWheelState = isFront
          ? (isLeft ? vehicle.wheelFL : vehicle.wheelFR)
          : (isLeft ? vehicle.wheelRL : vehicle.wheelRR);
        const wasSliding = !!(prevWheelState && prevWheelState.isSlipping);
        const slideThreshold = wasSliding ? alphaPeak * 0.72 : alphaPeak;
        const slideBlendRange = Math.max(0.02, alphaPeak * 0.35);
        const slideBlend = Math.min(1.0, Math.max(0.0, (absAlpha - slideThreshold) / slideBlendRange));
        const easedBlend = slideBlend * slideBlend * (3.0 - 2.0 * slideBlend);

        // Elastic static adhesion regime: smooth sinusoidal cornering stiffness
        const fyStatic = fLatLimit * Math.sin((absAlpha / alphaPeak) * (Math.PI * 0.5)) * Math.sign(slipAngle);
        // Kinetic slide regime: tire has broken traction into a drift or plow
        const fyKinetic = fLatLimit * 0.84 * Math.sign(slipAngle);
        // Under excess wheelspin, tire transitions immediately to kinetic sliding
        const effectiveBlend = excessWheelspin > 0.4 ? Math.max(easedBlend, Math.min(1.0, excessWheelspin)) : easedBlend;
        fy = (fyStatic * (1.0 - effectiveBlend) + fyKinetic * effectiveBlend) * speedGripFactor;
        if (effectiveBlend > 0.5) {
          isSlipping = true;
        }
      }

      // Calculate skid intensity for visuals, smoke, skid marks and tire screech
      const lateralSlideSpeed = Math.abs(vTireLat);
      const longSlideSpeed = Math.abs(vTireLong * slipRatio);
      const totalSlideSpeed = Math.hypot(lateralSlideSpeed, longSlideSpeed);
      const skidIntensity = Math.min(1.0, Math.max(
        isWheelLocked && vFwd > 4.0 ? 0.75 : 0,
        isSlipping ? Math.min(1.0, totalSlideSpeed / 55.0) : 0,
        Math.abs(slipAngle) > alphaPeak * 1.4 ? Math.min(1.0, Math.abs(slipAngle) / 0.55) : 0
      ));

      const contactWorldX = isFront
        ? (isLeft ? tFLX : tFRX)
        : (isLeft ? tRLX : tRRX);
      const contactWorldY = isFront
        ? (isLeft ? tFLY : tFRY)
        : (isLeft ? tRLY : tRRY);

      return {
        angularVelocity: vFwd / 12.0,
        slipRatio,
        slipAngle,
        normalLoad: Fz,
        fx,
        fy,
        isSlipping,
        skidIntensity,
        surfaceGrip: mu,
        x: contactWorldX,
        y: contactWorldY
      };
    };

    // Hard-surface flag is constant within a frame (used by sub-steps and by tire audio/smoke below)
    const onHardRoad = surfFL.type === 'asphalt' || surfFL.type === 'concrete' || surfFL.type === 'rock' ||
                       surfRR.type === 'asphalt' || surfRR.type === 'concrete';

    // --- TIRE SUB-STEPPING ---
    // The brush tire model is very stiff at low speed (cornering stiffness ~ 1 / max(25, vFwd)).
    // A single explicit Euler step per frame (dt up to 50 ms) is unstable there: lateral velocity
    // overshoots every frame, which shows up as shaking, a permanent "isSlipping" flag and tire smoke
    // below ~15 km/h even when driving straight or off the throttle. Integrating the tire forces and
    // chassis with dt <= ~8 ms keeps it stable. Above 45 km/h stiffness is low enough for one step.
    const SUBSTEP_MAX_DT = 0.008;
    const MAX_TIRE_SUBSTEPS = 6;
    const tireSubSteps = (Math.abs(vLong) * PX_S_TO_SPEED_KMH > 45.0 || dt <= SUBSTEP_MAX_DT)
      ? 1
      : Math.min(MAX_TIRE_SUBSTEPS, Math.ceil(dt / SUBSTEP_MAX_DT));
    const subDt = dt / tireSubSteps;

    let wheelFL!: WheelState;
    let wheelFR!: WheelState;
    let wheelRL!: WheelState;
    let wheelRR!: WheelState;

    for (let tireSub = 0; tireSub < tireSubSteps; tireSub++) {
    // Calculate forces on all 4 independent contact patches
    wheelFL = computeWheelForce(Lf, -halfTrack, true, true, Fz_FL, muFL, fDriveFL, fBrakeFL);
    wheelFR = isSoloMoto ? wheelFL : computeWheelForce(Lf, halfTrack, true, false, Fz_FR, muFR, fDriveFR, fBrakeFR);
    wheelRL = computeWheelForce(-Lr, -halfTrack, false, true, Fz_RL, muRL, fDriveRL, fBrakeRL);
    wheelRR = isSoloMoto ? wheelRL : computeWheelForce(-Lr, halfTrack, false, false, Fz_RR, muRR, fDriveRR, fBrakeRR);

    // Save wheel states directly onto vehicle
    vehicle.wheelFL = wheelFL;
    vehicle.wheelFR = wheelFR;
    vehicle.wheelRL = wheelRL;
    vehicle.wheelRR = wheelRR;

    // --- 5. TRANSFORM WHEEL FORCES INTO CHASSIS ACCELERATION & YAW MOMENT ---
    // Rotate front wheel forces from steered tire frame into body frame
    const fbx_FL = wheelFL.fx * cosSteer - wheelFL.fy * sinSteer;
    const fby_FL = wheelFL.fx * sinSteer + wheelFL.fy * cosSteer;

    const fbx_FR = wheelFR.fx * cosSteer - wheelFR.fy * sinSteer;
    const fby_FR = wheelFR.fx * sinSteer + wheelFR.fy * cosSteer;

    // Rear wheel forces (fixed along vehicle long axis)
    const fbx_RL = wheelRL.fx;
    const fby_RL = wheelRL.fy;

    const fbx_RR = wheelRR.fx;
    const fby_RR = wheelRR.fy;

    // Center differential binding resistance when locked on dry asphalt
    let centerDiffDrag = 0;
    if (isCenterLocked && onHardRoad && Math.abs(steerAngle) > 0.08) {
      centerDiffDrag = Math.abs(steerAngle) * 45.0 * totalMass / 1400.0;
    }

    // Aerodynamic drag
    const curSpeedAbs = Math.hypot(curVx, curVy);
    let aeroCoeff = 0.000045;
    if (['supercar', 'sports', 'coupe_gt', 'hatch_hot'].includes(cfg.type)) aeroCoeff = 0.000032;
    else if (cfg.type.startsWith('truck_') || cfg.type === 'bus') aeroCoeff = 0.000085;
    const fAero = aeroCoeff * curSpeedAbs * curSpeedAbs * Math.sign(vLong) * totalMass;

    // Slope force along body axes
    const terrainSlope = slope || getTerrainSlope(vehicle.x, vehicle.y);
    const fSlopeLong = -(terrainSlope.slopeX * cosA + terrainSlope.slopeY * sinA) * g_acc * totalMass * 0.05;
    const fSlopeLat = -(-terrainSlope.slopeX * sinA + terrainSlope.slopeY * cosA) * g_acc * totalMass * 0.05;

    // Sum of body forces
    const F_body_x = (fbx_FL + fbx_FR + fbx_RL + fbx_RR) - (Math.sign(vLong) * centerDiffDrag) - fAero + fSlopeLong;
    const F_body_y = (fby_FL + fby_FR + fby_RL + fby_RR) + fSlopeLat;

    // Sum of Yaw Moments around Center of Mass: Tau = r x F
    // FL: pos (Lf, -halfTrack) -> tau = Lf * fby - (-halfTrack) * fbx
    // FR: pos (Lf, halfTrack)  -> tau = Lf * fby - (halfTrack) * fbx
    // RL: pos (-Lr, -halfTrack)-> tau = -Lr * fby - (-halfTrack) * fbx
    // RR: pos (-Lr, halfTrack) -> tau = -Lr * fby - (halfTrack) * fbx
    let Tau_z = (Lf * fby_FL + halfTrack * fbx_FL) +
                (Lf * fby_FR - halfTrack * fbx_FR) +
                (-Lr * fby_RL + halfTrack * fbx_RL) +
                (-Lr * fby_RR - halfTrack * fbx_RR);

    // Articulated hydraulic steering moment for rollers
    if (isArticulated) {
      const artYawDemand = (vLong / Math.max(10, wheelBase)) * Math.sin(steerAngle);
      Tau_z += artYawDemand * Iz * 8.5;
    }

    // --- 6. RIGID BODY NEWTON-EULER INTEGRATION ---
    const aBodyX = F_body_x / totalMass;
    const aBodyY = F_body_y / totalMass;
    let alphaYaw = Math.max(-40.0, Math.min(40.0, Tau_z / Iz));

    const isEngineActiveForEuler = eng ? (eng.engineRunning || eng.isDieselRunaway) : false;
    const activeThrottleEuler = isEngineActiveForEuler ? throttle : 0;

    // Physical chassis yaw damping:
    // Replaces artificial ESP damper with authentic aerodynamic rotational drag and chassis torsional damping.
    // True tire yaw damping is already generated naturally by the contact patches (-Lr * fby_RL, etc.).
    // Gentle numerical damping (1.4 - 2.2 1/s) eliminates high-frequency integration chatter
    // while allowing full, natural body rotation and drift angles.
    const vehSpeedKmh = Math.abs(vehicle.speed) * PX_S_TO_SPEED_KMH;
    const yawDampRate = 1.4 + Math.min(1.2, vehSpeedKmh * 0.015);
    curYaw *= Math.max(0.85, 1.0 - yawDampRate * subDt);

    // Stationary steering scrub resistance (preventing on-spot rotation when turning steering wheel at standstill)
    if (vehSpeedKmh < 3.0 && activeThrottleEuler === 0) {
      alphaYaw *= 0.15;
      // 0.75 per 1/60 s, kept frame-rate independent across sub-steps
      if (Math.abs(curYaw) < 0.25) curYaw *= Math.pow(0.75, subDt * 60);
    }

    // Transform body accelerations into world coordinates
    const aWorldX = aBodyX * cosA - aBodyY * sinA;
    const aWorldY = aBodyX * sinA + aBodyY * cosA;

    curVx += aWorldX * subDt;
    curVy += aWorldY * subDt;
    curYaw += alphaYaw * subDt;

    // Robust low-speed static friction / stiction lock (prevents drifting, creeping, and rotation on the spot)
    const groundSpeed = Math.hypot(curVx, curVy);
    if ((groundSpeed < 2.8 && activeThrottleEuler === 0 && !isHandbrakePulled) || (vehSpeedKmh < 2.0 && activeThrottleEuler === 0)) {
      curVx *= Math.pow(0.05, subDt * 12);
      curVy *= Math.pow(0.05, subDt * 12);
      curYaw *= Math.pow(0.05, subDt * 12);
      if (groundSpeed < 1.5) {
        curVx = 0;
        curVy = 0;
        curYaw = 0;
      }
    }

    // Advance heading inside the sub-step and refresh the body-frame velocities for the next one
    vehicle.angle += curYaw * subDt;
    cosA = Math.cos(vehicle.angle);
    sinA = Math.sin(vehicle.angle);
    vLong = curVx * cosA + curVy * sinA;
    vLat = -curVx * sinA + curVy * cosA;
    } // end of tire sub-step loop

    // Update vehicle orientation and velocities
    vehicle.angularVelocity = curYaw;
    vehicle.angle = ((vehicle.angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

    vehicle.vx = curVx;
    vehicle.vy = curVy;

    // Scalar longitudinal & lateral speeds for dashboard, HUD, engine revs and transmission
    const newCosA = Math.cos(vehicle.angle);
    const newSinA = Math.sin(vehicle.angle);
    vehicle.speed = vehicle.vx * newCosA + vehicle.vy * newSinA;
    vehicle.lateralVelocity = -vehicle.vx * newSinA + vehicle.vy * newCosA;
    (vehicle as any).lateralSlip = vehicle.lateralVelocity;

    const vSpeedKmh = Math.abs(vehicle.speed) * PX_S_TO_SPEED_KMH;
    const newHeadingCos = newCosA;
    const newHeadingSin = newSinA;
    const isEngineRunning = !eng || (eng.engineRunning && !eng.isStalled && (eng.engineRPM || 0) > 400);
    const effectiveThrottle = isEngineRunning ? (throttle > 0 ? throttle : 0) : 0;
    const isInGear = eng ? (eng.currentGear !== 0 && (!eng.autoGearMode || (eng.autoGearMode !== 'N' && eng.autoGearMode !== 'P'))) : true;
    const massFactor = Math.min(2.5, Math.max(0.65, totalMass / 1400.0));
    const isBurnoutHolding = isEngineRunning && isHandbrakePulled && effectiveThrottle > 0.65 && vSpeedKmh < 12.0;

    // Oversteer & Drift State
    const rearSlipping = wheelRL.isSlipping || wheelRR.isSlipping;
    const frontSlipping = wheelFL.isSlipping || wheelFR.isSlipping;
    const slipMagnitude = Math.abs(vehicle.lateralVelocity);
    const isDriftActive = (rearSlipping && (vSpeedKmh > 6.0 || isHandbrakePulled)) || (slipMagnitude > 18.0 && vSpeedKmh > 10.0);
    vehicle.isDrifting = isDriftActive;
    vehicle.driftFactor = Math.min(1.0, slipMagnitude / 80.0 + (rearSlipping ? 0.35 : 0));

    const isFrontSlipping = frontSlipping;
    const isRearSlipping = rearSlipping;

    // Differential locked tire scrubbing in turns on dry asphalt
    const isLockedTireScrubbing = onHardRoad && (isRearLocked || isFrontLocked) && Math.abs(vehicle.steerAngle) > 0.08 && vSpeedKmh > 3.0 && vSpeedKmh < 60.0;

    // --- 7. TIRE SCREECH AUDIO ---
    const anyTireSkidding = wheelFL.skidIntensity > 0.22 || wheelFR.skidIntensity > 0.22 || wheelRL.skidIntensity > 0.22 || wheelRR.skidIntensity > 0.22;
    const isScreechAllowed = onHardRoad && !isSnowySurface && !isIcySurface;
    if (isScreechAllowed && (anyTireSkidding || vehicle.isDrifting || isLockedTireScrubbing)) {
      const maxSkid = Math.max(wheelFL.skidIntensity, wheelFR.skidIntensity, wheelRL.skidIntensity, wheelRR.skidIntensity);
      const screechIntensity = Math.min(1.0, Math.max(
        maxSkid,
        vehicle.isDrifting ? 0.82 : 0,
        isLockedTireScrubbing ? 0.45 : 0
      ));
      sound.startTireScreech(screechIntensity);
    } else {
      sound.stopTireScreech();
    }

    // Geometry anchors for tire ruts, skid marks and particles
    const newRearX = vehicle.x - newCosA * geomRearAxleDist;
    const newRearY = vehicle.y - newSinA * geomRearAxleDist;

    const leftRearX = isSoloMoto ? newRearX : (newRearX - newSinA * halfTrack);
    const leftRearY = isSoloMoto ? newRearY : (newRearY + newCosA * halfTrack);
    const rightRearX = isSoloMoto ? newRearX : (newRearX + newSinA * halfTrack);
    const rightRearY = isSoloMoto ? newRearY : (newRearY - newCosA * halfTrack);

    const frontCenterX = newRearX + newCosA * wheelBase;
    const frontCenterY = newRearY + newSinA * wheelBase;
    const leftFrontX = isSoloMoto ? frontCenterX : (frontCenterX - newSinA * halfTrack);
    const leftFrontY = isSoloMoto ? frontCenterY : (frontCenterY + newCosA * halfTrack);
    const rightFrontX = isSoloMoto ? frontCenterX : (frontCenterX + newSinA * halfTrack);
    const rightFrontY = isSoloMoto ? frontCenterY : (frontCenterY - newCosA * halfTrack);

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
          // Asphalt or concrete: marks only appear on drift, power slip, hard braking or wheel lockup.
          // Intentional scenarios (handbrake, burnout, brake lockup) mark even at
          // crawl speed; ordinary slip marks require real speed so that low-speed
          // integration noise cannot paint constant black tire marks.
          const intentionalMark = isHandbraking || isBurnoutHolding || vehicle.isBrakeLocked;
          if ((vSpeedKmh > 8.0 && (vehicle.isDrifting || isSlippingAxle)) || intentionalMark) {
            const markAlpha = Math.max(0.12, Math.min(0.72, (slipMagnitude / 65) + (isHandbraking ? 0.28 : 0) + (isSlippingAxle ? 0.32 : 0) + (vehicle.isBrakeLocked ? 0.35 : 0)));
            const markColor = isSnowySurface ? 'rgba(235, 242, 250, 0.75)' : '#111827';
            world.skidMarks.push({
              x1: prevX,
              y1: prevY,
              x2: currX,
              y2: currY,
              alpha: markAlpha,
              color: markColor,
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
      if (vSpeedKmh < 2.0 && !isBurnoutHolding) {
        return;
      }

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
            const atmo = getAtmosphereState(world, world.timeHour);
            const cond = atmo.condensationFactor;
            const isCold = atmo.isCold;
            // Hot rubber vapor condenses violently against cold ambient air: brilliant white, denser, larger puffs
            const tireSmokeColor = isCold ? (atmo.outsideTemp < 4 ? '#ffffff' : '#f8fafc') : '#e2e8f0';
            const tireSmokeAlpha = (0.42 + (isCold ? 0.25 : 0)) * (1.0 + cond * 0.4);
            const tireSmokeRadius = (4.0 + Math.random() * 5.5) * (1.0 + cond * 0.45);
            const tireSmokeLife = (0.45 + Math.random() * 0.25) * (isCold ? 1.4 : 0.85);

            world.particles.push({
              x: tireX + (Math.random() * 6 - 3),
              y: tireY + (Math.random() * 6 - 3),
              vx: (Math.random() - 0.5) * 20 + atmo.wind.vx * 0.2,
              vy: (Math.random() - 0.5) * 20 + atmo.wind.vy * 0.2,
              radius: tireSmokeRadius,
              color: tireSmokeColor,
              alpha: Math.min(0.95, tireSmokeAlpha),
              initialAlpha: Math.min(0.95, tireSmokeAlpha),
              life: 0,
              maxLife: tireSmokeLife,
              type: 'tire_smoke',
              underVehicle: false,
              isSteam: false,
              tempC: 180,
              buoyancy: 12,
              expansionRate: 8.5
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
      if ((vehicle.pushedTimer && vehicle.pushedTimer > 0) || (vehicle.spinoutTimer && vehicle.spinoutTimer > 0) || (vehicle.stunnedTimer && vehicle.stunnedTimer > 0) || (!vehicle.isPlayerControlled && isVehicleDisabledOrCrashed(vehicle))) {
        // Pushed, stunned, or disabled/crashed NPC: physics momentum and asphalt Coulomb tire friction
        vehicle.targetSpeed = 0;
        vehicle.idmAcceleration = 0;
        const cosA = Math.cos(vehicle.angle);
        const sinA = Math.sin(vehicle.angle);
        const curSpeed = Math.hypot(vehicle.vx, vehicle.vy);
        if (curSpeed > 0.8) {
          const tireFrictionDecel = 340 * dt; // px/s^2 natural Coulomb tire drag on asphalt
          const newSpeed = Math.max(0, curSpeed - tireFrictionDecel);
          const ratio = newSpeed / curSpeed;
          vehicle.vx *= ratio;
          vehicle.vy *= ratio;
          vehicle.speed = vehicle.vx * cosA + vehicle.vy * sinA;
          vehicle.lateralVelocity = -vehicle.vx * sinA + vehicle.vy * cosA;
          (vehicle as any).lateralSlip = vehicle.lateralVelocity;

          // Deposit dramatic tire skid marks while spinning / skidding at speed
          if (curSpeed > 35 && world.skidMarks && Math.random() < 0.45) {
            world.skidMarks.push({
              x1: vehicle.x,
              y1: vehicle.y,
              x2: vehicle.x + vehicle.vx * dt * 2.0,
              y2: vehicle.y + vehicle.vy * dt * 2.0,
              alpha: Math.min(0.65, curSpeed / 140),
              color: '#111827',
              width: 12,
              depth: 0,
              surfaceType: 'asphalt',
              isWet: false
            });
          }
        } else {
          vehicle.vx = 0;
          vehicle.vy = 0;
          vehicle.speed = 0;
          vehicle.lateralVelocity = 0;
          vehicle.angularVelocity = 0;
        }

        // Apply angular rotation during spinout
        if (Math.abs(vehicle.angularVelocity || 0) > 0.01) {
          vehicle.angle += (vehicle.angularVelocity || 0) * dt;
          vehicle.angle = ((vehicle.angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
          // Natural tire yaw friction damping
          vehicle.angularVelocity = (vehicle.angularVelocity || 0) * Math.max(0, 1.0 - 3.2 * dt);
        }

        if (!vehicle.isPlayerControlled && isVehicleDisabledOrCrashed(vehicle)) {
          vehicle.aiState = 'stopping_obstacle';
          vehicle.turnSignal = 'hazard';
          vehicle.brakeLightsOn = true;
          if (vehicle.engineState) {
            vehicle.engineState.engineRunning = false;
            vehicle.engineState.engineRPM = 0;
          }
        }
      } else {
        // Smooth, gentle acceleration and polite braking for AI
        const speedScaleFactor = SPEED_KMH_TO_PX_S / 2.7778; // 1.6
        const accelRate = 90 * speedScaleFactor; // px/s^2 (no rapid jerking or shoving)
        const brakeRate = 180 * speedScaleFactor; // px/s^2

        if (vehicle.aiState === 'reversing') {
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
            // AI на целевой нулевой скорости не должен «кролиться» от
            // микроскопического плюса IDM: иначе стоящая машина дрожит и едет.
            if ((vehicle.targetSpeed || 0) <= 0.25 && vehicle.speed < 0.6) {
              vehicle.speed = 0;
              vehicle.idmAcceleration = 0;
            }
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
  }

  // --- PROGRESSIVE MULTI-FRAME CRUMPLE ZONE CUSHIONING & DECELERATION ---
  if (vehicle.activeCrumple && vehicle.activeCrumple.timer > 0) {
    const c = vehicle.activeCrumple;
    
    // Decay standard crumple timer
    if (c.timer > 0) {
      c.timer = Math.max(0, c.timer - dt);
    }
    const progress = c.totalDuration > 0 ? (1 - c.timer / c.totalDuration) : 1.0; // 0.0 to 1.0

    // Ход смятия по кривой «сила–смятие»: тормозит машину и даёт инерционную нагрузку узлам.
    // undefined — для этого удара силовой модели нет (удар между машинами и т.п.): прежний сценарий.
    const strokePhase = advanceCrashStroke(vehicle, dt);

    // Step continuous soft-body deformation in sync with deceleration stroke
    stepNodeBeamContinuousContact(vehicle, dt, world);

    // For head-on rigid obstacles, compress forward speed.
    // For vehicle-to-vehicle or glancing collisions (preserveVelocity=true), velocity is already physically computed by 2D impulse!
    if (!c.preserveVelocity) {
      // Smooth softbody deceleration curve:
      // Phase 1 (0.0 to 0.72): Progressive plastic compression & kinetic energy absorption
      // Phase 2 (0.72 to 1.0): Gentle elastic rebound as chassis springs back
      let phaseSpeed: number;
      if (strokePhase !== undefined) {
        phaseSpeed = strokePhase;
      } else if (progress < 0.72) {
        const compressProgress = progress / 0.72;
        // Cosine easing creates gradual entry, peak resistance at max penetration, then zero speed
        const decel = Math.cos(compressProgress * Math.PI * 0.5);
        phaseSpeed = (c.initialNormalSpeed !== undefined ? c.initialNormalSpeed : c.initialSpeed) * decel;
      } else {
        const reboundProgress = (progress - 0.72) / 0.28;
        phaseSpeed = c.reboundSpeed * Math.sin(reboundProgress * Math.PI * 0.5);
      }

      if (c.initialNormalSpeed !== undefined) {
        // Честная кинематика удара об упор: гасится только нормальная
        // составляющая (сжатие металла), касательная сохраняется с трением
        // шин/металла — касательный удар не останавливает машину как лобовый.
        const nX = c.normalX;
        const nY = c.normalY;
        const tX = -c.normalY;
        const tY = c.normalX;
        const tanVel = (c.initialTangentialSpeed ?? 0) * Math.max(0, 1.0 - 1.5 * dt);
        c.initialTangentialSpeed = tanVel;
        // velocity = -n̂ · phaseSpeed + t̂ · tanVel (phaseSpeed ≥ 0 — сближение)
        vehicle.vx = -nX * phaseSpeed + tX * tanVel;
        vehicle.vy = -nY * phaseSpeed + tY * tanVel;
        const cCos = Math.cos(vehicle.angle);
        const cSin = Math.sin(vehicle.angle);
        vehicle.speed = vehicle.vx * cCos + vehicle.vy * cSin;
        const lat = -vehicle.vx * cSin + vehicle.vy * cCos;
        vehicle.lateralVelocity = lat;
        (vehicle as any).lateralSlip = lat;
      } else {
        vehicle.speed = phaseSpeed;
        vehicle.vx = Math.cos(vehicle.angle) * vehicle.speed;
        vehicle.vy = Math.sin(vehicle.angle) * vehicle.speed;
        if (vehicle.lateralVelocity) {
          vehicle.lateralVelocity *= Math.max(0, 1.0 - 1.2 * dt);
          (vehicle as any).lateralSlip = vehicle.lateralVelocity;
        }
      }
    }

    // Continuous collision sparks along contact point while metal crumples over multiple frames
    if (Math.abs(c.initialSpeed) > 30 && Math.random() < 0.65) {
      const spkAngle = Math.atan2(c.normalY, c.normalX) + (Math.random() - 0.5) * 1.5;
      const spkSpeed = 50 + Math.random() * 95;
      world.particles.push({
        x: c.contactX + (Math.random() - 0.5) * 6,
        y: c.contactY + (Math.random() - 0.5) * 6,
        vx: Math.cos(spkAngle) * spkSpeed,
        vy: Math.sin(spkAngle) * spkSpeed,
        radius: 0.8 + Math.random() * 1.2,
        color: '#ffffff',
        secondaryColor: Math.random() > 0.35 ? '#fef08a' : '#fbbf24',
        alpha: 1.0,
        life: 0,
        maxLife: 0.10 + Math.random() * 0.15,
        type: 'spark',
        streakLength: 0.045,
        z: 0.5 + Math.random() * 0.7,
        vz: 10 + Math.random() * 20,
        bounces: 1
      });
    }

    if (c.timer <= 0) {
      vehicle.activeCrumple = undefined;
    }
  }

  // Update position with combined engine velocity and physical knockback momentum
  const totalVx = vehicle.vx + (vehicle.knockbackVx || 0);
  const totalVy = vehicle.vy + (vehicle.knockbackVy || 0);
  const moveX = totalVx * dt;
  const moveY = totalVy * dt;
  const moveDist = Math.hypot(moveX, moveY);

  // Swept building check: на 1500+ px/s машина за один кадр проходит больше
  // половины своей ширины, и дискретный SAT может не увидеть стену вообще.
  // Проходим отрезок пути с шагом 3–8 px и останавливаем машину на первом
  // кадре касания — дальше обычный collision-блок считает удар и вмятину.
  let sweptIntoBuilding = false;
  if (
    moveDist > Math.max(8, vehicle.width * 0.45) &&
    !vehicle.activeCrumple &&
    nearbyBuildings.length > 0 &&
    Number.isFinite(moveX) &&
    Number.isFinite(moveY)
  ) {
    const sampleStep = Math.max(3, Math.min(8, vehicle.width * 0.25));
    const steps = Math.min(48, Math.ceil(moveDist / sampleStep));
    if (steps > 1) {
      const startX = vehicle.x;
      const startY = vehicle.y;
      for (let s = 1; s <= steps; s++) {
        vehicle.x = startX + moveX * (s / steps);
        vehicle.y = startY + moveY * (s / steps);
        let hit = false;
        for (const bld of nearbyBuildings) {
          if (checkCarBuildingCollision(vehicle, bld).collided) {
            hit = true;
            break;
          }
        }
        if (!hit && vehicle.x >= 4800 && vehicle.x <= 5500 && vehicle.y >= 4800 && vehicle.y <= 5500) {
          for (const sub of GAS_STATION_STRUCTURAL_SUB_BOXES) {
            if (checkCarBoxCollision(vehicle, sub).collided) {
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          sweptIntoBuilding = true;
          break;
        }
      }
      if (!sweptIntoBuilding) {
        // Вернуть машину в начало отрезка: финальный += ниже переместит её один раз.
        vehicle.x = startX;
        vehicle.y = startY;
      }
    }
  }
  if (!sweptIntoBuilding) {
    vehicle.x += moveX;
    vehicle.y += moveY;
  }

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
  if (vehicle.pushedTimer && vehicle.pushedTimer > 0) {
    vehicle.pushedTimer -= dt;
    if (vehicle.pushedTimer <= 0) vehicle.pushedTimer = 0;
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
    'truck_dump', 'truck_zil_dump', 'truck_semi', 'truck_box', 'truck_tanker', 'truck_water',
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
  // Frame-level deduplication: resolved pairs are cleared when the simulation frame advances
  const currentFrame = (world as any)._physicsFrameId || 0;
  if ((world as any)._lastResolvedFrame !== currentFrame || !(world as any)._resolvedCollisionPairs) {
    (world as any)._lastResolvedFrame = currentFrame;
    (world as any)._resolvedCollisionPairs = new Set<string>();
  }
  const resolvedPairs: Set<string> = (world as any)._resolvedCollisionPairs;

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

    // Pair deduplication: only resolve collision once per pair per tick
    const pairKey = vehicle.id < other.id ? `${vehicle.id}_${other.id}` : `${other.id}_${vehicle.id}`;
    if (resolvedPairs.has(pairKey)) {
      continue;
    }

    // If both cars are AI and ghosting, allow glide-through
    if (!vehicle.isPlayerControlled && !other.isPlayerControlled) {
      if ((vehicle.ghostingAlpha !== undefined && vehicle.ghostingAlpha < 0.85) ||
          (other.ghostingAlpha !== undefined && other.ghostingAlpha < 0.85)) {
        continue;
      }
    }

    const col = checkVehicleVehicleCollision(vehicle, other);
    if (col.collided) {
      resolvedPairs.add(pairKey);

      // Mass calculations
      const m1 = Math.max(100, vehicle.mass || 1400);
      const m2 = Math.max(100, other.mass || 1400);
      const totalMass = m1 + m2;
      // Припаркованную машину нельзя «сдувать» мелкими касаниями: на низкой
      // скорости она работает как статическое препятствие и не начинает
      // дрожать/уезжать от соседнего трафика.
      const relSpeed = Math.hypot((vehicle.vx || 0) - (other.vx || 0), (vehicle.vy || 0) - (other.vy || 0));
      const protectOther = !!other.isParked && relSpeed < 40;
      const ratioSelf = protectOther ? 1 : m2 / totalMass;
      const ratioOther = protectOther ? 0 : m1 / totalMass;

      // 1. Position Separation: resolve penetration smoothly with Baumgarte stabilization (max 3.2px per tick)
      // Clamping prevents sudden 20px teleportations into open space when pressed against obstacles.
      const rawSep = Math.max(0, col.overlap - 0.1) * 0.65;
      const sepMag = Math.min(3.2, rawSep);
      vehicle.x -= col.normalX * sepMag * ratioSelf;
      vehicle.y -= col.normalY * sepMag * ratioSelf;
      other.x += col.normalX * sepMag * ratioOther;
      other.y += col.normalY * sepMag * ratioOther;

      // Contact point vectors from centers of mass
      const rX_vehicle = col.contactX - vehicle.x;
      const rY_vehicle = col.contactY - vehicle.y;
      const rX_other = col.contactX - other.x;
      const rY_other = col.contactY - other.y;

      const w1 = vehicle.angularVelocity || 0;
      const w2 = other.angularVelocity || 0;

      // Contact point linear velocities: v_p = v + w x r (2D: vx - w*ry, vy + w*rx)
      const vp1x = vehicle.vx - w1 * rY_vehicle;
      const vp1y = vehicle.vy + w1 * rX_vehicle;
      const vp2x = other.vx - w2 * rY_other;
      const vp2y = other.vy + w2 * rX_other;

      const relVx = vp2x - vp1x;
      const relVy = vp2y - vp1y;
      const velAlongNormal = relVx * col.normalX + relVy * col.normalY;

      // Moments of inertia
      const I1 = m1 * (vehicle.width * vehicle.width + vehicle.length * vehicle.length) / 12;
      const I2 = protectOther ? 1 : m2 * (other.width * other.width + other.length * other.length) / 12;

      const invMass1 = 1 / m1;
      const invMass2 = protectOther ? 0 : 1 / m2;
      const invI2 = protectOther ? 0 : 1 / I2;

      // Cross products: r x n
      const r1CrossN = rX_vehicle * col.normalY - rY_vehicle * col.normalX;
      const r2CrossN = rX_other * col.normalY - rY_other * col.normalX;

      const invMassN = invMass1 + invMass2 + (r1CrossN * r1CrossN) / I1 + (r2CrossN * r2CrossN) * invI2;

      if (velAlongNormal < 0) {
        // --- RIGID-BODY COLLISION IMPULSE ---
        const impactSpeed = Math.abs(velAlongNormal);

        // Coefficient of restitution: elastic only at parking nudges, progressive plastic dissipation above 12 km/h
        const restitution = impactSpeed < 18 ? 0.16 : Math.max(0.02, 0.15 - (impactSpeed - 18) / 300);
        const impulseNormalMag = -(1 + restitution) * velAlongNormal / Math.max(0.00001, invMassN);

        // Tangential friction impulse
        const vNormalX = velAlongNormal * col.normalX;
        const vNormalY = velAlongNormal * col.normalY;
        const vTanX = relVx - vNormalX;
        const vTanY = relVy - vNormalY;
        const vTanSpeed = Math.hypot(vTanX, vTanY);

        let impulseTanX = 0;
        let impulseTanY = 0;

        if (vTanSpeed > 0.2) {
          const tX = vTanX / vTanSpeed;
          const tY = vTanY / vTanSpeed;
          const r1CrossT = rX_vehicle * tY - rY_vehicle * tX;
          const r2CrossT = rX_other * tY - rY_other * tX;
          const invMassT = invMass1 + invMass2 + (r1CrossT * r1CrossT) / I1 + (r2CrossT * r2CrossT) * invI2;
          const jtIdeal = -vTanSpeed / Math.max(0.00001, invMassT);

          // Dynamic friction coefficient between body panels (0.45 - 0.65)
          const frictionCoeff = impactSpeed > 80 ? 0.65 : 0.45;
          const frictionLimit = frictionCoeff * impulseNormalMag;
          const jt = Math.max(-frictionLimit, Math.min(frictionLimit, jtIdeal));

          impulseTanX = jt * tX;
          impulseTanY = jt * tY;
        }

        const totalImpulseX = impulseNormalMag * col.normalX + impulseTanX;
        const totalImpulseY = impulseNormalMag * col.normalY + impulseTanY;

        // Apply linear velocity changes
        vehicle.vx -= totalImpulseX * invMass1;
        vehicle.vy -= totalImpulseY * invMass1;
        other.vx += totalImpulseX * invMass2;
        other.vy += totalImpulseY * invMass2;

        // Apply angular torque impulses
        const tau1 = -(rX_vehicle * totalImpulseY - rY_vehicle * totalImpulseX);
        const tau2 = (rX_other * totalImpulseY - rY_other * totalImpulseX);
        vehicle.angularVelocity = (vehicle.angularVelocity || 0) + tau1 / I1;
        other.angularVelocity = (other.angularVelocity || 0) + tau2 * invI2;

        const scrapeSpeed = vTanSpeed;

        // Active crumple zone for softbody continuous contact
        const contactW = col.contactWidthPx || Math.max(12, Math.min(vehicle.width, other.width) * 0.85);
        const isNarrow = col.isNarrow ?? false;

        if (impactSpeed > 16) {
          const crumpleDuration = 0.12 + Math.min(0.20, impactSpeed / 600);
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
              preserveVelocity: true,
              isNarrowImpact: isNarrow,
              contactWidthPx: contactW
            };
          } else {
            vehicle.activeCrumple.timer = Math.max(vehicle.activeCrumple.timer, crumpleDuration * 0.8);
            vehicle.activeCrumple.normalX = -col.normalX;
            vehicle.activeCrumple.normalY = -col.normalY;
            vehicle.activeCrumple.contactX = col.contactX;
            vehicle.activeCrumple.contactY = col.contactY;
            vehicle.activeCrumple.contactWidthPx = contactW;
            vehicle.activeCrumple.isNarrowImpact = isNarrow;
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
              preserveVelocity: true,
              isNarrowImpact: isNarrow,
              contactWidthPx: contactW
            };
          } else {
            other.activeCrumple.timer = Math.max(other.activeCrumple.timer, crumpleDuration * 0.8);
            other.activeCrumple.normalX = col.normalX;
            other.activeCrumple.normalY = col.normalY;
            other.activeCrumple.contactX = col.contactX;
            other.activeCrumple.contactY = col.contactY;
            other.activeCrumple.contactWidthPx = contactW;
            other.activeCrumple.isNarrowImpact = isNarrow;
          }
        }

        // Deform node-beam & body panels with physically authentic contact width
        applyVehicleDamageAndDeformation(vehicle, col.contactX, col.contactY, impactSpeed, scrapeSpeed, world, m2, isNarrow, contactW);
        applyVehicleDamageAndDeformation(other, col.contactX, col.contactY, impactSpeed, scrapeSpeed, world, m1, isNarrow, contactW);

        // Sound effect
        const impactIntensity = Math.min(1.0, impactSpeed / 140);
        if (impactIntensity > 0.08) {
          sound.playCollision(impactIntensity);
        }

        // Driver vehicle trauma
        if (player) {
          if (vehicle.isPlayerControlled || (player.isInVehicle && player.currentVehicleId === vehicle.id)) {
            applyDriverVehicleCrashTrauma(player, impactSpeed, 'автомобиль', 0.85, vehicle);
          } else if (other.isPlayerControlled || (player.isInVehicle && player.currentVehicleId === other.id)) {
            applyDriverVehicleCrashTrauma(player, impactSpeed, 'автомобиль', 0.85, other);
          }
        }
      } else {
        // --- CONTINUOUS CONTACT PUSH / SHOVING ---
        // One car is driving into or plowing the other
        const vPushSelf = vehicle.vx * col.normalX + vehicle.vy * col.normalY;
        const vPushOther = other.vx * col.normalX + other.vy * col.normalY;
        const pushDiff = vPushSelf - vPushOther;
        if (pushDiff > 0) {
          const transfer = pushDiff * ratioOther * Math.min(1.0, dt * 25.0);
          other.vx += col.normalX * transfer;
          other.vy += col.normalY * transfer;
          vehicle.vx -= col.normalX * transfer * (m2 / m1);
          vehicle.vy -= col.normalY * transfer * (m2 / m1);
        }
      }

      // Synchronize vehicle speeds and slip vectors
      const cos1 = Math.cos(vehicle.angle);
      const sin1 = Math.sin(vehicle.angle);
      vehicle.speed = vehicle.vx * cos1 + vehicle.vy * sin1;
      vehicle.lateralVelocity = -vehicle.vx * sin1 + vehicle.vy * cos1;
      (vehicle as any).lateralSlip = vehicle.lateralVelocity;
      vehicle.isDrifting = Math.abs(vehicle.lateralVelocity) > 10.0 || Math.abs(vehicle.angularVelocity || 0) > 0.8;

      const cos2 = Math.cos(other.angle);
      const sin2 = Math.sin(other.angle);
      other.speed = other.vx * cos2 + other.vy * sin2;
      other.lateralVelocity = -other.vx * sin2 + other.vy * cos2;
      (other as any).lateralSlip = other.lateralVelocity;
      other.isDrifting = Math.abs(other.lateralVelocity) > 10.0 || Math.abs(other.angularVelocity || 0) > 0.8;

      if (protectOther) {
        other.vx = 0;
        other.vy = 0;
        other.speed = 0;
        other.lateralVelocity = 0;
        other.angularVelocity = 0;
        other.isParked = true;
      }

      // Wake up and spin out cars
      const totalImpactSpdKmh = Math.hypot(vehicle.vx - other.vx, vehicle.vy - other.vy) * PX_S_TO_SPEED_KMH;

      if (!vehicle.isPlayerControlled) {
        if (totalImpactSpdKmh > 18 || Math.abs(vehicle.angularVelocity || 0) > 0.8) {
          vehicle.spinoutTimer = Math.min(6.0, Math.max(1.5, 0.8 + totalImpactSpdKmh / 45));
          vehicle.pushedTimer = Math.max(vehicle.pushedTimer || 0, Math.min(5.0, 1.2 + totalImpactSpdKmh / 55));
          vehicle.stunnedTimer = Math.max(vehicle.stunnedTimer || 0, 1.5);
          vehicle.aiState = 'spinout';
          vehicle.turnSignal = 'hazard';
          vehicle.brakeLightsOn = true;
          vehicle.isParked = false;
        } else {
          vehicle.pushedTimer = Math.max(vehicle.pushedTimer || 0, 0.8);
          vehicle.isParked = false;
        }
      }

      if (!protectOther && !other.isPlayerControlled) {
        if (totalImpactSpdKmh > 18 || Math.abs(other.angularVelocity || 0) > 0.8) {
          other.spinoutTimer = Math.min(6.0, Math.max(1.5, 0.8 + totalImpactSpdKmh / 45));
          other.pushedTimer = Math.max(other.pushedTimer || 0, Math.min(5.0, 1.2 + totalImpactSpdKmh / 55));
          other.stunnedTimer = Math.max(other.stunnedTimer || 0, 1.5);
          other.aiState = 'spinout';
          other.turnSignal = 'hazard';
          other.brakeLightsOn = true;
          other.isParked = false;
        } else {
          other.pushedTimer = Math.max(other.pushedTimer || 0, 0.8);
          other.isParked = false;
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
      // Реальное пятно контакта (центр и ширина), а не «центр носа на всю ширину кузова»
      const patch = computeBoxContactPatch(vehicle, bld, col.normalX, col.normalY);
      const contactX = patch.x;
      const contactY = patch.y;

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

          // Нормальная составляющая (сближение со стеной) идёт в урон и травму,
          // касательная — это скольжение вдоль стены (царапины, а не вмятина).
          const normalImpactSpeed = Math.max(0, -velDotN);
          const tangentialSpeed = Math.abs(velDotT);

          const isPlayerVeh = vehicle.isPlayerControlled || (player && player.isInVehicle && player.currentVehicleId === vehicle.id);
          const isGlancingBlow = isPlayerVeh && (Math.abs(velDotT) > Math.abs(velDotN) * 0.9);

          // Dynamic multi-frame crumple zone cushion:
          // Kinetic energy is absorbed over ~5-8 frames (0.08 - 0.12s),
          // generating continuous metal wrinkling and smooth deceleration!
          const crumpleDuration = 0.08 + Math.min(0.06, impactSpeed / 800);
          const rebound = 0; // Solid masonry/concrete: plastic deformation without rubber-band rebound

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
              preserveVelocity: true,
              isNarrowImpact: false,
              contactWidthPx: patch.widthPx
            };
          } else {
            vehicle.activeCrumple = {
              timer: crumpleDuration,
              totalDuration: crumpleDuration,
              normalX: col.normalX,
              normalY: col.normalY,
              initialSpeed: vehicle.speed,
              initialNormalSpeed: normalImpactSpeed,
              initialTangentialSpeed: velDotT,
              reboundSpeed: 0,
              contactX,
              contactY,
              preserveVelocity: false,
              isNarrowImpact: false,
              contactWidthPx: patch.widthPx
            };
          }

          // Apply physical plastic deformation to the car body
          applyVehicleDamageAndDeformation(vehicle, contactX, contactY, normalImpactSpeed, tangentialSpeed, world, 12000, patch.widthPx < vehicle.width * 0.35, patch.widthPx);

          // Re-evaluate collision against the newly crumpled hull so vehicle rests against the wall at its dented depth
          const recheck = checkCarBuildingCollision(vehicle, bld);
          if (recheck.collided) {
            vehicle.x += recheck.normalX * recheck.depth;
            vehicle.y += recheck.normalY * recheck.depth;
          }

          if (vehicle.isPlayerControlled || (player && player.isInVehicle && player.currentVehicleId === vehicle.id)) {
            sound.playCollision(Math.min(1.0, impactSpeed / 120));
            if (player) {
              applyDriverVehicleCrashTrauma(player, normalImpactSpeed, 'здание', 1.0, vehicle);
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
          vehicle.x += col.normalX * (col.depth + 0.03);
          vehicle.y += col.normalY * (col.depth + 0.03);
          if (!vehicle.isPlayerControlled && (isVehicleDisabledOrCrashed(vehicle) || vehicle.aiState === 'stopping_obstacle')) {
            if (Math.hypot(vehicle.vx, vehicle.vy) < 2.0) {
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

            // Нормальная/касательная составляющие относительно острова АЗС
            const stationParts = normalAndTangential(vehicle.vx, vehicle.vy, col.normalX, col.normalY);
            const stationNormalSpeed = stationParts.normalApproach;
            const stationTangentialSpeed = Math.abs(stationParts.tangential);

            vehicle.activeCrumple = {
              timer: crumpleDuration,
              totalDuration: crumpleDuration,
              normalX: col.normalX,
              normalY: col.normalY,
              initialSpeed: vehicle.speed,
              initialNormalSpeed: stationNormalSpeed,
              initialTangentialSpeed: stationParts.tangential,
              reboundSpeed: rebound,
              contactX,
              contactY,
              isNarrowImpact: true,
              contactWidthPx: 14.0
            };

            vehicle.x += col.normalX * col.depth;
            vehicle.y += col.normalY * col.depth;

            applyVehicleDamageAndDeformation(vehicle, contactX, contactY, stationNormalSpeed, stationTangentialSpeed, world, 12000, true);
          } else {
            vehicle.x += col.normalX * (col.depth + 0.03);
            vehicle.y += col.normalY * (col.depth + 0.03);
            vehicle.speed *= 0.4;
            vehicle.vx *= 0.4;
            vehicle.vy *= 0.4;
          }
        }
        break;
      }
    }
  }

  // Parking hold / anti-creep deadzone. Без него машина без водителя могла
  // бесконечно «дрожать» от остаточных шинных сил, крола АКПП и мелких
  // импульсов, хотя игрок не даёт тяги.
  {
    const isEngineActiveForHold = vehicle.engineState ? (vehicle.engineState.engineRunning || vehicle.engineState.isDieselRunaway) : false;
    const playerWantsMotion = !!input && isEngineActiveForHold && (input.forward || input.backward);
    const aiWantsMotion = !vehicle.isPlayerControlled && (
      (vehicle.targetSpeed || 0) > 0.3 ||
      (vehicle.idmAcceleration || 0) > 1.0
    );
    const busy = !!vehicle.activeCrumple ||
      (vehicle.pushedTimer || 0) > 0 ||
      (vehicle.spinoutTimer || 0) > 0 ||
      !!vehicle.towedById ||
      !!vehicle.trailerId;
    const lowSpeed = Math.abs(vehicle.speed) < 0.6 &&
      Math.hypot(vehicle.vx || 0, vehicle.vy || 0) < 0.6 &&
      Math.abs(vehicle.angularVelocity || 0) < 0.08;
    if (!playerWantsMotion && !aiWantsMotion && !busy && lowSpeed) {
      vehicle.speed = 0;
      vehicle.vx = 0;
      vehicle.vy = 0;
      vehicle.lateralVelocity = 0;
      vehicle.angularVelocity = 0;
      vehicle.knockbackVx = 0;
      vehicle.knockbackVy = 0;
      vehicle.knockbackSpin = 0;
    }
  }

  // World bounds clamp (full open-world size including northern wilderness)
  {
    const nb = vehicle.damage?.nodeBeam;
    if (nb) {
      const safeDt = Math.max(0.001, dt);
      const alpha = (vehicle.angularVelocity - prevAngularVelocity) / safeDt;
      nb.bodyAlpha = Number.isFinite(alpha) ? Math.max(-250, Math.min(250, alpha)) : 0;
      nb.bodyOmega = Number.isFinite(vehicle.angularVelocity) ? vehicle.angularVelocity : 0;
    }
  }
  sanitizeVehicleKinematics(vehicle);
  const minVehX = -4000;
  const maxVehX = Math.max(52000, world.width || 52000) - 15;
  const minVehY = -5000;
  const maxVehY = Math.max(30000, world.height || 30000) - 15;
  vehicle.x = Math.max(minVehX, Math.min(maxVehX, vehicle.x));
  vehicle.y = Math.max(minVehY, Math.min(maxVehY, vehicle.y));
}

export function updateDetachedParts(world: GameWorld, dt: number) {
  if (!world.detachedParts || world.detachedParts.length === 0) return;

  const parts = world.detachedParts;
  let writeIdx = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    p.life += dt;
    if (p.life > p.maxLife) continue;

    // Motion & Asphalt Friction
    const spd = Math.hypot(p.vx, p.vy);
    const fric = Math.pow(0.91, dt * 60);
    p.vx *= fric;
    p.vy *= fric;
    p.angularVelocity *= Math.pow(0.86, dt * 60);

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.angle += p.angularVelocity * dt;

    // Spark trails when sliding fast on asphalt
    if (spd > 15 && world.particles && Math.random() < 0.65) {
      world.particles.push({
        x: p.x + (Math.random() * p.length - p.length / 2),
        y: p.y + (Math.random() * p.width - p.width / 2),
        vx: -p.vx * 0.45 + (Math.random() - 0.5) * 25,
        vy: -p.vy * 0.45 + (Math.random() - 0.5) * 25,
        radius: 0.8 + Math.random() * 1.1,
        color: '#ffffff',
        secondaryColor: Math.random() < 0.7 ? '#fef08a' : '#fbbf24',
        alpha: 1.0,
        life: 0,
        maxLife: 0.12 + Math.random() * 0.16,
        type: 'spark',
        streakLength: 0.045,
        z: 0.4 + Math.random() * 0.6,
        vz: 8 + Math.random() * 18,
        bounces: 1
      });
    }

    // Retain active part
    parts[writeIdx++] = p;
  }
  parts.length = writeIdx;
}

export function updateSkidMarksAndParticles(world: GameWorld, player: Player, dt: number) {
  (world as any)._lastPlayer = player;

  // Handle micro-stutter frame freeze on heavy impact
  if (world.impactFreezeTimer && world.impactFreezeTimer > 0) {
    world.impactFreezeTimer -= dt;
    dt = dt * 0.15; // Slow down simulation tick during freeze frame
  }

  // Update physical detached body parts (hoods, bumpers, doors)
  updateDetachedParts(world, dt);

  // 0. Update atmospheric wind vector and thermodynamic temperature state
  updateWorldWind(world, dt);
  const atmo = getAtmosphereState(world, world.timeHour);
  const wind = atmo.wind;
  const outsideTemp = atmo.outsideTemp;
  const condFactor = atmo.condensationFactor;
  const windSpeed = wind.speed * (wind.gust ?? 1.0);

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
            vx: (Math.random() * 20 - 10) + wind.vx * 0.35,
            vy: -25 - Math.random() * 25 + wind.vy * 0.35,
            radius: 2.5 + st.radius * 0.35 + Math.random() * 4,
            color: Math.random() < 0.55 ? '#f59e0b': '#ef4444',
            alpha: 0.9,
            life: 0,
            maxLife: 0.3 + Math.random() * 0.35,
            type: 'flame'});

          // Dense soot smoke particle
          world.particles.push({
            x: st.x + (Math.random() * st.radius * 1.4 - st.radius * 0.7),
            y: st.y + (Math.random() * st.radius * 1.4 - st.radius * 0.7),
            vx: (Math.random() * 16 - 8) + wind.vx * 0.38,
            vy: -35 - Math.random() * 30 + wind.vy * 0.38,
            radius: 4.5 + st.radius * 0.5 + Math.random() * 6,
            color: st.type === 'oil'? '#090d16': '#1e293b',
            alpha: 0.85,
            initialAlpha: 0.85,
            life: 0,
            maxLife: 0.8 + Math.random() * 0.5,
            type: 'engine_smoke',
            tempC: 320,
            buoyancy: 28,
            expansionRate: 11
          });
        }

        // Occasional flying sparks
        if (Math.random() < 3.0 * dt) {
          world.particles.push({
            x: st.x + (Math.random() * st.radius - st.radius * 0.5),
            y: st.y + (Math.random() * st.radius - st.radius * 0.5),
            vx: (Math.random() * 80 - 40) + wind.vx * 0.55,
            vy: -15 - Math.random() * 20 + wind.vy * 0.55,
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
      updateFluidSpread(st, dt);

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
            vx: -cosA * 15 + (Math.random() * 24 - 12) + wind.vx * 0.35,
            vy: -sinA * 15 - 20 + (Math.random() * 24 - 12) + wind.vy * 0.35,
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
            vx: -cosA * 8 + (Math.random() * 16 - 8) + wind.vx * 0.40,
            vy: -sinA * 8 - 25 + (Math.random() * 16 - 8) + wind.vy * 0.40,
            radius: 8 + fireProgress * 12 + Math.random() * 8,
            color: '#0f172a',
            alpha: 0.82,
            initialAlpha: 0.82,
            life: 0,
            maxLife: 0.85 + Math.random() * 0.5,
            type: 'engine_smoke',
            tempC: 350,
            buoyancy: 28,
            expansionRate: 11
          });

          // 3. Flying sparks / embers
          if (Math.random() < 0.55) {
            world.particles.push({
              x: fireX,
              y: fireY,
              vx: (Math.random() * 90 - 45) + wind.vx * 0.55,
              vy: (Math.random() * 90 - 45) + wind.vy * 0.55,
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
                vx: -cosA * 4 + (Math.random() * 6 - 3) + wind.vx * 0.22,
                vy: -sinA * 4 - 22 + (Math.random() * 6 - 3) + wind.vy * 0.22, // rising stream
                radius: (2.4 + Math.random() * 1.8) * (1.0 + condFactor * 0.65),
                color: outsideTemp < 5 ? '#ffffff' : '#f8fafc',
                alpha: 0.65 + condFactor * 0.25,
                initialAlpha: 0.65 + condFactor * 0.25,
                life: 0,
                maxLife: (0.65 + Math.random() * 0.35) * (atmo.isCold ? 1.5 : 0.9),
                type: 'engine_smoke',
                isSteam: true,
                tempC: 102,
                buoyancy: 22,
                expansionRate: 11
              });
            }
          } else if (steamType === 'dense') {
            hasRenderedSteam = true;
            if (Math.random() < 0.70) {
              world.particles.push({
                x: hoodX + (Math.random() * 8 - 4),
                y: hoodY + (Math.random() * 8 - 4),
                vx: -cosA * 6 + (Math.random() * 12 - 6) + wind.vx * 0.25,
                vy: -sinA * 6 - 20 + (Math.random() * 10 - 5) + wind.vy * 0.25,
                radius: (5.5 + Math.random() * 4.0) * (1.0 + condFactor * 0.8),
                color: outsideTemp < 5 ? '#ffffff' : '#f8fafc', // dense bright white steam
                alpha: 0.85 + condFactor * 0.12,
                initialAlpha: 0.85 + condFactor * 0.12,
                life: 0,
                maxLife: (1.05 + Math.random() * 0.55) * (atmo.isCold ? 1.55 : 0.85),
                type: 'engine_smoke',
                isSteam: true,
                tempC: 108,
                buoyancy: 26,
                expansionRate: 13
              });
            }
          } else if (steamType === 'geyser') {
            hasRenderedSteam = true;
            const geyserCount = Math.floor(Math.random() * 2) + 1;
            for (let g = 0; g < geyserCount; g++) {
              world.particles.push({
                x: hoodX + (Math.random() * 5 - 2.5),
                y: hoodY + (Math.random() * 5 - 2.5),
                vx: -cosA * 12 + (Math.random() * 10 - 5) + wind.vx * 0.30,
                vy: -sinA * 12 - 45 - Math.random() * 25 + wind.vy * 0.30, // powerful geyser upwards blast
                radius: (5.0 + Math.random() * 4.5) * (1.0 + condFactor * 0.85),
                color: outsideTemp < 5 ? '#ffffff' : '#f8fafc',
                alpha: 0.92,
                initialAlpha: 0.92,
                life: 0,
                maxLife: (0.55 + Math.random() * 0.35) * (atmo.isCold ? 1.5 : 0.9),
                type: 'engine_smoke',
                isSteam: true,
                tempC: 115,
                buoyancy: 32,
                expansionRate: 15
              });
            }
          }

          // 2. SMOKE GENERATION
          if (smokeType === 'oil_blue') {
            hasRenderedSmoke = true;
            if (Math.random() < 0.50) {
              world.particles.push({
                x: hoodX + (Math.random() * 7 - 3.5),
                y: hoodY + (Math.random() * 7 - 3.5),
                vx: -cosA * 5 + (Math.random() * 14 - 7) + wind.vx * 0.32,
                vy: -sinA * 5 - 18 + (Math.random() * 12 - 6) + wind.vy * 0.32,
                radius: 4.5 + Math.random() * 3.5,
                color: '#64748b', // distinct blue-gray oil smoke color
                alpha: 0.75,
                initialAlpha: 0.75,
                life: 0,
                maxLife: 0.95 + Math.random() * 0.45,
                type: 'engine_smoke',
                tempC: 160,
                buoyancy: 18,
                expansionRate: 9
              });
            }
          } else if (smokeType === 'oil_gray_wiring_black') {
            hasRenderedSmoke = true;
            if (Math.random() < 0.60) {
              // Thick gray oil smoke
              world.particles.push({
                x: hoodX + (Math.random() * 9 - 4.5),
                y: hoodY + (Math.random() * 9 - 4.5),
                vx: -cosA * 6 + (Math.random() * 18 - 9) + wind.vx * 0.35,
                vy: -sinA * 6 - 25 + (Math.random() * 16 - 8) + wind.vy * 0.35,
                radius: 5.5 + Math.random() * 4.5,
                color: '#334155', // thick slate-gray oil smoke
                alpha: 0.85,
                initialAlpha: 0.85,
                life: 0,
                maxLife: 1.2 + Math.random() * 0.55,
                type: 'engine_smoke',
                tempC: 220,
                buoyancy: 22,
                expansionRate: 10
              });
            }
            if (Math.random() < 0.45) {
              // Acrid black wiring smoke
              world.particles.push({
                x: hoodX + (Math.random() * 7 - 3.5),
                y: hoodY + (Math.random() * 7 - 3.5),
                vx: -cosA * 4 + (Math.random() * 14 - 7) + wind.vx * 0.35,
                vy: -sinA * 4 - 32 + (Math.random() * 14 - 7) + wind.vy * 0.35,
                radius: 4.0 + Math.random() * 3.5,
                color: '#090d16', // dense pitch black wiring smoke
                alpha: 0.92,
                initialAlpha: 0.92,
                life: 0,
                maxLife: 1.05 + Math.random() * 0.45,
                type: 'engine_smoke',
                tempC: 260,
                buoyancy: 26,
                expansionRate: 9.5
              });
            }
          }

          // Fallback to standard white radiator steam if no other smoke/steam generated but smoking flag is set
          if (!hasRenderedSteam && !hasRenderedSmoke) {
            const isSteamFallback = !!car.engineState?.overheatingSteam;
            const fallbackColor = isSteamFallback ? (outsideTemp < 5 ? '#ffffff' : '#f8fafc') : '#94a3b8';
            world.particles.push({
              x: hoodX + (Math.random() * 7 - 3.5),
              y: hoodY + (Math.random() * 7 - 3.5),
              vx: -cosA * 15 + (Math.random() * 20 - 10) + wind.vx * 0.25,
              vy: -sinA * 15 + (Math.random() * 20 - 10) + wind.vy * 0.25,
              radius: (4 + Math.random() * 4.5) * (1.0 + (isSteamFallback ? condFactor * 0.75 : 0)),
              color: fallbackColor,
              alpha: 0.78,
              initialAlpha: 0.78,
              life: 0,
              maxLife: (0.75 + Math.random() * 0.45) * (atmo.isCold ? 1.5 : 0.9),
              type: 'engine_smoke',
              isSteam: isSteamFallback,
              tempC: isSteamFallback ? 105 : 90,
              buoyancy: 20,
              expansionRate: 11
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
          p.isSteam = item.isSteam;
          p.tempC = item.tempC;
          p.buoyancy = item.buoyancy;
          p.expansionRate = item.expansionRate;
          p.baseRadius = item.baseRadius;
          p.baseColor = item.baseColor;
          p.targetRadius = item.targetRadius;
          p.splatted = item.splatted;
          p.z = item.z;
          p.vz = item.vz;
          p.shapeSeed = item.shapeSeed;
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
      if (particlePool.length < 250) {
        particlePool.push(world.particles[i]);
      }
    }
    const remCount = performanceConfig.particleLimit;
    for (let i = 0; i < remCount; i++) {
      world.particles[i] = world.particles[i + excessCount];
    }
    world.particles.length = remCount;
  }

  // --- PLAYER & PEDESTRIAN COLD BREATH CONDENSATION EMISSION ---
  // When outside temperature is below 11°C, warm moist human breath condenses into visible steam clouds!
  if (!player.isInVehicle && !player.isInsideBuilding && outsideTemp < 11.0) {
    if ((player as any)._breathTimer === undefined) {
      (player as any)._breathTimer = 0.5 + Math.random() * 2.0;
    }
    (player as any)._breathTimer -= dt;

    if ((player as any)._breathTimer <= 0) {
      const isExhausted = (player.needs?.energy ?? 100) < 40 || player.speed > 80;
      // Normal breathing: every 3.5 - 4.5s; Heavy breathing / sprinting: every 1.4 - 2.0s
      (player as any)._breathTimer = isExhausted ? (1.4 + Math.random() * 0.6) : (3.5 + Math.random() * 1.0);

      const mouthDist = 12.0;
      const mouthX = player.x + Math.cos(player.angle) * mouthDist;
      const mouthY = player.y + Math.sin(player.angle) * mouthDist;

      const breathSpeed = isExhausted ? 24 : 14;
      const puffVx = Math.cos(player.angle) * breathSpeed + wind.vx * 0.22;
      const puffVy = Math.sin(player.angle) * breathSpeed + wind.vy * 0.22 - 6; // warm breath body draft

      const puffAlpha = 0.55 + condFactor * 0.25;
      const puffRadius = (isExhausted ? 2.4 : 1.6) + condFactor * 0.8;
      const puffLife = (isExhausted ? 1.0 : 0.75) + condFactor * 0.6;

      world.particles.push({
        x: mouthX,
        y: mouthY,
        vx: puffVx,
        vy: puffVy,
        radius: puffRadius,
        color: '#ffffff',
        alpha: puffAlpha,
        initialAlpha: puffAlpha,
        life: 0,
        maxLife: puffLife,
        type: 'exhaust',
        underVehicle: false,
        isSteam: true,
        tempC: 36.6,
        buoyancy: 8,
        expansionRate: 6.5
      });
    }
  }

  // Outdoor living pedestrians breathing in cold weather
  if (outsideTemp < 10.0 && world.pedestrians && world.pedestrians.length > 0) {
    const pedCount = world.pedestrians.length;
    for (let pi = 0; pi < pedCount; pi++) {
      const ped = world.pedestrians[pi];
      const dSq = (ped.x - player.x) * (ped.x - player.x) + (ped.y - player.y) * (ped.y - player.y);
      if (dSq > 360000) continue; // within 600px of player

      if ((ped as any)._breathTimer === undefined) {
        (ped as any)._breathTimer = Math.random() * 3.5;
      }
      (ped as any)._breathTimer -= dt;
      if ((ped as any)._breathTimer <= 0) {
        (ped as any)._breathTimer = 3.6 + Math.random() * 1.5;
        const pMouthX = ped.x + Math.cos(ped.angle) * 10;
        const pMouthY = ped.y + Math.sin(ped.angle) * 10;
        world.particles.push({
          x: pMouthX,
          y: pMouthY,
          vx: Math.cos(ped.angle) * 12 + wind.vx * 0.20,
          vy: Math.sin(ped.angle) * 12 + wind.vy * 0.20 - 5,
          radius: 1.5 + condFactor * 0.7,
          color: '#ffffff',
          alpha: 0.50 + condFactor * 0.20,
          initialAlpha: 0.50 + condFactor * 0.20,
          life: 0,
          maxLife: 0.7 + condFactor * 0.5,
          type: 'exhaust',
          underVehicle: false,
          isSteam: true,
          tempC: 36.6,
          buoyancy: 6,
          expansionRate: 5.5
        });
      }
    }
  }

  const pList = world.particles;
  const pCount = pList.length;
  let pWrite = 0;

  for (let i = 0; i < pCount; i++) {
    const p = pList[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.type === 'exhaust') {
      // 1. Aerodynamic wind advection: aerosol particles quickly align with wind vector
      p.vx += (wind.vx - p.vx) * Math.min(1.0, 3.2 * dt);
      p.vy += (wind.vy - p.vy) * Math.min(1.0, 3.2 * dt);

      // 2. Thermal buoyancy in cold air: hot exhaust/steam gas rises faster in denser cold air
      const gasTemp = p.tempC ?? (p.isSteam ? 85 : 75);
      const deltaT = Math.max(0, gasTemp - outsideTemp);
      const buoyancy = (p.buoyancy ?? 8.0) * (1.0 + Math.min(1.5, deltaT / 40.0));
      p.vy -= buoyancy * dt;

      // 3. Volumetric gas expansion: in cold air, condensation causes clouds to bloom dramatically!
      const isCondensing = p.isSteam || condFactor > 0.25;
      const expansionRate = (p.expansionRate ?? 8.5) * (1.0 + (isCondensing ? condFactor * 0.90 : 0));
      p.radius += dt * (expansionRate + p.radius * 0.32);

      // 4. Micro-eddy atmospheric turbulence / flutter perpendicular to wind
      const perpX = -Math.sin(wind.angle);
      const perpY = Math.cos(wind.angle);
      const flutter = Math.sin(p.life * 6.5 + p.y * 0.04) * (3.5 * dt);
      p.x += perpX * flutter;
      p.y += perpY * flutter;

      // 5. Dissipation speed: wind shear and dry warm air accelerate dissipation; cold calm air preserves steam!
      const windShearDispersal = 1.0 + (windSpeed / 75.0) * 0.85;
      const tempEvap = isCondensing
        ? Math.max(0.35, Math.min(2.4, (outsideTemp + 8.0) / 18.0))
        : Math.max(0.65, Math.min(1.8, (outsideTemp + 15.0) / 30.0));
      const dissipationRate = windShearDispersal * tempEvap;
      p.life += dt * dissipationRate;

      // 6. Volumetric dispersion & distinctness curve:
      const baseAlpha = p.initialAlpha ?? 0.50;
      const progress = Math.min(1.0, Math.max(0, p.life / p.maxLife));
      // In cold calm air, steam droplets form a cohesive distinct plume (lower decay exponent)
      // In high wind or hot dry air, smoke diffuses softly and disappears quickly (higher decay exponent)
      const falloffPower = (isCondensing && windSpeed < 50) ? 0.75 : (windSpeed > 100 ? 1.35 : 0.95);
      p.alpha = baseAlpha * Math.pow(Math.max(0, 1.0 - progress), falloffPower);
    } else if (p.type === 'tire_smoke'|| p.type === 'engine_smoke') {
      // Wind advection
      p.vx += (wind.vx - p.vx) * Math.min(1.0, 2.8 * dt);
      p.vy += (wind.vy - p.vy) * Math.min(1.0, 2.8 * dt);

      const isRadiatorSteam = p.isSteam || (p.color && (p.color === '#ffffff' || p.color.startsWith('#f')));
      const gasTemp = p.tempC ?? (p.isSteam ? 110 : 250);
      const deltaT = Math.max(0, gasTemp - outsideTemp);
      const buoyancy = (p.buoyancy ?? (p.type === 'engine_smoke' ? 18.0 : 8.0)) * (1.0 + Math.min(1.6, deltaT / 60.0));
      p.vy -= buoyancy * dt;

      const expMult = isRadiatorSteam ? (1.0 + condFactor * 0.90) : (1.0 + condFactor * 0.35);
      p.radius += dt * ((p.expansionRate ?? 8.5) * expMult + p.radius * 0.32);

      const perpX = -Math.sin(wind.angle);
      const perpY = Math.cos(wind.angle);
      p.x += perpX * (Math.sin(p.life * 5.0 + p.y * 0.04) * (4.0 * dt));
      p.y += perpY * (Math.sin(p.life * 5.0 + p.y * 0.04) * (4.0 * dt));

      // Dissipation speed: wind shear + temperature evaporation
      const windShearDispersal = 1.0 + (windSpeed / 70.0) * 0.85;
      const tempEvap = isRadiatorSteam
        ? Math.max(0.35, Math.min(2.4, (outsideTemp + 8.0) / 18.0))
        : Math.max(0.65, Math.min(1.8, (outsideTemp + 15.0) / 30.0));
      p.life += dt * (windShearDispersal * tempEvap);

      const baseAlpha = p.initialAlpha !== undefined ? p.initialAlpha : (p.type === 'engine_smoke' ? 0.85 : 0.65);
      const progress = Math.min(1.0, Math.max(0, p.life / p.maxLife));
      const falloffPower = (isRadiatorSteam && condFactor > 0.4 && windSpeed < 50) ? 0.75 : 0.90;
      p.alpha = baseAlpha * Math.pow(Math.max(0, 1.0 - progress), falloffPower);
    } else if (p.type === 'dust') {
      // Atmospheric dust carried by wind
      p.vx += (wind.vx - p.vx) * Math.min(1.0, 1.8 * dt);
      p.vy += (wind.vy - p.vy) * Math.min(1.0, 1.8 * dt);
      const targetR = p.targetRadius || 26.0;
      p.radius += (targetR - p.radius) * Math.min(1.0, 3.2 * dt);
      p.x += Math.sin(p.life * 2.0 + p.y * 0.04) * (2.0 * dt);
      p.y += Math.cos(p.life * 1.8 + p.x * 0.04) * (1.5 * dt);
      const windShear = 1.0 + (windSpeed / 80.0) * 0.5;
      p.life += dt * windShear;
      const baseAlpha = p.initialAlpha ?? 0.75;
      const progress = Math.min(1.0, Math.max(0, p.life / p.maxLife));
      p.alpha = baseAlpha * Math.pow(Math.max(0, 1.0 - progress), 1.1);
    } else if (p.type === 'flame') {
      // Flame tongues tilt downwind under wind force
      p.vx += wind.vx * (0.35 * dt);
      p.vy += wind.vy * (0.35 * dt) - 15 * dt;
      p.life += dt * (1.0 + (windSpeed / 100.0) * 0.4);
      p.alpha = Math.max(0, 1 - (p.life / p.maxLife));
    } else if (p.type === 'spark') {
      // BeamNG-grade incandescent spark dynamics: severe aerodynamic drag, ballistic bounce & wind advection
      const drag = Math.pow(0.50, dt * 60);
      p.vx *= drag;
      p.vy *= drag;

      // Ballistic height & asphalt bounce
      if (p.z !== undefined) {
        p.vz = (p.vz ?? 15) - 340 * dt;
        p.z += p.vz * dt;
        if (p.z <= 0) {
          p.z = 0;
          if ((p.bounces ?? 1) > 0) {
            p.bounces = (p.bounces ?? 1) - 1;
            p.vz = -p.vz * 0.35; // Ground ricochet
            p.vx += (Math.random() - 0.5) * 30;
            p.vy += (Math.random() - 0.5) * 30;
          } else {
            p.vz = 0;
          }
        }
      }

      p.vx += (wind.vx - p.vx) * Math.min(1.0, 1.2 * dt);
      p.vy += (wind.vy - p.vy) * Math.min(1.0, 1.2 * dt);
      p.life += dt;
      const progress = p.life / p.maxLife;
      p.alpha = Math.max(0, 1.0 - Math.pow(progress, 1.5));
    } else if (p.type === 'glass_shard') {
      // BeamNG-grade tempered safety glass & lens shatter: 3D ballistic arc, rotational tumbling, asphalt bouncing and skidding
      p.life += dt;

      if (!p.splatted) {
        p.angle = (p.angle ?? 0) + (p.angularVelocity ?? 0) * dt;
        if (p.z === undefined) p.z = 1.4;
        if (p.vz === undefined) p.vz = 25;
        p.vz -= 360 * dt; // Gravity
        p.z += p.vz * dt;

        if (p.z <= 0) {
          p.z = 0;
          if ((p.bounces ?? 2) > 0) {
            p.bounces = (p.bounces ?? 2) - 1;
            p.vz = -p.vz * 0.28; // Low-restitution bounce on hard asphalt
            p.vx *= 0.65;
            p.vy *= 0.65;
            p.angularVelocity = (p.angularVelocity ?? 0) * 0.75;
          } else {
            p.vz = 0;
            p.vx = 0;
            p.vy = 0;
            p.angularVelocity = 0;
            p.splatted = true;
            p.isGrounded = true;
          }
        } else {
          // Air drag during flight
          p.vx *= Math.pow(0.94, dt * 60);
          p.vy *= Math.pow(0.94, dt * 60);
        }

        const progress = Math.min(1.0, p.life / Math.min(2.5, p.maxLife));
        p.alpha = Math.max(0, (p.initialAlpha ?? 0.95) * (1.0 - Math.pow(progress, 2.0)));
      } else {
        // Resting permanently on the asphalt ground
        p.z = 0;
        p.vz = 0;
        p.vx = 0;
        p.vy = 0;
        p.angularVelocity = 0;
        p.alpha = p.initialAlpha ?? 0.92;
      }
    } else if (p.type === 'debris') {
      // BeamNG-grade vehicle body debris: torn sheet metal flakes, plastic clips, concrete chips
      p.life += dt;

      if (!p.splatted) {
        p.angle = (p.angle ?? 0) + (p.angularVelocity ?? 0) * dt;
        if (p.z === undefined) p.z = 1.2;
        if (p.vz === undefined) p.vz = 20;
        p.vz -= 380 * dt; // Gravity
        p.z += p.vz * dt;

        if (p.z <= 0) {
          p.z = 0;
          if ((p.bounces ?? 2) > 0) {
            p.bounces = (p.bounces ?? 2) - 1;
            p.vz = -p.vz * 0.24;
            p.vx *= 0.60;
            p.vy *= 0.60;
            p.angularVelocity = (p.angularVelocity ?? 0) * 0.65;
          } else {
            p.vz = 0;
            p.vx = 0;
            p.vy = 0;
            p.angularVelocity = 0;
            p.splatted = true;
            p.isGrounded = true;
          }
        } else {
          // Air drag
          p.vx *= Math.pow(0.92, dt * 60);
          p.vy *= Math.pow(0.92, dt * 60);
        }

        const progress = Math.min(1.0, p.life / Math.min(2.5, p.maxLife));
        p.alpha = Math.max(0, (p.initialAlpha ?? 0.90) * (1.0 - Math.pow(progress, 2.2)));
      } else {
        // Resting permanently on the asphalt ground
        p.z = 0;
        p.vz = 0;
        p.vx = 0;
        p.vy = 0;
        p.angularVelocity = 0;
        p.alpha = p.initialAlpha ?? 0.90;
      }
    } else if (p.type === 'mud_clod') {
      // Solid heavy earth projectile with 3D ballistic arc, gravity and ground splatter
      p.life += dt;
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
      p.life += dt;
      p.alpha = Math.max(0, 1 - (p.life / p.maxLife));
    } else {
      p.life += dt;
      p.alpha = Math.max(0, 1 - (p.life / p.maxLife));
    }

    // Dynamic off-screen early culling & persistent ground debris
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const isOffscreen = (dx * dx + dy * dy > 3240000); // 1800^2 px
    const isGroundDebris = (p.type === 'glass_shard' || p.type === 'debris') && p.splatted;

    if (isGroundDebris) {
      // Glass & plastic debris remain on ground while in reasonable range around player
      if (!isOffscreen && p.life < (p.maxLife || 600)) {
        pList[pWrite++] = p;
      } else if (particlePool.length < 250) {
        particlePool.push(p);
      }
    } else {
      if (p.life < p.maxLife && !isOffscreen) {
        pList[pWrite++] = p;
      } else {
        if (particlePool.length < 250) {
          particlePool.push(p); // Recycle to pool without unbounded array growth
        }
      }
    }
  }
  pList.length = pWrite;
  if (particlePool.length > 250) {
    particlePool.length = 250;
  }
}

const scratchVehicleSet = new Set<Vehicle>();

export function updateBreakablePropsAndLivingWorld(world: GameWorld, player: Player, dt: number, vehGrid?: any) {
  const weatherWeights = getEffectiveWeatherWeights(world);
  const isRaining = weatherWeights.rain > 0.15;

  // Spawn new puddles dynamically if it's raining
  if (isRaining) {
    const nonPondPuddles = world.puddles.filter(p => !p.isPond);
    if (nonPondPuddles.length < 50 && Math.random() < 0.05 * weatherWeights.rain) {
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
            const crumpleDuration = 0.10 + Math.min(0.08, impactSpeed / 800);

            // Столб/дерево: в урон и травму идёт только нормальная составляющая
            // (касательная — скольжение вдоль столба), см. damageModel.ts.
            const poleParts = normalAndTangential(veh.vx, veh.vy, normX, normY);
            const poleNormalSpeed = poleParts.normalApproach;
            const poleTangentialSpeed = Math.abs(poleParts.tangential);

            veh.activeCrumple = {
              timer: crumpleDuration,
              totalDuration: crumpleDuration,
              normalX: normX,
              normalY: normY,
              initialSpeed: veh.speed,
              initialNormalSpeed: poleNormalSpeed,
              initialTangentialSpeed: poleParts.tangential,
              reboundSpeed: 0, // Solid concrete pole / tree: plastic wrapping with zero bounceback
              contactX,
              contactY,
              isNarrowImpact: true,
              contactWidthPx: propContactWidthPx(hitbox, prop.angle || 0, normX, normY)
            };

            // First apply structural plastic deformation at contact point
            applyVehicleDamageAndDeformation(veh, contactX, contactY, poleNormalSpeed, poleTangentialSpeed, world, 14000, true,
              propContactWidthPx(hitbox, prop.angle || 0, normX, normY));

            // Recheck collision against the freshly deformed metal so vehicle only clamps residual overlap,
            // allowing the pole to remain deeply nestled inside the dent!
            const recheck = checkPropVehicleCollision(prop, veh);
            if (recheck.collided) {
              veh.x += recheck.pushX;
              veh.y += recheck.pushY;
            }

            sound.playCollision(Math.min(1.0, impactSpeed / 80));

            if (player && (veh.isPlayerControlled || (player.isInVehicle && player.currentVehicleId === veh.id))) {
              applyDriverVehicleCrashTrauma(player, poleNormalSpeed, hitbox.displayNameRu, 1.2, veh);
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
            veh.x += col.pushX;
            veh.y += col.pushY;
            veh.speed *= 0.4;
            veh.vx *= 0.4;
            veh.vy *= 0.4;
          }
        }

        // Concrete chip dust debris
        for (let d = 0; d < 8; d++) {
          const dAngle = Math.random() * Math.PI * 2;
          const dSpeed = 25 + Math.random() * 70;
          world.particles.push({
            x: contactX,
            y: contactY,
            vx: Math.cos(dAngle) * dSpeed,
            vy: Math.sin(dAngle) * dSpeed,
            radius: 0.45 + Math.random() * 0.55,
            aspect: 1.1 + Math.random() * 0.4,
            color: '#a8a29e',
            alpha: 0.90,
            life: 0,
            maxLife: 300.0,
            type: 'debris',
            debrisSubtype: 'concrete_chip',
            angle: Math.random() * Math.PI * 2,
            angularVelocity: (Math.random() - 0.5) * 20,
            shapeSeed: Math.floor(Math.random() * 10000),
            z: 0.8 + Math.random() * 1.0,
            vz: 15 + Math.random() * 25,
            bounces: 2,
            splatted: false
          });
        }
        continue; // Indestructible: remains standing and intact
      }

      if (!veh.isPlayerControlled && (isVehicleDisabledOrCrashed(veh) || (veh.aiState === 'stopping_obstacle' && Math.abs(veh.speed) < 2.0))) {
        // Stopped/crashed NPC cannot break props or gain speed from prop pushing
        veh.x += col.pushX * 1.02;
        veh.y += col.pushY * 1.02;
        if (Math.hypot(veh.vx, veh.vy) < 2.0) {
          veh.speed = 0;
          veh.vx = 0;
          veh.vy = 0;
          veh.angularVelocity = 0;
          veh.steerAngle = 0;
          continue;
        }
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
            if (Math.hypot(veh.vx, veh.vy) < 2.0) {
              veh.speed = 0;
              veh.vx = 0;
              veh.vy = 0;
              veh.angularVelocity = 0;
              veh.steerAngle = 0;
            } else {
              veh.speed = Math.hypot(veh.vx, veh.vy) * Math.sign(veh.speed || 1);
            }
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

      // Нормальная составляющая — в урон/травму, касательная — скольжение
      const propPushLen = Math.hypot(col.pushX, col.pushY) || 1;
      const propParts = normalAndTangential(veh.vx, veh.vy, col.pushX / propPushLen, col.pushY / propPushLen);
      const propNormalSpeed = propParts.normalApproach;
      const propTangentialSpeed = Math.abs(propParts.tangential);

      prop.breakVX = Math.cos(veh.angle) * Math.max(35, rawImpactSpeed) * 0.8;
      prop.breakVY = Math.sin(veh.angle) * Math.max(35, rawImpactSpeed) * 0.8;
      prop.breakAngle = veh.angle + (Math.random() - 0.5) * 0.4;
      prop.breakSpin = (Math.random() - 0.5) * 10;

      sound.playPropBreak(prop.type);

      // Vehicle damage & deformation scaled by prop resistance.
      // Масса 12000 — проп стоит на грунте: его слабость задаётся
      // множителем propResistance на скорость, а не фиктивной массой.
      // contactWidthPx — «тень» хитбокса: узкий столбик продавливает глубже,
      // чем широкий контейнер, на ту же энергию.
      applyVehicleDamageAndDeformation(veh, col.contactX, col.contactY, propNormalSpeed * propResistance, propTangentialSpeed, world, 12000, true,
        propContactWidthPx(hitbox, prop.angle || 0, col.pushX / propPushLen, col.pushY / propPushLen));

      if (player && (veh.isPlayerControlled || (player.isInVehicle && player.currentVehicleId === veh.id))) {
        applyDriverVehicleCrashTrauma(player, propNormalSpeed, hitbox.displayNameRu, propResistance, veh);
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
      let debrisSubtype: 'plastic_chunk' | 'metal_flake' | 'concrete_chip' = 'plastic_chunk';

      if (prop.type === 'hydrant') { debrisColor = '#ef4444'; debrisCount = 10; debrisSubtype = 'metal_flake'; }
      else if (prop.type === 'bench') { debrisColor = '#b45309'; debrisCount = 10; }
      else if (prop.type === 'bus_stop') { debrisColor = '#94a3b8'; debrisCount = 12; debrisSubtype = 'metal_flake'; }
      else if (prop.type === 'dumpster') { debrisColor = '#15803d'; debrisCount = 12; debrisSubtype = 'metal_flake'; }
      else if (prop.type === 'trash_can') { debrisColor = '#475569'; debrisCount = 8; debrisSubtype = 'metal_flake'; }
      else if (prop.type === 'kiosk') { debrisColor = '#0284c7'; debrisCount = 14; debrisSubtype = 'metal_flake'; }
      else if (prop.type === 'mailbox') { debrisColor = '#2563eb'; debrisCount = 8; debrisSubtype = 'metal_flake'; }
      else if (prop.type === 'flowerbed') { debrisColor = '#15803d'; debrisCount = 10; }
      else if (prop.type === 'tire_flowerbed') { debrisColor = '#1e293b'; debrisCount = 10; }
      else if (prop.type === 'cone') { debrisColor = '#ea580c'; debrisCount = 6; }
      else if (prop.type === 'bollard') { debrisColor = '#334155'; debrisCount = 6; debrisSubtype = 'metal_flake'; }
      else if (prop.type === 'traffic_light') { debrisColor = '#eab308'; debrisCount = 10; debrisSubtype = 'metal_flake'; }
      else if (prop.type === 'lamp_highway'|| prop.type === 'lamp') { debrisColor = '#94a3b8'; debrisCount = 10; debrisSubtype = 'metal_flake'; }

      for (let d = 0; d < debrisCount; d++) {
        const dAngle = Math.random() * Math.PI * 2;
        const dSpeed = 40 + Math.random() * 85;
        world.particles.push({
          x: col.contactX,
          y: col.contactY,
          vx: Math.cos(dAngle) * dSpeed,
          vy: Math.sin(dAngle) * dSpeed,
          radius: 0.50 + Math.random() * 0.55,
          aspect: 1.2 + Math.random() * 0.4,
          color: debrisColor,
          secondaryColor: '#334155',
          alpha: 0.92,
          life: 0,
          maxLife: 300.0,
          type: 'debris',
          debrisSubtype,
          angle: Math.random() * Math.PI * 2,
          angularVelocity: (Math.random() - 0.5) * 22,
          shapeSeed: Math.floor(Math.random() * 10000),
          z: 1.0 + Math.random() * 1.4,
          vz: 18 + Math.random() * 32,
          bounces: 2,
          splatted: false
        });
      }

      // Shattered glass panels for bus stop shelters
      if (prop.type === 'bus_stop') {
        const glassCount = 18 + Math.floor(Math.random() * 12);
        for (let g = 0; g < glassCount; g++) {
          const gAngle = Math.random() * Math.PI * 2;
          const gSpeed = 35 + Math.random() * 75;
          world.particles.push({
            x: col.contactX + (Math.random() - 0.5) * 12,
            y: col.contactY + (Math.random() - 0.5) * 12,
            vx: Math.cos(gAngle) * gSpeed,
            vy: Math.sin(gAngle) * gSpeed,
            radius: 0.40 + Math.random() * 0.45,
            aspect: 1.1 + Math.random() * 0.4,
            color: 'rgba(224, 242, 254, 0.88)',
            alpha: 0.95,
            life: 0,
            maxLife: 300.0,
            type: 'glass_shard',
            glassSubtype: 'safety_pebble',
            angle: Math.random() * Math.PI * 2,
            angularVelocity: (Math.random() - 0.5) * 26,
            shapeSeed: Math.floor(Math.random() * 10000),
            z: 1.4 + Math.random() * 1.8,
            vz: 24 + Math.random() * 40,
            bounces: 2,
            splatted: false
          });
        }
      }

      // Shattered lamp / traffic light lenses
      if (prop.type === 'lamp_highway'|| prop.type === 'lamp'|| prop.type === 'traffic_light') {
        for (let g = 0; g < 8; g++) {
          const gAngle = Math.random() * Math.PI * 2;
          const gSpeed = 30 + Math.random() * 60;
          world.particles.push({
            x: prop.x,
            y: prop.y,
            vx: Math.cos(gAngle) * gSpeed,
            vy: Math.sin(gAngle) * gSpeed,
            radius: 1.2 + Math.random() * 1.8,
            aspect: 1.3 + Math.random() * 0.8,
            color: (prop.type === 'traffic_light' && g % 2 === 0) ? '#fbbf24' : '#f8fafc',
            alpha: 0.95,
            life: 0,
            maxLife: 300.0,
            type: 'glass_shard',
            glassSubtype: 'headlight',
            angle: Math.random() * Math.PI * 2,
            angularVelocity: (Math.random() - 0.5) * 25,
            shapeSeed: Math.floor(Math.random() * 10000),
            z: 1.6 + Math.random() * 1.6,
            vz: 22 + Math.random() * 35,
            bounces: 2,
            splatted: false
          });
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
  const isFreezing = isWorldFreezing(world);
  for (let i = world.puddles.length - 1; i >= 0; i--) {
    const puddle = world.puddles[i];
    if (!isFreezing) {
      puddle.rippleTimer += dt;
    }
    
    // Evaporation if not raining, NOT freezing, and not a pond
    if (!isRaining && !isFreezing && !puddle.isPond) {
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
          if (isFreezing) {
            // Chipped ice particles & frost spray instead of liquid blue splashes
            if (Math.random() < 0.25) {
              world.particles.push({
                x: veh.x + (Math.random() * 12 - 6),
                y: veh.y + (Math.random() * 12 - 6),
                vx: (Math.random() * 40 - 20),
                vy: (Math.random() * 40 - 20),
                radius: 1.5 + Math.random() * 1.5,
                color: '#f8fafc',
                alpha: 0.8,
                life: 0,
                maxLife: 0.25,
                type: 'dust'
              });
            }
          } else {
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

          // Align towed car velocity along its rolling axis with realistic tire cornering grip (no ice skating)
          const headCos = Math.cos(towedCar.angle);
          const headSin = Math.sin(towedCar.angle);
          const longSpeed = towedCar.vx * headCos + towedCar.vy * headSin;
          const latSpeed = -towedCar.vx * headSin + towedCar.vy * headCos;

          // Realistic tire lateral cornering stiffness: tires resist sideways motion firmly, creating authentic tracking
          const lateralDamp = 0.22; // 78% lateral friction damping per frame (firm asphalt grip instead of 88% slip)
          towedCar.vx = headCos * longSpeed + (-headSin * latSpeed * (1 - lateralDamp));
          towedCar.vy = headSin * longSpeed + (headCos * latSpeed * (1 - lateralDamp));
          towedCar.speed = longSpeed;

          // Apply rolling resistance and tire scrub drag to both towing and towed vehicles so they don't slide freely like on ice
          towedCar.vx *= 0.985;
          towedCar.vy *= 0.985;
          vehA.vx *= 0.992;
          vehA.vy *= 0.992;
          vehB.vx *= 0.992;
          vehB.vy *= 0.992;
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




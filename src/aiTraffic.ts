import { Building, CarType, DriverArchetype, DriverProfile, GameWorld, Intersection, Pedestrian, PedestrianPath, RoadSegment, Vector2D, Vehicle, StreetProp } from './types';
import { CAR_CONFIGS, CAR_PALETTE, createDefaultVehicleDamage, generateRandomPedestrianAppearance, createDefaultFuelSystem, createDefaultEngineState, PX_S_TO_SPEED_KMH, SPEED_KMH_TO_PX_S } from './vehicleHelpers';
import { applyPowertrain } from './powertrainVariants';
import { sound } from './audio';
import { checkPedestrianBuildingCollision, getBuildingEntrancePos, checkPedestrianVehicleCollision, getPropHitbox } from './physics';
import { SpatialGrid } from './spatialGrid';
import { performanceConfig } from './performanceConfig';
import { isRoadSegmentBlocked, calculateGpsRoute } from './navigation';
import { getLevelCrossings, isCrossingApproachOccupied } from './levelCrossingSystem';

// Helper: angle difference normalized to [-PI, PI]
export function angleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

// Distance helper
function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

interface OBB {
  x: number;
  y: number;
  hl: number; // half length
  hw: number; // half width
  cos: number;
  sin: number;
}

function getOBB(car: Vehicle, safetyMargin: number = 0): OBB {
  return {
    x: car.x,
    y: car.y,
    hl: (car.length / 2) + safetyMargin,
    hw: (car.width / 2) + safetyMargin,
    cos: Math.cos(car.angle),
    sin: Math.sin(car.angle)
  };
}

function getOBBCorners(obb: OBB) {
  const { x, y, hl, hw, cos, sin } = obb;
  return [
    { x: x + cos * hl - sin * hw, y: y + sin * hl + cos * hw },
    { x: x + cos * hl + sin * hw, y: y + sin * hl - cos * hw },
    { x: x - cos * hl + sin * hw, y: y - sin * hl - cos * hw },
    { x: x - cos * hl - sin * hw, y: y - sin * hl + cos * hw }
  ];
}

// High-performance Separating Axis Theorem (SAT) with zero allocations and O(1) early exit
function isOBBOverlapping(obb1: OBB, obb2: OBB): boolean {
  const dx = obb2.x - obb1.x;
  const dy = obb2.y - obb1.y;

  // Dot products between orientation axes
  const c = obb1.cos * obb2.cos + obb1.sin * obb2.sin;
  const s = -obb1.sin * obb2.cos + obb1.cos * obb2.sin;
  const absC = Math.abs(c);
  const absS = Math.abs(s);

  // Axis 1: obb1 forward
  const d1 = Math.abs(dx * obb1.cos + dy * obb1.sin);
  if (d1 > obb1.hl + obb2.hl * absC + obb2.hw * absS) return false;

  // Axis 2: obb1 lateral
  const d2 = Math.abs(-dx * obb1.sin + dy * obb1.cos);
  if (d2 > obb1.hw + obb2.hl * absS + obb2.hw * absC) return false;

  // Axis 3: obb2 forward
  const d3 = Math.abs(dx * obb2.cos + dy * obb2.sin);
  if (d3 > obb2.hl + obb1.hl * absC + obb1.hw * absS) return false;

  // Axis 4: obb2 lateral
  const d4 = Math.abs(-dx * obb2.sin + dy * obb2.cos);
  if (d4 > obb2.hw + obb1.hl * absS + obb1.hw * absC) return false;

  return true;
}

function isLineSegmentIntersecting(p1: {x: number, y: number}, p2: {x: number, y: number}, q1: {x: number, y: number}, q2: {x: number, y: number}): boolean {
  const det = (p2.x - p1.x) * (q2.y - q1.y) - (q2.x - q1.x) * (p2.y - p1.y);
  if (Math.abs(det) < 0.0001) return false;
  
  const lambda = ((q2.y - q1.y) * (q2.x - p1.x) + (q1.x - q2.x) * (q2.y - p1.y)) / det;
  const gamma = ((p1.y - p2.y) * (q2.x - p1.x) + (p2.x - p1.x) * (q2.y - p1.y)) / det;
  
  return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
}

function isPointInsideOBB(pt: {x: number, y: number}, obb: OBB): boolean {
  const dx = pt.x - obb.x;
  const dy = pt.y - obb.y;
  const localX = dx * obb.cos + dy * obb.sin;
  const localY = -dx * obb.sin + dy * obb.cos;
  return Math.abs(localX) <= obb.hl && Math.abs(localY) <= obb.hw;
}

// Zero-allocation ray-OBB test via local coordinate frame and slab clipping
function isRayIntersectingOBB(rayStart: {x: number, y: number}, rayEnd: {x: number, y: number}, obb: OBB): boolean {
  const dx0 = rayStart.x - obb.x;
  const dy0 = rayStart.y - obb.y;
  const lx0 = dx0 * obb.cos + dy0 * obb.sin;
  const ly0 = -dx0 * obb.sin + dy0 * obb.cos;

  const hl = obb.hl;
  const hw = obb.hw;

  // Fast check: start point inside OBB
  if (Math.abs(lx0) <= hl && Math.abs(ly0) <= hw) {
    return true;
  }

  const dx1 = rayEnd.x - obb.x;
  const dy1 = rayEnd.y - obb.y;
  const lx1 = dx1 * obb.cos + dy1 * obb.sin;
  const ly1 = -dx1 * obb.sin + dy1 * obb.cos;

  const rx = lx1 - lx0;
  const ry = ly1 - ly0;

  let tEnter = 0;
  let tExit = 1;

  // Slab X
  if (Math.abs(rx) < 1e-7) {
    if (Math.abs(lx0) > hl) return false;
  } else {
    const invRx = 1 / rx;
    let t1 = (-hl - lx0) * invRx;
    let t2 = (hl - lx0) * invRx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tEnter) tEnter = t1;
    if (t2 < tExit) tExit = t2;
    if (tEnter > tExit) return false;
  }

  // Slab Y
  if (Math.abs(ry) < 1e-7) {
    if (Math.abs(ly0) > hw) return false;
  } else {
    const invRy = 1 / ry;
    let t1 = (-hw - ly0) * invRy;
    let t2 = (hw - ly0) * invRy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tEnter) tEnter = t1;
    if (t2 < tExit) tExit = t2;
    if (tEnter > tExit) return false;
  }

  return true;
}

// --- TELEMETRY & DIAGNOSTICS LOG BUFFER ---
export interface TrafficLogEntry {
  id: number;
  timestamp: string;
  type: 'info'| 'yield'| 'deadlock'| 'light'| 'reverse';
  message: string;
  vehicleId?: string;
  intersectionId?: string;
}

class TrafficDiagnostics {
  public logs: TrafficLogEntry[] = [];
  private nextLogId: number = 1;
  public totalPassedThrough: number = 0;
  public gridlockCount: number = 0;
  public averageSpeed: number = 0;
  public debugOverlayEnabled: boolean = false;
  
  // Advanced Predictive AI Telemetry Metrics
  public predictedGridlocksPrevented: number = 0;
  public cyclesDissolved: number = 0;
  public boxBlocksAvoided: number = 0;
  public activeWavePasses: number = 0;
  public adaptivePhaseSwitches: number = 0;

  public log(type: TrafficLogEntry['type'], message: string, vehicleId?: string, intersectionId?: string) {
    const d = new Date();
    const ts = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    this.logs.unshift({
      id: this.nextLogId++,
      timestamp: ts,
      type,
      message,
      vehicleId,
      intersectionId
    });
    if (this.logs.length > 250) {
      this.logs.pop();
    }
  }

  public clearLogs() {
    this.logs = [];
  }
}

export const trafficDiagnostics = new TrafficDiagnostics();

export interface IntersectionReservation {
  tokenId: string;
  vehicleId: string;
  intersectionId: string;
  entryTime: number;
  windowStart: number;
  windowEnd: number;
  pathWaypoints: Vector2D[];
  turnType: 'straight' | 'left' | 'right' | 'turnaround';
  stopLineDirection?: 'north' | 'south' | 'east' | 'west';
  estimatedSpeed: number;
  estimatedDuration: number;
  isWaveLeader?: boolean;
  exclusivePriority: boolean;
}

export interface WaitingQueueEntry {
  vehicleId: string;
  intersectionId: string;
  stopLineDirection?: 'north' | 'south' | 'east' | 'west';
  turnType: 'straight' | 'left' | 'right' | 'turnaround';
  pathWaypoints: Vector2D[];
  targetLaneId: string;
  waitTime: number;
  spillbackBlocked?: boolean;
  priorityScore?: number;
}

export interface DeadlockCycle {
  intersectionId: string;
  cycleVehicles: string[];
  leadBreakerId: string;
  detectedTime: number;
}

// 2D Line Segment Intersection Test
export function getLineSegmentIntersection(
  p1: Vector2D,
  p2: Vector2D,
  p3: Vector2D,
  p4: Vector2D
): { intersects: boolean; point?: Vector2D; s?: number; t?: number } {
  const dX12 = p2.x - p1.x;
  const dY12 = p2.y - p1.y;
  const dX34 = p4.x - p3.x;
  const dY34 = p4.y - p3.y;

  const denom = dX12 * dY34 - dY12 * dX34;
  if (Math.abs(denom) < 1e-6) {
    return { intersects: false };
  }

  const dX13 = p1.x - p3.x;
  const dY13 = p1.y - p3.y;

  const s = (dX12 * dY13 - dY12 * dX13) / denom;
  const t = (dX34 * dY13 - dY34 * dX13) / denom;

  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    return {
      intersects: true,
      point: {
        x: p1.x + t * dX12,
        y: p1.y + t * dY12
      },
      s,
      t
    };
  }
  return { intersects: false };
}

// Distance from 2D point P to line segment AB
export function distancePointToSegment(
  p: Vector2D,
  a: Vector2D,
  b: Vector2D
): { distanceSq: number; distance: number; projectionT: number; closestPoint: Vector2D } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) {
    const dSq = distSq(p.x, p.y, a.x, a.y);
    return { distanceSq: dSq, distance: Math.sqrt(dSq), projectionT: 0, closestPoint: a };
  }

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  const dSq = distSq(p.x, p.y, cx, cy);
  return { distanceSq: dSq, distance: Math.sqrt(dSq), projectionT: t, closestPoint: { x: cx, y: cy } };
}

// Minimum distance between two 2D line segments AB and CD
export function distanceSegmentToSegment(
  a: Vector2D,
  b: Vector2D,
  c: Vector2D,
  d: Vector2D
): { minDistanceSq: number; distAlongAB: number; distAlongCD: number; hasIntersection: boolean } {
  const isect = getLineSegmentIntersection(a, b, c, d);
  const lenAB = Math.hypot(b.x - a.x, b.y - a.y);
  const lenCD = Math.hypot(d.x - c.x, d.y - c.y);

  if (isect.intersects && isect.t !== undefined && isect.s !== undefined) {
    return {
      minDistanceSq: 0,
      distAlongAB: isect.t * lenAB,
      distAlongCD: isect.s * lenCD,
      hasIntersection: true
    };
  }

  // Check 4 endpoints
  const d1 = distancePointToSegment(a, c, d);
  const d2 = distancePointToSegment(b, c, d);
  const d3 = distancePointToSegment(c, a, b);
  const d4 = distancePointToSegment(d, a, b);

  let bestDistSq = d1.distanceSq;
  let distAlongAB = 0;
  let distAlongCD = d1.projectionT * lenCD;

  if (d2.distanceSq < bestDistSq) {
    bestDistSq = d2.distanceSq;
    distAlongAB = lenAB;
    distAlongCD = d2.projectionT * lenCD;
  }
  if (d3.distanceSq < bestDistSq) {
    bestDistSq = d3.distanceSq;
    distAlongAB = d3.projectionT * lenAB;
    distAlongCD = 0;
  }
  if (d4.distanceSq < bestDistSq) {
    bestDistSq = d4.distanceSq;
    distAlongAB = d4.projectionT * lenAB;
    distAlongCD = lenCD;
  }

  return {
    minDistanceSq: bestDistSq,
    distAlongAB,
    distAlongCD,
    hasIntersection: false
  };
}

// Geometric collision detection between two 2D trajectory paths
export function doPathsIntersectOrConflict(pathA: Vector2D[], pathB: Vector2D[], safeMargin: number = 28): boolean {
  if (!pathA || !pathB || pathA.length < 2 || pathB.length < 2) return false;
  const safeMarginSq = safeMargin * safeMargin;
  for (let i = 0; i < pathA.length - 1; i++) {
    const pA1 = pathA[i];
    const pA2 = pathA[i + 1];
    for (let j = 0; j < pathB.length - 1; j++) {
      const pB1 = pathB[j];
      const pB2 = pathB[j + 1];
      const segRes = distanceSegmentToSegment(pA1, pA2, pB1, pB2);
      if (segRes.hasIntersection || segRes.minDistanceSq < safeMarginSq) {
        return true;
      }
    }
  }
  return false;
}

// Spatiotemporal Trajectory Swept-Volume & Time-Window Conflict Predictor
export function predictSpatiotemporalConflict(
  carA: Vehicle,
  pathA: Vector2D[],
  speedA: number,
  carB: Vehicle,
  pathB: Vector2D[],
  speedB: number,
  customMargin: number = 28
): { hasConflict: boolean; timeOverlap: boolean; conflictDistance: number; tArrivalA: number; tArrivalB: number } {
  if (!pathA || !pathB || pathA.length < 2 || pathB.length < 2) {
    return { hasConflict: false, timeOverlap: false, conflictDistance: Infinity, tArrivalA: 0, tArrivalB: 0 };
  }

  const marginSq = customMargin * customMargin;
  let minConflictDistSq = Infinity;
  let bestDistAlongA = 0;
  let bestDistAlongB = 0;
  let hasGeometricConflict = false;

  let cumLenA = 0;
  for (let i = 0; i < pathA.length - 1; i++) {
    const pA1 = pathA[i];
    const pA2 = pathA[i + 1];
    const segLenA = Math.hypot(pA2.x - pA1.x, pA2.y - pA1.y);
    if (segLenA < 0.1) continue;

    let cumLenB = 0;
    for (let j = 0; j < pathB.length - 1; j++) {
      const pB1 = pathB[j];
      const pB2 = pathB[j + 1];
      const segLenB = Math.hypot(pB2.x - pB1.x, pB2.y - pB1.y);
      if (segLenB < 0.1) continue;

      const segRes = distanceSegmentToSegment(pA1, pA2, pB1, pB2);

      if (segRes.hasIntersection || segRes.minDistanceSq < marginSq) {
        if (segRes.minDistanceSq < minConflictDistSq) {
          minConflictDistSq = segRes.minDistanceSq;
          bestDistAlongA = cumLenA + segRes.distAlongAB;
          bestDistAlongB = cumLenB + segRes.distAlongCD;
          hasGeometricConflict = true;
        }
      }

      cumLenB += segLenB;
    }
    cumLenA += segLenA;
  }

  if (!hasGeometricConflict) {
    return { hasConflict: false, timeOverlap: false, conflictDistance: Infinity, tArrivalA: 0, tArrivalB: 0 };
  }

  // 2. Compute predicted arrival time windows at the critical conflict zone
  const effSpeedA = Math.max(12, Math.abs(speedA) > 2 ? Math.abs(speedA) : 32);
  const effSpeedB = Math.max(12, Math.abs(speedB) > 2 ? Math.abs(speedB) : 32);

  // Time to reach and clear conflict zone for vehicle A (accounting for approach distance if not yet inside)
  const approachDistA = (!carA.inIntersection && !carA.currentConnection && pathA.length > 0) ? Math.hypot(pathA[0].x - carA.x, pathA[0].y - carA.y) : 0;
  const tArrivalA = (approachDistA + bestDistAlongA) / effSpeedA;
  const tClearA = (approachDistA + bestDistAlongA + carA.length + customMargin) / effSpeedA;

  // Time to reach and clear conflict zone for vehicle B (accounting for approach distance if not yet inside)
  const approachDistB = (!carB.inIntersection && !carB.currentConnection && pathB.length > 0) ? Math.hypot(pathB[0].x - carB.x, pathB[0].y - carB.y) : 0;
  const tArrivalB = (approachDistB + bestDistAlongB) / effSpeedB;
  const tClearB = (approachDistB + bestDistAlongB + carB.length + customMargin) / effSpeedB;

  // Check temporal overlap with safety headway buffer (0.85 seconds)
  const temporalBuffer = 0.85;
  const timeOverlap = (tArrivalA - temporalBuffer < tClearB) && (tArrivalB - temporalBuffer < tClearA);

  return {
    hasConflict: true,
    timeOverlap,
    conflictDistance: Math.sqrt(minConflictDistSq),
    tArrivalA,
    tArrivalB
  };
}


export interface FrenetCoordinates {
  s: number; // Longitudinal distance along lane polyline
  d: number; // Lateral offset from centerline (positive = left, negative = right)
  segmentIndex: number;
}

/**
 * Projects a 2D Cartesian point (px, py) onto a lane's polyline curve
 * and returns its Frenet coordinates (s, d).
 */
export function projectPointToFrenet(
  px: number,
  py: number,
  waypoints: Vector2D[],
  startWaypointIndex: number = 0
): FrenetCoordinates {
  if (!waypoints || waypoints.length === 0) {
    return { s: 0, d: 0, segmentIndex: 0 };
  }
  if (waypoints.length === 1) {
    return { s: 0, d: Math.hypot(px - waypoints[0].x, py - waypoints[0].y), segmentIndex: 0 };
  }

  let minDistanceSq = Infinity;
  let bestS = 0;
  let bestD = 0;
  let bestSeg = 0;
  let cumulativeS = 0;

  const searchStart = Math.max(0, startWaypointIndex - 3);
  const maxSegIndex = waypoints.length - 1;

  // Accumulate distance up to searchStart
  for (let i = 0; i < searchStart; i++) {
    cumulativeS += Math.hypot(waypoints[i + 1].x - waypoints[i].x, waypoints[i + 1].y - waypoints[i].y);
  }

  const startS = cumulativeS;

  for (let i = searchStart; i < maxSegIndex; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLen = Math.hypot(dx, dy);

    if (segLen < 0.001) continue;

    const tx = dx / segLen;
    const ty = dy / segLen;
    const nx = -ty;
    const ny = tx;

    const vx = px - p1.x;
    const vy = py - p1.y;

    const t = vx * tx + vy * ty;
    const clampedT = Math.max(0, Math.min(segLen, t));

    const projX = p1.x + tx * clampedT;
    const projY = p1.y + ty * clampedT;
    const distSq = (px - projX) * (px - projX) + (py - projY) * (py - projY);

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      bestS = cumulativeS + clampedT;
      bestD = (px - projX) * nx + (py - projY) * ny;
      bestSeg = i;
    }

    cumulativeS += segLen;
    // Ensure we scan at least 850px of forward road arc-length AND at least 24 segments
    if (i >= startWaypointIndex + 24 && (cumulativeS - startS) > 850) {
      break;
    }
  }

  return { s: bestS, d: bestD, segmentIndex: bestSeg };
}

export function isVehiclePenetratingDrivingCorridor(
  car: Vehicle,
  other: Vehicle,
  lookaheadDist: number = 75
): { isInCorridor: boolean; distLong: number; distLat: number; minDistToPath: number; deltaS?: number } {
  // If car has forward route waypoints, use strict Frenet Frame (S, D) along the lane curve
  if (car.routeWaypoints && car.routeWaypoints.length >= 2) {
    const carCos = Math.cos(car.angle);
    const carSin = Math.sin(car.angle);
    const fx = car.x + carCos * (car.length * 0.5);
    const fy = car.y + carSin * (car.length * 0.5);

    const carFrenet = projectPointToFrenet(fx, fy, car.routeWaypoints, car.targetWaypointIndex || 0);
    const otherFrenet = projectPointToFrenet(other.x, other.y, car.routeWaypoints, car.targetWaypointIndex || 0);

    const deltaS = otherFrenet.s - carFrenet.s;
    const lateralDist = Math.abs(otherFrenet.d - (car.avoidanceOffset || 0));
    const aDiff = Math.abs(angleDiff(other.angle, car.angle));
    const otherEffectiveHalfW = Math.abs(Math.sin(aDiff)) * (other.length * 0.5) + Math.abs(Math.cos(aDiff)) * (other.width * 0.5);
    const clearanceW = car.width * 0.5 + otherEffectiveHalfW + 3.5;

    // FRENET FRAME PRINCIPLE:
    // If deltaS <= 0, the obstacle is mathematically behind the car along the lane curve!
    // It can NEVER penetrate the forward driving corridor.
    if (deltaS <= 0) {
      return { isInCorridor: false, distLong: deltaS, distLat: lateralDist, minDistToPath: lateralDist, deltaS };
    }

    const isInCorridor = deltaS > 0 && deltaS <= lookaheadDist && lateralDist < clearanceW;
    return { isInCorridor, distLong: deltaS, distLat: lateralDist, minDistToPath: lateralDist, deltaS };
  }

  // Fallback to local Cartesian frame
  const relX = other.x - car.x;
  const relY = other.y - car.y;
  const carCos = Math.cos(car.angle);
  const carSin = Math.sin(car.angle);
  const distLong = relX * carCos + relY * carSin;
  const distLat = Math.abs(relX * -carSin + relY * carCos);

  const aDiff = Math.abs(angleDiff(other.angle, car.angle));
  const otherEffectiveHalfW = Math.abs(Math.sin(aDiff)) * (other.length * 0.5) + Math.abs(Math.cos(aDiff)) * (other.width * 0.5);
  const clearanceThreshold = car.width * 0.5 + otherEffectiveHalfW + 3.0;

  if (distLong <= 0) {
    return { isInCorridor: false, distLong, distLat, minDistToPath: distLat, deltaS: distLong };
  }

  const isInCorridor = distLong > 0 && distLong <= lookaheadDist && distLat < clearanceThreshold;
  return { isInCorridor, distLong, distLat, minDistToPath: distLat, deltaS: distLong };
}

/**
 * Geometric Physical Path Clearance Check:
 * Tests whether 'car' can move forward along its heading without colliding with 'other'.
 * If 'other' intersects the forward corridor box in front of 'car's bumper, return true (blocked).
 * If 'other' is at the side, behind, or outside the forward trajectory, return false (clear path).
 */
export function isVehicleForwardPathBlocked(
  car: Vehicle,
  other: Vehicle,
  checkDist: number = 42
): boolean {
  if (other.id === car.id) return false;
  if (other.ghostingAlpha !== undefined && other.ghostingAlpha < 0.9) return false;

  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  const halfL = car.length * 0.5;
  const frontX = car.x + cosA * halfL;
  const frontY = car.y + sinA * halfL;

  // Vector from car's front bumper center to other's center
  const relX = other.x - frontX;
  const relY = other.y - frontY;

  // Longitudinal distance along car's forward axis from front bumper
  const distLong = relX * cosA + relY * sinA;
  const otherRadius = Math.hypot(other.length, other.width) * 0.5;

  // If other is behind car's front bumper (e.g. at car's side doors/trunk) or beyond checkDist
  if (distLong < -2.0 || distLong > checkDist + otherRadius) {
    return false;
  }

  // Build forward corridor box in front of car's bumper
  const corridorHalfDist = checkDist * 0.5;
  const corridorOBB: OBB = {
    x: frontX + cosA * corridorHalfDist,
    y: frontY + sinA * corridorHalfDist,
    hl: corridorHalfDist,
    hw: car.width * 0.5 + 1.2,
    cos: cosA,
    sin: sinA
  };

  const otherOBB = getOBB(other, 1.0);
  return isOBBOverlapping(corridorOBB, otherOBB);
}

/**
 * Geometric Rear Path Clearance Check:
 * Tests whether 'car' has open clearance behind its rear bumper to execute a reverse maneuver.
 */
export function isVehicleRearPathClear(
  car: Vehicle,
  world: GameWorld,
  nearbyVehicles?: Vehicle[],
  checkDist: number = 32
): boolean {
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  const halfL = car.length * 0.5;
  const rearX = car.x - cosA * halfL;
  const rearY = car.y - sinA * halfL;

  const corridorHalfDist = checkDist * 0.5;
  const rearCorridorOBB: OBB = {
    x: rearX - cosA * corridorHalfDist,
    y: rearY - sinA * corridorHalfDist,
    hl: corridorHalfDist,
    hw: car.width * 0.5 + 1.5,
    cos: cosA,
    sin: sinA
  };

  const candidates = nearbyVehicles || world.vehicles;
  for (const other of candidates) {
    if (other.id === car.id) continue;
    const otherOBB = getOBB(other, 1.0);
    if (isOBBOverlapping(rearCorridorOBB, otherOBB)) {
      return false;
    }
  }

  // Check world buildings behind
  if (world.buildings) {
    const probeX = rearX - cosA * checkDist;
    const probeY = rearY - sinA * checkDist;
    for (const bld of world.buildings) {
      if (probeX >= bld.x - 4 && probeX <= bld.x + bld.width + 4 &&
          probeY >= bld.y - 4 && probeY <= bld.y + bld.height + 4) {
        return false;
      }
    }
  }

  return true;
}

export interface PairwiseYieldState {
  pairKey: string;
  vehicleAId: string;
  vehicleBId: string;
  lastEncounterTime: number;
  stoppedSinceA: number;
  stoppedSinceB: number;
  electedSovereignId?: string;
  sovereignExpiry?: number;
}

// Global Pairwise Mutual-Yield & Highway Angle Deadlock Arbiter
export class GlobalMutualYieldArbiter {
  public pairs: Map<string, PairwiseYieldState> = new Map();

  public getPairKey(id1: string, id2: string): string {
    return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
  }

  public registerEncounter(
    carA: Vehicle,
    carB: Vehicle,
    isYieldingA: boolean,
    now: number,
    world?: GameWorld,
    nearbyVehicles?: Vehicle[]
  ): { isSovereignLeader: boolean; shouldYield: boolean; sovereignId?: string } {
    const key = this.getPairKey(carA.id, carB.id);
    let pair = this.pairs.get(key);

    if (!pair) {
      pair = {
        pairKey: key,
        vehicleAId: carA.id,
        vehicleBId: carB.id,
        lastEncounterTime: now,
        stoppedSinceA: (carA.speed < 2.5 && isYieldingA) ? now : 0,
        stoppedSinceB: (carB.speed < 2.5) ? now : 0
      };
      this.pairs.set(key, pair);
    } else {
      pair.lastEncounterTime = now;
      if (carA.speed < 2.5 && isYieldingA) {
        if (!pair.stoppedSinceA) pair.stoppedSinceA = now;
      } else {
        pair.stoppedSinceA = 0;
      }
      if (carB.speed < 2.5) {
        if (!pair.stoppedSinceB) pair.stoppedSinceB = now;
      } else {
        pair.stoppedSinceB = 0;
      }
    }

    // Check active sovereign pass
    if (pair.electedSovereignId && pair.sovereignExpiry && now < pair.sovereignExpiry) {
      const isSovereign = pair.electedSovereignId === carA.id;
      return {
        isSovereignLeader: isSovereign,
        shouldYield: !isSovereign,
        sovereignId: pair.electedSovereignId
      };
    }

    // Detect Mutual Deadlock (both stopped for > 1.4s)
    const isBothStopped = pair.stoppedSinceA > 0 && pair.stoppedSinceB > 0 && 
      (now - pair.stoppedSinceA > 1.4 && now - pair.stoppedSinceB > 1.4);

    if (isBothStopped) {
      // First-Clear-Path Rule: Evaluate physical forward clearance for both vehicles
      const blockedA = isVehicleForwardPathBlocked(carA, carB, Math.max(35, carA.length * 0.9));
      const blockedB = isVehicleForwardPathBlocked(carB, carA, Math.max(35, carB.length * 0.9));

      let winnerId: string;
      if (!blockedA && blockedB) {
        // Car A has an open forward path, while Car B's front is physically blocked by Car A!
        // Car A MUST move forward to clear the deadlock; Car B holds brakes!
        winnerId = carA.id;
      } else if (blockedA && !blockedB) {
        // Car B has an open forward path, while Car A's front is physically blocked by Car B!
        // Car B MUST move forward to clear the deadlock; Car A holds brakes!
        winnerId = carB.id;
      } else if (!blockedA && !blockedB) {
        // Neither car is physically blocking the other's immediate nose
        winnerId = this.determinePriorityWinner(carA, carB);
      } else {
        // MUTUAL NOSE WEDGE: Both cars are mutually blocking each other's forward path
        // Check rear clearance to reverse and open the space
        const rearClearA = world ? isVehicleRearPathClear(carA, world, nearbyVehicles, 30) : false;
        const rearClearB = world ? isVehicleRearPathClear(carB, world, nearbyVehicles, 30) : false;

        if (rearClearA && !rearClearB) {
          carA.aiState = 'reversing';
          carA.reverseTimer = 1.8;
          carA.speed = -25;
          winnerId = carB.id;
        } else if (!rearClearA && rearClearB) {
          carB.aiState = 'reversing';
          carB.reverseTimer = 1.8;
          carB.speed = -25;
          winnerId = carA.id;
        } else if (rearClearA && rearClearB) {
          const progressA = carA.targetWaypointIndex || 0;
          const progressB = carB.targetWaypointIndex || 0;
          if (progressA <= progressB) {
            carA.aiState = 'reversing';
            carA.reverseTimer = 1.8;
            carA.speed = -25;
            winnerId = carB.id;
          } else {
            carB.aiState = 'reversing';
            carB.reverseTimer = 1.8;
            carB.speed = -25;
            winnerId = carA.id;
          }
        } else {
          winnerId = this.determinePriorityWinner(carA, carB);
        }
      }

      pair.electedSovereignId = winnerId;
      pair.sovereignExpiry = now + 3.8;

      trafficDiagnostics.cyclesDissolved++;
      trafficDiagnostics.log(
        'deadlock',
        `Deadlock resolved (First-Clear-Path) between Car #${carA.id.slice(-4)} & Car #${carB.id.slice(-4)}. Leader: Car #${winnerId.slice(-4)}`,
        winnerId
      );

      const isSovereign = winnerId === carA.id;
      return {
        isSovereignLeader: isSovereign,
        shouldYield: !isSovereign,
        sovereignId: winnerId
      };
    }

    return {
      isSovereignLeader: false,
      shouldYield: isYieldingA
    };
  }

  public determinePriorityWinner(carA: Vehicle, carB: Vehicle): string {
    // 1. Momentum: moving vehicle has priority over already-stopped vehicle
    if (carA.speed > 8 && carB.speed < 4) return carA.id;
    if (carB.speed > 8 && carA.speed < 4) return carB.id;

    // 2. Maneuver simplicity: straight > right > left > turnaround
    const maneuverScore = (turn?: string) => {
      if (turn === 'straight') return 3;
      if (turn === 'right') return 2;
      if (turn === 'left') return 1;
      return 0;
    };
    const scoreA = maneuverScore(carA.plannedTurn);
    const scoreB = maneuverScore(carB.plannedTurn);
    if (scoreA !== scoreB) {
      return scoreA > scoreB ? carA.id : carB.id;
    }

    // 3. Progress: vehicle further along its route index
    if ((carA.targetWaypointIndex || 0) > (carB.targetWaypointIndex || 0) + 1) return carA.id;
    if ((carB.targetWaypointIndex || 0) > (carA.targetWaypointIndex || 0) + 1) return carB.id;

    // 4. Right-Hand Rule (ПДД):
    const angleToB = Math.atan2(carB.y - carA.y, carB.x - carA.x);
    const relBearingA = angleDiff(angleToB, carA.angle);
    if (relBearingA > 0.2 && relBearingA < Math.PI - 0.2) {
      // Car B is to Car A's right -> Car B has priority
      return carB.id;
    }
    const angleToA = Math.atan2(carA.y - carB.y, carA.x - carB.x);
    const relBearingB = angleDiff(angleToA, carB.angle);
    if (relBearingB > 0.2 && relBearingB < Math.PI - 0.2) {
      // Car A is to Car B's right -> Car A has priority
      return carA.id;
    }

    // 5. Deterministic tie-breaker
    return carA.id < carB.id ? carA.id : carB.id;
  }

  public update(now: number) {
    // Clean up stale pairs (older than 6.0s)
    for (const [key, pair] of this.pairs.entries()) {
      if (now - pair.lastEncounterTime > 6.0) {
        this.pairs.delete(key);
      }
    }
  }
}

export const globalMutualYieldArbiter = new GlobalMutualYieldArbiter();

// Predictive Downstream Spillback & Capacity Forecaster ("Don't Block the Box" Rule)
export function predictDownstreamSpillback(
  car: Vehicle,
  targetLaneId: string,
  world: GameWorld
): { willSpillback: boolean; freeDistance: number; queueSize: number } {
  const targetLane = findLaneById(world, targetLaneId);
  if (!targetLane || targetLane.waypoints.length < 2) {
    return { willSpillback: false, freeDistance: 999, queueSize: 0 };
  }

  const exitStart = targetLane.waypoints[0];
  const requiredClearance = Math.max(55, car.length + 20);

  // Find all downstream vehicles in target lane within lookahead zone (140px)
  let minDistanceToTail = Infinity;
  let queueCount = 0;

  for (const other of world.vehicles) {
    if (other.id === car.id || other.isParked) continue;
    if (other.currentLaneId === targetLaneId) {
      const d = Math.hypot(other.x - exitStart.x, other.y - exitStart.y);
      if (d < 150) {
        queueCount++;
        // If other vehicle is stalled or moving very slowly, it forms a spillback blockage
        if (other.speed < 5.5 || other.aiState === 'stopping_light' || other.aiState === 'yielding') {
          if (d < minDistanceToTail) {
            minDistanceToTail = d;
          }
        }
      }
    }
  }

  const willSpillback = minDistanceToTail < requiredClearance;
  return {
    willSpillback,
    freeDistance: minDistanceToTail === Infinity ? 999 : minDistanceToTail,
    queueSize: queueCount
  };
}

// State-of-the-art Predictive Intersection AI & Gridlock Resolver
export class IntersectionReservationManager {
  public reservations: Map<string, IntersectionReservation[]> = new Map();
  public waitingMap: Map<string, WaitingQueueEntry[]> = new Map();
  public electedPriority: Map<string, { vehicleId: string; expiry: number; reason: string }> = new Map();
  public activeDeadlocks: Map<string, DeadlockCycle> = new Map();

  public update(dt: number, world: GameWorld) {
    const now = performance.now() / 1000;
    const livingVehicleIds = new Set(world.vehicles.map((v) => v.id));

    // 1. Clean up expired / stale active reservations
    for (const [interId, resList] of this.reservations.entries()) {
      const valid = resList.filter((r) => {
        if (!livingVehicleIds.has(r.vehicleId)) return false;
        if (now - r.entryTime > 7.5) return false;
        const v = world.vehicles.find((veh) => veh.id === r.vehicleId);
        if (!v) return false;
        if (!v.inIntersection && !v.currentConnection) return false;
        return true;
      });
      if (valid.length === 0) {
        this.reservations.delete(interId);
      } else {
        this.reservations.set(interId, valid);
      }
    }

    // 2. Update waiting entries, aging priority, and detect circular deadlocks
    for (const [interId, waitList] of this.waitingMap.entries()) {
      const validWait = waitList.filter((w) => livingVehicleIds.has(w.vehicleId));
      for (const w of validWait) {
        w.waitTime += dt;
        const v = world.vehicles.find((veh) => veh.id === w.vehicleId);
        if (v) {
          v.intersectionWaitTimer = w.waitTime;
        }

        // Calculate dynamic priority score based on wait time, vehicle type, and maneuver simplicity
        let score = w.waitTime * 2.0;
        if (w.turnType === 'straight') score += 1.5;
        else if (w.turnType === 'right') score += 1.0;
        w.priorityScore = score;
      }

      this.waitingMap.set(interId, validWait);

      // 3. LIVE DIRECTED WAIT-FOR GRAPH & DEADLOCK CYCLE DETECTION
      this.detectAndResolveDeadlockCycles(interId, validWait, world, now);

      // 4. SYMMETRY BREAKER: If no cycle detected yet vehicles waiting > 1.5s, elect priority pass
      if (validWait.length > 0) {
        const elected = this.electedPriority.get(interId);
        if (!elected || now > elected.expiry || !livingVehicleIds.has(elected.vehicleId)) {
          const readyWait = validWait.filter((w) => {
            const v = world.vehicles.find((veh) => veh.id === w.vehicleId);
            return v && v.aiState !== 'stopping_light' && !w.spillbackBlocked;
          });

          if (readyWait.length > 0) {
            let topCandidate = readyWait[0];
            let topCandidateScore = -Infinity;

            const junctionVehicles = world.vehicles.filter((v) => {
              if (v.isParked) return false;
              return (v.inIntersection && v.intersectionReservationId === interId) ||
                     validWait.some((w) => w.vehicleId === v.id);
            });

            for (let i = 0; i < readyWait.length; i++) {
              const candEntry = readyWait[i];
              const candCar = world.vehicles.find((veh) => veh.id === candEntry.vehicleId);
              let score = candEntry.priorityScore || 0;

              // Physical forward clearance check: does candCar have an open path ahead?
              if (candCar) {
                const isForwardBlocked = junctionVehicles.some((other) => {
                  if (other.id === candCar.id) return false;
                  return isVehicleForwardPathBlocked(candCar, other, Math.max(35, candCar.length * 0.8));
                });
                if (!isForwardBlocked) {
                  score += 40.0; // Substantial bonus for having an open path to roll forward!
                } else {
                  score -= 25.0; // Penalty if front bumper is wedged into another car's chassis
                }
              }

              if (score > topCandidateScore) {
                topCandidateScore = score;
                topCandidate = candEntry;
              }
            }

            if (topCandidate && topCandidate.waitTime > 1.5) {
              this.electedPriority.set(interId, {
                vehicleId: topCandidate.vehicleId,
                expiry: now + 3.2,
                reason: 'symmetry_breaker'
              });
              trafficDiagnostics.predictedGridlocksPrevented++;
              trafficDiagnostics.log(
                'info',
                `Intersection #${interId.slice(-4)} AI elected wave leader Car #${topCandidate.vehicleId.slice(-4)} (waited ${topCandidate.waitTime.toFixed(1)}s, clear forward path)`,
                topCandidate.vehicleId,
                interId
              );
            }
          }
        }
      }
    }
  }

  // Directed Wait-For Dependency Graph Cycle Detection (Tarjan / DFS Cycle Search)
  private detectAndResolveDeadlockCycles(
    interId: string,
    waitList: WaitingQueueEntry[],
    world: GameWorld,
    now: number
  ) {
    if (waitList.length < 2) return;

    // Filter vehicles involved at this intersection (waiting + inside junction)
    const activeVehicles = world.vehicles.filter((v) => {
      if (v.isParked || v.isPlayerControlled) return false;
      return (v.inIntersection && v.intersectionReservationId === interId) ||
             waitList.some((w) => w.vehicleId === v.id);
    });

    if (activeVehicles.length < 2) return;

    // Build Adjacency List for Directed Wait-For Graph: Edge A -> B means A is blocked by / waiting for B
    const adj = new Map<string, string[]>();
    for (const carA of activeVehicles) {
      adj.set(carA.id, []);
      const waitA = waitList.find((w) => w.vehicleId === carA.id);
      const pathA = carA.currentConnection?.pathWaypoints || waitA?.pathWaypoints;
      if (!pathA) continue;

      for (const carB of activeVehicles) {
        if (carA.id === carB.id) continue;
        const waitB = waitList.find((w) => w.vehicleId === carB.id);
        const pathB = carB.currentConnection?.pathWaypoints || waitB?.pathWaypoints;
        if (!pathB) continue;

        const conflict = predictSpatiotemporalConflict(
          carA, pathA, carA.speed,
          carB, pathB, carB.speed,
          36
        );

        if (conflict.hasConflict) {
          // Check if carA is waiting for carB due to right-of-way or physical obstacle
          const dLong = (carB.x - carA.x) * Math.cos(carA.angle) + (carB.y - carA.y) * Math.sin(carA.angle);
          if (carA.inIntersection && !carB.inIntersection) {
            // carB waits for carA
          } else if (!carA.inIntersection && carB.inIntersection) {
            adj.get(carA.id)!.push(carB.id);
          } else if (dLong > 0 && dLong < 65) {
            adj.get(carA.id)!.push(carB.id);
          } else if (waitA && waitB && (waitA.waitTime < waitB.waitTime)) {
            adj.get(carA.id)!.push(carB.id);
          }
        }
      }
    }

    // DFS Cycle Detection
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const parentMap = new Map<string, string>();
    let detectedCycle: string[] | null = null;

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          parentMap.set(neighbor, node);
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          // Cycle found! Reconstruct cycle path
          const cycle: string[] = [neighbor];
          let curr = node;
          while (curr && curr !== neighbor) {
            cycle.push(curr);
            curr = parentMap.get(curr) || '';
          }
          cycle.push(neighbor);
          detectedCycle = cycle.reverse();
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const car of activeVehicles) {
      if (!visited.has(car.id)) {
        if (dfs(car.id)) break;
      }
    }

    // 5. DETERMINISTIC WAVE DISSOLUTION FOR DETECTED CYCLES
    if (detectedCycle && detectedCycle.length >= 2) {
      const cycleIds = Array.from(new Set(detectedCycle));
      
      // Calculate Dissolution Score for each vehicle in cycle
      let bestLeaderId = cycleIds[0];
      let maxDissolutionScore = -Infinity;

      for (const cId of cycleIds) {
        const car = world.vehicles.find((v) => v.id === cId);
        if (!car) continue;

        // Check if car's immediate forward path is blocked by another cycle vehicle
        let isPathBlocked = false;
        for (const otherId of cycleIds) {
          if (otherId === cId) continue;
          const otherCar = world.vehicles.find((v) => v.id === otherId);
          if (otherCar && isVehicleForwardPathBlocked(car, otherCar, Math.max(35, car.length * 0.85))) {
            isPathBlocked = true;
            break;
          }
        }

        let score = 0;
        if (!isPathBlocked) score += 60.0; // Enormous priority boost for having an unblocked forward path!
        if (car.inIntersection) score += 12.0;
        score += (car.targetWaypointIndex || 0) * 1.5;
        if (car.plannedTurn === 'straight') score += 3.0;
        else if (car.plannedTurn === 'right') score += 2.0;
        score += Math.max(0, car.speed) * 0.1;

        if (score > maxDissolutionScore) {
          maxDissolutionScore = score;
          bestLeaderId = cId;
        }
      }

      // Grant exclusive Wave Leader pass to break circular dependency
      this.electedPriority.set(interId, {
        vehicleId: bestLeaderId,
        expiry: now + 3.8,
        reason: 'cycle_wave_dissolution'
      });

      this.activeDeadlocks.set(interId, {
        intersectionId: interId,
        cycleVehicles: cycleIds,
        leadBreakerId: bestLeaderId,
        detectedTime: now
      });

      trafficDiagnostics.cyclesDissolved++;
      trafficDiagnostics.log(
        'deadlock',
        `Predicted circular gridlock cycle [${cycleIds.length} cars] at #${interId.slice(-4)}. Dissolved via Lead Wave Pass for Car #${bestLeaderId.slice(-4)}`,
        bestLeaderId,
        interId
      );
    }
  }

  public hasReservation(vehicleId: string, intersectionId: string): boolean {
    const list = this.reservations.get(intersectionId);
    if (!list) return false;
    return list.some((r) => r.vehicleId === vehicleId);
  }

  public requestReservation(
    car: Vehicle,
    intersectionId: string,
    conn: {
      targetLaneId: string;
      turnType: 'straight' | 'left' | 'right' | 'turnaround';
      pathWaypoints: Vector2D[];
      stopLineDirection?: 'north' | 'south' | 'east' | 'west';
    },
    world: GameWorld
  ): { granted: boolean; reason: string } {
    const now = performance.now() / 1000;

    // 1. If car already holds reservation, grant
    if (this.hasReservation(car.id, intersectionId)) {
      return { granted: true, reason: 'existing' };
    }

    // 2. Predictive Spillback & "Don't Block the Box" Check
    const spillback = predictDownstreamSpillback(car, conn.targetLaneId, world);
    if (spillback.willSpillback) {
      this.registerWaiting(car, intersectionId, conn, true);
      trafficDiagnostics.boxBlocksAvoided++;
      return { granted: false, reason: 'spillback_imminent' };
    }

    // 3. Spatiotemporal & Swept-Volume Conflict Check with Active Reservations
    const activeRes = this.reservations.get(intersectionId) || [];
    const isCarHeavy = car.length > 52 || (car.wheelBase || 28) > 34;

    for (const otherRes of activeRes) {
      if (otherRes.vehicleId === car.id) continue;
      const otherCar = world.vehicles.find((v) => v.id === otherRes.vehicleId);
      const isOtherHeavy = otherCar ? (otherCar.length > 52 || (otherCar.wheelBase || 28) > 34) : false;
      const customMargin = (isCarHeavy || isOtherHeavy) ? 46 : 30;

      const conflict = predictSpatiotemporalConflict(
        car, conn.pathWaypoints, Math.max(24, car.speed),
        otherCar || car, otherRes.pathWaypoints, otherRes.estimatedSpeed,
        customMargin
      );

      if (conflict.hasConflict && conflict.timeOverlap) {
        this.registerWaiting(car, intersectionId, conn, false);
        return { granted: false, reason: 'spatiotemporal_conflict_active' };
      }
    }

    // 3b. Physical Junction Occupancy, Player Trajectory & Unprotected Left-Turn Oncoming Check
    const inter = world.intersections.find((i) => i.id === intersectionId);
    if (inter && conn.pathWaypoints && conn.pathWaypoints.length >= 2) {
      const halfW = inter.width * 0.5 + 14;
      const halfH = inter.height * 0.5 + 14;
      const entryHeading = Math.atan2(
        conn.pathWaypoints[1].y - conn.pathWaypoints[0].y,
        conn.pathWaypoints[1].x - conn.pathWaypoints[0].x
      );

      for (const other of world.vehicles) {
        if (other.id === car.id || other.isParked) continue;
        if (other.ghostingAlpha !== undefined && other.ghostingAlpha < 0.9) continue;

        const dxInter = other.x - inter.x;
        const dyInter = other.y - inter.y;
        const distToInter = Math.hypot(dxInter, dyInter);
        const maxScan = Math.max(inter.width, inter.height) * 0.5 + 280 + Math.abs(other.speed) * 1.4;
        if (distToInter > maxScan) continue;

        const isPhysicallyInsideBox =
          Math.abs(dxInter) <= halfW && Math.abs(dyInter) <= halfH &&
          (other.inIntersection || other.currentConnection || other.isPlayerControlled || Math.abs(other.speed) > 8);

        // Build synthetic forward trajectory for player or unreserved vehicle
        const otherCos = Math.cos(other.angle);
        const otherSin = Math.sin(other.angle);
        const projDist = Math.max(95, Math.abs(other.speed) * 2.1 + other.length);
        const otherPath: Vector2D[] =
          (other.currentConnection && other.currentConnection.pathWaypoints.length >= 2)
            ? other.currentConnection.pathWaypoints
            : [
                { x: other.x - otherCos * (other.length * 0.3), y: other.y - otherSin * (other.length * 0.3) },
                { x: other.x + otherCos * (projDist * 0.5), y: other.y + otherSin * (projDist * 0.5) },
                { x: other.x + otherCos * projDist, y: other.y + otherSin * projDist }
              ];

        const isOtherHeavy = other.length > 52 || (other.wheelBase || 28) > 34;
        const margin = (isCarHeavy || isOtherHeavy) ? 44 : 28;

        // A. Vehicle already inside intersection box crossing our path
        if (isPhysicallyInsideBox) {
          if (doPathsIntersectOrConflict(conn.pathWaypoints, otherPath, margin)) {
            const relHeading = Math.abs(angleDiff(other.angle, car.angle));
            // Ignore same-lane leader directly ahead if it is smoothly exiting
            const isSameLaneAhead = relHeading < 0.45 && other.currentConnection?.targetLaneId === conn.targetLaneId && other.speed > 18;
            if (!isSameLaneAhead) {
              this.registerWaiting(car, intersectionId, conn, false);
              return { granted: false, reason: 'junction_physically_occupied' };
            }
          }
        }

        // B. Unprotected Left Turn / Turnaround yielding to oncoming straight/right traffic (ПДД п. 13.4 / 13.12)
        if (conn.turnType === 'left' || conn.turnType === 'turnaround') {
          const headingRelToEntry = Math.abs(angleDiff(other.angle, entryHeading));
          // Oncoming vehicle faces opposite to our entry direction (~180 deg / > 2.15 rad)
          if (headingRelToEntry > 2.15 && (other.speed > 12 || other.inIntersection)) {
            const toInterLong = (-dxInter) * otherCos + (-dyInter) * otherSin;
            if (toInterLong > -35 && toInterLong < 240 + other.speed * 1.6) {
              const isOtherTurningLeft = !other.isPlayerControlled && (other.plannedTurn === 'left' || other.currentConnection?.turnType === 'left');
              if (!isOtherTurningLeft) {
                const conflict = predictSpatiotemporalConflict(
                  car, conn.pathWaypoints, Math.max(24, car.speed),
                  other, otherPath, Math.max(30, other.speed),
                  margin + 6
                );
                if (conflict.hasConflict && (conflict.timeOverlap || conflict.tArrivalB < 2.8)) {
                  this.registerWaiting(car, intersectionId, conn, false);
                  return { granted: false, reason: 'yielding_left_turn_oncoming' };
                }
              }
            }
          }
        }

        // C. Fast-approaching cross-traffic (Player car or Yellow-Dilemma vehicle that cannot stop)
        if ((other.isPlayerControlled || other.speed > 130) && Math.abs(other.speed) > 45) {
          const toInterLong = (-dxInter) * otherCos + (-dyInter) * otherSin;
          if (toInterLong > -20 && toInterLong < Math.abs(other.speed) * 2.2) {
            const conflict = predictSpatiotemporalConflict(
              car, conn.pathWaypoints, Math.max(24, car.speed),
              other, otherPath, Math.abs(other.speed),
              margin + 8
            );
            if (conflict.hasConflict && conflict.timeOverlap && conflict.tArrivalB < 2.4) {
              this.registerWaiting(car, intersectionId, conn, false);
              return { granted: false, reason: 'yielding_fast_approaching_vehicle' };
            }
          }
        }
      }
    }

    // 4. Check Elected Priority / Deadlock Wave Leader
    const elected = this.electedPriority.get(intersectionId);
    if (elected && now < elected.expiry && elected.vehicleId !== car.id) {
      const electedCar = world.vehicles.find((v) => v.id === elected.vehicleId);
      if (electedCar && electedCar.aiState !== 'stopping_light') {
        const waitingList = this.waitingMap.get(intersectionId) || [];
        const electedEntry = waitingList.find((w) => w.vehicleId === elected.vehicleId);
        if (electedEntry) {
          const isElectedHeavy = (electedCar.length > 52 || (electedCar.wheelBase || 28) > 34);
          const customMargin = (isCarHeavy || isElectedHeavy) ? 46 : 28;

          const conflict = predictSpatiotemporalConflict(
            car, conn.pathWaypoints, car.speed,
            electedCar, electedEntry.pathWaypoints, electedCar.speed,
            customMargin
          );

          if (conflict.hasConflict && conflict.timeOverlap) {
            this.registerWaiting(car, intersectionId, conn, false);
            return { granted: false, reason: 'yielding_to_wave_leader' };
          }
        }
      }
    }

    // 5. Grant reservation (supports parallel non-conflicting concurrent waves)
    const isWaveLeader = elected?.vehicleId === car.id;
    const estSpeed = Math.max(20, Math.abs(car.speed) > 5 ? car.speed : 35);
    const pathLen = conn.pathWaypoints.reduce((acc, pt, idx, arr) => {
      if (idx === 0) return 0;
      return acc + Math.hypot(pt.x - arr[idx - 1].x, pt.y - arr[idx - 1].y);
    }, 0);
    const estDuration = Math.max(1.5, pathLen / estSpeed);

    const tokenId = `token_${intersectionId}_${car.id}_${Math.floor(now * 100)}`;
    const windowStart = now;
    const windowEnd = now + estDuration + 0.6;

    const newRes: IntersectionReservation = {
      tokenId,
      vehicleId: car.id,
      intersectionId,
      entryTime: now,
      windowStart,
      windowEnd,
      pathWaypoints: [...conn.pathWaypoints],
      turnType: conn.turnType,
      stopLineDirection: conn.stopLineDirection,
      estimatedSpeed: estSpeed,
      estimatedDuration: estDuration,
      isWaveLeader,
      exclusivePriority: true
    };

    if (!this.reservations.has(intersectionId)) {
      this.reservations.set(intersectionId, []);
    }
    this.reservations.get(intersectionId)!.push(newRes);
    car.intersectionReservationId = intersectionId;
    car.intersectionReservationToken = tokenId;
    car.hasExclusiveIntersectionToken = true;

    if (activeRes.length > 0) {
      trafficDiagnostics.activeWavePasses++;
    }

    this.removeWaiting(car.id, intersectionId);

    if (elected && elected.vehicleId === car.id) {
      this.electedPriority.delete(intersectionId);
    }

    return { granted: true, reason: 'granted' };
  }

  public registerWaiting(
    car: Vehicle,
    intersectionId: string,
    conn: {
      targetLaneId: string;
      turnType: 'straight' | 'left' | 'right' | 'turnaround';
      pathWaypoints: Vector2D[];
      stopLineDirection?: 'north' | 'south' | 'east' | 'west';
    },
    spillbackBlocked: boolean = false
  ) {
    let list = this.waitingMap.get(intersectionId);
    if (!list) {
      list = [];
      this.waitingMap.set(intersectionId, list);
    }
    const existing = list.find((w) => w.vehicleId === car.id);
    if (existing) {
      existing.pathWaypoints = conn.pathWaypoints;
      existing.turnType = conn.turnType;
      existing.targetLaneId = conn.targetLaneId;
      existing.spillbackBlocked = spillbackBlocked;
    } else {
      list.push({
        vehicleId: car.id,
        intersectionId,
        stopLineDirection: conn.stopLineDirection,
        turnType: conn.turnType,
        pathWaypoints: [...conn.pathWaypoints],
        targetLaneId: conn.targetLaneId,
        waitTime: 0,
        spillbackBlocked,
        priorityScore: 0
      });
    }
  }

  public removeWaiting(vehicleId: string, intersectionId?: string) {
    if (intersectionId) {
      const list = this.waitingMap.get(intersectionId);
      if (list) {
        this.waitingMap.set(
          intersectionId,
          list.filter((w) => w.vehicleId !== vehicleId)
        );
      }
    } else {
      for (const [id, list] of this.waitingMap.entries()) {
        this.waitingMap.set(
          id,
          list.filter((w) => w.vehicleId !== vehicleId)
        );
      }
    }
  }

  public releaseReservation(vehicleId: string, intersectionId?: string) {
    if (intersectionId) {
      const list = this.reservations.get(intersectionId);
      if (list) {
        this.reservations.set(
          intersectionId,
          list.filter((r) => r.vehicleId !== vehicleId)
        );
      }
    } else {
      for (const [id, list] of this.reservations.entries()) {
        this.reservations.set(
          id,
          list.filter((r) => r.vehicleId !== vehicleId)
        );
      }
    }
    this.removeWaiting(vehicleId, intersectionId);
  }
}

export const intersectionArbiter = new IntersectionReservationManager();

interface WorldRoadLaneIndex {
  roadCount: number;
  laneMap: Map<string, RoadSegment['lanePaths'][0]>;
  roadByLaneMap: Map<string, RoadSegment>;
  roadByIdMap: Map<string, RoadSegment>;
}

const worldRoadLaneIndexCache = new WeakMap<GameWorld, WorldRoadLaneIndex>();

function getWorldRoadLaneIndex(world: GameWorld): WorldRoadLaneIndex {
  let idx = worldRoadLaneIndexCache.get(world);
  if (!idx || idx.roadCount !== world.roads.length) {
    const laneMap = new Map<string, RoadSegment['lanePaths'][0]>();
    const roadByLaneMap = new Map<string, RoadSegment>();
    const roadByIdMap = new Map<string, RoadSegment>();
    for (let i = 0; i < world.roads.length; i++) {
      const road = world.roads[i];
      if (road.id) roadByIdMap.set(road.id, road);
      if (!road.lanePaths) continue;
      for (let j = 0; j < road.lanePaths.length; j++) {
        const lane = road.lanePaths[j];
        laneMap.set(lane.laneId, lane);
        roadByLaneMap.set(lane.laneId, road);
      }
    }
    idx = { roadCount: world.roads.length, laneMap, roadByLaneMap, roadByIdMap };
    worldRoadLaneIndexCache.set(world, idx);
  }
  return idx;
}

// Find lane object by ID in O(1)
export function findLaneById(world: GameWorld, laneId: string | null): RoadSegment['lanePaths'][0] | null {
  if (!laneId) return null;
  return getWorldRoadLaneIndex(world).laneMap.get(laneId) || null;
}

// Find RoadSegment by lane ID in O(1)
export function findRoadByLaneId(world: GameWorld, laneId: string | null): RoadSegment | null {
  if (!laneId) return null;
  return getWorldRoadLaneIndex(world).roadByLaneMap.get(laneId) || null;
}

/**
 * Calculates authentic speed limit (in km/h) based on road hierarchy, width, lanes and territory.
 */
export function getRoadSpeedLimitKmh(road: RoadSegment | null): number {
  if (!road) return 55;

  const name = road.name || '';
  const isHighSpeedRoad = road.isAvenue || (road.lanes || 2) >= 4 || (road.width || 96) >= 140 ||
    name.includes('Трасса') || name.includes('Шоссе') || name.includes('Highway') ||
    name.includes('Вектор') || name.includes('Boulevard') || name.includes('проспект');

  if (isHighSpeedRoad) {
    // Intercity highway (M-12, Pacific Highway, canyon / sand routes)
    if (name.includes('М-12') || name.includes('Pacific Highway') || name.includes('Каньонное Шоссе') || name.includes('Барханная Трасса')) {
      return 95;
    }
    // Urban wide avenues & boulevards (Grand Blvd, Central Ave, Silicon Hwy, Metro Ave, Station Ave)
    return 80;
  }

  // Roundabouts
  if (road.isRoundabout) {
    return 35;
  }

  // Narrow residential, garages, dacha and riverside alleys
  const isNarrowOrResidential = (road.width || 96) <= 96 ||
    name.includes('тупик') || name.includes('гараж') || name.includes('Дачн') ||
    name.includes('Садов') || name.includes('Луговой') || name.includes('Березов') ||
    name.includes('Кленов') || name.includes('Моторный') || name.includes('Автомобилистов') ||
    name.includes('пакгауз');

  if (isNarrowOrResidential) {
    return 38;
  }

  // Standard urban 2-lane avenues and city connectors (Broadway, Parkside, Commerce, Financial, etc.)
  return 60;
}

/**
 * Deterministic 32-bit FNV-1a string hash for assigning stable, organic driver personalities per vehicle ID.
 */
function hashStringDeterministic(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Ensures every AI vehicle has a distinct, realistic human DriverProfile governing its speed preference,
 * time headway, acceleration smoothness, MOBIL politeness, perception-reaction time, and emergency evasion skill.
 */
export function ensureDriverProfile(car: Vehicle): DriverProfile {
  if (car.driverProfile) return car.driverProfile;

  const h1 = hashStringDeterministic(car.id || 'veh_0');
  const h2 = hashStringDeterministic((car.id || 'veh_0') + '_salt');
  const u1 = (h1 % 10000) / 10000; // 0..1
  const u2 = (h2 % 10000) / 10000; // 0..1
  const u3 = ((h1 >>> 16) % 10000) / 10000; // 0..1

  const type = car.type || 'sedan';
  let archetype: DriverArchetype = 'normal';

  const isHeavyCommercial =
    type.startsWith('truck_') ||
    type === 'bus' ||
    type === 'cement_mixer' ||
    type === 'garbage_truck' ||
    type.startsWith('fire_') ||
    type.startsWith('ambulance');
  const isTractorOrMoped = type.startsWith('tractor_') || type === 'moped_soviet';
  const isSportyOrFast =
    type === 'sports' ||
    type === 'supercar' ||
    type === 'coupe_gt' ||
    type === 'hatch_hot' ||
    type === 'moto_sport' ||
    type === 'muscle' ||
    type === 'suv_luxury' ||
    type === 'sedan_luxury';
  const isTaxiOrCourier = type === 'taxi' || type === 'delivery_truck' || type === 'bus_minibus';
  const isVintageOrBudget =
    type === 'sedan_classic' ||
    type === 'wagon_classic' ||
    type === 'classic_compact' ||
    type === 'liftback_tavria' ||
    type === 'compact_matiz' ||
    type === 'van_cargo_old';

  if (isHeavyCommercial || type === 'police') {
    archetype = u1 < 0.78 ? 'professional' : (u1 < 0.92 ? 'confident' : 'normal');
  } else if (isTractorOrMoped) {
    archetype = u1 < 0.45 ? 'cautious' : (u1 < 0.75 ? 'elderly' : 'normal');
  } else if (isSportyOrFast) {
    if (u1 < 0.28) archetype = 'aggressive';
    else if (u1 < 0.62) archetype = 'hurried';
    else if (u1 < 0.90) archetype = 'confident';
    else archetype = 'normal';
  } else if (isTaxiOrCourier) {
    if (u1 < 0.42) archetype = 'hurried';
    else if (u1 < 0.72) archetype = 'professional';
    else if (u1 < 0.88) archetype = 'confident';
    else archetype = 'aggressive';
  } else if (isVintageOrBudget) {
    if (u1 < 0.22) archetype = 'elderly';
    else if (u1 < 0.46) archetype = 'cautious';
    else if (u1 < 0.80) archetype = 'normal';
    else if (u1 < 0.93) archetype = 'hurried';
    else archetype = 'aggressive';
  } else {
    // General passenger cars (sedans, hatchbacks, crossovers, SUVs, wagons)
    if (u1 < 0.08) archetype = 'elderly';
    else if (u1 < 0.23) archetype = 'cautious';
    else if (u1 < 0.61) archetype = 'normal';
    else if (u1 < 0.80) archetype = 'confident';
    else if (u1 < 0.92) archetype = 'hurried';
    else archetype = 'aggressive';
  }

  // Continuous micro-variation jitter (-0.5 .. +0.5) so no two drivers are clones
  const j1 = u2 - 0.5;
  const j2 = u3 - 0.5;

  let profile: DriverProfile;
  switch (archetype) {
    case 'elderly':
      profile = {
        archetype,
        speedFactor: 0.78 + u2 * 0.09,            // 0.78 .. 0.87 of speed limit
        desiredTimeHeadway: 1.95 + u3 * 0.35,     // 1.95 .. 2.30s generous gap
        minGapFactor: 1.25 + u2 * 0.20,
        accelFactor: 0.68 + u3 * 0.14,            // Gentle throttle
        comfortBrakeFactor: 0.78 + u2 * 0.14,     // Early, gentle braking
        politeness: 0.75 + u3 * 0.18,
        laneChangeThreshold: 24 + u2 * 10,        // Rarely changes lanes unless blocked
        reactionTime: 0.55 + u3 * 0.24,           // 0.55 .. 0.79s slower reaction
        attentiveness: 0.56 + u2 * 0.18,          // More likely to freeze and brake in sudden emergency
        corneringFactor: 0.82 + u3 * 0.08,
        preferredLaneBias: -1
      };
      break;
    case 'cautious':
      profile = {
        archetype,
        speedFactor: 0.86 + u2 * 0.09,            // 0.86 .. 0.95
        desiredTimeHeadway: 1.65 + u3 * 0.28,     // 1.65 .. 1.93s
        minGapFactor: 1.15 + u2 * 0.16,
        accelFactor: 0.78 + u3 * 0.14,
        comfortBrakeFactor: 0.85 + u2 * 0.15,
        politeness: 0.68 + u3 * 0.18,
        laneChangeThreshold: 18 + u2 * 8,
        reactionTime: 0.38 + u3 * 0.18,
        attentiveness: 0.72 + u2 * 0.16,
        corneringFactor: 0.88 + u3 * 0.08,
        preferredLaneBias: -1
      };
      break;
    case 'professional':
      profile = {
        archetype,
        speedFactor: isHeavyCommercial ? (0.92 + u2 * 0.08) : (0.98 + u2 * 0.10),
        desiredTimeHeadway: isHeavyCommercial ? (1.65 + u3 * 0.25) : (1.22 + u3 * 0.20),
        minGapFactor: isHeavyCommercial ? (1.22 + u2 * 0.15) : (0.96 + u2 * 0.10),
        accelFactor: isHeavyCommercial ? (0.88 + u3 * 0.12) : (1.02 + u3 * 0.12),
        comfortBrakeFactor: 0.95 + u2 * 0.15,
        politeness: 0.52 + u3 * 0.20,
        laneChangeThreshold: 11 + u2 * 5,
        reactionTime: 0.18 + u3 * 0.12,           // Crisp, anticipatory reaction
        attentiveness: 0.88 + u2 * 0.11,          // Spots brake waves & escape corridors reliably
        corneringFactor: isHeavyCommercial ? (0.94 + u3 * 0.08) : (1.04 + u3 * 0.10),
        preferredLaneBias: isHeavyCommercial ? -1 : 0
      };
      break;
    case 'confident':
      profile = {
        archetype,
        speedFactor: 1.03 + u2 * 0.11,            // 1.03 .. 1.14
        desiredTimeHeadway: 1.12 + u3 * 0.18,     // 1.12 .. 1.30s
        minGapFactor: 0.92 + u2 * 0.12,
        accelFactor: 1.08 + u3 * 0.15,
        comfortBrakeFactor: 1.05 + u2 * 0.15,
        politeness: 0.38 + u3 * 0.18,
        laneChangeThreshold: 8 + u2 * 5,
        reactionTime: 0.22 + u3 * 0.12,
        attentiveness: 0.84 + u2 * 0.14,
        corneringFactor: 1.05 + u3 * 0.12,
        preferredLaneBias: u2 > 0.45 ? 1 : 0
      };
      break;
    case 'hurried':
      profile = {
        archetype,
        speedFactor: 1.10 + u2 * 0.13,            // 1.10 .. 1.23
        desiredTimeHeadway: 0.95 + u3 * 0.16,     // 0.95 .. 1.11s
        minGapFactor: 0.84 + u2 * 0.10,
        accelFactor: 1.16 + u3 * 0.16,
        comfortBrakeFactor: 1.14 + u2 * 0.16,
        politeness: 0.20 + u3 * 0.15,             // Impatient, overtakes proactively
        laneChangeThreshold: 5 + u2 * 4,
        reactionTime: 0.20 + u3 * 0.14,
        attentiveness: 0.80 + u2 * 0.16,
        corneringFactor: 1.10 + u3 * 0.12,
        preferredLaneBias: 1
      };
      break;
    case 'aggressive':
      profile = {
        archetype,
        speedFactor: 1.16 + u2 * 0.15,            // 1.16 .. 1.31 above speed limit
        desiredTimeHeadway: 0.82 + u3 * 0.15,     // Tailgates closer (0.82 .. 0.97s)
        minGapFactor: 0.78 + u2 * 0.10,
        accelFactor: 1.24 + u3 * 0.18,            // Brisk acceleration
        comfortBrakeFactor: 1.22 + u2 * 0.18,     // Late, harder braking
        politeness: 0.05 + u3 * 0.12,             // Asserts into gaps
        laneChangeThreshold: 3.5 + u2 * 3.0,      // Changes lanes at the slightest slowdown ahead
        reactionTime: 0.18 + u3 * 0.15,
        attentiveness: 0.78 + u2 * 0.18,          // High reflex for swerving, occasional overconfidence
        corneringFactor: 1.14 + u3 * 0.14,
        preferredLaneBias: 1
      };
      break;
    case 'normal':
    default:
      profile = {
        archetype: 'normal',
        speedFactor: 0.94 + u2 * 0.13 + j1 * 0.02, // 0.93 .. 1.08
        desiredTimeHeadway: 1.30 + u3 * 0.25,      // 1.30 .. 1.55s
        minGapFactor: 0.98 + u2 * 0.14,
        accelFactor: 0.92 + u3 * 0.18,
        comfortBrakeFactor: 0.94 + u2 * 0.16,
        politeness: 0.45 + u3 * 0.22,
        laneChangeThreshold: 11 + u2 * 6,
        reactionTime: 0.28 + u3 * 0.16,
        attentiveness: 0.76 + u2 * 0.18,
        corneringFactor: 0.96 + u3 * 0.12 + j2 * 0.02,
        preferredLaneBias: u2 > 0.65 ? 1 : (u2 < 0.35 ? -1 : 0)
      };
      break;
  }

  car.driverProfile = profile;
  return profile;
}

/**
 * Computes authentic cruising speed (in px/s) tailored to vehicle type, road speed limit, and individual DriverProfile.
 * First-principles simulation: heavy machinery & tractors maintain realistic low cruising speeds,
 * while passenger cars, taxis, and sports cars reflect their driver's unique personality (cautious, normal, hurried, aggressive).
 */
export function getVehicleCruiseSpeedPx(car: Vehicle, road: RoadSegment | null): number {
  const roadLimitKmh = getRoadSpeedLimitKmh(road);
  const type = car.type;
  const profile = ensureDriverProfile(car);
  let vehicleCruiseKmh = roadLimitKmh * profile.speedFactor;

  // Agricultural Tractors: strictly low working cruise (24 - 30 km/h)
  if (type.startsWith('tractor_')) {
    vehicleCruiseKmh = Math.min(29, roadLimitKmh * 0.50 * (0.92 + (profile.speedFactor - 0.85) * 0.4));
  }
  // Soviet Moped: ~34 - 41 km/h
  else if (type === 'moped_soviet') {
    vehicleCruiseKmh = Math.min(41, roadLimitKmh * 0.66 * (0.92 + (profile.speedFactor - 0.85) * 0.4));
  }
  // Heavy dump trucks, concrete mixers, garbage trucks, ZIL-130
  else if (['truck_dump', 'truck_zil_dump', 'cement_mixer', 'garbage_truck', 'truck_water', 'truck_tanker'].includes(type)) {
    vehicleCruiseKmh = Math.min(72, roadLimitKmh * 0.84 * profile.speedFactor);
  }
  // Long-haul semi trucks, delivery trucks, city buses, old cargo vans
  else if (['truck_semi', 'truck_box', 'truck_covered', 'truck_flatbed', 'bus', 'bus_minibus', 'delivery_truck', 'van_cargo_old'].includes(type)) {
    vehicleCruiseKmh = Math.min(84, roadLimitKmh * 0.90 * profile.speedFactor);
  }
  // Sports cars & supercars & sport motorcycles
  else if (['sports', 'supercar', 'coupe_gt', 'moto_sport'].includes(type)) {
    vehicleCruiseKmh = (roadLimitKmh + 6) * profile.speedFactor;
  }
  // Taxis: brisk urban driving
  else if (type === 'taxi') {
    vehicleCruiseKmh = (roadLimitKmh + 3) * profile.speedFactor;
  }
  // Police in normal patrol
  else if (type === 'police' && car.emergencyState !== 'chase') {
    vehicleCruiseKmh = roadLimitKmh * profile.speedFactor;
  }
  // Standard civilian passenger cars, crossovers, wagons, pickups, vintage cars
  else {
    vehicleCruiseKmh = Math.max(28, roadLimitKmh * profile.speedFactor);
  }

  // Police in active chase
  if (car.emergencyState === 'chase' && type === 'police') {
    vehicleCruiseKmh = Math.max(118, roadLimitKmh + 38);
  }

  // Dispatched fire engine
  if ((car as any).isFireDispatch) {
    vehicleCruiseKmh = Math.max(85, roadLimitKmh + 15);
  }

  const maxPhysicalPx = CAR_CONFIGS[type]?.maxSpeed || 480;
  return Math.min(maxPhysicalPx * 0.96, vehicleCruiseKmh * SPEED_KMH_TO_PX_S);
}

/**
 * Realistic turning speeds scaled by vehicle geometry and the driver's cornering confidence.
 */
export function getTurnSpeedPx(car: Vehicle, isRightTurn: boolean, isTurnaround: boolean): number {
  const isHeavy = car.length > 52 || (car.wheelBase || 28) > 34 || car.type.startsWith('truck_') || car.type.startsWith('tractor_') || car.type === 'bus';
  const isMoto = car.type.startsWith('moto_') || car.type === 'moped_soviet';
  const isSports = car.type === 'sports' || car.type === 'supercar' || car.type === 'coupe_gt';
  const profile = ensureDriverProfile(car);
  const cFactor = profile.corneringFactor || 1.0;

  if (isTurnaround) {
    return 17 * cFactor * SPEED_KMH_TO_PX_S;
  }

  if (isHeavy) {
    const turnKmh = (isRightTurn ? 16 : 23) * Math.min(1.08, cFactor);
    return turnKmh * SPEED_KMH_TO_PX_S;
  }

  if (isMoto) {
    const turnKmh = (isRightTurn ? 23 : 30) * cFactor;
    return turnKmh * SPEED_KMH_TO_PX_S;
  }

  if (isSports) {
    const turnKmh = (isRightTurn ? 26 : 34) * cFactor;
    return turnKmh * SPEED_KMH_TO_PX_S;
  }

  // Standard passenger car
  const turnKmh = (isRightTurn ? 22 : 29) * cFactor;
  return turnKmh * SPEED_KMH_TO_PX_S;
}

/**
 * Returns weighted vehicle archetype distribution tailored to the territory and road hierarchy.
 */
export function getTerritoryVehicleArchetypes(road: RoadSegment | null, x: number, y: number): { type: CarType; weight: number }[] {
  const name = road?.name || '';
  const isAvenueOrHighway = road?.isAvenue || (road?.lanes || 2) >= 4 || (road?.width || 96) >= 140 ||
    name.includes('Трасса') || name.includes('Шоссе') || name.includes('Highway') ||
    name.includes('Вектор') || name.includes('Boulevard') || name.includes('проспект');

  const isIndustrialOrCargo = name.includes('пакгауз') || name.includes('Карьер') ||
    name.includes('МТС') || name.includes('Грузов') || (x < 1600 && y < 1600);

  const isResidentialOrGarages = (road?.width || 96) <= 96 ||
    name.includes('тупик') || name.includes('гараж') || name.includes('Дачн') ||
    name.includes('Садов') || name.includes('Луговой') || name.includes('Березов') ||
    name.includes('Кленов') || name.includes('Речн') || name.includes('Моторный') ||
    name.includes('Автомобилистов');

  // 1. HIGHWAYS, EXPRESSWAYS & MAIN AVENUES (M-12, Pacific Hwy, Grand Blvd, Metro Ave)
  if (isAvenueOrHighway) {
    return [
      { type: 'sedan', weight: 14 },
      { type: 'sedan_compact', weight: 10 },
      { type: 'sedan_polo', weight: 10 },
      { type: 'sedan_accent', weight: 8 },
      { type: 'wagon_modern', weight: 7 },
      { type: 'crossover_compact', weight: 8 },
      { type: 'suv', weight: 8 },
      { type: 'suv_luxury', weight: 4 },
      { type: 'truck_semi', weight: 5 },
      { type: 'truck_box', weight: 4 },
      { type: 'truck_tanker', weight: 3 },
      { type: 'truck_covered', weight: 3 },
      { type: 'truck_flatbed', weight: 2 },
      { type: 'pickup_heavy', weight: 3 },
      { type: 'bus', weight: 5 },
      { type: 'bus_minibus', weight: 2 },
      { type: 'sports', weight: 3 },
      { type: 'coupe_gt', weight: 2 },
      { type: 'supercar', weight: 1 },
      { type: 'moto_sport', weight: 1 },
      { type: 'taxi', weight: 4 },
      { type: 'police', weight: 2 }
    ];
  }

  // 2. INDUSTRIAL DEPOT, FREIGHT TERMINAL & QUARRY ACCESS
  if (isIndustrialOrCargo) {
    return [
      { type: 'truck_zil_dump', weight: 14 },
      { type: 'truck_dump', weight: 10 },
      { type: 'truck_flatbed', weight: 9 },
      { type: 'truck_covered', weight: 7 },
      { type: 'truck_box', weight: 6 },
      { type: 'cement_mixer', weight: 4 },
      { type: 'truck_water', weight: 3 },
      { type: 'truck_tow', weight: 2 },
      { type: 'van_cargo_old', weight: 10 },
      { type: 'delivery_truck', weight: 8 },
      { type: 'pickup_heavy', weight: 4 },
      { type: 'van', weight: 3 },
      { type: 'sedan_logan', weight: 4 },
      { type: 'sedan_classic', weight: 4 },
      { type: 'wagon_classic', weight: 4 },
      { type: 'tractor_mtz82', weight: 5 },
      { type: 'tractor_mtz80', weight: 3 }
    ];
  }

  // 3. RESIDENTIAL LANES, DACHAS, GARAGES & OUTSKIRTS
  if (isResidentialOrGarages) {
    return [
      { type: 'sedan_classic', weight: 10 },
      { type: 'wagon_classic', weight: 9 },
      { type: 'sedan_samara', weight: 8 },
      { type: 'hatch_samara', weight: 7 },
      { type: 'sedan_logan', weight: 7 },
      { type: 'sedan_nexia', weight: 6 },
      { type: 'liftback_tavria', weight: 5 },
      { type: 'compact_matiz', weight: 5 },
      { type: 'classic_compact', weight: 3 },
      { type: 'suv_classic_box', weight: 7 },
      { type: 'van_cargo_old', weight: 5 },
      { type: 'pickup', weight: 4 },
      { type: 'moto_izh_jupiter', weight: 5 },
      { type: 'moto_ural_sidecar', weight: 4 },
      { type: 'moto_jawa350', weight: 3 },
      { type: 'moped_soviet', weight: 4 },
      { type: 'tractor_mtz80_old', weight: 3 },
      { type: 'tractor_mtz80', weight: 2 },
      { type: 'truck_flatbed', weight: 3 }
    ];
  }

  // 4. CENTRAL CITY STREETS, SHOPPING DISTRICT & COMMERCIAL CORRIDORS (Broadway, Parkside, Commerce, Financial, etc.)
  return [
    { type: 'sedan', weight: 12 },
    { type: 'sedan_compact', weight: 10 },
    { type: 'sedan_accent', weight: 9 },
    { type: 'sedan_polo', weight: 9 },
    { type: 'sedan_logan', weight: 7 },
    { type: 'hatchback', weight: 7 },
    { type: 'hatch_hot', weight: 4 },
    { type: 'compact_matiz', weight: 5 },
    { type: 'crossover_compact', weight: 7 },
    { type: 'suv', weight: 6 },
    { type: 'wagon_modern', weight: 4 },
    { type: 'taxi', weight: 14 },
    { type: 'delivery_truck', weight: 6 },
    { type: 'van', weight: 4 },
    { type: 'bus', weight: 3 },
    { type: 'garbage_truck', weight: 2 },
    { type: 'police', weight: 2 },
    { type: 'ambulance', weight: 1 }
  ];
}

export function pickWeightedVehicleType(candidates: { type: CarType; weight: number }[]): CarType {
  const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
  let randomVal = Math.random() * totalWeight;
  for (const item of candidates) {
    if (randomVal < item.weight) {
      return item.type;
    }
    randomVal -= item.weight;
  }
  return candidates[0].type;
}

// Find adjacent lanes travelling in the same direction (for multi-lane roads: avenues, ring-roads, highways)
export function getAdjacentSameDirectionLanes(
  world: GameWorld,
  currentLaneId: string | null
): { leftLane: RoadSegment['lanePaths'][0] | null; rightLane: RoadSegment['lanePaths'][0] | null } {
  if (!currentLaneId) return { leftLane: null, rightLane: null };
  const road = findRoadByLaneId(world, currentLaneId);
  if (!road || !road.lanePaths) return { leftLane: null, rightLane: null };
  const currentLane = road.lanePaths.find((l) => l.laneId === currentLaneId);
  if (!currentLane || currentLane.waypoints.length < 2) return { leftLane: null, rightLane: null };

  const cStart = currentLane.waypoints[0];
  const cEnd = currentLane.waypoints[currentLane.waypoints.length - 1];
  const cDx = cEnd.x - cStart.x;
  const cDy = cEnd.y - cStart.y;
  const cLen = Math.hypot(cDx, cDy);
  if (cLen === 0) return { leftLane: null, rightLane: null };
  const cDirX = cDx / cLen;
  const cDirY = cDy / cLen;

  // Normal pointing to the LEFT of lane heading (-sin, cos):
  const leftNormX = -cDirY;
  const leftNormY = cDirX;

  let leftCandidate: RoadSegment['lanePaths'][0] | null = null;
  let minLeftDist = Infinity;
  let rightCandidate: RoadSegment['lanePaths'][0] | null = null;
  let minRightDist = Infinity;

  for (const lane of road.lanePaths) {
    if (lane.laneId === currentLaneId || !lane.waypoints || lane.waypoints.length < 2) continue;
    // Same general direction check (within ~25 degrees / 0.45 rad)
    if (Math.abs(angleDiff(lane.direction, currentLane.direction)) > 0.45) continue;

    const lStart = lane.waypoints[0];
    // Signed lateral offset: positive = LEFT, negative = RIGHT
    const lateralOffset = (lStart.x - cStart.x) * leftNormX + (lStart.y - cStart.y) * leftNormY;

    // Normal adjacent lane spacing is 14 to 48 pixels
    if (lateralOffset > 10 && lateralOffset < 50) {
      if (lateralOffset < minLeftDist) {
        minLeftDist = lateralOffset;
        leftCandidate = lane;
      }
    } else if (lateralOffset < -10 && lateralOffset > -50) {
      const absOffset = Math.abs(lateralOffset);
      if (absOffset < minRightDist) {
        minRightDist = absOffset;
        rightCandidate = lane;
      }
    }
  }

  return { leftLane: leftCandidate, rightLane: rightCandidate };
}

// Safety check before changing lanes (ПДД: Безопасность при перестроении)
export function isLaneClearForMerge(
  car: Vehicle,
  targetLane: RoadSegment['lanePaths'][0],
  world: GameWorld,
  vehGrid?: SpatialGrid<Vehicle>,
  propGrid?: SpatialGrid<StreetProp>
): boolean {
  if (!targetLane || targetLane.waypoints.length < 2) return false;

  // Check if target road segment is blocked by accident/traffic jam
  const wpFirst = targetLane.waypoints[0];
  const wpLast = targetLane.waypoints[targetLane.waypoints.length - 1];
  if (isRoadSegmentBlocked(world, wpFirst.x, wpFirst.y, wpLast.x, wpLast.y).isBlocked) {
    return false;
  }

  const profile = ensureDriverProfile(car);
  const laneCos = Math.cos(targetLane.direction);
  const laneSin = Math.sin(targetLane.direction);

  const scanDist = Math.max(340, 120 + car.speed * 1.8);
  const nearby = vehGrid ? vehGrid.queryRadius(car.x, car.y, scanDist) : world.vehicles;

  const p0 = targetLane.waypoints[0];
  const p1 = targetLane.waypoints[targetLane.waypoints.length - 1];
  const segDx = p1.x - p0.x;
  const segDy = p1.y - p0.y;
  const segLen = Math.hypot(segDx, segDy);
  if (segLen === 0) return false;

  // Politeness scales safety margins: cautious drivers demand larger gaps, assertive drivers accept tighter windows
  const politenessScale = 0.78 + profile.politeness * 0.45;

  for (const other of nearby) {
    if (other.id === car.id || other.isParked) continue;
    if (other.ghostingAlpha !== undefined && other.ghostingAlpha < 0.9) continue;

    // Check if other vehicle is also in active lane changing / overtaking into the same corridor
    if (other.aiState === 'lane_changing' || other.aiState === 'overtaking' || (other.avoidanceOffset && Math.abs(other.avoidanceOffset) > 5)) {
      const dToOther = Math.hypot(other.x - car.x, other.y - car.y);
      if (dToOther < 62) return false;
    }

    const otherPerpDist = Math.abs((other.x - p0.x) * segDy - (other.y - p0.y) * segDx) / segLen;
    if (otherPerpDist < 22) {
      const relX = other.x - car.x;
      const relY = other.y - car.y;
      const distLong = relX * laneCos + relY * laneSin;
      const combinedHalfL = (car.length + other.length) * 0.5;

      // 1. Blind spot / vehicle alongside in target lane
      if (Math.abs(distLong) < combinedHalfL + 16 * politenessScale) {
        return false;
      }
      // 2. Vehicle approaching from behind in target lane (time-to-collision & induced braking check)
      if (distLong < 0) {
        const rearGap = Math.max(1, -distLong - combinedHalfL);
        const closingVel = other.speed - car.speed;
        const minRearGap = (22 + Math.max(0, car.speed) * 0.35) * politenessScale;
        if (rearGap < minRearGap) return false;
        if (closingVel > 0) {
          const ttcRear = rearGap / closingVel;
          const inducedDecel = (closingVel * closingVel) / (2 * rearGap);
          const maxAcceptableFollowerBrake = 220 * (1.25 - profile.politeness * 0.5);
          if (ttcRear < 1.8 * politenessScale || inducedDecel > maxAcceptableFollowerBrake) {
            return false;
          }
        }
      }
      // 3. Vehicle immediately ahead in target lane too close
      if (distLong > 0) {
        const frontGap = distLong - combinedHalfL;
        const minFrontGap = (26 + Math.max(0, car.speed - other.speed) * 0.95) * politenessScale;
        if (frontGap < minFrontGap) {
          return false;
        }
        // 4. Stationary / crashed vehicle ahead in target lane
        if (frontGap < 155 && (Math.abs(other.speed) < 6 || isVehicleDisabledOrCrashed(other))) {
          return false;
        }
      }
    }
  }

  // Check solid props on target lane
  const propsToScan = propGrid ? propGrid.queryRadius(car.x, car.y, 130) : world.props;
  for (const prop of propsToScan) {
    const hitbox = getPropHitbox(prop);
    if (hitbox.shape === 'none' || (prop.isBroken && hitbox.isWalkableWhenBroken)) continue;
    const pPerp = Math.abs((prop.x - p0.x) * segDy - (prop.y - p0.y) * segDx) / segLen;
    if (pPerp < 16) {
      const relX = prop.x - car.x;
      const relY = prop.y - car.y;
      const distLong = relX * laneCos + relY * laneSin;
      if (distLong > -10 && distLong < 110) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Initializes a smooth minimum-jerk quintic polynomial S-curve lateral maneuver:
 * d(u) = d0 + (d1 - d0) * (10 u^3 - 15 u^4 + 6 u^5)
 */
export function startLateralSpline(car: Vehicle, targetOffset: number, longitudinalHorizon: number) {
  const currentOff = car.avoidanceOffset || 0;
  car.targetAvoidanceOffset = targetOffset;
  car.avoidanceSpline = {
    startOffset: currentOff,
    targetOffset,
    traveledDist: 0,
    totalDist: Math.max(42, longitudinalHorizon)
  };
}

/**
 * Evaluates lane change utility using the MOBIL (Minimizing Overall Braking Induced by Lane Changes) model,
 * combined with Keep-Right politeness (yielding fast lane to faster traffic behind) and Pre-Turn lane alignment.
 */
export function evaluateMobilLaneChange(
  car: Vehicle,
  targetLane: RoadSegment['lanePaths'][0],
  direction: 'left' | 'right',
  leadObstacle: DetectedTrafficObstacle | null,
  world: GameWorld,
  vehGrid?: SpatialGrid<Vehicle>,
  propGrid?: SpatialGrid<StreetProp>
): { shouldChange: boolean; utility: number; reason: 'overtake' | 'keep_right' | 'turn_align' | 'bypass' } {
  if (!isLaneClearForMerge(car, targetLane, world, vehGrid, propGrid)) {
    return { shouldChange: false, utility: -999, reason: 'overtake' };
  }

  const profile = ensureDriverProfile(car);
  const road = findRoadByLaneId(world, targetLane.laneId);
  const desiredSpeed = getVehicleCruiseSpeedPx(car, road);

  const laneCos = Math.cos(targetLane.direction);
  const laneSin = Math.sin(targetLane.direction);
  const p0 = targetLane.waypoints[0];
  const p1 = targetLane.waypoints[targetLane.waypoints.length - 1];
  const segDx = p1.x - p0.x;
  const segDy = p1.y - p0.y;
  const segLen = Math.hypot(segDx, segDy);
  if (segLen < 1) return { shouldChange: false, utility: -999, reason: 'overtake' };

  const scanDist = Math.max(360, 140 + car.speed * 1.8);
  const nearby = vehGrid ? vehGrid.queryRadius(car.x, car.y, scanDist) : world.vehicles;

  // Find closest leader in target lane and closest fast follower behind us in current lane
  let targetLeadDist = Infinity;
  let targetLeadSpeed = desiredSpeed;
  let fasterFollowerBehindInCurrentLane = false;
  let followerSpeedAdvantage = 0;

  for (const other of nearby) {
    if (other.id === car.id || other.isParked) continue;
    const relX = other.x - car.x;
    const relY = other.y - car.y;
    const distLong = relX * laneCos + relY * laneSin;

    // Check if 'other' is in the target lane ahead
    const targetPerp = Math.abs((other.x - p0.x) * segDy - (other.y - p0.y) * segDx) / segLen;
    if (targetPerp < 20 && distLong > 0 && distLong < targetLeadDist) {
      targetLeadDist = distLong;
      targetLeadSpeed = Math.max(0, other.speed);
    }

    // Check if 'other' is right behind us in our CURRENT lane wanting to go faster
    if (other.currentLaneId === car.currentLaneId && distLong < -12 && distLong > -210) {
      const otherDesired = other.isPlayerControlled ? Math.max(other.speed, car.speed + 35) : getVehicleCruiseSpeedPx(other, road);
      const speedAdv = Math.max(other.speed - car.speed, otherDesired - desiredSpeed);
      if (speedAdv > 16 || other.isHonking || other.sirenOn) {
        fasterFollowerBehindInCurrentLane = true;
        followerSpeedAdvantage = Math.max(followerSpeedAdvantage, speedAdv);
      }
    }
  }

  let utility = 0;
  let reason: 'overtake' | 'keep_right' | 'turn_align' | 'bypass' = 'overtake';

  // 1. Stationary or Slow Lead Obstacle in Current Lane -> Strong Overtake / Bypass Incentive
  if (leadObstacle) {
    if (leadObstacle.isStationary || leadObstacle.isCrashed || leadObstacle.isParked) {
      // Must change lanes if target lane is clearer than current blocked lane
      if (targetLeadDist > leadObstacle.distLong + 75) {
        utility += 140;
        reason = 'bypass';
      }
    } else if (leadObstacle.isSlow && leadObstacle.distLong < 320) {
      const mySpeedDeficit = Math.max(0, desiredSpeed - leadObstacle.speed);
      const targetSpeedGain = Math.min(desiredSpeed, targetLeadSpeed) - leadObstacle.speed;
      // Only overtake if the target lane actually flows faster and has room
      if (targetSpeedGain > 14 && targetLeadDist > leadObstacle.distLong + 55) {
        const proximityUrgency = Math.max(0.4, 1.3 - leadObstacle.distLong / 320);
        utility += (mySpeedDeficit * 0.45 + targetSpeedGain * 0.35) * proximityUrgency;
        // Left-hand overtaking preference (ПДД)
        if (direction === 'left') utility += 8;
        else utility -= 4 * profile.politeness;
        reason = 'overtake';
      }
    }
  }

  // 2. Keep-Right / Yield Fast Lane to Faster Follower Behind
  if (direction === 'right' && !leadObstacle && targetLeadDist > 240) {
    if (fasterFollowerBehindInCurrentLane && profile.politeness > 0.22) {
      utility += 32 * profile.politeness + followerSpeedAdvantage * 0.25;
      reason = 'keep_right';
    } else if (profile.preferredLaneBias < 0 && targetLeadDist > 320) {
      // Cautious / heavy / elderly drivers naturally prefer cruising in the right lane when clear
      utility += 16;
      reason = 'keep_right';
    }
  }

  // 3. Pre-Intersection Turn Lane Alignment
  const currentLane = findLaneById(world, car.currentLaneId);
  if (currentLane && currentLane.waypoints.length >= 2) {
    const endWp = currentLane.waypoints[currentLane.waypoints.length - 1];
    const distToEnd = Math.hypot(endWp.x - car.x, endWp.y - car.y);
    if (distToEnd > 70 && distToEnd < 380) {
      const hasLeftInCurr = currentLane.connections?.some((c) => c.turnType === 'left');
      const hasRightInCurr = currentLane.connections?.some((c) => c.turnType === 'right');
      const hasLeftInTarget = targetLane.connections?.some((c) => c.turnType === 'left');
      const hasRightInTarget = targetLane.connections?.some((c) => c.turnType === 'right');

      if (car.plannedTurn === 'left' && !hasLeftInCurr && hasLeftInTarget && direction === 'left') {
        utility += 85;
        reason = 'turn_align';
      } else if (car.plannedTurn === 'right' && !hasRightInCurr && hasRightInTarget && direction === 'right') {
        utility += 85;
        reason = 'turn_align';
      }
    }
  }

  const threshold = profile.laneChangeThreshold || 10;
  return {
    shouldChange: utility > threshold,
    utility,
    reason
  };
}

// Execute lane change maneuver using a smooth Quintic S-Curve in Frenet coordinates
export function executeLaneChange(
  car: Vehicle,
  targetLane: RoadSegment['lanePaths'][0],
  direction: 'left' | 'right'
) {
  const profile = ensureDriverProfile(car);
  car.turnSignal = direction;
  car.laneChangeCooldown = Math.max(2.6, 4.2 - (1.0 - profile.politeness) * 1.4);

  // Compute current lateral position of the car relative to the NEW targetLane centerline
  // so that switching routeWaypoints to targetLane does NOT cause any discontinuity!
  const p0 = targetLane.waypoints[0];
  const p1 = targetLane.waypoints[targetLane.waypoints.length - 1];
  const segDx = p1.x - p0.x;
  const segDy = p1.y - p0.y;
  const segLen = Math.hypot(segDx, segDy);
  let initialOffsetFromTarget = direction === 'left' ? -24 : 24;
  if (segLen > 1) {
    const leftNormX = -segDy / segLen;
    const leftNormY = segDx / segLen;
    initialOffsetFromTarget = (car.x - p0.x) * leftNormX + (car.y - p0.y) * leftNormY;
    initialOffsetFromTarget = Math.max(-36, Math.min(36, initialOffsetFromTarget));
  }

  car.currentLaneId = targetLane.laneId;
  car.routeWaypoints = [...targetLane.waypoints];

  const laneCos = Math.cos(targetLane.direction);
  const laneSin = Math.sin(targetLane.direction);
  let bestIdx = 0;
  for (let i = 0; i < targetLane.waypoints.length; i++) {
    const wp = targetLane.waypoints[i];
    const wpAhead = (wp.x - car.x) * laneCos + (wp.y - car.y) * laneSin;
    if (wpAhead > 18) {
      bestIdx = i;
      break;
    }
    bestIdx = i;
  }
  car.targetWaypointIndex = Math.min(targetLane.waypoints.length - 1, bestIdx);

  // Set current offset to exact current position relative to target lane, then smoothly S-curve to 0
  car.avoidanceOffset = initialOffsetFromTarget;
  const mergeHorizon = Math.max(90, Math.min(240, 55 + Math.max(35, car.speed) * (1.25 + profile.politeness * 0.35)));
  startLateralSpline(car, 0, mergeHorizon);

  car.laneChangeState = {
    targetLaneId: targetLane.laneId,
    direction,
    progress: 0,
    initialOffset: initialOffsetFromTarget,
    traveledDist: 0,
    totalDist: mergeHorizon,
    signalWarmup: 0.25 + profile.politeness * 0.25
  };
  car.aiState = 'lane_changing';
}

export interface DetectedTrafficObstacle {
  id: string;
  type: 'vehicle' | 'prop';
  x: number;
  y: number;
  distLong: number;
  distLat: number;
  signedLat: number;
  minLatSpan: number;   // Rightmost edge of obstacle (or obstacle cluster) in car's local lateral frame
  maxLatSpan: number;   // Leftmost edge of obstacle (or obstacle cluster) in car's local lateral frame
  width: number;
  length: number;
  speed: number;
  acceleration: number;
  isStationary: boolean;
  isSlow: boolean;
  isHeadOnThreat: boolean;
  isForwardCrashThreat?: boolean;
  isParked: boolean;
  isCrashed: boolean;
}

// Scans for obstacles, stopped/slow vehicles, multi-car braking waves, solid props, and collision threats ahead
export function scanTrafficObstacles(
  car: Vehicle,
  world: GameWorld,
  vehGrid?: SpatialGrid<Vehicle>,
  propGrid?: SpatialGrid<StreetProp>
): {
  leadObstacle: DetectedTrafficObstacle | null;
  platoonBrakingObstacle: { distLong: number; speed: number; decel: number } | null;
  imminentHeadOnThreat: DetectedTrafficObstacle | null;
  imminentForwardThreat: DetectedTrafficObstacle | null;
  oncomingVehiclesInCloseProximity: boolean;
} {
  const carCos = Math.cos(car.angle);
  const carSin = Math.sin(car.angle);
  const profile = ensureDriverProfile(car);
  const road = findRoadByLaneId(world, car.currentLaneId);
  const desiredCruisePx = getVehicleCruiseSpeedPx(car, road);
  const lookaheadDist = Math.max(160, Math.min(880, 90 + car.speed * 2.1));

  let leadObstacle: DetectedTrafficObstacle | null = null;
  let minObsDist = Infinity;
  let platoonBrakingObstacle: { distLong: number; speed: number; decel: number } | null = null;
  let minPlatoonDist = Infinity;
  let imminentHeadOnThreat: DetectedTrafficObstacle | null = null;
  let imminentForwardThreat: DetectedTrafficObstacle | null = null;
  let minForwardThreatTTC = Infinity;
  let oncomingVehiclesInCloseProximity = false;

  const nearbyVehicles = vehGrid ? vehGrid.queryRadius(car.x, car.y, Math.max(420, lookaheadDist + 90)) : world.vehicles;

  for (const other of nearbyVehicles) {
    if (other.id === car.id) continue;
    if (other.ghostingAlpha !== undefined && other.ghostingAlpha < 0.9) continue;

    const relX = other.x - car.x;
    const relY = other.y - car.y;
    const distLong = relX * carCos + relY * carSin;
    const signedLat = relX * -carSin + relY * carCos;
    const distLat = Math.abs(signedLat);
    const aDiff = Math.abs(angleDiff(other.angle, car.angle));

    // Effective lateral half-width of 'other' accounting for its yaw angle relative to us
    const otherEffHalfW = Math.abs(Math.sin(aDiff)) * (other.length * 0.5) + Math.abs(Math.cos(aDiff)) * (other.width * 0.5);
    const otherEffHalfL = Math.abs(Math.cos(aDiff)) * (other.length * 0.5) + Math.abs(Math.sin(aDiff)) * (other.width * 0.5);

    // Check oncoming traffic in close forward proximity (needed to verify if left bypass is safe)
    if (aDiff > 1.8 && distLong > -10 && distLong < 190 + car.speed * 1.65 && signedLat > -15 && signedLat < 48) {
      oncomingVehiclesInCloseProximity = true;
    }

    // 1. Check imminent head-on collision threat (Уход от лобового столкновения)
    if (aDiff > 1.8 && distLong > 4 && distLong < 185 && distLat < (car.width * 0.5 + otherEffHalfW + 6.5)) {
      const closingSpeed = Math.max(18, car.speed + Math.max(0, other.speed));
      const netGap = Math.max(1, distLong - car.length * 0.5 - otherEffHalfL);
      const ttc = netGap / closingSpeed;
      if (ttc < 1.85) {
        imminentHeadOnThreat = {
          id: other.id,
          type: 'vehicle',
          x: other.x,
          y: other.y,
          distLong,
          distLat,
          signedLat,
          minLatSpan: signedLat - otherEffHalfW,
          maxLatSpan: signedLat + otherEffHalfW,
          width: otherEffHalfW * 2,
          length: other.length,
          speed: other.speed,
          acceleration: other.idmAcceleration || 0,
          isStationary: false,
          isSlow: false,
          isHeadOnThreat: true,
          isParked: false,
          isCrashed: false
        };
      }
    }

    // 2. Forward path corridor check (in our lane or directly ahead)
    const pathHalfW = car.width * 0.5 + otherEffHalfW + 3.5;
    if (distLong > 2 && distLong < lookaheadDist && distLat < pathHalfW) {
      const isCrashed = isVehicleDisabledOrCrashed(other) || (other.spinoutTimer !== undefined && other.spinoutTimer > 0);
      const isHazard = other.turnSignal === 'hazard';
      const otherForwardVel = other.speed * Math.cos(aDiff);
      const isStationary = other.isParked || isCrashed || isHazard || Math.abs(other.speed) < 6;
      // Fix: compare other's speed against our desired cruise speed, NOT "< 45 px/s (10 km/h)"!
      const isSlow =
        !isStationary &&
        aDiff < 0.85 &&
        other.speed < desiredCruisePx * 0.86 &&
        (car.speed - other.speed > 16 || desiredCruisePx - other.speed > 26);

      // Multi-car Platoon Brake-Wave Lookahead:
      // Detect any vehicle up to 680px ahead in our lane corridor that is braking hard, stopped, or wrecked!
      const isBrakingHardAhead =
        isStationary ||
        isCrashed ||
        (other.brakeLightsOn && (other.idmAcceleration || 0) < -95) ||
        (aDiff < 0.8 && otherForwardVel < car.speed - 55);
      if (isBrakingHardAhead && distLong < 680 && distLong < minPlatoonDist) {
        minPlatoonDist = distLong;
        platoonBrakingObstacle = {
          distLong: Math.max(1, distLong - car.length * 0.5 - otherEffHalfL),
          speed: Math.max(0, otherForwardVel),
          decel: other.idmAcceleration || (isStationary ? -300 : -150)
        };
      }

      // Check Imminent Rear-End or Cross-Obstacle Collision Threat (Уход от попутного/бокового столкновения)
      const netGap = Math.max(0.5, distLong - car.length * 0.5 - otherEffHalfL);
      const closingSpeed = car.speed - otherForwardVel;
      if (closingSpeed > 32 && netGap < 195) {
        const ttc = netGap / closingSpeed;
        const requiredDecel = (closingSpeed * closingSpeed) / (2 * netGap);
        // If stopping requires near-limit or impossible braking (> 370 px/s^2) and TTC is short
        if ((ttc < 1.75 && requiredDecel > 370) || (isStationary && ttc < 2.0 && car.speed > 95)) {
          if (ttc < minForwardThreatTTC) {
            minForwardThreatTTC = ttc;
            imminentForwardThreat = {
              id: other.id,
              type: 'vehicle',
              x: other.x,
              y: other.y,
              distLong,
              distLat,
              signedLat,
              minLatSpan: signedLat - otherEffHalfW,
              maxLatSpan: signedLat + otherEffHalfW,
              width: otherEffHalfW * 2,
              length: other.length,
              speed: Math.max(0, otherForwardVel),
              acceleration: other.idmAcceleration || 0,
              isStationary,
              isSlow,
              isHeadOnThreat: false,
              isForwardCrashThreat: true,
              isParked: other.isParked,
              isCrashed
            };
          }
        }
      }

      if (isStationary || isSlow || other.isParked) {
        if (distLong < minObsDist) {
          minObsDist = distLong;
          leadObstacle = {
            id: other.id,
            type: 'vehicle',
            x: other.x,
            y: other.y,
            distLong,
            distLat,
            signedLat,
            minLatSpan: signedLat - otherEffHalfW,
            maxLatSpan: signedLat + otherEffHalfW,
            width: otherEffHalfW * 2,
            length: other.length,
            speed: Math.max(0, otherForwardVel),
            acceleration: other.idmAcceleration || 0,
            isStationary,
            isSlow,
            isHeadOnThreat: false,
            isParked: other.isParked,
            isCrashed
          };
        }
      }
    }
  }

  // If we found a leadObstacle, expand its lateral span [minLatSpan, maxLatSpan] if there are other stationary/crashed
  // cars clustered within 90px behind/ahead of it, so the driver plans ONE clean wide bypass around the entire wreck!
  if (leadObstacle && leadObstacle.isStationary) {
    for (const other of nearbyVehicles) {
      if (other.id === car.id || other.id === leadObstacle.id) continue;
      if (Math.abs(other.speed) > 12 && !isVehicleDisabledOrCrashed(other)) continue;
      const dCluster = Math.hypot(other.x - leadObstacle.x, other.y - leadObstacle.y);
      if (dCluster < 95) {
        const relX = other.x - car.x;
        const relY = other.y - car.y;
        const sLat = relX * -carSin + relY * carCos;
        const aDiff = Math.abs(angleDiff(other.angle, car.angle));
        const effHW = Math.abs(Math.sin(aDiff)) * (other.length * 0.5) + Math.abs(Math.cos(aDiff)) * (other.width * 0.5);
        leadObstacle.minLatSpan = Math.min(leadObstacle.minLatSpan, sLat - effHW);
        leadObstacle.maxLatSpan = Math.max(leadObstacle.maxLatSpan, sLat + effHW);
      }
    }
  }

  // Also check solid street props on road
  const propsToCheck = propGrid ? propGrid.queryRadius(car.x, car.y, lookaheadDist + 15) : world.props;
  for (const prop of propsToCheck) {
    const hitbox = getPropHitbox(prop);
    if (hitbox.shape === 'none' || (prop.isBroken && hitbox.isWalkableWhenBroken)) continue;
    const pRadius = hitbox.shape === 'circle' ? (hitbox.radius || 6) : Math.max(hitbox.halfWidth || 10, hitbox.halfHeight || 10);

    const relX = prop.x - car.x;
    const relY = prop.y - car.y;
    const distLong = relX * carCos + relY * carSin;
    const signedLat = relX * -carSin + relY * carCos;
    const distLat = Math.abs(signedLat);

    if (distLong > 4 && distLong < lookaheadDist && distLat < (car.width * 0.5 + pRadius + 3.0)) {
      if (distLong < minObsDist) {
        minObsDist = distLong;
        leadObstacle = {
          id: prop.id,
          type: 'prop',
          x: prop.x,
          y: prop.y,
          distLong,
          distLat,
          signedLat,
          minLatSpan: signedLat - pRadius,
          maxLatSpan: signedLat + pRadius,
          width: pRadius * 2,
          length: pRadius * 2,
          speed: 0,
          acceleration: 0,
          isStationary: true,
          isSlow: false,
          isHeadOnThreat: false,
          isParked: false,
          isCrashed: false
        };
      }
    }
  }

  return {
    leadObstacle,
    platoonBrakingObstacle,
    imminentHeadOnThreat,
    imminentForwardThreat,
    oncomingVehiclesInCloseProximity
  };
}

// Checks if the planned lateral bypass path is clear of oncoming vehicles over the full passing horizon
export function isOncomingConflictWithOffset(
  car: Vehicle,
  lateralOffset: number,
  world: GameWorld,
  vehGrid?: SpatialGrid<Vehicle>
): boolean {
  if (lateralOffset <= 2) return false; // Rightward or tiny shift stays inside own lane
  const carCos = Math.cos(car.angle);
  const carSin = Math.sin(car.angle);
  const myPassSpeed = Math.max(45, car.speed);
  const scanRadius = Math.max(320, 180 + myPassSpeed * 1.8);
  const nearbyVehicles = vehGrid ? vehGrid.queryRadius(car.x, car.y, scanRadius) : world.vehicles;

  for (const other of nearbyVehicles) {
    if (other.id === car.id || other.isParked) continue;
    if (other.ghostingAlpha !== undefined && other.ghostingAlpha < 0.9) continue;
    const aDiff = Math.abs(angleDiff(other.angle, car.angle));
    if (aDiff < 1.7) continue; // Not oncoming

    const relX = other.x - car.x;
    const relY = other.y - car.y;
    const distLong = relX * carCos + relY * carSin;
    const closingVel = myPassSpeed + Math.max(25, other.speed);
    // Required longitudinal clearance for a ~2.4s bypass maneuver
    const requiredClearLong = Math.max(150, closingVel * 2.1);
    if (distLong <= -15 || distLong > requiredClearLong) continue;

    const signedLat = relX * -carSin + relY * carCos;
    const combinedHalfW = (car.width + other.width) * 0.5 + 5.0;

    // If oncoming car is within the lateral strip that our offset will occupy:
    if (signedLat > -combinedHalfW && signedLat < (lateralOffset + combinedHalfW)) {
      return true;
    }
  }

  return false;
}

// Checks if the planned lateral bypass path is clear of buildings, solid props, and parallel vehicles
export function isBypassCorridorClear(
  car: Vehicle,
  lateralOffset: number,
  world: GameWorld,
  propGrid?: SpatialGrid<StreetProp>,
  vehGrid?: SpatialGrid<Vehicle>,
  ignoreObstacleId?: string | null
): boolean {
  const carCos = Math.cos(car.angle);
  const carSin = Math.sin(car.angle);
  const normX = -carSin;
  const normY = carCos;

  const probeDistances = [12, 36, 68, 105];
  for (const forwardDist of probeDistances) {
    const px = car.x + carCos * forwardDist + normX * lateralOffset;
    const py = car.y + carSin * forwardDist + normY * lateralOffset;

    for (const bld of world.buildings) {
      if (px >= bld.x - 8 && px <= bld.x + bld.width + 8 &&
          py >= bld.y - 8 && py <= bld.y + bld.height + 8) {
        return false;
      }
    }

    const propsNear = propGrid ? propGrid.queryRadius(px, py, 28) : world.props;
    for (const prop of propsNear) {
      if (prop.id === ignoreObstacleId) continue;
      const hitbox = getPropHitbox(prop);
      if (hitbox.shape === 'none' || (prop.isBroken && hitbox.isWalkableWhenBroken)) continue;
      const pr = hitbox.shape === 'circle' ? (hitbox.radius || 6) : Math.max(hitbox.halfWidth || 8, hitbox.halfHeight || 8);
      if (Math.hypot(px - prop.x, py - prop.y) < pr + car.width * 0.5 + 3.0) {
        return false;
      }
    }
  }

  // Also verify no other vehicle is right alongside us in that lateral strip
  const nearbyVehs = vehGrid ? vehGrid.queryRadius(car.x, car.y, 130) : world.vehicles;
  for (const other of nearbyVehs) {
    if (other.id === car.id || other.id === ignoreObstacleId) continue;
    if (other.ghostingAlpha !== undefined && other.ghostingAlpha < 0.9) continue;
    const relX = other.x - car.x;
    const relY = other.y - car.y;
    const dLong = relX * carCos + relY * carSin;
    const sLat = relX * normX + relY * normY;
    const lMargin = (car.length + other.length) * 0.5 + 10;
    const wMargin = (car.width + other.width) * 0.5 + 4.5;
    if (dLong > -lMargin * 0.7 && dLong < lMargin + 35 && Math.abs(sLat - lateralOffset) < wMargin) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluates multiple lateral escape corridors (right shoulder/lane, left lane/bypass)
 * to find a physically clear trajectory that avoids an imminent collision threat.
 */
export function findBestEscapeCorridor(
  car: Vehicle,
  threat: DetectedTrafficObstacle,
  world: GameWorld,
  vehGrid?: SpatialGrid<Vehicle>,
  propGrid?: SpatialGrid<StreetProp>
): number | null {
  const myHalfW = car.width * 0.5;
  const clearanceBuffer = 6.5;

  // Exact lateral offsets required to clear the threat on the right (negative) or left (positive)
  const neededRightOffset = Math.min(-14.0, threat.minLatSpan - myHalfW - clearanceBuffer);
  const neededLeftOffset = Math.max(14.0, threat.maxLatSpan + myHalfW + clearanceBuffer);

  // Candidate escape offsets ordered by preference:
  // For head-on threats, strongly prefer swerving right (towards shoulder, away from oncoming lane).
  // For forward rear-end threats, prefer whichever side requires less steering deflection first.
  const candidates: number[] = [];
  if (threat.isHeadOnThreat) {
    candidates.push(
      Math.max(-32, neededRightOffset),
      Math.max(-36, neededRightOffset - 6),
      Math.min(32, neededLeftOffset)
    );
  } else {
    const rightDeflection = Math.abs(neededRightOffset - (car.avoidanceOffset || 0));
    const leftDeflection = Math.abs(neededLeftOffset - (car.avoidanceOffset || 0));
    if (rightDeflection <= leftDeflection + 4) {
      candidates.push(
        Math.max(-34, neededRightOffset),
        Math.min(34, neededLeftOffset),
        Math.max(-38, neededRightOffset - 6),
        Math.min(38, neededLeftOffset + 6)
      );
    } else {
      candidates.push(
        Math.min(34, neededLeftOffset),
        Math.max(-34, neededRightOffset),
        Math.min(38, neededLeftOffset + 6),
        Math.max(-38, neededRightOffset - 6)
      );
    }
  }

  for (const candOffset of candidates) {
    // Check if candidate offset actually clears the threat box
    if (candOffset + myHalfW > threat.minLatSpan - 2.0 && candOffset - myHalfW < threat.maxLatSpan + 2.0) {
      continue;
    }
    if (candOffset > 4 && isOncomingConflictWithOffset(car, candOffset, world, vehGrid)) {
      continue;
    }
    if (isBypassCorridorClear(car, candOffset, world, propGrid, vehGrid, threat.id)) {
      return candOffset;
    }
  }

  return null;
}

// Update traffic lights and pedestrian signals with adaptive actuation & anti-gridlock modulation
export function updateTrafficLights(intersections: Intersection[], dt: number, world?: GameWorld) {
  for (const inter of intersections) {
    if (!inter.hasLights) {
      // Uncontrolled intersections: force all stop lines to green and crosswalks to walk
      for (const line of inter.stopLines || []) {
        line.lightState = 'green';
      }
      for (const cw of inter.crosswalks || []) {
        cw.pedestrianSignal = 'walk';
      }
      continue;
    }

    if (!inter.phases || inter.phases.length === 0) continue;
    if (inter.currentPhaseIndex < 0 || inter.currentPhaseIndex >= inter.phases.length) {
      inter.currentPhaseIndex = 0;
    }
    inter.phaseTimer += dt;
    const currentPhase = inter.phases[inter.currentPhaseIndex];
    if (!currentPhase) continue;

    // Handle Signal Lost (Flashing Yellow Mode)
    if (inter.isSignalLost) {
      const isFlashOn = Math.floor(performance.now() / 500) % 2 === 0;
      const flashState = isFlashOn ? 'yellow' : 'off';
      for (const line of inter.stopLines || []) {
        line.lightState = flashState;
      }
      for (const cw of inter.crosswalks || []) {
        cw.pedestrianSignal = 'wait';
      }
      continue;
    }

    // ADAPTIVE PHASE TIMING & TRAFFIC PRESSURE MODULATION
    let effectiveDuration = currentPhase.duration;
    const isMainGreen = currentPhase.nsState === 'green' || currentPhase.ewState === 'green';

    if (world && isMainGreen && inter.phaseTimer > 3.5) {
      // Count approaching / waiting vehicles per direction
      let nsWaitingCount = 0;
      let ewWaitingCount = 0;
      let nsMovingApproaching = 0;
      let ewMovingApproaching = 0;
      let exitBlocked = false;

      const interBoxW = inter.width + 160;
      const interBoxH = inter.height + 160;

      for (const v of world.vehicles) {
        if (v.isParked || v.isPlayerControlled) continue;
        const dx = v.x - inter.x;
        const dy = v.y - inter.y;
        if (Math.abs(dx) < interBoxW && Math.abs(dy) < interBoxH) {
          const isNS = Math.abs(Math.cos(v.angle)) < 0.6; // heading north/south
          if (v.speed < 4.0) {
            if (isNS) nsWaitingCount++;
            else ewWaitingCount++;
          } else {
            if (isNS) nsMovingApproaching++;
            else ewMovingApproaching++;
          }
        }
      }

      const greenIsNS = currentPhase.nsState === 'green';
      const greenApproaching = greenIsNS ? nsMovingApproaching : ewMovingApproaching;
      const crossWaiting = greenIsNS ? ewWaitingCount : nsWaitingCount;

      // 1. Early Green Cut: No traffic on current green approach, but opposing approach is queued
      if (greenApproaching === 0 && crossWaiting > 0 && inter.phaseTimer > 3.8) {
        effectiveDuration = inter.phaseTimer; // Trigger smooth yellow transition
        trafficDiagnostics.adaptivePhaseSwitches++;
      }
      // 2. Platoon Extension: Active moving platoon crossing on green -> extend up to 24s
      else if (greenApproaching >= 2 && inter.phaseTimer < 24.0) {
        effectiveDuration = Math.max(currentPhase.duration, inter.phaseTimer + 3.0);
      }
    }

    if (inter.phaseTimer >= effectiveDuration) {
      inter.phaseTimer = 0;
      inter.currentPhaseIndex = (inter.currentPhaseIndex + 1) % inter.phases.length;
      const nextPhase = inter.phases[inter.currentPhaseIndex];
      if (nextPhase) {
        trafficDiagnostics.log(
          'light',
          `${inter.id.toUpperCase()}: Phase -> NS ${nextPhase.nsState.toUpperCase()} | EW ${nextPhase.ewState.toUpperCase()}`,
          undefined,
          inter.id
        );
      }
    }

    const phase = inter.phases[inter.currentPhaseIndex] || currentPhase;
    if (!phase) continue;

    // Vehicle stop lines
    for (const line of inter.stopLines || []) {
      if (line.direction === 'north' || line.direction === 'south') {
        line.lightState = phase.nsState;
      } else {
        line.lightState = phase.ewState;
      }
    }

    // Pedestrian crosswalk signals:
    // - North & South crosswalks cross the North-South road -> SAFE to cross ONLY when NS vehicles have RED (EW is green)
    // - West & East crosswalks cross the East-West road -> SAFE to cross ONLY when EW vehicles have RED (NS is green)
    for (const cw of inter.crosswalks || []) {
      if (cw.direction === 'north' || cw.direction === 'south') {
        cw.pedestrianSignal = phase.nsState === 'red' && (phase.ewState === 'green' || phase.ewState === 'green_flashing') ? 'walk' : 'wait';
      } else {
        cw.pedestrianSignal = phase.ewState === 'red' && (phase.nsState === 'green' || phase.nsState === 'green_flashing') ? 'walk' : 'wait';
      }
    }
  }
}

// Pure pursuit arc-length lookahead point finder with forward extrapolation (NO BACKWARD CLAMPING)
function getLookaheadPointOnPolyline(
  carX: number,
  carY: number,
  waypoints: Vector2D[],
  startIndex: number,
  lookaheadDist: number
): { point: Vector2D; targetIndex: number } {
  if (waypoints.length === 0) {
    return { point: { x: carX, y: carY }, targetIndex: 0 };
  }
  if (waypoints.length === 1) {
    return { point: waypoints[0], targetIndex: 0 };
  }

  // Project car onto the current segment to prevent backward lookahead vectors
  let remainingDist = lookaheadDist;
  let currIdx = Math.min(startIndex, waypoints.length - 1);
  let currX = carX;
  let currY = carY;

  if (currIdx > 0) {
    const prevWp = waypoints[currIdx - 1];
    const wp = waypoints[currIdx];
    const segDx = wp.x - prevWp.x;
    const segDy = wp.y - prevWp.y;
    const segLenSq = segDx * segDx + segDy * segDy;
    if (segLenSq > 0.001) {
      const t = ((carX - prevWp.x) * segDx + (carY - prevWp.y) * segDy) / segLenSq;
      const clampedT = Math.max(0, Math.min(1, t));
      currX = prevWp.x + segDx * clampedT;
      currY = prevWp.y + segDy * clampedT;
    }
  }

  while (currIdx < waypoints.length) {
    const wp = waypoints[currIdx];
    const segLen = Math.hypot(wp.x - currX, wp.y - currY);
    if (segLen >= remainingDist) {
      const ratio = remainingDist / Math.max(0.001, segLen);
      return {
        point: {
          x: currX + (wp.x - currX) * ratio,
          y: currY + (wp.y - currY) * ratio
        },
        targetIndex: currIdx
      };
    }
    remainingDist -= segLen;
    currX = wp.x;
    currY = wp.y;
    currIdx++;
  }

  // If lookahead exceeds the final waypoint, extrapolate along the final segment vector
  const lastWp = waypoints[waypoints.length - 1];
  const secondLastWp = waypoints[Math.max(0, waypoints.length - 2)];
  const segDx = lastWp.x - secondLastWp.x;
  const segDy = lastWp.y - secondLastWp.y;
  const segLen = Math.hypot(segDx, segDy);

  if (segLen > 0.001) {
    const extraDist = remainingDist;
    return {
      point: {
        x: lastWp.x + (segDx / segLen) * extraDist,
        y: lastWp.y + (segDy / segLen) * extraDist
      },
      targetIndex: waypoints.length - 1
    };
  }

  return { point: lastWp, targetIndex: waypoints.length - 1 };
}

// AI Traffic Management System
export function isVehicleDisabledOrCrashed(car: Vehicle): boolean {
  if (car.isPlayerControlled || (car as any).isRemoteControlled || car.isParked || car.id === 'evac_ambulance_special'|| (car as any).isFireDispatch) {
    return false;
  }
  if (car.isDerelict || (car as any).isDerelict || car.aiState === 'wrecked') {
    return true;
  }
  const dmg = car.damage;
  const eng = car.engineState;

  if (!dmg) return false;

  return (
    dmg.isFullyBurnt ||
    !!dmg.engineFire ||
    !!dmg.fuelTankFire ||
    !!dmg.cabinFire ||
    !!dmg.underHoodSmolder ||
    !!dmg.engineSmoking ||
    dmg.frontCrumple > 1.8 ||
    dmg.rearCrumple > 1.8 ||
    dmg.leftDent > 1.8 ||
    dmg.rightDent > 1.8 ||
    dmg.frontLeftDent > 1.8 ||
    dmg.frontRightDent > 1.8 ||
    (eng ? (eng.isSeized || eng.transmissionJammed || eng.engineHealth <= 15) : false)
  );
}

export function updateAITraffic(
  world: GameWorld,
  dt: number,
  vehGrid?: SpatialGrid<Vehicle>,
  pedGrid?: SpatialGrid<Pedestrian>,
  playerPos?: Vector2D,
  player?: any,
  propGrid?: SpatialGrid<StreetProp>
) {
  // Note: freeroam traffic is gated by the master switch in App.tsx (aiTrafficOnRef), not here.
  let totalSpeed = 0;
  let movingCars = 0;
  let deadlockedCars = 0;

  // Update intersection reservation arbiter (tokens, waiting queue, symmetry breaker)
  intersectionArbiter.update(dt, world);

  const playerCar = world.vehicles.find((v) => v.isPlayerControlled);
  const targetPos: Vector2D = playerPos || (playerCar ? { x: playerCar.x, y: playerCar.y } : { x: 4400, y: 2800 });

  // Filter active AI driving vehicles (excluding parked cars, player car, remote players, player-owned/spawned cars, and special evacuation ambulance)
  const activeAICars = world.vehicles.filter((v) => !v.isPlayerControlled && !(v as any).isRemoteControlled && !v.isParked && v.id !== 'evac_ambulance_special' && !v.keyId && v.ownerId !== 'player' && !(v as any).playerOwned && !(v as any).isSpawnedByPlayer);
  const totalActiveCount = activeAICars.length;

  // Maintain natural vehicle density around the player dynamically (balanced ~8-12 nearby, ~28 max active)
  const nearbyActiveCount = activeAICars.filter(
    (v) => Math.hypot(v.x - targetPos.x, v.y - targetPos.y) < 1400
  ).length;

  if (nearbyActiveCount < performanceConfig.nearbyVehiclesTarget && totalActiveCount < performanceConfig.maxVehicles) {
    const toSpawn = Math.min(1, performanceConfig.nearbyVehiclesTarget - nearbyActiveCount);
    for (let s = 0; s < toSpawn; s++) {
      spawnNewCarNearPlayer(targetPos, world);
    }
  }

  // --- POLICE CHASE & SIREN PATROL DETECTOR ---
  let activeSirenCount = 0;
  if (playerCar) {
    const playerSpeedKmh = Math.abs(playerCar.speed) * PX_S_TO_SPEED_KMH;
    const isPlayerReckless = playerSpeedKmh > 115 || (playerCar.damage && (playerCar.damage.frontCrumple > 8 || playerCar.damage.leftDent > 6));

    for (const car of world.vehicles) {
      if (car.type === 'police') {
        const distToPlayer = Math.hypot(car.x - playerCar.x, car.y - playerCar.y);
        if (isPlayerReckless && distToPlayer < 450) {
          car.sirenOn = true;
          car.emergencyState = 'chase';
          car.targetChaseVehicleId = playerCar.id;
          const maxS = CAR_CONFIGS[car.type]?.maxSpeed || 400;
          car.targetSpeed = Math.min(maxS, Math.abs(playerCar.speed) + 50);
        } else if (car.emergencyState === 'chase'&& distToPlayer > 850) {
          car.sirenOn = false;
          car.emergencyState = 'patrol';
        }
      }

      if (car.sirenOn) {
        activeSirenCount++;
        car.sirenStrobe = ((car.sirenStrobe || 0) + dt * 12) % (Math.PI * 2);
      }
    }
  }

  if (activeSirenCount > 0) {
    sound.startSiren();
    sound.updateSiren(dt);
  } else {
    sound.stopSiren();
  }

  const vehiclesToDespawn: string[] = [];
  const nowSec = performance.now() / 1000;
  globalMutualYieldArbiter.update(nowSec);

  // Precompute whether any vehicle or stain in the world is currently on fire (avoids O(N) radius queries per vehicle when no fire exists)
  let hasAnyWorldFire = false;
  for (let i = 0; i < world.vehicles.length; i++) {
    const d = world.vehicles[i].damage;
    if (d && !d.isFullyBurnt && (d.engineFire || d.fuelTankFire || d.cabinFire || d.underHoodSmolder || (d.fireIntensity || 0) > 0)) {
      hasAnyWorldFire = true;
      break;
    }
  }
  if (!hasAnyWorldFire && world.stains) {
    for (let i = 0; i < world.stains.length; i++) {
      const st = world.stains[i];
      if (st.onFire && (st.fireIntensity || 0) > 0) {
        hasAnyWorldFire = true;
        break;
      }
    }
  }

  for (const car of world.vehicles) {
    const distToPlayer = Math.hypot(car.x - targetPos.x, car.y - targetPos.y);
    const isPlayerOrSpecial = car.isPlayerControlled || (car as any).isRemoteControlled || car.id === 'evac_ambulance_special' || (car as any).isFireDispatch;
    const isOwnedOrKeyed = Boolean(car.keyId || car.ownerId === 'player' || (car as any).playerOwned || (car as any).isSpawnedByPlayer);

    // AI dynamic traffic vehicle that moved beyond field of view: DESPAWN IMMEDIATELY!
    if (!car.isParked && !isPlayerOrSpecial && !isOwnedOrKeyed && !car.isTrailer) {
      if (distToPlayer > 1500 || (totalActiveCount > performanceConfig.maxVehicles && distToPlayer > 850)) {
        intersectionArbiter.releaseReservation(car.id);
        car.intersectionReservationId = null;
        vehiclesToDespawn.push(car.id);
        continue;
      }
    }

    // Distant parked or stationary cars: SLEEP (skip AI, turn signal tick, fire spotting, yielding)
    if ((car.isParked || Math.abs(car.speed) < 1) && !isPlayerOrSpecial && distToPlayer > 1500) {
      continue;
    }

    // Basic state updates for active/nearby vehicles
    car.turnSignalTimer = (car.turnSignalTimer || 0) + dt;
    car.angle = ((car.angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

    // --- PASSING FIRE VEHICLE FIRE SPOTTING ---
    const isAnyFireVehicle = car.type === 'fire_engine'|| car.type === 'fire_ladder'|| car.type === 'fire_rescue'|| car.type.startsWith('fire_');
    if (hasAnyWorldFire && isAnyFireVehicle && !(car as any).isFireDispatch && !car.isParked && !car.isPlayerControlled && !(car as any).isRemoteControlled) {
      let nearestFirePos: Vector2D | null = null;

      // 1. Check vehicles on fire
      for (const otherCar of world.vehicles) {
        if (otherCar.damage && !otherCar.damage.isFullyBurnt) {
          const hasFire = otherCar.damage.engineFire || otherCar.damage.fuelTankFire || otherCar.damage.cabinFire || otherCar.damage.underHoodSmolder || (otherCar.damage.fireIntensity || 0) > 0;
          if (hasFire) {
            const dist = Math.hypot(otherCar.x - car.x, otherCar.y - car.y);
            if (dist < 350) {
              nearestFirePos = { x: otherCar.x, y: otherCar.y };
              break;
            }
          }
        }
      }

      // 2. Check stains/puddles on fire
      if (!nearestFirePos && world.stains) {
        for (const st of world.stains) {
          if (st.onFire && (st.fireIntensity || 0) > 0) {
            const dist = Math.hypot(st.x - car.x, st.y - car.y);
            if (dist < 350) {
              nearestFirePos = { x: st.x, y: st.y };
              break;
            }
          }
        }
      }

      if (nearestFirePos) {
        // --- PREVENTION OF OVER-DISPATCHING ---
        // Check if there's already enough fire engines dispatched to this area (radius 600px)
        const isAlreadyHandled = isFireEngineDispatchedFor(world, nearestFirePos.x, nearestFirePos.y, 600, 1);
        
        if (!isAlreadyHandled) {
          // Upgrade this passing fire vehicle to a DISPATCHED state!
          (car as any).isFireDispatch = true;
          (car as any).targetFireX = nearestFirePos.x;
          (car as any).targetFireY = nearestFirePos.y;
          (car as any).firefighterSpawned = false;
          car.sirenOn = true;
          car.turnSignal = 'hazard';
          
          // Recalculate route waypoints to lead straight to the fire
          const startPoint = { x: car.x, y: car.y };
          car.routeWaypoints = calculateGpsRoute(world, startPoint, nearestFirePos, true);
          car.targetWaypointIndex = 1;
          car.aiState = 'driving';
          
          if (player) {
            if (!player.notifications) player.notifications = [];
            player.notifications.push({
              id: 'passing_fire_spotted_'+ Date.now(),
              text: 'Проезжающая мимо пожарная машина заметила огонь и поспешила на помощь!',
              color: '#ef4444',
              timer: 4.5
            });
          }
        }
      }
    }

    // --- SPECIAL DISPATCHED FIRE ENGINE HANDLING ---
    if ((car as any).isFireDispatch && !car.isParked) {
      car.sirenOn = true;
      car.headlightMode = 'high';
      
      // Realistic emergency transit speed (55 km/h on open road, 36 km/h near corners/traffic/junctions)
      const nearbyCars = vehGrid ? vehGrid.queryRadius(car.x, car.y, 115) : world.vehicles;
      let isNearOtherCar = false;
      for (const other of nearbyCars) {
        if (other.id !== car.id && !other.isParked && other.id !== 'evac_ambulance_special') {
          const dist = Math.hypot(other.x - car.x, other.y - car.y);
          if (dist < 115) {
            isNearOtherCar = true;
            break;
          }
        }
      }

      const isNearTurnOrJunction = isNearOtherCar || car.inIntersection || car.currentConnection;
      car.targetSpeed = isNearTurnOrJunction ? 36 : 56;

      // Fire engine proactive self-ghosting when close to other cars or obstacles to seamlessly glide through them!
      if (isNearOtherCar) {
        car.ghostingAlpha = Math.max(0.32, (car.ghostingAlpha ?? 1.0) - dt * 3.5);
      } else {
        car.ghostingAlpha = Math.min(1.0, (car.ghostingAlpha ?? 1.0) + dt * 1.5);
      }

      const targetFireX = (car as any).targetFireX;
      const targetFireY = (car as any).targetFireY;
      const distToFire = Math.hypot(car.x - targetFireX, car.y - targetFireY);

      // If we are extremely close to the fire or near the end of our path, OR if we are blocked/stopped near the fire
      const isNearEnd = car.routeWaypoints && (car.targetWaypointIndex >= car.routeWaypoints.length - 1);
      const arrivedAtFire = distToFire < 160 || 
                           (isNearEnd && distToFire < 450) || 
                           (distToFire < 450 && Math.abs(car.speed) < 3);

      if (arrivedAtFire) {
        // Stop, park, and turn off siren (sound), but keep strobes flashing
        car.speed = 0;
        car.targetSpeed = 0;
        car.vx = 0;
        car.vy = 0;
        car.aiState = 'parked';
        car.isParked = true;
        car.turnSignal = 'hazard';
        
        // Spawn firefighters if not already spawned!
        if (!(car as any).firefighterSpawned) {
          (car as any).firefighterSpawned = true;
          
          const ffCount = 2 + Math.floor(Math.random() * 2); // 2 or 3 firefighters
          for (let f = 0; f < ffCount; f++) {
            const side = f % 2 === 0 ? 1 : -1;
            // Spawn next to the cabin/doors initially, then they walk to the rear of the truck
            const exitX = car.x - Math.sin(car.angle) * (car.width / 2 + 10) * side;
            const exitY = car.y + Math.cos(car.angle) * (car.width / 2 + 10) * side;

            const firefighter: Pedestrian = {
              id: `firefighter_${car.id}_${f}_${Date.now()}`,
              x: exitX,
              y: exitY,
              vx: 0,
              vy: 0,
              angle: car.angle,
              speed: 0,
              targetSpeed: 60,
              skinColor: '#ffd1b3', // standard
              shirtColor: '#1e293b', // navy
              pantsColor: '#1e293b', // navy
              hairColor: '#0f172a',
              walkCycle: 0,
              targetPathId: null,
              targetWaypointIndex: 0,
              routeWaypoints: [],
              isCrossingRoad: false,
              waitingAtCurb: false,
              crosswalkWaitTimer: 0,
              crosswalkCooldownTimer: 0,
              state: 'walking',
              panicTimer: 0,
              behaviorTimer: 0,
              alertBubbleText: 'На вызов!',
              alertBubbleTimer: 3.5
            };

            (firefighter as any).isFirefighter = true;
            (firefighter as any).parentVehicleId = car.id;
            (firefighter as any).firefighterState = 'going_to_truck';
            (firefighter as any).targetFireX = targetFireX;
            (firefighter as any).targetFireY = targetFireY;

            world.pedestrians.push(firefighter);
          }

          if (player) {
            if (!player.notifications) player.notifications = [];
            player.notifications.push({
              id: 'firefighters_arrived_'+ Date.now(),
              text: 'Пожарный расчет прибыл на место пожара!',
              color: '#10b981',
              timer: 3.5
            });
          }
        }
      }
    }

    if (car.isPlayerControlled || (car as any).isRemoteControlled || car.isParked || car.id === 'evac_ambulance_special' || isOwnedOrKeyed || car.ownerId === 'player' || (car as any).playerOwned || (car as any).isSpawnedByPlayer) continue;

     // --- EMERGENCY YIELDING FOR AI CARS ---
    let isEmergencyYielding = false;
    let nearbySirenCar: Vehicle | null = null;
    if (activeSirenCount > 0 && !(car as any).isFireDispatch) {
      const nearbyForSiren = vehGrid ? vehGrid.queryRadius(car.x, car.y, 280) : world.vehicles;
      for (const eCar of nearbyForSiren) {
        if (eCar.sirenOn && eCar.id !== car.id) {
          const distToSiren = Math.hypot(eCar.x - car.x, eCar.y - car.y);
          if (distToSiren < 280) {
            isEmergencyYielding = true;
            nearbySirenCar = eCar;
            break;
          }
        }
      }
      if (isEmergencyYielding && nearbySirenCar) {
        if (car.inIntersection || car.currentConnection) {
          // ПДД: If already inside intersection, DO NOT stop! Proceed to clear the junction first!
          car.aiState = 'driving';
          car.targetSpeed = Math.max(car.targetSpeed, 35);
        } else {
          // VIRTUAL SIREN FORCE CONE:
          // Check if car is in the forward path of the emergency vehicle
          const eCos = Math.cos(nearbySirenCar.angle);
          const eSin = Math.sin(nearbySirenCar.angle);
          const dx = car.x - nearbySirenCar.x;
          const dy = car.y - nearbySirenCar.y;
          const eDistLong = dx * eCos + dy * eSin;
          const eDistLat = Math.abs(dx * -eSin + dy * eCos);

          if (eDistLong > 0 && eDistLong < 200 && eDistLat < 45) {
            // Directly inside the forward force cone:
            // Smoothly push car towards the right shoulder
            car.targetAvoidanceOffset = -14;
            car.turnSignal = 'right';
            car.targetSpeed = Math.min(car.targetSpeed, 18);
            car.aiState = 'yielding';
          } else {
            // General proximity yielding: pull towards right shoulder
            car.aiState = 'yielding';
            car.targetAvoidanceOffset = -10;
            car.turnSignal = 'right';
          }
        }
      }
      if (car.ghostingAlpha !== undefined && !(car as any).isFireDispatch && car.type !== 'fire_engine'&& car.type !== 'fire_ladder'&& car.type !== 'fire_rescue'&& !car.type.startsWith('fire_')) {
        car.ghostingAlpha = Math.min(1.0, car.ghostingAlpha + dt * 1.5);
      }
    } else {
      if (car.ghostingAlpha !== undefined && !(car as any).isFireDispatch && car.type !== 'fire_engine'&& car.type !== 'fire_ladder'&& car.type !== 'fire_rescue'&& !car.type.startsWith('fire_')) {
        car.ghostingAlpha = Math.min(1.0, car.ghostingAlpha + dt * 1.5);
      }
    }

    // --- NPC FIRE REACTION ---
    if (hasAnyWorldFire && !car.driverExitedForFire) {
      let nearestFirePos: Vector2D | null = null;
      let targetCar: Vehicle | null = null;
      let targetStain: any = null;

      const nearbyVehs = vehGrid ? vehGrid.queryRadius(car.x, car.y, 300) : world.vehicles;
      for (const otherCar of nearbyVehs) {
        if (otherCar !== car && otherCar.damage && !otherCar.damage.isFullyBurnt) {
          const hasFire = otherCar.damage.engineFire || otherCar.damage.fuelTankFire || otherCar.damage.cabinFire || otherCar.damage.underHoodSmolder || (otherCar.damage.fireIntensity || 0) > 0;
          if (hasFire) {
            nearestFirePos = { x: otherCar.x, y: otherCar.y };
            targetCar = otherCar;
            break;
          }
        }
      }

      if (!nearestFirePos && world.stains) {
        for (const st of world.stains) {
          if (st.onFire && (st.fireIntensity || 0) > 0) {
            if (Math.hypot(st.x - car.x, st.y - car.y) < 300) {
              nearestFirePos = { x: st.x, y: st.y };
              targetStain = st;
              break;
            }
          }
        }
      }

      if (nearestFirePos) {
        // Driver or passenger reports the fire to 112 emergency services while driving
        const fireSource: any = targetCar || targetStain;
        if (fireSource && !isFireEngineDispatchedFor(world, nearestFirePos.x, nearestFirePos.y)) {
          if (Math.random() < 0.90) {
            const spawned = dispatchFireEngine(world, targetPos, nearestFirePos.x, nearestFirePos.y, player);
            if (spawned) {
              fireSource.fireCallMade = true;
            }
          }
        }

        // EVACUATION REALISM:
        // Only evacuate if this car ITSELF is actively on fire or severely destroyed.
        // Uninvolved moving civilian vehicles on roadways DO NOT park in traffic lanes to fight fires!
        const isOwnCarOnFire = car.damage && (car.damage.engineFire || car.damage.fuelTankFire || car.damage.cabinFire || car.damage.underHoodSmolder);
        if (isOwnCarOnFire && !car.driverExitedForFire) {
          car.driverExitedForFire = true;
          car.targetSpeed = 0;
          car.speed = 0;
          car.aiState = 'parked';
          car.turnSignal = 'hazard';

          const side = Math.random() < 0.5 ? 1 : -1;
          const doorX = car.x - Math.sin(car.angle) * (car.width / 2 + 12) * side;
          const doorY = car.y + Math.cos(car.angle) * (car.width / 2 + 12) * side;

          const skinColors = ['#ffd1b3', '#fcd5b5', '#e0ac69', '#c68642', '#8d5524', '#59381e'];
          const shirtColors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#ec4899', '#ffffff', '#1e293b'];
          const pantsColors = ['#1e293b', '#334155', '#475569', '#172554', '#14532d', '#78350f'];
          const hairColors = ['#1c1917', '#78350f', '#b45309', '#d97706', '#94a3b8', '#f8fafc'];

          const driverPed: Pedestrian = {
            id: 'driver_ext_'+ Math.random().toString(36).substring(2, 9),
            x: doorX,
            y: doorY,
            vx: 0,
            vy: 0,
            angle: car.angle,
            speed: 0,
            targetSpeed: 60,
            skinColor: skinColors[Math.floor(Math.random() * skinColors.length)],
            shirtColor: shirtColors[Math.floor(Math.random() * shirtColors.length)],
            pantsColor: pantsColors[Math.floor(Math.random() * pantsColors.length)],
            hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
            walkCycle: 0,
            handheldProp: 'extinguisher',
            extinguisherCharges: 100,
            targetPathId: null,
            targetWaypointIndex: 0,
            routeWaypoints: [],
            isCrossingRoad: false,
            waitingAtCurb: false,
            crosswalkWaitTimer: 0,
            crosswalkCooldownTimer: 0,
            state: 'extinguishing_fire',
            panicTimer: 0,
            behaviorTimer: 0,
            alertBubbleText: 'Иду тушить!',
            alertBubbleTimer: 2.5
          };

          (driverPed as any).targetFireCarId = car.id;
          world.pedestrians.push(driverPed);
          car.fireExtinguisherDriverId = driverPed.id;
        }
      }
    }

    // --- OPTIMIZATION: DESPAWN DISTANT AI TRAFFIC CARS ---
    if (!car.isParked && !isPlayerOrSpecial && !isOwnedOrKeyed && !car.isTrailer) {
      if (distToPlayer > 1450 || (totalActiveCount > performanceConfig.maxVehicles && distToPlayer > 800)) {
        intersectionArbiter.releaseReservation(car.id);
        car.intersectionReservationId = null;
        vehiclesToDespawn.push(car.id);
        continue;
      }
    }

    // Update turn signal timer
    if (car.turnSignal !== 'none') {
      car.turnSignalTimer = (car.turnSignalTimer || 0) + dt;
    } else {
      car.turnSignalTimer = 0;
    }

    // --- POST-COLLISION UNCONTROLLED SPINOUT, PUSHED & SHOCKED STATE ---
    if ((car.spinoutTimer && car.spinoutTimer > 0) || (car.pushedTimer && car.pushedTimer > 0) || (car.stunnedTimer && car.stunnedTimer > 0)) {
      car.turnSignal = 'hazard';
      car.brakeLightsOn = true;
      car.targetSpeed = 0;
      car.idmAcceleration = 0;
      if (car.spinoutTimer && car.spinoutTimer > 0) {
        car.aiState = 'spinout';
      }
      // In spinout/pushed mode, steering and autonomous engine throttle are disengaged.
      // Dynamic momentum, angular spin, external push forces, and asphalt tire friction are resolved in physics.ts!
      totalSpeed += Math.hypot(car.vx || 0, car.vy || 0);
      movingCars++;
      continue;
    }

    // --- ACCIDENT / CRASHED / BROKEN-DOWN VEHICLE STATE HANDLER ---
    if (isVehicleDisabledOrCrashed(car)) {
      car.turnSignal = 'hazard';
      car.brakeLightsOn = true;
      car.targetSpeed = 0;
      car.idmAcceleration = 0;
      car.aiState = 'stopping_obstacle';
      if (car.engineState) {
        car.engineState.engineRunning = false;
        car.engineState.engineRPM = 0;
      }
      // Note: Tire friction and external push momentum are physically integrated in physics.ts.
      // We do NOT artificially clamp vx/vy to zero here, allowing the crashed vehicle to be pushed or plowed by other cars.
      totalSpeed += Math.hypot(car.vx || 0, car.vy || 0);
      movingCars++;
      continue;
    }

    totalSpeed += car.speed;
    movingCars++;

    // --- REVERSE RECOVERY STATE MACHINE ---
    // If vehicle hit an obstacle or was deadlocked, back up and actively turn nose towards open road
    if (car.aiState === 'reversing') {
      car.reverseTimer = (car.reverseTimer || 1.0) - dt;
      car.targetSpeed = -32;
      car.brakeLightsOn = false;
      car.turnSignal = 'hazard';

      // Dynamically calculate recovery steer towards target escape angle
      if (car.recoveryTargetAngle !== undefined) {
        const targetDiff = angleDiff(car.recoveryTargetAngle, car.angle);
        const maxSteer = CAR_CONFIGS[car.type]?.maxSteerAngle || 0.75;
        if (Math.abs(targetDiff) > 0.2) {
          // Reversing with negative speed: steer opposite to targetDiff to rotate nose towards targetAngle
          car.recoverySteer = -Math.sign(targetDiff) * maxSteer;
        } else {
          car.recoverySteer = 0;
        }
      }

      // Smooth steering response during reverse turn
      const steer = car.recoverySteer || 0;
      car.steerAngle += (steer - car.steerAngle) * Math.min(1.0, 6.0 * dt);

      if (Math.abs(car.speed) > 0.5) {
        const yawRate = (car.speed / (car.wheelBase || 28)) * Math.tan(car.steerAngle);
        car.angularVelocity = yawRate;
        car.angle += yawRate * dt;
        car.angle = ((car.angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      } else {
        car.angularVelocity = 0;
      }

      if (car.reverseTimer <= 0) {
        // Recovery complete
        // Just softly realign towards the next waypoint so it doesn't get completely lost, 
        // but preserve all state (lane, connection, turn intent)
        const nextWp = car.routeWaypoints[car.targetWaypointIndex];
        if (nextWp) {
           const targetAngle = Math.atan2(nextWp.y - car.y, nextWp.x - car.x);
           if (Math.abs(angleDiff(targetAngle, car.angle)) > Math.PI / 2) {
              car.angle = targetAngle; 
           }
        }

        car.aiState = 'driving';
        car.speed = 15;
        car.stuckTimer = 0;
        car.turnSignal = 'none';
        car.recoveryTargetAngle = undefined;
        trafficDiagnostics.log('info', `Car #${car.id.slice(-4)} recovered from reverse turn maneuver`, car.id);
      }
      continue;
    }

    const profile = ensureDriverProfile(car);

    // Update lane change & obstacle avoidance cooldowns
    if (car.laneChangeCooldown) car.laneChangeCooldown = Math.max(0, car.laneChangeCooldown - dt);
    if (car.avoidanceCooldown) car.avoidanceCooldown = Math.max(0, car.avoidanceCooldown - dt);

    // Minimum-Jerk Quintic Polynomial S-Curve Progression (5th-order trajectory for lane changes, overtaking & bypass)
    if (car.avoidanceSpline) {
      const sp = car.avoidanceSpline;
      const forwardStep = Math.max(24, Math.abs(car.speed)) * dt;
      sp.traveledDist = Math.min(sp.totalDist, sp.traveledDist + forwardStep);
      const u = Math.max(0, Math.min(1, sp.traveledDist / Math.max(1, sp.totalDist)));
      const u2 = u * u;
      const u3 = u2 * u;
      const u4 = u3 * u;
      const u5 = u4 * u;
      // Quintic position poly: 10u^3 - 15u^4 + 6u^5
      const polyPos = 10 * u3 - 15 * u4 + 6 * u5;
      // Quintic derivative dp/du: 30u^2 - 60u^3 + 30u^4
      const polyDeriv = 30 * u2 - 60 * u3 + 30 * u4;

      const deltaLat = sp.targetOffset - sp.startOffset;
      car.avoidanceOffset = sp.startOffset + deltaLat * polyPos;

      // Exact tangent slope dy/ds along the S-curve for feedforward steering alignment
      const dyDs = (deltaLat / Math.max(22, sp.totalDist)) * polyDeriv;
      car.avoidanceHeadingBias = Math.atan(dyDs) * 0.65;

      if (u >= 0.999) {
        car.avoidanceOffset = sp.targetOffset;
        car.avoidanceHeadingBias = 0;
        car.avoidanceSpline = null;

        if (car.aiState === 'lane_changing' || car.aiState === 'overtaking') {
          car.aiState = 'driving';
          car.turnSignal = 'none';
          car.laneChangeState = null;
        }
        if (car.avoidancePhase === 'swerving') {
          car.avoidancePhase = 'passing';
        } else if (car.avoidancePhase === 'returning' && Math.abs(car.avoidanceOffset) < 1.0) {
          car.avoidanceOffset = 0;
          car.targetAvoidanceOffset = 0;
          car.avoidancePhase = 'none';
          car.avoidanceObstacleId = null;
          car.turnSignal = 'none';
          if (car.aiState === 'avoiding_obstacle' || car.aiState === 'evading') {
            car.aiState = 'driving';
          }
          car.avoidanceCooldown = 1.8;
        }
      }
    } else if (car.targetAvoidanceOffset !== undefined) {
      // Fallback smooth convergence if targetAvoidanceOffset was set without a spline
      const targetOff = car.targetAvoidanceOffset;
      const currentOff = car.avoidanceOffset || 0;
      if (Math.abs(targetOff - currentOff) > 1.2) {
        const horizon = car.avoidancePhase === 'emergency_evading'
          ? Math.max(38, Math.abs(car.speed) * 0.72)
          : Math.max(60, Math.abs(car.speed) * 1.15);
        startLateralSpline(car, targetOff, horizon);
      } else {
        car.avoidanceOffset = targetOff;
        car.avoidanceHeadingBias = 0;
        if (car.avoidancePhase === 'swerving') {
          car.avoidancePhase = 'passing';
        } else if (car.avoidancePhase === 'returning' && Math.abs(car.avoidanceOffset) < 1.0) {
          car.avoidanceOffset = 0;
          car.targetAvoidanceOffset = 0;
          car.avoidancePhase = 'none';
          car.avoidanceObstacleId = null;
          car.turnSignal = 'none';
          if (car.aiState === 'avoiding_obstacle' || car.aiState === 'evading') {
            car.aiState = 'driving';
          }
          car.avoidanceCooldown = 1.8;
        }
      }
    } else {
      car.avoidanceHeadingBias = 0;
    }

    // Check if active lane change is completed early when aligned with target lane
    if ((car.aiState === 'lane_changing' || car.aiState === 'overtaking') && !car.avoidanceSpline) {
      const curLane = findLaneById(world, car.currentLaneId);
      if (curLane && curLane.waypoints.length >= 2) {
        const hDiff = Math.abs(angleDiff(curLane.direction, car.angle));
        if (Math.abs(car.avoidanceOffset || 0) < 2.5 && hDiff < 0.22) {
          car.aiState = 'driving';
          car.turnSignal = 'none';
          car.laneChangeState = null;
        }
      }
    }

    // Check if obstacle has been passed while in 'passing' or 'emergency_evading' phase
    if (car.avoidancePhase === 'passing' || car.avoidancePhase === 'emergency_evading') {
      let obstacleCleared = true;
      if (car.avoidanceObstacleId) {
        const otherVeh = world.vehicles.find((v) => v.id === car.avoidanceObstacleId);
        if (otherVeh) {
          const obsRelLong = (otherVeh.x - car.x) * Math.cos(car.angle) + (otherVeh.y - car.y) * Math.sin(car.angle);
          if (obsRelLong > -(car.length * 0.5 + otherVeh.length * 0.5 + 10)) {
            obstacleCleared = false;
          }
        } else {
          const prop = world.props.find((p) => p.id === car.avoidanceObstacleId);
          if (prop) {
            const obsRelLong = (prop.x - car.x) * Math.cos(car.angle) + (prop.y - car.y) * Math.sin(car.angle);
            if (obsRelLong > -(car.length * 0.5 + 8)) {
              obstacleCleared = false;
            }
          }
        }
      }

      if (obstacleCleared) {
        // Also ensure no other stationary/slow vehicle is right beside us in the center lane before returning
        const centerClear = isBypassCorridorClear(car, 0, world, propGrid);
        if (centerClear) {
          car.avoidancePhase = 'returning';
          car.turnSignal = (car.avoidanceOffset || 0) > 0 ? 'right' : 'left';
          startLateralSpline(car, 0, Math.max(68, Math.abs(car.speed) * 1.25));
        }
      }
    }

    // 1. Check if vehicle is inside any intersection boundary
    // Strictly only considered inside if on an active connection and within the inner junction box
    let insideIntersection: Intersection | null = null;
    if (car.currentConnection && car.currentConnection.turnType !== 'turnaround') {
      for (const inter of world.intersections) {
        const halfW = inter.width / 2 - 4;
        const halfH = inter.height / 2 - 4;
        if (
          car.x >= inter.x - halfW && car.x <= inter.x + halfW &&
          car.y >= inter.y - halfH && car.y <= inter.y + halfH
        ) {
          insideIntersection = inter;
          break;
        }
      }
    }
    car.inIntersection = insideIntersection !== null;

    // 2. Direct Waypoint Tracking & Pure Pursuit
    const carX = car.x;
    const carY = car.y;

    if (car.routeWaypoints && car.routeWaypoints.length > 0) {
      const targetWp = car.routeWaypoints[car.targetWaypointIndex];
      if (targetWp) {
        const distToWp = Math.hypot(targetWp.x - carX, targetWp.y - carY);

        // Vector math to check if the car has passed the current segment
        const prevWp = car.routeWaypoints[Math.max(0, car.targetWaypointIndex - 1)];
        const segDx = targetWp.x - prevWp.x;
        const segDy = targetWp.y - prevWp.y;
        const segLenSq = segDx * segDx + segDy * segDy;
        const toCarDx = carX - prevWp.x;
        const toCarDy = carY - prevWp.y;
        const projRatio = segLenSq > 0 ? (toCarDx * segDx + toCarDy * segDy) / segLenSq : 1;

        // Calculate Cross-Track Error (lateral displacement from segment centerline)
        const segLen = Math.sqrt(segLenSq);
        const cte = segLen > 0 ? (toCarDx * segDy - toCarDy * segDx) / segLen : 0;

        // Check if target waypoint is behind the vehicle heading
        const toWpDx = targetWp.x - carX;
        const toWpDy = targetWp.y - carY;
        const wpAhead = toWpDx * Math.cos(car.angle) + toWpDy * Math.sin(car.angle);

        const isCurvedRoad = !car.currentConnection && car.routeWaypoints.length > 2 && (
          (car.targetWaypointIndex < car.routeWaypoints.length - 1 && Math.abs(angleDiff(
            Math.atan2(car.routeWaypoints[car.targetWaypointIndex + 1].y - targetWp.y, car.routeWaypoints[car.targetWaypointIndex + 1].x - targetWp.x),
            Math.atan2(segDy, segDx)
          )) > 0.04)
        );
        const isCurve = !!car.currentConnection || isCurvedRoad;
        const isHeavyVehicle = car.length > 52 || (car.wheelBase || 28) > 34;
        const isRightTurn = car.currentConnection?.turnType === 'right' || car.plannedTurn === 'right';

        // Advance threshold on curves and straights
        const advanceThreshold = isCurve 
          ? (isHeavyVehicle 
              ? (isRightTurn ? 16 : 22) 
              : (isRightTurn ? 12 : 16)) 
          : 36;

        if (distToWp < advanceThreshold || projRatio >= 0.85 || (distToWp < 55 && wpAhead < -4)) {
          if (car.targetWaypointIndex < car.routeWaypoints.length - 1) {
            car.targetWaypointIndex++;
          } else {
            advanceCarRoute(car, world);
          }
        }

        // Keep a curve-like tight lookahead if we recently exited a connection and are still aligning (heading difference > 0.12 rad)
        let isAligning = false;
        if (!isCurve && car.targetWaypointIndex === 1 && car.routeWaypoints.length > 1) {
          const laneDir = Math.atan2(car.routeWaypoints[1].y - car.routeWaypoints[0].y, car.routeWaypoints[1].x - car.routeWaypoints[0].x);
          if (Math.abs(angleDiff(laneDir, car.angle)) > 0.12) {
            isAligning = true;
          }
        }
        const isTightTracking = isCurve || isAligning;

        // Pure pursuit dynamic lookahead distance (scaled with speed and vehicle size)
        let lookaheadDist = isTightTracking
          ? Math.max(18, Math.min(30, 14 + car.speed * 0.12)) // Tighter, more precise lookahead to stay in lane
          : Math.max(38, Math.min(85, 24 + car.speed * 0.4));

        if (isHeavyVehicle) {
          lookaheadDist = isTightTracking
            ? Math.max(15, Math.min(22, 13 + car.speed * 0.08)) // Extremely precise lookahead for heavy trucks
            : Math.max(45, Math.min(95, 30 + car.speed * 0.4));
        }

        const { point: lookaheadPt } = getLookaheadPointOnPolyline(
          carX,
          carY,
          car.routeWaypoints,
          car.targetWaypointIndex,
          lookaheadDist
        );

        // Pure pursuit target directly follows the lane connection curve.
        // On connection exit, smoothly anchor target to destination lane centerline to prevent overshooting into oncoming traffic.
        let targetX = lookaheadPt.x;
        let targetY = lookaheadPt.y;

        if (car.currentConnection && car.targetWaypointIndex >= car.routeWaypoints.length - 2) {
          const destLane = findLaneById(world, car.currentConnection.targetLaneId);
          if (destLane && destLane.waypoints.length > 0) {
            const exitAnchor = destLane.waypoints[0];
            const blendFactor = 0.6;
            targetX = targetX * (1 - blendFactor) + exitAnchor.x * blendFactor;
            targetY = targetY * (1 - blendFactor) + exitAnchor.y * blendFactor;
          }
        }

        // Combine active S-curve avoidance offset with subtle driver lane-positioning habit on straight segments
        const naturalBias = (!isTightTracking && (!car.avoidancePhase || car.avoidancePhase === 'none'))
          ? profile.preferredLaneBias
          : 0;
        const totalLateralOffset = (car.avoidanceOffset || 0) + naturalBias;

        // Apply dynamic lateral avoidance offset to target tracking point
        if (Math.abs(totalLateralOffset) > 0.05) {
          const tDirX = segLen > 0 ? segDx / segLen : Math.cos(car.angle);
          const tDirY = segLen > 0 ? segDy / segLen : Math.sin(car.angle);
          const normX = -tDirY;
          const normY = tDirX;
          targetX += normX * totalLateralOffset;
          targetY += normY * totalLateralOffset;
        }

        const ldx = targetX - carX;
        const ldy = targetY - carY;
        let alpha = angleDiff(Math.atan2(ldy, ldx), car.angle);

        // Active Cross-Track Error (CTE) Centering Bias + S-curve tangent feedforward angle
        const effectiveCte = cte - totalLateralOffset;
        const cteCorrection = Math.atan2(effectiveCte * 0.8, Math.max(15, lookaheadDist));
        alpha += cteCorrection - (car.avoidanceHeadingBias || 0);

        // Standard geometric pure pursuit formula around rear axle:
        const wheelBase = car.wheelBase || 28;
        const curvature = (2 * Math.sin(alpha)) / Math.max(8, lookaheadDist);
        let maxSteerLimit = CAR_CONFIGS[car.type]?.maxSteerAngle || 0.85;
        if (isHeavyVehicle && isTightTracking) {
          maxSteerLimit = Math.max(maxSteerLimit, 1.30); // 74.5 deg steering lock for heavy vehicles on turns
        }
        if (car.plannedTurn === 'right'|| car.currentConnection?.turnType === 'right') {
          maxSteerLimit = Math.max(maxSteerLimit, 1.32); // 75.6 deg steering lock for right turns
        }
        if ((car as any).isFireDispatch) {
          maxSteerLimit = 1.35; // Emergency steering boost for sharp turns
        }
        const desiredSteer = Math.max(-maxSteerLimit, Math.min(maxSteerLimit, Math.atan(curvature * wheelBase)));

        // Smooth steering response (responsive steering for heavy vehicle low-speed turns, emergency evasion & misaligned recovery)
        const isMisaligned = Math.abs(alpha) > 0.35 && Math.abs(car.speed) < 35;
        const isEvadingNow = car.avoidancePhase === 'emergency_evading' || car.aiState === 'evading';
        const steerSpeed = (car as any).isFireDispatch
          ? 20.0
          : (isEvadingNow ? 18.0 : (isMisaligned ? 24.0 : (isHeavyVehicle ? 16.0 : 12.0)));
        car.steerAngle += (desiredSteer - car.steerAngle) * Math.min(1.0, steerSpeed * dt);

        // Bicycle yaw kinematic update with low-speed angle correction boost
        if (Math.abs(car.speed) > 0.5) {
          let yawRate = (car.speed / wheelBase) * Math.tan(car.steerAngle);
          if (isMisaligned) {
            yawRate *= (1.0 + Math.min(1.8, Math.abs(alpha) * 1.6));
          }
          car.angularVelocity = yawRate;
          car.angle += yawRate * dt;
        } else {
          car.angularVelocity = 0;
        }

        // Turn signal management (prioritize active lane change and avoidance turn signals)
        if (car.avoidancePhase && car.avoidancePhase !== 'none') {
          // Preserve active obstacle bypass signal
        } else if (car.aiState === 'lane_changing' || car.aiState === 'overtaking') {
          // Preserve active lane change signal
        } else if (car.turnSignal === 'hazard') {
          // Preserve hazard flashers
        } else if (car.plannedTurn === 'left'|| car.currentConnection?.turnType === 'turnaround') {
          car.turnSignal = 'left';
        } else if (car.plannedTurn === 'right') {
          car.turnSignal = 'right';
        } else {
          car.turnSignal = 'none';
        }
      } else {
        advanceCarRoute(car, world);
      }
    } else {
      reacquireClosestLane(car, world);
    }

    // 3. Multi-Zone Intelligent Obstacle Perception, Lane Changing & Evasion
    let minGapToLeadCar = 999;
    let leadCarSpeed = 0;
    let hasLeadCar = false;
    car.hasHeadOnConflict = false;

    // Proactively scan for obstacles on the move, multi-car platoon braking waves, stopped/slow cars, solid props, and imminent collision threats
    const {
      leadObstacle,
      platoonBrakingObstacle,
      imminentHeadOnThreat,
      imminentForwardThreat,
    } = scanTrafficObstacles(car, world, vehGrid, propGrid);

    const emergencyThreat = imminentHeadOnThreat || imminentForwardThreat;

    // PRIORITY 1: Realistic Emergency Collision Evasion (Уход от столкновения — с учётом человеческого фактора и реакции)
    if (emergencyThreat && !car.inIntersection && !car.currentConnection) {
      if (imminentHeadOnThreat) {
        car.hasHeadOnConflict = true;
      }

      // Evaluate driver's perception-reaction decision once per threat encounter
      if (!car.evasionDecision || car.evasionDecision.threatId !== emergencyThreat.id || nowSec - car.evasionDecision.decidedAt > 2.5) {
        const decisionHash = hashStringDeterministic(`${car.id}_evade_${emergencyThreat.id}`);
        const roll = (decisionHash % 1000) / 1000;

        // Driver successfully initiates evasive steering if:
        // 1. Roll is within driver's attentiveness probability, AND
        // 2. Time-to-collision allows physical steering reaction (or driver is a high-reflex archetype)
        const hasReactionWindow = emergencyThreat.ttc >= profile.reactionTime * 0.65 || profile.attentiveness >= 0.88;
        const willAttemptEvasion = roll < profile.attentiveness && hasReactionWindow;

        let chosenOffset = 0;
        if (willAttemptEvasion) {
          const corridorOff = findBestEscapeCorridor(
            car,
            emergencyThreat.signedLat,
            emergencyThreat.width,
            world,
            vehGrid,
            propGrid
          );
          if (corridorOff !== null) {
            chosenOffset = corridorOff;
          }
        } else if (emergencyThreat.ttc < 0.65 && roll < profile.attentiveness + 0.18) {
          // Last-moment partial panic swerve by a driver who noticed late
          const corridorOff = findBestEscapeCorridor(
            car,
            emergencyThreat.signedLat,
            emergencyThreat.width,
            world,
            vehGrid,
            propGrid
          );
          if (corridorOff !== null) {
            chosenOffset = corridorOff * 0.72;
          }
        }

        car.evasionDecision = {
          threatId: emergencyThreat.id,
          willEvade: Math.abs(chosenOffset) > 4.0,
          chosenOffset,
          decidedAt: nowSec,
        };
      }

      if (car.evasionDecision.willEvade && Math.abs(car.evasionDecision.chosenOffset) > 4.0) {
        const evadeOffset = car.evasionDecision.chosenOffset;
        if (car.avoidancePhase !== 'emergency_evading' || Math.abs((car.targetAvoidanceOffset || 0) - evadeOffset) > 3.0) {
          const evasionHorizon = Math.max(40, Math.min(115, Math.max(car.speed, 45) * 0.78));
          startLateralSpline(car, evadeOffset, evasionHorizon);
        }
        car.aiState = 'evading';
        car.avoidancePhase = 'emergency_evading';
        car.avoidanceObstacleId = emergencyThreat.id;
        car.turnSignal = evadeOffset < 0 ? 'right' : 'left';
      }
      // Whether swerving or panic-braking in-lane, alert with horn
      car.honkTimer = 0.8;
      car.isHonking = true;
    }

    // PRIORITY 2: MOBIL Lane Changing, Overtaking, Keep-Right Yielding & Pre-Turn Alignment (Перестроение)
    if (
      !car.inIntersection &&
      !car.currentConnection &&
      car.aiState !== 'evading' &&
      car.avoidancePhase === 'none' &&
      (!car.laneChangeCooldown || car.laneChangeCooldown <= 0)
    ) {
      const mobilDecision = evaluateMobilLaneChange(car, leadObstacle, world, vehGrid);
      if (mobilDecision.targetLane && mobilDecision.dir) {
        executeLaneChange(car, mobilDecision.targetLane, mobilDecision.dir);
        car.aiState = mobilDecision.reason === 'overtake' ? 'overtaking' : 'lane_changing';
      }
    }

    // PRIORITY 3: Continuous Quintic S-Curve Obstacle Bypass on the Move (Умный объезд препятствий и аварий)
    // Uses full lateral bounding span [minLatSpan, maxLatSpan] of the obstacle or multi-car wreck cluster
    const bypassLookahead = Math.max(145, 75 + car.speed * 1.15);
    if (
      leadObstacle &&
      car.avoidancePhase === 'none' &&
      car.aiState !== 'lane_changing' &&
      car.aiState !== 'overtaking' &&
      car.aiState !== 'evading' &&
      (!car.avoidanceCooldown || car.avoidanceCooldown <= 0) &&
      !car.inIntersection &&
      !car.currentConnection &&
      leadObstacle.distLong < bypassLookahead &&
      (leadObstacle.isSlow || leadObstacle.type === 'prop')
    ) {
      const carHalfW = car.width * 0.5;
      const safetyMargin = 5.5;

      // Exact lateral offsets required to clear the entire lateral span [minLatSpan, maxLatSpan] of the obstacle/cluster:
      // Left offset (+): car's right flank (offset - carHalfW) must be > maxLatSpan + safetyMargin
      const neededLeftOffset = Math.min(34.0, Math.max(0, leadObstacle.maxLatSpan + carHalfW + safetyMargin));
      // Right offset (-): car's left flank (-offset + carHalfW) must be < minLatSpan - safetyMargin
      const neededRightOffset = Math.min(34.0, Math.max(0, -leadObstacle.minLatSpan + carHalfW + safetyMargin));

      const preferLeft = leadObstacle.signedLat <= 2.5;
      const splineHorizon = Math.max(62, Math.min(150, Math.max(leadObstacle.distLong * 0.92, car.speed * 1.1)));

      if (preferLeft) {
        const hasOncomingConflict = neededLeftOffset > 3.5 && isOncomingConflictWithOffset(car, neededLeftOffset, world, vehGrid);
        const isLeftClear = neededLeftOffset > 3.5 && isBypassCorridorClear(car, +neededLeftOffset, world, propGrid);

        if (!hasOncomingConflict && isLeftClear) {
          car.avoidancePhase = 'swerving';
          startLateralSpline(car, +neededLeftOffset, splineHorizon);
          car.avoidanceObstacleId = leadObstacle.id;
          car.turnSignal = neededLeftOffset > 7 ? 'left' : 'none';
          car.aiState = 'avoiding_obstacle';
          car.targetSpeed = Math.max(car.speed, 42);
        } else if (hasOncomingConflict && isLeftClear) {
          // Left bypass physically clear of props, but yielding to oncoming traffic before pulling out
          car.aiState = 'yielding';
          car.turnSignal = 'left';
          car.stuckTimer = 0;
        } else if (neededRightOffset > 3.5) {
          // Fallback right bypass (shoulder / right side)
          const isRightClear = isBypassCorridorClear(car, -neededRightOffset, world, propGrid);
          if (isRightClear) {
            car.avoidancePhase = 'swerving';
            startLateralSpline(car, -neededRightOffset, splineHorizon);
            car.avoidanceObstacleId = leadObstacle.id;
            car.turnSignal = neededRightOffset > 7 ? 'right' : 'none';
            car.aiState = 'avoiding_obstacle';
            car.targetSpeed = Math.max(car.speed, 42);
          }
        }
      } else {
        // Obstacle is on the left side of lane -> Prefer right bypass
        const isRightClear = neededRightOffset > 3.5 && isBypassCorridorClear(car, -neededRightOffset, world, propGrid);
        if (isRightClear) {
          car.avoidancePhase = 'swerving';
          startLateralSpline(car, -neededRightOffset, splineHorizon);
          car.avoidanceObstacleId = leadObstacle.id;
          car.turnSignal = neededRightOffset > 7 ? 'right' : 'none';
          car.aiState = 'avoiding_obstacle';
          car.targetSpeed = Math.max(car.speed, 42);
        } else if (neededLeftOffset > 3.5) {
          // Fallback left bypass
          const hasOncomingConflict = isOncomingConflictWithOffset(car, neededLeftOffset, world, vehGrid);
          const isLeftClear = isBypassCorridorClear(car, +neededLeftOffset, world, propGrid);
          if (!hasOncomingConflict && isLeftClear) {
            car.avoidancePhase = 'swerving';
            startLateralSpline(car, +neededLeftOffset, splineHorizon);
            car.avoidanceObstacleId = leadObstacle.id;
            car.turnSignal = neededLeftOffset > 7 ? 'left' : 'none';
            car.aiState = 'avoiding_obstacle';
            car.targetSpeed = Math.max(car.speed, 42);
          } else if (hasOncomingConflict && isLeftClear) {
            car.aiState = 'yielding';
            car.turnSignal = 'left';
            car.stuckTimer = 0;
          }
        }
      }
    }

    const carCos = Math.cos(car.angle);
    const carSin = Math.sin(car.angle);
    const halfL = car.length / 2;
    const halfW = car.width / 2;

    const fx = car.x + carCos * halfL;
    const fy = car.y + carSin * halfL;
    const flx = car.x + carCos * halfL - carSin * halfW;
    const fly = car.y + carSin * halfL + carCos * halfW;
    const frx = car.x + carCos * halfL + carSin * halfW;
    const fry = car.y + carSin * halfL - carCos * halfW;

    const forwardLookaheadDist = Math.max(120, Math.min(850, 70 + car.speed * 1.8));
    const L_center = forwardLookaheadDist;
    const L_side = Math.max(65, Math.min(500, 45 + car.speed * 1.2));

    const centralRayEnd = { x: fx + carCos * L_center, y: fy + carSin * L_center };
    const leftRayEnd = { x: flx + Math.cos(car.angle - 0.22) * L_side, y: fly + Math.sin(car.angle - 0.22) * L_side };
    const rightRayEnd = { x: frx + Math.cos(car.angle + 0.22) * L_side, y: fry + Math.sin(car.angle + 0.22) * L_side };

    const carOBB = getOBB(car, 1);
    const nearbyVehicles = vehGrid ? vehGrid.queryRadius(car.x, car.y, Math.max(350, forwardLookaheadDist + 80)) : world.vehicles;

    for (const other of nearbyVehicles) {
      if (other.id === car.id || other.isParked) continue;

      // If car has active sovereign pass and this obstacle is the ignored car (or any crossing car when ghosting)
      if (car.priorityPassUntil && nowSec < car.priorityPassUntil) {
        if (other.id === car.priorityPassIgnoreId || (car.ghostingAlpha !== undefined && car.ghostingAlpha < 0.9)) {
          continue;
        }
      }

      // If either car is actively in anti-deadlock ghosting mode, bypass obstacle avoidance so they can glide freely past each other
      if ((car.ghostingAlpha !== undefined && car.ghostingAlpha < 0.9) ||
          (other.ghostingAlpha !== undefined && other.ghostingAlpha < 0.9)) {
        continue;
      }

      const relX = other.x - car.x;
      const relY = other.y - car.y;
      const directDist = Math.hypot(relX, relY);

      if (directDist > forwardLookaheadDist + 60) continue;

      const distLong = relX * carCos + relY * carSin;
      const signedLat = relX * -carSin + relY * carCos;
      const distLat = Math.abs(signedLat);
      const combinedHalfW = (car.width + other.width) * 0.5 + 4.5;
      const combinedHalfL = (car.length + other.length) * 0.5;

      const aDiff = Math.abs(angleDiff(other.angle, car.angle));

      // Head-on encounter detection (facing each other nose-to-nose)
      if (aDiff > 2.0 && directDist < 85 && distLong > -10) {
        car.hasHeadOnConflict = true;
      }

      // --- FRENET FRAME (S, D) EVALUATION ---
      // When following a lane curve, determine longitudinal position S along the polyline.
      let isBehindInFrenet = false;
      let frenetDeltaS = distLong;
      let frenetDistLat = distLat;
      if (car.routeWaypoints && car.routeWaypoints.length >= 2) {
        const carFrontX = car.x + carCos * (car.length * 0.5);
        const carFrontY = car.y + carSin * (car.length * 0.5);
        const carF = projectPointToFrenet(carFrontX, carFrontY, car.routeWaypoints, car.targetWaypointIndex || 0);
        const otherF = projectPointToFrenet(other.x, other.y, car.routeWaypoints, car.targetWaypointIndex || 0);
        frenetDeltaS = otherF.s - carF.s;
        frenetDistLat = Math.abs(otherF.d - (car.avoidanceOffset || 0));

        // FRENET MATHEMATICAL GUARANTEE:
        // If delta_S <= 0, the other vehicle is behind or to the rear flank along this lane curve!
        // The forward-looking radar NEVER feeds objects with delta_S <= 0 into IDM or yield checks.
        if (frenetDeltaS <= 0.5) {
          isBehindInFrenet = true;
        }
      } else {
        if (distLong <= 0.5) {
          isBehindInFrenet = true;
        }
      }

      // If other is behind in Frenet frame, completely ignore it:
      // It cannot be a lead car, cannot trigger braking, cannot trigger yield conflict!
      if (isBehindInFrenet) {
        continue;
      }

      // Check 1: Direct in-lane corridor follower detection
      // If 'other' is directly ahead of 'car' in the lane/heading corridor, 'car' is behind 'other' and MUST yield!
      const effectiveDistLat = Math.abs(signedLat - (car.avoidanceOffset || 0));
      const isDirectlyAheadInCorridor = distLong > 0 && distLong < forwardLookaheadDist && effectiveDistLat < combinedHalfW && aDiff < 1.4;

      if (isDirectlyAheadInCorridor) {
        const isBeingBypassed = (car.avoidancePhase === 'passing' || car.avoidancePhase === 'swerving' || car.aiState === 'avoiding_obstacle') && 
          (car.avoidanceObstacleId === other.id || Math.abs(car.avoidanceOffset || 0) > 2.0);
        const netGap = Math.max(0.1, distLong - combinedHalfL - 18); // 18px safe bumper clearance buffer
        if (isBeingBypassed && netGap > 12) {
          // Bypass in progress! Keep moving forward to allow lateral shift
        } else {
          if (netGap < minGapToLeadCar) {
            minGapToLeadCar = netGap;
            leadCarSpeed = Math.max(0, other.speed);
            hasLeadCar = true;
          }
          continue;
        }
      }

      // Check OBB intersection and Multi-Ray intersections
      const isCarHeavy = car.length > 52 || (car.wheelBase || 28) > 34;
      const isOtherHeavy = other.length > 52 || (other.wheelBase || 28) > 34;
      let safetyBuffer = 2.5;
      
      // Dynamic large safety buffer for heavy vehicles turning on curves
      if ((isCarHeavy && car.currentConnection) || (isOtherHeavy && other.currentConnection)) {
        safetyBuffer = 14.5; // Smooth yielding corridor
      }
      
      const otherOBB = getOBB(other, safetyBuffer); // safety buffer around other vehicle
      const isOverlapping = isOBBOverlapping(carOBB, otherOBB);

      // Oncoming traffic separated by lanes on straight or curved roads -> Ignore
      if (aDiff > 1.35 && !isOverlapping) {
        let minDistToMyPath = Infinity;
        if (car.routeWaypoints && car.routeWaypoints.length > 0) {
          const checkMax = Math.min(car.routeWaypoints.length, car.targetWaypointIndex + 5);
          for (let wi = car.targetWaypointIndex; wi < checkMax; wi++) {
            const wp = car.routeWaypoints[wi];
            const d = Math.hypot(other.x - wp.x, other.y - wp.y);
            if (d < minDistToMyPath) minDistToMyPath = d;
          }
        }
        const minClearance = (car.width + other.width) * 0.5 + 6;
        if (minDistToMyPath > minClearance || (!car.currentConnection && !other.currentConnection && distLat > 16)) {
          continue;
        }
      }

      // Cross-traffic / Angled road encounter (highways, crossings, 90-degree meetings)
      // Check if 'other' is penetrating 'car's forward driving lane corridor
      const corridorCheck = isVehiclePenetratingDrivingCorridor(car, other, forwardLookaheadDist);

      const isCentralIntersect = isRayIntersectingOBB({ x: fx, y: fy }, centralRayEnd, otherOBB);
      const isLeftIntersect = isRayIntersectingOBB({ x: flx, y: fly }, leftRayEnd, otherOBB);
      const isRightIntersect = isRayIntersectingOBB({ x: frx, y: fry }, rightRayEnd, otherOBB);
      const isRayIntersect = isCentralIntersect || isLeftIntersect || isRightIntersect;

      // Trajectory overlap waypoint check along vehicle's planned path
      let isTrajectoryConflict = false;
      if (car.routeWaypoints && car.routeWaypoints.length > 0) {
        // Ignore trajectory conflicts with stationary vehicles that are not in the intersection (e.g., parked or waiting at their own stop line)
        const isOtherStationaryOutside = Math.abs(other.speed) < 2.0 && !other.inIntersection && !other.currentConnection;
        if (!isOtherStationaryOutside && !other.isParked) {
          const checkEnd = Math.min(car.routeWaypoints.length, car.targetWaypointIndex + 8);
          for (let wi = car.targetWaypointIndex; wi < checkEnd; wi++) {
            const wp = car.routeWaypoints[wi];
            const otherRadius = Math.hypot(other.length, other.width) * 0.5;
            if (Math.hypot(other.x - wp.x, other.y - wp.y) < (car.width * 0.5 + otherRadius + 6)) {
              isTrajectoryConflict = true;
              break;
            }
          }
        }
      }

      if (aDiff > 0.35 && !isOverlapping) {
        if (!corridorCheck.isInCorridor && !isRayIntersect && !isTrajectoryConflict) {
          // Other vehicle is crossing, adjacent, or waiting outside our forward driving lane corridor!
          // Our path is completely clear — do NOT stop or yield!
          continue;
        }
      }

      const isConflict = isOverlapping || isRayIntersect || isTrajectoryConflict || corridorCheck.isInCorridor;

      if (isConflict) {
        // Evaluate pairwise arbitration for angled / intersection encounters (NOT for regular car-following in same lane!)
        const isSameDirectionAhead = distLong > 0 && aDiff < 0.6 && !car.inIntersection && !other.inIntersection;
        if (!isSameDirectionAhead) {
          const pairwiseEncounter = globalMutualYieldArbiter.registerEncounter(
            car,
            other,
            car.speed < 2.5 || car.aiState === 'yielding',
            nowSec,
            world,
            nearbyVehicles
          );

          if (pairwiseEncounter.isSovereignLeader) {
            car.priorityPassUntil = nowSec + 3.8;
            car.priorityPassIgnoreId = other.id;
            car.ghostingAlpha = 0.35;
            car.aiState = 'driving';
            car.speed = Math.max(car.speed, 12);
            continue;
          }
        }

        // STRICT DETERMINISTIC ПДД PRIORITY ARBITRATION
        let weHavePriority = false;
        const myTurn = car.currentConnection?.turnType || car.plannedTurn || 'straight';
        const otherTurn = other.currentConnection?.turnType || other.plannedTurn || 'straight';

        // Rule 0: Unprotected Left Turn / Turnaround MUST yield to oncoming straight or right-turning traffic (ПДД 13.4 / 13.12)
        if ((myTurn === 'left' || myTurn === 'turnaround') && (otherTurn === 'straight' || otherTurn === 'right')) {
          weHavePriority = false;
        } else if ((myTurn === 'straight' || myTurn === 'right') && (otherTurn === 'left' || otherTurn === 'turnaround')) {
          weHavePriority = true;
        }
        // Rule 1: Space-Time Corridor Token Holder has exclusive passage right
        else if (car.hasExclusiveIntersectionToken && !other.hasExclusiveIntersectionToken) {
          weHavePriority = true;
        } else if (!car.hasExclusiveIntersectionToken && other.hasExclusiveIntersectionToken) {
          weHavePriority = false;
        }
        // Rule 2: Car already inside intersection has priority over car still at stop line/entrance
        else if (car.inIntersection && !other.inIntersection) {
          weHavePriority = true;
        } else if (!car.inIntersection && other.inIntersection) {
          weHavePriority = false;
        }
        // Rule 3: Right-Hand Rule ("Помеха справа"- ПДД) for equal-priority intersecting paths
        else {
          const angleToOther = Math.atan2(other.y - car.y, other.x - car.x);
          const relBearing = angleDiff(angleToOther, car.angle);

          if (relBearing > 0.15 && relBearing < Math.PI - 0.15) {
            // Other vehicle is to our RIGHT: other vehicle has priority!
            weHavePriority = false;
          } else if (relBearing < -0.15 && relBearing > -Math.PI + 0.15) {
            // Other vehicle is to our LEFT: we have priority!
            weHavePriority = true;
          } else if ((car.targetWaypointIndex || 0) > (other.targetWaypointIndex || 0)) {
            weHavePriority = true;
          } else if ((other.targetWaypointIndex || 0) > (car.targetWaypointIndex || 0)) {
            weHavePriority = false;
          } else {
            // Tie-breaker: vehicle stuck longer yields
            if ((car.stuckTimer || 0) > 1.0 || (other.stuckTimer || 0) > 1.0) {
              weHavePriority = (car.stuckTimer || 0) < (other.stuckTimer || 0);
            } else {
              weHavePriority = car.id < other.id;
            }
          }
        }

        // CRITICAL FAILSAFE: Even if we have priority, if the other vehicle is already physically
        // blocking our immediate path or overlapping, we MUST slow down/yield to avoid ramming into it!
        const isPhysicallyObstructing = isOverlapping || (distLong > 0 && distLong < combinedHalfL + 16 && distLat < combinedHalfW + 8);
        const isBeingBypassed = (car.avoidancePhase === 'passing' || car.avoidancePhase === 'swerving') && car.avoidanceObstacleId === other.id;
        if (isBeingBypassed && distLat >= (car.width + other.width) * 0.5 + 1.5 && !isOverlapping) {
          // Allow passing by without stopping
        } else if (!weHavePriority || isPhysicallyObstructing) {
          const netGap = Math.max(0.1, directDist - combinedHalfL - 8);
          if (netGap < minGapToLeadCar) {
            minGapToLeadCar = netGap;
            leadCarSpeed = Math.max(0, other.speed * Math.max(0, Math.cos(aDiff)));
            hasLeadCar = true;
          }
          car.stoppedYieldTimer = (car.stoppedYieldTimer || 0) + dt;
        }
      }
    }

    // Handle solid prop obstacle if detected and in driving path
    if (leadObstacle && leadObstacle.type === 'prop') {
      const effectivePropDistLat = Math.abs(leadObstacle.signedLat - (car.avoidanceOffset || 0));
      const propHalfW = (car.width * 0.5 + leadObstacle.width * 0.5);
      if (effectivePropDistLat < propHalfW + 1.5) {
        const isBeingBypassed = (car.avoidancePhase === 'passing' || car.avoidancePhase === 'swerving' || car.aiState === 'avoiding_obstacle') && 
          (car.avoidanceObstacleId === leadObstacle.id || Math.abs(car.avoidanceOffset || 0) > 2.0);
        const netGap = Math.max(0.1, leadObstacle.distLong - (car.length * 0.5 + leadObstacle.width * 0.5));
        if (!isBeingBypassed || netGap <= 4) {
          if (netGap < minGapToLeadCar) {
            minGapToLeadCar = netGap;
            leadCarSpeed = 0;
            hasLeadCar = true;
          }
        }
      }
    }

    // Pedestrian obstacle detection (Wide & Forward Scanning)
    let pedObstacleDist = 999;
    const forwardLookahead = Math.max(85, car.speed * 1.3 + 45);
    const nearbyPedestrians = pedGrid ? pedGrid.queryRadius(car.x, car.y, forwardLookahead + 25) : world.pedestrians;

    for (const ped of nearbyPedestrians) {
      const relX = ped.x - car.x;
      const relY = ped.y - car.y;
      const distLong = relX * carCos + relY * carSin;
      const distLat = Math.abs(relX * -carSin + relY * carCos);

      // Check if pedestrian is directly in front of the vehicle or stepping onto the road
      if (distLong > 0 && distLong < forwardLookahead && distLat < 24) {
        if (distLong < pedObstacleDist) {
          pedObstacleDist = distLong;
        }
      } else if (distLong > -8 && distLong < 45 && distLat < 20) {
        // Pedestrian crossing right in front of bumper
        if (distLong < pedObstacleDist) {
          pedObstacleDist = Math.max(5, distLong);
        }
      }
    }

    // Yield to pedestrians actively crossing crosswalks in front of vehicle
    if (pedObstacleDist >= 999) {
      for (const inter of world.intersections) {
        const distToInter = Math.hypot(inter.x - car.x, inter.y - car.y);
        if (distToInter < inter.width / 2 + 75) {
          for (const cw of inter.crosswalks || []) {
            const distToCw = Math.hypot(cw.x - car.x, cw.y - car.y);
            if (distToCw < 85) {
              const crossingPed = nearbyPedestrians.find(
                (p) => (p.state === 'crossing'|| p.isCrossingRoad) && p.targetCrosswalkId === cw.id
              );
              if (crossingPed) {
                const pedRelX = crossingPed.x - car.x;
                const pedRelY = crossingPed.y - car.y;
                const pLong = pedRelX * carCos + pedRelY * carSin;
                const pLat = Math.abs(pedRelX * -carSin + pedRelY * carCos);
                if (pLong > 0 && pLong < 75 && pLat < 36) {
                  pedObstacleDist = pLong;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Building Front Bumper Collision check (only reverse if front bumper is directly touching/inside building footprint)
    let isFrontCollidingWithBuilding = false;
    const frontX = car.x + carCos * (car.length * 0.5 + 2);
    const frontY = car.y + carSin * (car.length * 0.5 + 2);

    for (const bld of world.buildings) {
      if (frontX >= bld.x - 2 && frontX <= bld.x + bld.width + 2 &&
          frontY >= bld.y - 2 && frontY <= bld.y + bld.height + 2) {
        isFrontCollidingWithBuilding = true;
        break;
      }
    }

    if (isFrontCollidingWithBuilding && Math.abs(car.speed) < 18 && !(car as any).isFireDispatch) {
      // Car front bumper is wedged directly into a building wall -> Initiate smart reverse turn!
      car.aiState = 'reversing';
      car.reverseTimer = 2.0;
      car.recoveryTargetAngle = car.angle + (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3);
      car.recoverySteer = 0;
      car.speed = -35;
      continue;
    }

    // 3.5 Pre-plan turn signal & intent ahead of intersection (ПДД)
    updateTurnSignalAndIntent(car, world);

    // 4. Traffic Light & Intersection Reservation & Yielding Rules (ПДД + Arbiter + Yellow Dilemma Zone)
    let mustStopAtStopLine = false;
    let stopLineDist = 999;

    if (!car.inIntersection && !car.currentConnection) {
      const currentLane = findLaneById(world, car.currentLaneId);
      if (currentLane && currentLane.connections && currentLane.connections.length > 0) {
        const candidateConn = currentLane.connections.find((c) => c.turnType === car.plannedTurn) || currentLane.connections[0];
        if (candidateConn.intersectionId && candidateConn.stopLineDirection) {
          const inter = world.intersections.find((i) => i.id === candidateConn.intersectionId);
          if (inter) {
            const stopLine = inter.stopLines?.find((sl) => sl.direction === candidateConn.stopLineDirection);
            if (stopLine) {
              const midX = (stopLine.x1 + stopLine.x2) / 2;
              const midY = (stopLine.y1 + stopLine.y2) / 2;
              const dx = midX - car.x;
              const dy = midY - car.y;
              const distToLine = Math.hypot(dx, dy);

              const longitudinalDist = dx * carCos + dy * carSin;
              const stopLineLookahead = Math.max(220, Math.min(850, 75 + car.speed * 1.8 + (car.speed * car.speed) / 240));
              if (distToLine < stopLineLookahead && longitudinalDist >= -25) {
                const headingToLine = Math.atan2(dy, dx);
                if (Math.abs(angleDiff(headingToLine, car.angle)) < 0.7) {
                  // A. Traffic Light Check (use spatial grid if available instead of scanning all props)
                  const nearbyLightProps = propGrid
                    ? propGrid.queryRadius(inter.x, inter.y, Math.max(inter.width, inter.height) + 60)
                    : world.props;
                  const isLightBroken = inter.isSignalLost || nearbyLightProps.some(
                    (p) => p.type === 'traffic_light'&&
                           p.intersectionId === inter.id &&
                           p.direction === candidateConn.stopLineDirection &&
                           p.isBroken
                  );

                  // Yellow-Light Dilemma Zone (ПДД 6.14):
                  // If the signal just turned 'yellow' when the vehicle is close to the stop line at speed,
                  // check if stopping before the stop line would require excessive emergency deceleration (> 1.55 * b_comf).
                  let isYellowDilemmaPass = false;
                  if (inter.hasLights && !isLightBroken && stopLine.lightState === 'yellow') {
                    const netStopDist = Math.max(1.0, distToLine - 18);
                    const requiredDecel = (car.speed * car.speed) / (2 * netStopDist);
                    const driverComfDecel = 160 * profile.comfortBrakeFactor;
                    if (car.speed > 26 && distToLine < Math.max(34, car.speed * 1.05) && requiredDecel > driverComfDecel * 1.55) {
                      isYellowDilemmaPass = true;
                    }
                  }

                  const isRedOrYellow = inter.hasLights && !isLightBroken && !isYellowDilemmaPass && (
                    stopLine.lightState === 'red'|| 
                    stopLine.lightState === 'yellow'|| 
                    stopLine.lightState === 'red_yellow');

                  if (isRedOrYellow) {
                    mustStopAtStopLine = true;
                    stopLineDist = distToLine;
                    car.aiState = 'stopping_light';
                    intersectionArbiter.registerWaiting(car, inter.id, candidateConn);
                  } else {
                    // B. Request Reservation from Arbiter
                    const reservation = intersectionArbiter.requestReservation(car, inter.id, candidateConn, world);
                    if (!reservation.granted) {
                      mustStopAtStopLine = true;
                      stopLineDist = distToLine;
                      car.aiState = 'yielding';
                    } else {
                      // C. Map-Based Priority / Yield Rules Check (ПДД Главная дорога / Уступи дорогу)
                      let mustYieldToMainRoad = false;
                      const nearbyInterCars = vehGrid ? vehGrid.queryRadius(inter.x, inter.y, inter.width / 2 + 450) : world.vehicles;

                      // 1. Check explicit yieldToLaneId or yieldToLaneIds on candidate connection
                      if (candidateConn.yieldToLaneId) {
                        for (const mCar of nearbyInterCars) {
                          if (mCar.isParked || mCar.id === car.id) continue;
                          if (mCar.currentLaneId === candidateConn.yieldToLaneId || mCar.currentConnection?.targetLaneId === candidateConn.yieldToLaneId) {
                            const distToMerge = Math.hypot(mCar.x - car.x, mCar.y - car.y);
                            const yieldScanDist = Math.max(260, 80 + Math.max(0, mCar.speed) * 2.2);
                            if (distToMerge < yieldScanDist) {
                              mustYieldToMainRoad = true;
                              break;
                            }
                          }
                        }
                      }

                      if (!mustYieldToMainRoad && candidateConn.yieldToLaneIds && candidateConn.yieldToLaneIds.length > 0) {
                        for (const targetYieldId of candidateConn.yieldToLaneIds) {
                          for (const mCar of nearbyInterCars) {
                            if (mCar.isParked || mCar.id === car.id) continue;
                            if (mCar.currentLaneId === targetYieldId || mCar.currentConnection?.targetLaneId === targetYieldId) {
                              const distToMerge = Math.hypot(mCar.x - car.x, mCar.y - car.y);
                              const yieldScanDist = Math.max(260, 80 + Math.max(0, mCar.speed) * 2.2);
                              if (distToMerge < yieldScanDist) {
                                mustYieldToMainRoad = true;
                                break;
                              }
                            }
                          }
                          if (mustYieldToMainRoad) break;
                        }
                      }

                      // 2. Check yieldRule, priority, or isSecondaryMerge
                      if (!mustYieldToMainRoad && (candidateConn.priority === 'yield' || candidateConn.priority === 'stop' || candidateConn.yieldRule === 'yield_to_main' || candidateConn.isSecondaryMerge)) {
                        const targetL = findLaneById(world, candidateConn.targetLaneId);
                        if (targetL) {
                          for (const mCar of nearbyInterCars) {
                            if (mCar.isParked || mCar.id === car.id) continue;
                            if (mCar.currentLaneId === candidateConn.targetLaneId || mCar.currentConnection?.targetLaneId === candidateConn.targetLaneId) {
                              const distToMerge = Math.hypot(mCar.x - car.x, mCar.y - car.y);
                              const yieldScanDist = Math.max(260, 80 + Math.max(0, mCar.speed) * 2.2);
                              if (distToMerge < yieldScanDist) {
                                mustYieldToMainRoad = true;
                                break;
                              }
                            }
                          }
                        }
                      }

                      // 3. Check intersection-level priorityRules
                      if (!mustYieldToMainRoad && inter.priorityRules) {
                        const yieldingLanes = inter.priorityRules.yieldLaneIds || [];
                        const mainLanes = inter.priorityRules.mainLaneIds || [];

                        if (yieldingLanes.includes(currentLane.laneId)) {
                          for (const mLaneId of mainLanes) {
                            for (const mCar of nearbyInterCars) {
                              if (mCar.isParked || mCar.id === car.id) continue;
                              if (mCar.currentLaneId === mLaneId || mCar.currentConnection?.targetLaneId === mLaneId) {
                                const distToInter = Math.hypot(mCar.x - inter.x, mCar.y - inter.y);
                                const yieldScanDist = Math.max(260, 80 + Math.max(0, mCar.speed) * 2.2);
                                if (distToInter < inter.width / 2 + yieldScanDist) {
                                  mustYieldToMainRoad = true;
                                  break;
                                }
                              }
                            }
                            if (mustYieldToMainRoad) break;
                          }
                        }

                        if (!mustYieldToMainRoad) {
                          const ruleMatch = inter.priorityRules.rules?.find((r) => r.fromLaneId === currentLane.laneId);
                          if (ruleMatch && ruleMatch.yieldToLaneId) {
                            for (const mCar of nearbyInterCars) {
                              if (mCar.isParked || mCar.id === car.id) continue;
                              if (mCar.currentLaneId === ruleMatch.yieldToLaneId) {
                                const distToMerge = Math.hypot(mCar.x - car.x, mCar.y - car.y);
                                const yieldScanDist = Math.max(260, 80 + Math.max(0, mCar.speed) * 2.2);
                                if (distToMerge < yieldScanDist) {
                                  mustYieldToMainRoad = true;
                                  break;
                                }
                              }
                            }
                          } else if (inter.priorityRules.yieldRoads) {
                            const road = findRoadByLaneId(world, currentLane.laneId);
                            if (road && inter.priorityRules.yieldRoads.includes(road.id)) {
                              const roadIdx = getWorldRoadLaneIndex(world);
                              for (const pRoadId of inter.priorityRules.priorityRoads || []) {
                                const pRoad = roadIdx.roadByIdMap.get(pRoadId);
                                if (pRoad && pRoad.lanePaths) {
                                  for (const pLane of pRoad.lanePaths) {
                                    for (const mCar of nearbyInterCars) {
                                      if (mCar.isParked || mCar.id === car.id) continue;
                                      if (mCar.currentLaneId === pLane.laneId) {
                                        const distToInter = Math.hypot(mCar.x - inter.x, mCar.y - inter.y);
                                        const yieldScanDist = Math.max(260, 80 + Math.max(0, mCar.speed) * 2.2);
                                        if (distToInter < inter.width / 2 + yieldScanDist) {
                                          mustYieldToMainRoad = true;
                                          break;
                                        }
                                      }
                                    }
                                    if (mustYieldToMainRoad) break;
                                  }
                                }
                                if (mustYieldToMainRoad) break;
                              }
                            }
                          }
                        }
                      }

                      if (mustYieldToMainRoad) {
                        mustStopAtStopLine = true;
                        stopLineDist = distToLine;
                        car.aiState = 'yielding';
                      } else if (distToLine < 45) {
                        car.aiState = 'driving';
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      car.aiState = 'in_intersection';
    }

    // 4.5. Railway Level Crossing Barrier & Signal Enforcement (ПДД: Остановка перед закрытым переездом/шлагбаумом)
    if (!mustStopAtStopLine) {
      const crossings = getLevelCrossings(world);
      for (const cross of crossings) {
        // Check proximity within range of crossing
        const distToCenter = Math.hypot(car.x - cross.centerX, car.y - cross.centerY);
        if (distToCenter > Math.max(480, 100 + car.speed * 1.8)) continue;

        // Check if this crossing is closed by signal aspect, lowering/lowered barrier, or approach detection
        const isClosed = (world.railwaySignals && world.railwaySignals.some(
          s => (s.id === cross.signalNorthId || s.id === cross.signalSouthId || (Math.hypot(s.x - cross.centerX, s.y - cross.centerY) < 220 && s.type === 'crossing')) &&
               (s.currentAspect === 'red_alternating' || s.currentAspect === 'red_alternating_flashing' || s.currentAspect === 'red' || (s.barrierProgress !== undefined && s.barrierProgress > 0.05))
        )) || isCrossingApproachOccupied(cross, world);

        if (isClosed) {
          const minTrackY = Math.min(...cross.tracksY);
          const maxTrackY = Math.max(...cross.tracksY);
          const onTracks = car.x >= cross.minX - 25 && car.x <= cross.maxX + 25 && car.y >= minTrackY - 10 && car.y <= maxTrackY + 10;

          if (onTracks && !car.isDerelict) {
            // If caught directly on tracks when crossing closes, emergency clear the tracks immediately!
            car.aiState = 'driving';
            car.targetSpeed = 160;
            car.turnSignal = 'hazard';
          } else {
            // Determine stopping distance relative to actual barriers
            let stopDist = 999;
            const carDirY = Math.sin(car.angle);

            // Proactively lookup physical level crossing barrier signal mast locations in the world
            const sigNorth = world.railwaySignals?.find(s => s.id === cross.signalNorthId);
            const sigSouth = world.railwaySignals?.find(s => s.id === cross.signalSouthId);

            if (carDirY > 0.3) {
              // Moving South: stop before North barrier
              const stopY = sigNorth ? sigNorth.y - 12 : minTrackY - 215;
              stopDist = stopY - (car.y + car.length / 2);
            } else if (carDirY < -0.3) {
              // Moving North: stop before South barrier
              const stopY = sigSouth ? sigSouth.y + 12 : maxTrackY + 215;
              stopDist = (car.y - car.length / 2) - stopY;
            } else {
              // Fallback for general heading
              const toCrossingX = cross.centerX - car.x;
              const toCrossingY = cross.centerY - car.y;
              const forwardDist = toCrossingX * carCos + toCrossingY * carSin;
              const crossingHalfDepth = Math.max(45, (maxTrackY - minTrackY) / 2 + 180);
              stopDist = Math.max(0, forwardDist - crossingHalfDepth);
            }

            // Only stop if heading towards the crossing and haven't passed the barrier yet
            if (stopDist > -15 && stopDist < Math.max(320, 90 + car.speed * 1.8)) {
              mustStopAtStopLine = true;
              stopLineDist = Math.max(0, stopDist);
              car.aiState = 'stopping_light';
              break;
            }
          }
        }
      }
    }

    // 5. Intelligent Driver Model (IDM) Target Speed & Multi-Car Lookahead Acceleration
    const road = findRoadByLaneId(world, car.currentLaneId || car.currentConnection?.targetLaneId || null);
    const defaultCruiseSpeed = getVehicleCruiseSpeedPx(car, road);

    const isRightTurn = car.currentConnection?.turnType === 'right' || car.plannedTurn === 'right';
    const isTurnaround = car.currentConnection?.turnType === 'turnaround';
    const turnMaxSpeed = getTurnSpeedPx(car, isRightTurn, isTurnaround);

    // Keep v0 at defaultCruiseSpeed while approaching on the straight segment;
    // turn speed reduction is shaped via a continuous kinematic approach curve below (prevents sudden brake-slamming 160px before intersections!)
    const v0 = (car.inIntersection || car.currentConnection) ? turnMaxSpeed : defaultCruiseSpeed;

    // Ghosting recovery alpha handling
    const hasActivePriorityPass = car.priorityPassUntil && nowSec < car.priorityPassUntil;
    if (!car.inIntersection && car.ghostingAlpha !== undefined && car.ghostingAlpha < 1.0 && !hasActivePriorityPass) {
      car.ghostingAlpha = Math.min(1.0, car.ghostingAlpha + dt * 1.5);
    }

    // Auto-maintenance: if AI vehicle is driving smoothly without recent crash, restore minor bumper dents
    if (car.damage && car.speed > 15 && (!car.lastDamageTime || nowSec - car.lastDamageTime > 12)) {
      if (car.engineState && !car.engineState.radiatorPunctured && !car.engineState.oilPunctured) {
        car.damage.frontCrumple = Math.max(0, car.damage.frontCrumple - dt * 1.5);
        car.damage.rearCrumple = Math.max(0, car.damage.rearCrumple - dt * 1.5);
        car.damage.frontLeftDent = Math.max(0, car.damage.frontLeftDent - dt * 1.2);
        car.damage.frontRightDent = Math.max(0, car.damage.frontRightDent - dt * 1.2);
        car.damage.rearLeftDent = Math.max(0, car.damage.rearLeftDent - dt * 1.2);
        car.damage.rearRightDent = Math.max(0, car.damage.rearRightDent - dt * 1.2);
        car.damage.leftDent = Math.max(0, car.damage.leftDent - dt * 1.2);
        car.damage.rightDent = Math.max(0, car.damage.rightDent - dt * 1.2);

        // Reset vertex deform offsets towards 0
        if (car.damage.deformedVertices) {
          for (const v of car.damage.deformedVertices) {
            const decay = Math.max(0, 1 - dt * 0.8);
            v.offsetX *= decay;
            v.offsetY *= decay;
            if (v.targetOffsetX !== undefined) v.targetOffsetX *= decay;
            if (v.targetOffsetY !== undefined) v.targetOffsetY *= decay;
          }
        }
      }
    }

    // Individualized IDM parameters scaled by vehicle class and driver personality
    const isHeavyCar = car.length > 52 || (car.wheelBase || 28) > 34 || car.type.startsWith('truck_') || car.type.startsWith('tractor_') || car.type === 'bus';
    const isAgile = car.type === 'sports' || car.type === 'supercar' || car.type.startsWith('moto_');
    const baseAMax = isAgile ? 200 : (isHeavyCar ? 85 : 140);
    const baseBComf = isAgile ? 210 : (isHeavyCar ? 120 : 165);

    const a_max = baseAMax * profile.accelFactor;
    const b_comf = baseBComf * profile.comfortBrakeFactor;
    const delta_exp = 4;
    const s0 = Math.max(38, ((car.length || 42) * 0.72 + 16) * profile.minGapFactor);
    const T_headway = (v0 > 240 ? profile.desiredTimeHeadway * 1.15 : profile.desiredTimeHeadway) * (isHeavyCar ? 1.22 : 1.0);

    const v = Math.max(0, car.speed);
    
    // Free acceleration component
    let idm_accel = a_max * (1 - Math.pow(v / Math.max(1, v0), delta_exp));

    // Smooth kinematic deceleration when approaching a planned left/right turn
    if (!car.inIntersection && !car.currentConnection && car.plannedTurn !== 'straight' && car.routeWaypoints && car.routeWaypoints.length > 0) {
      const turnEntryWp = car.routeWaypoints[car.routeWaypoints.length - 1];
      const distToTurnEntry = Math.hypot(turnEntryWp.x - car.x, turnEntryWp.y - car.y);
      if (v > turnMaxSpeed) {
        const neededBrakingDist = (v * v - turnMaxSpeed * turnMaxSpeed) / (2 * Math.max(65, b_comf * 0.82)) + 28;
        if (distToTurnEntry < Math.max(180, neededBrakingDist)) {
          const turnApproachDecel = (turnMaxSpeed * turnMaxSpeed - v * v) / (2 * Math.max(10, distToTurnEntry - 12));
          if (turnApproachDecel < idm_accel) {
            idm_accel = turnApproachDecel;
          }
        }
      }
    }

    // Evaluate virtual static/moving obstacles to apply braking forces smoothly
    const obstacles: { s: number; v_lead: number; isStationaryTarget?: boolean }[] = [];

    if (mustStopAtStopLine) {
      // Treat stop line as a static obstacle
      const netGap = Math.max(0.1, stopLineDist - 24);
      obstacles.push({ s: netGap, v_lead: 0, isStationaryTarget: true });
    }

    if (pedObstacleDist < 999) {
      // Treat pedestrian as a static obstacle
      const netGap = Math.max(0.1, pedObstacleDist - 18);
      obstacles.push({ s: netGap, v_lead: 0, isStationaryTarget: true });
    }

    if (hasLeadCar) {
      // Treat lead car as an obstacle
      const isLeadStationary = leadCarSpeed < 3;
      obstacles.push({ s: Math.max(0.1, minGapToLeadCar), v_lead: leadCarSpeed, isStationaryTarget: isLeadStationary });
    }

    // Multi-Car Platoon Braking Wave Lookahead (Предотвращение паровозиков на трассах):
    // Attentive drivers see brake lights 2-3 vehicles ahead (up to 680px) and begin smooth early deceleration
    // before the car immediately in front slams on its brakes.
    if (platoonBrakingObstacle && profile.attentiveness > 0.56) {
      const effectivePlatoonGap = Math.max(18, platoonBrakingObstacle.distLong * 0.62);
      obstacles.push({
        s: effectivePlatoonGap,
        v_lead: platoonBrakingObstacle.speed,
        isStationaryTarget: platoonBrakingObstacle.speed < 4,
      });
    }

    // Apply IDM deceleration term for each obstacle and find the minimum acceleration (safest option)
    for (const obs of obstacles) {
      const delta_v = v - obs.v_lead;
      const s_star = s0 + v * T_headway + (v * delta_v) / (2 * Math.sqrt(a_max * b_comf));

      let obs_accel: number;

      // Smooth Arrival / Comfort Stop Shaping:
      // Only ease brake pressure during the final low-speed roll-out (< 22 px/s) when stopping comfortably
      const idealKinematicDecel = -(v * v) / (2 * Math.max(0.5, obs.s));
      if (obs.isStationaryTarget && v < 55 && idealKinematicDecel > -b_comf * 1.45) {
        const rawIdmDecel = a_max * (1 - Math.pow(v / Math.max(1, v0), delta_exp) - Math.pow(Math.max(0, s_star) / obs.s, 2));
        obs_accel = Math.max(idealKinematicDecel * 1.32, rawIdmDecel);

        if (v < 22 && obs.s < 28 && idealKinematicDecel > -b_comf * 1.1) {
          const comfortDecelLimit = Math.max(45, v * 4.2 + 24);
          obs_accel = Math.max(-comfortDecelLimit, obs_accel);
        }
      } else {
        const brake_term = Math.pow(Math.max(0, s_star) / obs.s, 2);
        obs_accel = a_max * (1 - Math.pow(v / Math.max(1, v0), delta_exp) - brake_term);
      }

      if (obs_accel < idm_accel) {
        idm_accel = obs_accel;
      }
    }

    // Physical emergency deceleration limit (allows up to -620 px/s^2 full tire grip braking instead of the old -380 cap)
    car.idmAcceleration = Math.max(-620, Math.min(a_max * 1.35, idm_accel));

    // Standstill transition: when virtually stopped (< 1.2 px/s) at a stop line or queue, lock smoothly to 0
    const isStoppingOrYielding = mustStopAtStopLine || car.aiState === 'stopping_light' || car.aiState === 'yielding' || (hasLeadCar && leadCarSpeed < 2 && minGapToLeadCar < s0 + 8);
    if (v < 1.2 && isStoppingOrYielding) {
      car.speed = 0;
      car.vx = 0;
      car.vy = 0;
      car.idmAcceleration = 0;
    }

    // If yielding to emergency vehicles, stop completely (effectiveV0 = 0) so the fire engine has room to pass!
    const effectiveV0 = car.aiState === 'yielding' ? 0 : v0;
    car.targetSpeed = effectiveV0;

    // Hard emergency braking for imminent forward/head-on crash or close high-closing-speed obstacle
    const leadClosingSpeed = hasLeadCar ? (v - leadCarSpeed) : 0;
    const leadTtc = (hasLeadCar && leadClosingSpeed > 4) ? (minGapToLeadCar / leadClosingSpeed) : 999;
    const isImminentCrash =
      (pedObstacleDist < 32 && v > 10) ||
      (hasLeadCar && (minGapToLeadCar < 18 || leadTtc < 1.65) && leadClosingSpeed > 12) ||
      !!imminentHeadOnThreat ||
      !!imminentForwardThreat;
    if (isImminentCrash) {
      const emergencyGripDecel = isHeavyCar ? -460 : -600;
      car.idmAcceleration = Math.min(car.idmAcceleration, emergencyGripDecel);
    }

    // Update AI state (protect intentional active maneuver states)
    if (car.avoidancePhase && car.avoidancePhase !== 'none') {
      // Keep 'avoiding_obstacle' or 'evading'
    } else if (car.aiState === 'lane_changing' || car.aiState === 'overtaking' || car.aiState === 'yielding' || car.aiState === 'evading') {
      // Keep intentional maneuver state
    } else if (pedObstacleDist < 999 || hasLeadCar) {
      car.aiState = 'stopping_obstacle';
    } else if (mustStopAtStopLine) {
      car.aiState = 'stopping_light';
    } else {
      if (!car.inIntersection) {
        car.aiState = 'driving';
      }
    }

    // 6. Anti-Deadlock & Autonomous Recovery
    // Legitimate stationary stops: Waiting at active red light / stop line, waiting behind a lead vehicle in queue, yielding, waiting for pedestrian crossing right ahead
    const isQueuedBehindCar = hasLeadCar && minGapToLeadCar < 120;
    const isLegitimateStop = 
      (mustStopAtStopLine && (car.aiState === 'stopping_light' || car.aiState === 'yielding')) || 
      car.aiState === 'yielding' ||
      (car.aiState === 'stopping_obstacle' && isQueuedBehindCar) ||
      isQueuedBehindCar ||
      (car.avoidancePhase && car.avoidancePhase !== 'none') ||
      pedObstacleDist < 100;

    // Calculate heading diff and off-track status
    const activeWp = car.routeWaypoints ? car.routeWaypoints[car.targetWaypointIndex] : null;
    let headingDiffToWp = 0;
    if (activeWp) {
      const targetA = Math.atan2(activeWp.y - car.y, activeWp.x - car.x);
      headingDiffToWp = Math.abs(angleDiff(targetA, car.angle));
    }
    const isSlow = Math.abs(car.speed) < 18; // below ~5 km/h
    const isDiagonallyStuck = (isSlow && headingDiffToWp > 0.45) || (Math.abs(car.speed) < 28 && headingDiffToWp > 0.75);
    const isStationaryOrCrawling = Math.abs(car.speed) < 3.5;

    if (isLegitimateStop && !isDiagonallyStuck) {
      car.stuckTimer = 0;
      car.stoppedYieldTimer = 0;
      if ((car as any).isFireDispatch) {
        car.ghostingAlpha = Math.min(1.0, (car.ghostingAlpha ?? 1.0) + dt * 1.5);
      }
    } else if (isStationaryOrCrawling || isDiagonallyStuck) {
      car.stuckTimer += dt;
      car.stoppedYieldTimer = (car.stoppedYieldTimer || 0) + dt;

      // Dispatched fire engine self-ghosting when stuck/blocked
      if ((car as any).isFireDispatch && car.stuckTimer > 0.8) {
        car.ghostingAlpha = Math.max(0.35, (car.ghostingAlpha ?? 1.0) - dt * 2.0);
        car.targetSpeed = 100;
        car.speed = Math.max(car.speed, 35);
        car.aiState = 'driving';
      }

      // Proactive pairwise deadlock resolution on highways, intersections or country roads
      // ONLY apply pairwise deadlock if car is NOT in a normal traffic queue behind another car
      if (car.stuckTimer > 5.0 && !(car as any).isFireDispatch && !isQueuedBehindCar) {
        const nearbyStallVehs = vehGrid ? vehGrid.queryRadius(car.x, car.y, 90) : world.vehicles;
        for (const oCar of nearbyStallVehs) {
          if (oCar.id !== car.id && !oCar.isParked && oCar.id !== 'evac_ambulance_special') {
            const arbRes = globalMutualYieldArbiter.registerEncounter(car, oCar, true, nowSec, world, nearbyStallVehs);
            if (arbRes.isSovereignLeader) {
              car.priorityPassUntil = nowSec + 3.8;
              car.priorityPassIgnoreId = oCar.id;
              car.ghostingAlpha = 0.35;
              car.targetSpeed = 50;
              car.speed = Math.max(car.speed, 12);
              car.aiState = 'driving';
              break;
            }
          }
        }
      }

      // Inside intersection, on connection, or in physical stall: activate ghosting and glide through without teleporting
      // ONLY if car is actually stuck in an intersection or severe off-road wedging, NEVER when queued in a lane behind a lead car
      if (car.stuckTimer > 6.0 && !(car as any).isFireDispatch && !isQueuedBehindCar) {
        car.ghostingAlpha = Math.max(0.3, (car.ghostingAlpha ?? 1.0) - dt * 1.5);
        car.targetSpeed = 45;
        car.speed = Math.max(car.speed, 12);
        car.aiState = 'driving';
      }

      // Trigger autonomous reverse recovery ONLY when severely misaligned diagonally after an actual crash
      const isRecoveryNeeded = isDiagonallyStuck && car.stuckTimer > 2.5;
      if (isRecoveryNeeded && !isVehicleDisabledOrCrashed(car) && (car.aiState as string) !== 'reversing') {
        car.aiState = 'reversing';
        car.reverseTimer = 1.4;
        if (activeWp) {
          car.recoveryTargetAngle = Math.atan2(activeWp.y - car.y, activeWp.x - car.x);
        }
        trafficDiagnostics.log('info', `Car #${car.id.slice(-4)} initiating reverse turn recovery from blockage`, car.id);
      }

      // Hard deadlock dissolution ONLY for distant off-screen cars (> 1300 px away from player)
      const distToPlayer = Math.hypot(car.x - targetPos.x, car.y - targetPos.y);
      if (car.stuckTimer > 8.0 && distToPlayer > 1300 && !(car as any).isFireDispatch && !car.isParked && !isOwnedOrKeyed) {
        intersectionArbiter.releaseReservation(car.id);
        car.intersectionReservationId = null;
        vehiclesToDespawn.push(car.id);
        trafficDiagnostics.log('deadlock', `Gridlock Dissolution: Despawned distant stalled Car #${car.id.slice(-4)}`, car.id);
        continue;
      }
    } else {
      car.stuckTimer = Math.max(0, car.stuckTimer - dt * 2.0);
      car.stoppedYieldTimer = Math.max(0, (car.stoppedYieldTimer || 0) - dt * 2.0);
      if ((car as any).isFireDispatch && car.ghostingAlpha !== undefined) {
        // Handled proactively by fire engine proximity logic
      }
      const hasActivePriorityPassBottom = car.priorityPassUntil && nowSec < car.priorityPassUntil;
      if (car.ghostingAlpha !== undefined && car.ghostingAlpha < 1.0 && !hasActivePriorityPassBottom) {
        // Restore opacity smoothly once the car is moving normally
        car.ghostingAlpha = Math.min(1.0, car.ghostingAlpha + dt * 0.8);
      }
    }
  }

  if (vehiclesToDespawn.length > 0) {
    const despawnSet = new Set(vehiclesToDespawn);
    world.vehicles = world.vehicles.filter((v) => !despawnSet.has(v.id));
  }

  // Update telemetry stats
  trafficDiagnostics.averageSpeed = movingCars > 0 ? (totalSpeed / movingCars) * PX_S_TO_SPEED_KMH : 0; // km/h
  trafficDiagnostics.gridlockCount = deadlockedCars;
}

// Update turn signal indicator and pre-planned turn when approaching intersections or standing at red lights (ПДД)
function updateTurnSignalAndIntent(car: Vehicle, world: GameWorld) {
  if (car.turnSignal === 'hazard'&& isVehicleDisabledOrCrashed(car)) {
    return;
  }
  // If actively on a connection / in intersection
  if (car.currentConnection) {
    if (car.currentConnection.turnType === 'left'|| car.currentConnection.turnType === 'turnaround') {
      car.turnSignal = 'left';
    } else if (car.currentConnection.turnType === 'right') {
      car.turnSignal = 'right';
    } else {
      car.turnSignal = 'none';
    }
    return;
  }

  // If cruising along a road lane
  const currentLane = findLaneById(world, car.currentLaneId);
  if (!currentLane || !currentLane.connections || currentLane.connections.length === 0) {
    car.turnSignal = 'none';
    car.plannedTurn = 'straight';
    return;
  }

  // Distance from vehicle to the end of the current lane / stop line
  const endWp = currentLane.waypoints[currentLane.waypoints.length - 1];
  const distToEnd = Math.hypot(endWp.x - car.x, endWp.y - car.y);

  // Pre-plan turn intent 320px ahead so multi-lane MOBIL alignment can move into the proper turn lane early;
  // activate physical turn signal blinkers at 180px ahead or when stopping/yielding.
  if (distToEnd < 320 || car.aiState === 'stopping_light'|| car.aiState === 'yielding') {
    // If turn has not been pre-selected yet or is straight, pick candidate
    if (currentLane.connections.length === 1) {
      const conn = currentLane.connections[0];
      car.plannedTurn = conn.turnType === 'turnaround'? 'left': conn.turnType;
    } else if (car.plannedTurn === 'straight') {
      // Avoid straight if the target road has an accident or traffic jam
      const straightConn = currentLane.connections.find((c) => c.turnType === 'straight');
      let straightBlocked = false;
      if (straightConn) {
        const tLane = findLaneById(world, straightConn.targetLaneId);
        if (tLane && tLane.waypoints.length >= 2) {
          const w1 = tLane.waypoints[0];
          const w2 = tLane.waypoints[tLane.waypoints.length - 1];
          straightBlocked = isRoadSegmentBlocked(world, w1.x, w1.y, w2.x, w2.y).isBlocked;
        }
      }

      const leftConn = currentLane.connections.find((c) => c.turnType === 'left');
      const rightConn = currentLane.connections.find((c) => c.turnType === 'right');

      if (straightBlocked) {
        if (rightConn && leftConn) {
          car.plannedTurn = Math.random() > 0.5 ? 'right': 'left';
        } else if (rightConn) {
          car.plannedTurn = 'right';
        } else if (leftConn) {
          car.plannedTurn = 'left';
        } else {
          car.plannedTurn = 'straight';
        }
      } else {
        // Pick based on car ID and lane properties
        const idNum = parseInt(car.id.replace(/\D/g, ''), 10) || 0;
        const seed = (idNum + Math.floor(endWp.x * 0.05 + endWp.y * 0.05)) % 10;
        
        if (rightConn && seed < 3) {
          car.plannedTurn = 'right';
        } else if (leftConn && seed >= 3 && seed < 6) {
          car.plannedTurn = 'left';
        } else {
          car.plannedTurn = 'straight';
        }
      }
    }

    if (distToEnd < 185 || car.aiState === 'stopping_light' || car.aiState === 'yielding') {
      if (car.plannedTurn === 'left') {
        car.turnSignal = 'left';
      } else if (car.plannedTurn === 'right') {
        car.turnSignal = 'right';
      } else {
        car.turnSignal = 'none';
      }
    }
  } else {
    // Cruising far from intersection
    car.turnSignal = 'none';
    car.plannedTurn = 'straight';
  }
}

// Transition vehicle onto its next connected lane or curve with anti-loop intelligence and load balancing
function advanceCarRoute(car: Vehicle, world: GameWorld) {
  // Case A: Finished an intersection connection or turnaround curve -> Enter target lane
  if (car.currentConnection) {
    // Release any active intersection reservation
    intersectionArbiter.releaseReservation(car.id);
    car.intersectionReservationId = null;

    const targetLane = findLaneById(world, car.currentConnection.targetLaneId);
    if (targetLane) {
      car.currentLaneId = targetLane.laneId;
      car.routeWaypoints = [...targetLane.waypoints];
      // Target waypoint index 1 ahead (end of lane), because waypoint index 0 is the entry point
      car.targetWaypointIndex = Math.min(targetLane.waypoints.length - 1, 1);
      // NOTE: Do not snap car.angle or car.steerAngle abruptly. Pure pursuit will naturally straighten wheels and smoothly align heading.
      car.currentConnection = null;
      car.inIntersection = false;
      car.hasExclusiveIntersectionToken = false;
      car.intersectionReservationToken = null;
      if (car.intersectionReservationId) {
        intersectionArbiter.releaseReservation(car.id, car.intersectionReservationId);
        car.intersectionReservationId = null;
      }
      car.plannedTurn = 'straight';
      car.turnSignal = 'none';
      trafficDiagnostics.totalPassedThrough++;
      return;
    }
  }

  // Case B: Reached end of current road lane -> Pick one of the connected options intelligently
  const currentLane = findLaneById(world, car.currentLaneId);
  if (currentLane && currentLane.connections && currentLane.connections.length > 0) {
    car.recentTurns = car.recentTurns || [];
    car.visitedIntersections = car.visitedIntersections || [];

    const now = performance.now() / 1000;
    // Clean old visited intersections (> 30s ago)
    car.visitedIntersections = car.visitedIntersections.filter((vi) => now - vi.time < 30);

    // Count recent turn patterns to prevent endless circular loops
    let consecutiveRights = 0;
    let consecutiveLefts = 0;
    let consecutiveStraights = 0;
    for (let i = car.recentTurns.length - 1; i >= 0; i--) {
      if (car.recentTurns[i] === 'right') consecutiveRights++;
      else break;
    }
    for (let i = car.recentTurns.length - 1; i >= 0; i--) {
      if (car.recentTurns[i] === 'left') consecutiveLefts++;
      else break;
    }
    for (let i = car.recentTurns.length - 1; i >= 0; i--) {
      if (car.recentTurns[i] === 'straight') consecutiveStraights++;
      else break;
    }

    let selectedConn = currentLane.connections[0];

    if (currentLane.connections.length > 1) {
      // Score each available connection based on route variety, loop avoidance, and lane capacity
      const scored = currentLane.connections.map((conn) => {
        let weight = 1.0;
        if (conn.turnType === 'straight') weight = 0.50;
        else if (conn.turnType === 'right') weight = 0.28;
        else if (conn.turnType === 'left') weight = 0.22;

        // Strongly honor the driver's pre-planned turn intent if already aligned
        if (car.plannedTurn && conn.turnType === car.plannedTurn) {
          weight *= 2.8;
        }

        // Anti-Loop Rule 1: NEVER allow 3 or more consecutive right turns (breaks 1x1 block loops)
        if (conn.turnType === 'right'&& consecutiveRights >= 2) {
          weight = 0.0;
        }
        // Anti-Loop Rule 2: NEVER allow 3 or more consecutive left turns
        if (conn.turnType === 'left'&& consecutiveLefts >= 2) {
          weight = 0.0;
        }
        // Anti-Loop Rule 3: If car went straight 3 times in a row, encourage turning onto cross streets
        if (conn.turnType === 'straight'&& consecutiveStraights >= 3) {
          weight = 0.08;
        }

        // Anti-Loop Rule 4: If this intersection was visited recently, avoid repeating the loop turn
        if (conn.intersectionId) {
          const pastVisits = car.visitedIntersections?.filter((vi) => vi.id === conn.intersectionId).length || 0;
          if (pastVisits > 0) {
            if (conn.turnType === 'straight') weight *= 3.0;
            else weight *= 0.15;
          }
        }

        // Anti-Loop Rule 5: If the car just came from a world boundary turnaround, strongly prefer turning onto a cross street
        if (car.justTurnedAround) {
          if (conn.turnType === 'right'|| conn.turnType === 'left') {
            weight *= 4.5;
          } else {
            weight *= 0.05;
          }
        }

        // Capacity & Load Balancing Rule: check how many cars are on the target lane
        const carsOnTargetLane = world.vehicles.filter(
          (v) => !v.isParked && v.id !== car.id && v.currentLaneId === conn.targetLaneId
        ).length;
        if (carsOnTargetLane >= 2) weight *= 0.3;
        if (carsOnTargetLane >= 4) weight *= 0.02;

        // Accident (Авария) & Traffic Jam (Затор) Avoidance Rule:
        // Strictly avoid routing into road segments with an accident or traffic jam in either direction!
        const targetLane = findLaneById(world, conn.targetLaneId);
        if (targetLane && targetLane.waypoints.length >= 2) {
          const wpFirst = targetLane.waypoints[0];
          const wpLast = targetLane.waypoints[targetLane.waypoints.length - 1];
          const blockInfo = isRoadSegmentBlocked(world, wpFirst.x, wpFirst.y, wpLast.x, wpLast.y);
          if (blockInfo.isBlocked) {
            weight = 0.0;
          }

          // Y-Intersection & Fork Sharp-Angle Turn Prohibition (ПДД / Схемы развязок):
          // Vehicles MUST NOT make sharp acute/obtuse turns at Y-junctions, forks, or ramps where entry/exit is designed for small angles!
          if (currentLane.waypoints.length >= 2) {
            const inter = conn.intersectionId ? world.intersections.find((i) => i.id === conn.intersectionId) : null;
            const isFork = inter?.type === 'fork' || conn.yieldRule === 'yield_to_main' || currentLane.laneId.includes('fork') || conn.targetLaneId.includes('fork') || conn.targetLaneId.includes('ramp') || conn.targetLaneId.includes('suburban_y');

            const inWp1 = currentLane.waypoints[currentLane.waypoints.length - 2];
            const inWp2 = currentLane.waypoints[currentLane.waypoints.length - 1];
            const outWp1 = targetLane.waypoints[0];
            const outWp2 = targetLane.waypoints[Math.min(1, targetLane.waypoints.length - 1)];

            const inHeading = Math.atan2(inWp2.y - inWp1.y, inWp2.x - inWp1.x);
            const outHeading = Math.atan2(outWp2.y - outWp1.y, outWp2.x - outWp1.x);
            const turnAngleDiff = Math.abs(angleDiff(outHeading, inHeading));

            // On Y-intersections, forks, and highway ramps, turns with angle > 1.0 rad (~57 deg) are strictly forbidden
            if (isFork && turnAngleDiff > 1.0) {
              weight = 0.0;
            } else if (turnAngleDiff > 2.0 && conn.turnType !== 'turnaround') {
              // Prohibit reverse hairpin acute turns across non-turnaround connections
              weight = 0.0;
            }
          }
        }

        // Village & Forest dirt trail Exclusion: Normal AI traffic cars NEVER route into village dirt tracks or secluded forest trails
        if (
          conn.targetLaneId &&
          (conn.targetLaneId.startsWith('road_village_') ||
           conn.targetLaneId.startsWith('road_forest_') ||
           conn.targetLaneId.startsWith('trail_'))
        ) {
          weight = 0.0;
        }

        return { conn, weight };
      });

      const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0);
      if (totalWeight > 0) {
        let r = Math.random() * totalWeight;
        for (const s of scored) {
          if (r < s.weight) {
            selectedConn = s.conn;
            break;
          }
          r -= s.weight;
        }
      } else {
        // If all connections lead to blocked roads, fallback to the first connection
        selectedConn = scored[0].conn;
      }
    }

    // Stop Line & Arbiter Verification before stepping onto intersection connection
    if (selectedConn.intersectionId && selectedConn.stopLineDirection) {
      const inter = world.intersections.find((i) => i.id === selectedConn.intersectionId);
      if (inter) {
        const stopLine = inter.stopLines?.find((sl) => sl.direction === selectedConn.stopLineDirection);
        let isPastLine = false;
        let distToStopLine = 0;
        if (stopLine) {
          const midX = (stopLine.x1 + stopLine.x2) / 2;
          const midY = (stopLine.y1 + stopLine.y2) / 2;
          const dx = midX - car.x;
          const dy = midY - car.y;
          distToStopLine = Math.hypot(dx, dy);
          const headingToLine = Math.atan2(dy, dx);
          // If the stop line is significantly behind the vehicle's heading, we've already crossed it (e.g. from a maneuver)
          if (distToStopLine > 8 && Math.abs(angleDiff(headingToLine, car.angle)) > Math.PI / 2) {
            isPastLine = true;
          }
        }
        
        const isLightBroken = inter.isSignalLost || world.props.some(
          (p) => p.type === 'traffic_light'&&
                 p.intersectionId === inter.id &&
                 p.direction === selectedConn.stopLineDirection &&
                 p.isBroken
        );

        // Honor Yellow-Light Dilemma Zone at connection entry so fast-moving cars at the line don't lock up abruptly
        const profile = ensureDriverProfile(car);
        const isYellowDilemmaEntry =
          inter.hasLights &&
          !isLightBroken &&
          stopLine?.lightState === 'yellow' &&
          car.speed > 28 &&
          distToStopLine < Math.max(28, car.speed * 0.9);

        const isRedOrYellow =
          inter.hasLights &&
          !isLightBroken &&
          !isYellowDilemmaEntry &&
          (stopLine?.lightState === 'red'|| stopLine?.lightState === 'yellow'|| stopLine?.lightState === 'red_yellow');
        
        // Check reservation with arbiter
        let reservationGranted = true;
        if (!isRedOrYellow) {
          const res = intersectionArbiter.requestReservation(car, selectedConn.intersectionId, selectedConn, world);
          reservationGranted = res.granted;
        }

        if (!isPastLine && (isRedOrYellow || !reservationGranted)) {
          // Do not enter yet: hold safely at stop line waypoint
          car.targetWaypointIndex = car.routeWaypoints.length - 1;
          car.targetSpeed = 0;
          car.aiState = isRedOrYellow ? 'stopping_light': 'yielding';
          if (car.speed < 4 * profile.comfortBrakeFactor) {
            car.speed = 0;
          }
          return;
        }
      }
    }

    // Track turnaround state
    if (selectedConn.turnType === 'turnaround') {
      car.justTurnedAround = true;
    } else if (car.justTurnedAround && (selectedConn.turnType === 'left'|| selectedConn.turnType === 'right')) {
      car.justTurnedAround = false;
    }

    if (selectedConn.intersectionId) {
      car.visitedIntersections.push({ id: selectedConn.intersectionId, time: now });
    }

    car.recentTurns.push(selectedConn.turnType);
    if (car.recentTurns.length > 8) car.recentTurns.shift();

    car.currentConnection = selectedConn;
    car.routeWaypoints = [...selectedConn.pathWaypoints];
    // Start tracking from waypoint 1 on connection curve, because waypoint 0 is where the car currently is
    car.targetWaypointIndex = Math.min(selectedConn.pathWaypoints.length - 1, 1);
    car.plannedTurn = selectedConn.turnType === 'turnaround'? 'left': (selectedConn.turnType as 'straight'| 'left'| 'right');
    car.inIntersection = selectedConn.turnType !== 'turnaround';
    return;
  }

  // Case C: Reacquire closest lane in world
  reacquireClosestLane(car, world);
}

// Reacquire closest valid aligned lane (Fallback safety net)
function reacquireClosestLane(car: Vehicle, world: GameWorld) {
  // 1. BOUNDARY SANCTUARY RECOVERY (x < 130, x > 3470, y < 130, y > 3470)
  if (car.x < 130) {
    const hRoad = world.roads
      .filter((r) => r.direction === 'horizontal')
      .sort((a, b) => Math.abs(a.y1 - car.y) - Math.abs(b.y1 - car.y))[0];
    if (hRoad) {
      const eLane = hRoad.lanePaths.find((lp) => Math.cos(lp.direction) > 0.5);
      if (eLane) {
        car.currentLaneId = eLane.laneId;
        car.routeWaypoints = [...eLane.waypoints];
        car.targetWaypointIndex = Math.min(eLane.waypoints.length - 1, 1);
        car.angle = eLane.direction;
        car.currentConnection = null;
        car.inIntersection = false;
        car.plannedTurn = 'straight';
        car.turnSignal = 'none';
        car.speed = Math.max(15, car.speed);
        return;
      }
    }
  }

  if (car.x > world.width - 130) {
    const hRoad = world.roads
      .filter((r) => r.direction === 'horizontal')
      .sort((a, b) => Math.abs(a.y1 - car.y) - Math.abs(b.y1 - car.y))[0];
    if (hRoad) {
      const wLane = hRoad.lanePaths.find((lp) => Math.cos(lp.direction) < -0.5);
      if (wLane) {
        car.currentLaneId = wLane.laneId;
        car.routeWaypoints = [...wLane.waypoints];
        car.targetWaypointIndex = Math.min(wLane.waypoints.length - 1, 1);
        car.angle = wLane.direction;
        car.currentConnection = null;
        car.inIntersection = false;
        car.plannedTurn = 'straight';
        car.turnSignal = 'none';
        car.speed = Math.max(15, car.speed);
        return;
      }
    }
  }

  if (car.y < 130) {
    const vRoad = world.roads
      .filter((r) => r.direction === 'vertical')
      .sort((a, b) => Math.abs(a.x1 - car.x) - Math.abs(b.x1 - car.x))[0];
    if (vRoad) {
      const sLane = vRoad.lanePaths.find((lp) => Math.sin(lp.direction) > 0.5);
      if (sLane) {
        car.currentLaneId = sLane.laneId;
        car.routeWaypoints = [...sLane.waypoints];
        car.targetWaypointIndex = Math.min(sLane.waypoints.length - 1, 1);
        car.angle = sLane.direction;
        car.currentConnection = null;
        car.inIntersection = false;
        car.plannedTurn = 'straight';
        car.turnSignal = 'none';
        car.speed = Math.max(15, car.speed);
        return;
      }
    }
  }

  if (car.y > world.height - 130) {
    const vRoad = world.roads
      .filter((r) => r.direction === 'vertical')
      .sort((a, b) => Math.abs(a.x1 - car.x) - Math.abs(b.x1 - car.x))[0];
    if (vRoad) {
      const nLane = vRoad.lanePaths.find((lp) => Math.sin(lp.direction) < -0.5);
      if (nLane) {
        car.currentLaneId = nLane.laneId;
        car.routeWaypoints = [...nLane.waypoints];
        car.targetWaypointIndex = Math.min(nLane.waypoints.length - 1, 1);
        car.angle = nLane.direction;
        car.currentConnection = null;
        car.inIntersection = false;
        car.plannedTurn = 'straight';
        car.turnSignal = 'none';
        car.speed = Math.max(15, car.speed);
        return;
      }
    }
  }

  // 2. GENERAL IN-CITY RECOVERY
  let bestCandidate: {
    lane: RoadSegment['lanePaths'][0];
    targetWpIndex: number;
    score: number;
  } | null = null;

  for (const road of world.roads) {
    if (!road.lanePaths) continue;
    for (const lane of road.lanePaths) {
      if (!lane.waypoints || lane.waypoints.length === 0) continue;

      const laneCos = Math.cos(lane.direction);
      const laneSin = Math.sin(lane.direction);

      const headingDiff = Math.abs(angleDiff(lane.direction, car.angle));

      const pStart = lane.waypoints[0];
      const pEnd = lane.waypoints[lane.waypoints.length - 1];
      const segDx = pEnd.x - pStart.x;
      const segDy = pEnd.y - pStart.y;
      const segLenSq = segDx * segDx + segDy * segDy;
      if (segLenSq === 0) continue;

      const projRatio = ((car.x - pStart.x) * segDx + (car.y - pStart.y) * segDy) / segLenSq;
      const perpDist = Math.abs((car.x - pStart.x) * segDy - (car.y - pStart.y) * segDx) / Math.sqrt(segLenSq);

      let endPenalty = 0;
      if (projRatio > 1.05) endPenalty = (projRatio - 1.05) * 400;
      else if (projRatio < -0.2) endPenalty = (-0.2 - projRatio) * 100;

      // Heavy penalty for perpendicular or opposing lanes to prevent turning onto cross-streets
      const anglePenalty = headingDiff > 0.75 ? 8000 + headingDiff * 500 : headingDiff * 150;
      let totalScore = perpDist + anglePenalty + endPenalty;

      if (!bestCandidate || totalScore < bestCandidate.score) {
        let wpIdx = 0;
        for (let i = 0; i < lane.waypoints.length; i++) {
          const wp = lane.waypoints[i];
          const wpAhead = (wp.x - car.x) * laneCos + (wp.y - car.y) * laneSin;
          if (wpAhead > 5) {
            wpIdx = i;
            break;
          }
          wpIdx = i;
        }

        // If the car is past the last waypoint, heavily penalize this lane
        // so it prefers to pick the next road segment instead.
        if (wpIdx === lane.waypoints.length - 1) {
          const wp = lane.waypoints[wpIdx];
          const wpAhead = (wp.x - car.x) * laneCos + (wp.y - car.y) * laneSin;
          if (wpAhead <= 0) {
            totalScore += 2000;
          }
        }

        if (!bestCandidate || totalScore < bestCandidate.score) {
          bestCandidate = {
            lane,
            targetWpIndex: wpIdx,
            score: totalScore
          };
        }
      }
    }
  }

  if (bestCandidate) {
    const lane = bestCandidate.lane;
    car.currentLaneId = lane.laneId;
    car.routeWaypoints = [...lane.waypoints];
    car.targetWaypointIndex = bestCandidate.targetWpIndex;
    car.currentConnection = null;
    car.inIntersection = false;
    car.plannedTurn = 'straight';
    car.turnSignal = 'none';

    // Do NOT abruptly snap car.angle by 90 degrees!
    // Pure Pursuit will smoothly align the vehicle's wheels and heading towards the new waypoint.
    const hDiff = Math.abs(angleDiff(lane.direction, car.angle));
    if (hDiff > 1.5 && Math.abs(car.speed) < 2) {
      car.angle = lane.direction;
    }
  }
}

// Emergency Gridlock Flush Utility (called from Debug Console)
export function flushCityGridlocks(world: GameWorld) {
  let flushed = 0;
  for (const car of world.vehicles) {
    if (car.isPlayerControlled) continue;
    if (car.speed < 5 || car.stuckTimer > 0.5) {
      car.stuckTimer = 0;
      car.speed = 45;
      car.targetSpeed = 80;
      car.aiState = 'driving';
      flushed++;
    }
  }
  trafficDiagnostics.log('deadlock', `Manual Flush: Unblocked ${flushed} vehicles across the city`);
}

// Respawn Stalled Traffic to outer lanes
export function respawnStalledVehicles(world: GameWorld, playerPos?: Vector2D) {
  let respawned = 0;
  const pPos = playerPos || { x: 4400, y: 2800 };

  for (const car of world.vehicles) {
    if (car.isPlayerControlled || (car as any).isRemoteControlled || car.isParked) continue;
    // Genuinely stuck for more than 6.0 seconds
    if (car.stuckTimer > 6.0) {
      if (respawnCarNearPlayer(car, pPos, world)) {
        respawned++;
      } else {
        car.stuckTimer = 0;
        car.speed = 35;
        car.aiState = 'driving';
      }
    }
  }
  if (respawned > 0) {
    trafficDiagnostics.log('info', `Respawned ${respawned} stalled vehicles to open roads`);
  }
}

// Helper to compute crosswalk curb endpoints
function getCrosswalkEndpoints(
  inter: Intersection,
  cw: Intersection['crosswalks'][0]
): { p1: Vector2D; p2: Vector2D } {
  const halfW = inter.width / 2;
  const halfH = inter.height / 2;
  const cwWidth = 22;

  if (cw.direction === 'north') {
    const y = inter.y - halfH - cwWidth / 2;
    return {
      p1: { x: inter.x - halfW - 14, y }, // West curb
      p2: { x: inter.x + halfW + 14, y }  // East curb
    };
  } else if (cw.direction === 'south') {
    const y = inter.y + halfH + cwWidth / 2;
    return {
      p1: { x: inter.x - halfW - 14, y }, // West curb
      p2: { x: inter.x + halfW + 14, y }  // East curb
    };
  } else if (cw.direction === 'west') {
    const x = inter.x - halfW - cwWidth / 2;
    return {
      p1: { x, y: inter.y - halfH - 14 }, // North curb
      p2: { x, y: inter.y + halfH + 14 }  // South curb
    };
  } else {
    // East
    const x = inter.x + halfW + cwWidth / 2;
    return {
      p1: { x, y: inter.y - halfH - 14 }, // North curb
      p2: { x, y: inter.y + halfH + 14 }  // South curb
    };
  }
}

// Dynamically create a new pedestrian on a sidewalk path near the player (around view edge)
export function createNewPedestrianNearPlayer(targetPos: Vector2D, world: GameWorld): Pedestrian | null {
  if (!world.pedestrianPaths || world.pedestrianPaths.length === 0) return null;

  // If player is in the quiet rural village or wilderness, no urban pedestrians
  if (targetPos.x >= 10500 && targetPos.x <= 12600 && targetPos.y >= 2100 && targetPos.y <= 4100) {
    return null;
  }
  if (targetPos.x < 3500 && targetPos.y < 3500) {
    return null; // dense forest
  }

  interface PathCandidate {
    path: PedestrianPath;
    wpIdx: number;
    wp1: Vector2D;
    wp2: Vector2D;
    spawnX: number;
    spawnY: number;
  }

  const candidates: PathCandidate[] = [];

  for (const path of world.pedestrianPaths) {
    if (!path.waypoints || path.waypoints.length < 2) continue;
    for (let i = 0; i < path.waypoints.length - 1; i++) {
      const wp1 = path.waypoints[i];
      const wp2 = path.waypoints[i + 1];
      const midX = (wp1.x + wp2.x) * 0.5;
      const midY = (wp1.y + wp2.y) * 0.5;

      // Keep off gas station inner lot
      if (midX >= 4920 && midX <= 5480 && midY >= 4890 && midY <= 5490) continue;

      const d = Math.hypot(midX - targetPos.x, midY - targetPos.y);
      if (d >= 400 && d <= 950) {
        const prog = 0.2 + Math.random() * 0.6;
        candidates.push({
          path,
          wpIdx: i,
          wp1,
          wp2,
          spawnX: wp1.x + (wp2.x - wp1.x) * prog,
          spawnY: wp1.y + (wp2.y - wp1.y) * prog
        });
      }
    }
  }

  if (candidates.length === 0) return null;

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const dir = Math.random() < 0.5 ? 1 : -1;
  const angle = dir === 1
    ? Math.atan2(chosen.wp2.y - chosen.wp1.y, chosen.wp2.x - chosen.wp1.x)
    : Math.atan2(chosen.wp1.y - chosen.wp2.y, chosen.wp1.x - chosen.wp2.x);

  const app = generateRandomPedestrianAppearance();
  const isCyclist = Math.random() < 0.08;
  const isScooter = !isCyclist && Math.random() < 0.06;
  const hasDog = !isCyclist && !isScooter && Math.random() < 0.07;
  const isChild = app.ageGroup === 'child';
  const isElderly = app.ageGroup === 'elderly';
  const isJanitor = !isCyclist && !isScooter && !isChild && !isElderly && Math.random() < 0.05;

  const baseSpeed = isCyclist ? 110 + Math.random() * 20 : (isScooter ? 90 : (isChild ? 35 : (isElderly ? 25 : (isJanitor ? 20 : 40 + Math.random() * 10))));

  const ped: Pedestrian = {
    id: 'ped_live_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
    x: chosen.spawnX,
    y: chosen.spawnY,
    vx: Math.cos(angle) * baseSpeed,
    vy: Math.sin(angle) * baseSpeed,
    angle,
    speed: baseSpeed,
    targetSpeed: baseSpeed,
    skinColor: app.skinColor,
    shirtColor: isJanitor ? '#ca8a04' : app.shirtColor,
    pantsColor: isJanitor ? '#1e3a8a' : app.pantsColor,
    hairColor: app.hairColor,
    walkCycle: Math.random() * Math.PI * 2,
    targetPathId: chosen.path.id,
    targetWaypointIndex: dir === 1 ? chosen.wpIdx + 1 : chosen.wpIdx,
    routeWaypoints: chosen.path.waypoints,
    pathDirection: dir,
    isCrossingRoad: false,
    waitingAtCurb: false,
    crosswalkWaitTimer: 0,
    crosswalkCooldownTimer: 8,
    branchCooldownTimer: 8,
    state: 'walking',
    panicTimer: 0,
    behaviorTimer: 0,
    alertBubbleText: null,
    alertBubbleTimer: 0,
    isCyclist,
    isScooter,
    hasDog,
    isChild,
    hasBackpack: Math.random() < 0.3,
    backpackColor: app.shirtColor,
    isJanitor,
    hasBroom: isJanitor
  };

  return ped;
}

// Respawn / recycle a pedestrian to a sidewalk path near the player
function respawnPedestrianNearPlayer(ped: Pedestrian, targetPos: Vector2D, world: GameWorld): boolean {
  const newPed = createNewPedestrianNearPlayer(targetPos, world);
  if (newPed) {
    const id = ped.id;
    Object.assign(ped, newPed);
    ped.id = id;
    return true;
  }
  return false;
}

// Pedestrian AI & Navigation (Sidewalks, Crosswalks & Traffic Light Compliance)
export function updatePedestrians(
  world: GameWorld,
  dt: number,
  vehGrid?: SpatialGrid<Vehicle>,
  pedGrid?: SpatialGrid<Pedestrian>,
  bldGrid?: SpatialGrid<Building>,
  playerPos?: Vector2D,
  propGrid?: SpatialGrid<StreetProp>,
  player?: any
) {
  // Note: freeroam pedestrians are gated by the master switch in App.tsx (aiTrafficOnRef), not here.
  const isRaining = world.weather === 'rain'|| world.weather === 'storm';
  const UMBRELLA_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const playerCar = world.vehicles.find((v) => v.isPlayerControlled);
  const targetPos: Vector2D = playerPos || (playerCar ? { x: playerCar.x, y: playerCar.y } : { x: 4400, y: 2800 });

  const pedsToDespawn = new Set<string>();

  // Maintain active pedestrian density dynamically around the player in urban areas
  const isRuralOrWilderness = (targetPos.x >= 10500 && targetPos.x <= 12600 && targetPos.y >= 2100 && targetPos.y <= 4100) ||
                             (targetPos.x < 3500 && targetPos.y < 3500);
  const targetNearbyPeds = isRuralOrWilderness ? 0 : Math.min(16, performanceConfig.maxActivePedestrians);

  let nearbyActivePedCount = 0;
  for (const ped of world.pedestrians) {
    if (ped.x > 0 && ped.y > 0 && Math.hypot(ped.x - targetPos.x, ped.y - targetPos.y) < 1100) {
      nearbyActivePedCount++;
    }
  }

  if (nearbyActivePedCount < targetNearbyPeds) {
    const toSpawn = Math.min(2, targetNearbyPeds - nearbyActivePedCount);
    for (let s = 0; s < toSpawn; s++) {
      const newPed = createNewPedestrianNearPlayer(targetPos, world);
      if (newPed) {
        world.pedestrians.push(newPed);
      }
    }
  }

  // Pre-build group cache to avoid O(N^2) filtering inside the main loop
  const groupsMap = new Map<string, Pedestrian[]>();
  for (const p of world.pedestrians) {
    if (p.groupId) {
      let list = groupsMap.get(p.groupId);
      if (!list) {
        list = [];
        groupsMap.set(p.groupId, list);
      }
      list.push(p);
    }
  }

  let updatedPedCount = 0;
  let hasAnyWorldFire = false;
  for (let i = 0; i < world.vehicles.length; i++) {
    const d = world.vehicles[i].damage;
    if (d && !d.isFullyBurnt && (d.engineFire || d.fuelTankFire || d.cabinFire || d.underHoodSmolder || (d.fireIntensity || 0) > 0)) {
      hasAnyWorldFire = true;
      break;
    }
  }
  if (!hasAnyWorldFire && world.stains) {
    for (let i = 0; i < world.stains.length; i++) {
      const st = world.stains[i];
      if (st.onFire && (st.fireIntensity || 0) > 0) {
        hasAnyWorldFire = true;
        break;
      }
    }
  }

  for (const ped of world.pedestrians) {
    // Despawn invalid coordinates or out-of-bounds entities immediately
    if (!Number.isFinite(ped.x) || !Number.isFinite(ped.y) || ped.x < 0 || ped.y < 0 || ped.x > world.width || ped.y > world.height) {
      pedsToDespawn.add(ped.id);
      continue;
    }

    // Keep AI pedestrians off the private gas station fueling lot
    if (ped.x >= 4920 && ped.x <= 5480 && ped.y >= 4890 && ped.y <= 5490 && !(ped as any).isPlayerControlled && !(ped as any).isFirefighter && !(ped as any).isTaxiPassenger) {
      pedsToDespawn.add(ped.id);
      continue;
    }

    // CULLING: Despawn pedestrians outside the player's active field of view!
    const distToPlayer = Math.hypot(ped.x - targetPos.x, ped.y - targetPos.y);
    if (distToPlayer > 1300 && !(ped as any).isFirefighter && !(ped as any).isPlayerControlled && !(ped as any).isTaxiPassenger) {
      pedsToDespawn.add(ped.id);
      continue;
    }

    // --- SPECIAL FIREFIGHTER BEHAVIOR ---
    if ((ped as any).isFirefighter) {
      const parentVehicleId = (ped as any).parentVehicleId;
      const parentCar = world.vehicles.find(v => v.id === parentVehicleId);
      const ffState = (ped as any).firefighterState;

      if (!parentCar) {
        // Despawn safely
        ped.x = -10000;
        ped.y = -10000;
        (ped as any).firefighterState = 'completed';
        continue;
      }

      if (ffState === 'going_to_truck') {
        // Walk to the rear of the fire engine to grab a hose!
        const rearX = parentCar.x - Math.cos(parentCar.angle) * (parentCar.length * 0.45);
        const rearY = parentCar.y - Math.sin(parentCar.angle) * (parentCar.length * 0.45);

        const dx = rearX - ped.x;
        const dy = rearY - ped.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 15) {
          ped.angle = Math.atan2(dy, dx);
          ped.targetSpeed = 55;
          ped.speed = ped.targetSpeed;
          ped.walkCycle += dt * 7.5;
          ped.vx = Math.cos(ped.angle) * ped.speed;
          ped.vy = Math.sin(ped.angle) * ped.speed;
          ped.x += ped.vx * dt;
          ped.y += ped.vy * dt;
        } else {
          (ped as any).firefighterState = 'taking_hose';
          ped.alertBubbleText = 'Взял рукав!';
          ped.alertBubbleTimer = 2.0;
          ped.handheldProp = 'extinguisher'; // Use visual extinguisher pose
          ped.behaviorTimer = 0;
        }
      } 
      else if (ffState === 'taking_hose') {
        ped.targetSpeed = 0;
        ped.speed = 0;
        ped.vx = 0;
        ped.vy = 0;
        ped.behaviorTimer = (ped.behaviorTimer ?? 0) + dt;
        if (ped.behaviorTimer > 1.5) {
          (ped as any).firefighterState = 'going_to_fire';
          ped.behaviorTimer = 0;
        }
      } 
      else if (ffState === 'going_to_fire') {
        let targetX = (ped as any).targetFireX;
        let targetY = (ped as any).targetFireY;
        let fireExists = false;

        let targetCar = world.vehicles.find(v => {
          if (!v.damage || v.damage.isFullyBurnt) return false;
          return v.damage.engineFire || v.damage.fuelTankFire || v.damage.cabinFire || v.damage.underHoodSmolder || (v.damage.fireIntensity || 0) > 0;
        });

        let targetStain = world.stains?.find(s => s.onFire && (s.fireIntensity || 0) > 0);

        if (targetCar) {
          targetX = targetCar.x;
          targetY = targetCar.y;
          fireExists = true;
        } else if (targetStain) {
          targetX = targetStain.x;
          targetY = targetStain.y;
          fireExists = true;
        }

        if (!fireExists) {
          ped.alertBubbleText = 'Пожар ликвидирован!';
          ped.alertBubbleTimer = 2.5;
          (ped as any).firefighterState = 'returning_to_truck';
          continue;
        }

        const dx = targetX - ped.x;
        const dy = targetY - ped.y;
        const dist = Math.hypot(dx, dy);

        ped.angle = Math.atan2(dy, dx);

        if (dist > 75) {
          ped.targetSpeed = 50;
          ped.speed = ped.targetSpeed;
          ped.walkCycle += dt * 7.5;
          ped.vx = Math.cos(ped.angle) * ped.speed;
          ped.vy = Math.sin(ped.angle) * ped.speed;
          ped.x += ped.vx * dt;
          ped.y += ped.vy * dt;
        } else {
          (ped as any).firefighterState = 'extinguishing';
        }
      } 
      else if (ffState === 'extinguishing') {
        let targetX = (ped as any).targetFireX;
        let targetY = (ped as any).targetFireY;
        let fireExists = false;

        let targetCar = world.vehicles.find(v => {
          if (!v.damage || v.damage.isFullyBurnt) return false;
          return v.damage.engineFire || v.damage.fuelTankFire || v.damage.cabinFire || v.damage.underHoodSmolder || (v.damage.fireIntensity || 0) > 0;
        });

        let targetStain = world.stains?.find(s => s.onFire && (s.fireIntensity || 0) > 0);

        if (targetCar) {
          targetX = targetCar.x;
          targetY = targetCar.y;
          fireExists = true;
        } else if (targetStain) {
          targetX = targetStain.x;
          targetY = targetStain.y;
          fireExists = true;
        }

        if (!fireExists) {
          ped.alertBubbleText = 'Пожар потушен!';
          ped.alertBubbleTimer = 2.0;
          (ped as any).firefighterState = 'returning_to_truck';
          continue;
        }

        const dx = targetX - ped.x;
        const dy = targetY - ped.y;
        const dist = Math.hypot(dx, dy);

        ped.angle = Math.atan2(dy, dx);

        if (dist > 85) {
          ped.targetSpeed = 35;
          ped.speed = ped.targetSpeed;
          ped.vx = Math.cos(ped.angle) * ped.speed;
          ped.vy = Math.sin(ped.angle) * ped.speed;
          ped.x += ped.vx * dt;
          ped.y += ped.vy * dt;
          ped.walkCycle += dt * 5;
        } else if (dist < 50) {
          ped.targetSpeed = -25;
          ped.speed = ped.targetSpeed;
          ped.vx = Math.cos(ped.angle) * ped.speed;
          ped.vy = Math.sin(ped.angle) * ped.speed;
          ped.x += ped.vx * dt;
          ped.y += ped.vy * dt;
          ped.walkCycle += dt * 4;
        } else {
          ped.targetSpeed = 0;
          ped.speed = 0;
          ped.vx = 0;
          ped.vy = 0;
        }

        // Spray water-foam particles (водно-пенная смесь)
        if (Math.random() < 24.0 * dt) {
          for (let p = 0; p < 2; p++) {
            const spreadAngle = ped.angle + (Math.random() * 0.28 - 0.14);
            const pSpeed = 165 + Math.random() * 115;
            world.particles.push({
              x: ped.x + Math.cos(ped.angle) * 12 + (Math.random() * 5 - 2.5),
              y: ped.y + Math.sin(ped.angle) * 12 + (Math.random() * 5 - 2.5),
              vx: Math.cos(spreadAngle) * pSpeed,
              vy: Math.sin(spreadAngle) * pSpeed,
              radius: 2.8 + Math.random() * 3.2,
              color: Math.random() < 0.65 ? '#f8fafc' : '#e0f2fe',
              alpha: 0.88,
              initialAlpha: 0.88,
              life: 0,
              maxLife: 0.36 + Math.random() * 0.22,
              type: 'water_spray'});
          }
        }

        // 3.5x-4x more powerful extinguishing rate!
        const foamPower = 4.0;
        if (targetCar && targetCar.damage) {
          targetCar.damage.fireTimer = Math.max(0, (targetCar.damage.fireTimer || 0) - dt * 35.0 * foamPower);
          targetCar.damage.fireIntensity = Math.max(0, (targetCar.damage.fireIntensity || 1.0) - 0.75 * dt * foamPower);
          targetCar.damage.fireProgress = Math.max(0, (targetCar.damage.fireProgress || 1.0) - 0.60 * dt * foamPower);
          if ((targetCar.damage.fireIntensity <= 0.05 && targetCar.damage.fireProgress <= 0.05) || (targetCar.damage.fireTimer || 0) <= 2.0) {
            targetCar.damage.engineFire = false;
            targetCar.damage.fuelTankFire = false;
            targetCar.damage.cabinFire = false;
            targetCar.damage.underHoodSmolder = false;
            targetCar.damage.engineSmoking = false;
            targetCar.damage.fireIntensity = 0;
            targetCar.damage.fireProgress = 0;
            targetCar.damage.fireTimer = 0;
            targetCar.damage.groundPuddleIgnited = false;
          }
        }
        if (targetStain) {
          targetStain.fireIntensity = Math.max(0, (targetStain.fireIntensity || 1.0) - 1.2 * dt * foamPower);
          if (targetStain.fireIntensity <= 0.05) {
            targetStain.onFire = false;
            targetStain.fireIntensity = 0;
          }
        }
      }
      else if (ffState === 'returning_to_truck') {
        const rearX = parentCar.x - Math.cos(parentCar.angle) * (parentCar.length * 0.45);
        const rearY = parentCar.y - Math.sin(parentCar.angle) * (parentCar.length * 0.45);

        const dx = rearX - ped.x;
        const dy = rearY - ped.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 15) {
          ped.angle = Math.atan2(dy, dx);
          ped.targetSpeed = 45;
          ped.speed = ped.targetSpeed;
          ped.walkCycle += dt * 6.5;
          ped.vx = Math.cos(ped.angle) * ped.speed;
          ped.vy = Math.sin(ped.angle) * ped.speed;
          ped.x += ped.vx * dt;
          ped.y += ped.vy * dt;
        } else {
          ped.alertBubbleText = 'Работа закончена!';
          ped.alertBubbleTimer = 2.0;
          (ped as any).firefighterState = 'completed';
          
          pedsToDespawn.add(ped.id);
          ped.x = -10000;
          ped.y = -10000;
          ped.vx = 0;
          ped.vy = 0;

          const otherFFs = world.pedestrians.filter(p => (p as any).isFirefighter && (p as any).parentVehicleId === parentCar.id && (p as any).firefighterState !== 'completed');
          if (otherFFs.length === 0) {
            (parentCar as any).isFireDispatch = false;
            parentCar.isParked = false;
            parentCar.sirenOn = false;
            parentCar.turnSignal = 'none';
            parentCar.aiState = 'driving';
            parentCar.targetSpeed = 40;
            reacquireClosestLane(parentCar, world);
          }
        }
      }

      ped.x = Math.max(15, Math.min(world.width - 15, ped.x));
      ped.y = Math.max(15, Math.min(world.height - 15, ped.y));
      continue;
    }

    // --- PEDESTRIAN FIRE DETECTION & CALL ---
    if (hasAnyWorldFire && !ped.isInsideBuilding && !(ped as any).isFirefighter && ped.state !== 'extinguishing_fire'&& ped.x > 0) {
      let nearestFirePos: Vector2D | null = null;
      let targetCar: Vehicle | null = null;
      let targetStain: any = null;

      const nearbyVehs = vehGrid ? vehGrid.queryRadius(ped.x, ped.y, 300) : world.vehicles;
      for (const otherCar of nearbyVehs) {
        if (otherCar.damage && !otherCar.damage.isFullyBurnt) {
          const hasFire = otherCar.damage.engineFire || otherCar.damage.fuelTankFire || otherCar.damage.cabinFire || otherCar.damage.underHoodSmolder || (otherCar.damage.fireIntensity || 0) > 0;
          if (hasFire) {
            nearestFirePos = { x: otherCar.x, y: otherCar.y };
            targetCar = otherCar;
            break;
          }
        }
      }

      if (!nearestFirePos && world.stains) {
        const nearbyStains = world.stains.filter(s => Math.hypot(s.x - ped.x, s.y - ped.y) < 300);
        for (const st of nearbyStains) {
          if (st.onFire && (st.fireIntensity || 0) > 0) {
            nearestFirePos = { x: st.x, y: st.y };
            targetStain = st;
            break;
          }
        }
      }

      if (nearestFirePos) {
        const fireSource: any = targetCar || targetStain;
        if (fireSource && !isFireEngineDispatchedFor(world, nearestFirePos.x, nearestFirePos.y)) {
          if (Math.random() < 0.90) {
            const spawned = dispatchFireEngine(world, targetPos, nearestFirePos.x, nearestFirePos.y, player);
            if (spawned) {
              fireSource.fireCallMade = true;
              ped.alertBubbleText = 'Вызываю пожарных!';
              ped.alertBubbleTimer = 3.5;
            } else {
              ped.state = 'panicking';
              ped.panicTimer = 2.0;
              ped.alertBubbleText = 'Спасите! Пожар!';
              ped.alertBubbleTimer = 2.5;
            }
          } else {
            ped.state = 'panicking';
            ped.panicTimer = 3.0;
            ped.alertBubbleText = 'ПОЖАР!!!';
            ped.alertBubbleTimer = 2.5;
          }
        } else if (Math.random() < 0.006) {
          // Fire engine already on its way - scream in natural intervals!
          ped.state = 'panicking';
          ped.panicTimer = 2.0;
          if (!ped.alertBubbleText || ped.alertBubbleTimer <= 0) {
            const screams = ['Спасите!', 'Горит!', 'Помогите!'];
            ped.alertBubbleText = screams[Math.floor(Math.random() * screams.length)];
            ped.alertBubbleTimer = 2.0;
          }
        }
      }
    }

    updatedPedCount++;
    if (updatedPedCount > performanceConfig.maxActivePedestrians && !(ped as any).isFirefighter && !(ped as any).isPlayerControlled) {
      pedsToDespawn.add(ped.id);
      continue;
    }

    // A1. Handle Extinguishing Fire state
    if (ped.state === 'extinguishing_fire') {
      let targetX = ped.x;
      let targetY = ped.y;
      let fireExists = false;

      const targetCarId = (ped as any).targetFireCarId;
      const targetStainId = (ped as any).targetFireStainId;

      let targetCar = targetCarId ? world.vehicles.find((v) => v.id === targetCarId) : null;
      let targetStain = targetStainId ? world.stains?.find((s) => (s as any).id === targetStainId || Math.hypot(s.x - ped.x, s.y - ped.y) < 180) : null;

      if (targetCar && targetCar.damage && !targetCar.damage.isFullyBurnt) {
        const hasFire = targetCar.damage.engineFire || targetCar.damage.fuelTankFire || targetCar.damage.cabinFire || targetCar.damage.underHoodSmolder || (targetCar.damage.fireIntensity || 0) > 0;
        if (hasFire) {
          targetX = targetCar.x;
          targetY = targetCar.y;
          fireExists = true;
        }
      } else if (targetStain && targetStain.onFire && (targetStain.fireIntensity || 0) > 0) {
        targetX = targetStain.x;
        targetY = targetStain.y;
        fireExists = true;
      } else {
        for (const v of world.vehicles) {
          if (v.damage && !v.damage.isFullyBurnt && (v.damage.engineFire || v.damage.fuelTankFire || v.damage.cabinFire || v.damage.underHoodSmolder || (v.damage.fireIntensity || 0) > 0)) {
            targetCar = v;
            targetX = v.x;
            targetY = v.y;
            fireExists = true;
            break;
          }
        }
        if (!fireExists && world.stains) {
          for (const s of world.stains) {
            if (s.onFire && (s.fireIntensity || 0) > 0) {
              targetStain = s;
              targetX = s.x;
              targetY = s.y;
              fireExists = true;
              break;
            }
          }
        }
      }

      if (!fireExists || (ped.extinguisherCharges !== undefined && ped.extinguisherCharges <= 0)) {
        ped.state = 'walking';
        ped.handheldProp = null;
        ped.alertBubbleText = ped.extinguisherCharges !== undefined && ped.extinguisherCharges <= 0 ? 'Пена кончилась!': 'Пожар потушен!';
        ped.alertBubbleTimer = 2.0;
        continue;
      }

      const dx = targetX - ped.x;
      const dy = targetY - ped.y;
      const dist = Math.hypot(dx, dy);
      ped.angle = Math.atan2(dy, dx);

      if (dist > 70) {
        ped.targetSpeed = 65;
        ped.walkCycle += dt * 9;
        ped.speed = ped.targetSpeed;
        ped.vx = Math.cos(ped.angle) * ped.speed;
        ped.vy = Math.sin(ped.angle) * ped.speed;
        ped.x += ped.vx * dt;
        ped.y += ped.vy * dt;
      } else {
        ped.targetSpeed = 0;
        ped.speed = 0;
        ped.vx = 0;
        ped.vy = 0;

        if (ped.extinguisherCharges !== undefined) {
          ped.extinguisherCharges = Math.max(0, ped.extinguisherCharges - 18 * dt);
        }

        if (Math.random() < 16.0 * dt) {
          world.particles.push({
            x: ped.x + Math.cos(ped.angle) * 12 + (Math.random() * 6 - 3),
            y: ped.y + Math.sin(ped.angle) * 12 + (Math.random() * 6 - 3),
            vx: Math.cos(ped.angle) * (75 + Math.random() * 45),
            vy: Math.sin(ped.angle) * (75 + Math.random() * 45),
            radius: 2.6 + Math.random() * 2.8,
            color: '#f8fafc',
            alpha: 0.86,
            initialAlpha: 0.86,
            life: 0,
            maxLife: 0.28 + Math.random() * 0.18,
            type: 'water_spray'});
        }

        if (targetCar && targetCar.damage) {
          targetCar.damage.fireTimer = Math.max(0, (targetCar.damage.fireTimer || 0) - dt * 35.0);
          targetCar.damage.fireIntensity = Math.max(0, (targetCar.damage.fireIntensity || 1.0) - 0.75 * dt);
          targetCar.damage.fireProgress = Math.max(0, (targetCar.damage.fireProgress || 1.0) - 0.60 * dt);
          if ((targetCar.damage.fireIntensity <= 0.05 && targetCar.damage.fireProgress <= 0.05) || (targetCar.damage.fireTimer || 0) <= 2.0) {
            targetCar.damage.engineFire = false;
            targetCar.damage.fuelTankFire = false;
            targetCar.damage.cabinFire = false;
            targetCar.damage.underHoodSmolder = false;
            targetCar.damage.engineSmoking = false;
            targetCar.damage.fireIntensity = 0;
            targetCar.damage.fireProgress = 0;
            targetCar.damage.fireTimer = 0;
            targetCar.damage.groundPuddleIgnited = false;
          }
        }
        if (targetStain) {
          targetStain.fireIntensity = Math.max(0, (targetStain.fireIntensity || 1.0) - 1.2 * dt);
          if (targetStain.fireIntensity <= 0.05) {
            targetStain.onFire = false;
            targetStain.fireIntensity = 0;
          }
        }
      }

      ped.x = Math.max(15, Math.min(world.width - 15, ped.x));
      ped.y = Math.max(15, Math.min(world.height - 15, ped.y));
      continue;
    }

    // A. Handle Inside Building state
    if (ped.isInsideBuilding) {
      ped.insideBuildingTimer = (ped.insideBuildingTimer ?? 0) - dt;
      if (ped.insideBuildingTimer <= 0) {
        // Exit building!
        ped.isInsideBuilding = false;
        ped.state = 'exiting_building';
        ped.exitingBuildingTimer = 1.5; // Walk outward for 1.5 seconds

        const bld = world.buildings.find((b) => b.id === ped.insideBuildingId);
        if (bld) {
          const entPos = getBuildingEntrancePos(bld);
          ped.x = entPos.x;
          ped.y = entPos.y;

          let outX = 0, outY = 0, exitAngle = 0;
          if (bld.entranceSide === 'north') { outY = -12; exitAngle = -Math.PI / 2; }
          else if (bld.entranceSide === 'south') { outY = 12; exitAngle = Math.PI / 2; }
          else if (bld.entranceSide === 'west') { outX = -12; exitAngle = Math.PI; }
          else if (bld.entranceSide === 'east') { outX = 12; exitAngle = 0; }
          ped.x += outX;
          ped.y += outY;
          ped.angle = exitAngle;

          const exitTexts = [
            "Ah, fresh air!",
            "What a busy day!",
            "Done with work!",
            "Time for a walk!",
            "Heading back home!",
            "That was nice!",
            "Back on the street!"];
          ped.alertBubbleText = exitTexts[Math.floor(Math.random() * exitTexts.length)];
          ped.alertBubbleTimer = 1.5;
        } else {
          ped.state = 'walking';
        }
      }
      continue; // Skip normal simulation while inside
    }

    // B. Handle Exiting Building transition state
    if (ped.state === 'exiting_building') {
      ped.exitingBuildingTimer = (ped.exitingBuildingTimer ?? 0) - dt;
      ped.walkCycle += dt * 7;
      ped.targetSpeed = 35;
      
      // Keep walking in exit direction
      ped.speed = ped.targetSpeed;
      ped.vx = Math.cos(ped.angle) * ped.speed;
      ped.vy = Math.sin(ped.angle) * ped.speed;
      ped.x += ped.vx * dt;
      ped.y += ped.vy * dt;

      if (ped.exitingBuildingTimer <= 0) {
        ped.state = 'walking';
        ped.exitingBuildingTimer = undefined;

        // Find nearest sidewalk waypoint to join
        let bestPath = world.pedestrianPaths[0];
        let bestWpIndex = 0;
        let minD = 99999;
        for (const path of world.pedestrianPaths) {
          path.waypoints.forEach((wp, idx) => {
            const d = Math.hypot(ped.x - wp.x, ped.y - wp.y);
            if (d < minD) {
              minD = d;
              bestPath = path;
              bestWpIndex = idx;
            }
          });
        }
        if (bestPath) {
          ped.targetPathId = bestPath.id;
          ped.routeWaypoints = bestPath.waypoints;
          ped.targetWaypointIndex = (bestWpIndex + 1) % bestPath.waypoints.length;
        }
      }
      
      // Keep bounded within world
      ped.x = Math.max(15, Math.min(world.width - 15, ped.x));
      ped.y = Math.max(15, Math.min(world.height - 15, ped.y));
      continue; // Skip normal routing
    }

    // C. Handle Entering Building state (walking towards the doors)
    if (ped.state === 'entering_building') {
      const bld = world.buildings.find((b) => b.id === ped.insideBuildingId);
      if (bld) {
        const entPos = getBuildingEntrancePos(bld);
        const dx = entPos.x - ped.x;
        const dy = entPos.y - ped.y;
        const dist = Math.hypot(dx, dy);

        ped.angle = Math.atan2(dy, dx);
        ped.walkCycle += dt * 7;

        if (dist < 12) {
          // Reached doors! Hold at door, show bubble, then disappear
          ped.targetSpeed = 0;
          ped.enteringBuildingTimer = (ped.enteringBuildingTimer ?? 0.8) - dt;
          
          if (!ped.alertBubbleText) {
            const enterTexts = [
              "Going inside!",
              "Time for work!",
              "Let's go shopping!",
              "Entering home!",
              "Getting warm inside!",
              "Meeting starts soon!",
              "Need a coffee!"];
            ped.alertBubbleText = enterTexts[Math.floor(Math.random() * enterTexts.length)];
            ped.alertBubbleTimer = 0.8;
          }

          if (ped.enteringBuildingTimer <= 0) {
            ped.isInsideBuilding = true;
            ped.insideBuildingTimer = 8 + Math.random() * 20; // Stay inside 8-28 seconds
            ped.enteringBuildingTimer = undefined;
          }
        } else {
          ped.targetSpeed = 38;
          ped.speed = ped.targetSpeed;
          ped.vx = Math.cos(ped.angle) * ped.speed;
          ped.vy = Math.sin(ped.angle) * ped.speed;
          ped.x += ped.vx * dt;
          ped.y += ped.vy * dt;
        }
      } else {
        ped.state = 'walking';
      }
      
      ped.x = Math.max(15, Math.min(world.width - 15, ped.x));
      ped.y = Math.max(15, Math.min(world.height - 15, ped.y));
      continue; // Skip normal routing
    }

    // D. Occasional decision to enter a building!
    if (ped.state === 'walking'&& !ped.isCrossingRoad) {
      if (Math.random() < 0.002) {
        // Query nearby buildings with entrances
        const candidateBlds = bldGrid ? bldGrid.queryRadius(ped.x, ped.y, 120) : world.buildings;
        const nearbyBlds = candidateBlds.filter((b) => {
          if (b.type === 'park_monument'|| !b.entranceSide) return false;
          const dist = Math.hypot(b.x + b.width / 2 - ped.x, b.y + b.height / 2 - ped.y);
          return dist < 120; // must be nearby
        });

        if (nearbyBlds.length > 0) {
          const chosenBld = nearbyBlds[Math.floor(Math.random() * nearbyBlds.length)];
          ped.state = 'entering_building';
          ped.insideBuildingId = chosenBld.id;
          ped.enteringBuildingTimer = 0.8;
          ped.targetSpeed = 38;
        }
      }
    }

    if (isRaining) {
      ped.hasUmbrella = true;
      if (!ped.umbrellaColor) {
        ped.umbrellaColor = UMBRELLA_COLORS[Math.floor(Math.random() * UMBRELLA_COLORS.length)];
      }
    } else {
      ped.hasUmbrella = false;
    }
    ped.walkCycle += dt * (ped.state === 'panicking'? 14 : ped.state === 'waiting_light'? 0 : 7);

    if (ped.crosswalkCooldownTimer > 0) {
      ped.crosswalkCooldownTimer -= dt;
    }

    if (ped.alertBubbleTimer > 0) {
      ped.alertBubbleTimer -= dt;
      if (ped.alertBubbleTimer <= 0) ped.alertBubbleText = null;
    }

    // 0. Occasional decision to perform idle behaviors (Checking phone, looking at window)
    if (ped.state === 'walking'&& !ped.isCrossingRoad && (ped.behaviorTimer || 0) <= 0) {
      const roll = Math.random();
      if (roll < 0.001) {
        ped.state = 'idle_phone';
        ped.behaviorTimer = 3 + Math.random() * 5;
        ped.targetSpeed = 0;
      } else if (roll < 0.002) {
        // Look at nearest building
        const candidateBlds = bldGrid ? bldGrid.queryRadius(ped.x, ped.y, 60) : world.buildings;
        const nearbyBld = candidateBlds.find(b => Math.hypot(b.x + b.width/2 - ped.x, b.y + b.height/2 - ped.y) < 60);
        if (nearbyBld) {
          ped.state = 'idle_window';
          ped.behaviorTimer = 4 + Math.random() * 6;
          ped.targetSpeed = 0;
          // Face the building
          ped.angle = Math.atan2(nearbyBld.y + nearbyBld.height/2 - ped.y, nearbyBld.x + nearbyBld.width/2 - ped.x);
        }
      }
    }

    if ((ped.state === 'idle_phone'|| ped.state === 'idle_window'|| ped.state === 'greeting') && ped.behaviorTimer > 0) {
      ped.behaviorTimer -= dt;
      ped.targetSpeed = 0;
      if (ped.behaviorTimer <= 0) {
        ped.state = 'walking';
        ped.targetSpeed = (ped.isCyclist ? 120 : (ped.isScooter ? 100 : 38 + Math.random() * 10));
      }
    }

    // 0b. Social interaction: Greeting nearby pedestrians
    if (ped.state === 'walking'&& !ped.isCrossingRoad && Math.random() < 0.01) {
      if (!ped.greetedIds) ped.greetedIds = [];
      const candidatePeds = pedGrid ? pedGrid.queryRadius(ped.x, ped.y, 40) : world.pedestrians;
      const otherPed = candidatePeds.find(p => p.id !== ped.id && p.state === 'walking'&& !ped.greetedIds!.includes(p.id) && Math.hypot(p.x - ped.x, p.y - ped.y) < 40);
      if (otherPed && !otherPed.alertBubbleText) {
        if (!otherPed.greetedIds) otherPed.greetedIds = [];
        
        ped.state = 'greeting';
        ped.behaviorTimer = 2.0;
        const greetings = ["Morning!", "Hi!", "Hello!", "Hey, how's it going?", "Nice day!", "Long time no see!"];
        ped.alertBubbleText = greetings[Math.floor(Math.random() * greetings.length)];
        ped.alertBubbleTimer = 2.0;
        ped.greetedIds.push(otherPed.id);
        
        otherPed.state = 'greeting';
        otherPed.behaviorTimer = 2.0;
        const responses = ["Hey!", "Good day!", "Oh, hi!", "Doing well, thanks!", "Beautiful weather!"];
        otherPed.alertBubbleText = responses[Math.floor(Math.random() * responses.length)];
        otherPed.alertBubbleTimer = 2.0;
        otherPed.greetedIds.push(ped.id);
        
        // Face each other
        ped.angle = Math.atan2(otherPed.y - ped.y, otherPed.x - ped.x);
        otherPed.angle = Math.atan2(ped.y - otherPed.y, ped.x - otherPed.x);
      }
    }

    // 0c. Reaction to Car Horns
    const candidateVehicles = vehGrid ? vehGrid.queryRadius(ped.x, ped.y, 150) : world.vehicles;
    const honkingCar = candidateVehicles.find(v => v.isHonking && Math.hypot(v.x - ped.x, v.y - ped.y) < 150);
    if (honkingCar && !ped.alertBubbleText) {
      const reactions = ["Watch it!", "Hey!", "Quiet!", "Relax!", "!", "?", "Slow down!"];
      ped.alertBubbleText = reactions[Math.floor(Math.random() * reactions.length)];
      ped.alertBubbleTimer = 2.0;
      if (Math.hypot(honkingCar.x - ped.x, honkingCar.y - ped.y) < 60) {
        ped.state = 'panicking';
        ped.panicTimer = 1.0;
      }
    }

    // 1. Panic Detection: Speeding vehicle directly bearing down (< 36px)
    let dangerFound = false;
    const dangerCandidates = vehGrid ? vehGrid.queryRadius(ped.x, ped.y, 50) : world.vehicles;
    for (const car of dangerCandidates) {
      if (Math.abs(car.speed) > 65) {
        const dx = ped.x - car.x;
        const dy = ped.y - car.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 36) {
          const carHeadingCos = Math.cos(car.angle);
          const carHeadingSin = Math.sin(car.angle);
          const dot = dx * carHeadingCos + dy * carHeadingSin;

          if (dot > 0) {
            dangerFound = true;
            ped.state = 'panicking';
            ped.panicTimer = 1.5;
            ped.targetSpeed = 110;

            const sideAngle = car.angle + (dy * carHeadingCos - dx * carHeadingSin > 0 ? Math.PI / 2 : -Math.PI / 2);
            ped.angle = sideAngle;
            break;
          }
        }
      }
    }

    if (!dangerFound && ped.panicTimer > 0) {
      ped.panicTimer -= dt;
      if (ped.panicTimer <= 0) {
        ped.state = ped.isCrossingRoad ? 'crossing': 'walking';
        ped.targetSpeed = 38;
      }
    }

    // 2. Crosswalk Discovery & Traffic Light Waiting Logic
    if (ped.state === 'walking'&& !ped.isCrossingRoad && (ped.crosswalkCooldownTimer || 0) <= 0) {
      // Check if near any crosswalk curb
      for (const inter of world.intersections) {
        for (const cw of inter.crosswalks || []) {
          const { p1, p2 } = getCrosswalkEndpoints(inter, cw);
          const d1 = Math.hypot(ped.x - p1.x, ped.y - p1.y);
          const d2 = Math.hypot(ped.x - p2.x, ped.y - p2.y);

          if (d1 < 32 || d2 < 32) {
            const startCurb = d1 < d2 ? p1 : p2;
            const endCurb = d1 < d2 ? p2 : p1;

            // Check if walking generally towards the crosswalk
            const toCurbDx = startCurb.x - ped.x;
            const toCurbDy = startCurb.y - ped.y;
            const pedCos = Math.cos(ped.angle);
            const pedSin = Math.sin(ped.angle);
            const dot = toCurbDx * pedCos + toCurbDy * pedSin;

            if (dot >= -5) {
              // 15% chance to cross the street; otherwise stay on the block's sidewalk
              if (Math.random() < 0.15) {
                ped.targetCrosswalkId = cw.id;
                ped.crosswalkCooldownTimer = 75.0;
                const aimAngle = Math.atan2(endCurb.y - startCurb.y, endCurb.x - startCurb.x);

                if (cw.pedestrianSignal === 'wait') {
                  // Red pedestrian light: STOP at curb and wait
                  ped.state = 'waiting_light';
                  ped.waitingAtCurb = true;
                  ped.targetSpeed = 0;
                  ped.angle = aimAngle;
                  ped.routeWaypoints = [startCurb, endCurb];
                  ped.targetWaypointIndex = 1;
                } else {
                  // Green pedestrian light: Start crossing immediately
                  ped.state = 'crossing';
                  ped.isCrossingRoad = true;
                  ped.waitingAtCurb = false;
                  ped.targetSpeed = 48 + Math.random() * 6;
                  ped.routeWaypoints = [startCurb, endCurb];
                  ped.targetWaypointIndex = 1;
                  ped.angle = aimAngle;
                }
                break;
              } else {
                // Decided to stay on current sidewalk: cooldown to avoid re-triggering immediately
                ped.crosswalkCooldownTimer = 25.0;
              }
            }
          }
        }
        if (ped.state === 'waiting_light'|| ped.state === 'crossing') break;
      }
    }

    // 3. Waiting at Curb for Green Pedestrian Light
    if (ped.state === 'waiting_light') {
      ped.targetSpeed = 0;
      let activeCw: Intersection['crosswalks'][0] | null = null;
      let targetInter: Intersection | null = null;

      for (const inter of world.intersections) {
        const found = inter.crosswalks?.find((c) => c.id === ped.targetCrosswalkId);
        if (found) {
          activeCw = found;
          targetInter = inter;
          break;
        }
      }

      if (activeCw && targetInter) {
        const { p1, p2 } = getCrosswalkEndpoints(targetInter, activeCw);
        const d1 = Math.hypot(ped.x - p1.x, ped.y - p1.y);
        const d2 = Math.hypot(ped.x - p2.x, ped.y - p2.y);
        const startCurb = d1 < d2 ? p1 : p2;
        const endCurb = d1 < d2 ? p2 : p1;
        ped.angle = Math.atan2(endCurb.y - startCurb.y, endCurb.x - startCurb.x);

        if (activeCw.pedestrianSignal === 'walk') {
          // Light turned GREEN: Walk across crosswalk!
          ped.state = 'crossing';
          ped.isCrossingRoad = true;
          ped.waitingAtCurb = false;
          ped.targetSpeed = 45 + Math.random() * 8;
          ped.routeWaypoints = [startCurb, endCurb];
          ped.targetWaypointIndex = 1;
        }
      } else {
        ped.state = 'walking';
        ped.targetSpeed = 38;
      }
    }

    // 4. Crossing the Street along Zebra Stripes
    if (ped.state === 'crossing') {
      if (ped.routeWaypoints.length > 1) {
        const dest = ped.routeWaypoints[1];
        const dx = dest.x - ped.x;
        const dy = dest.y - ped.y;
        const dist = Math.hypot(dx, dy);

        const targetAngle = Math.atan2(dy, dx);
        let aDiff = (targetAngle - ped.angle) % (Math.PI * 2);
        if (aDiff < -Math.PI) aDiff += Math.PI * 2;
        if (aDiff > Math.PI) aDiff -= Math.PI * 2;
        ped.angle += aDiff * Math.min(1.0, 7.0 * dt);

        ped.targetSpeed = 45 + Math.random() * 6;

        if (dist < 16) {
          // Reached destination curb! Join sidewalk on the destination block
          ped.state = 'walking';
          ped.isCrossingRoad = false;
          ped.waitingAtCurb = false;
          ped.targetCrosswalkId = null;
          // Set substantial cooldown so pedestrian explores the new block rather than looping back
          ped.crosswalkCooldownTimer = 35.0;

          // Find closest sidewalk waypoint on the destination side
          let bestPath = world.pedestrianPaths[0];
          let bestWpIndex = 0;
          let minD = 99999;

          for (const path of world.pedestrianPaths) {
            path.waypoints.forEach((wp, idx) => {
              const d = Math.hypot(ped.x - wp.x, ped.y - wp.y);
              const score = d + (path.id.includes('_ww_') ? 20 : 0);
              if (score < minD) {
                minD = score;
                bestPath = path;
                bestWpIndex = idx;
              }
            });
          }

          if (bestPath) {
            ped.targetPathId = bestPath.id;
            ped.routeWaypoints = bestPath.waypoints;
            const dir = Math.random() < 0.5 ? 1 : -1;
            ped.pathDirection = dir;
            ped.branchCooldownTimer = 12.0;
            const isLoop = bestPath.waypoints.length >= 3 &&
              Math.hypot(bestPath.waypoints[0].x - bestPath.waypoints[bestPath.waypoints.length - 1].x,
                         bestPath.waypoints[0].y - bestPath.waypoints[bestPath.waypoints.length - 1].y) < 10;
            if (isLoop) {
              ped.targetWaypointIndex = (bestWpIndex + dir + bestPath.waypoints.length) % bestPath.waypoints.length;
            } else {
              ped.targetWaypointIndex = Math.max(0, Math.min(bestPath.waypoints.length - 1, bestWpIndex + dir));
            }
            const nextWp = bestPath.waypoints[ped.targetWaypointIndex];
            if (nextWp) {
              ped.angle = Math.atan2(nextWp.y - ped.y, nextWp.x - ped.x);
            }
          }
        }
      }
    }

    // 5. Normal Sidewalk Walking & Path Network Navigation
    if (ped.state === 'walking') {
      if (ped.branchCooldownTimer && ped.branchCooldownTimer > 0) {
        ped.branchCooldownTimer -= dt;
      }
      if (ped.routeWaypoints.length > 0) {
        const dir = ped.pathDirection !== undefined ? ped.pathDirection : 1;
        if (ped.targetWaypointIndex < 0 || ped.targetWaypointIndex >= ped.routeWaypoints.length) {
          ped.targetWaypointIndex = 0;
        }
        const wp = ped.routeWaypoints[ped.targetWaypointIndex];
        if (wp) {
          const dx = wp.x - ped.x;
          const dy = wp.y - ped.y;
          const dist = Math.hypot(dx, dy);

          const targetAngle = Math.atan2(dy, dx);
          let aDiff = (targetAngle - ped.angle) % (Math.PI * 2);
          if (aDiff < -Math.PI) aDiff += Math.PI * 2;
          if (aDiff > Math.PI) aDiff -= Math.PI * 2;
          ped.angle += aDiff * Math.min(1.0, 7.0 * dt);

          if (dist < 18) {
            // Reached waypoint!
            const isLoop = ped.routeWaypoints.length >= 3 &&
              Math.hypot(ped.routeWaypoints[0].x - ped.routeWaypoints[ped.routeWaypoints.length - 1].x,
                         ped.routeWaypoints[0].y - ped.routeWaypoints[ped.routeWaypoints.length - 1].y) < 10;

            const nextIndex = ped.targetWaypointIndex + dir;
            const isAtEnd = nextIndex >= ped.routeWaypoints.length || nextIndex < 0;

            let transitioned = false;
            const canBranch = (ped.branchCooldownTimer || 0) <= 0;

            // If reached the end of a non-looped path, or at an intersection while walking (25% chance)
            if ((isAtEnd && !isLoop) || (canBranch && Math.random() < 0.25)) {
              // Look for candidate connected paths
              const candidateTransitions: { path: PedestrianPath; wpIndex: number; dir: number }[] = [];
              for (const otherPath of world.pedestrianPaths) {
                if (otherPath.id === ped.targetPathId) continue;
                for (let oIdx = 0; oIdx < otherPath.waypoints.length; oIdx++) {
                  const oWp = otherPath.waypoints[oIdx];
                  if (Math.hypot(wp.x - oWp.x, wp.y - oWp.y) <= 35) {
                    if (oIdx + 1 < otherPath.waypoints.length) {
                      candidateTransitions.push({ path: otherPath, wpIndex: oIdx + 1, dir: 1 });
                    }
                    if (oIdx - 1 >= 0) {
                      candidateTransitions.push({ path: otherPath, wpIndex: oIdx - 1, dir: -1 });
                    }
                  }
                }
              }

              if (candidateTransitions.length > 0) {
                const chosen = candidateTransitions[Math.floor(Math.random() * candidateTransitions.length)];
                ped.targetPathId = chosen.path.id;
                ped.routeWaypoints = chosen.path.waypoints;
                ped.targetWaypointIndex = chosen.wpIndex;
                ped.pathDirection = chosen.dir;
                ped.branchCooldownTimer = 12.0;
                transitioned = true;
              }
            }

            if (!transitioned) {
              if (isLoop) {
                if (nextIndex >= ped.routeWaypoints.length) {
                  ped.targetWaypointIndex = 1;
                } else if (nextIndex < 0) {
                  ped.targetWaypointIndex = ped.routeWaypoints.length - 2;
                } else {
                  ped.targetWaypointIndex = nextIndex;
                }
              } else {
                if (isAtEnd) {
                  ped.pathDirection = -dir;
                  ped.targetWaypointIndex = Math.max(0, Math.min(ped.routeWaypoints.length - 1, ped.targetWaypointIndex - dir));
                } else {
                  ped.targetWaypointIndex = nextIndex;
                }
              }
            }
          }
        }
      }
    }

    // Apply movement with smooth acceleration/deceleration (inertia)
    const accelRate = ped.isCyclist ? 60 : 80;
    const decelRate = ped.isCyclist ? 80 : 150; // Cyclists take longer to stop
    if (ped.speed < ped.targetSpeed) {
      ped.speed += accelRate * dt;
      if (ped.speed > ped.targetSpeed) ped.speed = ped.targetSpeed;
    } else if (ped.speed > ped.targetSpeed) {
      ped.speed -= decelRate * dt;
      if (ped.speed < ped.targetSpeed) ped.speed = ped.targetSpeed;
    }
    
    // Group dynamics: if in a group and walking normally, adjust speed towards group mates (Optimized with groupsMap cache)
    if (ped.groupId && ped.state === 'walking'&& ped.targetSpeed > 0) {
      const groupMates = (groupsMap.get(ped.groupId) || []).filter(p => p.id !== ped.id);
      let avgSpeed = ped.speed;
      if (groupMates.length > 0) {
        let totalSpeed = ped.speed;
        let count = 1;
        for (const mate of groupMates) {
          totalSpeed += mate.speed;
          count++;
          // If a mate is falling behind, slow down a bit
          const distToMate = Math.hypot(mate.x - ped.x, mate.y - ped.y);
          if (distToMate > 40 && mate.speed < ped.speed) {
            ped.speed -= 20 * dt;
          }
        }
        // Slightly blend speed
        ped.speed = ped.speed * 0.95 + (totalSpeed / count) * 0.05;
      }
    }

    ped.vx = Math.cos(ped.angle) * ped.speed;
    ped.vy = Math.sin(ped.angle) * ped.speed;

    // Drop items if panicking
    if (ped.state === 'panicking'&& ped.handheldProp && !ped.hasDroppedProp) {
      ped.hasDroppedProp = true;
      world.litter.push({
        id: `dropped_prop_${ped.id}_${Date.now()}`,
        x: ped.x,
        y: ped.y,
        vx: ped.vx * 0.5 + (Math.random() - 0.5) * 50,
        vy: ped.vy * 0.5 + (Math.random() - 0.5) * 50,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        type: (ped.handheldProp === 'extinguisher'? 'can': ped.handheldProp) as any,
        color: ped.propColor || '#ffffff',
        size: ped.handheldProp === 'box'? 12 : (ped.handheldProp === 'phone'? 4 : 6),
        isAirborne: true,
        airborneTimer: 0.5 + Math.random() * 0.5,
        altitude: 15,
        isGlowing: ped.handheldProp === 'phone'});
      // Remove prop from hand
      ped.handheldProp = null;
    }

    // Local Vehicle Avoidance
    let avoidForceX = 0;
    let avoidForceY = 0;
    if (ped.state === 'walking'|| ped.state === 'crossing') {
      const lookaheadDist = 40;
      const lookaheadX = ped.x + Math.cos(ped.angle) * lookaheadDist;
      const lookaheadY = ped.y + Math.sin(ped.angle) * lookaheadDist;

      const nearbyCarsForAvoidance = vehGrid ? vehGrid.queryRadius(ped.x, ped.y, 60) : world.vehicles;
      for (const car of nearbyCarsForAvoidance) {
        if (car.isParked) continue;
        const dx = lookaheadX - car.x;
        const dy = lookaheadY - car.y;
        const dist = Math.hypot(dx, dy);

        const carHalfW = car.width / 2 + 10;
        const carHalfL = car.length / 2 + 10;
        const safetyDist = Math.hypot(carHalfL, carHalfW);
        if (dist < safetyDist) {
          const perpX = -Math.sin(ped.angle);
          const perpY = Math.cos(ped.angle);

          const carToPedDx = ped.x - car.x;
          const carToPedDy = ped.y - car.y;
          const sideDot = carToPedDx * perpX + carToPedDy * perpY;
          const steerDir = sideDot >= 0 ? 1 : -1;

          const strength = (1.0 - dist / safetyDist) * 45;
          avoidForceX += perpX * steerDir * strength;
          avoidForceY += perpY * steerDir * strength;
          break;
        }
      }
    }
    ped.vx += avoidForceX;
    ped.vy += avoidForceY;

    // 5b. Social Repulsion: Avoid other pedestrians (Optimized with pedGrid)
    const nearbyPedsForRepulsion = pedGrid ? pedGrid.queryRadius(ped.x, ped.y, 25) : world.pedestrians;
    for (const other of nearbyPedsForRepulsion) {
      if (other.id === ped.id || other.isInsideBuilding) continue;
      const dx = ped.x - other.x;
      const dy = ped.y - other.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 14 * 14 && distSq > 0.001) {
        const dist = Math.sqrt(distSq);
        const force = (14 - dist) * 1.5;
        ped.vx += (dx / dist) * force;
        ped.vy += (dy / dist) * force;
      }
    }

    // 5c. Smooth Monument & Fountain Obstacle Avoidance (glide around circular basins)
    const nearbyBldsForAvoidance = bldGrid ? bldGrid.queryRadius(ped.x, ped.y, 60) : world.buildings;
    for (const bld of nearbyBldsForAvoidance) {
      if (bld.type === 'park_monument') {
        const cx = bld.x + bld.width / 2;
        const cy = bld.y + bld.height / 2;
        const fountainSafeR = bld.width / 2 + 10;
        const dx = ped.x - cx;
        const dy = ped.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < fountainSafeR && dist > 0.001) {
          const push = (1.0 - dist / fountainSafeR) * 60;
          ped.vx += (dx / dist) * push;
          ped.vy += (dy / dist) * push;

          // Tangential glide around the perimeter
          const perpX = -dy / dist;
          const perpY = dx / dist;
          const dot = ped.vx * perpX + ped.vy * perpY;
          const sign = dot >= 0 ? 1 : -1;
          ped.vx += perpX * sign * 25;
          ped.vy += perpY * sign * 25;
        }
      }
    }

    // 5d. Slight wobbling / path variety
    if (ped.state === 'walking'|| ped.state === 'crossing') {
      const wobble = Math.sin(ped.walkCycle * 0.5) * 5;
      const perpX = -Math.sin(ped.angle);
      const perpY = Math.cos(ped.angle);
      ped.vx += perpX * wobble;
      ped.vy += perpY * wobble;
    }

    let nextX = ped.x + ped.vx * dt;
    let nextY = ped.y + ped.vy * dt;

    // 6. Robust vehicle physical separation (Optimized with vehGrid)
    const nearbyCarsForCollision = vehGrid ? vehGrid.queryRadius(nextX, nextY, 40) : world.vehicles;
    for (const car of nearbyCarsForCollision) {
      const res = checkPedestrianVehicleCollision(nextX, nextY, 7.0, car);
      if (res.collided) {
        nextX = res.x;
        nextY = res.y;
      }
    }

    // 7. Collision with Buildings (Only when not crossing - Optimized with bldGrid)
    if (!ped.isCrossingRoad) {
      const pedRadius = 6.0;
      const nearbyBuildings = bldGrid ? bldGrid.queryRadius(nextX, nextY, 50) : world.buildings;
      for (const bld of nearbyBuildings) {
        if (
          nextX + pedRadius > bld.x && nextX - pedRadius < bld.x + bld.width &&
          nextY + pedRadius > bld.y && nextY - pedRadius < bld.y + bld.height
        ) {
          const res = checkPedestrianBuildingCollision(nextX, nextY, pedRadius, bld);
          nextX = res.x;
          nextY = res.y;
        }
      }
    }

    // 7b. Collision with and Avoidance of Street Props (excluding broken ones - Optimized with propGrid)
    {
      const pedRadius = 6.0;
      const nearbyProps = propGrid ? propGrid.queryRadius(nextX, nextY, 40) : world.props;
      for (const prop of nearbyProps) {
        const hitbox = getPropHitbox(prop);
        if (hitbox.shape === 'none' || (prop.isBroken && hitbox.isWalkableWhenBroken)) continue;

        let propRadius = 5.0;
        if (prop.type === 'bench') propRadius = 9.0;
        else if (prop.type === 'kiosk') propRadius = 16.0;
        else if (prop.type === 'mailbox') propRadius = 7.0;
        else if (prop.type === 'cone') propRadius = 4.0;
        else if (prop.type === 'trash_can') propRadius = 6.0;
        else if (prop.type === 'bus_stop') propRadius = 16.0;
        else if (prop.type === 'dumpster') propRadius = 14.0;
        else if (prop.type === 'flowerbed') propRadius = 12.0;
        else if (prop.type === 'tire_flowerbed') propRadius = 9.0;
        else if (prop.type === 'lamp_concrete') propRadius = 7.0;
        else if (prop.type === 'playground_swing') propRadius = 12.0;

        const dx = nextX - prop.x;
        const dy = nextY - prop.y;
        const dist = Math.hypot(dx, dy);
        const minDist = pedRadius + propRadius;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          nextX += (dx / dist) * overlap;
          nextY += (dy / dist) * overlap;
        }
      }
    }

    ped.x = Math.max(15, Math.min(world.width - 15, nextX));
    ped.y = Math.max(15, Math.min(world.height - 15, nextY));
  }

  // Remove all despawned pedestrians from the world
  if (pedsToDespawn.size > 0) {
    world.pedestrians = world.pedestrians.filter(p => !pedsToDespawn.has(p.id));
  }
}

interface CandidateSpawn {
  lane: RoadSegment['lanePaths'][0];
  spawnX: number;
  spawnY: number;
  targetWpIndex: number;
  angle: number;
}

function getCandidateSpawnPoints(
  playerPos: Vector2D,
  world: GameWorld,
  minRadius = 600,
  maxRadius = 1400
): CandidateSpawn[] {
  const candidates: CandidateSpawn[] = [];

  for (const road of world.roads) {
    if (
      road.id.startsWith('road_village_') ||
      road.id.startsWith('road_forest_') ||
      road.id.startsWith('trail_') ||
      road.isDirt ||
      road.isGravel ||
      !road.lanePaths
    ) continue;
    for (const lane of road.lanePaths) {
      if (!lane.waypoints || lane.waypoints.length < 2) continue;
      const firstWp = lane.waypoints[0];
      const lastWp = lane.waypoints[lane.waypoints.length - 1];

      // Never spawn new traffic on road segments with an accident or traffic jam in either direction
      if (isRoadSegmentBlocked(world, firstWp.x, firstWp.y, lastWp.x, lastWp.y).isBlocked) {
        continue;
      }

      const isForest = firstWp.x < 3800 && firstWp.y < 3800;
      if (isForest && Math.random() > 0.15) continue;

      for (let i = 0; i < lane.waypoints.length - 1; i++) {
        const wp1 = lane.waypoints[i];
        const wp2 = lane.waypoints[i + 1];
        const segDx = wp2.x - wp1.x;
        const segDy = wp2.y - wp1.y;
        const segLen = Math.hypot(segDx, segDy);
        if (segLen < 10) continue;

        const samples = [0.2, 0.5, 0.8];
        for (const prog of samples) {
          const px = wp1.x + segDx * prog;
          const py = wp1.y + segDy * prog;
          const dist = Math.hypot(px - playerPos.x, py - playerPos.y);

          if (dist >= minRadius && dist <= maxRadius) {
            candidates.push({
              lane,
              spawnX: px,
              spawnY: py,
              targetWpIndex: i + 1,
              angle: Math.atan2(segDy, segDx)
            });
          }
        }
      }
    }
  }

  return candidates;
}

function isSpawnPositionClear(x: number, y: number, world: GameWorld): boolean {
  for (const v of world.vehicles) {
    const dist = Math.hypot(v.x - x, v.y - y);
    const requiredDist = v.isParked ? 40 : 70;
    if (dist < requiredDist) {
      return false;
    }
  }
  // Ensure vehicle spawn point is completely free of any nearby solid props (fences, poles, barriers)
  if (world.props) {
    for (const p of world.props) {
      const dx = Math.abs(p.x - x);
      const dy = Math.abs(p.y - y);
      if (dx < 36 && dy < 36) {
        if (Math.hypot(dx, dy) < 32) {
          return false;
        }
      }
    }
  }
  // Also check buildings bounding boxes so cars never spawn inside buildings
  if (world.buildings) {
    for (const b of world.buildings) {
      if (
        x >= b.x - 25 &&
        x <= b.x + b.width + 25 &&
        y >= b.y - 25 &&
        y <= b.y + b.height + 25
      ) {
        return false;
      }
    }
  }
  return true;
}

function respawnCarNearPlayer(car: Vehicle, playerPos: Vector2D, world: GameWorld): boolean {
  const candidates = getCandidateSpawnPoints(playerPos, world, 600, 1400);

  if (candidates.length > 0) {
    for (let attempts = 0; attempts < 15; attempts++) {
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];

      if (isSpawnPositionClear(chosen.spawnX, chosen.spawnY, world)) {
        const road = findRoadByLaneId(world, chosen.lane.laneId);
        const targetCruisePx = getVehicleCruiseSpeedPx(car, road);
        const speedVal = targetCruisePx * (0.85 + Math.random() * 0.12);

        car.x = chosen.spawnX;
        car.y = chosen.spawnY;
        car.angle = chosen.angle;
        car.speed = speedVal;
        car.vx = Math.cos(car.angle) * car.speed;
        car.vy = Math.sin(car.angle) * car.speed;
        car.steerAngle = 0;
        car.targetSteerAngle = 0;
        car.currentLaneId = chosen.lane.laneId;
        car.routeWaypoints = [...chosen.lane.waypoints];
        car.targetWaypointIndex = chosen.targetWpIndex;
        car.currentConnection = null;
        car.inIntersection = false;
        car.aiState = 'driving';
        car.stuckTimer = 0;
        car.reverseTimer = 0;
        car.targetSpeed = targetCruisePx;
        car.idmAcceleration = 0;
        car.turnSignal = 'none';
        car.turnSignalTimer = 0;
        car.brakeLightsOn = false;
        car.ghostingAlpha = 1.0;
        car.damage = createDefaultVehicleDamage(car.length, car.width);
        car.engineState = createDefaultEngineState(car.type, true, false);
        car.hasGBO = ['sedan_classic', 'wagon_classic', 'taxi_yellow', 'delivery_truck', 'van_cargo_old'].includes(car.type) ? Math.random() < 0.4 : false;
        car.fuelSystem = createDefaultFuelSystem(car.type, false);
        applyPowertrain(car);
        return true;
      }
    }
  }
  return false;
}

// Checks if an active fire engine is already dispatched for a specific fire coordinate
export function isFireEngineDispatchedFor(world: GameWorld, fireX: number, fireY: number, radius: number = 550, maxNeeded: number = 1): boolean {
  let activeDispatchesCount = 0;
  
  // Also count total global fire dispatches to prevent world-wide traffic collapse
  let totalGlobalDispatches = 0;
  
  for (const v of world.vehicles) {
    if ((v as any).isFireDispatch && (!v.damage || !v.damage.isFullyBurnt)) {
      totalGlobalDispatches++;
      
      const dist = Math.hypot((v as any).targetFireX - fireX, (v as any).targetFireY - fireY);
      if (dist < radius) {
        activeDispatchesCount++;
      }
    }
  }
  
  // Limit to 1 engine per fire area by default, and max 4 engines globally for the whole map
  return activeDispatchesCount >= maxNeeded || totalGlobalDispatches >= 4;
}

// Spawns and dispatches a fire engine to drive to the given fire location using pathfinding
export function dispatchFireEngine(world: GameWorld, targetPos: Vector2D, fireX: number, fireY: number, player?: any): boolean {
  let candidates = getCandidateSpawnPoints(targetPos, world, 500, 1150);
  if (candidates.length === 0) {
    // Fallback: wider range to guarantee candidate points are found
    candidates = getCandidateSpawnPoints(targetPos, world, 300, 2500);
  }
  if (candidates.length === 0) return false;

  const cType = 'fire_engine';
  const cfg = CAR_CONFIGS[cType] || CAR_CONFIGS.sedan;
  const color = '#dc2626';
  const roofColor = '#f8fafc';

  for (let attempts = 0; attempts < 15; attempts++) {
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    // Force spawn on later attempts to guarantee fire engine dispatch even under dense traffic conditions
    if (attempts >= 8 || isSpawnPositionClear(chosen.spawnX, chosen.spawnY, world)) {
      const id = `fire_engine_dispatch_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const speedVal = 100; // Fast but controllable for GPS pathfinding

      const startPoint = { x: chosen.spawnX, y: chosen.spawnY };
      const endPoint = { x: fireX, y: fireY };
      const gpsPath = calculateGpsRoute(world, startPoint, endPoint, true);

      const spawnedFireEngine: Vehicle = {
        id,
        type: cType,
        x: chosen.spawnX,
        y: chosen.spawnY,
        vx: Math.cos(chosen.angle) * speedVal,
        vy: Math.sin(chosen.angle) * speedVal,
        angle: chosen.angle,
        steerAngle: 0,
        targetSteerAngle: 0,
        speed: speedVal,
        lateralVelocity: 0,
        angularVelocity: 0,
        isDrifting: false,
        driftFactor: 0,
        mass: cfg.mass,
        width: cfg.width,
        length: cfg.length,
        wheelBase: cfg.wheelBase,
        color,
        roofColor,
        headlightsOn: true,
        headlightMode: 'high',
        brakeLightsOn: false,
        isReversing: false,
        turnSignal: 'hazard',
        turnSignalTimer: 0,
        isParked: false,
        isPlayerControlled: false,
        requiredFuel: 'diesel',
        engineState: createDefaultEngineState(cType, true, false),
        fuelSystem: createDefaultFuelSystem(cType, false),
        targetSpeed: speedVal,
        currentLaneId: chosen.lane.laneId,
        targetWaypointIndex: 1,
        routeWaypoints: gpsPath,
        currentConnection: null,
        inIntersection: false,
        plannedTurn: 'straight',
        aiState: 'driving',
        stuckTimer: 0,
        reverseTimer: 0,
        targetChaseVehicleId: null,
        ghostingAlpha: 1.0,
        honkTimer: 0,
        isHonking: false,
        hornEffectTimer: 0,
        sirenOn: true,
        sirenStrobe: 0,
        damage: createDefaultVehicleDamage(cfg.length, cfg.width)
      };
      applyPowertrain(spawnedFireEngine);

      (spawnedFireEngine as any).isFireDispatch = true;
      (spawnedFireEngine as any).targetFireX = fireX;
      (spawnedFireEngine as any).targetFireY = fireY;
      (spawnedFireEngine as any).firefighterSpawned = false;

      world.vehicles.push(spawnedFireEngine);

      try {
        if (sound && typeof sound.startSiren === 'function') {
          sound.startSiren();
        }
      } catch (e) {
        console.error(e);
      }

      if (player) {
        if (!player.notifications) player.notifications = [];
        player.notifications.push({
          id: 'fire_dispatch_'+ Date.now(),
          text: 'Очевидец сообщил о пожаре! Пожарная машина выехала.',
          color: '#ef4444',
          timer: 5.0
        });
      }
      return true;
    }
  }
  return false;
}

// Spawns a brand new AI vehicle dynamically near the player to keep the traffic density alive
export function spawnNewCarNearPlayer(playerPos: Vector2D, world: GameWorld): boolean {
  if (world.vehicles.length >= 48) return false;
  const candidates = getCandidateSpawnPoints(playerPos, world, 600, 1400);
  if (candidates.length === 0) return false;

  for (let attempts = 0; attempts < 15; attempts++) {
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    if (isSpawnPositionClear(chosen.spawnX, chosen.spawnY, world)) {
      const road = findRoadByLaneId(world, chosen.lane.laneId);
      const archetypes = getTerritoryVehicleArchetypes(road, chosen.spawnX, chosen.spawnY);
      const cType = pickWeightedVehicleType(archetypes);
      const cfg = CAR_CONFIGS[cType] || CAR_CONFIGS.sedan;

      let color = CAR_PALETTE[Math.floor(Math.random() * CAR_PALETTE.length)];
      if (cType === 'taxi') color = '#eab308';
      else if (cType === 'police') color = '#0f172a';
      else if (cType === 'fire_engine'|| cType === 'fire_ladder'|| cType === 'fire_rescue') color = '#dc2626';
      else if (cType === 'bus') color = '#eab308';
      else if (cType === 'bus_minibus') color = '#f59e0b';
      else if (cType === 'ambulance'|| cType === 'ambulance_van'|| cType === 'ambulance_suv') color = '#f8fafc';
      else if (cType === 'van_camper') color = '#fef08a';
      else if (cType === 'van_cargo_old') color = '#94a3b8';
      else if (cType === 'muscle'|| cType === 'muscle_classic') color = '#991b1b';
      else if (cType === 'garbage_truck') color = '#16a34a';
      else if (cType === 'truck_dump') color = '#d97706';
      else if (cType === 'truck_zil_dump') color = '#0284c7';
      else if (cType === 'cement_mixer') color = '#2563eb';
      else if (cType === 'truck_box') color = '#0284c7';
      else if (cType === 'truck_water') color = '#0284c7';
      else if (cType === 'truck_tanker') color = '#0369a1';
      else if (cType === 'truck_flatbed' || cType === 'truck_covered') color = '#0284c7';
      else if (cType === 'truck_tow') color = '#eab308';
      else if (cType === 'truck_armored') color = '#334155';
      else if (cType === 'delivery_truck') color = '#78350f';
      else if (cType === 'supercar') color = '#ef4444';
      else if (cType === 'retro_bubble') color = '#38bdf8';
      else if (cType === 'sedan_luxury') color = '#1e293b';
      // Tractors Authentic Colors
      else if (cType === 'tractor_mtz82') color = '#2563eb'; // Belarus Blue
      else if (cType === 'tractor_mtz80') color = '#dc2626'; // Red
      else if (cType === 'tractor_mtz80_old') color = '#0284c7'; // Faded Blue
      // Motorcycles & Mopeds
      else if (cType === 'moto_jawa350') color = '#991b1b'; // Cherry Red
      else if (cType === 'moto_izh_jupiter') color = '#0284c7'; // Soviet Sky Blue
      else if (cType === 'moto_ural_sidecar') color = '#3f6212'; // Military Khaki Olive
      else if (cType === 'moto_sport') color = '#10b981'; // Green Kawasaki / Racing
      else if (cType === 'moto_chopper') color = '#0f172a'; // Midnight Black
      else if (cType === 'moped_soviet') color = '#f97316'; // Orange-Red Karpaty

      const isEmergency = cType === 'police'|| cType === 'ambulance'|| cType === 'ambulance_van'|| 
                          cType === 'ambulance_suv'|| cType === 'fire_engine'|| cType === 'fire_ladder'|| 
                          cType === 'fire_rescue';
      let roofColor = isEmergency ? '#f8fafc': color;
      if (cType === 'truck_zil_dump') roofColor = '#f8fafc';
      if (cType === 'suv_classic_box') roofColor = '#ffffff';
      if (cType === 'classic_compact') roofColor = '#f1f5f9';
      if (cType === 'wagon_allroad') roofColor = '#0f172a';

      const id = `veh_dynamic_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const targetCruisePx = getVehicleCruiseSpeedPx({ type: cType, id } as any, road);
      const speedVal = targetCruisePx * (0.85 + Math.random() * 0.12);

      const dynamicCar: Vehicle = {
        id,
        type: cType,
        x: chosen.spawnX,
        y: chosen.spawnY,
        vx: Math.cos(chosen.angle) * speedVal,
        vy: Math.sin(chosen.angle) * speedVal,
        angle: chosen.angle,
        steerAngle: 0,
        targetSteerAngle: 0,
        speed: speedVal,
        lateralVelocity: 0,
        angularVelocity: 0,
        isDrifting: false,
        driftFactor: 0,
        mass: cfg.mass,
        width: cfg.width,
        length: cfg.length,
        wheelBase: cfg.wheelBase,
        color,
        roofColor,
        dumpColor: cType === 'truck_zil_dump' ? (cfg.dumpColor || '#d97706') : undefined,
        headlightsOn: true,
        headlightMode: 'low',
        brakeLightsOn: false,
        isReversing: false,
        turnSignal: 'none',
        turnSignalTimer: 0,
        isParked: false,
        isPlayerControlled: false,
        requiredFuel: createDefaultFuelSystem(cType).fuelType === 'diesel'? 'diesel': (createDefaultFuelSystem(cType).octaneNumber === 92 ? 'ai92': 'ai95'),
        hasGBO: ['sedan_classic', 'wagon_classic', 'taxi_yellow', 'delivery_truck', 'van_cargo_old'].includes(cType) ? Math.random() < 0.4 : false,
        engineState: createDefaultEngineState(cType, true, false),
        fuelSystem: createDefaultFuelSystem(cType, false),
        targetSpeed: targetCruisePx,
        currentLaneId: chosen.lane.laneId,
        targetWaypointIndex: chosen.targetWpIndex,
        routeWaypoints: [...chosen.lane.waypoints],
        currentConnection: null,
        inIntersection: false,
        plannedTurn: 'straight',
        aiState: 'driving',
        stuckTimer: 0,
        reverseTimer: 0,
        targetChaseVehicleId: null,
        ghostingAlpha: 1.0,
        honkTimer: 0,
        isHonking: false,
        hornEffectTimer: 0,
        damage: createDefaultVehicleDamage(cfg.length, cfg.width)
      };
      applyPowertrain(dynamicCar);
      world.vehicles.push(dynamicCar);
      return true;
    }
  }
  return false;
}

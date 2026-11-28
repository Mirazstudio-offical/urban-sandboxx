import { GameWorld, GuardrailSegment, Intersection, RoadSegment, Vector2D, Vehicle } from './types';

// Helper to calculate Euclidean distance
export function getDistance(p1: Vector2D, p2: Vector2D): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function normalizeAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r < -Math.PI) r += Math.PI * 2;
  return r;
}

function angleDiff(a: number, b: number): number {
  return normalizeAngle(a - b);
}

// Check if an individual vehicle is currently in an accident or severe crash/fire state
export function isVehicleInAccident(v: Vehicle): boolean {
  if (v.isPlayerControlled || v.isParked || v.id === 'evac_ambulance_special') {
    return false;
  }

  // Active hazard lights on a stopped/broken vehicle indicate an accident scene or breakdown
  if (v.turnSignal === 'hazard' && (v.aiState === 'stopping_obstacle' || Math.abs(v.speed) < 15)) {
    return true;
  }

  const dmg = v.damage;
  if (dmg) {
    if (
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
      dmg.frontRightDent > 1.8
    ) {
      return true;
    }
  }

  const eng = v.engineState;
  if (eng) {
    if (eng.isSeized || eng.transmissionJammed || eng.engineHealth <= 15) {
      return true;
    }
  }

  return false;
}

export interface RoadBlockStatus {
  isBlocked: boolean;
  hasAccident: boolean;
  hasJam: boolean;
  blockedVehicles: Vehicle[];
}

export interface RoadBlockOptions {
  /** Do not treat the player's own (stopped) vehicle as a jam participant (used by GPS routing). */
  ignorePlayer?: boolean;
  /**
   * If set, slow/stopped vehicles only count as a jam when at least two of them are closer than this
   * distance (px) to each other along the segment. Needed for long segments, where two unrelated
   * slow cars kilometers apart are not a traffic jam.
   */
  jamClusterRadius?: number;
  /** Half-width of the corridor around the segment centerline (defaults to 85px for full road). */
  corridorHalfWidth?: number;
}

export function isRoadSegmentBlocked(
  world: GameWorld,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: RoadBlockOptions
): RoadBlockStatus {
  const halfWidth = options?.corridorHalfWidth ?? 85;
  const pad = Math.min(halfWidth, 45);
  const minX = Math.min(x1, x2) - pad;
  const maxX = Math.max(x1, x2) + pad;
  const minY = Math.min(y1, y2) - pad;
  const maxY = Math.max(y1, y2) + pad;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { isBlocked: false, hasAccident: false, hasJam: false, blockedVehicles: [] };
  }

  const blockedVehicles: Vehicle[] = [];
  let stoppedCount = 0;
  let hasAccident = false;
  let hasJam = false;
  const segLen = Math.sqrt(lenSq);
  const stoppedAlong: number[] = [];

  for (const v of world.vehicles) {
    if (v.isParked) continue;
    if (options?.ignorePlayer && v.isPlayerControlled) continue;

    // Fast bounding box rejection
    if (v.x < minX || v.x > maxX || v.y < minY || v.y > maxY) continue;

    // Perpendicular projection along segment centerline
    const t = ((v.x - x1) * dx + (v.y - y1) * dy) / lenSq;
    // Keep strictly between the two endpoints (excluding intersection boxes)
    if (t < 0.06 || t > 0.94) continue;

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const distToCenterline = Math.hypot(v.x - projX, v.y - projY);

    if (distToCenterline > halfWidth) continue;

    const inAccident = isVehicleInAccident(v);
    const isCrawlingOrStopped = Math.abs(v.speed) < 16 && v.aiState !== 'stopping_light' && v.aiState !== 'yielding';
    const isStuck = (v.stuckTimer || 0) > 2.0 || v.aiState === 'stopping_obstacle';

    if (inAccident) {
      hasAccident = true;
      blockedVehicles.push(v);
    } else if (isStuck) {
      hasJam = true;
      blockedVehicles.push(v);
    } else if (isCrawlingOrStopped) {
      stoppedCount++;
      blockedVehicles.push(v);
      if (options?.jamClusterRadius === undefined) {
        if (stoppedCount >= 2) {
          hasJam = true;
        }
      } else {
        const along = t * segLen;
        for (const other of stoppedAlong) {
          if (Math.abs(other - along) <= options.jamClusterRadius) {
            hasJam = true;
            break;
          }
        }
        stoppedAlong.push(along);
      }
    }
  }

  const isBlocked = hasAccident || hasJam;
  return { isBlocked, hasAccident, hasJam, blockedVehicles };
}

// Extract all centerline waypoints of a road segment
export function getRoadWaypoints(road: RoadSegment): Vector2D[] {
  if (road.curvePoints && road.curvePoints.length >= 2) {
    return road.curvePoints.map(p => ({ x: p.x, y: p.y }));
  }
  if (road.x1 !== undefined && road.y1 !== undefined && road.x2 !== undefined && road.y2 !== undefined) {
    return [{ x: road.x1, y: road.y1 }, { x: road.x2, y: road.y2 }];
  }
  return [];
}

// Project point onto line segment
function projectPointOnSegment(p: Vector2D, a: Vector2D, b: Vector2D): { proj: Vector2D; t: number; dist: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) {
    return { proj: { x: a.x, y: a.y }, t: 0, dist: getDistance(p, a) };
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return { proj, t, dist: getDistance(p, proj) };
}

interface BarrierSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function extractMedianBarrierSegments(guardrails?: GuardrailSegment[]): BarrierSeg[] {
  const segs: BarrierSeg[] = [];
  if (!guardrails || guardrails.length === 0) return segs;

  const pushSeg = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    // Slight 4px longitudinal padding covers end attenuator caps without sealing real median gaps
    const padX = (dx / len) * 4;
    const padY = (dy / len) * 4;
    const ax = x1 - padX;
    const ay = y1 - padY;
    const bx = x2 + padX;
    const by = y2 + padY;
    segs.push({
      x1: ax,
      y1: ay,
      x2: bx,
      y2: by,
      minX: Math.min(ax, bx) - 6,
      maxX: Math.max(ax, bx) + 6,
      minY: Math.min(ay, by) - 6,
      maxY: Math.max(ay, by) + 6,
    });
  };

  for (const g of guardrails) {
    // Only central median dividers prevent crossing between carriageways
    if (g.isSideBarrier) continue;
    if (g.curvePoints && g.curvePoints.length >= 2) {
      for (let i = 0; i < g.curvePoints.length - 1; i++) {
        pushSeg(g.curvePoints[i].x, g.curvePoints[i].y, g.curvePoints[i + 1].x, g.curvePoints[i + 1].y);
      }
    } else if (
      g.x1 !== undefined && g.y1 !== undefined &&
      g.x2 !== undefined && g.y2 !== undefined
    ) {
      pushSeg(g.x1, g.y1, g.x2, g.y2);
    }
  }
  return segs;
}

function segmentsIntersectInclusive(
  p1: Vector2D,
  p2: Vector2D,
  q1x: number,
  q1y: number,
  q2x: number,
  q2y: number
): boolean {
  const rX = p2.x - p1.x;
  const rY = p2.y - p1.y;
  const sX = q2x - q1x;
  const sY = q2y - q1y;
  const denom = rX * sY - rY * sX;
  const qpX = q1x - p1.x;
  const qpY = q1y - p1.y;

  if (Math.abs(denom) < 1e-6) {
    // Parallel: check distance from midpoint to barrier
    const mid = { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5 };
    const { dist } = projectPointOnSegment(mid, { x: q1x, y: q1y }, { x: q2x, y: q2y });
    return dist < 6;
  }

  const t = (qpX * sY - qpY * sX) / denom;
  const u = (qpX * rY - qpY * rX) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segmentCrossesMedianBarrier(a: Vector2D, b: Vector2D, barriers: BarrierSeg[]): boolean {
  if (barriers.length === 0) return false;
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);

  for (let i = 0; i < barriers.length; i++) {
    const g = barriers[i];
    if (maxX < g.minX || minX > g.maxX || maxY < g.minY || minY > g.maxY) continue;
    if (segmentsIntersectInclusive(a, b, g.x1, g.y1, g.x2, g.y2)) {
      return true;
    }
  }
  return false;
}

function polylineCrossesMedianBarrier(wps: Vector2D[], barriers: BarrierSeg[]): boolean {
  if (barriers.length === 0 || wps.length < 2) return false;
  for (let i = 0; i < wps.length - 1; i++) {
    if (segmentCrossesMedianBarrier(wps[i], wps[i + 1], barriers)) return true;
  }
  return false;
}

function computeCumDists(wps: Vector2D[]): number[] {
  const cd = [0];
  for (let i = 1; i < wps.length; i++) {
    cd.push(cd[i - 1] + getDistance(wps[i - 1], wps[i]));
  }
  return cd;
}

function samplePolylineAtDist(wps: Vector2D[], cumDists: number[], dist: number): { pt: Vector2D; angle: number } {
  const total = cumDists[cumDists.length - 1] || 0;
  const clamped = Math.max(0, Math.min(total, dist));
  for (let i = 0; i < wps.length - 1; i++) {
    const d0 = cumDists[i];
    const d1 = cumDists[i + 1];
    if (clamped <= d1 || i === wps.length - 2) {
      const segLen = d1 - d0;
      const t = segLen > 1e-6 ? Math.max(0, Math.min(1, (clamped - d0) / segLen)) : 0;
      const a = wps[i];
      const b = wps[i + 1];
      return {
        pt: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
    }
  }
  const last = wps[wps.length - 1];
  const prev = wps[Math.max(0, wps.length - 2)];
  return { pt: { x: last.x, y: last.y }, angle: Math.atan2(last.y - prev.y, last.x - prev.x) };
}

function slicePolyline(wps: Vector2D[], cumDists: number[], startDist: number, endDist: number): Vector2D[] {
  const total = cumDists[cumDists.length - 1] || 0;
  const sD = Math.max(0, Math.min(total, startDist));
  const eD = Math.max(sD, Math.min(total, endDist));
  const startPt = samplePolylineAtDist(wps, cumDists, sD).pt;
  const endPt = samplePolylineAtDist(wps, cumDists, eD).pt;

  const out: Vector2D[] = [startPt];
  for (let i = 1; i < wps.length - 1; i++) {
    if (cumDists[i] > sD + 1.0 && cumDists[i] < eD - 1.0) {
      out.push({ x: wps[i].x, y: wps[i].y });
    }
  }
  if (getDistance(out[out.length - 1], endPt) > 0.5 || out.length === 1) {
    out.push(endPt);
  }
  return out;
}

function projectPointOntoPolyline(
  pt: Vector2D,
  wps: Vector2D[],
  cumDists: number[]
): { proj: Vector2D; distParam: number; dist: number; angle: number } {
  let bestDist = Infinity;
  let bestProj: Vector2D = wps[0];
  let bestParam = 0;
  let bestAngle = 0;

  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i];
    const b = wps[i + 1];
    const { proj, t, dist } = projectPointOnSegment(pt, a, b);
    if (dist < bestDist) {
      bestDist = dist;
      bestProj = proj;
      bestParam = cumDists[i] + t * (cumDists[i + 1] - cumDists[i]);
      bestAngle = Math.atan2(b.y - a.y, b.x - a.x);
    }
  }

  return { proj: bestProj, distParam: bestParam, dist: bestDist, angle: bestAngle };
}

/**
 * Offsets a polyline to the RIGHT of its travel direction (right-hand traffic).
 * In screen coordinates (+X east, +Y south), the right-hand unit normal of (tx, ty) is (-ty, tx).
 */
function offsetPolylineRight(wps: Vector2D[], offset: number): Vector2D[] {
  if (Math.abs(offset) < 0.01 || wps.length < 2) {
    return wps.map(p => ({ x: p.x, y: p.y }));
  }

  const normals: Vector2D[] = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const dx = wps[i + 1].x - wps[i].x;
    const dy = wps[i + 1].y - wps[i].y;
    const len = Math.hypot(dx, dy) || 1;
    normals.push({ x: -dy / len, y: dx / len });
  }

  const res: Vector2D[] = [];
  for (let i = 0; i < wps.length; i++) {
    let nx: number;
    let ny: number;
    if (i === 0) {
      nx = normals[0].x;
      ny = normals[0].y;
    } else if (i === wps.length - 1) {
      nx = normals[normals.length - 1].x;
      ny = normals[normals.length - 1].y;
    } else {
      const n1 = normals[i - 1];
      const n2 = normals[i];
      const mx = n1.x + n2.x;
      const my = n1.y + n2.y;
      const mLen = Math.hypot(mx, my);
      if (mLen < 0.01) {
        nx = n1.x;
        ny = n1.y;
      } else {
        nx = mx / mLen;
        ny = my / mLen;
        const dot = nx * n1.x + ny * n1.y;
        const scale = Math.min(1.4, 1 / Math.max(0.5, dot));
        nx *= scale;
        ny *= scale;
      }
    }
    res.push({ x: wps[i].x + nx * offset, y: wps[i].y + ny * offset });
  }
  return res;
}

function buildSmoothConnectorCurve(
  p0: Vector2D,
  dir0: number,
  p1: Vector2D,
  dir1: number
): Vector2D[] {
  const dist = getDistance(p0, p1);
  if (dist < 16) return [p0, p1];

  const handle = Math.min(dist * 0.42, 48);
  const c1 = { x: p0.x + Math.cos(dir0) * handle, y: p0.y + Math.sin(dir0) * handle };
  const c2 = { x: p1.x - Math.cos(dir1) * handle, y: p1.y - Math.sin(dir1) * handle };
  const steps = Math.max(4, Math.min(8, Math.ceil(dist / 24)));
  const pts: Vector2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x =
      mt * mt * mt * p0.x +
      3 * mt * mt * t * c1.x +
      3 * mt * t * t * c2.x +
      t * t * t * p1.x;
    const y =
      mt * mt * mt * p0.y +
      3 * mt * mt * t * c1.y +
      3 * mt * t * t * c2.y +
      t * t * t * p1.y;
    pts.push({ x, y });
  }
  return pts;
}

export interface NavGraphNode {
  id: string;
  x: number;
  y: number;
  laneId?: string;
  distParam?: number;
}

export interface NavGraphEdge {
  from: string;
  to: string;
  cost: number;
  road?: RoadSegment;
  laneId?: string;
  isLaneChange?: boolean;
  isConnection?: boolean;
  waypoints: Vector2D[];
}

interface VirtualLane {
  laneId: string;
  road: RoadSegment;
  laneIndex: number;
  waypoints: Vector2D[];
  cumDists: number[];
  totalLen: number;
  startAngle: number;
  endAngle: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  isSynthetic: boolean;
  isSingleTrack: boolean;
  explicitConnections: NonNullable<RoadSegment['lanePaths'][number]['connections']>;
  splitDists: number[];
  splitNodeIds: Map<number, string>;
}

export interface BuiltNavGraph {
  nodes: Map<string, NavGraphNode>;
  adj: Map<string, NavGraphEdge[]>;
  lanes: VirtualLane[];
  laneById: Map<string, VirtualLane>;
  medianBarriers: BarrierSeg[];
}

// Reference (maximum) speed used to turn road length into a travel-time based cost.
const NAV_MAX_SPEED = 130;
const NAV_MIN_SPEED = 20;

/** Effective driving speed of a road: explicit limit if present, otherwise a default by road class. */
function getRoadNavSpeed(road: RoadSegment): number {
  let speed = road.speedLimit;
  if (!speed || speed <= 0) {
    if (road.isDirt) speed = 40;
    else if (road.isGravel) speed = 45;
    else if (road.isAvenue) speed = 60;
    else speed = 50;
  }
  return Math.max(NAV_MIN_SPEED, Math.min(NAV_MAX_SPEED, speed));
}

function getRoadCostMultiplier(road: RoadSegment): number {
  const surfaceMultiplier = road.isDirt ? 1.18 : (road.isGravel ? 1.08 : 1.0);
  const speedMultiplier = NAV_MAX_SPEED / getRoadNavSpeed(road);
  return surfaceMultiplier * speedMultiplier;
}

function makeVirtualLane(
  laneId: string,
  road: RoadSegment,
  laneIndex: number,
  rawWps: Vector2D[],
  isSynthetic: boolean,
  isSingleTrack: boolean,
  explicitConnections: NonNullable<RoadSegment['lanePaths'][number]['connections']>
): VirtualLane | null {
  // Remove consecutive duplicate points
  const wps: Vector2D[] = [];
  for (let i = 0; i < rawWps.length; i++) {
    const p = rawWps[i];
    if (wps.length === 0 || getDistance(wps[wps.length - 1], p) > 0.5) {
      wps.push({ x: p.x, y: p.y });
    }
  }
  if (wps.length < 2) return null;

  const cumDists = computeCumDists(wps);
  const totalLen = cumDists[cumDists.length - 1];
  if (totalLen < 1) return null;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of wps) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const startAngle = Math.atan2(wps[1].y - wps[0].y, wps[1].x - wps[0].x);
  const endAngle = Math.atan2(
    wps[wps.length - 1].y - wps[wps.length - 2].y,
    wps[wps.length - 1].x - wps[wps.length - 2].x
  );

  return {
    laneId,
    road,
    laneIndex,
    waypoints: wps,
    cumDists,
    totalLen,
    startAngle,
    endAngle,
    minX,
    maxX,
    minY,
    maxY,
    isSynthetic,
    isSingleTrack,
    explicitConnections,
    splitDists: [0, totalLen],
    splitNodeIds: new Map<number, string>(),
  };
}

function registerLaneSplit(lane: VirtualLane, distParam: number): number {
  const clamped = Math.max(0, Math.min(lane.totalLen, distParam));
  for (let i = 0; i < lane.splitDists.length; i++) {
    if (Math.abs(lane.splitDists[i] - clamped) < 6) {
      return lane.splitDists[i];
    }
  }
  lane.splitDists.push(clamped);
  return clamped;
}

/**
 * Builds the STATIC directed lane-aware road graph of all roads in world.roads.
 * Respects individual lane geometry, driving direction, explicit intersection turn connections,
 * same-direction lane changes, and central median guardrails.
 */
export function buildRoadNavGraph(world: GameWorld): BuiltNavGraph {
  const nodes = new Map<string, NavGraphNode>();
  const adj = new Map<string, NavGraphEdge[]>();
  const lanes: VirtualLane[] = [];
  const laneById = new Map<string, VirtualLane>();
  const medianBarriers = extractMedianBarrierSegments(world.guardrails);

  // 1. Collect directed lanes from all roads (native lanePaths + synthesized right-hand lanes for unlaned roads)
  const lanesByRoad = new Map<RoadSegment, VirtualLane[]>();
  for (const road of world.roads || []) {
    const roadLanes: VirtualLane[] = [];
    if (road.lanePaths && road.lanePaths.length > 0) {
      for (const lp of road.lanePaths) {
        if (!lp.waypoints || lp.waypoints.length < 2) continue;
        const vl = makeVirtualLane(
          lp.laneId,
          road,
          lp.laneIndex ?? 0,
          lp.waypoints,
          false,
          false,
          lp.connections || []
        );
        if (vl) {
          lanes.push(vl);
          laneById.set(vl.laneId, vl);
          roadLanes.push(vl);
        }
      }
    } else {
      const centerWps = getRoadWaypoints(road);
      if (centerWps.length >= 2) {
        const laneCount = road.lanes ?? 1;
        if (laneCount >= 2) {
          const lanesPerDir = Math.max(1, Math.floor(laneCount / 2));
          const roadW = road.width || lanesPerDir * 2 * 44;
          const laneW = roadW / (lanesPerDir * 2);
          const revWps = [...centerWps].reverse();
          for (let k = 0; k < lanesPerDir; k++) {
            const offset = (k + 0.5) * laneW;
            const fwd = makeVirtualLane(
              `syn_${road.id}_f${k}`,
              road,
              k,
              offsetPolylineRight(centerWps, offset),
              true,
              false,
              []
            );
            if (fwd) {
              lanes.push(fwd);
              laneById.set(fwd.laneId, fwd);
              roadLanes.push(fwd);
            }
            const bwd = makeVirtualLane(
              `syn_${road.id}_r${k}`,
              road,
              k,
              offsetPolylineRight(revWps, offset),
              true,
              false,
              []
            );
            if (bwd) {
              lanes.push(bwd);
              laneById.set(bwd.laneId, bwd);
              roadLanes.push(bwd);
            }
          }
        } else {
          // Single-track dirt/forest road: bidirectional with mild right-side keep offset
          const offset = Math.min(6, (road.width || 24) * 0.12);
          const revWps = [...centerWps].reverse();
          const fwd = makeVirtualLane(
            `syn_${road.id}_f0`,
            road,
            0,
            offsetPolylineRight(centerWps, offset),
            true,
            true,
            []
          );
          const bwd = makeVirtualLane(
            `syn_${road.id}_r0`,
            road,
            0,
            offsetPolylineRight(revWps, offset),
            true,
            true,
            []
          );
          if (fwd) {
            lanes.push(fwd);
            laneById.set(fwd.laneId, fwd);
            roadLanes.push(fwd);
          }
          if (bwd) {
            lanes.push(bwd);
            laneById.set(bwd.laneId, bwd);
            roadLanes.push(bwd);
          }
        }
      }
    }
    if (roadLanes.length > 0) {
      lanesByRoad.set(road, roadLanes);
    }
  }

  // Pending cross-lane edges to wire up once all split nodes are materialized
  interface PendingEdge {
    fromLane: VirtualLane;
    fromDist: number;
    toLane: VirtualLane;
    toDist: number;
    waypoints: Vector2D[];
    extraCost: number;
    isLaneChange: boolean;
    isConnection: boolean;
  }
  const pendingEdges: PendingEdge[] = [];
  const laneHasOutgoingConn = new Set<string>();
  const laneHasIncomingConn = new Set<string>();
  const seenExplicitConn = new Set<string>();

  // 2. Register explicit directed connections from map.json (handles both end-to-start and mid-lane merges/exits!)
  for (const fromLane of lanes) {
    for (const conn of fromLane.explicitConnections) {
      const toLane = laneById.get(conn.targetLaneId);
      if (!toLane) continue;

      const connWps =
        conn.pathWaypoints && conn.pathWaypoints.length >= 2
          ? conn.pathWaypoints.map(p => ({ x: p.x, y: p.y }))
          : null;

      let fromDist = fromLane.totalLen;
      let toDist = 0;

      if (connWps) {
        const startOnFrom = projectPointOntoPolyline(connWps[0], fromLane.waypoints, fromLane.cumDists);
        if (startOnFrom.dist < 55 && fromLane.totalLen - startOnFrom.distParam > 40) {
          fromDist = registerLaneSplit(fromLane, startOnFrom.distParam);
        }
        const endOnTo = projectPointOntoPolyline(connWps[connWps.length - 1], toLane.waypoints, toLane.cumDists);
        if (endOnTo.dist < 55 && endOnTo.distParam > 40) {
          toDist = registerLaneSplit(toLane, endOnTo.distParam);
        }
      }

      const dedupKey = `${fromLane.laneId}@${Math.round(fromDist)}->${toLane.laneId}@${Math.round(toDist)}`;
      if (seenExplicitConn.has(dedupKey)) continue;
      seenExplicitConn.add(dedupKey);

      const fromPt = samplePolylineAtDist(fromLane.waypoints, fromLane.cumDists, fromDist);
      const toPt = samplePolylineAtDist(toLane.waypoints, toLane.cumDists, toDist);
      let wps: Vector2D[];
      if (connWps) {
        wps = [];
        if (getDistance(fromPt.pt, connWps[0]) > 4) wps.push(fromPt.pt);
        wps.push(...connWps);
        if (getDistance(wps[wps.length - 1], toPt.pt) > 4) wps.push(toPt.pt);
      } else {
        wps = buildSmoothConnectorCurve(fromPt.pt, fromPt.angle, toPt.pt, toPt.angle);
      }

      // Guard against bad legacy connections crossing a median barrier
      if (polylineCrossesMedianBarrier(wps, medianBarriers)) continue;

      const turnPenalty =
        conn.turnType === 'turnaround' ? 65 :
        conn.turnType === 'left' ? 22 :
        conn.turnType === 'right' ? 10 : 0;

      pendingEdges.push({
        fromLane,
        fromDist,
        toLane,
        toDist,
        waypoints: wps,
        extraCost: turnPenalty,
        isLaneChange: false,
        isConnection: true,
      });

      if (fromDist >= fromLane.totalLen - 12) {
        laneHasOutgoingConn.add(fromLane.laneId);
      }
      if (toDist <= 12) {
        laneHasIncomingConn.add(toLane.laneId);
      }
    }
  }

  // 3. Same-direction parallel lane-change transitions within each multi-lane road
  for (const [, roadLanes] of lanesByRoad.entries()) {
    if (roadLanes.length < 2) continue;

    // Group lanes travelling in roughly the same direction (< 30 deg apart)
    const dirGroups: VirtualLane[][] = [];
    for (const lane of roadLanes) {
      let placed = false;
      for (const grp of dirGroups) {
        if (Math.abs(angleDiff(lane.startAngle, grp[0].startAngle)) < 0.52) {
          grp.push(lane);
          placed = true;
          break;
        }
      }
      if (!placed) dirGroups.push([lane]);
    }

    for (const grp of dirGroups) {
      if (grp.length < 2) continue;
      // Sort adjacent lanes laterally along the right-hand normal of the group's start heading
      const ref = grp[0];
      const rx = -Math.sin(ref.startAngle);
      const ry = Math.cos(ref.startAngle);
      grp.sort((a, b) => {
        const pa = a.waypoints[0];
        const pb = b.waypoints[0];
        return (pa.x * rx + pa.y * ry) - (pb.x * rx + pb.y * ry);
      });

      for (let gi = 0; gi < grp.length - 1; gi++) {
        const laneA = grp[gi];
        const laneB = grp[gi + 1];
        const minLen = Math.min(laneA.totalLen, laneB.totalLen);
        if (minLen < 120) continue;

        // Place forward-only diagonal lane-change opportunities along the road
        const lcSpan = Math.min(110, Math.max(55, minLen * 0.25));
        const anchorDists: number[] = [];
        // Near start so vehicles entering the wrong lane can merge right away
        anchorDists.push(Math.min(40, minLen * 0.12));
        // Periodic opportunities on long highway segments (every 750px)
        for (let d = 750; d < minLen - lcSpan - 90; d += 750) {
          anchorDists.push(d);
        }
        // Before end so vehicles can move into the proper turn/exit lane before the junction
        const preEnd = minLen - lcSpan - 35;
        if (preEnd > anchorDists[anchorDists.length - 1] + 50) {
          anchorDists.push(preEnd);
        }

        for (const dStart of anchorDists) {
          const dEnd = Math.min(minLen - 10, dStart + lcSpan);
          if (dEnd - dStart < 35) continue;

          // Pair A -> B and B -> A
          const pairs: [VirtualLane, VirtualLane][] = [
            [laneA, laneB],
            [laneB, laneA],
          ];
          for (const [src, dst] of pairs) {
            const pSrc = samplePolylineAtDist(src.waypoints, src.cumDists, dStart);
            const projDstEnd = projectPointOntoPolyline(
              samplePolylineAtDist(src.waypoints, src.cumDists, dEnd).pt,
              dst.waypoints,
              dst.cumDists
            );
            const pDst = samplePolylineAtDist(dst.waypoints, dst.cumDists, projDstEnd.distParam);
            if (segmentCrossesMedianBarrier(pSrc.pt, pDst.pt, medianBarriers)) continue;

            const sDist = registerLaneSplit(src, dStart);
            const eDist = registerLaneSplit(dst, projDstEnd.distParam);
            const wps = buildSmoothConnectorCurve(pSrc.pt, pSrc.angle, pDst.pt, pDst.angle);
            if (polylineCrossesMedianBarrier(wps, medianBarriers)) continue;

            pendingEdges.push({
              fromLane: src,
              fromDist: sDist,
              toLane: dst,
              toDist: eDist,
              waypoints: wps,
              extraCost: 24, // Slight penalty prevents pointless weaving while allowing necessary turn-lane selection
              isLaneChange: true,
              isConnection: false,
            });
          }
        }
      }
    }
  }

  // 4. Fallback auto-bridging ONLY for synthetic roads and lanes missing explicit connections
  //    (e.g. station roads, forest dirt roads, custom curved segments, highway dead-end turnaround)
  const needsAutoBridgeOut = (lane: VirtualLane) => lane.isSynthetic || !laneHasOutgoingConn.has(lane.laneId);
  const needsAutoBridgeIn = (lane: VirtualLane) => lane.isSynthetic || !laneHasIncomingConn.has(lane.laneId);

  const interBoxes: { minX: number; maxX: number; minY: number; maxY: number }[] = (world.intersections || []).map(
    (inter: Intersection) => {
      const hw = Math.max(inter.width || 0, 80) * 0.5 + 35;
      const hh = Math.max(inter.height || 0, 80) * 0.5 + 35;
      return { minX: inter.x - hw, maxX: inter.x + hw, minY: inter.y - hh, maxY: inter.y + hh };
    }
  );
  const isInsideIntersectionBox = (pt: Vector2D) => {
    for (const b of interBoxes) {
      if (pt.x >= b.minX && pt.x <= b.maxX && pt.y >= b.minY && pt.y <= b.maxY) return true;
    }
    return false;
  };

  for (const fromLane of lanes) {
    if (!needsAutoBridgeOut(fromLane)) continue;

    const endPt = fromLane.waypoints[fromLane.waypoints.length - 1];
    const endDir = fromLane.endAngle;
    const inInter = isInsideIntersectionBox(endPt);
    const maxSnap = inInter ? 165 : (fromLane.isSynthetic ? 135 : 95);
    let addedForwardBridge = false;

    for (const toLane of lanes) {
      if (toLane === fromLane) continue;
      if (toLane.road === fromLane.road) continue;

      // Bounding box pre-filter
      if (
        endPt.x < toLane.minX - maxSnap ||
        endPt.x > toLane.maxX + maxSnap ||
        endPt.y < toLane.minY - maxSnap ||
        endPt.y > toLane.maxY + maxSnap
      ) {
        continue;
      }

      const toStart = toLane.waypoints[0];
      const distToStart = getDistance(endPt, toStart);

      if (distToStart <= maxSnap) {
        const headingChange = Math.abs(angleDiff(endDir, toLane.startAngle));
        // Disallow sharp U-turn reversal onto an oncoming lane of an adjoining road
        if (headingChange > 2.35) continue;

        const wps = buildSmoothConnectorCurve(endPt, endDir, toStart, toLane.startAngle);
        if (polylineCrossesMedianBarrier(wps, medianBarriers)) continue;

        const turnPenalty = headingChange > 0.65 ? 18 : 4;
        pendingEdges.push({
          fromLane,
          fromDist: fromLane.totalLen,
          toLane,
          toDist: 0,
          waypoints: wps,
          extraCost: turnPenalty,
          isLaneChange: false,
          isConnection: true,
        });
        addedForwardBridge = true;
        continue;
      }

      // Mid-lane T-junction merge for synthetic roads (e.g., station road meeting M-12 at median gap, or forest trail meeting main road)
      if (fromLane.isSynthetic) {
        const proj = projectPointOntoPolyline(endPt, toLane.waypoints, toLane.cumDists);
        if (proj.dist <= 115 && proj.distParam > 20 && proj.distParam < toLane.totalLen - 20) {
          const headingChange = Math.abs(angleDiff(endDir, proj.angle));
          if (headingChange > 2.45) continue;
          const mergeDist = Math.min(toLane.totalLen - 10, proj.distParam + 28);
          const mergeSample = samplePolylineAtDist(toLane.waypoints, toLane.cumDists, mergeDist);
          const wps = buildSmoothConnectorCurve(endPt, endDir, mergeSample.pt, mergeSample.angle);
          if (polylineCrossesMedianBarrier(wps, medianBarriers)) continue;

          const toSplit = registerLaneSplit(toLane, mergeDist);
          pendingEdges.push({
            fromLane,
            fromDist: fromLane.totalLen,
            toLane,
            toDist: toSplit,
            waypoints: wps,
            extraCost: 20,
            isLaneChange: false,
            isConnection: true,
          });
          addedForwardBridge = true;
        }
      }
    }

    // Dead-end legal turnaround onto opposite lane of the same road (ONLY if no forward continuation and no median barrier)
    if (!addedForwardBridge) {
      const sameRoadLanes = lanesByRoad.get(fromLane.road) || [];
      let bestOpp: VirtualLane | null = null;
      let bestOppDist = Infinity;
      for (const opp of sameRoadLanes) {
        if (opp === fromLane) continue;
        if (Math.abs(angleDiff(endDir, opp.startAngle)) < 2.2) continue; // must be opposite direction
        const d = getDistance(endPt, opp.waypoints[0]);
        if (d < 130 && d < bestOppDist) {
          bestOppDist = d;
          bestOpp = opp;
        }
      }
      if (bestOpp) {
        const toStart = bestOpp.waypoints[0];
        if (!segmentCrossesMedianBarrier(endPt, toStart, medianBarriers)) {
          const wps = buildSmoothConnectorCurve(endPt, endDir, toStart, bestOpp.startAngle);
          if (!polylineCrossesMedianBarrier(wps, medianBarriers)) {
            pendingEdges.push({
              fromLane,
              fromDist: fromLane.totalLen,
              toLane: bestOpp,
              toDist: 0,
              waypoints: wps,
              extraCost: 70,
              isLaneChange: false,
              isConnection: true,
            });
          }
        }
      }
    }
  }

  // Also allow lanes to EXIT mid-segment into synthetic roads whose START touches them (e.g., M-12 -> road_station_highway_main at x=11180)
  for (const toLane of lanes) {
    if (!needsAutoBridgeIn(toLane)) continue;
    if (!toLane.isSynthetic) continue;

    const startPt = toLane.waypoints[0];
    const startDir = toLane.startAngle;

    for (const fromLane of lanes) {
      if (fromLane === toLane || fromLane.road === toLane.road) continue;
      if (
        startPt.x < fromLane.minX - 115 ||
        startPt.x > fromLane.maxX + 115 ||
        startPt.y < fromLane.minY - 115 ||
        startPt.y > fromLane.maxY + 115
      ) {
        continue;
      }

      const proj = projectPointOntoPolyline(startPt, fromLane.waypoints, fromLane.cumDists);
      if (proj.dist <= 115 && proj.distParam > 20 && proj.distParam < fromLane.totalLen - 20) {
        const headingChange = Math.abs(angleDiff(proj.angle, startDir));
        if (headingChange > 2.45) continue;

        const exitDist = Math.max(10, proj.distParam - 28);
        const exitSample = samplePolylineAtDist(fromLane.waypoints, fromLane.cumDists, exitDist);
        const wps = buildSmoothConnectorCurve(exitSample.pt, exitSample.angle, startPt, startDir);
        if (polylineCrossesMedianBarrier(wps, medianBarriers)) continue;

        const fromSplit = registerLaneSplit(fromLane, exitDist);
        pendingEdges.push({
          fromLane,
          fromDist: fromSplit,
          toLane,
          toDist: 0,
          waypoints: wps,
          extraCost: 20,
          isLaneChange: false,
          isConnection: true,
        });
      }
    }
  }

  // 4c. Legal U-turns at open intersections / highway median openings (inner lane -> opposite inner lane of same road)
  for (const [, roadLanes] of lanesByRoad) {
    if (roadLanes.length < 2) continue;
    for (const fromLane of roadLanes) {
      const endPt = fromLane.waypoints[fromLane.waypoints.length - 1];
      const endDir = fromLane.endAngle;
      // Only at real intersections or highway ends (never mid-block)
      if (!isInsideIntersectionBox(endPt) && laneHasOutgoingConn.has(fromLane.laneId)) {
        continue;
      }
      // Pick closest opposite-direction lane on the same road (inner lane pair, <= 72px apart)
      let bestOpp: VirtualLane | null = null;
      let bestDist = Infinity;
      for (const opp of roadLanes) {
        if (opp === fromLane) continue;
        if (Math.abs(angleDiff(endDir, opp.startAngle)) < 2.4) continue;
        const d = getDistance(endPt, opp.waypoints[0]);
        if (d <= 72 && d < bestDist) {
          bestDist = d;
          bestOpp = opp;
        }
      }
      if (!bestOpp) continue;

      const toStart = bestOpp.waypoints[0];
      if (segmentCrossesMedianBarrier(endPt, toStart, medianBarriers)) continue;
      const wps = buildSmoothConnectorCurve(endPt, endDir, toStart, bestOpp.startAngle);
      if (polylineCrossesMedianBarrier(wps, medianBarriers)) continue;

      pendingEdges.push({
        fromLane,
        fromDist: fromLane.totalLen,
        toLane: bestOpp,
        toDist: 0,
        waypoints: wps,
        extraCost: 160,
        isLaneChange: false,
        isConnection: true,
      });
    }
  }

  // 5. Materialize split nodes and forward-only in-lane edges for every VirtualLane
  for (const lane of lanes) {
    lane.splitDists.sort((a, b) => a - b);
    const deduped: number[] = [];
    for (const d of lane.splitDists) {
      if (deduped.length === 0 || d - deduped[deduped.length - 1] > 1.0) {
        deduped.push(d);
      }
    }
    if (deduped[0] > 0.5) deduped.unshift(0);
    if (lane.totalLen - deduped[deduped.length - 1] > 0.5) deduped.push(lane.totalLen);
    lane.splitDists = deduped;

    for (let i = 0; i < lane.splitDists.length; i++) {
      const d = lane.splitDists[i];
      const nodeId = `ln:${lane.laneId}:${i}`;
      const sample = samplePolylineAtDist(lane.waypoints, lane.cumDists, d);
      lane.splitNodeIds.set(d, nodeId);
      nodes.set(nodeId, { id: nodeId, x: sample.pt.x, y: sample.pt.y, laneId: lane.laneId, distParam: d });
      adj.set(nodeId, []);
    }

    const mult = getRoadCostMultiplier(lane.road);
    for (let i = 0; i < lane.splitDists.length - 1; i++) {
      const dA = lane.splitDists[i];
      const dB = lane.splitDists[i + 1];
      const idA = lane.splitNodeIds.get(dA)!;
      const idB = lane.splitNodeIds.get(dB)!;
      const segWps = slicePolyline(lane.waypoints, lane.cumDists, dA, dB);
      const segLen = Math.max(1, dB - dA);
      adj.get(idA)!.push({
        from: idA,
        to: idB,
        cost: segLen * mult,
        road: lane.road,
        laneId: lane.laneId,
        waypoints: segWps,
      });
    }
  }

  // Helper to resolve closest materialized split node on a lane
  const getSplitNodeId = (lane: VirtualLane, dist: number): string => {
    const exact = lane.splitNodeIds.get(dist);
    if (exact) return exact;
    let bestD = lane.splitDists[0];
    let bestDiff = Math.abs(bestD - dist);
    for (let i = 1; i < lane.splitDists.length; i++) {
      const diff = Math.abs(lane.splitDists[i] - dist);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestD = lane.splitDists[i];
      }
    }
    return lane.splitNodeIds.get(bestD)!;
  };

  // 6. Wire up all directed cross-lane edges (intersection curves, lane changes, auto-bridges)
  for (const pe of pendingEdges) {
    const fromId = getSplitNodeId(pe.fromLane, pe.fromDist);
    const toId = getSplitNodeId(pe.toLane, pe.toDist);
    if (!fromId || !toId || fromId === toId) continue;

    let length = 0;
    for (let i = 1; i < pe.waypoints.length; i++) {
      length += getDistance(pe.waypoints[i - 1], pe.waypoints[i]);
    }
    const mult = getRoadCostMultiplier(pe.toLane.road);
    const cost = Math.max(1, length) * mult + pe.extraCost;

    adj.get(fromId)?.push({
      from: fromId,
      to: toId,
      cost,
      road: pe.toLane.road,
      laneId: pe.toLane.laneId,
      isLaneChange: pe.isLaneChange,
      isConnection: pe.isConnection,
      waypoints: pe.waypoints,
    });
  }

  return { nodes, adj, lanes, laneById, medianBarriers };
}

// Module-level cache of the STATIC graph (topology does not depend on traffic)
let cachedWorldRef: GameWorld | null = null;
let cachedGraphObj: BuiltNavGraph | null = null;
let cachedRoadsRef: RoadSegment[] | null = null;
let cachedRoadsLen = -1;
let cachedIntersectionsLen = -1;
let cachedGuardrailsLen = -1;

function getNavGraph(world: GameWorld): BuiltNavGraph {
  if (
    cachedWorldRef === world &&
    cachedGraphObj &&
    cachedRoadsRef === world.roads &&
    cachedRoadsLen === (world.roads?.length ?? 0) &&
    cachedIntersectionsLen === (world.intersections?.length ?? 0) &&
    cachedGuardrailsLen === (world.guardrails?.length ?? 0)
  ) {
    return cachedGraphObj;
  }
  cachedGraphObj = buildRoadNavGraph(world);
  cachedWorldRef = world;
  cachedRoadsRef = world.roads;
  cachedRoadsLen = world.roads?.length ?? 0;
  cachedIntersectionsLen = world.intersections?.length ?? 0;
  cachedGuardrailsLen = world.guardrails?.length ?? 0;
  edgePenaltyCache.clear();
  return cachedGraphObj;
}

// Traffic penalties (jam / accident) are evaluated lazily for the edges A* actually looks at and
// are cached only for a short time, so they follow the real traffic situation.
const PENALTY_TTL_MS = 3000;
const ACCIDENT_PENALTY = 8000;
const JAM_PENALTY = 4000;
const MAX_EDGE_PENALTY = 24000;
const PENALTY_CHORD_LEN = 600;
const edgePenaltyCache = new Map<NavGraphEdge, { t: number; penalty: number }>();

function getEdgeBlockPenalty(world: GameWorld, edge: NavGraphEdge): number {
  if (!edge.road || edge.isLaneChange || edge.isConnection) return 0;

  const now = Date.now();
  const cached = edgePenaltyCache.get(edge);
  if (cached && now - cached.t < PENALTY_TTL_MS) return cached.penalty;

  const wps = edge.waypoints;
  let penalty = 0;
  let chunkStart = wps[0];
  let acc = 0;
  for (let i = 1; i < wps.length && penalty < MAX_EDGE_PENALTY; i++) {
    acc += getDistance(wps[i - 1], wps[i]);
    if (acc >= PENALTY_CHORD_LEN || i === wps.length - 1) {
      // Narrow per-lane corridor (26px) so oncoming traffic does not falsely block an open carriageway
      const block = isRoadSegmentBlocked(world, chunkStart.x, chunkStart.y, wps[i].x, wps[i].y, {
        ignorePlayer: true,
        jamClusterRadius: 350,
        corridorHalfWidth: 26,
      });
      if (block.hasAccident) penalty += ACCIDENT_PENALTY;
      else if (block.hasJam) penalty += JAM_PENALTY;
      chunkStart = wps[i];
      acc = 0;
    }
  }
  penalty = Math.min(penalty, MAX_EDGE_PENALTY);

  edgePenaltyCache.set(edge, { t: now, penalty });
  return penalty;
}

interface LaneProjection {
  lane: VirtualLane;
  proj: Vector2D;
  distParam: number;
  dist: number;
  angle: number;
  crossesBarrier: boolean;
  score: number;
}

function findCandidateLaneProjections(
  pt: Vector2D,
  graph: BuiltNavGraph,
  opts?: { headingAngle?: number; preferredLaneId?: string }
): LaneProjection[] {
  const raw: LaneProjection[] = [];
  let minSafeDist = Infinity;
  let minAnyDist = Infinity;

  for (const lane of graph.lanes) {
    // Fast AABB rejection once we already have a close lane
    const rejectDist = Math.min(minAnyDist + 260, 1200);
    if (
      pt.x < lane.minX - rejectDist ||
      pt.x > lane.maxX + rejectDist ||
      pt.y < lane.minY - rejectDist ||
      pt.y > lane.maxY + rejectDist
    ) {
      continue;
    }

    const { proj, distParam, dist, angle } = projectPointOntoPolyline(pt, lane.waypoints, lane.cumDists);
    const crossesBarrier = segmentCrossesMedianBarrier(pt, proj, graph.medianBarriers);

    if (dist < minAnyDist) minAnyDist = dist;
    if (!crossesBarrier && dist < minSafeDist) minSafeDist = dist;

    raw.push({ lane, proj, distParam, dist, angle, crossesBarrier, score: dist });
  }

  if (raw.length === 0) return [];

  // Prefer barrier-free projections whenever any exist within reasonable range
  const hasSafe = Number.isFinite(minSafeDist) && minSafeDist < minAnyDist + 320;
  const filtered = hasSafe
    ? raw.filter(c => !c.crossesBarrier && c.dist <= minSafeDist + 130)
    : raw.filter(c => c.dist <= minAnyDist + 130);

  // Score by distance + heading alignment + preferred lane
  for (const c of filtered) {
    let penalty = 0;
    if (opts?.preferredLaneId && c.lane.laneId === opts.preferredLaneId) {
      penalty -= 60;
    }
    if (opts?.headingAngle !== undefined) {
      const dot = Math.cos(angleDiff(c.angle, opts.headingAngle));
      if (dot < -0.25) {
        // Opposite direction of travel: heavy penalty so GPS stays in current carriageway
        penalty += 380;
      } else if (dot < 0.35) {
        penalty += 75;
      }
    }
    c.score = c.dist + penalty;
  }

  filtered.sort((a, b) => a.score - b.score);

  // If headingAngle was supplied and we have a well-aligned, barrier-free close lane,
  // exclude opposite-direction lanes so the route never jumps across the centerline into oncoming traffic!
  if (opts?.headingAngle !== undefined && filtered.length > 1) {
    const alignedClose = filtered.filter(
      c => !c.crossesBarrier && c.dist <= minSafeDist + 95 && Math.cos(angleDiff(c.angle, opts.headingAngle!)) > 0.2
    );
    if (alignedClose.length > 0) {
      return alignedClose.slice(0, 6);
    }
  }

  return filtered.slice(0, 8);
}

export interface GpsRouteOptions {
  /** Current heading angle (radians) at the start point (e.g., vehicle.angle). */
  startAngle?: number;
  /** Current laneId if known (e.g., AI vehicle's currentLaneId). */
  startLaneId?: string;
  /** Desired arrival heading angle (radians) at the destination. */
  endAngle?: number;
  /** Desired destination laneId if known. */
  endLaneId?: string;
}

/**
 * Directed, lane-aware A* navigation along all roads in the game world.
 * Respects right-hand traffic lanes, driving direction, explicit intersection turn curves,
 * legal turnarounds, and central median guardrails.
 */
export function calculateGpsRoute(
  world: GameWorld,
  start: Vector2D,
  end: Vector2D,
  ignoreBlocks: boolean = false,
  options?: GpsRouteOptions
): Vector2D[] {
  const directDist = getDistance(start, end);
  if (directDist < 30) {
    return [start, end];
  }

  if (!world.roads || world.roads.length === 0) {
    return [start, end];
  }

  const graph = getNavGraph(world);
  if (graph.nodes.size === 0 || graph.lanes.length === 0) {
    return [start, end];
  }

  const startCandidates = findCandidateLaneProjections(start, graph, {
    headingAngle: options?.startAngle,
    preferredLaneId: options?.startLaneId,
  });
  const endCandidates = findCandidateLaneProjections(end, graph, {
    headingAngle: options?.endAngle,
    preferredLaneId: options?.endLaneId,
  });

  if (startCandidates.length === 0 || endCandidates.length === 0) {
    return [start, end];
  }

  const startNodeId = 'temp_start_node';
  const endNodeId = 'temp_end_node';

  // Use overlay maps instead of cloning all adjacency lists on every query
  const extraNodes = new Map<string, NavGraphNode>();
  extraNodes.set(startNodeId, { id: startNodeId, x: start.x, y: start.y });
  extraNodes.set(endNodeId, { id: endNodeId, x: end.x, y: end.y });

  const extraAdj = new Map<string, NavGraphEdge[]>();
  const addExtraEdge = (edge: NavGraphEdge) => {
    let list = extraAdj.get(edge.from);
    if (!list) {
      list = [];
      extraAdj.set(edge.from, list);
    }
    list.push(edge);
  };

  // Connect temp_start_node FORWARD onto each candidate start lane's next split node
  for (const sc of startCandidates) {
    const lane = sc.lane;
    const mult = getRoadCostMultiplier(lane.road);
    const entryPenalty = Math.max(0, sc.score - sc.dist);

    // Find first split node strictly at or ahead of sc.distParam
    let nextSplitIdx = lane.splitDists.length - 1;
    for (let i = 0; i < lane.splitDists.length; i++) {
      if (lane.splitDists[i] >= sc.distParam - 1) {
        nextSplitIdx = i;
        break;
      }
    }
    const nextDist = lane.splitDists[nextSplitIdx];
    const targetNodeId = lane.splitNodeIds.get(nextDist)!;
    const segWps = slicePolyline(lane.waypoints, lane.cumDists, sc.distParam, nextDist);
    const alongLen = Math.max(0, nextDist - sc.distParam);

    addExtraEdge({
      from: startNodeId,
      to: targetNodeId,
      cost: sc.dist + entryPenalty + alongLen * mult,
      road: lane.road,
      laneId: lane.laneId,
      waypoints: segWps,
    });
  }

  // Connect each candidate end lane's preceding split node FORWARD to temp_end_node
  for (const ec of endCandidates) {
    const lane = ec.lane;
    const mult = getRoadCostMultiplier(lane.road);

    let prevSplitIdx = 0;
    for (let i = lane.splitDists.length - 1; i >= 0; i--) {
      if (lane.splitDists[i] <= ec.distParam + 1) {
        prevSplitIdx = i;
        break;
      }
    }
    const prevDist = lane.splitDists[prevSplitIdx];
    const fromNodeId = lane.splitNodeIds.get(prevDist)!;
    const segWps = slicePolyline(lane.waypoints, lane.cumDists, prevDist, ec.distParam);
    const alongLen = Math.max(0, ec.distParam - prevDist);

    addExtraEdge({
      from: fromNodeId,
      to: endNodeId,
      cost: alongLen * mult + ec.dist,
      road: lane.road,
      laneId: lane.laneId,
      waypoints: segWps,
    });
  }

  // Direct same-lane forward edge when start and end lie on the same directed lane with end AHEAD of start
  for (const sc of startCandidates) {
    for (const ec of endCandidates) {
      if (sc.lane === ec.lane && ec.distParam >= sc.distParam - 2) {
        const lane = sc.lane;
        const mult = getRoadCostMultiplier(lane.road);
        const entryPenalty = Math.max(0, sc.score - sc.dist);
        const segWps = slicePolyline(lane.waypoints, lane.cumDists, sc.distParam, ec.distParam);
        const alongLen = Math.max(0, ec.distParam - sc.distParam);
        addExtraEdge({
          from: startNodeId,
          to: endNodeId,
          cost: sc.dist + entryPenalty + alongLen * mult + ec.dist,
          road: lane.road,
          laneId: lane.laneId,
          waypoints: segWps,
        });
      }
    }
  }

  const getNode = (id: string): NavGraphNode | undefined => extraNodes.get(id) ?? graph.nodes.get(id);

  // Binary min-heap for fast A* search over directed lane graph
  const heapIds: string[] = [startNodeId];
  const heapF: number[] = [getDistance(start, end)];
  const heapPush = (id: string, f: number) => {
    let idx = heapIds.length;
    heapIds.push(id);
    heapF.push(f);
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (heapF[parent] <= f) break;
      heapIds[idx] = heapIds[parent];
      heapF[idx] = heapF[parent];
      idx = parent;
    }
    heapIds[idx] = id;
    heapF[idx] = f;
  };
  const heapPop = (): string | null => {
    const n = heapIds.length;
    if (n === 0) return null;
    const top = heapIds[0];
    const lastId = heapIds.pop()!;
    const lastF = heapF.pop()!;
    if (n > 1) {
      let idx = 0;
      const half = (n - 1) >> 1;
      while (idx < half) {
        let left = (idx << 1) + 1;
        const right = left + 1;
        if (right < n - 1 && heapF[right] < heapF[left]) left = right;
        if (lastF <= heapF[left]) break;
        heapIds[idx] = heapIds[left];
        heapF[idx] = heapF[left];
        idx = left;
      }
      heapIds[idx] = lastId;
      heapF[idx] = lastF;
    }
    return top;
  };

  const cameFrom = new Map<string, { prevNodeId: string; edge: NavGraphEdge }>();
  const gScore = new Map<string, number>();
  gScore.set(startNodeId, 0);
  const closedSet = new Set<string>();

  let bestReachedNodeId = startNodeId;
  let bestDistToEnd = getDistance(start, end);

  while (heapIds.length > 0) {
    const currentId = heapPop();
    if (!currentId) break;
    if (closedSet.has(currentId)) continue;
    closedSet.add(currentId);

    if (currentId === endNodeId) {
      return reconstructPath(start, end, startNodeId, endNodeId, cameFrom, graph.medianBarriers);
    }

    const currNode = getNode(currentId);
    if (currNode && currentId !== startNodeId) {
      const d = getDistance(currNode, end);
      if (d < bestDistToEnd) {
        bestDistToEnd = d;
        bestReachedNodeId = currentId;
      }
    }

    const currG = gScore.get(currentId) ?? Infinity;
    const baseEdges = graph.adj.get(currentId);
    const addedEdges = extraAdj.get(currentId);

    const relaxEdge = (edge: NavGraphEdge) => {
      const neighborId = edge.to;
      if (closedSet.has(neighborId)) return;
      const blockPenalty = ignoreBlocks ? 0 : getEdgeBlockPenalty(world, edge);
      const tentativeG = currG + edge.cost + blockPenalty;

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, { prevNodeId: currentId, edge });
        gScore.set(neighborId, tentativeG);
        const nNode = getNode(neighborId);
        const h = nNode ? getDistance(nNode, end) : 0;
        heapPush(neighborId, tentativeG + h);
      }
    };

    if (baseEdges) {
      for (let i = 0; i < baseEdges.length; i++) relaxEdge(baseEdges[i]);
    }
    if (addedEdges) {
      for (let i = 0; i < addedEdges.length; i++) relaxEdge(addedEdges[i]);
    }
  }

  // Fallback if exact directed path to endNodeId was unreachable: route to closest reachable lane node
  if (bestReachedNodeId !== startNodeId) {
    return reconstructPath(start, end, startNodeId, bestReachedNodeId, cameFrom, graph.medianBarriers);
  }

  return [start, startCandidates[0].proj, endCandidates[0].proj, end];
}

function reconstructPath(
  start: Vector2D,
  end: Vector2D,
  startNodeId: string,
  targetNodeId: string,
  cameFrom: Map<string, { prevNodeId: string; edge: NavGraphEdge }>,
  medianBarriers: BarrierSeg[]
): Vector2D[] {
  const edgeSeq: NavGraphEdge[] = [];
  let curr = targetNodeId;

  while (curr !== startNodeId) {
    const entry = cameFrom.get(curr);
    if (!entry) break;
    edgeSeq.unshift(entry.edge);
    curr = entry.prevNodeId;
  }

  const rawWaypoints: Vector2D[] = [start];

  for (let i = 0; i < edgeSeq.length; i++) {
    const wps = edgeSeq[i].waypoints;
    for (let k = 0; k < wps.length; k++) {
      rawWaypoints.push(wps[k]);
    }
  }

  // Only append final off-road leg to exact target point if it does not cross a median guardrail
  const lastOnRoad = rawWaypoints[rawWaypoints.length - 1];
  if (!lastOnRoad || !segmentCrossesMedianBarrier(lastOnRoad, end, medianBarriers)) {
    rawWaypoints.push(end);
  }

  // Clean up duplicate adjacent waypoints
  const cleaned: Vector2D[] = [];
  for (let i = 0; i < rawWaypoints.length; i++) {
    if (i === 0) {
      cleaned.push(rawWaypoints[i]);
    } else {
      const prev = cleaned[cleaned.length - 1];
      const currPt = rawWaypoints[i];
      if (getDistance(prev, currPt) > 3 || i === rawWaypoints.length - 1) {
        cleaned.push(currPt);
      }
    }
  }

  return cleaned;
}

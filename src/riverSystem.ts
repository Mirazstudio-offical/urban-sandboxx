// --- RIVER SYSTEM: CATMULL-ROM SPLINE, ASYMMETRIC THALWEG BATHYMETRY, FLUID DYNAMICS & OPTICAL HYDROLOGY ---
// Defines the northern river "Быстрица", organic spline riverbeds, helicoidal bend bathymetry,
// Beer-Lambert optical absorption, cellular sunlight caustics, dispersive capillary-gravity wave rings,
// Kelvin V-wakes, contour-clipped vehicle/player submersion, and subsurface light scattering.

import { GameWorld, Pedestrian, Player, Vehicle } from './types';
import { isWorldFreezing } from './calendarSystem';
import { getCurrentSunShadowState } from './shadowSystem';
import { getVehicleBasePolygon } from './vehicleVisuals';
import { traceSoftbodyPath } from './softbodyVisuals';
import { RemotePlayerState } from './onlineSystem';

export interface RiverWaypoint {
  x: number;
  y: number;
  width: number;        // River channel width at this point (px)
  depth: number;        // Max depth at channel thalweg (meters, e.g. 1.6m)
  currentSpeed: number; // Flow velocity in px/s (e.g. 35 px/s)
  isFord?: boolean;     // Shallow ford crossing (depth ~0.35m - 0.45m)
  isBridge?: boolean;   // Logging bridge overhead
}

export interface RiverSplinePoint {
  x: number;
  y: number;
  tx: number; // Tangent X (downstream flow unit vector)
  ty: number; // Tangent Y
  nx: number; // Normal X (pointing left bank looking downstream)
  ny: number; // Normal Y
  halfWidth: number;
  depth: number;
  currentSpeed: number;
  isFord: boolean;
  isBridge: boolean;
  innerSandLeft: number;  // Extra sand width on left bank (for inner bends)
  innerSandRight: number; // Extra sand width on right bank (for inner bends)
  bendCurvature: number;  // Signed curvature (+ turning left, - turning right)
  thalwegBias: number;    // Lateral shift of deepest channel (-0.42..+0.42 of halfWidth toward outer cut-bank)
  froudeNumber: number;   // Local Froude number v / sqrt(g * h) driving riffle whitewater & turbulence
}

// Floating river debris item (twigs, leaves, bark chips, foam clusters)
export interface RiverFloatingDebris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spinSpeed: number;
  size: number;
  type: 'leaf_yellow' | 'leaf_red' | 'leaf_orange' | 'branch_pine' | 'twig' | 'bark_chip' | 'foam_patch';
  seed: number;
  wobbleFreq: number;
  wobbleAmp: number;
}

// Persistent dispersive water wave ring / wake packet in world space
export interface WaterDisturbance {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  intensity: number; // 0..1 initial wave energy
  age: number;
  maxAge: number;
  angle: number;
  isDirectionalWake: boolean;
  foamIntensity: number;
}

// Organic centerline waypoints of River "Быстрица" winding gracefully across the northern wilderness
export const RIVER_WAYPOINTS: RiverWaypoint[] = [
  { x: -3000, y: -3900, width: 150, depth: 1.3, currentSpeed: 28 },
  { x: -2000, y: -3850, width: 150, depth: 1.3, currentSpeed: 28 },
  { x: -1000, y: -3900, width: 155, depth: 1.4, currentSpeed: 30 },
  { x: 0,     y: -3820, width: 160, depth: 1.4, currentSpeed: 30 },
  { x: 1000,  y: -3860, width: 160, depth: 1.5, currentSpeed: 31 },
  { x: 2000,  y: -3750, width: 165, depth: 1.5, currentSpeed: 32 },
  { x: 3000,  y: -3800, width: 165, depth: 1.5, currentSpeed: 32 },
  { x: 4000,  y: -3680, width: 170, depth: 1.6, currentSpeed: 33 },
  { x: 5000,  y: -3720, width: 170, depth: 1.6, currentSpeed: 34 },
  { x: 6000,  y: -3600, width: 175, depth: 1.6, currentSpeed: 34 },
  { x: 7000,  y: -3550, width: 175, depth: 1.7, currentSpeed: 35 },
  { x: 8000,  y: -3480, width: 180, depth: 1.7, currentSpeed: 35 },
  { x: 8800,  y: -3380, width: 180, depth: 1.7, currentSpeed: 36 },
  // Old Logging Wooden Bridge at x: 9400, y: -3300
  { x: 9400,  y: -3300, width: 160, depth: 1.8, currentSpeed: 38, isBridge: true },
  { x: 10200, y: -3220, width: 180, depth: 1.9, currentSpeed: 35 },
  { x: 11000, y: -3160, width: 190, depth: 2.0, currentSpeed: 32 },
  { x: 11800, y: -3120, width: 210, depth: 1.7, currentSpeed: 30 },
  // River Ford "Каменистый Брод" at x: 12400 (Wider & shallow gravel crossing)
  { x: 12400, y: -3080, width: 240, depth: 0.38, currentSpeed: 42, isFord: true },
  { x: 13200, y: -3020, width: 200, depth: 1.6, currentSpeed: 34 },
  // Deep river pool "Тихий Плёс" & Fishing Piers at x: 14200
  { x: 14200, y: -2950, width: 260, depth: 2.6, currentSpeed: 20 },
  { x: 15400, y: -2880, width: 190, depth: 1.9, currentSpeed: 32 },
  { x: 16800, y: -2820, width: 180, depth: 1.8, currentSpeed: 34 },
  { x: 18200, y: -2750, width: 185, depth: 1.8, currentSpeed: 35 },
  { x: 19600, y: -2700, width: 175, depth: 1.7, currentSpeed: 35 },
  { x: 21000, y: -2640, width: 180, depth: 1.8, currentSpeed: 33 },
  { x: 22400, y: -2580, width: 190, depth: 1.9, currentSpeed: 32 },
  { x: 24000, y: -2520, width: 170, depth: 1.8, currentSpeed: 36 },
  { x: 25500, y: -2480, width: 180, depth: 1.7, currentSpeed: 34 },
  { x: 27000, y: -2420, width: 200, depth: 2.1, currentSpeed: 30 },
  { x: 29000, y: -2380, width: 220, depth: 2.2, currentSpeed: 28 },
  { x: 31200, y: -2350, width: 230, depth: 2.3, currentSpeed: 26 },
  { x: 33800, y: -2320, width: 210, depth: 2.0, currentSpeed: 30 },
  { x: 36500, y: -2300, width: 220, depth: 2.1, currentSpeed: 32 },
  { x: 39500, y: -2280, width: 230, depth: 2.3, currentSpeed: 28 },
  { x: 42800, y: -2260, width: 250, depth: 2.4, currentSpeed: 25 },
  { x: 46000, y: -2240, width: 270, depth: 2.5, currentSpeed: 22 },
  { x: 49500, y: -2200, width: 300, depth: 2.8, currentSpeed: 20 }
];

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function catmullRomDeriv(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  return 0.5 * (
    (-p0 + p2) +
    2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t +
    3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2
  );
}

function riverHash(n: number): number {
  const x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
}

function buildRiverSpline(): RiverSplinePoint[] {
  const pts: RiverSplinePoint[] = [];
  const stepsPerSeg = 16;
  const N = RIVER_WAYPOINTS.length;

  for (let i = 0; i < N - 1; i++) {
    const w0 = RIVER_WAYPOINTS[Math.max(0, i - 1)];
    const w1 = RIVER_WAYPOINTS[i];
    const w2 = RIVER_WAYPOINTS[i + 1];
    const w3 = RIVER_WAYPOINTS[Math.min(N - 1, i + 2)];

    const endS = (i === N - 2) ? stepsPerSeg : stepsPerSeg - 1;
    for (let s = 0; s <= endS; s++) {
      const t = s / stepsPerSeg;
      const x = catmullRom(w0.x, w1.x, w2.x, w3.x, t);
      const y = catmullRom(w0.y, w1.y, w2.y, w3.y, t);

      const dx = catmullRomDeriv(w0.x, w1.x, w2.x, w3.x, t);
      const dy = catmullRomDeriv(w0.y, w1.y, w2.y, w3.y, t);
      const len = Math.hypot(dx, dy) || 1;
      const tx = dx / len;
      const ty = dy / len;
      const nx = -ty;
      const ny = tx;

      // Smooth Hermite interpolation for width, depth, and current speed
      const smoothT = t * t * (3 - 2 * t);
      const width = w1.width + smoothT * (w2.width - w1.width);
      const depth = w1.depth + smoothT * (w2.depth - w1.depth);
      const currentSpeed = w1.currentSpeed + smoothT * (w2.currentSpeed - w1.currentSpeed);
      const isFord = Boolean(w1.isFord || w2.isFord) && Math.abs(x - 12400) < 260;
      const isBridge = Boolean(w1.isBridge || w2.isBridge) || Math.abs(x - 9400) < 160 || (x >= 23500 && x <= 24100);

      // Froude number proxy: v_m_s / sqrt(g * depth)
      const vMs = currentSpeed * 0.055;
      const froudeNumber = vMs / Math.sqrt(9.81 * Math.max(0.25, depth));

      pts.push({
        x, y, tx, ty, nx, ny,
        halfWidth: width / 2,
        depth,
        currentSpeed,
        isFord,
        isBridge,
        innerSandLeft: 16,
        innerSandRight: 16,
        bendCurvature: 0,
        thalwegBias: 0,
        froudeNumber
      });
    }
  }

  // Compute helicoidal bend curvature, point-bar sandbars, and asymmetric thalweg shift
  for (let k = 2; k < pts.length - 2; k++) {
    const pPrev = pts[k - 2];
    const pNext = pts[k + 2];
    const cross = pPrev.tx * pNext.ty - pPrev.ty * pNext.tx;
    pts[k].bendCurvature = cross;

    // Positive cross = turning left -> Left bank (+N) is inner point-bar (deposit sand), Right bank (-N) is outer cut-bank (deep thalweg)
    // Negative cross = turning right -> Right bank (-N) is inner point-bar, Left bank (+N) is outer cut-bank
    const bendStrength = Math.min(1.0, Math.abs(cross) * 3.0);
    pts[k].thalwegBias = Math.max(-0.38, Math.min(0.38, -cross * 1.4));

    if (cross > 0.06) {
      pts[k].innerSandLeft = 16 + bendStrength * 46;
      pts[k].innerSandRight = 10;
    } else if (cross < -0.06) {
      pts[k].innerSandRight = 16 + bendStrength * 46;
      pts[k].innerSandLeft = 10;
    }
  }

  return pts;
}

export const RIVER_SPLINE_POINTS: RiverSplinePoint[] = buildRiverSpline();

// Bounding box of entire river for ultra-fast spatial rejection
const RIVER_MIN_X = -3500;
const RIVER_MAX_X = 50500;
const RIVER_MIN_Y = -4200;
const RIVER_MAX_Y = -1800;

// Bucket spatial index for O(1) spatial queries
const BUCKET_SIZE = 800;
const BUCKET_COUNT = Math.ceil((RIVER_MAX_X - RIVER_MIN_X) / BUCKET_SIZE) + 2;
const RIVER_BUCKETS: number[][] = Array.from({ length: BUCKET_COUNT }, () => []);

(function buildBuckets() {
  for (let i = 0; i < RIVER_SPLINE_POINTS.length; i++) {
    const pt = RIVER_SPLINE_POINTS[i];
    const bIdx = Math.floor((pt.x - RIVER_MIN_X) / BUCKET_SIZE);
    if (bIdx >= 0 && bIdx < BUCKET_COUNT) {
      RIVER_BUCKETS[bIdx].push(i);
      if (bIdx > 0 && !RIVER_BUCKETS[bIdx - 1].includes(i)) RIVER_BUCKETS[bIdx - 1].push(i);
      if (bIdx < BUCKET_COUNT - 1 && !RIVER_BUCKETS[bIdx + 1].includes(i)) RIVER_BUCKETS[bIdx + 1].push(i);
    }
  }
})();

// --- PERSISTENT WATER WAVE RING & KELVIN WAKE SOLVER ---
const MAX_WATER_DISTURBANCES = 180;
const waterDisturbances: WaterDisturbance[] = [];
let lastDisturbanceEmitMap = new Map<string, number>();

export function emitWaterDisturbance(
  x: number,
  y: number,
  vx: number,
  vy: number,
  radius: number = 6,
  intensity: number = 0.6,
  isDirectionalWake: boolean = false,
  key?: string,
  minIntervalMs: number = 55
) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const now = performance.now();
  if (key) {
    const prev = lastDisturbanceEmitMap.get(key) || 0;
    if (now - prev < minIntervalMs) return;
    lastDisturbanceEmitMap.set(key, now);
    if (lastDisturbanceEmitMap.size > 256) {
      lastDisturbanceEmitMap.clear();
    }
  }

  const speed = Math.hypot(vx, vy);
  const angle = speed > 1 ? Math.atan2(vy, vx) : 0;
  const maxR = Math.min(95, radius * (isDirectionalWake ? 3.8 : 4.6) + speed * 0.16);
  const maxAge = isDirectionalWake ? (1.1 + Math.min(1.0, intensity * 0.9)) : (1.5 + Math.min(1.2, intensity));

  if (waterDisturbances.length >= MAX_WATER_DISTURBANCES) {
    waterDisturbances.shift();
  }

  waterDisturbances.push({
    x,
    y,
    vx: vx * 0.12,
    vy: vy * 0.12,
    radius: Math.max(2.0, radius * 0.65),
    maxRadius: maxR,
    intensity: Math.max(0.08, Math.min(1.0, intensity)),
    age: 0,
    maxAge,
    angle,
    isDirectionalWake,
    foamIntensity: Math.min(1.0, (speed / 95) * intensity)
  });
}

function updateWaterDisturbances(dt: number) {
  for (let i = waterDisturbances.length - 1; i >= 0; i--) {
    const w = waterDisturbances[i];
    w.age += dt;
    if (w.age >= w.maxAge) {
      waterDisturbances.splice(i, 1);
      continue;
    }
    const river = getRiverWaterAt(w.x, w.y);
    const curVx = river.inWater ? river.currentVx * 0.75 : 0;
    const curVy = river.inWater ? river.currentVy * 0.75 : 0;
    w.x += (w.vx + curVx) * dt;
    w.y += (w.vy + curVy) * dt;
    w.vx *= Math.pow(0.25, dt);
    w.vy *= Math.pow(0.25, dt);

    // Capillary-gravity dispersion: fast initial phase velocity, decelerating as wavelength stretches
    const progress = w.age / w.maxAge;
    const expandRate = (w.maxRadius - w.radius) / Math.max(0.15, w.maxAge - w.age * 0.7);
    w.radius += expandRate * dt * (1.15 - progress * 0.45);
  }
}

// --- DYNAMIC RIVER FLOATING DEBRIS SIMULATION ---
const DEBRIS_TYPES: Array<RiverFloatingDebris['type']> = [
  'leaf_yellow', 'leaf_red', 'leaf_orange', 'branch_pine', 'twig', 'bark_chip', 'foam_patch'
];

function initFloatingDebris(): RiverFloatingDebris[] {
  const debris: RiverFloatingDebris[] = [];
  const count = 110;
  for (let i = 0; i < count; i++) {
    const ptIdx = Math.floor((i / count) * (RIVER_SPLINE_POINTS.length - 20)) + 5;
    const pt = RIVER_SPLINE_POINTS[ptIdx];
    const latOffset = (riverHash(i * 19.3) * 2 - 1) * 0.75 * pt.halfWidth;
    const type = DEBRIS_TYPES[Math.floor(riverHash(i * 7.7) * DEBRIS_TYPES.length)];
    debris.push({
      x: pt.x + pt.nx * latOffset,
      y: pt.y + pt.ny * latOffset,
      vx: pt.tx * pt.currentSpeed,
      vy: pt.ty * pt.currentSpeed,
      angle: riverHash(i * 3.1) * Math.PI * 2,
      spinSpeed: (riverHash(i * 5.3) - 0.5) * 0.8,
      size: 3 + riverHash(i * 11.2) * 5,
      type,
      seed: i,
      wobbleFreq: 1.5 + riverHash(i * 13.7) * 2.5,
      wobbleAmp: 3 + riverHash(i * 17.1) * 4
    });
  }
  return debris;
}

let floatingDebrisList: RiverFloatingDebris[] = initFloatingDebris();
let lastDebrisUpdate = Date.now();

export function updateRiverDebris(dt: number) {
  updateWaterDisturbances(dt);

  for (let i = 0; i < floatingDebrisList.length; i++) {
    const d = floatingDebrisList[i];
    const water = getRiverWaterAt(d.x, d.y);

    if (water.inWater) {
      d.vx = water.currentVx;
      d.vy = water.currentVy;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.angle += (d.spinSpeed + (water.turbulence || 0) * 0.6) * dt;
    } else {
      d.x += (d.vx || 20) * dt;
      d.y += (d.vy || 0) * dt;
    }

    if (d.x > RIVER_MAX_X - 200 || d.x < RIVER_MIN_X - 100 || (!water.inWater && d.x > 8000)) {
      const respawnIdx = 5 + Math.floor(riverHash(d.seed * 31.7 + Date.now() * 0.0001) * 30);
      const pt = RIVER_SPLINE_POINTS[Math.min(RIVER_SPLINE_POINTS.length - 1, respawnIdx)];
      const latOffset = (riverHash(d.seed * 43.1) * 2 - 1) * 0.65 * pt.halfWidth;
      d.x = pt.x + pt.nx * latOffset;
      d.y = pt.y + pt.ny * latOffset;
      d.vx = pt.tx * pt.currentSpeed;
      d.vy = pt.ty * pt.currentSpeed;
    }
  }
}

export interface RiverWaterInfo {
  inWater: boolean;
  depth: number;         // Water depth in meters (0 if outside)
  distToCenter: number;  // Distance in pixels from river centerline
  signedLateral: number; // Signed distance (+ left bank, - right bank)
  halfWidth: number;
  currentVx: number;     // River current velocity X in px/s
  currentVy: number;     // River current velocity Y in px/s
  isFord: boolean;
  isBridge: boolean;     // True if standing on bridge over water
  surfaceType: 'water' | 'river_mud' | 'river_sand' | 'land';
  turbulence?: number;   // 0..1 local hydraulic turbulence / whitewater intensity
  bottomSlopeX?: number; // Riverbed gradient X (pointing toward deeper water)
  bottomSlopeY?: number; // Riverbed gradient Y
}

/**
 * Returns comprehensive river water information at given world coordinates,
 * with continuous segment interpolation and asymmetric helicoidal bend bathymetry.
 */
export function getRiverWaterAt(x: number, y: number): RiverWaterInfo {
  if (x < RIVER_MIN_X || x > RIVER_MAX_X || y < RIVER_MIN_Y || y > RIVER_MAX_Y) {
    return {
      inWater: false,
      depth: 0,
      distToCenter: 9999,
      signedLateral: 0,
      halfWidth: 0,
      currentVx: 0,
      currentVy: 0,
      isFord: false,
      isBridge: false,
      surfaceType: 'land',
      turbulence: 0,
      bottomSlopeX: 0,
      bottomSlopeY: 0
    };
  }

  const bIdx = Math.floor((x - RIVER_MIN_X) / BUCKET_SIZE);
  const indices = (bIdx >= 0 && bIdx < BUCKET_COUNT) ? RIVER_BUCKETS[bIdx] : [];
  if (indices.length === 0) {
    return {
      inWater: false,
      depth: 0,
      distToCenter: 9999,
      signedLateral: 0,
      halfWidth: 0,
      currentVx: 0,
      currentVy: 0,
      isFord: false,
      isBridge: false,
      surfaceType: 'land',
      turbulence: 0,
      bottomSlopeX: 0,
      bottomSlopeY: 0
    };
  }

  let minDistSq = Infinity;
  let bestP1 = RIVER_SPLINE_POINTS[indices[0]];
  let bestP2 = bestP1;
  let bestT = 0;
  let bestProjX = bestP1.x;
  let bestProjY = bestP1.y;

  for (let idx = 0; idx < indices.length - 1; idx++) {
    const i = indices[idx];
    const p1 = RIVER_SPLINE_POINTS[i];
    const p2 = RIVER_SPLINE_POINTS[Math.min(RIVER_SPLINE_POINTS.length - 1, i + 1)];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    let t = ((x - p1.x) * dx + (y - p1.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;
    const distSq = (x - projX) * (x - projX) + (y - projY) * (y - projY);

    if (distSq < minDistSq) {
      minDistSq = distSq;
      bestP1 = p1;
      bestP2 = p2;
      bestT = t;
      bestProjX = projX;
      bestProjY = projY;
    }
  }

  const bestDist = Math.sqrt(minDistSq);
  // Continuous linear interpolation along spline segment
  const bestHalfWidth = bestP1.halfWidth + bestT * (bestP2.halfWidth - bestP1.halfWidth);
  const maxDepth = bestP1.depth + bestT * (bestP2.depth - bestP1.depth);
  const baseSpeed = bestP1.currentSpeed + bestT * (bestP2.currentSpeed - bestP1.currentSpeed);
  const tx = bestP1.tx + bestT * (bestP2.tx - bestP1.tx);
  const ty = bestP1.ty + bestT * (bestP2.ty - bestP1.ty);
  const nx = -ty;
  const ny = tx;
  const thalwegBias = bestP1.thalwegBias + bestT * (bestP2.thalwegBias - bestP1.thalwegBias);
  const froude = bestP1.froudeNumber + bestT * (bestP2.froudeNumber - bestP1.froudeNumber);
  const isFord = bestP1.isFord || bestP2.isFord;
  const isBridge = bestP1.isBridge || bestP2.isBridge;

  // Signed lateral coordinate (+ on left bank normal, - on right bank)
  const signedLateral = (x - bestProjX) * nx + (y - bestProjY) * ny;

  const inWaterChannel = bestDist < bestHalfWidth;
  if (!inWaterChannel) {
    const bankDist = bestDist - bestHalfWidth;
    const sideSandWidth = signedLateral >= 0
      ? (bestP1.innerSandLeft + bestT * (bestP2.innerSandLeft - bestP1.innerSandLeft))
      : (bestP1.innerSandRight + bestT * (bestP2.innerSandRight - bestP1.innerSandRight));
    if (bankDist < sideSandWidth + 28) {
      return {
        inWater: false,
        depth: 0,
        distToCenter: bestDist,
        signedLateral,
        halfWidth: bestHalfWidth,
        currentVx: 0,
        currentVy: 0,
        isFord,
        isBridge: false,
        surfaceType: bankDist < sideSandWidth ? 'river_sand' : 'river_mud',
        turbulence: 0,
        bottomSlopeX: -nx * Math.sign(signedLateral || 1) * 0.04,
        bottomSlopeY: -ny * Math.sign(signedLateral || 1) * 0.04
      };
    }
    return {
      inWater: false,
      depth: 0,
      distToCenter: bestDist,
      signedLateral,
      halfWidth: bestHalfWidth,
      currentVx: 0,
      currentVy: 0,
      isFord: false,
      isBridge: false,
      surfaceType: 'land',
      turbulence: 0,
      bottomSlopeX: 0,
      bottomSlopeY: 0
    };
  }

  // Bridge deck safe zones (Old Logging Bridge x: 9400 & Mountain Pass Bridge x: 23800)
  const isLoggingBridgeDeck = Math.abs(x - 9400) <= 88 && Math.abs(y - (-3300)) <= 120;
  const isMountainBridgeDeck = Math.abs(x - 23800) <= 240 && Math.abs(y - (-2520)) <= 75;

  if (isBridge || isLoggingBridgeDeck || isMountainBridgeDeck) {
    if (isLoggingBridgeDeck || isMountainBridgeDeck || Math.abs(x - 9400) <= 88) {
      return {
        inWater: false,
        depth: 0,
        distToCenter: bestDist,
        signedLateral,
        halfWidth: bestHalfWidth,
        currentVx: 0,
        currentVy: 0,
        isFord: false,
        isBridge: true,
        surfaceType: 'land',
        turbulence: 0,
        bottomSlopeX: 0,
        bottomSlopeY: 0
      };
    }
  }

  // Asymmetric helicoidal riverbed cross-section:
  // Thalweg is shifted by thalwegBias (-0.38..+0.38) toward the outer cut-bank.
  const u = Math.max(-1, Math.min(1, signedLateral / bestHalfWidth)); // -1 (right bank) to +1 (left bank)
  const shiftedU = (u - thalwegBias) / (u >= thalwegBias ? (1 - thalwegBias) : (1 + thalwegBias));
  const clampedShifted = Math.max(-1, Math.min(1, shiftedU));
  // Steep cut-bank profile on outer bend (power 1.65) vs gentle point-bar slope on inner bend (power 2.2)
  const rawProfile = Math.max(0, 1 - clampedShifted * clampedShifted);
  const edgeTaper = Math.max(0, 1 - Math.pow(Math.abs(u), 3.2));
  const depthFactor = rawProfile * 0.85 + edgeTaper * 0.15;

  // Subtle organic riverbed gravel undulations at shallow ford
  const riffleBump = isFord
    ? (Math.sin(x * 0.08 + y * 0.06) * 0.045 + Math.cos(x * 0.15 - y * 0.11) * 0.03)
    : 0;
  const actualDepth = Math.max(0.02, maxDepth * depthFactor + riffleBump);

  // Manning's Open-Channel Flow Velocity Profile:
  // V ~ h^(2/3) * S^(1/2); fastest in deep thalweg, slowed by bed friction near banks
  const manningFactor = 0.32 + 0.78 * Math.pow(depthFactor, 0.67);
  // Secondary helicoidal cross-current on river bends (pushes surface water slightly toward outer bank)
  const helicoidalCross = -bestP1.bendCurvature * baseSpeed * 0.18 * depthFactor;
  const actualCurrentSpeed = baseSpeed * manningFactor;

  const slopeSign = u > thalwegBias ? -1 : 1;
  const slopeMag = (2 * Math.abs(clampedShifted) * maxDepth) / Math.max(20, bestHalfWidth);
  const turbulence = Math.min(1.0, (isFord ? 0.75 : 0.15) + froude * 0.55 + Math.abs(bestP1.bendCurvature) * 0.4);

  return {
    inWater: true,
    depth: actualDepth,
    distToCenter: bestDist,
    signedLateral,
    halfWidth: bestHalfWidth,
    currentVx: tx * actualCurrentSpeed + nx * helicoidalCross,
    currentVy: ty * actualCurrentSpeed + ny * helicoidalCross,
    isFord,
    isBridge: false,
    surfaceType: 'water',
    turbulence,
    bottomSlopeX: nx * slopeSign * slopeMag,
    bottomSlopeY: ny * slopeSign * slopeMag
  };
}

/**
 * Universal water depth query function across the entire world (River, Ponds, Roadside Puddles)
 */
export function getUniversalWaterDepthAt(world: GameWorld | null | undefined, x: number, y: number): number {
  if (world && isWorldFreezing(world)) {
    return 0;
  }

  const river = getRiverWaterAt(x, y);
  if (river.inWater && !river.isBridge) {
    return river.depth;
  }

  if (world && world.puddles && world.puddles.length > 0) {
    for (let i = 0; i < world.puddles.length; i++) {
      const p = world.puddles[i];
      const dx = x - p.x;
      const dy = y - p.y;
      const maxR = Math.max(p.radiusX, p.radiusY);
      if (Math.abs(dx) > maxR || Math.abs(dy) > maxR) continue;

      let rx = dx;
      let ry = dy;
      if (p.angle) {
        const cosA = Math.cos(-p.angle);
        const sinA = Math.sin(-p.angle);
        rx = dx * cosA - dy * sinA;
        ry = dx * sinA + dy * cosA;
      }
      const distSq = (rx / p.radiusX) ** 2 + (ry / p.radiusY) ** 2;
      if (distSq <= 1.0) {
        if (p.isPond) {
          return 0.85 * Math.max(0, Math.pow(1 - distSq, 1.35));
        } else {
          return 0.085 * (1 - Math.sqrt(distSq));
        }
      }
    }
  }

  return 0;
}

/**
 * Renders the northern River "Быстрица" base hydrology:
 * banks, wet silt, Beer-Lambert depth strata, cellular sunlight caustics,
 * submerged riverbed boulders, swaying riverweed, lapping shore meniscus, and bridges.
 */
export function renderRiverSystem(
  ctx: CanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  timeHour: number = 12,
  nightAlpha: number = 0,
  weather: string = 'clear',
  vehicles?: Vehicle[],
  isFreezing: boolean = false
) {
  const now = Date.now();
  const dt = Math.min(0.1, (now - lastDebrisUpdate) * 0.001);
  lastDebrisUpdate = now;
  updateRiverDebris(dt);

  if (maxX < RIVER_MIN_X || minX > RIVER_MAX_X || maxY < RIVER_MIN_Y - 180 || minY > RIVER_MAX_Y + 180) {
    return;
  }

  const animTime = now * 0.001;
  const sunState = getCurrentSunShadowState();
  const dayFactor = Math.max(0, 1 - nightAlpha * 1.18);

  // Filter visible spline points index range
  let kStart = -1;
  let kEnd = -1;
  for (let k = 0; k < RIVER_SPLINE_POINTS.length; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    if (pt.x >= minX - 360 && pt.x <= maxX + 360 && pt.y >= minY - 360 && pt.y <= maxY + 360) {
      if (kStart === -1) kStart = k;
      kEnd = k;
    }
  }

  if (kStart === -1 || kEnd === -1 || kEnd - kStart < 2) {
    return;
  }

  kStart = Math.max(0, kStart - 3);
  kEnd = Math.min(RIVER_SPLINE_POINTS.length - 1, kEnd + 3);

  // --- PASS 1a: MARSHY EROSION & SOFT SILT MARGIN ---
  ctx.beginPath();
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wave = (riverHash(k * 3.17) - 0.5) * 18 + Math.sin(k * 0.45) * 9;
    const bankExtra = 135 + pt.innerSandLeft * 0.5 + wave;
    const bx = pt.x + pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y + pt.ny * (pt.halfWidth + bankExtra);
    if (k === kStart) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  for (let k = kEnd; k >= kStart; k--) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wave = (riverHash(k * 4.73) - 0.5) * 18 + Math.cos(k * 0.45) * 9;
    const bankExtra = 135 + pt.innerSandRight * 0.5 + wave;
    const bx = pt.x - pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y - pt.ny * (pt.halfWidth + bankExtra);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fillStyle = isFreezing ? '#475569' : '#352518';
  ctx.fill();

  // --- PASS 1b: DEEP WET SILT & CLAY BELT ---
  ctx.beginPath();
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wave = (riverHash(k * 5.91) - 0.5) * 14;
    const bankExtra = 85 + pt.innerSandLeft * 0.4 + wave;
    const bx = pt.x + pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y + pt.ny * (pt.halfWidth + bankExtra);
    if (k === kStart) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  for (let k = kEnd; k >= kStart; k--) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wave = (riverHash(k * 6.43) - 0.5) * 14;
    const bankExtra = 85 + pt.innerSandRight * 0.4 + wave;
    const bx = pt.x - pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y - pt.ny * (pt.halfWidth + bankExtra);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fillStyle = isFreezing ? '#334155' : '#1f140c';
  ctx.fill();

  // --- PASS 1c: GLOSSY WET MUD SHEEN ---
  ctx.beginPath();
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wave = (riverHash(k * 7.89) - 0.5) * 10;
    const bankExtra = 55 + pt.innerSandLeft * 0.3 + wave;
    const bx = pt.x + pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y + pt.ny * (pt.halfWidth + bankExtra);
    if (k === kStart) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  for (let k = kEnd; k >= kStart; k--) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wave = (riverHash(k * 8.31) - 0.5) * 10;
    const bankExtra = 55 + pt.innerSandRight * 0.3 + wave;
    const bx = pt.x - pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y - pt.ny * (pt.halfWidth + bankExtra);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fillStyle = isFreezing ? 'rgba(203, 213, 225, 0.25)' : 'rgba(12, 22, 34, 0.40)';
  ctx.fill();

  // --- PASS 2: INNER WET SAND & PEBBLE POINT-BARS (Песчаные косы на излучинах) ---
  ctx.beginPath();
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const sx = pt.x + pt.nx * (pt.halfWidth + pt.innerSandLeft + 12);
    const sy = pt.y + pt.ny * (pt.halfWidth + pt.innerSandLeft + 12);
    if (k === kStart) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  for (let k = kEnd; k >= kStart; k--) {
    const pt = RIVER_SPLINE_POINTS[k];
    const sx = pt.x - pt.nx * (pt.halfWidth + pt.innerSandRight + 12);
    const sy = pt.y - pt.ny * (pt.halfWidth + pt.innerSandRight + 12);
    ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fillStyle = isFreezing ? '#64748b' : '#4d3e2d';
  ctx.fill();

  renderBankGravelSpeckles(ctx, kStart, kEnd, isFreezing, nightAlpha);
  renderRiverAccessExits(ctx, minX, minY, maxX, maxY, nightAlpha);

  // --- PASS 3: CONTINUOUS WATER CHANNEL RIBBON (BEER-LAMBERT OPTICAL BATHYMETRY) ---
  const traceChannelBand = (widthFraction: number, thalwegShiftWeight: number = 0) => {
    ctx.beginPath();
    for (let k = kStart; k <= kEnd; k++) {
      const pt = RIVER_SPLINE_POINTS[k];
      const shift = pt.thalwegBias * pt.halfWidth * thalwegShiftWeight;
      const wx = pt.x + pt.nx * (shift + pt.halfWidth * widthFraction);
      const wy = pt.y + pt.ny * (shift + pt.halfWidth * widthFraction);
      if (k === kStart) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    for (let k = kEnd; k >= kStart; k--) {
      const pt = RIVER_SPLINE_POINTS[k];
      const shift = pt.thalwegBias * pt.halfWidth * thalwegShiftWeight;
      const wx = pt.x + pt.nx * (shift - pt.halfWidth * widthFraction);
      const wy = pt.y + pt.ny * (shift - pt.halfWidth * widthFraction);
      ctx.lineTo(wx, wy);
    }
    ctx.closePath();
  };

  if (isFreezing) {
    traceChannelBand(1.0, 0);
    ctx.fillStyle = nightAlpha > 0.6 ? '#1e293b' : '#7e9aa8';
    ctx.fill();

    traceChannelBand(0.82, 0.35);
    ctx.fillStyle = nightAlpha > 0.6 ? 'rgba(30, 41, 59, 0.85)' : 'rgba(148, 178, 194, 0.85)';
    ctx.fill();

    traceChannelBand(0.52, 0.75);
    ctx.fillStyle = nightAlpha > 0.6 ? 'rgba(15, 23, 42, 0.90)' : 'rgba(125, 155, 172, 0.90)';
    ctx.fill();

    ctx.save();
    traceChannelBand(1.0, 0);
    ctx.clip();

    // Crystalline stress fractures & river ice cracks
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.72)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let k = kStart; k <= kEnd; k += 4) {
      const pt = RIVER_SPLINE_POINTS[k];
      const crackSeed = Math.sin(k * 13.7);
      const startDist = pt.halfWidth * (0.2 + crackSeed * 0.6);
      let cx = pt.x + pt.nx * startDist;
      let cy = pt.y + pt.ny * startDist;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 6; s++) {
        const segLen = 18 + Math.abs(Math.cos(k * 7.1 + s)) * 24;
        const segAngle = Math.atan2(pt.ty, pt.tx) + (Math.sin(k * 3.3 + s * 2.1) * 0.9);
        cx += Math.cos(segAngle) * segLen;
        cy += Math.sin(segAngle) * segLen;
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let k = kStart; k <= kEnd; k += 3) {
      const pt = RIVER_SPLINE_POINTS[k];
      for (let b = 0; b < 5; b++) {
        const bOff = Math.sin(k * 19.3 + b * 5.7) * (pt.halfWidth * 0.7);
        const bx = pt.x + pt.nx * bOff;
        const by = pt.y + pt.ny * bOff;
        const bRad = 1.0 + Math.abs(Math.sin(k + b)) * 2.2;
        ctx.beginPath();
        ctx.arc(bx, by, bRad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let k = kStart; k <= kEnd; k += 5) {
      const pt = RIVER_SPLINE_POINTS[k];
      const driftOff = Math.cos(k * 11.2) * (pt.halfWidth * 0.55);
      const dx = pt.x + pt.nx * driftOff;
      const dy = pt.y + pt.ny * driftOff;
      ctx.beginPath();
      ctx.ellipse(dx, dy, 75, 14, Math.atan2(pt.ty, pt.tx) + 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    // =========================================================================
    // REALISTIC MULTI-BAND BEER-LAMBERT OPTICAL BATHYMETRY & ASYMMETRIC THALWEG
    // =========================================================================
    // Band 0 (1.00 width): Translucent amber-sand & olive shoreline meniscus (0.0m - 0.25m)
    traceChannelBand(1.0, 0.0);
    ctx.fillStyle = nightAlpha > 0.65 ? '#122229' : '#2d4b43';
    ctx.fill();

    // Band 1 (0.91 width): Shallow littoral zone — warm sandy olive-teal (0.25m - 0.60m)
    traceChannelBand(0.91, 0.20);
    ctx.fillStyle = nightAlpha > 0.65 ? 'rgba(13, 30, 38, 0.78)' : 'rgba(28, 74, 74, 0.74)';
    ctx.fill();

    // Band 2 (0.78 width): Mid-shallow boreal emerald-cyan (0.60m - 1.10m)
    traceChannelBand(0.78, 0.42);
    ctx.fillStyle = nightAlpha > 0.65 ? 'rgba(10, 25, 35, 0.80)' : 'rgba(20, 64, 70, 0.78)';
    ctx.fill();

    // Band 3 (0.60 width): Deep channel — rich northern teal-slate (1.10m - 1.65m)
    traceChannelBand(0.60, 0.68);
    ctx.fillStyle = nightAlpha > 0.65 ? 'rgba(7, 19, 30, 0.82)' : 'rgba(14, 48, 58, 0.80)';
    ctx.fill();

    // Band 4 (0.38 width): Abyssal Thalweg Core — shifted toward outer bend (1.65m - 2.80m)
    traceChannelBand(0.38, 0.92);
    ctx.fillStyle = nightAlpha > 0.65 ? 'rgba(4, 12, 22, 0.88)' : 'rgba(9, 32, 42, 0.85)';
    ctx.fill();

    // Clip to River Water Surface for all internal underwater & surface fluid rendering
    ctx.save();
    traceChannelBand(1.0, 0.0);
    ctx.clip();

    // --- PASS 3d: DIRECTIONAL SOLAR BANK OVERHANG SHADOWS ON WATER ---
    // The bank facing away from the sun casts a cool deep shadow shelf across the nearshore water
    if (sunState.sunElevation > 0.05) {
      const shadowReach = Math.min(28, 8 + sunState.lengthFactor * 11);
      ctx.beginPath();
      for (let k = kStart; k <= kEnd; k++) {
        const pt = RIVER_SPLINE_POINTS[k];
        const bx = pt.x + pt.nx * pt.halfWidth;
        const by = pt.y + pt.ny * pt.halfWidth;
        if (k === kStart) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      for (let k = kEnd; k >= kStart; k--) {
        const pt = RIVER_SPLINE_POINTS[k];
        const bx = pt.x + pt.nx * pt.halfWidth + sunState.shadowDirX * shadowReach;
        const by = pt.y + pt.ny * pt.halfWidth + sunState.shadowDirY * shadowReach;
        ctx.lineTo(bx, by);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(4, 12, 20, ${(0.28 * dayFactor).toFixed(2)})`;
      ctx.fill();
    }

    // --- PASS 4: ORGANIC PROCEDURAL RIVERBED STONES, RIFFLE BARS & SUNKEN LOGS ---
    renderOrganicRiverbedStones(ctx, kStart, kEnd, animTime, sunState.sunDirX, sunState.sunDirY, dayFactor);

    // --- PASS 5: DYNAMIC SWAYING UNDERWATER RIVERWEED & ALGAE (Perturbed by passing vehicles) ---
    renderDynamicRiverweed(ctx, kStart, kEnd, animTime, vehicles);

    // --- PASS 6: CELLULAR SUNLIGHT CAUSTICS NETWORK & MULTI-HARMONIC CURRENT FILAMENTS ---
    renderFluidCurrentStreamlinesAndCaustics(ctx, kStart, kEnd, animTime, nightAlpha, weather, sunState.sunDirX, sunState.sunDirY);

    // --- PASS 7: WATER LILIES & DUCKWEED IN CALM POOLS (Тихий Плёс) ---
    renderWaterLilies(ctx, kStart, kEnd, animTime);

    // --- PASS 8: DYNAMIC FLOATING RIVER DEBRIS ---
    renderFloatingRiverDebris(ctx, minX, minY, maxX, maxY, animTime);

    // --- PASS 9: SHORELINE LAPPING WAVES & RECEDING WET FOAM MENISCUS ---
    renderShorelineLappingWaves(ctx, kStart, kEnd, animTime, nightAlpha);

    // --- PASS 9b: BRIDGE PIER & BOULDER STAGNATION WAKES ---
    renderObstacleWakes(ctx, kStart, kEnd, animTime);

    ctx.restore(); // Restore water surface clip
  }

  // --- PASS 10: SHORELINE REEDS & CATTAILS ALONG BANKS ---
  renderShorelineReeds(ctx, kStart, kEnd, animTime);

  // --- PASS 11: LOGGING BRIDGE & FISHING PIERS ---
  if (minX <= 9500 && maxX >= 9300 && minY <= -3200 && maxY >= -3400) {
    renderLoggingBridge(ctx, nightAlpha);
  }

  if (minX <= 14350 && maxX >= 14100 && minY <= -2750 && maxY >= -3150) {
    renderFishingPiers(ctx, nightAlpha);
  }
}

/**
 * Renders the dynamic water surface overlay, dispersive wave rings, Kelvin wakes,
 * contour-accurate vehicle submersion & foam meniscus, and subsurface light scattering.
 * Called in GameRenderer AFTER ground-level player/pedestrian/vehicle chassis are drawn,
 * so the water surface genuinely submerges and refracts lower bodies!
 */
export function renderWaterSurfaceOpticsAndWakes(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  timeHour: number,
  nightAlpha: number,
  visibleVehicles: Vehicle[],
  player: Player,
  remotePlayers: RemotePlayerState[] = [],
  visiblePedestrians: Pedestrian[] = [],
  isFreezing: boolean = false
) {
  if (isFreezing) return;

  const animTime = performance.now() * 0.001;
  const sunState = getCurrentSunShadowState();
  const dayFactor = Math.max(0, 1 - nightAlpha * 1.15);

  // 1. Render all active dispersive capillary-gravity wave rings & Kelvin wakes in world space
  if (waterDisturbances.length > 0) {
    ctx.save();
    for (let i = 0; i < waterDisturbances.length; i++) {
      const w = waterDisturbances[i];
      if (w.x + w.maxRadius < minX || w.x - w.maxRadius > maxX || w.y + w.maxRadius < minY || w.y - w.maxRadius > maxY) {
        continue;
      }
      const progress = Math.min(1.0, w.age / w.maxAge);
      const fade = (1.0 - progress) * (1.0 - progress) * w.intensity;
      if (fade < 0.02) continue;

      if (w.isDirectionalWake) {
        // Kelvin V-Wake arms (19.47 deg half-angle) + aerated turbulent centerline foam
        const armLen = w.radius * 1.35;
        const spread = 0.36; // ~20 degrees
        const backAngle = w.angle + Math.PI;

        const lx = w.x + Math.cos(backAngle - spread) * armLen;
        const ly = w.y + Math.sin(backAngle - spread) * armLen;
        const rx = w.x + Math.cos(backAngle + spread) * armLen;
        const ry = w.y + Math.sin(backAngle + spread) * armLen;

        // Shadow trough of wake crest
        ctx.strokeStyle = `rgba(6, 24, 36, ${(fade * 0.42).toFixed(3)})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.quadraticCurveTo(w.x, w.y, rx, ry);
        ctx.stroke();

        // Sunlit specular wake crest
        ctx.strokeStyle = `rgba(224, 242, 254, ${(fade * (0.48 + 0.35 * dayFactor)).toFixed(3)})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(lx - sunState.sunDirX * 1.0, ly - sunState.sunDirY * 1.0);
        ctx.quadraticCurveTo(w.x - sunState.sunDirX * 1.2, w.y - sunState.sunDirY * 1.2, rx - sunState.sunDirX * 1.0, ry - sunState.sunDirY * 1.0);
        ctx.stroke();

        // Aerated micro-bubble foam cluster in wake core
        if (w.foamIntensity > 0.15) {
          ctx.fillStyle = `rgba(240, 249, 255, ${(fade * w.foamIntensity * 0.55).toFixed(3)})`;
          for (let b = 0; b < 3; b++) {
            const bDist = (b + 1) * armLen * 0.24;
            const bJit = Math.sin(w.age * 9 + b * 2.1) * (2.2 + b);
            const bx = w.x + Math.cos(backAngle) * bDist - Math.sin(backAngle) * bJit;
            const by = w.y + Math.sin(backAngle) * bDist + Math.cos(backAngle) * bJit;
            ctx.beginPath();
            ctx.arc(bx, by, Math.max(0.8, 2.2 - b * 0.4), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // Dispersive concentric capillary-gravity wave packet (outer primary crest + inner secondary harmonic ring)
        const r1 = w.radius;
        const r2 = w.radius * 0.62;

        // Dark refractive wave trough
        ctx.strokeStyle = `rgba(7, 28, 40, ${(fade * 0.36).toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(w.x + sunState.shadowDirX * 0.8, w.y + sunState.shadowDirY * 0.8, r1, 0, Math.PI * 2);
        ctx.stroke();

        // Bright specular wave crest facing the sun/sky
        ctx.strokeStyle = `rgba(224, 242, 254, ${(fade * (0.45 + 0.35 * dayFactor)).toFixed(3)})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(w.x, w.y, r1, 0, Math.PI * 2);
        ctx.stroke();

        if (r2 > 2.5) {
          ctx.strokeStyle = `rgba(186, 230, 253, ${(fade * 0.28).toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(w.x, w.y, r2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // 2. Render Contour-Accurate Vehicle Submersion, Sloped Waterline Meniscus & Underwater Light Scattering
  for (let i = 0; i < visibleVehicles.length; i++) {
    const car = visibleVehicles[i];
    const maxCarWater = Math.max(
      car.waterDepth || 0,
      car.frontWaterDepth || 0,
      car.rearWaterDepth || 0,
      car.leftWaterDepth || 0,
      car.rightWaterDepth || 0
    );
    if (maxCarWater <= 0.04) continue;

    renderVehicleHydrodynamicSubmersion(ctx, car, animTime, nightAlpha, dayFactor, sunState);
  }

  // 3. Render Player & Pedestrian Waterline Meniscus & Wading/Swimming Surface Wake
  const renderHumanWaterline = (h: { x: number; y: number; vx?: number; vy?: number; angle: number; waterDepth?: number; isSwimming?: boolean }, idKey: string) => {
    const d = h.waterDepth ?? getUniversalWaterDepthAt(world, h.x, h.y);
    if (d <= 0.05) return;

    const river = getRiverWaterAt(h.x, h.y);
    const relVx = (h.vx || 0) - (river.inWater ? river.currentVx : 0);
    const relVy = (h.vy || 0) - (river.inWater ? river.currentVy : 0);
    const relSpeed = Math.hypot(relVx, relVy);
    const flowAngle = relSpeed > 3 ? Math.atan2(relVy, relVx) : h.angle;

    if (relSpeed > 6) {
      emitWaterDisturbance(
        h.x,
        h.y,
        h.vx || 0,
        h.vy || 0,
        d > 0.85 ? 7.5 : 4.8,
        Math.min(0.85, 0.25 + d * 0.35 + relSpeed * 0.005),
        relSpeed > 28,
        `hum_${idKey}`,
        d > 0.85 ? 90 : 120
      );
    }

    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(flowAngle);

    // Organic animated foam & refraction meniscus collar wrapping around submerged legs/waist/shoulders
    const collarR = d > 0.85 ? 6.8 : (d > 0.45 ? 5.8 : 4.2);
    const subAlpha = Math.min(0.78, 0.28 + d * 0.38);

    // Subtle localized water shadow & meniscus refraction ring
    ctx.strokeStyle = `rgba(8, 36, 48, ${(subAlpha * 0.65).toFixed(3)})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, collarR + 0.8, 0, Math.PI * 2);
    ctx.stroke();

    // Upstream bow-ripple crescent around wading/swimming body
    ctx.strokeStyle = `rgba(240, 249, 255, ${(subAlpha * (0.55 + 0.3 * dayFactor)).toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let a = -1.35; a <= 1.35; a += 0.3) {
      const ripple = Math.sin(animTime * 6.5 + a * 4.0 + h.x * 0.05) * 0.7;
      const r = collarR + ripple;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (a === -1.35) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.restore();
  };

  if (!player.isInVehicle && !player.insideCarId && !player.insideBusId) {
    renderHumanWaterline(player, 'local_player');
  }
  for (let i = 0; i < remotePlayers.length; i++) {
    const rp = remotePlayers[i];
    if (!rp.isInVehicle) {
      renderHumanWaterline(rp as any, `rp_${i}`);
    }
  }
  for (let i = 0; i < visiblePedestrians.length; i++) {
    const ped = visiblePedestrians[i];
    if (!ped.isInsideBuilding) {
      renderHumanWaterline(ped as any, `ped_${ped.id}`);
    }
  }
}

/**
 * Renders physically grounded vehicle submersion:
 * 1. Clips strictly to the vehicle's actual deformed softbody contour (never a rectangular box!).
 * 2. Computes a 2D sloped water depth plane from (frontWaterDepth, rearWaterDepth, leftWaterDepth, rightWaterDepth)
 *    so a car nosing down a bank or wading with one side in deep water is submerged only where water actually touches!
 * 3. Renders underwater Beer-Lambert optical absorption, cellular caustic shimmer on submerged paintwork,
 *    organic waterline foam meniscus, 4-wheel hydrodynamic wakes, and underwater headlight/taillight scattering.
 */
function renderVehicleHydrodynamicSubmersion(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  animTime: number,
  nightAlpha: number,
  dayFactor: number,
  sunState: { sunDirX: number; sunDirY: number; shadowDirX: number; shadowDirY: number; sunElevation: number }
) {
  const halfL = car.length * 0.5;
  const halfW = car.width * 0.5;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  const dCenter = car.waterDepth ?? 0;
  const dFront = car.frontWaterDepth ?? dCenter;
  const dRear = car.rearWaterDepth ?? dCenter;
  const dLeft = car.leftWaterDepth ?? dCenter;
  const dRight = car.rightWaterDepth ?? dCenter;

  const maxD = Math.max(dCenter, dFront, dRear, dLeft, dRight);
  if (maxD <= 0.04) return;

  const river = getRiverWaterAt(car.x, car.y);
  const curVx = river.inWater ? river.currentVx : 0;
  const curVy = river.inWater ? river.currentVy : 0;
  const relVx = (car.vx || 0) - curVx;
  const relVy = (car.vy || 0) - curVy;
  const relSpeed = Math.hypot(relVx, relVy);

  // Emit persistent hydrodynamic disturbances from bow, stern, and wheels when moving or in current
  if (relSpeed > 8 || Math.abs(car.speed) > 8) {
    const bowWorldX = car.x + cosA * (halfL * 0.85);
    const bowWorldY = car.y + sinA * (halfL * 0.85);
    if (dFront > 0.06) {
      emitWaterDisturbance(
        bowWorldX,
        bowWorldY,
        car.vx || curVx,
        car.vy || curVy,
        halfW * 0.9,
        Math.min(1.0, 0.35 + dFront * 0.4 + relSpeed * 0.006),
        true,
        `veh_bow_${car.id}`,
        65
      );
    }
    const sternWorldX = car.x - cosA * (halfL * 0.85);
    const sternWorldY = car.y - sinA * (halfL * 0.85);
    if (dRear > 0.06) {
      emitWaterDisturbance(
        sternWorldX,
        sternWorldY,
        -(car.vx || -curVx) * 0.5,
        -(car.vy || -curVy) * 0.5,
        halfW * 0.75,
        Math.min(0.85, 0.25 + dRear * 0.35 + relSpeed * 0.004),
        false,
        `veh_stern_${car.id}`,
        95
      );
    }
  }

  // 1. UNDERWATER HEADLIGHT & TAILLIGHT SUBSURFACE VOLUMETRIC SCATTERING
  // When lamps are submerged (water depth > 0.38m at front/rear), light scatters through the turbid water
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  if (car.headlightsOn && dFront > 0.28) {
    const subLightFactor = Math.min(1.0, (dFront - 0.25) / 0.65);
    const beamReach = (car.headlightMode === 'high' ? 95 : 65) * (1.0 - subLightFactor * 0.25);
    const beamSpread = halfW * 1.45;
    for (const sideY of [-halfW * 0.62, halfW * 0.62]) {
      const broken = sideY < 0 ? car.damage?.leftHeadlightBroken : car.damage?.rightHeadlightBroken;
      if (broken) continue;
      const grad = ctx.createRadialGradient(halfL, sideY, 2, halfL + beamReach * 0.45, sideY, beamReach);
      grad.addColorStop(0, `rgba(165, 243, 252, ${(0.52 * subLightFactor).toFixed(3)})`);
      grad.addColorStop(0.45, `rgba(34, 211, 238, ${(0.28 * subLightFactor).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(halfL - 2, sideY - 3);
      ctx.lineTo(halfL + beamReach, sideY - beamSpread);
      ctx.arc(halfL + beamReach * 0.85, sideY, beamSpread, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.lineTo(halfL - 2, sideY + 3);
      ctx.closePath();
      ctx.fill();
    }
  }

  if ((car.brakeLightsOn || car.headlightsOn || car.positionLightsOn) && dRear > 0.28) {
    const subRearFactor = Math.min(1.0, (dRear - 0.25) / 0.65);
    const isBraking = !!car.brakeLightsOn;
    const reach = isBraking ? 34 : 18;
    const alpha = (isBraking ? 0.48 : 0.24) * subRearFactor;
    for (const sideY of [-halfW * 0.64, halfW * 0.64]) {
      const grad = ctx.createRadialGradient(-halfL, sideY, 1, -halfL - reach * 0.4, sideY, reach);
      grad.addColorStop(0, `rgba(251, 113, 133, ${alpha.toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(225, 29, 72, ${(alpha * 0.45).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(159, 18, 57, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(-halfL - reach * 0.25, sideY, reach, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. CONTOUR-CLIPPED SUBMERGED HULL ABSORPTION & CAUSTIC REFRACTION
  // Trace the vehicle's actual deformed softbody perimeter polygon
  const hullPoly = getVehicleBasePolygon(car.type, halfL, halfW);
  const dmg = car.damage;
  ctx.save();
  ctx.beginPath();
  if (dmg?.deformedVertices && dmg.deformedVertices.length >= 8) {
    traceSoftbodyPath(ctx, hullPoly, dmg, halfL, halfW, 0.92);
  } else {
    for (let p = 0; p < hullPoly.length; p++) {
      if (p === 0) ctx.moveTo(hullPoly[p].x, hullPoly[p].y);
      else ctx.lineTo(hullPoly[p].x, hullPoly[p].y);
    }
    ctx.closePath();
  }
  ctx.clip();

  // Compute directional linear gradient across the hull matching actual front/rear/left/right water depth!
  const waterR = nightAlpha > 0.6 ? 7 : 13;
  const waterG = nightAlpha > 0.6 ? 22 : 56;
  const waterB = nightAlpha > 0.6 ? 34 : 64;

  const alphaFront = Math.min(0.86, Math.max(0, (dFront - 0.10) / 1.35) * 0.82);
  const alphaCenter = Math.min(0.86, Math.max(0, (dCenter - 0.10) / 1.35) * 0.82);
  const alphaRear = Math.min(0.86, Math.max(0, (dRear - 0.10) / 1.35) * 0.82);

  const hullGrad = ctx.createLinearGradient(halfL, (dRight - dLeft) * 18, -halfL, (dLeft - dRight) * 18);
  hullGrad.addColorStop(0, `rgba(${waterR}, ${waterG}, ${waterB}, ${alphaFront.toFixed(3)})`);
  hullGrad.addColorStop(0.5, `rgba(${waterR}, ${waterG}, ${waterB}, ${alphaCenter.toFixed(3)})`);
  hullGrad.addColorStop(1, `rgba(${waterR}, ${waterG}, ${waterB}, ${alphaRear.toFixed(3)})`);

  ctx.fillStyle = hullGrad;
  ctx.fillRect(-halfL - 6, -halfW - 6, car.length + 12, car.width + 12);

  // Animated underwater caustic light lattice shimmering across the submerged portion of the vehicle body
  if (dayFactor > 0.15 && maxD > 0.18) {
    const causticAlpha = Math.min(0.28, maxD * 0.18) * dayFactor;
    ctx.strokeStyle = `rgba(186, 230, 253, ${causticAlpha.toFixed(3)})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    const step = 9;
    for (let lx = -halfL; lx <= halfL; lx += step) {
      const localFrac = (lx + halfL) / Math.max(1, car.length); // 0 rear .. 1 front
      const localD = dRear + localFrac * (dFront - dRear);
      if (localD < 0.16) continue;
      const waveY1 = Math.sin(animTime * 3.4 + (car.x + lx) * 0.12) * (halfW * 0.55);
      const waveY2 = Math.cos(animTime * 2.7 - (car.y + lx) * 0.14) * (halfW * 0.55);
      ctx.moveTo(lx, waveY1);
      ctx.lineTo(lx + step * 0.8, waveY2);
    }
    ctx.stroke();
  }

  ctx.restore(); // end hull clip

  // 3. ORGANIC CONTOUR-WRAPPED WATERLINE FOAM MENISCUS & BOW WAVE PILE-UP
  // Instead of a rectangle, we walk the actual hull polygon vertices and draw the foam meniscus ONLY along vertices where localWaterDepth > 0.08m!
  const getLocalDepthAt = (lx: number, ly: number): number => {
    const uX = Math.max(-1, Math.min(1, lx / Math.max(1, halfL))); // -1 rear .. +1 front
    const uY = Math.max(-1, Math.min(1, ly / Math.max(1, halfW))); // -1 left .. +1 right
    const lonD = uX >= 0 ? (dCenter + uX * (dFront - dCenter)) : (dCenter + (-uX) * (dRear - dCenter));
    const latDelta = uY * (dRight - dLeft) * 0.5;
    return Math.max(0, lonD + latDelta);
  };

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw organic undulating foam line along the submerged hull perimeter
  const N = hullPoly.length;
  for (let idx = 0; idx < N; idx++) {
    const p0 = hullPoly[idx];
    const p1 = hullPoly[(idx + 1) % N];
    const d0 = getLocalDepthAt(p0.x, p0.y);
    const d1 = getLocalDepthAt(p1.x, p1.y);
    if (d0 < 0.06 && d1 < 0.06) continue;

    const segDepth = (d0 + d1) * 0.5;
    const isBowSeg = p0.x > halfL * 0.35 && p1.x > halfL * 0.35;
    const waveOsc = Math.sin(animTime * 5.2 + idx * 1.7 + car.x * 0.04) * (isBowSeg ? 1.6 : 0.9);
    const outScale = 1.0 + (waveOsc + (isBowSeg && relSpeed > 15 ? Math.min(3.2, relSpeed * 0.025) : 0.6)) / Math.max(8, halfW);

    const x0 = p0.x * outScale;
    const y0 = p0.y * outScale;
    const x1 = p1.x * outScale;
    const y1 = p1.y * outScale;

    const foamAlpha = Math.min(0.88, (0.28 + segDepth * 0.38 + (isBowSeg ? relSpeed * 0.004 : 0)) * (0.55 + 0.45 * dayFactor));
    ctx.strokeStyle = `rgba(240, 249, 255, ${foamAlpha.toFixed(3)})`;
    ctx.lineWidth = isBowSeg ? Math.min(3.2, 1.4 + relSpeed * 0.015) : 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // 4. RISING AIR & EXHAUST BUBBLES FROM SUBMERGED ENGINE / CABIN / TAILPIPE
  if (maxD > 0.35) {
    const bubbleCount = (car.engineState?.engineRunning ? 4 : 2);
    for (let b = 0; b < bubbleCount; b++) {
      const bPhase = (animTime * 2.4 + b * 0.73 + (car.x * 0.01)) % 1.0;
      const bx = (b === 0 && car.engineState?.engineRunning)
        ? -halfL * 0.92 - bPhase * 4
        : Math.sin(b * 4.1 + car.y * 0.02) * (halfL * 0.5);
      const by = Math.cos(b * 7.3 + car.x * 0.02) * (halfW * 0.55);
      if (getLocalDepthAt(bx, by) > 0.25) {
        const bRad = 0.9 + bPhase * 2.2;
        const bAlpha = (1.0 - bPhase) * 0.65 * (0.5 + 0.5 * dayFactor);
        ctx.strokeStyle = `rgba(224, 242, 254, ${bAlpha.toFixed(3)})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(bx, by, bRad, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

/**
 * Volumetric 3D bank mud clods, wet seepage hollows, and gravel pebbles on river shores
 */
function renderBankGravelSpeckles(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  isFreezing: boolean = false,
  nightAlpha: number = 0
) {
  for (let k = kStart; k < kEnd; k += 3) {
    const pt = RIVER_SPLINE_POINTS[k];
    const seed = k * 13.37;
    const tanAngle = Math.atan2(pt.ty, pt.tx);

    const mudCount = 2 + Math.floor(riverHash(seed * 1.9) * 3);
    for (let m = 0; m < mudCount; m++) {
      const mSeed = seed + m * 11.43;
      const isLeft = riverHash(mSeed) > 0.5;
      const bankSide = isLeft ? 1 : -1;
      const bankSand = isLeft ? pt.innerSandLeft : pt.innerSandRight;
      const offset = pt.halfWidth + bankSand + 12 + riverHash(mSeed * 2.1) * 85;
      const along = (riverHash(mSeed * 3.3) - 0.5) * 28;

      const mx = pt.x + pt.nx * (offset * bankSide) + pt.tx * along;
      const my = pt.y + pt.ny * (offset * bankSide) + pt.ty * along;
      const rx = 2.8 + riverHash(mSeed * 4.7) * 5.2;
      const ry = rx * (0.48 + riverHash(mSeed * 5.9) * 0.32);
      const rot = tanAngle + (riverHash(mSeed * 6.7) - 0.5) * 0.6;

      if (m === 0 && !isFreezing && offset < pt.halfWidth + bankSand + 65) {
        ctx.fillStyle = 'rgba(10, 8, 5, 0.55)';
        ctx.beginPath();
        ctx.ellipse(mx, my, rx * 1.25, ry * 1.25, rot, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = nightAlpha > 0.6 ? 'rgba(30, 48, 68, 0.45)' : 'rgba(56, 118, 152, 0.38)';
        ctx.beginPath();
        ctx.ellipse(mx - 0.4, my - 0.4, rx * 0.85, ry * 0.78, rot, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(224, 242, 254, ${(0.28 * (1 - nightAlpha * 0.6)).toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(mx - rx * 0.25, my - ry * 0.25, rx * 0.32, ry * 0.16, rot - 0.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(6, 3, 1, 0.52)';
        ctx.beginPath();
        ctx.ellipse(mx + 1.2, my + 1.3, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isFreezing ? '#334155' : (riverHash(mSeed * 8.1) > 0.5 ? '#2b1c11' : '#23160d');
        ctx.beginPath();
        ctx.ellipse(mx, my, rx * 0.92, ry * 0.88, rot, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isFreezing
          ? 'rgba(226, 232, 240, 0.28)'
          : `rgba(186, 212, 235, ${(0.22 * (1 - nightAlpha * 0.5)).toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(mx - rx * 0.22, my - ry * 0.22, rx * 0.45, ry * 0.32, rot, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const pebbleCount = 3 + Math.floor(riverHash(seed) * 3);
    for (let p = 0; p < pebbleCount; p++) {
      const pSeed = seed + p * 7.19;
      const isLeft = riverHash(pSeed) > 0.5;
      const bankSide = isLeft ? 1 : -1;
      const bankWidth = isLeft ? pt.innerSandLeft : pt.innerSandRight;
      const offset = pt.halfWidth + 2 + riverHash(pSeed * 2.3) * (bankWidth + 8);
      const px = pt.x + pt.nx * (offset * bankSide);
      const py = pt.y + pt.ny * (offset * bankSide);
      const sz = 1.2 + riverHash(pSeed * 3.7) * 2.0;

      ctx.fillStyle = 'rgba(10, 7, 4, 0.42)';
      ctx.beginPath();
      ctx.arc(px + 0.7, py + 0.8, sz, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = riverHash(pSeed * 5.1) > 0.5 ? '#3d3226' : '#5e4f3e';
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(226, 232, 240, 0.24)';
      ctx.beginPath();
      ctx.arc(px - sz * 0.28, py - sz * 0.28, sz * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Organic Procedural Riverbed Stones, Riffle Bars & Boulders with sun-oriented highlights & wakes
 */
function renderOrganicRiverbedStones(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number,
  sunDirX: number,
  sunDirY: number,
  dayFactor: number
) {
  for (let k = kStart; k < kEnd; k += 2) {
    const pt = RIVER_SPLINE_POINTS[k];
    const seed = k * 17.83;

    const isFordZone = pt.isFord || Math.abs(pt.x - 12400) < 280;
    const stoneDensity = isFordZone ? 6 : (pt.depth < 1.1 ? 3 : (riverHash(seed) < 0.42 ? 1 : 0));

    if (stoneDensity === 0) continue;

    for (let s = 0; s < stoneDensity; s++) {
      const sSeed = seed + s * 9.41;
      const latFraction = (riverHash(sSeed) * 2 - 1) * 0.86;
      const rx = pt.x + pt.nx * (pt.halfWidth * latFraction) + (riverHash(sSeed * 1.7) * 14 - 7);
      const ry = pt.y + pt.ny * (pt.halfWidth * latFraction) + (riverHash(sSeed * 2.3) * 14 - 7);

      const stoneRadX = (isFordZone ? 3.5 : 2.5) + riverHash(sSeed * 3.1) * (isFordZone ? 5.8 : 3.6);
      const stoneRadY = stoneRadX * (0.62 + riverHash(sSeed * 4.3) * 0.35);
      const stoneAngle = (riverHash(sSeed * 5.7) * 2 - 1) * 0.6 + Math.atan2(pt.ty, pt.tx);

      // Beer-Lambert depth visibility attenuation for submerged rocks
      const localDepth = pt.depth * Math.max(0.15, 1 - latFraction * latFraction);
      const visibility = Math.max(0.22, Math.exp(-localDepth * 0.65));

      const colorRoll = riverHash(sSeed * 7.9);
      let stoneColor = `rgba(51, 65, 85, ${visibility.toFixed(2)})`;
      if (colorRoll < 0.28) stoneColor = `rgba(30, 41, 59, ${visibility.toFixed(2)})`;
      else if (colorRoll < 0.55) stoneColor = `rgba(71, 85, 105, ${visibility.toFixed(2)})`;
      else if (colorRoll < 0.78) stoneColor = `rgba(68, 64, 60, ${visibility.toFixed(2)})`;
      else stoneColor = `rgba(36, 56, 38, ${visibility.toFixed(2)})`;

      // Sun-aligned underwater drop shadow
      ctx.fillStyle = `rgba(4, 10, 15, ${(0.48 * visibility).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(rx - sunDirX * 2.2, ry - sunDirY * 2.2, stoneRadX, stoneRadY, stoneAngle, 0, Math.PI * 2);
      ctx.fill();

      // Main rock body
      ctx.fillStyle = stoneColor;
      ctx.beginPath();
      ctx.ellipse(rx, ry, stoneRadX, stoneRadY, stoneAngle, 0, Math.PI * 2);
      ctx.fill();

      // Sunlit crown on the side facing the sun
      ctx.fillStyle = `rgba(226, 232, 240, ${(0.32 * visibility * (0.4 + 0.6 * dayFactor)).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(
        rx + sunDirX * (stoneRadX * 0.28),
        ry + sunDirY * (stoneRadY * 0.28),
        stoneRadX * 0.60,
        stoneRadY * 0.42,
        stoneAngle,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Emergent boulder / shallow ford riffle standing wave & whitewater wake
      if (stoneRadX > 4.2 || isFordZone) {
        const flowDirX = pt.tx;
        const flowDirY = pt.ty;
        const wakePulse = Math.sin(animTime * 4.8 + sSeed) * 0.16 + 0.84;
        const lightScale = 0.45 + 0.55 * dayFactor;

        ctx.strokeStyle = `rgba(240, 249, 255, ${(0.46 * wakePulse * lightScale).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(
          rx - flowDirX * (stoneRadX * 0.82),
          ry - flowDirY * (stoneRadX * 0.82),
          stoneRadY * 0.92,
          Math.atan2(-flowDirY, -flowDirX) - 0.78,
          Math.atan2(-flowDirY, -flowDirX) + 0.78
        );
        ctx.stroke();

        const wakeLength = stoneRadX * 3.1;
        ctx.strokeStyle = `rgba(186, 230, 253, ${(0.42 * wakePulse * lightScale).toFixed(3)})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(rx + pt.nx * (stoneRadY * 0.75), ry + pt.ny * (stoneRadY * 0.75));
        ctx.quadraticCurveTo(
          rx + flowDirX * (wakeLength * 0.5) + pt.nx * (stoneRadY * 0.4),
          ry + flowDirY * (wakeLength * 0.5) + pt.ny * (stoneRadY * 0.4),
          rx + flowDirX * wakeLength,
          ry + flowDirY * wakeLength
        );
        ctx.moveTo(rx - pt.nx * (stoneRadY * 0.75), ry - pt.ny * (stoneRadY * 0.75));
        ctx.quadraticCurveTo(
          rx + flowDirX * (wakeLength * 0.5) - pt.nx * (stoneRadY * 0.4),
          ry + flowDirY * (wakeLength * 0.5) - pt.ny * (stoneRadY * 0.4),
          rx + flowDirX * wakeLength,
          ry + flowDirY * wakeLength
        );
        ctx.stroke();
      }
    }
  }
}

/**
 * Dynamic Swaying Underwater Riverweed & Algae Beds
 * Bends with current AND parts aside when a vehicle passes through!
 */
function renderDynamicRiverweed(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number,
  vehicles?: Vehicle[]
) {
  for (let k = kStart; k < kEnd; k += 4) {
    const pt = RIVER_SPLINE_POINTS[k];
    const seed = k * 23.41;

    if (pt.depth < 0.25 || pt.depth > 1.9) continue;
    if (riverHash(seed) > 0.64) continue;

    const weedPatches = 1 + Math.floor(riverHash(seed * 2.1) * 2);
    for (let p = 0; p < weedPatches; p++) {
      const pSeed = seed + p * 13.7;
      const latFraction = (riverHash(pSeed) * 2 - 1) * 0.68;
      const rootX = pt.x + pt.nx * (pt.halfWidth * latFraction);
      const rootY = pt.y + pt.ny * (pt.halfWidth * latFraction);

      // Check if a vehicle is pushing through this weed patch
      let pushX = 0;
      let pushY = 0;
      if (vehicles) {
        for (let vIdx = 0; vIdx < vehicles.length; vIdx++) {
          const v = vehicles[vIdx];
          const dx = rootX - v.x;
          const dy = rootY - v.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 1600 && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const f = (1 - dist / 40) * 14;
            pushX += (dx / dist) * f;
            pushY += (dy / dist) * f;
          }
        }
      }

      const bladeCount = 3 + Math.floor(riverHash(pSeed * 3.3) * 3);
      for (let b = 0; b < bladeCount; b++) {
        const bSeed = pSeed + b * 5.71;
        const bladeLength = 16 + riverHash(bSeed * 1.9) * 24;
        const phaseOffset = riverHash(bSeed * 4.3) * Math.PI * 2;
        const swayFreq = 2.4 + (pt.currentSpeed / 30) * 1.2;

        const sway1 = Math.sin(animTime * swayFreq + phaseOffset) * 6.5;
        const sway2 = Math.sin(animTime * (swayFreq * 1.7) + phaseOffset * 1.4) * 3.0;
        const totalSway = sway1 + sway2;

        const tipX = rootX + pt.tx * bladeLength + pt.nx * totalSway + pushX;
        const tipY = rootY + pt.ty * bladeLength + pt.ny * totalSway + pushY;
        const midX = rootX + pt.tx * (bladeLength * 0.5) + pt.nx * (totalSway * 0.45) + pushX * 0.5;
        const midY = rootY + pt.ty * (bladeLength * 0.5) + pt.ny * (totalSway * 0.45) + pushY * 0.5;

        ctx.strokeStyle = (b % 2 === 0) ? 'rgba(20, 83, 45, 0.78)' : 'rgba(22, 101, 52, 0.78)';
        ctx.lineWidth = 1.4 + riverHash(bSeed * 7.1) * 0.8;
        ctx.beginPath();
        ctx.moveTo(rootX + b * 1.5 - 2, rootY);
        ctx.quadraticCurveTo(midX, midY, tipX, tipY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(74, 222, 128, 0.28)';
        ctx.beginPath();
        ctx.arc(tipX, tipY, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Cellular Sunlight Caustic Network & Multi-Harmonic Surface Flow Filaments.
 * Replaces old circular arcs with realistic refracted polygonal caustic light meshes
 * and Froude-modulated whitewater riffle chevrons.
 */
function renderFluidCurrentStreamlinesAndCaustics(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number,
  nightAlpha: number,
  weather: string,
  sunDirX: number,
  sunDirY: number
) {
  const dayFactor = Math.max(0, 1 - nightAlpha * 1.2);
  const sunState = getCurrentSunShadowState();

  // 1. Woven Cellular Caustics Network on Shallow-to-Mid Riverbed (during daylight)
  if (dayFactor > 0.12 && weather !== 'storm' && weather !== 'fog') {
    const causticBaseAlpha = 0.16 * dayFactor * Math.min(1.0, sunState.sunElevation * 1.4);
    ctx.strokeStyle = `rgba(186, 230, 253, ${causticBaseAlpha.toFixed(3)})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();

    for (let k = kStart; k < kEnd; k += 3) {
      const pt = RIVER_SPLINE_POINTS[k];
      if (pt.depth > 2.1) continue; // Caustics attenuate in deep abyssal pools
      const flowPhase = animTime * (pt.currentSpeed * 0.45) + k * 9.3;

      for (let cell = -2; cell <= 2; cell++) {
        const latBase = (cell * 0.34) * pt.halfWidth;
        const w1 = Math.sin(animTime * 2.1 + k * 0.7 + cell * 1.9) * 8;
        const w2 = Math.cos(animTime * 1.7 - k * 0.5 + cell * 2.3) * 8;

        const cx = pt.x + pt.nx * (latBase + w1) + pt.tx * ((flowPhase % 42) - 21);
        const cy = pt.y + pt.ny * (latBase + w2) + pt.ty * ((flowPhase % 42) - 21);

        // Draw a 5-sided refracted caustic cell filament with solar offset
        const rCell = 9 + Math.sin(animTime * 3.0 + k + cell) * 3.5;
        for (let v = 0; v <= 3; v++) {
          const a = (v / 5) * Math.PI * 2 + (k * 0.3 + cell * 0.8);
          const vx = cx + Math.cos(a) * rCell * 1.3 + sunDirX * 2;
          const vy = cy + Math.sin(a) * rCell * 0.8 + sunDirY * 2;
          if (v === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
      }
    }
    ctx.stroke();
  }

  // 2. Multi-pass surface flow filaments & shear ripples
  const passes = [
    { speedMult: 1.0, width: 1.5, alpha: nightAlpha > 0.6 ? 0.12 : 0.22 },
    { speedMult: 1.35, width: 1.0, alpha: nightAlpha > 0.6 ? 0.09 : 0.17 },
    { speedMult: 0.75, width: 2.1, alpha: nightAlpha > 0.6 ? 0.07 : 0.13 }
  ];

  for (const pass of passes) {
    ctx.lineWidth = pass.width;
    ctx.strokeStyle = `rgba(224, 242, 254, ${pass.alpha.toFixed(3)})`;
    ctx.beginPath();

    for (let k = kStart; k < kEnd; k += 2) {
      const pt = RIVER_SPLINE_POINTS[k];
      const kSeed = k * 11.19 + pass.speedMult * 7.3;
      const streamCycle = 140;
      const streamOffset = (animTime * pt.currentSpeed * pass.speedMult + kSeed * 17) % streamCycle;

      const filamentCount = pt.isFord ? 5 : 3;
      for (let f = 0; f < filamentCount; f++) {
        const fSeed = kSeed + f * 5.31;
        const latNorm = (riverHash(fSeed) * 2 - 1) * 0.80;
        const waveWiggle = Math.sin(animTime * 3.0 + k * 0.3 + f) * 3.8;

        const curX = pt.x + pt.tx * (streamOffset - 70) + pt.nx * (pt.halfWidth * latNorm + waveWiggle);
        const curY = pt.y + pt.ty * (streamOffset - 70) + pt.ny * (pt.halfWidth * latNorm + waveWiggle);

        const filamentLen = 20 + riverHash(fSeed * 2.7) * 26;
        const endX = curX + pt.tx * filamentLen;
        const endY = curY + pt.ty * filamentLen;

        ctx.moveTo(curX, curY);
        ctx.quadraticCurveTo(
          curX + pt.tx * (filamentLen * 0.5) + pt.nx * (waveWiggle * 0.6),
          curY + pt.ty * (filamentLen * 0.5) + pt.ny * (waveWiggle * 0.6),
          endX,
          endY
        );
      }
    }
    ctx.stroke();
  }

  // 3. Direct Solar / Lunar Specular Glitter Track across River Wave Crests
  const glintAlpha = nightAlpha > 0.6 ? 0.22 : (0.38 * dayFactor);
  ctx.fillStyle = nightAlpha > 0.6
    ? `rgba(186, 230, 253, ${glintAlpha.toFixed(3)})`
    : `rgba(255, 252, 235, ${glintAlpha.toFixed(3)})`;

  for (let k = kStart; k < kEnd; k += 2) {
    const pt = RIVER_SPLINE_POINTS[k];
    // Sun glints cluster along the sunward reflection band of the channel
    const sunLatBias = (pt.nx * sunDirX + pt.ny * sunDirY) * 0.35;
    for (let g = 0; g < 3; g++) {
      const gPhase = animTime * 4.2 + k * 1.7 + g * 2.3;
      const sparkle = Math.sin(gPhase) * Math.cos(gPhase * 1.37);
      if (sparkle < 0.45) continue;

      const lat = (sunLatBias + (riverHash(k * 7.1 + g * 3.9) - 0.5) * 0.85) * pt.halfWidth;
      const lon = (riverHash(k * 3.7 + g * 11.3) - 0.5) * 45;
      const gx = pt.x + pt.nx * lat + pt.tx * lon;
      const gy = pt.y + pt.ny * lat + pt.ty * lon;
      const gw = 2.2 + (sparkle - 0.45) * 6.5;

      ctx.beginPath();
      ctx.ellipse(gx, gy, gw, 0.9, Math.atan2(pt.ty, pt.tx), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Shoreline Lapping Wavelets & Receding Wet Foam Meniscus along Left & Right Riverbanks
 */
function renderShorelineLappingWaves(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number,
  nightAlpha: number
) {
  const lightScale = Math.max(0.35, 1 - nightAlpha * 0.65);

  for (const side of [-1, 1]) {
    const lapWave = Math.sin(animTime * 2.2 + (side > 0 ? 0 : Math.PI)) * 2.2;

    ctx.strokeStyle = `rgba(224, 242, 254, ${(0.28 * lightScale).toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let k = kStart; k <= kEnd; k++) {
      const pt = RIVER_SPLINE_POINTS[k];
      const localOsc = Math.sin(animTime * 2.8 + k * 0.55 + side) * 1.8 + lapWave;
      const dist = pt.halfWidth - 2.5 + localOsc;
      const sx = pt.x + pt.nx * (dist * side);
      const sy = pt.y + pt.ny * (dist * side);
      if (k === kStart) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Secondary inner capillary ripple parallel to bank
    ctx.strokeStyle = `rgba(186, 230, 253, ${(0.15 * lightScale).toFixed(3)})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let k = kStart; k <= kEnd; k++) {
      const pt = RIVER_SPLINE_POINTS[k];
      const localOsc = Math.cos(animTime * 2.8 + k * 0.55 + side) * 1.5 - lapWave * 0.6;
      const dist = pt.halfWidth - 8.5 + localOsc;
      const sx = pt.x + pt.nx * (dist * side);
      const sy = pt.y + pt.ny * (dist * side);
      if (k === kStart) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
}

/**
 * Water Lilies & Duckweed in calm river bays (Тихий Плёс)
 */
function renderWaterLilies(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number
) {
  for (let k = kStart; k < kEnd; k += 8) {
    const pt = RIVER_SPLINE_POINTS[k];
    if (pt.currentSpeed < 26) {
      const seed = Math.floor(pt.x + pt.y);
      const bobY = Math.sin(animTime * 2.0 + seed) * 1.2;
      const lx = pt.x + pt.nx * (pt.halfWidth * 0.65) + Math.sin(seed) * 12;
      const ly = pt.y + pt.ny * (pt.halfWidth * 0.65) + Math.cos(seed) * 12 + bobY;

      ctx.fillStyle = 'rgba(5, 15, 20, 0.35)';
      ctx.beginPath();
      ctx.arc(lx + 1.5, ly + 1.5, 5.0, 0.2, Math.PI * 1.8);
      ctx.fill();

      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(lx, ly, 4.8, 0.2, Math.PI * 1.8);
      ctx.fill();

      if (k % 16 === 0) {
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(lx, ly, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(lx, ly, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Dynamic Floating River Debris
 */
function renderFloatingRiverDebris(
  ctx: CanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  animTime: number
) {
  for (let i = 0; i < floatingDebrisList.length; i++) {
    const d = floatingDebrisList[i];
    if (d.x < minX - 40 || d.x > maxX + 40 || d.y < minY - 40 || d.y > maxY + 40) {
      continue;
    }

    const bobOffset = Math.sin(animTime * d.wobbleFreq + d.seed) * 1.2;
    const drawX = d.x;
    const drawY = d.y + bobOffset;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(d.angle);

    switch (d.type) {
      case 'branch_pine': {
        ctx.fillStyle = 'rgba(5, 15, 22, 0.40)';
        ctx.fillRect(-d.size * 0.5 + 1.5, 1.5, d.size, 2.2);

        ctx.fillStyle = '#451a03';
        ctx.fillRect(-d.size * 0.5, -1, d.size, 2.0);

        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.1, 0);
        ctx.lineTo(d.size * 0.25, -4);
        ctx.stroke();

        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(d.size * 0.25, -4);
        ctx.lineTo(d.size * 0.4, -6);
        ctx.moveTo(d.size * 0.25, -4);
        ctx.lineTo(d.size * 0.35, -2);
        ctx.stroke();
        break;
      }

      case 'twig': {
        ctx.fillStyle = 'rgba(5, 15, 22, 0.35)';
        ctx.fillRect(-d.size * 0.5 + 1.2, 1.2, d.size, 1.6);

        ctx.fillStyle = '#54361e';
        ctx.fillRect(-d.size * 0.5, -0.8, d.size, 1.6);
        break;
      }

      case 'leaf_yellow':
      case 'leaf_red':
      case 'leaf_orange': {
        const leafColor = d.type === 'leaf_yellow' ? '#eab308' : (d.type === 'leaf_red' ? '#dc2626' : '#ea580c');
        ctx.fillStyle = 'rgba(5, 15, 22, 0.35)';
        ctx.beginPath();
        ctx.ellipse(1.5, 1.5, d.size * 0.65, d.size * 0.35, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = leafColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, d.size * 0.65, d.size * 0.35, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(67, 20, 7, 0.45)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.6, 0);
        ctx.lineTo(d.size * 0.6, 0);
        ctx.stroke();
        break;
      }

      case 'bark_chip': {
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(0, 0, d.size * 0.55, d.size * 0.4, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-d.size * 0.25, -d.size * 0.15, d.size * 0.5, d.size * 0.3);
        break;
      }

      case 'foam_patch': {
        ctx.fillStyle = 'rgba(240, 249, 255, 0.62)';
        ctx.beginPath();
        ctx.arc(0, 0, d.size * 0.45, 0, Math.PI * 2);
        ctx.arc(d.size * 0.3, d.size * 0.2, d.size * 0.35, 0, Math.PI * 2);
        ctx.arc(-d.size * 0.25, d.size * 0.15, d.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }
}

/**
 * Bridge Pile Stagnation Bow Waves & Karman Vortex Streets
 */
function renderObstacleWakes(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number
) {
  const bX = 9400;
  const bY = -3300;
  const pileYPositions = [bY - 60, bY - 20, bY + 20, bY + 60];

  for (const py of pileYPositions) {
    const pileWater = getRiverWaterAt(bX, py);
    if (!pileWater.inWater) continue;

    const flowVx = pileWater.currentVx || 38;
    const flowVy = pileWater.currentVy || 0;
    const flowLen = Math.hypot(flowVx, flowVy) || 1;
    const dirX = flowVx / flowLen;
    const dirY = flowVy / flowLen;
    const normX = -dirY;
    const normY = dirX;

    const pileRadius = 8;
    const wakePulse = Math.sin(animTime * 5.0 + py) * 0.2 + 0.8;

    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.75 * wakePulse).toFixed(2)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(
      bX - dirX * (pileRadius * 0.9),
      py - dirY * (pileRadius * 0.9),
      pileRadius * 1.3,
      Math.atan2(-dirY, -dirX) - 0.95,
      Math.atan2(-dirY, -dirX) + 0.95
    );
    ctx.stroke();

    const wakeLen = 42;
    ctx.strokeStyle = `rgba(224, 242, 254, ${(0.55 * wakePulse).toFixed(2)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bX + normX * pileRadius, py + normY * pileRadius);
    ctx.lineTo(bX + dirX * wakeLen + normX * (pileRadius * 2.2), py + dirY * wakeLen + normY * (pileRadius * 2.2));
    ctx.moveTo(bX - normX * pileRadius, py - normY * pileRadius);
    ctx.lineTo(bX + dirX * wakeLen - normX * (pileRadius * 2.2), py + dirY * wakeLen - normY * (pileRadius * 2.2));
    ctx.stroke();

    const eddyOffset1 = Math.sin(animTime * 6.0 + py * 0.1) * (pileRadius * 0.8);
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.60 * wakePulse).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(bX + dirX * 16 + normX * eddyOffset1, py + dirY * 16 + normY * eddyOffset1, 1.8, 0, Math.PI * 2);
    ctx.arc(bX + dirX * 28 - normX * eddyOffset1, py + dirY * 28 - normY * eddyOffset1, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Shoreline Reeds & Cattails along banks
 */
function renderShorelineReeds(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number
) {
  for (let k = kStart; k < kEnd; k += 5) {
    const pt = RIVER_SPLINE_POINTS[k];
    const seed = Math.floor(pt.x * 0.1 + pt.y * 0.1);
    if (seed % 3 === 0) {
      const rx = pt.x + pt.nx * (pt.halfWidth + 4);
      const ry = pt.y + pt.ny * (pt.halfWidth + 4);

      ctx.strokeStyle = '#3a6629';
      ctx.lineWidth = 1.2;
      for (let r = -2; r <= 2; r++) {
        const windSway = Math.sin(animTime * 2.5 + r + k) * 2.5;
        ctx.beginPath();
        ctx.moveTo(rx + r * 3, ry);
        ctx.lineTo(rx + r * 3 + windSway, ry - 8 - Math.abs(r) * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#3d2817';
      ctx.fillRect(rx - 1, ry - 11, 2.2, 5);
    }
  }
}

function renderLoggingBridge(ctx: CanvasRenderingContext2D, nightAlpha: number) {
  const bX = 9400;
  const bY = -3300;
  const bWidth = 64;
  const bLength = 175;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(bX - bWidth * 0.5 + 8, bY - bLength * 0.5 + 8, bWidth, bLength);

  const pileYPositions = [bY - 60, bY - 20, bY + 20, bY + 60];
  for (const py of pileYPositions) {
    ctx.fillStyle = '#261a10';
    ctx.beginPath();
    ctx.arc(bX - bWidth * 0.5 - 4, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bX + bWidth * 0.5 + 4, py, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3a2717';
    ctx.fillRect(bX - bWidth * 0.5 - 4, py - 3, bWidth + 8, 6);
  }

  ctx.fillStyle = '#452f1d';
  ctx.fillRect(bX - bWidth * 0.45, bY - bLength * 0.5, 8, bLength);
  ctx.fillRect(bX - bWidth * 0.15, bY - bLength * 0.5, 8, bLength);
  ctx.fillRect(bX + bWidth * 0.15 - 8, bY - bLength * 0.5, 8, bLength);
  ctx.fillRect(bX + bWidth * 0.45 - 8, bY - bLength * 0.5, 8, bLength);

  const plankCount = Math.floor(bLength / 5);
  for (let p = 0; p < plankCount; p++) {
    const py = bY - bLength * 0.5 + p * 5;
    const tone = (p % 3 === 0) ? '#684a30' : (p % 3 === 1) ? '#5c3f28' : '#523722';
    ctx.fillStyle = tone;
    ctx.fillRect(bX - bWidth * 0.5, py, bWidth, 4.2);
  }

  ctx.fillStyle = '#3e2918';
  ctx.fillRect(bX - bWidth * 0.5, bY - bLength * 0.5, 5, bLength);
  ctx.fillRect(bX + bWidth * 0.5 - 5, bY - bLength * 0.5, 5, bLength);

  for (let postY = bY - bLength * 0.5; postY <= bY + bLength * 0.5; postY += 25) {
    ctx.fillStyle = '#2d1e12';
    ctx.fillRect(bX - bWidth * 0.5 - 2, postY - 2, 4, 4);
    ctx.fillRect(bX + bWidth * 0.5 - 2, postY - 2, 4, 4);
  }

  ctx.restore();
}

function renderFishingPiers(ctx: CanvasRenderingContext2D, nightAlpha: number) {
  const pierPositions = [
    { x: 14160, y: -3020, angle: 0.15, length: 75, width: 20 },
    { x: 14240, y: -2880, angle: -0.10, length: 80, width: 22 }
  ];

  ctx.save();
  for (const pier of pierPositions) {
    ctx.translate(pier.x, pier.y);
    ctx.rotate(pier.angle);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(3, 3, pier.width, pier.length);

    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(2, pier.length * 0.35, 4, 4);
    ctx.fillRect(pier.width - 6, pier.length * 0.35, 4, 4);
    ctx.fillRect(2, pier.length - 6, 4, 4);
    ctx.fillRect(pier.width - 6, pier.length - 6, 4, 4);

    const planks = Math.floor(pier.length / 5);
    for (let p = 0; p < planks; p++) {
      ctx.fillStyle = (p % 2 === 0) ? '#5c4532' : '#4e3928';
      ctx.fillRect(0, p * 5, pier.width, 4);
    }

    ctx.rotate(-pier.angle);
    ctx.translate(-pier.x, -pier.y);
  }
  ctx.restore();
}

function renderRiverAccessExits(
  ctx: CanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  nightAlpha: number = 0
) {
  const riverExits = [
    { x: 9400,  yEnd: -3220, targetY: -3360, width: 90  },
    { x: 12400, yEnd: -3010, targetY: -3150, width: 140 },
    { x: 14200, yEnd: -2890, targetY: -2970, width: 90  }
  ];

  ctx.save();

  for (const exit of riverExits) {
    if (exit.x + exit.width < minX - 100 || exit.x - exit.width > maxX + 100) continue;
    const minYExit = Math.min(exit.yEnd, exit.targetY) - 50;
    const maxYExit = Math.max(exit.yEnd, exit.targetY) + 50;
    if (maxY < minYExit || minY > maxYExit) continue;

    const topY = exit.yEnd;
    const botY = exit.targetY;
    const midY = (topY + botY) * 0.5;
    const halfW = exit.width * 0.5;

    const shadowGradient = ctx.createLinearGradient(exit.x - halfW - 40, topY + 30, exit.x + halfW + 40, topY - 30);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    shadowGradient.addColorStop(0.5, 'rgba(20, 15, 10, 0.45)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.10)');

    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.moveTo(exit.x - halfW - 35, topY + 25);
    ctx.lineTo(exit.x + halfW + 35, topY + 25);
    ctx.lineTo(exit.x + halfW + 15, topY - 20);
    ctx.lineTo(exit.x - halfW - 15, topY - 20);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(exit.x - halfW * 0.8, topY + 20);
    ctx.quadraticCurveTo(exit.x - halfW * 1.3, midY, exit.x - halfW * 1.6, botY);
    ctx.lineTo(exit.x + halfW * 1.6, botY);
    ctx.quadraticCurveTo(exit.x + halfW * 1.3, midY, exit.x + halfW * 0.8, topY + 20);
    ctx.closePath();

    ctx.fillStyle = '#1e150d';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(exit.x - halfW * 0.9, topY + 35);
    ctx.quadraticCurveTo(exit.x - halfW * 1.5, midY, exit.x - halfW * 1.8, botY + 20);
    ctx.lineTo(exit.x + halfW * 1.8, botY + 20);
    ctx.quadraticCurveTo(exit.x + halfW * 1.5, midY, exit.x + halfW * 0.9, topY + 35);
    ctx.closePath();

    ctx.fillStyle = 'rgba(56, 42, 29, 0.65)';
    ctx.fill();

    const rutOffsets = [-halfW * 0.6, -halfW * 0.2, halfW * 0.2, halfW * 0.6];
    for (const roff of rutOffsets) {
      const x0 = exit.x + roff * 0.85;
      const y0 = topY + 15;
      const cx = exit.x + roff * 1.1 + Math.sin(exit.x + roff) * 12;
      const cy = midY;
      const x1 = exit.x + roff * 1.35;
      const y1 = botY - 10;

      ctx.lineWidth = 3.2;
      ctx.strokeStyle = 'rgba(8, 4, 1, 0.72)';
      ctx.beginPath();
      ctx.moveTo(x0 - 3.2, y0 + 1);
      ctx.quadraticCurveTo(cx - 3.8, cy + 1, x1 - 4.2, y1 + 1);
      ctx.moveTo(x0 + 4.4, y0 + 1);
      ctx.quadraticCurveTo(cx + 5.0, cy + 1, x1 + 5.4, y1 + 1);
      ctx.stroke();

      ctx.lineWidth = 2.6;
      ctx.strokeStyle = '#3d2a1c';
      ctx.beginPath();
      ctx.moveTo(x0 - 4.0, y0);
      ctx.quadraticCurveTo(cx - 4.6, cy, x1 - 5.0, y1);
      ctx.moveTo(x0 + 3.6, y0);
      ctx.quadraticCurveTo(cx + 4.2, cy, x1 + 4.6, y1);
      ctx.stroke();

      ctx.lineWidth = 1.0;
      ctx.strokeStyle = `rgba(186, 220, 248, ${(0.28 * (1 - nightAlpha * 0.6)).toFixed(2)})`;
      ctx.setLineDash([10, 8, 5, 11]);
      ctx.beginPath();
      ctx.moveTo(x0 - 4.4, y0 - 0.5);
      ctx.quadraticCurveTo(cx - 5.0, cy - 0.5, x1 - 5.4, y1 - 0.5);
      ctx.moveTo(x0 + 3.2, y0 - 0.5);
      ctx.quadraticCurveTo(cx + 3.8, cy - 0.5, x1 + 4.2, y1 - 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.lineWidth = 5.6;
      ctx.strokeStyle = '#0c0704';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cy, x1, y1);
      ctx.stroke();

      ctx.lineWidth = 2.0;
      ctx.strokeStyle = nightAlpha > 0.6 ? 'rgba(30, 58, 82, 0.55)' : 'rgba(125, 190, 230, 0.36)';
      ctx.setLineDash([16, 10, 8, 14]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cy, x1, y1);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (let p = 0; p < 6; p++) {
      const pY = topY + (botY - topY) * (0.22 + p * 0.14) + Math.sin(exit.x + p * 1.7) * 9;
      const pX = exit.x + (p % 2 === 0 ? -1 : 1) * halfW * (0.16 + (p % 3) * 0.22);
      const prx = 12 + (p % 3) * 4;
      const pry = 5.5 + (p % 2) * 2.0;

      ctx.fillStyle = 'rgba(8, 5, 2, 0.72)';
      ctx.beginPath();
      ctx.ellipse(pX, pY, prx + 2.2, pry + 1.6, 0.18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = (nightAlpha > 0.6) ? 'rgba(15, 28, 42, 0.78)' : 'rgba(28, 68, 88, 0.72)';
      ctx.beginPath();
      ctx.ellipse(pX, pY, prx, pry, 0.18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(224, 242, 254, ${(0.36 * (1 - nightAlpha * 0.65)).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(pX - prx * 0.25, pY - pry * 0.22, prx * 0.38, pry * 0.22, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    const postPositions = [
      { x: exit.x - halfW - 8, y: topY + 10 },
      { x: exit.x + halfW + 8, y: topY + 10 },
      { x: exit.x - halfW * 1.2 - 10, y: midY },
      { x: exit.x + halfW * 1.2 + 10, y: midY },
      { x: exit.x - halfW * 1.4 - 12, y: botY + 15 },
      { x: exit.x + halfW * 1.4 + 12, y: botY + 15 }
    ];

    for (const post of postPositions) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(post.x + 2, post.y + 2, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(post.x - 1.5, post.y - 12, 3, 12);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(post.x - 1.5, post.y - 9, 3, 3);
      ctx.fillRect(post.x - 1.5, post.y - 3, 3, 3);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(post.x - 1.5, post.y - 12, 3, 2);
    }

    renderExitWarningSignPlate(ctx, exit.x + halfW + 28, topY + 25);
  }

  ctx.restore();
}

function renderExitWarningSignPlate(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(3, 3, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#475569';
  ctx.fillRect(-1.5, -20, 3, 20);

  ctx.save();
  ctx.translate(0, -22);

  const sz = 14;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -sz);
  ctx.lineTo(sz * 0.866, sz * 0.5);
  ctx.lineTo(-sz * 0.866, sz * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(0, -sz + 2.2);
  ctx.lineTo(sz * 0.866 - 2.0, sz * 0.5 - 1.2);
  ctx.lineTo(-sz * 0.866 + 2.0, sz * 0.5 - 1.2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(-3.5, -2, 7, 3);
  ctx.fillRect(-2.5, -3.8, 5, 1.8);

  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(-2, 2.5, 2, 0.2, Math.PI);
  ctx.arc(2, 2.5, 2, 0.2, Math.PI);
  ctx.stroke();

  ctx.restore();

  ctx.save();
  ctx.translate(0, -6);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-18, -4, 36, 8);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-18, -4, 36, 8);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 3.2px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ВЯЗКИЙ ИЛ', 0, -1.8);
  ctx.font = 'bold 2.5px sans-serif';
  ctx.fillStyle = '#dc2626';
  ctx.fillText('СЪЕЗД К ВОДЕ', 0, 1.8);
  ctx.restore();

  ctx.restore();
}

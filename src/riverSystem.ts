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
  splinePos: number;
  latFrac: number;
}

// Persistent dispersive water wave ring / wake packet in world space
export interface WaterDisturbance {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sourceVx: number;
  sourceVy: number;
  radius: number;
  maxRadius: number;
  intensity: number; // 0..1 initial wave energy
  age: number;
  maxAge: number;
  angle: number;
  isDirectionalWake: boolean;
  foamIntensity: number;
}

export interface PostFxWaterWake {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  vx: number;
  vy: number;
  progress: number;
  typeAndFoam: number; // < 1.0: concentric ripple (fractional part = foam), [1.0..1.99]: moving Kelvin wake (1.0 + foam), >= 2.0: obstacle flow-around wake & collar (2.0 + foam)
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
      const isBridge = Math.abs(x - 9400) <= 34;

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

// --- PERSISTENT WATER WAVE RING, KELVIN WAKE & OBSTACLE FLOW-AROUND SOLVER ---
const MAX_WATER_DISTURBANCES = 192;
const waterDisturbances: WaterDisturbance[] = [];
let lastDisturbanceEmitMap = new Map<string, number>();
const postFxWakesScratch: PostFxWaterWake[] = [];

// Instantaneous frame-accurate obstacle wakes (submerged vehicles, boulders, bridge piers, wading humans in current)
const frameObstacleWakes: PostFxWaterWake[] = [];

export function emitObstacleFlowWake(
  x: number,
  y: number,
  relVx: number,
  relVy: number,
  obstacleRadius: number,
  intensity: number,
  foamIntensity: number
) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  frameObstacleWakes.push({
    x,
    y,
    radius: Math.max(3.5, obstacleRadius),
    intensity: Math.max(0.08, Math.min(1.35, intensity)),
    vx: relVx,
    vy: relVy,
    progress: 0.25,
    typeAndFoam: 2.0 + Math.max(0.0, Math.min(0.98, foamIntensity))
  });
}

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
    if (lastDisturbanceEmitMap.size > 320) {
      lastDisturbanceEmitMap.clear();
    }
  }

  const river = getRiverWaterAt(x, y);
  const relVx = vx - (river.inWater ? river.currentVx : 0);
  const relVy = vy - (river.inWater ? river.currentVy : 0);
  const relSpeed = Math.hypot(relVx, relVy);
  const speed = Math.hypot(vx, vy);
  const effSpeed = Math.max(speed, relSpeed);
  const angle = relSpeed > 1.5 ? Math.atan2(relVy, relVx) : (speed > 1.0 ? Math.atan2(vy, vx) : 0);
  const maxR = Math.min(115, radius * (isDirectionalWake ? 4.2 : 4.8) + effSpeed * 0.20);
  const maxAge = isDirectionalWake
    ? (1.25 + Math.min(1.15, intensity * 0.95))
    : (1.65 + Math.min(1.35, intensity * 1.05));

  if (waterDisturbances.length >= MAX_WATER_DISTURBANCES) {
    waterDisturbances.shift();
  }

  waterDisturbances.push({
    x,
    y,
    vx: vx * 0.14,
    vy: vy * 0.14,
    sourceVx: relSpeed > 1.5 ? relVx : vx,
    sourceVy: relSpeed > 1.5 ? relVy : vy,
    radius: Math.max(2.5, radius * 0.72),
    maxRadius: maxR,
    intensity: Math.max(0.08, Math.min(1.2, intensity)),
    age: 0,
    maxAge,
    angle,
    isDirectionalWake,
    foamIntensity: Math.min(0.98, Math.max(0.08, (effSpeed / 70) * intensity))
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
    const curVx = river.inWater ? river.currentVx * 0.85 : 0;
    const curVy = river.inWater ? river.currentVy * 0.85 : 0;
    w.x += (w.vx + curVx) * dt;
    w.y += (w.vy + curVy) * dt;
    w.vx *= Math.pow(0.22, dt);
    w.vy *= Math.pow(0.22, dt);

    // Capillary-gravity dispersion: fast initial phase velocity, decelerating as wavelength stretches
    const progress = w.age / w.maxAge;
    const expandRate = (w.maxRadius - w.radius) / Math.max(0.15, w.maxAge - w.age * 0.68);
    w.radius += expandRate * dt * (1.18 - progress * 0.45);
  }
}

/**
 * Exports active world-space water disturbances and obstacle flow-around wakes (up to maxCount = 32) near the camera
 * for direct WebGL2 water shader evaluation (real-time wave normal perturbation, refraction,
 * dispersive capillary-gravity wave packets, Kelvin V-wakes, bow stagnation collars, and porous cellular whitewater foam).
 */
export function getActivePostFxWaterWakes(
  cameraX: number,
  cameraY: number,
  maxCount: number = 32
): PostFxWaterWake[] {
  postFxWakesScratch.length = 0;
  const cullRadiusSq = 980 * 980;

  // 1. Add instantaneous obstacle flow-around wakes emitted this frame (vehicles, wading players, boulders)
  for (let i = 0; i < frameObstacleWakes.length; i++) {
    const ow = frameObstacleWakes[i];
    const dx = ow.x - cameraX;
    const dy = ow.y - cameraY;
    if (dx * dx + dy * dy <= cullRadiusSq) {
      postFxWakesScratch.push(ow);
    }
  }

  // 2. Include stationary bridge pier & fishing pier hydraulic wakes when camera is near them
  if (Math.abs(cameraX - 9400) < 850 && Math.abs(cameraY - (-3300)) < 750) {
    const bX = 9400;
    const bY = -3300;
    const pileYPositions = [bY - 60, bY - 20, bY + 20, bY + 60];
    for (let p = 0; p < pileYPositions.length; p++) {
      const py = pileYPositions[p];
      const pileWater = getRiverWaterAt(bX, py);
      if (!pileWater.inWater) continue;
      // Stationary pier in flowing current acts like an obstacle moving upstream at -currentV
      postFxWakesScratch.push({
        x: bX,
        y: py,
        radius: 13.5,
        intensity: 0.92,
        vx: -(pileWater.currentVx || 38),
        vy: -(pileWater.currentVy || 0),
        progress: 0.22,
        typeAndFoam: 2.78
      });
    }
  }

  // Include emergent river boulders near camera as real GPU hydraulic obstacles
  if (cameraY >= RIVER_MIN_Y - 500 && cameraY <= RIVER_MAX_Y + 500 && cameraX >= RIVER_MIN_X - 500 && cameraX <= RIVER_MAX_X + 500) {
    const bIdx = Math.floor((cameraX - RIVER_MIN_X) / BUCKET_SIZE);
    const indices = (bIdx >= 0 && bIdx < BUCKET_COUNT) ? RIVER_BUCKETS[bIdx] : [];
    for (let idx = 0; idx < indices.length; idx++) {
      const k = indices[idx];
      if (k % 2 !== 0) continue;
      const pt = RIVER_SPLINE_POINTS[k];
      if (Math.abs(pt.x - cameraX) > 540 || Math.abs(pt.y - cameraY) > 540) continue;
      const seed = k * 17.83;
      const isFordZone = pt.isFord || Math.abs(pt.x - 12400) < 280;
      const stoneDensity = isFordZone ? 6 : (pt.depth < 1.35 ? 3 : (riverHash(seed) < 0.45 ? 2 : 0));
      for (let s = 0; s < stoneDensity; s++) {
        const sSeed = seed + s * 9.41;
        const latFraction = (riverHash(sSeed) * 2 - 1) * 0.86;
        const stoneRadX = (isFordZone ? 3.2 : 2.2) + riverHash(sSeed * 3.1) * (isFordZone ? 5.2 : 3.4);
        const localDepth = pt.depth * Math.max(0.14, 1 - latFraction * latFraction * 0.88);
        const isEmergentBoulder = (localDepth < 0.44 && stoneRadX > 4.2) || (isFordZone && stoneRadX > 4.8 && riverHash(sSeed * 6.3) > 0.35);
        if (!isEmergentBoulder) continue;

        const alongOff = (riverHash(sSeed * 1.7) - 0.5) * 16;
        const crossOff = (riverHash(sSeed * 2.3) - 0.5) * 10;
        const rx = pt.x + pt.nx * (pt.halfWidth * latFraction + crossOff) + pt.tx * alongOff;
        const ry = pt.y + pt.ny * (pt.halfWidth * latFraction + crossOff) + pt.ty * alongOff;
        const dx = rx - cameraX;
        const dy = ry - cameraY;
        if (dx * dx + dy * dy > 480 * 480) continue;

        const flowSpeed = pt.currentSpeed * Math.max(0.45, 1.0 - 0.45 * latFraction * latFraction);
        postFxWakesScratch.push({
          x: rx,
          y: ry,
          radius: stoneRadX * 1.65,
          intensity: 0.78,
          vx: -pt.tx * flowSpeed,
          vy: -pt.ty * flowSpeed,
          progress: 0.25,
          typeAndFoam: 2.68
        });
      }
    }
  }

  // 3. Add persistent propagating dispersive wave packets & moving Kelvin wakes
  for (let i = waterDisturbances.length - 1; i >= 0; i--) {
    const w = waterDisturbances[i];
    const dx = w.x - cameraX;
    const dy = w.y - cameraY;
    if (dx * dx + dy * dy > cullRadiusSq) continue;

    const progress = Math.min(1.0, Math.max(0.0, w.age / Math.max(0.05, w.maxAge)));
    const fade = (1.0 - progress) * (1.0 - progress * 0.65) * w.intensity;
    if (fade < 0.025) continue;

    const foam = Math.min(0.95, Math.max(0.0, w.foamIntensity * (1.0 - progress * 0.72)));
    postFxWakesScratch.push({
      x: w.x,
      y: w.y,
      radius: Math.max(3.0, w.radius),
      intensity: fade,
      vx: w.sourceVx,
      vy: w.sourceVy,
      progress,
      typeAndFoam: w.isDirectionalWake ? (1.0 + foam) : foam
    });
  }

  if (postFxWakesScratch.length > maxCount) {
    postFxWakesScratch.sort((a, b) => {
      // Prioritize active obstacle wakes slightly so nearby submerged cars/rocks always get crisp bow waves
      const prioA = (a.typeAndFoam >= 2.0 ? 2.2 : 1.0) * a.intensity * a.radius;
      const prioB = (b.typeAndFoam >= 2.0 ? 2.2 : 1.0) * b.intensity * b.radius;
      return prioB - prioA;
    });
    postFxWakesScratch.length = maxCount;
  }

  return postFxWakesScratch;
}

// --- DYNAMIC RIVER FLOATING DEBRIS SIMULATION ---
const DEBRIS_TYPES: Array<RiverFloatingDebris['type']> = [
  'leaf_yellow', 'leaf_red', 'leaf_orange', 'branch_pine', 'twig', 'bark_chip', 'foam_patch'
];

function initFloatingDebris(): RiverFloatingDebris[] {
  const debris: RiverFloatingDebris[] = [];
  const count = 135;
  const maxSpline = RIVER_SPLINE_POINTS.length - 6;
  for (let i = 0; i < count; i++) {
    const splinePos = 3 + (i / count) * (maxSpline - 3);
    const ptIdx = Math.floor(splinePos);
    const pt = RIVER_SPLINE_POINTS[ptIdx];
    const latFrac = (riverHash(i * 19.3) * 2 - 1) * 0.72;
    const latOffset = latFrac * pt.halfWidth;
    const type = DEBRIS_TYPES[Math.floor(riverHash(i * 7.7) * DEBRIS_TYPES.length)];
    debris.push({
      x: pt.x + pt.nx * latOffset,
      y: pt.y + pt.ny * latOffset,
      vx: pt.tx * pt.currentSpeed,
      vy: pt.ty * pt.currentSpeed,
      angle: riverHash(i * 3.1) * Math.PI * 2,
      spinSpeed: (riverHash(i * 5.3) - 0.5) * 0.55,
      size: 2.6 + riverHash(i * 11.2) * 3.8,
      type,
      seed: i,
      wobbleFreq: 1.2 + riverHash(i * 13.7) * 1.8,
      wobbleAmp: 1.5 + riverHash(i * 17.1) * 2.5,
      splinePos,
      latFrac
    });
  }
  return debris;
}

let floatingDebrisList: RiverFloatingDebris[] = initFloatingDebris();
let lastDebrisUpdate = Date.now();

export function updateRiverDebris(dt: number) {
  updateWaterDisturbances(dt);

  const maxIdx = RIVER_SPLINE_POINTS.length - 2;
  const nowSec = performance.now() * 0.001;

  for (let i = 0; i < floatingDebrisList.length; i++) {
    const d = floatingDebrisList[i];
    const idx0 = Math.max(0, Math.min(maxIdx - 1, Math.floor(d.splinePos)));
    const frac = d.splinePos - idx0;
    const p0 = RIVER_SPLINE_POINTS[idx0];
    const p1 = RIVER_SPLINE_POINTS[idx0 + 1];

    const segDx = p1.x - p0.x;
    const segDy = p1.y - p0.y;
    const segLen = Math.max(12, Math.hypot(segDx, segDy));

    // Parabolic velocity profile across channel width (faster near thalweg, slower near banks)
    const speedProfile = Math.max(0.38, 1.0 - 0.45 * d.latFrac * d.latFrac);
    const localSpeed = (p0.currentSpeed + (p1.currentSpeed - p0.currentSpeed) * frac) * speedProfile;

    d.splinePos += (localSpeed * dt) / segLen;
    if (d.splinePos >= maxIdx - 1) {
      d.splinePos = 2 + (d.splinePos - (maxIdx - 1)) % (maxIdx - 4);
      d.latFrac = (riverHash(d.seed * 43.1 + Math.floor(nowSec * 0.1)) * 2 - 1) * 0.72;
    }

    // Gentle secondary helicoidal drift & eddy meander kept strictly within [-0.76, +0.76] of halfWidth
    const eddySway = Math.sin(nowSec * d.wobbleFreq + d.seed * 4.7) * 0.035 * dt;
    const thalwegPull = (p0.thalwegBias * 0.5 - d.latFrac) * 0.04 * dt;
    d.latFrac = Math.max(-0.76, Math.min(0.76, d.latFrac + eddySway + thalwegPull));

    const curIdx = Math.max(0, Math.min(maxIdx - 1, Math.floor(d.splinePos)));
    const curFrac = d.splinePos - curIdx;
    const c0 = RIVER_SPLINE_POINTS[curIdx];
    const c1 = RIVER_SPLINE_POINTS[curIdx + 1];

    const cx = c0.x + (c1.x - c0.x) * curFrac;
    const cy = c0.y + (c1.y - c0.y) * curFrac;
    const nx = c0.nx + (c1.nx - c0.nx) * curFrac;
    const ny = c0.ny + (c1.ny - c0.ny) * curFrac;
    const tx = c0.tx + (c1.tx - c0.tx) * curFrac;
    const ty = c0.ty + (c1.ty - c0.ty) * curFrac;
    const hw = c0.halfWidth + (c1.halfWidth - c0.halfWidth) * curFrac;

    d.x = cx + nx * (hw * d.latFrac);
    d.y = cy + ny * (hw * d.latFrac);
    d.vx = tx * localSpeed;
    d.vy = ty * localSpeed;
    d.angle += (d.spinSpeed + c0.bendCurvature * 12) * dt;
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

  // Bridge & pier deck safe zones (Old Logging Bridge deck x: 9400 +/- 33, Fishing Piers x: 14160 & 14240)
  const isLoggingBridgeDeck = Math.abs(x - 9400) <= 33 && Math.abs(y - (-3300)) <= 92;
  const isFishingPierDeck =
    (Math.abs(x - 14160) <= 14 && Math.abs(y - (-3020)) <= 40) ||
    (Math.abs(x - 14240) <= 14 && Math.abs(y - (-2880)) <= 42);

  if (isLoggingBridgeDeck || isFishingPierDeck) {
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
  ctx.fillStyle = isFreezing ? 'rgba(203, 213, 225, 0.25)' : 'rgba(18, 12, 8, 0.42)';
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

    // Crystalline stress fractures & river ice cracks (stride-aligned to prevent camera-pan teleportation)
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.72)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let k = Math.ceil(kStart / 4) * 4; k <= kEnd; k += 4) {
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
    for (let k = Math.ceil(kStart / 3) * 3; k <= kEnd; k += 3) {
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
    for (let k = Math.ceil(kStart / 5) * 5; k <= kEnd; k += 5) {
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
    // Band 0 (1.00 width): Translucent boreal teal shoreline meniscus (0.0m - 0.25m)
    traceChannelBand(1.0, 0.0);
    ctx.fillStyle = nightAlpha > 0.65 ? '#0f2632' : '#1b5662';
    ctx.fill();

    // Band 1 (0.91 width): Shallow littoral zone — clear cyan-teal (0.25m - 0.60m)
    traceChannelBand(0.91, 0.20);
    ctx.fillStyle = nightAlpha > 0.65 ? 'rgba(12, 34, 46, 0.80)' : 'rgba(20, 86, 102, 0.80)';
    ctx.fill();

    // Band 2 (0.78 width): Mid-shallow boreal emerald-cyan (0.60m - 1.10m)
    traceChannelBand(0.78, 0.42);
    ctx.fillStyle = nightAlpha > 0.65 ? 'rgba(9, 28, 40, 0.80)' : 'rgba(16, 72, 92, 0.78)';
    ctx.fill();

    // Clip to River Water Surface for all internal underwater & surface fluid rendering
    ctx.save();
    traceChannelBand(1.0, 0.0);
    ctx.clip();

    // --- PASS 4a: SUBMERGED RIVERBED STONES & DYNAMIC RIVERWEED (drawn BEFORE deep water absorption overlay) ---
    renderOrganicRiverbedStones(ctx, kStart, kEnd, animTime, sunState.sunDirX, sunState.sunDirY, dayFactor, false);
    renderDynamicRiverweed(ctx, kStart, kEnd, animTime, vehicles);

    // Band 3 (0.62 width): Deep channel optical water column submerging deep bed features (1.10m - 1.65m)
    traceChannelBand(0.62, 0.68);
    ctx.fillStyle = nightAlpha > 0.65 ? 'rgba(7, 21, 34, 0.72)' : 'rgba(12, 56, 76, 0.68)';
    ctx.fill();

    // Band 4 (0.38 width): Abyssal Thalweg Core — shifted toward outer bend (1.65m - 2.80m)
    traceChannelBand(0.38, 0.92);
    ctx.fillStyle = nightAlpha > 0.65 ? 'rgba(4, 14, 26, 0.78)' : 'rgba(8, 40, 58, 0.74)';
    ctx.fill();

    // --- PASS 3d: DIRECTIONAL SOLAR BANK OVERHANG SHADOWS ON WATER ---
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
      ctx.fillStyle = `rgba(4, 14, 22, ${(0.24 * dayFactor).toFixed(2)})`;
      ctx.fill();
    }

    // --- PASS 4b: EMERGENT RIFFLE BOULDERS & SURFACE WAKES (only shallow/ford emergent rocks) ---
    renderOrganicRiverbedStones(ctx, kStart, kEnd, animTime, sunState.sunDirX, sunState.sunDirY, dayFactor, true);

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

  // Reset instantaneous frame-accurate obstacle wakes for this render frame
  frameObstacleWakes.length = 0;

  // 1. Render Contour-Accurate Vehicle Submersion & Underwater Light Scattering + Emit Hydrodynamic Wakes
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

  // 2. Emit Wading/Swimming Disturbances & Render Subtle Subsurface Contact Meniscus for Humans
  const renderHumanWaterline = (h: { x: number; y: number; vx?: number; vy?: number; angle: number; waterDepth?: number; isSwimming?: boolean }, idKey: string) => {
    const d = h.waterDepth ?? getUniversalWaterDepthAt(world, h.x, h.y);
    if (d <= 0.05) return;

    const river = getRiverWaterAt(h.x, h.y);
    const curVx = river.inWater ? river.currentVx : 0;
    const curVy = river.inWater ? river.currentVy : 0;
    const groundVx = h.vx || 0;
    const groundVy = h.vy || 0;
    const groundSpeed = Math.hypot(groundVx, groundVy);
    const relVx = groundVx - curVx;
    const relVy = groundVy - curVy;
    const relSpeed = Math.hypot(relVx, relVy);
    const flowAngle = relSpeed > 3 ? Math.atan2(relVy, relVx) : h.angle;

    // Expanding concentric wave rings are emitted ONLY when the person is physically moving over the riverbed/ground!
    // When standing still in a river current, the person does NOT emit expanding circular rings; instead, the river
    // current parts around their legs/body via an obstacle flow-around wake (`emitObstacleFlowWake`).
    if (groundSpeed > 5.0) {
      emitWaterDisturbance(
        h.x,
        h.y,
        groundVx,
        groundVy,
        d > 0.85 ? 8.0 : 5.2,
        Math.min(0.92, 0.22 + d * 0.34 + groundSpeed * 0.006),
        groundSpeed > 22,
        `hum_${idKey}`,
        d > 0.85 ? 95 : 115
      );
    } else if (river.inWater && relSpeed > 8.0 && d > 0.12) {
      // Stationary or slow-wading person in flowing river water: current parts around their body with a gentle downstream V-trail
      emitObstacleFlowWake(
        h.x,
        h.y,
        relVx,
        relVy,
        d > 0.85 ? 7.8 : 6.0,
        Math.min(0.85, 0.25 + d * 0.35 + (relSpeed / 55) * 0.25),
        Math.min(0.65, (relSpeed / 50) * (0.25 + d * 0.35))
      );
    }

    // Soft subsurface optical absorption shadow around submerged lower body (no hard circles)
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(flowAngle);

    const collarR = d > 0.85 ? 8.5 : (d > 0.45 ? 7.0 : 5.2);
    const subAlpha = Math.min(0.55, 0.18 + d * 0.28);
    const meniscusGrad = ctx.createRadialGradient(0, 0, collarR * 0.2, 0, 0, collarR * 1.45);
    meniscusGrad.addColorStop(0, `rgba(6, 28, 38, ${subAlpha.toFixed(3)})`);
    meniscusGrad.addColorStop(0.65, `rgba(10, 44, 56, ${(subAlpha * 0.45).toFixed(3)})`);
    meniscusGrad.addColorStop(1, 'rgba(10, 44, 56, 0)');
    ctx.fillStyle = meniscusGrad;
    ctx.beginPath();
    ctx.arc(0, 0, collarR * 1.45, 0, Math.PI * 2);
    ctx.fill();

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
 * Renders physically grounded vehicle submersion & feeds multi-point hull/wheel wakes to the GPU water shader:
 * 1. Clips strictly to the vehicle's actual deformed softbody contour (never a rectangular box).
 * 2. Computes a 2D sloped water depth plane from (frontWaterDepth, rearWaterDepth, leftWaterDepth, rightWaterDepth)
 *    so a car nosing down a bank or wading with one side in deep water is submerged only where water actually touches.
 * 3. Renders underwater Beer-Lambert optical absorption and underwater headlight/taillight volumetric scattering,
 *    while emitting instantaneous obstacle flow-around wakes + persistent Kelvin bow, stern, and 4-wheel wakes.
 */
function renderVehicleHydrodynamicSubmersion(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  animTime: number,
  nightAlpha: number,
  dayFactor: number,
  _sunState: { sunDirX: number; sunDirY: number; shadowDirX: number; shadowDirY: number; sunElevation: number }
) {
  const halfL = car.length * 0.5;
  const halfW = car.width * 0.5;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  const perpX = -sinA;
  const perpY = cosA;

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
  const groundVx = car.vx || 0;
  const groundVy = car.vy || 0;
  const groundSpeed = Math.hypot(groundVx, groundVy);
  const relVx = groundVx - curVx;
  const relVy = groundVy - curVy;
  const relSpeed = Math.hypot(relVx, relVy);
  const carSpeedAbs = Math.max(groundSpeed, Math.abs(car.speed || 0));

  // A. Instantaneous Obstacle Flow-Around & Foaming Waterline Collar (works both when driving and when parked in river current!)
  if (relSpeed > 4.0 && maxD > 0.06) {
    const foamFactor = Math.min(0.98, Math.max(0.18, (relSpeed / 42) * (0.35 + maxD * 0.65)));
    const wakeInt = Math.min(1.25, 0.45 + maxD * 0.48 + (relSpeed / 65) * 0.35);

    if (dFront > 0.06) {
      emitObstacleFlowWake(
        car.x + cosA * (halfL * 0.52),
        car.y + sinA * (halfL * 0.52),
        relVx,
        relVy,
        halfW * 1.18,
        wakeInt,
        foamFactor
      );
    }
    if (dRear > 0.06) {
      emitObstacleFlowWake(
        car.x - cosA * (halfL * 0.52),
        car.y - sinA * (halfL * 0.52),
        relVx,
        relVy,
        halfW * 1.14,
        wakeInt * 0.92,
        foamFactor * 0.90
      );
    }
  }

  // B. Emit persistent propagating hydrodynamic disturbances from bow, stern, and wheels when vehicle is moving
  if (carSpeedAbs > 5.0) {
    const bowWorldX = car.x + cosA * (halfL * 0.86);
    const bowWorldY = car.y + sinA * (halfL * 0.86);
    if (dFront > 0.05) {
      emitWaterDisturbance(
        bowWorldX,
        bowWorldY,
        groundVx,
        groundVy,
        halfW * 1.05,
        Math.min(1.15, 0.38 + dFront * 0.45 + relSpeed * 0.007),
        true,
        `veh_bow_${car.id}`,
        50
      );
    }

    const sternWorldX = car.x - cosA * (halfL * 0.86);
    const sternWorldY = car.y - sinA * (halfL * 0.86);
    if (dRear > 0.05) {
      emitWaterDisturbance(
        sternWorldX,
        sternWorldY,
        groundVx,
        groundVy,
        halfW * 0.90,
        Math.min(0.95, 0.30 + dRear * 0.38 + relSpeed * 0.005),
        relSpeed > 18,
        `veh_stern_${car.id}`,
        70
      );
    }

    // Individual wheel wakes when wading through shallow/medium water
    const wheelLon = halfL * 0.64;
    const wheelLat = halfW * 0.86;
    const wheelConfigs = [
      { id: 'fl', lx: wheelLon, ly: -wheelLat, d: (dFront + dLeft) * 0.5 },
      { id: 'fr', lx: wheelLon, ly: wheelLat, d: (dFront + dRight) * 0.5 },
      { id: 'rl', lx: -wheelLon, ly: -wheelLat, d: (dRear + dLeft) * 0.5 },
      { id: 'rr', lx: -wheelLon, ly: wheelLat, d: (dRear + dRight) * 0.5 }
    ];
    for (let w = 0; w < 4; w++) {
      const wc = wheelConfigs[w];
      if (wc.d > 0.04) {
        const wx = car.x + cosA * wc.lx + perpX * wc.ly;
        const wy = car.y + sinA * wc.lx + perpY * wc.ly;
        emitWaterDisturbance(
          wx,
          wy,
          groundVx,
          groundVy,
          Math.max(5.5, halfW * 0.42),
          Math.min(0.90, 0.24 + wc.d * 0.35 + relSpeed * 0.006),
          relSpeed > 14,
          `veh_w_${car.id}_${wc.id}`,
          65
        );
      }
    }
  }

  // 1. UNDERWATER HEADLIGHT & TAILLIGHT SUBSURFACE VOLUMETRIC SCATTERING
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

  // 2. SOFT SUBSURFACE HULL AMBIENT OCCLUSION IN WATER
  if (maxD > 0.08) {
    const aoAlpha = Math.min(0.42, maxD * 0.26);
    const aoGrad = ctx.createRadialGradient(0, 0, Math.min(halfL, halfW) * 0.5, 0, 0, Math.max(halfL, halfW) * 1.28);
    aoGrad.addColorStop(0, `rgba(5, 24, 34, ${aoAlpha.toFixed(3)})`);
    aoGrad.addColorStop(0.75, `rgba(8, 36, 48, ${(aoAlpha * 0.45).toFixed(3)})`);
    aoGrad.addColorStop(1, 'rgba(8, 36, 48, 0)');
    ctx.fillStyle = aoGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL * 1.22, halfW * 1.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. CONTOUR-CLIPPED SUBMERGED HULL BEER-LAMBERT ABSORPTION
  // Trace the vehicle's actual deformed softbody perimeter polygon so submerged paintwork
  // acquires genuine cyan-teal water depth coloration (which is then refracted by the GPU water shader!)
  const dmg = car.damage;
  const hullPoly = getVehicleBasePolygon(
    car,
    halfL,
    halfW,
    dmg?.frontCrumple || 0,
    dmg?.rearCrumple || 0,
    dmg?.leftDent || 0,
    dmg?.rightDent || 0,
    dmg?.frontLeftDent || 0,
    dmg?.frontRightDent || 0,
    dmg?.rearLeftDent || 0,
    dmg?.rearRightDent || 0
  );
  ctx.save();
  ctx.beginPath();
  if (dmg?.deformedVertices && dmg.deformedVertices.length >= 8) {
    traceSoftbodyPath(ctx, hullPoly, dmg.deformedVertices);
  } else {
    for (let p = 0; p < hullPoly.length; p++) {
      if (p === 0) ctx.moveTo(hullPoly[p].x, hullPoly[p].y);
      else ctx.lineTo(hullPoly[p].x, hullPoly[p].y);
    }
    ctx.closePath();
  }
  ctx.clip();

  // Compute directional linear gradient across the hull matching actual front/rear/left/right water depth!
  // Using authentic teal water chromaticity so detectWaterMask in the GPU shader recognizes submerged hull surfaces
  const waterR = nightAlpha > 0.6 ? 7 : 14;
  const waterG = nightAlpha > 0.6 ? 28 : 66;
  const waterB = nightAlpha > 0.6 ? 40 : 78;

  const alphaFront = Math.min(0.88, Math.max(0, (dFront - 0.12) / 1.30) * 0.84);
  const alphaCenter = Math.min(0.88, Math.max(0, (dCenter - 0.12) / 1.30) * 0.84);
  const alphaRear = Math.min(0.88, Math.max(0, (dRear - 0.12) / 1.30) * 0.84);

  const hullGrad = ctx.createLinearGradient(halfL, (dRight - dLeft) * 18, -halfL, (dLeft - dRight) * 18);
  hullGrad.addColorStop(0, `rgba(${waterR}, ${waterG}, ${waterB}, ${alphaFront.toFixed(3)})`);
  hullGrad.addColorStop(0.5, `rgba(${waterR}, ${waterG}, ${waterB}, ${alphaCenter.toFixed(3)})`);
  hullGrad.addColorStop(1, `rgba(${waterR}, ${waterG}, ${waterB}, ${alphaRear.toFixed(3)})`);

  ctx.fillStyle = hullGrad;
  ctx.fillRect(-halfL - 6, -halfW - 6, car.length + 12, car.width + 12);
  ctx.restore(); // end hull clip

  ctx.restore();
}

/**
 * Natural Alluvial Bank Gravel, Shingle Pebbles & Driftwood along River Shores
 * (Stride-aligned to global spline index k so nothing ever teleports when moving/zooming camera)
 */
function renderBankGravelSpeckles(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  isFreezing: boolean = false,
  nightAlpha: number = 0
) {
  const firstK = Math.ceil(kStart / 3) * 3;
  const lightScale = Math.max(0.35, 1 - nightAlpha * 0.65);

  for (let k = firstK; k < kEnd; k += 3) {
    const pt = RIVER_SPLINE_POINTS[k];
    const seed = k * 13.37;
    const tanAngle = Math.atan2(pt.ty, pt.tx);

    // 1. Fine alluvial wet silt & shingle patches close to the waterline (no cartoon cyan/white ovals)
    const patchCount = 2 + Math.floor(riverHash(seed * 1.9) * 2);
    for (let m = 0; m < patchCount; m++) {
      const mSeed = seed + m * 11.43;
      const isLeft = riverHash(mSeed) > 0.5;
      const bankSide = isLeft ? 1 : -1;
      const bankSand = isLeft ? pt.innerSandLeft : pt.innerSandRight;
      const offset = pt.halfWidth + 3 + riverHash(mSeed * 2.1) * (bankSand + 26);
      const along = (riverHash(mSeed * 3.3) - 0.5) * 26;

      const mx = pt.x + pt.nx * (offset * bankSide) + pt.tx * along;
      const my = pt.y + pt.ny * (offset * bankSide) + pt.ty * along;
      const rx = 2.0 + riverHash(mSeed * 4.7) * 3.2;
      const ry = rx * (0.45 + riverHash(mSeed * 5.9) * 0.28);
      const rot = tanAngle + (riverHash(mSeed * 6.7) - 0.5) * 0.45;

      ctx.fillStyle = isFreezing
        ? 'rgba(51, 65, 85, 0.48)'
        : (riverHash(mSeed * 8.1) > 0.5 ? 'rgba(34, 24, 16, 0.52)' : 'rgba(46, 33, 22, 0.46)');
      ctx.beginPath();
      ctx.ellipse(mx, my, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Natural multi-faceted river shingle & rounded alluvial cobbles on point bars
    const pebbleCount = 4 + Math.floor(riverHash(seed) * 4);
    for (let p = 0; p < pebbleCount; p++) {
      const pSeed = seed + p * 7.19;
      const isLeft = riverHash(pSeed) > 0.5;
      const bankSide = isLeft ? 1 : -1;
      const bankWidth = isLeft ? pt.innerSandLeft : pt.innerSandRight;
      const offset = pt.halfWidth + 1.5 + riverHash(pSeed * 2.3) * (bankWidth + 14);
      const along = (riverHash(pSeed * 4.1) - 0.5) * 24;
      const px = pt.x + pt.nx * (offset * bankSide) + pt.tx * along;
      const py = pt.y + pt.ny * (offset * bankSide) + pt.ty * along;
      const rx = 1.0 + riverHash(pSeed * 3.7) * 1.9;
      const ry = rx * (0.65 + riverHash(pSeed * 6.1) * 0.30);
      const rot = tanAngle + (riverHash(pSeed * 2.9) - 0.5) * 1.2;

      ctx.fillStyle = 'rgba(10, 7, 4, 0.36)';
      ctx.beginPath();
      ctx.ellipse(px + 0.5, py + 0.6, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();

      const toneRoll = riverHash(pSeed * 5.1);
      ctx.fillStyle = isFreezing
        ? (toneRoll > 0.5 ? '#64748b' : '#475569')
        : (toneRoll < 0.35 ? '#44382c' : toneRoll < 0.7 ? '#5c4d3c' : '#6b5b49');
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();

      if (rx > 1.8) {
        ctx.fillStyle = `rgba(214, 202, 186, ${(0.18 * lightScale).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(px - rx * 0.22, py - ry * 0.22, rx * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Helper to trace an organic 6-vertex faceted river cobble/boulder polygon
 */
function traceFacetedStonePolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radX: number,
  radY: number,
  angle: number,
  seed: number
) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const verts = 6;
  ctx.beginPath();
  for (let v = 0; v < verts; v++) {
    const a = (v / verts) * Math.PI * 2 + (riverHash(seed + v * 3.1) - 0.5) * 0.28;
    const rScale = 0.84 + riverHash(seed + v * 7.3) * 0.26;
    const lx = Math.cos(a) * radX * rScale;
    const ly = Math.sin(a) * radY * rScale;
    const wx = cx + lx * ca - ly * sa;
    const wy = cy + lx * sa + ly * ca;
    if (v === 0) ctx.moveTo(wx, wy);
    else ctx.lineTo(wx, wy);
  }
  ctx.closePath();
}

/**
 * Organic Procedural Riverbed Stones, Riffle Bars & Boulders with Beer-Lambert underwater submergence.
 * When `emergentPass === false`, draws submerged riverbed cobbles (tinted into the teal water column).
 * When `emergentPass === true`, draws only shallow/emergent riffle boulders that break the surface with wakes.
 */
function renderOrganicRiverbedStones(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number,
  sunDirX: number,
  sunDirY: number,
  dayFactor: number,
  emergentPass: boolean = false
) {
  const firstK = Math.ceil(kStart / 2) * 2;

  for (let k = firstK; k < kEnd; k += 2) {
    const pt = RIVER_SPLINE_POINTS[k];
    const seed = k * 17.83;

    const isFordZone = pt.isFord || Math.abs(pt.x - 12400) < 280;
    const stoneDensity = isFordZone ? 6 : (pt.depth < 1.35 ? 3 : (riverHash(seed) < 0.45 ? 2 : 0));

    if (stoneDensity === 0) continue;

    for (let s = 0; s < stoneDensity; s++) {
      const sSeed = seed + s * 9.41;
      const latFraction = (riverHash(sSeed) * 2 - 1) * 0.86;
      // Offset along local tangent/normal so stone position is 100% locked to world river geometry
      const alongOff = (riverHash(sSeed * 1.7) - 0.5) * 16;
      const crossOff = (riverHash(sSeed * 2.3) - 0.5) * 10;
      const rx = pt.x + pt.nx * (pt.halfWidth * latFraction + crossOff) + pt.tx * alongOff;
      const ry = pt.y + pt.ny * (pt.halfWidth * latFraction + crossOff) + pt.ty * alongOff;

      const stoneRadX = (isFordZone ? 3.2 : 2.2) + riverHash(sSeed * 3.1) * (isFordZone ? 5.2 : 3.4);
      const stoneRadY = stoneRadX * (0.64 + riverHash(sSeed * 4.3) * 0.32);
      const stoneAngle = (riverHash(sSeed * 5.7) * 2 - 1) * 0.65 + Math.atan2(pt.ty, pt.tx);

      // Local depth at the stone's lateral position
      const localDepth = pt.depth * Math.max(0.14, 1 - latFraction * latFraction * 0.88);
      const isEmergentBoulder = (localDepth < 0.44 && stoneRadX > 4.2) || (isFordZone && stoneRadX > 4.8 && riverHash(sSeed * 6.3) > 0.35);

      if (emergentPass !== isEmergentBoulder) continue;

      if (!emergentPass) {
        // SUBMERGED RIVERBED STONE: Beer-Lambert teal water absorption & soft refractive attenuation
        const visibility = Math.max(0.12, Math.exp(-localDepth * 0.85)) * (0.45 + 0.55 * dayFactor);
        const colorRoll = riverHash(sSeed * 7.9);
        // Submerged rocks shift toward deep teal-slate due to red/orange wavelength absorption in water
        let stoneColor = `rgba(18, 58, 72, ${(visibility * 0.72).toFixed(2)})`;
        if (colorRoll < 0.30) stoneColor = `rgba(14, 48, 62, ${(visibility * 0.76).toFixed(2)})`;
        else if (colorRoll < 0.62) stoneColor = `rgba(24, 68, 80, ${(visibility * 0.68).toFixed(2)})`;
        else stoneColor = `rgba(20, 62, 66, ${(visibility * 0.70).toFixed(2)})`;

        // Soft underwater basal shadow on the riverbed
        ctx.fillStyle = `rgba(4, 16, 24, ${(0.36 * visibility).toFixed(2)})`;
        traceFacetedStonePolygon(ctx, rx - sunDirX * 1.6, ry - sunDirY * 1.6, stoneRadX * 1.04, stoneRadY * 1.04, stoneAngle, sSeed);
        ctx.fill();

        // Faceted submerged cobble body
        ctx.fillStyle = stoneColor;
        traceFacetedStonePolygon(ctx, rx, ry, stoneRadX, stoneRadY, stoneAngle, sSeed);
        ctx.fill();

        // Subtle refracted underwater caustics/sunlight bevel on sun-facing facet
        ctx.fillStyle = `rgba(125, 195, 215, ${(0.16 * visibility * dayFactor).toFixed(2)})`;
        traceFacetedStonePolygon(
          ctx,
          rx + sunDirX * (stoneRadX * 0.22),
          ry + sunDirY * (stoneRadY * 0.22),
          stoneRadX * 0.55,
          stoneRadY * 0.45,
          stoneAngle,
          sSeed + 1.5
        );
        ctx.fill();
      } else {
        // EMERGENT RIFFLE / FORD BOULDER: breaks the water surface with wet rock crown & hydraulic wake
        const lightScale = 0.42 + 0.58 * dayFactor;

        // Underwater submerged base skirt around the boulder
        ctx.fillStyle = 'rgba(8, 32, 44, 0.65)';
        traceFacetedStonePolygon(ctx, rx - sunDirX * 1.8, ry - sunDirY * 1.8, stoneRadX * 1.15, stoneRadY * 1.15, stoneAngle, sSeed);
        ctx.fill();

        // Wet dark granite/basalt emergent rock body
        const colorRoll = riverHash(sSeed * 7.9);
        ctx.fillStyle = colorRoll < 0.5 ? '#2d3748' : '#3b4252';
        traceFacetedStonePolygon(ctx, rx, ry, stoneRadX, stoneRadY, stoneAngle, sSeed);
        ctx.fill();

        // Sunlit dry/wet rock facet highlight
        ctx.fillStyle = `rgba(182, 194, 206, ${(0.34 * lightScale).toFixed(2)})`;
        traceFacetedStonePolygon(
          ctx,
          rx + sunDirX * (stoneRadX * 0.24),
          ry + sunDirY * (stoneRadY * 0.24),
          stoneRadX * 0.56,
          stoneRadY * 0.42,
          stoneAngle,
          sSeed + 2.1
        );
        ctx.fill();

        // Upstream stagnation bow wave & downstream V-wake around emergent boulder
        const flowDirX = pt.tx;
        const flowDirY = pt.ty;
        const wakePulse = Math.sin(animTime * 4.4 + sSeed) * 0.14 + 0.86;

        ctx.strokeStyle = `rgba(224, 242, 254, ${(0.38 * wakePulse * lightScale).toFixed(3)})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(
          rx - flowDirX * (stoneRadX * 0.78),
          ry - flowDirY * (stoneRadX * 0.78),
          stoneRadY * 0.88,
          Math.atan2(-flowDirY, -flowDirX) - 0.72,
          Math.atan2(-flowDirY, -flowDirX) + 0.72
        );
        ctx.stroke();

        const wakeLength = stoneRadX * 2.6;
        ctx.strokeStyle = `rgba(186, 230, 253, ${(0.30 * wakePulse * lightScale).toFixed(3)})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(rx + pt.nx * (stoneRadY * 0.72), ry + pt.ny * (stoneRadY * 0.72));
        ctx.quadraticCurveTo(
          rx + flowDirX * (wakeLength * 0.5) + pt.nx * (stoneRadY * 0.38),
          ry + flowDirY * (wakeLength * 0.5) + pt.ny * (stoneRadY * 0.38),
          rx + flowDirX * wakeLength,
          ry + flowDirY * wakeLength
        );
        ctx.moveTo(rx - pt.nx * (stoneRadY * 0.72), ry - pt.ny * (stoneRadY * 0.72));
        ctx.quadraticCurveTo(
          rx + flowDirX * (wakeLength * 0.5) - pt.nx * (stoneRadY * 0.38),
          ry + flowDirY * (wakeLength * 0.5) - pt.ny * (stoneRadY * 0.38),
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
 * Submerged beneath the deep water column, aligned to global spline stride so it never teleports.
 */
function renderDynamicRiverweed(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number,
  vehicles?: Vehicle[]
) {
  const firstK = Math.ceil(kStart / 4) * 4;
  ctx.save();
  ctx.lineCap = 'round';

  for (let k = firstK; k < kEnd; k += 4) {
    const pt = RIVER_SPLINE_POINTS[k];
    const seed = k * 23.41;

    if (pt.depth < 0.25 || pt.depth > 1.9) continue;
    if (riverHash(seed) > 0.64) continue;

    const weedPatches = 1 + Math.floor(riverHash(seed * 2.1) * 2);
    for (let p = 0; p < weedPatches; p++) {
      const pSeed = seed + p * 13.7;
      // Keep riverweed in littoral / mid-shallow zones where rooted aquatic macrophytes grow
      const side = riverHash(pSeed * 1.3) > 0.5 ? 1 : -1;
      const latFraction = side * (0.32 + riverHash(pSeed) * 0.48);
      const rootX = pt.x + pt.nx * (pt.halfWidth * latFraction);
      const rootY = pt.y + pt.ny * (pt.halfWidth * latFraction);

      const localDepth = pt.depth * Math.max(0.18, 1 - latFraction * latFraction * 0.85);
      const submergenceAlpha = Math.max(0.22, Math.min(0.62, Math.exp(-localDepth * 0.55)));

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

      // Soft basal root shadow on riverbed
      ctx.fillStyle = `rgba(6, 24, 30, ${(submergenceAlpha * 0.45).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(rootX, rootY, 3.2, 0, Math.PI * 2);
      ctx.fill();

      const bladeCount = 4 + Math.floor(riverHash(pSeed * 3.3) * 3);
      for (let b = 0; b < bladeCount; b++) {
        const bSeed = pSeed + b * 5.71;
        const bladeLength = 14 + riverHash(bSeed * 1.9) * 20;
        const phaseOffset = riverHash(bSeed * 4.3) * Math.PI * 2;
        const swayFreq = 2.0 + (pt.currentSpeed / 32) * 1.1;

        const sway1 = Math.sin(animTime * swayFreq + phaseOffset) * 4.8;
        const sway2 = Math.cos(animTime * (swayFreq * 1.6) + phaseOffset * 1.3) * 2.2;
        const totalSway = sway1 + sway2;

        const rootSpread = (b - (bladeCount - 1) * 0.5) * 1.3;
        const rx = rootX + pt.nx * rootSpread;
        const ry = rootY + pt.ny * rootSpread;

        const midX = rx + pt.tx * (bladeLength * 0.52) + pt.nx * (totalSway * 0.45) + pushX * 0.5;
        const midY = ry + pt.ty * (bladeLength * 0.52) + pt.ny * (totalSway * 0.45) + pushY * 0.5;
        const tipX = rx + pt.tx * bladeLength + pt.nx * totalSway + pushX;
        const tipY = ry + pt.ty * bladeLength + pt.ny * totalSway + pushY;

        // Underwater teal-shifted aquatic olive-emerald color (avoids bright neon green stickers)
        ctx.strokeStyle = (b % 2 === 0)
          ? `rgba(14, 68, 62, ${submergenceAlpha.toFixed(2)})`
          : `rgba(18, 82, 70, ${(submergenceAlpha * 0.92).toFixed(2)})`;
        ctx.lineWidth = 1.2 + riverHash(bSeed * 7.1) * 0.6;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.quadraticCurveTo(midX, midY, tipX, tipY);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/**
 * Curvilinear Downstream Channel Flow Streamlines, Shallow Sunlight Caustics & Solar Specular Glints.
 * Strictly advected along the downstream river spline `(pt.tx, pt.ty)` with a parabolic cross-channel
 * velocity profile (faster in the deep thalweg, slower near the banks) and zero snake-like lateral wiggle.
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
  const maxSplineIdx = RIVER_SPLINE_POINTS.length - 2;

  // 1. Curvilinear Longitudinal River Current Streamlines (Течение воды строго вдоль изгибов русла)
  // Uses continuous spline interpolation (k + frac) so every current filament curves smoothly along
  // the riverbed at constant lateral channel fraction `latNorm`, moving faster in the mid-channel thalweg.
  const streamPasses = [
    { speedMult: 0.95, width: 1.5, alpha: nightAlpha > 0.6 ? 0.12 : 0.22, isDarkTrough: false, seedOff: 0.0 },
    { speedMult: 0.95, width: 2.2, alpha: nightAlpha > 0.6 ? 0.14 : 0.18, isDarkTrough: true,  seedOff: 0.0 },
    { speedMult: 1.22, width: 1.1, alpha: nightAlpha > 0.6 ? 0.09 : 0.16, isDarkTrough: false, seedOff: 19.7 }
  ];

  const firstStreamK = Math.ceil(kStart / 2) * 2;
  ctx.save();
  ctx.lineCap = 'round';
  for (const pass of streamPasses) {
    ctx.lineWidth = pass.width;
    ctx.strokeStyle = pass.isDarkTrough
      ? `rgba(6, 28, 38, ${pass.alpha.toFixed(3)})`
      : `rgba(198, 236, 250, ${pass.alpha.toFixed(3)})`;
    ctx.beginPath();

    for (let k = firstStreamK; k < kEnd; k += 2) {
      const pt = RIVER_SPLINE_POINTS[k];
      const streamCount = pt.isFord ? 4 : 3;

      for (let s = 0; s < streamCount; s++) {
        const sSeed = k * 13.37 + s * 9.41 + pass.seedOff;
        const latNorm = (riverHash(sSeed) * 2 - 1) * 0.80;
        // Parabolic + helicoidal thalweg velocity profile across the channel
        const distFromThalweg = latNorm - pt.thalwegBias * 0.45;
        const speedProfile = Math.max(0.36, 1.0 - 0.50 * distFromThalweg * distFromThalweg);

        // Travel cycle in spline-index units (each spline step is ~62px)
        const cycleSteps = 1.8 + riverHash(sSeed * 1.9) * 1.1;
        const stepRate = (pt.currentSpeed * pass.speedMult * speedProfile) / 62.0;
        const phaseSteps = (animTime * stepRate + riverHash(sSeed * 3.1) * cycleSteps) % cycleSteps;
        const normPhase = phaseSteps / cycleSteps;
        // Smooth fade envelope at start/end of cycle so filaments never pop
        if (normPhase < 0.10 || normPhase > 0.90) continue;

        const baseSplinePos = k - cycleSteps * 0.5 + phaseSteps;
        const streakLenSteps = (0.38 + riverHash(sSeed * 4.7) * 0.28) * speedProfile;
        const tailPos = Math.max(0, Math.min(maxSplineIdx, baseSplinePos - streakLenSteps * 0.5));
        const midPos  = Math.max(0, Math.min(maxSplineIdx, baseSplinePos));
        const headPos = Math.max(0, Math.min(maxSplineIdx, baseSplinePos + streakLenSteps * 0.5));

        const sampleAtSplinePos = (sPos: number) => {
          const idx = Math.min(maxSplineIdx, Math.max(0, Math.floor(sPos)));
          const frac = sPos - idx;
          const p0 = RIVER_SPLINE_POINTS[idx];
          const p1 = RIVER_SPLINE_POINTS[idx + 1];
          const cx = p0.x + (p1.x - p0.x) * frac;
          const cy = p0.y + (p1.y - p0.y) * frac;
          const nx = p0.nx + (p1.nx - p0.nx) * frac;
          const ny = p0.ny + (p1.ny - p0.ny) * frac;
          const hw = p0.halfWidth + (p1.halfWidth - p0.halfWidth) * frac;
          const latOff = latNorm * hw + (pass.isDarkTrough ? 1.4 : 0.0);
          return { x: cx + nx * latOff, y: cy + ny * latOff };
        };

        const pTail = sampleAtSplinePos(tailPos);
        const pMid  = sampleAtSplinePos(midPos);
        const pHead = sampleAtSplinePos(headPos);

        ctx.moveTo(pTail.x, pTail.y);
        ctx.quadraticCurveTo(pMid.x, pMid.y, pHead.x, pHead.y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();

  // 2. Subtle Benthic Sunlight Caustic Shimmer on Shallow Shoals (strictly downstream-advected, no snake lines)
  if (dayFactor > 0.14 && weather !== 'storm' && weather !== 'fog') {
    const causticBaseAlpha = 0.09 * dayFactor * Math.min(1.0, sunState.sunElevation * 1.4);
    ctx.fillStyle = `rgba(186, 236, 252, ${causticBaseAlpha.toFixed(3)})`;

    const firstCausticK = Math.ceil(kStart / 3) * 3;
    for (let k = firstCausticK; k < kEnd; k += 3) {
      const pt = RIVER_SPLINE_POINTS[k];
      if (pt.depth > 1.95) continue;

      const flowAngle = Math.atan2(pt.ty, pt.tx);
      const cellCount = 2 + (k % 2);
      for (let c = 0; c < cellCount; c++) {
        const cSeed = k * 19.7 + c * 31.3;
        const latNorm = (riverHash(cSeed) * 2 - 1) * 0.76;
        const speedProfile = Math.max(0.45, 1.0 - 0.42 * latNorm * latNorm);
        const cycleLen = 68;
        const advect = ((animTime * pt.currentSpeed * speedProfile * 0.65 + riverHash(cSeed * 2.3) * cycleLen) % cycleLen) - cycleLen * 0.5;
        const fade = Math.sin(((advect + cycleLen * 0.5) / cycleLen) * Math.PI);
        if (fade < 0.25) continue;

        const cx = pt.x + pt.nx * (latNorm * pt.halfWidth) + pt.tx * advect;
        const cy = pt.y + pt.ny * (latNorm * pt.halfWidth) + pt.ty * advect;
        const rx = (4.5 + riverHash(cSeed * 7.1) * 4.0) * fade;
        const ry = (1.6 + riverHash(cSeed * 8.3) * 1.4) * fade;

        ctx.beginPath();
        ctx.ellipse(cx + sunDirX * 1.2, cy + sunDirY * 1.2, rx, ry, flowAngle + (riverHash(cSeed * 5.9) - 0.5) * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 3. Direct Solar / Lunar Specular Micro-Glints on Downstream Wave Facets
  const firstWaveK = Math.ceil(kStart / 2) * 2;
  const glintAlpha = nightAlpha > 0.6 ? 0.16 : (0.28 * dayFactor);
  ctx.fillStyle = nightAlpha > 0.6
    ? `rgba(186, 230, 253, ${glintAlpha.toFixed(3)})`
    : `rgba(255, 252, 235, ${glintAlpha.toFixed(3)})`;

  for (let k = firstWaveK; k < kEnd; k += 2) {
    const pt = RIVER_SPLINE_POINTS[k];
    const sunLatBias = (pt.nx * sunDirX + pt.ny * sunDirY) * 0.30;
    const flowAngle = Math.atan2(pt.ty, pt.tx);
    for (let g = 0; g < 2; g++) {
      const gSeed = k * 7.1 + g * 13.9;
      const gPhase = animTime * (2.8 + riverHash(gSeed) * 1.6) + gSeed;
      const sparkle = Math.sin(gPhase) * Math.cos(gPhase * 1.23 + riverHash(gSeed * 2.3) * 3.0);
      if (sparkle < 0.54) continue;

      const lat = (sunLatBias + (riverHash(gSeed * 1.7) - 0.5) * 0.80) * pt.halfWidth;
      const cycle = 52;
      const lon = ((animTime * pt.currentSpeed * 0.75 + riverHash(gSeed * 3.7) * cycle) % cycle) - cycle * 0.5;
      const gx = pt.x + pt.nx * lat + pt.tx * lon;
      const gy = pt.y + pt.ny * lat + pt.ty * lon;
      const gw = 1.6 + (sparkle - 0.54) * 4.2;

      ctx.beginPath();
      ctx.ellipse(gx, gy, gw, 0.75 + (sparkle - 0.54) * 0.9, flowAngle + Math.PI * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Shoreline Wet Littoral Meniscus & Subtle Riffle Foam Flecks along Left & Right Riverbanks
 * (No continuous sine-wave snake lines).
 */
function renderShorelineLappingWaves(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number,
  nightAlpha: number
) {
  const lightScale = Math.max(0.35, 1 - nightAlpha * 0.65);

  // Subtle broken capillary foam flecks only along high-energy outer cut-banks and riffles
  ctx.fillStyle = `rgba(226, 242, 252, ${(0.22 * lightScale).toFixed(3)})`;
  const firstK = Math.ceil(kStart / 2) * 2;
  for (let k = firstK; k < kEnd; k += 2) {
    const pt = RIVER_SPLINE_POINTS[k];
    if (pt.currentSpeed < 29 && !pt.isFord) continue;
    const flowAngle = Math.atan2(pt.ty, pt.tx);

    for (const side of [-1, 1]) {
      const seed = k * 13.7 + (side > 0 ? 3.1 : 9.7);
      if (riverHash(seed) > 0.55) continue;
      const pulse = 0.5 + 0.5 * Math.sin(animTime * 1.9 + seed);
      const dist = pt.halfWidth - 2.2 - riverHash(seed * 2.1) * 2.5;
      const sx = pt.x + pt.nx * (dist * side);
      const sy = pt.y + pt.ny * (dist * side);

      ctx.beginPath();
      ctx.ellipse(sx, sy, 2.2 + pulse * 1.8, 0.65, flowAngle, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Water Lilies & Duckweed in calm river bays (Тихий Плёс)
 * Stride-aligned to `k` so lily pads never teleport when camera moves or zooms.
 */
function renderWaterLilies(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number
) {
  const firstK = Math.ceil(kStart / 8) * 8;
  for (let k = firstK; k < kEnd; k += 8) {
    const pt = RIVER_SPLINE_POINTS[k];
    if (pt.currentSpeed < 26) {
      const seed = k * 37.1;
      const side = riverHash(seed * 1.9) > 0.5 ? 1 : -1;
      const padCount = 2 + Math.floor(riverHash(seed * 2.7) * 3);

      for (let p = 0; p < padCount; p++) {
        const pSeed = seed + p * 11.3;
        const bobX = Math.cos(animTime * 1.6 + pSeed) * 0.7;
        const bobY = Math.sin(animTime * 1.8 + pSeed) * 0.7;
        const latDist = pt.halfWidth * (0.58 + riverHash(pSeed * 3.1) * 0.26) * side;
        const lonDist = (riverHash(pSeed * 4.3) - 0.5) * 28;
        const lx = pt.x + pt.nx * latDist + pt.tx * lonDist + bobX;
        const ly = pt.y + pt.ny * latDist + pt.ty * lonDist + bobY;
        const padRad = 3.2 + riverHash(pSeed * 5.7) * 2.2;
        const notchAngle = riverHash(pSeed * 6.9) * Math.PI * 2;

        ctx.fillStyle = 'rgba(4, 16, 22, 0.38)';
        ctx.beginPath();
        ctx.arc(lx + 0.8, ly + 0.8, padRad, notchAngle + 0.25, notchAngle + Math.PI * 1.88);
        ctx.lineTo(lx + 0.8, ly + 0.8);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = p % 2 === 0 ? '#166534' : '#15803d';
        ctx.beginPath();
        ctx.arc(lx, ly, padRad, notchAngle + 0.25, notchAngle + Math.PI * 1.88);
        ctx.lineTo(lx, ly);
        ctx.closePath();
        ctx.fill();

        if (p === 0 && k % 16 === 0) {
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(lx, ly, 1.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(lx, ly, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

/**
 * Dynamic Floating River Debris (Organic top-down waterlogged twigs, autumn leaves, bark & foam clusters)
 */
function renderFloatingRiverDebris(
  ctx: CanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  animTime: number
) {
  ctx.save();
  ctx.lineCap = 'round';

  for (let i = 0; i < floatingDebrisList.length; i++) {
    const d = floatingDebrisList[i];
    if (d.x < minX - 40 || d.x > maxX + 40 || d.y < minY - 40 || d.y > maxY + 40) {
      continue;
    }

    const bobOffset = Math.sin(animTime * d.wobbleFreq + d.seed) * 0.8;
    const drawX = d.x;
    const drawY = d.y + bobOffset;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(d.angle);

    switch (d.type) {
      case 'branch_pine': {
        // Subtle water meniscus halo around floating branch
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.20)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.7, 0);
        ctx.quadraticCurveTo(0, d.size * 0.18, d.size * 0.7, -d.size * 0.08);
        ctx.stroke();

        // Curved organic waterlogged branch
        ctx.strokeStyle = '#3b2313';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.75, 0.2);
        ctx.quadraticCurveTo(-d.size * 0.1, d.size * 0.22, d.size * 0.75, -0.3);
        ctx.stroke();

        // Forked side shoot & damp pine needles
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(0, d.size * 0.08);
        ctx.lineTo(d.size * 0.35, -d.size * 0.48);
        ctx.stroke();

        ctx.strokeStyle = '#1e4620';
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(d.size * 0.22, -d.size * 0.32);
        ctx.lineTo(d.size * 0.48, -d.size * 0.58);
        ctx.moveTo(d.size * 0.28, -d.size * 0.38);
        ctx.lineTo(d.size * 0.52, -d.size * 0.26);
        ctx.stroke();
        break;
      }

      case 'twig': {
        ctx.strokeStyle = '#4a2f1b';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.65, 0);
        ctx.quadraticCurveTo(0, d.size * 0.18, d.size * 0.65, -0.2);
        ctx.stroke();
        break;
      }

      case 'leaf_yellow':
      case 'leaf_red':
      case 'leaf_orange': {
        const leafColor = d.type === 'leaf_yellow' ? '#ca8a04' : (d.type === 'leaf_red' ? '#b91c1c' : '#c2410c');
        // Pointed birch/alder leaf silhouette floating flush on water surface
        ctx.fillStyle = leafColor;
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.6, 0);
        ctx.quadraticCurveTo(0, -d.size * 0.42, d.size * 0.65, 0);
        ctx.quadraticCurveTo(0, d.size * 0.42, -d.size * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'bark_chip': {
        ctx.fillStyle = '#5c3419';
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.5, -d.size * 0.2);
        ctx.lineTo(d.size * 0.45, -d.size * 0.28);
        ctx.lineTo(d.size * 0.55, d.size * 0.22);
        ctx.lineTo(-d.size * 0.4, d.size * 0.3);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'foam_patch': {
        ctx.fillStyle = 'rgba(226, 244, 253, 0.45)';
        ctx.beginPath();
        ctx.arc(0, 0, d.size * 0.38, 0, Math.PI * 2);
        ctx.arc(d.size * 0.28, d.size * 0.14, d.size * 0.26, 0, Math.PI * 2);
        ctx.arc(-d.size * 0.24, d.size * 0.12, d.size * 0.22, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }
  ctx.restore();
}

/**
 * Bridge Pile Subsurface Shadow & Hydraulic Turbulence Cushion
 * (Actual Kelvin V-wakes and turbulent foam tails are computed directly in the GPU water shader).
 */
function renderObstacleWakes(
  ctx: CanvasRenderingContext2D,
  _kStart: number,
  _kEnd: number,
  _animTime: number
) {
  const bX = 9400;
  const bY = -3300;
  const pileYPositions = [bY - 60, bY - 20, bY + 20, bY + 60];

  for (const py of pileYPositions) {
    const pileWater = getRiverWaterAt(bX, py);
    if (!pileWater.inWater) continue;

    const pileRadius = 9;
    const grad = ctx.createRadialGradient(bX, py, pileRadius * 0.3, bX, py, pileRadius * 2.2);
    grad.addColorStop(0, 'rgba(6, 24, 34, 0.55)');
    grad.addColorStop(0.6, 'rgba(8, 36, 48, 0.22)');
    grad.addColorStop(1, 'rgba(8, 36, 48, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bX, py, pileRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Top-Down Shoreline Reed & Sedge Tussocks (Камыш и осока) along both riverbanks.
 * Replaces old side-view vertical sticks (`ry - 8`) with realistic radial top-down tussocks
 * anchored to global spline index `k` so they never teleport on camera move/zoom.
 */
function renderShorelineReeds(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number
) {
  const firstK = Math.ceil(kStart / 4) * 4;
  ctx.save();
  ctx.lineCap = 'round';

  for (let k = firstK; k < kEnd; k += 4) {
    const pt = RIVER_SPLINE_POINTS[k];
    if (pt.isBridge || pt.isFord) continue;

    for (const side of [-1, 1]) {
      const sideSeed = k * 19.3 + (side > 0 ? 7.1 : 31.7);
      if (riverHash(sideSeed) > 0.58) continue;

      const clumpCount = 1 + Math.floor(riverHash(sideSeed * 2.3) * 2);
      for (let c = 0; c < clumpCount; c++) {
        const cSeed = sideSeed + c * 13.7;
        // Rooted right at the shallow waterline / wet littoral edge
        const radialDist = pt.halfWidth + (riverHash(cSeed * 1.7) * 8 - 3);
        const alongOff = (riverHash(cSeed * 2.9) - 0.5) * 22;
        const rx = pt.x + pt.nx * (radialDist * side) + pt.tx * alongOff;
        const ry = pt.y + pt.ny * (radialDist * side) + pt.ty * alongOff;

        // Basal tussock shadow in shallow water/mud
        ctx.fillStyle = 'rgba(8, 16, 12, 0.42)';
        ctx.beginPath();
        ctx.arc(rx + 0.8, ry + 0.9, 3.6, 0, Math.PI * 2);
        ctx.fill();

        // Radial top-down sedge & reed blades swaying gently in the wind
        const bladeCount = 6 + Math.floor(riverHash(cSeed * 4.1) * 4);
        const windX = Math.cos(animTime * 2.1 + k * 0.4 + c) * 1.8;
        const windY = Math.sin(animTime * 1.8 + k * 0.4 + c) * 1.8;

        for (let b = 0; b < bladeCount; b++) {
          const bSeed = cSeed + b * 5.3;
          const angle = (b / bladeCount) * Math.PI * 2 + (riverHash(bSeed) - 0.5) * 0.5;
          const len = 4.2 + riverHash(bSeed * 2.1) * 4.5;
          const tipX = rx + Math.cos(angle) * len + windX;
          const tipY = ry + Math.sin(angle) * len + windY;
          const midX = rx + Math.cos(angle) * (len * 0.55) + windX * 0.4;
          const midY = ry + Math.sin(angle) * (len * 0.55) + windY * 0.4;

          ctx.strokeStyle = (b % 2 === 0) ? '#2f5225' : '#3f6a32';
          ctx.lineWidth = 1.05;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.quadraticCurveTo(midX, midY, tipX, tipY);
          ctx.stroke();
        }

        // Top-down dark brown cattail seed head (рогоз) on mature clumps
        if (riverHash(cSeed * 6.7) > 0.45) {
          const headAngle = riverHash(cSeed * 8.1) * Math.PI * 2;
          const hx = rx + Math.cos(headAngle) * 2.2 + windX * 0.6;
          const hy = ry + Math.sin(headAngle) * 2.2 + windY * 0.6;
          ctx.fillStyle = '#3e2412';
          ctx.beginPath();
          ctx.ellipse(hx, hy, 2.1, 1.1, headAngle, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  ctx.restore();
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
      ctx.strokeStyle = `rgba(196, 178, 158, ${(0.22 * (1 - nightAlpha * 0.6)).toFixed(2)})`;
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
      ctx.strokeStyle = nightAlpha > 0.6 ? 'rgba(38, 28, 20, 0.55)' : 'rgba(92, 74, 56, 0.36)';
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
      const prx = 7.5 + (p % 3) * 2.5;
      const pry = 3.5 + (p % 2) * 1.5;

      ctx.fillStyle = 'rgba(12, 8, 4, 0.62)';
      ctx.beginPath();
      ctx.ellipse(pX, pY, prx + 1.5, pry + 1.0, 0.18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = (nightAlpha > 0.6) ? 'rgba(24, 18, 12, 0.72)' : 'rgba(44, 32, 22, 0.68)';
      ctx.beginPath();
      ctx.ellipse(pX, pY, prx, pry, 0.18, 0, Math.PI * 2);
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

/**
 * Stamps exact river material IDs into the GPU Material G-Buffer (materialCanvas):
 * - Riverbanks & wet sand/mud margin: R = 64 (MAT_DIRT), G = 220 (high moisture)
 * - River water channel: R = 160 (MAT_WATER_BODY), G = depth/thalweg factor
 * - Emergent boulders, logging bridge deck & fishing piers: R = 0 (MAT_OCCLUDER)
 */
export function renderRiverMaterialMask(
  ctx: CanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
) {
  if (maxY < -4300 || minY > -1750 || maxX < -3400 || minX > 50000) {
    return;
  }

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

  // 1. Wet silt/mud/sand riverbank belt -> MAT_DIRT (R=64, G=220, B=128)
  ctx.beginPath();
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const bankExtra = 95 + pt.innerSandLeft * 0.45;
    const bx = pt.x + pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y + pt.ny * (pt.halfWidth + bankExtra);
    if (k === kStart) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  for (let k = kEnd; k >= kStart; k--) {
    const pt = RIVER_SPLINE_POINTS[k];
    const bankExtra = 95 + pt.innerSandRight * 0.45;
    const bx = pt.x - pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y - pt.ny * (pt.halfWidth + bankExtra);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgb(64, 220, 128)';
  ctx.fill();

  // 2. River water channel -> MAT_WATER_BODY (R=160, G=220, B=255)
  ctx.beginPath();
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wx = pt.x + pt.nx * pt.halfWidth;
    const wy = pt.y + pt.ny * pt.halfWidth;
    if (k === kStart) ctx.moveTo(wx, wy);
    else ctx.lineTo(wx, wy);
  }
  for (let k = kEnd; k >= kStart; k--) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wx = pt.x - pt.nx * pt.halfWidth;
    const wy = pt.y - pt.ny * pt.halfWidth;
    ctx.lineTo(wx, wy);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgb(160, 220, 255)';
  ctx.fill();

  // 3. Emergent dry boulder tops -> MAT_OCCLUDER (R=0, G=0, B=0)
  ctx.fillStyle = 'rgb(0, 0, 0)';
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const seed = k * 43.17;
    const isFordZone = pt.isFord || Math.abs(pt.x - 12400) < 280;
    const stoneDensity = isFordZone ? 6 : (pt.depth < 1.35 ? 3 : (riverHash(seed) < 0.45 ? 2 : 0));
    for (let s = 0; s < stoneDensity; s++) {
      const sSeed = seed + s * 9.41;
      const latFraction = (riverHash(sSeed) * 2 - 1) * 0.86;
      const stoneRadX = (isFordZone ? 3.2 : 2.2) + riverHash(sSeed * 3.1) * (isFordZone ? 5.2 : 3.4);
      const localDepth = pt.depth * Math.max(0.14, 1 - latFraction * latFraction * 0.88);
      const isEmergentBoulder = (localDepth < 0.44 && stoneRadX > 4.2) || (isFordZone && stoneRadX > 4.8 && riverHash(sSeed * 6.3) > 0.35);
      if (!isEmergentBoulder) continue;

      const alongOff = (riverHash(sSeed * 1.7) - 0.5) * 16;
      const crossOff = (riverHash(sSeed * 2.3) - 0.5) * 10;
      const rx = pt.x + pt.nx * (pt.halfWidth * latFraction + crossOff) + pt.tx * alongOff;
      const ry = pt.y + pt.ny * (pt.halfWidth * latFraction + crossOff) + pt.ty * alongOff;
      const stoneRadY = stoneRadX * (0.62 + riverHash(sSeed * 4.7) * 0.32);
      const stoneRot = Math.atan2(pt.ty, pt.tx) + (riverHash(sSeed * 5.3) - 0.5) * 0.55;

      ctx.beginPath();
      ctx.ellipse(rx, ry, stoneRadX * 0.92, stoneRadY * 0.92, stoneRot, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Logging Bridge Deck -> MAT_OCCLUDER (R=0, G=0, B=0)
  if (minX <= 9500 && maxX >= 9300 && minY <= -3200 && maxY >= -3400) {
    ctx.fillRect(9400 - 34, -3300 - 88, 68, 176);
  }

  // 5. Fishing Piers -> MAT_OCCLUDER (R=0, G=0, B=0)
  if (minX <= 14350 && maxX >= 14100 && minY <= -2750 && maxY >= -3150) {
    const pierPositions = [
      { x: 14160, y: -3020, angle: 0.15, length: 75, width: 20 },
      { x: 14240, y: -2880, angle: -0.10, length: 80, width: 22 }
    ];
    for (const pier of pierPositions) {
      ctx.save();
      ctx.translate(pier.x, pier.y);
      ctx.rotate(pier.angle);
      ctx.fillRect(0, 0, pier.width, pier.length);
      ctx.restore();
    }
  }
}


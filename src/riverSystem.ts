// --- RIVER SYSTEM: CATMULL-ROM SPLINE, WATER DEPTH, FLUID DYNAMICS & REALISTIC RIVER HYDROLOGY ---
// Defines the northern river "Быстрица", organic spline riverbeds, depths,
// current velocity vectors, fords, bridges, reeds, water lilies, swaying underwater weeds,
// floating drift debris/leaves/foam, and dynamic obstacle wake hydrodynamics.

import { GameWorld, Vehicle } from './types';

export interface RiverWaypoint {
  x: number;
  y: number;
  width: number;      // River channel width at this point (px)
  depth: number;      // Max depth at channel center (meters, e.g. 1.6m)
  currentSpeed: number; // Flow velocity in px/s (e.g. 35 px/s)
  isFord?: boolean;   // Shallow ford crossing (depth ~0.35m - 0.45m)
  isBridge?: boolean; // Logging bridge overhead
}

export interface RiverSplinePoint {
  x: number;
  y: number;
  tx: number; // Tangent X
  ty: number; // Tangent Y
  nx: number; // Normal X (pointing left looking downstream)
  ny: number; // Normal Y
  halfWidth: number;
  depth: number;
  currentSpeed: number;
  isFord: boolean;
  isBridge: boolean;
  innerSandLeft: number;  // Extra sand width on left bank (for inner bends)
  innerSandRight: number; // Extra sand width on right bank (for inner bends)
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

// Organic centerline waypoints of River "Быстрица" winding gracefully across the northern wilderness far from the city
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

// Helper functions for Catmull-Rom Spline Generation
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

// Deterministic hash function for organic stone/weed distribution
function riverHash(n: number): number {
  const x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
}

// Generate continuous smooth spline points along the entire river channel
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
      const nx = -ty; // Normal vector
      const ny = tx;

      const width = w1.width + t * (w2.width - w1.width);
      const depth = w1.depth + t * (w2.depth - w1.depth);
      const currentSpeed = w1.currentSpeed + t * (w2.currentSpeed - w1.currentSpeed);
      const isFord = Boolean(w1.isFord || w2.isFord) && Math.abs(x - 12400) < 260;
      const isBridge = Boolean(w1.isBridge || w2.isBridge) || Math.abs(x - 9400) < 160 || (x >= 23500 && x <= 24100);

      pts.push({
        x, y, tx, ty, nx, ny,
        halfWidth: width / 2,
        depth,
        currentSpeed,
        isFord,
        isBridge,
        innerSandLeft: 16,
        innerSandRight: 16
      });
    }
  }

  // Compute inner bend sandbar expansions (песчаные косы на поворотах реки)
  for (let k = 2; k < pts.length - 2; k++) {
    const pPrev = pts[k - 2];
    const pNext = pts[k + 2];
    const cross = pPrev.tx * pNext.ty - pPrev.ty * pNext.tx;

    // Positive cross = turning left -> Left bank is inner bend (deposit sand)
    // Negative cross = turning right -> Right bank is inner bend
    const bendStrength = Math.min(1.0, Math.abs(cross) * 2.8);
    if (cross > 0.08) {
      pts[k].innerSandLeft = 16 + bendStrength * 42;  // Left sandbar
      pts[k].innerSandRight = 12;
    } else if (cross < -0.08) {
      pts[k].innerSandRight = 16 + bendStrength * 42; // Right sandbar
      pts[k].innerSandLeft = 12;
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

// --- DYNAMIC RIVER FLOATING DEBRIS SIMULATION ---
// Generates persistent drifting foliage, pine twigs, bark chips, and foam patches carried by the river
const DEBRIS_TYPES: Array<RiverFloatingDebris['type']> = [
  'leaf_yellow', 'leaf_red', 'leaf_orange', 'branch_pine', 'twig', 'bark_chip', 'foam_patch'
];

function initFloatingDebris(): RiverFloatingDebris[] {
  const debris: RiverFloatingDebris[] = [];
  const count = 90;
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
  for (let i = 0; i < floatingDebrisList.length; i++) {
    const d = floatingDebrisList[i];
    const water = getRiverWaterAt(d.x, d.y);

    if (water.inWater) {
      // Follow the local current vector with subtle cross-stream wobble
      d.vx = water.currentVx;
      d.vy = water.currentVy;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.angle += d.spinSpeed * dt;
    } else {
      // If drifted onto land/shallow bank, nudge back toward water centerline
      d.x += (d.vx || 20) * dt;
      d.y += (d.vy || 0) * dt;
    }

    // Wrap around from east river mouth back to western headwaters
    if (d.x > RIVER_MAX_X - 200 || d.x < RIVER_MIN_X - 100 || !water.inWater && d.x > 8000) {
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
  depth: number;       // Water depth in meters (0 if outside)
  distToCenter: number; // Distance in pixels from river centerline
  halfWidth: number;
  currentVx: number;   // River current velocity X in px/s
  currentVy: number;   // River current velocity Y in px/s
  isFord: boolean;
  isBridge: boolean;   // True if standing on bridge over water
  surfaceType: 'water' | 'river_mud' | 'river_sand' | 'land';
}

/**
 * Returns comprehensive river water information at given world coordinates.
 */
export function getRiverWaterAt(x: number, y: number): RiverWaterInfo {
  // Ultra-fast coarse spatial rejection
  if (x < RIVER_MIN_X || x > RIVER_MAX_X || y < RIVER_MIN_Y || y > RIVER_MAX_Y) {
    return {
      inWater: false,
      depth: 0,
      distToCenter: 9999,
      halfWidth: 0,
      currentVx: 0,
      currentVy: 0,
      isFord: false,
      isBridge: false,
      surfaceType: 'land'
    };
  }

  const bIdx = Math.floor((x - RIVER_MIN_X) / BUCKET_SIZE);
  const indices = (bIdx >= 0 && bIdx < BUCKET_COUNT) ? RIVER_BUCKETS[bIdx] : [];
  if (indices.length === 0) {
    return {
      inWater: false,
      depth: 0,
      distToCenter: 9999,
      halfWidth: 0,
      currentVx: 0,
      currentVy: 0,
      isFord: false,
      isBridge: false,
      surfaceType: 'land'
    };
  }

  let minDistSq = Infinity;
  let bestPt = RIVER_SPLINE_POINTS[indices[0]];

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
      bestPt = p1;
    }
  }

  const bestDist = Math.sqrt(minDistSq);
  const bestHalfWidth = bestPt.halfWidth;

  // Check if inside river channel
  const inWaterChannel = bestDist < bestHalfWidth;
  if (!inWaterChannel) {
    const bankDist = bestDist - bestHalfWidth;
    const maxSandWidth = Math.max(bestPt.innerSandLeft, bestPt.innerSandRight);
    if (bankDist < maxSandWidth + 24) {
      return {
        inWater: false,
        depth: 0,
        distToCenter: bestDist,
        halfWidth: bestHalfWidth,
        currentVx: 0,
        currentVy: 0,
        isFord: bestPt.isFord,
        isBridge: false,
        surfaceType: bankDist < maxSandWidth ? 'river_sand' : 'river_mud'
      };
    }
    return {
      inWater: false,
      depth: 0,
      distToCenter: bestDist,
      halfWidth: bestHalfWidth,
      currentVx: 0,
      currentVy: 0,
      isFord: false,
      isBridge: false,
      surfaceType: 'land'
    };
  }

  // Bridge deck safe zones (Old Logging Bridge x: 9400 & Mountain Pass Bridge x: 23800)
  const isLoggingBridgeDeck = Math.abs(x - 9400) <= 88 && Math.abs(y - (-3300)) <= 120;
  const isMountainBridgeDeck = Math.abs(x - 23800) <= 240 && Math.abs(y - (-2520)) <= 75;

  if (bestPt.isBridge || isLoggingBridgeDeck || isMountainBridgeDeck) {
    if (isLoggingBridgeDeck || isMountainBridgeDeck || Math.abs(x - 9400) <= 88) {
      return {
        inWater: false,
        depth: 0,
        distToCenter: bestDist,
        halfWidth: bestHalfWidth,
        currentVx: 0,
        currentVy: 0,
        isFord: false,
        isBridge: true,
        surfaceType: 'land'
      };
    }
  }

  // Natural parabolic riverbed cross-section with thalweg velocity profile
  // Velocity is highest in center/thalweg, and reduces near shores
  const normDist = bestDist / bestHalfWidth;
  const depthFactor = Math.max(0, 1 - normDist * normDist);
  const actualDepth = bestPt.depth * depthFactor;

  // Parabolic flow velocity scaling: fast in deep thalweg, slower near shore
  const velocityFactor = 0.55 + 0.45 * depthFactor;
  const actualCurrentSpeed = bestPt.currentSpeed * velocityFactor;

  return {
    inWater: true,
    depth: actualDepth,
    distToCenter: bestDist,
    halfWidth: bestHalfWidth,
    currentVx: bestPt.tx * actualCurrentSpeed,
    currentVy: bestPt.ty * actualCurrentSpeed,
    isFord: bestPt.isFord,
    isBridge: false,
    surfaceType: 'water'
  };
}

/**
 * Universal water depth query function across the entire world
 */
export function getUniversalWaterDepthAt(world: GameWorld | null | undefined, x: number, y: number): number {
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
          return 0.75 * Math.max(0, 1 - distSq);
        } else {
          return 0.06 * (1 - Math.sqrt(distSq));
        }
      }
    }
  }

  return 0;
}

/**
 * Renders the atmospheric River "Быстрица", including smooth spline riverbed,
 * continuous curves on turns, inner sandbars, organic pebble clusters, swaying riverweed,
 * animated undulating streamlines, floating drift debris, obstacle wake hydrodynamics,
 * ford crossing, and logging bridge.
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
  vehicles?: Vehicle[]
) {
  if (maxX < RIVER_MIN_X || minX > RIVER_MAX_X || maxY < RIVER_MIN_Y - 140 || minY > RIVER_MAX_Y + 140) {
    return;
  }

  const now = Date.now();
  const dt = Math.min(0.1, (now - lastDebrisUpdate) * 0.001);
  lastDebrisUpdate = now;
  updateRiverDebris(dt);

  const animTime = now * 0.001;

  // Filter visible spline points index range
  let kStart = -1;
  let kEnd = -1;
  for (let k = 0; k < RIVER_SPLINE_POINTS.length; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    if (pt.x >= minX - 320 && pt.x <= maxX + 320 && pt.y >= minY - 320 && pt.y <= maxY + 320) {
      if (kStart === -1) kStart = k;
      kEnd = k;
    }
  }

  if (kStart === -1 || kEnd === -1 || kEnd - kStart < 2) {
    return;
  }

  // Extend start/end by 2 points for smooth boundary continuity
  kStart = Math.max(0, kStart - 2);
  kEnd = Math.min(RIVER_SPLINE_POINTS.length - 1, kEnd + 2);

  // --- PASS 1a: MARSHY EROSION & SOFT SILT MARGIN (Outer Shoreline Buffer) ---
  ctx.beginPath();
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const bankExtra = 135 + pt.innerSandLeft * 0.5;
    const bx = pt.x + pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y + pt.ny * (pt.halfWidth + bankExtra);
    if (k === kStart) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  for (let k = kEnd; k >= kStart; k--) {
    const pt = RIVER_SPLINE_POINTS[k];
    const bankExtra = 135 + pt.innerSandRight * 0.5;
    const bx = pt.x - pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y - pt.ny * (pt.halfWidth + bankExtra);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fillStyle = '#382a1d'; // Damp earthy silt transition
  ctx.fill();

  // --- PASS 1b: DEEP WET SILT & CLAY BELT (Вязкая глубокая грязь и ил) ---
  ctx.beginPath();
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const bankExtra = 85 + pt.innerSandLeft * 0.4;
    const bx = pt.x + pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y + pt.ny * (pt.halfWidth + bankExtra);
    if (k === kStart) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  for (let k = kEnd; k >= kStart; k--) {
    const pt = RIVER_SPLINE_POINTS[k];
    const bankExtra = 85 + pt.innerSandRight * 0.4;
    const bx = pt.x - pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y - pt.ny * (pt.halfWidth + bankExtra);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fillStyle = '#231810'; // Deep dark wet mud & silt
  ctx.fill();

  // --- PASS 1c: GLOSSY WET MUD SHEEN (Мокрый блеск жидкой грязи) ---
  ctx.beginPath();
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const bankExtra = 55 + pt.innerSandLeft * 0.3;
    const bx = pt.x + pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y + pt.ny * (pt.halfWidth + bankExtra);
    if (k === kStart) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  for (let k = kEnd; k >= kStart; k--) {
    const pt = RIVER_SPLINE_POINTS[k];
    const bankExtra = 55 + pt.innerSandRight * 0.3;
    const bx = pt.x - pt.nx * (pt.halfWidth + bankExtra);
    const by = pt.y - pt.ny * (pt.halfWidth + bankExtra);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)'; // Wet water sheen over mud
  ctx.fill();

  // --- PASS 2: INNER WET SAND & PEBBLE BEACHES (Песчаные косы) ---
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
  ctx.fillStyle = '#5c4d3c'; // Wet river sand
  ctx.fill();

  // Fine gravel speckles on sandy banks
  renderBankGravelSpeckles(ctx, kStart, kEnd);

  // --- PASS 2b: RIVER ACCESS EXITS, CHURNED MUD APRONS, TIRE RUTS & WARNING SIGNS ---
  renderRiverAccessExits(ctx, minX, minY, maxX, maxY, nightAlpha);

  // --- PASS 3: CONTINUOUS WATER CHANNEL RIBBON (Graduated Depth Layers) ---
  // Layer 3a: Shallow clear riverbed base
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

  // Water Surface Base Color (Emerald-teal northern river)
  if (nightAlpha > 0.6) {
    ctx.fillStyle = '#0b1320';
  } else {
    ctx.fillStyle = '#1b3f42'; // Translucent clear shallow teal
  }
  ctx.fill();

  // Layer 3b: Mid-Depth Channel Band (Rich turquoise-olive)
  ctx.beginPath();
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wx = pt.x + pt.nx * (pt.halfWidth * 0.78);
    const wy = pt.y + pt.ny * (pt.halfWidth * 0.78);
    if (k === kStart) ctx.moveTo(wx, wy);
    else ctx.lineTo(wx, wy);
  }
  for (let k = kEnd; k >= kStart; k--) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wx = pt.x - pt.nx * (pt.halfWidth * 0.78);
    const wy = pt.y - pt.ny * (pt.halfWidth * 0.78);
    ctx.lineTo(wx, wy);
  }
  ctx.closePath();
  ctx.fillStyle = (nightAlpha > 0.6) ? 'rgba(8, 14, 26, 0.65)' : 'rgba(18, 48, 54, 0.70)';
  ctx.fill();

  // Layer 3c: Deep Thalweg Core (Deep mysterious northern indigo-olive)
  ctx.beginPath();
  for (let k = kStart; k <= kEnd; k++) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wx = pt.x + pt.nx * (pt.halfWidth * 0.48);
    const wy = pt.y + pt.ny * (pt.halfWidth * 0.48);
    if (k === kStart) ctx.moveTo(wx, wy);
    else ctx.lineTo(wx, wy);
  }
  for (let k = kEnd; k >= kStart; k--) {
    const pt = RIVER_SPLINE_POINTS[k];
    const wx = pt.x - pt.nx * (pt.halfWidth * 0.48);
    const wy = pt.y - pt.ny * (pt.halfWidth * 0.48);
    ctx.lineTo(wx, wy);
  }
  ctx.closePath();
  ctx.fillStyle = (nightAlpha > 0.6) ? 'rgba(3, 7, 18, 0.75)' : 'rgba(10, 26, 32, 0.75)';
  ctx.fill();

  // Clip to River Water Surface for all internal fluid rendering
  ctx.save();
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
  ctx.clip();

  // --- PASS 4: ORGANIC PROCEDURAL RIVERBED STONES & BOULDERS (Каменистое дно и перекаты) ---
  // Replaces the unnatural linear 3-dot grid with realistic organic boulder clusters & gravel beds
  renderOrganicRiverbedStones(ctx, kStart, kEnd, animTime);

  // --- PASS 5: DYNAMIC SWAYING UNDERWATER RIVERWEED & ALGAE (Колеблющиеся речные водоросли) ---
  renderDynamicRiverweed(ctx, kStart, kEnd, animTime);

  // --- PASS 6: ORGANIC MULTI-FREQUENCY CURRENT STREAMLINES & CAUSTICS ---
  renderFluidCurrentStreamlines(ctx, kStart, kEnd, animTime, nightAlpha);

  // --- PASS 7: WATER LILIES & DUCKWEED IN CALM POOLS (Тихий Плёс) ---
  renderWaterLilies(ctx, kStart, kEnd, animTime);

  // --- PASS 8: DYNAMIC FLOATING RIVER DEBRIS (Ветки, сучья, осенние листья, хлопья пены) ---
  renderFloatingRiverDebris(ctx, minX, minY, maxX, maxY, animTime);

  // --- PASS 9: DYNAMIC OBSTACLE COLLISION WAKES & HYDRODYNAMICS ---
  // Renders upstream stagnation bow wave foam and downstream turbulent V-wakes for bridge pillars, boulders & submerged vehicles
  renderObstacleWakes(ctx, kStart, kEnd, animTime, vehicles);

  ctx.restore(); // Restore water surface clip

  // --- PASS 10: SHORELINE REEDS & CATTAILS ALONG BANKS (Камышовые заросли) ---
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
 * Organic bank gravel speckling for realistic texture on sandy shores
 */
function renderBankGravelSpeckles(ctx: CanvasRenderingContext2D, kStart: number, kEnd: number) {
  for (let k = kStart; k < kEnd; k += 4) {
    const pt = RIVER_SPLINE_POINTS[k];
    const seed = k * 13.37;
    const pebbleCount = 3 + Math.floor(riverHash(seed) * 4);

    for (let p = 0; p < pebbleCount; p++) {
      const pSeed = seed + p * 7.19;
      const isLeft = riverHash(pSeed) > 0.5;
      const bankSide = isLeft ? 1 : -1;
      const bankWidth = isLeft ? pt.innerSandLeft : pt.innerSandRight;
      const offset = pt.halfWidth + 2 + riverHash(pSeed * 2.3) * (bankWidth + 6);
      
      const px = pt.x + pt.nx * (offset * bankSide);
      const py = pt.y + pt.ny * (offset * bankSide);

      const sz = 1.2 + riverHash(pSeed * 3.7) * 2.2;
      const shade = riverHash(pSeed * 5.1) > 0.5 ? '#473c2f' : '#6b5c4b';
      
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Organic Procedural Riverbed Stones & Boulders
 * Creates natural rounded granite river rocks, gravel deposits, and shallow riffles with foam crests.
 */
function renderOrganicRiverbedStones(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number
) {
  for (let k = kStart; k < kEnd; k += 2) {
    const pt = RIVER_SPLINE_POINTS[k];
    const seed = k * 17.83;

    // Density is highest at ford (x: 12400) and shallow shallows
    const isFordZone = pt.isFord || Math.abs(pt.x - 12400) < 280;
    const stoneDensity = isFordZone ? 5 : (pt.depth < 1.0 ? 2 : (riverHash(seed) < 0.35 ? 1 : 0));

    if (stoneDensity === 0) continue;

    for (let s = 0; s < stoneDensity; s++) {
      const sSeed = seed + s * 9.41;
      // Organic non-grid lateral placement across riverbed
      const latFraction = (riverHash(sSeed) * 2 - 1) * 0.82;
      const rx = pt.x + pt.nx * (pt.halfWidth * latFraction) + (riverHash(sSeed * 1.7) * 14 - 7);
      const ry = pt.y + pt.ny * (pt.halfWidth * latFraction) + (riverHash(sSeed * 2.3) * 14 - 7);

      const stoneRadX = (isFordZone ? 3.5 : 2.5) + riverHash(sSeed * 3.1) * (isFordZone ? 5.5 : 3.5);
      const stoneRadY = stoneRadX * (0.65 + riverHash(sSeed * 4.3) * 0.35);
      const stoneAngle = (riverHash(sSeed * 5.7) * 2 - 1) * 0.6 + Math.atan2(pt.ty, pt.tx);

      // Natural river stone color palette (wet granite, slate, mossy basalt)
      const colorRoll = riverHash(sSeed * 7.9);
      let stoneColor = '#334155'; // wet dark slate
      if (colorRoll < 0.28) stoneColor = '#1e293b'; // dark basalt
      else if (colorRoll < 0.55) stoneColor = '#475569'; // weathered granite
      else if (colorRoll < 0.78) stoneColor = '#2d3748'; // river rock
      else stoneColor = '#243422'; // mossy submerged stone

      // Underwater rock shadow
      ctx.fillStyle = 'rgba(5, 12, 16, 0.45)';
      ctx.beginPath();
      ctx.ellipse(rx + 2, ry + 2, stoneRadX, stoneRadY, stoneAngle, 0, Math.PI * 2);
      ctx.fill();

      // Main rock body
      ctx.fillStyle = stoneColor;
      ctx.beginPath();
      ctx.ellipse(rx, ry, stoneRadX, stoneRadY, stoneAngle, 0, Math.PI * 2);
      ctx.fill();

      // Subtle wet highlight ridge on top of stone
      ctx.fillStyle = 'rgba(203, 213, 225, 0.30)';
      ctx.beginPath();
      ctx.ellipse(rx - pt.tx * 1.2, ry - pt.ty * 1.2, stoneRadX * 0.65, stoneRadY * 0.45, stoneAngle, 0, Math.PI * 2);
      ctx.fill();

      // Upstream compression arc and downstream foam eddy trail for prominent boulders
      if (stoneRadX > 4.5 || isFordZone) {
        const flowDirX = pt.tx;
        const flowDirY = pt.ty;
        const wakePulse = Math.sin(animTime * 4.5 + sSeed) * 0.15 + 0.85;

        // 1. Upstream compression foam crescent
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.40 * wakePulse})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(
          rx - flowDirX * (stoneRadX * 0.85),
          ry - flowDirY * (stoneRadX * 0.85),
          stoneRadY * 0.9,
          Math.atan2(-flowDirY, -flowDirX) - 0.7,
          Math.atan2(-flowDirY, -flowDirX) + 0.7
        );
        ctx.stroke();

        // 2. Downstream trailing white foam wake & micro-vortex bubbles
        const wakeLength = stoneRadX * 2.8;
        ctx.strokeStyle = `rgba(224, 242, 254, ${0.45 * wakePulse})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(rx + pt.nx * (stoneRadY * 0.7), ry + pt.ny * (stoneRadY * 0.7));
        ctx.lineTo(rx + flowDirX * wakeLength, ry + flowDirY * wakeLength);
        ctx.moveTo(rx - pt.nx * (stoneRadY * 0.7), ry - pt.ny * (stoneRadY * 0.7));
        ctx.lineTo(rx + flowDirX * wakeLength, ry + flowDirY * wakeLength);
        ctx.stroke();

        // Downstream micro foam bubbles
        ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * wakePulse})`;
        ctx.beginPath();
        ctx.arc(rx + flowDirX * (wakeLength * 0.65), ry + flowDirY * (wakeLength * 0.65), 1.2, 0, Math.PI * 2);
        ctx.arc(rx + flowDirX * (wakeLength * 1.1) + pt.nx * 2, ry + flowDirY * (wakeLength * 1.1) + pt.ny * 2, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Dynamic Swaying Underwater Riverweed & Algae Beds (Колеблющиеся речные водоросли)
 * Long ribbon-like waterweed (Vallisneria/Elodea) anchored to the riverbed,
 * undulating sinuously downstream with turbulent oscillation.
 */
function renderDynamicRiverweed(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number
) {
  for (let k = kStart; k < kEnd; k += 4) {
    const pt = RIVER_SPLINE_POINTS[k];
    const seed = k * 23.41;

    // Weeds thrive in shallow to medium depth (0.3m to 1.4m), especially in calm bends and side-channels
    if (pt.depth < 0.25 || pt.depth > 1.8) continue;
    if (riverHash(seed) > 0.62) continue;

    const weedPatches = 1 + Math.floor(riverHash(seed * 2.1) * 2);
    for (let p = 0; p < weedPatches; p++) {
      const pSeed = seed + p * 13.7;
      const latFraction = (riverHash(pSeed) * 2 - 1) * 0.65;
      const rootX = pt.x + pt.nx * (pt.halfWidth * latFraction);
      const rootY = pt.y + pt.ny * (pt.halfWidth * latFraction);

      // 3-5 ribbon blades per patch
      const bladeCount = 3 + Math.floor(riverHash(pSeed * 3.3) * 3);
      for (let b = 0; b < bladeCount; b++) {
        const bSeed = pSeed + b * 5.71;
        const bladeLength = 16 + riverHash(bSeed * 1.9) * 22;
        const phaseOffset = riverHash(bSeed * 4.3) * Math.PI * 2;
        const swayFreq = 2.4 + (pt.currentSpeed / 30) * 1.2;
        
        // Multi-harmonic sine sway
        const sway1 = Math.sin(animTime * swayFreq + phaseOffset) * 6.5;
        const sway2 = Math.sin(animTime * (swayFreq * 1.7) + phaseOffset * 1.4) * 3.0;
        const totalSway = sway1 + sway2;

        const tipX = rootX + pt.tx * bladeLength + pt.nx * totalSway;
        const tipY = rootY + pt.ty * bladeLength + pt.ny * totalSway;
        const midX = rootX + pt.tx * (bladeLength * 0.5) + pt.nx * (totalSway * 0.45);
        const midY = rootY + pt.ty * (bladeLength * 0.5) + pt.ny * (totalSway * 0.45);

        // Submerged translucent aquatic ribbon
        ctx.strokeStyle = (b % 2 === 0) ? '#14532d' : '#166534';
        ctx.lineWidth = 1.4 + riverHash(bSeed * 7.1) * 0.8;
        ctx.beginPath();
        ctx.moveTo(rootX + b * 1.5 - 2, rootY);
        ctx.quadraticCurveTo(midX, midY, tipX, tipY);
        ctx.stroke();

        // Tip highlight
        ctx.fillStyle = 'rgba(74, 222, 128, 0.35)';
        ctx.beginPath();
        ctx.arc(tipX, tipY, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Organic Multi-Frequency Current Streamlines & Shimmering Surface Waves
 * Renders undulating, non-symmetrical flow filaments with velocity gradients and caustics.
 */
function renderFluidCurrentStreamlines(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number,
  nightAlpha: number
) {
  // Multi-pass streamline filaments with varying speeds and lengths
  const passes = [
    { speedMult: 1.0, width: 1.6, alpha: nightAlpha > 0.6 ? 0.14 : 0.24, color: '#e2e8f0' },
    { speedMult: 1.3, width: 1.0, alpha: nightAlpha > 0.6 ? 0.10 : 0.18, color: '#bae6fd' },
    { speedMult: 0.8, width: 2.0, alpha: nightAlpha > 0.6 ? 0.08 : 0.15, color: '#f0f9ff' }
  ];

  for (const pass of passes) {
    ctx.lineWidth = pass.width;

    for (let k = kStart; k < kEnd; k += 2) {
      const pt = RIVER_SPLINE_POINTS[k];
      const kSeed = k * 11.19 + pass.speedMult * 7.3;

      // Stream offset moving smoothly with current speed
      const streamCycle = 140;
      const streamOffset = (animTime * pt.currentSpeed * pass.speedMult + kSeed * 17) % streamCycle;

      // 3-4 filaments distributed organically across width
      const filamentCount = 3;
      for (let f = 0; f < filamentCount; f++) {
        const fSeed = kSeed + f * 5.31;
        // Non-uniform lateral spacing with sinusoidal wave wiggle
        const latNorm = (riverHash(fSeed) * 2 - 1) * 0.76;
        const waveWiggle = Math.sin(animTime * 3.0 + k * 0.3 + f) * 3.5;

        const curX = pt.x + pt.tx * streamOffset + pt.nx * (pt.halfWidth * latNorm + waveWiggle);
        const curY = pt.y + pt.ty * streamOffset + pt.ny * (pt.halfWidth * latNorm + waveWiggle);

        const filamentLen = 22 + riverHash(fSeed * 2.7) * 24;
        const endX = curX + pt.tx * filamentLen;
        const endY = curY + pt.ty * filamentLen;

        ctx.strokeStyle = `rgba(226, 232, 240, ${pass.alpha})`;
        ctx.beginPath();
        ctx.moveTo(curX, curY);
        // Sinuous curve along current tangent
        ctx.quadraticCurveTo(
          curX + pt.tx * (filamentLen * 0.5) + pt.nx * (waveWiggle * 0.5),
          curY + pt.ty * (filamentLen * 0.5) + pt.ny * (waveWiggle * 0.5),
          endX,
          endY
        );
        ctx.stroke();
      }
    }
  }

  // Shimmering Sunlight Caustics (during day time)
  if (nightAlpha < 0.45) {
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    for (let k = kStart; k < kEnd; k += 6) {
      const pt = RIVER_SPLINE_POINTS[k];
      const cTime = animTime * 1.8 + k * 0.2;
      const cx = pt.x + Math.sin(cTime * 1.3) * (pt.halfWidth * 0.5);
      const cy = pt.y + Math.cos(cTime * 1.1) * (pt.halfWidth * 0.5);

      ctx.beginPath();
      ctx.arc(cx, cy, 5 + Math.sin(cTime * 2.2) * 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }
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

      // Lily pad shadow
      ctx.fillStyle = 'rgba(5, 15, 20, 0.35)';
      ctx.beginPath();
      ctx.arc(lx + 1.5, ly + 1.5, 5.0, 0.2, Math.PI * 1.8);
      ctx.fill();

      // Lily pad
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(lx, ly, 4.8, 0.2, Math.PI * 1.8);
      ctx.fill();

      // Flower blossom in bloom
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
 * Dynamic Floating River Debris (Плывущий мусор, ветки, сучья, осенние листья, пена)
 * Drifts smoothly with the river flow velocity and bobs on surface ripples.
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

    // Underwater drop shadow for depth
    ctx.fillStyle = 'rgba(5, 15, 22, 0.40)';

    switch (d.type) {
      case 'branch_pine': {
        // Floating pine branch with 2-3 needles / offshoots
        ctx.fillStyle = 'rgba(5, 15, 22, 0.40)';
        ctx.fillRect(-d.size * 0.5 + 1.5, 1.5, d.size, 2.2);

        // Main wood twig
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-d.size * 0.5, -1, d.size, 2.0);

        // Side sprig
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.1, 0);
        ctx.lineTo(d.size * 0.25, -4);
        ctx.stroke();

        // Pine green needles
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
        // Simple floating drift stick
        ctx.fillStyle = 'rgba(5, 15, 22, 0.35)';
        ctx.fillRect(-d.size * 0.5 + 1.2, 1.2, d.size, 1.6);

        ctx.fillStyle = '#54361e';
        ctx.fillRect(-d.size * 0.5, -0.8, d.size, 1.6);
        break;
      }

      case 'leaf_yellow':
      case 'leaf_red':
      case 'leaf_orange': {
        // Drifting autumn leaf
        const leafColor = d.type === 'leaf_yellow' ? '#eab308' : (d.type === 'leaf_red' ? '#dc2626' : '#ea580c');
        const leafShadow = 'rgba(5, 15, 22, 0.35)';

        ctx.fillStyle = leafShadow;
        ctx.beginPath();
        ctx.ellipse(1.5, 1.5, d.size * 0.65, d.size * 0.35, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = leafColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, d.size * 0.65, d.size * 0.35, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Leaf central vein
        ctx.strokeStyle = 'rgba(67, 20, 7, 0.45)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.6, 0);
        ctx.lineTo(d.size * 0.6, 0);
        ctx.stroke();
        break;
      }

      case 'bark_chip': {
        // Rough birch / pine bark flake
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(0, 0, d.size * 0.55, d.size * 0.4, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-d.size * 0.25, -d.size * 0.15, d.size * 0.5, d.size * 0.3);
        break;
      }

      case 'foam_patch': {
        // Clustered frothing river foam / bubble raft
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
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
 * Obstacle Fluid Hydrodynamics & Dynamic Collision Wakes
 * Renders upstream stagnation bow wave foam and downstream turbulent Karman vortex street
 * for bridge piles (x: 9400), river boulders, and vehicles driving/floating in water.
 */
function renderObstacleWakes(
  ctx: CanvasRenderingContext2D,
  kStart: number,
  kEnd: number,
  animTime: number,
  vehicles?: Vehicle[]
) {
  // 1. Old Logging Bridge Support Piles (x: 9400, y: -3300)
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

    // Upstream Stagnation Bow Wave (White compression foam cushion)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * wakePulse})`;
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

    // Downstream Turbulent V-Wake Trails with alternating eddy vortices
    const wakeLen = 38;
    ctx.strokeStyle = `rgba(224, 242, 254, ${0.55 * wakePulse})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    // Left wake arm
    ctx.moveTo(bX + normX * pileRadius, py + normY * pileRadius);
    ctx.lineTo(bX + dirX * wakeLen + normX * (pileRadius * 2.2), py + dirY * wakeLen + normY * (pileRadius * 2.2));
    // Right wake arm
    ctx.moveTo(bX - normX * pileRadius, py - normY * pileRadius);
    ctx.lineTo(bX + dirX * wakeLen - normX * (pileRadius * 2.2), py + dirY * wakeLen - normY * (pileRadius * 2.2));
    ctx.stroke();

    // Swirling Karman vortices inside the wake
    const eddyOffset1 = Math.sin(animTime * 6.0 + py * 0.1) * (pileRadius * 0.8);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.60 * wakePulse})`;
    ctx.beginPath();
    ctx.arc(bX + dirX * 16 + normX * eddyOffset1, py + dirY * 16 + normY * eddyOffset1, 1.8, 0, Math.PI * 2);
    ctx.arc(bX + dirX * 28 - normX * eddyOffset1, py + dirY * 28 - normY * eddyOffset1, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Dynamic Wakes around Vehicles in Water
  if (vehicles && vehicles.length > 0) {
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (!v.waterDepth || v.waterDepth < 0.08) continue;

      const vSpeed = Math.abs(v.speed);
      const vCos = Math.cos(v.angle);
      const vSin = Math.sin(v.angle);
      const halfL = (v.length || 45) * 0.5;
      const halfW = (v.width || 24) * 0.5;

      const water = getRiverWaterAt(v.x, v.y);
      const curVx = water.currentVx;
      const curVy = water.currentVy;

      // 1. Waterline Foam Collar around submerged hull
      const collarAlpha = Math.min(0.85, 0.35 + v.waterDepth * 0.4);
      ctx.strokeStyle = `rgba(255, 255, 255, ${collarAlpha})`;
      ctx.lineWidth = 2.0;
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);
      ctx.beginPath();
      ctx.roundRect(-halfL - 2, -halfW - 2, halfL * 2 + 4, halfW * 2 + 4, 4);
      ctx.stroke();
      ctx.restore();

      // 2. High-speed / Current-deflection Bow Wave
      const bowX = v.x + vCos * halfL;
      const bowY = v.y + vSin * halfL;
      const relSpeed = vSpeed + Math.hypot(curVx, curVy) * 0.5;

      if (relSpeed > 10) {
        const bowSpread = halfW * (1.2 + relSpeed * 0.015);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(bowX, bowY, bowSpread * 0.6, v.angle - 1.2, v.angle + 1.2);
        ctx.stroke();

        // Trailing Stern V-Wake
        const sternX = v.x - vCos * halfL;
        const sternY = v.y - vSin * halfL;
        const wakeLength = Math.min(80, 20 + vSpeed * 0.6);

        ctx.strokeStyle = 'rgba(224, 242, 254, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sternX - vSin * halfW, sternY + vCos * halfW);
        ctx.lineTo(sternX - vCos * wakeLength - vSin * (halfW * 2.2), sternY - vSin * wakeLength + vCos * (halfW * 2.2));
        ctx.moveTo(sternX + vSin * halfW, sternY - vCos * halfW);
        ctx.lineTo(sternX - vCos * wakeLength + vSin * (halfW * 2.2), sternY - vSin * wakeLength - vCos * (halfW * 2.2));
        ctx.stroke();
      }
    }
  }
}

/**
 * Shoreline Reeds & Cattails along banks (Камышовые заросли)
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
      // Left bank reeds
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
      // Brown cattail head
      ctx.fillStyle = '#3d2817';
      ctx.fillRect(rx - 1, ry - 11, 2.2, 5);
    }
  }
}

function renderLoggingBridge(ctx: CanvasRenderingContext2D, nightAlpha: number) {
  const bX = 9400;
  const bY = -3300;
  const bWidth = 64;   // Bridge deck roadway width (N-S)
  const bLength = 175; // Bridge span (across river)

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

/**
 * Renders prominent churned mud aprons, deep tire ruts, water puddles, bank slope shadows,
 * safety guide posts, and GOST warning signs at all road ramps leading down to the river crossings.
 */
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

    // 1. Bank Slope Shadow (Теневая бровка берегового откоса)
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

    // 2. Churned Mud Apron (Грязевой веер размытого ила)
    ctx.beginPath();
    ctx.moveTo(exit.x - halfW * 0.8, topY + 20);
    ctx.quadraticCurveTo(exit.x - halfW * 1.3, midY, exit.x - halfW * 1.6, botY);
    ctx.lineTo(exit.x + halfW * 1.6, botY);
    ctx.quadraticCurveTo(exit.x + halfW * 1.3, midY, exit.x + halfW * 0.8, topY + 20);
    ctx.closePath();

    ctx.fillStyle = '#1e150d'; // Deep wet churned mud
    ctx.fill();

    // Soft outer mud fringe gradient
    ctx.beginPath();
    ctx.moveTo(exit.x - halfW * 0.9, topY + 35);
    ctx.quadraticCurveTo(exit.x - halfW * 1.5, midY, exit.x - halfW * 1.8, botY + 20);
    ctx.lineTo(exit.x + halfW * 1.8, botY + 20);
    ctx.quadraticCurveTo(exit.x + halfW * 1.5, midY, exit.x + halfW * 0.9, topY + 35);
    ctx.closePath();

    ctx.fillStyle = 'rgba(56, 42, 29, 0.65)'; // Silt & washed out earth
    ctx.fill();

    // 3. Deep Parallel Wheel Ruts (Раскатанная тяжелыми машинами колея в иле)
    const rutOffsets = [-halfW * 0.6, -halfW * 0.2, halfW * 0.2, halfW * 0.6];
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = '#0e0a06'; // Dark rut groove
    for (const roff of rutOffsets) {
      ctx.beginPath();
      ctx.moveTo(exit.x + roff * 0.85, topY + 15);
      ctx.quadraticCurveTo(
        exit.x + roff * 1.1 + Math.sin(exit.x + roff) * 12,
        midY,
        exit.x + roff * 1.35,
        botY - 10
      );
      ctx.stroke();
    }

    // Parallel churned mud ridges
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#3a2b1f';
    for (const roff of rutOffsets) {
      ctx.beginPath();
      ctx.moveTo(exit.x + roff * 0.85 - 3.5, topY + 15);
      ctx.quadraticCurveTo(exit.x + roff * 1.1 - 4, midY, exit.x + roff * 1.35 - 4.5, botY - 10);
      ctx.moveTo(exit.x + roff * 0.85 + 3.5, topY + 15);
      ctx.quadraticCurveTo(exit.x + roff * 1.1 + 4, midY, exit.x + roff * 1.35 + 4.5, botY - 10);
      ctx.stroke();
    }

    // 4. Water-Filled Deep Puddles in Ruts
    for (let p = 0; p < 4; p++) {
      const pY = topY + (botY - topY) * (0.3 + p * 0.2) + Math.sin(exit.x + p) * 10;
      const pX = exit.x + (p % 2 === 0 ? -1 : 1) * halfW * (0.2 + p * 0.15);
      
      ctx.fillStyle = (nightAlpha > 0.6) ? 'rgba(15, 23, 42, 0.75)' : 'rgba(20, 55, 68, 0.70)';
      ctx.beginPath();
      ctx.ellipse(pX, pY, 14 + p * 3, 6 + (p % 2), 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Sky reflection highlight edge
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // 5. Safety Guide Posts & Hazard Markers
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

    // 6. GOST Warning Sign at top of ramp
    renderExitWarningSignPlate(ctx, exit.x + halfW + 28, topY + 25);
  }

  ctx.restore();
}

/**
 * Draws GOST warning sign 1.33 "ВЯЗКИЙ ГРУНТ / СЪЕЗД К ВОДЕ"
 */
function renderExitWarningSignPlate(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(3, 3, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Steel pole
  ctx.fillStyle = '#475569';
  ctx.fillRect(-1.5, -20, 3, 20);

  // Triangular Warning Sign
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

  ctx.fillStyle = '#f59e0b'; // Yellow fill
  ctx.beginPath();
  ctx.moveTo(0, -sz + 2.2);
  ctx.lineTo(sz * 0.866 - 2.0, sz * 0.5 - 1.2);
  ctx.lineTo(-sz * 0.866 + 2.0, sz * 0.5 - 1.2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#dc2626'; // Red GOST border
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Sliding car / Mud wave icon inside triangle
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

  // Sign text plate "ВЯЗКИЙ ИЛ • СЪЕЗД К ВОДЕ"
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

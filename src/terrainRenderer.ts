// --- VOLUMETRIC TERRAIN, AGRICULTURAL FIELDS & DYNAMIC LIVING GRASS ENGINE ---
// First-principles geographic & botanical simulation:
// - Smooth, non-pixelated, stripe-free hypsometric & biome ground rendering
// - Real-time wind-driven grass & crop carpet (coupled to world.wind speed, angle & gust waves)
// - Real-time mechanical deflection around moving vehicles, player & pedestrians
// - Persistent physical trampling map (притоптанная колёсами и ногами трава)

import {
  GameWorld,
  Player,
  Vehicle,
  Pedestrian,
  Building,
  RoadSegment,
  SidewalkBlock,
} from './types';
import {
  AGRICULTURAL_FIELDS,
  LANDMARK_HILLS,
  AgriculturalField,
  getTerrainSlope,
} from './terrainElevation';
import { getBiomeSampleAt } from './biomeSystem';
import { getEffectiveWeatherWeights } from './weatherTransition';
import { getRiverWaterAt } from './riverSystem';

interface TrampledGrassCell {
  crush: number;      // 0.0 (upright) to 1.0 (completely flattened to the soil)
  dirX: number;       // Unit X direction in which wheel/foot pressed the stems
  dirY: number;       // Unit Y direction in which wheel/foot pressed the stems
  isWheel: boolean;   // True if crushed by a heavy vehicle tire
  lastTime: number;   // Timestamp (seconds) of last trampling contact
}

export class TerrainRenderer {
  private static sharedBufferCanvas: HTMLCanvasElement | null = null;
  private static sharedBufferCtx: CanvasRenderingContext2D | null = null;
  private static sharedImageData: ImageData | null = null;
  private static readonly BUFFER_SIZE = 64;
  private static microReliefPatterns: Map<string, CanvasPattern> = new Map();

  // --- PERSISTENT PHYSICAL GRASS TRAMPLING STATE (Притоптанная колёсами и ногами трава) ---
  private static readonly TRAMPLE_CELL_SIZE = 6;
  private static readonly MAX_TRAMPLE_CELLS = 28000;
  private static trampledCells: Map<number, TrampledGrassCell> = new Map();
  private static lastTrampleCleanupTime = 0;
  private static lastTrampleUpdateSec = 0;

  private static prng(x: number, y: number, seed: number): number {
    const h = Math.imul(x ^ seed, 374761393) + Math.imul(y ^ (seed >> 1), 668265263);
    const h2 = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h2 ^ (h2 >>> 16)) >>> 0) / 4294967296;
  }

  private static getTrampleKey(cx: number, cy: number): number {
    return ((cx & 0xffff) << 16) | (cy & 0xffff);
  }

  /**
   * Progressively compresses grass stems under rolling tires or walking feet.
   * Never snaps instantaneously in 1 frame and only affects the exact tire/foot contact width.
   */
  private static stampTrampleDisc(
    worldX: number,
    worldY: number,
    radius: number,
    dirX: number,
    dirY: number,
    crushIncrement: number,
    maxCrushCap: number,
    isWheel: boolean,
    nowSec: number
  ): void {
    const cell = this.TRAMPLE_CELL_SIZE;
    const minCx = Math.floor((worldX - radius) / cell);
    const maxCx = Math.floor((worldX + radius) / cell);
    const minCy = Math.floor((worldY - radius) / cell);
    const maxCy = Math.floor((worldY + radius) / cell);
    const rSq = radius * radius;

    for (let cy = minCy; cy <= maxCy; cy++) {
      const centerY = (cy + 0.5) * cell;
      const dy = centerY - worldY;
      for (let cx = minCx; cx <= maxCx; cx++) {
        const centerX = (cx + 0.5) * cell;
        const dx = centerX - worldX;
        const dSq = dx * dx + dy * dy;
        if (dSq > rSq) continue;

        const falloff = 1.0 - Math.sqrt(dSq) / radius;
        const delta = crushIncrement * (0.45 + 0.55 * falloff);
        if (delta < 0.005) continue;
        const localCap = maxCrushCap * (0.65 + 0.35 * falloff);

        const key = this.getTrampleKey(cx, cy);
        const existing = this.trampledCells.get(key);
        if (existing) {
          const blend = Math.min(0.65, delta * 1.8);
          const nx = existing.dirX * (1 - blend) + dirX * blend;
          const ny = existing.dirY * (1 - blend) + dirY * blend;
          const len = Math.hypot(nx, ny) || 1;
          existing.dirX = nx / len;
          existing.dirY = ny / len;
          existing.crush = Math.min(Math.max(existing.crush, localCap), existing.crush + delta);
          if (isWheel) existing.isWheel = true;
          existing.lastTime = nowSec;
        } else {
          if (this.trampledCells.size >= this.MAX_TRAMPLE_CELLS) {
            const oldestKey = this.trampledCells.keys().next().value;
            if (oldestKey !== undefined) this.trampledCells.delete(oldestKey);
          }
          this.trampledCells.set(key, {
            crush: Math.min(localCap, Math.max(0.16, delta * 1.8)),
            dirX,
            dirY,
            isWheel,
            lastTime: nowSec,
          });
        }
      }
    }
  }

  /**
   * Updates persistent grass trampling ONLY from actively rolling vehicle tires
   * and actively walking characters (zero instantaneous crushing while stationary).
   */
  private static updateTramplingFromEntities(
    world: GameWorld,
    player: Player | undefined,
    visibleVehicles: Vehicle[],
    visiblePedestrians: Pedestrian[],
    nowSec: number
  ): void {
    const dt =
      this.lastTrampleUpdateSec > 0
        ? Math.min(0.05, Math.max(0.004, nowSec - this.lastTrampleUpdateSec))
        : 0.016;
    this.lastTrampleUpdateSec = nowSec;

    // Periodic elastic grass recovery & cleanup every 2.0 seconds
    if (nowSec - this.lastTrampleCleanupTime > 2.0) {
      this.lastTrampleCleanupTime = nowSec;
      for (const [key, cell] of this.trampledCells.entries()) {
        const age = nowSec - cell.lastTime;
        const maxAge = cell.isWheel ? 420 : 120;
        if (age > maxAge) {
          this.trampledCells.delete(key);
        } else if (age > 15) {
          const decay = cell.isWheel ? 0.018 : 0.038;
          cell.crush = Math.max(0, cell.crush - decay);
          if (cell.crush < 0.08) this.trampledCells.delete(key);
        }
      }
    }

    // 1. Actively Rolling Vehicle Tires (4 physical tire contact patches only, no underbody blob)
    for (let i = 0; i < visibleVehicles.length; i++) {
      const v = visibleVehicles[i];
      const vSpeed = Math.hypot(v.vx || 0, v.vy || 0) || Math.abs(v.speed || 0);
      if (vSpeed < 2.2) continue; // Parked/stationary cars do not continuously crush grass

      const cosA = Math.cos(v.angle);
      const sinA = Math.sin(v.angle);

      let dirX = cosA;
      let dirY = sinA;
      if (v.vx || v.vy) {
        dirX = v.vx / vSpeed;
        dirY = v.vy / vSpeed;
      } else if ((v.speed || 0) < -0.5) {
        dirX = -cosA;
        dirY = -sinA;
      }

      const halfL = (v.length || 44) * 0.35;
      const halfW = (v.width || 20) * 0.5 - 2.0;
      // Exact physical tire tread contact width (narrow wheel track, never a wide shadow blob)
      const tireContactRadius = Math.max(3.6, Math.min(5.2, (v.width || 20) * 0.21));
      const crushIncrement = Math.min(0.42, dt * (1.8 + vSpeed * 0.065));

      const wheelOffsets = [
        [halfL, -halfW],
        [halfL, halfW],
        [-halfL, -halfW],
        [-halfL, halfW],
      ];

      for (let w = 0; w < 4; w++) {
        const lx = wheelOffsets[w][0];
        const ly = wheelOffsets[w][1];
        const wx = v.x + lx * cosA - ly * sinA;
        const wy = v.y + lx * sinA + ly * cosA;
        this.stampTrampleDisc(wx, wy, tireContactRadius, dirX, dirY, crushIncrement, 0.95, true, nowSec);
      }
    }

    // 2. Player on Foot (only when walking/running)
    if (player && !player.isInVehicle && !player.isInsideBuilding && !player.insideCarId && !player.insideBusId) {
      const pSpeed = Math.hypot(player.vx || 0, player.vy || 0) || Math.abs(player.speed || 0);
      if (pSpeed > 1.8) {
        const dirX = player.vx !== undefined && pSpeed > 1.0 ? player.vx / pSpeed : Math.cos(player.angle || 0);
        const dirY = player.vy !== undefined && pSpeed > 1.0 ? player.vy / pSpeed : Math.sin(player.angle || 0);
        const footIncrement = Math.min(0.28, dt * (1.4 + pSpeed * 0.05));
        this.stampTrampleDisc(player.x, player.y, 3.8, dirX, dirY, footIncrement, 0.72, false, nowSec);
      }
    }

    // 3. NPC Pedestrians on Foot (only when walking)
    for (let i = 0; i < visiblePedestrians.length; i++) {
      const ped = visiblePedestrians[i];
      if (ped.isInsideBuilding) continue;
      const pedSpeed = Math.abs(ped.speed || 0);
      if (pedSpeed < 1.5) continue;
      const dirX = Math.cos(ped.angle || 0);
      const dirY = Math.sin(ped.angle || 0);
      const footIncrement = Math.min(0.24, dt * (1.2 + pedSpeed * 0.04));
      this.stampTrampleDisc(ped.x, ped.y, 3.5, dirX, dirY, footIncrement, 0.65, false, nowSec);
    }
  }

  /**
   * Builds a lush, high-density 512x512 seamless botanical turf pattern containing:
   * - Soft organic humus & moss depth clouds
   * - Thousands of overlapping curved, tapered grass blades in 3 tonal canopy layers
   * - Three-leaf clover shamrock clusters (трилистники клевера) & broadleaf plantain rosettes (подорожник)
   * - Delicate micro-wildflowers (ромашки, лютики, незабудки, клевер) in spring/summer
   * Cached once per season/wetness as a hardware-accelerated CanvasPattern (0 ms per-frame cost).
   */
  public static getTerrainMicroReliefPattern(
    ctx: CanvasRenderingContext2D,
    isWet: boolean = false,
    season?: string
  ): CanvasPattern | null {
    if (typeof document === 'undefined') return null;
    const key = `lush_botanical_turf_v6_${season || 'summer'}_${isWet ? 'wet' : 'dry'}`;
    const cached = this.microReliefPatterns.get(key);
    if (cached) return cached;

    const size = 512;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const pctx = c.getContext('2d');
    if (!pctx) return null;

    const isWinter = season === 'winter';
    const isAutumn = season === 'autumn';
    const isSpring = season === 'spring';

    // 1. Broad, velvety soil & moss micro-relief clouds (wrapped seamlessly across 512x512 edges)
    const patchCount = 24;
    for (let i = 0; i < patchCount; i++) {
      const cx = this.prng(i, 17, 5101) * size;
      const cy = this.prng(i, 31, 5202) * size;
      const radius = 52 + this.prng(i, 47, 5303) * 64;
      const isDarkHollow = i % 2 === 0;

      for (let ox = -size; ox <= size; ox += size) {
        for (let oy = -size; oy <= size; oy += size) {
          const px = cx + ox;
          const py = cy + oy;
          if (px + radius < 0 || px - radius > size || py + radius < 0 || py - radius > size) continue;

          const grad = pctx.createRadialGradient(px, py, radius * 0.12, px, py, radius);
          if (isWinter) {
            if (isDarkHollow) {
              grad.addColorStop(0, 'rgba(100, 116, 139, 0.045)');
              grad.addColorStop(1, 'rgba(100, 116, 139, 0)');
            } else {
              grad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
              grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            }
          } else if (isDarkHollow) {
            grad.addColorStop(0, isWet ? 'rgba(6, 18, 9, 0.075)' : 'rgba(10, 26, 14, 0.06)');
            grad.addColorStop(0.6, isWet ? 'rgba(6, 18, 9, 0.03)' : 'rgba(10, 26, 14, 0.022)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          } else {
            const litColor = isAutumn
              ? 'rgba(156, 124, 44, 0.055)'
              : isWet
                ? 'rgba(42, 124, 64, 0.055)'
                : 'rgba(68, 152, 62, 0.055)';
            grad.addColorStop(0, litColor);
            grad.addColorStop(0.6, 'rgba(68, 148, 62, 0.02)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }

          pctx.fillStyle = grad;
          pctx.beginPath();
          pctx.arc(px, py, radius, 0, Math.PI * 2);
          pctx.fill();
        }
      }
    }

    if (isWinter) {
      // Subtle winter dry grass stalks peeking through snow crust
      const winterStalks = new Path2D();
      for (let i = 0; i < 420; i++) {
        const bx = this.prng(i, 11, 5401) * size;
        const by = this.prng(i, 23, 5402) * size;
        const ang = (this.prng(i, 37, 5403) - 0.5) * 1.4 - 1.2;
        const len = 3.5 + this.prng(i, 53, 5404) * 4.5;
        const tx = bx + Math.cos(ang) * len;
        const ty = by + Math.sin(ang) * len;
        winterStalks.moveTo(bx, by);
        winterStalks.lineTo(tx, ty);
      }
      pctx.strokeStyle = 'rgba(148, 138, 108, 0.18)';
      pctx.lineWidth = 0.9;
      pctx.lineCap = 'round';
      pctx.stroke(winterStalks);

      const pat = ctx.createPattern(c, 'repeat');
      if (pat) this.microReliefPatterns.set(key, pat);
      return pat;
    }

    // 2. Dense Undergrowth Moss & Basal Turf Cushions (Прикорневой дерн и мшистые подушечки)
    const basalPath = new Path2D();
    for (let i = 0; i < 950; i++) {
      const cx = this.prng(i, 13, 6101) * size;
      const cy = this.prng(i, 29, 6102) * size;
      const rx = 2.6 + this.prng(i, 41, 6103) * 3.8;
      const ry = 1.8 + this.prng(i, 59, 6104) * 2.6;
      const rot = this.prng(i, 71, 6105) * Math.PI;

      const wrapX = cx < 8 ? [0, size] : cx > size - 8 ? [0, -size] : [0];
      const wrapY = cy < 8 ? [0, size] : cy > size - 8 ? [0, -size] : [0];
      for (const ox of wrapX) {
        for (const oy of wrapY) {
          basalPath.moveTo(cx + ox + rx, cy + oy);
          basalPath.ellipse(cx + ox, cy + oy, rx, ry, rot, 0, Math.PI * 2);
        }
      }
    }
    pctx.fillStyle = isAutumn
      ? 'rgba(42, 34, 14, 0.16)'
      : isWet
        ? 'rgba(8, 28, 14, 0.18)'
        : 'rgba(14, 42, 20, 0.16)';
    pctx.fill(basalPath);

    // Helper to add a curved, tapered grass blade into a Path2D with seamless tile wrapping
    const addWrappedTaperedBlade = (
      path: Path2D,
      bx: number,
      by: number,
      len: number,
      angle: number,
      curveBend: number,
      baseHalfW: number
    ) => {
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const nx = -sinA;
      const ny = cosA;
      const tx = bx + cosA * len + nx * curveBend;
      const ty = by + sinA * len + ny * curveBend;
      const ctrlX = bx + cosA * (len * 0.52) + nx * (curveBend * 0.35);
      const ctrlY = by + sinA * (len * 0.52) + ny * (curveBend * 0.35);
      const hwX = nx * baseHalfW;
      const hwY = ny * baseHalfW;

      const wrapX = bx < 12 ? [0, size] : bx > size - 12 ? [0, -size] : [0];
      const wrapY = by < 12 ? [0, size] : by > size - 12 ? [0, -size] : [0];
      for (const ox of wrapX) {
        for (const oy of wrapY) {
          path.moveTo(bx + ox - hwX, by + oy - hwY);
          path.quadraticCurveTo(ctrlX + ox - hwX * 0.4, ctrlY + oy - hwY * 0.4, tx + ox, ty + oy);
          path.quadraticCurveTo(ctrlX + ox + hwX * 0.4, ctrlY + oy + hwY * 0.4, bx + ox + hwX, by + oy + hwY);
          path.closePath();
        }
      }
    };

    // 3. Three-Tier Dense Grass Tuft Carpet (Тысячи перекрывающихся травинок в пучках)
    const darkBladesPath = new Path2D();
    const midBladesPath = new Path2D();
    const sunlitBladesPath = new Path2D();

    const tuftCount = 1150;
    for (let t = 0; t < tuftCount; t++) {
      const tx = this.prng(t, 19, 6201) * size;
      const ty = this.prng(t, 37, 6202) * size;
      const bladesInTuft = 3 + (t % 3); // 3 to 5 blades per micro-tuft (~4,600 blades per 512x512 tile!)
      const baseDir = this.prng(t, 53, 6203) * Math.PI * 2;
      const tier = t % 3;
      const targetPath = tier === 0 ? darkBladesPath : tier === 1 ? midBladesPath : sunlitBladesPath;

      for (let b = 0; b < bladesInTuft; b++) {
        const fan = (b - (bladesInTuft - 1) * 0.5) * 0.48;
        const ang = baseDir + fan + (this.prng(t * 7 + b, 61, 6204) - 0.5) * 0.25;
        const len = 3.8 + this.prng(t * 7 + b, 79, 6205) * 4.8;
        const bend = (this.prng(t * 7 + b, 89, 6206) - 0.5) * 2.2;
        const ox = (this.prng(t * 7 + b, 97, 6207) - 0.5) * 2.4;
        const oy = (this.prng(t * 7 + b, 103, 6208) - 0.5) * 2.4;
        addWrappedTaperedBlade(targetPath, tx + ox, ty + oy, len, ang, bend, 0.72);
      }
    }

    pctx.fillStyle = isAutumn
      ? 'rgba(72, 56, 22, 0.24)'
      : isWet
        ? 'rgba(14, 48, 22, 0.26)'
        : 'rgba(20, 62, 28, 0.24)';
    pctx.fill(darkBladesPath);

    pctx.fillStyle = isAutumn
      ? 'rgba(116, 92, 34, 0.24)'
      : isWet
        ? 'rgba(28, 86, 40, 0.25)'
        : 'rgba(36, 102, 46, 0.24)';
    pctx.fill(midBladesPath);

    pctx.fillStyle = isAutumn
      ? 'rgba(154, 124, 46, 0.22)'
      : isSpring
        ? 'rgba(84, 168, 64, 0.24)'
        : isWet
          ? 'rgba(48, 122, 58, 0.22)'
          : 'rgba(66, 142, 58, 0.22)';
    pctx.fill(sunlitBladesPath);

    // 4. Clover Trefoil Shamrocks (Трилистники клевера) & Broadleaf Plantain Rosettes (Подорожник)
    const cloverPath = new Path2D();
    for (let cIdx = 0; cIdx < 320; cIdx++) {
      const cx = this.prng(cIdx, 23, 6301) * size;
      const cy = this.prng(cIdx, 43, 6302) * size;
      const rot = this.prng(cIdx, 67, 6303) * Math.PI * 2;
      const isPlantain = cIdx % 4 === 0;

      const wrapX = cx < 8 ? [0, size] : cx > size - 8 ? [0, -size] : [0];
      const wrapY = cy < 8 ? [0, size] : cy > size - 8 ? [0, -size] : [0];

      for (const ox of wrapX) {
        for (const oy of wrapY) {
          const px = cx + ox;
          const py = cy + oy;
          if (isPlantain) {
            // 5-leaf broadleaf plantain basal star rosette
            for (let l = 0; l < 5; l++) {
              const lang = rot + (l * Math.PI * 2) / 5;
              const lx = px + Math.cos(lang) * 2.3;
              const ly = py + Math.sin(lang) * 2.3;
              cloverPath.moveTo(lx + 1.8 * Math.cos(lang), ly + 1.8 * Math.sin(lang));
              cloverPath.ellipse(lx, ly, 2.1, 1.05, lang, 0, Math.PI * 2);
            }
          } else {
            // 3-leaf shamrock clover cluster
            for (let l = 0; l < 3; l++) {
              const lang = rot + (l * Math.PI * 2) / 3;
              const lx = px + Math.cos(lang) * 1.45;
              const ly = py + Math.sin(lang) * 1.45;
              cloverPath.moveTo(lx + 1.3, ly);
              cloverPath.ellipse(lx, ly, 1.35, 1.05, lang, 0, Math.PI * 2);
            }
          }
        }
      }
    }
    pctx.fillStyle = isAutumn
      ? 'rgba(98, 86, 36, 0.22)'
      : isWet
        ? 'rgba(34, 96, 48, 0.24)'
        : 'rgba(46, 118, 56, 0.22)';
    pctx.fill(cloverPath);

    // 5. Micro-Wildflower Specks in the Static Turf Carpet (Маргаритки, лютики, вероника дубравная)
    if (!isAutumn) {
      const whiteMicroFlowers = new Path2D();
      const yellowMicroFlowers = new Path2D();
      const blueMicroFlowers = new Path2D();
      const pinkMicroFlowers = new Path2D();

      for (let f = 0; f < 165; f++) {
        const fx = this.prng(f, 17, 6401) * size;
        const fy = this.prng(f, 31, 6402) * size;
        const fType = f % 4;
        const r = 0.95 + this.prng(f, 53, 6403) * 0.55;
        const target =
          fType === 0
            ? whiteMicroFlowers
            : fType === 1
              ? yellowMicroFlowers
              : fType === 2
                ? blueMicroFlowers
                : pinkMicroFlowers;
        target.moveTo(fx + r, fy);
        target.arc(fx, fy, r, 0, Math.PI * 2);
      }

      pctx.fillStyle = 'rgba(248, 250, 252, 0.42)';
      pctx.fill(whiteMicroFlowers);
      pctx.fillStyle = 'rgba(250, 204, 21, 0.40)';
      pctx.fill(yellowMicroFlowers);
      pctx.fillStyle = 'rgba(96, 165, 250, 0.38)';
      pctx.fill(blueMicroFlowers);
      pctx.fillStyle = 'rgba(244, 114, 182, 0.36)';
      pctx.fill(pinkMicroFlowers);
    }

    const pat = ctx.createPattern(c, 'repeat');
    if (pat) this.microReliefPatterns.set(key, pat);
    return pat;
  }

  private static getSharedBuffer(): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    imgData: ImageData;
  } | null {
    if (typeof document === 'undefined') return null;
    if (!this.sharedBufferCanvas) {
      this.sharedBufferCanvas = document.createElement('canvas');
      this.sharedBufferCanvas.width = this.BUFFER_SIZE;
      this.sharedBufferCanvas.height = this.BUFFER_SIZE;
      this.sharedBufferCtx = this.sharedBufferCanvas.getContext('2d', { willReadFrequently: false })!;
      this.sharedImageData = this.sharedBufferCtx.createImageData(this.BUFFER_SIZE, this.BUFFER_SIZE);
    }
    return {
      canvas: this.sharedBufferCanvas,
      ctx: this.sharedBufferCtx!,
      imgData: this.sharedImageData!,
    };
  }

  /**
   * Renders the static chunk ground base (smooth biome soil/turf, cottage yards, field soil bases, and hills).
   * Dynamic wind-swaying grass carpet and trampled tracks are rendered per-frame in renderDynamicFieldGrass.
   */
  public static renderGround(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    const chunkW = maxX - minX;
    const chunkH = maxY - minY;
    const buf = this.getSharedBuffer();
    const weatherWeights = getEffectiveWeatherWeights(world);
    const isWet = weatherWeights.isWetSurface;
    const season = world.calendar?.season;

    // 1. Continuous Ecological Biome Base with Smooth 3D Hillshading (zero yellow stripe artifacts)
    if (buf && chunkW > 0 && chunkH > 0) {
      const { canvas: bufCanvas, ctx: bufCtx, imgData } = buf;
      const data = imgData.data;
      const size = this.BUFFER_SIZE;

      for (let iy = 0; iy < size; iy++) {
        const normY = (iy + 0.5) / size;
        const wy = minY + normY * chunkH;

        for (let ix = 0; ix < size; ix++) {
          const normX = (ix + 0.5) / size;
          const wx = minX + normX * chunkW;

          const sample = getBiomeSampleAt(wx, wy);
          const slope = getTerrainSlope(wx, wy);

          let r = sample.r;
          let g = sample.g;
          let b = sample.b;

          // 1. Subtle valley depth shading (no yellow peak tinting on green hills!)
          const elev = slope.elevation;
          if (elev < 5.0) {
            const valleyRatio = Math.min(1.0, (5.0 - elev) / 5.0) * 0.14;
            r *= 1.0 - valleyRatio * 0.5;
            g *= 1.0 - valleyRatio * 0.4;
            b *= 1.0 - valleyRatio * 0.5;
          }

          // 2. Smooth Directional Hillshading (natural verdant sunlit slopes & cool emerald shadows)
          const shade = slope.shade;
          if (shade > 0.02) {
            const light = Math.min(0.18, shade * 0.16);
            r = r + (Math.min(255, r * 1.22 + 12) - r) * light;
            g = g + (Math.min(255, g * 1.25 + 16) - g) * light;
            b = b + (Math.min(255, b * 1.15 + 8) - b) * light;
          } else if (shade < -0.02) {
            const dark = Math.min(0.24, Math.abs(shade) * 0.20);
            r *= 1.0 - dark * 0.75;
            g *= 1.0 - dark * 0.68;
            b *= 1.0 - dark * 0.72;
          }

          // 3. Seasonal ecological ground transformation
          if (season === 'winter') {
            const snowRatio = 0.90;
            r = r * (1 - snowRatio) + 240 * snowRatio;
            g = g * (1 - snowRatio) + 245 * snowRatio;
            b = b * (1 - snowRatio) + 253 * snowRatio;
          } else if (season === 'autumn') {
            r = Math.min(255, r * 1.16 + 10);
            g = g * 0.90;
            b = b * 0.78;
          } else if (season === 'spring') {
            g = Math.min(255, g * 1.12 + 6);
          }

          // 4. Physical Wet Ground Porosity Darkening
          if (isWet && season !== 'winter') {
            const soilFactor = Math.max(sample.clayWeight, sample.saltWeight, sample.steppeWeight * 0.8);
            const darken = 0.74 - soilFactor * 0.10;
            r *= darken;
            g *= darken * 1.02;
            b *= darken * 1.08;
          }

          const pIdx = (iy * size + ix) * 4;
          data[pIdx] = Math.min(255, Math.max(0, Math.round(r)));
          data[pIdx + 1] = Math.min(255, Math.max(0, Math.round(g)));
          data[pIdx + 2] = Math.min(255, Math.max(0, Math.round(b)));
          data[pIdx + 3] = 255;
        }
      }

      bufCtx.putImageData(imgData, 0, 0);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bufCanvas, 0, 0, size, size, minX, minY, chunkW, chunkH);

      // Overlay dense botanical turf pattern
      const reliefPat = this.getTerrainMicroReliefPattern(ctx, isWet, season);
      if (reliefPat) {
        ctx.fillStyle = reliefPat;
        ctx.fillRect(minX, minY, chunkW, chunkH);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = isWet ? '#103b1d' : '#18542a';
      ctx.fillRect(minX, minY, chunkW, chunkH);
    }

    // 2. Salt Lake Water Bodies
    this.renderSaltLakeWaters(ctx, minX, minY, maxX, maxY);

    // 3. Central City Parks (Downtown Greenery)
    this.renderUrbanParks(ctx, world, minX, minY, maxX, maxY);

    // 4. Industrial Yard Heavy Concrete Slabs (5600..8000, 0..3300)
    this.renderIndustrialZone(ctx, minX, minY, maxX, maxY);

    // 4b. Private Cottage Estate Lawns & Gardens (stripe-free organic garden turf)
    this.renderCottageEstatesLandscaping(ctx, world, minX, minY, maxX, maxY, isWet);

    // 5. Agricultural Field Parcels (organic soil & crop bases without flat barcode stripes)
    this.renderAgriculturalFieldParcels(ctx, world, minX, minY, maxX, maxY, isWet);

    // 6. Volumetric Landmark Hills, Kurgans & Mounds
    this.renderLandmarkHillsAndRelief(ctx, minX, minY, maxX, maxY);

    // 7. Agricultural Micro-Props (Round Hay Bales / Straw Rolls)
    this.renderHayBales(ctx, world, minX, minY, maxX, maxY);
  }

  // --- 2. SALT LAKE MINERAL WATERS ---
  private static renderSaltLakeWaters(
    ctx: CanvasRenderingContext2D,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const waterY1 = Math.max(minY, 7300);
    const waterY2 = Math.min(maxY, 8200);
    if (waterY2 <= waterY1) return;

    const w1X1 = Math.max(minX, 17000);
    const w1X2 = Math.min(maxX, 23000);
    if (w1X2 > w1X1) {
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(w1X1, waterY1, w1X2 - w1X1, waterY2 - waterY1);
    }

    const w2X1 = Math.max(minX, 27000);
    const w2X2 = Math.min(maxX, 35000);
    if (w2X2 > w2X1) {
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(w2X1, waterY1, w2X2 - w2X1, waterY2 - waterY1);
    }
  }

  // --- 3. DOWNTOWN PARKS ---
  private static renderUrbanParks(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const pX1 = Math.max(minX, 4200);
    const pY1 = Math.max(minY, 1800);
    const pX2 = Math.min(maxX, 5000);
    const pY2 = Math.min(maxY, 2600);
    if (pX2 > pX1 && pY2 > pY1) {
      const season = world.calendar?.season;
      const isWet = getEffectiveWeatherWeights(world).isWetSurface;
      if (season === 'winter') {
        ctx.fillStyle = '#e2e8f0';
      } else if (season === 'autumn') {
        ctx.fillStyle = isWet ? '#543910' : '#78541a';
      } else if (season === 'spring') {
        ctx.fillStyle = isWet ? '#2c6828' : '#3a8234';
      } else {
        ctx.fillStyle = isWet ? '#145a2b' : '#1d7a3a';
      }
      ctx.fillRect(pX1, pY1, pX2 - pX1, pY2 - pY1);
      this.renderCourtyardLawnDetails(ctx, pX1, pY1, pX2 - pX1, pY2 - pY1, season, isWet);
    }
  }

  /**
   * Renders lush organic clover patches, basal turf rosettes, and lawn micro-flowers
   * on urban courtyard lawns and city parks.
   */
  public static renderCourtyardLawnDetails(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    season?: string,
    isWet: boolean = false
  ) {
    if (w <= 8 || h <= 8) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const reliefPat = this.getTerrainMicroReliefPattern(ctx, isWet, season);
    if (reliefPat) {
      ctx.fillStyle = reliefPat;
      ctx.fillRect(x, y, w, h);
    }

    if (season !== 'winter') {
      const isAutumn = season === 'autumn';
      const area = w * h;
      const patchCount = Math.min(28, Math.max(3, Math.floor(area / 6500)));
      const seedBase = Math.floor(x * 0.13 + y * 0.29);

      for (let i = 0; i < patchCount; i++) {
        const px = x + 12 + this.prng(seedBase + i, 19, 7101) * Math.max(4, w - 24);
        const py = y + 12 + this.prng(seedBase + i, 37, 7102) * Math.max(4, h - 24);
        const rad = 14 + this.prng(seedBase + i, 53, 7103) * 26;
        const grad = ctx.createRadialGradient(px, py, 2, px, py, rad);
        if (i % 2 === 0) {
          grad.addColorStop(0, isAutumn ? 'rgba(138, 118, 38, 0.18)' : 'rgba(54, 162, 74, 0.18)');
        } else {
          grad.addColorStop(0, 'rgba(10, 36, 16, 0.16)');
        }
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Soft inner curb shadow around the lawn perimeter
    ctx.strokeStyle = 'rgba(8, 22, 12, 0.24)';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.restore();
  }

  // --- 4B. COTTAGE ESTATE SUBURBAN YARDS & GARDENS (Густой бархатный садовый дерн, клевер и заросшие участки) ---
  private static renderCottageEstatesLandscaping(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    isWet: boolean = false
  ) {
    if (maxX < 4870 || minX > 7870 || maxY < 4870 || minY > 7870) return;

    const season = world.calendar?.season || 'summer';
    const isWinter = season === 'winter';
    const isAutumn = season === 'autumn';
    const isSpring = season === 'spring';
    const reliefPat = this.getTerrainMicroReliefPattern(ctx, isWet, season);

    const colPairs = [
      [
        { x1: 4880, x2: 5158 },
        { x1: 5182, x2: 5460 },
      ],
      [
        { x1: 5740, x2: 6018 },
        { x1: 6042, x2: 6320 },
      ],
      [
        { x1: 6480, x2: 6788 },
        { x1: 6812, x2: 7120 },
      ],
      [
        { x1: 7280, x2: 7558 },
        { x1: 7582, x2: 7860 },
      ],
    ];

    const rowPairs = [
      [
        { y1: 4880, y2: 5188 },
        { y1: 5212, y2: 5520 },
      ],
      [
        { y1: 5680, y2: 5988 },
        { y1: 6012, y2: 6320 },
      ],
      [
        { y1: 6480, y2: 6788 },
        { y1: 6812, y2: 7120 },
      ],
      [
        { y1: 7280, y2: 7558 },
        { y1: 7582, y2: 7860 },
      ],
    ];

    let plotNum = 0;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (r === 0 && c === 0) continue; // SE Gas Station

        for (let subR = 0; subR < 2; subR++) {
          for (let subC = 0; subC < 2; subC++) {
            plotNum++;
            const px1 = colPairs[c][subC].x1;
            const px2 = colPairs[c][subC].x2;
            const py1 = rowPairs[r][subR].y1;
            const py2 = rowPairs[r][subR].y2;
            const pw = px2 - px1;
            const ph = py2 - py1;

            if (px2 < minX || px1 > maxX || py2 < minY || py1 > maxY) continue;

            const isAbandoned = plotNum === 5 || plotNum === 27 || plotNum === 36;

            ctx.save();
            ctx.beginPath();
            ctx.rect(px1, py1, pw, ph);
            ctx.clip();

            if (isAbandoned) {
              ctx.fillStyle = isWinter
                ? '#dce4ee'
                : isAutumn
                  ? '#5c4822'
                  : isWet
                    ? '#1b361c'
                    : '#284d23';
              ctx.fillRect(px1, py1, pw, ph);

              if (reliefPat) {
                ctx.fillStyle = reliefPat;
                ctx.fillRect(px1, py1, pw, ph);
              }

              if (!isWinter) {
                for (let k = 0; k < 8; k++) {
                  const rx = px1 + 36 + this.prng(plotNum, k, 901) * (pw - 72);
                  const ry = py1 + 36 + this.prng(plotNum, k, 902) * (ph - 72);
                  const rad = 24 + this.prng(plotNum, k, 903) * 34;
                  const grad = ctx.createRadialGradient(rx, ry, 2, rx, ry, rad);
                  grad.addColorStop(0, isWet ? 'rgba(38, 28, 18, 0.42)' : 'rgba(68, 52, 34, 0.35)');
                  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                  ctx.fillStyle = grad;
                  ctx.beginPath();
                  ctx.arc(rx, ry, rad, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            } else {
              // Natural emerald garden turf base
              const lawnTone = plotNum % 3;
              if (isWinter) {
                ctx.fillStyle = '#e5edf5';
              } else if (isAutumn) {
                ctx.fillStyle = lawnTone === 0 ? '#5c6b28' : lawnTone === 1 ? '#4f6424' : '#666d2a';
              } else if (isSpring) {
                ctx.fillStyle = lawnTone === 0 ? '#2a722d' : lawnTone === 1 ? '#256929' : '#2e7830';
              } else {
                ctx.fillStyle = isWet
                  ? (lawnTone === 0 ? '#154b22' : lawnTone === 1 ? '#13441e' : '#185025')
                  : (lawnTone === 0 ? '#1d642d' : lawnTone === 1 ? '#1a5c29' : '#216b31');
              }
              ctx.fillRect(px1, py1, pw, ph);

              if (reliefPat) {
                ctx.fillStyle = reliefPat;
                ctx.fillRect(px1, py1, pw, ph);
              }

              if (!isWinter) {
                // Soft organic radial clover/moss variations across the yard
                for (let k = 0; k < 6; k++) {
                  const rx = px1 + 30 + this.prng(plotNum, k, 921) * (pw - 60);
                  const ry = py1 + 30 + this.prng(plotNum, k, 922) * (ph - 60);
                  const rad = 35 + this.prng(plotNum, k, 923) * 45;
                  const grad = ctx.createRadialGradient(rx, ry, 4, rx, ry, rad);
                  if (k % 2 === 0) {
                    grad.addColorStop(0, isAutumn ? 'rgba(120, 130, 45, 0.16)' : 'rgba(52, 168, 83, 0.16)');
                  } else {
                    grad.addColorStop(0, 'rgba(10, 36, 16, 0.16)');
                  }
                  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                  ctx.fillStyle = grad;
                  ctx.beginPath();
                  ctx.arc(rx, ry, rad, 0, Math.PI * 2);
                  ctx.fill();
                }

                // Soft perimeter fence shadow
                ctx.strokeStyle = 'rgba(8, 24, 12, 0.30)';
                ctx.lineWidth = 6;
                ctx.strokeRect(px1 + 3, py1 + 3, pw - 6, ph - 6);
              }
            }

            ctx.restore();
          }
        }
      }
    }
  }

  // --- 4. INDUSTRIAL DISTRICT CONCRETE APRONS ---
  private static renderIndustrialZone(
    ctx: CanvasRenderingContext2D,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const indX1 = Math.max(minX, 5600);
    const indY1 = Math.max(minY, 0);
    const indX2 = Math.min(maxX, 8000);
    const indY2 = Math.min(maxY, 3300);
    if (indX2 <= indX1 || indY2 <= indY1) return;

    ctx.fillStyle = '#222934';
    ctx.fillRect(indX1, indY1, indX2 - indX1, indY2 - indY1);

    const slabW = 48;
    const slabH = 24;
    const startX = Math.floor(indX1 / slabW) * slabW;
    const startY = Math.floor(indY1 / slabH) * slabH;

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = startX; x <= indX2; x += slabW) {
      ctx.moveTo(x, indY1);
      ctx.lineTo(x, indY2);
    }
    for (let y = startY; y <= indY2; y += slabH) {
      ctx.moveTo(indX1, y);
      ctx.lineTo(indX2, y);
    }
    ctx.stroke();

    for (let x = startX; x <= indX2; x += slabW) {
      for (let y = startY; y <= indY2; y += slabH) {
        const slabHash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        const modVal = slabHash % 8;
        if (modVal === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
          ctx.fillRect(x + 1, y + 1, slabW - 2, slabH - 2);
        } else if (modVal === 1) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.fillRect(x + 1, y + 1, slabW - 2, slabH - 2);
        } else if (modVal === 2) {
          ctx.fillStyle = 'rgba(10, 15, 25, 0.35)';
          ctx.beginPath();
          ctx.ellipse(x + 24, y + 12, 10, 6, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // --- 5. AGRICULTURAL FIELD PARCELS (Organic non-striped soil & crop understories) ---
  private static renderAgriculturalFieldParcels(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    isWet: boolean = false
  ) {
    const season = world.calendar?.season;
    const isWinter = season === 'winter';
    const reliefPat = this.getTerrainMicroReliefPattern(ctx, isWet, season);

    for (const field of AGRICULTURAL_FIELDS) {
      const b = field.bounds;
      if (b.x + b.width < minX || b.x > maxX || b.y + b.height < minY || b.y > maxY) {
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x, b.y, b.width, b.height);
      ctx.clip();

      switch (field.type) {
        case 'plowed':
          this.renderPlowedArableField(ctx, field, minX, minY, maxX, maxY, isWet && !isWinter);
          break;
        case 'wheat':
          this.renderGoldenWheatField(ctx, field, minX, minY, maxX, maxY);
          break;
        case 'clover':
          this.renderCloverAlfalfaField(ctx, field, minX, minY, maxX, maxY, reliefPat);
          break;
        case 'sunflower':
          this.renderSunflowerField(ctx, field, minX, minY, maxX, maxY, reliefPat);
          break;
        case 'pasture':
          this.renderPastureField(ctx, field, minX, minY, maxX, maxY, reliefPat);
          break;
        default:
          break;
      }

      if (isWinter) {
        ctx.fillStyle = 'rgba(241, 245, 249, 0.62)';
        ctx.fillRect(b.x, b.y, b.width, b.height);
      }

      ctx.restore();
      this.renderFieldBoundaryBerm(ctx, field, minX, minY, maxX, maxY);
    }
  }

  // --- PLOWED ARABLE FIELD (Спокойная бархатистая пашня чернозема) ---
  private static renderPlowedArableField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    _minX: number,
    _minY: number,
    _maxX: number,
    _maxY: number,
    isWet: boolean = false
  ) {
    const b = field.bounds;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.width, b.y + b.height);
    if (isWet) {
      grad.addColorStop(0, '#1d140d');
      grad.addColorStop(0.5, '#170f0a');
      grad.addColorStop(1, '#211710');
    } else {
      grad.addColorStop(0, '#332419');
      grad.addColorStop(0.5, '#2b1e14');
      grad.addColorStop(1, '#36271b');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }

  // --- GOLDEN WHEAT FIELD BASE (Матовая золотая основа пшеничного поля) ---
  private static renderGoldenWheatField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    _minX: number,
    _minY: number,
    _maxX: number,
    _maxY: number
  ) {
    const b = field.bounds;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.width, b.y + b.height);
    grad.addColorStop(0, '#7c6228');
    grad.addColorStop(0.5, '#85692b');
    grad.addColorStop(1, '#755c25');
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }

  // --- CLOVER & ALFALFA MEADOW BASE (Густой клеверный луг) ---
  private static renderCloverAlfalfaField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    reliefPat?: CanvasPattern | null
  ) {
    const b = field.bounds;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.width, b.y + b.height);
    grad.addColorStop(0, '#235931');
    grad.addColorStop(0.5, '#276136');
    grad.addColorStop(1, '#20522d');
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.width, b.height);

    if (reliefPat) {
      const ix = Math.max(b.x, minX);
      const iy = Math.max(b.y, minY);
      const iw = Math.min(b.x + b.width, maxX) - ix;
      const ih = Math.min(b.y + b.height, maxY) - iy;
      if (iw > 0 && ih > 0) {
        ctx.fillStyle = reliefPat;
        ctx.fillRect(ix, iy, iw, ih);
      }
    }
  }

  // --- SUNFLOWER BLOOMING FIELD BASE (Основа поля подсолнухов с густым подшерстком) ---
  private static renderSunflowerField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    reliefPat?: CanvasPattern | null
  ) {
    const b = field.bounds;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.width, b.y + b.height);
    grad.addColorStop(0, '#244f28');
    grad.addColorStop(0.5, '#28562c');
    grad.addColorStop(1, '#214824');
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.width, b.height);

    if (reliefPat) {
      const ix = Math.max(b.x, minX);
      const iy = Math.max(b.y, minY);
      const iw = Math.min(b.x + b.width, maxX) - ix;
      const ih = Math.min(b.y + b.height, maxY) - iy;
      if (iw > 0 && ih > 0) {
        ctx.fillStyle = reliefPat;
        ctx.fillRect(ix, iy, iw, ih);
      }
    }
  }

  // --- PASTURE & ROLLING KNOLLS (Густое разнотравное пастбище) ---
  private static renderPastureField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    reliefPat?: CanvasPattern | null
  ) {
    const b = field.bounds;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.width, b.y + b.height);
    grad.addColorStop(0, '#275c32');
    grad.addColorStop(0.5, '#2b6336');
    grad.addColorStop(1, '#24562e');
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.width, b.height);

    if (reliefPat) {
      const ix = Math.max(b.x, minX);
      const iy = Math.max(b.y, minY);
      const iw = Math.min(b.x + b.width, maxX) - ix;
      const ih = Math.min(b.y + b.height, maxY) - iy;
      if (iw > 0 && ih > 0) {
        ctx.fillStyle = reliefPat;
        ctx.fillRect(ix, iy, iw, ih);
      }
    }
  }

  // --- RAISED FIELD BOUNDARY BERM ---
  private static renderFieldBoundaryBerm(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const b = field.bounds;
    const bermW = field.borderBermWidth || 14;
    if (
      b.x + b.width + bermW < minX ||
      b.x - bermW > maxX ||
      b.y + b.height + bermW < minY ||
      b.y - bermW > maxY
    ) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(18, 38, 16, 0.35)';
    ctx.lineWidth = bermW;
    ctx.lineJoin = 'round';
    ctx.strokeRect(b.x, b.y, b.width, b.height);
    ctx.restore();
  }

  // --- 6. LANDMARK HILLS, KURGANS & VOLUMETRIC RELIEF GRADIENTS ---
  private static renderLandmarkHillsAndRelief(
    ctx: CanvasRenderingContext2D,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    for (const hill of LANDMARK_HILLS) {
      const maxR = Math.max(hill.radiusX, hill.radiusY) + 80;
      if (
        hill.x + maxR < minX ||
        hill.x - maxR > maxX ||
        hill.y + maxR < minY ||
        hill.y - maxR > maxY
      ) {
        continue;
      }

      ctx.save();
      ctx.translate(hill.x, hill.y);
      if (hill.angle) {
        ctx.rotate(hill.angle);
      }

      const rx = hill.radiusX;
      const ry = hill.radiusY;

      // Soft ambient shadow on SE slope
      const shadowGrad = ctx.createRadialGradient(
        rx * 0.35,
        ry * 0.35,
        10,
        rx * 0.2,
        ry * 0.2,
        rx * 1.35
      );
      shadowGrad.addColorStop(0, 'rgba(6, 18, 9, 0.26)');
      shadowGrad.addColorStop(0.5, 'rgba(10, 24, 14, 0.12)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(rx * 0.15, ry * 0.15, rx * 1.35, ry * 1.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gentle sunlit NW slope
      const litGrad = ctx.createRadialGradient(
        -rx * 0.35,
        -ry * 0.35,
        5,
        -rx * 0.2,
        -ry * 0.2,
        rx * 1.15
      );
      litGrad.addColorStop(0, 'rgba(165, 210, 145, 0.14)');
      litGrad.addColorStop(0.45, 'rgba(150, 195, 130, 0.06)');
      litGrad.addColorStop(1, 'rgba(150, 195, 130, 0)');

      ctx.fillStyle = litGrad;
      ctx.beginPath();
      ctx.ellipse(-rx * 0.2, -ry * 0.2, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();

      if (hill.type === 'kurgan') {
        const kurganGrad = ctx.createRadialGradient(-18, -18, 0, -18, -18, 42);
        kurganGrad.addColorStop(0, 'rgba(175, 148, 105, 0.36)');
        kurganGrad.addColorStop(0.5, 'rgba(135, 108, 72, 0.18)');
        kurganGrad.addColorStop(1, 'rgba(120, 90, 50, 0)');

        ctx.fillStyle = kurganGrad;
        ctx.beginPath();
        ctx.arc(-18, -18, 42, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // --- 7. SCATTERED ROUND HAY BALES / STRAW ROLLS ---
  private static renderHayBales(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const isWinter = world.calendar?.season === 'winter';
    for (const field of AGRICULTURAL_FIELDS) {
      if (!field.hasHayBales || !field.hayBalePositions) continue;

      for (const bale of field.hayBalePositions) {
        if (
          bale.x + 30 < minX ||
          bale.x - 30 > maxX ||
          bale.y + 30 < minY ||
          bale.y - 30 > maxY
        ) {
          continue;
        }

        ctx.save();
        ctx.translate(bale.x, bale.y);
        ctx.rotate(bale.angle);

        const baleL = 22;
        const baleW = 14;

        ctx.fillStyle = 'rgba(10, 15, 10, 0.45)';
        ctx.beginPath();
        ctx.ellipse(6, 6, baleL * 0.55, baleW * 0.5, 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(-baleL / 2, -baleW / 2, baleL, baleW);

        ctx.fillStyle = 'rgba(113, 63, 18, 0.65)';
        ctx.fillRect(-baleL / 2, baleW * 0.1, baleL, baleW * 0.4);

        ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
        ctx.fillRect(-baleL / 2, -baleW / 2, baleL, baleW * 0.35);

        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(baleL / 2, 0, 3, baleW / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-baleL * 0.25, -baleW / 2);
        ctx.lineTo(-baleL * 0.25, baleW / 2);
        ctx.moveTo(baleL * 0.25, -baleW / 2);
        ctx.lineTo(baleL * 0.25, baleW / 2);
        ctx.stroke();

        if (isWinter) {
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.roundRect(-baleL / 2 - 1, -baleW / 2 - 2, baleL + 2, 4.5, 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }
  }

  // ============================================================================
  // --- 8. DENSE, MULTI-SPECIES LIVING GRASS, FLORA & WILDFLOWER ENGINE ---
  // ============================================================================
  /**
   * Renders a lush, lifelike, wind-reactive carpet of multi-species grass & wildflowers at 60 FPS:
   * - High-density multi-tuft grass clusters with thousands of curved, tapered blades (3 tonal canopy tiers)
   * - Botanical species diversity:
   *   * Луговая овсяница и мятлик (Arching Meadow Fescue & Bluegrass Tussocks)
   *   * Ползучий и луговой клевер (Three-Leaf Clover Trefoil Shamrocks with V-chevrons)
   *   * Подорожник большой и розетки (Broadleaf Plantain Rosettes & Seed Spikes)
   *   * Тимофеевка, ковыль и метёлки злаков (Tall Spikelet Culms & Silky Feather Grass Plumes)
   *   * Лесной папоротник и осока (Woodland Pinnate Fern Fronds in forest biomes)
   *   * Серебристая полынь и типчак (Silvery-Sage Wormwood in steppe ecotones)
   *   * Колосья озимой пшеницы и ржи (Segmented Golden Wheat Ears in crop fields)
   * - 10 recognizable multi-petal wildflower species in natural blooming glades (ромашки, золотые и
   *   пушистые белые одуванчики, синие васильки, розовый клевер, лютики, иван-чай/люпин, алые маки,
   *   незабудки и подсолнухи)
   * - Batched into hardware-accelerated Path2D layers for ultra-fast GPU execution.
   */
  private static grassSurfaceCache = new Map<number, number>();
  private static grassSurfaceCacheWorldKey = '';

  public static renderDynamicFieldGrass(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    player: Player | undefined,
    visibleVehicles: Vehicle[],
    visiblePedestrians: Pedestrian[],
    visibleBuildings: Building[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    cameraZoom: number = 1.5
  ): void {
    const season = world.calendar?.season || 'summer';
    if (season === 'winter') return;

    const nowSec = performance.now() * 0.001;
    const isAutumn = season === 'autumn';
    const isSpring = season === 'spring';
    const isWet = getEffectiveWeatherWeights(world).isWetSurface;

    // 1. Update persistent physical trampling map from moving vehicles & walking characters
    this.updateTramplingFromEntities(world, player, visibleVehicles, visiblePedestrians, nowSec);

    // 2. Read real-time physical wind from world.wind
    const wind = world.wind;
    const windAngle = wind?.angle ?? 0.55;
    const windVx = wind?.vx ?? Math.cos(windAngle) * 16;
    const windVy = wind?.vy ?? Math.sin(windAngle) * 16;
    const windSpeed = Math.hypot(windVx, windVy);
    const windGust = wind?.gust ?? 1.0;

    const wCos = windSpeed > 0.1 ? windVx / windSpeed : Math.cos(windAngle);
    const wSin = windSpeed > 0.1 ? windVy / windSpeed : Math.sin(windAngle);
    const baseWindPower = Math.min(1.65, Math.max(0.15, (windSpeed / 32) * (0.75 + windGust * 0.38)));
    const waveSpeed = 1.55 + windSpeed * 0.048;

    // 3. Pre-cull non-grass geometry in current viewport for fast exclusion
    const pad = 42;
    const activeRoads: RoadSegment[] = [];
    const allRoads = world.roads || [];
    for (let i = 0; i < allRoads.length; i++) {
      const r = allRoads[i];
      const m = (r.width || 60) / 2 + 28;
      const rx1 = (r._minX ?? Math.min(r.x1, r.x2)) - m;
      const rx2 = (r._maxX ?? Math.max(r.x1, r.x2)) + m;
      const ry1 = (r._minY ?? Math.min(r.y1, r.y2)) - m;
      const ry2 = (r._maxY ?? Math.max(r.y1, r.y2)) + m;
      if (rx2 >= minX - pad && rx1 <= maxX + pad && ry2 >= minY - pad && ry1 <= maxY + pad) {
        activeRoads.push(r);
      }
    }

    const activeSidewalks: SidewalkBlock[] = [];
    const allSidewalks = world.sidewalks || [];
    for (let i = 0; i < allSidewalks.length; i++) {
      const sw = allSidewalks[i];
      if (sw.x + sw.width >= minX && sw.x <= maxX && sw.y + sw.height >= minY && sw.y <= maxY) {
        activeSidewalks.push(sw);
      }
    }

    const activeIntersections = (world.intersections || []).filter(
      (inter) =>
        inter.x + inter.width / 2 + 10 >= minX &&
        inter.x - inter.width / 2 - 10 <= maxX &&
        inter.y + inter.height / 2 + 10 >= minY &&
        inter.y - inter.height / 2 - 10 <= maxY
    );

    const activeParkings = (world.parkings || []).filter(
      (pk) => pk.x + pk.width >= minX && pk.x <= maxX && pk.y + pk.height >= minY && pk.y <= maxY
    );

    const activeDriveways = (world.driveways || []).filter(
      (dw) => dw.x + dw.width >= minX && dw.x <= maxX && dw.y + dw.height >= minY && dw.y <= maxY
    );

    const activeTracks = (world.railwayTracks || []).filter((tr) => {
      const tx1 = Math.min(tr.x1, tr.x2) - 26;
      const tx2 = Math.max(tr.x1, tr.x2) + 26;
      const ty1 = Math.min(tr.y1, tr.y2) - 26;
      const ty2 = Math.max(tr.y1, tr.y2) + 26;
      return tx2 >= minX && tx1 <= maxX && ty2 >= minY && ty1 <= maxY;
    });

    const worldCacheKey = `${world.buildings.length}_${world.roads.length}_${world.sidewalks?.length || 0}_${world.parkings?.length || 0}`;
    if (this.grassSurfaceCacheWorldKey !== worldCacheKey) {
      this.grassSurfaceCache.clear();
      this.grassSurfaceCacheWorldKey = worldCacheKey;
    } else if (this.grassSurfaceCache.size > 260000) {
      this.grassSurfaceCache.clear();
    }

    // Ultra-fast analytical surface classifier with 4x4px spatial memoization
    const classifyGrassSurfaceRaw = (
      px: number,
      py: number
    ): number => {
      // 0: 'none', 1: 'meadow', 2: 'lawn', 3: 'wheat', 4: 'clover', 5: 'sunflower'
      // Industrial concrete apron & southern badlands/salt basin
      if (px >= 5595 && px <= 8005 && py >= -5 && py <= 3305) return 0;
      if (py > 13500) return 0;
      if (px >= 12500 && px <= 42500 && py >= 7000 && py <= 11800) return 0;
      // Gas stations & garage cooperative aprons
      if (px >= 4870 && px <= 5470 && py >= 4870 && py <= 5530) return 0;
      if (px >= 2295 && px <= 2605 && py >= 1845 && py <= 2125) return 0;
      if (px >= 14750 && px <= 15350 && py >= 3650 && py <= 4050) return 0;
      if (px >= 5600 && px <= 6490 && py >= 3260 && py <= 3840) return 0;
      // River channel
      if (py <= -1800 && py >= -4200 && px >= -3500 && px <= 50500) {
        const riv = getRiverWaterAt(px, py);
        if (riv.distToCenter < riv.halfWidth + 16) return 0;
      }

      for (let i = 0; i < visibleBuildings.length; i++) {
        const b = visibleBuildings[i];
        if (px >= b.x - 4 && px <= b.x + b.width + 4 && py >= b.y - 4 && py <= b.y + b.height + 4) {
          return 0;
        }
      }

      for (let i = 0; i < activeParkings.length; i++) {
        const pk = activeParkings[i];
        if (px >= pk.x - 3 && px <= pk.x + pk.width + 3 && py >= pk.y - 3 && py <= pk.y + pk.height + 3) {
          return 0;
        }
      }

      for (let i = 0; i < activeDriveways.length; i++) {
        const dw = activeDriveways[i];
        if (px >= dw.x - 2 && px <= dw.x + dw.width + 2 && py >= dw.y - 2 && py <= dw.y + dw.height + 2) {
          return 0;
        }
      }

      for (let i = 0; i < activeIntersections.length; i++) {
        const inter = activeIntersections[i];
        const hw = inter.width / 2 + 6;
        const hh = inter.height / 2 + 6;
        if (px >= inter.x - hw && px <= inter.x + hw && py >= inter.y - hh && py <= inter.y + hh) {
          return 0;
        }
      }

      let inCourtyardLawn = false;
      for (let i = 0; i < activeSidewalks.length; i++) {
        const sw = activeSidewalks[i];
        if (px >= sw.x - 2 && px <= sw.x + sw.width + 2 && py >= sw.y - 2 && py <= sw.y + sw.height + 2) {
          const swW = sw.sidewalkWidth;
          if (
            px < sw.x + swW + 3 ||
            px > sw.x + sw.width - swW - 3 ||
            py < sw.y + swW + 3 ||
            py > sw.y + sw.height - swW - 3
          ) {
            return 0;
          }
          if (sw.plazas) {
            for (let p = 0; p < sw.plazas.length; p++) {
              const pl = sw.plazas[p];
              if (px >= pl.x - 3 && px <= pl.x + pl.width + 3 && py >= pl.y - 3 && py <= pl.y + pl.height + 3) {
                return 0;
              }
            }
          }
          if (sw.walkways) {
            for (let w = 0; w < sw.walkways.length; w++) {
              const wk = sw.walkways[w];
              if (px >= wk.x - 3 && px <= wk.x + wk.width + 3 && py >= wk.y - 3 && py <= wk.y + wk.height + 3) {
                return 0;
              }
            }
          }
          inCourtyardLawn = true;
        }
      }

      for (let i = 0; i < activeRoads.length; i++) {
        const road = activeRoads[i];
        const isCountry =
          road.y1 > 3500 ||
          road.y2 > 3500 ||
          road.x1 > 5400 ||
          road.x2 > 5400 ||
          road.x1 < 1200 ||
          road.x2 < 1200;
        const halfClear = (road.width || 60) / 2 + (road.isDirt ? 3 : isCountry ? 16 : 5);

        if (road.direction === 'horizontal') {
          const xMin = Math.min(road.x1, road.x2) - 4;
          const xMax = Math.max(road.x1, road.x2) + 4;
          if (px >= xMin && px <= xMax && Math.abs(py - road.y1) <= halfClear) return 0;
        } else if (road.direction === 'vertical') {
          const yMin = Math.min(road.y1, road.y2) - 4;
          const yMax = Math.max(road.y1, road.y2) + 4;
          if (py >= yMin && py <= yMax && Math.abs(px - road.x1) <= halfClear) return 0;
        } else if (road.curvePoints && road.curvePoints.length > 1) {
          const pts = road.curvePoints;
          const rSq = halfClear * halfClear;
          for (let k = 0; k < pts.length - 1; k++) {
            const p1 = pts[k];
            const p2 = pts[k + 1];
            const sdx = p2.x - p1.x;
            const sdy = p2.y - p1.y;
            const lenSq = sdx * sdx + sdy * sdy;
            if (lenSq < 1) continue;
            const u = Math.max(0, Math.min(1, ((px - p1.x) * sdx + (py - p1.y) * sdy) / lenSq));
            const dx = px - (p1.x + u * sdx);
            const dy = py - (p1.y + u * sdy);
            if (dx * dx + dy * dy <= rSq) return 0;
          }
        } else {
          const sdx = road.x2 - road.x1;
          const sdy = road.y2 - road.y1;
          const lenSq = sdx * sdx + sdy * sdy;
          if (lenSq >= 1) {
            const u = Math.max(0, Math.min(1, ((px - road.x1) * sdx + (py - road.y1) * sdy) / lenSq));
            const dx = px - (road.x1 + u * sdx);
            const dy = py - (road.y1 + u * sdy);
            if (dx * dx + dy * dy <= halfClear * halfClear) return 0;
          }
        }
      }

      for (let i = 0; i < activeTracks.length; i++) {
        const tr = activeTracks[i];
        const halfB = (tr.ballastWidth || 38) / 2 + 4;
        const sdx = tr.x2 - tr.x1;
        const sdy = tr.y2 - tr.y1;
        const lenSq = sdx * sdx + sdy * sdy;
        if (lenSq >= 1) {
          const u = Math.max(0, Math.min(1, ((px - tr.x1) * sdx + (py - tr.y1) * sdy) / lenSq));
          const dx = px - (tr.x1 + u * sdx);
          const dy = py - (tr.y1 + u * sdy);
          if (dx * dx + dy * dy <= halfB * halfB) return 0;
        }
      }

      for (let i = 0; i < AGRICULTURAL_FIELDS.length; i++) {
        const f = AGRICULTURAL_FIELDS[i];
        const b = f.bounds;
        if (px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height) {
          if (f.type === 'plowed') return 0;
          if (f.type === 'wheat') return 3;
          if (f.type === 'clover') return 4;
          if (f.type === 'sunflower') return 5;
          return 1;
        }
      }

      if (inCourtyardLawn) return 2;
      if (px >= 4200 && px <= 5000 && py >= 1800 && py <= 2600) return 2;
      if (px >= 4880 && px <= 7860 && py >= 4880 && py <= 7860) return 2;

      return 1;
    };

    const SURFACE_NAMES: ('none' | 'meadow' | 'lawn' | 'wheat' | 'clover' | 'sunflower')[] = [
      'none',
      'meadow',
      'lawn',
      'wheat',
      'clover',
      'sunflower',
    ];

    const classifyGrassSurfaceFast = (
      px: number,
      py: number
    ): 'none' | 'meadow' | 'lawn' | 'wheat' | 'clover' | 'sunflower' => {
      const qx = Math.floor(px) >> 2;
      const qy = Math.floor(py) >> 2;
      const cKey = ((qx & 0xffff) << 16) | (qy & 0xffff);
      let code = this.grassSurfaceCache.get(cKey);
      if (code === undefined) {
        code = classifyGrassSurfaceRaw((qx << 2) + 2, (qy << 2) + 2);
        this.grassSurfaceCache.set(cKey, code);
      }
      return SURFACE_NAMES[code];
    };

    ctx.save();

    // --- PASS 1: Pressed-Grass Tracks (притоптанная колёсами и ногами трава с уложенными стеблями) ---
    const tCell = this.TRAMPLE_CELL_SIZE;
    if (this.trampledCells.size > 0) {
      const minTcx = Math.floor(minX / tCell);
      const maxTcx = Math.floor(maxX / tCell);
      const minTcy = Math.floor(minY / tCell);
      const maxTcy = Math.floor(maxY / tCell);
      const trampledPath = new Path2D();
      const trampledStemsPath = new Path2D();
      let hasVisibleTrample = false;

      for (let tcy = minTcy; tcy <= maxTcy; tcy++) {
        const wy = (tcy + 0.5) * tCell;
        for (let tcx = minTcx; tcx <= maxTcx; tcx++) {
          const cellData = this.trampledCells.get(this.getTrampleKey(tcx, tcy));
          if (!cellData || cellData.crush < 0.16) continue;
          const wx = (tcx + 0.5) * tCell;
          const surf = classifyGrassSurfaceFast(wx, wy);
          if (surf === 'none') continue;

          hasVisibleTrample = true;
          const len = tCell * (cellData.isWheel ? 0.72 : 0.54);
          const wid = tCell * (cellData.isWheel ? 0.44 : 0.36);
          const angle = Math.atan2(cellData.dirY, cellData.dirX);
          trampledPath.moveTo(wx + len * Math.cos(angle), wy + len * Math.sin(angle));
          trampledPath.ellipse(wx, wy, len, wid, angle, 0, Math.PI * 2);

          // Bent flattened grass stems pressed along wheel/foot travel direction
          if ((tcx + tcy) % 2 === 0) {
            const stemLen = 4.5 + cellData.crush * 3.5;
            trampledStemsPath.moveTo(wx - cellData.dirX * 1.5, wy - cellData.dirY * 1.5);
            trampledStemsPath.lineTo(wx + cellData.dirX * stemLen, wy + cellData.dirY * stemLen);
          }
        }
      }

      if (hasVisibleTrample) {
        ctx.fillStyle = isAutumn
          ? 'rgba(138, 114, 48, 0.22)'
          : isWet
            ? 'rgba(54, 118, 64, 0.20)'
            : 'rgba(84, 146, 78, 0.22)';
        ctx.fill(trampledPath);

        ctx.strokeStyle = isAutumn
          ? 'rgba(164, 136, 58, 0.28)'
          : isWet
            ? 'rgba(72, 138, 82, 0.26)'
            : 'rgba(106, 168, 92, 0.28)';
        ctx.lineWidth = 1.1;
        ctx.lineCap = 'round';
        ctx.stroke(trampledStemsPath);
      }
    }

    // --- PASS 2: High-Density Multi-Species Botanical Grass, Foliage & Wildflowers ---
    const viewSpan = Math.max(maxX - minX, maxY - minY);
    const step = viewSpan > 1950 ? 34 : viewSpan > 1250 ? 25 : 19;
    const startX = Math.floor(minX / step) * step;
    const startY = Math.floor(minY / step) * step;

    // Batched Path2D layers for grass & plant species (executed in a single GPU pass at the end)
    const basalShadePath = new Path2D();       // Ground-hugging dark moss/root shadow cushions
    const deepBladePath = new Path2D();        // Tier 1: Deep forest/emerald lower grass blades & fern fronds
    const midBladePath = new Path2D();         // Tier 2: Rich meadow-green main grass blades
    const lushJadeBladePath = new Path2D();    // Tier 2b: Vibrant jade-emerald lawn & clover-meadow blades
    const sunlitTipPath = new Path2D();        // Tier 3: Sunlit chartreuse-lime upper blades & wind-wave crests
    const steppeOliveBladePath = new Path2D(); // Golden-olive fescue, ryegrass & wheat culms
    const silverFloraPath = new Path2D();      // Silvery-sage wormwood (полынь) & silky feather grass (ковыль)
    const cloverLeafPath = new Path2D();       // Three-leaf clover shamrocks & broadleaf plantain rosettes
    const cloverVeinPath = new Path2D();       // Pale chevron markings on clover & fern leaflet highlights
    const spikeletEarPath = new Path2D();      // Plump wheat ears (колосья), timothy spikelets & plantain spikes

    // Batched Path2D layers for 10 wildflower species
    const flowerStemPath = new Path2D();       // Slender swaying green flower stems
    const sunflowerLeafPath = new Path2D();    // Broad serrated sunflower leaves
    const whitePetalPath = new Path2D();       // Oxeye daisy (ромашка) & white clover petals
    const dandelionFluffPath = new Path2D();   // Translucent white dandelion seed clock (пушистый одуванчик)
    const yellowPetalPath = new Path2D();      // Golden dandelion, buttercup (лютик) & sunflower ray petals
    const amberCenterPath = new Path2D();      // Warm golden-amber daisy centers & dandelion hearts
    const blueCornflowerPath = new Path2D();   // Sky-blue / cobalt cornflower & chicory petals (василёк)
    const cyanForgetMeNotPath = new Path2D();  // Delicate azure forget-me-not clusters (незабудка)
    const pinkCloverPath = new Path2D();       // Rose-magenta clover heads (розовый клевер)
    const purpleSpikePath = new Path2D();      // Tall violet-purple fireweed / lupine / vetch spikes (иван-чай / люпин)
    const redPoppyPath = new Path2D();         // Wild scarlet poppy petals (полевой мак)
    const darkEyePath = new Path2D();          // Dark velvet poppy eyes, cornflower centers & sunflower seed discs

    let hasWheatOrSpikelets = false;
    let hasSilverFlora = false;
    let hasCloverOrRosettes = false;
    let hasFlowers = false;
    let hasSunflowers = false;

    // Fast inline helper: adds a curved, tapered botanical grass blade into a Path2D
    const addTaperedBlade = (
      path: Path2D,
      bx: number,
      by: number,
      tx: number,
      ty: number,
      ctrlX: number,
      ctrlY: number,
      baseHalfW: number
    ) => {
      const dx = tx - bx;
      const dy = ty - by;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * baseHalfW;
      const ny = (dx / len) * baseHalfW;
      path.moveTo(bx - nx, by - ny);
      path.quadraticCurveTo(ctrlX - nx * 0.42, ctrlY - ny * 0.42, tx, ty);
      path.quadraticCurveTo(ctrlX + nx * 0.42, ctrlY + ny * 0.42, bx + nx, by + ny);
      path.closePath();
    };

    // Helper: spawns a multi-blade grass tuft at (tx, ty) swaying by (swayX, swayY)
    const spawnGrassTuft = (
      tx: number,
      ty: number,
      seedX: number,
      seedY: number,
      bladeCount: number,
      lenScale: number,
      swayX: number,
      swayY: number,
      waveSin: number,
      isLawn: boolean,
      isSteppe: boolean
    ) => {
      const baseAngle = this.prng(seedX, seedY, 4101) * Math.PI * 2;
      const rBasal = (isLawn ? 2.6 : 3.4) * lenScale;
      basalShadePath.moveTo(tx + rBasal, ty + 0.6);
      basalShadePath.ellipse(tx, ty + 0.6, rBasal, rBasal * 0.72, baseAngle, 0, Math.PI * 2);

      for (let b = 0; b < bladeCount; b++) {
        const bSeed = seedX * 13 + seedY * 7 + b * 31;
        const spread = (b - (bladeCount - 1) * 0.5) * 0.52;
        const naturalDir = baseAngle + spread + (this.prng(bSeed, b, 4102) - 0.5) * 0.32;
        const bladeLen = ((isLawn ? 4.4 : 6.2) + this.prng(bSeed, b, 4103) * (isLawn ? 3.2 : 5.4)) * lenScale;

        const rootX = tx + (this.prng(bSeed, b, 4104) - 0.5) * 2.8;
        const rootY = ty + (this.prng(bSeed, b, 4105) - 0.5) * 2.8;

        const natX = Math.cos(naturalDir) * bladeLen * 0.62;
        const natY = Math.sin(naturalDir) * bladeLen * 0.62;
        const windFactor = 0.65 + (b % 3) * 0.22;

        const tipX = rootX + natX + swayX * windFactor;
        const tipY = rootY + natY + swayY * windFactor;
        const ctrlX = rootX + natX * 0.55 + swayX * (windFactor * 0.35);
        const ctrlY = rootY + natY * 0.55 + swayY * (windFactor * 0.35);
        const halfW = (isLawn ? 0.72 : 0.92) * (0.85 + (b % 2) * 0.25);

        if (isSteppe && b % 2 === 0) {
          addTaperedBlade(steppeOliveBladePath, rootX, rootY, tipX, tipY, ctrlX, ctrlY, halfW);
        } else if (b === 0 || b === 3) {
          addTaperedBlade(deepBladePath, rootX, rootY, tipX, tipY, ctrlX, ctrlY, halfW * 1.08);
        } else if (b === bladeCount - 1 && waveSin > -0.15) {
          addTaperedBlade(sunlitTipPath, rootX, rootY, tipX, tipY, ctrlX, ctrlY, halfW * 0.88);
        } else if (isLawn || b % 2 === 1) {
          addTaperedBlade(lushJadeBladePath, rootX, rootY, tipX, tipY, ctrlX, ctrlY, halfW);
        } else {
          addTaperedBlade(midBladePath, rootX, rootY, tipX, tipY, ctrlX, ctrlY, halfW);
        }
      }
    };

    // Pre-filter vehicles in viewport with bounding box so grass cells far from vehicles skip the loop
    let vehBoxMinX = Infinity;
    let vehBoxMaxX = -Infinity;
    let vehBoxMinY = Infinity;
    let vehBoxMaxY = -Infinity;
    const activeGrassVehicles: { x: number; y: number; maxR: number; maxRSq: number }[] = [];
    for (let vIdx = 0; vIdx < visibleVehicles.length; vIdx++) {
      const v = visibleVehicles[vIdx];
      const maxR = (v.length || 46) * 0.58 + 12;
      if (v.x + maxR < minX || v.x - maxR > maxX || v.y + maxR < minY || v.y - maxR > maxY) continue;
      activeGrassVehicles.push({ x: v.x, y: v.y, maxR, maxRSq: maxR * maxR });
      if (v.x - maxR < vehBoxMinX) vehBoxMinX = v.x - maxR;
      if (v.x + maxR > vehBoxMaxX) vehBoxMaxX = v.x + maxR;
      if (v.y - maxR < vehBoxMinY) vehBoxMinY = v.y - maxR;
      if (v.y + maxR > vehBoxMaxY) vehBoxMaxY = v.y + maxR;
    }
    const hasGrassVehicles = activeGrassVehicles.length > 0;

    for (let gy = startY; gy <= maxY; gy += step) {
      for (let gx = startX; gx <= maxX; gx += step) {
        const jx = (this.prng(gx, gy, 3101) - 0.5) * (step * 0.82);
        const jy = (this.prng(gx, gy, 3119) - 0.5) * (step * 0.82);
        const px = gx + jx;
        const py = gy + jy;

        const surf = classifyGrassSurfaceFast(px, py);
        if (surf === 'none') continue;

        // Trampling check
        const tcx = Math.floor(px / tCell);
        const tcy = Math.floor(py / tCell);
        const trample = this.trampledCells.get(this.getTrampleKey(tcx, tcy));
        const crush = trample ? trample.crush : 0;

        // Mechanical parting around nearby vehicles & player
        let pushX = 0;
        let pushY = 0;
        if (hasGrassVehicles && px >= vehBoxMinX && px <= vehBoxMaxX && py >= vehBoxMinY && py <= vehBoxMaxY) {
          for (let vIdx = 0; vIdx < activeGrassVehicles.length; vIdx++) {
            const v = activeGrassVehicles[vIdx];
            const dx = px - v.x;
            const dy = py - v.y;
            const dSq = dx * dx + dy * dy;
            if (dSq > v.maxRSq) continue;
            const dLen = Math.sqrt(dSq) || 1;
            const pf = Math.max(0, 1.0 - dLen / v.maxR) * 4.8;
            pushX += (dx / dLen) * pf;
            pushY += (dy / dLen) * pf;
          }
        }

        if (player && !player.isInVehicle && !player.isInsideBuilding) {
          const dx = px - player.x;
          const dy = py - player.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < 225 && dSq > 0.1) {
            const d = Math.sqrt(dSq);
            const pf = (1.0 - d / 15) * 3.8;
            pushX += (dx / d) * pf;
            pushY += (dy / d) * pf;
          }
        }

        // Traveling wind wave at (px, py, nowSec)
        const uWind = px * wCos + py * wSin;
        const vWind = -px * wSin + py * wCos;
        const wavePhase =
          uWind * 0.011 -
          nowSec * waveSpeed +
          Math.sin(vWind * 0.008 + px * 0.0025) * 1.5;
        const waveSin = Math.sin(wavePhase);
        const gustWave = 0.52 + 0.48 * waveSin;

        const swayMag = baseWindPower * gustWave * (1.0 - crush * 0.82);
        let swayX = wCos * swayMag * 4.2 + pushX;
        let swayY = wSin * swayMag * 4.2 + pushY;

        if (trample && crush > 0.25) {
          swayX = swayX * (1 - crush) + trample.dirX * crush * 4.5;
          swayY = swayY * (1 - crush) + trample.dirY * crush * 4.5;
        }

        // Regional ecological biome traits (Forest North/West vs Lush Meadow vs Dry Steppe South/East)
        const isForestZone = py < 2800 || (px < 3800 && py < 4600);
        const isSteppeZone = py > 8200 || px > 11000;
        const isLawn = surf === 'lawn';
        const speciesRng = this.prng(gx, gy, 3209);

        // --- A. WHEAT & RYE CROP FIELDS (Густые колосья пшеницы с усиками и полевыми цветами) ---
        if (surf === 'wheat') {
          hasWheatOrSpikelets = true;
          const stalkCount = viewSpan < 1400 ? 4 : 3;
          for (let s = 0; s < stalkCount; s++) {
            const sx = px + (this.prng(gx + s * 11, gy, 3311) - 0.5) * (step * 0.72);
            const sy = py + (this.prng(gx, gy + s * 13, 3312) - 0.5) * (step * 0.72);
            const culmSwayX = swayX * (0.95 + s * 0.12);
            const culmSwayY = swayY * (0.95 + s * 0.12);
            const tipX = sx + culmSwayX * 1.25 + wCos * 3.2;
            const tipY = sy + culmSwayY * 1.25 + wSin * 3.2;
            const ctrlX = sx + culmSwayX * 0.55;
            const ctrlY = sy + culmSwayY * 0.55;

            // Golden wheat stalk
            addTaperedBlade(steppeOliveBladePath, sx, sy, tipX, tipY, ctrlX, ctrlY, 0.85);

            // Plump bearded wheat ear (колосок пшеницы)
            const earAng = Math.atan2(tipY - sy, tipX - sx);
            spikeletEarPath.moveTo(tipX + 2.8 * Math.cos(earAng), tipY + 2.8 * Math.sin(earAng));
            spikeletEarPath.ellipse(tipX, tipY, 3.2, 1.25, earAng, 0, Math.PI * 2);
          }
        } else {
          // --- B. PRIMARY MULTI-BLADE GRASS TUSSOCK AT (px, py) ---
          const mainBlades = isLawn ? 5 : viewSpan < 1350 ? 6 : 4;
          const lenScale = (isLawn ? 0.84 : 1.04) * (1.0 - crush * 0.45) * (0.85 + this.prng(gx, gy, 3407) * 0.35);
          spawnGrassTuft(px, py, gx, gy, mainBlades, lenScale, swayX, swayY, waveSin, isLawn, isSteppeZone);

          // --- C. SATELLITE SUB-TUFTS (Плотное перекрытие дерна — в 3 раза гуще!) ---
          const satCount = viewSpan < 1250 ? 2 : 1;
          for (let s = 0; s < satCount; s++) {
            const satAng = this.prng(gx + s * 19, gy - s * 23, 3501) * Math.PI * 2;
            const satDist = (0.32 + this.prng(gx - s * 17, gy + s * 29, 3502) * 0.26) * step;
            const sx = px + Math.cos(satAng) * satDist;
            const sy = py + Math.sin(satAng) * satDist;
            if (classifyGrassSurfaceFast(sx, sy) === 'none') continue;
            const satBlades = isLawn ? 4 : 4 + (s % 2);
            const satScale = lenScale * (0.78 + (s % 2) * 0.16);
            spawnGrassTuft(
              sx,
              sy,
              gx + s * 37,
              gy + s * 41,
              satBlades,
              satScale,
              swayX * 0.92,
              swayY * 0.92,
              waveSin,
              isLawn,
              isSteppeZone
            );
          }

          // --- D. BOTANICAL PLANT SPECIES DIVERSITY (Разные типы растений среди травы) ---
          if (crush < 0.5) {
            if (surf === 'clover' || (speciesRng < 0.24 && !isSteppeZone)) {
              // TYPE 1: Three-Leaf Clover Trefoil Shamrocks (Клевер ползучий и луговой с шевронами)
              hasCloverOrRosettes = true;
              const clCount = surf === 'clover' ? 2 : 1;
              for (let c = 0; c < clCount; c++) {
                const cx = px + (this.prng(gx + c * 11, gy, 3601) - 0.5) * 8 + swayX * 0.35;
                const cy = py + (this.prng(gx, gy + c * 13, 3602) - 0.5) * 8 + swayY * 0.35;
                const cRot = this.prng(gx + c, gy - c, 3603) * Math.PI * 2;
                const leafR = isLawn ? 1.55 : 1.95;

                for (let l = 0; l < 3; l++) {
                  const lang = cRot + (l * Math.PI * 2) / 3;
                  const lx = cx + Math.cos(lang) * (leafR * 0.95);
                  const ly = cy + Math.sin(lang) * (leafR * 0.95);
                  cloverLeafPath.moveTo(lx + leafR * Math.cos(lang), ly + leafR * Math.sin(lang));
                  cloverLeafPath.ellipse(lx, ly, leafR, leafR * 0.78, lang, 0, Math.PI * 2);

                  // Pale V-chevron mark on leaflet
                  cloverVeinPath.moveTo(lx + leafR * 0.35, ly);
                  cloverVeinPath.arc(lx, ly, leafR * 0.35, 0, Math.PI * 2);
                }
              }
            } else if (speciesRng >= 0.24 && speciesRng < 0.38 && !isLawn) {
              // TYPE 2: Broadleaf Plantain Rosette & Seed Spike (Подорожник большой со стрелками)
              hasCloverOrRosettes = true;
              const rx = px - swayX * 0.15;
              const ry = py - swayY * 0.15;
              const rRot = this.prng(gx, gy, 3611) * Math.PI * 2;
              const leaves = 5;
              for (let l = 0; l < leaves; l++) {
                const lang = rRot + (l * Math.PI * 2) / leaves + (l % 2) * 0.18;
                const lLen = 2.8 + (l % 2) * 0.9;
                const lx = rx + Math.cos(lang) * lLen;
                const ly = ry + Math.sin(lang) * lLen;
                cloverLeafPath.moveTo(lx + lLen * Math.cos(lang), ly + lLen * Math.sin(lang));
                cloverLeafPath.ellipse(lx, ly, lLen, 1.35, lang, 0, Math.PI * 2);
              }
              // Upright plantain seed spike (колосок-стрелка подорожника)
              if (speciesRng < 0.31) {
                hasWheatOrSpikelets = true;
                const spTipX = rx + swayX * 0.85 + wCos * 2.5;
                const spTipY = ry + swayY * 0.85 + wSin * 2.5;
                const spAng = Math.atan2(spTipY - ry, spTipX - rx);
                spikeletEarPath.moveTo(spTipX + 2.2 * Math.cos(spAng), spTipY + 2.2 * Math.sin(spAng));
                spikeletEarPath.ellipse(spTipX, spTipY, 2.4, 0.95, spAng, 0, Math.PI * 2);
              }
            } else if (speciesRng >= 0.38 && speciesRng < 0.56 && !isLawn) {
              // TYPE 3: Tall Timothy Grass Spikelets & Silky Feather Grass Plumes (Тимофеевка, метёлки и ковыль)
              const culmTipX = px + swayX * 1.45 + wCos * 4.2;
              const culmTipY = py + swayY * 1.45 + wSin * 4.2;
              const culmCtrlX = px + swayX * 0.65 + wCos * 1.8;
              const culmCtrlY = py + swayY * 0.65 + wSin * 1.8;

              addTaperedBlade(steppeOliveBladePath, px, py, culmTipX, culmTipY, culmCtrlX, culmCtrlY, 0.75);

              const earAng = Math.atan2(culmTipY - py, culmTipX - px);
              if (isSteppeZone || speciesRng > 0.48) {
                // Silky feather-grass plume (серебристая метёлка ковыля / вейника)
                hasSilverFlora = true;
                for (let f = -1; f <= 1; f++) {
                  const pAng = earAng + f * 0.24;
                  const fTipX = culmTipX + Math.cos(pAng) * 4.6;
                  const fTipY = culmTipY + Math.sin(pAng) * 4.6;
                  addTaperedBlade(
                    silverFloraPath,
                    culmTipX - Math.cos(earAng) * 1.2,
                    culmTipY - Math.sin(earAng) * 1.2,
                    fTipX,
                    fTipY,
                    (culmTipX + fTipX) * 0.5,
                    (culmTipY + fTipY) * 0.5,
                    0.75
                  );
                }
              } else {
                // Cylindrical timothy-grass spikelet (колосок тимофеевки)
                hasWheatOrSpikelets = true;
                spikeletEarPath.moveTo(culmTipX + 2.6 * Math.cos(earAng), culmTipY + 2.6 * Math.sin(earAng));
                spikeletEarPath.ellipse(culmTipX, culmTipY, 2.9, 1.15, earAng, 0, Math.PI * 2);
              }
            } else if (isForestZone && speciesRng >= 0.56 && speciesRng < 0.72) {
              // TYPE 4: Woodland Pinnate Fern Fronds (Лесной папоротник-орляк)
              hasCloverOrRosettes = true;
              const frondCount = 4;
              const baseRot = this.prng(gx, gy, 3701) * Math.PI * 2;
              for (let f = 0; f < frondCount; f++) {
                const fang = baseRot + (f * Math.PI * 2) / frondCount + (f % 2) * 0.25;
                const fLen = 6.5 + (f % 2) * 2.2;
                const fTipX = px + Math.cos(fang) * fLen + swayX * 0.55;
                const fTipY = py + Math.sin(fang) * fLen + swayY * 0.55;
                addTaperedBlade(
                  deepBladePath,
                  px,
                  py,
                  fTipX,
                  fTipY,
                  (px + fTipX) * 0.5,
                  (py + fTipY) * 0.5,
                  1.15
                );
                // Paired fern pinnae leaflets along the frond
                const perpX = -Math.sin(fang) * 1.8;
                const perpY = Math.cos(fang) * 1.8;
                for (let p = 1; p <= 2; p++) {
                  const t = p * 0.34;
                  const mx = px + (fTipX - px) * t;
                  const my = py + (fTipY - py) * t;
                  cloverVeinPath.moveTo(mx + perpX + 0.9, my + perpY);
                  cloverVeinPath.arc(mx + perpX, my + perpY, 0.95, 0, Math.PI * 2);
                  cloverVeinPath.moveTo(mx - perpX + 0.9, my - perpY);
                  cloverVeinPath.arc(mx - perpX, my - perpY, 0.95, 0, Math.PI * 2);
                }
              }
            } else if (isSteppeZone && speciesRng >= 0.56 && speciesRng < 0.74) {
              // TYPE 5: Silvery-Sage Wormwood & Steppe Fescue (Серебристая полынь и типчак)
              hasSilverFlora = true;
              const baseRot = this.prng(gx, gy, 3751) * Math.PI * 2;
              for (let w = 0; w < 4; w++) {
                const wang = baseRot + (w * Math.PI * 2) / 4;
                const wx = px + Math.cos(wang) * 4.8 + swayX * 0.75;
                const wy = py + Math.sin(wang) * 4.8 + swayY * 0.75;
                addTaperedBlade(
                  silverFloraPath,
                  px,
                  py,
                  wx,
                  wy,
                  (px + wx) * 0.5,
                  (py + wy) * 0.5,
                  0.95
                );
              }
            }
          }
        }

        // --- E. BLOOMING WILDFLOWERS & SUNFLOWERS (Цветочки 10 видов полянками и россыпями) ---
        if (crush < 0.42 && !isAutumn && cameraZoom > 0.36) {
          // Continuous spatial noise for natural blooming wildflower glades (цветочные полянки)
          const gladeNoise =
            Math.sin(px * 0.0042 + 0.8) * Math.cos(py * 0.0039 - 0.6) * 0.5 +
            Math.cos(px * 0.0095 - 1.1) * Math.sin(py * 0.0088 + 0.4) * 0.5;
          const gladeBoost = Math.max(0, gladeNoise + 0.25); // 0 .. 1.25

          const flRng = this.prng(gx, gy, 3907);
          const flowerChance =
            surf === 'sunflower'
              ? 0.82
              : surf === 'clover'
                ? 0.48 + gladeBoost * 0.22
                : surf === 'wheat'
                  ? 0.16 + gladeBoost * 0.12
                  : surf === 'lawn'
                    ? 0.18 + gladeBoost * 0.22
                    : 0.28 + gladeBoost * 0.34 + (isSpring ? 0.12 : 0);

          if (flRng < flowerChance) {
            hasFlowers = true;
            // Can spawn 1 or 2 flowers in a rich blooming glade cell
            const bloomsInCluster = surf !== 'sunflower' && gladeBoost > 0.55 && flRng < flowerChance * 0.45 ? 2 : 1;
            const dominantPatchSpecies = Math.floor(
              ((Math.sin(px * 0.0028 + 1.7) * Math.cos(py * 0.0026 - 0.9) + 1) * 0.5) * 9
            );

            for (let bIdx = 0; bIdx < bloomsInCluster; bIdx++) {
              const ox = bIdx === 0 ? 0 : (this.prng(gx + 17, gy + 31, 3911) - 0.5) * 11;
              const oy = bIdx === 0 ? 0 : (this.prng(gx + 29, gy + 43, 3912) - 0.5) * 11;
              const rootX = px + ox;
              const rootY = py + oy;
              const fx = rootX + swayX * (0.82 + bIdx * 0.15);
              const fy = rootY + swayY * (0.82 + bIdx * 0.15);
              const sc = 0.88 + (this.prng(gx + bIdx * 7, gy, 3919) * 0.36);

              // Flower stem
              flowerStemPath.moveTo(rootX, rootY);
              flowerStemPath.lineTo(fx, fy);

              if (surf === 'sunflower') {
                // SPECIES 10: Tall Blooming Sunflower (Подсолнух с резными листьями и семечками)
                hasSunflowers = true;
                for (let l = 0; l < 3; l++) {
                  const lang = l * 2.09 + (gx % 3) * 0.5;
                  const lx = rootX + Math.cos(lang) * 2.8 * sc;
                  const ly = rootY + Math.sin(lang) * 2.8 * sc;
                  sunflowerLeafPath.moveTo(lx + 2.8 * sc, ly);
                  sunflowerLeafPath.ellipse(lx, ly, 3.0 * sc, 2.0 * sc, lang, 0, Math.PI * 2);
                }
                // Crown of golden ray petals
                const rayCount = 8;
                for (let p = 0; p < rayCount; p++) {
                  const pang = (p * Math.PI * 2) / rayCount;
                  const rx = fx + Math.cos(pang) * 2.6 * sc;
                  const ry = fy + Math.sin(pang) * 2.6 * sc;
                  yellowPetalPath.moveTo(rx + 1.6 * sc, ry);
                  yellowPetalPath.ellipse(rx, ry, 1.85 * sc, 0.95 * sc, pang, 0, Math.PI * 2);
                }
                // Inner golden ring & dark seed disc
                amberCenterPath.moveTo(fx + 2.1 * sc, fy);
                amberCenterPath.arc(fx, fy, 2.1 * sc, 0, Math.PI * 2);
                darkEyePath.moveTo(fx + 1.55 * sc, fy);
                darkEyePath.arc(fx, fy, 1.55 * sc, 0, Math.PI * 2);
                continue;
              }

              // Choose wildflower species based on field type, glade patch, and local randomness
              const spPickRng = this.prng(gx + bIdx * 13, gy + bIdx * 19, 3929);
              let flType = dominantPatchSpecies;
              if (surf === 'clover') {
                flType = spPickRng < 0.62 ? 4 : spPickRng < 0.85 ? 0 : 1;
              } else if (surf === 'wheat') {
                flType = spPickRng < 0.55 ? 3 : spPickRng < 0.88 ? 7 : 0; // Cornflowers & Wild Poppies in wheat!
              } else if (surf === 'lawn') {
                flType = spPickRng < 0.42 ? 0 : spPickRng < 0.72 ? 1 : spPickRng < 0.88 ? 2 : 4; // Daisies, Dandelions & Clover on lawns
              } else if (spPickRng < 0.45) {
                flType = Math.floor(spPickRng * 20) % 9;
              }

              switch (flType) {
                case 0: {
                  // 0: Oxeye Daisy / Chamomile (Ромашка луговая — белые лепестки и солнечная серединка)
                  const petals = 6;
                  const pDist = 1.65 * sc;
                  const pR = 0.92 * sc;
                  for (let p = 0; p < petals; p++) {
                    const ang = (p * Math.PI * 2) / petals + (gx % 3) * 0.2;
                    const pxp = fx + Math.cos(ang) * pDist;
                    const pyp = fy + Math.sin(ang) * pDist;
                    whitePetalPath.moveTo(pxp + pR, pyp);
                    whitePetalPath.arc(pxp, pyp, pR, 0, Math.PI * 2);
                  }
                  amberCenterPath.moveTo(fx + 1.05 * sc, fy);
                  amberCenterPath.arc(fx, fy, 1.05 * sc, 0, Math.PI * 2);
                  break;
                }
                case 1: {
                  // 1: Blooming Golden Dandelion (Золотой одуванчик — пышная корона жёлтых лепестков)
                  const rays = 6;
                  const rDist = 1.35 * sc;
                  for (let p = 0; p < rays; p++) {
                    const ang = (p * Math.PI * 2) / rays;
                    const pxp = fx + Math.cos(ang) * rDist;
                    const pyp = fy + Math.sin(ang) * rDist;
                    yellowPetalPath.moveTo(pxp + 1.05 * sc, pyp);
                    yellowPetalPath.arc(pxp, pyp, 1.05 * sc, 0, Math.PI * 2);
                  }
                  amberCenterPath.moveTo(fx + 1.15 * sc, fy);
                  amberCenterPath.arc(fx, fy, 1.15 * sc, 0, Math.PI * 2);
                  break;
                }
                case 2: {
                  // 2: Fluffy White Dandelion Seed Clock (Белый пушистый одуванчик-парашютик)
                  const fluffR = 2.15 * sc;
                  dandelionFluffPath.moveTo(fx + fluffR, fy);
                  dandelionFluffPath.arc(fx, fy, fluffR, 0, Math.PI * 2);
                  for (let p = 0; p < 5; p++) {
                    const ang = (p * Math.PI * 2) / 5 + 0.3;
                    const pxp = fx + Math.cos(ang) * (fluffR * 0.72);
                    const pyp = fy + Math.sin(ang) * (fluffR * 0.72);
                    whitePetalPath.moveTo(pxp + 0.55 * sc, pyp);
                    whitePetalPath.arc(pxp, pyp, 0.55 * sc, 0, Math.PI * 2);
                  }
                  darkEyePath.moveTo(fx + 0.5 * sc, fy);
                  darkEyePath.arc(fx, fy, 0.5 * sc, 0, Math.PI * 2);
                  break;
                }
                case 3: {
                  // 3: Sky-Blue Cornflower / Chicory (Синий полевой василёк и цикорий)
                  const petals = 5;
                  const pDist = 1.55 * sc;
                  for (let p = 0; p < petals; p++) {
                    const ang = (p * Math.PI * 2) / petals + 0.15;
                    const pxp = fx + Math.cos(ang) * pDist;
                    const pyp = fy + Math.sin(ang) * pDist;
                    blueCornflowerPath.moveTo(pxp + 0.95 * sc, pyp);
                    blueCornflowerPath.arc(pxp, pyp, 0.95 * sc, 0, Math.PI * 2);
                  }
                  darkEyePath.moveTo(fx + 0.75 * sc, fy);
                  darkEyePath.arc(fx, fy, 0.75 * sc, 0, Math.PI * 2);
                  break;
                }
                case 4: {
                  // 4: Pink / Red Clover Globular Head (Розовый и красный луговой клевер)
                  pinkCloverPath.moveTo(fx + 1.75 * sc, fy);
                  pinkCloverPath.ellipse(fx, fy, 1.75 * sc, 1.45 * sc, windAngle, 0, Math.PI * 2);
                  whitePetalPath.moveTo(fx - 0.3 * sc + 0.75 * sc, fy - 0.3 * sc);
                  whitePetalPath.arc(fx - 0.3 * sc, fy - 0.3 * sc, 0.75 * sc, 0, Math.PI * 2);
                  break;
                }
                case 5: {
                  // 5: Glossy Golden Buttercup / Tansy (Лютик едкий / Золотистая купальница)
                  for (let p = 0; p < 5; p++) {
                    const ang = (p * Math.PI * 2) / 5;
                    const pxp = fx + Math.cos(ang) * 1.2 * sc;
                    const pyp = fy + Math.sin(ang) * 1.2 * sc;
                    yellowPetalPath.moveTo(pxp + 0.85 * sc, pyp);
                    yellowPetalPath.arc(pxp, pyp, 0.85 * sc, 0, Math.PI * 2);
                  }
                  amberCenterPath.moveTo(fx + 0.65 * sc, fy);
                  amberCenterPath.arc(fx, fy, 0.65 * sc, 0, Math.PI * 2);
                  break;
                }
                case 6: {
                  // 6: Tall Purple Fireweed / Lupine / Vetch Raceme (Иван-чай / Люпин / Мышиный горошек)
                  const spikeDirX = (fx - rootX) * 0.45 + wCos * 2.2;
                  const spikeDirY = (fy - rootY) * 0.45 + wSin * 2.2;
                  for (let k = 0; k < 4; k++) {
                    const t = k / 3;
                    const sxp = fx + spikeDirX * t;
                    const syp = fy + spikeDirY * t;
                    const rFlo = (1.45 - k * 0.24) * sc;
                    if (k === 3) {
                      pinkCloverPath.moveTo(sxp + rFlo, syp);
                      pinkCloverPath.arc(sxp, syp, rFlo, 0, Math.PI * 2);
                    } else {
                      purpleSpikePath.moveTo(sxp + rFlo, syp);
                      purpleSpikePath.arc(sxp, syp, rFlo, 0, Math.PI * 2);
                    }
                  }
                  break;
                }
                case 7: {
                  // 7: Wild Scarlet Poppy (Алый полевой мак с бархатной чёрной серединкой)
                  for (let p = 0; p < 4; p++) {
                    const ang = (p * Math.PI) / 2 + 0.4;
                    const pxp = fx + Math.cos(ang) * 1.3 * sc;
                    const pyp = fy + Math.sin(ang) * 1.3 * sc;
                    redPoppyPath.moveTo(pxp + 1.25 * sc, pyp);
                    redPoppyPath.arc(pxp, pyp, 1.25 * sc, 0, Math.PI * 2);
                  }
                  darkEyePath.moveTo(fx + 0.85 * sc, fy);
                  darkEyePath.arc(fx, fy, 0.85 * sc, 0, Math.PI * 2);
                  break;
                }
                default: {
                  // 8: Forget-Me-Not / Speedwell Cluster (Голубые незабудки и вероника дубравная)
                  for (let c = 0; c < 3; c++) {
                    const cAng = c * 2.1 + 0.5;
                    const cxp = fx + Math.cos(cAng) * 1.35 * sc;
                    const cyp = fy + Math.sin(cAng) * 1.35 * sc;
                    cyanForgetMeNotPath.moveTo(cxp + 0.95 * sc, cyp);
                    cyanForgetMeNotPath.arc(cxp, cyp, 0.95 * sc, 0, Math.PI * 2);
                    amberCenterPath.moveTo(cxp + 0.38 * sc, cyp);
                    amberCenterPath.arc(cxp, cyp, 0.38 * sc, 0, Math.PI * 2);
                  }
                  break;
                }
              }
            }
          }
        }
      }
    }

    // ============================================================================
    // --- 4. EXECUTE BATCHED GPU PATH FILLS (20 calls total for entire screen!) ---
    // ============================================================================

    // 4.1 Ground-hugging basal moss & root shadows
    ctx.fillStyle = isAutumn
      ? 'rgba(46, 36, 14, 0.22)'
      : isWet
        ? 'rgba(8, 28, 14, 0.24)'
        : 'rgba(12, 38, 18, 0.20)';
    ctx.fill(basalShadePath);

    // 4.2 Clover trefoil shamrocks & broadleaf plantain rosettes
    if (hasCloverOrRosettes) {
      ctx.fillStyle = isAutumn
        ? 'rgba(88, 76, 28, 0.36)'
        : isWet
          ? 'rgba(22, 78, 36, 0.38)'
          : 'rgba(32, 98, 44, 0.36)';
      ctx.fill(cloverLeafPath);

      ctx.fillStyle = isAutumn
        ? 'rgba(134, 118, 52, 0.26)'
        : 'rgba(116, 198, 118, 0.28)';
      ctx.fill(cloverVeinPath);
    }

    // 4.3 Tier 1: Deep emerald undergrowth grass blades & woodland fern fronds
    ctx.fillStyle = isAutumn
      ? 'rgba(82, 64, 22, 0.42)'
      : isWet
        ? 'rgba(14, 54, 24, 0.44)'
        : 'rgba(20, 68, 30, 0.42)';
    ctx.fill(deepBladePath);

    // 4.4 Tier 2: Main meadow grass blades
    ctx.fillStyle = isAutumn
      ? 'rgba(124, 96, 34, 0.42)'
      : isWet
        ? 'rgba(26, 88, 40, 0.42)'
        : 'rgba(36, 108, 48, 0.42)';
    ctx.fill(midBladePath);

    // 4.5 Tier 2b: Vibrant jade-emerald blades
    ctx.fillStyle = isAutumn
      ? 'rgba(142, 112, 38, 0.38)'
      : isSpring
        ? 'rgba(54, 142, 56, 0.40)'
        : isWet
          ? 'rgba(34, 104, 48, 0.38)'
          : 'rgba(46, 124, 54, 0.38)';
    ctx.fill(lushJadeBladePath);

    // 4.6 Golden-olive steppe fescue & wheat culms
    ctx.fillStyle = isAutumn
      ? 'rgba(162, 124, 42, 0.44)'
      : 'rgba(124, 146, 56, 0.38)';
    ctx.fill(steppeOliveBladePath);

    // 4.7 Tier 3: Sunlit chartreuse-lime upper tips & wind-wave crests
    ctx.fillStyle = isAutumn
      ? 'rgba(178, 142, 52, 0.38)'
      : isSpring
        ? 'rgba(104, 188, 72, 0.38)'
        : isWet
          ? 'rgba(58, 138, 68, 0.36)'
          : 'rgba(82, 164, 66, 0.38)';
    ctx.fill(sunlitTipPath);

    // 4.8 Silvery-sage wormwood (полынь) & silky feather grass plumes (ковыль)
    if (hasSilverFlora) {
      ctx.fillStyle = isAutumn
        ? 'rgba(188, 174, 128, 0.42)'
        : 'rgba(164, 192, 168, 0.44)';
      ctx.fill(silverFloraPath);
    }

    // 4.9 Plump wheat ears (колосья), timothy spikelets & plantain spikes
    if (hasWheatOrSpikelets) {
      ctx.fillStyle = isAutumn
        ? 'rgba(168, 126, 38, 0.55)'
        : 'rgba(198, 162, 64, 0.52)';
      ctx.fill(spikeletEarPath);
    }

    // 4.10 Batched Multi-Petal Wildflowers & Sunflowers
    if (hasFlowers) {
      ctx.strokeStyle = isWet ? 'rgba(22, 72, 32, 0.52)' : 'rgba(34, 96, 42, 0.52)';
      ctx.lineWidth = 0.95;
      ctx.lineCap = 'round';
      ctx.stroke(flowerStemPath);

      if (hasSunflowers) {
        ctx.fillStyle = '#1f5424';
        ctx.fill(sunflowerLeafPath);
      }

      // Soft translucent dandelion puffball halo
      ctx.fillStyle = 'rgba(241, 245, 249, 0.48)';
      ctx.fill(dandelionFluffPath);

      // White daisy petals & white clover highlights
      ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
      ctx.fill(whitePetalPath);

      // Golden dandelion rays, buttercups & sunflower petals
      ctx.fillStyle = 'rgba(250, 204, 21, 0.90)';
      ctx.fill(yellowPetalPath);

      // Sky-blue cornflower & chicory petals
      ctx.fillStyle = 'rgba(56, 189, 248, 0.88)';
      ctx.fill(blueCornflowerPath);

      // Azure forget-me-not blossoms
      ctx.fillStyle = 'rgba(125, 211, 252, 0.88)';
      ctx.fill(cyanForgetMeNotPath);

      // Rose-magenta clover blossoms
      ctx.fillStyle = 'rgba(236, 72, 153, 0.84)';
      ctx.fill(pinkCloverPath);

      // Violet-purple fireweed / lupine / vetch spikes
      ctx.fillStyle = 'rgba(168, 85, 247, 0.86)';
      ctx.fill(purpleSpikePath);

      // Wild scarlet poppy petals
      ctx.fillStyle = 'rgba(239, 68, 68, 0.90)';
      ctx.fill(redPoppyPath);

      // Warm amber flower centers (daisies, dandelions, buttercups, forget-me-nots)
      ctx.fillStyle = 'rgba(217, 119, 6, 0.94)';
      ctx.fill(amberCenterPath);

      // Dark velvet centers (poppies, cornflowers, sunflower seed discs)
      ctx.fillStyle = 'rgba(24, 16, 12, 0.90)';
      ctx.fill(darkEyePath);
    }

    ctx.restore();
  }
}

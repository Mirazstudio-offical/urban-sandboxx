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
   * Builds a lush, non-pixelated 512x512 interlocking botanical turf pattern:
   * - Macro moss/clover cushions (soft radial gradients)
   * - 900+ overlapping multi-lobed turf rosettes so the ground is a continuous living sod mat
   *   instead of bare soup, with zero 1x1 pixel noise and zero worm-like lines!
   */
  public static getTerrainMicroReliefPattern(
    ctx: CanvasRenderingContext2D,
    isWet: boolean = false,
    season?: string
  ): CanvasPattern | null {
    if (typeof document === 'undefined') return null;
    const key = `smooth_v3_turf_${season || 'summer'}_${isWet ? 'wet' : 'dry'}`;
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

    // 1. Macro soft seamless botanical patches (wrapped across 512x512 edges)
    const patchCount = 36;
    for (let i = 0; i < patchCount; i++) {
      const cx = this.prng(i, 17, 5101) * size;
      const cy = this.prng(i, 31, 5202) * size;
      const radius = 32 + this.prng(i, 47, 5303) * 54;
      const isDarkHollow = i % 2 === 0;

      for (let ox = -size; ox <= size; ox += size) {
        for (let oy = -size; oy <= size; oy += size) {
          const px = cx + ox;
          const py = cy + oy;
          if (px + radius < 0 || px - radius > size || py + radius < 0 || py - radius > size) continue;

          const grad = pctx.createRadialGradient(px, py, radius * 0.1, px, py, radius);
          if (isWinter) {
            if (isDarkHollow) {
              grad.addColorStop(0, 'rgba(100, 116, 139, 0.055)');
              grad.addColorStop(1, 'rgba(100, 116, 139, 0)');
            } else {
              grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
              grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            }
          } else if (isDarkHollow) {
            grad.addColorStop(0, isWet ? 'rgba(6, 16, 8, 0.11)' : 'rgba(8, 26, 12, 0.08)');
            grad.addColorStop(0.6, isWet ? 'rgba(6, 16, 8, 0.04)' : 'rgba(8, 26, 12, 0.03)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          } else {
            const litColor = isAutumn
              ? 'rgba(165, 130, 48, 0.07)'
              : isWet
                ? 'rgba(52, 168, 95, 0.065)'
                : 'rgba(95, 195, 82, 0.07)';
            grad.addColorStop(0, litColor);
            grad.addColorStop(0.6, 'rgba(95, 195, 82, 0.025)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }

          pctx.fillStyle = grad;
          pctx.beginPath();
          pctx.arc(px, py, radius, 0, Math.PI * 2);
          pctx.fill();
        }
      }
    }

    // 2. Dense interlocking multi-lobed turf cushions (сомкнутый дерновый покров без пустот)
    if (!isWinter) {
      const cushionStep = 16;
      for (let gy = 0; gy < size; gy += cushionStep) {
        for (let gx = 0; gx < size; gx += cushionStep) {
          const cx = (gx + (this.prng(gx, gy, 5407) - 0.5) * 12 + size) % size;
          const cy = (gy + (this.prng(gx, gy, 5419) - 0.5) * 12 + size) % size;
          const rBase = 5.5 + this.prng(gx, gy, 5431) * 4.5;
          const rot = this.prng(gx, gy, 5443) * Math.PI;

          for (let ox = -size; ox <= size; ox += size) {
            for (let oy = -size; oy <= size; oy += size) {
              const px = cx + ox;
              const py = cy + oy;
              if (px + rBase * 2 < 0 || px - rBase * 2 > size || py + rBase * 2 < 0 || py - rBase * 2 > size) {
                continue;
              }

              // Soft ambient root hollow under turf cushion
              pctx.fillStyle = isAutumn
                ? 'rgba(32, 22, 8, 0.07)'
                : isWet
                  ? 'rgba(6, 20, 10, 0.09)'
                  : 'rgba(10, 32, 14, 0.075)';
              pctx.beginPath();
              pctx.ellipse(px + 1.0, py + 1.0, rBase * 1.15, rBase * 0.85, rot, 0, Math.PI * 2);
              pctx.fill();

              // Lush turf leaf rosette body
              pctx.fillStyle = isAutumn
                ? 'rgba(142, 112, 38, 0.085)'
                : isWet
                  ? 'rgba(34, 128, 60, 0.085)'
                  : 'rgba(54, 156, 68, 0.085)';
              pctx.beginPath();
              pctx.ellipse(px, py, rBase, rBase * 0.72, rot, 0, Math.PI * 2);
              pctx.ellipse(px, py, rBase * 0.75, rBase * 0.95, rot + 1.05, 0, Math.PI * 2);
              pctx.fill();

              // Sunlit upper turf crown highlight
              pctx.fillStyle = isAutumn
                ? 'rgba(192, 156, 58, 0.065)'
                : isWet
                  ? 'rgba(82, 198, 118, 0.065)'
                  : 'rgba(112, 212, 96, 0.065)';
              pctx.beginPath();
              pctx.arc(px - 0.8, py - 0.8, rBase * 0.48, 0, Math.PI * 2);
              pctx.fill();
            }
          }
        }
      }
    }

    // 3. Soft wet surface sky-reflection sheen patches when ground is wet
    if (isWet && !isWinter) {
      for (let m = 0; m < 18; m++) {
        const mx = this.prng(m, 91, 6101) * (size - 90) + 45;
        const my = this.prng(m, 103, 6202) * (size - 90) + 45;
        const r = 18 + this.prng(m, 117, 6303) * 26;

        const wGrad = pctx.createRadialGradient(mx, my, 2, mx, my, r);
        wGrad.addColorStop(0, 'rgba(165, 215, 248, 0.10)');
        wGrad.addColorStop(0.55, 'rgba(125, 185, 230, 0.045)');
        wGrad.addColorStop(1, 'rgba(125, 185, 230, 0)');
        pctx.fillStyle = wGrad;
        pctx.beginPath();
        pctx.arc(mx, my, r, 0, Math.PI * 2);
        pctx.fill();
      }
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

      // Overlay smooth radial botanical patches (zero pixelation)
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
   * Renders soft organic moss/clover radial cushions on urban courtyard lawns and city parks.
   * Individual swaying grass blades & wildflowers are rendered dynamically per frame by renderDynamicFieldGrass.
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
    const reliefPat = this.getTerrainMicroReliefPattern(ctx, isWet, season);
    if (reliefPat) {
      ctx.fillStyle = reliefPat;
      ctx.fillRect(x, y, w, h);
    }

    // Soft inner curb shadow around the lawn perimeter
    ctx.strokeStyle = 'rgba(8, 22, 12, 0.22)';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.restore();
  }

  // --- 4B. COTTAGE ESTATE SUBURBAN YARDS & GARDENS (Без полосок! Естественный бархатный дерн и клумбы) ---
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

              if (!isWinter) {
                for (let k = 0; k < 6; k++) {
                  const rx = px1 + 40 + this.prng(plotNum, k, 901) * (pw - 80);
                  const ry = py1 + 40 + this.prng(plotNum, k, 902) * (ph - 80);
                  const rad = 24 + this.prng(plotNum, k, 903) * 32;
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
              // Natural, non-striped emerald garden turf base
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

              if (!isWinter) {
                // Soft organic radial clover/moss variations across the yard (zero stripes!)
                for (let k = 0; k < 5; k++) {
                  const rx = px1 + 30 + this.prng(plotNum, k, 921) * (pw - 60);
                  const ry = py1 + 30 + this.prng(plotNum, k, 922) * (ph - 60);
                  const rad = 35 + this.prng(plotNum, k, 923) * 45;
                  const grad = ctx.createRadialGradient(rx, ry, 4, rx, ry, rad);
                  if (k % 2 === 0) {
                    grad.addColorStop(0, isAutumn ? 'rgba(120, 130, 45, 0.14)' : 'rgba(52, 168, 83, 0.14)');
                  } else {
                    grad.addColorStop(0, 'rgba(10, 36, 16, 0.14)');
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
    const isWinter = world.calendar?.season === 'winter';
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
          this.renderCloverAlfalfaField(ctx, field, minX, minY, maxX, maxY);
          break;
        case 'sunflower':
          this.renderSunflowerField(ctx, field, minX, minY, maxX, maxY);
          break;
        case 'pasture':
          this.renderPastureField(ctx, field, minX, minY, maxX, maxY);
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

  // --- PLOWED ARABLE FIELD (Органическая пашня чернозема без резких полос) ---
  private static renderPlowedArableField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    isWet: boolean = false
  ) {
    const b = field.bounds;
    ctx.fillStyle = isWet ? '#170f09' : '#2b1e14';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    // Organic overturned loam patches & damp hollows (no harsh parallel stripes)
    const patchStep = 72;
    const pStartX = Math.max(b.x, Math.floor(minX / patchStep) * patchStep);
    const pEndX = Math.min(b.x + b.width, maxX + patchStep);
    const pStartY = Math.max(b.y, Math.floor(minY / patchStep) * patchStep);
    const pEndY = Math.min(b.y + b.height, maxY + patchStep);

    for (let y = pStartY; y < pEndY; y += patchStep) {
      for (let x = pStartX; x < pEndX; x += patchStep) {
        const h = this.prng(x, y, 7719);
        const cx = x + (this.prng(x, y, 7723) - 0.5) * 40;
        const cy = y + (this.prng(x, y, 7741) - 0.5) * 40;
        const rad = 32 + h * 36;
        const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
        if (h < 0.5) {
          grad.addColorStop(0, isWet ? 'rgba(8, 4, 2, 0.38)' : 'rgba(18, 11, 6, 0.30)');
        } else {
          grad.addColorStop(0, isWet ? 'rgba(68, 48, 32, 0.22)' : 'rgba(92, 68, 46, 0.22)');
        }
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- GOLDEN WHEAT FIELD BASE (Неполосатая основа пшеничного поля; колосья колышутся в реальном времени) ---
  private static renderGoldenWheatField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const b = field.bounds;
    ctx.fillStyle = '#8c6822';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    const patchStep = 80;
    const pStartX = Math.max(b.x, Math.floor(minX / patchStep) * patchStep);
    const pEndX = Math.min(b.x + b.width, maxX + patchStep);
    const pStartY = Math.max(b.y, Math.floor(minY / patchStep) * patchStep);
    const pEndY = Math.min(b.y + b.height, maxY + patchStep);

    for (let y = pStartY; y < pEndY; y += patchStep) {
      for (let x = pStartX; x < pEndX; x += patchStep) {
        const h = this.prng(x, y, 8101);
        const cx = x + (this.prng(x, y, 8117) - 0.5) * 44;
        const cy = y + (this.prng(x, y, 8123) - 0.5) * 44;
        const rad = 38 + h * 42;
        const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
        grad.addColorStop(0, h > 0.45 ? 'rgba(188, 146, 48, 0.28)' : 'rgba(96, 68, 18, 0.25)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- CLOVER & ALFALFA MEADOW BASE (Органический клеверный луг без полос) ---
  private static renderCloverAlfalfaField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const b = field.bounds;
    ctx.fillStyle = '#1b682f';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    const patchStep = 76;
    const pStartX = Math.max(b.x, Math.floor(minX / patchStep) * patchStep);
    const pEndX = Math.min(b.x + b.width, maxX + patchStep);
    const pStartY = Math.max(b.y, Math.floor(minY / patchStep) * patchStep);
    const pEndY = Math.min(b.y + b.height, maxY + patchStep);

    for (let y = pStartY; y < pEndY; y += patchStep) {
      for (let x = pStartX; x < pEndX; x += patchStep) {
        const h = this.prng(x, y, 8311);
        const cx = x + (this.prng(x, y, 8317) - 0.5) * 40;
        const cy = y + (this.prng(x, y, 8329) - 0.5) * 40;
        const rad = 34 + h * 40;
        const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
        grad.addColorStop(0, h > 0.5 ? 'rgba(48, 165, 82, 0.22)' : 'rgba(12, 52, 22, 0.24)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- SUNFLOWER BLOOMING FIELD BASE (Органическое поле подсолнухов без желтых полосок) ---
  private static renderSunflowerField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const b = field.bounds;
    ctx.fillStyle = '#1d4d20';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    const patchStep = 76;
    const pStartX = Math.max(b.x, Math.floor(minX / patchStep) * patchStep);
    const pEndX = Math.min(b.x + b.width, maxX + patchStep);
    const pStartY = Math.max(b.y, Math.floor(minY / patchStep) * patchStep);
    const pEndY = Math.min(b.y + b.height, maxY + patchStep);

    for (let y = pStartY; y < pEndY; y += patchStep) {
      for (let x = pStartX; x < pEndX; x += patchStep) {
        const h = this.prng(x, y, 8501);
        const cx = x + (this.prng(x, y, 8513) - 0.5) * 40;
        const cy = y + (this.prng(x, y, 8527) - 0.5) * 40;
        const rad = 34 + h * 38;
        const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
        grad.addColorStop(0, h > 0.5 ? 'rgba(42, 30, 18, 0.30)' : 'rgba(40, 118, 48, 0.24)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- PASTURE & ROLLING KNOLLS ---
  private static renderPastureField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const b = field.bounds;
    ctx.fillStyle = '#236932';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    const patchSize = 72;
    const pStartX = Math.max(b.x, Math.floor(minX / patchSize) * patchSize);
    const pEndX = Math.min(b.x + b.width, maxX + patchSize);
    const pStartY = Math.max(b.y, Math.floor(minY / patchSize) * patchSize);
    const pEndY = Math.min(b.y + b.height, maxY + patchSize);

    for (let x = pStartX; x < pEndX; x += patchSize) {
      for (let y = pStartY; y < pEndY; y += patchSize) {
        const hash = ((x * 1234567) ^ (y * 7654321)) >>> 0;
        const ox = ((hash & 0xff) / 255 - 0.5) * 32;
        const oy = (((hash >> 8) & 0xff) / 255 - 0.5) * 32;
        const cx = x + patchSize / 2 + ox;
        const cy = y + patchSize / 2 + oy;
        const rad = patchSize * 0.55;
        const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);

        if (hash % 3 === 0) {
          grad.addColorStop(0, 'rgba(135, 165, 65, 0.18)');
        } else {
          grad.addColorStop(0, 'rgba(14, 64, 28, 0.22)');
        }
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
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
    ctx.strokeStyle = 'rgba(22, 48, 18, 0.45)';
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
      shadowGrad.addColorStop(0, 'rgba(6, 18, 9, 0.35)');
      shadowGrad.addColorStop(0.5, 'rgba(10, 24, 14, 0.18)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(rx * 0.15, ry * 0.15, rx * 1.35, ry * 1.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gentle sunlit NW slope (soft warm green-light, not harsh yellow)
      const litGrad = ctx.createRadialGradient(
        -rx * 0.35,
        -ry * 0.35,
        5,
        -rx * 0.2,
        -ry * 0.2,
        rx * 1.15
      );
      litGrad.addColorStop(0, 'rgba(195, 240, 165, 0.22)');
      litGrad.addColorStop(0.45, 'rgba(180, 230, 150, 0.10)');
      litGrad.addColorStop(1, 'rgba(180, 230, 150, 0)');

      ctx.fillStyle = litGrad;
      ctx.beginPath();
      ctx.ellipse(-rx * 0.2, -ry * 0.2, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();

      if (hill.type === 'kurgan') {
        const kurganGrad = ctx.createRadialGradient(-18, -18, 0, -18, -18, 42);
        kurganGrad.addColorStop(0, 'rgba(195, 165, 115, 0.45)');
        kurganGrad.addColorStop(0.5, 'rgba(145, 115, 75, 0.25)');
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
  // --- 8. REAL-TIME DYNAMIC FIELD GRASS CARPET, WIND WAVES & TRAMPLING ---
  // ============================================================================
  /**
   * Renders the continuous, multi-directional grass & crop carpet across visible meadows,
   * cottage yards, courtyard lawns, and agricultural fields:
   * - Coupled directly to world.wind (direction angle, speed, and traveling gust waves)
   * - Parts dynamically around moving vehicles, player, and pedestrians
   * - Persistently flattened/trampled under vehicle wheels and footsteps (притоптанная трава)
   */
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
    if (season === 'winter') return; // Snow blanket covers grass in winter

    const nowSec = performance.now() * 0.001;
    const isAutumn = season === 'autumn';
    const isWet = getEffectiveWeatherWeights(world).isWetSurface;

    // 1. Update persistent physical trampling map from vehicles & pedestrians
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
    // Normalized wind bending magnitude (0.12 in calm breeze up to 1.85 in storm gusts)
    const baseWindPower = Math.min(1.85, Math.max(0.12, (windSpeed / 34) * (0.75 + windGust * 0.35)));
    const waveSpeed = 1.6 + windSpeed * 0.048;

    // 3. Pre-cull non-grass geometry in current viewport for ultra-fast spatial exclusion
    const pad = 45;
    const activeRoads: RoadSegment[] = [];
    const allRoads = world.roads || [];
    for (let i = 0; i < allRoads.length; i++) {
      const r = allRoads[i];
      const m = (r.width || 60) / 2 + 32;
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
        inter.x + inter.width / 2 + 12 >= minX &&
        inter.x - inter.width / 2 - 12 <= maxX &&
        inter.y + inter.height / 2 + 12 >= minY &&
        inter.y - inter.height / 2 - 12 <= maxY
    );

    const activeParkings = (world.parkings || []).filter(
      (pk) => pk.x + pk.width >= minX && pk.x <= maxX && pk.y + pk.height >= minY && pk.y <= maxY
    );

    const activeDriveways = (world.driveways || []).filter(
      (dw) => dw.x + dw.width >= minX && dw.x <= maxX && dw.y + dw.height >= minY && dw.y <= maxY
    );

    const activeTracks = (world.railwayTracks || []).filter((tr) => {
      const tx1 = Math.min(tr.x1, tr.x2) - 30;
      const tx2 = Math.max(tr.x1, tr.x2) + 30;
      const ty1 = Math.min(tr.y1, tr.y2) - 30;
      const ty2 = Math.max(tr.y1, tr.y2) + 30;
      return tx2 >= minX && tx1 <= maxX && ty2 >= minY && ty1 <= maxY;
    });

    // Helper: fast check if (px, py) is on paved/excluded surface or returns grass type
    const classifyGrassSurface = (
      px: number,
      py: number
    ): 'none' | 'meadow' | 'lawn' | 'wheat' | 'clover' | 'sunflower' => {
      // Industrial concrete apron
      if (px >= 5595 && px <= 8005 && py >= -5 && py <= 3305) return 'none';
      // SE Cottage Gas Station, City Gas Station, Highway Gas Station, Garage Coop apron
      if (px >= 4870 && px <= 5470 && py >= 4870 && py <= 5530) return 'none';
      if (px >= 2295 && px <= 2605 && py >= 1845 && py <= 2125) return 'none';
      if (px >= 14750 && px <= 15350 && py >= 3650 && py <= 4050) return 'none';
      if (px >= 5600 && px <= 6490 && py >= 3260 && py <= 3840) return 'none';
      // Salt Lake water pools
      if (py >= 7295 && py <= 8205 && ((px >= 16995 && px <= 23005) || (px >= 26995 && px <= 35005))) {
        return 'none';
      }
      // River water channel & immediate wet sand bar
      if (py <= -1800 && py >= -4200 && px >= -3500 && px <= 50500) {
        const riv = getRiverWaterAt(px, py);
        if (riv.distToCenter < riv.halfWidth + 16) return 'none';
      }

      // Buildings
      for (let i = 0; i < visibleBuildings.length; i++) {
        const b = visibleBuildings[i];
        if (px >= b.x - 4 && px <= b.x + b.width + 4 && py >= b.y - 4 && py <= b.y + b.height + 4) {
          return 'none';
        }
      }

      // Parkings
      for (let i = 0; i < activeParkings.length; i++) {
        const pk = activeParkings[i];
        if (px >= pk.x - 3 && px <= pk.x + pk.width + 3 && py >= pk.y - 3 && py <= pk.y + pk.height + 3) {
          return 'none';
        }
      }

      // Driveways
      for (let i = 0; i < activeDriveways.length; i++) {
        const dw = activeDriveways[i];
        if (px >= dw.x - 2 && px <= dw.x + dw.width + 2 && py >= dw.y - 2 && py <= dw.y + dw.height + 2) {
          return 'none';
        }
      }

      // Intersections
      for (let i = 0; i < activeIntersections.length; i++) {
        const inter = activeIntersections[i];
        const hw = inter.width / 2 + 6;
        const hh = inter.height / 2 + 6;
        if (px >= inter.x - hw && px <= inter.x + hw && py >= inter.y - hh && py <= inter.y + hh) {
          return 'none';
        }
      }

      // Sidewalks (exclude concrete walkway, plazas & walkways; KEEP inner courtyard lawns!)
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
            return 'none';
          }
          if (sw.plazas) {
            for (let p = 0; p < sw.plazas.length; p++) {
              const pl = sw.plazas[p];
              if (px >= pl.x - 3 && px <= pl.x + pl.width + 3 && py >= pl.y - 3 && py <= pl.y + pl.height + 3) {
                return 'none';
              }
            }
          }
          if (sw.walkways) {
            for (let w = 0; w < sw.walkways.length; w++) {
              const wk = sw.walkways[w];
              if (px >= wk.x - 3 && px <= wk.x + wk.width + 3 && py >= wk.y - 3 && py <= wk.y + wk.height + 3) {
                return 'none';
              }
            }
          }
          inCourtyardLawn = true;
        }
      }

      // Roads (horizontal, vertical, diagonal, curved)
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
          if (px >= xMin && px <= xMax && Math.abs(py - road.y1) <= halfClear) return 'none';
        } else if (road.direction === 'vertical') {
          const yMin = Math.min(road.y1, road.y2) - 4;
          const yMax = Math.max(road.y1, road.y2) + 4;
          if (py >= yMin && py <= yMax && Math.abs(px - road.x1) <= halfClear) return 'none';
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
            if (dx * dx + dy * dy <= rSq) return 'none';
          }
        } else {
          const sdx = road.x2 - road.x1;
          const sdy = road.y2 - road.y1;
          const lenSq = sdx * sdx + sdy * sdy;
          if (lenSq >= 1) {
            const u = Math.max(0, Math.min(1, ((px - road.x1) * sdx + (py - road.y1) * sdy) / lenSq));
            const dx = px - (road.x1 + u * sdx);
            const dy = py - (road.y1 + u * sdy);
            if (dx * dx + dy * dy <= halfClear * halfClear) return 'none';
          }
        }
      }

      // Railway tracks ballast
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
          if (dx * dx + dy * dy <= halfB * halfB) return 'none';
        }
      }

      // Agricultural fields
      for (let i = 0; i < AGRICULTURAL_FIELDS.length; i++) {
        const f = AGRICULTURAL_FIELDS[i];
        const b = f.bounds;
        if (px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height) {
          if (f.type === 'plowed') return 'none';
          if (f.type === 'wheat') return 'wheat';
          if (f.type === 'clover') return 'clover';
          if (f.type === 'sunflower') return 'sunflower';
          return 'meadow';
        }
      }

      if (inCourtyardLawn) return 'lawn';
      // Downtown park
      if (px >= 4200 && px <= 5000 && py >= 1800 && py <= 2600) return 'lawn';
      // Cottage settlement yards
      if (px >= 4880 && px <= 7860 && py >= 4880 && py <= 7860) return 'lawn';

      const sample = getBiomeSampleAt(px, py);
      if (
        sample.industrialWeight > 0.45 ||
        sample.clayWeight > 0.78 ||
        sample.saltWeight > 0.65
      ) {
        return 'none';
      }

      return sample.urbanWeight > 0.35 ? 'lawn' : 'meadow';
    };

    // 4. High-density cluster spacing so foliage crowns overlap into a continuous lush meadow
    const viewSpan = Math.max(maxX - minX, maxY - minY);
    const step = viewSpan > 1900 ? 18 : viewSpan > 1200 ? 13 : 10;
    const startX = Math.floor(minX / step) * step;
    const startY = Math.floor(minY / step) * step;
    const tCell = this.TRAMPLE_CELL_SIZE;

    ctx.save();

    // Batched polygonal foliage paths (1 GPU fill call per botanical layer — zero worm-like stroke tubes!)
    const turfCushionPath = new Path2D();
    const deepFoliagePath = new Path2D();
    const midCanopyPath = new Path2D();
    const sunlitCrestPath = new Path2D();
    const trampledFoliagePath = new Path2D();
    const wheatStalkPath = new Path2D();
    const wheatEarPath = new Path2D();
    let hasWheat = false;
    let hasTrampled = false;

    // Helper: appends a sharply tapered, curved lanceolate grass leaf (wide at base -> 0px sharp point at tip)
    const addTaperedLeaf = (
      path: Path2D,
      rx: number,
      ry: number,
      midX: number,
      midY: number,
      tipX: number,
      tipY: number,
      halfWidth: number
    ) => {
      const dx = tipX - rx;
      const dy = tipY - ry;
      const len = Math.hypot(dx, dy);
      if (len < 0.4) return;
      const nx = (-dy / len) * halfWidth;
      const ny = (dx / len) * halfWidth;

      path.moveTo(rx - nx, ry - ny);
      path.lineTo(midX - nx * 0.48, midY - ny * 0.48);
      path.lineTo(tipX, tipY);
      path.lineTo(midX + nx * 0.48, midY + ny * 0.48);
      path.lineTo(rx + nx, ry + ny);
      path.closePath();
    };

    const flowers: {
      x: number;
      y: number;
      tipX: number;
      tipY: number;
      type: number;
      scale: number;
    }[] = [];

    for (let gy = startY; gy <= maxY; gy += step) {
      for (let gx = startX; gx <= maxX; gx += step) {
        // Organic non-grid root jitter
        const jx = (this.prng(gx, gy, 3101) - 0.5) * (step * 0.82);
        const jy = (this.prng(gx, gy, 3119) - 0.5) * (step * 0.82);
        const px = gx + jx;
        const py = gy + jy;

        const surf = classifyGrassSurface(px, py);
        if (surf === 'none') continue;

        // Sample persistent wheel/foot trampling state at this crown
        const tcx = Math.floor(px / tCell);
        const tcy = Math.floor(py / tCell);
        const trample = this.trampledCells.get(this.getTrampleKey(tcx, tcy));
        const crush = trample ? trample.crush : 0;
        const crushDirX = trample ? trample.dirX : wCos;
        const crushDirY = trample ? trample.dirY : wSin;

        // Live mechanical parting around nearby vehicle wheels/bumpers & walking legs (without crushing shadow!)
        let pushX = 0;
        let pushY = 0;
        for (let vIdx = 0; vIdx < visibleVehicles.length; vIdx++) {
          const v = visibleVehicles[vIdx];
          const dx = px - v.x;
          const dy = py - v.y;
          const maxR = (v.length || 46) * 0.58 + 10;
          if (dx * dx + dy * dy > maxR * maxR) continue;

          const cosA = Math.cos(-v.angle);
          const sinA = Math.sin(-v.angle);
          const lx = dx * cosA - dy * sinA;
          const ly = dx * sinA + dy * cosA;
          const halfL = (v.length || 44) * 0.5 + 5;
          const halfW = (v.width || 20) * 0.5 + 5;

          if (Math.abs(lx) < halfL && Math.abs(ly) < halfW) {
            const distNorm = Math.max(Math.abs(lx) / halfL, Math.abs(ly) / halfW);
            const pushFactor = Math.max(0, 1.0 - distNorm);
            const dLen = Math.hypot(dx, dy) || 1;
            pushX += (dx / dLen) * pushFactor * 4.5 + (v.vx || 0) * 0.03 * pushFactor;
            pushY += (dy / dLen) * pushFactor * 4.5 + (v.vy || 0) * 0.03 * pushFactor;
          }
        }

        if (player && !player.isInVehicle && !player.isInsideBuilding) {
          const dx = px - player.x;
          const dy = py - player.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < 144 && dSq > 0.1) {
            const d = Math.sqrt(dSq);
            const pf = (1.0 - d / 12) * 3.8;
            pushX += (dx / d) * pf;
            pushY += (dy / d) * pf;
          }
        }

        // Compute coherent traveling wind wave at (px, py, nowSec)
        const uWind = px * wCos + py * wSin;
        const vWind = -px * wSin + py * wCos;
        const wavePhase =
          uWind * 0.013 -
          nowSec * waveSpeed +
          Math.sin(vWind * 0.009 + px * 0.003) * 1.6;
        const waveSin = Math.sin(wavePhase);
        const gustWave = 0.58 + 0.42 * waveSin;
        const flutter = Math.sin(nowSec * 3.8 + gx * 0.06 + gy * 0.05) * 0.18;

        // Effective wind displacement vector at this crown
        const localWindMag = baseWindPower * gustWave * (1.0 - crush * 0.85);
        const windDx = (wCos * localWindMag - wSin * flutter * baseWindPower) * 4.4 + pushX;
        const windDy = (wSin * localWindMag + wCos * flutter * baseWindPower) * 4.4 + pushY;

        // Interlocking soft foliage cushion at the base of the crown so turf has zero bare gaps
        if (surf !== 'wheat' && crush < 0.35) {
          const cRad = step * (surf === 'lawn' ? 0.38 : 0.46);
          turfCushionPath.moveTo(px + cRad, py);
          turfCushionPath.arc(px, py, cRad, 0, Math.PI * 2);
        }

        // Smooth spatial curl angle so neighboring crowns nestle naturally together while spanning 360°
        const swirlAngle =
          Math.sin(px * 0.018 + 0.7) * Math.cos(py * 0.016 - 0.4) * Math.PI +
          this.prng(gx, gy, 3251) * Math.PI * 2;

        // 5 overlapping tapered leaf blades radiating from each crown
        const bladeCount = surf === 'lawn' ? 4 : 5;
        const baseLen =
          surf === 'wheat'
            ? 7.2
            : surf === 'lawn'
              ? 4.8
              : 5.8 + this.prng(gx, gy, 3203) * 2.6;
        const baseHalfW = surf === 'lawn' ? 1.15 : 1.42;

        for (let b = 0; b < bladeCount; b++) {
          // Distribute blades around the 360° crown with natural organic jitter
          const fanOffset = (b / bladeCount) * Math.PI * 2 + (this.prng(gx, gy, 3301 + b * 173) - 0.5) * 0.55;
          const naturalAngle = swirlAngle + fanOffset;
          const natCos = Math.cos(naturalAngle);
          const natSin = Math.sin(naturalAngle);
          const bLen = baseLen * (0.84 + this.prng(gx, gy, 3407 + b * 97) * 0.34);

          // Tightly clustered root crown so blades form a lush rosette
          const rx = px + natCos * (step * 0.14);
          const ry = py + natSin * (step * 0.14);

          if (crush > 0.16) {
            // Progressively flattened leaf blade along exact wheel/foot path (no dark shadow blob!)
            hasTrampled = true;
            const splay = (b - (bladeCount - 1) * 0.5) * 0.22 * (1.0 - crush * 0.45);
            const tDirX = crushDirX * Math.cos(splay) - crushDirY * Math.sin(splay);
            const tDirY = crushDirX * Math.sin(splay) + crushDirY * Math.cos(splay);

            const blendDirX = natCos * (1 - crush) + tDirX * crush;
            const blendDirY = natSin * (1 - crush) + tDirY * crush;
            const dNorm = Math.hypot(blendDirX, blendDirY) || 1;
            const ux = blendDirX / dNorm;
            const uy = blendDirY / dNorm;

            const flatLen = bLen * (0.85 + crush * 0.25);
            const midX = rx + ux * (flatLen * 0.5);
            const midY = ry + uy * (flatLen * 0.5);
            const tipX = rx + ux * flatLen;
            const tipY = ry + uy * flatLen;

            addTaperedLeaf(trampledFoliagePath, rx, ry, midX, midY, tipX, tipY, baseHalfW * 1.12);
            continue;
          }

          // Upright / wind-swaying tapered leaf blade:
          // Base radiates in 360°; upper leaf arches into the traveling wind wave
          const midX = rx + natCos * (bLen * 0.46) + windDx * 0.34;
          const midY = ry + natSin * (bLen * 0.46) + windDy * 0.34;
          const tipX = rx + natCos * (bLen * 0.78) + windDx;
          const tipY = ry + natSin * (bLen * 0.78) + windDy;

          if (surf === 'wheat') {
            hasWheat = true;
            addTaperedLeaf(wheatStalkPath, rx, ry, midX, midY, tipX, tipY, 1.25);
            // Plump golden wheat ear at the upper half of the stalk
            const earBaseX = rx + (midX - rx) * 0.85;
            const earBaseY = ry + (midY - ry) * 0.85;
            addTaperedLeaf(wheatEarPath, earBaseX, earBaseY, midX, midY, tipX, tipY, 1.75);
          } else {
            if (b < 2) {
              addTaperedLeaf(deepFoliagePath, rx, ry, midX, midY, tipX, tipY, baseHalfW * 1.15);
            } else if (b < bladeCount - 1) {
              addTaperedLeaf(midCanopyPath, rx, ry, midX, midY, tipX, tipY, baseHalfW);
            } else {
              // Sunlit upper leaf tip (accentuated on wind wave crests for a living wind sheen across the field)
              const crestScale = waveSin > 0.15 ? 1.18 : 0.92;
              addTaperedLeaf(
                sunlitCrestPath,
                rx + natCos * 0.8,
                ry + natSin * 0.8,
                midX,
                midY,
                tipX * crestScale + rx * (1 - crestScale),
                tipY * crestScale + ry * (1 - crestScale),
                baseHalfW * 0.88
              );
            }
          }
        }

        // Swaying Wildflowers, Clover Blossoms & Sunflowers (untrampled or lightly brushed)
        if (crush < 0.40 && !isAutumn) {
          const flRng = this.prng(gx, gy, 3907);
          if (surf === 'sunflower' && flRng < 0.55) {
            flowers.push({
              x: px,
              y: py,
              tipX: px + windDx * 0.55,
              tipY: py + windDy * 0.55,
              type: 10, // 3D Sunflower head
              scale: 0.85 + flRng * 0.35,
            });
          } else if (surf === 'clover' && flRng < 0.22) {
            flowers.push({
              x: px,
              y: py,
              tipX: px + windDx * 0.65,
              tipY: py + windDy * 0.65,
              type: flRng < 0.14 ? 3 : 0, // Pink or white clover
              scale: 1.0,
            });
          } else if (surf === 'wheat' && flRng < 0.05) {
            flowers.push({
              x: px,
              y: py,
              tipX: px + windDx * 0.75,
              tipY: py + windDy * 0.75,
              type: flRng < 0.032 ? 2 : 4, // Cornflower blue or field poppy red
              scale: 1.0,
            });
          } else if ((surf === 'meadow' || surf === 'lawn') && flRng < (surf === 'lawn' ? 0.045 : 0.085)) {
            const flType = Math.floor(this.prng(gx, gy, 3929) * 4);
            flowers.push({
              x: px,
              y: py,
              tipX: px + windDx * 0.70,
              tipY: py + windDy * 0.70,
              type: flType,
              scale: 0.88 + (flRng * 4) % 0.28,
            });
          }
        }
      }
    }

    // 5. Execute GPU-batched polygon fill passes (zero stroke worms, zero dark trample shadows!)
    // Layer 0: Interlocking soft turf crown cushions
    ctx.fillStyle = isAutumn
      ? 'rgba(112, 88, 30, 0.26)'
      : isWet
        ? 'rgba(18, 78, 36, 0.28)'
        : 'rgba(28, 102, 42, 0.26)';
    ctx.fill(turfCushionPath);

    // Layer 1: Deep shaded lower rosette leaves
    ctx.fillStyle = isAutumn
      ? 'rgba(96, 76, 26, 0.68)'
      : isWet
        ? 'rgba(14, 64, 28, 0.72)'
        : 'rgba(22, 86, 36, 0.68)';
    ctx.fill(deepFoliagePath);

    // Layer 2: Flattened / trampled grass leaves in wheel tracks & footpaths (matte pressed-leaf tone, no dark shadow!)
    if (hasTrampled) {
      ctx.fillStyle = isAutumn
        ? 'rgba(154, 128, 52, 0.74)'
        : isWet
          ? 'rgba(42, 124, 60, 0.74)'
          : 'rgba(64, 148, 68, 0.74)';
      ctx.fill(trampledFoliagePath);
    }

    // Layer 3: Main dense multi-directional meadow foliage canopy
    ctx.fillStyle = isAutumn
      ? 'rgba(148, 120, 42, 0.76)'
      : isWet
        ? 'rgba(28, 118, 54, 0.78)'
        : 'rgba(42, 142, 58, 0.76)';
    ctx.fill(midCanopyPath);

    // Layer 4: Sunlit wind-swept upper leaf tips & wind-wave crests
    ctx.fillStyle = isAutumn
      ? 'rgba(198, 166, 68, 0.72)'
      : isWet
        ? 'rgba(68, 188, 106, 0.68)'
        : 'rgba(92, 198, 86, 0.72)';
    ctx.fill(sunlitCrestPath);

    // Layer 5: Golden Wheat Stalks & Ears (if wheat field visible)
    if (hasWheat) {
      ctx.fillStyle = isAutumn ? 'rgba(124, 88, 24, 0.80)' : 'rgba(152, 110, 30, 0.80)';
      ctx.fill(wheatStalkPath);

      ctx.fillStyle = '#facc15';
      ctx.fill(wheatEarPath);
    }

    // Layer 6: Swaying Wildflowers & Sunflowers
    if (flowers.length > 0 && cameraZoom > 0.55) {
      for (let i = 0; i < flowers.length; i++) {
        const fl = flowers[i];
        const fx = fl.tipX;
        const fy = fl.tipY;

        if (fl.type === 10) {
          // 3D Swaying Sunflower plant
          const sc = fl.scale;
          ctx.fillStyle = 'rgba(8, 16, 8, 0.42)';
          ctx.beginPath();
          ctx.arc(fl.x + 1.6, fl.y + 1.6, 4.4 * sc, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#1f6321';
          ctx.beginPath();
          ctx.arc(fl.x, fl.y, 4.1 * sc, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(fx, fy, 3.5 * sc, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#3b1d0a';
          ctx.beginPath();
          ctx.arc(fx + 0.2, fy + 0.2, 1.7 * sc, 0, Math.PI * 2);
          ctx.fill();
        } else if (fl.type === 0) {
          // White Chamomile / Daisy with golden center
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(fx, fy, 1.5 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(fx, fy, 0.65 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
        } else if (fl.type === 1) {
          // Golden Dandelion / Buttercup
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(fx, fy, 1.4 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
        } else if (fl.type === 2) {
          // Sky-Blue Cornflower / Chicory
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(fx, fy, 1.35 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
        } else if (fl.type === 3) {
          // Pink Clover Blossom
          ctx.fillStyle = '#f472b6';
          ctx.beginPath();
          ctx.arc(fx, fy, 1.35 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
        } else if (fl.type === 4) {
          // Red Field Poppy
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(fx, fy, 1.45 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }
}

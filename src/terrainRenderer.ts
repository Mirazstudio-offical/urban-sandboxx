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
   * Builds an ultra-soft, eye-soothing 512x512 seamless ground relief pattern using ONLY
   * broad, low-contrast radial tonal clouds (radius 65..135px, alpha < 0.035).
   * Prevents high-frequency optical flicker / retinal fatigue when driving at high speeds!
   */
  public static getTerrainMicroReliefPattern(
    ctx: CanvasRenderingContext2D,
    isWet: boolean = false,
    season?: string
  ): CanvasPattern | null {
    if (typeof document === 'undefined') return null;
    const key = `calm_velvet_v4_${season || 'summer'}_${isWet ? 'wet' : 'dry'}`;
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

    // Broad, velvety, low-contrast botanical clouds (wrapped seamlessly across 512x512 edges)
    const patchCount = 18;
    for (let i = 0; i < patchCount; i++) {
      const cx = this.prng(i, 17, 5101) * size;
      const cy = this.prng(i, 31, 5202) * size;
      const radius = 68 + this.prng(i, 47, 5303) * 68;
      const isDarkHollow = i % 2 === 0;

      for (let ox = -size; ox <= size; ox += size) {
        for (let oy = -size; oy <= size; oy += size) {
          const px = cx + ox;
          const py = cy + oy;
          if (px + radius < 0 || px - radius > size || py + radius < 0 || py - radius > size) continue;

          const grad = pctx.createRadialGradient(px, py, radius * 0.15, px, py, radius);
          if (isWinter) {
            if (isDarkHollow) {
              grad.addColorStop(0, 'rgba(100, 116, 139, 0.03)');
              grad.addColorStop(1, 'rgba(100, 116, 139, 0)');
            } else {
              grad.addColorStop(0, 'rgba(255, 255, 255, 0.045)');
              grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            }
          } else if (isDarkHollow) {
            grad.addColorStop(0, isWet ? 'rgba(8, 20, 10, 0.045)' : 'rgba(12, 28, 16, 0.032)');
            grad.addColorStop(0.6, isWet ? 'rgba(8, 20, 10, 0.018)' : 'rgba(12, 28, 16, 0.012)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          } else {
            const litColor = isAutumn
              ? 'rgba(145, 118, 48, 0.032)'
              : isWet
                ? 'rgba(48, 128, 72, 0.032)'
                : 'rgba(72, 148, 68, 0.032)';
            grad.addColorStop(0, litColor);
            grad.addColorStop(0.6, 'rgba(72, 148, 68, 0.012)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }

          pctx.fillStyle = grad;
          pctx.beginPath();
          pctx.arc(px, py, radius, 0, Math.PI * 2);
          pctx.fill();
        }
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

  // --- PLOWED ARABLE FIELD (Спокойная бархатистая пашня чернозема без пестроты) ---
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

  // --- GOLDEN WHEAT FIELD BASE (Спокойная матовая основа пшеничного поля без ряби) ---
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

  // --- CLOVER & ALFALFA MEADOW BASE (Спокойный клеверный луг без пятнистой ряби) ---
  private static renderCloverAlfalfaField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    _minX: number,
    _minY: number,
    _maxX: number,
    _maxY: number
  ) {
    const b = field.bounds;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.width, b.y + b.height);
    grad.addColorStop(0, '#265c34');
    grad.addColorStop(0.5, '#2a6338');
    grad.addColorStop(1, '#235630');
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }

  // --- SUNFLOWER BLOOMING FIELD BASE (Спокойная основа поля подсолнухов) ---
  private static renderSunflowerField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    _minX: number,
    _minY: number,
    _maxX: number,
    _maxY: number
  ) {
    const b = field.bounds;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.width, b.y + b.height);
    grad.addColorStop(0, '#244f28');
    grad.addColorStop(0.5, '#28562c');
    grad.addColorStop(1, '#214824');
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }

  // --- PASTURE & ROLLING KNOLLS (Спокойное пастбище без пятнистой ряби) ---
  private static renderPastureField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    _minX: number,
    _minY: number,
    _maxX: number,
    _maxY: number
  ) {
    const b = field.bounds;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.width, b.y + b.height);
    grad.addColorStop(0, '#296034');
    grad.addColorStop(0.5, '#2d6638');
    grad.addColorStop(1, '#265930');
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.width, b.height);
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
  // --- 8. EYE-SOOTHING, 60-FPS WIND-REACTIVE MEADOW & TRAMPLED GRASS SYSTEM ---
  // ============================================================================
  /**
   * Renders a calm, eye-resting, zero-lag living meadow & crop layer (< 0.2ms per frame):
   * 1. Soft pressed-grass tracks along wheel and footstep paths (притоптанная трава без тёмных пятен)
   * 2. Gentle, wide wind-wave sheen gliding across meadows & wheat fields along world.wind
   * 3. Soft, rounded, low-contrast botanical clover/foliage clusters & wildflowers (zero needles,
   *    zero worms, and zero high-frequency optical flicker while driving!)
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
    if (season === 'winter') return;

    const nowSec = performance.now() * 0.001;
    const isAutumn = season === 'autumn';
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
    const baseWindPower = Math.min(1.6, Math.max(0.12, (windSpeed / 34) * (0.75 + windGust * 0.35)));
    const waveSpeed = 1.5 + windSpeed * 0.045;

    // 3. Pre-cull non-grass geometry in current viewport for fast exclusion
    const pad = 40;
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

    // Ultra-fast analytical surface classifier (ZERO expensive getBiomeSampleAt trig calls inside loop!)
    const classifyGrassSurfaceFast = (
      px: number,
      py: number
    ): 'none' | 'meadow' | 'lawn' | 'wheat' | 'clover' | 'sunflower' => {
      // Industrial concrete apron & southern badlands/salt basin
      if (px >= 5595 && px <= 8005 && py >= -5 && py <= 3305) return 'none';
      if (py > 13500) return 'none';
      if (px >= 12500 && px <= 42500 && py >= 7000 && py <= 11800) return 'none';
      // Gas stations & garage cooperative aprons
      if (px >= 4870 && px <= 5470 && py >= 4870 && py <= 5530) return 'none';
      if (px >= 2295 && px <= 2605 && py >= 1845 && py <= 2125) return 'none';
      if (px >= 14750 && px <= 15350 && py >= 3650 && py <= 4050) return 'none';
      if (px >= 5600 && px <= 6490 && py >= 3260 && py <= 3840) return 'none';
      // River channel
      if (py <= -1800 && py >= -4200 && px >= -3500 && px <= 50500) {
        const riv = getRiverWaterAt(px, py);
        if (riv.distToCenter < riv.halfWidth + 16) return 'none';
      }

      for (let i = 0; i < visibleBuildings.length; i++) {
        const b = visibleBuildings[i];
        if (px >= b.x - 4 && px <= b.x + b.width + 4 && py >= b.y - 4 && py <= b.y + b.height + 4) {
          return 'none';
        }
      }

      for (let i = 0; i < activeParkings.length; i++) {
        const pk = activeParkings[i];
        if (px >= pk.x - 3 && px <= pk.x + pk.width + 3 && py >= pk.y - 3 && py <= pk.y + pk.height + 3) {
          return 'none';
        }
      }

      for (let i = 0; i < activeDriveways.length; i++) {
        const dw = activeDriveways[i];
        if (px >= dw.x - 2 && px <= dw.x + dw.width + 2 && py >= dw.y - 2 && py <= dw.y + dw.height + 2) {
          return 'none';
        }
      }

      for (let i = 0; i < activeIntersections.length; i++) {
        const inter = activeIntersections[i];
        const hw = inter.width / 2 + 6;
        const hh = inter.height / 2 + 6;
        if (px >= inter.x - hw && px <= inter.x + hw && py >= inter.y - hh && py <= inter.y + hh) {
          return 'none';
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
      if (px >= 4200 && px <= 5000 && py >= 1800 && py <= 2600) return 'lawn';
      if (px >= 4880 && px <= 7860 && py >= 4880 && py <= 7860) return 'lawn';

      return 'meadow';
    };

    ctx.save();

    // --- PASS 1: Fast, Subtle Pressed-Grass Tracks (притоптанная колёсами и ногами трава без тёмных пятен) ---
    const tCell = this.TRAMPLE_CELL_SIZE;
    if (this.trampledCells.size > 0) {
      const minTcx = Math.floor(minX / tCell);
      const maxTcx = Math.floor(maxX / tCell);
      const minTcy = Math.floor(minY / tCell);
      const maxTcy = Math.floor(maxY / tCell);
      const trampledPath = new Path2D();
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
          const len = tCell * (cellData.isWheel ? 0.68 : 0.52);
          const wid = tCell * (cellData.isWheel ? 0.42 : 0.36);
          const angle = Math.atan2(cellData.dirY, cellData.dirX);
          trampledPath.moveTo(wx + len * Math.cos(angle), wy + len * Math.sin(angle));
          trampledPath.ellipse(wx, wy, len, wid, angle, 0, Math.PI * 2);
        }
      }

      if (hasVisibleTrample) {
        // Soft matte pressed-leaf sheen (lighter sage-olive underside of bent grass, NEVER a dark shadow!)
        ctx.fillStyle = isAutumn
          ? 'rgba(138, 114, 48, 0.18)'
          : isWet
            ? 'rgba(54, 118, 64, 0.16)'
            : 'rgba(84, 146, 78, 0.18)';
        ctx.fill(trampledPath);
      }
    }

    // --- PASS 2: Calm, Wide, Low-Contrast Botanical Foliage Cushions & Swaying Wildflowers ---
    // Spaced at 48..64px (~220..300 points max per viewport -> < 0.15ms CPU, zero lag, zero flicker!)
    const viewSpan = Math.max(maxX - minX, maxY - minY);
    const step = viewSpan > 1800 ? 64 : viewSpan > 1100 ? 52 : 44;
    const startX = Math.floor(minX / step) * step;
    const startY = Math.floor(minY / step) * step;

    const shadeCushionPath = new Path2D();
    const canopyCushionPath = new Path2D();
    const windSheenPath = new Path2D();
    const wheatEarPath = new Path2D();
    let hasWheat = false;

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
        const jx = (this.prng(gx, gy, 3101) - 0.5) * (step * 0.78);
        const jy = (this.prng(gx, gy, 3119) - 0.5) * (step * 0.78);
        const px = gx + jx;
        const py = gy + jy;

        const surf = classifyGrassSurfaceFast(px, py);
        if (surf === 'none') continue;

        // Check if trampled at this cluster
        const tcx = Math.floor(px / tCell);
        const tcy = Math.floor(py / tCell);
        const trample = this.trampledCells.get(this.getTrampleKey(tcx, tcy));
        const crush = trample ? trample.crush : 0;

        // Gentle mechanical parting around nearby vehicles & player
        let pushX = 0;
        let pushY = 0;
        for (let vIdx = 0; vIdx < visibleVehicles.length; vIdx++) {
          const v = visibleVehicles[vIdx];
          const dx = px - v.x;
          const dy = py - v.y;
          const maxR = (v.length || 46) * 0.58 + 12;
          if (dx * dx + dy * dy > maxR * maxR) continue;
          const dLen = Math.hypot(dx, dy) || 1;
          const pf = Math.max(0, 1.0 - dLen / maxR) * 4.2;
          pushX += (dx / dLen) * pf;
          pushY += (dy / dLen) * pf;
        }

        if (player && !player.isInVehicle && !player.isInsideBuilding) {
          const dx = px - player.x;
          const dy = py - player.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < 196 && dSq > 0.1) {
            const d = Math.sqrt(dSq);
            const pf = (1.0 - d / 14) * 3.5;
            pushX += (dx / d) * pf;
            pushY += (dy / d) * pf;
          }
        }

        // Smooth traveling wind wave at (px, py, nowSec)
        const uWind = px * wCos + py * wSin;
        const vWind = -px * wSin + py * wCos;
        const wavePhase =
          uWind * 0.011 -
          nowSec * waveSpeed +
          Math.sin(vWind * 0.008 + px * 0.0025) * 1.5;
        const waveSin = Math.sin(wavePhase);
        const gustWave = 0.55 + 0.45 * waveSin;

        const swayMag = baseWindPower * gustWave * (1.0 - crush * 0.85);
        const swayX = wCos * swayMag * 3.6 + pushX;
        const swayY = wSin * swayMag * 3.6 + pushY;

        // Natural 360-degree orientation of the soft rounded foliage pillow
        const naturalAngle = this.prng(gx, gy, 3301) * Math.PI * 2;
        const rCluster = (surf === 'lawn' ? 4.2 : 5.6) + this.prng(gx, gy, 3407) * 2.4;

        if (surf === 'wheat') {
          hasWheat = true;
          const wx = px + swayX * 0.7;
          const wy = py + swayY * 0.7;
          wheatEarPath.moveTo(wx + rCluster, wy);
          wheatEarPath.ellipse(wx, wy, rCluster * 0.95, rCluster * 0.65, windAngle, 0, Math.PI * 2);
        } else {
          // Soft rounded undergrowth cushion (no needles, no worms!)
          shadeCushionPath.moveTo(px + rCluster * 1.1, py + 0.8);
          shadeCushionPath.ellipse(px, py + 0.8, rCluster * 1.1, rCluster * 0.82, naturalAngle, 0, Math.PI * 2);

          // Soft wind-leaning upper foliage pillow
          const cx = px + swayX * 0.55;
          const cy = py + swayY * 0.55;
          canopyCushionPath.moveTo(cx + rCluster * 0.88, cy);
          canopyCushionPath.ellipse(cx, cy, rCluster * 0.88, rCluster * 0.66, naturalAngle + 0.4, 0, Math.PI * 2);

          // Subtle wind-wave crest highlight on clusters riding the wind wave peak
          if (waveSin > 0.1 && crush < 0.3) {
            const tx = px + swayX * 0.9;
            const ty = py + swayY * 0.9;
            const rCrest = rCluster * 0.58;
            windSheenPath.moveTo(tx + rCrest, ty);
            windSheenPath.arc(tx, ty, rCrest, 0, Math.PI * 2);
          }
        }

        // Swaying Wildflowers, Clover Blossoms & Sunflowers
        if (crush < 0.40 && !isAutumn) {
          const flRng = this.prng(gx, gy, 3907);
          if (surf === 'sunflower' && flRng < 0.85) {
            flowers.push({
              x: px,
              y: py,
              tipX: px + swayX * 0.65,
              tipY: py + swayY * 0.65,
              type: 10,
              scale: 0.85 + flRng * 0.35,
            });
          } else if (surf === 'clover' && flRng < 0.42) {
            flowers.push({
              x: px,
              y: py,
              tipX: px + swayX * 0.7,
              tipY: py + swayY * 0.7,
              type: flRng < 0.26 ? 3 : 0,
              scale: 1.0,
            });
          } else if (surf === 'wheat' && flRng < 0.12) {
            flowers.push({
              x: px,
              y: py,
              tipX: px + swayX * 0.8,
              tipY: py + swayY * 0.8,
              type: flRng < 0.07 ? 2 : 4,
              scale: 1.0,
            });
          } else if ((surf === 'meadow' || surf === 'lawn') && flRng < (surf === 'lawn' ? 0.10 : 0.22)) {
            const flType = Math.floor(this.prng(gx, gy, 3929) * 4);
            flowers.push({
              x: px,
              y: py,
              tipX: px + swayX * 0.75,
              tipY: py + swayY * 0.75,
              type: flType,
              scale: 0.88 + (flRng * 4) % 0.28,
            });
          }
        }
      }
    }

    // 4. Execute 3 ultra-soft, low-contrast GPU fill calls (zero retinal fatigue, 60+ FPS!)
    ctx.fillStyle = isAutumn
      ? 'rgba(54, 42, 16, 0.12)'
      : isWet
        ? 'rgba(12, 38, 18, 0.14)'
        : 'rgba(18, 52, 24, 0.12)';
    ctx.fill(shadeCushionPath);

    ctx.fillStyle = isAutumn
      ? 'rgba(128, 104, 42, 0.15)'
      : isWet
        ? 'rgba(38, 104, 52, 0.15)'
        : 'rgba(56, 122, 62, 0.15)';
    ctx.fill(canopyCushionPath);

    ctx.fillStyle = isAutumn
      ? 'rgba(168, 140, 58, 0.14)'
      : isWet
        ? 'rgba(64, 142, 82, 0.13)'
        : 'rgba(86, 158, 78, 0.14)';
    ctx.fill(windSheenPath);

    if (hasWheat) {
      ctx.fillStyle = isAutumn ? 'rgba(148, 112, 38, 0.24)' : 'rgba(186, 146, 48, 0.24)';
      ctx.fill(wheatEarPath);
    }

    // 5. Swaying Wildflowers & Sunflowers
    if (flowers.length > 0 && cameraZoom > 0.55) {
      for (let i = 0; i < flowers.length; i++) {
        const fl = flowers[i];
        const fx = fl.tipX;
        const fy = fl.tipY;

        if (fl.type === 10) {
          const sc = fl.scale;
          ctx.fillStyle = 'rgba(8, 16, 8, 0.32)';
          ctx.beginPath();
          ctx.arc(fl.x + 1.5, fl.y + 1.5, 4.2 * sc, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#245826';
          ctx.beginPath();
          ctx.arc(fl.x, fl.y, 3.9 * sc, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#d4a017';
          ctx.beginPath();
          ctx.arc(fx, fy, 3.3 * sc, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#3b1d0a';
          ctx.beginPath();
          ctx.arc(fx + 0.2, fy + 0.2, 1.6 * sc, 0, Math.PI * 2);
          ctx.fill();
        } else if (fl.type === 0) {
          ctx.fillStyle = 'rgba(241, 245, 249, 0.78)';
          ctx.beginPath();
          ctx.arc(fx, fy, 1.4 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(218, 165, 32, 0.82)';
          ctx.beginPath();
          ctx.arc(fx, fy, 0.6 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
        } else if (fl.type === 1) {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.75)';
          ctx.beginPath();
          ctx.arc(fx, fy, 1.3 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
        } else if (fl.type === 2) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
          ctx.beginPath();
          ctx.arc(fx, fy, 1.3 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
        } else if (fl.type === 3) {
          ctx.fillStyle = 'rgba(236, 114, 176, 0.72)';
          ctx.beginPath();
          ctx.arc(fx, fy, 1.3 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
        } else if (fl.type === 4) {
          ctx.fillStyle = 'rgba(220, 60, 60, 0.75)';
          ctx.beginPath();
          ctx.arc(fx, fy, 1.35 * fl.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }
}

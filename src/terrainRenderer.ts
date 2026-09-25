// --- VOLUMETRIC TERRAIN & AGRICULTURAL FIELDS RENDERER ---
// Renders rich 3D hillshading, topographic relief contours, agricultural fields
// with authentic 3D furrows, tramlines, hay rolls, earth mounds, and steppe kurgans.

import { GameWorld } from './types';
import { 
  AGRICULTURAL_FIELDS, 
  LANDMARK_HILLS, 
  AgriculturalField, 
  getTerrainSlope 
} from './terrainElevation';
import { getBiomeSampleAt } from './biomeSystem';

export class TerrainRenderer {
  private static sharedBufferCanvas: HTMLCanvasElement | null = null;
  private static sharedBufferCtx: CanvasRenderingContext2D | null = null;
  private static sharedImageData: ImageData | null = null;
  private static readonly BUFFER_SIZE = 64; // High-density 64x64 continuous sampling grid with bilinear hardware smoothing

  private static getSharedBuffer(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; imgData: ImageData } | null {
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
      imgData: this.sharedImageData!
    };
  }

  /**
   * Renders the complete volumetric ground, relief, fields, and hills for the given chunk bounds.
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

    // 1. Continuous Ecological Biome Base with Built-In Smooth 3D Hypsometric Relief & Hillshading
    // Samples continuous moisture, forest/steppe weights, elevation gradients and directional NW lighting,
    // then renders with high-quality GPU bilinear smoothing. Completely eliminates grid blocks and pixelation.
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

          // 1. Hypsometric Elevation Tinting (Smooth mountain crests and deep river valleys)
          const elev = slope.elevation;
          if (elev > 12.0) {
            const peakRatio = Math.min(1.0, (elev - 12.0) / 40.0) * 0.20;
            r += (255 - r) * peakRatio;
            g += (248 - g) * peakRatio;
            b += (210 - b) * peakRatio;
          } else if (elev < 6.0) {
            const valleyRatio = Math.min(1.0, (6.0 - elev) / 6.0) * 0.24;
            r *= (1.0 - valleyRatio * 0.6);
            g *= (1.0 - valleyRatio * 0.5);
            b *= (1.0 - valleyRatio * 0.6);
          }

          // 2. Volumetric Directional Hillshading (NW sun lighting & SE shadow slope)
          const shade = slope.shade;
          if (shade > 0.02) {
            const light = Math.min(0.32, shade * 0.28);
            r += (255 - r) * light;
            g += (245 - g) * light;
            b += (195 - b) * light;
          } else if (shade < -0.02) {
            const dark = Math.min(0.36, Math.abs(shade) * 0.32);
            r *= (1.0 - dark * 0.82);
            g *= (1.0 - dark * 0.78);
            b *= (1.0 - dark * 0.82);
          }

          // 3. Subtle geological clay stratification in badlands
          if (sample.clayWeight > 0.65) {
            const h = ((Math.floor(wx * 98765) ^ Math.floor(wy * 54321)) >>> 0) % 5;
            if (h === 0) {
              r *= 0.94;
              g *= 0.92;
              b *= 0.90;
            }
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
      ctx.restore();
    } else {
      // Fallback
      ctx.fillStyle = '#18542a';
      ctx.fillRect(minX, minY, chunkW, chunkH);
    }

    // 2. Salt Lake Water Bodies (mineral turquoise waters in the lake basin)
    this.renderSaltLakeWaters(ctx, minX, minY, maxX, maxY);

    // 3. Central City Parks (Downtown Greenery)
    this.renderUrbanParks(ctx, minX, minY, maxX, maxY);

    // 4. Industrial Yard Heavy Concrete Slabs (5600..8000, 0..3300)
    this.renderIndustrialZone(ctx, minX, minY, maxX, maxY);

    // 5. Agricultural Field Parcels with 3D Furrows, Crops & Headlands
    this.renderAgriculturalFieldParcels(ctx, minX, minY, maxX, maxY);

    // 6. Volumetric Landmark Hills, Kurgans & Mounds (Topographic Hillshade & Contour Overlay)
    this.renderLandmarkHillsAndRelief(ctx, minX, minY, maxX, maxY);

    // 7. Agricultural Micro-Props (Round Hay Bales / Straw Rolls)
    this.renderHayBales(ctx, minX, minY, maxX, maxY);
  }

  // --- 2. SALT LAKE MINERAL WATERS ---
  private static renderSaltLakeWaters(
    ctx: CanvasRenderingContext2D,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    const waterY1 = Math.max(minY, 7300);
    const waterY2 = Math.min(maxY, 8200);
    if (waterY2 <= waterY1) return;

    // West Salt Pool
    const w1X1 = Math.max(minX, 17000);
    const w1X2 = Math.min(maxX, 23000);
    if (w1X2 > w1X1) {
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(w1X1, waterY1, w1X2 - w1X1, waterY2 - waterY1);
    }

    // East Salt Pool
    const w2X1 = Math.max(minX, 27000);
    const w2X2 = Math.min(maxX, 35000);
    if (w2X2 > w2X1) {
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(w2X1, waterY1, w2X2 - w2X1, waterY2 - waterY1);
    }
  }

  // --- 6. DOWNTOWN PARKS ---
  private static renderUrbanParks(
    ctx: CanvasRenderingContext2D,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    const pX1 = Math.max(minX, 4200);
    const pY1 = Math.max(minY, 1800);
    const pX2 = Math.min(maxX, 5000);
    const pY2 = Math.min(maxY, 2600);
    if (pX2 > pX1 && pY2 > pY1) {
      ctx.fillStyle = '#15803d';
      ctx.fillRect(pX1, pY1, pX2 - pX1, pY2 - pY1);
    }
  }

  // --- 7. INDUSTRIAL DISTRICT CONCRETE APRONS ---
  private static renderIndustrialZone(
    ctx: CanvasRenderingContext2D,
    minX: number, minY: number, maxX: number, maxY: number
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

  // --- 8. AGRICULTURAL FIELD PARCELS WITH 3D FURROWS & CROPS ---
  private static renderAgriculturalFieldParcels(
    ctx: CanvasRenderingContext2D,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    for (const field of AGRICULTURAL_FIELDS) {
      const b = field.bounds;
      // Check chunk intersection
      if (b.x + b.width < minX || b.x > maxX || b.y + b.height < minY || b.y > maxY) {
        continue;
      }

      ctx.save();

      // Clip strictly to field bounds for pristine edges
      ctx.beginPath();
      ctx.rect(b.x, b.y, b.width, b.height);
      ctx.clip();

      // Render specific field type
      switch (field.type) {
        case 'plowed':
          this.renderPlowedArableField(ctx, field, minX, minY, maxX, maxY);
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

      ctx.restore();

      // Render raised 3D boundary berm / headland (межа) around the field
      this.renderFieldBoundaryBerm(ctx, field, minX, minY, maxX, maxY);
    }
  }

  // --- PLOWED ARABLE FIELD (Пашня с 3D бороздами) ---
  private static renderPlowedArableField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    const b = field.bounds;

    // 1. Rich dark chernozem loam base
    ctx.fillStyle = '#2d2015';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    // 2. High-definition 3D Furrow Ridges (alternating sunlit ridge tops & shadowed troughs)
    const angle = field.furrowAngle;
    const spacing = field.furrowSpacing;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Calculate bounding extent along normal to furrows
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const diagonal = Math.hypot(b.width, b.height);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const halfD = diagonal / 2 + 50;
    const startOffset = Math.floor(-halfD / spacing) * spacing;

    // A. Deep shaded furrow trough lines
    ctx.strokeStyle = 'rgba(15, 9, 4, 0.65)';
    ctx.lineWidth = spacing * 0.45;
    ctx.beginPath();
    for (let u = startOffset; u <= halfD; u += spacing) {
      ctx.moveTo(-halfD, u);
      ctx.lineTo(halfD, u);
    }
    ctx.stroke();

    // B. Raised sunlit furrow crest highlights
    ctx.strokeStyle = 'rgba(125, 95, 70, 0.42)';
    ctx.lineWidth = spacing * 0.35;
    ctx.beginPath();
    for (let u = startOffset; u <= halfD; u += spacing) {
      ctx.moveTo(-halfD, u - spacing * 0.28);
      ctx.lineTo(halfD, u - spacing * 0.28);
    }
    ctx.stroke();

    // C. Micro soil clumps & tractor wheel rut tracks across furrows
    ctx.fillStyle = 'rgba(80, 58, 40, 0.3)';
    for (let u = startOffset + spacing / 2; u <= halfD; u += spacing * 4) {
      ctx.fillRect(-halfD, u - 2, diagonal, 4);
    }

    ctx.restore();

    // 3. Headland turning zone (поворотная полоса комбайнов) at North/South edges
    const headlandH = 36;
    ctx.fillStyle = 'rgba(20, 14, 8, 0.35)';
    ctx.fillRect(b.x, b.y, b.width, headlandH);
    ctx.fillRect(b.x, b.y + b.height - headlandH, b.width, headlandH);
  }

  // --- GOLDEN WHEAT FIELD (Золотое пшеничное поле) ---
  private static renderGoldenWheatField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    const b = field.bounds;

    // 1. Warm amber-gold wheat base
    ctx.fillStyle = '#caa042';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    // 2. Wind wave bands (subtle undulating light variation)
    const angle = field.furrowAngle;
    const spacing = field.furrowSpacing;
    const diagonal = Math.hypot(b.width, b.height);
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const halfD = diagonal / 2 + 50;
    const startOffset = Math.floor(-halfD / spacing) * spacing;

    // Alternating golden straw highlights & deeper amber crop shade
    for (let u = startOffset; u <= halfD; u += spacing * 2) {
      ctx.fillStyle = 'rgba(245, 215, 110, 0.18)';
      ctx.fillRect(-halfD, u, diagonal, spacing);

      ctx.fillStyle = 'rgba(145, 100, 25, 0.16)';
      ctx.fillRect(-halfD, u + spacing, diagonal, spacing);
    }

    // 3. Harvester/Sprayer Tramlines (технологическая колея опрыскивателя)
    if (field.hasTramlines && field.tramlineSpacing) {
      const tSpacing = field.tramlineSpacing;
      const tStart = Math.floor(-halfD / tSpacing) * tSpacing;

      ctx.strokeStyle = 'rgba(60, 42, 18, 0.65)';
      ctx.lineWidth = 3.0;

      for (let u = tStart; u <= halfD; u += tSpacing) {
        // Pair of wheel ruts (spaced ~22px apart)
        ctx.beginPath();
        ctx.moveTo(-halfD, u - 11);
        ctx.lineTo(halfD, u - 11);
        ctx.moveTo(-halfD, u + 11);
        ctx.lineTo(halfD, u + 11);
        ctx.stroke();

        // Inner slightly worn soil between wheels
        ctx.fillStyle = 'rgba(80, 55, 25, 0.2)';
        ctx.fillRect(-halfD, u - 10, diagonal, 20);
      }
    }

    ctx.restore();
  }

  // --- CLOVER & ALFALFA HAY MEADOW (Клеверный сенокос) ---
  private static renderCloverAlfalfaField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    const b = field.bounds;

    // 1. Lush emerald clover base
    ctx.fillStyle = '#1b7d38';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    // 2. Mowed swath bands (полосы покоса роторной косилки)
    const angle = field.furrowAngle;
    const spacing = field.furrowSpacing;
    const diagonal = Math.hypot(b.width, b.height);
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const halfD = diagonal / 2 + 50;
    const startOffset = Math.floor(-halfD / spacing) * spacing;

    for (let u = startOffset; u <= halfD; u += spacing * 2) {
      // Light fresh cut side
      ctx.fillStyle = 'rgba(52, 199, 89, 0.16)';
      ctx.fillRect(-halfD, u, diagonal, spacing);

      // Dark standing clover side
      ctx.fillStyle = 'rgba(15, 65, 28, 0.22)';
      ctx.fillRect(-halfD, u + spacing, diagonal, spacing);

      // Thin mowed cut line
      ctx.strokeStyle = 'rgba(10, 45, 18, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-halfD, u);
      ctx.lineTo(halfD, u);
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- SUNFLOWER / CANOLA BLOOMING FIELD (Подсолнухи и рапс) ---
  private static renderSunflowerField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    const b = field.bounds;

    // 1. Deep green foliage understory
    ctx.fillStyle = '#265421';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    // 2. Linear sunflower rows with bright yellow blooms
    const angle = field.furrowAngle;
    const spacing = field.furrowSpacing;
    const diagonal = Math.hypot(b.width, b.height);
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const halfD = diagonal / 2 + 50;
    const startOffset = Math.floor(-halfD / spacing) * spacing;

    // Row bases (dark soil between rows)
    ctx.fillStyle = 'rgba(25, 18, 10, 0.45)';
    for (let u = startOffset; u <= halfD; u += spacing) {
      ctx.fillRect(-halfD, u - spacing * 0.4, diagonal, spacing * 0.35);
    }

    // Bright blooming flower heads along rows
    ctx.fillStyle = '#eab308';
    for (let u = startOffset; u <= halfD; u += spacing) {
      ctx.fillRect(-halfD, u, diagonal, spacing * 0.45);
    }

    // Golden blossom highlight crests
    ctx.fillStyle = '#fde047';
    for (let u = startOffset; u <= halfD; u += spacing) {
      ctx.fillRect(-halfD, u - 2, diagonal, 3);
    }

    // Tramlines
    if (field.hasTramlines && field.tramlineSpacing) {
      const tSpacing = field.tramlineSpacing;
      const tStart = Math.floor(-halfD / tSpacing) * tSpacing;
      ctx.strokeStyle = 'rgba(40, 28, 14, 0.7)';
      ctx.lineWidth = 3.5;
      for (let u = tStart; u <= halfD; u += tSpacing) {
        ctx.beginPath();
        ctx.moveTo(-halfD, u - 10);
        ctx.lineTo(halfD, u - 10);
        ctx.moveTo(-halfD, u + 10);
        ctx.lineTo(halfD, u + 10);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // --- PASTURE & ROLLING KNOLLS (Пастбище) ---
  private static renderPastureField(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    const b = field.bounds;

    // Multi-tone pasture grass with organic patches
    ctx.fillStyle = '#2c8f42';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    // Warm sage and dry grass patches
    const patchSize = 75;
    for (let x = b.x; x < b.x + b.width; x += patchSize) {
      for (let y = b.y; y < b.y + b.height; y += patchSize) {
        const hash = ((x * 1234567) ^ (y * 7654321)) >>> 0;
        if (hash % 4 === 0) {
          ctx.fillStyle = 'rgba(168, 180, 85, 0.22)';
          ctx.beginPath();
          ctx.ellipse(x + patchSize / 2, y + patchSize / 2, patchSize * 0.4, patchSize * 0.3, 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (hash % 4 === 1) {
          ctx.fillStyle = 'rgba(20, 90, 40, 0.2)';
          ctx.beginPath();
          ctx.ellipse(x + patchSize / 2, y + patchSize / 2, patchSize * 0.35, patchSize * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // --- RAISED FIELD BOUNDARY BERM (Межа / Полевой валик с тенью и бликом) ---
  private static renderFieldBoundaryBerm(
    ctx: CanvasRenderingContext2D,
    field: AgriculturalField,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    const b = field.bounds;
    const bermW = field.borderBermWidth || 14;

    // Check visibility
    if (b.x + b.width + bermW < minX || b.x - bermW > maxX ||
        b.y + b.height + bermW < minY || b.y - bermW > maxY) {
      return;
    }

    ctx.save();

    // 1. Outer shaded drop slope (South & East edges)
    ctx.fillStyle = 'rgba(15, 25, 15, 0.45)';
    // South drop shadow
    ctx.fillRect(b.x - bermW, b.y + b.height, b.width + bermW * 2, bermW);
    // East drop shadow
    ctx.fillRect(b.x + b.width, b.y - bermW, bermW, b.height + bermW * 2);

    // 2. Raised uncultivated grassy ridge (Межа с полевыми травами)
    ctx.strokeStyle = '#365314'; // Dark olive-green raised soil & weeds
    ctx.lineWidth = bermW * 0.9;
    ctx.strokeRect(b.x, b.y, b.width, b.height);

    // 3. Sunlit crest highlight (North & West edges facing NW sun)
    ctx.strokeStyle = 'rgba(255, 255, 220, 0.32)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // North lit edge
    ctx.moveTo(b.x - bermW / 2, b.y - bermW / 2);
    ctx.lineTo(b.x + b.width + bermW / 2, b.y - bermW / 2);
    // West lit edge
    ctx.moveTo(b.x - bermW / 2, b.y - bermW / 2);
    ctx.lineTo(b.x - bermW / 2, b.y + b.height + bermW / 2);
    ctx.stroke();

    // 4. Shaded bottom edge (South & East inner line)
    ctx.strokeStyle = 'rgba(10, 15, 10, 0.55)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(b.x + b.width + bermW / 2, b.y - bermW / 2);
    ctx.lineTo(b.x + b.width + bermW / 2, b.y + b.height + bermW / 2);
    ctx.lineTo(b.x - bermW / 2, b.y + b.height + bermW / 2);
    ctx.stroke();

    ctx.restore();
  }

  // --- 9. LANDMARK HILLS, KURGANS & VOLUMETRIC RELIEF GRADIENTS ---
  private static renderLandmarkHillsAndRelief(
    ctx: CanvasRenderingContext2D,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    for (const hill of LANDMARK_HILLS) {
      const maxR = Math.max(hill.radiusX, hill.radiusY) + 80;
      if (hill.x + maxR < minX || hill.x - maxR > maxX ||
          hill.y + maxR < minY || hill.y - maxR > maxY) {
        continue;
      }

      ctx.save();
      ctx.translate(hill.x, hill.y);
      if (hill.angle) {
        ctx.rotate(hill.angle);
      }

      const rx = hill.radiusX;
      const ry = hill.radiusY;

      // 1. Deep Ambient Occlusion (AO) Volumetric Cast Shadow on SE side (+X, +Y)
      const shadowGrad = ctx.createRadialGradient(
        rx * 0.35, ry * 0.35, 10,
        rx * 0.2, ry * 0.2, rx * 1.35
      );
      shadowGrad.addColorStop(0, 'rgba(6, 14, 8, 0.55)');
      shadowGrad.addColorStop(0.5, 'rgba(12, 24, 15, 0.30)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(rx * 0.15, ry * 0.15, rx * 1.35, ry * 1.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Sunlit Volumetric Crest Highlight Gradient on NW side (-X, -Y)
      const litGrad = ctx.createRadialGradient(
        -rx * 0.35, -ry * 0.35, 5,
        -rx * 0.2, -ry * 0.2, rx * 1.15
      );
      litGrad.addColorStop(0, 'rgba(255, 252, 215, 0.45)');
      litGrad.addColorStop(0.4, 'rgba(255, 245, 190, 0.22)');
      litGrad.addColorStop(1, 'rgba(255, 250, 200, 0)');

      ctx.fillStyle = litGrad;
      ctx.beginPath();
      ctx.ellipse(-rx * 0.2, -ry * 0.2, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Volumetric Height-Tinted Crown (Peak Elevation Glow)
      const crownGrad = ctx.createRadialGradient(
        -rx * 0.3, -ry * 0.3, 0,
        -rx * 0.3, -ry * 0.3, rx * 0.65
      );
      crownGrad.addColorStop(0, 'rgba(255, 255, 230, 0.30)');
      crownGrad.addColorStop(1, 'rgba(255, 255, 230, 0)');

      ctx.fillStyle = crownGrad;
      ctx.beginPath();
      ctx.ellipse(-rx * 0.3, -ry * 0.3, rx * 0.65, ry * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Conical Kurgan summit marker / exposed soil crown
      if (hill.type === 'kurgan') {
        const kurganGrad = ctx.createRadialGradient(-18, -18, 0, -18, -18, 42);
        kurganGrad.addColorStop(0, 'rgba(255, 245, 200, 0.70)');
        kurganGrad.addColorStop(0.4, 'rgba(180, 145, 95, 0.55)');
        kurganGrad.addColorStop(1, 'rgba(120, 90, 50, 0)');

        ctx.fillStyle = kurganGrad;
        ctx.beginPath();
        ctx.arc(-18, -18, 42, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // --- 10. SCATTERED ROUND HAY BALES / STRAW ROLLS (Рулоны сена) ---
  private static renderHayBales(
    ctx: CanvasRenderingContext2D,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    for (const field of AGRICULTURAL_FIELDS) {
      if (!field.hasHayBales || !field.hayBalePositions) continue;

      for (const bale of field.hayBalePositions) {
        if (bale.x + 30 < minX || bale.x - 30 > maxX ||
            bale.y + 30 < minY || bale.y - 30 > maxY) {
          continue;
        }

        ctx.save();
        ctx.translate(bale.x, bale.y);
        ctx.rotate(bale.angle);

        const baleL = 22; // Length of cylinder
        const baleW = 14; // Diameter of cylinder

        // 1. Soft directional cast shadow (pointing SE, 135 deg)
        ctx.fillStyle = 'rgba(10, 15, 10, 0.45)';
        ctx.beginPath();
        ctx.ellipse(6, 6, baleL * 0.55, baleW * 0.5, 0.35, 0, Math.PI * 2);
        ctx.fill();

        // 2. Straw roll cylinder base
        ctx.fillStyle = '#ca8a04'; // Deep straw gold
        ctx.fillRect(-baleL / 2, -baleW / 2, baleL, baleW);

        // 3. Shaded cylinder underside (SE side)
        ctx.fillStyle = 'rgba(113, 63, 18, 0.65)';
        ctx.fillRect(-baleL / 2, baleW * 0.1, baleL, baleW * 0.4);

        // 4. Highlighted cylinder top ridge (NW sunlit side)
        ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
        ctx.fillRect(-baleL / 2, -baleW / 2, baleL, baleW * 0.35);

        // 5. Cylindrical end-cap (spiral wound straw lines)
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(baleL / 2, 0, 3, baleW / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // 6. Netting / Twine binding straps around the bale
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-baleL * 0.25, -baleW / 2);
        ctx.lineTo(-baleL * 0.25, baleW / 2);
        ctx.moveTo(baleL * 0.25, -baleW / 2);
        ctx.lineTo(baleL * 0.25, baleW / 2);
        ctx.stroke();

        ctx.restore();
      }
    }
  }
}

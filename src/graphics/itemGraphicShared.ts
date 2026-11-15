// Shared procedural 2D canvas drawing helpers for realistic item models

let suppressShadow = false;

export function setSuppressItemShadow(suppress: boolean) {
  suppressShadow = suppress;
}

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  rx: number = 7,
  ry: number = 2.6,
  y: number = 7.5,
  alpha: number = 0.22,
  x: number = 0.5
) {
  if (suppressShadow) return;
  ctx.save();
  ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGlossBand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha: number = 0.35
) {
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function drawMedicalCross(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 4,
  color: string = '#ffffff'
) {
  ctx.save();
  ctx.fillStyle = color;
  const bar = size * 0.36;
  ctx.fillRect(x - bar / 2, y - size / 2, bar, size);
  ctx.fillRect(x - size / 2, y - bar / 2, size, bar);
  ctx.restore();
}

const FROST_CANVAS_SIZE = 96;
const FROST_WORLD_SPAN = 26;

interface FrostScratchBuffers {
  silhouette: HTMLCanvasElement;
  eroded: HTMLCanvasElement;
  edge: HTMLCanvasElement;
  frost: HTMLCanvasElement;
}

let scratchBuffers: FrostScratchBuffers | null = null;

function getFrostScratchBuffers(): FrostScratchBuffers | null {
  if (typeof document === 'undefined') return null;
  if (!scratchBuffers) {
    const createBuf = () => {
      const c = document.createElement('canvas');
      c.width = FROST_CANVAS_SIZE;
      c.height = FROST_CANVAS_SIZE;
      return c;
    };
    scratchBuffers = {
      silhouette: createBuf(),
      eroded: createBuf(),
      edge: createBuf(),
      frost: createBuf()
    };
  }
  return scratchBuffers;
}

/**
 * Draws a feathery dendritic frost branch (морозная веточка инея с боковыми иголочками)
 */
function drawDendriticBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  barbs: number,
  alpha: number
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const endX = x + cos * length;
  const endY = y + sin * length;

  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = 0.32;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);

  const barbAngleOffset = Math.PI / 3; // 60-degree hexagonal ice crystal lattice angle
  for (let b = 1; b <= barbs; b++) {
    const t = b / (barbs + 0.6);
    const bx = x + cos * (length * t);
    const by = y + sin * (length * t);
    const barbLen = length * (1 - t * 0.65) * 0.48;

    const a1 = angle + barbAngleOffset;
    const a2 = angle - barbAngleOffset;
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a1) * barbLen, by + Math.sin(a1) * barbLen);
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a2) * barbLen, by + Math.sin(a2) * barbLen);
  }
  ctx.stroke();
}

/**
 * Draws a 6-pointed hexagonal ice crystal with chevron tips
 */
function drawHexIceCrystal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotation: number,
  alpha: number
) {
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = 0.3;
  ctx.lineCap = 'round';
  ctx.beginPath();

  for (let axis = 0; axis < 3; axis++) {
    const a = rotation + (axis * Math.PI) / 3;
    const dx = Math.cos(a) * radius;
    const dy = Math.sin(a) * radius;
    ctx.moveTo(cx - dx, cy - dy);
    ctx.lineTo(cx + dx, cy + dy);

    // Chevron tips on both ends of the axis
    for (const dir of [-1, 1]) {
      const tipX = cx + dx * dir * 0.62;
      const tipY = cy + dy * dir * 0.62;
      const chevLen = radius * 0.34;
      const ca1 = (dir > 0 ? a : a + Math.PI) + Math.PI / 3;
      const ca2 = (dir > 0 ? a : a + Math.PI) - Math.PI / 3;
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + Math.cos(ca1) * chevLen, tipY + Math.sin(ca1) * chevLen);
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + Math.cos(ca2) * chevLen, tipY + Math.sin(ca2) * chevLen);
    }
  }
  ctx.stroke();
}

/**
 * Procedural Frost & Thermal overlay for items.
 * Renders shape-hugging crystalline ice rime, contour hoarfrost crust, dendritic veins,
 * and micro-crystals strictly conforming to the exact 2D model silhouette for cold/freezing items (T <= 5°C),
 * as well as delicate steam wisps for hot items (T >= 60°C).
 */
export function drawFrostAndThermalOverlay(
  ctx: CanvasRenderingContext2D,
  item?: any,
  boundsRadius: number = 8.5,
  renderModelSilhouette?: (targetCtx: CanvasRenderingContext2D) => void
) {
  if (!item) return;

  const temp = typeof item.surfaceTemperature === 'number'
    ? item.surfaceTemperature
    : (typeof item.temperature === 'number' ? item.temperature : 20.0);

  // === COLD & FROST RENDERER (T <= 5°C) ===
  if (temp <= 5.0) {
    const frostSeverity = Math.min(1.0, Math.max(0.12, (5.0 - temp) / 15.0));
    const isFreezing = temp <= 0.0;
    const isDeepFreeze = temp <= -8.0;

    // Deterministic seed from item identity
    const seedStr = String(item.id || item.itemId || 'item_frost');
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    const pseudoRand = (offset: number) => {
      const x = Math.sin(hash + offset * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };

    const buffers = renderModelSilhouette ? getFrostScratchBuffers() : null;
    if (buffers && renderModelSilhouette) {
      const { silhouette, eroded, edge, frost } = buffers;
      const sCtx = silhouette.getContext('2d');
      const erCtx = eroded.getContext('2d');
      const edCtx = edge.getContext('2d');
      const fCtx = frost.getContext('2d');

      if (sCtx && erCtx && edCtx && fCtx) {
        const pxScale = FROST_CANVAS_SIZE / FROST_WORLD_SPAN;
        const halfSpan = FROST_WORLD_SPAN / 2;

        // 1. Render pure item model silhouette (without ground drop shadow)
        sCtx.setTransform(1, 0, 0, 1, 0, 0);
        sCtx.clearRect(0, 0, FROST_CANVAS_SIZE, FROST_CANVAS_SIZE);
        sCtx.save();
        sCtx.translate(FROST_CANVAS_SIZE / 2, FROST_CANVAS_SIZE / 2);
        sCtx.scale(pxScale, pxScale);
        setSuppressItemShadow(true);
        try {
          renderModelSilhouette(sCtx);
        } finally {
          setSuppressItemShadow(false);
          sCtx.restore();
        }

        // 2. Build morphological contour mask (edge) that hugs the exact perimeter of the model
        const buildErodedMask = (radiusPx: number) => {
          erCtx.setTransform(1, 0, 0, 1, 0, 0);
          erCtx.globalCompositeOperation = 'source-over';
          erCtx.globalAlpha = 1.0;
          erCtx.clearRect(0, 0, FROST_CANVAS_SIZE, FROST_CANVAS_SIZE);
          erCtx.drawImage(silhouette, 0, 0);

          erCtx.globalCompositeOperation = 'destination-in';
          const d = radiusPx * 0.7071;
          const offsets: Array<[number, number]> = [
            [-radiusPx, 0], [radiusPx, 0], [0, -radiusPx], [0, radiusPx],
            [-d, -d], [d, -d], [-d, d], [d, d]
          ];
          for (const [ox, oy] of offsets) {
            erCtx.drawImage(silhouette, ox, oy);
          }
        };

        edCtx.setTransform(1, 0, 0, 1, 0, 0);
        edCtx.globalCompositeOperation = 'source-over';
        edCtx.globalAlpha = 1.0;
        edCtx.clearRect(0, 0, FROST_CANVAS_SIZE, FROST_CANVAS_SIZE);
        edCtx.drawImage(silhouette, 0, 0);

        // Subtract deep interior first (leaving a 3.2px outer frost band)
        buildErodedMask(3.2);
        edCtx.globalCompositeOperation = 'destination-out';
        edCtx.globalAlpha = isFreezing ? 0.58 : 0.78;
        edCtx.drawImage(eroded, 0, 0);

        // Subtract inner core further so the very outer 1.4px edge has the thickest rime crust
        buildErodedMask(1.4);
        edCtx.globalAlpha = isFreezing ? 0.45 : 0.65;
        edCtx.drawImage(eroded, 0, 0);
        edCtx.globalAlpha = 1.0;

        // Tint the contour mask with crisp icy white & frost blue
        edCtx.globalCompositeOperation = 'source-in';
        const rimGrad = edCtx.createLinearGradient(0, 0, FROST_CANVAS_SIZE, FROST_CANVAS_SIZE);
        rimGrad.addColorStop(0.0, isFreezing ? 'rgba(255, 255, 255, 0.92)' : 'rgba(224, 242, 254, 0.45)');
        rimGrad.addColorStop(0.5, isFreezing ? 'rgba(224, 242, 254, 0.80)' : 'rgba(186, 230, 253, 0.32)');
        rimGrad.addColorStop(1.0, isFreezing ? 'rgba(240, 249, 255, 0.88)' : 'rgba(224, 242, 254, 0.38)');
        edCtx.fillStyle = rimGrad;
        edCtx.fillRect(0, 0, FROST_CANVAS_SIZE, FROST_CANVAS_SIZE);

        // 3. Assemble detailed frost patterns in model space on frost canvas
        fCtx.setTransform(1, 0, 0, 1, 0, 0);
        fCtx.globalCompositeOperation = 'source-over';
        fCtx.globalAlpha = 1.0;
        fCtx.clearRect(0, 0, FROST_CANVAS_SIZE, FROST_CANVAS_SIZE);

        // Place the shape-following contour rime
        fCtx.globalAlpha = isFreezing ? (0.48 + frostSeverity * 0.42) : 0.35;
        fCtx.drawImage(edge, 0, 0);
        fCtx.globalAlpha = 1.0;

        fCtx.save();
        fCtx.translate(FROST_CANVAS_SIZE / 2, FROST_CANVAS_SIZE / 2);
        fCtx.scale(pxScale, pxScale);

        if (isFreezing) {
          // 3a. Organic mottled hoarfrost patches across the model surface
          const patchCount = 7 + Math.floor(frostSeverity * 7);
          for (let i = 0; i < patchCount; i++) {
            const px = (pseudoRand(i * 5 + 1) - 0.5) * boundsRadius * 1.65;
            const py = (pseudoRand(i * 5 + 2) - 0.5) * boundsRadius * 1.65;
            const pr = (1.6 + pseudoRand(i * 5 + 3) * 2.6) * (0.7 + frostSeverity * 0.4);
            const pAlpha = (0.14 + pseudoRand(i * 5 + 4) * 0.18) * frostSeverity;

            const pGrad = fCtx.createRadialGradient(px, py, pr * 0.1, px, py, pr);
            pGrad.addColorStop(0.0, `rgba(255, 255, 255, ${pAlpha * 1.35})`);
            pGrad.addColorStop(0.55, `rgba(224, 242, 254, ${pAlpha * 0.85})`);
            pGrad.addColorStop(1.0, 'rgba(186, 230, 253, 0)');
            fCtx.fillStyle = pGrad;
            fCtx.beginPath();
            fCtx.arc(px, py, pr, 0, Math.PI * 2);
            fCtx.fill();
          }

          // 3b. Feathery dendritic frost veins radiating across the surface and from edges
          const branchCount = 12 + Math.floor(frostSeverity * 14);
          for (let i = 0; i < branchCount; i++) {
            const bx = (pseudoRand(i * 6 + 20) - 0.5) * boundsRadius * 1.75;
            const by = (pseudoRand(i * 6 + 21) - 0.5) * boundsRadius * 1.75;
            const bAngle = pseudoRand(i * 6 + 22) * Math.PI * 2;
            const bLen = (1.1 + pseudoRand(i * 6 + 23) * 1.9) * (0.75 + frostSeverity * 0.45);
            const barbs = 2 + Math.floor(pseudoRand(i * 6 + 24) * 3);
            const bAlpha = Math.min(0.95, (0.45 + pseudoRand(i * 6 + 25) * 0.4) * (0.65 + frostSeverity * 0.45));
            drawDendriticBranch(fCtx, bx, by, bAngle, bLen, barbs, bAlpha);
          }

          // 3c. 6-rayed hexagonal ice crystals on the surface
          const hexCount = 5 + Math.floor(frostSeverity * 8);
          for (let i = 0; i < hexCount; i++) {
            const hx = (pseudoRand(i * 4 + 60) - 0.5) * boundsRadius * 1.5;
            const hy = (pseudoRand(i * 4 + 61) - 0.5) * boundsRadius * 1.5;
            const hRad = (0.65 + pseudoRand(i * 4 + 62) * 0.85) * (0.8 + frostSeverity * 0.35);
            const hRot = pseudoRand(i * 4 + 63) * Math.PI;
            drawHexIceCrystal(fCtx, hx, hy, hRad, hRot, 0.55 + frostSeverity * 0.38);
          }

          // 3d. Fine granular hoarfrost crystals (мелкая кристаллическая крупа инея)
          const grainCount = 34 + Math.floor(frostSeverity * 42);
          for (let i = 0; i < grainCount; i++) {
            const gx = (pseudoRand(i * 4 + 100) - 0.5) * boundsRadius * 1.85;
            const gy = (pseudoRand(i * 4 + 101) - 0.5) * boundsRadius * 1.85;
            const gSize = 0.16 + pseudoRand(i * 4 + 102) * 0.28;
            const isBright = pseudoRand(i * 4 + 103) > 0.35;

            fCtx.fillStyle = isBright
              ? `rgba(255, 255, 255, ${0.65 + frostSeverity * 0.32})`
              : `rgba(186, 230, 253, ${0.55 + frostSeverity * 0.3})`;
            fCtx.beginPath();
            // Faceted diamond crystal grain
            fCtx.moveTo(gx, gy - gSize);
            fCtx.lineTo(gx + gSize * 0.85, gy);
            fCtx.lineTo(gx, gy + gSize);
            fCtx.lineTo(gx - gSize * 0.85, gy);
            fCtx.closePath();
            fCtx.fill();
          }

          if (isDeepFreeze) {
            // Extra crisp frost needles for deep freeze (-8°C and colder)
            fCtx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
            fCtx.lineWidth = 0.26;
            for (let i = 0; i < 16; i++) {
              const nx = (pseudoRand(i * 3 + 200) - 0.5) * boundsRadius * 1.6;
              const ny = (pseudoRand(i * 3 + 201) - 0.5) * boundsRadius * 1.6;
              const na = pseudoRand(i * 3 + 202) * Math.PI * 2;
              const nl = 0.55 + pseudoRand(i * 3 + 203) * 0.75;
              fCtx.beginPath();
              fCtx.moveTo(nx - Math.cos(na) * nl, ny - Math.sin(na) * nl);
              fCtx.lineTo(nx + Math.cos(na) * nl, ny + Math.sin(na) * nl);
              fCtx.stroke();
            }
          }
        } else {
          // Chilled condensation micro-droplets (0°C < T <= 5°C) strictly inside model silhouette
          const dropCount = Math.floor(6 + frostSeverity * 8);
          for (let i = 0; i < dropCount; i++) {
            const dx = (pseudoRand(i * 3 + 1) - 0.5) * boundsRadius * 1.5;
            const dy = (pseudoRand(i * 3 + 2) - 0.5) * boundsRadius * 1.5;
            const r = 0.38 + pseudoRand(i * 3 + 3) * 0.45;

            fCtx.fillStyle = 'rgba(14, 116, 144, 0.22)';
            fCtx.beginPath();
            fCtx.arc(dx + 0.12, dy + 0.16, r, 0, Math.PI * 2);
            fCtx.fill();

            fCtx.fillStyle = 'rgba(186, 230, 253, 0.72)';
            fCtx.beginPath();
            fCtx.arc(dx, dy, r, 0, Math.PI * 2);
            fCtx.fill();

            fCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            fCtx.beginPath();
            fCtx.arc(dx - r * 0.32, dy - r * 0.32, r * 0.35, 0, Math.PI * 2);
            fCtx.fill();
          }
        }
        fCtx.restore();

        // 4. Clip ALL frost veins, crystals, and glaze strictly to the exact item model silhouette!
        fCtx.setTransform(1, 0, 0, 1, 0, 0);
        fCtx.globalCompositeOperation = 'destination-in';
        fCtx.drawImage(silhouette, 0, 0);

        // 5. Composite the model-conforming frost layer onto the target canvas
        ctx.save();
        ctx.drawImage(frost, -halfSpan, -halfSpan, FROST_WORLD_SPAN, FROST_WORLD_SPAN);
        ctx.restore();
        return;
      }
    }
  }

  // === HOT STEAM RENDERER (T >= 60°C) ===
  else if (temp >= 60.0) {
    ctx.save();
    const heatFactor = Math.min(1.0, (temp - 60.0) / 30.0);
    const steamAlpha = 0.35 + heatFactor * 0.4;

    ctx.strokeStyle = `rgba(248, 250, 252, ${steamAlpha})`;
    ctx.lineWidth = 1.0;
    ctx.lineCap = 'round';

    // 2-3 rising curly steam wisps above the item
    for (let s = -1; s <= 1; s++) {
      const sx = s * 3.5;
      const sy = -boundsRadius * 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + (s === 0 ? 1.5 : -1.5), sy - 3.5, sx - (s === 0 ? 1.5 : -1.5), sy - 7.0, sx + s * 0.8, sy - 10.5);
      ctx.stroke();
    }

    ctx.restore();
  }
}

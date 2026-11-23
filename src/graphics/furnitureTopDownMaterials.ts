// Shared photorealistic 2D Canvas material, lighting & geometry helpers
// for exact 90-degree orthographic top-down furniture models.

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const colorCache = new Map<string, RGB>();

export function parseColor(hex: string | undefined, fallback = '#64748b'): RGB {
  const key = hex && hex.trim() ? hex.trim() : fallback;
  const cached = colorCache.get(key);
  if (cached) return cached;

  let h = key.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    const fb = parseColor(fallback, '#64748b');
    colorCache.set(key, fb);
    return fb;
  }
  const rgb: RGB = {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
  colorCache.set(key, rgb);
  return rgb;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function rgbCss(c: RGB, alpha = 1): string {
  if (alpha >= 0.999) return `rgb(${clampByte(c.r)},${clampByte(c.g)},${clampByte(c.b)})`;
  return `rgba(${clampByte(c.r)},${clampByte(c.g)},${clampByte(c.b)},${alpha.toFixed(3)})`;
}

/** Positive amount lightens toward warm white, negative darkens toward cool deep shadow */
export function shade(hex: string | undefined, amount: number, fallback = '#64748b', alpha = 1): string {
  const c = parseColor(hex, fallback);
  if (amount >= 0) {
    return rgbCss(
      {
        r: c.r + (255 - c.r) * amount,
        g: c.g + (253 - c.g) * amount,
        b: c.b + (248 - c.b) * amount,
      },
      alpha
    );
  }
  const f = 1 + amount;
  return rgbCss(
    {
      r: c.r * f,
      g: c.g * f,
      b: c.b * (f * 1.03),
    },
    alpha
  );
}

export function mix(hexA: string, hexB: string, t: number, alpha = 1): string {
  const a = parseColor(hexA);
  const b = parseColor(hexB);
  const k = Math.max(0, Math.min(1, t));
  return rgbCss(
    {
      r: a.r + (b.r - a.r) * k,
      g: a.g + (b.g - a.g) * k,
      b: a.b + (b.b - a.b) * k,
    },
    alpha
  );
}

export function getLuminance(hex: string | undefined, fallback = '#64748b'): number {
  const c = parseColor(hex, fallback);
  return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
}

export function isLightColor(hex: string | undefined): boolean {
  return getLuminance(hex) > 0.78;
}

export function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const safeW = Math.max(0.05, w);
  const safeH = Math.max(0.05, h);
  const rad = Math.max(0, Math.min(r, safeW * 0.49, safeH * 0.49));
  ctx.beginPath();
  ctx.roundRect(x, y, safeW, safeH, rad);
}

/**
 * Multi-pass soft top-down ambient contact shadow (zero GPU shadowBlur cost).
 * Light comes consistently from upper-left (-45 deg), casting soft shadow toward lower-right (+x, +y).
 */
export function drawRectContactShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 1.2,
  elevation = 1.0
) {
  const ox = 0.55 * elevation;
  const oy = 0.7 * elevation;
  const spread = 0.55 * elevation;

  // Soft outer cast shadow
  ctx.fillStyle = 'rgba(7, 11, 22, 0.13)';
  rr(ctx, x + ox - spread * 0.35, y + oy - spread * 0.25, w + spread * 1.15, h + spread * 1.15, radius + spread * 0.6);
  ctx.fill();

  // Tighter dark ambient occlusion immediately beneath base perimeter
  ctx.fillStyle = 'rgba(7, 11, 22, 0.22)';
  rr(ctx, x + ox * 0.45, y + oy * 0.55, w + spread * 0.3, h + spread * 0.35, radius + 0.2);
  ctx.fill();
}

export function drawEllipseContactShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  elevation = 1.0
) {
  const ox = 0.6 * elevation;
  const oy = 0.75 * elevation;
  const sp = 0.45 * elevation;

  ctx.fillStyle = 'rgba(7, 11, 22, 0.13)';
  ctx.beginPath();
  ctx.ellipse(cx + ox, cy + oy, Math.max(0.2, rx + sp), Math.max(0.2, ry + sp), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(7, 11, 22, 0.23)';
  ctx.beginPath();
  ctx.ellipse(cx + ox * 0.4, cy + oy * 0.45, Math.max(0.2, rx + sp * 0.25), Math.max(0.2, ry + sp * 0.25), 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Crisp top-left sunlit bevel & bottom-right shadow rim */
export function drawArchitecturalBevel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 0.8,
  highlightAlpha = 0.28,
  shadowAlpha = 0.36,
  lineWidth = 0.45
) {
  ctx.save();
  ctx.lineWidth = lineWidth;
  rr(ctx, x, y, w, h, radius);
  ctx.strokeStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.stroke();

  // Inner NW specular catch-light
  if (w > 2 && h > 2) {
    const inset = lineWidth * 0.7;
    ctx.strokeStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
    ctx.beginPath();
    ctx.moveTo(x + inset, y + h - Math.max(radius, 1));
    ctx.lineTo(x + inset, y + Math.max(radius, 0.6));
    ctx.quadraticCurveTo(x + inset, y + inset, x + Math.max(radius, 0.6), y + inset);
    ctx.lineTo(x + w - Math.max(radius, 1), y + inset);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Photorealistic polished hardwood / veneer top surface with directional satin sheen,
 * plank join lines, organic wavy woodgrain fibers, and chamfered edge lighting.
 */
export function drawWoodSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  baseHex: string,
  radius = 0.8,
  horizontalGrain = true,
  plankCount = 0
) {
  ctx.save();
  rr(ctx, x, y, w, h, radius);
  const grad = ctx.createLinearGradient(x, y, x + w * 0.85, y + h);
  grad.addColorStop(0, shade(baseHex, 0.18));
  grad.addColorStop(0.42, baseHex);
  grad.addColorStop(1, shade(baseHex, -0.24));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();

  // Subtle plank seams if requested
  if (plankCount > 1) {
    ctx.strokeStyle = shade(baseHex, -0.45, baseHex, 0.42);
    ctx.lineWidth = Math.max(0.28, Math.min(w, h) * 0.018);
    ctx.beginPath();
    if (horizontalGrain) {
      for (let i = 1; i < plankCount; i++) {
        const py = y + (h * i) / plankCount;
        ctx.moveTo(x, py);
        ctx.lineTo(x + w, py);
      }
    } else {
      for (let i = 1; i < plankCount; i++) {
        const px = x + (w * i) / plankCount;
        ctx.moveTo(px, y);
        ctx.lineTo(px, y + h);
      }
    }
    ctx.stroke();
  }

  // Organic curved woodgrain fibers (deterministic — no flicker!)
  const span = horizontalGrain ? h : w;
  const len = horizontalGrain ? w : h;
  const step = Math.max(1.1, span / 9);
  ctx.lineWidth = Math.max(0.25, Math.min(0.55, span * 0.025));

  let idx = 0;
  for (let p = step * 0.5; p < span - step * 0.3; p += step) {
    idx++;
    const wave = ((idx * 37) % 7 - 3) * 0.16 * step;
    const isLightFiber = idx % 3 === 0;
    ctx.strokeStyle = isLightFiber
      ? shade(baseHex, 0.28, baseHex, 0.14)
      : shade(baseHex, -0.42, baseHex, 0.19);
    ctx.beginPath();
    if (horizontalGrain) {
      ctx.moveTo(x, y + p);
      ctx.bezierCurveTo(
        x + len * 0.33,
        y + p + wave,
        x + len * 0.67,
        y + p - wave * 0.85,
        x + len,
        y + p + wave * 0.3
      );
    } else {
      ctx.moveTo(x + p, y);
      ctx.bezierCurveTo(
        x + p + wave,
        y + len * 0.33,
        x + p - wave * 0.85,
        y + len * 0.67,
        x + p + wave * 0.3,
        y + len
      );
    }
    ctx.stroke();
  }

  // Soft satin lacquer diagonal reflection
  const sheen = ctx.createLinearGradient(x, y, x + w * 0.5, y + h * 0.6);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  sheen.addColorStop(0.55, 'rgba(255, 255, 255, 0.02)');
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  drawArchitecturalBevel(ctx, x, y, w, h, radius, 0.26, 0.42, Math.max(0.35, Math.min(0.65, Math.min(w, h) * 0.03)));
}

/**
 * Plush upholstered top-down fabric/leather cushion with dome volume,
 * stitched piping perimeter, soft center contour, and optional button tufting.
 */
export function drawUpholsteredCushion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  baseHex: string,
  radius = 1.6,
  opts?: {
    tufts?: number;
    piping?: boolean;
    crease?: boolean;
    leather?: boolean;
  }
) {
  const cx = x + w * 0.46;
  const cy = y + h * 0.44;
  const maxR = Math.max(w, h) * 0.72;

  ctx.save();
  rr(ctx, x, y, w, h, radius);
  const grad = ctx.createRadialGradient(cx, cy, maxR * 0.06, x + w * 0.5, y + h * 0.5, maxR);
  grad.addColorStop(0, shade(baseHex, opts?.leather ? 0.28 : 0.18));
  grad.addColorStop(0.62, baseHex);
  grad.addColorStop(1, shade(baseHex, -0.32));
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.clip();

  // Soft ambient darkening near bottom-right rim for puffy 3D pillowiness
  const rimGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.13)');
  rimGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.24)');
  ctx.fillStyle = rimGrad;
  ctx.fillRect(x, y, w, h);

  // Subtle fabric crease lines
  if (opts?.crease && w > 4 && h > 4) {
    ctx.strokeStyle = shade(baseHex, -0.45, baseHex, 0.2);
    ctx.lineWidth = Math.max(0.28, Math.min(w, h) * 0.03);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.18, y + h * 0.32);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.42, x + w * 0.82, y + h * 0.28);
    ctx.stroke();
  }

  // Tufting dimples
  if (opts?.tufts && opts.tufts > 0) {
    const count = opts.tufts;
    const isHoriz = w >= h;
    for (let i = 0; i < count; i++) {
      const tx = isHoriz ? x + (w * (i + 0.5)) / count : x + w * 0.5;
      const ty = isHoriz ? y + h * 0.5 : y + (h * (i + 0.5)) / count;
      const dimpleR = Math.max(0.45, Math.min(w, h) * 0.11);
      // Soft dimple shadow
      const dg = ctx.createRadialGradient(tx, ty, 0.1, tx, ty, dimpleR * 2.2);
      dg.addColorStop(0, 'rgba(0,0,0,0.42)');
      dg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(tx, ty, dimpleR * 2.2, 0, Math.PI * 2);
      ctx.fill();
      // Covered button
      ctx.fillStyle = shade(baseHex, -0.18);
      ctx.beginPath();
      ctx.arc(tx, ty, dimpleR * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Inner stitched piping seam
  if (opts?.piping !== false && w > 3 && h > 3) {
    const inset = Math.max(0.45, Math.min(1.0, Math.min(w, h) * 0.08));
    rr(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, Math.max(0.3, radius - inset * 0.6));
    ctx.strokeStyle = shade(baseHex, 0.32, baseHex, 0.26);
    ctx.lineWidth = Math.max(0.25, Math.min(0.45, Math.min(w, h) * 0.025));
    ctx.stroke();
  }
  ctx.restore();

  // Outer seam shadow
  rr(ctx, x, y, w, h, radius);
  ctx.strokeStyle = shade(baseHex, -0.52, baseHex, 0.65);
  ctx.lineWidth = Math.max(0.3, Math.min(0.55, Math.min(w, h) * 0.03));
  ctx.stroke();
}

/**
 * Brushed stainless steel / anodized aluminum / powder-coated metal top surface.
 */
export function drawBrushedMetal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  baseHex = '#cbd5e1',
  radius = 0.7,
  vertical = false
) {
  ctx.save();
  rr(ctx, x, y, w, h, radius);
  const grad = vertical
    ? ctx.createLinearGradient(x, y, x, y + h)
    : ctx.createLinearGradient(x, y, x + w, y + h * 0.4);
  grad.addColorStop(0, shade(baseHex, 0.28));
  grad.addColorStop(0.28, shade(baseHex, 0.05));
  grad.addColorStop(0.54, shade(baseHex, 0.22));
  grad.addColorStop(0.82, shade(baseHex, -0.14));
  grad.addColorStop(1, shade(baseHex, -0.26));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();

  // Fine brushed metallic hairlines
  const lum = getLuminance(baseHex);
  ctx.strokeStyle = lum > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.3;
  const span = vertical ? w : h;
  const step = Math.max(0.9, span / 8);
  ctx.beginPath();
  for (let p = step * 0.5; p < span; p += step) {
    if (vertical) {
      ctx.moveTo(x + p, y);
      ctx.lineTo(x + p, y + h);
    } else {
      ctx.moveTo(x, y + p);
      ctx.lineTo(x + w, y + p);
    }
  }
  ctx.stroke();
  ctx.restore();

  drawArchitecturalBevel(ctx, x, y, w, h, radius, 0.38, 0.38, Math.max(0.32, Math.min(0.55, Math.min(w, h) * 0.03)));
}

/**
 * Glossy tempered glass panel with subtle tint and crisp specular diagonal reflections.
 */
export function drawGlassPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tintHex = '#0f172a',
  radius = 0.6,
  opacity = 0.92
) {
  ctx.save();
  rr(ctx, x, y, w, h, radius);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, shade(tintHex, 0.16, tintHex, opacity));
  grad.addColorStop(0.5, shade(tintHex, 0, tintHex, opacity));
  grad.addColorStop(1, shade(tintHex, -0.22, tintHex, opacity));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();

  // Sharp primary specular streak
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.12, y);
  ctx.lineTo(x + w * 0.34, y);
  ctx.lineTo(x + w * 0.06, y + h);
  ctx.lineTo(x - w * 0.12, y + h);
  ctx.closePath();
  ctx.fill();

  // Secondary thin specular highlight
  ctx.fillStyle = 'rgba(224, 242, 254, 0.14)';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.44, y);
  ctx.lineTo(x + w * 0.52, y);
  ctx.lineTo(x + w * 0.24, y + h);
  ctx.lineTo(x + w * 0.16, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  rr(ctx, x, y, w, h, radius);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 0.35;
  ctx.stroke();
}

/** Polished chrome / brass hardware pull bar along a cabinet front edge */
export function drawCabinetPull(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  metallicHex = '#d4af37'
) {
  // Tiny cast shadow beneath handle
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  rr(ctx, x + 0.15, y + 0.25, w, h, Math.min(w, h) * 0.45);
  ctx.fill();

  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, shade(metallicHex, 0.45));
  g.addColorStop(0.5, metallicHex);
  g.addColorStop(1, shade(metallicHex, -0.35));
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, Math.min(w, h) * 0.45);
  ctx.fill();
}

/** Top-down glossy chrome mixer faucet (facing +Y toward basin center by default) */
export function drawChromeFaucet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  mountY: number,
  spoutLength: number,
  scale = 1,
  directionY = 1
) {
  const baseR = Math.max(0.55, 0.85 * scale);
  // Escutcheon base plate
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.arc(cx + 0.15, mountY + 0.2, baseR * 1.15, 0, Math.PI * 2);
  ctx.fill();

  const baseG = ctx.createRadialGradient(cx - baseR * 0.3, mountY - baseR * 0.3, 0.1, cx, mountY, baseR);
  baseG.addColorStop(0, '#ffffff');
  baseG.addColorStop(0.55, '#cbd5e1');
  baseG.addColorStop(1, '#475569');
  ctx.fillStyle = baseG;
  ctx.beginPath();
  ctx.arc(cx, mountY, baseR, 0, Math.PI * 2);
  ctx.fill();

  // Spout shadow
  const sw = Math.max(0.45, 0.65 * scale);
  const sy = directionY > 0 ? mountY : mountY - spoutLength;
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  rr(ctx, cx - sw * 0.5 + 0.2, sy + 0.25, sw, spoutLength, sw * 0.45);
  ctx.fill();

  // Spout chrome barrel
  const spG = ctx.createLinearGradient(cx - sw * 0.5, 0, cx + sw * 0.5, 0);
  spG.addColorStop(0, '#94a3b8');
  spG.addColorStop(0.42, '#ffffff');
  spG.addColorStop(1, '#475569');
  ctx.fillStyle = spG;
  rr(ctx, cx - sw * 0.5, sy, sw, spoutLength, sw * 0.45);
  ctx.fill();

  // Single-lever handle cap + red/blue dots
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(cx, mountY, baseR * 0.55, 0, Math.PI * 2);
  ctx.fill();

  const dotR = Math.max(0.18, 0.22 * scale);
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(cx - baseR * 1.15, mountY, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(cx + baseR * 1.15, mountY, dotR, 0, Math.PI * 2);
  ctx.fill();
}

/** Realistic top-down potted foliage cluster helper */
export function drawBotanicalLeaf(
  ctx: CanvasRenderingContext2D,
  length: number,
  width: number,
  colorDark: string,
  colorLight: string,
  splitNotches = false
) {
  // Subtle drop shadow under leaf
  ctx.fillStyle = 'rgba(5, 20, 10, 0.24)';
  ctx.beginPath();
  ctx.moveTo(0.2, 0.3);
  ctx.bezierCurveTo(length * 0.32, -width * 0.95 + 0.3, length * 0.78, -width * 0.65 + 0.3, length + 0.2, 0.3);
  ctx.bezierCurveTo(length * 0.78, width * 0.65 + 0.3, length * 0.32, width * 0.95 + 0.3, 0.2, 0.3);
  ctx.fill();

  const lg = ctx.createLinearGradient(0, -width * 0.7, length, width * 0.7);
  lg.addColorStop(0, colorDark);
  lg.addColorStop(0.45, colorLight);
  lg.addColorStop(1, shade(colorDark, -0.15));

  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  if (splitNotches) {
    // Monstera lobed leaf silhouette
    ctx.bezierCurveTo(length * 0.22, -width * 0.85, length * 0.42, -width * 0.9, length * 0.48, -width * 0.42);
    ctx.lineTo(length * 0.56, -width * 0.82);
    ctx.bezierCurveTo(length * 0.74, -width * 0.72, length * 0.9, -width * 0.35, length, 0);
    ctx.bezierCurveTo(length * 0.9, width * 0.35, length * 0.74, width * 0.72, length * 0.56, width * 0.82);
    ctx.lineTo(length * 0.48, width * 0.42);
    ctx.bezierCurveTo(length * 0.42, width * 0.9, length * 0.22, width * 0.85, 0, 0);
  } else {
    ctx.bezierCurveTo(length * 0.3, -width * 0.92, length * 0.78, -width * 0.65, length, 0);
    ctx.bezierCurveTo(length * 0.78, width * 0.65, length * 0.3, width * 0.92, 0, 0);
  }
  ctx.closePath();
  ctx.fill();

  // Glossy upper-half specular highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.beginPath();
  ctx.moveTo(length * 0.08, 0);
  ctx.bezierCurveTo(length * 0.32, -width * 0.62, length * 0.72, -width * 0.42, length * 0.94, 0);
  ctx.closePath();
  ctx.fill();

  // Central midrib vein & subtle lateral ribs
  ctx.strokeStyle = 'rgba(220, 252, 231, 0.42)';
  ctx.lineWidth = Math.max(0.22, width * 0.09);
  ctx.beginPath();
  ctx.moveTo(length * 0.04, 0);
  ctx.lineTo(length * 0.9, 0);
  ctx.stroke();

  if (length > 2.2) {
    ctx.strokeStyle = 'rgba(20, 83, 45, 0.35)';
    ctx.lineWidth = Math.max(0.18, width * 0.06);
    ctx.beginPath();
    for (let t = 0.28; t <= 0.72; t += 0.22) {
      ctx.moveTo(length * t, 0);
      ctx.lineTo(length * (t + 0.16), -width * 0.48);
      ctx.moveTo(length * t, 0);
      ctx.lineTo(length * (t + 0.16), width * 0.48);
    }
    ctx.stroke();
  }
}

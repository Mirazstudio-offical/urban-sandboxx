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

// ============================================================================
// Shared Photorealistic Studio Shading & Texture Helpers (Zero allocations/frame)
// ============================================================================

export function hash01(seed: string | number, salt: number = 0): number {
  let h = 2166136261 >>> 0;
  if (typeof seed === 'number') {
    h ^= (Math.imul(seed | 0, 374761393) >>> 0);
  } else {
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
  }
  h ^= Math.imul((salt + 1) | 0, 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function parseHexRgb(hex: string): [number, number, number] {
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHexRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function adjustHex(hex: string, amount: number): string {
  const [r, g, b] = parseHexRgb(hex);
  const f = (c: number) => {
    const v = amount >= 0 ? c + (255 - c) * amount : c * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

export function mixHex(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = parseHexRgb(hexA);
  const [r2, g2, b2] = parseHexRgb(hexB);
  const u = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(r1 + (r2 - r1) * u)}, ${Math.round(g1 + (g2 - g1) * u)}, ${Math.round(b1 + (b2 - b1) * u)})`;
}

export function drawOrganicBlobPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  irregularity: number = 0.08,
  points: number = 10
) {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const jitter = 1 + (hash01(seed, i * 3 + 1) - 0.5) * 2 * irregularity;
    pts.push([
      cx + Math.cos(a) * rx * jitter,
      cy + Math.sin(a) * ry * jitter
    ]);
  }
  ctx.beginPath();
  const last = pts[points - 1];
  const first = pts[0];
  ctx.moveTo((last[0] + first[0]) * 0.5, (last[1] + first[1]) * 0.5);
  for (let i = 0; i < points; i++) {
    const cur = pts[i];
    const nxt = pts[(i + 1) % points];
    ctx.quadraticCurveTo(cur[0], cur[1], (cur[0] + nxt[0]) * 0.5, (cur[1] + nxt[1]) * 0.5);
  }
  ctx.closePath();
}

export function drawLitSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  highlightColor: string,
  midColor: string,
  shadowColor: string,
  bounceColor?: string,
  specAlpha: number = 0.72
) {
  const grad = ctx.createRadialGradient(
    cx - r * 0.34,
    cy - r * 0.34,
    r * 0.06,
    cx + r * 0.08,
    cy + r * 0.08,
    r * 1.05
  );
  grad.addColorStop(0.0, highlightColor);
  grad.addColorStop(0.45, midColor);
  grad.addColorStop(0.86, shadowColor);
  grad.addColorStop(1.0, bounceColor || shadowColor);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (specAlpha > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${specAlpha})`;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.32, cy - r * 0.35, Math.max(0.25, r * 0.24), Math.max(0.18, r * 0.14), -0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawLitEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot: number,
  highlightColor: string,
  midColor: string,
  shadowColor: string,
  bounceColor?: string,
  specAlpha: number = 0.5
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(1, ry / Math.max(0.1, rx));
  drawLitSphere(ctx, 0, 0, rx, highlightColor, midColor, shadowColor, bounceColor, specAlpha);
  ctx.restore();
}

export function drawBotanicalLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  width: number,
  angle: number,
  lightColor: string = '#84cc16',
  darkColor: string = '#365314',
  veinColor: string = 'rgba(236, 252, 203, 0.55)'
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Leaf upper & lower half fold
  const grad = ctx.createLinearGradient(0, -width, len, width);
  grad.addColorStop(0, darkColor);
  grad.addColorStop(0.45, lightColor);
  grad.addColorStop(1, darkColor);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.28, -width, len * 0.72, -width * 0.85, len, 0);
  ctx.bezierCurveTo(len * 0.72, width * 0.85, len * 0.28, width, 0, 0);
  ctx.closePath();
  ctx.fill();

  // Subtle dark lower-half fold for botanical 3D leaf crease
  ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len, 0);
  ctx.bezierCurveTo(len * 0.72, width * 0.85, len * 0.28, width, 0, 0);
  ctx.closePath();
  ctx.fill();

  // Midrib and herringbone lateral veins
  ctx.strokeStyle = veinColor;
  ctx.lineWidth = Math.max(0.22, len * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(len * 0.04, 0);
  ctx.lineTo(len * 0.9, 0);
  for (let i = 1; i <= 3; i++) {
    const t = i * 0.22;
    const vx = len * t;
    const vw = width * Math.sin(t * Math.PI) * 0.58;
    ctx.moveTo(vx, 0);
    ctx.lineTo(vx + len * 0.12, -vw);
    ctx.moveTo(vx, 0);
    ctx.lineTo(vx + len * 0.12, vw);
  }
  ctx.stroke();

  ctx.restore();
}

export function drawMetalCanLid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  hasPullTab: boolean = true,
  tintHex: string = '#cbd5e1'
) {
  ctx.save();
  const darkRim = adjustHex(tintHex, -0.45);
  const midRim = tintHex;
  const lightRim = adjustHex(tintHex, 0.55);

  // Under-seam micro shadow lip
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + Math.max(0.28, ry * 0.14), rx * 1.01, ry * 1.02, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rolled double-seam outer rim
  const rimGrad = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy);
  rimGrad.addColorStop(0.0, darkRim);
  rimGrad.addColorStop(0.18, lightRim);
  rimGrad.addColorStop(0.42, midRim);
  rimGrad.addColorStop(0.75, darkRim);
  rimGrad.addColorStop(0.92, lightRim);
  rimGrad.addColorStop(1.0, darkRim);
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Recessed countersink dish
  ctx.fillStyle = adjustHex(tintHex, -0.32);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.89, ry * 0.83, 0, 0, Math.PI * 2);
  ctx.fill();

  // Anisotropic brushed metal lid face
  const innerGrad = ctx.createRadialGradient(cx - rx * 0.25, cy - ry * 0.25, 0.15, cx, cy, rx);
  innerGrad.addColorStop(0.0, '#ffffff');
  innerGrad.addColorStop(0.32, lightRim);
  innerGrad.addColorStop(0.72, midRim);
  innerGrad.addColorStop(1.0, darkRim);
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + ry * 0.05, rx * 0.84, ry * 0.77, 0, 0, Math.PI * 2);
  ctx.fill();

  // Concentric stamped expansion rings
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.26)';
  ctx.lineWidth = 0.28;
  ctx.beginPath();
  ctx.ellipse(cx, cy + ry * 0.04, rx * 0.68, ry * 0.60, 0, 0, Math.PI * 2);
  ctx.ellipse(cx, cy + ry * 0.04, rx * 0.48, ry * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 0.22;
  ctx.beginPath();
  ctx.ellipse(cx, cy - ry * 0.02, rx * 0.67, ry * 0.59, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  if (hasPullTab) {
    // Easy-open scored tear-panel contour
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.16, cy + ry * 0.06, rx * 0.36, ry * 0.34, -0.1, 0, Math.PI * 2);
    ctx.stroke();

    // Tab drop shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.36)';
    ctx.beginPath();
    ctx.ellipse(cx + rx * 0.2, cy + ry * 0.14, rx * 0.26, ry * 0.31, 0.24, 0, Math.PI * 2);
    ctx.fill();

    // Brushed stay-on tab body
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.22;
    ctx.beginPath();
    ctx.ellipse(cx + rx * 0.18, cy + ry * 0.04, rx * 0.25, ry * 0.28, 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Finger loop cutout inside pull tab
    ctx.fillStyle = adjustHex(tintHex, -0.18);
    ctx.beginPath();
    ctx.ellipse(cx + rx * 0.24, cy + ry * 0.06, rx * 0.12, ry * 0.14, 0.24, 0, Math.PI * 2);
    ctx.fill();

    // Center stamped rivet stud
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(cx + rx * 0.01, cy + ry * 0.04, Math.max(0.32, rx * 0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx - 0.05, cy - 0.04, Math.max(0.18, rx * 0.045), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawGlassJarShell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  lidColorTop: string = '#d97706',
  lidColorEdge: string = '#78350f',
  drawContents?: () => void
) {
  ctx.save();
  // 1. Back glass refraction tint
  const glassBack = ctx.createLinearGradient(x, y, x + w, y);
  glassBack.addColorStop(0.0, 'rgba(148, 163, 184, 0.72)');
  glassBack.addColorStop(0.16, 'rgba(241, 245, 249, 0.85)');
  glassBack.addColorStop(0.5, 'rgba(226, 232, 240, 0.45)');
  glassBack.addColorStop(0.84, 'rgba(241, 245, 249, 0.72)');
  glassBack.addColorStop(1.0, 'rgba(100, 116, 139, 0.78)');

  ctx.fillStyle = glassBack;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();

  // 2. Clipped inner wall contents (preserves/brine/honey/pickles)
  if (drawContents) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 0.62, y + 0.85, w - 1.24, h - 1.75, Math.max(0.45, r - 0.45));
    ctx.clip();
    drawContents();

    // Cylindrical depth shading over contents so contents feel nestled behind curved glass
    const cylShade = ctx.createLinearGradient(x, y, x + w, y);
    cylShade.addColorStop(0.0, 'rgba(15, 23, 42, 0.28)');
    cylShade.addColorStop(0.14, 'rgba(15, 23, 42, 0.04)');
    cylShade.addColorStop(0.32, 'rgba(255, 255, 255, 0.08)');
    cylShade.addColorStop(0.75, 'rgba(15, 23, 42, 0.04)');
    cylShade.addColorStop(1.0, 'rgba(15, 23, 42, 0.34)');
    ctx.fillStyle = cylShade;
    ctx.fillRect(x, y, w, h);

    // Upper headspace air-gap meniscus rim inside top of jar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(x, y + 0.6, w, 0.9);
    ctx.restore();
  }

  // 3. Thick refractive glass bottom punt with curved caustic glow
  const puntGrad = ctx.createLinearGradient(x, y + h - 1.5, x, y + h);
  puntGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.16)');
  puntGrad.addColorStop(0.45, 'rgba(241, 245, 249, 0.52)');
  puntGrad.addColorStop(1.0, 'rgba(100, 116, 139, 0.58)');
  ctx.fillStyle = puntGrad;
  ctx.beginPath();
  ctx.roundRect(x + 0.35, y + h - 1.45, w - 0.7, 1.35, 0.55);
  ctx.fill();

  // 4. Crisp Fresnel softbox reflection pillar + narrow rim catchlight
  const specGrad = ctx.createLinearGradient(x + 0.75, y, x + 2.25, y);
  specGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.15)');
  specGrad.addColorStop(0.38, 'rgba(255, 255, 255, 0.68)');
  specGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.roundRect(x + 0.82, y + 1.1, 1.45, h - 2.3, 0.4);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.fillRect(x + w - 1.25, y + 1.4, 0.42, h - 2.8);

  // Double-wall glass edge outline
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
  ctx.lineWidth = 0.42;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
  ctx.lineWidth = 0.25;
  ctx.beginPath();
  ctx.roundRect(x + 0.35, y + 0.35, w - 0.7, h - 0.7, Math.max(0.35, r - 0.3));
  ctx.stroke();

  // 5. Glass shoulder neck collar & molded lug ring
  const neckW = w - 1.4;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
  ctx.beginPath();
  ctx.roundRect(x + 0.7, y - 0.85, neckW, 1.05, 0.35);
  ctx.fill();

  // 6. Cast contact shadow directly under lid skirt
  ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
  ctx.fillRect(x + 0.3, y - 0.45, w - 0.6, 0.45);

  // 7. Realistic twist-off enameled steel lid with top chamfer & knurl ribs
  const lidW = w + 0.7;
  const lidX = x - 0.35;
  const lidY = y - 2.65;
  const lidH = 2.35;
  const lGrad = ctx.createLinearGradient(lidX, lidY, lidX + lidW, lidY);
  lGrad.addColorStop(0.0, lidColorEdge);
  lGrad.addColorStop(0.18, adjustHex(lidColorTop, 0.38));
  lGrad.addColorStop(0.35, lidColorTop);
  lGrad.addColorStop(0.75, lidColorEdge);
  lGrad.addColorStop(0.92, adjustHex(lidColorTop, 0.15));
  lGrad.addColorStop(1.0, lidColorEdge);
  ctx.fillStyle = lGrad;
  ctx.beginPath();
  ctx.roundRect(lidX, lidY, lidW, lidH, 0.65);
  ctx.fill();

  // Lid top rim highlight & safety vacuum button dimple
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(lidX + 0.5, lidY + 0.15, lidW - 1.0, 0.42);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.lineWidth = 0.26;
  for (let kx = lidX + 0.7; kx <= lidX + lidW - 0.7; kx += 0.9) {
    ctx.beginPath();
    ctx.moveTo(kx, lidY + 0.55);
    ctx.lineTo(kx, lidY + lidH - 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

// ============================================================================
// Premium Studio Packaging Primitives (Pouch, Paper, Label, Caps, Metal, Glass)
// ============================================================================

export function applyCylinderLightingOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  glossStrength: number = 0.28,
  shadowStrength: number = 0.36
) {
  ctx.save();
  const cGrad = ctx.createLinearGradient(x, y, x + w, y);
  cGrad.addColorStop(0.0, `rgba(15, 23, 42, ${shadowStrength * 0.85})`);
  cGrad.addColorStop(0.16, 'rgba(255, 255, 255, 0.05)');
  cGrad.addColorStop(0.28, `rgba(255, 255, 255, ${glossStrength})`);
  cGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.04)');
  cGrad.addColorStop(0.82, `rgba(15, 23, 42, ${shadowStrength * 0.55})`);
  cGrad.addColorStop(0.94, `rgba(15, 23, 42, ${shadowStrength})`);
  cGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.12)');
  ctx.fillStyle = cGrad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function drawCrimpedSeal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  baseHex: string,
  verticalTeeth: boolean = true,
  pitch: number = 0.82
) {
  ctx.save();
  const sGrad = verticalTeeth
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x, y, x, y + h);
  sGrad.addColorStop(0.0, adjustHex(baseHex, -0.34));
  sGrad.addColorStop(0.25, adjustHex(baseHex, 0.22));
  sGrad.addColorStop(0.55, baseHex);
  sGrad.addColorStop(0.85, adjustHex(baseHex, -0.28));
  sGrad.addColorStop(1.0, adjustHex(baseHex, -0.4));
  ctx.fillStyle = sGrad;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.lineWidth = 0.26;
  ctx.beginPath();
  if (verticalTeeth) {
    for (let cx = x + pitch * 0.5; cx < x + w - 0.2; cx += pitch) {
      ctx.moveTo(cx, y + 0.15);
      ctx.lineTo(cx, y + h - 0.15);
    }
  } else {
    for (let cy = y + pitch * 0.5; cy < y + h - 0.2; cy += pitch) {
      ctx.moveTo(x + 0.15, cy);
      ctx.lineTo(x + w - 0.15, cy);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  if (verticalTeeth) {
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
  } else {
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawMicroBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  inkColor: string = 'rgba(15, 23, 42, 0.78)',
  bgColor: string = 'rgba(255, 255, 255, 0.88)'
) {
  ctx.save();
  ctx.fillStyle = bgColor;
  ctx.fillRect(x - 0.25, y - 0.2, w + 0.5, h + 0.4);
  ctx.fillStyle = inkColor;
  const pattern = [0.18, 0.08, 0.24, 0.1, 0.14, 0.28, 0.08, 0.16, 0.2, 0.12];
  let cx = x;
  let idx = 0;
  while (cx < x + w - 0.15) {
    const bw = Math.min(x + w - cx, Math.max(0.16, w * pattern[idx % pattern.length] * 0.48));
    if (idx % 2 === 0) {
      ctx.fillRect(cx, y, bw, h);
    }
    cx += bw + Math.max(0.14, w * 0.06);
    idx++;
  }
  ctx.restore();
}

export interface StudioLabelOptions {
  paperColor?: string;
  bandColor?: string;
  accentColor?: string;
  inkColor?: string;
  goldFoil?: boolean;
  hasBarcode?: boolean;
  emblem?: 'circle' | 'crest' | 'diamond' | 'leaf' | 'none';
  cylindrical?: boolean;
}

export function drawStudioLabelPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: StudioLabelOptions = {}
) {
  const {
    paperColor = '#f8f5ec',
    bandColor = '#1e293b',
    accentColor = '#b45309',
    inkColor = '#1e293b',
    goldFoil = true,
    hasBarcode = true,
    emblem = 'crest',
    cylindrical = true
  } = opts;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(0.6, w * 0.06));
  ctx.clip();

  // Matte cotton/textured label stock
  ctx.fillStyle = paperColor;
  ctx.fillRect(x, y, w, h);

  // Header band
  const headerH = h * 0.34;
  ctx.fillStyle = bandColor;
  ctx.fillRect(x, y, w, headerH);

  // Crisp hairline gold/copper rule under header
  ctx.fillStyle = accentColor;
  ctx.fillRect(x, y + headerH, w, Math.max(0.28, h * 0.06));

  // Fine inner border rule
  ctx.strokeStyle = goldFoil ? accentColor : hexToRgba(inkColor, 0.35);
  ctx.lineWidth = 0.24;
  ctx.strokeRect(x + 0.32, y + 0.32, w - 0.64, h - 0.64);

  // Micro typographic header bars (clean crisp lines, never chunky cartoon blocks)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillRect(x + w * 0.18, y + headerH * 0.36, w * 0.64, Math.max(0.28, h * 0.08));

  // Center seal/emblem or crisp editorial layout
  const bodyY = y + headerH + h * 0.14;
  const bodyH = h - (bodyY - y);

  if (emblem !== 'none' && h >= 3.2) {
    const cx = x + w * 0.5;
    const cy = bodyY + bodyH * 0.36;
    const er = Math.min(w * 0.14, bodyH * 0.28);

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    if (emblem === 'diamond') {
      ctx.moveTo(cx, cy - er);
      ctx.lineTo(cx + er, cy);
      ctx.lineTo(cx, cy + er);
      ctx.lineTo(cx - er, cy);
      ctx.closePath();
    } else if (emblem === 'crest') {
      ctx.moveTo(cx - er, cy - er * 0.85);
      ctx.lineTo(cx + er, cy - er * 0.85);
      ctx.lineTo(cx + er * 0.85, cy + er * 0.3);
      ctx.quadraticCurveTo(cx, cy + er * 1.15, cx, cy + er * 1.15);
      ctx.quadraticCurveTo(cx, cy + er * 1.15, cx - er * 0.85, cy + er * 0.3);
      ctx.closePath();
    } else {
      ctx.arc(cx, cy, er, 0, Math.PI * 2);
    }
    ctx.fill();

    if (goldFoil) {
      ctx.strokeStyle = 'rgba(255, 251, 235, 0.65)';
      ctx.lineWidth = 0.2;
      ctx.stroke();
    }
  }

  // Lower subtle ingredient / spec rules
  ctx.fillStyle = hexToRgba(inkColor, 0.48);
  const lineY1 = y + h * 0.74;
  const lineY2 = y + h * 0.84;
  if (hasBarcode && w >= 6.5 && h >= 4.2) {
    ctx.fillRect(x + w * 0.1, lineY1, w * 0.42, 0.26);
    ctx.fillRect(x + w * 0.1, lineY2, w * 0.32, 0.24);
    drawMicroBarcode(ctx, x + w * 0.62, y + h * 0.66, w * 0.28, h * 0.22);
  } else {
    ctx.fillRect(x + w * 0.22, lineY1, w * 0.56, 0.26);
    ctx.fillRect(x + w * 0.28, lineY2, w * 0.44, 0.22);
  }

  if (cylindrical) {
    applyCylinderLightingOverlay(ctx, x, y, w, h, 0.24, 0.28);
  }
  ctx.restore();
}

export function drawScrewCap(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  w: number,
  h: number,
  baseHex: string,
  hasTamperRing: boolean = true
) {
  ctx.save();
  const x = cx - w * 0.5;
  // Tamper-evident break ring below cap
  if (hasTamperRing) {
    const ringH = Math.max(0.35, h * 0.22);
    const rGrad = ctx.createLinearGradient(x, y, x + w, y);
    rGrad.addColorStop(0.0, adjustHex(baseHex, -0.45));
    rGrad.addColorStop(0.3, adjustHex(baseHex, 0.12));
    rGrad.addColorStop(0.8, adjustHex(baseHex, -0.35));
    rGrad.addColorStop(1.0, adjustHex(baseHex, -0.5));
    ctx.fillStyle = rGrad;
    ctx.fillRect(x - 0.1, y + h - ringH * 0.5, w + 0.2, ringH);
  }

  // Cap cylindrical gradient
  const cGrad = ctx.createLinearGradient(x, y, x + w, y);
  cGrad.addColorStop(0.0, adjustHex(baseHex, -0.42));
  cGrad.addColorStop(0.24, adjustHex(baseHex, 0.36));
  cGrad.addColorStop(0.5, baseHex);
  cGrad.addColorStop(0.84, adjustHex(baseHex, -0.38));
  cGrad.addColorStop(1.0, adjustHex(baseHex, -0.2));
  ctx.fillStyle = cGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(0.55, h * 0.28));
  ctx.fill();

  // Top bevel edge highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.fillRect(x + 0.25, y + 0.12, w - 0.5, Math.max(0.22, h * 0.16));

  // Fine vertical grip knurls
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.26)';
  ctx.lineWidth = 0.22;
  const step = Math.max(0.45, w * 0.14);
  for (let kx = x + step * 0.7; kx < x + w - step * 0.4; kx += step) {
    ctx.beginPath();
    ctx.moveTo(kx, y + h * 0.24);
    ctx.lineTo(kx, y + h * 0.88);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCrownCap(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  w: number,
  h: number,
  baseHex: string = '#d97706'
) {
  ctx.save();
  const x = cx - w * 0.5;
  const cGrad = ctx.createLinearGradient(x, y, x + w, y);
  cGrad.addColorStop(0.0, adjustHex(baseHex, -0.45));
  cGrad.addColorStop(0.28, adjustHex(baseHex, 0.42));
  cGrad.addColorStop(0.55, baseHex);
  cGrad.addColorStop(0.88, adjustHex(baseHex, -0.4));
  cGrad.addColorStop(1.0, adjustHex(baseHex, -0.15));
  ctx.fillStyle = cGrad;

  ctx.beginPath();
  ctx.moveTo(x + 0.2, y);
  ctx.lineTo(x + w - 0.2, y);
  ctx.lineTo(x + w + 0.18, y + h);
  ctx.lineTo(x - 0.18, y + h);
  ctx.closePath();
  ctx.fill();

  // Fluted skirt teeth
  ctx.fillStyle = adjustHex(baseHex, -0.5);
  const teeth = Math.max(4, Math.round(w / 0.55));
  for (let i = 0; i < teeth; i++) {
    const tx = x - 0.12 + (i / teeth) * (w + 0.24);
    ctx.fillRect(tx, y + h * 0.45, 0.24, h * 0.58);
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(x + 0.2, y + 0.12, w - 0.4, 0.25);
  ctx.restore();
}

export function drawPouchCrinkles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number = 17,
  alpha: number = 0.2
) {
  ctx.save();
  // Diagonal soft specular creases typical of pillowed BOPP/foil
  for (let i = 0; i < 4; i++) {
    const px = x + w * (0.18 + hash01(seed, i * 4 + 1) * 0.64);
    const py = y + h * (0.14 + hash01(seed, i * 4 + 2) * 0.72);
    const dx = (hash01(seed, i * 4 + 3) - 0.5) * w * 0.36;
    const dy = (0.18 + hash01(seed, i * 4 + 4) * 0.22) * h;

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
    ctx.lineWidth = 0.42;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + dx * 0.4, py + dy * 0.55, px + dx, py + dy);
    ctx.stroke();

    ctx.strokeStyle = `rgba(15, 23, 42, ${alpha * 0.55})`;
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    ctx.moveTo(px + 0.22, py + 0.18);
    ctx.quadraticCurveTo(px + dx * 0.4 + 0.22, py + dy * 0.55 + 0.18, px + dx + 0.22, py + dy + 0.18);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFilmWindow(
  ctx: CanvasRenderingContext2D,
  tracePath: () => void,
  drawContents?: () => void,
  rimColor: string = 'rgba(255, 255, 255, 0.6)',
  depthBg: string = '#0b1120'
) {
  ctx.save();
  tracePath();
  ctx.fillStyle = depthBg;
  ctx.fill();

  ctx.save();
  tracePath();
  ctx.clip();

  // Soft interior box/pouch cavity gradient
  const cavGrad = ctx.createRadialGradient(-1, -1.5, 0.5, 0, 1, 7);
  cavGrad.addColorStop(0, 'rgba(30, 41, 59, 0.45)');
  cavGrad.addColorStop(1, 'rgba(2, 6, 23, 0.88)');
  ctx.fillStyle = cavGrad;
  ctx.fillRect(-12, -12, 24, 24);

  if (drawContents) {
    drawContents();
  }

  // Die-cut inner lip shadow around top/left edge
  tracePath();
  ctx.strokeStyle = 'rgba(2, 6, 23, 0.65)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Angled clear polypropylene reflection sheen
  const fGrad = ctx.createLinearGradient(-7, -7, 7, 7);
  fGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.04)');
  fGrad.addColorStop(0.28, 'rgba(255, 255, 255, 0.28)');
  fGrad.addColorStop(0.36, 'rgba(255, 255, 255, 0.05)');
  fGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.0)');
  fGrad.addColorStop(0.76, 'rgba(255, 255, 255, 0.14)');
  fGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.02)');
  ctx.fillStyle = fGrad;
  ctx.fillRect(-12, -12, 24, 24);
  ctx.restore();

  // Crisp beveled die-cut perimeter edge
  tracePath();
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 0.38;
  ctx.stroke();
  ctx.restore();
}

const EFFECT_CANVAS_SIZE = 112;
const EFFECT_WORLD_SPAN = 28;

interface EffectScratchBuffers {
  silhouette: HTMLCanvasElement;
  composed: HTMLCanvasElement;
  eroded: HTMLCanvasElement;
  edge: HTMLCanvasElement;
  overlay: HTMLCanvasElement;
}

const effectScratchPool: Array<EffectScratchBuffers | null> = [null, null, null];

function getEffectScratchBuffers(depth: number = 0): EffectScratchBuffers | null {
  if (typeof document === 'undefined') return null;
  const idx = Math.max(0, Math.min(effectScratchPool.length - 1, depth));
  if (!effectScratchPool[idx]) {
    const createBuf = () => {
      const c = document.createElement('canvas');
      c.width = EFFECT_CANVAS_SIZE;
      c.height = EFFECT_CANVAS_SIZE;
      return c;
    };
    effectScratchPool[idx] = {
      silhouette: createBuf(),
      composed: createBuf(),
      eroded: createBuf(),
      edge: createBuf(),
      overlay: createBuf(),
    };
  }
  return effectScratchPool[idx];
}

export type ItemVisualMaterial =
  | 'food_meat'
  | 'food_produce'
  | 'food_bakery'
  | 'fabric'
  | 'paper_wood'
  | 'metal'
  | 'glass_plastic'
  | 'ceramic_stone';

function parseHexColorRgb(hex?: string): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return null;
}

/**
 * Classifies an item's physical surface material so cooking, heating, washing,
 * soaking, and freezing apply realistic material-appropriate color/finish shifts.
 */
export function classifyItemVisualMaterial(item: any): ItemVisualMaterial {
  if (!item) return 'glass_plastic';
  const id = String(item.itemId || '').toLowerCase();
  const cat = String(item.category || '').toLowerCase();

  // 1. Fabric / clothing / burlap / towels / soft wearables
  if (
    cat === 'clothing' ||
    Boolean(item.clothingStats) ||
    id.startsWith('sack_') ||
    id === 'sandbag' ||
    id.includes('towel') ||
    id.includes('rag') ||
    id.includes('cloth') ||
    id.includes('gloves') ||
    id.includes('backpack') ||
    id.includes('apron') ||
    id.includes('bandage')
  ) {
    return 'fabric';
  }

  // 2. Kitchenware & fluid containers — classify by vessel material
  const kwMat = String(item.kitchenwareAttributes?.material || '').toLowerCase();
  const cvMat = String(item.containerVisuals?.material || '').toLowerCase();
  const matHint = kwMat || cvMat;
  const isContainerLike =
    Boolean(item.fluidStorage) ||
    Boolean(item.kitchenwareAttributes) ||
    Boolean(item.containerVisuals && !item.isOpen) ||
    id.startsWith('bottle_') ||
    id.startsWith('jar_') ||
    id.startsWith('can_') ||
    id.startsWith('tin_') ||
    id.startsWith('jug_') ||
    id.startsWith('canister_') ||
    id.startsWith('carton_') ||
    id.startsWith('detergent_') ||
    id.includes('_bottle') ||
    id.includes('_jar') ||
    id.includes('_can') ||
    id.includes('_pack') ||
    id.includes('_box') ||
    id.includes('tetra') ||
    id.includes('thermos') ||
    id.includes('flask') ||
    id.includes('bucket');

  if (isContainerLike && !item.culinaryData?.isPreparedDish) {
    if (
      matHint.includes('steel') ||
      matHint.includes('iron') ||
      matHint.includes('alum') ||
      matHint.includes('metal') ||
      matHint.includes('copper') ||
      matHint.includes('tin') ||
      matHint.includes('enamel') ||
      id.includes('pot') ||
      id.includes('pan') ||
      id.includes('kettle') ||
      id.includes('ladle') ||
      id.includes('can_') ||
      id.includes('_can') ||
      id.includes('tin_') ||
      id.includes('flask') ||
      id.includes('thermos') ||
      id.includes('_steel') ||
      id.includes('_aluminum') ||
      id.includes('_cast_iron')
    ) {
      return 'metal';
    }
    if (
      matHint.includes('ceramic') ||
      matHint.includes('porcelain') ||
      matHint.includes('clay') ||
      matHint.includes('stone') ||
      id.includes('plate') ||
      id.includes('bowl') ||
      id.includes('mug') ||
      id.includes('cup_ceramic')
    ) {
      return 'ceramic_stone';
    }
    if (
      matHint.includes('paper') ||
      matHint.includes('cardboard') ||
      matHint.includes('wood') ||
      id.includes('box') ||
      id.includes('carton') ||
      id.includes('tetra') ||
      id.includes('paper') ||
      id.includes('detergent_box') ||
      id.includes('detergent_pack')
    ) {
      return 'paper_wood';
    }
    return 'glass_plastic';
  }

  // 3. Tools, cutlery, auto metal hardware
  if (
    cat === 'tool' ||
    cat === 'auto' ||
    id.includes('knife') ||
    id.includes('fork') ||
    id.includes('spoon') ||
    id.includes('wrench') ||
    id.includes('hammer') ||
    id.includes('pliers') ||
    id.includes('crowbar') ||
    id.includes('screwdriver') ||
    id.includes('axe') ||
    id.includes('saw') ||
    id.includes('nail') ||
    id.includes('bolt') ||
    id.includes('key') ||
    id.includes('coin')
  ) {
    if (id.includes('tire') || id.includes('battery') || id.includes('canister') || id.includes('plastic')) {
      return 'glass_plastic';
    }
    if (id.includes('wood')) return 'paper_wood';
    return 'metal';
  }

  // 4. Electronics / glass / plastic non-food
  if (
    id.includes('phone') ||
    id.includes('smartphone') ||
    id.includes('radio') ||
    id.includes('flashlight') ||
    id.includes('charger') ||
    id.includes('plastic') ||
    id.includes('glass') ||
    cat === 'drink'
  ) {
    return 'glass_plastic';
  }

  // 5. Paper / cardboard / wood non-food
  if (
    id.includes('paper') ||
    id.includes('book') ||
    id.includes('note') ||
    id.includes('letter') ||
    id.includes('newspaper') ||
    id.includes('money') ||
    id.includes('cash') ||
    id.includes('rubl') ||
    id.includes('cardboard') ||
    id.includes('wood') ||
    id.includes('board') ||
    id.includes('log') ||
    id.includes('match') ||
    id.includes('cigarette')
  ) {
    return 'paper_wood';
  }

  // 6. Food items — split by biological browning/boiling character
  if (cat === 'food' || Boolean(item.culinaryData) || Boolean(item.pelmenAttributes)) {
    if (
      id.includes('meat') ||
      id.includes('beef') ||
      id.includes('pork') ||
      id.includes('lamb') ||
      id.includes('chicken') ||
      id.includes('poultry') ||
      id.includes('turkey') ||
      id.includes('duck') ||
      id.includes('fish') ||
      id.includes('salmon') ||
      id.includes('cod') ||
      id.includes('herring') ||
      id.includes('shrimp') ||
      id.includes('sausage') ||
      id.includes('bacon') ||
      id.includes('ham') ||
      id.includes('steak') ||
      id.includes('cutlet') ||
      id.includes('minced') ||
      id.includes('liver') ||
      id.includes('egg') ||
      id.includes('fillet')
    ) {
      return 'food_meat';
    }
    if (
      id.includes('potato') ||
      id.includes('carrot') ||
      id.includes('onion') ||
      id.includes('garlic') ||
      id.includes('cabbage') ||
      id.includes('tomato') ||
      id.includes('cucumber') ||
      id.includes('pepper') ||
      id.includes('beet') ||
      id.includes('radish') ||
      id.includes('mushroom') ||
      id.includes('apple') ||
      id.includes('pear') ||
      id.includes('banana') ||
      id.includes('orange') ||
      id.includes('lemon') ||
      id.includes('berry') ||
      id.includes('strawberry') ||
      id.includes('grape') ||
      id.includes('herb') ||
      id.includes('dill') ||
      id.includes('parsley') ||
      id.includes('lettuce') ||
      id.includes('salad') ||
      id.includes('zucchini') ||
      id.includes('eggplant') ||
      id.includes('pumpkin') ||
      id.includes('corn') ||
      id.includes('pea')
    ) {
      return 'food_produce';
    }
    return 'food_bakery';
  }

  return 'glass_plastic';
}

interface ComputedItemVisualMetrics {
  material: ItemVisualMaterial;
  isFood: boolean;
  isPreparedDish: boolean;
  temp: number;
  wet: number;      // 0..1
  soap: number;     // 0..1
  infusion: number; // 0..1
  boilLvl: number;  // 0..1
  brownLvl: number; // 0..1
  charLvl: number;  // 0..1
  heatLvl: number;  // 0..1
  frostLvl: number; // 0..1
  isFreezing: boolean;
  isDeepFreeze: boolean;
  hasPigmentedSoak: boolean;
  soakRgb: { r: number; g: number; b: number } | null;
  hasAnySurfaceEffect: boolean;
  hasSteam: boolean;
}

function computeItemVisualMetrics(item: any, isInner: boolean): ComputedItemVisualMetrics {
  const material = classifyItemVisualMaterial(item);
  const isFood = material === 'food_meat' || material === 'food_produce' || material === 'food_bakery';
  const isPreparedDish = Boolean(
    item?.culinaryData?.isPreparedDish ||
    item?.itemId === 'cooked_dish' ||
    item?.itemId === 'custom_cooked_dish'
  );

  const temp =
    typeof item?.surfaceTemperature === 'number'
      ? item.surfaceTemperature
      : typeof item?.temperature === 'number'
      ? item.temperature
      : 20.0;

  const wet = Math.max(0, Math.min(1, (item?.wetness || 0) / 100));
  const isSoapyByName =
    item?.soakedLiquidNameRu === 'Мыльный раствор' ||
    item?.soakedLiquidId === 'detergent' ||
    item?.soakedLiquidId === 'laundry_detergent';
  const soap = Math.max(
    0,
    Math.min(1, Math.max(item?.soapyLevel || 0, isSoapyByName && wet > 0.08 ? Math.min(0.95, wet * 0.9) : 0))
  );
  const infusion = Math.max(0, Math.min(1, item?.infusionProgress || 0));

  const state = String(item?.attributes?.state || '').toLowerCase();
  const stateRu = String(item?.attributes?.stateNameRu || '').toLowerCase();
  const cd = item?.culinaryData;
  const ca = cd?.cookingAttributes;

  let boilLvl = 0;
  let brownLvl = 0;
  let charLvl = 0;

  // Extract continuous cooking/browning/charring values
  if (isFood) {
    const cookProg = Math.max(0, Math.min(1, item?.cookProgress || 0));
    const method = item?.cookMethod;
    boilLvl = Math.max(
      ca?.boiled || 0,
      method === 'boiled' || method === 'steamed' || method === 'microwaved' ? cookProg : 0,
      state === 'boiled' || state === 'steamed' || stateRu.includes('варён') || stateRu.includes('варен') ? 0.85 : 0,
      state === 'cooked' || stateRu.includes('приготовл') || stateRu.includes('разогрет') ? 0.58 : 0
    );
    brownLvl = Math.max(
      item?.brownLevel || 0,
      cd?.maillard || 0,
      (ca?.fried || 0) * 0.88,
      (ca?.baked || 0) * 0.8,
      method === 'fried' ? cookProg * 0.78 : 0,
      method === 'baked' ? cookProg * 0.72 : 0,
      state === 'fried' || stateRu.includes('жарен') ? 0.74 : 0,
      state === 'baked' || stateRu.includes('запеч') ? 0.66 : 0
    );
    charLvl = Math.max(
      item?.charLevel || 0,
      cd?.charring || 0,
      ca?.charring || 0,
      state === 'burnt' || stateRu.includes('подгор') || stateRu.includes('сгор') || stateRu.includes('обугл') ? 0.82 : 0
    );

    // Prepared dishes already render cooked ingredient tones inside culinaryGraphics;
    // scale down redundant base cooking tint while keeping extra stove browning/charring visible.
    if (isPreparedDish) {
      boilLvl = 0;
      brownLvl = Math.max(0, (item?.brownLevel || 0) * 0.65);
      charLvl = Math.max(0, (item?.charLevel || 0) * 0.85);
    }
  } else if (material === 'fabric' || material === 'paper_wood') {
    charLvl = Math.max(0, Math.min(1, item?.charLevel || 0));
  }

  boilLvl = Math.max(0, Math.min(1, boilLvl));
  brownLvl = Math.max(0, Math.min(1, brownLvl));
  charLvl = Math.max(0, Math.min(1, charLvl));

  // Heat radiance threshold depends on material
  let heatLvl = 0;
  if (material === 'metal' && temp >= 75) {
    heatLvl = Math.max(0, Math.min(1, (temp - 75) / 135));
  } else if (isFood && temp >= 48) {
    heatLvl = Math.max(0, Math.min(1, (temp - 48) / 85));
  } else if ((material === 'ceramic_stone' || material === 'glass_plastic') && temp >= 78) {
    heatLvl = Math.max(0, Math.min(1, (temp - 78) / 110));
  }

  const frostLvl = temp <= 5.0 ? Math.min(1.0, Math.max(0.12, (5.0 - temp) / 15.0)) : 0;
  const isFreezing = temp <= 0.0;
  const isDeepFreeze = temp <= -8.0;

  const soakRgb = parseHexColorRgb(item?.soakedColor);
  const isPlainWater = item?.soakedLiquidId === 'water' && !isSoapyByName && soap < 0.04;
  const hasPigmentedSoak = Boolean(soakRgb && (!isPlainWater || soap >= 0.04) && (wet >= 0.06 || infusion >= 0.08));

  const hasAnySurfaceEffect =
    boilLvl > 0.03 ||
    brownLvl > 0.03 ||
    charLvl > 0.03 ||
    wet >= 0.06 ||
    soap >= 0.04 ||
    hasPigmentedSoak ||
    heatLvl > 0.04 ||
    frostLvl > 0;

  const hasSteam = !isInner && temp >= 56.0;

  return {
    material,
    isFood,
    isPreparedDish,
    temp,
    wet,
    soap,
    infusion,
    boilLvl,
    brownLvl,
    charLvl,
    heatLvl,
    frostLvl,
    isFreezing,
    isDeepFreeze,
    hasPigmentedSoak,
    soakRgb,
    hasAnySurfaceEffect,
    hasSteam,
  };
}

/**
 * Fast O(1) check whether an item requires dynamic visual color/surface rendering
 * (cooking, browning, charring, wetness, soapy foam, heating glow, frost, or steam).
 */
export function hasActiveItemVisualState(item?: any, isInner: boolean = false): boolean {
  if (!item) return false;
  const m = computeItemVisualMetrics(item, isInner);
  return m.hasAnySurfaceEffect || m.hasSteam;
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

  const barbAngleOffset = Math.PI / 3;
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

function drawHotSteamWisps(
  ctx: CanvasRenderingContext2D,
  temp: number,
  boundsRadius: number
) {
  if (temp < 56.0) return;
  ctx.save();
  const heatFactor = Math.min(1.0, (temp - 56.0) / 40.0);
  const steamAlpha = 0.28 + heatFactor * 0.44;
  ctx.strokeStyle = `rgba(248, 250, 252, ${steamAlpha.toFixed(2)})`;
  ctx.lineWidth = 0.9 + heatFactor * 0.25;
  ctx.lineCap = 'round';

  for (let s = -1; s <= 1; s++) {
    const sx = s * 3.4;
    const sy = -boundsRadius * 0.5;
    const h = 8.5 + heatFactor * 3.2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(
      sx + (s === 0 ? 1.5 : -1.5),
      sy - h * 0.34,
      sx - (s === 0 ? 1.5 : -1.5),
      sy - h * 0.68,
      sx + s * 0.8,
      sy - h
    );
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Renders an item model with full material-aware, silhouette-conforming dynamic color
 * and surface transformations:
 *  - Cooking progression: boiling/steaming, Maillard golden-brown frying/baking crust, charring/burning
 *  - Wetness & washing: optical fabric/paper wet darkening, colored liquid staining, soapy detergent suds,
 *    water droplets & specular wet gloss on hard non-porous surfaces
 *  - Heating: realistic heated metal thermal glow, warm food radiance, rising steam wisps
 *  - Chilling & freezing: cool icy color shift, shape-hugging hoarfrost rime, dendritic veins & condensation
 */
export function drawItemWithDynamicState(
  ctx: CanvasRenderingContext2D,
  item: any,
  boundsRadius: number,
  renderModel: (targetCtx: CanvasRenderingContext2D) => void,
  isInner: boolean = false,
  renderDepth: number = 0
): void {
  if (!item) {
    renderModel(ctx);
    return;
  }

  const m = computeItemVisualMetrics(item, isInner);
  if (!m.hasAnySurfaceEffect) {
    renderModel(ctx);
    if (m.hasSteam) {
      drawHotSteamWisps(ctx, m.temp, boundsRadius);
    }
    return;
  }

  const buffers = getEffectScratchBuffers(renderDepth);
  if (!buffers) {
    renderModel(ctx);
    if (m.hasSteam) {
      drawHotSteamWisps(ctx, m.temp, boundsRadius);
    }
    return;
  }

  const { silhouette, composed, eroded, edge, overlay } = buffers;
  const sCtx = silhouette.getContext('2d');
  const cCtx = composed.getContext('2d');
  const erCtx = eroded.getContext('2d');
  const edCtx = edge.getContext('2d');
  const oCtx = overlay.getContext('2d');

  if (!sCtx || !cCtx || !erCtx || !edCtx || !oCtx) {
    renderModel(ctx);
    if (m.hasSteam) {
      drawHotSteamWisps(ctx, m.temp, boundsRadius);
    }
    return;
  }

  const pxScale = EFFECT_CANVAS_SIZE / EFFECT_WORLD_SPAN;
  const halfSpan = EFFECT_WORLD_SPAN / 2;

  // Deterministic PRNG seeded by item identity
  const seedStr = String(item.id || item.itemId || 'item_state');
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const pseudoRand = (offset: number) => {
    const x = Math.sin(hash * 0.0001 + offset * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  // 1. Render pure item model ONCE into silhouette buffer (with ground shadow suppressed)
  const prevSuppress = suppressShadow;
  sCtx.setTransform(1, 0, 0, 1, 0, 0);
  sCtx.globalCompositeOperation = 'source-over';
  sCtx.globalAlpha = 1.0;
  sCtx.clearRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
  sCtx.save();
  sCtx.translate(EFFECT_CANVAS_SIZE / 2, EFFECT_CANVAS_SIZE / 2);
  sCtx.scale(pxScale, pxScale);
  setSuppressItemShadow(true);
  try {
    renderModel(sCtx);
  } finally {
    setSuppressItemShadow(prevSuppress);
    sCtx.restore();
  }

  // 2. Copy base item pixels into composed buffer
  cCtx.setTransform(1, 0, 0, 1, 0, 0);
  cCtx.globalCompositeOperation = 'source-over';
  cCtx.globalAlpha = 1.0;
  cCtx.clearRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
  cCtx.drawImage(silhouette, 0, 0);

  // Lazy morphological edge contour builder (hugs exact perimeter of any arbitrary shape)
  const buildErodedMask = (radiusPx: number) => {
    erCtx.setTransform(1, 0, 0, 1, 0, 0);
    erCtx.globalCompositeOperation = 'source-over';
    erCtx.globalAlpha = 1.0;
    erCtx.clearRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
    erCtx.drawImage(silhouette, 0, 0);

    erCtx.globalCompositeOperation = 'destination-in';
    const d = radiusPx * 0.7071;
    const offsets: Array<[number, number]> = [
      [-radiusPx, 0], [radiusPx, 0], [0, -radiusPx], [0, radiusPx],
      [-d, -d], [d, -d], [-d, d], [d, d],
    ];
    for (const [ox, oy] of offsets) {
      erCtx.drawImage(silhouette, ox, oy);
    }
  };

  const buildColoredContour = (outerR: number, innerR: number, outerCut: number, innerCut: number, fillStyle: string | CanvasGradient) => {
    edCtx.setTransform(1, 0, 0, 1, 0, 0);
    edCtx.globalCompositeOperation = 'source-over';
    edCtx.globalAlpha = 1.0;
    edCtx.clearRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
    edCtx.drawImage(silhouette, 0, 0);

    buildErodedMask(outerR);
    edCtx.globalCompositeOperation = 'destination-out';
    edCtx.globalAlpha = outerCut;
    edCtx.drawImage(eroded, 0, 0);

    if (innerR > 0) {
      buildErodedMask(innerR);
      edCtx.globalAlpha = innerCut;
      edCtx.drawImage(eroded, 0, 0);
    }

    edCtx.globalAlpha = 1.0;
    edCtx.globalCompositeOperation = 'source-in';
    edCtx.fillStyle = fillStyle;
    edCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
  };

  // =========================================================================
  // LAYER A: COOKING — BOILING / MAILLARD BROWNING / CHARRING
  // =========================================================================
  if (m.isFood && m.boilLvl > 0.03 && m.brownLvl < 0.65) {
    const bStr = m.boilLvl * (1 - m.brownLvl * 0.7);
    if (m.material === 'food_meat') {
      // Raw pink/red meat -> tender pale taupe-gray cooked meat
      cCtx.globalCompositeOperation = 'source-atop';
      cCtx.fillStyle = `rgba(178, 160, 140, ${(bStr * 0.56).toFixed(3)})`;
      cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);

      cCtx.globalCompositeOperation = 'multiply';
      cCtx.fillStyle = `rgba(218, 206, 194, ${(bStr * 0.48).toFixed(3)})`;
      cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
    } else if (m.material === 'food_produce') {
      // Boiled vegetables soften toward warm cooked tone
      cCtx.globalCompositeOperation = 'source-atop';
      cCtx.fillStyle = `rgba(212, 194, 146, ${(bStr * 0.34).toFixed(3)})`;
      cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);

      cCtx.globalCompositeOperation = 'multiply';
      cCtx.fillStyle = `rgba(232, 224, 196, ${(bStr * 0.36).toFixed(3)})`;
      cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
    } else {
      // Boiled dough/pelmeni/pasta turns slightly warm creamy ivory with soft sheen
      cCtx.globalCompositeOperation = 'source-atop';
      cCtx.fillStyle = `rgba(246, 236, 206, ${(bStr * 0.32).toFixed(3)})`;
      cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
    }
  }

  if (m.isFood && m.brownLvl > 0.03) {
    const br = m.brownLvl;
    // 1. Rich Maillard golden-amber to roasted mahogany multiply pass
    cCtx.globalCompositeOperation = 'multiply';
    if (m.material === 'food_meat') {
      cCtx.fillStyle = `rgba(142, 78, 32, ${(0.24 + br * 0.52).toFixed(3)})`;
    } else if (m.material === 'food_bakery') {
      cCtx.fillStyle = `rgba(186, 114, 34, ${(0.2 + br * 0.52).toFixed(3)})`;
    } else {
      cCtx.fillStyle = `rgba(164, 98, 30, ${(0.18 + br * 0.46).toFixed(3)})`;
    }
    cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);

    // 2. Warm caramel wash so even pale/bright raw pixels take roasted tone
    cCtx.globalCompositeOperation = 'source-atop';
    cCtx.fillStyle = `rgba(128, 62, 18, ${(br * 0.3).toFixed(3)})`;
    cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);

    // 3. Crisp browned crust hugging the perimeter contour
    buildColoredContour(3.6, 1.5, 0.72, 0.55, `rgba(76, 34, 10, ${(0.28 + br * 0.48).toFixed(3)})`);
    cCtx.globalCompositeOperation = 'source-atop';
    cCtx.drawImage(edge, 0, 0);

    // 4. Organic seared Maillard spots & pan-fry caramel flecks
    cCtx.save();
    cCtx.translate(EFFECT_CANVAS_SIZE / 2, EFFECT_CANVAS_SIZE / 2);
    cCtx.scale(pxScale, pxScale);
    cCtx.globalCompositeOperation = 'source-atop';
    const searCount = 5 + Math.floor(br * 7);
    for (let i = 0; i < searCount; i++) {
      const sx = (pseudoRand(i * 4 + 11) - 0.5) * boundsRadius * 1.45;
      const sy = (pseudoRand(i * 4 + 12) - 0.5) * boundsRadius * 1.45;
      const sr = (0.7 + pseudoRand(i * 4 + 13) * 1.7) * (0.65 + br * 0.45);
      const sa = (0.18 + pseudoRand(i * 4 + 14) * 0.24) * br;
      const sg = cCtx.createRadialGradient(sx, sy, sr * 0.1, sx, sy, sr);
      sg.addColorStop(0, `rgba(68, 28, 8, ${sa.toFixed(3)})`);
      sg.addColorStop(1, 'rgba(110, 48, 12, 0)');
      cCtx.fillStyle = sg;
      cCtx.beginPath();
      cCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      cCtx.fill();
    }
    // Subtle warm fried oil sheen on upper highlight
    if (br > 0.25 && m.charLvl < 0.4) {
      const oilGrad = cCtx.createRadialGradient(-boundsRadius * 0.25, -boundsRadius * 0.3, 0.4, -boundsRadius * 0.2, -boundsRadius * 0.2, boundsRadius * 0.85);
      oilGrad.addColorStop(0, `rgba(255, 232, 175, ${(0.18 * br * (1 - m.charLvl)).toFixed(3)})`);
      oilGrad.addColorStop(1, 'rgba(255, 220, 140, 0)');
      cCtx.fillStyle = oilGrad;
      cCtx.beginPath();
      cCtx.arc(0, 0, boundsRadius * 1.2, 0, Math.PI * 2);
      cCtx.fill();
    }
    cCtx.restore();
  }

  if (m.charLvl > 0.03) {
    const ch = m.charLvl;
    // Deep blackened soot multiply + opaque charcoal crust
    cCtx.globalCompositeOperation = 'multiply';
    cCtx.fillStyle = `rgba(42, 28, 20, ${(0.35 + ch * 0.58).toFixed(3)})`;
    cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);

    cCtx.globalCompositeOperation = 'source-atop';
    cCtx.fillStyle = `rgba(22, 18, 16, ${(ch * 0.68).toFixed(3)})`;
    cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);

    // Heavily blackened charred perimeter
    buildColoredContour(4.2, 1.8, 0.68, 0.5, `rgba(14, 11, 10, ${(0.45 + ch * 0.5).toFixed(3)})`);
    cCtx.globalCompositeOperation = 'source-atop';
    cCtx.drawImage(edge, 0, 0);

    // Irregular carbonized char blotches
    cCtx.save();
    cCtx.translate(EFFECT_CANVAS_SIZE / 2, EFFECT_CANVAS_SIZE / 2);
    cCtx.scale(pxScale, pxScale);
    cCtx.globalCompositeOperation = 'source-atop';
    const blotches = 6 + Math.floor(ch * 8);
    for (let i = 0; i < blotches; i++) {
      const bx = (pseudoRand(i * 4 + 41) - 0.5) * boundsRadius * 1.5;
      const by = (pseudoRand(i * 4 + 42) - 0.5) * boundsRadius * 1.5;
      const br = (0.9 + pseudoRand(i * 4 + 43) * 2.1) * (0.7 + ch * 0.4);
      const ba = (0.28 + pseudoRand(i * 4 + 44) * 0.35) * ch;
      const bg = cCtx.createRadialGradient(bx, by, br * 0.15, bx, by, br);
      bg.addColorStop(0, `rgba(12, 10, 9, ${ba.toFixed(3)})`);
      bg.addColorStop(1, 'rgba(28, 20, 16, 0)');
      cCtx.fillStyle = bg;
      cCtx.beginPath();
      cCtx.arc(bx, by, br, 0, Math.PI * 2);
      cCtx.fill();
    }
    cCtx.restore();
  }

  // =========================================================================
  // LAYER B: WETNESS, WASHING MACHINE SOAPY FOAM & COLORED LIQUID SOAKING
  // =========================================================================
  if (m.wet >= 0.06 || m.soap >= 0.04 || m.hasPigmentedSoak) {
    const wet = m.wet;
    const isPorousFabric = m.material === 'fabric';
    const isPorousPaper = m.material === 'paper_wood';
    const isHardSurface = m.material === 'metal' || m.material === 'glass_plastic' || m.material === 'ceramic_stone';

    // 1. Optical wet darkening for porous materials (fabric, paper, wood, food)
    if (wet >= 0.06) {
      if (isPorousFabric) {
        // Real wet cloth turns significantly deeper & richer in tone
        cCtx.globalCompositeOperation = 'multiply';
        cCtx.fillStyle = `rgba(98, 114, 134, ${(0.22 + wet * 0.54).toFixed(3)})`;
        cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);

        // Damp darkened edge contour
        buildColoredContour(3.0, 1.2, 0.78, 0.62, `rgba(38, 52, 72, ${(wet * 0.34).toFixed(3)})`);
        cCtx.globalCompositeOperation = 'source-atop';
        cCtx.drawImage(edge, 0, 0);
      } else if (isPorousPaper) {
        cCtx.globalCompositeOperation = 'multiply';
        cCtx.fillStyle = `rgba(124, 116, 104, ${(0.18 + wet * 0.48).toFixed(3)})`;
        cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
      } else if (m.isFood) {
        const foodDark = m.material === 'food_bakery' ? 0.38 : 0.24;
        cCtx.globalCompositeOperation = 'multiply';
        cCtx.fillStyle = `rgba(148, 156, 168, ${(wet * foodDark).toFixed(3)})`;
        cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
      }
    }

    // 2. Colored liquid soak / staining (broth, tea, coffee, wine, oil, detergent)
    if (m.hasPigmentedSoak && m.soakRgb) {
      const { r, g, b } = m.soakRgb;
      const stainStrength = Math.max(wet, m.infusion, m.soap * 0.85);
      const maxAlpha = isPorousFabric || isPorousPaper ? 0.38 : m.isFood ? 0.34 : 0.16;
      cCtx.globalCompositeOperation = 'source-atop';
      cCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(stainStrength * maxAlpha).toFixed(3)})`;
      cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
    }

    // 3. Glossy wet surface sheen & water droplets (crisp on hard surfaces & wet food)
    if (wet >= 0.12 && (isHardSurface || m.isFood)) {
      cCtx.save();
      cCtx.translate(EFFECT_CANVAS_SIZE / 2, EFFECT_CANVAS_SIZE / 2);
      cCtx.scale(pxScale, pxScale);
      cCtx.globalCompositeOperation = 'source-atop';

      // Specular wet sheen sweep across upper-left curve
      const sheenAlpha = isHardSurface ? 0.12 + wet * 0.2 : 0.08 + wet * 0.14;
      const wGrad = cCtx.createLinearGradient(-boundsRadius, -boundsRadius, boundsRadius * 0.7, boundsRadius * 0.7);
      wGrad.addColorStop(0.0, `rgba(224, 242, 254, ${sheenAlpha.toFixed(3)})`);
      wGrad.addColorStop(0.45, `rgba(186, 230, 253, ${(sheenAlpha * 0.35).toFixed(3)})`);
      wGrad.addColorStop(1.0, 'rgba(186, 230, 253, 0)');
      cCtx.fillStyle = wGrad;
      cCtx.fillRect(-halfSpan, -halfSpan, EFFECT_WORLD_SPAN, EFFECT_WORLD_SPAN);

      // Gleaming water droplets
      const dropCount = isHardSurface ? 5 + Math.floor(wet * 6) : 3 + Math.floor(wet * 4);
      for (let i = 0; i < dropCount; i++) {
        const dx = (pseudoRand(i * 3 + 71) - 0.5) * boundsRadius * 1.45;
        const dy = (pseudoRand(i * 3 + 72) - 0.5) * boundsRadius * 1.45;
        const dr = 0.34 + pseudoRand(i * 3 + 73) * 0.44;
        cCtx.fillStyle = `rgba(15, 23, 42, ${(0.18 * wet).toFixed(3)})`;
        cCtx.beginPath();
        cCtx.arc(dx + 0.12, dy + 0.16, dr, 0, Math.PI * 2);
        cCtx.fill();

        const drRgb = m.hasPigmentedSoak && m.soakRgb ? `${m.soakRgb.r}, ${m.soakRgb.g}, ${m.soakRgb.b}` : '186, 230, 253';
        cCtx.fillStyle = `rgba(${drRgb}, ${(0.45 + wet * 0.32).toFixed(3)})`;
        cCtx.beginPath();
        cCtx.arc(dx, dy, dr, 0, Math.PI * 2);
        cCtx.fill();

        cCtx.fillStyle = `rgba(255, 255, 255, ${(0.72 + wet * 0.25).toFixed(3)})`;
        cCtx.beginPath();
        cCtx.arc(dx - dr * 0.32, dy - dr * 0.32, dr * 0.34, 0, Math.PI * 2);
        cCtx.fill();
      }
      cCtx.restore();
    }

    // 4. Soapy Detergent Foam & Suds Bubbles (washing machine / detergent soak)
    if (m.soap >= 0.04) {
      const sp = m.soap;
      const rgb = m.soakRgb || { r: 210, g: 240, b: 255 };
      // Mix detergent tint with crisp milky foam white
      const fr = Math.round(rgb.r * 0.45 + 255 * 0.55);
      const fg = Math.round(rgb.g * 0.45 + 255 * 0.55);
      const fb = Math.round(rgb.b * 0.45 + 255 * 0.55);

      // Soft foamy rim around silhouette
      buildColoredContour(3.2, 1.3, 0.72, 0.55, `rgba(${fr}, ${fg}, ${fb}, ${(0.35 + sp * 0.48).toFixed(3)})`);
      cCtx.globalCompositeOperation = 'source-atop';
      cCtx.drawImage(edge, 0, 0);

      // Clustered pearlescent soap bubbles
      cCtx.save();
      cCtx.translate(EFFECT_CANVAS_SIZE / 2, EFFECT_CANVAS_SIZE / 2);
      cCtx.scale(pxScale, pxScale);
      cCtx.globalCompositeOperation = 'source-atop';
      const bubbleCount = 6 + Math.floor(sp * 9);
      for (let i = 0; i < bubbleCount; i++) {
        const bx = (pseudoRand(i * 4 + 131) - 0.5) * boundsRadius * 1.5;
        const by = (pseudoRand(i * 4 + 132) - 0.5) * boundsRadius * 1.5;
        const br = (0.48 + pseudoRand(i * 4 + 133) * 0.88) * (0.7 + sp * 0.4);

        cCtx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${(0.28 + sp * 0.36).toFixed(3)})`;
        cCtx.beginPath();
        cCtx.arc(bx, by, br, 0, Math.PI * 2);
        cCtx.fill();

        cCtx.strokeStyle = `rgba(255, 255, 255, ${(0.52 + sp * 0.36).toFixed(3)})`;
        cCtx.lineWidth = 0.24;
        cCtx.stroke();

        cCtx.fillStyle = `rgba(255, 255, 255, ${(0.75 + sp * 0.2).toFixed(3)})`;
        cCtx.beginPath();
        cCtx.arc(bx - br * 0.34, by - br * 0.34, Math.max(0.16, br * 0.26), 0, Math.PI * 2);
        cCtx.fill();
      }
      cCtx.restore();
    }
  }

  // =========================================================================
  // LAYER C: HEATING / THERMAL RADIANCE (HOT METAL GLOW & WARM FOOD SHIFT)
  // =========================================================================
  if (m.heatLvl > 0.04) {
    const hl = m.heatLvl;
    if (m.material === 'metal') {
      // Heated cookware/metal: warm brassy sheen at 75-130°C, amber-cherry thermal radiance at 130-215°C
      const isGlowingHot = m.temp >= 120;
      cCtx.globalCompositeOperation = 'source-atop';
      cCtx.fillStyle = isGlowingHot
        ? `rgba(255, 118, 36, ${(0.12 + hl * 0.34).toFixed(3)})`
        : `rgba(251, 178, 84, ${(hl * 0.22).toFixed(3)})`;
      cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);

      if (isGlowingHot) {
        const glowStr = Math.min(1, (m.temp - 115) / 95);
        buildColoredContour(3.4, 1.3, 0.72, 0.55, `rgba(255, 134, 48, ${(0.35 + glowStr * 0.45).toFixed(3)})`);
        cCtx.globalCompositeOperation = 'screen';
        cCtx.drawImage(edge, 0, 0);
      }
    } else if (m.isFood) {
      // Gentle warm golden radiance on freshly heated food
      cCtx.globalCompositeOperation = 'source-atop';
      cCtx.fillStyle = `rgba(255, 158, 72, ${(hl * 0.16).toFixed(3)})`;
      cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
    } else if (m.material === 'ceramic_stone' || m.material === 'glass_plastic') {
      cCtx.globalCompositeOperation = 'source-atop';
      cCtx.fillStyle = `rgba(255, 184, 120, ${(hl * 0.12).toFixed(3)})`;
      cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
    }
  }

  // =========================================================================
  // LAYER D: CHILLED & FROZEN (COOL COLOR SHIFT + SHAPE-HUGGING HOARFROST)
  // =========================================================================
  if (m.frostLvl > 0) {
    const frostSeverity = m.frostLvl;
    const isFreezing = m.isFreezing;
    const isDeepFreeze = m.isDeepFreeze;

    // 1. Cool icy surface color shift so chilled/frozen items visibly look cold-shifted
    cCtx.globalCompositeOperation = 'source-atop';
    cCtx.fillStyle = isFreezing
      ? `rgba(186, 228, 255, ${(0.16 + frostSeverity * 0.24).toFixed(3)})`
      : `rgba(186, 230, 253, ${(frostSeverity * 0.14).toFixed(3)})`;
    cCtx.fillRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);

    // 2. Shape-hugging frost contour rim
    const rimGrad = edCtx.createLinearGradient(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
    rimGrad.addColorStop(0.0, isFreezing ? 'rgba(255, 255, 255, 0.92)' : 'rgba(224, 242, 254, 0.45)');
    rimGrad.addColorStop(0.5, isFreezing ? 'rgba(224, 242, 254, 0.80)' : 'rgba(186, 230, 253, 0.32)');
    rimGrad.addColorStop(1.0, isFreezing ? 'rgba(240, 249, 255, 0.88)' : 'rgba(224, 242, 254, 0.38)');
    buildColoredContour(3.6, 1.5, isFreezing ? 0.58 : 0.78, isFreezing ? 0.45 : 0.65, rimGrad);

    // 3. Detailed frost crystals / condensation onto overlay buffer
    oCtx.setTransform(1, 0, 0, 1, 0, 0);
    oCtx.globalCompositeOperation = 'source-over';
    oCtx.globalAlpha = isFreezing ? (0.48 + frostSeverity * 0.42) : 0.35;
    oCtx.clearRect(0, 0, EFFECT_CANVAS_SIZE, EFFECT_CANVAS_SIZE);
    oCtx.drawImage(edge, 0, 0);
    oCtx.globalAlpha = 1.0;

    oCtx.save();
    oCtx.translate(EFFECT_CANVAS_SIZE / 2, EFFECT_CANVAS_SIZE / 2);
    oCtx.scale(pxScale, pxScale);

    if (isFreezing) {
      const patchCount = 7 + Math.floor(frostSeverity * 7);
      for (let i = 0; i < patchCount; i++) {
        const px = (pseudoRand(i * 5 + 1) - 0.5) * boundsRadius * 1.65;
        const py = (pseudoRand(i * 5 + 2) - 0.5) * boundsRadius * 1.65;
        const pr = (1.6 + pseudoRand(i * 5 + 3) * 2.6) * (0.7 + frostSeverity * 0.4);
        const pAlpha = (0.14 + pseudoRand(i * 5 + 4) * 0.18) * frostSeverity;

        const pGrad = oCtx.createRadialGradient(px, py, pr * 0.1, px, py, pr);
        pGrad.addColorStop(0.0, `rgba(255, 255, 255, ${pAlpha * 1.35})`);
        pGrad.addColorStop(0.55, `rgba(224, 242, 254, ${pAlpha * 0.85})`);
        pGrad.addColorStop(1.0, 'rgba(186, 230, 253, 0)');
        oCtx.fillStyle = pGrad;
        oCtx.beginPath();
        oCtx.arc(px, py, pr, 0, Math.PI * 2);
        oCtx.fill();
      }

      const branchCount = 10 + Math.floor(frostSeverity * 12);
      for (let i = 0; i < branchCount; i++) {
        const bx = (pseudoRand(i * 6 + 20) - 0.5) * boundsRadius * 1.75;
        const by = (pseudoRand(i * 6 + 21) - 0.5) * boundsRadius * 1.75;
        const bAngle = pseudoRand(i * 6 + 22) * Math.PI * 2;
        const bLen = (1.1 + pseudoRand(i * 6 + 23) * 1.9) * (0.75 + frostSeverity * 0.45);
        const barbs = 2 + Math.floor(pseudoRand(i * 6 + 24) * 3);
        const bAlpha = Math.min(0.95, (0.45 + pseudoRand(i * 6 + 25) * 0.4) * (0.65 + frostSeverity * 0.45));
        drawDendriticBranch(oCtx, bx, by, bAngle, bLen, barbs, bAlpha);
      }

      const hexCount = 5 + Math.floor(frostSeverity * 7);
      for (let i = 0; i < hexCount; i++) {
        const hx = (pseudoRand(i * 4 + 60) - 0.5) * boundsRadius * 1.5;
        const hy = (pseudoRand(i * 4 + 61) - 0.5) * boundsRadius * 1.5;
        const hRad = (0.65 + pseudoRand(i * 4 + 62) * 0.85) * (0.8 + frostSeverity * 0.35);
        const hRot = pseudoRand(i * 4 + 63) * Math.PI;
        drawHexIceCrystal(oCtx, hx, hy, hRad, hRot, 0.55 + frostSeverity * 0.38);
      }

      const grainCount = 28 + Math.floor(frostSeverity * 36);
      for (let i = 0; i < grainCount; i++) {
        const gx = (pseudoRand(i * 4 + 100) - 0.5) * boundsRadius * 1.85;
        const gy = (pseudoRand(i * 4 + 101) - 0.5) * boundsRadius * 1.85;
        const gSize = 0.16 + pseudoRand(i * 4 + 102) * 0.28;
        const isBright = pseudoRand(i * 4 + 103) > 0.35;

        oCtx.fillStyle = isBright
          ? `rgba(255, 255, 255, ${0.65 + frostSeverity * 0.32})`
          : `rgba(186, 230, 253, ${0.55 + frostSeverity * 0.3})`;
        oCtx.beginPath();
        oCtx.moveTo(gx, gy - gSize);
        oCtx.lineTo(gx + gSize * 0.85, gy);
        oCtx.lineTo(gx, gy + gSize);
        oCtx.lineTo(gx - gSize * 0.85, gy);
        oCtx.closePath();
        oCtx.fill();
      }

      if (isDeepFreeze) {
        oCtx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
        oCtx.lineWidth = 0.26;
        for (let i = 0; i < 14; i++) {
          const nx = (pseudoRand(i * 3 + 200) - 0.5) * boundsRadius * 1.6;
          const ny = (pseudoRand(i * 3 + 201) - 0.5) * boundsRadius * 1.6;
          const na = pseudoRand(i * 3 + 202) * Math.PI * 2;
          const nl = 0.55 + pseudoRand(i * 3 + 203) * 0.75;
          oCtx.beginPath();
          oCtx.moveTo(nx - Math.cos(na) * nl, ny - Math.sin(na) * nl);
          oCtx.lineTo(nx + Math.cos(na) * nl, ny + Math.sin(na) * nl);
          oCtx.stroke();
        }
      }
    } else {
      // Chilled condensation micro-droplets (0°C < T <= 5°C)
      const dropCount = Math.floor(6 + frostSeverity * 8);
      for (let i = 0; i < dropCount; i++) {
        const dx = (pseudoRand(i * 3 + 1) - 0.5) * boundsRadius * 1.5;
        const dy = (pseudoRand(i * 3 + 2) - 0.5) * boundsRadius * 1.5;
        const r = 0.38 + pseudoRand(i * 3 + 3) * 0.45;

        oCtx.fillStyle = 'rgba(14, 116, 144, 0.22)';
        oCtx.beginPath();
        oCtx.arc(dx + 0.12, dy + 0.16, r, 0, Math.PI * 2);
        oCtx.fill();

        oCtx.fillStyle = 'rgba(186, 230, 253, 0.72)';
        oCtx.beginPath();
        oCtx.arc(dx, dy, r, 0, Math.PI * 2);
        oCtx.fill();

        oCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        oCtx.beginPath();
        oCtx.arc(dx - r * 0.32, dy - r * 0.32, r * 0.35, 0, Math.PI * 2);
        oCtx.fill();
      }
    }
    oCtx.restore();

    // Composite frost details onto composed buffer
    cCtx.setTransform(1, 0, 0, 1, 0, 0);
    cCtx.globalCompositeOperation = 'source-atop';
    cCtx.globalAlpha = 1.0;
    cCtx.drawImage(overlay, 0, 0);
  }

  // Final alpha lock to the exact anti-aliased item silhouette (zero bleed!)
  cCtx.setTransform(1, 0, 0, 1, 0, 0);
  cCtx.globalCompositeOperation = 'destination-in';
  cCtx.globalAlpha = 1.0;
  cCtx.drawImage(silhouette, 0, 0);

  // Draw crisp contact drop shadow underneath (if not suppressed & not inner content)
  if (!isInner && !suppressShadow) {
    drawShadow(ctx, 6.8, 2.2, 7.3, 0.21);
  }

  // Blit final transformed item onto target canvas
  ctx.save();
  ctx.drawImage(composed, -halfSpan, -halfSpan, EFFECT_WORLD_SPAN, EFFECT_WORLD_SPAN);
  ctx.restore();

  // Rising steam wisps above hot items (outside silhouette mask)
  if (m.hasSteam) {
    drawHotSteamWisps(ctx, m.temp, boundsRadius);
  }
}

/**
 * Backwards-compatible alias for frost & thermal overlay callers.
 */
export function drawFrostAndThermalOverlay(
  ctx: CanvasRenderingContext2D,
  item?: any,
  boundsRadius: number = 8.5,
  renderModelSilhouette?: (targetCtx: CanvasRenderingContext2D) => void
) {
  if (!item || !renderModelSilhouette) return;
  drawItemWithDynamicState(ctx, item, boundsRadius, renderModelSilhouette, false, 0);
}


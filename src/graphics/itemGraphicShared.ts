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

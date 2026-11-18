// Procedural 2D Canvas Models for Artisan & Commercial Chocolate Packaging
// Realistic crinkled foil pleats, cotton-paper wrapper sleeves with gold foil stamping,
// crimped flow-pack bars, 3D triangular prisms, kraft tasting envelopes, and velvet gift boxes.

import { ChocolatePackagingShape } from '../types';
import {
  drawShadow,
  drawCrimpedSeal,
  drawMicroBarcode,
  drawPouchCrinkles,
  drawFilmWindow,
  adjustHex,
  hexToRgba,
  hash01
} from './itemGraphicShared';
import { drawItemModel2D } from '../itemGraphic';

export type ChocolatePackagingSize = 'mini' | 'small' | 'medium' | 'large' | 'king';

const SCALE_BY_SIZE: Record<ChocolatePackagingSize, number> = {
  mini: 0.78,
  small: 0.90,
  medium: 1.0,
  large: 1.12,
  king: 1.22
};

export function getChocolatePackagingSize(itemId: string, item?: any): ChocolatePackagingSize {
  if (
    item?.packagingSize &&
    ['mini', 'small', 'medium', 'large', 'king'].includes(item.packagingSize)
  ) {
    return item.packagingSize;
  }
  if (itemId.includes('_mini') || itemId.includes('_xs')) return 'mini';
  if (itemId.includes('_bar') || itemId.includes('_small')) return 'small';
  if (itemId.includes('_king') || itemId.includes('_xxl')) return 'large';
  if (itemId.includes('_box') || itemId.includes('_large')) return 'large';
  return 'medium';
}

export function getChocolatePackagingShape(itemId: string, item?: any): ChocolatePackagingShape {
  if (
    item?.packagingShape &&
    [
      'mini_foil_wrap',
      'flow_bar',
      'foil_paper_sleeve',
      'square_flow',
      'triangular_prism',
      'craft_envelope_xl',
      'gift_box'
    ].includes(item.packagingShape)
  ) {
    return item.packagingShape;
  }
  if (itemId.includes('_mini')) return 'mini_foil_wrap';
  if (itemId.includes('_bar')) return 'flow_bar';
  if (itemId.includes('_square')) return 'square_flow';
  if (itemId.includes('_prism')) return 'triangular_prism';
  if (itemId.includes('_king')) return 'craft_envelope_xl';
  if (itemId.includes('_box')) return 'gift_box';
  return 'foil_paper_sleeve';
}

export function getChocolateLabelColor(itemId: string, item?: any): string {
  if (item?.labelColor && typeof item.labelColor === 'string') return item.labelColor;
  if (itemId.includes('_mini')) return '#881337';
  if (itemId.includes('_bar')) return '#5c2d16';
  if (itemId.includes('_square')) return '#115e59';
  if (itemId.includes('_prism')) return '#a16207';
  if (itemId.includes('_king')) return '#1e293b';
  if (itemId.includes('_box')) return '#6b0f26';
  return '#1e3a8a';
}

export function getChocolateFoilColor(itemId: string, item?: any): string {
  if (item?.containerTintColor && typeof item.containerTintColor === 'string') {
    return item.containerTintColor;
  }
  if (itemId.includes('_prism') || itemId.includes('_box') || itemId.includes('_king')) {
    return '#d4af37';
  }
  return '#d1d5db';
}

export function isChocolatePackagingOpen(itemId: string, item?: any): boolean {
  if (item?.isOpen !== undefined) return !!item.isOpen;
  return itemId.includes('_open') || itemId.includes('_torn');
}

export function drawChocolatePackagingItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  item?: any
): boolean {
  const isChocPkg = itemId === 'chocolate_pack' || itemId.startsWith('chocolate_pack_');
  if (!isChocPkg) return false;

  const sizeTier = getChocolatePackagingSize(itemId, item);
  const shape = getChocolatePackagingShape(itemId, item);
  const isOpen = isChocolatePackagingOpen(itemId, item);
  const labelColor = getChocolateLabelColor(itemId, item);
  const foilColor = getChocolateFoilColor(itemId, item);
  const scale = SCALE_BY_SIZE[sizeTier] || 1.0;

  ctx.save();
  ctx.scale(scale, scale);

  switch (shape) {
    case 'mini_foil_wrap':
      drawMiniFoilWrap(ctx, labelColor, foilColor, isOpen, item);
      break;
    case 'flow_bar':
      drawFlowBarPack(ctx, labelColor, foilColor, isOpen, item);
      break;
    case 'square_flow':
      drawSquareFlowPack(ctx, labelColor, foilColor, isOpen, item);
      break;
    case 'triangular_prism':
      drawTriangularPrismPack(ctx, labelColor, foilColor, isOpen, item);
      break;
    case 'craft_envelope_xl':
      drawCraftEnvelopeXLPack(ctx, labelColor, foilColor, isOpen, item);
      break;
    case 'gift_box':
      drawGiftBoxPack(ctx, labelColor, foilColor, isOpen, item);
      break;
    case 'foil_paper_sleeve':
    default:
      drawFoilPaperSleevePack(ctx, labelColor, foilColor, isOpen, item);
      break;
  }

  ctx.restore();
  return true;
}

// ---------------------------------------------------------------------------
// Internal Studio Helpers
// ---------------------------------------------------------------------------

function drawFoilSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  foilHex: string,
  seed: number = 11
) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0.0, adjustHex(foilHex, -0.28));
  g.addColorStop(0.22, adjustHex(foilHex, 0.42));
  g.addColorStop(0.5, foilHex);
  g.addColorStop(0.78, adjustHex(foilHex, -0.25));
  g.addColorStop(1.0, adjustHex(foilHex, 0.16));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // Embossed diamond / diagonal foil micro-pleats
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.lineWidth = 0.25;
  for (let i = 0; i < 6; i++) {
    const fx = x + hash01(seed, i * 3 + 1) * w;
    const fy = y + hash01(seed, i * 3 + 2) * h;
    const ang = (hash01(seed, i * 3 + 3) - 0.5) * 1.4;
    ctx.beginPath();
    ctx.moveTo(fx - Math.cos(ang) * 1.4, fy - Math.sin(ang) * 1.4);
    ctx.lineTo(fx + Math.cos(ang) * 1.4, fy + Math.sin(ang) * 1.4);
    ctx.stroke();
  }
}

function drawCacaoEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  goldHex: string = '#f59e0b'
) {
  ctx.save();
  ctx.translate(cx, cy);
  const g = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, rx * 0.1, 0, 0, rx);
  g.addColorStop(0.0, '#fef3c7');
  g.addColorStop(0.5, goldHex);
  g.addColorStop(1.0, '#78350f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(69, 26, 3, 0.65)';
  ctx.lineWidth = 0.22;
  ctx.beginPath();
  ctx.moveTo(-rx * 0.72, -ry * 0.2);
  ctx.quadraticCurveTo(0, 0.25, rx * 0.72, ry * 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawTemperBarReveal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cols: number,
  rows: number,
  item?: any
) {
  const firstInner = Array.isArray(item?.contents) && item.contents.length > 0 ? item.contents[0] : null;
  if (firstInner && firstInner.itemId && !firstInner.itemId.startsWith('chocolate_pack')) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 0.5);
    ctx.clip();
    drawItemModel2D(ctx, firstInner.itemId, x + w * 0.5, y + h * 0.5, Math.min(w, h) * 1.35, firstInner, true);
    ctx.restore();
    return;
  }

  // Tempered rich Belgian dark-milk chocolate grid with chamfered beveled pips
  const base = ctx.createLinearGradient(x, y, x + w, y + h);
  base.addColorStop(0.0, '#451a03');
  base.addColorStop(0.4, '#3b1806');
  base.addColorStop(1.0, '#1f0b02');
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 0.45);
  ctx.fill();

  const pad = 0.4;
  const cellW = (w - pad * (cols + 1)) / cols;
  const cellH = (h - pad * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = x + pad + c * (cellW + pad);
      const py = y + pad + r * (cellH + pad);
      // Beveled square face
      const pGrad = ctx.createLinearGradient(px, py, px + cellW, py + cellH);
      pGrad.addColorStop(0.0, '#7c3f1d');
      pGrad.addColorStop(0.45, '#4a200b');
      pGrad.addColorStop(1.0, '#230d03');
      ctx.fillStyle = pGrad;
      ctx.fillRect(px, py, cellW, cellH);

      // Top/left tempered satin sheen edge
      ctx.strokeStyle = 'rgba(255, 237, 213, 0.24)';
      ctx.lineWidth = 0.25;
      ctx.beginPath();
      ctx.moveTo(px, py + cellH);
      ctx.lineTo(px, py);
      ctx.lineTo(px + cellW, py);
      ctx.stroke();
    }
  }
}

function drawGoldRuleLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  labelColor: string,
  accentHex: string = '#f59e0b',
  isVertical: boolean = true
) {
  ctx.save();
  const lGrad = isVertical
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x, y, x, y + h);
  lGrad.addColorStop(0.0, adjustHex(labelColor, -0.32));
  lGrad.addColorStop(0.28, adjustHex(labelColor, 0.14));
  lGrad.addColorStop(0.58, labelColor);
  lGrad.addColorStop(1.0, adjustHex(labelColor, -0.44));
  ctx.fillStyle = lGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 0.45);
  ctx.fill();

  // Matte cotton/parchment inner cartouche
  const mx = x + w * 0.14;
  const my = y + h * 0.16;
  const mw = w * 0.72;
  const mh = h * 0.68;
  ctx.fillStyle = '#faf7ef';
  ctx.fillRect(mx, my, mw, mh);

  // Double hairline foil frame
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 0.28;
  ctx.strokeRect(mx + 0.35, my + 0.35, mw - 0.7, mh - 0.7);

  // Fine typographic lines + botanical cacao pod medallion
  drawCacaoEmblem(ctx, mx + mw * 0.5, my + mh * 0.34, Math.min(mw, mh) * 0.18, Math.min(mw, mh) * 0.12, accentHex);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(mx + mw * 0.18, my + mh * 0.56, mw * 0.64, Math.max(0.28, mh * 0.08));
  ctx.fillStyle = adjustHex(labelColor, 0.05);
  ctx.fillRect(mx + mw * 0.28, my + mh * 0.72, mw * 0.44, Math.max(0.22, mh * 0.06));
  ctx.restore();
}

// ============================================================================
// 1. MINI FOIL WRAP (Мини-шоколадка в фольге с бумажным пояском)
// ============================================================================

function drawMiniFoilWrap(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  const hw = 4.5;
  const hh = 5.6;

  drawShadow(ctx, 4.8, 1.5, 6.2, 0.26);

  if (!isOpen) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 0.5);
    ctx.clip();
    drawFoilSurface(ctx, -hw, -hh, hw * 2, hh * 2, foilColor, 201);
    ctx.restore();

    // Envelope fold triangle pleats at top & bottom foil ends
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.24)';
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    ctx.moveTo(-hw, -hh); ctx.lineTo(0, -hh + 1.5); ctx.lineTo(hw, -hh);
    ctx.moveTo(-hw, hh); ctx.lineTo(0, hh - 1.5); ctx.lineTo(hw, hh);
    ctx.stroke();

    // Paper belly band sleeve
    drawGoldRuleLabel(ctx, -hw - 0.1, -2.5, hw * 2 + 0.2, 5.2, labelColor, '#f59e0b');
    ctx.strokeStyle = adjustHex(foilColor, -0.5);
    ctx.lineWidth = 0.34;
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
  } else {
    // Open torn foil wings with chocolate square revealed
    drawTemperBarReveal(ctx, -hw + 0.5, -hh + 0.4, (hw - 0.5) * 2, 4.4, 2, 1, item);

    // Lower paper sleeve & peeled aluminum foil pocket
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-hw, -1.6);
    ctx.lineTo(-1.4, -0.5);
    ctx.lineTo(1.2, -1.9);
    ctx.lineTo(hw, -0.7);
    ctx.lineTo(hw, hh);
    ctx.lineTo(-hw, hh);
    ctx.closePath();
    ctx.clip();
    drawFoilSurface(ctx, -hw, -2.0, hw * 2, hh + 2.0, foilColor, 202);
    ctx.restore();

    // Peeled back corner crease
    ctx.fillStyle = adjustHex(foilColor, 0.35);
    ctx.beginPath();
    ctx.moveTo(-hw, -1.6);
    ctx.lineTo(-1.4, -0.5);
    ctx.lineTo(-3.4, 1.0);
    ctx.closePath();
    ctx.fill();

    drawGoldRuleLabel(ctx, -hw - 0.1, 0.3, hw * 2 + 0.2, 4.0, labelColor, '#f59e0b');
  }
}

// ============================================================================
// 2. FLOW BAR (Шоколадный батончик флоу-пак)
// ============================================================================

function drawFlowBarPack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  const hw = 7.8;
  const hh = 3.2;
  const finW = 1.15;

  drawShadow(ctx, 8.2, 1.5, 3.8, 0.28);

  if (isOpen) {
    // Exposed molded chocolate bar sticking out left side
    drawTemperBarReveal(ctx, -8.3, -2.35, 6.4, 4.7, 3, 2, item);
  }

  const startX = isOpen ? -3.0 : -hw + finW;
  const endX = hw - finW;

  const traceBody = () => {
    ctx.beginPath();
    if (!isOpen) {
      ctx.roundRect(startX, -hh, endX - startX, hh * 2, 0.55);
    } else {
      ctx.moveTo(startX + 0.3, -hh);
      ctx.lineTo(endX, -hh);
      ctx.lineTo(endX, hh);
      ctx.lineTo(startX - 0.3, hh);
      ctx.lineTo(startX + 0.7, 0.6);
      ctx.lineTo(startX - 0.5, -1.1);
      ctx.closePath();
    }
  };

  // Satin matte-foil pillow bar wrapper
  const bGrad = ctx.createLinearGradient(0, -hh, 0, hh);
  bGrad.addColorStop(0.0, adjustHex(labelColor, -0.38));
  bGrad.addColorStop(0.24, adjustHex(labelColor, 0.24));
  bGrad.addColorStop(0.58, labelColor);
  bGrad.addColorStop(1.0, adjustHex(labelColor, -0.48));
  ctx.fillStyle = bGrad;
  traceBody();
  ctx.fill();

  ctx.save();
  traceBody();
  ctx.clip();

  // Metallic gold/copper brand strip across wrapper
  ctx.fillStyle = '#faf7ef';
  ctx.fillRect(startX + 0.8, -1.5, endX - startX - 1.6, 3.0);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(startX + 0.8, -1.5, endX - startX - 1.6, 0.32);
  ctx.fillRect(startX + 0.8, 1.18, endX - startX - 1.6, 0.32);

  drawCacaoEmblem(ctx, isOpen ? 2.4 : -2.2, 0, 1.05, 0.7, '#d97706');
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(isOpen ? 3.8 : -0.4, -0.42, 3.6, 0.42);
  ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
  ctx.fillRect(isOpen ? 3.8 : -0.4, 0.28, 2.5, 0.25);

  drawPouchCrinkles(ctx, startX, -hh, endX - startX, hh * 2, 304, 0.18);
  ctx.restore();

  // Crimped end fins
  drawCrimpedSeal(ctx, hw - finW, -hh, finW, hh * 2, labelColor, false, 0.65);
  if (!isOpen) {
    drawCrimpedSeal(ctx, -hw, -hh, finW, hh * 2, labelColor, false, 0.65);
  } else {
    // Torn metallic silver inner layer
    ctx.strokeStyle = adjustHex(foilColor, 0.35);
    ctx.lineWidth = 0.42;
    ctx.beginPath();
    ctx.moveTo(startX + 0.3, -hh);
    ctx.lineTo(startX - 0.5, -1.1);
    ctx.lineTo(startX + 0.7, 0.6);
    ctx.lineTo(startX - 0.3, hh);
    ctx.stroke();
  }

  ctx.strokeStyle = adjustHex(labelColor, -0.6);
  ctx.lineWidth = 0.34;
  traceBody();
  ctx.stroke();
}

// ============================================================================
// 3. FOIL + PAPER SLEEVE BAR (Классическая плитка: фольга + бумажная обертка)
// ============================================================================

function drawFoilPaperSleevePack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  const hw = 5.4;
  const hh = 8.4;

  drawShadow(ctx, 6.2, 2.0, 8.8, 0.28);

  // Inner crimped foil wrapper layer
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-hw + 0.2, -hh, (hw - 0.2) * 2, hh * 2, 0.45);
  ctx.clip();
  drawFoilSurface(ctx, -hw, -hh, hw * 2, hh * 2, foilColor, 404);
  ctx.restore();

  if (!isOpen) {
    // Folded foil corners top & bottom
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.lineWidth = 0.25;
    ctx.beginPath();
    ctx.moveTo(-hw + 0.2, -hh + 1.4); ctx.lineTo(0, -hh); ctx.lineTo(hw - 0.2, -hh + 1.4);
    ctx.moveTo(-hw + 0.2, hh - 1.4); ctx.lineTo(0, hh); ctx.lineTo(hw - 0.2, hh - 1.4);
    ctx.stroke();
  } else {
    // Exposed tempered dark chocolate bar top squares
    drawTemperBarReveal(ctx, -hw + 0.45, -hh + 0.15, (hw - 0.45) * 2, 5.2, 3, 2, item);

    // Torn silver/gold foil curling down unevenly over bar
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-hw + 0.1, -3.5);
    ctx.lineTo(-1.8, -2.0);
    ctx.lineTo(1.2, -4.0);
    ctx.lineTo(hw - 0.1, -2.4);
    ctx.lineTo(hw - 0.1, 0.5);
    ctx.lineTo(-hw + 0.1, 0.5);
    ctx.closePath();
    ctx.clip();
    drawFoilSurface(ctx, -hw, -4.2, hw * 2, 4.7, foilColor, 409);
    ctx.restore();
  }

  // Outer textured paper sleeve
  const sleeveTop = isOpen ? -2.2 : -6.6;
  const sleeveBot = hh - 1.1;
  const sleeveH = sleeveBot - sleeveTop;

  // Under-sleeve cast shadow onto foil
  ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
  ctx.fillRect(-hw, sleeveTop - 0.3, hw * 2, 0.35);
  ctx.fillRect(-hw, sleeveBot, hw * 2, 0.35);

  drawGoldRuleLabel(ctx, -hw, sleeveTop, hw * 2, sleeveH, labelColor, '#d97706', true);
  drawMicroBarcode(ctx, 1.4, sleeveBot - 1.5, 2.7, 0.9);
}

// ============================================================================
// 4. SQUARE FLOW PACK (Квадратная плитка-саше 100г)
// ============================================================================

function drawSquareFlowPack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  const hw = 6.7;
  const hh = 6.7;
  const finH = 0.95;

  drawShadow(ctx, 7.2, 1.9, 7.2, 0.28);

  if (isOpen) {
    drawTemperBarReveal(ctx, -hw + 0.7, -hh + 0.1, (hw - 0.7) * 2, 4.5, 4, 2, item);
  }

  const tearY = -2.4;
  const traceBody = () => {
    ctx.beginPath();
    if (!isOpen) {
      ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 0.55);
    } else {
      ctx.moveTo(-hw, tearY + 0.3);
      ctx.lineTo(-2.4, tearY - 0.65);
      ctx.lineTo(1.8, tearY + 0.45);
      ctx.lineTo(hw, tearY - 0.45);
      ctx.lineTo(hw, hh);
      ctx.lineTo(-hw, hh);
      ctx.closePath();
    }
  };

  ctx.save();
  traceBody();
  ctx.clip();

  // Split paper/foil packaging design
  const bg = ctx.createLinearGradient(-hw, -hh, hw, hh);
  bg.addColorStop(0.0, adjustHex(labelColor, -0.3));
  bg.addColorStop(0.35, adjustHex(labelColor, 0.15));
  bg.addColorStop(1.0, adjustHex(labelColor, -0.45));
  ctx.fillStyle = bg;
  ctx.fillRect(-hw, -hh, hw * 2, hh * 2);

  // Diagonal cream editorial sash
  ctx.fillStyle = '#faf7ef';
  ctx.beginPath();
  ctx.moveTo(-hw, 1.0);
  ctx.lineTo(hw, -2.5);
  ctx.lineTo(hw, hh);
  ctx.lineTo(-hw, hh);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 0.32;
  ctx.beginPath();
  ctx.moveTo(-hw, 1.0);
  ctx.lineTo(hw, -2.5);
  ctx.stroke();

  drawCacaoEmblem(ctx, -2.8, 3.2, 1.5, 1.0, '#d97706');
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-0.5, 2.4, 5.2, 0.55);
  ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
  ctx.fillRect(-0.5, 3.4, 3.8, 0.35);

  drawCrimpedSeal(ctx, -hw, hh - finH, hw * 2, finH, labelColor, true, 0.72);
  if (!isOpen) {
    drawCrimpedSeal(ctx, -hw, -hh, hw * 2, finH, labelColor, true, 0.72);
  }
  drawPouchCrinkles(ctx, -hw, -hh, hw * 2, hh * 2, 512, 0.15);
  ctx.restore();

  if (isOpen) {
    ctx.strokeStyle = adjustHex(foilColor, 0.3);
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-hw, tearY + 0.3);
    ctx.lineTo(-2.4, tearY - 0.65);
    ctx.lineTo(1.8, tearY + 0.45);
    ctx.lineTo(hw, tearY - 0.45);
    ctx.stroke();
  }

  ctx.strokeStyle = adjustHex(labelColor, -0.58);
  ctx.lineWidth = 0.36;
  traceBody();
  ctx.stroke();
}

// ============================================================================
// 5. TRIANGULAR PRISM CARTON (Треугольная призма)
// ============================================================================

function drawTriangularPrismPack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  drawShadow(ctx, 8.6, 2.0, 4.4, 0.3);

  const lX = isOpen ? -5.0 : -8.2;
  const rX = 7.6;

  if (isOpen) {
    // Gold foil wrapped bar + exposed serrated peak chocolate segment sticking out left
    drawTemperBarReveal(ctx, -9.2, -1.6, 4.4, 4.4, 2, 1, item);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-6.5, -1.9, 2.2, 5.0);
    ctx.clip();
    drawFoilSurface(ctx, -6.5, -1.9, 2.2, 5.0, foilColor, 610);
    ctx.restore();
  }

  // Right shaded carton side (depth shadow)
  const rightFacet = ctx.createLinearGradient(lX, -3.5, rX, 3.8);
  rightFacet.addColorStop(0.0, '#d6cfc0');
  rightFacet.addColorStop(1.0, '#a89f8d');
  ctx.fillStyle = rightFacet;
  ctx.beginPath();
  ctx.moveTo(lX + 1.8, -3.6);
  ctx.lineTo(rX, -3.6);
  ctx.lineTo(rX + 1.4, 2.8);
  ctx.lineTo(lX + 3.2, 2.8);
  ctx.closePath();
  ctx.fill();

  // Sunlit front prism bevel face
  const frontFacet = ctx.createLinearGradient(lX, -3.6, lX + 2.5, 3.6);
  frontFacet.addColorStop(0.0, '#fffdf7');
  frontFacet.addColorStop(0.45, '#f4efe2');
  frontFacet.addColorStop(1.0, '#ddd5c2');
  ctx.fillStyle = frontFacet;
  ctx.beginPath();
  ctx.moveTo(lX + 1.8, -3.6);
  ctx.lineTo(rX, -3.6);
  ctx.lineTo(rX - 0.8, 3.6);
  ctx.lineTo(lX, 3.6);
  ctx.closePath();
  ctx.fill();

  // Colored triangle/diamond typographic sash along prism face
  ctx.save();
  ctx.clip();
  ctx.fillStyle = labelColor;
  ctx.fillRect(lX + 1.4, -1.2, rX - lX, 2.6);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(lX + 1.4, -1.35, rX - lX, 0.25);
  ctx.fillRect(lX + 1.4, 1.25, rX - lX, 0.25);
  // Crisp embossed white wordmark line
  ctx.fillStyle = '#ffffff';
  ctx.fillRect((lX + rX) * 0.5 - 3.2, -0.3, 6.4, 0.65);
  ctx.restore();

  // Left triangular end-cap
  if (!isOpen) {
    ctx.fillStyle = adjustHex(labelColor, -0.2);
    ctx.beginPath();
    ctx.moveTo(lX + 1.8, -3.6);
    ctx.lineTo(lX, 3.6);
    ctx.lineTo(lX + 3.2, 2.8);
    ctx.closePath();
    ctx.fill();
  } else {
    // Dark triangular aperture
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.moveTo(lX + 1.8, -3.6);
    ctx.lineTo(lX, 3.6);
    ctx.lineTo(lX + 3.0, 2.9);
    ctx.closePath();
    ctx.fill();
  }

  // Crisp edge crease highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.moveTo(lX + 1.8, -3.6);
  ctx.lineTo(rX, -3.6);
  ctx.stroke();
}

// ============================================================================
// 6. CRAFT ENVELOPE XL (Крафтовый дегустационный конверт XXL)
// ============================================================================

function drawCraftEnvelopeXLPack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  const hw = 6.2;
  const hh = 8.4;

  drawShadow(ctx, 7.0, 2.1, 8.8, 0.3);

  if (isOpen) {
    drawTemperBarReveal(ctx, -hw + 0.7, -hh - 0.3, (hw - 0.7) * 2, 4.4, 4, 2, item);
  }

  // Unbleached organic kraft cardboard envelope
  const kraftGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  kraftGrad.addColorStop(0.0, '#c29968');
  kraftGrad.addColorStop(0.38, '#b38652');
  kraftGrad.addColorStop(0.75, '#926739');
  kraftGrad.addColorStop(1.0, '#6e4a24');

  ctx.fillStyle = kraftGrad;
  ctx.beginPath();
  ctx.roundRect(-hw, isOpen ? -4.5 : -hh, hw * 2, isOpen ? hh + 4.5 : hh * 2, 0.45);
  ctx.fill();

  // Tactile cellulose kraft paper fiber specks
  ctx.fillStyle = 'rgba(69, 26, 3, 0.22)';
  for (let i = 0; i < 18; i++) {
    const fx = -hw + 0.5 + hash01('kraft', i * 2) * (hw * 2 - 1.0);
    const fy = -3.8 + hash01('kraft', i * 2 + 1) * (hh + 3.2);
    ctx.fillRect(fx, fy, 0.35, 0.22);
  }

  if (!isOpen) {
    // Tapered envelope flap + subtle cast crease shadow
    ctx.fillStyle = 'rgba(41, 18, 5, 0.25)';
    ctx.beginPath();
    ctx.moveTo(-hw, -hh + 1.4);
    ctx.lineTo(0, -hh + 4.1);
    ctx.lineTo(hw, -hh + 1.4);
    ctx.lineTo(hw, -hh + 1.0);
    ctx.lineTo(0, -hh + 3.5);
    ctx.lineTo(-hw, -hh + 1.0);
    ctx.closePath();
    ctx.fill();

    // Wax/foil seal stamp on envelope tip
    drawCacaoEmblem(ctx, 0, -hh + 3.4, 1.35, 1.15, foilColor);
  } else {
    // Torn foil sleeve peek inside kraft mouth
    ctx.fillStyle = adjustHex(foilColor, 0.15);
    ctx.beginPath();
    ctx.moveTo(-hw + 0.4, -4.5);
    ctx.lineTo(-1.2, -3.5);
    ctx.lineTo(2.0, -4.8);
    ctx.lineTo(hw - 0.4, -4.5);
    ctx.lineTo(hw - 0.4, -2.8);
    ctx.lineTo(-hw + 0.4, -2.8);
    ctx.closePath();
    ctx.fill();
  }

  // Lower dark-matte tasting sleeve band
  drawGoldRuleLabel(ctx, -hw - 0.1, -1.6, hw * 2 + 0.2, 8.6, labelColor, foilColor, true);
  drawMicroBarcode(ctx, 1.8, 5.2, 3.0, 0.95);

  ctx.strokeStyle = '#45240e';
  ctx.lineWidth = 0.38;
  ctx.strokeRect(-hw, isOpen ? -4.5 : -hh, hw * 2, isOpen ? hh + 4.5 : hh * 2);
}

// ============================================================================
// 7. LUXURY PRALINE GIFT BOX (Подарочная коробка конфет)
// ============================================================================

function drawGiftBoxPack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  const hw = 7.6;
  const hh = 5.6;

  drawShadow(ctx, 8.2, 2.0, 6.2, 0.32);

  // Rigid velvet-matte patisserie box base with beveled depth rim
  const boxGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  boxGrad.addColorStop(0.0, adjustHex(labelColor, 0.12));
  boxGrad.addColorStop(0.5, labelColor);
  boxGrad.addColorStop(1.0, adjustHex(labelColor, -0.45));
  ctx.fillStyle = boxGrad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 0.8);
  ctx.fill();

  // Gold foil border trim around box lid/rim
  ctx.strokeStyle = foilColor;
  ctx.lineWidth = 0.35;
  ctx.strokeRect(-hw + 0.48, -hh + 0.48, hw * 2 - 0.96, hh * 2 - 0.96);

  if (!isOpen) {
    // Acetate window revealing sculpted pralines inside dark fluted insert
    const traceWin = () => {
      ctx.beginPath();
      ctx.roundRect(-hw + 1.2, -hh + 1.1, hw * 2 - 2.4, hh * 2 - 2.2, 0.5);
    };
    drawFilmWindow(
      ctx,
      traceWin,
      () => drawGiftBoxTrayContents(ctx, hw - 1.5, hh - 1.4, foilColor, item),
      foilColor,
      '#1e0c05'
    );

    // Satin silk ribbon cross & crisp tied bow
    const ribGrad = ctx.createLinearGradient(-0.8, -hh, 0.8, hh);
    ribGrad.addColorStop(0.0, adjustHex(foilColor, 0.35));
    ribGrad.addColorStop(0.5, foilColor);
    ribGrad.addColorStop(1.0, adjustHex(foilColor, -0.35));

    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(-hw + 0.1, -0.55, hw * 2 - 0.2, 1.35);
    ctx.fillRect(-0.55, -hh + 0.1, 1.35, hh * 2 - 0.2);

    ctx.fillStyle = ribGrad;
    ctx.fillRect(-hw, -0.55, hw * 2, 1.1);
    ctx.fillRect(-0.55, -hh, 1.1, hh * 2);

    // Sculpted bow loops
    ctx.fillStyle = adjustHex(foilColor, 0.18);
    ctx.beginPath();
    ctx.ellipse(-1.45, -0.25, 1.35, 0.72, -0.32, 0, Math.PI * 2);
    ctx.ellipse(1.45, -0.25, 1.35, 0.72, 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = adjustHex(foilColor, -0.15);
    ctx.beginPath();
    ctx.roundRect(-0.55, -0.65, 1.1, 1.1, 0.35);
    ctx.fill();
  } else {
    // Open rigid tray with thermoformed chocolate-brown fluted cells
    ctx.fillStyle = '#291206';
    ctx.beginPath();
    ctx.roundRect(-hw + 0.7, -hh + 0.7, hw * 2 - 1.4, hh * 2 - 1.4, 0.5);
    ctx.fill();

    drawGiftBoxTrayContents(ctx, hw - 1.0, hh - 1.0, foilColor, item);
  }

  ctx.strokeStyle = adjustHex(labelColor, -0.65);
  ctx.lineWidth = 0.38;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 0.8);
  ctx.stroke();
}

function drawGiftBoxTrayContents(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  foilColor: string,
  item?: any
) {
  const contents: any[] = Array.isArray(item?.contents) ? item.contents : [];
  const cols = 3;
  const rows = 2;
  const cellW = (hw * 2 - 1.2) / cols;
  const cellH = (hh * 2 - 1.0) / rows;
  const startX = -hw + 0.6 + cellW * 0.5;
  const startY = -hh + 0.5 + cellH * 0.5;

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = startX + c * cellW;
      const cy = startY + r * cellH;

      // Fluted gold/cocoa paper cup liner
      ctx.fillStyle = '#120703';
      ctx.beginPath();
      ctx.ellipse(cx, cy, cellW * 0.39, cellH * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(foilColor, 0.45);
      ctx.lineWidth = 0.22;
      ctx.stroke();

      const inner = contents[idx];
      if (inner && inner.itemId && !inner.itemId.startsWith('chocolate_pack')) {
        drawItemModel2D(ctx, inner.itemId, cx, cy, 8.2, inner, true);
      } else if (!Array.isArray(item?.contents) || contents.length === 0) {
        // Artisanal piped ganache truffle pralines
        const prGrad = ctx.createRadialGradient(cx - 0.5, cy - 0.5, 0.2, cx, cy, cellW * 0.32);
        prGrad.addColorStop(0.0, idx % 2 === 0 ? '#a16207' : '#fef3c7');
        prGrad.addColorStop(0.45, idx % 2 === 0 ? '#5c2d16' : '#92400e');
        prGrad.addColorStop(1.0, '#1f0b02');
        ctx.fillStyle = prGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(cellW, cellH) * 0.31, 0, Math.PI * 2);
        ctx.fill();

        // Delicate tempered drizzle ribbon on top
        ctx.strokeStyle = idx % 2 === 0 ? '#d97706' : '#291206';
        ctx.lineWidth = 0.28;
        ctx.beginPath();
        ctx.moveTo(cx - 0.8, cy - 0.3);
        ctx.quadraticCurveTo(cx, cy + 0.6, cx + 0.8, cy - 0.4);
        ctx.stroke();
      }
      idx++;
    }
  }
}

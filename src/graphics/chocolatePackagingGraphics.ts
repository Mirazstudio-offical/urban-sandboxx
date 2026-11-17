// Procedural 2D Canvas Models for Chocolate Packaging (Мини-фантик, Флоу-пак, Фольга + бумага, Квадратный пакет, Призма, Крафт XXL, Подарочная коробка)
// High-detail metallic foil crinkles, paper wrapper sleeves, crimped flow-pack fins,
// triangular cardboard prism tubes, luxury ribbon gift boxes with transparent viewing windows,
// and realistic opened/unwrapped foil states.

import { ChocolatePackagingShape } from '../types';
import { drawShadow } from './itemGraphicShared';
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
  if (itemId.includes('_mini')) return '#9f1239';
  if (itemId.includes('_bar')) return '#78350f';
  if (itemId.includes('_square')) return '#0f766e';
  if (itemId.includes('_prism')) return '#ca8a04';
  if (itemId.includes('_king')) return '#1e293b';
  if (itemId.includes('_box')) return '#881337';
  return '#1d4ed8';
}

export function getChocolateFoilColor(itemId: string, item?: any): string {
  if (item?.containerTintColor && typeof item.containerTintColor === 'string') {
    return item.containerTintColor;
  }
  if (itemId.includes('_prism') || itemId.includes('_box') || itemId.includes('_king')) {
    return '#fbbf24'; // Warm gold foil
  }
  return '#e2e8f0'; // Classic silver foil
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
  const isChocPkg =
    itemId === 'chocolate_pack' ||
    itemId.startsWith('chocolate_pack_');

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
      drawGiftBoxChocolatePack(ctx, labelColor, foilColor, isOpen, item);
      break;
    case 'foil_paper_sleeve':
    default:
      drawFoilPaperSleevePack(ctx, labelColor, foilColor, isOpen, item);
      break;
  }

  ctx.restore();
  return true;
}

/**
 * 1. MINI FOIL WRAP (Мини-обёртка / фольгированный фантик-конвертик)
 */
function drawMiniFoilWrap(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  drawShadow(ctx, 6.2, 2.2, 6.5, 0.24);
  ctx.save();

  // Twisted / crimped foil side wings
  const wingGrad = ctx.createLinearGradient(-8, -4, 8, 4);
  wingGrad.addColorStop(0, adjustColor(foilColor, -0.25));
  wingGrad.addColorStop(0.5, '#ffffff');
  wingGrad.addColorStop(1, adjustColor(foilColor, -0.18));

  ctx.fillStyle = wingGrad;
  // Left wing
  ctx.beginPath();
  ctx.moveTo(-4.4, -2.8);
  ctx.lineTo(-7.6, -4.4);
  ctx.lineTo(-7.0, 0);
  ctx.lineTo(-7.6, 4.4);
  ctx.lineTo(-4.4, 2.8);
  ctx.closePath();
  ctx.fill();

  // Right wing (unwrapped flap if open)
  ctx.beginPath();
  if (isOpen) {
    ctx.moveTo(4.2, -3.2);
    ctx.lineTo(8.0, -5.0);
    ctx.lineTo(7.4, -1.2);
    ctx.lineTo(8.2, 3.8);
    ctx.lineTo(4.2, 3.0);
  } else {
    ctx.moveTo(4.4, -2.8);
    ctx.lineTo(7.6, -4.4);
    ctx.lineTo(7.0, 0);
    ctx.lineTo(7.6, 4.4);
    ctx.lineTo(4.4, 2.8);
  }
  ctx.closePath();
  ctx.fill();

  // Foil body cushion
  const bodyGrad = ctx.createLinearGradient(-5, -5, 5, 5);
  bodyGrad.addColorStop(0, adjustColor(foilColor, 0.16));
  bodyGrad.addColorStop(0.5, foilColor);
  bodyGrad.addColorStop(1, adjustColor(foilColor, -0.26));

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = adjustColor(foilColor, -0.4);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(-4.8, -4.8, 9.6, 9.6, 1.3);
  ctx.fill();
  ctx.stroke();

  if (isOpen) {
    // Exposed dark cavity / foil pocket + inner piece preview if present
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-3.2, -3.2, 6.4, 6.4, 0.9);
    ctx.fill();

    if (item?.contents && item.contents.length > 0) {
      const inner = item.contents[0];
      if (inner && inner.itemId !== item.itemId) {
        drawItemModel2D(ctx, inner.itemId, 0, 0, 8.2, inner, true);
      }
    }
  } else {
    // Crisp paper belly band with gold emblem
    ctx.fillStyle = labelColor;
    ctx.beginPath();
    ctx.roundRect(-3.6, -4.9, 7.2, 9.8, 0.5);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.1, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = labelColor;
    ctx.fillRect(-1.2, -0.3, 2.4, 0.6);
  }

  // Foil sheen
  drawWrapperSheen(ctx, -4.8, -4.8, 9.6, 9.6);
  ctx.restore();
}

/**
 * 2. FLOW BAR (Узкий герметичный флоу-пак для батончика)
 */
function drawFlowBarPack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  const w = 16.4;
  const h = 7.4;
  const left = isOpen ? -w / 2 + 1.8 : -w / 2;
  const right = w / 2;
  const top = -h / 2;
  const bot = h / 2;

  drawShadow(ctx, 8.4, 2.4, 7.0, 0.26);
  ctx.save();
  ctx.rotate(-0.18);

  // Left & Right crimped fins
  if (!isOpen) {
    drawHorizontalCrimpedFin(ctx, left, top + 0.3, 1.5, h - 0.6, labelColor, 'left');
  } else {
    // Torn silver foil lip on left
    ctx.fillStyle = foilColor;
    ctx.beginPath();
    ctx.moveTo(left + 0.6, top + 0.4);
    ctx.lineTo(left - 1.4, top + 1.6);
    ctx.lineTo(left + 0.3, 0);
    ctx.lineTo(left - 1.2, bot - 1.4);
    ctx.lineTo(left + 0.6, bot - 0.4);
    ctx.closePath();
    ctx.fill();
  }
  drawHorizontalCrimpedFin(ctx, right - 1.5, top + 0.3, 1.5, h - 0.6, labelColor, 'right');

  // Cylindrical/pillow bar body
  const bodyLeft = isOpen ? left + 0.5 : left + 1.4;
  const bodyRight = right - 1.4;
  const grad = ctx.createLinearGradient(0, top, 0, bot);
  grad.addColorStop(0.0, adjustColor(labelColor, -0.22));
  grad.addColorStop(0.28, adjustColor(labelColor, 0.20));
  grad.addColorStop(0.65, labelColor);
  grad.addColorStop(1.0, adjustColor(labelColor, -0.32));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(bodyLeft, top, bodyRight - bodyLeft, h, 1.1);
  ctx.fill();

  // Dynamic diagonal gold/cream caramel stripe
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(bodyLeft, top, bodyRight - bodyLeft, h, 1.1);
  ctx.clip();

  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.moveTo(bodyLeft + 1.5, bot);
  ctx.lineTo(bodyLeft + 4.0, top);
  ctx.lineTo(bodyLeft + 5.8, top);
  ctx.lineTo(bodyLeft + 3.3, bot);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(bodyLeft + 3.3, bot);
  ctx.lineTo(bodyLeft + 5.8, top);
  ctx.lineTo(bodyLeft + 6.7, top);
  ctx.lineTo(bodyLeft + 4.2, bot);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Brand pill plaque
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(-1.2, -1.8, 6.2, 3.6, 0.9);
  ctx.fill();

  ctx.fillStyle = labelColor;
  ctx.fillRect(-0.4, -0.8, 4.6, 0.85);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(-0.4, 0.45, 3.2, 0.6);

  if (isOpen) {
    // Open dark mouth at left end showing chocolate edge or foil interior
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(bodyLeft + 0.3, 0, 0.8, h * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    if (item?.contents && item.contents.length > 0) {
      const inner = item.contents[0];
      if (inner && inner.itemId !== item.itemId) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bodyLeft - 1.2, top + 0.4, 4.8, h - 0.8, 0.6);
        ctx.clip();
        drawItemModel2D(ctx, inner.itemId, bodyLeft + 0.8, 0, 6.5, inner, true);
        ctx.restore();
      }
    }
  }

  drawWrapperSheen(ctx, bodyLeft, top, bodyRight - bodyLeft, h);
  ctx.restore();
}

/**
 * 3. FOIL PAPER SLEEVE (Классическая двухслойная обёртка: фольга + бумажная манжета)
 */
function drawFoilPaperSleevePack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  const w = 13.0;
  const h = 16.8;
  const left = -w / 2;
  const top = -h / 2;

  drawShadow(ctx, 7.2, 2.5, 8.2, 0.26);
  ctx.save();

  // Inner metallic foil body peeking from top & bottom ends
  const foilGrad = ctx.createLinearGradient(left, top, left + w, top + h);
  foilGrad.addColorStop(0.0, adjustColor(foilColor, 0.14));
  foilGrad.addColorStop(0.38, '#ffffff');
  foilGrad.addColorStop(0.65, foilColor);
  foilGrad.addColorStop(1.0, adjustColor(foilColor, -0.25));

  ctx.fillStyle = foilGrad;
  ctx.strokeStyle = adjustColor(foilColor, -0.35);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  if (isOpen) {
    // Torn/peeled foil flaps folded back at top
    ctx.moveTo(left, top + 4.4);
    ctx.lineTo(left - 1.1, top + 1.5);
    ctx.lineTo(-2.2, top + 2.8);
    ctx.lineTo(0.8, top + 0.8);
    ctx.lineTo(left + w + 1.0, top + 1.8);
    ctx.lineTo(left + w, top + 4.4);
  } else {
    ctx.roundRect(left, top, w, h, 0.7);
  }
  if (isOpen) {
    ctx.lineTo(left + w, top + h - 0.7);
    ctx.quadraticCurveTo(left + w, top + h, left + w - 0.7, top + h);
    ctx.lineTo(left + 0.7, top + h);
    ctx.quadraticCurveTo(left, top + h, left, top + h - 0.7);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  // Embossed foil micro-grid lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 0.35;
  for (let y = top + 1.0; y < top + h - 0.6; y += 1.6) {
    if (isOpen && y < top + 4.5) continue;
    ctx.beginPath();
    ctx.moveTo(left + 0.6, y);
    ctx.lineTo(left + w - 0.6, y);
    ctx.stroke();
  }

  // If open: expose upper pocket + inner chocolate if any
  if (isOpen) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(left + 1.0, top + 2.4, w - 2.0, 3.6, 0.4);
    ctx.fill();
    if (item?.contents && item.contents.length > 0) {
      const inner = item.contents[0];
      if (inner && inner.itemId !== item.itemId) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(left + 0.8, top + 0.5, w - 1.6, 6.2, 0.5);
        ctx.clip();
        drawItemModel2D(ctx, inner.itemId, 0, top + 3.8, 9.6, inner, true);
        ctx.restore();
      }
    }
  }

  // Outer crisp paper sleeve jacket wrapping the middle 78% of the bar
  const sleeveTop = isOpen ? top + 4.6 : top + 1.5;
  const sleeveH = isOpen ? h - 6.0 : h - 3.0;

  const sleeveGrad = ctx.createLinearGradient(left, sleeveTop, left + w, sleeveTop + sleeveH);
  sleeveGrad.addColorStop(0.0, adjustColor(labelColor, 0.14));
  sleeveGrad.addColorStop(0.5, labelColor);
  sleeveGrad.addColorStop(1.0, adjustColor(labelColor, -0.25));

  ctx.fillStyle = sleeveGrad;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(left - 0.25, sleeveTop, w + 0.5, sleeveH, 0.45);
  ctx.fill();
  ctx.stroke();

  // Gold filigree frame on front of paper sleeve
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.roundRect(left + 0.9, sleeveTop + 1.0, w - 1.8, sleeveH - 2.0, 0.4);
  ctx.stroke();

  // Cream/gold cocoa medallion badge
  const badgeY = sleeveTop + sleeveH * 0.42;
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.roundRect(left + 1.7, badgeY - 2.5, w - 3.4, 5.0, 0.8);
  ctx.fill();

  // Mini cocoa bean / square chocolate icon inside badge
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.roundRect(-3.3, badgeY - 1.4, 2.6, 2.8, 0.35);
  ctx.fill();
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-3.0, badgeY - 1.1, 0.9, 1.1);
  ctx.fillRect(-1.9, badgeY - 1.1, 0.9, 1.1);

  // Label text lines
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-0.1, badgeY - 1.1, 3.8, 0.75);
  ctx.fillStyle = labelColor;
  ctx.fillRect(-0.1, badgeY + 0.2, 2.8, 0.55);

  // Bottom cacao percentage strip
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.roundRect(-2.4, sleeveTop + sleeveH - 2.6, 4.8, 1.1, 0.4);
  ctx.fill();

  drawWrapperSheen(ctx, left, sleeveTop, w, sleeveH);
  ctx.restore();
}

/**
 * 4. SQUARE FLOW (Квадратная пачка-конверт для квадратной плитки)
 */
function drawSquareFlowPack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  const s = 14.6;
  const half = s / 2;

  drawShadow(ctx, 7.6, 2.5, 7.8, 0.26);
  ctx.save();

  // Sealed outer crimped side border
  ctx.fillStyle = adjustColor(labelColor, -0.2);
  ctx.beginPath();
  ctx.roundRect(-half, isOpen ? -half + 1.6 : -half, s, isOpen ? s - 1.6 : s, 1.1);
  ctx.fill();

  // Main square glossy body
  const bodyTop = isOpen ? -half + 2.2 : -half + 0.9;
  const bodyH = half - bodyTop - 0.9;
  const grad = ctx.createLinearGradient(-half, bodyTop, half, half);
  grad.addColorStop(0.0, adjustColor(labelColor, 0.18));
  grad.addColorStop(0.5, labelColor);
  grad.addColorStop(1.0, adjustColor(labelColor, -0.24));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-half + 0.9, bodyTop, s - 1.8, bodyH, 0.75);
  ctx.fill();

  // Signature knick-pack fold crease line across middle
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 0.6;
  ctx.setLineDash([1.1, 0.7]);
  ctx.beginPath();
  ctx.moveTo(-half + 1.2, 0.4);
  ctx.lineTo(half - 1.2, 0.4);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bright diagonal brand ribbon
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-half + 0.9, bodyTop, s - 1.8, bodyH, 0.75);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-half + 0.9, -2.5, s - 1.8, 3.1);
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-4.2, -1.6, 8.4, 0.9);
  ctx.fillStyle = labelColor;
  ctx.fillRect(-2.8, -0.35, 5.6, 0.55);
  ctx.restore();

  if (isOpen) {
    // Exposed foil mouth at top
    ctx.fillStyle = foilColor;
    ctx.beginPath();
    ctx.moveTo(-half + 1.1, bodyTop + 0.4);
    ctx.lineTo(-2.6, bodyTop - 1.5);
    ctx.lineTo(0.4, bodyTop - 0.3);
    ctx.lineTo(3.4, bodyTop - 1.6);
    ctx.lineTo(half - 1.1, bodyTop + 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-half + 1.8, bodyTop - 0.2, s - 3.6, 1.3);

    if (item?.contents && item.contents.length > 0) {
      const inner = item.contents[0];
      if (inner && inner.itemId !== item.itemId) {
        drawItemModel2D(ctx, inner.itemId, 0, 2.2, 8.5, inner, true);
      }
    }
  } else {
    // Bottom embossed square grid emblem
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let gx = -3.0; gx <= 1.2; gx += 2.1) {
      ctx.fillRect(gx, 2.0, 1.6, 1.6);
      ctx.fillRect(gx, 4.0, 1.6, 1.6);
    }
  }

  drawWrapperSheen(ctx, -half + 0.9, bodyTop, s - 1.8, bodyH);
  ctx.restore();
}

/**
 * 5. TRIANGULAR PRISM (Треугольная картонная коробочка-призма)
 */
function drawTriangularPrismPack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  drawShadow(ctx, 8.8, 2.8, 7.6, 0.28);
  ctx.save();
  ctx.rotate(-0.26);

  const left = -8.6;
  const right = 8.6;

  // Lit upper-left slanted prism face
  const topFaceGrad = ctx.createLinearGradient(left, -4.6, right, -0.4);
  topFaceGrad.addColorStop(0.0, '#fef9c3');
  topFaceGrad.addColorStop(0.5, adjustColor(labelColor, 0.24));
  topFaceGrad.addColorStop(1.0, labelColor);

  ctx.fillStyle = topFaceGrad;
  ctx.strokeStyle = adjustColor(labelColor, -0.35);
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(left + 1.8, -4.2);
  ctx.lineTo(right - 1.0, -4.2);
  ctx.lineTo(right - 2.4, 0.4);
  ctx.lineTo(left + 0.4, 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shaded lower-front slanted prism face
  const botFaceGrad = ctx.createLinearGradient(left, 0.4, right, 4.4);
  botFaceGrad.addColorStop(0.0, labelColor);
  botFaceGrad.addColorStop(1.0, adjustColor(labelColor, -0.34));

  ctx.fillStyle = botFaceGrad;
  ctx.beginPath();
  ctx.moveTo(left + 0.4, 0.4);
  ctx.lineTo(right - 2.4, 0.4);
  ctx.lineTo(right - 1.2, 4.2);
  ctx.lineTo(left + 1.6, 4.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Triangular end cap on right (open flap if isOpen)
  ctx.fillStyle = isOpen ? '#1e293b' : adjustColor(labelColor, -0.18);
  ctx.beginPath();
  ctx.moveTo(right - 1.0, -4.2);
  ctx.lineTo(right - 2.4, 0.4);
  ctx.lineTo(right - 1.2, 4.2);
  ctx.lineTo(right + 0.3, 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (isOpen) {
    // Folded-open triangle flap & foil peek
    ctx.fillStyle = foilColor;
    ctx.beginPath();
    ctx.moveTo(right - 0.6, -3.4);
    ctx.lineTo(right + 1.8, -2.0);
    ctx.lineTo(right - 1.4, 0.4);
    ctx.closePath();
    ctx.fill();

    if (item?.contents && item.contents.length > 0) {
      const inner = item.contents[0];
      if (inner && inner.itemId !== item.itemId) {
        drawItemModel2D(ctx, inner.itemId, right - 1.4, -0.4, 6.2, inner, true);
      }
    }
  }

  // Gold triangular mountain logo & typography along prism ridge
  ctx.fillStyle = '#fef08a';
  for (let px = -5.0; px <= 3.0; px += 4.0) {
    ctx.beginPath();
    ctx.moveTo(px - 1.2, -1.0);
    ctx.lineTo(px, -3.0);
    ctx.lineTo(px + 1.2, -1.0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-5.2, 1.4, 7.6, 1.2);

  ctx.restore();
}

/**
 * 6. CRAFT ENVELOPE XL (Крупный крафт-конверт XXL с фольгой и отрывной перфорацией)
 */
function drawCraftEnvelopeXLPack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  const w = 15.2;
  const h = 17.6;
  const left = -w / 2;
  const top = -h / 2;

  drawShadow(ctx, 8.2, 2.7, 8.8, 0.28);
  ctx.save();

  // Thick textured kraft cardboard outer envelope
  const kraftGrad = ctx.createLinearGradient(left, top, left + w, top + h);
  kraftGrad.addColorStop(0.0, '#d6b88d');
  kraftGrad.addColorStop(0.5, '#c29e6c');
  kraftGrad.addColorStop(1.0, '#9c7849');

  ctx.fillStyle = kraftGrad;
  ctx.strokeStyle = '#78572d';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.roundRect(left, isOpen ? top + 1.8 : top, w, isOpen ? h - 1.8 : h, 0.9);
  ctx.fill();
  ctx.stroke();

  if (isOpen) {
    // Torn tear-strip top & golden foil peeking out
    ctx.fillStyle = foilColor;
    ctx.beginPath();
    ctx.moveTo(left + 0.8, top + 2.0);
    ctx.lineTo(-3.4, top + 0.2);
    ctx.lineTo(0.2, top + 1.4);
    ctx.lineTo(3.8, top + 0.1);
    ctx.lineTo(left + w - 0.8, top + 2.0);
    ctx.lineTo(left + w - 0.8, top + 4.2);
    ctx.lineTo(left + 0.8, top + 4.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(left + 1.4, top + 2.4, w - 2.8, 1.5);

    if (item?.contents && item.contents.length > 0) {
      const inner = item.contents[0];
      if (inner && inner.itemId !== item.itemId) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(left + 1.2, top + 0.4, w - 2.4, 5.5, 0.4);
        ctx.clip();
        drawItemModel2D(ctx, inner.itemId, 0, top + 3.4, 9.6, inner, true);
        ctx.restore();
      }
    }
  } else {
    // Perforated tear-zip strip across upper edge
    ctx.strokeStyle = '#78572d';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([1.1, 0.8]);
    ctx.beginPath();
    ctx.moveTo(left + 0.6, top + 2.5);
    ctx.lineTo(left + w - 0.6, top + 2.5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Colored artisan belly label band
  const bandTop = isOpen ? top + 4.8 : top + 3.6;
  const bandH = h - 7.0;
  ctx.fillStyle = labelColor;
  ctx.beginPath();
  ctx.roundRect(left + 0.7, bandTop, w - 1.4, bandH, 0.6);
  ctx.fill();

  // Gold foil crest & XXL lettering bars
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.roundRect(left + 1.4, bandTop + 0.8, w - 2.8, bandH - 1.6, 0.4);
  ctx.stroke();

  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.arc(0, bandTop + bandH * 0.42, 3.0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.roundRect(-1.5, bandTop + bandH * 0.42 - 1.4, 3.0, 2.8, 0.4);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-3.8, bandTop + bandH - 2.8, 7.6, 1.0);

  drawWrapperSheen(ctx, left + 0.7, bandTop, w - 1.4, bandH);
  ctx.restore();
}

/**
 * 7. GIFT BOX (Подарочная коробка ассорти с коррексом, лентой и смотровым окном)
 */
function drawGiftBoxChocolatePack(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  foilColor: string,
  isOpen: boolean,
  item?: any
) {
  const w = 17.6;
  const h = 14.4;
  const left = -w / 2;
  const top = -h / 2;

  drawShadow(ctx, 9.2, 2.8, 8.6, 0.30);
  ctx.save();

  // Box base bevel & lid
  const boxGrad = ctx.createLinearGradient(left, top, left + w, top + h);
  boxGrad.addColorStop(0.0, adjustColor(labelColor, 0.16));
  boxGrad.addColorStop(0.55, labelColor);
  boxGrad.addColorStop(1.0, adjustColor(labelColor, -0.28));

  ctx.fillStyle = boxGrad;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.roundRect(left, top, w, h, 1.2);
  ctx.fill();
  ctx.stroke();

  // Transparent display window / open tray showing chocolates inside!
  const winW = w - 3.6;
  const winH = h - 4.4;
  const winX = -winW / 2;
  const winY = -winH / 2 + 0.5;

  // Inner chocolate blister tray ("коррекс")
  ctx.fillStyle = isOpen ? '#29150b' : '#451a03';
  ctx.strokeStyle = foilColor;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.roundRect(winX, winY, winW, winH, 0.9);
  ctx.fill();
  ctx.stroke();

  if (item?.contents && item.contents.length > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(winX + 0.3, winY + 0.3, winW - 0.6, winH - 0.6, 0.7);
    ctx.clip();

    const cols = 3;
    const rows = 2;
    const cellW = winW / cols;
    const cellH = winH / rows;
    const count = Math.min(6, item.contents.length);
    for (let i = 0; i < count; i++) {
      const inner = item.contents[i];
      if (!inner || inner.itemId === item.itemId) continue;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = winX + cellW * (col + 0.5);
      const cy = winY + cellH * (row + 0.5);

      // Golden molded blister cup under each chocolate
      ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 0.3, cellW * 0.38, cellH * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      drawItemModel2D(ctx, inner.itemId, cx, cy, Math.min(cellW, cellH) * 1.15, inner, true);
    }
    ctx.restore();
  } else {
    // Empty golden molded blister cells
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = 0.45;
    const cols = 3;
    const rows = 2;
    const cellW = winW / cols;
    const cellH = winH / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        ctx.roundRect(winX + c * cellW + 0.8, winY + r * cellH + 0.8, cellW - 1.6, cellH - 1.6, 0.6);
        ctx.stroke();
      }
    }
  }

  // Cellophane window reflection if sealed
  if (!isOpen) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.beginPath();
    ctx.moveTo(winX + 1.0, winY + 0.4);
    ctx.lineTo(winX + 4.8, winY + 0.4);
    ctx.lineTo(winX + 2.2, winY + winH - 0.4);
    ctx.lineTo(winX + 0.4, winY + winH - 0.4);
    ctx.closePath();
    ctx.fill();

    // Satin ribbon corner bow in top-left
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(left + 0.4, top + 4.4);
    ctx.lineTo(left + 4.4, top + 0.4);
    ctx.lineTo(left + 6.2, top + 0.4);
    ctx.lineTo(left + 0.4, top + 6.2);
    ctx.closePath();
    ctx.fill();
  } else {
    // Hinged lid edge popped open at top
    ctx.fillStyle = adjustColor(labelColor, 0.22);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(left + 0.5, top - 1.8, w - 1.0, 2.2, 0.6);
    ctx.fill();
    ctx.stroke();
  }

  // Gold header brand plaque
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.roundRect(-4.6, top + 0.55, 9.2, 1.5, 0.5);
  ctx.fill();
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-3.4, top + 1.05, 6.8, 0.45);

  ctx.restore();
}

// ============================================================================
// HELPERS
// ============================================================================

function drawHorizontalCrimpedFin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  side: 'left' | 'right'
) {
  ctx.save();
  ctx.fillStyle = adjustColor(color, -0.18);
  const teeth = 6;
  const step = h / teeth;
  ctx.beginPath();
  if (side === 'left') {
    ctx.moveTo(x + w, y);
    for (let i = 0; i <= teeth; i++) {
      const ty = y + i * step;
      const tx = i % 2 === 0 ? x : x + 0.45;
      ctx.lineTo(tx, ty);
    }
    ctx.lineTo(x + w, y + h);
  } else {
    ctx.moveTo(x, y);
    for (let i = 0; i <= teeth; i++) {
      const ty = y + i * step;
      const tx = i % 2 === 0 ? x + w : x + w - 0.45;
      ctx.lineTo(tx, ty);
    }
    ctx.lineTo(x, y + h);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWrapperSheen(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  const sheen = ctx.createLinearGradient(x, y, x + w, y + h);
  sheen.addColorStop(0.0, 'rgba(255, 255, 255, 0.24)');
  sheen.addColorStop(0.35, 'rgba(255, 255, 255, 0.03)');
  sheen.addColorStop(0.55, 'rgba(255, 255, 255, 0.18)');
  sheen.addColorStop(1.0, 'rgba(255, 255, 255, 0.04)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.roundRect(x + 0.2, y + 0.2, w - 0.4, h - 0.4, 0.6);
  ctx.fill();
  ctx.restore();
}

function adjustColor(hex: string, percent: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return hex;

  let r = (num >> 16) + Math.round(255 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * percent);
  let b = (num & 0x0000ff) + Math.round(255 * percent);

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

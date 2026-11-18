// Procedural 2D Canvas Models for Plastic Candy & Confectionery Packaging
// Studio-grade BOPP / metallized laminate pouches with realistic crimped seals,
// anisotropic polymer sheen, die-cut viewing windows, editorial labels, and open/torn states.

import { CandyPackagingShape } from '../types';
import {
  drawShadow,
  drawBotanicalLeaf,
  drawCrimpedSeal,
  drawMicroBarcode,
  drawPouchCrinkles,
  drawFilmWindow,
  adjustHex,
  hexToRgba,
  hash01
} from './itemGraphicShared';
import { drawItemModel2D } from '../itemGraphic';

export type CandyPackagingSize = 'mini' | 'small' | 'medium' | 'large';

const SCALE_BY_SIZE: Record<CandyPackagingSize, number> = {
  mini: 0.80,
  small: 0.92,
  medium: 1.0,
  large: 1.12
};

export function getCandyPackagingSize(itemId: string, item?: any): CandyPackagingSize {
  if (item?.packagingSize && ['mini', 'small', 'medium', 'large'].includes(item.packagingSize)) {
    return item.packagingSize;
  }
  if (itemId.includes('_mini') || itemId.includes('_xs')) return 'mini';
  if (itemId.includes('_small') || itemId.includes('_euro')) return 'small';
  if (itemId.includes('_large') || itemId.includes('_xl')) return 'large';
  return 'medium';
}

export function getCandyPackagingShape(itemId: string, item?: any): CandyPackagingShape {
  if (
    item?.packagingShape &&
    ['flat_sachet', 'pillow', 'doypack', 'gusset', 'hanging_card'].includes(item.packagingShape)
  ) {
    return item.packagingShape;
  }
  if (itemId.includes('mini') || itemId.includes('sachet')) return 'flat_sachet';
  if (itemId.includes('euro') || itemId.includes('hanging')) return 'hanging_card';
  if (itemId.includes('small') || itemId.includes('pillow')) return 'pillow';
  if (itemId.includes('large') || itemId.includes('gusset')) return 'gusset';
  return 'doypack';
}

export function getCandyLabelColor(itemId: string, item?: any): string {
  if (item?.labelColor && typeof item.labelColor === 'string') return item.labelColor;
  if (itemId.includes('_lime') || itemId.includes('_apple') || itemId.includes('_green')) return '#15803d';
  if (itemId.includes('_berry') || itemId.includes('_blue')) return '#1d4ed8';
  if (itemId.includes('_lemon') || itemId.includes('_yellow')) return '#ca8a04';
  if (itemId.includes('_grape') || itemId.includes('_purple')) return '#6d28d9';
  if (itemId.includes('_orange')) return '#c2410c';
  if (itemId.includes('_cola')) return '#7f1d1d';
  if (itemId.includes('_mint')) return '#0f766e';
  if (itemId.includes('_mini')) return '#be185d';
  if (itemId.includes('_small')) return '#c2410c';
  if (itemId.includes('_euro')) return '#5b21b6';
  if (itemId.includes('_large')) return '#047857';
  return '#9f1239';
}

export function getCandyFilmColor(itemId: string, item?: any, labelColor?: string): string {
  if (item?.containerTintColor && typeof item.containerTintColor === 'string') {
    return item.containerTintColor;
  }
  const base = labelColor || getCandyLabelColor(itemId, item);
  return adjustHex(base, 0.14);
}

export function isCandyPackagingOpen(itemId: string, item?: any): boolean {
  if (item?.isOpen !== undefined) return !!item.isOpen;
  return itemId.includes('_open') || itemId.includes('_torn');
}

export function drawCandyPackagingItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  item?: any
): boolean {
  const isCandyPackaging = itemId === 'candy_pouch' || itemId.startsWith('candy_pouch_');
  if (!isCandyPackaging) return false;

  const sizeTier = getCandyPackagingSize(itemId, item);
  const shape = getCandyPackagingShape(itemId, item);
  const isOpen = isCandyPackagingOpen(itemId, item);
  const labelColor = getCandyLabelColor(itemId, item);
  const filmColor = getCandyFilmColor(itemId, item, labelColor);
  const scale = SCALE_BY_SIZE[sizeTier] || 1.0;

  ctx.save();
  ctx.scale(scale, scale);

  switch (shape) {
    case 'flat_sachet':
      drawFlatSachetCandyPouch(ctx, labelColor, filmColor, isOpen, item);
      break;
    case 'pillow':
      drawPillowFlowPackCandyPouch(ctx, labelColor, filmColor, isOpen, item);
      break;
    case 'hanging_card':
      drawHangingCardCandyPouch(ctx, labelColor, filmColor, isOpen, item);
      break;
    case 'gusset':
      drawGussetBagCandyPouch(ctx, labelColor, filmColor, isOpen, item);
      break;
    case 'doypack':
    default:
      drawDoypackCandyPouch(ctx, labelColor, filmColor, isOpen, item);
      break;
  }

  ctx.restore();
  return true;
}

// ---------------------------------------------------------------------------
// Internal Studio Helpers
// ---------------------------------------------------------------------------

function drawConfectioneryContents(
  ctx: CanvasRenderingContext2D,
  item: any,
  cx: number,
  cy: number,
  spreadX: number,
  spreadY: number,
  _labelColor: string,
  seed: number = 23
) {
  const rawContents: any[] = Array.isArray(item?.contents) ? item.contents : [];
  const contents = rawContents.filter(
    (inner) => inner && inner.itemId && !inner.itemId.startsWith('candy_pouch')
  );
  if (contents.length === 0) {
    return;
  }

  const coords: Array<[number, number, number, number]> =
    contents.length === 1
      ? [[0, spreadY * 0.2, 10.5, 0.08]]
      : contents.length === 2
      ? [
          [-spreadX * 0.34, spreadY * 0.24, 9.5, -0.18],
          [spreadX * 0.34, spreadY * 0.18, 9.5, 0.2]
        ]
      : [
          [-spreadX * 0.52, -spreadY * 0.22, 8.8, -0.22],
          [spreadX * 0.5, -spreadY * 0.14, 8.8, 0.26],
          [0, spreadY * 0.3, 9.2, 0.06],
          [-spreadX * 0.38, spreadY * 0.48, 8.4, 0.35],
          [spreadX * 0.38, spreadY * 0.44, 8.4, -0.28],
          [0, -spreadY * 0.34, 8.4, -0.1],
          [-spreadX * 0.04, spreadY * 0.04, 8.6, 0.14]
        ];

  const slots = Math.min(coords.length, contents.length);
  for (let i = 0; i < slots; i++) {
    const inner = contents[i];
    const [ox, oy, sz, rot] = coords[i];
    ctx.save();
    ctx.translate(cx + ox, cy + oy);
    ctx.rotate(rot);
    drawItemModel2D(ctx, inner.itemId, 0, 0, sz, inner, true);
    ctx.restore();
  }

  // Fine sugar / citric dust at bottom seam only when confectionery is inside
  ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
  for (let i = 0; i < 6; i++) {
    const dx = cx + (hash01(seed, i * 2) - 0.5) * spreadX * 1.4;
    const dy = cy + spreadY * (0.52 + hash01(seed, i * 2 + 1) * 0.32);
    ctx.fillRect(dx, dy, 0.28, 0.24);
  }
}

function drawEditorialCandyHeader(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  w: number,
  h: number,
  accentHex: string
) {
  ctx.save();
  // Cream cotton-finish label band with subtle bevel
  const bandGrad = ctx.createLinearGradient(cx - w / 2, y, cx + w / 2, y);
  bandGrad.addColorStop(0.0, '#e7e2d4');
  bandGrad.addColorStop(0.28, '#faf8f2');
  bandGrad.addColorStop(0.72, '#f5f2e8');
  bandGrad.addColorStop(1.0, '#d6d0c0');

  ctx.fillStyle = bandGrad;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, y, w, h, 0.45);
  ctx.fill();

  // Metallic gold/copper border rule
  ctx.strokeStyle = adjustHex(accentHex, -0.15);
  ctx.lineWidth = 0.24;
  ctx.strokeRect(cx - w / 2 + 0.28, y + 0.28, w - 0.56, h - 0.56);

  // Colored top accent hairline
  ctx.fillStyle = accentHex;
  ctx.fillRect(cx - w / 2 + 0.28, y + 0.28, w - 0.56, Math.max(0.35, h * 0.16));

  // Botanical sprig & serif typographic mark
  drawBotanicalLeaf(ctx, cx - w * 0.29, y + h * 0.62, w * 0.15, h * 0.18, -0.25, adjustHex(accentHex, 0.25), '#14532d');
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(cx - w * 0.1, y + h * 0.45, w * 0.44, Math.max(0.32, h * 0.12));
  ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
  ctx.fillRect(cx - w * 0.1, y + h * 0.68, w * 0.3, Math.max(0.22, h * 0.08));
  ctx.restore();
}

function drawMetallizedInteriorLip(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  rightX: number,
  tearY: number,
  jagOffsets: number[]
) {
  ctx.save();
  // Dark interior cavity behind torn lip
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.ellipse((leftX + rightX) * 0.5, tearY + 0.4, (rightX - leftX) * 0.46, 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  // Exposed silver aluminum foil inner layer along jagged tear
  const foilGrad = ctx.createLinearGradient(leftX, tearY, rightX, tearY);
  foilGrad.addColorStop(0.0, '#94a3b8');
  foilGrad.addColorStop(0.35, '#f8fafc');
  foilGrad.addColorStop(0.7, '#cbd5e1');
  foilGrad.addColorStop(1.0, '#64748b');

  ctx.strokeStyle = foilGrad;
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  const steps = jagOffsets.length - 1;
  for (let i = 0; i <= steps; i++) {
    const px = leftX + (i / steps) * (rightX - leftX);
    const py = tearY + jagOffsets[i];
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

// ============================================================================
// 1. DOYPACK STAND-UP ZIP POUCH (Дой-пак)
// ============================================================================

function drawDoypackCandyPouch(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  filmColor: string,
  isOpen: boolean,
  item?: any
) {
  const hwTop = 5.9;
  const hwBot = 6.7;
  const topY = -8.6;
  const botY = 8.4;
  const sealH = 1.25;
  const tearY = -5.7;

  drawShadow(ctx, 7.6, 2.2, 8.7, 0.28);

  // Stand-up bottom gusset base depth
  ctx.fillStyle = adjustHex(filmColor, -0.52);
  ctx.beginPath();
  ctx.ellipse(0, botY - 0.15, hwBot - 0.15, 1.35, 0, 0, Math.PI * 2);
  ctx.fill();

  const traceBody = () => {
    ctx.beginPath();
    if (!isOpen) {
      ctx.moveTo(-hwTop, topY);
      ctx.lineTo(hwTop, topY);
      ctx.lineTo(hwTop, topY + 2.0);
      ctx.lineTo(hwTop - 0.35, topY + 2.25); // laser tear notch right
      ctx.lineTo(hwTop, topY + 2.5);
      ctx.bezierCurveTo(hwBot + 0.15, 0.5, hwBot + 0.2, 5.2, hwBot, botY - 0.6);
      ctx.quadraticCurveTo(0, botY + 1.0, -hwBot, botY - 0.6);
      ctx.bezierCurveTo(-hwBot - 0.2, 5.2, -hwBot - 0.15, 0.5, -hwTop, topY + 2.5);
      ctx.lineTo(-hwTop + 0.35, topY + 2.25); // laser tear notch left
      ctx.lineTo(-hwTop, topY + 2.0);
      ctx.closePath();
    } else {
      ctx.moveTo(-hwTop, tearY + 0.3);
      ctx.lineTo(-hwTop * 0.5, tearY - 0.45);
      ctx.lineTo(-hwTop * 0.1, tearY + 0.2);
      ctx.lineTo(hwTop * 0.35, tearY - 0.5);
      ctx.lineTo(hwTop, tearY + 0.15);
      ctx.bezierCurveTo(hwBot + 0.15, 0.5, hwBot + 0.2, 5.2, hwBot, botY - 0.6);
      ctx.quadraticCurveTo(0, botY + 1.0, -hwBot, botY - 0.6);
      ctx.bezierCurveTo(-hwBot - 0.2, 5.2, -hwBot - 0.15, 0.5, -hwTop, tearY + 0.3);
      ctx.closePath();
    }
  };

  // Matte-satin laminated pouch body gradient
  const bodyGrad = ctx.createLinearGradient(-hwBot, topY, hwBot, botY);
  bodyGrad.addColorStop(0.0, adjustHex(filmColor, -0.35));
  bodyGrad.addColorStop(0.24, adjustHex(filmColor, 0.18));
  bodyGrad.addColorStop(0.55, filmColor);
  bodyGrad.addColorStop(0.88, adjustHex(filmColor, -0.36));
  bodyGrad.addColorStop(1.0, adjustHex(filmColor, -0.5));
  ctx.fillStyle = bodyGrad;
  traceBody();
  ctx.fill();

  ctx.save();
  traceBody();
  ctx.clip();

  // Diagonal studio satin sheen & crinkles
  const sheen = ctx.createLinearGradient(-hwBot, -6, hwBot, 4);
  sheen.addColorStop(0.0, 'rgba(255, 255, 255, 0.02)');
  sheen.addColorStop(0.28, 'rgba(255, 255, 255, 0.22)');
  sheen.addColorStop(0.45, 'rgba(255, 255, 255, 0.03)');
  sheen.addColorStop(1.0, 'rgba(15, 23, 42, 0.18)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-hwBot - 1, topY - 1, hwBot * 2 + 2, botY - topY + 3);

  drawPouchCrinkles(ctx, -hwBot, -4, hwBot * 2, 12, 101, 0.18);

  // Side heat-weld border seams
  drawCrimpedSeal(ctx, -hwBot, topY, 0.9, botY - topY + 2, filmColor, false, 0.85);
  drawCrimpedSeal(ctx, hwBot - 0.9, topY, 0.9, botY - topY + 2, filmColor, false, 0.85);

  if (!isOpen) {
    drawCrimpedSeal(ctx, -hwTop, topY, hwTop * 2, sealH, filmColor, true, 0.72);
    // Laser-scored tear track
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.setLineDash([0.7, 0.55]);
    ctx.lineWidth = 0.24;
    ctx.beginPath();
    ctx.moveTo(-hwTop + 0.6, tearY + 0.2);
    ctx.lineTo(hwTop - 0.6, tearY + 0.2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Double-rail zip-lock track
  const zipY = -4.55;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
  ctx.fillRect(-hwTop + 1.0, zipY, (hwTop - 1.0) * 2, 0.28);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.fillRect(-hwTop + 1.0, zipY + 0.32, (hwTop - 1.0) * 2, 0.22);

  // Editorial label header
  drawEditorialCandyHeader(ctx, 0, -3.55, 9.8, 3.05, labelColor);

  // Clear die-cut bottom-rounded oval window showing confectionery
  const traceWin = () => {
    ctx.beginPath();
    ctx.roundRect(-4.45, 0.15, 8.9, 5.7, 2.2);
  };
  drawFilmWindow(
    ctx,
    traceWin,
    () => drawConfectioneryContents(ctx, item, 0, 2.95, 3.6, 2.1, labelColor, 31),
    'rgba(255, 255, 255, 0.55)',
    '#090d16'
  );

  // Subtle bottom weight bar & micro barcode
  drawMicroBarcode(ctx, 2.3, 6.55, 2.8, 1.05, 'rgba(15, 23, 42, 0.7)', 'rgba(255, 255, 255, 0.78)');
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillRect(-4.6, 6.85, 3.8, 0.35);

  ctx.restore();

  if (isOpen) {
    drawMetallizedInteriorLip(ctx, -hwTop + 0.4, hwTop - 0.4, tearY, [0.3, -0.45, 0.2, -0.5, 0.15]);
  }

  // Outer perimeter bevel
  ctx.strokeStyle = adjustHex(filmColor, -0.6);
  ctx.lineWidth = 0.38;
  traceBody();
  ctx.stroke();
}

// ============================================================================
// 2. FLAT SACHET (Плоское саше-пакетик)
// ============================================================================

function drawFlatSachetCandyPouch(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  filmColor: string,
  isOpen: boolean,
  item?: any
) {
  const hw = 5.4;
  const topY = -7.2;
  const botY = 7.2;
  const tearY = -4.6;

  drawShadow(ctx, 5.6, 1.6, 7.6, 0.24);

  const traceBody = () => {
    ctx.beginPath();
    if (!isOpen) {
      ctx.roundRect(-hw, topY, hw * 2, botY - topY, 0.5);
    } else {
      ctx.moveTo(-hw, tearY + 0.4);
      ctx.lineTo(-hw * 0.4, tearY - 0.45);
      ctx.lineTo(0.4, tearY + 0.25);
      ctx.lineTo(hw, tearY - 0.3);
      ctx.lineTo(hw, botY - 0.4);
      ctx.quadraticCurveTo(hw, botY, hw - 0.5, botY);
      ctx.lineTo(-hw + 0.5, botY);
      ctx.quadraticCurveTo(-hw, botY, -hw, botY - 0.4);
      ctx.closePath();
    }
  };

  const fGrad = ctx.createLinearGradient(-hw, topY, hw, botY);
  fGrad.addColorStop(0.0, adjustHex(filmColor, -0.28));
  fGrad.addColorStop(0.28, adjustHex(filmColor, 0.22));
  fGrad.addColorStop(0.65, filmColor);
  fGrad.addColorStop(1.0, adjustHex(filmColor, -0.44));
  ctx.fillStyle = fGrad;
  traceBody();
  ctx.fill();

  ctx.save();
  traceBody();
  ctx.clip();

  // Four-side flat crimped perimeter seals
  const rim = 0.95;
  drawCrimpedSeal(ctx, -hw, topY, rim, botY - topY, filmColor, false, 0.72);
  drawCrimpedSeal(ctx, hw - rim, topY, rim, botY - topY, filmColor, false, 0.72);
  drawCrimpedSeal(ctx, -hw, botY - rim, hw * 2, rim, filmColor, true, 0.72);
  if (!isOpen) {
    drawCrimpedSeal(ctx, -hw, topY, hw * 2, rim, filmColor, true, 0.72);
  }

  drawPouchCrinkles(ctx, -hw, topY, hw * 2, botY - topY, 44, 0.16);
  drawEditorialCandyHeader(ctx, 0, -4.4, 8.2, 2.75, labelColor);

  const traceWin = () => {
    ctx.beginPath();
    ctx.roundRect(-3.65, -0.85, 7.3, 5.2, 1.4);
  };
  drawFilmWindow(
    ctx,
    traceWin,
    () => drawConfectioneryContents(ctx, item, 0, 1.7, 2.8, 1.7, labelColor, 55),
    'rgba(255, 255, 255, 0.55)',
    '#090d16'
  );

  drawMicroBarcode(ctx, 1.4, 4.95, 2.5, 0.95);
  ctx.restore();

  if (isOpen) {
    drawMetallizedInteriorLip(ctx, -hw + 0.3, hw - 0.3, tearY, [0.4, -0.45, 0.25, -0.3]);
  }

  ctx.strokeStyle = adjustHex(filmColor, -0.58);
  ctx.lineWidth = 0.36;
  traceBody();
  ctx.stroke();
}

// ============================================================================
// 3. PILLOW FLOW-PACK (Подушка / Флоу-пак)
// ============================================================================

function drawPillowFlowPackCandyPouch(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  filmColor: string,
  isOpen: boolean,
  item?: any
) {
  const hw = 6.2;
  const topY = -7.8;
  const botY = 7.8;
  const finH = 1.2;
  const tearY = -4.9;

  drawShadow(ctx, 6.8, 2.0, 8.3, 0.28);

  const traceBody = () => {
    ctx.beginPath();
    if (!isOpen) {
      ctx.moveTo(-hw + 0.4, topY);
      ctx.lineTo(hw - 0.4, topY);
      ctx.lineTo(hw - 0.4, topY + finH);
      ctx.bezierCurveTo(hw + 0.85, -3.0, hw + 0.85, 3.0, hw - 0.4, botY - finH);
      ctx.lineTo(hw - 0.4, botY);
      ctx.lineTo(-hw + 0.4, botY);
      ctx.lineTo(-hw + 0.4, botY - finH);
      ctx.bezierCurveTo(-hw - 0.85, 3.0, -hw - 0.85, -3.0, -hw + 0.4, topY + finH);
      ctx.closePath();
    } else {
      ctx.moveTo(-hw + 0.4, tearY + 0.3);
      ctx.lineTo(-2.0, tearY - 0.6);
      ctx.lineTo(1.8, tearY + 0.45);
      ctx.lineTo(hw - 0.4, tearY - 0.3);
      ctx.bezierCurveTo(hw + 0.85, -1.5, hw + 0.85, 3.0, hw - 0.4, botY - finH);
      ctx.lineTo(hw - 0.4, botY);
      ctx.lineTo(-hw + 0.4, botY);
      ctx.lineTo(-hw + 0.4, botY - finH);
      ctx.bezierCurveTo(-hw - 0.85, 3.0, -hw - 0.85, -1.5, -hw + 0.4, tearY + 0.3);
      ctx.closePath();
    }
  };

  // Pillowed cylindrical specular highlight across puffy pouch center
  const pGrad = ctx.createLinearGradient(-hw - 0.8, 0, hw + 0.8, 0);
  pGrad.addColorStop(0.0, adjustHex(filmColor, -0.45));
  pGrad.addColorStop(0.18, adjustHex(filmColor, -0.1));
  pGrad.addColorStop(0.36, adjustHex(filmColor, 0.36));
  pGrad.addColorStop(0.55, filmColor);
  pGrad.addColorStop(0.85, adjustHex(filmColor, -0.35));
  pGrad.addColorStop(1.0, adjustHex(filmColor, -0.52));
  ctx.fillStyle = pGrad;
  traceBody();
  ctx.fill();

  ctx.save();
  traceBody();
  ctx.clip();

  drawCrimpedSeal(ctx, -hw, botY - finH, hw * 2, finH, filmColor, true, 0.68);
  if (!isOpen) {
    drawCrimpedSeal(ctx, -hw, topY, hw * 2, finH, filmColor, true, 0.68);
  }

  drawPouchCrinkles(ctx, -hw, -5, hw * 2, 10, 77, 0.22);
  drawEditorialCandyHeader(ctx, 0, -4.3, 9.2, 2.8, labelColor);

  const traceWin = () => {
    ctx.beginPath();
    ctx.ellipse(0, 2.1, 4.35, 3.0, 0, 0, Math.PI * 2);
  };
  drawFilmWindow(
    ctx,
    traceWin,
    () => drawConfectioneryContents(ctx, item, 0, 2.1, 3.4, 2.0, labelColor, 82),
    'rgba(255, 255, 255, 0.58)',
    '#090d16'
  );

  ctx.restore();

  if (isOpen) {
    drawMetallizedInteriorLip(ctx, -hw + 0.5, hw - 0.5, tearY, [0.3, -0.6, 0.45, -0.3]);
  }

  ctx.strokeStyle = adjustHex(filmColor, -0.6);
  ctx.lineWidth = 0.38;
  traceBody();
  ctx.stroke();
}

// ============================================================================
// 4. HANGING EURO-CARD POUCH (Евро-пакет с подвесом)
// ============================================================================

function drawHangingCardCandyPouch(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  filmColor: string,
  isOpen: boolean,
  item?: any
) {
  const hw = 5.6;
  const topY = -9.0;
  const headerBot = -5.4;
  const botY = 8.4;
  const tearY = -4.2;

  drawShadow(ctx, 6.2, 1.8, 8.6, 0.26);

  const traceBody = () => {
    ctx.beginPath();
    ctx.moveTo(-hw, topY + 0.5);
    ctx.quadraticCurveTo(-hw, topY, -hw + 0.6, topY);
    ctx.lineTo(hw - 0.6, topY);
    ctx.quadraticCurveTo(hw, topY, hw, topY + 0.5);
    ctx.lineTo(hw, botY - 0.5);
    ctx.quadraticCurveTo(hw, botY, hw - 0.5, botY);
    ctx.lineTo(-hw + 0.5, botY);
    ctx.quadraticCurveTo(-hw, botY, -hw, botY - 0.5);
    ctx.closePath();
  };

  // Glossy translucent polymer body below header
  const bagGrad = ctx.createLinearGradient(-hw, headerBot, hw, botY);
  bagGrad.addColorStop(0.0, adjustHex(filmColor, -0.25));
  bagGrad.addColorStop(0.28, adjustHex(filmColor, 0.22));
  bagGrad.addColorStop(0.7, filmColor);
  bagGrad.addColorStop(1.0, adjustHex(filmColor, -0.45));
  ctx.fillStyle = bagGrad;
  traceBody();
  ctx.fill();

  ctx.save();
  traceBody();
  ctx.clip();

  // Folded cardstock retail hang-tab topper (matte ivory + color strip)
  const cardGrad = ctx.createLinearGradient(-hw, topY, hw, headerBot);
  cardGrad.addColorStop(0.0, '#f5f2e8');
  cardGrad.addColorStop(0.5, '#ffffff');
  cardGrad.addColorStop(1.0, '#e2ddd0');
  ctx.fillStyle = cardGrad;
  ctx.fillRect(-hw, topY, hw * 2, headerBot - topY);

  ctx.fillStyle = labelColor;
  ctx.fillRect(-hw, headerBot - 1.25, hw * 2, 1.25);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.fillRect(-hw, headerBot, hw * 2, 0.38);

  // Stapled / riveted brass-like eyelet marks on card skirt
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-3.6, headerBot - 0.72, 1.1, 0.26);
  ctx.fillRect(2.5, headerBot - 0.72, 1.1, 0.26);

  // Die-cut euro-slot hanger cutout in cardstock topper
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-1.7, topY + 0.75, 3.4, 0.72, 0.36);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, topY + 1.1, 0.56, 0, Math.PI * 2);
  ctx.fill();

  drawPouchCrinkles(ctx, -hw, headerBot, hw * 2, botY - headerBot, 92, 0.16);

  // Viewing window across bag face
  const traceWin = () => {
    ctx.beginPath();
    ctx.roundRect(-4.1, -3.2, 8.2, 8.4, 1.3);
  };
  drawFilmWindow(
    ctx,
    traceWin,
    () => drawConfectioneryContents(ctx, item, 0, 1.1, 3.2, 2.8, labelColor, 114),
    'rgba(255, 255, 255, 0.55)',
    '#090d16'
  );

  // Bottom crimped skirt + micro barcode
  drawCrimpedSeal(ctx, -hw, botY - 1.1, hw * 2, 1.1, filmColor, true, 0.7);
  drawMicroBarcode(ctx, -1.6, 5.75, 3.2, 1.0);

  if (isOpen) {
    // Torn film flap curled down under card header
    drawMetallizedInteriorLip(ctx, -hw + 0.3, hw - 0.3, tearY, [0.25, -0.5, 0.35, -0.45, 0.2]);
  }
  ctx.restore();

  ctx.strokeStyle = adjustHex(filmColor, -0.55);
  ctx.lineWidth = 0.36;
  traceBody();
  ctx.stroke();
}

// ============================================================================
// 5. GUSSET STAND-UP FLAT-BOTTOM BAG (Фальцет)
// ============================================================================

function drawGussetBagCandyPouch(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  filmColor: string,
  isOpen: boolean,
  item?: any
) {
  const hw = 6.2;
  const sideW = 1.65;
  const topY = -8.8;
  const botY = 8.4;
  const tearY = -5.6;

  drawShadow(ctx, 7.6, 2.2, 8.6, 0.3);

  // Shaded 3D folded side gusset flanks
  ctx.fillStyle = adjustHex(filmColor, -0.46);
  ctx.beginPath();
  ctx.moveTo(-hw, topY + 0.8);
  ctx.lineTo(-hw - sideW * 0.7, topY + 1.8);
  ctx.lineTo(-hw - sideW * 0.75, botY - 0.6);
  ctx.lineTo(-hw, botY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = adjustHex(filmColor, -0.58);
  ctx.beginPath();
  ctx.moveTo(hw, topY + 0.8);
  ctx.lineTo(hw + sideW * 0.7, topY + 1.8);
  ctx.lineTo(hw + sideW * 0.75, botY - 0.6);
  ctx.lineTo(hw, botY);
  ctx.closePath();
  ctx.fill();

  // Side gusset fold V-creases
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.lineWidth = 0.28;
  ctx.beginPath();
  ctx.moveTo(-hw - sideW * 0.35, topY + 1.5);
  ctx.lineTo(-hw - sideW * 0.35, botY - 0.3);
  ctx.moveTo(hw + sideW * 0.35, topY + 1.5);
  ctx.lineTo(hw + sideW * 0.35, botY - 0.3);
  ctx.stroke();

  const traceFront = () => {
    ctx.beginPath();
    if (!isOpen) {
      ctx.roundRect(-hw, topY, hw * 2, botY - topY, 0.55);
    } else {
      ctx.moveTo(-hw, tearY + 0.3);
      ctx.lineTo(-hw * 0.45, tearY - 0.55);
      ctx.lineTo(0.2, tearY + 0.35);
      ctx.lineTo(hw * 0.55, tearY - 0.45);
      ctx.lineTo(hw, tearY + 0.2);
      ctx.lineTo(hw, botY - 0.4);
      ctx.quadraticCurveTo(hw, botY, hw - 0.5, botY);
      ctx.lineTo(-hw + 0.5, botY);
      ctx.quadraticCurveTo(-hw, botY, -hw, botY - 0.4);
      ctx.closePath();
    }
  };

  const frontGrad = ctx.createLinearGradient(-hw, topY, hw, botY);
  frontGrad.addColorStop(0.0, adjustHex(filmColor, -0.22));
  frontGrad.addColorStop(0.32, adjustHex(filmColor, 0.24));
  frontGrad.addColorStop(0.68, filmColor);
  frontGrad.addColorStop(1.0, adjustHex(filmColor, -0.4));
  ctx.fillStyle = frontGrad;
  traceFront();
  ctx.fill();

  ctx.save();
  traceFront();
  ctx.clip();

  if (!isOpen) {
    // Folded top cuff flap with gold/foil adhesive seal strip
    ctx.fillStyle = adjustHex(filmColor, -0.25);
    ctx.fillRect(-hw, topY, hw * 2, 2.15);
    drawCrimpedSeal(ctx, -hw, topY, hw * 2, 0.95, filmColor, true, 0.72);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-1.4, topY + 1.45, 2.8, 0.95);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(-1.1, topY + 1.78, 2.2, 0.25);
  }

  drawPouchCrinkles(ctx, -hw, -4, hw * 2, 12, 133, 0.16);
  drawEditorialCandyHeader(ctx, 0, -4.4, 10.2, 3.0, labelColor);

  const traceWin = () => {
    ctx.beginPath();
    ctx.roundRect(-4.4, -0.45, 8.8, 5.9, 1.4);
  };
  drawFilmWindow(
    ctx,
    traceWin,
    () => drawConfectioneryContents(ctx, item, 0, 2.45, 3.6, 2.1, labelColor, 148),
    'rgba(255, 255, 255, 0.55)',
    '#090d16'
  );

  // Flat-bottom hem fold & barcode
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.fillRect(-hw, botY - 1.55, hw * 2, 1.55);
  drawMicroBarcode(ctx, 1.9, 6.25, 3.1, 1.0);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillRect(-4.6, 6.6, 4.2, 0.36);

  ctx.restore();

  if (isOpen) {
    drawMetallizedInteriorLip(ctx, -hw + 0.3, hw - 0.3, tearY, [0.3, -0.55, 0.35, -0.45, 0.2]);
  }

  ctx.strokeStyle = adjustHex(filmColor, -0.6);
  ctx.lineWidth = 0.38;
  traceFront();
  ctx.stroke();
}

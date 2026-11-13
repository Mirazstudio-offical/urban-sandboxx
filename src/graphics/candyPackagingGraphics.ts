// Procedural 2D Canvas Models for Plastic Candy & Gummy Packaging (Флоу-пак, Дой-пак, Саше, Фальцет, Евро-пакет)
// High-detail glossy BOPP / polypropylene barrier film textures with crimped heat-seal seams,
// tear notches, zip-lock tracks, euroslot punch holes, transparent viewing windows,
// crinkled specular film highlights, sugar/citric-dust residue specks, and torn open variants.

import { CandyPackagingShape } from '../types';
import { drawShadow } from './itemGraphicShared';
import { drawItemModel2D } from '../itemGraphic';

export type CandyPackagingSize = 'mini' | 'small' | 'medium' | 'large';

const SCALE_BY_SIZE: Record<CandyPackagingSize, number> = {
  mini: 0.80,
  small: 0.92,
  medium: 1.0,
  large: 1.12
};

/**
 * Resolves the physical form factor size of candy packaging
 */
export function getCandyPackagingSize(itemId: string, item?: any): CandyPackagingSize {
  if (item?.packagingSize && ['mini', 'small', 'medium', 'large'].includes(item.packagingSize)) {
    return item.packagingSize;
  }
  if (itemId.includes('_mini') || itemId.includes('_xs')) return 'mini';
  if (itemId.includes('_small') || itemId.includes('_euro')) return 'small';
  if (itemId.includes('_large') || itemId.includes('_xl')) return 'large';
  return 'medium';
}

/**
 * Resolves the physical shape of candy packaging from item attributes or ID
 */
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

/**
 * Resolves brand accent color from item metadata or ID
 */
export function getCandyLabelColor(itemId: string, item?: any): string {
  if (item?.labelColor && typeof item.labelColor === 'string') return item.labelColor;
  if (itemId.includes('_lime') || itemId.includes('_apple') || itemId.includes('_green')) return '#22c55e';
  if (itemId.includes('_berry') || itemId.includes('_blue')) return '#3b82f6';
  if (itemId.includes('_lemon') || itemId.includes('_yellow')) return '#eab308';
  if (itemId.includes('_grape') || itemId.includes('_purple')) return '#a855f7';
  if (itemId.includes('_orange')) return '#f97316';
  if (itemId.includes('_cola')) return '#991b1b';
  if (itemId.includes('_mint')) return '#14b8a6';
  if (itemId.includes('_mini')) return '#ec4899';       // Strawberry Pink
  if (itemId.includes('_small')) return '#f97316';      // Juicy Mandarin Orange
  if (itemId.includes('_euro')) return '#8b5cf6';       // Grape / Wild Berry Violet
  if (itemId.includes('_large')) return '#10b981';      // Sour Apple Emerald
  return '#e11d48';                                     // Cherry / Raspberry Crimson
}

/**
 * Resolves polymer film tint color
 */
export function getCandyFilmColor(itemId: string, item?: any, labelColor?: string): string {
  if (item?.containerTintColor && typeof item.containerTintColor === 'string') {
    return item.containerTintColor;
  }
  const base = labelColor || getCandyLabelColor(itemId, item);
  return adjustColor(base, 0.28);
}

export function isCandyPackagingOpen(itemId: string, item?: any): boolean {
  if (item?.isOpen !== undefined) return !!item.isOpen;
  return itemId.includes('_open') || itemId.includes('_torn');
}

/**
 * Main entry point for drawing all plastic candy/gummy packaging variants
 */
export function drawCandyPackagingItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  item?: any
): boolean {
  const isCandyPackaging =
    itemId === 'candy_pouch' ||
    itemId.startsWith('candy_pouch_');

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
      drawHangingEuroCandyPouch(ctx, labelColor, filmColor, isOpen, item);
      break;
    case 'gusset':
      drawGussetStandingCandyBag(ctx, labelColor, filmColor, isOpen, item);
      break;
    case 'doypack':
    default:
      drawDoypackCandyPouch(ctx, labelColor, filmColor, isOpen, item);
      break;
  }

  ctx.restore();
  return true;
}

/**
 * SHAPE 1: FLAT SACHET (Плоский четырёхшовный пластиковый саше-пакет)
 * Crisp compact 4-side heat-sealed pouch with ribbed borders, V-notch, clear gummy window, and foil interior
 */
function drawFlatSachetCandyPouch(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  filmColor: string,
  isOpen: boolean,
  item?: any
) {
  const w = 13.0;
  const h = 15.6;
  const left = -w / 2;
  const right = w / 2;
  const top = isOpen ? -h / 2 + 2.2 : -h / 2;
  const bot = h / 2;

  drawShadow(ctx, 6.8, 2.3, 8.2, 0.24);

  // Outer 4-side heat-seal translucent polymer frame
  ctx.save();
  const sealGrad = ctx.createLinearGradient(left, -h / 2, right, bot);
  sealGrad.addColorStop(0.0, '#f8fafc');
  sealGrad.addColorStop(0.45, '#e2e8f0');
  sealGrad.addColorStop(1.0, '#cbd5e1');

  ctx.fillStyle = sealGrad;
  ctx.beginPath();
  if (isOpen) {
    // Jagged torn top edge exposing open pouch
    ctx.moveTo(left, top + 0.8);
    ctx.lineTo(left + 2.4, top - 0.8);
    ctx.lineTo(left + 5.0, top + 0.5);
    ctx.lineTo(0, top - 1.1);
    ctx.lineTo(right - 4.2, top + 0.6);
    ctx.lineTo(right - 1.8, top - 0.7);
    ctx.lineTo(right, top + 0.4);
  } else {
    ctx.moveTo(left, top + 0.6);
    ctx.quadraticCurveTo(left, top, left + 0.6, top);
    ctx.lineTo(right - 0.6, top);
    ctx.quadraticCurveTo(right, top, right, top + 0.6);
  }
  ctx.lineTo(right, bot - 0.6);
  ctx.quadraticCurveTo(right, bot, right - 0.6, bot);
  ctx.lineTo(left + 0.6, bot);
  ctx.quadraticCurveTo(left, bot, left, bot - 0.6);
  ctx.closePath();
  ctx.fill();

  // Micro-grid heat-seal crimp texture along all 4 perimeter borders
  ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
  for (let y = top + 1.2; y <= bot - 1.4; y += 1.1) {
    ctx.fillRect(left + 0.3, y, 0.9, 0.55);
    ctx.fillRect(right - 1.2, y, 0.9, 0.55);
  }
  for (let x = left + 1.2; x <= right - 1.4; x += 1.1) {
    if (!isOpen) ctx.fillRect(x, top + 0.3, 0.55, 0.9);
    ctx.fillRect(x, bot - 1.2, 0.55, 0.9);
  }

  // Glossy colored polymer belly inside the 4-seal frame
  const inLeft = left + 1.3;
  const inRight = right - 1.3;
  const inTop = isOpen ? top + 0.9 : top + 1.4;
  const inBot = bot - 1.4;

  const bodyGrad = ctx.createLinearGradient(inLeft, inTop, inRight, inBot);
  bodyGrad.addColorStop(0.0, adjustColor(labelColor, 0.16));
  bodyGrad.addColorStop(0.45, labelColor);
  bodyGrad.addColorStop(1.0, adjustColor(labelColor, -0.24));

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(inLeft, inTop, inRight - inLeft, inBot - inTop, 0.8);
  ctx.fill();

  // Playful candy diagonal stripes at top/bottom
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(inLeft, inTop, inRight - inLeft, inBot - inTop, 0.8);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  for (let sx = -12; sx < 14; sx += 3.0) {
    ctx.beginPath();
    ctx.moveTo(sx, inTop);
    ctx.lineTo(sx + 1.4, inTop);
    ctx.lineTo(sx - 1.8, inTop + 3.2);
    ctx.lineTo(sx - 3.2, inTop + 3.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Open mouth dark foil interior if unsealed
  if (isOpen) {
    drawOpenFoilMouth(ctx, 0, top + 0.6, (inRight - inLeft) * 0.44, 1.0);
  } else {
    // V-tear notches on left and right top edges
    drawTearNotch(ctx, left, top + 2.5, 'left');
    drawTearNotch(ctx, right, top + 2.5, 'right');
  }

  // Clear rounded rectangular window showing inner plastic/foil & sugar dust
  drawClearCandyWindow(ctx, 0, 1.0, 3.6, 2.7, 'roundRect', isOpen, filmColor, item);

  // Candy star/berry logo badge above window
  drawCandyBrandHeader(ctx, 0, inTop + 1.8, inRight - inLeft - 1.4, '#ffffff', labelColor);

  // Bottom mini weight & barcode strip
  drawCandyFooterDetails(ctx, inLeft + 0.6, inBot - 1.7, inRight - inLeft - 1.2);

  // Crinkled cellophane film specular sheen
  drawPlasticFilmGloss(ctx, inLeft, inTop, inRight - inLeft, inBot - inTop, isOpen);

  ctx.restore();
}

/**
 * SHAPE 2: PILLOW FLOW-PACK (Пакет-подушечка / флоу-пак)
 * Bulging convex polymer body, sawtooth crimped top/bottom weld fins, back center fin highlight
 */
function drawPillowFlowPackCandyPouch(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  filmColor: string,
  isOpen: boolean,
  item?: any
) {
  const halfW = 6.8;
  const topY = isOpen ? -6.2 : -8.0;
  const botY = 8.0;
  const finH = 1.6;

  drawShadow(ctx, 7.6, 2.5, 8.4, 0.25);
  ctx.save();

  // Top crimped weld fin (pinked zig-zag edge)
  if (!isOpen) {
    drawCrimpedFin(ctx, -halfW + 0.3, topY, halfW * 2 - 0.6, finH, labelColor, 'top');
  } else {
    // Torn foil strip curled open at top
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(-halfW + 0.4, topY + 0.8);
    ctx.lineTo(-3.2, topY - 1.2);
    ctx.lineTo(0.2, topY + 0.2);
    ctx.lineTo(3.6, topY - 1.4);
    ctx.lineTo(halfW - 0.4, topY + 0.6);
    ctx.lineTo(halfW - 0.4, topY + 2.0);
    ctx.lineTo(-halfW + 0.4, topY + 2.0);
    ctx.closePath();
    ctx.fill();
  }

  // Bottom crimped weld fin
  drawCrimpedFin(ctx, -halfW + 0.3, botY - finH, halfW * 2 - 0.6, finH, labelColor, 'bottom');

  // Bulging pillow-shaped BOPP body (convex curved sides)
  const bodyTop = isOpen ? topY + 0.8 : topY + finH - 0.2;
  const bodyBot = botY - finH + 0.2;

  const pillowGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
  pillowGrad.addColorStop(0.0, adjustColor(labelColor, -0.28));
  pillowGrad.addColorStop(0.18, labelColor);
  pillowGrad.addColorStop(0.42, adjustColor(labelColor, 0.22));
  pillowGrad.addColorStop(0.68, labelColor);
  pillowGrad.addColorStop(1.0, adjustColor(labelColor, -0.32));

  ctx.fillStyle = pillowGrad;
  ctx.beginPath();
  ctx.moveTo(-halfW + 0.3, bodyTop);
  ctx.lineTo(halfW - 0.3, bodyTop);
  ctx.quadraticCurveTo(halfW + 1.1, (bodyTop + bodyBot) * 0.5, halfW - 0.3, bodyBot);
  ctx.lineTo(-halfW + 0.3, bodyBot);
  ctx.quadraticCurveTo(-halfW - 1.1, (bodyTop + bodyBot) * 0.5, -halfW + 0.3, bodyTop);
  ctx.closePath();
  ctx.fill();

  // Subtle vertical pillow puff highlight ridge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2.4, bodyTop + 0.8);
  ctx.quadraticCurveTo(-3.0, 0, -2.4, bodyBot - 0.8);
  ctx.stroke();

  // Accent candy swirl band across middle
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.moveTo(-halfW - 1, -2.6);
  ctx.lineTo(halfW + 1, -4.4);
  ctx.lineTo(halfW + 1, -1.6);
  ctx.lineTo(-halfW - 1, 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (isOpen) {
    drawOpenFoilMouth(ctx, 0, bodyTop + 0.2, halfW - 1.2, 1.0);
  }

  // Oval transparent viewing window in center-lower section
  drawClearCandyWindow(ctx, 0, 1.8, 3.9, 2.5, 'oval', isOpen, filmColor, item);

  // Top playful candy emblem
  drawCandyBrandHeader(ctx, 0, bodyTop + 2.0, halfW * 1.4, '#ffffff', labelColor);

  // Micro-barcode & weight stamp
  drawCandyFooterDetails(ctx, -4.2, bodyBot - 1.6, 8.4);

  // Diagonal glossy BOPP film sheen + corner crinkles
  drawPlasticFilmGloss(ctx, -halfW, bodyTop, halfW * 2, bodyBot - bodyTop, isOpen);

  ctx.restore();
}

/**
 * SHAPE 3: DOYPACK STAND-UP POUCH (Стоячий дой-пак с зип-локом и донной складкой)
 * Tapered trapezoid body, rounded gusset bottom arc, double-line zip-lock closure, euroslot & shaped window
 */
function drawDoypackCandyPouch(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  filmColor: string,
  isOpen: boolean,
  item?: any
) {
  const topW = 12.6;
  const botW = 14.4;
  const topY = isOpen ? -6.4 : -8.4;
  const botY = 8.2;

  drawShadow(ctx, 8.2, 2.7, 8.6, 0.28);
  ctx.save();

  // Main tapered stand-up doypack silhouette
  const pouchGrad = ctx.createLinearGradient(-botW / 2, topY, botW / 2, botY);
  pouchGrad.addColorStop(0.0, adjustColor(labelColor, 0.14));
  pouchGrad.addColorStop(0.35, labelColor);
  pouchGrad.addColorStop(0.75, adjustColor(labelColor, -0.10));
  pouchGrad.addColorStop(1.0, adjustColor(labelColor, -0.26));

  ctx.fillStyle = pouchGrad;
  ctx.beginPath();
  if (isOpen) {
    ctx.moveTo(-topW / 2, topY + 0.6);
    ctx.lineTo(-3.8, topY - 0.8);
    ctx.lineTo(-0.8, topY + 0.5);
    ctx.lineTo(2.4, topY - 1.0);
    ctx.lineTo(topW / 2, topY + 0.3);
  } else {
    ctx.moveTo(-topW / 2 + 0.8, topY);
    ctx.lineTo(topW / 2 - 0.8, topY);
    ctx.quadraticCurveTo(topW / 2, topY, topW / 2, topY + 0.8);
  }
  ctx.lineTo(botW / 2, botY - 1.8);
  ctx.quadraticCurveTo(botW / 2, botY, botW / 2 - 1.8, botY);
  ctx.lineTo(-botW / 2 + 1.8, botY);
  ctx.quadraticCurveTo(-botW / 2, botY, -botW / 2, botY - 1.8);
  ctx.closePath();
  ctx.fill();

  // Translucent glossy polymer side weld seams
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // Side heat-seal ribs
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(-topW / 2 + 0.2, topY + 1.5, 0.9, botY - topY - 3.5);
  ctx.fillRect(topW / 2 - 1.1, topY + 1.5, 0.9, botY - topY - 3.5);

  // Curved bottom standing gusset fold (Донная складка дой-пака)
  ctx.fillStyle = adjustColor(labelColor, -0.34);
  ctx.beginPath();
  ctx.moveTo(-botW / 2 + 1.2, botY - 1.2);
  ctx.quadraticCurveTo(0, botY - 3.0, botW / 2 - 1.2, botY - 1.2);
  ctx.lineTo(botW / 2 - 1.6, botY);
  ctx.lineTo(-botW / 2 + 1.6, botY);
  ctx.closePath();
  ctx.fill();

  // Specular highlight along bottom gusset fold
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(-botW / 2 + 1.8, botY - 1.3);
  ctx.quadraticCurveTo(0, botY - 2.9, botW / 2 - 1.8, botY - 1.3);
  ctx.stroke();

  if (!isOpen) {
    // Top tear-off heat seal header + sombrero euroslot
    ctx.fillStyle = adjustColor(labelColor, -0.22);
    ctx.beginPath();
    ctx.roundRect(-topW / 2, topY, topW, 2.2, [0.8, 0.8, 0, 0]);
    ctx.fill();

    drawEuroSlotHole(ctx, 0, topY + 1.0);
    drawTearNotch(ctx, -topW / 2, topY + 2.3, 'left');
    drawTearNotch(ctx, topW / 2, topY + 2.3, 'right');
  } else {
    // Open metallized inner lining lip
    drawOpenFoilMouth(ctx, 0, topY + 0.5, topW / 2 - 1.0, 1.0);
  }

  // Zip-lock double track line (Зип-лок замок)
  const zipY = isOpen ? topY + 2.0 : topY + 3.0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(-topW / 2 + 1.0, zipY);
  ctx.lineTo(topW / 2 - 1.0, zipY);
  ctx.moveTo(-topW / 2 + 1.0, zipY + 0.75);
  ctx.lineTo(topW / 2 - 1.0, zipY + 0.75);
  ctx.stroke();

  // Brand candy crest below zip-lock
  drawCandyBrandHeader(ctx, 0, zipY + 2.2, topW - 3.2, '#ffffff', labelColor);

  // Large clear gummy-bear / oval viewing window
  drawClearCandyWindow(ctx, 0, 2.2, 4.4, 3.0, 'oval', isOpen, filmColor, item);

  // Footer micro-barcode & net weight badge
  drawCandyFooterDetails(ctx, -4.6, botY - 2.8, 9.2);

  // Crinkled BOPP film sheen
  drawPlasticFilmGloss(ctx, -topW / 2, topY + 1.5, topW, botY - topY - 2.5, isOpen);

  ctx.restore();
}

/**
 * SHAPE 4: GUSSET STANDING BAG (Высокий пакет с боковыми фальцами и плоским дном)
 * Tall wide flat-bottom bag with visible angled side gusset pleats and large arched viewing window
 */
function drawGussetStandingCandyBag(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  filmColor: string,
  isOpen: boolean,
  item?: any
) {
  const faceW = 11.4;
  const sidePleatW = 2.4;
  const topY = isOpen ? -6.8 : -8.8;
  const botY = 8.4;

  drawShadow(ctx, 8.6, 2.8, 8.8, 0.28);
  ctx.save();

  // Left & Right 3D side gusset pleats (боковые фальцы со складками)
  const leftEdge = -faceW / 2;
  const rightEdge = faceW / 2;

  // Left gusset wing
  ctx.fillStyle = adjustColor(labelColor, -0.25);
  ctx.beginPath();
  ctx.moveTo(leftEdge, topY + 1.6);
  ctx.lineTo(leftEdge - sidePleatW, topY + 2.6);
  ctx.lineTo(leftEdge - sidePleatW + 0.3, botY - 1.0);
  ctx.lineTo(leftEdge, botY);
  ctx.closePath();
  ctx.fill();

  // Left gusset crease valley
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(leftEdge - sidePleatW * 0.5, topY + 2.2);
  ctx.lineTo(leftEdge - sidePleatW * 0.5 + 0.15, botY - 0.5);
  ctx.stroke();

  // Right gusset wing
  ctx.fillStyle = adjustColor(labelColor, -0.35);
  ctx.beginPath();
  ctx.moveTo(rightEdge, topY + 1.6);
  ctx.lineTo(rightEdge + sidePleatW, topY + 2.6);
  ctx.lineTo(rightEdge + sidePleatW - 0.3, botY - 1.0);
  ctx.lineTo(rightEdge, botY);
  ctx.closePath();
  ctx.fill();

  // Right gusset crease valley
  ctx.beginPath();
  ctx.moveTo(rightEdge + sidePleatW * 0.5, topY + 2.2);
  ctx.lineTo(rightEdge + sidePleatW * 0.5 - 0.15, botY - 0.5);
  ctx.stroke();

  // Main front panel of the block-bottom bag
  const frontGrad = ctx.createLinearGradient(leftEdge, topY, rightEdge, botY);
  frontGrad.addColorStop(0.0, adjustColor(labelColor, 0.16));
  frontGrad.addColorStop(0.4, labelColor);
  frontGrad.addColorStop(1.0, adjustColor(labelColor, -0.18));

  ctx.fillStyle = frontGrad;
  ctx.beginPath();
  if (isOpen) {
    ctx.moveTo(leftEdge, topY + 0.8);
    ctx.lineTo(leftEdge + 2.6, topY - 0.7);
    ctx.lineTo(0, topY + 0.6);
    ctx.lineTo(rightEdge - 2.8, topY - 0.9);
    ctx.lineTo(rightEdge, topY + 0.5);
  } else {
    ctx.moveTo(leftEdge, topY);
    ctx.lineTo(rightEdge, topY);
  }
  ctx.lineTo(rightEdge, botY);
  ctx.lineTo(leftEdge, botY);
  ctx.closePath();
  ctx.fill();

  // Crisp 3D panel edge highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(leftEdge, topY + 1.4);
  ctx.lineTo(leftEdge, botY);
  ctx.moveTo(rightEdge, topY + 1.4);
  ctx.lineTo(rightEdge, botY);
  ctx.stroke();

  // Top folded/crimped closure header (or open foil cavity)
  if (!isOpen) {
    ctx.fillStyle = adjustColor(labelColor, -0.22);
    ctx.fillRect(leftEdge, topY, faceW, 2.2);
    // Vertical crimp teeth
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let x = leftEdge + 0.6; x < rightEdge - 0.6; x += 1.2) {
      ctx.fillRect(x, topY + 0.3, 0.5, 1.5);
    }
    // Folded clip band
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(leftEdge + 1.2, topY + 1.8, faceW - 2.4, 0.7);
  } else {
    drawOpenFoilMouth(ctx, 0, topY + 0.5, faceW * 0.42, 1.1);
  }

  // Flat-bottom base cuff shadow
  ctx.fillStyle = adjustColor(labelColor, -0.32);
  ctx.fillRect(leftEdge, botY - 1.5, faceW, 1.5);

  // Brand emblem header
  drawCandyBrandHeader(ctx, 0, topY + 3.6, faceW - 2.2, '#ffffff', labelColor);

  // Large arched transparent window
  drawClearCandyWindow(ctx, 0, 2.0, 4.2, 3.5, 'roundRect', isOpen, filmColor, item);

  // Footer barcode & weight
  drawCandyFooterDetails(ctx, leftEdge + 1.0, botY - 2.7, faceW - 2.0);

  // Glossy polymer sheen
  drawPlasticFilmGloss(ctx, leftEdge, topY + 1.5, faceW, botY - topY - 2.0, isOpen);

  ctx.restore();
}

/**
 * SHAPE 5: HANGING EURO-CARD POUCH (Евро-пакет с верхним хедером-подвесом)
 * Distinct stiff colored top header card with euroslot hang hole + crystal-clear hanging candy pouch
 */
function drawHangingEuroCandyPouch(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  filmColor: string,
  isOpen: boolean,
  item?: any
) {
  const headerW = 13.6;
  const bodyW = 12.8;
  const topY = -8.6;
  const headerH = 4.0;
  const bodyTop = topY + headerH - 0.3;
  const botY = 8.4;

  drawShadow(ctx, 7.2, 2.4, 8.6, 0.24);
  ctx.save();

  // 1. Stiff Printed Top Header Card (Хедер-подвес с еврослотом)
  const headerGrad = ctx.createLinearGradient(-headerW / 2, topY, headerW / 2, bodyTop);
  headerGrad.addColorStop(0.0, adjustColor(labelColor, 0.15));
  headerGrad.addColorStop(0.5, labelColor);
  headerGrad.addColorStop(1.0, adjustColor(labelColor, -0.22));

  ctx.fillStyle = headerGrad;
  ctx.beginPath();
  ctx.roundRect(-headerW / 2, topY, headerW, headerH, [1.4, 1.4, 0.4, 0.4]);
  ctx.fill();

  // White accent pinstripe on header card
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.roundRect(-headerW / 2 + 0.45, topY + 0.45, headerW - 0.9, headerH - 0.9, [1.0, 1.0, 0.2, 0.2]);
  ctx.stroke();

  // Sombrero Euroslot hang punch hole
  drawEuroSlotHole(ctx, 0, topY + 1.3);

  // Mini brand text bar on header
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(-4.2, topY + 2.4, 8.4, 0.9, 0.3);
  ctx.fill();

  // 2. Transparent Polypropylene Hanging Pouch Body
  const bodyGrad = ctx.createLinearGradient(-bodyW / 2, bodyTop, bodyW / 2, botY);
  bodyGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
  bodyGrad.addColorStop(0.35, 'rgba(241, 245, 249, 0.72)');
  bodyGrad.addColorStop(0.75, 'rgba(226, 232, 240, 0.78)');
  bodyGrad.addColorStop(1.0, 'rgba(203, 213, 225, 0.86)');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  if (isOpen) {
    // Torn right-side / upper corner opening on the clear bag
    ctx.moveTo(-bodyW / 2, bodyTop);
    ctx.lineTo(bodyW / 2 - 3.8, bodyTop);
    ctx.lineTo(bodyW / 2 - 1.5, bodyTop + 2.2);
    ctx.lineTo(bodyW / 2, bodyTop + 1.4);
    ctx.lineTo(bodyW / 2, botY - 1.0);
    ctx.quadraticCurveTo(bodyW / 2, botY, bodyW / 2 - 1.0, botY);
    ctx.lineTo(-bodyW / 2 + 1.0, botY);
    ctx.quadraticCurveTo(-bodyW / 2, botY, -bodyW / 2, botY - 1.0);
  } else {
    ctx.roundRect(-bodyW / 2, bodyTop, bodyW, botY - bodyTop, [0, 0, 1.2, 1.2]);
  }
  ctx.fill();

  // Crisp clear plastic side weld borders
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.75)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Colored accent sash across lower portion of clear pouch
  ctx.fillStyle = labelColor;
  ctx.fillRect(-bodyW / 2 + 0.4, botY - 3.6, bodyW - 0.8, 2.3);

  // Bottom crimped plastic weld seam
  ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.fillRect(-bodyW / 2 + 0.4, botY - 1.1, bodyW - 0.8, 0.9);
  for (let x = -bodyW / 2 + 0.8; x < bodyW / 2 - 0.8; x += 1.0) {
    ctx.fillStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.fillRect(x, botY - 1.0, 0.45, 0.7);
  }

  // Open corner shadow fold if torn
  if (isOpen) {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.beginPath();
    ctx.moveTo(bodyW / 2 - 3.8, bodyTop);
    ctx.lineTo(bodyW / 2 - 1.5, bodyTop + 2.2);
    ctx.lineTo(bodyW / 2 - 3.2, bodyTop + 2.8);
    ctx.closePath();
    ctx.fill();
  }

  // Clear inner window / contents display
  drawClearCandyWindow(ctx, 0, 0.4, 4.3, 3.2, 'roundRect', isOpen, filmColor, item);

  // Barcode & weight on colored lower sash
  drawCandyFooterDetails(ctx, -4.4, botY - 3.3, 8.8);

  // Crisp polymer specular glare
  drawPlasticFilmGloss(ctx, -bodyW / 2, bodyTop, bodyW, botY - bodyTop, isOpen);

  ctx.restore();
}

// ============================================================================
// SHARED PROCEDURAL CANDY PACKAGING SUB-RENDERERS
// ============================================================================

/**
 * Draws sawtooth/zig-zag crimped heat-seal fin for pillow flow-pack
 */
function drawCrimpedFin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  side: 'top' | 'bottom'
) {
  ctx.save();
  ctx.fillStyle = adjustColor(color, -0.15);
  const teeth = 9;
  const step = w / teeth;

  ctx.beginPath();
  if (side === 'top') {
    ctx.moveTo(x, y + h);
    for (let i = 0; i <= teeth; i++) {
      const tx = x + i * step;
      const ty = i % 2 === 0 ? y : y + 0.45;
      ctx.lineTo(tx, ty);
    }
    ctx.lineTo(x + w, y + h);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    for (let i = teeth; i >= 0; i--) {
      const tx = x + i * step;
      const ty = i % 2 === 0 ? y + h : y + h - 0.45;
      ctx.lineTo(tx, ty);
    }
  }
  ctx.closePath();
  ctx.fill();

  // Vertical heat-weld rib marks
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 0.45;
  for (let rx = x + 0.8; rx < x + w - 0.6; rx += 1.2) {
    ctx.beginPath();
    ctx.moveTo(rx, y + 0.25);
    ctx.lineTo(rx, y + h - 0.25);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws the dark/metallized inner mouth of a torn-open pouch
 */
function drawOpenFoilMouth(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number
) {
  ctx.save();
  // Silver foil lip rim
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 0.5, ry + 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Deep interior shadow cavity
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.1, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws V-shaped tear notch on side weld border
 */
function drawTearNotch(
  ctx: CanvasRenderingContext2D,
  edgeX: number,
  y: number,
  side: 'left' | 'right'
) {
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  if (side === 'left') {
    ctx.moveTo(edgeX - 0.05, y - 0.55);
    ctx.lineTo(edgeX + 1.0, y);
    ctx.lineTo(edgeX - 0.05, y + 0.55);
  } else {
    ctx.moveTo(edgeX + 0.05, y - 0.55);
    ctx.lineTo(edgeX - 1.0, y);
    ctx.lineTo(edgeX + 0.05, y + 0.55);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draws authentic sombrero-shaped euroslot retail hang hole
 */
function drawEuroSlotHole(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(cx - 1.8, cy - 0.35, 3.6, 0.7, 0.35);
  ctx.arc(cx, cy - 0.3, 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 0.3;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws playful candy/gummy header banner & miniature gummy-bear emblem
 */
function drawCandyBrandHeader(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  badgeColor: string,
  accentColor: string
) {
  ctx.save();
  // Crisp white rounded pill banner
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.roundRect(cx - width / 2, cy - 1.05, width, 2.1, 0.9);
  ctx.fill();

  // Accent drop border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = 0.35;
  ctx.stroke();

  // Cute mini gummy-bear / star icon on left of banner
  const iconX = cx - width * 0.28;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(iconX, cy - 0.25, 0.45, 0, Math.PI * 2); // head
  ctx.arc(iconX - 0.35, cy - 0.65, 0.2, 0, Math.PI * 2); // left ear
  ctx.arc(iconX + 0.35, cy - 0.65, 0.2, 0, Math.PI * 2); // right ear
  ctx.ellipse(iconX, cy + 0.38, 0.48, 0.45, 0, 0, Math.PI * 2); // belly
  ctx.fill();

  // Stylized brand text bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx - width * 0.08, cy - 0.42, width * 0.42, 0.42);
  ctx.fillStyle = accentColor;
  ctx.fillRect(cx - width * 0.08, cy + 0.15, width * 0.30, 0.32);

  ctx.restore();
}

/**
 * Draws the transparent viewing window showing contained items (if any),
 * or subtle foil backing + glistening sugar/citric acid dust crystals + translucent candy print
 */
function drawClearCandyWindow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  shape: 'oval' | 'roundRect',
  isOpen: boolean,
  filmColor: string,
  item?: any
) {
  ctx.save();

  const traceWindow = () => {
    ctx.beginPath();
    if (shape === 'oval') {
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    } else {
      ctx.roundRect(cx - rx, cy - ry, rx * 2, ry * 2, 1.3);
    }
  };

  // Translucent backing inside window (silvered polymer interior when empty)
  const winGrad = ctx.createRadialGradient(cx - rx * 0.25, cy - ry * 0.25, 0.4, cx, cy, Math.max(rx, ry) * 1.2);
  if (isOpen) {
    winGrad.addColorStop(0.0, 'rgba(226, 232, 240, 0.85)');
    winGrad.addColorStop(0.65, 'rgba(148, 163, 184, 0.80)');
    winGrad.addColorStop(1.0, 'rgba(71, 85, 105, 0.88)');
  } else {
    winGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.92)');
    winGrad.addColorStop(0.65, 'rgba(241, 245, 249, 0.85)');
    winGrad.addColorStop(1.0, adjustColor(filmColor, 0.15));
  }

  ctx.fillStyle = winGrad;
  traceWindow();
  ctx.fill();

  // Clip interior contents/residue to window bounds
  ctx.save();
  traceWindow();
  ctx.clip();

  if (item?.contents && item.contents.length > 0) {
    // Render actual stored item(s) neatly inside the transparent window
    const count = item.contents.length;
    if (count === 1) {
      const inner = item.contents[0];
      drawItemModel2D(ctx, inner.itemId, cx, cy, Math.min(rx, ry) * 3.1, inner);
    } else {
      const displayCount = Math.min(4, count);
      const pieceSize = Math.min(rx, ry) * (displayCount === 2 ? 2.15 : 1.75);
      const offsets: Array<[number, number, number]> =
        displayCount === 2
          ? [[-rx * 0.34, 0.15, -0.22], [rx * 0.34, -0.1, 0.24]]
          : displayCount === 3
          ? [[-rx * 0.38, -ry * 0.22, -0.26], [rx * 0.38, -ry * 0.18, 0.28], [0, ry * 0.28, 0.08]]
          : [[-rx * 0.38, -ry * 0.26, -0.25], [rx * 0.38, -ry * 0.24, 0.25], [-rx * 0.3, ry * 0.3, 0.18], [rx * 0.34, ry * 0.28, -0.2]];

      for (let i = 0; i < displayCount; i++) {
        const sampleIdx = Math.min(count - 1, Math.floor((i * count) / displayCount));
        const inner = item.contents[sampleIdx];
        if (!inner) continue;
        const [ox, oy, rot] = offsets[i];
        ctx.save();
        ctx.translate(cx + ox, cy + oy);
        ctx.rotate(rot);
        drawItemModel2D(ctx, inner.itemId, 0, 0, pieceSize, inner);
        ctx.restore();
      }
    }
  } else {
    // Empty candy/gummy packaging: delicate translucent gummy silhouettes printed or dusted sugar crystals inside
    if (!isOpen) {
      // Decorative mini pastel gummy drop icons printed on the inner backing
      const drops: Array<[number, number, string]> = [
        [cx - rx * 0.42, cy - ry * 0.22, 'rgba(244, 63, 94, 0.30)'],
        [cx + rx * 0.38, cy - ry * 0.15, 'rgba(250, 204, 21, 0.35)'],
        [cx - rx * 0.08, cy + ry * 0.35, 'rgba(34, 197, 94, 0.30)']
      ];
      drops.forEach(([dx, dy, col]) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(dx, dy, 1.05, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Fine white sugar & sour citric powder crystals clinging inside the polymer window
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    const crystals = [
      [-1.8, -0.9], [1.4, -1.1], [-0.4, 0.2], [2.1, 0.7],
      [-2.2, 1.1], [0.8, 1.4], [-1.0, 1.6], [0.1, -1.5]
    ];
    crystals.forEach(([sx, sy]) => {
      ctx.fillRect(cx + sx, cy + sy, 0.45, 0.45);
    });
  }

  // Glossy curved cellophane highlight inside window
  ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.32, cy - ry * 0.35, rx * 0.45, ry * 0.18, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Crisp gold/white frame border around window
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 0.65;
  traceWindow();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws micro-barcode and grammage pill at the bottom of the wrapper
 */
function drawCandyFooterDetails(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.save();
  // Micro-barcode on left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.roundRect(x, y, 2.8, 1.1, 0.2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  for (let bx = 0.25; bx < 2.4; bx += 0.42) {
    ctx.fillRect(x + bx, y + 0.15, 0.2, 0.8);
  }

  // Weight / quality badge on right
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.roundRect(x + w - 2.3, y + 0.05, 2.2, 1.0, 0.35);
  ctx.fill();
  ctx.fillStyle = '#92400e';
  ctx.fillRect(x + w - 1.9, y + 0.4, 1.4, 0.3);
  ctx.restore();
}

/**
 * Draws glossy polymer cellophane diagonal reflection and micro-wrinkle creases
 */
function drawPlasticFilmGloss(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isOpen: boolean
) {
  ctx.save();
  // Diagonal glossy BOPP film glare
  const sheenGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  sheenGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.30)');
  sheenGrad.addColorStop(0.26, 'rgba(255, 255, 255, 0.04)');
  sheenGrad.addColorStop(0.48, 'rgba(255, 255, 255, 0.24)');
  sheenGrad.addColorStop(0.62, 'rgba(255, 255, 255, 0.02)');
  sheenGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.14)');

  ctx.fillStyle = sheenGrad;
  ctx.beginPath();
  ctx.roundRect(x + 0.3, y + 0.3, w - 0.6, h - 0.6, 1.0);
  ctx.fill();

  // Subtle plastic wrinkle highlights (stronger when torn open)
  ctx.strokeStyle = isOpen ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.32)';
  ctx.lineWidth = 0.45;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 1.2, y + h * 0.25);
  ctx.quadraticCurveTo(x + w * 0.24, y + h * 0.30, x + w * 0.32, y + h * 0.16);
  ctx.moveTo(x + w - 1.4, y + h * 0.72);
  ctx.quadraticCurveTo(x + w * 0.74, y + h * 0.65, x + w * 0.66, y + h * 0.80);
  ctx.stroke();

  ctx.restore();
}

/**
 * Hex color brightness adjuster
 */
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

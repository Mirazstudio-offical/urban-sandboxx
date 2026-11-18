// Procedural 2D Canvas Models for Factory Wrapped Paper Packaging (Butter / Cheese / Dairy Brick)
// Authentic greaseproof parchment texture with realistic envelope fold shadows,
// butterfat translucent oil permeation, engraved dairy crest label, micro-barcode, and open unfolded wrap.

import {
  drawShadow,
  drawMicroBarcode,
  adjustHex,
  hexToRgba,
  hash01
} from './itemGraphicShared';
import { drawItemModel2D } from '../itemGraphic';

export type PackagingSize = 'mini' | 'small' | 'medium' | 'large';

export function getPackagingLabelColor(itemId: string, item?: any): string {
  if (item?.labelColor && typeof item.labelColor === 'string') {
    return item.labelColor;
  }
  if (itemId.includes('_green')) return '#15803d';
  if (itemId.includes('_blue')) return '#1d4ed8';
  if (itemId.includes('_amber') || itemId.includes('_gold') || itemId.includes('_yellow')) return '#ca8a04';
  if (itemId.includes('_purple') || itemId.includes('_violet')) return '#6d28d9';
  if (itemId.includes('_black') || itemId.includes('_noir')) return '#1e293b';
  if (itemId.includes('_teal')) return '#0f766e';
  if (itemId.includes('_coral') || itemId.includes('_orange')) return '#c2410c';
  return '#9f1239';
}

export function getPackagingSize(itemId: string, item?: any): PackagingSize {
  if (item?.packagingSize && ['mini', 'small', 'medium', 'large'].includes(item.packagingSize)) {
    return item.packagingSize;
  }
  if (itemId.includes('_mini') || itemId.includes('_xs')) return 'mini';
  if (itemId.includes('_small')) return 'small';
  if (itemId.includes('_large') || itemId.includes('_xl')) return 'large';
  return 'medium';
}

export function isPackagingOpen(itemId: string, item?: any): boolean {
  if (item?.isOpen !== undefined) return !!item.isOpen;
  return itemId.includes('_open');
}

export function drawPaperPackagingItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  item?: any
): boolean {
  const isPaperPackaging = itemId === 'paper_packaging' || itemId.startsWith('paper_packaging_');
  if (!isPaperPackaging) return false;

  const isOpen = isPackagingOpen(itemId, item);
  const sizeTier = getPackagingSize(itemId, item);
  const labelColor = getPackagingLabelColor(itemId, item);

  if (isOpen) {
    drawOpenPaperPackaging(ctx, labelColor, sizeTier, item);
  } else {
    drawClosedPaperPackaging(ctx, labelColor, sizeTier);
  }

  return true;
}

const SCALE_BY_SIZE: Record<PackagingSize, number> = {
  mini: 0.74,
  small: 0.88,
  medium: 1.0,
  large: 1.22
};

function drawClosedPaperPackaging(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  sizeTier: PackagingSize
) {
  const scale = SCALE_BY_SIZE[sizeTier] || 1.0;

  ctx.save();
  ctx.scale(scale, scale);

  const leftX = -8.2;
  const rightX = 4.6;
  const topY = -2.2;
  const botY = 4.3;
  const dX = 4.0;
  const dY = -3.4;

  drawShadow(ctx, 8.8, 2.7, 5.2, 0.28, 0.4);

  // 1. Top lit greaseproof parchment plane
  const topGrad = ctx.createLinearGradient(leftX, topY + dY, rightX + dX, topY);
  topGrad.addColorStop(0.0, '#fbf8ee');
  topGrad.addColorStop(0.55, '#f2ead4');
  topGrad.addColorStop(1.0, '#e3d7b9');
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.moveTo(leftX, topY);
  ctx.lineTo(leftX + dX, topY + dY);
  ctx.lineTo(rightX + dX, topY + dY);
  ctx.lineTo(rightX, topY);
  ctx.closePath();
  ctx.fill();

  // Subtle top paper fold crease + faint butterfat permeation translucency
  ctx.fillStyle = 'rgba(217, 119, 6, 0.08)';
  ctx.beginPath();
  ctx.ellipse(-0.4, topY + dY * 0.48, 3.8, 1.0, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // 2. Printed editorial dairy band draped over top & front faces
  const bandStart = leftX + 3.2;
  const bandEnd = rightX - 3.0;
  ctx.fillStyle = adjustHex(labelColor, 0.06);
  ctx.beginPath();
  ctx.moveTo(bandStart, topY);
  ctx.lineTo(bandStart + dX, topY + dY);
  ctx.lineTo(bandEnd + dX, topY + dY);
  ctx.lineTo(bandEnd, topY);
  ctx.closePath();
  ctx.fill();

  // Gold foil border lines along label wrap on top
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 0.28;
  ctx.beginPath();
  ctx.moveTo(bandStart + 0.35, topY);
  ctx.lineTo(bandStart + 0.35 + dX, topY + dY);
  ctx.moveTo(bandEnd - 0.35, topY);
  ctx.lineTo(bandEnd - 0.35 + dX, topY + dY);
  ctx.stroke();

  // Cream engraved crest plaque centered on top label
  const cxTop = (bandStart + bandEnd) * 0.5 + dX * 0.5;
  const cyTop = topY + dY * 0.5;
  ctx.save();
  ctx.translate(cxTop, cyTop);
  ctx.transform(1, 0, -0.95, 0.72, 0, 0);
  ctx.fillStyle = '#fefcf5';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 0.28;
  ctx.beginPath();
  ctx.roundRect(-2.4, -1.5, 4.8, 3.0, 0.4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = labelColor;
  ctx.fillRect(-1.8, -0.7, 3.6, 0.48);
  ctx.fillStyle = 'rgba(30, 41, 59, 0.55)';
  ctx.fillRect(-1.4, 0.25, 2.8, 0.32);
  ctx.restore();

  // 3. Front lit face
  const frontGrad = ctx.createLinearGradient(leftX, topY, rightX, botY);
  frontGrad.addColorStop(0.0, '#f3ecda');
  frontGrad.addColorStop(0.55, '#e7dcc0');
  frontGrad.addColorStop(1.0, '#d2c29d');
  ctx.fillStyle = frontGrad;
  ctx.fillRect(leftX, topY, rightX - leftX, botY - topY);

  // Micro paper fiber stippling on front face
  ctx.fillStyle = 'rgba(120, 90, 45, 0.14)';
  for (let i = 0; i < 14; i++) {
    const px = leftX + 0.5 + hash01('parchment', i * 2) * (rightX - leftX - 1.0);
    const py = topY + 0.5 + hash01('parchment', i * 2 + 1) * (botY - topY - 1.0);
    ctx.fillRect(px, py, 0.28, 0.2);
  }

  // Front extension of label band + weight graduation marks
  ctx.fillStyle = adjustHex(labelColor, -0.08);
  ctx.fillRect(bandStart, topY, bandEnd - bandStart, botY - topY);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(bandStart + 0.3, topY, 0.28, botY - topY);
  ctx.fillRect(bandEnd - 0.58, topY, 0.28, botY - topY);

  ctx.fillStyle = '#fefcf5';
  ctx.fillRect(bandStart + 1.0, topY + 1.4, bandEnd - bandStart - 2.0, 3.4);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(bandStart + 1.5, topY + 2.2, bandEnd - bandStart - 3.0, 0.5);
  ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
  ctx.fillRect(bandStart + 1.8, topY + 3.2, bandEnd - bandStart - 3.6, 0.35);

  // Portion measuring ticks along lower parchment skirt
  ctx.fillStyle = hexToRgba(labelColor, 0.55);
  for (let mx = leftX + 1.0; mx < bandStart - 0.5; mx += 1.05) {
    ctx.fillRect(mx, botY - 0.9, 0.24, 0.7);
  }

  // 4. Shaded Right Side with realistic folded triangular envelope tuck flaps
  const sideGrad = ctx.createLinearGradient(rightX, topY, rightX + dX, botY);
  sideGrad.addColorStop(0.0, '#d7c8a6');
  sideGrad.addColorStop(1.0, '#b5a078');
  ctx.fillStyle = sideGrad;
  ctx.beginPath();
  ctx.moveTo(rightX, topY);
  ctx.lineTo(rightX + dX, topY + dY);
  ctx.lineTo(rightX + dX, botY + dY);
  ctx.lineTo(rightX, botY);
  ctx.closePath();
  ctx.fill();

  // Folded overlapping parchment envelope pleats on right side
  const sideMidX = rightX + dX * 0.5;
  const sideMidY = (topY + botY + dY) * 0.5;

  // Cast shadow beneath top downward-folded flap
  ctx.fillStyle = 'rgba(69, 46, 18, 0.28)';
  ctx.beginPath();
  ctx.moveTo(rightX, topY);
  ctx.lineTo(rightX + dX, topY + dY);
  ctx.lineTo(sideMidX, sideMidY + 0.55);
  ctx.closePath();
  ctx.fill();

  // Top downward-folded triangular flap
  ctx.fillStyle = '#e7dcc1';
  ctx.beginPath();
  ctx.moveTo(rightX, topY);
  ctx.lineTo(rightX + dX, topY + dY);
  ctx.lineTo(sideMidX, sideMidY);
  ctx.closePath();
  ctx.fill();

  // Left & right inward-folded side triangles
  ctx.strokeStyle = 'rgba(101, 74, 34, 0.45)';
  ctx.lineWidth = 0.28;
  ctx.beginPath();
  ctx.moveTo(rightX, topY);
  ctx.lineTo(sideMidX, sideMidY);
  ctx.lineTo(rightX + dX, topY + dY);
  ctx.moveTo(rightX, botY);
  ctx.lineTo(sideMidX, sideMidY);
  ctx.lineTo(rightX + dX, botY + dY);
  ctx.stroke();

  // Crisp 3D edge highlights & perimeter outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.moveTo(leftX, topY);
  ctx.lineTo(rightX, topY);
  ctx.lineTo(rightX + dX, topY + dY);
  ctx.moveTo(rightX, topY);
  ctx.lineTo(rightX, botY);
  ctx.stroke();

  ctx.strokeStyle = '#8b6f47';
  ctx.lineWidth = 0.34;
  ctx.beginPath();
  ctx.moveTo(leftX, topY);
  ctx.lineTo(leftX + dX, topY + dY);
  ctx.lineTo(rightX + dX, topY + dY);
  ctx.lineTo(rightX + dX, botY + dY);
  ctx.lineTo(rightX, botY);
  ctx.lineTo(leftX, botY);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

function drawOpenPaperPackaging(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  sizeTier: PackagingSize,
  item?: any
) {
  const scale = SCALE_BY_SIZE[sizeTier] || 1.0;

  ctx.save();
  ctx.scale(scale, scale);

  drawShadow(ctx, 9.2, 2.8, 6.2, 0.22);

  // Unfolded splayed greaseproof parchment sheet with fanned corners
  const sheetGrad = ctx.createRadialGradient(0, 0, 1, 0, 0.5, 10.5);
  sheetGrad.addColorStop(0.0, '#f3ebd4');
  sheetGrad.addColorStop(0.55, '#fbf7ea');
  sheetGrad.addColorStop(1.0, '#d8c9a7');
  ctx.fillStyle = sheetGrad;
  ctx.beginPath();
  ctx.moveTo(-8.8, -1.6);
  ctx.lineTo(-5.8, -5.6);
  ctx.lineTo(0.2, -5.2);
  ctx.lineTo(6.4, -5.8);
  ctx.lineTo(9.2, -1.2);
  ctx.lineTo(7.4, 3.8);
  ctx.lineTo(4.6, 5.8);
  ctx.lineTo(-4.8, 5.6);
  ctx.lineTo(-7.8, 3.6);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#9c8055';
  ctx.lineWidth = 0.35;
  ctx.stroke();

  // Sharp radiating paper crease folds from center brick impression
  const bx1 = -4.2;
  const bx2 = 4.2;
  const by1 = -2.4;
  const by2 = 2.6;

  ctx.strokeStyle = 'rgba(139, 111, 71, 0.38)';
  ctx.lineWidth = 0.32;
  ctx.beginPath();
  ctx.rect(bx1, by1, bx2 - bx1, by2 - by1);
  ctx.moveTo(bx1, by1); ctx.lineTo(-8.6, -1.6);
  ctx.moveTo(bx1, by1); ctx.lineTo(-5.6, -5.4);
  ctx.moveTo(bx2, by1); ctx.lineTo(6.2, -5.6);
  ctx.moveTo(bx2, by1); ctx.lineTo(9.0, -1.2);
  ctx.moveTo(bx1, by2); ctx.lineTo(-7.6, 3.5);
  ctx.moveTo(bx1, by2); ctx.lineTo(-4.7, 5.5);
  ctx.moveTo(bx2, by2); ctx.lineTo(4.5, 5.7);
  ctx.moveTo(bx2, by2); ctx.lineTo(7.3, 3.7);
  ctx.stroke();

  // Translucent butterfat grease stain imprint inside unwrapped parchment square
  const greaseGrad = ctx.createRadialGradient(-0.4, 0.2, 0.5, 0, 0.2, 5.0);
  greaseGrad.addColorStop(0.0, 'rgba(234, 179, 8, 0.26)');
  greaseGrad.addColorStop(0.65, 'rgba(217, 119, 6, 0.14)');
  greaseGrad.addColorStop(1.0, 'rgba(217, 119, 6, 0)');
  ctx.fillStyle = greaseGrad;
  ctx.fillRect(bx1 + 0.3, by1 + 0.3, bx2 - bx1 - 0.6, by2 - by1 - 0.6);

  // Outer curled paper sleeve band peek on lower flap + micro barcode
  ctx.fillStyle = hexToRgba(labelColor, 0.85);
  ctx.beginPath();
  ctx.moveTo(-2.4, by2);
  ctx.lineTo(2.4, by2);
  ctx.lineTo(3.0, 5.6);
  ctx.lineTo(-3.0, 5.6);
  ctx.closePath();
  ctx.fill();
  drawMicroBarcode(ctx, -1.4, 3.6, 2.8, 1.0);

  // Render contents inside open paper only when actual items exist
  const validContents = (Array.isArray(item?.contents) ? item.contents : []).filter(
    (inner: any) => inner && inner.itemId && !inner.itemId.startsWith('paper_packaging')
  );
  if (validContents.length === 1) {
    const inner = validContents[0];
    drawItemModel2D(ctx, inner.itemId, 0, 0, 12.5, inner, true);
  } else if (validContents.length > 1) {
    const slots: Array<[number, number]> =
      validContents.length === 2
        ? [[-2.4, -0.3], [2.4, 0.4]]
        : [[-2.3, -1.0], [2.3, -0.8], [-1.8, 1.3], [2.1, 1.4]];
    const count = Math.min(slots.length, validContents.length);
    for (let i = 0; i < count; i++) {
      const inner = validContents[i];
      const [ox, oy] = slots[i];
      drawItemModel2D(ctx, inner.itemId, ox, oy, 8.8, inner, true);
    }
  }

  ctx.restore();
}

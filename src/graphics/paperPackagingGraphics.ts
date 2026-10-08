// Procedural 2D Canvas Models for Factory Wrapped Paper Packaging (Butter / Cheese / Dairy Brick)
// Authentic factory packaging: greaseproof parchment / wax paper wrapper with envelope tuck folds,
// customizable printed label band (labelColor), dairy quality seal, measurement tick marks,
// and realistic unfolded/peeled wrapper variants with creased flaps and waxy grease imprints.

import { drawShadow } from './itemGraphicShared';

export type PackagingSize = 'mini' | 'small' | 'medium' | 'large';

/**
 * Resolves the primary brand label color from item metadata or item ID
 */
export function getPackagingLabelColor(itemId: string, item?: any): string {
  if (item?.labelColor && typeof item.labelColor === 'string') {
    return item.labelColor;
  }
  if (itemId.includes('_green')) return '#16a34a';   // Emerald / Farm Fresh
  if (itemId.includes('_blue')) return '#2563eb';    // Classic Dairy Cobalt
  if (itemId.includes('_amber') || itemId.includes('_gold') || itemId.includes('_yellow')) return '#facc15'; // Butter Gold / Gouda
  if (itemId.includes('_purple') || itemId.includes('_violet')) return '#9333ea'; // Royal Violet
  if (itemId.includes('_black') || itemId.includes('_noir')) return '#1e293b';   // Premium Noir
  if (itemId.includes('_teal')) return '#0d9488';    // Artisan Teal
  if (itemId.includes('_coral') || itemId.includes('_orange')) return '#ea580c'; // Aged Cheddar
  return '#e11d48'; // Signature Ruby Carmine
}

/**
 * Resolves the physical form factor size from item metadata or item ID
 */
export function getPackagingSize(itemId: string, item?: any): PackagingSize {
  if (item?.packagingSize && ['mini', 'small', 'medium', 'large'].includes(item.packagingSize)) {
    return item.packagingSize;
  }
  if (itemId.includes('_mini') || itemId.includes('_xs')) return 'mini';
  if (itemId.includes('_small')) return 'small';
  if (itemId.includes('_large') || itemId.includes('_xl')) return 'large';
  return 'medium';
}

/**
 * Checks if packaging is unsealed/open
 */
export function isPackagingOpen(itemId: string, item?: any): boolean {
  if (item?.isOpen !== undefined) return !!item.isOpen;
  return itemId.includes('_open');
}

/**
 * Procedural drawing for Paper Packaging & Open Paper Packaging across all sizes
 */
export function drawPaperPackagingItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  item?: any
): boolean {
  const isPaperPackaging =
    itemId === 'paper_packaging' ||
    itemId.startsWith('paper_packaging_');

  if (!isPaperPackaging) return false;

  const isOpen = isPackagingOpen(itemId, item);
  const sizeTier = getPackagingSize(itemId, item);
  const labelColor = getPackagingLabelColor(itemId, item);

  if (isOpen) {
    drawOpenPaperPackaging(ctx, labelColor, sizeTier, item);
  } else {
    drawClosedPaperPackaging(ctx, labelColor, sizeTier, item);
  }

  return true;
}

const SCALE_BY_SIZE: Record<PackagingSize, number> = {
  mini: 0.74,
  small: 0.88,
  medium: 1.0,
  large: 1.22
};

/**
 * 1. CLOSED FACTORY WRAPPED BRICK (Заводской брикет в пергаментной обертке со складками и этикеткой)
 */
function drawClosedPaperPackaging(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  sizeTier: PackagingSize,
  item?: any
) {
  const scale = SCALE_BY_SIZE[sizeTier] || 1.0;

  ctx.save();
  // Center brick neatly on the canvas
  ctx.scale(scale, scale);

  // Brick proportions in axonometric 2.5D view
  // Front face rectangle: leftX to rightX, topY to botY
  // Depth skew: dX to the right, dY upwards
  const leftX = -8.2;
  const rightX = 4.8;
  const topY = -1.2;
  const botY = 5.8;
  const dX = 3.4;
  const dY = 3.6;

  // --- 1. Soft Ambient & Ground Contact Shadow ---
  drawShadow(ctx, 9.2, 3.4, 7.8, 0.32, 0.35);
  drawShadow(ctx, 6.5, 1.6, 6.8, 0.42, 0.15);

  // --- 2. Top Face of the Brick (Receding upper parchment plane) ---
  ctx.save();
  const topGrad = ctx.createLinearGradient(leftX, topY, rightX + dX, topY - dY);
  topGrad.addColorStop(0.0, '#ffffff'); // Crisp lit front corner
  topGrad.addColorStop(0.35, '#faf7ee'); // Smooth greaseproof parchment
  topGrad.addColorStop(0.75, '#f4ece0'); // Natural paper tone
  topGrad.addColorStop(1.0, '#e8ded0');  // Rear shaded edge

  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.moveTo(leftX, topY);
  ctx.lineTo(rightX, topY);
  ctx.lineTo(rightX + dX, topY - dY);
  ctx.lineTo(leftX + dX, topY - dY);
  ctx.closePath();
  ctx.fill();

  // Subtle bevel highlight along the front-top folded ridge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(leftX, topY);
  ctx.lineTo(rightX, topY);
  ctx.stroke();

  // Outer paper perimeter seam
  ctx.strokeStyle = 'rgba(160, 135, 110, 0.35)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(rightX, topY);
  ctx.lineTo(rightX + dX, topY - dY);
  ctx.lineTo(leftX + dX, topY - dY);
  ctx.lineTo(leftX, topY);
  ctx.stroke();
  ctx.restore();

  // --- 3. Right Side Face (FACTORY ENVELOPE FOLDS / Уголки-конверты) ---
  ctx.save();
  const sideGrad = ctx.createLinearGradient(rightX, topY, rightX + dX, botY);
  sideGrad.addColorStop(0.0, '#eedfcb');
  sideGrad.addColorStop(0.6, '#decaba');
  sideGrad.addColorStop(1.0, '#cbbaa8');

  ctx.fillStyle = sideGrad;
  ctx.beginPath();
  ctx.moveTo(rightX, topY);
  ctx.lineTo(rightX + dX, topY - dY);
  ctx.lineTo(rightX + dX, botY - dY);
  ctx.lineTo(rightX, botY);
  ctx.closePath();
  ctx.fill();

  // Envelope Fold Geometry (Заводская запечатка конвертиком на торце):
  // Triangular fold meeting in the center tuck
  const tuckX = rightX + dX * 0.52;
  const tuckY = (topY + botY - dY) * 0.48;

  // Upper diagonal fold crease
  ctx.strokeStyle = 'rgba(120, 95, 75, 0.45)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(rightX, topY);
  ctx.lineTo(tuckX, tuckY);
  ctx.lineTo(rightX + dX, topY - dY);
  ctx.stroke();

  // Lower diagonal fold crease
  ctx.beginPath();
  ctx.moveTo(rightX, botY);
  ctx.lineTo(tuckX, tuckY);
  ctx.lineTo(rightX + dX, botY - dY);
  ctx.stroke();

  // Highlight along upper folded paper flap
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(rightX + 0.3, topY + 0.3);
  ctx.lineTo(tuckX, tuckY - 0.2);
  ctx.stroke();

  // Embossed factory seal dots / crimp points at tuck seam
  ctx.fillStyle = 'rgba(140, 110, 85, 0.35)';
  ctx.beginPath();
  ctx.arc(tuckX, tuckY, 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- 4. Front Face of the Brick ---
  ctx.save();
  const frontGrad = ctx.createLinearGradient(leftX, topY, leftX, botY);
  frontGrad.addColorStop(0.0, '#faf6ee'); // Warm bright top
  frontGrad.addColorStop(0.4, '#f2ece0'); // Parchment midtone
  frontGrad.addColorStop(0.85, '#e5d9c7'); // Lower ambient shade
  frontGrad.addColorStop(1.0, '#d9cbba'); // Bottom contact shade

  ctx.fillStyle = frontGrad;
  ctx.beginPath();
  // Soft rounded micro-corners of wrapped butter block
  ctx.moveTo(leftX, topY);
  ctx.lineTo(rightX, topY);
  ctx.lineTo(rightX, botY - 0.4);
  ctx.quadraticCurveTo(rightX, botY, rightX - 0.4, botY);
  ctx.lineTo(leftX + 0.4, botY);
  ctx.quadraticCurveTo(leftX, botY, leftX, botY - 0.4);
  ctx.closePath();
  ctx.fill();

  // Subtle perimeter stroke
  ctx.strokeStyle = 'rgba(160, 135, 110, 0.4)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Bottom edge contact shadow line
  ctx.strokeStyle = 'rgba(100, 75, 55, 0.25)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(leftX, botY);
  ctx.lineTo(rightX, botY);
  ctx.stroke();
  ctx.restore();

  // --- 5. Traditional Butter / Cheese Measurement Cut Marks (Разметочные деления) ---
  ctx.save();
  // Embossed measurement ruler ticks on the left portion of the wrapper
  ctx.strokeStyle = 'rgba(150, 125, 100, 0.35)';
  ctx.lineWidth = 0.4;
  ctx.setLineDash([0.6, 0.6]);

  const tickPositions = [-7.0, -5.7, -4.4];
  tickPositions.forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, topY + 0.5);
    ctx.lineTo(x, botY - 0.5);
    ctx.stroke();

    // Solid micro-tick at the top and bottom edge
    ctx.save();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x - 0.3, topY + 0.6);
    ctx.lineTo(x + 0.3, topY + 0.6);
    ctx.moveTo(x - 0.3, botY - 0.6);
    ctx.lineTo(x + 0.3, botY - 0.6);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();

  // --- 6. The Central Printed Factory Label Band (Фирменная этикетка с labelColor) ---
  // Band wraps continuously from Top Face down across Front Face
  const bandLeft = -3.2;
  const bandRight = 2.4;
  const bandW = bandRight - bandLeft;

  // 6a. Band on Top Face
  ctx.save();
  const topBandGrad = ctx.createLinearGradient(bandLeft, topY, bandRight + dX, topY - dY);
  topBandGrad.addColorStop(0.0, labelColor);
  topBandGrad.addColorStop(0.5, labelColor);
  topBandGrad.addColorStop(1.0, adjustBrightness(labelColor, -0.15));

  ctx.fillStyle = topBandGrad;
  ctx.beginPath();
  ctx.moveTo(bandLeft, topY);
  ctx.lineTo(bandRight, topY);
  ctx.lineTo(bandRight + dX, topY - dY);
  ctx.lineTo(bandLeft + dX, topY - dY);
  ctx.closePath();
  ctx.fill();

  // Gold / White foil pinstripe borders on top band
  ctx.strokeStyle = 'rgba(255, 245, 200, 0.85)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(bandLeft, topY);
  ctx.lineTo(bandLeft + dX, topY - dY);
  ctx.moveTo(bandRight, topY);
  ctx.lineTo(bandRight + dX, topY - dY);
  ctx.stroke();

  // Top Face Gold Dairy Crest / Medallion
  const topCrestX = (bandLeft + bandRight + dX) * 0.5;
  const topCrestY = topY - dY * 0.5;
  ctx.fillStyle = 'rgba(255, 245, 200, 0.9)';
  ctx.beginPath();
  ctx.ellipse(topCrestX, topCrestY, 1.2, 0.7, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 6b. Band on Front Face
  ctx.save();
  const frontBandGrad = ctx.createLinearGradient(bandLeft, topY, bandLeft, botY);
  frontBandGrad.addColorStop(0.0, adjustBrightness(labelColor, 0.12));
  frontBandGrad.addColorStop(0.35, labelColor);
  frontBandGrad.addColorStop(1.0, adjustBrightness(labelColor, -0.18));

  ctx.fillStyle = frontBandGrad;
  ctx.beginPath();
  ctx.rect(bandLeft, topY, bandW, botY - topY);
  ctx.fill();

  // Gold foil trim borders down the sides of the front band
  ctx.strokeStyle = 'rgba(255, 245, 200, 0.85)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(bandLeft, topY);
  ctx.lineTo(bandLeft, botY);
  ctx.moveTo(bandRight, topY);
  ctx.lineTo(bandRight, botY);
  ctx.stroke();

  // Inner contrasting border lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.moveTo(bandLeft + 0.35, topY);
  ctx.lineTo(bandLeft + 0.35, botY);
  ctx.moveTo(bandRight - 0.35, topY);
  ctx.lineTo(bandRight - 0.35, botY);
  ctx.stroke();

  // --- Front Label Typography & Graphics ---
  const bandCenterX = (bandLeft + bandRight) * 0.5;

  // Upper brand header box (crisp ivory/gold banner)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(bandLeft + 0.6, topY + 0.6, bandW - 1.2, 0.85, 0.3);
  ctx.fill();

  // Quality medallion (круглая / овальная эмблема качества)
  const medalY = topY + 2.5;
  ctx.fillStyle = '#fef08a'; // Golden seal
  ctx.beginPath();
  ctx.arc(bandCenterX, medalY, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 0.3;
  ctx.stroke();

  // Inner star / seal mark inside medallion
  ctx.fillStyle = labelColor;
  ctx.beginPath();
  ctx.arc(bandCenterX, medalY, 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Product classification bars (stylized "82.5% ГОСТ / ПРЕМИУМ")
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bandLeft + 0.8, topY + 4.0, bandW - 1.6, 0.5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillRect(bandLeft + 1.1, topY + 4.8, bandW - 2.2, 0.4);

  // Micro-barcode on lower left of the band
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(bandLeft + 0.6, botY - 1.2, 2.2, 0.9);
  ctx.fillStyle = '#1e293b';
  // Barcode thin stripes
  for (let bx = 0; bx < 1.8; bx += 0.32) {
    ctx.fillRect(bandLeft + 0.8 + bx, botY - 1.1, 0.16, 0.7);
  }

  // Weight / grade mark on lower right of band ("200g")
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(bandRight - 1.6, botY - 1.0, 1.1, 0.6);
  ctx.restore();

  // --- 7. Subtle Paper Pulp Fibers & Waxy Sheen Overlay ---
  ctx.save();
  // Soft diagonal sheen across the entire wrapped block
  const sheenGrad = ctx.createLinearGradient(leftX - 2, topY - 2, rightX + 4, botY + 4);
  sheenGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.25)');
  sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
  sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  sheenGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = sheenGrad;
  ctx.beginPath();
  ctx.moveTo(leftX, topY);
  ctx.lineTo(leftX + dX, topY - dY);
  ctx.lineTo(rightX + dX, topY - dY);
  ctx.lineTo(rightX + dX, botY - dY);
  ctx.lineTo(rightX, botY);
  ctx.lineTo(leftX, botY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * 2. OPEN FACTORY WRAPPER (Развернутая пергаментная обертка с масляным оттиском, складками и рваной этикеткой)
 */
function drawOpenPaperPackaging(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  sizeTier: PackagingSize,
  item?: any
) {
  const scale = SCALE_BY_SIZE[sizeTier] || 1.0;

  ctx.save();
  ctx.scale(scale, scale);

  // Geometry of the unfolded paper wrapper:
  // Central rectangular cradle where the butter/cheese rested
  const baseW = 12.0;
  const baseH = 6.4;
  const bLeft = -baseW / 2;
  const bRight = baseW / 2;
  const bTop = -baseH / 2 + 0.6;
  const bBot = baseH / 2 + 0.6;

  // --- 1. Soft Ambient & Wide Contact Shadow Under Unfolded Paper ---
  drawShadow(ctx, 10.5, 3.8, 8.2, 0.26, 0.4);
  drawShadow(ctx, 7.2, 1.8, 7.2, 0.35, 0.18);

  // --- 2. BACK UNFOLDED FLAP (Откинутый назад верхний клапан бумаги) ---
  ctx.save();
  const backFlapTop = bTop - 5.5;
  const backFlapLeft = bLeft - 1.2;
  const backFlapRight = bRight + 1.2;

  const backFlapGrad = ctx.createLinearGradient(0, backFlapTop, 0, bTop);
  backFlapGrad.addColorStop(0.0, '#ede4d4'); // Outer side curled
  backFlapGrad.addColorStop(0.5, '#f5efe3'); // Inner parchment
  backFlapGrad.addColorStop(1.0, '#e8ded0'); // Crease valley

  ctx.fillStyle = backFlapGrad;
  ctx.beginPath();
  ctx.moveTo(bLeft, bTop);
  // Slightly crinkled/zigzag outer paper edge
  ctx.lineTo(backFlapLeft + 0.8, backFlapTop + 0.6);
  ctx.lineTo(backFlapLeft + 2.0, backFlapTop);
  ctx.lineTo(0, backFlapTop - 0.4);
  ctx.lineTo(backFlapRight - 2.0, backFlapTop);
  ctx.lineTo(backFlapRight - 0.8, backFlapTop + 0.6);
  ctx.lineTo(bRight, bTop);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(160, 135, 110, 0.35)';
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // Upper torn portion of the factory label band on the back flap
  const bandHalfW = 2.4;
  ctx.fillStyle = labelColor;
  ctx.beginPath();
  ctx.moveTo(-bandHalfW - 0.4, backFlapTop + 0.2);
  ctx.lineTo(bandHalfW + 0.4, backFlapTop + 0.2);
  ctx.lineTo(bandHalfW, bTop);
  ctx.lineTo(-bandHalfW, bTop);
  ctx.closePath();
  ctx.fill();

  // Gold pinstripe on upper label fragment
  ctx.strokeStyle = 'rgba(255, 245, 200, 0.8)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(-bandHalfW - 0.3, backFlapTop + 0.3);
  ctx.lineTo(-bandHalfW, bTop);
  ctx.moveTo(bandHalfW + 0.3, backFlapTop + 0.3);
  ctx.lineTo(bandHalfW, bTop);
  ctx.stroke();

  // White torn fibrous edge where label was peeled/torn
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let x = -bandHalfW - 0.3; x <= bandHalfW + 0.3; x += 0.4) {
    ctx.lineTo(x, bTop - 0.2 + (Math.sin(x * 12) * 0.25));
  }
  ctx.lineTo(bandHalfW + 0.3, bTop + 0.3);
  ctx.lineTo(-bandHalfW - 0.3, bTop + 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // --- 3. LEFT & RIGHT UNFOLDED ENVELOPE WINGS (Распахнутые боковые уголки) ---
  ctx.save();
  // 3a. Left Wing (Unfolded envelope fold with crease lines)
  const wingLeftX = bLeft - 4.6;
  ctx.fillStyle = '#f3ebe0';
  ctx.beginPath();
  ctx.moveTo(bLeft, bTop);
  ctx.lineTo(wingLeftX + 0.8, bTop - 1.2);
  ctx.lineTo(wingLeftX, (bTop + bBot) * 0.5);
  ctx.lineTo(wingLeftX + 0.8, bBot + 1.2);
  ctx.lineTo(bLeft, bBot);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 135, 110, 0.35)';
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // Crease memory lines radiating from corner
  ctx.strokeStyle = 'rgba(130, 105, 80, 0.3)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(bLeft, bTop);
  ctx.lineTo(wingLeftX, (bTop + bBot) * 0.5);
  ctx.moveTo(bLeft, bBot);
  ctx.lineTo(wingLeftX, (bTop + bBot) * 0.5);
  ctx.stroke();

  // 3b. Right Wing (Unfolded envelope fold with crease lines)
  const wingRightX = bRight + 4.6;
  ctx.fillStyle = '#ede3d5';
  ctx.beginPath();
  ctx.moveTo(bRight, bTop);
  ctx.lineTo(wingRightX - 0.8, bTop - 1.2);
  ctx.lineTo(wingRightX, (bTop + bBot) * 0.5);
  ctx.lineTo(wingRightX - 0.8, bBot + 1.2);
  ctx.lineTo(bRight, bBot);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 135, 110, 0.35)';
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // Crease lines on right wing
  ctx.beginPath();
  ctx.moveTo(bRight, bTop);
  ctx.lineTo(wingRightX, (bTop + bBot) * 0.5);
  ctx.moveTo(bRight, bBot);
  ctx.lineTo(wingRightX, (bTop + bBot) * 0.5);
  ctx.stroke();
  ctx.restore();

  // --- 4. FRONT UNFOLDED FLAP (Отогнутый вперед нижний клапан) ---
  ctx.save();
  const frontFlapBot = bBot + 4.2;
  const frontFlapLeft = bLeft - 1.0;
  const frontFlapRight = bRight + 1.0;

  const frontFlapGrad = ctx.createLinearGradient(0, bBot, 0, frontFlapBot);
  frontFlapGrad.addColorStop(0.0, '#f7f1e6');
  frontFlapGrad.addColorStop(0.6, '#ede3d3');
  frontFlapGrad.addColorStop(1.0, '#dfd2bf');

  ctx.fillStyle = frontFlapGrad;
  ctx.beginPath();
  ctx.moveTo(bLeft, bBot);
  ctx.lineTo(bRight, bBot);
  ctx.lineTo(frontFlapRight, frontFlapBot - 0.4);
  ctx.lineTo(frontFlapRight - 1.5, frontFlapBot);
  ctx.lineTo(0, frontFlapBot + 0.3);
  ctx.lineTo(frontFlapLeft + 1.5, frontFlapBot);
  ctx.lineTo(frontFlapLeft, frontFlapBot - 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 135, 110, 0.35)';
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // Lower torn portion of label on front flap
  ctx.fillStyle = labelColor;
  ctx.beginPath();
  ctx.moveTo(-bandHalfW, bBot);
  ctx.lineTo(bandHalfW, bBot);
  ctx.lineTo(bandHalfW + 0.2, frontFlapBot - 0.2);
  ctx.lineTo(-bandHalfW - 0.2, frontFlapBot - 0.2);
  ctx.closePath();
  ctx.fill();

  // Barcode / gold markings on lower torn fragment
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(-1.4, bBot + 0.8, 2.8, 0.6);
  ctx.fillStyle = '#1e293b';
  for (let bx = -1.1; bx < 1.1; bx += 0.35) {
    ctx.fillRect(bx, bBot + 0.9, 0.18, 0.4);
  }
  ctx.restore();

  // --- 5. CENTRAL BASE RECTANGLE (Дно упаковки с маслянистым оттиском бруска) ---
  ctx.save();
  const baseGrad = ctx.createLinearGradient(bLeft, bTop, bRight, bBot);
  baseGrad.addColorStop(0.0, '#fdfbf6'); // Clean inner parchment
  baseGrad.addColorStop(0.5, '#f8f3e8');
  baseGrad.addColorStop(1.0, '#ede5d5');

  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.rect(bLeft, bTop, baseW, baseH);
  ctx.fill();

  // Sharp creased perimeter lines around base
  ctx.strokeStyle = 'rgba(140, 115, 90, 0.45)';
  ctx.lineWidth = 0.55;
  ctx.stroke();

  // Realistic greasy/waxy imprint of the butter/cheese brick (Маслянистый след)
  const pad = 1.0;
  const butterWellGrad = ctx.createRadialGradient(0, (bTop + bBot) * 0.5, 1.5, 0, (bTop + bBot) * 0.5, baseW * 0.45);
  butterWellGrad.addColorStop(0.0, 'rgba(253, 224, 71, 0.28)'); // Translucent butter oil sheen
  butterWellGrad.addColorStop(0.65, 'rgba(251, 191, 36, 0.15)');
  butterWellGrad.addColorStop(1.0, 'rgba(245, 158, 11, 0.0)');

  ctx.fillStyle = butterWellGrad;
  ctx.beginPath();
  ctx.roundRect(bLeft + pad, bTop + pad, baseW - pad * 2, baseH - pad * 2, 0.8);
  ctx.fill();

  // Glossy specular highlight streak on the waxy imprint
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(bLeft + pad + 1.2, bTop + pad + 0.8);
  ctx.lineTo(bRight - pad - 1.2, bTop + pad + 0.8);
  ctx.stroke();

  // Corner crease indentations where the solid brick edges were pressed into the paper
  ctx.strokeStyle = 'rgba(170, 140, 105, 0.35)';
  ctx.lineWidth = 0.45;
  ctx.strokeRect(bLeft + pad, bTop + pad, baseW - pad * 2, baseH - pad * 2);
  ctx.restore();

  // --- 6. NESTLED PRODUCT BRICK (If package has items inside) ---
  if (item?.contents && item.contents.length > 0) {
    drawContainedProductBrick(ctx, bLeft, bRight, bTop, bBot, item.contents[0]);
  }

  ctx.restore();
}

/**
 * Draws a clean block of fresh butter / cheese resting neatly inside the opened paper cradle
 */
function drawContainedProductBrick(
  ctx: CanvasRenderingContext2D,
  bLeft: number,
  bRight: number,
  bTop: number,
  bBot: number,
  innerItem: any
) {
  const padX = 2.0;
  const padY = 1.2;
  const pw = (bRight - bLeft) - padX * 2;
  const ph = (bBot - bTop) - padY * 2;
  const px = bLeft + padX;
  const py = bTop + padY - 1.2; // Slight height relief
  const brickH = 3.6;

  // Determine product tone: Butter (creamy golden), Cheddar (rich orange), White cheese (ivory)
  const innerId: string = innerItem?.itemId || '';
  let prodColor = '#fef08a'; // Butter yellow default
  let shadeColor = '#fde047';

  if (innerId.includes('cheddar')) {
    prodColor = '#f59e0b';
    shadeColor = '#d97706';
  } else if (innerId.includes('gouda')) {
    prodColor = '#fde047';
    shadeColor = '#eab308';
  } else if (innerId.includes('feta') || innerId.includes('mozzarella')) {
    prodColor = '#ffffff';
    shadeColor = '#f1f5f9';
  }

  ctx.save();
  // Small drop shadow from product onto inner paper bed
  ctx.fillStyle = 'rgba(80, 50, 20, 0.22)';
  ctx.beginPath();
  ctx.roundRect(px, py + brickH - 0.4, pw, 1.4, 0.6);
  ctx.fill();

  // Top Face of product
  ctx.fillStyle = prodColor;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 0.6);
  ctx.fill();

  // Front Face of product
  ctx.fillStyle = shadeColor;
  ctx.beginPath();
  ctx.roundRect(px, py + ph - 0.6, pw, brickH, [0, 0, 0.6, 0.6]);
  ctx.fill();

  // Cut bevel highlight on top edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(px + 0.5, py + 0.5);
  ctx.lineTo(px + pw - 0.5, py + 0.5);
  ctx.stroke();
  ctx.restore();
}

/**
 * Utility to adjust hex color brightness
 */
function adjustBrightness(hex: string, percent: number): string {
  // Normalize hex
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return hex;

  let r = (num >> 16) + Math.round(255 * percent);
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * percent);
  let b = (num & 0x0000FF) + Math.round(255 * percent);

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

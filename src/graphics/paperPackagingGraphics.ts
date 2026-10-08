// Procedural 2D Canvas Models for Premium Kraft Paper Packaging (Wok Box / Takeout Container)
// Features unbleached kraft paper textures, origami score lines, branded seal label with customizable labelColor,
// 4 authentic sizes (mini 0.4L, small 0.8L, medium 1.2L, large 2.4L), and realistic torn-open variants with
// greaseproof parchment lining and delicious wok food details.

import { drawShadow } from './itemGraphicShared';
import { drawItemModel2D } from '../itemGraphic';

export type PackagingSize = 'mini' | 'small' | 'medium' | 'large';

/**
 * Resolves the primary brand label color from item metadata or item ID
 */
export function getPackagingLabelColor(itemId: string, item?: any): string {
  if (item?.labelColor && typeof item.labelColor === 'string') {
    return item.labelColor;
  }
  if (itemId.includes('_green')) return '#16a34a';   // Emerald Jade
  if (itemId.includes('_blue')) return '#2563eb';    // Sapphire Cobalt
  if (itemId.includes('_amber') || itemId.includes('_gold') || itemId.includes('_yellow')) return '#d97706'; // Artisan Amber Gold
  if (itemId.includes('_purple') || itemId.includes('_violet')) return '#9333ea'; // Imperial Violet
  if (itemId.includes('_black') || itemId.includes('_noir')) return '#1e293b';   // Obsidian Noir
  if (itemId.includes('_teal')) return '#0d9488';    // Mediterranean Teal
  if (itemId.includes('_coral') || itemId.includes('_orange')) return '#ea580c'; // Vibrant Coral
  return '#e11d48'; // Default Signature Ruby Carmine
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
  mini: 0.72,
  small: 0.86,
  medium: 1.0,
  large: 1.24
};

/**
 * 1. CLOSED KRAFT PAPER PACKAGING (Запечатанная бумажная вок-упаковка с целой пломбой)
 */
function drawClosedPaperPackaging(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  sizeTier: PackagingSize,
  item?: any
) {
  const scale = SCALE_BY_SIZE[sizeTier] || 1.0;

  ctx.save();
  // Adjust baseline slightly so all sizes rest realistically on surface
  ctx.translate(0, (1.0 - scale) * 2.2);
  ctx.scale(scale, scale);

  // --- 1. Soft Ambient + Core Contact Shadows ---
  const shadowSpread = sizeTier === 'large' ? 10.2 : (sizeTier === 'mini' ? 6.5 : (sizeTier === 'small' ? 7.6 : 8.5));
  drawShadow(ctx, shadowSpread, 3.2, 8.2, 0.28, 0.4);
  drawShadow(ctx, shadowSpread * 0.7, 1.4, 7.5, 0.38, 0.2);

  // --- 2. Wire Bail Handle (Arched Above Pail) ---
  ctx.save();
  ctx.strokeStyle = sizeTier === 'large' ? '#cbd5e1' : '#94a3b8';
  ctx.lineWidth = sizeTier === 'large' ? 1.0 : (sizeTier === 'mini' ? 0.75 : 0.85);
  ctx.beginPath();
  ctx.moveTo(-6.2, 0.5);
  ctx.bezierCurveTo(-7.8, -11.5, 7.8, -11.5, 6.2, 0.5);
  ctx.stroke();

  // Subtle metallic specular glint on upper arc of wire
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(-2.5, -9.2);
  ctx.bezierCurveTo(-1.0, -9.8, 1.0, -9.8, 2.5, -9.2);
  ctx.stroke();
  ctx.restore();

  // --- 3. Main Kraft Board Trapezoidal Body ---
  ctx.save();
  const kraftGrad = ctx.createLinearGradient(-7.5, -4.5, 7.5, 7.2);
  kraftGrad.addColorStop(0.0, '#e5b27e'); // Warm top highlight
  kraftGrad.addColorStop(0.25, '#d49b64'); // Smooth unbleached kraft
  kraftGrad.addColorStop(0.65, '#bc824b'); // Natural organic fiber body
  kraftGrad.addColorStop(1.0, '#9e6634'); // Shaded lower right base

  ctx.fillStyle = kraftGrad;
  ctx.beginPath();
  // Tapered origami box silhouette: wider top rim, narrower base
  ctx.moveTo(-7.4, -4.5);
  ctx.lineTo(7.4, -4.5);
  ctx.lineTo(5.4, 7.0);
  ctx.quadraticCurveTo(5.1, 7.4, 4.4, 7.4);
  ctx.lineTo(-4.4, 7.4);
  ctx.quadraticCurveTo(-5.1, 7.4, -5.4, 7.0);
  ctx.closePath();
  ctx.fill();

  // Fine perimeter contour line
  ctx.strokeStyle = 'rgba(100, 50, 15, 0.28)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // --- 4. Micro Paper Pulp Fibers (Recycled Natural Texture) ---
  ctx.fillStyle = 'rgba(75, 40, 10, 0.08)';
  ctx.fillRect(-4.5, -1.2, 0.8, 0.4);
  ctx.fillRect(-1.8, 2.4, 0.6, 0.4);
  ctx.fillRect(3.2, 0.6, 0.7, 0.3);
  ctx.fillRect(2.1, 4.8, 0.5, 0.4);
  ctx.fillRect(-3.4, 5.1, 0.6, 0.3);

  ctx.fillStyle = 'rgba(255, 250, 240, 0.16)';
  ctx.fillRect(-2.5, -3.0, 1.2, 0.3);
  ctx.fillRect(1.5, -2.0, 1.0, 0.3);
  ctx.fillRect(3.8, 3.2, 0.9, 0.3);
  ctx.fillRect(-5.0, 2.0, 0.8, 0.3);

  // Large feast box: additional micro-embossing texture
  if (sizeTier === 'large') {
    ctx.fillStyle = 'rgba(75, 40, 10, 0.06)';
    ctx.fillRect(-5.2, 0.4, 1.1, 0.35);
    ctx.fillRect(4.5, -0.8, 1.0, 0.35);
    ctx.fillRect(0.5, 5.6, 1.2, 0.35);
  }

  // --- 5. Origami Scored Fold Lines (Creases) ---
  ctx.strokeStyle = 'rgba(70, 35, 10, 0.22)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(-5.0, 6.8);
  ctx.lineTo(-2.2, -4.5);
  ctx.moveTo(5.0, 6.8);
  ctx.lineTo(2.2, -4.5);
  ctx.stroke();

  // Subtle highlight ridge next to fold
  ctx.strokeStyle = 'rgba(255, 245, 225, 0.32)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(-4.6, 6.8);
  ctx.lineTo(-1.8, -4.5);
  ctx.moveTo(4.6, 6.8);
  ctx.lineTo(1.8, -4.5);
  ctx.stroke();

  // Bottom baseline crease
  ctx.strokeStyle = 'rgba(70, 35, 10, 0.25)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-4.8, 6.8);
  ctx.lineTo(4.8, 6.8);
  ctx.stroke();

  // --- 6. Interlocking Folded Top Flaps (Origami Closure) ---
  // Rear fold shadow
  ctx.fillStyle = 'rgba(80, 45, 15, 0.22)';
  ctx.beginPath();
  ctx.moveTo(-7.4, -4.5);
  ctx.lineTo(7.4, -4.5);
  ctx.lineTo(4.8, -2.8);
  ctx.lineTo(-4.8, -2.8);
  ctx.closePath();
  ctx.fill();

  // Left flap crease
  ctx.fillStyle = '#caa16e';
  ctx.beginPath();
  ctx.moveTo(-7.4, -4.5);
  ctx.lineTo(-2.0, -2.8);
  ctx.lineTo(-4.5, -1.2);
  ctx.closePath();
  ctx.fill();

  // Right flap crease
  ctx.fillStyle = '#b68350';
  ctx.beginPath();
  ctx.moveTo(7.4, -4.5);
  ctx.lineTo(2.0, -2.8);
  ctx.lineTo(4.5, -1.2);
  ctx.closePath();
  ctx.fill();

  // Front top overlapping flap
  const topFlapGrad = ctx.createLinearGradient(-4.5, -4.5, 4.5, -1.2);
  topFlapGrad.addColorStop(0.0, '#edd1b0');
  topFlapGrad.addColorStop(1.0, '#d19962');
  ctx.fillStyle = topFlapGrad;
  ctx.beginPath();
  ctx.moveTo(-5.5, -4.5);
  ctx.lineTo(5.5, -4.5);
  ctx.lineTo(3.2, -1.4);
  ctx.lineTo(-3.2, -1.4);
  ctx.closePath();
  ctx.fill();

  // Highlight along front flap folded lip
  ctx.strokeStyle = 'rgba(255, 250, 240, 0.55)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-3.2, -1.4);
  ctx.lineTo(3.2, -1.4);
  ctx.stroke();

  // Shadow underneath the folded lip
  ctx.fillStyle = 'rgba(60, 30, 10, 0.25)';
  ctx.fillRect(-3.2, -1.1, 6.4, 0.5);

  // --- 7. The Branded Seal Label (Цветная защитная этикетка-пломба) ---
  const stickerW = sizeTier === 'large' ? 5.0 : (sizeTier === 'mini' ? 3.6 : 4.4);
  const stickerTop = -6.0;
  const stickerBottom = 4.2;
  const stickerH = stickerBottom - stickerTop;

  // Label soft shadow on kraft paper
  ctx.fillStyle = 'rgba(20, 10, 5, 0.22)';
  ctx.beginPath();
  ctx.roundRect(-stickerW / 2 + 0.3, stickerTop + 0.3, stickerW, stickerH, 0.8);
  ctx.fill();

  // Main sticker base gradient (featuring custom labelColor!)
  const stickerGrad = ctx.createLinearGradient(-stickerW / 2, 0, stickerW / 2, 0);
  stickerGrad.addColorStop(0.0, adjustColor(labelColor, -30)); // Deep shadow on left curl
  stickerGrad.addColorStop(0.28, adjustColor(labelColor, 25)); // Specular satin crest
  stickerGrad.addColorStop(0.70, labelColor);                  // Pure vibrant base color
  stickerGrad.addColorStop(1.0, adjustColor(labelColor, -35)); // Shadow on right edge

  ctx.fillStyle = stickerGrad;
  ctx.beginPath();
  ctx.roundRect(-stickerW / 2, stickerTop, stickerW, stickerH, 0.7);
  ctx.fill();

  // Luxurious Metallic Gold / Foil Pinstripe Border
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)'; // Warm 24K gold foil trim
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // Inner glossy reflection sheen band
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.fillRect(-stickerW / 2 + 0.5, stickerTop + 0.4, 0.9, stickerH - 0.8);

  // Circular Brand Emblem / Medallion at top of sticker
  const emblemRadius = sizeTier === 'mini' ? 1.05 : (sizeTier === 'large' ? 1.55 : 1.35);
  ctx.fillStyle = 'rgba(254, 240, 138, 0.95)'; // Gold medallion
  ctx.beginPath();
  ctx.arc(0, -1.6, emblemRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = labelColor;
  ctx.beginPath();
  ctx.arc(0, -1.6, emblemRadius - 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Minimalist Stylized Steam / Wok Crest Motif inside medallion
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  // Wok bowl arc
  ctx.arc(0, -1.4, 0.65, 0.2, Math.PI - 0.2);
  // Steam lines rising
  ctx.moveTo(-0.35, -1.9); ctx.lineTo(-0.25, -2.3);
  ctx.moveTo(0.2, -1.9); ctx.lineTo(0.3, -2.3);
  ctx.stroke();

  // Minimalist typography lines below medallion
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  const lineW = sizeTier === 'mini' ? 2.0 : (sizeTier === 'large' ? 3.4 : 2.8);
  ctx.fillRect(-lineW / 2, 0.2, lineW, 0.35); // Title line
  ctx.fillRect(-lineW / 2 + 0.3, 0.85, lineW - 0.6, 0.3); // Subtitle line
  ctx.fillRect(-lineW / 2 + 0.1, 1.45, lineW - 0.2, 0.3); // Origin line

  // Miniature Barcode / Batch verification notches at bottom of label
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(-1.5, 2.4, 0.3, 1.2);
  ctx.fillRect(-1.0, 2.4, 0.45, 1.2);
  ctx.fillRect(-0.3, 2.4, 0.25, 1.2);
  ctx.fillRect(0.2, 2.4, 0.4, 1.2);
  ctx.fillRect(0.8, 2.4, 0.25, 1.2);
  ctx.fillRect(1.2, 2.4, 0.35, 1.2);

  // Security serration / micro-perforation notches on sticker flanks
  ctx.fillStyle = 'rgba(50, 25, 5, 0.35)';
  ctx.fillRect(-stickerW / 2, -3.2, 0.4, 0.4);
  ctx.fillRect(stickerW / 2 - 0.4, -3.2, 0.4, 0.4);
  ctx.fillRect(-stickerW / 2, 1.2, 0.4, 0.4);
  ctx.fillRect(stickerW / 2 - 0.4, 1.2, 0.4, 0.4);

  // --- 8. Metal Rivets & Wire Mounts ---
  // Left eyelet rivet
  ctx.fillStyle = '#64748b';
  ctx.beginPath(); ctx.arc(-6.2, 0.5, 0.85, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(-6.2, 0.5, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath(); ctx.arc(-6.4, 0.3, 0.25, 0, Math.PI * 2); ctx.fill();

  // Right eyelet rivet
  ctx.fillStyle = '#64748b';
  ctx.beginPath(); ctx.arc(6.2, 0.5, 0.85, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(6.2, 0.5, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath(); ctx.arc(6.0, 0.3, 0.25, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
  ctx.restore();
}

/**
 * 2. OPEN KRAFT PAPER PACKAGING (Вскрытая бумажная упаковка с надорванной этикеткой и отогнутыми створками)
 */
function drawOpenPaperPackaging(
  ctx: CanvasRenderingContext2D,
  labelColor: string,
  sizeTier: PackagingSize,
  item?: any
) {
  const scale = SCALE_BY_SIZE[sizeTier] || 1.0;

  ctx.save();
  ctx.translate(0, (1.0 - scale) * 2.2);
  ctx.scale(scale, scale);

  // --- 1. Soft Ambient & Base Contact Shadows ---
  const shadowSpread = sizeTier === 'large' ? 11.0 : (sizeTier === 'mini' ? 7.2 : (sizeTier === 'small' ? 8.2 : 9.2));
  drawShadow(ctx, shadowSpread, 3.4, 8.5, 0.26, 0.5);
  drawShadow(ctx, shadowSpread * 0.65, 1.5, 7.8, 0.35, 0.2);

  // --- 2. Wire Bail Handle (Pivoted to Back / Resting) ---
  ctx.save();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = sizeTier === 'large' ? 0.95 : 0.8;
  ctx.beginPath();
  ctx.moveTo(-6.2, 1.2);
  ctx.bezierCurveTo(-8.2, -8.0, 8.2, -8.0, 6.2, 1.2);
  ctx.stroke();
  ctx.restore();

  // --- 3. Flared Open Origami Flaps (Background & Wings) ---
  ctx.save();

  // 3a. Back standing flap (shows inner greaseproof wax parchment)
  const parchmentGrad = ctx.createLinearGradient(0, -9.0, 0, -2.0);
  parchmentGrad.addColorStop(0.0, '#fffaf0'); // Clean parchment edge
  parchmentGrad.addColorStop(0.6, '#f7ede2'); // Waxed food-grade liner
  parchmentGrad.addColorStop(1.0, '#e5d0ba'); // Shadowed inner fold

  ctx.fillStyle = parchmentGrad;
  ctx.beginPath();
  ctx.moveTo(-5.2, -2.5);
  ctx.lineTo(-4.2, -8.8); // Top-left of back flap
  ctx.lineTo(4.2, -8.8);  // Top-right of back flap
  ctx.lineTo(5.2, -2.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(180, 140, 100, 0.45)';
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // 3b. Left Flap (bent wide outwards like a wing)
  ctx.fillStyle = '#eedac3';
  ctx.beginPath();
  ctx.moveTo(-7.2, -2.5);
  ctx.lineTo(-11.0, -6.8); // Outer wing point
  ctx.lineTo(-5.2, -5.8);
  ctx.lineTo(-3.0, -2.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3c. Right Flap (bent wide outwards like a wing)
  ctx.fillStyle = '#e4ceb5';
  ctx.beginPath();
  ctx.moveTo(7.2, -2.5);
  ctx.lineTo(11.0, -6.8); // Outer wing point
  ctx.lineTo(5.2, -5.8);
  ctx.lineTo(3.0, -2.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // --- 4. Upper Torn Half of the Seal Label (on Back Flap) ---
  const stickerW = sizeTier === 'large' ? 4.8 : (sizeTier === 'mini' ? 3.4 : 4.2);
  const topSealH = 4.8;
  const topSealY = -8.2;

  // Upper sticker fragment on the standing flap
  ctx.fillStyle = labelColor;
  ctx.beginPath();
  ctx.roundRect(-stickerW / 2, topSealY, stickerW, topSealH, [0.8, 0.8, 0, 0]);
  ctx.fill();

  // Gold foil border on top fragment
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // Top emblem on upper sticker
  const emblemRadius = sizeTier === 'mini' ? 0.85 : 1.1;
  ctx.fillStyle = 'rgba(254, 240, 138, 0.95)';
  ctx.beginPath(); ctx.arc(0, -6.2, emblemRadius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = labelColor;
  ctx.beginPath(); ctx.arc(0, -6.2, emblemRadius - 0.35, 0, Math.PI * 2); ctx.fill();

  // RAGGED TORN FIBER EDGE at bottom of upper sticker
  ctx.fillStyle = '#ffffff'; // Exposed raw white paper fiber core
  ctx.beginPath();
  ctx.moveTo(-stickerW / 2, topSealY + topSealH);
  ctx.lineTo(-stickerW / 2 + 0.8, topSealY + topSealH - 0.7);
  ctx.lineTo(-stickerW / 2 + 1.6, topSealY + topSealH + 0.2);
  ctx.lineTo(-stickerW / 2 + 2.4, topSealY + topSealH - 0.8);
  ctx.lineTo(-stickerW / 2 + 3.2, topSealY + topSealH + 0.1);
  ctx.lineTo(stickerW / 2, topSealY + topSealH - 0.6);
  ctx.lineTo(stickerW / 2, topSealY + topSealH);
  ctx.closePath();
  ctx.fill();

  // --- 5. Main Kraft Body (Lower Half) ---
  const kraftGrad = ctx.createLinearGradient(-7.5, -2.5, 7.5, 7.2);
  kraftGrad.addColorStop(0.0, '#dfa874');
  kraftGrad.addColorStop(0.35, '#cf955f');
  kraftGrad.addColorStop(0.70, '#b87c45');
  kraftGrad.addColorStop(1.0, '#9e6634');

  ctx.fillStyle = kraftGrad;
  ctx.beginPath();
  ctx.moveTo(-7.4, -2.5);
  ctx.lineTo(7.4, -2.5);
  ctx.lineTo(5.4, 7.2);
  ctx.quadraticCurveTo(5.1, 7.6, 4.4, 7.6);
  ctx.lineTo(-4.4, 7.6);
  ctx.quadraticCurveTo(-5.1, 7.6, -5.4, 7.2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(100, 50, 15, 0.28)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Fold creases on lower body
  ctx.strokeStyle = 'rgba(70, 35, 10, 0.2)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-5.0, 7.0); ctx.lineTo(-2.2, -2.5);
  ctx.moveTo(5.0, 7.0); ctx.lineTo(2.2, -2.5);
  ctx.stroke();

  // --- 6. Front Flap (Folded slightly forward) ---
  ctx.fillStyle = '#f3e5d4'; // Parchment wax inside of front flap
  ctx.beginPath();
  ctx.moveTo(-5.2, -2.5);
  ctx.lineTo(-4.0, 0.2);
  ctx.lineTo(4.0, 0.2);
  ctx.lineTo(5.2, -2.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 120, 80, 0.4)';
  ctx.lineWidth = 0.4;
  ctx.stroke();

  // --- 7. Deep Interior Cavity (Open Box Throat) ---
  ctx.fillStyle = '#1e1108'; // Deep ambient darkness inside box
  ctx.beginPath();
  ctx.ellipse(0, -1.8, 5.0, 2.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 8. Interior Contents Display ---
  if (item?.contents && item.contents.length > 0) {
    // If container holds actual in-game items, render them nestled in the open box!
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -1.8, 4.8, 2.2, 0, 0, Math.PI * 2);
    ctx.clip();

    const inner = item.contents[0];
    drawItemModel2D(ctx, inner.itemId, 0, -1.8, 14, inner);
    ctx.restore();
  } else {
    // Mouth-watering WOK food contents inside the open paper packaging!
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -1.8, 4.7, 1.8, 0, 0, Math.PI * 2);
    ctx.clip();

    // Dark rich teriyaki sauce bed
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-5, -4, 10, 5);

    // Golden fried egg noodles swirls
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-3.5, -1.2); ctx.bezierCurveTo(-2.0, -3.0, 1.0, -1.0, 3.5, -2.4);
    ctx.moveTo(-3.0, -2.6); ctx.bezierCurveTo(-0.5, -0.8, 2.0, -3.2, 3.2, -1.2);
    ctx.moveTo(-2.2, -1.8); ctx.bezierCurveTo(0.2, -3.4, 1.8, -1.6, 2.6, -2.8);
    ctx.stroke();

    // Amber noodle highlights
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(-2.8, -1.5); ctx.bezierCurveTo(-1.2, -2.6, 1.5, -1.2, 3.0, -2.2);
    ctx.stroke();

    // Tender grilled chicken pieces
    ctx.fillStyle = '#d97706';
    ctx.beginPath(); ctx.ellipse(-1.8, -2.2, 0.85, 0.65, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b45309';
    ctx.beginPath(); ctx.ellipse(1.6, -1.6, 0.95, 0.7, -0.2, 0, Math.PI * 2); ctx.fill();

    // Fresh chopped scallion green rings
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-2.6, -1.6, 0.6, 0.6);
    ctx.fillRect(0.4, -2.4, 0.6, 0.6);
    ctx.fillRect(2.0, -2.2, 0.5, 0.5);
    ctx.fillRect(-0.6, -1.2, 0.5, 0.5);

    // Large feast box: vibrant red bell pepper strips
    if (sizeTier === 'large') {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-1.5, -2.8, 1.6, 0.45);
      ctx.fillRect(1.2, -2.6, 1.4, 0.45);
    }

    // Sprinkle of toasted sesame seeds
    ctx.fillStyle = '#fef9c3';
    ctx.fillRect(-1.0, -2.6, 0.3, 0.4);
    ctx.fillRect(1.1, -1.2, 0.3, 0.4);
    ctx.fillRect(-2.2, -2.8, 0.3, 0.3);
    ctx.fillRect(2.8, -1.8, 0.3, 0.4);

    // Sauce glossy glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0.2, -1.8, 1.4, 0.4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Pair of Bamboo Wooden Chopsticks laid across open rim
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 1.5;
    ctx.shadowOffsetY = 0.8;

    // Chopstick 1
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(-6.8, -4.2);
    ctx.lineTo(6.8, 0.8);
    ctx.stroke();

    // Chopstick 2
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(-5.8, -2.4);
    ctx.lineTo(7.6, 2.4);
    ctx.stroke();

    // Clean white paper wrapper band around chopsticks
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-0.8, -1.6, 1.6, 1.5);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.lineWidth = 0.3;
    ctx.strokeRect(-0.8, -1.6, 1.6, 1.5);
    ctx.restore();
  }

  // --- 9. Lower Torn Half of the Seal Label (on Front Body) ---
  const bottomSealTop = 0.2;
  const bottomSealH = 4.0;

  // Label shadow
  ctx.fillStyle = 'rgba(20, 10, 5, 0.2)';
  ctx.fillRect(-stickerW / 2 + 0.3, bottomSealTop + 0.3, stickerW, bottomSealH);

  // Lower sticker body with custom labelColor!
  ctx.fillStyle = labelColor;
  ctx.beginPath();
  ctx.roundRect(-stickerW / 2, bottomSealTop, stickerW, bottomSealH, [0, 0, 0.7, 0.7]);
  ctx.fill();

  // Gold foil border on lower half
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // RAGGED TORN FIBER EDGE at top of lower sticker
  ctx.fillStyle = '#ffffff'; // Jagged torn paper fiber
  ctx.beginPath();
  ctx.moveTo(-stickerW / 2, bottomSealTop);
  ctx.lineTo(-stickerW / 2 + 0.7, bottomSealTop + 0.6);
  ctx.lineTo(-stickerW / 2 + 1.5, bottomSealTop - 0.2);
  ctx.lineTo(-stickerW / 2 + 2.3, bottomSealTop + 0.7);
  ctx.lineTo(-stickerW / 2 + 3.1, bottomSealTop - 0.1);
  ctx.lineTo(stickerW / 2, bottomSealTop + 0.5);
  ctx.lineTo(stickerW / 2, bottomSealTop);
  ctx.closePath();
  ctx.fill();

  // Micro-text lines & barcode preserved on lower fragment
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(-1.3, bottomSealTop + 1.2, 2.6, 0.35);
  ctx.fillRect(-1.0, bottomSealTop + 1.8, 2.0, 0.3);

  // Barcode notches
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(-1.4, bottomSealTop + 2.5, 0.3, 1.0);
  ctx.fillRect(-0.9, bottomSealTop + 2.5, 0.45, 1.0);
  ctx.fillRect(-0.2, bottomSealTop + 2.5, 0.25, 1.0);
  ctx.fillRect(0.3, bottomSealTop + 2.5, 0.4, 1.0);
  ctx.fillRect(0.9, bottomSealTop + 2.5, 0.35, 1.0);

  // --- 10. Eyelet Rivets on Open Box Flanks ---
  ctx.fillStyle = '#64748b';
  ctx.beginPath(); ctx.arc(-6.2, 1.2, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6.2, 1.2, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(-6.2, 1.2, 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6.2, 1.2, 0.35, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
  ctx.restore();
}

/**
 * Utility: Adjust hex color brightness
 */
function adjustColor(color: string, amount: number): string {
  if (!color || typeof color !== 'string' || !color.startsWith('#')) {
    return color;
  }
  let hex = color.slice(1);
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return color;
  const num = parseInt(hex, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

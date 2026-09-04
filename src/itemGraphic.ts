// Procedural 2D Canvas Models for all Items & Trash in the Game
import { drawFoodItem } from './graphics/foodGraphics';
import { drawDrinkItem } from './graphics/drinkGraphics';
import { drawMedicalItem } from './graphics/medicalGraphics';
import { drawGearToolItem } from './graphics/gearToolGraphics';
import { drawLeftoverItem } from './graphics/leftoverGraphics';
import { drawShadow } from './graphics/itemGraphicShared';

export function drawItemModel2D(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  centerX: number = 0,
  centerY: number = 0,
  size: number = 24
) {
  ctx.save();
  ctx.translate(centerX, centerY);

  const scale = size / 24;
  ctx.scale(scale, scale);

  const drawn =
    drawFoodItem(ctx, itemId) ||
    drawDrinkItem(ctx, itemId) ||
    drawMedicalItem(ctx, itemId) ||
    drawGearToolItem(ctx, itemId) ||
    drawLeftoverItem(ctx, itemId);

  if (!drawn) {
    // Fallback item graphics: durable supply parcel with shadow and tape
    drawShadow(ctx, 7, 2.5, 7.5, 0.2);
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.roundRect(-6.5, -6.5, 13, 13, 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-6.5, -6.5, 13, 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-1.5, -6.5, 3, 13);
  }

  ctx.restore();
}

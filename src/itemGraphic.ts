// Procedural 2D Canvas Models for all Items & Trash in the Game
import { drawFoodItem } from './graphics/foodGraphics';
import { drawDrinkItem } from './graphics/drinkGraphics';
import { drawMedicalItem } from './graphics/medicalGraphics';
import { drawGearToolItem } from './graphics/gearToolGraphics';
import { drawLeftoverItem } from './graphics/leftoverGraphics';
import { drawClothingItem } from './graphics/clothingGraphics';
import { drawSmartphoneItem } from './graphics/smartphoneGraphics';
import { drawFurnitureItem } from './graphics/furnitureGraphics';
import { drawKitchenAndValuableItem } from './graphics/kitchenAndValuablesGraphics';
import { drawMeatAndPoultryItem } from './graphics/meatAndPoultryGraphics';
import { drawFishAndSeafoodItem } from './graphics/fishAndSeafoodGraphics';
import { drawProduceAndMushroomItem } from './graphics/produceAndMushroomGraphics';
import { drawPantryAndDairyItem } from './graphics/pantryAndDairyGraphics';
import { drawPaperPackagingItem } from './graphics/paperPackagingGraphics';
import { drawShadow, drawFrostAndThermalOverlay } from './graphics/itemGraphicShared';
import { EXTENDED_LEGACY_CONTAINER_MAP, EXTENDED_ITEM_PACKAGING_MAP } from './unifiedSubstanceCatalog';

export function drawItemModel2D(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  centerX: number = 0,
  centerY: number = 0,
  size: number = 24,
  item?: any
) {
  ctx.save();
  ctx.translate(centerX, centerY);

  const scale = size / 24;
  ctx.scale(scale, scale);

  // If called with a catalog ID that maps to a unified fluid container or packaged container,
  // synthesize the unified container ID and attributes so shop/catalog previews match the unified container
  let effectiveId = item?.itemId || itemId;
  let effectiveItem = item;
  const legacyFluid = EXTENDED_LEGACY_CONTAINER_MAP[effectiveId];
  if (legacyFluid) {
    effectiveId = legacyFluid.containerId;
    if (!effectiveItem || !effectiveItem.fluidStorage) {
      effectiveItem = {
        ...effectiveItem,
        itemId: legacyFluid.containerId,
        fluidStorage: {
          containerTypeId: legacyFluid.containerId,
          liquidId: legacyFluid.liquidId,
          currentMl: 500,
          capacityMl: 500,
          attributes: legacyFluid.attributes
        }
      };
    }
  } else {
    const legacyPkg = EXTENDED_ITEM_PACKAGING_MAP[effectiveId];
    if (legacyPkg) {
      effectiveId = legacyPkg.containerId;
      if (!effectiveItem || !effectiveItem.contents) {
        effectiveItem = {
          ...effectiveItem,
          itemId: legacyPkg.containerId,
          contents: [{ itemId: legacyPkg.innerItemId }]
        };
      }
    }
  }

  const drawn =
    drawPaperPackagingItem(ctx, effectiveId, effectiveItem) ||
    drawGearToolItem(ctx, effectiveId, effectiveItem) ||
    drawSmartphoneItem(ctx, effectiveId) ||
    drawFoodItem(ctx, effectiveId) ||
    drawDrinkItem(ctx, effectiveId) ||
    drawMedicalItem(ctx, effectiveId) ||
    drawFurnitureItem(ctx, effectiveId) ||
    drawKitchenAndValuableItem(ctx, effectiveId) ||
    drawClothingItem(ctx, effectiveId) ||
    drawMeatAndPoultryItem(ctx, effectiveId) ||
    drawFishAndSeafoodItem(ctx, effectiveId) ||
    drawProduceAndMushroomItem(ctx, effectiveId) ||
    drawPantryAndDairyItem(ctx, effectiveId) ||
    drawLeftoverItem(ctx, effectiveId);

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

  // Procedural thermal overlay (frost rime, condensation droplets, steam wisps)
  if (effectiveItem) {
    drawFrostAndThermalOverlay(ctx, effectiveItem, 8.5);
  }

  ctx.restore();
}

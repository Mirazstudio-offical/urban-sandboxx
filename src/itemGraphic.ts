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
import { drawCandyPackagingItem } from './graphics/candyPackagingGraphics';
import { drawShadow, drawFrostAndThermalOverlay } from './graphics/itemGraphicShared';
import { isJarCanOrBottleContainer, resolveContainerVisualAttributes } from './liquidSystem';
import { ITEM_CATALOG, getResolvedFluidContainerConfig, getResolvedPackagingConfig } from './items';

let currentRenderDepth = 0;

export function drawItemModel2D(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  centerX: number = 0,
  centerY: number = 0,
  size: number = 24,
  item?: any,
  isInnerContentRender: boolean = false
) {
  if (currentRenderDepth >= 2) return;
  const isInner = isInnerContentRender || currentRenderDepth > 0;
  currentRenderDepth++;

  ctx.save();
  try {
    ctx.translate(centerX, centerY);

    const scale = size / 24;
    ctx.scale(scale, scale);

    // If called with a catalog ID that maps to a unified fluid container or packaged container,
    // synthesize the unified container ID and attributes so shop/catalog previews match the unified container
    let effectiveId = item?.itemId || itemId;
    let effectiveItem = item;
    const legacyFluid = !isInner ? getResolvedFluidContainerConfig(effectiveId) : null;
    if (legacyFluid) {
      const origId = effectiveItem?.originalCatalogId || effectiveId;
      effectiveId = legacyFluid.containerId;
      if (!effectiveItem || !effectiveItem.fluidStorage) {
        const capMl = legacyFluid.amountMl > 0 ? legacyFluid.amountMl : 500;
        const visuals = isJarCanOrBottleContainer(effectiveId)
          ? resolveContainerVisualAttributes(effectiveId, legacyFluid.liquidId, legacyFluid.attributes, origId, effectiveItem?.containerVisuals)
          : undefined;
        effectiveItem = {
          ...effectiveItem,
          itemId: legacyFluid.containerId,
          originalCatalogId: origId,
          containerVisuals: visuals,
          fluidStorage: {
            containerTypeId: legacyFluid.containerId,
            liquidId: legacyFluid.liquidId,
            currentMl: legacyFluid.amountMl,
            maxMl: capMl,
            capacityMl: capMl,
            containerVisuals: visuals,
            attributes: legacyFluid.attributes
          }
        };
      }
    } else {
      const shouldResolvePkg = !isInner && (!effectiveItem || !ITEM_CATALOG[effectiveId]);
      const legacyPkg = shouldResolvePkg ? getResolvedPackagingConfig(effectiveId) : null;
      if (legacyPkg) {
        const origPkgId = effectiveId;
        effectiveId = legacyPkg.containerId;
        if (!effectiveItem || !effectiveItem.contents) {
          const previewCount = Math.min(4, legacyPkg.countInside || 1);
          const previewContents = Array.from({ length: previewCount }, (_, idx) => {
            const preset = legacyPkg.innerGummyPresets && legacyPkg.innerGummyPresets.length > 0
              ? legacyPkg.innerGummyPresets[idx % legacyPkg.innerGummyPresets.length]
              : undefined;
            const pelmenPreset = legacyPkg.innerPelmenPresets && legacyPkg.innerPelmenPresets.length > 0
              ? legacyPkg.innerPelmenPresets[idx % legacyPkg.innerPelmenPresets.length]
              : undefined;
            return {
              itemId: legacyPkg.innerItemId || origPkgId,
              ...(preset ? { gummyAttributes: preset } : {}),
              ...(pelmenPreset ? { pelmenAttributes: pelmenPreset } : {})
            };
          });
          effectiveItem = {
            ...effectiveItem,
            itemId: legacyPkg.containerId,
            labelColor: legacyPkg.labelColor || effectiveItem?.labelColor,
            containerTintColor: legacyPkg.containerTintColor || effectiveItem?.containerTintColor,
            contents: previewContents
          };
        }
      } else if (isJarCanOrBottleContainer(effectiveId)) {
        const existingVis = effectiveItem?.containerVisuals || effectiveItem?.fluidStorage?.containerVisuals;
        if (!existingVis) {
          const visuals = resolveContainerVisualAttributes(
            effectiveId,
            effectiveItem?.fluidStorage?.liquidId,
            effectiveItem?.fluidStorage?.attributes,
            effectiveItem?.originalCatalogId
          );
          effectiveItem = {
            ...effectiveItem,
            itemId: effectiveId,
            containerVisuals: visuals
          };
        }
      }
    }

    const customRender = ITEM_CATALOG[effectiveId]?.render2D;
    const renderResolvedModel = (targetCtx: CanvasRenderingContext2D) => {
      let drawn = false;
      if (customRender) {
        customRender(targetCtx, effectiveItem);
        drawn = true;
      } else {
        drawn =
          drawPaperPackagingItem(targetCtx, effectiveId, effectiveItem) ||
          drawCandyPackagingItem(targetCtx, effectiveId, effectiveItem) ||
          drawGearToolItem(targetCtx, effectiveId, effectiveItem) ||
          drawSmartphoneItem(targetCtx, effectiveId) ||
          drawFoodItem(targetCtx, effectiveId, effectiveItem) ||
          drawDrinkItem(targetCtx, effectiveId) ||
          drawMedicalItem(targetCtx, effectiveId) ||
          drawFurnitureItem(targetCtx, effectiveId) ||
          drawKitchenAndValuableItem(targetCtx, effectiveId) ||
          drawClothingItem(targetCtx, effectiveId) ||
          drawMeatAndPoultryItem(targetCtx, effectiveId) ||
          drawFishAndSeafoodItem(targetCtx, effectiveId) ||
          drawProduceAndMushroomItem(targetCtx, effectiveId) ||
          drawPantryAndDairyItem(targetCtx, effectiveId) ||
          drawLeftoverItem(targetCtx, effectiveId);
      }

      if (!drawn) {
        // Fallback item graphics: durable supply parcel with shadow and tape
        drawShadow(targetCtx, 7, 2.5, 7.5, 0.2);
        targetCtx.fillStyle = '#64748b';
        targetCtx.beginPath();
        targetCtx.roundRect(-6.5, -6.5, 13, 13, 2);
        targetCtx.fill();
        targetCtx.fillStyle = '#94a3b8';
        targetCtx.fillRect(-6.5, -6.5, 13, 2);
        targetCtx.fillStyle = '#f59e0b';
        targetCtx.fillRect(-1.5, -6.5, 3, 13);
      }
    };

    renderResolvedModel(ctx);

    // Procedural thermal overlay (model-conforming frost rime, condensation droplets, steam wisps)
    if (effectiveItem && !isInner) {
      drawFrostAndThermalOverlay(ctx, effectiveItem, 8.5, renderResolvedModel);
    }
  } finally {
    ctx.restore();
    currentRenderDepth--;
  }
}

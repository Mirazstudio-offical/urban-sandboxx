// Procedural 2D Canvas Models for all Items & Trash in the Game
import { drawFoodItem } from './graphics/foodGraphics';
import { drawDrinkItem } from './graphics/drinkGraphics';
import { drawMedicalItem } from './graphics/medicalGraphics';
import { drawGearToolItem } from './graphics/gearToolGraphics';
import { drawLeftoverItem } from './graphics/leftoverGraphics';
import { drawClothingItem } from './graphics/clothingGraphics';
import { drawSmartphoneItem } from './graphics/smartphoneGraphics';
import { drawHardwareComponentItem } from './graphics/hardwareComponentGraphics';
import { drawFurnitureItem } from './graphics/furnitureGraphics';
import { drawKitchenAndValuableItem } from './graphics/kitchenAndValuablesGraphics';
import { drawMeatAndPoultryItem, drawMeatCutForm } from './graphics/meatAndPoultryGraphics';
import { drawFishAndSeafoodItem } from './graphics/fishAndSeafoodGraphics';
import { drawProduceAndMushroomItem } from './graphics/produceAndMushroomGraphics';
import { drawPantryAndDairyItem } from './graphics/pantryAndDairyGraphics';
import { drawPaperPackagingItem } from './graphics/paperPackagingGraphics';
import { drawCandyPackagingItem } from './graphics/candyPackagingGraphics';
import { drawChocolatePackagingItem } from './graphics/chocolatePackagingGraphics';
import { drawCulinaryDishItem } from './graphics/culinaryGraphics';
import { drawDoughItem, drawRollingPinItem } from './graphics/doughGraphics';
import { drawShadow, drawItemWithDynamicState, hasActiveItemVisualState, drawMicroBarcode } from './graphics/itemGraphicShared';
import { isJarCanOrBottleContainer, resolveContainerVisualAttributes } from './liquidSystem';
import { ITEM_CATALOG, LEGACY_KITCHENWARE_PRESETS, getResolvedFluidContainerConfig, getResolvedPackagingConfig } from './items';
import { LEGACY_PHONE_PRESETS, buildPhoneAttributes } from './phoneData';
import {
  LEGACY_PRODUCE_PRESETS,
  LEGACY_BRANCH_PRESETS,
  buildProduceAttributes,
  buildBranchAttributes,
  resolveProduceModelKey
} from './produceData';

let currentRenderDepth = 0;

export function drawItemModel2D(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  centerX: number = 0,
  centerY: number = 0,
  size: number = 24,
  item?: any,
  isInnerContentRender: boolean = false,
  rawCatalogOnly: boolean = false
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
    // synthesize the unified container ID and attributes unless rawCatalogOnly is requested
    let effectiveId = item?.itemId || itemId;
    let effectiveItem = item;
    const legacyKitchenware = LEGACY_KITCHENWARE_PRESETS[effectiveId];
    if (legacyKitchenware) {
      effectiveId = legacyKitchenware.kind;
      effectiveItem = {
        ...effectiveItem,
        itemId: legacyKitchenware.kind,
        kitchenwareAttributes: {
          ...legacyKitchenware,
          ...(effectiveItem?.kitchenwareAttributes || {})
        }
      };
    } else if (LEGACY_PHONE_PRESETS[effectiveId]) {
      const legacyId = effectiveId;
      effectiveId = 'phone';
      effectiveItem = {
        ...effectiveItem,
        itemId: 'phone',
        phoneAttributes: effectiveItem?.phoneAttributes || buildPhoneAttributes(legacyId)
      };
    } else if (
      LEGACY_PRODUCE_PRESETS[effectiveId] &&
      (isInner || rawCatalogOnly || !getResolvedPackagingConfig(effectiveId))
    ) {
      const lp = LEGACY_PRODUCE_PRESETS[effectiveId];
      effectiveId = lp.speciesId;
      effectiveItem = {
        ...effectiveItem,
        itemId: lp.speciesId,
        produceAttributes: effectiveItem?.produceAttributes || buildProduceAttributes(lp.speciesId, lp.overrides)
      };
    } else if (
      LEGACY_BRANCH_PRESETS[effectiveId] &&
      (isInner || rawCatalogOnly || !getResolvedPackagingConfig(effectiveId))
    ) {
      const lbId = effectiveId;
      effectiveId = 'plant_branch';
      effectiveItem = {
        ...effectiveItem,
        itemId: 'plant_branch',
        branchAttributes: effectiveItem?.branchAttributes || buildBranchAttributes(lbId)
      };
    }
    const legacyFluid = !isInner && !rawCatalogOnly ? getResolvedFluidContainerConfig(effectiveId) : null;
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
      const shouldResolvePkg = !isInner && !rawCatalogOnly && (!effectiveItem || !ITEM_CATALOG[effectiveId]);
      const legacyPkg = shouldResolvePkg ? getResolvedPackagingConfig(effectiveId) : null;
      if (legacyPkg) {
        const origPkgId = effectiveId;
        effectiveId = legacyPkg.containerId;
        if (!effectiveItem || !effectiveItem.contents) {
          const previewCount = Math.min(18, legacyPkg.countInside || 1);
          const previewContents = Array.from({ length: previewCount }, (_, idx) => {
            const preset = legacyPkg.innerGummyPresets && legacyPkg.innerGummyPresets.length > 0
              ? legacyPkg.innerGummyPresets[idx % legacyPkg.innerGummyPresets.length]
              : undefined;
            const pelmenPreset = legacyPkg.innerPelmenPresets && legacyPkg.innerPelmenPresets.length > 0
              ? legacyPkg.innerPelmenPresets[idx % legacyPkg.innerPelmenPresets.length]
              : undefined;
            const chocoPreset = legacyPkg.innerChocolatePresets && legacyPkg.innerChocolatePresets.length > 0
              ? legacyPkg.innerChocolatePresets[idx % legacyPkg.innerChocolatePresets.length]
              : undefined;
            const innerTargetId = legacyPkg.innerItemId || origPkgId;
            const producePreset = legacyPkg.innerProduceOverrides
              ? buildProduceAttributes(
                  LEGACY_PRODUCE_PRESETS[innerTargetId]?.speciesId || innerTargetId,
                  {
                    ...(LEGACY_PRODUCE_PRESETS[innerTargetId]?.overrides || {}),
                    ...legacyPkg.innerProduceOverrides
                  }
                )
              : undefined;
            return {
              itemId: innerTargetId,
              ...(preset ? { gummyAttributes: preset } : {}),
              ...(pelmenPreset ? { pelmenAttributes: pelmenPreset } : {}),
              ...(chocoPreset ? { chocolateAttributes: chocoPreset } : {}),
              ...(producePreset ? { produceAttributes: producePreset } : {})
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
        const prodAttrs = effectiveItem?.produceAttributes;
        const meatAttrs = effectiveItem?.meatAttributes;
        const resolvedProdModel = prodAttrs ? resolveProduceModelKey(prodAttrs) : null;
        if (resolvedProdModel === 'apple_core' || resolvedProdModel === 'banana_peel') {
          drawn = drawLeftoverItem(targetCtx, resolvedProdModel);
        } else if (
          effectiveId === 'plant_branch' ||
          (prodAttrs && (prodAttrs.cutForm !== 'whole' || resolvedProdModel !== effectiveId))
        ) {
          drawn = drawProduceAndMushroomItem(targetCtx, effectiveId, effectiveItem);
        } else if (effectiveId === 'dough' || effectiveItem?.doughAttributes) {
          drawn = drawDoughItem(targetCtx, effectiveItem);
        } else if (effectiveId === 'rolling_pin' || effectiveItem?.rollingPinAttributes) {
          drawn = drawRollingPinItem(targetCtx, effectiveItem);
        } else if (
          meatAttrs &&
          meatAttrs.cutForm !== 'whole' &&
          !(meatAttrs.cutForm === 'minced' && effectiveId.includes('minced')) &&
          !(meatAttrs.cutForm === 'steak' && effectiveId.endsWith('_steak') && meatAttrs.remainingFraction >= 0.99)
        ) {
          drawn = drawMeatCutForm(targetCtx, meatAttrs);
        }
        if (!drawn) {
          drawn =
            drawPaperPackagingItem(targetCtx, effectiveId, effectiveItem) ||
            drawCandyPackagingItem(targetCtx, effectiveId, effectiveItem) ||
            drawChocolatePackagingItem(targetCtx, effectiveId, effectiveItem) ||
            drawCulinaryDishItem(targetCtx, effectiveId, effectiveItem) ||
            drawGearToolItem(targetCtx, effectiveId, effectiveItem) ||
            drawSmartphoneItem(targetCtx, effectiveId, effectiveItem) ||
            drawHardwareComponentItem(targetCtx, effectiveId, effectiveItem) ||
            drawFoodItem(targetCtx, effectiveId, effectiveItem) ||
            drawDrinkItem(targetCtx, effectiveId) ||
            drawMedicalItem(targetCtx, effectiveId) ||
            drawFurnitureItem(targetCtx, effectiveId) ||
            drawKitchenAndValuableItem(targetCtx, effectiveId, effectiveItem) ||
            drawClothingItem(targetCtx, effectiveId) ||
            drawMeatAndPoultryItem(targetCtx, effectiveId) ||
            drawFishAndSeafoodItem(targetCtx, effectiveId) ||
            drawProduceAndMushroomItem(targetCtx, effectiveId, effectiveItem) ||
            drawPantryAndDairyItem(targetCtx, effectiveId) ||
            drawLeftoverItem(targetCtx, effectiveId);
        }
      }

      if (!drawn) {
        // Fallback item graphics: kraft corrugated supply parcel with tape & shipping barcode
        drawShadow(targetCtx, 7.2, 2.6, 7.6, 0.24);
        const boxGrad = targetCtx.createLinearGradient(-6.5, -6.5, 6.5, 6.5);
        boxGrad.addColorStop(0.0, '#d97706');
        boxGrad.addColorStop(0.55, '#b45309');
        boxGrad.addColorStop(1.0, '#78350f');
        targetCtx.fillStyle = boxGrad;
        targetCtx.beginPath();
        targetCtx.roundRect(-6.5, -6.5, 13, 13, 1.2);
        targetCtx.fill();

        // Top lid seam & highlights
        targetCtx.fillStyle = 'rgba(254, 243, 199, 0.16)';
        targetCtx.fillRect(-6.5, -6.5, 13, 2.0);
        targetCtx.strokeStyle = 'rgba(69, 26, 3, 0.55)';
        targetCtx.lineWidth = 0.45;
        targetCtx.beginPath();
        targetCtx.moveTo(-6.5, -4.5);
        targetCtx.lineTo(6.5, -4.5);
        targetCtx.stroke();

        // Packing tape strap
        targetCtx.fillStyle = 'rgba(254, 240, 138, 0.55)';
        targetCtx.fillRect(-1.4, -6.5, 2.8, 13);
        targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        targetCtx.lineWidth = 0.3;
        targetCtx.strokeRect(-1.4, -6.5, 2.8, 13);

        // Shipping barcode label
        drawMicroBarcode(targetCtx, 1.8, 2.6, 4.0, 2.6);
      }
    };

    // Procedural dynamic visual state (cooking/browning/charring, wet/soapy/soaked tint, thermal glow, frost & steam)
    if (effectiveItem && !rawCatalogOnly && hasActiveItemVisualState(effectiveItem, isInner)) {
      const poolDepth = Math.max(0, currentRenderDepth - 1);
      drawItemWithDynamicState(ctx, effectiveItem, 8.5, renderResolvedModel, isInner, poolDepth);
    } else {
      renderResolvedModel(ctx);
    }
  } finally {
    ctx.restore();
    currentRenderDepth--;
  }
}

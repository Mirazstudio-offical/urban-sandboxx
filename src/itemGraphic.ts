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
import { EXTENDED_LEGACY_CONTAINER_MAP, EXTENDED_ITEM_PACKAGING_MAP, UnifiedFluidMappingEntry } from './unifiedSubstanceCatalog';
import { isJarCanOrBottleContainer, resolveContainerVisualAttributes } from './liquidSystem';

const BASE_LEGACY_BOTTLE_CAN_MAP: Record<string, UnifiedFluidMappingEntry> = {
  bottle_empty: { containerId: 'bottle_plastic_500', liquidId: null, amountMl: 0 },
  water_bottle_empty: { containerId: 'bottle_plastic_500', liquidId: null, amountMl: 0 },
  water_bottle: { containerId: 'bottle_plastic_500', liquidId: 'water', amountMl: 500 },
  water_bottle_1500: { containerId: 'bottle_plastic_1500', liquidId: 'water', amountMl: 1500 },
  fuel_canister: { containerId: 'canister_metal_20l', liquidId: 'gasoline_95', amountMl: 20000 },
  bottle_water: { containerId: 'bottle_plastic_500', liquidId: 'water', amountMl: 500 },
  mineral_water: { containerId: 'bottle_plastic_500', liquidId: 'mineral_water', amountMl: 500 },
  kvas_bottle: { containerId: 'bottle_plastic_1500', liquidId: 'kvas', amountMl: 1500 },
  kvas: { containerId: 'bottle_plastic_1500', liquidId: 'kvas', amountMl: 1500 },
  milk_bottle: { containerId: 'bottle_plastic_1500', liquidId: 'milk', amountMl: 1000 },
  beer_bottle: { containerId: 'glass_bottle_500', liquidId: 'beer', amountMl: 500 },
  bottle_beer: { containerId: 'glass_bottle_500', liquidId: 'beer', amountMl: 500 },
  vodka_bottle: { containerId: 'glass_bottle_500', liquidId: 'vodka', amountMl: 500 },
  bottle_vodka: { containerId: 'glass_bottle_500', liquidId: 'vodka', amountMl: 500 },
  vodka: { containerId: 'glass_bottle_500', liquidId: 'vodka', amountMl: 500 },
  bottle_wine: { containerId: 'bottle_glass_750', liquidId: 'wine_red', amountMl: 750 },
  wine_bottle: { containerId: 'bottle_glass_750', liquidId: 'wine_red', amountMl: 750 },
  wine_white_cooking: { containerId: 'bottle_glass_750', liquidId: 'wine_white', amountMl: 750 },
  wine_white: { containerId: 'bottle_glass_750', liquidId: 'wine_white', amountMl: 750 },
  wine_red_cooking: { containerId: 'bottle_glass_750', liquidId: 'wine_red', amountMl: 750 },
  wine_red: { containerId: 'bottle_glass_750', liquidId: 'wine_red', amountMl: 750 },
  brake_fluid: { containerId: 'bottle_plastic_500', liquidId: 'brake_fluid', amountMl: 500 },
  brake_fluid_can: { containerId: 'bottle_plastic_500', liquidId: 'brake_fluid', amountMl: 500 },
  canister_brake_fluid: { containerId: 'bottle_plastic_500', liquidId: 'brake_fluid', amountMl: 500 },
  motor_oil: { containerId: 'canister_plastic_5l', liquidId: 'motor_oil', amountMl: 5000 },
  antifreeze: { containerId: 'canister_plastic_5l', liquidId: 'antifreeze', amountMl: 5000 },
  washer_fluid: { containerId: 'canister_plastic_5l', liquidId: 'washer_fluid', amountMl: 5000 },
  hot_coffee: { containerId: 'paper_cup', liquidId: 'coffee', amountMl: 250 },
  coffee: { containerId: 'paper_cup', liquidId: 'coffee', amountMl: 250 },
  cappuccino: { containerId: 'paper_cup', liquidId: 'coffee', amountMl: 250 },
  tea: { containerId: 'paper_cup', liquidId: 'tea', amountMl: 250 },
  tea_green: { containerId: 'paper_cup', liquidId: 'tea_green', amountMl: 250 },
  milkshake: { containerId: 'paper_cup', liquidId: 'milk', amountMl: 350 },
  carton_milk: { containerId: 'tetra_pack_1000', liquidId: 'milk', amountMl: 1000 },
  milk: { containerId: 'tetra_pack_1000', liquidId: 'milk', amountMl: 1000 },
  fresh_juice: { containerId: 'tetra_pack_1000', liquidId: 'juice', amountMl: 1000 },
  juice: { containerId: 'tetra_pack_1000', liquidId: 'juice', amountMl: 1000 },
  soup: { containerId: 'soup_bowl', liquidId: 'broth_beef', amountMl: 500 },
  hot_soup: { containerId: 'soup_bowl', liquidId: 'broth_beef', amountMl: 500 },
  sugar: { containerId: 'package_bag', liquidId: 'sugar', amountMl: 1000 },
  salt: { containerId: 'package_bag', liquidId: 'salt', amountMl: 500 },
  camp_flask: { containerId: 'camp_flask', liquidId: 'water', amountMl: 800 },
  thermos: { containerId: 'thermos', liquidId: 'tea', amountMl: 1000 },
  energy_drink: { containerId: 'can_alu_330', liquidId: 'energy_drink', amountMl: 330 },
  cola_can: { containerId: 'can_alu_330', liquidId: 'cola', amountMl: 330 },
  soda_can: { containerId: 'can_alu_330', liquidId: 'cola', amountMl: 330 },
  cola: { containerId: 'can_alu_330', liquidId: 'cola', amountMl: 330 },
  cola_zero: { containerId: 'can_alu_330', liquidId: 'cola', amountMl: 330 },
  can_beer: { containerId: 'can_alu_330', liquidId: 'beer', amountMl: 330 },
  beer_can: { containerId: 'can_alu_330', liquidId: 'beer', amountMl: 330 },
  beer: { containerId: 'can_alu_330', liquidId: 'beer', amountMl: 330 },
  can_empty: { containerId: 'can_alu_330_open', liquidId: null, amountMl: 0 },
  cola_zero_empty: { containerId: 'can_alu_330_open', liquidId: null, amountMl: 0 },
  energy_can_empty: { containerId: 'can_alu_330_open', liquidId: null, amountMl: 0 },
  tin_can_empty: { containerId: 'can_metal_medium_open', liquidId: null, amountMl: 0 }
};

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
  const legacyFluid = EXTENDED_LEGACY_CONTAINER_MAP[effectiveId] || BASE_LEGACY_BOTTLE_CAN_MAP[effectiveId];
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
    const legacyPkg = EXTENDED_ITEM_PACKAGING_MAP[effectiveId];
    if (legacyPkg) {
      effectiveId = legacyPkg.containerId;
      if (!effectiveItem || !effectiveItem.contents) {
        effectiveItem = {
          ...effectiveItem,
          itemId: legacyPkg.containerId,
          labelColor: legacyPkg.labelColor || effectiveItem?.labelColor,
          contents: [{ itemId: legacyPkg.innerItemId }]
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

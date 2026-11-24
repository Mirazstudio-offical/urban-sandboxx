import { GameWorld, GroundItem, InventoryItem, ItemCategory, Player } from './types';
import { sound } from './audio';
import { ITEM_CATALOG, addPlayerNotification, getItemTotalWeight, takeItemFromHand, getSlotCompartment } from './items';
import { addInjuryToPart } from './bodySystem';
import { getOutsideTemperature } from './physics';
import { updateHybridContainerInteraction } from './liquidSystem';

export interface ItemThermalConfig {
  temperature?: number;        // Default core temperature in °C
  heatLossRate: number;        // Cooling rate coefficient per second (0.001 - 0.50)
  heatRetention: number;       // Insulation / retention factor (0.0 = bare metal, 1.0 = vacuum flask)
  surfaceTemperature?: number; // Precomputed/initial surface temperature in °C
}

/**
 * Predefined thermal configs for specific items
 */
export const ITEM_THERMAL_CONFIGS: Record<string, ItemThermalConfig> = {
  // === HOT BEVERAGES & FAST FOOD (CAFE, PIZZERIA, ASIAN, BAKERY) ===
  coffee: {
    temperature: 82.0,
    heatLossRate: 0.0035,
    heatRetention: 0.35, // Disposable paper cup conducts significant heat to the outer surface
    surfaceTemperature: 60.5
  },
  hot_coffee: {
    temperature: 82.0,
    heatLossRate: 0.0035,
    heatRetention: 0.35,
    surfaceTemperature: 60.5
  },
  cappuccino: {
    temperature: 74.0,
    heatLossRate: 0.0032,
    heatRetention: 0.36,
    surfaceTemperature: 55.0
  },
  tea_green: {
    temperature: 80.0,
    heatLossRate: 0.0030,
    heatRetention: 0.38,
    surfaceTemperature: 57.0
  },
  tea: {
    temperature: 80.0,
    heatLossRate: 0.0030,
    heatRetention: 0.38,
    surfaceTemperature: 57.0
  },
  soup: {
    temperature: 78.0,
    heatLossRate: 0.0025,
    heatRetention: 0.42,
    surfaceTemperature: 54.0
  },
  soup_bowl: {
    temperature: 78.0,
    heatLossRate: 0.0025,
    heatRetention: 0.42,
    surfaceTemperature: 54.0
  },
  popcorn_caramel: {
    temperature: 46.0,
    heatLossRate: 0.0040,
    heatRetention: 0.35,
    surfaceTemperature: 38.0
  },
  nachos: {
    temperature: 42.0,
    heatLossRate: 0.0045,
    heatRetention: 0.32,
    surfaceTemperature: 36.0
  },

  // === REFRIGERATED SUPERMARKET & BEVERAGE SECTION (+2°C to +5°C) ===
  milk: {
    temperature: 3.5,
    heatLossRate: 0.0022,
    heatRetention: 0.35,
    surfaceTemperature: 5.0
  },
  carton_milk: {
    temperature: 3.5,
    heatLossRate: 0.0022,
    heatRetention: 0.35,
    surfaceTemperature: 5.0
  },
  sour_cream: {
    temperature: 3.5,
    heatLossRate: 0.0020,
    heatRetention: 0.40,
    surfaceTemperature: 4.8
  },
  sour_cream_pot: {
    temperature: 3.5,
    heatLossRate: 0.0020,
    heatRetention: 0.40,
    surfaceTemperature: 4.8
  },
  butter_brick_salted: {
    temperature: 3.5,
    heatLossRate: 0.0018,
    heatRetention: 0.42,
    surfaceTemperature: 4.8
  },
  cheese_cheddar_block: {
    temperature: 4.0,
    heatLossRate: 0.0020,
    heatRetention: 0.40,
    surfaceTemperature: 5.2
  },
  cola: {
    temperature: 4.0,
    heatLossRate: 0.0040,
    heatRetention: 0.18,
    surfaceTemperature: 5.2
  },
  cola_zero: {
    temperature: 4.0,
    heatLossRate: 0.0040,
    heatRetention: 0.18,
    surfaceTemperature: 5.2
  },
  energy_drink: {
    temperature: 4.0,
    heatLossRate: 0.0040,
    heatRetention: 0.18,
    surfaceTemperature: 5.2
  },
  beer: {
    temperature: 4.0,
    heatLossRate: 0.0038,
    heatRetention: 0.20,
    surfaceTemperature: 5.2
  },
  kvas: {
    temperature: 5.0,
    heatLossRate: 0.0035,
    heatRetention: 0.25,
    surfaceTemperature: 6.0
  },
  fresh_juice: {
    temperature: 5.0,
    heatLossRate: 0.0032,
    heatRetention: 0.28,
    surfaceTemperature: 6.2
  },
  soda_can: {
    temperature: 4.0,
    heatLossRate: 0.0040,
    heatRetention: 0.18,
    surfaceTemperature: 5.2
  },

  // === FROZEN SUPERMARKET MEAT, POULTRY & SEAFOOD SECTION (-16°C) ===
  beef_minced: {
    temperature: -16.0,
    heatLossRate: 0.0012,
    heatRetention: 0.45,
    surfaceTemperature: -13.5
  },
  pork_minced: {
    temperature: -16.0,
    heatLossRate: 0.0012,
    heatRetention: 0.45,
    surfaceTemperature: -13.5
  },
  chicken_minced: {
    temperature: -16.0,
    heatLossRate: 0.0012,
    heatRetention: 0.45,
    surfaceTemperature: -13.5
  },
  turkey_minced: {
    temperature: -16.0,
    heatLossRate: 0.0012,
    heatRetention: 0.45,
    surfaceTemperature: -13.5
  },
  minced_meat_mixed: {
    temperature: -16.0,
    heatLossRate: 0.0012,
    heatRetention: 0.45,
    surfaceTemperature: -13.5
  },
  beef_rump_large: {
    temperature: -16.0,
    heatLossRate: 0.0010,
    heatRetention: 0.50,
    surfaceTemperature: -14.0
  },
  chicken_breast_large: {
    temperature: -16.0,
    heatLossRate: 0.0012,
    heatRetention: 0.45,
    surfaceTemperature: -13.5
  },
  chicken_thighs_medium: {
    temperature: -16.0,
    heatLossRate: 0.0012,
    heatRetention: 0.45,
    surfaceTemperature: -13.5
  },
  pork_ribs_medium: {
    temperature: -16.0,
    heatLossRate: 0.0010,
    heatRetention: 0.48,
    surfaceTemperature: -14.0
  },
  salmon_steak: {
    temperature: -16.0,
    heatLossRate: 0.0012,
    heatRetention: 0.45,
    surfaceTemperature: -13.5
  },
  cod_fillet: {
    temperature: -16.0,
    heatLossRate: 0.0012,
    heatRetention: 0.45,
    surfaceTemperature: -13.5
  },

  // === DEEP FREEZE & FROZEN SECTION (-18°C to -6°C) ===
  vegetable_mix_frozen: {
    temperature: -16.0,
    heatLossRate: 0.0015,
    heatRetention: 0.40,
    surfaceTemperature: -13.5
  },
  berries_mixed_frozen: {
    temperature: -16.0,
    heatLossRate: 0.0015,
    heatRetention: 0.40,
    surfaceTemperature: -13.5
  },

  // === THERMOS & INSULATED DRINKWARE ===
  thermos: {
    temperature: 20.0,
    heatLossRate: 0.00015,     // Ultra-low heat loss due to vacuum flask (hours of heat retention)
    heatRetention: 0.96,       // 96% thermal retention: exterior remains cool even with boiling content!
    surfaceTemperature: 20.0
  },
  camp_flask: {
    temperature: 20.0,
    heatLossRate: 0.0045,
    heatRetention: 0.22,
    surfaceTemperature: 20.0
  },
  paper_cup: {
    temperature: 20.0,
    heatLossRate: 0.0035,
    heatRetention: 0.35,
    surfaceTemperature: 20.0
  },
  glass_mug: {
    temperature: 20.0,
    heatLossRate: 0.0030,
    heatRetention: 0.40,
    surfaceTemperature: 20.0
  },
  can_alu_330: {
    temperature: 20.0,
    heatLossRate: 0.0050,
    heatRetention: 0.14,
    surfaceTemperature: 20.0
  },

  // === HEATED METAL / COOKWARE ===
  kitchen_kettle_steel: {
    temperature: 20.0,
    heatLossRate: 0.0050,
    heatRetention: 0.20,
    surfaceTemperature: 20.0
  },
  kitchen_kettle_enamel: {
    temperature: 20.0,
    heatLossRate: 0.0040,
    heatRetention: 0.25,
    surfaceTemperature: 20.0
  },
  kitchen_kettle_electric: {
    temperature: 20.0,
    heatLossRate: 0.0030,
    heatRetention: 0.35,
    surfaceTemperature: 20.0
  }
};

/**
 * Category-level thermal properties fallback
 */
export const CATEGORY_THERMAL_DEFAULTS: Record<ItemCategory, { heatLossRate: number; heatRetention: number }> = {
  drink: { heatLossRate: 0.0030, heatRetention: 0.35 },
  food: { heatLossRate: 0.0020, heatRetention: 0.40 },
  tool: { heatLossRate: 0.0060, heatRetention: 0.16 },       // Bare steel / tools lose/gain heat rapidly
  auto: { heatLossRate: 0.0055, heatRetention: 0.18 },       // Automotive metal components
  clothing: { heatLossRate: 0.0010, heatRetention: 0.85 },   // Insulating fabric / wool / down
  gear: { heatLossRate: 0.0025, heatRetention: 0.50 },
  electronics: { heatLossRate: 0.0022, heatRetention: 0.52 },
  med: { heatLossRate: 0.0025, heatRetention: 0.45 },
  medical: { heatLossRate: 0.0025, heatRetention: 0.45 },
  furniture: { heatLossRate: 0.0012, heatRetention: 0.65 },
  valuable: { heatLossRate: 0.0060, heatRetention: 0.15 },
  misc: { heatLossRate: 0.0030, heatRetention: 0.40 },
  trash: { heatLossRate: 0.0040, heatRetention: 0.30 }
};

/**
 * Computes external boundary / surface temperature from core temperature,
 * ambient environment temperature, and item's heat retention factor.
 */
export function calculateSurfaceTemperature(
  coreTemp: number,
  ambientTemp: number,
  heatRetention: number
): number {
  const retention = Math.max(0, Math.min(0.98, heatRetention));
  // Heat conductance through outer shell:
  // Vacuum thermos (0.95 retention) -> conductance = 1 - 0.95*0.92 = 0.126 (exterior stays cool/ambient)
  // Bare metal (0.15 retention) -> conductance = 1 - 0.15*0.92 = 0.862 (exterior nearly equals core temp)
  const conductance = 1.0 - (retention * 0.92);
  const surface = ambientTemp + (coreTemp - ambientTemp) * conductance;
  return Number(surface.toFixed(1));
}

/**
 * Retrieves default thermal properties for a given item ID or category,
 * reading directly from ITEM_CATALOG[itemId] first (Single Source of Truth).
 */
export function getItemThermalDefaults(itemId: string, category: ItemCategory = 'misc', originalCatalogId?: string): ItemThermalConfig {
  const origDef = originalCatalogId && ITEM_CATALOG ? ITEM_CATALOG[originalCatalogId] : undefined;
  const catalogDef = ITEM_CATALOG ? ITEM_CATALOG[itemId] : undefined;
  const specific = (originalCatalogId ? ITEM_THERMAL_CONFIGS[originalCatalogId] : undefined) || ITEM_THERMAL_CONFIGS[itemId];
  const catDefault = CATEGORY_THERMAL_DEFAULTS[category] || CATEGORY_THERMAL_DEFAULTS.misc;

  return {
    temperature: origDef?.temperature ?? catalogDef?.temperature ?? specific?.temperature,
    heatLossRate: origDef?.heatLossRate ?? catalogDef?.heatLossRate ?? specific?.heatLossRate ?? catDefault.heatLossRate,
    heatRetention: origDef?.heatRetention ?? catalogDef?.heatRetention ?? specific?.heatRetention ?? catDefault.heatRetention,
    surfaceTemperature: origDef?.surfaceTemperature ?? catalogDef?.surfaceTemperature ?? specific?.surfaceTemperature
  };
}

/**
 * Initializes thermal attributes on an item if not yet set
 */
export function initItemThermalProperties(item: InventoryItem, ambientTemp: number = 20.0): void {
  const defaults = getItemThermalDefaults(item.itemId, item.category, item.originalCatalogId);

  if (typeof item.heatLossRate !== 'number' || !Number.isFinite(item.heatLossRate)) {
    item.heatLossRate = defaults.heatLossRate;
  }
  if (typeof item.heatRetention !== 'number' || !Number.isFinite(item.heatRetention)) {
    item.heatRetention = defaults.heatRetention;
  }
  if (typeof item.temperature !== 'number' || !Number.isFinite(item.temperature)) {
    item.temperature = defaults.temperature !== undefined ? defaults.temperature : ambientTemp;
  }
  if (typeof item.ambientTemperature !== 'number' || !Number.isFinite(item.ambientTemperature)) {
    item.ambientTemperature = ambientTemp;
  }
  if (typeof item.surfaceTemperature !== 'number' || !Number.isFinite(item.surfaceTemperature)) {
    item.surfaceTemperature = calculateSurfaceTemperature(item.temperature, item.ambientTemperature, item.heatRetention);
  }
  if (typeof item.lastThermalUpdate !== 'number') {
    item.lastThermalUpdate = Date.now() / 1000;
  }
  item.isThermalStable = Math.abs(item.temperature - item.ambientTemperature) < 0.25;
}

/**
 * Updates a single item's core and surface temperature using Newton's cooling law.
 * Supports multi-layer nested packaging (e.g. item in a bag, in another bag, in a cooler).
 * Returns true if the item was actively modified.
 */
export function updateItemThermodynamics(
  item: InventoryItem,
  ambientTemp: number,
  dt: number,
  parentInsulationMultiplier: number = 1.0
): boolean {
  if (!item) return false;

  // Lazy initialize if missing
  if (typeof item.temperature !== 'number' || typeof item.heatLossRate !== 'number') {
    initItemThermalProperties(item, ambientTemp);
  }

  const core = item.temperature ?? ambientTemp;
  const lossRate = item.heatLossRate ?? 0.003;
  const retention = Math.max(0, Math.min(0.98, item.heatRetention ?? 0.35));
  item.ambientTemperature = ambientTemp;

  // Optimization: If item is already at thermal equilibrium with the environment, skip cooling math
  // (still run active fluid-solid mixing for hybrid containers holding both liquid and items!)
  const deltaFromEnv = Math.abs(core - ambientTemp);
  if (deltaFromEnv < 0.2 && item.isThermalStable) {
    if (item.fluidStorage && item.contents && item.contents.length > 0) {
      return updateHybridContainerInteraction(item, dt);
    }
    if (item.wetness !== undefined && item.wetness > 0) {
      // Allow wet items to continue drying even at ambient temperature
      const dryRate = ambientTemp > 22.0 ? 0.025 + (ambientTemp - 22.0) * 0.035 : (ambientTemp < 10.0 ? 0.01 : 0.025);
      item.wetness = Math.round(Math.max(0, item.wetness - dryRate * dt) * 10) / 10;
      if (item.wetness <= 0.1) {
        item.wetness = 0;
        item.soakedLiquidId = undefined;
        item.soakedLiquidNameRu = undefined;
        item.soakedColor = undefined;
      }
      if (item.clothingStats) item.clothingStats.wetness = item.wetness;
      return true;
    }
    return false;
  }

  // Thermal mass scaling: heavier objects (e.g. 1kg brick of meat vs 30g snack) heat up & cool down much slower
  // Reference mass is 0.25 kg. Heavier items have greater thermal inertia.
  const weightKg = Math.max(0.04, item.weight ?? 0.25);
  const massScaling = Math.max(0.12, Math.min(3.0, 0.25 / weightKg));

  // Effective cooling speed: retention slows down core heat loss.
  // Each enclosing packaging layer (parentInsulationMultiplier) provides additional thermal barrier.
  const effectiveLoss = lossRate * massScaling * (1.0 - (retention * 0.85)) * parentInsulationMultiplier;
  
  // Analytical solution to Newton's law of cooling: T(t) = T_env + (T_0 - T_env) * exp(-k * dt)
  const decay = Math.exp(-effectiveLoss * Math.max(0, dt));
  const newCore = ambientTemp + (core - ambientTemp) * decay;

  const newSurface = calculateSurfaceTemperature(newCore, ambientTemp, retention);

  item.temperature = Number(newCore.toFixed(1));
  item.surfaceTemperature = Number(newSurface.toFixed(1));
  item.lastThermalUpdate = Date.now() / 1000;
  item.isThermalStable = Math.abs(newCore - ambientTemp) < 0.2;

  // Wetness drying & moisture dissipation on garments, fabrics, and extracted soaked items
  if (item.wetness !== undefined && item.wetness > 0) {
    // Base evaporation in ambient air (slow, physically realistic)
    let dryRate = 0.025; // ~0.025% per sec at 20°C (approx 40-50 min to fully dry)
    if (ambientTemp > 22.0) {
      // Rapid thermal evaporation near heat sources, fires, and hot vehicle blowers
      const excessHeat = ambientTemp - 22.0;
      dryRate += excessHeat * 0.035; // scales up to ~1.5 - 2.5%/sec near fires/stoves
    } else if (ambientTemp < 10.0) {
      // Freezing / damp cold air severely retards evaporation
      dryRate = Math.max(0.005, dryRate * 0.4);
    }
    const updatedWetness = Math.max(0, item.wetness - dryRate * dt);
    item.wetness = Math.round(updatedWetness * 10) / 10;
    if (item.wetness <= 0.1) {
      item.wetness = 0;
      item.soakedLiquidId = undefined;
      item.soakedLiquidNameRu = undefined;
      item.soakedColor = undefined;
    }
    if (item.clothingStats) {
      item.clothingStats.wetness = item.wetness;
    }
  }

  // Recursively update contained items if container exists (e.g., bag in bag, jar with liquid & vegetables)
  if (item.contents && item.contents.length > 0) {
    // Each enclosing bag/container reduces heat exchange for inner items (trapped air layer + barrier)
    const nextInsulationMultiplier = parentInsulationMultiplier * Math.max(0.20, 1.0 - (retention * 0.65));
    // Inner cavity air temperature is heavily buffered by the container's interior
    const internalAmbient = Number((newCore * 0.85 + ambientTemp * 0.15).toFixed(1));
    for (const child of item.contents) {
      if (child) {
        updateItemThermodynamics(child, internalAmbient, dt, nextInsulationMultiplier);
      }
    }
    // Run hybrid liquid-solid soaking, infusion, and boiling interaction
    if (item.fluidStorage) {
      updateHybridContainerInteraction(item, dt);
    }
  }

  return true;
}

// Throttling for audio/notifications
let lastDropSoundTime = 0;
let lastBurnNotifTime = 0;

/**
 * Evaluates thermal contact between hot/cold items and player body parts.
 * Triggers burns, frostbite, pain pulses, diegetic sensations, and involuntary drop reflexes.
 */
export function processPlayerItemThermalBurns(
  player: Player,
  world: GameWorld,
  dt: number
): void {
  if (!player || player.isInvincible || player.isCleanMode || !player.bodyState) return;

  const bs = player.bodyState;
  const now = Date.now() / 1000;

  // Check if player is wearing thermal insulated gloves
  const handGear = player.equippedClothing?.hands?.outerwear;
  const hasInsulatedGloves = !!handGear && (handGear.clothingStats?.insulation ?? 0) >= 15;

  // Helper to apply localized thermal injury (burn or frostbite)
  const applyContactBurn = (
    part: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg' | 'torso',
    item: InventoryItem,
    surfaceTemp: number,
    contactLocationName: string
  ) => {
    // Determine burn severity & degree based on surface temperature
    let degree: 1 | 2 | 3 = 1;
    let severity = 15;

    if (surfaceTemp >= 78.0) {
      degree = 2;
      severity = 40;
    } else if (surfaceTemp >= 64.0) {
      degree = surfaceTemp >= 72.0 ? 2 : 1;
      severity = 25;
    }

    addInjuryToPart(bs, part, 'burn', severity * dt * 0.8, degree);

    // Play hurt audio and groans
    if (now - lastDropSoundTime > 1.2) {
      sound.playHurt();
      lastDropSoundTime = now;
    }

    // Diegetic notification (throttled to once every 3.5 seconds)
    if (now - lastBurnNotifTime > 3.5) {
      const tempRound = Math.round(surfaceTemp);
      addPlayerNotification(
        player,
        `Горячий предмет «${item.nameRu}» (${tempRound}°C) обжигает ${contactLocationName}!`,
        'warning'
      );
      lastBurnNotifTime = now;
    }
  };

  // Helper to apply localized cold contact / frostbite
  const applyContactCold = (
    part: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg' | 'torso',
    item: InventoryItem,
    coreTemp: number,
    surfaceTemp: number,
    contactLocationName: string
  ) => {
    const isFreezing = surfaceTemp <= 0.0 || coreTemp <= -5.0;
    const isDeepFreeze = coreTemp <= -12.0;

    // Apply frostbite injury to body part
    const severity = isDeepFreeze ? 30 : (isFreezing ? 18 : 10);
    addInjuryToPart(bs, part, 'burn', severity * dt * 0.7, 1);

    // Cool down internal body core temperature
    bs.temperature = Math.max(33.5, bs.temperature - (isDeepFreeze ? 0.04 : 0.02) * dt);
    bs.shiverIntensity = Math.min(1.0, (bs.shiverIntensity || 0) + 0.05 * dt);
    bs.painLevel = Math.min(100, (bs.painLevel || 0) + (isDeepFreeze ? 2.5 : 1.0) * dt);

    if (now - lastDropSoundTime > 2.0 && isFreezing) {
      sound.playShiver();
      lastDropSoundTime = now;
    }

    if (now - lastBurnNotifTime > 3.5) {
      const tempRound = Math.round(coreTemp);
      addPlayerNotification(
        player,
        `Замороженный продукт «${item.nameRu}» (${tempRound}°C) в ${contactLocationName} леденит плоть! Судорога от холода.`,
        'warning'
      );
      lastBurnNotifTime = now;
    }
  };

  // Helper to handle involuntary drop reflex for scorching or freezing hand items
  const checkHandThermalEffects = (hand: 'left' | 'right', item: InventoryItem | null | undefined) => {
    if (!item) return;
    const coreTemp = item.temperature ?? 20;
    const surfaceTemp = item.surfaceTemperature ?? coreTemp;

    // 1. Scalding heat: involuntary drop reflex! (T >= 68°C)
    // Insulated gloves insulate bare palm against burns
    if (surfaceTemp >= 68.0 && !hasInsulatedGloves) {
      const dropped = takeItemFromHand(player, hand);
      if (dropped) {
        if (!world.groundItems) world.groundItems = [];
        const angle = player.angle || 0;
        world.groundItems.push({
          id: `ground_hot_${dropped.id}_${Date.now()}`,
          x: player.x + Math.cos(angle) * 16,
          y: player.y + Math.sin(angle) * 16,
          item: dropped,
          spawnTime: Date.now()
        });

        sound.playHurt();
        sound.playGroan();
        lastDropSoundTime = now;

        const partKey = hand === 'left' ? 'leftArm' : 'rightArm';
        addInjuryToPart(bs, partKey, 'burn', 35, 2);

        addPlayerNotification(
          player,
          `Ой! «${dropped.nameRu}» раскален до ${Math.round(surfaceTemp)}°C! Вы рефлекторно выронили его от резкого ожога!`,
          'warning'
        );
        return;
      }
    }

    // 2. High heat: sustained contact burns (T >= 52°C)
    if (surfaceTemp >= 52.0 && !hasInsulatedGloves) {
      const partKey = hand === 'left' ? 'leftArm' : 'rightArm';
      const handName = hand === 'left' ? 'ладонь левой руки' : 'ладонь правой руки';
      applyContactBurn(partKey, item, surfaceTemp, handName);
      return;
    }

    // 3. Freezing Cold: bare hand holding frozen/deep-freeze item (T <= 0°C or coreTemp <= -8°C)
    if ((surfaceTemp <= 1.0 || coreTemp <= -4.0) && !hasInsulatedGloves) {
      // Freezing hands: involuntary drop if severely frozen (T <= -10°C)
      if (coreTemp <= -10.0 && Math.random() < 0.08 * dt) {
        const dropped = takeItemFromHand(player, hand);
        if (dropped) {
          if (!world.groundItems) world.groundItems = [];
          const angle = player.angle || 0;
          world.groundItems.push({
            id: `ground_frozen_${dropped.id}_${Date.now()}`,
            x: player.x + Math.cos(angle) * 16,
            y: player.y + Math.sin(angle) * 16,
            item: dropped,
            spawnTime: Date.now()
          });

          sound.playHurt();
          sound.playShiver();
          lastDropSoundTime = now;

          const partKey = hand === 'left' ? 'leftArm' : 'rightArm';
          addInjuryToPart(bs, partKey, 'burn', 25, 1);

          addPlayerNotification(
            player,
            `Ой! Замороженный «${dropped.nameRu}» (${Math.round(coreTemp)}°C) сжёг пальцы ледяной болью! Онемевшая рука выронила его!`,
            'warning'
          );
          return;
        }
      }

      // Sustained cold contact in hand
      const partKey = hand === 'left' ? 'leftArm' : 'rightArm';
      const handName = hand === 'left' ? 'голой ладони левой руки' : 'голой ладони правой руки';
      applyContactCold(partKey, item, coreTemp, surfaceTemp, handName);
    }
  };

  // 1. Hands check
  checkHandThermalEffects('left', player.leftHandItem);
  checkHandThermalEffects('right', player.rightHandItem);

  // 2. Inventory slots check (Pockets & Compartments)
  if (player.inventory) {
    for (let slotIdx = 0; slotIdx < player.inventory.length; slotIdx++) {
      const item = player.inventory[slotIdx];
      if (!item) continue;

      const coreTemp = item.temperature ?? 20;
      const surfaceTemp = item.surfaceTemperature ?? coreTemp;

      const slotInfo = getSlotCompartment(player, slotIdx);
      if (!slotInfo) continue;

      const compId = slotInfo.compartment.id;

      // HOT items in pockets (T >= 50°C)
      if (surfaceTemp >= 50.0) {
        if (compId === 'legs') {
          const legPart = slotIdx % 2 === 0 ? 'leftLeg' : 'rightLeg';
          applyContactBurn(legPart, item, surfaceTemp, 'бедро через карман брюк');
        } else if (compId === 'torso') {
          applyContactBurn('torso', item, surfaceTemp, 'грудь через карман куртки');
        } else if (compId === 'base') {
          applyContactBurn('torso', item, surfaceTemp, 'тело через внутренний карман');
        }
      }
      // COLD / FROZEN items in pockets (coreTemp <= -2°C or surfaceTemp <= 2°C)
      else if (coreTemp <= -2.0 || surfaceTemp <= 2.0) {
        if (compId === 'legs') {
          const legPart = slotIdx % 2 === 0 ? 'leftLeg' : 'rightLeg';
          applyContactCold(legPart, item, coreTemp, surfaceTemp, 'кармане брюк');
        } else if (compId === 'torso') {
          applyContactCold('torso', item, coreTemp, surfaceTemp, 'кармане куртки');
        } else if (compId === 'base') {
          applyContactCold('torso', item, coreTemp, surfaceTemp, 'внутреннем кармане');
        }
      }
    }
  }
}

// High-efficiency thermal simulation accumulator (runs every 0.5s)
let thermalAccumulator = 0;
const THERMAL_TICK_INTERVAL = 0.5;

/**
 * Main thermodynamics engine for all items in the game world.
 * Highly optimized with interval time-slicing and spatial culling.
 */
export function updateWorldItemsThermodynamics(
  world: GameWorld,
  player: Player,
  dt: number
): void {
  thermalAccumulator += dt;
  if (thermalAccumulator < THERMAL_TICK_INTERVAL) {
    return; // Fast exit: zero CPU overhead on 29 out of 30 frames
  }

  const effectiveDt = thermalAccumulator;
  thermalAccumulator = 0;

  // 1. Determine local ambient temperature around the player
  const outsideTemp = getOutsideTemperature(world, world.timeHour);
  let playerAmbientTemp = outsideTemp;

  const curVehicle = player.isInVehicle && player.currentVehicleId
    ? world.vehicles.find(v => v.id === player.currentVehicleId)
    : undefined;

  if (curVehicle) {
    playerAmbientTemp = curVehicle.heaterTemp ?? outsideTemp;
  } else if (player.isInsideBuilding) {
    playerAmbientTemp = 21.0; // Room temperature inside apartments/stores
  }

  // 2. Update all items carried by the player
  // a) Hands
  if (player.leftHandItem) {
    updateItemThermodynamics(player.leftHandItem, playerAmbientTemp, effectiveDt);
  }
  if (player.rightHandItem) {
    updateItemThermodynamics(player.rightHandItem, playerAmbientTemp, effectiveDt);
  }

  // b) Inventory
  if (player.inventory) {
    for (const item of player.inventory) {
      if (item) {
        updateItemThermodynamics(item, playerAmbientTemp, effectiveDt);
      }
    }
  }

  // c) Equipped clothing and items stored inside their pockets
  if (player.equippedClothing) {
    for (const slotKey of Object.keys(player.equippedClothing) as (keyof typeof player.equippedClothing)[]) {
      const slot = player.equippedClothing[slotKey];
      if (!slot) continue;
      for (const layerKey of Object.keys(slot) as (keyof typeof slot)[]) {
        const cloth = slot[layerKey];
        if (cloth) {
          updateItemThermodynamics(cloth, playerAmbientTemp, effectiveDt);
        }
      }
    }
  }

  // 3. Process contact thermal burns on player limbs
  processPlayerItemThermalBurns(player, world, effectiveDt);

  // 4. Update ground items in the surrounding environment
  // Optimized spatial culling: only update items within 1200px of player or unstable items
  if (world.groundItems && world.groundItems.length > 0) {
    const px = player.x;
    const py = player.y;

    for (let i = 0; i < world.groundItems.length; i++) {
      const gItem = world.groundItems[i];
      if (!gItem || !gItem.item) continue;

      const dist = Math.hypot(gItem.x - px, gItem.y - py);
      // Skip far items if already at thermal equilibrium
      if (dist > 1200 && gItem.item.isThermalStable) {
        continue;
      }

      // Check for proximity to fire stains on ground
      let groundAmbient = outsideTemp;
      if (world.stains && world.stains.length > 0) {
        for (const stain of world.stains) {
          if (stain.onFire) {
            const sDist = Math.hypot(gItem.x - stain.x, gItem.y - stain.y);
            if (sDist < stain.radius + 60) {
              const fireProximity = 1.0 - (sDist / (stain.radius + 60));
              const fireHeat = 50.0 + fireProximity * 150.0; // 50°C to 200°C
              if (fireHeat > groundAmbient) {
                groundAmbient = fireHeat;
              }
            }
          }
        }
      }

      // Rain wetting for ground items outdoors
      const isRaining = world.weather === 'rain' || world.weather === 'storm';
      if (isRaining && gItem.item.category === 'clothing') {
        const waterResist = gItem.item.clothingStats?.waterResistance ?? 0;
        const wetRate = Math.max(0.5, 4.0 - waterResist * 0.04);
        gItem.item.wetness = Math.min(100, (gItem.item.wetness || 0) + wetRate * effectiveDt);
        if (gItem.item.clothingStats) {
          gItem.item.clothingStats.wetness = gItem.item.wetness;
        }
      }

      updateItemThermodynamics(gItem.item, groundAmbient, effectiveDt);
    }
  }
}

/**
 * Returns formatted thermal metrics and hazard labels for UI inspection
 */
export function getItemThermalDisplayInfo(item: InventoryItem | null | undefined): {
  coreTempText: string;
  surfaceTempText: string;
  heatLossText: string;
  retentionText: string;
  ambientTempText: string;
  hazardBadge: { text: string; bgClass: string; textClass: string; borderClass: string } | null;
  tempColorClass: string;
} {
  if (!item) {
    return {
      coreTempText: '20.0°C',
      surfaceTempText: '20.0°C',
      heatLossText: '4.0%/с',
      retentionText: '35%',
      ambientTempText: '20.0°C',
      hazardBadge: null,
      tempColorClass: 'text-[#9ba3af]'
    };
  }

  const core = item.temperature ?? 20.0;
  const surface = item.surfaceTemperature ?? calculateSurfaceTemperature(core, item.ambientTemperature ?? 20.0, item.heatRetention ?? 0.35);
  const loss = (item.heatLossRate ?? 0.04) * 100;
  const retention = Math.round((item.heatRetention ?? 0.35) * 100);
  const ambient = item.ambientTemperature ?? 20.0;

  let tempColorClass = 'text-[#cbd5e1]';
  let hazardBadge = null;

  if (surface >= 68.0) {
    tempColorClass = 'text-red-400 font-black';
    hazardBadge = {
      text: 'Раскаленный (Ожог!)',
      bgClass: 'bg-red-950/90',
      textClass: 'text-red-300',
      borderClass: 'border-red-600'
    };
  } else if (surface >= 52.0) {
    tempColorClass = 'text-amber-400 font-bold';
    hazardBadge = {
      text: 'Горячо (Опасно)',
      bgClass: 'bg-amber-950/90',
      textClass: 'text-amber-300',
      borderClass: 'border-amber-600'
    };
  } else if (surface >= 42.0) {
    tempColorClass = 'text-orange-300 font-medium';
    hazardBadge = {
      text: 'Тёплый',
      bgClass: 'bg-orange-950/60',
      textClass: 'text-orange-300',
      borderClass: 'border-orange-700/60'
    };
  } else if (surface <= 4.0) {
    tempColorClass = 'text-sky-300 font-medium';
    hazardBadge = {
      text: 'Холодный',
      bgClass: 'bg-sky-950/80',
      textClass: 'text-sky-300',
      borderClass: 'border-sky-700/60'
    };
  }

  return {
    coreTempText: `${core > 0 ? '+' : ''}${core.toFixed(1)}°C`,
    surfaceTempText: `${surface > 0 ? '+' : ''}${surface.toFixed(1)}°C`,
    heatLossText: `${loss.toFixed(1)}%/с`,
    retentionText: `${retention}%`,
    ambientTempText: `${ambient > 0 ? '+' : ''}${ambient.toFixed(1)}°C`,
    hazardBadge,
    tempColorClass
  };
}

function applyDryCookingIfHot(item: InventoryItem, mode: 'burner' | 'oven'): void {
  if (!item) return;
  // Recurse into dry containers (e.g. pan or baking tray without water)
  const hasLiquid = Boolean(item.fluidStorage && (item.fluidStorage.currentMl || 0) > 10);
  if (item.contents && item.contents.length > 0 && !hasLiquid) {
    for (const child of item.contents) {
      if (child) applyDryCookingIfHot(child, mode);
    }
  }
  if (item.category !== 'food') return;
  const temp = item.temperature ?? 20;
  if (temp < 85.0) return;

  const curState = item.attributes?.stateNameRu;
  const alreadyCooked =
    curState === 'Варёный' ||
    curState === 'Жареный' ||
    curState === 'Запечённый' ||
    item.attributes?.state === 'boiled' ||
    item.attributes?.state === 'fried' ||
    item.attributes?.state === 'baked';
  if (alreadyCooked) return;

  const isOven = mode === 'oven';
  item.attributes = {
    ...(item.attributes || {}),
    state: isOven ? 'baked' : 'fried',
    stateNameRu: isOven ? 'Запечённый' : 'Жареный',
    preparationMethod: isOven ? 'Запечено в духовке' : 'Обжарено на плите',
  };
  if (item.effects && typeof item.effects.hunger === 'number') {
    item.effects.hunger = Math.round(item.effects.hunger * 1.18);
  }
}

/**
 * Advances thermodynamics for a single gas stove (4 independent burners + 1 unified oven chamber)
 * over `dt` seconds. Handles heating when gas is ON, cooling when gas is OFF, boiling liquid
 * vessels around 100°C, and dry baking/frying raw foods at >= 85°C.
 */
export function tickStoveStateThermodynamics(
  stoveState: {
    burners: Array<{ item: InventoryItem | null; gasOn: boolean; temperature: number; lastUpdatedSec?: number }>;
    oven: { items: InventoryItem[]; gasOn: boolean; temperature: number; lastUpdatedSec?: number };
  },
  dt: number,
  nowSec: number = Date.now() / 1000
): boolean {
  if (!stoveState || dt <= 0) return false;
  const clampedDt = Math.min(dt, 3600);
  const ambientRoom = 21.0;
  let changed = false;

  // 1. Four independent gas burners
  for (let i = 0; i < stoveState.burners.length; i++) {
    const b = stoveState.burners[i];
    if (!b) continue;
    const targetTemp = b.gasOn ? 215.0 : ambientRoom;
    const rate = b.gasOn ? 0.085 : 0.025; // Heats up briskly under open gas flame, cools steadily
    const prevTemp = typeof b.temperature === 'number' ? b.temperature : ambientRoom;
    const nextTemp = targetTemp + (prevTemp - targetTemp) * Math.exp(-rate * clampedDt);
    const roundedTemp = Math.round(nextTemp * 10) / 10;
    if (Math.abs(roundedTemp - prevTemp) >= 0.1) {
      b.temperature = roundedTemp;
      changed = true;
    }
    b.lastUpdatedSec = nowSec;

    if (b.item) {
      const hasWater = Boolean(b.item.fluidStorage && (b.item.fluidStorage.currentMl || 0) > 10);
      // Liquid-filled pots/kettles plateau smoothly near boiling (~100°C); dry cookware/food heats higher
      const effectiveTarget = hasWater ? Math.min(b.temperature, 102.0) : Math.min(b.temperature, 185.0);
      // Direct flame contact transfers heat faster than passive room air
      const contactMultiplier = b.gasOn ? 2.6 : 1.0;
      if (updateItemThermodynamics(b.item, effectiveTarget, clampedDt * contactMultiplier)) {
        changed = true;
      }
      if (b.gasOn && b.temperature >= 90) {
        applyDryCookingIfHot(b.item, 'burner');
      }
    }
  }

  // 2. Unified gas oven chamber
  const oven = stoveState.oven;
  if (oven) {
    const targetOven = oven.gasOn ? 195.0 : ambientRoom;
    const ovenRate = oven.gasOn ? 0.045 : 0.015; // Insulated oven heats slightly slower & holds heat longer
    const prevOven = typeof oven.temperature === 'number' ? oven.temperature : ambientRoom;
    const nextOven = targetOven + (prevOven - targetOven) * Math.exp(-ovenRate * clampedDt);
    const roundedOven = Math.round(nextOven * 10) / 10;
    if (Math.abs(roundedOven - prevOven) >= 0.1) {
      oven.temperature = roundedOven;
      changed = true;
    }
    oven.lastUpdatedSec = nowSec;

    if (oven.items && oven.items.length > 0) {
      for (const item of oven.items) {
        if (!item) continue;
        const hasWater = Boolean(item.fluidStorage && (item.fluidStorage.currentMl || 0) > 10);
        const effectiveTarget = hasWater ? Math.min(oven.temperature, 100.0) : oven.temperature;
        const ovenTransfer = oven.gasOn ? 1.8 : 1.0;
        if (updateItemThermodynamics(item, effectiveTarget, clampedDt * ovenTransfer)) {
          changed = true;
        }
        if (oven.gasOn && oven.temperature >= 90) {
          applyDryCookingIfHot(item, 'oven');
        }
      }
    }
  }

  return changed;
}

/**
 * Synchronizes thermodynamics for all items stored inside a furniture container
 * (e.g. refrigerator at +4°C, pantry counter at +21°C, gas stove with 4 burners & oven).
 * Uses exact analytical time-delta catching up so when a player returns after a long walk,
 * items inside have cooled or heated realistically according to the exact elapsed time!
 */
export function syncFurnitureStorageThermodynamics(
  storage: {
    furnitureType: string;
    items: InventoryItem[];
    stoveState?: {
      burners: Array<{ item: InventoryItem | null; gasOn: boolean; temperature: number; lastUpdatedSec?: number }>;
      oven: { items: InventoryItem[]; gasOn: boolean; temperature: number; lastUpdatedSec?: number };
    };
  },
  currentTimeSec: number = Date.now() / 1000
): void {
  if (!storage) return;

  // Gas stove uses per-burner and oven gas states instead of a fixed ambient temperature
  if (storage.furnitureType === 'stove' && storage.stoveState) {
    const st = storage.stoveState;
    const refSec =
      st.oven?.lastUpdatedSec ??
      st.burners.find(b => typeof b?.lastUpdatedSec === 'number')?.lastUpdatedSec ??
      currentTimeSec;
    const elapsedDt = Math.max(0, currentTimeSec - refSec);
    if (elapsedDt > 0.1) {
      tickStoveStateThermodynamics(st, elapsedDt, currentTimeSec);
    }
    return;
  }

  if (!storage.items || storage.items.length === 0) return;

  // Determine internal temperature of the furniture container
  let containerAmbient = 21.0; // Standard room temperature
  if (storage.furnitureType === 'fridge') {
    containerAmbient = 4.0; // Refrigerator chamber (+4°C)
  } else if (storage.furnitureType === 'freezer') {
    containerAmbient = -18.0; // Deep freeze chamber (-18°C)
  } else if (storage.furnitureType === 'radiator') {
    containerAmbient = 65.0; // Hot heating radiator surface (+65°C)
  }

  for (const item of storage.items) {
    if (!item) continue;
    const lastUpdate = item.lastThermalUpdate ?? currentTimeSec;
    const elapsedDt = Math.max(0, currentTimeSec - lastUpdate);
    if (elapsedDt > 0 || !item.isThermalStable) {
      updateItemThermodynamics(item, containerAmbient, elapsedDt > 0 ? elapsedDt : 0.5);
    }
  }
}

/**
 * Processes thermal sensations, oral burns, brain freeze, and body temperature changes
 * when eating or drinking an item or fluid.
 */
export function applyConsumptionThermodynamics(
  player: Player,
  itemOrLiquidTemp: number,
  itemLabel: string,
  isDrink: boolean = false
): void {
  if (!player) return;
  const temp = itemOrLiquidTemp;
  const bs = player.bodyState;

  // 1. Scalding Hot Consumption (T >= 60°C)
  if (temp >= 60.0) {
    const isVeryHot = temp >= 75.0;
    const isExtremelyHot = temp >= 82.0;

    // Head / oral cavity burn damage
    if (bs) {
      const burnSeverity = isExtremelyHot ? 25 : (isVeryHot ? 16 : 8);
      const burnDegree = isVeryHot ? 2 : 1;
      addInjuryToPart(bs, 'head', 'burn', burnSeverity, burnDegree);

      // Warm up internal core temperature slightly
      bs.temperature = Math.min(39.5, bs.temperature + (isVeryHot ? 0.25 : 0.15));
    }

    sound.playHurt();
    sound.playGroan();

    const tempRound = Math.round(temp);
    if (isExtremelyHot) {
      addPlayerNotification(
        player,
        `Ой! Раскаленный ${isDrink ? 'напиток' : 'кусок'} «${itemLabel}» (${tempRound}°C) жестоко обжег язык, нёбо и пищевод!`,
        'warning'
      );
    } else if (isVeryHot) {
      addPlayerNotification(
        player,
        `Горячий ${isDrink ? 'напиток' : 'продукт'} «${itemLabel}» (${tempRound}°C) обжигает рот и горло!`,
        'warning'
      );
    } else {
      addPlayerNotification(
        player,
        `Обжигающе горячий ${isDrink ? 'глоток' : 'кусочек'} «${itemLabel}» (${tempRound}°C) согревает изнутри, но щиплет язык.`,
        'info'
      );
    }
  }
  // 2. Freezing Cold / Deep Freeze Consumption (T <= 0°C)
  else if (temp <= 0.0) {
    const isDeepFreeze = temp <= -5.0;

    if (bs) {
      // Brain freeze / spastic pain shock in head
      bs.painLevel = Math.min(100, bs.painLevel + (isDeepFreeze ? 22 : 12));
      // Cool down internal core temperature
      bs.temperature = Math.max(34.0, bs.temperature - (isDeepFreeze ? 0.35 : 0.20));
      // Trigger slight shivering if player was already cool
      if (bs.temperature < 36.5) {
        bs.shiverIntensity = Math.min(1.0, (bs.shiverIntensity || 0) + 0.3);
      }
    }

    sound.playHurt();

    const tempRound = Math.round(temp);
    if (isDeepFreeze) {
      addPlayerNotification(
        player,
        `Ледяной «${itemLabel}» (${tempRound}°C)! От дикого холода ломит зубы и виски свело резкой судорогой (Brain Freeze)!`,
        'warning'
      );
    } else {
      addPlayerNotification(
        player,
        `Ледяной «${itemLabel}» (${tempRound}°C) обжигает холодом нёбо и горло, резко охлаждая изнутри!`,
        'info'
      );
    }
  }
  // 3. Chilled Beverage / Refreshing Cold (0°C < T <= 6°C)
  else if (temp <= 6.0) {
    if (bs) {
      // Refreshing internal cooling
      bs.temperature = Math.max(35.5, bs.temperature - 0.1);
    }
    const tempRound = Math.round(temp);
    addPlayerNotification(
      player,
      `Холодный «${itemLabel}» (+${tempRound}°C) приятно освежает горло и сбивает внутренний жар.`,
      'heal'
    );
  }
}


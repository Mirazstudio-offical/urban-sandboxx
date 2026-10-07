import { GameWorld, GroundItem, InventoryItem, ItemCategory, Player } from './types';
import { sound } from './audio';
import { addPlayerNotification, getItemTotalWeight, takeItemFromHand, getSlotCompartment } from './items';
import { addInjuryToPart } from './bodySystem';
import { getOutsideTemperature } from './physics';

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
  hot_coffee: {
    temperature: 82.0,
    heatLossRate: 0.0035,
    heatRetention: 0.35, // Disposable paper cup conducts significant heat to the outer surface
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
  pizza_slice: {
    temperature: 72.0,
    heatLossRate: 0.0040,
    heatRetention: 0.28,
    surfaceTemperature: 57.5
  },
  burger: {
    temperature: 68.0,
    heatLossRate: 0.0030,
    heatRetention: 0.35,
    surfaceTemperature: 51.0
  },
  hot_dog: {
    temperature: 70.0,
    heatLossRate: 0.0032,
    heatRetention: 0.32,
    surfaceTemperature: 54.0
  },
  french_fries: {
    temperature: 74.0,
    heatLossRate: 0.0045,
    heatRetention: 0.25,
    surfaceTemperature: 60.0
  },
  nuggets: {
    temperature: 72.0,
    heatLossRate: 0.0038,
    heatRetention: 0.30,
    surfaceTemperature: 56.0
  },
  wok_box: {
    temperature: 76.0,
    heatLossRate: 0.0028,
    heatRetention: 0.40,
    surfaceTemperature: 53.0
  },
  shawarma: {
    temperature: 72.0,
    heatLossRate: 0.0028,
    heatRetention: 0.38,
    surfaceTemperature: 52.0
  },
  pie_meat: {
    temperature: 75.0,
    heatLossRate: 0.0030,
    heatRetention: 0.35,
    surfaceTemperature: 56.0
  },
  cheburek: {
    temperature: 76.0,
    heatLossRate: 0.0032,
    heatRetention: 0.32,
    surfaceTemperature: 58.0
  },
  samsa: {
    temperature: 75.0,
    heatLossRate: 0.0030,
    heatRetention: 0.35,
    surfaceTemperature: 56.0
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
  carton_milk: {
    temperature: 3.5,
    heatLossRate: 0.0022,
    heatRetention: 0.35,
    surfaceTemperature: 5.0
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
  sushi_set: {
    temperature: 8.0,
    heatLossRate: 0.0030,
    heatRetention: 0.30,
    surfaceTemperature: 9.0
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
  ice_cream: {
    temperature: -12.0,
    heatLossRate: 0.0028,
    heatRetention: 0.30,
    surfaceTemperature: -9.0
  },
  milkshake: {
    temperature: -3.0,
    heatLossRate: 0.0035,
    heatRetention: 0.32,
    surfaceTemperature: -1.5
  },
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
 * Retrieves default thermal properties for a given item ID or category
 */
export function getItemThermalDefaults(itemId: string, category: ItemCategory = 'misc'): ItemThermalConfig {
  const specific = ITEM_THERMAL_CONFIGS[itemId];
  const catDefault = CATEGORY_THERMAL_DEFAULTS[category] || CATEGORY_THERMAL_DEFAULTS.misc;

  return {
    temperature: specific?.temperature,
    heatLossRate: specific?.heatLossRate ?? catDefault.heatLossRate,
    heatRetention: specific?.heatRetention ?? catDefault.heatRetention,
    surfaceTemperature: specific?.surfaceTemperature
  };
}

/**
 * Initializes thermal attributes on an item if not yet set
 */
export function initItemThermalProperties(item: InventoryItem, ambientTemp: number = 20.0): void {
  const defaults = getItemThermalDefaults(item.itemId, item.category);

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

  // Optimization: If item is already at thermal equilibrium with the environment, skip math
  const deltaFromEnv = Math.abs(core - ambientTemp);
  if (deltaFromEnv < 0.2 && item.isThermalStable) {
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

  // Wetness drying & moisture dissipation on garments and fabrics
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
    if (item.clothingStats) {
      item.clothingStats.wetness = item.wetness;
    }
  }

  // Recursively update contained items if container exists (e.g., bag in bag, box in bag)
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
  }

  return true;
}

// Throttling for audio/notifications
let lastDropSoundTime = 0;
let lastBurnNotifTime = 0;

/**
 * Evaluates thermal contact between hot/cold items and player body parts.
 * Triggers burns, pain pulses, diegetic sensations, and involuntary drop reflexes.
 */
export function processPlayerItemThermalBurns(
  player: Player,
  world: GameWorld,
  dt: number
): void {
  if (!player || player.isInvincible || player.isCleanMode || !player.bodyState) return;

  const bs = player.bodyState;
  const now = Date.now() / 1000;

  // Helper to apply localized thermal injury
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

  // Helper to handle involuntary drop reflex for scorching hand items
  const checkHandInvoluntaryDrop = (hand: 'left' | 'right', item: InventoryItem | null | undefined) => {
    if (!item) return;
    const surfaceTemp = item.surfaceTemperature ?? item.temperature ?? 20;

    // 1. Scalding heat: involuntary drop reflex! (T >= 68°C)
    // First-principles human physiology: bare hand involuntarily opens from excruciating pain
    if (surfaceTemp >= 68.0) {
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
    if (surfaceTemp >= 52.0) {
      const partKey = hand === 'left' ? 'leftArm' : 'rightArm';
      const handName = hand === 'left' ? 'ладонь левой руки' : 'ладонь правой руки';
      applyContactBurn(partKey, item, surfaceTemp, handName);
    }
  };

  // 1. Hands check
  checkHandInvoluntaryDrop('left', player.leftHandItem);
  checkHandInvoluntaryDrop('right', player.rightHandItem);

  // 2. Inventory slots check (Pockets & Compartments)
  if (player.inventory) {
    for (let slotIdx = 0; slotIdx < player.inventory.length; slotIdx++) {
      const item = player.inventory[slotIdx];
      if (!item) continue;

      const surfaceTemp = item.surfaceTemperature ?? item.temperature ?? 20;
      if (surfaceTemp < 50.0) continue; // Below burn threshold

      const slotInfo = getSlotCompartment(player, slotIdx);
      if (!slotInfo) continue;

      const compId = slotInfo.compartment.id;

      if (compId === 'legs') {
        // Trouser / Jeans pocket: conducts directly to thighs/legs
        const legPart = slotIdx % 2 === 0 ? 'leftLeg' : 'rightLeg';
        applyContactBurn(legPart, item, surfaceTemp, 'бедро через карман брюк');
      } else if (compId === 'torso') {
        // Jacket / Hoodie / Shirt pocket: conducts directly to chest
        applyContactBurn('torso', item, surfaceTemp, 'грудь через карман куртки');
      } else if (compId === 'base') {
        // Inner baseline pocket / belt: conducts to torso
        applyContactBurn('torso', item, surfaceTemp, 'тело через внутренний карман');
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

/**
 * Synchronizes thermodynamics for all items stored inside a furniture container
 * (e.g. refrigerator at +4°C, pantry counter at +21°C).
 * Uses exact analytical time-delta catching up so when a player returns after a long walk,
 * items inside have cooled or heated realistically according to the exact elapsed time!
 */
export function syncFurnitureStorageThermodynamics(
  storage: { furnitureType: string; items: InventoryItem[] },
  currentTimeSec: number = Date.now() / 1000
): void {
  if (!storage || !storage.items || storage.items.length === 0) return;

  // Determine internal temperature of the furniture container
  let containerAmbient = 21.0; // Standard room temperature
  if (storage.furnitureType === 'fridge') {
    containerAmbient = 4.0; // Refrigerator chamber (+4°C)
  } else if (storage.furnitureType === 'freezer') {
    containerAmbient = -18.0; // Deep freeze chamber (-18°C)
  } else if (storage.furnitureType === 'radiator') {
    containerAmbient = 65.0; // Hot heating radiator surface (+65°C)
  } else if (storage.furnitureType === 'stove') {
    containerAmbient = 95.0; // Cooking stovetop / oven surface (+95°C)
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


import { FuelType, GameWorld, GasPumpDispenser, GasPumpNozzle, Player, Vehicle } from './types';
import { sound } from './audio';
import { createItem, addPlayerNotification } from './items';

export interface FuelGradeInfo {
  fuelType: FuelType;
  nameRu: string;
  badgeText: string;
  color: string;
  gradient: string;
  octane: number;
  pricePerLiter: number;
  description: string;
  engineCompatibility: string;
  accentGlow: string;
}

export const FUEL_GRADES: Record<FuelType, FuelGradeInfo> = {
  ai92: {
    fuelType: 'ai92',
    nameRu: 'АИ-92 Регуляр',
    badgeText: 'АИ-92',
    color: '#eab308',
    gradient: 'from-amber-500 to-yellow-600',
    octane: 92,
    pricePerLiter: 52.90,
    description: 'Базовый бензин стандарта ГОСТ для карбюраторных и атмосферных двигателей.',
    engineCompatibility: 'ВАЗ, Нива, УАЗ, Волга, классика',
    accentGlow: 'rgba(234, 179, 8, 0.4)'
  },
  ai95: {
    fuelType: 'ai95',
    nameRu: 'АИ-95 Евро-5',
    badgeText: 'АИ-95',
    color: '#22c55e',
    gradient: 'from-emerald-500 to-green-600',
    octane: 95,
    pricePerLiter: 58.40,
    description: 'Оптимальное топливо с пакетом моющих присадок для современных инжекторных авто.',
    engineCompatibility: 'Седаны, хэтчбеки, кроссоверы, такси',
    accentGlow: 'rgba(34, 197, 94, 0.4)'
  },
  ai98: {
    fuelType: 'ai98',
    nameRu: 'АИ-98 Супер',
    badgeText: 'АИ-98',
    color: '#f97316',
    gradient: 'from-orange-500 to-amber-600',
    octane: 98,
    pricePerLiter: 65.50,
    description: 'Высокооктановый бензин повышенной детонационной стойкости для турбомоторов.',
    engineCompatibility: 'Турбированные седаны, спорткары',
    accentGlow: 'rgba(249, 115, 22, 0.4)'
  },
  ai100: {
    fuelType: 'ai100',
    nameRu: 'АИ-100 Спорт Рейсинг',
    badgeText: 'АИ-100',
    color: '#ef4444',
    gradient: 'from-rose-500 to-red-600',
    octane: 100,
    pricePerLiter: 69.80,
    description: 'Премиальное гоночное топливо 100 октана для максимальной отдачи и динамики.',
    engineCompatibility: 'Спорткупе, маслкары, тюнинг-кары',
    accentGlow: 'rgba(239, 68, 68, 0.45)'
  },
  diesel: {
    fuelType: 'diesel',
    nameRu: 'ДТ Зимнее Ультра',
    badgeText: 'ДТ',
    color: '#475569',
    gradient: 'from-slate-600 to-slate-800',
    octane: 55,
    pricePerLiter: 64.50,
    description: 'Очищенное дизельное топливо с низкотемпературными депрессорными присадками.',
    engineCompatibility: 'Внедорожники, фургоны, грузовики, автобусы',
    accentGlow: 'rgba(100, 116, 139, 0.4)'
  },
  lpg: {
    fuelType: 'lpg',
    nameRu: 'ГАЗ (Пропан-Бутан / LPG)',
    badgeText: 'ГАЗ',
    color: '#0ea5e9',
    gradient: 'from-sky-500 to-cyan-600',
    octane: 105,
    pricePerLiter: 32.20,
    description: 'Сжиженный углеводородный газ высокой чистоты для автомобилей с ГБО.',
    engineCompatibility: 'Газобаллонное оборудование (ГБО 4-6)',
    accentGlow: 'rgba(14, 165, 233, 0.4)'
  }
};

export const GAS_STATION_NOZZLES: GasPumpNozzle[] = [
  {
    fuelType: 'ai92',
    nameRu: FUEL_GRADES.ai92.nameRu,
    color: FUEL_GRADES.ai92.color,
    octane: 92,
    pricePerLiter: FUEL_GRADES.ai92.pricePerLiter,
    description: FUEL_GRADES.ai92.description,
    badgeText: '92'
  },
  {
    fuelType: 'ai95',
    nameRu: FUEL_GRADES.ai95.nameRu,
    color: FUEL_GRADES.ai95.color,
    octane: 95,
    pricePerLiter: FUEL_GRADES.ai95.pricePerLiter,
    description: FUEL_GRADES.ai95.description,
    badgeText: '95'
  },
  {
    fuelType: 'ai98',
    nameRu: FUEL_GRADES.ai98.nameRu,
    color: FUEL_GRADES.ai98.color,
    octane: 98,
    pricePerLiter: FUEL_GRADES.ai98.pricePerLiter,
    description: FUEL_GRADES.ai98.description,
    badgeText: '98'
  },
  {
    fuelType: 'ai100',
    nameRu: FUEL_GRADES.ai100.nameRu,
    color: FUEL_GRADES.ai100.color,
    octane: 100,
    pricePerLiter: FUEL_GRADES.ai100.pricePerLiter,
    description: FUEL_GRADES.ai100.description,
    badgeText: '100'
  },
  {
    fuelType: 'diesel',
    nameRu: FUEL_GRADES.diesel.nameRu,
    color: FUEL_GRADES.diesel.color,
    octane: 55,
    pricePerLiter: FUEL_GRADES.diesel.pricePerLiter,
    description: FUEL_GRADES.diesel.description,
    badgeText: 'ДТ'
  }
];

export const GAS_STATION_CONFIG = {
  shopId: 'bld_gas_station_shop_se',
  canopyId: 'bld_gas_station_canopy_se',
  shopX: 5240,
  shopY: 4910,
  shopW: 220,
  shopH: 130,
  canopyX: 4950,
  canopyY: 5160,
  canopyW: 260,
  canopyH: 230,
  priceTotemX: 4880,
  priceTotemY: 4880,
  cashierDesk: {
    x: 5300,
    y: 4965,
    radius: 45
  },
  // 5 Gas pump locations (4 under canopy, 1 separate old LPG pump)
  pumps: [
    { id: 'gas_pump_1', number: 1, x: 5020, y: 5220, angle: 0, islandIndex: 0, lane: 'north' },
    { id: 'gas_pump_2', number: 2, x: 5020, y: 5340, angle: 0, islandIndex: 0, lane: 'south' },
    { id: 'gas_pump_3', number: 3, x: 5160, y: 5220, angle: 0, islandIndex: 1, lane: 'north' },
    { id: 'gas_pump_4', number: 4, x: 5160, y: 5340, angle: 0, islandIndex: 1, lane: 'south' },
    { id: 'gas_pump_5_lpg', number: 5, x: 5085, y: 4940, angle: 0, islandIndex: 2, lane: 'west' }
  ]
};

export function createDefaultGasPumps(): GasPumpDispenser[] {
  return GAS_STATION_CONFIG.pumps.map(p => {
    const isLpg = p.id === 'gas_pump_5_lpg';
    const nozzles = isLpg
      ? [
          {
            fuelType: 'lpg',
            nameRu: FUEL_GRADES.lpg.nameRu,
            color: FUEL_GRADES.lpg.color,
            octane: 105,
            pricePerLiter: FUEL_GRADES.lpg.pricePerLiter,
            description: FUEL_GRADES.lpg.description,
            badgeText: 'ГАЗ'
          } as GasPumpNozzle
        ]
      : [...GAS_STATION_NOZZLES];

    return {
      id: p.id,
      pumpNumber: p.number,
      x: p.x,
      y: p.y,
      angle: p.angle,
      nozzles: nozzles,
      nozzleTaken: null,
      connectedVehicleId: null,
      connectedFuelType: null,
      isPumping: false,
      targetLiters: 0,
      currentPumpedLiters: 0,
      pricePerLiter: isLpg ? FUEL_GRADES.lpg.pricePerLiter : 58.40,
      totalPaid: 0,
      status: 'idle',
      pumpingTimer: 0,
      displayLiters: 0,
      displayCost: 0,
      hoseOrigin: { x: p.x, y: p.y }
    };
  });
}

export function getNearbyGasPump(
  x: number,
  y: number,
  world: GameWorld,
  radius: number = 55
): GasPumpDispenser | null {
  if (!world.gasPumps || world.gasPumps.length === 0) return null;
  let closest: GasPumpDispenser | null = null;
  let minDist = radius;

  for (const pump of world.gasPumps) {
    const dist = Math.hypot(x - pump.x, y - pump.y);
    if (dist < minDist) {
      minDist = dist;
      closest = pump;
    }
  }
  return closest;
}

export function getNearbyVehicleForFueling(
  x: number,
  y: number,
  world: GameWorld,
  radius: number = 75
): Vehicle | null {
  if (!world.vehicles || world.vehicles.length === 0) return null;
  let closest: Vehicle | null = null;
  let minDist = radius;

  for (const veh of world.vehicles) {
    // Calculate precise fuel cap position (rear-right quarter)
    const capOffsetDist = -veh.length * 0.35;
    const capOffsetSide = veh.width * 0.45;
    const capX = veh.x + Math.cos(veh.angle) * capOffsetDist - Math.sin(veh.angle) * capOffsetSide;
    const capY = veh.y + Math.sin(veh.angle) * capOffsetDist + Math.cos(veh.angle) * capOffsetSide;

    const dist = Math.hypot(x - capX, y - capY);
    if (dist < minDist) {
      minDist = dist;
      closest = veh;
    }
  }
  return closest;
}

export function isPlayerNearGasStationCashier(player: Player, world: GameWorld): boolean {
  // If player is inside the gas station shop building
  if (player.isInsideBuilding && player.insideBuildingId === GAS_STATION_CONFIG.shopId) {
    return true;
  }
  // Or if player is near the cashier desk coordinates
  const dist = Math.hypot(player.x - GAS_STATION_CONFIG.cashierDesk.x, player.y - GAS_STATION_CONFIG.cashierDesk.y);
  if (dist <= GAS_STATION_CONFIG.cashierDesk.radius) {
    return true;
  }
  return false;
}

/**
 * Player picks up a fuel nozzle from the pump dispenser.
 */
export function takePumpNozzle(
  player: Player,
  pump: GasPumpDispenser,
  fuelType: FuelType
): boolean {
  if (pump.nozzleTaken !== null && pump.status !== 'idle') {
    return false;
  }
  const grade = FUEL_GRADES[fuelType] || FUEL_GRADES.ai95;
  pump.nozzleTaken = fuelType;
  pump.status = 'nozzle_held';
  pump.pricePerLiter = grade.pricePerLiter;

  player.heldFuelNozzle = {
    pumpId: pump.id,
    fuelType: fuelType,
    color: grade.color,
    nameRu: grade.nameRu,
    pricePerLiter: grade.pricePerLiter,
    hoseOrigin: { x: pump.x, y: pump.y }
  };

  sound.playUseItem();
  return true;
}

/**
 * Player inserts held fuel nozzle into nearby vehicle's fuel filler tank.
 */
export function insertNozzleIntoVehicle(
  player: Player,
  vehicle: Vehicle,
  pump: GasPumpDispenser,
  world?: GameWorld
): boolean {
  if (!player.heldFuelNozzle || player.heldFuelNozzle.pumpId !== pump.id) {
    return false;
  }

  const fuelType = player.heldFuelNozzle.fuelType;
  const isLpgNozzle = fuelType === 'lpg';
  const isLpgVehicle = vehicle.hasGBO === true;

  if (isLpgNozzle !== isLpgVehicle) {
    // Incompatible physical check!
    // @ts-ignore
    if (player.lastNozzleForceId !== vehicle.id) {
      // @ts-ignore
      player.lastNozzleForceId = vehicle.id;
      const msg = isLpgNozzle
        ? "Пистолет ГАЗ (LPG) физически не влезает в бензиновую/дизельную горловину! На автомобиле не установлено ГБО. Нажмите еще раз, чтобы вставить силой на свой страх и риск!"
        : "Бензиновый/дизельный пистолет физически не подходит к заправочному устройству ГБО! Нажмите еще раз, чтобы вставить силой на свой страх и риск!";
      addPlayerNotification(player, msg, "warning");
      return false;
    } else {
      // Force insert! Reset the force tracker
      // @ts-ignore
      player.lastNozzleForceId = undefined;
      
      if (isLpgNozzle) {
        addPlayerNotification(player, "Вы насильно вставили пистолет LPG в обычную горловину! Сжиженный газ начал под давлением брызгать наружу!", "warning");
        
        // Gloves cold protection check
        const hasGloves = player.equippedClothing?.hands?.outerwear?.itemId === 'gloves_winter' || 
                          player.equippedClothing?.hands?.outerwear?.itemId === 'gloves_leather';
        if (!hasGloves) {
          player.needs.health = Math.max(1, player.needs.health - 15);
          if (!player.bodyState) player.bodyState = { painLevel: 0 } as any;
          player.bodyState.painLevel = Math.min(100, (player.bodyState.painLevel || 0) + 30);
          addPlayerNotification(player, "ОЙ! Ледяной жидкий пропан мгновенно обжег ваши руки (-15 HP, +30 боли)! Наденьте теплые перчатки перед работой с LPG.", "warning");
        } else {
          addPlayerNotification(player, "Благодаря теплым перчаткам вы уберегли руки от обморожения ледяным газом!", "heal");
        }

        // Create a massive gas/fuel leak stain on the ground
        if (world) {
          if (!world.stains) world.stains = [];
          world.stains.push({
            id: 'gas_leak_' + Date.now(),
            x: vehicle.x,
            y: vehicle.y,
            radius: 50,
            maxRadius: 80,
            type: 'fuel',
            alpha: 0.85,
            life: 0,
            maxLife: 300,
            amount: 1.0,
            color: 'rgba(224, 242, 254, 0.4)' // transparent cold icy stain appearance
          } as any);

          // Puncture tank so it leaks out!
          if (vehicle.fuelSystem) {
            vehicle.fuelSystem.tankPunctured = true;
          }
        }

        // Fire explosion check
        if (vehicle.engineState?.engineRunning) {
          if (!vehicle.damage) vehicle.damage = {} as any;
          vehicle.damage.engineFire = true;
          vehicle.damage.fuelTankFire = true;
          addPlayerNotification(player, "ВСПЫШКА! Вырывающийся газ мгновенно сдетонировал от искры работающего двигателя! Машина охвачена пламенем!", "warning");
        }
      } else {
        // Petrol/diesel into gas vehicle
        addPlayerNotification(player, "Вы силой втиснули пистолет в ГБО. Жидкое топливо начало проливаться наружу!", "warning");
        if (world) {
          if (!world.stains) world.stains = [];
          world.stains.push({
            id: 'fuel_spill_' + Date.now(),
            x: vehicle.x,
            y: vehicle.y,
            radius: 40,
            maxRadius: 75,
            type: 'fuel',
            alpha: 0.85,
            life: 0,
            maxLife: 300,
            amount: 1.0
          } as any);
        }
      }
    }
  } else {
    // Compatible, reset tracker
    // @ts-ignore
    player.lastNozzleForceId = undefined;
  }

  pump.connectedVehicleId = vehicle.id;
  pump.connectedFuelType = fuelType;
  pump.status = 'inserted';

  vehicle.fuelingState = {
    pumpId: pump.id,
    fuelType: fuelType,
    nozzleInTank: true,
    hoseOrigin: { x: pump.x, y: pump.y }
  };

  player.heldFuelNozzle = null;
  sound.playUseItem();
  return true;
}

/**
 * Player removes fuel nozzle from vehicle back into hands.
 */
export function removeNozzleFromVehicle(
  player: Player,
  vehicle: Vehicle,
  pump: GasPumpDispenser,
  world?: GameWorld
): boolean {
  if (!vehicle.fuelingState || vehicle.fuelingState.pumpId !== pump.id) {
    return false;
  }

  const fuelType = vehicle.fuelingState.fuelType;
  const grade = FUEL_GRADES[fuelType] || FUEL_GRADES.ai95;

  // Realism trigger for LPG when disconnecting
  if (fuelType === 'lpg') {
    const hasGloves = player.equippedClothing?.hands?.outerwear?.itemId === 'gloves_winter' || 
                      player.equippedClothing?.hands?.outerwear?.itemId === 'gloves_leather';
    if (!hasGloves) {
      player.needs.health = Math.max(1, player.needs.health - 5);
      if (!player.bodyState) player.bodyState = { painLevel: 0 } as any;
      player.bodyState.painLevel = Math.min(100, (player.bodyState.painLevel || 0) + 10);
      addPlayerNotification(player, "Ой! Остатки сжиженного газа при отключении обжгли холодом ваши голые руки (-5 HP, +10 боли)! Наденьте теплые перчатки.", "warning");
    } else {
      addPlayerNotification(player, "Вы безопасно отключили газовый пистолет благодаря теплым перчаткам.", "heal");
    }

    // Spawn minor white vapor cloud that quickly dissipates
    if (world && world.particles) {
      const cosA = Math.cos(vehicle.angle || 0);
      const sinA = Math.sin(vehicle.angle || 0);
      const capX = vehicle.x - cosA * (vehicle.length * 0.35);
      const capY = vehicle.y - sinA * (vehicle.length * 0.35);

      for (let i = 0; i < 10; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 12 + Math.random() * 18;
        world.particles.push({
          x: capX,
          y: capY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          radius: 3 + Math.random() * 3,
          color: '#f8fafc', // icy clean white gas vapor
          alpha: 0.95,
          life: 0,
          maxLife: 0.3 + Math.random() * 0.2, // very short life, quickly dissipates!
          type: 'engine_smoke'
        } as any);
      }
    }
  }

  vehicle.fuelingState = null;
  pump.connectedVehicleId = null;
  pump.status = 'nozzle_held';

  player.heldFuelNozzle = {
    pumpId: pump.id,
    fuelType: fuelType,
    color: grade.color,
    nameRu: grade.nameRu,
    pricePerLiter: grade.pricePerLiter,
    hoseOrigin: { x: pump.x, y: pump.y }
  };

  sound.playUseItem();
  return true;
}

/**
 * Player hangs nozzle back onto the pump dispenser holster.
 */
export function returnNozzleToPump(
  player: Player,
  pump: GasPumpDispenser
): boolean {
  if (!player.heldFuelNozzle || player.heldFuelNozzle.pumpId !== pump.id) {
    return false;
  }

  player.heldFuelNozzle = null;
  pump.nozzleTaken = null;
  pump.connectedVehicleId = null;
  pump.connectedFuelType = null;
  pump.isPumping = false;
  pump.status = 'idle';

  sound.playUseItem();
  return true;
}

/**
 * Start pumping fuel through the pump into connected vehicle.
 */
export function startGasPumpFueling(
  pump: GasPumpDispenser,
  targetLiters: number,
  fuelType: FuelType,
  vehicle?: Vehicle | null
): boolean {
  pump.targetLiters = targetLiters;
  pump.currentPumpedLiters = 0;
  pump.connectedFuelType = fuelType;
  const grade = FUEL_GRADES[fuelType] || FUEL_GRADES.ai95;
  pump.pricePerLiter = grade.pricePerLiter;
  pump.totalPaid = Math.round(targetLiters * grade.pricePerLiter);
  pump.isPumping = true;
  pump.status = 'pumping';
  pump.pumpingTimer = 0;
  pump.displayLiters = 0;
  pump.displayCost = 0;

  if (vehicle) {
    pump.connectedVehicleId = vehicle.id;
  }

  sound.resume();
  return true;
}

/**
 * Pumping simulation in physics loop (call every frame with dt).
 */
export function updateGasPumps(
  world: GameWorld,
  dt: number,
  onPumpFinished?: (pump: GasPumpDispenser, vehicle: Vehicle | null) => void
): void {
  if (!world.gasPumps) return;

  for (const pump of world.gasPumps) {
    if (pump.isPumping && pump.status === 'pumping') {
      pump.pumpingTimer = (pump.pumpingTimer || 0) + dt;
      // Flow rate: 2.2 liters per second
      const flowRate = 2.2;
      const litersThisFrame = Math.min(flowRate * dt, pump.targetLiters - pump.currentPumpedLiters);

      pump.currentPumpedLiters += litersThisFrame;
      pump.displayLiters = Math.round(pump.currentPumpedLiters * 10) / 10;
      pump.displayCost = Math.round(pump.currentPumpedLiters * pump.pricePerLiter);

      // Transfer into connected vehicle
      const vehicle = world.vehicles.find(v => v.id === pump.connectedVehicleId);
      if (vehicle && vehicle.fuelSystem) {
        const cap = vehicle.fuelSystem.tankCapacity || 55;
        const currentLiters = (vehicle.fuelSystem.tankLevel / 100) * cap;
        const newLiters = Math.min(cap, currentLiters + litersThisFrame);
        vehicle.fuelSystem.tankLevel = Math.min(100, (newLiters / cap) * 100);

        // Blend fuel quality and octane rating
        const grade = FUEL_GRADES[pump.connectedFuelType || 'ai95'] || FUEL_GRADES.ai95;
        vehicle.fuelSystem.octaneNumber = Math.max(vehicle.fuelSystem.octaneNumber || 92, grade.octane);
        vehicle.fuelSystem.fuelQuality = Math.min(100, Math.max(vehicle.fuelSystem.fuelQuality || 90, 96));
        vehicle.fuelSystem.detonation = false;

        // Auto shutoff if tank is 100% full
        if (vehicle.fuelSystem.tankLevel >= 100 && pump.currentPumpedLiters < pump.targetLiters) {
          pump.targetLiters = pump.currentPumpedLiters;
        }
      }

      // Check if finished
      if (pump.currentPumpedLiters >= pump.targetLiters - 0.01) {
        pump.currentPumpedLiters = pump.targetLiters;
        pump.displayLiters = pump.targetLiters;
        pump.displayCost = pump.totalPaid;
        pump.isPumping = false;
        pump.status = 'completed';

        if (onPumpFinished) {
          onPumpFinished(pump, vehicle || null);
        }
      }
    }
  }
}

/**
 * Guarantees that the world contains the authoritative Gas Station complex in Southeast (block 6_6).
 */
export function ensureWorldGasStation(world: GameWorld): void {
  if (!world.gasPumps || world.gasPumps.length === 0) {
    world.gasPumps = createDefaultGasPumps();
  } else {
    // Update existing pump coordinates to match GAS_STATION_CONFIG
    world.gasPumps.forEach(pump => {
      const cfg = GAS_STATION_CONFIG.pumps.find(p => p.id === pump.id || p.number === pump.pumpNumber);
      if (cfg) {
        pump.x = cfg.x;
        pump.y = cfg.y;
        pump.hoseOrigin = { x: cfg.x, y: cfg.y };
      }
    });
  }

  // Remove any trees in the gas station lot (x: 4810..5540, y: 4810..5580)
  if (Array.isArray(world.trees)) {
    world.trees = world.trees.filter(
      t => !(t.x >= 4810 && t.x <= 5540 && t.y >= 4810 && t.y <= 5580)
    );
  }

  // Remove any obsolete props in the gas station lot
  if (Array.isArray(world.props)) {
    world.props = world.props.filter(
      p => !(p.x >= 4810 && p.x <= 5540 && p.y >= 4810 && p.y <= 5580)
    );
  }

  // Remove small cottages in block 6_6 if present
  if (Array.isArray(world.buildings)) {
    world.buildings = world.buildings.filter(
      b => b.id !== 'cottage_6_6_1' && b.id !== 'cottage_6_6_2'
    );

    // Check if Gas Station shop exists
    let shopBld = world.buildings.find(b => b.id === GAS_STATION_CONFIG.shopId);
    if (!shopBld) {
      shopBld = {
        id: GAS_STATION_CONFIG.shopId,
        nameRu: 'АЗС "Нефть-Магистраль 24/7" (Касса & Магазин)',
        shopBrand: 'gas_station_shop',
        x: GAS_STATION_CONFIG.shopX,
        y: GAS_STATION_CONFIG.shopY,
        width: GAS_STATION_CONFIG.shopW,
        height: GAS_STATION_CONFIG.shopH,
        type: 'gas_station_shop',
        color: '#1e293b',
        roofColor: '#0f172a',
        accentColor: '#22c55e',
        entranceSide: 'south',
        entrances: [
          { side: 'south', offsetRatio: 0.5, hasCanopyLight: true }
        ],
        windows: [
          { x: 30, y: 125, lit: true },
          { x: 70, y: 125, lit: true },
          { x: 150, y: 125, lit: true },
          { x: 190, y: 125, lit: true },
          { x: 10, y: 40, lit: true },
          { x: 10, y: 80, lit: true }
        ],
        roofDetails: [
          { type: 'ac', rx: 0.2, ry: 0.3, rw: 24, rh: 16 },
          { type: 'ac', rx: 0.7, ry: 0.4, rw: 24, rh: 16 },
          { type: 'solar', rx: 0.4, ry: 0.2, rw: 36, rh: 20 }
        ]
      };
      world.buildings.push(shopBld);
    } else {
      shopBld.x = GAS_STATION_CONFIG.shopX;
      shopBld.y = GAS_STATION_CONFIG.shopY;
      shopBld.width = GAS_STATION_CONFIG.shopW;
      shopBld.height = GAS_STATION_CONFIG.shopH;
    }

    // Check if Gas Station canopy structure exists
    let canopyBld = world.buildings.find(b => b.id === GAS_STATION_CONFIG.canopyId);
    if (!canopyBld) {
      canopyBld = {
        id: GAS_STATION_CONFIG.canopyId,
        nameRu: 'АЗС Навес & Топливные колонки',
        x: GAS_STATION_CONFIG.canopyX,
        y: GAS_STATION_CONFIG.canopyY,
        width: GAS_STATION_CONFIG.canopyW,
        height: GAS_STATION_CONFIG.canopyH,
        type: 'gas_station_canopy',
        color: '#0f172a',
        roofColor: '#1e293b',
        accentColor: '#22c55e',
        windows: [],
        roofDetails: []
      };
      world.buildings.push(canopyBld);
    } else {
      canopyBld.x = GAS_STATION_CONFIG.canopyX;
      canopyBld.y = GAS_STATION_CONFIG.canopyY;
      canopyBld.width = GAS_STATION_CONFIG.canopyW;
      canopyBld.height = GAS_STATION_CONFIG.canopyH;
    }
  }

  // Spawn a supply of sandbags and empty sacks along the side wall of the gas station shop
  if (!world.groundItems) {
    world.groundItems = [];
  }
  const hasSandbags = world.groundItems.some(gi => gi.id.startsWith('ground_gas_sandbag_'));
  if (!hasSandbags) {
    // East wall of gas station shop building (shopX: 5240 + shopW: 220 = 5460)
    // Place a messy, realistic pile of sandbags beside the wall at X ~ 5472-5480, Y ~ 4920-5020
    const centerX = 5474;
    const centerY = 4965;

    const bagOffsets = [
      { dx: -3, dy: -35 },
      { dx: 4, dy: -32 },
      { dx: -5, dy: -18 },
      { dx: 3, dy: -14 },
      { dx: -4, dy: 2 },
      { dx: 5, dy: -1 },
      { dx: -3, dy: 16 },
      { dx: 4, dy: 19 },
      { dx: -5, dy: 35 },
      { dx: 3, dy: 38 },
      // Overlapping top bags in the pile
      { dx: 0, dy: -8 },
      { dx: -1, dy: 8 }
    ];

    for (let i = 0; i < bagOffsets.length; i++) {
      const offset = bagOffsets[i];
      world.groundItems.push({
        id: `ground_gas_sandbag_${i}`,
        x: centerX + offset.dx,
        y: centerY + offset.dy,
        item: createItem('sandbag', 1),
        spawnTime: Date.now()
      });
    }

    // Toss 4 empty sacks messily next to or on the pile
    const sackOffsets = [
      { dx: 12, dy: -22 },
      { dx: 15, dy: -5 },
      { dx: 10, dy: 15 },
      { dx: 14, dy: 28 }
    ];

    for (let j = 0; j < sackOffsets.length; j++) {
      const offset = sackOffsets[j];
      world.groundItems.push({
        id: `ground_gas_sack_empty_${j}`,
        x: centerX + offset.dx,
        y: centerY + offset.dy,
        item: createItem('sack_empty', 1),
        spawnTime: Date.now()
      });
    }
  }
}

import { isPtoOn } from './ptoSystem';
import { Player, GameWorld, Vehicle, HeldWaterHose, HoseSegmentNode, HoseLeakPoint, StoredLiquidType } from './types';
import {
  getVehicleWaterHoseAnchor,
  ensureVehicleFluidTank,
  liquidTypeToStainType,
  getLiquidColor,
  mixTankLiquidType,
} from './vehicleHelpers';
import { isVehicleVacuumTruck, getVehicleVacuumBodyId } from './truckChassisVariants';
import { getRiverWaterAt } from './riverSystem';
import { sound } from './audio';

export const WATER_HOSE_MAX_LENGTH = 120; // Compact realistic uncoiled length (~12 meters)
export const WATER_HOSE_NUM_SEGMENTS = 16; // Number of Verlet rope nodes
export const WATER_HOSE_INTERACTION_DIST = 58; // Distance to pick up / return hose

/**
 * Helper to check if a vehicle (or its towing tractor for trailer_vacuum) has its engine & PTO running.
 */
export function getVehiclePumpPowerState(veh: Vehicle, world: GameWorld): {
  isEngineRunning: boolean;
  isPtoActive: boolean;
  isPumpPowered: boolean;
  rpm: number;
  pressureFactor: number;
  powerSourceVehicle: Vehicle;
} {
  let powerVeh = veh;
  if (veh.type === 'trailer_vacuum' && veh.towedById && world.vehicles) {
    const towing = world.vehicles.find((v) => v.id === veh.towedById);
    if (towing) {
      powerVeh = towing;
    }
  }
  const isEngineRunning = !!powerVeh.engineState?.engineRunning;
  const isPtoActive =
    veh.type === 'trailer_vacuum'
      ? isPtoOn(veh) || isPtoOn(powerVeh)
      : isPtoOn(veh) || !!veh.isWashingNozzlesActive;
  const isPumpPowered = isEngineRunning && isPtoActive;
  const rpm = isEngineRunning ? (powerVeh.engineState?.engineRPM || 800) : 0;
  const rpmRatio = Math.min(1.0, Math.max(0, (rpm - 750) / 1850));
  const pressureFactor = isPumpPowered ? (0.55 + rpmRatio * 0.65) : 0.0;

  return {
    isEngineRunning,
    isPtoActive,
    isPumpPowered,
    rpm,
    pressureFactor,
    powerSourceVehicle: powerVeh,
  };
}

/**
 * Creates a brand new water, high-pressure sewer jetter, or vacuum suction hose attached to the vehicle.
 */
export function createWaterHose(vehicle: Vehicle): HeldWaterHose {
  ensureVehicleFluidTank(vehicle);
  const anchor = getVehicleWaterHoseAnchor(vehicle) || { x: vehicle.x, y: vehicle.y };

  const vacBodyId = getVehicleVacuumBodyId(vehicle);
  const isKombiJetter =
    vacBodyId === 'body_vacuum_kombi_ko560' && vehicle.fluidTank?.activeHoseMode === 'jetter';

  const isVacuumTrailer = vehicle.type === 'trailer_vacuum';
  const isVacuumTruck = (isVehicleVacuumTruck(vehicle) || !!vehicle.fluidTank?.isVacuumTank) && !isKombiJetter;
  const isVacuum = (isVacuumTrailer || isVacuumTruck) && !isKombiJetter;
  const isBarrel = vehicle.type === 'trailer_barrel';

  // Dynamic realistic lengths for different vehicle scales:
  // - truck_water / fire_engine: 120 px (long high-pressure hose)
  // - КО-560 РВД jetter hose: 115 px (flexible orange high-pressure sewer jetting hose)
  // - КО-505А sludge boom hose: 95 px (heavy d=100mm suction hose from top slewing boom)
  // - КО-505А twin-tank vacuum hose: 92 px (heavy d=100mm corrugated suction hose)
  // - КО-503В vacuum hose: 85 px (heavy d=100mm corrugated suction hose)
  // - trailer_barrel: 75 px (medium water discharge hose)
  // - trailer_vacuum: 65 px (tractor corrugated suction hose)
  const maxLength = isKombiJetter
    ? 115
    : isVacuumTrailer
    ? 65
    : vacBodyId === 'body_vacuum_sludge_ko505'
    ? 95
    : vacBodyId === 'body_vacuum_twin_ko505'
    ? 92
    : isVacuumTruck
    ? 85
    : isBarrel
    ? 75
    : WATER_HOSE_MAX_LENGTH;

  const segLength = maxLength / (WATER_HOSE_NUM_SEGMENTS - 1);
  const segments: HoseSegmentNode[] = [];

  for (let i = 0; i < WATER_HOSE_NUM_SEGMENTS; i++) {
    const frac = i / (WATER_HOSE_NUM_SEGMENTS - 1);
    const sx = anchor.x + Math.cos(vehicle.angle + Math.PI / 2) * (frac * 15);
    const sy = anchor.y + Math.sin(vehicle.angle + Math.PI / 2) * (frac * 15);
    segments.push({
      x: sx,
      y: sy,
      oldX: sx,
      oldY: sy,
    });
  }

  // Vacuum hoses and high-pressure armored КО-560 РВД hoses do not have worn garden-hose micro-leaks
  const leaks: HoseLeakPoint[] = (isVacuum || isKombiJetter)
    ? []
    : [
        {
          segmentIndex: Math.floor(4 + Math.random() * 4),
          flowIntensity: 0.45 + Math.random() * 0.45,
        },
        {
          segmentIndex: Math.floor(10 + Math.random() * 4),
          flowIntensity: 0.35 + Math.random() * 0.45,
        },
      ];

  return {
    vehicleId: vehicle.id,
    sourceType: isVacuumTrailer
      ? 'trailer_vacuum'
      : isVacuum
      ? 'truck_vacuum'
      : isBarrel
      ? 'trailer_barrel'
      : 'truck_water',
    maxLength,
    segments,
    segmentLength: segLength,
    leaks,
    isSpraying: false,
    isVacuumHose: isVacuum,
    isJetterHose: isKombiJetter,
    isSuctionActive: false,
    sprayCooldown: 0,
  };
}

/**
 * Checks if the player is standing near a vehicle that has a water/vacuum hose bracket,
 * and returns that vehicle if available.
 */
export function getNearbyWaterVehicle(player: Player, world: GameWorld): Vehicle | null {
  if (!world.vehicles) return null;

  let bestVeh: Vehicle | null = null;
  let bestDist = WATER_HOSE_INTERACTION_DIST;

  for (const v of world.vehicles) {
    ensureVehicleFluidTank(v);
    if (!v.fluidTank?.hasWaterHose) continue;

    const anchor = getVehicleWaterHoseAnchor(v);
    if (!anchor) continue;

    const d = Math.hypot(player.x - anchor.x, player.y - anchor.y);
    if (d < bestDist) {
      bestDist = d;
      bestVeh = v;
    }
  }

  return bestVeh;
}

export const getNearbyWaterHoseVehicle = getNearbyWaterVehicle;

/**
 * Player picks up the water/vacuum hose from the vehicle.
 */
export function takeWaterHose(player: Player, vehicle: Vehicle, world: GameWorld): boolean {
  if (player.isInVehicle) return false;
  ensureVehicleFluidTank(vehicle);
  if (!vehicle.fluidTank) return false;

  vehicle.fluidTank.isWaterHoseDeployed = true;
  player.heldWaterHose = createWaterHose(vehicle);

  const endNode = player.heldWaterHose.segments[player.heldWaterHose.segments.length - 1];
  endNode.x = player.x;
  endNode.y = player.y;
  endNode.oldX = player.x;
  endNode.oldY = player.y;

  sound.playPickup();
  return true;
}

/**
 * Player stows the water/vacuum hose back onto the vehicle reel / tray.
 */
export function stowWaterHose(player: Player, world: GameWorld): boolean {
  if (!player.heldWaterHose) return false;
  const targetVeh = world.vehicles?.find((v) => v.id === player.heldWaterHose?.vehicleId);
  if (targetVeh && targetVeh.fluidTank) {
    targetVeh.fluidTank.isWaterHoseDeployed = false;
  }
  player.heldWaterHose = null;
  sound.playButtonPress();
  return true;
}

/**
 * Updates Verlet physics simulation, tension tugging, realistic vacuum suction, and discharge.
 */
export function updateWaterHosePhysics(player: Player, world: GameWorld, dt: number, isMouseDown: boolean) {
  if (!player.heldWaterHose) return;

  const hose = player.heldWaterHose;
  const veh = world.vehicles?.find((v) => v.id === hose.vehicleId);

  if (!veh) {
    player.heldWaterHose = null;
    return;
  }

  // If player got into a car while holding the hose, automatically stow it back
  if (player.isInVehicle) {
    stowWaterHose(player, world);
    return;
  }

  const anchor = getVehicleWaterHoseAnchor(veh);
  if (!anchor) return;

  const numNodes = hose.segments.length;
  if (numNodes < 2) return;

  // Hand position for the nozzle / suction lance (scaled to 10 px/m player anatomy)
  const playerAimAngle = player.aimAngle !== undefined ? player.aimAngle : player.angle;
  const handDist = 2.8;
  const handAngle = playerAimAngle + 0.35;
  const handX = player.x + Math.cos(handAngle) * handDist;
  const handY = player.y + Math.sin(handAngle) * handDist;

  // 1. Enforce Maximum Hose Length Constraint on Player (Physical Tugging / Tension)
  const totalDx = handX - anchor.x;
  const totalDy = handY - anchor.y;
  const totalDist = Math.hypot(totalDx, totalDy);

  if (totalDist > hose.maxLength) {
    const excess = totalDist - hose.maxLength;
    const pullX = (totalDx / totalDist) * excess;
    const pullY = (totalDy / totalDist) * excess;

    player.x -= pullX;
    player.y -= pullY;

    const outwardDot = (player.vx * totalDx + player.vy * totalDy) / totalDist;
    if (outwardDot > 0) {
      player.vx -= (totalDx / totalDist) * outwardDot * 0.9;
      player.vy -= (totalDy / totalDist) * outwardDot * 0.9;
    }
  }

  // 2. Pin Start Node to Vehicle Anchor & End Node to Player Hands
  const firstNode = hose.segments[0];
  firstNode.x = anchor.x;
  firstNode.y = anchor.y;
  firstNode.oldX = anchor.x;
  firstNode.oldY = anchor.y;

  const lastNode = hose.segments[numNodes - 1];
  lastNode.x = handX;
  lastNode.y = handY;
  lastNode.oldX = handX;
  lastNode.oldY = handY;

  // 3. Verlet Integration for Intermediate Nodes
  const friction = 0.85;
  for (let i = 1; i < numNodes - 1; i++) {
    const node = hose.segments[i];
    const vx = (node.x - node.oldX) * friction;
    const vy = (node.y - node.oldY) * friction;

    node.oldX = node.x;
    node.oldY = node.y;

    node.x += vx;
    node.y += vy;
  }

  // 4. Relaxation distance constraints
  const targetSegLen = hose.maxLength / (numNodes - 1);
  const iterations = 12;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < numNodes - 1; i++) {
      const n1 = hose.segments[i];
      const n2 = hose.segments[i + 1];

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const diff = (d - targetSegLen) / d;

      const isN1Fixed = i === 0;
      const isN2Fixed = i + 1 === numNodes - 1;

      if (isN1Fixed && !isN2Fixed) {
        n2.x -= dx * diff;
        n2.y -= dy * diff;
      } else if (!isN1Fixed && isN2Fixed) {
        n1.x += dx * diff;
        n1.y += dy * diff;
      } else if (!isN1Fixed && !isN2Fixed) {
        n1.x += dx * diff * 0.5;
        n1.y += dy * diff * 0.5;
        n2.x -= dx * diff * 0.5;
        n2.y -= dy * diff * 0.5;
      }
    }
  }

  // 5. Realistic Pump, Vacuum, Slide Gate Valve & Jetter Mechanics
  const tank = veh.fluidTank;
  if (!tank) return;

  const powerState = getVehiclePumpPowerState(veh, world);
  const { isPumpPowered, rpm, pressureFactor } = powerState;
  const rpmRatio = Math.min(1.0, Math.max(0, (rpm - 750) / 1850));

  const isJetterHose = !!hose.isJetterHose;
  const isVacuumHose =
    !isJetterHose &&
    (!!hose.isVacuumHose || hose.sourceType === 'trailer_vacuum' || hose.sourceType === 'truck_vacuum');

  // --- CASE A: КО-560 High-Pressure Sewer Jetter Hose (Барабан РВД высокого давления) ---
  if (isJetterHose) {
    hose.isSuctionActive = false;
    const cleanWater = tank.cleanWaterVolume ?? 0;
    const isJetterPowered = isPumpPowered && tank.isJetterPumpActive !== false;
    hose.isPressurized = isJetterPowered;

    const wantsToJet = isMouseDown && cleanWater > 0 && !player.isInVehicle;
    hose.isSpraying = wantsToJet;

    if (wantsToJet) {
      // High-pressure plunger pump (ДКТ-245 / 160 bar) consumes clean water from side stainless tanks
      const jetRate = isJetterPowered ? (4.5 + pressureFactor * 3.5) : 0.6;
      const consumed = Math.min(cleanWater, jetRate * dt);
      tank.cleanWaterVolume = Math.max(0, cleanWater - consumed);

      hose.sprayCooldown = (hose.sprayCooldown || 0) + dt;
      const soundInterval = isJetterPowered ? Math.max(0.07, 0.13 - rpmRatio * 0.05) : 0.22;
      if (hose.sprayCooldown >= soundInterval) {
        hose.sprayCooldown = 0;
        sound.playWaterSpray();
      }

      spawnLiquidStream(
        player,
        handX,
        handY,
        world,
        dt,
        isJetterPowered,
        pressureFactor * 1.15,
        'water',
        false,
        true // high-pressure sewer jetting scrubs oil/sewage stains
      );
    }
    return;
  }

  // --- CASE B: Corrugated d=100mm Vacuum Suction / Discharge Hose (КО-503В, КО-505А, КО-560, МЖТ) ---
  if (isVacuumHose) {
    const currentVol = tank.currentVolume ?? tank.currentAmount ?? 0;
    const maxCap = tank.capacity || 4200;
    const isTankFull = currentVol >= maxCap - 0.5;
    const vacuumMode = tank.vacuumPumpMode ?? 'suction';
    const vacBar = tank.vacuumPressureBar ?? 0; // negative = vacuum, positive = overpressure
    const isGateOpen = !!tank.drainValveOpen; // Rear slide gate valve АНМ-53 must be OPEN for fluid/air passage through hose!

    const storedVac = Math.max(0, Math.min(1.2, (-vacBar - 0.03) / 0.72));
    const activeVac = isPumpPowered && vacuumMode === 'suction' ? 0.55 * pressureFactor : 0;
    const vacuumStrength = Math.max(storedVac, activeVac);

    // If the 4-way valve is in 'discharge' OR the pump is off with no vacuum ("без вакуума"), holding LMB with gate open drains/discharges liquid through the hose!
    const canSuckPhysically =
      vacuumMode === 'suction' && isGateOpen && vacuumStrength > 0.02 && !isTankFull && !tank.spuCutoffActive;

    if (vacuumMode === 'suction' && (canSuckPhysically || currentVol <= 0 || vacuumStrength > 0.02)) {
      hose.isSpraying = false;

      const wantsSuction = isMouseDown && !player.isInVehicle && canSuckPhysically;
      hose.isSuctionActive = wantsSuction;

      if (wantsSuction) {
        const aimAngle = player.aimAngle !== undefined ? player.aimAngle : player.angle;
        const cosAim = Math.cos(aimAngle);
        const sinAim = Math.sin(aimAngle);
        const intakeX = handX + cosAim * 4.5;
        const intakeY = handY + sinAim * 4.5;

        const vacBodyId = getVehicleVacuumBodyId(veh);
        // Heavy VK-6M2 pump on КО-505А sludge has 1.4x, КО-505 (310 m3/h) on twin-tank has 1.25x capacity vs КО-503
        const pumpMultiplier =
          vacBodyId === 'body_vacuum_sludge_ko505'
            ? 1.4
            : vacBodyId === 'body_vacuum_twin_ko505'
            ? 1.25
            : 1.0;
        const suctionRadius = (26 + vacuumStrength * 20) * pumpMultiplier;
        const suctionPower = (0.85 + vacuumStrength * 1.25) * pumpMultiplier;

        let suckedLiters = 0;
        let suckedType: StoredLiquidType = 'sewage';
        let suckedColor = '#5c6b32';
        let foundRealLiquidSource = false;

        // 1. Suck up ground stains (water, sewage, oil, fuel, coolant) within the intake bell cone
        if (world.stains && world.stains.length > 0) {
          for (let s = world.stains.length - 1; s >= 0; s--) {
            const st = world.stains[s];
            if (st.type === 'sand') continue; // Dry sand cannot be pumped as liquid
            const dx = st.x - intakeX;
            const dy = st.y - intakeY;
            const dist = Math.hypot(dx, dy);
            if (dist <= suctionRadius + st.radius) {
              foundRealLiquidSource = true;
              if (dist > 1.5) {
                const pullStep = Math.min(dist * 0.45, 28 * suctionPower * dt);
                st.x -= (dx / dist) * pullStep;
                st.y -= (dy / dist) * pullStep;
              }
              const shrinkAmount = (4.5 + suctionPower * 6.0) * dt;
              const oldR = st.radius;
              st.radius = Math.max(0, st.radius - shrinkAmount);
              const areaDelta = Math.max(0.15, oldR * oldR - st.radius * st.radius);
              suckedLiters += areaDelta * 1.45;

              if (st.type === 'oil') {
                suckedType = 'oil';
                suckedColor = '#1e293b';
              } else if (st.type === 'fuel') {
                suckedType = 'fuel_ai92';
                suckedColor = '#f59e0b';
              } else if (st.type === 'coolant') {
                suckedType = 'coolant';
                suckedColor = '#22c55e';
              } else if (st.type === 'sewage') {
                suckedType = 'sewage';
                suckedColor = '#5c6b32';
              } else {
                suckedType = 'water';
                suckedColor = '#0284c7';
              }

              if (st.radius <= 0.85) {
                world.stains.splice(s, 1);
              }
            }
          }
        }

        // 2. Check rainwater puddles (`world.puddles`) — ALWAYS check even if stains are nearby!
        if (world.puddles && world.puddles.length > 0) {
          for (let pIdx = world.puddles.length - 1; pIdx >= 0; pIdx--) {
            const pud = world.puddles[pIdx];
            const dx = pud.x - intakeX;
            const dy = pud.y - intakeY;
            const dPud = Math.hypot(dx, dy);
            const pudR = Math.max(pud.radiusX || 12, pud.radiusY || 12);
            if (dPud <= suctionRadius + pudR) {
              foundRealLiquidSource = true;
              if (!pud.isPond && dPud > 1.5) {
                const pullStep = Math.min(dPud * 0.35, 18 * suctionPower * dt);
                pud.x -= (dx / dPud) * pullStep;
                pud.y -= (dy / dPud) * pullStep;
              }
              const shrinkRate = (5.0 + suctionPower * 6.5) * dt;
              if (pud.isPond) {
                suckedLiters += (12.0 + suctionPower * 10.0) * dt;
              } else {
                const oldArea = (pud.radiusX || 10) * (pud.radiusY || 10);
                pud.radiusX = Math.max(0, (pud.radiusX || 10) - shrinkRate);
                pud.radiusY = Math.max(0, (pud.radiusY || 10) - shrinkRate);
                const newArea = pud.radiusX * pud.radiusY;
                suckedLiters += Math.max(8.0 * dt, (oldArea - newArea) * 0.85);
                if (pud.radiusX <= 2.2 || pud.radiusY <= 2.2) {
                  world.puddles.splice(pIdx, 1);
                }
              }
              suckedType = 'water';
              suckedColor = '#0284c7';
            }
          }
        }

        // 3. Check if intake bell is submerged in river / natural water body
        if (!foundRealLiquidSource) {
          const riverInfo = getRiverWaterAt(intakeX, intakeY);
          if (riverInfo && riverInfo.inWater) {
            foundRealLiquidSource = true;
            suckedLiters += (12.0 + suctionPower * 10.0) * dt;
            suckedType = 'water';
            suckedColor = '#0284c7';
          }
        }

        // 4. Check if intake bell is placed over a sewer manhole, storm drain grate, or village well
        if (!foundRealLiquidSource && world.props) {
          for (const prop of world.props) {
            if (prop.type === 'manhole' || prop.type === 'drain_grate' || prop.type === 'village_well') {
              const dProp = Math.hypot(prop.x - intakeX, prop.y - intakeY);
              if (dProp <= suctionRadius + 16) {
                foundRealLiquidSource = true;
                suckedLiters += (11.0 + suctionPower * 9.5) * dt;
                if (prop.type === 'village_well') {
                  suckedType = 'water';
                  suckedColor = '#0284c7';
                } else {
                  suckedType = 'sewage';
                  suckedColor = '#5c6b32';
                }
                break;
              }
            }
          }
        }

        if (foundRealLiquidSource && suckedLiters > 0) {
          const totalAdded = Math.min(maxCap - currentVol, suckedLiters);
          tank.liquidType = mixTankLiquidType(tank.liquidType || 'sewage', currentVol, suckedType, totalAdded);
          tank.currentVolume = Math.min(maxCap, currentVol + totalAdded);
          tank.currentAmount = tank.currentVolume;
          hose.suctionLiquidColor = suckedColor;
          if (tank.currentVolume >= maxCap - 0.5) {
            tank.spuCutoffActive = true;
          }
        } else {
          // Sucking dry air on dry asphalt: slight vacuum bleed if pump is off
          hose.suctionLiquidColor = 'rgba(148, 163, 184, 0.45)';
          if (!isPumpPowered) {
            tank.vacuumPressureBar = Math.min(0, (tank.vacuumPressureBar ?? 0) + 0.03 * dt);
          }
        }

        // Spawn inward-swirling droplets (or dry dust motes if sucking air) into the brass intake lance tip
        const tipX = handX + cosAim * 3.0;
        const tipY = handY + sinAim * 3.0;
        if (world.particles && world.particles.length < 500 && Math.random() < (foundRealLiquidSource ? 0.85 : 0.35)) {
          const randAngle = aimAngle + (Math.random() - 0.5) * 1.4;
          const spawnDist = 10 + Math.random() * 14;
          const px = tipX + Math.cos(randAngle) * spawnDist;
          const py = tipY + Math.sin(randAngle) * spawnDist;
          const speedIn = 65 + suctionPower * 45;
          world.particles.push({
            x: px,
            y: py,
            vx: ((tipX - px) / spawnDist) * speedIn,
            vy: ((tipY - py) / spawnDist) * speedIn,
            radius: foundRealLiquidSource ? (1.4 + Math.random() * 1.3) : (1.0 + Math.random() * 0.8),
            color: foundRealLiquidSource ? suckedColor : '#94a3b8',
            alpha: foundRealLiquidSource ? 0.85 : 0.45,
            initialAlpha: foundRealLiquidSource ? 0.85 : 0.45,
            life: 0,
            maxLife: 0.16,
            type: 'water_spray',
          });
        }

        hose.sprayCooldown = (hose.sprayCooldown || 0) + dt;
        if (hose.sprayCooldown >= 0.18) {
          hose.sprayCooldown = 0;
          sound.playWaterSpray();
        }
      }
    } else {
      // VACUUM HOSE IN DISCHARGE MODE ('discharge') OR GRAVITY DRAIN WHEN PUMP OFF ('без вакуума')
      hose.isSuctionActive = false;
      const hasLiquid = currentVol > 0;
      const overpressure = Math.max(0, vacBar);
      const isCompressorPushing = overpressure > 0.08 || (isPumpPowered && vacuumMode === 'discharge');
      hose.isPressurized = isCompressorPushing;

      const wantsToDischarge = isMouseDown && hasLiquid && isGateOpen && !player.isInVehicle;
      hose.isSpraying = wantsToDischarge;

      if (wantsToDischarge) {
        // Gravity flow through d=100mm pipe (~4.5 L/s) vs compressor-assisted discharge (~10.5 L/s)
        const effOverpressure = isCompressorPushing ? Math.max(0.45, overpressure) : 0;
        const dischargeRate = isCompressorPushing ? (6.0 + effOverpressure * 4.0) : 4.5;
        const consumed = Math.min(currentVol, dischargeRate * dt);
        tank.currentVolume = Math.max(0, currentVol - consumed);
        tank.currentAmount = tank.currentVolume;
        if (tank.currentVolume < maxCap - 5) {
          tank.spuCutoffActive = false;
        }

        hose.sprayCooldown = (hose.sprayCooldown || 0) + dt;
        const soundInterval = isCompressorPushing ? 0.12 : 0.22;
        if (hose.sprayCooldown >= soundInterval) {
          hose.sprayCooldown = 0;
          sound.playWaterSpray();
        }

        spawnLiquidStream(
          player,
          handX,
          handY,
          world,
          dt,
          isCompressorPushing,
          Math.max(0.35, effOverpressure * 0.85),
          tank.liquidType || 'sewage',
          true, // heavy d=100mm vacuum hose discharge (shorter reach, wide bore)
          false
        );
      }
    }
    return;
  }

  // --- CASE C: Standard Water Truck / Fire Pumper / Barrel Trailer Hose ---
  hose.isSuctionActive = false;
  hose.isPressurized = isPumpPowered;
  const currentWater = tank.currentVolume ?? tank.currentAmount ?? 0;
  const hasWater = currentWater > 0;

  const wantsToSpray = isMouseDown && hasWater && !player.isInVehicle;
  hose.isSpraying = wantsToSpray;

  if (wantsToSpray) {
    const sprayRate = isPumpPowered ? (3.8 + pressureFactor * 3.0) : 0.75;
    const consumed = Math.min(currentWater, sprayRate * dt);
    tank.currentVolume = Math.max(0, currentWater - consumed);
    tank.currentAmount = tank.currentVolume;

    hose.sprayCooldown = (hose.sprayCooldown || 0) + dt;
    const soundInterval = isPumpPowered ? Math.max(0.08, 0.14 - rpmRatio * 0.05) : 0.22;
    if (hose.sprayCooldown >= soundInterval) {
      hose.sprayCooldown = 0;
      sound.playWaterSpray();
    }

    spawnLiquidStream(
      player,
      handX,
      handY,
      world,
      dt,
      isPumpPowered,
      pressureFactor,
      tank.liquidType || 'water',
      false,
      false
    );
  }

  // 6. Micro-hole leaks along standard pressurized rubber hoses
  if (hasWater && !isVacuumHose && !isJetterHose) {
    const isHighPressure = (hose.isSpraying && isPumpPowered) || (tank.drainValveOpen && isPumpPowered);
    const leakChance = isHighPressure ? 0.85 : (hose.isSpraying ? 0.50 : 0.25);

    if (Math.random() < leakChance) {
      for (const leak of hose.leaks) {
        const segIdx = Math.min(numNodes - 2, Math.max(1, leak.segmentIndex));
        const segNode = hose.segments[segIdx];
        const nextNode = hose.segments[segIdx + 1];

        const hdx = nextNode.x - segNode.x;
        const hdy = nextNode.y - segNode.y;
        const hlen = Math.hypot(hdx, hdy) || 1;
        const normX = -hdy / hlen;
        const normY = hdx / hlen;

        if (world.particles && world.particles.length < 500) {
          const squirtSpeed = isHighPressure
            ? (20 + pressureFactor * 25 + Math.random() * 20) * leak.flowIntensity
            : (4 + Math.random() * 6);
          const side = Math.random() < 0.5 ? 1 : -1;
          world.particles.push({
            x: segNode.x + (Math.random() - 0.5) * 2,
            y: segNode.y + (Math.random() - 0.5) * 2,
            vx: normX * side * squirtSpeed + (Math.random() - 0.5) * 8,
            vy: normY * side * squirtSpeed + (Math.random() - 0.5) * 8,
            radius: isHighPressure ? (1.2 + Math.random() * 1.1) : (0.9 + Math.random() * 0.7),
            color: '#bae6fd',
            alpha: 0.82,
            initialAlpha: 0.82,
            life: 0,
            maxLife: isHighPressure ? 0.30 : 0.16,
            type: 'water_spray',
          });
        }

        if (Math.random() < 0.05) {
          spawnMicroPuddle(segNode.x, segNode.y, world);
        }
      }
    }
  }
}

/**
 * Spawns liquid stream particles and puddles matching the actual stored liquid type
 * (clean water, sewage/sludge, oil, fuel, or coolant) and nozzle geometry.
 */
function spawnLiquidStream(
  player: Player,
  muzzleX: number,
  muzzleY: number,
  world: GameWorld,
  dt: number,
  isPressurized: boolean,
  pressureFactor: number,
  liquidType: StoredLiquidType,
  isWideBoreVacuumDischarge: boolean,
  isHighPressureJetter: boolean
) {
  const aimAngle = player.aimAngle !== undefined ? player.aimAngle : player.angle;
  const cosAim = Math.cos(aimAngle);
  const sinAim = Math.sin(aimAngle);

  const stainType = liquidTypeToStainType(liquidType);
  const baseLiquidColor = getLiquidColor(liquidType);
  const canExtinguishFire = stainType === 'water' || stainType === 'sewage';

  // Stream reach:
  // - Wide-bore d=100mm vacuum discharge: ~24 px (gravity) up to ~58 px (compressor overpressure)
  // - High-pressure water/jetter nozzle: ~65 px up to ~160 px
  const streamReach = isWideBoreVacuumDischarge
    ? (isPressurized ? 34 + pressureFactor * 28 : 22)
    : (isPressurized ? 55 + pressureFactor * 90 : 32);

  const numParticles = isPressurized ? Math.round(3 + pressureFactor * 2) : 2;

  for (let i = 0; i < numParticles; i++) {
    const spread =
      (Math.random() - 0.5) *
      (isWideBoreVacuumDischarge ? 0.34 : isPressurized ? 0.18 - pressureFactor * 0.04 : 0.28);
    const pAngle = aimAngle + spread;
    const baseSpeed = isWideBoreVacuumDischarge
      ? (isPressurized ? 95 + pressureFactor * 90 : 55 + Math.random() * 25)
      : (isPressurized ? 180 + pressureFactor * 320 : 70 + Math.random() * 35);
    const speed = baseSpeed + (Math.random() - 0.5) * 30;

    let particleColor = baseLiquidColor;
    if (stainType === 'water') {
      particleColor = Math.random() < 0.65 ? '#e0f2fe' : Math.random() < 0.5 ? '#38bdf8' : '#ffffff';
    } else if (stainType === 'sewage') {
      particleColor = Math.random() < 0.6 ? '#5c6b32' : '#3f4d22';
    } else if (stainType === 'oil') {
      particleColor = '#1e293b';
    }

    if (world.particles && world.particles.length < 500) {
      world.particles.push({
        x: muzzleX + Math.cos(pAngle) * 3,
        y: muzzleY + Math.sin(pAngle) * 3,
        vx: Math.cos(pAngle) * speed + player.vx * 0.2,
        vy: Math.sin(pAngle) * speed + player.vy * 0.2 + (isPressurized && !isWideBoreVacuumDischarge ? 0 : 22),
        radius: isWideBoreVacuumDischarge
          ? 2.2 + Math.random() * 1.6
          : isPressurized
          ? 1.8 + pressureFactor * 1.2 + Math.random() * 1.5
          : 1.4 + Math.random() * 1.4,
        color: particleColor,
        alpha: 0.85,
        life: 0,
        maxLife: isWideBoreVacuumDischarge ? 0.26 : isPressurized ? 0.28 + pressureFactor * 0.12 : 0.25,
        type: 'water_spray',
      });
    }
  }

  // Impact point along stream
  const impactDist = streamReach * (0.75 + Math.random() * 0.25);
  const impactX = muzzleX + cosAim * impactDist + (Math.random() - 0.5) * (isPressurized ? 10 : 6);
  const impactY = muzzleY + sinAim * impactDist + (Math.random() - 0.5) * (isPressurized ? 10 : 6);

  const effectRadius = isPressurized ? 22 + pressureFactor * 22 : 15;

  if (world.stains) {
    for (let i = world.stains.length - 1; i >= 0; i--) {
      const st = world.stains[i];
      const dx = st.x - impactX;
      const dy = st.y - impactY;
      const d2 = dx * dx + dy * dy;
      if (d2 < effectRadius * effectRadius) {
        if (canExtinguishFire && st.onFire) {
          st.onFire = false;
          st.fireIntensity = 0;
        }
        // КО-560 High-Pressure Jetter scrubs & dilutes dirty stains (sewage, oil, coolant)
        if (isHighPressureJetter && isPressurized && st.type !== 'water') {
          st.radius = Math.max(0, st.radius - 3.2 * dt);
          if (st.radius <= 1.0) {
            world.stains.splice(i, 1);
          }
        }
      }
    }

    // Spawn or grow a ground puddle matching the discharged liquid type!
    if (Math.random() < (isWideBoreVacuumDischarge ? 0.48 : isPressurized ? 0.35 : 0.22)) {
      let merged = false;
      for (const st of world.stains) {
        if (st.type === stainType) {
          const dx = st.x - impactX;
          const dy = st.y - impactY;
          if (dx * dx + dy * dy < 13 * 13) {
            st.radius = Math.min(st.maxRadius, st.radius + (isWideBoreVacuumDischarge ? 0.55 : isPressurized ? 0.4 : 0.2));
            st.maxRadius = Math.max(st.maxRadius, isWideBoreVacuumDischarge ? 16 : isPressurized ? 14 : 9);
            st.life = Math.max(0, st.life - 15);
            st.alpha = Math.min(0.85, st.alpha + 0.05);
            merged = true;
            break;
          }
        }
      }
      if (!merged && world.stains.length < 600) {
        world.stains.push({
          id: `hose_spill_${Date.now()}_${Math.random()}`,
          x: impactX,
          y: impactY,
          radius: isWideBoreVacuumDischarge ? 3.4 + Math.random() * 2.4 : isPressurized ? 2.8 + Math.random() * 2.5 : 1.8 + Math.random() * 1.6,
          maxRadius: isWideBoreVacuumDischarge ? 16 : isPressurized ? 14 : 9,
          type: stainType,
          alpha: stainType === 'water' ? 0.65 : 0.80,
          life: 0,
          maxLife: stainType === 'water' ? 60 + Math.random() * 25 : 180 + Math.random() * 80,
          onFire: false,
          fireIntensity: 0,
        });
      }
    }
  }

  // Extinguish Vehicle Fires ONLY if spraying non-flammable water/sewage
  if (canExtinguishFire && world.vehicles) {
    let extinguishedAnyFire = false;
    for (const veh of world.vehicles) {
      const vx = veh.x - impactX;
      const vy = veh.y - impactY;
      const dist = Math.hypot(vx, vy);
      if (dist < Math.max(veh.length, veh.width) * 0.65 + (isPressurized ? 25 : 14)) {
        const extinguishRate = isPressurized ? (0.45 + pressureFactor * 0.55) : 0.18;
        if (veh.damage && (veh.damage.engineFire || veh.damage.fuelTankFire || veh.damage.cabinFire)) {
          veh.damage.fireIntensity = Math.max(0, (veh.damage.fireIntensity ?? 1) - dt * extinguishRate);
          extinguishedAnyFire = true;
          if (veh.damage.fireIntensity <= 0.05) {
            veh.damage.engineFire = false;
            veh.damage.fuelTankFire = false;
            veh.damage.cabinFire = false;
            veh.damage.fireIntensity = 0;
          }
        }
      }
    }

    if (extinguishedAnyFire && world.particles) {
      for (let s = 0; s < 5; s++) {
        world.particles.push({
          x: impactX + (Math.random() - 0.5) * 16,
          y: impactY + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 35,
          vy: (Math.random() - 0.5) * 35 - 15,
          radius: 4 + Math.random() * 5,
          color: '#f8fafc',
          alpha: 0.75,
          life: 0,
          maxLife: 0.6,
          type: 'engine_smoke',
        });
      }
    }
  }
}

/**
 * Spawns tiny wet spots under hose leak points.
 */
function spawnMicroPuddle(x: number, y: number, world: GameWorld) {
  if (!world.stains || world.stains.length >= 600) return;

  for (const st of world.stains) {
    if (st.type === 'water') {
      const dx = st.x - x;
      const dy = st.y - y;
      if (dx * dx + dy * dy < 8 * 8) {
        st.radius = Math.min(6.5, st.radius + 0.18);
        st.life = Math.max(0, st.life - 5);
        return;
      }
    }
  }

  world.stains.push({
    id: `hose_leak_${Date.now()}_${Math.random()}`,
    x: x + (Math.random() - 0.5) * 3,
    y: y + (Math.random() - 0.5) * 3,
    radius: 1.4 + Math.random() * 1.0,
    maxRadius: 5.5,
    type: 'water',
    alpha: 0.48,
    life: 0,
    maxLife: 40 + Math.random() * 20,
    onFire: false,
    fireIntensity: 0,
  });
}

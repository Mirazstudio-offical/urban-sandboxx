import { Building, GameWorld, GasPumpDispenser, GroundItem, InventoryItem, LitterItem, Player, Vehicle } from './types';
import { CAR_CONFIGS, getVehicleFuelCapPosition, getVehicleWaterHoseAnchor, isTrailerVehicle, canVehicleHaveHitch } from './vehicleHelpers';
import { getAllBuildingEntrances } from './physics';
import { getBuildingLayout, getBuildingFloorsCount, getApartmentDoorSegment } from './buildingInteriors';
import { isPlayerNearGasStationCashier, getNearbyGasPump, getNearbyVehicleForFueling, FUEL_GRADES } from './gasStationSystem';
import { getNearbyWaterVehicle } from './waterHoseSystem';
import { getCityApartments, getApartmentById, hasPlayerApartmentKey, PropertyApartment } from './propertySystem';
import { FURNITURE_STORAGE_CONFIGS } from './furnitureStorageSystem';

export type InteractionType =
  | 'enter_vehicle'
  | 'exit_vehicle'
  | 'open_hood'
  | 'fuel_insert'
  | 'fuel_remove'
  | 'pump_take_nozzle'
  | 'pump_return_nozzle'
  | 'gas_cashier'
  | 'water_hose_take'
  | 'water_hose_stow'
  | 'enter_building'
  | 'exit_building'
  | 'building_shop'
  | 'building_elevator'
  | 'pickup_item'
  | 'pickup_litter'
  | 'eco_recycle'
  | 'trash_throw'
  | 'hand_item'
  | 'trailer_hitch'
  | 'trailer_unhitch'
  | 'trailer_hitch_hint'
  | 'trailer_connect_plug'
  | 'trailer_disconnect_plug'
  | 'trailer_connect_brakes'
  | 'trailer_disconnect_brakes'
  | 'trailer_toggle_handbrake'
  | 'real_estate_agency'
  | 'apartment_door_lock'
  | 'apartment_door_locked_nokey'
  | 'apartment_door_enter'
  | 'apartment_exit'
  | 'furniture_storage'
  | 'bed_sleep'
  | 'furniture_pickup'
  | 'furniture_rotate'
  | 'tow_rope_detach';

export interface InteractionTarget {
  type: InteractionType;
  primaryKey: 'E' | 'F' | 'R';
  actionTitle: string;
  detail?: string;
  x: number;
  y: number;
  dist: number;
  angleDiff: number;
  score: number;
  data?: any;
  availableKeys?: { key: 'E' | 'F' | 'R'; title: string }[];
}

/**
 * Calculates angle difference normalized to [0, PI]
 */
export function getAngleDiff(angle1: number, angle2: number): number {
  let diff = Math.abs((angle1 - angle2 + Math.PI) % (Math.PI * 2) - Math.PI);
  return diff;
}

export function distanceToRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): number {
  const cx = Math.max(rx, Math.min(x, rx + rw));
  const cy = Math.max(ry, Math.min(y, ry + rh));
  return Math.hypot(x - cx, y - cy);
}

/**
 * Checks if a target is physically reachable and in front of the player.
 * - maxDist: physical reach distance (typically 38-48px)
 * - maxAngleCone: field of view / reach cone (typically 1.1 to 1.3 rad, ~65-75 degrees)
 */
export function isTargetInPhysicalReach(
  px: number,
  py: number,
  playerAngle: number,
  tx: number,
  ty: number,
  maxDist: number = 46,
  maxAngleCone: number = 1.3,
  mouseWorldPos?: { x: number; y: number } | null
): { inReach: boolean; dist: number; angleDiff: number; score: number } {
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(tx) || !Number.isFinite(ty)) {
    return { inReach: false, dist: 99999, angleDiff: Math.PI, score: 99999 };
  }

  const dx = tx - px;
  const dy = ty - py;
  const dist = Math.hypot(dx, dy);

  if (!Number.isFinite(dist) || dist > maxDist) {
    return { inReach: false, dist: Number.isFinite(dist) ? dist : 99999, angleDiff: Math.PI, score: 99999 };
  }

  const targetAngle = Math.atan2(dy, dx);
  const angleDiff = getAngleDiff(targetAngle, playerAngle);

  // Direct mouse hover bonus: if mouse cursor is within 26px of target and player is within reach
  let mouseBonus = 0;
  let isMouseHovering = false;
  if (mouseWorldPos && Number.isFinite(mouseWorldPos.x) && Number.isFinite(mouseWorldPos.y)) {
    const mouseDist = Math.hypot(mouseWorldPos.x - tx, mouseWorldPos.y - ty);
    if (mouseDist < 26) {
      isMouseHovering = true;
      mouseBonus = 40; // Significant bonus
    }
  }

  // Target must be in front of player (or mouse hovered)
  if (!Number.isFinite(angleDiff) || (angleDiff > maxAngleCone && !isMouseHovering)) {
    return { inReach: false, dist, angleDiff: Number.isFinite(angleDiff) ? angleDiff : Math.PI, score: 99999 };
  }

  // Score: lower is better. Heavily favors closer and better aligned targets
  const score = dist + angleDiff * 16 - mouseBonus;
  if (!Number.isFinite(score)) {
    return { inReach: false, dist, angleDiff, score: 99999 };
  }

  return { inReach: true, dist, angleDiff, score };
}

/**
 * Resolves the single most relevant physical world interaction in front of the player.
 */
export function findActiveInteraction(
  player: Player,
  world: GameWorld,
  mouseWorldPos?: { x: number; y: number } | null,
  filterKey?: 'E' | 'F' | 'R'
): InteractionTarget | null {
  if (!player) return null;

  // If inside vehicle, simple in-vehicle prompt
  if (player.isInVehicle) {
    return {
      type: 'exit_vehicle',
      primaryKey: 'F',
      actionTitle: 'Выйти из автомобиля',
      detail: 'Нажмите [F] для выхода, [E] для меню авто',
      x: player.x,
      y: player.y,
      dist: 0,
      angleDiff: 0,
      score: 0
    };
  }

  const px = player.x;
  const py = player.y;
  const facing = player.angle;

  const candidates: InteractionTarget[] = [];

  // ==========================================
  // 1. WATER HOSE (Water truck / Tanker trailer)
  // ==========================================
  if (player.heldWaterHose) {
    const nearWaterVeh = getNearbyWaterVehicle(px, py, world);
    if (nearWaterVeh && nearWaterVeh.vehicle.id === player.heldWaterHose.vehicleId) {
      const anchor = getVehicleWaterHoseAnchor(nearWaterVeh.vehicle);
      const connX = anchor ? anchor.x : nearWaterVeh.vehicle.x;
      const connY = anchor ? anchor.y : nearWaterVeh.vehicle.y;
      const reach = isTargetInPhysicalReach(px, py, facing, connX, connY, 48, 1.4, mouseWorldPos);
      if (reach.inReach) {
        candidates.push({
          type: 'water_hose_stow',
          primaryKey: 'E',
          actionTitle: 'Смотать поливочный шланг',
          detail: 'Закрепить шланг на штатное место',
          x: connX,
          y: connY,
          dist: reach.dist,
          angleDiff: reach.angleDiff,
          score: reach.score - 15,
          data: nearWaterVeh.vehicle
        });
      }
    }
  } else {
    const nearWaterVeh = getNearbyWaterVehicle(px, py, world);
    if (nearWaterVeh) {
      const anchor = getVehicleWaterHoseAnchor(nearWaterVeh.vehicle);
      const connX = anchor ? anchor.x : nearWaterVeh.vehicle.x;
      const connY = anchor ? anchor.y : nearWaterVeh.vehicle.y;
      const reach = isTargetInPhysicalReach(px, py, facing, connX, connY, 48, 1.4, mouseWorldPos);
      if (reach.inReach) {
        const veh = nearWaterVeh.vehicle;
        const vol = Math.round(veh.fluidTank?.currentVolume ?? veh.fluidTank?.currentAmount ?? 0);
        const name = veh.type === 'truck_water'? 'насосной станции водовоза': 'крана бочки-цистерны';
        candidates.push({
          type: 'water_hose_take',
          primaryKey: 'E',
          actionTitle: 'Взять поливочный шланг',
          detail: `С ${name} (Вода: ${vol} л)`,
          x: connX,
          y: connY,
          dist: reach.dist,
          angleDiff: reach.angleDiff,
          score: reach.score - 10,
          data: veh
        });
      }
    }
  }

  // ==========================================
  // 1b. TOW ROPE INTERACTIONS (Connect / Detach)
  // ==========================================
  if (world.towingRopes) {
    for (const rope of world.towingRopes) {
      const vehA = world.vehicles.find(v => v.id === rope.vehicleAId);
      const vehB = world.vehicles.find(v => v.id === rope.vehicleBId);
      if (vehA) {
        const cfgA = CAR_CONFIGS[vehA.type] || CAR_CONFIGS.sedan;
        const cosA = Math.cos(vehA.angle);
        const sinA = Math.sin(vehA.angle);
        const ax = vehA.x + (rope.isFrontA ? 1 : -1) * cosA * (cfgA.length / 2 + 1);
        const ay = vehA.y + (rope.isFrontA ? 1 : -1) * sinA * (cfgA.length / 2 + 1);
        const reachA = isTargetInPhysicalReach(px, py, facing, ax, ay, 46, 1.4, mouseWorldPos);
        if (reachA.inReach) {
          candidates.push({
            type: 'tow_rope_detach',
            primaryKey: 'E',
            actionTitle: 'Отцепить буксировочный трос',
            detail: `Снять трос с ${CAR_CONFIGS[vehA.type]?.name || vehA.type}`,
            x: ax,
            y: ay,
            dist: reachA.dist,
            angleDiff: reachA.angleDiff,
            score: reachA.score - 25,
            data: { rope, isEndA: true }
          });
        }
      }
      if (vehB) {
        const cfgB = CAR_CONFIGS[vehB.type] || CAR_CONFIGS.sedan;
        const cosB = Math.cos(vehB.angle);
        const sinB = Math.sin(vehB.angle);
        const bx = vehB.x + (rope.isFrontB ? 1 : -1) * cosB * (cfgB.length / 2 + 1);
        const by = vehB.y + (rope.isFrontB ? 1 : -1) * sinB * (cfgB.length / 2 + 1);
        const reachB = isTargetInPhysicalReach(px, py, facing, bx, by, 46, 1.4, mouseWorldPos);
        if (reachB.inReach) {
          candidates.push({
            type: 'tow_rope_detach',
            primaryKey: 'E',
            actionTitle: 'Отцепить буксировочный трос',
            detail: `Снять трос с ${CAR_CONFIGS[vehB.type]?.name || vehB.type}`,
            x: bx,
            y: by,
            dist: reachB.dist,
            angleDiff: reachB.angleDiff,
            score: reachB.score - 25,
            data: { rope, isEndA: false }
          });
        }
      }
    }
  }

  // If the player is carrying/dragging a tow rope, allow them to drop it/stow it back
  if (player.heldTowRope) {
    const veh = world.vehicles.find(v => v.id === player.heldTowRope?.vehicleId);
    if (veh) {
      const cfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
      const cosA = Math.cos(veh.angle);
      const sinA = Math.sin(veh.angle);
      const ax = veh.x + (player.heldTowRope.isFront ? 1 : -1) * cosA * (cfg.length / 2 + 1);
      const ay = veh.y + (player.heldTowRope.isFront ? 1 : -1) * sinA * (cfg.length / 2 + 1);
      const reach = isTargetInPhysicalReach(px, py, facing, ax, ay, 46, 1.4, mouseWorldPos);
      if (reach.inReach) {
        candidates.push({
          type: 'tow_rope_detach', // Same type, will detach/cancel dragging
          primaryKey: 'E',
          actionTitle: 'Снять буксировочный трос',
          detail: `Отцепить и смотать обратно`,
          x: ax,
          y: ay,
          dist: reach.dist,
          angleDiff: reach.angleDiff,
          score: reach.score - 30,
          data: { isDragging: true }
        });
      }
    }
  }

  // ==========================================
  // 2. GAS STATION & VEHICLE FUELING
  // ==========================================
  if (player.heldFuelNozzle) {
    // 2a. Insert nozzle into vehicle fuel tank cap
    const nearbyVeh = getNearbyVehicleForFueling(px, py, world);
    if (nearbyVeh) {
      const capPos = getVehicleFuelCapPosition(nearbyVeh);
      const reach = isTargetInPhysicalReach(px, py, facing, capPos.x, capPos.y, 45, 1.35, mouseWorldPos);
      if (reach.inReach) {
        const grade = FUEL_GRADES[player.heldFuelNozzle.fuelType];
        const vehName = CAR_CONFIGS[nearbyVeh.type]?.name || nearbyVeh.type;
        candidates.push({
          type: 'fuel_insert',
          primaryKey: 'E',
          actionTitle: `Вставить пистолет [${grade?.nameRu || ''}] в бак`,
          detail: vehName,
          x: capPos.x,
          y: capPos.y,
          dist: reach.dist,
          angleDiff: reach.angleDiff,
          score: reach.score - 20, // Highest priority when holding nozzle
          data: nearbyVeh
        });
      }
    }

    // 2b. Return nozzle to pump
    const nearPump = getNearbyGasPump(px, py, world);
    if (nearPump) {
      const reach = isTargetInPhysicalReach(px, py, facing, nearPump.x, nearPump.y, 45, 1.35, mouseWorldPos);
      if (reach.inReach) {
        candidates.push({
          type: 'pump_return_nozzle',
          primaryKey: 'E',
          actionTitle: `Повесить пистолет на колонку №${nearPump.pumpNumber}`,
          detail: 'Вернуть топливораздаточный кран',
          x: nearPump.x,
          y: nearPump.y,
          dist: reach.dist,
          angleDiff: reach.angleDiff,
          score: reach.score - 15,
          data: nearPump
        });
      }
    }
  } else {
    // 2c. Vehicle currently has inserted nozzle -> can remove
    if (world.vehicles) {
      for (const v of world.vehicles) {
        if (v.fuelingState?.nozzleInTank) {
          const capPos = getVehicleFuelCapPosition(v);
          const reach = isTargetInPhysicalReach(px, py, facing, capPos.x, capPos.y, 45, 1.35, mouseWorldPos);
          if (reach.inReach) {
            const pump = world.gasPumps?.find(gp => gp.id === v.fuelingState?.pumpId);
            const vehName = CAR_CONFIGS[v.type]?.name || v.type;
            const isPumping = pump?.isPumping;
            candidates.push({
              type: 'fuel_remove',
              primaryKey: 'E',
              actionTitle: isPumping ? 'Заправка в процессе...': 'Извлечь пистолет из бензобака',
              detail: isPumping ? `${pump?.displayLiters?.toFixed(1)} / ${pump?.targetLiters} л`: vehName,
              x: capPos.x,
              y: capPos.y,
              dist: reach.dist,
              angleDiff: reach.angleDiff,
              score: reach.score - 12,
              data: { vehicle: v, pump }
            });
            break;
          }
        }
      }
    }

    // 2d. Take nozzle from pump
    const nearPump = getNearbyGasPump(px, py, world);
    if (nearPump) {
      const reach = isTargetInPhysicalReach(px, py, facing, nearPump.x, nearPump.y, 45, 1.35, mouseWorldPos);
      if (reach.inReach) {
        candidates.push({
          type: 'pump_take_nozzle',
          primaryKey: 'E',
          actionTitle: `Взять пистолет (Колонка №${nearPump.pumpNumber})`,
          detail: 'Выбрать вид топлива',
          x: nearPump.x,
          y: nearPump.y,
          dist: reach.dist,
          angleDiff: reach.angleDiff,
          score: reach.score - 8,
          data: nearPump
        });
      }
    }

    // 2e. Gas station cashier desk
    if (isPlayerNearGasStationCashier(player, world)) {
      candidates.push({
        type: 'gas_cashier',
        primaryKey: 'E',
        actionTitle: 'Касса АЗС / Оплата топлива',
        detail: 'Нефть-Магистраль 24/7',
        x: px,
        y: py,
        dist: 0,
        angleDiff: 0,
        score: -5,
        data: null
      });
    }
  }

  // ==========================================
  // 3. VEHICLES (Door Enter / Hood Open)
  // ==========================================
  if (world.vehicles) {
    for (const veh of world.vehicles) {
      const cfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
      const cos = Math.cos(veh.angle);
      const sin = Math.sin(veh.angle);

      // 3a. Front Engine Hood Check
      if (!isTrailerVehicle(veh)) {
        const hoodDistFromCenter = cfg.length * 0.42;
        const hoodX = veh.x + cos * hoodDistFromCenter;
        const hoodY = veh.y + sin * hoodDistFromCenter;
        const hoodReach = isTargetInPhysicalReach(px, py, facing, hoodX, hoodY, 44, 1.3, mouseWorldPos);
        if (hoodReach.inReach) {
          candidates.push({
            type: 'open_hood',
            primaryKey: 'E',
            actionTitle: `Открыть капот (${cfg.name})`,
            detail: 'Осмотр двигателя, уровней жидкостей и АКБ',
            x: hoodX,
            y: hoodY,
            dist: hoodReach.dist,
            angleDiff: hoodReach.angleDiff,
            score: hoodReach.score - 4,
            data: veh
          });
        }
      }

      // 3b. Vehicle Doors (Driver & Passenger side)
      // Driver side door:
      const sideOffset = cfg.width * 0.52 + 10;
      const longitudinalOffset = cfg.length * 0.08;
      const driverDoorX = veh.x + cos * longitudinalOffset - sin * sideOffset;
      const driverDoorY = veh.y + sin * longitudinalOffset + cos * sideOffset;

      // Passenger side door:
      const passDoorX = veh.x + cos * longitudinalOffset + sin * sideOffset;
      const passDoorY = veh.y + sin * longitudinalOffset - cos * sideOffset;

      const dReach = isTargetInPhysicalReach(px, py, facing, driverDoorX, driverDoorY, 48, 1.35, mouseWorldPos);
      const pReach = isTargetInPhysicalReach(px, py, facing, passDoorX, passDoorY, 48, 1.35, mouseWorldPos);

      let bestDoorReach = dReach.inReach ? dReach : (pReach.inReach ? pReach : null);
      let doorX = driverDoorX;
      let doorY = driverDoorY;
      if (pReach.inReach && (!bestDoorReach || pReach.score < bestDoorReach.score)) {
        bestDoorReach = pReach;
        doorX = passDoorX;
        doorY = passDoorY;
      }

      // If close to center of vehicle, also allow entering if close enough
      if (!bestDoorReach) {
        const centerReach = isTargetInPhysicalReach(px, py, facing, veh.x, veh.y, cfg.width * 0.7 + 25, 1.45, mouseWorldPos);
        if (centerReach.inReach) {
          bestDoorReach = centerReach;
          doorX = veh.x;
          doorY = veh.y;
        }
      }

      if (bestDoorReach && bestDoorReach.inReach) {
        candidates.push({
          type: 'enter_vehicle',
          primaryKey: 'F',
          actionTitle: `Сесть в автомобиль (${cfg.name})`,
          detail: `Дверь водителя / салон`,
          x: doorX,
          y: doorY,
          dist: bestDoorReach.dist,
          angleDiff: bestDoorReach.angleDiff,
          score: bestDoorReach.score - 6,
          data: veh
        });
      }
    }
  }

  // ==========================================
  // 4. BUILDINGS (Doors, Stairs, Elevators, Counters, Furniture)
  // ==========================================
  if (player.isInsideBuilding && player.insideBuildingId) {
    // INSIDE BUILDING OR APARTMENT
    const bld = world.buildings?.find(b => b.id === player.insideBuildingId);
    if (bld) {
      const currentFloor = player.currentFloor || 0;
      const layout = getBuildingLayout(bld, currentFloor, player.insideApartmentId);

      // 4a. Exit Doors (Exits)
      const exits = (layout.exits && layout.exits.length > 0) ? layout.exits : (layout.exitZone ? [layout.exitZone] : []);
      for (const ex of exits) {
        const exitWorldX = bld.x + ex.x + ex.width / 2;
        const exitWorldY = bld.y + ex.y + ex.height / 2;
        const reach = isTargetInPhysicalReach(px, py, facing, exitWorldX, exitWorldY, 46, 1.4, mouseWorldPos);
        if (reach.inReach) {
          if (player.isInsideApartment) {
            candidates.push({
              type: 'apartment_exit',
              primaryKey: 'F',
              actionTitle: bld.type === 'suburban' ? 'Выйти во двор' : 'Выйти на лестничную площадку',
              detail: 'Выход из квартиры',
              x: exitWorldX,
              y: exitWorldY,
              dist: reach.dist,
              angleDiff: reach.angleDiff,
              score: reach.score - 12,
              data: { bld, aptId: player.insideApartmentId }
            });
          } else {
            candidates.push({
              type: 'exit_building',
              primaryKey: 'F',
              actionTitle: 'Выйти на улицу',
              detail: bld.nameRu || 'Выход из здания',
              x: exitWorldX,
              y: exitWorldY,
              dist: reach.dist,
              angleDiff: reach.angleDiff,
              score: reach.score - 12,
              data: bld
            });
          }
          break;
        }
      }

      // 4b. Elevators and Stairs (only in public corridors)
      if (!player.isInsideApartment) {
        const totalFloors = getBuildingFloorsCount(bld);
        if (layout.elevators && layout.elevators.length > 0) {
          for (const el of layout.elevators) {
            const elWorldX = bld.x + el.x + el.width / 2;
            const elWorldY = bld.y + el.y + el.height / 2;
            const reach = isTargetInPhysicalReach(px, py, facing, elWorldX, elWorldY, 44, 1.4, mouseWorldPos);
            if (reach.inReach) {
              candidates.push({
                type: 'building_elevator',
                primaryKey: 'E',
                actionTitle: 'Вызвать лифт',
                detail: `Этаж ${currentFloor + 1} из ${totalFloors}`,
                x: elWorldX,
                y: elWorldY,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 8,
                data: { sz: el, bld }
              });
              break;
            }
          }
        }
        if (layout.stairs && layout.stairs.length > 0) {
          for (const st of layout.stairs) {
            const stWorldX = bld.x + st.x + st.width / 2;
            const stWorldY = bld.y + st.y + st.height / 2;
            const reach = isTargetInPhysicalReach(px, py, facing, stWorldX, stWorldY, 44, 1.4, mouseWorldPos);
            if (reach.inReach) {
              candidates.push({
                type: 'building_elevator',
                primaryKey: 'E',
                actionTitle: 'Лестничный марш',
                detail: `Этаж ${currentFloor + 1} из ${totalFloors}`,
                x: stWorldX,
                y: stWorldY,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 8,
                data: { sz: st, bld }
              });
              break;
            }
          }
        }
      }

      // 4c. Interior Furniture: Storage, Beds, Sofas, Counters, Registers
      if (layout.furniture && layout.furniture.length > 0) {
        for (let fIdx = 0; fIdx < layout.furniture.length; fIdx++) {
          const furn = layout.furniture[fIdx];
          const fw = furn.width || 20;
          const fh = furn.height || 20;

          // If player is inside the building but NOT inside any apartment,
          // prevent interacting with any furniture that is inside any apartment room!
          if (!player.isInsideApartment && layout.rooms && layout.rooms.length > 0) {
            const fx = furn.x + fw / 2;
            const fy = furn.y + fh / 2;
            const isInAnyAptRoom = layout.rooms.some(rm => {
              if (rm && rm.name && (rm.name.startsWith('Кв.') || rm.name.startsWith('Кв. '))) {
                return fx >= rm.x && fx <= (rm.x + rm.width) && fy >= rm.y && fy <= (rm.y + rm.height);
              }
              return false;
            });
            if (isInAnyAptRoom) {
              continue; // Skip this furniture interaction completely!
            }
          }

          const furnWorldX = bld.x + furn.x + fw / 2;
          const furnWorldY = bld.y + furn.y + fh / 2;
          const reach = isTargetInPhysicalReach(px, py, facing, furnWorldX, furnWorldY, 52, 1.45, mouseWorldPos);

          if (reach.inReach) {
            // Bed / Sleep interaction
            if (
              furn.type === 'bed' ||
              furn.type === 'sofa' ||
              furn.type === 'kids_bed' ||
              furn.type === 'bed_hospital' ||
              furn.type === 'jail_cot'
            ) {
              const isSofa = furn.type === 'sofa';
              candidates.push({
                type: 'bed_sleep',
                primaryKey: 'E',
                actionTitle: isSofa ? 'Прилечь на диван' : 'Лечь на кровать',
                detail: 'Сон, отдых и восстановление сил',
                x: furnWorldX,
                y: furnWorldY,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 15,
                data: {
                  bld,
                  currentFloor,
                  furn,
                  furnitureIndex: fIdx,
                  furnitureType: furn.type,
                  aptId: player.insideApartmentId,
                  worldX: furnWorldX,
                  worldY: furnWorldY
                }
              });
            }

            // Furniture Storage interaction (Wardrobe, Fridge, Kitchen cabinets, Nightstands, Bookshelves, Desks, etc.)
            const storageCfg = FURNITURE_STORAGE_CONFIGS[furn.type];
            if (storageCfg) {
              candidates.push({
                type: 'furniture_storage',
                primaryKey: 'E',
                actionTitle: `Открыть ${storageCfg.nameRu.split(' / ')[0]}`,
                detail: `Хранилище предметов (${storageCfg.capacityL} л / ${storageCfg.maxWeightKg} кг)`,
                x: furnWorldX,
                y: furnWorldY,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 14,
                data: {
                  bld,
                  currentFloor,
                  furn,
                  furnitureIndex: fIdx,
                  furnitureType: furn.type,
                  aptId: player.insideApartmentId,
                  customTitle: storageCfg.nameRu
                }
              });
            }

            // Agency desks & shop registers
            const isAgencyFurniture = bld.type === 'real_estate_agency' && (furn.type === 'desk_reception' || furn.type === 'computer' || furn.type === 'desk' || furn.type === 'table');
            if (furn.type === 'cash_register' || furn.type === 'counter' || furn.type === 'vending_machine' || isAgencyFurniture) {
              if (bld.type === 'real_estate_agency') {
                candidates.push({
                  type: 'real_estate_agency',
                  primaryKey: 'E',
                  actionTitle: 'Росреестр & Каталог Квартир',
                  detail: 'Оформить сделку купли-продажи недвижимости',
                  x: furnWorldX,
                  y: furnWorldY,
                  dist: reach.dist,
                  angleDiff: reach.angleDiff,
                  score: reach.score - 5,
                  data: { bld }
                });
              } else if (furn.type === 'cash_register' || furn.type === 'counter' || furn.type === 'vending_machine') {
                candidates.push({
                  type: 'building_shop',
                  primaryKey: 'E',
                  actionTitle: furn.type === 'vending_machine' ? 'Торговый автомат' : 'Касса / Прилавок',
                  detail: bld.nameRu || 'Магазин',
                  x: furnWorldX,
                  y: furnWorldY,
                  dist: reach.dist,
                  angleDiff: reach.angleDiff,
                  score: reach.score - 5,
                  data: { zone: { shopType: bld.type === 'police_station' ? 'gear_shop' : 'supermarket' }, bld }
                });
              }
            }

            // Furniture management (pickup / rotate) inside owned apartments
            if (player.isInsideApartment && player.insideApartmentId) {
              const apt = getApartmentById(player.insideApartmentId);
              if (apt && apt.isOwned) {
                const staticCount = apt.layout?.furniture?.length || 0;
                const isDeveloperFurniture = fIdx < staticCount;

                candidates.push({
                  type: 'furniture_pickup',
                  primaryKey: 'F',
                  actionTitle: isDeveloperFurniture ? 'Убрать мебель застройщика' : 'Забрать мебель в руки/инвентарь',
                  detail: isDeveloperFurniture ? 'Демонтировать и забрать в инвентарь' : 'Переместить или убрать мебель',
                  x: furnWorldX,
                  y: furnWorldY,
                  dist: reach.dist,
                  angleDiff: reach.angleDiff,
                  score: reach.score - 6,
                  data: {
                    bld,
                    currentFloor,
                    furnitureIndex: fIdx,
                    furnitureType: furn.type,
                    aptId: apt.id,
                    isDeveloperFurniture
                  }
                });

                candidates.push({
                  type: 'furniture_rotate',
                  primaryKey: 'R',
                  actionTitle: isDeveloperFurniture ? 'Повернуть мебель застройщика' : 'Повернуть мебель',
                  detail: 'Повернуть на 45°',
                  x: furnWorldX,
                  y: furnWorldY,
                  dist: reach.dist,
                  angleDiff: reach.angleDiff,
                  score: reach.score - 5,
                  data: {
                    bld,
                    currentFloor,
                    furnitureIndex: fIdx,
                    furnitureType: furn.type,
                    aptId: apt.id,
                    isDeveloperFurniture
                  }
                });
              }
            }
          }
        }
      }

      // 4d. Apartment Doors inside public corridors (only if not already inside an apartment)
      if (!player.isInsideApartment) {
        const apartments = getCityApartments();
        const floorApts = apartments.filter(a => a.buildingId === bld.id && a.floor === currentFloor);
        for (const apt of floorApts) {
          const rm = layout.rooms?.find(r => r.name === `Кв. ${apt.apartmentNumber}` || r.name === `Кв.${apt.apartmentNumber}`);
          if (rm) {
            const playerLocalX = player.x - bld.x;
            const playerLocalY = player.y - bld.y;
            
            const door = getApartmentDoorSegment(rm, layout.walls);
            const doorLocalX = door ? (door.x1 + door.x2) / 2 : rm.x + rm.width / 2;
            const doorLocalY = door ? (door.y1 + door.y2) / 2 : rm.y + rm.height / 2;
            const dist = Math.hypot(playerLocalX - doorLocalX, playerLocalY - doorLocalY);
            
            if (dist < 32) {
              const hasKey = hasPlayerApartmentKey(player, apt);
              const doorWorldX = bld.x + doorLocalX;
              const doorWorldY = bld.y + doorLocalY;
              
              if (apt.isLocked) {
                if (hasKey) {
                  candidates.push({
                    type: 'apartment_door_lock',
                    primaryKey: 'E',
                    actionTitle: `Отпереть замок: Кв. №${apt.apartmentNumber}`,
                    detail: `Замок: ${apt.lockCode} (${apt.address})`,
                    x: doorWorldX,
                    y: doorWorldY,
                    dist: dist,
                    angleDiff: 0,
                    score: 100 - dist,
                    data: { apt, hasKey }
                  });
                } else {
                  candidates.push({
                    type: 'apartment_door_locked_nokey',
                    primaryKey: 'E',
                    actionTitle: `Дверь заперта: Кв. №${apt.apartmentNumber} (Нет ключа)`,
                    detail: `Требуется ключ от квартиры: ${apt.address}`,
                    x: doorWorldX,
                    y: doorWorldY,
                    dist: dist,
                    angleDiff: 0,
                    score: 90 - dist,
                    data: { apt }
                  });
                }
              } else {
                candidates.push({
                  type: 'apartment_door_enter',
                  primaryKey: 'F',
                  actionTitle: `Войти в квартиру №${apt.apartmentNumber}`,
                  detail: `Адрес: ${apt.address}`,
                  x: doorWorldX,
                  y: doorWorldY,
                  dist: dist,
                  angleDiff: 0,
                  score: 95 - dist,
                  data: { apt }
                });
                if (hasKey) {
                  candidates.push({
                    type: 'apartment_door_lock',
                    primaryKey: 'E',
                    actionTitle: `Запереть замок: Кв. №${apt.apartmentNumber}`,
                    detail: `Замок: ${apt.lockCode}`,
                    x: doorWorldX,
                    y: doorWorldY,
                    dist: dist,
                    angleDiff: 0,
                    score: 100 - dist,
                    data: { apt, hasKey }
                  });
                }
              }
            }
          }
        }
      }
    }
  } else {
    // OUTSIDE: Check building entrances
    if (world.buildings) {
      for (const bld of world.buildings) {
        if (bld.type === 'park_monument') continue;
        const ents = getAllBuildingEntrances(bld);
        for (const ent of ents) {
          const reach = isTargetInPhysicalReach(px, py, facing, ent.x, ent.y, 44, 1.35, mouseWorldPos);
          if (reach.inReach) {
            // Dedicated Real Estate Agency Building
            if (bld.type === 'real_estate_agency' || bld.id === 'bld_real_estate_agency_main') {
              candidates.push({
                type: 'real_estate_agency',
                primaryKey: 'E',
                actionTitle: 'Агентство Недвижимости «ГлавНедвижимость»',
                detail: 'Покупка квартир, Росреестр, получение ключей и выписок ЕГРН',
                x: ent.x,
                y: ent.y,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 2,
                data: { bld }
              });
              candidates.push({
                type: 'enter_building',
                primaryKey: 'F',
                actionTitle: 'Войти в офис Агентства Недвижимости',
                detail: 'ГлавНедвижимость & Росреестр',
                x: ent.x,
                y: ent.y,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 4,
                data: { bld, ent }
              });
              break;
            }

            // Check if this building corresponds to a cottage or apartment building
            const apartments = getCityApartments();
            const isResidential = bld.type === 'panel_apartment' || bld.type === 'brick_residential' || bld.type === 'modern_residential' || bld.type === 'suburban';

            if (bld.type === 'suburban') {
              const apt = apartments.find(a => a.buildingId === bld.id);
              if (apt) {
                const hasKey = hasPlayerApartmentKey(player, apt);
                if (apt.isLocked) {
                  if (hasKey) {
                    candidates.push({
                      type: 'apartment_door_lock',
                      primaryKey: 'E',
                      actionTitle: `Отпереть коттедж ключом`,
                      detail: `Замок: ${apt.lockCode} (${apt.address})`,
                      x: ent.x,
                      y: ent.y,
                      dist: reach.dist,
                      angleDiff: reach.angleDiff,
                      score: reach.score - 1,
                      data: { apt, hasKey }
                    });
                    candidates.push({
                      type: 'apartment_door_locked_nokey',
                      primaryKey: 'F',
                      actionTitle: `Коттедж заперт`,
                      detail: `Отприте замок ключом на клавишу [E]`,
                      x: ent.x,
                      y: ent.y,
                      dist: reach.dist,
                      angleDiff: reach.angleDiff,
                      score: reach.score - 3,
                      data: { apt }
                    });
                  } else {
                    candidates.push({
                      type: 'apartment_door_locked_nokey',
                      primaryKey: 'E',
                      actionTitle: `Коттедж заперт (Нет ключа)`,
                      detail: `Требуется стальной ключ: ${apt.address}`,
                      x: ent.x,
                      y: ent.y,
                      dist: reach.dist,
                      angleDiff: reach.angleDiff,
                      score: reach.score - 1,
                      data: { apt }
                    });
                  }
                } else {
                  candidates.push({
                    type: 'apartment_door_enter',
                    primaryKey: 'F',
                    actionTitle: `Войти в коттедж`,
                    detail: `Адрес: ${apt.address}`,
                    x: ent.x,
                    y: ent.y,
                    dist: reach.dist,
                    angleDiff: reach.angleDiff,
                    score: reach.score - 3,
                    data: { apt }
                  });
                  if (hasKey) {
                    candidates.push({
                      type: 'apartment_door_lock',
                      primaryKey: 'E',
                      actionTitle: `Запереть коттедж ключом`,
                      detail: `Замок: ${apt.lockCode}`,
                      x: ent.x,
                      y: ent.y,
                      dist: reach.dist,
                      angleDiff: reach.angleDiff,
                      score: reach.score - 2,
                      data: { apt, hasKey }
                    });
                  }
                }
              }
            } else if (isResidential) {
              // Public подъезд entrance of a residential panel/brick/modern apartment building
              candidates.push({
                type: 'enter_building',
                primaryKey: 'F',
                actionTitle: 'Войти в подъезд',
                detail: bld.nameRu || (bld.type === 'panel_apartment' ? 'Панельный дом' : bld.type === 'brick_residential' ? 'Кирпичный дом' : 'Современный ЖК'),
                x: ent.x,
                y: ent.y,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 1,
                data: { bld, ent }
              });
            } else {
              // Standard public commercial / service building
              let bldTypeName = 'Здание';
              if (bld.type === 'shop') bldTypeName = 'Магазин';
              else if (bld.type === 'hospital') bldTypeName = 'Больница';
              else if (bld.type === 'police_station') bldTypeName = 'Полиция';
              else if (bld.type === 'car_dealership') bldTypeName = 'Автосалон';
              else if (bld.nameRu) bldTypeName = bld.nameRu;

              candidates.push({
                type: 'enter_building',
                primaryKey: 'F',
                actionTitle: `Войти в ${bldTypeName}`,
                detail: bld.nameRu || 'Входная дверь',
                x: ent.x,
                y: ent.y,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 6,
                data: { bld, ent }
              });
            }
            break;
          }
        }
      }
    }
  }

  // ==========================================
  // 5. GROUND ITEMS (Dropped weapons, food, tools)
  // ==========================================
  if (world.groundItems && world.groundItems.length > 0) {
    for (const gi of world.groundItems) {
      const reach = isTargetInPhysicalReach(px, py, facing, gi.x, gi.y, 42, 1.3, mouseWorldPos);
      if (reach.inReach) {
        candidates.push({
          type: 'pickup_item',
          primaryKey: 'E',
          actionTitle: `Подобрать: ${gi.item.nameRu}`,
          detail: gi.item.weight ? `${gi.item.weight} кг`: undefined,
          x: gi.x,
          y: gi.y,
          dist: reach.dist,
          angleDiff: reach.angleDiff,
          score: reach.score,
          data: gi
        });
      }
    }
  }

  // ==========================================
  // 6. STREET LITTER (Bottles, cans, wrappers)
  // ==========================================
  if (world.litter && world.litter.length > 0) {
    const litterNames: Record<string, string> = {
      can: 'жестяная банка',
      bottle: 'бутылка',
      cup: 'стаканчик',
      paper: 'бумага',
      newspaper: 'газета',
      wrapper: 'обёртка',
      box: 'коробка',
      bag: 'пакет',
      coffee: 'стакан кофе',
      mask: 'маска',
      butt: 'окурок',
      leaf: 'листва'};
    for (const lit of world.litter) {
      const reach = isTargetInPhysicalReach(px, py, facing, lit.x, lit.y, 40, 1.3, mouseWorldPos);
      if (reach.inReach) {
        const litName = litterNames[lit.type] || 'бытовой мусор';
        candidates.push({
          type: 'pickup_litter',
          primaryKey: 'E',
          actionTitle: `Собрать: ${litName}`,
          detail: 'Для эко-сдачи или утилизации',
          x: lit.x,
          y: lit.y,
          dist: reach.dist,
          angleDiff: reach.angleDiff,
          score: reach.score + 5,
          data: lit
        });
      }
    }
  }

  // ==========================================
  // 7. TRASH BINS & ECO-FANDOMAT
  // ==========================================
  if (world.props) {
    for (const prop of world.props) {
      if (prop.type === 'dumpster') {
        const reach = isTargetInPhysicalReach(px, py, facing, prop.x, prop.y, 45, 1.35, mouseWorldPos);
        if (reach.inReach) {
          candidates.push({
            type: 'eco_recycle',
            primaryKey: 'E',
            actionTitle: 'Сдать тару в эко-контейнер',
            detail: 'Получить +$5 за банку/бутылку',
            x: prop.x,
            y: prop.y,
            dist: reach.dist,
            angleDiff: reach.angleDiff,
            score: reach.score - 5,
            data: prop
          });
        }
      } else if (prop.type === 'trash_can') {
        const reach = isTargetInPhysicalReach(px, py, facing, prop.x, prop.y, 45, 1.35, mouseWorldPos);
        if (reach.inReach) {
          candidates.push({
            type: 'trash_throw',
            primaryKey: 'E',
            actionTitle: 'Выбросить мусор в урну',
            detail: 'Очистить руки и карманы от мусора',
            x: prop.x,
            y: prop.y,
            dist: reach.dist,
            angleDiff: reach.angleDiff,
            score: reach.score,
            data: prop
          });
        }
      }
    }
  }

  // ==========================================
  // 5. TRAILERS (Manual Hitch/Unhitch, Plug, Brakes, Handbrake)
  // ==========================================
  if (world.vehicles) {
    for (const veh of world.vehicles) {
      if (isTrailerVehicle(veh)) {
        const otherCfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
        const couplerOffset = veh.couplerOffset !== undefined ? veh.couplerOffset : (otherCfg.length / 2 + 8);
        const couplerX = veh.x + Math.cos(veh.angle) * couplerOffset;
        const couplerY = veh.y + Math.sin(veh.angle) * couplerOffset;

        const reach = isTargetInPhysicalReach(px, py, facing, couplerX, couplerY, 48, 1.4, mouseWorldPos);
        if (reach.inReach) {
          const trailer = veh;
          const isHitched = !!trailer.towedById;
          const towingVeh = isHitched ? world.vehicles.find(v => v.id === trailer.towedById) : null;

          // 5a. Mechanical Hitching/Unhitching
          if (!isHitched) {
            let nearestTowing: Vehicle | null = null;
            let minDist = 48;
            for (const other of world.vehicles) {
              if (other.id === trailer.id || isTrailerVehicle(other)) continue;
              if (!canVehicleHaveHitch(other)) continue;
              if (other.trailerId) continue;

              const oCfg = CAR_CONFIGS[other.type] || CAR_CONFIGS.sedan;
              const hOffset = other.hitchOffset !== undefined ? other.hitchOffset : (-oCfg.length / 2 - 2);
              const hX = other.x + Math.cos(other.angle) * hOffset;
              const hY = other.y + Math.sin(other.angle) * hOffset;

              const d = Math.hypot(couplerX - hX, couplerY - hY);
              if (d < minDist) {
                minDist = d;
                nearestTowing = other;
              }
            }

            if (nearestTowing) {
              const towName = CAR_CONFIGS[nearestTowing.type]?.name || nearestTowing.type;
              const isSemi = trailer.type.startsWith('trailer_semi');
              candidates.push({
                type: 'trailer_hitch',
                primaryKey: 'E',
                actionTitle: isSemi ? 'Защелкнуть шкворень в седле': 'Сцепить замок дышла прицепа',
                detail: isSemi ? `С тягачом ${towName}`: `С фаркопом ${towName}`,
                x: couplerX,
                y: couplerY,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 10,
                data: { trailer, towingVeh: nearestTowing }
              });
            } else {
              const isSemi = trailer.type.startsWith('trailer_semi');
              candidates.push({
                type: 'trailer_hitch_hint',
                primaryKey: 'E',
                actionTitle: isSemi ? 'Шкворень полуприцепа готов': 'Замок дышла прицепа открыт',
                detail: isSemi ? 'Подайте тягач задним ходом под прицеп': 'Подогоните автомобиль задним ходом для сцепки',
                x: couplerX,
                y: couplerY,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score + 10,
                data: trailer
              });
            }
          } else if (towingVeh) {
            const isSemi = trailer.type.startsWith('trailer_semi');
            const needsPlug = trailer.type !== 'trailer_barrel';
            const hasBrakes = trailer.type === 'trailer_flatbed_2axle' || trailer.type.startsWith('trailer_semi');
            const isPlugConnected = !!trailer.trailerPlugConnected;
            const isBrakesConnected = !!trailer.trailerBrakesConnected;
            const isHandbrakeEngaged = trailer.trailerParkingBrakeEngaged !== false;

            // Sequential high-priority tasks to guide player through a proper hookup
            if (needsPlug && !isPlugConnected) {
              // 1. First task: Connect electrical plug
              candidates.push({
                type: 'trailer_connect_plug',
                primaryKey: 'E',
                actionTitle: isSemi ? 'Подключить электрокабель (косичку)' : 'Подключить вилку светотехники',
                detail: isSemi ? 'Спиральный 24V кабель питания светотехники' : 'Электрический кабель питания фар',
                x: couplerX,
                y: couplerY,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 15, // Extremely low score = highest priority!
                data: { trailer, towingVeh }
              });
            } else if (hasBrakes && !isBrakesConnected) {
              // 2. Second task: Connect brake hoses
              candidates.push({
                type: 'trailer_connect_brakes',
                primaryKey: 'E',
                actionTitle: isSemi ? 'Подключить тормозные пневмошланги (косички)' : 'Подключить тормозной пневмошланг',
                detail: isSemi ? 'Красная питающая и синяя управляющая магистрали' : 'Пневмолиния управления тормозами прицепа',
                x: couplerX,
                y: couplerY,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 14,
                data: { trailer, towingVeh }
              });
            } else if (isHandbrakeEngaged) {
              // 3. Third task: Release the parking brake so they can drive
              candidates.push({
                type: 'trailer_toggle_handbrake',
                primaryKey: 'E',
                actionTitle: isSemi ? 'Отпустить стояночный тормоз полуприцепа' : 'Отпустить стояночный тормоз прицепа',
                detail: isSemi ? 'Растормозить энергоаккумуляторы полуприцепа' : 'Колеса заблокированы стояночным тормозом',
                x: couplerX - Math.cos(trailer.angle) * 10,
                y: couplerY - Math.sin(trailer.angle) * 10,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 13,
                data: trailer
              });
            } else {
              // Everything is hooked up and ready! Now the default actions are unhitching steps.
              if (hasBrakes && isBrakesConnected) {
                // Must disconnect brakes before mechanical unhitch
                candidates.push({
                  type: 'trailer_disconnect_brakes',
                  primaryKey: 'E',
                  actionTitle: isSemi ? 'Отключить тормозные пневмошланги (косички)' : 'Отключить тормозной пневмошланг',
                  detail: isSemi ? 'Повесить шланги на стойку за кабиной' : 'Разъединить соединительную головку тормозов',
                  x: couplerX,
                  y: couplerY,
                  dist: reach.dist,
                  angleDiff: reach.angleDiff,
                  score: reach.score - 12,
                  data: { trailer, towingVeh }
                });
              } else if (needsPlug && isPlugConnected) {
                // Must disconnect plug before mechanical unhitch
                candidates.push({
                  type: 'trailer_disconnect_plug',
                  primaryKey: 'E',
                  actionTitle: isSemi ? 'Отключить электрокабель (косичку)' : 'Отключить вилку светотехники',
                  detail: isSemi ? 'Повесить кабель на стойку за кабиной' : 'Убрать кабель питания в гнездо',
                  x: couplerX,
                  y: couplerY,
                  dist: reach.dist,
                  angleDiff: reach.angleDiff,
                  score: reach.score - 11,
                  data: { trailer, towingVeh }
                });
              } else {
                // Only allow unhitching once all cables are safely disconnected
                const isSemi = trailer.type.startsWith('trailer_semi');
                candidates.push({
                  type: 'trailer_unhitch',
                  primaryKey: 'E',
                  actionTitle: isSemi ? 'Расшплинтовать седло (Отсоединить)': 'Отцепить замок дышла прицепа',
                  detail: isSemi ? 'Отсоединить шкворень от тягача': 'Освободить от фаркопа',
                  x: couplerX,
                  y: couplerY,
                  dist: reach.dist,
                  angleDiff: reach.angleDiff,
                  score: reach.score - 10,
                  data: { trailer, towingVeh }
                });
              }

              // Normal handbrake toggle (can pull it anytime once everything is connected)
              candidates.push({
                type: 'trailer_toggle_handbrake',
                primaryKey: 'E',
                actionTitle: 'Затянуть стояночный тормоз прицепа',
                detail: 'Колеса расторможены',
                x: couplerX - Math.cos(trailer.angle) * 10,
                y: couplerY - Math.sin(trailer.angle) * 10,
                dist: reach.dist,
                angleDiff: reach.angleDiff,
                score: reach.score - 7,
                data: trailer
              });
            }
          }

          // Unhitched handbrake toggle fallback
          if (!trailer.towedById) {
            const isHandbrakeEngaged = trailer.trailerParkingBrakeEngaged !== false;
            candidates.push({
              type: 'trailer_toggle_handbrake',
              primaryKey: 'E',
              actionTitle: isHandbrakeEngaged ? 'Отпустить стояночный тормоз прицепа': 'Затянуть стояночный тормоз прицепа',
              detail: isHandbrakeEngaged ? 'Колеса заблокированы стояночным тормозом': 'Колеса расторможены',
              x: couplerX - Math.cos(trailer.angle) * 10,
              y: couplerY - Math.sin(trailer.angle) * 10,
              dist: reach.dist,
              angleDiff: reach.angleDiff,
              score: reach.score - 8,
              data: trailer
            });
          }
        }
      }
    }
  }

  // ==========================================
  // RESOLVE BEST CANDIDATE
  // ==========================================
  if (candidates.length > 0) {
    let valid = candidates.filter(c =>
      Number.isFinite(c.score) &&
      Number.isFinite(c.x) &&
      Number.isFinite(c.y) &&
      Number.isFinite(c.dist)
    );

    if (filterKey) {
      valid = valid.filter(c => c.primaryKey === filterKey);
    }

    if (valid.length > 0) {
      valid.sort((a, b) => a.score - b.score);
      const top = valid[0];

      // Attach available secondary actions for the same world position / object
      if (!filterKey) {
        const otherActions = candidates.filter(c => 
          c !== top && 
          Math.hypot(c.x - top.x, c.y - top.y) < 38 &&
          c.primaryKey !== top.primaryKey
        );
        if (otherActions.length > 0) {
          const uniqueOtherActions: typeof otherActions = [];
          const seenKeys = new Set<string>();
          for (const c of otherActions) {
            if (!seenKeys.has(c.primaryKey)) {
              seenKeys.add(c.primaryKey);
              uniqueOtherActions.push(c);
            }
          }
          top.availableKeys = uniqueOtherActions.map(oa => ({
            key: oa.primaryKey,
            title: oa.actionTitle
          }));
        }
      }

      return top;
    }
  }

  // If searching strictly for F or R, do not fall back to in-hand usable item (which is strictly E)
  if (filterKey && filterKey !== 'E') {
    return null;
  }

  // ==========================================
  // 8. FALLBACK: IN-HAND USABLE ITEM
  // ==========================================
  // Only if NO physical world object is in reach in front of the player!
  const activeHand = player.activeHand || 'right';
  let handItem: InventoryItem | null = activeHand === 'left'? player.leftHandItem || null : player.rightHandItem || null;
  let handName = activeHand === 'left'? 'лев. рука': 'прав. рука';

  if (!handItem) {
    const otherHand = activeHand === 'left'? 'right': 'left';
    const otherItem = otherHand === 'left'? player.leftHandItem || null : player.rightHandItem || null;
    if (otherItem) {
      handItem = otherItem;
      handName = otherHand === 'left'? 'лев. рука': 'прав. рука';
    }
  }

  if (handItem) {
    if (handItem.isContainer) {
      return {
        type: 'hand_item',
        primaryKey: 'E',
        actionTitle: `Открыть: ${handItem.nameRu}`,
        detail: handName,
        x: px,
        y: py,
        dist: 0,
        angleDiff: 0,
        score: 100,
        data: handItem
      };
    }

    if (handItem.category === 'food') {
      const hasPortions = handItem.maxPortions && handItem.maxPortions > 1;
      const title = hasPortions
        ? `Сделать укус (${handItem.portions ?? handItem.maxPortions}/${handItem.maxPortions}): ${handItem.nameRu}`: `Съесть: ${handItem.nameRu}`;
      return {
        type: 'hand_item',
        primaryKey: 'E',
        actionTitle: title,
        detail: handName,
        x: px,
        y: py,
        dist: 0,
        angleDiff: 0,
        score: 100,
        data: handItem
      };
    }

    if (handItem.category === 'drink') {
      const hasPortions = handItem.maxPortions && handItem.maxPortions > 1;
      const title = hasPortions
        ? `Сделать глоток (${handItem.portions ?? handItem.maxPortions}/${handItem.maxPortions}): ${handItem.nameRu}`: `Выпить: ${handItem.nameRu}`;
      return {
        type: 'hand_item',
        primaryKey: 'E',
        actionTitle: title,
        detail: handName,
        x: px,
        y: py,
        dist: 0,
        angleDiff: 0,
        score: 100,
        data: handItem
      };
    }

    if (handItem.category === 'med') {
      const hasPortions = handItem.maxPortions && handItem.maxPortions > 1;
      const title = hasPortions
        ? `Принять дозу (${handItem.portions ?? handItem.maxPortions}/${handItem.maxPortions}): ${handItem.nameRu}`: `Применить: ${handItem.nameRu}`;
      return {
        type: 'hand_item',
        primaryKey: 'E',
        actionTitle: title,
        detail: handName,
        x: px,
        y: py,
        dist: 0,
        angleDiff: 0,
        score: 100,
        data: handItem
      };
    }

    if (handItem.usable) {
      return {
        type: 'hand_item',
        primaryKey: 'E',
        actionTitle: `Использовать: ${handItem.nameRu}`,
        detail: handName,
        x: px,
        y: py,
        dist: 0,
        angleDiff: 0,
        score: 100,
        data: handItem
      };
    }
  }

  return null;
}

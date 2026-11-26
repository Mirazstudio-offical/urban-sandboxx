import { Building, GameWorld, InventoryItem, Player, Vehicle } from './types';
import {
  CAR_CONFIGS,
  ensureVehicleFluidTank,
  getVehicleFuelCapPosition,
  getVehicleWaterHoseAnchor,
  getLiquidNameRu,
  isTrailerVehicle,
  canVehicleHaveHitch,
} from './vehicleHelpers';
import { getAllBuildingEntrances } from './physics';
import { getBuildingLayout, getBuildingFloorsCount, getApartmentDoorSegment } from './buildingInteriors';
import { isPlayerNearGasStationCashier, getNearbyGasPump, getNearbyVehicleForFueling, FUEL_GRADES } from './gasStationSystem';
import { getCityApartments, getApartmentById, getApartmentForPlot, hasPlayerApartmentKey } from './propertySystem';
import {
  FURNITURE_STORAGE_CONFIGS,
  buildFurnitureStorageId,
  getFurnitureStorageUserLabel,
} from './furnitureStorageSystem';
import { getBusSeatPositions, getBusDoors, getTrainCoachSeats } from './busInteriorSystem';
import {
  isVehicleCraneTruck,
  isVehicleVacuumTruck,
  getVehicleVacuumBodyId,
  getVehicleCraneGeometry,
  resolveVehicleTruckFrameAndBody,
} from './truckChassisVariants';

export type InteractionType =
  | 'enter_vehicle'
  | 'exit_vehicle'
  | 'enter_crane_cab'
  | 'exit_crane_cab'
  | 'crane_outriggers_panel'
  | 'open_hood'
  | 'fuel_insert'
  | 'fuel_remove'
  | 'pump_take_nozzle'
  | 'pump_return_nozzle'
  | 'gas_cashier'
  | 'water_hose_take'
  | 'water_hose_stow'
  | 'vacuum_gate_valve_toggle'
  | 'vacuum_pump_panel'
  | 'vacuum_hose_mode_toggle'
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
  | 'gate_open_close'
  | 'gate_lock_unlock'
  | 'gate_locked_nokey'
  | 'furniture_storage'
  | 'bed_sleep'
  | 'furniture_pickup'
  | 'furniture_rotate'
  | 'tow_rope_detach'
  | 'enter_passenger_car'
  | 'exit_passenger_car'
  | 'enter_bus_saloon'
  | 'exit_bus_saloon'
  | 'sit_seat'
  | 'stand_up';

export type InteractionOutlineShape =
  | {
      kind: 'rect';
      cx: number;
      cy: number;
      width: number;
      height: number;
      angle: number;
      radius?: number;
    }
  | {
      kind: 'circle';
      cx: number;
      cy: number;
      radius: number;
    }
  | {
      kind: 'polygon';
      points: { x: number; y: number }[];
    };

export interface InteractionTarget {
  type: InteractionType;
  actionTitle: string;
  detail?: string;
  x: number;
  y: number;
  worldX?: number;
  worldY?: number;
  dist: number;
  score: number;
  outline: InteractionOutlineShape;
  data?: any;
  isSelfAction?: boolean;
}

export function getAngleDiff(angle1: number, angle2: number): number {
  return Math.abs(((angle1 - angle2 + Math.PI) % (Math.PI * 2)) - Math.PI);
}

export function distanceToRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): number {
  const cx = Math.max(rx, Math.min(x, rx + rw));
  const cy = Math.max(ry, Math.min(y, ry + rh));
  return Math.hypot(x - cx, y - cy);
}

/**
 * Exact distance from a world point (wx, wy) to an InteractionOutlineShape.
 * Returns { inside: true, dist: 0 } when the point lies inside the shape.
 */
export function pointDistanceToOutline(
  wx: number,
  wy: number,
  outline: InteractionOutlineShape
): { inside: boolean; dist: number } {
  if (outline.kind === 'circle') {
    const d = Math.hypot(wx - outline.cx, wy - outline.cy);
    if (d <= outline.radius) return { inside: true, dist: 0 };
    return { inside: false, dist: d - outline.radius };
  }

  if (outline.kind === 'rect') {
    const dx = wx - outline.cx;
    const dy = wy - outline.cy;
    const cos = Math.cos(-outline.angle);
    const sin = Math.sin(-outline.angle);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    const hw = outline.width * 0.5;
    const hh = outline.height * 0.5;
    const cx = Math.max(-hw, Math.min(hw, lx));
    const cy = Math.max(-hh, Math.min(hh, ly));
    const dist = Math.hypot(lx - cx, ly - cy);
    return { inside: dist === 0, dist };
  }

  // Polygon hit test + edge distance
  const pts = outline.points;
  const n = pts.length;
  if (n < 3) return { inside: false, dist: 99999 };
  let inside = false;
  let minDist = Infinity;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersect = yi > wy !== yj > wy && wx < ((xj - xi) * (wy - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;

    const ex = xj - xi;
    const ey = yj - yi;
    const lenSq = ex * ex + ey * ey;
    const t = lenSq > 1e-6 ? Math.max(0, Math.min(1, ((wx - xi) * ex + (wy - yi) * ey) / lenSq)) : 0;
    const px = xi + ex * t;
    const py = yi + ey * t;
    const d = Math.hypot(wx - px, wy - py);
    if (d < minDist) minDist = d;
  }
  return { inside, dist: inside ? 0 : minDist };
}

function makeVehicleLocalRect(
  veh: Vehicle,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  radius: number = 2.5
): InteractionOutlineShape {
  const lx = (xMin + xMax) * 0.5;
  const ly = (yMin + yMax) * 0.5;
  const cos = Math.cos(veh.angle);
  const sin = Math.sin(veh.angle);
  return {
    kind: 'rect',
    cx: veh.x + lx * cos - ly * sin,
    cy: veh.y + lx * sin + ly * cos,
    width: Math.max(4, xMax - xMin),
    height: Math.max(4, yMax - yMin),
    angle: veh.angle,
    radius,
  };
}

function getVehicleZones(veh: Vehicle): {
  roof: InteractionOutlineShape;
  hood: InteractionOutlineShape | null;
} {
  const cfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
  const L = veh.length || cfg.length || 44;
  const W = veh.width || cfg.width || 20;
  const halfL = L * 0.5;
  const halfW = W * 0.5;
  const t = veh.type as string;

  // Motorcycles / scooters: single seat+body outline
  if (t.startsWith('moto_') || t.includes('scooter') || t.includes('bike')) {
    return {
      roof: makeVehicleLocalRect(veh, -halfL * 0.85, halfL * 0.85, -halfW * 1.15, halfW * 1.15, 3),
      hood: null,
    };
  }

  // Buses
  if (t === 'bus') {
    return {
      roof: makeVehicleLocalRect(veh, halfL * 0.42, halfL * 0.94, -halfW * 0.9, halfW * 0.9, 2.5),
      hood: makeVehicleLocalRect(veh, -halfL * 0.96, -halfL * 0.72, -halfW * 0.86, halfW * 0.86, 2),
    };
  }
  if (t === 'bus_minibus') {
    return {
      roof: makeVehicleLocalRect(veh, halfL * 0.08, halfL * 0.64, -halfW * 0.9, halfW * 0.9, 2.5),
      hood: makeVehicleLocalRect(veh, halfL * 0.66, halfL * 0.98, -halfW * 0.86, halfW * 0.86, 2),
    };
  }

  // Tractors & road machinery / excavators
  if (t.startsWith('tractor_') || t.startsWith('excavator_') || t.startsWith('roller_') || t.startsWith('paver_')) {
    return {
      roof: makeVehicleLocalRect(veh, -halfL * 0.72, halfL * 0.16, -halfW * 0.88, halfW * 0.88, 2.5),
      hood: makeVehicleLocalRect(veh, halfL * 0.18, halfL * 0.95, -halfW * 0.74, halfW * 0.74, 2),
    };
  }

  // Commercial trucks / fire engines / crane / vacuum / tow / dump / tanker
  const isTruck =
    t.startsWith('truck') ||
    t === 'fire_engine' ||
    t === 'fire_truck' ||
    t === 'fire_ladder' ||
    t === 'fire_rescue' ||
    t === 'garbage_truck' ||
    t === 'cement_mixer' ||
    t === 'delivery_truck' ||
    t === 'tow_truck';
  if (isTruck) {
    return {
      roof: makeVehicleLocalRect(veh, halfL * 0.18, halfL * 0.68, -halfW * 0.92, halfW * 0.92, 2.5),
      hood: makeVehicleLocalRect(veh, halfL * 0.70, halfL * 0.99, -halfW * 0.86, halfW * 0.86, 2),
    };
  }

  // Pickups
  if (t.startsWith('pickup')) {
    return {
      roof: makeVehicleLocalRect(veh, -halfL * 0.18, halfL * 0.34, -halfW * 0.88, halfW * 0.88, 2.5),
      hood: makeVehicleLocalRect(veh, halfL * 0.36, halfL * 0.97, -halfW * 0.86, halfW * 0.86, 2.5),
    };
  }

  // Vans / SUVs / Ambulances / Cargo vans
  if (t.includes('van') || t.includes('suv') || t.startsWith('ambulance')) {
    return {
      roof: makeVehicleLocalRect(veh, -halfL * 0.82, halfL * 0.34, -halfW * 0.88, halfW * 0.88, 2.5),
      hood: makeVehicleLocalRect(veh, halfL * 0.36, halfL * 0.97, -halfW * 0.86, halfW * 0.86, 2.5),
    };
  }

  // Standard passenger cars (sedan, hatchback, coupe, wagon, sports, supercar, taxi, police)
  return {
    roof: makeVehicleLocalRect(veh, -halfL * 0.58, halfL * 0.28, -halfW * 0.86, halfW * 0.86, 2.5),
    hood: makeVehicleLocalRect(veh, halfL * 0.30, halfL * 0.97, -halfW * 0.86, halfW * 0.86, 2.5),
  };
}

function getCraneCabOutline(veh: Vehicle): { outline: InteractionOutlineShape; cx: number; cy: number } {
  const cGeom = getVehicleCraneGeometry(veh);
  const cos = Math.cos(veh.angle);
  const sin = Math.sin(veh.angle);
  const cosT = Math.cos(cGeom.turretAngle);
  const sinT = Math.sin(cGeom.turretAngle);
  const cabLocalX = cGeom.turretLocalX + 1.1 * cosT - -8.8 * sinT;
  const cabLocalY = 1.1 * sinT + -8.8 * cosT;
  const cx = veh.x + cos * cabLocalX - sin * cabLocalY;
  const cy = veh.y + sin * cabLocalX + cos * cabLocalY;
  return {
    cx,
    cy,
    outline: {
      kind: 'rect',
      cx,
      cy,
      width: 14,
      height: 10,
      angle: veh.angle + cGeom.turretAngle,
      radius: 2,
    },
  };
}

export function resolveBuildingShop(bld: Building, roomName: string = ''): { shopType: string; shopTitle: string } | null {
  if (!bld) return null;

  const isResidential =
    bld.type === 'panel_apartment' ||
    bld.type === 'brick_residential' ||
    bld.type === 'modern_residential' ||
    bld.type === 'suburban';
  if (isResidential && !bld.shopBrand) {
    return null;
  }

  const rm = roomName || '';

  if (
    bld.shopBrand === 'gas_station_shop' ||
    bld.type === 'gas_station_shop' ||
    bld.id === 'bld_gas_station_shop_se' ||
    rm.includes('АЗС') ||
    (bld.nameRu && bld.nameRu.includes('АЗС'))
  ) {
    return { shopType: 'gas_station_shop', shopTitle: bld.nameRu || 'АЗС «НефтьМагистраль» 24/7' };
  }

  if (
    bld.shopBrand === 'pharmacy_36_6' ||
    bld.type === 'pharmacy_store' ||
    rm.includes('Аптека') ||
    rm.includes('Панацея') ||
    rm.includes('Медпункт') ||
    bld.type === 'hospital'
  ) {
    return { shopType: 'pharmacy', shopTitle: rm || bld.nameRu || 'Аптека "36.6"' };
  }
  if (bld.shopBrand === 'cofix_bakery' || bld.type === 'bakery_cafe' || rm.includes('Урбан') || rm.includes('Пекарня') || rm.includes('Cofix')) {
    return { shopType: 'cafe', shopTitle: rm || bld.nameRu || 'Кафе & Пекарня "Cofix"' };
  }
  if (bld.shopBrand === 'bean_bistro' || bld.type === 'coffee_bistro' || rm.includes('Bean & Bistro') || rm.includes('Кофейня') || rm.includes('Кафе')) {
    return { shopType: 'cafe', shopTitle: rm || bld.nameRu || 'Кафе & Кофейня "Bean & Bistro"' };
  }
  if (bld.shopBrand === 'dodo_pizza' || rm.includes('Пиццерия') || rm.includes('Империя') || rm.includes('Пицца')) {
    return { shopType: 'pizzeria', shopTitle: rm || bld.nameRu || 'Пиццерия "Пицца-Империя"' };
  }
  if (bld.shopBrand === 'vkusno_tochka' || rm.includes('Бургер-Клаб') || rm.includes('Бургерная') || rm.includes('Фастфуд')) {
    return { shopType: 'fast_food', shopTitle: rm || bld.nameRu || 'Ресторан "Бургер-Клаб"' };
  }
  if (bld.shopBrand === 'mvideo' || rm.includes('Электро-Маркет') || rm.includes('Электроника') || rm.includes('Гаджет')) {
    return { shopType: 'electronics', shopTitle: rm || bld.nameRu || 'Гипермаркет электроники "Электро-Маркет"' };
  }
  if (bld.shopBrand === 'sportmaster' || rm.includes('Спорт-Олимп') || rm.includes('Спорт')) {
    return { shopType: 'sports_shop', shopTitle: rm || bld.nameRu || 'Спортивный гипермаркет "Спорт-Олимп"' };
  }
  if (bld.type === 'car_dealership' || rm.includes('Автосалон') || rm.includes('Шоурум')) {
    return { shopType: 'car_dealership', shopTitle: rm || bld.nameRu || 'Автосалон "Премиум Арт"' };
  }
  if (bld.shopBrand === 'pitstop_service' || rm.includes('PIT-STOP') || rm.includes('Авто')) {
    return { shopType: 'auto_shop', shopTitle: rm || bld.nameRu || 'Автомастерская & Сервис "PIT-STOP"' };
  }
  if (bld.shopBrand === 'splav_gear' || rm.includes('Тракт') || rm.includes('Туризм') || rm.includes('Охота') || rm.includes('Снаряжение')) {
    return { shopType: 'gear_shop', shopTitle: rm || bld.nameRu || 'Магазин "Охота & Туризм Тракт"' };
  }
  if (bld.shopBrand === 'perekrestok' || rm.includes('Азимут')) {
    return { shopType: 'supermarket', shopTitle: rm || bld.nameRu || 'Супермаркет "Азимут 24/7"' };
  }
  if (
    bld.shopBrand === 'pyaterochka' ||
    bld.type === 'supermarket_store' ||
    (bld.nameRu && (bld.nameRu.includes('Пятёрочк') || bld.nameRu.includes('Пятерочк'))) ||
    rm.includes('Регуляр') ||
    rm.includes('Пятёрочк') ||
    rm.includes('Пятерочк')
  ) {
    return { shopType: 'supermarket', shopTitle: rm || bld.nameRu || 'Супермаркет "Пятёрочка 24/7"' };
  }
  if (rm.includes('Суши') || rm.includes('WOK') || rm.includes('Сакура')) {
    return { shopType: 'sushi_asian', shopTitle: rm || 'Суши-Бар "Сакура"' };
  }
  if (rm.includes('Кинобар') || rm.includes('Синема') || rm.includes('Попкорн')) {
    return { shopType: 'cinema_bar', shopTitle: rm || 'Кинобар & Попкорн' };
  }
  if (rm.includes('Одежда') || rm.includes('Мода') || rm.includes('Бутик')) {
    return { shopType: 'clothing', shopTitle: rm || 'Бутик Одежды & Обуви' };
  }
  if (rm.includes('Книжн') || rm.includes('Логос')) {
    return { shopType: 'bookstore', shopTitle: rm || 'Книжная Лавка "Логос"' };
  }
  if (bld.type === 'police_station') {
    return { shopType: 'gear_shop', shopTitle: 'Арсенал & Снаряжение полиции' };
  }
  if (bld.type === 'shopping_mall' || bld.type === 'commercial' || bld.type === 'shop') {
    return { shopType: 'supermarket', shopTitle: rm || bld.nameRu || 'Супермаркет 24/7' };
  }

  return null;
}

/**
 * Checks whether the player's currently active hand holds an item that can be activated
 * via right-click (PC) or long-tap (mobile).
 */
export function getActiveHandUsableItem(player: Player | null | undefined): { hand: 'left' | 'right'; item: InventoryItem } | null {
  if (!player || player.isInVehicle) return null;
  const activeHand: 'left' | 'right' = player.activeHand === 'left' ? 'left' : 'right';
  const handItem = activeHand === 'left' ? player.leftHandItem || null : player.rightHandItem || null;
  if (!handItem) return null;

  const isOpenableContainer =
    (handItem.isContainer && !handItem.fluidStorage) ||
    handItem.itemId === 'wallet' ||
    handItem.itemId === 'plastic_bag';

  if (
    handItem.usable ||
    isOpenableContainer ||
    handItem.category === 'food' ||
    handItem.category === 'drink' ||
    handItem.category === 'med'
  ) {
    return { hand: activeHand, item: handItem };
  }
  return null;
}

export function canUseActiveHandItem(player: Player | null | undefined): boolean {
  return getActiveHandUsableItem(player) !== null;
}

interface CandidateEntry {
  target: InteractionTarget;
  inside: boolean;
  pointerDist: number;
  priority: number; // lower number = higher priority when overlapping
}

const _interactionPropsScratch: any[] = [];

/**
 * Direct spatial pointer interaction resolver (PC hover/RMB & Mobile long-tap).
 * Evaluates all reachable interactive objects/zones under `pointerWorldPos` and returns
 * the single best target with its exact world-space white outline geometry.
 */
export function findPointedInteraction(
  player: Player | null | undefined,
  world: GameWorld | null | undefined,
  pointerWorldPos: { x: number; y: number } | null | undefined,
  isTouch: boolean = false,
  propsGrid?: any
): InteractionTarget | null {
  if (!player || !world || !pointerWorldPos) return null;
  const mx = pointerWorldPos.x;
  const my = pointerWorldPos.y;
  if (!Number.isFinite(mx) || !Number.isFinite(my)) return null;

  const px = player.x;
  const py = player.y;
  const touchBonus = isTouch ? 7 : 0;

  const hits: CandidateEntry[] = [];

  const tryAdd = (
    target: Omit<InteractionTarget, 'dist' | 'score'>,
    maxReach: number,
    hitPad: number,
    priority: number,
    ignoreReach: boolean = false
  ) => {
    const ptrHit = pointDistanceToOutline(mx, my, target.outline);
    const effectivePad = hitPad + touchBonus;
    if (!ptrHit.inside && ptrHit.dist > effectivePad) return;

    const playerDist = ignoreReach ? 0 : pointDistanceToOutline(px, py, target.outline).dist;
    if (!ignoreReach && playerDist > maxReach) return;

    const score = (ptrHit.inside ? 0 : 100) + priority * 10 + ptrHit.dist * 2;
    hits.push({
      target: {
        ...target,
        dist: playerDist,
        score,
      },
      inside: ptrHit.inside,
      pointerDist: ptrHit.dist,
      priority,
    });
  };

  // ==========================================
  // 0. INSIDE VEHICLE OR CRANE OPERATOR CAB
  // ==========================================
  if (player.isInVehicle) {
    const veh = (world.vehicles || []).find((v) => v.id === player.currentVehicleId);
    if (!veh) return null;

    if (player.craneOperatorActive && isVehicleCraneTruck(veh)) {
      const cab = getCraneCabOutline(veh);
      tryAdd(
        {
          type: 'exit_crane_cab',
          actionTitle: 'Покинуть кабину крановщика',
          x: cab.cx,
          y: cab.cy,
          outline: cab.outline,
          data: veh,
        },
        999,
        6,
        1,
        true
      );
    } else {
      const zones = getVehicleZones(veh);
      const centerX = zones.roof.kind === 'rect' ? zones.roof.cx : veh.x;
      const centerY = zones.roof.kind === 'rect' ? zones.roof.cy : veh.y;
      tryAdd(
        {
          type: 'exit_vehicle',
          actionTitle: 'Выйти из машины',
          x: centerX,
          y: centerY,
          outline: zones.roof,
          data: veh,
        },
        999,
        4,
        1,
        true
      );
    }

    return pickBest(hits);
  }

  // ==========================================
  // 0.25. SITTING POSTURE (Chair / Sofa / Bench / Bus / Train)
  // ==========================================
  if (player.sittingState) {
    tryAdd(
      {
        type: 'stand_up',
        actionTitle: 'Встать',
        detail: player.sittingState.labelRu,
        x: px,
        y: py,
        outline: { kind: 'circle', cx: px, cy: py, radius: 12 },
        isSelfAction: true,
      },
      999,
      6,
      1,
      true
    );
    return pickBest(hits);
  }

  // ==========================================
  // 0.5. INSIDE BUS SALOON
  // ==========================================
  if (player.insideBusId) {
    const bus = (world.vehicles || []).find((v) => v.id === player.insideBusId);
    if (!bus) {
      player.insideBusId = null;
      return null;
    }

    const cos = Math.cos(bus.angle);
    const sin = Math.sin(bus.angle);
    const localX = player.busLocalX ?? bus.length * 0.5 - 14;
    const localY = player.busLocalY ?? 5.5;

    // Exit doors
    const doors = getBusDoors(bus.type, bus.length, bus.width);
    for (const d of doors) {
      const doorWorldX = bus.x + d.vestibuleLocalX * cos - d.vestibuleLocalY * sin;
      const doorWorldY = bus.y + d.vestibuleLocalX * sin + d.vestibuleLocalY * cos;
      const distLocal = Math.hypot(localX - d.vestibuleLocalX, localY - d.vestibuleLocalY);
      if (distLocal < 28) {
        tryAdd(
          {
            type: 'exit_bus_saloon',
            actionTitle: 'Спуститься из автобуса',
            detail: d.nameRu,
            x: doorWorldX,
            y: doorWorldY,
            outline: {
              kind: 'rect',
              cx: doorWorldX,
              cy: doorWorldY,
              width: 12,
              height: 8,
              angle: bus.angle,
              radius: 2,
            },
            data: { bus, door: d },
          },
          36,
          4,
          1
        );
      }
    }

    // Bus seats
    const seats = getBusSeatPositions(bus.type);
    for (const s of seats) {
      const seatWorldX = bus.x + s.localX * cos - s.localY * sin;
      const seatWorldY = bus.y + s.localX * sin + s.localY * cos;
      tryAdd(
        {
          type: 'sit_seat',
          actionTitle: s.isDriver ? 'Сесть за руль автобуса' : 'Сесть на сиденье',
          detail: s.labelRu,
          x: seatWorldX,
          y: seatWorldY,
          outline: {
            kind: 'rect',
            cx: seatWorldX,
            cy: seatWorldY,
            width: 8,
            height: 8,
            angle: bus.angle + s.angle,
            radius: 2,
          },
          data: {
            seatType: 'bus_seat',
            targetId: bus.id,
            localX: s.localX,
            localY: s.localY,
            angle: bus.angle + s.angle,
            labelRu: s.labelRu,
            worldX: seatWorldX,
            worldY: seatWorldY,
          },
        },
        24,
        3,
        2
      );
    }

    return pickBest(hits);
  }

  // ==========================================
  // 0.75. INSIDE TRAIN PASSENGER CARRIAGE
  // ==========================================
  if (player.insideCarId) {
    const car = (world.rollingStock || []).find((c) => c.id === player.insideCarId);
    if (!car) {
      player.insideCarId = null;
      return null;
    }

    const halfL = car.length * 0.5;
    const halfW = car.width * 0.5;
    const cScale = (car.width || 30) / 60;
    const cos = Math.cos(car.angle);
    const sin = Math.sin(car.angle);

    const exitDoors = [
      { id: 'work_north', lx: halfL - 19 * cScale, ly: -halfW + 2, exitLocalY: -halfW - 7 },
      { id: 'work_south', lx: halfL - 19 * cScale, ly: halfW - 2, exitLocalY: halfW + 7 },
      { id: 'nonwork_north', lx: -halfL + 18 * cScale, ly: -halfW + 2, exitLocalY: -halfW - 7 },
      { id: 'nonwork_south', lx: -halfL + 18 * cScale, ly: halfW - 2, exitLocalY: halfW + 7 },
    ];
    for (const d of exitDoors) {
      const wx = car.x + d.lx * cos - d.ly * sin;
      const wy = car.y + d.lx * sin + d.ly * cos;
      tryAdd(
        {
          type: 'exit_passenger_car',
          actionTitle: 'Спуститься из вагона',
          x: wx,
          y: wy,
          outline: { kind: 'rect', cx: wx, cy: wy, width: 12, height: 7, angle: car.angle, radius: 1.5 },
          data: { car, doorId: d.id, exitLocalY: d.exitLocalY },
        },
        28,
        4,
        1
      );
    }

    const trainSeats = getTrainCoachSeats(car);
    for (const s of trainSeats) {
      const wx = car.x + s.localX * cos - s.localY * sin;
      const wy = car.y + s.localX * sin + s.localY * cos;
      tryAdd(
        {
          type: 'sit_seat',
          actionTitle: 'Сесть на место',
          detail: s.labelRu,
          x: wx,
          y: wy,
          outline: { kind: 'rect', cx: wx, cy: wy, width: 9, height: 7, angle: car.angle + s.angle, radius: 1.5 },
          data: {
            seatType: 'train_seat',
            targetId: car.id,
            localX: s.localX,
            localY: s.localY,
            angle: car.angle + s.angle,
            labelRu: s.labelRu,
            worldX: wx,
            worldY: wy,
          },
        },
        24,
        3,
        2
      );
    }

    return pickBest(hits);
  }

  // ==========================================
  // 1. INSIDE BUILDING OR APARTMENT
  // ==========================================
  if (player.isInsideBuilding && player.insideBuildingId) {
    const bld = world.buildings?.find((b) => b.id === player.insideBuildingId);
    if (bld) {
      const currentFloor = player.currentFloor || 0;
      const layout = getBuildingLayout(bld, currentFloor, player.insideApartmentId);

      // 1a. Exit doors
      const exits = layout.exits && layout.exits.length > 0 ? layout.exits : layout.exitZone ? [layout.exitZone] : [];
      for (const ex of exits) {
        const cx = bld.x + ex.x + ex.width * 0.5;
        const cy = bld.y + ex.y + ex.height * 0.5;
        tryAdd(
          {
            type: 'exit_building',
            actionTitle: bld.type === 'suburban' ? 'Выйти во двор' : 'Выйти на улицу',
            x: cx,
            y: cy,
            outline: {
              kind: 'rect',
              cx,
              cy,
              width: Math.max(12, ex.width),
              height: Math.max(8, ex.height),
              angle: 0,
              radius: 2,
            },
            data: bld,
          },
          52,
          4,
          2
        );
      }

      // 1b. Elevators & stairs
      if (!player.isInsideApartment) {
        const totalFloors = getBuildingFloorsCount(bld);
        if (layout.elevators) {
          for (const el of layout.elevators) {
            const cx = bld.x + el.x + el.width * 0.5;
            const cy = bld.y + el.y + el.height * 0.5;
            tryAdd(
              {
                type: 'building_elevator',
                actionTitle: 'Вызвать лифт',
                detail: `Этаж ${currentFloor + 1} из ${totalFloors}`,
                x: cx,
                y: cy,
                outline: {
                  kind: 'rect',
                  cx,
                  cy,
                  width: Math.max(12, el.width),
                  height: Math.max(12, el.height),
                  angle: 0,
                  radius: 2,
                },
                data: { sz: el, bld },
              },
              54,
              4,
              2
            );
          }
        }
        if (layout.stairs) {
          for (const st of layout.stairs) {
            const cx = bld.x + st.x + st.width * 0.5;
            const cy = bld.y + st.y + st.height * 0.5;
            tryAdd(
              {
                type: 'building_elevator',
                actionTitle: 'Лестничный марш',
                detail: `Этаж ${currentFloor + 1} из ${totalFloors}`,
                x: cx,
                y: cy,
                outline: {
                  kind: 'rect',
                  cx,
                  cy,
                  width: Math.max(12, st.width),
                  height: Math.max(12, st.height),
                  angle: 0,
                  radius: 2,
                },
                data: { sz: st, bld },
              },
              54,
              4,
              2
            );
          }
        }
      }

      // 1c. Interior furniture (exact rotated rectangle outlines)
      if (layout.furniture && layout.furniture.length > 0) {
        const aptOwned =
          player.isInsideApartment && player.insideApartmentId
            ? Boolean(getApartmentById(player.insideApartmentId)?.isOwned)
            : false;

        for (let fIdx = 0; fIdx < layout.furniture.length; fIdx++) {
          const furn = layout.furniture[fIdx];
          const fw = furn.width || 20;
          const fh = furn.height || 20;

          // Prevent interacting with apartment furniture from outside the apartment
          if (!player.isInsideApartment && layout.rooms && layout.rooms.length > 0) {
            const fx = furn.x + fw * 0.5;
            const fy = furn.y + fh * 0.5;
            const isInAnyAptRoom = layout.rooms.some((rm) => {
              if (rm && rm.name && (rm.name.startsWith('Кв.') || rm.name.startsWith('Кв. '))) {
                return fx >= rm.x && fx <= rm.x + rm.width && fy >= rm.y && fy <= rm.y + rm.height;
              }
              return false;
            });
            if (isInAnyAptRoom) continue;
          }

          const furnWorldX = bld.x + furn.x + fw * 0.5;
          const furnWorldY = bld.y + furn.y + fh * 0.5;
          const furnAngle = furn.angle || 0;
          const furnOutline: InteractionOutlineShape = {
            kind: 'rect',
            cx: furnWorldX,
            cy: furnWorldY,
            width: fw,
            height: fh,
            angle: furnAngle,
            radius: 1.5,
          };

          let hasPrimaryFurnitureAction = false;

          // 1) Agency desks & shop registers / counters / vending machines
          const isAgencyFurniture =
            bld.type === 'real_estate_agency' &&
            (furn.type === 'desk_reception' || furn.type === 'computer' || furn.type === 'desk' || furn.type === 'table');
          if (furn.type === 'cash_register' || furn.type === 'counter' || furn.type === 'vending_machine' || isAgencyFurniture) {
            if (bld.type === 'real_estate_agency') {
              hasPrimaryFurnitureAction = true;
              tryAdd(
                {
                  type: 'real_estate_agency',
                  actionTitle: 'Росреестр и каталог квартир',
                  x: furnWorldX,
                  y: furnWorldY,
                  outline: furnOutline,
                  data: { bld },
                },
                58,
                3,
                1
              );
            } else {
              let furnRoomName = '';
              if (layout.rooms && layout.rooms.length > 0) {
                const fx = furn.x + fw * 0.5;
                const fy = furn.y + fh * 0.5;
                const rmFound = layout.rooms.find(
                  (rm) => fx >= rm.x && fx <= rm.x + rm.width && fy >= rm.y && fy <= rm.y + rm.height
                );
                if (rmFound) furnRoomName = rmFound.name;
              }
              const shopInfo = resolveBuildingShop(bld, furnRoomName);
              if (shopInfo || furn.type === 'vending_machine') {
                hasPrimaryFurnitureAction = true;
                const resolvedShopType = shopInfo?.shopType || 'cafe';
                const resolvedShopTitle =
                  shopInfo?.shopTitle || (furn.type === 'vending_machine' ? 'Торговый автомат' : 'Магазин');
                tryAdd(
                  {
                    type: 'building_shop',
                    actionTitle: resolvedShopTitle,
                    x: furnWorldX,
                    y: furnWorldY,
                    outline: furnOutline,
                    data: { zone: { shopType: resolvedShopType }, shopTitle: resolvedShopTitle, bld },
                  },
                  58,
                  3,
                  1
                );
              }
            }
          }

          // 2) Storage & appliances (table, desk, kitchen_counter + built-in sink, fridge, stove, sink, bath, washing_machine, microwave, cooler, wardrobe, safe, etc.)
          const storageCfg = FURNITURE_STORAGE_CONFIGS[furn.type];
          if (storageCfg && !hasPrimaryFurnitureAction) {
            hasPrimaryFurnitureAction = true;
            const isKitchenCounter = furn.type === 'kitchen_counter';

            // Kitchen counter has a dedicated built-in stainless steel sink sub-zone on its left end
            if (isKitchenCounter) {
              const cosA = Math.cos(furnAngle);
              const sinA = Math.sin(furnAngle);
              const sinkW = Math.min(fw * 0.36, Math.max(5.5, fh * 1.1));
              const sinkLocalX = -fw * 0.5 + Math.max(1.0, fw * 0.055) + sinkW * 0.5;
              const sinkWorldX = furnWorldX + sinkLocalX * cosA;
              const sinkWorldY = furnWorldY + sinkLocalX * sinA;
              const sinkOutline: InteractionOutlineShape = {
                kind: 'rect',
                cx: sinkWorldX,
                cy: sinkWorldY,
                width: sinkW,
                height: Math.max(4, fh * 0.88),
                angle: furnAngle,
                radius: 1.5,
              };

              tryAdd(
                {
                  type: 'furniture_storage',
                  actionTitle: 'Раковина гарнитура',
                  x: sinkWorldX,
                  y: sinkWorldY,
                  outline: sinkOutline,
                  data: {
                    bld,
                    currentFloor,
                    furn,
                    furnitureIndex: fIdx,
                    furnitureType: 'sink',
                    subSlot: 'sink',
                    hasBuiltInSink: true,
                    aptId: player.insideApartmentId,
                    customTitle: 'Раковина кухонного гарнитура',
                  },
                },
                56,
                2,
                1 // Higher priority than whole kitchen counter so pointing at sink selects sink!
              );
            }

            const storageLookupId = buildFurnitureStorageId(
              bld.id,
              currentFloor,
              fIdx,
              player.insideApartmentId
            );
            const savedUserLabel = getFurnitureStorageUserLabel(storageLookupId);
            const baseShortName = storageCfg.nameRu.split(' / ')[0];
            const promptTitle = savedUserLabel ? `${baseShortName} · «${savedUserLabel}»` : storageCfg.nameRu;

            tryAdd(
              {
                type: 'furniture_storage',
                actionTitle: promptTitle,
                x: furnWorldX,
                y: furnWorldY,
                outline: furnOutline,
                data: {
                  bld,
                  currentFloor,
                  furn,
                  furnitureIndex: fIdx,
                  furnitureType: furn.type,
                  hasBuiltInSink: isKitchenCounter,
                  aptId: player.insideApartmentId,
                  customTitle: storageCfg.nameRu,
                },
              },
              56,
              3,
              2
            );
          }

          // 3) Beds (sleep / lie down)
          if (
            furn.type === 'bed' ||
            furn.type === 'kids_bed' ||
            furn.type === 'bed_hospital' ||
            furn.type === 'jail_cot'
          ) {
            hasPrimaryFurnitureAction = true;
            tryAdd(
              {
                type: 'bed_sleep',
                actionTitle: 'Лечь на кровать',
                x: furnWorldX,
                y: furnWorldY,
                worldX: furnWorldX,
                worldY: furnWorldY,
                outline: furnOutline,
                data: {
                  bld,
                  currentFloor,
                  furn,
                  furnitureIndex: fIdx,
                  furnitureType: furn.type,
                  aptId: player.insideApartmentId,
                  worldX: furnWorldX,
                  worldY: furnWorldY,
                },
              },
              56,
              3,
              2
            );
          }

          // 4) Chairs, benches, sofas, bean bags, exam tables (sit down)
          if (
            furn.type === 'chair' ||
            furn.type === 'bench' ||
            furn.type === 'sofa' ||
            furn.type === 'bean_bag' ||
            furn.type === 'exam_table'
          ) {
            hasPrimaryFurnitureAction = true;
            const label =
              furn.type === 'chair'
                ? 'Стул'
                : furn.type === 'bench'
                ? 'Скамейка'
                : furn.type === 'sofa'
                ? 'Диван'
                : furn.type === 'bean_bag'
                ? 'Кресло-мешок'
                : 'Кушетка';
            tryAdd(
              {
                type: 'sit_seat',
                actionTitle: label,
                detail: label,
                x: furnWorldX,
                y: furnWorldY,
                outline: furnOutline,
                data: {
                  seatType: 'furniture_seat',
                  targetId: bld.id,
                  furnitureIndex: fIdx,
                  worldX: furnWorldX,
                  worldY: furnWorldY,
                  angle: furnAngle,
                  labelRu: label,
                },
              },
              56,
              3,
              2
            );
          }

          // 5) Decorative owned furniture without other primary action can be picked up
          if (!hasPrimaryFurnitureAction && aptOwned && player.insideApartmentId) {
            const apt = getApartmentById(player.insideApartmentId);
            const staticCount = apt?.layout?.furniture?.length || 0;
            const isDeveloperFurniture = fIdx < staticCount;
            tryAdd(
              {
                type: 'furniture_pickup',
                actionTitle: 'Убрать мебель',
                x: furnWorldX,
                y: furnWorldY,
                outline: furnOutline,
                data: {
                  bld,
                  currentFloor,
                  furnitureIndex: fIdx,
                  furnitureType: furn.type,
                  aptId: player.insideApartmentId,
                  isDeveloperFurniture,
                },
              },
              50,
              2,
              4
            );
          }
        }
      }

      // 1d. Gas station cashier desk fallback inside shop
      if (isPlayerNearGasStationCashier(player, world)) {
        tryAdd(
          {
            type: 'gas_cashier',
            actionTitle: 'Касса АЗС',
            x: 5275,
            y: 4958,
            outline: { kind: 'rect', cx: 5275, cy: 4958, width: 28, height: 14, angle: 0, radius: 2 },
            data: null,
          },
          65,
          4,
          1
        );
      }

      // 1e. Apartment doors inside corridors
      const apartments = getCityApartments();
      const floorApts = apartments.filter((a) => a.buildingId === bld.id && a.floor === currentFloor);
      for (const apt of floorApts) {
        const rm = layout.rooms?.find(
          (r) => r.name === `Кв. ${apt.apartmentNumber}` || r.name === `Кв.${apt.apartmentNumber}`
        );
        if (!rm) continue;
        const door = getApartmentDoorSegment(rm, layout.walls);
        const doorLocalX = door ? (door.x1 + door.x2) * 0.5 : rm.x + rm.width * 0.5;
        const doorLocalY = door ? (door.y1 + door.y2) * 0.5 : rm.y + rm.height * 0.5;
        const doorWorldX = bld.x + doorLocalX;
        const doorWorldY = bld.y + doorLocalY;
        const doorLen = door ? Math.max(10, Math.hypot(door.x2 - door.x1, door.y2 - door.y1)) : 12;
        const doorAngle = door ? Math.atan2(door.y2 - door.y1, door.x2 - door.x1) : 0;
        const hasKey = hasPlayerApartmentKey(player, apt);

        if (apt.isLocked) {
          tryAdd(
            {
              type: hasKey ? 'apartment_door_lock' : 'apartment_door_locked_nokey',
              actionTitle: `Кв. №${apt.apartmentNumber}`,
              x: doorWorldX,
              y: doorWorldY,
              outline: { kind: 'rect', cx: doorWorldX, cy: doorWorldY, width: doorLen, height: 6, angle: doorAngle, radius: 1 },
              data: { apt, hasKey },
            },
            42,
            4,
            1
          );
        } else if (hasKey) {
          tryAdd(
            {
              type: 'apartment_door_lock',
              actionTitle: `Замок Кв. №${apt.apartmentNumber}`,
              x: doorWorldX,
              y: doorWorldY,
              outline: { kind: 'rect', cx: doorWorldX, cy: doorWorldY, width: doorLen, height: 6, angle: doorAngle, radius: 1 },
              data: { apt, hasKey },
            },
            42,
            4,
            2
          );
        }
      }
    }
  } else {
    // ==========================================
    // 2. EXTERIOR WORLD: VEHICLES, MACHINERY, PUMPS, BUILDINGS, PROPS
    // ==========================================

    // 2a. Water & Vacuum Hose Stow/Take + Vacuum Pump Bay + Crane Stations + Fuel Cap + Hood + Roof + Bus Doors
    if (world.vehicles) {
      for (const veh of world.vehicles) {
        const cfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
        const maxBound = Math.max(veh.length || cfg.length || 44, veh.width || cfg.width || 20) * 0.65 + 95;
        if (Math.abs(veh.x - px) > maxBound || Math.abs(veh.y - py) > maxBound) continue;

        const cos = Math.cos(veh.angle);
        const sin = Math.sin(veh.angle);
        const isTrailer = isTrailerVehicle(veh);

        // --- Water / Vacuum Hose, Rear ANM-53 Gate Valve, KO-560 RVD Reel, & Side Vacuum Pump Bay ---
        ensureVehicleFluidTank(veh);
        const isVacVehicle = isVehicleVacuumTruck(veh) && !!veh.fluidTank;

        if (isVacVehicle && veh.fluidTank) {
          const halfL = (veh.length || cfg.length) / 2;
          const halfW = (veh.width || cfg.width) / 2;
          const vacBodyId = getVehicleVacuumBodyId(veh);
          const resolvedTruck = resolveVehicleTruckFrameAndBody(veh);
          const toWorld = (lx: number, ly: number) => ({
            x: veh.x + cos * lx - sin * ly,
            y: veh.y + sin * lx + cos * ly,
          });

          const holdingThisVehHose = !!player.heldWaterHose && player.heldWaterHose.vehicleId === veh.id;
          const holdingJetter = holdingThisVehHose && !!player.heldWaterHose?.isJetterHose;
          const isGateOpen = !!veh.fluidTank.drainValveOpen;

          if (veh.type === 'trailer_vacuum') {
            const tankFront = halfL * 0.70;
            const tankRear = -halfL * 0.88;
            const tankX = (tankFront + tankRear) / 2;
            const tankL = tankFront - tankRear;
            const tankW = halfW * 1.46;
            const trayW = 2.4;

            // 1. Rear ANM-53 slide gate valve (Задвижка АНМ-53)
            const gatePos = toWorld(tankRear - 3.0, -0.5);
            tryAdd(
              {
                type: 'vacuum_gate_valve_toggle',
                actionTitle: isGateOpen ? 'Закрыть шибер АНМ-53' : 'Открыть шибер АНМ-53',
                x: gatePos.x,
                y: gatePos.y,
                outline: {
                  kind: 'rect',
                  cx: gatePos.x,
                  cy: gatePos.y,
                  width: 6.8,
                  height: 7.4,
                  angle: veh.angle,
                  radius: 1.5,
                },
                data: veh,
              },
              60,
              6,
              0
            );

            // 2. Left side suction hose carrier tray (Левый пенал рукава)
            const trayPos = toWorld(tankX, -tankW / 2 - trayW * 0.5 + 0.2);
            const trayOutline: InteractionOutlineShape = {
              kind: 'rect',
              cx: trayPos.x,
              cy: trayPos.y,
              width: Math.max(10, tankL - 2.4),
              height: trayW + 1.8,
              angle: veh.angle,
              radius: 1.4,
            };
            if (holdingThisVehHose) {
              tryAdd(
                {
                  type: 'water_hose_stow',
                  actionTitle: 'Уложить вакуумный рукав',
                  x: trayPos.x,
                  y: trayPos.y,
                  outline: trayOutline,
                  data: veh,
                },
                62,
                6,
                0
              );
            } else if (!player.heldWaterHose && veh.fluidTank.hasWaterHose) {
              tryAdd(
                {
                  type: 'water_hose_take',
                  actionTitle: 'Взять вакуумный рукав',
                  detail: getLiquidNameRu(veh.fluidTank.liquidType || 'water'),
                  x: trayPos.x,
                  y: trayPos.y,
                  outline: trayOutline,
                  data: { veh, hoseMode: 'vacuum' as const },
                },
                62,
                5,
                1
              );
            }

            // 3. Front vacuum pump mounted on drawbar behind tech box
            const pumpPos = toWorld(halfL + 1.8, -0.6);
            tryAdd(
              {
                type: 'vacuum_pump_panel',
                actionTitle: 'Пульт вакуум-насоса',
                x: pumpPos.x,
                y: pumpPos.y,
                outline: {
                  kind: 'rect',
                  cx: pumpPos.x,
                  cy: pumpPos.y,
                  width: 7.8,
                  height: 7.0,
                  angle: veh.angle,
                  radius: 1.6,
                },
                data: veh,
              },
              64,
              5,
              1
            );
          } else {
            const bodyX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.4 : -halfL + 3.2;
            const bodyX2 = resolvedTruck ? resolvedTruck.cabRearX - 0.6 : halfL * 0.25;

            if (vacBodyId === 'body_vacuum_kombi_ko560') {
              const totalLen = Math.max(16, bodyX2 - bodyX1);
              const bodyW = halfW * 2 - 1.2;
              const compLen = Math.min(8.8, totalLen * 0.27);
              const compX1 = bodyX2 - compLen;
              const tankFront = compX1 - 0.5;
              const tankRear = bodyX1 + 3.1;
              const vacW = Math.min(14.2, bodyW * 0.57);
              const saddleGap = 0.55;
              const saddleW = Math.max(3.6, (bodyW - vacW) * 0.5 - saddleGap);
              const leftSaddleY = -bodyW / 2;
              const rackX1 = tankRear + 1.2;
              const rackX2 = tankFront - 1.2;
              const rackLen = Math.max(8, rackX2 - rackX1);
              const rackY = leftSaddleY + 0.45;
              const rackW = Math.min(2.2, saddleW - 0.8);
              const reelX = tankRear - 1.8;

              // 1. Rear lower ANM-53 gate valve
              const gatePos = toWorld(tankRear - 4.4, -1.8);
              tryAdd(
                {
                  type: 'vacuum_gate_valve_toggle',
                  actionTitle: isGateOpen ? 'Закрыть шибер АНМ-53' : 'Открыть шибер АНМ-53',
                  x: gatePos.x,
                  y: gatePos.y,
                  outline: {
                    kind: 'rect',
                    cx: gatePos.x,
                    cy: gatePos.y,
                    width: 4.8,
                    height: 3.6,
                    angle: veh.angle,
                    radius: 1.2,
                  },
                  data: veh,
                },
                60,
                5,
                0
              );

              // 2. Rear orange RVD high-pressure jetter hose reel (Барабан РВД)
              const reelPos = toWorld(reelX - 0.3, 1.4);
              const reelOutline: InteractionOutlineShape = {
                kind: 'rect',
                cx: reelPos.x,
                cy: reelPos.y,
                width: 4.6,
                height: 6.4,
                angle: veh.angle,
                radius: 1.4,
              };
              if (holdingThisVehHose && holdingJetter) {
                tryAdd(
                  {
                    type: 'water_hose_stow',
                    actionTitle: 'Смотать рукав РВД',
                    x: reelPos.x,
                    y: reelPos.y,
                    outline: reelOutline,
                    data: veh,
                  },
                  62,
                  5,
                  0
                );
              } else if (!player.heldWaterHose && veh.fluidTank.hasWaterHose) {
                tryAdd(
                  {
                    type: 'water_hose_take',
                    actionTitle: 'Взять рукав РВД',
                    detail: 'Промывка ВД',
                    x: reelPos.x,
                    y: reelPos.y,
                    outline: reelOutline,
                    data: { veh, hoseMode: 'jetter' as const },
                  },
                  62,
                  5,
                  1
                );
              }

              // 3. Left side saddle hose rack for corrugated vacuum hose (Левый пенал)
              const rackPos = toWorld((rackX1 + rackX2) * 0.5, rackY + rackW * 0.5);
              const rackOutline: InteractionOutlineShape = {
                kind: 'rect',
                cx: rackPos.x,
                cy: rackPos.y,
                width: rackLen + 0.8,
                height: rackW + 1.8,
                angle: veh.angle,
                radius: 1.4,
              };
              if (holdingThisVehHose && !holdingJetter) {
                tryAdd(
                  {
                    type: 'water_hose_stow',
                    actionTitle: 'Уложить вакуумный рукав',
                    x: rackPos.x,
                    y: rackPos.y,
                    outline: rackOutline,
                    data: veh,
                  },
                  62,
                  5,
                  0
                );
              } else if (!player.heldWaterHose && veh.fluidTank.hasWaterHose) {
                tryAdd(
                  {
                    type: 'water_hose_take',
                    actionTitle: 'Взять вакуумный рукав',
                    detail: getLiquidNameRu(veh.fluidTank.liquidType || 'water'),
                    x: rackPos.x,
                    y: rackPos.y,
                    outline: rackOutline,
                    data: { veh, hoseMode: 'vacuum' as const },
                  },
                  62,
                  5,
                  1
                );
              }

              // 4. Side pump bay compartment behind cab
              const pumpPos = toWorld(compX1 + compLen * 0.5, -bodyW * 0.5 + 1.4);
              tryAdd(
                {
                  type: 'vacuum_pump_panel',
                  actionTitle: 'Пульт вакуум-насоса',
                  x: pumpPos.x,
                  y: pumpPos.y,
                  outline: {
                    kind: 'rect',
                    cx: pumpPos.x,
                    cy: pumpPos.y,
                    width: Math.max(7.5, compLen),
                    height: 5.5,
                    angle: veh.angle,
                    radius: 1.6,
                  },
                  data: veh,
                },
                64,
                5,
                1
              );
            } else if (vacBodyId === 'body_vacuum_sludge_ko505') {
              const pumpBayX2 = bodyX2;
              const pumpBayX1 = pumpBayX2 - 7.0;
              const pumpMidX = (pumpBayX1 + pumpBayX2) / 2;
              const bayW = halfW * 2 - 2.6;
              const tankRear = bodyX1 + 2.6;
              const doorShift = veh.fluidTank.rearDoorOpen ? -3.8 : 0;

              // 1. Rear lower discharge gate valve АНМ-53
              const gatePos = toWorld(tankRear + doorShift - 3.6, 0);
              tryAdd(
                {
                  type: 'vacuum_gate_valve_toggle',
                  actionTitle: isGateOpen ? 'Закрыть шибер АНМ-53' : 'Открыть шибер АНМ-53',
                  x: gatePos.x,
                  y: gatePos.y,
                  outline: {
                    kind: 'rect',
                    cx: gatePos.x,
                    cy: gatePos.y,
                    width: 5.6,
                    height: 5.2,
                    angle: veh.angle,
                    radius: 1.5,
                  },
                  data: veh,
                },
                60,
                5,
                0
              );

              // 2. Revolving hydraulic suction boom tip (Всасывающая стрела)
              const boomTip = getVehicleWaterHoseAnchor(veh);
              if (boomTip) {
                const boomOutline: InteractionOutlineShape = {
                  kind: 'circle',
                  cx: boomTip.x,
                  cy: boomTip.y,
                  radius: 5.5,
                };
                if (holdingThisVehHose) {
                  tryAdd(
                    {
                      type: 'water_hose_stow',
                      actionTitle: 'Уложить вакуумный рукав',
                      x: boomTip.x,
                      y: boomTip.y,
                      outline: boomOutline,
                      data: veh,
                    },
                    64,
                    6,
                    0
                  );
                } else if (!player.heldWaterHose && veh.fluidTank.hasWaterHose) {
                  tryAdd(
                    {
                      type: 'water_hose_take',
                      actionTitle: 'Взять вакуумный рукав',
                      detail: getLiquidNameRu(veh.fluidTank.liquidType || 'water'),
                      x: boomTip.x,
                      y: boomTip.y,
                      outline: boomOutline,
                      data: { veh, hoseMode: 'vacuum' as const },
                    },
                    64,
                    5,
                    1
                  );
                }
              }

              // 3. VK-6M2 pump bay behind cab (left side)
              const pumpPos = toWorld(pumpMidX, -bayW * 0.5 + 3.2);
              tryAdd(
                {
                  type: 'vacuum_pump_panel',
                  actionTitle: 'Пульт вакуум-насоса',
                  x: pumpPos.x,
                  y: pumpPos.y,
                  outline: {
                    kind: 'rect',
                    cx: pumpPos.x,
                    cy: pumpPos.y,
                    width: 7.4,
                    height: 6.4,
                    angle: veh.angle,
                    radius: 1.6,
                  },
                  data: veh,
                },
                64,
                5,
                1
              );
            } else if (vacBodyId === 'body_vacuum_twin_ko505') {
              const eqX2 = bodyX2;
              const eqX1 = eqX2 - 6.0;
              const eqMidX = (eqX1 + eqX2) / 2;
              const platW = halfW * 2 - 2.8;
              const tankFront = eqX1 - 0.5;
              const tankRear = bodyX1 + 2.9;
              const trayW = 2.05;
              const trayGap = 0.45;
              const centerGap = 1.25;
              const availForTwin = Math.max(14, halfW * 2 - 0.6 - 2 * (trayW + trayGap) - centerGap);
              const singleTankW = Math.min(9.4, availForTwin * 0.5);
              const outerSpanHalf = singleTankW + centerGap * 0.5;
              const lTrayY = -outerSpanHalf - trayGap - trayW;
              const tX1 = tankRear + 0.5;
              const tX2 = tankFront - 0.3;
              const tLen = Math.max(10, tX2 - tX1);

              // 1. Rear Y-collector + ANM-53 gate valve
              const gatePos = toWorld(tankRear - 3.6, 0);
              tryAdd(
                {
                  type: 'vacuum_gate_valve_toggle',
                  actionTitle: isGateOpen ? 'Закрыть шибер АНМ-53' : 'Открыть шибер АНМ-53',
                  x: gatePos.x,
                  y: gatePos.y,
                  outline: {
                    kind: 'rect',
                    cx: gatePos.x,
                    cy: gatePos.y,
                    width: 6.4,
                    height: 7.2,
                    angle: veh.angle,
                    radius: 1.5,
                  },
                  data: veh,
                },
                60,
                5,
                0
              );

              // 2. Left side hose carrier tray (Левый пенал)
              const trayPos = toWorld((tX1 + tX2) * 0.5, lTrayY + trayW * 0.5);
              const trayOutline: InteractionOutlineShape = {
                kind: 'rect',
                cx: trayPos.x,
                cy: trayPos.y,
                width: tLen + 0.8,
                height: trayW + 1.8,
                angle: veh.angle,
                radius: 1.4,
              };
              if (holdingThisVehHose) {
                tryAdd(
                  {
                    type: 'water_hose_stow',
                    actionTitle: 'Уложить вакуумный рукав',
                    x: trayPos.x,
                    y: trayPos.y,
                    outline: trayOutline,
                    data: veh,
                  },
                  62,
                  5,
                  0
                );
              } else if (!player.heldWaterHose && veh.fluidTank.hasWaterHose) {
                tryAdd(
                  {
                    type: 'water_hose_take',
                    actionTitle: 'Взять вакуумный рукав',
                    detail: getLiquidNameRu(veh.fluidTank.liquidType || 'water'),
                    x: trayPos.x,
                    y: trayPos.y,
                    outline: trayOutline,
                    data: { veh, hoseMode: 'vacuum' as const },
                  },
                  62,
                  5,
                  1
                );
              }

              // 3. Front side pump bay behind cab
              const pumpPos = toWorld(eqMidX, -platW * 0.5 + 3.0);
              tryAdd(
                {
                  type: 'vacuum_pump_panel',
                  actionTitle: 'Пульт вакуум-насоса',
                  x: pumpPos.x,
                  y: pumpPos.y,
                  outline: {
                    kind: 'rect',
                    cx: pumpPos.x,
                    cy: pumpPos.y,
                    width: 6.8,
                    height: 6.6,
                    angle: veh.angle,
                    radius: 1.6,
                  },
                  data: veh,
                },
                64,
                5,
                1
              );
            } else {
              // Standard KO-503 vacuum sewage truck (and fallback for other vacuum bodies)
              const eqX2 = bodyX2;
              const eqX1 = eqX2 - 5.8;
              const eqMidX = (eqX1 + eqX2) / 2;
              const platW = halfW * 2 - 3.6;
              const tankFront = eqX1 - 0.5;
              const tankRear = bodyX1 + 2.6;
              const tankW = Math.min(13.8, halfW * 1.12);
              const trayGap = 0.85;
              const trayW = 2.4;
              const leftTrayY = -tankW / 2 - trayGap - trayW;
              const trayX1 = tankRear + 0.4;
              const trayX2 = tankFront - 0.2;
              const trayLen = Math.max(8, trayX2 - trayX1);

              // 1. Rear ANM-53 slide gate valve
              const gatePos = toWorld(tankRear - 3.6, 0);
              tryAdd(
                {
                  type: 'vacuum_gate_valve_toggle',
                  actionTitle: isGateOpen ? 'Закрыть шибер АНМ-53' : 'Открыть шибер АНМ-53',
                  x: gatePos.x,
                  y: gatePos.y,
                  outline: {
                    kind: 'rect',
                    cx: gatePos.x,
                    cy: gatePos.y,
                    width: 6.4,
                    height: 7.4,
                    angle: veh.angle,
                    radius: 1.5,
                  },
                  data: veh,
                },
                60,
                5,
                0
              );

              // 2. Left side hose carrier tray (Левый пенал)
              const trayPos = toWorld((trayX1 + trayX2) * 0.5, leftTrayY + trayW * 0.5);
              const trayOutline: InteractionOutlineShape = {
                kind: 'rect',
                cx: trayPos.x,
                cy: trayPos.y,
                width: trayLen + 0.8,
                height: trayW + 1.8,
                angle: veh.angle,
                radius: 1.4,
              };
              if (holdingThisVehHose) {
                tryAdd(
                  {
                    type: 'water_hose_stow',
                    actionTitle: 'Уложить вакуумный рукав',
                    x: trayPos.x,
                    y: trayPos.y,
                    outline: trayOutline,
                    data: veh,
                  },
                  62,
                  5,
                  0
                );
              } else if (!player.heldWaterHose && veh.fluidTank.hasWaterHose) {
                tryAdd(
                  {
                    type: 'water_hose_take',
                    actionTitle: 'Взять вакуумный рукав',
                    detail: getLiquidNameRu(veh.fluidTank.liquidType || 'water'),
                    x: trayPos.x,
                    y: trayPos.y,
                    outline: trayOutline,
                    data: { veh, hoseMode: 'vacuum' as const },
                  },
                  62,
                  5,
                  1
                );
              }

              // 3. Front side pump bay behind cab
              const pumpPos = toWorld(eqMidX, -platW * 0.5 + 2.9);
              tryAdd(
                {
                  type: 'vacuum_pump_panel',
                  actionTitle: 'Пульт вакуум-насоса',
                  x: pumpPos.x,
                  y: pumpPos.y,
                  outline: {
                    kind: 'rect',
                    cx: pumpPos.x,
                    cy: pumpPos.y,
                    width: 6.6,
                    height: 6.4,
                    angle: veh.angle,
                    radius: 1.6,
                  },
                  data: veh,
                },
                64,
                5,
                1
              );
            }
          }
        } else {
          // Non-vacuum water / fire / barrel hose anchors
          if (player.heldWaterHose && player.heldWaterHose.vehicleId === veh.id) {
            const anchor = getVehicleWaterHoseAnchor(veh) || { x: veh.x, y: veh.y };
            tryAdd(
              {
                type: 'water_hose_stow',
                actionTitle: 'Уложить шланг',
                x: anchor.x,
                y: anchor.y,
                outline: { kind: 'circle', cx: anchor.x, cy: anchor.y, radius: 8.5 },
                data: veh,
              },
              58,
              5,
              0
            );
          } else if (!player.heldWaterHose && veh.fluidTank?.hasWaterHose) {
            const anchor = getVehicleWaterHoseAnchor(veh);
            if (anchor) {
              tryAdd(
                {
                  type: 'water_hose_take',
                  actionTitle: 'Взять шланг',
                  detail: getLiquidNameRu(veh.fluidTank.liquidType || 'water'),
                  x: anchor.x,
                  y: anchor.y,
                  outline: { kind: 'circle', cx: anchor.x, cy: anchor.y, radius: 8.5 },
                  data: veh,
                },
                58,
                5,
                1
              );
            }
          }
        }

        // --- Crane Truck: Outrigger Control Box + Turntable Operator Cabin ---
        if (isVehicleCraneTruck(veh)) {
          const L = veh.length || cfg.length;
          const W = veh.width || cfg.width;
          const outX = veh.x + cos * (-L * 0.08) - sin * (W * 0.52 + 6);
          const outY = veh.y + sin * (-L * 0.08) + cos * (W * 0.52 + 6);
          tryAdd(
            {
              type: 'crane_outriggers_panel',
              actionTitle: 'Пульт выносных опор',
              x: outX,
              y: outY,
              outline: {
                kind: 'rect',
                cx: outX,
                cy: outY,
                width: 14,
                height: 9,
                angle: veh.angle,
                radius: 2,
              },
              data: veh,
            },
            62,
            5,
            1
          );

          const cab = getCraneCabOutline(veh);
          tryAdd(
            {
              type: 'enter_crane_cab',
              actionTitle: 'Кабина крановщика',
              x: cab.cx,
              y: cab.cy,
              outline: cab.outline,
              data: veh,
            },
            68,
            5,
            1
          );
        }

        // --- Fuel Cap (Insert / Remove Gas Nozzle) ---
        if (player.heldFuelNozzle) {
          const nearbyFuelVeh = getNearbyVehicleForFueling(px, py, world);
          if (nearbyFuelVeh && nearbyFuelVeh.id === veh.id) {
            const capPos = getVehicleFuelCapPosition(veh);
            const grade = FUEL_GRADES[player.heldFuelNozzle.fuelType];
            tryAdd(
              {
                type: 'fuel_insert',
                actionTitle: `Вставить пистолет (${grade?.nameRu || ''})`,
                x: capPos.x,
                y: capPos.y,
                outline: { kind: 'circle', cx: capPos.x, cy: capPos.y, radius: 7.5 },
                data: veh,
              },
              56,
              6,
              0
            );
          }
        } else if (veh.fuelingState?.nozzleInTank) {
          const capPos = getVehicleFuelCapPosition(veh);
          const pump = world.gasPumps?.find((gp) => gp.id === veh.fuelingState?.pumpId);
          tryAdd(
            {
              type: 'fuel_remove',
              actionTitle: 'Вынуть пистолет',
              x: capPos.x,
              y: capPos.y,
              outline: { kind: 'circle', cx: capPos.x, cy: capPos.y, radius: 7.5 },
              data: { vehicle: veh, pump },
            },
            56,
            6,
            0
          );
        }

        // --- Non-trailer Vehicle Zones: Hood, Bus Doors, Roof/Cabin ---
        if (!isTrailer) {
          const zones = getVehicleZones(veh);

          // Hood (engine bay)
          if (zones.hood) {
            const hx = zones.hood.kind === 'rect' ? zones.hood.cx : veh.x;
            const hy = zones.hood.kind === 'rect' ? zones.hood.cy : veh.y;
            tryAdd(
              {
                type: 'open_hood',
                actionTitle: 'Открыть капот',
                detail: cfg.name,
                x: hx,
                y: hy,
                outline: zones.hood,
                data: veh,
              },
              60,
              2,
              2
            );
          }

          // Bus boarding doors
          if (veh.type === 'bus' || veh.type === 'bus_minibus') {
            const busDoors = getBusDoors(veh.type, veh.length, veh.width);
            for (const bd of busDoors) {
              const dwx = veh.x + bd.localX * cos - bd.localY * sin;
              const dwy = veh.y + bd.localX * sin + bd.localY * cos;
              tryAdd(
                {
                  type: 'enter_bus_saloon',
                  actionTitle: 'Войти в салон автобуса',
                  detail: bd.nameRu,
                  x: dwx,
                  y: dwy,
                  outline: { kind: 'rect', cx: dwx, cy: dwy, width: 11, height: 6.5, angle: veh.angle, radius: 1.5 },
                  data: { bus: veh, door: bd },
                },
                58,
                4,
                1
              );
            }
          }

          // Roof / Cabin (enter vehicle!)
          const rx = zones.roof.kind === 'rect' ? zones.roof.cx : veh.x;
          const ry = zones.roof.kind === 'rect' ? zones.roof.cy : veh.y;
          tryAdd(
            {
              type: 'enter_vehicle',
              actionTitle: 'Сесть в машину',
              detail: cfg.name,
              x: rx,
              y: ry,
              outline: zones.roof,
              data: veh,
            },
            68,
            2,
            3
          );
        } else {
          // --- Trailer Hitch / Coupler / Plug / Brakes / Handbrake ---
          const couplerOffset = veh.couplerOffset !== undefined ? veh.couplerOffset : cfg.length * 0.5 + 8;
          const couplerX = veh.x + cos * couplerOffset;
          const couplerY = veh.y + sin * couplerOffset;
          const couplerOutline: InteractionOutlineShape = {
            kind: 'rect',
            cx: couplerX,
            cy: couplerY,
            width: 14,
            height: 10,
            angle: veh.angle,
            radius: 2,
          };

          const trailer = veh;
          const isHitched = !!trailer.towedById;
          const towingVeh = isHitched ? world.vehicles.find((v) => v.id === trailer.towedById) : null;

          if (!isHitched) {
            let nearestTowing: Vehicle | null = null;
            let minDist = 48;
            for (const other of world.vehicles) {
              if (other.id === trailer.id || isTrailerVehicle(other)) continue;
              if (!canVehicleHaveHitch(other) || other.trailerId) continue;
              const oCfg = CAR_CONFIGS[other.type] || CAR_CONFIGS.sedan;
              const hOffset = other.hitchOffset !== undefined ? other.hitchOffset : -oCfg.length * 0.5 - 2;
              const hX = other.x + Math.cos(other.angle) * hOffset;
              const hY = other.y + Math.sin(other.angle) * hOffset;
              const d = Math.hypot(couplerX - hX, couplerY - hY);
              if (d < minDist) {
                minDist = d;
                nearestTowing = other;
              }
            }

            if (nearestTowing) {
              tryAdd(
                {
                  type: 'trailer_hitch',
                  actionTitle: 'Сцепить прицеп',
                  x: couplerX,
                  y: couplerY,
                  outline: couplerOutline,
                  data: { trailer, towingVeh: nearestTowing },
                },
                58,
                5,
                1
              );
            } else {
              // Unhitched trailer: allow toggling trailer parking brake on coupler/wheel area
              tryAdd(
                {
                  type: 'trailer_toggle_handbrake',
                  actionTitle: 'Стояночный тормоз прицепа',
                  x: couplerX,
                  y: couplerY,
                  outline: couplerOutline,
                  data: trailer,
                },
                58,
                5,
                2
              );
            }
          } else if (towingVeh) {
            const needsPlug = trailer.type !== 'trailer_barrel';
            const hasBrakes = trailer.type === 'trailer_flatbed_2axle' || trailer.type.startsWith('trailer_semi');
            const isPlugConnected = !!trailer.trailerPlugConnected;
            const isBrakesConnected = !!trailer.trailerBrakesConnected;
            const isHandbrakeEngaged = trailer.trailerParkingBrakeEngaged !== false;

            if (needsPlug && !isPlugConnected) {
              tryAdd(
                {
                  type: 'trailer_connect_plug',
                  actionTitle: 'Подключить электрокабель',
                  x: couplerX,
                  y: couplerY,
                  outline: couplerOutline,
                  data: { trailer, towingVeh },
                },
                58,
                5,
                1
              );
            } else if (hasBrakes && !isBrakesConnected) {
              tryAdd(
                {
                  type: 'trailer_connect_brakes',
                  actionTitle: 'Подключить пневмошланги',
                  x: couplerX,
                  y: couplerY,
                  outline: couplerOutline,
                  data: { trailer, towingVeh },
                },
                58,
                5,
                1
              );
            } else if (isHandbrakeEngaged) {
              tryAdd(
                {
                  type: 'trailer_toggle_handbrake',
                  actionTitle: 'Отпустить тормоз прицепа',
                  x: couplerX,
                  y: couplerY,
                  outline: couplerOutline,
                  data: trailer,
                },
                58,
                5,
                1
              );
            } else if (hasBrakes && isBrakesConnected) {
              tryAdd(
                {
                  type: 'trailer_disconnect_brakes',
                  actionTitle: 'Отключить пневмошланги',
                  x: couplerX,
                  y: couplerY,
                  outline: couplerOutline,
                  data: { trailer, towingVeh },
                },
                58,
                5,
                1
              );
            } else if (needsPlug && isPlugConnected) {
              tryAdd(
                {
                  type: 'trailer_disconnect_plug',
                  actionTitle: 'Отключить электрокабель',
                  x: couplerX,
                  y: couplerY,
                  outline: couplerOutline,
                  data: { trailer, towingVeh },
                },
                58,
                5,
                1
              );
            } else {
              tryAdd(
                {
                  type: 'trailer_unhitch',
                  actionTitle: 'Отцепить прицеп',
                  x: couplerX,
                  y: couplerY,
                  outline: couplerOutline,
                  data: { trailer, towingVeh },
                },
                58,
                5,
                1
              );
            }
          }
        }
      }
    }

    // 2b. Tow ropes (detach / cancel drag)
    if (world.towingRopes) {
      for (const rope of world.towingRopes) {
        const vehA = world.vehicles.find((v) => v.id === rope.vehicleAId);
        const vehB = world.vehicles.find((v) => v.id === rope.vehicleBId);
        if (vehA) {
          const cfgA = CAR_CONFIGS[vehA.type] || CAR_CONFIGS.sedan;
          const ax = vehA.x + (rope.isFrontA ? 1 : -1) * Math.cos(vehA.angle) * (cfgA.length * 0.5 + 1);
          const ay = vehA.y + (rope.isFrontA ? 1 : -1) * Math.sin(vehA.angle) * (cfgA.length * 0.5 + 1);
          tryAdd(
            {
              type: 'tow_rope_detach',
              actionTitle: 'Отцепить трос',
              x: ax,
              y: ay,
              outline: { kind: 'circle', cx: ax, cy: ay, radius: 7.5 },
              data: { rope, isEndA: true },
            },
            54,
            5,
            1
          );
        }
        if (vehB) {
          const cfgB = CAR_CONFIGS[vehB.type] || CAR_CONFIGS.sedan;
          const bx = vehB.x + (rope.isFrontB ? 1 : -1) * Math.cos(vehB.angle) * (cfgB.length * 0.5 + 1);
          const by = vehB.y + (rope.isFrontB ? 1 : -1) * Math.sin(vehB.angle) * (cfgB.length * 0.5 + 1);
          tryAdd(
            {
              type: 'tow_rope_detach',
              actionTitle: 'Отцепить трос',
              x: bx,
              y: by,
              outline: { kind: 'circle', cx: bx, cy: by, radius: 7.5 },
              data: { rope, isEndA: false },
            },
            54,
            5,
            1
          );
        }
      }
    }
    if (player.heldTowRope) {
      const veh = world.vehicles.find((v) => v.id === player.heldTowRope?.vehicleId);
      if (veh) {
        const cfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
        const ax = veh.x + (player.heldTowRope.isFront ? 1 : -1) * Math.cos(veh.angle) * (cfg.length * 0.5 + 1);
        const ay = veh.y + (player.heldTowRope.isFront ? 1 : -1) * Math.sin(veh.angle) * (cfg.length * 0.5 + 1);
        tryAdd(
          {
            type: 'tow_rope_detach',
            actionTitle: 'Снять буксировочный трос',
            x: ax,
            y: ay,
            outline: { kind: 'circle', cx: ax, cy: ay, radius: 8 },
            data: { isDragging: true },
          },
          56,
          5,
          0
        );
      }
    }

    // 2c. Gas Station Pumps
    const nearPump = getNearbyGasPump(px, py, world);
    if (nearPump) {
      const pumpOutline: InteractionOutlineShape = {
        kind: 'rect',
        cx: nearPump.x,
        cy: nearPump.y,
        width: 22,
        height: 16,
        angle: 0,
        radius: 2,
      };
      if (player.heldFuelNozzle) {
        tryAdd(
          {
            type: 'pump_return_nozzle',
            actionTitle: 'Повесить пистолет',
            x: nearPump.x,
            y: nearPump.y,
            outline: pumpOutline,
            data: nearPump,
          },
          56,
          4,
          1
        );
      } else {
        tryAdd(
          {
            type: 'pump_take_nozzle',
            actionTitle: 'Взять пистолет',
            x: nearPump.x,
            y: nearPump.y,
            outline: pumpOutline,
            data: nearPump,
          },
          56,
          4,
          1
        );
      }
    }

    // 2d. Passenger Train Cars (Outside boarding doors)
    const passengerCars = (world.rollingStock || []).filter(
      (car) =>
        car.type.startsWith('passenger_') ||
        car.type.includes('coach') ||
        car.type.includes('platskart') ||
        car.type.includes('kupe') ||
        car.name?.includes('вагон') ||
        car.name?.includes('Рельсовый автобус')
    );
    for (const car of passengerCars) {
      const halfL = car.length * 0.5;
      const halfW = car.width * 0.5;
      if (Math.hypot(px - car.x, py - car.y) > halfL + 85) continue;
      const cos = Math.cos(car.angle);
      const sin = Math.sin(car.angle);
      const cScale = (car.width || 30) / 60;
      const doors = [
        { id: 'work_north', name: 'Рабочий тамбур', localX: halfL - 19 * cScale, localY: -halfW, vestibuleLocalX: halfL - 19 * cScale, vestibuleLocalY: -8 * cScale },
        { id: 'work_south', name: 'Рабочий тамбур', localX: halfL - 19 * cScale, localY: halfW, vestibuleLocalX: halfL - 19 * cScale, vestibuleLocalY: 8 * cScale },
        { id: 'nonwork_north', name: 'Нерабочий тамбур', localX: -halfL + 18 * cScale, localY: -halfW, vestibuleLocalX: -halfL + 18 * cScale, vestibuleLocalY: -8 * cScale },
        { id: 'nonwork_south', name: 'Нерабочий тамбур', localX: -halfL + 18 * cScale, localY: halfW, vestibuleLocalX: -halfL + 18 * cScale, vestibuleLocalY: 8 * cScale },
      ];
      for (const d of doors) {
        const dwx = car.x + d.localX * cos - d.localY * sin;
        const dwy = car.y + d.localX * sin + d.localY * cos;
        tryAdd(
          {
            type: 'enter_passenger_car',
            actionTitle: 'Подняться в вагон',
            x: dwx,
            y: dwy,
            outline: { kind: 'rect', cx: dwx, cy: dwy, width: 12, height: 7, angle: car.angle, radius: 1.5 },
            data: { car, door: d },
          },
          44,
          5,
          1
        );
      }
    }

    // 2e. Building Entrances (Outside)
    if (world.buildings) {
      const apartments = getCityApartments();
      for (const bld of world.buildings) {
        if (bld.type === 'park_monument') continue;
        // Fast bounding rejection
        if (
          px < bld.x - 90 ||
          px > bld.x + bld.width + 90 ||
          py < bld.y - 90 ||
          py > bld.y + bld.height + 90
        ) {
          continue;
        }
        const ents = getAllBuildingEntrances(bld);
        for (const ent of ents) {
          const isHorizontal = ent.side === 'north' || ent.side === 'south';
          const entOutline: InteractionOutlineShape = {
            kind: 'rect',
            cx: ent.x,
            cy: ent.y,
            width: isHorizontal ? 22 : 12,
            height: isHorizontal ? 12 : 22,
            angle: 0,
            radius: 2,
          };

          if (bld.type === 'suburban') {
            const apt = apartments.find((a) => a.buildingId === bld.id) || getApartmentForPlot(bld.id);
            if (apt && apt.isLocked) {
              const hasKey = hasPlayerApartmentKey(player, apt);
              tryAdd(
                {
                  type: hasKey ? 'apartment_door_lock' : 'apartment_door_locked_nokey',
                  actionTitle: hasKey ? 'Отпереть дверь' : 'Дверь заперта',
                  x: ent.x,
                  y: ent.y,
                  outline: entOutline,
                  data: { apt, hasKey },
                },
                56,
                4,
                2
              );
              continue;
            }
          }

          tryAdd(
            {
              type: 'enter_building',
              actionTitle: bld.nameRu || 'Войти',
              x: ent.x,
              y: ent.y,
              outline: entOutline,
              data: { bld, ent },
            },
            56,
            4,
            2
          );
        }
      }
    }

    // 2f. World Props (Dumpsters, Trash Cans, Gates, Wickets, Security Barriers)
    if (world.props) {
      const propsToCheck = propsGrid
        ? propsGrid.queryRadius(px, py, 110, _interactionPropsScratch)
        : world.props;
      for (let pi = 0; pi < propsToCheck.length; pi++) {
        const prop = propsToCheck[pi];
        if (!propsGrid && (Math.abs(prop.x - px) > 110 || Math.abs(prop.y - py) > 110)) continue;

        if (prop.type === 'dumpster') {
          tryAdd(
            {
              type: 'eco_recycle',
              actionTitle: 'Сдать тару',
              x: prop.x,
              y: prop.y,
              outline: { kind: 'rect', cx: prop.x, cy: prop.y, width: 20, height: 14, angle: prop.angle || 0, radius: 2 },
              data: prop,
            },
            56,
            4,
            2
          );
        } else if (prop.type === 'trash_can') {
          tryAdd(
            {
              type: 'trash_throw',
              actionTitle: 'Выбросить мусор',
              x: prop.x,
              y: prop.y,
              outline: { kind: 'circle', cx: prop.x, cy: prop.y, radius: 8 },
              data: prop,
            },
            52,
            4,
            2
          );
        } else if (prop.type === 'cottage_gate' || prop.type === 'wicket_gate' || prop.type === 'security_barrier') {
          const isGate = prop.type === 'cottage_gate';
          const isBarrier = prop.type === 'security_barrier';
          const gateOutline: InteractionOutlineShape = {
            kind: 'rect',
            cx: prop.x,
            cy: prop.y,
            width: isGate ? 34 : isBarrier ? 28 : 16,
            height: 10,
            angle: prop.angle || 0,
            radius: 2,
          };
          const apt = getApartmentForPlot(prop.plotId || prop.id);
          const hasKey = hasPlayerApartmentKey(player, apt);

          if (!prop.isOpen && prop.isLocked) {
            tryAdd(
              {
                type: hasKey ? 'gate_lock_unlock' : 'gate_locked_nokey',
                actionTitle: hasKey ? 'Отпереть ворота' : 'Заперто',
                x: prop.x,
                y: prop.y,
                outline: gateOutline,
                data: { prop, apt, hasKey },
              },
              isGate ? 72 : 56,
              4,
              2
            );
          } else {
            tryAdd(
              {
                type: 'gate_open_close',
                actionTitle: prop.isOpen ? 'Закрыть' : 'Открыть',
                x: prop.x,
                y: prop.y,
                outline: gateOutline,
                data: { prop, apt, hasKey },
              },
              isGate ? 72 : 56,
              4,
              2
            );
          }
        }
      }
    }
  }

  // ==========================================
  // 3. GROUND ITEMS (Both inside buildings & outside)
  // ==========================================
  if (world.groundItems && world.groundItems.length > 0) {
    for (const gi of world.groundItems) {
      if (Math.abs(gi.x - px) > 70 || Math.abs(gi.y - py) > 70) continue;
      tryAdd(
        {
          type: 'pickup_item',
          actionTitle: gi.item.nameRu,
          x: gi.x,
          y: gi.y,
          outline: { kind: 'circle', cx: gi.x, cy: gi.y, radius: 8.5 },
          data: gi,
        },
        52,
        5,
        1
      );
    }
  }

  // ==========================================
  // 4. STREET LITTER (Outside)
  // ==========================================
  if (!player.isInsideBuilding && world.litter && world.litter.length > 0) {
    for (const lit of world.litter) {
      if (lit.isAirborne || (lit.altitude || 0) > 1.5 || lit.type === 'leaf') continue;
      if (Math.abs(lit.x - px) > 65 || Math.abs(lit.y - py) > 65) continue;
      tryAdd(
        {
          type: 'pickup_litter',
          actionTitle: 'Мусор',
          x: lit.x,
          y: lit.y,
          outline: { kind: 'circle', cx: lit.x, cy: lit.y, radius: 7 },
          data: lit,
        },
        48,
        5,
        2
      );
    }
  }

  return pickBest(hits);
}

function pickBest(hits: CandidateEntry[]): InteractionTarget | null {
  if (hits.length === 0) return null;
  hits.sort((a, b) => {
    if (a.inside !== b.inside) return a.inside ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.pointerDist - b.pointerDist;
  });
  return hits[0].target;
}

/**
 * Legacy alias for callers expecting `findActiveInteraction`.
 */
export function findActiveInteraction(
  player: Player,
  world: GameWorld,
  mouseWorldPos?: { x: number; y: number } | null,
  _unusedFilter?: unknown,
  propsGrid?: any
): InteractionTarget | null {
  return findPointedInteraction(player, world, mouseWorldPos, false, propsGrid);
}

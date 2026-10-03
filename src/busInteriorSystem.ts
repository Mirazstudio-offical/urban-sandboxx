import { Player, Vehicle, RollingStockCar, Building, PlayerSeatState } from './types';
import { CAR_CONFIGS } from './vehicleHelpers';
import { sound } from './audio';

export interface BusSeat {
  id: string;
  localX: number;
  localY: number;
  angle: number; // facing angle relative to vehicle heading
  isDriver?: boolean;
  labelRu: string;
}

export interface BusDoor {
  id: string;
  nameRu: string;
  localX: number;
  localY: number;
  vestibuleLocalX: number;
  vestibuleLocalY: number;
  width: number;
}

/**
 * Returns list of interactive passenger and driver seats for a bus archetype
 */
export function getBusSeatPositions(busType: string): BusSeat[] {
  if (busType === 'bus_minibus') {
    // Minibus (Газель / Спринтер / ПАЗ)
    return [
      { id: 'driver', localX: 18, localY: -5.5, angle: 0, isDriver: true, labelRu: 'Водительское кресло микроавтобуса' },
      { id: 'front_pass', localX: 18, localY: 5.5, angle: 0, labelRu: 'Переднее пассажирское место' },
      { id: 'seat_l1', localX: 7, localY: -5.8, angle: 0, labelRu: 'Пассажирское сиденье (левый ряд)' },
      { id: 'seat_l2', localX: -2, localY: -5.8, angle: 0, labelRu: 'Пассажирское сиденье (левый ряд)' },
      { id: 'seat_l3', localX: -11, localY: -5.8, angle: 0, labelRu: 'Пассажирское сиденье (левый ряд)' },
      { id: 'seat_l4', localX: -20, localY: -5.8, angle: 0, labelRu: 'Пассажирское сиденье (левый ряд)' },
      { id: 'seat_r1', localX: -2, localY: 5.8, angle: 0, labelRu: 'Пассажирское сиденье (правый ряд)' },
      { id: 'seat_r2', localX: -11, localY: 5.8, angle: 0, labelRu: 'Пассажирское сиденье (правый ряд)' },
      { id: 'rear_1', localX: -24, localY: -5.8, angle: 0, labelRu: 'Задний ряд сидений (левое окно)' },
      { id: 'rear_2', localX: -24, localY: -1.8, angle: 0, labelRu: 'Задний ряд сидений' },
      { id: 'rear_3', localX: -24, localY: 2.2, angle: 0, labelRu: 'Задний ряд сидений' },
      { id: 'rear_4', localX: -24, localY: 6.2, angle: 0, labelRu: 'Задний ряд сидений (правое окно)' }
    ];
  }

  // Standard City Bus (ЛиАЗ / МАЗ / НефАЗ)
  return [
    { id: 'driver', localX: 31, localY: -6.0, angle: 0, isDriver: true, labelRu: 'Кресло водителя автобуса' },
    // Left side double seats
    { id: 'seat_l1', localX: 18, localY: -6.8, angle: 0, labelRu: 'Двойное сиденье (левый ряд, у окна)' },
    { id: 'seat_l2', localX: 9, localY: -6.8, angle: 0, labelRu: 'Двойное сиденье (левый ряд)' },
    { id: 'seat_l3', localX: 0, localY: -6.8, angle: 0, labelRu: 'Двойное сиденье (левый ряд, середина)' },
    { id: 'seat_l4', localX: -9, localY: -6.8, angle: 0, labelRu: 'Двойное сиденье (левый ряд)' },
    { id: 'seat_l5', localX: -18, localY: -6.8, angle: 0, labelRu: 'Двойное сиденье (левый ряд)' },
    { id: 'seat_l6', localX: -27, localY: -6.8, angle: 0, labelRu: 'Двойное сиденье (левый ряд, заднее)' },
    // Right side single & double seats
    { id: 'seat_r1', localX: 6, localY: 7.2, angle: 0, labelRu: 'Одиночное сиденье (правый ряд)' },
    { id: 'seat_r2', localX: -4, localY: 7.2, angle: 0, labelRu: 'Одиночное сиденье (правый ряд)' },
    { id: 'seat_r3', localX: -27, localY: 7.2, angle: 0, labelRu: 'Двойное сиденье (правый ряд, заднее)' },
    // Rear raised bench
    { id: 'rear_1', localX: -36, localY: -7.5, angle: 0, labelRu: 'Задний диван автобуса (левое окно)' },
    { id: 'rear_2', localX: -36, localY: -2.5, angle: 0, labelRu: 'Задний диван автобуса' },
    { id: 'rear_3', localX: -36, localY: 2.5, angle: 0, labelRu: 'Задний диван автобуса' },
    { id: 'rear_4', localX: -36, localY: 7.5, angle: 0, labelRu: 'Задний диван автобуса (правое окно)' }
  ];
}

/**
 * Returns passenger boarding doors for a bus archetype
 */
export function getBusDoors(busType: string, length: number = 85, width: number = 26): BusDoor[] {
  const halfL = length / 2;
  const halfW = width / 2;

  if (busType === 'bus_minibus') {
    return [
      {
        id: 'door_slide',
        nameRu: 'Сдвижная дверь салона',
        localX: 14,
        localY: halfW,
        vestibuleLocalX: 14,
        vestibuleLocalY: 4.5,
        width: 8
      }
    ];
  }

  // City bus has front and middle/rear doors
  return [
    {
      id: 'door_front',
      nameRu: 'Передняя дверь (посадка)',
      localX: halfL - 14, // ~28.5
      localY: halfW,
      vestibuleLocalX: halfL - 14,
      vestibuleLocalY: 5.5,
      width: 9
    },
    {
      id: 'door_middle',
      nameRu: 'Средняя дверь (выход/посадка)',
      localX: -halfL + 24, // ~ -18.5
      localY: halfW,
      vestibuleLocalX: -halfL + 24,
      vestibuleLocalY: 5.5,
      width: 9
    }
  ];
}

/**
 * Constrains player to stay inside the bus saloon, aisles and seat bays
 */
export function constrainPlayerToBusInterior(
  player: Player,
  bus: Vehicle,
  dt: number
): void {
  const isMinibus = bus.type === 'bus_minibus';
  const halfL = bus.length / 2;
  const halfW = bus.width / 2;
  const playerRadius = 4.5;

  let px = player.busLocalX ?? (halfL - 14);
  let py = player.busLocalY ?? 5.5;

  // 1. Boundary of outer bus body shell
  const minX = -halfL + 3.2 + playerRadius;
  const maxX = halfL - 3.2 - playerRadius;
  const minY = -halfW + 2.5 + playerRadius;
  const maxY = halfW - 2.5 - playerRadius;

  px = Math.max(minX, Math.min(maxX, px));
  py = Math.max(minY, Math.min(maxY, py));

  // 2. Interior Walls & Driver bulkhead
  const walls: { x1: number; y1: number; x2: number; y2: number }[] = [];

  if (isMinibus) {
    // Minibus driver partition behind driver seat with walkway
    walls.push({ x1: 24, y1: -halfW + 2, x2: 24, y2: 0 });
    // Front windshield bulkhead
    walls.push({ x1: halfL - 4, y1: -halfW + 2, x2: halfL - 4, y2: halfW - 2 });
  } else {
    // Standard city bus driver cabin enclosure
    // Left partition wall separating driver from saloon
    walls.push({ x1: 22, y1: -halfW + 2, x2: 22, y2: -1.0 });
    walls.push({ x1: 22, y1: -1.0, x2: halfL - 8, y2: -1.0 });
    // Front windshield barrier
    walls.push({ x1: halfL - 4, y1: -halfW + 2, x2: halfL - 4, y2: halfW - 2 });
    // Rear engine compartment raised wall
    walls.push({ x1: -halfL + 5, y1: -halfW + 2, x2: -halfL + 5, y2: halfW - 2 });
  }

  // Resolve collision against walls
  for (const wall of walls) {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = ((px - wall.x1) * dx + (py - wall.y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const closestX = wall.x1 + t * dx;
    const closestY = wall.y1 + t * dy;

    const distDx = px - closestX;
    const distDy = py - closestY;
    const distSq = distDx * distDx + distDy * distDy;
    const minDist = playerRadius + 0.8;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      if (dist > 0.001) {
        px += (distDx / dist) * overlap;
        py += (distDy / dist) * overlap;
      } else {
        px += minDist;
      }
    }
  }

  player.busLocalX = px;
  player.busLocalY = py;
}

/**
 * Returns list of passenger seats in train coaches (Platskart / Kupe)
 */
export function getTrainCoachSeats(car: RollingStockCar): BusSeat[] {
  const halfL = car.length / 2;
  const isPlatskart = (car.type && car.type.includes('platskart')) ||
    (car.name && car.name.toLowerCase().includes('плацкарт'));

  const wcEndX = -halfL + 85;    // -160
  const saloonStartX = wcEndX;   // -160
  const saloonEndX = halfL - 75; // 170
  const saloonL = saloonEndX - saloonStartX;
  const numComps = 9;
  const compW = saloonL / numComps;

  const seats: BusSeat[] = [];

  for (let i = 0; i < numComps; i++) {
    const compX = saloonStartX + i * compW;
    const compNum = i + 1;

    // Left lower berth / seat (facing right / East)
    seats.push({
      id: `train_comp_${compNum}_l`,
      localX: compX + 8,
      localY: -7,
      angle: 0,
      labelRu: `Купе №${compNum} (нижняя полка у окна)`
    });

    // Right lower berth / seat (facing left / West)
    seats.push({
      id: `train_comp_${compNum}_r`,
      localX: compX + compW - 8,
      localY: -7,
      angle: Math.PI,
      labelRu: `Купе №${compNum} (нижняя полка у двери)`
    });

    if (isPlatskart) {
      // Side lower berth seats along the corridor
      seats.push({
        id: `train_side_${compNum}_l`,
        localX: compX + 8,
        localY: 8,
        angle: 0,
        labelRu: `Боковое место №${compNum * 2} (боковушка)`
      });
      seats.push({
        id: `train_side_${compNum}_r`,
        localX: compX + compW - 8,
        localY: 8,
        angle: Math.PI,
        labelRu: `Боковое место №${compNum * 2 + 1} (боковушка)`
      });
    }
  }

  // Conductor compartment chair
  seats.push({
    id: 'conductor_chair',
    localX: saloonEndX + 14,
    localY: -6,
    angle: 0,
    labelRu: 'Служебное кресло проводника'
  });

  return seats;
}

/**
 * Sit player down on a seat (bus, train, or building furniture)
 */
export function sitPlayerOnSeat(
  player: Player,
  seatState: PlayerSeatState
): void {
  player.sittingState = seatState;
  player.speed = 0;
  player.vx = 0;
  player.vy = 0;
  player.angle = seatState.angle;
  player.x = seatState.worldX;
  player.y = seatState.worldY;

  // Gentle sensory sound on sitting
  sound.playUseItem();
}

/**
 * Stand player up from seat
 */
export function standPlayerUp(player: Player): void {
  if (!player.sittingState) return;
  player.sittingState = null;
  sound.playUseItem();
}

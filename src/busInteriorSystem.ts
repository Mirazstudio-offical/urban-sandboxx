import { Player, Vehicle, RollingStockCar, Building, PlayerSeatState } from './types';
import { CAR_CONFIGS } from './vehicleHelpers';
import { sound } from './audio';
import {
  getGazelleWalkableSaloonKind,
  GazelleWalkableSaloonKind,
  resolveVehicleTruckFrameAndBody,
} from './truckChassisVariants';

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
  exitLocalX?: number;
  exitLocalY?: number;
  width: number;
}

export interface GazelleInteriorLayout {
  kind: GazelleWalkableSaloonKind;
  isIntegral: boolean;
  isFermer: boolean;
  halfL: number;
  halfW: number;
  cabFrontX: number;
  cabRearX: number;
  cockpitSeatX: number;
  partitionX: number;
  salRearX: number;
  salFrontX: number;
  doorSlideX: number;
  gurneyX: number;
  gurneyY: number;
  medHeadSeatX: number;
  medHeadSeatY: number;
  medSideSeatX: number;
  medSideSeatY: number;
  labCouchX: number;
  labCouchY: number;
  labDoctorX: number;
  labDoctorY: number;
  labWaitX: number;
  labWaitY: number;
  passengerLeftXs: number[];
  passengerRightXs: number[];
  rearBenchX: number;
}

export function getGazelleInteriorLayout(veh: {
  type?: string;
  length?: number;
  width?: number;
  frameId?: string;
  bodyId?: string;
  engineState?: { frameId?: string; bodyId?: string };
}): GazelleInteriorLayout | null {
  const kind = getGazelleWalkableSaloonKind(veh);
  if (!kind) return null;

  const resolved = resolveVehicleTruckFrameAndBody(veh as {
    type: string;
    frameId?: string;
    bodyId?: string;
    engineState?: { frameId?: string; bodyId?: string };
  });
  const halfL = (veh.length || resolved?.frame.lengthPx || 54) * 0.5;
  const halfW = (veh.width || 22) * 0.5;
  const isFermer = !!resolved?.frame.id.includes('fermer');
  const isIntegral = kind !== 'med_module';

  const cabinL = isFermer ? 21.8 : 13.8;
  const cabinX = halfL - (isFermer ? 19.2 : 15.2);
  const cabFrontX = cabinX + cabinL * 0.5;
  const cabRearX = cabinX - cabinL * 0.5;
  const cockpitSeatX = cabFrontX - 6.8;
  const partitionX = cabFrontX - 10.6;

  const salRearX = -halfL + 3.2;
  const salFrontX = isIntegral ? cabFrontX - 11.4 : cabRearX - 2.0;
  const doorSlideX = isIntegral ? salFrontX - 4.2 : salFrontX - 4.8;
  const salMidX = (salRearX + salFrontX) * 0.5;

  // Passenger ЦМФ seating rows scaled to wheelbase/frame length
  const rearBenchX = salRearX + 2.8;
  const leftStart = salFrontX - 3.2;
  const leftEnd = rearBenchX + 5.6;
  const passengerLeftXs: number[] = [];
  for (let x = leftStart; x >= leftEnd - 0.5; x -= 6.8) {
    passengerLeftXs.push(Number(x.toFixed(2)));
  }

  const rightStart = doorSlideX - 6.4;
  const passengerRightXs: number[] = [];
  for (let x = rightStart; x >= leftEnd - 0.5; x -= 6.8) {
    passengerRightXs.push(Number(x.toFixed(2)));
  }

  // Medical gurney & clinician seating
  const gurneyX = Math.max(salRearX + 9.2, salMidX - 1.8);
  const gurneyY = -2.6;
  const medHeadSeatX = Math.min(salFrontX - 2.6, gurneyX + 9.6);
  const medHeadSeatY = -2.6;
  const medSideSeatX = gurneyX - 0.8;
  const medSideSeatY = halfW - 3.9;

  // Mobile Lab / FAP layout
  const labCouchX = salRearX + 9.8;
  const labCouchY = -halfW + 4.4;
  const labDoctorX = salRearX + 10.2;
  const labDoctorY = 3.2;
  const labWaitX = Math.min(salFrontX - 3.6, labCouchX + 11.5);
  const labWaitY = -halfW + 4.2;

  return {
    kind,
    isIntegral,
    isFermer,
    halfL,
    halfW,
    cabFrontX,
    cabRearX,
    cockpitSeatX,
    partitionX,
    salRearX,
    salFrontX,
    doorSlideX,
    gurneyX,
    gurneyY,
    medHeadSeatX,
    medHeadSeatY,
    medSideSeatX,
    medSideSeatY,
    labCouchX,
    labCouchY,
    labDoctorX,
    labDoctorY,
    labWaitX,
    labWaitY,
    passengerLeftXs,
    passengerRightXs,
    rearBenchX,
  };
}

/**
 * Returns list of interactive passenger and driver seats for a bus or walkable GAZelle archetype
 */
export function getBusSeatPositions(busTypeOrVehicle: string | Vehicle): BusSeat[] {
  const veh = typeof busTypeOrVehicle === 'object' ? busTypeOrVehicle : null;
  const busType = typeof busTypeOrVehicle === 'string' ? busTypeOrVehicle : busTypeOrVehicle.type;

  if (veh) {
    const gz = getGazelleInteriorLayout(veh);
    if (gz) {
      const seats: BusSeat[] = [];

      if (gz.isIntegral) {
        seats.push({
          id: 'driver',
          localX: gz.cockpitSeatX,
          localY: -4.8,
          angle: 0,
          isDriver: true,
          labelRu: 'Водительское кресло ГАЗели',
        });
        seats.push({
          id: 'front_pass',
          localX: gz.cockpitSeatX,
          localY: 4.8,
          angle: 0,
          labelRu: 'Переднее место кабины',
        });
      }

      if (gz.kind === 'passenger') {
        gz.passengerLeftXs.forEach((sx, idx) => {
          seats.push({
            id: `gz_seat_l${idx + 1}`,
            localX: sx,
            localY: -5.4,
            angle: 0,
            labelRu: `Пассажирское сиденье (левый ряд, место ${idx + 1})`,
          });
        });
        gz.passengerRightXs.forEach((sx, idx) => {
          seats.push({
            id: `gz_seat_r${idx + 1}`,
            localX: sx,
            localY: 5.4,
            angle: 0,
            labelRu: `Пассажирское сиденье (правый ряд, место ${idx + 1})`,
          });
        });
        const rearYs = [-5.6, -1.9, 1.9, 5.6];
        rearYs.forEach((ry, idx) => {
          seats.push({
            id: `gz_rear_${idx + 1}`,
            localX: gz.rearBenchX,
            localY: ry,
            angle: 0,
            labelRu: idx === 0 || idx === 3 ? 'Задний ряд салона (у окна)' : 'Задний ряд салона',
          });
        });
        return seats;
      }

      if (gz.kind === 'med_03' || gz.kind === 'med_reanim' || gz.kind === 'med_module') {
        seats.push({
          id: 'med_stretcher',
          localX: gz.gurneyX,
          localY: gz.gurneyY,
          angle: 0,
          labelRu: gz.kind === 'med_reanim' ? 'Реанимационные каталки-носилки' : 'Медицинские каталки-носилки',
        });
        seats.push({
          id: 'med_seat_head',
          localX: gz.medHeadSeatX,
          localY: gz.medHeadSeatY,
          angle: Math.PI,
          labelRu: gz.kind === 'med_reanim' ? 'Кресло врача-реаниматолога у изголовья' : 'Кресло фельдшера у изголовья',
        });
        seats.push({
          id: 'med_seat_side',
          localX: gz.medSideSeatX,
          localY: gz.medSideSeatY,
          angle: -Math.PI / 2,
          labelRu: 'Откидное кресло медперсонала',
        });
        return seats;
      }

      if (gz.kind === 'med_lab') {
        seats.push({
          id: 'lab_patient_couch',
          localX: gz.labCouchX,
          localY: gz.labCouchY,
          angle: 0,
          labelRu: 'Смотровая медицинская кушетка',
        });
        seats.push({
          id: 'lab_doctor_chair',
          localX: gz.labDoctorX,
          localY: gz.labDoctorY,
          angle: Math.PI / 2,
          labelRu: 'Врачебное кресло у рабочего стола',
        });
        seats.push({
          id: 'lab_bench_wait',
          localX: gz.labWaitX,
          localY: gz.labWaitY,
          angle: 0,
          labelRu: 'Сиденье приёмного отсека',
        });
        return seats;
      }
    }
  }

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
 * Returns passenger boarding doors for a bus or walkable GAZelle archetype
 */
export function getBusDoors(busTypeOrVehicle: string | Vehicle, length: number = 85, width: number = 26): BusDoor[] {
  const veh = typeof busTypeOrVehicle === 'object' ? busTypeOrVehicle : null;
  const busType = typeof busTypeOrVehicle === 'string' ? busTypeOrVehicle : busTypeOrVehicle.type;
  const halfL = (veh?.length || length) / 2;
  const halfW = (veh?.width || width) / 2;

  if (veh) {
    const gz = getGazelleInteriorLayout(veh);
    if (gz) {
      const doors: BusDoor[] = [
        {
          id: 'door_slide',
          nameRu: gz.kind === 'passenger' ? 'Сдвижная дверь салона' : 'Боковая дверь медблока',
          localX: gz.doorSlideX,
          localY: halfW,
          vestibuleLocalX: gz.doorSlideX,
          vestibuleLocalY: Math.max(2.5, halfW - 6.2),
          exitLocalX: gz.doorSlideX,
          exitLocalY: halfW + 6.8,
          width: 7.5,
        },
      ];

      if (gz.kind !== 'passenger') {
        doors.push({
          id: 'door_rear',
          nameRu: 'Задние распашные двери (каталка)',
          localX: -halfL + 0.5,
          localY: 0,
          vestibuleLocalX: -halfL + 6.5,
          vestibuleLocalY: 1.5,
          exitLocalX: -halfL - 7.0,
          exitLocalY: 0,
          width: 10,
        });
      }
      return doors;
    }
  }

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
 * Constrains player to stay inside the bus or GAZelle saloon, aisles and seat bays
 */
export function constrainPlayerToBusInterior(
  player: Player,
  bus: Vehicle,
  dt: number
): void {
  const gz = getGazelleInteriorLayout(bus);
  const isMinibus = bus.type === 'bus_minibus';
  const halfL = bus.length / 2;
  const halfW = bus.width / 2;
  const playerRadius = gz ? 1.95 : 2.4;

  let px = player.busLocalX ?? (gz ? gz.doorSlideX : halfL - 14);
  let py = player.busLocalY ?? (gz ? 3.5 : 5.5);

  // 1. Boundary of outer bus/GAZelle body shell
  const minX = gz ? (gz.salRearX - 0.4 + playerRadius) : (-halfL + 3.2 + playerRadius);
  const maxX = gz
    ? (gz.isIntegral ? (gz.cabFrontX - 3.6 - playerRadius) : (gz.salFrontX - playerRadius))
    : (halfL - 3.2 - playerRadius);
  const minY = -halfW + (gz ? 1.8 : 2.5) + playerRadius;
  const maxY = halfW - (gz ? 1.8 : 2.5) - playerRadius;

  px = Math.max(minX, Math.min(maxX, px));
  py = Math.max(minY, Math.min(maxY, py));

  // 2. Interior Walls & Driver bulkhead
  const walls: { x1: number; y1: number; x2: number; y2: number }[] = [];

  if (gz) {
    if (gz.isIntegral) {
      // Driver partition behind driver seat with walkway on right side
      walls.push({ x1: gz.partitionX, y1: -halfW + 1.5, x2: gz.partitionX, y2: 1.0 });
      // Front windshield bulkhead
      walls.push({ x1: gz.cabFrontX - 3.3, y1: -halfW + 1.5, x2: gz.cabFrontX - 3.3, y2: halfW - 1.5 });
    } else {
      // Isolated modular box front bulkhead
      walls.push({ x1: gz.salFrontX + 0.5, y1: -halfW + 1.5, x2: gz.salFrontX + 0.5, y2: halfW - 1.5 });
    }
  } else if (isMinibus) {
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
    const minDist = playerRadius + 0.7;

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
  const scale = (car.width || 30) / 60;
  const isPlatskart = (car.type && car.type.includes('platskart')) ||
    (car.name && car.name.toLowerCase().includes('плацкарт'));

  const wcEndX = -halfL + 85 * scale;
  const saloonStartX = wcEndX;
  const saloonEndX = halfL - 75 * scale;
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
      localX: compX + 8 * scale,
      localY: -7 * scale,
      angle: 0,
      labelRu: `Купе №${compNum} (нижняя полка у окна)`
    });

    // Right lower berth / seat (facing left / West)
    seats.push({
      id: `train_comp_${compNum}_r`,
      localX: compX + compW - 8 * scale,
      localY: -7 * scale,
      angle: Math.PI,
      labelRu: `Купе №${compNum} (нижняя полка у двери)`
    });

    if (isPlatskart) {
      // Side lower berth seats along the corridor
      seats.push({
        id: `train_side_${compNum}_l`,
        localX: compX + 8 * scale,
        localY: 8 * scale,
        angle: 0,
        labelRu: `Боковое место №${compNum * 2} (боковушка)`
      });
      seats.push({
        id: `train_side_${compNum}_r`,
        localX: compX + compW - 8 * scale,
        localY: 8 * scale,
        angle: Math.PI,
        labelRu: `Боковое место №${compNum * 2 + 1} (боковушка)`
      });
    }
  }

  // Conductor compartment chair
  seats.push({
    id: 'conductor_chair',
    localX: saloonEndX + 14 * scale,
    localY: -6 * scale,
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

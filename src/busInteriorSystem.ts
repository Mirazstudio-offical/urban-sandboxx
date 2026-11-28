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

export interface CityBusInteriorLayout {
  halfL: number;
  halfW: number;
  wallInY: number;
  frontWallX: number;
  rearWallX: number;
  rearBenchFrontX: number;
  rearBenchSeatX: number;
  doorFrontX: number;
  doorMidX: number;
  doorRearX: number;
  frontAxleX: number;
  rearAxleX: number;
  cabPartitionX: number;
  cabSideY: number;
  driverSeatX: number;
  driverSeatY: number;
  steerX: number;
  steerY: number;
  leftWinY: number;
  leftAisleY: number;
  rightSingleY: number;
  leftRowXs: number[];
  rightRowXs: number[];
  foldingSeatXs: number[];
  foldingSeatY: number;
  rearSeatYs: number[];
  wheelchairBayX1: number;
  wheelchairBayX2: number;
  wheelchairBayY1: number;
  wheelchairBayY2: number;
}

export interface MinibusInteriorLayout {
  halfL: number;
  halfW: number;
  wallInY: number;
  frontWallX: number;
  rearWallX: number;
  cabPartitionX: number;
  cabPartitionEndY: number;
  driverSeatX: number;
  driverSeatY: number;
  frontPassSeatX: number;
  frontPassSeatY: number;
  steerX: number;
  steerY: number;
  doorSlideX: number;
  frontAxleX: number;
  rearAxleX: number;
  leftSeatY: number;
  rightSeatY: number;
  leftSeatXs: number[];
  rightSeatXs: number[];
  rearBenchX: number;
  rearSeatYs: number[];
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
  rearSeatYs: number[];
}

export function getCityBusInteriorLayout(veh?: { length?: number; width?: number } | null): CityBusInteriorLayout {
  const cfg = CAR_CONFIGS['bus'];
  const halfL = (veh?.length || cfg?.length || 122) * 0.5;
  const halfW = (veh?.width || cfg?.width || 29) * 0.5;
  const wallInY = halfW - 1.25;
  const frontWallX = halfL - 3.6;
  const rearWallX = -halfL + 4.4;
  const rearBenchFrontX = -halfL + 11.4;
  const rearBenchSeatX = -halfL + 8.0;

  const doorFrontX = halfL * 0.76;
  const doorMidX = halfL * 0.075;
  const doorRearX = -halfL * 0.71;
  const frontAxleX = halfL * 0.54;
  const rearAxleX = -halfL * 0.48;

  const cabPartitionX = halfL * 0.635;
  const cabSideY = -1.6;
  const driverSeatX = halfL * 0.745;
  const driverSeatY = -wallInY * 0.59;
  const steerX = halfL * 0.845;
  const steerY = driverSeatY;

  const leftWinY = -wallInY + 2.95;
  const leftAisleY = -wallInY + 8.15;
  const rightSingleY = wallInY - 3.05;

  const leftRowXs = [
    halfL * 0.525, // Over front wheelhouse
    halfL * 0.335, // Ahead of wheelchair bay
    -halfL * 0.19, // Behind wheelchair bay
    -halfL * 0.38, // Ahead of rear wheelhouse
    -halfL * 0.565, // Over rear wheelhouse
  ];
  const rightRowXs = [
    halfL * 0.335, // Ahead of middle door
    -halfL * 0.19, // Behind middle door
    -halfL * 0.375, // Mid-rear single
    -halfL * 0.555, // Ahead of rear door modesty screen
  ];

  const wheelchairBayX1 = -halfL * 0.04;
  const wheelchairBayX2 = halfL * 0.22;
  const wheelchairBayY1 = -wallInY + 0.3;
  const wheelchairBayY2 = -3.4;

  const foldingSeatXs = [halfL * 0.145, halfL * 0.02];
  const foldingSeatY = -wallInY + 2.45;

  const rearSeatYs = [-wallInY * 0.75, -wallInY * 0.265, wallInY * 0.265, wallInY * 0.75];

  return {
    halfL,
    halfW,
    wallInY,
    frontWallX,
    rearWallX,
    rearBenchFrontX,
    rearBenchSeatX,
    doorFrontX,
    doorMidX,
    doorRearX,
    frontAxleX,
    rearAxleX,
    cabPartitionX,
    cabSideY,
    driverSeatX,
    driverSeatY,
    steerX,
    steerY,
    leftWinY,
    leftAisleY,
    rightSingleY,
    leftRowXs,
    rightRowXs,
    foldingSeatXs,
    foldingSeatY,
    rearSeatYs,
    wheelchairBayX1,
    wheelchairBayX2,
    wheelchairBayY1,
    wheelchairBayY2,
  };
}

export function getMinibusInteriorLayout(veh?: { length?: number; width?: number } | null): MinibusInteriorLayout {
  const cfg = CAR_CONFIGS['bus_minibus'];
  const halfL = (veh?.length || cfg?.length || 76) * 0.5;
  const halfW = (veh?.width || cfg?.width || 24) * 0.5;
  const wallInY = halfW - 1.05;
  const frontWallX = halfL * 0.66 - 1.2;
  const rearWallX = -halfL + 2.4;

  const cabPartitionX = halfL * 0.27;
  const cabPartitionEndY = -1.6;
  const driverSeatX = halfL * 0.405;
  const driverSeatY = -wallInY * 0.55;
  const frontPassSeatX = driverSeatX;
  const frontPassSeatY = wallInY * 0.55;
  const steerX = halfL * 0.525;
  const steerY = driverSeatY;

  const doorSlideX = halfL * 0.20;
  const frontAxleX = halfL * 0.58;
  const rearAxleX = -halfL * 0.50;

  const leftSeatY = -wallInY + 3.35;
  const rightSeatY = wallInY - 3.35;
  const rearBenchX = rearWallX + 3.2;

  const leftSeatXs: number[] = [];
  for (let x = cabPartitionX - 5.6; x >= rearBenchX + 5.8; x -= 10.3) {
    leftSeatXs.push(Number(x.toFixed(2)));
  }

  const rightSeatXs: number[] = [];
  for (let x = doorSlideX - 11.4; x >= rearBenchX + 5.8; x -= 10.3) {
    rightSeatXs.push(Number(x.toFixed(2)));
  }

  const rearSeatYs = [-wallInY * 0.66, 0, wallInY * 0.66];

  return {
    halfL,
    halfW,
    wallInY,
    frontWallX,
    rearWallX,
    cabPartitionX,
    cabPartitionEndY,
    driverSeatX,
    driverSeatY,
    frontPassSeatX,
    frontPassSeatY,
    steerX,
    steerY,
    doorSlideX,
    frontAxleX,
    rearAxleX,
    leftSeatY,
    rightSeatY,
    leftSeatXs,
    rightSeatXs,
    rearBenchX,
    rearSeatYs,
  };
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
  const cockpitSeatX = cabFrontX - 7.1;
  const partitionX = cabFrontX - 10.8;

  const salRearX = -halfL + 3.2;
  const salFrontX = isIntegral ? cabFrontX - 11.4 : cabRearX - 2.0;
  const doorSlideX = isIntegral ? salFrontX - 4.4 : salFrontX - 4.8;
  const salMidX = (salRearX + salFrontX) * 0.5;

  // Passenger ЦМФ seating rows proportioned to player torso/legs (~9.6 px row pitch, 3 rear seats)
  const rearBenchX = salRearX + 3.2;
  const leftStart = salFrontX - 4.0;
  const leftEnd = rearBenchX + 7.0;
  const passengerLeftXs: number[] = [];
  for (let x = leftStart; x >= leftEnd - 0.5; x -= 9.6) {
    passengerLeftXs.push(Number(x.toFixed(2)));
  }

  const rightStart = doorSlideX - 7.0;
  const passengerRightXs: number[] = [];
  for (let x = rightStart; x >= leftEnd - 0.5; x -= 9.6) {
    passengerRightXs.push(Number(x.toFixed(2)));
  }
  const rearSeatYs = [-6.2, 0, 6.2];

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
    rearSeatYs,
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
          localY: -5.3,
          angle: 0,
          isDriver: true,
          labelRu: 'Водительское кресло ГАЗели',
        });
        seats.push({
          id: 'front_pass',
          localX: gz.cockpitSeatX,
          localY: 5.3,
          angle: 0,
          labelRu: 'Переднее место кабины',
        });
      }

      if (gz.kind === 'passenger') {
        gz.passengerLeftXs.forEach((sx, idx) => {
          seats.push({
            id: `gz_seat_l${idx + 1}`,
            localX: sx,
            localY: -6.5,
            angle: 0,
            labelRu: `Пассажирское сиденье (левый ряд, место ${idx + 1})`,
          });
        });
        gz.passengerRightXs.forEach((sx, idx) => {
          seats.push({
            id: `gz_seat_r${idx + 1}`,
            localX: sx,
            localY: 6.5,
            angle: 0,
            labelRu: `Пассажирское сиденье (правый ряд, место ${idx + 1})`,
          });
        });
        gz.rearSeatYs.forEach((ry, idx) => {
          seats.push({
            id: `gz_rear_${idx + 1}`,
            localX: gz.rearBenchX,
            localY: ry,
            angle: 0,
            labelRu: idx === 0 || idx === 2 ? 'Задний ряд салона (у окна)' : 'Задний ряд салона (центр)',
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
    const mb = getMinibusInteriorLayout(veh);
    const seats: BusSeat[] = [
      { id: 'driver', localX: mb.driverSeatX, localY: mb.driverSeatY, angle: 0, isDriver: true, labelRu: 'Водительское кресло микроавтобуса' },
      { id: 'front_pass', localX: mb.frontPassSeatX, localY: mb.frontPassSeatY, angle: 0, labelRu: 'Переднее пассажирское место' },
    ];
    mb.leftSeatXs.forEach((sx, idx) => {
      seats.push({
        id: `seat_l${idx + 1}`,
        localX: sx,
        localY: mb.leftSeatY,
        angle: 0,
        labelRu: `Пассажирское сиденье (левый ряд, место ${idx + 1})`,
      });
    });
    mb.rightSeatXs.forEach((sx, idx) => {
      seats.push({
        id: `seat_r${idx + 1}`,
        localX: sx,
        localY: mb.rightSeatY,
        angle: 0,
        labelRu: `Пассажирское сиденье (правый ряд, место ${idx + 1})`,
      });
    });
    mb.rearSeatYs.forEach((ry, idx) => {
      seats.push({
        id: `rear_${idx + 1}`,
        localX: mb.rearBenchX,
        localY: ry,
        angle: 0,
        labelRu: idx === 0 ? 'Задний ряд сидений (левое окно)' : idx === 2 ? 'Задний ряд сидений (правое окно)' : 'Задний ряд сидений (центр)',
      });
    });
    return seats;
  }

  // Standard 12m City Bus (Metro Linemaster CityBus)
  const cb = getCityBusInteriorLayout(veh);
  const seats: BusSeat[] = [
    { id: 'driver', localX: cb.driverSeatX, localY: cb.driverSeatY, angle: 0, isDriver: true, labelRu: 'Кресло водителя автобуса' },
  ];

  cb.leftRowXs.forEach((sx, idx) => {
    seats.push({
      id: `seat_l${idx + 1}_w`,
      localX: sx,
      localY: cb.leftWinY,
      angle: 0,
      labelRu: `Сиденье у левого окна (ряд ${idx + 1})`,
    });
    seats.push({
      id: `seat_l${idx + 1}_a`,
      localX: sx,
      localY: cb.leftAisleY,
      angle: 0,
      labelRu: `Сиденье у прохода (левый ряд ${idx + 1})`,
    });
  });

  cb.foldingSeatXs.forEach((sx, idx) => {
    seats.push({
      id: `seat_fold_${idx + 1}`,
      localX: sx,
      localY: cb.foldingSeatY,
      angle: Math.PI / 2,
      labelRu: `Откидное сиденье (накопительная площадка ${idx + 1})`,
    });
  });

  cb.rightRowXs.forEach((sx, idx) => {
    seats.push({
      id: `seat_r${idx + 1}`,
      localX: sx,
      localY: cb.rightSingleY,
      angle: 0,
      labelRu: `Одиночное сиденье (правый ряд ${idx + 1})`,
    });
  });

  cb.rearSeatYs.forEach((ry, idx) => {
    seats.push({
      id: `rear_${idx + 1}`,
      localX: cb.rearBenchSeatX,
      localY: ry,
      angle: 0,
      labelRu: idx === 0 ? 'Задний подиум (левое окно)' : idx === 3 ? 'Задний подиум (правое окно)' : 'Задний подиум автобуса',
    });
  });

  return seats;
}

/**
 * Returns passenger boarding doors for a bus or walkable GAZelle archetype
 */
export function getBusDoors(busTypeOrVehicle: string | Vehicle, length: number = 122, width: number = 29): BusDoor[] {
  const veh = typeof busTypeOrVehicle === 'object' ? busTypeOrVehicle : null;
  const busType = typeof busTypeOrVehicle === 'string' ? busTypeOrVehicle : busTypeOrVehicle.type;
  const cfg = CAR_CONFIGS[busType];
  const halfL = (veh?.length || cfg?.length || length) / 2;
  const halfW = (veh?.width || cfg?.width || width) / 2;

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
    const mb = getMinibusInteriorLayout(veh ?? { length: halfL * 2, width: halfW * 2 });
    return [
      {
        id: 'door_slide',
        nameRu: 'Сдвижная дверь салона',
        localX: mb.doorSlideX,
        localY: halfW,
        vestibuleLocalX: mb.doorSlideX,
        vestibuleLocalY: Math.max(2.5, halfW - 6.4),
        exitLocalX: mb.doorSlideX,
        exitLocalY: halfW + 7.2,
        width: 8,
      },
    ];
  }

  // City bus has 3 double-leaf boarding doors (front, middle wheelchair bay, rear)
  const cb = getCityBusInteriorLayout(veh ?? { length: halfL * 2, width: halfW * 2 });
  return [
    {
      id: 'door_front',
      nameRu: 'Передняя дверь (у кабины)',
      localX: cb.doorFrontX,
      localY: halfW,
      vestibuleLocalX: cb.doorFrontX,
      vestibuleLocalY: Math.max(3.0, halfW - 7.8),
      exitLocalX: cb.doorFrontX,
      exitLocalY: halfW + 7.6,
      width: 8.5,
    },
    {
      id: 'door_middle',
      nameRu: 'Средняя дверь (накопительная площадка)',
      localX: cb.doorMidX,
      localY: halfW,
      vestibuleLocalX: cb.doorMidX,
      vestibuleLocalY: Math.max(2.5, halfW - 8.2),
      exitLocalX: cb.doorMidX,
      exitLocalY: halfW + 7.6,
      width: 9.2,
    },
    {
      id: 'door_rear',
      nameRu: 'Задняя дверь (выход)',
      localX: cb.doorRearX,
      localY: halfW,
      vestibuleLocalX: cb.doorRearX,
      vestibuleLocalY: Math.max(2.5, halfW - 8.2),
      exitLocalX: cb.doorRearX,
      exitLocalY: halfW + 7.6,
      width: 8.8,
    },
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
  const playerRadius = gz ? 1.95 : (isMinibus ? 2.25 : 2.55);

  const cb = !gz && !isMinibus ? getCityBusInteriorLayout(bus) : null;
  const mb = !gz && isMinibus ? getMinibusInteriorLayout(bus) : null;

  let px = player.busLocalX ?? (gz ? gz.doorSlideX : (mb ? mb.doorSlideX : cb!.doorFrontX));
  let py = player.busLocalY ?? (gz ? 3.5 : (mb ? 3.2 : 4.5));

  // 1. Boundary of outer bus/GAZelle interior shell
  const minX = gz
    ? (gz.salRearX - 0.4 + playerRadius)
    : mb
    ? (mb.rearWallX + playerRadius)
    : (cb!.rearWallX + playerRadius);
  const maxX = gz
    ? (gz.isIntegral ? (gz.cabFrontX - 3.6 - playerRadius) : (gz.salFrontX - playerRadius))
    : mb
    ? (mb.frontWallX - 1.4 - playerRadius)
    : (cb!.frontWallX - 1.8 - playerRadius);
  const minY = gz
    ? (-halfW + 1.8 + playerRadius)
    : mb
    ? (-mb.wallInY + playerRadius)
    : (-cb!.wallInY + playerRadius);
  const maxY = gz
    ? (halfW - 1.8 - playerRadius)
    : mb
    ? (mb.wallInY - playerRadius)
    : (cb!.wallInY - playerRadius);

  px = Math.max(minX, Math.min(maxX, px));
  py = Math.max(minY, Math.min(maxY, py));

  // 2. Interior Walls & Driver bulkhead
  const walls: { x1: number; y1: number; x2: number; y2: number }[] = [];

  if (gz) {
    if (gz.isIntegral) {
      walls.push({ x1: gz.partitionX, y1: -halfW + 1.5, x2: gz.partitionX, y2: 1.0 });
      walls.push({ x1: gz.cabFrontX - 3.3, y1: -halfW + 1.5, x2: gz.cabFrontX - 3.3, y2: halfW - 1.5 });
    } else {
      walls.push({ x1: gz.salFrontX + 0.5, y1: -halfW + 1.5, x2: gz.salFrontX + 0.5, y2: halfW - 1.5 });
    }
  } else if (mb) {
    // Minibus driver modesty partition behind driver seat with wide walkway on right
    walls.push({ x1: mb.cabPartitionX, y1: -mb.wallInY, x2: mb.cabPartitionX, y2: mb.cabPartitionEndY });
    // Front dashboard bulkhead
    walls.push({ x1: mb.frontWallX - 1.0, y1: -mb.wallInY, x2: mb.frontWallX - 1.0, y2: mb.wallInY });
  } else if (cb) {
    // City bus driver cabin enclosure (rear partition + glazed side screen + hinged entry gate)
    walls.push({ x1: cb.cabPartitionX, y1: -cb.wallInY, x2: cb.cabPartitionX, y2: cb.cabSideY });
    walls.push({ x1: cb.cabPartitionX + 5.5, y1: cb.cabSideY, x2: cb.frontWallX - 2.4, y2: cb.cabSideY });
    // Front curved dashboard barrier
    walls.push({ x1: cb.frontWallX - 1.6, y1: -cb.wallInY, x2: cb.frontWallX - 1.6, y2: cb.wallInY });
    // Rear engine raised compartment bulkhead behind back seats
    walls.push({ x1: cb.rearWallX + 0.8, y1: -cb.wallInY, x2: cb.rearWallX + 0.8, y2: cb.wallInY });
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
    const minDist = playerRadius + 0.65;

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

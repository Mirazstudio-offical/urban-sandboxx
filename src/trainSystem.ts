import { GameWorld, RollingStockCar, RailwaySignal, TrainSchedule, Vehicle, Player, FluidStain } from './types';
import { sound } from './audio';
import { applyVehicleDamageAndDeformation } from './physics';
import { applyDriverVehicleCrashTrauma, distributeImpactDamage } from './bodySystem';

export interface TrainConsist {
  id: string;
  name: string;
  routeType: 'mainline_east' | 'mainline_west' | 'shunting' | 'scheduled';
  trackY: number;
  direction: 1 | -1; // 1 = Eastbound (+X), -1 = Westbound (-X)
  speed: number;     // px/s
  maxSpeed: number;  // px/s (~70-80 km/h is ~200 px/s)
  acceleration: number;
  deceleration: number;
  headCarId: string;
  carIds: string[];
  stationDwellTimer: number; // For station stop simulation
  nextHornDist: number;
  lastWheelClickTime: number;
  schedule?: TrainSchedule;
  currentStepIndex?: number;
  scheduleSpawnTimer?: number;
  emergencyBrake?: boolean;
  emergencyBrakeTimer?: number;
}

export class TrainSystem {
  private static consists: TrainConsist[] = [];
  private static initialized: boolean = false;
  private static crossingBellTimer: number = 0;
  private static gameElapsedTime: number = 0;

  /**
   * Initialize default or scheduled consists linking the rollingStock cars
   */
  public static init(world: GameWorld): void {
    if (!world.rollingStock) {
      world.rollingStock = [];
    }
    this.gameElapsedTime = 0;

    // Check if world has custom trainSchedules
    if (world.trainSchedules && world.trainSchedules.length > 0) {
      this.initFromSchedules(world);
      this.initialized = true;
      return;
    }

    // Ensure all predefined rolling stock exist in world.rollingStock
    this.ensureDefaultRollingStock(world);

    // Setup the active Train Consists
    this.consists = [
      // 1. Пассажирский экспресс №12 «Степной» (ТЭП70БС + 4 вагона ТВЗ РЖД) - Путь I (Y=8740), на ВОСТОК (+X)
      {
        id: 'train_pass_express',
        name: 'Пассажирский поезд №12 «Степной Экспресс»',
        routeType: 'mainline_east',
        trackY: 8740,
        direction: 1,
        speed: 120,
        maxSpeed: 210,
        acceleration: 18,
        deceleration: 35,
        headCarId: 'train_loco_1',
        carIds: ['train_loco_1', 'train_coach_1', 'train_coach_2', 'train_coach_3', 'train_coach_4'],
        stationDwellTimer: 0,
        nextHornDist: 12100,
        lastWheelClickTime: 0
      },

      // 2. Тяжелый магистральный грузовой поезд №2418 (2x ВЛ80С + 14 вагонов) - Путь II (Y=8880), на ЗАПАД (-X)
      {
        id: 'train_freight_heavy',
        name: 'Тяжелый грузовой поезд №2418 (ВЛ80С)',
        routeType: 'mainline_west',
        trackY: 8880,
        direction: -1,
        speed: 110,
        maxSpeed: 175,
        acceleration: 10,
        deceleration: 22,
        headCarId: 'train_vl80_head_a',
        carIds: [
          'train_vl80_head_a',
          'train_vl80_head_b',
          'train_tanker_1',
          'train_tanker_2',
          'train_tanker_3',
          'train_tanker_4',
          'train_hopper_coal_1',
          'train_hopper_coal_2',
          'train_hopper_gravel_1',
          'train_hopper_gravel_2',
          'train_hopper_grain_1',
          'train_hopper_grain_2',
          'train_timber_1',
          'train_timber_2',
          'train_flatcar_steel',
          'train_timber_3'
        ],
        stationDwellTimer: 0,
        nextHornDist: 13600,
        lastWheelClickTime: 0
      }
    ];

    this.initialized = true;
  }

  /**
   * Instantiate rolling stock and consists dynamically from TrainSchedules
   */
  private static initFromSchedules(world: GameWorld): void {
    if (!world.rollingStock) world.rollingStock = [];
    this.consists = [];

    world.trainSchedules?.forEach((sched, sIdx) => {
      if (sched.enabled === false) return;

      const headId = `sched_${sched.id}_loco`;
      const carIds: string[] = [headId];

      // Find or create lead locomotive
      let headCar = world.rollingStock?.find(c => c.id === headId);
      if (!headCar) {
        headCar = {
          id: headId,
          name: sched.locomotive.name || sched.name,
          type: sched.locomotive.type,
          x: sched.spawnX,
          y: sched.spawnY,
          length: 270,
          width: 62,
          angle: sched.spawnDirection === 1 ? 0 : Math.PI,
          livery: sched.locomotive.livery || 'rzd_classic',
          roadNumber: sched.locomotive.roadNumber || 'ТЭП70БС',
          hasHeadlight: true,
          headlightColor: sched.locomotive.headlightColor || '#fffbeb',
          speed: sched.spawnSpeed,
          direction: sched.spawnDirection
        };
        world.rollingStock?.push(headCar);
      }

      let currentX = sched.spawnX;
      sched.cars?.forEach((carDef, cIdx) => {
        const carId = `sched_${sched.id}_car_${cIdx}`;
        carIds.push(carId);

        let car = world.rollingStock?.find(c => c.id === carId);
        const carLen = carDef.type.includes('hopper') ? 190 : carDef.type.includes('tanker') ? 180 : 260;
        const carW = 60;
        const offset = (270 / 2 + carLen / 2 + 10) * (cIdx + 1);
        const carX = sched.spawnDirection === 1 ? currentX - offset : currentX + offset;

        if (!car) {
          car = {
            id: carId,
            name: carDef.name || `Вагон ${cIdx + 1}`,
            type: carDef.type,
            x: carX,
            y: sched.spawnY,
            length: carLen,
            width: carW,
            angle: sched.spawnDirection === 1 ? 0 : Math.PI,
            livery: carDef.livery || 'rzd_classic',
            roadNumber: carDef.roadNumber || `РЖД-0${cIdx + 1}`,
            speed: sched.spawnSpeed,
            direction: sched.spawnDirection,
            cargoType: carDef.cargoType
          };
          world.rollingStock?.push(car);
        }
      });

      this.consists.push({
        id: sched.id,
        name: sched.name,
        routeType: 'scheduled',
        trackY: sched.spawnY,
        direction: sched.spawnDirection,
        speed: sched.spawnSpeed,
        maxSpeed: sched.maxSpeed || 200,
        acceleration: sched.acceleration || 15,
        deceleration: sched.deceleration || 30,
        headCarId: headId,
        carIds: carIds,
        stationDwellTimer: 0,
        nextHornDist: 12000,
        lastWheelClickTime: 0,
        schedule: sched,
        currentStepIndex: 0,
        scheduleSpawnTimer: sched.spawnTime
      });
    });
  }

  /**
   * Ensure default cars exist in world.rollingStock
   */
  private static ensureDefaultRollingStock(world: GameWorld): void {
    const existingMap = new Map<string, RollingStockCar>();
    for (const c of world.rollingStock || []) {
      existingMap.set(c.id, c);
    }

    const defaultCars: RollingStockCar[] = [
      // --- 1. ПАССАЖИРСКИЙ СОСТАВ №12 «СТЕПНОЙ» (ТЭП70БС + 4 ВАГОНА ТВЗ) ---
      {
        id: 'train_loco_1',
        name: 'Магистральный тепловоз ТЭП70БС-0245',
        type: 'locomotive_diesel',
        x: 10800,
        y: 8740,
        length: 270,
        width: 62,
        angle: 0,
        livery: 'rzd_classic',
        roadNumber: 'ТЭП70БС-0245',
        hasHeadlight: true,
        headlightColor: '#fffbeb',
        speed: 120,
        direction: 1
      },
      {
        id: 'train_coach_1',
        name: 'Фирменный купейный вагон РЖД 61-4440 №01',
        type: 'passenger_coach_rzhd',
        x: 10525,
        y: 8740,
        length: 260,
        width: 60,
        angle: 0,
        livery: 'rzd_classic',
        roadNumber: '018 24519'
      },
      {
        id: 'train_coach_2',
        name: 'Фирменный плацкартный вагон РЖД 61-4447 №02',
        type: 'passenger_coach_rzhd',
        x: 10255,
        y: 8740,
        length: 260,
        width: 60,
        angle: 0,
        livery: 'rzd_classic',
        roadNumber: '018 24527'
      },
      {
        id: 'train_coach_3',
        name: 'Фирменный купейный вагон РЖД 61-4440 №03',
        type: 'passenger_coach_rzhd',
        x: 9985,
        y: 8740,
        length: 260,
        width: 60,
        angle: 0,
        livery: 'rzd_classic',
        roadNumber: '018 24535'
      },
      {
        id: 'train_coach_4',
        name: 'Штабной вагон с купе начальника поезда №04',
        type: 'passenger_coach_rzhd',
        x: 9715,
        y: 8740,
        length: 260,
        width: 60,
        angle: 0,
        livery: 'rzd_classic',
        roadNumber: '018 24501'
      },

      // --- 2. ТЯЖЕЛЫЙ МАГИСТРАЛЬНЫЙ ГРУЗОВОЙ ПОЕЗД №2418 (2x ВЛ80С + 14 ВАГОНОВ) ---
      // Двухсекционный магистральный электровоз ВЛ80С
      {
        id: 'train_vl80_head_a',
        name: 'Магистральный электровоз ВЛ80С-1429 (Секция А)',
        type: 'locomotive_electric_vl80',
        x: 26000,
        y: 8880,
        length: 280,
        width: 62,
        angle: Math.PI,
        livery: 'rzd_classic',
        roadNumber: 'ВЛ80С-1429А',
        hasHeadlight: true,
        headlightColor: '#fffbeb',
        speed: 110,
        direction: -1
      },
      {
        id: 'train_vl80_head_b',
        name: 'Магистральный электровоз ВЛ80С-1429 (Секция Б)',
        type: 'locomotive_electric_vl80',
        x: 26290,
        y: 8880,
        length: 280,
        width: 62,
        angle: Math.PI,
        livery: 'rzd_classic',
        roadNumber: 'ВЛ80С-1429Б',
        hasHeadlight: false,
        speed: 110,
        direction: -1
      },

      // Блок 1: Нефтеналивной маршрут (Цистерны 15-1443)
      {
        id: 'train_tanker_1',
        name: 'Нефтяная 4-осная цистерна 15-1443',
        type: 'freight_tanker',
        x: 26550,
        y: 8880,
        length: 220,
        width: 60,
        angle: Math.PI,
        livery: 'freight_rust_brown',
        roadNumber: '5719 3302',
        cargoType: 'crude_oil'
      },
      {
        id: 'train_tanker_2',
        name: 'Нефтяная 4-осная цистерна 15-1443',
        type: 'freight_tanker',
        x: 26780,
        y: 8880,
        length: 220,
        width: 60,
        angle: Math.PI,
        livery: 'freight_rust_brown',
        roadNumber: '5719 3344',
        cargoType: 'crude_oil'
      },
      {
        id: 'train_tanker_3',
        name: 'Нефтяная 4-осная цистерна 15-1443 (Дизельное топливо)',
        type: 'freight_tanker',
        x: 27010,
        y: 8880,
        length: 220,
        width: 60,
        angle: Math.PI,
        livery: 'freight_black',
        roadNumber: '5719 4118',
        cargoType: 'fuel'
      },
      {
        id: 'train_tanker_4',
        name: 'Нефтяная 4-осная цистерна 15-1443 (Бензин)',
        type: 'freight_tanker',
        x: 27240,
        y: 8880,
        length: 220,
        width: 60,
        angle: Math.PI,
        livery: 'freight_black',
        roadNumber: '5719 4250',
        cargoType: 'gasoline'
      },

      // Блок 2: Полувагоны с углем и гранитным щебнем (12-132)
      {
        id: 'train_hopper_coal_1',
        name: 'Полувагон 12-132 с каменным углем (Кузбасс)',
        type: 'freight_hopper',
        x: 27460,
        y: 8880,
        length: 200,
        width: 60,
        angle: Math.PI,
        livery: 'freight_rust_brown',
        roadNumber: '5482 1141',
        cargoType: 'coal'
      },
      {
        id: 'train_hopper_coal_2',
        name: 'Полувагон 12-132 с каменным углем (Кузбасс)',
        type: 'freight_hopper',
        x: 27670,
        y: 8880,
        length: 200,
        width: 60,
        angle: Math.PI,
        livery: 'freight_rust_brown',
        roadNumber: '5482 1198',
        cargoType: 'coal'
      },
      {
        id: 'train_hopper_gravel_1',
        name: 'Полувагон 12-132 со щебнем гранитным',
        type: 'freight_hopper',
        x: 27880,
        y: 8880,
        length: 200,
        width: 60,
        angle: Math.PI,
        livery: 'freight_rust_brown',
        roadNumber: '5420 8911',
        cargoType: 'gravel'
      },
      {
        id: 'train_hopper_gravel_2',
        name: 'Полувагон 12-132 со щебнем гранитным',
        type: 'freight_hopper',
        x: 28090,
        y: 8880,
        length: 200,
        width: 60,
        angle: Math.PI,
        livery: 'freight_rust_brown',
        roadNumber: '5420 8952',
        cargoType: 'gravel'
      },

      // Блок 3: Хопперы-зерновозы (19-752)
      {
        id: 'train_hopper_grain_1',
        name: 'Хоппер-зерновоз 19-752 (Пшеница целинная)',
        type: 'freight_hopper',
        x: 28305,
        y: 8880,
        length: 210,
        width: 60,
        angle: Math.PI,
        livery: 'freight_blue',
        roadNumber: '5932 7701',
        cargoType: 'grain'
      },
      {
        id: 'train_hopper_grain_2',
        name: 'Хоппер-зерновоз 19-752 (Пшеница целинная)',
        type: 'freight_hopper',
        x: 28525,
        y: 8880,
        length: 210,
        width: 60,
        angle: Math.PI,
        livery: 'freight_blue',
        roadNumber: '5932 7748',
        cargoType: 'grain'
      },

      // Блок 4: Платформы с лесоматериалами и стальным прокатом (13-4012)
      {
        id: 'train_timber_1',
        name: 'Лесовозная платформа 13-4012 (Хвойный пиловочник)',
        type: 'freight_flatcar_timber',
        x: 28750,
        y: 8880,
        length: 220,
        width: 60,
        angle: Math.PI,
        livery: 'freight_timber',
        roadNumber: '4291 9901',
        cargoType: 'timber'
      },
      {
        id: 'train_timber_2',
        name: 'Лесовозная платформа 13-4012 (Хвойный пиловочник)',
        type: 'freight_flatcar_timber',
        x: 28980,
        y: 8880,
        length: 220,
        width: 60,
        angle: Math.PI,
        livery: 'freight_timber',
        roadNumber: '4291 9945',
        cargoType: 'timber'
      },
      {
        id: 'train_flatcar_steel',
        name: 'Универсальная платформа 13-4012 (Стальной прокат и трубы)',
        type: 'freight_flatcar_timber',
        x: 29210,
        y: 8880,
        length: 220,
        width: 60,
        angle: Math.PI,
        livery: 'freight_rust_brown',
        roadNumber: '4291 8012',
        cargoType: 'steel'
      },
      {
        id: 'train_timber_3',
        name: 'Лесовозная платформа 13-4012 (Кругляк березовый)',
        type: 'freight_flatcar_timber',
        x: 29440,
        y: 8880,
        length: 220,
        width: 60,
        angle: Math.PI,
        livery: 'freight_timber',
        roadNumber: '4291 0038',
        cargoType: 'timber'
      }
    ];

    // Purge obsolete shunter / legacy rolling stock IDs
    const validIds = new Set(defaultCars.map(c => c.id));
    world.rollingStock = (world.rollingStock || []).filter(c => validIds.has(c.id) || (c.id && c.id.startsWith('sched_')));

    for (const c of defaultCars) {
      if (!existingMap.has(c.id)) {
        world.rollingStock.push(c);
        existingMap.set(c.id, c);
      }
    }
  }

  /**
   * Evaluates exact track elevation and derivative slope (dy/dx) along turnout curves and mainlines
   */
  public static getTrackState(carX: number, routeType: string, defaultY: number = 8740): { y: number; slope: number } {
    if (routeType === 'mainline_east') {
      // Eastbound Express: Mainline I (8740) -> Switch #1 (9100->9600) -> Track 3 Platform (8600) -> Switch #3 (12900->13400) -> Mainline I (8740)
      if (carX < 9100) return { y: 8740, slope: 0 };
      if (carX <= 9600) {
        const u = (carX - 9100) / 500;
        const s = u * u * (3 - 2 * u);
        const ds = 6 * u * (1 - u);
        return { y: 8740 - 140 * s, slope: (-140 / 500) * ds };
      }
      if (carX <= 12900) return { y: 8600, slope: 0 };
      if (carX <= 13400) {
        const u = (carX - 12900) / 500;
        const s = u * u * (3 - 2 * u);
        const ds = 6 * u * (1 - u);
        return { y: 8600 + 140 * s, slope: (140 / 500) * ds };
      }
      return { y: 8740, slope: 0 };
    }

    if (routeType === 'mainline_west') {
      // Westbound Heavy Freight travels directly along Mainline II (Y=8880) straight through the entire map
      return { y: 8880, slope: 0 };
    }

    return { y: defaultY, slope: 0 };
  }

  /**
   * Dynamically calculates exact track Y position for any car
   */
  public static getCarTrackY(carX: number, routeType: string): number {
    return this.getTrackState(carX, routeType).y;
  }

  /**
   * Positions a railway vehicle on track rails using two-bogie (двухтележечная) kinematics.
   * Both front and rear bogies follow the track centerline, eliminating unnatural crab-walking or flips.
   */
  public static updateCarBogieKinematics(
    car: RollingStockCar,
    routeType: string,
    travelDirection: 1 | -1,
    defaultY: number = 8740
  ): void {
    const bogieHalfBase = car.length * 0.32;
    const centerState = this.getTrackState(car.x, routeType, defaultY);
    const cosSlope = 1 / Math.sqrt(1 + centerState.slope * centerState.slope);
    const dxBogie = bogieHalfBase * cosSlope;

    const xEast = car.x + dxBogie;
    const xWest = car.x - dxBogie;
    const yEast = this.getTrackState(xEast, routeType, defaultY).y;
    const yWest = this.getTrackState(xWest, routeType, defaultY).y;

    car.y = (yEast + yWest) / 2;

    const dx = xEast - xWest;
    const dy = yEast - yWest;

    if (travelDirection === -1 || routeType === 'mainline_west') {
      // Facing West (-X)
      car.angle = Math.atan2(-dy, -dx);
    } else {
      // Facing East (+X)
      car.angle = Math.atan2(dy, dx);
    }
  }

  /**
   * Main simulation tick for all trains
   */
  public static update(world: GameWorld, dt: number, playerX: number, playerY: number, playerObj?: Player): void {
    if (!this.initialized) {
      this.init(world);
    }

    const cars = world.rollingStock || [];
    const carMap = new Map<string, RollingStockCar>();
    for (const c of cars) {
      carMap.set(c.id, c);
    }

    const signals = world.railwaySignals || [];

    for (const consist of this.consists) {
      const headCar = carMap.get(consist.headCarId);
      if (!headCar) continue;

      // 1. Target Speed and Route Control Logic
      let targetSpeed = consist.maxSpeed;
      let brakeEmergency = false;

      // Handle Emergency Braking from collision or track hazard
      if (consist.emergencyBrake && (consist.emergencyBrakeTimer || 0) > 0) {
        consist.emergencyBrakeTimer = (consist.emergencyBrakeTimer || 0) - dt;
        targetSpeed = 0;
        brakeEmergency = true;
        if (consist.emergencyBrakeTimer <= 0 && consist.speed <= 3) {
          consist.emergencyBrake = false;
        }
      } else if (consist.routeType === 'mainline_east') {
        // --- 1. PASSENGER EXPRESS №12 («Степной Экспресс») ---
        // Route: Enters West on Main I -> Swerves via Switch #1 to Track 3 Platform -> Dwells -> Departs via Switch #3
        const platformStopX = 10800;

        if (headCar.x < platformStopX && consist.stationDwellTimer >= 0) {
          const distToStop = platformStopX - headCar.x;
          if (distToStop < 40) {
            targetSpeed = 0;
            if (consist.stationDwellTimer === 0 && consist.speed < 10) {
              consist.stationDwellTimer = 22; // Boarding time at Platform 1
              sound.playTrainBrakeAir(this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY));
            }
          } else if (distToStop < 400) {
            targetSpeed = Math.min(targetSpeed, 30); // Decelerating for platform arrival
          } else if (distToStop < 900) {
            targetSpeed = Math.min(targetSpeed, 60); // Speed limit on turnout Switch #1
          }
        }

        if (consist.stationDwellTimer > 0) {
          targetSpeed = 0;
          consist.stationDwellTimer -= dt;
          if (consist.stationDwellTimer <= 0) {
            consist.stationDwellTimer = -1; // Departed platform!
            sound.playTrainHorn(2.0, this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY));
          }
        } else if (consist.stationDwellTimer < 0 || headCar.x >= platformStopX) {
          // Check block signals down open line
          const signalSpeed = this.evaluateSignalsInFrontEastbound(headCar.x, signals, consist.maxSpeed);
          targetSpeed = Math.min(targetSpeed, signalSpeed);
        }

      } else if (consist.routeType === 'mainline_west') {
        // --- 2. HEAVY FREIGHT TRAIN №2418 (ВЛ80С) ---
        // Route: Runs straight through on Mainline II (Y=8880) heading West (-X)
        // Dynamically obeys 3-aspect automatic block signals across the open steppe and station
        const signalSpeed = this.evaluateSignalsInFrontWestbound(headCar.x, signals, consist.maxSpeed);
        targetSpeed = Math.min(targetSpeed, signalSpeed);
      }

      // 2. Physics & Speed Ramp (Multi-kiloton Train Inertia & Pneumatic Brake Dynamics)
      if (consist.speed < targetSpeed) {
        consist.speed = Math.min(targetSpeed, consist.speed + consist.acceleration * dt);
        headCar.throttle = 1.0;
        headCar.brakeState = 'released';
      } else if (consist.speed > targetSpeed) {
        // Realistic pneumatic brake shoe friction: gradual deceleration curve without unnatural instant stops
        const decelRate = brakeEmergency ? consist.deceleration * 0.95 : consist.deceleration;
        const prevSpd = consist.speed;
        consist.speed = Math.max(targetSpeed, consist.speed - decelRate * dt);
        headCar.throttle = 0.0;
        headCar.brakeState = brakeEmergency ? 'emergency' : 'service';

        if (brakeEmergency && Math.random() < 0.08 && consist.speed > 15) {
          sound.playTrainBrakeAir(this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY));
        } else if (prevSpd > 60 && consist.speed <= 60) {
          sound.playTrainBrakeAir(this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY));
        }
      } else {
        headCar.throttle = 0.3;
        headCar.brakeState = 'released';
      }

      // 3. Move Lead Locomotive & Calculate Trajectory along Track
      const centerState = this.getTrackState(headCar.x, consist.routeType, consist.trackY);
      const cosSlope = 1 / Math.sqrt(1 + centerState.slope * centerState.slope);
      const moveDelta = consist.speed * consist.direction * dt * cosSlope;
      headCar.x += moveDelta;
      headCar.speed = consist.speed;
      headCar.direction = consist.direction;

      // Continuous traffic loops across the full width of the world (-1500 to 53000)
      if (consist.routeType === 'mainline_east' && headCar.x > 53000) {
        headCar.x = -1500;
        consist.stationDwellTimer = 0;
      } else if (consist.routeType === 'mainline_west' && headCar.x < -1500) {
        headCar.x = 53000;
        consist.stationDwellTimer = 0;
      }

      this.updateCarBogieKinematics(headCar, consist.routeType, consist.direction, consist.trackY);

      // 4. Per-car Coupler Kinematics with Physical Arc-Length Compensation
      const relDir = (consist.routeType === 'mainline_west') ? 1 : -1;
      let prevCar = headCar;
      for (let i = 1; i < consist.carIds.length; i++) {
        const car = carMap.get(consist.carIds[i]);
        if (!car) continue;

        const couplerDistance = prevCar.length / 2 + car.length / 2 + 10;
        const prevSlope = this.getTrackState(prevCar.x, consist.routeType, consist.trackY).slope;
        const approxStep = couplerDistance / Math.sqrt(1 + prevSlope * prevSlope);
        const midSlope = this.getTrackState(prevCar.x + relDir * approxStep * 0.5, consist.routeType, consist.trackY).slope;
        const dxStep = couplerDistance / Math.sqrt(1 + midSlope * midSlope);

        car.x = prevCar.x + relDir * dxStep;
        car.speed = consist.speed;
        car.direction = consist.direction;

        this.updateCarBogieKinematics(car, consist.routeType, consist.direction, consist.trackY);
        prevCar = car;
      }

      // 6. Sound Effects: Wheel clicks & Horns
      if (consist.speed > 15) {
        consist.lastWheelClickTime += dt;
        const wheelClickInterval = Math.max(0.4, 25 / Math.max(20, consist.speed));
        if (consist.lastWheelClickTime >= wheelClickInterval) {
          consist.lastWheelClickTime = 0;
          const distGain = this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY);
          if (distGain > 0.05) {
            sound.playTrainWheelClick(distGain);
          }
        }
      }

      // Typhon Horn on Crossing and Approach
      if (consist.routeType === 'mainline_east') {
        // Approaching crossing at X=12600
        if (headCar.x >= 11800 && headCar.x <= 12000 && (headCar.hornTimer || 0) <= 0) {
          headCar.hornTimer = 18; // Cooldown
          const distGain = this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY);
          sound.playTrainHorn(1.8, distGain);
        }
      } else if (consist.routeType === 'mainline_west') {
        // Approaching crossing at X=12600 from east
        if (headCar.x <= 13400 && headCar.x >= 13200 && (headCar.hornTimer || 0) <= 0) {
          headCar.hornTimer = 18;
          const distGain = this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY);
          sound.playTrainHorn(1.8, distGain);
        }
      }

      if (headCar.hornTimer && headCar.hornTimer > 0) {
        headCar.hornTimer -= dt;
      }
    }

    // 7. Level Crossing Bells (West Station Crossing at 12600 & East 14km Crossing at 14400)
    const westCrossingSignal = signals.find(s => s.id === 'sig_cross_north' || s.id === 'sig_cross_south');
    const eastCrossingSignal = signals.find(s => s.id === 'sig_cross_east_north' || s.id === 'sig_cross_east_south');
    
    const isWestClosed = westCrossingSignal && (westCrossingSignal.currentAspect === 'red_alternating' || westCrossingSignal.currentAspect === 'red_alternating_flashing' || westCrossingSignal.currentAspect === 'red');
    const isEastClosed = eastCrossingSignal && (eastCrossingSignal.currentAspect === 'red_alternating' || eastCrossingSignal.currentAspect === 'red_alternating_flashing' || eastCrossingSignal.currentAspect === 'red');

    if (isWestClosed || isEastClosed) {
      this.crossingBellTimer += dt;
      if (this.crossingBellTimer >= 0.35) {
        this.crossingBellTimer = 0;
        const gainWest = isWestClosed ? this.calcDistanceGain(12600, 5800, playerX, playerY) : 0;
        const gainEast = isEastClosed ? this.calcDistanceGain(15620, 5810, playerX, playerY) : 0;
        const maxGain = Math.max(gainWest, gainEast);
        if (maxGain > 0.02) {
          sound.playCrossingBell(maxGain);
        }
      }
    } else {
      this.crossingBellTimer = 0;
    }

    // 8. Train Collision Physics with Vehicles and Pedestrians
    this.resolveTrainCollisions(world, dt, playerX, playerY, playerObj);
  }

  /**
   * Ultra-realistic collision physics for trains colliding with vehicles, player, and pedestrians.
   * Multi-kiloton momentum: continuous dragging along tracks, frontal plow wedge physics, and catastrophic deformation.
   */
  private static resolveTrainCollisions(world: GameWorld, dt: number, playerX: number, playerY: number, playerObj?: Player): void {
    const rollingStock = world.rollingStock || [];
    const vehicles = world.vehicles || [];
    const player = playerObj || (world as any)._lastPlayer || (world as any).player;
    if (!rollingStock.length) return;

    const now = performance.now();
    const processedVehiclesThisFrame = new Set<string>();

    for (const consist of this.consists) {
      for (const carId of consist.carIds) {
        const trainCar = rollingStock.find(c => c.id === carId);
        if (!trainCar) continue;

        const isLeadLoco = (trainCar.id === consist.headCarId);
        const halfTL = trainCar.length / 2;
        const halfTW = trainCar.width / 2;
        const cosTA = Math.cos(trainCar.angle);
        const sinTA = Math.sin(trainCar.angle);

        // Train car oriented bounding box corners
        const tCorners = [
          { x: trainCar.x + cosTA * halfTL - sinTA * halfTW, y: trainCar.y + sinTA * halfTL + cosTA * halfTW },
          { x: trainCar.x + cosTA * halfTL + sinTA * halfTW, y: trainCar.y + sinTA * halfTL - cosTA * halfTW },
          { x: trainCar.x - cosTA * halfTL + sinTA * halfTW, y: trainCar.y - sinTA * halfTL - cosTA * halfTW },
          { x: trainCar.x - cosTA * halfTL - sinTA * halfTW, y: trainCar.y - sinTA * halfTL + cosTA * halfTW }
        ];

        // Track and movement unit vectors (cosTA, sinTA already accurately orient along heading)
        const forwardX = cosTA;
        const forwardY = sinTA;
        const lateralX = -sinTA;
        const lateralY = cosTA;
        const trainSpeed = Math.max(8, consist.speed);
        const trainVelX = forwardX * trainSpeed;
        const trainVelY = forwardY * trainSpeed;

        // 1. Collisions with Vehicles
        for (const veh of vehicles) {
          if ((veh as any).isGhost || processedVehiclesThisFrame.has(veh.id)) continue;
          const dx = veh.x - trainCar.x;
          const dy = veh.y - trainCar.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > 340 * 340) continue; // Broadphase bounding circle check

          const col = this.checkCarTrainCollision(veh, tCorners, cosTA, sinTA);
          if (col.collided) {
            processedVehiclesThisFrame.add(veh.id);

            // Longitudinal and Lateral displacement relative to train car center
            const dLong = dx * forwardX + dy * forwardY;
            const dLat = dx * lateralX + dy * lateralY;

            // Trigger Train Emergency Brake system on locomotive (pneumatic braking over long distance)
            consist.emergencyBrake = true;
            consist.emergencyBrakeTimer = Math.max(consist.emergencyBrakeTimer || 0, 18.0);
            consist.stationDwellTimer = -1; // Cancel platform boarding timer so it acts physically

            // Multi-thousand ton kinetic momentum: train barely slows down immediately from a car impact (deltaV < 0.05 px/s)
            consist.speed = Math.max(0, consist.speed - 0.04);

            const isFrontalPlow = isLeadLoco && dLong > (halfTL * 0.35);
            const carHalfLen = (veh.length || 60) / 2;
            const carHalfWid = (veh.width || 34) / 2;

            if (isFrontalPlow) {
              // --- FRONTAL PLOWING & DRAGGING (Волочение по путям метельником локомотива) ---
              // The front cowcatcher plate pushes the vehicle forward along track heading
              const reqLong = halfTL + carHalfWid * 0.65;
              if (dLong < reqLong) {
                const penLong = reqLong - dLong;
                veh.x += forwardX * penLong;
                veh.y += forwardY * penLong;
              }

              // Full forward velocity transfer along train heading (no backwards movement)
              veh.vx = trainVelX;
              veh.vy = trainVelY;
              veh.speed = trainSpeed;

              // Wedge deflection physics of locomotive plow (Метельник постепенно отжимает кузов вбок)
              const latSign = dLat >= 0 ? 1 : -1;
              const wedgeSpeed = (16 + Math.min(55, Math.abs(dLat) * 1.6)) * dt;
              veh.x += lateralX * latSign * wedgeSpeed;
              veh.y += lateralY * latSign * wedgeSpeed;
              veh.angularVelocity = (veh.angularVelocity || 0) * 0.90 + latSign * (1.8 + trainSpeed * 0.02);
              veh.lateralVelocity = latSign * 30;
              veh.spinoutTimer = 4.0;
            } else {
              // --- FLANK / SIDE IMPACT & SCRAPING (Боковой скользящий удар вдоль состава) ---
              const outLat = dLat >= 0 ? 1 : -1;
              const reqLat = halfTW + carHalfWid;
              const penLat = reqLat - Math.abs(dLat);
              if (penLat > 0) {
                veh.x += lateralX * outLat * (penLat + 1.2);
                veh.y += lateralY * outLat * (penLat + 1.2);
              }

              veh.vx = (veh.vx || 0) * 0.60 + trainVelX * 0.65;
              veh.vy = (veh.vy || 0) * 0.60 + trainVelY * 0.65;
              veh.angularVelocity = (veh.angularVelocity || 0) * 0.8 + outLat * (2.5 + trainSpeed * 0.03);
              veh.speed = Math.hypot(veh.vx, veh.vy);
            }

            // Mechanical Destruction & Wreck state
            veh.aiState = 'wrecked' as any;
            veh.turnSignal = 'hazard';
            veh.brakeLightsOn = true;
            (veh as any).brokenTires = [true, true, true, true];
            (veh as any).isDerelict = true;

            if (veh.engineState) {
              veh.engineState.engineRunning = false;
              veh.engineState.isStalled = true;
              veh.engineState.radiatorPunctured = true;
              veh.engineState.oilPunctured = true;
              veh.engineState.engineHealth = 0;
              veh.engineState.isSeized = true;
              veh.engineState.overheatingSteam = true;
            }
            if (veh.fuelSystem) {
              veh.fuelSystem.tankPunctured = true;
            }

            // Catastrophic Deformation (Multi-kiloton Train Striker Mass = 250,000 kg)
            const contactX = veh.x - col.normalX * carHalfLen;
            const contactY = veh.y - col.normalY * carHalfWid;
            const impactSpeed = Math.max(80, trainSpeed * 1.6);
            applyVehicleDamageAndDeformation(veh, contactX, contactY, impactSpeed, trainSpeed, world, 250000, true);

            // Audio Feedback (Train Horn, Metallic Grinding, Pneumatic Brakes)
            const distGain = this.calcDistanceGain(trainCar.x, trainCar.y, playerX, playerY);
            sound.playCollision(1.0);
            if ((trainCar.hornTimer || 0) <= 0) {
              trainCar.hornTimer = 4.0;
              sound.playTrainHorn(2.5, distGain);
            }

            // Continuous intense spark spray streaming along the rails
            if (world.particles && Math.random() < 0.85) {
              for (let p = 0; p < 18; p++) {
                world.particles.push({
                  x: contactX + (Math.random() * 16 - 8),
                  y: contactY + (Math.random() * 16 - 8),
                  vx: trainVelX * 0.5 + (Math.random() * 220 - 110),
                  vy: trainVelY * 0.5 + (Math.random() * 220 - 110),
                  radius: 2 + Math.random() * 3,
                  color: Math.random() < 0.7 ? '#f59e0b' : '#fef08a',
                  alpha: 1.0,
                  life: 0,
                  maxLife: 0.3 + Math.random() * 0.45,
                  type: 'spark'
                });
              }
              if (Math.random() < 0.4) {
                world.particles.push({
                  x: contactX + (Math.random() * 12 - 6),
                  y: contactY + (Math.random() * 12 - 6),
                  vx: Math.random() * 120 - 60,
                  vy: Math.random() * 120 - 60,
                  radius: 3 + Math.random() * 4,
                  color: '#1e293b',
                  alpha: 0.9,
                  life: 0,
                  maxLife: 0.7 + Math.random() * 0.5,
                  type: 'debris'
                });
              }
            }

            // Fluid spills on track ballast
            if (!world.stains) world.stains = [];
            if (Math.random() < 0.25) {
              const stainId = 'stain_train_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
              world.stains.push({
                id: stainId,
                x: contactX + (Math.random() * 20 - 10),
                y: contactY + (Math.random() * 20 - 10),
                radius: 18 + Math.random() * 12,
                maxRadius: 32,
                type: Math.random() < 0.6 ? 'oil' : 'fuel',
                life: 0,
                maxLife: 100,
                alpha: 0.85
              });
            }

            // Trauma to player if inside vehicle
            if (player && (player.isInVehicle && player.currentVehicleId === veh.id || veh.isPlayerControlled)) {
              applyDriverVehicleCrashTrauma(player, impactSpeed * 1.8, 'сбит поездом на железнодорожном переезде', 1.0, veh);
            }
          }
        }

        // 2. Collisions with Pedestrian Player on Tracks
        if (player && !player.isInVehicle) {
          const dx = player.x - trainCar.x;
          const dy = player.y - trainCar.y;
          const pDistSq = dx * dx + dy * dy;
          if (pDistSq < (halfTL + 35) * (halfTL + 35)) {
            const pCol = this.checkPointInRotatedBox(player.x, player.y, trainCar.x, trainCar.y, halfTL + 10, halfTW + 10, trainCar.angle);
            if (pCol.inside) {
              const impactSpeed = Math.max(35, trainSpeed);

              // Push player along train momentum and outwards
              player.x += forwardX * (impactSpeed * 0.4) + pCol.normalX * (pCol.depth + 14);
              player.y += forwardY * (impactSpeed * 0.4) + pCol.normalY * (pCol.depth + 14);

              distributeImpactDamage(player, 120 + impactSpeed * 1.8, 0, true);
              sound.playCollision(1.0);
              sound.playTrainHorn(2.5, 1.0);

              if (!world.stains) world.stains = [];
              const bloodStainId = 'stain_train_b_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
              world.stains.push({
                id: bloodStainId,
                x: player.x,
                y: player.y,
                radius: 20,
                maxRadius: 32,
                type: 'blood' as any,
                life: 0,
                maxLife: 200,
                alpha: 0.95
              });
            }
          }
        }
      }
    }
  }

  /**
   * Oriented Bounding Box (OBB) SAT collision between vehicle and train car
   */
  private static checkCarTrainCollision(
    car: Vehicle,
    tCorners: { x: number; y: number }[],
    cosTA: number,
    sinTA: number
  ): { collided: boolean; normalX: number; normalY: number; depth: number } {
    const halfL = car.length / 2;
    const halfW = car.width / 2;
    const cosCA = Math.cos(car.angle);
    const sinCA = Math.sin(car.angle);

    const cCorners = [
      { x: car.x + cosCA * halfL - sinCA * halfW, y: car.y + sinCA * halfL + cosCA * halfW },
      { x: car.x + cosCA * halfL + sinCA * halfW, y: car.y + sinCA * halfL - cosCA * halfW },
      { x: car.x - cosCA * halfL + sinCA * halfW, y: car.y - sinCA * halfL - cosCA * halfW },
      { x: car.x - cosCA * halfL - sinCA * halfW, y: car.y - sinCA * halfL + cosCA * halfW }
    ];

    const axes = [
      { x: cosTA, y: sinTA },
      { x: -sinTA, y: cosTA },
      { x: cosCA, y: sinCA },
      { x: -sinCA, y: cosCA }
    ];

    let minOverlap = Infinity;
    let smallestAxisX = 0;
    let smallestAxisY = 0;

    for (const axis of axes) {
      let minA = Infinity;
      let maxA = -Infinity;
      for (const p of tCorners) {
        const proj = p.x * axis.x + p.y * axis.y;
        if (proj < minA) minA = proj;
        if (proj > maxA) maxA = proj;
      }

      let minB = Infinity;
      let maxB = -Infinity;
      for (const p of cCorners) {
        const proj = p.x * axis.x + p.y * axis.y;
        if (proj < minB) minB = proj;
        if (proj > maxB) maxB = proj;
      }

      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
      if (overlap <= 0) {
        return { collided: false, normalX: 0, normalY: 0, depth: 0 };
      }

      if (overlap < minOverlap) {
        minOverlap = overlap;
        smallestAxisX = axis.x;
        smallestAxisY = axis.y;
      }
    }

    // Ensure normal points from train to car
    const dx = car.x - ((tCorners[0].x + tCorners[2].x) / 2);
    const dy = car.y - ((tCorners[0].y + tCorners[2].y) / 2);
    if (dx * smallestAxisX + dy * smallestAxisY < 0) {
      smallestAxisX = -smallestAxisX;
      smallestAxisY = -smallestAxisY;
    }

    return {
      collided: true,
      normalX: smallestAxisX,
      normalY: smallestAxisY,
      depth: minOverlap
    };
  }

  /**
   * Point in rotated rectangle check for pedestrian / player on tracks
   */
  private static checkPointInRotatedBox(
    px: number,
    py: number,
    boxX: number,
    boxY: number,
    halfL: number,
    halfW: number,
    angle: number
  ): { inside: boolean; normalX: number; normalY: number; depth: number } {
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    const dx = px - boxX;
    const dy = py - boxY;
    const localX = cos * dx - sin * dy;
    const localY = sin * dx + cos * dy;

    if (Math.abs(localX) <= halfL && Math.abs(localY) <= halfW) {
      const overlapX = halfL - Math.abs(localX);
      const overlapY = halfW - Math.abs(localY);
      const minOverlap = Math.min(overlapX, overlapY);

      let localNormX = 0;
      let localNormY = 0;
      if (overlapX < overlapY) {
        localNormX = Math.sign(localX) || 1;
      } else {
        localNormY = Math.sign(localY) || 1;
      }

      // Rotate normal back to world
      const cosW = Math.cos(angle);
      const sinW = Math.sin(angle);
      const worldNormX = cosW * localNormX - sinW * localNormY;
      const worldNormY = sinW * localNormX + cosW * localNormY;

      return { inside: true, normalX: worldNormX, normalY: worldNormY, depth: minOverlap };
    }

    return { inside: false, normalX: 0, normalY: 0, depth: 0 };
  }

  /**
   * Evaluate ALSN signal aspects in front of Eastbound train (track I)
   */
  private static evaluateSignalsInFrontEastbound(locoX: number, signals: RailwaySignal[], maxSpeed: number): number {
    const candidateSignals = signals
      .filter(s => s.angle === Math.PI && s.x > locoX && s.y >= 5650 && s.y <= 5830)
      .sort((a, b) => a.x - b.x);

    if (candidateSignals.length === 0) return maxSpeed;

    const nextSig = candidateSignals[0];
    const distToSig = nextSig.x - locoX;

    // Red aspect (Запрещающий сигнал - полная остановка перед светофором)
    if (nextSig.currentAspect === 'red') {
      if (distToSig <= 25) return 0; // Stop right at the signal
      if (distToSig <= 180) return 15;
      if (distToSig <= 450) return 35;
      if (distToSig <= 850) return 60;
      return maxSpeed * 0.8;
    }

    // Yellow / Yellow Flashing aspect (Предупредительный сигнал - 40 км/ч)
    if (nextSig.currentAspect === 'yellow' || nextSig.currentAspect === 'yellow_flashing') {
      if (distToSig <= 450) return 40;
      if (distToSig <= 850) return 65;
      return maxSpeed * 0.85;
    }

    // Green aspect (Разрешающий сигнал - установленная скорость)
    return maxSpeed;
  }

  /**
   * Evaluate ALSN signal aspects in front of Westbound train (track II)
   */
  private static evaluateSignalsInFrontWestbound(locoX: number, signals: RailwaySignal[], maxSpeed: number): number {
    const candidateSignals = signals
      .filter(s => s.angle === 0 && s.x < locoX && s.y >= 5820 && s.y <= 5960)
      .sort((a, b) => b.x - a.x);

    if (candidateSignals.length === 0) return maxSpeed;

    const nextSig = candidateSignals[0];
    const distToSig = locoX - nextSig.x;

    // Red aspect (Запрещающий сигнал - полная остановка перед светофором)
    if (nextSig.currentAspect === 'red') {
      if (distToSig <= 25) return 0; // Stop right at the signal
      if (distToSig <= 180) return 15;
      if (distToSig <= 450) return 35;
      if (distToSig <= 850) return 60;
      return maxSpeed * 0.8;
    }

    // Yellow / Yellow Flashing aspect (Предупредительный сигнал - 40 км/ч)
    if (nextSig.currentAspect === 'yellow' || nextSig.currentAspect === 'yellow_flashing') {
      if (distToSig <= 450) return 40;
      if (distToSig <= 850) return 65;
      return maxSpeed * 0.85;
    }

    // Green aspect (Разрешающий сигнал - установленная скорость)
    return maxSpeed;
  }

  /**
   * Calculate distance attenuation gain (0.0 to 1.0)
   */
  private static calcDistanceGain(srcX: number, srcY: number, listenerX: number, listenerY: number): number {
    const dx = srcX - listenerX;
    const dy = srcY - listenerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxHearingDistance = 4500;
    if (dist >= maxHearingDistance) return 0;
    return Math.max(0, Math.min(1, 1 - dist / maxHearingDistance));
  }
}

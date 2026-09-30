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

  public static isHeadCar(carId: string): boolean {
    return this.consists.some(c => c.headCarId === carId);
  }

  public static isTailCar(carId: string): boolean {
    return this.consists.some(c => c.carIds.length > 0 && c.carIds[c.carIds.length - 1] === carId);
  }

  public static getConsists(): TrainConsist[] {
    return this.consists;
  }

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

    // Procedurally generate heavy freight train (65-70 cars)
    const initialFreight = this.generateRandomHeavyFreightTrain(world, 26000);

    // Setup the active Train Consists
    this.consists = [
      // 1. Пассажирский экспресс №12 «Степной» (ТЭП70БС + 4 вагона ТВЗ РЖД) - Путь 3 (Y=8600), на ВОСТОК (+X)
      {
        id: 'train_pass_express',
        name: 'Пассажирский поезд №12 «Степной Экспресс»',
        routeType: 'mainline_east',
        trackY: 8600,
        direction: 1,
        speed: 0,
        maxSpeed: 480, // 108 km/h on open steppe mainline (formerly 47 km/h)
        acceleration: 28, // Realistic diesel-electric tractive effort (~6.3 km/h per sec)
        deceleration: 48, // Electro-pneumatic service brake
        headCarId: 'train_loco_1',
        carIds: ['train_loco_1', 'train_coach_1', 'train_coach_2', 'train_coach_3', 'train_coach_4'],
        stationDwellTimer: 25,
        nextHornDist: 12100,
        lastWheelClickTime: 0
      },

      // 2. Тяжелый магистральный грузовой поезд (Случайный маршрутный 65–70 вагонов) - Путь II (Y=8880), на ЗАПАД (-X)
      {
        id: 'train_freight_heavy',
        name: 'Тяжелый грузовой поезд (Маршрутный вертушечный)',
        routeType: 'mainline_west',
        trackY: 8880,
        direction: -1,
        speed: 330, // 74 km/h heavy freight transit speed
        maxSpeed: 340, // 76.5 km/h on open mainline II
        acceleration: 10, // Massive 5000-ton kinetic inertia
        deceleration: 20, // Heavy train pneumatic brake shoe friction
        headCarId: initialFreight.headCarId,
        carIds: initialFreight.carIds,
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
    const existingCars = world.rollingStock || [];
    const activeRollingStock: RollingStockCar[] = [];
    this.consists = [];

    world.trainSchedules?.forEach((sched) => {
      if (sched.enabled === false) return;

      const isVL80 = sched.locomotive.type === 'locomotive_electric_vl80' || sched.locomotive.type.includes('vl80');
      const headId = `sched_${sched.id}_loco`;
      const carIds: string[] = [headId];

      const locoLen = isVL80 ? 320 : 420;
      const headNumber = isVL80
        ? (sched.locomotive.roadNumber ? (sched.locomotive.roadNumber.includes('А') ? sched.locomotive.roadNumber : `${sched.locomotive.roadNumber}А`) : 'ВЛ80С-1420А')
        : (sched.locomotive.roadNumber || 'ТЭП70БС');

      let headCar = existingCars.find(c => c.id === headId);
      if (!headCar) {
        headCar = {
          id: headId,
          name: isVL80 ? `${sched.locomotive.name || 'Электровоз ВЛ80С'} (Секция А)` : (sched.locomotive.name || sched.name),
          type: sched.locomotive.type,
          x: sched.spawnX,
          y: sched.spawnY,
          length: locoLen,
          width: 62,
          angle: sched.spawnDirection === 1 ? 0 : Math.PI,
          livery: sched.locomotive.livery || 'rzd_classic',
          roadNumber: headNumber,
          hasHeadlight: true,
          headlightColor: sched.locomotive.headlightColor || '#fffbeb',
          speed: sched.spawnSpeed,
          direction: sched.spawnDirection
        };
      } else {
        headCar.x = sched.spawnX;
        headCar.y = sched.spawnY;
        headCar.speed = sched.spawnSpeed;
        headCar.direction = sched.spawnDirection;
        headCar.angle = sched.spawnDirection === 1 ? 0 : Math.PI;
      }
      activeRollingStock.push(headCar);

      let prevCarLen = locoLen;
      let accumOffset = 0;

      // ВЛ80С — двухсекционный магистральный электровоз (Секция А + Секция Б)
      if (isVL80) {
        const secBId = `sched_${sched.id}_loco_b`;
        carIds.push(secBId);

        const couplerDist = locoLen / 2 + locoLen / 2 + 10;
        accumOffset += couplerDist;
        const secBX = sched.spawnDirection === 1 ? sched.spawnX - accumOffset : sched.spawnX + accumOffset;

        const secBNumber = sched.locomotive.roadNumber
          ? (sched.locomotive.roadNumber.includes('А') ? sched.locomotive.roadNumber.replace('А', 'Б') : `${sched.locomotive.roadNumber}Б`)
          : 'ВЛ80С-1420Б';

        let secBCar = existingCars.find(c => c.id === secBId);
        if (!secBCar) {
          secBCar = {
            id: secBId,
            name: `${sched.locomotive.name || 'Электровоз ВЛ80С'} (Секция Б)`,
            type: sched.locomotive.type,
            x: secBX,
            y: sched.spawnY,
            length: locoLen,
            width: 62,
            angle: (sched.spawnDirection === 1 ? 0 : Math.PI) + Math.PI,
            livery: sched.locomotive.livery || 'rzd_classic',
            roadNumber: secBNumber,
            hasHeadlight: false,
            speed: sched.spawnSpeed,
            direction: sched.spawnDirection,
            isSectionB: true
          };
        } else {
          secBCar.x = secBX;
          secBCar.y = sched.spawnY;
          secBCar.speed = sched.spawnSpeed;
          secBCar.direction = sched.spawnDirection;
          secBCar.isSectionB = true;
          secBCar.angle = (sched.spawnDirection === 1 ? 0 : Math.PI) + Math.PI;
        }
        activeRollingStock.push(secBCar);
        prevCarLen = locoLen;
      }

      sched.cars?.forEach((carDef, cIdx) => {
        const carId = `sched_${sched.id}_car_${cIdx}`;
        carIds.push(carId);

        const carLen = carDef.type.includes('hopper')
          ? (carDef.cargoType === 'grain' ? 285 : 270)
          : carDef.type.includes('tanker')
          ? 230
          : carDef.type.includes('timber') || carDef.type.includes('flatcar')
          ? 280
          : 490; // TVZ 61-4440/61-4447 passenger coach is 25.5m (490px)
        const carW = 60;
        const couplerDist = prevCarLen / 2 + carLen / 2 + 10;
        accumOffset += couplerDist;
        const carX = sched.spawnDirection === 1 ? sched.spawnX - accumOffset : sched.spawnX + accumOffset;
        prevCarLen = carLen;

        let car = existingCars.find(c => c.id === carId);
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
        } else {
          car.x = carX;
          car.y = sched.spawnY;
          car.speed = sched.spawnSpeed;
          car.direction = sched.spawnDirection;
          car.angle = sched.spawnDirection === 1 ? 0 : Math.PI;
        }
        activeRollingStock.push(car);
      });

      const isPassenger = sched.locomotive.type.includes('diesel') || sched.id.includes('pass') || (sched.cars && sched.cars.some(c => c.type.includes('coach')));
      const defaultMaxSpeed = isPassenger ? 480 : 340;

      this.consists.push({
        id: sched.id,
        name: sched.name,
        routeType: 'scheduled',
        trackY: sched.spawnY,
        direction: sched.spawnDirection,
        speed: Math.max(sched.spawnSpeed || 0, defaultMaxSpeed * 0.75),
        maxSpeed: Math.max(sched.maxSpeed || 0, defaultMaxSpeed),
        acceleration: isPassenger ? 28 : 10,
        deceleration: isPassenger ? 48 : 20,
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

    // Ensure rollingStock only contains active scheduled trains (removes unmanaged orphan duplicates)
    world.rollingStock = activeRollingStock;
  }

  /**
   * Generates a realistic heavy freight train (65 to 70 cars) with procedural locomotive configuration
   * (2x ВЛ80С, 3x ВЛ80С, or 2ТЭ116 / 2ТЭ10М) and authentic specialized car compositions
   * (pure timber, pure oil tankers, pure coal, grain hoppers, container/steel flatcars, or mixed general freight).
   */
  public static generateRandomHeavyFreightTrain(world: GameWorld, startX: number = 26000): { headCarId: string; carIds: string[] } {
    const trackY = 8880; // Mainline II (Westbound)
    const carIds: string[] = [];

    // 1. Select Locomotive Configuration
    const locoChoice = Math.random();
    let locoCars: RollingStockCar[] = [];

    if (locoChoice < 0.40) {
      // 2-Section VL80S Electric Locomotive
      const locoNum = 1200 + Math.floor(Math.random() * 800);
      locoCars = [
        {
          id: 'train_freight_loco_1',
          name: `Магистральный электровоз ВЛ80С-${locoNum} (Секция А)`,
          type: 'locomotive_electric_vl80',
          x: startX,
          y: trackY,
          length: 320,
          width: 62,
          angle: Math.PI,
          livery: 'rzd_classic',
          roadNumber: `ВЛ80С-${locoNum}А`,
          hasHeadlight: true,
          headlightColor: '#fffbeb',
          speed: 330,
          direction: -1
        },
        {
          id: 'train_freight_loco_2',
          name: `Магистральный электровоз ВЛ80С-${locoNum} (Секция Б)`,
          type: 'locomotive_electric_vl80',
          x: startX + 330,
          y: trackY,
          length: 320,
          width: 62,
          angle: 0,
          livery: 'rzd_classic',
          roadNumber: `ВЛ80С-${locoNum}Б`,
          hasHeadlight: false,
          speed: 330,
          direction: -1,
          isSectionB: true
        }
      ];
    } else if (locoChoice < 0.70) {
      // 3-Section Triple VL80S Electric Locomotive (Тройник ВЛ80С)
      const locoNum = 1200 + Math.floor(Math.random() * 800);
      locoCars = [
        {
          id: 'train_freight_loco_1',
          name: `Магистральный электровоз ВЛ80С-${locoNum} (Секция А)`,
          type: 'locomotive_electric_vl80',
          x: startX,
          y: trackY,
          length: 320,
          width: 62,
          angle: Math.PI,
          livery: 'rzd_classic',
          roadNumber: `ВЛ80С-${locoNum}А`,
          hasHeadlight: true,
          headlightColor: '#fffbeb',
          speed: 330,
          direction: -1
        },
        {
          id: 'train_freight_loco_2',
          name: `Бустерная промежуточная секция ВЛ80С-${locoNum}П`,
          type: 'locomotive_electric_vl80',
          x: startX + 330,
          y: trackY,
          length: 320,
          width: 62,
          angle: 0,
          livery: 'rzd_classic',
          roadNumber: `ВЛ80С-${locoNum}П`,
          hasHeadlight: false,
          speed: 330,
          direction: -1,
          isSectionB: true
        },
        {
          id: 'train_freight_loco_3',
          name: `Магистральный электровоз ВЛ80С-${locoNum} (Секция Б)`,
          type: 'locomotive_electric_vl80',
          x: startX + 660,
          y: trackY,
          length: 320,
          width: 62,
          angle: 0,
          livery: 'rzd_classic',
          roadNumber: `ВЛ80С-${locoNum}Б`,
          hasHeadlight: false,
          speed: 330,
          direction: -1,
          isSectionB: true
        }
      ];
    } else {
      // 2-Section Heavy Diesel Locomotive 2TE116 / 2TE10M
      const locoNum = 1400 + Math.floor(Math.random() * 400);
      locoCars = [
        {
          id: 'train_freight_loco_1',
          name: `Магистральный тепловоз 2ТЭ116-${locoNum} (Секция А)`,
          type: 'locomotive_diesel',
          x: startX,
          y: trackY,
          length: 330,
          width: 62,
          angle: Math.PI,
          livery: 'rzd_classic',
          roadNumber: `2ТЭ116-${locoNum}А`,
          hasHeadlight: true,
          headlightColor: '#fffbeb',
          speed: 330,
          direction: -1
        },
        {
          id: 'train_freight_loco_2',
          name: `Магистральный тепловоз 2ТЭ116-${locoNum} (Секция Б)`,
          type: 'locomotive_diesel',
          x: startX + 340,
          y: trackY,
          length: 330,
          width: 62,
          angle: 0,
          livery: 'rzd_classic',
          roadNumber: `2ТЭ116-${locoNum}Б`,
          hasHeadlight: false,
          speed: 330,
          direction: -1,
          isSectionB: true
        }
      ];
    }

    // 2. Select Train Composition Theme
    // Number of cars: random between 65 and 70 cars!
    const targetCarCount = 65 + Math.floor(Math.random() * 6); // 65..70
    const themeChoice = Math.random();

    let carTypesPool: Array<{ type: string; length: number; name: string; cargo: string; liveries: string[] }> = [];

    if (themeChoice < 0.22) {
      // 1. Нефтеналивной маршрут («Нефтяная вертушка»)
      carTypesPool = [
        { type: 'freight_tanker', length: 230, name: '4-осная нефтяная цистерна 15-1443', cargo: 'crude_oil', liveries: ['freight_rust_brown', 'freight_black'] },
        { type: 'freight_tanker', length: 230, name: '4-осная цистерна (Дизельное топливо)', cargo: 'fuel', liveries: ['freight_black', 'freight_blue'] },
        { type: 'freight_tanker', length: 230, name: '4-осная цистерна (Бензин АИ-95)', cargo: 'gasoline', liveries: ['freight_black', 'freight_rust_brown'] }
      ];
    } else if (themeChoice < 0.42) {
      // 2. Лесовозный маршрут («Сибирский лесовоз»)
      carTypesPool = [
        { type: 'freight_flatcar_timber', length: 260, name: 'Спецплатформа-лесовоз с хвойным пиловочником', cargo: 'timber', liveries: ['freight_timber', 'freight_rust_brown'] },
        { type: 'freight_flatcar_timber', length: 260, name: 'Платформа-лесовоз 13-4012 с пиломатериалами', cargo: 'lumber', liveries: ['freight_timber', 'freight_rust_brown'] }
      ];
    } else if (themeChoice < 0.62) {
      // 3. Угольный вертушечный поезд («Кузбасский уголь»)
      carTypesPool = [
        { type: 'freight_hopper', length: 270, name: '4-осный полувагон 12-132 с каменным углем', cargo: 'coal', liveries: ['freight_rust_brown', 'freight_black'] },
        { type: 'freight_hopper', length: 270, name: 'Полувагон с коксующимся углем', cargo: 'coal', liveries: ['freight_rust_brown'] }
      ];
    } else if (themeChoice < 0.78) {
      // 4. Зерновой маршрут («Зерновоз»)
      carTypesPool = [
        { type: 'freight_hopper', length: 285, name: 'Хоппер-зерновоз 19-752 (Пшеница целинная)', cargo: 'grain', liveries: ['freight_blue', 'freight_green'] },
        { type: 'freight_hopper', length: 285, name: 'Хоппер-зерновоз (Ячмень продовольственный)', cargo: 'grain', liveries: ['freight_blue', 'freight_rust_brown'] }
      ];
    } else {
      // 5. Сборный тяжелопоезд (Смешанный состав из разных видов грузов)
      carTypesPool = [
        { type: 'freight_tanker', length: 230, name: '4-осная цистерна', cargo: 'crude_oil', liveries: ['freight_rust_brown', 'freight_black'] },
        { type: 'freight_hopper', length: 270, name: 'Полувагон с каменным углем', cargo: 'coal', liveries: ['freight_rust_brown'] },
        { type: 'freight_hopper', length: 270, name: 'Полувагон со щебнем гранитным', cargo: 'gravel', liveries: ['freight_rust_brown', 'freight_blue'] },
        { type: 'freight_hopper', length: 285, name: 'Хоппер-зерновоз 19-752', cargo: 'grain', liveries: ['freight_blue'] },
        { type: 'freight_flatcar_timber', length: 260, name: 'Платформа-лесовоз', cargo: 'timber', liveries: ['freight_timber', 'freight_rust_brown'] },
        { type: 'freight_flatcar_timber', length: 260, name: 'Универсальная платформа со стальным прокатом', cargo: 'steel', liveries: ['freight_rust_brown'] }
      ];
    }

    // Build the car objects
    for (const loco of locoCars) {
      carIds.push(loco.id);
    }

    const generatedCars: RollingStockCar[] = [...locoCars];
    let currentXOffset = locoCars.reduce((acc, l) => acc + l.length + 10, 0);

    for (let i = 1; i <= targetCarCount; i++) {
      const template = carTypesPool[Math.floor(Math.random() * carTypesPool.length)];
      const livery = template.liveries[Math.floor(Math.random() * template.liveries.length)];
      const carId = `train_freight_car_${i}`;
      carIds.push(carId);

      const carX = startX + currentXOffset + template.length / 2;
      currentXOffset += template.length + 10;

      generatedCars.push({
        id: carId,
        name: `${template.name} №${String(i).padStart(2, '0')}`,
        type: template.type as any,
        x: carX,
        y: trackY,
        length: template.length,
        width: 60,
        angle: Math.PI,
        livery: livery as any,
        roadNumber: `${5000 + Math.floor(Math.random() * 4000)} ${1000 + i}`,
        cargoType: template.cargo,
        speed: 330,
        direction: -1
      });
    }

    // Update world.rollingStock: filter out any previous freight train cars, then push generatedCars
    world.rollingStock = (world.rollingStock || []).filter(
      c => !c.id.startsWith('train_freight_') && !c.id.startsWith('train_vl80_') && !c.id.startsWith('train_tanker_') && !c.id.startsWith('train_hopper_') && !c.id.startsWith('train_timber_') && !c.id.startsWith('train_flatcar_')
    );
    world.rollingStock.push(...generatedCars);

    return {
      headCarId: locoCars[0].id,
      carIds
    };
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
      // Расположен у платформы №1 (Путь 3, Y=8600) точно у знака «Остановка первого вагона» (X=12420)
      {
        id: 'train_loco_1',
        name: 'Магистральный тепловоз ТЭП70БС-0245',
        type: 'locomotive_diesel',
        x: 12210, // Nose at X=12420 (знак «Остановка первого вагона»)
        y: 8600,
        length: 420, // Real Kolomna TEP70BS: 21.7m (420px)
        width: 62,
        angle: 0,
        livery: 'rzd_classic',
        roadNumber: 'ТЭП70БС-0245',
        hasHeadlight: true,
        headlightColor: '#fffbeb',
        speed: 0,
        direction: 1
      },
      {
        id: 'train_coach_1',
        name: 'Фирменный купейный вагон РЖД 61-4440 №01',
        type: 'passenger_coach_rzhd',
        x: 11745,
        y: 8600,
        length: 490, // Real TVZ 61-4440: 25.5m (490px)
        width: 60,
        angle: 0,
        livery: 'rzd_classic',
        roadNumber: '018 24519'
      },
      {
        id: 'train_coach_2',
        name: 'Фирменный плацкартный вагон РЖД 61-4447 №02',
        type: 'passenger_coach_platskart',
        x: 11245,
        y: 8600,
        length: 490, // Real TVZ 61-4447: 25.5m (490px)
        width: 60,
        angle: 0,
        livery: 'rzd_classic',
        roadNumber: '018 24527'
      },
      {
        id: 'train_coach_3',
        name: 'Фирменный купейный вагон РЖД 61-4440 №03',
        type: 'passenger_coach_rzhd',
        x: 10745,
        y: 8600,
        length: 490, // Real TVZ 61-4440: 25.5m (490px)
        width: 60,
        angle: 0,
        livery: 'rzd_classic',
        roadNumber: '018 24535'
      },
      {
        id: 'train_coach_4',
        name: 'Штабной вагон с купе начальника поезда №04',
        type: 'passenger_coach_rzhd',
        x: 10245,
        y: 8600,
        length: 490, // Real TVZ 61-4440: 25.5m (490px)
        width: 60,
        angle: 0,
        livery: 'rzd_classic',
        roadNumber: '018 24501'
      }
    ];

    if (!world.rollingStock) {
      world.rollingStock = [];
    }

    const validIds = new Set(defaultCars.map(c => c.id));
    // Retain default passenger cars, scheduled cars, and generated freight cars
    world.rollingStock = (world.rollingStock || []).filter(
      c => validIds.has(c.id) || (c.id && c.id.startsWith('sched_')) || (c.id && c.id.startsWith('train_freight_'))
    );

    for (const c of defaultCars) {
      const existing = existingMap.get(c.id);
      if (!existing) {
        world.rollingStock.push(c);
        existingMap.set(c.id, c);
      } else {
        existing.length = c.length;
        existing.width = c.width;
        existing.type = c.type;
        existing.name = c.name;
        if (c.cargoType) existing.cargoType = c.cargoType;
      }
    }
  }

  /**
   * Evaluates exact track elevation and derivative slope (dy/dx) along turnout curves, sidings, and mainlines.
   * Provides first-principles kinematic geometry for any train traversing station switches and platform loops.
   */
  public static getTrackState(
    carX: number,
    routeType: string,
    targetTrackY: number = 8740
  ): { y: number; slope: number } {
    // 1. Track 3 Platform Loop (North Passenger Platform #1 at Station building, nominal Y = 8600)
    // Diverges from Mainline I (8740) via West Switch #1 (9100..9600) -> Platform 3 (8600) -> East Switch #3 (12900..13400) -> Mainline I (8740)
    if (Math.abs(targetTrackY - 8600) < 40) {
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

    // 2. Track 4 Siding Loop (South Freight/Passenger Track #4, nominal Y = 9020)
    // Diverges from Mainline II (8880) via West Switch #2 (9100..9600) -> Track 4 (9020) -> East Switch #4 (12900..13400) -> Mainline II (8880)
    if (Math.abs(targetTrackY - 9020) < 40) {
      if (carX < 9100) return { y: 8880, slope: 0 };
      if (carX <= 9600) {
        const u = (carX - 9100) / 500;
        const s = u * u * (3 - 2 * u);
        const ds = 6 * u * (1 - u);
        return { y: 8880 + 140 * s, slope: (140 / 500) * ds };
      }
      if (carX <= 12900) return { y: 9020, slope: 0 };
      if (carX <= 13400) {
        const u = (carX - 12900) / 500;
        const s = u * u * (3 - 2 * u);
        const ds = 6 * u * (1 - u);
        return { y: 9020 - 140 * s, slope: (-140 / 500) * ds };
      }
      return { y: 8880, slope: 0 };
    }

    // 3. Freight Siding & Warehouse Ramp Track (Пакгауз станции Степная, nominal Y = 9180)
    // Branches off from Track 4 (9020) at X=10600..11000 -> Ramp Track (9180) up to buffer stop at 12500
    if (Math.abs(targetTrackY - 9180) < 40) {
      if (carX < 9100) return { y: 8880, slope: 0 };
      if (carX <= 9600) {
        const u = (carX - 9100) / 500;
        const s = u * u * (3 - 2 * u);
        const ds = 6 * u * (1 - u);
        return { y: 8880 + 140 * s, slope: (140 / 500) * ds };
      }
      if (carX <= 10600) return { y: 9020, slope: 0 };
      if (carX <= 11000) {
        const u = (carX - 10600) / 400;
        const s = u * u * (3 - 2 * u);
        const ds = 6 * u * (1 - u);
        return { y: 9020 + 160 * s, slope: (160 / 400) * ds };
      }
      return { y: 9180, slope: 0 };
    }

    // 4. Mainline I (Y = 8740)
    if (Math.abs(targetTrackY - 8740) < 40) {
      return { y: 8740, slope: 0 };
    }

    // 5. Mainline II (Y = 8880)
    if (Math.abs(targetTrackY - 8880) < 40) {
      return { y: 8880, slope: 0 };
    }

    return { y: targetTrackY, slope: 0 };
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

    let baseAngle = 0;
    if (travelDirection === -1 || routeType === 'mainline_west') {
      // Facing West (-X)
      baseAngle = Math.atan2(-dy, -dx);
    } else {
      // Facing East (+X)
      baseAngle = Math.atan2(dy, dx);
    }

    // Section B of a twin-section electric locomotive (or any flipped section) is coupled back-to-back ("задами внутрь")
    if (car.isSectionB || car.isFlipped || car.id.includes('_head_b') || car.id.includes('_loco_b')) {
      car.angle = baseAngle + Math.PI;
    } else {
      car.angle = baseAngle;
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

      const isShunter = headCar.type.includes('chme3') || headCar.type.includes('shunter');

      // Apply safety check for oncoming ("лоб в лоб") or ahead train consists
      const trainAheadSpeed = this.evaluateOncomingAndAheadTrainSpeed(consist, headCar, carMap);
      targetSpeed = Math.min(targetSpeed, trainAheadSpeed);

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
        // Route: Enters West on Main I -> Swerves via Switch #1 (9100..9600) to Track 3 Platform (8600)
        // -> Dwells at Platform 1 (pulled up to sign «Остановка первого вагона» at X=12420) -> Departs via Switch #3 (12900..13400) to Main I
        const platformStopX = 12210; // Locomotive center so front nose stops right at sign «Остановка первого вагона» (X=12420)

        // Continuously obey signals ahead along the route
        const signalSpeed = this.evaluateSignalsInFrontEastbound(headCar.x, signals, consist.maxSpeed, consist.trackY, headCar.length, isShunter);
        targetSpeed = Math.min(targetSpeed, signalSpeed);

        if (headCar.x < platformStopX && consist.stationDwellTimer >= 0) {
          const distToStop = platformStopX - headCar.x;
          if (distToStop < 25) {
            targetSpeed = 0;
            if (consist.stationDwellTimer === 0 && consist.speed < 12) {
              consist.stationDwellTimer = 25; // Boarding time at Platform 1
              consist.speed = 0;
              sound.playTrainBrakeAir(this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY));
            }
          } else if (distToStop < 250) {
            targetSpeed = Math.min(targetSpeed, 45); // Creep speed pulling up to OPV sign (10 km/h)
          } else if (distToStop < 700) {
            targetSpeed = Math.min(targetSpeed, 110); // Platform deceleration (25 km/h)
          } else if (distToStop < 1600) {
            targetSpeed = Math.min(targetSpeed, 178); // Speed limit on turnout Switch #1 / Station Throat (40 km/h)
          }
        }

        if (consist.stationDwellTimer > 0) {
          targetSpeed = 0;
          consist.speed = 0;
          consist.stationDwellTimer -= dt;
          if (consist.stationDwellTimer <= 0) {
            consist.stationDwellTimer = -1; // Departed platform!
            sound.playTrainHorn(2.0, this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY));
          }
        }

      } else if (consist.routeType === 'mainline_west') {
        // --- 2. HEAVY FREIGHT TRAIN №2418 (ВЛ80С) ---
        // Route: Runs straight through on Mainline II (Y=8880) heading West (-X)
        // Dynamically obeys 3-aspect automatic block signals across the open steppe and station
        const signalSpeed = this.evaluateSignalsInFrontWestbound(headCar.x, signals, consist.maxSpeed, consist.trackY, headCar.length, isShunter);
        targetSpeed = Math.min(targetSpeed, signalSpeed);
      } else if (consist.routeType === 'scheduled' && consist.schedule) {
        // --- 3. CUSTOM SCHEDULED TRAIN CONSISTS ---
        const steps = consist.schedule.routeSteps || [];
        const stepIdx = consist.currentStepIndex || 0;
        const curStep = steps[stepIdx];

        if (curStep) {
          if (curStep.type === 'travel') {
            targetSpeed = (curStep.speedLimit && curStep.speedLimit > 250) ? curStep.speedLimit : consist.maxSpeed;
            const sigSpd = consist.direction === 1
              ? this.evaluateSignalsInFrontEastbound(headCar.x, signals, targetSpeed, consist.trackY, headCar.length, isShunter)
              : this.evaluateSignalsInFrontWestbound(headCar.x, signals, targetSpeed, consist.trackY, headCar.length, isShunter);
            targetSpeed = Math.min(targetSpeed, sigSpd);

            const isPast = consist.direction === 1
              ? headCar.x >= (curStep.targetX ?? 53000)
              : headCar.x <= (curStep.targetX ?? -1500);
            if (isPast && steps.length > stepIdx + 1) {
              consist.currentStepIndex = stepIdx + 1;
            }
          } else if (curStep.type === 'switch_branch') {
            targetSpeed = curStep.switchBranch === 'diverging' ? 178 : (curStep.speedLimit || consist.maxSpeed);

            // Set the target track Y immediately so getTrackState draws the smooth turnout curve
            if (curStep.targetY !== undefined && consist.trackY !== curStep.targetY) {
              consist.trackY = curStep.targetY;
            }

            // Determine target exit point of turnout switch
            // Eastbound (+X): West turnout exit = 9600, East turnout exit = 13400
            // Westbound (-X): East turnout exit = 12900, West turnout exit = 9100
            let targetX = curStep.targetX;
            if (targetX === undefined) {
              if (consist.direction === 1) {
                targetX = headCar.x < 10500 ? 9600 : 13400;
              } else {
                targetX = headCar.x > 11000 ? 12900 : 9100;
              }
            }

            const reachedTargetX = consist.direction === 1
              ? headCar.x >= targetX
              : headCar.x <= targetX;

            if (reachedTargetX && steps.length > stepIdx + 1) {
              consist.currentStepIndex = stepIdx + 1;
            }
          } else if (curStep.type === 'station_stop') {
            // Target X is the exact trackside position of the OPV sign («Остановка первого вагона» / «ОЛ»)
            const opvSignX = curStep.targetX ?? (consist.direction === 1 ? 12420 : 10180);
            // Calculate front nose position (leading cab/buffer) of the lead locomotive
            const frontNoseX = consist.direction === 1 ? headCar.x + headCar.length / 2 : headCar.x - headCar.length / 2;
            const distNoseToOPV = consist.direction === 1 ? opvSignX - frontNoseX : frontNoseX - opvSignX;
            const isApproaching = distNoseToOPV > -20;

            if (consist.stationDwellTimer === 0) {
              if (distNoseToOPV <= 25 || !isApproaching) {
                targetSpeed = 0;
                if (consist.speed < 12 || !isApproaching) {
                  consist.stationDwellTimer = curStep.dwellSeconds || 25;
                  consist.speed = 0;
                  sound.playTrainBrakeAir(this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY));
                }
              } else if (distNoseToOPV < 250) {
                targetSpeed = Math.min(targetSpeed, 20); // Creep speed pulling up to OPV sign (5-10 km/h)
              } else if (distNoseToOPV < 650) {
                targetSpeed = Math.min(targetSpeed, 45); // Smooth deceleration along platform length
              } else if (distNoseToOPV < 1400) {
                targetSpeed = Math.min(targetSpeed, 90); // Platform entry approach speed
              }
            } else if (consist.stationDwellTimer > 0) {
              targetSpeed = 0;
              consist.speed = 0;
              consist.stationDwellTimer -= dt;
              if (consist.stationDwellTimer <= 0) {
                consist.stationDwellTimer = -1;
                const distGain = this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY);
                if (headCar.type.includes('chme3') || headCar.type.includes('shunter')) {
                  sound.playTrainShuntWhistle(distGain);
                } else {
                  sound.playTrainHorn(2.0, distGain);
                }
              }
            } else {
              // Station stop finished (dwellTimer === -1). Train departs platform forward away from OPV sign!
              // Advance step once train's lead car has driven clear past OPV sign zone (180px)
              const hasDrivenPastPlatform = consist.direction === 1
                ? headCar.x >= opvSignX + 180
                : headCar.x <= opvSignX - 180;

              if (hasDrivenPastPlatform && steps.length > stepIdx + 1) {
                consist.currentStepIndex = stepIdx + 1;
              }
            }
          } else if (curStep.type === 'signal_hold') {
            const sig = signals.find(s => s.id === curStep.signalId);
            const isRed = sig && (sig.currentAspect === 'red' || sig.currentAspect === 'red_alternating' || sig.currentAspect === 'red_alternating_flashing');
            const frontNoseX = consist.direction === 1 ? headCar.x + headCar.length / 2 : headCar.x - headCar.length / 2;
            const distToSig = sig ? (consist.direction === 1 ? sig.x - frontNoseX : frontNoseX - sig.x) : 999;

            // If the train's leading wheelset has crossed the signal mast into the block, advance step immediately
            if (distToSig < -15) {
              if (steps.length > stepIdx + 1) {
                consist.currentStepIndex = stepIdx + 1;
              }
            } else if (isRed) {
              if (distToSig <= 25) {
                targetSpeed = 0;
                consist.speed = 0;
              } else if (distToSig <= 85) {
                targetSpeed = Math.min(targetSpeed, 15);
              } else if (distToSig <= 220) {
                targetSpeed = Math.min(targetSpeed, 40);
              } else {
                targetSpeed = Math.min(targetSpeed, 80);
              }
            } else {
              // Signal is clear (green, yellow, two_yellows, two_yellows_one_flashing)
              if (distToSig <= 25 && steps.length > stepIdx + 1) {
                consist.currentStepIndex = stepIdx + 1;
              }
            }
          } else if (curStep.type === 'despawn') {
            const despawnX = curStep.targetX ?? (consist.direction === 1 ? 53000 : -1500);
            const reachedDespawn = consist.direction === 1
              ? headCar.x >= despawnX
              : headCar.x <= despawnX;

            if (reachedDespawn) {
              headCar.x = consist.schedule.spawnX;
              consist.trackY = consist.schedule.spawnY;
              consist.currentStepIndex = 0;
              consist.speed = 0;
              consist.stationDwellTimer = 0;
            }
          }
        }
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

      // Snap to full clean stop when target is 0 and speed is creeping
      if (targetSpeed === 0 && consist.speed < 4) {
        consist.speed = 0;
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
      } else if (consist.routeType === 'mainline_west') {
        // Re-generate 65-70 car freight train when tail completely exits western map boundary (-2500)
        const lastCar = carMap.get(consist.carIds[consist.carIds.length - 1]);
        if (lastCar && lastCar.x < -2500) {
          // Dispatcher Headway Buffer: Ensure no other train is occupying the entry block sections on Track II (X > 32000)
          const isTrackOccupiedAtEntry = Array.from(carMap.values()).some(
            car => Math.abs(car.y - 8880) < 60 && car.x > 32000
          );

          if (!isTrackOccupiedAtEntry) {
            const newFreight = this.generateRandomHeavyFreightTrain(world, 53000);
            consist.headCarId = newFreight.headCarId;
            consist.carIds = newFreight.carIds;
            consist.speed = consist.maxSpeed;
            consist.stationDwellTimer = 0;
            break; // restart consist update loop with newly generated cars
          } else {
            consist.speed = 0; // Hold at staging until block section clears
          }
        }
      } else if (consist.routeType === 'scheduled' && consist.schedule) {
        if ((consist.direction === 1 && headCar.x > 53000) || (consist.direction === -1 && headCar.x < -1500)) {
          headCar.x = consist.schedule.spawnX;
          consist.trackY = consist.schedule.spawnY;
          consist.currentStepIndex = 0;
          consist.stationDwellTimer = 0;
        }
      }

      this.updateCarBogieKinematics(headCar, consist.routeType, consist.direction, consist.trackY);

      // 4. Per-car Coupler Kinematics with Physical Arc-Length Compensation
      const relDir = consist.direction === -1 ? 1 : -1;
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

      // 6. Sound Effects: Wheel clicks & Typhon Horns
      if (consist.speed > 15) {
        consist.lastWheelClickTime += dt;
        // Faster, rhythmic wheel clicks over turnout frogs and diamond crossings
        const isOnTurnout = (headCar.x >= 9050 && headCar.x <= 9650) || (headCar.x >= 10550 && headCar.x <= 11050) || (headCar.x >= 12850 && headCar.x <= 13450);
        const baseInterval = isOnTurnout ? 14 : 25;
        const wheelClickInterval = Math.max(0.25, baseInterval / Math.max(20, consist.speed));
        if (consist.lastWheelClickTime >= wheelClickInterval) {
          consist.lastWheelClickTime = 0;
          const distGain = this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY);
          if (distGain > 0.04) {
            sound.playTrainWheelClick(distGain * (isOnTurnout ? 1.25 : 1.0));
          }
        }
      }

      // Proactive Typhon Horn on Approach to All Railway Level Crossings
      const crossingXs = [12600, 18300, 24000, 29900, 47140, 49800];
      if ((headCar.hornTimer || 0) <= 0 && consist.speed > 20) {
        for (const cx of crossingXs) {
          const dist = (cx - headCar.x) * consist.direction;
          // Trigger when 400 to 750 px before the crossing heading towards it
          if (dist >= 400 && dist <= 750) {
            headCar.hornTimer = 22; // Cooldown between horns
            const distGain = this.calcDistanceGain(headCar.x, headCar.y, playerX, playerY);
            if (headCar.type.includes('chme3') || headCar.type.includes('shunter')) {
              sound.playTrainShuntWhistle(distGain);
            } else {
              sound.playTrainHorn(1.8, distGain);
            }
            break;
          }
        }
      }

      if (headCar.hornTimer && headCar.hornTimer > 0) {
        headCar.hornTimer -= dt;
      }

      // 7. Atmospheric Particle Visuals: Diesel Exhaust Soot & Pantograph Arcing Sparks
      if (world.particles && consist.speed > 2) {
        const isDiesel = headCar.type === 'locomotive_diesel' || headCar.type.includes('tep70') || headCar.type.includes('chme3') || headCar.type.includes('shunter');
        const isElectric = headCar.type.includes('vl80') || headCar.type.includes('electric');

        if (isDiesel && headCar.throttle > 0.1) {
          // Diesel exhaust puff from engine manifold chimney on locomotive roof
          const exhaustOffset = headCar.type.includes('chme3') ? 10 : 25;
          const exX = headCar.x - consist.direction * exhaustOffset;
          const exY = headCar.y - 2;
          if (Math.random() < (headCar.throttle > 0.8 ? 0.65 : 0.25)) {
            world.particles.push({
              x: exX + (Math.random() - 0.5) * 6,
              y: exY + (Math.random() - 0.5) * 6,
              vx: -consist.direction * (consist.speed * 0.15 + Math.random() * 10) + (Math.random() - 0.5) * 5,
              vy: -15 - Math.random() * 15,
              radius: 4 + Math.random() * 5,
              color: headCar.throttle > 0.8 ? 'rgba(30, 34, 42, 0.45)' : 'rgba(75, 85, 99, 0.3)',
              alpha: 0.55,
              life: 0,
              maxLife: 1.2 + Math.random() * 0.8,
              type: 'exhaust'
            });
          }
        } else if (isElectric) {
          // Catenary pantograph sparks under 25kV AC contact wire (more intense on turnout sections and acceleration)
          const isOnTurnout = (headCar.x >= 9050 && headCar.x <= 9650) || (headCar.x >= 12850 && headCar.x <= 13450);
          const sparkChance = isOnTurnout ? 0.18 : (headCar.throttle > 0.8 ? 0.08 : 0.02);
          if (Math.random() < sparkChance) {
            const pantoX = headCar.x + (Math.random() - 0.5) * 40;
            const pantoY = headCar.y + (Math.random() - 0.5) * 4;
            world.particles.push({
              x: pantoX,
              y: pantoY,
              vx: (Math.random() - 0.5) * 30,
              vy: (Math.random() - 0.5) * 30,
              radius: 1.5 + Math.random() * 2.5,
              color: Math.random() > 0.3 ? '#38bdf8' : '#ffffff',
              alpha: 0.9,
              life: 0,
              maxLife: 0.15 + Math.random() * 0.2,
              type: 'spark'
            });
          }
        }
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

            // Positional separation: resolve overlap without instant destruction
            if (col.depth > 0) {
              veh.x += col.normalX * (col.depth + 0.5);
              veh.y += col.normalY * (col.depth + 0.5);
            }

            // Calculate relative velocity vector along collision normal (pointing from train to vehicle)
            const trainVx = forwardX * consist.speed;
            const trainVy = forwardY * consist.speed;
            const vehVx = veh.vx || (Math.cos(veh.angle) * (veh.speed || 0));
            const vehVy = veh.vy || (Math.sin(veh.angle) * (veh.speed || 0));

            const relVx = trainVx - vehVx;
            const relVy = trainVy - vehVy;
            const normalImpactSpeed = relVx * col.normalX + relVy * col.normalY;

            // ONLY apply train impact mechanics & destruction if relative normal impact speed >= 12 px/s (~4 km/h)
            if (normalImpactSpeed >= 12) {
              // Longitudinal and Lateral displacement relative to train car center
              const dLong = dx * forwardX + dy * forwardY;
              const dLat = dx * lateralX + dy * lateralY;

              // Trigger Train Emergency Brake system on locomotive
              consist.emergencyBrake = true;
              consist.emergencyBrakeTimer = Math.max(consist.emergencyBrakeTimer || 0, 18.0);
              consist.stationDwellTimer = -1; // Cancel platform boarding timer so it acts physically

              // Multi-thousand ton kinetic momentum: train barely slows down immediately from a car impact
              consist.speed = Math.max(0, consist.speed - 0.04);

              const isFrontalPlow = isLeadLoco && dLong > (halfTL * 0.35);
              const carHalfLen = (veh.length || 60) / 2;
              const carHalfWid = (veh.width || 34) / 2;

              if (isFrontalPlow) {
                // --- FRONTAL PLOWING & DRAGGING ---
                const reqLong = halfTL + carHalfWid * 0.65;
                if (dLong < reqLong) {
                  const penLong = reqLong - dLong;
                  veh.x += forwardX * penLong;
                  veh.y += forwardY * penLong;
                }

                veh.vx = trainVelX;
                veh.vy = trainVelY;
                veh.speed = Math.max(8, consist.speed);

                const latSign = dLat >= 0 ? 1 : -1;
                const wedgeSpeed = (16 + Math.min(55, Math.abs(dLat) * 1.6)) * dt;
                veh.x += lateralX * latSign * wedgeSpeed;
                veh.y += lateralY * latSign * wedgeSpeed;
                veh.angularVelocity = (veh.angularVelocity || 0) * 0.90 + latSign * (1.8 + consist.speed * 0.02);
                veh.lateralVelocity = latSign * 30;
                veh.spinoutTimer = 4.0;
              } else {
                // --- FLANK / SIDE IMPACT & SCRAPING ---
                const outLat = dLat >= 0 ? 1 : -1;
                const reqLat = halfTW + carHalfWid;
                const penLat = reqLat - Math.abs(dLat);
                if (penLat > 0) {
                  veh.x += lateralX * outLat * (penLat + 1.2);
                  veh.y += lateralY * outLat * (penLat + 1.2);
                }

                veh.vx = (veh.vx || 0) * 0.60 + trainVelX * 0.65;
                veh.vy = (veh.vy || 0) * 0.60 + trainVelY * 0.65;
                veh.angularVelocity = (veh.angularVelocity || 0) * 0.8 + outLat * (2.5 + consist.speed * 0.03);
                veh.speed = Math.hypot(veh.vx, veh.vy);
              }

              // Apply severe deformation & wreck state only if normal impact speed >= 60 px/s (~20 km/h)
              if (normalImpactSpeed >= 60) {
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
              }

              // Deformation proportional to relative impact speed
              const contactX = veh.x - col.normalX * carHalfLen;
              const contactY = veh.y - col.normalY * carHalfWid;
              applyVehicleDamageAndDeformation(veh, contactX, contactY, normalImpactSpeed * 1.2, consist.speed, world, 250000, true);

              // Audio & Sparks
              sound.playCollision(Math.min(1.0, normalImpactSpeed / 80));
              if ((trainCar.hornTimer || 0) <= 0 && normalImpactSpeed > 40) {
                trainCar.hornTimer = 4.0;
                sound.playTrainHorn(2.5, this.calcDistanceGain(trainCar.x, trainCar.y, playerX, playerY));
              }

              if (world.particles && Math.random() < 0.85 && normalImpactSpeed > 30) {
                for (let p = 0; p < 12; p++) {
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
              }

              // Trauma to player if inside vehicle
              if (player && (player.isInVehicle && player.currentVehicleId === veh.id || veh.isPlayerControlled)) {
                applyDriverVehicleCrashTrauma(player, normalImpactSpeed * 1.5, 'сбит поездом на железнодорожном переезде', 1.0, veh);
              }
            }
          }
        }

        // 2. Collisions with Pedestrian Player on Tracks (Safe for passengers inside carriages and on platforms)
        if (player && !player.isInVehicle && !player.insideCarId && !player.isInsideBuilding) {
          const dx = player.x - trainCar.x;
          const dy = player.y - trainCar.y;
          const pDistSq = dx * dx + dy * dy;
          if (pDistSq < (halfTL + 35) * (halfTL + 35)) {
            const pCol = this.checkPointInRotatedBox(player.x, player.y, trainCar.x, trainCar.y, halfTL + 10, halfTW + 10, trainCar.angle);
            if (pCol.inside) {
              // Positional separation: gently push player outside train car body
              player.x += pCol.normalX * (pCol.depth + 1.0);
              player.y += pCol.normalY * (pCol.depth + 1.0);

              // Calculate relative normal velocity (from train towards player along collision normal)
              const trainVx = forwardX * consist.speed;
              const trainVy = forwardY * consist.speed;
              const playerVx = player.vx || 0;
              const playerVy = player.vy || 0;

              const relVx = trainVx - playerVx;
              const relVy = trainVy - playerVy;
              const normalImpactPxS = relVx * pCol.normalX + relVy * pCol.normalY;

              // ONLY apply impact trauma if train is ACTUALLY moving at significant speed (>= 22 px/s, ~8 km/h)
              // Touching or brushing against a stationary/slowly stopping train at a platform causes ZERO damage!
              if (normalImpactPxS >= 22 && consist.speed > 8) {
                const impulseMag = Math.min(220, normalImpactPxS * 0.5);
                player.vx += pCol.normalX * impulseMag + forwardX * (normalImpactPxS * 0.25);
                player.vy += pCol.normalY * impulseMag + forwardY * (normalImpactPxS * 0.25);

                const impactForce = normalImpactPxS * 1.2;
                distributeImpactDamage(player, impactForce, Math.atan2(pCol.normalY, pCol.normalX), true);
                sound.playCollision(Math.min(1.0, normalImpactPxS / 60));

                if (normalImpactPxS > 45) {
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
   * Safety Interlocking & Collision Prevention:
   * Checks for oncoming ("лоб в лоб") or ahead train consists on the same track or switch section.
   * Forces pneumatic braking to bring the train to a complete stop before a head-on impact.
   */
  private static evaluateOncomingAndAheadTrainSpeed(
    consist: TrainConsist,
    headCar: RollingStockCar,
    carMap: Map<string, RollingStockCar>
  ): number {
    let safeSpeed = consist.maxSpeed;

    for (const other of this.consists) {
      if (other.id === consist.id) continue;
      const otherHead = carMap.get(other.headCarId);
      if (!otherHead) continue;

      // Check if both trains share the same track Y or are on merging switches
      const sameTrack = Math.abs(otherHead.y - headCar.y) < 70 ||
        (Math.abs(other.trackY - consist.trackY) < 70);
      if (!sameTrack) continue;

      // Calculate relative position along track (+X direction for consist)
      const dx = (otherHead.x - headCar.x) * consist.direction;
      if (dx <= 0) continue; // Other train is behind us

      const isOncoming = other.direction !== consist.direction;

      if (isOncoming) {
        // Head-on scenario ("лоб в лоб")
        if (dx <= 120) safeSpeed = 0;
        else if (dx <= 350) safeSpeed = Math.min(safeSpeed, 10);
        else if (dx <= 700) safeSpeed = Math.min(safeSpeed, 25);
        else if (dx <= 1200) safeSpeed = Math.min(safeSpeed, 45);
      } else {
        // Moving in same direction ahead
        if (dx <= 150) safeSpeed = 0;
        else if (dx <= 400) safeSpeed = Math.min(safeSpeed, 15);
        else if (dx <= 800) safeSpeed = Math.min(safeSpeed, 35);
      }
    }

    return safeSpeed;
  }

  /**
   * Evaluate ALSN signal aspects in front of Eastbound train (track I)
   */
  private static evaluateSignalsInFrontEastbound(
    locoX: number,
    signals: RailwaySignal[],
    maxSpeed: number,
    trackY: number = 8740,
    locoLen: number = 270,
    isShunter: boolean = false
  ): number {
    // Front leading nose / leading wheelset of train:
    const frontNoseX = locoX + locoLen / 2;

    const candidateSignals = signals
      .filter(s => {
        if (!isShunter && s.type === 'shunting') return false; // Mainline trains ignore shunting dwarf signals
        const angleMatch = (s.angle === Math.PI || Math.abs(s.angle - Math.PI) < 0.2);
        // CRITICAL: Must only check signals strictly ahead of the train's leading nose/wheelset!
        // Once the front wheelset crosses the signal mast (s.x <= frontNoseX), the signal is behind the cab.
        const xMatch = s.x > frontNoseX + 2;
        const yMatch = (Math.abs(s.y - trackY) < 75 || (s.type === 'entry' && Math.abs(s.y - 8768) < 50));
        return angleMatch && xMatch && yMatch;
      })
      .sort((a, b) => a.x - b.x);

    if (candidateSignals.length === 0) return maxSpeed;

    const nextSig = candidateSignals[0];
    const distToSig = nextSig.x - frontNoseX;

    // Red or Blue aspect (Запрещающий сигнал - полная остановка строго ПЕРЕД светофором)
    if (nextSig.currentAspect === 'red' || nextSig.currentAspect === 'blue') {
      if (distToSig <= 25) return 0; // Stop with nose strictly 20-25px before signal mast
      if (distToSig <= 85) return 15;
      if (distToSig <= 220) return 40;
      if (distToSig <= 550) return 80;
      if (distToSig <= 1000) return 140;
      return maxSpeed * 0.75;
    }

    // Lunar white shunting signal (Маневровый разрешающий - не более 25 км/ч)
    if (nextSig.currentAspect === 'lunar_white' || nextSig.currentAspect === 'lunar_white_flashing') {
      return Math.min(maxSpeed, 110); // 25 km/h
    }

    // Two Yellows / Two Yellows One Flashing (-ж-ж- / -ж~ж- - отклонение по стрелочному переводу, не более 40 км/ч)
    if (nextSig.currentAspect === 'two_yellows' || nextSig.currentAspect === 'two_yellows_one_flashing') {
      if (distToSig <= 500) return 178; // 40 km/h
      if (distToSig <= 1000) return 240;
      return Math.min(maxSpeed, 280);
    }

    // Yellow / Yellow Flashing aspect (Предупредительный сигнал - следующий блок-участок занят)
    // РЖД ПТЭ: Проследование желтого огня требует снижения скорости до 40 км/ч (178 px/s).
    // Поезд снижает скорость до 40 км/ч, благодаря чему идущий впереди состав успевает уехать и освободить блок-участок.
    if (nextSig.currentAspect === 'yellow' || nextSig.currentAspect === 'yellow_flashing') {
      if (distToSig <= 250) return 90;  // 20 km/h при близком подходе к красному
      if (distToSig <= 800) return 160; // 36 km/h
      if (distToSig <= 1800) return 195; // 44 km/h
      return Math.min(maxSpeed * 0.45, 210); // Ограничение не более 47 км/ч для отставания от попутного состава
    }

    // Green aspect (Разрешающий сигнал - установленная скорость)
    return maxSpeed;
  }

  /**
   * Evaluate ALSN signal aspects in front of Westbound train (track II)
   */
  private static evaluateSignalsInFrontWestbound(
    locoX: number,
    signals: RailwaySignal[],
    maxSpeed: number,
    trackY: number = 8880,
    locoLen: number = 270,
    isShunter: boolean = false
  ): number {
    // Front leading nose / leading wheelset of westbound train:
    const frontNoseX = locoX - locoLen / 2;

    const candidateSignals = signals
      .filter(s => {
        if (!isShunter && s.type === 'shunting') return false; // Mainline trains ignore shunting dwarf signals
        const angleMatch = (s.angle === 0 || Math.abs(s.angle) < 0.2);
        // CRITICAL: Must only check signals strictly ahead of the train's leading nose/wheelset!
        // Once the front wheelset crosses the signal mast (s.x >= frontNoseX), the signal is behind the cab.
        const xMatch = s.x < frontNoseX - 2;
        const yMatch = (Math.abs(s.y - trackY) < 75 || (s.type === 'entry' && Math.abs(s.y - 8852) < 50));
        return angleMatch && xMatch && yMatch;
      })
      .sort((a, b) => b.x - a.x);

    if (candidateSignals.length === 0) return maxSpeed;

    const nextSig = candidateSignals[0];
    const distToSig = frontNoseX - nextSig.x;

    // Red or Blue aspect (Запрещающий сигнал - полная остановка строго ПЕРЕД светофором)
    if (nextSig.currentAspect === 'red' || nextSig.currentAspect === 'blue') {
      if (distToSig <= 25) return 0; // Stop with nose strictly 20-25px before signal mast
      if (distToSig <= 85) return 15;
      if (distToSig <= 220) return 40;
      if (distToSig <= 550) return 80;
      if (distToSig <= 1000) return 140;
      return maxSpeed * 0.75;
    }

    // Lunar white shunting signal (Маневровый разрешающий - не более 25 км/ч)
    if (nextSig.currentAspect === 'lunar_white' || nextSig.currentAspect === 'lunar_white_flashing') {
      return Math.min(maxSpeed, 110); // 25 km/h
    }

    // Two Yellows / Two Yellows One Flashing (-ж-ж- / -ж~ж- - отклонение по стрелочному переводу, не более 40 км/ч)
    if (nextSig.currentAspect === 'two_yellows' || nextSig.currentAspect === 'two_yellows_one_flashing') {
      if (distToSig <= 500) return 178; // 40 km/h
      if (distToSig <= 1000) return 240;
      return Math.min(maxSpeed, 280);
    }

    // Yellow / Yellow Flashing aspect (Предупредительный сигнал)
    // РЖД ПТЭ: Проследование желтого огня требует снижения скорости до 40 км/ч.
    if (nextSig.currentAspect === 'yellow' || nextSig.currentAspect === 'yellow_flashing') {
      if (distToSig <= 250) return 90;  // 20 km/h
      if (distToSig <= 800) return 160; // 36 km/h
      if (distToSig <= 1800) return 195; // 44 km/h
      return Math.min(maxSpeed * 0.45, 210); // Ограничение не более 47 км/ч
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

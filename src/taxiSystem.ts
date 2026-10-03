import { GameWorld, Player, Vector2D, Pedestrian, Vehicle } from './types';
import { calculateGpsRoute, getDistance } from './navigation';
import { depositChangeToPlayer } from './items';
import { sound } from './audio';

export interface TaxiReview {
  id: string;
  author: string;
  gender: 'male' | 'female';
  rating: number; // 1 to 5
  date: string;
  comment: string;
  farePaid: number;
  tipPaid: number;
  tags: string[];
}

export interface TaxiDriverProfile {
  isEmployed: boolean;
  isShiftActive: boolean;
  shiftStartTime: number | null;
  rating: number;
  totalRidesCompleted: number;
  totalIncome: number;
  reviews: TaxiReview[];
}

export interface TaxiLocationPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  description: string;
}

export interface TaxiOrderOffer {
  id: string;
  passengerName: string;
  passengerGender: 'male' | 'female';
  pickup: TaxiLocationPoint;
  dropoff: TaxiLocationPoint;
  estimatedDistanceMeters: number;
  baseFare: number;
  ratePerKm: number;
  estimatedFare: number;
  expiresAt: number; // timestamp
}

export type TaxiOrderStage =
  | 'driving_to_pickup'
  | 'waiting_for_passenger'
  | 'passenger_boarding'
  | 'in_transit'
  | 'passenger_alighting'
  | 'completed'
  | 'cancelled';

export interface TaxiActiveOrder {
  id: string;
  passengerName: string;
  passengerGender: 'male' | 'female';
  pickup: TaxiLocationPoint;
  dropoff: TaxiLocationPoint;
  estimatedDistanceMeters: number;
  baseFare: number;
  ratePerKm: number;
  estimatedFare: number;
  stage: TaxiOrderStage;
  passengerPedId: string;
  acceptedAt: number;
  arrivedPickupTime: number | null;
  freeWaitingSeconds: number; // e.g. 120 seconds
  waitingSeconds: number;
  paidWaitingFare: number;
  boardingTimer: number;
  tripStartTime: number | null;
  distanceDrivenMeters: number;
  lastVehicleX: number;
  lastVehicleY: number;
  comfortScore: number; // 0 to 100
  lastComfortWarnTime: number;
  passengerSpeech: string | null;
  speechTimer: number;
  finalFare: number;
  tipAmount: number;
  isPaid: boolean;
}

// Authentic City Locations across the map for taxi rides
export const TAXI_CITY_LOCATIONS: TaxiLocationPoint[] = [
  {
    id: 'loc_railway_station',
    name: 'Ж/Д Вокзал «Станция Степная»',
    x: 11120,
    y: 5640,
    description: 'Главный привокзальный комплекс и платформы РЖД'
  },
  {
    id: 'loc_real_estate',
    name: 'Агентство «ГлавНедвижимость»',
    x: 5030,
    y: 4610,
    description: 'Росреестр и оформление договоров купли-продажи'
  },
  {
    id: 'loc_car_dealership',
    name: 'Автосалон «Премиум Авто»',
    x: 252,
    y: 5600,
    description: 'Официальный шоурум и выставочная парковка'
  },
  {
    id: 'loc_central_park',
    name: 'Центральный Парк (Сквер)',
    x: 4400,
    y: 2400,
    description: 'Прогулочная аллея у фонтана и сквер'
  },
  {
    id: 'loc_downtown_plaza',
    name: 'Деловой Центр «Плаза»',
    x: 4000,
    y: 2000,
    description: 'Высотные офисы, банки и бизнес-центр'
  },
  {
    id: 'loc_residential_courtyard',
    name: 'Жилой Двор (Многоэтажки)',
    x: 2750,
    y: 2400,
    description: 'Подъезды жилого массива и дворовая стоянка'
  },
  {
    id: 'loc_industrial_hub',
    name: 'Промзона (Грузовой терминал)',
    x: 6400,
    y: 1030,
    description: 'Логистические склады и ангары'
  },
  {
    id: 'loc_pitstop_service',
    name: 'Автотехцентр «PIT-STOP»',
    x: 2400,
    y: 3500,
    description: 'Круглосуточная СТО и магазин автозапчастей'
  },
  {
    id: 'loc_hospital',
    name: 'Городская Больница №1',
    x: 4000,
    y: 2200,
    description: 'Приемный покой и травматологическое отделение'
  },
  {
    id: 'loc_supermarket_sputnik',
    name: 'Супермаркет «Спутник 24/7»',
    x: 3442,
    y: 2685,
    description: 'Торговый центр и продуктовый супермаркет'
  },
  {
    id: 'loc_furniture_comfort',
    name: 'Мебельный Центр «Комфорт»',
    x: 3650,
    y: 2955,
    description: 'Товары для дома и интерьерный молл'
  },
  {
    id: 'loc_pizzeria',
    name: 'Пиццерия «Пицца-Империя»',
    x: 3728,
    y: 2685,
    description: 'Ресторан итальянской кухни и пиццы'
  },
  {
    id: 'loc_gas_station_prime',
    name: 'АЗС «ПраймНефть»',
    x: 4300,
    y: 3300,
    description: 'Заправочный комплекс и круглосуточный минимаркет'
  },
  {
    id: 'loc_gas_station_transit',
    name: 'АЗС «Транзит-Степь»',
    x: 5160,
    y: 5160,
    description: 'Топливный терминал на выезде из города'
  },
  {
    id: 'loc_pharmacy_pulse',
    name: 'Аптека «Пульс 24»',
    x: 3950,
    y: 2150,
    description: 'Дежурная круглосуточная аптека'
  }
];

const PASSENGER_NAMES_MALE = [
  'Алексей Смирнов',
  'Дмитрий Ковалев',
  'Сергей Иванов',
  'Михаил Морозов',
  'Артем Васильев',
  'Иван Соколов',
  'Максим Попов',
  'Николай Федоров',
  'Виктор Белов',
  'Роман Кузьмин'
];

const PASSENGER_NAMES_FEMALE = [
  'Елена Кузнецова',
  'Анна Новикова',
  'Ольга Павлова',
  'Татьяна Волкова',
  'Мария Соколова',
  'Екатерина Семенова',
  'Наталья Козлова',
  'Алина Мельникова',
  'Дарья Зайцева',
  'Ирина Полякова'
];

const INITIAL_REVIEWS: TaxiReview[] = [
  {
    id: 'rev_init_1',
    author: 'Евгений Романов',
    gender: 'male',
    rating: 5,
    date: 'Вчера',
    comment: 'Отличный таксист! Машина чистая, доехали плавно без заносов и резких торможений.',
    farePaid: 320,
    tipPaid: 50,
    tags: ['Плавная езда', 'Чистый салон', 'Вежливый водитель']
  },
  {
    id: 'rev_init_2',
    author: 'Марина Крылова',
    gender: 'female',
    rating: 5,
    date: '3 дня назад',
    comment: 'Подали быстро прямо к вокзалу. Водитель помог сориентироваться по городу. Рекомендую!',
    farePaid: 450,
    tipPaid: 100,
    tags: ['Быстрая подача', 'Спокойная поездка']
  }
];

const STORAGE_KEY_TAXI_PROFILE = 'taxi_fleet_driver_profile_v1';

export class TaxiFleetSystem {
  private static instance: TaxiFleetSystem | null = null;

  public profile: TaxiDriverProfile = {
    isEmployed: true, // Started with driver status in fleet
    isShiftActive: false,
    shiftStartTime: null,
    rating: 4.95,
    totalRidesCompleted: 2,
    totalIncome: 770,
    reviews: INITIAL_REVIEWS
  };

  public pendingOffer: TaxiOrderOffer | null = null;
  public activeOrder: TaxiActiveOrder | null = null;
  public orderTimer: number = 18; // Seconds before first order when shift starts
  private isProcessingCollision: boolean = false;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): TaxiFleetSystem {
    if (!TaxiFleetSystem.instance) {
      TaxiFleetSystem.instance = new TaxiFleetSystem();
    }
    return TaxiFleetSystem.instance;
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_TAXI_PROFILE);
      if (data) {
        const parsed = JSON.parse(data);
        this.profile = {
          ...this.profile,
          ...parsed,
          // Guarantee valid reviews array
          reviews: Array.isArray(parsed.reviews) && parsed.reviews.length > 0 ? parsed.reviews : INITIAL_REVIEWS
        };
      }
    } catch (e) {
      console.warn('Failed to load taxi profile from localStorage', e);
    }
  }

  public saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_TAXI_PROFILE, JSON.stringify(this.profile));
    } catch (e) {
      console.warn('Failed to save taxi profile', e);
    }
  }

  public setEmployed(employed: boolean) {
    this.profile.isEmployed = employed;
    if (!employed && this.profile.isShiftActive) {
      this.endShift();
    }
    this.saveToStorage();
  }

  public startShift(car?: Vehicle | null): { success: boolean; reason?: string } {
    if (!this.profile.isEmployed) {
      return { success: false, reason: 'Вы не трудоустроены в таксопарк! Оформите лицензию в приложении.' };
    }

    if (car) {
      const invalidTypes = ['bus', 'fire_engine', 'fire_ladder', 'fire_rescue', 'ambulance', 'truck_semi', 'truck_tanker', 'tractor_mtz80', 'tractor_mtz82', 'garbage_truck'];
      if (invalidTypes.some(t => car.type.startsWith(t)) || car.isTrailer) {
        return { success: false, reason: 'Спецтехника, грузовики и прицепы не подходят для пассажирских перевозок!' };
      }
    }

    this.profile.isShiftActive = true;
    this.profile.shiftStartTime = Date.now();
    this.orderTimer = 8 + Math.random() * 12; // First incoming order within 8-20 seconds
    this.saveToStorage();
    return { success: true };
  }

  public endShift(): void {
    this.profile.isShiftActive = false;
    this.profile.shiftStartTime = null;
    this.pendingOffer = null;
    if (this.activeOrder && this.activeOrder.stage === 'driving_to_pickup') {
      this.cancelOrder('Смена завершена водителем');
    }
    this.saveToStorage();
  }

  // Generates a new order offer based on realistic distance and rates
  public generateOrderOffer(playerPos: Vector2D, world?: GameWorld): TaxiOrderOffer | null {
    if (TAXI_CITY_LOCATIONS.length < 2) return null;

    // Pick a pickup point that is reasonably close to player (e.g. within 600 - 3500 px)
    const sortedPickups = [...TAXI_CITY_LOCATIONS].sort((a, b) => {
      const distA = Math.hypot(a.x - playerPos.x, a.y - playerPos.y);
      const distB = Math.hypot(b.x - playerPos.x, b.y - playerPos.y);
      return distA - distB;
    });

    // Select candidate from nearest 4 locations
    const candidatePickups = sortedPickups.slice(0, Math.min(4, sortedPickups.length));
    const pickup = candidatePickups[Math.floor(Math.random() * candidatePickups.length)];

    // Dropoff location must be different
    const otherLocations = TAXI_CITY_LOCATIONS.filter(l => l.id !== pickup.id);
    const dropoff = otherLocations[Math.floor(Math.random() * otherLocations.length)];

    // Estimate route distance
    let estimatedDistance = Math.round(Math.hypot(dropoff.x - pickup.x, dropoff.y - pickup.y) * 1.35); // Road winding factor
    if (world && world.roads && world.roads.length > 0) {
      try {
        const route = calculateGpsRoute(world, pickup, dropoff, true);
        if (route && route.length > 1) {
          let totalDist = 0;
          for (let i = 0; i < route.length - 1; i++) {
            totalDist += getDistance(route[i], route[i + 1]);
          }
          if (totalDist > 100) {
            estimatedDistance = Math.round(totalDist);
          }
        }
      } catch (e) {
        // Fallback to Euclidean
      }
    }

    const isFemale = Math.random() > 0.5;
    const namePool = isFemale ? PASSENGER_NAMES_FEMALE : PASSENGER_NAMES_MALE;
    const passengerName = namePool[Math.floor(Math.random() * namePool.length)];

    const baseFare = 150; // Базовая подача
    const ratePerKm = 45; // 45 ₽ за км
    const kmDistance = Math.max(0.6, estimatedDistance / 1000);
    const estimatedFare = Math.round((baseFare + kmDistance * ratePerKm) / 10) * 10;

    const offer: TaxiOrderOffer = {
      id: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      passengerName,
      passengerGender: isFemale ? 'female' : 'male',
      pickup,
      dropoff,
      estimatedDistanceMeters: estimatedDistance,
      baseFare,
      ratePerKm,
      estimatedFare,
      expiresAt: Date.now() + 45000 // 45 seconds to accept
    };

    this.pendingOffer = offer;
    return offer;
  }

  // Accept incoming offer and spawn passenger
  public acceptOrder(world: GameWorld, playerPos: Vector2D): TaxiActiveOrder | null {
    if (!this.pendingOffer) return null;
    const offer = this.pendingOffer;
    this.pendingOffer = null;

    // Spawn passenger NPC in world at pickup point
    const pedId = `ped_taxi_${offer.id}`;
    const newPed: Pedestrian = {
      id: pedId,
      x: offer.pickup.x + (Math.random() * 20 - 10),
      y: offer.pickup.y + (Math.random() * 20 - 10),
      vx: 0,
      vy: 0,
      angle: Math.random() * Math.PI * 2,
      speed: 0,
      targetSpeed: 0,
      skinColor: ['#f8d9b6', '#e0ac69', '#f3cbb3', '#deb887'][Math.floor(Math.random() * 4)],
      shirtColor: ['#1e3a8a', '#b91c1c', '#047857', '#4b5563', '#9333ea', '#c2410c'][Math.floor(Math.random() * 6)],
      pantsColor: ['#18181b', '#1e293b', '#374151', '#292524'][Math.floor(Math.random() * 4)],
      hairColor: ['#1c1917', '#451a03', '#78350f', '#d97706'][Math.floor(Math.random() * 4)],
      walkCycle: 0,
      gender: offer.passengerGender,
      ageGroup: 'adult',
      handheldProp: Math.random() > 0.4 ? 'phone' : 'bag',
      targetPathId: null,
      targetWaypointIndex: 0,
      routeWaypoints: [],
      isCrossingRoad: false,
      waitingAtCurb: true,
      crosswalkWaitTimer: 0,
      crosswalkCooldownTimer: 0,
      state: 'waiting_taxi',
      panicTimer: 0,
      behaviorTimer: 0,
      alertBubbleText: 'Такси',
      alertBubbleTimer: 10
    };
    (newPed as any).isTaxiPassenger = true;

    // Add to world pedestrians
    world.pedestrians.push(newPed);

    const activeOrder: TaxiActiveOrder = {
      ...offer,
      stage: 'driving_to_pickup',
      passengerPedId: pedId,
      acceptedAt: Date.now(),
      arrivedPickupTime: null,
      freeWaitingSeconds: 120,
      waitingSeconds: 0,
      paidWaitingFare: 0,
      boardingTimer: 0,
      tripStartTime: null,
      distanceDrivenMeters: 0,
      lastVehicleX: playerPos.x,
      lastVehicleY: playerPos.y,
      comfortScore: 100,
      lastComfortWarnTime: 0,
      passengerSpeech: null,
      speechTimer: 0,
      finalFare: offer.estimatedFare,
      tipAmount: 0,
      isPaid: false
    };

    this.activeOrder = activeOrder;
    (world as any).taxiActiveOrder = activeOrder;
    return activeOrder;
  }

  public declineOrder(): void {
    this.pendingOffer = null;
    this.orderTimer = 15 + Math.random() * 25; // Next order in 15-40s
  }

  public cancelOrder(reason: string): void {
    if (!this.activeOrder) return;
    this.activeOrder.stage = 'cancelled';
    this.activeOrder = null;
    this.orderTimer = 25 + Math.random() * 20;
  }

  // Core simulation step called from main loop
  public update(
    dt: number,
    world: GameWorld,
    player: Player,
    onGpsDestinationUpdate: (dest: { x: number; y: number; name?: string } | null) => void,
    onNotification: (text: string, type?: 'info' | 'warning' | 'pickup') => void
  ) {
    if (!this.profile.isShiftActive) return;

    // 1. Dispatcher new order timer
    if (!this.activeOrder && !this.pendingOffer) {
      this.orderTimer -= dt;
      if (this.orderTimer <= 0) {
        const offer = this.generateOrderOffer({ x: player.x, y: player.y }, world);
        if (offer) {
          sound.playNotificationPing();
          onNotification(`Таксопарк: Заказ от ${offer.passengerName} на ${offer.pickup.name} (${offer.estimatedFare} ₽). [Таб] Телефон.`, 'info');
        }
      }
    }

    // 2. Pending offer expiration check
    if (this.pendingOffer) {
      if (Date.now() > this.pendingOffer.expiresAt) {
        this.pendingOffer = null;
        this.orderTimer = 20 + Math.random() * 25;
      }
    }

    // 3. Active order simulation
    if (!this.activeOrder) return;
    const order = this.activeOrder;

    // Decay dialogue timer
    if (order.speechTimer > 0) {
      order.speechTimer -= dt;
      if (order.speechTimer <= 0) {
        order.passengerSpeech = null;
      }
    }

    const currentVeh = player.isInVehicle && player.currentVehicleId
      ? world.vehicles.find(v => v.id === player.currentVehicleId)
      : null;

    // --- STAGE: DRIVING TO PICKUP ---
    if (order.stage === 'driving_to_pickup') {
      const distToPickup = Math.hypot(player.x - order.pickup.x, player.y - order.pickup.y);

      // Check if player has arrived near pickup spot (< 90 px and stopped/slowed down)
      const currentSpeed = currentVeh ? Math.abs(currentVeh.speed) : Math.hypot(player.vx, player.vy);
      if (distToPickup < 100 && currentSpeed < 25) {
        order.stage = 'waiting_for_passenger';
        order.arrivedPickupTime = Date.now();
        order.passengerSpeech = 'Здравствуйте! Я здесь, сейчас подойду.';
        order.speechTimer = 5;
        sound.playAlert();
        onNotification('Вы на месте подачи! Ожидайте посадки пассажира.', 'info');
      }
    }

    // --- STAGE: WAITING FOR PASSENGER ---
    else if (order.stage === 'waiting_for_passenger') {
      order.waitingSeconds += dt;

      // Paid waiting calculations (15 ₽ / min after 120s free waiting)
      if (order.waitingSeconds > order.freeWaitingSeconds) {
        const paidSeconds = order.waitingSeconds - order.freeWaitingSeconds;
        order.paidWaitingFare = Math.floor(paidSeconds * 0.25); // 15 ₽/min
      }

      // Find passenger pedestrian in world
      const ped = world.pedestrians.find(p => p.id === order.passengerPedId);
      if (ped && currentVeh) {
        // Compute passenger side door location (right side of vehicle)
        const doorAngle = currentVeh.angle + Math.PI / 2;
        const doorX = currentVeh.x + Math.cos(doorAngle) * (currentVeh.width / 2 + 16);
        const doorY = currentVeh.y + Math.sin(doorAngle) * (currentVeh.width / 2 + 16);

        const distToDoor = Math.hypot(ped.x - doorX, ped.y - doorY);
        const isCarStopped = Math.abs(currentVeh.speed) < 15;

        if (isCarStopped) {
          // Passenger walks toward car door
          const walkAngle = Math.atan2(doorY - ped.y, doorX - ped.x);
          ped.angle = walkAngle;
          ped.speed = 35;
          ped.vx = Math.cos(walkAngle) * 35;
          ped.vy = Math.sin(walkAngle) * 35;
          ped.x += ped.vx * dt;
          ped.y += ped.vy * dt;
          ped.walkCycle = (ped.walkCycle + dt * 6) % (Math.PI * 2);

          if (distToDoor < 22) {
            // Passenger opens door and boards vehicle!
            order.stage = 'passenger_boarding';
            order.boardingTimer = 1.2;
            ped.speed = 0;
            ped.vx = 0;
            ped.vy = 0;
            sound.playCarDoor();
          }
        }
      }
    }

    // --- STAGE: PASSENGER BOARDING ---
    else if (order.stage === 'passenger_boarding') {
      order.boardingTimer -= dt;
      if (order.boardingTimer <= 0) {
        order.stage = 'in_transit';
        order.tripStartTime = Date.now();
        order.lastVehicleX = player.x;
        order.lastVehicleY = player.y;

        // Hide pedestrian from outside world / seat in car
        const pedIndex = world.pedestrians.findIndex(p => p.id === order.passengerPedId);
        if (pedIndex !== -1) {
          world.pedestrians.splice(pedIndex, 1);
        }

        if (currentVeh) {
          (currentVeh as any).passengers = 1;
          (currentVeh as any).hasTaxiPassenger = true;
          (currentVeh as any).taxiPassengerName = order.passengerName;
        }

        // Auto-switch navigation to dropoff destination!
        onGpsDestinationUpdate({
          x: order.dropoff.x,
          y: order.dropoff.y,
          name: `Заказ: ${order.dropoff.name}`
        });

        order.passengerSpeech = `Поехали на ${order.dropoff.name}, пожалуйста.`;
        order.speechTimer = 6;
        sound.playAlert();
        onNotification(`Пассажир сел в машину. Следуйте по навигатору: ${order.dropoff.name}`, 'pickup');
      }
    }

    // --- STAGE: IN TRANSIT TO DROPOFF ---
    else if (order.stage === 'in_transit') {
      // Accumulate physical driving distance
      const frameDist = Math.hypot(player.x - order.lastVehicleX, player.y - order.lastVehicleY);
      // Filter out teleports or respawns
      if (frameDist > 0.05 && frameDist < 80) {
        order.distanceDrivenMeters += frameDist;
      }
      order.lastVehicleX = player.x;
      order.lastVehicleY = player.y;

      // Realism & Comfort monitoring
      if (currentVeh) {
        const speedKmh = Math.abs(currentVeh.speed) * 0.36; // rough km/h

        // High-speed reckless drift check
        if (currentVeh.isDrifting && speedKmh > 40) {
          order.comfortScore = Math.max(10, order.comfortScore - dt * 4);
          if (Date.now() - order.lastComfortWarnTime > 6000) {
            order.lastComfortWarnTime = Date.now();
            order.passengerSpeech = 'Ой-ой! Не заносите машину так резко, пожалуйста!';
            order.speechTimer = 4;
            sound.playAlert();
          }
        }

        // Severe damage collision detection
        const dmg = currentVeh.damage;
        if (dmg && (dmg.frontCrumple > 3 || dmg.leftDent > 3 || dmg.rightDent > 3)) {
          if (!this.isProcessingCollision) {
            this.isProcessingCollision = true;
            order.comfortScore = Math.max(10, order.comfortScore - 20);
            order.passengerSpeech = 'Осторожно! Мы чуть не разбились!';
            order.speechTimer = 5;
            sound.playCollision(0.8);
          }
        } else {
          this.isProcessingCollision = false;
        }

        // Excessive speed in city
        if (speedKmh > 110 && Date.now() - order.lastComfortWarnTime > 8000) {
          order.lastComfortWarnTime = Date.now();
          order.comfortScore = Math.max(20, order.comfortScore - 8);
          order.passengerSpeech = 'Сбавьте скорость! Это слишком быстро!';
          order.speechTimer = 4;
        }

        // Check arrival at dropoff
        const distToDropoff = Math.hypot(player.x - order.dropoff.x, player.y - order.dropoff.y);
        const isStopped = Math.abs(currentVeh.speed) < 8;

        if (distToDropoff < 85 && isStopped) {
          this.completeRide(world, player, currentVeh, onGpsDestinationUpdate, onNotification);
        }
      }
    }
  }

  // Ride completion: cash in hand, door sounds, review generation
  public completeRide(
    world: GameWorld,
    player: Player,
    currentVeh: Vehicle | null,
    onGpsDestinationUpdate: (dest: { x: number; y: number; name?: string } | null) => void,
    onNotification: (text: string, type?: 'info' | 'warning' | 'pickup') => void
  ) {
    if (!this.activeOrder) return;
    const order = this.activeOrder;
    order.stage = 'completed';

    // Calculate realistic final fare: Base + Distance + Paid Waiting
    const actualKm = Math.max(0.5, order.distanceDrivenMeters / 1000);
    const distanceFare = Math.round(actualKm * order.ratePerKm);
    const totalFare = Math.round((order.baseFare + distanceFare + order.paidWaitingFare) / 10) * 10;

    // Tip based on comfort
    let tip = 0;
    if (order.comfortScore >= 90) {
      tip = 100;
    } else if (order.comfortScore >= 75) {
      tip = 50;
    }

    const totalCashPaid = totalFare + tip;
    order.finalFare = totalFare;
    order.tipAmount = tip;
    order.isPaid = true;

    // 1. Physical cash in hand/wallet
    depositChangeToPlayer(player, totalCashPaid);

    // Audio & sensory feedback
    sound.playCarDoor();
    sound.playBuySell();
    sound.playPaperRustle();

    // 2. Generate Review for Driver App
    let stars = 5;
    let comment = 'Отличная поездка! Быстро, комфортно и вежливо.';
    const tags: string[] = [];

    if (order.comfortScore >= 85) {
      stars = 5;
      tags.push('Плавная езда', 'Комфорт', 'Чистый салон');
      const positiveComments = [
        'Очень приятная поездка, водитель ехал аккуратно и спокойно.',
        'Доехали быстро и без нервов. Пять звезд!',
        'Отличный шофер, не лихачит и соблюдает правила.'
      ];
      comment = positiveComments[Math.floor(Math.random() * positiveComments.length)];
    } else if (order.comfortScore >= 60) {
      stars = 4;
      tags.push('Хорошая скорость', 'Небольшая тряска');
      comment = 'В целом нормально, но на поворотах пару раз занесло.';
    } else if (order.comfortScore >= 40) {
      stars = 3;
      tags.push('Резкое торможение');
      comment = 'Водитель сильно торопился, пару раз резко тормозил.';
    } else {
      stars = 2;
      tags.push('Опасное вождение', 'Агрессивная езда');
      comment = 'Очень грубая и опасная езда, чуть не попали в ДТП!';
    }

    const newReview: TaxiReview = {
      id: `rev_${Date.now()}`,
      author: order.passengerName,
      gender: order.passengerGender,
      rating: stars,
      date: 'Только что',
      comment,
      farePaid: totalFare,
      tipPaid: tip,
      tags
    };

    // Update profile
    this.profile.reviews.unshift(newReview);
    this.profile.totalRidesCompleted += 1;
    this.profile.totalIncome += totalCashPaid;

    // Recompute weighted rating
    const sumRatings = this.profile.reviews.reduce((acc, r) => acc + r.rating, 0);
    this.profile.rating = Number((sumRatings / this.profile.reviews.length).toFixed(2));
    this.saveToStorage();

    // 3. Spawn walking passenger out of vehicle
    if (currentVeh) {
      (currentVeh as any).passengers = 0;
      (currentVeh as any).hasTaxiPassenger = false;

      const doorAngle = currentVeh.angle + Math.PI / 2;
      const spawnX = currentVeh.x + Math.cos(doorAngle) * (currentVeh.width / 2 + 18);
      const spawnY = currentVeh.y + Math.sin(doorAngle) * (currentVeh.width / 2 + 18);

      const walkingPed: Pedestrian = {
        id: `ped_exited_${Date.now()}`,
        x: spawnX,
        y: spawnY,
        vx: Math.cos(doorAngle) * 30,
        vy: Math.sin(doorAngle) * 30,
        angle: doorAngle,
        speed: 30,
        targetSpeed: 30,
        skinColor: '#f8d9b6',
        shirtColor: '#1e3a8a',
        pantsColor: '#18181b',
        hairColor: '#1c1917',
        walkCycle: 0,
        gender: order.passengerGender,
        targetPathId: null,
        targetWaypointIndex: 0,
        routeWaypoints: [],
        isCrossingRoad: false,
        waitingAtCurb: false,
        crosswalkWaitTimer: 0,
        crosswalkCooldownTimer: 0,
        state: 'walking',
        panicTimer: 0,
        behaviorTimer: 0,
        alertBubbleText: 'Спасибо!',
        alertBubbleTimer: 5
      };
      world.pedestrians.push(walkingPed);
    }

    // Clear GPS Route
    onGpsDestinationUpdate(null);

    // Notification toast
    onNotification(
      `Поездка завершена! Получено наличными: ${totalCashPaid} ₽ (тариф: ${totalFare} ₽${tip > 0 ? `, чаевые: ${tip} ₽` : ''}). Отзыв: ${stars} звезд.`,
      'pickup'
    );

    // Reset active order and set timer for next order
    this.activeOrder = null;
    (world as any).taxiActiveOrder = null;
    this.orderTimer = 20 + Math.random() * 30; // Next order in 20-50 seconds
  }
}

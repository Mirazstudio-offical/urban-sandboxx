export type TimeOfDay = 'morning' | 'day' | 'sunset' | 'night';
export type WeatherType = 'clear' | 'rain' | 'fog' | 'storm';

export interface Vector2D {
  x: number;
  y: number;
}

export type CarType = 
  | 'sedan' 
  | 'hatchback' 
  | 'pickup' 
  | 'sports' 
  | 'suv' 
  | 'taxi' 
  | 'police' 
  | 'fire_engine' 
  | 'fire_ladder'
  | 'fire_rescue'
  | 'bus' 
  | 'bus_minibus'
  | 'van' 
  | 'muscle' 
  | 'ambulance'
  | 'ambulance_van'
  | 'ambulance_suv'
  | 'truck_box'
  | 'truck_dump'
  | 'truck_tanker'
  | 'truck_water'
  | 'truck_flatbed'
  | 'cement_mixer'
  | 'garbage_truck'
  | 'wagon_classic'
  | 'wagon_modern'
  | 'wagon_allroad'
  | 'sedan_classic'
  | 'sedan_luxury'
  | 'sedan_compact'
  | 'hatch_hot'
  | 'micro_car'
  | 'classic_compact'
  | 'retro_bubble'
  | 'suv_luxury'
  | 'offroad_hardcore'
  | 'crossover_compact'
  | 'suv_classic_box'
  | 'supercar'
  | 'muscle_classic'
  | 'coupe_gt'
  | 'pickup_heavy'
  | 'van_camper'
  | 'van_cargo_old'
  | 'truck_tow'
  | 'truck_armored'
  | 'delivery_truck'
  | 'tractor_mtz82'
  | 'tractor_mtz80'
  | 'tractor_mtz80_old'
  | 'moto_izh_jupiter'
  | 'moto_ural_sidecar'
  | 'moto_jawa350'
  | 'moto_sport'
  | 'moto_chopper'
  | 'moped_soviet'
  | 'trailer_barrel'
  | 'trailer_flatbed_2axle';

export interface CarConfig {
  type: CarType;
  width: number;
  length: number;
  wheelBase: number;
  mass: number;
  maxSpeed: number;      // px/s (~100 px/s = 36 km/h)
  reverseMaxSpeed: number;
  acceleration: number;  // px/s^2
  brakingForce: number;  // px/s^2
  friction: number;
  turnSpeed: number;     // rad/s steering response speed
  maxSteerAngle: number; // max steering angle at low speed (rad)
  minSteerAngle: number; // minimum steering angle limit at top speed (rad)
  grip: number;          // lateral tire grip factor
  driftGrip: number;     // lateral tire grip when drifting / handbraking
  name: string;
  transmission?: 'AUTO' | 'MANUAL';
}

export interface DeformVertex {
  localX: number;
  localY: number;
  offsetX: number;
  offsetY: number;

  // Realistic Softbody Physics properties
  targetOffsetX?: number;  // Target plastic crumple offset X (progressive multi-frame crumple)
  targetOffsetY?: number;  // Target plastic crumple offset Y
  plasticStrain?: number;  // 0.0 to 1.0+ accumulated plastic deformation severity (metal yielding)
  elasticX?: number;       // Transient elastic jiggle displacement X (decays rapidly on impact)
  elasticY?: number;       // Transient elastic jiggle displacement Y (decays rapidly on impact)
  velX?: number;           // Transient elastic velocity X
  velY?: number;           // Transient elastic velocity Y
  structuralType?: 'bumper' | 'fender' | 'door' | 'quarter' | 'pillar' | 'hood';
}

export interface ScratchMark {
  x: number; // Local car coordinate X (-halfL to +halfL)
  y: number; // Local car coordinate Y (-halfW to +halfW)
  length: number;
  angle: number;
  depth: number;
}

export interface EngineState {
  radiatorWater: number;        // 0 to 100 (coolant level)
  radiatorPunctured: boolean;   // if punctured, coolant leaks out
  oilLevel: number;             // 0 to 100 (engine oil)
  oilPunctured: boolean;        // if oil pan/filter punctured, oil leaks out
  oilPressure: number;          // 0 to 100
  batteryCharge: number;        // 0 to 100
  starterWorking: boolean;      // starter motor state
  temperature: number;          // Engine temperature in °C (normal ~85-90°C)
  engineRunning: boolean;       // whether engine is currently running
  engineKnocking: boolean;      // knock/detonation due to low oil or bad fuel
  engineStalled: boolean;       // engine stalled
  overheatingSteam: boolean;    // thick white steam pouring out from radiator
  
  // Powertrain & Transmission
  engineRPM: number;
  transmissionType: 'MANUAL' | 'AUTO';
  autoGearMode?: 'P' | 'R' | 'N' | 'D';
  currentGear: number;
  gearRatios: number[];
  finalDriveRatio: number;
  clutchPedal: number;
  isStalled: boolean;
  shiftCooldown?: number;
  revLimiterTimer?: number;
  starterOverloadCount?: number;

  // Mechanical Integrity & Damage States
  engineHealth: number;         // 0 to 100 (%) health of engine block, pistons, head gasket
  isSeized: boolean;            // engine seized from impact or overheating/oil starvation (will not run or crank)
  transmissionHealth: number;   // 0 to 100 (%) gearbox health
  transmissionJammed: boolean;  // gearbox jammed from impact or stripped gears (cannot shift, gear stuck)

  // Interactive Under-Hood Engine Bay States
  hoodOpen?: boolean;
  batteryInstalled?: boolean;        // default true
  batteryPosConnected?: boolean;     // default true (+)
  batteryNegConnected?: boolean;     // default true (-)
  radiatorCapOpen?: boolean;         // default false
  oilCapOpen?: boolean;              // default false
  dipstickPulled?: boolean;          // default false
}

export type FuelType = 'ai92' | 'ai95' | 'ai98' | 'ai100' | 'diesel' | 'lpg';

export interface GasPumpNozzle {
  fuelType: FuelType;
  nameRu: string;
  color: string;
  octane: number;
  pricePerLiter: number;
  description: string;
  badgeText: string;
}

export interface GasPumpDispenser {
  id: string;
  pumpNumber: number;
  islandIndex?: number;
  x: number;
  y: number;
  angle: number;
  nozzles: GasPumpNozzle[];
  nozzleTaken: FuelType | null;
  connectedVehicleId: string | null;
  connectedFuelType: FuelType | null;
  isPumping: boolean;
  targetLiters: number;
  currentPumpedLiters: number;
  pricePerLiter: number;
  totalPaid: number;
  status: 'idle' | 'nozzle_held' | 'inserted' | 'pumping' | 'completed';
  pumpingTimer?: number;
  displayLiters?: number;
  displayCost?: number;
  hoseOrigin: { x: number; y: number };
}

export interface FuelSystem {
  fuelType: FuelType;
  tankLevel: number;            // 0 to 100 (%)
  tankCapacity: number;         // Liters (e.g. 50L)
  tankPunctured: boolean;       // fuel leaking on ground
  fuelQuality: number;          // 0 to 100 (100 = clean, <50 = bad quality/diluted)
  detonation: boolean;          // engine knocking/detonation from bad fuel
  octaneNumber: number;
  engineFuelLeaked?: number;    // amount leaked from engine in liters (max 0.5-1.0L)
  fuelRailBroken?: boolean;     // fuel line/rail broken in frontal crash
}

export type StoredLiquidType = 
  | 'water' 
  | 'fuel_ai95' 
  | 'fuel_ai92' 
  | 'fuel_ai98' 
  | 'fuel_ai100' 
  | 'diesel' 
  | 'oil' 
  | 'coolant';

export interface HoseLeakPoint {
  segmentIndex: number; // which segment node has the puncture
  flowIntensity: number; // 0..1 leak squirt power
}

export interface HoseSegmentNode {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
}

export interface HeldWaterHose {
  vehicleId: string;
  sourceType: 'truck_water' | 'trailer_barrel';
  maxLength: number;            // max physical uncoiled length in pixels (e.g. 250 px, ~16m)
  segments: HoseSegmentNode[];   // Verlet physical nodes
  segmentLength: number;         // distance constraint per segment
  leaks: HoseLeakPoint[];        // micro-holes along the hose that drip/squirt
  isSpraying: boolean;           // actively shooting water stream
  isPressurized?: boolean;       // true if high pressure pump running (e.g. truck engine on), false if natural gravity trickle
  sprayCooldown?: number;        // audio / particle timer
}

export interface FluidStorageTank {
  capacity: number;              // Maximum volume in liters (L)
  currentVolume: number;         // Current volume in liters (L)
  currentAmount?: number;        // Backward compatibility alias (prevents NaN)
  liquidType: StoredLiquidType;  // Stored liquid type
  isHermetic: boolean;           // True for fuel tanker (airtight), false for water truck / barrel trailer (leaky)
  leakProbabilityPerSec?: number;// Chance to drip per second during idle/slow motion
  dripRatePerSec?: number;       // Drip flow rate in L/s when leaking
  isPunctured?: boolean;         // Ruptured / pierced tank from heavy damage
  punctureRatePerSec?: number;   // Rapid leak rate in L/s when punctured
  drainValveOpen?: boolean;      // Drain valve opened (spilling to ground)
  idleLeakTimer?: number;        // Timer accumulator for drip timings
  _lastLeakAnchor?: { x: number; y: number } | null;
  hasWaterHose?: boolean;        // Vehicle is equipped with water hose reel or discharge spigot
  isWaterHoseDeployed?: boolean; // Hose is currently taken off the reel/bracket
}

export interface VehicleDamage {
  // Localized deformation depth in pixels
  frontCrumple: number;     // 0 to 15 px (hood & front bumper crushed inward)
  rearCrumple: number;      // 0 to 12 px (trunk & rear bumper crushed inward)
  leftDent: number;         // 0 to 8 px (driver door/panel pressed inward)
  rightDent: number;        // 0 to 8 px (passenger door/panel pressed inward)
  frontLeftDent: number;    // 0 to 10 px
  frontRightDent: number;   // 0 to 10 px
  rearLeftDent: number;     // 0 to 8 px
  rearRightDent: number;    // 0 to 8 px

  // Suspension & Steering damage
  frontLeftSuspensionDamage: number;  // 0 to 1
  frontRightSuspensionDamage: number; // 0 to 1
  rearLeftSuspensionDamage: number;   // 0 to 1
  rearRightSuspensionDamage: number;  // 0 to 1
  steeringDrift: number;              // -1 (pulls strongly left) to +1 (pulls right)
  wheelRubResistance: number;         // extra rolling resistance from metal pressed to tire

  // Structural and visual components
  hoodBuckled: boolean;
  windshieldCracked: boolean;
  rearGlassCracked: boolean;
  leftHeadlightBroken: boolean;
  rightHeadlightBroken: boolean;
  leftTaillightBroken: boolean;
  rightTaillightBroken: boolean;

  // Scraped paint & scratches
  scratches: ScratchMark[];
  
  // Engine smoke and fire states
  engineSmoking?: boolean;
  underHoodSmolder?: boolean;   // Phase 1: smoldering under hood, grey smoke only
  underHoodSteam?: 'thin' | 'dense' | 'geyser' | 'none'; // Custom detailed steam types
  underHoodSmoke?: 'none' | 'oil_blue' | 'oil_gray_wiring_black'; // Custom detailed smoke types
  engineFire?: boolean;         // Open flame in engine bay (frontal collision fire)
  fuelTankFire?: boolean;       // Open flame in rear / fuel tank / undercarriage (rear/fuel tank hit)
  cabinFire?: boolean;          // Fire breaks into passenger cabin
  fireOrigin?: 'front' | 'rear';// Origin point of the fire ('front' = engine bay, 'rear' = fuel tank/puddle)
  fireProgress?: number;        // 0.0 to 1.0 (fire spreading across vehicle)
  fireIntensity?: number;       // 0.0 to 1.0
  fireTimer?: number;           // Seconds elapsed since fire ignition/smoldering
  groundPuddleIgnited?: boolean;// Fire transferred to fuel puddle under vehicle
  fuelTankBurntThrough?: boolean;// Fuel tank melted/ruptured from fire, dumping fuel onto ground
  isFullyBurnt?: boolean;       // vehicle completely scorched/burnt out

  // Dynamic 3D/2D mesh vertices for organic deformation
  deformedVertices?: DeformVertex[];

  // Realistic Softbody Frame Alignment & Visual Mechanics
  frameBentAngle?: number;    // Frame twist angle drift (radians) from asymmetric impact
  hoodRaisedAmount?: number;  // 0.0 to 1.0 buckled 2.5D hood height for rendering fold shadows
  bumperSagLeft?: number;     // 0.0 to 1.0 sagging front-left bumper corner
  bumperSagRight?: number;    // 0.0 to 1.0 sagging front-right bumper corner
}

export interface Vehicle {
  id: string;
  type: CarType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;           // Heading angle in radians (0 = East, PI/2 = South)
  steerAngle: number;      // Current wheel turn angle
  targetSteerAngle: number;// Target wheel angle from user/AI
  speed: number;           // Scalar velocity in forward direction (px/s)
  lateralVelocity: number; // Sideways slip velocity
  angularVelocity: number; // Yaw rate
  isDrifting: boolean;
  driftFactor: number;
  mass: number;
  
  // Ownership & Security
  ownerId?: string;
  isLocked?: boolean;

  // Physical dimensions & config
  width: number;
  length: number;
  wheelBase: number;
  color: string;
  roofColor: string;
  headlightsOn: boolean;
  headlightMode: 'off' | 'low' | 'high';
  brakeLightsOn: boolean;
  isReversing?: boolean;
  turnSignal: 'none' | 'left' | 'right' | 'hazard';
  turnSignalTimer: number;

  // Modular Physics, Engine & Fuel Systems
  requiredFuel: 'ai92' | 'ai95' | 'diesel';
  hasGBO?: boolean;
  engineState?: EngineState;
  fuelSystem?: FuelSystem;
  fluidTank?: FluidStorageTank;

  // Damage & Deformation
  damage: VehicleDamage;
  lastDamageTime?: number;

  // Physical Knockback Impulse & Physics State
  knockbackVx?: number;
  knockbackVy?: number;
  knockbackSpin?: number;
  stunnedTimer?: number;

  // Progressive Softbody Impact Cushioning (multi-frame crumple zone dynamics)
  activeCrumple?: {
    timer: number;            // seconds remaining in crumple phase
    totalDuration: number;    // total duration of deceleration/absorption phase
    normalX: number;          // impact collision normal X
    normalY: number;          // impact collision normal Y
    initialSpeed: number;     // speed at impact onset
    reboundSpeed: number;     // gentle restitution bounce speed
    contactX: number;
    contactY: number;
  };

  // AI & State
  isPlayerControlled: boolean;
  isParked: boolean;
  targetSpeed: number;
  currentLaneId: string | null;
  targetWaypointIndex: number;
  routeWaypoints: Vector2D[];
  aiState: 'driving' | 'stopping_light' | 'in_intersection' | 'stopping_obstacle' | 'yielding' | 'waiting' | 'reversing' | 'parked';
  reverseTimer?: number;
  recoverySteer?: number;
  recoveryTargetAngle?: number;
  inIntersection: boolean;
  plannedTurn: 'straight' | 'left' | 'right';
  recentTurns?: ('straight' | 'left' | 'right' | 'turnaround')[];
  justTurnedAround?: boolean;
  visitedIntersections?: { id: string; time: number }[];
  ghostingAlpha?: number;
  driverExitedForFire?: boolean;
  fireExtinguisherDriverId?: string;
  currentConnection?: {
    targetLaneId: string;
    turnType: 'straight' | 'left' | 'right' | 'turnaround';
    pathWaypoints: Vector2D[];
    intersectionId?: string;
    stopLineDirection?: 'north' | 'south' | 'east' | 'west';
  } | null;
  stuckTimer: number;
  honkTimer: number;
  hasHeadOnConflict?: boolean;
  idmAcceleration?: number;
  intersectionWaitTimer?: number;
  intersectionReservationId?: string | null;

  // Horn & Siren
  isHonking: boolean;
  hornEffectTimer: number;

  // Emergency & Wipers
  sirenOn?: boolean;
  sirenStrobe?: number;
  emergencyState?: 'chase' | 'patrol' | 'responding' | 'yielding';
  targetChaseVehicleId?: string | null;
  wiperAngle?: number;
  wiperDir?: number;
  wipersOn?: boolean;
  heaterMode?: 'off' | 'low' | 'med' | 'high';
  heaterTemp?: number;
  engineTemp?: number;
  windowOpen?: boolean;
  cabinHumidity?: number;
  fogLevel?: number; // 0.0 (clear) to 1.0 (completely fogged)
  windshieldRainLevel?: number;
  cabinSmoke?: number; // 0 to 100% toxic smoke concentration inside vehicle cabin
  externalHeatTimer?: number; // continuous seconds exposed to adjacent fire torch (< 1.5m)
  adjacentFireSourceId?: string | null;

  // Gas Station & Fueling connection
  fuelingState?: {
    pumpId: string;
    fuelType: FuelType;
    nozzleInTank: boolean;
    hoseOrigin: { x: number; y: number };
  } | null;

  // Trailer & Towing Hitch System
  isTrailer?: boolean;
  trailerId?: string | null;        // ID of hitched trailer behind this vehicle
  towedById?: string | null;        // ID of vehicle towing this trailer
  trailerDollyAngle?: number;       // For 2-axle steerable turntable dolly (e.g. 2-PTS-4)
  trailerDollyX?: number;           // For 2-axle dolly x coordinate to decouple physics feedback
  trailerDollyY?: number;           // For 2-axle dolly y coordinate to decouple physics feedback
  trailerRearX?: number;            // For 2-axle trailer rear axle x coordinate (tractrix stabilization)
  trailerRearY?: number;            // For 2-axle trailer rear axle y coordinate (tractrix stabilization)
  drawbarLength?: number;          // Rigid tongue/drawbar length (px)
  hitchOffset?: number;            // Local X offset to rear tow hitch ball/clevis (typically -halfL - 2)
  couplerOffset?: number;          // Local X offset to front hitch loop
  trailerType?: 'single_axle_drawbar' | 'turntable_dolly_2axle';
}

export interface Pedestrian {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  targetSpeed: number;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hairColor: string;
  walkCycle: number;
  
  gender?: 'male' | 'female';
  ageGroup?: 'child' | 'adult' | 'elderly';
  clothingType?: 'tshirt' | 'button_shirt' | 'open_jacket' | 'hoodie' | 'dress' | 'suit' | 'vest';
  jacketColor?: string;
  innerShirtColor?: string;
  hairStyle?: 'short' | 'long' | 'bald' | 'bun' | 'spiky' | 'ponytail' | 'curly' | 'afro';
  hasHat?: boolean;
  hatColor?: string;
  hatType?: 'cap' | 'beanie' | 'sunhat' | 'fedora';
  hasGlasses?: boolean;
  hasHeadphones?: boolean;
  
  // Handheld props
  handheldProp?: 'phone' | 'coffee' | 'bag' | 'box' | 'extinguisher' | null;
  propColor?: string;
  hasDroppedProp?: boolean;
  extinguisherCharges?: number;
  
  // Pedestrian Type & Equipment
  isCyclist?: boolean;
  isScooter?: boolean;
  hasDog?: boolean;
  hasUmbrella?: boolean;
  umbrellaColor?: string;
  
  // Navigation
  targetPathId: string | null;
  targetWaypointIndex: number;
  routeWaypoints: Vector2D[];
  isCrossingRoad: boolean;
  waitingAtCurb: boolean;
  crosswalkWaitTimer: number;
  crosswalkCooldownTimer: number;
  targetCrosswalkId?: string | null;
  
  // State & Panic
  state: 'walking' | 'waiting_light' | 'waiting_traffic' | 'crossing' | 'panicking' | 'waiting_taxi' | 'entering_building' | 'exiting_building' | 'idle_phone' | 'idle_window' | 'greeting' | 'extinguishing_fire';
  panicTimer: number;
  behaviorTimer: number; // For idle states
  alertBubbleText: string | null;
  alertBubbleTimer: number;

  // Social & Variety
  isChild?: boolean;
  isJanitor?: boolean;
  hasBroom?: boolean;
  stuckTimer?: number;
  socialTargetId?: string | null;
  greetedIds?: string[];
  groupId?: string; // Grouping ID for families walking together
  hasBackpack?: boolean;
  backpackColor?: string;

  // Building Entry/Exit Simulation
  isInsideBuilding?: boolean;
  insideBuildingTimer?: number;
  insideBuildingId?: string;
  enteringBuildingTimer?: number;
  exitingBuildingTimer?: number;
}

export interface TrafficLightPhase {
  nsState: 'green' | 'green_flashing' | 'yellow' | 'red' | 'red_yellow';
  ewState: 'green' | 'green_flashing' | 'yellow' | 'red' | 'red_yellow';
  duration: number; // seconds
}

export interface Intersection {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: '4way' | '3way_T_north' | '3way_T_south' | '3way_T_east' | '3way_T_west';
  
  // Traffic light controller
  hasLights: boolean;
  currentPhaseIndex: number;
  phaseTimer: number;
  phases: TrafficLightPhase[];
  
  // Stop lines
  stopLines: {
    direction: 'north' | 'south' | 'east' | 'west';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    lightState: 'green' | 'green_flashing' | 'yellow' | 'red' | 'red_yellow' | 'off';
  }[];

  // Crosswalks
  crosswalks: {
    id: string;
    direction: 'north' | 'south' | 'east' | 'west';
    x: number;
    y: number;
    width: number;
    height: number;
    pedestrianSignal: 'walk' | 'wait';
  }[];
  isSignalLost?: boolean;
  isDirt?: boolean;
  isGravel?: boolean;
}

export interface RoadSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lanes: number;          // Total lanes (e.g. 2 or 4)
  width: number;
  isAvenue: boolean;
  isDirt?: boolean;
  isGravel?: boolean;
  isRoundabout?: boolean;
  direction: 'horizontal' | 'vertical';
  name: string;
  lanePaths: {
    laneId: string;
    laneIndex: number;    // 0 = rightmost, 1 = inner, etc.
    direction: number;    // Angle (0 for East, PI for West, PI/2 for South, -PI/2 for North)
    waypoints: Vector2D[];
    connections?: {
      targetLaneId: string;
      turnType: 'straight' | 'left' | 'right' | 'turnaround';
      pathWaypoints: Vector2D[];
      intersectionId?: string;
      stopLineDirection?: 'north' | 'south' | 'east' | 'west';
    }[];
  }[];
}

export interface BuildingEntrance {
  side: 'north' | 'south' | 'east' | 'west';
  offsetRatio: number; // relative position along wall (0 to 1)
  number?: number; // e.g. Подъезд №1, 2...
  hasCanopyLight?: boolean;
}

export interface BuildingBalcony {
  side: 'north' | 'south' | 'east' | 'west';
  offset: number; // relative coordinate along the side (0 to 1)
  length: number;
  depth: number;
  isGlazed?: boolean; // застекленный балкон
  floorsCount?: number;
}

export interface Building {
  id: string;
  name?: string;
  nameRu?: string;
  shopBrand?: 
    | 'pyaterochka' 
    | 'perekrestok'
    | 'pharmacy_36_6' 
    | 'cofix_bakery' 
    | 'bean_bistro' 
    | 'dodo_pizza'
    | 'vkusno_tochka'
    | 'mvideo'
    | 'sportmaster'
    | 'splav_gear' 
    | 'pitstop_service'
    | 'gas_station_shop';
  x: number;
  y: number;
  width: number;
  height: number;
  type: 
    | 'office' 
    | 'residential' 
    | 'panel_apartment'
    | 'brick_residential'
    | 'modern_residential'
    | 'shop' 
    | 'shopping_mall'
    | 'commercial' 
    | 'business_center'
    | 'school_kindergarten'
    | 'suburban' 
    | 'industrial' 
    | 'park_monument' 
    | 'police_station' 
    | 'fire_station' 
    | 'hospital'
    | 'sports_stadium'
    | 'transit_hub'
    | 'cultural_center'
    | 'car_dealership'
    | 'tactical_store'
    | 'auto_service_center'
    | 'car_wash_station'
    | 'pharmacy_store'
    | 'supermarket_store'
    | 'bakery_cafe'
    | 'coffee_bistro'
    | 'electronics_store'
    | 'sports_store'
    | 'fast_food_restaurant'
    | 'pizzeria_restaurant'
    | 'commercial_gallery'
    | 'gas_station_shop'
    | 'gas_station_canopy'
    | 'gas_station_island';
  color: string;
  roofColor: string;
  accentColor: string;
  entranceSide?: 'north' | 'south' | 'east' | 'west';
  entrances?: BuildingEntrance[];
  balconies?: BuildingBalcony[];
  fireEscapes?: {
    side: 'north' | 'south' | 'east' | 'west';
    offset: number; // relative coordinate along the side
    length: number;
    depth: number;
  }[];
  roofDetails: {
    type: 'ac' | 'helipad' | 'antenna' | 'skylight' | 'pool' | 'solar';
    rx: number; // relative x (0 to 1)
    ry: number; // relative y (0 to 1)
    rw: number;
    rh: number;
  }[];
  windows: {
    x: number;
    y: number;
    lit: boolean;
  }[];
  floorsCount?: number;
  interiors?: Record<number, any>;
}

export interface ParkingSpot {
  id?: string;
  x: number;
  y: number;
  angle: number;
  width?: number;
  length?: number;
  openSide?: 'north' | 'south' | 'east' | 'west';
  isHandicap?: boolean;
  occupied: boolean;
  vehicleId?: string;
}

export interface ParkingArrow {
  x: number;
  y: number;
  angle: number;
  type?: 'straight' | 'turn_left' | 'turn_right';
}

export interface ParkingArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spots: ParkingSpot[];
  arrows?: ParkingArrow[];
}

export interface StaticDriveway {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ramp' | 'connection' | 'dirt' | 'gravel';
}

export interface Tree {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  shadowOffset: number;
  type?: 'deciduous' | 'pine' | 'birch';
}

export interface StreetProp {
  id: string;
  x: number;
  y: number;
  type: 
    | 'bench' 
    | 'lamp' 
    | 'lamp_highway'
    | 'lamp_concrete'
    | 'hydrant' 
    | 'trash_can' 
    | 'bus_stop' 
    | 'cone' 
    | 'kiosk' 
    | 'mailbox' 
    | 'traffic_light'
    | 'dumpster'
    | 'flowerbed'
    | 'bollard'
    | 'manhole'
    | 'drain_grate'
    | 'tire_flowerbed'
    | 'playground_swing'
    | 'garage_door'
    | 'village_well'
    | 'village_sign'
    | 'haystack'
    | 'woodpile'
    | 'rustic_car_wreck'
    | 'concrete_barrier'
    | 'concrete_fence_po2'
    | 'power_pole'
    | 'shipping_container'
    | 'pallet_stack'
    | 'industrial_tank'
    | 'silo_tank'
    | 'cable_spool'
    | 'security_barrier'
    | 'industrial_floodlight'
    | 'industrial_tires'
    | 'scrap_pile'
    | 'industrial_sign'
    | 'industrial_pipe'
    | 'industrial_gate'
    | 'fence_wood_vertical'
    | 'fence_metal_vertical'
    | 'wicket_gate'
    | 'cottage_gate'
    | 'garden_path_tile';
  angle: number;
  intersectionId?: string;
  direction?: 'north' | 'south' | 'east' | 'west';

  isMasterLight?: boolean;
  // Breakable Props Physics
  isBroken?: boolean;
  breakVX?: number;
  breakVY?: number;
  breakAngle?: number;
  breakSpin?: number;
  waterFountainTimer?: number;
}

export interface LitterItem {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  rotationSpeed: number;
  type: 'paper' | 'newspaper' | 'cup' | 'can' | 'leaf' | 'phone' | 'coffee' | 'box' | 'bag' | 'bottle' | 'wrapper' | 'mask' | 'butt';
  color: string;
  size: number;
  isAirborne?: boolean;
  airborneTimer?: number;
  altitude?: number;
  isGlowing?: boolean;
}

export interface Bird {
  id: string;
  x: number;
  y: number;
  type: 'pigeon' | 'sparrow';
  angle: number;
  state: 'ground' | 'flying';
  altitude: number; // 0 on ground, up to 100 in sky
  flyVX: number;
  flyVY: number;
  wingCycle: number;
  walkTimer?: number;
  groupId?: string; // Birds sit in groups
}

export interface Puddle {
  id: string;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  angle: number;
  rippleTimer: number;
  isPond?: boolean;
}

export interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  color: string;
  width: number;
}

export type FluidStainType = 'oil' | 'coolant' | 'fuel' | 'sand' | 'water';

export interface FluidStain {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  type: FluidStainType;
  alpha: number;
  life: number;
  maxLife: number;
  onFire?: boolean;
  fireIntensity?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'tire_smoke' | 'spark' | 'exhaust' | 'engine_smoke' | 'glass_shard' | 'debris' | 'flame' | 'water_splash' | 'rain_drop' | 'water_fountain' | 'leaf' | 'feather';
}

export type ClothingLayer = 'skin' | 'underwear' | 'shirt' | 'jacket' | 'outerwear';
export type ClothingSlot = 'head' | 'face' | 'torso' | 'legs' | 'feet' | 'hands' | 'back';

export interface ClothingStats {
  insulation: number;       // 0 to 100 (warmth)
  windResistance: number;   // 0 to 100
  waterResistance: number;  // 0 to 100
  breathability: number;    // 0 to 100 (how well sweat evaporates)
  mobilityPenalty: number;  // 0 to 100 (how heavy/restrictive it is)
  slot: ClothingSlot;
  layer: ClothingLayer;
  color?: string;           // Primary color for rendering
  secondaryColor?: string;  // Secondary color
  pocketCapacityL?: number; // Volume capacity of pockets in Liters (e.g. 2.5L for jacket, 1.4L for jeans)
  maxPocketItemVolumeL?: number; // Max size of a single item that fits through pocket opening (e.g. 0.45L)
  maxPocketWeightKg?: number; // Max load capacity of pockets in kg (e.g. 3.0 kg)
}

export type EquippedClothing = {
  [slot in ClothingSlot]?: {
    [layer in ClothingLayer]?: InventoryItem;
  };
};

export type ItemCategory = 'food' | 'drink' | 'med' | 'medical' | 'tool' | 'auto' | 'valuable' | 'clothing' | 'misc';

export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  nameRu: string;
  category: ItemCategory;
  count: number;
  maxStack: number;
  icon: string;
  description: string;
  descriptionRu: string;
  effects: {
    health?: number;       // +/- HP (0-100)
    hunger?: number;       // + Food satiety (0-100)
    thirst?: number;       // + Hydration (0-100)
    energy?: number;       // + Stamina/Energy (0-100)
    sleepiness?: number;   // - Sleepiness reduction (e.g. -30 for coffee)
  };
  weight?: number;         // Unit weight in kg
  volume?: number;         // Unit volume in Liters (L)
  usable: boolean;
  clothingStats?: ClothingStats;
  portions?: number;       // Current remaining bites/sips/doses in this unit
  maxPortions?: number;    // Maximum/initial bites/sips/doses
  // Fluid & Energy metadata
  batteryCharge?: number;   // Battery charge level 0 to 100 (%)
  fluidLiters?: number;     // Remaining fluid volume in liters (L)
  maxFluidLiters?: number;  // Maximum fluid capacity in liters (L)
  fluidType?: 'coolant' | 'oil' | 'fuel';
  // Container properties (recursive containers: backpack, wallet, plastic bag, pockets, etc.)
  isContainer?: boolean;
  containerCapacityL?: number;      // Total internal volume capacity in Liters
  maxContainedItemVolumeL?: number; // Max single item volume that fits in this container
  maxContainedWeightKg?: number;    // Max total weight of contained items in kg
  allowedItemCategories?: ItemCategory[]; // Optional category filter (e.g. wallet only for money/valuable)
  contents?: InventoryItem[];       // Items stored inside this container
  // Car key and document metadata
  vehicleId?: string;
  carName?: string;
  carColor?: string;
}

export interface GroundItem {
  id: string;
  x: number;
  y: number;
  item: InventoryItem;
  spawnTime?: number;
}

export type InjuryType = 'abrasion' | 'bruise' | 'sprain' | 'fracture' | 'bleeding' | 'burn';

export interface Injury {
  id: string;
  type: InjuryType;
  treated: boolean;
  severity?: number;      // 0 to 100 severity
  pain?: number;          // 0 to 100 pain generated by this injury
  treatedTimer?: number;  // Seconds since treatment began
  bleedingRate?: number;  // 0 to 100 current bleeding speed
  burnDegree?: 1 | 2 | 3; // 1 = erythema/redness, 2 = blisters/dermis, 3 = deep necrotic tissue damage
}

export interface BodyPartState {
  id: 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
  nameRu: string;
  injuries: Injury[];
  fracture: boolean;
  fractureTreated: boolean;
  bruise: number;         // 0 to 100
  bleeding: number;       // 0 to 100 rate
  pain: number;           // 0 to 100
}

export interface BodyPartsMap {
  head: Injury[];
  torso: Injury[];
  leftArm: Injury[];
  rightArm: Injury[];
  leftLeg: Injury[];
  rightLeg: Injury[];
}

export type MedicationPhase = 'absorption' | 'peak' | 'action' | 'decay';

export interface ActiveMedication {
  id: string;
  itemId: string;
  nameRu: string;
  type: 'analgesic' | 'antibiotic' | 'stimulant' | 'antiseptic' | 'sedative';
  phase: MedicationPhase;
  timer: number;               // Seconds in current phase
  totalTimer: number;          // Total elapsed seconds
  absorptionDuration: number;  // e.g. 30s
  peakDuration: number;        // e.g. 20s
  actionDuration: number;      // e.g. 180s - 300s
  decayDuration: number;       // e.g. 60s
  maxPainkillerPower: number;  // 0.0 to 1.0 (pain reduction ratio)
  currentEffectiveness: number;// 0.0 to 1.0 calculated curve
  doseCount?: number;
}

export interface BodyState {
  hydration: number;           // 0 to 100 (%)
  energy: number;              // 0 to 100 (%)
  temperature: number;         // Body temperature in °C (normal ~36.6°C)
  wetness: number;             // 0 to 100 (%)
  painLevel: number;           // Base raw cumulative pain (0 to 100)
  effectivePain?: number;      // Perceived pain after pharmacokinetics & movement spikes (0 to 100)
  painPulse?: number;          // Rhythmic heartbeat/breathing wave (-1.0 to 1.0)
  heartRate?: number;          // Heart rate in BPM (60 to 180)
  bloodLoss?: number;          // Cumulative blood loss (0 to 100)
  shockLevel?: number;         // Shock level from trauma/blood loss (0 to 100)
  panicLevel?: number;         // Panic & fear level from trauma/pain (0 to 100)
  activeMedications?: ActiveMedication[];
  shiverIntensity?: number;    // Cold shivering camera jitter intensity (0 to 1)
  bodyParts: BodyPartsMap;
  coPoisoning?: number;        // 0 to 100% carbon monoxide poisoning (hypoxia)
  dizziness?: number;          // 0 to 100% dizziness / vertigo from hypoxia & trauma
  suffocationLevel?: number;   // 0 to 100% respiratory distress & choking
  coughTimer?: number;
  groanTimer?: number;
  heavyBreathTimer?: number;
  shiverTimer?: number;
  tinnitusTimer?: number;
  impactFlashTimer?: number;
}

export interface PlayerNeeds {
  health: number;      // 0 to 100
  hunger: number;      // 0 (starving) to 100 (full)
  thirst: number;      // 0 (dehydrated) to 100 (quenched)
  energy: number;      // 0 (exhausted) to 100 (full stamina)
  sleepiness: number;  // 0 (wide awake) to 100 (drowsy/collapsing)
  fullness: number;    // 0 (empty stomach) to 100 (stuffed)
  nausea: number;      // 0 (fine) to 100 (vomiting)
}

export type BodyPartStatus = string;

export interface ConsumptionState {
  isConsuming: boolean;
  itemId: string;
  itemNameRu: string;
  category: 'food' | 'drink';
  totalBites: number;
  bitesRemaining: number;
  currentBiteTimer: number;    // seconds elapsed on current bite
  biteDuration: number;        // seconds per bite
  effectsPerBite: {
    hunger?: number;
    thirst?: number;
    health?: number;
    energy?: number;
    sleepiness?: number;
  };
  fullnessPerBite?: number;
  leftoverId?: string;         // itemId of wrapper/plate/etc after finishing
  leftoverNameRu?: string;
  tasteMessage?: string;       // current taste sensation text
}

export interface PlayerNotification {
  id: string;
  text: string;
  type?: 'heal' | 'food' | 'drink' | 'energy' | 'sleep' | 'warning' | 'pickup' | 'info';
  color?: string;
  timer: number;
}

export interface ActivePlacement {
  type: 'vehicle' | 'prop' | 'item';
  id: string;        // vehicle type, prop type, or itemId
  nameRu: string;
  angle: number;     // in radians
  color?: string;    // vehicle color hex
  count?: number;    // item stack count
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  isInVehicle: boolean;
  currentVehicleId: string | null;
  vehicleId?: string | null;
  walkCycle: number;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hairColor: string;
  isInsideBuilding?: boolean;
  insideBuildingId?: string | null;
  currentFloor?: number;
  
  // Creative / Sandbox Mode
  isCreativeMode?: boolean;
  isFlying?: boolean;
  isInvincible?: boolean;
  isCleanMode?: boolean;
  
  // Human Mode Enhancements: Dodge roll, quick dash & aim
  isDashing?: boolean;
  dashTimer?: number;
  dashAngle?: number;
  aimAngle?: number;

  // Survival Needs & Vitals
  needs: PlayerNeeds;
  bodyState?: BodyState;
  equippedClothing: EquippedClothing;
  inventory: InventoryItem[];
  maxInventorySlots: number;
  selectedHotbarIndex: number;
  heldItemId?: string | null;
  leftHandItem?: InventoryItem | null;
  rightHandItem?: InventoryItem | null;
  activeHand?: 'left' | 'right';
  lastHurtTime?: number;
  isSleeping?: boolean;
  sleepTimer?: number;
  isFainting?: boolean;
  faintTimer?: number;
  needsHospitalEvacuation?: boolean;
  hospitalEvacTimer?: number;
  evacCause?: 'fire_burns' | 'fractures_shock' | 'blood_loss' | 'hypothermia' | 'starvation' | 'general';
  evacPhase?: 'dispatch' | 'ambulance_to_player' | 'return_dark' | 'hospital_bed';
  evacAmbulanceId?: string | null;
  evacStartPos?: { x: number; y: number };
  evacDiagnosis?: {
    causeName: string;
    description: string;
    treatmentsApplied: string[];
    prescriptionsGiven: string[];
    billAmount: number;
  };
  isHospitalized?: boolean;
  hospitalTimer?: number;
  hospitalTreatmentProgress?: number;
  hospitalTreatmentStage?: number;
  hospitalPhase?: number;
  notifications: PlayerNotification[];
  consumption?: ConsumptionState | null;

  // Gas Station interaction state
  heldFuelNozzle?: {
    pumpId: string;
    fuelType: FuelType;
    color: string;
    nameRu: string;
    pricePerLiter: number;
    hoseOrigin: { x: number; y: number };
  } | null;

  // Water hose equipped in hands (connected to truck_water or trailer_barrel)
  heldWaterHose?: HeldWaterHose | null;
}

export interface SidewalkBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sidewalkWidth: number; // width of the perimeter walkway band
  style: 'urban' | 'commercial' | 'village' | 'park';
  innerLawnColor?: string;
  driveways?: {
    side: 'north' | 'south' | 'east' | 'west';
    offset: number;
    width: number;
  }[];
  walkways?: {
    x: number;
    y: number;
    width: number;
    height: number;
    style?: 'stone' | 'concrete' | 'cobblestone' | 'asphalt';
  }[];
  plazas?: {
    x: number;
    y: number;
    width: number;
    height: number;
    shape?: 'rect' | 'circle';
    style?: 'stone' | 'tile' | 'cobblestone';
  }[];
}

export interface GpsDestination {
  x: number;
  y: number;
  name?: string;
}

export interface Roundabout {
  id: string;
  x: number;
  y: number;
  radius: number;
  innerRadius: number;
  name?: string;
}

export interface GameWorld {
  width: number;
  height: number;
  roads: RoadSegment[];
  intersections: Intersection[];
  roundabouts?: Roundabout[];
  sidewalks?: SidewalkBlock[];
  buildings: Building[];
  parkings: ParkingArea[];
  driveways?: StaticDriveway[];
  trees: Tree[];
  props: StreetProp[];
  vehicles: Vehicle[];
  pedestrians: Pedestrian[];
  birds: Bird[];
  puddles: Puddle[];
  litter: LitterItem[];
  groundItems?: GroundItem[];
  skidMarks: SkidMark[];
  stains: FluidStain[];
  particles: Particle[];
  weather: WeatherType;
  cleanMode?: boolean;
  outsideTemp?: number;
  humidity?: number;
  gasPumps?: GasPumpDispenser[];
  lightningFlashTimer?: number;
  lightningStrike?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    seed: number;
    intensity: number;
  } | null;
  gpsDestination?: GpsDestination | null;
  gpsPath?: Vector2D[] | null;
  pedestrianPaths: {
    id: string;
    waypoints: Vector2D[];
    isCrosswalk?: boolean;
    crosswalkRef?: string;
  }[];
}

export interface Camera {
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  zoom: number;
  targetZoom: number;
  targetX: number;
  targetY: number;
  shakeTimer: number;
  shakeIntensity: number;
  gridMode?: boolean;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  sprint: boolean;
  actionE: boolean;
  hornH: boolean;
  headlightsL: boolean;
  timeToggleT: boolean;
  cameraZoomC: boolean;
  minimapZoomM: boolean;
  resetR: boolean;
  turnLeftQ: boolean;
  turnRightZ: boolean;
  shiftUp: boolean;
  shiftDown: boolean;
  hazardX: boolean;
  inventoryI?: boolean;
  hotbar1?: boolean;
  hotbar2?: boolean;
  hotbar3?: boolean;
  hotbar4?: boolean;
  hotbar5?: boolean;
  hotbar6?: boolean;
  mouseX: number;
  mouseY: number;
  isMouseDown: boolean;
}

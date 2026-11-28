export type TimeOfDay = 'morning' | 'day' | 'sunset' | 'night';
export type WeatherType = 'clear' | 'overcast' | 'rain' | 'drizzle' | 'storm' | 'fog' | 'snow' | 'blizzard';
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export interface GameCalendarState {
  year: number;          // e.g. 2026
  month: number;         // 1..12
  day: number;           // 1..31
  timeHour: number;      // 0.0 .. 23.999
  season: Season;
  dayOfYear: number;     // 1..365 (or 366 in leap year)
  dayOfWeek: number;     // 1 = Понедельник .. 7 = Воскресенье
  isLeapYear: boolean;
  sunriseHour: number;   // Calculated from solar declination
  sunsetHour: number;    // Calculated from solar declination
  daylightHours: number; // Duration of daylight
}

export interface Vector2D {
  x: number;
  y: number;
}

export type GameMode = 'career' | 'freeroam';

export type CarType = 
  | 'sedan' 
  | 'hatchback' 
  | 'pickup' 
  | 'sports' 
  | 'suv' 
  | 'taxi' 
  | 'police' 
  | 'bus' 
  | 'bus_minibus'
  | 'van' 
  | 'muscle' 
  | 'ambulance'
  | 'ambulance_van'
  | 'ambulance_suv'
  | 'truck_zil_dump'
  | 'truck_semi'
  | 'trailer_semi'
  | 'trailer_semi_box'
  | 'trailer_semi_tanker'
  | 'trailer_semi_container'
  | 'trailer_semi_lowboy'
  | 'truck_water'
  | 'truck_flatbed'
  | 'gazelle_old'
  | 'gazelle_business'
  | 'wagon_classic'
  | 'wagon_modern'
  | 'wagon_allroad'
  | 'sedan_classic'
  | 'sedan_luxury'
  | 'sedan_compact'
  | 'compact_matiz'
  | 'sedan_logan'
  | 'sedan_nexia'
  | 'liftback_tavria'
  | 'sedan_accent'
  | 'sedan_polo'
  | 'hatch_samara'
  | 'sedan_samara'
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
  | 'trailer_vacuum'
  | 'trailer_flatbed_2axle'
  | 'paver_asphalt_wheeled'
  | 'roller_heavy_tandem'
  | 'roller_compact_sidewalk'
  | 'roller_pneumatic'
  | 'excavator_ek12';

export type TurnSignalType = 
  | 'incandescent_classic'      // Classic bulb with filament thermal inertia (warm fade in/out, bimetal relay cadence)
  | 'incandescent_modern'       // Modern halogen/bulb with electronic BCM relay (rapid fade in/out)
  | 'led_crisp'                 // Instant crisp digital LED matrix strobe (0ms rise/fall)
  | 'dynamic_sequential_led';   // Modern sweeping sequential LED cascade ("змейка" from inner to outer corner)

export type TurnSignalSoundType = 
  | 'bimetal_relay'    // Deep warm mechanical click with slight housing resonance (VAZ, MTZ, vintage cars)
  | 'bcm_relay'        // Crisp mechanical solenoid click (modern hatchbacks, sedans, utility trucks)
  | 'electronic_click' // Clean digital high-pitch piezo tick (sportscars, modern crossovers)
  | 'luxury_acoustic'; // Soft acoustic damped luxury tap (Audi, Lexus, Mercedes, luxury SUVs)

export interface VehicleTurnSignalConfig {
  type: TurnSignalType;
  baseFrequency: number;          // Hz (e.g. 1.35 to 1.75 Hz)
  dutyCycle: number;              // 0.45 to 0.60 fraction of cycle illuminated
  sweepDuration: number;          // seconds for dynamic sequential sweep (0.26 - 0.34s)
  hasSideMirrorRepeaters: boolean;// LED repeater strip on side mirror housing
  hasFenderRepeaters: boolean;    // Amber bulb/lens on front fender
  repeaterStyle: 'fender_round' | 'fender_rect' | 'mirror_led_static' | 'mirror_led_dynamic';
  soundType: TurnSignalSoundType;
}

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
  driveType?: 'FWD' | 'RWD' | 'AWD';
  hitchOffset?: number;    // Where the hitch/fifth wheel is located relative to the center of the towing vehicle
  couplerOffset?: number;  // Where the trailer connects to the towing vehicle relative to the center of the trailer
  color?: string;
  roofColor?: string;
  dumpColor?: string;
  massEmpty?: number;
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
  structuralType?: 'bumper' | 'fender' | 'door' | 'quarter' | 'pillar' | 'hood' | 'windshield' | 'roof' | 'trunk';
  shapeSeed?: number;
}

export type BeamNodeType =
  | 'bumper'
  | 'fender'
  | 'door'
  | 'quarter'
  | 'pillar'
  | 'hood'
  | 'windshield'
  | 'roof'
  | 'trunk'
  | 'engine'
  | 'subframe'
  | 'chassis_core'
  | 'wheel';

export type BeamLinkType =
  | 'structural'
  | 'cross'
  | 'chassis_rail'
  | 'support'
  | 'latch';

export interface NodeTemplate {
  id: number;
  xFrac: number;    // -0.5 to 0.5 relative to vehicle length (front is +0.5, rear is -0.5)
  yFrac: number;    // -0.5 to 0.5 relative to vehicle width (right is +0.5, left is -0.5)
  xOffset?: number; // optional absolute px offset
  yOffset?: number; // optional absolute px offset
  group: BeamNodeType;
  massFrac: number; // fraction of car total mass (e.g. 0.02 for skin, 0.20 for engine block)
  isFixed?: boolean;
  name?: string;
}

export interface BeamTemplate {
  id?: number;
  nodeA: number;
  nodeB: number;
  type: BeamLinkType;
  spring?: number;     // Hookean spring stiffness (N/px), if omitted uses default for type
  damp?: number;       // Viscous damping coefficient, if omitted uses default
  yieldDist?: number;  // Yield distance (px) before plastic metal flow occurs
  breakDist?: number;  // Break distance (px) where beam fractures/snaps
  partTag?: 'hood' | 'hood_hinge' | 'engine_mount' | 'radiator' | 'front_bumper' | 'rear_bumper' | 'door_fl' | 'door_fr' | 'door_rl' | 'door_rr' | 'trunk';
}

export interface VehicleNodeBeamDefinition {
  presetId: string;
  name: string;
  perimeterCount: number; // Number of outer perimeter nodes forming the collision/visual hull
  nodes: NodeTemplate[];
  beams: BeamTemplate[];
  springScale?: number;
  dampScale?: number;
  yieldScale?: number;
  breakScale?: number;
  chassisStiffness?: number;
  tracking?: {
    frontNodeIds?: number[];
    rearNodeIds?: number[];
    leftNodeIds?: number[];
    rightNodeIds?: number[];
    subframeLeftFL?: number;
    subframeRightFR?: number;
    subframeLeftRL?: number;
    subframeRightRR?: number;
    engineNodeId?: number;
    chassisCoreNodeId?: number;
    cowlNodeId?: number;
    hoodLatchBeamIds?: number[];
    hoodHingeBeamIds?: number[];
    engineMountBeamIds?: number[];
  };
}

export interface BeamNode {
  id: number;
  origX: number;
  origY: number;
  localX: number;
  localY: number;
  x: number;
  y: number;
  offsetX?: number;
  offsetY?: number;
  elasticX?: number;
  elasticY?: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  mass: number;
  plasticStrain: number;
  group: BeamNodeType;
  isFixed?: boolean;
  /** Узел входит в жёсткое ядро кузова (подрамник/центральный тоннель). */
  isCore?: boolean;
  name?: string;
}

export interface BeamLink {
  id: number;
  nodeA: number;
  nodeB: number;
  restLength: number;
  origLength: number;
  spring: number;
  damp: number;
  yieldDist: number;
  breakDist: number;
  broken: boolean;
  type: BeamLinkType;
  partTag?: 'hood' | 'hood_hinge' | 'engine_mount' | 'radiator' | 'front_bumper' | 'rear_bumper' | 'door_fl' | 'door_fr' | 'door_rl' | 'door_rr' | 'trunk';
  currentStress?: number;
  plasticDeform?: number;
}

export interface NodeBeamStructure {
  nodes: BeamNode[];
  beams: BeamLink[];
  brokenBeamCount: number;
  totalPlasticDeform: number;
  maxStress: number;
  lastSimTime?: number;
  isSleeping?: boolean;
  activeTimer?: number;
  presetId?: string;
  presetName?: string;
  perimeterCount?: number;
  definition?: VehicleNodeBeamDefinition;
  /** Реальные параметры установленного модификатора двигателя, зашитые в soft-body привязки. */
  engineModifierId?: string;
  turboModifierId?: string;
  engineMassKg?: number;
  engineMountCount?: number;
  engineMountBrokenCount?: number;
  engineMountHealth?: number;
  crushLimit?: {
    dirX: number;
    dirY: number;
    depth: number;
    cx: number;
    cy: number;
    radius: number;
  };
  steppedThisTick?: boolean;
  /** Версия шкалы сил балок (2 = реальные силы смятия; старые сохранения мигрируются на лету). */
  forceScaleVersion?: number;
  /** Максимальный устойчивый подшаг интегратора, с (из жёсткости и масс сетки). */
  stableDt?: number;
  /** Нужно ли синхронизировать deformedVertices/агрегаты урона после последнего шага. */
  needsSync?: boolean;
  /**
   * Геометрия контакта с препятствием в системе координат кузова. Препятствие — односторонняя
   * связь: узлы не могут зайти за плоскость (стена) или окружность (столб), которые движутся
   * вглубь кузова на величину хода смятия.
   */
  contact?: {
    /** Единичное направление «внутрь кузова» (локальные координаты). */
    dirX: number;
    dirY: number;
    /** Координата поверхности контакта вдоль dir на момент касания (меньше = ближе к препятствию). */
    plane0: number;
    /** Поперечная координата центра пятна контакта. */
    lat0: number;
    /** Полуширина пятна контакта (стена) либо радиус столба (narrow). */
    half: number;
    narrow: boolean;
    /** Глубина вмятины в зоне контакта на момент касания (прежние удары), px. */
    depth0: number;
    /** Текущий ход плоскости препятствия вглубь кузова от plane0, px. */
    pen: number;
  };
  /** Ход смятия (px) в начале и в конце текущего шага — плоскость препятствия движется между ними. */
  contactPen0?: number;
  contactPen1?: number;
  /** Ускорение системы отсчёта кузова (локальные координаты, px/s²): инерционная сила узлов. */
  frameAx?: number;
  frameAy?: number;
  /** Угловая скорость/ускорение кузова, рад/с и рад/с²: центробежная и эйлерова нагрузка узлов. */
  bodyOmega?: number;
  bodyAlpha?: number;
  /** Массовые характеристики, посчитанные по узлам сетки (кг и кг·px²). */
  coreMass?: number;
  totalNodeMass?: number;
  nodeInertia?: number;
  comX?: number;
  comY?: number;
  fixedNodeCount?: number;
  /** Реакция деформируемой оболочки на жёсткое ядро за последний шаг (локальные координаты). */
  reactionFx?: number;
  reactionFy?: number;
  reactionTorque?: number;
  /** Диагностика: суммарная сила реакции контакта за последний шаг, mass·px/s². */
  lastContactForce?: number;
  /** Пиковое ускорение системы отсчёта кузова за последний шаг (px/s²), для оценки перегрузки. */
  lastFrameAx?: number;
  lastFrameAy?: number;
  /** High-water-mark базовые значения смятия агрегатов в softbody-сетке (чтобы ремонт без правки кузова не сбрасывался). */
  componentBaselines?: SoftBodyComponentBaselines;
  /** Состояние датчиков салона и перегрузки водителя, снимаемых напрямую с softbody-сетки. */
  occupantState?: SoftBodyOccupantState;
  /** Наименование последнего препятствия (только для текста уведомления HUD, не влияет на расчёт урона). */
  lastImpactObstacle?: string;
}

export interface SoftBodyComponentBaselines {
  radiatorCrush: number;
  engineCrush: number;
  oilPanCrush: number;
  transmissionCrush: number;
  fuelTankCrush: number;
  fuelRailCrush: number;
  fluidTankCrush: number;
  suspFL: number;
  suspFR: number;
  suspRL: number;
  suspRR: number;
  headlightL: number;
  headlightR: number;
  taillightL: number;
  taillightR: number;
  hoodCrush: number;
  windshieldCrush: number;
  rearGlassCrush: number;
  coolingFanCrush?: number;
  intercoolerCrush?: number;
  turboCrush?: number;
  alternatorCrush?: number;
  batteryCrush?: number;
  airIntakeCrush?: number;
  ecuCrush?: number;
  gboReducerCrush?: number;
}

export interface SoftBodyOccupantTelemetry {
  peakG: number;
  avgG: number;
  deltaVKmh: number;
  dirLocalX: number;
  dirLocalY: number;
  frontIntrusionDelta: number;
  driverSideIntrusionDelta: number;
  passengerSideIntrusionDelta: number;
  rearIntrusionDelta: number;
  totalFrontIntrusion: number;
  totalDriverSideIntrusion: number;
  cageIntegrity: number;
  crumpleRemaining: number;
  windshieldJustCracked: boolean;
  isOpenCockpit: boolean;
  obstacleLabel: string;
}

export interface SoftBodyOccupantState {
  initialized: boolean;
  prevX: number;
  prevY: number;
  prevVx: number;
  prevVy: number;
  // High-water-mark cabin intrusions so each crash episode applies only new intrusion
  baseFrontIntrusion: number;
  baseDriverSideIntrusion: number;
  basePassengerSideIntrusion: number;
  baseRearIntrusion: number;
  wasWindshieldCracked: boolean;
  // Active crash-pulse accumulator
  pulseActive: boolean;
  pulseElapsed: number;
  pulseDvLocalX: number;
  pulseDvLocalY: number;
  pulsePeakDvMag: number;
  pulsePrimaryDirX: number;
  pulsePrimaryDirY: number;
  pulsePeakG: number;
  pulseFrontIntrusion: number;
  pulseDriverSideIntrusion: number;
  pulsePassengerSideIntrusion: number;
  pulseRearIntrusion: number;
  pulseWindshieldCracked: boolean;
  lastTraumaTime: number;
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
  ignition?: boolean;           // ignition switch state (on/off)
  engineKnocking: boolean;      // knock/detonation due to low oil or bad fuel
  engineStalled: boolean;       // engine stalled
  overheatingSteam: boolean;    // thick white steam pouring out from radiator
  isDieselRunaway?: boolean;    // diesel runaway state (разнос дизеля: uncontrolled burning of oil)
  
  // Powertrain & Transmission
  engineRPM: number;
  transmissionType: 'MANUAL' | 'AUTO';
  autoGearMode?: 'P' | 'R' | 'N' | 'D';
  currentGear: number;
  gearRatios: number[];
  finalDriveRatio: number;
  clutchPedal: number;
  hasTransferCase?: boolean;
  transferCaseMode?: 'HIGH' | 'LOW';
  tractorRange?: 1 | 2;
  isStalled: boolean;
  shiftCooldown?: number;
  revLimiterTimer?: number;
  starterOverloadCount?: number;

  // Mechanical Integrity & Damage States
  engineHealth: number;         // 0 to 100 (%) health of engine block, pistons, head gasket
  isSeized: boolean;            // engine seized from impact or overheating/oil starvation (will not run or crank)
  hydrolocked?: boolean;        // engine hydrolocked from ingesting water through air intake (гидроудар)
  waterInCylinders?: number;    // 0 to 100 (% cylinder water volume)
  transmissionHealth: number;   // 0 to 100 (%) gearbox health
  transmissionJammed: boolean;  // gearbox jammed from impact or stripped gears (cannot shift, gear stuck)

  // Powertrain & Transmission Thermodynamics & Wear
  clutchTemperature?: number;   // Clutch disc temperature in °C (normal ~20-90°C, burning >250°C)
  clutchWear?: number;          // 0 to 100 (%) clutch lining wear (100 = completely burnt out/destroyed)
  clutchSmokeTimer?: number;    // Timer for acrid white smoke notification & particles
  transmissionTemp?: number;    // Gearbox / ATF fluid temperature in °C (normal ~70-90°C, overheat >130°C)
  gearGrindTimer?: number;      // Gear grind sound/warning cooldown
  hoodOpen?: boolean;
  batteryInstalled?: boolean;        // default true
  batteryPosConnected?: boolean;     // default true (+)
  batteryNegConnected?: boolean;     // default true (-)
  radiatorCapOpen?: boolean;         // default false
  oilCapOpen?: boolean;              // default false
  dipstickPulled?: boolean;          // default false

  // Vehicle History & Improvements
  mileageKm?: number;
  isChiptuned?: boolean;
  isHeavySuspended?: boolean;
  hasGBO?: boolean;

  // Powertrain Variant System (двигатели, КПП, прошивки, шины, турбо)
  engineId?: string;                 // Engine variant id (powertrainVariants.ts)
  transmissionId?: string;           // Transmission variant id
  tuneId?: string;                   // ECU firmware/ECU map id
  tireSetId?: string;                // Tire set id
  turboKitId?: string;               // Turbo kit id ('trb_none' = naturally aspirated)
  frameId?: string;                  // Truck chassis frame variant id (truckChassisVariants.ts)
  bodyId?: string;                   // Truck cargo body / superstructure variant id (truckChassisVariants.ts)
  transmissionKind?: 'MT' | 'AT' | 'DSG' | 'AMT' | 'CVT' | 'HYDRO' | 'RANGE';
  transmissionEfficiency?: number;   // 0.85 - 0.98 drivetrain mechanical efficiency
  powerMult?: number;                // engine * tune torque/power factor
  consumptionMult?: number;          // fuel consumption multiplier
  heatMult?: number;                 // engine thermal load multiplier
  rpmResponseMult?: number;          // flywheel inertia responsiveness multiplier
  idleRPM?: number;                  // engine-specific idle
  redlineRPM?: number;               // engine-specific governor cut-off (incl. tune extension)
  maxRPMLimit?: number;              // engine-specific absolute mechanical RPM limit
  minOctaneRequirement?: number;     // required octane (92/95/98/100); 0 for diesel
  knockRisk?: number;                // 0..1 additional detonation probability at full load
  chipLevel?: number;                // 0 = stock, 1 = eco, 2 = sport/aggressive ECU map
  turboSpec?: TurboRuntimeSpec | null; // turbo kit specs (null = NA engine)
  turboBoost?: number;               // current live boost level 0..boostMax

  // Tire set characteristics (multipliers into friction circle / dragging)
  tireGripMult?: number;             // dry grip multiplier into mu
  tireWetGripMult?: number;          // grip multiplier when surface is wet
  tireIceGripMult?: number;          // grip multiplier on ice (stud advantage)
  tireRollingMult?: number;          // rolling resistance multiplier
  tireTopSpeedMult?: number;         // tire speed rating effect on top speed
  tireStudded?: boolean;
  tireOffroad?: boolean;

  // Engine Bay Sub-Module Integrity (Model-driven soft-body damage)
  alternatorWorking?: boolean;       // serpentine belt / alternator integrity (default true)
  coolingFanBroken?: boolean;        // cooling fan blades / shroud jammed (default false)
  turboHealth?: number;              // 0 to 100 (%) turbocharger / supercharger health (default 100)
  intercoolerHealth?: number;        // 0 to 100 (%) FMIC / TMIC intercooler & piping health (default 100)
  airIntakeDamaged?: boolean;        // air filter housing / cold-air intake crushed (default false)
  ecuDamaged?: boolean;              // ECU / engine relay box damaged (default false)
  fuelInjectorPumpDamaged?: boolean; // diesel ТНВД / common rail / distributor damaged (default false)
  gboReducerDamaged?: boolean;       // LPG/GBO reducer or gas rail damaged (default false)

  // Offroad Physics & Terrain Interaction
  offroadSinkDepth?: number;   // 0.0 to 1.5 (current depth sunken into mud/soil)
  isBoggedDown?: boolean;      // vehicle struggling in deep mud / high drag
}

export type FuelType = 'ai92' | 'ai95' | 'ai98' | 'ai100' | 'diesel' | 'lpg';

export interface TurboRuntimeSpec {
  id: string;
  nameRu: string;
  boostMax: number;      // fraction of extra torque at full boost
  spoolRPM: number;      // RPM where boost starts building
  lagRate: number;       // 1/s spool responsiveness
  isSupercharged?: boolean;
  isTwin?: boolean;
}

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
  gboLevel?: number;            // 0 to 100 (%)
  gboCapacity?: number;         // Liters (e.g. 42L)
  gboActive?: boolean;          // whether GBO system is toggled on (default true)
  gboInstalled?: boolean;
  hasLPG?: boolean;
  lpgTankCapacity?: number;
  lpgTankLevel?: number;
  activeFuelSource?: 'petrol' | 'lpg';
}

export type StoredLiquidType = 
  | 'water' 
  | 'sewage'
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
  sourceType: 'truck_water' | 'trailer_barrel' | 'trailer_vacuum' | 'truck_vacuum';
  maxLength: number;            // max physical uncoiled length in pixels (e.g. 250 px, ~16m)
  segments: HoseSegmentNode[];   // Verlet physical nodes
  segmentLength: number;         // distance constraint per segment
  leaks: HoseLeakPoint[];        // micro-holes along the hose that drip/squirt
  isSpraying: boolean;           // actively shooting water stream
  isPressurized?: boolean;       // true if high pressure pump running (e.g. truck engine on), false if natural gravity trickle
  isVacuumHose?: boolean;        // true if thick corrugated vacuum suction/discharge hose (КО-503В / КО-505А / КО-560 / АНМ-53)
  isJetterHose?: boolean;        // true if high-pressure orange sewer jetting hose РВД from КО-560 reel
  isSuctionActive?: boolean;     // true when vacuum hose is actively sucking liquid/sludge from ground into tank
  suctionLiquidColor?: string;   // visual tint of fluid currently being sucked up
  sprayCooldown?: number;        // audio / particle timer
}

export interface HeldTowRope {
  vehicleId: string;
  isFront: boolean;
  maxLength: number;
  segments: HoseSegmentNode[];
  segmentLength: number;
}

export interface TowingRope {
  id: string;
  vehicleAId: string;
  isFrontA: boolean;
  vehicleBId: string;
  isFrontB: boolean;
  maxLength: number;
  segments: HoseSegmentNode[];
  segmentLength: number;
  // Dynamic tension & realism state
  tension?: number;        // Normalized strain / pulling load (0.0 to 1.5+)
  isTaut?: boolean;         // True when stretched beyond slack threshold
  slackAmount?: number;     // Remaining slack in pixels (< 0 means stretched)
  vibration?: number;       // High tension micro-vibration factor (0..1)
  hasSafetyFlag?: boolean;  // Red/white reflective warning flag (GOST/traffic safety)
  lastDistance?: number;    // Previous step distance for jerk calculation
  jerkCooldown?: number;    // Cooldown timer for dynamic jerk sound/impact
  groanCooldown?: number;   // Cooldown timer for fiber groaning sound
  maxLoadCapacity?: number; // Overload breaking limit in kg force
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
  isVacuumTank?: boolean;        // True for vacuum sewage/sludge cisterns (КО-503В, КО-505А, КО-560, АНМ-53)
  vacuumPumpMode?: 'suction' | 'discharge'; // 4-way valve position: 'suction' (Всасывание в бочку) or 'discharge' (Нагнетание/слив)
  vacuumPressureBar?: number;    // Manometer/vacuummeter reading in bar: -0.85 (deep vacuum) .. 0 (atm) .. +1.50 (compressor overpressure)
  spuCutoffActive?: boolean;     // True when SPU float cutoff valve blocks suction line because cistern is 100% full
  cleanWaterCapacity?: number;   // КО-560 side stainless-steel clean water tanks capacity (L)
  cleanWaterVolume?: number;     // КО-560 current clean water volume for high-pressure jetting (L)
  isJetterPumpActive?: boolean;  // КО-560 high-pressure plunger pump ВД active
  activeHoseMode?: 'vacuum' | 'jetter'; // КО-560 selected hose: 'vacuum' (d=100mm suction hose) or 'jetter' (high-pressure РВД reel)
  rearDoorOpen?: boolean;        // КО-505А hydraulically opened full-bore rear dish door for sludge dumping
  sludgeBoomAngle?: number;      // КО-505А top revolving hydraulic suction boom angle in radians (-1.3 .. +1.3)
  sludgeBoomExtension?: number;  // КО-505А top suction boom telescopic/radial reach factor (0 .. 1)
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
  lastNormalX?: number;
  lastNormalY?: number;

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

  // BeamNG.drive-style 2D Node-Beam deformation structure
  nodeBeam?: NodeBeamStructure;

  // Realistic Softbody Frame Alignment & Visual Mechanics
  frameBentAngle?: number;    // Frame twist angle drift (radians) from asymmetric impact
  hoodRaisedAmount?: number;  // 0.0 to 1.0 buckled 2.5D hood height for rendering fold shadows
  bumperSagLeft?: number;     // 0.0 to 1.0 sagging front-left bumper corner
  bumperSagRight?: number;    // 0.0 to 1.0 sagging front-right bumper corner

  // Physical Detachable Body Parts
  hoodDetached?: boolean;
  frontBumperDetached?: boolean;
  rearBumperDetached?: boolean;
  leftDoorDetached?: boolean;
  rightDoorDetached?: boolean;
  doorRLDetached?: boolean;
  doorRRDetached?: boolean;
  fenderFLDetached?: boolean;
  fenderFRDetached?: boolean;
  trunkDetached?: boolean;

  // Visual loose/ajar/sag states
  doorFLAjar?: number | boolean;
  doorFRAjar?: number | boolean;
  doorRLAjar?: number | boolean;
  doorRRAjar?: number | boolean;
  fenderFLLoose?: boolean;
  fenderFRLoose?: boolean;
  rearBumperSagLeft?: number;
  rearBumperSagRight?: number;
}

export interface WheelState {
  angularVelocity: number; // rad/s
  slipRatio: number; // -1.0 (lockup) to +1.0+ (power wheelspin)
  slipAngle: number; // radians (angle between wheel plane and velocity)
  normalLoad: number; // N (vertical load Fz with dynamic 3D weight transfer)
  fx: number; // longitudinal force (N)
  fy: number; // lateral cornering force (N)
  isSlipping: boolean; // whether tire broke static friction limit
  skidIntensity: number; // 0..1 for smoke/marks/audio
  surfaceGrip: number; // local surface adhesion mu
  x: number; // world position X
  y: number; // world position Y
}

export interface Vehicle {
  id: string;
  type: CarType;
  nameRu?: string;
  licensePlate?: string;
  distanceTraveled?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;           // Heading angle in radians (0 = East, PI/2 = South)
  steerAngle: number;      // Current wheel turn angle
  targetSteerAngle: number;// Target wheel angle from user/AI
  speed: number;           // Scalar velocity in forward direction (px/s)
  maxSpeed?: number;
  acceleration?: number;
  braking?: number;
  lateralVelocity: number; // Sideways slip velocity
  angularVelocity: number; // Yaw rate
  isDrifting: boolean;
  driftFactor: number;
  mass: number;
  
  // 4-Wheel Contact Patch Simulation States
  wheelFL?: WheelState;
  wheelFR?: WheelState;
  wheelRL?: WheelState;
  wheelRR?: WheelState;
  
  // Ownership & Security
  ownerId?: string;
  keyId?: string;
  keyTier?: 'classic' | 'flip' | 'smart' | 'display';
  isLocked?: boolean;
  insertedKeyType?: 'gold' | 'iron' | 'car_key' | string;
  insertedKeyId?: string;

  // Physical dimensions & config
  width: number;
  length: number;
  wheelBase: number;
  frameId?: string;
  bodyId?: string;
  color: string;
  roofColor: string;
  dumpColor?: string;
  headlightsOn: boolean;
  headlightMode: 'off' | 'low' | 'high';
  headlightIntensity?: number;
  positionLightsOn?: boolean;
  frontFogLightsOn?: boolean;
  rearFogLightsOn?: boolean;
  roadTrainLightsOn?: boolean;
  brakeLightsOn: boolean;
  isBrakeLocked?: boolean;     // Tires locked up sliding without ABS under heavy braking
  absActive?: boolean;         // ABS electronic modulation active
  isReversing?: boolean;
  turnSignal: 'none' | 'left' | 'right' | 'hazard';
  turnSignalTimer: number;

  // Modular Physics, Engine & Fuel Systems
  requiredFuel: 'ai92' | 'ai95' | 'diesel';
  hasGBO?: boolean;
  tractorBrakeLatch?: boolean; // MTZ split brakes lock/latch state (default: true)
  hasRearviewCamera?: boolean;
  engineState?: EngineState;
  fuelSystem?: FuelSystem;
  fluidTank?: FluidStorageTank;
  truckBodyType?: string;

  // Damage & Deformation
  damage: VehicleDamage;
  lastDamageTime?: number;

  // Physical Knockback Impulse & Physics State
  knockbackVx?: number;
  knockbackVy?: number;
  knockbackSpin?: number;
  stunnedTimer?: number;
  pushedTimer?: number;        // Duration during/after external push where AI throttle & steering are disengaged
  spinoutTimer?: number;       // Duration of post-collision uncontrolled spinout/drift physics

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
    preserveVelocity?: boolean; // If true (oblique/vehicle collision), do not clamp speed to 0
    initialNormalSpeed?: number;   // нормальная (к контакту) составляющая скорости в момент удара, px/s (≥ 0)
    initialTangentialSpeed?: number; // касательная составляющая скорости в момент удара, px/s (сохраняется с трением)
    interlockingTimer?: number; // Plastic interlocking duration (metal entanglement)
    interlockingFriction?: number; // Plastic shear friction coefficient during entanglement
    isNarrowImpact?: boolean;
    contactWidthPx?: number;
    targetCrushPx?: number;
    /**
     * Силовая модель смятия (damageModel.createCrushProfile). Если задана и preserveVelocity=false,
     * торможение машины и ход вмятины считаются по кривой «сила–смятие» (энергия сохраняется),
     * а не по скриптовому косинусу фиксированной длительности.
     */
    crushModel?: {
      zone: 'front' | 'rear' | 'side';
      length: number;
      width: number;
      contactWidthPx?: number;
      structureStiffness?: number;
      intrusionZoneFraction?: number;
      maxZoneLengthPx?: number;
      /** Доля скорости, идущая в деформацию именно этого кузова (strikerMass/(m+strikerMass)). */
      share: number;
    };
    /** Текущий абсолютный ход смятия от неповреждённого кузова, px. */
    crushDepthPx?: number;
    /** Ход смятия на момент начала этого удара (прежние вмятины), px. */
    crushStartPx?: number;
    /** Скорость сближения в долях initialNormalSpeed·share, px/s (внутреннее состояние интегратора). */
    crushSpeed?: number;
    /** Ход завершён: машина остановлена силами смятия. */
    crushStopped?: boolean;
  };

  // Customizable Node-Beam Softbody Definition Override
  customMeshConfig?: Partial<VehicleNodeBeamDefinition>;

  // AI & State
  isPlayerControlled: boolean;
  isPlayerInsideSaloon?: boolean; // Whether the player or passengers are walking/sitting inside the bus cabin/saloon
  isParked: boolean;
  isDerelict?: boolean;        // Totaled, crushed, or abandoned wreck
  waterDepth?: number;         // Water depth at vehicle center (meters)
  frontWaterDepth?: number;    // Water depth at front bumper / intake (meters)
  rearWaterDepth?: number;     // Water depth at rear bumper / exhaust (meters)
  leftWaterDepth?: number;     // Water depth along left side wheels (meters)
  rightWaterDepth?: number;    // Water depth along right side wheels (meters)
  submergedFraction?: number;  // 0 to 1 ratio of vehicle height submerged
  isFloating?: boolean;        // Whether vehicle is bobbing/floating in deep water
  cabinWaterLevel?: number;    // 0 to 1 progressive water flooding inside vehicle cabin
  wetCoatTimer?: number;       // Remaining seconds of dripping wet hull & soaked tires after exiting water
  snowCoat?: number;           // 0 to 1 accumulated snow crust on parked/cold bodywork (melts on warm hood, sheds at speed)
  windshieldSnowLevel?: number;// 0 to 100 snow/slush accumulation on windshield glass
  aquaplaneFactor?: number;    // 0 to 1 dynamic hydroplaning intensity on water film
  targetSpeed: number;
  currentLaneId: string | null;
  targetWaypointIndex: number;
  routeWaypoints: Vector2D[];
  aiState: 'driving' | 'stopping_light' | 'in_intersection' | 'stopping_obstacle' | 'yielding' | 'waiting' | 'reversing' | 'parked' | 'lane_changing' | 'overtaking' | 'avoiding_obstacle' | 'evading' | 'spinout' | 'wrecked';
  reverseTimer?: number;
  recoverySteer?: number;
  recoveryTargetAngle?: number;
  driverProfile?: DriverProfile;
  // Intelligent Obstacle Avoidance, Lane Changing & Evasion
  avoidanceOffset?: number;             // Current lateral shift from lane centerline in pixels (+ left, - right)
  avoidanceVel?: number;                // Current lateral velocity of avoidance maneuver (px/s)
  targetAvoidanceOffset?: number;       // Target lateral shift to reach (+ left, - right)
  avoidanceHeadingBias?: number;        // Tangent angle bias (rad) from quintic S-curve derivative dd/ds
  avoidancePhase?: 'none' | 'signaling' | 'swerving' | 'passing' | 'returning' | 'emergency_evading';
  avoidanceObstacleId?: string | null;  // ID of vehicle or prop being bypassed
  avoidanceWaitTimer?: number;          // Time waited behind obstacle before committing to maneuver
  avoidanceCooldown?: number;           // Cooldown before initiating another bypass
  avoidanceSpline?: {
    startOffset: number;
    targetOffset: number;
    traveledDist: number;
    totalDist: number;
  } | null;
  evasionDecision?: {
    threatId: string;
    willEvade: boolean;
    chosenOffset: number;
    decidedAt: number;
  } | null;
  laneChangeState?: {
    targetLaneId: string;
    direction: 'left' | 'right';
    progress: number;
    initialOffset: number;
    traveledDist?: number;
    totalDist?: number;
    signalWarmup?: number;
  } | null;
  laneChangeCooldown?: number;
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
  intersectionReservationToken?: string | null;
  hasExclusiveIntersectionToken?: boolean;
  stoppedYieldTimer?: number;
  priorityPassUntil?: number;
  priorityPassIgnoreId?: string | null;
  priorityPassReason?: string;

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
  acOn?: boolean;
  recircOn?: boolean;
  fogLevel?: number; // 0.0 (clear) to 1.0 (completely fogged)
  windshieldRainLevel?: number;
  cabinSmoke?: number; // 0 to 100% toxic smoke concentration inside vehicle cabin
  isPtoActive?: boolean; // PTO / PUMP Drive (КОМ - Коробка отбора мощности для водометных, вакуумных и крановых систем)
  isWashingNozzlesActive?: boolean; // Street-washing front nozzles active on truck_water
  // Truck Boom Crane (Автокран КС-3577 / КС-2561К) state
  craneTurretAngle?: number;        // Revolving turret yaw angle relative to truck heading (radians, 0 = forward)
  craneBoomExtension?: number;      // Telescopic boom extension ratio (0.0 retracted .. 1.0 full reach)
  craneBoomElevation?: number;      // Boom luffing elevation ratio (0.0 stowed .. 1.0 raised)
  craneHookHeight?: number;         // Hook winch height (0.0 lowered to ground .. 1.0 raised to boom head)
  craneOutriggersDeployed?: boolean;// Hydraulic outriggers target state
  craneOutriggerExt?: number;       // Smooth 0.0 .. 1.0 outrigger beam deployment progress
  craneOutriggerBeam?: number[];    // Per leg (FL, FR, RL, RR) beam extension 0..1
  craneOutriggerJack?: number[];    // Per leg jack lowering 0..1
  craneOutriggerCmd?: number[];     // Per leg lever command: -1 retract, 0 hold, 1 extend
  craneOutriggerMode?: 'beam' | 'jack'; // What the outrigger levers move: beams or jacks
  craneOutriggerContact?: boolean[];// Per leg: pad is bearing on the ground
  craneChassisRoll?: number;        // Chassis roll from terrain and jacks, radians (right side up positive)
  craneChassisPitch?: number;       // Chassis pitch, radians (nose up positive)
  craneHookedVehicleId?: string | null; // ID of vehicle/trailer currently slung on the crane hook
  craneControlMode?: boolean;       // Operator crane control mode active
  craneOperatorActive?: boolean;    // Operator is seated in revolving crane operator cab ("скворечник")
  craneSpotlightOn?: boolean;       // Work spotlight active on crane cab / boom
  craneOutriggersStationOpen?: boolean; // Ground outrigger station panel active
  _craneTurretVel?: number;         // Transient turret slew angular velocity (rad/s)
  _craneExtVel?: number;            // Transient telescopic boom extension velocity (1/s)
  _craneHookVel?: number;           // Transient hook winch velocity (1/s)
  _craneOutriggerVel?: number[];    // Per-leg outrigger actuator velocity (1/s)
  _craneOutriggerVelMode?: 'beam' | 'jack'; // Mode for which _craneOutriggerVel was computed
  _craneSlingVx?: number;           // Transient pendulum velocity X for slung vehicle (px/s)
  _craneSlingVy?: number;           // Transient pendulum velocity Y for slung vehicle (px/s)
  _craneSlingYawVel?: number;       // Transient torsional pendulum yaw velocity for slung vehicle (rad/s)
  _cranePitchRecoil?: number;       // Transient crane chassis pitch deflection from boom/load dynamics (rad)
  _cranePitchRecoilVel?: number;
  _craneRollRecoil?: number;        // Transient crane chassis roll deflection from slew/load dynamics (rad)
  _craneRollRecoilVel?: number;
  _craneReliefSoundTimer?: number;
  // ТВЭКС ЕК-12-20 Wheeled Excavator Hydraulics, Stabilizers, Blade & Arm State
  exTurretAngle?: number;           // Upper platform yaw angle relative to undercarriage (radians, -PI..PI)
  exBoomElev?: number;              // Main boom elevation (0.0 deepest dig .. 1.0 raised max height)
  exStickExt?: number;              // Stick (рукоять) extension (0.0 tucked in .. 1.0 extended out)
  exBucketCurl?: number;            // Bucket (ковш) curl (0.0 closed/curled .. 1.0 open/dumped)
  exBladePos?: number;              // Front bulldozer blade position (0.0 raised .. 1.0 lowered/dug)
  exOutriggersPos?: number;         // Rear hinged stabilizer outriggers (0.0 stowed .. 1.0 deployed on ground)
  exOutriggersContact?: boolean[];  // [leftPadContact, rightPadContact, bladeContact]
  exChassisRoll?: number;           // Chassis roll from terrain & stabilizers, radians
  exChassisPitch?: number;          // Chassis pitch from terrain & stabilizers, radians
  exAxleOscillationLocked?: boolean;// Front axle balancer hydraulic lock (блокировка качания переднего моста)
  exHydPressureMpa?: number;        // Live main pump pressure (0..32 MPa; nominal 25 MPa, relief 31.5 MPa)
  exHydTempC?: number;              // Hydraulic oil HLP-46 temperature in °C
  exBucketLoad?: number;            // Excavated material volume ratio (0.0 empty .. 1.0 = 0.65 m3 full)
  exBucketMaterial?: 'soil' | 'sand' | 'mud'; // Material currently inside the bucket
  exOperatorMode?: boolean;         // false = Ход (driving undercarriage), true = Работа (excavator arm joysticks)
  exWorkLightOn?: boolean;          // Boom & cab roof halogen work floodlights
  _exSlewVel?: number;              // Transient upper platform slew velocity (rad/s)
  _exBoomVel?: number;              // Transient main boom hydraulic velocity (1/s)
  _exStickVel?: number;             // Transient stick hydraulic velocity (1/s)
  _exBucketVel?: number;            // Transient bucket hydraulic velocity (1/s)
  _exBladeVel?: number;             // Transient front blade hydraulic velocity (1/s)
  _exOutriggerVel?: number;         // Transient rear stabilizers hydraulic velocity (1/s)
  _exDigEffort?: number;            // Smoothed excavation soil resistance (0..1)
  _exPitchRecoil?: number;          // Transient chassis pitch rock from arm inertia/stops (rad)
  _exPitchRecoilVel?: number;
  _exRollRecoil?: number;           // Transient chassis roll rock from slew/arm inertia (rad)
  _exRollRecoilVel?: number;
  _exReliefSoundTimer?: number;
  _exDigCooldown?: number;
  _waterSpraySoundTimer?: number;
  _washSweepTimer?: number;
  _washParticleTimer?: number;
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
  trailerPlugConnected?: boolean;
  trailerBrakesConnected?: boolean;
  trailerParkingBrakeEngaged?: boolean;

  // Tuning & Equipment
  hasChiptuning?: boolean;
  isHeavySuspended?: boolean;
  powertrainLabel?: string;
  massBonusKg?: number;              // hard-parts mass added by powertrain variants (engine+box+turbo+tires)

  // Offroad Physics & Terrain Interaction
  offroadSinkDepth?: number;         // Soil sink depth (0 = rigid surface, 1.0+ = deep mud/bog)
  isBoggedDown?: boolean;            // Vehicle stuck in deep mud with high resistance
  hasTransferCase?: boolean;         // 4x4 Part-time / Full-time transfer case
  transferCaseMode?: '2H' | '4H' | '4L'; // Active transfer case mode
  diffLock?: VehicleDiffLockState;   // Mechanical / pneumatic axle differential locks (МОБ, МКБ)
  _diffLockWarnTimer?: number;
}

export interface VehicleDiffLockState {
  center: boolean; // Межосевая блокировка (МОБ - 50:50 раздаточная коробка)
  rear: boolean;   // Межколесная блокировка задней оси (МКБ-З)
  front: boolean;  // Межколесная блокировка передней оси (МКБ-П)
}

export type DriverArchetype =
  | 'cautious'
  | 'normal'
  | 'confident'
  | 'hurried'
  | 'aggressive'
  | 'elderly'
  | 'professional';

export interface DriverProfile {
  archetype: DriverArchetype;
  speedFactor: number;          // Multiplier on road speed limit (0.80 .. 1.28)
  desiredTimeHeadway: number;   // Desired time gap T in seconds (0.85 .. 2.25)
  minGapFactor: number;         // Multiplier on static standstill gap s0 (0.80 .. 1.45)
  accelFactor: number;          // Multiplier on comfortable acceleration (0.72 .. 1.35)
  comfortBrakeFactor: number;   // Multiplier on comfortable deceleration (0.75 .. 1.32)
  politeness: number;           // MOBIL politeness factor p (0.05 .. 0.90)
  laneChangeThreshold: number;  // MOBIL incentive threshold (px/s^2)
  reactionTime: number;         // Psychomotor perception-reaction time in seconds (0.18 .. 0.78)
  attentiveness: number;        // 0.55 .. 0.98: multi-car lookahead & ability to execute emergency evasive steering
  corneringFactor: number;      // Turn speed multiplier (0.84 .. 1.24)
  preferredLaneBias: number;    // -1 = prefers right lane, +1 = prefers left fast lane
}

export type PedestrianClothingType =
  | 'tshirt'
  | 'tank'
  | 'button_shirt'
  | 'sweater'
  | 'hoodie'
  | 'vest'
  | 'open_jacket'
  | 'suit'
  | 'dress'
  | 'trench'
  | 'raincoat'
  | 'puffer'
  | 'winter_coat'
  | 'parka';

export type PedestrianWeatherTier = 'freezing' | 'cold' | 'cool' | 'mild' | 'hot';

export interface PedestrianBiology {
  heightScale: number;        // 0.68..1.09 individual stature multiplier
  shoulderScale: number;      // 0.84..1.14 individual build multiplier
  ageYears: number;           // 7..82
  fitness: number;            // 0.35..1.0 affects stamina & max sprint speed
  stamina: number;            // 0..100
  coreTempC: number;          // ~36.0..38.2°C physiological thermal balance
  wetness: number;            // 0..100 fabric & skin wetness
  coldLevel: number;          // 0..1 perceived cold stress (triggers shiver/hunch/breath)
  heatLevel: number;          // 0..1 perceived heat stress (slows gait, wiping brow)
  clothingClo: number;        // 0.25..2.4 thermal insulation value of current outfit
  injuryLevel: number;        // 0..100 impact trauma severity
  knockdownTimer: number;     // >0 while fallen/recovering on ground
  knockdownVelX: number;      // Sliding impact velocity X
  knockdownVelY: number;      // Sliding impact velocity Y
  limpSide: -1 | 1;           // Which leg is favoring
  breathPhase: number;        // Respiratory cycle phase (drives chest heave & winter vapor)
  lastHitTime: number;        // Cooldown against multi-frame impact stacking
}

export interface PedestrianPsychology {
  // Stable personality traits (Big-Five inspired, 0..1)
  bravery: number;            // Fight/help vs flight
  sociability: number;        // Greeting likelihood & proxemics
  conscientiousness: number;  // Traffic light compliance & patience
  curiosity: number;          // Stopping to observe crashes/fires/sirens
  neuroticism: number;        // Startle sensitivity & panic persistence
  personalSpace: number;      // Preferred Hall proxemic radius in px (9..16)
  reactionDelay: number;      // Psychomotor perception-reaction delay (0.18..0.68s)

  // Dynamic emotional appraisal state (0..1)
  fear: number;
  arousal: number;
  annoyance: number;
  comfort: number;

  // Attention & gaze tracking
  lookTargetX: number | null;
  lookTargetY: number | null;
  lookTimer: number;
  headYawCurrent: number;     // Smoothed relative head yaw in radians

  // Delayed psychomotor reaction queue
  pendingReactionType: 'dodge' | 'panic' | 'startle' | 'watch' | 'call_112' | null;
  pendingReactionTimer: number;
  pendingReactionAngle: number;
  pendingReactionText: string | null;

  // Cognitive scheduling & memory
  lastThreatX: number;
  lastThreatY: number;
  nextThinkAt: number;        // Staggered LOD cognitive timestamp (seconds)
  lastPosX: number;
  lastPosY: number;
  stuckAccum: number;
  shelterBuildingId: string | null;
  lastSpeechTime: number;
  impatienceTimer: number;
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
  clothingType?: PedestrianClothingType;
  jacketColor?: string;
  innerShirtColor?: string;
  hairStyle?: 'short' | 'long' | 'bald' | 'bun' | 'spiky' | 'ponytail' | 'curly' | 'afro' | 'bob';
  hasHat?: boolean;
  hatColor?: string;
  hatType?: 'cap' | 'beanie' | 'sunhat' | 'fedora' | 'ushanka';
  hasGlasses?: boolean;
  glassesStyle?: 'optical' | 'sunglasses';
  hasHeadphones?: boolean;
  hasShorts?: boolean;
  footwearType?: 'sneakers' | 'boots' | 'winter_boots' | 'loafers' | 'sandals';
  footwearColor?: string;
  scarfColor?: string | null;
  glovesColor?: string | null;
  hoodUp?: boolean;
  weatherTier?: PedestrianWeatherTier;
  ownsUmbrella?: boolean;
  
  // Handheld props
  handheldProp?: 'phone' | 'coffee' | 'bag' | 'box' | 'extinguisher' | null;
  propColor?: string;
  hasDroppedProp?: boolean;
  extinguisherCharges?: number;
  
  // Pedestrian Type & Equipment
  isCyclist?: boolean;
  isScooter?: boolean;
  hasDog?: boolean;
  dogBreed?: 'retriever' | 'husky' | 'shepherd' | 'corgi' | 'terrier';
  dogColor?: string;
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
  pathDirection?: number;
  branchCooldownTimer?: number;
  
  // State & Panic
  state:
    | 'walking'
    | 'waiting_light'
    | 'waiting_traffic'
    | 'crossing'
    | 'panicking'
    | 'waiting_taxi'
    | 'entering_building'
    | 'exiting_building'
    | 'idle_phone'
    | 'idle_window'
    | 'greeting'
    | 'extinguishing_fire'
    | 'knocked_down'
    | 'injured_limp'
    | 'seeking_shelter'
    | 'sheltering'
    | 'watching_incident'
    | 'calling_112'
    | 'resting'
    | 'startled'
    | 'yielding_siren';
  idleSubAction?: 'phone' | 'window' | 'watch' | 'stretch' | 'wave' | 'coffee_sip';
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

  // Biopsychosocial Simulation Engine State
  bio?: PedestrianBiology;
  psy?: PedestrianPsychology;
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
  type: '4way' | '3way' | '3way_T_north' | '3way_T_south' | '3way_T_east' | '3way_T_west' | 'turnaround' | 'fork';
  
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

  // Map-Based Priority & Yield Rules (ПДД + Главная дорога / Уступи дорогу)
  priorityRules?: {
    mainLaneIds?: string[];
    yieldLaneIds?: string[];
    yieldToMap?: { [yieldingLaneId: string]: string[] };
    priorityRoads?: string[];     // IDs of main priority road segments
    yieldRoads?: string[];        // IDs of secondary road segments that must yield
    rules?: {
      fromLaneId: string;
      yieldToLaneId: string;
      mode?: 'yield' | 'stop' | 'priority';
    }[];
  };
}

export interface RoadSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lanes: number;          // Total lanes (e.g. 2 or 4)
  width: number;
  speedLimit?: number;    // Speed limit (used by GPS navigation to prefer faster roads)
  isAvenue: boolean;
  isDirt?: boolean;
  isGravel?: boolean;
  isRoundabout?: boolean;
  direction: 'horizontal' | 'vertical' | 'diagonal' | 'curved';
  curvePoints?: Vector2D[]; // Continuous high-density Bezier curve points along road centerline
  _minX?: number;
  _maxX?: number;
  _minY?: number;
  _maxY?: number;
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
      priority?: 'main' | 'yield' | 'stop';
      yieldToLaneId?: string;      // Explicit target lane ID that vehicle MUST yield to before entering
      yieldToLaneIds?: string[];   // Array of lane IDs that vehicle MUST yield to before entering
      maxTurnAngle?: number;       // Max turn angle limit (radians) for this connection
      yieldRule?: 'yield_to_main' | 'stop_sign' | 'zipper_merge' | 'priority';
      isSecondaryMerge?: boolean;  // Secondary branch or ramp that yields to main road
    }[];
  }[];
}

export interface GuardrailDeformation {
  t: number;             // position along segment 0..1
  lateralOffset: number; // offset in px perpendicular to guardrail normal (-25..+25)
  extent: number;        // longitudinal reach (px)
}

export interface GuardrailSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  curvePoints?: Vector2D[];
  width: number;         // physical width (typically 4-8 px)
  type: 'w_beam' | 'double_w_beam' | 'cable_barrier' | 'concrete_jersey';
  hasStartAttenuator: boolean; // Ударогаситель на начальном торце
  hasEndAttenuator: boolean;   // Ударогаситель на конечном торце
  startAttenuatorCompression: number; // 0..1 (0 = intact, 1 = fully crushed accordion)
  endAttenuatorCompression: number;   // 0..1
  startAttenuatorLength?: number;     // length in px (typically 24-30 px)
  endAttenuatorLength?: number;       // length in px
  deformations: GuardrailDeformation[];
  isSideBarrier?: boolean;            // true if outer shoulder barrier, false if central median
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

export interface ShopInnerItemSpec {
  itemId: string;
  count?: number;
  gummyAttributes?: any;
  pelmenAttributes?: any;
  chocolateAttributes?: any;
  kitchenwareAttributes?: Partial<KitchenwareAttributes>;
  phoneAttributes?: Partial<PhoneAttributes>;
  phonePresetId?: string;
  hardwareAttributes?: Partial<HardwareComponentAttributes>;
  produceAttributes?: Partial<ProduceAttributes>;
  branchAttributes?: Partial<PlantBranchAttributes>;
  meatAttributes?: Partial<MeatAttributes>;
  doughAttributes?: Partial<DoughAttributes>;
  rollingPinAttributes?: Partial<RollingPinAttributes>;
  attributes?: UnifiedAttributes;
}

export interface ShopFluidStorageSpec {
  liquidId: string | null;
  currentMl: number;
  maxMl?: number;
  attributes?: Record<string, any>;
}

export interface MapShopCatalogEntry {
  id: string;
  itemId: string;
  nameRu: string;
  price: number;
  description?: string;
  category: 'food' | 'medical' | 'auto';
  effectText?: string;
  contents?: ShopInnerItemSpec[];
  fluidStorage?: ShopFluidStorageSpec;
  kitchenwareAttributes?: Partial<KitchenwareAttributes>;
  phoneAttributes?: Partial<PhoneAttributes>;
  phonePresetId?: string;
  hardwareAttributes?: Partial<HardwareComponentAttributes>;
  produceAttributes?: Partial<ProduceAttributes>;
  branchAttributes?: Partial<PlantBranchAttributes>;
  meatAttributes?: Partial<MeatAttributes>;
  doughAttributes?: Partial<DoughAttributes>;
  rollingPinAttributes?: Partial<RollingPinAttributes>;
  isOpen?: boolean;
  labelColor?: string;
  containerTintColor?: string;
  packagingSize?: 'mini' | 'small' | 'medium' | 'large' | 'king';
  packagingShape?: CandyPackagingShape | ChocolatePackagingShape;
  originalCatalogId?: string;
  fuelPumpId?: string;
  fuelLiters?: number;
  fuelType?: FuelType;
}

export interface ShopCatalogOverrideConfig {
  catalogPreset?: string;
  priceMultiplier?: number;
  catalog?: MapShopCatalogEntry[];
  addItems?: MapShopCatalogEntry[];
  removeIds?: string[];
}

export interface BuildingShopConfig extends ShopCatalogOverrideConfig {
  roomCatalogs?: Record<string, ShopCatalogOverrideConfig>;
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
  shopConfig?: BuildingShopConfig;
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
    | 'gas_station_island'
    | 'garage_cooperative'
    | 'garage_box'
    | 'garage_workshop'
    | 'garage_gatehouse'
    | 'garage_substation'
    | 'garage_ramp'
    | 'real_estate_agency'
    | 'railway_station'
    | 'railway_platform'
    | 'railway_warehouse'
    | 'railway_crossing_post';
  color: string;
  roofColor: string;
  accentColor: string;
  entranceSide?: 'north' | 'south' | 'east' | 'west';
  entrances?: BuildingEntrance[];
  garageSubtype?: 'brick' | 'silicate' | 'concrete' | 'metal' | 'workshop' | 'gatehouse' | 'ramp' | 'substation';
  garageNumber?: string;
  garageDoorColor?: string;
  garageSign?: string;
  cooperativeName?: string;
  hasOverpass?: boolean;
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
    | 'street_lamp'
    | 'cctv_pole'
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
    | 'sandbox'
    | 'carpet_rack'
    | 'yard_rotunda'
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
    | 'garden_path_tile'
    | 'garage_sofa'
    | 'garage_workbench'
    | 'garage_dirt_pile'
    | 'garage_sand_pile'
    | 'garage_tires_heap'
    | 'garage_scrap_metal'
    | 'tarp_covered_car'
    | 'car_on_blocks'
    | 'oil_barrel_cluster'
    | 'garage_trash_heap'
    | 'railway_signal'
    | 'railway_buffer_stop'
    | 'railway_switch_box'
    | 'railway_crossing_light'
    | 'railway_crossing_gate'
    | 'railway_platform_sign'
    | 'railway_clock'
    | 'railway_catenary_mast'
    | 'railway_picket_post'
    | 'fallen_log'
    | 'tree_stump'
    | 'moss_boulder'
    | 'anthill';
  angle: number;
  rotation?: number;
  intersectionId?: string;
  direction?: 'north' | 'south' | 'east' | 'west';

  isMasterLight?: boolean;
  variant?: number;
  // Gate & Wicket Properties
  isOpen?: boolean;
  isLocked?: boolean;
  plotId?: string;
  lockCode?: string;

  // Streetlamp & Municipal Pole Attributes
  lampStyle?:
    | 'galvanized_octagonal'
    | 'painted_dark_steel'
    | 'twin_mast'
    | 'sv95_soviet'
    | 'centrifuged_round'
    | 'weathered_rusty'
    | 'cast_iron_classic'
    | 'modern_bollard_tall'
    | 'retro_globe';
  bulbType?: 'sodium_dnat' | 'led_cool' | 'led_neutral' | 'mercury_drl' | 'tungsten_warm';
  armType?: 'single' | 'double' | 'curved_gooseneck' | 'top_mounted';
  armLength?: number;               // Custom cantilever arm reach in px
  poleNumber?: string;              // Stenciled municipal inventory number (e.g. "М-104", "К-12")
  hasJunctionBox?: boolean;         // Electrical service hatch / junction cabinet mounted on mast
  hasReflectiveStripes?: boolean;   // High-visibility safety chevrons / reflective bands at base
  hasBannerBracket?: boolean;       // Side street sign / flag bracket on shaft
  hasSpeaker?: boolean;             // Public address horn speaker (ГОЧС) on pole
  hasWarningSign?: boolean;         // Yellow high-voltage warning triangle plaque
  wearLevel?: number;               // 0.0 (factory new) to 1.0 (weathered/rusted/chipped)
  lampFault?: 'none' | 'flicker' | 'dim' | 'dead';

  // Surveillance Camera & Motion-Activated Night Floodlight Attributes
  hasCamera?: boolean;              // Pole equipped with CCTV / traffic surveillance camera
  cameraType?: 'bullet_ir' | 'dome_ptz' | 'traffic_enforcement' | 'dual_security';
  cameraAngle?: number;             // Base surveillance direction (radians)
  cameraFov?: number;               // Horizontal detection sector angle (radians, default ~1.25)
  cameraRange?: number;             // Motion detection & floodlight range in px (default ~205)
  hasCameraFloodlight?: boolean;    // Equipped with motion-activated night LED floodlight
  cameraFloodlightHoldSec?: number; // Seconds floodlight remains ON after object leaves (default 60)

  // Runtime Surveillance State (transient, not persisted in map.json)
  cameraLightTimer?: number;        // Remaining seconds of night floodlight hold (0..60)
  cameraLightIntensity?: number;    // Smoothed 0..1 optical output for realistic snap-on / fade-off
  cameraMotionDetected?: boolean;   // True while any moving target is currently inside FOV
  cameraCurrentAimAngle?: number;   // Active PTZ pan heading (radians)

  // Breakable & Physical Props Simulation State
  isBroken?: boolean;
  breakVX?: number;
  breakVY?: number;
  breakAngle?: number;
  breakSpin?: number;
  waterFountainTimer?: number;

  // First-Principles Structural & Anchor Physics
  originX?: number;          // Fixed world X of concrete foundation / anchor base / underground pipe
  originY?: number;          // Fixed world Y of concrete foundation / anchor base / underground pipe
  originAngle?: number;      // Fixed world angle of foundation pad
  damageLevel?: number;      // 0.0 (intact) to 1.0 (structurally failed / sheared / collapsed)
  tiltAngle?: number;        // World angle (radians) toward which the prop is bent/leaning
  tiltAmount?: number;       // 0.0 to 1.0 plastic bend/lean severity before full shear
  dentLocalX?: number;       // Local X of primary impact dent on box/cylinder prop
  dentLocalY?: number;       // Local Y of primary impact dent
  glassShattered?: boolean;  // Tempered glass/lens shattered before steel frame yields
  lastImpactTime?: number;   // Timestamp (s) of last impact for sound/particle debounce
}

export type LitterType =
  | 'paper'
  | 'newspaper'
  | 'cup'
  | 'can'
  | 'leaf'
  | 'phone'
  | 'coffee'
  | 'box'
  | 'bag'
  | 'bottle'
  | 'wrapper'
  | 'mask'
  | 'butt';

export type LitterSubtype =
  | 'leaf_birch'
  | 'leaf_maple'
  | 'leaf_oak'
  | 'pine_needle'
  | 'catkin'
  | 'twig'
  | 'bark_chip'
  | 'can_cola'
  | 'can_energy'
  | 'can_citrus'
  | 'can_gold'
  | 'bottle_water'
  | 'bottle_amber'
  | 'bottle_emerald'
  | 'bottle_cola';

export interface LitterItem {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  rotationSpeed: number;
  type: LitterType;
  subtype?: LitterSubtype;
  color: string;
  secondaryColor?: string;
  size: number;
  isAirborne?: boolean;
  airborneTimer?: number;
  altitude?: number;
  isGlowing?: boolean;
  vz?: number;
  wetness?: number;
  mudCoat?: number;
  crushed?: number;
  flutterPhase?: number;
  // Unified 3D aerodynamics, rolling kinematics & hydrodynamics
  seed?: number;
  pitch?: number;
  roll?: number;
  pitchVel?: number;
  rollVel?: number;
  rollPhase?: number;
  inWater?: boolean;
  isDynamicFoliage?: boolean;
  spawnTime?: number;
  washDuration?: number;
  sleeping?: boolean;
}

export type BirdSpecies = 'pigeon' | 'sparrow' | 'jay' | 'woodpecker' | 'crow' | 'titmouse';
export type BirdState = 'ground' | 'perched' | 'takeoff' | 'flying' | 'landing';
export type BirdSubState = 'idle' | 'foraging' | 'pecking' | 'preening' | 'alert' | 'social' | 'drumming';
export type BirdFlightMode = 'flapping' | 'gliding' | 'bounding' | 'flaring';

export interface Bird {
  id: string;
  x: number;
  y: number;
  type: BirdSpecies;
  angle: number;
  state: BirdState;
  altitude: number; // 0 on ground, ~24..48 when perched in tree canopy/trunk, up to ~115 in sky
  flyVX: number;
  flyVY: number;
  wingCycle: number;
  walkTimer?: number;
  groupId?: string; // Birds sit/forage/fly in social groups
  perchTreeId?: string;

  // Unified Biological Ethology & Aerodynamic State
  subState?: BirdSubState;
  subStateTimer?: number;
  flightMode?: BirdFlightMode;
  flightModeTimer?: number;
  flightTimer?: number;
  vz?: number;
  targetX?: number;
  targetY?: number;
  targetAltitude?: number;
  homeX?: number;
  homeY?: number;
  alarmDelay?: number; // Staggered flock panic cascade timer (>0 means about to take off)
  alertLevel?: number; // 0..1 vigilance level when watching approaching threats
  threatX?: number;
  threatY?: number;

  // Skeletal / Procedural Animation Parameters
  headYaw?: number;        // Current saccadic head rotation (-1.8 .. +1.8 rad relative to body)
  targetHeadYaw?: number;  // Target head look angle
  headScanTimer?: number;  // Time until next saccadic head turn
  headBobPhase?: number;   // Walking head-bob phase (pigeons, crows)
  hopPhase?: number;       // Bipedal hopping arc phase (0..1 for sparrows, titmice, jays)
  hopHeight?: number;      // Current vertical hop elevation above ground/branch (px)
  peckPhase?: number;      // Pecking / trunk-drumming strike phase
  peckCount?: number;      // Remaining pecks in current burst
  preenSide?: number;      // -1 (left wing) or +1 (right wing) during preening
  bankAngle?: number;      // Aerodynamic roll angle into turns (-0.75 .. +0.75 rad)
  pitchAngle?: number;     // Body pitch (-0.5 diving .. +0.6 climbing/flaring)
  tailSpread?: number;     // 0 (folded sleek) .. 1 (fanned wide for takeoff/landing/banking)
  tailFlickPhase?: number; // Post-hop or alert tail balance wag
  trunkAngle?: number;     // Polar angle around tree trunk for woodpeckers
  bioInitialized?: boolean;
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
  // Volumetric Offroad Rut properties
  depth?: number;          // 0.0 to 1.5+ (depth/sink level into the ground)
  surfaceType?: string;    // 'grass' | 'dirt_road' | 'mud' | 'sand' | 'gravel_road' | 'asphalt' | 'concrete'
  isWet?: boolean;         // wet muddy rut reflection
  bermColor?: string;      // displaced outer soil berm color
  grooveColor?: string;    // dark inner trench shadow color
  slipRatio?: number;      // wheel slip intensity for churned vs rolled tread profile
  arcDist?: number;        // cumulative rolling distance for phase-continuous tread lugs
  trackKind?: 'rubber' | 'mud_carry' | 'wet_carry' | 'oil_carry' | 'sand_carry' | 'rut';
  treadPattern?: 'street' | 'offroad' | 'heavy_lug' | 'slick';
}

export type FluidStainType = 'oil' | 'coolant' | 'fuel' | 'sand' | 'soil' | 'water' | 'sewage' | 'snow_footprint';

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
  // Spreading (liquids only): the film keeps growing until filmCap, stretched along spreadAngle
  filmCap?: number;
  spreadElong?: number;   // 0.5..1.6, how strongly the film stretches as it spreads
  spreadAngle?: number;   // radians, direction the film stretches toward
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
  type: 'tire_smoke' | 'spark' | 'exhaust' | 'engine_smoke' | 'glass_shard' | 'debris' | 'flame' | 'water_splash' | 'rain_drop' | 'water_fountain' | 'leaf' | 'feather' | 'water_spray' | 'dust' | 'mud_clod';
  underVehicle?: boolean;
  initialAlpha?: number;
  z?: number;
  vz?: number;
  splatted?: boolean;
  shapeSeed?: number;
  targetRadius?: number;
  isWet?: boolean;

  // Thermodynamic, condensation & atmospheric simulation properties:
  isSteam?: boolean;          // True for water vapor / cold exhaust condensate / radiator steam / breath
  tempC?: number;             // Emission gas temperature (°C)
  buoyancy?: number;          // Upward thermal buoyancy factor
  expansionRate?: number;     // Volumetric blooming rate
  baseRadius?: number;        // Uncondensed initial radius
  baseColor?: string;         // Underlying gas color before ambient condensation scattering

  // BeamNG-grade impact debris & spark dynamics:
  angle?: number;             // Orientation / rotation angle (rad)
  angularVelocity?: number;   // Spin rate (rad/s)
  aspect?: number;            // Length-to-width aspect ratio for shards / flakes
  secondaryColor?: string;    // Reverse side / primer / dark edge / ember core color
  bounces?: number;           // Remaining ballistic bounces upon ground impact
  streakLength?: number;      // High-velocity streak length multiplier
  debrisSubtype?: 'metal_flake' | 'plastic_chunk' | 'concrete_chip' | 'wood_splinter' | 'sand_grain' | 'liquid_drop';
  glassSubtype?: 'safety_pebble' | 'headlight' | 'taillight' | 'mirror';
  isGrounded?: boolean;
}

export interface WorldWind {
  speed: number;       // Base wind speed in px/s (~10 px/s = 3.6 km/h)
  angle: number;       // Radians direction wind is blowing towards
  vx: number;          // Current effective wind vector X (px/s)
  vy: number;          // Current effective wind vector Y (px/s)
  gust: number;        // Dynamic instantaneous gust multiplier (0.5 to 2.0)
  targetAngle?: number;// Slow macro weather shift in wind direction
  targetSpeed?: number;// Target base speed based on weather
  turbulenceTimer?: number;
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
  wetness?: number;         // Current moisture level 0 to 100 (%) for this specific garment
}

export type EquippedClothing = {
  [slot in ClothingSlot]?: {
    [layer in ClothingLayer]?: InventoryItem;
  };
};

export type ItemCategory = 'food' | 'drink' | 'med' | 'medical' | 'tool' | 'gear' | 'auto' | 'furniture' | 'valuable' | 'clothing' | 'electronics' | 'misc' | 'trash';

export interface PhoneSpecs {
  modelId: string;
  modelName: string;
  seriesName: string;
  brand: string;
  colorNameRu: string;
  colorHex: string;
  accentHex: string;
  storageGb: number;
  storageUsedGb: number;
  cpuModel: string;
  cpuFrequencyGhz: number;
  cpuCores: number;
  ramGb: number;
  ramUsedGb: number;
  batteryCapacityMah: number;
  batteryLevelPct: number;
  isPoweredOn: boolean;
  flashlightOn?: boolean;
  wallpaperId?: string;
  osName?: string;
  osVersion?: string;
  screenSizeInches?: number;
  screenSize?: string;
  refreshRateHz?: number;
  cameraMegaPixels?: number;
  cameraSpecs?: string;
  networkType?: '5G' | 'LTE' | '4G' | 'No SIM';
  signalStrength?: number; // 0 to 4
  airplaneMode?: boolean;
  wifiConnected?: boolean;
  bluetoothConnected?: boolean;
  notes?: string[];
  unreadSmsCount?: number;
}

export interface CookingAttributes {
  boiled: number;
  fried: number;
  baked: number;
  doneness: number;
  charring: number;
  cutLevel: number;
}

export type ContainerVisualShape =
  | 'classic'
  | 'cylinder'
  | 'hexagonal'
  | 'octagonal'
  | 'barrel'
  | 'square'
  | 'amphora'
  | 'rectangular'
  | 'ribbed_drum'
  | 'oval'
  | 'sleek'
  | 'bordeaux'
  | 'burgundy'
  | 'flask'
  | 'bulbous'
  | 'pinched';

export type CandyPackagingShape =
  | 'flat_sachet'   // Плоский четырёхшовный саше-пакет
  | 'pillow'        // Пакет-подушечка (флоу-пак)
  | 'doypack'       // Стоячий дой-пак с зип-локом и донной складкой
  | 'gusset'        // Высокий пакет с боковыми фальцами и плоским дном
  | 'hanging_card'; // Евро-пакет с верхним хедером-подвесом

export type ChocolatePackagingShape =
  | 'mini_foil_wrap'    // Мини-обёртка / фольгированный фантик-конвертик
  | 'flow_bar'          // Узкий герметичный флоу-пак для батончика
  | 'foil_paper_sleeve' // Классическая двухслойная обёртка (фольга + бумажная манжета)
  | 'square_flow'       // Квадратный запаянный пакет / конверт
  | 'triangular_prism'  // Треугольная картонная коробочка-призма
  | 'craft_envelope_xl' // Крупный картонно-фольгированный конверт XXL
  | 'gift_box';         // Подарочная картонная коробка с коррексом и окошком

export type ChocolateShape =
  | 'classic_bar'     // Классическая дольчатая плитка
  | 'chunky_bar'      // Объёмный батончик с округлыми сегментами
  | 'square_tile'     // Квадратная порционная плитка
  | 'triangle_prism'  // Треугольная призма с зубцами
  | 'wafer_stick'     // Вафельно-шоколадная палочка
  | 'truffle_dome'    // Купольная конфета-трюфель
  | 'praline_heart'   // Фигурное шоколадное сердечко
  | 'medallion_coin'  // Шоколадный медальон с тиснением
  | 'shell_seashell'  // Морская ракушка пралине
  | 'diamond_bonbon'  // Огранённый ромб-конфета
  | 'break_piece'     // Отломанная долька со сколом
  | 'wave_bar';       // Волнистая фигурная плитка

export type ChocolateSize =
  | 'mini'    // Мини (конфета / долька, ~12 г)
  | 'small'   // Малый (батончик, ~45 г)
  | 'medium'  // Стандартный (плитка, ~95 г)
  | 'large'   // Большой (крупная плитка, ~180 г)
  | 'king';   // Семейный XXL (макси-плитка, ~300 г)

export interface ChocolateAttributes {
  /** Форма шоколадки */
  shape: ChocolateShape;
  /** Название формы шоколадки на русском языке */
  shapeNameRu: string;
  /** Размер шоколадки */
  size: ChocolateSize;
  /** Название размера шоколадки на русском языке */
  sizeNameRu: string;
  /** Из чего сделана внешняя часть (оболочка / корпус) */
  outerMaterialRu: string;
  /** Цвет внешней части в hex */
  outerColor: string;
  /** Название цвета внешней части на русском языке */
  outerColorNameRu: string;
  /** Из чего сделана внутренняя часть (начинка / сердцевина) */
  innerMaterialRu: string;
  /** Цвет внутренней части в hex */
  innerColor: string;
  /** Название цвета внутренней части на русском языке */
  innerColorNameRu: string;
  /** Есть ли отдельная начинка внутри (влияет на отображение скола/начинки) */
  hasFilling?: boolean;
  /** Процент какао-продуктов во внешней оболочке */
  cocoaPercent?: number;
  /** Вкус / ароматический профиль */
  flavorRu?: string;
  /** Фактура поверхности ('smooth' | 'nuts' | 'crisps' | 'marbled' | 'dusted') */
  surfaceTexture?: 'smooth' | 'nuts' | 'crisps' | 'marbled' | 'dusted';
  /** Полный состав шоколадки (внешняя + внутренняя часть) */
  ingredients: string[];
}

export type GummyCandyShape =
  | 'bear'
  | 'worm'
  | 'berry'
  | 'ring'
  | 'cube'
  | 'cola_bottle'
  | 'star'
  | 'heart';

export interface GummyCandyAttributes {
  /** Цвет мармеладки в hex (напр. '#ef4444') */
  color: string;
  /** Название цвета мармеладки на русском языке */
  colorNameRu: string;
  /** Форма мармеладки */
  shape: GummyCandyShape;
  /** Название формы мармеладки на русском языке */
  shapeNameRu: string;
  /** Состав мармеладки */
  ingredients: string[];
  /** Вкус / аромат мармеладки (опционально) */
  flavorRu?: string;
  /** Кислая сахарная посыпка (опционально) */
  sourDust?: boolean;
}

export type PelmenShape =
  | 'ear'       // Классическое урало-сибирское «ушко» (колечком)
  | 'crescent'  // Полумесяц с фигурной косичкой
  | 'saturn'    // Круглый «Сатурн» с экваториальным пояском
  | 'khinkali'  // Мешочек со складками (бууза / мини-хинкали)
  | 'rose'      // Фигурный бутон «розочка» / тортеллини
  | 'pillow';   // Квадратная подушечка с зубчатым краем (равиоли / кундюмы)

export type PelmenSize =
  | 'mini'      // Мини («Малютки» бульонные, ~7 г)
  | 'small'     // Мелкий («Столичные», ~11 г)
  | 'medium'    // Классический («Сибирские» / «Домашние», ~15 г)
  | 'large';    // Крупный («Богатырские» / «Царские», ~22 г)

export type PelmenState =
  | 'frozen'    // Замороженный (-16 °C)
  | 'raw'       // Сырой охлаждённый (+4 °C)
  | 'boiled'    // Отварной горячий (+72 °C)
  | 'fried';    // Жареный с румяной корочкой (+78 °C)

export interface PelmenAttributes {
  /** Форма лепки пельменя */
  shape: PelmenShape;
  /** Название формы лепки на русском языке */
  shapeNameRu: string;
  /** Калибр / размер пельменя */
  size: PelmenSize;
  /** Название размера на русском языке */
  sizeNameRu: string;
  /** Кулинарное состояние пельменя */
  state: PelmenState;
  /** Название состояния на русском языке */
  stateNameRu: string;
  /** Цвет теста в hex (напр. '#fef3c7') */
  doughColor: string;
  /** Название теста на русском языке (напр. 'Пшеничное на яйцах') */
  doughNameRu: string;
  /** Толщина раскатки теста в мм (напр. 1.2) */
  doughThicknessMm: number;
  /** Описание начинки на русском языке (напр. 'Говядина и свинина с репчатым луком') */
  fillingRu: string;
  /** Цвет начинки в hex */
  fillingColor: string;
  /** Доля начинки в процентах (напр. 60) */
  fillingRatioPercent: number;
  /** Способ лепки (напр. 'Ручная лепка' или 'Автоматная штамповка') */
  moldingMethodRu: string;
  /** Полный состав пельменя (тесто, фарш, специи) */
  ingredients: string[];
  /** Мучная обсыпка снаружи */
  flourDusting?: boolean;
  /** Блеск сливочного масла / бульона */
  butterGlaze?: boolean;
}

export type KitchenwareKind =
  | 'pot'
  | 'saute_pan'
  | 'frying_pan'
  | 'kettle'
  | 'plate'
  | 'bowl'
  | 'mug'
  | 'cup'
  | 'spoon'
  | 'fork'
  | 'kitchen_knife';

export type KitchenwareMaterial =
  | 'stainless_steel'
  | 'enamel_steel'
  | 'aluminum'
  | 'nonstick_aluminum'
  | 'cast_iron'
  | 'ceramic'
  | 'porcelain'
  | 'terracotta_clay'
  | 'glass'
  | 'wood'
  | 'silver'
  | 'copper';

export type KitchenwarePattern =
  | 'none'
  | 'daisies'
  | 'gzhel'
  | 'khokhloma'
  | 'gold_rim'
  | 'blue_rim'
  | 'polka_dots'
  | 'stripes'
  | 'floral'
  | 'wood_grain'
  | 'engraved'
  | 'faceted'
  | 'marbled'
  | 'brushed'
  | 'glaze_drip';

export interface KitchenwareAttributes {
  /** Базовый вид посуды или столового прибора */
  kind: KitchenwareKind;
  /** Материал изготовления (код) */
  material: KitchenwareMaterial;
  /** Из чего сделана посуда (на русском языке) */
  materialRu: string;
  /** Покрытие поверхности (эмаль, тефлон, глазурь, без покрытия и т.д.) */
  coatingRu?: string;
  /** Вмещаемый объём в миллилитрах (0 для приборов без ёмкости, например вилка/нож) */
  capacityMl: number;
  /** Код геометрической формы для 2D-рендера */
  shape: string;
  /** Название формы на русском языке */
  shapeNameRu: string;
  /** Основной цвет в hex */
  color: string;
  /** Название цвета на русском языке */
  colorNameRu: string;
  /** Дополнительный акцентный цвет (ручки, ободок, крышка) в hex */
  accentColor?: string;
  /** Узор / орнамент (код) */
  pattern: KitchenwarePattern;
  /** Название узора на русском языке */
  patternNameRu: string;
  /** Цвет узора в hex */
  patternColor?: string;
  /** Описание крышки (если есть) */
  lidRu?: string;
  /** Описание ручки / рукояти */
  handleRu?: string;
  /** Дополнительные особенности (со свистком, электрический, с блюдцем, 4 зубца и т.д.) */
  featureRu?: string;
  /** Электрический прибор (например электрочайник) */
  isElectric?: boolean;
  /** Наличие свистка (для чайника) */
  hasWhistle?: boolean;
  /** Наличие блюдца (для чашки) */
  hasSaucer?: boolean;
  /** Габарит (диаметр или длина в см) */
  dimensionCm?: number;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export type HardwareComponentKind =
  | 'hw_display'
  | 'hw_cpu'
  | 'hw_ram'
  | 'hw_ssd'
  | 'hw_hdd'
  | 'hw_battery'
  | 'hw_motherboard'
  | 'hw_camera'
  | 'hw_modem'
  | 'hw_speaker'
  | 'hw_charging_port';

export interface HardwareComponentAttributes {
  /** Базовый ID предмета комплектующего в ITEM_CATALOG */
  kind: HardwareComponentKind;
  /** Имя / наименование комплектующего на русском */
  nameRu: string;
  /** Производитель / марка */
  brand: string;
  /** Модель / маркировка */
  model: string;
  /** Из чего сделано (материалы конструкции) */
  materialRu: string;
  /** Как подсоединяется (разъём, шлейф, интерфейс, способ монтажа) */
  connectorRu: string;
  /** Цвет в hex */
  colorHex: string;
  /** Точный RGB-цвет (0-255) */
  colorRgb: RgbColor;
  /** Название цвета на русском */
  colorNameRu: string;
  /** Акцентный цвет (шлейф, контакты, радиатор, наклейка) в hex */
  accentHex?: string;
  /** Размеры / габариты (мм и диагональ) */
  dimensionsRu: string;
  /** Форм-фактор / типоразмер */
  formFactorRu: string;
  /** Вес комплектующего в граммах */
  weightGrams: number;
  /** Объём комплектующего в литрах */
  volumeL: number;
  /** Краткое резюме характеристик */
  specsSummaryRu: string;
  /** Подробные технические характеристики */
  specs: Record<string, string | number>;
  /** Совместимость / область применения */
  compatibilityRu?: string;
}

export interface InstalledHardwareComponent {
  /** Системный слот внутри устройства */
  slot: string;
  /** Название узла / слота на русском */
  slotNameRu: string;
  /** ID отдельного предмета комплектующего в ITEM_CATALOG */
  itemId: HardwareComponentKind;
  /** Полные атрибуты установленного комплектующего */
  attributes: HardwareComponentAttributes;
}

export type PhoneChassisStyle =
  | 'aura'
  | 'quantum'
  | 'pixel'
  | 'cyber'
  | 'compact'
  | 'retro'
  | 'nord'
  | 'nova'
  | 'fold';

export interface PhoneAttributes {
  /** Марка / производитель телефона */
  brand: string;
  /** Серия / линейка */
  seriesName: string;
  /** Точная модель телефона */
  modelName: string;
  /** Код модельного шаблона */
  modelId: string;
  /** Стиль корпуса для процедурной 2D-отрисовки */
  chassisStyle: PhoneChassisStyle;
  /** Цвет корпуса в hex */
  colorHex: string;
  /** Точный RGB-цвет корпуса (0-255) */
  colorRgb: RgbColor;
  /** Название цвета на русском */
  colorNameRu: string;
  /** Акцентный цвет корпуса/рамки/кнопок */
  accentHex: string;
  /** Цвет площадки блока камер (опционально) */
  cameraPlateColor?: string;
  /** Из чего сделан корпус (материалы) */
  materialRu: string;
  /** Форм-фактор корпуса (моноблок, складной, кнопочный и т.д.) */
  formFactorRu: string;
  /** Габариты корпуса (мм) */
  dimensionsRu: string;
  /** Вес телефона в граммах */
  weightGrams: number;
  /** Объём телефона в литрах */
  volumeL: number;
  /** Класс защиты корпуса (напр. IP68) */
  ingressProtectionRu?: string;
  /** Операционная система */
  osName: string;
  osVersion: string;
  /** Установленные комплектующие с их itemId и полными атрибутами */
  components: InstalledHardwareComponent[];
}

export interface ContainerVisualAttributes {
  /** Визуальная форма корпуса банки или бутылки (не меняет объём, вес и характеристики) */
  shape: ContainerVisualShape;
  /** Название формы на русском языке */
  shapeNameRu?: string;
  /** Цвет материала тары (стекло, жесть, алюминий, пластик) в формате RGB [R, G, B] */
  materialRgb: [number, number, number];
  /** Название материала/оттенка тары на русском языке */
  materialNameRu?: string;
  /** Цвет этикетки в формате RGB [R, G, B] (или null, если этикетки нет) */
  labelRgb: [number, number, number] | null;
  /** Дополнительный акцентный цвет этикетки в формате RGB [R, G, B] */
  labelAccentRgb?: [number, number, number];
  /** Цвет крышки / пробки в формате RGB [R, G, B] */
  capRgb?: [number, number, number];
}

export interface UnifiedVisualAttributes {
  /** Форма предмета, тары, лепки или упаковки */
  shape?: string;
  /** Название формы на русском языке */
  shapeNameRu?: string;
  /** Основной цвет в hex/CSS (для продуктов, начинки, жидкости) */
  color?: string;
  /** Название цвета на русском языке */
  colorNameRu?: string;
  /** Дополнительный акцентный цвет в hex/CSS */
  secondaryColor?: string;
  /** Цвет корпуса/фона упаковки в hex/CSS */
  tintColor?: string;
  /** Цвет этикетки в hex/CSS */
  labelColor?: string;
  /** Цвет материала тары в RGB [R, G, B] */
  materialRgb?: [number, number, number];
  /** Название материала на русском языке */
  materialNameRu?: string;
  /** Цвет этикетки тары в RGB [R, G, B] */
  labelRgb?: [number, number, number] | null;
  /** Акцентный цвет этикетки в RGB [R, G, B] */
  labelAccentRgb?: [number, number, number];
  /** Цвет крышки/клипсы в RGB [R, G, B] */
  capRgb?: [number, number, number];
  /** Размер форм-фактора ('mini' | 'small' | 'medium' | 'large') */
  size?: string;
  /** Название размера на русском языке */
  sizeNameRu?: string;
  /** Название узора / рельефа на русском языке */
  patternNameRu?: string;
}

export interface UnifiedAttributes {
  /** Сорт, разновидность, марка или ключевое наименование варианта */
  varietyRu?: string;
  varietyEn?: string;
  /** Единое поле состава ("из чего сделано") для всех предметов, продуктов, жидкостей и смесей */
  ingredients?: string | string[];
  /** Обратная совместимость со старыми JSON-сейвами жидкостей (синхронизируется в ingredients) */
  sourceIngredients?: string | string[];
  /** Способ приготовления, обработки, лепки или производства */
  preparationMethod?: string;
  /** Назначение и область применения */
  purpose?: string;
  /** Происхождение, примечания и детали */
  reasonAndOrigin?: string;
  /** Кулинарное/физическое состояние ('frozen' | 'raw' | 'boiled' | 'fried' | 'sealed' | 'opened' | 'fresh' | 'dried') */
  state?: string;
  /** Локализованное состояние на русском языке */
  stateNameRu?: string;
  /** Вкус / аромат */
  flavorRu?: string;
  /** Размер / калибр */
  size?: string;
  sizeNameRu?: string;
  /** Единые визуальные атрибуты (форма, цвета, материал, этикетка, размер) */
  visuals?: UnifiedVisualAttributes;
  /** Быстрый доступ к цвету содержимого/вещества в hex */
  customColor?: string;
  secondaryColor?: string;
  /** Открыта/вскрыта ли тара или упаковка */
  isOpened?: boolean;
  /** Приготовлено дома без фабричного оборудования (сохраняет реальный домашний состав) */
  isHomemade?: boolean;
  /** Идентификатор кулинарного эквивалента или медицинского эффекта */
  culinaryEquivalentId?: string;
  medicalEffectId?: string;
  /** Визуальные атрибуты тары в формате RGB */
  containerVisuals?: ContainerVisualAttributes;
  /** Кастомные статусные эффекты при употреблении */
  customEffects?: {
    hunger?: number;
    thirst?: number;
    health?: number;
    energy?: number;
    sleepiness?: number;
    soothePanic?: number;
    alcohol?: number;
  };
  customTasteMessages?: string[];
  /** Опциональные расширения для формованных/многослойных и кондитерских изделий */
  doughColor?: string;
  doughNameRu?: string;
  doughThicknessMm?: number;
  fillingRu?: string;
  fillingColor?: string;
  fillingRatioPercent?: number;
  sourDust?: boolean;
  flourDusting?: boolean;
  butterGlaze?: boolean;
  outerMaterialRu?: string;
  outerColor?: string;
  outerColorNameRu?: string;
  innerMaterialRu?: string;
  innerColor?: string;
  innerColorNameRu?: string;
  cocoaPercent?: number;
  hasFilling?: boolean;
  dishType?: string;
  cookingAttributes?: CookingAttributes;
  tasteNotes?: string[];
  /** Форма зерна, хлопьев или макаронного изделия на русском языке */
  productShapeRu?: string;
  /** Идентификатор геометрической формы макаронных изделий для 2D-рендера в окне упаковки */
  pastaShapeId?:
    | 'spaghetti'
    | 'penne'
    | 'fusilli'
    | 'farfalle'
    | 'conchiglie'
    | 'macaroni'
    | 'vermicelli'
    | 'tagliatelle'
    | 'rigatoni'
    | 'orzo'
    | 'stelline';
  /** Сорт, группа муки, категория зерна или класс помола */
  grainGradeRu?: string;
  /** Текстура поверхности и кулинарное поведение (рифлёная, бронзовая матрица, шлифованная и т.д.) */
  surfaceTextureRu?: string;
  /** Рекомендуемое время варки */
  cookingTimeMin?: string;
  /** Отсутствие глютена (безглютеновый продукт) */
  glutenFree?: boolean;
  /** Содержание белка на 100 г сухого продукта */
  proteinPer100g?: number;
  /** Агрегатное состояние / форма средства ('dry' | 'liquid') */
  physicalForm?: 'dry' | 'liquid';
  /** Локализованное описание формы вещества (сухой порошок, жидкий гель и т.д.) */
  physicalFormRu?: string;
  /** Локализованное название цвета вещества */
  substanceColorRu?: string;
  /** Атрибуты посуды и столовых приборов (материал, объём, форма, цвет, узор, крышка, ручка) */
  patternRu?: string;
  patternColor?: string;
  coatingRu?: string;
  capacityMl?: number;
  lidRu?: string;
  handleRu?: string;
  featureRu?: string;
  dimensionCm?: number;
  /** Атрибуты электроники: телефонов и комплектующих */
  brandRu?: string;
  modelRu?: string;
  colorRgb?: RgbColor;
  connectorRu?: string;
  dimensionsRu?: string;
  formFactorRu?: string;
  specsSummaryRu?: string;
  hardwareSpecs?: Record<string, string | number>;
  compatibilityRu?: string;
  installedComponentsCount?: number;
  /** Атрибуты плодоовощной продукции (овощи, фрукты, цитрусы, ягоды, грибы) и веток с плодами */
  juiciness?: number;
  weightGrams?: number;
  cutForm?: ProduceCutForm | MeatCutForm;
  cutFormRu?: string;
  part?: ProducePartKind;
  partNameRu?: string;
  isPeeled?: boolean;
  isDried?: boolean;
  branchKindRu?: string;
  attachedFruitNameRu?: string;
  attachedFruitCount?: number;
}

export type ProduceCategory =
  | 'vegetable'
  | 'fruit'
  | 'citrus'
  | 'large_berry'
  | 'berry'
  | 'mushroom'
  | 'herb';

export type ProduceCutForm =
  | 'whole'
  | 'peeled'
  | 'half'
  | 'quarter'
  | 'chunk'
  | 'wedge'
  | 'slice'
  | 'ring'
  | 'strips'
  | 'diced'
  | 'shredded'
  | 'grated'
  | 'crushed'
  | 'part'
  | 'peel'
  | 'core';

export type ProducePartKind =
  | 'whole_fruit'
  | 'flesh'
  | 'piece'
  | 'clove'
  | 'leaf'
  | 'floret'
  | 'cap'
  | 'stem'
  | 'segment'
  | 'seeds'
  | 'peel'
  | 'core';

export type ProduceSizeTier = 'tiny' | 'small' | 'medium' | 'large' | 'giant';

export interface ProduceAttributes {
  /** Базовый идентификатор вида (единый штучный предмет) */
  speciesId: string;
  /** Группа продукции */
  produceCategory: ProduceCategory;
  /** Сорт / разновидность */
  varietyRu: string;
  /** Сочность (0..100%) */
  juiciness: number;
  /** Вес текущего плода / кусочка в граммах */
  weightGrams: number;
  /** Вес исходного целого плода в граммах */
  baseWholeWeightGrams: number;
  /** Доля от целого плода (0.02..1.0) */
  remainingFraction: number;
  /** Типоразмер */
  size: ProduceSizeTier;
  /** Размер по-русски (напр. «Средний · 7.5 см») */
  sizeNameRu: string;
  /** Характерный линейный размер кусочка в см */
  dimensionCm: number;
  /** Форма нарезки */
  cutForm: ProduceCutForm;
  /** Название формы нарезки по-русски */
  cutFormRu: string;
  /** Модель / анатомическая часть плода */
  part: ProducePartKind;
  /** Название модели / части по-русски */
  partNameRu: string;
  /** Ключ 2D-модели для рендера */
  modelKey: string;
  /** Основной цвет кожицы / плода */
  color: string;
  /** Название цвета по-русски */
  colorNameRu: string;
  /** Цвет мякоти / среза */
  fleshColor: string;
  /** Очищен ли от кожуры / шелухи */
  isPeeled: boolean;
  /** Сушёный / вяленый */
  isDried?: boolean;
  /** Отварной */
  isBoiled?: boolean;
  /** Съедобна ли данная часть (false для кожуры/огрызка) */
  edible?: boolean;
}

export type PlantBranchKind = 'twig' | 'cluster' | 'bunch' | 'mycelium';

export interface PlantBranchAttachedFruit {
  /** Базовый itemId штучного плода */
  itemId: string;
  /** Название плода по-русски */
  nameRu: string;
  /** Текущее количество плодов на ветке */
  count: number;
  /** Изначальное (максимальное) количество плодов на ветке */
  maxCount: number;
  /** Атрибуты каждого плода на ветке */
  fruitAttributes: ProduceAttributes;
}

export interface PlantBranchAttributes {
  /** Тип ветки / кисти / связки */
  branchKind: PlantBranchKind;
  /** Название типа по-русски */
  branchKindRu: string;
  /** Типоразмер ветки */
  size: ProduceSizeTier;
  /** Описание размера по-русски */
  sizeNameRu: string;
  /** Длина ветки в см */
  lengthCm: number;
  /** Вес самой ветки/стебля без плодов (г) */
  branchWeightGrams: number;
  /** Цвет ветки / стебля */
  color: string;
  /** Название цвета ветки по-русски */
  colorNameRu: string;
  /** Материал / текстура ветки */
  materialRu: string;
  /** Свежесть / упругость (0..100%) */
  freshness: number;
  /** Прикреплённый плод на ветке (null — пустая голая ветка) */
  attachedFruit: PlantBranchAttachedFruit | null;
}

export type MeatCategory = 'meat' | 'poultry' | 'fish' | 'seafood' | 'offal';

export type MeatCutForm =
  | 'whole'
  | 'chunk'
  | 'half'
  | 'steak'
  | 'medallion'
  | 'strips'
  | 'cubes'
  | 'minced'
  | 'fillet'
  | 'separated';

export interface MeatAttributes {
  /** Базовый itemId исходного отруба / куска */
  baseItemId: string;
  /** Идентификатор вида (beef, pork, chicken, salmon, squid и др.) */
  speciesId: string;
  /** Название вида по-русски */
  speciesNameRu: string;
  /** Категория (мясо, птица, рыба, морепродукты, субпродукты) */
  meatCategory: MeatCategory;
  /** Исходный анатомический отруб / часть по-русски */
  anatomicalPartRu: string;
  /** Сочность (0..100%) */
  juiciness: number;
  /** Жирность / мраморность (0..100%) */
  fatContent: number;
  /** Текущий вес куска в граммах */
  weightGrams: number;
  /** Исходный вес целого куска / отруба в граммах */
  baseWholeWeightGrams: number;
  /** Доля от исходного куска (0.01..1.0) */
  remainingFraction: number;
  /** Типоразмер */
  size: ProduceSizeTier;
  /** Размер по-русски (напр. «Средний · ~12 см») */
  sizeNameRu: string;
  /** Характерный линейный размер кусочка в см */
  dimensionCm: number;
  /** Форма нарезки */
  cutForm: MeatCutForm;
  /** Название формы нарезки по-русски */
  cutFormRu: string;
  /** Есть ли кость в куске */
  hasBone: boolean;
  /** Есть ли кожа / панцирь / раковина */
  hasSkin: boolean;
  /** Основной цвет мяса (hex) */
  color: string;
  /** Название цвета по-русски */
  colorNameRu: string;
  /** Цвет жира / прожилок / шкурки (hex) */
  fatColor: string;
  /** Можно ли резать ножом (false для голых костей, головы, хребта) */
  cuttable?: boolean;
}

export type RollingPinModel =
  | 'classic_handles'
  | 'french_tapered'
  | 'straight_dowel'
  | 'marble_heavy'
  | 'silicone_nonstick'
  | 'textured_carved'
  | 'mini_pastry';

export type RollingPinShape =
  | 'cylindrical_handles'
  | 'tapered_french'
  | 'straight_cylinder'
  | 'stepped_rings'
  | 'mini_dowel';

export type RollingPinMaterial =
  | 'beech_wood'
  | 'oak_wood'
  | 'birch_wood'
  | 'walnut_wood'
  | 'marble'
  | 'stainless_steel'
  | 'silicone'
  | 'ceramic';

export type RollingPinPattern =
  | 'none'
  | 'wood_grain'
  | 'carved_floral'
  | 'carved_lattice'
  | 'carved_waves'
  | 'carved_folklore'
  | 'marble_veins'
  | 'brushed_metal'
  | 'pastel_speckle';

export interface RollingPinAttributes {
  modelId: RollingPinModel;
  modelNameRu: string;
  shape: RollingPinShape;
  shapeNameRu: string;
  material: RollingPinMaterial;
  materialRu: string;
  color: string;
  colorNameRu: string;
  accentColor: string;
  pattern: RollingPinPattern;
  patternNameRu: string;
  patternColor?: string;
  embossPatternOnDough?: boolean;
  lengthCm: number;
  diameterMm: number;
  handleStyleRu: string;
  rollingEfficiency: number;
}

export type DoughType =
  | 'liquid_batter'
  | 'pancake_batter'
  | 'unleavened_stiff'
  | 'egg_pasta'
  | 'shortcrust'
  | 'rich_sweet'
  | 'sourdough_bread'
  | 'rye_bread'
  | 'corn_dough'
  | 'rice_mochi'
  | 'cocoa_chocolate'
  | 'cottage_cheese'
  | 'potato_gnocchi'
  | 'puff_pastry'
  | 'classic_soft';

export type DoughConsistency = 'batter' | 'soft' | 'elastic' | 'stiff' | 'crumbly';

export type DoughShape =
  | 'lump'
  | 'ball'
  | 'flatbread'
  | 'sheet'
  | 'square_sheet'
  | 'strip'
  | 'rope'
  | 'loaf'
  | 'bun'
  | 'bagel_ring'
  | 'braid'
  | 'croissant_crescent'
  | 'pocket_pirozhok'
  | 'samsa_triangle'
  | 'dumpling_crescent'
  | 'pouch_khinkali'
  | 'roll_strudel'
  | 'open_pie'
  | 'noodles'
  | 'cubes_pieces';

export type DoughCookState =
  | 'raw'
  | 'boiled'
  | 'steamed'
  | 'fried'
  | 'deep_fried'
  | 'baked'
  | 'burnt';

export interface DoughIngredientEntry {
  itemId: string;
  nameRu: string;
  grams: number;
  role: 'flour' | 'liquid' | 'fat' | 'egg' | 'sugar' | 'salt' | 'leavening' | 'dairy' | 'flavor' | 'colorant' | 'starch';
  colorHex: string;
}

export interface DoughFillingEntry {
  itemId: string;
  nameRu: string;
  weightGrams: number;
  colorHex: string;
  stateRu?: string;
  hunger: number;
  energy: number;
  health: number;
  isRawMeat?: boolean;
  isCooked?: boolean;
}

export interface DoughAttributes {
  /** Выведенный по пропорциям тип теста */
  doughType: DoughType;
  /** Название типа теста по-русски */
  doughTypeRu: string;
  /** Консистенция */
  consistency: DoughConsistency;
  consistencyRu: string;
  /** Текущая форма изделия/заготовки */
  shape: DoughShape;
  shapeNameRu: string;
  /** Основной цвет теста (смешанный по пропорциям ингредиентов) */
  color: string;
  colorNameRu: string;
  /** Цвет вкраплений (зелень, отруби, какао, ягоды, специи) */
  fleckColor?: string;
  /** Рельефный узор от узорной скалки */
  embossedPattern?: RollingPinPattern;
  embossedPatternRu?: string;
  /** Вес самого теста в граммах (без начинки) */
  weightGrams: number;
  /** Исходный вес до нарезки */
  baseMassGrams: number;
  /** Толщина пласта/изделия в мм */
  thicknessMm: number;
  /** Характерный диаметр / длина в см */
  diameterCm: number;
  /** Сколько раз раскатано скалкой */
  rolledPasses: number;
  /** Свёрнуто / запечатано ли изделие */
  isFolded: boolean;
  /** Открытый верх (пицца / открытый пирог / ватрушка) */
  isOpenTop: boolean;
  /** Пропорции в граммах */
  flourGrams: number;
  liquidGrams: number;
  fatGrams: number;
  eggGrams: number;
  sugarGrams: number;
  saltGrams: number;
  /** Расчётные кулинарные коэффициенты */
  hydrationPct: number;
  fatPct: number;
  sugarPct: number;
  eggPct: number;
  elasticity: number;       // 0..100
  richness: number;         // 0..100
  sweetness: number;        // 0..100
  saltiness: number;        // 0..100
  leaveningLevel: number;   // 0..100
  leaveningRu: string;
  /** Коэффициент подъёма при выпечке/варке (1.0..1.75) */
  riseFactor: number;
  /** Вместимость начинки для текущей формы/веса (г) */
  maxFillingGrams: number;
  /** Текущий вес уложенной начинки (г) */
  fillingGrams: number;
  /** Состав начинок */
  fillings: DoughFillingEntry[];
  /** Точный состав ингредиентов самого теста */
  ingredients: DoughIngredientEntry[];
  /** Состояние термообработки */
  cookState: DoughCookState;
  cookStateRu: string;
  /** Дополнительные вкусовые акценты (например «с какао», «с зеленью», «со свёклой») */
  flavorNotesRu?: string[];
}

export interface CulinaryItemData {
  isPreparedDish?: boolean;
  isWorkpiece?: boolean;
  isMix?: boolean;
  dishType?: string;
  sourceCookwareItemId?: string;
  containerType?: string;
  denaturation?: number;
  maillard?: number;
  charring?: number;
  hydrolysis?: number;
  cutPieces?: number;
  ingredientsCount?: number;
  ingredientsList?: string[];
  ingredients?: any[];
  liquids?: any[];
  tasteNotes?: string[];
  cookingAttributes?: CookingAttributes;
  platingItem?: InventoryItem;
}

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
  requiresLimbSelection?: boolean;
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
  fullnessPerBite?: number; // Fullness gain per bite/piece
  // Item Thermodynamics & Surface Heat Contact
  temperature?: number;          // Core internal temperature in °C
  surfaceTemperature?: number;   // External surface temperature in °C (outer surface touching hands/pockets)
  wetness?: number;              // Moisture / soaked water percentage 0 to 100 (%)
  soakedLiquidId?: string;       // Dominant liquid coating/soaking this solid item (e.g. 'water', 'broth', 'oil_culinary')
  soakedLiquidNameRu?: string;   // Russian display name of the coating/soaking liquid
  soakedColor?: string;          // Visual tint of the soaking liquid
  submersionLevel?: number;      // 0.0..1.0 fraction submerged inside parent hybrid container liquid
  infusionProgress?: number;     // 0.0..1.0 steeping/infusion/boiling exchange progress in liquid
  cookProgress?: number;         // 0.0..1.0 continuous thermal cooking progression (boil/fry/bake/microwave)
  brownLevel?: number;           // 0.0..1.0 Maillard browning / caramelization / roasted crust progression
  charLevel?: number;            // 0.0..1.0 scorching / pyrolysis / charring progression
  cookMethod?: 'boiled' | 'fried' | 'baked' | 'microwaved' | 'steamed';
  meltLevel?: number;            // 0.0..1.0 melting progression (cheese, butter, chocolate)
  cheeseGlazed?: boolean;        // Coated in melted cheese during pan/oven cooking
  cheeseGlazeColor?: string;     // Color hex of melted cheese glaze coating
  sauteSeasonings?: string[];    // Sautéed aromatics blended onto this food (e.g. 'лук', 'чеснок', 'зелень')
  soapyLevel?: number;           // 0.0..1.0 detergent foam / soapy residue during washing
  heatLossRate?: number;         // Heat loss / cooling coefficient per second (0.001 to 0.50)
  heatRetention?: number;        // Heat retention / insulation factor (0.0 bare metal, 1.0 vacuum thermos)
  ambientTemperature?: number;   // Surrounding ambient medium temperature in °C
  lastThermalUpdate?: number;    // Timestamp (seconds) of last thermal simulation update
  isThermalStable?: boolean;     // Performance optimization flag: item in thermal equilibrium with environment
  // Fluid & Energy metadata
  batteryCharge?: number;   // Battery charge level 0 to 100 (%)
  fluidLiters?: number;     // Remaining fluid volume in liters (L)
  maxFluidLiters?: number;  // Maximum fluid capacity in liters (L)
  fluidType?: 'coolant' | 'oil' | 'fuel';
  originalCatalogId?: string; // Original item definition ID before unified container wrapping
  /** Чисто визуальные атрибуты тары (банки, бутылки, консервы): форма, RGB цвет материала и RGB цвет этикетки */
  containerVisuals?: ContainerVisualAttributes;
  /** Единый стандарт атрибутов для ВСЕХ предметов, продуктов, жидкостей, упаковок и блюд */
  attributes?: UnifiedAttributes;
  fluidStorage?: {
    liquidId: string | null;
    currentMl: number;
    maxMl: number;
    emptyWeightKg: number;
    baseItemNameRu: string;
    baseItemNameEn?: string;
    containerVisuals?: ContainerVisualAttributes;
    attributes?: UnifiedAttributes;
    /** Multi-liquid mixture components sharing the liquid phase */
    components?: Array<{
      liquidId: string;
      ml: number;
      labelRu?: string;
      color?: string;
    }>;
    /** Solid items currently/previously steeped, infused or dissolved into this liquid */
    infusedItems?: Array<{
      itemId: string;
      nameRu: string;
      intensity: number; // 0.0..1.0
      color?: string;
      dissolved?: boolean;
    }>;
    /** Progress (0..1) and active recipe ID for homemade liquid cooking / fermentation */
    homemadeProgress?: number;
    homemadeRecipeId?: string;
    /** Minimum retained volume (ml) for thick solids-rich preserves/stews/purees that cannot boil away to vapor */
    nonVolatileFloorMl?: number;
  };
  culinaryData?: CulinaryItemData;
  /** Атрибуты мармеладки (цвет, форма, состав, посыпка) */
  gummyAttributes?: GummyCandyAttributes;
  /** Атрибуты пельмешка (форма лепки, размер, тесто, начинка, состояние, состав) */
  pelmenAttributes?: PelmenAttributes;
  /** Атрибуты шоколадки (форма, размер, материал и цвет внешней/внутренней части, состав) */
  chocolateAttributes?: ChocolateAttributes;
  /** Атрибуты посуды и столовых приборов (материал, объём, форма, цвет, узор) */
  kitchenwareAttributes?: KitchenwareAttributes;
  /** Атрибуты штучного овоща, фрукта, цитруса, ягоды или гриба (сочность, вес, размер, нарезка, модель/часть) */
  produceAttributes?: ProduceAttributes;
  /** Атрибуты ветки/грозди/пучка с прикреплёнными плодами */
  branchAttributes?: PlantBranchAttributes;
  /** Атрибуты мяса, птицы, рыбы и морепродуктов (вид, отруб, нарезка, вес, размер, сочность, жирность, кость/кожа) */
  meatAttributes?: MeatAttributes;
  /** Атрибуты теста (тип, пропорции, цвет, форма, толщина, вес, узор, начинка и состояние готовки) */
  doughAttributes?: DoughAttributes;
  /** Атрибуты скалки (модель, форма, материал, цвет, узор, габариты, ручки) */
  rollingPinAttributes?: RollingPinAttributes;
  // Nutrition & Biochemical Culinary Simulation
  nutrients?: {
    calories: number; // kcal
    proteins: number; // g
    fats: number;     // g
    carbs: number;    // g
    sugars: number;   // g
    fiber?: number;   // g
    salt?: number;    // g
    water?: number;   // g
  };

  // Container properties (recursive containers: backpack, wallet, plastic bag, pockets, etc.)
  isContainer?: boolean;
  isOpen?: boolean;                 // Whether a single-use or multi-piece package has been opened/unsealed
  singleUseContainer?: boolean;     // Single-use disposable packaging (tears open upon extracting)
  containerItems?: string[];        // Specific item IDs contained inside single-use packaged goods
  tornItemId?: string;              // Item ID of torn leftover packaging (e.g. vacuum_pack_small_torn)
  isTransparentPackaging?: boolean; // Whether the inner contents are visible through transparent packaging
  labelColor?: string;              // Brand seal label / sticker color (hex or CSS color) for paper/plastic packaging
  containerTintColor?: string;      // Package body tint color (hex or CSS color)
  packagingSize?: 'mini' | 'small' | 'medium' | 'large' | 'king'; // Physical form factor size of packaging
  packagingShape?: CandyPackagingShape | ChocolatePackagingShape; // Physical shape/silhouette of candy/chocolate packaging
  packagingShapeNameRu?: string;    // Russian display name of packaging shape
  containerCapacityL?: number;      // Total internal volume capacity in Liters
  maxContainedItemVolumeL?: number; // Max single item volume that fits in this container
  maxContainedWeightKg?: number;    // Max total weight of contained items in kg
  allowedItemCategories?: ItemCategory[]; // Optional category filter (e.g. wallet only for money/valuable)
  contents?: InventoryItem[];       // Items stored inside this container
  // Apartment, real estate and property metadata
  propertyId?: string;
  lockCode?: string;
  cadastralNumber?: string;
  ownerName?: string;
  purchaseDate?: string;
  areaSqM?: number;
  address?: string;
  priceRub?: number;
  roomsCount?: number;
  floor?: string;
  registrationRecord?: string;
  cadastralValueRub?: number;
  sellerName?: string;
  // Car key and document metadata
  vehicleId?: string;
  carName?: string;
  carColor?: string;
  carPrice?: number;
  carType?: CarType;
  keyTier?: 'classic' | 'flip' | 'smart' | 'display';
  keyFeatures?: ('lock' | 'unlock' | 'engine_start' | 'headlights' | 'horn')[];
  vehicleVin?: string;
  vehicleName?: string;
  vehicleColor?: string;
  vehicleYear?: number;
  vehiclePowerHp?: number;
  engineDisplacementCc?: number;
  engineNumber?: string;
  bodyNumber?: string;
  licensePlate?: string;
  documentSeries?: string;
  registrationDate?: string;
  issuingAuthority?: string;
  // Smartphone specifications & hardware
  phoneSpecs?: PhoneSpecs;
  /** Единые структурированные атрибуты телефона (марка, модель, RGB цвет, материал, вес/объём, комплектующие) */
  phoneAttributes?: PhoneAttributes;
  /** Единые структурированные атрибуты комплектующего (дисплей, RAM, SSD, HDD, АКБ, CPU и т.д.) */
  hardwareAttributes?: HardwareComponentAttributes;
  cpu?: string;
  ram?: number;
  storage?: number;
  battery?: number;
}

export interface GroundItem {
  id: string;
  x: number;
  y: number;
  item: InventoryItem;
  spawnTime?: number;
  vx?: number;
  vy?: number;
  angle?: number;
  angularVelocity?: number;
  z?: number;
  vz?: number;
  wetness?: number;
  mudCoat?: number;
  lastInteractTime?: number;
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
  comfort?: number;            // 0 to 100% psychological and physical comfort sensation
  nearRadiator?: boolean;      // whether player is currently basking near an indoor radiator or heat source
  suffocationLevel?: number;   // 0 to 100% respiratory distress & choking
  coughTimer?: number;
  groanTimer?: number;
  heavyBreathTimer?: number;
  shiverTimer?: number;
  tinnitusTimer?: number;
  impactFlashTimer?: number;
  oxygenDebt?: number;         // 0 to 100 anaerobic debt (EPOC) driving panting & heart rate
  muscleFatigue?: number;      // 0 to 100 peripheral muscular lactate/micro-fatigue
  sweatRate?: number;          // L/h thermoregulatory perspiration rate
  metabolicRateMet?: number;   // Current metabolic equivalent (1.0 BMR to ~13+ sprint)
  stomachFood?: number;        // Unabsorbed gastric food pool (0 to 100)
  stomachWater?: number;       // Unabsorbed gastric fluid pool (0 to 100)
  bloodGlucose?: number;       // Glycemic level (40 to 130, ~85 baseline)
}

export interface PlayerNeeds {
  health: number;      // 0 to 100
  maxHealth?: number;
  hunger: number;      // 0 (starving) to 100 (full)
  maxHunger?: number;
  thirst: number;      // 0 (dehydrated) to 100 (quenched)
  maxThirst?: number;
  energy: number;      // 0 (exhausted) to 100 (full stamina)
  maxEnergy?: number;
  sleepiness: number;  // 0 (wide awake) to 100 (drowsy/collapsing)
  maxSleepiness?: number;
  fullness: number;    // 0 (empty stomach) to 100 (stuffed)
  nausea: number;      // 0 (fine) to 100 (vomiting)
  isSleeping?: boolean;
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

export interface PlayerSeatState {
  type: 'bus_seat' | 'train_seat' | 'furniture_seat';
  targetId?: string; // vehicle.id, car.id, or building.id
  furnitureIndex?: number;
  seatIndex?: number;
  localX?: number;
  localY?: number;
  worldX: number;
  worldY: number;
  angle: number;
  labelRu: string;
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
  craneOperatorActive?: boolean;    // Operator is inside the crane cab ("скворечник")
  walkCycle: number;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hairColor: string;
  isInsideBuilding?: boolean;
  insideBuildingId?: string | null;
  currentFloor?: number;
  isInsideApartment?: boolean;
  insideApartmentId?: string | null;
  insideEntranceNumber?: number | null;
  ownedApartmentIds?: string[];
  
  // Passenger Train Carriage Interior
  insideCarId?: string | null;
  carLocalX?: number;
  carLocalY?: number;

  // Passenger Bus Saloon Interior
  insideBusId?: string | null;
  busLocalX?: number;
  busLocalY?: number;

  // Active Seated Posture (Bus, Train, Apartments/Furniture)
  sittingState?: PlayerSeatState | null;
  
  // Creative / Sandbox Mode
  isCreativeMode?: boolean;
  isFlying?: boolean;
  isInvincible?: boolean;
  isCleanMode?: boolean;
  
  // Human Mode Enhancements: Vertical jump & aim
  isDashing?: boolean;
  dashTimer?: number;
  dashAngle?: number;
  z?: number;                       // Height above ground in meters (0 = grounded)
  vz?: number;                      // Vertical velocity in m/s
  isJumping?: boolean;              // True while airborne in jump arc
  jumpCooldown?: number;            // Recovery cooldown after landing (seconds)
  landingImpact?: number;           // Transient landing knee-compression intensity (0..1)
  aimAngle?: number;
  flashlightOn?: boolean;
  phoneFlashlightOn?: boolean;
  actionAnim?: {
    type: string;
    startTime: number;
    duration: number;
    hand?: 'left' | 'right' | 'both';
    itemId?: string;
    intensity?: number;
  } | null;

  // Water & Aquatic Physics
  isSwimming?: boolean;
  isWading?: boolean;
  waterDepth?: number;
  wetFootstepCount?: number;
  swimStrokePhase?: number;

  // Survival Needs & Vitals
  needs: PlayerNeeds;
  bodyState?: BodyState;
  equippedClothing: EquippedClothing;
  name?: string;
  cash?: number;
  activeHoseState?: any;
  leftHandSlotIndex?: number;
  rightHandSlotIndex?: number;
  inventory: InventoryItem[];
  maxInventorySlots: number;
  selectedHotbarIndex?: number;
  heldItemId?: string | null;
  leftHandItem?: InventoryItem | null;
  rightHandItem?: InventoryItem | null;
  activeHand?: 'left' | 'right';
  lastHurtTime?: number;
  isSleeping?: boolean;
  sleepTimer?: number;
  consecutiveWakeHours?: number;
  lastSleepEndHour?: number;
  prevTimeHour?: number;
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

  // Tow rope interaction fields
  heldTowRope?: HeldTowRope | null;
  towRopeAnchor?: {
    vehicleId: string;
    isFront: boolean;
  } | null;
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

export interface RailwayTrackSegment {
  id: string;
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  curvePoints?: Vector2D[];
  trackType: 'mainline' | 'station' | 'siding' | 'deadend';
  gauge?: number;              // default 16 px (~1520 mm Russian broad gauge)
  ballastWidth?: number;       // default 38 px
  sleepersType?: 'concrete' | 'wood';
  hasBufferStop?: boolean;
  bufferStopEnd?: 'start' | 'end';
  isElectrified?: boolean;
  isCrossing?: boolean;
  crossingRoadName?: string;
  isSwitch?: boolean;
  switchData?: {
    branchDirection: 'left' | 'right';
    pointX: number;
    pointY: number;
    frogX: number;
    frogY: number;
    divergingAngle: number;
  };
}

export interface RailwayPlatform {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  platformNumber: number;
  trackSide: 'north' | 'south' | 'island';
  hasCanopy?: boolean;
  canopySegments?: { x: number; y: number; w: number; h: number }[];
}

export interface RollingStockCar {
  id: string;
  name: string;
  type: 
    | 'locomotive_diesel'
    | 'locomotive_passenger'
    | 'locomotive_shunter'
    | 'locomotive_diesel_chme3' 
    | 'locomotive_electric_vl80' 
    | 'passenger_coach_rzhd' 
    | 'passenger_coach_platskart'
    | 'freight_hopper' 
    | 'freight_tanker' 
    | 'freight_flatcar_timber'
    | string;
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  color?: string;
  livery?: string;
  roadNumber?: string;
  hasHeadlight?: boolean;
  headlightColor?: string;
  cargoType?: string;
  trainId?: string;
  carIndex?: number;
  speed?: number;
  targetSpeed?: number;
  direction?: 1 | -1;
  throttle?: number;
  brakeState?: 'released' | 'service' | 'emergency';
  hornTimer?: number;
  wheelClickTimer?: number;
  isSectionB?: boolean;
  isFlipped?: boolean;
  railTrackY?: number; // track Y the car is actually on (cars switch turnouts one by one)
  isPlayerInside?: boolean;
}

export type RailwaySignalType =
  | 'entry'       // Входной (Н, Ч, НД, ЧД)
  | 'exit'        // Выходной (Ч1, Н1, Ч2, Н2, Ч3, Н3, Ч4, Н4)
  | 'block'       // Проходной автоблокировки (1, 2, 3, 4, 5, 6)
  | 'shunting'    // Маневровый (М1, М2, М3, М4, М5, М6, М7, М8, М10)
  | 'obstacle'    // Заградительный переездной (З1, З2)
  | 'repeater'    // Повторительный (ПЧ3)
  | 'crossing';   // Переездный светофор дорожный

export type RailwaySignalMast = 'mast' | 'dwarf' | 'bridge' | 'crossing';

export type RailwayLensColor = 'green' | 'yellow' | 'red' | 'white' | 'blue';

export type RailwaySignalAspect =
  | 'green'
  | 'yellow'
  | 'two_yellows'
  | 'yellow_flashing_yellow'
  | 'two_yellows_one_flashing'
  | 'yellow_flashing'
  | 'red'
  | 'lunar_white'
  | 'lunar_white_flashing'
  | 'blue'
  | 'red_alternating'
  | 'red_alternating_flashing'
  | 'dark';

export interface RailwaySignalCondition {
  triggerType: 'train_on_track' | 'train_approach' | 'switch_state' | 'signal_state' | 'schedule_active' | 'always';
  trackId?: string;
  signalId?: string;
  expectedState?: string;
  targetAspect: RailwaySignalAspect;
  description?: string;
}

export interface RailwaySignalLogic {
  mode: 'auto_block' | 'interlocking' | 'manual' | 'conditional' | 'schedule_route';
  defaultAspect?: RailwaySignalAspect;
  divergingAspect?: RailwaySignalAspect;
  conditions?: RailwaySignalCondition[];
}

export interface RailwaySignalFilament {
  temp: number; // 0.0 (ambient/cold) to 1.0 (nominal white-hot ~2400K operating temperature)
  brightness: number; // 0.0 to 1.0 (actual emitted visible optical flux)
  voltage: number; // 0.0 to 1.0 (supplied circuit voltage from relays)
  coldTestPulse?: number; // 0.0 to 1.0 (brief test impulse from fire-relay continuity check)
}

export type RailwayRelayPhase = 'steady' | 'code_decoding' | 'blackout' | 'lamp_check';

export interface RailwaySignal {
  id: string;
  name: string;
  nameRu?: string;
  type: RailwaySignalType;
  mastType: RailwaySignalMast;
  designation: string; // e.g. "Н", "Ч", "Ч1", "Н2", "М1", "3"
  x: number;
  y: number;
  angle: number; // Face orientation angle in radians
  lenses: RailwayLensColor[]; // Configuration of lens cluster from top to bottom
  currentAspect: RailwaySignalAspect;
  linkedTrackId?: string;
  nextSignalId?: string;
  targetTrack?: string; // Target track designation or name (e.g. "Главный I путь", "Путь 3 (Платформа 1)")
  switchNumber?: string; // Governed switch number for shunting (e.g. "1", "2", "5/6")
  isApproachSignal?: boolean; // Has diagonal striped approach marker plate
  isCrossingGate?: boolean;
  barrierLength?: number; // Lowered boom length in pixels
  barrierProgress?: number; // 0.0 (fully open/raised) to 1.0 (fully closed/lowered)
  logic?: RailwaySignalLogic;

  // Real-world physical electro-mechanical relay and incandescent filament simulation:
  targetAspect?: RailwaySignalAspect; // desired aspect requested by track circuits / interlocking logic
  pendingAspect?: RailwaySignalAspect; // aspect queued to turn on after code reception and fire-check
  relayPhase?: RailwayRelayPhase; // current state of relay logic ('steady' | 'code_decoding' | 'blackout' | 'lamp_check')
  relayTimer?: number; // countdown timer in current relay phase (seconds)
  filaments?: RailwaySignalFilament[]; // thermal & optical state of each individual lens filament
}

export interface TrainScheduleConsistCar {
  type: RollingStockCar['type'];
  name?: string;
  livery?: string;
  roadNumber?: string;
  cargoType?: string;
}

export interface TrainScheduleRouteStep {
  id: string;
  type: 'travel' | 'switch_branch' | 'station_stop' | 'signal_hold' | 'reverse' | 'despawn';
  targetX?: number;
  targetY?: number;
  trackId?: string;
  speedLimit?: number;
  dwellSeconds?: number;
  switchTrackId?: string;
  switchBranch?: 'straight' | 'diverging';
  signalId?: string;
  signalClearAspect?: RailwaySignalAspect;
  stationName?: string;
}

export interface TrainSchedule {
  id: string;
  name: string;
  trainId: string;
  enabled?: boolean;
  spawnTime: number; // seconds from game start
  repeatInterval?: number; // seconds between loops (e.g. 300)
  spawnTrackId?: string;
  spawnX: number;
  spawnY: number;
  spawnSpeed: number;
  spawnDirection: 1 | -1;
  maxSpeed?: number;
  acceleration?: number;
  deceleration?: number;
  locomotive: {
    type: RollingStockCar['type'];
    name?: string;
    livery?: string;
    roadNumber?: string;
    headlightColor?: string;
  };
  cars: TrainScheduleConsistCar[];
  routeSteps: TrainScheduleRouteStep[];
}

export interface MinimapMarker {
  id: string;
  nameRu: string;
  nameEn?: string;
  x: number;
  y: number;
  iconKey: 'car' | 'hospital' | 'police' | 'fire' | 'mall' | 'garage' | 'fuel' | 'food' | 'pharmacy' | 'nature' | 'mountain' | 'industrial' | 'agency' | 'train' | 'spawn' | string;
  category?: 'spawns' | 'gas_stations' | 'services' | 'shops' | 'nature' | 'industrial' | 'custom' | string;
  badgeColor?: string;
  description?: string;
}

export interface MapSpawnPoint {
  id: string;
  nameRu: string;
  nameEn?: string;
  x: number;
  y: number;
  description?: string;
  iconKey?: string;
}

export interface PedestrianPath {
  id: string;
  waypoints: Vector2D[];
  isCrosswalk?: boolean;
  crosswalkRef?: string;
}

export interface DetachedVehiclePart {
  id: string;
  vehicleId: string;
  partType: 'hood' | 'bumper_front' | 'bumper_rear' | 'door_left' | 'door_right';
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  length: number;
  width: number;
  life: number;
  maxLife: number;
  strain?: number;
}

export interface GameWorld {
  player?: Player;
  timeOfDay?: any;
  gameMode?: GameMode;
  aiTrafficEnabled?: boolean;
  aiTrafficDensity?: 'off' | 'low' | 'normal' | 'high';
  aiPedestriansEnabled?: boolean;
  width: number;
  height: number;
  roads: RoadSegment[];
  railwayTracks?: RailwayTrackSegment[];
  railwayPlatforms?: RailwayPlatform[];
  rollingStock?: RollingStockCar[];
  railwaySignals?: RailwaySignal[];
  trainSchedules?: TrainSchedule[];
  minimapMarkers?: MinimapMarker[];
  spawnPoints?: MapSpawnPoint[];
  shopCatalogPresets?: Record<string, MapShopCatalogEntry[]>;
  intersections: Intersection[];
  roundabouts?: Roundabout[];
  sidewalks?: SidewalkBlock[];
  buildings: Building[];
  parkings: ParkingArea[];
  driveways?: StaticDriveway[];
  trees: Tree[];
  props: StreetProp[];
  guardrails?: GuardrailSegment[];
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
  previousWeather?: WeatherType;
  weatherTransition?: number;
  timeHour?: number;
  calendar?: GameCalendarState;
  season?: Season;
  cleanMode?: boolean;
  outsideTemp?: number;
  humidity?: number;
  wind?: WorldWind;
  // Persistent ground hydrology & snowpack simulation (0..1 continuous physical state)
  surfaceWetness?: number;     // Asphalt / concrete moisture film (dries based on temp, sun, wind, humidity)
  soilMoisture?: number;       // Offroad dirt / grass / mud saturation (dries ~3.5x slower than asphalt)
  snowCover?: number;          // Ground / grass / roof snow depth (accumulates from snowfall, melts into water)
  roadSnowCover?: number;      // Asphalt / pavement snow cover (melts/compacts faster than grass/roofs)
  slushLevel?: number;         // Wet snow-water slush on roads near 0..+2°C
  iceFreezeProgress?: number;  // 0 (liquid) -> 0.5 (brittle crust) -> 1 (solid ice) gradual freeze/thaw state
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
  pedestrianPaths: PedestrianPath[];
  towingRopes?: TowingRope[];
  detachedParts?: DetachedVehiclePart[];
  impactFreezeTimer?: number;
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
  shakeVx?: number;
  shakeVy?: number;
  gridMode?: boolean;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brakeLeft?: boolean;  // Separate left brake pedal (for MTZ)
  brakeRight?: boolean; // Separate right brake pedal (for MTZ)
  steeringAxis?: number; // Analog steering input (-1.0 left to +1.0 right) for mobile steering wheel or gamepad
  handbrake: boolean;
  jump?: boolean;
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
  transferCaseToggle?: boolean;
  diffLockToggle?: boolean;
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
  lookOffsetX?: number; // Normalized custom look offset X (-1.0 to 1.0)
  lookOffsetY?: number; // Normalized custom look offset Y (-1.0 to 1.0)
  isTouchLookActive?: boolean;
  lastPointerType?: 'mouse' | 'touch';
  // Crane operator controls (keyboard & mobile touch)
  craneTurretLeft?: boolean;
  craneTurretRight?: boolean;
  craneBoomExtend?: boolean;
  craneBoomRetract?: boolean;
  craneBoomUp?: boolean;
  craneBoomDown?: boolean;
  craneHookUp?: boolean;
  craneHookDown?: boolean;
  craneHorn?: boolean;
  craneSpotlightToggle?: boolean;
  // Excavator (ТВЭКС ЕК-12) operator controls (keyboard, console levers, mobile touch)
  exSlewLeft?: boolean;
  exSlewRight?: boolean;
  exBoomUp?: boolean;
  exBoomDown?: boolean;
  exStickOut?: boolean;
  exStickIn?: boolean;
  exBucketCurl?: boolean;
  exBucketDump?: boolean;
  exBladeUp?: boolean;
  exBladeDown?: boolean;
  exStabilizersDown?: boolean;
  exStabilizersUp?: boolean;
}

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
  | 'bus' 
  | 'van' 
  | 'muscle' 
  | 'ambulance'
  | 'truck_box'
  | 'truck_dump'
  | 'truck_tanker'
  | 'truck_flatbed'
  | 'cement_mixer'
  | 'garbage_truck';

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
}

export interface DeformVertex {
  localX: number;
  localY: number;
  offsetX: number;
  offsetY: number;
}

export interface ScratchMark {
  x: number; // Local car coordinate X (-halfL to +halfL)
  y: number; // Local car coordinate Y (-halfW to +halfW)
  length: number;
  angle: number;
  depth: number;
}

export interface VehicleDamage {
  health: number; // 0 (wrecked) to 100 (pristine)
  // Localized deformation depth in pixels
  frontCrumple: number;     // 0 to 15 px (hood & front bumper crushed inward)
  rearCrumple: number;      // 0 to 12 px (trunk & rear bumper crushed inward)
  leftDent: number;         // 0 to 8 px (driver door/panel pressed inward)
  rightDent: number;        // 0 to 8 px (passenger door/panel pressed inward)
  frontLeftDent: number;    // 0 to 10 px
  frontRightDent: number;   // 0 to 10 px
  rearLeftDent: number;     // 0 to 8 px
  rearRightDent: number;    // 0 to 8 px

  // Structural and visual components
  hoodBuckled: boolean;
  windshieldCracked: boolean;
  rearGlassCracked: boolean;
  leftHeadlightBroken: boolean;
  rightHeadlightBroken: boolean;
  leftTaillightBroken: boolean;
  rightTaillightBroken: boolean;
  engineSmoking: boolean;
  engineFire: boolean;

  // Scraped paint & scratches
  scratches: ScratchMark[];
  
  // Dynamic 3D/2D mesh vertices for organic deformation
  deformedVertices?: DeformVertex[];
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

  // Damage & Deformation
  damage: VehicleDamage;
  lastDamageTime?: number;

  // Physical Knockback Impulse & Physics State
  knockbackVx?: number;
  knockbackVy?: number;
  knockbackSpin?: number;
  stunnedTimer?: number;

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
  currentConnection?: {
    targetLaneId: string;
    turnType: 'straight' | 'left' | 'right' | 'turnaround';
    pathWaypoints: Vector2D[];
    intersectionId?: string;
    stopLineDirection?: 'north' | 'south' | 'east' | 'west';
  } | null;
  stuckTimer: number;
  honkTimer: number;

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
  hairStyle?: 'short' | 'long' | 'bald' | 'bun' | 'spiky' | 'ponytail';
  hasHat?: boolean;
  hatColor?: string;
  hatType?: 'cap' | 'beanie' | 'sunhat';
  
  // Handheld props
  handheldProp?: 'phone' | 'coffee' | 'bag' | 'box' | null;
  propColor?: string;
  hasDroppedProp?: boolean;
  
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
  state: 'walking' | 'waiting_light' | 'waiting_traffic' | 'crossing' | 'panicking' | 'waiting_taxi' | 'entering_building' | 'exiting_building' | 'idle_phone' | 'idle_window' | 'greeting';
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

export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'office' | 'residential' | 'shop' | 'suburban' | 'industrial' | 'park_monument' | 'police_station' | 'fire_station' | 'hospital';
  color: string;
  roofColor: string;
  accentColor: string;
  entranceSide?: 'north' | 'south' | 'east' | 'west';
  balconies?: {
    side: 'north' | 'south' | 'east' | 'west';
    offset: number; // relative coordinate along the side
    length: number;
    depth: number;
  }[];
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
}

export interface ParkingArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spots: {
    x: number;
    y: number;
    angle: number;
    occupied: boolean;
    vehicleId?: string;
  }[];
}

export interface Tree {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  shadowOffset: number;
}

export interface StreetProp {
  id: string;
  x: number;
  y: number;
  type: 
    | 'bench' 
    | 'lamp' 
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
    | 'garage_door';
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

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  isInVehicle: boolean;
  currentVehicleId: string | null;
  walkCycle: number;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hairColor: string;
  isInsideBuilding?: boolean;
  insideBuildingId?: string | null;
  
  // Human Mode Enhancements: Dodge roll, quick dash & aim
  isDashing?: boolean;
  dashTimer?: number;
  dashAngle?: number;
  aimAngle?: number;
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
}

export interface GpsDestination {
  x: number;
  y: number;
  name?: string;
}

export interface GameWorld {
  width: number;
  height: number;
  roads: RoadSegment[];
  intersections: Intersection[];
  sidewalks?: SidewalkBlock[];
  buildings: Building[];
  parkings: ParkingArea[];
  trees: Tree[];
  props: StreetProp[];
  vehicles: Vehicle[];
  pedestrians: Pedestrian[];
  birds: Bird[];
  puddles: Puddle[];
  litter: LitterItem[];
  skidMarks: SkidMark[];
  particles: Particle[];
  weather: WeatherType;
  lightningFlashTimer?: number;
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
  hazardX: boolean;
  mouseX: number;
  mouseY: number;
  isMouseDown: boolean;
}

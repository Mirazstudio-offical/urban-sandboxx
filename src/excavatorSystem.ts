import type { GameWorld, InputState, Player, Vehicle } from './types';
import { getTerrainSlope } from './terrainElevation';
import { hasPtoDrive } from './ptoSystem';
import { sound } from './audio';
import { addPlayerNotification } from './items';

// ============================================================================
// ТВЭКС ЕК-12-20 DOCUMENTED TECHNICAL DATA (ОАО «Тверской экскаватор»)
// ============================================================================
export const EK12_SPECS = {
  modelRu: 'ТВЭКС ЕК-12-20',
  massKg: 13200,
  engineRu: 'ММЗ Д-245.12С (105 л.с.)',
  wheelBaseMm: 2750,
  trackWidthMm: 1960,
  bladeWidthMm: 2500,
  tailSwingRadiusMm: 2150,
  boomLengthM: 4.25,
  stickLengthM: 2.20,
  bucketCapacityM3: 0.65,
  maxDigRadiusM: 7.9,
  maxDigDepthM: 4.8,
  maxDumpHeightM: 5.9,
  slewSpeedRpm: 9.0,
  nominalPressureMpa: 25.0,
  reliefPressureMpa: 31.5,
  standbyPressureMpa: 2.4,
  hydraulicTankL: 200,
  fuelTankL: 210,
} as const;

// Exhaust stack position in turret-local px (1 m = 10 px). Shared by the renderer (stack sprite)
// and by the smoke emitter in physics.ts so the smoke leaves the pipe and follows the turret.
export const EK12_EXHAUST_LOCAL = { x: -8.4, y: 2.8 } as const;
// Turret slewing ring centre in vehicle-local px (must match getExcavatorGeometry).
export const EK12_TURRET_LOCAL_X = -1.8;

const TERRAIN_K = 2.5;
const ATTITUDE_RATE = 4.0;
const SLEW_SPEED_RAD_S = (EK12_SPECS.slewSpeedRpm * Math.PI * 2) / 60; // ~0.942 rad/s
const BOOM_RATE = 0.42;
const STICK_RATE = 0.50;
const BUCKET_RATE = 0.72;
const BLADE_RATE = 0.55;
const OUTRIGGER_RATE = 0.44;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const normalizeAngle = (a: number) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

export function isExcavatorVehicle(car: Vehicle | { type?: string } | null | undefined): boolean {
  return !!car && car.type === 'excavator_ek12';
}

export function ensureExcavatorState(v: Vehicle): void {
  if (!isExcavatorVehicle(v)) return;
  if (v.exTurretAngle === undefined) v.exTurretAngle = 0;
  if (v.exBoomElev === undefined) v.exBoomElev = 0.56;
  if (v.exStickExt === undefined) v.exStickExt = 0.18;
  if (v.exBucketCurl === undefined) v.exBucketCurl = 0.16;
  if (v.exBladePos === undefined) v.exBladePos = 0.0;
  if (v.exOutriggersPos === undefined) v.exOutriggersPos = 0.0;
  if (!v.exOutriggersContact || v.exOutriggersContact.length !== 3) {
    v.exOutriggersContact = [false, false, false];
  }
  if (v.exChassisRoll === undefined) v.exChassisRoll = 0;
  if (v.exChassisPitch === undefined) v.exChassisPitch = 0;
  if (v.exAxleOscillationLocked === undefined) v.exAxleOscillationLocked = false;
  if (v.exHydPressureMpa === undefined) v.exHydPressureMpa = 0;
  if (v.exHydTempC === undefined) v.exHydTempC = 28;
  if (v.exBucketLoad === undefined) v.exBucketLoad = 0;
  if (v.exBucketMaterial === undefined) v.exBucketMaterial = 'soil';
  if (v.exOperatorMode === undefined) v.exOperatorMode = false;
  if (v.exWorkLightOn === undefined) v.exWorkLightOn = false;
}

export interface ExcavatorGeometry {
  turretLocalX: number;
  turretLocalY: number;
  turretAngle: number;
  boomElev: number;
  stickExt: number;
  bucketCurl: number;
  bladePos: number;
  outriggersPos: number;
  // Local turret-aligned arm pivot & signed radial/vertical profile (meters, 1 m = 10 px)
  boomStartLocalX: number;
  armMountOffsetY: number; // Boom is mounted slightly right of center (+1.6px) next to left cab
  boomBaseR_m: number;
  boomBaseZ_m: number;
  boomKneeR_m: number;
  boomKneeZ_m: number;
  boomTipR_m: number;
  boomTipZ_m: number;
  stickTipR_m: number;
  stickTipZ_m: number;
  bucketMidR_m: number;
  bucketMidZ_m: number;
  bucketTipR_m: number;
  bucketTipZ_m: number;
  boomLowerPitch: number;
  boomUpperPitch: number;
  stickPitch: number;
  bucketPitch: number;
  // Legacy-friendly signed horizontal projections in px
  boomHorizPx: number;
  stickHorizPx: number;
  bucketHorizPx: number;
  boomTipHeightM: number;
  stickTipHeightM: number;
  bucketHeightM: number;
  reachMeters: number;
  // World coordinates (ground plane projection z=0)
  worldTurretX: number;
  worldTurretY: number;
  worldBoomStartX: number;
  worldBoomStartY: number;
  worldBoomTipX: number;
  worldBoomTipY: number;
  worldStickTipX: number;
  worldStickTipY: number;
  worldBucketX: number;
  worldBucketY: number;
  worldBladeCenterX: number;
  worldBladeCenterY: number;
  worldArmAngle: number;
  isBucketGroundLevel: boolean;
}

export function getExcavatorGeometry(v: Vehicle): ExcavatorGeometry {
  const halfL = (v.length || 49) / 2;
  const turretLocalX = EK12_TURRET_LOCAL_X;
  const turretLocalY = 0;
  const turretAngle = v.exTurretAngle ?? 0;
  const boomElev = clamp01(v.exBoomElev ?? 0.56);
  const stickExt = clamp01(v.exStickExt ?? 0.18);
  const bucketCurl = clamp01(v.exBucketCurl ?? 0.16);
  const bladePos = clamp01(v.exBladePos ?? 0);
  const outriggersPos = clamp01(v.exOutriggersPos ?? 0);

  // Scale: 1 meter = 10 world pixels (matches EK-12 2.5m width = 25px, 4.9m chassis = 49px)
  const PX_PER_M = 10.0;
  // Boom mounts ahead of counterweight (+3.8px = 0.38m) and slightly right (+1.6px) beside the left operator cab
  const boomBaseR_m = 0.38;
  const boomBaseZ_m = 1.65;
  const boomStartLocalX = boomBaseR_m * PX_PER_M;
  const armMountOffsetY = 1.6;

  // True rigid 2D side-plane kinematics (r = forward reach from turret center, z = elevation above ground):
  // 1) Curved gooseneck monoboom (TVEX EK-12 4.25m chord: lower 2.15m + upper 2.25m with 32 deg gooseneck bend)
  // boomElev = 0.0 -> lowered deep for trenching; boomElev = 1.0 -> raised high for truck loading
  const boomBasePitch = -0.64 + boomElev * 1.62; // -36.7 deg .. +56.1 deg (strictly monotonic!)
  const boomLowerPitch = boomBasePitch + 0.32;
  const boomUpperPitch = boomBasePitch - 0.24;

  const L_BOOM_LOWER = 2.15;
  const L_BOOM_UPPER = 2.25;
  const boomKneeR_m = boomBaseR_m + Math.cos(boomLowerPitch) * L_BOOM_LOWER;
  const boomKneeZ_m = boomBaseZ_m + Math.sin(boomLowerPitch) * L_BOOM_LOWER;
  const boomTipR_m = boomKneeR_m + Math.cos(boomUpperPitch) * L_BOOM_UPPER;
  const boomTipZ_m = boomKneeZ_m + Math.sin(boomUpperPitch) * L_BOOM_UPPER;

  // 2) Stick / dipper arm (2.20 m), hinged at boom tip
  // stickExt = 0.0 -> folded tightly inward under the boom; stickExt = 1.0 -> extended far outward
  // Uses SIGNED Math.cos(stickPitch) so pulling stick IN genuinely tucks bucket back toward the cab!
  const L_STICK = EK12_SPECS.stickLengthM; // 2.20 m
  const stickRelAngle = -2.18 + stickExt * 1.72; // -125 deg (tucked) .. -26 deg (extended)
  const stickPitch = boomUpperPitch + stickRelAngle;
  const stickTipR_m = boomTipR_m + Math.cos(stickPitch) * L_STICK;
  const stickTipZ_m = boomTipZ_m + Math.sin(stickPitch) * L_STICK;

  // 3) Backhoe bucket (1.05 m pin-to-teeth), hinged at stick tip
  // bucketCurl = 0.0 -> curled closed (scooping); bucketCurl = 1.0 -> swung open (dumping)
  const L_BUCKET = 1.05;
  const bucketRelAngle = -2.05 + bucketCurl * 2.20; // -117 deg (curled) .. +9 deg (dumped)
  const bucketPitch = stickPitch + bucketRelAngle;
  const bucketMidR_m = stickTipR_m + Math.cos(bucketPitch) * (L_BUCKET * 0.56);
  const bucketMidZ_m = stickTipZ_m + Math.sin(bucketPitch) * (L_BUCKET * 0.56);
  const bucketTipR_m = stickTipR_m + Math.cos(bucketPitch) * L_BUCKET;
  const bucketTipZ_m = stickTipZ_m + Math.sin(bucketPitch) * L_BUCKET;

  // Lowest cutting-edge height of bucket relative to grade (clamped to documented -4.8 m .. +6.4 m)
  const rawBucketHeightM = Math.min(bucketMidZ_m, bucketTipZ_m);
  const bucketHeightM = Math.max(-EK12_SPECS.maxDigDepthM, Math.min(6.4, rawBucketHeightM));

  // Signed horizontal distances in px along turret forward axis
  const boomHorizPx = (boomTipR_m - boomBaseR_m) * PX_PER_M;
  const stickHorizPx = (stickTipR_m - boomTipR_m) * PX_PER_M;
  const bucketHorizPx = (bucketMidR_m - stickTipR_m) * PX_PER_M;

  const cosV = Math.cos(v.angle || 0);
  const sinV = Math.sin(v.angle || 0);
  const worldArmAngle = (v.angle || 0) + turretAngle;
  const cosA = Math.cos(worldArmAngle);
  const sinA = Math.sin(worldArmAngle);

  const worldTurretX = v.x + cosV * turretLocalX - sinV * turretLocalY;
  const worldTurretY = v.y + sinV * turretLocalX + cosV * turretLocalY;

  const toWorld = (rM: number): [number, number] => {
    const lx = rM * PX_PER_M;
    return [
      worldTurretX + cosA * lx - sinA * armMountOffsetY,
      worldTurretY + sinA * lx + cosA * armMountOffsetY,
    ];
  };

  const [worldBoomStartX, worldBoomStartY] = toWorld(boomBaseR_m);
  const [worldBoomTipX, worldBoomTipY] = toWorld(boomTipR_m);
  const [worldStickTipX, worldStickTipY] = toWorld(stickTipR_m);
  const [worldBucketX, worldBucketY] = toWorld(bucketMidR_m);

  // Blade sits ahead of front frame
  const bladeLocalX = halfL + 1.0; // blade hangs right off the frame end (matches excavatorVisuals)
  const worldBladeCenterX = v.x + cosV * bladeLocalX;
  const worldBladeCenterY = v.y + sinV * bladeLocalX;

  const reachMeters = +(Math.min(EK12_SPECS.maxDigRadiusM, Math.max(1.2, Math.max(bucketMidR_m, bucketTipR_m)))).toFixed(1);

  return {
    turretLocalX,
    turretLocalY,
    turretAngle,
    boomElev,
    stickExt,
    bucketCurl,
    bladePos,
    outriggersPos,
    boomStartLocalX,
    armMountOffsetY,
    boomBaseR_m,
    boomBaseZ_m,
    boomKneeR_m,
    boomKneeZ_m,
    boomTipR_m,
    boomTipZ_m,
    stickTipR_m,
    stickTipZ_m,
    bucketMidR_m,
    bucketMidZ_m,
    bucketTipR_m,
    bucketTipZ_m,
    boomLowerPitch,
    boomUpperPitch,
    stickPitch,
    bucketPitch,
    boomHorizPx,
    stickHorizPx,
    bucketHorizPx,
    boomTipHeightM: +boomTipZ_m.toFixed(1),
    stickTipHeightM: +stickTipZ_m.toFixed(1),
    bucketHeightM: +bucketHeightM.toFixed(1),
    reachMeters,
    worldTurretX,
    worldTurretY,
    worldBoomStartX,
    worldBoomStartY,
    worldBoomTipX,
    worldBoomTipY,
    worldStickTipX,
    worldStickTipY,
    worldBucketX,
    worldBucketY,
    worldBladeCenterX,
    worldBladeCenterY,
    worldArmAngle,
    isBucketGroundLevel: bucketHeightM <= 0.35,
  };
}

export interface ExcavatorLightAnchors {
  angle: number;
  rearAngle: number;
  // Ground-plane turret coordinates for lightmap cones & weather illumination
  frontLeftLamp: { x: number; y: number };
  frontRightLamp: { x: number; y: number };
  cabLampCenter: { x: number; y: number };
  // Roof-lifted coordinates matching the 2.5D cab roof sprites (houseLift 2.4 + cabRoofLift 2.2 = 4.6px)
  frontLeftLampRoof: { x: number; y: number };
  frontRightLampRoof: { x: number; y: number };
  // Front corners of the rotating upper deck (turn indicators, position markers, front fog/work lamps)
  frontLeftTurn: { x: number; y: number };
  frontRightTurn: { x: number; y: number };
  // Rear counterweight recessed light clusters (tail, brake, reverse, rear fog, rear turn signals)
  rearLeftLamp: { x: number; y: number };
  rearRightLamp: { x: number; y: number };
  rearCenter: { x: number; y: number };
  // Boom-mounted halogen work floodlight on left flank of upper boom
  boomLamp: { x: number; y: number };
  // Rotating amber strobe beacon on cab rear-left roof corner (lifted 4.6px)
  beacon: { x: number; y: number };
}

// Computes exact world-space positions for every EK-12 light strictly on the rotating upper platform & boom.
// Local coordinates match excavatorVisuals.ts so visual lamp sprites and emitted light cones stay 1:1 synced.
export function getExcavatorLightAnchors(v: Vehicle, cameraAngle?: number): ExcavatorLightAnchors {
  const geom = getExcavatorGeometry(v);
  const angle = geom.worldArmAngle;
  const cosArm = Math.cos(angle);
  const sinArm = Math.sin(angle);
  const camAng = cameraAngle ?? (v.angle || 0);
  const upWX = Math.cos(camAng);
  const upWY = Math.sin(camAng);

  const turretToWorld = (lx: number, ly: number, liftPx = 0) => ({
    x: geom.worldTurretX + cosArm * lx - sinArm * ly + upWX * liftPx,
    y: geom.worldTurretY + sinArm * lx + cosArm * ly + upWY * liftPx,
  });

  // Cab roof twin halogen lamps: cabX=-7.2, cabL=14.4 -> lamp X = +4.0; cabY=-10.8, cabW=9.4 -> Y = -7.9 & -4.1
  const frontLeftLamp = turretToWorld(4.0, -7.9, 0);
  const frontRightLamp = turretToWorld(4.0, -4.1, 0);
  const cabLampCenter = turretToWorld(4.0, -6.0, 0);
  const frontLeftLampRoof = turretToWorld(4.0, -7.9, 4.6);
  const frontRightLampRoof = turretToWorld(4.0, -4.1, 4.6);

  // Front corners of the revolving turntable upper deck (lifted 2.4px with houseLift)
  const frontLeftTurn = turretToWorld(7.0, -9.2, 2.4);
  const frontRightTurn = turretToWorld(7.0, 8.6, 2.4);

  // Rear counterweight recessed light clusters (lifted 2.4px with houseLift)
  const rearLeftLamp = turretToWorld(-17.8, -6.4, 2.4);
  const rearRightLamp = turretToWorld(-17.8, 6.4, 2.4);
  const rearCenter = turretToWorld(-18.6, 0, 2.4);

  // Boom flank work floodlight at 35% from knee to tip, lateral -0.26m (-2.6px) from arm centerline
  const lampR = geom.boomKneeR_m + (geom.boomTipR_m - geom.boomKneeR_m) * 0.35;
  const boomLamp = turretToWorld(lampR * 10.0, geom.armMountOffsetY - 2.6, 0);

  // Rotating amber beacon at cab rear-left roof corner (-5.2, -8.8) lifted 4.6px
  const beacon = turretToWorld(-5.2, -8.8, 4.6);

  return {
    angle,
    rearAngle: angle + Math.PI,
    frontLeftLamp,
    frontRightLamp,
    cabLampCenter,
    frontLeftLampRoof,
    frontRightLampRoof,
    frontLeftTurn,
    frontRightTurn,
    rearLeftLamp,
    rearRightLamp,
    rearCenter,
    boomLamp,
    beacon,
  };
}

// ============================================================================
// TERRAIN ATTITUDE & STABILIZER CONTACT SOLVER (Blade + 2 Rear Outriggers)
// ============================================================================
export function solveExcavatorAttitude(v: Vehicle): { roll: number; pitch: number; contact: boolean[] } {
  const halfL = (v.length || 49) / 2;
  const halfW = (v.width || 25) / 2;
  const cos = Math.cos(v.angle || 0);
  const sin = Math.sin(v.angle || 0);
  const center = getTerrainSlope(v.x, v.y);
  const zc = center.elevation * TERRAIN_K;
  const sx = center.slopeX * TERRAIN_K;
  const sy = center.slopeY * TERRAIN_K;
  const hLocal = (lx: number, ly: number) => sx * (cos * lx - sin * ly) + sy * (sin * lx + cos * ly);

  const bladePos = clamp01(v.exBladePos ?? 0);
  const outPos = clamp01(v.exOutriggersPos ?? 0);

  // Rear outrigger pads & front blade edge world ground offsets
  const rearPadLX = -halfL - 2.2;
  const rearPadLY = halfW - 1.2;
  const frontBladeLX = halfL + 4.0;

  const sampleGround = (lx: number, ly: number) => {
    const wx = v.x + cos * lx - sin * ly;
    const wy = v.y + sin * lx + cos * ly;
    return getTerrainSlope(wx, wy).elevation * TERRAIN_K - zc;
  };

  const gL = sampleGround(rearPadLX, -rearPadLY);
  const gR = sampleGround(rearPadLX, rearPadLY);
  const gB = sampleGround(frontBladeLX, 0);

  const contactLeft = outPos > 0.72;
  const contactRight = outPos > 0.72;
  const contactBlade = bladePos > 0.65;

  // Unstabilized terrain slope
  const naturalPitch = Math.atan(sx * cos + sy * sin);
  const naturalRoll = Math.atan(-sx * sin + sy * cos);

  // Deploying rear stabilizers and/or front dozer blade levels chassis up to ~6 deg correction
  const rearSupportFactor = outPos > 0.5 ? (outPos - 0.5) * 2.0 : 0;
  const bladeSupportFactor = bladePos > 0.55 ? (bladePos - 0.55) / 0.45 : 0;
  const levelBlend = Math.min(0.88, rearSupportFactor * 0.55 + bladeSupportFactor * 0.35);

  const pitchBias = (bladeSupportFactor - rearSupportFactor) * 0.032; // nose slightly up when front blade pushes down
  const padDiffRoll = contactLeft && contactRight ? Math.atan2(gR - gL, rearPadLY * 2) * 0.15 : 0;

  const targetPitch = naturalPitch * (1 - levelBlend) + pitchBias + (gB * 0.008 * bladeSupportFactor);
  const targetRoll = naturalRoll * (1 - levelBlend) + padDiffRoll;

  return {
    roll: targetRoll,
    pitch: targetPitch,
    contact: [contactLeft, contactRight, contactBlade],
  };
}

export function isExcavatorStabilized(v: Vehicle): boolean {
  const outPos = v.exOutriggersPos ?? 0;
  const bladePos = v.exBladePos ?? 0;
  return outPos > 0.72 || (outPos > 0.45 && bladePos > 0.65);
}

export function isExcavatorRoadLocked(v: Vehicle): boolean {
  if (!isExcavatorVehicle(v)) return false;
  return (v.exOutriggersPos ?? 0) > 0.25 || !!v.exOperatorMode;
}

export function stowExcavatorForTransport(v: Vehicle, player?: Player | null): void {
  if (!isExcavatorVehicle(v)) return;
  if (!hasPtoDrive(v)) {
    sound.playAlert();
    if (player) addPlayerNotification(player, 'Включите двигатель и КОМ [P] для складывания оборудования', 'warning');
    return;
  }
  v.exTurretAngle = 0;
  v.exBoomElev = 0.56;
  v.exStickExt = 0.18;
  v.exBucketCurl = 0.16;
  v.exBladePos = 0.0;
  v.exOutriggersPos = 0.0;
  v.exAxleOscillationLocked = false;
  v.exOperatorMode = false;
  sound.playHydraulicHiss(0.35);
  if (player) addPlayerNotification(player, 'ЕК-12 переведён в транспортное положение', 'info');
}

// ============================================================================
// MAIN SIMULATION TICK
// ============================================================================
export function updateExcavatorSuperstructure(
  vehicle: Vehicle,
  input: InputState | null,
  world: GameWorld,
  dt: number,
  getSurfaceAt?: (x: number, y: number) => { type: string },
  player?: Player | null
): void {
  if (!isExcavatorVehicle(vehicle)) return;
  ensureExcavatorState(vehicle);

  const isRunning = vehicle.engineState ? !!vehicle.engineState.engineRunning : false;
  const hasPressure = isRunning && hasPtoDrive(vehicle);

  vehicle._exReliefSoundTimer = Math.max(0, (vehicle._exReliefSoundTimer ?? 0) - dt);
  vehicle._exDigCooldown = Math.max(0, (vehicle._exDigCooldown ?? 0) - dt);

  // 1. Solve stabilizer / blade terrain attitude
  const att = solveExcavatorAttitude(vehicle);
  const kAtt = Math.min(1, ATTITUDE_RATE * dt);
  vehicle.exChassisRoll = (vehicle.exChassisRoll ?? 0) + (att.roll - (vehicle.exChassisRoll ?? 0)) * kAtt;
  vehicle.exChassisPitch = (vehicle.exChassisPitch ?? 0) + (att.pitch - (vehicle.exChassisPitch ?? 0)) * kAtt;
  vehicle.exOutriggersContact = att.contact;

  // Auto-engage front axle balancer oscillation lock when working with outriggers/blade or in work mode
  if ((vehicle.exOutriggersPos ?? 0) > 0.25 || (vehicle.exBladePos ?? 0) > 0.55) {
    vehicle.exAxleOscillationLocked = true;
  }

  // Anchor undercarriage if rear outriggers are deployed on ground
  if ((vehicle.exOutriggersPos ?? 0) > 0.38) {
    vehicle.vx *= Math.pow(0.015, dt * 10);
    vehicle.vy *= Math.pow(0.015, dt * 10);
    vehicle.speed *= Math.pow(0.015, dt * 10);
    vehicle.angularVelocity = 0;
    if (Math.hypot(vehicle.vx, vehicle.vy) < 1.2) {
      vehicle.vx = 0;
      vehicle.vy = 0;
      vehicle.speed = 0;
    }
  }

  // 2. Read operator inputs & drive hydraulic actuators (only if PTO pump is live!)
  let activeCircuits = 0;
  let hittingEndStop = false;
  let digEffort = 0;

  const isOperatorActive = !!(vehicle.isPlayerControlled && vehicle.exOperatorMode);
  const canMoveBladeOutriggers = !!(vehicle.isPlayerControlled && input);

  let slewDir = 0;
  let boomDir = 0;
  let stickDir = 0;
  let bucketDir = 0;
  let bladeDir = 0;
  let outriggerDir = 0;

  if (canMoveBladeOutriggers && input) {
    if (input.exBladeDown) bladeDir += 1;
    if (input.exBladeUp) bladeDir -= 1;
    if (input.exStabilizersDown) outriggerDir += 1;
    if (input.exStabilizersUp) outriggerDir -= 1;

    // Console hold keys always work on arm even without full joystick toggle,
    // while WASD/Q/E/R/Space map when exOperatorMode === true
    if (input.exSlewLeft) slewDir -= 1;
    if (input.exSlewRight) slewDir += 1;
    if (input.exBoomUp) boomDir += 1;
    if (input.exBoomDown) boomDir -= 1;
    if (input.exStickOut) stickDir += 1;
    if (input.exStickIn) stickDir -= 1;
    if (input.exBucketDump) bucketDir += 1;
    if (input.exBucketCurl) bucketDir -= 1;

    if (isOperatorActive) {
      if (input.left || (typeof input.steeringAxis === 'number' && input.steeringAxis < -0.15)) slewDir -= 1;
      if (input.right || (typeof input.steeringAxis === 'number' && input.steeringAxis > 0.15)) slewDir += 1;
      if (input.forward) stickDir += 1;
      if (input.backward) stickDir -= 1;
      if (input.craneBoomExtend) boomDir += 1; // KeyE
      if (input.craneBoomRetract) boomDir -= 1; // KeyQ
      if (input.craneHookUp) bucketDir -= 1; // KeyR -> curl/scoop bucket closed
      if (input.handbrake) bucketDir += 1; // Space -> open/dump bucket
    }
  }

  slewDir = Math.max(-1, Math.min(1, slewDir));
  boomDir = Math.max(-1, Math.min(1, boomDir));
  stickDir = Math.max(-1, Math.min(1, stickDir));
  bucketDir = Math.max(-1, Math.min(1, bucketDir));
  bladeDir = Math.max(-1, Math.min(1, bladeDir));
  outriggerDir = Math.max(-1, Math.min(1, outriggerDir));

  if (hasPressure) {
    const prevBucket = vehicle.exBucketCurl ?? 0.18;

    if (slewDir !== 0) {
      vehicle.exTurretAngle = normalizeAngle((vehicle.exTurretAngle ?? 0) + slewDir * SLEW_SPEED_RAD_S * dt);
      activeCircuits++;
    }
    if (boomDir !== 0) {
      const prev = vehicle.exBoomElev ?? 0.62;
      const next = clamp01(prev + boomDir * BOOM_RATE * dt);
      if ((boomDir > 0 && prev >= 0.999) || (boomDir < 0 && prev <= 0.001)) hittingEndStop = true;
      vehicle.exBoomElev = next;
      activeCircuits++;
    }
    if (stickDir !== 0) {
      const prev = vehicle.exStickExt ?? 0.22;
      const next = clamp01(prev + stickDir * STICK_RATE * dt);
      if ((stickDir > 0 && prev >= 0.999) || (stickDir < 0 && prev <= 0.001)) hittingEndStop = true;
      vehicle.exStickExt = next;
      activeCircuits++;
    }
    if (bucketDir !== 0) {
      const next = clamp01(prevBucket + bucketDir * BUCKET_RATE * dt);
      if ((bucketDir > 0 && prevBucket >= 0.999) || (bucketDir < 0 && prevBucket <= 0.001)) hittingEndStop = true;
      vehicle.exBucketCurl = next;
      activeCircuits++;
    }
    if (bladeDir !== 0) {
      const prev = vehicle.exBladePos ?? 0;
      const next = clamp01(prev + bladeDir * BLADE_RATE * dt);
      if ((bladeDir > 0 && prev >= 0.999) || (bladeDir < 0 && prev <= 0.001)) hittingEndStop = true;
      vehicle.exBladePos = next;
      activeCircuits++;
    }
    if (outriggerDir !== 0) {
      const prev = vehicle.exOutriggersPos ?? 0;
      const next = clamp01(prev + outriggerDir * OUTRIGGER_RATE * dt);
      if ((outriggerDir > 0 && prev >= 0.999) || (outriggerDir < 0 && prev <= 0.001)) hittingEndStop = true;
      vehicle.exOutriggersPos = next;
      if (outriggerDir > 0 && prev < 0.72 && next >= 0.72) {
        sound.playOutriggerLock();
      }
      activeCircuits++;
    }

    // 3. Bucket Digging & Dumping Physics
    const geom = getExcavatorGeometry(vehicle);
    const curLoad = clamp01(vehicle.exBucketLoad ?? 0);

    // 3a. Scooping / Digging when bucket is at ground height & curling inward or pulling stick inward
    const isScoopingMotion = (bucketDir < 0 && (vehicle.exBucketCurl ?? 0) < 0.65) || (stickDir < 0 && geom.bucketHeightM <= 0.05);
    if (geom.isBucketGroundLevel && isScoopingMotion && curLoad < 0.99) {
      const surf = getSurfaceAt ? getSurfaceAt(geom.worldBucketX, geom.worldBucketY).type : 'dirt_road';
      let scoopedStain = false;

      // Check existing sand / soil / sewage stains under bucket first
      if (world.stains && world.stains.length > 0) {
        for (let i = world.stains.length - 1; i >= 0; i--) {
          const st = world.stains[i];
          if (st.type !== 'sand' && st.type !== 'soil' && st.type !== 'sewage') continue;
          const dist = Math.hypot(st.x - geom.worldBucketX, st.y - geom.worldBucketY);
          if (dist < st.radius + 14) {
            const take = Math.min(1 - curLoad, dt * 0.85);
            vehicle.exBucketLoad = clamp01(curLoad + take);
            vehicle.exBucketMaterial = st.type === 'sand' ? 'sand' : st.type === 'sewage' ? 'mud' : 'soil';
            st.radius = Math.max(0, st.radius - dt * 5.2);
            if (st.radius < 2.2) {
              world.stains.splice(i, 1);
            }
            scoopedStain = true;
            digEffort = 0.75;
            break;
          }
        }
      }

      if (!scoopedStain) {
        if (surf === 'asphalt' || surf === 'concrete') {
          // Hard paved surface: teeth scrape asphalt, warning once in a while + spark
          digEffort = 1.0;
          if ((vehicle._exDigCooldown ?? 0) <= 0) {
            vehicle._exDigCooldown = 1.6;
            sound.playOutriggerLock();
            if (world.particles && world.particles.length < 400) {
              for (let s = 0; s < 4; s++) {
                world.particles.push({
                  x: geom.worldBucketX,
                  y: geom.worldBucketY,
                  vx: (Math.random() - 0.5) * 45,
                  vy: (Math.random() - 0.5) * 45,
                  radius: 1.4,
                  color: '#fde047',
                  alpha: 0.95,
                  life: 0,
                  maxLife: 0.28,
                  type: 'spark',
                });
              }
            }
            if (player && player.currentVehicleId === vehicle.id) {
              addPlayerNotification(player, 'Ковш скребёт по асфальту — копайте на грунте или подбирайте кучи песка', 'warning');
            }
          }
        } else {
          // Soft natural earth, dirt road, grass, sand, mud, gravel -> real excavation!
          const fillRate = surf === 'sand' ? 0.72 : surf === 'mud' ? 0.68 : surf === 'gravel_road' ? 0.42 : 0.55;
          vehicle.exBucketLoad = clamp01(curLoad + dt * fillRate);
          vehicle.exBucketMaterial = surf === 'sand' ? 'sand' : surf === 'mud' ? 'mud' : 'soil';
          digEffort = 0.92;

          if ((vehicle._exDigCooldown ?? 0) <= 0) {
            vehicle._exDigCooldown = 0.16;
            if (world.particles && world.particles.length < 400) {
              for (let pIdx = 0; pIdx < 3; pIdx++) {
                world.particles.push({
                  x: geom.worldBucketX + (Math.random() - 0.5) * 6,
                  y: geom.worldBucketY + (Math.random() - 0.5) * 6,
                  vx: (Math.random() - 0.5) * 28,
                  vy: (Math.random() - 0.5) * 28,
                  radius: 2.0 + Math.random() * 2.2,
                  color: surf === 'sand' ? '#d97706' : '#573b22',
                  alpha: 0.88,
                  life: 0,
                  maxLife: 0.55,
                  type: 'mud_clod',
                });
              }
            }
            // Leave excavated trench rut mark in ground
            if (world.skidMarks && world.skidMarks.length < 2500) {
              const bx1 = geom.worldBucketX - Math.cos(geom.worldArmAngle) * 4;
              const by1 = geom.worldBucketY - Math.sin(geom.worldArmAngle) * 4;
              world.skidMarks.push({
                x1: bx1,
                y1: by1,
                x2: geom.worldBucketX + Math.cos(geom.worldArmAngle) * 2,
                y2: geom.worldBucketY + Math.sin(geom.worldArmAngle) * 2,
                alpha: 0.78,
                color: surf === 'sand' ? '#92400e' : '#2c1b0e',
                width: 8.5,
                depth: 1.3,
                surfaceType: surf,
                bermColor: surf === 'sand' ? '#b45309' : '#452a18',
                grooveColor: '#1a0f07',
                trackKind: 'rut',
              });
            }
          }
        }
      }
    }

    // 3b. Dumping loaded material when opening bucket wide (`exBucketCurl > 0.74`)
    if ((vehicle.exBucketCurl ?? 0) > 0.74 && (vehicle.exBucketLoad ?? 0) > 0.10 && bucketDir > 0) {
      const dumped = Math.min(vehicle.exBucketLoad ?? 0, dt * 1.45);
      vehicle.exBucketLoad = Math.max(0, (vehicle.exBucketLoad ?? 0) - dumped);

      if ((vehicle._exDigCooldown ?? 0) <= 0) {
        vehicle._exDigCooldown = 0.14;
        const mat = vehicle.exBucketMaterial === 'sand' ? 'sand' : 'soil';

        // Grow nearby mound or spawn new mound
        if (!world.stains) world.stains = [];
        let merged = false;
        for (const st of world.stains) {
          if (st.type === mat && Math.hypot(st.x - geom.worldBucketX, st.y - geom.worldBucketY) < 15) {
            st.radius = Math.min(st.maxRadius, st.radius + 1.8);
            st.alpha = Math.min(0.96, st.alpha + 0.08);
            merged = true;
            break;
          }
        }
        if (!merged && world.stains.length < 600) {
          world.stains.push({
            id: Math.random().toString(36).substring(2, 9),
            x: geom.worldBucketX,
            y: geom.worldBucketY,
            radius: 6.5,
            maxRadius: 15.5,
            type: mat,
            alpha: 0.92,
            life: 0,
            maxLife: 600,
          });
        }

        if (world.particles && world.particles.length < 400) {
          for (let i = 0; i < 4; i++) {
            world.particles.push({
              x: geom.worldBucketX + (Math.random() - 0.5) * 5,
              y: geom.worldBucketY + (Math.random() - 0.5) * 5,
              vx: (Math.random() - 0.5) * 24,
              vy: (Math.random() - 0.5) * 24,
              radius: 2.0 + Math.random() * 2.0,
              color: mat === 'sand' ? '#eab308' : '#4a321d',
              alpha: 0.90,
              life: 0,
              maxLife: 0.5,
              type: 'mud_clod',
            });
          }
        }
      }
    }
  }

  // 4. Bulldozer Blade Earth-Moving & Cleaning while crawling forward/reverse
  const bladePos = vehicle.exBladePos ?? 0;
  const speedAbs = Math.abs(vehicle.speed || 0);
  if (bladePos > 0.62 && speedAbs > 3.5 && (vehicle.exOutriggersPos ?? 0) < 0.30) {
    const geom = getExcavatorGeometry(vehicle);
    const bx = geom.worldBladeCenterX;
    const by = geom.worldBladeCenterY;

    // Scrape/push stains ahead of the 2500mm dozer blade
    if (world.stains && world.stains.length > 0) {
      const pushDist = (vehicle.speed || 0) * dt * 1.1;
      const cosV = Math.cos(vehicle.angle || 0);
      const sinV = Math.sin(vehicle.angle || 0);
      for (let i = world.stains.length - 1; i >= 0; i--) {
        const st = world.stains[i];
        const dist = Math.hypot(st.x - bx, st.y - by);
        if (dist < 15 + st.radius * 0.5) {
          if (st.type === 'sand' || st.type === 'soil') {
            // Doze granular mound ahead of the blade and slightly flatten radius
            st.x += cosV * pushDist;
            st.y += sinV * pushDist;
            st.radius = Math.max(3.5, st.radius - dt * 1.1);
            st.alpha = Math.max(0.35, st.alpha - dt * 0.08);
            if (st.radius <= 3.6 && st.alpha <= 0.4) {
              world.stains.splice(i, 1);
            }
          } else {
            // Blade scrapes thin liquid/mud films away
            st.radius = Math.max(0, st.radius - dt * 4.5);
            st.alpha = Math.max(0, st.alpha - dt * 0.35);
            if (st.radius < 1.8 || st.alpha < 0.12) {
              world.stains.splice(i, 1);
            }
          }
        }
      }
    }

    // Scraping dust / sparks feedback
    if (bladePos > 0.85 && Math.random() < dt * 7.5 && world.particles && world.particles.length < 400) {
      const surf = getSurfaceAt ? getSurfaceAt(bx, by).type : 'asphalt';
      const isHard = surf === 'asphalt' || surf === 'concrete';
      world.particles.push({
        x: bx + (Math.random() - 0.5) * 14,
        y: by + (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        radius: isHard ? 1.3 : 2.8,
        color: isHard ? '#facc15' : '#947e63',
        alpha: 0.78,
        life: 0,
        maxLife: isHard ? 0.25 : 0.65,
        type: isHard ? 'spark' : 'dust',
      });
    }
  }

  // 5. Hydraulic System Pressure (MPa) & HLP-46 Oil Thermodynamics
  let targetMpa = 0;
  if (hasPressure) {
    if (hittingEndStop) {
      targetMpa = EK12_SPECS.reliefPressureMpa; // 31.5 MPa relief valve!
      if ((vehicle._exReliefSoundTimer ?? 0) <= 0) {
        vehicle._exReliefSoundTimer = 0.6;
        sound.playHydraulicHiss(0.28);
      }
    } else if (digEffort > 0.1) {
      targetMpa = 20.0 + digEffort * 7.5; // 20..27.5 MPa digging load
    } else if (activeCircuits > 0) {
      targetMpa = Math.min(25.5, 16.5 + activeCircuits * 3.8); // 20..25 MPa normal working pressure
    } else {
      targetMpa = EK12_SPECS.standbyPressureMpa; // 2.4 MPa standby circulation
    }
  }

  const prevMpa = vehicle.exHydPressureMpa ?? 0;
  const pressureRate = hasPressure ? 8.5 : 4.5;
  vehicle.exHydPressureMpa = +(prevMpa + (targetMpa - prevMpa) * Math.min(1, pressureRate * dt)).toFixed(1);

  const curTemp = vehicle.exHydTempC ?? 28;
  const ambientTemp = 22;
  const targetTemp = !isRunning
    ? ambientTemp
    : hasPressure
    ? (activeCircuits > 0 || digEffort > 0 ? 64 : 48)
    : 34;
  const tempRate = activeCircuits > 0 ? 0.18 : 0.04;
  vehicle.exHydTempC = +(curTemp + (targetTemp - curTemp) * Math.min(1, tempRate * dt)).toFixed(1);
}

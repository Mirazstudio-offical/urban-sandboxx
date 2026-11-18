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
  if (v.exBoomElev === undefined) v.exBoomElev = 0.62;
  if (v.exStickExt === undefined) v.exStickExt = 0.22;
  if (v.exBucketCurl === undefined) v.exBucketCurl = 0.18;
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
  // Local turret-aligned arm distances (from turret center along turret forward axis)
  boomStartLocalX: number;
  armMountOffsetY: number; // Boom is mounted slightly right of center (+1.4px) next to left cab
  boomHorizPx: number;
  stickHorizPx: number;
  bucketHorizPx: number;
  boomTipHeightM: number;
  stickTipHeightM: number;
  bucketHeightM: number;
  reachMeters: number;
  // World coordinates
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
  const turretLocalX = -1.8;
  const turretLocalY = 0;
  const turretAngle = v.exTurretAngle ?? 0;
  const boomElev = clamp01(v.exBoomElev ?? 0.62);
  const stickExt = clamp01(v.exStickExt ?? 0.22);
  const bucketCurl = clamp01(v.exBucketCurl ?? 0.18);
  const bladePos = clamp01(v.exBladePos ?? 0);
  const outriggersPos = clamp01(v.exOutriggersPos ?? 0);

  // Boom mounts ahead of counterweight (+3.8px) and slightly right (+1.4px) beside the left operator cab
  const boomStartLocalX = 3.8;
  const armMountOffsetY = 1.4;

  // Elevation & kinematics projected cleanly to 2.5D top-down + physical height (meters)
  // boomElev: 0 = lowered deep into excavation (-45 deg), 1 = raised high (+66 deg)
  const boomAngleRad = -0.78 + boomElev * 1.92;
  const boomHorizPx = Math.max(15.0, 41.5 * Math.cos(boomAngleRad * 0.72));
  const boomTipHeightM = 1.8 + Math.sin(boomAngleRad) * EK12_SPECS.boomLengthM;

  // Stick angle relative to horizon depends on boom angle + stick extension
  const stickWorldAngle = boomAngleRad - 1.95 + stickExt * 1.65;
  const stickHorizPx = Math.max(7.5, Math.abs(Math.cos(stickWorldAngle)) * 22.0 + stickExt * 7.5);
  const stickTipHeightM = boomTipHeightM + Math.sin(stickWorldAngle) * EK12_SPECS.stickLengthM;

  // Bucket tip position and vertical depth relative to grade (0 = ground surface)
  const bucketHorizPx = 4.8 + (1 - Math.abs(bucketCurl - 0.45) * 0.7) * 5.2;
  const bucketHeightM = Math.max(-4.8, Math.min(7.8, stickTipHeightM - 1.15 - (1 - stickExt) * 0.45));

  const cosV = Math.cos(v.angle || 0);
  const sinV = Math.sin(v.angle || 0);
  const worldArmAngle = (v.angle || 0) + turretAngle;
  const cosA = Math.cos(worldArmAngle);
  const sinA = Math.sin(worldArmAngle);

  const worldTurretX = v.x + cosV * turretLocalX - sinV * turretLocalY;
  const worldTurretY = v.y + sinV * turretLocalX + cosV * turretLocalY;

  const worldBoomStartX = worldTurretX + cosA * boomStartLocalX - sinA * armMountOffsetY;
  const worldBoomStartY = worldTurretY + sinA * boomStartLocalX + cosA * armMountOffsetY;

  const worldBoomTipX = worldBoomStartX + cosA * boomHorizPx;
  const worldBoomTipY = worldBoomStartY + sinA * boomHorizPx;

  const worldStickTipX = worldBoomTipX + cosA * stickHorizPx;
  const worldStickTipY = worldBoomTipY + sinA * stickHorizPx;

  const worldBucketX = worldStickTipX + cosA * bucketHorizPx;
  const worldBucketY = worldStickTipY + sinA * bucketHorizPx;

  // Blade sits ahead of front frame
  const bladeLocalX = halfL + 4.0;
  const worldBladeCenterX = v.x + cosV * bladeLocalX;
  const worldBladeCenterY = v.y + sinV * bladeLocalX;

  const totalArmPx = boomStartLocalX + boomHorizPx + stickHorizPx + bucketHorizPx;
  const reachMeters = +(Math.min(EK12_SPECS.maxDigRadiusM, Math.max(1.8, totalArmPx * 0.105))).toFixed(1);

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
    boomHorizPx,
    stickHorizPx,
    bucketHorizPx,
    boomTipHeightM,
    stickTipHeightM,
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
  v.exBoomElev = 0.64;
  v.exStickExt = 0.20;
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

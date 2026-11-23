import { GameWorld, Player, StreetProp } from './types';
import { RemotePlayerState } from './onlineSystem';
import { getEffectiveWeatherWeights } from './weatherTransition';

export interface StreetLampEmitterPoint {
  x: number;
  y: number;
}

export interface StreetLampEmissionInfo {
  isOn: boolean;
  intensity: number; // 0..1 (accounts for dim/flicker faults)
  rgb: readonly [number, number, number];
  radius: number;
  peakCut: number;
  colorPeak: number;
  isWarmSodium: boolean;
  emitters: StreetLampEmitterPoint[];
}

export function getPropEffectiveAngle(prop: StreetProp): number {
  if (typeof prop.angle === 'number' && Number.isFinite(prop.angle)) {
    return prop.angle;
  }
  const rot = (prop as any).rotation;
  if (typeof rot === 'number' && Number.isFinite(rot)) {
    return rot;
  }
  return 0;
}

export function isStreetLampProp(prop: StreetProp): boolean {
  return (
    prop.type === 'lamp' ||
    prop.type === 'lamp_highway' ||
    prop.type === 'lamp_concrete' ||
    prop.type === 'street_lamp'
  );
}

export function isTallLampOrCameraProp(prop: StreetProp): boolean {
  return (
    prop.type === 'lamp' ||
    prop.type === 'lamp_highway' ||
    prop.type === 'lamp_concrete' ||
    prop.type === 'street_lamp' ||
    prop.type === 'cctv_pole' ||
    prop.type === 'power_pole'
  );
}

export function hasPoleCamera(prop: StreetProp): boolean {
  return Boolean(prop.hasCamera || prop.type === 'cctv_pole');
}

export function getCameraBaseAngle(prop: StreetProp): number {
  if (typeof prop.cameraAngle === 'number' && Number.isFinite(prop.cameraAngle)) {
    return prop.cameraAngle;
  }
  return getPropEffectiveAngle(prop);
}

export function getCameraCurrentAngle(prop: StreetProp): number {
  if (typeof prop.cameraCurrentAimAngle === 'number' && Number.isFinite(prop.cameraCurrentAimAngle)) {
    return prop.cameraCurrentAimAngle;
  }
  return getCameraBaseAngle(prop);
}

export function getCameraMountLocalOffset(prop: StreetProp): { x: number; y: number; aimAngle: number } {
  const aimAngle = getCameraCurrentAngle(prop);
  const tilt = prop.tiltAmount ?? 0;
  const tiltDir = prop.tiltAngle ?? 0;
  const leanX = Math.cos(tiltDir) * tilt * 8.5;
  const leanY = Math.sin(tiltDir) * tilt * 8.5;
  const armDist = prop.type === 'cctv_pole' ? 6.5 : prop.type === 'lamp_highway' ? 7.5 : 6.2;
  return {
    x: leanX + Math.cos(aimAngle) * armDist,
    y: leanY + Math.sin(aimAngle) * armDist,
    aimAngle
  };
}

function normalizeAngleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function getBulbSpectralColor(bulbType: StreetProp['bulbType'], propType: StreetProp['type']): {
  rgb: readonly [number, number, number];
  isWarmSodium: boolean;
  lensOnCore: string;
  lensOnMid: string;
  lensOnOuter: string;
} {
  const effectiveBulb: NonNullable<StreetProp['bulbType']> =
    bulbType ??
    (propType === 'lamp_highway'
      ? 'sodium_dnat'
      : propType === 'lamp_concrete'
      ? 'sodium_dnat'
      : 'tungsten_warm');

  switch (effectiveBulb) {
    case 'led_cool':
      return {
        rgb: [224, 240, 255],
        isWarmSodium: false,
        lensOnCore: '#ffffff',
        lensOnMid: '#e0f2fe',
        lensOnOuter: '#bae6fd'
      };
    case 'led_neutral':
      return {
        rgb: [250, 244, 224],
        isWarmSodium: false,
        lensOnCore: '#ffffff',
        lensOnMid: '#fefce8',
        lensOnOuter: '#fde68a'
      };
    case 'mercury_drl':
      return {
        rgb: [204, 242, 255],
        isWarmSodium: false,
        lensOnCore: '#f8fafc',
        lensOnMid: '#cffafe',
        lensOnOuter: '#67e8f9'
      };
    case 'tungsten_warm':
      return {
        rgb: [255, 222, 146],
        isWarmSodium: false,
        lensOnCore: '#fffbeb',
        lensOnMid: '#fef08a',
        lensOnOuter: '#f59e0b'
      };
    case 'sodium_dnat':
    default:
      return {
        rgb: [255, 174, 68],
        isWarmSodium: true,
        lensOnCore: '#fff7ed',
        lensOnMid: '#fde047',
        lensOnOuter: '#f59e0b'
      };
  }
}

export function getStreetLampEmitters(prop: StreetProp): StreetLampEmitterPoint[] {
  const angle = getPropEffectiveAngle(prop);
  const tilt = prop.tiltAmount ?? 0;
  const tiltDir = prop.tiltAngle ?? 0;
  const leanX = Math.cos(tiltDir) * tilt * 10;
  const leanY = Math.sin(tiltDir) * tilt * 10;
  const effAngle = angle + tilt * 0.18;
  const cosA = Math.cos(effAngle);
  const sinA = Math.sin(effAngle);

  if (prop.type === 'lamp_highway') {
    const reach = prop.armLength ?? 22;
    if (prop.armType === 'double' || prop.lampStyle === 'twin_mast') {
      const twinReach = prop.armLength ?? 20;
      return [
        { x: prop.x + leanX + cosA * twinReach, y: prop.y + leanY + sinA * twinReach },
        { x: prop.x + leanX - cosA * twinReach, y: prop.y + leanY - sinA * twinReach }
      ];
    }
    return [{ x: prop.x + leanX + cosA * reach, y: prop.y + leanY + sinA * reach }];
  }

  if (prop.type === 'lamp_concrete') {
    const reach = prop.armLength ?? 10.5;
    if (prop.armType === 'double') {
      return [
        { x: prop.x + cosA * reach, y: prop.y + sinA * reach },
        { x: prop.x - cosA * reach, y: prop.y - sinA * reach }
      ];
    }
    return [{ x: prop.x + cosA * reach, y: prop.y + sinA * reach }];
  }

  if (prop.type === 'street_lamp') {
    const reach = prop.armLength ?? 13;
    return [{ x: prop.x + leanX + cosA * reach, y: prop.y + leanY + sinA * reach }];
  }

  // Park / courtyard lamp ('lamp')
  return [{ x: prop.x + leanX, y: prop.y + leanY }];
}

export function getStreetLampEmissionInfo(
  prop: StreetProp,
  timeHour: number,
  effectiveAlpha: number,
  calSunrise: number,
  calSunset: number,
  fogFactor: number = 1,
  nowMs: number = Date.now()
): StreetLampEmissionInfo | null {
  if (!isStreetLampProp(prop) || prop.isBroken || prop.glassShattered) return null;
  if (prop.lampFault === 'dead') return null;

  const lampHash = Math.sin(prop.x * 12.9898 + prop.y * 78.233) * 43758.5453;
  const randVal = lampHash - Math.floor(lampHash);

  const sunsetHour = calSunset - 0.30 + randVal * 0.70;
  const sunriseHour = calSunrise - 0.35 + randVal * 0.65;

  let on = timeHour >= sunsetHour || timeHour < sunriseHour || effectiveAlpha > 0.38;
  if (!on) return null;

  const isTransitioning = Math.abs(timeHour - sunsetHour) < 0.04 || Math.abs(timeHour - sunriseHour) < 0.04;
  if (isTransitioning && Math.sin(nowMs * 0.04 + randVal * 20) > 0.25) {
    return null;
  }

  let intensity = 1.0;
  if (prop.lampFault === 'dim') {
    intensity = 0.58;
  } else if (prop.lampFault === 'flicker') {
    const wave =
      Math.sin(nowMs * 0.017 + randVal * 40) *
      Math.sin(nowMs * 0.053 + randVal * 13);
    if (wave > 0.52) {
      intensity = 0.14;
    } else if (wave > 0.22) {
      intensity = 0.62;
    }
  }

  const spectral = getBulbSpectralColor(prop.bulbType, prop.type);
  let lampRadius = 110 * fogFactor;
  let peakCut = 0.92;
  let colorPeak = 0.56;

  if (prop.type === 'lamp_highway') {
    lampRadius = (prop.bulbType === 'led_cool' || prop.bulbType === 'led_neutral' ? 152 : 145) * fogFactor;
    peakCut = 0.95;
    colorPeak = prop.bulbType === 'led_cool' ? 0.52 : 0.64;
  } else if (prop.type === 'lamp_concrete') {
    lampRadius = 122 * fogFactor;
    peakCut = 0.92;
    colorPeak = prop.bulbType === 'mercury_drl' ? 0.54 : 0.60;
  } else if (prop.type === 'street_lamp') {
    lampRadius = 132 * fogFactor;
    peakCut = 0.93;
    colorPeak = 0.58;
  }

  return {
    isOn: true,
    intensity,
    rgb: spectral.rgb,
    radius: lampRadius * (0.82 + 0.18 * intensity),
    peakCut: peakCut * intensity,
    colorPeak: colorPeak * intensity,
    isWarmSodium: spectral.isWarmSodium,
    emitters: getStreetLampEmitters(prop)
  };
}

export function isNightForCameraFloodlight(world: GameWorld, timeHour: number): boolean {
  const weights = getEffectiveWeatherWeights(world);
  const weatherDark = Math.max(
    (0.28 + weights.storm * 0.12) * weights.rain,
    (0.18 + weights.blizzard * 0.17) * weights.snow,
    0.45 * weights.fog,
    0.20 * weights.overcast
  );
  const calSeason = world.calendar?.season ?? world.season;
  const calSunrise =
    world.calendar?.sunriseHour ??
    (calSeason === 'winter' ? 8.8 : calSeason === 'summer' ? 3.9 : calSeason === 'autumn' ? 6.8 : 6.0);
  const calSunset =
    world.calendar?.sunsetHour ??
    (calSeason === 'winter' ? 16.2 : calSeason === 'summer' ? 21.1 : calSeason === 'autumn' ? 18.2 : 19.0);

  return (
    weatherDark > 0.34 ||
    timeHour >= calSunset - 0.35 ||
    timeHour < calSunrise + 0.20
  );
}

interface CameraCacheEntry {
  propsLength: number;
  cameraProps: StreetProp[];
}

const cameraPropCache = new WeakMap<GameWorld, CameraCacheEntry>();
const prevPlayerPos = new WeakMap<Player, { x: number; y: number }>();

function getWorldCameraProps(world: GameWorld): StreetProp[] {
  const cached = cameraPropCache.get(world);
  if (cached && cached.propsLength === world.props.length) {
    return cached.cameraProps;
  }
  const list: StreetProp[] = [];
  for (let i = 0; i < world.props.length; i++) {
    const p = world.props[i];
    if (hasPoleCamera(p)) {
      list.push(p);
    }
  }
  cameraPropCache.set(world, { propsLength: world.props.length, cameraProps: list });
  return list;
}

interface MovingTarget {
  x: number;
  y: number;
  speed: number;
}

const activeTargetsScratch: MovingTarget[] = [];

/**
 * Updates all surveillance camera poles in the world:
 * - Detects moving players, vehicles, pedestrians, and remote players inside each camera's FOV & range.
 * - Smoothly pans PTZ dome cameras toward moving objects.
 * - Activates night motion-triggered LED floodlights and holds them lit for 60 real-time seconds
 *   after the detected object disappears from the camera's sector.
 */
export function updateCameraPoles(
  world: GameWorld,
  dt: number,
  player: Player | null | undefined,
  remotePlayers: RemotePlayerState[] | undefined,
  timeHour: number
): void {
  if (!world || !Array.isArray(world.props) || world.props.length === 0) return;
  const clampedDt = Math.max(0.001, Math.min(0.25, dt));
  const cameraProps = getWorldCameraProps(world);
  if (cameraProps.length === 0) return;

  const isDark = isNightForCameraFloodlight(world, timeHour);

  // Build compact scratch list of currently moving world objects
  activeTargetsScratch.length = 0;

  if (player && !player.isInsideBuilding) {
    const prev = prevPlayerPos.get(player);
    const disp = prev ? Math.hypot(player.x - prev.x, player.y - prev.y) : 0;
    const dispSpeed = disp / clampedDt;
    prevPlayerPos.set(player, { x: player.x, y: player.y });
    if (!player.isInVehicle) {
      const pSpeed = Math.max(Math.hypot(player.vx || 0, player.vy || 0), player.speed || 0, dispSpeed);
      if (pSpeed > 3.0) {
        activeTargetsScratch.push({ x: player.x, y: player.y, speed: pSpeed });
      }
    }
  }

  if (Array.isArray(remotePlayers)) {
    for (let i = 0; i < remotePlayers.length; i++) {
      const rp = remotePlayers[i];
      if (!rp || rp.isInVehicle) continue;
      const rSpeed = Math.hypot(rp.vx || 0, rp.vy || 0);
      if (rSpeed > 3.0) {
        activeTargetsScratch.push({ x: rp.x, y: rp.y, speed: rSpeed });
      }
    }
  }

  for (let i = 0; i < world.vehicles.length; i++) {
    const v = world.vehicles[i];
    const vSpeed = Math.max(Math.abs(v.speed || 0), Math.hypot(v.vx || 0, v.vy || 0));
    if (vSpeed > 4.0) {
      activeTargetsScratch.push({ x: v.x, y: v.y, speed: vSpeed });
    }
  }

  for (let i = 0; i < world.pedestrians.length; i++) {
    const ped = world.pedestrians[i];
    if (ped.state === 'knocked_down') continue;
    const pedSpeed = Math.max(ped.speed || 0, Math.hypot((ped as any).vx || 0, (ped as any).vy || 0));
    if (pedSpeed > 2.0 || ped.state === 'walking' || ped.state === 'panicking' || ped.state === 'crossing') {
      activeTargetsScratch.push({ x: ped.x, y: ped.y, speed: Math.max(pedSpeed, 10) });
    }
  }

  const targetCount = activeTargetsScratch.length;

  for (let i = 0; i < cameraProps.length; i++) {
    const prop = cameraProps[i];
    if (prop.isBroken) {
      prop.cameraMotionDetected = false;
      prop.cameraLightTimer = 0;
      prop.cameraLightIntensity = 0;
      continue;
    }

    const baseAngle = getCameraBaseAngle(prop);
    const camType = prop.cameraType ?? (prop.type === 'cctv_pole' ? 'bullet_ir' : 'dome_ptz');
    const range = prop.cameraRange ?? (camType === 'traffic_enforcement' ? 245 : camType === 'dual_security' ? 220 : 205);
    const rangeSq = range * range;
    const halfFov =
      (prop.cameraFov ??
        (camType === 'dual_security'
          ? 2.15
          : camType === 'dome_ptz'
          ? 1.65
          : camType === 'traffic_enforcement'
          ? 0.95
          : 1.25)) * 0.5;
    const holdSec = prop.cameraFloodlightHoldSec ?? 60;
    const hasFloodlight = prop.hasCameraFloodlight !== false;

    let detected = false;
    let closestDistSq = Infinity;
    let closestTargetAngle = baseAngle;

    for (let t = 0; t < targetCount; t++) {
      const target = activeTargetsScratch[t];
      const dx = target.x - prop.x;
      if (dx > range || dx < -range) continue;
      const dy = target.y - prop.y;
      if (dy > range || dy < -range) continue;

      const distSq = dx * dx + dy * dy;
      if (distSq > rangeSq) continue;

      // Very close proximity (within 32px of pole base) always triggers PIR motion sensor
      const angleToTarget = Math.atan2(dy, dx);
      let inSector = distSq <= 1024;
      if (!inSector) {
        if (camType === 'dual_security') {
          const diffA = Math.abs(normalizeAngleDiff(angleToTarget, baseAngle - 0.52));
          const diffB = Math.abs(normalizeAngleDiff(angleToTarget, baseAngle + 0.52));
          inSector = diffA <= 0.72 || diffB <= 0.72;
        } else {
          const diff = Math.abs(normalizeAngleDiff(angleToTarget, baseAngle));
          inSector = diff <= halfFov;
        }
      }

      if (inSector) {
        detected = true;
        if (distSq < closestDistSq) {
          closestDistSq = distSq;
          closestTargetAngle = angleToTarget;
        }
      }
    }

    prop.cameraMotionDetected = detected;

    // Smooth PTZ head tracking for dome_ptz cameras
    if (camType === 'dome_ptz') {
      const curAim = prop.cameraCurrentAimAngle ?? baseAngle;
      let desiredAim = baseAngle;
      if (detected) {
        // Clamp PTZ pan within +-1.05 rad of base mounting direction
        const offsetFromBase = Math.max(-1.05, Math.min(1.05, normalizeAngleDiff(closestTargetAngle, baseAngle)));
        desiredAim = baseAngle + offsetFromBase;
      }
      const deltaAim = normalizeAngleDiff(desiredAim, curAim);
      const maxStep = (detected ? 2.1 : 0.65) * clampedDt;
      if (Math.abs(deltaAim) <= maxStep) {
        prop.cameraCurrentAimAngle = desiredAim;
      } else {
        prop.cameraCurrentAimAngle = curAim + Math.sign(deltaAim) * maxStep;
      }
    } else {
      prop.cameraCurrentAimAngle = baseAngle;
    }

    // Night motion-activated floodlight with 60-second post-disappearance hold timer
    if (hasFloodlight) {
      if (isDark) {
        if (detected) {
          prop.cameraLightTimer = holdSec;
        } else if ((prop.cameraLightTimer ?? 0) > 0) {
          prop.cameraLightTimer = Math.max(0, (prop.cameraLightTimer ?? 0) - clampedDt);
        }
      } else {
        // Daylight: turn off floodlight rapidly
        if ((prop.cameraLightTimer ?? 0) > 0) {
          prop.cameraLightTimer = Math.max(0, (prop.cameraLightTimer ?? 0) - clampedDt * 12);
        }
      }

      const active = isDark && (prop.cameraLightTimer ?? 0) > 0;
      const curInt = prop.cameraLightIntensity ?? 0;
      if (active) {
        // Fast LED snap-on (~0.15s)
        prop.cameraLightIntensity = Math.min(1, curInt + clampedDt * 6.5);
      } else if (curInt > 0) {
        // Smooth LED power-down (~0.6s) after 60s timer elapses
        prop.cameraLightIntensity = Math.max(0, curInt - clampedDt * 1.7);
      }
    } else {
      prop.cameraLightTimer = 0;
      prop.cameraLightIntensity = 0;
    }
  }
}

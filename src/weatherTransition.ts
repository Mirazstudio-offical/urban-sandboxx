import { WeatherType, GameWorld } from './types';
import {
  calculateClimateAtmosphere,
  createInitialCalendarState,
  getInitialSurfaceHydrologyForCalendar,
} from './calendarSystem';

export interface WeatherWeights {
  rain: number;              // 0.0 to 1.0 - liquid precipitation droplet count & streaks
  snow: number;              // 0.0 to 1.0 - falling snow particles
  fog: number;               // 0.0 to 1.0 - volumetric ground mist & headlights fog halos
  overcast: number;          // 0.0 to 1.0 - cloud cover & ambient sky dimming
  storm: number;             // 0.0 to 1.0 - thunderhead darkness & lightning strikes
  drizzle: number;           // 0.0 to 1.0 - fine mist droplets
  blizzard: number;          // 0.0 to 1.0 - arctic snow gales
  clear: number;             // 0.0 to 1.0 - direct sunlight & sky clarity
  cloudShadowAlpha: number;  // 0.0 to 0.35 - opacity of cloud shadows on ground
  cloudShadowScale: number;  // 0.8 to 1.8 - size multiplier for cloud masses
  effectiveGrip: number;     // 0.20 to 1.0 - surface tire adhesion factor (includes post-rain & snow inertia)
  isWetSurface: boolean;     // whether asphalt has active or residual wet film
  surfaceWetness: number;    // 0.0 to 1.0 - persistent asphalt moisture film
  soilMoisture: number;      // 0.0 to 1.0 - persistent offroad soil/mud saturation
  snowCover: number;         // 0.0 to 1.0 - accumulated snow on grass/earth/roofs
  roadSnowCover: number;     // 0.0 to 1.0 - accumulated snow on asphalt/pavement
  slushLevel: number;        // 0.0 to 1.0 - wet first-snow slush on roads
  iceFreezeProgress: number; // 0.0 (liquid) -> 0.5 (crust) -> 1.0 (solid ice)
}

interface RawWeatherProfile {
  rain: number;
  snow: number;
  fog: number;
  overcast: number;
  storm: number;
  drizzle: number;
  blizzard: number;
  clear: number;
  cloudShadowAlpha: number;
  cloudShadowScale: number;
  grip: number;
  isWet: boolean;
}

export function getRawWeatherProfile(weather: WeatherType, isFreezing: boolean = false): RawWeatherProfile {
  switch (weather) {
    case 'storm':
      return {
        rain: 1.0,
        snow: 0.0,
        fog: 0.05,
        overcast: 1.0,
        storm: 1.0,
        drizzle: 0.0,
        blizzard: 0.0,
        clear: 0.0,
        cloudShadowAlpha: 0.28,
        cloudShadowScale: 1.6,
        grip: 0.44,
        isWet: true
      };
    case 'rain':
      return {
        rain: 0.75,
        snow: 0.0,
        fog: 0.0,
        overcast: 0.85,
        storm: 0.0,
        drizzle: 0.0,
        blizzard: 0.0,
        clear: 0.0,
        cloudShadowAlpha: 0.16,
        cloudShadowScale: 1.2,
        grip: 0.58,
        isWet: true
      };
    case 'drizzle':
      return {
        rain: 0.35,
        snow: 0.0,
        fog: 0.20,
        overcast: 0.70,
        storm: 0.0,
        drizzle: 0.85,
        blizzard: 0.0,
        clear: 0.0,
        cloudShadowAlpha: 0.12,
        cloudShadowScale: 1.1,
        grip: isFreezing ? 0.20 : 0.72,
        isWet: true
      };
    case 'blizzard':
      return {
        rain: 0.0,
        snow: 1.0,
        fog: 0.30,
        overcast: 1.0,
        storm: 0.5,
        drizzle: 0.0,
        blizzard: 1.0,
        clear: 0.0,
        cloudShadowAlpha: 0.10,
        cloudShadowScale: 1.3,
        grip: 0.24,
        isWet: true
      };
    case 'snow':
      return {
        rain: 0.0,
        snow: 0.65,
        fog: 0.0,
        overcast: 0.75,
        storm: 0.0,
        drizzle: 0.0,
        blizzard: 0.0,
        clear: 0.0,
        cloudShadowAlpha: 0.08,
        cloudShadowScale: 1.1,
        grip: 0.38,
        isWet: true
      };
    case 'fog':
      return {
        rain: 0.0,
        snow: 0.0,
        fog: 1.0,
        overcast: 0.55,
        storm: 0.0,
        drizzle: 0.0,
        blizzard: 0.0,
        clear: 0.05,
        cloudShadowAlpha: 0.04,
        cloudShadowScale: 1.0,
        grip: isFreezing ? 0.30 : 0.88,
        isWet: isFreezing
      };
    case 'overcast':
      return {
        rain: 0.0,
        snow: 0.0,
        fog: 0.0,
        overcast: 0.60,
        storm: 0.0,
        drizzle: 0.0,
        blizzard: 0.0,
        clear: 0.20,
        cloudShadowAlpha: 0.18,
        cloudShadowScale: 1.25,
        grip: 1.0,
        isWet: false
      };
    case 'clear':
    default:
      return {
        rain: 0.0,
        snow: 0.0,
        fog: 0.0,
        overcast: 0.0,
        storm: 0.0,
        drizzle: 0.0,
        blizzard: 0.0,
        clear: 1.0,
        cloudShadowAlpha: 0.07,
        cloudShadowScale: 1.0,
        grip: 1.0,
        isWet: false
      };
  }
}

/**
 * Ensures persistent hydrology & snowpack fields exist on GameWorld (lazy initialization).
 */
export function ensureWorldSurfaceHydrology(world: GameWorld): void {
  if (
    typeof world.surfaceWetness === 'number' &&
    typeof world.soilMoisture === 'number' &&
    typeof world.snowCover === 'number' &&
    typeof world.roadSnowCover === 'number' &&
    typeof world.slushLevel === 'number' &&
    typeof world.iceFreezeProgress === 'number'
  ) {
    return;
  }
  const cal = world.calendar || createInitialCalendarState(2026, 10, 8, typeof world.timeHour === 'number' ? world.timeHour : 12);
  const init = getInitialSurfaceHydrologyForCalendar(cal, world.weather || 'clear');
  if (typeof world.surfaceWetness !== 'number') world.surfaceWetness = init.surfaceWetness;
  if (typeof world.soilMoisture !== 'number') world.soilMoisture = init.soilMoisture;
  if (typeof world.snowCover !== 'number') world.snowCover = init.snowCover;
  if (typeof world.roadSnowCover !== 'number') world.roadSnowCover = init.roadSnowCover;
  if (typeof world.slushLevel !== 'number') world.slushLevel = init.slushLevel;
  if (typeof world.iceFreezeProgress !== 'number') world.iceFreezeProgress = init.iceFreezeProgress;
}

/**
 * Advances real-time thermodynamic ground hydrology, post-rain drying inertia,
 * first-snow selective accumulation / slush / meltwater generation, and gradual ice freeze/thaw.
 */
export function updateSurfaceHydrologyAndSnow(world: GameWorld, dt: number): void {
  if (!world || dt <= 0) return;
  ensureWorldSurfaceHydrology(world);

  const clampedDt = Math.min(0.25, dt);
  const cal = world.calendar || createInitialCalendarState(2026, 10, 8, typeof world.timeHour === 'number' ? world.timeHour : 12);
  const atmo = calculateClimateAtmosphere(cal, world.weather || 'clear');
  const outsideTemp = typeof world.outsideTemp === 'number' && Number.isFinite(world.outsideTemp)
    ? world.outsideTemp
    : atmo.temperature;
  // Asphalt stays slightly warmer than air in mild autumn/sunlight, colder in deep frost
  const asphaltTemp = atmo.surfaceTemp;
  const grassTemp = outsideTemp - (atmo.solarIntensity < 0.05 ? 0.8 : 0.0) + atmo.solarIntensity * 2.2;
  const humidity = typeof world.humidity === 'number' && Number.isFinite(world.humidity) ? world.humidity : atmo.humidity;
  const windSpeed = world.wind ? (world.wind.speed * (world.wind.gust ?? 1.0)) : 12;

  const current = (world.weather as WeatherType) || 'clear';
  const previous = (world.previousWeather as WeatherType) || current;
  const rawProgress = world.weatherTransition !== undefined ? world.weatherTransition : 1.0;
  const progress = Math.max(0, Math.min(1, rawProgress));
  const t = progress * progress * (3 - 2 * progress);
  const currProf = getRawWeatherProfile(current, outsideTemp <= 0);
  const prevProf = getRawWeatherProfile(previous, outsideTemp <= 0);
  const rainRate = prevProf.rain * (1 - t) + currProf.rain * t;
  const snowRate = prevProf.snow * (1 - t) + currProf.snow * t;
  const blizzardRate = prevProf.blizzard * (1 - t) + currProf.blizzard * t;

  let surfaceWetness = world.surfaceWetness ?? 0;
  let soilMoisture = world.soilMoisture ?? 0;
  let snowCover = world.snowCover ?? 0;
  let roadSnowCover = world.roadSnowCover ?? 0;
  let slushLevel = world.slushLevel ?? 0;
  let iceFreeze = world.iceFreezeProgress ?? 0;

  // --- 1. GRADUAL WATER FREEZE / THAW PHASE (0 = liquid, 0.5 = thin crust, 1 = solid ice) ---
  if (outsideTemp <= 0.0 || asphaltTemp <= -0.2) {
    const frostDepth = Math.max(0.35, Math.abs(Math.min(outsideTemp, asphaltTemp)));
    // Mild frost (-1°C) takes ~45-55s to freeze solid; deep frost (-12°C) freezes in ~15-20s
    const freezeRate = 0.016 + Math.min(0.048, frostDepth * 0.0045);
    iceFreeze = Math.min(1.0, iceFreeze + freezeRate * clampedDt);
  } else {
    const thawHeat = Math.max(0.25, outsideTemp + atmo.solarIntensity * 4.0);
    const thawRate = 0.012 + Math.min(0.055, thawHeat * 0.004);
    iceFreeze = Math.max(0.0, iceFreeze - thawRate * clampedDt);
  }

  // --- 2. SNOW ACCUMULATION, FIRST-SNOW SELECTIVE STICKING, SLUSH & MELTING ---
  let meltwaterFlux = 0;

  if (snowRate > 0.02) {
    // Grass, roofs & open soil cool faster and catch first snow earlier than warm urban asphalt
    if (grassTemp > 2.4) {
      // Warm ground: flakes melt immediately on contact -> wet ground & soil
      meltwaterFlux += snowRate * 0.014;
    } else if (grassTemp > -0.3) {
      // First-snow marginal band (-0.3..+2.4°C): slow patchy dusting on grass/roofs, strong melting into slush
      const stickFactor = Math.max(0.12, (2.4 - grassTemp) / 2.7);
      snowCover = Math.min(1.0, snowCover + snowRate * (0.0045 + blizzardRate * 0.004) * stickFactor * clampedDt);
      meltwaterFlux += snowRate * (1.0 - stickFactor * 0.55) * 0.012;
      slushLevel = Math.min(1.0, slushLevel + snowRate * 0.018 * clampedDt);
    } else {
      // Sub-zero accumulation: dry powdery snow accumulates steadily (~2.5-4 min to full winter cover)
      const accRate = (0.0055 + blizzardRate * 0.0065) * snowRate;
      snowCover = Math.min(1.0, snowCover + accRate * clampedDt);
    }

    // Road / asphalt snow accumulates slower (warm dark bitumen + traffic heat/compaction)
    if (asphaltTemp > 1.2) {
      // Asphalt melts first snow directly into wet film & dark tire-track slush
      meltwaterFlux += snowRate * 0.016;
      slushLevel = Math.min(1.0, slushLevel + snowRate * 0.014 * clampedDt);
      roadSnowCover = Math.max(0, roadSnowCover - 0.005 * clampedDt);
    } else if (asphaltTemp > -1.0) {
      // Classic first-snow road slush: edges whiten slowly while wheel tracks stay dark & slushy
      const roadStick = Math.max(0.10, (1.2 - asphaltTemp) / 2.2);
      roadSnowCover = Math.min(0.65, roadSnowCover + snowRate * (0.0028 + blizzardRate * 0.003) * roadStick * clampedDt);
      slushLevel = Math.min(1.0, slushLevel + snowRate * 0.020 * clampedDt);
      meltwaterFlux += snowRate * 0.007;
    } else {
      // Cold road below -1°C: snow sticks and compacts on road shoulders & lanes
      roadSnowCover = Math.min(0.92, roadSnowCover + snowRate * (0.0042 + blizzardRate * 0.0055) * clampedDt);
      // Deep frost freezes existing slush solid
      if (asphaltTemp < -2.5) {
        slushLevel = Math.max(0, slushLevel - 0.012 * clampedDt);
      }
    }
  } else {
    // No active snowfall: melt snow if surface warms above 0.2°C or receives strong solar radiation
    const grassMeltDrive = Math.max(0, (grassTemp - 0.2) + atmo.solarIntensity * 2.4);
    if (snowCover > 0 && grassMeltDrive > 0.05) {
      const meltStep = Math.min(snowCover, grassMeltDrive * 0.00055 * clampedDt);
      snowCover -= meltStep;
      // Melting snow feeds water into soil, asphalt, and slush
      meltwaterFlux += meltStep * 14.0;
      slushLevel = Math.min(0.85, slushLevel + meltStep * 7.5);
    }

    // Asphalt warms faster in sun/traffic, so roads clear of snow before grass/roofs
    const roadMeltDrive = Math.max(0, (asphaltTemp - 0.0) + atmo.solarIntensity * 3.8);
    if (roadSnowCover > 0 && roadMeltDrive > 0.05) {
      const roadMeltStep = Math.min(roadSnowCover, roadMeltDrive * 0.00105 * clampedDt);
      roadSnowCover -= roadMeltStep;
      meltwaterFlux += roadMeltStep * 18.0;
      slushLevel = Math.min(0.90, slushLevel + roadMeltStep * 9.0);
    }

    // Slush either drains/melts into water above freezing or freezes into solid crust below -2°C
    if (slushLevel > 0) {
      if (asphaltTemp < -2.0) {
        slushLevel = Math.max(0, slushLevel - 0.010 * clampedDt);
      } else {
        const slushDrain = (0.0025 + Math.max(0, asphaltTemp) * 0.0008 + atmo.solarIntensity * 0.0025);
        const drained = Math.min(slushLevel, slushDrain * clampedDt);
        slushLevel -= drained;
        meltwaterFlux += drained * 0.85;
      }
    }
  }

  // --- 3. RAIN WETTING & CLIMATE-DRIVEN POST-RAIN DRYING INERTIA ---
  // Active rain wets asphalt quickly (~25-40s to full saturation) and saturates soil
  if (rainRate > 0.02) {
    surfaceWetness = Math.min(1.0, surfaceWetness + rainRate * 0.032 * clampedDt);
    soilMoisture = Math.min(1.0, soilMoisture + rainRate * 0.026 * clampedDt);
    // Rain washes away remaining snow and turns it into slush/water
    if (snowCover > 0) {
      const wash = Math.min(snowCover, rainRate * 0.0065 * clampedDt);
      snowCover -= wash;
      slushLevel = Math.min(1.0, slushLevel + wash * 4.5);
    }
    if (roadSnowCover > 0) {
      const roadWash = Math.min(roadSnowCover, rainRate * 0.011 * clampedDt);
      roadSnowCover -= roadWash;
      slushLevel = Math.min(1.0, slushLevel + roadWash * 5.0);
    }
  }

  // Meltwater from first snow / thaw wets asphalt and keeps soil damp
  if (meltwaterFlux > 0) {
    surfaceWetness = Math.min(1.0, surfaceWetness + meltwaterFlux * clampedDt);
    soilMoisture = Math.min(1.0, soilMoisture + meltwaterFlux * 1.15 * clampedDt);
  }

  // Evaporation when not actively raining (depends on temp, sun, humidity, wind!)
  if (rainRate <= 0.05) {
    // Sublimation/drying slows dramatically in freezing air, high humidity, or cold dark night
    const tempFactor = outsideTemp <= 0
      ? 0.08
      : Math.max(0.18, Math.min(2.4, 0.25 + outsideTemp * 0.065));
    const sunFactor = 1.0 + atmo.solarIntensity * 1.55;
    const humFactor = Math.max(0.14, 1.0 - (humidity / 112.0));
    const windFactor = 1.0 + Math.min(1.4, windSpeed * 0.012);

    // Asphalt drying:
    //  - Hot sunny breezy (+28°C, sun=0.9, hum=40%): ~0.0085/s -> ~2 min full dry
    //  - Cool humid overcast (+6°C, sun=0.1, hum=88%): ~0.0008/s -> ~18-20 min full dry
    //  - Freezing (-5°C): moisture freezes on surface instead of rapidly evaporating
    const asphaltDryRate = 0.0022 * tempFactor * sunFactor * humFactor * windFactor;
    if (iceFreeze < 0.75) {
      surfaceWetness = Math.max(0, surfaceWetness - asphaltDryRate * clampedDt);
    } else {
      // Frozen moisture sublimates very slowly
      surfaceWetness = Math.max(0, surfaceWetness - asphaltDryRate * 0.15 * clampedDt);
    }

    // Soil / unpaved dirt / chernozem dries ~3.5x slower than exposed asphalt
    const soilDryRate = asphaltDryRate * 0.28;
    soilMoisture = Math.max(0.05, soilMoisture - soilDryRate * clampedDt);
  }

  world.surfaceWetness = Math.max(0, Math.min(1, surfaceWetness));
  world.soilMoisture = Math.max(0, Math.min(1, soilMoisture));
  world.snowCover = Math.max(0, Math.min(1, snowCover));
  world.roadSnowCover = Math.max(0, Math.min(1, roadSnowCover));
  world.slushLevel = Math.max(0, Math.min(1, slushLevel));
  world.iceFreezeProgress = Math.max(0, Math.min(1, iceFreeze));
}

/**
 * Calculates continuous, smooth, atmospheric weather blending weights
 * combined with persistent surface hydrology (post-rain wetness, snowpack, slush, freeze progress).
 */
export function getEffectiveWeatherWeights(
  world: Partial<GameWorld>,
  isFreezing: boolean = false
): WeatherWeights {
  const current = (world.weather as WeatherType) || 'clear';
  const previous = (world.previousWeather as WeatherType) || current;
  const rawProgress = world.weatherTransition !== undefined ? world.weatherTransition : 1.0;
  const progress = Math.max(0, Math.min(1, rawProgress));

  // Cubic smoothstep easing: smooth gradual acceleration and deceleration
  const t = progress * progress * (3 - 2 * progress);

  const currProf = getRawWeatherProfile(current, isFreezing);
  const prevProf = (progress >= 1.0 || previous === current) ? currProf : getRawWeatherProfile(previous, isFreezing);
  const wPrev = (progress >= 1.0 || previous === current) ? 0.0 : (1.0 - t);
  const wCurr = (progress >= 1.0 || previous === current) ? 1.0 : t;

  const rain = prevProf.rain * wPrev + currProf.rain * wCurr;
  const snow = prevProf.snow * wPrev + currProf.snow * wCurr;
  const fog = prevProf.fog * wPrev + currProf.fog * wCurr;
  const overcast = prevProf.overcast * wPrev + currProf.overcast * wCurr;
  const storm = prevProf.storm * wPrev + currProf.storm * wCurr;
  const drizzle = prevProf.drizzle * wPrev + currProf.drizzle * wCurr;
  const blizzard = prevProf.blizzard * wPrev + currProf.blizzard * wCurr;
  const clear = prevProf.clear * wPrev + currProf.clear * wCurr;
  const cloudShadowAlpha = prevProf.cloudShadowAlpha * wPrev + currProf.cloudShadowAlpha * wCurr;
  const cloudShadowScale = prevProf.cloudShadowScale * wPrev + currProf.cloudShadowScale * wCurr;
  const rawWeatherGrip = prevProf.grip * wPrev + currProf.grip * wCurr;

  // Persistent surface state (falls back cleanly when partial world objects are passed)
  const fallbackWinter = world.calendar?.season === 'winter' || world.season === 'winter';
  const surfaceWetness = typeof world.surfaceWetness === 'number'
    ? world.surfaceWetness
    : (rain > 0.05 ? Math.min(1, rain * 0.9) : 0);
  const soilMoisture = typeof world.soilMoisture === 'number'
    ? world.soilMoisture
    : surfaceWetness;
  const snowCover = typeof world.snowCover === 'number'
    ? world.snowCover
    : (fallbackWinter ? 0.85 : 0);
  const roadSnowCover = typeof world.roadSnowCover === 'number'
    ? world.roadSnowCover
    : (fallbackWinter ? 0.45 : 0);
  const slushLevel = typeof world.slushLevel === 'number'
    ? world.slushLevel
    : 0;
  const iceFreezeProgress = typeof world.iceFreezeProgress === 'number'
    ? world.iceFreezeProgress
    : (isFreezing ? 1.0 : 0.0);

  // Physical surface grip combines active weather + persistent wetness + road snow + slush + black ice!
  // 1. Residual post-rain asphalt wetness keeps grip reduced smoothly (e.g. 0.62 -> 1.0 as surfaceWetness dries)
  const wetGrip = 1.0 - surfaceWetness * (isFreezing || iceFreezeProgress > 0.45 ? 0.72 : 0.36);
  // 2. Accumulated snow on asphalt reduces grip progressively (light dusting ~0.78 -> compacted snow ~0.34)
  const roadSnowGrip = 1.0 - Math.min(0.66, roadSnowCover * 0.78);
  // 3. First-snow slush is treacherous (~0.45 at full slush)
  const slushGrip = 1.0 - slushLevel * 0.52;
  // 4. Black ice when wet surface freezes
  const blackIceGrip = (surfaceWetness > 0.08 && iceFreezeProgress > 0.30)
    ? (1.0 - Math.min(0.76, surfaceWetness * iceFreezeProgress * 0.92))
    : 1.0;

  const persistentGrip = Math.min(wetGrip, roadSnowGrip, slushGrip, blackIceGrip);
  const effectiveGrip = Math.max(0.18, Math.min(rawWeatherGrip, persistentGrip));

  const isWetSurface =
    rain > 0.05 ||
    surfaceWetness > 0.10 ||
    slushLevel > 0.08 ||
    (snow > 0.05 && !isFreezing);

  return {
    rain,
    snow,
    fog,
    overcast,
    storm,
    drizzle,
    blizzard,
    clear,
    cloudShadowAlpha,
    cloudShadowScale,
    effectiveGrip,
    isWetSurface,
    surfaceWetness,
    soilMoisture,
    snowCover,
    roadSnowCover,
    slushLevel,
    iceFreezeProgress,
  };
}

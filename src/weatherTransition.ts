import { WeatherType, GameWorld } from './types';

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
  effectiveGrip: number;     // 0.24 to 1.0 - surface tire adhesion factor
  isWetSurface: boolean;     // whether asphalt has wet sheen / puddles
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
        grip: 0.35,
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
 * Calculates continuous, smooth, atmospheric weather blending weights.
 * Evaluates both `previousWeather` and `currentWeather` through a cubic Hermite curve
 * to ensure that weather changes feel completely organic and natural over time.
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

  if (progress >= 1.0 || previous === current) {
    return {
      rain: currProf.rain,
      snow: currProf.snow,
      fog: currProf.fog,
      overcast: currProf.overcast,
      storm: currProf.storm,
      drizzle: currProf.drizzle,
      blizzard: currProf.blizzard,
      clear: currProf.clear,
      cloudShadowAlpha: currProf.cloudShadowAlpha,
      cloudShadowScale: currProf.cloudShadowScale,
      effectiveGrip: currProf.grip,
      isWetSurface: currProf.isWet
    };
  }

  const prevProf = getRawWeatherProfile(previous, isFreezing);
  const wPrev = 1.0 - t;
  const wCurr = t;

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
  const effectiveGrip = prevProf.grip * wPrev + currProf.grip * wCurr;
  const isWetSurface = rain > 0.05 || snow > 0.05 || (prevProf.isWet && wPrev > 0.3) || currProf.isWet;

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
    isWetSurface
  };
}

// --- ASTRONOMICAL GREGORIAN CALENDAR & SEASONAL CLIMATE SIMULATION ---
// First-principles physical model:
// 1. Gregorian Calendar with astronomical leap years (год % 4, % 100, % 400).
// 2. Continuous solar declination & seasonal daylight length (photoperiod).
// 3. Realistic continental temperate thermodynamics (Зима, Весна, Лето, Осень).
// 4. Dynamic seasonal meteorology: barometric pressure, snow, blizzard, rain, fog.

import { WeatherType } from './types';

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

export interface ClimateAtmosphere {
  temperature: number;      // Current ambient temperature in °C
  surfaceTemp: number;      // Ground/asphalt surface temperature in °C
  humidity: number;         // Relative humidity 0..100%
  pressureHpa: number;      // Atmospheric pressure in hPa (standard 1013.25)
  pressureMmHg: number;     // Pressure in mmHg (standard 760)
  solarIntensity: number;   // 0.0 (night) to 1.0 (high noon clear sun)
  isFreezing: boolean;      // temperature <= 0°C
  isSnowCovered: boolean;   // ground snow persistence
}

export const MONTH_DAYS_NORMAL = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTH_DAYS_LEAP   = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const MONTH_NAMES_NOMINATIVE = [
  '',
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const MONTH_NAMES_GENITIVE = [
  '',
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

export const DAY_OF_WEEK_SHORT = ['', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
export const DAY_OF_WEEK_FULL = [
  '',
  'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'
];

/**
 * Checks if the specified year is a leap year according to astronomical Gregorian calendar rules.
 * A year is leap if divisible by 4, except end-of-century years which must be divisible by 400.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Returns number of days in the specified month (1-12) for the given year.
 */
export function getDaysInMonth(year: number, month: number): number {
  const table = isLeapYear(year) ? MONTH_DAYS_LEAP : MONTH_DAYS_NORMAL;
  if (month < 1 || month > 12) return 31;
  return table[month];
}

/**
 * Computes day of the year (1 to 365/366).
 */
export function getDayOfYear(year: number, month: number, day: number): number {
  const table = isLeapYear(year) ? MONTH_DAYS_LEAP : MONTH_DAYS_NORMAL;
  let doy = 0;
  for (let m = 1; m < month; m++) {
    doy += table[m];
  }
  return doy + day;
}

/**
 * Calculates Day of the Week (1 = Monday ... 7 = Sunday) using Sakamoto's algorithm.
 */
export function getDayOfWeekNumber(year: number, month: number, day: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = month < 3 ? year - 1 : year;
  const dow = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + day) % 7;
  return dow === 0 ? 7 : dow;
}

/**
 * Returns astronomical season for the given month.
 */
export function getSeasonForMonth(month: number): Season {
  if (month === 12 || month === 1 || month === 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  return 'autumn';
}

/**
 * Calculates solar declination, day length, sunrise, and sunset times
 * for latitude 55° N (temperate continental zone, e.g. Central European / Russian latitude).
 */
export function calculateSolarEphemeris(dayOfYear: number, isLeap: boolean): {
  sunriseHour: number;
  sunsetHour: number;
  daylightHours: number;
  solarDeclinationDeg: number;
} {
  const totalDays = isLeap ? 366 : 365;
  // Earth axial tilt is 23.44°
  // Day 355 / 356 is winter solstice (min declination -23.44°)
  // Day 172 / 173 is summer solstice (max declination +23.44°)
  const fractionalYear = ((2 * Math.PI) / totalDays) * (dayOfYear + 10);
  const declinationRad = -23.44 * (Math.PI / 180) * Math.cos(fractionalYear);
  const declinationDeg = declinationRad * (180 / Math.PI);

  const latitudeRad = 55.0 * (Math.PI / 180);

  // Hour angle formula: cos(w0) = -tan(lat) * tan(dec)
  let cosHourAngle = -Math.tan(latitudeRad) * Math.tan(declinationRad);
  cosHourAngle = Math.max(-1.0, Math.min(1.0, cosHourAngle));

  const hourAngleRad = Math.acos(cosHourAngle);
  const hourAngleDeg = hourAngleRad * (180 / Math.PI);

  // Solar daylight hours = 2 * (w0 / 15°)
  const daylightHours = (2 * hourAngleDeg) / 15.0;

  // Local solar noon is at 12:30 (accounting for standard civil time zone offset)
  const solarNoon = 12.5;
  const halfDay = daylightHours / 2.0;

  const sunriseHour = Math.max(3.5, Math.min(9.5, solarNoon - halfDay));
  const sunsetHour = Math.max(15.5, Math.min(22.5, solarNoon + halfDay));

  return {
    sunriseHour,
    sunsetHour,
    daylightHours,
    solarDeclinationDeg: declinationDeg
  };
}

/**
 * Creates default initial calendar state: Thursday, October 8, 2026, 10:00.
 */
export function createInitialCalendarState(
  year: number = 2026,
  month: number = 10,
  day: number = 8,
  timeHour: number = 10.0
): GameCalendarState {
  const leap = isLeapYear(year);
  const doy = getDayOfYear(year, month, day);
  const dow = getDayOfWeekNumber(year, month, day);
  const season = getSeasonForMonth(month);
  const ephemeris = calculateSolarEphemeris(doy, leap);

  return {
    year,
    month,
    day,
    timeHour: ((timeHour % 24) + 24) % 24,
    season,
    dayOfYear: doy,
    dayOfWeek: dow,
    isLeapYear: leap,
    sunriseHour: ephemeris.sunriseHour,
    sunsetHour: ephemeris.sunsetHour,
    daylightHours: ephemeris.daylightHours
  };
}

/**
 * Advances the astronomical calendar by a given amount of in-game hours.
 * Automatically wraps days, months, and leap years according to strict physical time laws.
 */
export function advanceCalendar(
  current: GameCalendarState,
  deltaHours: number
): { calendar: GameCalendarState; wrappedDays: number } {
  let newHour = current.timeHour + deltaHours;
  let wrappedDays = 0;

  let y = current.year;
  let m = current.month;
  let d = current.day;

  while (newHour >= 24.0) {
    newHour -= 24.0;
    wrappedDays++;
    d++;

    const maxDays = getDaysInMonth(y, m);
    if (d > maxDays) {
      d = 1;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }

  while (newHour < 0.0) {
    newHour += 24.0;
    wrappedDays--;
    d--;

    if (d < 1) {
      m--;
      if (m < 1) {
        m = 12;
        y--;
      }
      d = getDaysInMonth(y, m);
    }
  }

  const leap = isLeapYear(y);
  const doy = getDayOfYear(y, m, d);
  const dow = getDayOfWeekNumber(y, m, d);
  const season = getSeasonForMonth(m);
  const ephemeris = calculateSolarEphemeris(doy, leap);

  return {
    wrappedDays,
    calendar: {
      year: y,
      month: m,
      day: d,
      timeHour: newHour,
      season,
      dayOfYear: doy,
      dayOfWeek: dow,
      isLeapYear: leap,
      sunriseHour: ephemeris.sunriseHour,
      sunsetHour: ephemeris.sunsetHour,
      daylightHours: ephemeris.daylightHours
    }
  };
}

/**
 * Computes realistic thermodynamic atmosphere parameters based on calendar day, solar position, and weather.
 */
export function calculateClimateAtmosphere(
  calendar: GameCalendarState,
  weather: WeatherType = 'clear'
): ClimateAtmosphere {
  const doy = calendar.dayOfYear;
  const hour = calendar.timeHour;

  // 1. Annual Base Temperature Wave (Continental Temperate Climate):
  // Thermal inertia causes ~25 days lag behind astronomical solstices (peak cold mid-Jan, peak heat mid-July).
  // Mid-January (doy ~15): -12°C baseline (ranges from -25°C to -3°C)
  // Mid-July (doy ~196): +22°C baseline (ranges from +15°C to +30°C)
  const annualAngle = ((2 * Math.PI) / (calendar.isLeapYear ? 366 : 365)) * (doy - 105);
  const annualBaseTemp = 5.0 + 17.0 * Math.sin(annualAngle);

  // 2. Diurnal Solar Modulation (Суточный ход температуры):
  // Solar thermal peak occurs ~2.5 hours after solar noon (~14:30 - 15:00).
  // Minimum temperature occurs right around dawn.
  const diurnalCycle = Math.sin(((hour - 8.5) / 24) * 2 * Math.PI);

  // Daily thermal amplitude is higher in dry summer (±6.5°C) and lower in overcast winter (±3.5°C)
  const amplitude = calendar.season === 'summer' ? 6.5 : (calendar.season === 'winter' ? 3.5 : 5.0);
  let temp = annualBaseTemp + diurnalCycle * amplitude;

  // 3. Meteorological Front Effects (Влияние облачности и осадков):
  let humidity = 60;
  let pressureHpa = 1013.25;

  switch (weather) {
    case 'clear':
      // Clear skies: direct solar heating during day, radiative cooling at night
      temp += diurnalCycle > 0 ? 2.5 : -2.5;
      humidity = Math.max(35, 65 - diurnalCycle * 20);
      pressureHpa = 1022.0; // High pressure anticyclone
      break;

    case 'overcast':
      // Overcast: insulated night, subdued daytime heating
      temp -= diurnalCycle > 0 ? 2.0 : -1.5;
      humidity = 78;
      pressureHpa = 1010.0;
      break;

    case 'drizzle':
      temp -= 2.8;
      humidity = 90;
      pressureHpa = 1006.0;
      break;

    case 'rain':
      temp -= 4.2;
      humidity = 95;
      pressureHpa = 1002.0;
      break;

    case 'storm':
      temp -= 6.5; // Cold thunderstorm outflow front
      humidity = 98;
      pressureHpa = 994.0; // Low pressure cyclone depression
      break;

    case 'fog':
      temp -= 2.0;
      humidity = 99;
      pressureHpa = 1014.0;
      break;

    case 'snow':
      // Sub-zero precipitation
      temp = Math.min(-0.5, temp - 2.0);
      humidity = 88;
      pressureHpa = 1008.0;
      break;

    case 'blizzard':
      // Severe arctic gale
      temp = Math.min(-4.0, temp - 6.5);
      humidity = 92;
      pressureHpa = 992.0;
      break;
  }

  // 4. Solar Intensity (0.0 at night to 1.0 at clear noon)
  let solarIntensity = 0.0;
  if (hour >= calendar.sunriseHour && hour <= calendar.sunsetHour) {
    const sunProgress = (hour - calendar.sunriseHour) / (calendar.sunsetHour - calendar.sunriseHour);
    solarIntensity = Math.sin(sunProgress * Math.PI);
    if (weather === 'overcast' || weather === 'fog') solarIntensity *= 0.35;
    else if (weather === 'rain' || weather === 'drizzle' || weather === 'snow') solarIntensity *= 0.22;
    else if (weather === 'storm' || weather === 'blizzard') solarIntensity *= 0.08;
  }

  const roundedTemp = Math.round(temp * 10) / 10;
  const isFreezing = roundedTemp <= 0;

  // Surface temperature (asphalt warms up under clear sun, freezes in winter)
  let surfaceTemp = roundedTemp;
  if (solarIntensity > 0.1 && weather === 'clear') {
    surfaceTemp += solarIntensity * 8.5; // Solar blackbody pavement heating
  } else if (isFreezing) {
    surfaceTemp -= 1.0;
  }

  const isSnowCovered = calendar.season === 'winter' || (calendar.season === 'autumn' && calendar.month === 11 && roundedTemp < 1.0) || (calendar.season === 'spring' && calendar.month === 3 && roundedTemp < 1.0);

  return {
    temperature: roundedTemp,
    surfaceTemp: Math.round(surfaceTemp * 10) / 10,
    humidity: Math.round(humidity),
    pressureHpa: Math.round(pressureHpa * 10) / 10,
    pressureMmHg: Math.round((pressureHpa * 0.750062) * 10) / 10,
    solarIntensity,
    isFreezing,
    isSnowCovered
  };
}

/**
 * Returns physically suitable weather types for the specified calendar state and temperature.
 * Strictly prevents liquid rain in sub-zero winter cold and guarantees authentic weather patterns.
 */
export function getSeasonalWeatherProbabilities(
  calendar: GameCalendarState,
  temperature: number
): { weather: WeatherType; weight: number }[] {
  const season = calendar.season;
  const isBelowFreezing = temperature <= 0.5;

  if (isBelowFreezing) {
    // Sub-zero freezing regime: rain is physically impossible, only snow, blizzard, overcast, clear, or freezing fog
    return [
      { weather: 'snow', weight: 38 },
      { weather: 'overcast', weight: 26 },
      { weather: 'clear', weight: 20 },
      { weather: 'blizzard', weight: 12 },
      { weather: 'fog', weight: 4 }
    ];
  }

  switch (season) {
    case 'winter':
      // Mild winter thaw above 0°C
      return [
        { weather: 'overcast', weight: 40 },
        { weather: 'drizzle', weight: 25 },
        { weather: 'fog', weight: 20 },
        { weather: 'clear', weight: 15 }
      ];

    case 'spring':
      return [
        { weather: 'clear', weight: 40 },
        { weather: 'overcast', weight: 25 },
        { weather: 'drizzle', weight: 15 },
        { weather: 'rain', weight: 12 },
        { weather: 'fog', weight: 8 }
      ];

    case 'summer':
      return [
        { weather: 'clear', weight: 52 },
        { weather: 'overcast', weight: 18 },
        { weather: 'rain', weight: 16 },
        { weather: 'storm', weight: 14 }
      ];

    case 'autumn':
      return [
        { weather: 'overcast', weight: 35 },
        { weather: 'drizzle', weight: 22 },
        { weather: 'rain', weight: 18 },
        { weather: 'fog', weight: 15 },
        { weather: 'clear', weight: 10 }
      ];
  }
}

/**
 * Picks a realistic random weather type according to seasonal weights.
 */
export function pickRandomSeasonalWeather(
  calendar: GameCalendarState,
  temperature: number
): WeatherType {
  const list = getSeasonalWeatherProbabilities(calendar, temperature);
  const total = list.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (const item of list) {
    if (r <= item.weight) return item.weather;
    r -= item.weight;
  }
  return 'clear';
}

/**
 * Formats game time as HH:MM.
 */
export function formatGameTime(timeHour: number): string {
  const safe = ((timeHour % 24) + 24) % 24;
  const h = Math.floor(safe);
  const m = Math.floor((safe - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats game date in Russian according to the requested style:
 * - 'short': "08.10.2026"
 * - 'medium': "8 окт 2026, Чт"
 * - 'full': "Четверг, 8 октября 2026 г."
 * - 'dashboard': "ЧТ 08.10.26"
 */
export function formatGameDate(
  calendar: GameCalendarState,
  style: 'short' | 'medium' | 'full' | 'dashboard' = 'full'
): string {
  const { year, month, day, dayOfWeek } = calendar;
  const dStr = String(day).padStart(2, '0');
  const mStr = String(month).padStart(2, '0');
  const dowShort = DAY_OF_WEEK_SHORT[dayOfWeek] || '';
  const dowFull = DAY_OF_WEEK_FULL[dayOfWeek] || '';
  const monthGen = MONTH_NAMES_GENITIVE[month] || '';

  switch (style) {
    case 'short':
      return `${dStr}.${mStr}.${year}`;
    case 'dashboard':
      return `${dowShort} ${dStr}.${mStr}.${String(year).slice(-2)}`;
    case 'medium':
      return `${day} ${monthGen.slice(0, 3)} ${year}, ${dowShort}`;
    case 'full':
    default:
      return `${dowFull}, ${day} ${monthGen} ${year} г.`;
  }
}

/**
 * Returns Russian name for the specified season.
 */
export function getRussianSeasonName(season: Season): string {
  switch (season) {
    case 'winter': return 'Зима';
    case 'spring': return 'Весна';
    case 'summer': return 'Лето';
    case 'autumn': return 'Осень';
  }
}

/**
 * Returns human-readable meteorological description in Russian.
 */
export function getRussianWeatherDescription(weather: WeatherType, isFreezing: boolean): string {
  switch (weather) {
    case 'clear':
      return isFreezing ? 'Ясно • Мороз' : 'Ясно • Солнечно';
    case 'overcast':
      return isFreezing ? 'Пасмурно • Свинцовые тучи' : 'Пасмурно';
    case 'drizzle':
      return 'Сырая морось';
    case 'rain':
      return 'Обложной дождь';
    case 'storm':
      return 'Грозовой шторм';
    case 'fog':
      return isFreezing ? 'Морозный ледяной туман' : 'Густой туман';
    case 'snow':
      return 'Снегопад';
    case 'blizzard':
      return 'Метель • Штормовой буран';
  }
}

import {
  Building,
  GameWorld,
  Intersection,
  Pedestrian,
  PedestrianBiology,
  PedestrianClothingType,
  PedestrianPsychology,
  PedestrianWeatherTier,
  StreetProp,
  Vector2D,
  Vehicle,
  WeatherType,
} from './types';
import {
  checkPedestrianBuildingCollision,
  checkPedestrianRollingStockCollision,
  checkPedestrianVehicleCollision,
  getBuildingEntrancePos,
  getOutsideTemperature,
  getPropHitbox,
} from './physics';
import { PX_S_TO_SPEED_KMH } from './vehicleHelpers';
import { getUniversalWaterDepthAt } from './riverSystem';
import { SpatialGrid } from './spatialGrid';
import { performanceConfig } from './performanceConfig';
import { onlineManager } from './onlineSystem';

// ============================================================================
// REUSABLE SCRATCH BUFFERS (Zero per-frame GC allocations in hot loops)
// ============================================================================
const _vehScratch: Vehicle[] = [];
const _pedScratch: Pedestrian[] = [];
const _bldScratch: Building[] = [];
const _propScratch: StreetProp[] = [];
const _groupsMap = new Map<string, Pedestrian[]>();

// ============================================================================
// REALISTIC NATURAL COLOR PALETTES (Clothing, Skin, Hair, Accessories)
// ============================================================================
const SKIN_PALETTE = [
  '#f6d5bc', '#efc2a0', '#e8b48e', '#ddb08b',
  '#cf9b74', '#be8760', '#a46e49', '#825436',
  '#f2cfb3', '#e4b792',
];

const HAIR_PALETTE_YOUNG = [
  '#1c1917', '#29211d', '#3b2619', '#4f3220',
  '#6c482c', '#8c6239', '#b58d52', '#c8a66b',
  '#7c321c', '#201e24',
];

const HAIR_PALETTE_ELDERLY = [
  '#cbd5e1', '#94a3b8', '#e2e8f0', '#a8a29e', '#78716c', '#d6d3d1',
];

const WINTER_COAT_COLORS = [
  '#1b2432', '#263344', '#2e2b29', '#3f2e24', '#1f3328',
  '#4c1d24', '#333b48', '#524940', '#2c3e50', '#6b2c2c',
  '#3e4c3a', '#4a3f55', '#7c5334', '#2b2d42',
];

const AUTUMN_JACKET_COLORS = [
  '#334155', '#475569', '#574233', '#274034', '#3b2f4a',
  '#6e3b2e', '#1e3a5f', '#4a5546', '#7c5d3a', '#262930',
  '#8c4a32', '#3d4f61',
];

const RAINCOAT_COLORS = [
  '#ca8a04', '#0f766e', '#1d4ed8', '#334155', '#991b1b',
  '#15803d', '#3f6212', '#1e293b', '#0369a1',
];

const SUMMER_TOP_COLORS = [
  '#e2e8f0', '#f1f5f9', '#3b82f6', '#0d9488', '#d97706',
  '#e11d48', '#4f46e5', '#059669', '#64748b', '#7c3aed',
  '#be185d', '#0284c7', '#b45309', '#334155', '#65a30d',
];

const PANTS_WINTER_COLORS = [
  '#18181b', '#1e293b', '#27272a', '#292524', '#1f2937', '#334155',
];

const PANTS_MILD_COLORS = [
  '#1e3a5f', '#334155', '#1f2937', '#3f3f46', '#57534e',
  '#475569', '#292524', '#6b5b47', '#2c3e50',
];

const SHORTS_COLORS = [
  '#475569', '#78716c', '#a89078', '#1e3a5f', '#334155', '#52525b', '#3f4f3c',
];

const SCARF_COLORS = [
  '#991b1b', '#b45309', '#1e3a8a', '#065f46', '#6b21a8',
  '#475569', '#9a3412', '#d6d3d1', '#334155', '#831843',
];

const HAT_WINTER_COLORS = [
  '#1e293b', '#3f3f46', '#7f1d1d', '#14532d', '#1e3a8a',
  '#57534e', '#78350f', '#312e81', '#4c1d95',
];

const UMBRELLA_COLORS = [
  '#1e293b', '#b91c1c', '#1d4ed8', '#047857', '#6d28d9',
  '#b45309', '#0f766e', '#334155', '#9f1239',
];

const DOG_BREEDS: { breed: NonNullable<Pedestrian['dogBreed']>; colors: string[] }[] = [
  { breed: 'retriever', colors: ['#c89448', '#d4a65a', '#b67d38'] },
  { breed: 'husky', colors: ['#64748b', '#475569', '#94a3b8'] },
  { breed: 'shepherd', colors: ['#7c4a24', '#5c361a', '#8c5a2b'] },
  { breed: 'corgi', colors: ['#d97724', '#c96d26'] },
  { breed: 'terrier', colors: ['#44403c', '#78716c', '#a16207'] },
];

// ============================================================================
// CONTEXTUAL AUTHENTIC RUSSIAN PHRASES
// ============================================================================
const PHRASES_GREETING_INIT = ['Привет!', 'Добрый день!', 'Здравствуй!', 'О, привет!', 'Как дела?'];
const PHRASES_GREETING_REPLY = ['Привет!', 'Отлично!', 'Рад видеть!', 'Хорошего дня!', 'Нормально, спасибо!'];
const PHRASES_HORN = ['Чего сигналишь?', 'Тише!', 'Вижу, вижу!', 'Куда спешишь?!', 'Спокойнее!'];
const PHRASES_NEAR_MISS = ['Эй, осторожнее!', 'Ты с ума сошёл?!', 'Стой!!', 'Смотри куда едешь!', 'Аккуратнее!'];
const PHRASES_HIT = ['Ай!!', 'Больно!', 'Ты меня сбил!!', 'Вызовите скорую!', 'Нога...'];
const PHRASES_SPLASH = ['Эй, облил!', 'Аккуратнее по лужам!', 'Весь промок!'];
const PHRASES_RAIN_NO_UMB = ['Надо укрыться...', 'Опять ливень!', 'Промокну ведь!', 'Быстрее под крышу!'];
const PHRASES_COLD = ['Холодина...', 'Брр, мороз!', 'Ветер ледяной...', 'Пальцы замёрзли...'];
const PHRASES_HEAT = ['Жарища...', 'Душно сегодня...', 'Воды бы...'];
const PHRASES_FIRE_CALL = ['Вызываю 112!', 'Алло, пожар!', 'Срочно пожарных!'];
const PHRASES_FIRE_PANIC = ['Пожар!! Бежим!', 'Горит!! Отойдите!', 'Спасайтесь!'];
const PHRASES_WATCH_CRASH = ['Ужас, авария!', 'Все живы?!', 'Ничего себе...', 'Надо скорую вызвать!'];
const PHRASES_SIREN = ['Пропустите спецтранспорт!', 'Сирена, стоим...', 'Пожарные едут!'];
const PHRASES_BUMP_PLAYER = ['Осторожнее!', 'Извините!', 'Смотри под ноги!', 'Эй, не толкайся!'];
const PHRASES_CHECK_INJURED = ['Вам плохо?!', 'Держитесь, сейчас помогу!', 'Вызвать скорую?'];
const PHRASES_ENTER_BLD = ['Пора внутрь', 'Зайду согреться', 'За покупками', 'На работу', 'Домой пора'];
const PHRASES_EXIT_BLD = ['На свежий воздух', 'Дела сделаны', 'Пойду дальше', 'Хорошо прошёлся'];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function normalizeAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r < -Math.PI) r += Math.PI * 2;
  return r;
}

function speak(ped: Pedestrian, text: string, duration: number, nowSec: number, force = false): void {
  const psy = ped.psy;
  if (!force && psy && nowSec - psy.lastSpeechTime < 5.5) return;
  if (!force && ped.alertBubbleText && ped.alertBubbleTimer > 0.3) return;
  ped.alertBubbleText = text;
  ped.alertBubbleTimer = duration;
  if (psy) psy.lastSpeechTime = nowSec;
}

// ============================================================================
// 1. WEATHER-APPROPRIATE WARDROBE SYSTEM
// ============================================================================

export function getWeatherClothingTier(tempC: number, weather: WeatherType): PedestrianWeatherTier {
  // Wind chill & precipitation lower felt temperature realistically
  let feltC = tempC;
  if (weather === 'blizzard') feltC -= 7.5;
  else if (weather === 'snow') feltC -= 3.0;
  else if (weather === 'storm') feltC -= 4.5;
  else if (weather === 'rain') feltC -= 2.5;
  else if (weather === 'drizzle') feltC -= 1.2;

  if (feltC <= -3.5 || weather === 'blizzard' || (weather === 'snow' && tempC <= 0.5)) return 'freezing';
  if (feltC <= 6.5) return 'cold';
  if (feltC <= 15.5) return 'cool';
  if (feltC <= 23.5) return 'mild';
  return 'hot';
}

export function getClothingInsulationClo(ped: Pedestrian): number {
  let clo = 0.55;
  switch (ped.clothingType) {
    case 'parka': clo = 2.05; break;
    case 'winter_coat': clo = 1.85; break;
    case 'puffer': clo = 1.65; break;
    case 'trench': clo = 1.15; break;
    case 'raincoat': clo = 1.05; break;
    case 'open_jacket': clo = 1.0; break;
    case 'suit': clo = 0.95; break;
    case 'hoodie': clo = 0.9; break;
    case 'sweater': clo = 0.85; break;
    case 'vest': clo = 0.8; break;
    case 'button_shirt': clo = 0.6; break;
    case 'dress': clo = 0.45; break;
    case 'tshirt': clo = 0.4; break;
    case 'tank': clo = 0.28; break;
    default: clo = 0.55; break;
  }
  if (ped.hasShorts) clo -= 0.14;
  if (ped.scarfColor) clo += 0.2;
  if (ped.glovesColor) clo += 0.18;
  if (ped.hasHat && (ped.hatType === 'beanie' || ped.hatType === 'ushanka')) clo += 0.22;
  if (ped.hoodUp) clo += 0.16;
  if (ped.footwearType === 'winter_boots') clo += 0.15;
  return clamp(clo, 0.22, 2.5);
}

export interface WeatherAppearanceOptions {
  tempC?: number;
  weather?: WeatherType;
  timeHour?: number;
  gender?: 'male' | 'female';
  ageGroup?: 'child' | 'adult' | 'elderly';
}

export function generateWeatherAppropriateAppearance(opts: WeatherAppearanceOptions = {}) {
  const tempC = opts.tempC ?? 17;
  const weather: WeatherType = opts.weather ?? 'clear';
  const timeHour = opts.timeHour ?? 12;
  const tier = getWeatherClothingTier(tempC, weather);
  const isPrecipRain = weather === 'rain' || weather === 'storm' || weather === 'drizzle';
  const isSunnyDay = weather === 'clear' && timeHour >= 8.5 && timeHour <= 19.5;
  const isMorning = timeHour >= 6.5 && timeHour <= 10.5;

  const gender: 'male' | 'female' = opts.gender ?? (Math.random() < 0.5 ? 'male' : 'female');
  let ageGroup: 'child' | 'adult' | 'elderly' = opts.ageGroup ?? 'adult';
  if (!opts.ageGroup) {
    const r = Math.random();
    if (r < 0.13) ageGroup = 'child';
    else if (r < 0.26) ageGroup = 'elderly';
    else ageGroup = 'adult';
  }

  const hairStylesMale: NonNullable<Pedestrian['hairStyle']>[] =
    ageGroup === 'elderly'
      ? ['short', 'bald', 'bald', 'short']
      : ageGroup === 'child'
        ? ['short', 'spiky', 'curly']
        : ['short', 'short', 'spiky', 'curly', 'bald', 'afro'];
  const hairStylesFemale: NonNullable<Pedestrian['hairStyle']>[] =
    ageGroup === 'elderly'
      ? ['bun', 'bob', 'short', 'curly']
      : ageGroup === 'child'
        ? ['ponytail', 'long', 'bob', 'curly']
        : ['long', 'ponytail', 'bun', 'bob', 'short', 'curly'];

  const hairStyle = gender === 'male' ? pick(hairStylesMale) : pick(hairStylesFemale);
  const hairColor = ageGroup === 'elderly' ? pick(HAIR_PALETTE_ELDERLY) : pick(HAIR_PALETTE_YOUNG);
  const skinColor = pick(SKIN_PALETTE);

  let clothingType: PedestrianClothingType = 'tshirt';
  let shirtColor = pick(SUMMER_TOP_COLORS);
  let jacketColor = pick(AUTUMN_JACKET_COLORS);
  let innerShirtColor = pick(['#f8fafc', '#e2e8f0', '#cbd5e1', '#1e293b', '#334155', '#d97706', '#0284c7']);
  let pantsColor = pick(PANTS_MILD_COLORS);
  let hasShorts = false;
  let footwearType: NonNullable<Pedestrian['footwearType']> = 'sneakers';
  let footwearColor = pick(['#1e293b', '#334155', '#f1f5f9', '#44403c', '#292524']);
  let hasHat = false;
  let hatType: NonNullable<Pedestrian['hatType']> = 'cap';
  let hatColor = pick(HAT_WINTER_COLORS);
  let scarfColor: string | null = null;
  let glovesColor: string | null = null;
  let hoodUp = false;

  if (tier === 'freezing') {
    const winterPool: PedestrianClothingType[] =
      ageGroup === 'elderly'
        ? ['winter_coat', 'parka', 'winter_coat']
        : ['parka', 'puffer', 'winter_coat', 'parka'];
    clothingType = pick(winterPool);
    shirtColor = pick(WINTER_COAT_COLORS);
    jacketColor = shirtColor;
    pantsColor = pick(PANTS_WINTER_COLORS);
    footwearType = 'winter_boots';
    footwearColor = pick(['#1c1917', '#292524', '#3f2e24', '#18181b']);
    hasHat = Math.random() < 0.88;
    hatType = Math.random() < (ageGroup === 'elderly' ? 0.55 : 0.28) ? 'ushanka' : 'beanie';
    hatColor = pick(HAT_WINTER_COLORS);
    scarfColor = Math.random() < 0.82 ? pick(SCARF_COLORS) : null;
    glovesColor = Math.random() < 0.86 ? pick(['#18181b', '#27272a', '#451a03', '#334155', '#1e293b']) : null;
    hoodUp = !hasHat && clothingType === 'parka' && Math.random() < 0.8;
  } else if (tier === 'cold') {
    const coldPool: PedestrianClothingType[] = isPrecipRain
      ? ['raincoat', 'parka', 'puffer', 'trench']
      : ['puffer', 'winter_coat', 'open_jacket', 'trench', 'hoodie'];
    clothingType = pick(coldPool);
    shirtColor = clothingType === 'raincoat' ? pick(RAINCOAT_COLORS) : pick(WINTER_COAT_COLORS);
    jacketColor = shirtColor;
    pantsColor = pick(PANTS_WINTER_COLORS);
    footwearType = Math.random() < 0.72 ? 'boots' : 'sneakers';
    footwearColor = pick(['#1c1917', '#451a03', '#292524', '#1e293b']);
    hasHat = Math.random() < 0.58;
    hatType = ageGroup === 'elderly' && Math.random() < 0.3 ? 'fedora' : 'beanie';
    hatColor = pick(HAT_WINTER_COLORS);
    scarfColor = Math.random() < 0.55 ? pick(SCARF_COLORS) : null;
    glovesColor = Math.random() < 0.42 ? pick(['#18181b', '#292524', '#334155']) : null;
    hoodUp = isPrecipRain && (clothingType === 'raincoat' || clothingType === 'hoodie' || clothingType === 'parka') && Math.random() < 0.75;
  } else if (tier === 'cool') {
    const coolPool: PedestrianClothingType[] = isPrecipRain
      ? ['raincoat', 'trench', 'hoodie', 'open_jacket']
      : ['open_jacket', 'hoodie', 'sweater', 'trench', 'vest', 'suit', 'button_shirt'];
    clothingType = pick(coolPool);
    shirtColor = clothingType === 'raincoat' ? pick(RAINCOAT_COLORS) : pick(AUTUMN_JACKET_COLORS);
    jacketColor = clothingType === 'open_jacket' ? pick(AUTUMN_JACKET_COLORS) : shirtColor;
    pantsColor = pick(PANTS_MILD_COLORS);
    footwearType = clothingType === 'suit' ? 'loafers' : Math.random() < 0.4 ? 'boots' : 'sneakers';
    footwearColor = footwearType === 'loafers' ? '#1c1917' : pick(['#1e293b', '#334155', '#e2e8f0', '#44403c']);
    hasHat = Math.random() < 0.24;
    hatType = ageGroup === 'elderly' ? 'fedora' : Math.random() < 0.5 ? 'beanie' : 'cap';
    hatColor = pick(AUTUMN_JACKET_COLORS);
    scarfColor = Math.random() < 0.24 ? pick(SCARF_COLORS) : null;
    hoodUp = isPrecipRain && (clothingType === 'raincoat' || clothingType === 'hoodie') && Math.random() < 0.65;
  } else if (tier === 'mild') {
    const mildPool: PedestrianClothingType[] = isPrecipRain
      ? ['raincoat', 'hoodie', 'open_jacket', 'trench']
      : gender === 'female'
        ? ['tshirt', 'button_shirt', 'dress', 'open_jacket', 'hoodie', 'sweater']
        : ['tshirt', 'button_shirt', 'open_jacket', 'hoodie', 'suit', 'vest'];
    clothingType = pick(mildPool);
    shirtColor = clothingType === 'raincoat' ? pick(RAINCOAT_COLORS) : pick(SUMMER_TOP_COLORS);
    jacketColor = pick(AUTUMN_JACKET_COLORS);
    pantsColor = pick(PANTS_MILD_COLORS);
    hasShorts = !isPrecipRain && clothingType === 'tshirt' && Math.random() < 0.16;
    if (hasShorts) pantsColor = pick(SHORTS_COLORS);
    footwearType = clothingType === 'suit' ? 'loafers' : 'sneakers';
    footwearColor = pick(['#f8fafc', '#1e293b', '#334155', '#64748b', '#78350f']);
    hasHat = Math.random() < (isSunnyDay ? 0.22 : 0.10);
    hatType = ageGroup === 'elderly' ? 'fedora' : 'cap';
    hatColor = pick(AUTUMN_JACKET_COLORS);
    hoodUp = isPrecipRain && (clothingType === 'raincoat' || clothingType === 'hoodie') && Math.random() < 0.6;
  } else {
    // Hot summer (> 23.5°C)
    const hotPool: PedestrianClothingType[] = isPrecipRain
      ? ['raincoat', 'tshirt', 'button_shirt']
      : gender === 'female'
        ? ['dress', 'tshirt', 'tank', 'dress', 'button_shirt']
        : ['tshirt', 'tank', 'tshirt', 'button_shirt'];
    clothingType = pick(hotPool);
    shirtColor = clothingType === 'raincoat' ? pick(RAINCOAT_COLORS) : pick(SUMMER_TOP_COLORS);
    jacketColor = shirtColor;
    hasShorts = clothingType !== 'dress' && Math.random() < 0.62;
    pantsColor = hasShorts ? pick(SHORTS_COLORS) : pick(PANTS_MILD_COLORS);
    footwearType = hasShorts && Math.random() < 0.45 ? 'sandals' : 'sneakers';
    footwearColor = footwearType === 'sandals' ? pick(['#78350f', '#44403c', '#1c1917']) : pick(['#f8fafc', '#e2e8f0', '#334155']);
    hasHat = Math.random() < (isSunnyDay ? 0.34 : 0.12);
    hatType = gender === 'female' && Math.random() < 0.55 ? 'sunhat' : 'cap';
    hatColor = hatType === 'sunhat' ? pick(['#e7d8b1', '#d6c394', '#f5e6c8']) : pick(SUMMER_TOP_COLORS);
  }

  // Glasses: sunglasses in bright sunny weather, optical glasses more common in elderly/adults
  let hasGlasses = false;
  let glassesStyle: 'optical' | 'sunglasses' = 'optical';
  if (isSunnyDay && Math.random() < (tier === 'hot' ? 0.42 : 0.24)) {
    hasGlasses = true;
    glassesStyle = 'sunglasses';
  } else if (Math.random() < (ageGroup === 'elderly' ? 0.42 : 0.15)) {
    hasGlasses = true;
    glassesStyle = 'optical';
  }

  const hasHeadphones = ageGroup !== 'elderly' && !hoodUp && (!hasHat || hatType === 'cap') && Math.random() < 0.18;

  // Contextually relevant handheld prop (more hot coffee in morning/cold!)
  let handheldProp: Pedestrian['handheldProp'] = null;
  const propRoll = Math.random();
  if (ageGroup !== 'child') {
    if (propRoll < (isMorning || tier === 'cold' || tier === 'freezing' ? 0.24 : 0.13)) {
      handheldProp = 'coffee';
    } else if (propRoll < 0.38) {
      handheldProp = 'phone';
    } else if (propRoll < 0.52) {
      handheldProp = 'bag';
    } else if (propRoll < 0.57 && ageGroup === 'adult') {
      handheldProp = 'box';
    }
  }

  // ~66% of people carry an umbrella when it's raining/overcast; ~34% get caught without one and react!
  const ownsUmbrella = Math.random() < (isPrecipRain ? 0.66 : 0.42);
  const umbrellaColor = pick(UMBRELLA_COLORS);
  const dogEntry = pick(DOG_BREEDS);

  return {
    gender,
    ageGroup,
    clothingType,
    jacketColor,
    innerShirtColor,
    skinColor,
    shirtColor,
    pantsColor,
    hairColor,
    hairStyle,
    hasHat,
    hatColor,
    hatType,
    hasGlasses,
    glassesStyle,
    hasHeadphones,
    hasShorts,
    footwearType,
    footwearColor,
    scarfColor,
    glovesColor,
    hoodUp,
    weatherTier: tier,
    ownsUmbrella,
    umbrellaColor,
    handheldProp,
    propColor: pick(SUMMER_TOP_COLORS),
    hasDroppedProp: false,
    dogBreed: dogEntry.breed,
    dogColor: pick(dogEntry.colors),
  };
}

/**
 * Dynamically adapts a pedestrian's outer gear when weather or season shifts live in-game.
 */
export function adaptPedestrianClothingToWeather(
  ped: Pedestrian,
  tempC: number,
  weather: WeatherType,
  timeHour: number
): void {
  if ((ped as any).isFirefighter) return;

  const targetTier = getWeatherClothingTier(tempC, weather);
  const isRainLike = weather === 'rain' || weather === 'storm' || weather === 'drizzle';
  const isSunnyDay = weather === 'clear' && timeHour >= 8.5 && timeHour <= 19.5;

  // If weather/temperature band changed dramatically (e.g. user switched summer <-> winter in menu),
  // re-dress the pedestrian's outerwear while preserving their identity (skin, hair, gender, age, build).
  if (ped.weatherTier !== targetTier) {
    const fresh = generateWeatherAppropriateAppearance({
      tempC,
      weather,
      timeHour,
      gender: ped.gender,
      ageGroup: ped.ageGroup,
    });
    if (!ped.isJanitor) {
      ped.clothingType = fresh.clothingType;
      ped.shirtColor = fresh.shirtColor;
      ped.jacketColor = fresh.jacketColor;
      ped.innerShirtColor = fresh.innerShirtColor;
      ped.pantsColor = fresh.pantsColor;
    }
    ped.hasShorts = fresh.hasShorts;
    ped.footwearType = fresh.footwearType;
    ped.footwearColor = fresh.footwearColor;
    ped.hasHat = fresh.hasHat;
    ped.hatType = fresh.hatType;
    ped.hatColor = fresh.hatColor;
    ped.scarfColor = fresh.scarfColor;
    ped.glovesColor = fresh.glovesColor;
    ped.hoodUp = fresh.hoodUp;
    ped.weatherTier = targetTier;
    if (ped.hasGlasses) {
      ped.glassesStyle = isSunnyDay && (targetTier === 'hot' || targetTier === 'mild') ? 'sunglasses' : 'optical';
    }
    if (ped.bio) {
      ped.bio.clothingClo = getClothingInsulationClo(ped);
    }
  }

  // Live micro-adaptations (umbrella open/close, pulling up hood in rain or freezing wind)
  const canUseUmbrella =
    Boolean(ped.ownsUmbrella) &&
    !ped.isCyclist &&
    !ped.isScooter &&
    !ped.hasBroom &&
    ped.state !== 'panicking' &&
    ped.state !== 'knocked_down' &&
    ped.state !== 'extinguishing_fire';

  if (isRainLike && canUseUmbrella) {
    ped.hasUmbrella = true;
    if (!ped.umbrellaColor) ped.umbrellaColor = pick(UMBRELLA_COLORS);
  } else {
    ped.hasUmbrella = false;
  }

  const hasHoodGarment =
    ped.clothingType === 'parka' ||
    ped.clothingType === 'raincoat' ||
    ped.clothingType === 'hoodie';
  if (hasHoodGarment) {
    ped.hoodUp = Boolean(
      (isRainLike && !ped.hasUmbrella) ||
      weather === 'blizzard' ||
      (targetTier === 'freezing' && !ped.hasHat)
    );
  } else {
    ped.hoodUp = false;
  }
}

// ============================================================================
// 2. BIOPSYCHOSOCIAL PROFILE INITIALIZATION
// ============================================================================

export function ensurePedestrianBioPsy(
  ped: Pedestrian,
  tempC: number,
  weather: WeatherType,
  timeHour: number,
  nowSec: number
): { bio: PedestrianBiology; psy: PedestrianPsychology } {
  if (!ped.weatherTier) {
    // Legacy/map.json pedestrian: dress appropriately for current weather while keeping identity
    if (!ped.gender) ped.gender = Math.random() < 0.5 ? 'male' : 'female';
    if (!ped.ageGroup) ped.ageGroup = ped.isChild ? 'child' : Math.random() < 0.16 ? 'elderly' : 'adult';
    if (ped.ownsUmbrella === undefined) ped.ownsUmbrella = Math.random() < 0.62;
    if (!ped.dogBreed && ped.hasDog) {
      const entry = pick(DOG_BREEDS);
      ped.dogBreed = entry.breed;
      ped.dogColor = pick(entry.colors);
    }
    adaptPedestrianClothingToWeather(ped, tempC, weather, timeHour);
  }

  if (!ped.bio) {
    const isChild = ped.isChild || ped.ageGroup === 'child';
    const isElderly = ped.ageGroup === 'elderly';
    const isMale = ped.gender !== 'female';

    const ageYears = isChild
      ? 8 + Math.floor(Math.random() * 6)
      : isElderly
        ? 63 + Math.floor(Math.random() * 19)
        : 19 + Math.floor(Math.random() * 41);

    const heightScale = isChild
      ? 0.68 + Math.random() * 0.08
      : isElderly
        ? 0.89 + Math.random() * 0.08
        : isMale
          ? 0.96 + Math.random() * 0.11
          : 0.90 + Math.random() * 0.10;

    const shoulderScale = isChild
      ? 0.84 + Math.random() * 0.08
      : isMale
        ? 0.96 + Math.random() * 0.16
        : 0.86 + Math.random() * 0.12;

    const fitness = isElderly
      ? 0.35 + Math.random() * 0.25
      : isChild
        ? 0.72 + Math.random() * 0.25
        : 0.52 + Math.random() * 0.45;

    ped.bio = {
      heightScale,
      shoulderScale,
      ageYears,
      fitness,
      stamina: 75 + Math.random() * 25,
      coreTempC: 37.0,
      wetness: weather === 'rain' || weather === 'storm' ? (ped.hasUmbrella ? 5 : 22) : 0,
      coldLevel: 0,
      heatLevel: 0,
      clothingClo: getClothingInsulationClo(ped),
      injuryLevel: 0,
      knockdownTimer: 0,
      knockdownVelX: 0,
      knockdownVelY: 0,
      limpSide: Math.random() < 0.5 ? -1 : 1,
      breathPhase: Math.random() * Math.PI * 2,
      lastHitTime: -10,
    };
  }

  if (!ped.psy) {
    const isChild = ped.isChild || ped.ageGroup === 'child';
    const isElderly = ped.ageGroup === 'elderly';
    const baseDelay = isElderly ? 0.38 + Math.random() * 0.26 : 0.18 + Math.random() * 0.24;
    const distractionPenalty = ped.hasHeadphones || ped.handheldProp === 'phone' ? 0.14 : 0;

    ped.psy = {
      bravery: isChild ? 0.15 + Math.random() * 0.25 : 0.15 + Math.random() * 0.8,
      sociability: 0.2 + Math.random() * 0.75,
      conscientiousness: isElderly ? 0.7 + Math.random() * 0.28 : 0.3 + Math.random() * 0.68,
      curiosity: 0.2 + Math.random() * 0.75,
      neuroticism: isChild ? 0.5 + Math.random() * 0.45 : 0.15 + Math.random() * 0.75,
      personalSpace: 9.5 + Math.random() * 5.0,
      reactionDelay: baseDelay + distractionPenalty,
      fear: 0,
      arousal: 0.1,
      annoyance: 0,
      comfort: 0.85,
      lookTargetX: null,
      lookTargetY: null,
      lookTimer: 0,
      headYawCurrent: 0,
      pendingReactionType: null,
      pendingReactionTimer: 0,
      pendingReactionAngle: 0,
      pendingReactionText: null,
      lastThreatX: 0,
      lastThreatY: 0,
      nextThinkAt: nowSec + Math.random() * 0.12,
      lastPosX: ped.x,
      lastPosY: ped.y,
      stuckAccum: 0,
      shelterBuildingId: null,
      lastSpeechTime: -10,
      impatienceTimer: 0,
    };
  }

  return { bio: ped.bio, psy: ped.psy };
}

function getBaseWalkSpeed(ped: Pedestrian, timeHour: number, weather: WeatherType): number {
  const bio = ped.bio;
  if (ped.isCyclist) return 105 + (bio ? bio.fitness * 24 : 14);
  if (ped.isScooter) return 86 + (bio ? bio.fitness * 14 : 8);
  if (ped.isJanitor) return 22;

  let spd = 38;
  if (ped.ageGroup === 'elderly') spd = 24 + (bio ? bio.fitness * 8 : 4);
  else if (ped.isChild || ped.ageGroup === 'child') spd = 34 + (bio ? bio.fitness * 10 : 5);
  else spd = 37 + (bio ? bio.fitness * 12 : 6);

  // Circadian rhythm: morning rush (7:00-9:30) & evening commute (17:00-19:00) walk brisker;
  // hot afternoon strolls slower; late night walks purposefully
  if ((timeHour >= 7 && timeHour <= 9.5) || (timeHour >= 17 && timeHour <= 19)) {
    spd *= 1.12;
  } else if (timeHour >= 22.5 || timeHour <= 5.5) {
    spd *= 1.08;
  }

  // Weather & physiological modifiers
  if (weather === 'rain' || weather === 'storm') {
    spd *= ped.hasUmbrella ? 1.08 : 1.32;
  } else if (weather === 'blizzard') {
    spd *= 0.86; // trudging against wind & snow
  } else if (weather === 'snow') {
    spd *= 0.92;
  }

  if (bio) {
    if (bio.coldLevel > 0.35 && weather !== 'blizzard') spd *= 1.12; // brisk step to warm up
    if (bio.heatLevel > 0.45) spd *= 1.0 - bio.heatLevel * 0.22;     // heat lethargy
    if (bio.injuryLevel > 20) spd *= clamp(1.0 - bio.injuryLevel * 0.006, 0.38, 0.85);
    if (bio.stamina < 25) spd *= 0.72;
  }

  return spd;
}

// ============================================================================
// 3. CROSSWALK GEOMETRY & PEDESTRIAN SPAWNING
// ============================================================================

function getCrosswalkEndpoints(inter: Intersection, cw: Intersection['crosswalks'][0]): { p1: Vector2D; p2: Vector2D } {
  const halfW = inter.width / 2;
  const halfH = inter.height / 2;
  const cwWidth = 24;

  if (cw.direction === 'north') {
    const y = inter.y - halfH - cwWidth / 2;
    return { p1: { x: inter.x - halfW - 14, y }, p2: { x: inter.x + halfW + 14, y } };
  } else if (cw.direction === 'south') {
    const y = inter.y + halfH + cwWidth / 2;
    return { p1: { x: inter.x - halfW - 14, y }, p2: { x: inter.x + halfW + 14, y } };
  } else if (cw.direction === 'west') {
    const x = inter.x - halfW - cwWidth / 2;
    return { p1: { x, y: inter.y - halfH - 14 }, p2: { x, y: inter.y + halfH + 14 } };
  } else {
    const x = inter.x + halfW + cwWidth / 2;
    return { p1: { x, y: inter.y - halfH - 14 }, p2: { x, y: inter.y + halfH + 14 } };
  }
}

export function spawnWeatherAwarePedestrianNear(targetPos: Vector2D, world: GameWorld): Pedestrian | null {
  if (!world.pedestrianPaths || world.pedestrianPaths.length === 0) return null;

  // Quiet rural village or dense forest: no urban pedestrians
  if (targetPos.x >= 10500 && targetPos.x <= 12600 && targetPos.y >= 2100 && targetPos.y <= 4100) return null;
  if (targetPos.x < 3500 && targetPos.y < 3500) return null;

  const minD2 = 400 * 400;
  const maxD2 = 960 * 960;

  let chosenPath: GameWorld['pedestrianPaths'][0] | null = null;
  let chosenWpIdx = 0;
  let spawnX = 0;
  let spawnY = 0;
  let chosenWp1: Vector2D | null = null;
  let chosenWp2: Vector2D | null = null;
  let matchCount = 0;

  // Reservoir sampling: O(P) single pass with ZERO temporary array allocations!
  for (let pi = 0; pi < world.pedestrianPaths.length; pi++) {
    const path = world.pedestrianPaths[pi];
    const wps = path.waypoints;
    if (!wps || wps.length < 2) continue;
    for (let i = 0; i < wps.length - 1; i++) {
      const wp1 = wps[i];
      const wp2 = wps[i + 1];
      const midX = (wp1.x + wp2.x) * 0.5;
      const midY = (wp1.y + wp2.y) * 0.5;

      // Keep off private gas station fueling lot
      if (midX >= 4920 && midX <= 5480 && midY >= 4890 && midY <= 5490) continue;

      const dx = midX - targetPos.x;
      const dy = midY - targetPos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minD2 && d2 <= maxD2) {
        matchCount++;
        if (Math.random() * matchCount < 1) {
          chosenPath = path;
          chosenWpIdx = i;
          chosenWp1 = wp1;
          chosenWp2 = wp2;
          const prog = 0.2 + Math.random() * 0.6;
          spawnX = wp1.x + (wp2.x - wp1.x) * prog;
          spawnY = wp1.y + (wp2.y - wp1.y) * prog;
        }
      }
    }
  }

  if (!chosenPath || !chosenWp1 || !chosenWp2) return null;

  const weather: WeatherType = world.weather || 'clear';
  const timeHour = world.timeHour ?? 12;
  const tempC = getOutsideTemperature(world, timeHour);
  const tier = getWeatherClothingTier(tempC, weather);
  const isSnowOrStorm = weather === 'snow' || weather === 'blizzard' || weather === 'storm';
  const isNight = timeHour >= 22 || timeHour <= 5.5;

  // At night, fewer children and elderly out on the streets (realistic circadian demographics!)
  let ageGroup: 'child' | 'adult' | 'elderly' = 'adult';
  const ageRoll = Math.random();
  if (!isNight && ageRoll < 0.13) ageGroup = 'child';
  else if (ageRoll < (isNight ? 0.08 : 0.26)) ageGroup = 'elderly';

  const app = generateWeatherAppropriateAppearance({ tempC, weather, timeHour, ageGroup });

  // No cyclists/e-scooters in freezing snow/blizzard/storm!
  const allowMicromobility = !isSnowOrStorm && tier !== 'freezing';
  const isCyclist = allowMicromobility && ageGroup === 'adult' && Math.random() < 0.07;
  const isScooter = allowMicromobility && !isCyclist && ageGroup === 'adult' && Math.random() < 0.055;
  const hasDog = !isCyclist && !isScooter && weather !== 'blizzard' && weather !== 'storm' && Math.random() < (isNight ? 0.09 : 0.075);
  const isChild = ageGroup === 'child';
  const isElderly = ageGroup === 'elderly';
  const isJanitor = !isCyclist && !isScooter && !isChild && !isElderly && !isNight && Math.random() < 0.045;

  const dir = Math.random() < 0.5 ? 1 : -1;
  const angle =
    dir === 1
      ? Math.atan2(chosenWp2.y - chosenWp1.y, chosenWp2.x - chosenWp1.x)
      : Math.atan2(chosenWp1.y - chosenWp2.y, chosenWp1.x - chosenWp2.x);

  const ped: Pedestrian = {
    id: 'ped_live_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
    x: spawnX,
    y: spawnY,
    vx: 0,
    vy: 0,
    angle,
    speed: 36,
    targetSpeed: 36,
    skinColor: app.skinColor,
    shirtColor: isJanitor ? '#ca8a04' : app.shirtColor,
    pantsColor: isJanitor ? '#1e3a8a' : app.pantsColor,
    hairColor: app.hairColor,
    gender: app.gender,
    ageGroup: app.ageGroup,
    clothingType: isJanitor ? (tier === 'freezing' || tier === 'cold' ? 'parka' : 'vest') : app.clothingType,
    jacketColor: isJanitor ? '#ca8a04' : app.jacketColor,
    innerShirtColor: app.innerShirtColor,
    hairStyle: app.hairStyle,
    hasHat: app.hasHat,
    hatColor: app.hatColor,
    hatType: app.hatType,
    hasGlasses: app.hasGlasses,
    glassesStyle: app.glassesStyle,
    hasHeadphones: isJanitor ? false : app.hasHeadphones,
    hasShorts: isJanitor ? false : app.hasShorts,
    footwearType: isJanitor ? 'boots' : app.footwearType,
    footwearColor: app.footwearColor,
    scarfColor: app.scarfColor,
    glovesColor: app.glovesColor,
    hoodUp: app.hoodUp,
    weatherTier: app.weatherTier,
    ownsUmbrella: isJanitor ? false : app.ownsUmbrella,
    umbrellaColor: app.umbrellaColor,
    handheldProp: isJanitor || isCyclist || isScooter || hasDog ? null : app.handheldProp,
    propColor: app.propColor,
    hasDroppedProp: false,
    walkCycle: Math.random() * Math.PI * 2,
    targetPathId: chosenPath.id,
    targetWaypointIndex: dir === 1 ? chosenWpIdx + 1 : chosenWpIdx,
    routeWaypoints: chosenPath.waypoints,
    pathDirection: dir,
    isCrossingRoad: false,
    waitingAtCurb: false,
    crosswalkWaitTimer: 0,
    crosswalkCooldownTimer: 6 + Math.random() * 6,
    branchCooldownTimer: 6 + Math.random() * 6,
    state: 'walking',
    panicTimer: 0,
    behaviorTimer: 0,
    alertBubbleText: null,
    alertBubbleTimer: 0,
    isCyclist,
    isScooter,
    hasDog,
    dogBreed: app.dogBreed,
    dogColor: app.dogColor,
    isChild,
    hasBackpack: !isJanitor && (isChild ? Math.random() < 0.72 : Math.random() < 0.28),
    backpackColor: pick(['#1e293b', '#334155', '#7f1d1d', '#1e3a8a', '#3f6212', '#57534e']),
    isJanitor,
    hasBroom: isJanitor,
  };

  const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : Date.now() * 0.001;
  ensurePedestrianBioPsy(ped, tempC, weather, timeHour, nowSec);
  adaptPedestrianClothingToWeather(ped, tempC, weather, timeHour);

  const baseSpd = getBaseWalkSpeed(ped, timeHour, weather);
  ped.speed = baseSpd;
  ped.targetSpeed = baseSpd;
  ped.vx = Math.cos(angle) * baseSpd;
  ped.vy = Math.sin(angle) * baseSpd;
  return ped;
}

// ============================================================================
// 4. ACCURATE MULTI-LAYER PHYSICAL COLLISION SOLVER
// ============================================================================

function dropHeldProp(ped: Pedestrian, world: GameWorld): void {
  if (!ped.handheldProp || ped.hasDroppedProp) return;
  ped.hasDroppedProp = true;
  world.litter.push({
    id: `dropped_prop_${ped.id}_${Date.now()}`,
    x: ped.x,
    y: ped.y,
    vx: ped.vx * 0.45 + (Math.random() - 0.5) * 45,
    vy: ped.vy * 0.45 + (Math.random() - 0.5) * 45,
    angle: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 10,
    type: (ped.handheldProp === 'extinguisher' ? 'can' : ped.handheldProp) as any,
    color: ped.propColor || '#ffffff',
    size: ped.handheldProp === 'box' ? 7.5 : ped.handheldProp === 'phone' ? 2.8 : 4.2,
    isAirborne: true,
    airborneTimer: 0.45 + Math.random() * 0.35,
    altitude: 8,
    isGlowing: ped.handheldProp === 'phone',
  });
  ped.handheldProp = null;
}

function triggerNearbyWitnesses(
  eventX: number,
  eventY: number,
  kind: 'hit' | 'fire' | 'panic',
  sourcePedId: string,
  world: GameWorld,
  pedGrid: SpatialGrid<Pedestrian> | undefined,
  nowSec: number
): void {
  const radius = kind === 'fire' ? 240 : 155;
  const witnesses = pedGrid ? pedGrid.queryRadius(eventX, eventY, radius, _pedScratch) : world.pedestrians;
  const r2 = radius * radius;
  let speakers = 0;

  for (let i = 0; i < witnesses.length; i++) {
    const w = witnesses[i];
    if (w.id === sourcePedId || w.isInsideBuilding || (w as any).isFirefighter || w.state === 'knocked_down') continue;
    const dx = w.x - eventX;
    const dy = w.y - eventY;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2 || d2 < 0.01) continue;

    const psy = w.psy;
    if (!psy) continue;

    // Attention snaps toward incident
    psy.lookTargetX = eventX;
    psy.lookTargetY = eventY;
    psy.lookTimer = 3.5;

    if (kind === 'hit') {
      psy.arousal = Math.min(1, psy.arousal + 0.65);
      if (psy.bravery > 0.55) {
        w.state = 'calling_112';
        w.behaviorTimer = 4.2 + Math.random() * 2.5;
        w.angle = Math.atan2(eventY - w.y, eventX - w.x);
        if (speakers < 1) {
          speak(w, pick(PHRASES_WATCH_CRASH), 2.8, nowSec, true);
          speakers++;
        }
      } else if (psy.curiosity > 0.5 && d2 > 45 * 45) {
        w.state = 'watching_incident';
        w.behaviorTimer = 3.5 + Math.random() * 3.0;
        w.angle = Math.atan2(eventY - w.y, eventX - w.x);
      } else {
        psy.fear = Math.min(1, psy.fear + 0.65);
        w.state = 'panicking';
        w.panicTimer = 2.4 + psy.neuroticism * 2.0;
        w.angle = Math.atan2(dy, dx);
      }
    } else if (kind === 'panic') {
      // Emotional contagion: anxious people nearby catch fear from fleeing pedestrians
      if (psy.neuroticism > 0.55 && w.state === 'walking' && d2 < 85 * 85) {
        psy.fear = Math.min(1, psy.fear + 0.35);
        if (psy.fear > 0.6) {
          w.state = 'panicking';
          w.panicTimer = 1.6 + psy.neuroticism * 1.4;
          w.angle = Math.atan2(dy, dx);
        }
      }
    }
  }
}

function resolvePedestrianCollisions(
  ped: Pedestrian,
  nextX: number,
  nextY: number,
  pedRadius: number,
  world: GameWorld,
  vehGrid: SpatialGrid<Vehicle> | undefined,
  pedGrid: SpatialGrid<Pedestrian> | undefined,
  bldGrid: SpatialGrid<Building> | undefined,
  propGrid: SpatialGrid<StreetProp> | undefined,
  player: any,
  nowSec: number
): { x: number; y: number; blocked: boolean; hitNormalX: number; hitNormalY: number } {
  let x = nextX;
  let y = nextY;
  let blocked = false;
  let hitNormalX = 0;
  let hitNormalY = 0;
  const bio = ped.bio!;
  const psy = ped.psy!;

  // 1. Vehicles (exact deformed softbody polygon + true impact trauma kinematics!)
  const nearbyCars = vehGrid ? vehGrid.queryRadius(x, y, 75, _vehScratch) : world.vehicles;
  for (let i = 0; i < nearbyCars.length; i++) {
    const car = nearbyCars[i];
    const res = checkPedestrianVehicleCollision(x, y, pedRadius, car);
    if (res.collided) {
      x = res.x;
      y = res.y;
      blocked = true;
      hitNormalX = res.normalX;
      hitNormalY = res.normalY;

      const carVx = Math.cos(car.angle) * (car.speed || 0);
      const carVy = Math.sin(car.angle) * (car.speed || 0);
      const relVx = carVx - (ped.vx || 0);
      const relVy = carVy - (ped.vy || 0);
      const normalImpactPxS = relVx * res.normalX + relVy * res.normalY;
      const impactKmh = Math.max(0, normalImpactPxS) * PX_S_TO_SPEED_KMH;

      if (impactKmh >= 6 && nowSec - bio.lastHitTime > 0.65) {
        bio.lastHitTime = nowSec;
        if (impactKmh < 14) {
          // Light bumper bump -> stumble sideways, annoyed shout
          psy.annoyance = Math.min(1, psy.annoyance + 0.7);
          psy.arousal = Math.min(1, psy.arousal + 0.5);
          ped.vx = res.normalX * 55;
          ped.vy = res.normalY * 55;
          ped.state = 'startled';
          ped.behaviorTimer = 0.75;
          psy.lookTargetX = car.x;
          psy.lookTargetY = car.y;
          psy.lookTimer = 2.5;
          speak(ped, pick(PHRASES_NEAR_MISS), 2.2, nowSec, true);
        } else {
          // Significant vehicle strike -> physical knockback slide + knockdown + injury!
          const severity = clamp((impactKmh - 10) * 1.85, 14, 92);
          bio.injuryLevel = Math.min(100, bio.injuryLevel + severity);
          const knockImpulse = clamp(impactKmh * 5.2, 75, 290);
          bio.knockdownVelX = res.normalX * knockImpulse + carVx * 0.25;
          bio.knockdownVelY = res.normalY * knockImpulse + carVy * 0.25;
          bio.knockdownTimer = clamp(2.0 + severity * 0.065, 2.2, 7.5);
          ped.state = 'knocked_down';
          ped.speed = 0;
          ped.targetSpeed = 0;
          ped.hasUmbrella = false;
          ped.isCyclist = false;
          ped.isScooter = false;
          dropHeldProp(ped, world);
          speak(ped, pick(PHRASES_HIT), 3.0, nowSec, true);
          triggerNearbyWitnesses(x, y, 'hit', ped.id, world, pedGrid, nowSec);
        }
      }
    }
  }

  // 2. Buildings (ALWAYS active — prevents panicking or crossing pedestrians from clipping walls!)
  const nearbyBlds = bldGrid ? bldGrid.queryRadius(x, y, 75, _bldScratch) : world.buildings;
  for (let i = 0; i < nearbyBlds.length; i++) {
    const bld = nearbyBlds[i];
    if (
      x + pedRadius > bld.x &&
      x - pedRadius < bld.x + bld.width &&
      y + pedRadius > bld.y &&
      y - pedRadius < bld.y + bld.height
    ) {
      const res = checkPedestrianBuildingCollision(x, y, pedRadius, bld);
      if (res.collided) {
        const pushDx = res.x - x;
        const pushDy = res.y - y;
        const pLen = Math.hypot(pushDx, pushDy);
        if (pLen > 0.001) {
          hitNormalX = pushDx / pLen;
          hitNormalY = pushDy / pLen;
        }
        x = res.x;
        y = res.y;
        blocked = true;
      }
    }
  }

  // 3. Street Props (exact circle AND rotated OBB box hitboxes, plus light traffic cone nudging)
  const nearbyProps = propGrid ? propGrid.queryRadius(x, y, 52, _propScratch) : world.props;
  for (let i = 0; i < nearbyProps.length; i++) {
    const prop = nearbyProps[i];
    const hitbox = getPropHitbox(prop);
    if (hitbox.shape === 'none' || (prop.isBroken && hitbox.isWalkableWhenBroken)) continue;

    if (hitbox.shape === 'circle') {
      const r = hitbox.radius || 3.8;
      const dx = x - prop.x;
      const dy = y - prop.y;
      const minD = pedRadius + r;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD * minD) {
        const dist = Math.sqrt(d2);
        const nx = dist > 0.0001 ? dx / dist : 1;
        const ny = dist > 0.0001 ? dy / dist : 0;
        const overlap = minD - dist;
        if (prop.type === 'cone') {
          prop.x -= nx * overlap * 0.6;
          prop.y -= ny * overlap * 0.6;
          x += nx * overlap * 0.4;
          y += ny * overlap * 0.4;
        } else {
          x += nx * overlap;
          y += ny * overlap;
          blocked = true;
          hitNormalX = nx;
          hitNormalY = ny;
        }
      }
    } else if (hitbox.shape === 'box') {
      const dx = x - prop.x;
      const dy = y - prop.y;
      const pAngle = prop.angle || 0;
      const cosP = Math.cos(pAngle);
      const sinP = Math.sin(pAngle);
      const localX = dx * cosP + dy * sinP;
      const localY = -dx * sinP + dy * cosP;
      const hw = hitbox.halfWidth || 6;
      const hh = hitbox.halfHeight || 6;
      const closestX = clamp(localX, -hw, hw);
      const closestY = clamp(localY, -hh, hh);
      const diffX = localX - closestX;
      const diffY = localY - closestY;
      const d2 = diffX * diffX + diffY * diffY;
      if (d2 < pedRadius * pedRadius) {
        let lnx = 0;
        let lny = 0;
        let overlap = 0;
        if (d2 > 0.0001) {
          const dist = Math.sqrt(d2);
          lnx = diffX / dist;
          lny = diffY / dist;
          overlap = pedRadius - dist;
        } else {
          const dLeft = localX + hw;
          const dRight = hw - localX;
          const dTop = localY + hh;
          const dBottom = hh - localY;
          const minEdge = Math.min(dLeft, dRight, dTop, dBottom);
          if (minEdge === dLeft) { lnx = -1; overlap = dLeft + pedRadius; }
          else if (minEdge === dRight) { lnx = 1; overlap = dRight + pedRadius; }
          else if (minEdge === dTop) { lny = -1; overlap = dTop + pedRadius; }
          else { lny = 1; overlap = dBottom + pedRadius; }
        }
        const wnx = lnx * cosP - lny * sinP;
        const wny = lnx * sinP + lny * cosP;
        x += wnx * overlap;
        y += wny * overlap;
        blocked = true;
        hitNormalX = wnx;
        hitNormalY = wny;
      }
    }
  }

  // 4. Guardrails (solid barrier separation so pedestrians never walk through highway barriers)
  const guardrails = world.guardrails;
  if (guardrails && guardrails.length > 0) {
    for (let i = 0; i < guardrails.length; i++) {
      const rail = guardrails[i];
      const pad = pedRadius + (rail.width || 4) * 0.5 + 4;
      const minX = (rail.x1 < rail.x2 ? rail.x1 : rail.x2) - pad;
      const maxX = (rail.x1 > rail.x2 ? rail.x1 : rail.x2) + pad;
      if (x < minX || x > maxX) continue;
      const minY = (rail.y1 < rail.y2 ? rail.y1 : rail.y2) - pad;
      const maxY = (rail.y1 > rail.y2 ? rail.y1 : rail.y2) + pad;
      if (y < minY || y > maxY) continue;

      const rdx = rail.x2 - rail.x1;
      const rdy = rail.y2 - rail.y1;
      const lenSq = rdx * rdx + rdy * rdy;
      if (lenSq < 1) continue;
      const t = clamp(((x - rail.x1) * rdx + (y - rail.y1) * rdy) / lenSq, 0, 1);
      const cx = rail.x1 + rdx * t;
      const cy = rail.y1 + rdy * t;
      const distX = x - cx;
      const distY = y - cy;
      const effW = (rail.width || 4) * 0.5 + pedRadius;
      const d2 = distX * distX + distY * distY;
      if (d2 < effW * effW) {
        const dist = Math.sqrt(d2);
        const nx = dist > 0.001 ? distX / dist : -rdy / Math.sqrt(lenSq);
        const ny = dist > 0.001 ? distY / dist : rdx / Math.sqrt(lenSq);
        x += nx * (effW - dist);
        y += ny * (effW - dist);
        blocked = true;
        hitNormalX = nx;
        hitNormalY = ny;
      }
    }
  }

  // 5. Rolling Stock / Trains
  if (world.rollingStock && world.rollingStock.length > 0) {
    for (let i = 0; i < world.rollingStock.length; i++) {
      const car = world.rollingStock[i];
      const dx = x - car.x;
      const dy = y - car.y;
      if (dx * dx + dy * dy > 220 * 220) continue;
      const col = checkPedestrianRollingStockCollision(x, y, pedRadius, car);
      if (col.collided) {
        x = col.x;
        y = col.y;
        blocked = true;
        if (Math.abs((car as any).speed || 0) > 25 && nowSec - bio.lastHitTime > 1.0) {
          bio.lastHitTime = nowSec;
          bio.injuryLevel = Math.min(100, bio.injuryLevel + 65);
          bio.knockdownTimer = 5.5;
          ped.state = 'knocked_down';
          dropHeldProp(ped, world);
          speak(ped, 'Ай!! Поезд!!', 2.8, nowSec, true);
        }
      }
    }
  }

  // 6. Hard Physical Shoulder-to-Shoulder Separation from Other Pedestrians
  const nearbyPeds = pedGrid ? pedGrid.queryRadius(x, y, 18, _pedScratch) : world.pedestrians;
  const hardMinDist = pedRadius * 1.92;
  const hardMinDistSq = hardMinDist * hardMinDist;
  for (let i = 0; i < nearbyPeds.length; i++) {
    const other = nearbyPeds[i];
    if (other.id === ped.id || other.isInsideBuilding) continue;
    const dx = x - other.x;
    const dy = y - other.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < hardMinDistSq && d2 > 0.0001) {
      const dist = Math.sqrt(d2);
      const overlap = (hardMinDist - dist) * 0.55;
      x += (dx / dist) * overlap;
      y += (dy / dist) * overlap;
    }
  }

  // 7. Hard Physical Separation & Bump Reaction with Player on Foot
  if (player && !player.isInVehicle && !player.insideBuildingId && !player.insideCarId && !player.insideBusId) {
    const dx = x - player.x;
    const dy = y - player.y;
    const minD = pedRadius + 4.5;
    const d2 = dx * dx + dy * dy;
    if (d2 < minD * minD && d2 > 0.0001) {
      const dist = Math.sqrt(d2);
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minD - dist;
      x += nx * overlap;
      y += ny * overlap;

      const playerSpd = Math.hypot(player.vx || 0, player.vy || 0);
      if (playerSpd > 68 && ped.state !== 'knocked_down' && ped.state !== 'panicking') {
        psy.annoyance = Math.min(1, psy.annoyance + 0.45);
        psy.lookTargetX = player.x;
        psy.lookTargetY = player.y;
        psy.lookTimer = 2.4;
        if (playerSpd > 115 && nowSec - bio.lastHitTime > 1.2) {
          bio.lastHitTime = nowSec;
          ped.state = 'startled';
          ped.behaviorTimer = 0.65;
          ped.vx += nx * 42;
          ped.vy += ny * 42;
        }
        speak(ped, pick(PHRASES_BUMP_PLAYER), 2.2, nowSec);
      }
    }
  }

  // 8. River / Deep Water Avoidance (prevent walking off banks into deep river!)
  const waterDepth = getUniversalWaterDepthAt(world, x, y);
  if (waterDepth > 0.45) {
    // Reject move deeper into water and steer back to prior dry position
    const prevDepth = getUniversalWaterDepthAt(world, ped.x, ped.y);
    if (waterDepth > prevDepth) {
      x = ped.x;
      y = ped.y;
      blocked = true;
      hitNormalX = -Math.cos(ped.angle);
      hitNormalY = -Math.sin(ped.angle);
    }
  }

  return {
    x: clamp(x, 16, world.width - 16),
    y: clamp(y, 16, world.height - 16),
    blocked,
    hitNormalX,
    hitNormalY,
  };
}

// ============================================================================
// 5. MAIN BIOPSYCHOSOCIAL UPDATE LOOP
// ============================================================================

export interface PedestrianFireCallbacks {
  isFireEngineDispatchedFor: (world: GameWorld, x: number, y: number) => boolean;
  dispatchFireEngine: (world: GameWorld, playerPos: Vector2D, fireX: number, fireY: number, player?: any) => boolean;
  reacquireClosestLane: (car: Vehicle, world: GameWorld) => void;
}

export function updatePedestriansSystem(
  world: GameWorld,
  dt: number,
  vehGrid: SpatialGrid<Vehicle> | undefined,
  pedGrid: SpatialGrid<Pedestrian> | undefined,
  bldGrid: SpatialGrid<Building> | undefined,
  playerPos: Vector2D | undefined,
  propGrid: SpatialGrid<StreetProp> | undefined,
  player: any,
  fireCallbacks: PedestrianFireCallbacks
): void {
  const weather: WeatherType = world.weather || 'clear';
  const timeHour = world.timeHour ?? 12;
  const tempC = getOutsideTemperature(world, timeHour);
  const isRainLike = weather === 'rain' || weather === 'storm' || weather === 'drizzle';
  const isStormOrBlizzard = weather === 'storm' || weather === 'blizzard';
  const isNight = timeHour >= 22 || timeHour <= 5.5;
  const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : Date.now() * 0.001;

  const playerCar = world.vehicles.find((v) => v.isPlayerControlled);
  const targetPos: Vector2D = playerPos || (playerCar ? { x: playerCar.x, y: playerCar.y } : { x: 4400, y: 2800 });

  // Deduplicated observers (Host + remote Guests)
  const observers: Vector2D[] = [targetPos];
  if (onlineManager.status === 'connected' && onlineManager.isHost) {
    const remotePlayers = onlineManager.getRemotePlayersArray();
    for (let ri = 0; ri < remotePlayers.length; ri++) {
      const rp = remotePlayers[ri];
      if (!Number.isFinite(rp.x) || !Number.isFinite(rp.y)) continue;
      let tooClose = false;
      for (let oi = 0; oi < observers.length; oi++) {
        const dx = rp.x - observers[oi].x;
        const dy = rp.y - observers[oi].y;
        if (dx * dx + dy * dy < 500 * 500) { tooClose = true; break; }
      }
      if (!tooClose) observers.push({ x: rp.x, y: rp.y });
    }
  }

  // Dynamic density maintenance (fewer people outdoors at night or during severe blizzard/storm!)
  const densityFactor = weather === 'blizzard' ? 0.55 : isNight ? 0.52 : weather === 'storm' ? 0.72 : 1.0;
  for (let oi = 0; oi < observers.length; oi++) {
    const obsPos = observers[oi];
    const isRuralOrWilderness =
      (obsPos.x >= 10500 && obsPos.x <= 12600 && obsPos.y >= 2100 && obsPos.y <= 4100) ||
      (obsPos.x < 3500 && obsPos.y < 3500);
    const targetNearbyPeds = isRuralOrWilderness
      ? 0
      : Math.min(Math.max(4, Math.round(16 * densityFactor)), performanceConfig.maxActivePedestrians);

    let nearbyCount = 0;
    for (let i = 0; i < world.pedestrians.length; i++) {
      const p = world.pedestrians[i];
      const dx = p.x - obsPos.x;
      const dy = p.y - obsPos.y;
      if (p.x > 0 && p.y > 0 && dx * dx + dy * dy < 1100 * 1100) nearbyCount++;
    }

    if (nearbyCount < targetNearbyPeds) {
      const toSpawn = Math.min(2, targetNearbyPeds - nearbyCount);
      for (let s = 0; s < toSpawn; s++) {
        const newPed = spawnWeatherAwarePedestrianNear(obsPos, world);
        if (newPed) world.pedestrians.push(newPed);
      }
    }
  }

  // Rebuild group cache without allocating a new Map each frame
  _groupsMap.clear();
  for (let i = 0; i < world.pedestrians.length; i++) {
    const p = world.pedestrians[i];
    if (p.groupId) {
      let list = _groupsMap.get(p.groupId);
      if (!list) {
        list = [];
        _groupsMap.set(p.groupId, list);
      }
      list.push(p);
    }
  }

  // Fast global check for active fires or sirens (avoids per-ped scanning when world is calm!)
  let hasAnyWorldFire = false;
  let hasAnySiren = false;
  for (let i = 0; i < world.vehicles.length; i++) {
    const v = world.vehicles[i];
    if (v.sirenOn) hasAnySiren = true;
    const d = v.damage;
    if (d && !d.isFullyBurnt && (d.engineFire || d.fuelTankFire || d.cabinFire || d.underHoodSmolder || (d.fireIntensity || 0) > 0)) {
      hasAnyWorldFire = true;
    }
  }
  if (!hasAnyWorldFire && world.stains) {
    for (let i = 0; i < world.stains.length; i++) {
      const st = world.stains[i];
      if (st.onFire && (st.fireIntensity || 0) > 0) {
        hasAnyWorldFire = true;
        break;
      }
    }
  }

  const pedsToDespawn = new Set<string>();
  let updatedPedCount = 0;

  for (let idx = 0; idx < world.pedestrians.length; idx++) {
    const ped = world.pedestrians[idx];

    // Bounds & validity cull
    if (!Number.isFinite(ped.x) || !Number.isFinite(ped.y) || ped.x < 0 || ped.y < 0 || ped.x > world.width || ped.y > world.height) {
      pedsToDespawn.add(ped.id);
      continue;
    }

    const isSpecialNpc = Boolean((ped as any).isFirefighter || (ped as any).isPlayerControlled || (ped as any).isTaxiPassenger);

    // Keep regular AI pedestrians off private gas station fueling lot
    if (!isSpecialNpc && ped.x >= 4920 && ped.x <= 5480 && ped.y >= 4890 && ped.y <= 5490) {
      pedsToDespawn.add(ped.id);
      continue;
    }

    // Distance to nearest observer (squared first)
    let minDistSq = (ped.x - targetPos.x) ** 2 + (ped.y - targetPos.y) ** 2;
    for (let oi = 1; oi < observers.length; oi++) {
      const d2 = (ped.x - observers[oi].x) ** 2 + (ped.y - observers[oi].y) ** 2;
      if (d2 < minDistSq) minDistSq = d2;
    }

    if (minDistSq > 1320 * 1320 && !isSpecialNpc) {
      pedsToDespawn.add(ped.id);
      continue;
    }

    const { bio, psy } = ensurePedestrianBioPsy(ped, tempC, weather, timeHour, nowSec);

    // --- SPECIAL FIREFIGHTER BEHAVIOR (Preserved & collision-safe) ---
    if ((ped as any).isFirefighter) {
      updateFirefighterPed(ped, world, dt, pedsToDespawn, fireCallbacks);
      continue;
    }

    updatedPedCount++;
    if (updatedPedCount > performanceConfig.maxActivePedestrians && !isSpecialNpc) {
      pedsToDespawn.add(ped.id);
      continue;
    }

    // Speech bubble timer decay
    if (ped.alertBubbleTimer > 0) {
      ped.alertBubbleTimer -= dt;
      if (ped.alertBubbleTimer <= 0) ped.alertBubbleText = null;
    }
    if (ped.crosswalkCooldownTimer > 0) ped.crosswalkCooldownTimer -= dt;
    if (ped.branchCooldownTimer && ped.branchCooldownTimer > 0) ped.branchCooldownTimer -= dt;

    // A. Inside Building state
    if (ped.isInsideBuilding) {
      ped.insideBuildingTimer = (ped.insideBuildingTimer ?? 0) - dt;
      // Recover stamina, warm up / dry off indoors!
      bio.stamina = Math.min(100, bio.stamina + 14 * dt);
      bio.wetness = Math.max(0, bio.wetness - 18 * dt);
      bio.coreTempC += (37.0 - bio.coreTempC) * Math.min(1, dt * 0.4);
      if (ped.insideBuildingTimer <= 0) {
        // Don't leave shelter right back into a severe storm unless timer expired long ago
        if (weather === 'blizzard' && Math.random() < 0.35) {
          ped.insideBuildingTimer = 8;
          continue;
        }
        ped.isInsideBuilding = false;
        ped.state = 'exiting_building';
        ped.exitingBuildingTimer = 1.4;
        // Re-adapt outerwear cleanly when stepping outside!
        adaptPedestrianClothingToWeather(ped, tempC, weather, timeHour);

        const bld = world.buildings.find((b) => b.id === ped.insideBuildingId);
        if (bld) {
          const entPos = getBuildingEntrancePos(bld);
          ped.x = entPos.x;
          ped.y = entPos.y;
          let outX = 0;
          let outY = 0;
          let exitAngle = 0;
          if (bld.entranceSide === 'north') { outY = -12; exitAngle = -Math.PI / 2; }
          else if (bld.entranceSide === 'south') { outY = 12; exitAngle = Math.PI / 2; }
          else if (bld.entranceSide === 'west') { outX = -12; exitAngle = Math.PI; }
          else { outX = 12; exitAngle = 0; }
          ped.x += outX;
          ped.y += outY;
          ped.angle = exitAngle;
          if (Math.random() < 0.35) speak(ped, pick(PHRASES_EXIT_BLD), 1.8, nowSec);
        } else {
          ped.state = 'walking';
        }
      }
      continue;
    }

    // Live weather wardrobe adaptation (super cheap check)
    adaptPedestrianClothingToWeather(ped, tempC, weather, timeHour);

    // =========================================================================
    // BIOLOGICAL HOMEOSTASIS TICK (Stamina, Thermoregulation, Wetness, Trauma)
    // =========================================================================
    bio.breathPhase += dt * (2.3 + (100 - bio.stamina) * 0.02 + psy.arousal * 1.1);

    // Wetness accumulation / evaporation
    if (isRainLike && !ped.hasUmbrella && ped.state !== 'sheltering') {
      const rainRate = weather === 'storm' ? 9.5 : weather === 'rain' ? 5.5 : 2.2;
      const coatResist = ped.clothingType === 'raincoat' || ped.clothingType === 'parka' ? 0.35 : 1.0;
      bio.wetness = Math.min(100, bio.wetness + rainRate * coatResist * dt);
    } else {
      const dryRate = tempC > 18 ? 3.5 : 1.4;
      bio.wetness = Math.max(0, bio.wetness - dryRate * dt);
    }

    // Thermal balance: comfort ambient temp depends on clothing insulation (clo) & exertion!
    // Light clothes (~0.4 clo) feel comfortable around +22°C; heavy parka (~2.2 clo) feels comfortable around -10°C.
    const exertionHeat = (ped.speed / 55) * 4.0;
    const wetChill = (bio.wetness / 100) * 7.5;
    const windChill = weather === 'blizzard' ? 7.0 : weather === 'storm' ? 4.0 : 0;
    const effectiveTemp = tempC - wetChill - windChill + exertionHeat;
    const comfortCenter = 26.5 - bio.clothingClo * 16.5;
    const tempDelta = effectiveTemp - comfortCenter;

    const targetCold = tempDelta < -5 ? clamp((-tempDelta - 5) / 18, 0, 1) : 0;
    const targetHeat = tempDelta > 7 ? clamp((tempDelta - 7) / 14, 0, 1) : 0;
    bio.coldLevel += (targetCold - bio.coldLevel) * Math.min(1, dt * 0.5);
    bio.heatLevel += (targetHeat - bio.heatLevel) * Math.min(1, dt * 0.5);
    bio.coreTempC = clamp(37.0 + bio.heatLevel * 0.8 - bio.coldLevel * 0.9, 35.8, 38.2);
    psy.comfort = clamp(1.0 - bio.coldLevel * 0.55 - bio.heatLevel * 0.45 - (bio.wetness / 100) * 0.45, 0.05, 1.0);

    // Stamina depletion & recovery
    const isSprintingNow = ped.speed > 64 && !ped.isCyclist && !ped.isScooter;
    if (isSprintingNow) {
      const drain = (14.5 - bio.fitness * 6.5) * (1 + bio.heatLevel * 0.35);
      bio.stamina = Math.max(0, bio.stamina - drain * dt);
    } else {
      const rec = ped.speed < 5 ? 9.5 + bio.fitness * 5.0 : 3.2 + bio.fitness * 2.5;
      bio.stamina = Math.min(100, bio.stamina + rec * dt);
    }

    // Emotional decay back toward calm baseline
    psy.fear = Math.max(0, psy.fear - (0.24 - psy.neuroticism * 0.1) * dt);
    psy.arousal = Math.max(0.08, psy.arousal - 0.16 * dt);
    psy.annoyance = Math.max(0, psy.annoyance - 0.18 * dt);

    // Smooth head gaze tracking toward current stimulus
    if (psy.lookTimer > 0 && psy.lookTargetX !== null && psy.lookTargetY !== null) {
      psy.lookTimer -= dt;
      const worldLookAngle = Math.atan2(psy.lookTargetY - ped.y, psy.lookTargetX - ped.x);
      const desiredRelYaw = clamp(normalizeAngle(worldLookAngle - ped.angle), -1.05, 1.05);
      psy.headYawCurrent += (desiredRelYaw - psy.headYawCurrent) * Math.min(1, dt * 8.0);
    } else {
      psy.lookTargetX = null;
      psy.lookTargetY = null;
      psy.headYawCurrent += (0 - psy.headYawCurrent) * Math.min(1, dt * 5.0);
    }

    // Process queued psychomotor delayed reaction (perception -> reaction delay -> action)
    if (psy.pendingReactionType) {
      psy.pendingReactionTimer -= dt;
      if (psy.pendingReactionTimer <= 0) {
        const rType = psy.pendingReactionType;
        const rAngle = psy.pendingReactionAngle;
        const rText = psy.pendingReactionText;
        psy.pendingReactionType = null;
        psy.pendingReactionText = null;

        if (ped.state !== 'knocked_down') {
          if (rType === 'dodge' || rType === 'panic') {
            ped.state = 'panicking';
            ped.panicTimer = rType === 'dodge' ? 1.45 : 2.5 + psy.neuroticism * 2.0;
            ped.angle = rAngle;
            ped.targetSpeed = 95 + bio.fitness * 32;
            psy.fear = Math.min(1, psy.fear + 0.7);
            psy.arousal = 1.0;
            if (rText) speak(ped, rText, 2.2, nowSec, true);
          } else if (rType === 'startle') {
            ped.state = 'startled';
            ped.behaviorTimer = 0.7;
            if (rText) speak(ped, rText, 2.0, nowSec);
          } else if (rType === 'call_112') {
            ped.state = 'calling_112';
            ped.behaviorTimer = 4.0 + Math.random() * 2.5;
            ped.angle = rAngle;
            if (rText) speak(ped, rText, 3.0, nowSec, true);
          } else if (rType === 'watch') {
            ped.state = 'watching_incident';
            ped.behaviorTimer = 3.5 + Math.random() * 3.0;
            ped.angle = rAngle;
            if (rText) speak(ped, rText, 2.4, nowSec);
          }
        }
      }
    }

    // =========================================================================
    // STATE: KNOCKED DOWN (Sliding impact friction & recovery to limping)
    // =========================================================================
    if (ped.state === 'knocked_down' || bio.knockdownTimer > 0) {
      bio.knockdownTimer = Math.max(0, bio.knockdownTimer - dt);
      const drag = Math.exp(-5.5 * dt);
      bio.knockdownVelX *= drag;
      bio.knockdownVelY *= drag;
      ped.vx = bio.knockdownVelX;
      ped.vy = bio.knockdownVelY;
      ped.speed = Math.hypot(ped.vx, ped.vy);
      const pedRadius = ped.isChild ? 3.5 : 4.5;
      const col = resolvePedestrianCollisions(
        ped,
        ped.x + ped.vx * dt,
        ped.y + ped.vy * dt,
        pedRadius,
        world,
        vehGrid,
        pedGrid,
        bldGrid,
        propGrid,
        player,
        nowSec
      );
      ped.x = col.x;
      ped.y = col.y;
      if (bio.knockdownTimer <= 0) {
        ped.state = bio.injuryLevel > 22 ? 'injured_limp' : 'walking';
        ped.targetSpeed = getBaseWalkSpeed(ped, timeHour, weather);
        ped.angle += Math.PI * 0.25;
      }
      continue;
    }

    // Gradual trauma recovery while walking slowly
    if (bio.injuryLevel > 0) {
      bio.injuryLevel = Math.max(0, bio.injuryLevel - 1.2 * dt);
      if (ped.state === 'injured_limp' && bio.injuryLevel < 15) {
        ped.state = 'walking';
      }
    }

    // =========================================================================
    // STATE: EXTINGUISHING FIRE (Civilian hero with extinguisher)
    // =========================================================================
    if (ped.state === 'extinguishing_fire') {
      updateCivilianExtinguishing(ped, world, dt);
      continue;
    }

    // =========================================================================
    // STATE: EXITING / ENTERING BUILDING
    // =========================================================================
    if (ped.state === 'exiting_building') {
      ped.exitingBuildingTimer = (ped.exitingBuildingTimer ?? 0) - dt;
      ped.walkCycle += dt * 7;
      const exitSpd = 35;
      ped.speed = exitSpd;
      ped.vx = Math.cos(ped.angle) * exitSpd;
      ped.vy = Math.sin(ped.angle) * exitSpd;
      ped.x = clamp(ped.x + ped.vx * dt, 16, world.width - 16);
      ped.y = clamp(ped.y + ped.vy * dt, 16, world.height - 16);
      if (ped.exitingBuildingTimer <= 0) {
        ped.state = 'walking';
        ped.exitingBuildingTimer = undefined;
        attachPedestrianToNearestSidewalk(ped, world);
      }
      continue;
    }

    if (ped.state === 'entering_building' || ped.state === 'seeking_shelter') {
      const targetBldId = ped.state === 'seeking_shelter' ? psy.shelterBuildingId : ped.insideBuildingId;
      const bld = targetBldId ? world.buildings.find((b) => b.id === targetBldId) : null;
      if (bld) {
        const entPos = getBuildingEntrancePos(bld);
        const dx = entPos.x - ped.x;
        const dy = entPos.y - ped.y;
        const dist = Math.hypot(dx, dy);
        ped.angle = Math.atan2(dy, dx);

        if (dist < 14) {
          if (ped.state === 'seeking_shelter' && !isRainLike && !isStormOrBlizzard) {
            ped.state = 'walking';
            psy.shelterBuildingId = null;
          } else if (ped.state === 'seeking_shelter') {
            ped.state = 'sheltering';
            ped.behaviorTimer = 10 + Math.random() * 14;
            ped.speed = 0;
            ped.targetSpeed = 0;
            ped.vx = 0;
            ped.vy = 0;
          } else {
            ped.targetSpeed = 0;
            ped.speed = 0;
            ped.enteringBuildingTimer = (ped.enteringBuildingTimer ?? 0.7) - dt;
            if (Math.random() < 0.08) speak(ped, pick(PHRASES_ENTER_BLD), 1.4, nowSec);
            if (ped.enteringBuildingTimer <= 0) {
              ped.isInsideBuilding = true;
              ped.insideBuildingTimer = 10 + Math.random() * 20;
              ped.enteringBuildingTimer = undefined;
            }
          }
        } else {
          const rushSpd = ped.state === 'seeking_shelter' ? 58 + bio.fitness * 18 : 38;
          ped.targetSpeed = rushSpd;
          ped.speed = rushSpd;
          ped.walkCycle += dt * (ped.state === 'seeking_shelter' ? 10.5 : 7.0);
          ped.vx = Math.cos(ped.angle) * rushSpd;
          ped.vy = Math.sin(ped.angle) * rushSpd;
          const col = resolvePedestrianCollisions(
            ped, ped.x + ped.vx * dt, ped.y + ped.vy * dt, ped.isChild ? 3.5 : 4.5,
            world, vehGrid, pedGrid, bldGrid, propGrid, player, nowSec
          );
          ped.x = col.x;
          ped.y = col.y;
        }
        continue;
      } else {
        ped.state = 'walking';
        psy.shelterBuildingId = null;
      }
    }

    // =========================================================================
    // TAXI PASSENGER WAITING
    // =========================================================================
    if (ped.state === 'waiting_taxi') {
      ped.targetSpeed = 0;
      ped.speed = 0;
      ped.vx = 0;
      ped.vy = 0;
      if (playerCar) {
        const dx = playerCar.x - ped.x;
        const dy = playerCar.y - ped.y;
        if (dx * dx + dy * dy < 320 * 320) {
          ped.angle = Math.atan2(dy, dx);
          psy.lookTargetX = playerCar.x;
          psy.lookTargetY = playerCar.y;
          psy.lookTimer = 0.5;
        }
      }
      continue;
    }

    // =========================================================================
    // STAGGERED COGNITIVE & PERCEPTION SCAN (LOD-Scheduled for Peak FPS)
    // =========================================================================
    const isNearObserver = minDistSq < 580 * 580;
    const isMidObserver = minDistSq < 980 * 980;
    const cognitiveInterval = isNearObserver ? 0.11 : isMidObserver ? 0.28 : 0.65;

    if (nowSec >= psy.nextThinkAt) {
      psy.nextThinkAt = nowSec + cognitiveInterval * (0.85 + Math.random() * 0.3);

      // Vision & hearing range modulated by weather/night/headphones
      const fogVisMul = weather === 'fog' ? 0.52 : weather === 'blizzard' ? 0.45 : isNight ? 0.72 : 1.0;
      const visionRange = 230 * fogVisMul;
      const hearingRange = ped.hasHeadphones ? 75 : 190;

      // 1) PREDICTIVE TTC VEHICLE DANGER & HORN / SIREN / SPLASH REACTIONS
      const nearbyVehs = vehGrid ? vehGrid.queryRadius(ped.x, ped.y, Math.max(160, visionRange * 0.85), _vehScratch) : world.vehicles;
      let emergencyCarNearby: Vehicle | null = null;
      let fireCarFound: Vehicle | null = null;

      for (let vi = 0; vi < nearbyVehs.length; vi++) {
        const car = nearbyVehs[vi];
        const dx = ped.x - car.x;
        const dy = ped.y - car.y;
        const distSq = dx * dx + dy * dy;

        // Track active fire on vehicle
        if (
          hasAnyWorldFire &&
          !fireCarFound &&
          distSq < visionRange * visionRange &&
          car.damage &&
          !car.damage.isFullyBurnt &&
          (car.damage.engineFire || car.damage.fuelTankFire || car.damage.cabinFire || car.damage.underHoodSmolder || (car.damage.fireIntensity || 0) > 0)
        ) {
          fireCarFound = car;
        }

        // Emergency siren yielding
        if (hasAnySiren && car.sirenOn && distSq < 210 * 210) {
          emergencyCarNearby = car;
        }

        // Horn reaction
        if (car.isHonking && distSq < hearingRange * hearingRange) {
          psy.lookTargetX = car.x;
          psy.lookTargetY = car.y;
          psy.lookTimer = 2.0;
          psy.annoyance = Math.min(1, psy.annoyance + 0.35);
          if (distSq < 72 * 72 && !psy.pendingReactionType) {
            const sideAngle = Math.atan2(dy, dx);
            psy.pendingReactionType = 'dodge';
            psy.pendingReactionTimer = psy.reactionDelay * 0.65;
            psy.pendingReactionAngle = sideAngle;
            psy.pendingReactionText = pick(PHRASES_HORN);
          } else {
            speak(ped, pick(PHRASES_HORN), 2.0, nowSec);
            if (ped.isCrossingRoad) ped.targetSpeed = Math.max(ped.targetSpeed, 64); // hurry across!
          }
        }

        // Predictive Time-To-Collision (TTC) with moving vehicle!
        const carSpd = Math.abs(car.speed || 0);
        if (carSpd > 26 && distSq < 145 * 145) {
          const carDir = (car.speed || 0) >= 0 ? 1 : -1;
          const cvx = Math.cos(car.angle) * carSpd * carDir;
          const cvy = Math.sin(car.angle) * carSpd * carDir;
          const relX = ped.x - car.x;
          const relY = ped.y - car.y;
          const relVx = ped.vx - cvx;
          const relVy = ped.vy - cvy;
          const relSpdSq = relVx * relVx + relVy * relVy;

          if (relSpdSq > 100) {
            // Time of closest approach: t* = - (relP . relV) / |relV|^2
            const ttc = -(relX * relVx + relY * relVy) / relSpdSq;
            if (ttc > 0 && ttc < 1.35) {
              const closestX = relX + relVx * ttc;
              const closestY = relY + relVy * ttc;
              const halfW = (car.width || 20) * 0.5 + 9;
              const halfL = (car.length || 40) * 0.5 + 8;
              const clearance = Math.hypot(closestX, closestY);

              // Check longitudinal & lateral proximity in car frame at ttc
              const cosC = Math.cos(car.angle);
              const sinC = Math.sin(car.angle);
              const latAtTtc = Math.abs(-closestX * sinC + closestY * cosC);
              const lonAtTtc = Math.abs(closestX * cosC + closestY * sinC);

              if (latAtTtc < halfW && lonAtTtc < halfL && clearance < halfL + 10) {
                // Imminent collision! Compute optimal perpendicular escape vector
                const carHeadingCos = cosC * carDir;
                const carHeadingSin = sinC * carDir;
                const crossSide = relY * carHeadingCos - relX * carHeadingSin;
                const dodgeAngle = Math.atan2(carHeadingSin, carHeadingCos) + (crossSide >= 0 ? Math.PI / 2 : -Math.PI / 2);

                psy.lookTargetX = car.x;
                psy.lookTargetY = car.y;
                psy.lookTimer = 2.0;
                psy.lastThreatX = car.x;
                psy.lastThreatY = car.y;

                if (ttc < 0.55) {
                  // Reflexive immediate jump (sub-cortical startle reflex!)
                  ped.state = 'panicking';
                  ped.panicTimer = 1.6 + psy.neuroticism * 1.1;
                  ped.angle = dodgeAngle;
                  ped.targetSpeed = 102 + bio.fitness * 30;
                  psy.fear = Math.min(1, psy.fear + 0.85);
                  psy.arousal = 1.0;
                  speak(ped, pick(PHRASES_NEAR_MISS), 2.1, nowSec, true);
                  triggerNearbyWitnesses(ped.x, ped.y, 'panic', ped.id, world, pedGrid, nowSec);
                } else if (!psy.pendingReactionType) {
                  // Psychomotor delayed evasive maneuver
                  psy.pendingReactionType = 'dodge';
                  psy.pendingReactionTimer = psy.reactionDelay * 0.75;
                  psy.pendingReactionAngle = dodgeAngle;
                  psy.pendingReactionText = pick(PHRASES_NEAR_MISS);
                }
              }
            }
          }

          // Puddle splash reaction in rain when a fast car zooms right past the curb
          if (isRainLike && carSpd > 75 && distSq < 55 * 55 && distSq > 22 * 22 && ped.state === 'walking') {
            bio.wetness = Math.min(100, bio.wetness + 14);
            psy.annoyance = Math.min(1, psy.annoyance + 0.6);
            psy.lookTargetX = car.x;
            psy.lookTargetY = car.y;
            psy.lookTimer = 1.8;
            speak(ped, pick(PHRASES_SPLASH), 2.2, nowSec);
          }
        }
      }

      // Emergency siren reaction
      if (emergencyCarNearby && (ped.state === 'walking' || ped.state === 'waiting_light')) {
        psy.lookTargetX = emergencyCarNearby.x;
        psy.lookTargetY = emergencyCarNearby.y;
        psy.lookTimer = 2.2;
        if (ped.isCrossingRoad) {
          ped.targetSpeed = 68; // quickly finish crossing
        } else if (Math.random() < 0.25) {
          speak(ped, pick(PHRASES_SIREN), 2.2, nowSec);
        }
      }

      // 2) FIRE DETECTION, 112 DISPATCH & BYSTANDER PSYCHOLOGY
      if (hasAnyWorldFire && ped.state !== 'panicking' && ped.state !== 'calling_112') {
        let firePos: Vector2D | null = fireCarFound ? { x: fireCarFound.x, y: fireCarFound.y } : null;
        let fireSource: any = fireCarFound;

        if (!firePos && world.stains) {
          for (let si = 0; si < world.stains.length; si++) {
            const st = world.stains[si];
            if (st.onFire && (st.fireIntensity || 0) > 0) {
              const d2 = (st.x - ped.x) ** 2 + (st.y - ped.y) ** 2;
              if (d2 < visionRange * visionRange) {
                firePos = { x: st.x, y: st.y };
                fireSource = st;
                break;
              }
            }
          }
        }

        if (firePos && fireSource) {
          const dFire = Math.hypot(firePos.x - ped.x, firePos.y - ped.y);
          psy.lookTargetX = firePos.x;
          psy.lookTargetY = firePos.y;
          psy.lookTimer = 3.2;

          if (!fireCallbacks.isFireEngineDispatchedFor(world, firePos.x, firePos.y)) {
            if (psy.bravery > 0.35 || Math.random() < 0.72) {
              const spawned = fireCallbacks.dispatchFireEngine(world, targetPos, firePos.x, firePos.y, player);
              if (spawned) {
                fireSource.fireCallMade = true;
                ped.state = 'calling_112';
                ped.behaviorTimer = 3.8;
                ped.angle = Math.atan2(firePos.y - ped.y, firePos.x - ped.x);
                speak(ped, pick(PHRASES_FIRE_CALL), 3.4, nowSec, true);
              }
            }
          }

          if (ped.state !== 'calling_112') {
            if (dFire < 110 || psy.neuroticism > 0.58) {
              // Too close or anxious -> flee away from fire!
              ped.state = 'panicking';
              ped.panicTimer = 2.6 + psy.neuroticism * 2.0;
              ped.angle = Math.atan2(ped.y - firePos.y, ped.x - firePos.x);
              ped.targetSpeed = 95 + bio.fitness * 28;
              speak(ped, pick(PHRASES_FIRE_PANIC), 2.4, nowSec);
            } else if (psy.curiosity > 0.48 && ped.state === 'walking') {
              // Curious bystander stops at safe standoff perimeter to watch
              ped.state = 'watching_incident';
              ped.behaviorTimer = 4.0 + Math.random() * 4.0;
              ped.angle = Math.atan2(firePos.y - ped.y, firePos.x - ped.x);
            }
          }
        }
      }

      // 3) PLAYER INTERACTION & EMPATHY / THREAT REACTIONS
      if (isNearObserver && player && !player.isInVehicle && !player.insideBuildingId && !player.insideCarId && !player.insideBusId) {
        const pdx = player.x - ped.x;
        const pdy = player.y - ped.y;
        const pDistSq = pdx * pdx + pdy * pdy;

        if (pDistSq < 130 * 130) {
          // Empathetic reaction if player is unconscious/injured on the ground!
          if ((player.isFainting || player.bodyState?.isUnconscious) && ped.state === 'walking' && pDistSq < 95 * 95) {
            psy.lookTargetX = player.x;
            psy.lookTargetY = player.y;
            psy.lookTimer = 4.0;
            if (psy.bravery > 0.45) {
              ped.state = 'calling_112';
              ped.behaviorTimer = 4.5;
              ped.angle = Math.atan2(pdy, pdx);
              speak(ped, pick(PHRASES_CHECK_INJURED), 3.2, nowSec);
            }
          } else {
            // Check if player is waving / performing startling action / holding knife/lighter nearby
            const pAnim = player.actionAnim?.type;
            const heldR = player.rightHandItem?.itemId || '';
            const heldL = player.leftHandItem?.itemId || '';
            const isThreatAction =
              pAnim === 'knife_slash' ||
              pAnim === 'extinguisher_spray' ||
              pAnim === 'lighter_flick' ||
              heldR.includes('knife') ||
              heldL.includes('knife');

            if (isThreatAction && pDistSq < 88 * 88 && ped.state !== 'panicking') {
              psy.lookTargetX = player.x;
              psy.lookTargetY = player.y;
              psy.lookTimer = 2.5;
              if (psy.neuroticism > 0.4 || pDistSq < 52 * 52) {
                ped.state = 'panicking';
                ped.panicTimer = 2.2;
                ped.angle = Math.atan2(-pdy, -pdx);
                ped.targetSpeed = 96 + bio.fitness * 26;
                speak(ped, 'Эй, отойди!', 2.2, nowSec);
              } else {
                ped.state = 'startled';
                ped.behaviorTimer = 0.85;
              }
            } else if (pDistSq < 70 * 70 && Math.hypot(player.vx || 0, player.vy || 0) > 100 && ped.state === 'walking') {
              // Player sprinting past -> head glances toward player
              psy.lookTargetX = player.x;
              psy.lookTargetY = player.y;
              psy.lookTimer = 1.4;
            }
          }
        }
      }

      // 4) WEATHER & CLIMATE SEEKING SHELTER / COMFORT REMARKS
      if (ped.state === 'walking' && !ped.isCrossingRoad && !ped.isCyclist && !ped.isScooter && !ped.isJanitor) {
        if (isRainLike && !ped.hasUmbrella && bio.wetness > 18 && Math.random() < 0.14) {
          // Actively seek nearest building entrance for shelter!
          const nearBlds = bldGrid ? bldGrid.queryRadius(ped.x, ped.y, 165, _bldScratch) : world.buildings;
          let bestBld: Building | null = null;
          let bestD2 = 165 * 165;
          for (let bi = 0; bi < nearBlds.length; bi++) {
            const b = nearBlds[bi];
            if (b.type === 'park_monument' || !b.entranceSide) continue;
            const ent = getBuildingEntrancePos(b);
            const d2 = (ent.x - ped.x) ** 2 + (ent.y - ped.y) ** 2;
            if (d2 < bestD2) {
              bestD2 = d2;
              bestBld = b;
            }
          }
          if (bestBld) {
            ped.state = 'seeking_shelter';
            psy.shelterBuildingId = bestBld.id;
            speak(ped, pick(PHRASES_RAIN_NO_UMB), 2.2, nowSec);
          }
        } else if (bio.coldLevel > 0.62 && Math.random() < 0.015) {
          speak(ped, pick(PHRASES_COLD), 2.1, nowSec);
        } else if (bio.heatLevel > 0.62 && Math.random() < 0.015) {
          speak(ped, pick(PHRASES_HEAT), 2.1, nowSec);
        }
      }

      // 5) SOCIAL GREETING (Personality-driven, Russian natural greetings)
      if (isNearObserver && ped.state === 'walking' && !ped.isCrossingRoad && !ped.isCyclist && !ped.isScooter && !isStormOrBlizzard) {
        if (Math.random() < 0.025 * psy.sociability) {
          if (!ped.greetedIds) ped.greetedIds = [];
          const nearPeds = pedGrid ? pedGrid.queryRadius(ped.x, ped.y, 44, _pedScratch) : world.pedestrians;
          for (let pi = 0; pi < nearPeds.length; pi++) {
            const other = nearPeds[pi];
            if (
              other.id !== ped.id &&
              other.state === 'walking' &&
              !other.isInsideBuilding &&
              !ped.greetedIds.includes(other.id) &&
              (other.x - ped.x) ** 2 + (other.y - ped.y) ** 2 < 42 * 42
            ) {
              if (!other.greetedIds) other.greetedIds = [];
              if (ped.greetedIds.length > 8) ped.greetedIds.shift();
              if (other.greetedIds.length > 8) other.greetedIds.shift();
              ped.greetedIds.push(other.id);
              other.greetedIds.push(ped.id);

              ped.state = 'greeting';
              ped.behaviorTimer = 1.9 + Math.random() * 0.9;
              ped.angle = Math.atan2(other.y - ped.y, other.x - ped.x);
              speak(ped, pick(PHRASES_GREETING_INIT), 2.0, nowSec);

              other.state = 'greeting';
              other.behaviorTimer = 1.9 + Math.random() * 0.9;
              other.angle = Math.atan2(ped.y - other.y, ped.x - other.x);
              speak(other, pick(PHRASES_GREETING_REPLY), 2.0, nowSec);
              break;
            }
          }
        }
      }

      // 6) OCCASIONAL VOLUNTARY BUILDING VISIT OR IDLE MICRO-BEHAVIOR
      if (ped.state === 'walking' && !ped.isCrossingRoad && !ped.isCyclist && !ped.isScooter && !ped.isJanitor) {
        const enterChance = bio.coldLevel > 0.55 ? 0.028 : 0.012;
        const r = Math.random();
        if (r < enterChance) {
          const nearBlds = bldGrid ? bldGrid.queryRadius(ped.x, ped.y, 115, _bldScratch) : world.buildings;
          for (let bi = 0; bi < nearBlds.length; bi++) {
            const b = nearBlds[bi];
            if (b.type === 'park_monument' || !b.entranceSide) continue;
            const d2 = (b.x + b.width * 0.5 - ped.x) ** 2 + (b.y + b.height * 0.5 - ped.y) ** 2;
            if (d2 < 115 * 115) {
              ped.state = 'entering_building';
              ped.insideBuildingId = b.id;
              ped.enteringBuildingTimer = 0.7;
              break;
            }
          }
        } else if (r < enterChance + 0.008 && !isRainLike) {
          ped.state = 'idle_phone';
          ped.behaviorTimer = 3.0 + Math.random() * 4.5;
        } else if (r < enterChance + 0.015 && !isRainLike) {
          const nearBlds = bldGrid ? bldGrid.queryRadius(ped.x, ped.y, 62, _bldScratch) : world.buildings;
          for (let bi = 0; bi < nearBlds.length; bi++) {
            const b = nearBlds[bi];
            if (b.type === 'park_monument') continue;
            const cx = b.x + b.width * 0.5;
            const cy = b.y + b.height * 0.5;
            if ((cx - ped.x) ** 2 + (cy - ped.y) ** 2 < 62 * 62) {
              ped.state = 'idle_window';
              ped.behaviorTimer = 3.5 + Math.random() * 5.0;
              ped.angle = Math.atan2(cy - ped.y, cx - ped.x);
              break;
            }
          }
        }
      }
    }

    // =========================================================================
    // BEHAVIORAL STATE MACHINE EXECUTION
    // =========================================================================

    // Stationary timed states (idle_phone, idle_window, greeting, watching_incident, calling_112, startled, resting, sheltering)
    if (
      ped.state === 'idle_phone' ||
      ped.state === 'idle_window' ||
      ped.state === 'greeting' ||
      ped.state === 'watching_incident' ||
      ped.state === 'calling_112' ||
      ped.state === 'startled' ||
      ped.state === 'resting' ||
      ped.state === 'sheltering'
    ) {
      ped.behaviorTimer -= dt;
      ped.targetSpeed = 0;

      if (ped.state === 'sheltering' && !isRainLike && !isStormOrBlizzard) {
        ped.behaviorTimer = 0;
      }
      if (ped.state === 'resting' && bio.stamina > 58) {
        ped.behaviorTimer = 0;
      }

      if (ped.behaviorTimer <= 0) {
        ped.state = bio.injuryLevel > 22 ? 'injured_limp' : 'walking';
        ped.targetSpeed = getBaseWalkSpeed(ped, timeHour, weather);
        psy.shelterBuildingId = null;
      }
    }

    // Panicking decay & exhaustion check
    if (ped.state === 'panicking') {
      ped.panicTimer -= dt;
      ped.targetSpeed = bio.stamina > 12 ? 92 + bio.fitness * 34 : 52;
      if (ped.handheldProp && !ped.hasDroppedProp && psy.fear > 0.72) {
        dropHeldProp(ped, world);
      }
      if (ped.panicTimer <= 0) {
        if (bio.stamina < 18 && !ped.isCrossingRoad) {
          // Out of breath after sprinting -> stop and catch breath!
          ped.state = 'resting';
          ped.behaviorTimer = 3.2 + Math.random() * 2.0;
          ped.targetSpeed = 0;
        } else {
          ped.state = ped.isCrossingRoad ? 'crossing' : bio.injuryLevel > 22 ? 'injured_limp' : 'walking';
          ped.targetSpeed = getBaseWalkSpeed(ped, timeHour, weather);
        }
      }
    }

    // Crosswalk discovery & signal compliance
    if ((ped.state === 'walking' || ped.state === 'injured_limp') && !ped.isCrossingRoad && ped.crosswalkCooldownTimer <= 0) {
      for (let ii = 0; ii < world.intersections.length; ii++) {
        const inter = world.intersections[ii];
        if ((ped.x - inter.x) ** 2 + (ped.y - inter.y) ** 2 > 180 * 180) continue;
        const cws = inter.crosswalks;
        if (!cws) continue;

        for (let ci = 0; ci < cws.length; ci++) {
          const cw = cws[ci];
          const { p1, p2 } = getCrosswalkEndpoints(inter, cw);
          const d1Sq = (ped.x - p1.x) ** 2 + (ped.y - p1.y) ** 2;
          const d2Sq = (ped.x - p2.x) ** 2 + (ped.y - p2.y) ** 2;

          if (d1Sq < 32 * 32 || d2Sq < 32 * 32) {
            const startCurb = d1Sq < d2Sq ? p1 : p2;
            const endCurb = d1Sq < d2Sq ? p2 : p1;
            const dot = (startCurb.x - ped.x) * Math.cos(ped.angle) + (startCurb.y - ped.y) * Math.sin(ped.angle);
            if (dot >= -5) {
              if (Math.random() < 0.16) {
                ped.targetCrosswalkId = cw.id;
                ped.crosswalkCooldownTimer = 70.0;
                const aimAngle = Math.atan2(endCurb.y - startCurb.y, endCurb.x - startCurb.x);
                ped.routeWaypoints = [startCurb, endCurb];
                ped.targetWaypointIndex = 1;
                ped.angle = aimAngle;

                if (cw.pedestrianSignal === 'wait') {
                  ped.state = 'waiting_light';
                  ped.waitingAtCurb = true;
                  ped.targetSpeed = 0;
                  psy.impatienceTimer = 0;
                } else {
                  ped.state = 'crossing';
                  ped.isCrossingRoad = true;
                  ped.waitingAtCurb = false;
                  ped.targetSpeed = getBaseWalkSpeed(ped, timeHour, weather) * 1.15;
                }
                break;
              } else {
                ped.crosswalkCooldownTimer = 24.0;
              }
            }
          }
        }
        if (ped.state === 'waiting_light' || ped.state === 'crossing') break;
      }
    }

    // Waiting at curb for green signal (with realistic traffic scanning & rare low-conscientiousness jaywalk when completely clear!)
    if (ped.state === 'waiting_light') {
      ped.targetSpeed = 0;
      psy.impatienceTimer += dt;

      let activeCw: Intersection['crosswalks'][0] | null = null;
      let targetInter: Intersection | null = null;
      for (let ii = 0; ii < world.intersections.length; ii++) {
        const inter = world.intersections[ii];
        const found = inter.crosswalks?.find((c) => c.id === ped.targetCrosswalkId);
        if (found) { activeCw = found; targetInter = inter; break; }
      }

      if (activeCw && targetInter) {
        const { p1, p2 } = getCrosswalkEndpoints(targetInter, activeCw);
        const d1Sq = (ped.x - p1.x) ** 2 + (ped.y - p1.y) ** 2;
        const d2Sq = (ped.x - p2.x) ** 2 + (ped.y - p2.y) ** 2;
        const startCurb = d1Sq < d2Sq ? p1 : p2;
        const endCurb = d1Sq < d2Sq ? p2 : p1;
        ped.angle = Math.atan2(endCurb.y - startCurb.y, endCurb.x - startCurb.x);

        // Check if any fast car or siren vehicle is currently sweeping through the crosswalk
        const checkCars = vehGrid ? vehGrid.queryRadius((startCurb.x + endCurb.x) * 0.5, (startCurb.y + endCurb.y) * 0.5, 95, _vehScratch) : world.vehicles;
        let roadBlockedByFastCar = false;
        for (let ci = 0; ci < checkCars.length; ci++) {
          const c = checkCars[ci];
          if (c.sirenOn || Math.abs(c.speed || 0) > 22) {
            roadBlockedByFastCar = true;
            psy.lookTargetX = c.x;
            psy.lookTargetY = c.y;
            psy.lookTimer = 0.6;
            break;
          }
        }

        const greenGo = activeCw.pedestrianSignal === 'walk' && !roadBlockedByFastCar;
        // Impatient low-conscientiousness adults may jaywalk ONLY if road is totally clear and waited > 14s
        const cautiousJaywalk =
          !roadBlockedByFastCar &&
          psy.conscientiousness < 0.34 &&
          !ped.isChild &&
          psy.impatienceTimer > 14.0 &&
          checkCars.length === 0;

        if (greenGo || cautiousJaywalk) {
          ped.state = 'crossing';
          ped.isCrossingRoad = true;
          ped.waitingAtCurb = false;
          ped.targetSpeed = getBaseWalkSpeed(ped, timeHour, weather) * (cautiousJaywalk ? 1.32 : 1.15);
          ped.routeWaypoints = [startCurb, endCurb];
          ped.targetWaypointIndex = 1;
        }
      } else {
        ped.state = 'walking';
        ped.targetSpeed = getBaseWalkSpeed(ped, timeHour, weather);
      }
    }

    // Crossing road
    if (ped.state === 'crossing') {
      if (ped.routeWaypoints.length > 1) {
        const dest = ped.routeWaypoints[1];
        const dx = dest.x - ped.x;
        const dy = dest.y - ped.y;
        const dist = Math.hypot(dx, dy);

        const targetAngle = Math.atan2(dy, dx);
        ped.angle += normalizeAngle(targetAngle - ped.angle) * Math.min(1, 7.5 * dt);
        ped.targetSpeed = getBaseWalkSpeed(ped, timeHour, weather) * 1.16;

        if (dist < 16) {
          ped.state = bio.injuryLevel > 22 ? 'injured_limp' : 'walking';
          ped.isCrossingRoad = false;
          ped.waitingAtCurb = false;
          ped.targetCrosswalkId = null;
          ped.crosswalkCooldownTimer = 34.0;
          attachPedestrianToNearestSidewalk(ped, world);
        }
      }
    }

    // Normal Sidewalk Walking
    if (ped.state === 'walking' || ped.state === 'injured_limp') {
      ped.targetSpeed = getBaseWalkSpeed(ped, timeHour, weather);
      if (ped.routeWaypoints.length > 0) {
        const dir = ped.pathDirection !== undefined ? ped.pathDirection : 1;
        if (ped.targetWaypointIndex < 0 || ped.targetWaypointIndex >= ped.routeWaypoints.length) {
          ped.targetWaypointIndex = 0;
        }
        const wp = ped.routeWaypoints[ped.targetWaypointIndex];
        if (wp) {
          const dx = wp.x - ped.x;
          const dy = wp.y - ped.y;
          const distSq = dx * dx + dy * dy;
          const targetAngle = Math.atan2(dy, dx);
          ped.angle += normalizeAngle(targetAngle - ped.angle) * Math.min(1, 7.0 * dt);

          if (distSq < 18 * 18) {
            const isLoop =
              ped.routeWaypoints.length >= 3 &&
              (ped.routeWaypoints[0].x - ped.routeWaypoints[ped.routeWaypoints.length - 1].x) ** 2 +
                (ped.routeWaypoints[0].y - ped.routeWaypoints[ped.routeWaypoints.length - 1].y) ** 2 <
                100;

            const nextIndex = ped.targetWaypointIndex + dir;
            const isAtEnd = nextIndex >= ped.routeWaypoints.length || nextIndex < 0;
            let transitioned = false;
            const canBranch = (ped.branchCooldownTimer || 0) <= 0;

            if ((isAtEnd && !isLoop) || (canBranch && Math.random() < 0.25)) {
              let bestPath: GameWorld['pedestrianPaths'][0] | null = null;
              let bestWpIdx = 0;
              let bestDir = 1;
              let candidateCount = 0;

              for (let pi = 0; pi < world.pedestrianPaths.length; pi++) {
                const otherPath = world.pedestrianPaths[pi];
                if (otherPath.id === ped.targetPathId) continue;
                const owps = otherPath.waypoints;
                for (let oIdx = 0; oIdx < owps.length; oIdx++) {
                  const oWp = owps[oIdx];
                  if ((wp.x - oWp.x) ** 2 + (wp.y - oWp.y) ** 2 <= 35 * 35) {
                    if (oIdx + 1 < owps.length) {
                      candidateCount++;
                      if (Math.random() * candidateCount < 1) {
                        bestPath = otherPath; bestWpIdx = oIdx + 1; bestDir = 1;
                      }
                    }
                    if (oIdx - 1 >= 0) {
                      candidateCount++;
                      if (Math.random() * candidateCount < 1) {
                        bestPath = otherPath; bestWpIdx = oIdx - 1; bestDir = -1;
                      }
                    }
                  }
                }
              }

              if (bestPath) {
                ped.targetPathId = bestPath.id;
                ped.routeWaypoints = bestPath.waypoints;
                ped.targetWaypointIndex = bestWpIdx;
                ped.pathDirection = bestDir;
                ped.branchCooldownTimer = 12.0;
                transitioned = true;
              }
            }

            if (!transitioned) {
              if (isLoop) {
                if (nextIndex >= ped.routeWaypoints.length) ped.targetWaypointIndex = 1;
                else if (nextIndex < 0) ped.targetWaypointIndex = ped.routeWaypoints.length - 2;
                else ped.targetWaypointIndex = nextIndex;
              } else if (isAtEnd) {
                ped.pathDirection = -dir;
                ped.targetWaypointIndex = clamp(ped.targetWaypointIndex - dir, 0, ped.routeWaypoints.length - 1);
              } else {
                ped.targetWaypointIndex = nextIndex;
              }
            }
          }
        }
      }
    }

    // Smooth locomotion inertia
    const accelRate = ped.isCyclist ? 65 : 90;
    const decelRate = ped.isCyclist ? 85 : 160;
    if (ped.speed < ped.targetSpeed) {
      ped.speed = Math.min(ped.targetSpeed, ped.speed + accelRate * dt);
    } else if (ped.speed > ped.targetSpeed) {
      ped.speed = Math.max(ped.targetSpeed, ped.speed - decelRate * dt);
    }

    // Group cohesion (families & friends keep pace and stay loosely grouped)
    if (ped.groupId && ped.state === 'walking' && ped.targetSpeed > 0) {
      const groupList = _groupsMap.get(ped.groupId);
      if (groupList && groupList.length > 1) {
        let totalSpeed = ped.speed;
        let count = 1;
        for (let gi = 0; gi < groupList.length; gi++) {
          const mate = groupList[gi];
          if (mate.id === ped.id) continue;
          totalSpeed += mate.speed;
          count++;
          const d2 = (mate.x - ped.x) ** 2 + (mate.y - ped.y) ** 2;
          if (d2 > 42 * 42 && mate.speed < ped.speed) ped.speed -= 22 * dt;
        }
        ped.speed = ped.speed * 0.94 + (totalSpeed / count) * 0.06;
      }
    }

    // Walk cycle proportional to actual ground speed (zero foot sliding!)
    const strideFreq = ped.isCyclist ? ped.speed * 0.12 : ped.speed * 0.19;
    ped.walkCycle += dt * strideFreq;

    ped.vx = Math.cos(ped.angle) * ped.speed;
    ped.vy = Math.sin(ped.angle) * ped.speed;

    // =========================================================================
    // HELBING SOCIAL FORCE & ANTICIPATORY OBSTACLE STEERING
    // =========================================================================
    if (ped.speed > 4) {
      const perpX = -Math.sin(ped.angle);
      const perpY = Math.cos(ped.angle);

      // 1) Anticipatory Vehicle Avoidance
      if (ped.state === 'walking' || ped.state === 'crossing' || ped.state === 'injured_limp') {
        const lookaheadX = ped.x + Math.cos(ped.angle) * 38;
        const lookaheadY = ped.y + Math.sin(ped.angle) * 38;
        const nearCars = vehGrid ? vehGrid.queryRadius(ped.x, ped.y, 68, _vehScratch) : world.vehicles;
        for (let ci = 0; ci < nearCars.length; ci++) {
          const car = nearCars[ci];
          const halfW = (car.width || 20) * 0.5 + 10;
          const halfL = (car.length || 40) * 0.5 + 10;
          const safetyR = Math.hypot(halfL, halfW);
          const dx = lookaheadX - car.x;
          const dy = lookaheadY - car.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < safetyR * safetyR) {
            const dist = Math.sqrt(d2);
            const sideDot = (ped.x - car.x) * perpX + (ped.y - car.y) * perpY;
            const steerDir = sideDot >= 0 ? 1 : -1;
            const strength = (1 - dist / safetyR) * 48;
            ped.vx += perpX * steerDir * strength;
            ped.vy += perpY * steerDir * strength;
            break;
          }
        }
      }

      // 2) Helbing Social Force + Right-Hand Sidewalk Lane Passing with Other Pedestrians
      const personalR = psy.personalSpace;
      const nearPeds = pedGrid ? pedGrid.queryRadius(ped.x, ped.y, personalR + 12, _pedScratch) : world.pedestrians;
      for (let pi = 0; pi < nearPeds.length; pi++) {
        const other = nearPeds[pi];
        if (other.id === ped.id || other.isInsideBuilding) continue;
        const dx = ped.x - other.x;
        const dy = ped.y - other.y;
        const d2 = dx * dx + dy * dy;
        const socialR = personalR + 6;
        if (d2 < socialR * socialR && d2 > 0.01) {
          const dist = Math.sqrt(d2);
          const nx = dx / dist;
          const ny = dy / dist;
          // Exponential Hall personal-space repulsion
          const repulse = Math.max(0, (socialR - dist) / socialR) * 26;
          ped.vx += nx * repulse;
          ped.vy += ny * repulse;

          // Oncoming pedestrian: polite right-side lane sidestep (natural bidirectional sidewalk flow!)
          const headingDot = Math.cos(ped.angle) * Math.cos(other.angle) + Math.sin(ped.angle) * Math.sin(other.angle);
          if (headingDot < -0.35) {
            const passBias = (1 - dist / socialR) * 22;
            ped.vx += perpX * passBias; // step to right
            ped.vy += perpY * passBias;
          }
        }
      }

      // 3) Smooth Fountain / Monument Gliding
      const nearBlds = bldGrid ? bldGrid.queryRadius(ped.x, ped.y, 62, _bldScratch) : world.buildings;
      for (let bi = 0; bi < nearBlds.length; bi++) {
        const bld = nearBlds[bi];
        if (bld.type !== 'park_monument') continue;
        const cx = bld.x + bld.width * 0.5;
        const cy = bld.y + bld.height * 0.5;
        const safeR = bld.width * 0.5 + 10;
        const dx = ped.x - cx;
        const dy = ped.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < safeR * safeR && d2 > 0.01) {
          const dist = Math.sqrt(d2);
          const push = (1 - dist / safeR) * 58;
          ped.vx += (dx / dist) * push;
          ped.vy += (dy / dist) * push;
          const tpx = -dy / dist;
          const tpy = dx / dist;
          const sign = ped.vx * tpx + ped.vy * tpy >= 0 ? 1 : -1;
          ped.vx += tpx * sign * 24;
          ped.vy += tpy * sign * 24;
        }
      }

      // 4) Subtle organic lateral gait sway
      const sway = Math.sin(ped.walkCycle * 0.5) * 3.2;
      ped.vx += perpX * sway;
      ped.vy += perpY * sway;
    }

    // =========================================================================
    // INTEGRATE & RESOLVE ALL PHYSICAL COLLISIONS
    // =========================================================================
    const pedRadius = ped.isChild ? 3.5 : 4.5;
    const col = resolvePedestrianCollisions(
      ped,
      ped.x + ped.vx * dt,
      ped.y + ped.vy * dt,
      pedRadius,
      world,
      vehGrid,
      pedGrid,
      bldGrid,
      propGrid,
      player,
      nowSec
    );
    ped.x = col.x;
    ped.y = col.y;

    // Anti-stuck obstacle-tangent recovery (prevents jittering forever against parked cars or corners)
    if (ped.targetSpeed > 10 && (ped.state === 'walking' || ped.state === 'panicking' || ped.state === 'injured_limp')) {
      const movedSq = (ped.x - psy.lastPosX) ** 2 + (ped.y - psy.lastPosY) ** 2;
      if (movedSq < 1.8 * 1.8 * dt * dt * 60) {
        psy.stuckAccum += dt;
        if (psy.stuckAccum > 1.35) {
          // Steer tangentially around the blocking normal or flip path direction
          if (col.blocked && (Math.abs(col.hitNormalX) > 0.01 || Math.abs(col.hitNormalY) > 0.01)) {
            const tangAngle = Math.atan2(col.hitNormalX, -col.hitNormalY);
            ped.angle = tangAngle;
          } else {
            ped.angle += Math.PI * 0.65;
            ped.pathDirection = -(ped.pathDirection || 1);
          }
          psy.stuckAccum = 0;
        }
      } else {
        psy.stuckAccum = Math.max(0, psy.stuckAccum - dt * 2);
      }
      psy.lastPosX = ped.x;
      psy.lastPosY = ped.y;
    }
  }

  if (pedsToDespawn.size > 0) {
    world.pedestrians = world.pedestrians.filter((p) => !pedsToDespawn.has(p.id));
  }
}

// ============================================================================
// HELPER: SIDEWALK RE-ATTACHMENT
// ============================================================================
function attachPedestrianToNearestSidewalk(ped: Pedestrian, world: GameWorld): void {
  let bestPath = world.pedestrianPaths[0];
  let bestWpIndex = 0;
  let minScore = 999999;

  for (let pi = 0; pi < world.pedestrianPaths.length; pi++) {
    const path = world.pedestrianPaths[pi];
    const penalty = path.id.includes('_ww_') ? 20 : 0;
    for (let wi = 0; wi < path.waypoints.length; wi++) {
      const wp = path.waypoints[wi];
      const d = Math.hypot(ped.x - wp.x, ped.y - wp.y) + penalty;
      if (d < minScore) {
        minScore = d;
        bestPath = path;
        bestWpIndex = wi;
      }
    }
  }

  if (bestPath) {
    ped.targetPathId = bestPath.id;
    ped.routeWaypoints = bestPath.waypoints;
    const dir = Math.random() < 0.5 ? 1 : -1;
    ped.pathDirection = dir;
    ped.branchCooldownTimer = 10.0;
    const wps = bestPath.waypoints;
    const isLoop =
      wps.length >= 3 &&
      Math.hypot(wps[0].x - wps[wps.length - 1].x, wps[0].y - wps[wps.length - 1].y) < 10;
    ped.targetWaypointIndex = isLoop
      ? (bestWpIndex + dir + wps.length) % wps.length
      : clamp(bestWpIndex + dir, 0, wps.length - 1);
    const nextWp = wps[ped.targetWaypointIndex];
    if (nextWp) ped.angle = Math.atan2(nextWp.y - ped.y, nextWp.x - ped.x);
  }
}

// ============================================================================
// HELPER: SPECIAL FIREFIGHTER & CIVILIAN EXTINGUISHER BEHAVIOR
// ============================================================================
function updateFirefighterPed(
  ped: Pedestrian,
  world: GameWorld,
  dt: number,
  pedsToDespawn: Set<string>,
  fireCallbacks: PedestrianFireCallbacks
): void {
  const parentVehicleId = (ped as any).parentVehicleId;
  const parentCar = world.vehicles.find((v) => v.id === parentVehicleId);
  const ffState = (ped as any).firefighterState;

  if (!parentCar) {
    ped.x = -10000;
    ped.y = -10000;
    (ped as any).firefighterState = 'completed';
    pedsToDespawn.add(ped.id);
    return;
  }

  if (ped.alertBubbleTimer > 0) {
    ped.alertBubbleTimer -= dt;
    if (ped.alertBubbleTimer <= 0) ped.alertBubbleText = null;
  }

  if (ffState === 'going_to_truck') {
    const rearX = parentCar.x - Math.cos(parentCar.angle) * (parentCar.length * 0.45);
    const rearY = parentCar.y - Math.sin(parentCar.angle) * (parentCar.length * 0.45);
    const dx = rearX - ped.x;
    const dy = rearY - ped.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 15) {
      ped.angle = Math.atan2(dy, dx);
      ped.targetSpeed = 55;
      ped.speed = 55;
      ped.walkCycle += dt * 7.5;
      ped.vx = Math.cos(ped.angle) * 55;
      ped.vy = Math.sin(ped.angle) * 55;
      ped.x += ped.vx * dt;
      ped.y += ped.vy * dt;
    } else {
      (ped as any).firefighterState = 'taking_hose';
      ped.alertBubbleText = 'Взял рукав!';
      ped.alertBubbleTimer = 2.0;
      ped.handheldProp = 'extinguisher';
      ped.behaviorTimer = 0;
    }
  } else if (ffState === 'taking_hose') {
    ped.targetSpeed = 0;
    ped.speed = 0;
    ped.vx = 0;
    ped.vy = 0;
    ped.behaviorTimer = (ped.behaviorTimer ?? 0) + dt;
    if (ped.behaviorTimer > 1.5) {
      (ped as any).firefighterState = 'going_to_fire';
      ped.behaviorTimer = 0;
    }
  } else if (ffState === 'going_to_fire' || ffState === 'extinguishing') {
    let targetX = (ped as any).targetFireX;
    let targetY = (ped as any).targetFireY;
    let fireExists = false;

    const targetCar = world.vehicles.find(
      (v) =>
        v.damage &&
        !v.damage.isFullyBurnt &&
        (v.damage.engineFire || v.damage.fuelTankFire || v.damage.cabinFire || v.damage.underHoodSmolder || (v.damage.fireIntensity || 0) > 0)
    );
    const targetStain = world.stains?.find((s) => s.onFire && (s.fireIntensity || 0) > 0);

    if (targetCar) {
      targetX = targetCar.x;
      targetY = targetCar.y;
      fireExists = true;
    } else if (targetStain) {
      targetX = targetStain.x;
      targetY = targetStain.y;
      fireExists = true;
    }

    if (!fireExists) {
      ped.alertBubbleText = 'Пожар ликвидирован!';
      ped.alertBubbleTimer = 2.5;
      (ped as any).firefighterState = 'returning_to_truck';
      return;
    }

    const dx = targetX - ped.x;
    const dy = targetY - ped.y;
    const dist = Math.hypot(dx, dy);
    ped.angle = Math.atan2(dy, dx);

    if (ffState === 'going_to_fire') {
      if (dist > 75) {
        ped.targetSpeed = 52;
        ped.speed = 52;
        ped.walkCycle += dt * 7.5;
        ped.vx = Math.cos(ped.angle) * 52;
        ped.vy = Math.sin(ped.angle) * 52;
        ped.x += ped.vx * dt;
        ped.y += ped.vy * dt;
      } else {
        (ped as any).firefighterState = 'extinguishing';
      }
    } else {
      if (dist > 85) {
        ped.speed = 35;
        ped.vx = Math.cos(ped.angle) * 35;
        ped.vy = Math.sin(ped.angle) * 35;
        ped.x += ped.vx * dt;
        ped.y += ped.vy * dt;
        ped.walkCycle += dt * 5;
      } else if (dist < 50) {
        ped.speed = -25;
        ped.vx = Math.cos(ped.angle) * -25;
        ped.vy = Math.sin(ped.angle) * -25;
        ped.x += ped.vx * dt;
        ped.y += ped.vy * dt;
        ped.walkCycle += dt * 4;
      } else {
        ped.speed = 0;
        ped.vx = 0;
        ped.vy = 0;
      }

      if (Math.random() < 24.0 * dt) {
        for (let p = 0; p < 2; p++) {
          const spreadAngle = ped.angle + (Math.random() * 0.28 - 0.14);
          const pSpeed = 165 + Math.random() * 115;
          world.particles.push({
            x: ped.x + Math.cos(ped.angle) * 12 + (Math.random() * 5 - 2.5),
            y: ped.y + Math.sin(ped.angle) * 12 + (Math.random() * 5 - 2.5),
            vx: Math.cos(spreadAngle) * pSpeed,
            vy: Math.sin(spreadAngle) * pSpeed,
            radius: 2.8 + Math.random() * 3.2,
            color: Math.random() < 0.65 ? '#f8fafc' : '#e0f2fe',
            alpha: 0.88,
            initialAlpha: 0.88,
            life: 0,
            maxLife: 0.36 + Math.random() * 0.22,
            type: 'water_spray',
          });
        }
      }

      const foamPower = 4.0;
      if (targetCar && targetCar.damage) {
        targetCar.damage.fireTimer = Math.max(0, (targetCar.damage.fireTimer || 0) - dt * 35.0 * foamPower);
        targetCar.damage.fireIntensity = Math.max(0, (targetCar.damage.fireIntensity || 1.0) - 0.75 * dt * foamPower);
        targetCar.damage.fireProgress = Math.max(0, (targetCar.damage.fireProgress || 1.0) - 0.60 * dt * foamPower);
        if ((targetCar.damage.fireIntensity <= 0.05 && targetCar.damage.fireProgress <= 0.05) || (targetCar.damage.fireTimer || 0) <= 2.0) {
          targetCar.damage.engineFire = false;
          targetCar.damage.fuelTankFire = false;
          targetCar.damage.cabinFire = false;
          targetCar.damage.underHoodSmolder = false;
          targetCar.damage.engineSmoking = false;
          targetCar.damage.fireIntensity = 0;
          targetCar.damage.fireProgress = 0;
          targetCar.damage.fireTimer = 0;
          targetCar.damage.groundPuddleIgnited = false;
        }
      }
      if (targetStain) {
        targetStain.fireIntensity = Math.max(0, (targetStain.fireIntensity || 1.0) - 1.2 * dt * foamPower);
        if (targetStain.fireIntensity <= 0.05) {
          targetStain.onFire = false;
          targetStain.fireIntensity = 0;
        }
      }
    }
  } else if (ffState === 'returning_to_truck') {
    const rearX = parentCar.x - Math.cos(parentCar.angle) * (parentCar.length * 0.45);
    const rearY = parentCar.y - Math.sin(parentCar.angle) * (parentCar.length * 0.45);
    const dx = rearX - ped.x;
    const dy = rearY - ped.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 15) {
      ped.angle = Math.atan2(dy, dx);
      ped.speed = 45;
      ped.walkCycle += dt * 6.5;
      ped.vx = Math.cos(ped.angle) * 45;
      ped.vy = Math.sin(ped.angle) * 45;
      ped.x += ped.vx * dt;
      ped.y += ped.vy * dt;
    } else {
      ped.alertBubbleText = 'Работа закончена!';
      ped.alertBubbleTimer = 2.0;
      (ped as any).firefighterState = 'completed';
      pedsToDespawn.add(ped.id);
      ped.x = -10000;
      ped.y = -10000;
      ped.vx = 0;
      ped.vy = 0;

      const otherFFs = world.pedestrians.filter(
        (p) => (p as any).isFirefighter && (p as any).parentVehicleId === parentCar.id && (p as any).firefighterState !== 'completed'
      );
      if (otherFFs.length === 0) {
        (parentCar as any).isFireDispatch = false;
        parentCar.isParked = false;
        parentCar.sirenOn = false;
        parentCar.turnSignal = 'none';
        parentCar.aiState = 'driving';
        parentCar.targetSpeed = 40;
        fireCallbacks.reacquireClosestLane(parentCar, world);
      }
    }
  }

  ped.x = clamp(ped.x, 15, world.width - 15);
  ped.y = clamp(ped.y, 15, world.height - 15);
}

function updateCivilianExtinguishing(ped: Pedestrian, world: GameWorld, dt: number): void {
  let targetX = ped.x;
  let targetY = ped.y;
  let fireExists = false;

  const targetCarId = (ped as any).targetFireCarId;
  const targetStainId = (ped as any).targetFireStainId;
  let targetCar = targetCarId ? world.vehicles.find((v) => v.id === targetCarId) : null;
  let targetStain = targetStainId
    ? world.stains?.find((s) => (s as any).id === targetStainId || Math.hypot(s.x - ped.x, s.y - ped.y) < 180)
    : null;

  if (targetCar && targetCar.damage && !targetCar.damage.isFullyBurnt && (targetCar.damage.engineFire || targetCar.damage.fuelTankFire || targetCar.damage.cabinFire || targetCar.damage.underHoodSmolder || (targetCar.damage.fireIntensity || 0) > 0)) {
    targetX = targetCar.x;
    targetY = targetCar.y;
    fireExists = true;
  } else if (targetStain && targetStain.onFire && (targetStain.fireIntensity || 0) > 0) {
    targetX = targetStain.x;
    targetY = targetStain.y;
    fireExists = true;
  }

  if (!fireExists || (ped.extinguisherCharges !== undefined && ped.extinguisherCharges <= 0)) {
    ped.state = 'walking';
    ped.handheldProp = null;
    ped.alertBubbleText = ped.extinguisherCharges !== undefined && ped.extinguisherCharges <= 0 ? 'Пена кончилась!' : 'Пожар потушен!';
    ped.alertBubbleTimer = 2.0;
    return;
  }

  const dx = targetX - ped.x;
  const dy = targetY - ped.y;
  const dist = Math.hypot(dx, dy);
  ped.angle = Math.atan2(dy, dx);

  if (dist > 70) {
    ped.speed = 65;
    ped.walkCycle += dt * 9;
    ped.vx = Math.cos(ped.angle) * 65;
    ped.vy = Math.sin(ped.angle) * 65;
    ped.x = clamp(ped.x + ped.vx * dt, 15, world.width - 15);
    ped.y = clamp(ped.y + ped.vy * dt, 15, world.height - 15);
  } else {
    ped.speed = 0;
    ped.vx = 0;
    ped.vy = 0;
    if (ped.extinguisherCharges !== undefined) {
      ped.extinguisherCharges = Math.max(0, ped.extinguisherCharges - 18 * dt);
    }
    if (Math.random() < 16.0 * dt) {
      world.particles.push({
        x: ped.x + Math.cos(ped.angle) * 12 + (Math.random() * 6 - 3),
        y: ped.y + Math.sin(ped.angle) * 12 + (Math.random() * 6 - 3),
        vx: Math.cos(ped.angle) * (75 + Math.random() * 45),
        vy: Math.sin(ped.angle) * (75 + Math.random() * 45),
        radius: 2.6 + Math.random() * 2.8,
        color: '#f8fafc',
        alpha: 0.86,
        initialAlpha: 0.86,
        life: 0,
        maxLife: 0.28 + Math.random() * 0.18,
        type: 'water_spray',
      });
    }
    if (targetCar && targetCar.damage) {
      targetCar.damage.fireTimer = Math.max(0, (targetCar.damage.fireTimer || 0) - dt * 35.0);
      targetCar.damage.fireIntensity = Math.max(0, (targetCar.damage.fireIntensity || 1.0) - 0.75 * dt);
      targetCar.damage.fireProgress = Math.max(0, (targetCar.damage.fireProgress || 1.0) - 0.60 * dt);
      if ((targetCar.damage.fireIntensity <= 0.05 && targetCar.damage.fireProgress <= 0.05) || (targetCar.damage.fireTimer || 0) <= 2.0) {
        targetCar.damage.engineFire = false;
        targetCar.damage.fuelTankFire = false;
        targetCar.damage.cabinFire = false;
        targetCar.damage.underHoodSmolder = false;
        targetCar.damage.engineSmoking = false;
        targetCar.damage.fireIntensity = 0;
        targetCar.damage.fireProgress = 0;
        targetCar.damage.fireTimer = 0;
        targetCar.damage.groundPuddleIgnited = false;
      }
    }
    if (targetStain) {
      targetStain.fireIntensity = Math.max(0, (targetStain.fireIntensity || 1.0) - 1.2 * dt);
      if (targetStain.fireIntensity <= 0.05) {
        targetStain.onFire = false;
        targetStain.fireIntensity = 0;
      }
    }
  }
}

import { PerformanceConfig, GRAPHICS_PRESETS, GraphicsPresetId, performanceConfig, savePerformanceConfig } from './performanceConfig';

/**
 * Single source of truth for the graphics settings screen (main menu and pause menu both render from this).
 * Every entry maps to a real code path: see performanceConfig.ts for what each key controls.
 */

type BoolKey = { [K in keyof PerformanceConfig]: PerformanceConfig[K] extends boolean ? K : never }[keyof PerformanceConfig];
type NumKey = { [K in keyof PerformanceConfig]: PerformanceConfig[K] extends number ? K : never }[keyof PerformanceConfig];

export type GfxItem =
  | { kind: 'tg'; key: BoolKey; label: string }
  | { kind: 'sld'; key: NumKey; label: string; min: number; max: number; step: number; fmt: (v: number) => string }
  | { kind: 'seg'; key: NumKey; label: string; options: { v: number; label: string }[] };

export interface GfxGroup {
  title: string;
  items: GfxItem[];
}

const pct = (v: number) => Math.round(v * 100) + '%';
const pct100 = (v: number) => v + '%';
const countOrAll = (max: number) => (v: number) => (v >= max ? 'Все' : String(v));

export const GFX_GROUPS: GfxGroup[] = [
  {
    title: 'Изображение и разрешение',
    items: [
      { kind: 'seg', key: 'renderScale', label: 'Масштаб рендера',
        options: [{ v: 0.5, label: '50%' }, { v: 0.67, label: '67%' }, { v: 0.75, label: '75%' }, { v: 0.85, label: '85%' }, { v: 1, label: '100%' }] },
      { kind: 'tg', key: 'hiDpi', label: 'Чёткость на HiDPI-экранах (Retina 2x)' },
      { kind: 'tg', key: 'imageSmoothing', label: 'Билинейная фильтрация спрайтов' },
      { kind: 'tg', key: 'lowQualityRendering', label: 'Упрощённая геометрия объектов' },
      { kind: 'tg', key: 'enableBalconyDetails', label: 'Детализация балконов и фасадов' },
      { kind: 'tg', key: 'enableMinimap', label: 'Мини-карта' },
      { kind: 'seg', key: 'minimapUpdateMs', label: 'Частота обновления мини-карты',
        options: [{ v: 0, label: 'Каждый кадр' }, { v: 100, label: '100 мс' }, { v: 250, label: '250 мс' }, { v: 500, label: '500 мс' }] },
    ],
  },
  {
    title: 'Детальные настройки теней',
    items: [
      { kind: 'tg', key: 'enableShadows', label: 'Глобальные 3D-тени от солнца и луны' },
      { kind: 'seg', key: 'shadowResolutionScale', label: 'Разрешение буфера теней',
        options: [{ v: 0.5, label: '50%' }, { v: 0.75, label: '75%' }, { v: 1, label: '100%' }] },
      { kind: 'sld', key: 'shadowIntensity', label: 'Плотность (темнота) теней', min: 20, max: 140, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'shadowLengthScale', label: 'Масштаб длины 3D-теней', min: 50, max: 160, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'shadowSoftness', label: 'Мягкость полутеней (пенумбра)', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'tg', key: 'enableBuildingShadows', label: 'Экструдированные 3D-тени зданий' },
      { kind: 'tg', key: 'enableRooftopShadows', label: 'Тени крыш (парапеты, вентиляция, трубы)' },
      { kind: 'tg', key: 'enableTreeShadows', label: 'Ботанические тени крон и стволов деревьев' },
      { kind: 'tg', key: 'enableVehicleShadows', label: 'Тени кузовов автомобилей и прицепов' },
      { kind: 'tg', key: 'enableVehicleDetailShadows', label: 'Детальные тени авто (колёса, зеркала, стойки)' },
      { kind: 'tg', key: 'enablePedestrianShadows', label: 'Скелетные тени пешеходов и животных' },
      { kind: 'tg', key: 'enablePropShadows', label: 'Тени столбов, отбойников, ЖД и АЗС' },
      { kind: 'tg', key: 'enableMicroShadows', label: 'Микро-тени предметов, мусора и насыпей' },
      { kind: 'tg', key: 'enableCloudShadows', label: 'Дрейфующие тени облаков на земле' },
    ],
  },
  {
    title: 'Динамическое освещение и оптика',
    items: [
      { kind: 'tg', key: 'enableDynamicLighting', label: 'Динамическая карта света (фары, фонари, окна)' },
      { kind: 'seg', key: 'headlightQuality', label: 'Оптика фар автомобилей',
        options: [{ v: 1, label: 'Стандарт' }, { v: 2, label: 'ECE R112 + ПТФ' }] },
      { kind: 'tg', key: 'enableAdditiveGlow', label: 'Аддитивное свечение линз и блики на асфальте' },
      { kind: 'tg', key: 'enableHeadlightGlare', label: 'Ослепление и анаморфные блики встречных фар' },
      { kind: 'tg', key: 'enableSoftShadowBlur', label: 'Мягкий ореол источников света (shadowBlur)' },
    ],
  },
  {
    title: 'Шейдеры постобработки и цвета (WebGL2)',
    items: [
      { kind: 'tg', key: 'enableGpuPostFx', label: 'Шейдерный конвейер кадра (WebGL2 Post-FX)' },
      { kind: 'tg', key: 'gpuAntiAlias', label: 'Сглаживание граней (FXAA 3.11)' },
      { kind: 'tg', key: 'gpuBicubicUpscale', label: 'Бикубический апскейл (Catmull-Rom 5-tap)' },
      { kind: 'sld', key: 'gpuSharpness', label: 'Адаптивная резкость (AMD CAS)', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuBloom', label: 'Оптическое свечение (Dual-Kawase HDR Bloom)', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuBloomRadius', label: 'Радиус рассеивания свечения (Bloom)', min: 50, max: 150, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuRelief', label: 'Нормал-рельеф поверхностей от солнца и фар', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuGi', label: 'Непрямое освещение (GI bounce light)', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuClarity', label: 'Локальный микроконтраст и глубина (Clarity)', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuGrading', label: 'Кинематографическая тон-кривая (ACES Filmic)', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuExposure', label: 'Экспозиция шейдера', min: 50, max: 150, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuContrast', label: 'Контрастность шейдера', min: 50, max: 150, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuSaturation', label: 'Насыщенность цвета', min: 0, max: 150, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuVignette', label: 'Оптическая виньетка объектива', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuChromatic', label: 'Хроматическая аберрация краёв линзы', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuGrain', label: 'Плёночное зерно (Film Grain)', min: 0, max: 100, step: 5, fmt: pct100 },
    ],
  },
  {
    title: 'Шейдеры воды, огня и атмосферы (WebGL2)',
    items: [
      { kind: 'sld', key: 'gpuWaterShader', label: 'Шейдер воды (рефракция, Френель, блики солнца)', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuWaterWakes', label: 'Гидродинамические волны Кельвина и пена на воде', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuWet', label: 'Шейдер мокрого асфальта и зеркальных луж', min: 0, max: 100, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuFogScattering', label: 'Объёмное рассеивание света в тумане и дожде', min: 0, max: 150, step: 5, fmt: pct100 },
      { kind: 'tg', key: 'enableGpuFireShader', label: 'Волюметрический шейдер пламени (Blackbody FBM)' },
      { kind: 'seg', key: 'gpuFireScale', label: 'Разрешение волюметрического шейдера огня',
        options: [{ v: 0.5, label: '50%' }, { v: 0.75, label: '75%' }, { v: 1, label: '100%' }] },
      { kind: 'sld', key: 'gpuFireSmoke', label: 'Густота пиролизного дыма в шейдере огня', min: 0, max: 150, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuHeatShimmer', label: 'Термическое преломление воздуха (мираж от огня)', min: 0, max: 150, step: 5, fmt: pct100 },
      { kind: 'sld', key: 'gpuFireLighting', label: '3D-рельеф и отсветы пламени на объектах', min: 0, max: 150, step: 5, fmt: pct100 },
    ],
  },
  {
    title: 'Жидкости и отражения',
    items: [
      { kind: 'tg', key: 'enableLiquidReflections', label: 'Отражения неба и солнца на лужах и разливах' },
      { kind: 'sld', key: 'liquidReflectionStrength', label: 'Яркость отражений на жидкостях', min: 0, max: 100, step: 5, fmt: v => v + '%' },
      { kind: 'sld', key: 'liquidReflectionLimit', label: 'Лимит отражающих поверхностей в кадре', min: 0, max: 600, step: 25, fmt: countOrAll(600) },
      { kind: 'tg', key: 'enableLiquidShadows', label: 'Преломление теней на поверхностях жидкостей' },
      { kind: 'sld', key: 'liquidShadowStrength', label: 'Глубина теней на жидкостях', min: 0, max: 100, step: 5, fmt: v => v + '%' },
    ],
  },
  {
    title: 'Дальность прорисовки и трафик',
    items: [
      { kind: 'seg', key: 'drawDistance', label: 'Дальность прорисовки мира',
        options: [{ v: 0.6, label: '60%' }, { v: 0.7, label: '70%' }, { v: 0.85, label: '85%' }, { v: 1, label: '100%' }, { v: 1.3, label: '130%' }] },
      { kind: 'sld', key: 'maxVisiblePedestrians', label: 'Пешеходов в кадре', min: 20, max: 200, step: 10, fmt: countOrAll(200) },
      { kind: 'sld', key: 'maxVisibleVehicles', label: 'Машин в кадре', min: 10, max: 150, step: 5, fmt: countOrAll(150) },
      { kind: 'sld', key: 'maxVisibleTrees', label: 'Деревьев в кадре', min: 100, max: 3000, step: 100, fmt: countOrAll(3000) },
      { kind: 'sld', key: 'maxVisibleProps', label: 'Уличных объектов в кадре', min: 100, max: 3000, step: 100, fmt: countOrAll(3000) },
      { kind: 'sld', key: 'maxVehicles', label: 'Машин в трафике (симуляция)', min: 5, max: 45, step: 1, fmt: v => String(v) },
    ],
  },
  {
    title: 'Следы, пятна и частицы',
    items: [
      { kind: 'sld', key: 'skidMarksLimit', label: 'Следы протектора и юза шин', min: 200, max: 5000, step: 100, fmt: countOrAll(5000) },
      { kind: 'sld', key: 'stainsLimit', label: 'Пятна технических жидкостей и песка', min: 100, max: 2000, step: 50, fmt: countOrAll(2000) },
      { kind: 'sld', key: 'puddlesLimit', label: 'Дождевые и талые лужи', min: 50, max: 1000, step: 25, fmt: countOrAll(1000) },
      { kind: 'sld', key: 'litterLimit', label: 'Уличный мусор, листва и осколки', min: 20, max: 500, step: 10, fmt: countOrAll(500) },
      { kind: 'sld', key: 'renderParticleLimit', label: 'Частиц дыма и искр в кадре', min: 50, max: 600, step: 25, fmt: countOrAll(600) },
      { kind: 'sld', key: 'particleLimit', label: 'Частиц в физической симуляции', min: 100, max: 600, step: 50, fmt: v => String(v) },
      { kind: 'sld', key: 'rainDensity', label: 'Плотность осадков (дождь и снег)', min: 10, max: 100, step: 5, fmt: v => v + '%' },
    ],
  },
  {
    title: 'Атмосфера и обратная связь',
    items: [
      { kind: 'tg', key: 'enableRainDroplets', label: 'Капли дождя, круги на воде и снежинки' },
      { kind: 'tg', key: 'enableBirds', label: 'Птицы в небе и на земле' },
      { kind: 'tg', key: 'enableScreenShake', label: 'Инерционная тряска камеры при ударах' },
      { kind: 'tg', key: 'enableCameraJitter', label: 'Физиологический тремор камеры (холод, шок)' },
      { kind: 'tg', key: 'enableScreenEffects', label: 'Диегетические эффекты зрения (кровь, иней, шок)' },
      { kind: 'tg', key: 'enableSpeechBubbles', label: 'Речевые реплики над персонажами' },
      { kind: 'tg', key: 'enableNameTags', label: 'Имена игроков в мультиплеере' },
    ],
  },
];

/** Number of individually tunable graphics controls (for UI copy and tests). */
export const GFX_CONTROL_COUNT = GFX_GROUPS.reduce((n, g) => n + g.items.length, 0);

/** Writes a patch to the live config, persists it, and tells the game to re-apply canvas sizing. */
export function applyGfxPatch(patch: Partial<PerformanceConfig>) {
  Object.assign(performanceConfig, patch);
  savePerformanceConfig(performanceConfig);
  if ('renderScale' in patch || 'hiDpi' in patch || 'shadowResolutionScale' in patch) {
    // App listens to resize and rebuilds the backing store with the new scale
    window.dispatchEvent(new Event('resize'));
  }
}

export function applyGfxPreset(id: GraphicsPresetId) {
  applyGfxPatch({ ...GRAPHICS_PRESETS[id] });
}

export const GFX_PRESET_OPTIONS: { v: GraphicsPresetId; label: string }[] = [
  { v: 'low', label: 'Низкие' },
  { v: 'medium', label: 'Средние' },
  { v: 'high', label: 'Высокие' },
  { v: 'ultra', label: 'Ультра' },
];

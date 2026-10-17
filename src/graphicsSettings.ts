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
const countOrAll = (max: number) => (v: number) => (v >= max ? 'Все' : String(v));

export const GFX_GROUPS: GfxGroup[] = [
  {
    title: 'Изображение',
    items: [
      { kind: 'seg', key: 'renderScale', label: 'Масштаб рендера',
        options: [{ v: 0.5, label: '50%' }, { v: 0.67, label: '67%' }, { v: 0.75, label: '75%' }, { v: 0.85, label: '85%' }, { v: 1, label: '100%' }] },
      { kind: 'tg', key: 'hiDpi', label: 'Чёткость на HiDPI-экранах' },
      { kind: 'tg', key: 'imageSmoothing', label: 'Сглаживание спрайтов' },
      { kind: 'tg', key: 'lowQualityRendering', label: 'Упрощённая графика' },
      { kind: 'tg', key: 'enableShadows', label: 'Динамические тени' },
      { kind: 'tg', key: 'enableSoftShadowBlur', label: 'Мягкое свечение и подсветка' },
      { kind: 'tg', key: 'enableBalconyDetails', label: 'Детали балконов' },
      { kind: 'tg', key: 'enableMinimap', label: 'Мини-карта' },
      { kind: 'seg', key: 'minimapUpdateMs', label: 'Обновление мини-карты',
        options: [{ v: 0, label: 'Каждый кадр' }, { v: 100, label: '100 мс' }, { v: 250, label: '250 мс' }, { v: 500, label: '500 мс' }] },
    ],
  },
  {
    title: 'Дальность прорисовки',
    items: [
      { kind: 'seg', key: 'drawDistance', label: 'Дальность прорисовки',
        options: [{ v: 0.6, label: '60%' }, { v: 0.8, label: '80%' }, { v: 1, label: '100%' }, { v: 1.3, label: '130%' }] },
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
      { kind: 'sld', key: 'skidMarksLimit', label: 'Следы шин', min: 200, max: 5000, step: 100, fmt: countOrAll(5000) },
      { kind: 'sld', key: 'stainsLimit', label: 'Пятна жидкостей', min: 100, max: 2000, step: 50, fmt: countOrAll(2000) },
      { kind: 'sld', key: 'puddlesLimit', label: 'Лужи', min: 50, max: 1000, step: 25, fmt: countOrAll(1000) },
      { kind: 'sld', key: 'litterLimit', label: 'Мусор и бумага', min: 20, max: 500, step: 10, fmt: countOrAll(500) },
      { kind: 'sld', key: 'renderParticleLimit', label: 'Частицы на экране', min: 50, max: 600, step: 25, fmt: countOrAll(600) },
      { kind: 'sld', key: 'particleLimit', label: 'Частицы в симуляции', min: 100, max: 600, step: 50, fmt: v => String(v) },
      { kind: 'sld', key: 'rainDensity', label: 'Плотность дождя и снега', min: 10, max: 100, step: 5, fmt: v => v + '%' },
    ],
  },
  {
    title: 'Жидкости',
    items: [
      { kind: 'tg', key: 'enableLiquidReflections', label: 'Отражения на жидкостях' },
      { kind: 'sld', key: 'liquidReflectionStrength', label: 'Сила отражений', min: 0, max: 100, step: 5, fmt: v => v + '%' },
      { kind: 'sld', key: 'liquidReflectionLimit', label: 'Поверхностей с отражениями', min: 0, max: 600, step: 25, fmt: countOrAll(600) },
      { kind: 'tg', key: 'enableLiquidShadows', label: 'Динамические тени на жидкостях' },
      { kind: 'sld', key: 'liquidShadowStrength', label: 'Сила теней', min: 0, max: 100, step: 5, fmt: v => v + '%' },
    ],
  },
  {
    title: 'Эффекты',
    items: [
      { kind: 'tg', key: 'enableRainDroplets', label: 'Дождь и брызги на экране' },
      { kind: 'tg', key: 'enableCloudShadows', label: 'Тени облаков' },
      { kind: 'tg', key: 'enableBirds', label: 'Птицы' },
      { kind: 'tg', key: 'enableScreenShake', label: 'Тряска камеры' },
      { kind: 'tg', key: 'enableCameraJitter', label: 'Дрожание камеры при шоке и холоде' },
      { kind: 'tg', key: 'enableScreenEffects', label: 'Экранные эффекты (виньетка, иней)' },
      { kind: 'tg', key: 'enableSpeechBubbles', label: 'Речевые пузыри' },
      { kind: 'tg', key: 'enableNameTags', label: 'Имена других игроков' },
    ],
  },
];

/** Number of individually tunable graphics controls (for UI copy and tests). */
export const GFX_CONTROL_COUNT = GFX_GROUPS.reduce((n, g) => n + g.items.length, 0);

/** Writes a patch to the live config, persists it, and tells the game to re-apply canvas sizing. */
export function applyGfxPatch(patch: Partial<PerformanceConfig>) {
  Object.assign(performanceConfig, patch);
  savePerformanceConfig(performanceConfig);
  if ('renderScale' in patch || 'hiDpi' in patch) {
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

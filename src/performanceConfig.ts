export interface PerformanceConfig {
  // --- Base toggles (existing) ---
  maxVehicles: number;          // Target maximum active vehicles (default 28)
  nearbyVehiclesTarget: number; // Target active vehicles close to player (default 10)
  maxActivePedestrians: number; // Target maximum active pedestrians (default 150)
  enableMinimap: boolean;       // Render the mini-map (default true)
  enableRainDroplets: boolean;  // Render rain drops / splash animations on screen (default true)
  enableBalconyDetails: boolean;// Render high-fidelity balconies and fire escapes (default true)
  enableShadows: boolean;       // Draw building shadows and car drop shadows (default true)
  particleLimit: number;        // Maximum allowed active smoke/fire/dust particles in simulation (default 300)
  lowQualityRendering: boolean; // Disable fine detail lines, roof AC vents, grid floorings (default false)

  // --- Resolution & frame pacing ---
  renderScale: number;          // Backing-store scale of the game canvas, 0.5..1 (default 1)
  hiDpi: boolean;               // Use devicePixelRatio (capped at 2) for a sharper image (default false)
  imageSmoothing: boolean;      // Smooth drawImage sampling of cached sprites (default true)
  minimapUpdateMs: number;      // Minimap redraw interval in ms, 0 = every frame (default 0)

  // --- Draw distance & object caps ---
  drawDistance: number;         // Multiplier of the visible world radius, 0.6..1.4 (default 1)
  maxVisiblePedestrians: number;// Max pedestrians drawn per frame (nearest first) (default 200)
  maxVisibleVehicles: number;   // Max vehicles drawn per frame (nearest first) (default 150)
  maxVisibleTrees: number;      // Max trees drawn per frame (nearest first) (default 3000)
  maxVisibleProps: number;      // Max street props drawn per frame (nearest first) (default 3000)
  skidMarksLimit: number;       // Newest skid marks kept on screen (default 5000)
  stainsLimit: number;          // Newest fluid stains kept on screen (default 2000)
  puddlesLimit: number;         // Puddles drawn per frame (default 1000)
  litterLimit: number;          // Newest litter pieces drawn (default 500)
  renderParticleLimit: number;  // Particles drawn per frame, newest first (default 600)
  rainDensity: number;          // Rain / snow density in percent, 10..100 (default 100)

  // --- Visual effects toggles ---
  enableBirds: boolean;         // Birds on the ground and in flight (default true)
  enableCloudShadows: boolean;  // Moving cloud shadows on the ground (default true)
  enableSoftShadowBlur: boolean;// shadowBlur glows on lights and markings (costly) (default true)
  enableScreenShake: boolean;   // Camera shake from crashes and impacts (default true)
  enableCameraJitter: boolean;  // Physiological camera tremor (cold, shock) (default true)
  enableScreenEffects: boolean; // Full-screen vignette, frost, shock overlays (default true)
  enableSpeechBubbles: boolean; // Speech bubbles above players (default true)
  enableNameTags: boolean;      // Nametags above remote players (default true)

  // --- Liquid surfaces (oil, coolant, fuel, water, puddles) ---
  enableLiquidReflections: boolean; // Sky / sun reflections and wet rim on liquid surfaces (default true)
  liquidReflectionStrength: number; // Reflection intensity in percent, 0..100 (default 60)
  liquidReflectionLimit: number;    // Liquid surfaces that receive reflection & shadow effects per frame (default 200)
  enableLiquidShadows: boolean;     // Dynamic vehicle shadows falling across liquids, driven by time of day (default true)
  liquidShadowStrength: number;     // Shadow darkness in percent, 0..100 (default 50)
}

export type GraphicsPresetId = 'low' | 'medium' | 'high' | 'ultra';

const STORAGE_KEY = 'city_sim_performance_config';

export const DEFAULT_CONFIG: PerformanceConfig = {
  maxVehicles: 28,
  nearbyVehiclesTarget: 10,
  maxActivePedestrians: 120,
  enableMinimap: true,
  enableRainDroplets: true,
  enableBalconyDetails: true,
  enableShadows: true,
  particleLimit: 300,
  lowQualityRendering: false,

  renderScale: 1,
  hiDpi: false,
  imageSmoothing: true,
  minimapUpdateMs: 0,

  drawDistance: 1,
  maxVisiblePedestrians: 200,
  maxVisibleVehicles: 150,
  maxVisibleTrees: 3000,
  maxVisibleProps: 3000,
  skidMarksLimit: 5000,
  stainsLimit: 2000,
  puddlesLimit: 1000,
  litterLimit: 500,
  renderParticleLimit: 600,
  rainDensity: 100,

  enableBirds: true,
  enableCloudShadows: true,
  enableSoftShadowBlur: true,
  enableScreenShake: true,
  enableCameraJitter: true,
  enableScreenEffects: true,
  enableSpeechBubbles: true,
  enableNameTags: true,

  enableLiquidReflections: true,
  liquidReflectionStrength: 60,
  liquidReflectionLimit: 200,
  enableLiquidShadows: true,
  liquidShadowStrength: 50,
};

/** One-click presets. Each one overrides only the keys listed here. */
export const GRAPHICS_PRESETS: Record<GraphicsPresetId, Partial<PerformanceConfig>> = {
  low: {
    maxVehicles: 14, nearbyVehiclesTarget: 6, maxActivePedestrians: 50,
    enableMinimap: true, enableRainDroplets: false, enableBalconyDetails: false,
    enableShadows: false, particleLimit: 150, lowQualityRendering: true,
    renderScale: 0.67, hiDpi: false, imageSmoothing: false, minimapUpdateMs: 500,
    drawDistance: 0.7, maxVisiblePedestrians: 40, maxVisibleVehicles: 30,
    maxVisibleTrees: 300, maxVisibleProps: 400, skidMarksLimit: 600, stainsLimit: 300,
    puddlesLimit: 120, litterLimit: 60, renderParticleLimit: 150, rainDensity: 40,
    enableBirds: false, enableCloudShadows: false, enableSoftShadowBlur: false,
    enableScreenShake: false, enableCameraJitter: false, enableScreenEffects: false,
    enableSpeechBubbles: true, enableNameTags: false,
    enableLiquidReflections: false, liquidReflectionStrength: 0, liquidReflectionLimit: 0,
    enableLiquidShadows: false, liquidShadowStrength: 0,
  },
  medium: {
    maxVehicles: 22, nearbyVehiclesTarget: 8, maxActivePedestrians: 90,
    enableMinimap: true, enableRainDroplets: true, enableBalconyDetails: true,
    enableShadows: true, particleLimit: 220, lowQualityRendering: false,
    renderScale: 0.85, hiDpi: false, imageSmoothing: true, minimapUpdateMs: 250,
    drawDistance: 0.85, maxVisiblePedestrians: 100, maxVisibleVehicles: 80,
    maxVisibleTrees: 1000, maxVisibleProps: 1200, skidMarksLimit: 2000, stainsLimit: 1000,
    puddlesLimit: 500, litterLimit: 200, renderParticleLimit: 350, rainDensity: 70,
    enableBirds: true, enableCloudShadows: true, enableSoftShadowBlur: false,
    enableScreenShake: true, enableCameraJitter: true, enableScreenEffects: true,
    enableSpeechBubbles: true, enableNameTags: true,
    enableLiquidReflections: true, liquidReflectionStrength: 50, liquidReflectionLimit: 100,
    enableLiquidShadows: true, liquidShadowStrength: 35,
  },
  high: { ...DEFAULT_CONFIG },
  ultra: {
    maxVehicles: 40, nearbyVehiclesTarget: 14, maxActivePedestrians: 180,
    enableMinimap: true, enableRainDroplets: true, enableBalconyDetails: true,
    enableShadows: true, particleLimit: 500, lowQualityRendering: false,
    renderScale: 1, hiDpi: true, imageSmoothing: true, minimapUpdateMs: 0,
    drawDistance: 1.3, maxVisiblePedestrians: 200, maxVisibleVehicles: 150,
    maxVisibleTrees: 3000, maxVisibleProps: 3000, skidMarksLimit: 5000, stainsLimit: 2000,
    puddlesLimit: 1000, litterLimit: 500, renderParticleLimit: 600, rainDensity: 100,
    enableBirds: true, enableCloudShadows: true, enableSoftShadowBlur: true,
    enableScreenShake: true, enableCameraJitter: true, enableScreenEffects: true,
    enableSpeechBubbles: true, enableNameTags: true,
    enableLiquidReflections: true, liquidReflectionStrength: 80, liquidReflectionLimit: 400,
    enableLiquidShadows: true, liquidShadowStrength: 70,
  },
};

/** Returns the preset whose values all match the current config, or null for custom values. */
export function detectGraphicsPreset(cfg: PerformanceConfig): GraphicsPresetId | null {
  for (const id of Object.keys(GRAPHICS_PRESETS) as GraphicsPresetId[]) {
    const p = GRAPHICS_PRESETS[id];
    if ((Object.keys(p) as (keyof PerformanceConfig)[]).every(k => cfg[k] === p[k])) return id;
  }
  return null;
}

export function loadPerformanceConfig(): PerformanceConfig {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.error('Failed to load performance config', e);
  }
  return { ...DEFAULT_CONFIG };
}

export function savePerformanceConfig(config: PerformanceConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save performance config', e);
  }
}

/**
 * Keeps the first `limit` items of an array-like, nearest-first ordering is handled by callers.
 * Returns the original array when it is already within the limit (no allocation).
 */
export function capList<T>(list: T[], limit: number): T[] {
  return list.length > limit ? list.slice(0, Math.max(0, limit)) : list;
}

/**
 * Keeps the `limit` objects nearest to (cx, cy). Returns the original array when it already fits,
 * so the common case costs nothing; sorting only happens when the cap actually bites.
 */
export function capNearest<T extends { x: number; y: number }>(list: T[], limit: number, cx: number, cy: number): T[] {
  if (list.length <= limit) return list;
  const lim = Math.max(0, limit);
  const scored = list.map(o => ({ o, d: (o.x - cx) * (o.x - cx) + (o.y - cy) * (o.y - cy) }));
  scored.sort((a, b) => a.d - b.d);
  const out: T[] = new Array(Math.min(lim, scored.length));
  for (let i = 0; i < out.length; i++) out[i] = scored[i].o;
  return out;
}

// Global active instance
export const performanceConfig = loadPerformanceConfig();

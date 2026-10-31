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

  // --- GPU post-processing layer (WebGL2, see src/gpu/postFx.ts) ---
  enableGpuPostFx: boolean;     // Run the frame through the GPU shader chain (default true)
  gpuBloom: number;             // Glow around headlights, neon and fire, 0..100 (default 55)
  gpuGrading: number;           // Tone curve and time-of-day / weather colour grading, 0..100 (default 60)
  gpuClarity: number;           // Local contrast and depth in dark gaps, 0..100 (default 45)
  gpuRelief: number;            // Sun-lit micro relief on surfaces, 0..100 (default 35)
  gpuSharpness: number;         // Sharpening after upscale, 0..100 (default 35)
  gpuVignette: number;          // Darkened screen edges, 0..100 (default 40)
  gpuGrain: number;             // Film grain, 0..100 (default 20)
  gpuChromatic: number;         // Lens colour fringing at the edges, 0..100 (default 15)
  gpuAntiAlias: boolean;        // FXAA edge smoothing (default true)
  gpuGi: number;                // Bounce light: surfaces pick up the colour of nearby lights, 0..100 (default 45)
  gpuWet: number;               // Wet asphalt sheen and light reflections in rain, 0..100 (default 60)
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

  enableGpuPostFx: true,
  gpuBloom: 55,
  gpuGrading: 60,
  gpuClarity: 45,
  gpuRelief: 35,
  gpuSharpness: 35,
  gpuVignette: 40,
  gpuGrain: 20,
  gpuChromatic: 15,
  gpuAntiAlias: true,
  gpuGi: 45,
  gpuWet: 60,
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
    enableGpuPostFx: false, gpuBloom: 0, gpuGrading: 0, gpuClarity: 0, gpuRelief: 0, gpuSharpness: 0,
    gpuVignette: 0, gpuGrain: 0, gpuChromatic: 0, gpuAntiAlias: false, gpuGi: 0, gpuWet: 0,
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
    enableGpuPostFx: true, gpuBloom: 40, gpuGrading: 55, gpuClarity: 30, gpuRelief: 0, gpuSharpness: 30,
    gpuVignette: 30, gpuGrain: 0, gpuChromatic: 0, gpuAntiAlias: false, gpuGi: 30, gpuWet: 45,
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
    enableGpuPostFx: true, gpuBloom: 65, gpuGrading: 70, gpuClarity: 55, gpuRelief: 45, gpuSharpness: 40,
    gpuVignette: 45, gpuGrain: 25, gpuChromatic: 20, gpuAntiAlias: true, gpuGi: 60, gpuWet: 75,
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

let scratchDistances = new Float64Array(4096);
let scratchIndices = new Int32Array(4096);

function ensureScratchCapacity(needed: number) {
  if (scratchDistances.length < needed) {
    const nextSize = Math.max(needed, scratchDistances.length * 2);
    scratchDistances = new Float64Array(nextSize);
    scratchIndices = new Int32Array(nextSize);
  }
}

function quickselectIndices(k: number, left: number, right: number) {
  while (left < right) {
    const pivotIdx = (left + right) >> 1;
    const pivotDist = scratchDistances[scratchIndices[pivotIdx]];

    // Swap pivot to right
    const tmpPivot = scratchIndices[pivotIdx];
    scratchIndices[pivotIdx] = scratchIndices[right];
    scratchIndices[right] = tmpPivot;

    let storeIdx = left;
    for (let i = left; i < right; i++) {
      if (scratchDistances[scratchIndices[i]] < pivotDist) {
        const tmp = scratchIndices[storeIdx];
        scratchIndices[storeIdx] = scratchIndices[i];
        scratchIndices[i] = tmp;
        storeIdx++;
      }
    }

    const tmp = scratchIndices[storeIdx];
    scratchIndices[storeIdx] = scratchIndices[right];
    scratchIndices[right] = tmp;

    if (storeIdx === k) {
      return;
    } else if (storeIdx < k) {
      left = storeIdx + 1;
    } else {
      right = storeIdx - 1;
    }
  }
}

/**
 * Keeps the `limit` objects nearest to (cx, cy). Returns the original array when it already fits,
 * so the common case costs nothing. Uses reusable typed arrays and quickselect in O(N) time
 * to eliminate GC pressure.
 */
export function capNearest<T extends { x: number; y: number }>(list: T[], limit: number, cx: number, cy: number): T[] {
  const len = list.length;
  if (len <= limit) return list;
  const lim = Math.max(0, limit);
  if (lim === 0) return [];

  ensureScratchCapacity(len);

  for (let i = 0; i < len; i++) {
    const obj = list[i];
    const dx = obj.x - cx;
    const dy = obj.y - cy;
    scratchDistances[i] = dx * dx + dy * dy;
    scratchIndices[i] = i;
  }

  if (lim < len) {
    quickselectIndices(lim, 0, len - 1);
  }

  // Sort only the first `lim` items nearest-first
  const subIndices = scratchIndices.subarray(0, lim);
  subIndices.sort((a, b) => scratchDistances[a] - scratchDistances[b]);

  const out: T[] = new Array(lim);
  for (let i = 0; i < lim; i++) {
    out[i] = list[subIndices[i]];
  }
  return out;
}

// Global active instance
export const performanceConfig = loadPerformanceConfig();

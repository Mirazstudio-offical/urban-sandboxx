export interface PerformanceConfig {
  maxVehicles: number;          // Target maximum active vehicles (default 28)
  nearbyVehiclesTarget: number; // Target active vehicles close to player (default 10)
  maxActivePedestrians: number; // Target maximum active pedestrians (default 150)
  enableMinimap: boolean;       // Render the mini-map (default true)
  enableRainDroplets: boolean;  // Render rain drops / splash animations on screen (default true)
  enableBalconyDetails: boolean;// Render high-fidelity balconies and fire escapes (default true)
  enableShadows: boolean;       // Draw building shadows and car drop shadows (default true)
  particleLimit: number;        // Maximum allowed active smoke/fire/dust particles (default 300)
  lowQualityRendering: boolean; // Disable fine detail lines, roof AC vents, grid floorings (default false)
}

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
};

export function loadPerformanceConfig(): PerformanceConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return { ...DEFAULT_CONFIG, ...parsed };
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

// Global active instance
export const performanceConfig = loadPerformanceConfig();

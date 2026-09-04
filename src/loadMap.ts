import { GameWorld } from './types';
import { CAR_CONFIGS, generateCityWorld } from './cityMap';

export interface LoadedMapResult {
  world: GameWorld;
  source: 'file' | 'custom_storage';
  fileName: string;
}

export function sanitizeWorldVehicles(world: GameWorld): GameWorld {
  if (world && Array.isArray(world.vehicles)) {
    world.vehicles.forEach(veh => {
      if ((veh as any).type === 'bus_articulated' || !CAR_CONFIGS[veh.type]) {
        veh.type = 'bus';
      }
      const cfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
      veh.length = cfg.length;
      veh.width = cfg.width;
      veh.mass = cfg.mass;
      veh.wheelBase = cfg.wheelBase;
    });

    // Cap vehicles to at most 32 vehicles max across the city for optimal performance
    if (world.vehicles.length > 32) {
      const specialVehicles = world.vehicles.filter(
        v => v.id.includes('starter') || v.id.includes('showcase') || v.isPlayerControlled
      );
      const ordinaryVehicles = world.vehicles.filter(
        v => !v.id.includes('starter') && !v.id.includes('showcase') && !v.isPlayerControlled
      );
      const remainingSlots = Math.max(0, 32 - specialVehicles.length);
      world.vehicles = [...specialVehicles, ...ordinaryVehicles.slice(0, remainingSlots)];
    }
  }
  return world;
}

export function normalizeWorld(parsed: any): GameWorld {
  let pedestrians = Array.isArray(parsed.pedestrians) ? parsed.pedestrians : [];
  
  // Cap pedestrians at 20 max to improve performance, but shuffle them first so they 
  // aren't clustered in the same location (since map.json often saves them in sequential order)
  if (pedestrians.length > 20) {
    pedestrians = [...pedestrians].sort(() => Math.random() - 0.5).slice(0, 20);
  }

  return {
    width: typeof parsed.width === 'number' ? parsed.width : 8000,
    height: typeof parsed.height === 'number' ? parsed.height : 8000,
    roads: Array.isArray(parsed.roads) ? parsed.roads : [],
    intersections: Array.isArray(parsed.intersections) ? parsed.intersections : [],
    sidewalks: Array.isArray(parsed.sidewalks) ? parsed.sidewalks : [],
    buildings: Array.isArray(parsed.buildings) ? parsed.buildings : [],
    parkings: Array.isArray(parsed.parkings) ? parsed.parkings : [],
    trees: Array.isArray(parsed.trees) ? parsed.trees : [],
    props: Array.isArray(parsed.props) ? parsed.props : [],
    vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
    pedestrians: pedestrians,
    birds: Array.isArray(parsed.birds) ? parsed.birds : [],
    puddles: Array.isArray(parsed.puddles) ? parsed.puddles : [],
    litter: Array.isArray(parsed.litter) ? parsed.litter : [],
    skidMarks: Array.isArray(parsed.skidMarks) ? parsed.skidMarks : [],
    stains: Array.isArray(parsed.stains) ? parsed.stains : [],
    particles: Array.isArray(parsed.particles) ? parsed.particles : [],
    weather: parsed.weather || 'clear',
    pedestrianPaths: Array.isArray(parsed.pedestrianPaths) ? parsed.pedestrianPaths : [],
  };
}

export function clearCustomMapStorage(): void {
  localStorage.removeItem('neon_city_custom_map');
}

export function hasCustomSavedMap(): boolean {
  return !!localStorage.getItem('neon_city_custom_map');
}

/**
 * Loads the game world from public/map.json (or custom map saved from the editor in localStorage).
 * This preserves the file-based map loading mechanism while ensuring map.json contains the latest updates from cityMap.ts.
 */
export async function loadMap(): Promise<GameWorld> {
  const customMapRaw = localStorage.getItem('neon_city_custom_map');
  if (customMapRaw) {
    try {
      const parsed = JSON.parse(customMapRaw);
      if (parsed && Array.isArray(parsed.roads) && parsed.roads.length > 0) {
        console.log('[MapLoader] Загружена пользовательская карта из Редактора (localStorage)');
        const world = normalizeWorld(parsed);
        return sanitizeWorldVehicles(world);
      } else {
        localStorage.removeItem('neon_city_custom_map');
      }
    } catch (e) {
      console.warn('[MapLoader] Ошибка парсинга карты из localStorage, загрузка из файла map.json', e);
      localStorage.removeItem('neon_city_custom_map');
    }
  }

  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = `${cleanBase}map.json`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!res.ok) {
      throw new Error(`Файл карты "${url}" не найден или сервер вернул статус HTTP ${res.status} (${res.statusText})`);
    }

    const parsed = await res.json();
    if (!parsed || !Array.isArray(parsed.roads) || parsed.roads.length === 0) {
      throw new Error(`Файл "${url}" поврежден или не содержит дорог (roads).`);
    }

    console.log(`[MapLoader] Карта успешно загружена из "${url}" (Дорог: ${parsed.roads.length}, Зданий: ${parsed.buildings?.length || 0})`);
    const world = normalizeWorld(parsed);
    return sanitizeWorldVehicles(world);
  } catch (err: any) {
    console.error('[MapLoader] Ошибка загрузки файла карты:', err);
    throw new Error(`Не удалось загрузить карту города из файла "${url}": ${err.message || err}`);
  }
}


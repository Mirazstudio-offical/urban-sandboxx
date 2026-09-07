import { GameWorld } from './types';
import { CAR_CONFIGS, ensureVehicleDamage } from './vehicleHelpers';
import { ensureWorldGasStation } from './gasStationSystem';
import defaultMapData from '../public/map.json';

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
      veh.damage = ensureVehicleDamage(veh);
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

  const world: GameWorld = {
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

  ensureWorldGasStation(world);
  return world;
}

export function clearCustomMapStorage(): void {
  localStorage.removeItem('neon_city_custom_map');
  localStorage.removeItem('neon_city_custom_map_indexeddb');
  try {
    const req = indexedDB.open('NeonCityDB', 1);
    req.onsuccess = (e: any) => {
      const db = e.target.result;
      if (db.objectStoreNames.contains('maps')) {
        const tx = db.transaction('maps', 'readwrite');
        tx.objectStore('maps').delete('custom_map');
      }
    };
  } catch {}
}

export function hasCustomSavedMap(): boolean {
  return !!localStorage.getItem('neon_city_custom_map') || !!localStorage.getItem('neon_city_custom_map_indexeddb');
}

function getMapFromIndexedDB(): Promise<any> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('NeonCityDB', 1);
      req.onupgradeneeded = (e: any) => {
        e.target.result.createObjectStore('maps');
      };
      req.onsuccess = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('maps')) {
          resolve(null);
          return;
        }
        const tx = db.transaction('maps', 'readonly');
        const getReq = tx.objectStore('maps').get('custom_map');
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Loads the game world from public/map.json (or custom map saved from the editor in localStorage/IndexedDB).
 */
export async function loadMap(): Promise<GameWorld> {
  // Check IndexedDB first if flagged
  if (localStorage.getItem('neon_city_custom_map_indexeddb') === 'true') {
    try {
      const idbMap = await getMapFromIndexedDB();
      if (idbMap && Array.isArray(idbMap.roads) && idbMap.roads.length > 0) {
        console.log('[MapLoader] Загружена пользовательская карта из Редактора (IndexedDB)');
        const world = normalizeWorld(idbMap);
        return sanitizeWorldVehicles(world);
      }
    } catch (e) {
      console.warn('[MapLoader] Ошибка загрузки из IndexedDB:', e);
    }
  }

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
    console.warn(`[MapLoader] Сетевая загрузка "${url}" не удалась (${err.message || err}). Загрузка из вшитой карты map.json...`);
    if (defaultMapData && Array.isArray((defaultMapData as any).roads) && (defaultMapData as any).roads.length > 0) {
      console.log(`[MapLoader] Успешно загружена карта из вшитого файла map.json (Дорог: ${(defaultMapData as any).roads.length}, Зданий: ${(defaultMapData as any).buildings?.length || 0})`);
      const world = normalizeWorld(defaultMapData);
      return sanitizeWorldVehicles(world);
    }
    
    throw new Error(`Ошибка загрузки карты из map.json: ${err.message || err}`);
  }
}


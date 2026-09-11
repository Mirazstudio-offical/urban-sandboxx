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

      // Guarantee non-NaN numeric fields
      veh.steerAngle = typeof veh.steerAngle === 'number' && Number.isFinite(veh.steerAngle) ? veh.steerAngle : 0;
      veh.angle = typeof veh.angle === 'number' && Number.isFinite(veh.angle) ? veh.angle : 0;
      veh.speed = typeof veh.speed === 'number' && Number.isFinite(veh.speed) ? veh.speed : 0;
      veh.vx = typeof veh.vx === 'number' && Number.isFinite(veh.vx) ? veh.vx : 0;
      veh.vy = typeof veh.vy === 'number' && Number.isFinite(veh.vy) ? veh.vy : 0;
      veh.x = typeof veh.x === 'number' && Number.isFinite(veh.x) ? veh.x : 0;
      veh.y = typeof veh.y === 'number' && Number.isFinite(veh.y) ? veh.y : 0;
    });

    // Cap vehicles to at most 30 vehicles max across the city for optimal mobile performance
    if (world.vehicles.length > 30) {
      const isSpecial = (v: any) => 
        v.id.includes('starter') || 
        v.id.includes('showcase') || 
        v.isPlayerControlled || 
        v.id.includes('mup_') || 
        v.type.startsWith('tractor_') || 
        v.type.startsWith('trailer_') || 
        v.type.startsWith('truck_') ||
        v.type === 'garbage_truck';

      const specialVehicles = world.vehicles.filter(isSpecial);
      const ordinaryVehicles = world.vehicles.filter(v => !isSpecial(v));
      const remainingSlots = Math.max(0, 30 - specialVehicles.length);
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
    roundabouts: Array.isArray(parsed.roundabouts) ? parsed.roundabouts : [],
    sidewalks: Array.isArray(parsed.sidewalks) ? parsed.sidewalks : [],
    buildings: Array.isArray(parsed.buildings) ? parsed.buildings : [],
    parkings: Array.isArray(parsed.parkings) ? parsed.parkings : [],
    driveways: Array.isArray(parsed.driveways) ? parsed.driveways : [],
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
  ensureTrailers(world);
  return world;
}

export function ensureTrailers(world: GameWorld): void {
  if (!world.vehicles) world.vehicles = [];

  let spawnX = 5960;
  let spawnY = 1020;
  const tractor = world.vehicles.find(v => v.type.startsWith('tractor_'));
  if (tractor) {
    spawnX = tractor.x;
    spawnY = tractor.y;
  } else if ((world as any).gasStation) {
    spawnX = (world as any).gasStation.x + 130;
    spawnY = (world as any).gasStation.y + 85;
  }

  const hasBarrel = world.vehicles.some(v => v.type === 'trailer_barrel');
  if (!hasBarrel) {
    const barrelTrailer: any = {
      id: `mup_trailer_barrel_${Date.now()}`,
      type: 'trailer_barrel',
      x: spawnX + 180,
      y: spawnY,
      angle: 0,
      speed: 0,
      vx: 0,
      vy: 0,
      steerAngle: 0,
      length: 36,
      width: 22,
      mass: 1400,
      wheelBase: 16,
      color: '#0284c7',
      isParked: true,
      isTrailer: true,
      couplerOffset: 26,
      damage: ensureVehicleDamage({ type: 'trailer_barrel' } as any)
    };
    world.vehicles.push(barrelTrailer);
  }

  const hasFlatbed = world.vehicles.some(v => v.type === 'trailer_flatbed_2axle');
  if (!hasFlatbed) {
    const flatbedTrailer: any = {
      id: `mup_trailer_flatbed_${Date.now()}`,
      type: 'trailer_flatbed_2axle',
      x: spawnX + 110,
      y: spawnY + 80,
      angle: 0,
      speed: 0,
      vx: 0,
      vy: 0,
      steerAngle: 0,
      trailerDollyAngle: 0,
      length: 68,
      width: 26,
      mass: 2400,
      wheelBase: 38,
      color: '#3e5443',
      isParked: true,
      isTrailer: true,
      couplerOffset: 42,
      drawbarLength: 20,
      trailerType: 'turntable_dolly_2axle',
      damage: ensureVehicleDamage({ type: 'trailer_flatbed_2axle' } as any)
    };
    world.vehicles.push(flatbedTrailer);
  } else {
    // Update existing flatbed trailer instances to the correct proportions and weathered patina color
    world.vehicles.forEach(v => {
      if (v.type === 'trailer_flatbed_2axle') {
        v.length = 68;
        v.width = 26;
        v.wheelBase = 38;
        v.drawbarLength = 20;
        v.couplerOffset = 42;
        v.mass = 2400;
        if (!v.color || v.color === '#15803d') {
          v.color = '#3e5443';
        }
      }
    });
  }
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


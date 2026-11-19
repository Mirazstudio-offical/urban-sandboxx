import { GameWorld } from './types';
import { CAR_CONFIGS, ensureVehicleDamage, ensureVehicleEngineState } from './vehicleHelpers';
import { resolveVehicleTruckFrameAndBody } from './truckChassisVariants';
import { ensureWorldGasStation } from './gasStationSystem';
import { ensureWorldGuardrails } from './guardrails';
import { createRealEstateAgencyLayout } from './buildingInteriors';
import { initializeCityApartmentsFromWorld } from './propertySystem';
import { setWorldRoadsForElevation } from './terrainElevation';

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
      const resolvedTruck = resolveVehicleTruckFrameAndBody(veh);
      veh.length = resolvedTruck ? resolvedTruck.frame.lengthPx : cfg.length;
      veh.width = cfg.width;
      veh.mass = resolvedTruck ? resolvedTruck.frame.massKg + resolvedTruck.body.massKg : cfg.mass;
      veh.wheelBase = resolvedTruck ? resolvedTruck.frame.wheelBasePx : cfg.wheelBase;
      if (resolvedTruck && resolvedTruck.body.id === 'body_fifth_wheel') {
        veh.hitchOffset = resolvedTruck.frame.fifthWheelOffsetPx;
      }
      if ((cfg as any).couplerOffset !== undefined) {
        veh.couplerOffset = (cfg as any).couplerOffset;
      }
      if ((cfg as any).drawbarLength !== undefined) {
        veh.drawbarLength = (cfg as any).drawbarLength;
      }
      veh.damage = ensureVehicleDamage(veh);
      veh.engineState = ensureVehicleEngineState(veh);

      // Modern/expensive cars have rearview camera by default
      if (['sports', 'sedan_luxury', 'suv_luxury', 'supercar', 'coupe_gt', 'wagon_modern', 'wagon_allroad'].includes(veh.type)) {
        veh.hasRearviewCamera = true;
      }

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
        v.id.includes('gsk_') || 
        v.isPlayerControlled || 
        v.id.includes('mup_') || 
        v.type.startsWith('tractor_') || 
        v.type.startsWith('trailer_') || 
        v.type.startsWith('truck_') ||
        v.type === 'garbage_truck' ||
        Boolean(v.insertedKeyType) ||
        Boolean(v.insertedKeyId) ||
        Boolean(v.keyId) ||
        v.ownerId === 'player';

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
  pedestrians = pedestrians.filter((p: any) => p && typeof p.x === 'number' && p.x > 0 && typeof p.y === 'number' && p.y > 0);
  
  // Cap pedestrians at 20 max to improve performance, but shuffle them first so they 
  // aren't clustered in the same location (since map.json often saves them in sequential order)
  if (pedestrians.length > 20) {
    pedestrians = [...pedestrians].sort(() => Math.random() - 0.5).slice(0, 20);
  }

  const rawRoads = Array.isArray(parsed.roads) ? parsed.roads : [];
  const normalizedRoads = rawRoads.map((road: any) => {
    if (road.curvePoints && Array.isArray(road.curvePoints) && road.curvePoints.length > 0) {
      const firstPt = road.curvePoints[0];
      const lastPt = road.curvePoints[road.curvePoints.length - 1];
      if (road.x1 === undefined) road.x1 = firstPt.x;
      if (road.y1 === undefined) road.y1 = firstPt.y;
      if (road.x2 === undefined) road.x2 = lastPt.x;
      if (road.y2 === undefined) road.y2 = lastPt.y;
      if (!road.direction) road.direction = 'curved';
      if (road.lanes === undefined) road.lanes = 1;
      if (road.isDirt === undefined) road.isDirt = false;
      if (road.isGravel === undefined) road.isGravel = false;

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < road.curvePoints.length; i++) {
        const pt = road.curvePoints[i];
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      road._minX = minX;
      road._maxX = maxX;
      road._minY = minY;
      road._maxY = maxY;
    } else {
      if (road.x1 !== undefined && road.x2 !== undefined && road.y1 !== undefined && road.y2 !== undefined) {
        if (!road.direction) {
          if (Math.abs(road.y2 - road.y1) < 10) road.direction = 'horizontal';
          else if (Math.abs(road.x2 - road.x1) < 10) road.direction = 'vertical';
          else road.direction = 'diagonal';
        }
        road._minX = Math.min(road.x1, road.x2);
        road._maxX = Math.max(road.x1, road.x2);
        road._minY = Math.min(road.y1, road.y2);
        road._maxY = Math.max(road.y1, road.y2);
      }
    }
    return road;
  });

  const world: GameWorld = {
    width: typeof parsed.width === 'number' ? parsed.width : 8000,
    height: typeof parsed.height === 'number' ? parsed.height : 8000,
    roads: normalizedRoads,
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
    guardrails: Array.isArray(parsed.guardrails) ? parsed.guardrails : [],
    gasPumps: Array.isArray(parsed.gasPumps) ? parsed.gasPumps : [],
    groundItems: Array.isArray(parsed.groundItems) ? parsed.groundItems : [],
    railwayTracks: Array.isArray(parsed.railwayTracks) ? parsed.railwayTracks : [],
    railwayPlatforms: Array.isArray(parsed.railwayPlatforms) ? parsed.railwayPlatforms : [],
    rollingStock: Array.isArray(parsed.rollingStock) ? parsed.rollingStock : [],
    railwaySignals: Array.isArray(parsed.railwaySignals) ? parsed.railwaySignals : [],
    trainSchedules: Array.isArray(parsed.trainSchedules) ? parsed.trainSchedules : [],
    minimapMarkers: Array.isArray(parsed.minimapMarkers) ? parsed.minimapMarkers : [],
    spawnPoints: Array.isArray(parsed.spawnPoints) ? parsed.spawnPoints : [],
  };

  ensureWorldGasStation(world);
  ensureRealEstateAgencyBuilding(world);
  ensureTrailers(world);
  ensureWorldGuardrails(world);
  initializeCityApartmentsFromWorld(world);
  setWorldRoadsForElevation(world.roads);
  return world;
}

export function ensureRealEstateAgencyBuilding(world: GameWorld): void {
  if (!world.buildings) world.buildings = [];

  let bld = world.buildings.find(b => b.id === 'bld_real_estate_agency_main' || b.type === 'real_estate_agency');
  const agencyX = 4920;
  const agencyY = 4440;
  const agencyW = 220;
  const agencyH = 140;

  if (!bld) {
    bld = {
      id: 'bld_real_estate_agency_main',
      nameRu: 'Агентство Недвижимости «ГлавНедвижимость» (Росреестр & Недвижимость)',
      type: 'real_estate_agency',
      x: agencyX,
      y: agencyY,
      width: agencyW,
      height: agencyH,
      floorsCount: 3,
      color: '#0f172a',
      roofColor: '#1e293b',
      accentColor: '#eab308',
      entrances: [
        { side: 'south', offsetRatio: 0.5, number: 1, hasCanopyLight: true }
      ],
      roofDetails: [
        { type: 'ac', rx: 0.2, ry: 0.3, rw: 20, rh: 15 },
        { type: 'antenna', rx: 0.8, ry: 0.2, rw: 10, rh: 10 }
      ],
      windows: [],
      interiors: {
        0: createRealEstateAgencyLayout()
      }
    };
    world.buildings.push(bld);
  } else {
    bld.type = 'real_estate_agency';
    bld.nameRu = 'Агентство Недвижимости «ГлавНедвижимость» (Росреестр & Недвижимость)';
    bld.floorsCount = 3;
    bld.x = agencyX;
    bld.y = agencyY;
    bld.width = agencyW;
    bld.height = agencyH;
    bld.color = '#0f172a';
    bld.roofColor = '#1e293b';
    bld.accentColor = '#eab308';
    bld.entrances = [
      { side: 'south', offsetRatio: 0.5, number: 1, hasCanopyLight: true }
    ];
    if (!bld.interiors || !bld.interiors[0]) {
      bld.interiors = {
        0: createRealEstateAgencyLayout()
      };
    }
  }
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
      length: 34,
      width: 19,
      mass: 1200,
      wheelBase: 16,
      color: '#0284c7',
      isParked: true,
      isTrailer: true,
      couplerOffset: 23,
      damage: ensureVehicleDamage({ type: 'trailer_barrel' } as any)
    };
    world.vehicles.push(barrelTrailer);
  }

  const hasVacuum = world.vehicles.some(v => v.type === 'trailer_vacuum');
  if (!hasVacuum) {
    const vacuumTrailer: any = {
      id: `mup_trailer_vacuum_${Date.now()}`,
      type: 'trailer_vacuum',
      x: spawnX + 180,
      y: spawnY - 80,
      angle: 0,
      speed: 0,
      vx: 0,
      vy: 0,
      steerAngle: 0,
      length: 40,
      width: 20,
      mass: 1400,
      wheelBase: 18,
      color: '#2563eb', // Rich industrial blue
      isParked: true,
      isTrailer: true,
      couplerOffset: 30,
      damage: ensureVehicleDamage({ type: 'trailer_vacuum' } as any)
    };
    world.vehicles.push(vacuumTrailer);
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
      length: 52,
      width: 22,
      mass: 1800,
      wheelBase: 28,
      color: '#3e5443',
      isParked: true,
      isTrailer: true,
      couplerOffset: 28,
      drawbarLength: 16,
      trailerType: 'turntable_dolly_2axle',
      damage: ensureVehicleDamage({ type: 'trailer_flatbed_2axle' } as any)
    };
    world.vehicles.push(flatbedTrailer);
  } else {
    // Update existing flatbed trailer instances to the calibrated proportions and weathered patina color
    world.vehicles.forEach(v => {
      if (v.type === 'trailer_flatbed_2axle') {
        v.length = 52;
        v.width = 22;
        v.wheelBase = 28;
        v.drawbarLength = 16;
        v.couplerOffset = 28;
        v.mass = 1800;
        if (!v.color || v.color === '#15803d') {
          v.color = '#3e5443';
        }
      }
    });
  }
}

const MAP_DB_NAME = 'FlatbodyDB';
const MAP_DB_VERSION = 2;
const MAP_CACHE_KEY = 'cached_map_json_v1';

interface CachedMapEntry {
  signature: string;
  url: string;
  data: any;
  savedAt: number;
}

// In-memory raw map template so New Game / Load Save / Exit to Menu clones instantly without re-fetching 11 MB
let inMemoryMapTemplate: any | null = null;

function openMapDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(MAP_DB_NAME, MAP_DB_VERSION);
      req.onupgradeneeded = (e: any) => {
        const db: IDBDatabase = e.target.result;
        if (!db.objectStoreNames.contains('maps')) {
          db.createObjectStore('maps');
        }
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves');
        }
      };
      req.onsuccess = (e: any) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function cloneRawMapData(raw: any): any {
  if (typeof structuredClone === 'function') {
    return structuredClone(raw);
  }
  return JSON.parse(JSON.stringify(raw));
}

export function invalidateMapCache(): void {
  inMemoryMapTemplate = null;
}

export function clearCustomMapStorage(): void {
  inMemoryMapTemplate = null;
  localStorage.removeItem('flatbody_custom_map');
  localStorage.removeItem('flatbody_custom_map_indexeddb');
  openMapDB().then((db) => {
    if (!db || !db.objectStoreNames.contains('maps')) return;
    try {
      const tx = db.transaction('maps', 'readwrite');
      tx.objectStore('maps').delete('custom_map');
    } catch {}
  });
}

export function hasCustomSavedMap(): boolean {
  return !!localStorage.getItem('flatbody_custom_map') || !!localStorage.getItem('flatbody_custom_map_indexeddb');
}

async function getMapRecordFromIndexedDB<T = any>(key: string): Promise<T | null> {
  const db = await openMapDB();
  if (!db || !db.objectStoreNames.contains('maps')) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('maps', 'readonly');
      const getReq = tx.objectStore('maps').get(key);
      getReq.onsuccess = () => resolve((getReq.result as T) || null);
      getReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function putMapRecordToIndexedDB(key: string, value: any): Promise<void> {
  const db = await openMapDB();
  if (!db || !db.objectStoreNames.contains('maps')) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('maps', 'readwrite');
      tx.objectStore('maps').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

function getHeaderSignature(headers: Headers): string {
  const etag = headers.get('etag') || '';
  const lastMod = headers.get('last-modified') || '';
  const len = headers.get('content-length') || '';
  return `${etag}|${lastMod}|${len}`;
}

/**
 * Loads the game world from public/map.json (or custom map saved from the editor in localStorage/IndexedDB).
 * Uses a two-tier cache (in-memory template + IndexedDB with ETag/Last-Modified validation) to avoid re-downloading 11 MB.
 */
export async function loadMap(): Promise<GameWorld> {
  // Check IndexedDB first if custom editor map is flagged
  if (localStorage.getItem('flatbody_custom_map_indexeddb') === 'true') {
    try {
      const idbMap = await getMapRecordFromIndexedDB<any>('custom_map');
      if (idbMap && Array.isArray(idbMap.roads) && idbMap.roads.length > 0) {
        console.log('[MapLoader] Загружена пользовательская карта из Редактора (IndexedDB)');
        const world = normalizeWorld(cloneRawMapData(idbMap));
        return sanitizeWorldVehicles(world);
      }
    } catch (e) {
      console.warn('[MapLoader] Ошибка загрузки из IndexedDB:', e);
    }
  }

  const customMapRaw = localStorage.getItem('flatbody_custom_map');
  if (customMapRaw) {
    try {
      const parsed = JSON.parse(customMapRaw);
      if (parsed && Array.isArray(parsed.roads) && parsed.roads.length > 0) {
        console.log('[MapLoader] Загружена пользовательская карта из Редактора (localStorage)');
        const world = normalizeWorld(parsed);
        return sanitizeWorldVehicles(world);
      } else {
        localStorage.removeItem('flatbody_custom_map');
      }
    } catch (e) {
      console.warn('[MapLoader] Ошибка парсинга карты из localStorage, загрузка из файла map.json', e);
      localStorage.removeItem('flatbody_custom_map');
    }
  }

  // Tier 1: Instant in-memory template clone (avoids network + JSON.parse on save load / new game)
  if (inMemoryMapTemplate) {
    const world = normalizeWorld(cloneRawMapData(inMemoryMapTemplate));
    return sanitizeWorldVehicles(world);
  }

  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = `${cleanBase}map.json?v=interiors_v2`;

  // Tier 2: Check IndexedDB persistent cache and validate via lightweight HEAD request
  const cachedEntry = await getMapRecordFromIndexedDB<CachedMapEntry>(MAP_CACHE_KEY);
  if (cachedEntry?.data && Array.isArray(cachedEntry.data.roads) && cachedEntry.data.roads.length > 0) {
    let isFresh = false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      isFresh = true;
    } else {
      try {
        const headRes = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        if (headRes.ok) {
          const remoteSig = getHeaderSignature(headRes.headers);
          if (remoteSig !== '||' && remoteSig === cachedEntry.signature) {
            isFresh = true;
          } else if (remoteSig === '||' && Date.now() - cachedEntry.savedAt < 10 * 60 * 1000) {
            isFresh = true;
          }
        }
      } catch {
        // Offline or transient network error — serve validated IndexedDB cache
        isFresh = true;
      }
    }

    if (isFresh) {
      inMemoryMapTemplate = cachedEntry.data;
      console.log(`[MapLoader] Карта загружена из кэша IndexedDB (Дорог: ${cachedEntry.data.roads.length}, Зданий: ${cachedEntry.data.buildings?.length || 0})`);
      const world = normalizeWorld(cloneRawMapData(inMemoryMapTemplate));
      return sanitizeWorldVehicles(world);
    }
  }

  try {
    const res = await fetch(url, {
      cache: 'default',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Файл карты "${url}" не найден или сервер вернул статус HTTP ${res.status} (${res.statusText})`);
    }

    const parsed = await res.json();
    if (!parsed || !Array.isArray(parsed.roads) || parsed.roads.length === 0) {
      throw new Error(`Файл "${url}" поврежден или не содержит дорог (roads).`);
    }

    inMemoryMapTemplate = parsed;
    const signature = getHeaderSignature(res.headers);
    // Persist asynchronously to IndexedDB without blocking game startup
    void putMapRecordToIndexedDB(MAP_CACHE_KEY, {
      signature,
      url,
      data: parsed,
      savedAt: Date.now()
    } as CachedMapEntry);

    console.log(`[MapLoader] Карта успешно загружена из "${url}" (Дорог: ${parsed.roads.length}, Зданий: ${parsed.buildings?.length || 0})`);
    const world = normalizeWorld(cloneRawMapData(parsed));
    return sanitizeWorldVehicles(world);
  } catch (err: any) {
    if (cachedEntry?.data && Array.isArray(cachedEntry.data.roads) && cachedEntry.data.roads.length > 0) {
      console.warn(`[MapLoader] Сетевая загрузка не удалась, использован кэш IndexedDB.`);
      inMemoryMapTemplate = cachedEntry.data;
      const world = normalizeWorld(cloneRawMapData(cachedEntry.data));
      return sanitizeWorldVehicles(world);
    }

    console.warn(`[MapLoader] Сетевая загрузка "${url}" не удалась (${err.message || err}). Повторная попытка загрузки map.json...`);
    const fallbackRes = await fetch(`${cleanBase}map.json`);
    if (fallbackRes.ok) {
      const parsed = await fallbackRes.json();
      if (parsed && Array.isArray(parsed.roads) && parsed.roads.length > 0) {
        inMemoryMapTemplate = parsed;
        const world = normalizeWorld(cloneRawMapData(parsed));
        return sanitizeWorldVehicles(world);
      }
    }
    throw new Error(`Ошибка загрузки карты из map.json: ${err.message || err}`);
  }
}



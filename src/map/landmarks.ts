import type { GameWorld } from '../types';
import { SPAWN_LOCATIONS, type SpawnLocation } from '../spawnLocations';
import { CITY_SHOPS } from '../components/ShopModal';
import type { MapMarkerGroup } from './mapTheme';

export type LandmarkIconKey =
  | 'car' | 'hospital' | 'police' | 'fire' | 'mall' | 'garage' | 'fuel' | 'food'
  | 'pharmacy' | 'nature' | 'mountain' | 'industrial' | 'agency' | 'train' | 'spawn';

export interface Landmark {
  id: string;
  nameRu: string;
  group: MapMarkerGroup;
  x: number;
  y: number;
  iconKey: LandmarkIconKey;
  description: string;
  spawnLoc?: SpawnLocation;
}

const KNOWN_ICONS: LandmarkIconKey[] = [
  'car', 'hospital', 'police', 'fire', 'mall', 'garage', 'fuel', 'food',
  'pharmacy', 'nature', 'mountain', 'industrial', 'agency', 'train', 'spawn'
];
const KNOWN_GROUPS: MapMarkerGroup[] = ['spawns', 'gas_stations', 'services', 'shops', 'nature', 'industrial'];

const asIcon = (k: string | undefined): LandmarkIconKey =>
  (KNOWN_ICONS as string[]).includes(k || '') ? (k as LandmarkIconKey) : 'spawn';
const asGroup = (k: string | undefined): MapMarkerGroup =>
  (KNOWN_GROUPS as string[]).includes(k || '') ? (k as MapMarkerGroup) : 'services';

const spawnFor = (id: string, nameRu: string, x: number, y: number, description = ''): SpawnLocation =>
  ({ id, name: nameRu, nameRu, x, y, description, icon: null });

let cache: { world: GameWorld | null; marks: Landmark[] } | null = null;

/**
 * Collects every point of interest of the world (named buildings, gas station, shops, spawn points,
 * markers from public/map.json). The result is cached per world object.
 */
export function collectLandmarks(world: GameWorld | null): Landmark[] {
  if (cache && cache.world === world) return cache.marks;
  const marks: Landmark[] = [];
  const seen = new Set<string>();
  const near = (x: number, y: number, r: number) => marks.some(m => Math.hypot(m.x - x, m.y - y) < r);
  const nearSameGroupOrName = (x: number, y: number, r: number, nameRu: string) =>
    marks.some(m => Math.hypot(m.x - x, m.y - y) < r || (m.nameRu === nameRu && Math.hypot(m.x - x, m.y - y) < r * 2.2));
  const push = (m: Landmark) => {
    marks.push(m);
    seen.add(m.id);
  };

  if (world) {
    for (const b of world.buildings) {
      const x = Math.round(b.x + b.width / 2);
      const y = Math.round(b.y + b.height / 2);
      const nm = b.nameRu || '';
      const t = b.type || '';
      const markerBldId = `marker_bld_${b.id}`;
      if (t === 'real_estate_agency' || nm.includes('ГлавНедвижимость')) {
        seen.add(markerBldId);
        seen.add('real_estate_agency_loc');
        if (!near(x, y, 40)) {
          push({ id: `bld_${b.id || 'real_estate_agency'}`, nameRu: 'Агентство недвижимости «ГлавНедвижимость»', group: 'services', x, y, iconKey: 'agency',
            description: 'Каталог квартир, выписки ЕГРН и ключи', spawnLoc: spawnFor('real_estate_agency_loc', 'Агентство недвижимости', x, y + 60) });
        }
      } else if (t === 'car_dealership') {
        seen.add(markerBldId);
        seen.add('car_dealership_loc');
        if (!near(x, y, 40)) {
          push({ id: `bld_${b.id || 'car_dealership'}`, nameRu: nm || 'Автосалон «Премиум Авто»', group: 'services', x, y, iconKey: 'car',
            description: 'Выставка авто, покупка с ПТС и выбор цвета', spawnLoc: spawnFor('car_dealership_loc', 'Автосалон', x, y + 40) });
        }
      } else if (t === 'hospital' || nm.includes('Больница')) {
        seen.add(markerBldId);
        seen.add('hospital_loc');
        if (!near(x, y, 40)) {
          push({ id: `bld_${b.id || 'hospital'}`, nameRu: nm || 'Городская больница №1', group: 'services', x, y, iconKey: 'hospital', description: 'Травматология и реанимация, круглосуточно' });
        }
      } else if (t === 'police_station' || nm.includes('Полиция') || nm.includes('УВД')) {
        seen.add(markerBldId);
        seen.add('police_station_loc');
        if (!near(x, y, 40)) {
          push({ id: `bld_${b.id || 'police'}`, nameRu: nm || 'Полицейский участок', group: 'services', x, y, iconKey: 'police', description: 'Городское управление внутренних дел' });
        }
      } else if (t === 'fire_station' || nm.includes('Пожарная')) {
        seen.add(markerBldId);
        seen.add('fire_station_loc');
        if (!near(x, y, 40)) {
          push({ id: `bld_${b.id || 'fire_station'}`, nameRu: nm || 'Пожарная часть №12', group: 'services', x, y, iconKey: 'fire', description: 'Депо МЧС и спасательная техника' });
        }
      } else if (t === 'shopping_mall' || nm.includes('ТРЦ') || nm.includes('Галерея')) {
        seen.add(markerBldId);
        seen.add('mall_loc');
        if (!near(x, y, 40)) {
          push({ id: `bld_${b.id || 'mall'}`, nameRu: nm || 'ТРЦ «Галерея»', group: 'shops', x, y, iconKey: 'mall', description: 'Торгово-развлекательный центр' });
        }
      } else if (t === 'railway_station' || nm.includes('Вокзал')) {
        seen.add(markerBldId);
        if (!near(x, y, 40)) {
          push({ id: `bld_${b.id || 'railway_station'}`, nameRu: nm || 'Ж/Д вокзал «Степная»', group: 'services', x, y, iconKey: 'train', description: 'Пассажирский вокзал и платформы' });
        }
      }
    }

    const gs = (world as any).gasStation;
    if (gs && typeof gs.x === 'number') {
      seen.add('gas_station_loc');
      push({ id: 'gas_station_main_loc', nameRu: 'АЗС «Гранд-Ойл» (24/7)', group: 'gas_stations', x: gs.x, y: gs.y, iconKey: 'fuel',
        description: 'Все виды топлива и кафе' });
    }
  }

  for (const s of CITY_SHOPS) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    let group: MapMarkerGroup = 'shops';
    let iconKey: LandmarkIconKey = 'mall';
    if (s.type === 'gas_station_shop') { group = 'gas_stations'; iconKey = 'fuel'; }
    else if (s.type === 'auto_shop') { group = 'services'; iconKey = 'garage'; }
    else if (s.type === 'pharmacy') { group = 'services'; iconKey = 'pharmacy'; }
    else if (s.type === 'gear_shop') { iconKey = 'nature'; }
    else if (['fast_food', 'pizzeria', 'sushi_asian', 'cinema_bar', 'cafe'].includes(s.type)) { iconKey = 'food'; }
    else if (s.type === 'car_dealership') { group = 'services'; iconKey = 'car'; }

    let x = s.x, y = s.y;
    const host = world?.buildings.find(b => s.x >= b.x - 30 && s.x <= b.x + b.width + 30 && s.y >= b.y - 30 && s.y <= b.y + b.height + 30);
    // Only snap to building center for standalone small/medium buildings, not huge multi-tenant malls
    if (host && host.type !== 'shopping_mall' && host.width <= 180 && host.height <= 180) {
      x = Math.round(host.x + host.width / 2);
      y = Math.round(host.y + host.height / 2);
    }
    if (near(x, y, 42)) continue;
    push({ id: s.id, nameRu: s.nameRu, group, x, y, iconKey, description: s.description });
  }

  for (const sp of SPAWN_LOCATIONS) {
    if (seen.has(sp.id)) continue;
    seen.add(sp.id);
    if (near(sp.x, sp.y, 90)) continue;
    let group: MapMarkerGroup = 'spawns';
    let iconKey: LandmarkIconKey = 'spawn';
    if (/park|forest|cottage|village/.test(sp.id)) { group = 'nature'; iconKey = 'nature'; }
    else if (sp.id.includes('industrial')) { group = 'industrial'; iconKey = 'industrial'; }
    else if (/highway|pass|canyon|dunes|hub/.test(sp.id)) { group = 'nature'; iconKey = 'mountain'; }
    push({ id: sp.id, nameRu: sp.nameRu, group, x: sp.x, y: sp.y, iconKey, description: sp.description, spawnLoc: sp });
  }

  if (world && Array.isArray(world.minimapMarkers)) {
    for (const m of world.minimapMarkers) {
      if (!m || !m.id || seen.has(m.id)) continue;
      seen.add(m.id);
      if (nearSameGroupOrName(m.x, m.y, 42, m.nameRu)) continue;
      push({ id: m.id, nameRu: m.nameRu, group: asGroup(m.category), x: m.x, y: m.y, iconKey: asIcon(m.iconKey), description: m.description || '' });
    }
  }

  if (world && Array.isArray(world.spawnPoints)) {
    for (const sp of world.spawnPoints) {
      if (!sp || !sp.id || seen.has(sp.id)) continue;
      seen.add(sp.id);
      if (nearSameGroupOrName(sp.x, sp.y, 75, sp.nameRu)) continue;
      push({ id: sp.id, nameRu: sp.nameRu, group: 'spawns', x: sp.x, y: sp.y, iconKey: asIcon(sp.iconKey), description: sp.description || 'Точка спавна',
        spawnLoc: spawnFor(sp.id, sp.nameRu, sp.x, sp.y, sp.description || '') });
    }
  }

  cache = { world, marks };
  return marks;
}

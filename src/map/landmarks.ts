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
  const push = (m: Landmark) => { marks.push(m); seen.add(m.id); };

  if (world) {
    for (const b of world.buildings) {
      const x = Math.round(b.x + b.width / 2);
      const y = Math.round(b.y + b.height / 2);
      const nm = b.nameRu || '';
      const t = b.type || '';
      if (t === 'real_estate_agency' || nm.includes('ГлавНедвижимость')) {
        push({ id: 'bld_real_estate_agency', nameRu: 'Агентство недвижимости «ГлавНедвижимость»', group: 'services', x, y, iconKey: 'agency',
          description: 'Каталог квартир, выписки ЕГРН и ключи', spawnLoc: spawnFor('real_estate_agency_loc', 'Агентство недвижимости', x, y + 60) });
      } else if (t === 'car_dealership') {
        push({ id: 'bld_car_dealership', nameRu: nm || 'Автосалон «Премиум Авто»', group: 'services', x, y, iconKey: 'car',
          description: 'Выставка авто, покупка с ПТС и выбор цвета', spawnLoc: spawnFor('car_dealership_loc', 'Автосалон', x, y + 40) });
      } else if (t === 'hospital' || nm.includes('Больница')) {
        push({ id: 'bld_hospital', nameRu: nm || 'Городская больница №1', group: 'services', x, y, iconKey: 'hospital', description: 'Травматология и реанимация, круглосуточно' });
      } else if (t === 'police_station' || nm.includes('Полиция') || nm.includes('УВД')) {
        push({ id: 'bld_police', nameRu: nm || 'Полицейский участок', group: 'services', x, y, iconKey: 'police', description: 'Городское управление внутренних дел' });
      } else if (t === 'fire_station' || nm.includes('Пожарная')) {
        push({ id: 'bld_fire_station', nameRu: nm || 'Пожарная часть №12', group: 'services', x, y, iconKey: 'fire', description: 'Депо МЧС и спасательная техника' });
      } else if (t === 'shopping_mall' || nm.includes('ТРЦ') || nm.includes('Галерея')) {
        push({ id: 'bld_mall', nameRu: nm || 'ТРЦ «Галерея»', group: 'shops', x, y, iconKey: 'mall', description: 'Торгово-развлекательный центр' });
      } else if (t === 'railway_station' || nm.includes('Вокзал')) {
        push({ id: 'bld_railway_station', nameRu: nm || 'Ж/Д вокзал «Степная»', group: 'services', x, y, iconKey: 'train', description: 'Пассажирский вокзал и платформы' });
      }
    }

    const gs = (world as any).gasStation;
    if (gs && typeof gs.x === 'number') {
      push({ id: 'gas_station_main_loc', nameRu: 'АЗС «Гранд-Ойл» (24/7)', group: 'gas_stations', x: gs.x, y: gs.y, iconKey: 'fuel',
        description: 'Все виды топлива и кафе' });
    }
  }

  for (const s of CITY_SHOPS) {
    if (seen.has(s.id)) continue;
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
    if (host) { x = Math.round(host.x + host.width / 2); y = Math.round(host.y + host.height / 2); }
    if (near(x, y, 60)) continue;
    push({ id: s.id, nameRu: s.nameRu, group, x, y, iconKey, description: s.description });
  }

  for (const sp of SPAWN_LOCATIONS) {
    if (seen.has(sp.id) || near(sp.x, sp.y, 100)) continue;
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
      push({ id: m.id, nameRu: m.nameRu, group: asGroup(m.category), x: m.x, y: m.y, iconKey: asIcon(m.iconKey), description: m.description || '' });
    }
  }

  if (world && Array.isArray(world.spawnPoints)) {
    for (const sp of world.spawnPoints) {
      if (!sp || !sp.id || seen.has(sp.id)) continue;
      push({ id: sp.id, nameRu: sp.nameRu, group: 'spawns', x: sp.x, y: sp.y, iconKey: asIcon(sp.iconKey), description: sp.description || 'Точка спавна',
        spawnLoc: spawnFor(sp.id, sp.nameRu, sp.x, sp.y, sp.description || '') });
    }
  }

  cache = { world, marks };
  return marks;
}

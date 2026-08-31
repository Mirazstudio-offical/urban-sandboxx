import { GameWorld } from './types';
import { CAR_CONFIGS } from './cityMap';

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
  }
  return world;
}

export async function loadMap(): Promise<GameWorld> {
  let world: GameWorld;
  const customMapRaw = localStorage.getItem('neon_city_custom_map');
  if (customMapRaw) {
    try {
      const parsed = JSON.parse(customMapRaw);
      if (parsed && Array.isArray(parsed.roads)) {
        world = parsed;
        return sanitizeWorldVehicles(world);
      }
    } catch (e) {
      console.warn('Failed to parse custom map from localStorage, falling back to map.json', e);
    }
  }

  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const res = await fetch(`${baseUrl}map.json`);
  if (!res.ok) throw new Error(`Failed to load map: ${res.status}`);
  world = await res.json();
  return sanitizeWorldVehicles(world);
}


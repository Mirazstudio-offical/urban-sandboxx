import { GameWorld } from './types';

export async function loadMap(): Promise<GameWorld> {
  const customMapRaw = localStorage.getItem('neon_city_custom_map');
  if (customMapRaw) {
    try {
      const parsed = JSON.parse(customMapRaw);
      if (parsed && Array.isArray(parsed.roads)) {
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse custom map from localStorage, falling back to map.json', e);
    }
  }

  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const res = await fetch(`${baseUrl}map.json`);
  if (!res.ok) throw new Error(`Failed to load map: ${res.status}`);
  return res.json();
}


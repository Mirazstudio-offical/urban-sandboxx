import { GameWorld } from './types';

export async function loadMap(): Promise<GameWorld> {
  const res = await fetch('/map.json');
  if (!res.ok) throw new Error(`Failed to load map: ${res.status}`);
  return res.json();
}

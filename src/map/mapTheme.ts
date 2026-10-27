/**
 * Shared look of the in-game maps (mini-map + full-screen map).
 * Same palette as the main menu: graphite glass, amber accent, Barlow Condensed.
 */
export const MAP_COLORS = {
  bg: '#101113',
  bgDeep: '#0b0c0e',
  grid: 'rgba(255,255,255,0.035)',
  gridStrong: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.09)',
  text: '#e9e6df',
  textMuted: '#a29e93',
  amber: '#c9922b',
  amberHi: '#e0ab45',
  amberSoft: '#f0c264',

  water: '#1c3440',
  waterLine: '#2f5667',
  forest: 'rgba(52,84,50,0.34)',
  forestDeep: 'rgba(40,70,44,0.42)',
  steppe: 'rgba(120,112,64,0.16)',
  badlands: 'rgba(122,98,76,0.2)',
  park: 'rgba(70,110,60,0.34)',

  roadAsphalt: '#3a3c42',
  roadAsphaltEdge: '#26272b',
  roadGravel: '#5d5a52',
  roadDirt: '#6b4d33',
  roadMark: 'rgba(233,230,223,0.28)',
  rail: '#8a867b',
  railBed: '#2a2926',

  building: 'rgba(66,68,74,0.92)',
  buildingEdge: 'rgba(120,122,130,0.55)',
  buildingShadow: 'rgba(0,0,0,0.35)',
  parking: 'rgba(80,100,130,0.3)',
  parkingEdge: 'rgba(120,150,190,0.45)',

  route: '#e0ab45',
  routeGlow: 'rgba(224,171,69,0.28)',
  player: '#e0ab45',
  playerEdge: '#1a1409',
  traffic: '#a29e93',
  trafficParked: '#5e5b54',
  trafficJam: '#d9745a',
  accident: '#e0583c',
  pedestrian: '#bdb8aa',
  signalGreen: '#9ac985',
  signalRed: '#d9745a',
} as const;

export type MapMarkerGroup = 'spawns' | 'gas_stations' | 'services' | 'shops' | 'nature' | 'industrial';

export const GROUP_COLORS: Record<MapMarkerGroup, string> = {
  spawns: '#e0ab45',
  gas_stations: '#6aa7e0',
  services: '#9ac985',
  shops: '#b99be0',
  nature: '#6fae6a',
  industrial: '#a29e93',
};

export const GROUP_LABELS: Record<MapMarkerGroup, string> = {
  spawns: 'Точки спавна',
  gas_stations: 'АЗС',
  services: 'Сервисы',
  shops: 'Магазины',
  nature: 'Природа и трассы',
  industrial: 'Промзоны',
};

/** Fonts used inside canvas text (CSS fonts are loaded globally from index.html). */
export const MAP_FONT = "'Barlow Condensed','Arial Narrow',sans-serif";

export function formatDistance(m: number): string {
  if (!isFinite(m)) return '—';
  return m >= 1000 ? (m / 1000).toFixed(1) + ' км' : Math.round(m) + ' м';
}

export function formatEta(m: number): string {
  const sec = m / 13.8; // ~50 km/h
  if (!isFinite(sec)) return '—';
  if (sec < 60) return Math.max(1, Math.round(sec)) + ' сек';
  return '~' + Math.round(sec / 60) + ' мин';
}

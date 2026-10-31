// --- TERRAIN ELEVATION & VOLUMETRIC RELIEF SYSTEM ---
// Computes realistic multi-scale topographic elevations, slope gradients,
// hillshading illumination, and defined agricultural field parcels across the world.

import { getRiverWaterAt } from './riverSystem';

export interface TerrainSlope {
  elevation: number;    // Height Z in meters / world units
  slopeX: number;       // dZ/dx
  slopeY: number;       // dZ/dy
  gradient: number;     // sqrt(slopeX^2 + slopeY^2)
  shade: number;        // Shading factor (-1.0 to +1.0, positive = sunlit, negative = shadowed)
}

export type FieldCropType = 
  | 'plowed'        // Black earth / chernozem arable soil with deep furrows
  | 'wheat'         // Golden ripe wheat with wind waves & tramlines
  | 'clover'        // Lush emerald clover & alfalfa meadow with mowed swaths
  | 'sunflower'     // Blooming golden sunflowers / canola
  | 'pasture'       // Undulating grass pasture with wildflowers & knolls
  | 'fallow'        // Dry stubble & steppe fallow
  | 'steppe_dry'    // Golden-olive steppe grasses
  | 'taiga_moss'    // Dark taiga pine soil
  | 'canyon_clay'   // Terracotta clay & rock
  | 'desert_dune';  // Golden sand dunes with wind ripples

export interface AgriculturalField {
  id: string;
  name: string;
  type: FieldCropType;
  bounds: { x: number; y: number; width: number; height: number };
  furrowAngle: number;       // Radians (angle of plow furrows / rows)
  furrowSpacing: number;     // Pixels between furrows
  hasTramlines?: boolean;    // Harvester/tractor tramlines (технологическая колея)
  tramlineSpacing?: number;  // Distance between tramline pairs
  hasHayBales?: boolean;     // Scattered round straw bales
  hayBalePositions?: { x: number; y: number; angle: number }[];
  borderBermWidth?: number;  // Raised earth boundary ridge width
}

export interface LandmarkHill {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  height: number;
  angle?: number;
  type: 'kurgan' | 'ridge' | 'knoll' | 'mound' | 'gully' | 'escarpment';
}

// Landmark hills, mounds, kurgans, and elevation features
export const LANDMARK_HILLS: LandmarkHill[] = [
  // --- COUNTRYSIDE / COZY VILLAGE SECTOR (x: 3800..8000, y: 3800..8200) ---
  {
    x: 4800, y: 6400, radiusX: 650, radiusY: 520, height: 28, angle: 0.2, type: 'knoll'
  },
  {
    x: 6200, y: 6800, radiusX: 750, radiusY: 480, height: 34, angle: -0.15, type: 'ridge'
  },
  {
    x: 7100, y: 4800, radiusX: 580, radiusY: 620, height: 30, angle: 0.35, type: 'knoll'
  },
  {
    x: 4300, y: 4600, radiusX: 420, radiusY: 380, height: 22, angle: 0, type: 'mound'
  },
  {
    x: 5800, y: 4300, radiusX: 500, radiusY: 360, height: 26, angle: -0.25, type: 'knoll'
  },
  {
    x: 5300, y: 7600, radiusX: 700, radiusY: 450, height: 24, angle: 0.1, type: 'ridge'
  },

  // --- WEST SCENIC COUNTRY BUFFER (x: 0..3800, y: 3800..8200) ---
  {
    x: 1200, y: 5200, radiusX: 700, radiusY: 600, height: 32, angle: 0.4, type: 'ridge'
  },
  {
    x: 2400, y: 6800, radiusX: 620, radiusY: 540, height: 28, angle: -0.3, type: 'knoll'
  },
  {
    x: 1600, y: 7200, radiusX: 500, radiusY: 420, height: 25, angle: 0.1, type: 'mound'
  },
  {
    x: 800, y: 4400, radiusX: 450, radiusY: 400, height: 20, angle: 0, type: 'knoll'
  },

  // --- NORTHERN WILDERNESS & RIVER BLUFFS (y: -4200..-1800) ---
  {
    x: 8600, y: -3500, radiusX: 600, radiusY: 400, height: 26, angle: 0.15, type: 'ridge'
  },
  {
    x: 10500, y: -3400, radiusX: 750, radiusY: 380, height: 28, angle: -0.2, type: 'knoll'
  },
  {
    x: 12800, y: -3300, radiusX: 850, radiusY: 350, height: 32, angle: 0.25, type: 'ridge'
  },
  {
    x: 14800, y: -3100, radiusX: 650, radiusY: 360, height: 27, angle: 0, type: 'kurgan'
  },

  // --- STEPPE KURGANS & RIDGES (x: 8000..52000, y: 0..30000) ---
  {
    x: 10800, y: 3400, radiusX: 380, radiusY: 340, height: 38, angle: 0.1, type: 'kurgan'
  },
  {
    x: 14600, y: 3100, radiusX: 420, radiusY: 390, height: 42, angle: -0.2, type: 'kurgan'
  },
  {
    x: 18400, y: 3800, radiusX: 850, radiusY: 480, height: 45, angle: 0.3, type: 'ridge'
  },
  {
    x: 23200, y: 2800, radiusX: 950, radiusY: 520, height: 50, angle: -0.1, type: 'ridge'
  },
  {
    x: 29500, y: 3400, radiusX: 600, radiusY: 550, height: 44, angle: 0.25, type: 'kurgan'
  },
  {
    x: 36000, y: 2200, radiusX: 1200, radiusY: 600, height: 65, angle: -0.15, type: 'escarpment'
  },
  {
    x: 44000, y: 1800, radiusX: 1400, radiusY: 700, height: 80, angle: 0.1, type: 'escarpment'
  },

  // --- CANYON ESCARPMENTS & DUNES (y >= 14000) ---
  {
    x: 22000, y: 16000, radiusX: 1100, radiusY: 750, height: 60, angle: 0.4, type: 'ridge'
  },
  {
    x: 32000, y: 18000, radiusX: 1400, radiusY: 900, height: 75, angle: -0.3, type: 'escarpment'
  },
  {
    x: 26000, y: 26000, radiusX: 1600, radiusY: 800, height: 55, angle: 0.5, type: 'ridge'
  },
  {
    x: 38000, y: 27000, radiusX: 1800, radiusY: 900, height: 65, angle: -0.4, type: 'ridge'
  }
];

// Defined realistic agricultural field plots in the open countryside (strictly outside the 0..8000 x 0..8000 city & cottage settlement)
export const AGRICULTURAL_FIELDS: AgriculturalField[] = [
  // 1. Great Plowed Arable Field East of Cottage Settlement (Пашня с черными бороздами)
  {
    id: 'field_plowed_north',
    name: 'Восточная Пашня (Чернозём)',
    type: 'plowed',
    bounds: { x: 8200, y: 4950, width: 2550, height: 1400 },
    furrowAngle: 0.22,
    furrowSpacing: 10,
    borderBermWidth: 14
  },
  // 2. Golden Wheat Field with Tramlines & Straw Rolls (Золотое пшеничное поле)
  {
    id: 'field_wheat_central',
    name: 'Золотая Нива (Озимая пшеница)',
    type: 'wheat',
    bounds: { x: 8200, y: 6550, width: 2050, height: 1280 },
    furrowAngle: -0.15,
    furrowSpacing: 14,
    hasTramlines: true,
    tramlineSpacing: 160,
    hasHayBales: true,
    hayBalePositions: [
      { x: 8480, y: 6820, angle: 0.3 },
      { x: 8820, y: 6960, angle: -0.2 },
      { x: 9180, y: 6780, angle: 0.7 },
      { x: 9540, y: 7040, angle: 0.1 },
      { x: 9880, y: 6860, angle: -0.4 },
      { x: 8620, y: 7340, angle: 0.5 },
      { x: 9040, y: 7480, angle: -0.1 },
      { x: 9460, y: 7380, angle: 0.25 },
      { x: 9920, y: 7520, angle: -0.6 }
    ],
    borderBermWidth: 16
  },
  // 3. Blooming Sunflower Field in Southern Agrarian Valley (Подсолнухи)
  {
    id: 'field_sunflower_south',
    name: 'Солнечное Поле (Подсолнечник)',
    type: 'sunflower',
    bounds: { x: 4200, y: 9120, width: 3500, height: 1700 },
    furrowAngle: 0.32,
    furrowSpacing: 18,
    hasTramlines: true,
    tramlineSpacing: 180,
    borderBermWidth: 14
  },
  // 4. Lush Clover / Alfalfa Hay Meadow near Stepnaya (Люцерновый сенокос)
  {
    id: 'field_clover_east',
    name: 'Клеверный Сенокос (Люцерна)',
    type: 'clover',
    bounds: { x: 11500, y: 4300, width: 2350, height: 3100 },
    furrowAngle: -0.28,
    furrowSpacing: 24,
    hasHayBales: true,
    hayBalePositions: [
      { x: 11850, y: 4680, angle: 0.1 },
      { x: 12280, y: 4920, angle: -0.3 },
      { x: 12750, y: 4740, angle: 0.4 },
      { x: 13220, y: 5020, angle: 0.2 },
      { x: 13540, y: 4820, angle: -0.5 },
      { x: 11980, y: 5650, angle: 0.6 },
      { x: 12480, y: 5880, angle: -0.15 },
      { x: 12960, y: 5760, angle: 0.3 },
      { x: 13420, y: 6040, angle: -0.4 }
    ],
    borderBermWidth: 16
  },
  // 5. Southern Undulating Pasture & Wildflower Meadow (Холмистое пастбище)
  {
    id: 'field_pasture_deep_south',
    name: 'Южные Холмистые Пастбища',
    type: 'pasture',
    bounds: { x: 1500, y: 11100, width: 6400, height: 1550 },
    furrowAngle: 0.1,
    furrowSpacing: 30,
    borderBermWidth: 18
  },
  // 6. Polynovka Western Arable Loam (Полыновская пашня)
  {
    id: 'field_west_plowed',
    name: 'Полыновские Угодья (Пахота)',
    type: 'plowed',
    bounds: { x: 8250, y: 2250, width: 1950, height: 1450 },
    furrowAngle: -0.32,
    furrowSpacing: 10,
    borderBermWidth: 14
  },
  // 7. South-West Agrarian Valley - Golden Rye (Юго-Западная рожь)
  {
    id: 'field_west_rye',
    name: 'Юго-Западная Нива (Озимая рожь)',
    type: 'wheat',
    bounds: { x: 250, y: 9120, width: 3650, height: 1700 },
    furrowAngle: 0.18,
    furrowSpacing: 14,
    hasTramlines: true,
    tramlineSpacing: 150,
    hasHayBales: true,
    hayBalePositions: [
      { x: 650, y: 9480, angle: 0.2 },
      { x: 1280, y: 9680, angle: -0.4 },
      { x: 1950, y: 9520, angle: 0.5 },
      { x: 2620, y: 9850, angle: -0.1 },
      { x: 3180, y: 9650, angle: 0.35 },
      { x: 1550, y: 10320, angle: -0.3 }
    ],
    borderBermWidth: 16
  },
  // 8. South-East Steppe Clover & Wildflower Meadow (Юго-Восточные луга)
  {
    id: 'field_west_meadow',
    name: 'Привокзальные Заливные Луга',
    type: 'clover',
    bounds: { x: 8200, y: 9150, width: 2350, height: 1750 },
    furrowAngle: 0.45,
    furrowSpacing: 22,
    borderBermWidth: 15
  }
];

// World roads cache for dynamic roadbed embankment heightmap calculation
interface RegisteredRoadSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  isDirt?: boolean;
  isGravel?: boolean;
  curvePoints?: { x: number; y: number }[];
  _minX?: number;
  _maxX?: number;
  _minY?: number;
  _maxY?: number;
}

let registeredRoads: RegisteredRoadSegment[] = [];
const ROAD_ELEV_CELL_SIZE = 500;
const registeredRoadsGrid = new Map<number, RegisteredRoadSegment[]>();

function getRoadElevGridKey(cx: number, cy: number): number {
  return ((cx & 0xffff) << 16) | (cy & 0xffff);
}

/**
 * Registers world roads to calculate realistic 3D roadbed embankments (земляное полотно / профиль насыпи)
 * elevated above the terrain on the heightmap.
 */
export function setWorldRoadsForElevation(roads: any[]): void {
  if (Array.isArray(roads)) {
    registeredRoads = roads;
    registeredRoadsGrid.clear();

    for (let r = 0; r < registeredRoads.length; r++) {
      const road = registeredRoads[r];
      const halfW = (road.width || 60) / 2;
      const searchMargin = halfW + 38;

      let minX = road._minX;
      let maxX = road._maxX;
      let minY = road._minY;
      let maxY = road._maxY;

      if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
        if (road.curvePoints && road.curvePoints.length > 0) {
          minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
          for (let k = 0; k < road.curvePoints.length; k++) {
            const pt = road.curvePoints[k];
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
          road._minX = minX = Math.min(road.x1 ?? 0, road.x2 ?? 0);
          road._maxX = maxX = Math.max(road.x1 ?? 0, road.x2 ?? 0);
          road._minY = minY = Math.min(road.y1 ?? 0, road.y2 ?? 0);
          road._maxY = maxY = Math.max(road.y1 ?? 0, road.y2 ?? 0);
        }
      }

      const minCx = Math.floor((minX - searchMargin) / ROAD_ELEV_CELL_SIZE);
      const maxCx = Math.floor((maxX + searchMargin) / ROAD_ELEV_CELL_SIZE);
      const minCy = Math.floor((minY - searchMargin) / ROAD_ELEV_CELL_SIZE);
      const maxCy = Math.floor((maxY + searchMargin) / ROAD_ELEV_CELL_SIZE);

      for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cy = minCy; cy <= maxCy; cy++) {
          const key = getRoadElevGridKey(cx, cy);
          let list = registeredRoadsGrid.get(key);
          if (!list) {
            list = [];
            registeredRoadsGrid.set(key, list);
          }
          list.push(road);
        }
      }
    }
  }
}

function getRoadbedEmbankmentOffset(x: number, y: number): number {
  if (registeredRoads.length === 0) {
    // Fallback: Analytical grid detection for standard city avenues and highways
    // East-West Steppe Highway (y = 4000, x: 8000..50000)
    if (x >= 7500 && x <= 50500 && Math.abs(y - 4000) <= 60) {
      const dist = Math.abs(y - 4000);
      const halfW = 42;
      if (dist <= halfW) {
        const crown = (1 - (dist / halfW) ** 2) * 0.25;
        return 0.95 + crown;
      }
      const t = 1 - (dist - halfW) / 18;
      return Math.max(0, 0.95 * t);
    }
    return 0;
  }

  const cx = Math.floor(x / ROAD_ELEV_CELL_SIZE);
  const cy = Math.floor(y / ROAD_ELEV_CELL_SIZE);
  const candidates = registeredRoadsGrid.get(getRoadElevGridKey(cx, cy));
  if (!candidates || candidates.length === 0) {
    return 0;
  }

  let maxEmbankment = 0;

  for (let r = 0; r < candidates.length; r++) {
    const road = candidates[r];
    const halfW = (road.width || 60) / 2;
    const searchMargin = halfW + 38;

    // Quick AABB check
    const minX = (road._minX ?? Math.min(road.x1, road.x2)) - searchMargin;
    const maxX = (road._maxX ?? Math.max(road.x1, road.x2)) + searchMargin;
    const minY = (road._minY ?? Math.min(road.y1, road.y2)) - searchMargin;
    const maxY = (road._maxY ?? Math.max(road.y1, road.y2)) + searchMargin;

    if (x < minX || x > maxX || y < minY || y > maxY) continue;

    if (road.curvePoints && road.curvePoints.length > 1) {
      // Sample distance to piecewise polyline
      const pts = road.curvePoints;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const segDx = p2.x - p1.x;
        const segDy = p2.y - p1.y;
        const segLenSq = segDx * segDx + segDy * segDy;
        if (segLenSq < 1) continue;
        const u = Math.max(0, Math.min(1, ((x - p1.x) * segDx + (y - p1.y) * segDy) / segLenSq));
        const projX = p1.x + u * segDx;
        const projY = p1.y + u * segDy;
        const dist = Math.hypot(x - projX, y - projY);

        if (dist <= halfW) {
          const crown = (1 - (dist / halfW) ** 2) * 0.25;
          const emb = 0.85 + crown;
          if (emb > maxEmbankment) maxEmbankment = emb;
        } else if (dist <= searchMargin) {
          const t = 1 - (dist - halfW) / (searchMargin - halfW);
          const emb = 0.85 * (t * t);
          if (emb > maxEmbankment) maxEmbankment = emb;
        }
      }
    } else if (typeof road.x1 === 'number' && typeof road.x2 === 'number') {
      const segDx = road.x2 - road.x1;
      const segDy = road.y2 - road.y1;
      const segLenSq = segDx * segDx + segDy * segDy;
      if (segLenSq < 1) continue;
      const u = Math.max(0, Math.min(1, ((x - road.x1) * segDx + (y - road.y1) * segDy) / segLenSq));
      const projX = road.x1 + u * segDx;
      const projY = road.y1 + u * segDy;
      const dist = Math.hypot(x - projX, y - projY);

      if (dist <= halfW) {
        const crown = (1 - (dist / halfW) ** 2) * 0.25;
        const emb = 0.85 + crown;
        if (emb > maxEmbankment) maxEmbankment = emb;
      } else if (dist <= searchMargin) {
        const t = 1 - (dist - halfW) / (searchMargin - halfW);
        const emb = 0.85 * (t * t);
        if (emb > maxEmbankment) maxEmbankment = emb;
      }
    }
  }

  return maxEmbankment;
}

// Smooth macro-topographic elevation without roadbed micro-bumps (used for artifact-free hillshading)
function getMacroTerrainElevation(x: number, y: number): number {
  // 1. Broad regional baseline elevation with smooth C1 continuous transitions (no cliff steps at y=3800 or x=8000)
  const urbanZ = 4.0 + Math.sin(x * 0.0006) * Math.cos(y * 0.0006) * 1.2;

  // Isotropic 2D rolling hills (strictly sin(ax)*cos(by) products — zero diagonal 1D stripes!)
  const w1 = Math.sin(x * 0.00085 + 0.4) * Math.cos(y * 0.00080 - 0.2) * 8.5;
  const w2 = Math.cos(x * 0.0014 - 0.6) * Math.sin(y * 0.0013 + 0.5) * 4.5;
  const countryZ = 9.0 + w1 + w2;

  // Smooth blend factor out of the leveled city core (x: 0..8000, y: 0..7900 including cottage settlement)
  const ux = x <= 7400 ? 0 : Math.min(1, (x - 7400) / 1200);
  const uy = y <= 7400 ? 0 : Math.min(1, (y - 7400) / 1200);
  const outsideCity = Math.max(ux, uy);
  // Smoothstep
  const smoothOut = outsideCity * outsideCity * (3 - 2 * outsideCity);

  let baseZ = urbanZ * (1 - smoothOut) + countryZ * smoothOut;

  // Vast Eastern Steppe & Highlands (smoothly blended as x > 8000)
  if (x > 7400) {
    const eastBlend = Math.min(1, (x - 7400) / 1400);
    const eb = eastBlend * eastBlend * (3 - 2 * eastBlend);
    let eastZ = countryZ;
    if (y < 2600) {
      const taigaGrad = Math.max(0, (2600 - y) / 2600);
      eastZ = 18.0 + taigaGrad * 36 + Math.sin(x * 0.0009) * Math.cos(y * 0.0008) * 10.0;
    } else if (y >= 7000 && y <= 12000 && x >= 13000 && x <= 42000) {
      const distFromCenter = Math.hypot((x - 27500) / 14500, (y - 8500) / 2500);
      eastZ = Math.max(1.8, 18 * (distFromCenter - 0.35));
    } else if (y >= 14000) {
      const canyonGrad = Math.min(1.0, (y - 14000) / 10000);
      eastZ = 14.0 + canyonGrad * 32 + Math.sin(x * 0.0007) * Math.cos(y * 0.0006) * 12.0;
    } else {
      eastZ = 12.0 + Math.sin(x * 0.0006) * Math.cos(y * 0.0007) * 11.0;
    }
    baseZ = baseZ * (1 - eb) + eastZ * eb;
  }

  // Carve riverbed valley depression along River "Быстрица"
  if (x >= -3500 && x <= 50500 && y <= -1800 && y >= -4200) {
    const river = getRiverWaterAt(x, y);
    const canyonValleyWidth = river.halfWidth + 480;
    if (river.distToCenter < canyonValleyWidth) {
      const tValley = 1 - (river.distToCenter / canyonValleyWidth);
      const cutDepth = Math.sin(tValley * Math.PI * 0.5) * 6.5;
      baseZ = Math.max(1.2, baseZ - cutDepth);
    }
  }

  // 2. Add contribution from landmark hills, kurgans, and ridges
  for (const hill of LANDMARK_HILLS) {
    const dx = x - hill.x;
    const dy = y - hill.y;

    let rx = dx;
    let ry = dy;
    if (hill.angle) {
      const cosA = Math.cos(-hill.angle);
      const sinA = Math.sin(-hill.angle);
      rx = dx * cosA - dy * sinA;
      ry = dx * sinA + dy * cosA;
    }

    const normDistSq = (rx / hill.radiusX) ** 2 + (ry / hill.radiusY) ** 2;
    if (normDistSq < 1.0) {
      const factor = (1 + Math.cos(Math.sqrt(normDistSq) * Math.PI)) * 0.5;
      baseZ += hill.height * factor;
    }
  }

  return Math.max(1.0, baseZ);
}

// Continuous mathematical elevation function Z(x, y)
export function getTerrainElevation(x: number, y: number): number {
  const baseZ = getMacroTerrainElevation(x, y);
  const roadbedOffset = getRoadbedEmbankmentOffset(x, y);
  return Math.max(1.0, baseZ + roadbedOffset);
}

// Computes slope gradient and hillshading illumination from smooth macro topography (no roadbed stripe artifacts)
// Light azimuth: NW (315 degrees, [-0.707, -0.707])
export function getTerrainSlope(x: number, y: number): TerrainSlope {
  const step = 24.0; // Wide 24px sampling delta for silky-smooth hillshading without chunk aliasing
  const z = getMacroTerrainElevation(x, y);
  const zR = getMacroTerrainElevation(x + step, y);
  const zL = getMacroTerrainElevation(x - step, y);
  const zD = getMacroTerrainElevation(x, y + step);
  const zU = getMacroTerrainElevation(x, y - step);

  const slopeX = (zR - zL) / (2 * step);
  const slopeY = (zD - zU) / (2 * step);
  const gradient = Math.hypot(slopeX, slopeY);

  // Cartographic hillshading: Light source vector L = (-0.707, -0.707, 1.0) normalized
  // Surface normal N = (-slopeX, -slopeY, 1.0) normalized
  const lightAzimuthX = -0.7071;
  const lightAzimuthY = -0.7071;
  const lightElevation = 1.0; // 45 deg altitude
  const lightLen = Math.hypot(lightAzimuthX, lightAzimuthY, lightElevation);
  const lx = lightAzimuthX / lightLen;
  const ly = lightAzimuthY / lightLen;
  const lz = lightElevation / lightLen;

  const normalLen = Math.hypot(-slopeX, -slopeY, 1.0);
  const nx = -slopeX / normalLen;
  const ny = -slopeY / normalLen;
  const nz = 1.0 / normalLen;

  // Dot product (cosine of incidence angle)
  const dot = nx * lx + ny * ly + nz * lz;
  
  // Neutral flat ground has dot ~ 0.707. Shade scale: -1 (deep shadow) to +1 (bright crest highlight)
  const shade = (dot - 0.7071) * 2.2;

  return {
    elevation: z,
    slopeX,
    slopeY,
    gradient,
    shade: Math.max(-1.0, Math.min(1.0, shade))
  };
}

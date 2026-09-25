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

// Defined realistic agricultural field plots in the countryside
export const AGRICULTURAL_FIELDS: AgriculturalField[] = [
  // 1. Great Plowed Arable Field (Пашня с черными бороздами)
  {
    id: 'field_plowed_north',
    name: 'Северная Пашня (Чернозём)',
    type: 'plowed',
    bounds: { x: 3950, y: 3950, width: 1450, height: 1100 },
    furrowAngle: 0.22, // Slight tilt for natural look
    furrowSpacing: 10,
    borderBermWidth: 14
  },
  // 2. Golden Wheat Field with Tramlines & Straw Rolls (Золотое пшеничное поле)
  {
    id: 'field_wheat_central',
    name: 'Золотая Нива (Озимая пшеница)',
    type: 'wheat',
    bounds: { x: 5600, y: 4000, width: 1800, height: 1250 },
    furrowAngle: -0.15,
    furrowSpacing: 14,
    hasTramlines: true,
    tramlineSpacing: 160,
    hasHayBales: true,
    hayBalePositions: [
      { x: 5850, y: 4250, angle: 0.3 },
      { x: 6150, y: 4400, angle: -0.2 },
      { x: 6480, y: 4200, angle: 0.7 },
      { x: 6800, y: 4500, angle: 0.1 },
      { x: 7100, y: 4300, angle: -0.4 },
      { x: 5950, y: 4750, angle: 0.5 },
      { x: 6350, y: 4900, angle: -0.1 },
      { x: 6720, y: 4820, angle: 0.25 },
      { x: 7180, y: 4950, angle: -0.6 }
    ],
    borderBermWidth: 16
  },
  // 3. Blooming Sunflower / Canola Field (Подсолнухи и рапс)
  {
    id: 'field_sunflower_south',
    name: 'Солнечное Поле (Подсолнечник)',
    type: 'sunflower',
    bounds: { x: 4000, y: 5300, width: 1350, height: 1300 },
    furrowAngle: 0.35,
    furrowSpacing: 18,
    hasTramlines: true,
    tramlineSpacing: 180,
    borderBermWidth: 14
  },
  // 4. Lush Clover / Alfalfa Hay Meadow (Люцерновый сенокос)
  {
    id: 'field_clover_east',
    name: 'Клеверный Сенокос (Люцерна)',
    type: 'clover',
    bounds: { x: 5550, y: 5450, width: 1950, height: 1400 },
    furrowAngle: -0.28,
    furrowSpacing: 24, // Wide mowed bands
    hasHayBales: true,
    hayBalePositions: [
      { x: 5750, y: 5650, angle: 0.1 },
      { x: 6100, y: 5850, angle: -0.3 },
      { x: 6450, y: 5680, angle: 0.4 },
      { x: 6850, y: 5900, angle: 0.2 },
      { x: 7200, y: 5720, angle: -0.5 },
      { x: 5880, y: 6300, angle: 0.6 },
      { x: 6300, y: 6450, angle: -0.15 },
      { x: 6750, y: 6380, angle: 0.3 },
      { x: 7150, y: 6520, angle: -0.4 }
    ],
    borderBermWidth: 16
  },
  // 5. Southern Undulating Pasture & Grassy Knolls (Холмистое пастбище)
  {
    id: 'field_pasture_deep_south',
    name: 'Южные Холмистые Пастбища',
    type: 'pasture',
    bounds: { x: 4100, y: 6850, width: 3400, height: 1200 },
    furrowAngle: 0.1,
    furrowSpacing: 30,
    borderBermWidth: 18
  },
  // 6. West Agricultural Buffer - Plowed Loam (Западная пашня)
  {
    id: 'field_west_plowed',
    name: 'Западные Угодья (Пахота)',
    type: 'plowed',
    bounds: { x: 250, y: 4100, width: 1450, height: 1400 },
    furrowAngle: -0.32,
    furrowSpacing: 10,
    borderBermWidth: 14
  },
  // 7. West Agricultural Buffer - Golden Rye (Западная рожь)
  {
    id: 'field_west_rye',
    name: 'Западная Нива (Озимая рожь)',
    type: 'wheat',
    bounds: { x: 300, y: 5700, width: 1400, height: 1600 },
    furrowAngle: 0.18,
    furrowSpacing: 14,
    hasTramlines: true,
    tramlineSpacing: 150,
    hasHayBales: true,
    hayBalePositions: [
      { x: 550, y: 5950, angle: 0.2 },
      { x: 880, y: 6150, angle: -0.4 },
      { x: 1250, y: 6020, angle: 0.5 },
      { x: 620, y: 6650, angle: -0.1 },
      { x: 980, y: 6850, angle: 0.35 },
      { x: 1350, y: 6720, angle: -0.3 }
    ],
    borderBermWidth: 16
  },
  // 8. West Rolling Meadow Pastures (Западные луга)
  {
    id: 'field_west_meadow',
    name: 'Прибрежные Заливные Луга',
    type: 'clover',
    bounds: { x: 1850, y: 4000, width: 1750, height: 3800 },
    furrowAngle: 0.45,
    furrowSpacing: 22,
    borderBermWidth: 15
  }
];

// Continuous mathematical elevation function Z(x, y)
export function getTerrainElevation(x: number, y: number): number {
  // 1. Broad regional baseline elevation
  let baseZ = 0;

  // In urban zone (x: 0..8000, y: 0..3800), ground is leveled and graded (~0-2m)
  const inUrbanZone = x >= 0 && x <= 8000 && y >= 0 && y <= 3800;
  if (inUrbanZone) {
    return Math.sin(x * 0.001) * Math.cos(y * 0.001) * 1.5;
  }

  // Countryside / Village / Meadows Zone (x: 0..8000, y: 3800..8200)
  if (x <= 8000 && y >= 3800) {
    // Gentle rolling harmonic waves creating natural undulating topography
    const w1 = Math.sin(x * 0.0018 + 0.4) * Math.cos(y * 0.0015 - 0.2) * 12.0;
    const w2 = Math.sin(x * 0.0035 + y * 0.0028) * 6.5;
    const w3 = Math.cos(x * 0.0009 - y * 0.0012) * 8.0;
    baseZ = 10 + w1 + w2 + w3;
  } 
  // Vast Eastern Steppe & Highlands (x >= 8000)
  else if (x > 8000) {
    if (y < 2600) {
      // Northern Taiga & Rocky Alpine Ridge (rises up to 45-80m)
      const taigaGrad = (2600 - y) / 2600;
      baseZ = 20 + taigaGrad * 45 + Math.sin(x * 0.0012) * 14.0;
    } else if (y >= 7000 && y <= 12000 && x >= 13000 && x <= 42000) {
      // Salt Lake Basin (low depression, gently sloping down to water level)
      const distFromCenter = Math.hypot((x - 27500) / 14500, (y - 8500) / 2500);
      baseZ = Math.max(1, 22 * (distFromCenter - 0.35));
    } else if (y >= 14000) {
      // Canyon & Dunes plateau with stepped terraces
      const canyonGrad = Math.min(1.0, (y - 14000) / 10000);
      baseZ = 15 + canyonGrad * 40 + Math.sin(x * 0.0008 + y * 0.0006) * 16.0;
    } else {
      // Broad undulating steppe plains
      baseZ = 14 + Math.sin(x * 0.0007) * 15.0 + Math.cos(y * 0.001) * 10.0;
    }
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
    
    // Rotate coordinates if hill has orientation angle
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
      // Smooth cosine bell-curve peak
      const factor = (1 + Math.cos(Math.sqrt(normDistSq) * Math.PI)) * 0.5;
      baseZ += hill.height * factor;
    }
  }

  return Math.max(0, baseZ);
}

// Computes slope gradient and hillshading illumination
// Light azimuth: NW (315 degrees, [-0.707, -0.707])
export function getTerrainSlope(x: number, y: number): TerrainSlope {
  const step = 8.0; // 8px sampling delta for smooth spatial gradient
  const z = getTerrainElevation(x, y);
  const zR = getTerrainElevation(x + step, y);
  const zL = getTerrainElevation(x - step, y);
  const zD = getTerrainElevation(x, y + step);
  const zU = getTerrainElevation(x, y - step);

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

// --- CONTINUOUS ECOLOGICAL BIOME SIMULATION & ECOTONE BLENDING SYSTEM ---
// First-principles geographic simulation: moisture gradients, elevation,
// organic ecotones (лесостепь, полупустыня), and continuous soil transitions.
// Eliminates artificial rectangular cuts; prioritizes deep authentic forest & woodland.

export interface BiomeSample {
  moisture: number;         // 0.0 (arid) to 1.0 (deep humid forest)
  forestWeight: number;     // Dense boreal / pine forest (0..1)
  woodlandWeight: number;   // Mixed woodland & forest-steppe edge (0..1)
  meadowWeight: number;     // Lush pastoral countryside & meadows (0..1)
  steppeWeight: number;     // Open golden-olive fescue steppe (0..1)
  clayWeight: number;       // Weathered sedimentary clay escarpment (0..1)
  saltWeight: number;       // Saline mineral basin (0..1)
  urbanWeight: number;      // Paved city core (0..1)
  industrialWeight: number; // Industrial concrete (0..1)
  baseColor: string;        // CSS rgb(r, g, b)
  r: number;
  g: number;
  b: number;
  surfaceType: 'grass' | 'dirt_road' | 'rock' | 'concrete' | 'mud' | 'sand';
  grip: number;
  extraDrag: number;
}

// Low-frequency continuous 2D isotropic noise for organic non-linear biome boundaries (zero planar stripes)
export function getOrganicBiomeNoise(x: number, y: number): number {
  const n1 = Math.sin(x * 0.00035 + 1.25) * Math.cos(y * 0.00031 - 0.85);
  const n2 = Math.cos(x * 0.00078 - 0.45) * Math.sin(y * 0.00084 + 0.65) * 0.52;
  const n3 = Math.sin(x * 0.0017 + 0.3) * Math.cos(y * 0.0015 - 0.4) * 0.25;
  return (n1 + n2 + n3) / 1.77; // Approx -1.0 to +1.0
}

// Smooth 2D isotropic patch variation for soil humus, clover cushions, and moss (strictly Nyquist-safe for 64x64 chunk sampling)
export function getSoilMicroNoise(x: number, y: number): number {
  const m1 = Math.sin(x * 0.0042 + 0.7) * Math.cos(y * 0.0038 - 0.3);
  const m2 = Math.cos(x * 0.0085 - 1.1) * Math.sin(y * 0.0079 + 0.9) * 0.55;
  const m3 = Math.sin(x * 0.014 + 2.1) * Math.cos(y * 0.015 - 1.4) * 0.30;
  return (m1 + m2 + m3) / 1.85;
}

// Color palette constants for seamless blending
const COLOR_DEEP_TAIGA = { r: 18, g: 68, b: 35 };      // #124423 - Deep pine & spruce moss base
const COLOR_PINE_RESERVE = { r: 16, g: 60, b: 32 };    // #103c20 - Ancient pine heartwood floor
const COLOR_MIXED_WOODLAND = { r: 24, g: 84, b: 42 };  // #18542a - Mixed birch/pine forest
const COLOR_FOREST_STEPPE = { r: 36, g: 112, b: 48 };  // #247030 - Forest edge & birch groves
const COLOR_PASTORAL_MEADOW = { r: 42, g: 126, b: 54 }; // #2a7e36 - Lush countryside grass
const COLOR_MEADOW_STEPPE = { r: 68, g: 128, b: 52 };  // #448034 - Transitional meadow-steppe
const COLOR_DRY_STEPPE = { r: 116, g: 142, b: 64 };    // #748e40 - Olive fescue & feather grass
const COLOR_ARID_TRANSITION = { r: 128, g: 132, b: 78 };// #80844e - Semi-arid steppe scrub & wormwood
const COLOR_CLAY_ESCARPMENT = { r: 122, g: 98, b: 76 }; // #7a624c - Weathered sedimentary clay & stone
const COLOR_SALT_BASIN = { r: 173, g: 185, b: 154 };   // #adb99a - Saline clay & mineral silt
const COLOR_URBAN_GROUND = { r: 34, g: 112, b: 48 };    // #227030 - Urban park & greenbelt turf base
const COLOR_INDUSTRIAL = { r: 34, g: 41, b: 52 };       // #222934 - Heavy industrial concrete

/**
 * Calculates continuous ecological moisture, biome weights, blended ground color,
 * and realistic surface physics properties for any coordinate (x, y) in the world.
 */
export function getBiomeSampleAt(x: number, y: number): BiomeSample {
  const noise = getOrganicBiomeNoise(x, y);

  // 1. Urban Zone Detection (City core around x: 3800..5600, y: 1600..3600)
  let urbanDist = 0;
  if (x >= 3700 && x <= 5600 && y >= 1600 && y <= 3700) {
    // Inside or near urban perimeter
    const dx = Math.max(0, Math.max(3900 - x, x - 5400));
    const dy = Math.max(0, Math.max(1800 - y, y - 3500));
    const distEdge = Math.hypot(dx, dy);
    urbanDist = Math.max(0, 1 - distEdge / 320);
  }

  // Industrial Zone Detection (x: 5600..8000, y: 0..3300)
  let indDist = 0;
  if (x >= 5600 && x <= 8000 && y >= 0 && y <= 3300) {
    const dx = Math.max(0, Math.max(5750 - x, x - 7850));
    const dy = Math.max(0, Math.max(150 - y, y - 3150));
    const distEdge = Math.hypot(dx, dy);
    indDist = Math.max(0, 1 - distEdge / 250);
  }

  // 2. Continuous Regional Moisture Gradient M(x, y)
  // Base latitude moisture profile
  let baseMoisture = 0.90;
  if (y < 2800) {
    // Vast northern forest & taiga zone
    baseMoisture = 0.96;
  } else if (y < 8200) {
    // Transitional forest-steppe, cottage settlement ("Сосновый Бор" / "Зелёный Рукав") and lush rural meadows
    const t = (y - 2800) / (8200 - 2800);
    baseMoisture = 0.92 - t * 0.20; // 0.92 down to 0.72 (keeps cottages and city outskirts lush green!)
  } else if (y < 14000) {
    // Rolling meadow-steppe down towards mineral lake
    const t = (y - 8200) / (14000 - 8200);
    baseMoisture = 0.72 - t * 0.36; // 0.72 down to 0.36
  } else {
    // Southern geological escarpment & badlands
    const t = Math.min(1.0, (y - 14000) / 9000);
    baseMoisture = 0.36 - t * 0.18; // 0.36 down to 0.18
  }

  // Western maritime/riverine forest boost & Cottage Settlement ("Сосновый Бор") green belt boost
  if (x < 4200) {
    const westBoost = Math.max(0, (4200 - x) / 4200) * 0.22;
    baseMoisture = Math.min(1.0, baseMoisture + westBoost);
  } else if (x >= 4200 && x <= 8100 && y >= 3200 && y <= 8200) {
    // Lush green pine-and-garden belt across the suburban cottage settlement
    baseMoisture = Math.max(baseMoisture, 0.78);
  }

  // Modulate moisture with organic continuous noise (+/- 0.11) so boundaries are naturally irregular
  const moisture = Math.max(0.05, Math.min(1.0, baseMoisture + noise * 0.11));

  // 3. Salt Lake Basin Detection (y: 7000..12000, x: 13000..42000)
  let saltWeight = 0;
  if (x >= 12000 && x <= 43000 && y >= 6800 && y <= 12200) {
    const dx = (x - 27500) / 14500;
    const dy = (y - 8500) / 2500;
    const distSq = dx * dx + dy * dy;
    if (distSq < 1.0) {
      saltWeight = Math.min(1.0, (1.0 - Math.sqrt(distSq)) * 1.8);
    }
  }

  // 4. Calculate Ecological Biome Weights from Continuous Moisture
  let forestWeight = 0;
  let woodlandWeight = 0;
  let meadowWeight = 0;
  let steppeWeight = 0;
  let clayWeight = 0;

  if (moisture >= 0.82) {
    forestWeight = (moisture - 0.82) / 0.18; // 0..1
    woodlandWeight = 1.0 - forestWeight;
  } else if (moisture >= 0.68) {
    const t = (moisture - 0.68) / (0.82 - 0.68);
    woodlandWeight = t;
    meadowWeight = 1.0 - t;
  } else if (moisture >= 0.52) {
    const t = (moisture - 0.52) / (0.68 - 0.52);
    meadowWeight = t;
    steppeWeight = 1.0 - t;
  } else if (moisture >= 0.35) {
    const t = (moisture - 0.35) / (0.52 - 0.35);
    steppeWeight = t;
    clayWeight = 1.0 - t;
  } else {
    clayWeight = 1.0;
  }

  // Suppress nature weights if inside urban or industrial zones
  const urbanWeight = urbanDist;
  const industrialWeight = indDist;
  const natureFactor = Math.max(0, 1.0 - Math.max(urbanWeight, industrialWeight));

  forestWeight *= natureFactor;
  woodlandWeight *= natureFactor;
  meadowWeight *= natureFactor;
  steppeWeight *= natureFactor;
  clayWeight *= natureFactor;
  saltWeight *= natureFactor;

  // 5. Continuous Color Blending (Linear RGB accumulation)
  let r = 0;
  let g = 0;
  let b = 0;

  // Natural terrain color contributions
  if (forestWeight > 0.001) {
    const isPineWest = (x < 3800 && y > 0 && y < 3800);
    const forestColor = isPineWest ? COLOR_PINE_RESERVE : COLOR_DEEP_TAIGA;
    r += forestColor.r * forestWeight;
    g += forestColor.g * forestWeight;
    b += forestColor.b * forestWeight;
  }

  if (woodlandWeight > 0.001) {
    const edgeRatio = Math.sin(x * 0.00085 + 0.4) * Math.cos(y * 0.00092 - 0.3) * 0.5 + 0.5;
    const wr = COLOR_MIXED_WOODLAND.r * (1 - edgeRatio) + COLOR_FOREST_STEPPE.r * edgeRatio;
    const wg = COLOR_MIXED_WOODLAND.g * (1 - edgeRatio) + COLOR_FOREST_STEPPE.g * edgeRatio;
    const wb = COLOR_MIXED_WOODLAND.b * (1 - edgeRatio) + COLOR_FOREST_STEPPE.b * edgeRatio;
    r += wr * woodlandWeight;
    g += wg * woodlandWeight;
    b += wb * woodlandWeight;
  }

  if (meadowWeight > 0.001) {
    r += COLOR_PASTORAL_MEADOW.r * meadowWeight;
    g += COLOR_PASTORAL_MEADOW.g * meadowWeight;
    b += COLOR_PASTORAL_MEADOW.b * meadowWeight;
  }

  if (steppeWeight > 0.001) {
    const sr = COLOR_MEADOW_STEPPE.r * 0.45 + COLOR_DRY_STEPPE.r * 0.55;
    const sg = COLOR_MEADOW_STEPPE.g * 0.45 + COLOR_DRY_STEPPE.g * 0.55;
    const sb = COLOR_MEADOW_STEPPE.b * 0.45 + COLOR_DRY_STEPPE.b * 0.55;
    r += sr * steppeWeight;
    g += sg * steppeWeight;
    b += sb * steppeWeight;
  }

  if (clayWeight > 0.001) {
    const cr = COLOR_ARID_TRANSITION.r * 0.3 + COLOR_CLAY_ESCARPMENT.r * 0.7;
    const cg = COLOR_ARID_TRANSITION.g * 0.3 + COLOR_CLAY_ESCARPMENT.g * 0.7;
    const cb = COLOR_ARID_TRANSITION.b * 0.3 + COLOR_CLAY_ESCARPMENT.b * 0.7;
    r += cr * clayWeight;
    g += cg * clayWeight;
    b += cb * clayWeight;
  }

  // Salt lake shore influence
  if (saltWeight > 0.001) {
    r = r * (1 - saltWeight) + COLOR_SALT_BASIN.r * saltWeight;
    g = g * (1 - saltWeight) + COLOR_SALT_BASIN.g * saltWeight;
    b = b * (1 - saltWeight) + COLOR_SALT_BASIN.b * saltWeight;
  }

  // Urban and Industrial core overrides
  if (urbanWeight > 0.001) {
    r = r * (1 - urbanWeight) + COLOR_URBAN_GROUND.r * urbanWeight;
    g = g * (1 - urbanWeight) + COLOR_URBAN_GROUND.g * urbanWeight;
    b = b * (1 - urbanWeight) + COLOR_URBAN_GROUND.b * urbanWeight;
  }

  if (industrialWeight > 0.001) {
    r = r * (1 - industrialWeight) + COLOR_INDUSTRIAL.r * industrialWeight;
    g = g * (1 - industrialWeight) + COLOR_INDUSTRIAL.g * industrialWeight;
    b = b * (1 - industrialWeight) + COLOR_INDUSTRIAL.b * industrialWeight;
  }

  // Multi-scale isotropic botanical & soil mottling in natural ground (clover patches, humus hollows, sun-warmed turf)
  if (natureFactor > 0.25) {
    const micro = getSoilMicroNoise(x, y);
    const patchBlob = Math.sin(x * 0.0028 + 0.5) * Math.cos(y * 0.0026 - 0.4);
    const microFactor = 1.0 + micro * 0.07;
    const redShift = patchBlob * 3.5 * (meadowWeight + steppeWeight);
    const greenShift = -patchBlob * 4.5 * (forestWeight + woodlandWeight + meadowWeight);
    r = Math.min(255, Math.max(0, Math.round(r * microFactor + redShift)));
    g = Math.min(255, Math.max(0, Math.round(g * microFactor + greenShift)));
    b = Math.min(255, Math.max(0, Math.round(b * microFactor)));
  } else {
    r = Math.min(255, Math.max(0, Math.round(r)));
    g = Math.min(255, Math.max(0, Math.round(g)));
    b = Math.min(255, Math.max(0, Math.round(b)));
  }

  // 6. Surface Physical Properties (Grip & Rolling Drag)
  let surfaceType: 'grass' | 'dirt_road' | 'rock' | 'concrete' | 'mud' | 'sand' = 'grass';
  let grip = 0.75;
  let extraDrag = 7;

  if (industrialWeight > 0.5 || urbanWeight > 0.6) {
    surfaceType = 'concrete';
    grip = 0.98;
    extraDrag = 0;
  } else if (saltWeight > 0.5) {
    surfaceType = 'mud';
    grip = 0.44;
    extraDrag = 38;
  } else if (clayWeight > 0.65) {
    // Compacted weathered clay & stone escarpment
    surfaceType = 'rock';
    grip = 0.78;
    extraDrag = 8;
  } else if (forestWeight > 0.4) {
    // Rich springy pine moss & needle humus
    surfaceType = 'grass';
    grip = 0.72;
    extraDrag = 8;
  } else if (woodlandWeight > 0.4 || meadowWeight > 0.4) {
    // Lush countryside grass
    surfaceType = 'grass';
    grip = 0.76;
    extraDrag = 7;
  } else if (steppeWeight > 0.4) {
    // Dry dense steppe sod (firm and fast)
    surfaceType = 'grass';
    grip = 0.78;
    extraDrag = 6;
  }

  return {
    moisture,
    forestWeight,
    woodlandWeight,
    meadowWeight,
    steppeWeight,
    clayWeight,
    saltWeight,
    urbanWeight,
    industrialWeight,
    baseColor: `rgb(${r}, ${g}, ${b})`,
    r,
    g,
    b,
    surfaceType,
    grip,
    extraDrag
  };
}

import fs from 'fs';
import path from 'path';

const mapPath = path.resolve('public/map.json');
const rawText = fs.readFileSync(mapPath, 'utf-8');
const map = JSON.parse(rawText);

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const VALID_PROP_TYPES = new Set([
  'bench',
  'lamp',
  'lamp_highway',
  'lamp_concrete',
  'hydrant',
  'trash_can',
  'bus_stop',
  'cone',
  'kiosk',
  'mailbox',
  'traffic_light',
  'dumpster',
  'flowerbed',
  'bollard',
  'manhole',
  'drain_grate',
  'tire_flowerbed',
  'playground_swing',
  'sandbox',
  'carpet_rack',
  'yard_rotunda',
  'garage_door',
  'village_well',
  'village_sign',
  'haystack',
  'woodpile',
  'rustic_car_wreck',
  'concrete_barrier',
  'concrete_fence_po2',
  'power_pole',
  'shipping_container',
  'pallet_stack',
  'industrial_tank',
  'silo_tank',
  'cable_spool',
  'security_barrier',
  'industrial_floodlight',
  'industrial_tires',
  'scrap_pile',
  'industrial_sign',
  'industrial_pipe',
  'industrial_gate',
  'fence_wood_vertical',
  'fence_metal_vertical',
  'wicket_gate',
  'cottage_gate',
  'garden_path_tile',
  'garage_sofa',
  'garage_workbench',
  'garage_dirt_pile',
  'garage_sand_pile',
  'garage_tires_heap',
  'garage_scrap_metal',
  'tarp_covered_car',
  'car_on_blocks',
  'oil_barrel_cluster',
  'garage_trash_heap',
  'railway_signal',
  'railway_buffer_stop',
  'railway_switch_box',
  'railway_crossing_light',
  'railway_crossing_gate',
  'railway_platform_sign',
  'railway_clock',
  'railway_catenary_mast',
  'railway_picket_post',
  'fallen_log',
  'tree_stump',
  'moss_boulder',
  'anthill'
]);

function getPropHalfExtents(type: string): { hw: number; hh: number } {
  switch (type) {
    case 'bench':
      return { hw: 11, hh: 5 };
    case 'dumpster':
      return { hw: 14, hh: 10 };
    case 'flowerbed':
      return { hw: 12, hh: 8 };
    case 'tire_flowerbed':
      return { hw: 8, hh: 8 };
    case 'playground_swing':
      return { hw: 12, hh: 8 };
    case 'sandbox':
      return { hw: 12, hh: 12 };
    case 'carpet_rack':
      return { hw: 12, hh: 4 };
    case 'yard_rotunda':
      return { hw: 15, hh: 15 };
    case 'garage_sofa':
      return { hw: 10, hh: 6 };
    case 'kiosk':
      return { hw: 13, hh: 13 };
    case 'concrete_fence_po2':
      return { hw: 19, hh: 6 };
    case 'tarp_covered_car':
      return { hw: 21, hh: 10 };
    case 'car_on_blocks':
      return { hw: 20, hh: 10 };
    case 'trash_can':
      return { hw: 4, hh: 4 };
    case 'lamp_concrete':
    case 'lamp':
      return { hw: 4.5, hh: 4.5 };
    case 'bollard':
      return { hw: 3, hh: 3 };
    case 'manhole':
    case 'drain_grate':
    case 'garden_path_tile':
      return { hw: 5, hh: 5 };
    default:
      return { hw: 6, hh: 6 };
  }
}

function getPropAABB(p: any): Rect {
  const { hw, hh } = getPropHalfExtents(p.type);
  const a = p.angle || 0;
  const cos = Math.abs(Math.cos(a));
  const sin = Math.abs(Math.sin(a));
  const rx = hw * cos + hh * sin;
  const ry = hw * sin + hh * cos;
  return { x: p.x - rx, y: p.y - ry, width: rx * 2, height: ry * 2 };
}

function pointInRect(px: number, py: number, r: Rect, margin = 0): boolean {
  return (
    px >= r.x - margin &&
    px <= r.x + r.width + margin &&
    py >= r.y - margin &&
    py <= r.y + r.height + margin
  );
}

function rectsOverlap(a: Rect, b: Rect, margin = 0): boolean {
  return (
    a.x < b.x + b.width + margin &&
    a.x + a.width > b.x - margin &&
    a.y < b.y + b.height + margin &&
    a.y + a.height > b.y - margin
  );
}

function rectsTouchOrOverlap(a: Rect, b: Rect, tolerance = 2): boolean {
  const ix1 = Math.max(a.x - tolerance, b.x - tolerance);
  const iy1 = Math.max(a.y - tolerance, b.y - tolerance);
  const ix2 = Math.min(a.x + a.width + tolerance, b.x + b.width + tolerance);
  const iy2 = Math.min(a.y + a.height + tolerance, b.y + b.height + tolerance);
  return ix2 >= ix1 && iy2 >= iy1 && (ix2 - ix1 >= 12 || iy2 - iy1 >= 12);
}

function circleIntersectsRect(cx: number, cy: number, cr: number, r: Rect): boolean {
  const closestX = Math.max(r.x, Math.min(cx, r.x + r.width));
  const closestY = Math.max(r.y, Math.min(cy, r.y + r.height));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

const filterIds = process.argv.slice(2);
let totalWarnings = 0;

for (const sw of map.sidewalks || []) {
  if (filterIds.length > 0 && !filterIds.includes(sw.id)) continue;

  const bx1 = sw.x;
  const by1 = sw.y;
  const bx2 = sw.x + sw.width;
  const by2 = sw.y + sw.height;
  const swW = sw.sidewalkWidth || 32;
  const innerRect: Rect = {
    x: bx1 + swW,
    y: by1 + swW,
    width: sw.width - swW * 2,
    height: sw.height - swW * 2
  };

  const blds = (map.buildings || []).filter((b: any) => {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    return cx >= bx1 && cx <= bx2 && cy >= by1 && cy <= by2;
  });

  const isRes = blds.some(
    (b: any) =>
      ['residential', 'panel_apartment', 'brick_residential', 'modern_residential'].includes(b.type) ||
      b.id.startsWith('court_bld')
  );
  if (!isRes) continue;

  const pks = (map.parkings || []).filter((p: any) => {
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    return cx >= bx1 - 20 && cx <= bx2 + 20 && cy >= by1 - 20 && cy <= by2 + 20;
  });

  const dws = (map.driveways || []).filter((d: any) => {
    const cx = d.x + d.width / 2;
    const cy = d.y + d.height / 2;
    return cx >= bx1 - 30 && cx <= bx2 + 30 && cy >= by1 - 30 && cy <= by2 + 30;
  });

  const props = (map.props || []).filter((p: any) => p.x >= bx1 && p.x <= bx2 && p.y >= by1 && p.y <= by2);
  const innerProps = props.filter((p: any) => pointInRect(p.x, p.y, innerRect, -2));
  const trees = (map.trees || []).filter((t: any) => t.x >= bx1 && t.x <= bx2 && t.y >= by1 && t.y <= by2);

  const warnings: string[] = [];
  const walkways: (Rect & { style?: string })[] = sw.walkways || [];
  const plazas: (Rect & { style?: string })[] = sw.plazas || [];
  const pedWalkways = walkways.filter((w) => w.style !== 'asphalt');
  const pavedAreas: Rect[] = [...walkways, ...plazas, ...pks, ...dws];

  // 1. Check walkways and plazas overlapping buildings
  for (const w of walkways) {
    for (const b of blds) {
      if (rectsOverlap(w, b, -1)) {
        warnings.push(`WALKWAY_IN_BLD: walkway [${w.x},${w.y} ${w.width}x${w.height}] overlaps building ${b.id} [${b.x},${b.y} ${b.width}x${b.height}]`);
      }
    }
  }
  for (const pl of plazas) {
    for (const b of blds) {
      if (rectsOverlap(pl, b, 2)) {
        warnings.push(`PLAZA_IN_BLD: plaza [${pl.x},${pl.y} ${pl.width}x${pl.height}] overlaps/touches building ${b.id}`);
      }
    }
  }

  // 2. Check every building entrance has a connected walkway and no blocking props
  const entranceClearZones: { bldId: string; num: number; rect: Rect }[] = [];
  for (const b of blds) {
    for (const ent of b.entrances || []) {
      const ratio = ent.offsetRatio ?? 0.5;
      let doorX = 0;
      let doorY = 0;
      let clearRect: Rect;
      let porchTouchRect: Rect;

      if (ent.side === 'south') {
        doorX = Math.round(b.x + b.width * ratio);
        doorY = b.y + b.height;
        porchTouchRect = { x: doorX - 10, y: doorY, width: 20, height: 16 };
        clearRect = { x: doorX - 16, y: doorY, width: 32, height: 32 };
      } else if (ent.side === 'north') {
        doorX = Math.round(b.x + b.width * ratio);
        doorY = b.y;
        porchTouchRect = { x: doorX - 10, y: doorY - 16, width: 20, height: 16 };
        clearRect = { x: doorX - 16, y: doorY - 32, width: 32, height: 32 };
      } else if (ent.side === 'east') {
        doorX = b.x + b.width;
        doorY = Math.round(b.y + b.height * ratio);
        porchTouchRect = { x: doorX, y: doorY - 10, width: 16, height: 20 };
        clearRect = { x: doorX, y: doorY - 16, width: 32, height: 32 };
      } else {
        doorX = b.x;
        doorY = Math.round(b.y + b.height * ratio);
        porchTouchRect = { x: doorX - 16, y: doorY - 10, width: 16, height: 20 };
        clearRect = { x: doorX - 32, y: doorY - 16, width: 32, height: 32 };
      }

      entranceClearZones.push({ bldId: b.id, num: ent.number || 1, rect: clearRect });

      const hasConnectedWalkway = pedWalkways.some((w) => {
        if (!rectsOverlap(w, porchTouchRect, 2)) return false;
        if (ent.side === 'south' || ent.side === 'north') {
          const wCenterX = w.x + w.width / 2;
          return Math.abs(wCenterX - doorX) <= 6 && w.width <= 32;
        } else {
          const wCenterY = w.y + w.height / 2;
          return Math.abs(wCenterY - doorY) <= 6 && w.height <= 32;
        }
      });

      if (!hasConnectedWalkway) {
        warnings.push(`ENTRANCE_NO_WALKWAY: ${b.id} entrance #${ent.number || 1} (${ent.side} at ${doorX},${doorY}) has no centered walkway connected to it`);
      }
    }
  }

  // 3. Check every plaza is connected to at least one pedestrian walkway, and not cut through by a walkway
  for (const pl of plazas) {
    const connected = pedWalkways.some((w) => rectsTouchOrOverlap(pl, w, 2));
    if (!connected) {
      warnings.push(`DISCONNECTED_PLAZA: plaza [${pl.x},${pl.y} ${pl.width}x${pl.height}] has no walkway connected to it`);
    }
    for (const w of walkways) {
      const ix1 = Math.max(w.x, pl.x);
      const iy1 = Math.max(w.y, pl.y);
      const ix2 = Math.min(w.x + w.width, pl.x + pl.width);
      const iy2 = Math.min(w.y + w.height, pl.y + pl.height);
      if (ix2 - ix1 > 6 && iy2 - iy1 > 6) {
        warnings.push(
          `WALKWAY_CUTS_PLAZA: walkway [${w.x},${w.y} ${w.width}x${w.height}] overlaps interior of plaza [${pl.x},${pl.y} ${pl.width}x${pl.height}]`
        );
      }
    }
  }

  // 4. Check trees
  if (trees.length < 4) {
    warnings.push(`LOW_TREES: Only ${trees.length} trees in residential block (recommend >= 4)`);
  }
  for (const t of trees) {
    if (t.type === 'dead') {
      warnings.push(`DEAD_TREE: ${t.id} at (${t.x},${t.y}) is 'dead' in a residential courtyard`);
    }
    for (const b of blds) {
      if (circleIntersectsRect(t.x, t.y, Math.max(8, t.radius * 0.65), b)) {
        warnings.push(`TREE_IN_BLD: ${t.id} (${t.x},${t.y} r=${t.radius}) overlaps building ${b.id}`);
      }
    }
    for (const w of walkways) {
      if (circleIntersectsRect(t.x, t.y, Math.max(6, t.radius * 0.55), w)) {
        warnings.push(`TREE_ON_WALKWAY: ${t.id} (${t.x},${t.y} r=${t.radius}) overlaps walkway [${w.x},${w.y} ${w.width}x${w.height}]`);
      }
    }
    for (const p of plazas) {
      if (circleIntersectsRect(t.x, t.y, Math.max(8, t.radius * 0.7), p)) {
        warnings.push(`TREE_ON_PLAZA: ${t.id} (${t.x},${t.y} r=${t.radius}) canopy overlaps plaza [${p.x},${p.y} ${p.width}x${p.height}]`);
      }
    }
    for (const pk of pks) {
      if (circleIntersectsRect(t.x, t.y, Math.max(6, t.radius * 0.6), pk)) {
        warnings.push(`TREE_ON_PARKING: ${t.id} (${t.x},${t.y} r=${t.radius}) overlaps parking ${pk.id}`);
      }
    }
  }

  // 5. Check props: valid type, not in building, not blocking entrance, not on walkway, not overlapping other props
  const plazaRequiredTypes = new Set(['playground_swing', 'sandbox', 'yard_rotunda', 'carpet_rack', 'kiosk', 'garage_sofa']);
  for (let i = 0; i < innerProps.length; i++) {
    const p = innerProps[i];
    if (!VALID_PROP_TYPES.has(p.type)) {
      warnings.push(`INVALID_PROP_TYPE: ${p.id} has non-existent type '${p.type}'`);
    }
    const pBox = getPropAABB(p);

    for (const b of blds) {
      if (rectsOverlap(pBox, b, 2)) {
        warnings.push(`PROP_IN_BLD: ${p.id} (${p.type} at ${p.x},${p.y}) overlaps building ${b.id}`);
      }
    }

    for (const ez of entranceClearZones) {
      if (rectsOverlap(pBox, ez.rect, 0)) {
        warnings.push(`PROP_BLOCKS_ENTRANCE: ${p.id} (${p.type} at ${p.x},${p.y}) blocks exit of ${ez.bldId} entrance #${ez.num}`);
      }
    }

    if (p.type !== 'manhole' && p.type !== 'drain_grate' && p.type !== 'garden_path_tile') {
      for (const w of pedWalkways) {
        if (rectsOverlap(pBox, w, 1)) {
          warnings.push(`PROP_ON_WALKWAY: ${p.id} (${p.type} at ${p.x},${p.y}) overlaps pedestrian walkway [${w.x},${w.y} ${w.width}x${w.height}]`);
        }
      }
      for (const dw of dws) {
        if (rectsOverlap(pBox, dw, 1)) {
          warnings.push(`PROP_ON_DRIVEWAY: ${p.id} (${p.type} at ${p.x},${p.y}) sits on driveway ${dw.id}`);
        }
      }
    }

    if (p.type === 'dumpster') {
      const onPaved = pavedAreas.some((r) => pointInRect(p.x, p.y, r, -6));
      if (!onPaved) {
        warnings.push(`DUMPSTER_ON_GRASS: ${p.id} (${p.x},${p.y}) is not fully inside a paved pad`);
      }
    }

    if (plazaRequiredTypes.has(p.type)) {
      const insidePlaza = plazas.some(
        (pl) =>
          pBox.x >= pl.x + 2 &&
          pBox.y >= pl.y + 2 &&
          pBox.x + pBox.width <= pl.x + pl.width - 2 &&
          pBox.y + pBox.height <= pl.y + pl.height - 2
      );
      if (!insidePlaza) {
        warnings.push(`PROP_HANGS_OFF_PLAZA: ${p.id} (${p.type} at ${p.x},${p.y}) is not fully inside a plaza`);
      }
    }

    // Pairwise prop overlap check
    for (let j = i + 1; j < innerProps.length; j++) {
      const q = innerProps[j];
      const qBox = getPropAABB(q);
      if (rectsOverlap(pBox, qBox, 3)) {
        warnings.push(
          `PROP_OVERLAP_PROP: ${p.id} (${p.type} at ${p.x},${p.y}) and ${q.id} (${q.type} at ${q.x},${q.y}) overlap or are too close`
        );
      }
    }
  }

  // 6. Check empty plazas (plazas with < 2 props)
  for (const pl of plazas) {
    const propsInPlaza = innerProps.filter((p: any) => pointInRect(p.x, p.y, pl, 4));
    if (propsInPlaza.length < 2) {
      warnings.push(`EMPTY_PLAZA: plaza [${pl.x},${pl.y} ${pl.width}x${pl.height}] has only ${propsInPlaza.length} props`);
    }
  }

  // 7. Check huge concrete/tile slabs
  const innerArea = innerRect.width * innerRect.height;
  for (const w of walkways) {
    if (w.width * w.height > innerArea * 0.25) {
      warnings.push(`GIANT_WALKWAY_SLAB: walkway [${w.x},${w.y} ${w.width}x${w.height}] covers huge area`);
    }
  }
  for (const p of plazas) {
    if (p.width * p.height > innerArea * 0.22) {
      warnings.push(`GIANT_PLAZA_SLAB: plaza [${p.x},${p.y} ${p.width}x${p.height}] covers huge area`);
    }
  }

  totalWarnings += warnings.length;
  const propCounts: Record<string, number> = {};
  for (const p of innerProps) propCounts[p.type] = (propCounts[p.type] || 0) + 1;

  console.log(
    `\n=== ${sw.id} [${sw.x},${sw.y} ${sw.width}x${sw.height}] | Trees:${trees.length} | InnerProps:${innerProps.length} | Warnings:${warnings.length} ===`
  );
  for (const w of warnings) {
    console.log(`  [WARN] ${w}`);
  }
}

console.log(`\nTotal warnings across inspected residential courtyards: ${totalWarnings}`);

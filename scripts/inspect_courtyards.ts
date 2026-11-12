import fs from 'fs';
import path from 'path';

const mapPath = path.resolve('public/map.json');
const rawText = fs.readFileSync(mapPath, 'utf-8');
const map = JSON.parse(rawText);

const lines = rawText.split('\n');
const idLineMap = new Map<string, number>();
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/"id":\s*"([^"]+)"/);
  if (m && !idLineMap.has(m[1])) {
    idLineMap.set(m[1], i + 1);
  }
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function pointInRect(px: number, py: number, r: Rect, margin = 0): boolean {
  return (
    px >= r.x - margin &&
    px <= r.x + r.width + margin &&
    py >= r.y - margin &&
    py <= r.y + r.height + margin
  );
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

  const props = (map.props || []).filter((p: any) => {
    return p.x >= bx1 && p.x <= bx2 && p.y >= by1 && p.y <= by2;
  });

  const innerProps = props.filter((p: any) => {
    return (
      p.x >= bx1 + sw.sidewalkWidth &&
      p.x <= bx2 - sw.sidewalkWidth &&
      p.y >= by1 + sw.sidewalkWidth &&
      p.y <= by2 - sw.sidewalkWidth
    );
  });

  const trees = (map.trees || []).filter((t: any) => {
    return t.x >= bx1 && t.x <= bx2 && t.y >= by1 && t.y <= by2;
  });

  const warnings: string[] = [];
  const walkways: Rect[] = sw.walkways || [];
  const plazas: Rect[] = sw.plazas || [];
  const pavedAreas: Rect[] = [...walkways, ...plazas, ...pks, ...dws];

  // 1. Check trees overlapping buildings or paved areas
  if (trees.length < 3) {
    warnings.push(`LOW_TREES: Only ${trees.length} trees in residential block (recommend >= 4)`);
  }
  for (const t of trees) {
    if (t.type === 'dead') {
      warnings.push(`DEAD_TREE: ${t.id} at (${t.x},${t.y}) is 'dead' in a residential courtyard`);
    }
    for (const b of blds) {
      if (circleIntersectsRect(t.x, t.y, Math.max(4, t.radius * 0.45), b)) {
        warnings.push(`TREE_IN_BLD: ${t.id} (${t.x},${t.y} r=${t.radius}) overlaps building ${b.id}`);
      }
    }
    for (const w of walkways) {
      if (pointInRect(t.x, t.y, w, 2)) {
        warnings.push(`TREE_ON_WALKWAY: ${t.id} (${t.x},${t.y}) trunk sits on walkway [${w.x},${w.y} ${w.width}x${w.height}]`);
      }
    }
    for (const p of plazas) {
      if (pointInRect(t.x, t.y, p, 2)) {
        warnings.push(`TREE_ON_PLAZA: ${t.id} (${t.x},${t.y}) trunk sits on plaza [${p.x},${p.y} ${p.width}x${p.height}]`);
      }
    }
    for (const pk of pks) {
      if (pointInRect(t.x, t.y, pk, 4)) {
        warnings.push(`TREE_ON_PARKING: ${t.id} (${t.x},${t.y}) trunk sits on parking ${pk.id}`);
      }
    }
  }

  // 2. Check props overlapping buildings, and dumpsters on bare grass
  for (const p of innerProps) {
    for (const b of blds) {
      if (pointInRect(p.x, p.y, b, 2)) {
        warnings.push(`PROP_IN_BLD: ${p.id} (${p.type} at ${p.x},${p.y}) inside building ${b.id}`);
      }
    }
    if (p.type === 'dumpster') {
      const onPaved = pavedAreas.some((r) => pointInRect(p.x, p.y, r, 4));
      if (!onPaved) {
        warnings.push(`DUMPSTER_ON_GRASS: ${p.id} (${p.x},${p.y}) is on bare grass without a paved pad`);
      }
    }
  }

  // 3. Check huge concrete/tile slabs covering >65% of inner lawn
  const innerArea = (sw.width - sw.sidewalkWidth * 2) * (sw.height - sw.sidewalkWidth * 2);
  for (const w of walkways) {
    if (w.width * w.height > innerArea * 0.3) {
      warnings.push(`GIANT_WALKWAY_SLAB: walkway [${w.x},${w.y} ${w.width}x${w.height}] covers huge area`);
    }
  }
  for (const p of plazas) {
    if (p.width * p.height > innerArea * 0.25) {
      warnings.push(`GIANT_PLAZA_SLAB: plaza [${p.x},${p.y} ${p.width}x${p.height}] covers huge area`);
    }
  }

  // 4. Check asphalt walkway cutting through a tile/stone plaza
  for (const w of walkways) {
    for (const p of plazas) {
      const ix1 = Math.max(w.x, p.x);
      const iy1 = Math.max(w.y, p.y);
      const ix2 = Math.min(w.x + w.width, p.x + p.width);
      const iy2 = Math.min(w.y + w.height, p.y + p.height);
      if (ix2 - ix1 > 10 && iy2 - iy1 > 10 && (w as any).style !== (p as any).style) {
        warnings.push(
          `WALKWAY_CUTS_PLAZA: ${(w as any).style} walkway [${w.x},${w.y} ${w.width}x${w.height}] overlaps ${(p as any).style} plaza [${p.x},${p.y} ${p.width}x${p.height}]`
        );
      }
    }
  }

  totalWarnings += warnings.length;
  const propCounts: Record<string, number> = {};
  for (const p of innerProps) propCounts[p.type] = (propCounts[p.type] || 0) + 1;

  const firstPropLine = innerProps.length ? idLineMap.get(innerProps[0].id) : 'none';
  const lastPropLine = innerProps.length ? idLineMap.get(innerProps[innerProps.length - 1].id) : 'none';
  const firstTreeLine = trees.length ? idLineMap.get(trees[0].id) : 'none';
  const lastTreeLine = trees.length ? idLineMap.get(trees[trees.length - 1].id) : 'none';

  console.log(
    `\n=== ${sw.id} (L:${idLineMap.get(sw.id)}) [${sw.x},${sw.y} ${sw.width}x${sw.height}] | Trees:${trees.length} (L:${firstTreeLine}..${lastTreeLine}) | InnerProps:${innerProps.length} (L:${firstPropLine}..${lastPropLine}) | Warnings:${warnings.length} ===`
  );
  for (const b of blds) {
    console.log(
      `  BLD: ${b.id} (${b.type}, ${b.floorsCount}fl) [${b.x},${b.y} ${b.width}x${b.height}] entrances=${JSON.stringify(b.entrances)}`
    );
  }
  for (const pk of pks) {
    console.log(`  PK: ${pk.id} [${pk.x},${pk.y} ${pk.width}x${pk.height}] spots=${pk.spots?.length || 0}`);
  }
  console.log(`  Props summary: ${JSON.stringify(propCounts)}`);
  for (const w of warnings) {
    console.log(`  [WARN] ${w}`);
  }
}

console.log(`\nTotal warnings across inspected residential courtyards: ${totalWarnings}`);

/**
 * Сопоставление вершин контура кузова (basePoly) с узлами деформации.
 *
 * Генератор сетки (bodyMeshGenerator.ts / densifyClosedPerimeter) строит кольцо «кожи»
 * (первые perimeterCount узлов) из угловых вершин контура + середин каждого ребра (>= 1.8 px).
 * Чтобы рендер не выбрасывал половину физических узлов периметра (середины дверей, крыльев,
 * капота и бамперов), базовый полигон перед сопоставлением уплотняется теми же серединами рёбер.
 */
export function densifyBasePolyForSoftbody<T extends { localX: number; localY: number }>(
  rawBasePoly: { x: number; y: number }[],
  dvs: T[],
  perimeterCount: number
): { x: number; y: number }[] {
  const n = perimeterCount > 0 ? Math.min(dvs.length, perimeterCount) : dvs.length;
  if (n <= rawBasePoly.length || rawBasePoly.length < 3) {
    return rawBasePoly;
  }

  const findNearest = (pt: { x: number; y: number }): T => {
    let best = dvs[0];
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = dvs[i];
      if (!d) continue;
      const dx = d.localX - pt.x;
      const dy = d.localY - pt.y;
      const dd = dx * dx + dy * dy;
      if (dd < bestD) {
        bestD = dd;
        best = d;
      }
    }
    return best;
  };

  const densePoly: { x: number; y: number }[] = [];
  const m = rawBasePoly.length;
  for (let i = 0; i < m; i++) {
    const a = rawBasePoly[i];
    const b = rawBasePoly[(i + 1) % m];
    densePoly.push(a);
    if (Math.hypot(b.x - a.x, b.y - a.y) >= 1.8) {
      const mid = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
      const bestA = findNearest(a);
      const bestB = findNearest(b);
      const bestMid = findNearest(mid);
      if (bestMid !== bestA && bestMid !== bestB) {
        densePoly.push(mid);
      }
    }
  }
  return densePoly;
}

export function mapPolyToDeformVerts<T extends { localX: number; localY: number }>(
  basePoly: { x: number; y: number }[],
  dvs: T[],
  perimeterCount: number
): T[] {
  const n = perimeterCount > 0 ? Math.min(dvs.length, perimeterCount) : dvs.length;
  return basePoly.map(bv => {
    let best = dvs[0];
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = dvs[i];
      if (!d) continue;
      const dx = d.localX - bv.x;
      const dy = d.localY - bv.y;
      const dd = dx * dx + dy * dy;
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best;
  });
}

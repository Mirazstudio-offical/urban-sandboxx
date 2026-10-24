/**
 * Сопоставление вершин контура кузова (basePoly) с узлами деформации.
 *
 * Раньше контур сопоставлялся с узлами по индексу (вершина k ↔ узел k). Это работало, пока
 * периметр был 16 узлов в том же порядке, что и контур. После вставки середин (плотная сетка)
 * индексы сместились: вершина контура попадала на середину или на соседний угол. Теперь
 * каждая вершина контура берёт ближайший узел периметра по исходным координатам.
 */
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

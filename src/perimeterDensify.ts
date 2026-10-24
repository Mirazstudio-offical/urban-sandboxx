import type { NodeTemplate, BeamTemplate, VehicleNodeBeamDefinition } from './types';

/**
 * Плотная сетка кузова: между соседними узлами замкнутого периметра вставляются середины.
 *
 * Новый порядок: периметр i -> 2i, середина сегмента (i, i+1) -> 2i+1, интерьер j -> j + N.
 * - кольцевая балка делится на две последовательные; жёсткость ×2 (сохраняет жёсткость материала),
 *   пределы yield/break ×0.5 (деформация приходится на половину длины);
 * - интерьерные балки от концов сегмента дублируются на середину с жёсткостью ×0.5;
 * - масса: середина получает четверть суммы масс концов, концы отдают по половине (сумма сохраняется).
 *
 * Открытые периметры (мотоцикл, прицеп) не трогаются: у них нет замкнутого кольца балок.
 */
export function densifyClosedPerimeter(def: VehicleNodeBeamDefinition): VehicleNodeBeamDefinition {
  const N = def.perimeterCount;
  const next = (i: number) => (i + 1) % N;
  const isRing = (a: number, b: number) =>
    a < N && b < N && (Math.abs(a - b) === 1 || Math.abs(a - b) === N - 1);

  // Проверка замкнутости: каждый сегмент периметра должен иметь кольцевую балку
  for (let i = 0; i < N; i++) {
    const j = next(i);
    if (!def.beams.some(b => isRing(b.nodeA, b.nodeB) && (b.nodeA === i || b.nodeB === i) && (b.nodeA === j || b.nodeB === j))) {
      return def;
    }
  }

  const newIdOf = (j: number) => (j < N ? 2 * j : j + N);
  const midId = (i: number) => 2 * i + 1;
  const oldPer = def.nodes.slice(0, N);
  const interior = def.nodes.slice(N);

  const mm = oldPer.map((n, i) => 0.25 * (n.massFrac + oldPer[next(i)].massFrac));
  const newNodes: NodeTemplate[] = [];
  for (let i = 0; i < N; i++) {
    const a = oldPer[i];
    const loss = 0.5 * (mm[(i - 1 + N) % N] + mm[i]);
    newNodes.push({ ...a, id: 2 * i, massFrac: a.massFrac - loss });
    const b = oldPer[next(i)];
    newNodes.push({
      id: midId(i), xFrac: (a.xFrac + b.xFrac) / 2, yFrac: (a.yFrac + b.yFrac) / 2,
      group: a.group, massFrac: mm[i], name: `Mid ${i}-${next(i)}`
    });
  }
  for (const n of interior) newNodes.push({ ...n, id: n.id + N });

  const beams: BeamTemplate[] = [];
  for (const bm of def.beams) {
    const A = bm.nodeA, B = bm.nodeB;
    if (isRing(A, B)) {
      const i = B === next(A) ? A : B; // сегмент i -> next(i)
      const m = midId(i);
      const k = bm.spring ?? 2800;
      const yieldH = bm.yieldDist !== undefined ? bm.yieldDist * 0.5 : undefined;
      const breakH = bm.breakDist !== undefined ? bm.breakDist * 0.5 : undefined;
      beams.push({ ...bm, nodeA: 2 * i, nodeB: m, spring: k * 2, yieldDist: yieldH, breakDist: breakH });
      beams.push({ ...bm, nodeA: m, nodeB: 2 * next(i), spring: k * 2, yieldDist: yieldH, breakDist: breakH });
      continue;
    }
    beams.push({ ...bm, nodeA: newIdOf(A), nodeB: newIdOf(B) });
    if (A < N && B >= N) {
      for (const m of [midId((A - 1 + N) % N), midId(A)]) {
        beams.push({ ...bm, nodeA: m, nodeB: newIdOf(B), spring: (bm.spring ?? 2800) * 0.5 });
      }
    }
    if (B < N && A >= N) {
      for (const m of [midId((B - 1 + N) % N), midId(B)]) {
        beams.push({ ...bm, nodeA: newIdOf(A), nodeB: m, spring: (bm.spring ?? 2800) * 0.5 });
      }
    }
  }

  let tracking = def.tracking;
  if (tracking) {
    const tr: any = { ...tracking };
    for (const key of Object.keys(tr)) {
      const v = tr[key];
      if (Array.isArray(v)) tr[key] = v.map((id: number) => newIdOf(id));
      else if (typeof v === 'number') tr[key] = newIdOf(v);
    }
    tracking = tr;
  }

  return { ...def, perimeterCount: 2 * N, nodes: newNodes, beams, tracking };
}

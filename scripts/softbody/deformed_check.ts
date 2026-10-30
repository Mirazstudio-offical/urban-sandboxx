/**
 * Проверка деформированной сетки: сколько пар балок пересекаются в каждом кадре краш-теста
 * и сколько связей растянуто сверх предела (признак «связи через кузов»).
 * Запуск: npx tsx scripts/softbody/deformed_check.ts [путь_к_src]
 *   по умолчанию — текущий src; для сравнения — CRASH_SRC=<копия старого src>.
 */
import * as h from '../crashTests/harness';

type V2 = { x: number; y: number };
const cross = (o: V2, a: V2, b: V2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
function proper(p1: V2, p2: V2, q1: V2, q2: V2): boolean {
  const d1 = cross(p1, p2, q1), d2 = cross(p1, p2, q2), d3 = cross(q1, q2, p1), d4 = cross(q1, q2, p2);
  return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
}

interface Scen { name: string; vehicles: any[]; walls?: any[]; props?: any[]; maxTime?: number }
const scen: Scen[] = [
  { name: 'sedan_wall_50', vehicles: [h.makeVehicle('sedan', 0, 0, 0, 50)], walls: [h.makeWall('w', 60, -400, 400, 800)] },
  { name: 'sedan_wall_30_oblique', vehicles: [h.makeVehicle('sedan', 0, 0, Math.PI / 6, 50)], walls: [h.makeWall('w', 90, -400, 400, 800)] },
  { name: 'pickup_wall_50', vehicles: [h.makeVehicle('pickup', 0, 0, 0, 50)], walls: [h.makeWall('w', 60, -400, 400, 800)] },
  { name: 'suv_pole_50', vehicles: [h.makeVehicle('suv', 0, 0, 0, 50)], props: [h.makeProp('power_pole', 75, 0)], maxTime: 2.5 },
  { name: 'bus_wall_30', vehicles: [h.makeVehicle('bus', 0, 0, 0, 30)], walls: [h.makeWall('w', 90, -400, 400, 800)] },
  { name: 'truck_box_wall_40', vehicles: [h.makeVehicle('truck_box', 0, 0, 0, 40)], walls: [h.makeWall('w', 90, -400, 400, 800)] },
  { name: 'semi_wall_40', vehicles: [h.makeVehicle('truck_semi', 0, 0, 0, 40)], walls: [h.makeWall('w', 100, -400, 400, 800)] },
  { name: 'sedan_headon_50x50', vehicles: [h.makeVehicle('sedan', -80, 0, 0, 50), h.makeVehicle('sedan', 80, 0, Math.PI, 50)] },
  { name: 'sedan_tbone_truck_50', vehicles: [h.makeVehicle('sedan', -80, 0, 0, 50), h.makeVehicle('truck_box', 60, 0, Math.PI / 2, 0)] },
];

let totalPairs = 0;
for (const sc of scen) {
  const res = h.simulate({
    vehicles: sc.vehicles, walls: sc.walls, props: sc.props, maxTime: sc.maxTime ?? 3.0,
    record: true, recordEvery: 6
  } as any);
  let worstCross = 0, worstFrame = -1, stretched = 0, frameIdx = 0;
  for (const fr of res.frames) {
    for (const v of fr.vehicles) {
      const nb = v.beams.filter(b => !b.broken);
      let c = 0;
      for (let i = 0; i < nb.length; i++) {
        const A = nb[i];
        const p1 = v.nodes[A.a], p2 = v.nodes[A.b];
        if (!p1 || !p2) continue;
        for (let j = i + 1; j < nb.length; j++) {
          const B = nb[j];
          if (new Set([A.a, A.b, B.a, B.b]).size < 4) continue;
          const q1 = v.nodes[B.a], q2 = v.nodes[B.b];
          if (!q1 || !q2) continue;
          if (proper(p1, p2, q1, q2)) c++;
        }
      }
      if (c > worstCross) { worstCross = c; worstFrame = frameIdx; }
    }
    frameIdx++;
  }
  // растяжение: длина балки сейчас против исходной (origLength берём из исходных узлов)
  const last = res.frames[res.frames.length - 1];
  if (last) for (const v of last.vehicles) {
    for (const b of v.beams) {
      const A = v.nodes[b.a], B = v.nodes[b.b];
      if (!A || !B || b.broken) continue;
      const d0 = Math.hypot(A.ox - B.ox, A.oy - B.oy);
      const d1 = Math.hypot(A.x - B.x, A.y - B.y);
      if (d0 > 0 && d1 / d0 > 1.6) stretched++;
    }
  }
  totalPairs += worstCross;
  console.log(`${sc.name.padEnd(24)} frames=${String(res.frames.length).padStart(4)} worstCrossings=${String(worstCross).padStart(3)} (кадр ${worstFrame}) stretched>1.6x@end=${stretched}`);
}
console.log(`\nсумма худших пересечений по сценариям: ${totalPairs}`);

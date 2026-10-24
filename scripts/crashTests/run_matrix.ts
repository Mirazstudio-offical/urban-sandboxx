/**
 * Матрица краш-тестов: запуск  npx tsx scripts/crashTests/run_matrix.ts [outJson]
 * CRASH_SRC=<путь к src> — прогнать ту же матрицу на пропатченной копии.
 */
import * as fs from 'fs';
import * as h from './harness';
import { vehicleMetrics, separationIndex, VehMetrics } from './analyze';

const OUT = process.argv[2] || 'matrix.json';
const KMH2PX = h.KMH_TO_PX_S;

interface Row { id: string; group: string; desc: string; expect: string; metrics: VehMetrics[]; firstContactMs: number | null; }
const rows: Row[] = [];

function push(id: string, group: string, desc: string, expect: string, r: h.SimResult, axes: { x: number; y: number }[], ids: number[] | null = null) {
  const idxs = ids ?? r.series.veh.map((_, i) => i);
  const metrics = idxs.map((i, k) => vehicleMetrics(r, i, axes[k]));
  rows.push({ id, group, desc, expect, metrics, firstContactMs: r.firstContactT === null ? null : r.firstContactT * 1000 });
  const m = metrics[0];
  console.log(`${id.padEnd(16)} ${desc.padEnd(44)} v=${m.vImpHudKmh.toFixed(0).padStart(3)}km/h dV=${m.dVHudKmh.toFixed(1).padStart(5)} pk=${m.peakGHud.toFixed(1).padStart(6)}g(hud) ${m.peakGGeo.toFixed(1).padStart(6)}g(geo) stop=${m.tStopMs.toFixed(0).padStart(4)}ms crush=${m.frontM.toFixed(2)}m/${m.leftM.toFixed(2)}m/${m.rightM.toFixed(2)}m rest=${(m.restitution).toFixed(2)} radiator=${m.flags.radiator} tank=${m.flags.tank}`);
}

// ---------- A. Фронтальный удар в жёсткую стену (широкая плоскость), скорость ----------
for (const kmh of [15, 30, 50, 80]) {
  const car = h.makeVehicle('sedan', 0, 0, 0, kmh);
  const r = h.simulate({ vehicles: [car], walls: [h.makeWall('w', 60, -400, 400, 800)], dt: 1/240, maxTime: 3, record: kmh === 50, recordEvery: 2 });
  push(`A_wall_${kmh}`, 'wall-speed', `седан ${kmh} км/ч, 0°, стена`, '', r, [{ x: 1, y: 0 }]);
  if (kmh === 50) (globalThis as any).frames_wall50 = r.frames;
}

// ---------- B. Угол к стене (седан 50 км/ч) ----------
for (const deg of [15, 30, 45]) {
  const a = deg * Math.PI / 180;
  const car = h.makeVehicle('sedan', 0, 0, a, 50);
  const r = h.simulate({ vehicles: [car], walls: [h.makeWall('w', 90, -400, 400, 800)], dt: 1/240, maxTime: 3 });
  push(`B_wall_ang${deg}`, 'wall-angle', `седан 50 км/ч, ${deg}° к стене`, '', r, [{ x: Math.cos(a), y: Math.sin(a) }]);
}

// ---------- C. Разные автомобили, стена 50 км/ч ----------
for (const t of ['micro_car', 'pickup', 'ambulance']) {
  const car = h.makeVehicle(t, 0, 0, 0, 50);
  const r = h.simulate({ vehicles: [car], walls: [h.makeWall('w', 60 + (car.length - 42) / 2 * 0, -400, 400, 800)], dt: 1/240, maxTime: 3 });
  push(`C_wall_${t}`, 'wall-type', `${t} (${car.mass} кг) 50 км/ч, стена`, '', r, [{ x: 1, y: 0 }]);
}

// ---------- D. Жёсткое препятствие «столб» (круглый хитбокс) ----------
for (const kmh of [30, 50, 80]) {
  const car = h.makeVehicle('sedan', 0, 0, 0, kmh);
  const r = h.simulate({ vehicles: [car], props: [h.makeProp('power_pole', 75, 0)], dt: 1/240, maxTime: 2.5 });
  push(`D_pole_${kmh}`, 'pole', `седан ${kmh} км/ч в столб ЛЭП (r=3.2)`, '', r, [{ x: 1, y: 0 }]);
}

// ---------- E. Бетонный блок (box, неразрушимый) 50 км/ч ----------
{
  const car = h.makeVehicle('sedan', 0, 0, 0, 50);
  const r = h.simulate({ vehicles: [car], props: [h.makeProp('concrete_barrier', 80, 0, 0)], dt: 1/240, maxTime: 2.5 });
  push('E_barrier_50', 'box-prop', 'седан 50 км/ч в бетонный блок', '', r, [{ x: 1, y: 0 }]);
}

// ---------- F. Авто-авто: лоб в лоб, равные массы ----------
for (const [v1, v2] of [[25, 25], [50, 50]] as [number, number][]) {
  const a = h.makeVehicle('sedan', -80, 0, 0, v1);
  const b = h.makeVehicle('sedan', 80, 0, Math.PI, v2);
  const r = h.simulate({ vehicles: [a, b], dt: 1/240, maxTime: 3, record: v1 === 50, recordEvery: 2 });
  push(`F_headon_${v1}_${v2}`, 'car-car', `седан ${v1} + седан ${v2} км/ч, лоб в лоб`, '', r, [{ x: 1, y: 0 }, { x: -1, y: 0 }]);
  if (v1 === 50) (globalThis as any).frames_headon = r.frames;
}

// ---------- G. Лоб в лоб: легковой в грузовик 6200 кг (box), грузовик едет навстречу 50 км/ч ----------
{
  const car = h.makeVehicle('sedan', -80, 0, 0, 50);
  const truck = h.makeVehicle('truck_box', 80, 0, Math.PI, 30);
  const r = h.simulate({ vehicles: [car, truck], dt: 1/240, maxTime: 3 });
  push('G_sedan_truck', 'car-truck', 'седан 50 км/ч + грузовик 6200 кг 30 км/ч (лоб)', '', r, [{ x: 1, y: 0 }, { x: -1, y: 0 }]);
}

// ---------- H. Т-бон: движущийся седан 50 км/ч в стоящий седан ----------
{
  const a = h.makeVehicle('sedan', -100, 0, 0, 50);
  const b = h.makeVehicle('sedan', 0, 0, Math.PI / 2, 0);
  const r = h.simulate({ vehicles: [a, b], dt: 1/240, maxTime: 3, record: true, recordEvery: 2 });
  push('H_tbone_50', 'car-car', 'Т-бон: седан 50 км/ч в борт стоящего седана', '', r, [{ x: 1, y: 0 }, { x: 1, y: 0 }]);
  (globalThis as any).frames_tbone = r.frames;
}

// ---------- I. Удар в борт: седан 30 км/ч и 50 км/ч в борт стоящего грузовика ----------
for (const kmh of [30, 50]) {
  const a = h.makeVehicle('sedan', -100, 0, 0, kmh);
  const b = h.makeVehicle('truck_box', 0, 0, Math.PI / 2, 0);
  const r = h.simulate({ vehicles: [a, b], dt: 1/240, maxTime: 3 });
  push(`I_tbone_truck_${kmh}`, 'car-truck', `седан ${kmh} км/ч в борт стоящего грузовика`, '', r, [{ x: 1, y: 0 }, { x: 1, y: 0 }]);
}

fs.writeFileSync(OUT, JSON.stringify({ src: process.env.CRASH_SRC || 'src', rows }, null, 2));
console.log(`\nwritten ${OUT} (${rows.length} scenarios)`);
for (const k of ['frames_wall50', 'frames_headon', 'frames_tbone']) {
  const f = (globalThis as any)[k];
  if (f) fs.writeFileSync(OUT.replace(/\.json$/, `_${k}.json`), JSON.stringify(f));
}

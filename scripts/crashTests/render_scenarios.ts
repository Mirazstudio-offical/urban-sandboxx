/**
 * Рендер-набор: прогоняет сценарии с записью кадров и пишет JSON для render_strips.py.
 * npx tsx scripts/crashTests/render_scenarios.ts <outDir>   (CRASH_SRC — опционально, A/B)
 */
import * as fs from 'fs';
import * as path from 'path';
import * as h from './harness';
import { vehicleMetrics } from './analyze';

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const PX = h.KMH_TO_PX_S;
const rad = (d: number) => d * Math.PI / 180;

type Setup = { name: string; vehicles: any[]; walls?: any[]; props?: any[]; axes: { x: number; y: number }[]; maxTime?: number; };
const S: Setup[] = [];

// Стены
S.push({ name: 'wall_30deg_sedan50', vehicles: [h.makeVehicle('sedan', 0, 0, rad(30), 50)], walls: [h.makeWall('w', 90, -400, 400, 800)], axes: [{ x: Math.cos(rad(30)), y: Math.sin(rad(30)) }] });
S.push({ name: 'wall_45deg_sedan50', vehicles: [h.makeVehicle('sedan', 0, 0, rad(45), 50)], walls: [h.makeWall('w', 90, -400, 400, 800)], axes: [{ x: Math.cos(rad(45)), y: Math.sin(rad(45)) }] });
S.push({ name: 'wall_0deg_micro50', vehicles: [h.makeVehicle('micro_car', 0, 0, 0, 50)], walls: [h.makeWall('w', 60, -400, 400, 800)], axes: [{ x: 1, y: 0 }] });
S.push({ name: 'wall_0deg_ambulance50', vehicles: [h.makeVehicle('ambulance', 0, 0, 0, 50)], walls: [h.makeWall('w', 60, -400, 400, 800)], axes: [{ x: 1, y: 0 }] });
S.push({ name: 'wall_0deg_sedan80', vehicles: [h.makeVehicle('sedan', 0, 0, 0, 80)], walls: [h.makeWall('w', 60, -400, 400, 800)], axes: [{ x: 1, y: 0 }] });
// Препятствия
S.push({ name: 'pole_sedan50', vehicles: [h.makeVehicle('sedan', 0, 0, 0, 50)], props: [h.makeProp('power_pole', 75, 0)], axes: [{ x: 1, y: 0 }], maxTime: 2.5 });
S.push({ name: 'pole_sedan30', vehicles: [h.makeVehicle('sedan', 0, 0, 0, 30)], props: [h.makeProp('power_pole', 75, 0)], axes: [{ x: 1, y: 0 }], maxTime: 2.5 });
S.push({ name: 'concrete_block_sedan50', vehicles: [h.makeVehicle('sedan', 0, 0, 0, 50)], props: [h.makeProp('concrete_barrier', 80, 0, 0)], axes: [{ x: 1, y: 0 }], maxTime: 2.5 });
// Авто-авто
S.push({ name: 'headon_sedan50_sedan50', vehicles: [h.makeVehicle('sedan', -80, 0, 0, 50), h.makeVehicle('sedan', 80, 0, Math.PI, 50)], axes: [{ x: 1, y: 0 }, { x: -1, y: 0 }] });
S.push({ name: 'headon_sedan50_truck30', vehicles: [h.makeVehicle('sedan', -80, 0, 0, 50), h.makeVehicle('truck_box', 80, 0, Math.PI, 30)], axes: [{ x: 1, y: 0 }, { x: -1, y: 0 }] });
S.push({ name: 'tbone_sedan50_into_sedan', vehicles: [h.makeVehicle('sedan', -100, 0, 0, 50), h.makeVehicle('sedan', 0, 0, Math.PI / 2, 0)], axes: [{ x: 1, y: 0 }, { x: 1, y: 0 }] });
S.push({ name: 'tbone_sedan50_into_truck', vehicles: [h.makeVehicle('sedan', -100, 0, 0, 50), h.makeVehicle('truck_box', 0, 0, Math.PI / 2, 0)], axes: [{ x: 1, y: 0 }, { x: 1, y: 0 }] });
S.push({ name: 'sideswipe_sedan50_parked', vehicles: [h.makeVehicle('sedan', -100, 0, 0, 50), h.makeVehicle('sedan', 0, 19, 0, 0)], axes: [{ x: 1, y: 0 }, { x: 1, y: 0 }] });

const summary: any[] = [];
for (const s of S) {
  const r = h.simulate({ vehicles: s.vehicles, walls: s.walls || [], props: s.props || [], dt: 1 / 240, maxTime: s.maxTime ?? 3, record: true, recordEvery: 2, stopWhenAllStopped: true, settleAfterStop: 0.3 });
  fs.writeFileSync(path.join(OUT, `${s.name}.frames.json`), JSON.stringify({ firstContactMs: r.firstContactT === null ? null : r.firstContactT * 1000, frames: r.frames, walls: s.walls || [], props: (s.props || []).map((p: any) => ({ type: p.type, x: p.x, y: p.y, angle: p.angle || 0 })) }));
  const metrics = s.vehicles.map((v, i) => vehicleMetrics(r, i, s.axes[i]));
  summary.push({ name: s.name, metrics });
  const m = metrics[0];
  console.log(`${s.name.padEnd(28)} v=${m.vImpHudKmh.toFixed(0)}km/h peak=${m.peakGHud.toFixed(0)}g mean=${m.meanGHud.toFixed(0)}g stop=${m.tStopMs.toFixed(0)}ms front=${m.frontM.toFixed(2)}m L=${m.leftM.toFixed(2)} R=${m.rightM.toFixed(2)} rest=${m.restitution.toFixed(2)} rad=${m.flags.radiator}`);
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));

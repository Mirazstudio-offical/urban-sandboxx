/** Частичное перекрытие в жёсткое препятствие: стена покрывает только часть ширины кузова. */
import * as fs from 'fs';
import * as h from './harness';
import { vehicleMetrics } from './analyze';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
// кузов седана 20 px по y, [-10, 10]. Стена по y от y0 до 60 => перекрытие = 10 - y0
const cases: [string, number][] = [['full100', -60], ['offset60', -2], ['offset40', 2], ['small25', 5]];
for (const [name, y0] of cases) {
  const car = h.makeVehicle('sedan', 0, 0, 0, 50);
  const wall = h.makeWall('w', 60, y0, 400, 120);
  const r = h.simulate({ vehicles: [car], walls: [wall], dt: 1 / 240, maxTime: 3, record: true, recordEvery: 2, settleAfterStop: 0.3 });
  const m = vehicleMetrics(r, 0, { x: 1, y: 0 });
  fs.writeFileSync(`${OUT}/${name}.frames.json`, JSON.stringify({ firstContactMs: r.firstContactT === null ? null : r.firstContactT * 1000, frames: r.frames, walls: [{ x: 60, y: y0, width: 400, height: 120 }], props: [] }));
  console.log(`${name.padEnd(9)} overlap=${(10 - y0 > 20 ? 100 : Math.max(0, (10 - y0)) / 20 * 100).toFixed(0)}% front=${m.frontM.toFixed(2)}m L=${m.leftM.toFixed(2)} R=${m.rightM.toFixed(2)} meshPeak=${(m.meshPeakPx * 0.105).toFixed(2)}m peak=${m.peakGHud.toFixed(0)}g yaw=${m.yawDeg.toFixed(1)}deg stop=${m.tStopMs.toFixed(0)}ms radiator=${m.flags.radiator}`);
}

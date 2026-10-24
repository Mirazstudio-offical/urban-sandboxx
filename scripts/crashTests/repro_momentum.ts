import * as h from './harness';
function run(name: string, mk: () => any[]) {
  const cars = mk();
  const r = h.simulate({ vehicles: cars, dt: 1 / 240, maxTime: 1.0, stopWhenAllStopped: false });
  const ic = Math.round((r.firstContactT ?? 0) / r.dt);
  const at = (k: number) => {
    let p = 0, E = 0;
    r.series.veh.forEach((s, i) => { p += cars[i].mass * s.vx[k]; E += 0.5 * cars[i].mass * (s.vx[k] ** 2 + s.vy[k] ** 2); });
    return { p, E };
  };
  const pre = at(Math.max(0, ic - 1));
  for (const ms of [10, 20, 50, 100]) {
    const k = Math.min(r.series.t.length - 1, ic + Math.round(ms / 1000 / r.dt));
    const post = at(k);
    console.log(`${name.padEnd(20)} +${String(ms).padStart(3)}ms  p ${(post.p / pre.p * 100).toFixed(1).padStart(6)}% of pre  KE ${(post.E / pre.E * 100).toFixed(1).padStart(6)}% of pre`);
  }
}
run('head-on 50+50', () => [h.makeVehicle('sedan', -80, 0, 0, 50), h.makeVehicle('sedan', 80, 0, Math.PI, 50)]);
run('T-bone 50 into rest', () => [h.makeVehicle('sedan', -100, 0, 0, 50), h.makeVehicle('sedan', 0, 0, Math.PI / 2, 0)]);
run('sedan50 vs truck30', () => [h.makeVehicle('sedan', -80, 0, 0, 50), h.makeVehicle('truck_box', 80, 0, Math.PI, 30)]);

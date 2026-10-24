import { makeVehicle, simulate, KMH_TO_PX_S, PX_S_TO_KMH, conv } from './harness';
for (const mode of ['player', 'ai']) for (const kmh of [20, 50, 100]) {
  const car: any = makeVehicle('sedan', 0, 0, Math.PI / 2, 0);
  car.isPlayerControlled = mode === 'player';
  const v = kmh * KMH_TO_PX_S; car.vx = v; car.vy = 0; car.speed = 0; car.lateralVelocity = -v;
  const r = simulate({ vehicles: [car], dt: 1 / 240, maxTime: 6, stopWhenAllStopped: false });
  const s = r.series.veh[0];
  let tStop = NaN, tHalf = NaN;
  for (let i = 0; i < s.vx.length; i++) {
    const sp = Math.hypot(s.vx[i], s.vy[i]);
    if (isNaN(tHalf) && sp < v / 2) tHalf = r.series.t[i];
    if (isNaN(tStop) && sp < 2) { tStop = r.series.t[i]; break; }
  }
  const distPx = Math.hypot(car.x, car.y);
  console.log(`${mode.padEnd(6)} slide ${kmh} km/h: t_half=${tHalf.toFixed(3)}s t_stop=${tStop.toFixed(3)}s dist=${distPx.toFixed(1)}px (${(distPx*0.105).toFixed(2)} m); mean decel = ${(conv.hud.accelG(v/tStop)).toFixed(1)} g(hud) / ${(conv.geo.accelG(v/tStop)).toFixed(1)} g(geo); ideal mu=0.8 -> ${(kmh/3.6/(0.8*9.81)).toFixed(2)} s, ${((kmh/3.6)**2/(2*0.8*9.81)).toFixed(1)} m`);
}

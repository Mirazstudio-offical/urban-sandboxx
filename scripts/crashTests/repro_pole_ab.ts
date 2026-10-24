import * as h from './harness';
for (const kmh of [30, 50, 80]) {
  const car: any = h.makeVehicle('sedan', 0, 0, 0, kmh);
  const p = h.makeProp('power_pole', 75, 0);
  const r = h.simulate({ vehicles: [car], props: [p], dt: 1/240, maxTime: 2.5, record: false });
  const d = car.damage;
  console.log(`pole ${kmh} km/h: front=${d.frontCrumple.toFixed(2)}px carX_end=${car.x.toFixed(1)} (pole x=75) vEnd=${Math.hypot(car.vx,car.vy).toFixed(1)} poleBroken=${!!p.isBroken} radiator=${!!car.engineState?.radiatorPunctured} mesh=${Math.max(0,...r.series.veh[0].meshCrush).toFixed(2)}`);
}

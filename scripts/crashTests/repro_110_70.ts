/**
 * Краш-тест: Столкновение на 110 км/ч с 70% перекрытием (offset 70%)
 * npx tsx scripts/crashTests/repro_110_70.ts
 */
import * as h from './harness';
import { vehicleMetrics } from './analyze';

const kmh = 110;
const overlapPct = 70;
// Sedan width = 20 px (-10 to +10). 70% overlap means wall covers 14 px of the front.
// Covering left 70%: y from -10 to +4
const car = h.makeVehicle('sedan', 0, 0, 0, kmh);
const wall = h.makeWall('wall_110_70', 60, -10, 400, 14);

const r = h.simulate({
  vehicles: [car],
  walls: [wall],
  dt: 1 / 240,
  maxTime: 3,
  record: true,
  recordEvery: 2,
  settleAfterStop: 0.3
});

const m = vehicleMetrics(r, 0, { x: 1, y: 0 });
console.log('================================================================================');
console.log(`КРАШ-ТЕСТ: Седан (1400 кг) на скорости ${kmh} км/ч при ${overlapPct}% перекрытии (70% Offset)`);
console.log('================================================================================');
console.log(`Скорость удара (HUD):        ${m.vImpHudKmh.toFixed(1)} км/ч`);
console.log(`Скорость удара (Геометрия):  ${m.vImpGeoKmh.toFixed(1)} км/ч`);
console.log(`Пиковое замедление (g):      ${m.peakGHud.toFixed(1)} g (HUD) / ${m.peakGGeo.toFixed(1)} g (Geo)`);
console.log(`Длительность импульса:       ${m.tStopMs.toFixed(1)} мс`);
console.log(`Смятие по фронту:            ${m.frontM.toFixed(2)} м (${(m.frontM * 100).toFixed(0)} см)`);
console.log(`Деформация слева / справа:   L = ${m.leftM.toFixed(2)} м, R = ${m.rightM.toFixed(2)} м`);
console.log(`Вторжение в салон (Intrusion): ${m.intrusionM.toFixed(2)} м`);
console.log(`Разорванных балок (Node-Beam): ${m.brokenBeams}`);
console.log(`Кинетическая энергия (0):    ${(m.ke0JHud / 1000).toFixed(1)} кДж`);
console.log(`Поглощенная работа смятия:   ${(m.absorbedJHud / 1000).toFixed(1)} кДж`);
console.log(`Радиатор пробит:             ${m.flags.radiator}`);
console.log(`Двигатель заглох / заклинил: заглох=${m.flags.stalled}, заклинил=${m.flags.seized}`);
console.log(`Увод подвески / колес:       FL=${m.flags.suspFL}, FR=${m.flags.suspFR}`);
console.log('================================================================================');

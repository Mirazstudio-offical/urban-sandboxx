import { SimResult, Vehicle, conv, movingAvg, dmgModel, PX_S_TO_KMH, M_PER_PX } from './harness';

export interface VehMetrics {
  type: string; mass: number; lengthM: number;
  vImpPx: number; vImpHudKmh: number; vImpGeoKmh: number;   // скорость сближения вдоль оси удара
  tStopMs: number;                  // длительность пульса (до остановки сближения), мс
  dVPx: number; dVHudKmh: number;   // изменение скорости вдоль оси
  peakGHud: number; peakGGeo: number; meanGHud: number; meanGGeo: number;
  restitution: number;              // e = скорость отскока / скорость подхода (вдоль оси)
  // смятие
  front: number; rear: number; left: number; right: number;  // px, финал
  frontM: number; rearM: number; leftM: number; rightM: number;
  meshPeakPx: number; meshFinalPx: number; springbackPct: number;
  zoneFillFront: number;            // frontCrumple / длина зоны (>1 = в кабину)
  intrusionM: number;               // глубина за пределами зоны деформации (в кабину), м
  crushPctLen: number;              // максимальное смятие / длина кузова, %
  brokenBeams: number;
  // энергия (в единицах игры -> Дж по двум интерпретациям)
  ke0JHud: number; ke0JGeo: number;
  absorbedJHud: number; absorbedJGeo: number; // работа смятия по профилю силы, Дж (две шкалы)
  // состояние
  yawDeg: number; slideM: number; finalSpeedKmh: number;
  flags: Record<string, boolean | number>;
}

const clampIdx = (i: number, n: number) => Math.max(0, Math.min(n - 1, i));

/** Метрики одного автомобиля по оси удара (unit axis a, направленная «в сторону движения» машины к препятствию). */
export function vehicleMetrics(res: SimResult, idx: number, axis: { x: number; y: number }, opts?: { icOverride?: number }): VehMetrics {
  const s = res.series.veh[idx];
  const dt = res.dt;
  const n = s.vx.length;
  const ic = clampIdx(opts?.icOverride ?? Math.round((res.firstContactT ?? 0) / dt), n);
  const vAx = s.vx.map((vx, i) => vx * axis.x + s.vy[i] * axis.y); // скорость вдоль оси (сближение > 0)
  const vImp = vAx[ic];
  // остановка сближения
  let jStop = n - 1;
  for (let j = ic; j < n; j++) { if (vAx[j] <= 0.03 * vImp) { jStop = j; break; } }
  // отскок: минимум после остановки в ближайшие 0.3 с
  let vMin = vAx[jStop];
  for (let j = jStop; j < Math.min(n, jStop + Math.round(0.3 / dt)); j++) vMin = Math.min(vMin, vAx[j]);
  const rebound = Math.max(0, -vMin);
  // замедление = -dv/dt вдоль оси (px/s²), фильтр 10-12 мс
  const acc: number[] = new Array(n).fill(0);
  for (let k = 0; k < n - 1; k++) acc[k] = (vAx[k] - vAx[k + 1]) / dt;
  const accF = movingAvg(acc, dt, 0.010);
  let peak = 0;
  for (let k = ic; k <= Math.min(n - 1, jStop + 2); k++) peak = Math.max(peak, accF[k]);
  const tStop = Math.max(dt, (jStop - ic + 1) * dt);
  const dVpx = vImp - (vAx[Math.min(n - 1, jStop)] );
  const meanAcc = dVpx / tStop;

  const v: Vehicle = (res.world.vehicles[idx] as Vehicle);
  const d: any = v.damage || {};
  const nb = d.nodeBeam;
  const meshPeak = Math.max(0, ...s.meshCrush);
  const meshFinal = s.meshCrush[n - 1] ?? 0;
  const zoneLenF = dmgModel.zoneLengthPx({ length: v.length, width: v.width }, 'front');
  const maxCrush = Math.max(d.frontCrumple || 0, d.rearCrumple || 0, d.leftDent || 0, d.rightDent || 0);
  const zoneForMax = (d.frontCrumple || 0) >= (d.rearCrumple || 0) && (d.frontCrumple || 0) >= Math.max(d.leftDent || 0, d.rightDent || 0)
    ? zoneLenF
    : (d.rearCrumple || 0) >= Math.max(d.leftDent || 0, d.rightDent || 0)
      ? dmgModel.zoneLengthPx({ length: v.length, width: v.width }, 'rear')
      : dmgModel.zoneLengthPx({ length: v.length, width: v.width }, 'side');
  const intrusionPx = Math.max(0, maxCrush - zoneForMax);

  const ke0Px = 0.5 * v.mass * vImp * vImp; // mass * px²/s²
  const ke0Hud = 0.5 * v.mass * Math.pow(conv.hud.speedMs(vImp), 2);
  const ke0Geo = 0.5 * v.mass * Math.pow(conv.geo.speedMs(vImp), 2);
  // работа профиля: нужна ширина контакта — берём ширину кузова (для стены) как опору
  const prof = dmgModel.createCrushProfile({ zone: 'front', length: v.length, width: v.width });
  const workPx = prof.work(d.frontCrumple || 0);
  // работа = mass·px²/s²; переводим в Дж: hud (px/s→м/с = 0.0625) и geo (px→м = 0.105 на длину и на скорость)
  const absorbedHudJ = workPx * Math.pow(PX_S_TO_KMH / 3.6, 2);
  const absorbedGeoJ = workPx * Math.pow(M_PER_PX, 2);

  const eng: any = (v as any).engineState || {};
  const fuel: any = (v as any).fuelSystem || {};
  const lastVx = s.vx[n - 1], lastVy = s.vy[n - 1];
  const yaw0 = s.ang[0], yawN = s.ang[n - 1];
  let dyaw = (yawN - yaw0) * 180 / Math.PI; dyaw = ((dyaw + 180) % 360 + 360) % 360 - 180;

  return {
    type: v.type, mass: v.mass, lengthM: v.length * M_PER_PX,
    vImpPx: vImp, vImpHudKmh: conv.hud.speedKmh(vImp), vImpGeoKmh: conv.geo.speedKmh(vImp),
    tStopMs: tStop * 1000, dVPx: dVpx, dVHudKmh: conv.hud.speedKmh(dVpx),
    peakGHud: conv.hud.accelG(peak), peakGGeo: conv.geo.accelG(peak),
    meanGHud: conv.hud.accelG(meanAcc), meanGGeo: conv.geo.accelG(meanAcc),
    restitution: vImp > 1 ? rebound / vImp : 0,
    front: d.frontCrumple || 0, rear: d.rearCrumple || 0, left: d.leftDent || 0, right: d.rightDent || 0,
    frontM: (d.frontCrumple || 0) * M_PER_PX, rearM: (d.rearCrumple || 0) * M_PER_PX,
    leftM: (d.leftDent || 0) * M_PER_PX, rightM: (d.rightDent || 0) * M_PER_PX,
    meshPeakPx: meshPeak, meshFinalPx: meshFinal,
    springbackPct: meshPeak > 0.05 ? Math.max(0, (meshPeak - meshFinal) / meshPeak * 100) : 0,
    zoneFillFront: zoneLenF > 0 ? (d.frontCrumple || 0) / zoneLenF : 0,
    intrusionM: intrusionPx * M_PER_PX,
    crushPctLen: maxCrush / v.length * 100,
    brokenBeams: nb?.brokenBeamCount ?? (nb?.beams?.filter((b: any) => b.broken).length ?? 0),
    ke0JHud: ke0Hud, ke0JGeo: ke0Geo, absorbedJHud: absorbedHudJ, absorbedJGeo: absorbedGeoJ,
    yawDeg: dyaw,
    slideM: Math.hypot(s.x[n - 1] - s.x[ic], s.y[n - 1] - s.y[ic]) * M_PER_PX,
    finalSpeedKmh: Math.hypot(lastVx, lastVy) * PX_S_TO_KMH,
    flags: {
      radiator: !!eng.radiatorPunctured, oil: !!eng.oilPunctured, stalled: !eng.engineRunning,
      seized: !!eng.isSeized, transJam: !!eng.transmissionJammed, engineHealth: eng.engineHealth ?? 100,
      tank: !!fuel.tankPunctured, fuelRail: !!fuel.fuelRailBroken,
      hoodBuckled: !!d.hoodBuckled, windshield: !!d.windshieldCracked, rearGlass: !!d.rearGlassCracked,
      headlightL: !!d.leftHeadlightBroken, headlightR: !!d.rightHeadlightBroken,
      hoodOff: !!d.hoodDetached, bumperFOff: !!d.frontBumperDetached, bumperROff: !!d.rearBumperDetached,
      doorLOff: !!d.leftDoorDetached, doorROff: !!d.rightDoorDetached,
      engineFire: !!d.engineFire, tankFire: !!d.fuelTankFire, smolder: !!d.underHoodSmolder,
      steam: (d.underHoodSteam && d.underHoodSteam !== 'none') ? 1 : 0,
      suspFL: +(d.frontLeftSuspensionDamage || 0).toFixed(2), suspFR: +(d.frontRightSuspensionDamage || 0).toFixed(2)
    }
  };
}

/** Первый индекс, где нормальная скорость сближения двух тел ≤ small (контакт кончился). */
export function separationIndex(res: SimResult, ia: number, ib: number, u: { x: number; y: number }, ic: number, frac = 0.02): number {
  const a = res.series.veh[ia], b = res.series.veh[ib];
  const rel0 = (a.vx[ic] - b.vx[ic]) * u.x + (a.vy[ic] - b.vy[ic]) * u.y;
  for (let j = ic; j < a.vx.length; j++) {
    const rel = (a.vx[j] - b.vx[j]) * u.x + (a.vy[j] - b.vy[j]) * u.y;
    if (rel <= frac * rel0) return j;
  }
  return a.vx.length - 1;
}

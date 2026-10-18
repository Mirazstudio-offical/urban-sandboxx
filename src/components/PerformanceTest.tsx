import React, { useEffect, useRef, useState } from 'react';
import { X, Flag, Download, StopCircle, Gauge } from 'lucide-react';
import { GameWorld, Player } from '../types';
import { CAR_CONFIGS, PX_S_TO_SPEED_KMH } from '../vehicleHelpers';
import { getPowertrainPickByIds } from '../powertrainVariants';

interface PerformanceTestProps {
  worldRef: React.MutableRefObject<GameWorld | null>;
  playerRef: React.MutableRefObject<Player | null>;
  onClose: () => void;
}

type Phase = 'idle' | 'ready' | 'run' | 'done';

interface RunState {
  phase: Phase;
  t0: number;
  lastT: number;
  distPx: number;
  sampleAt: number;
  samples: string[];
  times: { kmh: number; s: number }[];
  quarterS: number | null;
  maxKmh: number;
  maxRpm: number;
  maxBoost: number;
  maxTemp: number;
}

const TARGETS = [20, 40, 60, 80, 100, 120, 140, 160, 200, 250];
// 1 m = 16 px: 100 km/h = 27.78 m/s = 444.4 px/s (SPEED_KMH_TO_PX_S = 4.4444 px per km/h)
const PX_PER_M = 16;
const QUARTER_MILE_PX = 402.336 * PX_PER_M;
const KMH = (px: number) => Math.abs(px) * PX_S_TO_SPEED_KMH;

const fmtS = (s: number) => s.toFixed(2) + ' с';

const blankRun = (): RunState => ({
  phase: 'idle', t0: 0, lastT: 0, distPx: 0, sampleAt: 0, samples: [],
  times: [], quarterS: null, maxKmh: 0, maxRpm: 0, maxBoost: 0, maxTemp: 0
});

function download(name: string, mime: string, text: string) {
  const blob = new Blob(['\ufeff' + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

export const PerformanceTest: React.FC<PerformanceTestProps> = ({ worldRef, playerRef, onClose }) => {
  const [run, setRun] = useState<RunState>(blankRun);
  const [noCar, setNoCar] = useState(false);
  const [info, setInfo] = useState<{
    kmh: number; gear: string; rpm: number; redline: number; boost: number; boostMax: number; temp: number;
    distM: number; elapsed: number;
  } | null>(null);
  const runRef = useRef<RunState>(run);
  runRef.current = run;

  const vehInfoRef = useRef<{ type: string; label: string; mass: number | null; ids: { engineId?: string; transmissionId?: string; tuneId?: string; tireSetId?: string; turboKitId?: string } } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      const world = worldRef.current;
      const player = playerRef.current;
      const veh = world && player && player.isInVehicle && player.currentVehicleId
        ? world.vehicles.find(v => v.id === player.currentVehicleId)
        : null;
      if (!veh || !veh.engineState) {
        setNoCar(true); setInfo(null);
        return;
      }
      setNoCar(false);
      const eng = veh.engineState;
      const now = performance.now();
      const r = runRef.current;
      const dt = r.lastT ? Math.min(0.5, (now - r.lastT) / 1000) : 0;
      const kmh = KMH(veh.speed);
      const boostMax = eng.turboSpec ? eng.turboSpec.boostMax : 0;
      const boost = Math.round((eng.turboBoost || 0) * 100);

      // remember vehicle identity for the report
      if (r.phase !== 'run' && r.phase !== 'ready') {
        vehInfoRef.current = {
          type: veh.type,
          label: veh.powertrainLabel || '',
          mass: veh.mass ?? null,
          ids: {
            engineId: eng.engineId, transmissionId: eng.transmissionId,
            tuneId: eng.tuneId, tireSetId: eng.tireSetId, turboKitId: eng.turboKitId
          }
        };
      }

      if (r.phase === 'idle' || r.phase === 'done') {
        setInfo({ kmh, gear: gearLabel(eng), rpm: Math.round(eng.engineRPM || 0), redline: eng.redlineRPM || 6000, boost, boostMax, temp: eng.temperature ?? 85, distM: r.distPx / PX_PER_M, elapsed: 0 });
        r.lastT = now;
        return;
      }

      if (r.phase === 'ready') {
        // launch detect: vehicle starts moving in engaged gear
        const engaged = eng.transmissionType === 'AUTO'
          ? (eng.autoGearMode === 'D' || eng.autoGearMode === 'R')
          : eng.currentGear !== 0;
        if (engaged && kmh > 2) {
          r.phase = 'run';
          r.t0 = now;
          r.lastT = now;
          r.distPx = 0;
          r.samples = ['t_s;kmh;gear;auto;rpm;boost_pct;dist_m;temp_c'];
        }
      }

      if (r.phase === 'run') {
        r.distPx += Math.abs(veh.speed) * Math.max(0.01, dt);
        r.maxKmh = Math.max(r.maxKmh, kmh);
        r.maxRpm = Math.max(r.maxRpm, eng.engineRPM || 0);
        r.maxBoost = Math.max(r.maxBoost, boost);
        r.maxTemp = Math.max(r.maxTemp, eng.temperature ?? 85);

        const elapsed = (now - r.t0) / 1000;
        for (const t of TARGETS) {
          if (kmh >= t && !r.times.some(x => x.kmh === t)) r.times.push({ kmh: t, s: elapsed });
        }
        if (r.quarterS == null && r.distPx >= QUARTER_MILE_PX) r.quarterS = elapsed;

        if (now - r.sampleAt >= 100) {
          r.sampleAt = now;
          const gearTxt = eng.transmissionType === 'AUTO' && eng.autoGearMode === 'D'
            ? String(Math.max(0, eng.currentGear))
            : eng.transmissionType === 'AUTO' ? (eng.autoGearMode || '?')
            : eng.currentGear === -1 ? 'R' : String(eng.currentGear);
          r.samples.push(`${elapsed.toFixed(2)};${kmh.toFixed(1)};${gearTxt};${eng.transmissionType === 'AUTO' ? 1 : 0};${Math.round(eng.engineRPM || 0)};${boost};${(r.distPx / PX_PER_M).toFixed(1)};${(eng.temperature ?? 85).toFixed(1)}`);
        }
      }
      r.lastT = now;
      setInfo({
        kmh, gear: gearLabel(eng),
        rpm: Math.round(eng.engineRPM || 0), redline: eng.redlineRPM || 6000,
        boost, boostMax, temp: eng.temperature ?? 85,
        distM: r.distPx / PX_PER_M,
        elapsed: r.phase === 'run' ? (now - r.t0) / 1000 : 0
      });
      setRun({ ...r });
    }, 80);
    return () => window.clearInterval(iv);
  }, []);

  const gearLabel = (eng: any) => {
    if (eng.transmissionType === 'AUTO') {
      const mode = eng.autoGearMode || 'P';
      return mode === 'D' && eng.currentGear > 0 ? 'D' + eng.currentGear : mode;
    }
    return eng.currentGear === -1 ? 'R' : eng.currentGear === 0 ? 'N' : String(eng.currentGear);
  };

  const arm = () => {
    const r = blankRun();
    r.phase = 'ready';
    setRun(r);
  };
  const finish = () => {
    const r = runRef.current;
    r.phase = 'done';
    setRun({ ...r });
  };
  const abort = () => setRun(blankRun());

  const exportReport = () => {
    const info0 = vehInfoRef.current;
    if (!info0) return;
    const r = runRef.current;
    const cfg = CAR_CONFIGS[(info0.type as keyof typeof CAR_CONFIGS)] || CAR_CONFIGS.sedan;
    const pick = getPowertrainPickByIds(info0.ids);
    const eng = (() => {
      const w = worldRef.current; const p = playerRef.current;
      const v = w && p && p.currentVehicleId ? w.vehicles.find(x => x.id === p.currentVehicleId) : null;
      return v && v.engineState ? v.engineState : null;
    })();
    const L: string[] = [];
    L.push('ОТЧЁТ ЗАМЕРА РАЗГОНА');
    L.push('='.repeat(46));
    L.push(`Дата: ${new Date().toLocaleString('ru-RU')}`);
    L.push(`Автомобиль: ${cfg.name || info0.type} [${info0.type}]`);
    L.push(`Снаряжённая масса: ${info0.mass ?? cfg.mass} кг (база ${cfg.mass} кг)`);
    L.push('');
    L.push('КОНФИГУРАЦИЯ СИЛОВОЙ УСТАНОВКИ');
    L.push('-'.repeat(46));
    if (pick) {
      L.push(`Двигатель: ${pick.engine.nameRu} (${pick.engine.fuel}, отсечка ${pick.engine.redlineRPM}, масса ${pick.engine.massKg} кг)`);
      L.push(`КПП: ${pick.transmission.nameRu} (${Math.round(pick.transmission.efficiency * 100)}% КПД, масса ${pick.transmission.massKg} кг)`);
      L.push(`  передач (с реверсом): ${pick.transmission.ratios.length - 1}, главная пара: ${pick.transmission.finalDrive}${pick.transmission.divider ? ', устройство: ' + pick.transmission.divider : ''}`);
      if (pick.turboKit && pick.turboKit.id !== 'trb_none') {
        L.push(`Наддув: ${pick.turboKit.nameRu} (+${Math.round(pick.turboKit.boostMax * 100)}%, спул с ${pick.turboKit.spoolRPM})${pick.turboIsAftermarket ? ' [доп. комплект]' : ''}`);
      }
      L.push(`Прошивка: ${pick.tune.nameRu} (тяга x${pick.tune.powerMult.toFixed(2)}, октан от ${pick.tune.minOctane}, риск детонации ${Math.round(pick.tune.knockRisk * 100)}%)`);
      L.push(`Шины: ${pick.tires.nameRu} (сцепление x${pick.tires.gripMult.toFixed(2)}, мокро x${pick.tires.wetGripMult.toFixed(2)}, лёд x${pick.tires.iceGripMult.toFixed(2)}, масса ${pick.tires.massKg} кг)`);
    }
    if (info0.label) L.push(info0.label);
    if (eng) {
      L.push(`Детонация: ${eng.engineKnocking ? 'есть' : 'нет'}; температура: ${(eng.temperature ?? 85).toFixed(0)} град.`);
    }
    L.push('');
    L.push('РЕЗУЛЬТАТЫ');
    L.push('-'.repeat(46));
    for (const t of r.times) L.push(`0–${t.kmh} км/ч: ${fmtS(t.s)}`);
    if (r.quarterS != null) L.push(`402 м (1/4 мили): ${fmtS(r.quarterS)}`);
    L.push(`Макс. скорость в замере: ${Math.round(r.maxKmh)} км/ч`);
    L.push(`Макс. обороты: ${Math.round(r.maxRpm)} об/мин`);
    L.push(`Пик наддува: ${r.maxBoost}%`);
    L.push(`Пройдено: ${(r.distPx / PX_PER_M).toFixed(0)} м`);
    const txt = L.join('\r\n');
    download(`perf_report_${stamp()}.txt`, 'text/plain;charset=utf-8', txt);
  };

  const exportCsv = () => {
    const r = runRef.current;
    if (!r.samples.length) return;
    download(`perf_data_${stamp()}.csv`, 'text/csv;charset=utf-8', r.samples.join('\r\n'));
  };

  const hasResults = run.phase === 'done' || run.phase === 'run';
  const barRpm = info ? Math.min(1, info.rpm / Math.max(1, info.redline)) : 0;

  return (
    <div className="fixed top-4 right-4 z-[60] w-[360px] max-h-[92vh] overflow-y-auto rounded-xl bg-slate-900/92 border border-slate-600/60 shadow-2xl text-slate-100 select-none" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2 text-amber-400 font-semibold">
          <Gauge size={18} /> Замер разгона
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200" aria-label="Закрыть"><X size={20} /></button>
      </div>

      {noCar ? (
        <div className="px-4 py-8 text-center text-slate-400 text-sm">Сядьте за руль автомобиля, чтобы начать замер.</div>
      ) : (
        <>
          <div className="px-4 py-3">
            {/* live */}
            <div className="flex items-end justify-between">
              <div>
                <div className="text-5xl font-bold tabular-nums leading-none">{info ? Math.round(info.kmh) : 0}</div>
                <div className="text-xs text-slate-400 mt-1">км/ч</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-400 tabular-nums">{info ? info.gear : '-'}</div>
                <div className="text-xs text-slate-400 mt-1">передача</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums">{info ? info.rpm.toLocaleString('ru-RU') : 0}</div>
                <div className="text-xs text-slate-400 mt-1">об/мин</div>
              </div>
            </div>
            <div className="mt-2 h-2 rounded bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-red-500" style={{ width: `${(barRpm * 100).toFixed(1)}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>Пройдено: {info ? Math.round(info.distM) : 0} м</span>
              <span>Время: {(info?.elapsed || 0).toFixed(2)} с</span>
              <span>{info && info.boostMax > 0 ? `Наддув: ${info.boost}%` : 'Наддув: нет'}</span>
            </div>
          </div>

          <div className="px-4 pb-3">
            {(run.phase === 'idle' || run.phase === 'done') && (
              <button onClick={arm} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">
                <Flag size={17} /> Старт замера
              </button>
            )}
            {run.phase === 'ready' && (
              <div className="text-center py-2.5 rounded-lg bg-slate-800/70 border border-slate-600/40">
                <div className="font-semibold text-amber-400">Ожидание старта</div>
                <div className="text-xs text-slate-400 mt-1">Встаньте на месте и троньтесь — замер начнётся автоматически</div>
              </div>
            )}
            {run.phase === 'run' && (
              <button onClick={finish} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 font-semibold">
                <StopCircle size={17} /> Завершить замер
              </button>
            )}
            {run.phase === 'done' && (
              <button onClick={abort} className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm">Сбросить результаты</button>
            )}
          </div>

          {hasResults && (run.times.length > 0 || run.quarterS != null) && (
            <div className="px-4 pb-2">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Промежуточные времена</div>
              <div className="grid grid-cols-2 gap-1.5">
                {run.times.map(t => (
                  <div key={t.kmh} className="flex justify-between rounded bg-slate-800/70 px-2 py-1.5 text-sm">
                    <span className="text-slate-300">0–{t.kmh}</span>
                    <span className="font-semibold tabular-nums text-emerald-400">{t.s.toFixed(2)} с</span>
                  </div>
                ))}
                {run.quarterS != null && (
                  <div className="flex justify-between rounded bg-slate-800/70 px-2 py-1.5 text-sm col-span-2">
                    <span className="text-slate-300">402 м (1/4 мили)</span>
                    <span className="font-semibold tabular-nums text-emerald-400">{run.quarterS.toFixed(2)} с</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="px-4 pb-4 pt-1 flex gap-2">
            <button onClick={exportReport} disabled={!run.samples.length && run.times.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm disabled:opacity-40">
              <Download size={15} /> Отчёт .txt
            </button>
            <button onClick={exportCsv} disabled={!run.samples.length}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm disabled:opacity-40">
              <Download size={15} /> Данные .csv
            </button>
          </div>
        </>
      )}
    </div>
  );
};

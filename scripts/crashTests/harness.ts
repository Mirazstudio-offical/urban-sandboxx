/**
 * Headless crash-test harness для urban-sandboxx.
 *
 * Гоняет НАСТОЯЩУЮ физику игры (updateVehiclePhysics + updateBreakablePropsAndLivingWorld +
 * node-beam softbody) в Node, без браузера. Мир минимальный: пустые дороги, здания-«стены»,
 * пропсы-«столбы», машины. Запись покадровой сетки (узлы/балки/контур) для рендера.
 *
 * Единицы игры: px, px/s, kg. Два масштаба, зашитых в коде игры:
 *   - скорость:  1 px/s = 0.225 км/ч  (PX_S_TO_SPEED_KMH, «50 км/ч = 222 px/s»)  -> 0.0625 м на px
 *   - геометрия: 1 px  = 0.105 м      (damageModel.PX_TO_METERS, седан 42 px = 4.4 м)
 * Метрики в отчёте считаются в обоих вариантах (см. conv()).
 */

// ---- заглушки браузерных глобалей (до импорта игровых модулей) ----
(globalThis as any).window = globalThis;
(globalThis as any).document = {
  createElement: () => ({ getContext: () => null, style: {}, addEventListener() {} }),
  addEventListener() {}, removeEventListener() {}, body: {}, documentElement: { style: {} }
};
(globalThis as any).localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
(globalThis as any).AudioContext = undefined;

// Виртуальные часы: игра использует performance.now() для кулдаунов урона (0.10 с). Симуляция в Node
// идёт быстрее реального времени, поэтому часы привязываем к игровому времени шага.
let virtualNowMs = 1_000_000;
Object.defineProperty(globalThis.performance, 'now', { configurable: true, writable: true, value: () => virtualNowMs });

// CRASH_SRC позволяет прогнать тот же стенд на пропатченной копии src (what-if для найденных багов).
const SRC = process.env.CRASH_SRC || '../../src';
const phys: typeof import('../../src/physics') = await import(`${SRC}/physics`);
const vh: typeof import('../../src/vehicleHelpers') = await import(`${SRC}/vehicleHelpers`);
const pw: typeof import('../../src/powertrainVariants') = await import(`${SRC}/powertrainVariants`);
const dm: typeof import('../../src/damageModel') = await import(`${SRC}/damageModel`);

/** Детерминированный ГСЧ (mulberry32): игра использует Math.random для искр/вероятностных отказов. */
export function seedRandom(seed: number) {
  let a = seed >>> 0;
  Math.random = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Vehicle = import('../../src/types').Vehicle;
export type GameWorld = import('../../src/types').GameWorld;

export const PX_S_TO_KMH = vh.PX_S_TO_SPEED_KMH;        // 0.225
export const KMH_TO_PX_S = vh.SPEED_KMH_TO_PX_S;        // 1/0.225
export const M_PER_PX = dm.PX_TO_METERS;                // 0.105
export const G = 9.81;

/** Перевод величин игры в «реальные» двумя способами. */
export const conv = {
  /** A: HUD-скорость = реальная скорость (км/ч), длина по геометрии кузова (0.105 м/px). */
  hud: {
    speedKmh: (pxs: number) => pxs * PX_S_TO_KMH,
    speedMs: (pxs: number) => pxs * PX_S_TO_KMH / 3.6,
    lenM: (px: number) => px * M_PER_PX,
    accelG: (pxs2: number) => (pxs2 * PX_S_TO_KMH / 3.6) / G   // a[px/s²] -> (км/ч/с)->м/с²->g
  },
  /** B: строго геометрический масштаб (скорость тоже 0.105 м/px) — «сколько энергии реально»/«как выглядит». */
  geo: {
    speedKmh: (pxs: number) => pxs * M_PER_PX * 3.6,
    speedMs: (pxs: number) => pxs * M_PER_PX,
    lenM: (px: number) => px * M_PER_PX,
    accelG: (pxs2: number) => (pxs2 * M_PER_PX) / G
  }
};

export const CAR_CONFIGS = vh.CAR_CONFIGS;

const NEUTRAL_INPUT: any = {
  forward: false, backward: false, left: false, right: false, handbrake: false, sprint: false,
  actionE: false, hornH: false, headlightsL: false, timeToggleT: false, cameraZoomC: false,
  minimapZoomM: false, resetR: false, turnLeftQ: false, turnRightZ: false, shiftUp: false,
  shiftDown: false, hazardX: false
};

export function makeWorld(): GameWorld {
  return {
    width: 4000, height: 4000, roads: [], intersections: [], buildings: [], parkings: [],
    trees: [], props: [], guardrails: [], vehicles: [], pedestrians: [], birds: [], puddles: [],
    litter: [], groundItems: [], skidMarks: [], stains: [], particles: [], weather: 'clear',
    pedestrianPaths: [], detachedParts: [], timeHour: 12, cleanMode: false
  } as any;
}

let vid = 0;
export function makeVehicle(type: string, x: number, y: number, angleRad: number, speedKmhHud: number): Vehicle {
  const cfg: any = CAR_CONFIGS[type];
  if (!cfg) throw new Error('unknown car type ' + type);
  const sp = speedKmhHud * KMH_TO_PX_S;
  const car: any = {
    id: `t${vid++}_${type}`, type, x, y, vx: Math.cos(angleRad) * sp, vy: Math.sin(angleRad) * sp,
    angle: angleRad, steerAngle: 0, targetSteerAngle: 0, speed: sp, lateralVelocity: 0,
    angularVelocity: 0, isDrifting: false, driftFactor: 0, mass: cfg.mass, width: cfg.width,
    length: cfg.length, wheelBase: cfg.wheelBase, color: '#3b82f6', roofColor: '#3b82f6',
    headlightsOn: false, headlightMode: 'low', brakeLightsOn: false, isReversing: false,
    turnSignal: 'none', turnSignalTimer: 0, isParked: false, isPlayerControlled: true,
    requiredFuel: 'ai95', hasGBO: false,
    engineState: vh.createDefaultEngineState(type as any, true, false),
    fuelSystem: vh.createDefaultFuelSystem(type as any, false),
    targetSpeed: 0, ghostingAlpha: 1.0, honkTimer: 0, isHonking: false, hornEffectTimer: 0,
    damage: vh.createDefaultVehicleDamage(cfg.length, cfg.width)
  };
  pw.applyPowertrain(car);
  return car as Vehicle;
}

export function makeWall(id: string, x: number, y: number, w: number, h: number): any {
  return { id, x, y, width: w, height: h, type: 'industrial', name: id };
}

export function makeProp(type: string, x: number, y: number, angle = 0): any {
  return { id: 'p_' + type + '_' + (vid++), x, y, angle, type };
}

export interface NodeSnap { ox: number; oy: number; x: number; y: number; ps: number; g: string }
export interface BeamSnap { a: number; b: number; broken: boolean; st: number }
export interface VehSnap {
  id: string; type: string; x: number; y: number; angle: number; vx: number; vy: number;
  w: number; l: number; wz: number;
  nodes: NodeSnap[]; beams: BeamSnap[];
  perim: { x: number; y: number }[]; // локальные координаты деформированного контура
  dmg: Record<string, number | boolean>;
}
export interface Frame { t: number; vehicles: VehSnap[]; props: { type: string; x: number; y: number; broken: boolean }[] }

function snapVehicle(v: any): VehSnap {
  const nb = v.damage?.nodeBeam;
  const dv = v.damage?.deformedVertices as any[] | undefined;
  const d = v.damage || {};
  return {
    id: v.id, type: v.type, x: v.x, y: v.y, angle: v.angle, vx: v.vx, vy: v.vy, w: v.width, l: v.length,
    wz: v.angularVelocity || 0,
    nodes: nb ? nb.nodes.map((n: any) => ({ ox: n.origX, oy: n.origY, x: n.x, y: n.y, ps: n.plasticStrain || 0, g: n.group })) : [],
    beams: nb ? nb.beams.map((b: any) => ({ a: b.nodeA, b: b.nodeB, broken: !!b.broken, st: b.currentStress || 0 })) : [],
    perim: dv ? dv.slice(0, 16).map(p => ({ x: p.localX + (p.offsetX || 0) + (p.elasticX || 0), y: p.localY + (p.offsetY || 0) + (p.elasticY || 0) })) : [],
    dmg: {
      frontCrumple: d.frontCrumple, rearCrumple: d.rearCrumple, leftDent: d.leftDent, rightDent: d.rightDent,
      hoodBuckled: !!d.hoodBuckled, windshieldCracked: !!d.windshieldCracked,
      radiator: !!v.engineState?.radiatorPunctured, oil: !!v.engineState?.oilPunctured,
      stalled: !v.engineState?.engineRunning, seized: !!v.engineState?.isSeized,
      tank: !!v.fuelSystem?.tankPunctured
    }
  };
}

export interface SimOptions {
  vehicles: Vehicle[];
  walls?: any[];
  props?: any[];
  dt?: number;           // шаг, с
  maxTime?: number;      // с симуляции всего
  settleAfterStop?: number; // с «послесвечения» после остановки всех машин
  record?: boolean;      // писать кадры
  recordEvery?: number;  // каждые N шагов
  stopWhenAllStopped?: boolean;
  seed?: number;
}

export interface Series {
  t: number[];
  /** по машине: скорость вдоль исходного курса (px/s, +вперёд), линейная скорость, угл. скорость */
  veh: {
    id: string; type: string; mass: number; length: number; width: number;
    vAlong0: number; // нач. скорость вдоль курса
    vx: number[]; vy: number[]; w: number[]; x: number[]; y: number[]; ang: number[];
    crushPeakFront: number[]; // dmg.frontCrumple во времени
    meshCrush: number[];      // макс. смещение узлов, px (по сетке)
  }[];
}

export interface SimResult {
  series: Series;
  frames: Frame[];
  firstContactT: number | null;
  world: GameWorld;
  dt: number;
}

function meshMaxDisp(v: any): number {
  const nb = v.damage?.nodeBeam;
  if (!nb) return 0;
  let m = 0;
  for (const n of nb.nodes) {
    if (n.group === 'wheel') continue;
    const d = Math.hypot(n.x - n.origX, n.y - n.origY);
    if (d > m) m = d;
  }
  return m;
}

export function simulate(opts: SimOptions): SimResult {
  const world = makeWorld();
  world.vehicles = opts.vehicles;
  world.buildings = opts.walls || [];
  world.props = opts.props || [];
  seedRandom(opts.seed ?? 12345);
  const dt = opts.dt ?? 1 / 240;
  const maxTime = opts.maxTime ?? 3.0;
  const settle = opts.settleAfterStop ?? 0.6;
  const rec = !!opts.record;
  const every = opts.recordEvery ?? 1;
  const player: any = { x: 0, y: 0, isInVehicle: false, currentVehicleId: null };

  const series: Series = { t: [], veh: opts.vehicles.map(v => ({
    id: v.id, type: v.type, mass: v.mass, length: v.length, width: v.width,
    vAlong0: v.speed, vx: [], vy: [], w: [], x: [], y: [], ang: [], crushPeakFront: [], meshCrush: []
  })) };
  const frames: Frame[] = [];
  const vehGrid = { queryRadius: () => world.vehicles };

  let t = 0, step = 0, firstContact: number | null = null, stoppedFor = 0;
  const clockBase = virtualNowMs + 5000; // каждый прогон стартует с «свежих» часов (без старых кулдаунов)
  while (t < maxTime) {
    virtualNowMs = clockBase + t * 1000;
    // запись состояния ДО шага
    series.t.push(t);
    opts.vehicles.forEach((v, i) => {
      const s = series.veh[i];
      s.vx.push(v.vx); s.vy.push(v.vy); s.w.push(v.angularVelocity || 0);
      s.x.push(v.x); s.y.push(v.y); s.ang.push(v.angle);
      s.crushPeakFront.push(v.damage?.frontCrumple ?? 0);
      s.meshCrush.push(meshMaxDisp(v));
    });
    if (rec && step % every === 0) {
      frames.push({
        t, vehicles: opts.vehicles.map(snapVehicle),
        props: world.props.map((p: any) => ({ type: p.type, x: p.x, y: p.y, broken: !!p.isBroken }))
      });
    }

    for (const v of opts.vehicles) {
      const nearby = world.buildings;
      const others = opts.vehicles.filter(o => o !== v);
      phys.updateVehiclePhysics(v, v.isPlayerControlled ? NEUTRAL_INPUT : null, world, nearby, others, dt, player);
    }
    if (world.props.length) phys.updateBreakablePropsAndLivingWorld(world, player, dt, vehGrid);
    world.particles.length = 0; // не копим искры/осколки

    if (firstContact === null && opts.vehicles.some(v => (v as any).activeCrumple || (v as any).lastDamageTime)) {
      firstContact = t;
    }
    const allStopped = opts.vehicles.every(v => Math.hypot(v.vx, v.vy) < 1.5 && Math.abs(v.angularVelocity || 0) < 0.05);
    if (firstContact !== null && allStopped) stoppedFor += dt; else stoppedFor = 0;
    t += dt; step++;
    if ((opts.stopWhenAllStopped ?? true) && stoppedFor >= settle) break;
  }
  return { series, frames, firstContactT: firstContact, world, dt };
}

/** Скользящее среднее (окно windowS секунд) — фильтр импульса, как CFC для краш-пульса. */
export function movingAvg(y: number[], dt: number, windowS: number): number[] {
  const n = Math.max(1, Math.round(windowS / dt));
  const out: number[] = new Array(y.length).fill(0);
  let acc = 0;
  for (let i = 0; i < y.length; i++) {
    acc += y[i];
    if (i >= n) acc -= y[i - n];
    out[i] = acc / Math.min(n, i + 1);
  }
  return out;
}

export function projectVel(vx: number[], vy: number[], dirx: number, diry: number): number[] {
  return vx.map((x, i) => x * dirx + vy[i] * diry);
}

export const dmgModel = dm;
export const physics = phys;

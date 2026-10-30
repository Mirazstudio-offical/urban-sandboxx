import type { BeamLinkType, BeamNodeType, BeamTemplate, NodeTemplate, VehicleNodeBeamDefinition, Vehicle } from '../types';
import { getVehicleBasePolygon } from '../vehicleArchetypes';

/**
 * ============================================================================
 * ГЕНЕРАТОР СОФТБОДИ-СЕТОК ИЗ КОНТУРА МОДЕЛИ
 * ============================================================================
 *
 * Сетка строится из той же геометрии, которую рисует рендерер (getVehicleBasePolygon),
 * а не из рукописных координат. Структура трёхуровневая:
 *
 *   Уровень 0 — КОЖА: узлы лежат ровно на контуре кузова (вершины контура + середины рёбер).
 *               Первые perimeterCount узлов — это кольцо кожи, по нему рендерер и коллизии
 *               сопоставляют вершины контура с узлами (mapPolyToDeformVerts).
 *   Уровень 1 — КАРКАС: ободья салона (лобовое основание, A/B/C-стойки, заднее окно/задний
 *               поперечный) и крыша-«звезда» в центре. Внутри кольца каркаса только
 *               радиальные связи от крыши до углов — никаких хорд через салон.
 *   Уровень 2 — ШАССИ: подрамники у осей, двигатель, центральный тоннель (fixed), промежуточные
 *               узлы лонжеронов.
 *
 * Связи добавляются жадно: сначала обязательные (кольца, лонжероны, звезда крыши), затем
 * опциональные (отказы/замки, триангуляция кожа↔каркас, каркас↔шасси, шасси↔шасси).
 * Опциональная связь принимается только если:
 *   - не пересекает уже принятые связи (планарность: ничего не проходит «сквозь» другую балку);
 *   - не проходит через другой узел (нет T-стыков);
 *   - лежит внутри контура кузова;
 *   - не длиннее допустимого для своей пары уровней (нет связей «через весь кузов»).
 * Разрешённые пары уровней: кожа↔кожа — только соседи по кольцу; кожа↔каркас; каркас↔каркас —
 * только кольцо и крыша; каркас↔шасси; шасси↔шасси; кожа↔шасси — только замки.
 */

export type V2 = { x: number; y: number };

/** Якоря семейства кузова. Продольные — доли длины (+0.5 перед, -0.5 зад). */
export interface BodyFamilySpec {
  presetId: string;
  name: string;
  /** Тип машины, по контуру которого строится сетка (его рисует рендерер). */
  repType: string;
  /** Габариты в px, как в CAR_CONFIGS. Сетка масштабируется по ним. */
  length: number;
  width: number;
  /** Передний край (бампер) и основание капота/лобового. */
  xNose: number;
  xCowl: number;
  /** Основания A-, B- и C-стоек, задний край каркаса крыши (багажник/кузов). */
  xA: number;
  xB: number;
  xC: number;
  xRearHeader: number;
  /** Задний край (бампер). */
  xTail: number;
  /** Оси и силовые узлы шасси. */
  xFrontAxle: number;
  xRearAxle: number;
  xEngine: number;
  xCore: number;
  /** Ширина каркаса и лонжеронов как доля ширины контура на том же x. */
  frameRatio?: number;
  railRatio?: number;
  /** Потолок полуширины каркаса как доля ширины машины — для кузовов со ступенькой (узкая рама под широкой кабиной). */
  frameMaxHalfWidth?: number;
}

export interface BodyMeshReport {
  presetId: string;
  skinNodes: number;
  frameNodes: number;
  chassisNodes: number;
  beams: number;
  crossings: number;
  nodesNearBeams: number;
  beamsOutsideBody: number;
  skinChords: number;
  isolatedNodes: number;
  disconnected: boolean;
  rejectedForced: string[];
  rejectedOptional: number;
  maxBeamLength: number;
}

type EdgeKind = 'ring' | 'frame' | 'roof' | 'rib' | 'rail' | 'frameChassis' | 'chassis' | 'latch';

interface NodeDraft {
  x: number;
  y: number;
  level: 0 | 1 | 2;
  group: BeamNodeType;
  weight: number;
  isFixed?: boolean;
  name: string;
}

interface EdgeDraft {
  a: number;
  b: number;
  kind: EdgeKind;
  partTag?: BeamTemplate['partTag'];
  yieldOverride?: number;
}

// --- Геометрия -------------------------------------------------------------------------

function cross(o: V2, a: V2, b: V2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Строгое пересечение отрезков (касания концами не считаются). */
function segmentsCrossProperly(p1: V2, p2: V2, q1: V2, q2: V2): boolean {
  const d1 = cross(p1, p2, q1);
  const d2 = cross(p1, p2, q2);
  const d3 = cross(q1, q2, p1);
  const d4 = cross(q1, q2, p2);
  return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) &&
         ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
}

function pointSegmentDistance(p: V2, a: V2, b: V2): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
}

function pointInPolygon(p: V2, poly: V2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Полуширина контура на продольной координате x для заданной стороны (sign = +1 или -1). */
function outlineHalfWidthAt(poly: V2[], x: number, sign: 1 | -1): number {
  let best = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a.x - x) * (b.x - x) > 0) continue;
    const t = Math.abs(b.x - a.x) < 1e-9 ? 0 : (x - a.x) / (b.x - a.x);
    if (t < -1e-9 || t > 1 + 1e-9) continue;
    const y = a.y + (b.y - a.y) * t;
    if (Math.sign(y) === sign) best = Math.max(best, Math.abs(y));
  }
  return best;
}

// --- Классификация зон кожи ------------------------------------------------------------

function skinGroup(spec: BodyFamilySpec, xf: number, yf: number): BeamNodeType {
  if (xf >= spec.xNose - 0.08) return 'bumper';
  if (xf >= spec.xCowl) return Math.abs(yf) <= 0.3 ? 'hood' : 'fender';
  if (xf >= spec.xA) return Math.abs(yf) <= 0.25 ? 'windshield' : 'fender';
  if (xf >= spec.xB + 0.02) return 'door';
  if (xf >= spec.xC) return Math.abs(xf - spec.xB) < 0.04 ? 'pillar' : 'door';
  if (xf > spec.xTail + 0.08) return Math.abs(yf) <= 0.25 ? 'trunk' : 'quarter';
  return 'bumper';
}

// --- Построение сетки ------------------------------------------------------------------

const EDGE_PARAMS: Record<EdgeKind, { type: BeamLinkType; spring: number; damp: number; yieldDist: number; breakDist: number }> = {
  ring:         { type: 'structural',  spring: 5600, damp: 85,  yieldDist: 0.25, breakDist: 9 },
  frame:        { type: 'structural',  spring: 3080, damp: 85,  yieldDist: 0.48, breakDist: 18 },
  roof:         { type: 'structural',  spring: 3080, damp: 85,  yieldDist: 0.48, breakDist: 18 },
  rib:          { type: 'structural',  spring: 2800, damp: 85,  yieldDist: 0.45, breakDist: 16 },
  rail:         { type: 'chassis_rail', spring: 5200, damp: 150, yieldDist: 0.70, breakDist: 26 },
  frameChassis: { type: 'support',     spring: 3400, damp: 90,  yieldDist: 0.80, breakDist: 40 },
  chassis:      { type: 'chassis_rail', spring: 4400, damp: 130, yieldDist: 0.60, breakDist: 22 },
  latch:        { type: 'latch',       spring: 2200, damp: 75,  yieldDist: 0.40, breakDist: 6.5 }
};

const NODE_NEAR_EPS = 0.8;

class BodyGraph {
  readonly nodes: NodeDraft[] = [];
  readonly edges: EdgeDraft[] = [];
  readonly rejectedForced: string[] = [];
  rejectedOptional = 0;
  private readonly keys = new Set<string>();

  constructor(private readonly poly: V2[], readonly skinCount: number) {}

  private key(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  /** Пытается добавить связь. Возвращает true, если связь есть в графе после вызова. */
  add(a: number, b: number, kind: EdgeKind, opts: { forced?: boolean; cap?: number; partTag?: BeamTemplate['partTag'] } = {}): boolean {
    if (a === b) return false;
    const k = this.key(a, b);
    if (this.keys.has(k)) return true;
    const A = this.nodes[a], B = this.nodes[b];
    const len = Math.hypot(A.x - B.x, A.y - B.y);
    const label = `${A.name} ↔ ${B.name} (${kind})`;
    const fail = (reason: string): false => {
      if (opts.forced) this.rejectedForced.push(`${label}: ${reason}`);
      else this.rejectedOptional++;
      return false;
    };
    if (opts.cap !== undefined && len > opts.cap) return fail('длиннее допустимого');
    const pa = { x: A.x, y: A.y }, pb = { x: B.x, y: B.y };
    if (kind !== 'ring' && !pointInPolygon({ x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }, this.poly)) return fail('выходит за контур');
    for (const e of this.edges) {
      const ea = this.nodes[e.a], eb = this.nodes[e.b];
      if (e.a === a || e.a === b || e.b === a || e.b === b) continue;
      if (segmentsCrossProperly(pa, pb, { x: ea.x, y: ea.y }, { x: eb.x, y: eb.y })) return fail(`пересекает ${ea.name} ↔ ${eb.name}`);
    }
    for (let i = 0; i < this.nodes.length; i++) {
      if (i === a || i === b) continue;
      const n = this.nodes[i];
      if (pointSegmentDistance({ x: n.x, y: n.y }, pa, pb) < NODE_NEAR_EPS) return fail(`проходит через узел ${n.name}`);
    }
    this.edges.push({ a, b, kind, partTag: opts.partTag });
    this.keys.add(k);
    return true;
  }
}

function buildSkinNodes(spec: BodyFamilySpec, poly: V2[], g: BodyGraph): void {
  const N = poly.length;
  const pushSkin = (p: V2, name: string) => {
    const xf = p.x / spec.length, yf = p.y / spec.width;
    g.nodes.push({ x: p.x, y: p.y, level: 0, group: skinGroup(spec, xf, yf), weight: 1, name });
  };
  for (let i = 0; i < N; i++) {
    const a = poly[i], b = poly[(i + 1) % N];
    pushSkin(a, `Skin ${2 * i}`);
    pushSkin({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, `Skin mid ${2 * i + 1}`);
  }
  for (let i = 0; i < g.nodes.length; i++) {
    const n = g.nodes[i];
    if (n.group === 'bumper') n.weight = 1.4;
  }
}

interface FrameIds { center: number; A: [number, number]; B: [number, number]; C: [number, number]; rearHeader: number; ring: number[] }

function buildFrame(spec: BodyFamilySpec, poly: V2[], g: BodyGraph): FrameIds {
  const fr = spec.frameRatio ?? 0.78;
  const { length: L } = spec;
  const cap = spec.frameMaxHalfWidth !== undefined ? spec.frameMaxHalfWidth * spec.width : Infinity;
  const side = (x: number, s: 1 | -1) => ({ x, y: s * Math.min(fr * outlineHalfWidthAt(poly, x, s), cap) });
  const xs = { cowl: spec.xCowl * L, A: spec.xA * L, B: spec.xB * L, C: spec.xC * L, rh: spec.xRearHeader * L };
  const add = (x: number, y: number, name: string, group: BeamNodeType, weight: number): number => {
    g.nodes.push({ x, y, level: 1, group, weight, name });
    return g.nodes.length - 1;
  };
  const center = add(xs.cowl, 0, 'Frame windshield base', 'windshield', 0.8);
  const A = [add(xs.A, side(xs.A, 1).y, 'Frame A-pillar R', 'pillar', 1), add(xs.A, side(xs.A, -1).y, 'Frame A-pillar L', 'pillar', 1)] as [number, number];
  const B = [add(xs.B, side(xs.B, 1).y, 'Frame B-pillar R', 'pillar', 1), add(xs.B, side(xs.B, -1).y, 'Frame B-pillar L', 'pillar', 1)] as [number, number];
  const C = [add(xs.C, side(xs.C, 1).y, 'Frame C-pillar R', 'pillar', 1), add(xs.C, side(xs.C, -1).y, 'Frame C-pillar L', 'pillar', 1)] as [number, number];
  const rearHeader = add(xs.rh, 0, 'Frame rear header', 'trunk', 0.8);
  const ring = [center, A[0], B[0], C[0], rearHeader, C[1], B[1], A[1]];
  return { center, A, B, C, rearHeader, ring };
}

interface ChassisIds { FL: number; FR: number; RL: number; RR: number; eng: number; core: number; mL: number; mR: number }

function buildChassis(spec: BodyFamilySpec, poly: V2[], ring: V2[], g: BodyGraph): ChassisIds {
  const rr = spec.railRatio ?? 0.42;
  const { length: L } = spec;
  // Лонжероны и подрамники под каркасом не должны выходить за его кольцо: иначе они
  // пересекают стойки и крышу в проекции. Внутри кольца их ширина ограничена 0.7 ширины каркаса.
  const hw = (x: number, s: 1 | -1) => {
    const outer = rr * outlineHalfWidthAt(poly, x, s);
    const inner = outlineHalfWidthAt(ring, x, s);
    return s * (inner > 0 ? Math.min(outer, 0.7 * inner) : outer);
  };
  const add = (x: number, y: number, name: string, group: BeamNodeType, weight: number, isFixed = false): number => {
    g.nodes.push({ x, y, level: 2, group, weight, isFixed, name });
    return g.nodes.length - 1;
  };
  const xFA = spec.xFrontAxle * L, xRA = spec.xRearAxle * L, xE = spec.xEngine * L, xC = spec.xCore * L;
  const FL = add(xFA, hw(xFA, -1), 'Front subframe L', 'subframe', 0.05);
  const FR = add(xFA, hw(xFA, 1), 'Front subframe R', 'subframe', 0.05);
  const RL = add(xRA, hw(xRA, -1), 'Rear subframe L', 'subframe', 0.05);
  const RR = add(xRA, hw(xRA, 1), 'Rear subframe R', 'subframe', 0.05);
  const eng = add(xE, 0, 'Engine block', 'engine', 0.18);
  const core = add(xC, 0, 'Chassis core tunnel', 'chassis_core', 0.12, true);
  const mL = add(xC, hw(xC, -1), 'Rail mid L', 'subframe', 0.02);
  const mR = add(xC, hw(xC, 1), 'Rail mid R', 'subframe', 0.02);
  return { FL, FR, RL, RR, eng, core, mL, mR };
}

/** Все пары узлов заданных уровней, отсортированные по длине. */
function pairsSortedByLength(g: BodyGraph, levelsA: number[], levelsB: number[], sameLevel: boolean): [number, number][] {
  const out: [number, number][] = [];
  const n = g.nodes.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const A = g.nodes[i], B = g.nodes[j];
      const okPair = sameLevel
        ? levelsA.includes(A.level) && A.level === B.level
        : (levelsA.includes(A.level) && levelsB.includes(B.level)) || (levelsA.includes(B.level) && levelsB.includes(A.level));
      if (okPair) out.push([i, j]);
    }
  }
  const len = (p: [number, number]) => Math.hypot(g.nodes[p[0]].x - g.nodes[p[1]].x, g.nodes[p[0]].y - g.nodes[p[1]].y);
  return out.sort((p, q) => len(p) - len(q));
}

function findNearest(g: BodyGraph, pred: (n: NodeDraft, i: number) => boolean, target: V2): number {
  let best = -1, bestD = Infinity;
  g.nodes.forEach((n, i) => {
    if (!pred(n, i)) return;
    const d = Math.hypot(n.x - target.x, n.y - target.y);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

function argExtreme(ids: number[], key: (i: number) => number, max: boolean): number {
  if (ids.length === 0) return -1;
  let best = ids[0], bestV = key(ids[0]);
  for (const i of ids) {
    const v = key(i);
    if (max ? v > bestV : v < bestV) { bestV = v; best = i; }
  }
  return best;
}

export function generateBodyMesh(input: BodyFamilySpec): { def: VehicleNodeBeamDefinition; report: BodyMeshReport } {
  const raw = getVehicleBasePolygon({ type: input.repType } as Vehicle, input.length / 2, input.width / 2, 0, 0, 0, 0, 0, 0, 0, 0);
  // Вершины ближе 1.8 px дают рёбра кожи короче порога точности узлов — схлопываем их.
  const poly: V2[] = [];
  for (const p of raw) {
    const q = poly[poly.length - 1];
    if (!q || Math.hypot(p.x - q.x, p.y - q.y) >= 1.8) poly.push(p);
  }
  // Передний и задний край берём по реальному контуру модели: бампер — там, где контур заканчивается.
  const frontExt = Math.max(...poly.map(p => p.x)) / input.length;
  const rearExt = Math.min(...poly.map(p => p.x)) / input.length;
  const spec: BodyFamilySpec = { ...input, xNose: Math.min(input.xNose, frontExt), xTail: Math.max(input.xTail, rearExt) };

  const order = [spec.xNose, spec.xCowl, spec.xA, spec.xB, spec.xC, spec.xRearHeader, spec.xTail];
  for (let i = 1; i < order.length; i++) {
    if (!(order[i - 1] >= order[i])) throw new Error(`${spec.presetId}: продольные якоря не убывают (${order.join(', ')})`);
  }

  const g = new BodyGraph(poly, poly.length * 2);
  buildSkinNodes(spec, poly, g);
  const S = g.skinCount;
  const frame = buildFrame(spec, poly, g);
  const ringPts: V2[] = frame.ring.map(i => ({ x: g.nodes[i].x, y: g.nodes[i].y }));
  const chassis = buildChassis(spec, poly, ringPts, g);

  // --- 1. Обязательная структура: кольцо кожи и кольцо каркаса ---
  for (let i = 0; i < S; i++) g.add(i, (i + 1) % S, 'ring', { forced: true });
  for (let i = 0; i < frame.ring.length; i++) {
    g.add(frame.ring[i], frame.ring[(i + 1) % frame.ring.length], 'frame', { forced: true });
  }

  // --- 2. Замки: панели ↔ опоры. Идут раньше триангуляции, чтобы не быть перекрытыми ---
  const skinIds = Array.from({ length: S }, (_, i) => i);
  const yOf = (i: number) => g.nodes[i].y;
  const xOf = (i: number) => g.nodes[i].x;
  const bumperFront = skinIds.filter(i => g.nodes[i].group === 'bumper' && xOf(i) > 0);
  const bumperRear = skinIds.filter(i => g.nodes[i].group === 'bumper' && xOf(i) <= 0);
  const latchCap = spec.length * 0.7;

  const frontCenter = argExtreme(bumperFront, xOf, true);
  if (frontCenter >= 0) g.add(frontCenter, chassis.eng, 'latch', { partTag: 'front_bumper', cap: latchCap });
  for (const s of [1, -1] as const) {
    const side = bumperFront.filter(i => Math.sign(yOf(i)) === s);
    if (side.length) {
      const corner = argExtreme(side, xOf, true);
      g.add(corner, s > 0 ? chassis.FR : chassis.FL, 'latch', { partTag: 'front_bumper', cap: latchCap });
    }
    const rearSide = bumperRear.filter(i => Math.sign(yOf(i)) === s);
    if (rearSide.length) {
      const corner = argExtreme(rearSide, xOf, false);
      g.add(corner, s > 0 ? chassis.RR : chassis.RL, 'latch', { partTag: 'rear_bumper', cap: latchCap });
    }
  }

  const hoodIds = skinIds.filter(i => g.nodes[i].group === 'hood');
  if (hoodIds.length) g.add(argExtreme(hoodIds, xOf, true), frame.center, 'latch', { partTag: 'hood', cap: spec.length * 0.6 });

  for (const s of [1, -1] as const) {
    const doorTarget = frame.A[s > 0 ? 0 : 1];
    const doorIds = skinIds.filter(i => Math.sign(yOf(i)) === s && (g.nodes[i].group === 'door' || g.nodes[i].group === 'fender'));
    if (doorIds.length) {
      const door = findNearest(g, (_n, i) => doorIds.includes(i), { x: g.nodes[doorTarget].x, y: g.nodes[doorTarget].y });
      if (door >= 0) g.add(door, doorTarget, 'latch', { partTag: s > 0 ? 'door_fr' : 'door_fl', cap: spec.width * 0.8 });
    }
  }

  const trunkIds = skinIds.filter(i => g.nodes[i].group === 'trunk');
  if (trunkIds.length) g.add(argExtreme(trunkIds, xOf, false), frame.rearHeader, 'latch', { partTag: 'trunk', cap: spec.length * 0.6 });

  // --- 3. Шасси: лонжероны, затем связи шасси с каркасом (до кожи, чтобы не перекрыть их) ---
  const railPairs: [number, number][] = [
    [chassis.FL, chassis.mL], [chassis.mL, chassis.RL],
    [chassis.FR, chassis.mR], [chassis.mR, chassis.RR],
    [chassis.eng, chassis.core], [chassis.core, chassis.mL], [chassis.core, chassis.mR],
    [chassis.eng, chassis.FL], [chassis.eng, chassis.FR], [chassis.FL, chassis.FR], [chassis.RL, chassis.RR]
  ];
  // Лонжероны и поперечины не длиннее 30% кузова: длинная связь проходит «через весь кузов».
  const chassisCap = spec.length * 0.3;
  for (const [a, b] of railPairs) g.add(a, b, 'rail', { cap: chassisCap });
  for (const [a, b] of pairsSortedByLength(g, [2], [1], false)) g.add(a, b, 'frameChassis', { cap: chassisCap });
  for (const [a, b] of pairsSortedByLength(g, [2], [2], true)) g.add(a, b, 'chassis', { cap: chassisCap });

  // --- 4. Кожа↔каркас: кольцо между панелью и каркасом заполняется последним ---
  for (const [a, b] of pairsSortedByLength(g, [0], [1], false)) g.add(a, b, 'rib', { cap: spec.length * 0.5 });

  // --- 5. Масса и выпуск в BeamTemplate ---
  const totalW = g.nodes.reduce((s, n) => s + n.weight, 0);
  const nodes: NodeTemplate[] = g.nodes.map((n, i) => {
    const xf = n.x / spec.length, yf = n.y / spec.width;
    return {
      id: i, xFrac: xf, yFrac: yf, group: n.group,
      massFrac: n.weight / totalW, isFixed: n.isFixed || undefined, name: n.name
    };
  });
  const beams: BeamTemplate[] = g.edges.map(e => {
    const p = EDGE_PARAMS[e.kind];
    let yieldDist = p.yieldDist;
    if (e.kind === 'ring') {
      const isBumper = g.nodes[e.a].group === 'bumper' || g.nodes[e.b].group === 'bumper';
      yieldDist = isBumper ? 0.175 : 0.25;
    }
    return {
      nodeA: e.a, nodeB: e.b, type: p.type, spring: p.spring, damp: p.damp,
      yieldDist, breakDist: p.breakDist, partTag: e.partTag
    };
  });

  // --- 6. Трекинг (узлы для зон деформации, подрамников, двигателя) ---
  const frontBumperIds = bumperFront;
  const rearBumperIds = bumperRear;
  const frontCenterId = argExtreme(frontBumperIds, xOf, true);
  const frontRightId = argExtreme(frontBumperIds, yOf, true);
  const frontLeftId = argExtreme(frontBumperIds, yOf, false);
  const rearCenterId = argExtreme(rearBumperIds, xOf, false);
  const rearRightId = argExtreme(rearBumperIds, yOf, true);
  const rearLeftId = argExtreme(rearBumperIds, yOf, false);
  const sideIds = (s: 1 | -1, xs: number[]) => xs.map(x => {
    const hw = outlineHalfWidthAt(poly, x, s);
    return findNearest(g, (n, i) => i < S && Math.sign(n.y) === s, { x, y: s * hw });
  });
  const L = spec.length;
  const leftIds = sideIds(-1, [spec.xB * L, (spec.xA + spec.xB) / 2 * L, (spec.xB + spec.xC) / 2 * L]);
  const rightIds = sideIds(1, [spec.xB * L, (spec.xA + spec.xB) / 2 * L, (spec.xB + spec.xC) / 2 * L]);

  const def: VehicleNodeBeamDefinition = {
    presetId: spec.presetId,
    name: spec.name,
    perimeterCount: S,
    nodes,
    beams,
    tracking: {
      frontNodeIds: [frontCenterId, frontRightId, frontLeftId],
      rearNodeIds: [rearRightId, rearCenterId, rearLeftId],
      leftNodeIds: leftIds,
      rightNodeIds: rightIds,
      subframeLeftFL: chassis.FL,
      subframeRightFR: chassis.FR,
      subframeLeftRL: chassis.RL,
      subframeRightRR: chassis.RR,
      engineNodeId: chassis.eng,
      chassisCoreNodeId: chassis.core
    }
  };

  const pxPositions: V2[] = g.nodes.map(n => ({ x: n.x, y: n.y }));
  const report = validateBodyMesh(def, poly, pxPositions);
  report.rejectedForced = g.rejectedForced;
  report.rejectedOptional = g.rejectedOptional;
  report.frameNodes = g.nodes.filter(n => n.level === 1).length;
  report.chassisNodes = g.nodes.filter(n => n.level === 2).length;
  return { def, report };
}

// --- Валидация -------------------------------------------------------------------------

/** Проверяет готовую сетку по её позициям в px. Используется генератором и аудитом. */
export function validateBodyMesh(def: VehicleNodeBeamDefinition, poly: V2[], pos: V2[]): BodyMeshReport {
  const S = def.perimeterCount;
  const bs = def.beams;
  let crossings = 0, beamsOutside = 0, skinChords = 0, maxLen = 0;

  for (const b of bs) {
    maxLen = Math.max(maxLen, Math.hypot(pos[b.nodeA].x - pos[b.nodeB].x, pos[b.nodeA].y - pos[b.nodeB].y));
    const isRing = b.nodeA < S && b.nodeB < S && (Math.abs(b.nodeA - b.nodeB) === 1 || Math.abs(b.nodeA - b.nodeB) === S - 1);
    if (b.nodeA < S && b.nodeB < S && !isRing) skinChords++;
    if (isRing) continue;
    const mid = { x: (pos[b.nodeA].x + pos[b.nodeB].x) / 2, y: (pos[b.nodeA].y + pos[b.nodeB].y) / 2 };
    if (!pointInPolygon(mid, poly)) beamsOutside++;
  }

  for (let i = 0; i < bs.length; i++) {
    const A = bs[i];
    for (let j = i + 1; j < bs.length; j++) {
      const B = bs[j];
      if (new Set([A.nodeA, A.nodeB, B.nodeA, B.nodeB]).size < 4) continue;
      if (segmentsCrossProperly(pos[A.nodeA], pos[A.nodeB], pos[B.nodeA], pos[B.nodeB])) crossings++;
    }
  }

  let nodesNearBeams = 0;
  for (const A of bs) {
    for (let k = 0; k < pos.length; k++) {
      if (k === A.nodeA || k === A.nodeB) continue;
      if (pointSegmentDistance(pos[k], pos[A.nodeA], pos[A.nodeB]) < NODE_NEAR_EPS) nodesNearBeams++;
    }
  }

  const deg = new Array(pos.length).fill(0);
  const adj: number[][] = pos.map(() => []);
  for (const b of bs) {
    deg[b.nodeA]++; deg[b.nodeB]++;
    adj[b.nodeA].push(b.nodeB); adj[b.nodeB].push(b.nodeA);
  }
  const seen = new Set<number>([0]);
  const stack = [0];
  while (stack.length) {
    const v = stack.pop()!;
    for (const w of adj[v]) if (!seen.has(w)) { seen.add(w); stack.push(w); }
  }

  return {
    presetId: def.presetId,
    skinNodes: S,
    frameNodes: 0,
    chassisNodes: 0,
    beams: bs.length,
    crossings,
    nodesNearBeams,
    beamsOutsideBody: beamsOutside,
    skinChords,
    isolatedNodes: deg.filter(d => d < 2).length,
    disconnected: seen.size !== pos.length,
    rejectedForced: [],
    rejectedOptional: 0,
    maxBeamLength: maxLen
  };
}

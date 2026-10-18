import { BeamLink, NodeBeamStructure, Vehicle } from './types';
import { createVehicleNodeBeamSystem } from './nodeBeamPhysics';

/**
 * ============================================================================
 * TRUE 2D WORLD-SPACE SOFT-BODY VEHICLE (PBD)
 * ============================================================================
 *
 * Здесь нет отдельного «жёсткого кузова», который едет сам по себе:
 *
 *  - все узлы живут в мировых координатах и имеют массу;
 *  - балки решаются position-based dynamics (XPBD-подобные distance constraints)
 *    с упругопластической длиной покоя и разрывом;
 *  - поза автомобиля (x, y, angle, vx, vy, omega) выводится из жёсткого
 *    выравнивания узлов силового ядра, а не интегрируется отдельно;
 *  - шинные силы прикладываются к мировым позициям ступиц, поэтому колесо
 *    реально тянет кузов через балки подвески;
 *  - удары прикладываются к узлам, а контакт со стеной/столбом — позиционное
 *    ограничение для узлов.
 *
 * Это 2D-модель: нет крена/тангажа/вертикальной подвески, но в плоскости
 * машина является настоящей soft-body сеткой, а не кинематической оболочкой.
 */

const SUBSTEP = 1 / 120;
const MAX_SUBSTEPS = 8;
const CONSTRAINT_ITERATIONS = 24;
const SELF_COLLISION_DIST = 1.6;
const MAX_NODE_SPEED = 3200;
const VELOCITY_DAMPING = 0.9995;
const SHAPE_MATCH_STRENGTH = 0.85;

/** Набор пар узлов, уже соединённых балкой: для self-collision их не толкаем. */
const beamPairCache = new WeakMap<NodeBeamStructure, Set<number>>();

function pairKey(a: number, b: number): number {
  return a < b ? a * 10000 + b : b * 10000 + a;
}

function getBeamPairs(system: NodeBeamStructure): Set<number> {
  let set = beamPairCache.get(system);
  if (set) return set;
  set = new Set<number>();
  for (const b of system.beams) set.add(pairKey(b.nodeA, b.nodeB));
  beamPairCache.set(system, set);
  return set;
}

function wrapAngle(a: number): number {
  return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}

function finite(v: number, fallback = 0): number {
  return Number.isFinite(v) ? v : fallback;
}

/** Создаёт/пересобирает полностью динамическую сетку для машины. */
export function ensureSoftBodyMesh(vehicle: Vehicle): NodeBeamStructure {
  if (!vehicle.damage) {
    vehicle.damage = { nodeBeam: undefined } as any;
  }
  const existing = vehicle.damage.nodeBeam;
  if (existing && existing.softBody && existing.nodes.length >= 8 && existing.coreNodeIndices && existing.wheelNodeIndices) {
    return existing;
  }
  const system = createVehicleNodeBeamSystem({
    type: vehicle.type,
    length: vehicle.length,
    width: vehicle.width,
    mass: vehicle.mass,
    customMeshConfig: vehicle.customMeshConfig,
    softBody: true
  });
  vehicle.damage.nodeBeam = system;
  return system;
}

/** Инициализирует мировые позиции узлов из текущей позы кузова. */
function initializeWorld(system: NodeBeamStructure, car: Vehicle): void {
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  const omega = finite(car.angularVelocity);
  for (let i = 0; i < system.nodes.length; i++) {
    const n = system.nodes[i];
    const lx = n.origX;
    const ly = n.origY;
    const rx = cosA * lx - sinA * ly;
    const ry = sinA * lx + cosA * ly;
    n.x = car.x + rx;
    n.y = car.y + ry;
    n.vx = finite(car.vx) - omega * ry;
    n.vy = finite(car.vy) + omega * rx;
    n.fx = 0;
    n.fy = 0;
    n.offsetX = 0;
    n.offsetY = 0;
    n.localX = lx;
    n.localY = ly;
    n.elasticX = 0;
    n.elasticY = 0;
  }
  system.worldInitialized = true;
  system.poseX = car.x;
  system.poseY = car.y;
  system.poseAngle = car.angle;
  system.poseVx = car.vx;
  system.poseVy = car.vy;
  system.poseOmega = car.angularVelocity;
  system.timeAccumulator = 0;
}

/**
 * Если внешний код (респавн, буксировка, ИИ, коррекция коллизии) сдвинул
 * car.x/y/angle, переносим на ту же дельту всю world-space сетку.
 */
function syncExternalPose(system: NodeBeamStructure, car: Vehicle): void {
  if (!system.worldInitialized) {
    initializeWorld(system, car);
    return;
  }
  const px = finite(system.poseX as number, car.x);
  const py = finite(system.poseY as number, car.y);
  const pa = finite(system.poseAngle as number, car.angle);
  const dx = car.x - px;
  const dy = car.y - py;
  const da = wrapAngle(car.angle - pa);
  if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4 && Math.abs(da) < 1e-5) return;

  const c = Math.cos(da);
  const s = Math.sin(da);
  for (let i = 0; i < system.nodes.length; i++) {
    const n = system.nodes[i];
    const rx = n.x - px;
    const ry = n.y - py;
    n.x = car.x + c * rx - s * ry;
    n.y = car.y + s * rx + c * ry;
    const vx = n.vx;
    const vy = n.vy;
    n.vx = c * vx - s * vy;
    n.vy = s * vx + c * vy;
  }
  system.poseX = car.x;
  system.poseY = car.y;
  system.poseAngle = car.angle;
}

function beamStiffness(beam: BeamLink): number {
  switch (beam.type) {
    case 'chassis_rail': return 1.0;
    case 'structural': return 0.90;
    case 'cross': return 0.88;
    case 'support': return 1.0;
    case 'latch': return 0.70;
    default: return 0.90;
  }
}

/** Упругопластическое обновление длины покоя + проверка разрыва. */
function updateBeamPlasticity(beam: BeamLink, len: number): void {
  const rest = beam.restLength;
  if (!Number.isFinite(rest) || rest <= 0) {
    beam.restLength = beam.origLength;
    return;
  }
  if (beam.type === 'support' && len > rest) return;

  const diff = len - rest;
  if (diff < 0) {
    // Сжатие: металл складывается, длина покоя ползёт к текущей.
    const crush = -diff;
    const floor = beam.origLength * 0.14;
    if (crush > beam.yieldDist && rest > floor) {
      const rate = beam.type === 'chassis_rail' ? 0.18 : 0.32;
      beam.restLength = Math.max(floor, rest - crush * rate);
      beam.plasticDeform = (beam.plasticDeform || 0) - crush * rate;
      beam.currentStress = crush / beam.origLength;
    }
  } else {
    const maxRest = beam.origLength * 1.35;
    if (diff > beam.yieldDist * 2.5 && rest < maxRest) {
      const rate = beam.type === 'chassis_rail' ? 0.10 : 0.18;
      beam.restLength = Math.min(maxRest, rest + diff * rate);
      beam.plasticDeform = (beam.plasticDeform || 0) + diff * rate;
      beam.currentStress = diff / beam.origLength;
    }
  }

  const strain = Math.abs(len - beam.restLength) / Math.max(0.001, beam.origLength);
  beam.currentStress = strain;
  if (Math.abs(len - beam.restLength) > beam.breakDist) {
    beam.broken = true;
  }
}

function solveBeams(system: NodeBeamStructure): void {
  const nodes = system.nodes;
  for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
    for (let bi = 0; bi < system.beams.length; bi++) {
      const beam = system.beams[bi];
      if (beam.broken) continue;
      const nA = nodes[beam.nodeA];
      const nB = nodes[beam.nodeB];
      if (!nA || !nB) continue;

      let dx = nB.x - nA.x;
      let dy = nB.y - nA.y;
      let len = Math.hypot(dx, dy);
      if (len < 1e-6) {
        dx = 1;
        dy = 0;
        len = 1;
      }
      if (iter === 0) {
        updateBeamPlasticity(beam, len);
        const stress = beam.currentStress || 0;
        if (stress > 0.05) {
          const add = Math.min(0.35, stress * 0.25);
          nA.plasticStrain = Math.min(4, (nA.plasticStrain || 0) + add);
          nB.plasticStrain = Math.min(4, (nB.plasticStrain || 0) + add);
        }
      }
      if (beam.broken) continue;
      if (beam.type === 'support' && len > beam.restLength) continue;

      const nx = dx / len;
      const ny = dy / len;
      const wA = 1 / Math.max(1, nA.mass);
      const wB = 1 / Math.max(1, nB.mass);
      const wSum = wA + wB;
      if (wSum <= 0) continue;
      const correction = (len - beam.restLength) * beamStiffness(beam) / wSum;
      const cx = nx * correction;
      const cy = ny * correction;
      nA.x += cx * wA;
      nA.y += cy * wA;
      nB.x -= cx * wB;
      nB.y -= cy * wB;
    }
  }
}

/** Не даём противоположным бортам пройти друг сквозь друга. */
function solveSelfCollision(system: NodeBeamStructure): void {
  const nodes = system.nodes;
  const connected = getBeamPairs(system);
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      if (a.group === 'wheel' || b.group === 'wheel') continue;
      if (connected.has(pairKey(i, j))) continue;
      const restDx = a.origX - b.origX;
      const restDy = a.origY - b.origY;
      if (Math.hypot(restDx, restDy) < 3.0) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= SELF_COLLISION_DIST || dist < 1e-6) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const push = (SELF_COLLISION_DIST - dist) * 0.5;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
    }
  }
}

/** Контакт узлов с препятствием текущего активного удара. */
function solveWorldContact(system: NodeBeamStructure, car: Vehicle): void {
  const c = car.activeCrumple;
  if (!c || c.timer <= 0) return;
  if (!Number.isFinite(c.normalX) || !Number.isFinite(c.normalY)) return;

  const nx = c.normalX;
  const ny = c.normalY;
  const cx = finite(c.contactX);
  const cy = finite(c.contactY);
  const depth = Math.max(
    0,
    finite(c.crushDepthPx as number) - finite(c.crushStartPx as number, 0)
  );
  const isNarrow = !!c.isNarrowImpact;
  const radius = Math.max(2, (finite(c.contactWidthPx as number, 12)) * 0.5);
  const poleCx = cx - nx * radius;
  const poleCy = cy - ny * radius;

  for (let i = 0; i < system.nodes.length; i++) {
    const n = system.nodes[i];
    if (isNarrow) {
      const dx = n.x - poleCx;
      const dy = n.y - poleCy;
      const dist = Math.hypot(dx, dy);
      const allowed = Math.max(0.5, radius - depth);
      if (dist < allowed && dist > 1e-5) {
        const ux = dx / dist;
        const uy = dy / dist;
        n.x = poleCx + ux * allowed;
        n.y = poleCy + uy * allowed;
        const vn = n.vx * ux + n.vy * uy;
        if (vn < 0) {
          n.vx -= vn * ux;
          n.vy -= vn * uy;
        }
      }
    } else {
      const d = (n.x - cx) * nx + (n.y - cy) * ny;
      if (d < depth) {
        const push = depth - d;
        n.x += nx * push;
        n.y += ny * push;
        const vn = n.vx * nx + n.vy * ny;
        if (vn < 0) {
          n.vx -= vn * nx;
          n.vy -= vn * ny;
        }
      }
    }
  }
}

function applyExternalForces(system: NodeBeamStructure): void {
  const nodes = system.nodes;
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].fx = 0;
    nodes[i].fy = 0;
  }

  const wheelIndices = system.wheelNodeIndices || [];
  const wheelForces = system.wheelForces || [];
  for (let w = 0; w < wheelIndices.length; w++) {
    const n = nodes[wheelIndices[w]];
    if (!n) continue;
    n.fx += finite(wheelForces[w * 2]);
    n.fy += finite(wheelForces[w * 2 + 1]);
  }

  const bodyFx = finite(system.bodyForceX);
  const bodyFy = finite(system.bodyForceY);
  if (bodyFx !== 0 || bodyFy !== 0) {
    const core = system.coreNodeIndices || [];
    let totalMass = 0;
    for (const idx of core) totalMass += nodes[idx]?.mass || 0;
    if (totalMass > 0) {
      for (const idx of core) {
        const n = nodes[idx];
        if (!n) continue;
        const share = (n.mass || 0) / totalMass;
        n.fx += bodyFx * share;
        n.fy += bodyFy * share;
      }
    }
  }
}

/** Удерживает силовое ядро жёстким, не лишая его динамики. */
function shapeMatchCore(system: NodeBeamStructure): void {
  const nodes = system.nodes;
  const core = system.coreNodeIndices || [];
  if (core.length < 2) return;

  let M = 0;
  let comX = 0;
  let comY = 0;
  let restComX = 0;
  let restComY = 0;
  for (const idx of core) {
    const n = nodes[idx];
    if (!n) continue;
    M += n.mass;
    comX += n.mass * n.x;
    comY += n.mass * n.y;
    restComX += n.mass * n.origX;
    restComY += n.mass * n.origY;
  }
  if (M <= 1e-6) return;
  comX /= M;
  comY /= M;
  restComX /= M;
  restComY /= M;

  let a = 0;
  let b = 0;
  for (const idx of core) {
    const n = nodes[idx];
    if (!n) continue;
    const rx = n.x - comX;
    const ry = n.y - comY;
    const RX = n.origX - restComX;
    const RY = n.origY - restComY;
    a += n.mass * (rx * RX + ry * RY);
    b += n.mass * (ry * RX - rx * RY);
  }
  const angle = Math.atan2(b, a);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const originX = comX - (cosA * restComX - sinA * restComY);
  const originY = comY - (sinA * restComX + cosA * restComY);

  // 0.85 — ядро почти жёсткое, но не «прибитое»: при экстремальном ударе
  // оно всё ещё может получить остаточную деформацию через балки.
  const strength = SHAPE_MATCH_STRENGTH;
  if (strength <= 0) return;
  for (const idx of core) {
    const n = nodes[idx];
    if (!n) continue;
    const tx = originX + cosA * n.origX - sinA * n.origY;
    const ty = originY + sinA * n.origX + cosA * n.origY;
    n.x += (tx - n.x) * strength;
    n.y += (ty - n.y) * strength;
  }
}

/** Силовая 2D-подвеска: ступица держится у своего места на ядре, реакция идёт в кузов. */
function applySuspensionForces(system: NodeBeamStructure): void {
  const nodes = system.nodes;
  const core = system.coreNodeIndices || [];
  const wheelIdx = system.wheelNodeIndices || [];
  if (core.length < 2 || wheelIdx.length === 0) return;

  let M = 0;
  let comX = 0;
  let comY = 0;
  let restComX = 0;
  let restComY = 0;
  let cvx = 0;
  let cvy = 0;
  for (const idx of core) {
    const n = nodes[idx];
    if (!n) continue;
    M += n.mass;
    comX += n.mass * n.x;
    comY += n.mass * n.y;
    restComX += n.mass * n.origX;
    restComY += n.mass * n.origY;
    cvx += n.mass * n.vx;
    cvy += n.mass * n.vy;
  }
  if (M <= 1e-6) return;
  comX /= M;
  comY /= M;
  restComX /= M;
  restComY /= M;
  cvx /= M;
  cvy /= M;

  let a = 0;
  let b = 0;
  for (const idx of core) {
    const n = nodes[idx];
    if (!n) continue;
    const rx = n.x - comX;
    const ry = n.y - comY;
    const RX = n.origX - restComX;
    const RY = n.origY - restComY;
    a += n.mass * (rx * RX + ry * RY);
    b += n.mass * (ry * RX - rx * RY);
  }
  const angle = Math.atan2(b, a);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const originX = comX - (cosA * restComX - sinA * restComY);
  const originY = comY - (sinA * restComX + cosA * restComY);

  const K = 18_000;
  const C = 900;
  for (const wi of wheelIdx) {
    const n = nodes[wi];
    if (!n) continue;
    const tx = originX + cosA * n.origX - sinA * n.origY;
    const ty = originY + sinA * n.origX + cosA * n.origY;
    const dx = n.x - tx;
    const dy = n.y - ty;
    const relVx = n.vx - cvx;
    const relVy = n.vy - cvy;
    let fx = -K * dx - C * relVx;
    let fy = -K * dy - C * relVy;
    // Ограничение силы подвески: удар не должен «выстреливать» узел.
    const fmag = Math.hypot(fx, fy);
    const maxF = 400_000;
    if (fmag > maxF) {
      fx = (fx / fmag) * maxF;
      fy = (fy / fmag) * maxF;
    }
    n.fx += fx;
    n.fy += fy;
    // Реакция подвески — в ближайший узел ядра, а не размазанная по всем
    // узлам: иначе сила прикладывалась бы фактически в центр масс и не
    // создавала бы момента рыскания (машина ехала бы боком, не поворачивая).
    let nearestCore = -1;
    let nearestD = Infinity;
    for (const ci of core) {
      const c = nodes[ci];
      if (!c) continue;
      const d = (c.origX - n.origX) ** 2 + (c.origY - n.origY) ** 2;
      if (d < nearestD) {
        nearestD = d;
        nearestCore = ci;
      }
    }
    if (nearestCore >= 0) {
      const c = nodes[nearestCore];
      if (c) {
        c.fx -= fx;
        c.fy -= fy;
      }
    }
  }
}

function integrateSubstep(system: NodeBeamStructure, car: Vehicle): void {
  const nodes = system.nodes;
  const prevX = new Float64Array(nodes.length);
  const prevY = new Float64Array(nodes.length);

  applyExternalForces(system);
  applySuspensionForces(system);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    let vx = n.vx + (n.fx / Math.max(1, n.mass)) * SUBSTEP;
    let vy = n.vy + (n.fy / Math.max(1, n.mass)) * SUBSTEP;
    vx *= VELOCITY_DAMPING;
    vy *= VELOCITY_DAMPING;
    const sp = Math.hypot(vx, vy);
    if (sp > MAX_NODE_SPEED) {
      const k = MAX_NODE_SPEED / sp;
      vx *= k;
      vy *= k;
    }
    if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
      vx = 0;
      vy = 0;
    }
    prevX[i] = n.x;
    prevY[i] = n.y;
    n.x += vx * SUBSTEP;
    n.y += vy * SUBSTEP;
  }

  solveBeams(system);
  shapeMatchCore(system);
  solveSelfCollision(system);
  solveWorldContact(system, car);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    let vx = (n.x - prevX[i]) / SUBSTEP;
    let vy = (n.y - prevY[i]) / SUBSTEP;
    if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
      vx = 0;
      vy = 0;
      n.x = prevX[i];
      n.y = prevY[i];
    }
    const sp = Math.hypot(vx, vy);
    if (sp > MAX_NODE_SPEED) {
      const k = MAX_NODE_SPEED / sp;
      vx *= k;
      vy *= k;
    }
    n.vx = vx;
    n.vy = vy;
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) {
      n.x = prevX[i];
      n.y = prevY[i];
      n.vx = 0;
      n.vy = 0;
    }
  }
}

/** Выводит позу и скорости автомобиля из узлов силового ядра. */
function derivePose(system: NodeBeamStructure, car: Vehicle): void {
  const nodes = system.nodes;
  let core = system.coreNodeIndices || [];
  if (core.length < 2) core = nodes.map((_, i) => i).filter(i => nodes[i].group !== 'wheel').slice(0, 6);

  let M = 0;
  let comX = 0;
  let comY = 0;
  let restComX = 0;
  let restComY = 0;
  for (const idx of core) {
    const n = nodes[idx];
    if (!n) continue;
    M += n.mass;
    comX += n.mass * n.x;
    comY += n.mass * n.y;
    restComX += n.mass * n.origX;
    restComY += n.mass * n.origY;
  }
  if (M <= 1e-6) return;
  comX /= M;
  comY /= M;
  restComX /= M;
  restComY /= M;

  let a = 0;
  let b = 0;
  let inertia = 0;
  const vxSum = { x: 0, y: 0 };
  let L = 0;
  for (const idx of core) {
    const n = nodes[idx];
    if (!n) continue;
    const rx = n.x - comX;
    const ry = n.y - comY;
    const RX = n.origX - restComX;
    const RY = n.origY - restComY;
    a += n.mass * (rx * RX + ry * RY);
    b += n.mass * (ry * RX - rx * RY);
    inertia += n.mass * (rx * rx + ry * ry);
    vxSum.x += n.mass * n.vx;
    vxSum.y += n.mass * n.vy;
    L += n.mass * (rx * n.vy - ry * n.vx);
  }
  const angle = Math.atan2(b, a);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const originX = comX - (cosA * restComX - sinA * restComY);
  const originY = comY - (sinA * restComX + cosA * restComY);
  const vx = vxSum.x / M;
  const vy = vxSum.y / M;
  const omega = inertia > 1e-6 ? L / inertia : 0;

  car.x = finite(originX, car.x);
  car.y = finite(originY, car.y);
  car.angle = wrapAngle(angle);
  car.vx = finite(vx);
  car.vy = finite(vy);
  car.angularVelocity = Math.max(-25, Math.min(25, finite(omega)));
  car.speed = car.vx * Math.cos(car.angle) + car.vy * Math.sin(car.angle);
  car.lateralVelocity = -car.vx * Math.sin(car.angle) + car.vy * Math.cos(car.angle);
  (car as any).lateralSlip = car.lateralVelocity;

  system.poseX = car.x;
  system.poseY = car.y;
  system.poseAngle = car.angle;
  system.poseVx = car.vx;
  system.poseVy = car.vy;
  system.poseOmega = car.angularVelocity;
}

/** Переносит world-space позиции в локальные offset'ы и обновляет урон/рендер. */
function syncDamage(system: NodeBeamStructure, car: Vehicle): void {
  const nodes = system.nodes;
  const dmg = car.damage;
  if (!dmg) return;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const dx = n.x - car.x;
    const dy = n.y - car.y;
    const lx = dx * cosA + dy * sinA;
    const ly = -dx * sinA + dy * cosA;
    n.localX = finite(lx, n.origX);
    n.localY = finite(ly, n.origY);
    n.offsetX = n.localX - n.origX;
    n.offsetY = n.localY - n.origY;
    // Геометрический предохранитель для рендера: одна балка/удар не должны
    // растянуть угол на полкорпуса. Реальные world-координаты не меняются.
    const maxDent = Math.max(6, car.length * 0.32);
    const dentLen = Math.hypot(n.offsetX, n.offsetY);
    if (dentLen > maxDent) {
      const k = maxDent / dentLen;
      n.offsetX *= k;
      n.offsetY *= k;
      n.localX = n.origX + n.offsetX;
      n.localY = n.origY + n.offsetY;
    }
    n.elasticX = 0;
    n.elasticY = 0;
  }

  const vertCount = Math.max(system.perimeterCount || 14, Math.min(nodes.length, 34));
  if (!dmg.deformedVertices || dmg.deformedVertices.length !== vertCount) {
    dmg.deformedVertices = [];
    for (let i = 0; i < vertCount; i++) {
      const n = nodes[i] || nodes[0];
      dmg.deformedVertices.push({
        localX: n.origX,
        localY: n.origY,
        offsetX: 0,
        offsetY: 0,
        plasticStrain: 0,
        elasticX: 0,
        elasticY: 0,
        velX: 0,
        velY: 0,
        structuralType: n.group as any
      });
    }
  }
  for (let i = 0; i < vertCount; i++) {
    const n = nodes[i];
    const dv = dmg.deformedVertices[i];
    if (!n || !dv) continue;
    dv.offsetX = n.offsetX || 0;
    dv.offsetY = n.offsetY || 0;
    dv.targetOffsetX = dv.offsetX;
    dv.targetOffsetY = dv.offsetY;
    dv.elasticX = 0;
    dv.elasticY = 0;
    dv.velX = n.vx;
    dv.velY = n.vy;
    dv.plasticStrain = n.plasticStrain;
  }

  const tracking = system.definition?.tracking;
  const num = (v: number | undefined) => (Number.isFinite(v) ? (v as number) : 0);
  const setMax = (cur: number, ...vals: number[]) => Math.max(num(cur), 0, ...vals.map(num));

  if (tracking?.frontNodeIds && tracking.frontNodeIds.length > 0) {
    const frontOffsets = tracking.frontNodeIds.map(id => nodes[id] ? -(nodes[id].offsetX || 0) : 0);
    dmg.frontCrumple = setMax(dmg.frontCrumple, ...frontOffsets);
    const leftCorner = nodes[tracking.frontNodeIds[tracking.frontNodeIds.length - 1]];
    const rightCorner = nodes[tracking.frontNodeIds[1] ?? tracking.frontNodeIds[0]];
    dmg.frontLeftDent = setMax(dmg.frontLeftDent, leftCorner ? Math.hypot(leftCorner.offsetX || 0, leftCorner.offsetY || 0) : 0);
    dmg.frontRightDent = setMax(dmg.frontRightDent, rightCorner ? Math.hypot(rightCorner.offsetX || 0, rightCorner.offsetY || 0) : 0);
  } else {
    const frontNode = nodes.reduce((p, c) => (c.origX > p.origX ? c : p), nodes[0]);
    dmg.frontCrumple = setMax(dmg.frontCrumple, -(frontNode.offsetX || 0));
    dmg.frontLeftDent = setMax(dmg.frontLeftDent, Math.hypot(frontNode.offsetX || 0, frontNode.offsetY || 0));
    dmg.frontRightDent = setMax(dmg.frontRightDent, dmg.frontLeftDent);
  }

  if (tracking?.rearNodeIds && tracking.rearNodeIds.length > 0) {
    dmg.rearCrumple = setMax(dmg.rearCrumple, ...tracking.rearNodeIds.map(id => nodes[id]?.offsetX || 0));
    const rr = nodes[tracking.rearNodeIds[0]];
    const rl = nodes[tracking.rearNodeIds[tracking.rearNodeIds.length - 1]];
    dmg.rearRightDent = setMax(dmg.rearRightDent, rr ? Math.hypot(rr.offsetX || 0, rr.offsetY || 0) : 0);
    dmg.rearLeftDent = setMax(dmg.rearLeftDent, rl ? Math.hypot(rl.offsetX || 0, rl.offsetY || 0) : 0);
  } else {
    const rearNode = nodes.reduce((p, c) => (c.origX < p.origX ? c : p), nodes[0]);
    dmg.rearCrumple = setMax(dmg.rearCrumple, rearNode.offsetX || 0);
    dmg.rearLeftDent = setMax(dmg.rearLeftDent, Math.hypot(rearNode.offsetX || 0, rearNode.offsetY || 0));
    dmg.rearRightDent = setMax(dmg.rearRightDent, dmg.rearLeftDent);
  }

  if (tracking?.leftNodeIds && tracking.leftNodeIds.length > 0) {
    dmg.leftDent = setMax(dmg.leftDent, ...tracking.leftNodeIds.map(id => nodes[id]?.offsetY || 0));
  } else {
    const leftNode = nodes.reduce((p, c) => (c.origY < p.origY ? c : p), nodes[0]);
    dmg.leftDent = setMax(dmg.leftDent, -(leftNode.offsetY || 0));
  }
  if (tracking?.rightNodeIds && tracking.rightNodeIds.length > 0) {
    dmg.rightDent = setMax(dmg.rightDent, ...tracking.rightNodeIds.map(id => -(nodes[id]?.offsetY || 0)));
  } else {
    const rightNode = nodes.reduce((p, c) => (c.origY > p.origY ? c : p), nodes[0]);
    dmg.rightDent = setMax(dmg.rightDent, rightNode.offsetY || 0);
  }

  const fl = tracking?.subframeLeftFL;
  const fr = tracking?.subframeRightFR;
  if (fl !== undefined && fr !== undefined && nodes[fl] && nodes[fr]) {
    const asym = ((nodes[fl].offsetX || 0) - (nodes[fr].offsetX || 0)) * 0.12;
    dmg.steeringDrift = Math.max(-1, Math.min(1, finite(asym)));
    dmg.frameBentAngle = finite(asym) * 0.08;
  }

  const fenders = nodes.filter(n => n.group === 'fender' || n.group === 'quarter');
  if (fenders.length > 0) {
    const rub = fenders.reduce(
      (acc, n) => acc + Math.max(0, Math.hypot(n.offsetX || 0, n.offsetY || 0) - 3),
      0
    );
    dmg.wheelRubResistance = finite(rub) * 3.5;
  }
}

/**
 * Полный шаг world-space soft-body: силы → PBD-подшаги → вывод позы → урон.
 * Вызывается только для машины игрока (для NPC остаётся старая кинематика).
 */
export function stepSoftBody(vehicle: Vehicle, dt: number): void {
  const system = vehicle.damage?.nodeBeam;
  if (!system || !system.softBody) return;
  if (!Number.isFinite(vehicle.x) || !Number.isFinite(vehicle.y) || !Number.isFinite(vehicle.angle)) return;

  if (!system.worldInitialized) initializeWorld(system, vehicle);
  syncExternalPose(system, vehicle);

  const safeDt = Math.max(0.0005, Math.min(0.05, Number.isFinite(dt) ? dt : 1 / 60));
  system.timeAccumulator = (system.timeAccumulator || 0) + safeDt;
  let steps = 0;
  while ((system.timeAccumulator || 0) >= SUBSTEP && steps < MAX_SUBSTEPS) {
    integrateSubstep(system, vehicle);
    system.timeAccumulator = (system.timeAccumulator || 0) - SUBSTEP;
    steps++;
  }
  if ((system.timeAccumulator || 0) > SUBSTEP * MAX_SUBSTEPS) system.timeAccumulator = 0;

  derivePose(system, vehicle);
  syncDamage(system, vehicle);
  system.isSleeping = false;
  system.needsSync = false;
  system.steppedThisTick = true;
}

/**
 * Импульс удара в точку: часть уходит в общий перенос, часть — в локальные
 * узлы у контакта. Так удар и тормозит машину, и мнёт конкретный угол.
 */
export function applySoftBodyImpulse(
  vehicle: Vehicle,
  jx: number,
  jy: number,
  contactX: number,
  contactY: number
): void {
  const system = vehicle.damage?.nodeBeam;
  if (!system || !system.softBody) return;
  if (!Number.isFinite(jx) || !Number.isFinite(jy)) return;
  const nodes = system.nodes;
  let M = 0;
  for (const n of nodes) M += n.mass;
  if (M <= 0) return;

  for (const n of nodes) {
    n.vx += (jx * 0.55) / M;
    n.vy += (jy * 0.55) / M;
  }

  let totalW = 0;
  const weights: number[] = new Array(nodes.length).fill(0);
  for (let i = 0; i < nodes.length; i++) {
    const d = Math.hypot(nodes[i].x - contactX, nodes[i].y - contactY);
    const w = 1 / (1 + (d * d) / 100);
    weights[i] = w;
    totalW += w;
  }
  if (totalW <= 0) return;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const imp = (0.45 * weights[i]) / totalW;
    n.vx += (jx * imp) / Math.max(1, n.mass);
    n.vy += (jy * imp) / Math.max(1, n.mass);
  }
}

/** Применяет накопленную внешнюю дельту скорости (коллизии/смятие) к сетке. */
export function applyExternalVelocityDelta(vehicle: Vehicle): void {
  const system = vehicle.damage?.nodeBeam;
  if (!system || !system.softBody || !system.worldInitialized) return;
  const dvx = finite(vehicle.vx) - finite(system.poseVx as number);
  const dvy = finite(vehicle.vy) - finite(system.poseVy as number);
  const dw = finite(vehicle.angularVelocity) - finite(system.poseOmega as number);
  if (Math.abs(dvx) < 0.01 && Math.abs(dvy) < 0.01 && Math.abs(dw) < 0.0001) return;

  const px = finite(system.poseX as number, vehicle.x);
  const py = finite(system.poseY as number, vehicle.y);
  for (const n of system.nodes) {
    n.vx += dvx - dw * (n.y - py);
    n.vy += dvy + dw * (n.x - px);
  }
  system.poseVx = vehicle.vx;
  system.poseVy = vehicle.vy;
  system.poseOmega = vehicle.angularVelocity;
}

export function isSoftBodyVehicle(vehicle: Vehicle): boolean {
  return vehicle.damage?.nodeBeam?.softBody === true;
}

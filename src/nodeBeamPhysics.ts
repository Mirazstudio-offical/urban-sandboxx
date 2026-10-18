import {
  BeamLink,
  BeamLinkType,
  BeamNode,
  BeamNodeType,
  DeformVertex,
  GameWorld,
  NodeBeamStructure,
  Vehicle,
  VehicleDamage,
  VehicleNodeBeamDefinition
} from './types';
import {
  isRoadMachinery,
  isTrailerVehicle,
  isMotorcycle,
  isTractorVehicle
} from './vehicleHelpers';
import {
  CrushProfile,
  advanceCrushStroke,
  createCrushProfile,
  crashEnergy,
  crushFromEnergy,
  reducedMass,
  strikeEnergy
} from './damageModel';
import {
  getVehicleNodeBeamDefinition,
  DEFAULT_K_STRUCTURAL,
  DEFAULT_C_STRUCTURAL,
  DEFAULT_K_CHASSIS,
  DEFAULT_C_CHASSIS,
  DEFAULT_K_CROSS,
  DEFAULT_C_CROSS,
  DEFAULT_K_SUPPORT,
  DEFAULT_C_SUPPORT,
  DEFAULT_K_LATCH,
  DEFAULT_C_LATCH
} from './vehicleMeshConfigs';

/**
 * ============================================================================
 * BEAMNG.DRIVE 2D NODE-BEAM DEFORMATION ENGINE
 * ============================================================================
 *
 * Implements a physically authentic 2D Node-Beam structural simulation
 * equivalent to BeamNG.drive's core physics with individual vehicle mesh configs:
 *
 * 1. NODES:
 *    - Point masses with position (x, y), velocity (vx, vy), and force accumulators.
 *    - Modular node layout defined per vehicle archetype or custom configuration
 *      (motorcycle 14 nodes, tractor 24 nodes, compact 26 nodes, sedan 30 nodes,
 *      cabover truck 34 nodes).
 *
 * 2. BEAMS:
 *    - Viscoelastic, elastoplastic structural links between pairs of nodes.
 *    - Spring-damper forces: F = -k * (L - L0) - c * v_rel.
 *    - Elastoplastic yielding: when stress exceeds yield limit, L0 permanently shifts
 *      (permanent plastic crumpling and accordion folds that remain when unloaded).
 *    - Breaking threshold: when strain exceeds failure limit, beams SNAP! Snapped beams
 *      cease force transmission and trigger body panel detachment (bumpers, hood, doors).
 *    - Cross-beams: diagonal shear bracing inside quads to preserve realistic structural
 *      rigidity without floppy parallelogram collapse.
 *    - Support beams: one-way compression springs preventing hollow cavities, engine,
 *      and floor sills from inverting or collapsing completely into each other.
 *    - Detachable latches: bumper brackets, hood latch/hinges, door latches, trunk deck.
 *
 * 3. IMPULSE INJECTION:
 *    - Physical kinetic momentum transfer (J = mu * v_normal) distributed across contact
 *      nodes based on contact geometry (pole/tree narrow punch vs wall wide distribution).
 *    - Solved via multi-substep integration for numerical stability and crisp deformation.
 */

/**
 * Масштаб прочности балок. Условные жёсткости в мешах (k ≈ 2800 для обшивки) задавали силы
 * на 2-3 порядка меньше реальной силы смятия лонжеронов (damageModel.MEAN_FORCE ≈ 6e6), поэтому
 * сетка не могла ни остановить машину, ни передать нагрузку вглубь кузова: вмятину рисовал
 * кинематический «толчок» узлов. С этим масштабом пластическая сила пакета балок поперёк
 * кузова (k·yieldDist·число балок ≈ 6e5·10) соответствует кривой «сила–смятие».
 */
export const BEAM_FORCE_SCALE = 400;
/**
 * Упругий диапазон балки (yieldDist) в мешах был ~0.5 px на балку длиной ~5 px — это 10% деформации,
 * тогда как реальная сталь течёт при долях процента. Из-за этого вмятина почти целиком «пружинила»
 * назад при снятии нагрузки (до 45% на 50 км/ч). Сокращаем упругий диапазон, сохраняя силу текучести
 * k·yield (жёсткость растёт во столько же раз): металл сминается, а не отскакивает.
 */
const YIELD_RANGE_SCALE = 0.25;
/** Демпфирование балок растёт как sqrt(k): сохраняет коэффициент демпфирования ζ. */
const BEAM_DAMP_SCALE = Math.sqrt(BEAM_FORCE_SCALE / YIELD_RANGE_SCALE) * 2.2;
/** Версия шкалы сил (для миграции старых сохранённых сеток). */
const FORCE_SCALE_VERSION = 3;
/** Скорость пластического течения (1/с): возврат к пределу текучести за ~1/RATE секунд. */
const PLASTIC_RATE = 700;
/** Упрочнение смятого металла: предел текучести ×(1+HARDENING) при полном складывании балки. */
const PLASTIC_HARDENING = 3.0;
/** Минимальная доля исходной длины, до которой балка может быть смята пластически (дальше — «блок»). */
const MIN_REST_FRACTION = 0.14;
/**
 * Текучесть на растяжение: порог выше, чем на сжатие (листовой металл вытягивается тяжелее, чем
 * складывается), с упрочнением и потолком удлинения. Без неё при ударе половиной кузова балка
 * поперёк бампера тащила дальний угол назад упругой силой, и «неударенная» сторона мялась так же
 * глубоко, как ударенная.
 */
const TENSION_YIELD_MULT = 2.5;
const TENSION_HARDENING = 4.0;
const MAX_STRETCH_FRACTION = 0.35;
/** Трение металла о стену: узлы в контакте не скользят вдоль неё, пока хватает нормального импульса. */
const WALL_FRICTION = 0.6;
/** Верхний предел числа подшагов интегратора за кадр. */
const MAX_SUBSTEPS = 64;
/** Внутреннее трение материала (множитель скорости за 1/60 с). */
const NODE_DRAG_PER_FRAME = 0.985;

export interface NodeBeamConfig {
  springScale: number;
  dampScale: number;
  yieldScale: number;
  breakScale: number;
  chassisStiffness: number;
}

/**
 * Creates the complete softbody network for a vehicle based on its individual mesh configuration.
 */
export function createVehicleNodeBeamSystem(
  car: {
    type?: string;
    length?: number;
    width?: number;
    mass?: number;
    customMeshConfig?: Partial<VehicleNodeBeamDefinition>;
  }
): NodeBeamStructure {
  const length = car.length || 42;
  const width = car.width || 20;
  const totalMass = car.mass || 1400;

  // Resolve custom or archetype definition from mesh preset registry
  const def = getVehicleNodeBeamDefinition(car.type, car.customMeshConfig);

  const springScale = def.springScale ?? 1.0;
  const dampScale = def.dampScale ?? 1.0;
  const yieldScale = def.yieldScale ?? 1.0;
  const breakScale = def.breakScale ?? 1.0;

  // -------------------------------------------------------------------------
  // 1. NODE LAYOUT (Dynamic per-model nodes)
  // -------------------------------------------------------------------------
  const nodes: BeamNode[] = def.nodes.map((nt) => {
    const lx = nt.xFrac * length + (nt.xOffset || 0);
    const ly = nt.yFrac * width + (nt.yOffset || 0);
    const nodeMass = totalMass * (nt.massFrac || (1 / def.nodes.length));
    return {
      id: nt.id,
      origX: lx,
      origY: ly,
      localX: lx,
      localY: ly,
      x: lx,
      y: ly,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      mass: Math.max(10, nodeMass),
      plasticStrain: 0,
      group: nt.group,
      isFixed: nt.isFixed,
      name: nt.name
    };
  });

  // -------------------------------------------------------------------------
  // 2. BEAM LAYOUT (Dynamic per-model beams)
  // -------------------------------------------------------------------------
  let beamIdCounter = 0;
  const beams: BeamLink[] = def.beams.map((bt) => {
    const nA = nodes[bt.nodeA];
    const nB = nodes[bt.nodeB];
    const dx = (nB ? nB.origX : 0) - (nA ? nA.origX : 0);
    const dy = (nB ? nB.origY : 0) - (nA ? nA.origY : 0);
    const dist = Math.hypot(dx, dy) || 1;

    let baseK = DEFAULT_K_STRUCTURAL;
    let baseC = DEFAULT_C_STRUCTURAL;
    let baseYield = 0.50;
    let baseBreak = 18.0;

    if (bt.type === 'chassis_rail') {
      baseK = DEFAULT_K_CHASSIS * (def.chassisStiffness ?? 1.0);
      baseC = DEFAULT_C_CHASSIS;
      baseYield = 0.70;
      baseBreak = 26.0;
    } else if (bt.type === 'cross') {
      baseK = DEFAULT_K_CROSS;
      baseC = DEFAULT_C_CROSS;
      baseYield = 0.45;
      baseBreak = 16.0;
    } else if (bt.type === 'support') {
      baseK = DEFAULT_K_SUPPORT;
      baseC = DEFAULT_C_SUPPORT;
      baseYield = 0.80;
      baseBreak = 40.0;
    } else if (bt.type === 'latch') {
      baseK = DEFAULT_K_LATCH;
      baseC = DEFAULT_C_LATCH;
      baseYield = 0.40;
      baseBreak = 6.5;
    }

    const springK = (bt.spring !== undefined ? bt.spring : baseK) * springScale * BEAM_FORCE_SCALE / YIELD_RANGE_SCALE;
    const dampC = (bt.damp !== undefined ? bt.damp : baseC) * dampScale * BEAM_DAMP_SCALE;
    const yieldDistance = (bt.yieldDist !== undefined ? bt.yieldDist : baseYield) * yieldScale * YIELD_RANGE_SCALE;
    const breakDistance = (bt.breakDist !== undefined ? bt.breakDist : baseBreak) * breakScale;

    return {
      id: bt.id !== undefined ? bt.id : beamIdCounter++,
      nodeA: bt.nodeA,
      nodeB: bt.nodeB,
      origLength: dist,
      restLength: dist,
      spring: springK,
      damp: dampC,
      yieldDist: yieldDistance,
      breakDist: breakDistance,
      broken: false,
      type: bt.type,
      partTag: bt.partTag,
      currentStress: 0,
      plasticDeform: 0
    };
  });

  return {
    nodes,
    beams,
    brokenBeamCount: 0,
    totalPlasticDeform: 0,
    maxStress: 0,
    lastSimTime: performance.now() / 1000,
    isSleeping: true,
    activeTimer: 0,
    presetId: def.presetId,
    presetName: def.name,
    perimeterCount: def.perimeterCount,
    definition: def,
    forceScaleVersion: FORCE_SCALE_VERSION,
    stableDt: computeStableDt(nodes, beams),
    needsSync: true
  };
}

/**
 * Максимальный устойчивый подшаг явного интегратора. Оценка Гершгорина для обобщённой матрицы
 * жёсткости: λmax ≤ max_i Σ_j k_ij·(1/m_i + 1/m_j); для демпфирования — аналогично с c.
 * Раньше шаг был фиксирован (3 подшага), что при реальных жёсткостях неустойчиво.
 */
function computeStableDt(nodes: BeamNode[], beams: BeamLink[]): number {
  const kSum = new Float64Array(nodes.length);
  const cSum = new Float64Array(nodes.length);
  for (const b of beams) {
    const nA = nodes[b.nodeA];
    const nB = nodes[b.nodeB];
    if (!nA || !nB) continue;
    const iA = nA.isFixed ? 0 : 1 / Math.max(10, nA.mass);
    const iB = nB.isFixed ? 0 : 1 / Math.max(10, nB.mass);
    const s = iA + iB;
    kSum[b.nodeA] += b.spring * s;
    kSum[b.nodeB] += b.spring * s;
    cSum[b.nodeA] += b.damp * s;
    cSum[b.nodeB] += b.damp * s;
  }
  let kMax = 1;
  let cMax = 1;
  for (let i = 0; i < nodes.length; i++) {
    if (kSum[i] > kMax) kMax = kSum[i];
    if (cSum[i] > cMax) cMax = cSum[i];
  }
  return Math.min(1.1 / Math.sqrt(kMax), 0.6 / cMax);
}

/** Переводит сохранённую сетку со старой шкалой сил на новую, не теряя накопленной деформации. */
function migrateForceScale(system: NodeBeamStructure): void {
  if ((system.forceScaleVersion ?? 1) >= FORCE_SCALE_VERSION) return;
  // v1 → текущая шкала. (v2 существовала только в разработке: у неё жёсткость/текучесть
  // отличались от v1 только на множитель YIELD_RANGE_SCALE.)
  const ver = system.forceScaleVersion ?? 1;
  for (const b of system.beams) {
    if (ver < 2) {
      b.spring *= BEAM_FORCE_SCALE / YIELD_RANGE_SCALE;
      b.damp *= BEAM_DAMP_SCALE;
      b.yieldDist *= YIELD_RANGE_SCALE;
    } else {
      b.spring /= YIELD_RANGE_SCALE;
      b.damp *= Math.sqrt(1 / YIELD_RANGE_SCALE);
      b.yieldDist *= YIELD_RANGE_SCALE;
    }
  }
  system.forceScaleVersion = FORCE_SCALE_VERSION;
  system.stableDt = computeStableDt(system.nodes, system.beams);
  system.needsSync = true;
}

/**
 * Ensures that a vehicle has a fully initialized Node-Beam structure.
 */
export function ensureVehicleNodeBeam(
  veh: {
    length?: number;
    width?: number;
    damage?: VehicleDamage;
    type?: string;
    mass?: number;
    customMeshConfig?: Partial<VehicleNodeBeamDefinition>;
  }
): NodeBeamStructure {
  if (!veh.damage) {
    veh.damage = {} as VehicleDamage;
  }
  const dmg = veh.damage;
  if (!dmg.nodeBeam || !Array.isArray(dmg.nodeBeam.nodes) || dmg.nodeBeam.nodes.length < 8) {
    dmg.nodeBeam = createVehicleNodeBeamSystem({
      type: veh.type || 'sedan',
      length: veh.length,
      width: veh.width,
      mass: veh.mass,
      customMeshConfig: veh.customMeshConfig
    });
  }
  migrateForceScale(dmg.nodeBeam);
  if (!dmg.nodeBeam.stableDt) {
    dmg.nodeBeam.stableDt = computeStableDt(dmg.nodeBeam.nodes, dmg.nodeBeam.beams);
  }
  return dmg.nodeBeam;
}

/**
 * Упор глубины вмятины: узлы зоны контакта не могут уйти вглубь кузова дальше, чем разрешает
 * энергетическая модель (damageModel.crushFromEnergy). Без него импульс + многокадровое сжатие
 * продавливали узлы в 2-4 раза глубже расчётной вмятины.
 */
function enforceCrushLimit(system: NodeBeamStructure): void {
  const lim = system.crushLimit;
  if (!lim) return;
  const nodes = system.nodes;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.isFixed) continue;
    if (Math.hypot(n.origX - lim.cx, n.origY - lim.cy) > lim.radius) continue;
    const depth = (n.x - n.origX) * lim.dirX + (n.y - n.origY) * lim.dirY;
    if (depth > lim.depth) {
      const excess = depth - lim.depth;
      n.x -= lim.dirX * excess;
      n.y -= lim.dirY * excess;
      const vIn = n.vx * lim.dirX + n.vy * lim.dirY;
      if (vIn > 0) {
        n.vx -= vIn * lim.dirX;
        n.vy -= vIn * lim.dirY;
      }
    }
  }
}


// ============================================================================
// КОНТАКТ С ПРЕПЯТСТВИЕМ
// ============================================================================

/**
 * Начинает контакт: фиксирует геометрию препятствия в системе координат кузова.
 * Повторный вызов в течение того же удара (та же нормаль и пятно) геометрию не сбрасывает —
 * иначе ход смятия «обнулялся» бы посреди удара.
 */
function beginContact(
  system: NodeBeamStructure,
  car: Vehicle,
  dirX: number,
  dirY: number,
  localContactX: number,
  localContactY: number,
  narrow: boolean,
  widthPx: number
): void {
  const lat0 = -localContactX * dirY + localContactY * dirX;
  const prev = system.contact;
  if (
    prev &&
    car.activeCrumple && car.activeCrumple.timer > 0 &&
    prev.dirX * dirX + prev.dirY * dirY > 0.95 &&
    Math.abs(prev.lat0 - lat0) < 3.0 &&
    prev.narrow === narrow
  ) {
    return;
  }

  const half = narrow ? Math.max(2.2, widthPx * 0.5) : Math.max(2.0, widthPx * 0.5) + 1.0;
  const reach = narrow ? half * 2.0 : half;
  const nodes = system.nodes;

  let plane0 = Infinity;
  let depth0 = 0;
  for (let pass = 0; pass < 2 && !isFinite(plane0); pass++) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.isFixed) continue;
      const l = -n.x * dirY + n.y * dirX;
      if (pass === 0 && Math.abs(l - lat0) > reach) continue;
      const h = n.x * dirX + n.y * dirY;
      if (h < plane0) plane0 = h;
      const dep = (n.x - n.origX) * dirX + (n.y - n.origY) * dirY;
      if (dep > depth0) depth0 = dep;
    }
  }
  if (!isFinite(plane0)) plane0 = 0;

  system.contact = { dirX, dirY, plane0, lat0, half, narrow, depth0, pen: 0 };
  system.isSleeping = false;
  system.activeTimer = Math.max(system.activeTimer || 0, 0.5);
}

/**
 * Односторонняя связь «препятствие»: узел не может зайти за плоскость (стена) либо внутрь
 * окружности (столб/дерево). Позиция проецируется на поверхность, а скорость сносится к
 * скорости препятствия — так же жёсткая стена работает в BeamNG. Возвращает силу реакции.
 */
function enforceContact(system: NodeBeamStructure, pen: number, penRate: number, subDt: number): number {
  const ct = system.contact;
  if (!ct) return 0;
  const nodes = system.nodes;
  const { dirX, dirY, plane0, lat0, half, narrow } = ct;
  let reaction = 0;

  if (!narrow) {
    const planeH = plane0 + pen;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.isFixed) continue;
      const l = -n.x * dirY + n.y * dirX;
      if (Math.abs(l - lat0) > half) continue;
      const h = n.x * dirX + n.y * dirY;
      if (h >= planeH) continue;
      const corr = planeH - h;
      n.x += dirX * corr;
      n.y += dirY * corr;
      const vu = n.vx * dirX + n.vy * dirY;
      let dvN = Math.max(0, corr / subDt) * 0.5;
      if (vu < penRate) {
        const dv = penRate - vu;
        n.vx += dirX * dv;
        n.vy += dirY * dv;
        reaction += (n.mass * dv) / subDt;
        dvN = Math.max(dvN, dv);
      }
      // Трение вдоль стены (кулон): гасим касательную скорость не больше μ·нормальной
      const vl = -n.vx * dirY + n.vy * dirX;
      const maxDvT = WALL_FRICTION * dvN;
      const dvT = Math.min(Math.abs(vl), maxDvT);
      if (dvT > 0) {
        const sgn = vl > 0 ? -1 : 1;
        n.vx += -dirY * sgn * dvT;
        n.vy += dirX * sgn * dvT;
      }
    }
    return reaction;
  }

  // Столб: окружность радиуса half, центр движется вглубь кузова вместе с ходом смятия.
  const cH = plane0 - half + pen;
  const cL = lat0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.isFixed) continue;
    const h = n.x * dirX + n.y * dirY;
    const l = -n.x * dirY + n.y * dirX;
    const rh = h - cH;
    const rl = l - cL;
    const dist = Math.hypot(rh, rl);
    if (dist >= half) continue;
    let nh = -1;
    let nl = 0;
    if (dist > 1e-6) {
      nh = rh / dist;
      nl = rl / dist;
    }
    const newH = cH + nh * half;
    const newL = cL + nl * half;
    n.x = newH * dirX - newL * dirY;
    n.y = newH * dirY + newL * dirX;
    // Относительная скорость узла к центру столба; гасим составляющую «внутрь окружности»
    const vh = n.vx * dirX + n.vy * dirY - penRate;
    const vl = -n.vx * dirY + n.vy * dirX;
    const vn = vh * nh + vl * nl;
    if (vn < 0) {
      const dvh = -vn * nh;
      const dvl = -vn * nl;
      n.vx += dvh * dirX - dvl * dirY;
      n.vy += dvh * dirY + dvl * dirX;
      reaction += (n.mass * -vn) / subDt;
    }
  }
  return reaction;
}

// ============================================================================
// ИНТЕГРАТОР
// ============================================================================

/**
 * Ядро солвера: подшаги упругопластических балок, контакт и инерционная нагрузка узлов.
 * Возвращает максимальную скорость узла (для засыпания).
 */
function integrateStructure(
  system: NodeBeamStructure,
  car: Vehicle,
  dt: number,
  pen0: number,
  pen1: number,
  accelX: number,
  accelY: number
): number {
  const nodes = system.nodes;
  const beams = system.beams;

  const clampedDt = Math.max(0.0005, Math.min(0.05, dt));
  const stable = system.stableDt || 0.002;
  const subSteps = Math.max(1, Math.min(MAX_SUBSTEPS, Math.ceil(clampedDt / stable)));
  const subDt = clampedDt / subSteps;
  const penRate = (pen1 - pen0) / clampedDt;
  const halfL = car.length / 2;
  const halfW = car.width / 2;
  const maxDisplacement = Math.max(halfL * 0.85, halfW * 0.85);

  const drag = Math.pow(NODE_DRAG_PER_FRAME, subDt * 60);
  const plasticRelax = 1 - Math.exp(-PLASTIC_RATE * subDt);

  let maxStress = 0;
  let plasticShiftTotal = 0;
  let contactForce = 0;

  for (let step = 0; step < subSteps; step++) {
    // 1. Силы: инерция системы отсчёта кузова (кузов тормозится, узлы «едут» вперёд)
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.fx = -n.mass * accelX;
      n.fy = -n.mass * accelY;
    }

    // 2. Балки: упругость, пластика (только сжатие), разрушение
    for (let bIdx = 0; bIdx < beams.length; bIdx++) {
      const beam = beams[bIdx];
      if (beam.broken) continue;

      const nA = nodes[beam.nodeA];
      const nB = nodes[beam.nodeB];
      if (!nA || !nB) continue;

      const dx = nB.x - nA.x;
      const dy = nB.y - nA.y;
      const curDist = Math.hypot(dx, dy) || 0.0001;
      const dirX = dx / curDist;
      const dirY = dy / curDist;

      let delta = curDist - beam.restLength;
      const stressRatio = Math.abs(delta) / beam.origLength;
      beam.currentStress = stressRatio;
      if (stressRatio > maxStress) maxStress = stressRatio;

      // Опорная балка: работает только на сжатие
      if (beam.type === 'support' && delta >= 0) continue;

      // --- ПЛАСТИЧЕСКОЕ ТЕЧЕНИЕ при сжатии (идеальная пластика с упрочнением) ---
      // Сила ограничена пределом текучести k·yield: именно это и есть «сила смятия» конструкции.
      // Металл складывается (упрочняется) по мере смятия, поэтому сопротивление растёт с ходом.
      // Растяжение — только упругое: предельное растяжение рвёт балку.
      const floorLen = beam.origLength * MIN_REST_FRACTION;
      if (delta < 0 && beam.restLength > floorLen) {
        const crushed = Math.max(0, beam.origLength - beam.restLength);
        const hard = 1 + PLASTIC_HARDENING * Math.min(1, crushed / (beam.origLength - floorLen));
        const yEff = beam.yieldDist * hard;
        if (-delta > yEff) {
          let shift = (delta + yEff) * plasticRelax; // < 0
          if (beam.restLength + shift < floorLen) shift = floorLen - beam.restLength;
          beam.restLength += shift;
          beam.plasticDeform = (beam.plasticDeform || 0) + shift;
          plasticShiftTotal += Math.abs(shift);
          const strainAdd = (Math.abs(shift) / beam.origLength) * 1.8;
          nA.plasticStrain = Math.min(4.0, (nA.plasticStrain || 0) + strainAdd);
          nB.plasticStrain = Math.min(4.0, (nB.plasticStrain || 0) + strainAdd);
          delta = curDist - beam.restLength;
        }
      }

      // Растяжение: пластическое вытягивание сверх повышенного порога (только настоящая конструкция,
      // не опорные балки и не замки — те просто рвутся)
      if (delta > 0 && beam.type !== 'latch' && beam.type !== 'support') {
        const maxRest = beam.origLength * (1 + MAX_STRETCH_FRACTION);
        if (beam.restLength < maxRest) {
          const stretched = Math.max(0, beam.restLength - beam.origLength) / (beam.origLength * MAX_STRETCH_FRACTION);
          const yT = beam.yieldDist * TENSION_YIELD_MULT * (1 + TENSION_HARDENING * Math.min(1, stretched));
          if (delta > yT) {
            let shift = (delta - yT) * plasticRelax;
            if (beam.restLength + shift > maxRest) shift = maxRest - beam.restLength;
            beam.restLength += shift;
            beam.plasticDeform = (beam.plasticDeform || 0) + shift;
            plasticShiftTotal += shift;
            delta = curDist - beam.restLength;
          }
        }
      }

      const relVx = nB.vx - nA.vx;
      const relVy = nB.vy - nA.vy;
      const vRel = relVx * dirX + relVy * dirY;
      const fSpring = -beam.spring * delta;
      const fTotal = fSpring - beam.damp * vRel;

      // --- РАЗРУШЕНИЕ ---
      // 1) предельное растяжение; 2) перегрузка сжатием: балка уже сложена «в блок»
      //    (restLength на пределе) и сила превысила упрочнённый предел — рвётся (сварка, кронштейн).
      const overloadedInCompression =
        beam.type !== 'support' &&
        beam.restLength <= floorLen * 1.02 &&
        fSpring < -beam.spring * beam.yieldDist * (1 + PLASTIC_HARDENING) * 1.8;
      if (delta > beam.breakDist || overloadedInCompression) {
        beam.broken = true;
        system.brokenBeamCount++;
        breakBeamPart(car, beam);
        continue;
      }

      nA.fx -= fTotal * dirX;
      nA.fy -= fTotal * dirY;
      nB.fx += fTotal * dirX;
      nB.fy += fTotal * dirY;
    }

    // 3. Интегрирование узлов (semi-implicit Euler)
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.isFixed) {
        node.x = node.origX;
        node.y = node.origY;
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      const invMass = 1.0 / Math.max(10, node.mass);
      node.vx = (node.vx + node.fx * invMass * subDt) * drag;
      node.vy = (node.vy + node.fy * invMass * subDt) * drag;
      node.x += node.vx * subDt;
      node.y += node.vy * subDt;

      // Защита от неустойчивости: узел не может уйти дальше разумного предела от исходной точки
      const curDisp = Math.hypot(node.x - node.origX, node.y - node.origY);
      if (curDisp > maxDisplacement) {
        const factor = maxDisplacement / curDisp;
        node.x = node.origX + (node.x - node.origX) * factor;
        node.y = node.origY + (node.y - node.origY) * factor;
        node.vx *= 0.2;
        node.vy *= 0.2;
      }
    }

    // 4. Препятствие и упор глубины
    if (system.contact) {
      const pen = pen0 + (pen1 - pen0) * ((step + 1) / subSteps);
      contactForce += enforceContact(system, pen, penRate, subDt);
    }
    enforceCrushLimit(system);
  }

  system.maxStress = maxStress;
  system.totalPlasticDeform += plasticShiftTotal;
  system.lastContactForce = contactForce / subSteps;

  // Смещения узлов для рендера: пластическая часть (localX/Y) и упругое «дрожание»
  let maxSpeedSq = 0;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const totalOffsetX = node.x - node.origX;
    const totalOffsetY = node.y - node.origY;
    const plasticWeight = Math.min(1.0, (node.plasticStrain || 0) * 0.4);
    node.localX = node.origX + totalOffsetX * plasticWeight;
    node.localY = node.origY + totalOffsetY * plasticWeight;
    node.offsetX = totalOffsetX;
    node.offsetY = totalOffsetY;
    node.elasticX = node.x - node.localX;
    node.elasticY = node.y - node.localY;
    const sp = node.vx * node.vx + node.vy * node.vy;
    if (sp > maxSpeedSq) maxSpeedSq = sp;
  }
  return Math.sqrt(maxSpeedSq);
}

/** Последствия разрыва балки для навесных деталей (бампер, капот, двери, багажник). */
function breakBeamPart(car: Vehicle, beam: BeamLink): void {
  const dmg = car.damage;
  if (!dmg) return;
  if (beam.partTag === 'front_bumper') {
    if (beam.nodeA === 15 || beam.nodeB === 15) dmg.bumperSagLeft = 1.0;
    if (beam.nodeA === 1 || beam.nodeB === 1) dmg.bumperSagRight = 1.0;
    if ((dmg.bumperSagLeft || 0) > 0.8 && (dmg.bumperSagRight || 0) > 0.8) {
      dmg.frontBumperDetached = true;
    }
  } else if (beam.partTag === 'hood') {
    dmg.hoodBuckled = true;
    dmg.hoodRaisedAmount = Math.max(0.6, (dmg.hoodRaisedAmount || 0) + 0.35);
    if (beam.nodeA === 16 && beam.nodeB === 17) {
      dmg.hoodDetached = true;
    }
  } else if (beam.partTag === 'door_fl') {
    dmg.doorFLAjar = 0.85;
  } else if (beam.partTag === 'door_fr') {
    dmg.doorFRAjar = 0.85;
  } else if (beam.partTag === 'rear_bumper') {
    dmg.rearBumperDetached = true;
  } else if (beam.partTag === 'trunk') {
    dmg.trunkDetached = true;
  }
}

/**
 * Шаг упругопластической физики узлов и балок. Спящая (неподвижная и не под нагрузкой)
 * сетка не интегрируется — при адаптивных подшагах это важно для сотен припаркованных машин.
 */
export function stepNodeBeamSimulation(
  system: NodeBeamStructure,
  dt: number,
  car: Vehicle
): void {
  const nodes = system.nodes;
  const beams = system.beams;
  if (!nodes || nodes.length < 8 || !beams || beams.length < 6) return;

  // Удар закончился: препятствие отпускает кузов, сетка свободно релаксирует
  if (system.contact && !(car.activeCrumple && car.activeCrumple.timer > 0)) {
    system.contact = undefined;
    system.activeTimer = Math.max(system.activeTimer || 0, 0.3);
    system.isSleeping = false;
  }

  const hasContact = !!system.contact;
  if (system.isSleeping && !hasContact && !system.needsSync) return;

  if (!system.isSleeping || hasContact) {
    const heldPen = system.contact ? system.contact.pen : 0;
    const pen0 = system.contactPen0 ?? heldPen;
    const pen1 = system.contactPen1 ?? heldPen;
    const maxSpeed = integrateStructure(
      system, car, dt, pen0, pen1, system.frameAx || 0, system.frameAy || 0
    );
    system.contactPen0 = undefined;
    system.contactPen1 = undefined;
    system.frameAx = 0;
    system.frameAy = 0;
    system.needsSync = true;

    if (maxSpeed > 0.5 || hasContact) {
      system.activeTimer = Math.max(system.activeTimer || 0, 0.25);
    }
    system.activeTimer = (system.activeTimer || 0) - dt;
    if (system.activeTimer <= 0 && !hasContact) {
      system.isSleeping = true;
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].vx = 0;
        nodes[i].vy = 0;
      }
    }
  }

  syncNodeBeamToVehicle(system, car);
  system.needsSync = !system.isSleeping;
}

/**
 * Синхронизирует узлы с deformedVertices и агрегатами урона (frontCrumple, leftDent, ...).
 */
function syncNodeBeamToVehicle(system: NodeBeamStructure, car: Vehicle): void {
  const nodes = system.nodes;
  // -------------------------------------------------------------------------
  // 4. SYNCHRONIZE BACK TO VEHICLE DAMAGE & DEFORMED VERTICES
  // -------------------------------------------------------------------------
  const dmg = car.damage;
  if (!dmg) return;

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

  // Update vertex slots directly from physical simulated nodes
  for (let i = 0; i < vertCount; i++) {
    const n = nodes[i];
    const dv = dmg.deformedVertices[i];
    if (!n || !dv) continue;

    dv.offsetX = n.offsetX;
    dv.offsetY = n.offsetY;
    dv.targetOffsetX = n.offsetX;
    dv.targetOffsetY = n.offsetY;
    // offsetX/offsetY — это уже ПОЛНОЕ смещение узла (пластика + упругая часть). Потребители
    // (renderer.ts, physics.ts) складывают localX + offsetX + elasticX, поэтому упругую часть
    // отдаём нулём: иначе она учитывалась дважды и фигура рисовалась «растянутой/сжатой» сильнее узлов.
    dv.elasticX = 0;
    dv.elasticY = 0;
    dv.velX = n.vx;
    dv.velY = n.vy;
    dv.plasticStrain = n.plasticStrain;
  }

  // -------------------------------------------------------------------------
  // 5. UPDATE AGGREGATE DAMAGE METRICS FROM PHYSICAL NODE POSITIONS
  // -------------------------------------------------------------------------
  const tracking = system.definition?.tracking;

  // Aggregate damage is the authoritative, monotonic record of energy the
  // structure has absorbed; the node mesh is its live shape. Do not let a
  // damped elastic rebound erase damage already recorded by damageModel.ts.
  // Otherwise collisions, component damage and rendering diverge.
  if (tracking?.frontNodeIds && tracking.frontNodeIds.length > 0) {
    const frontOffsets = tracking.frontNodeIds.map(id => nodes[id] ? -nodes[id].offsetX : 0);
    dmg.frontCrumple = Math.max(dmg.frontCrumple || 0, 0, ...frontOffsets);
    const leftCornerNode = nodes[tracking.frontNodeIds[tracking.frontNodeIds.length - 1]];
    const rightCornerNode = nodes[tracking.frontNodeIds[1] ?? tracking.frontNodeIds[0]];
    dmg.frontLeftDent = Math.max(dmg.frontLeftDent || 0, leftCornerNode ? Math.hypot(leftCornerNode.offsetX, leftCornerNode.offsetY) : 0);
    dmg.frontRightDent = Math.max(dmg.frontRightDent || 0, rightCornerNode ? Math.hypot(rightCornerNode.offsetX, rightCornerNode.offsetY) : 0);
  } else {
    const frontNode = nodes.reduce((prev, curr) => (curr.origX > prev.origX ? curr : prev), nodes[0]);
    dmg.frontCrumple = Math.max(dmg.frontCrumple || 0, 0, -(frontNode.offsetX || 0));
    dmg.frontLeftDent = Math.max(dmg.frontLeftDent || 0, Math.hypot(frontNode.offsetX, frontNode.offsetY));
    dmg.frontRightDent = Math.max(dmg.frontRightDent || 0, dmg.frontLeftDent);
  }

  // Rear crumple:
  if (tracking?.rearNodeIds && tracking.rearNodeIds.length > 0) {
    const rearOffsets = tracking.rearNodeIds.map(id => nodes[id] ? nodes[id].offsetX : 0);
    dmg.rearCrumple = Math.max(dmg.rearCrumple || 0, 0, ...rearOffsets);
    const rearRightNode = nodes[tracking.rearNodeIds[0]];
    const rearLeftNode = nodes[tracking.rearNodeIds[tracking.rearNodeIds.length - 1]];
    dmg.rearRightDent = Math.max(dmg.rearRightDent || 0, rearRightNode ? Math.hypot(rearRightNode.offsetX, rearRightNode.offsetY) : 0);
    dmg.rearLeftDent = Math.max(dmg.rearLeftDent || 0, rearLeftNode ? Math.hypot(rearLeftNode.offsetX, rearLeftNode.offsetY) : 0);
  } else {
    const rearNode = nodes.reduce((prev, curr) => (curr.origX < prev.origX ? curr : prev), nodes[0]);
    dmg.rearCrumple = Math.max(dmg.rearCrumple || 0, 0, rearNode.offsetX || 0);
    dmg.rearLeftDent = Math.max(dmg.rearLeftDent || 0, Math.hypot(rearNode.offsetX, rearNode.offsetY));
    dmg.rearRightDent = Math.max(dmg.rearRightDent || 0, dmg.rearLeftDent);
  }

  // Side flanks:
  if (tracking?.leftNodeIds && tracking.leftNodeIds.length > 0) {
    dmg.leftDent = Math.max(dmg.leftDent || 0, 0, ...tracking.leftNodeIds.map(id => nodes[id] ? nodes[id].offsetY : 0));
  } else {
    const leftNode = nodes.reduce((prev, curr) => (curr.origY < prev.origY ? curr : prev), nodes[0]);
    dmg.leftDent = Math.max(dmg.leftDent || 0, 0, -(leftNode.offsetY || 0));
  }

  if (tracking?.rightNodeIds && tracking.rightNodeIds.length > 0) {
    dmg.rightDent = Math.max(dmg.rightDent || 0, 0, ...tracking.rightNodeIds.map(id => nodes[id] ? -nodes[id].offsetY : 0));
  } else {
    const rightNode = nodes.reduce((prev, curr) => (curr.origY > prev.origY ? curr : prev), nodes[0]);
    dmg.rightDent = Math.max(dmg.rightDent || 0, 0, rightNode.offsetY || 0);
  }

  // Steering drift & frame twist:
  const flId = tracking?.subframeLeftFL;
  const frId = tracking?.subframeRightFR;
  if (flId !== undefined && frId !== undefined && nodes[flId] && nodes[frId]) {
    const subframeAsym = (nodes[flId].offsetX - nodes[frId].offsetX) * 0.12;
    dmg.steeringDrift = Math.max(-1.0, Math.min(1.0, subframeAsym));
    dmg.frameBentAngle = subframeAsym * 0.08;
  }

  // Wheel rub resistance: check fender / wheel well nodes
  const fenderNodes = nodes.filter(n => n.group === 'fender' || n.group === 'quarter');
  if (fenderNodes.length > 0) {
    const rubSum = fenderNodes.reduce((acc, fn) => acc + Math.max(0, Math.hypot(fn.offsetX, fn.offsetY) - 3.0), 0);
    dmg.wheelRubResistance = rubSum * 3.5;
  }
}

/**
 * Удар по узловой сетке. Строит геометрию препятствия (плоскость стены либо окружность столба)
 * в системе координат кузова. Во время реального удара (activeCrumple) вмятину ведёт
 * continuous-солвер по ходу смятия; вне его (диагностика, одиночный удар) прогоняется
 * короткий ход на глубину, рассчитанную энергетической моделью.
 */
export function applyNodeBeamImpact(
  car: Vehicle,
  contactX: number,
  contactY: number,
  normalX: number,
  normalY: number,
  impactSpeed: number,
  scrapeSpeed: number,
  world: GameWorld,
  strikerMass: number = 1400,
  isNarrowImpact: boolean = false,
  contactWidthPx?: number,
  /** Расчётная глубина вмятины от энергетической модели, px. Если задана — ограничивает проседание узлов. */
  crushLimitPx?: number
): void {
  const system = ensureVehicleNodeBeam(car);
  const nodes = system.nodes;
  if (!nodes || nodes.length < 8) return;

  const halfL = car.length / 2;
  const halfW = car.width / 2;

  // Контакт и нормаль в системе координат кузова
  const dx = contactX - car.x;
  const dy = contactY - car.y;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  const localContactX = dx * cosA + dy * sinA;
  const localContactY = -dx * sinA + dy * cosA;

  // Направление удара внутрь кузова
  let localImpulseX = -(normalX * cosA + normalY * sinA);
  let localImpulseY = -(-normalX * sinA + normalY * cosA);
  const impLen = Math.hypot(localImpulseX, localImpulseY) || 1;
  localImpulseX /= impLen;
  localImpulseY /= impLen;

  const isContinuousCrush = !!car.activeCrumple && car.activeCrumple.timer > 0;
  const normalSpeed = Math.max(12, impactSpeed);

  const carWidth = car.width;
  const effectiveContactWidth = contactWidthPx !== undefined
    ? Math.max(2.0, Math.min(carWidth, contactWidthPx))
    : (isNarrowImpact ? 5.5 : carWidth);

  const spreadRadius = isNarrowImpact
    ? Math.max(4.0, effectiveContactWidth * 0.85)
    : Math.max(9.0, effectiveContactWidth * 0.45);

  if (!isContinuousCrush) system.contact = undefined;
  beginContact(system, car, localImpulseX, localImpulseY, localContactX, localContactY, isNarrowImpact, effectiveContactWidth);
  const contact = system.contact!;

  // Упор глубины: уже имеющаяся вмятина в зоне контакта + расчётная глубина этого удара
  if (crushLimitPx !== undefined && crushLimitPx > 0) {
    const curDepth = contact.depth0;
    // targetCrushPx накапливается между ударами в одной зоне: упор не должен быть мельче цели,
    // иначе энергия урона копится, а сетка ограничена только последним ударом.
    const cumulativeTarget = car.activeCrumple?.targetCrushPx || 0;
    system.crushLimit = {
      dirX: localImpulseX,
      dirY: localImpulseY,
      depth: Math.max(curDepth + crushLimitPx * 1.15, cumulativeTarget * 1.05) + 0.6,
      cx: localContactX,
      cy: localContactY,
      radius: spreadRadius * 2.2
    };
  } else {
    system.crushLimit = undefined;
  }

  // Вне реального удара (диагностика, мгновенный удар) — короткий ход на расчётную глубину
  if (!isContinuousCrush) {
    let depth = crushLimitPx !== undefined && crushLimitPx > 0 ? crushLimitPx : 0;
    if (depth <= 0) {
      const zone = localContactX > halfL * 0.2 ? 'front' : (localContactX < -halfL * 0.25 ? 'rear' : 'side');
      depth = crushFromEnergy({
        energy: strikeEnergy(car.mass || 1400, strikerMass, normalSpeed),
        zone,
        length: car.length,
        width: car.width,
        contactWidthPx: effectiveContactWidth,
        existingDepthPx: contact.depth0
      }).depthPx;
    }

    const strokeSteps = 8;
    const strokeDt = 0.004;
    for (let i = 1; i <= strokeSteps; i++) {
      integrateStructure(system, car, strokeDt, depth * (i - 1) / strokeSteps, depth * i / strokeSteps, 0, 0);
      contact.pen = depth * i / strokeSteps;
    }
    system.contact = undefined;
    for (let i = 0; i < 14; i++) {
      integrateStructure(system, car, 0.01, 0, 0, 0, 0);
    }
    system.isSleeping = false;
    system.activeTimer = Math.max(system.activeTimer || 0, 0.3);
    syncNodeBeamToVehicle(system, car);
    system.needsSync = true;
  }

  // Powertrain and component mechanical damage consequences
  const eng = car.engineState;
  const fuel = car.fuelSystem;
  const dmg = car.damage;

  if (eng && dmg) {
    // Frontal subframe / engine node compression
    const frontCrushDepth = dmg.frontCrumple;
    const energy = strikeEnergy(car.mass || 1400, strikerMass, normalSpeed);

    if (localContactX > halfL * 0.15 && frontCrushDepth > 2.5) {
      // Radiator puncture
      if (frontCrushDepth > 3.8 || energy > 18_000_000) {
        eng.radiatorPunctured = true;
      }
      // Engine mechanical shock & health degradation
      const shockDmg = (frontCrushDepth / (halfL * 0.4)) * 35 + (energy / 60_000_000) * 45;
      eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - shockDmg);
      eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - shockDmg * 0.8);

      // Engine stall on heavy crash
      if (normalSpeed > 55 || energy > 12_000_000) {
        eng.engineRunning = false;
        eng.engineRPM = 0;
      }
    }

    // Rear / undercarriage fuel tank hit
    if (localContactX < -halfL * 0.35 && fuel) {
      if (dmg.rearCrumple > 4.5 || energy > 22_000_000) {
        fuel.tankPunctured = true;
      }
    }
  }
}


const crushProfileCache = new WeakMap<object, CrushProfile>();

/**
 * Динамика хода смятия при ударе о жёсткое препятствие.
 *
 * Вместо скриптового косинуса фиксированной длительности машина тормозится силой F(d) профиля
 * «сила–смятие» (damageModel.createCrushProfile): v² = v₀² − 2·∫F dd / m. Следствия:
 *  - вмятина растёт с энергией (на 110 км/ч глубже и быстрее, чем на 50), остановка происходит
 *    ровно на глубине, посчитанной энергетической моделью, — энергия сохраняется;
 *  - время остановки и пиковая перегрузка зависят от скорости (2·d/v), а не одинаковы для всех;
 *  - торможение кузова даёт инерционную нагрузку на узлы (двигатель «едет» вперёд и сминает
 *    лонжероны) через ускорение системы отсчёта.
 *
 * Возвращает нормальную скорость сближения машины (px/s, ≥0 — сближение; <0 — отскок) либо
 * undefined, если для этого удара силовая модель не задана (тогда работает прежний сценарий).
 */
export function advanceCrashStroke(car: Vehicle, dt: number): number | undefined {
  const c = car.activeCrumple;
  if (!c || !c.crushModel || c.preserveVelocity || c.initialNormalSpeed === undefined || !(dt > 0)) {
    return undefined;
  }
  const model = c.crushModel;
  let profile = crushProfileCache.get(model);
  if (!profile) {
    profile = createCrushProfile(model);
    crushProfileCache.set(model, profile);
  }
  const share = Math.max(0.05, Math.min(1, model.share));

  if (c.crushSpeed === undefined) {
    c.crushSpeed = Math.abs(c.initialNormalSpeed) * share;
    c.crushStartPx = c.crushStartPx ?? 0;
    c.crushDepthPx = c.crushStartPx;
  }

  const prevPhase = c.crushStopped ? (c.reboundSpeed || 0) : c.crushSpeed / share;
  let phase: number;
  if (!c.crushStopped) {
    const r = advanceCrushStroke(profile, car.mass || 1400, c.crushDepthPx ?? 0, c.crushSpeed, dt);
    c.crushDepthPx = r.depth;
    c.crushSpeed = r.speed;
    if (r.stopped) c.crushStopped = true;
    phase = c.crushSpeed / share;
  } else {
    phase = c.reboundSpeed || 0;
  }

  // Ускорение системы отсчёта кузова (мировое → локальное) для инерционной нагрузки узлов
  const system = car.damage?.nodeBeam;
  if (system) {
    const dPhase = phase - prevPhase;
    const aWx = -c.normalX * dPhase / dt;
    const aWy = -c.normalY * dPhase / dt;
    const cosA = Math.cos(car.angle);
    const sinA = Math.sin(car.angle);
    system.frameAx = (system.frameAx || 0) + (aWx * cosA + aWy * sinA);
    system.frameAy = (system.frameAy || 0) + (-aWx * sinA + aWy * cosA);
  }
  return phase;
}

/**
 * Continuous Dynamic Contact Solver for multi-frame crumple zone collapse.
 *
 * Препятствие — односторонняя связь (плоскость/окружность), которая движется вглубь кузова
 * на величину хода смятия. Узлы, зашедшие за неё, проецируются обратно; остальную деформацию
 * создают сами балки: сжатие, пластическое складывание, упрочнение, разрыв и инерция тяжёлых
 * узлов (двигатель). Ход берётся из advanceCrashStroke (силовая модель) либо, если её нет
 * (удары между машинами, где скорость решает импульсный контакт), из целевой глубины.
 */
export function stepNodeBeamContinuousContact(
  car: Vehicle,
  dt: number,
  world?: GameWorld
): void {
  const c = car.activeCrumple;
  if (!c || c.timer <= 0) return;

  const dmg = car.damage;
  if (!dmg) return;
  const system = ensureVehicleNodeBeam(car);
  const nodes = system.nodes;
  if (!nodes || nodes.length < 8) return;

  const halfL = car.length / 2;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  // activeCrumple.normal направлена ОТ препятствия К машине; в локальных координатах это и есть
  // направление «внутрь кузова».
  let locImpulseX = c.normalX * cosA + c.normalY * sinA;
  let locImpulseY = -c.normalX * sinA + c.normalY * cosA;
  const impLen = Math.hypot(locImpulseX, locImpulseY) || 1;
  locImpulseX /= impLen;
  locImpulseY /= impLen;

  const isNarrow = c.isNarrowImpact ?? false;
  const widthPx = c.contactWidthPx !== undefined
    ? Math.max(2.0, Math.min(car.width, c.contactWidthPx))
    : (isNarrow ? 14 : car.width);

  const dxw = c.contactX - car.x;
  const dyw = c.contactY - car.y;
  const localContactX = dxw * cosA + dyw * sinA;
  const localContactY = -dxw * sinA + dyw * cosA;
  beginContact(system, car, locImpulseX, locImpulseY, localContactX, localContactY, isNarrow, widthPx);
  const ct = system.contact!;

  let pen1: number;
  if (c.crushModel && !c.preserveVelocity && c.crushDepthPx !== undefined) {
    pen1 = Math.max(ct.pen, c.crushDepthPx - (c.crushStartPx ?? 0));
  } else {
    // Кинематический ход к целевой глубине (удары между машинами и препятствия без силовой модели)
    const progress = c.totalDuration > 0
      ? Math.max(0, Math.min(1.0, 1.0 - c.timer / c.totalDuration))
      : 1.0;
    const target = c.targetCrushPx !== undefined && c.targetCrushPx > 0 ? c.targetCrushPx : halfL * 0.30;
    const rel = Math.max(0, target - ct.depth0);
    const t = Math.min(1, progress / 0.74);
    pen1 = Math.max(ct.pen, rel * t * t * (3 - 2 * t));
  }

  system.contactPen0 = ct.pen;
  system.contactPen1 = pen1;
  ct.pen = pen1;
  system.isSleeping = false;

  stepNodeBeamSimulation(system, dt, car);
  // Сообщаем updateVehicleSystems, что за этот кадр шаг уже сделан (иначе dt обрабатывался дважды)
  system.steppedThisTick = true;
}

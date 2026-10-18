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
const MAX_SUBSTEPS = 512;
/** Внутреннее трение материала (множитель скорости за 1/60 с). */
const NODE_DRAG_PER_FRAME = 0.982;
/** Абсолютный предохранитель скорости узла, px/s. */
const MAX_NODE_SPEED = 4500;
/** Предел реакции оболочки, передаваемой на кузов (чтобы не «выстрелить» машину). */
const MAX_SHELL_REACTION = 1_200_000;

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
  // Жёсткое ядро кузова: подрамники, точки крепления подвески и центральный
  // тоннель. Это не «один гвоздь» в центре, как раньше, а пространственная
  // рама из нескольких узлов. Оболочка (крылья, двери, бамперы, крыша) крепится
  // к ней балками и может мяться локально, но не может повернуть весь кузов
  // относительно колёс — именно это давало эффект «краба».
  const CORE_GROUPS: BeamNodeType[] = ['chassis_core', 'subframe'];
  const nodes: BeamNode[] = def.nodes.map((nt) => {
    const lx = nt.xFrac * length + (nt.xOffset || 0);
    const ly = nt.yFrac * width + (nt.yOffset || 0);
    const nodeMass = totalMass * (nt.massFrac || (1 / def.nodes.length));
    const isCore = CORE_GROUPS.indexOf(nt.group) !== -1;
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
      // Инициализируем поля смещений сразу. Раньше они появлялись только после
      // первого интегрирования; если сетка ещё спала, sync читал undefined и
      // через Math.max/-undefined превращал damage.frontCrumple в NaN.
      offsetX: 0,
      offsetY: 0,
      elasticX: 0,
      elasticY: 0,
      mass: Math.max(10, nodeMass),
      plasticStrain: 0,
      group: nt.group,
      isFixed: nt.isFixed || isCore,
      isCore,
      name: nt.name
    };
  });

  // Гарантируем минимум три жёстких анкера: два узла ещё допускают вращение
  // оболочки вокруг оси, три — уже нет. Для мотоцикла/прицепа, где подрамников
  // мало, дополнительно фиксируем самые массивные узлы (двигатель/рама).
  let fixedCount = 0;
  for (const n of nodes) if (n.isFixed) fixedCount++;
  if (fixedCount < 3) {
    const candidates = nodes
      .filter(n => !n.isFixed)
      .sort((a, b) => b.mass - a.mass);
    for (const n of candidates) {
      if (fixedCount >= 3) break;
      n.isFixed = true;
      n.isCore = true;
      fixedCount++;
    }
  }

  // Добавляем четыре ступицы колёс как часть жёсткого ядра. Это реальные
  // точки приложения шинных сил: колесо больше не висит отдельно от кузова,
  // а его масса и момент входят в общую инерцию машины. Оболочка (крылья,
  // пороги) привязывается к ступицам балками, поэтому арки не могут «уехать»
  // относительно колеса.
  const wheelBase = length * 0.62;
  const halfTrack = width * 0.42;
  const wheelNodeStart = nodes.length;
  const wheelLayout = [
    { x: wheelBase * 0.52, y: -halfTrack, name: 'Front-Left Wheel Hub' },
    { x: wheelBase * 0.52, y: halfTrack, name: 'Front-Right Wheel Hub' },
    { x: -wheelBase * 0.48, y: -halfTrack, name: 'Rear-Left Wheel Hub' },
    { x: -wheelBase * 0.48, y: halfTrack, name: 'Rear-Right Wheel Hub' }
  ];
  for (let i = 0; i < wheelLayout.length; i++) {
    const w = wheelLayout[i];
    nodes.push({
      id: wheelNodeStart + i,
      origX: w.x,
      origY: w.y,
      localX: w.x,
      localY: w.y,
      x: w.x,
      y: w.y,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      offsetX: 0,
      offsetY: 0,
      elasticX: 0,
      elasticY: 0,
      mass: Math.max(8, totalMass * 0.035),
      plasticStrain: 0,
      group: 'wheel',
      isFixed: true,
      isCore: true,
      name: w.name
    });
  }
  fixedCount += wheelLayout.length;

  // Нормируем массы узлов на реальную массу автомобиля. Раньше сумма
  // massFrac давала 1.1–1.2 массы, и инерция сетки не соответствовала
  // настройкам машины. Теперь сумма узлов = totalMass, а инерция считается
  // относительно центра масс — её и использует rigid-body интегратор.
  let rawMassSum = 0;
  for (const n of nodes) rawMassSum += n.mass;
  const massScale = rawMassSum > 0 ? totalMass / rawMassSum : 1;
  for (const n of nodes) {
    n.mass = Math.max(8, n.mass * massScale);
  }

  let totalNodeMass = 0;
  let coreMass = 0;
  let comX = 0;
  let comY = 0;
  for (const n of nodes) {
    totalNodeMass += n.mass;
    comX += n.mass * n.origX;
    comY += n.mass * n.origY;
    if (n.isFixed) coreMass += n.mass;
  }
  if (totalNodeMass > 0) {
    comX /= totalNodeMass;
    comY /= totalNodeMass;
  }
  let nodeInertia = 0;
  for (const n of nodes) {
    const rx = n.origX - comX;
    const ry = n.origY - comY;
    nodeInertia += n.mass * (rx * rx + ry * ry);
  }

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

  // Балки «ступица — арка»: привязывают крылья/пороги к колёсным узлам.
  // Без них оболочка держалась только за подрамник и при боковом ударе
  // уезжала относительно колеса.
  for (let wi = 0; wi < wheelLayout.length; wi++) {
    const wheelIdx = wheelNodeStart + wi;
    const wheelNode = nodes[wheelIdx];
    if (!wheelNode) continue;
    const nearest = nodes
      .map((n, idx) => ({ idx, n, d: Math.hypot(n.origX - wheelNode.origX, n.origY - wheelNode.origY) }))
      .filter(o => !o.n.isFixed && o.n.group !== 'wheel')
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const anchor of nearest) {
      const dx = anchor.n.origX - wheelNode.origX;
      const dy = anchor.n.origY - wheelNode.origY;
      const dist = Math.hypot(dx, dy) || 1;
      beams.push({
        id: 1000 + beams.length,
        nodeA: wheelIdx,
        nodeB: anchor.idx,
        origLength: dist,
        restLength: dist,
        spring: DEFAULT_K_STRUCTURAL * 1.4 * springScale * BEAM_FORCE_SCALE / YIELD_RANGE_SCALE,
        damp: DEFAULT_C_STRUCTURAL * 1.4 * dampScale * BEAM_DAMP_SCALE,
        yieldDist: 0.45 * yieldScale * YIELD_RANGE_SCALE,
        breakDist: 22 * breakScale,
        broken: false,
        type: 'structural',
        currentStress: 0,
        plasticDeform: 0
      });
    }
  }

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
    coreMass,
    totalNodeMass,
    nodeInertia,
    comX,
    comY,
    fixedNodeCount: fixedCount,
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
 * Приводит сетку в заведомо конечное состояние. Нужна для старых сохранений и
 * для страховки после численных сбоев: лучше сбросить один узел, чем отдать
 * NaN в рендер и физику кузова.
 */
function sanitizeNodeBeamSystem(system: NodeBeamStructure): void {
  const nodes = system.nodes;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!Number.isFinite(n.mass) || n.mass <= 0) n.mass = 10;
    if (!Number.isFinite(n.origX)) n.origX = 0;
    if (!Number.isFinite(n.origY)) n.origY = 0;
    if (!Number.isFinite(n.x)) n.x = n.origX;
    if (!Number.isFinite(n.y)) n.y = n.origY;
    if (!Number.isFinite(n.vx)) n.vx = 0;
    if (!Number.isFinite(n.vy)) n.vy = 0;
    if (!Number.isFinite(n.offsetX)) n.offsetX = 0;
    if (!Number.isFinite(n.offsetY)) n.offsetY = 0;
    if (!Number.isFinite(n.elasticX)) n.elasticX = 0;
    if (!Number.isFinite(n.elasticY)) n.elasticY = 0;
    if (!Number.isFinite(n.localX)) n.localX = n.origX;
    if (!Number.isFinite(n.localY)) n.localY = n.origY;
  }
  for (let i = 0; i < system.beams.length; i++) {
    const b = system.beams[i];
    if (!Number.isFinite(b.origLength) || b.origLength <= 0) b.origLength = 1;
    if (!Number.isFinite(b.restLength) || b.restLength <= 0) b.restLength = b.origLength;
    if (!Number.isFinite(b.spring) || b.spring <= 0) b.spring = 1;
    if (!Number.isFinite(b.damp) || b.damp < 0) b.damp = 0;
    if (!Number.isFinite(b.yieldDist) || b.yieldDist <= 0) b.yieldDist = 0.01;
    if (!Number.isFinite(b.breakDist) || b.breakDist <= 0) b.breakDist = 1;
  }
  if (!Number.isFinite(system.stableDt as number) || (system.stableDt as number) <= 0) {
    system.stableDt = computeStableDt(nodes, system.beams);
  }
  if (!Number.isFinite(system.stableDt as number) || (system.stableDt as number) <= 0) {
    system.stableDt = 0.001;
  }
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
  const existing = dmg.nodeBeam;
  const meshOutdated = !!existing && (
    !Array.isArray(existing.nodes) ||
    !existing.nodes.some(n => n.group === 'wheel') ||
    (existing.fixedNodeCount || 0) < 3
  );
  if (!existing || !Array.isArray(existing.nodes) || existing.nodes.length < 8 || meshOutdated) {
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
  sanitizeNodeBeamSystem(dmg.nodeBeam);
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
  const stable = Math.max(1e-6, system.stableDt || 0.002);
  // Явный интегратор нельзя гнать быстрее устойчивого шага. Раньше здесь стоял
  // жёсткий кап 64 подшага, а реальной сетке седана нужно 128 уже на 60 FPS и
  // 384 на 20 FPS — интегратор работал за пределом устойчивости, отсюда «желе»
  // и выбросы энергии. Теперь подшагов столько, сколько требует физика; если
  // кап всё-таки достигнут, сетка честно симулирует меньше времени за кадр
  // (лёгкое замедление деформации), но не взрывается.
  const neededSubSteps = Math.max(1, Math.ceil(clampedDt / stable));
  const subSteps = Math.min(MAX_SUBSTEPS, neededSubSteps);
  const subDt = Math.min(stable, clampedDt / subSteps);
  const simulatedDt = Math.max(1e-6, subDt * subSteps);
  const penRate = (pen1 - pen0) / simulatedDt;
  const halfL = car.length / 2;
  const halfW = car.width / 2;
  const maxDisplacement = Math.max(halfL * 0.85, halfW * 0.85);

  const omega = Math.max(-20, Math.min(20, system.bodyOmega || 0));
  const alpha = Math.max(-250, Math.min(250, system.bodyAlpha || 0));
  const omega2 = omega * omega;

  const drag = Math.pow(NODE_DRAG_PER_FRAME, subDt * 60);
  const plasticRelax = 1 - Math.exp(-PLASTIC_RATE * subDt);

  let maxStress = 0;
  let plasticShiftTotal = 0;
  let contactForce = 0;
  let reactionFx = 0;
  let reactionFy = 0;
  let reactionTorque = 0;
  const comX = Number.isFinite(system.comX as number) ? (system.comX as number) : 0;
  const comY = Number.isFinite(system.comY as number) ? (system.comY as number) : 0;

  for (let step = 0; step < subSteps; step++) {
    // 1. Силы: инерция системы отсчёта кузова. Помимо линейного торможения
    // учитываем центробежную, эйлерову и кориолисову нагрузку — без них при
    // вращении кузова оболочка «отставала» и выглядела как желе.
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const ax = -accelX + alpha * n.origY + omega2 * n.origX + 2 * omega * n.vy;
      const ay = -accelY - alpha * n.origX + omega2 * n.origY - 2 * omega * n.vx;
      n.fx = n.mass * ax;
      n.fy = n.mass * ay;
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

      // Реакция оболочки на жёсткое ядро: раньше силы на закреплённые узлы
      // просто выбрасывались, и кузов «не чувствовал» смятую панель. Теперь
      // суммарная сила и момент передаются в rigid-body кузова (двусторонняя
      // связь), но с ограничением, чтобы удар не телепортировал машину.
      if (nA.isFixed) {
        const fxA = -fTotal * dirX;
        const fyA = -fTotal * dirY;
        reactionFx += fxA;
        reactionFy += fyA;
        reactionTorque += (nA.origX - comX) * fyA - (nA.origY - comY) * fxA;
      }
      if (nB.isFixed) {
        const fxB = fTotal * dirX;
        const fyB = fTotal * dirY;
        reactionFx += fxB;
        reactionFy += fyB;
        reactionTorque += (nB.origX - comX) * fyB - (nB.origY - comY) * fxB;
      }
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

      // Предохранитель: ни один узел не должен улететь быстрее разумного.
      // Именно здесь раньше рождался NaN: при curDisp = Infinity фактор
      // maxDisplacement / Infinity = 0, а Infinity * 0 = NaN.
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y) ||
          !Number.isFinite(node.vx) || !Number.isFinite(node.vy)) {
        node.x = node.origX;
        node.y = node.origY;
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      const sp2 = node.vx * node.vx + node.vy * node.vy;
      if (sp2 > MAX_NODE_SPEED * MAX_NODE_SPEED) {
        const k = MAX_NODE_SPEED / Math.sqrt(sp2);
        node.vx *= k;
        node.vy *= k;
      }
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

  // Убираем остаточные «жёсткие» моды оболочки: средний сдвиг и поворот всех
  // свободных узлов относительно ядра. Локальные вмятины сохраняются, но кузов
  // больше не может целиком уехать/повернуться относительно колёс.
  projectShellRigidModes(system);

  // Реакция усредняется по подшагам и ограничивается: это сила, а не импульс.
  system.reactionFx = clampFinite(reactionFx / subSteps, -MAX_SHELL_REACTION, MAX_SHELL_REACTION);
  system.reactionFy = clampFinite(reactionFy / subSteps, -MAX_SHELL_REACTION, MAX_SHELL_REACTION);
  system.reactionTorque = clampFinite(reactionTorque / subSteps, -MAX_SHELL_REACTION * car.length, MAX_SHELL_REACTION * car.length);

  // Смещения узлов для рендера: пластическая часть (localX/Y) и упругое «дрожание»
  let maxSpeedSq = 0;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    let totalOffsetX = node.x - node.origX;
    let totalOffsetY = node.y - node.origY;
    if (!Number.isFinite(totalOffsetX) || !Number.isFinite(totalOffsetY)) {
      node.x = node.origX;
      node.y = node.origY;
      node.vx = 0;
      node.vy = 0;
      totalOffsetX = 0;
      totalOffsetY = 0;
    }
    const plasticWeight = Math.min(1.0, (node.plasticStrain || 0) * 0.4);
    node.localX = node.origX + totalOffsetX * plasticWeight;
    node.localY = node.origY + totalOffsetY * plasticWeight;
    node.offsetX = totalOffsetX;
    node.offsetY = totalOffsetY;
    node.elasticX = node.x - node.localX;
    node.elasticY = node.y - node.localY;
    const sp = node.vx * node.vx + node.vy * node.vy;
    if (Number.isFinite(sp) && sp > maxSpeedSq) maxSpeedSq = sp;
  }
  return Math.sqrt(maxSpeedSq);
}

function clampFinite(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < min ? min : v > max ? max : v;
}

/**
 * Проекция деформируемой оболочки на пространство без жёстких мод.
 *
 * Свободные узлы могут накопить общий сдвиг и поворот относительно ядра
 * (именно это давало «краба»: кузов доворачивался, колёса оставались).
 * Вычитаем средневзвешенное смещение и угловую составляющую, оставляя только
 * локальные вмятины. То же делаем со скоростями, чтобы не внести ложный
 * угловой момент.
 */
function projectShellRigidModes(system: NodeBeamStructure): void {
  const nodes = system.nodes;
  let M = 0;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.isFixed) continue;
    M += n.mass;
    mx += n.mass * (n.x - n.origX);
    my += n.mass * (n.y - n.origY);
  }
  if (M <= 1e-6) return;
  mx /= M;
  my /= M;

  let L = 0;
  let I = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.isFixed) continue;
    n.x -= mx;
    n.y -= my;
    const ox = n.x - n.origX;
    const oy = n.y - n.origY;
    L += n.mass * (n.origX * oy - n.origY * ox);
    I += n.mass * (n.origX * n.origX + n.origY * n.origY);
  }
  if (I > 1e-6) {
    const theta = L / I;
    if (Number.isFinite(theta) && Math.abs(theta) > 1e-7) {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.isFixed) continue;
        n.x += theta * n.origY;
        n.y -= theta * n.origX;
      }
    }
  }

  // Скорости: убираем средний перенос и среднее вращение.
  let mvx = 0;
  let mvy = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.isFixed) continue;
    mvx += n.mass * n.vx;
    mvy += n.mass * n.vy;
  }
  mvx /= M;
  mvy /= M;
  let Lv = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.isFixed) continue;
    n.vx -= mvx;
    n.vy -= mvy;
    Lv += n.mass * (n.origX * n.vy - n.origY * n.vx);
  }
  if (I > 1e-6) {
    const omega = Lv / I;
    if (Number.isFinite(omega) && Math.abs(omega) > 1e-7) {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.isFixed) continue;
        n.vx += omega * n.origY;
        n.vy -= omega * n.origX;
      }
    }
  }
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

  system.bodyOmega = Number.isFinite(car.angularVelocity) ? car.angularVelocity : 0;

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
    system.bodyAlpha = 0;
    system.needsSync = true;

    // Двусторонняя связь: оболочка через балки тянет/тормозит жёсткое ядро.
    // Коэффициенты намеренно мягкие: основную энергию удара по-прежнему
    // поглощает damageModel, а здесь важна асимметрия (подруливание/рывок
    // вбок от смятого крыла), а не повторное торможение машины.
    const rx = Number.isFinite(system.reactionFx) ? system.reactionFx! : 0;
    const ry = Number.isFinite(system.reactionFy) ? system.reactionFy! : 0;
    const tq = Number.isFinite(system.reactionTorque) ? system.reactionTorque! : 0;
    if ((rx !== 0 || ry !== 0 || tq !== 0) && dt > 0) {
      const mass = Math.max(300, car.mass || 1400);
      const inertia = Math.max(
        system.nodeInertia || 0,
        mass * (car.length * car.length + car.width * car.width) / 12
      );
      const cosA = Math.cos(car.angle);
      const sinA = Math.sin(car.angle);
      const invMass = 1 / mass;
      car.vx += (rx * cosA - ry * sinA) * invMass * dt * 0.08;
      car.vy += (rx * sinA + ry * cosA) * invMass * dt * 0.08;
      car.angularVelocity += (tq / Math.max(1, inertia)) * dt * 0.18;
      if (!Number.isFinite(car.vx)) car.vx = 0;
      if (!Number.isFinite(car.vy)) car.vy = 0;
      if (!Number.isFinite(car.angularVelocity)) car.angularVelocity = 0;
    }

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

  // Жёсткая санитизация: ни одно смещение/агрегат не имеет права быть NaN.
  // Иначе один нефинитный узел навсегда отравляет frontCrumple, а вслед за ним
  // crushStartPx и скорость машины (именно этот путь давал «speed: NaN»).
  const finiteOrZero = (v: number | undefined): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    n.offsetX = finiteOrZero(n.offsetX);
    n.offsetY = finiteOrZero(n.offsetY);
    n.elasticX = finiteOrZero(n.elasticX);
    n.elasticY = finiteOrZero(n.elasticY);
    n.localX = finiteOrZero(n.localX);
    n.localY = finiteOrZero(n.localY);
    n.vx = finiteOrZero(n.vx);
    n.vy = finiteOrZero(n.vy);
  }
  const damageKeys = [
    'frontCrumple', 'rearCrumple', 'leftDent', 'rightDent',
    'frontLeftDent', 'frontRightDent', 'rearLeftDent', 'rearRightDent',
    'wheelRubResistance', 'steeringDrift', 'frameBentAngle'
  ] as const;
  for (const key of damageKeys) {
    if (!Number.isFinite((dmg as any)[key])) (dmg as any)[key] = 0;
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

  // Update vertex slots directly from physical simulated nodes
  for (let i = 0; i < vertCount; i++) {
    const n = nodes[i];
    const dv = dmg.deformedVertices[i];
    if (!n || !dv) continue;

    dv.offsetX = finiteOrZero(n.offsetX);
    dv.offsetY = finiteOrZero(n.offsetY);
    dv.targetOffsetX = dv.offsetX;
    dv.targetOffsetY = dv.offsetY;
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
    const frontOffsets = tracking.frontNodeIds.map(id => nodes[id] ? -finiteOrZero(nodes[id].offsetX) : 0);
    dmg.frontCrumple = Math.max(finiteOrZero(dmg.frontCrumple), 0, ...frontOffsets);
    const leftCornerNode = nodes[tracking.frontNodeIds[tracking.frontNodeIds.length - 1]];
    const rightCornerNode = nodes[tracking.frontNodeIds[1] ?? tracking.frontNodeIds[0]];
    dmg.frontLeftDent = Math.max(finiteOrZero(dmg.frontLeftDent), leftCornerNode ? Math.hypot(finiteOrZero(leftCornerNode.offsetX), finiteOrZero(leftCornerNode.offsetY)) : 0);
    dmg.frontRightDent = Math.max(finiteOrZero(dmg.frontRightDent), rightCornerNode ? Math.hypot(finiteOrZero(rightCornerNode.offsetX), finiteOrZero(rightCornerNode.offsetY)) : 0);
  } else {
    const frontNode = nodes.reduce((prev, curr) => (curr.origX > prev.origX ? curr : prev), nodes[0]);
    dmg.frontCrumple = Math.max(finiteOrZero(dmg.frontCrumple), 0, -finiteOrZero(frontNode.offsetX));
    dmg.frontLeftDent = Math.max(finiteOrZero(dmg.frontLeftDent), Math.hypot(finiteOrZero(frontNode.offsetX), finiteOrZero(frontNode.offsetY)));
    dmg.frontRightDent = Math.max(finiteOrZero(dmg.frontRightDent), dmg.frontLeftDent);
  }

  // Rear crumple:
  if (tracking?.rearNodeIds && tracking.rearNodeIds.length > 0) {
    const rearOffsets = tracking.rearNodeIds.map(id => nodes[id] ? finiteOrZero(nodes[id].offsetX) : 0);
    dmg.rearCrumple = Math.max(finiteOrZero(dmg.rearCrumple), 0, ...rearOffsets);
    const rearRightNode = nodes[tracking.rearNodeIds[0]];
    const rearLeftNode = nodes[tracking.rearNodeIds[tracking.rearNodeIds.length - 1]];
    dmg.rearRightDent = Math.max(finiteOrZero(dmg.rearRightDent), rearRightNode ? Math.hypot(finiteOrZero(rearRightNode.offsetX), finiteOrZero(rearRightNode.offsetY)) : 0);
    dmg.rearLeftDent = Math.max(finiteOrZero(dmg.rearLeftDent), rearLeftNode ? Math.hypot(finiteOrZero(rearLeftNode.offsetX), finiteOrZero(rearLeftNode.offsetY)) : 0);
  } else {
    const rearNode = nodes.reduce((prev, curr) => (curr.origX < prev.origX ? curr : prev), nodes[0]);
    dmg.rearCrumple = Math.max(finiteOrZero(dmg.rearCrumple), 0, finiteOrZero(rearNode.offsetX));
    dmg.rearLeftDent = Math.max(finiteOrZero(dmg.rearLeftDent), Math.hypot(finiteOrZero(rearNode.offsetX), finiteOrZero(rearNode.offsetY)));
    dmg.rearRightDent = Math.max(finiteOrZero(dmg.rearRightDent), dmg.rearLeftDent);
  }

  // Side flanks:
  if (tracking?.leftNodeIds && tracking.leftNodeIds.length > 0) {
    dmg.leftDent = Math.max(finiteOrZero(dmg.leftDent), 0, ...tracking.leftNodeIds.map(id => nodes[id] ? finiteOrZero(nodes[id].offsetY) : 0));
  } else {
    const leftNode = nodes.reduce((prev, curr) => (curr.origY < prev.origY ? curr : prev), nodes[0]);
    dmg.leftDent = Math.max(finiteOrZero(dmg.leftDent), 0, -finiteOrZero(leftNode.offsetY));
  }

  if (tracking?.rightNodeIds && tracking.rightNodeIds.length > 0) {
    dmg.rightDent = Math.max(finiteOrZero(dmg.rightDent), 0, ...tracking.rightNodeIds.map(id => nodes[id] ? -finiteOrZero(nodes[id].offsetY) : 0));
  } else {
    const rightNode = nodes.reduce((prev, curr) => (curr.origY > prev.origY ? curr : prev), nodes[0]);
    dmg.rightDent = Math.max(finiteOrZero(dmg.rightDent), 0, finiteOrZero(rightNode.offsetY));
  }

  // Steering drift & frame twist:
  const flId = tracking?.subframeLeftFL;
  const frId = tracking?.subframeRightFR;
  if (flId !== undefined && frId !== undefined && nodes[flId] && nodes[frId]) {
    const subframeAsym = (finiteOrZero(nodes[flId].offsetX) - finiteOrZero(nodes[frId].offsetX)) * 0.12;
    dmg.steeringDrift = Number.isFinite(subframeAsym) ? Math.max(-1.0, Math.min(1.0, subframeAsym)) : 0;
    dmg.frameBentAngle = Number.isFinite(subframeAsym) ? subframeAsym * 0.08 : 0;
  }

  // Wheel rub resistance: check fender / wheel well nodes
  const fenderNodes = nodes.filter(n => n.group === 'fender' || n.group === 'quarter');
  if (fenderNodes.length > 0) {
    const rubSum = fenderNodes.reduce(
      (acc, fn) => acc + Math.max(0, Math.hypot(finiteOrZero(fn.offsetX), finiteOrZero(fn.offsetY)) - 3.0),
      0
    );
    dmg.wheelRubResistance = Number.isFinite(rubSum) ? rubSum * 3.5 : 0;
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
  if (!Number.isFinite(c.normalX) || !Number.isFinite(c.normalY)) {
    return undefined;
  }
  const model = c.crushModel;
  let profile = crushProfileCache.get(model);
  if (!profile) {
    profile = createCrushProfile(model);
    crushProfileCache.set(model, profile);
  }
  const share = Math.max(0.05, Math.min(1, model.share));
  const initialNormalSpeed = Number.isFinite(c.initialNormalSpeed) ? Math.abs(c.initialNormalSpeed!) : 0;

  if (!Number.isFinite(c.crushStartPx as number)) c.crushStartPx = 0;
  if (!Number.isFinite(c.crushDepthPx as number)) c.crushDepthPx = c.crushStartPx;
  if (c.crushSpeed === undefined || !Number.isFinite(c.crushSpeed)) c.crushSpeed = initialNormalSpeed * share;

  const prevPhase = c.crushStopped ? (c.reboundSpeed || 0) : c.crushSpeed / share;
  let phase: number;
  if (!c.crushStopped) {
    const r = advanceCrushStroke(
      profile,
      Math.max(300, car.mass || 1400),
      Number.isFinite(c.crushDepthPx as number) ? (c.crushDepthPx as number) : 0,
      Number.isFinite(c.crushSpeed as number) ? (c.crushSpeed as number) : 0,
      dt
    );
    if (!Number.isFinite(r.depth) || !Number.isFinite(r.speed)) {
      // Численный сбой внутри профиля: фиксируем остановку, но не пускаем NaN дальше.
      c.crushStopped = true;
      c.crushDepthPx = Number.isFinite(c.crushDepthPx as number) ? (c.crushDepthPx as number) : 0;
      c.crushSpeed = 0;
      phase = 0;
    } else {
      c.crushDepthPx = r.depth;
      c.crushSpeed = r.speed;
      if (r.stopped) c.crushStopped = true;
      phase = c.crushSpeed / share;
    }
  } else {
    phase = Number.isFinite(c.reboundSpeed) ? (c.reboundSpeed || 0) : 0;
  }
  if (!Number.isFinite(phase)) phase = 0;

  // Ускорение системы отсчёта кузова (мировое → локальное) для инерционной нагрузки узлов
  const system = car.damage?.nodeBeam;
  if (system) {
    const dPhase = phase - (Number.isFinite(prevPhase) ? prevPhase : 0);
    const aWx = -c.normalX * dPhase / dt;
    const aWy = -c.normalY * dPhase / dt;
    const cosA = Math.cos(car.angle);
    const sinA = Math.sin(car.angle);
    const ax = aWx * cosA + aWy * sinA;
    const ay = -aWx * sinA + aWy * cosA;
    system.frameAx = Number.isFinite(ax) ? (system.frameAx || 0) + ax : 0;
    system.frameAy = Number.isFinite(ay) ? (system.frameAy || 0) + ay : 0;
    if (!Number.isFinite(system.frameAx)) system.frameAx = 0;
    if (!Number.isFinite(system.frameAy)) system.frameAy = 0;
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
  if (!Number.isFinite(c.normalX) || !Number.isFinite(c.normalY) ||
      !Number.isFinite(c.contactX) || !Number.isFinite(c.contactY)) return;

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
    const depth = Number.isFinite(c.crushDepthPx) ? c.crushDepthPx : ct.pen;
    const start = Number.isFinite(c.crushStartPx as number) ? (c.crushStartPx as number) : 0;
    pen1 = Math.max(ct.pen, depth - start);
  } else {
    // Кинематический ход к целевой глубине (удары между машинами и препятствия без силовой модели)
    const progress = c.totalDuration > 0
      ? Math.max(0, Math.min(1.0, 1.0 - c.timer / c.totalDuration))
      : 1.0;
    const target = Number.isFinite(c.targetCrushPx) && (c.targetCrushPx as number) > 0
      ? (c.targetCrushPx as number)
      : halfL * 0.30;
    const rel = Math.max(0, target - ct.depth0);
    const t = Math.min(1, progress / 0.74);
    pen1 = Math.max(ct.pen, rel * t * t * (3 - 2 * t));
  }
  if (!Number.isFinite(pen1)) pen1 = ct.pen;
  if (!Number.isFinite(pen1)) pen1 = 0;

  system.contactPen0 = Number.isFinite(ct.pen) ? ct.pen : 0;
  system.contactPen1 = pen1;
  ct.pen = pen1;
  system.isSleeping = false;

  stepNodeBeamSimulation(system, dt, car);
  // Сообщаем updateVehicleSystems, что за этот кадр шаг уже сделан (иначе dt обрабатывался дважды)
  system.steppedThisTick = true;
}

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
import { crashEnergy, reducedMass, strikeEnergy } from './damageModel';
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

    const springK = (bt.spring !== undefined ? bt.spring : baseK) * springScale;
    const dampC = (bt.damp !== undefined ? bt.damp : baseC) * dampScale;
    const yieldDistance = (bt.yieldDist !== undefined ? bt.yieldDist : baseYield) * yieldScale;
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
    definition: def
  };
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

/**
 * Sub-stepped BeamNG elastoplastic physics solver tick.
 * Propagates forces, yields plastic strain, snaps broken latches, and updates vehicle geometry.
 */
export function stepNodeBeamSimulation(
  system: NodeBeamStructure,
  dt: number,
  car: Vehicle
): void {
  const nodes = system.nodes;
  const beams = system.beams;
  if (!nodes || nodes.length < 8 || !beams || beams.length < 6) return;

  // BeamNG sub-stepping: split physics frame into 3 micro-ticks for stiffness stability
  const clampedDt = Math.max(0.001, Math.min(0.045, dt));
  const subSteps = 3;
  const subDt = clampedDt / subSteps;
  const halfL = car.length / 2;
  const halfW = car.width / 2;

  let maxStressThisTick = 0;
  let totalPlasticShiftThisTick = 0;

  for (let step = 0; step < subSteps; step++) {
    // 1. Reset node force accumulators
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].fx = 0;
      nodes[i].fy = 0;
    }

    // 2. Beam relaxation, elastoplastic yield, and fracture check
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

      const delta = curDist - beam.restLength;
      const absDelta = Math.abs(delta);
      const stressRatio = absDelta / beam.origLength;
      beam.currentStress = stressRatio;
      if (stressRatio > maxStressThisTick) {
        maxStressThisTick = stressRatio;
      }

      // Support beam: one-way compression only (infinite tension slack)
      if (beam.type === 'support' && delta >= 0) {
        continue;
      }

      // --- ELASTOPLASTIC YIELDING (BEAMNG PLASTIC METAL FLOW) ---
      // Листовой металл кузова необратимо сминается только при СЖАТИИ (delta < 0).
      // Раньше текучесть работала и на растяжение: упругий отскок/волна после удара тянул балки
      // дальше порога 0.35-0.8 px, restLength навсегда вырастал (до x8) и кузов «вытягивался».
      // Растяжение теперь только упругое; предельное растяжение по-прежнему рвёт балку (breakDist).
      if (delta < 0 && absDelta > beam.yieldDist) {
        const excess = absDelta - beam.yieldDist;
        const plasticFlowRate = 40.0 * subDt; // было 16: пластика отставала от хода сжатия, и упругий возврат стирал до 55% вмятины
        const shift = Math.sign(delta) * excess * Math.min(0.55, plasticFlowRate);

        beam.restLength += shift;
        beam.plasticDeform = (beam.plasticDeform || 0) + shift;
        totalPlasticShiftThisTick += Math.abs(shift);

        const strainAdd = (Math.abs(shift) / beam.origLength) * 1.8;
        nA.plasticStrain = Math.min(4.0, (nA.plasticStrain || 0) + strainAdd);
        nB.plasticStrain = Math.min(4.0, (nB.plasticStrain || 0) + strainAdd);
      }

      // --- BEAM FRACTURE / BREAKAGE ---
      if (absDelta > beam.breakDist) {
        beam.broken = true;
        system.brokenBeamCount++;

        // Trigger corresponding body component failure
        if (car.damage) {
          const dmg = car.damage;
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
        continue;
      }

      // --- VISCOELASTIC HOOKEAN FORCES ---
      // Relative velocity along beam axis
      const relVx = nB.vx - nA.vx;
      const relVy = nB.vy - nA.vy;
      const vRel = relVx * dirX + relVy * dirY;

      const fSpring = -beam.spring * delta;
      const fDamp = -beam.damp * vRel;
      const fTotal = fSpring + fDamp;

      // Apply equal and opposite forces
      nA.fx -= fTotal * dirX;
      nA.fy -= fTotal * dirY;
      nB.fx += fTotal * dirX;
      nB.fy += fTotal * dirY;
    }

    // 3. Node Integration (Verlet / Semi-implicit Euler)
    const damping = Math.pow(0.88, subDt * 60); // Air and internal material damping

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
      const ax = node.fx * invMass;
      const ay = node.fy * invMass;

      node.vx = (node.vx + ax * subDt) * damping;
      node.vy = (node.vy + ay * subDt) * damping;

      node.x += node.vx * subDt;
      node.y += node.vy * subDt;

      // Restrict maximum unphysical inversion displacement past vehicle center
      const maxDisplacement = Math.max(halfL * 0.85, halfW * 0.85);
      const curDisp = Math.hypot(node.x - node.origX, node.y - node.origY);
      if (curDisp > maxDisplacement) {
        const factor = maxDisplacement / curDisp;
        node.x = node.origX + (node.x - node.origX) * factor;
        node.y = node.origY + (node.y - node.origY) * factor;
        node.vx *= 0.2;
        node.vy *= 0.2;
      }

      // Smoothly update resting plastic position (localX, localY) and transient elastic jiggle
      const totalOffsetX = node.x - node.origX;
      const totalOffsetY = node.y - node.origY;

      // Plastic rest position tracks permanent deformation
      const plasticWeight = Math.min(1.0, (node.plasticStrain || 0) * 0.4);
      node.localX = node.origX + totalOffsetX * plasticWeight;
      node.localY = node.origY + totalOffsetY * plasticWeight;

      node.offsetX = totalOffsetX;
      node.offsetY = totalOffsetY;
      node.elasticX = node.x - node.localX;
      node.elasticY = node.y - node.localY;
    }

    enforceCrushLimit(system);
  }

  system.maxStress = maxStressThisTick;
  system.totalPlasticDeform += totalPlasticShiftThisTick;

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
 * Injects a physical collision impulse directly into the Node-Beam network.
 * Accurately models narrow point impacts (poles/trees wrap around vehicle)
 * vs wide surface impacts (flat walls, guardrails, barrier scraping).
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

  // Convert global contact and normal into vehicle local frame
  const dx = contactX - car.x;
  const dy = contactY - car.y;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  const localContactX = dx * cosA + dy * sinA;
  const localContactY = -dx * sinA + dy * cosA;

  // Local impact direction vector (pointing into the vehicle)
  let localImpulseX = -(normalX * cosA + normalY * sinA);
  let localImpulseY = -(-normalX * sinA + normalY * cosA);

  const impLen = Math.hypot(localImpulseX, localImpulseY) || 1;
  localImpulseX /= impLen;
  localImpulseY /= impLen;

  // Physical kinetic momentum transfer (BeamNG reduced mass impulse).
  // A real crash uses one contact force throughout the crush stroke.  In this
  // 2D model activeCrumple is that contact force; injecting a second, instant
  // spring impulse first made the perimeter flare/flatten for one frame and
  // only then compress.  Keep burst impulses for diagnostics and small hits,
  // but let an active crash be driven solely by the directional contact solver.
  const isContinuousCrush = !!car.activeCrumple && car.activeCrumple.timer > 0;
  const mu = reducedMass(car.mass || 1400, strikerMass);
  const normalSpeed = Math.max(12, impactSpeed);
  const impulseMag = isContinuousCrush ? 0 : mu * normalSpeed * 0.0022; // Scaled to 2D node mass units

  // Contact radius: narrow pole concentrates impulse on 1-3 nodes, wide wall distributes it
  const carWidth = car.width;
  const effectiveContactWidth = contactWidthPx !== undefined
    ? Math.max(2.0, Math.min(carWidth, contactWidthPx))
    : (isNarrowImpact ? 5.5 : carWidth);

  const spreadRadius = isNarrowImpact
    ? Math.max(4.0, effectiveContactWidth * 0.85)
    : Math.max(9.0, effectiveContactWidth * 0.45);

  // Distribute impulse across neighboring nodes
  let totalWeight = 0;
  const weights: number[] = new Array(nodes.length).fill(0);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.isFixed) continue;

    const dist = Math.hypot(n.x - localContactX, n.y - localContactY);
    if (dist > spreadRadius * 2.2) continue;

    // Gaussian bell falloff
    const w = Math.exp(-(dist * dist) / (2 * spreadRadius * spreadRadius));
    weights[i] = w;
    totalWeight += w;
  }

  if (totalWeight <= 0.0001) {
    // If no node was in radius, find single closest node
    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].isFixed) continue;
      const d = Math.hypot(nodes[i].x - localContactX, nodes[i].y - localContactY);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }
    weights[closestIdx] = 1.0;
    totalWeight = 1.0;
  }

  // Inject impulse velocity: deltaV = J * (w / totalWeight) / mass
  for (let i = 0; i < nodes.length; i++) {
    const w = weights[i];
    if (w <= 0) continue;

    const n = nodes[i];
    const nodeImpulse = impulseMag * (w / totalWeight);
    const dv = (nodeImpulse / Math.max(15, n.mass)) * 85.0;

    n.vx += localImpulseX * dv;
    n.vy += localImpulseY * dv;

    // Scrape tangential component
    if (scrapeSpeed > 10) {
      const tangX = -localImpulseY;
      const tangY = localImpulseX;
      const dvScrape = (scrapeSpeed * 0.08 * w) / Math.max(15, n.mass);
      n.vx += tangX * dvScrape;
      n.vy += tangY * dvScrape;
    }
  }

  // Поступательное движение кузова обрабатывает сама машина (физика твёрдого тела), поэтому
  // узлам оставляем только ОТНОСИТЕЛЬНУЮ часть импульса. Иначе весь каркас целиком съезжает
  // относительно закреплённого узла 29 (до 6 px после удара), что выглядит как вытянутость.
  {
    let sumM = 0, sumPx = 0, sumPy = 0;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].isFixed) continue;
      sumM += nodes[i].mass;
      sumPx += nodes[i].vx * nodes[i].mass;
      sumPy += nodes[i].vy * nodes[i].mass;
    }
    if (sumM > 0) {
      const mvx = sumPx / sumM;
      const mvy = sumPy / sumM;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].isFixed) continue;
        nodes[i].vx -= mvx;
        nodes[i].vy -= mvy;
      }
    }
  }

  // Упор глубины: уже имеющаяся вмятина в зоне контакта + расчётная глубина этого удара
  if (crushLimitPx !== undefined && crushLimitPx > 0) {
    let curDepth = 0;
    for (let i = 0; i < nodes.length; i++) {
      if (weights[i] <= 0.3) continue;
      const d = (nodes[i].x - nodes[i].origX) * localImpulseX + (nodes[i].y - nodes[i].origY) * localImpulseY;
      if (d > curDepth) curDepth = d;
    }
    // targetCrushPx is cumulative across repeated impacts in one zone. Keep
    // the constraint large enough for that target; otherwise energy damage
    // accumulates while the rendered mesh is capped at the newest hit only.
    const cumulativeTarget = car.activeCrumple?.targetCrushPx || 0;
    system.crushLimit = {
      dirX: localImpulseX,
      dirY: localImpulseY,
      depth: Math.max(curDepth + crushLimitPx * 1.15, cumulativeTarget * 1.05),
      cx: localContactX,
      cy: localContactY,
      radius: spreadRadius * 2.2
    };
  } else {
    system.crushLimit = undefined;
  }

  // If activeCrumple is NOT active (e.g. manual diagnostics test or instant scrape), run burst immediately.
  // During a real crash stepNodeBeamContinuousContact applies the contact displacement in the same direction
  // on the regular physics tick.  Running a separate shock step here reintroduced the visual pre-flattening.
  if (!isContinuousCrush) {
    for (let burst = 0; burst < 4; burst++) {
      stepNodeBeamSimulation(system, 0.016, car);
    }
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

/**
 * Continuous Dynamic Contact Solver for multi-frame crumple zone collapse.
 *
 * In slow-motion (e.g. timeScale 0.1 or 0.05) or normal speed, as the car
 * penetrates an obstacle (wall, pole, vehicle) over multiple frames/seconds:
 * 1. Nodes in contact are continuously forced back by the obstacle penetration constraint.
 * 2. Connected beams compress incrementally each physics tick with delta time `dt`.
 * 3. Plastic yielding and accordion folds accumulate continuously over time.
 * 4. Stresses rise progressively, snapping breakable latches mid-impact.
 * 5. Beam compression forces decelerate the vehicle organically until kinetic energy is dissipated.
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
  const halfW = car.width / 2;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  // activeCrumple.normal направлена ОТ препятствия К машине (см. создание activeCrumple в physics.ts:
  // contactX = vehicle.x - normalX * L/2, выталкивание vehicle.x += normalX * depth).
  const normX = c.normalX;
  const normY = c.normalY;

  // Направление «внутрь кузова» — это и есть эта нормаль, переведённая в локальные координаты машины.
  // Раньше здесь стоял минус (знак скопирован из applyNodeBeamImpact, где нормаль идёт от машины К
  // препятствию): узлы зоны контакта выдавливались В СТОРОНУ препятствия, вмятина «выпрямлялась»
  // и бампер уезжал вперёд за исходное положение.
  let locImpulseX = normX * cosA + normY * sinA;
  let locImpulseY = -normX * sinA + normY * cosA;
  const impLen = Math.hypot(locImpulseX, locImpulseY) || 1;
  locImpulseX /= impLen;
  locImpulseY /= impLen;

  // Progress of the active crumple cycle (0.0 = contact onset, 1.0 = completed stroke)
  const progress = c.totalDuration > 0
    ? Math.max(0, Math.min(1.0, 1.0 - c.timer / c.totalDuration))
    : 1.0;

  // Initial impact speed
  const initNormalSpeed = Math.abs(c.initialNormalSpeed !== undefined ? c.initialNormalSpeed : c.initialSpeed) || 60;

  // During the compression stroke (phase 0.0 -> 0.74):
  if (progress < 0.74) {
    const isNarrow = c.isNarrowImpact ?? false;
    const penetrationRate = Math.max(10, initNormalSpeed * (1.0 - progress * 0.85));
    const deltaDisplacement = penetrationRate * dt * 0.45;
    // Целевая глубина вмятины: из энергетической модели, иначе консервативный предел
    const targetCrush = c.targetCrushPx !== undefined && c.targetCrushPx > 0
      ? c.targetCrushPx
      : halfL * 0.30;

    if (isNarrow) {
      // True Soft-Body Pole / Tree / Bollard Wrapping:
      // Every node tests distance directly against the obstacle center (c.contactX, c.contactY).
      // Nodes that penetrate the pole radius get pushed outward/around the obstacle naturally!
      const poleRadius = Math.max(6.0, (c.contactWidthPx || 14) * 0.6);
      const poleX = c.contactX;
      const poleY = c.contactY;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.isFixed) continue;

        // Node position in world space
        const worldX = n.x * cosA - n.y * sinA + car.x;
        const worldY = n.x * sinA + n.y * cosA + car.y;

        const toNodeX = worldX - poleX;
        const toNodeY = worldY - poleY;
        const distToPole = Math.hypot(toNodeX, toNodeY) || 0.0001;

        if (distToPole < poleRadius * 1.6) {
          // Penetration depth into pole
          const overlap = (poleRadius * 1.4) - distToPole;
          if (overlap > 0) {
            const pushDirX = toNodeX / distToPole;
            const pushDirY = toNodeY / distToPole;

            // Convert world push vector into car local space
            const localPushX = pushDirX * cosA + pushDirY * sinA;
            const localPushY = -pushDirX * sinA + pushDirY * cosA;

            const crushAmount = overlap * Math.min(1.0, 15.0 * dt);
            n.x += localPushX * crushAmount;
            n.y += localPushY * crushAmount;
            n.vx += localPushX * 35;
            n.vy += localPushY * 35;
          }
        }
      }
    } else {
      // Wide Surface Impact (Walls, flat barriers):
      const effectiveContactWidth = c.contactWidthPx !== undefined
        ? Math.max(2.0, Math.min(car.width, c.contactWidthPx))
        : car.width;

      const spreadRadius = Math.max(10.0, effectiveContactWidth * 0.48);

      // Transform contact point into car local space
      const dx = c.contactX - car.x;
      const dy = c.contactY - car.y;
      const localContactX = dx * cosA + dy * sinA;
      const localContactY = -dx * sinA + dy * cosA;

      // Достигнутая глубина вмятины в зоне контакта (по узлам с заметным весом)
      let achievedDepth = 0;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.isFixed) continue;
        const d0 = Math.hypot(n.origX - localContactX, n.origY - localContactY);
        if (d0 > spreadRadius * 1.2) continue;
        const depth = (n.x - n.origX) * locImpulseX + (n.y - n.origY) * locImpulseY;
        if (depth > achievedDepth) achievedDepth = depth;
      }
      const remainingCrush = Math.max(0, targetCrush - achievedDepth);

      // Progressively push contact nodes into vehicle interior
      for (let i = 0; i < nodes.length; i++) {
        if (remainingCrush <= 0) break;
        const n = nodes[i];
        if (n.isFixed) continue;

        const dist = Math.hypot(n.x - localContactX, n.y - localContactY);
        if (dist > spreadRadius * 2.2) continue;

        const w = Math.exp(-(dist * dist) / (2 * spreadRadius * spreadRadius));
        if (w <= 0.002) continue;

        const nodePush = Math.min(deltaDisplacement, remainingCrush) * w;

        // Nudge node position and apply compression velocity
        n.x += locImpulseX * nodePush;
        n.y += locImpulseY * nodePush;
        n.vx += locImpulseX * (nodePush / Math.max(0.001, dt)) * 0.25;
        n.vy += locImpulseY * (nodePush / Math.max(0.001, dt)) * 0.25;
      }
    }
  }

  // Step the viscoelastic elastoplastic node-beam solver
  stepNodeBeamSimulation(system, dt, car);
  // Сообщаем updateVehicleSystems, что за этот кадр шаг уже сделан (иначе dt обрабатывался дважды)
  system.steppedThisTick = true;
}


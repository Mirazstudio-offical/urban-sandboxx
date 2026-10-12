import {
  BeamLink,
  BeamLinkType,
  BeamNode,
  BeamNodeType,
  DeformVertex,
  GameWorld,
  NodeBeamStructure,
  Vehicle,
  VehicleDamage
} from './types';
import {
  isRoadMachinery,
  isTrailerVehicle,
  isMotorcycle,
  isTractorVehicle
} from './vehicleHelpers';
import { crashEnergy, reducedMass, strikeEnergy } from './damageModel';

/**
 * ============================================================================
 * BEAMNG.DRIVE 2D NODE-BEAM DEFORMATION ENGINE
 * ============================================================================
 *
 * Implements a physically authentic 2D Node-Beam structural simulation
 * equivalent to BeamNG.drive's core physics:
 *
 * 1. NODES:
 *    - Point masses with position (x, y), velocity (vx, vy), and force accumulators.
 *    - 30 nodes per vehicle: 16 perimeter body nodes, 8 internal greenhouse/cowl nodes,
 *      and 6 chassis rails, engine cradle, and subframe nodes.
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
 * Derives material properties and structural stiffness for different vehicle archetypes.
 */
function getVehicleNodeBeamConfig(carType: string): NodeBeamConfig {
  const isMachinery = isRoadMachinery(carType);
  const isHeavyTrailer = carType.startsWith('trailer_semi') || carType === 'trailer_flatbed_2axle';
  const isTruck = carType.startsWith('truck_') || carType === 'cement_mixer' ||
                  carType === 'garbage_truck' || carType === 'bus' ||
                  carType === 'fire_engine' || carType === 'fire_ladder';
  const isTractor = isTractorVehicle(carType);
  const isSupercar = carType === 'supercar' || carType === 'sports';
  const isVintage = carType === 'classic_compact' || carType === 'sedan_classic' ||
                    carType === 'muscle_classic' || carType === 'retro_bubble' ||
                    carType === 'sedan_samara' || carType === 'moped_soviet';

  if (isMachinery || isHeavyTrailer) {
    return {
      springScale: 3.2,
      dampScale: 2.2,
      yieldScale: 2.8,
      breakScale: 2.5,
      chassisStiffness: 3.5
    };
  }

  if (isTruck || isTractor) {
    return {
      springScale: 2.2,
      dampScale: 1.8,
      yieldScale: 2.2,
      breakScale: 2.0,
      chassisStiffness: 2.6
    };
  }

  if (isSupercar) {
    return {
      springScale: 1.6,
      dampScale: 1.3,
      yieldScale: 1.4,
      breakScale: 1.1,
      chassisStiffness: 1.8
    };
  }

  if (isVintage) {
    return {
      springScale: 0.85,
      dampScale: 0.90,
      yieldScale: 0.75,
      breakScale: 0.90,
      chassisStiffness: 0.80
    };
  }

  // Standard passenger car unibody
  return {
    springScale: 1.0,
    dampScale: 1.0,
    yieldScale: 1.0,
    breakScale: 1.0,
    chassisStiffness: 1.0
  };
}

/**
 * Creates the complete 30-node, ~85-beam 2D softbody network for a vehicle.
 */
export function createVehicleNodeBeamSystem(
  car: { type?: string; length?: number; width?: number; mass?: number }
): NodeBeamStructure {
  const length = car.length || 42;
  const width = car.width || 20;
  const halfL = length / 2;
  const halfW = width / 2;
  const totalMass = car.mass || 1400;
  const cfg = getVehicleNodeBeamConfig(car.type || 'sedan');

  // -------------------------------------------------------------------------
  // 1. NODE LAYOUT (30 Nodes)
  // -------------------------------------------------------------------------
  const nodes: BeamNode[] = [];

  // Group 1: 16 Perimeter Nodes (0..15) - exactly matching basePoly & deformedVertices 0..15
  const base16Coords: { x: number; y: number; group: BeamNodeType; massFrac: number }[] = [
    // Front Bumper (nodes 0..1)
    { x: halfL, y: 0, group: 'bumper', massFrac: 0.025 },                      // 0: Front center
    { x: halfL - 0.8, y: halfW * 0.78, group: 'bumper', massFrac: 0.020 },      // 1: Front-Right corner
    // Right Flank (nodes 2..6)
    { x: halfL - 2.0, y: halfW, group: 'fender', massFrac: 0.022 },             // 2: Front-Right fender
    { x: halfL * 0.45, y: halfW, group: 'door', massFrac: 0.024 },              // 3: Right front door
    { x: 0, y: halfW, group: 'pillar', massFrac: 0.026 },                       // 4: Right B-pillar
    { x: -halfL * 0.45, y: halfW, group: 'door', massFrac: 0.024 },             // 5: Right rear door
    { x: -halfL + 1.2, y: halfW * 0.95, group: 'quarter', massFrac: 0.024 },    // 6: Rear-Right quarter
    // Rear Bumper (nodes 7..9)
    { x: -halfL + 0.4, y: halfW * 0.62, group: 'bumper', massFrac: 0.018 },     // 7: Rear-Right bumper
    { x: -halfL, y: 0, group: 'bumper', massFrac: 0.022 },                      // 8: Rear center
    { x: -halfL + 0.4, y: -halfW * 0.62, group: 'bumper', massFrac: 0.018 },    // 9: Rear-Left bumper
    // Left Flank (nodes 10..14)
    { x: -halfL + 1.2, y: -halfW * 0.95, group: 'quarter', massFrac: 0.024 },   // 10: Rear-Left quarter
    { x: -halfL * 0.45, y: -halfW, group: 'door', massFrac: 0.024 },            // 11: Left rear door
    { x: 0, y: -halfW, group: 'pillar', massFrac: 0.026 },                      // 12: Left B-pillar
    { x: halfL * 0.45, y: -halfW, group: 'door', massFrac: 0.024 },             // 13: Left front door
    { x: halfL - 2.0, y: -halfW, group: 'fender', massFrac: 0.022 },            // 14: Front-Left fender
    // Front-Left Corner (node 15)
    { x: halfL - 0.8, y: -halfW * 0.78, group: 'bumper', massFrac: 0.020 }     // 15: Front-Left corner
  ];

  for (let i = 0; i < base16Coords.length; i++) {
    const c = base16Coords[i];
    nodes.push({
      id: i,
      origX: c.x,
      origY: c.y,
      localX: c.x,
      localY: c.y,
      x: c.x,
      y: c.y,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      mass: totalMass * c.massFrac,
      plasticStrain: 0,
      group: c.group
    });
  }

  // Group 2: 8 Upper Body & Greenhouse Nodes (16..23)
  const roofHalfL = halfL * 0.28;
  const roofHalfW = halfW * 0.42;
  const cabinCenterX = -halfL * 0.04;

  const internalCoords: { x: number; y: number; group: BeamNodeType; massFrac: number }[] = [
    { x: halfL * 0.42, y: 0, group: 'hood', massFrac: 0.028 },                         // 16: Hood center
    { x: cabinCenterX + roofHalfL * 1.5, y: 0, group: 'windshield', massFrac: 0.030 },  // 17: Cowl / Windshield base
    { x: cabinCenterX, y: 0, group: 'roof', massFrac: 0.035 },                         // 18: Roof center
    { x: cabinCenterX + roofHalfL, y: -roofHalfW, group: 'roof', massFrac: 0.022 },    // 19: Roof front-left
    { x: cabinCenterX + roofHalfL, y: roofHalfW, group: 'roof', massFrac: 0.022 },     // 20: Roof front-right
    { x: cabinCenterX - roofHalfL, y: -roofHalfW, group: 'roof', massFrac: 0.022 },    // 21: Roof rear-left
    { x: cabinCenterX - roofHalfL, y: roofHalfW, group: 'roof', massFrac: 0.022 },     // 22: Roof rear-right
    { x: cabinCenterX - roofHalfL * 1.6, y: 0, group: 'trunk', massFrac: 0.026 }       // 23: Trunk deck / Rear shelf
  ];

  for (let i = 0; i < internalCoords.length; i++) {
    const c = internalCoords[i];
    const id = 16 + i;
    nodes.push({
      id,
      origX: c.x,
      origY: c.y,
      localX: c.x,
      localY: c.y,
      x: c.x,
      y: c.y,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      mass: totalMass * c.massFrac,
      plasticStrain: 0,
      group: c.group
    });
  }

  // Group 3: 6 Subframe & Powertrain Core Nodes (24..29)
  const subframeCoords: { x: number; y: number; group: BeamNodeType; massFrac: number; isFixed?: boolean }[] = [
    // 24: Engine block core (heavy mass)
    { x: halfL * 0.50, y: 0, group: 'engine', massFrac: 0.20 },
    // 25: Front-Left strut tower / subframe rail
    { x: halfL * 0.45, y: -halfW * 0.55, group: 'subframe', massFrac: 0.065 },
    // 26: Front-Right strut tower / subframe rail
    { x: halfL * 0.45, y: halfW * 0.55, group: 'subframe', massFrac: 0.065 },
    // 27: Rear-Left axle mount / luggage well rail
    { x: -halfL * 0.50, y: -halfW * 0.55, group: 'subframe', massFrac: 0.055 },
    // 28: Rear-Right axle mount / luggage well rail
    { x: -halfL * 0.50, y: halfW * 0.55, group: 'subframe', massFrac: 0.055 },
    // 29: Center cabin floor tunnel / unibody core (high inertia reference spine)
    { x: cabinCenterX, y: 0, group: 'chassis_core', massFrac: 0.16, isFixed: true }
  ];

  for (let i = 0; i < subframeCoords.length; i++) {
    const c = subframeCoords[i];
    const id = 24 + i;
    nodes.push({
      id,
      origX: c.x,
      origY: c.y,
      localX: c.x,
      localY: c.y,
      x: c.x,
      y: c.y,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      mass: totalMass * c.massFrac,
      plasticStrain: 0,
      group: c.group,
      isFixed: c.isFixed
    });
  }

  // -------------------------------------------------------------------------
  // 2. BEAM LAYOUT (~85 Beams)
  // -------------------------------------------------------------------------
  const beams: BeamLink[] = [];
  let beamIdCounter = 0;

  const addBeam = (
    nodeA: number,
    nodeB: number,
    type: BeamLinkType,
    springK: number,
    dampC: number,
    yieldDistance: number,
    breakDistance: number,
    partTag?: BeamLink['partTag']
  ): BeamLink => {
    const nA = nodes[nodeA];
    const nB = nodes[nodeB];
    const dx = nB.origX - nA.origX;
    const dy = nB.origY - nA.origY;
    const dist = Math.hypot(dx, dy) || 1;

    const b: BeamLink = {
      id: beamIdCounter++,
      nodeA,
      nodeB,
      origLength: dist,
      restLength: dist,
      spring: springK * cfg.springScale,
      damp: dampC * cfg.dampScale,
      yieldDist: yieldDistance * cfg.yieldScale,
      breakDist: breakDistance * cfg.breakScale,
      broken: false,
      type,
      partTag,
      currentStress: 0,
      plasticDeform: 0
    };
    beams.push(b);
    return b;
  };

  // Base stiffness factors
  const kStructural = 2800; // N/px standard outer sheet metal
  const cStructural = 85;
  const kChassis = 5200 * cfg.chassisStiffness; // Frame rails & crossmembers
  const cChassis = 150;
  const kCross = 2200; // Diagonal shear stiffness
  const cCross = 70;
  const kSupport = 3400; // One-way anti-collapse springs
  const cSupport = 90;

  // A. Perimeter Structural Beams (16 outer skin segments)
  for (let i = 0; i < 16; i++) {
    const next = (i + 1) % 16;
    const isFrontBumper = i === 0 || i === 15;
    const isRearBumper = i === 7 || i === 8;
    const yieldD = isFrontBumper ? 0.35 : isRearBumper ? 0.40 : 0.50;
    const breakD = 18.0;
    addBeam(i, next, 'structural', kStructural, cStructural, yieldD, breakD);
  }

  // B. Diagonal Shear Bracing Beams (Perimeter Quads) - Gives true shear rigidity
  const perimeterCrossQuads: [number, number][] = [
    [0, 2], [15, 14], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [6, 8], [10, 8], [7, 9], [1, 15]
  ];
  for (const [a, b] of perimeterCrossQuads) {
    addBeam(a, b, 'cross', kCross, cCross, 0.45, 16.0);
  }

  // C. Longitudinal Chassis Rails (BeamNG Ladder / Unibody Rails)
  // Left Rail: Front Bumper Corner -> FL Subframe -> Firewall -> Floor -> RL Subframe -> Rear Bumper
  const leftRailSequence: [number, number][] = [
    [15, 25], [25, 14], [25, 17], [17, 12], [12, 27], [27, 10], [27, 9]
  ];
  for (const [a, b] of leftRailSequence) {
    addBeam(a, b, 'chassis_rail', kChassis, cChassis, 0.70, 26.0);
  }

  // Right Rail: Front Bumper Corner -> FR Subframe -> Firewall -> Floor -> RR Subframe -> Rear Bumper
  const rightRailSequence: [number, number][] = [
    [1, 26], [26, 2], [26, 17], [17, 4], [4, 28], [28, 6], [28, 7]
  ];
  for (const [a, b] of rightRailSequence) {
    addBeam(a, b, 'chassis_rail', kChassis, cChassis, 0.70, 26.0);
  }

  // Center Tunnel Rail: Front Radiator -> Engine Core -> Cowl -> Center Spine -> Trunk Deck -> Rear Center
  const centerRailSequence: [number, number][] = [
    [0, 24], [24, 17], [17, 29], [29, 23], [23, 8]
  ];
  for (const [a, b] of centerRailSequence) {
    addBeam(a, b, 'chassis_rail', kChassis * 1.1, cChassis * 1.1, 0.80, 28.0);
  }

  // D. Crossmembers & Powertrain Cradle
  addBeam(25, 26, 'chassis_rail', kChassis, cChassis, 0.60, 22.0); // Front subframe crossmember
  addBeam(24, 25, 'chassis_rail', kChassis * 0.9, cChassis, 0.50, 18.0); // Left engine mount
  addBeam(24, 26, 'chassis_rail', kChassis * 0.9, cChassis, 0.50, 18.0); // Right engine mount
  addBeam(27, 28, 'chassis_rail', kChassis, cChassis, 0.60, 22.0); // Rear subframe crossmember
  addBeam(12, 29, 'chassis_rail', kChassis, cChassis, 0.65, 24.0); // Floor cross sill left
  addBeam(4, 29, 'chassis_rail', kChassis, cChassis, 0.65, 24.0);  // Floor cross sill right

  // E. Upper Greenhouse, Roof Cage & Pillars
  // A-Pillars & Cowl:
  addBeam(17, 19, 'structural', kStructural * 1.2, cStructural, 0.50, 20.0);
  addBeam(17, 20, 'structural', kStructural * 1.2, cStructural, 0.50, 20.0);
  addBeam(14, 19, 'structural', kStructural * 1.1, cStructural, 0.45, 18.0);
  addBeam(2, 20, 'structural', kStructural * 1.1, cStructural, 0.45, 18.0);

  // Roof Frame & Diagonals:
  addBeam(19, 20, 'structural', kStructural, cStructural, 0.45, 16.0);
  addBeam(20, 22, 'structural', kStructural, cStructural, 0.45, 16.0);
  addBeam(22, 21, 'structural', kStructural, cStructural, 0.45, 16.0);
  addBeam(21, 19, 'structural', kStructural, cStructural, 0.45, 16.0);
  addBeam(18, 19, 'cross', kCross, cCross, 0.40, 15.0);
  addBeam(18, 20, 'cross', kCross, cCross, 0.40, 15.0);
  addBeam(18, 21, 'cross', kCross, cCross, 0.40, 15.0);
  addBeam(18, 22, 'cross', kCross, cCross, 0.40, 15.0);
  addBeam(19, 22, 'cross', kCross, cCross, 0.40, 15.0);
  addBeam(20, 21, 'cross', kCross, cCross, 0.40, 15.0);

  // B-Pillars to Roof:
  addBeam(12, 19, 'structural', kStructural, cStructural, 0.50, 18.0);
  addBeam(4, 20, 'structural', kStructural, cStructural, 0.50, 18.0);
  addBeam(12, 21, 'structural', kStructural, cStructural, 0.50, 18.0);
  addBeam(4, 22, 'structural', kStructural, cStructural, 0.50, 18.0);

  // C-Pillars & Rear Glass:
  addBeam(21, 23, 'structural', kStructural, cStructural, 0.50, 18.0);
  addBeam(22, 23, 'structural', kStructural, cStructural, 0.50, 18.0);
  addBeam(10, 21, 'structural', kStructural, cStructural, 0.45, 18.0);
  addBeam(6, 22, 'structural', kStructural, cStructural, 0.45, 18.0);

  // F. Breakable Latches & Detachable Mounts
  // Front Bumper brackets:
  addBeam(15, 25, 'latch', kStructural * 0.9, cStructural, 0.40, 6.5, 'front_bumper');
  addBeam(1, 26, 'latch', kStructural * 0.9, cStructural, 0.40, 6.5, 'front_bumper');
  addBeam(0, 16, 'latch', kStructural * 0.8, cStructural, 0.35, 5.5, 'hood'); // Hood latch
  addBeam(16, 17, 'latch', kStructural * 0.85, cStructural, 0.45, 7.5, 'hood'); // Hood hinge
  addBeam(13, 12, 'latch', kStructural * 0.75, cStructural, 0.40, 5.8, 'door_fl'); // Driver door latch
  addBeam(3, 4, 'latch', kStructural * 0.75, cStructural, 0.40, 5.8, 'door_fr'); // Pass door latch
  addBeam(8, 23, 'latch', kStructural * 0.8, cStructural, 0.40, 6.0, 'trunk'); // Trunk latch
  addBeam(9, 27, 'latch', kStructural * 0.9, cStructural, 0.40, 6.5, 'rear_bumper');
  addBeam(7, 28, 'latch', kStructural * 0.9, cStructural, 0.40, 6.5, 'rear_bumper');

  // G. Support Beams (Anti-Collapse One-Way Springs)
  // Prevent doors from completely punching across center spine
  addBeam(3, 13, 'support', kSupport, cSupport, 0.8, 40.0);
  addBeam(5, 11, 'support', kSupport, cSupport, 0.8, 40.0);
  // Prevent front bumper from pushing past firewall
  addBeam(0, 17, 'support', kSupport * 1.2, cSupport, 0.9, 45.0);
  // Prevent engine from punching into rear seats
  addBeam(24, 29, 'support', kSupport * 1.5, cSupport, 1.0, 50.0);

  return {
    nodes,
    beams,
    brokenBeamCount: 0,
    totalPlasticDeform: 0,
    maxStress: 0,
    lastSimTime: performance.now() / 1000,
    isSleeping: true,
    activeTimer: 0
  };
}

/**
 * Ensures that a vehicle has a fully initialized Node-Beam structure.
 */
export function ensureVehicleNodeBeam(
  veh: { length?: number; width?: number; damage?: VehicleDamage; type?: string; mass?: number }
): NodeBeamStructure {
  if (!veh.damage) {
    veh.damage = {} as VehicleDamage;
  }
  const dmg = veh.damage;
  if (!dmg.nodeBeam || !Array.isArray(dmg.nodeBeam.nodes) || dmg.nodeBeam.nodes.length < 30) {
    dmg.nodeBeam = createVehicleNodeBeamSystem({
      type: veh.type || 'sedan',
      length: veh.length,
      width: veh.width,
      mass: veh.mass
    });
  }
  return dmg.nodeBeam;
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
  if (!nodes || nodes.length < 30 || !beams || beams.length < 20) return;

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
      if (absDelta > beam.yieldDist) {
        const excess = absDelta - beam.yieldDist;
        const plasticFlowRate = 16.0 * subDt;
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
  }

  system.maxStress = maxStressThisTick;
  system.totalPlasticDeform += totalPlasticShiftThisTick;

  // -------------------------------------------------------------------------
  // 4. SYNCHRONIZE BACK TO VEHICLE DAMAGE & DEFORMED VERTICES
  // -------------------------------------------------------------------------
  const dmg = car.damage;
  if (!dmg) return;

  if (!dmg.deformedVertices || dmg.deformedVertices.length < 24) {
    dmg.deformedVertices = [];
    for (let i = 0; i < 24; i++) {
      dmg.deformedVertices.push({
        localX: nodes[i].origX,
        localY: nodes[i].origY,
        offsetX: 0,
        offsetY: 0,
        plasticStrain: 0,
        elasticX: 0,
        elasticY: 0,
        velX: 0,
        velY: 0,
        structuralType: nodes[i].group as any
      });
    }
  }

  // Update 24 vertex slots directly from physical simulated nodes
  for (let i = 0; i < 24; i++) {
    const n = nodes[i];
    const dv = dmg.deformedVertices[i];
    if (!n || !dv) continue;

    dv.offsetX = n.offsetX;
    dv.offsetY = n.offsetY;
    dv.targetOffsetX = n.offsetX;
    dv.targetOffsetY = n.offsetY;
    dv.elasticX = n.elasticX;
    dv.elasticY = n.elasticY;
    dv.velX = n.vx;
    dv.velY = n.vy;
    dv.plasticStrain = n.plasticStrain;
  }

  // -------------------------------------------------------------------------
  // 5. UPDATE AGGREGATE DAMAGE METRICS FROM PHYSICAL NODE POSITIONS
  // -------------------------------------------------------------------------
  // Front crumple: intrusion of front bumper node 0 and corners 1, 15
  dmg.frontCrumple = Math.max(0, -nodes[0].offsetX);
  dmg.frontLeftDent = Math.hypot(nodes[15].offsetX, nodes[15].offsetY);
  dmg.frontRightDent = Math.hypot(nodes[1].offsetX, nodes[1].offsetY);

  // Rear crumple: intrusion of rear bumper node 8 and corners 7, 9
  dmg.rearCrumple = Math.max(0, nodes[8].offsetX);
  dmg.rearLeftDent = Math.hypot(nodes[9].offsetX, nodes[9].offsetY);
  dmg.rearRightDent = Math.hypot(nodes[7].offsetX, nodes[7].offsetY);

  // Side flanks: intrusion of door & pillar nodes
  dmg.leftDent = Math.max(0, nodes[12].offsetY);
  dmg.rightDent = Math.max(0, -nodes[4].offsetY);

  // Steering drift & frame twist calculated from asymmetric subframe rails (nodes 25 & 26)
  const subframeAsym = (nodes[25].offsetX - nodes[26].offsetX) * 0.12;
  dmg.steeringDrift = Math.max(-1.0, Math.min(1.0, subframeAsym));
  dmg.frameBentAngle = subframeAsym * 0.08;

  // Wheel rub resistance: when fender nodes compress close to wheel well geometry
  const flRub = Math.max(0, Math.hypot(nodes[14].offsetX, nodes[14].offsetY) - 3.0);
  const frRub = Math.max(0, Math.hypot(nodes[2].offsetX, nodes[2].offsetY) - 3.0);
  const rlRub = Math.max(0, Math.hypot(nodes[10].offsetX, nodes[10].offsetY) - 3.0);
  const rrRub = Math.max(0, Math.hypot(nodes[6].offsetX, nodes[6].offsetY) - 3.0);
  dmg.wheelRubResistance = (flRub + frRub + rlRub + rrRub) * 3.5;
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
  contactWidthPx?: number
): void {
  const system = ensureVehicleNodeBeam(car);
  const nodes = system.nodes;
  if (!nodes || nodes.length < 30) return;

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

  // Physical kinetic momentum transfer (BeamNG reduced mass impulse)
  const mu = reducedMass(car.mass || 1400, strikerMass);
  const normalSpeed = Math.max(12, impactSpeed);
  const impulseMag = mu * normalSpeed * 0.0022; // Scaled to 2D node mass units

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

  // If activeCrumple is NOT active (e.g. manual diagnostics test or instant scrape), run burst immediately
  if (!car.activeCrumple || car.activeCrumple.timer <= 0) {
    for (let burst = 0; burst < 4; burst++) {
      stepNodeBeamSimulation(system, 0.016, car);
    }
  } else {
    // Single sub-step shock to initiate wave
    stepNodeBeamSimulation(system, 0.005, car);
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
  if (!nodes || nodes.length < 30) return;

  const halfL = car.length / 2;
  const halfW = car.width / 2;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  // Contact normal pointing OUT of obstacle toward car
  const normX = c.normalX;
  const normY = c.normalY;

  // Local impact direction vector into car interior
  let locImpulseX = -(normX * cosA + normY * sinA);
  let locImpulseY = -(-normX * sinA + normY * cosA);
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

      // Progressively push contact nodes into vehicle interior
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.isFixed) continue;

        const dist = Math.hypot(n.x - localContactX, n.y - localContactY);
        if (dist > spreadRadius * 2.2) continue;

        const w = Math.exp(-(dist * dist) / (2 * spreadRadius * spreadRadius));
        if (w <= 0.002) continue;

        const nodePush = deltaDisplacement * w;

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
}


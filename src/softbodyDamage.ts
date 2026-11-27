import {
  BeamLink,
  BeamNode,
  GameWorld,
  NodeBeamStructure,
  Player,
  SoftBodyComponentBaselines,
  SoftBodyOccupantState,
  SoftBodyOccupantTelemetry,
  Vehicle
} from './types';
import {
  getVehicleCabinDimensions,
  isMotorcycle,
  isRoadMachinery,
  isTractorVehicle,
  isTrailerVehicle
} from './vehicleArchetypes';
import { getEngineBayLayout, resolveEngineBlueprint } from './engineBlueprint';
import { PX_S_TO_SPEED_KMH } from './vehicleHelpers';
import { applySoftBodyOccupantTrauma } from './bodySystem';
import { addPlayerNotification } from './items';

const GRAVITY_MS2 = 9.81;
const PX_S_TO_MS = PX_S_TO_SPEED_KMH / 3.6;

function finite(v: number | undefined, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function createEmptyBaselines(): SoftBodyComponentBaselines {
  return {
    radiatorCrush: 0,
    engineCrush: 0,
    oilPanCrush: 0,
    transmissionCrush: 0,
    fuelTankCrush: 0,
    fuelRailCrush: 0,
    fluidTankCrush: 0,
    suspFL: 0,
    suspFR: 0,
    suspRL: 0,
    suspRR: 0,
    headlightL: 0,
    headlightR: 0,
    taillightL: 0,
    taillightR: 0,
    hoodCrush: 0,
    windshieldCrush: 0,
    rearGlassCrush: 0,
    coolingFanCrush: 0,
    intercoolerCrush: 0,
    turboCrush: 0,
    alternatorCrush: 0,
    batteryCrush: 0,
    airIntakeCrush: 0,
    ecuCrush: 0,
    gboReducerCrush: 0
  };
}

function createInitialOccupantState(car: Vehicle): SoftBodyOccupantState {
  return {
    initialized: true,
    prevX: finite(car.x),
    prevY: finite(car.y),
    prevVx: finite(car.vx),
    prevVy: finite(car.vy),
    baseFrontIntrusion: 0,
    baseDriverSideIntrusion: 0,
    basePassengerSideIntrusion: 0,
    baseRearIntrusion: 0,
    wasWindshieldCracked: !!car.damage?.windshieldCracked,
    pulseActive: false,
    pulseElapsed: 0,
    pulseDvLocalX: 0,
    pulseDvLocalY: 0,
    pulsePeakDvMag: 0,
    pulsePrimaryDirX: 0,
    pulsePrimaryDirY: 0,
    pulsePeakG: 0,
    pulseFrontIntrusion: 0,
    pulseDriverSideIntrusion: 0,
    pulsePassengerSideIntrusion: 0,
    pulseRearIntrusion: 0,
    pulseWindshieldCracked: false,
    lastTraumaTime: -10
  };
}

// ============================================================================
// INVARIANT SOFT-BODY DEFORMATION PRIMITIVES
// (Immune to rigid-body translation/twist of the shell)
// ============================================================================

/**
 * Relative compressive collapse of a beam (0 = intact, 1 = fully crushed or broken).
 * Uses plastic shortening (restLength vs origLength) plus live instantaneous compression
 * so multi-frame impacts register progressively and never produce false positives from rigid drift.
 */
function beamCompression(beam: BeamLink, nodes: BeamNode[]): number {
  if (beam.broken) return 1.0;
  const orig = beam.origLength > 0.05 ? beam.origLength : 1;
  const plasticComp = Math.max(0, (orig - beam.restLength) / orig);
  const nA = nodes[beam.nodeA];
  const nB = nodes[beam.nodeB];
  if (!nA || !nB) return plasticComp;
  const curDist = Math.hypot(nB.x - nA.x, nB.y - nA.y);
  const liveComp = Math.max(0, (orig - curDist) / orig);
  return Math.max(plasticComp, liveComp * 0.85);
}

/**
 * Combined beam deformation (compression + stretch + fracture).
 */
function beamDeformation(beam: BeamLink, nodes: BeamNode[]): number {
  if (beam.broken) return 1.0;
  const orig = beam.origLength > 0.05 ? beam.origLength : 1;
  const comp = beamCompression(beam, nodes);
  const stretch = Math.max(0, (beam.restLength - orig) / orig) * 0.65;
  return Math.max(comp, stretch);
}

/**
 * Invariant pairwise clearance collapse between two soft-body nodes:
 * (d_rest - d_current) / d_rest, clamped >= 0.
 * If both nodes translate or rotate together as a rigid unit, collapse is strictly 0.
 */
function pairClearanceCollapse(a: BeamNode | undefined, b: BeamNode | undefined): number {
  if (!a || !b) return 0;
  const d0 = Math.hypot(a.origX - b.origX, a.origY - b.origY);
  if (d0 < 0.5) return 0;
  const d1 = Math.hypot(a.x - b.x, a.y - b.y);
  return Math.max(0, (d0 - d1) / d0);
}

/**
 * Axis-aligned longitudinal (X) clearance collapse between two nodes.
 * Prevents purely lateral side-impact sway from faking frontal/rear cabin crush.
 */
function longitudinalClearanceCollapse(a: BeamNode | undefined, b: BeamNode | undefined): number {
  if (!a || !b) return 0;
  const dx0 = Math.abs(a.origX - b.origX);
  if (dx0 < 1.0) return 0;
  const dx1 = Math.abs(a.x - b.x);
  return Math.max(0, (dx0 - dx1) / dx0);
}

/**
 * Axis-aligned lateral (Y) clearance collapse between two nodes.
 * Prevents frontal longitudinal crumple from faking a side-door T-bone intrusion.
 */
function lateralClearanceCollapse(a: BeamNode | undefined, b: BeamNode | undefined): number {
  if (!a || !b) return 0;
  const dy0 = Math.abs(a.origY - b.origY);
  if (dy0 < 1.0) return 0;
  const dy1 = Math.abs(a.y - b.y);
  return Math.max(0, (dy0 - dy1) / dy0);
}

/**
 * Finds the engine node, chassis core node, and key structural nodes directly from the mesh.
 */
function resolveMeshAnatomy(system: NodeBeamStructure) {
  const nodes = system.nodes;
  const tracking = system.definition?.tracking;
  const perim = Math.min(system.perimeterCount || 16, nodes.length);

  // Prefer internal structural nodes (id >= perim) before perimeter skin nodes (important for motorcycles)
  const findGroupNodeIdx = (group: BeamNode['group']): number => {
    const internal = nodes.findIndex((n, idx) => idx >= perim && n.group === group);
    if (internal >= 0) return internal;
    return nodes.findIndex(n => n.group === group);
  };

  const engId =
    tracking?.engineNodeId !== undefined && nodes[tracking.engineNodeId]
      ? tracking.engineNodeId
      : findGroupNodeIdx('engine');
  const coreId =
    tracking?.chassisCoreNodeId !== undefined && nodes[tracking.chassisCoreNodeId]
      ? tracking.chassisCoreNodeId
      : findGroupNodeIdx('chassis_core');

  const engNode = engId >= 0 ? nodes[engId] : undefined;
  const coreNode = coreId >= 0 ? nodes[coreId] : undefined;

  const wheelFL = nodes.find(n => n.group === 'wheel' && n.origX >= 0 && n.origY < 0);
  const wheelFR = nodes.find(n => n.group === 'wheel' && n.origX >= 0 && n.origY > 0);
  const wheelRL = nodes.find(n => n.group === 'wheel' && n.origX < 0 && n.origY < 0);
  const wheelRR = nodes.find(n => n.group === 'wheel' && n.origX < 0 && n.origY > 0);

  const subFL = tracking?.subframeLeftFL !== undefined ? nodes[tracking.subframeLeftFL] : undefined;
  const subFR = tracking?.subframeRightFR !== undefined ? nodes[tracking.subframeRightFR] : undefined;
  const subRL = tracking?.subframeLeftRL !== undefined ? nodes[tracking.subframeLeftRL] : undefined;
  const subRR = tracking?.subframeRightRR !== undefined ? nodes[tracking.subframeRightRR] : undefined;

  const wsNode = nodes.find(n => n.group === 'windshield');
  const rearHeaderNode = nodes.find(n => n.name === 'Frame rear header' || (n.id >= perim && n.group === 'trunk'));
  const aPillarL = nodes.find(n => n.name === 'Frame A-pillar L');
  const aPillarR = nodes.find(n => n.name === 'Frame A-pillar R');
  const bPillarL = nodes.find(n => n.name === 'Frame B-pillar L');
  const bPillarR = nodes.find(n => n.name === 'Frame B-pillar R');
  const cPillarL = nodes.find(n => n.name === 'Frame C-pillar L');
  const cPillarR = nodes.find(n => n.name === 'Frame C-pillar R');

  return {
    perim,
    engId,
    coreId,
    engNode,
    coreNode,
    wheelFL,
    wheelFR,
    wheelRL,
    wheelRR,
    subFL,
    subFR,
    subRL,
    subRR,
    wsNode,
    rearHeaderNode,
    aPillarL,
    aPillarR,
    bPillarL,
    bPillarR,
    cPillarL,
    cPillarR
  };
}

/**
 * Local fuel tank center(s) matching the vehicle's actual architecture (getVehicleAnchor).
 */
function getFuelTankLocalPoints(car: Vehicle): { x: number; y: number }[] {
  const L = car.length || 42;
  const W = car.width || 20;
  const carType = car.type || 'sedan';
  const isTruck =
    carType.startsWith('truck_') ||
    carType === 'pickup_heavy' ||
    carType === 'delivery_truck';
  const isTractor = isTractorVehicle(carType);
  const isBike = isMotorcycle(carType);
  const isRearEngineBus = carType === 'bus' || carType === 'bus_minibus';

  if (isTruck) {
    return [
      { x: 0.05 * L, y: -0.44 * W },
      { x: 0.05 * L, y: 0.44 * W }
    ];
  }
  if (isTractor) {
    return [{ x: -0.40 * L, y: 0.25 * W }];
  }
  if (isBike) {
    return [{ x: 0.08 * L, y: 0 }];
  }
  if (isRearEngineBus) {
    return [{ x: -0.15 * L, y: 0.44 * W }];
  }
  return [{ x: -0.35 * L, y: 0.20 * W }];
}

/**
 * Measures soft-body structural crush inside a local circular region (cx, cy, radius).
 */
function measureLocalZoneCrush(
  nodes: BeamNode[],
  beams: BeamLink[],
  cx: number,
  cy: number,
  radius: number,
  anchorNode: BeamNode | undefined
): number {
  let maxBeam = 0;
  let maxStrain = 0;
  let maxCollapse = 0;

  const inZone = new Set<number>();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.group === 'wheel') continue;
    const d = Math.hypot(n.origX - cx, n.origY - cy);
    if (d <= radius) {
      inZone.add(i);
      const strainNorm = finite(n.plasticStrain) / 2.2;
      if (strainNorm > maxStrain) maxStrain = strainNorm;
      if (anchorNode && n.id !== anchorNode.id) {
        const col = pairClearanceCollapse(n, anchorNode);
        if (col > maxCollapse) maxCollapse = col;
      }
    }
  }

  for (let i = 0; i < beams.length; i++) {
    const b = beams[i];
    const nA = nodes[b.nodeA];
    const nB = nodes[b.nodeB];
    if (!nA || !nB) continue;
    if (nA.group === 'wheel' || nB.group === 'wheel') continue;
    const mx = (nA.origX + nB.origX) * 0.5;
    const my = (nA.origY + nB.origY) * 0.5;
    if (inZone.has(b.nodeA) || inZone.has(b.nodeB) || Math.hypot(mx - cx, my - cy) <= radius * 0.9) {
      const c = beamCompression(b, nodes);
      if (c > maxBeam) maxBeam = c;
    }
  }

  return Math.max(maxBeam, maxStrain * 0.85, maxCollapse * 1.15);
}

/**
 * Measures soft-body structural crush & inward perimeter/frame encroachment at an
 * exact engine-bay module coordinate `(mx, my)`.
 * If `engMounted` is true, the target module rides with the rigid engine block's
 * current displacement `(engNode.offsetX, engNode.offsetY)` so external bay intrusion
 * colliding into that flank of the shifted block is detected accurately.
 */
function measureModuleFootprintCrush(
  nodes: BeamNode[],
  beams: BeamLink[],
  perim: number,
  mx: number,
  my: number,
  radius: number,
  anchorNode: BeamNode | undefined,
  engNode: BeamNode | undefined,
  engMounted: boolean
): number {
  const engOx = engMounted && engNode ? finite(engNode.offsetX) * 0.85 : 0;
  const engOy = engMounted && engNode ? finite(engNode.offsetY) * 0.85 : 0;
  const curMx = mx + engOx;
  const curMy = my + engOy;

  let maxBeam = 0;
  let maxStrain = 0;
  let maxCollapse = 0;
  let maxEncroach = 0;
  let closestDist = Infinity;
  let closestPlastic = 0;
  let closestEncroach = 0;

  const inZone = new Set<number>();
  const engId = engNode?.id ?? -1;
  const reachOuter = Math.max(radius * 2.1, 6.0);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n || n.group === 'wheel') continue;
    if (engMounted && i === engId) continue;

    const d0 = Math.hypot(n.origX - mx, n.origY - my);
    const d1 = Math.hypot(n.x - curMx, n.y - curMy);
    const pRaw = Math.max(
      finite(n.plasticStrain),
      engMounted ? finite(engNode?.plasticStrain) * 0.85 : 0
    );
    const pGate = clamp(pRaw / 0.16, 0, 1);

    if (d0 <= radius) {
      inZone.add(i);
      const strainNorm = finite(n.plasticStrain) / 2.1;
      if (strainNorm > maxStrain) maxStrain = strainNorm;
      if (anchorNode && n.id !== anchorNode.id) {
        const col = pairClearanceCollapse(n, anchorNode) * pGate;
        if (col > maxCollapse) maxCollapse = col;
      }
    }

    if (d0 >= 0.9 && d0 <= reachOuter && d1 < d0) {
      const encroach = ((d0 - d1) / Math.max(2.4, d0)) * 1.28 * pGate;
      if (encroach > maxEncroach) maxEncroach = encroach;
    }

    if (d0 < closestDist) {
      closestDist = d0;
      closestPlastic = finite(n.plasticStrain) / 2.25;
      closestEncroach = d0 >= 0.8 && d1 < d0 ? ((d0 - d1) / Math.max(2.5, d0)) * 1.15 * pGate : 0;
    }
  }

  for (let i = 0; i < beams.length; i++) {
    const b = beams[i];
    const nA = nodes[b.nodeA];
    const nB = nodes[b.nodeB];
    if (!nA || !nB) continue;
    if (nA.group === 'wheel' || nB.group === 'wheel') continue;
    const bmx = (nA.origX + nB.origX) * 0.5;
    const bmy = (nA.origY + nB.origY) * 0.5;
    if (
      inZone.has(b.nodeA) ||
      inZone.has(b.nodeB) ||
      Math.hypot(bmx - mx, bmy - my) <= radius * 1.05
    ) {
      const c = beamCompression(b, nodes);
      const w = b.type === 'latch' ? 0.55 : 1.0;
      if (c * w > maxBeam) maxBeam = c * w;
    }
  }

  // Fallback weighting if module sits slightly between sparse mesh nodes
  if (inZone.size === 0 && Number.isFinite(closestDist)) {
    const falloff = clamp(1 - Math.max(0, closestDist - radius) / Math.max(4.5, radius * 1.6), 0.25, 1);
    maxStrain = Math.max(maxStrain, closestPlastic * falloff);
    maxEncroach = Math.max(maxEncroach, closestEncroach * falloff);
  }

  return Math.max(maxBeam, maxStrain * 0.85, maxCollapse * 1.12, maxEncroach);
}

/**
 * Measures soft-body crush at one wheel corner (wheel hub + corner subframe + arch clearance).
 */
function measureWheelCornerCrush(
  nodes: BeamNode[],
  beams: BeamLink[],
  perim: number,
  wheelNode: BeamNode | undefined,
  subframeNode: BeamNode | undefined,
  car: Vehicle
): { suspensionCrush: number; rubAmount: number } {
  if (!wheelNode && !subframeNode) return { suspensionCrush: 0, rubAmount: 0 };
  const ref = wheelNode || subframeNode!;
  const archRadius = Math.max(car.width * 0.45, car.length * 0.22);

  let maxBeam = 0;
  let maxArchCollapse = 0;
  let rubAmount = 0;

  for (let i = 0; i < beams.length; i++) {
    const b = beams[i];
    const touchesWheel = wheelNode && (b.nodeA === wheelNode.id || b.nodeB === wheelNode.id);
    const touchesSub = subframeNode && (b.nodeA === subframeNode.id || b.nodeB === subframeNode.id);
    if (touchesWheel || touchesSub) {
      const c = beamCompression(b, nodes);
      if (c > maxBeam) maxBeam = c;
    }
  }

  for (let i = 0; i < perim; i++) {
    const sn = nodes[i];
    if (!sn) continue;
    const d0 = Math.hypot(sn.origX - ref.origX, sn.origY - ref.origY);
    if (d0 <= archRadius && d0 > 0.5) {
      const d1 = Math.hypot(sn.x - ref.x, sn.y - ref.y);
      const collapse = Math.max(0, (d0 - d1) / d0);
      if (collapse > maxArchCollapse) maxArchCollapse = collapse;
      const inwardPx = Math.max(0, d0 - d1);
      if (inwardPx > 1.4) {
        rubAmount += (inwardPx - 1.4) * 3.8;
      }
    }
  }

  const subStrain = subframeNode ? finite(subframeNode.plasticStrain) / 2.6 : 0;
  const suspensionCrush = clamp(Math.max(maxBeam * 1.35, maxArchCollapse * 1.35, subStrain), 0, 1.2);
  return { suspensionCrush, rubAmount };
}

/**
 * Measures soft-body deformation at a corner lamp cluster (headlight / taillight).
 */
function measureCornerLampCrush(
  nodes: BeamNode[],
  beams: BeamLink[],
  perim: number,
  isFront: boolean,
  isLeft: boolean,
  anchorNode: BeamNode | undefined,
  car: Vehicle
): number {
  const halfL = (car.length || 42) * 0.5;
  const halfW = (car.width || 20) * 0.5;
  const cornerIds: number[] = [];

  for (let i = 0; i < perim; i++) {
    const n = nodes[i];
    if (!n) continue;
    const xOk = isFront ? n.origX >= halfL * 0.58 : n.origX <= -halfL * 0.58;
    const yOk = isLeft ? n.origY <= -halfW * 0.18 : n.origY >= halfW * 0.18;
    if (xOk && yOk) cornerIds.push(i);
  }
  if (cornerIds.length === 0) return 0;

  let maxVal = 0;
  const idSet = new Set(cornerIds);
  for (const id of cornerIds) {
    const n = nodes[id];
    const strainNorm = finite(n.plasticStrain) / 1.6;
    const col = pairClearanceCollapse(n, anchorNode);
    maxVal = Math.max(maxVal, strainNorm, col * 1.25);
  }
  for (let i = 0; i < beams.length; i++) {
    const b = beams[i];
    if (idSet.has(b.nodeA) || idSet.has(b.nodeB)) {
      maxVal = Math.max(maxVal, beamCompression(b, nodes) * 1.25);
    }
  }
  return maxVal;
}

// ============================================================================
// 1. PURE SOFT-BODY COMPONENT DAMAGE EVALUATOR
// ============================================================================

/**
 * Derives ALL mechanical & structural component damage (engine, transmission,
 * radiator, oil pan, fuel tank, fuel rail, suspension, steering drift, wheel rub,
 * headlights/taillights, hood, windshield, rear glass, steam/smoke/fire)
 * strictly from the vehicle's live Node-Beam soft-body structure.
 */
export function evaluateSoftBodyComponentDamage(
  system: NodeBeamStructure,
  car: Vehicle,
  world?: GameWorld
): void {
  const dmg = car.damage;
  if (!dmg || !system.nodes || system.nodes.length < 8) return;

  const nodes = system.nodes;
  const beams = system.beams;
  const L = car.length || 42;
  const W = car.width || 20;
  const halfL = L * 0.5;
  const halfW = W * 0.5;
  const isTrailer = isTrailerVehicle(car);
  const carType = car.type || 'sedan';
  const isRearEngineBus = carType === 'bus' || carType === 'bus_minibus';
  const isBike = isMotorcycle(carType);

  if (!system.componentBaselines) {
    system.componentBaselines = createEmptyBaselines();
  }
  const base = system.componentBaselines;
  const anatomy = resolveMeshAnatomy(system);
  const {
    perim,
    engId,
    coreId,
    engNode,
    coreNode,
    wheelFL,
    wheelFR,
    wheelRL,
    wheelRR,
    subFL,
    subFR,
    subRL,
    subRR,
    wsNode,
    rearHeaderNode,
    aPillarL,
    aPillarR,
    bPillarL,
    bPillarR,
    cPillarL,
    cPillarR
  } = anatomy;

  // --- A. WHEEL CORNERS, SUSPENSION, STEERING DRIFT & WHEEL RUB ---
  const flCorner = measureWheelCornerCrush(nodes, beams, perim, wheelFL, subFL, car);
  const frCorner = measureWheelCornerCrush(nodes, beams, perim, wheelFR, subFR, car);
  const rlCorner = measureWheelCornerCrush(nodes, beams, perim, wheelRL, subRL, car);
  const rrCorner = measureWheelCornerCrush(nodes, beams, perim, wheelRR, subRR, car);

  const dSuspFL = Math.max(0, flCorner.suspensionCrush - base.suspFL);
  const dSuspFR = Math.max(0, frCorner.suspensionCrush - base.suspFR);
  const dSuspRL = Math.max(0, rlCorner.suspensionCrush - base.suspRL);
  const dSuspRR = Math.max(0, rrCorner.suspensionCrush - base.suspRR);
  if (dSuspFL > 0) {
    base.suspFL = flCorner.suspensionCrush;
    dmg.frontLeftSuspensionDamage = clamp(finite(dmg.frontLeftSuspensionDamage) + dSuspFL * 0.95, 0, 1);
  }
  if (dSuspFR > 0) {
    base.suspFR = frCorner.suspensionCrush;
    dmg.frontRightSuspensionDamage = clamp(finite(dmg.frontRightSuspensionDamage) + dSuspFR * 0.95, 0, 1);
  }
  if (dSuspRL > 0) {
    base.suspRL = rlCorner.suspensionCrush;
    dmg.rearLeftSuspensionDamage = clamp(finite(dmg.rearLeftSuspensionDamage) + dSuspRL * 0.95, 0, 1);
  }
  if (dSuspRR > 0) {
    base.suspRR = rrCorner.suspensionCrush;
    dmg.rearRightSuspensionDamage = clamp(finite(dmg.rearRightSuspensionDamage) + dSuspRR * 0.95, 0, 1);
  }

  // Wheel rub resistance directly from fender/quarter clearance loss around the 4 wheel hubs
  const totalRub = flCorner.rubAmount + frCorner.rubAmount + rlCorner.rubAmount + rrCorner.rubAmount;
  dmg.wheelRubResistance = Number.isFinite(totalRub) ? totalRub : 0;

  // Steering drift & frame twist from FL vs FR soft-body asymmetry
  const suspAsym = (dmg.frontRightSuspensionDamage || 0) - (dmg.frontLeftSuspensionDamage || 0);
  let subframeAsym = 0;
  if (subFL && subFR) {
    subframeAsym = (finite(subFL.offsetX) - finite(subFR.offsetX)) * 0.10;
  }
  const combinedDrift = clamp(suspAsym * 0.75 + subframeAsym, -1.0, 1.0);
  dmg.steeringDrift = Number.isFinite(combinedDrift) ? combinedDrift : 0;
  dmg.frameBentAngle = Number.isFinite(subframeAsym) ? subframeAsym * 0.08 : 0;

  // --- B. HEADLIGHTS & TAILLIGHTS (from actual corner skin nodes) ---
  const hlL = measureCornerLampCrush(nodes, beams, perim, true, true, wheelFL || subFL || coreNode, car);
  const hlR = measureCornerLampCrush(nodes, beams, perim, true, false, wheelFR || subFR || coreNode, car);
  const tlL = measureCornerLampCrush(nodes, beams, perim, false, true, wheelRL || subRL || coreNode, car);
  const tlR = measureCornerLampCrush(nodes, beams, perim, false, false, wheelRR || subRR || coreNode, car);

  if (hlL > base.headlightL) {
    base.headlightL = hlL;
    if (hlL >= 0.20) dmg.leftHeadlightBroken = true;
  }
  if (hlR > base.headlightR) {
    base.headlightR = hlR;
    if (hlR >= 0.20) dmg.rightHeadlightBroken = true;
  }
  if (tlL > base.taillightL) {
    base.taillightL = tlL;
    if (tlL >= 0.22) dmg.leftTaillightBroken = true;
  }
  if (tlR > base.taillightR) {
    base.taillightR = tlR;
    if (tlR >= 0.22) dmg.rightTaillightBroken = true;
  }

  // --- C. HOOD, WINDSHIELD, REAR GLASS (from actual frame/glass/hood nodes & beams) ---
  let hoodCrush = 0;
  if (!isTrailer && !isBike) {
    const hoodNodes = nodes.filter(n => n.group === 'hood');
    for (const hn of hoodNodes) {
      hoodCrush = Math.max(hoodCrush, finite(hn.plasticStrain) / 1.8);
      if (wsNode) {
        hoodCrush = Math.max(hoodCrush, pairClearanceCollapse(hn, wsNode) * 1.15);
      }
    }
    let brokenHoodLatch = 0;
    let brokenHoodHinge = 0;
    for (const b of beams) {
      if (b.partTag === 'hood' || b.partTag === 'hood_hinge') {
        hoodCrush = Math.max(hoodCrush, beamDeformation(b, nodes) * (b.partTag === 'hood_hinge' ? 1.35 : 1.25));
        if (b.broken) {
          if (b.partTag === 'hood') brokenHoodLatch++;
          else brokenHoodHinge++;
        }
      }
    }
    if (hoodCrush > base.hoodCrush) {
      base.hoodCrush = hoodCrush;
      if (hoodCrush >= 0.30) {
        dmg.hoodBuckled = true;
        dmg.hoodRaisedAmount = Math.max(finite(dmg.hoodRaisedAmount), clamp((hoodCrush - 0.22) * 1.4, 0.25, 1.0));
      }
    }
    if (brokenHoodHinge >= 2 || (brokenHoodLatch >= 1 && brokenHoodHinge >= 1) || hoodCrush >= 0.92) {
      dmg.hoodDetached = true;
      dmg.hoodBuckled = true;
    }
  }

  // Windshield: compression/distortion of windshield base node & A-pillar frame beams
  let windshieldCrush = 0;
  if (wsNode) {
    windshieldCrush = Math.max(
      windshieldCrush,
      finite(wsNode.plasticStrain) / 1.9,
      pairClearanceCollapse(wsNode, coreNode) * 1.15
    );
    if (aPillarL) windshieldCrush = Math.max(windshieldCrush, pairClearanceCollapse(wsNode, aPillarL) * 1.25);
    if (aPillarR) windshieldCrush = Math.max(windshieldCrush, pairClearanceCollapse(wsNode, aPillarR) * 1.25);
    for (const b of beams) {
      if (b.nodeA === wsNode.id || b.nodeB === wsNode.id) {
        windshieldCrush = Math.max(windshieldCrush, beamDeformation(b, nodes) * 1.25);
      }
    }
  }
  if (aPillarL && aPillarR) {
    windshieldCrush = Math.max(windshieldCrush, pairClearanceCollapse(aPillarL, aPillarR) * 1.3);
  }
  if (windshieldCrush > base.windshieldCrush) {
    base.windshieldCrush = windshieldCrush;
    if (windshieldCrush >= 0.32 && !isBike) {
      dmg.windshieldCracked = true;
    }
  }

  // Rear glass: rear header + C-pillars frame distortion
  let rearGlassCrush = 0;
  if (rearHeaderNode) {
    rearGlassCrush = Math.max(
      rearGlassCrush,
      finite(rearHeaderNode.plasticStrain) / 1.9,
      pairClearanceCollapse(rearHeaderNode, coreNode) * 1.15
    );
    if (cPillarL) rearGlassCrush = Math.max(rearGlassCrush, pairClearanceCollapse(rearHeaderNode, cPillarL) * 1.25);
    if (cPillarR) rearGlassCrush = Math.max(rearGlassCrush, pairClearanceCollapse(rearHeaderNode, cPillarR) * 1.25);
    for (const b of beams) {
      if (b.nodeA === rearHeaderNode.id || b.nodeB === rearHeaderNode.id) {
        rearGlassCrush = Math.max(rearGlassCrush, beamDeformation(b, nodes) * 1.25);
      }
    }
  }
  if (cPillarL && cPillarR) {
    rearGlassCrush = Math.max(rearGlassCrush, pairClearanceCollapse(cPillarL, cPillarR) * 1.3);
  }
  if (rearGlassCrush > base.rearGlassCrush) {
    base.rearGlassCrush = rearGlassCrush;
    if (rearGlassCrush >= 0.34 && !isBike) {
      dmg.rearGlassCracked = true;
    }
  }

  // --- D. CISTERN / FLUID TANK (for tanker/vacuum trucks & trailers) ---
  if (car.fluidTank) {
    const cisternCrush = measureLocalZoneCrush(
      nodes,
      beams,
      -0.15 * L,
      0,
      Math.max(L * 0.35, W * 0.55),
      coreNode
    );
    if (cisternCrush > base.fluidTankCrush) {
      base.fluidTankCrush = cisternCrush;
      if (cisternCrush >= 0.32) {
        car.fluidTank.isPunctured = true;
      }
    }
  }

  // Trailers have no engine, gearbox, radiator, or fuel system
  if (isTrailer) return;

  const eng = car.engineState;
  const fuel = car.fuelSystem;
  if (!eng) return;

  // --- E. ENGINE-MODEL & ENGINE-BAY GEOMETRY RESOLUTION ---
  const { cabinL, cabinW, cabinX } = getVehicleCabinDimensions(car, halfL, halfW, 0, 0);
  const bay = getEngineBayLayout(car, halfL, halfW, 0, 0, cabinX, cabinL, cabinW);
  const resolvedPowertrain = resolveEngineBlueprint(car);
  const engSpec = resolvedPowertrain.spec;
  const hasBay = bay.zone !== 'none';
  const isRearBay = bay.zone === 'mid_rear' || bay.zone === 'rear';
  const dir = isRearBay ? -1 : 1;
  // Mid-rear / rear-engine cars (e.g. supercar) that use the generic front soft-body mesh
  // have engNode.origX > 0; exclude that front node when measuring rear-bay engine modules.
  const bayEngNode = isRearBay && engNode && engNode.origX > 0 ? undefined : engNode;
  const bayEngId = bayEngNode ? engId : -1;
  const bayLen = hasBay ? Math.max(4, bay.bayX2 - bay.bayX1) : Math.max(6, L * 0.28);
  const bayW = hasBay ? Math.max(4, bay.bayHalfW * 2) : Math.max(4, W * 0.55);
  const bayCx = hasBay ? (bay.bayX1 + bay.bayX2) * 0.5 : (bayEngNode ? bayEngNode.origX : halfL * 0.35);
  const baseEngCx = hasBay ? bayCx - dir * bayLen * 0.05 : (bayEngNode ? bayEngNode.origX : halfL * 0.35);
  const blkLen = clamp(bayLen * engSpec.sizeL, 3.2, bayLen * 0.68);
  const blkW = clamp(bayW * engSpec.sizeW, 2.6, bayW * 0.64);
  const isTransverse = resolvedPowertrain.orientation === 'transverse' && engSpec.architecture === 'inline';

  const engToLocal = (ex: number, ey: number): { x: number; y: number } => ({
    x: baseEngCx + dir * ex,
    y: ey
  });

  // Strut tower brace stiffness check (connects front left & right strut towers)
  let strutBraceIntact = false;
  if (hasBay && resolvedPowertrain.hasStrutBrace && !bay.isNarrowTractorBonnet && !bay.isCabOver) {
    const strutX = isRearBay ? bayCx - bayLen * 0.04 : bayCx - bayLen * 0.10;
    const strutY = bay.bayHalfW * 0.78;
    const towerCrushL = measureModuleFootprintCrush(nodes, beams, perim, strutX, -strutY, Math.max(2.5, bayLen * 0.22), coreNode, bayEngNode, false);
    const towerCrushR = measureModuleFootprintCrush(nodes, beams, perim, strutX, strutY, Math.max(2.5, bayLen * 0.22), coreNode, bayEngNode, false);
    if (Math.max(towerCrushL, towerCrushR) < 0.45) {
      strutBraceIntact = true;
    }
  }
  const strutBraceMult = strutBraceIntact ? 0.88 : 1.0;

  // --- E1. INTERCOOLER (FMIC ahead of radiator vs TMIC on boxer top-mount) ---
  const hasFmic =
    hasBay &&
    !isRearBay &&
    (resolvedPowertrain.turboKind === 'single' || resolvedPowertrain.turboKind === 'twin') &&
    !engSpec.hasTopMountIntercooler;
  const hasTmic = Boolean(engSpec.hasTopMountIntercooler);
  const radThick = clamp(bayLen * 0.105, 0.9, 2.2);
  const radW = hasBay ? bay.bayHalfW * (bay.isNarrowTractorBonnet ? 1.55 : 1.38) : halfW * 0.8;
  const radX = hasBay
    ? (isRearBay ? bay.bayX1 + radThick * 1.05 : bay.bayX2 - radThick * 1.15 - (hasFmic ? radThick * 0.72 : 0))
    : (isRearEngineBus ? -halfL * 0.80 : halfL * 0.80);

  let intercoolerCrush = 0;
  if (hasFmic) {
    const icX = bay.bayX2 - radThick * 0.65;
    const icW = radW * 0.92;
    const icR = Math.max(2.6, Math.min(bayLen, bayW) * 0.26);
    const icAnchor = bayEngNode || coreNode;
    const cMid = measureModuleFootprintCrush(nodes, beams, perim, icX, 0, icR, icAnchor, bayEngNode, false);
    const cL = measureModuleFootprintCrush(nodes, beams, perim, icX, -icW * 0.36, icR * 0.9, icAnchor, bayEngNode, false);
    const cR = measureModuleFootprintCrush(nodes, beams, perim, icX, icW * 0.36, icR * 0.9, icAnchor, bayEngNode, false);
    intercoolerCrush = Math.max(0, Math.max(cMid, cL * 0.95, cR * 0.95) * 1.12 - 0.04);
  } else if (hasTmic && hasBay) {
    // Boxer TMIC sits over the rear half of the engine block (shielded behind front nose)
    const tmicPos = engToLocal(-blkLen * 0.24, 0);
    const rawTmic = measureModuleFootprintCrush(
      nodes,
      beams,
      perim,
      tmicPos.x,
      tmicPos.y,
      Math.max(2.6, blkW * 0.48),
      coreNode,
      bayEngNode,
      true
    );
    intercoolerCrush = Math.max(0, rawTmic * 0.82 - 0.08);
  }

  // --- E2. RADIATOR & COOLING FAN (exact blueprint & bay layout) ---
  let radiatorCrush = 0;
  let coolingFanCrush = 0;
  const radIsRear = hasBay ? isRearBay : isRearEngineBus;
  const radSign = radIsRear ? -1 : 1;
  const radAnchor =
    engNode && Math.sign(engNode.origX || radSign) === radSign
      ? engNode
      : coreNode;

  const radSkinIds: number[] = [];
  const radSkinYMax = hasBay ? Math.max(radW * 0.56, bay.bayHalfW * 0.92) : halfW * 0.58;
  const radSkinXCut = hasBay
    ? (radIsRear ? Math.min(-halfL * 0.52, bay.bayX1 + bayLen * 0.22) : Math.max(halfL * 0.52, bay.bayX2 - bayLen * 0.22))
    : (radIsRear ? -halfL * 0.68 : halfL * 0.68);
  for (let i = 0; i < perim; i++) {
    const n = nodes[i];
    if (!n) continue;
    const xHit = radIsRear ? n.origX <= radSkinXCut : n.origX >= radSkinXCut;
    const yHit = Math.abs(n.origY) <= radSkinYMax;
    if (xHit && yHit) radSkinIds.push(i);
  }
  const radSkinSet = new Set(radSkinIds);
  for (const id of radSkinIds) {
    const sn = nodes[id];
    const colAnchor = pairClearanceCollapse(sn, radAnchor);
    const colCore = pairClearanceCollapse(sn, coreNode);
    const strainNorm = finite(sn.plasticStrain) / 2.2;
    const plasticGate = clamp(
      Math.max(finite(sn.plasticStrain), finite(radAnchor?.plasticStrain)) / 0.16,
      0,
      1
    );
    radiatorCrush = Math.max(
      radiatorCrush,
      colAnchor * 1.15 * plasticGate,
      colCore * 1.05 * plasticGate,
      strainNorm * 0.75
    );
  }
  for (let i = 0; i < beams.length; i++) {
    const b = beams[i];
    if (radSkinSet.has(b.nodeA) || radSkinSet.has(b.nodeB)) {
      const nA = nodes[b.nodeA];
      const nB = nodes[b.nodeB];
      if (nA && nB && (b.nodeA >= perim || b.nodeB >= perim || b.partTag === 'front_bumper')) {
        radiatorCrush = Math.max(radiatorCrush, beamCompression(b, nodes) * 1.05);
      }
    }
  }

  if (hasBay) {
    const radZoneR = Math.max(2.6, Math.min(radW * 0.42, bayLen * 0.28));
    const rcC = measureModuleFootprintCrush(nodes, beams, perim, radX, 0, radZoneR, radAnchor, bayEngNode, false);
    const rcL = measureModuleFootprintCrush(nodes, beams, perim, radX, -radW * 0.30, radZoneR * 0.9, radAnchor, bayEngNode, false);
    const rcR = measureModuleFootprintCrush(nodes, beams, perim, radX, radW * 0.30, radZoneR * 0.9, radAnchor, bayEngNode, false);
    const spatialRadCrush = Math.max(rcC, rcL * 0.9, rcR * 0.9);
    // Narrow tractor bonnets have an inset grille core so wide corner grazes miss the radiator
    const radMask = bay.isNarrowTractorBonnet ? 0.85 : 1.0;
    radiatorCrush = Math.max(radiatorCrush * radMask, spatialRadCrush * 0.96);

    // Cooling fan shroud sits directly behind radiator core (`fanX`)
    const fanX = radX - dir * (radThick * 0.95);
    const fanR = Math.max(2.4, Math.min(radW * 0.30, bayLen * 0.24));
    const rawFanCrush = measureModuleFootprintCrush(nodes, beams, perim, fanX, 0, fanR, radAnchor, bayEngNode, false);
    coolingFanCrush = Math.max(0, Math.max(rawFanCrush, radiatorCrush * 0.82) - 0.05);
  }

  if (isBike && engNode) {
    const bikeFrontGate = clamp(Math.max(finite(nodes[0]?.plasticStrain), finite(engNode.plasticStrain)) / 0.14, 0, 1);
    radiatorCrush = Math.max(radiatorCrush * 0.6, pairClearanceCollapse(nodes[0], engNode) * 0.9 * bikeFrontGate);
  }
  if (hasFmic) {
    // FMIC core takes initial front contact; radiator sits just behind it and amplifies high-energy collapse
    radiatorCrush = radiatorCrush < 0.24 ? radiatorCrush * 0.94 : radiatorCrush * 1.06;
  }

  // --- F. ENGINE BLOCK (model footprint, engine_mount beams, strut brace & material toughness) ---
  let engineCrush = 0;
  if (bayEngNode && bayEngId >= 0) {
    let maxEngBeamComp = 0;
    let avgEngBeamComp = 0;
    let engBeamCount = 0;
    let mountCount = 0;
    let mountBroken = 0;
    let mountStrainSum = 0;
    for (let i = 0; i < beams.length; i++) {
      const b = beams[i];
      if (b.nodeA === bayEngId || b.nodeB === bayEngId) {
        const c = beamCompression(b, nodes);
        const weight = b.type === 'latch' ? 0.45 : (b.partTag === 'engine_mount' ? 1.08 : 1.0);
        const wc = c * weight;
        if (wc > maxEngBeamComp) maxEngBeamComp = wc;
        avgEngBeamComp += wc;
        engBeamCount++;
        if (b.partTag === 'engine_mount') {
          mountCount++;
          if (b.broken) mountBroken++;
          mountStrainSum += clamp(b.yieldDist > 0 ? (b.plasticDeform || 0) / b.yieldDist : 0, 0, 1);
        }
      }
    }
    if (engBeamCount > 0) avgEngBeamComp /= engBeamCount;
    if (mountCount > 0) {
      system.engineMountCount = mountCount;
      system.engineMountBrokenCount = mountBroken;
      const mountWear = (mountBroken + mountStrainSum * 0.45) / mountCount;
      system.engineMountHealth = clamp(1 - mountWear, 0, 1);
    }

    const engStrainNorm = finite(bayEngNode.plasticStrain) / 2.15;
    const engCorePlastic = clamp(
      Math.max(finite(bayEngNode.plasticStrain), finite(coreNode?.plasticStrain)) / 0.16,
      0,
      1
    );
    const engCoreCol = pairClearanceCollapse(bayEngNode, coreNode) * engCorePlastic;

    // Direct encroachment into the actual engine blueprint footprint (blkLen x blkW)
    let maxEncroach = 0;
    const engReach = Math.max(L * 0.36, W * 0.55, Math.hypot(blkLen * 0.6, blkW * 0.6));
    for (let i = 0; i < nodes.length; i++) {
      if (i === bayEngId) continue;
      const n = nodes[i];
      if (n.group === 'wheel' || n.isFixed) continue;
      const d0 = Math.hypot(n.origX - bayEngNode.origX, n.origY - bayEngNode.origY);
      if (d0 > 0.8 && d0 <= engReach) {
        const col = pairClearanceCollapse(n, bayEngNode);
        if (col > 0.14) {
          const pGate = clamp(Math.max(finite(n.plasticStrain), finite(bayEngNode.plasticStrain)) / 0.16, 0, 1);
          maxEncroach = Math.max(maxEncroach, (col - 0.14) * 1.25 * pGate);
        }
      }
    }

    const bayBlockCrush = hasBay
      ? measureModuleFootprintCrush(
          nodes,
          beams,
          perim,
          baseEngCx,
          0,
          Math.max(3.0, Math.hypot(blkLen * 0.46, blkW * 0.46)),
          coreNode,
          bayEngNode,
          true
        ) * 0.88
      : 0;

    // Larger/wider multi-cylinder blocks fill more of the bay and have higher lateral exposure
    const footprintExposure = clamp(0.90 + (engSpec.sizeL + engSpec.sizeW - 1.05) * 0.24, 0.86, 1.14);
    const mountShearPenalty = mountCount > 0 ? (mountBroken / mountCount) * 0.24 : 0;
    const rawEngineCrush =
      Math.max(
        maxEngBeamComp * 1.15,
        avgEngBeamComp * 1.35,
        engStrainNorm * 0.88,
        engCoreCol * 1.25,
        maxEncroach,
        bayBlockCrush * footprintExposure
      ) *
        strutBraceMult +
      mountShearPenalty;

    const toughnessDiv = clamp(resolvedPowertrain.effectiveBlockToughness, 0.82, 1.65);
    engineCrush = (Math.max(0, rawEngineCrush - 0.05) * 1.08) / Math.pow(toughnessDiv, 0.55);
  } else if (isRearBay && hasBay) {
    const bayBlockCrush = measureModuleFootprintCrush(
      nodes,
      beams,
      perim,
      baseEngCx,
      0,
      Math.max(3.0, Math.hypot(blkLen * 0.48, blkW * 0.48)),
      coreNode,
      undefined,
      false
    );
    const footprintExposure = clamp(0.90 + (engSpec.sizeL + engSpec.sizeW - 1.05) * 0.24, 0.86, 1.14);
    const toughnessDiv = clamp(resolvedPowertrain.effectiveBlockToughness, 0.82, 1.65);
    engineCrush = (Math.max(0, bayBlockCrush * footprintExposure * strutBraceMult - 0.05) * 1.08) / Math.pow(toughnessDiv, 0.55);
  }

  // --- G. OIL PAN (bottom of engine block + front/engine subframe rails) ---
  let oilPanCrush = engineCrush * 0.92;
  if (bayEngNode) {
    const nearSubL = bayEngNode.origX >= 0 ? subFL : subRL;
    const nearSubR = bayEngNode.origX >= 0 ? subFR : subRR;
    if (nearSubL) {
      const gL = clamp(Math.max(finite(bayEngNode.plasticStrain), finite(nearSubL.plasticStrain)) / 0.16, 0, 1);
      oilPanCrush = Math.max(oilPanCrush, pairClearanceCollapse(bayEngNode, nearSubL) * 1.15 * gL);
    }
    if (nearSubR) {
      const gR = clamp(Math.max(finite(bayEngNode.plasticStrain), finite(nearSubR.plasticStrain)) / 0.16, 0, 1);
      oilPanCrush = Math.max(oilPanCrush, pairClearanceCollapse(bayEngNode, nearSubR) * 1.15 * gR);
    }
  }

  // --- H. TRANSMISSION / TRANSAXLE (Transverse -Y side vs Longitudinal -X bellhousing & tunnel) ---
  let transmissionCrush = 0;
  const transKindFragility =
    resolvedPowertrain.transmissionKind === 'RANGE'
      ? 0.86
      : resolvedPowertrain.transmissionKind === 'MT'
      ? 0.96
      : resolvedPowertrain.transmissionKind === 'DSG' || resolvedPowertrain.transmissionKind === 'CVT'
      ? 1.14
      : 1.04;

  if (coreNode && coreId >= 0) {
    let maxCoreRailComp = 0;
    let avgCoreRailComp = 0;
    let coreRailCount = 0;
    if (!isRearBay || bayEngNode) {
      for (let i = 0; i < beams.length; i++) {
        const b = beams[i];
        if (b.nodeA === coreId || b.nodeB === coreId) {
          const otherId = b.nodeA === coreId ? b.nodeB : b.nodeA;
          const otherNode = nodes[otherId];
          if (isRearBay && otherNode && otherNode.origX > 0) continue;
          const c = beamCompression(b, nodes);
          if (c > maxCoreRailComp) maxCoreRailComp = c;
          avgCoreRailComp += c;
          coreRailCount++;
        }
      }
      if (coreRailCount > 0) avgCoreRailComp /= coreRailCount;
    }

    const engCoreGate = bayEngNode
      ? clamp(Math.max(finite(bayEngNode.plasticStrain), finite(coreNode.plasticStrain)) / 0.16, 0, 1)
      : 0;
    const engToCoreCol = bayEngNode ? pairClearanceCollapse(bayEngNode, coreNode) * engCoreGate : 0;
    const subRLToCore = pairClearanceCollapse(subRL, coreNode) * clamp(finite(subRL?.plasticStrain) / 0.16, 0, 1);
    const subRRToCore = pairClearanceCollapse(subRR, coreNode) * clamp(finite(subRR?.plasticStrain) / 0.16, 0, 1);
    const rearDrivelineShock = Math.max(subRLToCore, subRRToCore) * (isRearBay ? 0.85 : 0.48);

    let tunnelRailCrush = 0;
    if (!isRearBay) {
      for (const n of nodes) {
        if (n.name === 'Rail mid L' || n.name === 'Rail mid R') {
          const pGate = clamp(Math.max(finite(n.plasticStrain), finite(coreNode.plasticStrain)) / 0.16, 0, 1);
          tunnelRailCrush = Math.max(
            tunnelRailCrush,
            pairClearanceCollapse(n, coreNode) * 1.15 * pGate,
            finite(n.plasticStrain) / 2.4
          );
        }
      }
    }

    let modelTransZoneCrush = 0;
    if (hasBay) {
      if (isTransverse) {
        // Transverse transaxle bolted to LEFT (-Y) side of inline block
        const txW = blkW * (resolvedPowertrain.transmissionKind === 'AT' || resolvedPowertrain.transmissionKind === 'DSG' || resolvedPowertrain.transmissionKind === 'CVT' ? 0.42 : 0.34);
        const txPos = engToLocal(0, -blkW * 0.52 - txW * 0.45);
        const txLocalCrush = measureModuleFootprintCrush(
          nodes,
          beams,
          perim,
          txPos.x,
          txPos.y,
          Math.max(2.6, blkLen * 0.45),
          coreNode,
          bayEngNode,
          Boolean(bayEngNode)
        );
        const nearSubL = isRearBay ? subRL : subFL;
        const leftSubCol = nearSubL && bayEngNode
          ? pairClearanceCollapse(bayEngNode, nearSubL) * clamp(Math.max(finite(nearSubL.plasticStrain), finite(bayEngNode.plasticStrain)) / 0.16, 0, 1)
          : 0;
        modelTransZoneCrush = Math.max(txLocalCrush * 1.15, leftSubCol * 1.15);
      } else {
        // Longitudinal / V / Boxer bellhousing bolted to REAR (-X in block coords)
        const gbL = blkLen * 0.38;
        const gbPos = engToLocal(-blkLen * 0.5 - gbL * 0.55, 0);
        modelTransZoneCrush = measureModuleFootprintCrush(
          nodes,
          beams,
          perim,
          gbPos.x,
          gbPos.y,
          Math.max(2.6, blkW * 0.45),
          coreNode,
          bayEngNode,
          Boolean(bayEngNode)
        );
      }
    }

    const rawTransCrush = Math.max(
      modelTransZoneCrush,
      engToCoreCol * (isTransverse ? 0.95 : 1.30),
      maxCoreRailComp * (isTransverse ? 0.85 : 1.10),
      avgCoreRailComp * (isTransverse ? 0.95 : 1.25),
      tunnelRailCrush,
      rearDrivelineShock,
      engineCrush * (isTransverse ? 0.45 : 0.58)
    );
    transmissionCrush = Math.max(0, rawTransCrush - 0.05) * 1.08 * transKindFragility;
  } else {
    transmissionCrush = engineCrush * 0.7 * transKindFragility;
  }

  // --- I. MODEL-SPECIFIC ENGINE BAY SUB-MODULES ---
  // 1. Turbocharger snail(s) / Supercharger
  let turboCrush = 0;
  if (hasBay && resolvedPowertrain.turboKind !== 'none') {
    const snailR = Math.max(2.4, Math.min(blkLen, blkW) * 0.40);
    const engMounted = Boolean(bayEngNode);
    if (resolvedPowertrain.turboKind === 'single') {
      const tx = isTransverse ? blkLen * 0.46 : blkLen * 0.08;
      const ty = isTransverse ? 0 : blkW * 0.64;
      const p = engToLocal(tx, ty);
      turboCrush = Math.max(
        0,
        measureModuleFootprintCrush(nodes, beams, perim, p.x, p.y, snailR, radAnchor, bayEngNode, engMounted) - 0.06
      );
    } else if (resolvedPowertrain.turboKind === 'twin') {
      const pL = engToLocal(blkLen * 0.12, -blkW * 0.62);
      const pR = engToLocal(blkLen * 0.12, blkW * 0.62);
      const cL = measureModuleFootprintCrush(nodes, beams, perim, pL.x, pL.y, snailR, radAnchor, bayEngNode, engMounted);
      const cR = measureModuleFootprintCrush(nodes, beams, perim, pR.x, pR.y, snailR, radAnchor, bayEngNode, engMounted);
      turboCrush = Math.max(0, Math.max(cL, cR) * 0.68 + ((cL + cR) * 0.5) * 0.32 - 0.06);
    } else if (resolvedPowertrain.turboKind === 'supercharger') {
      if (engSpec.architecture === 'v') {
        const pCenter = engToLocal(0, 0);
        const pSnout = engToLocal(blkLen * 0.44, 0);
        const c1 = measureModuleFootprintCrush(nodes, beams, perim, pCenter.x, pCenter.y, snailR, coreNode, bayEngNode, engMounted);
        const c2 = measureModuleFootprintCrush(nodes, beams, perim, pSnout.x, pSnout.y, snailR * 0.9, radAnchor, bayEngNode, engMounted);
        turboCrush = Math.max(0, Math.max(c1 * 0.85, c2 * 0.95) - 0.07);
      } else {
        const pSide = engToLocal(0, -blkW * 0.66);
        turboCrush = Math.max(
          0,
          measureModuleFootprintCrush(nodes, beams, perim, pSide.x, pSide.y, snailR, coreNode, bayEngNode, engMounted) - 0.06
        );
      }
    }
  }

  // 2. Alternator & Serpentine Belt (+Y right flank on transverse, +X front nose on longitudinal)
  let alternatorCrush = 0;
  if (hasBay) {
    const altPos = isTransverse
      ? engToLocal(blkLen * 0.18, blkW * 0.52)
      : engToLocal(blkLen * 0.53, blkW * 0.24);
    const altR = Math.max(2.4, Math.min(blkLen, blkW) * 0.38);
    const rawAlt = measureModuleFootprintCrush(nodes, beams, perim, altPos.x, altPos.y, altR, radAnchor, bayEngNode, Boolean(bayEngNode));
    const fanPush = !isTransverse ? coolingFanCrush * 0.72 : 0;
    alternatorCrush = Math.max(0, Math.max(rawAlt, fanPush) - 0.06);
  }

  // 3. 12V Battery & Terminals (front-left corner on standard bays; side frame tray on trucks/tractors)
  let batteryCrush = 0;
  if (hasBay && eng.batteryInstalled !== false) {
    const batPos =
      !bay.isNarrowTractorBonnet && !bay.isCabOver
        ? { x: isRearBay ? bay.bayX2 - bayLen * 0.22 : bay.bayX2 - bayLen * 0.26, y: -bay.bayHalfW * 0.64 }
        : { x: 0.05 * L, y: -0.42 * W };
    const batR = Math.max(2.5, Math.min(bayLen, bayW) * 0.28);
    batteryCrush = Math.max(
      0,
      measureModuleFootprintCrush(nodes, beams, perim, batPos.x, batPos.y, batR, coreNode, bayEngNode, false) - 0.05
    );
  }

  // 4. Airbox / Cold-Air Cone Intake (front-right bay)
  let airIntakeCrush = 0;
  if (hasBay && engSpec.fuelLayout !== 'carb_round' && !engSpec.hasOilBathFilter && !bay.isNarrowTractorBonnet) {
    const airX = isRearBay ? bay.bayX1 + bayLen * 0.30 : bay.bayX2 - bayLen * 0.34;
    const airY = bay.bayHalfW * 0.62;
    const airR = Math.max(2.4, Math.min(bayLen, bayW) * 0.28);
    airIntakeCrush = Math.max(
      0,
      measureModuleFootprintCrush(nodes, beams, perim, airX, airY, airR, coreNode, bayEngNode, false) - 0.05
    );
  }

  // 5. ECU / Relay Box (firewall left-center for EFI/TSI/CR/VTEC)
  let ecuCrush = 0;
  const usesEcu =
    hasBay &&
    !bay.isNarrowTractorBonnet &&
    !bay.isCabOver &&
    engSpec.fuelLayout !== 'carb_round' &&
    !engSpec.hasCenterTnvd &&
    !engSpec.hasSideTnvd;
  if (usesEcu) {
    const ecuX = isRearBay ? bay.bayX2 - bayLen * 0.22 : bay.bayX1 + bayLen * 0.18;
    const ecuY = -bay.bayHalfW * 0.22;
    const ecuR = Math.max(2.4, Math.min(bayLen, bayW) * 0.26);
    ecuCrush = Math.max(
      0,
      measureModuleFootprintCrush(nodes, beams, perim, ecuX, ecuY, ecuR, coreNode, bayEngNode, false) - 0.05
    );
  }

  // 6. GBO / LPG Reducer (rear-right flank of engine block)
  let gboReducerCrush = 0;
  if (hasBay && resolvedPowertrain.hasGBO) {
    const gboPos = engToLocal(-blkLen * 0.34, blkW * 0.56);
    const gboR = Math.max(2.4, Math.min(blkLen, blkW) * 0.35);
    gboReducerCrush = Math.max(
      0,
      measureModuleFootprintCrush(nodes, beams, perim, gboPos.x, gboPos.y, gboR, coreNode, bayEngNode, Boolean(bayEngNode)) - 0.05
    );
  }

  // --- J. FUEL RAIL / INJECTION PUMP & FUEL TANK (using blueprint layout + vehicle tank position) ---
  let fuelRailCrush = engineCrush;
  if (hasBay) {
    const engMounted = Boolean(bayEngNode);
    if (engSpec.hasCenterTnvd) {
      // Heavy YaMZ/KAMAZ ТНВД shielded inside central V-valley
      const tnvdPos = engToLocal(0, 0);
      const vCrush = measureModuleFootprintCrush(nodes, beams, perim, tnvdPos.x, tnvdPos.y, Math.max(2.6, blkW * 0.38), coreNode, bayEngNode, engMounted);
      fuelRailCrush = Math.max(engineCrush * 0.72, vCrush * 0.78);
    } else if (engSpec.hasSideTnvd) {
      // Inline diesel ТНВД mounted on exposed side flank
      const sidePos = isTransverse ? engToLocal(-blkLen * 0.42, 0) : engToLocal(0, -blkW * 0.56);
      const sideCrush = measureModuleFootprintCrush(nodes, beams, perim, sidePos.x, sidePos.y, Math.max(2.6, blkW * 0.42), coreNode, bayEngNode, engMounted);
      fuelRailCrush = Math.max(engineCrush * 0.92, sideCrush);
    } else if (engSpec.hasDistributor) {
      const distPos = isTransverse ? engToLocal(blkLen * 0.24, -blkW * 0.38) : engToLocal(-blkLen * 0.38, blkW * 0.26);
      const distCrush = measureModuleFootprintCrush(nodes, beams, perim, distPos.x, distPos.y, Math.max(2.4, blkW * 0.38), coreNode, bayEngNode, engMounted);
      fuelRailCrush = Math.max(engineCrush * 0.95, distCrush);
    } else {
      // Direct injection / TSI / MPI rail atop head
      const railPos = engToLocal(0, 0);
      const railLocal = measureModuleFootprintCrush(nodes, beams, perim, railPos.x, railPos.y, Math.max(2.6, blkW * 0.42), coreNode, bayEngNode, engMounted);
      fuelRailCrush = Math.max(engineCrush, railLocal * 0.92);
    }
  }

  let fuelTankCrush = 0;
  if (fuel) {
    const tankPoints = getFuelTankLocalPoints(car);
    const tankRadius = Math.max(W * 0.42, L * 0.20);
    for (const pt of tankPoints) {
      const c = measureLocalZoneCrush(nodes, beams, pt.x, pt.y, tankRadius, coreNode);
      if (c > fuelTankCrush) fuelTankCrush = c;
    }
  }

  // Starter motor zone (mounted at bellhousing/flywheel junction)
  let starterZoneCrush = engineCrush;
  if (hasBay) {
    const stPos = isTransverse ? engToLocal(-blkLen * 0.25, -blkW * 0.45) : engToLocal(-blkLen * 0.45, -blkW * 0.32);
    starterZoneCrush = Math.max(
      engineCrush,
      measureModuleFootprintCrush(nodes, beams, perim, stPos.x, stPos.y, Math.max(2.4, blkW * 0.38), coreNode, bayEngNode, Boolean(bayEngNode))
    );
  }

  // --- APPLY HIGH-WATER-MARK DELTAS TO POWERTRAIN & FUEL STATE ---
  const dRad = Math.max(0, radiatorCrush - base.radiatorCrush);
  const dEng = Math.max(0, engineCrush - base.engineCrush);
  const dOil = Math.max(0, oilPanCrush - base.oilPanCrush);
  const dTrans = Math.max(0, transmissionCrush - base.transmissionCrush);
  const dRail = Math.max(0, fuelRailCrush - base.fuelRailCrush);
  const dTank = Math.max(0, fuelTankCrush - base.fuelTankCrush);
  const dFan = Math.max(0, coolingFanCrush - (base.coolingFanCrush ?? 0));
  const dIc = Math.max(0, intercoolerCrush - (base.intercoolerCrush ?? 0));
  const dTurbo = Math.max(0, turboCrush - (base.turboCrush ?? 0));
  const dAlt = Math.max(0, alternatorCrush - (base.alternatorCrush ?? 0));
  const dBat = Math.max(0, batteryCrush - (base.batteryCrush ?? 0));
  const dAir = Math.max(0, airIntakeCrush - (base.airIntakeCrush ?? 0));
  const dEcu = Math.max(0, ecuCrush - (base.ecuCrush ?? 0));
  const dGbo = Math.max(0, gboReducerCrush - (base.gboReducerCrush ?? 0));

  if (dRad > 0) base.radiatorCrush = radiatorCrush;
  if (dEng > 0) base.engineCrush = engineCrush;
  if (dOil > 0) base.oilPanCrush = oilPanCrush;
  if (dTrans > 0) base.transmissionCrush = transmissionCrush;
  if (dRail > 0) base.fuelRailCrush = fuelRailCrush;
  if (dTank > 0) base.fuelTankCrush = fuelTankCrush;
  if (dFan > 0) base.coolingFanCrush = coolingFanCrush;
  if (dIc > 0) base.intercoolerCrush = intercoolerCrush;
  if (dTurbo > 0) base.turboCrush = turboCrush;
  if (dAlt > 0) base.alternatorCrush = alternatorCrush;
  if (dBat > 0) base.batteryCrush = batteryCrush;
  if (dAir > 0) base.airIntakeCrush = airIntakeCrush;
  if (dEcu > 0) base.ecuCrush = ecuCrush;
  if (dGbo > 0) base.gboReducerCrush = gboReducerCrush;

  const isPlayerInvolved =
    car.isPlayerControlled ||
    (world && (world as any).player && ((world as any).player.currentVehicleId === car.id || (world as any).player.inVehicleId === car.id));

  // 1. Engine health & failures
  if (dEng > 0.002) {
    const engLoss = dEng * 122;
    eng.engineHealth = clamp(finite(eng.engineHealth, 100) - engLoss, 0, 100);

    // Engine stall from mechanical shock into engine bay
    if (dEng >= 0.045 || engineCrush >= 0.16) {
      eng.engineRunning = false;
      eng.engineRPM = 0;
    }
    if (eng.engineHealth <= 55) {
      eng.engineKnocking = true;
    }
    if (eng.engineHealth <= 28 || starterZoneCrush >= 0.56) {
      eng.starterWorking = false;
      eng.engineRunning = false;
      eng.engineRPM = 0;
    }
    if (eng.engineHealth <= 15) {
      eng.starterWorking = false;
      eng.engineRunning = false;
      eng.isSeized = true;
      eng.engineRPM = 0;
    }
  } else if (starterZoneCrush >= 0.58 && eng.starterWorking !== false) {
    eng.starterWorking = false;
  }

  // 2. Transmission / Transaxle health & jam
  if (dTrans > 0.002) {
    const transLoss = dTrans * 112;
    eng.transmissionHealth = clamp(finite(eng.transmissionHealth, 100) - transLoss, 0, 100);
    if (dTrans >= 0.08) {
      eng.engineRunning = false;
      eng.engineRPM = 0;
    }
    if (eng.transmissionHealth <= 22) {
      eng.transmissionJammed = true;
    }
  }

  // 3. Radiator puncture, Cooling Fan & under-hood steam
  if (dRad > 0 && radiatorCrush >= 0.21) {
    eng.radiatorPunctured = true;
    dmg.engineSmoking = true;
    if (radiatorCrush >= 0.62) {
      dmg.underHoodSteam = 'geyser';
    } else if (radiatorCrush >= 0.36) {
      if (dmg.underHoodSteam !== 'geyser') dmg.underHoodSteam = 'dense';
    } else if (!dmg.underHoodSteam || dmg.underHoodSteam === 'none') {
      dmg.underHoodSteam = 'thin';
    }
  }
  if (dFan > 0 && coolingFanCrush >= 0.30 && !eng.coolingFanBroken) {
    eng.coolingFanBroken = true;
    if (isPlayerInvolved && world && (world as any).player && !isRoadMachinery(carType)) {
      addPlayerNotification((world as any).player, 'Заклинил вентилятор охлаждения радиатора', 'warning');
    }
  }

  // 4. Intercooler & Turbocharger / Supercharger
  if (dIc > 0.003 && (hasFmic || hasTmic)) {
    const icLoss = dIc * 130;
    eng.intercoolerHealth = clamp(finite(eng.intercoolerHealth, 100) - icLoss, 0, 100);
    if (eng.intercoolerHealth <= 45 && isPlayerInvolved && world && (world as any).player && dIc >= 0.08) {
      addPlayerNotification((world as any).player, 'Пробит интеркулер / патрубки наддува — потеря давления турбины', 'warning');
    }
  }
  if (dTurbo > 0.003 && resolvedPowertrain.turboKind !== 'none') {
    const turboLoss = dTurbo * 124;
    eng.turboHealth = clamp(finite(eng.turboHealth, 100) - turboLoss, 0, 100);
    if (eng.turboHealth <= 35 && isPlayerInvolved && world && (world as any).player && dTurbo >= 0.08) {
      addPlayerNotification(
        (world as any).player,
        resolvedPowertrain.turboKind === 'supercharger'
          ? 'Повреждён приводной компрессор (Supercharger)'
          : 'Повреждена турбина (улитка наддува)',
        'warning'
      );
    }
  }

  // 5. Alternator & Serpentine Belt
  if (dAlt > 0 && alternatorCrush >= 0.32 && eng.alternatorWorking !== false) {
    eng.alternatorWorking = false;
    if (isPlayerInvolved && world && (world as any).player) {
      addPlayerNotification((world as any).player, 'Оборван приводной ремень / повреждён генератор', 'warning');
    }
  }

  // 6. 12V Battery & Terminals
  if (dBat > 0 && eng.batteryInstalled !== false) {
    if (batteryCrush >= 0.24) {
      eng.batteryCharge = clamp(finite(eng.batteryCharge, 100) - dBat * 48, 0, 100);
    }
    if (batteryCrush >= 0.28 && eng.batteryPosConnected !== false) {
      eng.batteryPosConnected = false;
      if (isPlayerInvolved && world && (world as any).player) {
        addPlayerNotification((world as any).player, 'От удара в отсек слетела плюсовая клемма (+) АКБ', 'warning');
      }
    }
    if (batteryCrush >= 0.42 && eng.batteryNegConnected !== false) {
      eng.batteryNegConnected = false;
    }
    if (batteryCrush >= 0.56) {
      eng.batteryCharge = Math.min(finite(eng.batteryCharge, 100), 8);
      if (usesEcu) {
        eng.engineRunning = false;
        eng.engineRPM = 0;
      }
    }
  }

  // 7. Airbox / Cold-air intake & ECU
  if (dAir > 0 && airIntakeCrush >= 0.34 && !eng.airIntakeDamaged) {
    eng.airIntakeDamaged = true;
    if (isPlayerInvolved && world && (world as any).player) {
      addPlayerNotification((world as any).player, 'Смят корпус воздушного фильтра / тракт впуска', 'warning');
    }
  }
  if (dEcu > 0 && ecuCrush >= 0.42 && !eng.ecuDamaged) {
    eng.ecuDamaged = true;
    if (ecuCrush >= 0.65) {
      eng.engineRunning = false;
      eng.engineRPM = 0;
    }
    if (isPlayerInvolved && world && (world as any).player) {
      addPlayerNotification((world as any).player, 'Повреждён блок ЭБУ / проводка под капотом (аварийный режим)', 'warning');
    }
  }

  // 8. GBO Reducer
  if (dGbo > 0 && gboReducerCrush >= 0.36 && !eng.gboReducerDamaged) {
    eng.gboReducerDamaged = true;
    if (fuel && fuel.gboActive !== false) {
      fuel.gboActive = false;
    }
    if (isPlayerInvolved && world && (world as any).player) {
      addPlayerNotification((world as any).player, 'Повреждён газовый редуктор ГБО — питание переключено на бензин', 'warning');
    }
  }

  // 9. Oil pan puncture & oil/wiring smoke
  if (dOil > 0 && oilPanCrush >= 0.35) {
    eng.oilPunctured = true;
    dmg.engineSmoking = true;
    if (engineCrush >= 0.62) {
      dmg.underHoodSmoke = 'oil_gray_wiring_black';
    } else if (!dmg.underHoodSmoke || dmg.underHoodSmoke === 'none') {
      dmg.underHoodSmoke = 'oil_blue';
    }
  }

  // 10. Fuel rail / Injector pump fracture & engine-bay fire ignition
  const railFailThreshold = engSpec.hasCenterTnvd ? 0.58 : (engSpec.hasSideTnvd ? 0.42 : 0.48);
  if (dRail > 0 && fuelRailCrush >= railFailThreshold) {
    if (fuel) fuel.fuelRailBroken = true;
    if (engSpec.hasSideTnvd || engSpec.hasCenterTnvd || engSpec.fuelLayout === 'diesel_cr' || engSpec.hasDistributor) {
      eng.fuelInjectorPumpDamaged = true;
    }
  }

  const noFireYet = !dmg.isFullyBurnt && !dmg.engineFire && !dmg.cabinFire && !dmg.underHoodSmolder && !dmg.fuelTankFire;
  if (noFireYet && fuel?.fuelRailBroken && dEng >= 0.06) {
    if (engineCrush >= 0.92) {
      // Catastrophic engine bay collapse with ruptured fuel rail -> immediate open engine fire
      dmg.fireOrigin = 'front';
      dmg.engineFire = true;
      dmg.fireTimer = 5.0;
      dmg.fireProgress = 0.20;
      dmg.fireIntensity = 0.45;
      dmg.underHoodSteam = 'geyser';
      dmg.underHoodSmoke = 'oil_gray_wiring_black';
      dmg.engineSmoking = true;
      if (isPlayerInvolved && world && (world as any).player) {
        addPlayerNotification(
          (world as any).player,
          'Критическое смятие моторного отсека: разрыв топливной рампы и возгорание под капотом',
          'warning'
        );
      }
    } else if (isPlayerInvolved && engineCrush >= 0.68 && Math.random() < 0.14) {
      dmg.fireOrigin = 'front';
      dmg.underHoodSmolder = true;
      dmg.fireTimer = 0;
      dmg.engineSmoking = true;
      dmg.fireProgress = 0;
      dmg.fireIntensity = 0;
      dmg.underHoodSmoke = 'oil_gray_wiring_black';
      if (world && (world as any).player) {
        addPlayerNotification(
          (world as any).player,
          'Из-под капота повалил едкий дым: повреждена топливная рампа, начинается тление',
          'warning'
        );
      }
    }
  }

  // 6. Fuel tank puncture & rear/tank fire (strictly from soft-body crush at the fuel tank)
  if (fuel && dTank > 0 && fuelTankCrush >= 0.38) {
    fuel.tankPunctured = true;
    const canIgniteTank =
      !dmg.isFullyBurnt &&
      !dmg.engineFire &&
      !dmg.cabinFire &&
      !dmg.underHoodSmolder &&
      !dmg.fuelTankFire;
    if (canIgniteTank && fuelTankCrush >= 0.62 && dTank >= 0.08) {
      const chance = isPlayerInvolved ? clamp((fuelTankCrush - 0.58) * 0.75, 0.05, 0.55) : (fuelTankCrush > 0.85 ? 0.08 : 0);
      if (Math.random() < chance) {
        dmg.fireOrigin = 'rear';
        dmg.fuelTankFire = true;
        dmg.fireTimer = 0;
        dmg.fireProgress = 0.15;
        dmg.fireIntensity = 0.6;
        dmg.groundPuddleIgnited = true;

        if (world && world.stains) {
          const pts = getFuelTankLocalPoints(car);
          const pt = pts[0];
          const cosA = Math.cos(car.angle);
          const sinA = Math.sin(car.angle);
          const wx = car.x + cosA * pt.x - sinA * pt.y;
          const wy = car.y + sinA * pt.x + cosA * pt.y;
          world.stains.push({
            id: `fuel_fire_${car.id}_${Date.now()}`,
            x: wx,
            y: wy,
            radius: 10,
            maxRadius: 26,
            type: 'fuel',
            alpha: 0.85,
            age: 0,
            onFire: true,
            fireIntensity: 0.85
          } as any);
        }
        if (isPlayerInvolved && world && (world as any).player) {
          addPlayerNotification(
            (world as any).player,
            'Пробит и воспламенился топливный бак: огонь под днищем автомобиля',
            'warning'
          );
        }
      }
    }
  }
}

// ============================================================================
// 2. SOFT-BODY OCCUPANT (DRIVER) SURVIVAL CELL & G-LOAD TELEMETRY
// ============================================================================

interface CabinIntrusionSnapshot {
  frontIntrusion: number;
  driverSideIntrusion: number;
  passengerSideIntrusion: number;
  rearIntrusion: number;
  cageIntegrity: number;
  crumpleRemaining: number;
  isOpenCockpit: boolean;
}

/**
 * Measures physical intrusion of soft-body nodes into the driver's survival cell
 * and the remaining structural integrity of the cabin safety cage.
 */
export function measureSoftBodyCabinState(
  system: NodeBeamStructure,
  car: Vehicle
): CabinIntrusionSnapshot {
  const nodes = system.nodes;
  const beams = system.beams;
  const L = car.length || 42;
  const W = car.width || 20;
  const halfL = L * 0.5;
  const halfW = W * 0.5;
  const carType = car.type || 'sedan';
  const isBike = isMotorcycle(carType);
  const isOpenCockpit = isBike;

  const {
    perim,
    engNode,
    coreNode,
    wsNode,
    rearHeaderNode,
    aPillarL,
    aPillarR,
    bPillarL,
    bPillarR,
    cPillarL,
    cPillarR
  } = resolveMeshAnatomy(system);

  // Driver seat local position from vehicle's own cabin geometry
  const xA = aPillarL ? aPillarL.origX : (wsNode ? wsNode.origX - 0.08 * L : 0.07 * L);
  const xB = bPillarL ? bPillarL.origX : -0.04 * L;
  const driverX = clamp((xA + xB) * 0.5, -0.25 * L, 0.35 * L);
  const driverY = isBike && carType !== 'moto_ural_sidecar'
    ? 0
    : (isTractorVehicle(carType) ? 0 : -0.22 * W);

  // 1. FRONTAL CABIN / FIREWALL / PEDAL-BOX INTRUSION (longitudinal X collapse into driver footwell)
  let frontRaw = 0;
  if (wsNode && coreNode) {
    frontRaw = Math.max(frontRaw, longitudinalClearanceCollapse(wsNode, coreNode) * 1.15);
  }
  if (aPillarL && bPillarL) {
    // Driver-side A-pillar collapsing rearward toward B-pillar (captures driver-side small-overlap too!)
    frontRaw = Math.max(frontRaw, longitudinalClearanceCollapse(aPillarL, bPillarL) * 1.30);
  }
  if (aPillarL && coreNode) {
    frontRaw = Math.max(frontRaw, longitudinalClearanceCollapse(aPillarL, coreNode) * 1.15);
  }
  if (engNode && coreNode && engNode.origX > driverX) {
    // Engine block breaching the firewall toward the footwell
    const engToCore = longitudinalClearanceCollapse(engNode, coreNode);
    frontRaw = Math.max(frontRaw, Math.max(0, engToCore - 0.16) * 1.35);
  }
  // Subtract small elastic/clearance margin so light crumple-zone-only hits have 0 cabin intrusion
  const frontIntrusion = clamp(Math.max(0, frontRaw - 0.16) * 1.35, 0, 1.5);

  // 2. DRIVER-SIDE (LEFT, y < 0) LATERAL INTRUSION (strictly lateral Y collapse along door span)
  let driverSideRaw = 0;
  const xCabMin = cPillarL ? cPillarL.origX : -0.22 * L;
  const xCabMax = xA + 0.01 * L;

  // Check left B-pillar collapsing laterally toward core or opposite right B-pillar
  if (bPillarL && coreNode && finite(bPillarL.plasticStrain) > 0.08) {
    driverSideRaw = Math.max(driverSideRaw, lateralClearanceCollapse(bPillarL, coreNode) * 1.25);
  }
  if (bPillarL && bPillarR && finite(bPillarL.plasticStrain) > 0.08) {
    driverSideRaw = Math.max(driverSideRaw, lateralClearanceCollapse(bPillarL, bPillarR) * 1.35);
  }
  // Left door skin nodes intruding laterally inward past the door cavity toward the driver seat
  for (let i = 0; i < perim; i++) {
    const n = nodes[i];
    if (!n) continue;
    if (n.origY < -halfW * 0.45 && n.origX >= xCabMin && n.origX <= xCabMax) {
      if (finite(n.plasticStrain) < 0.08) continue;
      const latColCore = lateralClearanceCollapse(n, coreNode);
      const inwardY = Math.max(0, n.y - n.origY);
      if (inwardY < 0.35) continue;
      const distToDriverY = Math.max(1.5, Math.abs(n.origY - driverY));
      // Gate inward movement by lateral collapse to core so rigid shift or frontal crush cannot fake door intrusion
      const gatedIntrusion = Math.min(inwardY / distToDriverY, latColCore * 1.65);
      driverSideRaw = Math.max(driverSideRaw, gatedIntrusion);
    }
  }
  const driverSideIntrusion = clamp(Math.max(0, driverSideRaw - 0.12) * 1.35, 0, 1.5);

  // 3. PASSENGER-SIDE (RIGHT, y > 0) LATERAL INTRUSION
  let passengerSideRaw = 0;
  if (bPillarR && coreNode && finite(bPillarR.plasticStrain) > 0.08) {
    passengerSideRaw = Math.max(passengerSideRaw, lateralClearanceCollapse(bPillarR, coreNode) * 1.20);
  }
  for (let i = 0; i < perim; i++) {
    const n = nodes[i];
    if (!n) continue;
    if (n.origY > halfW * 0.45 && n.origX >= xCabMin && n.origX <= xCabMax) {
      if (finite(n.plasticStrain) < 0.08) continue;
      const latColCore = lateralClearanceCollapse(n, coreNode);
      const inwardY = Math.max(0, n.origY - n.y);
      if (inwardY < 0.35) continue;
      const gatedIntrusion = Math.min(inwardY / Math.max(2, halfW), latColCore * 1.55);
      passengerSideRaw = Math.max(passengerSideRaw, gatedIntrusion);
    }
  }
  const passengerSideIntrusion = clamp(Math.max(0, passengerSideRaw - 0.14) * 1.25, 0, 1.5);

  // 4. REAR CABIN INTRUSION (longitudinal X collapse from rear)
  let rearRaw = 0;
  if (rearHeaderNode && coreNode) {
    rearRaw = Math.max(rearRaw, longitudinalClearanceCollapse(rearHeaderNode, coreNode) * 1.15);
  }
  if (cPillarL && bPillarL) {
    rearRaw = Math.max(rearRaw, longitudinalClearanceCollapse(cPillarL, bPillarL) * 1.25);
  }
  const rearIntrusion = clamp(Math.max(0, rearRaw - 0.18) * 1.25, 0, 1.5);

  // 5. CABIN SAFETY CAGE INTEGRITY (1 = intact, 0 = collapsed)
  let cageLossSum = 0;
  let cageBeamCount = 0;
  for (let i = 0; i < beams.length; i++) {
    const b = beams[i];
    const nA = nodes[b.nodeA];
    const nB = nodes[b.nodeB];
    if (!nA || !nB) continue;
    const isCageNode = (n: BeamNode) =>
      n.group === 'pillar' || n.group === 'windshield' || n.group === 'roof';
    if (isCageNode(nA) && isCageNode(nB)) {
      cageLossSum += beamDeformation(b, nodes);
      cageBeamCount++;
    }
  }
  const avgCageLoss = cageBeamCount > 0 ? cageLossSum / cageBeamCount : 0;
  const cageIntegrity = isOpenCockpit ? 0.35 : clamp(1.0 - avgCageLoss * 1.65, 0.20, 1.0);

  // 6. REMAINING CRUMPLE BUFFER (how much front/rear overhang is still uncrushed)
  let frontRemaining = 1.0;
  if (car.damage) {
    const frontZone = Math.max(4, L * 0.30);
    frontRemaining = clamp(1.0 - finite(car.damage.frontCrumple) / frontZone, 0, 1);
  }

  return {
    frontIntrusion,
    driverSideIntrusion,
    passengerSideIntrusion,
    rearIntrusion,
    cageIntegrity,
    crumpleRemaining: frontRemaining,
    isOpenCockpit
  };
}

/**
 * Records the obstacle label on the vehicle's soft-body system (used only for HUD
 * notification text) and wakes the occupant crash-pulse tracker.
 */
export function registerSoftBodyImpactContext(
  car: Vehicle | undefined,
  obstacleLabel: string
): void {
  const system = car?.damage?.nodeBeam;
  if (!system) return;
  system.lastImpactObstacle = obstacleLabel;
  system.isSleeping = false;
  system.activeTimer = Math.max(system.activeTimer || 0, 0.35);
}

function findSeatedPlayer(car: Vehicle, world?: GameWorld): Player | null {
  const player = world ? ((world as any).player as Player | undefined) : undefined;
  if (!player) return null;
  const isSeated =
    (player.isInVehicle && (player.currentVehicleId === car.id || (player as any).inVehicleId === car.id)) ||
    (car.isPlayerControlled && player.isInVehicle);
  return isSeated ? player : null;
}

function flushOccupantPulse(
  system: NodeBeamStructure,
  car: Vehicle,
  st: SoftBodyOccupantState,
  cabin: CabinIntrusionSnapshot,
  player: Player
): void {
  const cumDvPx = Math.hypot(st.pulseDvLocalX, st.pulseDvLocalY);
  const dvPx = Math.max(cumDvPx, finite(st.pulsePeakDvMag));
  const deltaVKmh = dvPx * PX_S_TO_SPEED_KMH;
  const dvMs = dvPx * PX_S_TO_MS;
  // Sustained G over the effective crash pulse window (minimum 0.085s so 1-frame rigid impulses
  // map to realistic ~85-120ms crash pulses instead of numerical 1/60s Dirac spikes)
  const effectiveDuration = Math.max(0.085, Math.min(0.18, st.pulseElapsed));
  const avgG = dvMs / effectiveDuration / GRAVITY_MS2;
  const peakG = Math.max(avgG, st.pulsePeakG);

  const useCumDir = cumDvPx >= finite(st.pulsePeakDvMag) * 0.75 && cumDvPx > 1e-4;
  const dirLocalX = useCumDir ? st.pulseDvLocalX / cumDvPx : finite(st.pulsePrimaryDirX);
  const dirLocalY = useCumDir ? st.pulseDvLocalY / cumDvPx : finite(st.pulsePrimaryDirY);

  const telemetry: SoftBodyOccupantTelemetry = {
    peakG,
    avgG,
    deltaVKmh,
    dirLocalX,
    dirLocalY,
    frontIntrusionDelta: st.pulseFrontIntrusion,
    driverSideIntrusionDelta: st.pulseDriverSideIntrusion,
    passengerSideIntrusionDelta: st.pulsePassengerSideIntrusion,
    rearIntrusionDelta: st.pulseRearIntrusion,
    totalFrontIntrusion: cabin.frontIntrusion,
    totalDriverSideIntrusion: cabin.driverSideIntrusion,
    cageIntegrity: cabin.cageIntegrity,
    crumpleRemaining: cabin.crumpleRemaining,
    windshieldJustCracked: st.pulseWindshieldCracked,
    isOpenCockpit: cabin.isOpenCockpit,
    obstacleLabel: system.lastImpactObstacle || 'препятствие'
  };

  // Reset pulse accumulator before applying trauma
  st.pulseActive = false;
  st.pulseElapsed = 0;
  st.pulseDvLocalX = 0;
  st.pulseDvLocalY = 0;
  st.pulsePeakDvMag = 0;
  st.pulsePrimaryDirX = 0;
  st.pulsePrimaryDirY = 0;
  st.pulsePeakG = 0;
  st.pulseFrontIntrusion = 0;
  st.pulseDriverSideIntrusion = 0;
  st.pulsePassengerSideIntrusion = 0;
  st.pulseRearIntrusion = 0;
  st.pulseWindshieldCracked = false;
  st.lastTraumaTime = performance.now() / 1000;

  applySoftBodyOccupantTrauma(player, car, telemetry);
}

/**
 * Steps the soft-body occupant telemetry sensor for the player inside a vehicle.
 * Measures actual chassis core deceleration (Δv + frameAx/frameAy + shell core reaction)
 * and live soft-body cabin intrusion deltas across the crash episode, then applies
 * biomechanically accurate trauma once the crash pulse completes.
 */
export function updateSoftBodyOccupantTrauma(
  system: NodeBeamStructure,
  car: Vehicle,
  dt: number,
  world?: GameWorld,
  forceFlushNow: boolean = false
): void {
  if (!system.nodes || system.nodes.length < 8) return;

  const player = findSeatedPlayer(car, world);
  if (!player) {
    // Keep occupantState uninitialized while empty so entering a moving car never fires a stale Δv spike
    if (system.occupantState) {
      system.occupantState.initialized = false;
      system.occupantState.pulseActive = false;
    }
    return;
  }

  if (!system.occupantState || !system.occupantState.initialized) {
    const st = createInitialOccupantState(car);
    const cabin = measureSoftBodyCabinState(system, car);
    st.baseFrontIntrusion = cabin.frontIntrusion;
    st.baseDriverSideIntrusion = cabin.driverSideIntrusion;
    st.basePassengerSideIntrusion = cabin.passengerSideIntrusion;
    st.baseRearIntrusion = cabin.rearIntrusion;
    st.wasWindshieldCracked = !!car.damage?.windshieldCracked;
    system.occupantState = st;
    return;
  }

  const st = system.occupantState;
  const safeDt = Math.max(0.004, Math.min(0.05, dt || 1 / 60));

  // Teleport / respawn guard: ignore discontinuous position jumps
  if (Math.hypot(car.x - st.prevX, car.y - st.prevY) > 140) {
    st.prevX = car.x;
    st.prevY = car.y;
    st.prevVx = car.vx;
    st.prevVy = car.vy;
    st.pulseActive = false;
    return;
  }

  // 1. Measure real chassis velocity change (world -> local car coordinates)
  const dvWx = finite(car.vx) - st.prevVx;
  const dvWy = finite(car.vy) - st.prevVy;
  st.prevX = finite(car.x);
  st.prevY = finite(car.y);
  st.prevVx = finite(car.vx);
  st.prevVy = finite(car.vy);

  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  const dvLocX = dvWx * cosA + dvWy * sinA;
  const dvLocY = -dvWx * sinA + dvWy * cosA;
  const dvMagPx = Math.hypot(dvLocX, dvLocY);

  // Instantaneous deceleration from continuous crush stroke (advanceCrashStroke)
  const frameA = Math.hypot(finite(system.lastFrameAx), finite(system.lastFrameAy));
  const frameG = (frameA * PX_S_TO_MS) / GRAVITY_MS2;

  // Soft-body shell reaction load into the rigid core
  const coreMass = Math.max(250, finite(system.totalNodeMass, car.mass || 1400));
  const reactA = Math.hypot(finite(system.reactionFx), finite(system.reactionFy)) / coreMass;
  const reactG = clamp((reactA * PX_S_TO_MS) / GRAVITY_MS2, 0, 45);

  // 2. Measure live soft-body cabin intrusion deltas
  const cabin = measureSoftBodyCabinState(system, car);
  const dFront = Math.max(0, cabin.frontIntrusion - st.baseFrontIntrusion);
  const dDriverSide = Math.max(0, cabin.driverSideIntrusion - st.baseDriverSideIntrusion);
  const dPassSide = Math.max(0, cabin.passengerSideIntrusion - st.basePassengerSideIntrusion);
  const dRear = Math.max(0, cabin.rearIntrusion - st.baseRearIntrusion);
  const wsCrackedNow = !!car.damage?.windshieldCracked && !st.wasWindshieldCracked;

  if (dFront > 0) st.baseFrontIntrusion = cabin.frontIntrusion;
  if (dDriverSide > 0) st.baseDriverSideIntrusion = cabin.driverSideIntrusion;
  if (dPassSide > 0) st.basePassengerSideIntrusion = cabin.passengerSideIntrusion;
  if (dRear > 0) st.baseRearIntrusion = cabin.rearIntrusion;
  if (wsCrackedNow) st.wasWindshieldCracked = true;

  const hasNewIntrusion = dFront > 0.005 || dDriverSide > 0.005 || dPassSide > 0.005 || dRear > 0.005 || wsCrackedNow;
  const isSoftBodyActive = !system.isSleeping || !!system.contact || !!(car.activeCrumple && car.activeCrumple.timer > 0);

  // Convert single-step Δv into a conservative equivalent crash-step G (ignoring normal 1G driving)
  const stepInstG = (dvMagPx * PX_S_TO_MS) / safeDt / GRAVITY_MS2;
  // A single-frame 2D impulse collision (car-car/train) resolves Δv in 1 tick; clamp single-frame
  // peakG using an 80ms crush window so it doesn't spike 5x above reality, while still preserving
  // true frameG from advanceCrashStroke (which already integrates over the real stroke time!).
  const dvCappedG = (dvMagPx * PX_S_TO_MS) / 0.085 / GRAVITY_MS2;
  const stepPeakG = Math.max(frameG, dvCappedG, reactG * 0.45);

  const isCrashLoad =
    hasNewIntrusion ||
    (isSoftBodyActive && (stepInstG >= 3.8 || frameG >= 3.8 || dvMagPx >= 14));

  if (isCrashLoad || st.pulseActive) {
    if (!st.pulseActive && isCrashLoad) {
      st.pulseActive = true;
      st.pulseElapsed = 0;
      st.pulseDvLocalX = 0;
      st.pulseDvLocalY = 0;
      st.pulsePeakDvMag = 0;
      st.pulsePrimaryDirX = 0;
      st.pulsePrimaryDirY = 0;
      st.pulsePeakG = 0;
      st.pulseFrontIntrusion = 0;
      st.pulseDriverSideIntrusion = 0;
      st.pulsePassengerSideIntrusion = 0;
      st.pulseRearIntrusion = 0;
      st.pulseWindshieldCracked = false;
    }

    if (st.pulseActive) {
      st.pulseElapsed += safeDt;
      // Only accumulate Δv while still decelerating under crash load (ignore post-stop normal driving)
      if (isCrashLoad || (car.activeCrumple && car.activeCrumple.timer > 0)) {
        st.pulseDvLocalX += dvLocX;
        st.pulseDvLocalY += dvLocY;
        const cumMag = Math.hypot(st.pulseDvLocalX, st.pulseDvLocalY);
        // Latch peak Δv excursion and primary direction so a rebound or next-frame activeCrumple
        // damping step cannot cancel out the initial impact impulse (e.g. car-car T-bone / rear-end)
        if (cumMag > finite(st.pulsePeakDvMag)) {
          st.pulsePeakDvMag = cumMag;
          if (cumMag > 1e-4) {
            st.pulsePrimaryDirX = st.pulseDvLocalX / cumMag;
            st.pulsePrimaryDirY = st.pulseDvLocalY / cumMag;
          }
        }
        if (dvMagPx > finite(st.pulsePeakDvMag)) {
          st.pulsePeakDvMag = dvMagPx;
          if (dvMagPx > 1e-4) {
            st.pulsePrimaryDirX = dvLocX / dvMagPx;
            st.pulsePrimaryDirY = dvLocY / dvMagPx;
          }
        }
      }
      if (stepPeakG > st.pulsePeakG) st.pulsePeakG = stepPeakG;
      st.pulseFrontIntrusion += dFront;
      st.pulseDriverSideIntrusion += dDriverSide;
      st.pulsePassengerSideIntrusion += dPassSide;
      st.pulseRearIntrusion += dRear;
      if (wsCrackedNow) st.pulseWindshieldCracked = true;

      const crumpleActive = !!(car.activeCrumple && car.activeCrumple.timer > 0);
      const shouldFlush =
        forceFlushNow ||
        (!crumpleActive && st.pulseElapsed >= 0.085) ||
        st.pulseElapsed >= 0.19;

      if (shouldFlush) {
        flushOccupantPulse(system, car, st, cabin, player);
      }
    }
  }
}

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
import { isMotorcycle, isTractorVehicle, isTrailerVehicle } from './vehicleArchetypes';
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
    rearGlassCrush: 0
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
    carType === 'cement_mixer' ||
    carType === 'garbage_truck' ||
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
    for (const b of beams) {
      if (b.partTag === 'hood') {
        hoodCrush = Math.max(hoodCrush, beamDeformation(b, nodes) * 1.25);
      }
    }
    if (hoodCrush > base.hoodCrush) {
      base.hoodCrush = hoodCrush;
      if (hoodCrush >= 0.30) {
        dmg.hoodBuckled = true;
        dmg.hoodRaisedAmount = Math.max(finite(dmg.hoodRaisedAmount), clamp((hoodCrush - 0.22) * 1.4, 0.25, 1.0));
      }
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

  // --- E. RADIATOR (between exterior grille/nose and engine/front subframe) ---
  let radiatorCrush = 0;
  const radIsRear = isRearEngineBus;
  const radSign = radIsRear ? -1 : 1;
  const radAnchor =
    engNode && Math.sign(engNode.origX || radSign) === radSign
      ? engNode
      : coreNode;
  const radSkinIds: number[] = [];
  for (let i = 0; i < perim; i++) {
    const n = nodes[i];
    if (!n) continue;
    const xHit = radIsRear ? n.origX <= -halfL * 0.68 : n.origX >= halfL * 0.68;
    const yHit = Math.abs(n.origY) <= halfW * 0.58;
    if (xHit && yHit) radSkinIds.push(i);
  }
  const radSkinSet = new Set(radSkinIds);
  for (const id of radSkinIds) {
    const sn = nodes[id];
    const colAnchor = pairClearanceCollapse(sn, radAnchor);
    const colCore = pairClearanceCollapse(sn, coreNode);
    const strainNorm = finite(sn.plasticStrain) / 2.2;
    // Gate un-beamed clearance collapse by local plastic yielding so purely elastic sway
    // during a mid-cabin T-bone (plasticStrain === 0 at the grille) cannot puncture the radiator
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
      // Longitudinal/radial beams behind the grille (not pure sideways bumper skin)
      if (nA && nB && (b.nodeA >= perim || b.nodeB >= perim || b.partTag === 'front_bumper')) {
        radiatorCrush = Math.max(radiatorCrush, beamCompression(b, nodes) * 1.05);
      }
    }
  }
  // Motorcycles are mostly air-cooled / narrow radiator right in front of engine
  if (isBike && engNode) {
    const bikeFrontGate = clamp(Math.max(finite(nodes[0]?.plasticStrain), finite(engNode.plasticStrain)) / 0.14, 0, 1);
    radiatorCrush = Math.max(radiatorCrush * 0.6, pairClearanceCollapse(nodes[0], engNode) * 0.9 * bikeFrontGate);
  }

  // --- F. ENGINE BLOCK (directly from engine node, its beams, strain & encroachment) ---
  let engineCrush = 0;
  if (engNode && engId >= 0) {
    let maxEngBeamComp = 0;
    let avgEngBeamComp = 0;
    let engBeamCount = 0;
    for (let i = 0; i < beams.length; i++) {
      const b = beams[i];
      if (b.nodeA === engId || b.nodeB === engId) {
        const c = beamCompression(b, nodes);
        // Cosmetic bumper latch snapping shouldn't by itself destroy the engine block
        const weight = b.type === 'latch' ? 0.45 : 1.0;
        const wc = c * weight;
        if (wc > maxEngBeamComp) maxEngBeamComp = wc;
        avgEngBeamComp += wc;
        engBeamCount++;
      }
    }
    if (engBeamCount > 0) avgEngBeamComp /= engBeamCount;

    const engStrainNorm = finite(engNode.plasticStrain) / 2.15;
    const engCorePlastic = clamp(
      Math.max(finite(engNode.plasticStrain), finite(coreNode?.plasticStrain)) / 0.16,
      0,
      1
    );
    const engCoreCol = pairClearanceCollapse(engNode, coreNode) * engCorePlastic;

    // Direct encroachment of plastically crushed exterior/frame nodes into the engine block footprint
    let maxEncroach = 0;
    const engReach = Math.max(L * 0.36, W * 0.55);
    for (let i = 0; i < nodes.length; i++) {
      if (i === engId) continue;
      const n = nodes[i];
      if (n.group === 'wheel' || n.isFixed) continue;
      const d0 = Math.hypot(n.origX - engNode.origX, n.origY - engNode.origY);
      if (d0 > 0.8 && d0 <= engReach) {
        const col = pairClearanceCollapse(n, engNode);
        if (col > 0.14) {
          const pGate = clamp(Math.max(finite(n.plasticStrain), finite(engNode.plasticStrain)) / 0.16, 0, 1);
          maxEncroach = Math.max(maxEncroach, (col - 0.14) * 1.25 * pGate);
        }
      }
    }

    const rawEngineCrush = Math.max(
      maxEngBeamComp * 1.15,
      avgEngBeamComp * 1.35,
      engStrainNorm * 0.88,
      engCoreCol * 1.25,
      maxEncroach
    );
    // Elastic deadzone so hard normal braking or light 10-15 km/h taps do not wear engineHealth
    engineCrush = Math.max(0, rawEngineCrush - 0.05) * 1.08;
  }

  // --- G. OIL PAN (bottom of engine block + front/engine subframe rails) ---
  let oilPanCrush = engineCrush * 0.92;
  if (engNode) {
    const nearSubL = engNode.origX >= 0 ? subFL : subRL;
    const nearSubR = engNode.origX >= 0 ? subFR : subRR;
    if (nearSubL) {
      const gL = clamp(Math.max(finite(engNode.plasticStrain), finite(nearSubL.plasticStrain)) / 0.16, 0, 1);
      oilPanCrush = Math.max(oilPanCrush, pairClearanceCollapse(engNode, nearSubL) * 1.15 * gL);
    }
    if (nearSubR) {
      const gR = clamp(Math.max(finite(engNode.plasticStrain), finite(nearSubR.plasticStrain)) / 0.16, 0, 1);
      oilPanCrush = Math.max(oilPanCrush, pairClearanceCollapse(engNode, nearSubR) * 1.15 * gR);
    }
  }

  // --- H. TRANSMISSION / GEARBOX (bellhousing + central tunnel + core & driveline beams) ---
  let transmissionCrush = 0;
  if (coreNode && coreId >= 0) {
    let maxCoreRailComp = 0;
    let avgCoreRailComp = 0;
    let coreRailCount = 0;
    for (let i = 0; i < beams.length; i++) {
      const b = beams[i];
      if (b.nodeA === coreId || b.nodeB === coreId) {
        const c = beamCompression(b, nodes);
        if (c > maxCoreRailComp) maxCoreRailComp = c;
        avgCoreRailComp += c;
        coreRailCount++;
      }
    }
    if (coreRailCount > 0) avgCoreRailComp /= coreRailCount;

    const engCoreGate = clamp(
      Math.max(finite(engNode?.plasticStrain), finite(coreNode.plasticStrain)) / 0.16,
      0,
      1
    );
    const engToCoreCol = pairClearanceCollapse(engNode, coreNode) * engCoreGate;
    const subRLToCore = pairClearanceCollapse(subRL, coreNode) * clamp(finite(subRL?.plasticStrain) / 0.16, 0, 1);
    const subRRToCore = pairClearanceCollapse(subRR, coreNode) * clamp(finite(subRR?.plasticStrain) / 0.16, 0, 1);
    const rearDrivelineShock = Math.max(subRLToCore, subRRToCore) * 0.48;

    // Lateral mid-rail tunnel crush (deep T-bone reaching the gearbox tunnel)
    let tunnelRailCrush = 0;
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

    const rawTransCrush = Math.max(
      engToCoreCol * 1.30,
      maxCoreRailComp * 1.10,
      avgCoreRailComp * 1.25,
      tunnelRailCrush,
      rearDrivelineShock,
      engineCrush * 0.55 // Direct engine-block crush transmits axial shock through bellhousing
    );
    transmissionCrush = Math.max(0, rawTransCrush - 0.05) * 1.08;
  } else {
    transmissionCrush = engineCrush * 0.7;
  }

  // --- I. FUEL RAIL & FUEL TANK (using vehicle's actual fuel tank location) ---
  const fuelRailCrush = engineCrush;
  let fuelTankCrush = 0;
  if (fuel) {
    const tankPoints = getFuelTankLocalPoints(car);
    const tankRadius = Math.max(W * 0.42, L * 0.20);
    for (const pt of tankPoints) {
      const c = measureLocalZoneCrush(nodes, beams, pt.x, pt.y, tankRadius, coreNode);
      if (c > fuelTankCrush) fuelTankCrush = c;
    }
  }

  // --- APPLY HIGH-WATER-MARK DELTAS TO POWERTRAIN & FUEL STATE ---
  const dRad = Math.max(0, radiatorCrush - base.radiatorCrush);
  const dEng = Math.max(0, engineCrush - base.engineCrush);
  const dOil = Math.max(0, oilPanCrush - base.oilPanCrush);
  const dTrans = Math.max(0, transmissionCrush - base.transmissionCrush);
  const dRail = Math.max(0, fuelRailCrush - base.fuelRailCrush);
  const dTank = Math.max(0, fuelTankCrush - base.fuelTankCrush);

  if (dRad > 0) base.radiatorCrush = radiatorCrush;
  if (dEng > 0) base.engineCrush = engineCrush;
  if (dOil > 0) base.oilPanCrush = oilPanCrush;
  if (dTrans > 0) base.transmissionCrush = transmissionCrush;
  if (dRail > 0) base.fuelRailCrush = fuelRailCrush;
  if (dTank > 0) base.fuelTankCrush = fuelTankCrush;

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
    if (eng.engineHealth <= 30) {
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
  }

  // 2. Transmission health & jam
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

  // 3. Radiator puncture & under-hood steam
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

  // 4. Oil pan puncture & oil/wiring smoke
  if (dOil > 0 && oilPanCrush >= 0.35) {
    eng.oilPunctured = true;
    dmg.engineSmoking = true;
    if (engineCrush >= 0.62) {
      dmg.underHoodSmoke = 'oil_gray_wiring_black';
    } else if (!dmg.underHoodSmoke || dmg.underHoodSmoke === 'none') {
      dmg.underHoodSmoke = 'oil_blue';
    }
  }

  // 5. Fuel rail fracture & engine-bay fire ignition (strictly from deep engine-bay soft-body crush)
  if (fuel && dRail > 0 && fuelRailCrush >= 0.48) {
    fuel.fuelRailBroken = true;
  }

  const isPlayerInvolved =
    car.isPlayerControlled ||
    (world && (world as any).player && ((world as any).player.currentVehicleId === car.id || (world as any).player.inVehicleId === car.id));

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

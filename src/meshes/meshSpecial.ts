import { NodeTemplate, BeamTemplate, VehicleNodeBeamDefinition } from '../types';
import {
  DEFAULT_K_STRUCTURAL,
  DEFAULT_C_STRUCTURAL,
  DEFAULT_K_CHASSIS,
  DEFAULT_C_CHASSIS,
  DEFAULT_K_LATCH,
  DEFAULT_C_LATCH,
  createPerimeterBeams,
  addBeamChain
} from './meshCommon';

// ============================================================================
// 4. URAL MOTORCYCLE WITH SIDECAR PRESET (Asymmetric 2-Track Chassis — Clean Clockwise Perimeter)
// ============================================================================
const MOTO_SIDECAR_NODES: NodeTemplate[] = [
  // Perimeter (0..15) — strictly clockwise, zero self-intersection, matching getVehicleBasePolygonRaw('moto_ural_sidecar')
  { id: 0, xFrac: 0.50, yFrac: -0.22, group: 'bumper', massFrac: 0.08, name: 'Front Motorcycle Tire' },
  { id: 1, xFrac: 0.35, yFrac: -0.10, group: 'fender', massFrac: 0.04, name: 'Front Fork Right' },
  { id: 2, xFrac: 0.28, yFrac: 0.16, group: 'fender', massFrac: 0.05, name: 'Sidecar Nose Bow Left' },
  { id: 3, xFrac: 0.24, yFrac: 0.36, group: 'fender', massFrac: 0.06, name: 'Sidecar Torpedo Bow Right' },
  { id: 4, xFrac: 0.04, yFrac: 0.48, group: 'door', massFrac: 0.06, name: 'Sidecar Wheel Fender Front' },
  { id: 5, xFrac: -0.22, yFrac: 0.48, group: 'quarter', massFrac: 0.07, name: 'Sidecar Wheel Fender Rear' },
  { id: 6, xFrac: -0.36, yFrac: 0.38, group: 'quarter', massFrac: 0.05, name: 'Sidecar Rear Trunk Corner' },
  { id: 7, xFrac: -0.38, yFrac: 0.12, group: 'quarter', massFrac: 0.04, name: 'Sidecar Inboard Rear Flange' },
  { id: 8, xFrac: -0.48, yFrac: -0.12, group: 'bumper', massFrac: 0.04, name: 'Rear Motorcycle Fender Right' },
  { id: 9, xFrac: -0.50, yFrac: -0.22, group: 'bumper', massFrac: 0.08, name: 'Rear Motorcycle Tire / Final Drive' },
  { id: 10, xFrac: -0.48, yFrac: -0.32, group: 'bumper', massFrac: 0.04, name: 'Rear Motorcycle Fender Left' },
  { id: 11, xFrac: -0.22, yFrac: -0.34, group: 'quarter', massFrac: 0.05, name: 'Saddle & Muffler Left' },
  { id: 12, xFrac: -0.02, yFrac: -0.38, group: 'engine', massFrac: 0.07, name: 'Boxer Engine Left Cylinder Head' },
  { id: 13, xFrac: 0.18, yFrac: -0.46, group: 'fender', massFrac: 0.03, name: 'Handlebar Left Grip' },
  { id: 14, xFrac: 0.30, yFrac: -0.36, group: 'fender', massFrac: 0.04, name: 'Telescopic Fork Left' },
  { id: 15, xFrac: 0.42, yFrac: -0.30, group: 'bumper', massFrac: 0.04, name: 'Front Mudguard Left' },

  // Internal Hardpoints (16..20, 5 nodes)
  { id: 16, xFrac: 0.21, yFrac: -0.22, group: 'chassis_core', massFrac: 0.06, name: 'Steering Headstock' },
  { id: 17, xFrac: -0.02, yFrac: -0.22, group: 'engine', massFrac: 0.20, name: 'Ural 650cc Boxer Twin Crankcase' },
  { id: 18, xFrac: -0.16, yFrac: -0.22, group: 'chassis_core', massFrac: 0.08, isFixed: true, name: 'Motorcycle Swingarm Pivot' },
  { id: 19, xFrac: -0.08, yFrac: 0.14, group: 'subframe', massFrac: 0.08, name: 'Tubular Sidecar Connecting Strut' },
  { id: 20, xFrac: -0.14, yFrac: 0.40, group: 'subframe', massFrac: 0.07, name: 'Sidecar Wheel Hub' }
];

function buildMotoSidecarBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.40, 0.45, 15.0, 0.9);

  // Motorcycle spine
  addBeamChain(beams, [
    [0, 16], [16, 17], [17, 18], [18, 9]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 1.3, DEFAULT_C_CHASSIS, 0.65, 20.0);

  // Rigid cross-struts connecting motorcycle to sidecar frame
  addBeamChain(beams, [
    [16, 1], [16, 14], [17, 19], [19, 2], [19, 3], [19, 4], [19, 20],
    [18, 19], [18, 7], [20, 4], [20, 5], [20, 6]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 1.4, DEFAULT_C_CHASSIS, 0.70, 22.0);

  beams.push({ nodeA: 16, nodeB: 13, type: 'latch', spring: DEFAULT_K_LATCH * 0.6, damp: DEFAULT_C_LATCH, yieldDist: 0.25, breakDist: 4.5 });

  return beams;
}

export const PRESET_MOTO_SIDECAR: VehicleNodeBeamDefinition = {
  presetId: 'moto_ural_sidecar',
  name: 'Ural Motorcycle with Sidecar (Asymmetric Duplex Frame & Boat Chassis)',
  perimeterCount: 16,
  nodes: MOTO_SIDECAR_NODES,
  beams: buildMotoSidecarBeams(),
  springScale: 0.90,
  dampScale: 0.90,
  yieldScale: 0.80,
  breakScale: 0.85,
  chassisStiffness: 0.95,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [9, 6],
    leftNodeIds: [11, 12],
    rightNodeIds: [4, 5],
    subframeLeftFL: 16,
    subframeRightFR: 3,
    subframeLeftRL: 9,
    subframeRightRR: 20,
    engineNodeId: 17,
    chassisCoreNodeId: 18
  }
};

// ============================================================================
// 5. SOLO MOTORCYCLE PRESET (Telescopic Fork, Duplex Cradle, Rear Swingarm)
// ============================================================================
const MOTORCYCLE_NODES: NodeTemplate[] = [
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.08, name: 'Front Wheel Hub / Tire' },
  { id: 1, xFrac: 0.38, yFrac: 0.14, group: 'bumper', massFrac: 0.05, name: 'Fork Slider Right' },
  { id: 2, xFrac: 0.22, yFrac: 0.48, group: 'fender', massFrac: 0.02, name: 'Handlebar Right Throttle' },
  { id: 3, xFrac: 0.10, yFrac: 0.28, group: 'hood', massFrac: 0.05, name: 'Teardrop Tank Right' },
  { id: 4, xFrac: 0.00, yFrac: 0.22, group: 'engine', massFrac: 0.06, name: 'Engine Cylinder Fin Right' },
  { id: 5, xFrac: -0.14, yFrac: 0.20, group: 'door', massFrac: 0.05, name: 'Saddle Right Flank' },
  { id: 6, xFrac: -0.32, yFrac: 0.18, group: 'quarter', massFrac: 0.04, name: 'Exhaust Muffler Right' },
  { id: 7, xFrac: -0.48, yFrac: 0.12, group: 'quarter', massFrac: 0.03, name: 'Rear Fender Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.09, name: 'Rear Wheel Axle / Chain Sprocket' },
  { id: 9, xFrac: -0.48, yFrac: -0.12, group: 'quarter', massFrac: 0.03, name: 'Rear Fender Left' },
  { id: 10, xFrac: -0.32, yFrac: -0.18, group: 'quarter', massFrac: 0.04, name: 'Exhaust Muffler Left' },
  { id: 11, xFrac: -0.14, yFrac: -0.20, group: 'door', massFrac: 0.05, name: 'Saddle Left Flank' },
  { id: 12, xFrac: 0.00, yFrac: -0.22, group: 'engine', massFrac: 0.06, name: 'Engine Cylinder Fin Left' },
  { id: 13, xFrac: 0.10, yFrac: -0.28, group: 'hood', massFrac: 0.05, name: 'Teardrop Tank Left' },
  { id: 14, xFrac: 0.22, yFrac: -0.48, group: 'fender', massFrac: 0.02, name: 'Handlebar Left Clutch' },
  { id: 15, xFrac: 0.38, yFrac: -0.14, group: 'bumper', massFrac: 0.05, name: 'Fork Slider Left' },

  // Core (16..19, 4 nodes)
  { id: 16, xFrac: 0.22, yFrac: 0.0, group: 'chassis_core', massFrac: 0.07, name: 'Triple Clamp / Headstock' },
  { id: 17, xFrac: 0.00, yFrac: 0.0, group: 'engine', massFrac: 0.26, name: 'Engine Crankcase & Cylinders' },
  { id: 18, xFrac: -0.12, yFrac: 0.0, group: 'subframe', massFrac: 0.08, isFixed: true, name: 'Swingarm Pivot Pin' },
  { id: 19, xFrac: -0.28, yFrac: 0.0, group: 'roof', massFrac: 0.06, name: 'Seat Subframe / Shock Mount' }
];

function buildMotorcycleBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.35, 0.40, 14.0, 0.85);

  // Fork
  addBeamChain(beams, [
    [0, 1], [0, 15], [1, 16], [15, 16]
  ], 'structural', DEFAULT_K_STRUCTURAL * 0.9, DEFAULT_C_STRUCTURAL * 1.5, 0.35, 8.0);

  // Handlebars latch
  beams.push({ nodeA: 16, nodeB: 2, type: 'latch', spring: DEFAULT_K_LATCH * 0.6, damp: DEFAULT_C_LATCH, yieldDist: 0.25, breakDist: 4.5 });
  beams.push({ nodeA: 16, nodeB: 14, type: 'latch', spring: DEFAULT_K_LATCH * 0.6, damp: DEFAULT_C_LATCH, yieldDist: 0.25, breakDist: 4.5 });

  // Main cradle frame
  addBeamChain(beams, [
    [16, 17], [17, 18], [18, 19], [19, 8], [18, 8]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 1.3, DEFAULT_C_CHASSIS, 0.65, 20.0);

  return beams;
}

export const PRESET_MOTORCYCLE: VehicleNodeBeamDefinition = {
  presetId: 'motorcycle_cradle',
  name: 'Solo Motorcycle (Duplex Cradle Frame & Telescopic Fork)',
  perimeterCount: 16,
  nodes: MOTORCYCLE_NODES,
  beams: buildMotorcycleBeams(),
  springScale: 0.78,
  dampScale: 0.85,
  yieldScale: 0.70,
  breakScale: 0.75,
  chassisStiffness: 0.85,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [11, 12],
    rightNodeIds: [4, 5],
    subframeLeftFL: 15,
    subframeRightFR: 1,
    subframeLeftRL: 8,
    subframeRightRR: 8,
    engineNodeId: 17,
    chassisCoreNodeId: 18
  }
};

// ============================================================================
// 6. AGRICULTURAL DRAWBAR TRAILER PRESET (A-Frame Tongue & Clean Non-Self-Intersecting Perimeter)
// ============================================================================
const TRAILER_NODES: NodeTemplate[] = [
  // Perimeter (0..15) — clean symmetric clockwise outline around drawbar tongue & body
  { id: 0, xFrac: 0.50, yFrac: 0.00, group: 'bumper', massFrac: 0.040, name: 'Hitch Lunette Eye' },
  { id: 1, xFrac: 0.39, yFrac: 0.16, group: 'hood', massFrac: 0.030, name: 'Drawbar A-Frame Right' },
  { id: 2, xFrac: 0.30, yFrac: 0.44, group: 'bumper', massFrac: 0.035, name: 'Front-Right Body Shoulder' },
  { id: 3, xFrac: 0.12, yFrac: 0.48, group: 'fender', massFrac: 0.035, name: 'Mid-Front Right Flank' },
  { id: 4, xFrac: -0.10, yFrac: 0.48, group: 'door', massFrac: 0.035, name: 'Axle Mudguard Right' },
  { id: 5, xFrac: -0.30, yFrac: 0.48, group: 'quarter', massFrac: 0.035, name: 'Rear-Mid Right Flank' },
  { id: 6, xFrac: -0.46, yFrac: 0.46, group: 'quarter', massFrac: 0.030, name: 'Rear-Right Corner' },
  { id: 7, xFrac: -0.50, yFrac: 0.32, group: 'bumper', massFrac: 0.025, name: 'Rear Underride Bar Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.00, group: 'bumper', massFrac: 0.035, name: 'Rear Bumper Center' },
  { id: 9, xFrac: -0.50, yFrac: -0.32, group: 'bumper', massFrac: 0.025, name: 'Rear Underride Bar Left' },
  { id: 10, xFrac: -0.46, yFrac: -0.46, group: 'quarter', massFrac: 0.030, name: 'Rear-Left Corner' },
  { id: 11, xFrac: -0.30, yFrac: -0.48, group: 'quarter', massFrac: 0.035, name: 'Rear-Mid Left Flank' },
  { id: 12, xFrac: -0.10, yFrac: -0.48, group: 'door', massFrac: 0.035, name: 'Axle Mudguard Left' },
  { id: 13, xFrac: 0.12, yFrac: -0.48, group: 'fender', massFrac: 0.035, name: 'Mid-Front Left Flank' },
  { id: 14, xFrac: 0.30, yFrac: -0.44, group: 'bumper', massFrac: 0.035, name: 'Front-Left Body Shoulder' },
  { id: 15, xFrac: 0.39, yFrac: -0.16, group: 'hood', massFrac: 0.030, name: 'Drawbar A-Frame Left' },

  // Longitudinal I-Beam Rails & Suspension (16..21, 6 nodes)
  { id: 16, xFrac: 0.18, yFrac: -0.24, group: 'subframe', massFrac: 0.055, name: 'Main I-Beam Left Front' },
  { id: 17, xFrac: 0.18, yFrac: 0.24, group: 'subframe', massFrac: 0.055, name: 'Main I-Beam Right Front' },
  { id: 18, xFrac: -0.18, yFrac: -0.24, group: 'subframe', massFrac: 0.065, name: 'Axle Hanger Left' },
  { id: 19, xFrac: -0.18, yFrac: 0.24, group: 'subframe', massFrac: 0.065, name: 'Axle Hanger Right' },
  { id: 20, xFrac: -0.04, yFrac: 0.00, group: 'chassis_core', massFrac: 0.180, isFixed: true, name: 'Trailer Deck Spine Core' },
  { id: 21, xFrac: -0.44, yFrac: 0.00, group: 'subframe', massFrac: 0.040, name: 'Rear Cross Sill' }
];

function buildTrailerBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.55, 0.50, 22.0, 1.6);

  // Drawbar A-frame cross-bracing
  addBeamChain(beams, [
    [0, 16], [0, 17], [1, 15], [1, 17], [15, 16], [2, 17], [14, 16]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 2.2, DEFAULT_C_CHASSIS * 1.5, 0.9, 35.0);

  // Longitudinal I-beams
  addBeamChain(beams, [
    [14, 16], [16, 18], [18, 10],
    [2, 17], [17, 19], [19, 6],
    [12, 18], [4, 19], [13, 16], [3, 17]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 2.2, DEFAULT_C_CHASSIS * 1.5, 1.0, 36.0);

  // Deck crossmembers
  addBeamChain(beams, [
    [16, 17], [18, 19], [16, 20], [17, 20], [18, 20], [19, 20], [20, 21], [21, 8], [21, 7], [21, 9]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 1.8, DEFAULT_C_CHASSIS, 0.85, 30.0);

  return beams;
}

export const PRESET_TRAILER: VehicleNodeBeamDefinition = {
  presetId: 'trailer_chassis',
  name: 'Agricultural Drawbar Trailer (A-Frame Tongue & Steel Frame)',
  perimeterCount: 16,
  nodes: TRAILER_NODES,
  beams: buildTrailerBeams(),
  springScale: 2.8,
  dampScale: 2.0,
  yieldScale: 2.5,
  breakScale: 2.2,
  chassisStiffness: 3.0,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [11, 12, 13],
    rightNodeIds: [3, 4, 5],
    subframeLeftFL: 16,
    subframeRightFR: 17,
    subframeLeftRL: 18,
    subframeRightRR: 19,
    engineNodeId: 20,
    chassisCoreNodeId: 20
  }
};

// ============================================================================
// 7. HEAVY SEMI-TRAILER PRESET (Full-Width Rectangular Bulkhead, Kingpin & Tri-Axle Bogie)
// ============================================================================
const SEMI_TRAILER_NODES: NodeTemplate[] = [
  // Perimeter (0..15) — full-width rectangular semi-trailer footprint
  { id: 0, xFrac: 0.49, yFrac: 0.00, group: 'bumper', massFrac: 0.035, name: 'Front Bulkhead Center' },
  { id: 1, xFrac: 0.48, yFrac: 0.46, group: 'bumper', massFrac: 0.035, name: 'Front-Right Bulkhead Corner' },
  { id: 2, xFrac: 0.28, yFrac: 0.48, group: 'fender', massFrac: 0.035, name: 'Right Flank Landing Gear' },
  { id: 3, xFrac: 0.04, yFrac: 0.48, group: 'door', massFrac: 0.035, name: 'Right Mid Deck Rail' },
  { id: 4, xFrac: -0.20, yFrac: 0.48, group: 'quarter', massFrac: 0.035, name: 'Right Tri-Axle Front' },
  { id: 5, xFrac: -0.38, yFrac: 0.48, group: 'quarter', massFrac: 0.035, name: 'Right Tri-Axle Rear' },
  { id: 6, xFrac: -0.48, yFrac: 0.46, group: 'quarter', massFrac: 0.030, name: 'Rear-Right Corner' },
  { id: 7, xFrac: -0.50, yFrac: 0.34, group: 'bumper', massFrac: 0.025, name: 'Rear ECE Bumper Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.00, group: 'bumper', massFrac: 0.035, name: 'Rear Bumper Center' },
  { id: 9, xFrac: -0.50, yFrac: -0.34, group: 'bumper', massFrac: 0.025, name: 'Rear ECE Bumper Left' },
  { id: 10, xFrac: -0.48, yFrac: -0.46, group: 'quarter', massFrac: 0.030, name: 'Rear-Left Corner' },
  { id: 11, xFrac: -0.38, yFrac: -0.48, group: 'quarter', massFrac: 0.035, name: 'Left Tri-Axle Rear' },
  { id: 12, xFrac: -0.20, yFrac: -0.48, group: 'quarter', massFrac: 0.035, name: 'Left Tri-Axle Front' },
  { id: 13, xFrac: 0.04, yFrac: -0.48, group: 'door', massFrac: 0.035, name: 'Left Mid Deck Rail' },
  { id: 14, xFrac: 0.28, yFrac: -0.48, group: 'fender', massFrac: 0.035, name: 'Left Flank Landing Gear' },
  { id: 15, xFrac: 0.48, yFrac: -0.46, group: 'bumper', massFrac: 0.035, name: 'Front-Left Bulkhead Corner' },

  // Heavy I-Beam Ladder Frame & Tri-Axle Bogie Core (16..23, 8 nodes)
  { id: 16, xFrac: 0.36, yFrac: 0.00, group: 'subframe', massFrac: 0.060, name: 'Fifth-Wheel Kingpin Plate' },
  { id: 17, xFrac: 0.24, yFrac: -0.24, group: 'subframe', massFrac: 0.055, name: 'Main I-Beam Left Front' },
  { id: 18, xFrac: 0.24, yFrac: 0.24, group: 'subframe', massFrac: 0.055, name: 'Main I-Beam Right Front' },
  { id: 19, xFrac: -0.02, yFrac: 0.00, group: 'chassis_core', massFrac: 0.140, isFixed: true, name: 'Semi-Trailer Spine Core' },
  { id: 20, xFrac: -0.28, yFrac: -0.24, group: 'subframe', massFrac: 0.065, name: 'Tri-Axle Bogie Left' },
  { id: 21, xFrac: -0.28, yFrac: 0.24, group: 'subframe', massFrac: 0.065, name: 'Tri-Axle Bogie Right' },
  { id: 22, xFrac: -0.44, yFrac: 0.00, group: 'subframe', massFrac: 0.040, name: 'Rear Sill Crossmember' }
];

function buildSemiTrailerBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.60, 0.55, 24.0, 1.8);

  // Front kingpin apron & gooseneck reinforcement
  addBeamChain(beams, [
    [0, 16], [1, 16], [15, 16], [16, 17], [16, 18], [15, 17], [1, 18]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 2.4, DEFAULT_C_CHASSIS * 1.5, 1.0, 38.0);

  // Twin longitudinal heavy I-beams
  addBeamChain(beams, [
    [17, 20], [20, 10], [18, 21], [21, 6],
    [14, 17], [2, 18], [13, 19], [3, 19], [12, 20], [4, 21], [11, 20], [5, 21]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 2.4, DEFAULT_C_CHASSIS * 1.5, 1.0, 38.0);

  // Crossmembers & spine bracing
  addBeamChain(beams, [
    [17, 18], [20, 21], [17, 19], [18, 19], [20, 19], [21, 19], [20, 22], [21, 22], [22, 8], [22, 7], [22, 9]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 2.0, DEFAULT_C_CHASSIS, 0.9, 34.0);

  return beams;
}

export const PRESET_SEMI_TRAILER: VehicleNodeBeamDefinition = {
  presetId: 'semi_trailer_chassis',
  name: 'Heavy Semi-Trailer (Full-Width Rectangular Bulkhead, Kingpin & Tri-Axle Bogie)',
  perimeterCount: 16,
  nodes: SEMI_TRAILER_NODES,
  beams: buildSemiTrailerBeams(),
  springScale: 3.0,
  dampScale: 2.1,
  yieldScale: 2.6,
  breakScale: 2.4,
  chassisStiffness: 3.2,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 14],
    rightNodeIds: [2, 3, 4],
    subframeLeftFL: 17,
    subframeRightFR: 18,
    subframeLeftRL: 20,
    subframeRightRR: 21,
    engineNodeId: 19,
    chassisCoreNodeId: 19
  }
};

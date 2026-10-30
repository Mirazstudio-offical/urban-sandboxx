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
// 4. URAL MOTORCYCLE WITH SIDECAR PRESET (Asymmetric 2-Track Chassis)
// ============================================================================
const MOTO_SIDECAR_NODES: NodeTemplate[] = [
  // Perimeter (0..15) - exactly matching getVehicleBasePolygonRaw moto_ural_sidecar
  { id: 0, xFrac: 0.50, yFrac: -0.22, group: 'bumper', massFrac: 0.08, name: 'Front Motorcycle Tire' },
  { id: 1, xFrac: 0.20, yFrac: -0.42, group: 'fender', massFrac: 0.03, name: 'Handlebar Left Grip' },
  { id: 2, xFrac: 0.18, yFrac: 0.42, group: 'fender', massFrac: 0.06, name: 'Sidecar Front Torpedo Bow' },
  { id: 3, xFrac: 0.00, yFrac: 0.49, group: 'door', massFrac: 0.06, name: 'Sidecar Body Flank Right' },
  { id: 4, xFrac: -0.18, yFrac: 0.49, group: 'quarter', massFrac: 0.08, name: 'Sidecar Wheel Fender Arch' },
  { id: 5, xFrac: -0.32, yFrac: 0.38, group: 'quarter', massFrac: 0.04, name: 'Sidecar Rear Trunk Corner' },
  { id: 6, xFrac: -0.40, yFrac: 0.20, group: 'quarter', massFrac: 0.04, name: 'Sidecar Inboard Flange' },
  { id: 7, xFrac: -0.48, yFrac: -0.12, group: 'bumper', massFrac: 0.04, name: 'Rear Motorcycle Fender Right' },
  { id: 8, xFrac: -0.50, yFrac: -0.22, group: 'bumper', massFrac: 0.09, name: 'Rear Motorcycle Tire / Final Drive' },
  { id: 9, xFrac: -0.48, yFrac: -0.32, group: 'bumper', massFrac: 0.04, name: 'Rear Motorcycle Fender Left' },
  { id: 10, xFrac: -0.20, yFrac: -0.32, group: 'quarter', massFrac: 0.05, name: 'Saddle & Battery Left' },
  { id: 11, xFrac: -0.05, yFrac: -0.30, group: 'engine', massFrac: 0.08, name: 'Boxer Engine Left Cylinder Head' },
  { id: 12, xFrac: 0.00, yFrac: -0.32, group: 'hood', massFrac: 0.05, name: 'Teardrop Tank Left' },
  { id: 13, xFrac: 0.08, yFrac: -0.32, group: 'fender', massFrac: 0.04, name: 'Front Cradle Tube Left' },
  { id: 14, xFrac: 0.22, yFrac: -0.35, group: 'fender', massFrac: 0.04, name: 'Telescopic Fork Left' },
  { id: 15, xFrac: 0.35, yFrac: -0.28, group: 'bumper', massFrac: 0.05, name: 'Front Mudguard Left' },

  // Internal Hardpoints (16..20, 5 nodes)
  { id: 16, xFrac: 0.22, yFrac: -0.22, group: 'chassis_core', massFrac: 0.06, name: 'Steering Headstock' },
  { id: 17, xFrac: -0.05, yFrac: -0.22, group: 'engine', massFrac: 0.20, name: 'Ural 650cc Boxer Twin Crankcase' },
  { id: 18, xFrac: -0.15, yFrac: -0.22, group: 'chassis_core', massFrac: 0.08, isFixed: true, name: 'Motorcycle Swingarm Pivot' },
  { id: 19, xFrac: -0.10, yFrac: 0.05, group: 'subframe', massFrac: 0.08, name: 'Tubular Sidecar Connecting Strut' },
  { id: 20, xFrac: -0.18, yFrac: 0.42, group: 'subframe', massFrac: 0.07, name: 'Sidecar Wheel Hub' }
];

function buildMotoSidecarBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.40, 0.45, 15.0, 0.9);

  // Motorcycle spine
  addBeamChain(beams, [
    [0, 16], [16, 17], [17, 18], [18, 8]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 1.3, DEFAULT_C_CHASSIS, 0.65, 20.0);

  // Rigid cross-struts connecting motorcycle to sidecar frame
  addBeamChain(beams, [
    [17, 19], [19, 3], [19, 20], [18, 19], [18, 6], [20, 4]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 1.4, DEFAULT_C_CHASSIS, 0.70, 22.0);

  beams.push({ nodeA: 16, nodeB: 1, type: 'latch', spring: DEFAULT_K_LATCH * 0.6, damp: DEFAULT_C_LATCH, yieldDist: 0.25, breakDist: 4.5 });

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
    frontNodeIds: [0, 15],
    rearNodeIds: [8, 5],
    leftNodeIds: [10, 11],
    rightNodeIds: [3, 4],
    subframeLeftFL: 16,
    subframeRightFR: 2,
    subframeLeftRL: 8,
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
  { id: 1, xFrac: 0.38, yFrac: 0.11, group: 'bumper', massFrac: 0.05, name: 'Fork Slider Right' },
  { id: 2, xFrac: 0.22, yFrac: 0.48, group: 'fender', massFrac: 0.02, name: 'Handlebar Right Throttle' },
  { id: 3, xFrac: 0.10, yFrac: 0.26, group: 'hood', massFrac: 0.05, name: 'Teardrop Tank Right' },
  { id: 4, xFrac: 0.00, yFrac: 0.19, group: 'engine', massFrac: 0.06, name: 'Engine Cylinder Fin Right' },
  { id: 5, xFrac: -0.12, yFrac: 0.17, group: 'door', massFrac: 0.05, name: 'Saddle Right Flank' },
  { id: 6, xFrac: -0.30, yFrac: 0.14, group: 'quarter', massFrac: 0.04, name: 'Exhaust Muffler Right' },
  { id: 7, xFrac: -0.48, yFrac: 0.09, group: 'quarter', massFrac: 0.03, name: 'Rear Fender Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.09, name: 'Rear Wheel Axle / Chain Sprocket' },
  { id: 9, xFrac: -0.48, yFrac: -0.09, group: 'quarter', massFrac: 0.03, name: 'Rear Fender Left' },
  { id: 10, xFrac: -0.30, yFrac: -0.14, group: 'quarter', massFrac: 0.04, name: 'Exhaust Muffler Left' },
  { id: 11, xFrac: -0.12, yFrac: -0.17, group: 'door', massFrac: 0.05, name: 'Saddle Left Flank' },
  { id: 12, xFrac: 0.00, yFrac: -0.19, group: 'engine', massFrac: 0.06, name: 'Engine Cylinder Fin Left' },
  { id: 13, xFrac: 0.10, yFrac: -0.26, group: 'hood', massFrac: 0.05, name: 'Teardrop Tank Left' },
  { id: 14, xFrac: 0.22, yFrac: -0.48, group: 'fender', massFrac: 0.02, name: 'Handlebar Left Clutch' },
  { id: 15, xFrac: 0.38, yFrac: -0.11, group: 'bumper', massFrac: 0.05, name: 'Fork Slider Left' },

  // Core (16..19, 4 nodes)
  { id: 16, xFrac: 0.24, yFrac: 0.0, group: 'chassis_core', massFrac: 0.07, name: 'Triple Clamp / Headstock' },
  { id: 17, xFrac: 0.00, yFrac: 0.0, group: 'engine', massFrac: 0.26, name: 'Engine Crankcase & Cylinders' },
  { id: 18, xFrac: -0.10, yFrac: 0.0, group: 'subframe', massFrac: 0.08, isFixed: true, name: 'Swingarm Pivot Pin' },
  { id: 19, xFrac: -0.25, yFrac: 0.0, group: 'roof', massFrac: 0.06, name: 'Seat Subframe / Shock Mount' }
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
// 6. HEAVY FLATBED & TANKER TRAILER PRESET (A-Frame Tongue & I-Beam Rails)
// ============================================================================
const TRAILER_NODES: NodeTemplate[] = [
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.040, name: 'Hitch Coupler / Kingpin' },
  { id: 1, xFrac: 0.40, yFrac: 0.48, group: 'bumper', massFrac: 0.030, name: 'Front-Right Platform Corner' },
  { id: 2, xFrac: 0.20, yFrac: 0.48, group: 'fender', massFrac: 0.035, name: 'Right Side Board 1' },
  { id: 3, xFrac: 0.00, yFrac: 0.48, group: 'door', massFrac: 0.035, name: 'Right Side Board 2' },
  { id: 4, xFrac: -0.20, yFrac: 0.48, group: 'quarter', massFrac: 0.035, name: 'Tandem Axle Mudguard Right' },
  { id: 5, xFrac: -0.47, yFrac: 0.48, group: 'quarter', massFrac: 0.030, name: 'Rear-Right Platform Corner' },
  { id: 6, xFrac: -0.50, yFrac: 0.40, group: 'bumper', massFrac: 0.025, name: 'Rear Underride Bar Right' },
  { id: 7, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.035, name: 'Rear Tailgate / Tow Hitch Center' },
  { id: 8, xFrac: -0.50, yFrac: -0.40, group: 'bumper', massFrac: 0.025, name: 'Rear Underride Bar Left' },
  { id: 9, xFrac: -0.47, yFrac: -0.48, group: 'quarter', massFrac: 0.030, name: 'Rear-Left Platform Corner' },
  { id: 10, xFrac: -0.20, yFrac: -0.48, group: 'quarter', massFrac: 0.035, name: 'Tandem Axle Mudguard Left' },
  { id: 11, xFrac: 0.00, yFrac: -0.48, group: 'door', massFrac: 0.035, name: 'Left Side Board 2' },
  { id: 12, xFrac: 0.20, yFrac: -0.48, group: 'fender', massFrac: 0.035, name: 'Left Side Board 1' },
  { id: 13, xFrac: 0.40, yFrac: -0.48, group: 'bumper', massFrac: 0.030, name: 'Front-Left Platform Corner' },
  { id: 14, xFrac: 0.40, yFrac: 0.0, group: 'hood', massFrac: 0.035, name: 'A-Frame Crossmember' },
  { id: 15, xFrac: 0.45, yFrac: 0.0, group: 'hood', massFrac: 0.030, name: 'Drawbar Tongue Spine' },

  // Longitudinal I-Beam Rails & Suspension (16..21, 6 nodes)
  { id: 16, xFrac: 0.15, yFrac: -0.26, group: 'subframe', massFrac: 0.055, name: 'Main I-Beam Left Front' },
  { id: 17, xFrac: 0.15, yFrac: 0.26, group: 'subframe', massFrac: 0.055, name: 'Main I-Beam Right Front' },
  { id: 18, xFrac: -0.20, yFrac: -0.26, group: 'subframe', massFrac: 0.065, name: 'Tandem Leaf Hanger Left' },
  { id: 19, xFrac: -0.20, yFrac: 0.26, group: 'subframe', massFrac: 0.065, name: 'Tandem Leaf Hanger Right' },
  { id: 20, xFrac: -0.05, yFrac: 0.0, group: 'chassis_core', massFrac: 0.180, isFixed: true, name: 'Trailer Deck Spine Core' },
  { id: 21, xFrac: -0.46, yFrac: 0.0, group: 'subframe', massFrac: 0.040, name: 'Rear Cross Sill' }
];

function buildTrailerBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = [];

  // A-frame drawbar
  addBeamChain(beams, [
    [0, 15], [15, 14], [0, 1], [0, 13], [14, 1], [14, 13]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 2.2, DEFAULT_C_CHASSIS * 1.5, 0.9, 35.0);

  // Platform perimeter (1..13)
  for (let i = 1; i < 13; i++) {
    beams.push({
      nodeA: i,
      nodeB: i + 1,
      type: 'structural',
      spring: DEFAULT_K_STRUCTURAL * 1.6,
      damp: DEFAULT_C_STRUCTURAL * 1.4,
      yieldDist: 0.55,
      breakDist: 22.0
    });
  }
  beams.push({ nodeA: 13, nodeB: 1, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 1.6, damp: DEFAULT_C_STRUCTURAL * 1.4, yieldDist: 0.55, breakDist: 22.0 });

  // I-beams
  addBeamChain(beams, [
    [13, 16], [16, 18], [18, 9],
    [1, 17], [17, 19], [19, 5]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 2.2, DEFAULT_C_CHASSIS * 1.5, 1.0, 36.0);

  // Deck crossmembers
  addBeamChain(beams, [
    [16, 17], [18, 19], [16, 20], [17, 20], [18, 20], [19, 20], [20, 21], [21, 7]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 1.8, DEFAULT_C_CHASSIS, 0.85, 30.0);

  return beams;
}

export const PRESET_TRAILER: VehicleNodeBeamDefinition = {
  presetId: 'trailer_chassis',
  name: 'Heavy Flatbed / Tanker Trailer (I-Beam Chassis & A-Frame Drawbar)',
  perimeterCount: 16,
  nodes: TRAILER_NODES,
  beams: buildTrailerBeams(),
  springScale: 2.8,
  dampScale: 2.0,
  yieldScale: 2.5,
  breakScale: 2.2,
  chassisStiffness: 3.0,
  tracking: {
    frontNodeIds: [0, 1, 13],
    rearNodeIds: [5, 6, 7],
    leftNodeIds: [9, 10, 11],
    rightNodeIds: [2, 3, 4],
    subframeLeftFL: 16,
    subframeRightFR: 17,
    subframeLeftRL: 18,
    subframeRightRR: 19,
    engineNodeId: 20,
    chassisCoreNodeId: 20
  }
};

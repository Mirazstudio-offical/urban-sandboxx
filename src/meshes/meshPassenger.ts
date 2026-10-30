import { NodeTemplate, BeamTemplate, VehicleNodeBeamDefinition } from '../types';
import {
  DEFAULT_K_STRUCTURAL,
  DEFAULT_C_STRUCTURAL,
  DEFAULT_K_CHASSIS,
  DEFAULT_C_CHASSIS,
  DEFAULT_K_CROSS,
  DEFAULT_C_CROSS,
  DEFAULT_K_SUPPORT,
  DEFAULT_C_SUPPORT,
  DEFAULT_K_LATCH,
  DEFAULT_C_LATCH,
  createPerimeterBeams,
  addBeamChain
} from './meshCommon';

// ============================================================================
// 1. STANDARD SEDAN / SALOON (3-Box Notchback Unibody)
// ============================================================================
const SEDAN_NODES: NodeTemplate[] = [
  // Outer perimeter (0..15) - exactly matching getVehicleBasePolygonRaw isSedan
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.024, name: 'Front Bumper Center' },
  { id: 1, xFrac: 0.48, yFrac: 0.39, group: 'bumper', massFrac: 0.020, name: 'Front-Right Bumper Corner' },
  { id: 2, xFrac: 0.45, yFrac: 0.50, group: 'fender', massFrac: 0.022, name: 'Front-Right Fender Arch' },
  { id: 3, xFrac: 0.22, yFrac: 0.50, group: 'door', massFrac: 0.024, name: 'Front-Right Door Sill' },
  { id: 4, xFrac: 0.00, yFrac: 0.50, group: 'pillar', massFrac: 0.026, name: 'Right B-Pillar Sill' },
  { id: 5, xFrac: -0.22, yFrac: 0.50, group: 'door', massFrac: 0.024, name: 'Rear-Right Door Sill' },
  { id: 6, xFrac: -0.44, yFrac: 0.47, group: 'quarter', massFrac: 0.024, name: 'Rear-Right Quarter' },
  { id: 7, xFrac: -0.49, yFrac: 0.31, group: 'bumper', massFrac: 0.018, name: 'Rear-Right Bumper Corner' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.022, name: 'Rear Bumper Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.31, group: 'bumper', massFrac: 0.018, name: 'Rear-Left Bumper Corner' },
  { id: 10, xFrac: -0.44, yFrac: -0.47, group: 'quarter', massFrac: 0.024, name: 'Rear-Left Quarter' },
  { id: 11, xFrac: -0.22, yFrac: -0.50, group: 'door', massFrac: 0.024, name: 'Rear-Left Door Sill' },
  { id: 12, xFrac: 0.00, yFrac: -0.50, group: 'pillar', massFrac: 0.026, name: 'Left B-Pillar Sill' },
  { id: 13, xFrac: 0.22, yFrac: -0.50, group: 'door', massFrac: 0.024, name: 'Front-Left Door Sill' },
  { id: 14, xFrac: 0.45, yFrac: -0.50, group: 'fender', massFrac: 0.022, name: 'Front-Left Fender Arch' },
  { id: 15, xFrac: 0.48, yFrac: -0.39, group: 'bumper', massFrac: 0.020, name: 'Front-Left Bumper Corner' },

  // Greenhouse & Upper Body (16..23)
  { id: 16, xFrac: 0.21, yFrac: 0.0, group: 'hood', massFrac: 0.028, name: 'Hood Center' },
  { id: 17, xFrac: 0.12, yFrac: 0.0, group: 'windshield', massFrac: 0.030, name: 'Windshield Cowl Seam' },
  { id: 18, xFrac: -0.02, yFrac: 0.0, group: 'roof', massFrac: 0.035, name: 'Roof Apex' },
  { id: 19, xFrac: 0.07, yFrac: -0.21, group: 'roof', massFrac: 0.022, name: 'Roof Front-Left Corner' },
  { id: 20, xFrac: 0.07, yFrac: 0.21, group: 'roof', massFrac: 0.022, name: 'Roof Front-Right Corner' },
  { id: 21, xFrac: -0.11, yFrac: -0.21, group: 'roof', massFrac: 0.022, name: 'Roof Rear-Left Corner' },
  { id: 22, xFrac: -0.11, yFrac: 0.21, group: 'roof', massFrac: 0.022, name: 'Roof Rear-Right Corner' },
  { id: 23, xFrac: -0.28, yFrac: 0.0, group: 'trunk', massFrac: 0.026, name: 'Trunk Deck Shelf' },

  // Subframe & Powertrain Core (24..29)
  { id: 24, xFrac: 0.25, yFrac: 0.0, group: 'engine', massFrac: 0.200, name: 'Front Transverse Engine Block' },
  { id: 25, xFrac: 0.22, yFrac: -0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Left Strut Tower' },
  { id: 26, xFrac: 0.22, yFrac: 0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Right Strut Tower' },
  { id: 27, xFrac: -0.25, yFrac: -0.28, group: 'subframe', massFrac: 0.055, name: 'Rear-Left Axle Carrier' },
  { id: 28, xFrac: -0.25, yFrac: 0.28, group: 'subframe', massFrac: 0.055, name: 'Rear-Right Axle Carrier' },
  { id: 29, xFrac: -0.02, yFrac: 0.0, group: 'chassis_core', massFrac: 0.160, isFixed: true, name: 'Cabin Floor Tunnel' }
];

function buildSedanBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.35, 0.50, 18.0);

  // Diagonal shear braces
  const crosses: [number, number][] = [
    [0, 25], [0, 26], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [8, 27], [8, 28]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS, DEFAULT_C_CROSS, 0.45, 16.0);

  // Longitudinal chassis rails
  const leftRail: [number, number][] = [[15, 25], [25, 14], [25, 17], [17, 12], [12, 27], [27, 10], [27, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS, DEFAULT_C_CHASSIS, 0.70, 26.0);

  const rightRail: [number, number][] = [[1, 26], [26, 2], [26, 17], [17, 4], [4, 28], [28, 6], [28, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS, DEFAULT_C_CHASSIS, 0.70, 26.0);

  const centerRail: [number, number][] = [[0, 24], [24, 17], [17, 29], [29, 23], [23, 8]];
  addBeamChain(beams, centerRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.1, DEFAULT_C_CHASSIS * 1.1, 0.80, 28.0);

  // Subframe crossmembers
  addBeamChain(beams, [[25, 26], [27, 28]], 'chassis_rail', DEFAULT_K_CHASSIS, DEFAULT_C_CHASSIS, 0.60, 22.0);
  addBeamChain(beams, [[24, 25], [24, 26]], 'chassis_rail', DEFAULT_K_CHASSIS * 0.9, DEFAULT_C_CHASSIS, 0.50, 18.0);
  addBeamChain(beams, [[12, 29], [4, 29]], 'chassis_rail', DEFAULT_K_CHASSIS, DEFAULT_C_CHASSIS, 0.65, 24.0);

  // Roof & greenhouse cage
  const roofCage: [number, number][] = [
    [17, 19], [17, 20], [14, 19], [2, 20],
    [19, 20], [20, 22], [22, 21], [21, 19],
    [18, 19], [18, 20], [18, 21], [18, 22],
    [12, 19], [4, 20], [12, 21], [4, 22],
    [21, 23], [22, 23], [10, 21], [6, 22]
  ];
  addBeamChain(beams, roofCage, 'structural', DEFAULT_K_STRUCTURAL * 1.1, DEFAULT_C_STRUCTURAL, 0.48, 18.0);

  // Panel latches (breakable)
  beams.push({ nodeA: 15, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 1, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 0, nodeB: 16, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.5, partTag: 'hood' });
  beams.push({ nodeA: 16, nodeB: 17, type: 'latch', spring: DEFAULT_K_LATCH * 0.95, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.5, partTag: 'hood' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.0, partTag: 'trunk' });
  beams.push({ nodeA: 9, nodeB: 27, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'rear_bumper' });
  beams.push({ nodeA: 7, nodeB: 28, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'rear_bumper' });

  // Anti-collapse compression supports
  beams.push({ nodeA: 3, nodeB: 13, type: 'support', spring: DEFAULT_K_SUPPORT, damp: DEFAULT_C_SUPPORT, yieldDist: 0.8, breakDist: 40.0 });
  beams.push({ nodeA: 5, nodeB: 11, type: 'support', spring: DEFAULT_K_SUPPORT, damp: DEFAULT_C_SUPPORT, yieldDist: 0.8, breakDist: 40.0 });
  beams.push({ nodeA: 0, nodeB: 17, type: 'support', spring: DEFAULT_K_SUPPORT * 1.2, damp: DEFAULT_C_SUPPORT, yieldDist: 0.9, breakDist: 45.0 });
  beams.push({ nodeA: 24, nodeB: 29, type: 'support', spring: DEFAULT_K_SUPPORT * 1.5, damp: DEFAULT_C_SUPPORT, yieldDist: 1.0, breakDist: 50.0 });

  return beams;
}

export const PRESET_SEDAN: VehicleNodeBeamDefinition = {
  presetId: 'sedan_standard',
  name: 'Standard Sedan (3-Box Notchback Unibody)',
  perimeterCount: 16,
  nodes: SEDAN_NODES,
  beams: buildSedanBeams(),
  springScale: 1.0,
  dampScale: 1.0,
  yieldScale: 1.0,
  breakScale: 1.0,
  chassisStiffness: 1.0,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 11],
    rightNodeIds: [4, 3, 5],
    subframeLeftFL: 25,
    subframeRightFR: 26,
    subframeLeftRL: 27,
    subframeRightRR: 28,
    engineNodeId: 24,
    chassisCoreNodeId: 29
  }
};

// ============================================================================
// 2. STATION WAGON / ESTATE PRESET (2-Box Full Estate Unibody)
// ============================================================================
// Long roof reaching D-pillar, square rear tailgate, roof rails, rear luggage bay
const WAGON_NODES: NodeTemplate[] = [
  // Outer perimeter (0..15) - exactly matching getVehicleBasePolygonRaw isWagon
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.024, name: 'Front Bumper Center' },
  { id: 1, xFrac: 0.48, yFrac: 0.39, group: 'bumper', massFrac: 0.020, name: 'Front-Right Bumper Corner' },
  { id: 2, xFrac: 0.45, yFrac: 0.50, group: 'fender', massFrac: 0.022, name: 'Front-Right Fender Arch' },
  { id: 3, xFrac: 0.22, yFrac: 0.50, group: 'door', massFrac: 0.024, name: 'Front-Right Door Sill' },
  { id: 4, xFrac: 0.00, yFrac: 0.50, group: 'pillar', massFrac: 0.026, name: 'Right B-Pillar Sill' },
  { id: 5, xFrac: -0.25, yFrac: 0.50, group: 'door', massFrac: 0.024, name: 'Rear-Right Door / C-Pillar' },
  { id: 6, xFrac: -0.46, yFrac: 0.49, group: 'quarter', massFrac: 0.026, name: 'Estate D-Pillar Right' },
  { id: 7, xFrac: -0.49, yFrac: 0.34, group: 'bumper', massFrac: 0.020, name: 'Tailgate Bumper Corner Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.024, name: 'Tailgate Bumper Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.34, group: 'bumper', massFrac: 0.020, name: 'Tailgate Bumper Corner Left' },
  { id: 10, xFrac: -0.46, yFrac: -0.49, group: 'quarter', massFrac: 0.026, name: 'Estate D-Pillar Left' },
  { id: 11, xFrac: -0.25, yFrac: -0.50, group: 'door', massFrac: 0.024, name: 'Rear-Left Door / C-Pillar' },
  { id: 12, xFrac: 0.00, yFrac: -0.50, group: 'pillar', massFrac: 0.026, name: 'Left B-Pillar Sill' },
  { id: 13, xFrac: 0.22, yFrac: -0.50, group: 'door', massFrac: 0.024, name: 'Front-Left Door Sill' },
  { id: 14, xFrac: 0.45, yFrac: -0.50, group: 'fender', massFrac: 0.022, name: 'Front-Left Fender Arch' },
  { id: 15, xFrac: 0.48, yFrac: -0.39, group: 'bumper', massFrac: 0.020, name: 'Front-Left Bumper Corner' },

  // Extended Full Estate Greenhouse & Roof (16..25, 10 nodes)
  { id: 16, xFrac: 0.22, yFrac: 0.0, group: 'hood', massFrac: 0.028, name: 'Hood Ridge Center' },
  { id: 17, xFrac: 0.12, yFrac: 0.0, group: 'windshield', massFrac: 0.030, name: 'Windshield Cowl Seam' },
  { id: 18, xFrac: 0.06, yFrac: -0.21, group: 'roof', massFrac: 0.022, name: 'Roof A-Pillar Left' },
  { id: 19, xFrac: 0.06, yFrac: 0.21, group: 'roof', massFrac: 0.022, name: 'Roof A-Pillar Right' },
  { id: 20, xFrac: -0.04, yFrac: 0.0, group: 'roof', massFrac: 0.032, name: 'Roof Center Rib' },
  { id: 21, xFrac: -0.15, yFrac: -0.21, group: 'roof', massFrac: 0.022, name: 'Roof C-Pillar Left' },
  { id: 22, xFrac: -0.15, yFrac: 0.21, group: 'roof', massFrac: 0.022, name: 'Roof C-Pillar Right' },
  { id: 23, xFrac: -0.38, yFrac: -0.21, group: 'roof', massFrac: 0.024, name: 'Estate D-Pillar Header Left' },
  { id: 24, xFrac: -0.38, yFrac: 0.21, group: 'roof', massFrac: 0.024, name: 'Estate D-Pillar Header Right' },
  { id: 25, xFrac: -0.42, yFrac: 0.0, group: 'trunk', massFrac: 0.028, name: 'Tailgate Upper Header' },

  // Subframe & Powertrain (26..31, 6 nodes)
  { id: 26, xFrac: 0.26, yFrac: 0.0, group: 'engine', massFrac: 0.200, name: 'Station Wagon Engine Block' },
  { id: 27, xFrac: 0.22, yFrac: -0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Left Strut Tower' },
  { id: 28, xFrac: 0.22, yFrac: 0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Right Strut Tower' },
  { id: 29, xFrac: -0.26, yFrac: -0.28, group: 'subframe', massFrac: 0.055, name: 'Rear-Left Axle Carrier' },
  { id: 30, xFrac: -0.26, yFrac: 0.28, group: 'subframe', massFrac: 0.055, name: 'Rear-Right Axle Carrier' },
  { id: 31, xFrac: -0.04, yFrac: 0.0, group: 'chassis_core', massFrac: 0.160, isFixed: true, name: 'Estate Floor Tunnel' }
];

function buildWagonBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.36, 0.50, 18.0);

  // Crosses
  const crosses: [number, number][] = [
    [0, 27], [0, 28], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [8, 29], [8, 30]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS, DEFAULT_C_CROSS, 0.45, 16.0);

  // Rails extending to flat rear tailgate
  const leftRail: [number, number][] = [[15, 27], [27, 14], [27, 17], [17, 12], [12, 29], [29, 10], [10, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS, DEFAULT_C_CHASSIS, 0.70, 26.0);

  const rightRail: [number, number][] = [[1, 28], [28, 2], [28, 17], [17, 4], [4, 30], [30, 6], [6, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS, DEFAULT_C_CHASSIS, 0.70, 26.0);

  const centerRail: [number, number][] = [[0, 26], [26, 17], [17, 31], [31, 25], [25, 8]];
  addBeamChain(beams, centerRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.1, DEFAULT_C_CHASSIS * 1.1, 0.80, 28.0);

  // Subframe mounts
  addBeamChain(beams, [[27, 28], [29, 30]], 'chassis_rail', DEFAULT_K_CHASSIS, DEFAULT_C_CHASSIS, 0.60, 22.0);
  addBeamChain(beams, [[26, 27], [26, 28]], 'chassis_rail', DEFAULT_K_CHASSIS * 0.9, DEFAULT_C_CHASSIS, 0.50, 18.0);
  addBeamChain(beams, [[12, 31], [4, 31]], 'chassis_rail', DEFAULT_K_CHASSIS, DEFAULT_C_CHASSIS, 0.65, 24.0);

  // Full estate roof rails & D-pillar cage
  const roofCage: [number, number][] = [
    [17, 18], [17, 19], [18, 19],
    [18, 21], [19, 22], [21, 23], [22, 24],
    [23, 24], [23, 25], [24, 25],
    [20, 18], [20, 19], [20, 21], [20, 22],
    [10, 23], [6, 24], [12, 21], [4, 22]
  ];
  addBeamChain(beams, roofCage, 'structural', DEFAULT_K_STRUCTURAL * 1.15, DEFAULT_C_STRUCTURAL, 0.48, 18.0);

  // Latches
  beams.push({ nodeA: 15, nodeB: 27, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 1, nodeB: 28, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 0, nodeB: 16, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.5, partTag: 'hood' });
  beams.push({ nodeA: 16, nodeB: 17, type: 'latch', spring: DEFAULT_K_LATCH * 0.95, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.5, partTag: 'hood' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.0, partTag: 'trunk' });
  beams.push({ nodeA: 9, nodeB: 29, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'rear_bumper' });
  beams.push({ nodeA: 7, nodeB: 30, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'rear_bumper' });

  // Supports
  beams.push({ nodeA: 0, nodeB: 17, type: 'support', spring: DEFAULT_K_SUPPORT * 1.2, damp: DEFAULT_C_SUPPORT, yieldDist: 0.9, breakDist: 45.0 });
  beams.push({ nodeA: 26, nodeB: 31, type: 'support', spring: DEFAULT_K_SUPPORT * 1.5, damp: DEFAULT_C_SUPPORT, yieldDist: 1.0, breakDist: 50.0 });
  beams.push({ nodeA: 8, nodeB: 31, type: 'support', spring: DEFAULT_K_SUPPORT * 1.3, damp: DEFAULT_C_SUPPORT, yieldDist: 1.0, breakDist: 45.0 });

  return beams;
}

export const PRESET_WAGON: VehicleNodeBeamDefinition = {
  presetId: 'wagon_estate',
  name: 'Station Wagon / Estate (2-Box Full Estate Unibody)',
  perimeterCount: 16,
  nodes: WAGON_NODES,
  beams: buildWagonBeams(),
  springScale: 1.05,
  dampScale: 1.0,
  yieldScale: 1.0,
  breakScale: 1.0,
  chassisStiffness: 1.08,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 11],
    rightNodeIds: [4, 3, 5],
    subframeLeftFL: 27,
    subframeRightFR: 28,
    subframeLeftRL: 29,
    subframeRightRR: 30,
    engineNodeId: 26,
    chassisCoreNodeId: 31
  }
};

// ============================================================================
// 3. COMPACT HATCHBACK PRESET (2-Box Short Crumple Monocoque)
// ============================================================================
const HATCHBACK_NODES: NodeTemplate[] = [
  // Outer perimeter (0..13) - 14 nodes matching compact 2-box
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.026, name: 'Front Bumper Center' },
  { id: 1, xFrac: 0.47, yFrac: 0.40, group: 'bumper', massFrac: 0.022, name: 'Front-Right Bumper Corner' },
  { id: 2, xFrac: 0.42, yFrac: 0.50, group: 'fender', massFrac: 0.024, name: 'Front-Right Fender' },
  { id: 3, xFrac: 0.15, yFrac: 0.50, group: 'door', massFrac: 0.028, name: 'Right Door Sill' },
  { id: 4, xFrac: -0.15, yFrac: 0.50, group: 'pillar', massFrac: 0.028, name: 'Right B-Pillar Sill' },
  { id: 5, xFrac: -0.42, yFrac: 0.46, group: 'quarter', massFrac: 0.026, name: 'Rear-Right Quarter Corner' },
  { id: 6, xFrac: -0.49, yFrac: 0.28, group: 'bumper', massFrac: 0.020, name: 'Tailgate-Right Bumper Corner' },
  { id: 7, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.024, name: 'Tailgate Bumper Center' },
  { id: 8, xFrac: -0.49, yFrac: -0.28, group: 'bumper', massFrac: 0.020, name: 'Tailgate-Left Bumper Corner' },
  { id: 9, xFrac: -0.42, yFrac: -0.46, group: 'quarter', massFrac: 0.026, name: 'Rear-Left Quarter Corner' },
  { id: 10, xFrac: -0.15, yFrac: -0.50, group: 'pillar', massFrac: 0.028, name: 'Left B-Pillar Sill' },
  { id: 11, xFrac: 0.15, yFrac: -0.50, group: 'door', massFrac: 0.028, name: 'Left Door Sill' },
  { id: 12, xFrac: 0.42, yFrac: -0.50, group: 'fender', massFrac: 0.024, name: 'Front-Left Fender' },
  { id: 13, xFrac: 0.47, yFrac: -0.40, group: 'bumper', massFrac: 0.022, name: 'Front-Left Bumper Corner' },

  // Greenhouse & Tailgate (14..19, 6 nodes)
  { id: 14, xFrac: 0.22, yFrac: 0.0, group: 'hood', massFrac: 0.030, name: 'Short Hood Center' },
  { id: 15, xFrac: 0.14, yFrac: 0.0, group: 'windshield', massFrac: 0.032, name: 'Windshield Cowl' },
  { id: 16, xFrac: -0.06, yFrac: 0.0, group: 'roof', massFrac: 0.036, name: 'Roof Apex' },
  { id: 17, xFrac: 0.06, yFrac: -0.24, group: 'roof', massFrac: 0.024, name: 'Roof Front-Left' },
  { id: 18, xFrac: 0.06, yFrac: 0.24, group: 'roof', massFrac: 0.024, name: 'Roof Front-Right' },
  { id: 19, xFrac: -0.32, yFrac: 0.0, group: 'trunk', massFrac: 0.030, name: 'Hatch Tailgate Header' },

  // Subframe & Engine (20..25, 6 nodes)
  { id: 20, xFrac: 0.26, yFrac: 0.0, group: 'engine', massFrac: 0.210, name: 'Transverse Engine Block' },
  { id: 21, xFrac: 0.24, yFrac: -0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Left MacPherson Strut' },
  { id: 22, xFrac: 0.24, yFrac: 0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Right MacPherson Strut' },
  { id: 23, xFrac: -0.26, yFrac: -0.28, group: 'subframe', massFrac: 0.055, name: 'Torsion Beam Left Mount' },
  { id: 24, xFrac: -0.26, yFrac: 0.28, group: 'subframe', massFrac: 0.055, name: 'Torsion Beam Right Mount' },
  { id: 25, xFrac: -0.05, yFrac: 0.0, group: 'chassis_core', massFrac: 0.170, isFixed: true, name: 'Cabin Center Tunnel' }
];

function buildHatchbackBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(14, 0.32, 0.45, 16.0, 0.95);

  const crosses: [number, number][] = [
    [0, 21], [0, 22], [1, 3], [13, 11],
    [2, 4], [12, 10], [3, 5], [11, 9],
    [4, 6], [10, 8], [7, 23], [7, 24]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 0.95, DEFAULT_C_CROSS, 0.42, 15.0);

  const leftRail: [number, number][] = [[13, 21], [21, 12], [21, 15], [15, 10], [10, 23], [23, 8]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS * 0.9, DEFAULT_C_CHASSIS, 0.65, 22.0);

  const rightRail: [number, number][] = [[1, 22], [22, 2], [22, 15], [15, 4], [4, 24], [24, 6]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS * 0.9, DEFAULT_C_CHASSIS, 0.65, 22.0);

  const centerRail: [number, number][] = [[0, 20], [20, 15], [15, 25], [25, 19], [19, 7]];
  addBeamChain(beams, centerRail, 'chassis_rail', DEFAULT_K_CHASSIS, DEFAULT_C_CHASSIS, 0.70, 24.0);

  addBeamChain(beams, [[21, 22], [20, 21], [20, 22], [23, 24]], 'chassis_rail', DEFAULT_K_CHASSIS * 0.9, DEFAULT_C_CHASSIS, 0.55, 20.0);
  addBeamChain(beams, [[10, 25], [4, 25]], 'chassis_rail', DEFAULT_K_CHASSIS * 0.9, DEFAULT_C_CHASSIS, 0.60, 20.0);

  const roofCage: [number, number][] = [
    [15, 17], [15, 18], [17, 18], [16, 17], [16, 18], [16, 19]
  ];
  addBeamChain(beams, roofCage, 'structural', DEFAULT_K_STRUCTURAL, DEFAULT_C_STRUCTURAL, 0.45, 18.0);

  beams.push({ nodeA: 0, nodeB: 14, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.5, partTag: 'hood' });
  beams.push({ nodeA: 14, nodeB: 15, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 7.0, partTag: 'hood' });
  beams.push({ nodeA: 1, nodeB: 22, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 13, nodeB: 21, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 11, nodeB: 10, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fr' });
  beams.push({ nodeA: 7, nodeB: 19, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.38, breakDist: 6.0, partTag: 'trunk' });

  beams.push({ nodeA: 0, nodeB: 15, type: 'support', spring: DEFAULT_K_SUPPORT, damp: DEFAULT_C_SUPPORT, yieldDist: 0.85, breakDist: 40.0 });
  beams.push({ nodeA: 20, nodeB: 25, type: 'support', spring: DEFAULT_K_SUPPORT * 1.3, damp: DEFAULT_C_SUPPORT, yieldDist: 0.9, breakDist: 45.0 });

  return beams;
}

export const PRESET_HATCHBACK_COMPACT: VehicleNodeBeamDefinition = {
  presetId: 'hatchback_compact',
  name: 'Compact Hatchback (2-Box Monocoque)',
  perimeterCount: 14,
  nodes: HATCHBACK_NODES,
  beams: buildHatchbackBeams(),
  springScale: 0.92,
  dampScale: 0.95,
  yieldScale: 0.88,
  breakScale: 0.92,
  chassisStiffness: 0.90,
  tracking: {
    frontNodeIds: [0, 1, 13],
    rearNodeIds: [6, 7, 8],
    leftNodeIds: [10, 11],
    rightNodeIds: [4, 3],
    subframeLeftFL: 21,
    subframeRightFR: 22,
    subframeLeftRL: 23,
    subframeRightRR: 24,
    engineNodeId: 20,
    chassisCoreNodeId: 25
  }
};

// ============================================================================
// 4. MUSCLE CAR PRESET (Long Snout, Huge V8, Flared Rear Quarters)
// ============================================================================
const MUSCLE_NODES: NodeTemplate[] = [
  // Perimeter (0..15) - exactly matching getVehicleBasePolygonRaw muscle
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.026, name: 'Chrome Front Grille Center' },
  { id: 1, xFrac: 0.49, yFrac: 0.45, group: 'bumper', massFrac: 0.022, name: 'Front-Right Bumper Flange' },
  { id: 2, xFrac: 0.45, yFrac: 0.50, group: 'fender', massFrac: 0.024, name: 'Front-Right Long Fender Arch' },
  { id: 3, xFrac: 0.20, yFrac: 0.50, group: 'door', massFrac: 0.024, name: 'Right Door Sill' },
  { id: 4, xFrac: 0.00, yFrac: 0.50, group: 'pillar', massFrac: 0.026, name: 'Right B-Pillar Sill' },
  { id: 5, xFrac: -0.22, yFrac: 0.51, group: 'quarter', massFrac: 0.028, name: 'Flared Muscular Rear-Right Hip' },
  { id: 6, xFrac: -0.45, yFrac: 0.48, group: 'quarter', massFrac: 0.024, name: 'Rear-Right Quarter Corner' },
  { id: 7, xFrac: -0.49, yFrac: 0.29, group: 'bumper', massFrac: 0.018, name: 'Rear-Right Bumper Corner' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.022, name: 'Rear Bumper Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.29, group: 'bumper', massFrac: 0.018, name: 'Rear-Left Bumper Corner' },
  { id: 10, xFrac: -0.45, yFrac: -0.48, group: 'quarter', massFrac: 0.024, name: 'Rear-Left Quarter Corner' },
  { id: 11, xFrac: -0.22, yFrac: -0.51, group: 'quarter', massFrac: 0.028, name: 'Flared Muscular Rear-Left Hip' },
  { id: 12, xFrac: 0.00, yFrac: -0.50, group: 'pillar', massFrac: 0.026, name: 'Left B-Pillar Sill' },
  { id: 13, xFrac: 0.20, yFrac: -0.50, group: 'door', massFrac: 0.024, name: 'Left Door Sill' },
  { id: 14, xFrac: 0.45, yFrac: -0.50, group: 'fender', massFrac: 0.022, name: 'Front-Left Long Fender Arch' },
  { id: 15, xFrac: 0.49, yFrac: -0.45, group: 'bumper', massFrac: 0.022, name: 'Front-Left Bumper Flange' },

  // Set-Back Greenhouse & Hood (16..23, 8 nodes)
  { id: 16, xFrac: 0.28, yFrac: 0.0, group: 'hood', massFrac: 0.030, name: 'Long Hood Bulge / Shaker' },
  { id: 17, xFrac: 0.08, yFrac: 0.0, group: 'windshield', massFrac: 0.030, name: 'Raked Cowl Seam' },
  { id: 18, xFrac: -0.06, yFrac: 0.0, group: 'roof', massFrac: 0.035, name: 'Fastback Roof Apex' },
  { id: 19, xFrac: 0.02, yFrac: -0.20, group: 'roof', massFrac: 0.022, name: 'Roof Front-Left Pillar' },
  { id: 20, xFrac: 0.02, yFrac: 0.20, group: 'roof', massFrac: 0.022, name: 'Roof Front-Right Pillar' },
  { id: 21, xFrac: -0.16, yFrac: -0.20, group: 'roof', massFrac: 0.022, name: 'Roof Rear-Left Sail Panel' },
  { id: 22, xFrac: -0.16, yFrac: 0.20, group: 'roof', massFrac: 0.022, name: 'Roof Rear-Right Sail Panel' },
  { id: 23, xFrac: -0.32, yFrac: 0.0, group: 'trunk', massFrac: 0.026, name: 'Short Rear Deck Lid' },

  // Heavy V8 Powertrain & High-Torque Drivetrain (24..29, 6 nodes)
  { id: 24, xFrac: 0.28, yFrac: 0.0, group: 'engine', massFrac: 0.240, name: 'Massive Cast Iron Big-Block V8' },
  { id: 25, xFrac: 0.24, yFrac: -0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Left Double Wishbone Crossmember' },
  { id: 26, xFrac: 0.24, yFrac: 0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Right Double Wishbone Crossmember' },
  { id: 27, xFrac: -0.24, yFrac: -0.28, group: 'subframe', massFrac: 0.055, name: 'Rear-Left Solid Axle Leaf Perch' },
  { id: 28, xFrac: -0.24, yFrac: 0.28, group: 'subframe', massFrac: 0.055, name: 'Rear-Right Solid Axle Leaf Perch' },
  { id: 29, xFrac: -0.06, yFrac: 0.0, group: 'chassis_core', massFrac: 0.160, isFixed: true, name: 'Reinforced Driveshaft Tunnel' }
];

function buildMuscleBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.38, 0.52, 20.0, 1.1);

  const crosses: [number, number][] = [
    [0, 25], [0, 26], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [8, 27], [8, 28]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 1.15, DEFAULT_C_CROSS, 0.46, 17.0);

  const leftRail: [number, number][] = [[15, 25], [25, 14], [25, 17], [17, 12], [12, 27], [27, 10], [27, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.15, DEFAULT_C_CHASSIS * 1.1, 0.72, 28.0);

  const rightRail: [number, number][] = [[1, 26], [26, 2], [26, 17], [17, 4], [4, 28], [28, 6], [28, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.15, DEFAULT_C_CHASSIS * 1.1, 0.72, 28.0);

  const centerRail: [number, number][] = [[0, 24], [24, 17], [17, 29], [29, 23], [23, 8]];
  addBeamChain(beams, centerRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.25, DEFAULT_C_CHASSIS * 1.15, 0.85, 30.0);

  addBeamChain(beams, [[25, 26], [27, 28]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.1, DEFAULT_C_CHASSIS, 0.62, 24.0);
  addBeamChain(beams, [[24, 25], [24, 26]], 'chassis_rail', DEFAULT_K_CHASSIS, DEFAULT_C_CHASSIS, 0.55, 20.0);
  addBeamChain(beams, [[12, 29], [4, 29]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.1, DEFAULT_C_CHASSIS, 0.70, 26.0);

  const roofCage: [number, number][] = [
    [17, 19], [17, 20], [14, 19], [2, 20],
    [19, 20], [20, 22], [22, 21], [21, 19],
    [18, 19], [18, 20], [18, 21], [18, 22],
    [12, 19], [4, 20], [12, 21], [4, 22],
    [21, 23], [22, 23], [10, 21], [6, 22]
  ];
  addBeamChain(beams, roofCage, 'structural', DEFAULT_K_STRUCTURAL * 1.1, DEFAULT_C_STRUCTURAL, 0.48, 18.0);

  beams.push({ nodeA: 15, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH * 1.1, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 7.0, partTag: 'front_bumper' });
  beams.push({ nodeA: 1, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH * 1.1, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 7.0, partTag: 'front_bumper' });
  beams.push({ nodeA: 0, nodeB: 16, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.5, partTag: 'hood' });
  beams.push({ nodeA: 16, nodeB: 17, type: 'latch', spring: DEFAULT_K_LATCH * 0.95, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.5, partTag: 'hood' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.0, partTag: 'trunk' });
  beams.push({ nodeA: 9, nodeB: 27, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'rear_bumper' });
  beams.push({ nodeA: 7, nodeB: 28, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'rear_bumper' });

  beams.push({ nodeA: 0, nodeB: 17, type: 'support', spring: DEFAULT_K_SUPPORT * 1.4, damp: DEFAULT_C_SUPPORT, yieldDist: 0.95, breakDist: 50.0 });
  beams.push({ nodeA: 24, nodeB: 29, type: 'support', spring: DEFAULT_K_SUPPORT * 1.8, damp: DEFAULT_C_SUPPORT, yieldDist: 1.1, breakDist: 55.0 });

  return beams;
}

export const PRESET_MUSCLE: VehicleNodeBeamDefinition = {
  presetId: 'muscle_long_hood',
  name: 'Classic / Modern Muscle (Heavy Big-Block V8 & Torque Backbone)',
  perimeterCount: 16,
  nodes: MUSCLE_NODES,
  beams: buildMuscleBeams(),
  springScale: 1.15,
  dampScale: 1.10,
  yieldScale: 1.12,
  breakScale: 1.10,
  chassisStiffness: 1.20,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 11],
    rightNodeIds: [4, 3, 5],
    subframeLeftFL: 25,
    subframeRightFR: 26,
    subframeLeftRL: 27,
    subframeRightRR: 28,
    engineNodeId: 24,
    chassisCoreNodeId: 29
  }
};

// ============================================================================
// 5. MID-ENGINE SUPERCAR PRESET (Carbon Monocoque Tub & Mid-Rear V10/V12)
// ============================================================================
const SUPERCAR_NODES: NodeTemplate[] = [
  // Perimeter (0..15) - exactly matching getVehicleBasePolygonRaw supercar
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.020, name: 'Sharp Wedge Nose Tip' },
  { id: 1, xFrac: 0.46, yFrac: 0.32, group: 'bumper', massFrac: 0.018, name: 'Aero Splitter Right Corner' },
  { id: 2, xFrac: 0.38, yFrac: 0.48, group: 'fender', massFrac: 0.022, name: 'Front-Right Fender Arch' },
  { id: 3, xFrac: 0.15, yFrac: 0.44, group: 'door', massFrac: 0.024, name: 'Right Scissor Door Sill' },
  { id: 4, xFrac: -0.05, yFrac: 0.46, group: 'pillar', massFrac: 0.026, name: 'Right Side Radiator Scoop' },
  { id: 5, xFrac: -0.25, yFrac: 0.50, group: 'quarter', massFrac: 0.026, name: 'Rear-Right Wide Fender' },
  { id: 6, xFrac: -0.44, yFrac: 0.44, group: 'quarter', massFrac: 0.024, name: 'Rear-Right Aero Diffuser' },
  { id: 7, xFrac: -0.49, yFrac: 0.26, group: 'bumper', massFrac: 0.018, name: 'Rear-Right Exhaust Exit' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.020, name: 'Rear Wing Center Mount' },
  { id: 9, xFrac: -0.49, yFrac: -0.26, group: 'bumper', massFrac: 0.018, name: 'Rear-Left Exhaust Exit' },
  { id: 10, xFrac: -0.44, yFrac: -0.44, group: 'quarter', massFrac: 0.024, name: 'Rear-Left Aero Diffuser' },
  { id: 11, xFrac: -0.25, yFrac: -0.50, group: 'quarter', massFrac: 0.026, name: 'Rear-Left Wide Fender' },
  { id: 12, xFrac: -0.05, yFrac: -0.46, group: 'pillar', massFrac: 0.026, name: 'Left Side Radiator Scoop' },
  { id: 13, xFrac: 0.15, yFrac: -0.44, group: 'door', massFrac: 0.024, name: 'Left Scissor Door Sill' },
  { id: 14, xFrac: 0.38, yFrac: -0.48, group: 'fender', massFrac: 0.022, name: 'Front-Left Fender Arch' },
  { id: 15, xFrac: 0.46, yFrac: -0.32, group: 'bumper', massFrac: 0.018, name: 'Aero Splitter Left Corner' },

  // Carbon Monocoque Cockpit & Glass Canopy (16..23, 8 nodes)
  { id: 16, xFrac: 0.28, yFrac: 0.0, group: 'hood', massFrac: 0.022, name: 'Front Luggage Tub / Radiator Duct' },
  { id: 17, xFrac: 0.16, yFrac: 0.0, group: 'windshield', massFrac: 0.028, name: 'Raked Windshield Base' },
  { id: 18, xFrac: -0.02, yFrac: 0.0, group: 'roof', massFrac: 0.032, name: 'Cockpit Canopy Apex' },
  { id: 19, xFrac: 0.06, yFrac: -0.20, group: 'roof', massFrac: 0.020, name: 'Canopy Front-Left Carbon Arch' },
  { id: 20, xFrac: 0.06, yFrac: 0.20, group: 'roof', massFrac: 0.020, name: 'Canopy Front-Right Carbon Arch' },
  { id: 21, xFrac: -0.10, yFrac: -0.20, group: 'roof', massFrac: 0.020, name: 'Canopy Rear-Left Carbon Arch' },
  { id: 22, xFrac: -0.10, yFrac: 0.20, group: 'roof', massFrac: 0.020, name: 'Canopy Rear-Right Carbon Arch' },
  { id: 23, xFrac: -0.32, yFrac: 0.0, group: 'trunk', massFrac: 0.024, name: 'Engine Glass Cover / Rear Deck' },

  // Mid-Engine Subframe & Powertrain (24..31, 8 nodes)
  // ENGINE IS BEHIND COCKPIT at xFrac: -0.16
  { id: 24, xFrac: -0.16, yFrac: 0.0, group: 'engine', massFrac: 0.220, name: 'Mid-Mounted V10/V12 Engine Block' },
  { id: 25, xFrac: 0.24, yFrac: -0.26, group: 'subframe', massFrac: 0.055, name: 'Front-Left Pushrod Suspension Tower' },
  { id: 26, xFrac: 0.24, yFrac: 0.26, group: 'subframe', massFrac: 0.055, name: 'Front-Right Pushrod Suspension Tower' },
  { id: 27, xFrac: -0.28, yFrac: -0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Left Transaxle Subframe' },
  { id: 28, xFrac: -0.28, yFrac: 0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Right Transaxle Subframe' },
  { id: 29, xFrac: 0.02, yFrac: 0.0, group: 'chassis_core', massFrac: 0.150, isFixed: true, name: 'Carbon Tub Safety Cell Core' },
  { id: 30, xFrac: -0.34, yFrac: 0.0, group: 'subframe', massFrac: 0.045, name: 'Transaxle Gearbox Housing' },
  { id: 31, xFrac: 0.36, yFrac: 0.0, group: 'subframe', massFrac: 0.035, name: 'Front Aluminum Crash-Box Core' }
];

function buildSupercarBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.40, 0.50, 14.0, 1.3);

  const crosses: [number, number][] = [
    [0, 25], [0, 26], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [8, 27], [8, 28]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 1.4, DEFAULT_C_CROSS, 0.40, 13.0);

  // Front crumple box
  addBeamChain(beams, [[0, 31], [1, 31], [15, 31]], 'chassis_rail', DEFAULT_K_CHASSIS * 0.8, DEFAULT_C_CHASSIS, 0.35, 16.0);
  addBeamChain(beams, [[31, 25], [31, 26]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.2, DEFAULT_C_CHASSIS, 0.55, 20.0);

  // Carbon Monocoque Cell (Ultra-rigid)
  addBeamChain(beams, [[25, 29], [26, 29], [17, 29], [12, 29], [4, 29]], 'chassis_rail', DEFAULT_K_CHASSIS * 2.2, DEFAULT_C_CHASSIS * 1.5, 1.2, 35.0);

  // Mid-Engine Cradle (Engine 24 is behind cockpit core 29)
  addBeamChain(beams, [[29, 24], [24, 27], [24, 28], [24, 30], [30, 8]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.8, DEFAULT_C_CHASSIS, 0.9, 30.0);

  beams.push({ nodeA: 0, nodeB: 16, type: 'latch', spring: DEFAULT_K_LATCH * 0.8, damp: DEFAULT_C_LATCH, yieldDist: 0.30, breakDist: 4.8, partTag: 'hood' });
  beams.push({ nodeA: 1, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.2, partTag: 'front_bumper' });
  beams.push({ nodeA: 15, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.2, partTag: 'front_bumper' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 0.8, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.0, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 0.8, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.0, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.5, partTag: 'trunk' });

  beams.push({ nodeA: 24, nodeB: 29, type: 'support', spring: DEFAULT_K_SUPPORT * 2.0, damp: DEFAULT_C_SUPPORT, yieldDist: 1.1, breakDist: 50.0 });
  beams.push({ nodeA: 0, nodeB: 29, type: 'support', spring: DEFAULT_K_SUPPORT * 1.5, damp: DEFAULT_C_SUPPORT, yieldDist: 1.0, breakDist: 45.0 });

  return beams;
}

export const PRESET_SUPERCAR: VehicleNodeBeamDefinition = {
  presetId: 'supercar_mid_engine',
  name: 'Mid-Engine Supercar (Carbon Monocoque)',
  perimeterCount: 16,
  nodes: SUPERCAR_NODES,
  beams: buildSupercarBeams(),
  springScale: 1.55,
  dampScale: 1.30,
  yieldScale: 1.35,
  breakScale: 1.10,
  chassisStiffness: 1.80,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13],
    rightNodeIds: [4, 3],
    subframeLeftFL: 25,
    subframeRightFR: 26,
    subframeLeftRL: 27,
    subframeRightRR: 28,
    engineNodeId: 24,
    chassisCoreNodeId: 29
  }
};

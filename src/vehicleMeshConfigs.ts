import {
  BeamLinkType,
  BeamNodeType,
  NodeTemplate,
  BeamTemplate,
  VehicleNodeBeamDefinition
} from './types';

/**
 * ============================================================================
 * VEHICLE NODE-BEAM MESH CONFIGURATIONS & PRESET REGISTRY
 * ============================================================================
 *
 * Provides granular, individual soft-body mesh templates and spring-damper
 * stiffness configurations for different vehicle archetypes:
 *
 * - Custom node counts (14 nodes for motorcycles to 34+ for cabover trucks)
 * - Custom node coordinate topologies (mid-engine, cabover, tractor backbone)
 * - Custom individual spring rates, damping, yield thresholds, and breaking limits
 * - Dynamic registry for registering/modifying custom mesh definitions at runtime
 */

// Default stiffness factors (N/px, Hookean elastic spring rate)
export const DEFAULT_K_STRUCTURAL = 2800;
export const DEFAULT_C_STRUCTURAL = 85;
export const DEFAULT_K_CHASSIS = 5200;
export const DEFAULT_C_CHASSIS = 150;
export const DEFAULT_K_CROSS = 2200;
export const DEFAULT_C_CROSS = 70;
export const DEFAULT_K_SUPPORT = 3400;
export const DEFAULT_C_SUPPORT = 90;
export const DEFAULT_K_LATCH = 2200;
export const DEFAULT_C_LATCH = 75;

// ----------------------------------------------------------------------------
// 1. STANDARD SEDAN / SALOON PRESET (30 Nodes, 86 Beams)
// Traditional 3-box notchback unibody (hood, passenger cabin, stepped trunk)
// ----------------------------------------------------------------------------
const SEDAN_NODES: NodeTemplate[] = [
  // Perimeter (0..15)
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.025, name: 'Front Bumper Center' },
  { id: 1, xFrac: 0.48, yFrac: 0.39, group: 'bumper', massFrac: 0.020, name: 'Front-Right Bumper Corner' },
  { id: 2, xFrac: 0.45, yFrac: 0.50, group: 'fender', massFrac: 0.022, name: 'Front-Right Fender' },
  { id: 3, xFrac: 0.22, yFrac: 0.50, group: 'door', massFrac: 0.024, name: 'Front-Right Door' },
  { id: 4, xFrac: 0.00, yFrac: 0.50, group: 'pillar', massFrac: 0.026, name: 'Right B-Pillar Sill' },
  { id: 5, xFrac: -0.22, yFrac: 0.50, group: 'door', massFrac: 0.024, name: 'Rear-Right Door' },
  { id: 6, xFrac: -0.44, yFrac: 0.47, group: 'quarter', massFrac: 0.024, name: 'Rear-Right Quarter' },
  { id: 7, xFrac: -0.49, yFrac: 0.31, group: 'bumper', massFrac: 0.018, name: 'Rear-Right Bumper Corner' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.022, name: 'Rear Bumper Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.31, group: 'bumper', massFrac: 0.018, name: 'Rear-Left Bumper Corner' },
  { id: 10, xFrac: -0.44, yFrac: -0.47, group: 'quarter', massFrac: 0.024, name: 'Rear-Left Quarter' },
  { id: 11, xFrac: -0.22, yFrac: -0.50, group: 'door', massFrac: 0.024, name: 'Rear-Left Door' },
  { id: 12, xFrac: 0.00, yFrac: -0.50, group: 'pillar', massFrac: 0.026, name: 'Left B-Pillar Sill' },
  { id: 13, xFrac: 0.22, yFrac: -0.50, group: 'door', massFrac: 0.024, name: 'Front-Left Door' },
  { id: 14, xFrac: 0.45, yFrac: -0.50, group: 'fender', massFrac: 0.022, name: 'Front-Left Fender' },
  { id: 15, xFrac: 0.48, yFrac: -0.39, group: 'bumper', massFrac: 0.020, name: 'Front-Left Bumper Corner' },

  // Greenhouse & Upper Body (16..23)
  { id: 16, xFrac: 0.21, yFrac: 0.0, group: 'hood', massFrac: 0.028, name: 'Hood Center' },
  { id: 17, xFrac: 0.12, yFrac: 0.0, group: 'windshield', massFrac: 0.030, name: 'Cowl / Windshield Base' },
  { id: 18, xFrac: -0.02, yFrac: 0.0, group: 'roof', massFrac: 0.035, name: 'Roof Apex' },
  { id: 19, xFrac: 0.07, yFrac: -0.21, group: 'roof', massFrac: 0.022, name: 'Roof Front-Left Corner' },
  { id: 20, xFrac: 0.07, yFrac: 0.21, group: 'roof', massFrac: 0.022, name: 'Roof Front-Right Corner' },
  { id: 21, xFrac: -0.11, yFrac: -0.21, group: 'roof', massFrac: 0.022, name: 'Roof Rear-Left Corner' },
  { id: 22, xFrac: -0.11, yFrac: 0.21, group: 'roof', massFrac: 0.022, name: 'Roof Rear-Right Corner' },
  { id: 23, xFrac: -0.28, yFrac: 0.0, group: 'trunk', massFrac: 0.026, name: 'Trunk Deck Shelf' },

  // Subframe & Powertrain Core (24..29)
  { id: 24, xFrac: 0.25, yFrac: 0.0, group: 'engine', massFrac: 0.200, name: 'Engine Block / Cradle' },
  { id: 25, xFrac: 0.22, yFrac: -0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Left Strut Tower' },
  { id: 26, xFrac: 0.22, yFrac: 0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Right Strut Tower' },
  { id: 27, xFrac: -0.25, yFrac: -0.28, group: 'subframe', massFrac: 0.055, name: 'Rear-Left Axle Carrier' },
  { id: 28, xFrac: -0.25, yFrac: 0.28, group: 'subframe', massFrac: 0.055, name: 'Rear-Right Axle Carrier' },
  { id: 29, xFrac: -0.02, yFrac: 0.0, group: 'chassis_core', massFrac: 0.160, isFixed: true, name: 'Cabin Floor Tunnel' }
];

function buildStandardSedanBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = [];

  // Perimeter
  for (let i = 0; i < 16; i++) {
    const next = (i + 1) % 16;
    const isFrontBumper = i === 0 || i === 15;
    const isRearBumper = i === 7 || i === 8;
    beams.push({
      nodeA: i,
      nodeB: next,
      type: 'structural',
      spring: DEFAULT_K_STRUCTURAL,
      damp: DEFAULT_C_STRUCTURAL,
      yieldDist: isFrontBumper ? 0.35 : isRearBumper ? 0.40 : 0.50,
      breakDist: 18.0
    });
  }

  // Diagonal shear braces
  const crosses: [number, number][] = [
    [0, 2], [0, 14], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [6, 8], [10, 8], [7, 9], [1, 15]
  ];
  for (const [a, b] of crosses) {
    beams.push({
      nodeA: a,
      nodeB: b,
      type: 'cross',
      spring: DEFAULT_K_CROSS,
      damp: DEFAULT_C_CROSS,
      yieldDist: 0.45,
      breakDist: 16.0
    });
  }

  // Chassis rails
  const leftRail: [number, number][] = [[15, 25], [25, 14], [25, 17], [17, 12], [12, 27], [27, 10], [27, 9]];
  for (const [a, b] of leftRail) {
    beams.push({ nodeA: a, nodeB: b, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS, damp: DEFAULT_C_CHASSIS, yieldDist: 0.70, breakDist: 26.0 });
  }

  const rightRail: [number, number][] = [[1, 26], [26, 2], [26, 17], [17, 4], [4, 28], [28, 6], [28, 7]];
  for (const [a, b] of rightRail) {
    beams.push({ nodeA: a, nodeB: b, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS, damp: DEFAULT_C_CHASSIS, yieldDist: 0.70, breakDist: 26.0 });
  }

  const centerRail: [number, number][] = [[0, 24], [24, 17], [17, 29], [29, 23], [23, 8]];
  for (const [a, b] of centerRail) {
    beams.push({ nodeA: a, nodeB: b, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.1, damp: DEFAULT_C_CHASSIS * 1.1, yieldDist: 0.80, breakDist: 28.0 });
  }

  // Subframe crossmembers & mounts
  beams.push({ nodeA: 25, nodeB: 26, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS, damp: DEFAULT_C_CHASSIS, yieldDist: 0.60, breakDist: 22.0 });
  beams.push({ nodeA: 24, nodeB: 25, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.50, breakDist: 18.0 });
  beams.push({ nodeA: 24, nodeB: 26, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.50, breakDist: 18.0 });
  beams.push({ nodeA: 27, nodeB: 28, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS, damp: DEFAULT_C_CHASSIS, yieldDist: 0.60, breakDist: 22.0 });
  beams.push({ nodeA: 12, nodeB: 29, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 24.0 });
  beams.push({ nodeA: 4, nodeB: 29, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 24.0 });

  // Greenhouse & Roof cage
  beams.push({ nodeA: 17, nodeB: 19, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 1.2, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.50, breakDist: 20.0 });
  beams.push({ nodeA: 17, nodeB: 20, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 1.2, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.50, breakDist: 20.0 });
  beams.push({ nodeA: 14, nodeB: 19, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 1.1, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 18.0 });
  beams.push({ nodeA: 2, nodeB: 20, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 1.1, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 18.0 });
  beams.push({ nodeA: 19, nodeB: 20, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 16.0 });
  beams.push({ nodeA: 20, nodeB: 22, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 16.0 });
  beams.push({ nodeA: 22, nodeB: 21, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 16.0 });
  beams.push({ nodeA: 21, nodeB: 19, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 16.0 });
  beams.push({ nodeA: 18, nodeB: 19, type: 'cross', spring: DEFAULT_K_CROSS, damp: DEFAULT_C_CROSS, yieldDist: 0.40, breakDist: 15.0 });
  beams.push({ nodeA: 18, nodeB: 20, type: 'cross', spring: DEFAULT_K_CROSS, damp: DEFAULT_C_CROSS, yieldDist: 0.40, breakDist: 15.0 });
  beams.push({ nodeA: 18, nodeB: 21, type: 'cross', spring: DEFAULT_K_CROSS, damp: DEFAULT_C_CROSS, yieldDist: 0.40, breakDist: 15.0 });
  beams.push({ nodeA: 18, nodeB: 22, type: 'cross', spring: DEFAULT_K_CROSS, damp: DEFAULT_C_CROSS, yieldDist: 0.40, breakDist: 15.0 });
  beams.push({ nodeA: 12, nodeB: 19, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.50, breakDist: 18.0 });
  beams.push({ nodeA: 4, nodeB: 20, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.50, breakDist: 18.0 });
  beams.push({ nodeA: 12, nodeB: 21, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.50, breakDist: 18.0 });
  beams.push({ nodeA: 4, nodeB: 22, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.50, breakDist: 18.0 });
  beams.push({ nodeA: 21, nodeB: 23, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.50, breakDist: 18.0 });
  beams.push({ nodeA: 22, nodeB: 23, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.50, breakDist: 18.0 });
  beams.push({ nodeA: 10, nodeB: 21, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 18.0 });
  beams.push({ nodeA: 6, nodeB: 22, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 18.0 });

  // Detachable latches
  beams.push({ nodeA: 15, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 1, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 0, nodeB: 16, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.5, partTag: 'hood' });
  beams.push({ nodeA: 16, nodeB: 17, type: 'latch', spring: DEFAULT_K_LATCH * 0.95, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.5, partTag: 'hood' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.0, partTag: 'trunk' });
  beams.push({ nodeA: 9, nodeB: 27, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'rear_bumper' });
  beams.push({ nodeA: 7, nodeB: 28, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'rear_bumper' });

  // Anti-collapse support springs
  beams.push({ nodeA: 3, nodeB: 13, type: 'support', spring: DEFAULT_K_SUPPORT, damp: DEFAULT_C_SUPPORT, yieldDist: 0.8, breakDist: 40.0 });
  beams.push({ nodeA: 5, nodeB: 11, type: 'support', spring: DEFAULT_K_SUPPORT, damp: DEFAULT_C_SUPPORT, yieldDist: 0.8, breakDist: 40.0 });
  beams.push({ nodeA: 0, nodeB: 17, type: 'support', spring: DEFAULT_K_SUPPORT * 1.2, damp: DEFAULT_C_SUPPORT, yieldDist: 0.9, breakDist: 45.0 });
  beams.push({ nodeA: 24, nodeB: 29, type: 'support', spring: DEFAULT_K_SUPPORT * 1.5, damp: DEFAULT_C_SUPPORT, yieldDist: 1.0, breakDist: 50.0 });

  return beams;
}

export const PRESET_SEDAN: VehicleNodeBeamDefinition = {
  presetId: 'sedan_standard',
  name: 'Standard Sedan (3-Box Unibody)',
  perimeterCount: 16,
  nodes: SEDAN_NODES,
  beams: buildStandardSedanBeams(),
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

// ----------------------------------------------------------------------------
// 2. COMPACT HATCHBACK PRESET (26 Nodes, 74 Beams)
// 2-box design, short front crumple, flat vertical tailgate, high agile deformation
// ----------------------------------------------------------------------------
const HATCHBACK_NODES: NodeTemplate[] = [
  // Perimeter (0..13, 14 nodes)
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.026, name: 'Front Bumper Center' },
  { id: 1, xFrac: 0.47, yFrac: 0.40, group: 'bumper', massFrac: 0.022, name: 'Front-Right Bumper Corner' },
  { id: 2, xFrac: 0.42, yFrac: 0.50, group: 'fender', massFrac: 0.024, name: 'Front-Right Fender' },
  { id: 3, xFrac: 0.15, yFrac: 0.50, group: 'door', massFrac: 0.028, name: 'Right Door' },
  { id: 4, xFrac: -0.15, yFrac: 0.50, group: 'pillar', massFrac: 0.028, name: 'Right B-Pillar Sill' },
  { id: 5, xFrac: -0.42, yFrac: 0.46, group: 'quarter', massFrac: 0.026, name: 'Rear-Right Quarter Corner' },
  { id: 6, xFrac: -0.49, yFrac: 0.28, group: 'bumper', massFrac: 0.020, name: 'Tailgate-Right Bumper Corner' },
  { id: 7, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.024, name: 'Tailgate Bumper Center' },
  { id: 8, xFrac: -0.49, yFrac: -0.28, group: 'bumper', massFrac: 0.020, name: 'Tailgate-Left Bumper Corner' },
  { id: 9, xFrac: -0.42, yFrac: -0.46, group: 'quarter', massFrac: 0.026, name: 'Rear-Left Quarter Corner' },
  { id: 10, xFrac: -0.15, yFrac: -0.50, group: 'pillar', massFrac: 0.028, name: 'Left B-Pillar Sill' },
  { id: 11, xFrac: 0.15, yFrac: -0.50, group: 'door', massFrac: 0.028, name: 'Left Door' },
  { id: 12, xFrac: 0.42, yFrac: -0.50, group: 'fender', massFrac: 0.024, name: 'Front-Left Fender' },
  { id: 13, xFrac: 0.47, yFrac: -0.40, group: 'bumper', massFrac: 0.022, name: 'Front-Left Bumper Corner' },

  // Greenhouse & Tailgate (14..19, 6 nodes)
  { id: 14, xFrac: 0.22, yFrac: 0.0, group: 'hood', massFrac: 0.030, name: 'Short Hood Center' },
  { id: 15, xFrac: 0.14, yFrac: 0.0, group: 'windshield', massFrac: 0.032, name: 'Windshield Cowl' },
  { id: 16, xFrac: -0.06, yFrac: 0.0, group: 'roof', massFrac: 0.036, name: 'Roof Apex' },
  { id: 17, xFrac: 0.06, yFrac: -0.24, group: 'roof', massFrac: 0.024, name: 'Roof Front-Left' },
  { id: 18, xFrac: 0.06, yFrac: 0.24, group: 'roof', massFrac: 0.024, name: 'Roof Front-Right' },
  { id: 19, xFrac: -0.32, yFrac: 0.0, group: 'trunk', massFrac: 0.030, name: 'Hatch Tailgate Header' },

  // Subframe & Engine Core (20..25, 6 nodes)
  { id: 20, xFrac: 0.26, yFrac: 0.0, group: 'engine', massFrac: 0.210, name: 'Transverse Engine Block' },
  { id: 21, xFrac: 0.24, yFrac: -0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Left MacPherson Strut' },
  { id: 22, xFrac: 0.24, yFrac: 0.28, group: 'subframe', massFrac: 0.065, name: 'Front-Right MacPherson Strut' },
  { id: 23, xFrac: -0.26, yFrac: -0.28, group: 'subframe', massFrac: 0.055, name: 'Torsion Beam Left Mount' },
  { id: 24, xFrac: -0.26, yFrac: 0.28, group: 'subframe', massFrac: 0.055, name: 'Torsion Beam Right Mount' },
  { id: 25, xFrac: -0.05, yFrac: 0.0, group: 'chassis_core', massFrac: 0.170, isFixed: true, name: 'Cabin Center Tunnel' }
];

function buildHatchbackBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = [];
  const P = 14;

  // Perimeter
  for (let i = 0; i < P; i++) {
    const next = (i + 1) % P;
    beams.push({
      nodeA: i,
      nodeB: next,
      type: 'structural',
      spring: DEFAULT_K_STRUCTURAL * 0.95,
      damp: DEFAULT_C_STRUCTURAL * 0.95,
      yieldDist: i === 0 || i === 13 ? 0.32 : 0.45,
      breakDist: 16.0
    });
  }

  // Crosses
  const crosses: [number, number][] = [
    [0, 2], [0, 12], [1, 3], [13, 11],
    [2, 4], [12, 10], [3, 5], [11, 9],
    [4, 6], [10, 8], [5, 7], [9, 7], [1, 13]
  ];
  for (const [a, b] of crosses) {
    beams.push({ nodeA: a, nodeB: b, type: 'cross', spring: DEFAULT_K_CROSS * 0.95, damp: DEFAULT_C_CROSS, yieldDist: 0.42, breakDist: 15.0 });
  }

  // Rails
  beams.push({ nodeA: 13, nodeB: 21, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });
  beams.push({ nodeA: 21, nodeB: 12, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });
  beams.push({ nodeA: 21, nodeB: 15, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });
  beams.push({ nodeA: 15, nodeB: 10, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });
  beams.push({ nodeA: 10, nodeB: 23, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });
  beams.push({ nodeA: 23, nodeB: 8, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });

  beams.push({ nodeA: 1, nodeB: 22, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });
  beams.push({ nodeA: 22, nodeB: 2, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });
  beams.push({ nodeA: 22, nodeB: 15, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });
  beams.push({ nodeA: 15, nodeB: 4, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });
  beams.push({ nodeA: 4, nodeB: 24, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });
  beams.push({ nodeA: 24, nodeB: 6, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 22.0 });

  // Center rail & mounts
  beams.push({ nodeA: 0, nodeB: 20, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS, damp: DEFAULT_C_CHASSIS, yieldDist: 0.70, breakDist: 24.0 });
  beams.push({ nodeA: 20, nodeB: 15, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS, damp: DEFAULT_C_CHASSIS, yieldDist: 0.70, breakDist: 24.0 });
  beams.push({ nodeA: 15, nodeB: 25, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS, damp: DEFAULT_C_CHASSIS, yieldDist: 0.75, breakDist: 26.0 });
  beams.push({ nodeA: 25, nodeB: 19, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS, damp: DEFAULT_C_CHASSIS, yieldDist: 0.75, breakDist: 26.0 });
  beams.push({ nodeA: 19, nodeB: 7, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS, damp: DEFAULT_C_CHASSIS, yieldDist: 0.75, breakDist: 26.0 });

  // Crossmembers
  beams.push({ nodeA: 21, nodeB: 22, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.55, breakDist: 20.0 });
  beams.push({ nodeA: 20, nodeB: 21, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.85, damp: DEFAULT_C_CHASSIS, yieldDist: 0.45, breakDist: 18.0 });
  beams.push({ nodeA: 20, nodeB: 22, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.85, damp: DEFAULT_C_CHASSIS, yieldDist: 0.45, breakDist: 18.0 });
  beams.push({ nodeA: 23, nodeB: 24, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.55, breakDist: 20.0 });
  beams.push({ nodeA: 10, nodeB: 25, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.60, breakDist: 20.0 });
  beams.push({ nodeA: 4, nodeB: 25, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.9, damp: DEFAULT_C_CHASSIS, yieldDist: 0.60, breakDist: 20.0 });

  // Greenhouse
  beams.push({ nodeA: 15, nodeB: 17, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 18.0 });
  beams.push({ nodeA: 15, nodeB: 18, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 18.0 });
  beams.push({ nodeA: 17, nodeB: 18, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 18.0 });
  beams.push({ nodeA: 16, nodeB: 17, type: 'cross', spring: DEFAULT_K_CROSS, damp: DEFAULT_C_CROSS, yieldDist: 0.40, breakDist: 15.0 });
  beams.push({ nodeA: 16, nodeB: 18, type: 'cross', spring: DEFAULT_K_CROSS, damp: DEFAULT_C_CROSS, yieldDist: 0.40, breakDist: 15.0 });
  beams.push({ nodeA: 16, nodeB: 19, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 18.0 });

  // Latches
  beams.push({ nodeA: 0, nodeB: 14, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.5, partTag: 'hood' });
  beams.push({ nodeA: 14, nodeB: 15, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 7.0, partTag: 'hood' });
  beams.push({ nodeA: 1, nodeB: 22, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 13, nodeB: 21, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 11, nodeB: 10, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 5.8, partTag: 'door_fr' });
  beams.push({ nodeA: 7, nodeB: 19, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.38, breakDist: 6.0, partTag: 'trunk' });

  // Support
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

// ----------------------------------------------------------------------------
// 3. MID-ENGINE SUPERCAR PRESET (32 Nodes, 92 Beams)
// Aerodynamic wedge nose, ultra-stiff carbon tub cockpit, mid-rear engine block
// ----------------------------------------------------------------------------
const SUPERCAR_NODES: NodeTemplate[] = [
  // Perimeter (0..15, 16 nodes)
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.020, name: 'Sharp Wedge Nose Tip' },
  { id: 1, xFrac: 0.46, yFrac: 0.32, group: 'bumper', massFrac: 0.018, name: 'Aero Splitter Right Corner' },
  { id: 2, xFrac: 0.38, yFrac: 0.48, group: 'fender', massFrac: 0.022, name: 'Front-Right Fender Arch' },
  { id: 3, xFrac: 0.15, yFrac: 0.44, group: 'door', massFrac: 0.024, name: 'Right Scissor Door' },
  { id: 4, xFrac: -0.05, yFrac: 0.46, group: 'pillar', massFrac: 0.026, name: 'Right Side Radiator Scoop' },
  { id: 5, xFrac: -0.25, yFrac: 0.50, group: 'quarter', massFrac: 0.026, name: 'Rear-Right Wide Fender' },
  { id: 6, xFrac: -0.44, yFrac: 0.44, group: 'quarter', massFrac: 0.024, name: 'Rear-Right Aero Diffuser' },
  { id: 7, xFrac: -0.49, yFrac: 0.26, group: 'bumper', massFrac: 0.018, name: 'Rear-Right Exhaust Exit' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.020, name: 'Rear Wing Center Mount' },
  { id: 9, xFrac: -0.49, yFrac: -0.26, group: 'bumper', massFrac: 0.018, name: 'Rear-Left Exhaust Exit' },
  { id: 10, xFrac: -0.44, yFrac: -0.44, group: 'quarter', massFrac: 0.024, name: 'Rear-Left Aero Diffuser' },
  { id: 11, xFrac: -0.25, yFrac: -0.50, group: 'quarter', massFrac: 0.026, name: 'Rear-Left Wide Fender' },
  { id: 12, xFrac: -0.05, yFrac: -0.46, group: 'pillar', massFrac: 0.026, name: 'Left Side Radiator Scoop' },
  { id: 13, xFrac: 0.15, yFrac: -0.44, group: 'door', massFrac: 0.024, name: 'Left Scissor Door' },
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
  // Engine node is BEHIND cockpit at xFrac: -0.16
  { id: 24, xFrac: -0.16, yFrac: 0.0, group: 'engine', massFrac: 0.220, name: 'Mid-Mounted V10/V12 Engine Block' },
  { id: 25, xFrac: 0.24, yFrac: -0.26, group: 'subframe', massFrac: 0.055, name: 'Front-Left Pushrod Suspension Tower' },
  { id: 26, xFrac: 0.24, yFrac: 0.26, group: 'subframe', massFrac: 0.055, name: 'Front-Right Pushrod Suspension Tower' },
  { id: 27, xFrac: -0.28, yFrac: -0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Left Transaxle Subframe' },
  { id: 28, xFrac: -0.28, yFrac: 0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Right Transaxle Subframe' },
  { id: 29, xFrac: 0.02, yFrac: 0.0, group: 'chassis_core', massFrac: 0.150, isFixed: true, name: 'Carbon Tub Safety Cell Core' },
  { id: 30, xFrac: -0.34, yFrac: 0.0, group: 'subframe', massFrac: 0.045, name: 'Transaxle Gearbox Housing' },
  { id: 31, xFrac: 0.36, yFrac: 0.0, group: 'subframe', massFrac: 0.035, name: 'Front Crash-Box Core' }
];

function buildSupercarBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = [];

  // Perimeter
  for (let i = 0; i < 16; i++) {
    const next = (i + 1) % 16;
    beams.push({
      nodeA: i,
      nodeB: next,
      type: 'structural',
      spring: DEFAULT_K_STRUCTURAL * 1.3,
      damp: DEFAULT_C_STRUCTURAL * 1.2,
      yieldDist: 0.40,
      breakDist: 14.0
    });
  }

  // Cross bracing
  const crosses: [number, number][] = [
    [0, 2], [0, 14], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [6, 8], [10, 8], [7, 9], [1, 15]
  ];
  for (const [a, b] of crosses) {
    beams.push({ nodeA: a, nodeB: b, type: 'cross', spring: DEFAULT_K_CROSS * 1.4, damp: DEFAULT_C_CROSS, yieldDist: 0.40, breakDist: 13.0 });
  }

  // Front aluminum crumple box
  beams.push({ nodeA: 0, nodeB: 31, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.8, damp: DEFAULT_C_CHASSIS, yieldDist: 0.35, breakDist: 16.0 });
  beams.push({ nodeA: 1, nodeB: 31, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.8, damp: DEFAULT_C_CHASSIS, yieldDist: 0.35, breakDist: 16.0 });
  beams.push({ nodeA: 15, nodeB: 31, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 0.8, damp: DEFAULT_C_CHASSIS, yieldDist: 0.35, breakDist: 16.0 });
  beams.push({ nodeA: 31, nodeB: 25, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.2, damp: DEFAULT_C_CHASSIS, yieldDist: 0.55, breakDist: 20.0 });
  beams.push({ nodeA: 31, nodeB: 26, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.2, damp: DEFAULT_C_CHASSIS, yieldDist: 0.55, breakDist: 20.0 });

  // Ultra-stiff Carbon Monocoque Cell
  beams.push({ nodeA: 25, nodeB: 29, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.2, damp: DEFAULT_C_CHASSIS * 1.5, yieldDist: 1.2, breakDist: 35.0 });
  beams.push({ nodeA: 26, nodeB: 29, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.2, damp: DEFAULT_C_CHASSIS * 1.5, yieldDist: 1.2, breakDist: 35.0 });
  beams.push({ nodeA: 17, nodeB: 29, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.0, damp: DEFAULT_C_CHASSIS * 1.5, yieldDist: 1.2, breakDist: 35.0 });
  beams.push({ nodeA: 12, nodeB: 29, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.0, damp: DEFAULT_C_CHASSIS * 1.5, yieldDist: 1.2, breakDist: 35.0 });
  beams.push({ nodeA: 4, nodeB: 29, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.0, damp: DEFAULT_C_CHASSIS * 1.5, yieldDist: 1.2, breakDist: 35.0 });

  // Mid-Engine Cradle (Engine 24 sits behind 29)
  beams.push({ nodeA: 29, nodeB: 24, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.8, damp: DEFAULT_C_CHASSIS, yieldDist: 0.9, breakDist: 30.0 });
  beams.push({ nodeA: 24, nodeB: 27, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.6, damp: DEFAULT_C_CHASSIS, yieldDist: 0.8, breakDist: 28.0 });
  beams.push({ nodeA: 24, nodeB: 28, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.6, damp: DEFAULT_C_CHASSIS, yieldDist: 0.8, breakDist: 28.0 });
  beams.push({ nodeA: 24, nodeB: 30, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.8, damp: DEFAULT_C_CHASSIS, yieldDist: 0.9, breakDist: 30.0 });
  beams.push({ nodeA: 30, nodeB: 8, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.4, damp: DEFAULT_C_CHASSIS, yieldDist: 0.7, breakDist: 24.0 });

  // Latches (aerodynamic panels detach easily under high stress)
  beams.push({ nodeA: 0, nodeB: 16, type: 'latch', spring: DEFAULT_K_LATCH * 0.8, damp: DEFAULT_C_LATCH, yieldDist: 0.30, breakDist: 4.8, partTag: 'hood' });
  beams.push({ nodeA: 1, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.2, partTag: 'front_bumper' });
  beams.push({ nodeA: 15, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.2, partTag: 'front_bumper' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 0.8, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.0, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 0.8, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.0, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH * 0.85, damp: DEFAULT_C_LATCH, yieldDist: 0.35, breakDist: 5.5, partTag: 'trunk' });

  // Support
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

// ----------------------------------------------------------------------------
// 4. CABOVER HEAVY TRUCK & BUS PRESET (34 Nodes, 102 Beams)
// Flat vertical face, high driver position, massive continuous ladder frame
// ----------------------------------------------------------------------------
const TRUCK_CABOVER_NODES: NodeTemplate[] = [
  // Perimeter (0..15, 16 nodes) - Flat blunt front with very small front overhang
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.030, name: 'Steel Push Bumper Center' },
  { id: 1, xFrac: 0.50, yFrac: 0.42, group: 'bumper', massFrac: 0.026, name: 'Front-Right Bumper Flange' },
  { id: 2, xFrac: 0.46, yFrac: 0.50, group: 'fender', massFrac: 0.024, name: 'Cab Steps Right' },
  { id: 3, xFrac: 0.25, yFrac: 0.50, group: 'door', massFrac: 0.022, name: 'Cab Door Right' },
  { id: 4, xFrac: 0.08, yFrac: 0.50, group: 'pillar', massFrac: 0.022, name: 'Cab Rear Wall Right' },
  { id: 5, xFrac: -0.15, yFrac: 0.50, group: 'quarter', massFrac: 0.022, name: 'Cargo Bed / Tank Flank Right 1' },
  { id: 6, xFrac: -0.38, yFrac: 0.50, group: 'quarter', massFrac: 0.022, name: 'Rear Tandem Axle Flank Right' },
  { id: 7, xFrac: -0.49, yFrac: 0.38, group: 'bumper', massFrac: 0.020, name: 'Rear Underrun Bar Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.025, name: 'Rear Underrun Bar Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.38, group: 'bumper', massFrac: 0.020, name: 'Rear Underrun Bar Left' },
  { id: 10, xFrac: -0.38, yFrac: -0.50, group: 'quarter', massFrac: 0.022, name: 'Rear Tandem Axle Flank Left' },
  { id: 11, xFrac: -0.15, yFrac: -0.50, group: 'quarter', massFrac: 0.022, name: 'Cargo Bed / Tank Flank Left 1' },
  { id: 12, xFrac: 0.08, yFrac: -0.50, group: 'pillar', massFrac: 0.022, name: 'Cab Rear Wall Left' },
  { id: 13, xFrac: 0.25, yFrac: -0.50, group: 'door', massFrac: 0.022, name: 'Cab Door Left' },
  { id: 14, xFrac: 0.46, yFrac: -0.50, group: 'fender', massFrac: 0.024, name: 'Cab Steps Left' },
  { id: 15, xFrac: 0.50, yFrac: -0.42, group: 'bumper', massFrac: 0.026, name: 'Front-Left Bumper Flange' },

  // Cabover Upper Cabin & Roof (16..23, 8 nodes)
  { id: 16, xFrac: 0.48, yFrac: 0.0, group: 'hood', massFrac: 0.020, name: 'Front Radiator Service Grille' },
  { id: 17, xFrac: 0.44, yFrac: 0.0, group: 'windshield', massFrac: 0.024, name: 'Panoramic Windshield Base' },
  { id: 18, xFrac: 0.28, yFrac: 0.0, group: 'roof', massFrac: 0.028, name: 'High Roof Aerofoil' },
  { id: 19, xFrac: 0.38, yFrac: -0.32, group: 'roof', massFrac: 0.020, name: 'Cab Roof Front-Left' },
  { id: 20, xFrac: 0.38, yFrac: 0.32, group: 'roof', massFrac: 0.020, name: 'Cab Roof Front-Right' },
  { id: 21, xFrac: 0.12, yFrac: -0.32, group: 'roof', massFrac: 0.020, name: 'Cab Sleeper Rear-Left' },
  { id: 22, xFrac: 0.12, yFrac: 0.32, group: 'roof', massFrac: 0.020, name: 'Cab Sleeper Rear-Right' },
  { id: 23, xFrac: -0.30, yFrac: 0.0, group: 'trunk', massFrac: 0.025, name: 'Chassis Platform Mid-Spine' },

  // Heavy Duty Ladder Frame Rails & Powertrain (24..33, 10 nodes)
  { id: 24, xFrac: 0.32, yFrac: 0.0, group: 'engine', massFrac: 0.240, name: 'Heavy Turbo-Diesel V8 Block' },
  { id: 25, xFrac: 0.36, yFrac: -0.25, group: 'subframe', massFrac: 0.055, name: 'Left Front Leaf Spring Hanger' },
  { id: 26, xFrac: 0.36, yFrac: 0.25, group: 'subframe', massFrac: 0.055, name: 'Right Front Leaf Spring Hanger' },
  { id: 27, xFrac: -0.05, yFrac: -0.25, group: 'subframe', massFrac: 0.045, name: 'Left Frame Mid Crossmember' },
  { id: 28, xFrac: -0.05, yFrac: 0.25, group: 'subframe', massFrac: 0.045, name: 'Right Frame Mid Crossmember' },
  { id: 29, xFrac: 0.10, yFrac: 0.0, group: 'chassis_core', massFrac: 0.140, isFixed: true, name: 'Heavy Frame Cross-Gusset' },
  { id: 30, xFrac: -0.35, yFrac: -0.25, group: 'subframe', massFrac: 0.055, name: 'Left Bogie Axle Trunnion' },
  { id: 31, xFrac: -0.35, yFrac: 0.25, group: 'subframe', massFrac: 0.055, name: 'Right Bogie Axle Trunnion' },
  { id: 32, xFrac: -0.48, yFrac: -0.25, group: 'subframe', massFrac: 0.040, name: 'Left Rear Pintle Hook Rail' },
  { id: 33, xFrac: -0.48, yFrac: 0.25, group: 'subframe', massFrac: 0.040, name: 'Right Rear Pintle Hook Rail' }
];

function buildTruckCaboverBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = [];

  // Perimeter (Rigid steel shell)
  for (let i = 0; i < 16; i++) {
    const next = (i + 1) % 16;
    beams.push({
      nodeA: i,
      nodeB: next,
      type: 'structural',
      spring: DEFAULT_K_STRUCTURAL * 1.8,
      damp: DEFAULT_C_STRUCTURAL * 1.6,
      yieldDist: 0.55,
      breakDist: 22.0
    });
  }

  // Crosses
  const crosses: [number, number][] = [
    [0, 2], [0, 14], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [6, 8], [10, 8], [7, 9], [1, 15]
  ];
  for (const [a, b] of crosses) {
    beams.push({ nodeA: a, nodeB: b, type: 'cross', spring: DEFAULT_K_CROSS * 1.8, damp: DEFAULT_C_CROSS, yieldDist: 0.55, breakDist: 20.0 });
  }

  // Dual Heavy Ladder Frame Rails (continuous from front to back)
  // Left Rail: 15 -> 25 -> 12 -> 27 -> 30 -> 32 -> 9
  const leftRail: [number, number][] = [[15, 25], [25, 12], [12, 27], [27, 30], [30, 32], [32, 9]];
  for (const [a, b] of leftRail) {
    beams.push({ nodeA: a, nodeB: b, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.2, damp: DEFAULT_C_CHASSIS * 1.8, yieldDist: 1.1, breakDist: 38.0 });
  }

  // Right Rail: 1 -> 26 -> 4 -> 28 -> 31 -> 33 -> 7
  const rightRail: [number, number][] = [[1, 26], [26, 4], [4, 28], [28, 31], [31, 33], [33, 7]];
  for (const [a, b] of rightRail) {
    beams.push({ nodeA: a, nodeB: b, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.2, damp: DEFAULT_C_CHASSIS * 1.8, yieldDist: 1.1, breakDist: 38.0 });
  }

  // Ladder Crossmembers
  const crossmembers: [number, number][] = [
    [25, 26], [27, 28], [30, 31], [32, 33], [12, 29], [4, 29]
  ];
  for (const [a, b] of crossmembers) {
    beams.push({ nodeA: a, nodeB: b, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.0, damp: DEFAULT_C_CHASSIS * 1.8, yieldDist: 0.9, breakDist: 32.0 });
  }

  // Heavy Engine Mounts & Center Tunnel
  beams.push({ nodeA: 0, nodeB: 24, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.8, damp: DEFAULT_C_CHASSIS, yieldDist: 0.75, breakDist: 28.0 });
  beams.push({ nodeA: 24, nodeB: 25, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.6, damp: DEFAULT_C_CHASSIS, yieldDist: 0.70, breakDist: 26.0 });
  beams.push({ nodeA: 24, nodeB: 26, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.6, damp: DEFAULT_C_CHASSIS, yieldDist: 0.70, breakDist: 26.0 });
  beams.push({ nodeA: 24, nodeB: 29, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.0, damp: DEFAULT_C_CHASSIS, yieldDist: 0.90, breakDist: 32.0 });

  // Cab Cage
  beams.push({ nodeA: 17, nodeB: 19, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 1.5, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.6, breakDist: 24.0 });
  beams.push({ nodeA: 17, nodeB: 20, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 1.5, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.6, breakDist: 24.0 });
  beams.push({ nodeA: 19, nodeB: 20, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 1.5, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.6, breakDist: 24.0 });
  beams.push({ nodeA: 21, nodeB: 22, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 1.5, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.6, breakDist: 24.0 });
  beams.push({ nodeA: 19, nodeB: 21, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 1.5, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.6, breakDist: 24.0 });
  beams.push({ nodeA: 20, nodeB: 22, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 1.5, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.6, breakDist: 24.0 });

  // Latches
  beams.push({ nodeA: 1, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH * 1.8, damp: DEFAULT_C_LATCH * 1.5, yieldDist: 0.6, breakDist: 9.0, partTag: 'front_bumper' });
  beams.push({ nodeA: 15, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH * 1.8, damp: DEFAULT_C_LATCH * 1.5, yieldDist: 0.6, breakDist: 9.0, partTag: 'front_bumper' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.5, breakDist: 7.5, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.5, breakDist: 7.5, partTag: 'door_fr' });

  // Heavy anti-collapse supports
  beams.push({ nodeA: 0, nodeB: 29, type: 'support', spring: DEFAULT_K_SUPPORT * 2.8, damp: DEFAULT_C_SUPPORT * 2.0, yieldDist: 1.5, breakDist: 60.0 });
  beams.push({ nodeA: 3, nodeB: 13, type: 'support', spring: DEFAULT_K_SUPPORT * 2.0, damp: DEFAULT_C_SUPPORT, yieldDist: 1.2, breakDist: 50.0 });

  return beams;
}

export const PRESET_TRUCK_CABOVER: VehicleNodeBeamDefinition = {
  presetId: 'truck_cabover_heavy',
  name: 'Heavy Cabover Truck / Bus (Ladder Chassis)',
  perimeterCount: 16,
  nodes: TRUCK_CABOVER_NODES,
  beams: buildTruckCaboverBeams(),
  springScale: 2.2,
  dampScale: 1.8,
  yieldScale: 2.2,
  breakScale: 2.0,
  chassisStiffness: 2.6,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 10],
    rightNodeIds: [4, 3, 6],
    subframeLeftFL: 25,
    subframeRightFR: 26,
    subframeLeftRL: 30,
    subframeRightRR: 31,
    engineNodeId: 24,
    chassisCoreNodeId: 29
  }
};

// ----------------------------------------------------------------------------
// 5. AGRICULTURAL TRACTOR PRESET (24 Nodes, 66 Beams)
// MTZ-80/82 Cast iron backbone (engine, clutch bellhousing, transmission box)
// ----------------------------------------------------------------------------
const TRACTOR_NODES: NodeTemplate[] = [
  // Perimeter (0..11, 12 nodes)
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.045, name: 'Front Cast Iron Ballast Weight' },
  { id: 1, xFrac: 0.44, yFrac: 0.32, group: 'bumper', massFrac: 0.024, name: 'Front Axle Pivot Right' },
  { id: 2, xFrac: 0.20, yFrac: 0.35, group: 'fender', massFrac: 0.022, name: 'Engine Side Flange Right' },
  { id: 3, xFrac: -0.10, yFrac: 0.48, group: 'door', massFrac: 0.026, name: 'Cab Door Step Right' },
  { id: 4, xFrac: -0.42, yFrac: 0.50, group: 'quarter', massFrac: 0.035, name: 'Rear Huge Tire Mudguard Right' },
  { id: 5, xFrac: -0.50, yFrac: 0.25, group: 'bumper', massFrac: 0.025, name: 'Rear 3-Point Hitch Arm Right' },
  { id: 6, xFrac: -0.50, yFrac: -0.25, group: 'bumper', massFrac: 0.025, name: 'Rear 3-Point Hitch Arm Left' },
  { id: 7, xFrac: -0.42, yFrac: -0.50, group: 'quarter', massFrac: 0.035, name: 'Rear Huge Tire Mudguard Left' },
  { id: 8, xFrac: -0.10, yFrac: -0.48, group: 'door', massFrac: 0.026, name: 'Cab Door Step Left' },
  { id: 9, xFrac: 0.20, yFrac: -0.35, group: 'fender', massFrac: 0.022, name: 'Engine Side Flange Left' },
  { id: 10, xFrac: 0.44, yFrac: -0.32, group: 'bumper', massFrac: 0.024, name: 'Front Axle Pivot Left' },
  { id: 11, xFrac: 0.48, yFrac: 0.0, group: 'hood', massFrac: 0.022, name: 'Radiator Grille' },

  // Cab ROPS Safety Cage & Hood (12..17, 6 nodes)
  { id: 12, xFrac: 0.18, yFrac: 0.0, group: 'hood', massFrac: 0.028, name: 'Sheet Metal Hood Ridge' },
  { id: 13, xFrac: -0.05, yFrac: 0.0, group: 'windshield', massFrac: 0.030, name: 'Tractor Windshield Frame' },
  { id: 14, xFrac: -0.22, yFrac: 0.0, group: 'roof', massFrac: 0.032, name: 'ROPS Cab Roof Canopy' },
  { id: 15, xFrac: -0.12, yFrac: -0.32, group: 'roof', massFrac: 0.022, name: 'Cab Left ROPS Pillar' },
  { id: 16, xFrac: -0.12, yFrac: 0.32, group: 'roof', massFrac: 0.022, name: 'Cab Right ROPS Pillar' },
  { id: 17, xFrac: -0.32, yFrac: 0.0, group: 'trunk', massFrac: 0.025, name: 'Rear Window Glass' },

  // Cast Iron Backbone (18..23, 6 nodes)
  { id: 18, xFrac: 0.30, yFrac: 0.0, group: 'engine', massFrac: 0.260, name: 'D-240 Diesel Cast Iron Block' },
  { id: 19, xFrac: 0.10, yFrac: 0.0, group: 'subframe', massFrac: 0.090, name: 'Clutch Bellhousing Casting' },
  { id: 20, xFrac: -0.15, yFrac: 0.0, group: 'chassis_core', massFrac: 0.180, isFixed: true, name: 'Heavy Transmission & Rear Axle Trumpet' },
  { id: 21, xFrac: 0.35, yFrac: -0.24, group: 'subframe', massFrac: 0.045, name: 'Front Beam Axle Left Trunnion' },
  { id: 22, xFrac: 0.35, yFrac: 0.24, group: 'subframe', massFrac: 0.045, name: 'Front Beam Axle Right Trunnion' },
  { id: 23, xFrac: -0.44, yFrac: 0.0, group: 'subframe', massFrac: 0.060, name: 'PTO Shaft & Tow Hitch Casing' }
];

function buildTractorBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = [];
  const P = 12;

  // Perimeter
  for (let i = 0; i < P; i++) {
    const next = (i + 1) % P;
    beams.push({
      nodeA: i,
      nodeB: next,
      type: 'structural',
      spring: DEFAULT_K_STRUCTURAL * 1.5,
      damp: DEFAULT_C_STRUCTURAL * 1.4,
      yieldDist: 0.6,
      breakDist: 22.0
    });
  }

  // Cast Iron Spine (Extreme stiffness, almost indestructible backbone)
  beams.push({ nodeA: 0, nodeB: 18, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 3.5, damp: DEFAULT_C_CHASSIS * 2.0, yieldDist: 1.8, breakDist: 50.0 });
  beams.push({ nodeA: 18, nodeB: 19, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 4.0, damp: DEFAULT_C_CHASSIS * 2.5, yieldDist: 2.2, breakDist: 60.0 });
  beams.push({ nodeA: 19, nodeB: 20, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 4.0, damp: DEFAULT_C_CHASSIS * 2.5, yieldDist: 2.2, breakDist: 60.0 });
  beams.push({ nodeA: 20, nodeB: 23, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 3.5, damp: DEFAULT_C_CHASSIS * 2.0, yieldDist: 1.8, breakDist: 50.0 });

  // Front beam axle cross
  beams.push({ nodeA: 21, nodeB: 22, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.8, damp: DEFAULT_C_CHASSIS, yieldDist: 1.2, breakDist: 35.0 });
  beams.push({ nodeA: 18, nodeB: 21, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.5, damp: DEFAULT_C_CHASSIS, yieldDist: 1.2, breakDist: 35.0 });
  beams.push({ nodeA: 18, nodeB: 22, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.5, damp: DEFAULT_C_CHASSIS, yieldDist: 1.2, breakDist: 35.0 });

  // ROPS Safety Cage
  beams.push({ nodeA: 13, nodeB: 15, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 2.0, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.8, breakDist: 26.0 });
  beams.push({ nodeA: 13, nodeB: 16, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 2.0, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.8, breakDist: 26.0 });
  beams.push({ nodeA: 14, nodeB: 15, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 2.0, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.8, breakDist: 26.0 });
  beams.push({ nodeA: 14, nodeB: 16, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 2.0, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.8, breakDist: 26.0 });
  beams.push({ nodeA: 15, nodeB: 20, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.2, damp: DEFAULT_C_CHASSIS, yieldDist: 1.0, breakDist: 32.0 });
  beams.push({ nodeA: 16, nodeB: 20, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.2, damp: DEFAULT_C_CHASSIS, yieldDist: 1.0, breakDist: 32.0 });

  // Sheet metal hood latch
  beams.push({ nodeA: 11, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 0.7, damp: DEFAULT_C_LATCH, yieldDist: 0.3, breakDist: 5.0, partTag: 'hood' });
  beams.push({ nodeA: 12, nodeB: 13, type: 'latch', spring: DEFAULT_K_LATCH * 0.7, damp: DEFAULT_C_LATCH, yieldDist: 0.3, breakDist: 5.0, partTag: 'hood' });

  return beams;
}

export const PRESET_TRACTOR: VehicleNodeBeamDefinition = {
  presetId: 'tractor_backbone',
  name: 'Tractor Backbone (Cast Iron Spine & ROPS)',
  perimeterCount: 12,
  nodes: TRACTOR_NODES,
  beams: buildTractorBeams(),
  springScale: 2.4,
  dampScale: 1.9,
  yieldScale: 2.4,
  breakScale: 2.2,
  chassisStiffness: 3.2,
  tracking: {
    frontNodeIds: [0, 1, 10],
    rearNodeIds: [5, 6, 23],
    leftNodeIds: [7, 8, 9],
    rightNodeIds: [2, 3, 4],
    subframeLeftFL: 21,
    subframeRightFR: 22,
    subframeLeftRL: 7,
    subframeRightRR: 4,
    engineNodeId: 18,
    chassisCoreNodeId: 20
  }
};

// ----------------------------------------------------------------------------
// 6. MOTORCYCLE & MOPED PRESET (14 Nodes, 34 Beams)
// Telescopic front fork, duplex cradle frame, rear swingarm
// ----------------------------------------------------------------------------
const MOTORCYCLE_NODES: NodeTemplate[] = [
  // 0: Front tire contact point
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.08, name: 'Front Wheel Hub / Tire' },
  // 1: Lower fork sliders
  { id: 1, xFrac: 0.42, yFrac: 0.0, group: 'bumper', massFrac: 0.05, name: 'Fork Slider / Mudguard' },
  // 2: Upper fork stanchion left
  { id: 2, xFrac: 0.30, yFrac: -0.16, group: 'fender', massFrac: 0.04, name: 'Fork Tube Left' },
  // 3: Upper fork stanchion right
  { id: 3, xFrac: 0.30, yFrac: 0.16, group: 'fender', massFrac: 0.04, name: 'Fork Tube Right' },
  // 4: Triple clamp / steering head
  { id: 4, xFrac: 0.22, yFrac: 0.0, group: 'chassis_core', massFrac: 0.07, name: 'Triple Clamp / Headstock' },
  // 5: Handlebar left grip
  { id: 5, xFrac: 0.18, yFrac: -0.45, group: 'pillar', massFrac: 0.02, name: 'Handlebar Left Clutch' },
  // 6: Handlebar right grip
  { id: 6, xFrac: 0.18, yFrac: 0.45, group: 'pillar', massFrac: 0.02, name: 'Handlebar Right Throttle' },
  // 7: Teardrop fuel tank
  { id: 7, xFrac: 0.08, yFrac: 0.0, group: 'hood', massFrac: 0.06, name: 'Fuel Tank Spine' },
  // 8: Engine block / crankcase
  { id: 8, xFrac: 0.00, yFrac: 0.0, group: 'engine', massFrac: 0.32, name: 'Engine Crankcase & Cylinders' },
  // 9: Dual seat / subframe
  { id: 9, xFrac: -0.16, yFrac: 0.0, group: 'roof', massFrac: 0.08, name: 'Seat & Subframe' },
  // 10: Swingarm pivot (Fixed central reference)
  { id: 10, xFrac: -0.08, yFrac: 0.0, group: 'subframe', massFrac: 0.09, isFixed: true, name: 'Swingarm Pivot Pin' },
  // 11: Rear shock mount / rear fender
  { id: 11, xFrac: -0.32, yFrac: 0.0, group: 'trunk', massFrac: 0.04, name: 'Rear Shock Upper Mount' },
  // 12: Rear wheel axle
  { id: 12, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.09, name: 'Rear Wheel Axle / Chain Sprocket' },
  // 13: Chrome exhaust silencer
  { id: 13, xFrac: -0.28, yFrac: 0.26, group: 'quarter', massFrac: 0.04, name: 'Exhaust Muffler' }
];

function buildMotorcycleBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = [];

  // Telescopic front fork
  beams.push({ nodeA: 0, nodeB: 1, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 0.8, damp: DEFAULT_C_STRUCTURAL * 1.5, yieldDist: 0.30, breakDist: 7.0 });
  beams.push({ nodeA: 1, nodeB: 2, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 0.9, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.35, breakDist: 8.0 });
  beams.push({ nodeA: 1, nodeB: 3, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 0.9, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.35, breakDist: 8.0 });
  beams.push({ nodeA: 2, nodeB: 4, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.40, breakDist: 9.0 });
  beams.push({ nodeA: 3, nodeB: 4, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.40, breakDist: 9.0 });
  beams.push({ nodeA: 2, nodeB: 3, type: 'cross', spring: DEFAULT_K_CROSS, damp: DEFAULT_C_CROSS, yieldDist: 0.35, breakDist: 8.0 });

  // Handlebars (Breakable latch when colliding)
  beams.push({ nodeA: 4, nodeB: 5, type: 'latch', spring: DEFAULT_K_LATCH * 0.6, damp: DEFAULT_C_LATCH, yieldDist: 0.25, breakDist: 4.5 });
  beams.push({ nodeA: 4, nodeB: 6, type: 'latch', spring: DEFAULT_K_LATCH * 0.6, damp: DEFAULT_C_LATCH, yieldDist: 0.25, breakDist: 4.5 });

  // Main Cradle Frame
  beams.push({ nodeA: 4, nodeB: 7, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.2, damp: DEFAULT_C_CHASSIS, yieldDist: 0.60, breakDist: 18.0 });
  beams.push({ nodeA: 7, nodeB: 8, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.2, damp: DEFAULT_C_CHASSIS, yieldDist: 0.60, breakDist: 18.0 });
  beams.push({ nodeA: 4, nodeB: 8, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.3, damp: DEFAULT_C_CHASSIS, yieldDist: 0.65, breakDist: 20.0 });
  beams.push({ nodeA: 8, nodeB: 10, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.5, damp: DEFAULT_C_CHASSIS, yieldDist: 0.70, breakDist: 22.0 });
  beams.push({ nodeA: 7, nodeB: 9, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 14.0 });
  beams.push({ nodeA: 9, nodeB: 10, type: 'structural', spring: DEFAULT_K_STRUCTURAL, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.45, breakDist: 14.0 });
  beams.push({ nodeA: 9, nodeB: 11, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 0.8, damp: DEFAULT_C_STRUCTURAL, yieldDist: 0.40, breakDist: 12.0 });

  // Rear Swingarm & Shock
  beams.push({ nodeA: 10, nodeB: 12, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.2, damp: DEFAULT_C_CHASSIS, yieldDist: 0.60, breakDist: 18.0 });
  beams.push({ nodeA: 11, nodeB: 12, type: 'structural', spring: DEFAULT_K_STRUCTURAL * 0.9, damp: DEFAULT_C_STRUCTURAL * 1.5, yieldDist: 0.40, breakDist: 12.0 });

  // Exhaust
  beams.push({ nodeA: 8, nodeB: 13, type: 'latch', spring: DEFAULT_K_LATCH * 0.7, damp: DEFAULT_C_LATCH, yieldDist: 0.30, breakDist: 5.0 });
  beams.push({ nodeA: 10, nodeB: 13, type: 'latch', spring: DEFAULT_K_LATCH * 0.7, damp: DEFAULT_C_LATCH, yieldDist: 0.30, breakDist: 5.0 });

  return beams;
}

export const PRESET_MOTORCYCLE: VehicleNodeBeamDefinition = {
  presetId: 'motorcycle_cradle',
  name: 'Motorcycle (Duplex Frame & Telescopic Fork)',
  perimeterCount: 14,
  nodes: MOTORCYCLE_NODES,
  beams: buildMotorcycleBeams(),
  springScale: 0.75,
  dampScale: 0.85,
  yieldScale: 0.65,
  breakScale: 0.70,
  chassisStiffness: 0.80,
  tracking: {
    frontNodeIds: [0, 1, 4],
    rearNodeIds: [11, 12],
    leftNodeIds: [5, 2],
    rightNodeIds: [6, 3],
    subframeLeftFL: 2,
    subframeRightFR: 3,
    subframeLeftRL: 12,
    subframeRightRR: 12,
    engineNodeId: 8,
    chassisCoreNodeId: 10
  }
};

// ----------------------------------------------------------------------------
// 7. TRAILER FLATBED & TANKER PRESET (22 Nodes, 58 Beams)
// Non-motorized tubular chassis, A-frame tongue, tandem axle suspension
// ----------------------------------------------------------------------------
const TRAILER_NODES: NodeTemplate[] = [
  // 0: Coupler / Hitch ball receiver
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.040, name: 'Hitch Coupler / Kingpin' },
  // Perimeter (1..12, 12 nodes)
  { id: 1, xFrac: 0.35, yFrac: 0.40, group: 'bumper', massFrac: 0.030, name: 'Front-Right Frame Corner' },
  { id: 2, xFrac: 0.15, yFrac: 0.48, group: 'fender', massFrac: 0.035, name: 'Right Side Deck Edge 1' },
  { id: 3, xFrac: -0.05, yFrac: 0.48, group: 'door', massFrac: 0.035, name: 'Right Side Deck Edge 2' },
  { id: 4, xFrac: -0.25, yFrac: 0.48, group: 'quarter', massFrac: 0.035, name: 'Right Tandem Wheel Arch' },
  { id: 5, xFrac: -0.45, yFrac: 0.44, group: 'quarter', massFrac: 0.030, name: 'Rear-Right Frame Corner' },
  { id: 6, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.035, name: 'Rear Underride Bar' },
  { id: 7, xFrac: -0.45, yFrac: -0.44, group: 'quarter', massFrac: 0.030, name: 'Rear-Left Frame Corner' },
  { id: 8, xFrac: -0.25, yFrac: -0.48, group: 'quarter', massFrac: 0.035, name: 'Left Tandem Wheel Arch' },
  { id: 9, xFrac: -0.05, yFrac: -0.48, group: 'door', massFrac: 0.035, name: 'Left Side Deck Edge 2' },
  { id: 10, xFrac: 0.15, yFrac: -0.48, group: 'fender', massFrac: 0.035, name: 'Left Side Deck Edge 1' },
  { id: 11, xFrac: 0.35, yFrac: -0.40, group: 'bumper', massFrac: 0.030, name: 'Front-Left Frame Corner' },
  { id: 12, xFrac: 0.35, yFrac: 0.0, group: 'hood', massFrac: 0.035, name: 'A-Frame Crossmember' },

  // Heavy I-Beam Rails & Suspension (13..21, 9 nodes)
  { id: 13, xFrac: 0.10, yFrac: -0.26, group: 'subframe', massFrac: 0.055, name: 'Main I-Beam Left Front' },
  { id: 14, xFrac: 0.10, yFrac: 0.26, group: 'subframe', massFrac: 0.055, name: 'Main I-Beam Right Front' },
  { id: 15, xFrac: -0.10, yFrac: -0.26, group: 'subframe', massFrac: 0.060, name: 'Main I-Beam Left Center' },
  { id: 16, xFrac: -0.10, yFrac: 0.26, group: 'subframe', massFrac: 0.060, name: 'Main I-Beam Right Center' },
  { id: 17, xFrac: -0.32, yFrac: -0.26, group: 'subframe', massFrac: 0.065, name: 'Tandem Leaf Hanger Left' },
  { id: 18, xFrac: -0.32, yFrac: 0.26, group: 'subframe', massFrac: 0.065, name: 'Tandem Leaf Hanger Right' },
  { id: 19, xFrac: -0.10, yFrac: 0.0, group: 'chassis_core', massFrac: 0.150, isFixed: true, name: 'Trailer Deck Spine' },
  { id: 20, xFrac: -0.32, yFrac: 0.0, group: 'subframe', massFrac: 0.060, name: 'Axle Bogie Equalizer' },
  { id: 21, xFrac: -0.46, yFrac: 0.0, group: 'subframe', massFrac: 0.040, name: 'Rear Cross Sill' }
];

function buildTrailerBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = [];

  // A-Frame Drawbar tongue (0 connects to 1, 11, 12)
  beams.push({ nodeA: 0, nodeB: 12, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.8, damp: DEFAULT_C_CHASSIS, yieldDist: 0.8, breakDist: 30.0 });
  beams.push({ nodeA: 0, nodeB: 1, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.6, damp: DEFAULT_C_CHASSIS, yieldDist: 0.8, breakDist: 30.0 });
  beams.push({ nodeA: 0, nodeB: 11, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.6, damp: DEFAULT_C_CHASSIS, yieldDist: 0.8, breakDist: 30.0 });

  // Perimeter
  for (let i = 1; i <= 11; i++) {
    const next = i === 11 ? 1 : i + 1;
    beams.push({
      nodeA: i,
      nodeB: next,
      type: 'structural',
      spring: DEFAULT_K_STRUCTURAL * 1.5,
      damp: DEFAULT_C_STRUCTURAL * 1.3,
      yieldDist: 0.55,
      breakDist: 22.0
    });
  }

  // Crosses
  const crosses: [number, number][] = [
    [1, 3], [11, 9], [2, 4], [10, 8], [3, 5], [9, 7], [4, 6], [8, 6], [1, 11]
  ];
  for (const [a, b] of crosses) {
    beams.push({ nodeA: a, nodeB: b, type: 'cross', spring: DEFAULT_K_CROSS * 1.5, damp: DEFAULT_C_CROSS, yieldDist: 0.50, breakDist: 20.0 });
  }

  // Longitudinal I-Beams
  const leftIBeam: [number, number][] = [[11, 13], [13, 15], [15, 17], [17, 7]];
  for (const [a, b] of leftIBeam) {
    beams.push({ nodeA: a, nodeB: b, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.0, damp: DEFAULT_C_CHASSIS * 1.5, yieldDist: 1.0, breakDist: 35.0 });
  }

  const rightIBeam: [number, number][] = [[1, 14], [14, 16], [16, 18], [18, 5]];
  for (const [a, b] of rightIBeam) {
    beams.push({ nodeA: a, nodeB: b, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 2.0, damp: DEFAULT_C_CHASSIS * 1.5, yieldDist: 1.0, breakDist: 35.0 });
  }

  // Deck Crossmembers
  beams.push({ nodeA: 13, nodeB: 14, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.6, damp: DEFAULT_C_CHASSIS, yieldDist: 0.8, breakDist: 28.0 });
  beams.push({ nodeA: 15, nodeB: 16, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.6, damp: DEFAULT_C_CHASSIS, yieldDist: 0.8, breakDist: 28.0 });
  beams.push({ nodeA: 17, nodeB: 18, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.6, damp: DEFAULT_C_CHASSIS, yieldDist: 0.8, breakDist: 28.0 });
  beams.push({ nodeA: 15, nodeB: 19, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.8, damp: DEFAULT_C_CHASSIS, yieldDist: 0.9, breakDist: 30.0 });
  beams.push({ nodeA: 16, nodeB: 19, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.8, damp: DEFAULT_C_CHASSIS, yieldDist: 0.9, breakDist: 30.0 });
  beams.push({ nodeA: 19, nodeB: 20, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.8, damp: DEFAULT_C_CHASSIS, yieldDist: 0.9, breakDist: 30.0 });
  beams.push({ nodeA: 20, nodeB: 21, type: 'chassis_rail', spring: DEFAULT_K_CHASSIS * 1.8, damp: DEFAULT_C_CHASSIS, yieldDist: 0.9, breakDist: 30.0 });

  return beams;
}

export const PRESET_TRAILER: VehicleNodeBeamDefinition = {
  presetId: 'trailer_chassis',
  name: 'Heavy Flatbed / Tanker Trailer (I-Beam Chassis)',
  perimeterCount: 13,
  nodes: TRAILER_NODES,
  beams: buildTrailerBeams(),
  springScale: 2.8,
  dampScale: 2.0,
  yieldScale: 2.5,
  breakScale: 2.2,
  chassisStiffness: 3.0,
  tracking: {
    frontNodeIds: [0, 1, 11],
    rearNodeIds: [5, 6, 7],
    leftNodeIds: [8, 9, 10],
    rightNodeIds: [2, 3, 4],
    subframeLeftFL: 13,
    subframeRightFR: 14,
    subframeLeftRL: 17,
    subframeRightRR: 18,
    engineNodeId: 19, // No engine, points to center spine
    chassisCoreNodeId: 19
  }
};

// ----------------------------------------------------------------------------
// 8. PRESET REGISTRY & VEHICLE TYPE RESOLVER
// ----------------------------------------------------------------------------
const MESH_PRESET_REGISTRY = new Map<string, VehicleNodeBeamDefinition>();

// Seed default presets
MESH_PRESET_REGISTRY.set(PRESET_SEDAN.presetId, PRESET_SEDAN);
MESH_PRESET_REGISTRY.set(PRESET_HATCHBACK_COMPACT.presetId, PRESET_HATCHBACK_COMPACT);
MESH_PRESET_REGISTRY.set(PRESET_SUPERCAR.presetId, PRESET_SUPERCAR);
MESH_PRESET_REGISTRY.set(PRESET_TRUCK_CABOVER.presetId, PRESET_TRUCK_CABOVER);
MESH_PRESET_REGISTRY.set(PRESET_TRACTOR.presetId, PRESET_TRACTOR);
MESH_PRESET_REGISTRY.set(PRESET_MOTORCYCLE.presetId, PRESET_MOTORCYCLE);
MESH_PRESET_REGISTRY.set(PRESET_TRAILER.presetId, PRESET_TRAILER);

/**
 * Maps game vehicle model types (`carType`) to their corresponding mesh preset.
 */
export const VEHICLE_TYPE_TO_PRESET_MAP: Record<string, string> = {
  // Hatchbacks & Compacts
  compact_matiz: 'hatchback_compact',
  liftback_tavria: 'hatchback_compact',
  hatch_samara: 'hatchback_compact',
  hatch_hot: 'hatchback_compact',
  micro_car: 'hatchback_compact',
  classic_compact: 'hatchback_compact',
  retro_bubble: 'hatchback_compact',

  // Supercars & Sportscars
  supercar: 'supercar_mid_engine',
  sports: 'supercar_mid_engine',
  coupe_gt: 'supercar_mid_engine',

  // Heavy Trucks, Buses & Road Machinery
  truck_flatbed: 'truck_cabover_heavy',
  truck_covered: 'truck_cabover_heavy',
  truck_tanker: 'truck_cabover_heavy',
  truck_water: 'truck_cabover_heavy',
  truck_tow: 'truck_cabover_heavy',
  truck_armored: 'truck_cabover_heavy',
  delivery_truck: 'truck_cabover_heavy',
  cement_mixer: 'truck_cabover_heavy',
  garbage_truck: 'truck_cabover_heavy',
  fire_engine: 'truck_cabover_heavy',
  fire_ladder: 'truck_cabover_heavy',
  bus: 'truck_cabover_heavy',
  paver_asphalt_wheeled: 'truck_cabover_heavy',
  roller_heavy_tandem: 'truck_cabover_heavy',
  roller_compact_sidewalk: 'truck_cabover_heavy',
  roller_pneumatic: 'truck_cabover_heavy',

  // Tractors
  tractor_mtz80: 'tractor_backbone',
  tractor_mtz82: 'tractor_backbone',
  tractor_mtz80_old: 'tractor_backbone',

  // Motorcycles & Mopeds
  moto_izh_jupiter: 'motorcycle_cradle',
  moto_ural_sidecar: 'motorcycle_cradle',
  moto_jawa350: 'motorcycle_cradle',
  moto_sport: 'motorcycle_cradle',
  moto_chopper: 'motorcycle_cradle',
  moped_soviet: 'motorcycle_cradle',

  // Trailers
  trailer_flatbed_2axle: 'trailer_chassis',
  trailer_barrel: 'trailer_chassis',
  trailer_vacuum: 'trailer_chassis',
  trailer_semi_lowboy: 'trailer_chassis'
};

/**
 * Registers or updates a vehicle mesh preset in the runtime registry.
 */
export function registerVehicleMeshPreset(presetId: string, definition: VehicleNodeBeamDefinition): void {
  MESH_PRESET_REGISTRY.set(presetId, definition);
}

/**
 * Returns a list of all currently registered mesh presets.
 */
export function listAllMeshPresets(): VehicleNodeBeamDefinition[] {
  return Array.from(MESH_PRESET_REGISTRY.values());
}

/**
 * Resolves the Node-Beam definition for a vehicle.
 * Checks for per-vehicle custom override first, then archetype mapping, falling back to sedan.
 */
export function getVehicleNodeBeamDefinition(
  carType?: string,
  customOverride?: Partial<VehicleNodeBeamDefinition>
): VehicleNodeBeamDefinition {
  const presetKey = carType ? VEHICLE_TYPE_TO_PRESET_MAP[carType] || carType : 'sedan_standard';
  const baseDef = MESH_PRESET_REGISTRY.get(presetKey) || PRESET_SEDAN;

  if (!customOverride) {
    return baseDef;
  }

  // Merge custom overrides
  return {
    ...baseDef,
    ...customOverride,
    nodes: customOverride.nodes ? customOverride.nodes : baseDef.nodes,
    beams: customOverride.beams ? customOverride.beams : baseDef.beams,
    tracking: {
      ...baseDef.tracking,
      ...(customOverride.tracking || {})
    }
  };
}

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
// 1. PICKUP TRUCK PRESET (Ladder Frame: Cab + Recessed Open Cargo Bed)
// ============================================================================
const PICKUP_NODES: NodeTemplate[] = [
  // Outer perimeter (0..15) - exactly matching getVehicleBasePolygonRaw isPickup
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.028, name: 'Steel Push Bumper Center' },
  { id: 1, xFrac: 0.48, yFrac: 0.44, group: 'bumper', massFrac: 0.022, name: 'Front-Right Bumper Corner' },
  { id: 2, xFrac: 0.45, yFrac: 0.50, group: 'fender', massFrac: 0.024, name: 'Front-Right Fender Arch' },
  { id: 3, xFrac: 0.17, yFrac: 0.50, group: 'door', massFrac: 0.026, name: 'Cab Door Sill Right' },
  { id: 4, xFrac: 0.00, yFrac: 0.50, group: 'pillar', massFrac: 0.026, name: 'Cab Rear Wall Right' },
  { id: 5, xFrac: -0.27, yFrac: 0.50, group: 'quarter', massFrac: 0.028, name: 'Bed Side Flange Right' },
  { id: 6, xFrac: -0.47, yFrac: 0.48, group: 'quarter', massFrac: 0.024, name: 'Bed Rear Corner Right' },
  { id: 7, xFrac: -0.49, yFrac: 0.35, group: 'bumper', massFrac: 0.020, name: 'Rear Step Bumper Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.025, name: 'Tailgate Bumper Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.35, group: 'bumper', massFrac: 0.020, name: 'Rear Step Bumper Left' },
  { id: 10, xFrac: -0.47, yFrac: -0.48, group: 'quarter', massFrac: 0.024, name: 'Bed Rear Corner Left' },
  { id: 11, xFrac: -0.27, yFrac: -0.50, group: 'quarter', massFrac: 0.028, name: 'Bed Side Flange Left' },
  { id: 12, xFrac: 0.00, yFrac: -0.50, group: 'pillar', massFrac: 0.026, name: 'Cab Rear Wall Left' },
  { id: 13, xFrac: 0.17, yFrac: -0.50, group: 'door', massFrac: 0.026, name: 'Cab Door Sill Left' },
  { id: 14, xFrac: 0.45, yFrac: -0.50, group: 'fender', massFrac: 0.024, name: 'Front-Left Fender Arch' },
  { id: 15, xFrac: 0.48, yFrac: -0.44, group: 'bumper', massFrac: 0.022, name: 'Front-Left Bumper Corner' },

  // Cab Greenhouse & Open Bed Floor (16..24, 9 nodes)
  { id: 16, xFrac: 0.25, yFrac: 0.0, group: 'hood', massFrac: 0.028, name: 'Heavy Hood Center' },
  { id: 17, xFrac: 0.14, yFrac: 0.0, group: 'windshield', massFrac: 0.030, name: 'Windshield Cowl Seam' },
  { id: 18, xFrac: 0.06, yFrac: 0.0, group: 'roof', massFrac: 0.032, name: 'Cab Roof Apex' },
  { id: 19, xFrac: 0.08, yFrac: -0.21, group: 'roof', massFrac: 0.022, name: 'Cab Roof Front-Left' },
  { id: 20, xFrac: 0.08, yFrac: 0.21, group: 'roof', massFrac: 0.022, name: 'Cab Roof Front-Right' },
  { id: 21, xFrac: -0.02, yFrac: 0.0, group: 'roof', massFrac: 0.026, name: 'Cab Vertical Back Window' },
  { id: 22, xFrac: -0.22, yFrac: 0.0, group: 'trunk', massFrac: 0.030, name: 'Recessed Bed Floor Center' },
  { id: 23, xFrac: -0.44, yFrac: 0.0, group: 'trunk', massFrac: 0.024, name: 'Rear Tailgate Inner Sill' },
  { id: 24, xFrac: -0.02, yFrac: 0.0, group: 'chassis_core', massFrac: 0.160, isFixed: true, name: 'Cab-to-Frame Gusset Core' },

  // Heavy Duty Ladder Frame Rails & Powertrain (25..30, 6 nodes)
  { id: 25, xFrac: 0.26, yFrac: 0.0, group: 'engine', massFrac: 0.220, name: 'High-Torque V8 Engine Block' },
  { id: 26, xFrac: 0.22, yFrac: -0.26, group: 'subframe', massFrac: 0.065, name: 'Front-Left Coil/Shock Tower' },
  { id: 27, xFrac: 0.22, yFrac: 0.26, group: 'subframe', massFrac: 0.065, name: 'Front-Right Coil/Shock Tower' },
  { id: 28, xFrac: -0.26, yFrac: -0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Left Heavy Leaf Perch' },
  { id: 29, xFrac: -0.26, yFrac: 0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Right Heavy Leaf Perch' },
  { id: 30, xFrac: -0.46, yFrac: 0.0, group: 'subframe', massFrac: 0.040, name: 'Rear Frame Hitch Receiver' }
];

function buildPickupBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.40, 0.52, 22.0, 1.2);

  // Crosses
  const crosses: [number, number][] = [
    [0, 26], [0, 27], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [8, 28], [8, 29]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 1.3, DEFAULT_C_CROSS, 0.48, 18.0);

  // Continuous Ladder Frame Rails from Bumper to Bumper
  const leftRail: [number, number][] = [[15, 26], [26, 14], [26, 17], [17, 12], [12, 28], [28, 10], [10, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.5, DEFAULT_C_CHASSIS * 1.3, 0.85, 32.0);

  const rightRail: [number, number][] = [[1, 27], [27, 2], [27, 17], [17, 4], [4, 29], [29, 6], [6, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.5, DEFAULT_C_CHASSIS * 1.3, 0.85, 32.0);

  const centerRail: [number, number][] = [[0, 25], [25, 17], [17, 24], [24, 22], [22, 30], [30, 8]];
  addBeamChain(beams, centerRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.6, DEFAULT_C_CHASSIS * 1.3, 0.90, 34.0);

  addBeamChain(beams, [[26, 27], [28, 29]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.4, DEFAULT_C_CHASSIS, 0.70, 26.0);
  addBeamChain(beams, [[25, 26], [25, 27]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.2, DEFAULT_C_CHASSIS, 0.60, 22.0);
  addBeamChain(beams, [[12, 24], [4, 24]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.3, DEFAULT_C_CHASSIS, 0.75, 28.0);

  // Enclosed Cab Cage & Recessed Bed Sills
  addBeamChain(beams, [
    [17, 19], [17, 20], [19, 20], [18, 19], [18, 20],
    [19, 21], [20, 21], [12, 21], [4, 21],
    [21, 22], [22, 23], [4, 5], [12, 11]
  ], 'structural', DEFAULT_K_STRUCTURAL * 1.2, DEFAULT_C_STRUCTURAL, 0.50, 20.0);

  // Latches
  beams.push({ nodeA: 15, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH * 1.3, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 1, nodeB: 27, type: 'latch', spring: DEFAULT_K_LATCH * 1.3, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 0, nodeB: 16, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.38, breakDist: 6.0, partTag: 'hood' });
  beams.push({ nodeA: 16, nodeB: 17, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 8.0, partTag: 'hood' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 6.2, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 6.2, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH * 1.1, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 6.5, partTag: 'trunk' });
  beams.push({ nodeA: 9, nodeB: 28, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.0, partTag: 'rear_bumper' });
  beams.push({ nodeA: 7, nodeB: 29, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.0, partTag: 'rear_bumper' });

  // Supports
  beams.push({ nodeA: 0, nodeB: 24, type: 'support', spring: DEFAULT_K_SUPPORT * 2.0, damp: DEFAULT_C_SUPPORT, yieldDist: 1.2, breakDist: 55.0 });
  beams.push({ nodeA: 25, nodeB: 24, type: 'support', spring: DEFAULT_K_SUPPORT * 2.0, damp: DEFAULT_C_SUPPORT, yieldDist: 1.1, breakDist: 55.0 });

  return beams;
}

export const PRESET_PICKUP: VehicleNodeBeamDefinition = {
  presetId: 'pickup_truck',
  name: 'Heavy Pickup Truck (Full Ladder Chassis & Recessed Bed)',
  perimeterCount: 16,
  nodes: PICKUP_NODES,
  beams: buildPickupBeams(),
  springScale: 1.25,
  dampScale: 1.15,
  yieldScale: 1.20,
  breakScale: 1.15,
  chassisStiffness: 1.40,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 11],
    rightNodeIds: [4, 3, 5],
    subframeLeftFL: 26,
    subframeRightFR: 27,
    subframeLeftRL: 28,
    subframeRightRR: 29,
    engineNodeId: 25,
    chassisCoreNodeId: 24
  }
};

// ============================================================================
// 2. BOXY SUV & 4X4 OFF-ROADER PRESET (Box Unibody / Heavy 4x4 Frame)
// ============================================================================
const SUV_NODES: NodeTemplate[] = [
  // Perimeter (0..15) - exactly matching getVehicleBasePolygonRaw isBoxyRig
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.028, name: 'Heavy Winch Bumper Center' },
  { id: 1, xFrac: 0.49, yFrac: 0.47, group: 'bumper', massFrac: 0.024, name: 'Front-Right Bumper Flange' },
  { id: 2, xFrac: 0.45, yFrac: 0.50, group: 'fender', massFrac: 0.024, name: 'Front-Right Fender Flare' },
  { id: 3, xFrac: 0.25, yFrac: 0.50, group: 'door', massFrac: 0.026, name: 'Front-Right Rocker Sill' },
  { id: 4, xFrac: 0.00, yFrac: 0.50, group: 'pillar', massFrac: 0.026, name: 'Right B-Pillar Rocker' },
  { id: 5, xFrac: -0.25, yFrac: 0.50, group: 'door', massFrac: 0.026, name: 'Rear-Right Rocker Sill' },
  { id: 6, xFrac: -0.46, yFrac: 0.49, group: 'quarter', massFrac: 0.026, name: 'Boxy D-Pillar Corner Right' },
  { id: 7, xFrac: -0.49, yFrac: 0.28, group: 'bumper', massFrac: 0.020, name: 'Rear Bumper Flange Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.025, name: 'Rear Bumper / Tire Carrier Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.28, group: 'bumper', massFrac: 0.020, name: 'Rear Bumper Flange Left' },
  { id: 10, xFrac: -0.46, yFrac: -0.49, group: 'quarter', massFrac: 0.026, name: 'Boxy D-Pillar Corner Left' },
  { id: 11, xFrac: -0.25, yFrac: -0.50, group: 'door', massFrac: 0.026, name: 'Rear-Left Rocker Sill' },
  { id: 12, xFrac: 0.00, yFrac: -0.50, group: 'pillar', massFrac: 0.026, name: 'Left B-Pillar Rocker' },
  { id: 13, xFrac: 0.25, yFrac: -0.50, group: 'door', massFrac: 0.026, name: 'Front-Left Rocker Sill' },
  { id: 14, xFrac: 0.45, yFrac: -0.50, group: 'fender', massFrac: 0.024, name: 'Front-Left Fender Flare' },
  { id: 15, xFrac: 0.49, yFrac: -0.47, group: 'bumper', massFrac: 0.024, name: 'Front-Left Bumper Flange' },

  // Tall Greenhouse & Roof Cage (16..24, 9 nodes)
  { id: 16, xFrac: 0.25, yFrac: 0.0, group: 'hood', massFrac: 0.028, name: 'Flat Hood Center' },
  { id: 17, xFrac: 0.12, yFrac: 0.0, group: 'windshield', massFrac: 0.030, name: 'Upright Windshield Base' },
  { id: 18, xFrac: -0.04, yFrac: 0.0, group: 'roof', massFrac: 0.035, name: 'High Roof Center Rib' },
  { id: 19, xFrac: 0.08, yFrac: -0.23, group: 'roof', massFrac: 0.022, name: 'Roof A-Pillar Left' },
  { id: 20, xFrac: 0.08, yFrac: 0.23, group: 'roof', massFrac: 0.022, name: 'Roof A-Pillar Right' },
  { id: 21, xFrac: -0.16, yFrac: -0.23, group: 'roof', massFrac: 0.022, name: 'Roof C-Pillar Left' },
  { id: 22, xFrac: -0.16, yFrac: 0.23, group: 'roof', massFrac: 0.022, name: 'Roof C-Pillar Right' },
  { id: 23, xFrac: -0.40, yFrac: 0.0, group: 'trunk', massFrac: 0.028, name: 'Vertical Rear Tailgate Header' },
  { id: 24, xFrac: -0.04, yFrac: 0.0, group: 'chassis_core', massFrac: 0.160, isFixed: true, name: '4x4 Transfer Case & Tunnel' },

  // Powertrain & 4x4 Axle Crossmembers (25..29, 5 nodes)
  { id: 25, xFrac: 0.26, yFrac: 0.0, group: 'engine', massFrac: 0.210, name: 'Inline/V6 4x4 Engine Block' },
  { id: 26, xFrac: 0.22, yFrac: -0.26, group: 'subframe', massFrac: 0.065, name: 'Front-Left Axle Trunnion' },
  { id: 27, xFrac: 0.22, yFrac: 0.26, group: 'subframe', massFrac: 0.065, name: 'Front-Right Axle Trunnion' },
  { id: 28, xFrac: -0.26, yFrac: -0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Left Solid Axle Hanger' },
  { id: 29, xFrac: -0.26, yFrac: 0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Right Solid Axle Hanger' }
];

function buildSUVBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.40, 0.52, 20.0, 1.15);

  const crosses: [number, number][] = [
    [0, 26], [0, 27], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [8, 28], [8, 29]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 1.2, DEFAULT_C_CROSS, 0.46, 17.0);

  const leftRail: [number, number][] = [[15, 26], [26, 14], [26, 17], [17, 12], [12, 28], [28, 10], [10, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.3, DEFAULT_C_CHASSIS * 1.2, 0.78, 30.0);

  const rightRail: [number, number][] = [[1, 27], [27, 2], [27, 17], [17, 4], [4, 29], [29, 6], [6, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.3, DEFAULT_C_CHASSIS * 1.2, 0.78, 30.0);

  const centerRail: [number, number][] = [[0, 25], [25, 17], [17, 24], [24, 23], [23, 8]];
  addBeamChain(beams, centerRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.4, DEFAULT_C_CHASSIS * 1.2, 0.85, 32.0);

  addBeamChain(beams, [[26, 27], [28, 29]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.2, DEFAULT_C_CHASSIS, 0.65, 24.0);
  addBeamChain(beams, [[25, 26], [25, 27]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.1, DEFAULT_C_CHASSIS, 0.55, 20.0);
  addBeamChain(beams, [[12, 24], [4, 24]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.2, DEFAULT_C_CHASSIS, 0.70, 26.0);

  // Roof & Upright D-Pillars
  const roofCage: [number, number][] = [
    [17, 19], [17, 20], [19, 20],
    [19, 21], [20, 22], [21, 22],
    [18, 19], [18, 20], [18, 21], [18, 22],
    [12, 19], [4, 20], [12, 21], [4, 22],
    [21, 23], [22, 23], [10, 23], [6, 23]
  ];
  addBeamChain(beams, roofCage, 'structural', DEFAULT_K_STRUCTURAL * 1.15, DEFAULT_C_STRUCTURAL, 0.48, 19.0);

  beams.push({ nodeA: 15, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 7.0, partTag: 'front_bumper' });
  beams.push({ nodeA: 1, nodeB: 27, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 7.0, partTag: 'front_bumper' });
  beams.push({ nodeA: 0, nodeB: 16, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.38, breakDist: 6.0, partTag: 'hood' });
  beams.push({ nodeA: 16, nodeB: 17, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.5, partTag: 'hood' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.0, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.0, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'trunk' });
  beams.push({ nodeA: 9, nodeB: 28, type: 'latch', spring: DEFAULT_K_LATCH * 1.1, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 6.8, partTag: 'rear_bumper' });
  beams.push({ nodeA: 7, nodeB: 29, type: 'latch', spring: DEFAULT_K_LATCH * 1.1, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 6.8, partTag: 'rear_bumper' });

  beams.push({ nodeA: 0, nodeB: 17, type: 'support', spring: DEFAULT_K_SUPPORT * 1.5, damp: DEFAULT_C_SUPPORT, yieldDist: 1.0, breakDist: 48.0 });
  beams.push({ nodeA: 25, nodeB: 24, type: 'support', spring: DEFAULT_K_SUPPORT * 1.8, damp: DEFAULT_C_SUPPORT, yieldDist: 1.1, breakDist: 52.0 });

  return beams;
}

export const PRESET_SUV_4X4: VehicleNodeBeamDefinition = {
  presetId: 'suv_boxy_4x4',
  name: 'Boxy SUV / 4x4 Off-Roader (Reinforced Unibody / Ladder Frame)',
  perimeterCount: 16,
  nodes: SUV_NODES,
  beams: buildSUVBeams(),
  springScale: 1.18,
  dampScale: 1.10,
  yieldScale: 1.15,
  breakScale: 1.12,
  chassisStiffness: 1.25,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 11],
    rightNodeIds: [4, 3, 5],
    subframeLeftFL: 26,
    subframeRightFR: 27,
    subframeLeftRL: 28,
    subframeRightRR: 29,
    engineNodeId: 25,
    chassisCoreNodeId: 24
  }
};

// ============================================================================
// 3. VAN & MINIBUS PRESET (1-Box Forward-Control / Cabover Monocoque)
// ============================================================================
const VAN_NODES: NodeTemplate[] = [
  // Outer perimeter (0..15) - exactly matching getVehicleBasePolygonRaw isVan
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.026, name: 'Blunt Front Nose Center' },
  { id: 1, xFrac: 0.48, yFrac: 0.46, group: 'bumper', massFrac: 0.022, name: 'Front-Right Bumper Corner' },
  { id: 2, xFrac: 0.45, yFrac: 0.50, group: 'fender', massFrac: 0.024, name: 'Front Wheel Step Right' },
  { id: 3, xFrac: 0.25, yFrac: 0.50, group: 'door', massFrac: 0.026, name: 'Cab Door Sill Right' },
  { id: 4, xFrac: 0.00, yFrac: 0.50, group: 'door', massFrac: 0.028, name: 'Sliding Cargo Door Sill Right' },
  { id: 5, xFrac: -0.30, yFrac: 0.50, group: 'quarter', massFrac: 0.026, name: 'Cargo Side Wall Right' },
  { id: 6, xFrac: -0.47, yFrac: 0.49, group: 'quarter', massFrac: 0.024, name: 'Rear-Right Corner Post' },
  { id: 7, xFrac: -0.49, yFrac: 0.42, group: 'bumper', massFrac: 0.020, name: 'Rear Bumper Flange Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.024, name: 'Split Rear Door Seam Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.42, group: 'bumper', massFrac: 0.020, name: 'Rear Bumper Flange Left' },
  { id: 10, xFrac: -0.47, yFrac: -0.49, group: 'quarter', massFrac: 0.024, name: 'Rear-Left Corner Post' },
  { id: 11, xFrac: -0.30, yFrac: -0.50, group: 'quarter', massFrac: 0.026, name: 'Cargo Side Wall Left' },
  { id: 12, xFrac: 0.00, yFrac: -0.50, group: 'pillar', massFrac: 0.028, name: 'Cargo Side Wall Left' },
  { id: 13, xFrac: 0.25, yFrac: -0.50, group: 'door', massFrac: 0.026, name: 'Cab Door Sill Left' },
  { id: 14, xFrac: 0.45, yFrac: -0.50, group: 'fender', massFrac: 0.024, name: 'Front Wheel Step Left' },
  { id: 15, xFrac: 0.48, yFrac: -0.46, group: 'bumper', massFrac: 0.022, name: 'Front-Left Bumper Corner' },

  // Van Vault Greenhouse & Roof Truss (16..23, 8 nodes)
  { id: 16, xFrac: 0.38, yFrac: 0.0, group: 'windshield', massFrac: 0.030, name: 'Steep Windshield Base' },
  { id: 17, xFrac: 0.28, yFrac: 0.0, group: 'roof', massFrac: 0.032, name: 'Front Roof Header' },
  { id: 18, xFrac: 0.32, yFrac: -0.22, group: 'roof', massFrac: 0.022, name: 'Roof Front-Left Pillar' },
  { id: 19, xFrac: 0.32, yFrac: 0.22, group: 'roof', massFrac: 0.022, name: 'Roof Front-Right Pillar' },
  { id: 20, xFrac: -0.05, yFrac: 0.0, group: 'roof', massFrac: 0.035, name: 'High Roof Center Truss' },
  { id: 21, xFrac: -0.38, yFrac: -0.22, group: 'roof', massFrac: 0.024, name: 'Roof Rear-Left D-Pillar' },
  { id: 22, xFrac: -0.38, yFrac: 0.22, group: 'roof', massFrac: 0.024, name: 'Roof Rear-Right D-Pillar' },
  { id: 23, xFrac: -0.44, yFrac: 0.0, group: 'trunk', massFrac: 0.028, name: 'Rear Split Door Header' },

  // Powertrain & Floor Subframe (24..29, 6 nodes)
  { id: 24, xFrac: 0.32, yFrac: 0.0, group: 'engine', massFrac: 0.220, name: 'Underfloor Engine Block' },
  { id: 25, xFrac: 0.30, yFrac: -0.26, group: 'subframe', massFrac: 0.065, name: 'Front-Left Suspension Crossmember' },
  { id: 26, xFrac: 0.30, yFrac: 0.26, group: 'subframe', massFrac: 0.065, name: 'Front-Right Suspension Crossmember' },
  { id: 27, xFrac: -0.26, yFrac: -0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Left Leaf Perch' },
  { id: 28, xFrac: -0.26, yFrac: 0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Right Leaf Perch' },
  { id: 29, xFrac: -0.05, yFrac: 0.0, group: 'chassis_core', massFrac: 0.160, isFixed: true, name: 'Cargo Bay Floor Rib Core' }
];

function buildVanBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.35, 0.50, 18.0, 1.1);

  const crosses: [number, number][] = [
    [0, 25], [0, 26], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [8, 27], [8, 28]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 1.1, DEFAULT_C_CROSS, 0.45, 16.0);

  const leftRail: [number, number][] = [[15, 25], [25, 14], [25, 16], [16, 12], [12, 27], [27, 10], [10, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.2, DEFAULT_C_CHASSIS, 0.72, 26.0);

  const rightRail: [number, number][] = [[1, 26], [26, 2], [26, 16], [16, 4], [4, 28], [28, 6], [6, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.2, DEFAULT_C_CHASSIS, 0.72, 26.0);

  const centerRail: [number, number][] = [[0, 24], [24, 16], [16, 29], [29, 23], [23, 8]];
  addBeamChain(beams, centerRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.25, DEFAULT_C_CHASSIS, 0.75, 28.0);

  addBeamChain(beams, [[25, 26], [27, 28]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.1, DEFAULT_C_CHASSIS, 0.60, 22.0);
  addBeamChain(beams, [[24, 25], [24, 26]], 'chassis_rail', DEFAULT_K_CHASSIS, DEFAULT_C_CHASSIS, 0.50, 20.0);
  addBeamChain(beams, [[12, 29], [4, 29]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.1, DEFAULT_C_CHASSIS, 0.65, 24.0);

  // High Roof Spaceframe
  const roofTruss: [number, number][] = [
    [16, 18], [16, 19], [18, 19],
    [18, 21], [19, 22], [21, 22],
    [20, 18], [20, 19], [20, 21], [20, 22],
    [21, 23], [22, 23], [10, 21], [6, 22]
  ];
  addBeamChain(beams, roofTruss, 'structural', DEFAULT_K_STRUCTURAL * 1.15, DEFAULT_C_STRUCTURAL, 0.48, 18.0);

  beams.push({ nodeA: 15, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 1, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.0, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.0, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH * 0.95, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.2, partTag: 'trunk' });
  beams.push({ nodeA: 9, nodeB: 27, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'rear_bumper' });
  beams.push({ nodeA: 7, nodeB: 28, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'rear_bumper' });

  beams.push({ nodeA: 0, nodeB: 29, type: 'support', spring: DEFAULT_K_SUPPORT * 1.5, damp: DEFAULT_C_SUPPORT, yieldDist: 1.0, breakDist: 45.0 });

  return beams;
}

export const PRESET_VAN: VehicleNodeBeamDefinition = {
  presetId: 'van_cabover_box',
  name: 'Commercial Van / Minibus (1-Box Cabover Monocoque)',
  perimeterCount: 16,
  nodes: VAN_NODES,
  beams: buildVanBeams(),
  springScale: 1.08,
  dampScale: 1.02,
  yieldScale: 1.05,
  breakScale: 1.05,
  chassisStiffness: 1.15,
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
// 4. CAMPERVAN / MOTORHOME RV PRESET (Cab + Overcab Sleeper + Wide Box Body)
// ============================================================================
const CAMPERVAN_NODES: NodeTemplate[] = [
  // Outer perimeter (0..15) - exactly matching getVehicleBasePolygonRaw van_camper
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.028, name: 'RV Front Bumper Center' },
  { id: 1, xFrac: 0.48, yFrac: 0.44, group: 'bumper', massFrac: 0.022, name: 'Cab Bumper Corner Right' },
  { id: 2, xFrac: 0.45, yFrac: 0.45, group: 'fender', massFrac: 0.024, name: 'Cab Step Right' },
  { id: 3, xFrac: 0.28, yFrac: 0.45, group: 'door', massFrac: 0.026, name: 'Cab Door Sill Right' },
  { id: 4, xFrac: 0.24, yFrac: 0.52, group: 'pillar', massFrac: 0.028, name: 'Living Module Front Flange Right' },
  { id: 5, xFrac: 0.00, yFrac: 0.52, group: 'quarter', massFrac: 0.028, name: 'Living Room Wall Right' },
  { id: 6, xFrac: -0.30, yFrac: 0.52, group: 'quarter', massFrac: 0.028, name: 'Bedroom Wall Right' },
  { id: 7, xFrac: -0.48, yFrac: 0.48, group: 'bumper', massFrac: 0.022, name: 'Rear Module Corner Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.025, name: 'Rear Flat Wall Center' },
  { id: 9, xFrac: -0.48, yFrac: -0.48, group: 'bumper', massFrac: 0.022, name: 'Rear Module Corner Left' },
  { id: 10, xFrac: -0.30, yFrac: -0.52, group: 'quarter', massFrac: 0.028, name: 'Bedroom Wall Left' },
  { id: 11, xFrac: 0.00, yFrac: -0.52, group: 'quarter', massFrac: 0.028, name: 'Kitchen Wall Left' },
  { id: 12, xFrac: 0.24, yFrac: -0.52, group: 'pillar', massFrac: 0.028, name: 'Living Module Front Flange Left' },
  { id: 13, xFrac: 0.28, yFrac: -0.45, group: 'door', massFrac: 0.026, name: 'Cab Door Sill Left' },
  { id: 14, xFrac: 0.45, yFrac: -0.45, group: 'fender', massFrac: 0.024, name: 'Cab Step Left' },
  { id: 15, xFrac: 0.48, yFrac: -0.44, group: 'bumper', massFrac: 0.022, name: 'Cab Bumper Corner Left' },

  // Over-Cab Alcove Sleeper & Extended High-Top Roof (16..24, 9 nodes)
  { id: 16, xFrac: 0.36, yFrac: 0.0, group: 'windshield', massFrac: 0.030, name: 'Front Windshield Base' },
  { id: 17, xFrac: 0.30, yFrac: 0.0, group: 'roof', massFrac: 0.028, name: 'Over-Cab Alcove Sleeper Pod' },
  { id: 18, xFrac: 0.26, yFrac: -0.24, group: 'roof', massFrac: 0.022, name: 'Living Module Front-Left Roof' },
  { id: 19, xFrac: 0.26, yFrac: 0.24, group: 'roof', massFrac: 0.022, name: 'Living Module Front-Right Roof' },
  { id: 20, xFrac: 0.00, yFrac: 0.0, group: 'roof', massFrac: 0.035, name: 'Skylight / Roof AC Unit' },
  { id: 21, xFrac: -0.28, yFrac: -0.24, group: 'roof', massFrac: 0.024, name: 'Bedroom Roof Header Left' },
  { id: 22, xFrac: -0.28, yFrac: 0.24, group: 'roof', massFrac: 0.024, name: 'Bedroom Roof Header Right' },
  { id: 23, xFrac: -0.45, yFrac: 0.0, group: 'trunk', massFrac: 0.026, name: 'Rear Living Wall Header' },
  { id: 24, xFrac: -0.05, yFrac: 0.0, group: 'chassis_core', massFrac: 0.160, isFixed: true, name: 'RV Chassis Frame Gusset' },

  // Heavy Motorhome Frame & Engine (25..29, 5 nodes)
  { id: 25, xFrac: 0.32, yFrac: 0.0, group: 'engine', massFrac: 0.220, name: 'Turbo-Diesel Engine Block' },
  { id: 26, xFrac: 0.28, yFrac: -0.24, group: 'subframe', massFrac: 0.065, name: 'Front-Left Subframe Tower' },
  { id: 27, xFrac: 0.28, yFrac: 0.24, group: 'subframe', massFrac: 0.065, name: 'Front-Right Subframe Tower' },
  { id: 28, xFrac: -0.24, yFrac: -0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Left Heavy Leaf Perch' },
  { id: 29, xFrac: -0.24, yFrac: 0.26, group: 'subframe', massFrac: 0.060, name: 'Rear-Right Heavy Leaf Perch' }
];

function buildCampervanBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.38, 0.50, 18.0, 1.1);

  const crosses: [number, number][] = [
    [0, 26], [0, 27], [1, 3], [15, 13],
    [2, 4], [14, 12], [4, 6], [12, 10],
    [5, 7], [11, 9], [8, 28], [8, 29]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 1.15, DEFAULT_C_CROSS, 0.46, 17.0);

  const leftRail: [number, number][] = [[15, 26], [26, 14], [26, 16], [16, 12], [12, 28], [28, 10], [10, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.3, DEFAULT_C_CHASSIS, 0.78, 28.0);

  const rightRail: [number, number][] = [[1, 27], [27, 2], [27, 16], [16, 4], [4, 29], [29, 6], [6, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.3, DEFAULT_C_CHASSIS, 0.78, 28.0);

  const centerRail: [number, number][] = [[0, 25], [25, 16], [16, 24], [24, 23], [23, 8]];
  addBeamChain(beams, centerRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.35, DEFAULT_C_CHASSIS, 0.80, 30.0);

  // Alcove & Insulated Living Box Roof Structure
  const livingBox: [number, number][] = [
    [16, 17], [17, 18], [17, 19], [18, 19],
    [18, 21], [19, 22], [21, 22],
    [20, 18], [20, 19], [20, 21], [20, 22],
    [21, 23], [22, 23], [10, 21], [6, 22]
  ];
  addBeamChain(beams, livingBox, 'structural', DEFAULT_K_STRUCTURAL * 1.1, DEFAULT_C_STRUCTURAL, 0.48, 18.0);

  beams.push({ nodeA: 15, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 1, nodeB: 27, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.0, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.0, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.40, breakDist: 6.2, partTag: 'trunk' });

  beams.push({ nodeA: 0, nodeB: 24, type: 'support', spring: DEFAULT_K_SUPPORT * 1.6, damp: DEFAULT_C_SUPPORT, yieldDist: 1.0, breakDist: 48.0 });

  return beams;
}

export const PRESET_CAMPERVAN: VehicleNodeBeamDefinition = {
  presetId: 'van_camper_rv',
  name: 'Campervan / Motorhome (Cab + Overcab Sleeper + Living Box)',
  perimeterCount: 16,
  nodes: CAMPERVAN_NODES,
  beams: buildCampervanBeams(),
  springScale: 1.12,
  dampScale: 1.05,
  yieldScale: 1.10,
  breakScale: 1.08,
  chassisStiffness: 1.20,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 10],
    rightNodeIds: [4, 3, 6],
    subframeLeftFL: 26,
    subframeRightFR: 27,
    subframeLeftRL: 28,
    subframeRightRR: 29,
    engineNodeId: 25,
    chassisCoreNodeId: 24
  }
};

// ============================================================================
// 5. HOODED MEDIUM TRUCK (GAZ-53: Tapered Hood, Protruding Fenders, Wooden Bed)
// ============================================================================
const TRUCK_GAZ53_NODES: NodeTemplate[] = [
  // Outer perimeter (0..15) - exactly matching getVehicleBasePolygonRaw truck_flatbed
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.030, name: 'Curved Radiator Grille Center' },
  { id: 1, xFrac: 0.47, yFrac: 0.36, group: 'bumper', massFrac: 0.024, name: 'Tapered Hood Corner Right' },
  { id: 2, xFrac: 0.33, yFrac: 0.44, group: 'fender', massFrac: 0.026, name: 'Protruding Fender Flare Right' },
  { id: 3, xFrac: 0.16, yFrac: 0.43, group: 'door', massFrac: 0.024, name: 'Cab Step Right' },
  { id: 4, xFrac: 0.09, yFrac: 0.49, group: 'quarter', massFrac: 0.026, name: 'Wooden Flatbed Front Corner Right' },
  { id: 5, xFrac: 0.00, yFrac: 0.49, group: 'quarter', massFrac: 0.024, name: 'Flatbed Side Board Right 1' },
  { id: 6, xFrac: -0.25, yFrac: 0.49, group: 'quarter', massFrac: 0.024, name: 'Flatbed Rear Axle Flank Right' },
  { id: 7, xFrac: -0.49, yFrac: 0.49, group: 'bumper', massFrac: 0.022, name: 'Flatbed Rear Corner Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.026, name: 'Drop Tailgate Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.49, group: 'bumper', massFrac: 0.022, name: 'Flatbed Rear Corner Left' },
  { id: 10, xFrac: -0.25, yFrac: -0.49, group: 'quarter', massFrac: 0.024, name: 'Flatbed Rear Axle Flank Left' },
  { id: 11, xFrac: 0.00, yFrac: -0.49, group: 'quarter', massFrac: 0.024, name: 'Flatbed Side Board Left 1' },
  { id: 12, xFrac: 0.09, yFrac: -0.49, group: 'quarter', massFrac: 0.026, name: 'Wooden Flatbed Front Corner Left' },
  { id: 13, xFrac: 0.16, yFrac: -0.43, group: 'door', massFrac: 0.024, name: 'Cab Step Left' },
  { id: 14, xFrac: 0.33, yFrac: -0.44, group: 'fender', massFrac: 0.026, name: 'Protruding Fender Flare Left' },
  { id: 15, xFrac: 0.47, yFrac: -0.36, group: 'bumper', massFrac: 0.024, name: 'Tapered Hood Corner Left' },

  // Hooded Cab Greenhouse & Wooden Bed Sills (16..23, 8 nodes)
  { id: 16, xFrac: 0.38, yFrac: 0.0, group: 'hood', massFrac: 0.025, name: 'Long Tapered Hood Spine' },
  { id: 17, xFrac: 0.20, yFrac: 0.0, group: 'windshield', massFrac: 0.026, name: 'Cab Panoramic Windshield Base' },
  { id: 18, xFrac: 0.12, yFrac: 0.0, group: 'roof', massFrac: 0.028, name: 'Cab Rounded Roof Apex' },
  { id: 19, xFrac: 0.14, yFrac: -0.24, group: 'roof', massFrac: 0.020, name: 'Cab Roof Left' },
  { id: 20, xFrac: 0.14, yFrac: 0.24, group: 'roof', massFrac: 0.020, name: 'Cab Roof Right' },
  { id: 21, xFrac: 0.04, yFrac: 0.0, group: 'roof', massFrac: 0.022, name: 'Cab Back Wall Center' },
  { id: 22, xFrac: -0.20, yFrac: 0.0, group: 'trunk', massFrac: 0.028, name: 'Flatbed Wooden Floor Center' },
  { id: 23, xFrac: -0.42, yFrac: 0.0, group: 'trunk', massFrac: 0.024, name: 'Rear Tailgate Hinge Bar' },

  // Heavy C-Channel Ladder Frame Rails & Powertrain (24..30, 7 nodes)
  { id: 24, xFrac: 0.34, yFrac: 0.0, group: 'engine', massFrac: 0.240, name: 'ZMZ-53 Heavy V8 Engine Block' },
  { id: 25, xFrac: 0.32, yFrac: -0.24, group: 'subframe', massFrac: 0.060, name: 'Front-Left Leaf Spring Hanger' },
  { id: 26, xFrac: 0.32, yFrac: 0.24, group: 'subframe', massFrac: 0.060, name: 'Front-Right Leaf Spring Hanger' },
  { id: 27, xFrac: -0.24, yFrac: -0.24, group: 'subframe', massFrac: 0.055, name: 'Rear-Left Heavy Axle Trumpet' },
  { id: 28, xFrac: -0.24, yFrac: 0.24, group: 'subframe', massFrac: 0.055, name: 'Rear-Right Heavy Axle Trumpet' },
  { id: 29, xFrac: 0.06, yFrac: 0.0, group: 'chassis_core', massFrac: 0.150, isFixed: true, name: 'Heavy Frame Cross-Member Core' },
  { id: 30, xFrac: -0.46, yFrac: 0.0, group: 'subframe', massFrac: 0.040, name: 'Rear Pintle Hook Crossmember' }
];

function buildTruckGAZ53Beams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.45, 0.55, 22.0, 1.3);

  const crosses: [number, number][] = [
    [0, 25], [0, 26], [1, 3], [15, 13],
    [2, 4], [14, 12], [4, 6], [12, 10],
    [5, 7], [11, 9], [8, 27], [8, 28]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 1.3, DEFAULT_C_CROSS, 0.50, 18.0);

  const leftRail: [number, number][] = [[15, 25], [25, 14], [25, 17], [17, 13], [13, 29], [29, 27], [27, 10], [10, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.6, DEFAULT_C_CHASSIS * 1.3, 0.90, 34.0);

  const rightRail: [number, number][] = [[1, 26], [26, 2], [26, 17], [17, 3], [3, 29], [29, 28], [28, 6], [6, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.6, DEFAULT_C_CHASSIS * 1.3, 0.90, 34.0);

  const centerRail: [number, number][] = [[0, 24], [24, 17], [17, 29], [29, 22], [22, 30], [30, 8]];
  addBeamChain(beams, centerRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.8, DEFAULT_C_CHASSIS * 1.4, 0.95, 36.0);

  addBeamChain(beams, [[25, 26], [27, 28]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.4, DEFAULT_C_CHASSIS, 0.70, 26.0);
  addBeamChain(beams, [[24, 25], [24, 26]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.3, DEFAULT_C_CHASSIS, 0.60, 22.0);

  // Cab Cage
  addBeamChain(beams, [
    [17, 19], [17, 20], [19, 20], [18, 19], [18, 20],
    [19, 21], [20, 21], [13, 21], [3, 21]
  ], 'structural', DEFAULT_K_STRUCTURAL * 1.2, DEFAULT_C_STRUCTURAL, 0.52, 20.0);

  beams.push({ nodeA: 15, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.0, partTag: 'front_bumper' });
  beams.push({ nodeA: 1, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.0, partTag: 'front_bumper' });
  beams.push({ nodeA: 0, nodeB: 16, type: 'latch', spring: DEFAULT_K_LATCH * 0.9, damp: DEFAULT_C_LATCH, yieldDist: 0.38, breakDist: 6.0, partTag: 'hood' });
  beams.push({ nodeA: 16, nodeB: 17, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 8.0, partTag: 'hood' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 6.5, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 6.5, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.0, partTag: 'trunk' });

  beams.push({ nodeA: 0, nodeB: 29, type: 'support', spring: DEFAULT_K_SUPPORT * 2.2, damp: DEFAULT_C_SUPPORT, yieldDist: 1.2, breakDist: 60.0 });

  return beams;
}

export const PRESET_TRUCK_HOODED_GAZ53: VehicleNodeBeamDefinition = {
  presetId: 'truck_hooded_gaz53',
  name: 'Medium Hooded Truck (GAZ-53: Tapered Hood & Flatbed Platform)',
  perimeterCount: 16,
  nodes: TRUCK_GAZ53_NODES,
  beams: buildTruckGAZ53Beams(),
  springScale: 1.45,
  dampScale: 1.25,
  yieldScale: 1.35,
  breakScale: 1.30,
  chassisStiffness: 1.60,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 10],
    rightNodeIds: [4, 3, 6],
    subframeLeftFL: 25,
    subframeRightFR: 26,
    subframeLeftRL: 27,
    subframeRightRR: 28,
    engineNodeId: 24,
    chassisCoreNodeId: 29
  }
};

// ============================================================================
// 6. ZIL-130 SHORT TIPPER / DUMP TRUCK PRESET (MMZ-555 Rounded Snout & Tipper)
// ============================================================================
const TRUCK_ZIL_NODES: NodeTemplate[] = [
  // Outer perimeter (0..15) - exactly matching getVehicleBasePolygonRaw truck_zil_dump
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.032, name: 'ZIL Rounded Grille Snout' },
  { id: 1, xFrac: 0.47, yFrac: 0.35, group: 'bumper', massFrac: 0.024, name: 'Front-Right Snout Corner' },
  { id: 2, xFrac: 0.31, yFrac: 0.45, group: 'fender', massFrac: 0.026, name: 'Bulging Fender Wing Right' },
  { id: 3, xFrac: 0.14, yFrac: 0.43, group: 'door', massFrac: 0.024, name: 'Cab Step Right' },
  { id: 4, xFrac: 0.04, yFrac: 0.48, group: 'quarter', massFrac: 0.026, name: 'Tipper Body Front Bulkhead Right' },
  { id: 5, xFrac: -0.15, yFrac: 0.48, group: 'quarter', massFrac: 0.026, name: 'Dump Tipper Flank Right' },
  { id: 6, xFrac: -0.38, yFrac: 0.46, group: 'quarter', massFrac: 0.024, name: 'Tipper Chute Corner Right' },
  { id: 7, xFrac: -0.49, yFrac: 0.22, group: 'bumper', massFrac: 0.020, name: 'Rear Tailgate Flange Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.026, name: 'Dump Tailgate Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.22, group: 'bumper', massFrac: 0.020, name: 'Rear Tailgate Flange Left' },
  { id: 10, xFrac: -0.38, yFrac: -0.46, group: 'quarter', massFrac: 0.024, name: 'Tipper Chute Corner Left' },
  { id: 11, xFrac: -0.15, yFrac: -0.48, group: 'quarter', massFrac: 0.026, name: 'Dump Tipper Flank Left' },
  { id: 12, xFrac: 0.04, yFrac: -0.48, group: 'quarter', massFrac: 0.026, name: 'Tipper Body Front Bulkhead Left' },
  { id: 13, xFrac: 0.14, yFrac: -0.43, group: 'door', massFrac: 0.024, name: 'Cab Step Left' },
  { id: 14, xFrac: 0.31, yFrac: -0.45, group: 'fender', massFrac: 0.026, name: 'Bulging Fender Wing Left' },
  { id: 15, xFrac: 0.47, yFrac: -0.35, group: 'bumper', massFrac: 0.024, name: 'Front-Left Snout Corner' },

  // Round-Roof Cab Greenhouse & Dump Trough (16..23, 8 nodes)
  { id: 16, xFrac: 0.36, yFrac: 0.0, group: 'hood', massFrac: 0.026, name: 'Curved Snout Hood Spine' },
  { id: 17, xFrac: 0.18, yFrac: 0.0, group: 'windshield', massFrac: 0.028, name: 'Curved Panoramic Windshield Cowl' },
  { id: 18, xFrac: 0.10, yFrac: 0.0, group: 'roof', massFrac: 0.030, name: 'ZIL Round Cab Roof Apex' },
  { id: 19, xFrac: 0.12, yFrac: -0.24, group: 'roof', massFrac: 0.020, name: 'Cab Roof Left' },
  { id: 20, xFrac: 0.12, yFrac: 0.24, group: 'roof', massFrac: 0.020, name: 'Cab Roof Right' },
  { id: 21, xFrac: 0.02, yFrac: 0.0, group: 'roof', massFrac: 0.022, name: 'Cab Back Wall Center' },
  { id: 22, xFrac: -0.20, yFrac: 0.0, group: 'trunk', massFrac: 0.030, name: 'Tipper Steel Trough Floor' },
  { id: 23, xFrac: -0.42, yFrac: 0.0, group: 'trunk', massFrac: 0.024, name: 'Dump Tailgate Hinge Bar' },

  // Heavy Dump Truck Chassis & V8 (24..29, 6 nodes)
  { id: 24, xFrac: 0.32, yFrac: 0.0, group: 'engine', massFrac: 0.240, name: 'ZIL-130 6.0L V8 Cast Iron Engine' },
  { id: 25, xFrac: 0.30, yFrac: -0.24, group: 'subframe', massFrac: 0.060, name: 'Front-Left Heavy Leaf Perch' },
  { id: 26, xFrac: 0.30, yFrac: 0.24, group: 'subframe', massFrac: 0.060, name: 'Front-Right Heavy Leaf Perch' },
  { id: 27, xFrac: -0.24, yFrac: -0.24, group: 'subframe', massFrac: 0.055, name: 'Rear-Left Heavy Axle Trumpet' },
  { id: 28, xFrac: -0.24, yFrac: 0.24, group: 'subframe', massFrac: 0.055, name: 'Rear-Right Heavy Axle Trumpet' },
  { id: 29, xFrac: 0.04, yFrac: 0.0, group: 'chassis_core', massFrac: 0.150, isFixed: true, name: 'Hydraulic Hoist Frame Gusset' }
];

function buildTruckZILBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.45, 0.55, 22.0, 1.35);

  const crosses: [number, number][] = [
    [0, 25], [0, 26], [1, 3], [15, 13],
    [2, 4], [14, 12], [4, 6], [12, 10],
    [5, 7], [11, 9], [8, 27], [8, 28]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 1.35, DEFAULT_C_CROSS, 0.50, 18.0);

  const leftRail: [number, number][] = [[15, 25], [25, 14], [25, 17], [17, 13], [13, 29], [29, 27], [27, 10], [10, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.7, DEFAULT_C_CHASSIS * 1.3, 0.90, 34.0);

  const rightRail: [number, number][] = [[1, 26], [26, 2], [26, 17], [17, 3], [3, 29], [29, 28], [28, 6], [6, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.7, DEFAULT_C_CHASSIS * 1.3, 0.90, 34.0);

  const centerRail: [number, number][] = [[0, 24], [24, 17], [17, 29], [29, 22], [22, 23], [23, 8]];
  addBeamChain(beams, centerRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.85, DEFAULT_C_CHASSIS * 1.4, 0.95, 36.0);

  addBeamChain(beams, [[25, 26], [27, 28]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.4, DEFAULT_C_CHASSIS, 0.70, 26.0);
  addBeamChain(beams, [[24, 25], [24, 26]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.3, DEFAULT_C_CHASSIS, 0.60, 22.0);

  // Cab Cage
  addBeamChain(beams, [
    [17, 19], [17, 20], [19, 20], [18, 19], [18, 20],
    [19, 21], [20, 21], [13, 21], [3, 21]
  ], 'structural', DEFAULT_K_STRUCTURAL * 1.25, DEFAULT_C_STRUCTURAL, 0.52, 20.0);

  beams.push({ nodeA: 15, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH * 1.3, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 1, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH * 1.3, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 0, nodeB: 16, type: 'latch', spring: DEFAULT_K_LATCH * 0.95, damp: DEFAULT_C_LATCH, yieldDist: 0.38, breakDist: 6.2, partTag: 'hood' });
  beams.push({ nodeA: 16, nodeB: 17, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 8.0, partTag: 'hood' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 6.5, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH, damp: DEFAULT_C_LATCH, yieldDist: 0.42, breakDist: 6.5, partTag: 'door_fr' });
  beams.push({ nodeA: 8, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH * 1.3, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.2, partTag: 'trunk' });

  beams.push({ nodeA: 0, nodeB: 29, type: 'support', spring: DEFAULT_K_SUPPORT * 2.4, damp: DEFAULT_C_SUPPORT, yieldDist: 1.2, breakDist: 60.0 });

  return beams;
}

export const PRESET_TRUCK_ZIL_DUMP: VehicleNodeBeamDefinition = {
  presetId: 'truck_zil_dump',
  name: 'ZIL-130 Tipper / Dump Truck (Curved Snout & Heavy Tipper Body)',
  perimeterCount: 16,
  nodes: TRUCK_ZIL_NODES,
  beams: buildTruckZILBeams(),
  springScale: 1.50,
  dampScale: 1.30,
  yieldScale: 1.40,
  breakScale: 1.35,
  chassisStiffness: 1.70,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 10],
    rightNodeIds: [4, 3, 6],
    subframeLeftFL: 25,
    subframeRightFR: 26,
    subframeLeftRL: 27,
    subframeRightRR: 28,
    engineNodeId: 24,
    chassisCoreNodeId: 29
  }
};

// ============================================================================
// 7. HEAVY CABOVER TRUCK PRESET (Dual C-Channel Ladder Frame & Cabover)
// ============================================================================
const TRUCK_CABOVER_NODES: NodeTemplate[] = [
  // Perimeter (0..15) - Flat blunt front with very small front overhang
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
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.55, 0.60, 22.0, 1.8);

  const crosses: [number, number][] = [
    [0, 25], [0, 26], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [8, 32], [8, 33]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 1.8, DEFAULT_C_CROSS, 0.55, 20.0);

  const leftRail: [number, number][] = [[15, 25], [25, 12], [12, 27], [27, 30], [30, 32], [32, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS * 2.2, DEFAULT_C_CHASSIS * 1.8, 1.1, 38.0);

  const rightRail: [number, number][] = [[1, 26], [26, 4], [4, 28], [28, 31], [31, 33], [33, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS * 2.2, DEFAULT_C_CHASSIS * 1.8, 1.1, 38.0);

  const crossmembers: [number, number][] = [
    [25, 26], [27, 28], [30, 31], [32, 33], [12, 29], [4, 29]
  ];
  addBeamChain(beams, crossmembers, 'chassis_rail', DEFAULT_K_CHASSIS * 2.0, DEFAULT_C_CHASSIS * 1.8, 0.9, 32.0);

  addBeamChain(beams, [[0, 24], [24, 25], [24, 26], [24, 29]], 'chassis_rail', DEFAULT_K_CHASSIS * 1.8, DEFAULT_C_CHASSIS, 0.75, 28.0);

  // Cab Cage
  const cabCage: [number, number][] = [
    [17, 19], [17, 20], [19, 20], [21, 22], [19, 21], [20, 22]
  ];
  addBeamChain(beams, cabCage, 'structural', DEFAULT_K_STRUCTURAL * 1.5, DEFAULT_C_STRUCTURAL, 0.6, 24.0);

  beams.push({ nodeA: 1, nodeB: 26, type: 'latch', spring: DEFAULT_K_LATCH * 1.8, damp: DEFAULT_C_LATCH * 1.5, yieldDist: 0.6, breakDist: 9.0, partTag: 'front_bumper' });
  beams.push({ nodeA: 15, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH * 1.8, damp: DEFAULT_C_LATCH * 1.5, yieldDist: 0.6, breakDist: 9.0, partTag: 'front_bumper' });
  beams.push({ nodeA: 13, nodeB: 12, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.5, breakDist: 7.5, partTag: 'door_fl' });
  beams.push({ nodeA: 3, nodeB: 4, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.5, breakDist: 7.5, partTag: 'door_fr' });

  beams.push({ nodeA: 0, nodeB: 29, type: 'support', spring: DEFAULT_K_SUPPORT * 2.8, damp: DEFAULT_C_SUPPORT * 2.0, yieldDist: 1.5, breakDist: 60.0 });
  beams.push({ nodeA: 3, nodeB: 13, type: 'support', spring: DEFAULT_K_SUPPORT * 2.0, damp: DEFAULT_C_SUPPORT, yieldDist: 1.2, breakDist: 50.0 });

  return beams;
}

export const PRESET_TRUCK_CABOVER: VehicleNodeBeamDefinition = {
  presetId: 'truck_cabover_heavy',
  name: 'Heavy Cabover Truck / Rig (Continuous Ladder Chassis)',
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

// ============================================================================
// 8. SEMI-TRUCK TRACTOR (KAMAZ-5410: Sleeper Cab + Exposed Narrow Frame)
// ============================================================================
const SEMI_NODES: NodeTemplate[] = [
  // Outer perimeter (0..15) - exactly matching getVehicleBasePolygonRaw truck_semi
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.030, name: 'Cab Steel Bumper Center' },
  { id: 1, xFrac: 0.50, yFrac: 0.47, group: 'bumper', massFrac: 0.024, name: 'Cab Bumper Corner Right' },
  { id: 2, xFrac: 0.33, yFrac: 0.47, group: 'fender', massFrac: 0.022, name: 'Cab Step Right' },
  { id: 3, xFrac: 0.16, yFrac: 0.47, group: 'door', massFrac: 0.022, name: 'Cab Sleeper Wall Right' },
  { id: 4, xFrac: 0.16, yFrac: 0.19, group: 'quarter', massFrac: 0.020, name: 'Narrow Chassis Step Right' },
  { id: 5, xFrac: 0.00, yFrac: 0.19, group: 'quarter', massFrac: 0.020, name: 'Exposed Frame Rail Right 1' },
  { id: 6, xFrac: -0.25, yFrac: 0.19, group: 'quarter', massFrac: 0.022, name: 'Tandem Axle Flange Right' },
  { id: 7, xFrac: -0.49, yFrac: 0.19, group: 'bumper', massFrac: 0.018, name: 'Rear Frame Rail End Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.024, name: 'Rear Pintle Crossmember Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.19, group: 'bumper', massFrac: 0.018, name: 'Rear Frame Rail End Left' },
  { id: 10, xFrac: -0.25, yFrac: -0.19, group: 'quarter', massFrac: 0.022, name: 'Tandem Axle Flange Left' },
  { id: 11, xFrac: 0.00, yFrac: -0.19, group: 'quarter', massFrac: 0.020, name: 'Exposed Frame Rail Left 1' },
  { id: 12, xFrac: 0.16, yFrac: -0.19, group: 'quarter', massFrac: 0.020, name: 'Narrow Chassis Step Left' },
  { id: 13, xFrac: 0.16, yFrac: -0.47, group: 'door', massFrac: 0.022, name: 'Cab Sleeper Wall Left' },
  { id: 14, xFrac: 0.33, yFrac: -0.47, group: 'fender', massFrac: 0.022, name: 'Cab Step Left' },
  { id: 15, xFrac: 0.50, yFrac: -0.47, group: 'bumper', massFrac: 0.024, name: 'Cab Bumper Corner Left' },

  // Sleeper Cab & 5th Wheel Turntable (16..22, 7 nodes)
  { id: 16, xFrac: 0.46, yFrac: 0.0, group: 'windshield', massFrac: 0.024, name: 'Cab Windshield Base' },
  { id: 17, xFrac: 0.32, yFrac: 0.0, group: 'roof', massFrac: 0.028, name: 'Cab Roof Apex' },
  { id: 18, xFrac: 0.35, yFrac: -0.32, group: 'roof', massFrac: 0.020, name: 'Cab Roof Left' },
  { id: 19, xFrac: 0.35, yFrac: 0.32, group: 'roof', massFrac: 0.020, name: 'Cab Roof Right' },
  { id: 20, xFrac: 0.20, yFrac: 0.0, group: 'roof', massFrac: 0.022, name: 'Sleeper Back Wall Center' },
  { id: 21, xFrac: -0.15, yFrac: 0.0, group: 'trunk', massFrac: 0.045, name: '5th Wheel Turntable Plate' },
  { id: 22, xFrac: 0.18, yFrac: 0.0, group: 'chassis_core', massFrac: 0.150, isFixed: true, name: 'Cab-Frame Cross-Gusset Core' },

  // Heavy Diesel V8 & Bogies (23..28, 6 nodes)
  { id: 23, xFrac: 0.34, yFrac: 0.0, group: 'engine', massFrac: 0.250, name: 'KAMAZ 740 Turbo-Diesel V8' },
  { id: 24, xFrac: 0.34, yFrac: -0.22, group: 'subframe', massFrac: 0.055, name: 'Front-Left Leaf Hanger' },
  { id: 25, xFrac: 0.34, yFrac: 0.22, group: 'subframe', massFrac: 0.055, name: 'Front-Right Leaf Hanger' },
  { id: 26, xFrac: -0.22, yFrac: -0.19, group: 'subframe', massFrac: 0.055, name: 'Left Tandem Axle Trunnion' },
  { id: 27, xFrac: -0.22, yFrac: 0.19, group: 'subframe', massFrac: 0.055, name: 'Right Tandem Axle Trunnion' },
  { id: 28, xFrac: -0.44, yFrac: 0.0, group: 'subframe', massFrac: 0.035, name: 'Rear Cross-Member Flange' }
];

function buildSemiBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.55, 0.60, 22.0, 1.9);

  const crosses: [number, number][] = [
    [0, 24], [0, 25], [1, 3], [15, 13],
    [3, 12], [4, 11], [5, 10], [6, 9],
    [8, 26], [8, 27]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 1.8, DEFAULT_C_CROSS, 0.55, 20.0);

  // Longitudinal C-Channel rails running down the narrow rear frame
  const leftRail: [number, number][] = [[15, 24], [24, 12], [12, 11], [11, 10], [10, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS * 2.3, DEFAULT_C_CHASSIS * 1.8, 1.1, 40.0);

  const rightRail: [number, number][] = [[1, 25], [25, 4], [4, 5], [5, 6], [6, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS * 2.3, DEFAULT_C_CHASSIS * 1.8, 1.1, 40.0);

  const centerSpine: [number, number][] = [[0, 23], [23, 22], [22, 21], [21, 28], [28, 8]];
  addBeamChain(beams, centerSpine, 'chassis_rail', DEFAULT_K_CHASSIS * 2.2, DEFAULT_C_CHASSIS * 1.8, 1.1, 40.0);

  // 5th Wheel Turntable mounts (bolted into left and right frame rails)
  addBeamChain(beams, [[21, 5], [21, 11], [21, 6], [21, 10]], 'chassis_rail', DEFAULT_K_CHASSIS * 2.5, DEFAULT_C_CHASSIS * 2.0, 1.2, 45.0);

  // Cab Cage
  addBeamChain(beams, [
    [16, 18], [16, 19], [18, 19], [17, 18], [17, 19],
    [18, 20], [19, 20], [13, 20], [3, 20]
  ], 'structural', DEFAULT_K_STRUCTURAL * 1.5, DEFAULT_C_STRUCTURAL, 0.6, 24.0);

  beams.push({ nodeA: 1, nodeB: 25, type: 'latch', spring: DEFAULT_K_LATCH * 1.8, damp: DEFAULT_C_LATCH * 1.5, yieldDist: 0.6, breakDist: 9.0, partTag: 'front_bumper' });
  beams.push({ nodeA: 15, nodeB: 24, type: 'latch', spring: DEFAULT_K_LATCH * 1.8, damp: DEFAULT_C_LATCH * 1.5, yieldDist: 0.6, breakDist: 9.0, partTag: 'front_bumper' });

  beams.push({ nodeA: 0, nodeB: 22, type: 'support', spring: DEFAULT_K_SUPPORT * 3.0, damp: DEFAULT_C_SUPPORT * 2.0, yieldDist: 1.5, breakDist: 65.0 });

  return beams;
}

export const PRESET_SEMI_TRACTOR: VehicleNodeBeamDefinition = {
  presetId: 'truck_semi_tractor',
  name: 'Heavy Semi-Truck Tractor (KAMAZ-5410: Sleeper Cab & Open 5th-Wheel Frame)',
  perimeterCount: 16,
  nodes: SEMI_NODES,
  beams: buildSemiBeams(),
  springScale: 2.3,
  dampScale: 1.9,
  yieldScale: 2.3,
  breakScale: 2.1,
  chassisStiffness: 2.7,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 10],
    rightNodeIds: [4, 3, 6],
    subframeLeftFL: 24,
    subframeRightFR: 25,
    subframeLeftRL: 26,
    subframeRightRR: 27,
    engineNodeId: 23,
    chassisCoreNodeId: 22
  }
};

// ============================================================================
// 9. TRANSIT BUS PRESET (Full-Length Monocoque & Rear Diesel Powerpack)
// ============================================================================
const BUS_NODES: NodeTemplate[] = [
  // Outer perimeter (0..15) - Full length bus box
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.026, name: 'Panoramic Bus Bumper Center' },
  { id: 1, xFrac: 0.49, yFrac: 0.46, group: 'bumper', massFrac: 0.022, name: 'Front-Right Corner Pillar' },
  { id: 2, xFrac: 0.45, yFrac: 0.50, group: 'door', massFrac: 0.024, name: 'Front Passenger Entry Door' },
  { id: 3, xFrac: 0.20, yFrac: 0.50, group: 'door', massFrac: 0.024, name: 'Passenger Window Sill Right 1' },
  { id: 4, xFrac: 0.00, yFrac: 0.50, group: 'door', massFrac: 0.024, name: 'Center Passenger Door Sill' },
  { id: 5, xFrac: -0.25, yFrac: 0.50, group: 'quarter', massFrac: 0.024, name: 'Passenger Window Sill Right 2' },
  { id: 6, xFrac: -0.47, yFrac: 0.49, group: 'quarter', massFrac: 0.024, name: 'Rear-Right Corner Pillar' },
  { id: 7, xFrac: -0.49, yFrac: 0.38, group: 'bumper', massFrac: 0.020, name: 'Rear Engine Grille Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.024, name: 'Rear Engine Hatch Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.38, group: 'bumper', massFrac: 0.020, name: 'Rear Engine Grille Left' },
  { id: 10, xFrac: -0.47, yFrac: -0.49, group: 'quarter', massFrac: 0.024, name: 'Rear-Left Corner Pillar' },
  { id: 11, xFrac: -0.25, yFrac: -0.50, group: 'quarter', massFrac: 0.024, name: 'Passenger Window Sill Left 2' },
  { id: 12, xFrac: 0.00, yFrac: -0.50, group: 'door', massFrac: 0.024, name: 'Passenger Window Sill Left 1' },
  { id: 13, xFrac: 0.20, yFrac: -0.50, group: 'door', massFrac: 0.024, name: 'Driver Window Sill Left' },
  { id: 14, xFrac: 0.45, yFrac: -0.50, group: 'fender', massFrac: 0.024, name: 'Front-Left Wheel Arch' },
  { id: 15, xFrac: 0.49, yFrac: -0.46, group: 'bumper', massFrac: 0.022, name: 'Front-Left Corner Pillar' },

  // Monocoque Roof & Aisle Floor (16..23, 8 nodes)
  { id: 16, xFrac: 0.42, yFrac: 0.0, group: 'windshield', massFrac: 0.028, name: 'Windshield Upper Header' },
  { id: 17, xFrac: 0.22, yFrac: 0.0, group: 'roof', massFrac: 0.030, name: 'Roof Forward Section' },
  { id: 18, xFrac: 0.00, yFrac: 0.0, group: 'roof', massFrac: 0.032, name: 'Roof Midsection' },
  { id: 19, xFrac: -0.22, yFrac: 0.0, group: 'roof', massFrac: 0.030, name: 'Roof Rear Section' },
  { id: 20, xFrac: -0.44, yFrac: 0.0, group: 'trunk', massFrac: 0.026, name: 'Rear Window Header' },
  { id: 21, xFrac: 0.00, yFrac: 0.0, group: 'chassis_core', massFrac: 0.160, isFixed: true, name: 'Passenger Aisle Floor Spine Core' },

  // Rear-Mounted Powertrain & Axles (22..26, 5 nodes)
  // ENGINE IS REAR-MOUNTED AT xFrac: -0.38
  { id: 22, xFrac: -0.38, yFrac: 0.0, group: 'engine', massFrac: 0.240, name: 'Rear-Mounted Diesel Turbo Powerpack' },
  { id: 23, xFrac: 0.32, yFrac: -0.25, group: 'subframe', massFrac: 0.060, name: 'Front-Left Air Suspension Mount' },
  { id: 24, xFrac: 0.32, yFrac: 0.25, group: 'subframe', massFrac: 0.060, name: 'Front-Right Air Suspension Mount' },
  { id: 25, xFrac: -0.22, yFrac: -0.25, group: 'subframe', massFrac: 0.065, name: 'Rear-Left Drive Axle Mount' },
  { id: 26, xFrac: -0.22, yFrac: 0.25, group: 'subframe', massFrac: 0.065, name: 'Rear-Right Drive Axle Mount' }
];

function buildBusBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.45, 0.52, 20.0, 1.5);

  const crosses: [number, number][] = [
    [0, 23], [0, 24], [1, 3], [15, 13],
    [2, 4], [14, 12], [3, 5], [13, 11],
    [4, 6], [12, 10], [5, 7], [11, 9],
    [8, 25], [8, 26]
  ];
  addBeamChain(beams, crosses, 'cross', DEFAULT_K_CROSS * 1.5, DEFAULT_C_CROSS, 0.50, 18.0);

  const leftRail: [number, number][] = [[15, 23], [23, 14], [14, 12], [12, 25], [25, 10], [10, 9]];
  addBeamChain(beams, leftRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.8, DEFAULT_C_CHASSIS * 1.5, 0.85, 32.0);

  const rightRail: [number, number][] = [[1, 24], [24, 2], [2, 4], [4, 26], [26, 6], [6, 7]];
  addBeamChain(beams, rightRail, 'chassis_rail', DEFAULT_K_CHASSIS * 1.8, DEFAULT_C_CHASSIS * 1.5, 0.85, 32.0);

  const centerAisle: [number, number][] = [[0, 16], [16, 17], [17, 21], [21, 19], [19, 22], [22, 8]];
  addBeamChain(beams, centerAisle, 'chassis_rail', DEFAULT_K_CHASSIS * 1.9, DEFAULT_C_CHASSIS * 1.5, 0.90, 34.0);

  // Rear Engine Cradle
  addBeamChain(beams, [[22, 25], [22, 26], [22, 8], [22, 20]], 'chassis_rail', DEFAULT_K_CHASSIS * 2.0, DEFAULT_C_CHASSIS * 1.5, 0.90, 35.0);

  // Roof Truss
  addBeamChain(beams, [
    [16, 17], [17, 18], [18, 19], [19, 20]
  ], 'structural', DEFAULT_K_STRUCTURAL * 1.4, DEFAULT_C_STRUCTURAL, 0.55, 20.0);

  beams.push({ nodeA: 1, nodeB: 24, type: 'latch', spring: DEFAULT_K_LATCH * 1.4, damp: DEFAULT_C_LATCH, yieldDist: 0.5, breakDist: 7.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 15, nodeB: 23, type: 'latch', spring: DEFAULT_K_LATCH * 1.4, damp: DEFAULT_C_LATCH, yieldDist: 0.5, breakDist: 7.5, partTag: 'front_bumper' });
  beams.push({ nodeA: 8, nodeB: 22, type: 'latch', spring: DEFAULT_K_LATCH * 1.2, damp: DEFAULT_C_LATCH, yieldDist: 0.45, breakDist: 7.0, partTag: 'trunk' });

  beams.push({ nodeA: 0, nodeB: 21, type: 'support', spring: DEFAULT_K_SUPPORT * 2.4, damp: DEFAULT_C_SUPPORT, yieldDist: 1.3, breakDist: 55.0 });

  return beams;
}

export const PRESET_BUS: VehicleNodeBeamDefinition = {
  presetId: 'bus_transit_monocoque',
  name: 'Transit Passenger Bus (Full Spaceframe & Rear Engine)',
  perimeterCount: 16,
  nodes: BUS_NODES,
  beams: buildBusBeams(),
  springScale: 1.8,
  dampScale: 1.5,
  yieldScale: 1.8,
  breakScale: 1.6,
  chassisStiffness: 2.1,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [12, 13, 10],
    rightNodeIds: [4, 3, 6],
    subframeLeftFL: 23,
    subframeRightFR: 24,
    subframeLeftRL: 25,
    subframeRightRR: 26,
    engineNodeId: 22,
    chassisCoreNodeId: 21
  }
};

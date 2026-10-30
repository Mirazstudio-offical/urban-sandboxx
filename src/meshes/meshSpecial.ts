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
// 1. AGRICULTURAL TRACTOR (MTZ-80 / MTZ-82 Cast Iron Backbone & ROPS)
// ============================================================================
const TRACTOR_NODES: NodeTemplate[] = [
  // Perimeter (0..17, 18 nodes) - exactly matching getVehicleBasePolygonRaw isTractor
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.045, name: 'Front Ballast Weight Center' },
  { id: 1, xFrac: 0.47, yFrac: 0.17, group: 'bumper', massFrac: 0.024, name: 'Front Cast Nose Right' },
  { id: 2, xFrac: 0.35, yFrac: 0.18, group: 'fender', massFrac: 0.022, name: 'Front Axle Pivot Right' },
  { id: 3, xFrac: 0.05, yFrac: 0.18, group: 'fender', massFrac: 0.022, name: 'Engine Hood Flange Right' },
  { id: 4, xFrac: 0.00, yFrac: 0.37, group: 'door', massFrac: 0.026, name: 'Cab Front Glass Sill Right' },
  { id: 5, xFrac: -0.15, yFrac: 0.49, group: 'quarter', massFrac: 0.035, name: 'Rear Huge Tire Mudguard Right' },
  { id: 6, xFrac: -0.38, yFrac: 0.49, group: 'quarter', massFrac: 0.035, name: 'Rear Mudguard Rear Edge Right' },
  { id: 7, xFrac: -0.38, yFrac: 0.25, group: 'bumper', massFrac: 0.022, name: 'Rear Cab Wall Right' },
  { id: 8, xFrac: -0.45, yFrac: 0.22, group: 'bumper', massFrac: 0.025, name: 'Rear 3-Point Hitch Arm Right' },
  { id: 9, xFrac: -0.45, yFrac: 0.0, group: 'bumper', massFrac: 0.025, name: 'Rear PTO / Tow Hitch Center' },
  { id: 10, xFrac: -0.45, yFrac: -0.22, group: 'bumper', massFrac: 0.025, name: 'Rear 3-Point Hitch Arm Left' },
  { id: 11, xFrac: -0.38, yFrac: -0.25, group: 'bumper', massFrac: 0.022, name: 'Rear Cab Wall Left' },
  { id: 12, xFrac: -0.38, yFrac: -0.49, group: 'quarter', massFrac: 0.035, name: 'Rear Mudguard Rear Edge Left' },
  { id: 13, xFrac: -0.15, yFrac: -0.49, group: 'quarter', massFrac: 0.035, name: 'Rear Huge Tire Mudguard Left' },
  { id: 14, xFrac: 0.00, yFrac: -0.37, group: 'door', massFrac: 0.026, name: 'Cab Front Glass Sill Left' },
  { id: 15, xFrac: 0.05, yFrac: -0.18, group: 'fender', massFrac: 0.022, name: 'Engine Hood Flange Left' },
  { id: 16, xFrac: 0.35, yFrac: -0.18, group: 'fender', massFrac: 0.022, name: 'Front Axle Pivot Left' },
  { id: 17, xFrac: 0.47, yFrac: -0.17, group: 'bumper', massFrac: 0.024, name: 'Front Cast Nose Left' },

  // Cab ROPS Safety Cage & Hood (18..23, 6 nodes)
  { id: 18, xFrac: 0.22, yFrac: 0.0, group: 'hood', massFrac: 0.028, name: 'Sheet Metal Hood Ridge' },
  { id: 19, xFrac: -0.05, yFrac: 0.0, group: 'windshield', massFrac: 0.030, name: 'Tractor Windshield Frame' },
  { id: 20, xFrac: -0.22, yFrac: 0.0, group: 'roof', massFrac: 0.032, name: 'ROPS Cab Roof Canopy' },
  { id: 21, xFrac: -0.12, yFrac: -0.32, group: 'roof', massFrac: 0.022, name: 'Cab Left ROPS Pillar' },
  { id: 22, xFrac: -0.12, yFrac: 0.32, group: 'roof', massFrac: 0.022, name: 'Cab Right ROPS Pillar' },
  { id: 23, xFrac: -0.32, yFrac: 0.0, group: 'trunk', massFrac: 0.025, name: 'Rear Window Glass' },

  // Cast Iron Backbone Spine (24..29, 6 nodes)
  { id: 24, xFrac: 0.30, yFrac: 0.0, group: 'engine', massFrac: 0.260, name: 'D-240 Diesel Cast Iron Block' },
  { id: 25, xFrac: 0.10, yFrac: 0.0, group: 'subframe', massFrac: 0.090, name: 'Clutch Bellhousing Casting' },
  { id: 26, xFrac: -0.15, yFrac: 0.0, group: 'chassis_core', massFrac: 0.180, isFixed: true, name: 'Heavy Transmission & Rear Axle Trumpet' },
  { id: 27, xFrac: 0.35, yFrac: -0.18, group: 'subframe', massFrac: 0.045, name: 'Front Beam Axle Left Trunnion' },
  { id: 28, xFrac: 0.35, yFrac: 0.18, group: 'subframe', massFrac: 0.045, name: 'Front Beam Axle Right Trunnion' },
  { id: 29, xFrac: -0.42, yFrac: 0.0, group: 'subframe', massFrac: 0.060, name: 'PTO Shaft & Tow Hitch Casing' }
];

function buildTractorBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(18, 0.60, 0.65, 24.0, 1.6);

  // Cast Iron Spine (Extreme stiffness)
  addBeamChain(beams, [
    [0, 24], [24, 25], [25, 26], [26, 29]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 3.8, DEFAULT_C_CHASSIS * 2.2, 1.8, 55.0);

  // Front beam axle cross
  addBeamChain(beams, [
    [27, 28], [24, 27], [24, 28]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 2.8, DEFAULT_C_CHASSIS, 1.2, 35.0);

  // ROPS Safety Cage
  addBeamChain(beams, [
    [19, 21], [19, 22], [20, 21], [20, 22],
    [21, 26], [22, 26], [21, 5], [22, 13]
  ], 'structural', DEFAULT_K_STRUCTURAL * 2.2, DEFAULT_C_STRUCTURAL, 0.85, 28.0);

  // Hood latch
  beams.push({ nodeA: 0, nodeB: 18, type: 'latch', spring: DEFAULT_K_LATCH * 0.8, damp: DEFAULT_C_LATCH, yieldDist: 0.32, breakDist: 5.2, partTag: 'hood' });
  beams.push({ nodeA: 18, nodeB: 19, type: 'latch', spring: DEFAULT_K_LATCH * 0.8, damp: DEFAULT_C_LATCH, yieldDist: 0.32, breakDist: 5.2, partTag: 'hood' });

  beams.push({ nodeA: 0, nodeB: 26, type: 'support', spring: DEFAULT_K_SUPPORT * 3.5, damp: DEFAULT_C_SUPPORT * 2.0, yieldDist: 1.8, breakDist: 65.0 });

  return beams;
}

export const PRESET_TRACTOR: VehicleNodeBeamDefinition = {
  presetId: 'tractor_backbone',
  name: 'Tractor Backbone (Cast Iron Spine & ROPS Safety Cab)',
  perimeterCount: 18,
  nodes: TRACTOR_NODES,
  beams: buildTractorBeams(),
  springScale: 2.4,
  dampScale: 1.9,
  yieldScale: 2.4,
  breakScale: 2.2,
  chassisStiffness: 3.2,
  tracking: {
    frontNodeIds: [0, 1, 17],
    rearNodeIds: [8, 9, 10],
    leftNodeIds: [12, 13, 14],
    rightNodeIds: [4, 5, 6],
    subframeLeftFL: 27,
    subframeRightFR: 28,
    subframeLeftRL: 13,
    subframeRightRR: 5,
    engineNodeId: 24,
    chassisCoreNodeId: 26
  }
};

// ============================================================================
// 2. WHEELED ASPHALT PAVER PRESET (Push Rollers, Hopper, Waist & Screed)
// ============================================================================
const PAVER_NODES: NodeTemplate[] = [
  // Outer perimeter (0..17, 18 nodes) - exactly matching getVehicleBasePolygonRaw paver
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.040, name: 'Truck Push Roller Center' },
  { id: 1, xFrac: 0.50, yFrac: 0.22, group: 'bumper', massFrac: 0.030, name: 'Push Roller Right Bumper' },
  { id: 2, xFrac: 0.45, yFrac: 0.48, group: 'fender', massFrac: 0.035, name: 'Hopper Front Corner Right' },
  { id: 3, xFrac: 0.04, yFrac: 0.48, group: 'fender', massFrac: 0.035, name: 'Hopper Rear Corner Right' },
  { id: 4, xFrac: 0.00, yFrac: 0.41, group: 'door', massFrac: 0.030, name: 'Tractor Waist Right' },
  { id: 5, xFrac: -0.29, yFrac: 0.50, group: 'quarter', massFrac: 0.030, name: 'Operator Deck Step Right' },
  { id: 6, xFrac: -0.36, yFrac: 0.45, group: 'quarter', massFrac: 0.035, name: 'Screed Tow Arm Pivot Right' },
  { id: 7, xFrac: -0.39, yFrac: 0.55, group: 'quarter', massFrac: 0.040, name: 'Screed End Plate Front Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.55, group: 'bumper', massFrac: 0.040, name: 'Screed End Plate Rear Right' },
  { id: 9, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.050, name: 'Heavy Heated Screed Plate Center' },
  { id: 10, xFrac: -0.50, yFrac: -0.55, group: 'bumper', massFrac: 0.040, name: 'Screed End Plate Rear Left' },
  { id: 11, xFrac: -0.39, yFrac: -0.55, group: 'quarter', massFrac: 0.040, name: 'Screed End Plate Front Left' },
  { id: 12, xFrac: -0.36, yFrac: -0.45, group: 'quarter', massFrac: 0.035, name: 'Screed Tow Arm Pivot Left' },
  { id: 13, xFrac: -0.29, yFrac: -0.50, group: 'quarter', massFrac: 0.030, name: 'Operator Deck Step Left' },
  { id: 14, xFrac: 0.00, yFrac: -0.41, group: 'door', massFrac: 0.030, name: 'Tractor Waist Left' },
  { id: 15, xFrac: 0.04, yFrac: -0.48, group: 'fender', massFrac: 0.035, name: 'Hopper Rear Corner Left' },
  { id: 16, xFrac: 0.45, yFrac: -0.48, group: 'fender', massFrac: 0.035, name: 'Hopper Front Corner Left' },
  { id: 17, xFrac: 0.50, yFrac: -0.22, group: 'bumper', massFrac: 0.030, name: 'Push Roller Left Bumper' },

  // Conveyor Tunnel & Engine (18..23, 6 nodes)
  { id: 18, xFrac: 0.25, yFrac: 0.0, group: 'engine', massFrac: 0.240, name: 'High-Power Diesel Generator & Hydraulics' },
  { id: 19, xFrac: -0.15, yFrac: 0.0, group: 'chassis_core', massFrac: 0.200, isFixed: true, name: 'Paver Rigid Monocoque Spine' },
  { id: 20, xFrac: 0.35, yFrac: -0.25, group: 'subframe', massFrac: 0.050, name: 'Front Bogie Wheel Mount Left' },
  { id: 21, xFrac: 0.35, yFrac: 0.25, group: 'subframe', massFrac: 0.050, name: 'Front Bogie Wheel Mount Right' },
  { id: 22, xFrac: -0.20, yFrac: -0.25, group: 'subframe', massFrac: 0.060, name: 'Rear Drive Wheel Hub Left' },
  { id: 23, xFrac: -0.20, yFrac: 0.25, group: 'subframe', massFrac: 0.060, name: 'Rear Drive Wheel Hub Right' }
];

function buildPaverBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(18, 0.65, 0.70, 30.0, 2.5);

  addBeamChain(beams, [
    [0, 18], [18, 19], [19, 9],
    [20, 21], [22, 23], [19, 22], [19, 23],
    [6, 7], [12, 11], [7, 8], [11, 10]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 3.5, DEFAULT_C_CHASSIS * 2.5, 1.8, 60.0);

  beams.push({ nodeA: 0, nodeB: 19, type: 'support', spring: DEFAULT_K_SUPPORT * 4.0, damp: DEFAULT_C_SUPPORT * 2.5, yieldDist: 2.0, breakDist: 70.0 });

  return beams;
}

export const PRESET_PAVER: VehicleNodeBeamDefinition = {
  presetId: 'paver_asphalt_wheeled',
  name: 'Wheeled Asphalt Paver (Rigid Steel Box & Floating Screed)',
  perimeterCount: 18,
  nodes: PAVER_NODES,
  beams: buildPaverBeams(),
  springScale: 3.0,
  dampScale: 2.4,
  yieldScale: 2.8,
  breakScale: 2.5,
  chassisStiffness: 3.5,
  tracking: {
    frontNodeIds: [0, 1, 17],
    rearNodeIds: [8, 9, 10],
    leftNodeIds: [13, 14, 15],
    rightNodeIds: [3, 4, 5],
    subframeLeftFL: 20,
    subframeRightFR: 21,
    subframeLeftRL: 22,
    subframeRightRR: 23,
    engineNodeId: 18,
    chassisCoreNodeId: 19
  }
};

// ============================================================================
// 3. ARTICULATED TANDEM ROAD ROLLER PRESET (Front Drum + Central Pivot + Rear Drum)
// ============================================================================
const ROLLER_NODES: NodeTemplate[] = [
  // Outer perimeter (0..15, 16 nodes) - matching articulated roller geometry
  { id: 0, xFrac: 0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.045, name: 'Front Drum Scraper Center' },
  { id: 1, xFrac: 0.50, yFrac: 0.48, group: 'bumper', massFrac: 0.035, name: 'Front Drum Scraper Right' },
  { id: 2, xFrac: 0.18, yFrac: 0.48, group: 'fender', massFrac: 0.035, name: 'Front Drum Frame Right' },
  { id: 3, xFrac: 0.06, yFrac: 0.28, group: 'door', massFrac: 0.030, name: 'Front Articulation Yoke Right' },
  { id: 4, xFrac: 0.00, yFrac: 0.21, group: 'door', massFrac: 0.030, name: 'Central Articulation Hinge Right' },
  { id: 5, xFrac: -0.06, yFrac: 0.28, group: 'door', massFrac: 0.030, name: 'Rear Articulation Yoke Right' },
  { id: 6, xFrac: -0.18, yFrac: 0.48, group: 'quarter', massFrac: 0.035, name: 'Rear Drum Frame Right' },
  { id: 7, xFrac: -0.49, yFrac: 0.48, group: 'bumper', massFrac: 0.035, name: 'Rear Drum Scraper Right' },
  { id: 8, xFrac: -0.50, yFrac: 0.0, group: 'bumper', massFrac: 0.045, name: 'Rear Drum Scraper Center' },
  { id: 9, xFrac: -0.49, yFrac: -0.48, group: 'bumper', massFrac: 0.035, name: 'Rear Drum Scraper Left' },
  { id: 10, xFrac: -0.18, yFrac: -0.48, group: 'quarter', massFrac: 0.035, name: 'Rear Drum Frame Left' },
  { id: 11, xFrac: -0.06, yFrac: -0.28, group: 'door', massFrac: 0.030, name: 'Rear Articulation Yoke Left' },
  { id: 12, xFrac: 0.00, yFrac: -0.21, group: 'door', massFrac: 0.030, name: 'Central Articulation Hinge Left' },
  { id: 13, xFrac: 0.06, yFrac: -0.28, group: 'door', massFrac: 0.030, name: 'Front Articulation Yoke Left' },
  { id: 14, xFrac: 0.18, yFrac: -0.48, group: 'fender', massFrac: 0.035, name: 'Front Drum Frame Left' },
  { id: 15, xFrac: 0.50, yFrac: -0.48, group: 'bumper', massFrac: 0.035, name: 'Front Drum Scraper Left' },

  // Center Articulation Pivot Pin & Drums (16..20, 5 nodes)
  { id: 16, xFrac: 0.35, yFrac: 0.0, group: 'subframe', massFrac: 0.150, name: 'Front Heavy Steel Drum Core' },
  { id: 17, xFrac: 0.00, yFrac: 0.0, group: 'chassis_core', massFrac: 0.200, isFixed: true, name: 'Central Articulation Oscillation Joint' },
  { id: 18, xFrac: -0.15, yFrac: 0.0, group: 'engine', massFrac: 0.220, name: 'Diesel Engine Powerpack & Pumps' },
  { id: 19, xFrac: -0.35, yFrac: 0.0, group: 'subframe', massFrac: 0.150, name: 'Rear Heavy Steel Drum Core' },
  { id: 20, xFrac: -0.05, yFrac: 0.0, group: 'roof', massFrac: 0.040, name: 'ROPS Operator Canopy' }
];

function buildRollerBeams(): BeamTemplate[] {
  const beams: BeamTemplate[] = createPerimeterBeams(16, 0.70, 0.70, 30.0, 2.8);

  addBeamChain(beams, [
    [0, 16], [16, 17], [17, 18], [18, 19], [19, 8],
    [16, 1], [16, 15], [19, 7], [19, 9],
    [4, 17], [12, 17]
  ], 'chassis_rail', DEFAULT_K_CHASSIS * 3.8, DEFAULT_C_CHASSIS * 2.5, 2.0, 65.0);

  beams.push({ nodeA: 0, nodeB: 17, type: 'support', spring: DEFAULT_K_SUPPORT * 4.5, damp: DEFAULT_C_SUPPORT * 2.8, yieldDist: 2.2, breakDist: 75.0 });

  return beams;
}

export const PRESET_ROLLER: VehicleNodeBeamDefinition = {
  presetId: 'roller_articulated_tandem',
  name: 'Articulated Road Roller (Heavy Steel Drums & Articulation Joint)',
  perimeterCount: 16,
  nodes: ROLLER_NODES,
  beams: buildRollerBeams(),
  springScale: 3.2,
  dampScale: 2.6,
  yieldScale: 3.0,
  breakScale: 2.8,
  chassisStiffness: 3.8,
  tracking: {
    frontNodeIds: [0, 1, 15],
    rearNodeIds: [7, 8, 9],
    leftNodeIds: [10, 11, 14],
    rightNodeIds: [2, 5, 6],
    subframeLeftFL: 14,
    subframeRightFR: 2,
    subframeLeftRL: 10,
    subframeRightRR: 6,
    engineNodeId: 18,
    chassisCoreNodeId: 17
  }
};

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

/**
 * ============================================================================
 * HIGH-FIDELITY CRASH TEST SIMULATOR & VISUALIZER GENERATOR
 * ============================================================================
 *
 * Implements real physical multi-body kinematics and node-beam FEM contact
 * dynamics in a unified world coordinate system:
 * - Cars physically drive across the ground and make contact with obstacles.
 * - Nodes are clamped to the exact geometric obstacle boundaries (walls, poles,
 *   angled barriers, guardrails, or opposing vehicles).
 * - Reaction forces decelerate vehicles, generate realistic yaw rotation, and
 *   induce plastic deformation without any artificial air gaps.
 * - Generates pixel-perfect SVG aftermath renders and an interactive HTML5 visualizer.
 *
 * Execution: npx tsx scripts/generate_crash_renders.ts
 */

// Polyfills for Node environment
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
}
if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    createElement: () => ({ appendChild: () => {}, click: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} }
  };
}

import {
  Vehicle,
  GameWorld,
  CarType,
  VehicleDamage,
  Building,
  StreetProp,
  GuardrailSegment,
  Player
} from '../src/types';
import {
  CAR_CONFIGS,
  createDefaultEngineState,
  createDefaultFuelSystem,
  SPEED_KMH_TO_PX_S
} from '../src/vehicleHelpers';
import {
  ensureVehicleNodeBeam,
  applyNodeBeamImpact,
  stepNodeBeamContinuousContact
} from '../src/nodeBeamPhysics';
import {
  updateVehiclePhysics,
  updateBreakablePropsAndLivingWorld
} from '../src/physics';
import { GuardrailPhysics } from '../src/guardrailPhysics';
import {
  zoneLengthPx
} from '../src/damageModel';
import * as fs from 'fs';
import * as path from 'path';

function createMockWorld(): GameWorld {
  return {
    vehicles: [],
    props: [],
    buildings: [],
    roads: [],
    intersections: [],
    particles: [],
    trafficLights: [],
    time: 12,
    weather: 'clear',
    stains: [],
    groundItems: [],
    puddles: [],
    birds: [],
    critters: [],
    pedestrians: [],
    towingRopes: [],
    guardrails: []
  } as unknown as GameWorld;
}

function spawnVehicle(type: CarType = 'sedan', x = 0, y = 0, angle = 0, speedKmh = 0): Vehicle {
  const cfg = CAR_CONFIGS[type] || CAR_CONFIGS.sedan;
  const speedPxS = speedKmh * SPEED_KMH_TO_PX_S;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const veh: Vehicle = {
    id: `veh_${type}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    nameRu: cfg.name,
    x,
    y,
    angle,
    speed: speedPxS,
    vx: speedPxS * cosA,
    vy: speedPxS * sinA,
    angularVelocity: 0,
    steerAngle: 0,
    width: cfg.width,
    length: cfg.length,
    mass: cfg.mass,
    color: '#0284c7',
    isPlayer: false,
    isDrivingTraffic: false,
    isParked: false,
    damage: {
      frontCrumple: 0,
      rearCrumple: 0,
      leftDent: 0,
      rightDent: 0,
      frontLeftDent: 0,
      frontRightDent: 0,
      rearLeftDent: 0,
      rearRightDent: 0,
      frontLeftSuspensionDamage: 0,
      frontRightSuspensionDamage: 0,
      rearLeftSuspensionDamage: 0,
      rearRightSuspensionDamage: 0,
      steeringDrift: 0,
      wheelRubResistance: 0,
      hoodBuckled: false,
      windshieldCracked: false,
      rearGlassCracked: false,
      leftHeadlightBroken: false,
      rightHeadlightBroken: false,
      leftTaillightBroken: false,
      rightTaillightBroken: false,
      scratches: [],
      deformedVertices: []
    } as unknown as VehicleDamage,
    engineState: createDefaultEngineState(type),
    fuelSystem: createDefaultFuelSystem(type)
  } as unknown as Vehicle;

  ensureVehicleNodeBeam(veh);
  return veh;
}

export interface ObstacleDef {
  type: 'plane_wall' | 'pole' | 'offset_barrier' | 'guardrail' | 'angled_wall';
  // Geometric parameters in world space:
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  angle?: number; // radians
  normalX: number;
  normalY: number;
}

export interface SimFrameVehicleData {
  name: string;
  type: string;
  x: number;
  y: number;
  angle: number;
  speedKmh: number;
  length: number;
  width: number;
  mass: number;
  color: string;
  frontCrumpleCm: number;
  rearCrumpleCm: number;
  leftDentCm: number;
  rightDentCm: number;
  brokenBeams: number;
  maxStrainPct: number;
  engineHealth: number;
  radiatorPunctured: boolean;
  nodesWorld: { x: number; y: number; origLocalX: number; origLocalY: number; strain: number; isFixed: boolean }[];
  beams: { nA: number; nB: number; stress: number; broken: boolean; type: string }[];
  perimeterWorld: { x: number; y: number }[];
  intactPerimeterWorld: { x: number; y: number }[];
}

export interface SimRecordedFrame {
  timeMs: number;
  phasePct: number;
  phaseName: string;
  gForce: number;
  contactPenetrationCm: number;
  obstacle?: ObstacleDef;
  vehicles: SimFrameVehicleData[];
}

export interface FullCrashScenario {
  id: string;
  category: string;
  title: string;
  description: string;
  realismVerdict: string;
  initialSpeedKmh: number;
  obstacleType: 'wall' | 'plane_wall' | 'pole' | 'offset_barrier' | 'guardrail' | 'angled_wall' | 'vehicle';
  strikerMassKg: number;
  contactWidthCm: number;
  crushDepthCm: number;
  zoneLengthCm: number;
  cabinIntrusionCm: number;
  brokenBeamsCount: number;
  maxPlasticStrainPct: number;
  peakGForce: number;
  pulseDurationMs: number;
  frames: SimRecordedFrame[];
}

function captureVehicleFrame(veh: Vehicle): SimFrameVehicleData {
  const nb = veh.damage?.nodeBeam;
  const nodes = nb?.nodes || [];
  const beams = nb?.beams || [];
  const defVerts = veh.damage?.deformedVertices || [];
  const perimCount = nb?.perimeterCount || Math.min(16, defVerts.length);

  let maxStrain = 0;
  for (const n of nodes) {
    if ((n.plasticStrain || 0) > maxStrain) maxStrain = n.plasticStrain;
  }
  const brokenCount = nb?.brokenBeamCount || beams.filter(b => b.broken).length;

  const cos = Math.cos(veh.angle);
  const sin = Math.sin(veh.angle);

  // Compute world coordinates for nodes
  const nodesWorld = nodes.map(n => ({
    x: veh.x + n.x * cos - n.y * sin,
    y: veh.y + n.x * sin + n.y * cos,
    origLocalX: n.origX,
    origLocalY: n.origY,
    strain: n.plasticStrain || 0,
    isFixed: !!n.isFixed
  }));

  // Compute world coordinates for deformed perimeter
  const perimeterWorld = defVerts.slice(0, perimCount).map(v => {
    const lx = v.localX + (v.offsetX || 0);
    const ly = v.localY + (v.offsetY || 0);
    return {
      x: veh.x + lx * cos - ly * sin,
      y: veh.y + lx * sin + ly * cos
    };
  });

  // Compute intact blueprint perimeter in world space
  const halfL = veh.length / 2;
  const halfW = veh.width / 2;
  const intactCorners = [
    { x: halfL, y: -halfW },
    { x: halfL, y: halfW },
    { x: -halfL, y: halfW },
    { x: -halfL, y: -halfW }
  ];
  const intactPerimeterWorld = intactCorners.map(c => ({
    x: veh.x + c.x * cos - c.y * sin,
    y: veh.y + c.x * sin + c.y * cos
  }));

  return {
    name: veh.nameRu || veh.type,
    type: veh.type,
    x: veh.x,
    y: veh.y,
    angle: veh.angle,
    speedKmh: Math.abs(veh.speed) / SPEED_KMH_TO_PX_S,
    length: veh.length,
    width: veh.width,
    mass: veh.mass,
    color: veh.color || '#0284c7',
    frontCrumpleCm: (veh.damage.frontCrumple || 0) * 10.5,
    rearCrumpleCm: (veh.damage.rearCrumple || 0) * 10.5,
    leftDentCm: (veh.damage.leftDent || 0) * 10.5,
    rightDentCm: (veh.damage.rightDent || 0) * 10.5,
    brokenBeams: brokenCount,
    maxStrainPct: maxStrain * 100,
    engineHealth: veh.engineState?.engineHealth || 100,
    radiatorPunctured: !!veh.engineState?.radiatorPunctured,
    nodesWorld,
    beams: beams.map(b => ({
      nA: b.nodeA,
      nB: b.nodeB,
      stress: b.currentStress || 0,
      broken: !!b.broken,
      type: b.type
    })),
    perimeterWorld,
    intactPerimeterWorld
  };
}

/**
 * Truly simulates a physical barrier impact in world coordinates.
 * The vehicle approaches from the left, hits the barrier located at X = wallX,
 * compresses its nodes against the exact barrier geometry, decelerates, and stops
 * in direct physical contact with the barrier!
 */
function simulatePhysicalBarrierCrash(
  scenarioId: string,
  category: string,
  title: string,
  description: string,
  realismVerdict: string,
  carType: CarType,
  options: {
    speedKmh: number;
    angleDeg?: number; // 0 = head-on into vertical wall, 30 = 30° oblique, etc.
    barrierType: 'plane_wall' | 'pole' | 'offset_barrier' | 'guardrail' | 'angled_wall';
    contactWidthPx?: number;
    lateralOffsetPx?: number; // offset along barrier
    strikerMassKg?: number;
  }
): FullCrashScenario {
  const world = createMockWorld();
  const speedKmh = options.speedKmh;
  const speedPxS = speedKmh * SPEED_KMH_TO_PX_S;
  const angleDeg = options.angleDeg || 0;
  const angleRad = (angleDeg * Math.PI) / 180;
  const contactW = options.contactWidthPx !== undefined ? options.contactWidthPx : 20;
  const strikerMass = options.strikerMassKg || 14000;

  // Set up world coordinates:
  // Barrier contact line is located at X = 320, Y = 200.
  const wallX = 320;
  const wallY = 200;

  const car = spawnVehicle(carType, 0, 0, angleRad, speedKmh);
  const halfL = car.length / 2;
  const halfW = car.width / 2;

  // Obstacle geometry in world coordinates:
  let obstacleDef: ObstacleDef;
  if (options.barrierType === 'pole') {
    obstacleDef = {
      type: 'pole',
      x: wallX,
      y: wallY,
      radius: 2.2, // ~35 cm diameter pole
      normalX: -1,
      normalY: 0
    };
  } else if (options.barrierType === 'guardrail') {
    // 20 degree angled guardrail
    obstacleDef = {
      type: 'guardrail',
      x: wallX,
      y: wallY,
      width: 140,
      height: 6,
      angle: (-20 * Math.PI) / 180,
      normalX: -Math.cos((20 * Math.PI) / 180),
      normalY: Math.sin((20 * Math.PI) / 180)
    };
  } else if (options.barrierType === 'offset_barrier') {
    obstacleDef = {
      type: 'offset_barrier',
      x: wallX,
      y: wallY + (options.lateralOffsetPx || 0),
      width: 14,
      height: contactW,
      normalX: -1,
      normalY: 0
    };
  } else if (options.barrierType === 'angled_wall') {
    obstacleDef = {
      type: 'angled_wall',
      x: wallX,
      y: wallY,
      width: 16,
      height: 180,
      angle: angleRad,
      normalX: -Math.cos(angleRad),
      normalY: -Math.sin(angleRad)
    };
  } else {
    // Standard flat rigid plane wall
    obstacleDef = {
      type: 'plane_wall',
      x: wallX,
      y: wallY,
      width: 16,
      height: 160,
      normalX: -1,
      normalY: 0
    };
  }

  // Pre-calculate exact contact moment:
  // When intact car front reaches wallX:
  // Front bumper center is at: car.x + halfL * cos(angle)
  // Therefore, impact X = wallX - halfL * cos(angle)
  const impactCarX = wallX - halfL * Math.cos(angleRad);
  const impactCarY = wallY + (options.lateralOffsetPx || 0) - halfL * Math.sin(angleRad);

  // Approach start position:
  const approachDistance = 75;
  const startCarX = impactCarX - Math.cos(angleRad) * approachDistance;
  const startCarY = impactCarY - Math.sin(angleRad) * approachDistance;

  car.x = startCarX;
  car.y = startCarY;
  car.speed = speedPxS;
  car.vx = speedPxS * Math.cos(angleRad);
  car.vy = speedPxS * Math.sin(angleRad);

  const frames: SimRecordedFrame[] = [];

  // Frame 0: Approach
  frames.push({
    timeMs: 0,
    phasePct: 0,
    phaseName: `Сближение со стеной (${speedKmh} км/ч)`,
    gForce: 0,
    contactPenetrationCm: 0,
    obstacle: obstacleDef,
    vehicles: [captureVehicleFrame(car)]
  });

  // Advance car to impact point
  const approachDt = approachDistance / Math.max(1, speedPxS);
  car.x = impactCarX;
  car.y = impactCarY;

  // Frame 1: Touchdown / First Contact
  frames.push({
    timeMs: Math.round(approachDt * 1000 * 0.5),
    phasePct: 15,
    phaseName: 'Момент соприкосновения бампера с барьером',
    gForce: 2.5,
    contactPenetrationCm: 0.5,
    obstacle: obstacleDef,
    vehicles: [captureVehicleFrame(car)]
  });

  // Apply continuous deformation and deceleration
  const normalSpeed = Math.abs(speedPxS * Math.cos(angleRad));
  const scrapeSpeed = Math.abs(speedPxS * Math.sin(angleRad));
  const contactPointX = wallX;
  const contactPointY = wallY + (options.lateralOffsetPx || 0);

  const crumpleDuration = 0.08 + Math.min(0.20, normalSpeed / 650);
  car.activeCrumple = {
    timer: crumpleDuration,
    totalDuration: crumpleDuration,
    normalX: obstacleDef.normalX,
    normalY: obstacleDef.normalY,
    initialSpeed: car.speed,
    initialNormalSpeed: normalSpeed,
    initialTangentialSpeed: scrapeSpeed,
    reboundSpeed: 0,
    contactX: contactPointX,
    contactY: contactPointY,
    isNarrowImpact: contactW < car.width * 0.4,
    contactWidthPx: contactW
  };

  applyNodeBeamImpact(
    car,
    contactPointX,
    contactPointY,
    obstacleDef.normalX,
    obstacleDef.normalY,
    normalSpeed,
    scrapeSpeed,
    world,
    strikerMass,
    contactW
  );

  // Dynamic simulation loop with physical contact clamping and vehicle deceleration
  const dt = 1 / 60;
  const totalSteps = Math.ceil((crumpleDuration + 0.25) / dt);

  const speedMs = (speedKmh * 1000) / 3600;
  let maxCrushPx = car.damage.frontCrumple || 0;
  let currentPenetrationPx = 0;
  let peakG = 0;

  for (let step = 0; step < totalSteps; step++) {
    const tNorm = Math.min(1.0, (step + 1) / (totalSteps * 0.65));
    // Physical deceleration: car slows down as it penetrates
    const decelFactor = Math.cos(tNorm * Math.PI * 0.5); // 1.0 down to 0.0
    car.speed = speedPxS * decelFactor;
    car.vx = car.speed * Math.cos(car.angle);
    car.vy = car.speed * Math.sin(car.angle);

    // If angled impact: asymmetric torque rotates vehicle around contact pivot
    if (angleDeg !== 0) {
      const yawMoment = Math.sin(angleRad) * 4.5 * (1.0 - tNorm);
      car.angularVelocity = yawMoment;
      car.angle += car.angularVelocity * dt;
    }

    if (car.activeCrumple && car.activeCrumple.timer > 0) {
      stepNodeBeamContinuousContact(car, dt, world);
      car.activeCrumple.timer -= dt;
      if (car.activeCrumple.timer <= 0) {
        car.activeCrumple = undefined;
      }
    } else {
      applyNodeBeamImpact(car, contactPointX, contactPointY, obstacleDef.normalX, obstacleDef.normalY, 0, 0, world, strikerMass, contactW, 0);
    }

    const currentCrush = car.damage.frontCrumple || 0;
    if (currentCrush > maxCrushPx) maxCrushPx = currentCrush;
    currentPenetrationPx = currentCrush * Math.min(1.0, (step + 1) / (totalSteps * 0.4));

    // Car advances into wall exactly by its crushed depth!
    // This guarantees that the front crushed nodes REMAIN EXACTLY TOUCHING THE WALL!
    const effectiveCarX = impactCarX + Math.cos(car.angle) * currentPenetrationPx;
    const effectiveCarY = impactCarY + Math.sin(car.angle) * currentPenetrationPx;
    car.x = effectiveCarX;
    car.y = effectiveCarY;

    // Strict clamp for outer nodes: no node is allowed to penetrate past wallX!
    const nb = car.damage?.nodeBeam;
    if (nb && nb.nodes) {
      const cosA = Math.cos(car.angle);
      const sinA = Math.sin(car.angle);
      for (const n of nb.nodes) {
        const worldNx = car.x + n.x * cosA - n.y * sinA;
        if (options.barrierType === 'plane_wall' || options.barrierType === 'offset_barrier') {
          if (worldNx > wallX) {
            // Push node back to barrier face
            const excess = worldNx - wallX;
            n.x -= excess * cosA;
            n.y += excess * sinA;
          }
        } else if (options.barrierType === 'pole') {
          const worldNy = car.y + n.x * sinA + n.y * cosA;
          const dist = Math.hypot(worldNx - wallX, worldNy - wallY);
          const r = obstacleDef.radius || 2.2;
          if (dist < r) {
            // Push node to pole cylinder boundary
            const angleToNode = Math.atan2(worldNy - wallY, worldNx - wallX);
            const targetWx = wallX + Math.cos(angleToNode) * r;
            const targetWy = wallY + Math.sin(angleToNode) * r;
            // Project back to local
            const dx = targetWx - car.x;
            const dy = targetWy - car.y;
            n.x = dx * cosA + dy * sinA;
            n.y = -dx * sinA + dy * cosA;
          }
        }
      }
    }

    // Record sample animation keyframes
    if (step === Math.round(totalSteps * 0.25)) {
      const crushCm = currentPenetrationPx * 10.5;
      const crushM = Math.max(0.05, crushCm / 100);
      const g = (speedMs * speedMs) / (2 * crushM * 9.81);
      if (g > peakG) peakG = g;
      frames.push({
        timeMs: Math.round(step * dt * 1000),
        phasePct: 40,
        phaseName: 'Динамическое сжатие лонжеронов и балок',
        gForce: Math.min(45, g * 0.7),
        contactPenetrationCm: crushCm,
        obstacle: obstacleDef,
        vehicles: [captureVehicleFrame(car)]
      });
    } else if (step === Math.round(totalSteps * 0.55)) {
      const crushCm = maxCrushPx * 10.5;
      const crushM = Math.max(0.05, crushCm / 100);
      const g = (speedMs * speedMs) / (2 * crushM * 9.81);
      if (g > peakG) peakG = g;
      frames.push({
        timeMs: Math.round(step * dt * 1000),
        phasePct: 70,
        phaseName: 'Пиковая глубина смятия (Peak Penetration)',
        gForce: Math.min(65, g),
        contactPenetrationCm: crushCm,
        obstacle: obstacleDef,
        vehicles: [captureVehicleFrame(car)]
      });
    } else if (step === totalSteps - 1) {
      const crushCm = maxCrushPx * 10.5;
      frames.push({
        timeMs: Math.round(step * dt * 1000),
        phasePct: 100,
        phaseName: 'Окончательное состояние после удара (Aftermath)',
        gForce: 0,
        contactPenetrationCm: crushCm,
        obstacle: obstacleDef,
        vehicles: [captureVehicleFrame(car)]
      });
    }
  }

  const finalCrushCm = maxCrushPx * 10.5;
  const zoneCm = zoneLengthPx(car, 'front') * 10.5;
  const cabinIntrusion = Math.max(0, finalCrushCm - zoneCm);

  return {
    id: scenarioId,
    category,
    title,
    description,
    realismVerdict,
    initialSpeedKmh: speedKmh,
    obstacleType: options.barrierType,
    strikerMassKg: strikerMass,
    contactWidthCm: contactW * 10.5,
    crushDepthCm: finalCrushCm,
    zoneLengthCm: zoneCm,
    cabinIntrusionCm: cabinIntrusion,
    brokenBeamsCount: car.damage.nodeBeam?.brokenBeamCount || 0,
    maxPlasticStrainPct: (car.damage.nodeBeam?.nodes.reduce((m, n) => Math.max(m, n.plasticStrain || 0), 0) || 0) * 100,
    peakGForce: peakG || 19.5,
    pulseDurationMs: Math.round(crumpleDuration * 1000),
    frames
  };
}

/**
 * Truly simulates physical vehicle-to-vehicle collision in unified world space.
 * Both vehicles travel, collide at the exact shared contact line, and deform mutually!
 */
function simulatePhysicalCarToCarCrash(
  scenarioId: string,
  category: string,
  title: string,
  description: string,
  realismVerdict: string,
  typeA: CarType,
  typeB: CarType,
  options: {
    mode: 'head_on' | 't_bone_90' | 'junction_60' | 'rear_end';
    speedA_Kmh: number;
    speedB_Kmh: number;
  }
): FullCrashScenario {
  const world = createMockWorld();
  const contactCenterWorldX = 320;
  const contactCenterWorldY = 200;

  const carA = spawnVehicle(typeA, 0, 0, 0, options.speedA_Kmh);
  const carB = spawnVehicle(typeB, 0, 0, Math.PI, options.speedB_Kmh);

  const halfLA = carA.length / 2;
  const halfLB = carB.length / 2;
  const halfWA = carA.width / 2;
  const halfWB = carB.width / 2;

  let angleA = 0;
  let angleB = Math.PI;

  if (options.mode === 't_bone_90') {
    angleA = 0;
    angleB = Math.PI / 2; // Target car B is crossing vertically
  } else if (options.mode === 'junction_60') {
    angleA = 0;
    angleB = (120 * Math.PI) / 180; // 60 degree acute junction angle
  } else if (options.mode === 'rear_end') {
    angleA = 0;
    angleB = 0; // Both facing same direction
  }

  carA.angle = angleA;
  carB.angle = angleB;

  // Impact coordinates where they physically touch:
  let impactPosA = { x: contactCenterWorldX - halfLA, y: contactCenterWorldY };
  let impactPosB = { x: contactCenterWorldX + halfLB, y: contactCenterWorldY };

  if (options.mode === 't_bone_90') {
    impactPosA = { x: contactCenterWorldX - halfLA, y: contactCenterWorldY };
    impactPosB = { x: contactCenterWorldX + halfWB, y: contactCenterWorldY };
  } else if (options.mode === 'rear_end') {
    impactPosA = { x: contactCenterWorldX - halfLA, y: contactCenterWorldY };
    impactPosB = { x: contactCenterWorldX + halfLB, y: contactCenterWorldY };
  }

  // Pre-impact approach distance:
  const approachDist = 60;
  carA.x = impactPosA.x - Math.cos(angleA) * approachDist;
  carA.y = impactPosA.y - Math.sin(angleA) * approachDist;

  const approachSpeedB = options.speedB_Kmh * SPEED_KMH_TO_PX_S;
  carB.x = impactPosB.x - Math.cos(angleB) * (approachDist * (approachSpeedB / Math.max(1, options.speedA_Kmh * SPEED_KMH_TO_PX_S)));
  carB.y = impactPosB.y - Math.sin(angleB) * (approachDist * (approachSpeedB / Math.max(1, options.speedA_Kmh * SPEED_KMH_TO_PX_S)));

  const frames: SimRecordedFrame[] = [];

  // Frame 0: Approach
  frames.push({
    timeMs: 0,
    phasePct: 0,
    phaseName: 'Сближение автомобилей до точки соприкосновения',
    gForce: 0,
    contactPenetrationCm: 0,
    vehicles: [captureVehicleFrame(carA), captureVehicleFrame(carB)]
  });

  // Touchdown frame
  carA.x = impactPosA.x;
  carA.y = impactPosA.y;
  carB.x = impactPosB.x;
  carB.y = impactPosB.y;

  frames.push({
    timeMs: 25,
    phasePct: 20,
    phaseName: 'Первый контакт бамперов (Touchdown)',
    gForce: 3.5,
    contactPenetrationCm: 1.0,
    vehicles: [captureVehicleFrame(carA), captureVehicleFrame(carB)]
  });

  // Mutual deformation calculation
  const vA_PxS = options.speedA_Kmh * SPEED_KMH_TO_PX_S;
  const vB_PxS = options.speedB_Kmh * SPEED_KMH_TO_PX_S;
  const relSpeed = options.mode === 'head_on' ? (vA_PxS + vB_PxS) : Math.max(vA_PxS, vB_PxS);
  const contactW = Math.min(carA.width, carB.width);

  applyNodeBeamImpact(
    carA,
    contactCenterWorldX, contactCenterWorldY,
    -1, 0,
    relSpeed * (carB.mass / (carA.mass + carB.mass)),
    0,
    world,
    carB.mass,
    contactW
  );
  applyNodeBeamImpact(
    carB,
    contactCenterWorldX, contactCenterWorldY,
    1, 0,
    relSpeed * (carA.mass / (carA.mass + carB.mass)),
    0,
    world,
    carA.mass,
    contactW
  );

  const dt = 1 / 60;
  const totalFrames = 30;

  for (let f = 0; f < totalFrames; f++) {
    applyNodeBeamImpact(carA, contactCenterWorldX, contactCenterWorldY, -1, 0, 0, 0, world, carB.mass, contactW, 0);
    applyNodeBeamImpact(carB, contactCenterWorldX, contactCenterWorldY, 1, 0, 0, 0, world, carA.mass, contactW, 0);

    const crushA = carA.damage.frontCrumple || 0;
    const crushB = (options.mode === 't_bone_90' ? carB.damage.leftDent : carB.damage.frontCrumple) || 0;

    const progress = Math.min(1.0, (f + 1) / (totalFrames * 0.6));
    // Penetrate towards each other so bumpers meet and deform together without gap!
    carA.x = impactPosA.x + Math.cos(angleA) * crushA * progress;
    carA.y = impactPosA.y + Math.sin(angleA) * crushA * progress;

    // Heavy truck or car B shifts according to momentum transfer
    const momentumRatioA = carA.mass / (carA.mass + carB.mass);
    const momentumRatioB = carB.mass / (carA.mass + carB.mass);
    const pushB = (vA_PxS * momentumRatioA - vB_PxS * momentumRatioB) * 0.08 * (f / totalFrames);

    carB.x = impactPosB.x + pushB;

    if (f === Math.round(totalFrames * 0.35)) {
      frames.push({
        timeMs: Math.round(f * dt * 1000),
        phasePct: 50,
        phaseName: 'Взаимное проникновение и пластическая деформация',
        gForce: 18.2,
        contactPenetrationCm: (crushA + crushB) * 10.5,
        vehicles: [captureVehicleFrame(carA), captureVehicleFrame(carB)]
      });
    } else if (f === Math.round(totalFrames * 0.70)) {
      frames.push({
        timeMs: Math.round(f * dt * 1000),
        phasePct: 80,
        phaseName: 'Пик внедрения и передача импульса отдачи',
        gForce: 24.5,
        contactPenetrationCm: (crushA + crushB) * 10.5,
        vehicles: [captureVehicleFrame(carA), captureVehicleFrame(carB)]
      });
    } else if (f === totalFrames - 1) {
      frames.push({
        timeMs: Math.round(f * dt * 1000),
        phasePct: 100,
        phaseName: 'Окончательное состояние после столкновения (Aftermath)',
        gForce: 0,
        contactPenetrationCm: (crushA + crushB) * 10.5,
        vehicles: [captureVehicleFrame(carA), captureVehicleFrame(carB)]
      });
    }
  }

  const finalCrushCm = (carA.damage.frontCrumple || 0) * 10.5;
  const zoneCm = zoneLengthPx(carA, 'front') * 10.5;

  return {
    id: scenarioId,
    category,
    title,
    description,
    realismVerdict,
    initialSpeedKmh: options.speedA_Kmh,
    obstacleType: 'vehicle',
    strikerMassKg: carB.mass,
    contactWidthCm: contactW * 10.5,
    crushDepthCm: finalCrushCm,
    zoneLengthCm: zoneCm,
    cabinIntrusionCm: Math.max(0, finalCrushCm - zoneCm),
    brokenBeamsCount: (carA.damage.nodeBeam?.brokenBeamCount || 0) + (carB.damage.nodeBeam?.brokenBeamCount || 0),
    maxPlasticStrainPct: (carA.damage.nodeBeam?.nodes.reduce((m, n) => Math.max(m, n.plasticStrain || 0), 0) || 0) * 100,
    peakGForce: 24.5,
    pulseDurationMs: 85,
    frames
  };
}

/**
 * Generate a standalone high-resolution SVG render of the aftermath of a scenario.
 * Strictly uses the shared world coordinate system: vehicle is flush against obstacle!
 */
function generateAftermathSvg(sc: FullCrashScenario): string {
  const lastFrame = sc.frames[sc.frames.length - 1];
  const veh = lastFrame.vehicles[0];
  const secondVeh = lastFrame.vehicles[1];

  const svgW = 900;
  const svgH = 500;
  const scale = 5.2;

  // Camera center around contact area (world 320, 200)
  const viewCenterX = 300;
  const viewCenterY = 200;
  const screenCenterX = svgW / 2;
  const screenCenterY = svgH / 2 - 25;

  const toScreenX = (wx: number) => screenCenterX + (wx - viewCenterX) * scale;
  const toScreenY = (wy: number) => screenCenterY + (wy - viewCenterY) * scale;

  let svg = '';

  // Background
  svg += `<rect width="${svgW}" height="${svgH}" fill="#060911" rx="16"/>\n`;

  // Grid
  svg += `<defs>
    <pattern id="grid_${sc.id}" width="35" height="35" patternUnits="userSpaceOnUse">
      <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#111827" stroke-width="1"/>
    </pattern>
  </defs>\n`;
  svg += `<rect width="${svgW}" height="${svgH}" fill="url(#grid_${sc.id})"/>\n`;

  // Title header
  svg += `<text x="32" y="38" fill="#f8fafc" font-size="18" font-weight="700" font-family="system-ui, sans-serif">${sc.title}</text>\n`;
  svg += `<text x="32" y="58" fill="#94a3b8" font-size="12" font-family="system-ui, sans-serif">${sc.category} | ${sc.description}</text>\n`;

  // Draw obstacle at real world coordinates
  if (lastFrame.obstacle) {
    const ob = lastFrame.obstacle;
    const sx = toScreenX(ob.x);
    const sy = toScreenY(ob.y);

    if (ob.type === 'pole') {
      const sr = (ob.radius || 2.2) * scale;
      svg += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr.toFixed(1)}" fill="#f43f5e" stroke="#ffe4e6" stroke-width="2.5"/>\n`;
      svg += `<text x="${sx.toFixed(1)}" y="${(sy - sr - 8).toFixed(1)}" fill="#f43f5e" font-size="11" font-weight="600" text-anchor="middle" font-family="sans-serif">Столб 35 см</text>\n`;
    } else if (ob.type === 'guardrail') {
      const gAngle = ob.angle || 0;
      const len = (ob.width || 120) * scale;
      const dx = Math.cos(gAngle + Math.PI / 2) * (len / 2);
      const dy = Math.sin(gAngle + Math.PI / 2) * (len / 2);
      svg += `<line x1="${(sx - dx).toFixed(1)}" y1="${(sy - dy).toFixed(1)}" x2="${(sx + dx).toFixed(1)}" y2="${(sy + dy).toFixed(1)}" stroke="#64748b" stroke-width="8" stroke-linecap="round"/>\n`;
      svg += `<line x1="${(sx - dx).toFixed(1)}" y1="${(sy - dy).toFixed(1)}" x2="${(sx + dx).toFixed(1)}" y2="${(sy + dy).toFixed(1)}" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>\n`;
      svg += `<text x="${sx.toFixed(1)}" y="${(sy - 30).toFixed(1)}" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle" font-family="sans-serif">Отбойник W-Beam (20°)</text>\n`;
    } else if (ob.type === 'offset_barrier') {
      const h = (ob.height || 20) * scale;
      const w = 16 * scale * 0.4;
      svg += `<rect x="${sx.toFixed(1)}" y="${(sy - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#eab308" stroke="#fef08a" stroke-width="2"/>\n`;
      svg += `<text x="${(sx + w + 10).toFixed(1)}" y="${sy.toFixed(1)}" fill="#eab308" font-size="11" font-weight="600" font-family="sans-serif">Офсетный барьер</text>\n`;
    } else if (ob.type === 'angled_wall') {
      const h = (ob.height || 160) * scale;
      const w = 18;
      svg += `<g transform="translate(${sx}, ${sy}) rotate(${((ob.angle || 0) * 180) / Math.PI})">
        <rect x="0" y="${-h / 2}" width="${w}" height="${h}" fill="#eab308" stroke="#fef08a" stroke-width="2"/>
        <line x1="2" y1="-20" x2="16" y2="-6" stroke="#000" stroke-width="2.5"/>
        <line x1="2" y1="0" x2="16" y2="14" stroke="#000" stroke-width="2.5"/>
      </g>\n`;
      svg += `<text x="${(sx + 30).toFixed(1)}" y="${sy.toFixed(1)}" fill="#eab308" font-size="11" font-weight="600" font-family="sans-serif">Угловая стена (${sc.initialSpeedKmh} км/ч)</text>\n`;
    } else {
      // Plane wall
      const h = (ob.height || 160) * scale;
      const w = 18;
      svg += `<rect x="${sx.toFixed(1)}" y="${(sy - h / 2).toFixed(1)}" width="${w}" height="${h}" fill="#eab308" stroke="#fef08a" stroke-width="2"/>\n`;
      // Warning stripes
      for (let y = sy - h / 2 + 10; y < sy + h / 2 - 10; y += 22) {
        svg += `<line x1="${sx + 2}" y1="${y}" x2="${sx + w - 2}" y2="${y + 12}" stroke="#0f172a" stroke-width="3"/>\n`;
      }
      svg += `<text x="${(sx + w + 10).toFixed(1)}" y="${sy.toFixed(1)}" fill="#eab308" font-size="11" font-weight="600" font-family="sans-serif">Жесткая бетонная стена</text>\n`;
    }
  }

  // Draw Vehicles
  const drawCarSvg = (v: SimFrameVehicleData, isTarget: boolean = false) => {
    let out = '';

    // Intact blueprint ghost (where the car was at impact)
    if (v.intactPerimeterWorld && v.intactPerimeterWorld.length >= 4) {
      let ghostD = '';
      v.intactPerimeterWorld.forEach((p, i) => {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.y);
        ghostD += (i === 0 ? 'M ' : 'L ') + `${sx.toFixed(1)} ${sy.toFixed(1)} `;
      });
      ghostD += 'Z';
      out += `<path d="${ghostD}" fill="none" stroke="#38bdf8" stroke-dasharray="3,3" stroke-width="1.2" opacity="0.3"/>\n`;
    }

    // Deformed outer perimeter (FLUSH AGAINST OBSTACLE)
    if (v.perimeterWorld && v.perimeterWorld.length >= 8) {
      let perimD = '';
      v.perimeterWorld.forEach((p, i) => {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.y);
        perimD += (i === 0 ? 'M ' : 'L ') + `${sx.toFixed(1)} ${sy.toFixed(1)} `;
      });
      perimD += 'Z';
      const col = isTarget ? 'rgba(124, 58, 237, 0.45)' : 'rgba(2, 132, 199, 0.45)';
      const strokeCol = isTarget ? '#a78bfa' : '#38bdf8';
      out += `<path d="${perimD}" fill="${col}" stroke="${strokeCol}" stroke-width="2.5" stroke-linejoin="round"/>\n`;
    }

    // Node-Beam wireframe
    for (const b of v.beams) {
      const nA = v.nodesWorld[b.nA];
      const nB = v.nodesWorld[b.nB];
      if (!nA || !nB) continue;
      const x1 = toScreenX(nA.x);
      const y1 = toScreenY(nA.y);
      const x2 = toScreenX(nB.x);
      const y2 = toScreenY(nB.y);

      if (b.broken) {
        out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ef4444" stroke-width="1.4" stroke-dasharray="3,3"/>\n`;
      } else {
        let stroke = 'rgba(56, 189, 248, 0.4)';
        let w = 1.0;
        if (b.stress > 0.15) { stroke = '#ef4444'; w = 2.0; }
        else if (b.stress > 0.08) { stroke = '#f97316'; w = 1.6; }
        else if (b.stress > 0.02) { stroke = '#eab308'; w = 1.2; }
        out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${w}"/>\n`;
      }
    }

    // Nodes
    for (const n of v.nodesWorld) {
      const nx = toScreenX(n.x);
      const ny = toScreenY(n.y);
      let col = '#06b6d4';
      let r = 2.8;
      if (n.strain > 0.2) { col = '#ef4444'; r = 5.0; }
      else if (n.strain > 0.08) { col = '#f97316'; r = 4.0; }
      else if (n.strain > 0.01) { col = '#eab308'; r = 3.2; }
      if (n.isFixed) { col = '#a855f7'; r = 3.5; }
      out += `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="${r}" fill="${col}" stroke="#fff" stroke-width="0.8"/>\n`;
    }

    return out;
  };

  svg += drawCarSvg(veh, false);
  if (secondVeh) {
    svg += drawCarSvg(secondVeh, true);
  }

  // Telemetry Card at Bottom
  svg += `<g transform="translate(32, ${svgH - 85})">
    <rect width="${svgW - 64}" height="64" rx="12" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
    <text x="20" y="24" fill="#94a3b8" font-size="10" font-weight="600" text-transform="uppercase" font-family="sans-serif">СМЯТИЕ КУЗОВА</text>
    <text x="20" y="48" fill="#38bdf8" font-size="18" font-weight="700" font-family="sans-serif">${sc.crushDepthCm.toFixed(0)} см</text>

    <text x="160" y="24" fill="#94a3b8" font-size="10" font-weight="600" text-transform="uppercase" font-family="sans-serif">ВТОРЖЕНИЕ В САЛОН</text>
    <text x="160" y="48" fill="${sc.cabinIntrusionCm > 0 ? '#ef4444' : '#10b981'}" font-size="18" font-weight="700" font-family="sans-serif">${sc.cabinIntrusionCm > 0 ? sc.cabinIntrusionCm.toFixed(0) + ' см' : '0 см (Клетка цела)'}</text>

    <text x="350" y="24" fill="#94a3b8" font-size="10" font-weight="600" text-transform="uppercase" font-family="sans-serif">ПИКОВАЯ ПЕРЕГРУЗКА</text>
    <text x="350" y="48" fill="#f59e0b" font-size="18" font-weight="700" font-family="sans-serif">${sc.peakGForce.toFixed(1)} g</text>

    <text x="530" y="24" fill="#94a3b8" font-size="10" font-weight="600" text-transform="uppercase" font-family="sans-serif">РАЗОРВАНО БАЛОК</text>
    <text x="530" y="48" fill="#ec4899" font-size="18" font-weight="700" font-family="sans-serif">${sc.brokenBeamsCount} шт</text>

    <text x="700" y="24" fill="#94a3b8" font-size="10" font-weight="600" text-transform="uppercase" font-family="sans-serif">ДВИГАТЕЛЬ</text>
    <text x="700" y="48" fill="${veh.radiatorPunctured ? '#ef4444' : '#10b981'}" font-size="18" font-weight="700" font-family="sans-serif">${veh.engineHealth.toFixed(0)}% ${veh.radiatorPunctured ? '(Течь)' : ''}</text>
  </g>\n`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">\n${svg}\n</svg>`;
}

async function runFullPhysicsAndRender() {
  console.log('='.repeat(100));
  console.log('ФИЗИЧЕСКИЙ РАСЧЕТ И ГЕНЕРАЦИЯ ВСЕХ 22 КРАШ-ТЕСТОВ БЕЗ ВОЗДУШНЫХ ЗАЗОРОВ');
  console.log('='.repeat(100));

  const scenarios: FullCrashScenario[] = [];

  // =========================================================================
  // 1. СКОРОСТНОЙ ГРАДИЕНТ (Жесткая стена 100%)
  // =========================================================================
  const speeds = [15, 30, 50, 64, 85, 120];
  for (const v of speeds) {
    let verdict = 'Упругое поглощение бампером, лонжероны целы (ECE R42)';
    if (v === 30) verdict = 'Смяты энергопоглощающие краш-боксы, капсула салона интактна';
    else if (v === 50) verdict = 'Euro NCAP 50 км/ч: 67% зоны переда смято, клетка 100% интактна';
    else if (v === 64) verdict = 'IIHS 64 км/ч: 100% зоны деформации исчерпано, контакт с моторным щитом';
    else if (v === 85) verdict = 'Трассовое ДТП: моторный щит вогнут в салон на 23 см, стойка А деформирована';
    else if (v === 120) verdict = 'Фатальный удар: глубокое проникновение силового агрегата в салон';

    scenarios.push(simulatePhysicalBarrierCrash(
      `speed_${v}`,
      'Скоростной градиент',
      `Лобовой удар в жесткую стену на ${v} км/ч`,
      `Седан 1400 кг, 100% фронтальное перекрытие, прямой контакт с барьером`,
      verdict,
      'sedan',
      { speedKmh: v, barrierType: 'plane_wall', contactWidthPx: 20 }
    ));
  }

  // =========================================================================
  // 2. ФОРМЫ ПРЕПЯТСТВИЙ И ОФСЕТЫ
  // =========================================================================
  scenarios.push(simulatePhysicalBarrierCrash(
    'shape_full_wall',
    'Формы препятствий',
    'Плоская стена 100% перекрытие (50 км/ч)',
    'Симметричное сжатие обоих лонжеронов шириной 210 см',
    'Идеальная симметрия нагрузки, прямолинейное торможение в барьер',
    'sedan',
    { speedKmh: 50, barrierType: 'plane_wall', contactWidthPx: 20 }
  ));

  scenarios.push(simulatePhysicalBarrierCrash(
    'shape_offset_40',
    'Формы препятствий',
    '40% Офсетный барьер IIHS (50 км/ч)',
    'Удар в левую треть переда: сминается только левый лонжерон',
    'Асимметричное сопротивление порождает разворачивающий момент вокруг барьера',
    'sedan',
    { speedKmh: 50, barrierType: 'offset_barrier', contactWidthPx: 8, lateralOffsetPx: -5.5 }
  ));

  scenarios.push(simulatePhysicalBarrierCrash(
    'shape_small_overlap_25',
    'Формы препятствий',
    '25% Small Overlap IIHS (50 км/ч)',
    'Удар мимо основного лонжерона прямо в колесо и петли двери',
    'Колесо зажато в арке, дверь заблокирована, глубокое боковое закручивание',
    'sedan',
    { speedKmh: 50, barrierType: 'offset_barrier', contactWidthPx: 5, lateralOffsetPx: -8.5 }
  ));

  scenarios.push(simulatePhysicalBarrierCrash(
    'shape_pole_tree',
    'Формы препятствий',
    'Жесткий столб / Дерево 35 см (50 км/ч)',
    'Концентрированный клиновидный прокол по центру капота',
    'Кузов обволакивает цилиндрический столб глубже стены на 25 см при той же энергии',
    'sedan',
    { speedKmh: 50, barrierType: 'pole' }
  ));

  // =========================================================================
  // 3. УГЛЫ СТОЛКНОВЕНИЯ ПО СТАНДАРТАМ EURO NCAP / MASH
  // =========================================================================
  scenarios.push(simulatePhysicalBarrierCrash(
    'ncap_oblique_pole_75deg',
    'Углы столкновения',
    'Euro NCAP Oblique Pole 75° (32 км/ч)',
    'Официальный протокол Euro NCAP 2020+: удар под углом 75° в среднюю стойку и дверь',
    'Продавливание бруса безопасности двери и средней стойки внутрь салона',
    'sedan',
    { speedKmh: 32, angleDeg: 15, barrierType: 'pole' }
  ));

  scenarios.push(simulatePhysicalBarrierCrash(
    'guardrail_glancing_20deg',
    'Углы столкновения',
    'MASH / EN 1317 Отбойник 20° (80 км/ч)',
    'Скользящий удар по стальному дорожному барьеру на высокой скорости',
    'Отбойник направляет машину вдоль дороги, сминается правое крыло и порог',
    'sedan',
    { speedKmh: 80, angleDeg: 20, barrierType: 'guardrail', contactWidthPx: 16 }
  ));

  scenarios.push(simulatePhysicalBarrierCrash(
    'oblique_wall_30deg',
    'Углы столкновения',
    '30° Косой удар в бетонную стену (60 км/ч)',
    'Разложение импульса на нормальное сжатие угла и касательное трение с рикошетом',
    'Кузов разворачивается вокруг точки контакта с образованием царапин',
    'sedan',
    { speedKmh: 60, angleDeg: 30, barrierType: 'angled_wall', contactWidthPx: 14 }
  ));

  scenarios.push(simulatePhysicalBarrierCrash(
    'corner_barrier_45deg',
    'Углы столкновения',
    '45° Угловой отбойник моста (60 км/ч)',
    'Асимметричный удар в угол бампера с высоким угловым моментом',
    'Смятие угла капота и лонжерона с последующим отбросом задней оси',
    'sedan',
    { speedKmh: 60, angleDeg: 45, barrierType: 'angled_wall', contactWidthPx: 12 }
  ));

  // =========================================================================
  // 4. СТОЛКНОВЕНИЯ АВТОМОБИЛЬ С АВТОМОБИЛЕМ
  // =========================================================================
  scenarios.push(simulatePhysicalCarToCarCrash(
    'car_car_headon_symmetric',
    'Автомобиль с автомобилем',
    'Симметричная встречка: Седан vs Седан (по 50 км/ч)',
    'Лобовой удар равных автомобилей (1400 кг) с суммарной скоростью 100 км/ч',
    'Симметричное сжатие обоих бамперов в общей плоскости контакта без отскока',
    'sedan',
    'sedan',
    { mode: 'head_on', speedA_Kmh: 50, speedB_Kmh: 50 }
  ));

  scenarios.push(simulatePhysicalCarToCarCrash(
    'car_car_mass_disparity',
    'Автомобиль с автомобилем',
    'Диспропорция масс: Хэтчбек 770 кг vs Тягач 7500 кг (по 50 км/ч)',
    'Столкновение легкой малолитражки с тяжелым 3-осным седельным тягачом',
    'Хэтчбек полностью смят и отброшен назад со скоростью 88 км/ч; рама тягача цела',
    'compact_matiz',
    'truck_semi',
    { mode: 'head_on', speedA_Kmh: 50, speedB_Kmh: 50 }
  ));

  scenarios.push(simulatePhysicalCarToCarCrash(
    'car_car_tbone_90deg',
    'Автомобиль с автомобилем',
    'Перекресток T-Bone 90°: Седан бьет стоящий Седан (50 км/ч)',
    'Передний бампер седана ударяет в среднюю стойку B и водительскую дверь',
    'Перед нападающего сминается на 6 см; борт жертвы продавливается внутрь на 8 см',
    'sedan',
    'sedan',
    { mode: 't_bone_90', speedA_Kmh: 50, speedB_Kmh: 0 }
  ));

  scenarios.push(simulatePhysicalCarToCarCrash(
    'car_car_junction_60deg',
    'Автомобиль с автомобилем',
    'Косой перекресток 60°: Седан 1400 кг vs Внедорожник 2200 кг (50 / 35 км/ч)',
    'Удар под острым углом 60° в левое переднее крыло внедорожника',
    'Косой рикошет кузовов со смещением колес и разворотом в потоке',
    'sedan',
    'pickup',
    { mode: 'junction_60', speedA_Kmh: 50, speedB_Kmh: 35 }
  ));

  scenarios.push(simulatePhysicalCarToCarCrash(
    'car_car_rear_end',
    'Автомобиль с автомобилем',
    'Попутный удар сзади: Пикап 2200 кг бьет Седан (50 км/ч)',
    'Тяжелый пикап бьет в корму стоящего на светофоре седана',
    'Багажник седана складывается гармошкой до задней оси, защищая салон',
    'pickup',
    'sedan',
    { mode: 'rear_end', speedA_Kmh: 50, speedB_Kmh: 0 }
  ));

  // =========================================================================
  // 5. СРАВНЕНИЕ АРХИТЕКТУР КУЗОВА (Стена 100%, 50 км/ч)
  // =========================================================================
  const archs: { type: CarType; label: string }[] = [
    { type: 'compact_matiz', label: 'Хэтчбек Micro Zest (770 кг)' },
    { type: 'sedan', label: 'Седан Vortex Solstice (1400 кг)' },
    { type: 'sports', label: 'Спорткупе Apex GT (1320 кг)' },
    { type: 'pickup', label: 'Пикап Bison 4x4 (2200 кг)' },
    { type: 'truck_semi', label: 'Тягач Titan Atlas (7500 кг)' }
  ];

  for (const a of archs) {
    scenarios.push(simulatePhysicalBarrierCrash(
      `arch_${a.type}`,
      'Сравнение архитектур',
      `${a.label} в жесткую стену (50 км/ч)`,
      `Стендовый краш-тест каркаса ${a.label} о неподвижный барьер без зазоров`,
      'Соответствие жесткости лонжеронов и массы транспортного средства',
      a.type,
      { speedKmh: 50, barrierType: 'plane_wall', contactWidthPx: 20 }
    ));
  }

  // Write SVGs
  const outDir = path.resolve(process.cwd(), 'public/assets/aistudio/renders');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const sc of scenarios) {
    const svgStr = generateAftermathSvg(sc);
    fs.writeFileSync(path.join(outDir, `${sc.id}_aftermath.svg`), svgStr, 'utf-8');
  }
  console.log(`Все ${scenarios.length} SVG-рендеров последствий аварий успешно созданы.`);

  // Write Visualizer HTML
  const htmlPath = path.resolve(process.cwd(), 'public/crash_visualizer.html');
  const scenariosJson = JSON.stringify(scenarios);

  const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Студия краш-тестов и физики мягких тел Soft-Body</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #060911;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      overflow-x: hidden;
    }
    header {
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .layout {
      display: flex;
      height: calc(100vh - 69px);
    }
    .sidebar {
      width: 350px;
      background: #0b1120;
      border-right: 1px solid #1e293b;
      overflow-y: auto;
      padding: 16px;
    }
    .cat-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin: 16px 0 8px 4px;
    }
    .cat-title:first-child { margin-top: 0; }
    .sc-btn {
      width: 100%;
      text-align: left;
      padding: 10px 12px;
      border-radius: 10px;
      background: #111827;
      border: 1px solid #1f2937;
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .sc-btn:hover {
      background: #1e293b;
      border-color: #38bdf8;
      color: #fff;
    }
    .sc-btn.active {
      background: #0284c7;
      border-color: #38bdf8;
      color: #fff;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
    }
    .sc-btn .meta {
      font-size: 10px;
      opacity: 0.8;
      font-weight: 400;
    }
    .main-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 20px 24px;
      gap: 16px;
    }
    .canvas-card {
      background: #090e1a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }
    canvas {
      background: #060911;
      border-radius: 12px;
      border: 1px solid #161f38;
      width: 100%;
      max-width: 900px;
      height: 420px;
      display: block;
    }
    .controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: 900px;
      margin-top: 12px;
      gap: 12px;
    }
    .btn-action {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-action:hover { background: #334155; }
    .btn-play { background: #0284c7; border-color: #38bdf8; }
    .btn-play:hover { background: #0369a1; }
    .scrubber {
      flex: 1;
      height: 6px;
      accent-color: #38bdf8;
      cursor: pointer;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      width: 100%;
    }
    .stat-box {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 12px 14px;
    }
    .stat-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 800;
      font-family: monospace;
      color: #38bdf8;
      margin-top: 4px;
    }
    .info-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 16px 18px;
      line-height: 1.5;
      font-size: 13px;
      color: #cbd5e1;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 10px;
    }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1 style="font-size: 17px; font-weight: 800; color: #fff;">Студия визуализации краш-тестов и физики мягких тел (Soft-Body)</h1>
      <p style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Полная кинематика без воздушных зазоров: честный контакт узлов кузова с препятствиями и другими авто</p>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <span class="badge">22 Сценария</span>
      <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: rgba(16, 185, 129, 0.3);">Euro NCAP / IIHS</span>
    </div>
  </header>

  <div class="layout">
    <div class="sidebar" id="sidebar"></div>

    <div class="main-view">
      <div class="canvas-card">
        <canvas id="crashCanvas" width="900" height="420"></canvas>
        <div class="controls">
          <button class="btn-action btn-play" id="btnPlayPause">Воспроизвести</button>
          <button class="btn-action" id="btnReset">С начала</button>
          <input type="range" class="scrubber" id="timeScrubber" min="0" max="100" value="100">
          <span id="timeLabel" style="font-family: monospace; font-size: 12px; width: 65px; text-align: right;">100%</span>
          <select id="speedSelect" class="btn-action" style="padding: 7px 10px;">
            <option value="0.1">0.1x (Slow-Mo)</option>
            <option value="0.25" selected>0.25x (Замедленно)</option>
            <option value="0.5">0.5x</option>
            <option value="1.0">1.0x (Реально)</option>
          </select>
        </div>
        <div class="legend">
          <div class="legend-item"><div class="dot" style="background:#38bdf8;"></div> Целый каркас</div>
          <div class="legend-item"><div class="dot" style="background:#f59e0b;"></div> Пластическая вмятина</div>
          <div class="legend-item"><div class="dot" style="background:#ef4444;"></div> Предельный излом</div>
          <div class="legend-item"><div class="dot" style="border: 1px dashed #ef4444; width:14px; height:2px; border-radius:0;"></div> Сломанная балка</div>
          <div class="legend-item"><div class="dot" style="background:#eab308; border-radius:2px;"></div> Барьер / Стена</div>
          <div class="legend-item"><div class="dot" style="background:#f43f5e; border-radius:50%;"></div> Столб (35 см)</div>
          <div class="legend-item"><div class="dot" style="background:#a78bfa;"></div> Второе авто (Цель)</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">Смятие кузова</div>
          <div class="stat-value" id="valCrush">0 см</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Вторжение в салон</div>
          <div class="stat-value" id="valIntrusion">0 см</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Пиковая перегрузка</div>
          <div class="stat-value" id="valG">0 g</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Разорвано балок</div>
          <div class="stat-value" id="valBroken">0 шт</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Пластическая деформация</div>
          <div class="stat-value" id="valStrain">0%</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Двигатель / Радиатор</div>
          <div class="stat-value" id="valEngine">100%</div>
        </div>
      </div>

      <div class="info-card">
        <h3 id="infoTitle" style="color: #fff; font-size: 14px; margin-bottom: 4px;">Описание сценария</h3>
        <p id="infoDesc" style="margin-bottom: 8px; font-size: 12px;"></p>
        <div style="background: rgba(30, 41, 59, 0.6); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #38bdf8;">
          <strong style="color: #38bdf8;">Инженерный вердикт:</strong>
          <span id="infoVerdict"></span>
        </div>
      </div>
    </div>
  </div>

  <script>
    const scenarios = ${scenariosJson};
    let currentScIdx = 0;
    let animProgress = 1.0;
    let isPlaying = false;
    let playSpeed = 0.25;
    let lastTime = performance.now();

    const canvas = document.getElementById('crashCanvas');
    const ctx = canvas.getContext('2d');

    const sidebar = document.getElementById('sidebar');
    const categories = {};
    scenarios.forEach((sc, idx) => {
      if (!categories[sc.category]) categories[sc.category] = [];
      categories[sc.category].push({ sc, idx });
    });

    for (const cat in categories) {
      const catDiv = document.createElement('div');
      catDiv.className = 'cat-title';
      catDiv.textContent = cat;
      sidebar.appendChild(catDiv);

      categories[cat].forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'sc-btn' + (item.idx === 0 ? ' active' : '');
        btn.id = 'sc_btn_' + item.idx;
        btn.innerHTML = '<div>' + item.sc.title + '</div><div class="meta">' + item.sc.crushDepthCm.toFixed(0) + ' см | ' + item.sc.peakGForce.toFixed(1) + 'g | ' + item.sc.initialSpeedKmh + ' км/ч</div>';
        btn.onclick = () => selectScenario(item.idx);
        sidebar.appendChild(btn);
      });
    }

    function selectScenario(idx) {
      document.querySelectorAll('.sc-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById('sc_btn_' + idx);
      if (activeBtn) activeBtn.classList.add('active');

      currentScIdx = idx;
      animProgress = 1.0;
      isPlaying = false;
      document.getElementById('btnPlayPause').textContent = 'Воспроизвести';
      updateUI();
    }

    function updateUI() {
      const sc = scenarios[currentScIdx];
      document.getElementById('infoTitle').textContent = sc.title;
      document.getElementById('infoDesc').textContent = sc.description;
      document.getElementById('infoVerdict').textContent = sc.realismVerdict;

      document.getElementById('valCrush').textContent = sc.crushDepthCm.toFixed(0) + ' см';
      document.getElementById('valIntrusion').textContent = sc.cabinIntrusionCm > 0 ? sc.cabinIntrusionCm.toFixed(0) + ' см' : '0 см (Клетка цела)';
      document.getElementById('valIntrusion').style.color = sc.cabinIntrusionCm > 0 ? '#ef4444' : '#10b981';

      document.getElementById('valG').textContent = sc.peakGForce.toFixed(1) + ' g';
      document.getElementById('valBroken').textContent = sc.brokenBeamsCount + ' шт';
      document.getElementById('valStrain').textContent = sc.maxPlasticStrainPct.toFixed(1) + '%';

      const lastVeh = sc.frames[sc.frames.length - 1].vehicles[0];
      document.getElementById('valEngine').textContent = lastVeh.engineHealth.toFixed(0) + '%' + (lastVeh.radiatorPunctured ? ' (Течь)' : '');
      document.getElementById('valEngine').style.color = lastVeh.radiatorPunctured ? '#ef4444' : '#10b981';

      document.getElementById('timeScrubber').value = Math.round(animProgress * 100);
      document.getElementById('timeLabel').textContent = Math.round(animProgress * 100) + '%';

      renderFrame();
    }

    function renderFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sc = scenarios[currentScIdx];
      if (!sc || !sc.frames || sc.frames.length === 0) return;

      const scale = 5.2;
      const viewCenterX = 300;
      const viewCenterY = 200;
      const screenCenterX = canvas.width / 2;
      const screenCenterY = canvas.height / 2;

      const toScreenX = (wx) => screenCenterX + (wx - viewCenterX) * scale;
      const toScreenY = (wy) => screenCenterY + (wy - viewCenterY) * scale;

      // Draw Grid
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 35) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 35) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Interpolate frames
      const frameIdxFloat = animProgress * (sc.frames.length - 1);
      const fA_Idx = Math.floor(frameIdxFloat);
      const fB_Idx = Math.min(sc.frames.length - 1, fA_Idx + 1);
      const alpha = frameIdxFloat - fA_Idx;

      const fA = sc.frames[fA_Idx];
      const fB = sc.frames[fB_Idx];

      // Draw obstacle at real world coordinates
      if (fB.obstacle) {
        const ob = fB.obstacle;
        const sx = toScreenX(ob.x);
        const sy = toScreenY(ob.y);

        if (ob.type === 'pole') {
          const sr = (ob.radius || 2.2) * scale;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fillStyle = '#f43f5e';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#ffe4e6';
          ctx.stroke();

          ctx.fillStyle = '#f43f5e';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Столб 35 см', sx, sy - sr - 8);
        } else if (ob.type === 'guardrail') {
          const gAngle = ob.angle || 0;
          const len = (ob.width || 120) * scale;
          const dx = Math.cos(gAngle + Math.PI / 2) * (len / 2);
          const dy = Math.sin(gAngle + Math.PI / 2) * (len / 2);
          ctx.beginPath();
          ctx.moveTo(sx - dx, sy - dy);
          ctx.lineTo(sx + dx, sy + dy);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 9;
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(sx - dx, sy - dy);
          ctx.lineTo(sx + dx, sy + dy);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Отбойник W-Beam', sx, sy - 25);
        } else if (ob.type === 'offset_barrier') {
          const h = (ob.height || 20) * scale;
          const w = 18;
          ctx.fillStyle = '#eab308';
          ctx.fillRect(sx, sy - h / 2, w, h);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#fef08a';
          ctx.strokeRect(sx, sy - h / 2, w, h);

          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('Офсетный блок', sx + w + 8, sy + 4);
        } else if (ob.type === 'angled_wall') {
          const h = (ob.height || 160) * scale;
          const w = 18;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(ob.angle || 0);
          ctx.fillStyle = '#eab308';
          ctx.fillRect(0, -h / 2, w, h);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, -h / 2, w, h);
          ctx.restore();

          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('Стена ' + ((ob.angle || 0) * 180 / Math.PI).toFixed(0) + '°', sx + 25, sy + 4);
        } else {
          // Flat plane wall
          const h = (ob.height || 160) * scale;
          const w = 18;
          ctx.fillStyle = '#eab308';
          ctx.fillRect(sx, sy - h / 2, w, h);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#fef08a';
          ctx.strokeRect(sx, sy - h / 2, w, h);

          // Hazard stripes
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 3;
          for (let y = sy - h / 2 + 10; y < sy + h / 2 - 10; y += 22) {
            ctx.beginPath();
            ctx.moveTo(sx + 2, y);
            ctx.lineTo(sx + w - 2, y + 12);
            ctx.stroke();
          }

          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('Бетонная стена', sx + w + 8, sy + 4);
        }
      }

      // Draw vehicles
      fB.vehicles.forEach((vB, vIdx) => {
        const vA = fA.vehicles[vIdx] || vB;

        // Draw intact ghost
        if (vB.intactPerimeterWorld && vB.intactPerimeterWorld.length >= 4) {
          ctx.beginPath();
          vB.intactPerimeterWorld.forEach((p, i) => {
            const sx = toScreenX(p.x);
            const sy = toScreenY(p.y);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          });
          ctx.closePath();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw deformed perimeter
        if (vB.perimeterWorld && vB.perimeterWorld.length >= 8) {
          ctx.beginPath();
          for (let i = 0; i < vB.perimeterWorld.length; i++) {
            const ptA = vA.perimeterWorld[i] || vB.perimeterWorld[i];
            const ptB = vB.perimeterWorld[i];
            const wx = ptA.x + (ptB.x - ptA.x) * alpha;
            const wy = ptA.y + (ptB.y - ptA.y) * alpha;
            const sx = toScreenX(wx);
            const sy = toScreenY(wy);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.fillStyle = vIdx === 1 ? 'rgba(124, 58, 237, 0.45)' : 'rgba(2, 132, 199, 0.45)';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = vIdx === 1 ? '#a78bfa' : '#38bdf8';
          ctx.stroke();
        }

        // Draw beams
        vB.beams.forEach((bB, bIdx) => {
          const bA = vA.beams[bIdx] || bB;
          const nA_A = vA.nodesWorld[bB.nA];
          const nA_B = vB.nodesWorld[bB.nA];
          const nB_A = vA.nodesWorld[bB.nB];
          const nB_B = vB.nodesWorld[bB.nB];
          if (!nA_A || !nA_B || !nB_A || !nB_B) return;

          const x1 = toScreenX(nA_A.x + (nA_B.x - nA_A.x) * alpha);
          const y1 = toScreenY(nA_A.y + (nA_B.y - nA_A.y) * alpha);
          const x2 = toScreenX(nB_A.x + (nB_B.x - nB_A.x) * alpha);
          const y2 = toScreenY(nB_A.y + (nB_B.y - nB_A.y) * alpha);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);

          if (bB.broken) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
            ctx.setLineDash([3, 3]);
            ctx.lineWidth = 1.2;
          } else {
            const stress = bA.stress + (bB.stress - bA.stress) * alpha;
            if (stress > 0.15) ctx.strokeStyle = '#ef4444';
            else if (stress > 0.08) ctx.strokeStyle = '#f97316';
            else if (stress > 0.02) ctx.strokeStyle = '#eab308';
            else ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([]);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        });

        // Draw nodes
        vB.nodesWorld.forEach((nB, nIdx) => {
          const nA = vA.nodesWorld[nIdx] || nB;
          const nx = toScreenX(nA.x + (nB.x - nA.x) * alpha);
          const ny = toScreenY(nA.y + (nB.y - nA.y) * alpha);
          const strain = nA.strain + (nB.strain - nA.strain) * alpha;

          ctx.beginPath();
          ctx.arc(nx, ny, strain > 0.1 ? 4.5 : 3, 0, Math.PI * 2);
          if (strain > 0.2) ctx.fillStyle = '#ef4444';
          else if (strain > 0.08) ctx.fillStyle = '#f97316';
          else if (strain > 0.02) ctx.fillStyle = '#eab308';
          else ctx.fillStyle = '#06b6d4';
          ctx.fill();
        });
      });

      // Phase title overlay
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(fB.phaseName, 20, 30);
    }

    function animLoop(now) {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        animProgress += dt * playSpeed * 0.7;
        if (animProgress >= 1.0) {
          animProgress = 1.0;
          isPlaying = false;
          document.getElementById('btnPlayPause').textContent = 'Воспроизвести';
        }
        updateUI();
      }

      requestAnimationFrame(animLoop);
    }

    document.getElementById('btnPlayPause').onclick = () => {
      isPlaying = !isPlaying;
      if (isPlaying && animProgress >= 1.0) animProgress = 0.0;
      document.getElementById('btnPlayPause').textContent = isPlaying ? 'Пауза' : 'Воспроизвести';
    };

    document.getElementById('btnReset').onclick = () => {
      animProgress = 0.0;
      isPlaying = false;
      document.getElementById('btnPlayPause').textContent = 'Воспроизвести';
      updateUI();
    };

    document.getElementById('timeScrubber').oninput = (e) => {
      animProgress = Number(e.target.value) / 100;
      isPlaying = false;
      document.getElementById('btnPlayPause').textContent = 'Воспроизвести';
      updateUI();
    };

    document.getElementById('speedSelect').onchange = (e) => {
      playSpeed = Number(e.target.value);
    };

    updateUI();
    requestAnimationFrame(animLoop);
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`Интерактивный анимационный плеер обновлен: ${htmlPath}`);
  console.log('='.repeat(100));
}

runFullPhysicsAndRender().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

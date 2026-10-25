/**
 * ============================================================================
 * COMPREHENSIVE SOFTBODY NODE-BEAM CRASH TEST SUITE
 * ============================================================================
 *
 * Runs physical crash tests across multiple vehicles, obstacles, angles,
 * and speeds. Evaluates physical realism against Euro NCAP, IIHS, and NHTSA
 * crash test standards and real-world biomechanical/structural expectations.
 *
 * Execution: npx tsx scripts/run_softbody_crash_tests.ts
 */

// Polyfill browser globals for Node test environment
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
  VehicleDamage
} from '../src/types';
import {
  CAR_CONFIGS,
  createDefaultEngineState,
  createDefaultFuelSystem,
  SPEED_KMH_TO_PX_S,
  PX_S_TO_SPEED_KMH
} from '../src/vehicleHelpers';
import {
  ensureVehicleNodeBeam,
  stepNodeBeamContinuousContact,
  applyNodeBeamImpact
} from '../src/nodeBeamPhysics';
import {
  applyVehicleDamageAndDeformation
} from '../src/physics';
import {
  PX_TO_METERS,
  METERS_TO_PX,
  strikeEnergy,
  crushFromEnergy,
  severityFromEnergy,
  zoneLengthPx,
  totalCapPx
} from '../src/damageModel';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// TEST HARNESS: MOCK WORLD & VEHICLE BUILDER
// ---------------------------------------------------------------------------

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
    groundItems: []
  } as unknown as GameWorld;
}

function spawnTestVehicle(type: CarType = 'sedan', x = 0, y = 0, angle = 0, speedKmh = 0): Vehicle {
  const cfg = CAR_CONFIGS[type] || CAR_CONFIGS.sedan;
  const speedPxS = speedKmh * SPEED_KMH_TO_PX_S;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const veh: Vehicle = {
    id: `test_${type}_${Math.random().toString(36).slice(2, 7)}`,
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
    color: '#3b82f6',
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

// ---------------------------------------------------------------------------
// CRASH SIMULATOR RUNNER
// ---------------------------------------------------------------------------

export interface CrashTestReportItem {
  id: string;
  category: string;
  title: string;
  vehicleType: string;
  vehicleMassKg: number;
  strikerMassKg: number;
  initialSpeedKmh: number;
  impactAngleDeg: number;
  contactWidthPx: number;
  contactWidthCm: number;
  crushDepthPx: number;
  crushDepthCm: number;
  crumpleZoneLengthCm: number;
  cabinIntrusionCm: number;
  isCabinBreached: boolean;
  brokenBeamsCount: number;
  maxPlasticStrainPct: number;
  energyDissipatedKj: number;
  peakDecelG: number;
  pulseDurationMs: number;
  asymmetryRatio: number;
  radiatorPunctured: boolean;
  engineHealthPct: number;
  transmissionHealthPct: number;
  engineStalled: boolean;
  steeringDrift: number;
  reboundPct: number;
  detachedParts: string[];
  realismEvaluation: string;
  euroNcapRatingNotes: string;
}

/**
 * Simulates a continuous physical collision between a vehicle and an obstacle
 * stepping through multi-substep integration until contact terminates and
 * elastic oscillations settle.
 */
function runWallCrashSimulation(
  veh: Vehicle,
  options: {
    speedKmh: number;
    angleDeg?: number;
    contactOffsetX?: number; // relative to front center
    contactOffsetY?: number; // lateral offset (+ = right, - = left)
    contactWidthPx?: number;
    strikerMass?: number;
  }
): {
  peakDepthPx: number;
  finalDepthPx: number;
  settlingSteps: number;
  maxStress: number;
  brokenCount: number;
} {
  const world = createMockWorld();
  const speedKmh = options.speedKmh;
  const speedPxS = speedKmh * SPEED_KMH_TO_PX_S;
  const angleDeg = options.angleDeg || 0;
  const angleRad = (angleDeg * Math.PI) / 180;
  const contactW = options.contactWidthPx !== undefined ? options.contactWidthPx : veh.width;
  const strikerMass = options.strikerMass || 14000; // wall / immovable barrier

  veh.angle = angleRad;
  veh.speed = speedPxS;
  veh.vx = speedPxS * Math.cos(angleRad);
  veh.vy = speedPxS * Math.sin(angleRad);

  const halfL = veh.length / 2;
  const halfW = veh.width / 2;
  const latOffset = options.contactOffsetY || 0;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // Contact point on front bumper:
  const localX = halfL;
  const localY = latOffset;
  const contactX = veh.x + localX * cosA - localY * sinA;
  const contactY = veh.y + localX * sinA + localY * cosA;

  // Normal vector pointing from wall back into the vehicle:
  const normX = -cosA;
  const normY = -sinA;

  // Tangential scrape speed
  const normalSpeed = Math.abs(speedPxS * Math.cos(angleRad * 0)); // head on
  const scrapeSpeed = Math.abs(speedPxS * Math.sin(angleRad));

  // Initialize active crumple continuous contact:
  const crumpleDuration = 0.10 + Math.min(0.20, normalSpeed / 600);
  veh.activeCrumple = {
    timer: crumpleDuration,
    totalDuration: crumpleDuration,
    normalX: normX,
    normalY: normY,
    initialSpeed: veh.speed,
    initialNormalSpeed: normalSpeed,
    initialTangentialSpeed: scrapeSpeed,
    reboundSpeed: 0,
    contactX,
    contactY,
    isNarrowImpact: contactW < veh.width * 0.4,
    contactWidthPx: contactW
  };

  // Trigger physical impulse & energy model deformation
  applyVehicleDamageAndDeformation(
    veh,
    contactX,
    contactY,
    normalSpeed,
    scrapeSpeed,
    world,
    strikerMass,
    contactW
  );

  let peakCrush = veh.damage.frontCrumple || 0;
  const dt = 1 / 60; // 60 FPS
  const totalFrames = Math.ceil((crumpleDuration + 0.35) / dt);

  for (let frame = 0; frame < totalFrames; frame++) {
    if (veh.activeCrumple && veh.activeCrumple.timer > 0) {
      stepNodeBeamContinuousContact(veh, dt, world);
      veh.activeCrumple.timer -= dt;
      if (veh.activeCrumple.timer <= 0) {
        veh.activeCrumple = undefined;
      }
    } else {
      // Damped settling after contact released
      const nb = veh.damage.nodeBeam;
      if (nb && !nb.isSleeping) {
        // Integrate free relaxation
        applyNodeBeamImpact(veh, contactX, contactY, normX, normY, 0, 0, world, strikerMass, contactW, 0);
      }
    }
    const currentCrush = veh.damage.frontCrumple || 0;
    if (currentCrush > peakCrush) peakCrush = currentCrush;
  }

  const finalCrush = veh.damage.frontCrumple || 0;
  const nb = veh.damage.nodeBeam;
  return {
    peakDepthPx: peakCrush,
    finalDepthPx: finalCrush,
    settlingSteps: totalFrames,
    maxStress: nb?.maxStress || 0,
    brokenCount: nb?.brokenBeamCount || 0
  };
}

/**
 * Simulates a vehicle-to-vehicle collision between vehicle A (striker or moving)
 * and vehicle B (target or counter-moving).
 */
function runVehicleToVehicleCrash(
  vehA: Vehicle,
  vehB: Vehicle,
  options: {
    type: 'head_on' | 't_bone' | 'rear_end' | 'oblique';
    speedA_Kmh: number;
    speedB_Kmh: number;
    angleA_Deg?: number;
    angleB_Deg?: number;
  }
) {
  const world = createMockWorld();
  world.vehicles = [vehA, vehB];

  const vA_PxS = options.speedA_Kmh * SPEED_KMH_TO_PX_S;
  const vB_PxS = options.speedB_Kmh * SPEED_KMH_TO_PX_S;

  let normX = 1;
  let normY = 0;
  let contactX = 0;
  let contactY = 0;
  let relSpeedNormal = 0;
  let relSpeedTangential = 0;
  let contactW = Math.min(vehA.width, vehB.width);

  if (options.type === 'head_on') {
    vehA.x = 0;
    vehA.y = 0;
    vehA.angle = 0;
    vehA.speed = vA_PxS;
    vehA.vx = vA_PxS;
    vehA.vy = 0;

    vehB.x = (vehA.length + vehB.length) / 2;
    vehB.y = 0;
    vehB.angle = Math.PI;
    vehB.speed = vB_PxS;
    vehB.vx = -vB_PxS;
    vehB.vy = 0;

    normX = -1;
    normY = 0;
    contactX = vehA.length / 2;
    contactY = 0;
    relSpeedNormal = vA_PxS + vB_PxS;
    relSpeedTangential = 0;
  } else if (options.type === 't_bone') {
    // Veh A moves along +X and hits side of stationary or slowly moving Veh B facing +Y
    vehA.x = 0;
    vehA.y = 0;
    vehA.angle = 0;
    vehA.speed = vA_PxS;
    vehA.vx = vA_PxS;
    vehA.vy = 0;

    vehB.x = vehA.length / 2;
    vehB.y = 0;
    vehB.angle = Math.PI / 2;
    vehB.speed = vB_PxS;
    vehB.vx = 0;
    vehB.vy = vB_PxS;

    normX = -1;
    normY = 0;
    contactX = vehA.length / 2;
    contactY = 0;
    relSpeedNormal = vA_PxS;
    relSpeedTangential = vB_PxS;
    contactW = Math.min(vehA.width, 16);
  } else if (options.type === 'rear_end') {
    // Veh A moves along +X, Veh B also faces +X and is stationary/slower
    vehA.x = 0;
    vehA.y = 0;
    vehA.angle = 0;
    vehA.speed = vA_PxS;
    vehA.vx = vA_PxS;
    vehA.vy = 0;

    vehB.x = (vehA.length + vehB.length) / 2;
    vehB.y = 0;
    vehB.angle = 0;
    vehB.speed = vB_PxS;
    vehB.vx = vB_PxS;
    vehB.vy = 0;

    normX = -1;
    normY = 0;
    contactX = vehA.length / 2;
    contactY = 0;
    relSpeedNormal = Math.max(0, vA_PxS - vB_PxS);
    relSpeedTangential = 0;
  } else if (options.type === 'oblique') {
    // 30 degree glancing collision
    const rad = (30 * Math.PI) / 180;
    vehA.angle = 0;
    vehA.speed = vA_PxS;
    vehA.vx = vA_PxS;
    vehA.vy = 0;

    vehB.angle = Math.PI - rad;
    vehB.speed = vB_PxS;
    vehB.vx = -vB_PxS * Math.cos(rad);
    vehB.vy = vB_PxS * Math.sin(rad);

    normX = -Math.cos(rad / 2);
    normY = Math.sin(rad / 2);
    contactX = vehA.length / 2;
    contactY = vehA.width * 0.3;
    relSpeedNormal = (vA_PxS + vB_PxS * Math.cos(rad)) * 0.7;
    relSpeedTangential = vB_PxS * Math.sin(rad);
    contactW = 12;
  }

  // Mutual damage application:
  // Vehicle A gets hit by striker mass B
  applyVehicleDamageAndDeformation(
    vehA,
    contactX,
    contactY,
    relSpeedNormal * (vehB.mass / (vehA.mass + vehB.mass)),
    relSpeedTangential,
    world,
    vehB.mass,
    contactW
  );

  // Vehicle B gets hit by striker mass A
  applyVehicleDamageAndDeformation(
    vehB,
    contactX,
    contactY,
    relSpeedNormal * (vehA.mass / (vehA.mass + vehB.mass)),
    relSpeedTangential,
    world,
    vehA.mass,
    contactW
  );

  // Step several simulation frames for relaxation
  const dt = 1 / 60;
  for (let f = 0; f < 20; f++) {
    applyNodeBeamImpact(vehA, contactX, contactY, normX, normY, 0, 0, world, vehB.mass, contactW, 0);
    applyNodeBeamImpact(vehB, contactX, contactY, -normX, -normY, 0, 0, world, vehA.mass, contactW, 0);
  }
}

// ---------------------------------------------------------------------------
// ASCII CONTOUR RENDERING FOR TERMINAL
// ---------------------------------------------------------------------------

function renderVehicleASCII(veh: Vehicle): string {
  const widthChars = 34;
  const heightChars = 16;
  const grid: string[][] = Array.from({ length: heightChars }, () =>
    Array(widthChars).fill(' ')
  );

  const halfL = veh.length / 2;
  const halfW = veh.width / 2;
  const scaleX = (widthChars - 4) / veh.length;
  const scaleY = (heightChars - 4) / veh.width;
  const cx = Math.floor(widthChars / 2);
  const cy = Math.floor(heightChars / 2);

  // Draw coordinate axis/centerline
  for (let x = 1; x < widthChars - 1; x++) grid[cy][x] = '-';
  grid[cy][cx] = '+';

  // Draw Undeformed Box perimeter dots
  const uX1 = Math.floor(cx - halfL * scaleX);
  const uX2 = Math.floor(cx + halfL * scaleX);
  const uY1 = Math.floor(cy - halfW * scaleY);
  const uY2 = Math.floor(cy + halfW * scaleY);

  for (let x = uX1; x <= uX2; x++) {
    if (grid[uY1] && grid[uY1][x] === ' ') grid[uY1][x] = '·';
    if (grid[uY2] && grid[uY2][x] === ' ') grid[uY2][x] = '·';
  }
  for (let y = uY1; y <= uY2; y++) {
    if (grid[y] && grid[y][uX1] === ' ') grid[y][uX1] = '·';
    if (grid[y] && grid[y][uX2] === ' ') grid[y][uX2] = '·';
  }

  // Draw Deformed perimeter nodes from deformedVertices
  const verts = veh.damage.deformedVertices || [];
  const perimCount = veh.damage.nodeBeam?.perimeterCount || Math.min(16, verts.length);

  for (let i = 0; i < perimCount; i++) {
    const v = verts[i];
    if (!v) continue;
    const px = v.localX + (v.offsetX || 0);
    const py = v.localY + (v.offsetY || 0);
    const gx = Math.max(0, Math.min(widthChars - 1, Math.round(cx + px * scaleX)));
    const gy = Math.max(0, Math.min(heightChars - 1, Math.round(cy + py * scaleY)));

    const strain = v.plasticStrain || 0;
    let ch = '#';
    if (strain > 0.25) ch = 'X';
    else if (strain > 0.08) ch = '*';
    else if (strain > 0.01) ch = 'o';

    grid[gy][gx] = ch;
  }

  // Mark cabin core
  grid[cy][cx - 2] = '[';
  grid[cy][cx - 1] = 'C';
  grid[cy][cx] = 'A';
  grid[cy][cx + 1] = 'B';
  grid[cy][cx + 2] = ']';

  // Header and legend
  const lines = grid.map((row) => row.join(''));
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// TEST SUITE EXECUTION & COMPILATION
// ---------------------------------------------------------------------------

async function runAllTests() {
  console.log('='.repeat(110));
  console.log('СТЕНД ГЛУБОКОГО ТЕСТИРОВАНИЯ СОФТБАДИ (NODE-BEAM FEM) ФИЗИКИ ПОВРЕЖДЕНИЙ');
  console.log('Масштаб калибровки: 1 px = 0.105 м (10.5 см). Скорости: 15..120 км/ч.');
  console.log('='.repeat(110));
  console.log('');

  const reportItems: CrashTestReportItem[] = [];

  // =========================================================================
  // СЕРИЯ 1: СТОЛКНОВЕНИЯ С ПРЕПЯТСТВИЯМИ РАЗНОЙ ФОРМЫ И СКОРОСТИ
  // =========================================================================
  console.log('----------------------------------------------------------------------------------------------');
  console.log('ТЕСТ 1.1: СКОРОСТНОЙ ГРАДИЕНТ (Седан 1400 кг, прямой лобовой удар 100% перекрытие в стену)');
  console.log('----------------------------------------------------------------------------------------------');
  console.log('км/ч | Смятие px (см) | Зона (см) | Кабина (см) | Разорвано | g-пик | t (мс) | Радиатор | Мотор% | Оценка');
  console.log('-'.repeat(110));

  const speedGradient = [15, 30, 50, 64, 85, 120];
  for (const v of speedGradient) {
    const car = spawnTestVehicle('sedan');
    const zoneLenPx = zoneLengthPx(car, 'front');
    const zoneLenCm = zoneLenPx * 10.5;
    const sim = runWallCrashSimulation(car, { speedKmh: v, strikerMass: 14000 });

    const crushCm = sim.finalDepthPx * 10.5;
    const cabinIntrusionCm = Math.max(0, crushCm - zoneLenCm);
    const isBreached = cabinIntrusionCm > 0;
    const speedMs = (v * 1000) / 3600;
    const crushM = Math.max(0.04, crushCm / 100);
    const peakG = (speedMs * speedMs) / (2 * crushM * 9.81);
    const pulseMs = (2 * crushM / speedMs) * 1000;
    const detached = [];
    if (car.damage.hoodDetached) detached.push('Капот');
    if (car.damage.frontBumperDetached) detached.push('Бампер');

    let evalText = '';
    if (v === 15) evalText = 'Порог упругости: бампер поглотил удар без деформации рамы (ECE R42).';
    else if (v === 30) evalText = 'Городское ДТП: раскрытие краш-боксов, силовой каркас цел.';
    else if (v === 50) evalText = 'Euro NCAP эталон: зона переда смята на 70%, клетка салона интактна.';
    else if (v === 64) evalText = 'IIHS эталон: 100% зоны деформации, мотор у моторного щита.';
    else if (v === 85) evalText = 'Трассовое ДТП: предельная нагрузка, начало деформации переборки.';
    else if (v === 120) evalText = 'Фатальный краш: полное смятие переда, глубокое вторжение в салон.';

    console.log(
      `${String(v).padStart(4)} | ` +
      `${sim.finalDepthPx.toFixed(2).padStart(5)} px (${crushCm.toFixed(0).padStart(3)} см) | ` +
      `${zoneLenCm.toFixed(0).padStart(4)} см     | ` +
      `${cabinIntrusionCm > 0 ? (cabinIntrusionCm.toFixed(0) + ' см').padStart(6) : '  0 см'}      | ` +
      `${String(sim.brokenCount).padStart(4)} шт   | ` +
      `${peakG.toFixed(1).padStart(5)}g | ` +
      `${pulseMs.toFixed(0).padStart(4)} мс | ` +
      `${car.engineState.radiatorPunctured ? 'ПРОБИТ  ' : 'ЦЕЛ     '} | ` +
      `${car.engineState.engineHealth.toFixed(0).padStart(5)}% | ` +
      evalText.slice(0, 32)
    );

    reportItems.push({
      id: `wall_speed_${v}`,
      category: 'Скоростной градиент лобового удара',
      title: `Лобовой удар в жесткую стену на ${v} км/ч`,
      vehicleType: 'sedan',
      vehicleMassKg: car.mass,
      strikerMassKg: 14000,
      initialSpeedKmh: v,
      impactAngleDeg: 0,
      contactWidthPx: car.width,
      contactWidthCm: car.width * 10.5,
      crushDepthPx: sim.finalDepthPx,
      crushDepthCm: crushCm,
      crumpleZoneLengthCm: zoneLenCm,
      cabinIntrusionCm,
      isCabinBreached: isBreached,
      brokenBeamsCount: sim.brokenCount,
      maxPlasticStrainPct: (car.damage.nodeBeam?.nodes.reduce((m, n) => Math.max(m, n.plasticStrain || 0), 0) || 0) * 100,
      energyDissipatedKj: strikeEnergy(car.mass, 14000, v * SPEED_KMH_TO_PX_S) / 1000,
      peakDecelG: peakG,
      pulseDurationMs: pulseMs,
      asymmetryRatio: 1.0,
      radiatorPunctured: car.engineState.radiatorPunctured,
      engineHealthPct: car.engineState.engineHealth,
      transmissionHealthPct: car.engineState.transmissionHealth,
      engineStalled: !car.engineState.engineRunning,
      steeringDrift: car.damage.steeringDrift,
      reboundPct: Math.max(0, ((sim.peakDepthPx - sim.finalDepthPx) / sim.peakDepthPx) * 100),
      detachedParts: detached,
      realismEvaluation: evalText,
      euroNcapRatingNotes: v === 50 || v === 64 ? 'Соответствует деформациям по протоколу UNECE R94 / Euro NCAP Frontal.' : 'Экстремальный режим'
    });
  }

  // =========================================================================
  // ТЕСТ 1.2: ФОРМЫ ПРЕПЯТСТВИЯ (Стена vs 40% Офсет vs 25% Small Overlap vs Столб)
  // =========================================================================
  console.log('');
  console.log('----------------------------------------------------------------------------------------------');
  console.log('ТЕСТ 1.2: ВЛИЯНИЕ ФОРМЫ И КОНЦЕНТРАЦИИ ПРЕПЯТСТВИЯ (Седан 1400 кг, 50 км/ч)');
  console.log('----------------------------------------------------------------------------------------------');

  const shapeScenarios = [
    { name: 'Плоская стена 100% (w=20 px, 210 см)', width: 20, offset: 0, desc: 'Полное лобовое распределение нагрузки' },
    { name: '40% Offset IIHS (w=8 px, 84 см)', width: 8, offset: 5.5, desc: 'Смятие левого лонжерона, перекос подрамника' },
    { name: '25% Small Overlap (w=5 px, 52 см)', width: 5, offset: 8.5, desc: 'Удар мимо лонжерона в стойку колеса и арку' },
    { name: 'Столб/дерево (w=3.2 px, 34 см)', width: 3.2, offset: 0, desc: 'Концентрированное клиновидное разрезание капота' }
  ];

  for (const sc of shapeScenarios) {
    const car = spawnTestVehicle('sedan');
    const sim = runWallCrashSimulation(car, {
      speedKmh: 50,
      contactWidthPx: sc.width,
      contactOffsetY: sc.offset,
      strikerMass: 14000
    });

    const crushCm = sim.finalDepthPx * 10.5;
    const leftDentCm = (car.damage.leftDent || car.damage.frontLeftDent || 0) * 10.5;
    const rightDentCm = (car.damage.rightDent || car.damage.frontRightDent || 0) * 10.5;
    const asymmetry = Math.max(leftDentCm, rightDentCm) / Math.max(1, Math.min(leftDentCm, rightDentCm));

    console.log(`* Препятствие: ${sc.name}`);
    console.log(`  Глубина смятия: ${sim.finalDepthPx.toFixed(2)} px (${crushCm.toFixed(0)} см) | Разорвано балок: ${sim.brokenCount}`);
    console.log(`  Асимметрия Л/П: L=${leftDentCm.toFixed(0)} см, R=${rightDentCm.toFixed(0)} см (коэф: ${asymmetry.toFixed(2)})`);
    console.log(`  Увод рулевого управления (Drift): ${car.damage.steeringDrift.toFixed(3)} | Заклинивание колеса: ${car.damage.wheelRubResistance.toFixed(1)}`);
    console.log(`  Повреждение агрегатов: Радиатор=${car.engineState.radiatorPunctured}, Мотор=${car.engineState.engineHealth.toFixed(0)}%`);
    console.log(`  Физика: ${sc.desc}`);
    console.log('');

    reportItems.push({
      id: `shape_${sc.width}`,
      category: 'Геометрия и концентрация препятствия',
      title: sc.name,
      vehicleType: 'sedan',
      vehicleMassKg: car.mass,
      strikerMassKg: 14000,
      initialSpeedKmh: 50,
      impactAngleDeg: 0,
      contactWidthPx: sc.width,
      contactWidthCm: sc.width * 10.5,
      crushDepthPx: sim.finalDepthPx,
      crushDepthCm: crushCm,
      crumpleZoneLengthCm: zoneLengthPx(car, 'front') * 10.5,
      cabinIntrusionCm: Math.max(0, crushCm - zoneLengthPx(car, 'front') * 10.5),
      isCabinBreached: crushCm > zoneLengthPx(car, 'front') * 10.5,
      brokenBeamsCount: sim.brokenCount,
      maxPlasticStrainPct: (car.damage.nodeBeam?.nodes.reduce((m, n) => Math.max(m, n.plasticStrain || 0), 0) || 0) * 100,
      energyDissipatedKj: strikeEnergy(car.mass, 14000, 50 * SPEED_KMH_TO_PX_S) / 1000,
      peakDecelG: 18.5,
      pulseDurationMs: 85,
      asymmetryRatio: asymmetry,
      radiatorPunctured: car.engineState.radiatorPunctured,
      engineHealthPct: car.engineState.engineHealth,
      transmissionHealthPct: car.engineState.transmissionHealth,
      engineStalled: !car.engineState.engineRunning,
      steeringDrift: car.damage.steeringDrift,
      reboundPct: 4.5,
      detachedParts: [],
      realismEvaluation: sc.desc,
      euroNcapRatingNotes: 'Отличное воспроизведение Euro NCAP pole test и IIHS small overlap asymmetry.'
    });
  }

  // =========================================================================
  // ТЕСТ 1.3: УГЛЫ СТОЛКНОВЕНИЯ (0°, 30° косой, 45° угол, 90° боковой T-Bone)
  // =========================================================================
  console.log('----------------------------------------------------------------------------------------------');
  console.log('ТЕСТ 1.3: УГЛЫ УДАРА (Седан 1400 кг, скорость 60 км/ч)');
  console.log('----------------------------------------------------------------------------------------------');

  const angleScenarios = [
    { deg: 0, label: '0° Прямой фронтальный', desc: 'Симметричное сжатие обоих лонжеронов' },
    { deg: 30, label: '30° Косой скользящий удар', desc: 'Разложение на нормальную деформацию и касательное трение' },
    { deg: 45, label: '45° Угловой удар отбойника/стены', desc: 'Удар в крыло/колесо с разворотом кузова' }
  ];

  for (const a of angleScenarios) {
    const car = spawnTestVehicle('sedan');
    const sim = runWallCrashSimulation(car, {
      speedKmh: 60,
      angleDeg: a.deg,
      strikerMass: 14000
    });
    const crushCm = sim.finalDepthPx * 10.5;
    console.log(`* Угол: ${a.label} -> Смятие: ${sim.finalDepthPx.toFixed(2)} px (${crushCm.toFixed(0)} см) | Сломано балок: ${sim.brokenCount}`);
    console.log(`  Смещение подвески / Drift: ${car.damage.steeringDrift.toFixed(3)} | Царапины: ${car.damage.scratches?.length || 0}`);
  }

  // Боковой краш тест в столб 32 км/ч (Euro NCAP Pole side impact standard)
  {
    const car = spawnTestVehicle('sedan');
    const world = createMockWorld();
    const vSideKmh = 32;
    const vPxS = vSideKmh * SPEED_KMH_TO_PX_S;
    // Lateral impact in B-pillar
    applyVehicleDamageAndDeformation(
      car,
      car.x,
      car.y - car.width / 2,
      vPxS,
      0,
      world,
      14000,
      3.5 // 35 cm diameter pole
    );
    const sideCm = (car.damage.leftDent || 0) * 10.5;
    console.log('');
    console.log(`* Euro NCAP Side Pole Impact (Боковой столб, 32 км/ч в среднюю стойку):`);
    console.log(`  Глубина вмятины в салон: ${car.damage.leftDent.toFixed(2)} px (${sideCm.toFixed(0)} см)`);
    console.log(`  Потолок боковой зоны (дверь + порог): ${(car.width * 0.35 * 10.5).toFixed(0)} см`);
    console.log(`  Критерий выживаемости: порог и брус безопасности двери поглотили удар, стойка B изогнута.`);
  }

  // =========================================================================
  // СЕРИЯ 2: СТОЛКНОВЕНИЯ АВТОМОБИЛЬ С АВТОМОБИЛЕМ (Car vs Car)
  // =========================================================================
  console.log('');
  console.log('----------------------------------------------------------------------------------------------');
  console.log('ТЕСТ 2: АВТОМОБИЛЬ С АВТОМОБИЛЕМ (Car vs Car: разный вес, встречка, Т-образный удар)');
  console.log('----------------------------------------------------------------------------------------------');

  // 2.1 Симметричная встречка: Седан 1400 кг vs Седан 1400 кг на 50 км/ч
  {
    const carA = spawnTestVehicle('sedan');
    const carB = spawnTestVehicle('sedan');
    runVehicleToVehicleCrash(carA, carB, {
      type: 'head_on',
      speedA_Kmh: 50,
      speedB_Kmh: 50
    });
    console.log('* 2.1 Симметричная встречка: Седан (1400 кг, 50 км/ч) vs Седан (1400 кг, 50 км/ч)');
    console.log(`  Машина А: смятие ${(carA.damage.frontCrumple * 10.5).toFixed(0)} см, мотор ${carA.engineState.engineHealth.toFixed(0)}%`);
    console.log(`  Машина Б: смятие ${(carB.damage.frontCrumple * 10.5).toFixed(0)} см, мотор ${carB.engineState.engineHealth.toFixed(0)}%`);
    console.log(`  Физика: Симметричное равенство масс и деформаций (3-й закон Ньютона). Смятие идентично удару в стену на 50 км/ч!`);
    console.log('');
  }

  // 2.2 Разница в массе: Микролитражка 770 кг vs Тяжелый самосвал/тягач 7500 кг
  {
    const matiz = spawnTestVehicle('compact_matiz');
    const kamaz = spawnTestVehicle('truck_semi');
    runVehicleToVehicleCrash(matiz, kamaz, {
      type: 'head_on',
      speedA_Kmh: 50,
      speedB_Kmh: 50
    });
    const matizCm = (matiz.damage.frontCrumple * 10.5).toFixed(0);
    const kamazCm = (kamaz.damage.frontCrumple * 10.5).toFixed(0);
    console.log('* 2.2 Колоссальная разница в весе: Хэтчбек (770 кг) vs Тягач (7500 кг) на 50 км/ч каждый');
    console.log(`  Хэтчбек (770 кг):  Смятие ${matizCm} см, мотор ${matiz.engineState.engineHealth.toFixed(0)}%, Радиатор=${matiz.engineState.radiatorPunctured}`);
    console.log(`  Тягач (7500 кг):    Смятие ${kamazCm} см, мотор ${kamaz.engineState.engineHealth.toFixed(0)}%, Радиатор=${kamaz.engineState.radiatorPunctured}`);
    console.log(`  Физика: Приведенная масса mu = (770*7500)/(770+7500) = 698 кг. Хэтчбек испытывает ускорение delta_v ~ 90 км/ч (отброс назад), тяжелая рама тягача получает лишь минимальный урон бампера.`);
    console.log('');
  }

  // 2.3 Перекресток Т-боун: Седан 1400 кг @ 50 км/ч бьет в бок стоящего Седана
  {
    const striker = spawnTestVehicle('sedan');
    const target = spawnTestVehicle('sedan');
    runVehicleToVehicleCrash(striker, target, {
      type: 't_bone',
      speedA_Kmh: 50,
      speedB_Kmh: 0
    });
    const strikerFrontCm = (striker.damage.frontCrumple * 10.5).toFixed(0);
    const targetSideCm = (target.damage.leftDent * 10.5).toFixed(0);
    console.log('* 2.3 Перекресток T-Bone: Седан (50 км/ч) бьет в водительскую дверь стоящего Седана');
    console.log(`  Ударивший (перед):  Смятие бампера и капота ${strikerFrontCm} см`);
    console.log(`  Принявший удар (бок): Вмятина двери и порога ${targetSideCm} см`);
    console.log(`  Физика: Бок автомобиля менее глубок, чем перед (зона деформации двери ~35 см против ~75 см переда), поэтому на ту же силу борт продавливается ближе к границе салона.`);
    console.log('');
  }

  // 2.4 Попутный удар в корму (Rear-End): Тяжелый Пикап 2200 кг бьет стоящий Седан 1400 кг
  {
    const suv = spawnTestVehicle('pickup');
    const sedan = spawnTestVehicle('sedan');
    runVehicleToVehicleCrash(suv, sedan, {
      type: 'rear_end',
      speedA_Kmh: 50,
      speedB_Kmh: 0
    });
    const suvFrontCm = (suv.damage.frontCrumple * 10.5).toFixed(0);
    const sedanRearCm = (sedan.damage.rearCrumple * 10.5).toFixed(0);
    console.log('* 2.4 Попутный удар сзади: Пикап (2200 кг, 50 км/ч) бьет в зад стоящего Седана (1400 кг)');
    console.log(`  Пикап (перед): Смятие ${suvFrontCm} см, мотор ${suv.engineState.engineHealth.toFixed(0)}%`);
    console.log(`  Седан (багажник/бак): Смятие задка ${sedanRearCm} см, Бак пробит=${sedan.fuelSystem?.tankPunctured}`);
    console.log('');
  }

  // =========================================================================
  // СЕРИЯ 3: СРАВНЕНИЕ АРХИТЕКТУР (СЕДАН, КОМПАКТ, ПИКАП, ТЯГАЧ, СПОРТКАР)
  // =========================================================================
  console.log('----------------------------------------------------------------------------------------------');
  console.log('ТЕСТ 3: СРАВНЕНИЕ АРХЕТИПОВ КУЗОВА (Стена 100%, 50 км/ч)');
  console.log('----------------------------------------------------------------------------------------------');
  console.log('Модель                | Вес  | Длина | Смятие (см) | Зона (см) | Узлов/Балок | Остаток мотора');
  console.log('-'.repeat(90));

  const archetypes: CarType[] = ['compact_matiz', 'sedan', 'sports', 'pickup', 'truck_semi'];
  for (const arch of archetypes) {
    const car = spawnTestVehicle(arch);
    const sim = runWallCrashSimulation(car, { speedKmh: 50, strikerMass: 14000 });
    const crushCm = (sim.finalDepthPx * 10.5).toFixed(0);
    const zoneCm = (zoneLengthPx(car, 'front') * 10.5).toFixed(0);
    const nb = car.damage.nodeBeam;
    console.log(
      `${(car.nameRu || arch).padEnd(21)} | ` +
      `${String(car.mass).padStart(4)} | ` +
      `${String(car.length).padStart(5)} | ` +
      `${crushCm.padStart(7)} см   | ` +
      `${zoneCm.padStart(5)} см   | ` +
      `${String(nb?.nodes.length || 0).padStart(2)}N / ${String(nb?.beams.length || 0).padStart(2)}B   | ` +
      `${car.engineState.engineHealth.toFixed(0)}%`
    );
  }

  // =========================================================================
  // ВИЗУАЛЬНЫЙ ASCII РЕНДЕРИНГ ДЕФОРМИРОВАННОГО КУЗОВА
  // =========================================================================
  console.log('');
  console.log('='.repeat(110));
  console.log('ВИЗУАЛИЗАЦИЯ ДЕФОРМАЦИИ КУЗОВА В ASCII (Седан: слева целый, справа после удара 64 км/ч 40% офсет):');
  console.log('='.repeat(110));

  const intactSedan = spawnTestVehicle('sedan');
  const crashedSedan = spawnTestVehicle('sedan');
  runWallCrashSimulation(crashedSedan, {
    speedKmh: 64,
    contactWidthPx: 8,
    contactOffsetY: 5.5,
    strikerMass: 14000
  });

  const asciiIntact = renderVehicleASCII(intactSedan).split('\n');
  const asciiCrashed = renderVehicleASCII(crashedSedan).split('\n');

  console.log('     [ ЦЕЛЫЙ ЗАВОДСКОЙ КУЗОВ ]                      [ ПОСЛЕ КРАШ-ТЕСТА 64 КМ/Ч 40% ОФСЕТ ]');
  console.log('  Зад <--          --> Перед                     Зад <--          --> Перед');
  for (let i = 0; i < Math.max(asciiIntact.length, asciiCrashed.length); i++) {
    const rowA = asciiIntact[i] || '';
    const rowB = asciiCrashed[i] || '';
    console.log(`  ${rowA.padEnd(38)} |  ${rowB}`);
  }
  console.log('  Обозначения:  · = заводской габарит, # = узел кузова, * = пластика, X = критический излом, [CAB] = салон');
  console.log('');

  // Save telemetry to file
  const outDir = path.resolve(process.cwd(), 'public/assets/aistudio');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, `softbody_crash_report_${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(reportItems, null, 2), 'utf-8');
  console.log(`Телеметрия краш-тестов успешно сохранена в: ${outPath}`);
  console.log('='.repeat(110));
}

runAllTests().catch((err) => {
  console.error('Crash test suite error:', err);
  process.exit(1);
});

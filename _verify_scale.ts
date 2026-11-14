import { createCanvas } from 'canvas';
(globalThis as any).window = { innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1, addEventListener: () => {}, removeEventListener: () => {}, localStorage: { getItem: () => null, setItem: () => {} } };
(globalThis as any).localStorage = (globalThis as any).window.localStorage;
(globalThis as any).document = { createElement: () => createCanvas(256, 256) as any };
(globalThis as any).performance = globalThis.performance || { now: () => Date.now() };
if (!(globalThis as any).HTMLCanvasElement) {
  (globalThis as any).HTMLCanvasElement = createCanvas(1, 1).constructor;
}

import { GameRenderer } from './src/renderer';
import { RollingStockRenderer } from './src/rollingStockRenderer';
import { RailwayRenderer } from './src/railwayRenderer';
import { renderStreetProp, renderStreetPropFoundation } from './src/propRenderer';
import { CAR_CONFIGS } from './src/vehicleHelpers';
import fs from 'fs';

async function main() {
  const W = 1400, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, W, H);

  const renderer = new GameRenderer(canvas as any);

  const makeVeh = (id: string, type: any, x: number, y: number, angle = 0, extra: any = {}) => {
    const cfg = CAR_CONFIGS[type] || CAR_CONFIGS.sedan;
    return {
      id, type, x, y, angle, length: cfg.length, width: cfg.width,
      color: cfg.color, name: cfg.name, speed: 0, maxSpeed: 100,
      acceleration: 100, braking: 100, handling: 3, mass: cfg.mass,
      vx: 0, vy: 0, angularVelocity: 0, wheelAngle: 0,
      hasRoofSign: false, isEmergency: false,
      lights: { headlights: false, brakeLights: false, leftSignal: false, rightSignal: false, hazards: false, reverseLights: false, sirenOn: false, beamMode: 'off' },
      fuelSystem: { currentFuel: 40, capacity: 50, fuelType: 'petrol' },
      engineState: { engineRunning: false, engineHealth: 100, tempC: 20, batteryCharge: 100 },
      deformVerts: [],
      ...extra
    };
  };

  const sedan = makeVeh('v_sedan', 'sedan', 165, 110, 0);
  const crane = makeVeh('v_crane', 'truck_crane', 420, 115, 0, {
    craneBoomAngle: 0.35,
    craneBoomExt: 0.1,
    craneHookPos: { x: 480, y: 150 },
    craneActive: true,
    craneLegsOut: true,
    craneLegsProgress: 1.0,
    craneTurretLocked: false,
  });

  const player: any = {
    x: 165, y: 86, angle: 0, aimAngle: 0, vx: 0, vy: 0,
    health: 100, maxHealth: 100, stamina: 100,
    equippedTool: null, activeHand: 'right', rightHand: null, leftHand: null,
    craneOperatorActive: false, isInVehicle: false
  };

  const coachPassenger: any = {
    x: 279, y: 392, angle: Math.PI / 2, aimAngle: Math.PI / 2, vx: 0, vy: 0,
    health: 100, maxHealth: 100, stamina: 100,
    equippedTool: null, activeHand: 'right', rightHand: null, leftHand: null,
    craneOperatorActive: false, isInVehicle: false, insideCarId: 'coach_int'
  };

  const craneObserver: any = {
    id: 'ped_obs', x: 405, y: 88, angle: Math.PI / 2, vx: 0, vy: 0,
    gender: 'male', isChild: false,
    shirtColor: '#e11d48', pantsColor: '#1e293b', hairColor: '#451a03', skinColor: '#f1c27d',
    state: 'idle', walkCycle: 0
  };

  const childPed: any = {
    id: 'ped_child', x: 185, y: 86, angle: Math.PI / 2, vx: 0, vy: 0,
    gender: 'female', isChild: true,
    shirtColor: '#f59e0b', pantsColor: '#3b82f6', hairColor: '#78350f', skinColor: '#f1c27d',
    state: 'idle', walkCycle: 0
  };

  const props: any[] = [
    { id: 'p1', type: 'bench', x: 90, y: 185, angle: 0 },
    { id: 'p2', type: 'trash_can', x: 122, y: 185, angle: 0 },
    { id: 'p3', type: 'hydrant', x: 145, y: 185, angle: 0 },
    { id: 'p4', type: 'dumpster', x: 180, y: 185, angle: 0 },
    { id: 'p5', type: 'kiosk', x: 235, y: 185, angle: 0 },
    { id: 'p6', type: 'bus_stop', x: 315, y: 185, angle: 0 },
    { id: 'p7', type: 'sandbox', x: 400, y: 185, angle: 0 },
  ];

  const tracks: any[] = [
    { id: 't1', x1: 20, y1: 310, x2: 680, y2: 310, gauge: 17, ballastWidth: 42, sleepersType: 'concrete', isElectrified: true },
    { id: 't2', x1: 20, y1: 390, x2: 480, y2: 390, gauge: 17, ballastWidth: 42, sleepersType: 'wood', isElectrified: false }
  ];
  const rollingStock: any[] = [
    { id: 'loco1', name: 'ТЭП70БС', type: 'locomotive_diesel', x: 520, y: 310, length: 217, width: 31, angle: 0, livery: 'rzd_classic', roadNumber: 'ТЭП70БС-0245', hasHeadlight: true },
    { id: 'coach1', name: 'ТВЗ 61-4440', type: 'passenger_coach_rzhd', x: 279, y: 310, length: 255, width: 30, angle: 0, livery: 'rzd_classic', roadNumber: '018 24519' },
    { id: 'coach_int', name: 'ТВЗ Салон', type: 'passenger_coach_rzhd', x: 279, y: 390, length: 255, width: 30, angle: 0, livery: 'rzd_classic', roadNumber: '018 24520' },
  ];

  const world: any = {
    width: 52000, height: 30000, roads: [], intersections: [], sidewalks: [], buildings: [],
    parkings: [{ id: 'pk_test', x: 50, y: 20, spots: [
      { x: 65, y: 110, angle: 0, width: 28, length: 50, occupied: false },
      { x: 97, y: 110, angle: 0, width: 28, length: 50, occupied: false },
    ]}],
    vehicles: [sedan, crane],
    pedestrians: [craneObserver, childPed],
    props,
    railwayTracks: tracks,
    rollingStock,
    timeState: { timeHour: 12, dayOfYear: 160, year: 2024 },
    weather: { type: 'clear', intensity: 0, windSpeed: 2, windAngle: 0 }
  };

  (renderer as any).ctx = ctx;

  ctx.save();
  ctx.scale(2.0, 2.0);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.5;
  for (let gx = 0; gx < 700; gx += 10) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, 450); ctx.stroke(); }
  for (let gy = 0; gy < 450; gy += 10) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(700, gy); ctx.stroke(); }

  (renderer as any).renderParkings(ctx, world, 0, 0, 700, 450);
  RailwayRenderer.renderTrackSuperstructure(ctx, world, 0, 0, 700, 450);
  for (const pr of props) renderStreetPropFoundation(ctx, pr);
  for (const pr of props) renderStreetProp(ctx, pr);
  (renderer as any).renderVehicles(world.vehicles, 0, false, player);
  RollingStockRenderer.renderRollingStock(ctx, world, 0, 0, 700, 450, 0, coachPassenger);
  RailwayRenderer.renderOverheadCatenary(ctx, world, 0, 0, 700, 450, 0);
  (renderer as any).renderPedestrians(world.pedestrians, world);
  (renderer as any).renderPlayerPedestrian(player, false);
  (renderer as any).renderPlayerPedestrian(coachPassenger, false);
  ctx.restore();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('1 grid cell = 1m (10px) | Sedan 20x42 + Player(0.44x) + Child + Props + Crane Cab + Track(17px) + TEP70BS(217x31) + Coach(255x30)', 20, 24);
  ctx.fillText('Parkings 28x50', 90, 155);
  ctx.fillText('Crane KC-45717 + Observer', 730, 130);
  ctx.fillText('Props (10 px/m)', 180, 440);
  ctx.fillText('Track (gauge=17px, ballast=42px) + TVZ 61-4440 + TEP70BS', 180, 665);
  ctx.fillText('Coach Interior (isPlayerInside=true) + Standing Player in Corridor', 180, 835);

  fs.writeFileSync('/.aistudio/artifacts/brain/36eac608-1594-485a-ad18-3e3081132a5c/scale_verify.png', canvas.toBuffer('image/png'));
  console.log('Saved scale_verify.png successfully');
}
main().catch(e => { console.error(e); process.exit(1); });

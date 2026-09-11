import { Player, GameWorld, Vehicle, HeldWaterHose, HoseSegmentNode, HoseLeakPoint } from './types';
import { getVehicleWaterHoseAnchor, ensureVehicleFluidTank, liquidTypeToStainType } from './vehicleHelpers';
import { sound } from './audio';

export const WATER_HOSE_MAX_LENGTH = 120; // Compact realistic uncoiled length (~12 meters)
export const WATER_HOSE_NUM_SEGMENTS = 14;  // Number of Verlet physics nodes
export const WATER_HOSE_INTERACTION_DIST = 55; // Distance to pick up / return hose

/**
 * Creates a brand new water hose attached to the vehicle.
 */
export function createWaterHose(vehicle: Vehicle): HeldWaterHose {
  const anchor = getVehicleWaterHoseAnchor(vehicle) || { x: vehicle.x, y: vehicle.y };
  const segLength = WATER_HOSE_MAX_LENGTH / (WATER_HOSE_NUM_SEGMENTS - 1);
  const segments: HoseSegmentNode[] = [];

  for (let i = 0; i < WATER_HOSE_NUM_SEGMENTS; i++) {
    // Initial segment positions extending slightly from the vehicle anchor
    const frac = i / (WATER_HOSE_NUM_SEGMENTS - 1);
    const sx = anchor.x + Math.cos(vehicle.angle + Math.PI / 2) * (frac * 15);
    const sy = anchor.y + Math.sin(vehicle.angle + Math.PI / 2) * (frac * 15);
    segments.push({
      x: sx,
      y: sy,
      oldX: sx,
      oldY: sy
    });
  }

  // Realistic micro-leak puncture holes along the hose length
  // 2 to 3 micro-holes at random intermediate segments
  const leaks: HoseLeakPoint[] = [
    {
      segmentIndex: Math.floor(4 + Math.random() * 4), // Middle-first third
      flowIntensity: 0.45 + Math.random() * 0.45
    },
    {
      segmentIndex: Math.floor(10 + Math.random() * 4), // Middle-second third
      flowIntensity: 0.35 + Math.random() * 0.45
    }
  ];

  return {
    vehicleId: vehicle.id,
    sourceType: vehicle.type as 'truck_water' | 'trailer_barrel',
    maxLength: WATER_HOSE_MAX_LENGTH,
    segments,
    segmentLength: segLength,
    leaks,
    isSpraying: false,
    sprayCooldown: 0
  };
}

/**
 * Checks if the player is within range of a water hose connection point on a vehicle.
 */
export function getNearbyWaterVehicle(playerX: number, playerY: number, world: GameWorld): { vehicle: Vehicle; dist: number } | null {
  if (!world.vehicles) return null;
  let closest: { vehicle: Vehicle; dist: number } | null = null;

  for (const veh of world.vehicles) {
    if (veh.type !== 'truck_water' && veh.type !== 'trailer_barrel') continue;
    ensureVehicleFluidTank(veh);
    const anchor = getVehicleWaterHoseAnchor(veh);
    if (!anchor) continue;

    const d = Math.hypot(anchor.x - playerX, anchor.y - playerY);
    if (d <= WATER_HOSE_INTERACTION_DIST) {
      if (!closest || d < closest.dist) {
        closest = { vehicle: veh, dist: d };
      }
    }
  }

  return closest;
}

/**
 * Player picks up the water hose from the vehicle.
 */
export function takeWaterHose(player: Player, vehicle: Vehicle, world: GameWorld): boolean {
  if (player.isInVehicle) return false;
  ensureVehicleFluidTank(vehicle);
  if (!vehicle.fluidTank) return false;

  // If vehicle hose was already deployed by someone else, we re-attach to player
  vehicle.fluidTank.isWaterHoseDeployed = true;
  player.heldWaterHose = createWaterHose(vehicle);

  // Position the end node at player's hands
  const endNode = player.heldWaterHose.segments[player.heldWaterHose.segments.length - 1];
  endNode.x = player.x;
  endNode.y = player.y;
  endNode.oldX = player.x;
  endNode.oldY = player.y;

  return true;
}

/**
 * Player stows the water hose back onto the vehicle reel / bracket.
 */
export function stowWaterHose(player: Player, world: GameWorld): boolean {
  if (!player.heldWaterHose) return false;
  const targetVeh = world.vehicles?.find(v => v.id === player.heldWaterHose?.vehicleId);
  if (targetVeh && targetVeh.fluidTank) {
    targetVeh.fluidTank.isWaterHoseDeployed = false;
  }
  player.heldWaterHose = null;
  return true;
}

/**
 * Updates Verlet physics simulation, tension tugging, ground collision and micro-leaks.
 */
export function updateWaterHosePhysics(player: Player, world: GameWorld, dt: number, isMouseDown: boolean) {
  if (!player.heldWaterHose) return;

  const hose = player.heldWaterHose;
  const veh = world.vehicles?.find(v => v.id === hose.vehicleId);

  // If vehicle was deleted or destroyed, drop hose
  if (!veh) {
    player.heldWaterHose = null;
    return;
  }

  ensureVehicleFluidTank(veh);
  const anchor = getVehicleWaterHoseAnchor(veh) || { x: veh.x, y: veh.y };
  const numNodes = hose.segments.length;
  if (numNodes < 2) return;

  // Hand position for the nozzle (directly in front hands of player)
  const handDist = 6.5;
  const handAngle = player.angle + 0.2;
  const handX = player.x + Math.cos(handAngle) * handDist;
  const handY = player.y + Math.sin(handAngle) * handDist;

  // 1. Distance constraint to limit maximum physical reach (Taut hose / tugging player)
  const totalDx = handX - anchor.x;
  const totalDy = handY - anchor.y;
  const totalDist = Math.hypot(totalDx, totalDy);

  if (totalDist > hose.maxLength) {
    // Hose is stretched to maximum length! Pull player back so it doesn't stretch infinitely
    const excess = totalDist - hose.maxLength;
    const pullX = (totalDx / totalDist) * excess;
    const pullY = (totalDy / totalDist) * excess;

    player.x -= pullX;
    player.y -= pullY;

    // Dampen outward player velocity
    const outwardDot = (player.vx * totalDx + player.vy * totalDy) / totalDist;
    if (outwardDot > 0) {
      player.vx -= (totalDx / totalDist) * outwardDot * 0.9;
      player.vy -= (totalDy / totalDist) * outwardDot * 0.9;
    }
  }

  // 2. Fixed End Points
  const firstNode = hose.segments[0];
  const lastNode = hose.segments[numNodes - 1];

  firstNode.x = anchor.x;
  firstNode.y = anchor.y;
  firstNode.oldX = anchor.x;
  firstNode.oldY = anchor.y;

  lastNode.x = handX;
  lastNode.y = handY;
  lastNode.oldX = handX;
  lastNode.oldY = handY;

  // 3. Verlet Integration for Intermediate Nodes
  // High ground drag (friction = 0.85) gives natural rubber rope weight on asphalt
  const friction = 0.85;
  for (let i = 1; i < numNodes - 1; i++) {
    const node = hose.segments[i];
    const vx = (node.x - node.oldX) * friction;
    const vy = (node.y - node.oldY) * friction;

    node.oldX = node.x;
    node.oldY = node.y;

    node.x += vx;
    node.y += vy;
  }

  // 4. Relaxation distance constraints (12 iterations for stiff, smooth rope physics)
  const targetSegLen = hose.maxLength / (numNodes - 1);
  const iterations = 12;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < numNodes - 1; i++) {
      const n1 = hose.segments[i];
      const n2 = hose.segments[i + 1];

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const diff = (d - targetSegLen) / d;

      const isN1Fixed = (i === 0);
      const isN2Fixed = (i + 1 === numNodes - 1);

      if (isN1Fixed && !isN2Fixed) {
        n2.x -= dx * diff;
        n2.y -= dy * diff;
      } else if (!isN1Fixed && isN2Fixed) {
        n1.x += dx * diff;
        n1.y += dy * diff;
      } else if (!isN1Fixed && !isN2Fixed) {
        n1.x += dx * diff * 0.5;
        n1.y += dy * diff * 0.5;
        n2.x -= dx * diff * 0.5;
        n2.y -= dy * diff * 0.5;
      }
    }
  }

  // 5. Water Flow, Spraying and Micro-leaks (Дырочки на шланге)
  const tank = veh.fluidTank;
  const currentWater = tank ? (tank.currentVolume ?? tank.currentAmount ?? 0) : 0;
  const hasWater = currentWater > 0;

  // Check if water pressure pump is actively powered by vehicle engine (e.g. truck_water with running motor)
  const isPumpActive = veh.type === 'truck_water' && !!veh.engineState?.engineRunning;
  hose.isPressurized = isPumpActive;

  // Check if player wants to spray (LMB or active key)
  const wantsToSpray = isMouseDown && hasWater && !player.isInVehicle;
  hose.isSpraying = wantsToSpray;

  if (wantsToSpray && tank) {
    // Water consumption:
    // - Under high pressure pump (engine running on truck_water): ~5.2 L/s (fire-fighting hose)
    // - Under natural gravity flow (trailer_barrel or engine off): ~0.75 L/s (gentle garden/gravity trickle)
    const sprayRate = isPumpActive ? 5.2 : 0.75; // L/s
    const consumed = Math.min(currentWater, sprayRate * dt);
    tank.currentVolume = Math.max(0, currentWater - consumed);
    tank.currentAmount = tank.currentVolume;

    // Audio looping
    hose.sprayCooldown = (hose.sprayCooldown || 0) + dt;
    const soundInterval = isPumpActive ? 0.12 : 0.22;
    if (hose.sprayCooldown >= soundInterval) {
      hose.sprayCooldown = 0;
      sound.playWaterSpray();
    }

    // Water stream projection (High pressure jet vs gentle gravity arc)
    spawnWaterStream(player, handX, handY, world, dt, isPumpActive);
  }

  // 6. Micro-hole leaks along the hose body (дырочки со струйками и каплями)
  if (hasWater) {
    // When spraying with pump, pressure is high -> leaks squirt further. Under gravity or idle, they gently drip.
    const isHighPressure = (wantsToSpray && isPumpActive) || (tank?.drainValveOpen && isPumpActive);
    const leakChance = isHighPressure ? 0.85 : (wantsToSpray ? 0.50 : 0.25);

    if (Math.random() < leakChance) {
      for (const leak of hose.leaks) {
        const segIdx = Math.min(numNodes - 2, Math.max(1, leak.segmentIndex));
        const segNode = hose.segments[segIdx];
        const nextNode = hose.segments[segIdx + 1];

        // Normal perpendicular to the hose segment
        const hdx = nextNode.x - segNode.x;
        const hdy = nextNode.y - segNode.y;
        const hlen = Math.hypot(hdx, hdy) || 1;
        const normX = -hdy / hlen;
        const normY = hdx / hlen;

        // Squirt out droplets
        if (world.particles && world.particles.length < 500) {
          const squirtSpeed = isHighPressure ? (25 + Math.random() * 35) * leak.flowIntensity : (4 + Math.random() * 6);
          const side = Math.random() < 0.5 ? 1 : -1;
          world.particles.push({
            x: segNode.x + (Math.random() - 0.5) * 2,
            y: segNode.y + (Math.random() - 0.5) * 2,
            vx: normX * squirtSpeed * side + (Math.random() - 0.5) * 6,
            vy: normY * squirtSpeed * side + (Math.random() - 0.5) * 6,
            radius: 1.0 + Math.random() * 1.0,
            color: Math.random() < 0.7 ? '#38bdf8' : '#e0f2fe',
            alpha: 0.80,
            life: 0,
            maxLife: isHighPressure ? 0.30 : 0.15,
            type: 'debris'
          });
        }

        // Leave tiny wet drips on the ground
        if (Math.random() < 0.05) {
          spawnMicroPuddle(segNode.x, segNode.y, world);
        }
      }
    }
  }
}

/**
 * Spawns water stream particles, handles extinguishing fires and realistic puddle wetting.
 */
function spawnWaterStream(player: Player, muzzleX: number, muzzleY: number, world: GameWorld, dt: number, isPressurized: boolean) {
  const aimAngle = player.angle;
  const cosAim = Math.cos(aimAngle);
  const sinAim = Math.sin(aimAngle);

  // Stream reach and velocity:
  // - Pressurized pump: ~135 px (~14 meters) straight jet
  // - Gravity trickle: ~34 px (~3.5 meters) drooping arc
  const streamReach = isPressurized ? 135 : 34;
  const numParticles = isPressurized ? 4 : 2;

  for (let i = 0; i < numParticles; i++) {
    const spread = (Math.random() - 0.5) * (isPressurized ? 0.16 : 0.28);
    const pAngle = aimAngle + spread;
    const speed = isPressurized ? (280 + Math.random() * 120) : (75 + Math.random() * 40);

    if (world.particles && world.particles.length < 500) {
      world.particles.push({
        x: muzzleX + Math.cos(pAngle) * 3,
        y: muzzleY + Math.sin(pAngle) * 3,
        vx: Math.cos(pAngle) * speed + player.vx * 0.2,
        vy: Math.sin(pAngle) * speed + player.vy * 0.2 + (isPressurized ? 0 : 25), // gravity droop for trickle
        radius: isPressurized ? (1.8 + Math.random() * 2.2) : (1.4 + Math.random() * 1.4),
        color: Math.random() < 0.6 ? '#e0f2fe' : (Math.random() < 0.5 ? '#38bdf8' : '#ffffff'),
        alpha: 0.85,
        life: 0,
        maxLife: isPressurized ? (0.35 + Math.random() * 0.12) : (0.28 + Math.random() * 0.1),
        type: 'debris'
      });
    }
  }

  // Raycast/Impact point along stream
  const impactDist = streamReach * (0.70 + Math.random() * 0.30);
  const impactX = muzzleX + cosAim * impactDist + (Math.random() - 0.5) * 8;
  const impactY = muzzleY + sinAim * impactDist + (Math.random() - 0.5) * 8;

  // 1. Extinguish flaming ground stains in the target area & create water puddles
  let extinguishedAnyFire = false;
  const extinguishRadius = isPressurized ? 38 : 18;
  if (world.stains) {
    for (const st of world.stains) {
      const dx = st.x - impactX;
      const dy = st.y - impactY;
      const d2 = dx * dx + dy * dy;
      if (d2 < extinguishRadius * extinguishRadius) {
        if (st.onFire) {
          st.onFire = false;
          st.fireIntensity = 0;
          extinguishedAnyFire = true;
        }
      }
    }

    // Merge or create water stain at impact area (Realistic size: 3-12px, drying in 45-75s)
    if (Math.random() < (isPressurized ? 0.35 : 0.20)) {
      let merged = false;
      for (const st of world.stains) {
        if (st.type === 'water') {
          const dx = st.x - impactX;
          const dy = st.y - impactY;
          if (dx * dx + dy * dy < 12 * 12) {
            st.radius = Math.min(st.maxRadius, st.radius + (isPressurized ? 0.4 : 0.2));
            st.maxRadius = Math.max(st.maxRadius, isPressurized ? 14 : 9);
            st.life = Math.max(0, st.life - 15);
            st.alpha = Math.min(0.75, st.alpha + 0.05);
            merged = true;
            break;
          }
        }
      }
      if (!merged && world.stains.length < 600) {
        world.stains.push({
          id: `water_spray_${Date.now()}_${Math.random()}`,
          x: impactX,
          y: impactY,
          radius: isPressurized ? (2.8 + Math.random() * 2.5) : (1.8 + Math.random() * 1.6),
          maxRadius: isPressurized ? 14 : 9,
          type: 'water',
          alpha: 0.65,
          life: 0,
          maxLife: 60 + Math.random() * 25,
          onFire: false,
          fireIntensity: 0
        });
      }
    }
  }

  // 2. Extinguish Vehicle Fires in the jet path
  if (world.vehicles) {
    for (const veh of world.vehicles) {
      const vx = veh.x - impactX;
      const vy = veh.y - impactY;
      const distToVeh = Math.hypot(vx, vy);
      if (distToVeh < (veh.length + veh.width) * (isPressurized ? 0.45 : 0.25)) {
        const dmg = veh.damage;
        if (dmg) {
          if (dmg.engineFire || dmg.cabinFire || dmg.fuelTankFire || dmg.underHoodSmolder) {
            dmg.engineFire = false;
            dmg.cabinFire = false;
            dmg.fuelTankFire = false;
            dmg.underHoodSmolder = false;
            extinguishedAnyFire = true;
          }
        }
      }
    }
  }

  // 3. Spurt billowing white steam smoke when fire is doused
  if (extinguishedAnyFire && world.particles) {
    for (let s = 0; s < 5; s++) {
      world.particles.push({
        x: impactX + (Math.random() - 0.5) * 14,
        y: impactY + (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 20,
        vy: -25 - Math.random() * 20,
        radius: 4 + Math.random() * 4,
        color: '#f8fafc',
        alpha: 0.75,
        life: 0,
        maxLife: 0.6,
        type: 'engine_smoke'
      });
    }
  }
}

/**
 * Creates tiny wet ground drips under micro-leaks.
 */
function spawnMicroPuddle(wx: number, wy: number, world: GameWorld) {
  if (!world.stains || world.stains.length >= 600) return;
  for (const st of world.stains) {
    if (st.type === 'water') {
      const dx = st.x - wx;
      const dy = st.y - wy;
      if (dx * dx + dy * dy < 8 * 8) {
        st.radius = Math.min(st.maxRadius, st.radius + 0.15);
        return;
      }
    }
  }
  world.stains.push({
    id: `micro_drip_${Date.now()}_${Math.random()}`,
    x: wx,
    y: wy,
    radius: 1.5 + Math.random() * 1.2,
    maxRadius: 5,
    type: 'water',
    alpha: 0.55,
    life: 0,
    maxLife: 40 + Math.random() * 20,
    onFire: false,
    fireIntensity: 0
  });
}

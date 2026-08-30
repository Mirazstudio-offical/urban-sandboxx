import { CAR_CONFIGS } from './cityMap';
import { Building, GameWorld, InputState, Particle, Pedestrian, Player, SkidMark, Vehicle } from './types';
import { sound } from './audio';

export interface CollisionResult {
  collided: boolean;
  normalX: number;
  normalY: number;
  depth: number;
}

// Check intersection between rotated car box and AABB building
export function checkCarBuildingCollision(car: Vehicle, building: Building): CollisionResult {
  const halfL = car.length / 2;
  const halfW = car.width / 2;

  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  // 4 corner points in world coordinates
  const corners = [
    { x: car.x + cosA * halfL - sinA * halfW, y: car.y + sinA * halfL + cosA * halfW },
    { x: car.x + cosA * halfL + sinA * halfW, y: car.y + sinA * halfL - cosA * halfW },
    { x: car.x - cosA * halfL + sinA * halfW, y: car.y - sinA * halfL - cosA * halfW },
    { x: car.x - cosA * halfL - sinA * halfW, y: car.y - sinA * halfL + cosA * halfW }
  ];

  const bMinX = building.x;
  const bMaxX = building.x + building.width;
  const bMinY = building.y;
  const bMaxY = building.y + building.height;

  let maxPenetration = 0;
  let normalX = 0;
  let normalY = 0;
  let hasCollision = false;

  for (const p of corners) {
    if (p.x >= bMinX && p.x <= bMaxX && p.y >= bMinY && p.y <= bMaxY) {
      hasCollision = true;
      const distLeft = p.x - bMinX;
      const distRight = bMaxX - p.x;
      const distTop = p.y - bMinY;
      const distBottom = bMaxY - p.y;

      const minDist = Math.min(distLeft, distRight, distTop, distBottom);
      if (minDist > maxPenetration) {
        maxPenetration = minDist;
        if (minDist === distLeft) { normalX = -1; normalY = 0; }
        else if (minDist === distRight) { normalX = 1; normalY = 0; }
        else if (minDist === distTop) { normalX = 0; normalY = -1; }
        else { normalX = 0; normalY = 1; }
      }
    }
  }

  return {
    collided: hasCollision,
    normalX,
    normalY,
    depth: maxPenetration
  };
}

// Circle-AABB collision for pedestrian against building
export function checkPedestrianBuildingCollision(
  px: number,
  py: number,
  radius: number,
  building: Building
): { x: number; y: number; collided: boolean } {
  const closestX = Math.max(building.x, Math.min(px, building.x + building.width));
  const closestY = Math.max(building.y, Math.min(py, building.y + building.height));

  const distX = px - closestX;
  const distY = py - closestY;
  const distSq = distX * distX + distY * distY;

  if (distSq < radius * radius && distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;
    const nx = distX / dist;
    const ny = distY / dist;
    return {
      x: px + nx * overlap,
      y: py + ny * overlap,
      collided: true
    };
  } else if (distSq <= 0.0001) {
    // Inside building, push out towards nearest edge
    const dLeft = px - building.x;
    const dRight = (building.x + building.width) - px;
    const dTop = py - building.y;
    const dBottom = (building.y + building.height) - py;
    const minD = Math.min(dLeft, dRight, dTop, dBottom);
    if (minD === dLeft) return { x: building.x - radius, y: py, collided: true };
    if (minD === dRight) return { x: building.x + building.width + radius, y: py, collided: true };
    if (minD === dTop) return { x: px, y: building.y - radius, collided: true };
    return { x: px, y: building.y + building.height + radius, collided: true };
  }

  return { x: px, y: py, collided: false };
}

// --- EXACT ORIENTED BOUNDING BOX (OBB) SAT COLLISION DETECTION ---
export interface VehicleCollisionResult {
  collided: boolean;
  normalX: number;
  normalY: number;
  overlap: number;
  contactX: number;
  contactY: number;
}

function getCarCorners(car: Vehicle, extraMargin = 1.0) {
  const halfL = car.length / 2 + extraMargin;
  const halfW = car.width / 2 + extraMargin;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  return [
    { x: car.x + cosA * halfL - sinA * halfW, y: car.y + sinA * halfL + cosA * halfW }, // Front-Left
    { x: car.x + cosA * halfL + sinA * halfW, y: car.y + sinA * halfL - cosA * halfW }, // Front-Right
    { x: car.x - cosA * halfL + sinA * halfW, y: car.y - sinA * halfL - cosA * halfW }, // Rear-Right
    { x: car.x - cosA * halfL - sinA * halfW, y: car.y - sinA * halfL + cosA * halfW }  // Rear-Left
  ];
}

function isPointInsideCar(px: number, py: number, car: Vehicle): boolean {
  const dx = px - car.x;
  const dy = py - car.y;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  const localX = dx * cosA + dy * sinA;
  const localY = -dx * sinA + dy * cosA;
  const halfL = car.length / 2 + 1.5;
  const halfW = car.width / 2 + 1.5;
  return Math.abs(localX) <= halfL && Math.abs(localY) <= halfW;
}

export function checkVehicleVehicleCollision(carA: Vehicle, carB: Vehicle): VehicleCollisionResult {
  const halfLA = carA.length / 2 + 1.0;
  const halfWA = carA.width / 2 + 1.0;
  const halfLB = carB.length / 2 + 1.0;
  const halfWB = carB.width / 2 + 1.0;

  // Broadphase bounding radius check
  const radA = Math.hypot(halfLA, halfWA);
  const radB = Math.hypot(halfLB, halfWB);
  const cdx = carB.x - carA.x;
  const cdy = carB.y - carA.y;
  const distSq = cdx * cdx + cdy * cdy;

  if (distSq > (radA + radB) * (radA + radB)) {
    return { collided: false, normalX: 0, normalY: 0, overlap: 0, contactX: 0, contactY: 0 };
  }

  // Exact OBB SAT Narrowphase
  const cornersA = getCarCorners(carA, 1.0);
  const cornersB = getCarCorners(carB, 1.0);

  const cosA = Math.cos(carA.angle);
  const sinA = Math.sin(carA.angle);
  const cosB = Math.cos(carB.angle);
  const sinB = Math.sin(carB.angle);

  const testAxes = [
    { x: cosA, y: sinA },   // Car A longitudinal
    { x: -sinA, y: cosA },  // Car A lateral
    { x: cosB, y: sinB },   // Car B longitudinal
    { x: -sinB, y: cosB }   // Car B lateral
  ];

  let minOverlap = 999999;
  let smallestAxisX = 0;
  let smallestAxisY = 0;

  for (const axis of testAxes) {
    let minA = 999999;
    let maxA = -999999;
    for (const p of cornersA) {
      const proj = p.x * axis.x + p.y * axis.y;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }

    let minB = 999999;
    let maxB = -999999;
    for (const p of cornersB) {
      const proj = p.x * axis.x + p.y * axis.y;
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }

    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap <= 0) {
      return { collided: false, normalX: 0, normalY: 0, overlap: 0, contactX: 0, contactY: 0 };
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      smallestAxisX = axis.x;
      smallestAxisY = axis.y;
    }
  }

  // Ensure normal points from Car A to Car B
  const centerDir = cdx * smallestAxisX + cdy * smallestAxisY;
  if (centerDir < 0) {
    smallestAxisX = -smallestAxisX;
    smallestAxisY = -smallestAxisY;
  }

  // Find contact point (deepest penetrating vertices)
  let contactX = 0;
  let contactY = 0;
  let count = 0;

  for (const p of cornersA) {
    if (isPointInsideCar(p.x, p.y, carB)) {
      contactX += p.x;
      contactY += p.y;
      count++;
    }
  }
  for (const p of cornersB) {
    if (isPointInsideCar(p.x, p.y, carA)) {
      contactX += p.x;
      contactY += p.y;
      count++;
    }
  }

  if (count > 0) {
    contactX /= count;
    contactY /= count;
  } else {
    contactX = (carA.x + carB.x) / 2;
    contactY = (carA.y + carB.y) / 2;
  }

  return {
    collided: true,
    normalX: smallestAxisX,
    normalY: smallestAxisY,
    overlap: minOverlap,
    contactX,
    contactY
  };
}

// --- DYNAMIC DAMAGE & DEFORMATION APPLICATION ---
export function applyVehicleDamageAndDeformation(
  car: Vehicle,
  contactX: number,
  contactY: number,
  impactSpeed: number,
  scrapeSpeed: number,
  world: GameWorld
) {
  if (!car.damage) {
    car.damage = {
      health: 100,
      frontCrumple: 0,
      rearCrumple: 0,
      leftDent: 0,
      rightDent: 0,
      frontLeftDent: 0,
      frontRightDent: 0,
      rearLeftDent: 0,
      rearRightDent: 0,
      hoodBuckled: false,
      windshieldCracked: false,
      rearGlassCracked: false,
      leftHeadlightBroken: false,
      rightHeadlightBroken: false,
      leftTaillightBroken: false,
      rightTaillightBroken: false,
      engineSmoking: false,
      engineFire: false,
      scratches: []
    };
  }

  const now = performance.now() / 1000;

  // Real-world automobile safety threshold: Modern polyurethane/foam bumpers absorb low-speed impacts
  // (< 52 px/s ~ 18 km/h / 11 mph) completely without structural metal crumple, health loss, or vertex deformation.
  if (impactSpeed < 52 && scrapeSpeed < 45) {
    // At low bumper contact speeds, only allow minor surface paint scuffs if actively scraping
    if (scrapeSpeed > 24 && car.damage.scratches.length < 10) {
      const dx = contactX - car.x;
      const dy = contactY - car.y;
      const cosA = Math.cos(car.angle);
      const sinA = Math.sin(car.angle);
      const localX = dx * cosA + dy * sinA;
      const localY = -dx * sinA + dy * cosA;
      const halfL = car.length / 2;
      const halfW = car.width / 2;
      car.damage.scratches.push({
        x: Math.max(-halfL + 2, Math.min(halfL - 2, localX)),
        y: Math.max(-halfW + 1, Math.min(halfW - 1, localY)),
        length: 3 + Math.random() * 6,
        angle: (Math.random() - 0.5) * 0.4,
        depth: 0.1
      });
    }
    return;
  }

  // Damage Cooldown Protection (prevents 60-frame per second continuous damage stacking during sustained contact)
  if (car.lastDamageTime && now - car.lastDamageTime < 0.4) {
    return;
  }
  car.lastDamageTime = now;

  const dmg = car.damage;
  const halfL = car.length / 2;
  const halfW = car.width / 2;

  // Local coordinates relative to car center & heading
  const dx = contactX - car.x;
  const dy = contactY - car.y;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  const localX = dx * cosA + dy * sinA;  // +halfL = front, -halfL = rear
  const localY = -dx * sinA + dy * cosA; // -halfW = left, +halfW = right

  const normX = Math.max(-1, Math.min(1, localX / halfL));
  const normY = Math.max(-1, Math.min(1, localY / halfW));

  // Realistic Impact Severity calculation (0 to 1 scale starting at real crash speeds > 52 px/s ~18 km/h)
  const severity = Math.min(1.0, Math.max(0, impactSpeed - 50) / 130);

  // 1. Realistic Health Deduction (Scaled realistically, requiring significant speed/force for substantial damage)
  const healthLoss = severity * (1.5 + severity * 7.0);
  dmg.health = Math.max(0, dmg.health - healthLoss);

  // 2. Localized Dynamic Vertex Deformation (Requires > 65 px/s ~ 24 km/h crash)
  if (dmg.deformedVertices && impactSpeed > 65) {
    const pushStrength = Math.min(7.0, (impactSpeed / 130) * 6.0);
    const dentRadius = 18;
    
    for (const v of dmg.deformedVertices) {
      const curX = v.localX + v.offsetX;
      const curY = v.localY + v.offsetY;
      const dist = Math.hypot(curX - localX, curY - localY);
      
      if (dist < dentRadius) {
        const falloff = (dentRadius - dist) / dentRadius;
        const len = Math.hypot(v.localX, v.localY);
        if (len > 0.001) {
          const dirX = -v.localX / len;
          const dirY = -v.localY / len;
          const maxDent = len * 0.35;
          const currentOffsetLen = Math.hypot(v.offsetX + dirX * pushStrength * falloff, v.offsetY + dirY * pushStrength * falloff);
          
          if (currentOffsetLen < maxDent) {
            v.offsetX += dirX * pushStrength * falloff;
            v.offsetY += dirY * pushStrength * falloff;
          }
        }
      }
    }
  }

  // 3. Structural crumple & component damage logic (Requires real crash speed > 60 px/s ~ 22 km/h)
  if (normX > 0.3 && impactSpeed > 60) {
    // --- FRONTAL COLLISION ---
    const crushAmount = severity * (1.5 + severity * 3.5);
    dmg.frontCrumple = Math.min(15, dmg.frontCrumple + crushAmount);

    if (normY < -0.25) {
      dmg.frontLeftDent = Math.min(10, dmg.frontLeftDent + crushAmount * 0.8);
      if (severity > 0.4) dmg.leftHeadlightBroken = true;
    } else if (normY > 0.25) {
      dmg.frontRightDent = Math.min(10, dmg.frontRightDent + crushAmount * 0.8);
      if (severity > 0.4) dmg.rightHeadlightBroken = true;
    } else {
      dmg.frontLeftDent = Math.min(8, dmg.frontLeftDent + crushAmount * 0.5);
      dmg.frontRightDent = Math.min(8, dmg.frontRightDent + crushAmount * 0.5);
      if (severity > 0.5) {
        dmg.leftHeadlightBroken = true;
        dmg.rightHeadlightBroken = true;
      }
    }

    if (severity > 0.5 || dmg.frontCrumple > 8) {
      dmg.hoodBuckled = true;
    }
    if (severity > 0.7 || dmg.frontCrumple > 11) {
      dmg.windshieldCracked = true;
    }
  } else if (normX < -0.3 && impactSpeed > 60) {
    // --- REAR IMPACT ---
    const rearCrush = severity * (1.5 + severity * 3.5);
    dmg.rearCrumple = Math.min(12, dmg.rearCrumple + rearCrush);

    if (normY < -0.25) {
      dmg.rearLeftDent = Math.min(8, dmg.rearLeftDent + rearCrush * 0.8);
      if (severity > 0.45) dmg.leftTaillightBroken = true;
    } else if (normY > 0.25) {
      dmg.rearRightDent = Math.min(8, dmg.rearRightDent + rearCrush * 0.8);
      if (severity > 0.45) dmg.rightTaillightBroken = true;
    } else {
      if (severity > 0.55) {
        dmg.leftTaillightBroken = true;
        dmg.rightTaillightBroken = true;
      }
    }

    if (severity > 0.65) {
      dmg.rearGlassCracked = true;
    }
  } else if (impactSpeed > 60) {
    // --- SIDE IMPACT / T-BONE ---
    const sideDent = severity * (1.5 + severity * 3.5);
    if (normY < 0) {
      dmg.leftDent = Math.min(8, dmg.leftDent + sideDent);
    } else {
      dmg.rightDent = Math.min(8, dmg.rightDent + sideDent);
    }
    if (severity > 0.6) {
      dmg.windshieldCracked = true;
    }
  }

  // 4. Engine smoke & fire conditions based on real life engine mechanics
  // Engine Smoke = Radiator punctured or steam leaking in severe frontal compression
  if ((dmg.health < 28 && dmg.frontCrumple > 7) || dmg.health < 15) {
    dmg.engineSmoking = true;
  }
  // Engine Fire = Extreme fuel line breach or engine bay destruction in violent high-speed crashes
  if (dmg.health <= 0 || (dmg.health < 8 && dmg.frontCrumple > 11 && impactSpeed > 110 && Math.random() < 0.2)) {
    dmg.engineFire = true;
  }

  // 5. Scrapes & Paint Scuffs
  if (scrapeSpeed > 20 || impactSpeed > 25) {
    if (dmg.scratches.length < 14) {
      dmg.scratches.push({
        x: Math.max(-halfL + 2, Math.min(halfL - 2, localX)),
        y: Math.max(-halfW + 1, Math.min(halfW - 1, localY)),
        length: 4 + Math.random() * 10,
        angle: (Math.random() - 0.5) * 0.5,
        depth: Math.min(1.0, (impactSpeed + scrapeSpeed) / 100)
      });
    }
  }

  // 6. Particle Emission on High-Speed Crash (Sparks, Glass shards, Debris)
  if (impactSpeed > 35) {
    const sparkCount = Math.floor(3 + severity * 8);
    for (let s = 0; s < sparkCount; s++) {
      world.particles.push({
        x: contactX + (Math.random() * 8 - 4),
        y: contactY + (Math.random() * 8 - 4),
        vx: (Math.random() * 120 - 60),
        vy: (Math.random() * 120 - 60),
        radius: 1.5 + Math.random() * 1.5,
        color: '#fbbf24',
        alpha: 0.95,
        life: 0,
        maxLife: 0.2 + Math.random() * 0.15,
        type: 'spark'
      });
    }

    if (severity > 0.45 || dmg.windshieldCracked || dmg.leftHeadlightBroken || dmg.rightHeadlightBroken) {
      const glassCount = Math.floor(5 + severity * 10);
      for (let g = 0; g < glassCount; g++) {
        world.particles.push({
          x: contactX + (Math.random() * 6 - 3),
          y: contactY + (Math.random() * 6 - 3),
          vx: (Math.random() * 90 - 45),
          vy: (Math.random() * 90 - 45),
          radius: 1.5 + Math.random() * 2.0,
          color: '#bae6fd',
          alpha: 0.85,
          life: 0,
          maxLife: 0.4 + Math.random() * 0.25,
          type: 'glass_shard'
        });
      }
    }

    if (severity > 0.35) {
      const debrisCount = Math.floor(2 + severity * 4);
      for (let d = 0; d < debrisCount; d++) {
        world.particles.push({
          x: contactX + (Math.random() * 6 - 3),
          y: contactY + (Math.random() * 6 - 3),
          vx: (Math.random() * 70 - 35),
          vy: (Math.random() * 70 - 35),
          radius: 2 + Math.random() * 2.5,
          color: Math.random() > 0.5 ? car.color : '#334155',
          alpha: 0.9,
          life: 0,
          maxLife: 0.45 + Math.random() * 0.35,
          type: 'debris'
        });
      }
    }
  }
}

export function updatePlayerPedestrianPhysics(
  player: Player,
  input: InputState,
  buildings: Building[],
  dt: number,
  cameraAngle: number = 0,
  worldWidth: number = 8000,
  worldHeight: number = 8000
) {
  if (player.isInVehicle) return;

  let moveX = 0;
  let moveY = 0;
  if (input.forward) moveY -= 1;
  if (input.backward) moveY += 1;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;

  const len = Math.hypot(moveX, moveY);
  const baseSpeed = input.sprint ? 140 : 80;

  if (len > 0.01) {
    moveX /= len;
    moveY /= len;
    
    // Convert screen WASD vector to world coordinates based on camera angle
    const moveAngle = cameraAngle + Math.PI / 2;
    const cosM = Math.cos(moveAngle);
    const sinM = Math.sin(moveAngle);
    const worldMoveX = moveX * cosM - moveY * sinM;
    const worldMoveY = moveX * sinM + moveY * cosM;

    player.vx = worldMoveX * baseSpeed;
    player.vy = worldMoveY * baseSpeed;
    player.angle = Math.atan2(worldMoveY, worldMoveX);
    player.walkCycle += dt * (input.sprint ? 16 : 9);
    player.speed = baseSpeed;
  } else {
    player.vx *= 0.75;
    player.vy *= 0.75;
    player.speed = Math.hypot(player.vx, player.vy);
  }

  let newX = player.x + player.vx * dt;
  let newY = player.y + player.vy * dt;

  // Collision with buildings
  const pedRadius = 7.0;
  for (const bld of buildings) {
    if (newX + pedRadius > bld.x && newX - pedRadius < bld.x + bld.width &&
        newY + pedRadius > bld.y && newY - pedRadius < bld.y + bld.height) {
      const res = checkPedestrianBuildingCollision(newX, newY, pedRadius, bld);
      newX = res.x;
      newY = res.y;
    }
  }

  // World bounds clamp (full world size)
  player.x = Math.max(20, Math.min(worldWidth - 20, newX));
  player.y = Math.max(20, Math.min(worldHeight - 20, newY));
}

export function updateVehiclePhysics(
  vehicle: Vehicle,
  input: InputState | null,
  world: GameWorld,
  nearbyBuildings: Building[],
  nearbyVehicles: Vehicle[],
  dt: number
) {
  const cfg = CAR_CONFIGS[vehicle.type] || CAR_CONFIGS.sedan;

  if (vehicle.isPlayerControlled && input) {
    // --- REALISTIC PROGRESSIVE STEERING MODEL ---
    // Speed-sensitive steering: at higher speeds, steering angle is capped for stability
    const speedRatio = Math.abs(vehicle.speed) / cfg.maxSpeed;
    const speedSteerDamping = 1 / (1 + Math.pow(speedRatio * 1.5, 1.4));
    const dynamicMaxSteer = Math.max(cfg.minSteerAngle, cfg.maxSteerAngle * speedSteerDamping);

    // Target steering angle from input
    let desiredSteer = 0;
    if (input.left) {
      desiredSteer = -dynamicMaxSteer;
    } else if (input.right) {
      desiredSteer = dynamicMaxSteer;
    }

    // Natural steering rack with smooth return-to-center
    if (input.left || input.right) {
      vehicle.steerAngle += (desiredSteer - vehicle.steerAngle) * Math.min(1.0, cfg.turnSpeed * 2.2 * dt);
    } else {
      // Smooth automatic centering
      vehicle.steerAngle *= Math.max(0, 1 - 8.0 * dt);
      if (Math.abs(vehicle.steerAngle) < 0.005) vehicle.steerAngle = 0;
    }

    // Acceleration & Braking with progressive throttle
    const isHandbraking = input.handbrake;
    let engineAccel = 0;

    if (input.forward) {
      if (vehicle.speed < -10) {
        // Active braking while reversing
        engineAccel = cfg.brakingForce;
        vehicle.brakeLightsOn = true;
        vehicle.isReversing = true;
      } else {
        // Progressive forward acceleration curve
        const powerFactor = Math.max(0.25, 1 - (vehicle.speed / cfg.maxSpeed) * 0.75);
        engineAccel = cfg.acceleration * powerFactor;
        vehicle.brakeLightsOn = false;
        vehicle.isReversing = false;
      }
    } else if (input.backward) {
      if (vehicle.speed > 10) {
        // Active braking while moving forward
        engineAccel = -cfg.brakingForce;
        vehicle.brakeLightsOn = true;
        vehicle.isReversing = false;
      } else {
        // Reverse gear
        const powerFactor = Math.max(0.35, 1 - (Math.abs(vehicle.speed) / cfg.reverseMaxSpeed) * 0.6);
        engineAccel = -cfg.acceleration * 0.7 * powerFactor;
        vehicle.brakeLightsOn = false;
        vehicle.isReversing = true;
      }
    } else {
      vehicle.brakeLightsOn = false;
      vehicle.isReversing = vehicle.speed < -2;
      // Natural rolling resistance and coasting
      const rollingResistance = isHandbraking ? cfg.brakingForce * 0.85 : 42;
      engineAccel = -Math.sign(vehicle.speed) * rollingResistance;
    }

    if (isHandbraking) {
      vehicle.brakeLightsOn = true;
    }

    // Horn
    if (input.hornH) {
      if (!vehicle.isHonking) {
        vehicle.isHonking = true;
        sound.playHorn();
      }
      vehicle.hornEffectTimer = 0.2;
    } else {
      if (vehicle.isHonking) {
        vehicle.isHonking = false;
        sound.stopHorn();
      }
    }

    // Apply engine acceleration
    vehicle.speed += engineAccel * dt;

    // Hard speed limits
    if (vehicle.speed > cfg.maxSpeed) vehicle.speed = cfg.maxSpeed;
    if (vehicle.speed < -cfg.reverseMaxSpeed) vehicle.speed = -cfg.reverseMaxSpeed;
    if (Math.abs(vehicle.speed) < 2 && !input.forward && !input.backward) {
      vehicle.speed = 0;
    }

    // Bicycle Model with Lateral Slip & Drift
    const headingCos = Math.cos(vehicle.angle);
    const headingSin = Math.sin(vehicle.angle);

    // Current forward & lateral speeds
    const currentForwardSpeed = vehicle.vx * headingCos + vehicle.vy * headingSin;
    const currentLateralSpeed = -vehicle.vx * headingSin + vehicle.vy * headingCos;

    // Lateral grip friction
    const currentGrip = isHandbraking ? cfg.driftGrip : cfg.grip;
    const lateralDamping = Math.pow(1 - currentGrip, dt * 12);
    const newLateralSpeed = currentLateralSpeed * lateralDamping;
    vehicle.lateralVelocity = newLateralSpeed;

    // Angular rotation from front wheel steer angle
    const turnRadius = cfg.wheelBase / Math.max(0.001, Math.sin(Math.abs(vehicle.steerAngle)));
    const angularSpeed = (vehicle.speed / turnRadius) * Math.sign(vehicle.steerAngle);

    // Smooth yaw rotation
    vehicle.angularVelocity = angularSpeed;
    vehicle.angle += vehicle.angularVelocity * dt;

    // Velocity vector in world coordinates
    const newHeadingCos = Math.cos(vehicle.angle);
    const newHeadingSin = Math.sin(vehicle.angle);

    vehicle.vx = newHeadingCos * vehicle.speed - newHeadingSin * newLateralSpeed;
    vehicle.vy = newHeadingSin * vehicle.speed + newHeadingCos * newLateralSpeed;

    // Drift Detection & Skidmarks
    const lateralSlip = Math.abs(currentLateralSpeed);
    vehicle.isDrifting = (isHandbraking && Math.abs(vehicle.speed) > 35) || 
                         (lateralSlip > 55 && Math.abs(vehicle.speed) > 75);

    if (vehicle.isDrifting) {
      sound.startTireScreech(Math.min(1.0, lateralSlip / 100));

      const rearAxleDist = cfg.length * 0.38;
      const trackHalf = cfg.width * 0.42;
      const leftTireX = vehicle.x - newHeadingCos * rearAxleDist - newHeadingSin * trackHalf;
      const leftTireY = vehicle.y - newHeadingSin * rearAxleDist + newHeadingCos * trackHalf;
      const rightTireX = vehicle.x - newHeadingCos * rearAxleDist + newHeadingSin * trackHalf;
      const rightTireY = vehicle.y - newHeadingSin * rearAxleDist - newHeadingCos * trackHalf;

      world.skidMarks.push({
        x1: leftTireX,
        y1: leftTireY,
        x2: leftTireX - vehicle.vx * dt * 0.9,
        y2: leftTireY - vehicle.vy * dt * 0.9,
        alpha: Math.min(0.65, lateralSlip / 100),
        color: '#111827',
        width: 3.5
      });

      world.skidMarks.push({
        x1: rightTireX,
        y1: rightTireY,
        x2: rightTireX - vehicle.vx * dt * 0.9,
        y2: rightTireY - vehicle.vy * dt * 0.9,
        alpha: Math.min(0.65, lateralSlip / 100),
        color: '#111827',
        width: 3.5
      });

      if (Math.random() > 0.45) {
        world.particles.push({
          x: leftTireX + (Math.random() * 6 - 3),
          y: leftTireY + (Math.random() * 6 - 3),
          vx: (Math.random() * 20 - 10),
          vy: (Math.random() * 20 - 10),
          radius: 4 + Math.random() * 5,
          color: '#e2e8f0',
          alpha: 0.5,
          life: 0,
          maxLife: 0.5,
          type: 'tire_smoke'
        });
      }
    } else {
      sound.stopTireScreech();
    }

    sound.updateEngine(speedRatio, input.forward);

  } else {
    // --- NPC AI VEHICLE OR PARKED CAR PHYSICS ---
    if (vehicle.isParked) {
      vehicle.vx = 0;
      vehicle.vy = 0;
      vehicle.speed = 0;
      return;
    }

    // Smooth, gentle acceleration and polite braking for AI
    const accelRate = 90; // px/s^2 (no rapid jerking or shoving)
    const brakeRate = 180; // px/s^2

    if (vehicle.aiState === 'reversing') {
      // Smoothly reverse
      if (vehicle.speed > vehicle.targetSpeed) {
        vehicle.speed = Math.max(vehicle.targetSpeed, vehicle.speed - accelRate * 1.2 * dt);
      } else {
        vehicle.speed = Math.min(vehicle.targetSpeed, vehicle.speed + accelRate * dt);
      }
      vehicle.brakeLightsOn = false;
      vehicle.isReversing = true;
    } else {
      vehicle.isReversing = vehicle.speed < -2;
      if (vehicle.speed < vehicle.targetSpeed) {
        vehicle.speed = Math.min(vehicle.targetSpeed, vehicle.speed + accelRate * dt);
        vehicle.brakeLightsOn = false;
      } else if (vehicle.speed > vehicle.targetSpeed) {
        vehicle.speed = Math.max(vehicle.targetSpeed, vehicle.speed - brakeRate * dt);
        vehicle.brakeLightsOn = (vehicle.speed - vehicle.targetSpeed > 10) || (vehicle.targetSpeed < 5);
      } else {
        vehicle.brakeLightsOn = false;
      }
    }

    vehicle.vx = Math.cos(vehicle.angle) * vehicle.speed;
    vehicle.vy = Math.sin(vehicle.angle) * vehicle.speed;
  }

  // Update position
  vehicle.x += vehicle.vx * dt;
  vehicle.y += vehicle.vy * dt;

  // --- VEHICLE-TO-VEHICLE COLLISION RESOLUTION ---
  for (const other of nearbyVehicles) {
    if (other.id === vehicle.id) continue;

    const isPlayerInvolved = vehicle.isPlayerControlled || other.isPlayerControlled;
    
    // If AI-to-AI and either car is in anti-deadlock ghosting mode, allow smooth glide-through
    if (!isPlayerInvolved) {
      if ((vehicle.ghostingAlpha !== undefined && vehicle.ghostingAlpha < 0.9) ||
          (other.ghostingAlpha !== undefined && other.ghostingAlpha < 0.9)) {
        continue;
      }
    }

    const col = checkVehicleVehicleCollision(vehicle, other);
    if (col.collided) {
      // Calculate mass-based separation
      const totalMass = vehicle.mass + other.mass;
      const ratioSelf = other.mass / totalMass;
      const ratioOther = vehicle.mass / totalMass;

      if (isPlayerInvolved) {
        // Player involved: full physics impulse, separation, deformation, and torque
        const sepPush = 1.02;
        vehicle.x -= col.normalX * col.overlap * ratioSelf * sepPush;
        vehicle.y -= col.normalY * col.overlap * ratioSelf * sepPush;
        other.x += col.normalX * col.overlap * ratioOther * sepPush;
        other.y += col.normalY * col.overlap * ratioOther * sepPush;

        const relVx = other.vx - vehicle.vx;
        const relVy = other.vy - vehicle.vy;
        const velAlongNormal = relVx * col.normalX + relVy * col.normalY;

        if (velAlongNormal < 0) {
          const restitution = 0.22;
          const impulseMagnitude = -(1 + restitution) * velAlongNormal / (1 / vehicle.mass + 1 / other.mass);
          const impulseX = impulseMagnitude * col.normalX;
          const impulseY = impulseMagnitude * col.normalY;

          vehicle.vx -= impulseX / vehicle.mass;
          vehicle.vy -= impulseY / vehicle.mass;
          other.vx += impulseX / other.mass;
          other.vy += impulseY / other.mass;

          if (vehicle.isPlayerControlled) {
            vehicle.speed = Math.hypot(vehicle.vx, vehicle.vy) * Math.sign(vehicle.speed || 1);
          } else {
            vehicle.speed = Math.max(-20, Math.min(vehicle.speed * 0.5, 40));
          }

          if (other.isPlayerControlled) {
            other.speed = Math.hypot(other.vx, other.vy) * Math.sign(other.speed || 1);
          } else {
            other.speed = Math.max(-20, Math.min(other.speed * 0.5, 40));
          }

          const impactSpeed = Math.abs(velAlongNormal);
          const scrapeSpeed = Math.abs(relVx * -col.normalY + relVy * col.normalX);

          applyVehicleDamageAndDeformation(vehicle, col.contactX, col.contactY, impactSpeed, scrapeSpeed, world);
          applyVehicleDamageAndDeformation(other, col.contactX, col.contactY, impactSpeed, scrapeSpeed, world);

          const rxVehicle = col.contactX - vehicle.x;
          const ryVehicle = col.contactY - vehicle.y;
          const rawTorqueV = (rxVehicle * impulseY - ryVehicle * impulseX);
          const torqueV = Math.max(-1.5, Math.min(1.5, rawTorqueV / (vehicle.mass * 250)));
          vehicle.angularVelocity = (vehicle.angularVelocity || 0) * 0.3 + torqueV;
          vehicle.angle += vehicle.angularVelocity * dt * 0.3;

          const rxOther = col.contactX - other.x;
          const ryOther = col.contactY - other.y;
          const rawTorqueO = -(rxOther * impulseY - ryOther * impulseX);
          const torqueO = Math.max(-1.5, Math.min(1.5, rawTorqueO / (other.mass * 250)));
          other.angularVelocity = (other.angularVelocity || 0) * 0.3 + torqueO;
          other.angle += other.angularVelocity * dt * 0.3;

          const impactIntensity = Math.min(1.0, impactSpeed / 160);
          if (impactIntensity > 0.1) {
            sound.playCollision(impactIntensity);
          }
        }
      } else {
        // AI-to-AI Collision: Lane-Discipline Preserving Separation
        // Prevent cars from shoving each other lateral across lane boundaries into 3-abreast jams!
        const headingCos = Math.cos(vehicle.angle);
        const headingSin = Math.sin(vehicle.angle);

        // Decompose normal into longitudinal and lateral components relative to lane heading
        const dotLong = col.normalX * headingCos + col.normalY * headingSin;
        const dotLat = col.normalX * -headingSin + col.normalY * headingCos;

        // Bounded lateral push (max 1.5px per tick) to prevent shoving into adjacent lanes
        const latClamp = Math.max(-1.5, Math.min(1.5, dotLat * col.overlap));
        const longPush = dotLong * col.overlap * 0.95;

        const pushX = (headingCos * longPush - headingSin * latClamp) * ratioSelf;
        const pushY = (headingSin * longPush + headingCos * latClamp) * ratioSelf;

        vehicle.x -= pushX;
        vehicle.y -= pushY;
        other.x += pushX * (ratioOther / ratioSelf);
        other.y += pushY * (ratioOther / ratioSelf);

        // Smoothly adjust AI speeds so trailing car brakes cleanly rather than pushing lead car into intersection
        if (dotLong < -0.3) {
          // vehicle is behind other
          vehicle.speed = Math.max(0, vehicle.speed * 0.85);
        } else if (dotLong > 0.3) {
          // other is behind vehicle
          other.speed = Math.max(0, other.speed * 0.85);
        } else {
          // Side-by-side rubbing: reduce speeds slightly to allow staggered single-file queuing
          vehicle.speed *= 0.92;
          other.speed *= 0.92;
        }

        const relVx = other.vx - vehicle.vx;
        const relVy = other.vy - vehicle.vy;
        const impactSpeed = Math.hypot(relVx, relVy);
        if (impactSpeed > 18) {
          const scrapeSpeed = Math.abs(relVx * -col.normalY + relVy * col.normalX);
          applyVehicleDamageAndDeformation(vehicle, col.contactX, col.contactY, impactSpeed, scrapeSpeed, world);
          applyVehicleDamageAndDeformation(other, col.contactX, col.contactY, impactSpeed, scrapeSpeed, world);
        }
      }
    }
  }

  // --- COLLISION WITH BUILDINGS ---
  for (const bld of nearbyBuildings) {
    // If AI vehicle is ghosting, skip building collision to allow escape
    if (!vehicle.isPlayerControlled && vehicle.ghostingAlpha !== undefined && vehicle.ghostingAlpha < 0.9) {
      continue;
    }

    const col = checkCarBuildingCollision(vehicle, bld);
    if (col.collided) {
      vehicle.x += col.normalX * (col.depth + 1.5);
      vehicle.y += col.normalY * (col.depth + 1.5);

      const impactSpeed = Math.hypot(vehicle.vx, vehicle.vy);

      vehicle.speed *= -0.2;
      vehicle.vx *= 0.2;
      vehicle.vy *= 0.2;

      // Contact point on the car shell facing the building (opposite to the separation normal)
      const contactX = vehicle.x - col.normalX * (vehicle.length / 2);
      const contactY = vehicle.y - col.normalY * (vehicle.width / 2);

      applyVehicleDamageAndDeformation(vehicle, contactX, contactY, impactSpeed, 10, world);

      if (vehicle.isPlayerControlled) {
        sound.playCollision(Math.min(1.0, impactSpeed / 120));
      } else {
        // For AI cars: Trigger smart reverse recovery turning away from building
        if (vehicle.aiState === 'reversing') {
          // If already reversing and rear bumped a building, complete reverse early
          vehicle.reverseTimer = 0;
        } else {
          vehicle.aiState = 'reversing';
          vehicle.reverseTimer = 1.2;
          vehicle.recoveryTargetAngle = vehicle.angle;
          vehicle.recoverySteer = 0;
          vehicle.speed = -35;
          vehicle.ghostingAlpha = 0.5; // Allow ghosting to avoid re-triggering collision
        }
      }
    }
  }

  // World bounds clamp (safe outer margin)
  vehicle.x = Math.max(15, Math.min(world.width - 15, vehicle.x));
  vehicle.y = Math.max(15, Math.min(world.height - 15, vehicle.y));
}

export function updateSkidMarksAndParticles(world: GameWorld, dt: number) {
  // Skid marks fade
  for (let i = world.skidMarks.length - 1; i >= 0; i--) {
    const sm = world.skidMarks[i];
    sm.alpha -= dt * 0.015;
    if (sm.alpha <= 0.01) {
      world.skidMarks.splice(i, 1);
    }
  }

  if (world.skidMarks.length > 500) {
    world.skidMarks.splice(0, world.skidMarks.length - 500);
  }

  // Spawn smoke/steam/flame for damaged vehicles
  for (const car of world.vehicles) {
    if (car.damage && (car.damage.engineSmoking || car.damage.engineFire)) {
      if (Math.random() < 0.4) {
        const cosA = Math.cos(car.angle);
        const sinA = Math.sin(car.angle);
        const hoodX = car.x + cosA * (car.length * 0.35);
        const hoodY = car.y + sinA * (car.length * 0.35);

        world.particles.push({
          x: hoodX + (Math.random() * 6 - 3),
          y: hoodY + (Math.random() * 6 - 3),
          vx: -cosA * 15 + (Math.random() * 20 - 10),
          vy: -sinA * 15 + (Math.random() * 20 - 10),
          radius: 3 + Math.random() * 4,
          color: car.damage.engineFire && Math.random() < 0.4 ? '#ef4444' : '#64748b',
          alpha: 0.65,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.4,
          type: car.damage.engineFire && Math.random() < 0.4 ? 'flame' : 'engine_smoke'
        });
      }
    }
  }

  // Particles
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const p = world.particles[i];
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === 'tire_smoke' || p.type === 'engine_smoke' || p.type === 'exhaust' || p.type === 'water_fountain' || p.type === 'water_splash') {
      p.radius += dt * 5;
    }
    p.alpha = Math.max(0, 1 - (p.life / p.maxLife));

    if (p.life >= p.maxLife) {
      world.particles.splice(i, 1);
    }
  }
}

export function updateBreakablePropsAndLivingWorld(world: GameWorld, player: Player, dt: number) {
  const isRaining = world.weather === 'rain' || world.weather === 'storm';

  // 1. UPDATE BREAKABLE PROPS & WATER FOUNTAINS
  for (const prop of world.props) {
    if (prop.isBroken) {
      // Move detached prop with physics friction
      if (prop.breakVX || prop.breakVY) {
        prop.x += (prop.breakVX || 0) * dt;
        prop.y += (prop.breakVY || 0) * dt;
        prop.angle += (prop.breakSpin || 0) * dt;
        prop.breakVX = (prop.breakVX || 0) * (1 - dt * 3);
        prop.breakVY = (prop.breakVY || 0) * (1 - dt * 3);
        prop.breakSpin = (prop.breakSpin || 0) * (1 - dt * 3);
      }

      // Hydrant Water Fountain Spray (Shoots UPWARD into the air)
      if (prop.type === 'hydrant' && (prop.waterFountainTimer ?? 0) > 0) {
        prop.waterFountainTimer = (prop.waterFountainTimer ?? 35) - dt;
        if (Math.random() < 0.85) {
          const fountainSpeed = 180 + Math.random() * 100;
          const fountainAngle = -Math.PI / 2 + (Math.random() * 0.3 - 0.15); // Upward cone (-90 deg)
          world.particles.push({
            x: prop.x + (Math.random() * 4 - 2),
            y: prop.y - 4,
            vx: Math.cos(fountainAngle) * fountainSpeed * 0.3,
            vy: Math.sin(fountainAngle) * fountainSpeed, // Strong upward velocity
            radius: 3 + Math.random() * 4,
            color: '#60a5fa',
            alpha: 0.85,
            life: 0,
            maxLife: 0.6 + Math.random() * 0.4,
            type: 'water_fountain'
          });
        }
      }
      continue;
    }

    // Check prop collision against vehicles (using mathematically accurate OBB collision check)
    for (const veh of world.vehicles) {
      if (Math.abs(veh.speed) < 12) continue;

      // Local transformed coordinates relative to vehicle center & rotation
      const dx = prop.x - veh.x;
      const dy = prop.y - veh.y;
      const cosA = Math.cos(veh.angle);
      const sinA = Math.sin(veh.angle);

      const localX = dx * cosA + dy * sinA;
      const localY = -dx * sinA + dy * cosA;

      const halfL = veh.length / 2;
      const halfW = veh.width / 2;

      // Define a custom physical radius/buffer for each prop type to determine collision intersection
      let propRadius = 3.0;
      if (prop.type === 'bench') propRadius = 5.0;
      else if (prop.type === 'kiosk') propRadius = 12.0;
      else if (prop.type === 'mailbox') propRadius = 4.5;
      else if (prop.type === 'cone') propRadius = 2.5;
      else if (prop.type === 'trash_can') propRadius = 4.0;
      else if (prop.type === 'bus_stop') propRadius = 10.0;
      else if (prop.type === 'hydrant') propRadius = 3.5;
      else if (prop.type === 'traffic_light') propRadius = 3.0;
      else if (prop.type === 'lamp') propRadius = 3.0;

      // If the prop's physical footprint overlaps the car's bounding box
      if (Math.abs(localX) <= (halfL + propRadius) && Math.abs(localY) <= (halfW + propRadius)) {
        // Break prop!
        prop.isBroken = true;
        const impactSpeed = Math.max(40, Math.abs(veh.speed));
        prop.breakVX = Math.cos(veh.angle) * impactSpeed * 0.8;
        prop.breakVY = Math.sin(veh.angle) * impactSpeed * 0.8;
        prop.breakSpin = (Math.random() - 0.5) * 10;

        sound.playPropBreak(prop.type);

        if (prop.type === 'hydrant') {
          prop.waterFountainTimer = 35;
          sound.playWaterSpray();
          // Create puddle under hydrant
          world.puddles.push({
            id: `puddle_hydrant_${Date.now()}`,
            x: prop.x,
            y: prop.y,
            radiusX: 25,
            radiusY: 18,
            angle: 0,
            rippleTimer: 0
          });
        }

        // Spawn debris particles
        const particleColor = prop.type === 'hydrant' ? '#ef4444' : (prop.type === 'bench' ? '#b45309' : '#64748b');
        for (let d = 0; d < 8; d++) {
          const dAngle = Math.random() * Math.PI * 2;
          const dSpeed = 40 + Math.random() * 80;
          world.particles.push({
            x: prop.x,
            y: prop.y,
            vx: Math.cos(dAngle) * dSpeed,
            vy: Math.sin(dAngle) * dSpeed,
            radius: 2 + Math.random() * 3,
            color: particleColor,
            alpha: 0.9,
            life: 0,
            maxLife: 0.4 + Math.random() * 0.4,
            type: 'debris'
          });
        }
        break;
      }
    }
  }

  // 2. BIRDS FAUNA PHYSICS & SCARED FLIGHT
  for (const bird of world.birds) {
    if (bird.state === 'ground') {
      // Check proximity to player or any moving car
      let scare = false;
      const distToPlayer = Math.hypot(player.x - bird.x, player.y - bird.y);
      if (distToPlayer < 65) scare = true;

      if (!scare) {
        for (const veh of world.vehicles) {
          if (Math.abs(veh.speed) > 10 && Math.hypot(veh.x - bird.x, veh.y - bird.y) < 80) {
            scare = true;
            break;
          }
        }
      }

      if (scare) {
        bird.state = 'flying';
        const escapeAngle = Math.random() * Math.PI * 2;
        bird.flyVX = Math.cos(escapeAngle) * (80 + Math.random() * 40);
        bird.flyVY = Math.sin(escapeAngle) * (80 + Math.random() * 40) - 30; // fly upward
        sound.playBirdFlap();
      }
    } else {
      // Flying bird dynamics
      bird.x += bird.flyVX * dt;
      bird.y += bird.flyVY * dt;
      bird.altitude = Math.min(120, bird.altitude + dt * 65);
      bird.wingCycle += dt * 24;
      bird.angle = Math.atan2(bird.flyVY, bird.flyVX);

      // Despawn / wrap around bird far off map
      if (bird.x < -100 || bird.x > world.width + 100 || bird.y < -100 || bird.y > world.height + 100) {
        bird.x = player.x + (Math.random() * 600 - 300);
        bird.y = player.y + (Math.random() * 600 - 300);
        bird.state = 'ground';
        bird.altitude = 0;
      }
    }
  }

  // 3. PUDDLE SPLASHES
  for (const puddle of world.puddles) {
    puddle.rippleTimer += dt;
    for (const veh of world.vehicles) {
      if (Math.abs(veh.speed) > 25) {
        if (Math.hypot(veh.x - puddle.x, veh.y - puddle.y) < puddle.radiusX + 10) {
          if (Math.random() < 0.3) {
            world.particles.push({
              x: veh.x + (Math.random() * 12 - 6),
              y: veh.y + (Math.random() * 12 - 6),
              vx: (Math.random() * 60 - 30),
              vy: (Math.random() * 60 - 30),
              radius: 3 + Math.random() * 3,
              color: '#93c5fd',
              alpha: 0.75,
              life: 0,
              maxLife: 0.35,
              type: 'water_splash'
            });
          }
        }
      }
    }
  }

  // 4. LITTER & FLYING PAPER WIND PHYSICS
  if (world.litter) {
    for (const lit of world.litter) {
      lit.x += lit.vx * dt;
      lit.y += lit.vy * dt;
      lit.angle += lit.rotationSpeed * dt;

      // Friction / air resistance
      lit.vx *= (1 - dt * 2.5);
      lit.vy *= (1 - dt * 2.5);
      lit.rotationSpeed *= (1 - dt * 2.0);

      // Check proximity to vehicles to launch paper/newspapers into air (Wind Draft)
      if (lit.type === 'paper' || lit.type === 'newspaper' || lit.type === 'leaf') {
        for (const veh of world.vehicles) {
          if (Math.abs(veh.speed) > 25) {
            const dist = Math.hypot(veh.x - lit.x, veh.y - lit.y);
            if (dist < 60) {
              lit.isAirborne = true;
              lit.airborneTimer = 2.0;
              const blowAngle = veh.angle + (Math.random() * 0.6 - 0.3);
              const blowSpeed = Math.abs(veh.speed) * 0.6 + 30;
              lit.vx = Math.cos(blowAngle) * blowSpeed;
              lit.vy = Math.sin(blowAngle) * blowSpeed - 20; // Fly up
              lit.rotationSpeed = (Math.random() - 0.5) * 8;
              break;
            }
          }
        }
      }

      // Check proximity to pedestrians to kick cups/cans
      if (lit.type === 'cup' || lit.type === 'can') {
        for (const ped of world.pedestrians) {
          const dist = Math.hypot(ped.x - lit.x, ped.y - lit.y);
          if (dist < 14) {
            const kickAngle = ped.angle;
            lit.vx += Math.cos(kickAngle) * 45;
            lit.vy += Math.sin(kickAngle) * 45;
            lit.rotationSpeed += (Math.random() - 0.5) * 12;
            break;
          }
        }
      }

      // Airborne timer & flutter
      if (lit.isAirborne) {
        lit.airborneTimer = (lit.airborneTimer || 0) - dt;
        lit.altitude = Math.min(35, (lit.altitude || 0) + dt * 25);
        if ((lit.airborneTimer || 0) <= 0) {
          lit.isAirborne = false;
        }
      } else {
        lit.altitude = Math.max(0, (lit.altitude || 0) - dt * 30);
      }
    }
  }

  // 5. WIPERS ON VEHICLES
  if (isRaining) {
    for (const veh of world.vehicles) {
      veh.wiperDir = veh.wiperDir || 1;
      veh.wiperAngle = (veh.wiperAngle || 0) + veh.wiperDir * dt * 4;
      if (veh.wiperAngle > 0.8) {
        veh.wiperAngle = 0.8;
        veh.wiperDir = -1;
      } else if (veh.wiperAngle < -0.8) {
        veh.wiperAngle = -0.8;
        veh.wiperDir = 1;
      }
    }
  }

  // 5. STORM LIGHTNING & THUNDER
  if (world.weather === 'storm') {
    if (Math.random() < 0.003) { // Thunder strike chance per frame
      world.lightningFlashTimer = 0.22;
      sound.playThunder();
    }
  }
  if ((world.lightningFlashTimer ?? 0) > 0) {
    world.lightningFlashTimer = (world.lightningFlashTimer ?? 0) - dt;
  }
}

export function getBuildingEntrancePos(bld: Building): { x: number; y: number } {
  if (bld.entranceSide === 'north') {
    return { x: bld.x + bld.width / 2, y: bld.y };
  } else if (bld.entranceSide === 'south') {
    return { x: bld.x + bld.width / 2, y: bld.y + bld.height };
  } else if (bld.entranceSide === 'west') {
    return { x: bld.x, y: bld.y + bld.height / 2 };
  } else if (bld.entranceSide === 'east') {
    return { x: bld.x + bld.width, y: bld.y + bld.height / 2 };
  }
  return { x: bld.x + bld.width / 2, y: bld.y + bld.height / 2 };
}

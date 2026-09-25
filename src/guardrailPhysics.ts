import { GameWorld, GuardrailSegment, Vehicle, Player, Particle } from './types';
import { applyVehicleDamageAndDeformation } from './physics';
import { applyDriverVehicleCrashTrauma } from './bodySystem';
import { isVehicleDisabledOrCrashed } from './aiTraffic';
import { sound } from './audio';

export class GuardrailPhysics {
  /**
   * Updates physical collisions for all vehicles and the player on foot against world guardrails.
   * Provides realistic soft plastic deflection, side-glancing redirection,
   * solid player barrier collisions, and progressive energy absorption by frontal crumple terminals.
   */
  public static updateVehicleGuardrailCollisions(
    world: GameWorld,
    player: Player,
    dt: number
  ): void {
    if (!world.guardrails || world.guardrails.length === 0) {
      return;
    }

    // 1. Player on Foot Solid Collision (Guarantees player cannot walk through guardrails)
    if (player && !player.isInVehicle) {
      this.updatePlayerGuardrailCollisions(world, player);
    }

    // 2. Vehicles Solid Collision
    if (world.vehicles && world.vehicles.length > 0) {
      for (const veh of world.vehicles) {
        const vehSpeed = Math.abs(veh.speed);
        const vehRadius = Math.max(veh.width || 20, veh.length || 38) * 0.55;

        for (const rail of world.guardrails) {
          // Fast AABB bounding check
          const rMinX = Math.min(rail.x1, rail.x2) - vehRadius - 20;
          const rMaxX = Math.max(rail.x1, rail.x2) + vehRadius + 20;
          const rMinY = Math.min(rail.y1, rail.y2) - vehRadius - 20;
          const rMaxY = Math.max(rail.y1, rail.y2) + vehRadius + 20;

          if (veh.x < rMinX || veh.x > rMaxX || veh.y < rMinY || veh.y > rMaxY) {
            continue;
          }

          this.resolveSingleVehicleRailCollision(veh, rail, world, player, dt);
        }
      }
    }
  }

  /**
   * Resolves physical solid collisions for the player on foot against guardrails.
   * Prevents walking or clipping through any guardrail or terminal end cap.
   */
  public static updatePlayerGuardrailCollisions(
    world: GameWorld,
    player: Player
  ): void {
    if (!world.guardrails || world.guardrails.length === 0 || !player || player.isInVehicle) {
      return;
    }

    const playerRadius = 12; // Player physical collision footprint

    for (const rail of world.guardrails) {
      const minX = Math.min(rail.x1, rail.x2) - playerRadius - 20;
      const maxX = Math.max(rail.x1, rail.x2) + playerRadius + 20;
      const minY = Math.min(rail.y1, rail.y2) - playerRadius - 20;
      const maxY = Math.max(rail.y1, rail.y2) + playerRadius + 20;

      if (player.x < minX || player.x > maxX || player.y < minY || player.y > maxY) {
        continue;
      }

      const dx = rail.x2 - rail.x1;
      const dy = rail.y2 - rail.y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1) continue;
      const length = Math.sqrt(lenSq);

      const tx = dx / length;
      const ty = dy / length;
      const nx = -ty;
      const ny = tx;

      const vx = player.x - rail.x1;
      const vy = player.y - rail.y1;

      const proj = vx * tx + vy * ty;
      const t = Math.max(0, Math.min(1, proj / length));

      const closestX = rail.x1 + tx * (t * length);
      const closestY = rail.y1 + ty * (t * length);

      const distVecX = player.x - closestX;
      const distVecY = player.y - closestY;
      const dist = Math.hypot(distVecX, distVecY);

      const effectiveHalfWidth = (rail.width / 2) + playerRadius;

      if (dist < effectiveHalfWidth) {
        const overlap = effectiveHalfWidth - dist;
        const pushNx = dist > 0.001 ? distVecX / dist : nx;
        const pushNy = dist > 0.001 ? distVecY / dist : ny;

        // Push player out of guardrail structure
        player.x += pushNx * overlap;
        player.y += pushNy * overlap;

        // Cancel player velocity pushing into barrier
        const velDotN = (player.vx || 0) * pushNx + (player.vy || 0) * pushNy;
        if (velDotN < 0) {
          player.vx = (player.vx || 0) - pushNx * velDotN;
          player.vy = (player.vy || 0) - pushNy * velDotN;
        }
      }
    }
  }

  private static resolveSingleVehicleRailCollision(
    veh: Vehicle,
    rail: GuardrailSegment,
    world: GameWorld,
    player: Player,
    dt: number
  ): void {
    const dx = rail.x2 - rail.x1;
    const dy = rail.y2 - rail.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1) return;
    const length = Math.sqrt(lenSq);

    // Segment unit tangent and unit normal
    const tx = dx / length;
    const ty = dy / length;
    const nx = -ty;
    const ny = tx;

    // Vector from start to vehicle center
    const vx = veh.x - rail.x1;
    const vy = veh.y - rail.y1;

    // Projection along rail segment (t in 0..1)
    const proj = vx * tx + vy * ty;
    const t = Math.max(0, Math.min(1, proj / length));

    // Closest point on rail
    const closestX = rail.x1 + tx * (t * length);
    const closestY = rail.y1 + ty * (t * length);

    // Distance vector from closest point to vehicle center
    const distVecX = veh.x - closestX;
    const distVecY = veh.y - closestY;
    const dist = Math.hypot(distVecX, distVecY);

    // Dynamic vehicle collision half-width
    const vehAngle = veh.angle || 0;
    const railAngle = Math.atan2(dy, dx);
    const cosA = Math.abs(Math.cos(vehAngle - railAngle));
    const sinA = Math.abs(Math.sin(vehAngle - railAngle));
    const effectiveHalfWidth = (veh.width / 2) * cosA + (veh.length / 2) * sinA * 0.45 + (rail.width / 2);

    if (dist >= effectiveHalfWidth) {
      return; // No collision
    }

    const overlap = effectiveHalfWidth - dist;
    const rawSpeed = Math.hypot(veh.vx, veh.vy) || Math.abs(veh.speed);

    // Determine normal sign (push away from rail centerline)
    let pushNx = dist > 0.001 ? distVecX / dist : nx;
    let pushNy = dist > 0.001 ? distVecY / dist : ny;

    // -----------------------------------------------------------------------
    // MANDATORY SOLID POSITION CORRECTION (Clamps vehicle outside rail / buffer)
    // Guarantees zero clipping or passing through guardrails or sand barrels!
    // -----------------------------------------------------------------------
    veh.x += pushNx * overlap;
    veh.y += pushNy * overlap;

    // Check if collision is near terminal ends (Yellow Sand Barrels / Attenuators)
    const isStartTerminal = proj <= (rail.startAttenuatorLength || 32);
    const isEndTerminal = proj >= length - (rail.endAttenuatorLength || 32);

    // -----------------------------------------------------------------------
    // CASE 1: CRUMPLING METAL TERMINAL HEAD IMPACT (Мнущаяся часть отбойника)
    // -----------------------------------------------------------------------
    if ((isStartTerminal && rail.hasStartAttenuator) || (isEndTerminal && rail.hasEndAttenuator)) {
      const dtSec = Math.min(0.05, Math.max(0.008, dt || 0.016));
      const compRate = Math.min(0.06, (rawSpeed * dtSec) / 20);

      if (isStartTerminal) {
        rail.startAttenuatorCompression = Math.min(1.0, rail.startAttenuatorCompression + compRate);
      } else {
        rail.endAttenuatorCompression = Math.min(1.0, rail.endAttenuatorCompression + compRate);
      }

      // Progressive cushioned energy absorption (slows vehicle smoothly)
      const absorbFactor = 0.72;
      veh.vx *= absorbFactor;
      veh.vy *= absorbFactor;
      veh.speed *= absorbFactor;

      // Vehicle crumple & damage with HIGH trauma mitigation for occupants
      applyVehicleDamageAndDeformation(veh, closestX, closestY, rawSpeed * 0.35, 10, world, 800, true);

      // Driver trauma is drastically reduced compared to concrete walls (only 0.10x trauma multiplier)
      if (player && (veh.isPlayerControlled || (player.isInVehicle && player.currentVehicleId === veh.id))) {
        applyDriverVehicleCrashTrauma(player, rawSpeed * 0.25, 'песчаный буфер отбойника', 0.10, veh);
      }

      // Play plastic barrel & sand impact sound
      if (rawSpeed > 8) {
        sound.playCollision(Math.min(0.8, rawSpeed / 50));
      }

      // Spawn yellow plastic shards and silica sand dust particles
      for (let p = 0; p < 6; p++) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = 12 + Math.random() * 35;
        world.particles.push({
          x: closestX + (Math.random() - 0.5) * 8,
          y: closestY + (Math.random() - 0.5) * 8,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          radius: 1.2 + Math.random() * 2.2,
          color: p % 3 === 0 ? '#facc15' : p % 3 === 1 ? '#fef08a' : '#1e293b',
          alpha: 0.9,
          life: 0,
          maxLife: 0.3 + Math.random() * 0.3,
          type: 'debris',
        });
      }
      return;
    }

    // -----------------------------------------------------------------------
    // CASE 2: SIDE CONTACT / GLANCING BLOW WITH W-BEAM GUARDRAIL (Скольжение по отбойнику)
    // Pure soft plastic redirection along the road corridor - NO RUBBER BOUNCE!
    // -----------------------------------------------------------------------
    const velDotN = veh.vx * pushNx + veh.vy * pushNy;
    const velDotT = veh.vx * tx + veh.vy * ty;

    if (velDotN < 0) {
      // ZERO RESTITUTION: Metal beam deforms and captures vehicle perpendicular momentum!
      const newVelDotN = -velDotN * 0.02;

      // Tangential sliding friction (preserves ~92% of longitudinal momentum along the rail)
      const tangentFriction = 0.92;
      const newTangentVel = velDotT * tangentFriction;

      // Reconstruct velocity vector
      veh.vx = pushNx * newVelDotN + tx * newTangentVel;
      veh.vy = pushNy * newVelDotN + ty * newTangentVel;
      veh.speed = Math.hypot(veh.vx, veh.vy) * Math.sign(newTangentVel || veh.speed || 1);

      // Smooth chassis alignment parallel to guardrail direction
      let targetAngle = railAngle;
      if (velDotT < 0) {
        targetAngle += Math.PI;
      }
      let angleDiff = targetAngle - veh.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      veh.angularVelocity = (veh.angularVelocity || 0) * 0.3;
      veh.angle += angleDiff * 0.12;

      // Apply LOCALIZED plastic deformation (extent in world pixels = 36px (~2m))
      // DENT DIRECTION: ALWAYS bends AWAY from vehicle into ditch/field!
      if (!rail.deformations) rail.deformations = [];
      const dotNormal = distVecX * nx + distVecY * ny;
      const dentMagnitude = Math.min(14, Math.max(3, Math.abs(velDotN) * 0.35));
      const dentOffset = dotNormal > 0 ? -dentMagnitude : +dentMagnitude;

      const railLength = length;
      let merged = false;
      for (const def of rail.deformations) {
        if (Math.abs((def.t - t) * railLength) < 30) {
          def.lateralOffset = def.lateralOffset * 0.5 + dentOffset * 0.5;
          merged = true;
          break;
        }
      }
      if (!merged && rail.deformations.length < 16) {
        rail.deformations.push({
          t: t,
          lateralOffset: dentOffset,
          extent: 36, // Local dent extent in pixels!
        });
      }

      // Mild vehicle body scrape (cosmetic surface scratch)
      applyVehicleDamageAndDeformation(veh, closestX, closestY, Math.abs(velDotN) * 0.2, 6, world, 80, false);

      // Play soft metal contact sound
      if (rawSpeed > 10) {
        sound.playCollision(Math.min(0.5, rawSpeed / 90));
      }

      // 8. Spawn golden friction sparks flying backwards along the rail
      const sparkCount = Math.min(8, Math.floor(rawSpeed / 14) + 1);
      for (let s = 0; s < sparkCount; s++) {
        const sparkSpeed = rawSpeed * 0.6 + Math.random() * 30;
        const sparkDirX = -tx * Math.sign(velDotT || 1) + (Math.random() - 0.5) * 0.4;
        const sparkDirY = -ty * Math.sign(velDotT || 1) + (Math.random() - 0.5) * 0.4;
        const sparkLen = Math.hypot(sparkDirX, sparkDirY) || 1;

        world.particles.push({
          x: closestX + (Math.random() - 0.5) * 4,
          y: closestY + (Math.random() - 0.5) * 4,
          vx: (sparkDirX / sparkLen) * sparkSpeed,
          vy: (sparkDirY / sparkLen) * sparkSpeed,
          radius: 1.0 + Math.random() * 1.5,
          color: Math.random() > 0.3 ? '#fef08a' : '#f97316',
          alpha: 1.0,
          life: 0,
          maxLife: 0.15 + Math.random() * 0.2,
          type: 'spark',
        });
      }
    }
  }
}

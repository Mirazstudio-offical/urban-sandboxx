import { Building, CarType, GameWorld, Intersection, Pedestrian, RoadSegment, Vector2D, Vehicle } from './types';
import { CAR_CONFIGS, CAR_PALETTE, createDefaultVehicleDamage, generateRandomPedestrianAppearance } from './cityMap';
import { sound } from './audio';
import { checkPedestrianBuildingCollision, getBuildingEntrancePos, checkPedestrianVehicleCollision } from './physics';
import { SpatialGrid } from './spatialGrid';

// Helper: angle difference normalized to [-PI, PI]
export function angleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

// Distance helper
function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

// --- TELEMETRY & DIAGNOSTICS LOG BUFFER ---
export interface TrafficLogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'yield' | 'deadlock' | 'light' | 'reverse';
  message: string;
  vehicleId?: string;
  intersectionId?: string;
}

class TrafficDiagnostics {
  public logs: TrafficLogEntry[] = [];
  private nextLogId: number = 1;
  public totalPassedThrough: number = 0;
  public gridlockCount: number = 0;
  public averageSpeed: number = 0;
  public debugOverlayEnabled: boolean = false;

  public log(type: TrafficLogEntry['type'], message: string, vehicleId?: string, intersectionId?: string) {
    const d = new Date();
    const ts = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    this.logs.unshift({
      id: this.nextLogId++,
      timestamp: ts,
      type,
      message,
      vehicleId,
      intersectionId
    });
    if (this.logs.length > 250) {
      this.logs.pop();
    }
  }

  public clearLogs() {
    this.logs = [];
  }
}

export const trafficDiagnostics = new TrafficDiagnostics();

// Find lane object by ID
export function findLaneById(world: GameWorld, laneId: string | null): RoadSegment['lanePaths'][0] | null {
  if (!laneId) return null;
  for (const road of world.roads) {
    for (const lane of road.lanePaths) {
      if (lane.laneId === laneId) return lane;
    }
  }
  return null;
}

// Update traffic lights and pedestrian signals
export function updateTrafficLights(intersections: Intersection[], dt: number) {
  for (const inter of intersections) {
    if (!inter.hasLights) {
      // Uncontrolled intersections: force all stop lines to green and crosswalks to walk
      for (const line of inter.stopLines) {
        line.lightState = 'green';
      }
      for (const cw of inter.crosswalks) {
        cw.pedestrianSignal = 'walk';
      }
      continue;
    }

    inter.phaseTimer += dt;
    const currentPhase = inter.phases[inter.currentPhaseIndex];

    // Handle Signal Lost (Flashing Yellow Mode)
    if (inter.isSignalLost) {
      const isFlashOn = Math.floor(performance.now() / 500) % 2 === 0;
      const flashState = isFlashOn ? 'yellow' : 'off';
      for (const line of inter.stopLines) {
        line.lightState = flashState;
      }
      for (const cw of inter.crosswalks) {
        cw.pedestrianSignal = 'wait';
      }
      continue;
    }

    if (inter.phaseTimer >= currentPhase.duration) {
      inter.phaseTimer = 0;
      inter.currentPhaseIndex = (inter.currentPhaseIndex + 1) % inter.phases.length;
      const nextPhase = inter.phases[inter.currentPhaseIndex];
      trafficDiagnostics.log(
        'light',
        `${inter.id.toUpperCase()}: Phase -> NS ${nextPhase.nsState.toUpperCase()} | EW ${nextPhase.ewState.toUpperCase()}`,
        undefined,
        inter.id
      );
    }

    const phase = inter.phases[inter.currentPhaseIndex];

    // Vehicle stop lines
    for (const line of inter.stopLines) {
      if (line.direction === 'north' || line.direction === 'south') {
        line.lightState = phase.nsState;
      } else {
        line.lightState = phase.ewState;
      }
    }

    // Pedestrian crosswalk signals:
    // - North & South crosswalks cross the North-South road -> SAFE to cross ONLY when NS vehicles have RED (EW is green)
    // - West & East crosswalks cross the East-West road -> SAFE to cross ONLY when EW vehicles have RED (NS is green)
    for (const cw of inter.crosswalks) {
      if (cw.direction === 'north' || cw.direction === 'south') {
        cw.pedestrianSignal = phase.nsState === 'red' && (phase.ewState === 'green' || phase.ewState === 'green_flashing') ? 'walk' : 'wait';
      } else {
        cw.pedestrianSignal = phase.ewState === 'red' && (phase.nsState === 'green' || phase.nsState === 'green_flashing') ? 'walk' : 'wait';
      }
    }
  }
}

// Pure pursuit arc-length lookahead point finder with forward extrapolation (NO BACKWARD CLAMPING)
function getLookaheadPointOnPolyline(
  carX: number,
  carY: number,
  waypoints: Vector2D[],
  startIndex: number,
  lookaheadDist: number
): { point: Vector2D; targetIndex: number } {
  if (waypoints.length === 0) {
    return { point: { x: carX, y: carY }, targetIndex: 0 };
  }
  if (waypoints.length === 1) {
    return { point: waypoints[0], targetIndex: 0 };
  }

  // Project car onto the current segment to prevent backward lookahead vectors
  let remainingDist = lookaheadDist;
  let currIdx = Math.min(startIndex, waypoints.length - 1);
  let currX = carX;
  let currY = carY;

  if (currIdx > 0) {
    const prevWp = waypoints[currIdx - 1];
    const wp = waypoints[currIdx];
    const segDx = wp.x - prevWp.x;
    const segDy = wp.y - prevWp.y;
    const segLenSq = segDx * segDx + segDy * segDy;
    if (segLenSq > 0.001) {
      const t = ((carX - prevWp.x) * segDx + (carY - prevWp.y) * segDy) / segLenSq;
      const clampedT = Math.max(0, Math.min(1, t));
      currX = prevWp.x + segDx * clampedT;
      currY = prevWp.y + segDy * clampedT;
    }
  }

  while (currIdx < waypoints.length) {
    const wp = waypoints[currIdx];
    const segLen = Math.hypot(wp.x - currX, wp.y - currY);
    if (segLen >= remainingDist) {
      const ratio = remainingDist / Math.max(0.001, segLen);
      return {
        point: {
          x: currX + (wp.x - currX) * ratio,
          y: currY + (wp.y - currY) * ratio
        },
        targetIndex: currIdx
      };
    }
    remainingDist -= segLen;
    currX = wp.x;
    currY = wp.y;
    currIdx++;
  }

  // If lookahead exceeds the final waypoint, extrapolate along the final segment vector
  const lastWp = waypoints[waypoints.length - 1];
  const secondLastWp = waypoints[Math.max(0, waypoints.length - 2)];
  const segDx = lastWp.x - secondLastWp.x;
  const segDy = lastWp.y - secondLastWp.y;
  const segLen = Math.hypot(segDx, segDy);

  if (segLen > 0.001) {
    const extraDist = remainingDist;
    return {
      point: {
        x: lastWp.x + (segDx / segLen) * extraDist,
        y: lastWp.y + (segDy / segLen) * extraDist
      },
      targetIndex: waypoints.length - 1
    };
  }

  return { point: lastWp, targetIndex: waypoints.length - 1 };
}

// AI Traffic Management System
export function updateAITraffic(
  world: GameWorld,
  dt: number,
  vehGrid?: SpatialGrid<Vehicle>,
  pedGrid?: SpatialGrid<Pedestrian>,
  playerPos?: Vector2D
) {
  let totalSpeed = 0;
  let movingCars = 0;
  let deadlockedCars = 0;

  const playerCar = world.vehicles.find((v) => v.isPlayerControlled);
  const targetPos: Vector2D = playerPos || (playerCar ? { x: playerCar.x, y: playerCar.y } : { x: 4400, y: 2800 });

  // Filter active AI driving vehicles (excluding parked cars and player car)
  const activeAICars = world.vehicles.filter((v) => !v.isPlayerControlled && !v.isParked);
  const totalActiveCount = activeAICars.length;

  // Maintain natural vehicle density around the player dynamically (balanced ~8-12 nearby, ~28 max active)
  const nearbyActiveCount = activeAICars.filter(
    (v) => Math.hypot(v.x - targetPos.x, v.y - targetPos.y) < 1400
  ).length;

  if (nearbyActiveCount < 10 && totalActiveCount < 28) {
    const toSpawn = Math.min(1, 10 - nearbyActiveCount);
    for (let s = 0; s < toSpawn; s++) {
      spawnNewCarNearPlayer(targetPos, world);
    }
  }

  // --- POLICE CHASE & SIREN PATROL DETECTOR ---
  let activeSirenCount = 0;
  if (playerCar) {
    const playerSpeedKmh = Math.abs(playerCar.speed) * 0.36;
    const isPlayerReckless = playerSpeedKmh > 115 || (playerCar.damage && (playerCar.damage.frontCrumple > 8 || playerCar.damage.leftDent > 6));

    for (const car of world.vehicles) {
      if (car.type === 'police') {
        const distToPlayer = Math.hypot(car.x - playerCar.x, car.y - playerCar.y);
        if (isPlayerReckless && distToPlayer < 450) {
          car.sirenOn = true;
          car.emergencyState = 'chase';
          car.targetChaseVehicleId = playerCar.id;
          const maxS = CAR_CONFIGS[car.type]?.maxSpeed || 400;
          car.targetSpeed = Math.min(maxS, Math.abs(playerCar.speed) + 50);
        } else if (car.emergencyState === 'chase' && distToPlayer > 850) {
          car.sirenOn = false;
          car.emergencyState = 'patrol';
        }
      }

      if (car.sirenOn) {
        activeSirenCount++;
        car.sirenStrobe = ((car.sirenStrobe || 0) + dt * 12) % (Math.PI * 2);
      }
    }
  }

  if (activeSirenCount > 0) {
    sound.startSiren();
    sound.updateSiren(dt);
  } else {
    sound.stopSiren();
  }

  const vehiclesToDespawn: string[] = [];

  for (const car of world.vehicles) {
    // Basic state updates for ALL vehicles (including player/parked)
    car.turnSignalTimer = (car.turnSignalTimer || 0) + dt;
    car.angle = ((car.angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

    if (car.isPlayerControlled || car.isParked) continue;

    // --- EMERGENCY YIELDING FOR AI CARS ---
    let isEmergencyYielding = false;
    if (activeSirenCount > 0) {
      const nearbyForSiren = vehGrid ? vehGrid.queryRadius(car.x, car.y, 280) : world.vehicles;
      for (const eCar of nearbyForSiren) {
        if (eCar.sirenOn && eCar.id !== car.id) {
          if (Math.hypot(eCar.x - car.x, eCar.y - car.y) < 280) {
            isEmergencyYielding = true;
            break;
          }
        }
      }
      if (isEmergencyYielding) {
        car.aiState = 'yielding';
      }
    }

    // --- OPTIMIZATION: DESPAWN / RECYCLE DISTANT CARS ---
    const distToPlayer = Math.hypot(car.x - targetPos.x, car.y - targetPos.y);
    if (distToPlayer > 1450) {
      if (totalActiveCount > 28) {
        vehiclesToDespawn.push(car.id);
        continue;
      } else {
        respawnCarNearPlayer(car, targetPos, world);
        continue;
      }
    }

    totalSpeed += car.speed;
    movingCars++;

    // --- REVERSE RECOVERY STATE MACHINE ---
    // If vehicle hit an obstacle or was deadlocked, back up and actively turn nose towards open road
    if (car.aiState === 'reversing') {
      car.reverseTimer = (car.reverseTimer || 1.0) - dt;
      car.targetSpeed = -32;
      car.brakeLightsOn = false;
      car.turnSignal = 'hazard';

      // Dynamically calculate recovery steer towards target escape angle
      if (car.recoveryTargetAngle !== undefined) {
        const targetDiff = angleDiff(car.recoveryTargetAngle, car.angle);
        const maxSteer = CAR_CONFIGS[car.type]?.maxSteerAngle || 0.75;
        if (Math.abs(targetDiff) > 0.2) {
          // Reversing with negative speed: steer opposite to targetDiff to rotate nose towards targetAngle
          car.recoverySteer = -Math.sign(targetDiff) * maxSteer;
        } else {
          car.recoverySteer = 0;
        }
      }

      // Smooth steering response during reverse turn
      const steer = car.recoverySteer || 0;
      car.steerAngle += (steer - car.steerAngle) * Math.min(1.0, 6.0 * dt);

      if (Math.abs(car.speed) > 0.5) {
        const yawRate = (car.speed / (car.wheelBase || 28)) * Math.tan(car.steerAngle);
        car.angle += yawRate * dt;
        car.angle = ((car.angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      }

      if (car.reverseTimer <= 0) {
        // Recovery complete
        // Just softly realign towards the next waypoint so it doesn't get completely lost, 
        // but preserve all state (lane, connection, turn intent)
        const nextWp = car.routeWaypoints[car.targetWaypointIndex];
        if (nextWp) {
           const targetAngle = Math.atan2(nextWp.y - car.y, nextWp.x - car.x);
           if (Math.abs(angleDiff(targetAngle, car.angle)) > Math.PI / 2) {
              car.angle = targetAngle; 
           }
        }

        car.aiState = 'driving';
        car.speed = 15;
        car.stuckTimer = 0;
        car.turnSignal = 'none';
        car.recoveryTargetAngle = undefined;
        trafficDiagnostics.log('info', `Car #${car.id.slice(-4)} recovered from reverse turn maneuver`, car.id);
      }
      continue;
    }

    // 1. Check if vehicle is inside any intersection boundary
    // Strictly only considered inside if on an active connection and within the inner junction box
    let insideIntersection: Intersection | null = null;
    if (car.currentConnection && car.currentConnection.turnType !== 'turnaround') {
      for (const inter of world.intersections) {
        const halfW = inter.width / 2 - 4;
        const halfH = inter.height / 2 - 4;
        if (
          car.x >= inter.x - halfW && car.x <= inter.x + halfW &&
          car.y >= inter.y - halfH && car.y <= inter.y + halfH
        ) {
          insideIntersection = inter;
          break;
        }
      }
    }
    car.inIntersection = insideIntersection !== null;

    // 2. Waypoint Tracking & Critical-Damped Pure Pursuit (NO SNAKING / NO CTE OSCILLATIONS / NO ORBITING)
    if (car.routeWaypoints && car.routeWaypoints.length > 0) {
      const targetWp = car.routeWaypoints[car.targetWaypointIndex];
      if (targetWp) {
        const distToWp = Math.hypot(targetWp.x - car.x, targetWp.y - car.y);

        // Vector math to check if the car has progressed along or passed the current segment
        const prevWp = car.routeWaypoints[Math.max(0, car.targetWaypointIndex - 1)];
        const segDx = targetWp.x - prevWp.x;
        const segDy = targetWp.y - prevWp.y;
        const segLenSq = segDx * segDx + segDy * segDy;
        const toCarDx = car.x - prevWp.x;
        const toCarDy = car.y - prevWp.y;
        const projRatio = segLenSq > 0 ? (toCarDx * segDx + toCarDy * segDy) / segLenSq : 1;

        // Calculate Cross-Track Error (lateral displacement from segment centerline)
        const segLen = Math.sqrt(segLenSq);
        const cte = segLen > 0 ? (toCarDx * segDy - toCarDy * segDx) / segLen : 0;

        // Check if target waypoint is behind the vehicle heading
        const toWpDx = targetWp.x - car.x;
        const toWpDy = targetWp.y - car.y;
        const wpAhead = toWpDx * Math.cos(car.angle) + toWpDy * Math.sin(car.angle);

        const isCurve = !!car.currentConnection;
        const isBigVehicle = car.length > 65;
        const advanceThreshold = isCurve ? (isBigVehicle ? 32 : 24) : 36;

        // Advance to next waypoint if:
        // 1. Within advance radius
        // 2. Projected past 85% of segment
        // 3. Close to waypoint and waypoint is already behind the car's front bumper
        if (distToWp < advanceThreshold || projRatio >= 0.85 || (distToWp < 55 && wpAhead < -4)) {
          if (car.targetWaypointIndex < car.routeWaypoints.length - 1) {
            car.targetWaypointIndex++;
          } else {
            advanceCarRoute(car, world);
          }
        }

        // Pure pursuit dynamic lookahead distance (scaled with speed)
        // Shorter lookahead on curves for tight, stable cornering
        let lookaheadDist = isCurve
          ? Math.max(18, Math.min(34, 14 + car.speed * 0.15))
          : Math.max(38, Math.min(85, 24 + car.speed * 0.4));

        const { point: lookaheadPt } = getLookaheadPointOnPolyline(
          car.x,
          car.y,
          car.routeWaypoints,
          car.targetWaypointIndex,
          lookaheadDist
        );

        // Big vehicles "Swing Wide" logic for tight right turns
        let targetX = lookaheadPt.x;
        let targetY = lookaheadPt.y;

        if (isBigVehicle && car.currentConnection?.turnType === 'right') {
          // Increase lookahead for bigger arc
          const wideLookaheadDist = lookaheadDist * 1.38;
          
          // Re-calculate lookahead point with increased distance
          const newLookahead = getLookaheadPointOnPolyline(
            car.x,
            car.y,
            car.routeWaypoints,
            car.targetWaypointIndex,
            wideLookaheadDist
          );
          
          // Add lateral offset to swing the nose wide (away from the turn center)
          const heading = Math.atan2(newLookahead.point.y - car.y, newLookahead.point.x - car.x);
          const swingAmount = 12; // Reduced from 22 to prevent excessive swing
          targetX = newLookahead.point.x + Math.cos(heading - Math.PI / 2) * swingAmount;
          targetY = newLookahead.point.y + Math.sin(heading - Math.PI / 2) * swingAmount;
        }

        const ldx = targetX - car.x;
        const ldy = targetY - car.y;
        let alpha = angleDiff(Math.atan2(ldy, ldx), car.angle);

        // Active Cross-Track Error (CTE) Centering Bias
        // Gently pulls vehicle back to exact center of lane if nudged laterally
        const cteCorrection = Math.atan2(cte * 0.8, Math.max(15, lookaheadDist));
        alpha += cteCorrection;

        // Standard geometric pure pursuit formula: curvature = 2 * sin(alpha) / lookaheadDist
        const wheelBase = car.wheelBase || 28;
        const curvature = (2 * Math.sin(alpha)) / Math.max(8, lookaheadDist);
        // Allow responsive steering up to ~50 degrees (0.85 rad) for smooth U-turns and 90-deg intersections
        const desiredSteer = Math.max(-0.85, Math.min(0.85, Math.atan(curvature * wheelBase)));

        // Smooth critically-damped steering filter
        car.steerAngle += (desiredSteer - car.steerAngle) * Math.min(1.0, 10.0 * dt);

        // Bicycle yaw kinematic update
        if (Math.abs(car.speed) > 0.5) {
          const yawRate = (car.speed / wheelBase) * Math.tan(car.steerAngle);
          car.angle += yawRate * dt;
        }

        // Turn signal management
        if (car.plannedTurn === 'left' || car.currentConnection?.turnType === 'turnaround') {
          car.turnSignal = 'left';
        } else if (car.plannedTurn === 'right') {
          car.turnSignal = 'right';
        } else {
          car.turnSignal = 'none';
        }
      } else {
        advanceCarRoute(car, world);
      }
    } else {
      reacquireClosestLane(car, world);
    }

    // 3. Multi-Zone Intelligent Obstacle & Collision Avoidance
    let minGapToLeadCar = 999;
    let leadCarSpeed = 0;
    let hasLeadCar = false;

    const carCos = Math.cos(car.angle);
    const carSin = Math.sin(car.angle);

    const nearbyVehicles = vehGrid ? vehGrid.queryRadius(car.x, car.y, 140) : world.vehicles;

    for (const other of nearbyVehicles) {
      if (other.id === car.id || other.isParked) continue;

      const relX = other.x - car.x;
      const relY = other.y - car.y;
      const directDist = Math.hypot(relX, relY);

      if (directDist > 140) continue;

      // Longitudinal and lateral offsets relative to our heading
      const distLong = relX * carCos + relY * carSin;
      const distLat = Math.abs(relX * -carSin + relY * carCos);
      const aDiff = Math.abs(angleDiff(other.angle, car.angle));

      // CASE A: Standard Straight Road Following
      if (!car.currentConnection && !car.inIntersection && !other.currentConnection && !other.inIntersection) {
        // Oncoming traffic is on opposite side of road -> Ignore
        if (aDiff > 1.6) continue;

        // Same direction traffic ahead (check both same lane and lane-shifting/mismatched cars ahead)
        // car.width is ~20px, so distLat < 22 ensures we detect any car physically overlapping or blocking our lane path
        if (distLong > 0 && distLong < 140 && distLat < 22) {
          const netGap = distLong - (car.length + other.length) / 2;
          if (netGap < minGapToLeadCar) {
            minGapToLeadCar = Math.max(0, netGap);
            leadCarSpeed = Math.max(0, other.speed);
            hasLeadCar = true;
          }
        }
      } 
      // CASE B: Intersection Crossing or Turning Maneuver
      else {
        // 1. Same route queueing (following car ahead on the same curve)
        const isSameConnection = car.currentConnection && other.currentConnection && 
          car.currentConnection.targetLaneId === other.currentConnection.targetLaneId;

        if (isSameConnection) {
          if (distLong > 0 && distLong < 100 && distLat < 18) {
            const netGap = distLong - (car.length + other.length) / 2;
            if (netGap < minGapToLeadCar) {
              minGapToLeadCar = Math.max(0, netGap);
              leadCarSpeed = Math.max(0, other.speed);
              hasLeadCar = true;
            }
          }
        } 
        // 2. Conflicting cross-traffic or merging paths inside intersection
        else {
          // Check upcoming path waypoints for physical trajectory conflict
          let isTrajectoryConflict = false;
          if (car.routeWaypoints && car.routeWaypoints.length > 0) {
            const checkEnd = Math.min(car.routeWaypoints.length, car.targetWaypointIndex + 4);
            for (let wi = car.targetWaypointIndex; wi < checkEnd; wi++) {
              const wp = car.routeWaypoints[wi];
              if (Math.hypot(other.x - wp.x, other.y - wp.y) < 28) {
                isTrajectoryConflict = true;
                break;
              }
            }
          }

          // Forward safety bubble (strictly ahead of our front bumper)
          const inForwardCone = distLong > 4 && directDist < (car.length + other.length) * 0.45 + 10 && distLat < 24;

          if (isTrajectoryConflict || inForwardCone) {
            // STRICT DETERMINISTIC PRIORITY ARBITRATION
            let weHavePriority = false;

            // Rule 1: Car already inside intersection has priority over car still at stop line
            if (car.inIntersection && !other.inIntersection) {
              weHavePriority = true;
            } else if (!car.inIntersection && other.inIntersection) {
              weHavePriority = false;
            }
            // Rule 2: Straight maneuvers have right-of-way over left turns (ПДД)
            else if (car.plannedTurn === 'straight' && other.plannedTurn === 'left') {
              weHavePriority = true;
            } else if (car.plannedTurn === 'left' && other.plannedTurn === 'straight') {
              weHavePriority = false;
            }
            // Rule 3: Right turns have priority over left turns
            else if (car.plannedTurn === 'right' && other.plannedTurn === 'left') {
              weHavePriority = true;
            } else if (car.plannedTurn === 'left' && other.plannedTurn === 'right') {
              weHavePriority = false;
            }
            // Rule 4: Car closer to exiting the intersection has priority
            else if ((car.targetWaypointIndex || 0) > (other.targetWaypointIndex || 0)) {
              weHavePriority = true;
            } else if ((other.targetWaypointIndex || 0) > (car.targetWaypointIndex || 0)) {
              weHavePriority = false;
            }
            // Rule 5: Strict ID tie-breaker guarantees NO mutual deadlocks
            else {
              weHavePriority = car.id < other.id;
            }

            // If we do NOT have priority, yield to the passing car
            if (!weHavePriority) {
              const netGap = Math.max(0, directDist - (car.length + other.length) / 2);
              if (netGap < minGapToLeadCar) {
                minGapToLeadCar = netGap;
                leadCarSpeed = Math.max(0, other.speed);
                hasLeadCar = true;
              }
            }
          }
        }
      }
    }

    // Pedestrian obstacle detection (Wide & Forward Scanning)
    let pedObstacleDist = 999;
    const forwardLookahead = Math.max(85, car.speed * 1.3 + 45);
    const nearbyPedestrians = pedGrid ? pedGrid.queryRadius(car.x, car.y, forwardLookahead + 25) : world.pedestrians;

    for (const ped of nearbyPedestrians) {
      const relX = ped.x - car.x;
      const relY = ped.y - car.y;
      const distLong = relX * carCos + relY * carSin;
      const distLat = Math.abs(relX * -carSin + relY * carCos);

      // Check if pedestrian is directly in front of the vehicle or stepping onto the road
      if (distLong > 0 && distLong < forwardLookahead && distLat < 24) {
        if (distLong < pedObstacleDist) {
          pedObstacleDist = distLong;
        }
      } else if (distLong > -8 && distLong < 45 && distLat < 20) {
        // Pedestrian crossing right in front of bumper
        if (distLong < pedObstacleDist) {
          pedObstacleDist = Math.max(5, distLong);
        }
      }
    }

    // Yield to pedestrians actively crossing crosswalks in front of vehicle
    if (pedObstacleDist >= 999) {
      for (const inter of world.intersections) {
        const distToInter = Math.hypot(inter.x - car.x, inter.y - car.y);
        if (distToInter < inter.width / 2 + 75) {
          for (const cw of inter.crosswalks) {
            const distToCw = Math.hypot(cw.x - car.x, cw.y - car.y);
            if (distToCw < 85) {
              const crossingPed = nearbyPedestrians.find(
                (p) => (p.state === 'crossing' || p.isCrossingRoad) && p.targetCrosswalkId === cw.id
              );
              if (crossingPed) {
                const pedRelX = crossingPed.x - car.x;
                const pedRelY = crossingPed.y - car.y;
                const pLong = pedRelX * carCos + pedRelY * carSin;
                const pLat = Math.abs(pedRelX * -carSin + pedRelY * carCos);
                if (pLong > 0 && pLong < 75 && pLat < 36) {
                  pedObstacleDist = pLong;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Building Wall Proximity Scanning & Anti-Collision
    let buildingObstacleDist = 999;
    let buildingRepulsionAngle = 0;

    const fwdScanDist = Math.max(30, Math.min(70, car.speed * 0.4 + 25));
    const probeX = car.x + carCos * fwdScanDist;
    const probeY = car.y + carSin * fwdScanDist;

    for (const bld of world.buildings) {
      if (probeX >= bld.x - 14 && probeX <= bld.x + bld.width + 14 &&
          probeY >= bld.y - 14 && probeY <= bld.y + bld.height + 14) {
        const bCenter = { x: bld.x + bld.width / 2, y: bld.y + bld.height / 2 };
        const dToCar = Math.hypot(car.x - bCenter.x, car.y - bCenter.y);
        if (dToCar < buildingObstacleDist) {
          buildingObstacleDist = dToCar;
          buildingRepulsionAngle = Math.atan2(car.y - bCenter.y, car.x - bCenter.x);
        }
      }
    }

    if (buildingObstacleDist < 999) {
      if (buildingObstacleDist < 38 && Math.abs(car.speed) < 18) {
        // Car is right at a building wall at low speed -> Initiate smart reverse turn!
        car.aiState = 'reversing';
        car.reverseTimer = 2.0;
        car.recoveryTargetAngle = car.angle + (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3);
        car.recoverySteer = 0;
        car.speed = -35;
        continue;
      }
    }

    // 3.5 Pre-plan turn signal & intent ahead of intersection (ПДД)
    updateTurnSignalAndIntent(car, world);

    // 4. Traffic Light & Intersection Yielding Rules (ПДД + Anti-Gridlock)
    let mustStopAtStopLine = false;
    let stopLineDist = 999;

    if (!car.inIntersection && !car.currentConnection) {
      const currentLane = findLaneById(world, car.currentLaneId);
      if (currentLane && currentLane.connections && currentLane.connections.length > 0) {
        const candidateConn = currentLane.connections[0];
        if (candidateConn.intersectionId && candidateConn.stopLineDirection) {
          const inter = world.intersections.find((i) => i.id === candidateConn.intersectionId);
          if (inter) {
            const stopLine = inter.stopLines.find((sl) => sl.direction === candidateConn.stopLineDirection);
            if (stopLine) {
              const midX = (stopLine.x1 + stopLine.x2) / 2;
              const midY = (stopLine.y1 + stopLine.y2) / 2;
              const dx = midX - car.x;
              const dy = midY - car.y;
              const distToLine = Math.hypot(dx, dy);

              const longitudinalDist = dx * carCos + dy * carSin;
              if (distToLine < 110 && longitudinalDist >= -25) {
                const headingToLine = Math.atan2(dy, dx);
                if (Math.abs(angleDiff(headingToLine, car.angle)) < 0.6) {
                  // A. Red / Yellow Light (Only if the traffic light prop is NOT broken!)
                  const isLightBroken = inter.isSignalLost || world.props.some(
                    (p) => p.type === 'traffic_light' &&
                           p.intersectionId === inter.id &&
                           p.direction === candidateConn.stopLineDirection &&
                           p.isBroken
                  );

                  if (inter.hasLights && (stopLine.lightState === 'red' || stopLine.lightState === 'yellow' || stopLine.lightState === 'red_yellow') && !isLightBroken) {
                    mustStopAtStopLine = true;
                    stopLineDist = distToLine;
                    car.aiState = 'stopping_light';
                  } else {
                    if (isLightBroken) {
                      // Slow down slightly for broken light intersection cautious crossing
                      car.targetSpeed = Math.min(car.targetSpeed, 45);
                    } 
                    // B. Green Light Checks: "Don't Block The Box" & Left-Turn Yielding
                    if (inter.hasLights && (stopLine.lightState === 'green' || stopLine.lightState === 'green_flashing' || stopLine.lightState === 'yellow' || stopLine.lightState === 'off' || isLightBroken)) {
                      // Check 1: Anti-Gridlock ("Don't Block the Box")
                      // Do not enter intersection if exit lane cannot receive vehicle
                      const targetLane = findLaneById(world, candidateConn.targetLaneId);
                      if (targetLane && targetLane.waypoints.length > 0) {
                        const exitPt = targetLane.waypoints[0];
                        for (const other of world.vehicles) {
                          if (other.id === car.id || other.isParked) continue;
                          if (Math.hypot(other.x - exitPt.x, other.y - exitPt.y) < 60 && other.speed < 8) {
                            mustStopAtStopLine = true;
                            stopLineDist = distToLine;
                            car.aiState = 'yielding';
                            break;
                          }
                        }
                      }
                    }
                    
                    // Always perform Anti-Gridlock check for all intersections
                    const targetLaneAll = findLaneById(world, candidateConn.targetLaneId);
                    if (targetLaneAll && targetLaneAll.waypoints.length > 0) {
                      const exitPt = targetLaneAll.waypoints[0];
                      for (const other of world.vehicles) {
                        if (other.id === car.id || other.isParked || other.inIntersection) continue; // Check for cars already in intersection
                        if (Math.hypot(other.x - exitPt.x, other.y - exitPt.y) < 60 && other.speed < 8) {
                          mustStopAtStopLine = true;
                          stopLineDist = distToLine;
                          car.aiState = 'yielding';
                          break;
                        }
                      }
                    }

                    // Check 2: Left-turn yielding to oncoming traffic (ПДД)
                    if (car.plannedTurn === 'left' && !mustStopAtStopLine) {
                      for (const oncoming of world.vehicles) {
                        if (oncoming.id === car.id || oncoming.isParked) continue;
                        const distToInter = Math.hypot(oncoming.x - inter.x, oncoming.y - inter.y);
                        if (distToInter < inter.width / 2 + 50) {
                          const angDiff = Math.abs(angleDiff(oncoming.angle, car.angle));
                          if (angDiff > 2.2 && oncoming.plannedTurn === 'straight' && oncoming.speed > 16) {
                            mustStopAtStopLine = true;
                            stopLineDist = distToLine;
                            car.aiState = 'yielding';
                            break;
                          }
                        }
                      }
                    }

                    // Check 3: Active Intersection Occupancy (Wait at stop line if conflicting vehicle is crossing)
                    if (!mustStopAtStopLine && distToLine < 50) {
                      for (const insideCar of world.vehicles) {
                        if (insideCar.id === car.id || insideCar.isParked || !insideCar.inIntersection) continue;
                        const distToCenter = Math.hypot(insideCar.x - inter.x, insideCar.y - inter.y);
                        if (distToCenter < inter.width * 0.45 && insideCar.speed < 25) {
                          const headingDiff = Math.abs(angleDiff(insideCar.angle, car.angle));
                          // If insideCar is crossing perpendicularly or turning across our path
                          if (headingDiff > 0.45 && headingDiff < 2.7) {
                            mustStopAtStopLine = true;
                            stopLineDist = distToLine;
                            car.aiState = 'yielding';
                            break;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      car.aiState = 'in_intersection';
    }

    // 5. Intelligent Driver Model (IDM) Target Speed Calculation
    const defaultCruiseSpeed = 100 + (car.type === 'sports' ? 25 : 0) + (car.type === 'taxi' ? 10 : 0);
    // Smooth realistic urban turning speeds: prevents wide-swinging into building corners
    const turnMaxSpeed = car.currentConnection?.turnType === 'turnaround'
      ? 30
      : (car.type === 'sports' ? 36 : (car.type === 'suv' || car.type === 'pickup' ? 28 : 32));
    const v0 = (car.inIntersection || car.currentConnection || car.plannedTurn !== 'straight') ? turnMaxSpeed : defaultCruiseSpeed;

    // Ghosting recovery alpha handling
    if (!car.inIntersection && car.ghostingAlpha !== undefined && car.ghostingAlpha < 1.0) {
      car.ghostingAlpha = Math.min(1.0, car.ghostingAlpha + dt * 1.5);
    }

    // Auto-maintenance: if AI vehicle is driving smoothly without recent crash, restore minor bumper dents
    const nowSec = performance.now() / 1000;
    if (car.damage && car.speed > 15 && (!car.lastDamageTime || nowSec - car.lastDamageTime > 12)) {
      if (car.damage.health >= 85) {
        car.damage.frontCrumple = Math.max(0, car.damage.frontCrumple - dt * 1.5);
        car.damage.rearCrumple = Math.max(0, car.damage.rearCrumple - dt * 1.5);
        car.damage.frontLeftDent = Math.max(0, car.damage.frontLeftDent - dt * 1.2);
        car.damage.frontRightDent = Math.max(0, car.damage.frontRightDent - dt * 1.2);
        car.damage.rearLeftDent = Math.max(0, car.damage.rearLeftDent - dt * 1.2);
        car.damage.rearRightDent = Math.max(0, car.damage.rearRightDent - dt * 1.2);
        car.damage.leftDent = Math.max(0, car.damage.leftDent - dt * 1.2);
        car.damage.rightDent = Math.max(0, car.damage.rightDent - dt * 1.2);

        // Reset vertex deform offsets towards 0
        if (car.damage.deformedVertices) {
          for (const v of car.damage.deformedVertices) {
            v.offsetX *= Math.max(0, 1 - dt * 0.8);
            v.offsetY *= Math.max(0, 1 - dt * 0.8);
          }
        }
      }
    }

    let stopLineTargetSpeed = v0;
    if (mustStopAtStopLine) {
      if (stopLineDist < 35) {
        stopLineTargetSpeed = 0;
      } else {
        const factor = Math.max(0, (stopLineDist - 28) / 80);
        stopLineTargetSpeed = v0 * factor;
      }
    }

    let pedTargetSpeed = v0;
    if (pedObstacleDist < 999) {
      if (pedObstacleDist < 46) {
        pedTargetSpeed = 0;
      } else {
        const factor = Math.max(0, (pedObstacleDist - 40) / 60);
        pedTargetSpeed = v0 * factor * factor;
      }
    }

    let leadCarTargetSpeed = v0;
    if (hasLeadCar) {
      const s0 = 50; // Safe buffer gap (px) prevents bumper-to-bumper touching when queued
      const s = minGapToLeadCar;

      if (s < s0) {
        if (car.inIntersection && car.stuckTimer > 1.2) {
          leadCarTargetSpeed = 22;
          car.ghostingAlpha = Math.max(0.4, (car.ghostingAlpha ?? 1.0) - dt * 0.6);
        } else {
          leadCarTargetSpeed = 0;
        }
      } else if (s < s0 + 60) {
        const factor = Math.max(0, (s - s0) / 60);
        leadCarTargetSpeed = Math.min(leadCarSpeed * 0.90 + 6 * factor, v0 * factor);
      } else {
        leadCarTargetSpeed = Math.min(v0, Math.max(leadCarSpeed, 45));
      }
    }

    // STRICT SAFETY CONSTRAINTS: Target speed is ALWAYS the minimum of all active restrictions!
    const effectiveV0 = car.aiState === 'yielding' ? 15 : v0;
    car.targetSpeed = Math.min(effectiveV0, stopLineTargetSpeed, pedTargetSpeed, leadCarTargetSpeed);

    if (pedObstacleDist < 42 && pedTargetSpeed === 0) {
      car.speed = Math.max(0, car.speed - 380 * dt);
    }

    if (mustStopAtStopLine || pedObstacleDist < 999 || hasLeadCar) {
      if (hasLeadCar || pedObstacleDist < 999) {
        car.aiState = 'stopping_obstacle';
      } else if (mustStopAtStopLine) {
        car.aiState = 'stopping_light';
      }
    } else {
      if (!car.inIntersection) {
        car.aiState = 'driving';
      }
    }

    // 6. Anti-Deadlock & Autonomous Recovery
    // Legitimate queues (waiting at red light, yielding to cross traffic, or in line) must NEVER trigger reverse escape!
    const isNormalQueueing = (!car.inIntersection && hasLeadCar) || 
      car.aiState === 'stopping_light' || 
      car.aiState === 'yielding';

    if (isNormalQueueing) {
      car.stuckTimer = 0;
    } else if (Math.abs(car.speed) < 3) {
      car.stuckTimer += dt;

      // Inside intersection: if stalled for > 2.0s, softly enable ghosting and cruise out
      if (car.inIntersection && car.stuckTimer > 2.0) {
        car.ghostingAlpha = Math.max(0.4, (car.ghostingAlpha ?? 1.0) - dt * 0.8);
        car.targetSpeed = 40;
        car.aiState = 'driving';
      }

      // Threshold for hard reverse escape & smart detour
      const deadlockThreshold = car.inIntersection ? 2.5 : 3.0;
      if (car.stuckTimer > deadlockThreshold) {
        deadlockedCars++;
        car.isHonking = true;
        car.hornEffectTimer = 0.3;

        // Smart Detour evaluation: check left vs right clearance around car
        let leftClearance = 100;
        let rightClearance = 100;
        const checkObstacles = vehGrid ? vehGrid.queryRadius(car.x, car.y, 85) : world.vehicles;
        for (const obs of checkObstacles) {
          if (obs.id === car.id) continue;
          const d = Math.hypot(obs.x - car.x, obs.y - car.y);
          const ang = Math.atan2(obs.y - car.y, obs.x - car.x);
          const diff = angleDiff(ang, car.angle);
          if (diff > 0 && d < leftClearance) leftClearance = d;
          if (diff < 0 && d < rightClearance) rightClearance = d;
        }

        const escapeDir = leftClearance >= rightClearance ? 1 : -1;

        car.aiState = 'reversing';
        car.reverseTimer = 1.6;
        car.recoveryTargetAngle = car.angle + escapeDir * (Math.PI / 2.5);
        car.recoverySteer = 0;
        car.stuckTimer = 0;
        car.ghostingAlpha = 0.5;
        car.speed = -32;
        trafficDiagnostics.log('deadlock', `Smart Detour: Car #${car.id.slice(-4)} evaluating bypass (${leftClearance >= rightClearance ? 'Left' : 'Right'} open)`, car.id);
      }
    } else {
      car.stuckTimer = Math.max(0, car.stuckTimer - dt * 2.0);
    }
  }

  if (vehiclesToDespawn.length > 0) {
    const despawnSet = new Set(vehiclesToDespawn);
    world.vehicles = world.vehicles.filter((v) => !despawnSet.has(v.id));
  }

  // Update telemetry stats
  trafficDiagnostics.averageSpeed = movingCars > 0 ? (totalSpeed / movingCars) * 0.36 : 0; // km/h
  trafficDiagnostics.gridlockCount = deadlockedCars;
}

// Update turn signal indicator and pre-planned turn when approaching intersections or standing at red lights (ПДД)
function updateTurnSignalAndIntent(car: Vehicle, world: GameWorld) {
  // If actively on a connection / in intersection
  if (car.currentConnection) {
    if (car.currentConnection.turnType === 'left' || car.currentConnection.turnType === 'turnaround') {
      car.turnSignal = 'left';
    } else if (car.currentConnection.turnType === 'right') {
      car.turnSignal = 'right';
    } else {
      car.turnSignal = 'none';
    }
    return;
  }

  // If cruising along a road lane
  const currentLane = findLaneById(world, car.currentLaneId);
  if (!currentLane || !currentLane.connections || currentLane.connections.length === 0) {
    car.turnSignal = 'none';
    car.plannedTurn = 'straight';
    return;
  }

  // Distance from vehicle to the end of the current lane / stop line
  const endWp = currentLane.waypoints[currentLane.waypoints.length - 1];
  const distToEnd = Math.hypot(endWp.x - car.x, endWp.y - car.y);

  // Turn signal activates 160px ahead of intersection, or when stopping/yielding at light
  if (distToEnd < 160 || car.aiState === 'stopping_light' || car.aiState === 'yielding') {
    // If turn has not been pre-selected yet or is straight, pick candidate
    if (currentLane.connections.length === 1) {
      const conn = currentLane.connections[0];
      car.plannedTurn = conn.turnType === 'turnaround' ? 'left' : conn.turnType;
    } else if (car.plannedTurn === 'straight') {
      // Pick based on car ID and lane properties
      const idNum = parseInt(car.id.replace(/\D/g, ''), 10) || 0;
      const seed = (idNum + Math.floor(endWp.x * 0.05 + endWp.y * 0.05)) % 10;
      const leftConn = currentLane.connections.find((c) => c.turnType === 'left');
      const rightConn = currentLane.connections.find((c) => c.turnType === 'right');
      
      if (rightConn && seed < 3) {
        car.plannedTurn = 'right';
      } else if (leftConn && seed >= 3 && seed < 6) {
        car.plannedTurn = 'left';
      } else {
        car.plannedTurn = 'straight';
      }
    }

    if (car.plannedTurn === 'left') {
      car.turnSignal = 'left';
    } else if (car.plannedTurn === 'right') {
      car.turnSignal = 'right';
    } else {
      car.turnSignal = 'none';
    }
  } else {
    // Cruising far from intersection
    car.turnSignal = 'none';
    car.plannedTurn = 'straight';
  }
}

// Transition vehicle onto its next connected lane or curve with anti-loop intelligence and load balancing
function advanceCarRoute(car: Vehicle, world: GameWorld) {
  // Case A: Finished an intersection connection or turnaround curve -> Enter target lane
  if (car.currentConnection) {
    const targetLane = findLaneById(world, car.currentConnection.targetLaneId);
    if (targetLane) {
      car.currentLaneId = targetLane.laneId;
      car.routeWaypoints = [...targetLane.waypoints];
      // Target waypoint index 1 ahead (end of lane), because waypoint index 0 is the entry point
      car.targetWaypointIndex = Math.min(targetLane.waypoints.length - 1, 1);
      // NOTE: Do not snap car.angle or car.steerAngle abruptly. Pure pursuit will naturally straighten wheels and smoothly align heading.
      car.currentConnection = null;
      car.inIntersection = false;
      car.plannedTurn = 'straight';
      car.turnSignal = 'none';
      trafficDiagnostics.totalPassedThrough++;
      return;
    }
  }

  // Case B: Reached end of current road lane -> Pick one of the connected options intelligently
  const currentLane = findLaneById(world, car.currentLaneId);
  if (currentLane && currentLane.connections && currentLane.connections.length > 0) {
    car.recentTurns = car.recentTurns || [];
    car.visitedIntersections = car.visitedIntersections || [];

    const now = performance.now() / 1000;
    // Clean old visited intersections (> 30s ago)
    car.visitedIntersections = car.visitedIntersections.filter((vi) => now - vi.time < 30);

    // Count recent turn patterns to prevent endless circular loops
    let consecutiveRights = 0;
    let consecutiveLefts = 0;
    let consecutiveStraights = 0;
    for (let i = car.recentTurns.length - 1; i >= 0; i--) {
      if (car.recentTurns[i] === 'right') consecutiveRights++;
      else break;
    }
    for (let i = car.recentTurns.length - 1; i >= 0; i--) {
      if (car.recentTurns[i] === 'left') consecutiveLefts++;
      else break;
    }
    for (let i = car.recentTurns.length - 1; i >= 0; i--) {
      if (car.recentTurns[i] === 'straight') consecutiveStraights++;
      else break;
    }

    let selectedConn = currentLane.connections[0];

    if (currentLane.connections.length > 1) {
      // Score each available connection based on route variety, loop avoidance, and lane capacity
      const scored = currentLane.connections.map((conn) => {
        let weight = 1.0;
        if (conn.turnType === 'straight') weight = 0.50;
        else if (conn.turnType === 'right') weight = 0.28;
        else if (conn.turnType === 'left') weight = 0.22;

        // Anti-Loop Rule 1: NEVER allow 3 or more consecutive right turns (breaks 1x1 block loops)
        if (conn.turnType === 'right' && consecutiveRights >= 2) {
          weight = 0.0;
        }
        // Anti-Loop Rule 2: NEVER allow 3 or more consecutive left turns
        if (conn.turnType === 'left' && consecutiveLefts >= 2) {
          weight = 0.0;
        }
        // Anti-Loop Rule 3: If car went straight 3 times in a row, encourage turning onto cross streets
        if (conn.turnType === 'straight' && consecutiveStraights >= 3) {
          weight = 0.08;
        }

        // Anti-Loop Rule 4: If this intersection was visited recently, avoid repeating the loop turn
        if (conn.intersectionId) {
          const pastVisits = car.visitedIntersections?.filter((vi) => vi.id === conn.intersectionId).length || 0;
          if (pastVisits > 0) {
            if (conn.turnType === 'straight') weight *= 3.0;
            else weight *= 0.15;
          }
        }

        // Anti-Loop Rule 5: If the car just came from a world boundary turnaround, strongly prefer turning onto a cross street
        if (car.justTurnedAround) {
          if (conn.turnType === 'right' || conn.turnType === 'left') {
            weight *= 4.5;
          } else {
            weight *= 0.05;
          }
        }

        // Capacity & Load Balancing Rule: check how many cars are on the target lane
        const carsOnTargetLane = world.vehicles.filter(
          (v) => !v.isParked && v.id !== car.id && v.currentLaneId === conn.targetLaneId
        ).length;
        if (carsOnTargetLane >= 2) weight *= 0.3;
        if (carsOnTargetLane >= 4) weight *= 0.02;

        return { conn, weight: Math.max(0.01, weight) };
      });

      const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0);
      let r = Math.random() * totalWeight;
      for (const s of scored) {
        if (r < s.weight) {
          selectedConn = s.conn;
          break;
        }
        r -= s.weight;
      }
    }

    // Stop Line Verification before stepping onto intersection connection
    if (selectedConn.intersectionId && selectedConn.stopLineDirection) {
      const inter = world.intersections.find((i) => i.id === selectedConn.intersectionId);
      if (inter) {
        const stopLine = inter.stopLines.find((sl) => sl.direction === selectedConn.stopLineDirection);
        let isPastLine = false;
        if (stopLine) {
          const midX = (stopLine.x1 + stopLine.x2) / 2;
          const midY = (stopLine.y1 + stopLine.y2) / 2;
          const dx = midX - car.x;
          const dy = midY - car.y;
          const headingToLine = Math.atan2(dy, dx);
          // If the stop line is significantly behind the vehicle's heading, we've already crossed it (e.g. from a maneuver)
          if (Math.hypot(dx, dy) > 8 && Math.abs(angleDiff(headingToLine, car.angle)) > Math.PI / 2) {
            isPastLine = true;
          }
        }
        
        const isLightBroken = inter.isSignalLost || world.props.some(
          (p) => p.type === 'traffic_light' &&
                 p.intersectionId === inter.id &&
                 p.direction === selectedConn.stopLineDirection &&
                 p.isBroken
        );

        if (!isPastLine && stopLine && !isLightBroken && (stopLine.lightState === 'red' || stopLine.lightState === 'yellow' || stopLine.lightState === 'red_yellow' || car.aiState === 'yielding')) {
          // Do not enter yet: hold at current stop line waypoint
          car.targetWaypointIndex = car.routeWaypoints.length - 1;
          car.speed = Math.max(0, car.speed * 0.5);
          car.targetSpeed = 0;
          car.aiState = stopLine.lightState === 'green' ? 'yielding' : 'stopping_light';
          return;
        }
      }
    }

    // Track turnaround state
    if (selectedConn.turnType === 'turnaround') {
      car.justTurnedAround = true;
    } else if (car.justTurnedAround && (selectedConn.turnType === 'left' || selectedConn.turnType === 'right')) {
      car.justTurnedAround = false;
    }

    if (selectedConn.intersectionId) {
      car.visitedIntersections.push({ id: selectedConn.intersectionId, time: now });
    }

    car.recentTurns.push(selectedConn.turnType);
    if (car.recentTurns.length > 8) car.recentTurns.shift();

    car.currentConnection = selectedConn;
    car.routeWaypoints = [...selectedConn.pathWaypoints];
    // Start tracking from waypoint 1 on connection curve, because waypoint 0 is where the car currently is
    car.targetWaypointIndex = Math.min(selectedConn.pathWaypoints.length - 1, 1);
    car.plannedTurn = selectedConn.turnType === 'turnaround' ? 'left' : (selectedConn.turnType as 'straight' | 'left' | 'right');
    car.inIntersection = selectedConn.turnType !== 'turnaround';
    return;
  }

  // Case C: Reacquire closest lane in world
  reacquireClosestLane(car, world);
}

// Reacquire closest valid aligned lane (Fallback safety net)
function reacquireClosestLane(car: Vehicle, world: GameWorld) {
  // 1. BOUNDARY SANCTUARY RECOVERY (x < 130, x > 3470, y < 130, y > 3470)
  if (car.x < 130) {
    const hRoad = world.roads
      .filter((r) => r.direction === 'horizontal')
      .sort((a, b) => Math.abs(a.y1 - car.y) - Math.abs(b.y1 - car.y))[0];
    if (hRoad) {
      const eLane = hRoad.lanePaths.find((lp) => Math.cos(lp.direction) > 0.5);
      if (eLane) {
        car.currentLaneId = eLane.laneId;
        car.routeWaypoints = [...eLane.waypoints];
        car.targetWaypointIndex = Math.min(eLane.waypoints.length - 1, 1);
        car.angle = eLane.direction;
        car.currentConnection = null;
        car.inIntersection = false;
        car.plannedTurn = 'straight';
        car.turnSignal = 'none';
        car.speed = Math.max(15, car.speed);
        return;
      }
    }
  }

  if (car.x > world.width - 130) {
    const hRoad = world.roads
      .filter((r) => r.direction === 'horizontal')
      .sort((a, b) => Math.abs(a.y1 - car.y) - Math.abs(b.y1 - car.y))[0];
    if (hRoad) {
      const wLane = hRoad.lanePaths.find((lp) => Math.cos(lp.direction) < -0.5);
      if (wLane) {
        car.currentLaneId = wLane.laneId;
        car.routeWaypoints = [...wLane.waypoints];
        car.targetWaypointIndex = Math.min(wLane.waypoints.length - 1, 1);
        car.angle = wLane.direction;
        car.currentConnection = null;
        car.inIntersection = false;
        car.plannedTurn = 'straight';
        car.turnSignal = 'none';
        car.speed = Math.max(15, car.speed);
        return;
      }
    }
  }

  if (car.y < 130) {
    const vRoad = world.roads
      .filter((r) => r.direction === 'vertical')
      .sort((a, b) => Math.abs(a.x1 - car.x) - Math.abs(b.x1 - car.x))[0];
    if (vRoad) {
      const sLane = vRoad.lanePaths.find((lp) => Math.sin(lp.direction) > 0.5);
      if (sLane) {
        car.currentLaneId = sLane.laneId;
        car.routeWaypoints = [...sLane.waypoints];
        car.targetWaypointIndex = Math.min(sLane.waypoints.length - 1, 1);
        car.angle = sLane.direction;
        car.currentConnection = null;
        car.inIntersection = false;
        car.plannedTurn = 'straight';
        car.turnSignal = 'none';
        car.speed = Math.max(15, car.speed);
        return;
      }
    }
  }

  if (car.y > world.height - 130) {
    const vRoad = world.roads
      .filter((r) => r.direction === 'vertical')
      .sort((a, b) => Math.abs(a.x1 - car.x) - Math.abs(b.x1 - car.x))[0];
    if (vRoad) {
      const nLane = vRoad.lanePaths.find((lp) => Math.sin(lp.direction) < -0.5);
      if (nLane) {
        car.currentLaneId = nLane.laneId;
        car.routeWaypoints = [...nLane.waypoints];
        car.targetWaypointIndex = Math.min(nLane.waypoints.length - 1, 1);
        car.angle = nLane.direction;
        car.currentConnection = null;
        car.inIntersection = false;
        car.plannedTurn = 'straight';
        car.turnSignal = 'none';
        car.speed = Math.max(15, car.speed);
        return;
      }
    }
  }

  // 2. GENERAL IN-CITY RECOVERY
  let bestCandidate: {
    lane: RoadSegment['lanePaths'][0];
    targetWpIndex: number;
    score: number;
  } | null = null;

  for (const road of world.roads) {
    for (const lane of road.lanePaths) {
      if (lane.waypoints.length === 0) continue;

      const laneCos = Math.cos(lane.direction);
      const laneSin = Math.sin(lane.direction);

      const headingDiff = Math.abs(angleDiff(lane.direction, car.angle));

      const pStart = lane.waypoints[0];
      const pEnd = lane.waypoints[lane.waypoints.length - 1];
      const segDx = pEnd.x - pStart.x;
      const segDy = pEnd.y - pStart.y;
      const segLenSq = segDx * segDx + segDy * segDy;
      if (segLenSq === 0) continue;

      const projRatio = ((car.x - pStart.x) * segDx + (car.y - pStart.y) * segDy) / segLenSq;
      const perpDist = Math.abs((car.x - pStart.x) * segDy - (car.y - pStart.y) * segDx) / Math.sqrt(segLenSq);

      let endPenalty = 0;
      if (projRatio > 1.05) endPenalty = (projRatio - 1.05) * 400;
      else if (projRatio < -0.2) endPenalty = (-0.2 - projRatio) * 100;

      const anglePenalty = headingDiff * 80;
      let totalScore = perpDist + anglePenalty + endPenalty;

      if (!bestCandidate || totalScore < bestCandidate.score) {
        let wpIdx = 0;
        let isPastEnd = false;
        for (let i = 0; i < lane.waypoints.length; i++) {
          const wp = lane.waypoints[i];
          const wpAhead = (wp.x - car.x) * laneCos + (wp.y - car.y) * laneSin;
          if (wpAhead > 5) {
            wpIdx = i;
            break;
          }
          wpIdx = i;
        }

        // If the car is past the last waypoint, heavily penalize this lane
        // so it prefers to pick the next road segment instead.
        if (wpIdx === lane.waypoints.length - 1) {
          const wp = lane.waypoints[wpIdx];
          const wpAhead = (wp.x - car.x) * laneCos + (wp.y - car.y) * laneSin;
          if (wpAhead <= 0) {
            totalScore += 2000;
          }
        }

        if (!bestCandidate || totalScore < bestCandidate.score) {
          bestCandidate = {
            lane,
            targetWpIndex: wpIdx,
            score: totalScore
          };
        }
      }
    }
  }

  if (bestCandidate) {
    const lane = bestCandidate.lane;
    car.currentLaneId = lane.laneId;
    car.routeWaypoints = [...lane.waypoints];
    car.targetWaypointIndex = bestCandidate.targetWpIndex;
    car.currentConnection = null;
    car.inIntersection = false;
    car.plannedTurn = 'straight';
    car.turnSignal = 'none';

    car.angle = lane.direction;
    // Removed the "pull towards waypoint" logic that was causing lateral/forward teleporting
  }
}

// Emergency Gridlock Flush Utility (called from Debug Console)
export function flushCityGridlocks(world: GameWorld) {
  let flushed = 0;
  for (const car of world.vehicles) {
    if (car.isPlayerControlled) continue;
    if (car.speed < 5 || car.stuckTimer > 0.5) {
      car.stuckTimer = 0;
      car.speed = 45;
      car.targetSpeed = 80;
      car.aiState = 'driving';
      flushed++;
    }
  }
  trafficDiagnostics.log('deadlock', `Manual Flush: Unblocked ${flushed} vehicles across the city`);
}

// Respawn Stalled Traffic to outer lanes
export function respawnStalledVehicles(world: GameWorld, playerPos?: Vector2D) {
  let respawned = 0;
  const pPos = playerPos || { x: 4400, y: 2800 };

  for (const car of world.vehicles) {
    if (car.isPlayerControlled || car.isParked) continue;
    // Genuinely stuck for more than 6.0 seconds
    if (car.stuckTimer > 6.0) {
      if (respawnCarNearPlayer(car, pPos, world)) {
        respawned++;
      } else {
        car.stuckTimer = 0;
        car.speed = 35;
        car.aiState = 'driving';
      }
    }
  }
  if (respawned > 0) {
    trafficDiagnostics.log('info', `Respawned ${respawned} stalled vehicles to open roads`);
  }
}

// Helper to compute crosswalk curb endpoints
function getCrosswalkEndpoints(
  inter: Intersection,
  cw: Intersection['crosswalks'][0]
): { p1: Vector2D; p2: Vector2D } {
  const halfW = inter.width / 2;
  const halfH = inter.height / 2;
  const cwWidth = 22;

  if (cw.direction === 'north') {
    const y = inter.y - halfH - cwWidth / 2;
    return {
      p1: { x: inter.x - halfW - 14, y }, // West curb
      p2: { x: inter.x + halfW + 14, y }  // East curb
    };
  } else if (cw.direction === 'south') {
    const y = inter.y + halfH + cwWidth / 2;
    return {
      p1: { x: inter.x - halfW - 14, y }, // West curb
      p2: { x: inter.x + halfW + 14, y }  // East curb
    };
  } else if (cw.direction === 'west') {
    const x = inter.x - halfW - cwWidth / 2;
    return {
      p1: { x, y: inter.y - halfH - 14 }, // North curb
      p2: { x, y: inter.y + halfH + 14 }  // South curb
    };
  } else {
    // East
    const x = inter.x + halfW + cwWidth / 2;
    return {
      p1: { x, y: inter.y - halfH - 14 }, // North curb
      p2: { x, y: inter.y + halfH + 14 }  // South curb
    };
  }
}

// Respawn / recycle a pedestrian to a sidewalk path near the player
function respawnPedestrianNearPlayer(ped: Pedestrian, targetPos: Vector2D, world: GameWorld) {
  if (!world.pedestrianPaths || world.pedestrianPaths.length === 0) return;

  // Filter paths with waypoints between 250px and 850px from player position
  const nearbyPaths = world.pedestrianPaths.filter((path) => {
    const wp = path.waypoints[0];
    if (!wp) return false;
    const d = Math.hypot(wp.x - targetPos.x, wp.y - targetPos.y);
    return d >= 250 && d <= 850;
  });

  const chosenPath = nearbyPaths.length > 0
    ? nearbyPaths[Math.floor(Math.random() * nearbyPaths.length)]
    : world.pedestrianPaths[Math.floor(Math.random() * world.pedestrianPaths.length)];

  if (!chosenPath || chosenPath.waypoints.length < 2) return;

  const wpIdx = Math.floor(Math.random() * (chosenPath.waypoints.length - 1));
  const wp1 = chosenPath.waypoints[wpIdx];
  const wp2 = chosenPath.waypoints[wpIdx + 1];
  const prog = Math.random();
  ped.x = wp1.x + (wp2.x - wp1.x) * prog;
  ped.y = wp1.y + (wp2.y - wp1.y) * prog;
  ped.angle = Math.atan2(wp2.y - wp1.y, wp2.x - wp1.x);

  // Generate new identity
  const app = generateRandomPedestrianAppearance();
  Object.assign(ped, app);
  
  ped.isCyclist = Math.random() < 0.08;
  ped.isScooter = !ped.isCyclist && Math.random() < 0.06;
  ped.hasDog = !ped.isCyclist && !ped.isScooter && Math.random() < 0.07;
  ped.isChild = ped.ageGroup === 'child';
  const isElderly = ped.ageGroup === 'elderly';
  ped.hasBackpack = Math.random() < 0.3;
  ped.backpackColor = app.shirtColor; // Or any random color
  
  ped.isJanitor = !ped.isCyclist && !ped.isScooter && !ped.isChild && !isElderly && Math.random() < 0.05;
  ped.hasBroom = ped.isJanitor;
  
  if (ped.isJanitor) {
    ped.shirtColor = '#ca8a04';
    ped.pantsColor = '#1e3a8a';
    ped.handheldProp = null;
  }
  
  const baseSpeed = ped.isCyclist ? 110 + Math.random() * 20 : (ped.isScooter ? 90 : (ped.isChild ? 35 : (isElderly ? 25 : (ped.isJanitor ? 20 : 40 + Math.random() * 10))));
  ped.vx = Math.cos(ped.angle) * baseSpeed;
  ped.vy = Math.sin(ped.angle) * baseSpeed;
  ped.speed = baseSpeed;
  ped.targetSpeed = baseSpeed;
  ped.state = 'walking';
  ped.isCrossingRoad = false;
  ped.waitingAtCurb = false;
  ped.isInsideBuilding = false;
  ped.targetPathId = chosenPath.id;
  ped.targetWaypointIndex = wpIdx + 1;
  ped.routeWaypoints = chosenPath.waypoints;
  ped.crosswalkCooldownTimer = 8;
  ped.alertBubbleText = null;
  ped.alertBubbleTimer = 0;
}

// Pedestrian AI & Navigation (Sidewalks, Crosswalks & Traffic Light Compliance)
export function updatePedestrians(
  world: GameWorld,
  dt: number,
  vehGrid?: SpatialGrid<Vehicle>,
  pedGrid?: SpatialGrid<Pedestrian>,
  bldGrid?: SpatialGrid<Building>,
  playerPos?: Vector2D
) {
  const isRaining = world.weather === 'rain' || world.weather === 'storm';
  const UMBRELLA_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const playerCar = world.vehicles.find((v) => v.isPlayerControlled);
  const targetPos: Vector2D = playerPos || (playerCar ? { x: playerCar.x, y: playerCar.y } : { x: 4400, y: 2800 });

  for (const ped of world.pedestrians) {
    // Keep pedestrians focused around the player's active area
    const distToPlayer = Math.hypot(ped.x - targetPos.x, ped.y - targetPos.y);
    if (distToPlayer > 1200) {
      respawnPedestrianNearPlayer(ped, targetPos, world);
      continue;
    }
    // A. Handle Inside Building state
    if (ped.isInsideBuilding) {
      ped.insideBuildingTimer = (ped.insideBuildingTimer ?? 0) - dt;
      if (ped.insideBuildingTimer <= 0) {
        // Exit building!
        ped.isInsideBuilding = false;
        ped.state = 'exiting_building';
        ped.exitingBuildingTimer = 1.5; // Walk outward for 1.5 seconds

        const bld = world.buildings.find((b) => b.id === ped.insideBuildingId);
        if (bld) {
          const entPos = getBuildingEntrancePos(bld);
          ped.x = entPos.x;
          ped.y = entPos.y;

          let outX = 0, outY = 0, exitAngle = 0;
          if (bld.entranceSide === 'north') { outY = -12; exitAngle = -Math.PI / 2; }
          else if (bld.entranceSide === 'south') { outY = 12; exitAngle = Math.PI / 2; }
          else if (bld.entranceSide === 'west') { outX = -12; exitAngle = Math.PI; }
          else if (bld.entranceSide === 'east') { outX = 12; exitAngle = 0; }
          ped.x += outX;
          ped.y += outY;
          ped.angle = exitAngle;

          const exitTexts = [
            "Ah, fresh air!",
            "What a busy day!",
            "Done with work!",
            "Time for a walk!",
            "Heading back home!",
            "That was nice!",
            "Back on the street!"
          ];
          ped.alertBubbleText = exitTexts[Math.floor(Math.random() * exitTexts.length)];
          ped.alertBubbleTimer = 1.5;
        } else {
          ped.state = 'walking';
        }
      }
      continue; // Skip normal simulation while inside
    }

    // B. Handle Exiting Building transition state
    if (ped.state === 'exiting_building') {
      ped.exitingBuildingTimer = (ped.exitingBuildingTimer ?? 0) - dt;
      ped.walkCycle += dt * 7;
      ped.targetSpeed = 35;
      
      // Keep walking in exit direction
      ped.speed = ped.targetSpeed;
      ped.vx = Math.cos(ped.angle) * ped.speed;
      ped.vy = Math.sin(ped.angle) * ped.speed;
      ped.x += ped.vx * dt;
      ped.y += ped.vy * dt;

      if (ped.exitingBuildingTimer <= 0) {
        ped.state = 'walking';
        ped.exitingBuildingTimer = undefined;

        // Find nearest sidewalk waypoint to join
        let bestPath = world.pedestrianPaths[0];
        let bestWpIndex = 0;
        let minD = 99999;
        for (const path of world.pedestrianPaths) {
          path.waypoints.forEach((wp, idx) => {
            const d = Math.hypot(ped.x - wp.x, ped.y - wp.y);
            if (d < minD) {
              minD = d;
              bestPath = path;
              bestWpIndex = idx;
            }
          });
        }
        if (bestPath) {
          ped.targetPathId = bestPath.id;
          ped.routeWaypoints = bestPath.waypoints;
          ped.targetWaypointIndex = (bestWpIndex + 1) % bestPath.waypoints.length;
        }
      }
      
      // Keep bounded within world
      ped.x = Math.max(15, Math.min(world.width - 15, ped.x));
      ped.y = Math.max(15, Math.min(world.height - 15, ped.y));
      continue; // Skip normal routing
    }

    // C. Handle Entering Building state (walking towards the doors)
    if (ped.state === 'entering_building') {
      const bld = world.buildings.find((b) => b.id === ped.insideBuildingId);
      if (bld) {
        const entPos = getBuildingEntrancePos(bld);
        const dx = entPos.x - ped.x;
        const dy = entPos.y - ped.y;
        const dist = Math.hypot(dx, dy);

        ped.angle = Math.atan2(dy, dx);
        ped.walkCycle += dt * 7;

        if (dist < 12) {
          // Reached doors! Hold at door, show bubble, then disappear
          ped.targetSpeed = 0;
          ped.enteringBuildingTimer = (ped.enteringBuildingTimer ?? 0.8) - dt;
          
          if (!ped.alertBubbleText) {
            const enterTexts = [
              "Going inside!",
              "Time for work!",
              "Let's go shopping!",
              "Entering home!",
              "Getting warm inside!",
              "Meeting starts soon!",
              "Need a coffee!"
            ];
            ped.alertBubbleText = enterTexts[Math.floor(Math.random() * enterTexts.length)];
            ped.alertBubbleTimer = 0.8;
          }

          if (ped.enteringBuildingTimer <= 0) {
            ped.isInsideBuilding = true;
            ped.insideBuildingTimer = 8 + Math.random() * 20; // Stay inside 8-28 seconds
            ped.enteringBuildingTimer = undefined;
          }
        } else {
          ped.targetSpeed = 38;
          ped.speed = ped.targetSpeed;
          ped.vx = Math.cos(ped.angle) * ped.speed;
          ped.vy = Math.sin(ped.angle) * ped.speed;
          ped.x += ped.vx * dt;
          ped.y += ped.vy * dt;
        }
      } else {
        ped.state = 'walking';
      }
      
      ped.x = Math.max(15, Math.min(world.width - 15, ped.x));
      ped.y = Math.max(15, Math.min(world.height - 15, ped.y));
      continue; // Skip normal routing
    }

    // D. Occasional decision to enter a building!
    if (ped.state === 'walking' && !ped.isCrossingRoad) {
      if (Math.random() < 0.002) {
        // Query nearby buildings with entrances
        const candidateBlds = bldGrid ? bldGrid.queryRadius(ped.x, ped.y, 120) : world.buildings;
        const nearbyBlds = candidateBlds.filter((b) => {
          if (b.type === 'park_monument' || !b.entranceSide) return false;
          const dist = Math.hypot(b.x + b.width / 2 - ped.x, b.y + b.height / 2 - ped.y);
          return dist < 120; // must be nearby
        });

        if (nearbyBlds.length > 0) {
          const chosenBld = nearbyBlds[Math.floor(Math.random() * nearbyBlds.length)];
          ped.state = 'entering_building';
          ped.insideBuildingId = chosenBld.id;
          ped.enteringBuildingTimer = 0.8;
          ped.targetSpeed = 38;
        }
      }
    }

    if (isRaining) {
      ped.hasUmbrella = true;
      if (!ped.umbrellaColor) {
        ped.umbrellaColor = UMBRELLA_COLORS[Math.floor(Math.random() * UMBRELLA_COLORS.length)];
      }
    } else {
      ped.hasUmbrella = false;
    }
    ped.walkCycle += dt * (ped.state === 'panicking' ? 14 : ped.state === 'waiting_light' ? 0 : 7);

    if (ped.crosswalkCooldownTimer > 0) {
      ped.crosswalkCooldownTimer -= dt;
    }

    if (ped.alertBubbleTimer > 0) {
      ped.alertBubbleTimer -= dt;
      if (ped.alertBubbleTimer <= 0) ped.alertBubbleText = null;
    }

    // 0. Occasional decision to perform idle behaviors (Checking phone, looking at window)
    if (ped.state === 'walking' && !ped.isCrossingRoad && (ped.behaviorTimer || 0) <= 0) {
      const roll = Math.random();
      if (roll < 0.001) {
        ped.state = 'idle_phone';
        ped.behaviorTimer = 3 + Math.random() * 5;
        ped.targetSpeed = 0;
      } else if (roll < 0.002) {
        // Look at nearest building
        const candidateBlds = bldGrid ? bldGrid.queryRadius(ped.x, ped.y, 60) : world.buildings;
        const nearbyBld = candidateBlds.find(b => Math.hypot(b.x + b.width/2 - ped.x, b.y + b.height/2 - ped.y) < 60);
        if (nearbyBld) {
          ped.state = 'idle_window';
          ped.behaviorTimer = 4 + Math.random() * 6;
          ped.targetSpeed = 0;
          // Face the building
          ped.angle = Math.atan2(nearbyBld.y + nearbyBld.height/2 - ped.y, nearbyBld.x + nearbyBld.width/2 - ped.x);
        }
      }
    }

    if ((ped.state === 'idle_phone' || ped.state === 'idle_window' || ped.state === 'greeting') && ped.behaviorTimer > 0) {
      ped.behaviorTimer -= dt;
      ped.targetSpeed = 0;
      if (ped.behaviorTimer <= 0) {
        ped.state = 'walking';
        ped.targetSpeed = (ped.isCyclist ? 120 : (ped.isScooter ? 100 : 38 + Math.random() * 10));
      }
    }

    // 0b. Social interaction: Greeting nearby pedestrians
    if (ped.state === 'walking' && !ped.isCrossingRoad && Math.random() < 0.01) {
      if (!ped.greetedIds) ped.greetedIds = [];
      const candidatePeds = pedGrid ? pedGrid.queryRadius(ped.x, ped.y, 40) : world.pedestrians;
      const otherPed = candidatePeds.find(p => p.id !== ped.id && p.state === 'walking' && !ped.greetedIds!.includes(p.id) && Math.hypot(p.x - ped.x, p.y - ped.y) < 40);
      if (otherPed && !otherPed.alertBubbleText) {
        if (!otherPed.greetedIds) otherPed.greetedIds = [];
        
        ped.state = 'greeting';
        ped.behaviorTimer = 2.0;
        const greetings = ["Morning!", "Hi!", "Hello!", "Hey, how's it going?", "Nice day!", "Long time no see!"];
        ped.alertBubbleText = greetings[Math.floor(Math.random() * greetings.length)];
        ped.alertBubbleTimer = 2.0;
        ped.greetedIds.push(otherPed.id);
        
        otherPed.state = 'greeting';
        otherPed.behaviorTimer = 2.0;
        const responses = ["Hey!", "Good day!", "Oh, hi!", "Doing well, thanks!", "Beautiful weather!"];
        otherPed.alertBubbleText = responses[Math.floor(Math.random() * responses.length)];
        otherPed.alertBubbleTimer = 2.0;
        otherPed.greetedIds.push(ped.id);
        
        // Face each other
        ped.angle = Math.atan2(otherPed.y - ped.y, otherPed.x - ped.x);
        otherPed.angle = Math.atan2(ped.y - otherPed.y, ped.x - otherPed.x);
      }
    }

    // 0c. Reaction to Car Horns
    const candidateVehicles = vehGrid ? vehGrid.queryRadius(ped.x, ped.y, 150) : world.vehicles;
    const honkingCar = candidateVehicles.find(v => v.isHonking && Math.hypot(v.x - ped.x, v.y - ped.y) < 150);
    if (honkingCar && !ped.alertBubbleText) {
      const reactions = ["Watch it!", "Hey!", "Quiet!", "Relax!", "!", "?", "Slow down!"];
      ped.alertBubbleText = reactions[Math.floor(Math.random() * reactions.length)];
      ped.alertBubbleTimer = 2.0;
      if (Math.hypot(honkingCar.x - ped.x, honkingCar.y - ped.y) < 60) {
        ped.state = 'panicking';
        ped.panicTimer = 1.0;
      }
    }

    // 1. Panic Detection: Speeding vehicle directly bearing down (< 36px)
    let dangerFound = false;
    const dangerCandidates = vehGrid ? vehGrid.queryRadius(ped.x, ped.y, 50) : world.vehicles;
    for (const car of dangerCandidates) {
      if (Math.abs(car.speed) > 65) {
        const dx = ped.x - car.x;
        const dy = ped.y - car.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 36) {
          const carHeadingCos = Math.cos(car.angle);
          const carHeadingSin = Math.sin(car.angle);
          const dot = dx * carHeadingCos + dy * carHeadingSin;

          if (dot > 0) {
            dangerFound = true;
            ped.state = 'panicking';
            ped.panicTimer = 1.5;
            ped.targetSpeed = 110;

            const sideAngle = car.angle + (dy * carHeadingCos - dx * carHeadingSin > 0 ? Math.PI / 2 : -Math.PI / 2);
            ped.angle = sideAngle;
            break;
          }
        }
      }
    }

    if (!dangerFound && ped.panicTimer > 0) {
      ped.panicTimer -= dt;
      if (ped.panicTimer <= 0) {
        ped.state = ped.isCrossingRoad ? 'crossing' : 'walking';
        ped.targetSpeed = 38;
      }
    }

    // 2. Crosswalk Discovery & Traffic Light Waiting Logic
    if (ped.state === 'walking' && !ped.isCrossingRoad && (ped.crosswalkCooldownTimer || 0) <= 0) {
      // Check if near any crosswalk curb
      for (const inter of world.intersections) {
        for (const cw of inter.crosswalks) {
          const { p1, p2 } = getCrosswalkEndpoints(inter, cw);
          const d1 = Math.hypot(ped.x - p1.x, ped.y - p1.y);
          const d2 = Math.hypot(ped.x - p2.x, ped.y - p2.y);

          if (d1 < 32 || d2 < 32) {
            const startCurb = d1 < d2 ? p1 : p2;
            const endCurb = d1 < d2 ? p2 : p1;

            // Check if walking generally towards the crosswalk
            const toCurbDx = startCurb.x - ped.x;
            const toCurbDy = startCurb.y - ped.y;
            const pedCos = Math.cos(ped.angle);
            const pedSin = Math.sin(ped.angle);
            const dot = toCurbDx * pedCos + toCurbDy * pedSin;

            if (dot >= -5) {
              // 15% chance to cross the street; otherwise stay on the block's sidewalk
              if (Math.random() < 0.15) {
                ped.targetCrosswalkId = cw.id;
                ped.crosswalkCooldownTimer = 75.0;
                const aimAngle = Math.atan2(endCurb.y - startCurb.y, endCurb.x - startCurb.x);

                if (cw.pedestrianSignal === 'wait') {
                  // Red pedestrian light: STOP at curb and wait
                  ped.state = 'waiting_light';
                  ped.waitingAtCurb = true;
                  ped.targetSpeed = 0;
                  ped.angle = aimAngle;
                  ped.routeWaypoints = [startCurb, endCurb];
                  ped.targetWaypointIndex = 1;
                } else {
                  // Green pedestrian light: Start crossing immediately
                  ped.state = 'crossing';
                  ped.isCrossingRoad = true;
                  ped.waitingAtCurb = false;
                  ped.targetSpeed = 48 + Math.random() * 6;
                  ped.routeWaypoints = [startCurb, endCurb];
                  ped.targetWaypointIndex = 1;
                  ped.angle = aimAngle;
                }
                break;
              } else {
                // Decided to stay on current sidewalk: cooldown to avoid re-triggering immediately
                ped.crosswalkCooldownTimer = 25.0;
              }
            }
          }
        }
        if (ped.state === 'waiting_light' || ped.state === 'crossing') break;
      }
    }

    // 3. Waiting at Curb for Green Pedestrian Light
    if (ped.state === 'waiting_light') {
      ped.targetSpeed = 0;
      let activeCw: Intersection['crosswalks'][0] | null = null;
      let targetInter: Intersection | null = null;

      for (const inter of world.intersections) {
        const found = inter.crosswalks.find((c) => c.id === ped.targetCrosswalkId);
        if (found) {
          activeCw = found;
          targetInter = inter;
          break;
        }
      }

      if (activeCw && targetInter) {
        const { p1, p2 } = getCrosswalkEndpoints(targetInter, activeCw);
        const d1 = Math.hypot(ped.x - p1.x, ped.y - p1.y);
        const d2 = Math.hypot(ped.x - p2.x, ped.y - p2.y);
        const startCurb = d1 < d2 ? p1 : p2;
        const endCurb = d1 < d2 ? p2 : p1;
        ped.angle = Math.atan2(endCurb.y - startCurb.y, endCurb.x - startCurb.x);

        if (activeCw.pedestrianSignal === 'walk') {
          // Light turned GREEN: Walk across crosswalk!
          ped.state = 'crossing';
          ped.isCrossingRoad = true;
          ped.waitingAtCurb = false;
          ped.targetSpeed = 45 + Math.random() * 8;
          ped.routeWaypoints = [startCurb, endCurb];
          ped.targetWaypointIndex = 1;
        }
      } else {
        ped.state = 'walking';
        ped.targetSpeed = 38;
      }
    }

    // 4. Crossing the Street along Zebra Stripes
    if (ped.state === 'crossing') {
      if (ped.routeWaypoints.length > 1) {
        const dest = ped.routeWaypoints[1];
        const dx = dest.x - ped.x;
        const dy = dest.y - ped.y;
        const dist = Math.hypot(dx, dy);

        const targetAngle = Math.atan2(dy, dx);
        let aDiff = (targetAngle - ped.angle) % (Math.PI * 2);
        if (aDiff < -Math.PI) aDiff += Math.PI * 2;
        if (aDiff > Math.PI) aDiff -= Math.PI * 2;
        ped.angle += aDiff * Math.min(1.0, 7.0 * dt);

        ped.targetSpeed = 45 + Math.random() * 6;

        if (dist < 16) {
          // Reached destination curb! Join sidewalk on the destination block
          ped.state = 'walking';
          ped.isCrossingRoad = false;
          ped.waitingAtCurb = false;
          ped.targetCrosswalkId = null;
          // Set substantial cooldown so pedestrian explores the new block rather than looping back
          ped.crosswalkCooldownTimer = 35.0;

          // Find closest sidewalk waypoint on the destination side
          let bestPath = world.pedestrianPaths[0];
          let bestWpIndex = 0;
          let minD = 99999;

          for (const path of world.pedestrianPaths) {
            path.waypoints.forEach((wp, idx) => {
              const d = Math.hypot(ped.x - wp.x, ped.y - wp.y);
              if (d < minD) {
                minD = d;
                bestPath = path;
                bestWpIndex = idx;
              }
            });
          }

          if (bestPath) {
            ped.targetPathId = bestPath.id;
            ped.routeWaypoints = bestPath.waypoints;
            // Advance to next waypoint along that block's sidewalk
            ped.targetWaypointIndex = (bestWpIndex + 1) % bestPath.waypoints.length;
            const nextWp = bestPath.waypoints[ped.targetWaypointIndex];
            if (nextWp) {
              ped.angle = Math.atan2(nextWp.y - ped.y, nextWp.x - ped.x);
            }
          }
        }
      }
    }

    // 5. Normal Sidewalk Walking
    if (ped.state === 'walking') {
      if (ped.routeWaypoints.length > 0) {
        const wp = ped.routeWaypoints[ped.targetWaypointIndex];
        if (wp) {
          const dx = wp.x - ped.x;
          const dy = wp.y - ped.y;
          const dist = Math.hypot(dx, dy);

          const targetAngle = Math.atan2(dy, dx);
          let aDiff = (targetAngle - ped.angle) % (Math.PI * 2);
          if (aDiff < -Math.PI) aDiff += Math.PI * 2;
          if (aDiff > Math.PI) aDiff -= Math.PI * 2;
          ped.angle += aDiff * Math.min(1.0, 7.0 * dt);

          if (dist < 18) {
            ped.targetWaypointIndex = (ped.targetWaypointIndex + 1) % ped.routeWaypoints.length;
          }
        }
      }
    }

    // Apply movement with smooth acceleration/deceleration (inertia)
    const accelRate = ped.isCyclist ? 60 : 80;
    const decelRate = ped.isCyclist ? 80 : 150; // Cyclists take longer to stop
    if (ped.speed < ped.targetSpeed) {
      ped.speed += accelRate * dt;
      if (ped.speed > ped.targetSpeed) ped.speed = ped.targetSpeed;
    } else if (ped.speed > ped.targetSpeed) {
      ped.speed -= decelRate * dt;
      if (ped.speed < ped.targetSpeed) ped.speed = ped.targetSpeed;
    }
    
    // Group dynamics: if in a group and walking normally, adjust speed towards group mates
    if (ped.groupId && ped.state === 'walking' && ped.targetSpeed > 0) {
      const groupMates = world.pedestrians.filter(p => p.groupId === ped.groupId && p.id !== ped.id);
      let avgSpeed = ped.speed;
      if (groupMates.length > 0) {
        let totalSpeed = ped.speed;
        let count = 1;
        for (const mate of groupMates) {
          totalSpeed += mate.speed;
          count++;
          // If a mate is falling behind, slow down a bit
          const distToMate = Math.hypot(mate.x - ped.x, mate.y - ped.y);
          if (distToMate > 40 && mate.speed < ped.speed) {
            ped.speed -= 20 * dt;
          }
        }
        // Slightly blend speed
        ped.speed = ped.speed * 0.95 + (totalSpeed / count) * 0.05;
      }
    }

    ped.vx = Math.cos(ped.angle) * ped.speed;
    ped.vy = Math.sin(ped.angle) * ped.speed;

    // Drop items if panicking
    if (ped.state === 'panicking' && ped.handheldProp && !ped.hasDroppedProp) {
      ped.hasDroppedProp = true;
      world.litter.push({
        id: `dropped_prop_${ped.id}_${Date.now()}`,
        x: ped.x,
        y: ped.y,
        vx: ped.vx * 0.5 + (Math.random() - 0.5) * 50,
        vy: ped.vy * 0.5 + (Math.random() - 0.5) * 50,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        type: ped.handheldProp,
        color: ped.propColor || '#ffffff',
        size: ped.handheldProp === 'box' ? 12 : (ped.handheldProp === 'phone' ? 4 : 6),
        isAirborne: true,
        airborneTimer: 0.5 + Math.random() * 0.5,
        altitude: 15,
        isGlowing: ped.handheldProp === 'phone'
      });
      // Remove prop from hand
      ped.handheldProp = null;
    }

    // Local Vehicle Avoidance
    let avoidForceX = 0;
    let avoidForceY = 0;
    if (ped.state === 'walking' || ped.state === 'crossing') {
      const lookaheadDist = 40;
      const lookaheadX = ped.x + Math.cos(ped.angle) * lookaheadDist;
      const lookaheadY = ped.y + Math.sin(ped.angle) * lookaheadDist;

      const nearbyCarsForAvoidance = vehGrid ? vehGrid.queryRadius(ped.x, ped.y, 60) : world.vehicles;
      for (const car of nearbyCarsForAvoidance) {
        if (car.isParked) continue;
        const dx = lookaheadX - car.x;
        const dy = lookaheadY - car.y;
        const dist = Math.hypot(dx, dy);

        const carHalfW = car.width / 2 + 10;
        const carHalfL = car.length / 2 + 10;
        const safetyDist = Math.hypot(carHalfL, carHalfW);
        if (dist < safetyDist) {
          const perpX = -Math.sin(ped.angle);
          const perpY = Math.cos(ped.angle);

          const carToPedDx = ped.x - car.x;
          const carToPedDy = ped.y - car.y;
          const sideDot = carToPedDx * perpX + carToPedDy * perpY;
          const steerDir = sideDot >= 0 ? 1 : -1;

          const strength = (1.0 - dist / safetyDist) * 45;
          avoidForceX += perpX * steerDir * strength;
          avoidForceY += perpY * steerDir * strength;
          break;
        }
      }
    }
    ped.vx += avoidForceX;
    ped.vy += avoidForceY;

    // 5b. Social Repulsion: Avoid other pedestrians
    for (const other of world.pedestrians) {
      if (other.id === ped.id || other.isInsideBuilding) continue;
      const dx = ped.x - other.x;
      const dy = ped.y - other.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 14 * 14 && distSq > 0.001) {
        const dist = Math.sqrt(distSq);
        const force = (14 - dist) * 1.5;
        ped.vx += (dx / dist) * force;
        ped.vy += (dy / dist) * force;
      }
    }

    // 5c. Smooth Monument & Fountain Obstacle Avoidance (glide around circular basins)
    const nearbyBldsForAvoidance = bldGrid ? bldGrid.queryRadius(ped.x, ped.y, 60) : world.buildings;
    for (const bld of nearbyBldsForAvoidance) {
      if (bld.type === 'park_monument') {
        const cx = bld.x + bld.width / 2;
        const cy = bld.y + bld.height / 2;
        const fountainSafeR = bld.width / 2 + 10;
        const dx = ped.x - cx;
        const dy = ped.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < fountainSafeR && dist > 0.001) {
          const push = (1.0 - dist / fountainSafeR) * 60;
          ped.vx += (dx / dist) * push;
          ped.vy += (dy / dist) * push;

          // Tangential glide around the perimeter
          const perpX = -dy / dist;
          const perpY = dx / dist;
          const dot = ped.vx * perpX + ped.vy * perpY;
          const sign = dot >= 0 ? 1 : -1;
          ped.vx += perpX * sign * 25;
          ped.vy += perpY * sign * 25;
        }
      }
    }

    // 5d. Slight wobbling / path variety
    if (ped.state === 'walking' || ped.state === 'crossing') {
      const wobble = Math.sin(ped.walkCycle * 0.5) * 5;
      const perpX = -Math.sin(ped.angle);
      const perpY = Math.cos(ped.angle);
      ped.vx += perpX * wobble;
      ped.vy += perpY * wobble;
    }

    let nextX = ped.x + ped.vx * dt;
    let nextY = ped.y + ped.vy * dt;

    // 6. Robust vehicle physical separation
    for (const car of world.vehicles) {
      const res = checkPedestrianVehicleCollision(nextX, nextY, 7.0, car);
      if (res.collided) {
        nextX = res.x;
        nextY = res.y;
      }
    }

    // 7. Collision with Buildings (Only when not crossing)
    if (!ped.isCrossingRoad) {
      const pedRadius = 6.0;
      for (const bld of world.buildings) {
        if (
          nextX + pedRadius > bld.x && nextX - pedRadius < bld.x + bld.width &&
          nextY + pedRadius > bld.y && nextY - pedRadius < bld.y + bld.height
        ) {
          const res = checkPedestrianBuildingCollision(nextX, nextY, pedRadius, bld);
          nextX = res.x;
          nextY = res.y;
        }
      }
    }

    // 7b. Collision with and Avoidance of Street Props (excluding broken ones)
    {
      const pedRadius = 6.0;
      for (const prop of world.props) {
        if (prop.isBroken) continue;

        let propRadius = 5.0;
        if (prop.type === 'bench') propRadius = 9.0;
        else if (prop.type === 'kiosk') propRadius = 16.0;
        else if (prop.type === 'mailbox') propRadius = 7.0;
        else if (prop.type === 'cone') propRadius = 4.0;
        else if (prop.type === 'trash_can') propRadius = 6.0;
        else if (prop.type === 'bus_stop') propRadius = 15.0;

        const dx = nextX - prop.x;
        const dy = nextY - prop.y;
        const dist = Math.hypot(dx, dy);
        const minDist = pedRadius + propRadius;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          nextX += (dx / dist) * overlap;
          nextY += (dy / dist) * overlap;
        }
      }
    }

    ped.x = Math.max(15, Math.min(world.width - 15, nextX));
    ped.y = Math.max(15, Math.min(world.height - 15, nextY));
  }
}

interface CandidateSpawn {
  lane: RoadSegment['lanePaths'][0];
  spawnX: number;
  spawnY: number;
  targetWpIndex: number;
  angle: number;
}

function getCandidateSpawnPoints(
  playerPos: Vector2D,
  world: GameWorld,
  minRadius = 600,
  maxRadius = 1400
): CandidateSpawn[] {
  const candidates: CandidateSpawn[] = [];

  for (const road of world.roads) {
    for (const lane of road.lanePaths) {
      if (lane.waypoints.length < 2) continue;
      const firstWp = lane.waypoints[0];
      const isForest = firstWp.x < 3800 && firstWp.y < 3800;
      if (isForest && Math.random() > 0.15) continue;

      for (let i = 0; i < lane.waypoints.length - 1; i++) {
        const wp1 = lane.waypoints[i];
        const wp2 = lane.waypoints[i + 1];
        const segDx = wp2.x - wp1.x;
        const segDy = wp2.y - wp1.y;
        const segLen = Math.hypot(segDx, segDy);
        if (segLen < 10) continue;

        const samples = [0.2, 0.5, 0.8];
        for (const prog of samples) {
          const px = wp1.x + segDx * prog;
          const py = wp1.y + segDy * prog;
          const dist = Math.hypot(px - playerPos.x, py - playerPos.y);

          if (dist >= minRadius && dist <= maxRadius) {
            candidates.push({
              lane,
              spawnX: px,
              spawnY: py,
              targetWpIndex: i + 1,
              angle: Math.atan2(segDy, segDx)
            });
          }
        }
      }
    }
  }

  return candidates;
}

function isSpawnPositionClear(x: number, y: number, world: GameWorld): boolean {
  for (const v of world.vehicles) {
    const dist = Math.hypot(v.x - x, v.y - y);
    const requiredDist = v.isParked ? 35 : 65;
    if (dist < requiredDist) {
      return false;
    }
  }
  return true;
}

function respawnCarNearPlayer(car: Vehicle, playerPos: Vector2D, world: GameWorld): boolean {
  const candidates = getCandidateSpawnPoints(playerPos, world, 600, 1400);

  if (candidates.length > 0) {
    for (let attempts = 0; attempts < 15; attempts++) {
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];

      if (isSpawnPositionClear(chosen.spawnX, chosen.spawnY, world)) {
        car.x = chosen.spawnX;
        car.y = chosen.spawnY;
        car.angle = chosen.angle;
        car.speed = 30 + Math.random() * 25;
        car.vx = Math.cos(car.angle) * car.speed;
        car.vy = Math.sin(car.angle) * car.speed;
        car.steerAngle = 0;
        car.currentLaneId = chosen.lane.laneId;
        car.routeWaypoints = [...chosen.lane.waypoints];
        car.targetWaypointIndex = chosen.targetWpIndex;
        car.currentConnection = null;
        car.inIntersection = false;
        car.aiState = 'driving';
        car.stuckTimer = 0;
        car.ghostingAlpha = 1.0;
        car.damage = createDefaultVehicleDamage(car.length, car.width);
        return true;
      }
    }
  }
  return false;
}

// Spawns a brand new AI vehicle dynamically near the player to keep the traffic density alive
export function spawnNewCarNearPlayer(playerPos: Vector2D, world: GameWorld): boolean {
  const candidates = getCandidateSpawnPoints(playerPos, world, 600, 1400);
  if (candidates.length === 0) return false;

  const carTypes: CarType[] = [
    'sedan', 'hatchback', 'pickup', 'sports', 'suv', 'taxi', 'police', 
    'fire_engine', 'fire_ladder', 'fire_rescue',
    'bus', 'bus_articulated', 'bus_minibus',
    'van', 'muscle', 
    'ambulance', 'ambulance_van', 'ambulance_suv',
    'truck_box', 'truck_dump', 'truck_tanker', 'truck_water', 'truck_flatbed', 'cement_mixer', 'garbage_truck'
  ];
  const cType = carTypes[Math.floor(Math.random() * carTypes.length)];
  const cfg = CAR_CONFIGS[cType];
  let color = CAR_PALETTE[Math.floor(Math.random() * CAR_PALETTE.length)];
  if (cType === 'taxi') color = '#eab308';
  else if (cType === 'police') color = '#0f172a';
  else if (cType === 'fire_engine' || cType === 'fire_ladder' || cType === 'fire_rescue') color = '#dc2626';
  else if (cType === 'bus' || cType === 'bus_articulated') color = '#eab308';
  else if (cType === 'bus_minibus') color = '#f59e0b';
  else if (cType === 'ambulance' || cType === 'ambulance_van' || cType === 'ambulance_suv') color = '#f8fafc';
  else if (cType === 'garbage_truck') color = '#16a34a';
  else if (cType === 'truck_dump') color = '#d97706';
  else if (cType === 'cement_mixer') color = '#2563eb';
  else if (cType === 'truck_box') color = '#0284c7';
  else if (cType === 'truck_water') color = '#0284c7';
  else if (cType === 'truck_tanker') color = '#0369a1';
  else if (cType === 'truck_flatbed') color = '#475569';

  const roofColor = (cType === 'police' || cType === 'ambulance' || cType === 'ambulance_van' || cType === 'ambulance_suv' || cType === 'fire_engine' || cType === 'fire_ladder' || cType === 'fire_rescue') ? '#f8fafc' : color;

  for (let attempts = 0; attempts < 15; attempts++) {
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    if (isSpawnPositionClear(chosen.spawnX, chosen.spawnY, world)) {
      const id = `veh_dynamic_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const speedVal = 30 + Math.random() * 25;

      world.vehicles.push({
        id,
        type: cType,
        x: chosen.spawnX,
        y: chosen.spawnY,
        vx: Math.cos(chosen.angle) * speedVal,
        vy: Math.sin(chosen.angle) * speedVal,
        angle: chosen.angle,
        steerAngle: 0,
        targetSteerAngle: 0,
        speed: speedVal,
        lateralVelocity: 0,
        angularVelocity: 0,
        isDrifting: false,
        driftFactor: 0,
        mass: cfg.mass,
        width: cfg.width,
        length: cfg.length,
        wheelBase: cfg.wheelBase,
        color,
        roofColor,
        headlightsOn: true,
        headlightMode: 'low',
        brakeLightsOn: false,
        isReversing: false,
        turnSignal: 'none',
        turnSignalTimer: 0,
        isParked: false,
        isPlayerControlled: false,
        targetSpeed: speedVal,
        currentLaneId: chosen.lane.laneId,
        targetWaypointIndex: chosen.targetWpIndex,
        routeWaypoints: [...chosen.lane.waypoints],
        currentConnection: null,
        inIntersection: false,
        plannedTurn: 'straight',
        aiState: 'driving',
        stuckTimer: 0,
        reverseTimer: 0,
        targetChaseVehicleId: null,
        ghostingAlpha: 1.0,
        honkTimer: 0,
        isHonking: false,
        hornEffectTimer: 0,
        damage: createDefaultVehicleDamage(cfg.length, cfg.width)
      });
      return true;
    }
  }
  return false;
}

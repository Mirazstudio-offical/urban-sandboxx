import { GameWorld, Intersection, RoadSegment, Vector2D, Vehicle } from './types';

// Helper to calculate Euclidean distance
export function getDistance(p1: Vector2D, p2: Vector2D): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

// Check if an individual vehicle is currently in an accident or severe crash/fire state
export function isVehicleInAccident(v: Vehicle): boolean {
  if (v.isPlayerControlled || v.isParked || v.id === 'evac_ambulance_special') {
    return false;
  }

  // Active hazard lights on a stopped/broken vehicle indicate an accident scene or breakdown
  if (v.turnSignal === 'hazard' && (v.aiState === 'stopping_obstacle' || Math.abs(v.speed) < 15)) {
    return true;
  }

  const dmg = v.damage;
  if (dmg) {
    if (
      dmg.isFullyBurnt ||
      !!dmg.engineFire ||
      !!dmg.fuelTankFire ||
      !!dmg.cabinFire ||
      !!dmg.underHoodSmolder ||
      !!dmg.engineSmoking ||
      dmg.frontCrumple > 1.8 ||
      dmg.rearCrumple > 1.8 ||
      dmg.leftDent > 1.8 ||
      dmg.rightDent > 1.8 ||
      dmg.frontLeftDent > 1.8 ||
      dmg.frontRightDent > 1.8
    ) {
      return true;
    }
  }

  const eng = v.engineState;
  if (eng) {
    if (eng.isSeized || eng.transmissionJammed || eng.engineHealth <= 15) {
      return true;
    }
  }

  return false;
}

export interface RoadBlockStatus {
  isBlocked: boolean;
  hasAccident: boolean;
  hasJam: boolean;
  blockedVehicles: Vehicle[];
}

/**
 * Checks if a road segment corridor between (x1, y1) and (x2, y2) has an accident or traffic jam
 * in EITHER direction ("ни в одну ни в другую сторону").
 */
export function isRoadSegmentBlocked(
  world: GameWorld,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): RoadBlockStatus {
  const minX = Math.min(x1, x2) - 45;
  const maxX = Math.max(x1, x2) + 45;
  const minY = Math.min(y1, y2) - 45;
  const maxY = Math.max(y1, y2) + 45;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { isBlocked: false, hasAccident: false, hasJam: false, blockedVehicles: [] };
  }

  const blockedVehicles: Vehicle[] = [];
  let stoppedCount = 0;
  let hasAccident = false;
  let hasJam = false;

  for (const v of world.vehicles) {
    if (v.isParked) continue;

    // Fast bounding box rejection
    if (v.x < minX || v.x > maxX || v.y < minY || v.y > maxY) continue;

    // Perpendicular projection along road centerline
    const t = ((v.x - x1) * dx + (v.y - y1) * dy) / lenSq;
    // Keep strictly between the two intersections (excluding the intersection boxes themselves)
    if (t < 0.06 || t > 0.94) continue;

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const distToCenterline = Math.hypot(v.x - projX, v.y - projY);

    // Corridor width: 85px covers both oncoming and outgoing lanes (both directions of travel)
    if (distToCenterline > 85) continue;

    const inAccident = isVehicleInAccident(v);
    const isCrawlingOrStopped = Math.abs(v.speed) < 16 && v.aiState !== 'stopping_light' && v.aiState !== 'yielding';
    const isStuck = (v.stuckTimer || 0) > 2.0 || v.aiState === 'stopping_obstacle';

    if (inAccident) {
      hasAccident = true;
      blockedVehicles.push(v);
    } else if (isStuck) {
      hasJam = true;
      blockedVehicles.push(v);
    } else if (isCrawlingOrStopped) {
      stoppedCount++;
      blockedVehicles.push(v);
      if (stoppedCount >= 2) {
        hasJam = true;
      }
    }
  }

  const isBlocked = hasAccident || hasJam;
  return { isBlocked, hasAccident, hasJam, blockedVehicles };
}

// Find closest intersection to a given point, optionally avoiding immediately blocked directions
function findClosestIntersection(
  point: Vector2D,
  intersections: Intersection[],
  world?: GameWorld
): Intersection | null {
  if (intersections.length === 0) return null;

  // Sort intersections by distance to point
  const sorted = [...intersections].sort((a, b) => {
    return getDistance(point, { x: a.x, y: a.y }) - getDistance(point, { x: b.x, y: b.y });
  });

  if (!world || sorted.length <= 1) {
    return sorted[0] || null;
  }

  // If closest intersection has an immediate crash or jam directly between point and it,
  // prefer the alternate intersection along the road to lead the car away from the hazard
  const first = sorted[0];
  const firstBlocked = isRoadSegmentBlocked(world, point.x, point.y, first.x, first.y);

  if (firstBlocked.isBlocked) {
    for (let i = 1; i < Math.min(4, sorted.length); i++) {
      const candidate = sorted[i];
      const candBlocked = isRoadSegmentBlocked(world, point.x, point.y, candidate.x, candidate.y);
      if (!candBlocked.isBlocked) {
        return candidate;
      }
    }
  }

  return first;
}

// Project point onto line segment
function projectPointOnSegment(p: Vector2D, a: Vector2D, b: Vector2D): { proj: Vector2D; t: number; dist: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) {
    return { proj: { x: a.x, y: a.y }, t: 0, dist: getDistance(p, a) };
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return { proj, t, dist: getDistance(p, proj) };
}

// Find direct connected neighbor intersections along roads
function getIntersectionNeighbors(
  current: Intersection,
  allIntersections: Intersection[],
  roads?: RoadSegment[]
): Intersection[] {
  const neighbors: Intersection[] = [];
  const neighborSet = new Set<string>();

  if (roads && roads.length > 0) {
    for (const road of roads) {
      const p1 = { x: road.x1, y: road.y1 };
      const p2 = { x: road.x2, y: road.y2 };
      const maxConnDist = Math.max(160, road.width * 1.5 + 40);

      const d1 = getDistance({ x: current.x, y: current.y }, p1);
      const d2 = getDistance({ x: current.x, y: current.y }, p2);

      // Check if current is near one end of the road
      if (d1 < maxConnDist || d2 < maxConnDist) {
        const targetEnd = d1 < maxConnDist ? p2 : p1;

        // Find the intersection closest to targetEnd
        let bestTarget: Intersection | null = null;
        let bestDist = maxConnDist;

        for (const other of allIntersections) {
          if (other.id === current.id) continue;
          const od = getDistance({ x: other.x, y: other.y }, targetEnd);
          if (od < bestDist) {
            bestDist = od;
            bestTarget = other;
          }
        }

        if (bestTarget && !neighborSet.has(bestTarget.id)) {
          neighborSet.add(bestTarget.id);
          neighbors.push(bestTarget);
        }
      }

      // Also check if both current and other lie along this road segment
      const projCurrent = projectPointOnSegment({ x: current.x, y: current.y }, p1, p2);
      if (projCurrent.dist < road.width / 2 + 40) {
        for (const other of allIntersections) {
          if (other.id === current.id || neighborSet.has(other.id)) continue;
          const projOther = projectPointOnSegment({ x: other.x, y: other.y }, p1, p2);
          if (projOther.dist < road.width / 2 + 40) {
            // Check if there is any intermediate intersection on this road between them
            const tMin = Math.min(projCurrent.t, projOther.t);
            const tMax = Math.max(projCurrent.t, projOther.t);
            if (tMax - tMin > 0.01) {
              let hasMid = false;
              for (const mid of allIntersections) {
                if (mid.id === current.id || mid.id === other.id) continue;
                const projMid = projectPointOnSegment({ x: mid.x, y: mid.y }, p1, p2);
                if (projMid.dist < road.width / 2 + 40 && projMid.t > tMin + 0.02 && projMid.t < tMax - 0.02) {
                  hasMid = true;
                  break;
                }
              }
              if (!hasMid) {
                neighborSet.add(other.id);
                neighbors.push(other);
              }
            }
          }
        }
      }
    }
  }

  // Fallback / supplement for city grid intersections:
  for (const other of allIntersections) {
    if (other.id === current.id || neighborSet.has(other.id)) continue;

    const isHoriz = Math.abs(other.y - current.y) < 55;
    const isVert = Math.abs(other.x - current.x) < 55;

    if (isHoriz || isVert) {
      const dist = getDistance({ x: current.x, y: current.y }, { x: other.x, y: other.y });
      if (dist < 4500) {
        let hasMid = false;
        const minX = Math.min(current.x, other.x) + 40;
        const maxX = Math.max(current.x, other.x) - 40;
        const minY = Math.min(current.y, other.y) + 40;
        const maxY = Math.max(current.y, other.y) - 40;

        for (const mid of allIntersections) {
          if (mid.id === current.id || mid.id === other.id) continue;
          if (isHoriz && Math.abs(mid.y - current.y) < 55 && mid.x > minX && mid.x < maxX) {
            hasMid = true;
            break;
          }
          if (isVert && Math.abs(mid.x - current.x) < 55 && mid.y > minY && mid.y < maxY) {
            hasMid = true;
            break;
          }
        }

        if (!hasMid) {
          neighborSet.add(other.id);
          neighbors.push(other);
        }
      }
    }
  }

  return neighbors;
}

// Helper to extract path waypoints along a road between two points/intersections
function getRoadWaypointsBetween(pA: Vector2D, pB: Vector2D, roads: RoadSegment[]): Vector2D[] {
  let bestRoad: RoadSegment | null = null;
  let bestDistSum = Infinity;

  for (const road of roads) {
    const p1 = { x: road.x1, y: road.y1 };
    const p2 = { x: road.x2, y: road.y2 };
    const d1A = getDistance(pA, p1);
    const d2B = getDistance(pB, p2);
    const d2A = getDistance(pA, p2);
    const d1B = getDistance(pB, p1);

    const sumForward = d1A + d2B;
    const sumReverse = d2A + d1B;
    const minSum = Math.min(sumForward, sumReverse);

    if (minSum < bestDistSum && minSum < Math.max(300, road.width * 2 + 100)) {
      bestDistSum = minSum;
      bestRoad = road;
    }
  }

  if (bestRoad && bestRoad.lanePaths && bestRoad.lanePaths.length > 0) {
    const lane = bestRoad.lanePaths[0];
    if (lane && lane.waypoints && lane.waypoints.length > 2) {
      const wps = [...lane.waypoints];
      // Check if waypoints run from pA to pB or reverse
      const startDist = getDistance(pA, wps[0]);
      const endDist = getDistance(pA, wps[wps.length - 1]);
      if (endDist < startDist) {
        wps.reverse();
      }
      return wps;
    }
  }

  return [pB];
}

// A* algorithm to compute path over intersection nodes avoiding traffic jams and accidents in either direction
export function calculateGpsRoute(world: GameWorld, start: Vector2D, end: Vector2D, ignoreBlocks: boolean = false): Vector2D[] {
  const directDist = getDistance(start, end);

  // If destination is very close (within 250px), direct line
  if (directDist < 250 || world.intersections.length < 2) {
    return [start, end];
  }

  const startInter = findClosestIntersection(start, world.intersections, world);
  const endInter = findClosestIntersection(end, world.intersections);

  if (!startInter || !endInter || startInter.id === endInter.id) {
    return [start, end];
  }

  // A* implementation
  const openSet = new Set<string>([startInter.id]);
  const cameFrom = new Map<string, Intersection>();

  const gScore = new Map<string, number>();
  gScore.set(startInter.id, 0);

  const fScore = new Map<string, number>();
  fScore.set(startInter.id, getDistance({ x: startInter.x, y: startInter.y }, { x: endInter.x, y: endInter.y }));

  const idToInter = new Map<string, Intersection>();
  world.intersections.forEach((i) => idToInter.set(i.id, i));

  while (openSet.size > 0) {
    // Get node in openSet with lowest fScore
    let currentId: string | null = null;
    let lowestF = Infinity;

    for (const id of openSet) {
      const score = fScore.get(id) ?? Infinity;
      if (score < lowestF) {
        lowestF = score;
        currentId = id;
      }
    }

    if (!currentId) break;

    if (currentId === endInter.id) {
      // Reconstruct path with curved road waypoints
      const interSequence: Intersection[] = [];
      let curr: Intersection | undefined = idToInter.get(endInter.id);

      while (curr) {
        interSequence.unshift(curr);
        curr = cameFrom.get(curr.id);
      }

      const detailedPath: Vector2D[] = [start];
      for (let i = 0; i < interSequence.length; i++) {
        const node = interSequence[i];
        if (i === 0) {
          detailedPath.push({ x: node.x, y: node.y });
        } else {
          const prev = interSequence[i - 1];
          const segmentWps = getRoadWaypointsBetween(
            { x: prev.x, y: prev.y },
            { x: node.x, y: node.y },
            world.roads
          );
          detailedPath.push(...segmentWps);
        }
      }
      detailedPath.push(end);
      return detailedPath;
    }

    openSet.delete(currentId);
    const currentInter = idToInter.get(currentId)!;
    const neighbors = getIntersectionNeighbors(currentInter, world.intersections, world.roads);

    for (const neighbor of neighbors) {
      const dist = getDistance({ x: currentInter.x, y: currentInter.y }, { x: neighbor.x, y: neighbor.y });

      // Check if this road segment in EITHER direction has an accident (авария) or traffic jam (затор)
      const roadBlock = isRoadSegmentBlocked(world, currentInter.x, currentInter.y, neighbor.x, neighbor.y);
      // Heavy penalty (500,000) guarantees A* completely routes cars around the accident/jam
      const blockPenalty = (roadBlock.isBlocked && !ignoreBlocks) ? 500000 : 0;

      const tentativeG = (gScore.get(currentId) ?? Infinity) + dist + blockPenalty;

      if (tentativeG < (gScore.get(neighbor.id) ?? Infinity)) {
        cameFrom.set(neighbor.id, currentInter);
        gScore.set(neighbor.id, tentativeG);
        const h = getDistance({ x: neighbor.x, y: neighbor.y }, { x: endInter.x, y: endInter.y });
        fScore.set(neighbor.id, tentativeG + h);
        openSet.add(neighbor.id);
      }
    }
  }

  // Fallback if pathfinding fails
  return [start, { x: startInter.x, y: startInter.y }, { x: endInter.x, y: endInter.y }, end];
}

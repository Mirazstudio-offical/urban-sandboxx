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

// Find direct connected neighbor intersections along roads (without skipping intermediate intersections)
function getIntersectionNeighbors(
  current: Intersection,
  allIntersections: Intersection[],
  roads?: RoadSegment[]
): Intersection[] {
  const neighbors: Intersection[] = [];
  const threshold = 1800; // max search threshold for adjacent intersections

  for (const other of allIntersections) {
    if (other.id === current.id) continue;

    // Check if aligned horizontally or vertically (within 50px tolerance)
    const isHoriz = Math.abs(other.y - current.y) < 50;
    const isVert = Math.abs(other.x - current.x) < 50;

    if (isHoriz || isVert) {
      const dist = getDistance({ x: current.x, y: current.y }, { x: other.x, y: other.y });
      if (dist < threshold) {
        // Ensure there is NO intermediate intersection between current and other
        let hasMid = false;
        const minX = Math.min(current.x, other.x) + 40;
        const maxX = Math.max(current.x, other.x) - 40;
        const minY = Math.min(current.y, other.y) + 40;
        const maxY = Math.max(current.y, other.y) - 40;

        for (const mid of allIntersections) {
          if (mid.id === current.id || mid.id === other.id) continue;
          if (isHoriz && Math.abs(mid.y - current.y) < 50 && mid.x > minX && mid.x < maxX) {
            hasMid = true;
            break;
          }
          if (isVert && Math.abs(mid.x - current.x) < 50 && mid.y > minY && mid.y < maxY) {
            hasMid = true;
            break;
          }
        }

        if (!hasMid) {
          // If roads are available, ensure road geometry actually exists between them
          if (roads && roads.length > 0) {
            const hasRoad = roads.some((r) => {
              if (isHoriz && r.direction === 'horizontal') {
                return (
                  Math.abs(r.y1 - current.y) < 60 &&
                  r.x1 <= Math.min(current.x, other.x) + 80 &&
                  r.x2 >= Math.max(current.x, other.x) - 80
                );
              }
              if (isVert && r.direction === 'vertical') {
                return (
                  Math.abs(r.x1 - current.x) < 60 &&
                  r.y1 <= Math.min(current.y, other.y) + 80 &&
                  r.y2 >= Math.max(current.y, other.y) - 80
                );
              }
              return false;
            });
            if (hasRoad) {
              neighbors.push(other);
            }
          } else {
            neighbors.push(other);
          }
        }
      }
    }
  }

  return neighbors;
}

// A* algorithm to compute path over intersection nodes avoiding traffic jams and accidents in either direction
export function calculateGpsRoute(world: GameWorld, start: Vector2D, end: Vector2D): Vector2D[] {
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
      // Reconstruct path
      const pathNodes: Vector2D[] = [];
      let curr: Intersection | undefined = idToInter.get(endInter.id);

      while (curr) {
        pathNodes.unshift({ x: curr.x, y: curr.y });
        curr = cameFrom.get(curr.id);
      }

      // Add actual start and end coordinates
      return [start, ...pathNodes, end];
    }

    openSet.delete(currentId);
    const currentInter = idToInter.get(currentId)!;
    const neighbors = getIntersectionNeighbors(currentInter, world.intersections, world.roads);

    for (const neighbor of neighbors) {
      const dist = getDistance({ x: currentInter.x, y: currentInter.y }, { x: neighbor.x, y: neighbor.y });

      // Check if this road segment in EITHER direction has an accident (авария) or traffic jam (затор)
      const roadBlock = isRoadSegmentBlocked(world, currentInter.x, currentInter.y, neighbor.x, neighbor.y);
      // Heavy penalty (500,000) guarantees A* completely routes cars around the accident/jam
      const blockPenalty = roadBlock.isBlocked ? 500000 : 0;

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

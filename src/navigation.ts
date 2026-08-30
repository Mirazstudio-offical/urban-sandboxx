import { GameWorld, Intersection, Vector2D } from './types';

// Helper to calculate Euclidean distance
export function getDistance(p1: Vector2D, p2: Vector2D): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

// Find closest intersection to a given point
function findClosestIntersection(point: Vector2D, intersections: Intersection[]): Intersection | null {
  if (intersections.length === 0) return null;
  let closest: Intersection | null = null;
  let minDistance = Infinity;

  for (const inter of intersections) {
    const d = getDistance(point, { x: inter.x, y: inter.y });
    if (d < minDistance) {
      minDistance = d;
      closest = inter;
    }
  }

  return closest;
}

// Find connected neighbor intersections along roads
function getIntersectionNeighbors(current: Intersection, allIntersections: Intersection[]): Intersection[] {
  const neighbors: Intersection[] = [];
  const threshold = 1800; // max distance between adjacent intersections

  for (const other of allIntersections) {
    if (other.id === current.id) continue;

    // Check if aligned horizontally or vertically (within 50px tolerance)
    const isHoriz = Math.abs(other.y - current.y) < 50;
    const isVert = Math.abs(other.x - current.x) < 50;

    if (isHoriz || isVert) {
      const dist = getDistance({ x: current.x, y: current.y }, { x: other.x, y: other.y });
      if (dist < threshold) {
        neighbors.push(other);
      }
    }
  }

  return neighbors;
}

// A* algorithm to compute path over intersection nodes
export function calculateGpsRoute(world: GameWorld, start: Vector2D, end: Vector2D): Vector2D[] {
  const directDist = getDistance(start, end);
  
  // If destination is very close (within 250px), direct line
  if (directDist < 250 || world.intersections.length < 2) {
    return [start, end];
  }

  const startInter = findClosestIntersection(start, world.intersections);
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
    const neighbors = getIntersectionNeighbors(currentInter, world.intersections);

    for (const neighbor of neighbors) {
      const dist = getDistance({ x: currentInter.x, y: currentInter.y }, { x: neighbor.x, y: neighbor.y });
      const tentativeG = (gScore.get(currentId) ?? Infinity) + dist;

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

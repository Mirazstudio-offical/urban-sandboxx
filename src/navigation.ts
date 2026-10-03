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

// Extract all centerline waypoints of a road segment
export function getRoadWaypoints(road: RoadSegment): Vector2D[] {
  if (road.curvePoints && road.curvePoints.length >= 2) {
    return road.curvePoints.map(p => ({ x: p.x, y: p.y }));
  }
  if (road.x1 !== undefined && road.y1 !== undefined && road.x2 !== undefined && road.y2 !== undefined) {
    return [{ x: road.x1, y: road.y1 }, { x: road.x2, y: road.y2 }];
  }
  return [];
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

// Check line segment intersection
function getLineIntersection(p1: Vector2D, p2: Vector2D, p3: Vector2D, p4: Vector2D): Vector2D | null {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 0.0001) return null;
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
  if (ua >= 0.001 && ua <= 0.999 && ub >= 0.001 && ub <= 0.999) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y)
    };
  }
  return null;
}

export interface NavGraphNode {
  id: string;
  x: number;
  y: number;
}

export interface NavGraphEdge {
  from: string;
  to: string;
  cost: number;
  road?: RoadSegment;
  waypoints: Vector2D[];
}

export interface BuiltNavGraph {
  nodes: Map<string, NavGraphNode>;
  adj: Map<string, NavGraphEdge[]>;
}

/**
 * Builds a complete road graph containing ALL road segments in world.roads,
 * automatically connecting endpoints, T-junctions, road crossings, and explicit intersections.
 */
export function buildRoadNavGraph(world: GameWorld, ignoreBlocks: boolean = false): BuiltNavGraph {
  const nodes = new Map<string, NavGraphNode>();
  const adj = new Map<string, NavGraphEdge[]>();
  const SNAP_DIST = 45; // max distance in px to snap nodes together into a unified junction

  let autoNodeIdCounter = 1;

  function getOrCreateNodeId(pt: Vector2D, preferredId?: string): string {
    if (preferredId && nodes.has(preferredId)) return preferredId;

    // Look for existing node close by
    for (const [id, node] of nodes.entries()) {
      if (getDistance(pt, node) < SNAP_DIST) {
        return id;
      }
    }

    const id = preferredId || `nav_node_${autoNodeIdCounter++}`;
    nodes.set(id, { id, x: pt.x, y: pt.y });
    adj.set(id, []);
    return id;
  }

  // 1. Add explicit intersections from world
  if (world.intersections) {
    for (const inter of world.intersections) {
      getOrCreateNodeId({ x: inter.x, y: inter.y }, inter.id);
    }
  }

  // 2. Prepare road waypoint sequences
  const roadsWithWps: { road: RoadSegment; wps: Vector2D[] }[] = [];
  if (world.roads && world.roads.length > 0) {
    for (const r of world.roads) {
      const wps = getRoadWaypoints(r);
      if (wps.length >= 2) {
        roadsWithWps.push({ road: r, wps });
      }
    }
  }

  // Record split points along each road (distance along road -> node ID)
  type SplitPoint = { distParam: number; nodeId: string; pt: Vector2D };
  const roadSplitPoints = new Map<RoadSegment, SplitPoint[]>();

  roadsWithWps.forEach(({ road }) => {
    roadSplitPoints.set(road, []);
  });

  // Calculate cumulative distances for a road's waypoints
  function getWpCumDists(wps: Vector2D[]): number[] {
    const cd = [0];
    for (let i = 1; i < wps.length; i++) {
      cd.push(cd[i - 1] + getDistance(wps[i - 1], wps[i]));
    }
    return cd;
  }

  // Helper to add a split point to a road
  function addSplitPoint(road: RoadSegment, cd: number[], segIdx: number, t: number, nodeId: string, pt: Vector2D) {
    const splits = roadSplitPoints.get(road);
    if (!splits) return;
    const distParam = cd[segIdx] + t * (cd[segIdx + 1] - cd[segIdx]);
    if (!splits.some(s => Math.abs(s.distParam - distParam) < 2)) {
      splits.push({ distParam, nodeId, pt });
    }
  }

  // 3. Process waypoints, endpoints, T-junctions, and crossings
  roadsWithWps.forEach(({ road, wps }) => {
    const cd = getWpCumDists(wps);

    // Endpoints and intermediate control points
    for (let i = 0; i < wps.length; i++) {
      const pt = wps[i];
      const nodeId = getOrCreateNodeId(pt);
      addSplitPoint(road, cd, Math.min(i, wps.length - 2), i === wps.length - 1 ? 1 : 0, nodeId, pt);
    }
  });

  // Check crossings and T-junctions between roads
  for (let i = 0; i < roadsWithWps.length; i++) {
    const { road: r1, wps: wps1 } = roadsWithWps[i];
    const cd1 = getWpCumDists(wps1);

    for (let j = i + 1; j < roadsWithWps.length; j++) {
      const { road: r2, wps: wps2 } = roadsWithWps[j];
      const cd2 = getWpCumDists(wps2);

      for (let s1 = 0; s1 < wps1.length - 1; s1++) {
        const p1 = wps1[s1], p2 = wps1[s1 + 1];
        for (let s2 = 0; s2 < wps2.length - 1; s2++) {
          const q1 = wps2[s2], q2 = wps2[s2 + 1];

          // Direct segment crossing
          const ix = getLineIntersection(p1, p2, q1, q2);
          if (ix) {
            const nodeId = getOrCreateNodeId(ix);
            const proj1 = projectPointOnSegment(ix, p1, p2);
            const proj2 = projectPointOnSegment(ix, q1, q2);
            addSplitPoint(r1, cd1, s1, proj1.t, nodeId, ix);
            addSplitPoint(r2, cd2, s2, proj2.t, nodeId, ix);
          } else {
            // T-junction check: endpoint of r1 on segment of r2
            if (s1 === 0 || s1 === wps1.length - 2) {
              const endPt = s1 === 0 ? p1 : p2;
              const proj = projectPointOnSegment(endPt, q1, q2);
              if (proj.dist < 50) {
                const nodeId = getOrCreateNodeId(endPt);
                addSplitPoint(r2, cd2, s2, proj.t, nodeId, proj.proj);
              }
            }
            if (s2 === 0 || s2 === wps2.length - 2) {
              const endPt = s2 === 0 ? q1 : q2;
              const proj = projectPointOnSegment(endPt, p1, p2);
              if (proj.dist < 50) {
                const nodeId = getOrCreateNodeId(endPt);
                addSplitPoint(r1, cd1, s1, proj.t, nodeId, proj.proj);
              }
            }
          }
        }
      }
    }
  }

  // 4. Build edges from sorted split points
  roadsWithWps.forEach(({ road, wps }) => {
    const splits = roadSplitPoints.get(road);
    if (!splits || splits.length < 2) return;

    splits.sort((a, b) => a.distParam - b.distParam);

    const surfaceMultiplier = road.isDirt ? 1.15 : (road.isGravel ? 1.08 : 1.0);

    for (let i = 0; i < splits.length - 1; i++) {
      const sA = splits[i];
      const sB = splits[i + 1];

      if (sA.nodeId === sB.nodeId) continue;

      const edgeWps: Vector2D[] = [sA.pt];

      const cd = getWpCumDists(wps);
      for (let w = 0; w < wps.length; w++) {
        if (cd[w] > sA.distParam + 0.1 && cd[w] < sB.distParam - 0.1) {
          edgeWps.push(wps[w]);
        }
      }
      edgeWps.push(sB.pt);

      let length = 0;
      for (let k = 1; k < edgeWps.length; k++) {
        length += getDistance(edgeWps[k - 1], edgeWps[k]);
      }

      if (length <= 0) continue;

      let blockPenalty = 0;
      const roadBlock = isRoadSegmentBlocked(world, sA.pt.x, sA.pt.y, sB.pt.x, sB.pt.y);
      if (roadBlock.isBlocked && !ignoreBlocks) {
        blockPenalty = 500000;
      }

      const cost = length * surfaceMultiplier + blockPenalty;

      const fwdEdge: NavGraphEdge = {
        from: sA.nodeId,
        to: sB.nodeId,
        cost,
        road,
        waypoints: edgeWps
      };
      adj.get(sA.nodeId)?.push(fwdEdge);

      const revEdge: NavGraphEdge = {
        from: sB.nodeId,
        to: sA.nodeId,
        cost,
        road,
        waypoints: [...edgeWps].reverse()
      };
      adj.get(sB.nodeId)?.push(revEdge);
    }
  });

  return { nodes, adj };
}

// Module-level graph cache
let cachedWorldRef: GameWorld | null = null;
let cachedGraphObj: BuiltNavGraph | null = null;
let cachedIgnoreBlocksState: boolean = false;

function getNavGraph(world: GameWorld, ignoreBlocks: boolean): BuiltNavGraph {
  if (cachedWorldRef === world && cachedGraphObj && cachedIgnoreBlocksState === ignoreBlocks) {
    return cachedGraphObj;
  }
  cachedGraphObj = buildRoadNavGraph(world, ignoreBlocks);
  cachedWorldRef = world;
  cachedIgnoreBlocksState = ignoreBlocks;
  return cachedGraphObj;
}

// Project point onto closest edge in graph
function projectPointOntoGraph(pt: Vector2D, graph: BuiltNavGraph): {
  nodeId: string;
  projPt: Vector2D;
  edge: NavGraphEdge;
  dist: number;
} | null {
  let bestDist = Infinity;
  let bestResult: { nodeId: string; projPt: Vector2D; edge: NavGraphEdge; dist: number } | null = null;

  for (const [, edges] of graph.adj.entries()) {
    for (const edge of edges) {
      const wps = edge.waypoints;
      for (let i = 0; i < wps.length - 1; i++) {
        const { proj, dist } = projectPointOnSegment(pt, wps[i], wps[i + 1]);
        if (dist < bestDist) {
          bestDist = dist;
          bestResult = {
            nodeId: edge.from,
            projPt: proj,
            edge,
            dist
          };
        }
      }
    }
  }

  return bestResult;
}

/**
 * High-precision A* algorithm to calculate navigation route along all roads in the game world.
 * Guarantees smooth road pathing without cutting through buildings or terrain.
 */
export function calculateGpsRoute(
  world: GameWorld,
  start: Vector2D,
  end: Vector2D,
  ignoreBlocks: boolean = false
): Vector2D[] {
  const directDist = getDistance(start, end);
  if (directDist < 30) {
    return [start, end];
  }

  if (!world.roads || world.roads.length === 0) {
    return [start, end];
  }

  const graph = getNavGraph(world, ignoreBlocks);

  if (graph.nodes.size === 0) {
    return [start, end];
  }

  const startProj = projectPointOntoGraph(start, graph);
  const endProj = projectPointOntoGraph(end, graph);

  if (!startProj || !endProj) {
    return [start, end];
  }

  const startNodeId = 'temp_start_node';
  const endNodeId = 'temp_end_node';

  const nodeMap = new Map(graph.nodes);
  nodeMap.set(startNodeId, { id: startNodeId, x: startProj.projPt.x, y: startProj.projPt.y });
  nodeMap.set(endNodeId, { id: endNodeId, x: endProj.projPt.x, y: endProj.projPt.y });

  const adjMap = new Map<string, NavGraphEdge[]>();
  for (const [id, edges] of graph.adj.entries()) {
    adjMap.set(id, [...edges]);
  }
  adjMap.set(startNodeId, []);
  adjMap.set(endNodeId, []);

  // Connect startNodeId to startProj's edge endpoints
  {
    const fromNode = graph.nodes.get(startProj.edge.from);
    const toNode = graph.nodes.get(startProj.edge.to);
    if (fromNode) {
      const dist = getDistance(startProj.projPt, fromNode);
      adjMap.get(startNodeId)?.push({
        from: startNodeId,
        to: fromNode.id,
        cost: dist,
        waypoints: [startProj.projPt, { x: fromNode.x, y: fromNode.y }]
      });
      adjMap.get(fromNode.id)?.push({
        from: fromNode.id,
        to: startNodeId,
        cost: dist,
        waypoints: [{ x: fromNode.x, y: fromNode.y }, startProj.projPt]
      });
    }
    if (toNode) {
      const dist = getDistance(startProj.projPt, toNode);
      adjMap.get(startNodeId)?.push({
        from: startNodeId,
        to: toNode.id,
        cost: dist,
        waypoints: [startProj.projPt, { x: toNode.x, y: toNode.y }]
      });
      adjMap.get(toNode.id)?.push({
        from: toNode.id,
        to: startNodeId,
        cost: dist,
        waypoints: [{ x: toNode.x, y: toNode.y }, startProj.projPt]
      });
    }
  }

  // Connect endNodeId to endProj's edge endpoints
  {
    const fromNode = graph.nodes.get(endProj.edge.from);
    const toNode = graph.nodes.get(endProj.edge.to);
    if (fromNode) {
      const dist = getDistance(fromNode, endProj.projPt);
      adjMap.get(fromNode.id)?.push({
        from: fromNode.id,
        to: endNodeId,
        cost: dist,
        waypoints: [{ x: fromNode.x, y: fromNode.y }, endProj.projPt]
      });
      adjMap.get(endNodeId)?.push({
        from: endNodeId,
        to: fromNode.id,
        cost: dist,
        waypoints: [endProj.projPt, { x: fromNode.x, y: fromNode.y }]
      });
    }
    if (toNode) {
      const dist = getDistance(toNode, endProj.projPt);
      adjMap.get(toNode.id)?.push({
        from: toNode.id,
        to: endNodeId,
        cost: dist,
        waypoints: [{ x: toNode.x, y: toNode.y }, endProj.projPt]
      });
      adjMap.get(endNodeId)?.push({
        from: endNodeId,
        to: toNode.id,
        cost: dist,
        waypoints: [endProj.projPt, { x: toNode.x, y: toNode.y }]
      });
    }
  }

  // A* Search
  const openSet = new Set<string>([startNodeId]);
  const cameFrom = new Map<string, { prevNodeId: string; edge: NavGraphEdge }>();

  const gScore = new Map<string, number>();
  gScore.set(startNodeId, 0);

  const endNodeObj = nodeMap.get(endNodeId)!;

  const fScore = new Map<string, number>();
  fScore.set(startNodeId, getDistance(startProj.projPt, endNodeObj));

  let bestReachedNodeId = startNodeId;
  let bestDistToEnd = getDistance(startProj.projPt, endNodeObj);

  while (openSet.size > 0) {
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

    const currNode = nodeMap.get(currentId);
    if (currNode) {
      const d = getDistance(currNode, endNodeObj);
      if (d < bestDistToEnd) {
        bestDistToEnd = d;
        bestReachedNodeId = currentId;
      }
    }

    if (currentId === endNodeId) {
      return reconstructPath(start, end, startNodeId, endNodeId, cameFrom);
    }

    openSet.delete(currentId);

    const edges = adjMap.get(currentId) || [];
    for (const edge of edges) {
      const neighborId = edge.to;
      const tentativeG = (gScore.get(currentId) ?? Infinity) + edge.cost;

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, { prevNodeId: currentId, edge });
        gScore.set(neighborId, tentativeG);
        const targetNode = nodeMap.get(endNodeId)!;
        const nNode = nodeMap.get(neighborId);
        const h = nNode ? getDistance(nNode, targetNode) : 0;
        fScore.set(neighborId, tentativeG + h);
        openSet.add(neighborId);
      }
    }
  }

  // Fallback if path to exact endNodeId was not found: return path to best reached node
  if (bestReachedNodeId !== startNodeId) {
    return reconstructPath(start, end, startNodeId, bestReachedNodeId, cameFrom);
  }

  return [start, startProj.projPt, endProj.projPt, end];
}

function reconstructPath(
  start: Vector2D,
  end: Vector2D,
  startNodeId: string,
  targetNodeId: string,
  cameFrom: Map<string, { prevNodeId: string; edge: NavGraphEdge }>
): Vector2D[] {
  const edgeSeq: NavGraphEdge[] = [];
  let curr = targetNodeId;

  while (curr !== startNodeId) {
    const entry = cameFrom.get(curr);
    if (!entry) break;
    edgeSeq.unshift(entry.edge);
    curr = entry.prevNodeId;
  }

  const rawWaypoints: Vector2D[] = [start];

  for (let i = 0; i < edgeSeq.length; i++) {
    const edge = edgeSeq[i];
    const wps = edge.waypoints;
    for (let k = 0; k < wps.length; k++) {
      rawWaypoints.push(wps[k]);
    }
  }

  rawWaypoints.push(end);

  // Clean up duplicate adjacent waypoints
  const cleaned: Vector2D[] = [];
  for (let i = 0; i < rawWaypoints.length; i++) {
    if (i === 0) {
      cleaned.push(rawWaypoints[i]);
    } else {
      const prev = cleaned[cleaned.length - 1];
      const currPt = rawWaypoints[i];
      if (getDistance(prev, currPt) > 3 || i === rawWaypoints.length - 1) {
        cleaned.push(currPt);
      }
    }
  }

  return cleaned;
}

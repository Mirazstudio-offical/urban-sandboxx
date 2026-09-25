const fs = require('fs');
const path = require('path');

const map = JSON.parse(fs.readFileSync('./public/map.json', 'utf8'));

// Mini A* test based on navigation.ts logic
function getDist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function projectPointOnSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return { proj: { x: a.x, y: a.y }, t: 0, dist: getDist(p, a) };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return { proj, t, dist: getDist(p, proj) };
}

function getIntersectionNeighbors(current, allIntersections, roads) {
  const neighbors = [];
  const neighborSet = new Set();

  if (roads && roads.length > 0) {
    for (const road of roads) {
      const p1 = { x: road.x1, y: road.y1 };
      const p2 = { x: road.x2, y: road.y2 };
      const maxConnDist = Math.max(160, road.width * 1.5 + 40);

      const d1 = getDist(current, p1);
      const d2 = getDist(current, p2);

      if (d1 < maxConnDist || d2 < maxConnDist) {
        const targetEnd = d1 < maxConnDist ? p2 : p1;
        let bestTarget = null;
        let bestDist = maxConnDist;

        for (const other of allIntersections) {
          if (other.id === current.id) continue;
          const od = getDist(other, targetEnd);
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

      const projCurrent = projectPointOnSegment(current, p1, p2);
      if (projCurrent.dist < road.width / 2 + 40) {
        for (const other of allIntersections) {
          if (other.id === current.id || neighborSet.has(other.id)) continue;
          const projOther = projectPointOnSegment(other, p1, p2);
          if (projOther.dist < road.width / 2 + 40) {
            const tMin = Math.min(projCurrent.t, projOther.t);
            const tMax = Math.max(projCurrent.t, projOther.t);
            if (tMax - tMin > 0.01) {
              let hasMid = false;
              for (const mid of allIntersections) {
                if (mid.id === current.id || mid.id === other.id) continue;
                const projMid = projectPointOnSegment(mid, p1, p2);
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

  // Grid fallback
  for (const other of allIntersections) {
    if (other.id === current.id || neighborSet.has(other.id)) continue;
    const isHoriz = Math.abs(other.y - current.y) < 55;
    const isVert = Math.abs(other.x - current.x) < 55;
    if (isHoriz || isVert) {
      const dist = getDist(current, other);
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

function findClosestIntersection(p) {
  let closest = map.intersections[0];
  let minD = getDist(p, closest);
  for (const i of map.intersections) {
    const d = getDist(p, i);
    if (d < minD) {
      minD = d;
      closest = i;
    }
  }
  return closest;
}

function testAStar(start, end, label) {
  const startNode = findClosestIntersection(start);
  const endNode = findClosestIntersection(end);

  const openSet = new Set([startNode.id]);
  const cameFrom = new Map();
  const gScore = new Map();
  gScore.set(startNode.id, 0);
  const fScore = new Map();
  fScore.set(startNode.id, getDist(startNode, endNode));

  const idMap = new Map();
  map.intersections.forEach(i => idMap.set(i.id, i));

  let found = false;
  while (openSet.size > 0) {
    let currId = null;
    let lowestF = Infinity;
    for (const id of openSet) {
      const score = fScore.get(id) ?? Infinity;
      if (score < lowestF) {
        lowestF = score;
        currId = id;
      }
    }
    if (!currId) break;

    if (currId === endNode.id) {
      found = true;
      break;
    }

    openSet.delete(currId);
    const currInter = idMap.get(currId);
    const neighbors = getIntersectionNeighbors(currInter, map.intersections, map.roads);

    for (const n of neighbors) {
      const dist = getDist(currInter, n);
      const tentG = (gScore.get(currId) ?? Infinity) + dist;
      if (tentG < (gScore.get(n.id) ?? Infinity)) {
        cameFrom.set(n.id, currInter);
        gScore.set(n.id, tentG);
        fScore.set(n.id, tentG + getDist(n, endNode));
        openSet.add(n.id);
      }
    }
  }

  if (found) {
    let count = 0;
    let cur = endNode;
    while (cur) {
      count++;
      cur = cameFrom.get(cur.id);
    }
    console.log(`[PASS] ${label}: Found route with ${count} intersection nodes! Total distance: ${Math.round(gScore.get(endNode.id))} px`);
  } else {
    console.error(`[FAIL] ${label}: NO ROUTE FOUND between ${startNode.id} and ${endNode.id}!`);
  }
}

console.log('Testing GPS routes:');
testAStar({ x: 2000, y: 2000 }, { x: 23600, y: 450 }, 'City -> Dead-End 1 North (Summit Sopka-7)');
testAStar({ x: 2000, y: 2000 }, { x: 24000, y: 18500 }, 'City -> Dead-End 2 Canyon (Deep Quarry)');
testAStar({ x: 2000, y: 2000 }, { x: 50800, y: 27500 }, 'City -> Dead-End 3 Far East (Border Gate)');
testAStar({ x: 23600, y: 450 }, { x: 24000, y: 18500 }, 'Dead-End 1 North -> Dead-End 2 Canyon');
testAStar({ x: 24000, y: 18500 }, { x: 50800, y: 27500 }, 'Dead-End 2 Canyon -> Dead-End 3 Far East');
testAStar({ x: 11400, y: 1200 }, { x: 50800, y: 27500 }, 'Polynovka Village -> Dead-End 3 Far East');

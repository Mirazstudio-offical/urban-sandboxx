import * as fs from 'fs';
import { getRiverWaterAt } from '../src/riverSystem';

interface Point {
  x: number;
  y: number;
}

interface Tree {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  shadowOffset: number;
  type?: 'deciduous' | 'pine' | 'birch';
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function run() {
  console.log("Loading public/map.json...");
  const rawMap = fs.readFileSync('public/map.json', 'utf8');
  const map = JSON.parse(rawMap);

  console.log("Total original trees on map:", map.trees.length);

  // Preserve existing city/steppe trees that are OUTSIDE of our regeneration forest zones
  // We regenerate:
  // 1. Far Northern Wilderness: Y < 0 for all X
  // 2. Logging Forest Zone: X >= 8000 && X < 18000 && Y < 3880
  // 3. City Greenery Zone: X < 8000 && Y >= 0 && Y < 800 (which we will regenerate sparsely)
  // Therefore, we keep original trees that are in:
  // - X < 8000 && Y >= 800 (deep city/steppe)
  // - X >= 18000 && Y >= 0 (eastern steppe)
  // - X >= 8000 && X < 18000 && Y >= 3880 (southern part below deep forest)
  const preservedTrees = map.trees.filter((t: any) => {
    if (t.y < 0) return false; // always regenerate north wilderness
    if (t.x < 8000) {
      return t.y >= 800; // keep deep city, regenerate top edge sparsely
    }
    if (t.x >= 8000 && t.x < 18000) {
      return t.y >= 3880; // keep deep southern steppe, regenerate logging zone
    }
    return t.y >= 0; // keep eastern steppe
  });

  console.log("Preserved untouched original trees:", preservedTrees.length);

  const newTrees: Tree[] = [];
  const forestStep = 60; // Beautiful dense grid spacing for deep taiga forest
  
  // Define coordinate bounds
  const minX = -4000;
  const maxX = 52000;
  const minY = -5000;

  // Collect all static obstacles from map to avoid spawning trees on them
  const roads = map.roads || [];
  const buildings = map.buildings || [];
  const parkings = map.parkings || [];
  const intersections = map.intersections || [];
  const roundabouts = map.roundabouts || [];

  console.log("Scanning and generating natural forests...");

  // Let's first generate the dense northern & eastern forests
  for (let gx = minX; gx <= maxX; gx += forestStep) {
    // Determine maximum Y coordinate for the dense forest at this X
    let maxForestY = 0;
    if (gx >= 8000 && gx < 18000) {
      maxForestY = 3880; // Deep forestry/logging zone goes down to steppe border
    } else {
      maxForestY = 0; // Far north wilderness ends at Y=0 (above the city & eastern steppe)
    }

    for (let gy = minY; gy <= maxForestY; gy += forestStep) {
      // Create rich organic multi-frequency mathematical noise for realistic forest clustering
      const n1 = Math.sin(gx * 0.001) * Math.cos(gy * 0.001);
      const n2 = Math.sin(gx * 0.0035 + gy * 0.002) * 0.4;
      const n3 = Math.sin(gx * 0.012) * Math.cos(gy * 0.008) * 0.15;
      const noiseVal = n1 + n2 + n3;
      const density = 0.58 + noiseVal * 0.35; // Dense forest with organic glades/clearings

      const spawnThresh = Math.abs(Math.sin(gx * 19.3 + gy * 11.7));
      if (spawnThresh > density) {
        continue;
      }

      // Add elegant physical jitter to break up grid-like appearance
      const jitterX = gx + (Math.sin(gx * 0.07 + gy * 0.03) * (forestStep * 0.42));
      const jitterY = gy + (Math.cos(gx * 0.05 - gy * 0.06) * (forestStep * 0.42));

      // 1. CLEARANCE FROM THE RIVER: Uses exact spline calculations!
      const waterInfo = getRiverWaterAt(jitterX, jitterY);
      if (waterInfo.inWater || waterInfo.distToCenter < (waterInfo.halfWidth + 45)) {
        continue;
      }

      // 2. CLEARANCE FROM ALL ROADS:
      let tooCloseToRoad = false;
      for (const r of roads) {
        const pts: Point[] = r.curvePoints || r.points || [];
        if (pts.length > 0) {
          for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const dist = distToSegment(jitterX, jitterY, p1.x, p1.y, p2.x, p2.y);
            const minAllowedDist = (r.width || 48) * 0.5 + 32;
            if (dist < minAllowedDist) {
              tooCloseToRoad = true;
              break;
            }
          }
        } else if (r.x1 !== undefined && r.y1 !== undefined && r.x2 !== undefined && r.y2 !== undefined) {
          const dist = distToSegment(jitterX, jitterY, r.x1, r.y1, r.x2, r.y2);
          const minAllowedDist = (r.width || 48) * 0.5 + 32;
          if (dist < minAllowedDist) {
            tooCloseToRoad = true;
          }
        }
        if (tooCloseToRoad) break;
      }

      if (tooCloseToRoad) continue;

      // 3. CLEARANCE FROM BUILDINGS:
      let tooCloseToBuilding = false;
      for (const b of buildings) {
        const bMargin = 32;
        if (
          jitterX >= b.x - bMargin &&
          jitterX <= b.x + b.width + bMargin &&
          jitterY >= b.y - bMargin &&
          jitterY <= b.y + b.height + bMargin
        ) {
          tooCloseToBuilding = true;
          break;
        }
      }

      if (tooCloseToBuilding) continue;

      // 4. CLEARANCE FROM OTHER ROAD INFRASTRUCTURE:
      let tooCloseToOther = false;
      for (const p of parkings) {
        const pMargin = 25;
        if (
          jitterX >= p.x - pMargin &&
          jitterX <= p.x + p.width + pMargin &&
          jitterY >= p.y - pMargin &&
          jitterY <= p.y + p.height + pMargin
        ) {
          tooCloseToOther = true;
          break;
        }
      }

      for (const inter of intersections) {
        const dist = Math.hypot(jitterX - inter.x, jitterY - inter.y);
        if (dist < 120) {
          tooCloseToOther = true;
          break;
        }
      }

      for (const round of roundabouts) {
        const dist = Math.hypot(jitterX - round.x, jitterY - round.y);
        if (dist < (round.radius || 150) + 40) {
          tooCloseToOther = true;
          break;
        }
      }

      if (tooCloseToOther) continue;

      // Determine tree type and radius based on deterministic coordinate patterns
      const typeSeed = Math.abs(Math.sin(jitterX * 23.3 + jitterY * 13.9));
      let type: 'pine' | 'birch' | 'deciduous' = 'pine';
      let color = '#124c2c'; // Default pine green
      
      if (typeSeed < 0.55) {
        type = 'pine';
        const colorSeed = (jitterX + jitterY) % 3;
        color = colorSeed === 0 ? '#0f3e24' : colorSeed === 1 ? '#124c2c' : '#165732';
      } else if (typeSeed < 0.85) {
        type = 'birch';
        const colorSeed = (jitterX + jitterY) % 3;
        color = colorSeed === 0 ? '#65a30d' : colorSeed === 1 ? '#84cc16' : '#4d7c0f';
      } else {
        type = 'deciduous';
        const colorSeed = (jitterX + jitterY) % 3;
        color = colorSeed === 0 ? '#15803d' : colorSeed === 1 ? '#166534' : '#1e663d';
      }

      const sizeSeed = Math.sin(jitterX * 11.5 - jitterY * 17.3);
      const radius = 15 + Math.floor(Math.abs(sizeSeed) * 16); // Natural size

      newTrees.push({
        id: `tree_north_taiga_${newTrees.length}`,
        x: Math.round(jitterX),
        y: Math.round(jitterY),
        radius,
        color,
        shadowOffset: 5, // GIVES TREES THEIR ESSENTIAL SHADOW!
        type
      });
    }
  }

  // Sparsely populate the top city edge (X < 8000, Y in [0, 800]) with elegant city trees
  console.log("Generating sparse, elegant urban trees for the northern city edge...");
  const cityStep = 180; // High spacing for neat, non-overwhelming urban greens
  for (let cx = minX; cx < 8000; cx += cityStep) {
    for (let cy = 0; cy < 800; cy += cityStep) {
      // 25% chance to spawn an urban tree at this spot
      const spawnSeed = Math.abs(Math.sin(cx * 41.3 + cy * 19.7));
      if (spawnSeed > 0.28) {
        continue;
      }

      const jitterX = cx + (Math.sin(cx * 0.15 + cy * 0.08) * (cityStep * 0.35));
      const jitterY = cy + (Math.cos(cx * 0.12 - cy * 0.14) * (cityStep * 0.35));

      // Guard against spawning on roads and other static elements
      let tooClose = false;
      
      // River clearance
      const waterInfo = getRiverWaterAt(jitterX, jitterY);
      if (waterInfo.inWater || waterInfo.distToCenter < (waterInfo.halfWidth + 40)) {
        continue;
      }

      // Roads clearance
      for (const r of roads) {
        const pts: Point[] = r.curvePoints || r.points || [];
        if (pts.length > 0) {
          for (let i = 0; i < pts.length - 1; i++) {
            const dist = distToSegment(jitterX, jitterY, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
            const limit = (r.width || 48) * 0.5 + 40;
            if (dist < limit) { tooClose = true; break; }
          }
        }
        if (tooClose) break;
      }
      if (tooClose) continue;

      // Buildings clearance (large margin of 45px for houses/yards)
      for (const b of buildings) {
        const margin = 45;
        if (
          jitterX >= b.x - margin &&
          jitterX <= b.x + b.width + margin &&
          jitterY >= b.y - margin &&
          jitterY <= b.y + b.height + margin
        ) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Other structures
      for (const p of parkings) {
        const margin = 35;
        if (
          jitterX >= p.x - margin &&
          jitterX <= p.x + p.width + margin &&
          jitterY >= p.y - margin &&
          jitterY <= p.y + p.height + margin
        ) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Determine elegant urban tree type (mostly nice birches and broadleaf trees)
      const typeSeed = Math.abs(Math.sin(jitterX * 17.7 + jitterY * 11.3));
      let type: 'pine' | 'birch' | 'deciduous' = 'birch';
      let color = '#84cc16';

      if (typeSeed < 0.55) {
        type = 'birch'; // Lovely white birches in the city
        color = '#84cc16';
      } else if (typeSeed < 0.85) {
        type = 'deciduous'; // Beautiful shade broadleaf trees
        color = '#15803d';
      } else {
        type = 'pine'; // Individual decorative pines
        color = '#165732';
      }

      const radius = 12 + Math.floor(Math.abs(Math.sin(jitterX * 7.1)) * 12); // Slightly smaller urban trees

      newTrees.push({
        id: `tree_city_edge_${newTrees.length}`,
        x: Math.round(jitterX),
        y: Math.round(jitterY),
        radius,
        color,
        shadowOffset: 5, // ESSENTIAL SHADOW
        type
      });
    }
  }

  // Merge preserved original trees with regenerated dense wilderness forest & sparse city trees
  map.trees = [...preservedTrees, ...newTrees];
  console.log(`Successfully generated:`);
  console.log(` - Preserved original trees: ${preservedTrees.length}`);
  console.log(` - New forest/wilderness/city trees: ${newTrees.length}`);
  console.log(` - Total final trees: ${map.trees.length}`);

  fs.writeFileSync('public/map.json', JSON.stringify(map, null, 2), 'utf8');
  console.log("public/map.json updated with correct tree structures, shadows, and boundaries!");
}

run();

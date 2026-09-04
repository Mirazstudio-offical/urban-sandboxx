import { generateCityWorld } from '../src/cityMap.js';
import { generateBuildingLayout, type BuildingLayout, type InteriorFurniture } from '../src/buildingInteriors.js';
import type { Building } from '../src/types.js';

interface TestResult {
  buildingId: string;
  buildingType: string;
  floor: number;
  sectionsCount: number;
  passed: boolean;
  errors: string[];
}

// Check if a point (px, py) with playerRadius is free from wall and solid furniture collisions
function isPositionWalkable(
  px: number,
  py: number,
  layout: BuildingLayout,
  playerRadius: number = 7.0
): boolean {
  const W = layout.width;
  const H = layout.height;

  // Check outer building boundary
  if (
    px - playerRadius < 7 ||
    px + playerRadius > W - 7 ||
    py - playerRadius < 7 ||
    py + playerRadius > H - 7
  ) {
    return false;
  }

  // Check internal walls
  for (const wall of layout.walls) {
    const x1 = wall.x1;
    const y1 = wall.y1;
    const x2 = wall.x2;
    const y2 = wall.y2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    const distSq = (px - closestX) * (px - closestX) + (py - closestY) * (py - closestY);
    if (distSq < (playerRadius + 0.5) * (playerRadius + 0.5)) {
      return false;
    }
  }

  // Check solid furniture (everything except carpets)
  for (const item of layout.furniture) {
    if (item.type === 'carpet') continue;

    const fx0 = item.x - playerRadius;
    const fx1 = item.x + item.width + playerRadius;
    const fy0 = item.y - playerRadius;
    const fy1 = item.y + item.height + playerRadius;

    if (px >= fx0 && px <= fx1 && py >= fy0 && py <= fy1) {
      return false;
    }
  }

  return true;
}

// BFS flood fill on a 2px resolution grid to test reachability between two points
function canPlayerNavigate(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  layout: BuildingLayout,
  targetRadius: number = 10
): boolean {
  const step = 2;
  const gridW = Math.ceil(layout.width / step);
  const gridH = Math.ceil(layout.height / step);

  const startGx = Math.round(startX / step);
  const startGy = Math.round(startY / step);
  const targetGx = Math.round(targetX / step);
  const targetGy = Math.round(targetY / step);

  if (startGx < 0 || startGx >= gridW || startGy < 0 || startGy >= gridH) return false;

  const visited = new Uint8Array(gridW * gridH);
  const queue: [number, number][] = [];

  // If exact start position is slightly off, check 3x3 adjacent points to find valid start
  let actualStart: [number, number] | null = null;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = startGx + dx;
      const gy = startGy + dy;
      if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) {
        if (isPositionWalkable(gx * step, gy * step, layout)) {
          actualStart = [gx, gy];
          break;
        }
      }
    }
    if (actualStart) break;
  }

  if (!actualStart) return false;

  visited[actualStart[1] * gridW + actualStart[0]] = 1;
  queue.push(actualStart);

  const targetDistSq = (targetRadius / step) * (targetRadius / step);

  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const dSq = (cx - targetGx) * (cx - targetGx) + (cy - targetGy) * (cy - targetGy);
    if (dSq <= targetDistSq) {
      return true;
    }

    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
        const idx = ny * gridW + nx;
        if (!visited[idx]) {
          visited[idx] = 1;
          if (isPositionWalkable(nx * step, ny * step, layout)) {
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  return false;
}

export function runResidentialLayoutTests(): TestResult[] {
  const city = generateCityWorld();
  const residentialBuildings = city.buildings.filter((b: Building) =>
    ['residential', 'panel_apartment', 'brick_residential', 'modern_residential'].includes(b.type)
  );

  console.log(`\n===============================================================`);
  console.log(`RUNNING RESIDENTIAL INTERIOR ACCESSIBILITY & LAYOUT TESTS`);
  console.log(`Testing ${residentialBuildings.length} residential buildings across floors 0..2`);
  console.log(`===============================================================\n`);

  const results: TestResult[] = [];
  let totalTests = 0;
  let passedTests = 0;

  for (const bld of residentialBuildings) {
    const rawEntrances = (bld.entrances && bld.entrances.length > 0)
      ? bld.entrances
      : [{ side: bld.entranceSide || 'south', offsetRatio: 0.5, number: 1 }];
    const expectedSections = rawEntrances.length;

    for (let floor = 0; floor <= 2; floor++) {
      totalTests++;
      const errors: string[] = [];
      const layout = generateBuildingLayout(bld, floor);

      // 1. Verify Entrance / Section Count
      if (layout.exits.length !== expectedSections) {
        errors.push(`Expected ${expectedSections} exits, got ${layout.exits.length}`);
      }
      if (layout.elevators.length !== expectedSections) {
        errors.push(`Expected ${expectedSections} elevators, got ${layout.elevators.length}`);
      }
      if (layout.stairs.length !== expectedSections) {
        errors.push(`Expected ${expectedSections} stairs, got ${layout.stairs.length}`);
      }

      // 2. Verify exactly 2 apartments per entrance section
      const aptRooms = layout.rooms.filter(r => r.name.startsWith('Кв. '));
      const expectedApts = expectedSections * 2;
      if (aptRooms.length !== expectedApts) {
        errors.push(`Expected ${expectedApts} apartments (${expectedSections} sections * 2), got ${aptRooms.length}`);
      }

      // 3. Verify Doorway Widths (Must be >= 33px)
      // Check hallway door gaps in walls
      const horizontalDoors = layout.walls.filter(w => w.y1 === w.y2);
      const verticalDoors = layout.walls.filter(w => w.x1 === w.x2);

      // 4. Test Navigation for each entrance section
      for (let s = 0; s < expectedSections; s++) {
        const exit = layout.exits[s];
        const elevator = layout.elevators[s];
        const stairs = layout.stairs[s];

        if (!exit || !elevator || !stairs) {
          errors.push(`Section ${s + 1} missing exit, elevator, or stairs zone.`);
          continue;
        }

        const exitCenterX = exit.x + exit.width / 2;
        const exitCenterY = exit.y + exit.height / 2;

        const elevatorCenterX = elevator.x + elevator.width / 2;
        const elevatorCenterY = elevator.y + elevator.height / 2;

        const stairsCenterX = stairs.x + stairs.width / 2;
        const stairsCenterY = stairs.y + stairs.height / 2;

        // Player spawn point near exit
        let spawnX = exitCenterX;
        let spawnY = exitCenterY;
        if (exit.x <= 10) {
          spawnX = exit.x + exit.width + 12;
        } else if (exit.x >= layout.width - 20) {
          spawnX = exit.x - 12;
        } else if (exit.y <= 10) {
          spawnY = exit.y + exit.height + 12;
        } else {
          spawnY = exit.y - 12;
        }

        // Can player reach elevator from exit?
        const canReachElevator = canPlayerNavigate(spawnX, spawnY, elevatorCenterX, elevatorCenterY, layout, 14);
        if (!canReachElevator) {
          errors.push(`Section ${s + 1}: Player cannot navigate from Exit to Elevator!`);
        }

        // Can player reach stairs from exit?
        const canReachStairs = canPlayerNavigate(spawnX, spawnY, stairsCenterX, stairsCenterY, layout, 14);
        if (!canReachStairs) {
          errors.push(`Section ${s + 1}: Player cannot navigate from Exit to Stairs!`);
        }

        // Can player enter Apartment 1 (Left / Top) in this section?
        const apt1Num = floor * (expectedSections * 2) + s * 2 + 1;
        const apt1 = layout.rooms.find(r => r.name === `Кв. ${apt1Num}`);
        if (apt1) {
          const apt1CenterX = apt1.x + apt1.width / 2;
          const apt1CenterY = apt1.y + apt1.height / 2;
          const canReachApt1 = canPlayerNavigate(spawnX, spawnY, apt1CenterX, apt1CenterY, layout, 20);
          if (!canReachApt1) {
            errors.push(`Section ${s + 1}: Player cannot navigate into Apartment ${apt1Num} through 33px door!`);
          }
        } else {
          errors.push(`Section ${s + 1}: Apartment ${apt1Num} not found.`);
        }

        // Can player enter Apartment 2 (Right / Bottom) in this section?
        const apt2Num = floor * (expectedSections * 2) + s * 2 + 2;
        const apt2 = layout.rooms.find(r => r.name === `Кв. ${apt2Num}`);
        if (apt2) {
          const apt2CenterX = apt2.x + apt2.width / 2;
          const apt2CenterY = apt2.y + apt2.height / 2;
          const canReachApt2 = canPlayerNavigate(spawnX, spawnY, apt2CenterX, apt2CenterY, layout, 20);
          if (!canReachApt2) {
            errors.push(`Section ${s + 1}: Player cannot navigate into Apartment ${apt2Num} through 33px door!`);
          }
        } else {
          errors.push(`Section ${s + 1}: Apartment ${apt2Num} not found.`);
        }

        // Verify section isolation: Player from section s must NOT be able to reach section s+1
        if (s + 1 < expectedSections) {
          const nextExit = layout.exits[s + 1];
          if (nextExit) {
            const nextSpawnX = nextExit.x + nextExit.width / 2;
            const nextSpawnY = nextExit.y < layout.height / 2 ? nextExit.y + nextExit.height + 12 : nextExit.y - 12;
            const canCrossSection = canPlayerNavigate(spawnX, spawnY, nextSpawnX, nextSpawnY, layout, 14);
            if (canCrossSection) {
              errors.push(`Isolation Violation: Player in Section ${s + 1} can walk across into Section ${s + 2}!`);
            }
          }
        }
      }

      const passed = errors.length === 0;
      if (passed) passedTests++;

      results.push({
        buildingId: bld.id,
        buildingType: bld.type,
        floor,
        sectionsCount: expectedSections,
        passed,
        errors
      });

      if (!passed) {
        console.error(`❌ FAIL: Building ${bld.id} (${bld.type}) Floor ${floor}:`);
        errors.forEach(e => console.error(`   - ${e}`));
      }
    }
  }

  console.log(`\n===============================================================`);
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`===============================================================\n`);

  return results;
}

// Run immediately if executed directly via node/tsx
runResidentialLayoutTests();

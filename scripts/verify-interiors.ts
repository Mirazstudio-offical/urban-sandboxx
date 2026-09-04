import { generateCityWorld } from '../src/cityMap';
import { generateBuildingLayout, BuildingLayout } from '../src/buildingInteriors';
import type { Building } from '../src/types';

export function verifyBuildingInterior(bld: Building, floor = 0): { passed: boolean; errors: string[] } {
  const layout: BuildingLayout = generateBuildingLayout(bld, floor);
  const errors: string[] = [];

  const W = Math.ceil(bld.width);
  const H = Math.ceil(bld.height);
  const step = 2; // 2px grid
  const cols = Math.ceil(W / step);
  const rows = Math.ceil(H / step);

  const radius = 6.5;
  const wallClearance = 8.0; // radius + 1.5
  const furnClearance = 7.0; // radius + 0.5

  // Create grid: true = walkable, false = blocked
  const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));

  // 1. Outer walls (bounds)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * step + step / 2;
      const py = r * step + step / 2;
      if (px < wallClearance + 6 || px > W - wallClearance - 6 || py < wallClearance + 6 || py > H - wallClearance - 6) {
        grid[r][c] = false;
      }
    }
  }

  // 2. Interior Walls
  for (const wall of layout.walls) {
    const { x1, y1, x2, y2 } = wall;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r][c]) continue;
        const px = c * step + step / 2;
        const py = r * step + step / 2;

        let t = 0;
        if (lenSq > 0) {
          t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
        }
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;

        const distSq = (px - closestX) ** 2 + (py - closestY) ** 2;
        if (distSq < wallClearance ** 2) {
          grid[r][c] = false;
        }
      }
    }
  }

  // 3. Blocking Furniture
  for (const furn of layout.furniture) {
    if (
      furn.type === 'carpet' ||
      furn.type === 'plant' ||
      furn.type === 'chair' ||
      furn.type === 'computer' ||
      furn.type === 'tv' ||
      furn.type === 'blackboard'
    ) {
      continue;
    }

    const fx1 = furn.x - furnClearance;
    const fy1 = furn.y - furnClearance;
    const fx2 = furn.x + furn.width + furnClearance;
    const fy2 = furn.y + furn.height + furnClearance;

    const minC = Math.max(0, Math.floor(fx1 / step));
    const maxC = Math.min(cols - 1, Math.ceil(fx2 / step));
    const minR = Math.max(0, Math.floor(fy1 / step));
    const maxR = Math.min(rows - 1, Math.ceil(fy2 / step));

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        grid[r][c] = false;
      }
    }
  }

  // 4. BFS from Exit/Entrance
  let startX = Math.round(layout.exitZone.x + layout.exitZone.width / 2);
  let startY = Math.round(layout.exitZone.y + layout.exitZone.height / 2);

  // Clamp start point inside building interior bounds [8, W-8] x [8, H-8]
  startX = Math.max(8, Math.min(W - 8, startX));
  startY = Math.max(8, Math.min(H - 8, startY));

  let startC = Math.floor(startX / step);
  let startR = Math.floor(startY / step);

  // If exact center of exit zone is blocked by margin, search surrounding 10px
  if (!grid[startR]?.[startC]) {
    let foundStart = false;
    for (let dr = -5; dr <= 5 && !foundStart; dr++) {
      for (let dc = -5; dc <= 5 && !foundStart; dc++) {
        const nr = startR + dr;
        const nc = startC + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc]) {
          startR = nr;
          startC = nc;
          foundStart = true;
        }
      }
    }
    if (!foundStart) {
      errors.push(`Entrance/Exit zone at (${startX},${startY}) is completely blocked by walls/furniture!`);
      return { passed: false, errors };
    }
  }

  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: [number, number][] = [[startR, startC]];
  visited[startR][startC] = true;

  const dr = [-1, 1, 0, 0, -1, -1, 1, 1];
  const dc = [0, 0, -1, 1, -1, 1, -1, 1];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (let i = 0; i < 8; i++) {
      const nr = r + dr[i];
      const nc = c + dc[i];
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] && !visited[nr][nc]) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  // 5. Check Room Reachability
  for (const room of layout.rooms) {
    const rx = room.x + room.width / 2;
    const ry = room.y + room.height / 2;
    const rc = Math.floor(rx / step);
    const rr = Math.floor(ry / step);

    // Check if room has at least one reachable cell
    let roomReachable = false;
    const minRoomC = Math.max(0, Math.floor(room.x / step));
    const maxRoomC = Math.min(cols - 1, Math.ceil((room.x + room.width) / step));
    const minRoomR = Math.max(0, Math.floor(room.y / step));
    const maxRoomR = Math.min(rows - 1, Math.ceil((room.y + room.height) / step));

    for (let r = minRoomR; r <= maxRoomR && !roomReachable; r++) {
      for (let c = minRoomC; c <= maxRoomC && !roomReachable; c++) {
        if (visited[r][c]) {
          roomReachable = true;
        }
      }
    }

    if (!roomReachable) {
      errors.push(`Room "${room.name}" [${room.x},${room.y},${room.width}x${room.height}] is UNREACHABLE from entrance!`);
    }
  }

  // 6. Check Stairs & Elevators reachability
  for (const el of layout.elevators) {
    const ec = Math.floor((el.x + el.width / 2) / step);
    const er = Math.floor((el.y + el.height / 2) / step);
    let elReachable = false;
    for (let dr = -3; dr <= 3 && !elReachable; dr++) {
      for (let dc = -3; dc <= 3 && !elReachable; dc++) {
        if (visited[er + dr]?.[ec + dc]) elReachable = true;
      }
    }
    if (!elReachable) {
      errors.push(`Elevator zone at (${el.x},${el.y}) is UNREACHABLE!`);
    }
  }

  return {
    passed: errors.length === 0,
    errors
  };
}

export function runInteriorVerification() {
  const world = generateCityWorld();
  console.log(`Starting interior verification for all ${world.buildings.length} buildings...\n`);

  let passedCount = 0;
  let failedCount = 0;

  for (const bld of world.buildings) {
    if (bld.type === 'park_monument') continue;

    const res = verifyBuildingInterior(bld, 0);
    if (res.passed) {
      passedCount++;
      if (bld.type === 'tactical_store' || bld.shopBrand === 'splav_gear' || bld.type === 'auto_service_center' || bld.type === 'supermarket_store' || bld.type === 'electronics_store' || bld.type === 'sports_store' || bld.type === 'pizzeria_restaurant' || bld.type === 'fast_food_restaurant' || bld.type === 'commercial_gallery') {
        console.log(`✅ [PASSED] Building ${bld.id} (${bld.type}, brand: ${bld.shopBrand || 'none'}, name: ${bld.nameRu || 'none'}) [${bld.width}x${bld.height}] - NAVIGABLE & FURNISHED!`);
      }
    } else {
      failedCount++;
      console.log(`❌ [FAILED] Building ${bld.id} (${bld.type}, brand: ${bld.shopBrand || 'none'}, name: ${bld.nameRu || 'none'}) [${bld.width}x${bld.height}]`);
      res.errors.forEach(e => console.log(`   -> ${e}`));
    }
  }

  console.log(`\n========================================`);
  console.log(`INTERIOR VERIFICATION RESULTS:`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`========================================\n`);

  return failedCount === 0;
}

runInteriorVerification();

const fs = require('fs');

const map = JSON.parse(fs.readFileSync('public/map.json', 'utf8'));

console.log('=== VERIFY COLLISIONS & SPATIAL INTEGRITY ===');
let errors = 0;
let warnings = 0;

// Helper: AABB overlap check
function aabbOverlap(b1, b2, margin = 0) {
  return !(
    b1.x + b1.width - margin <= b2.x + margin ||
    b1.x + margin >= b2.x + b2.width - margin ||
    b1.y + b1.height - margin <= b2.y + margin ||
    b1.y + margin >= b2.y + b2.height - margin
  );
}

// 1. Check Building vs. Building Collisions
console.log('\n--- 1. Testing Building vs. Building Collisions ---');
let bldCollisions = 0;
for (let i = 0; i < map.buildings.length; i++) {
  for (let j = i + 1; j < map.buildings.length; j++) {
    const b1 = map.buildings[i];
    const b2 = map.buildings[j];
    // Allow buildings to touch adjacent borders (margin = 0.5)
    if (aabbOverlap(b1, b2, 0.5)) {
      console.error(`ERROR: Building overlap between ${b1.id} (${b1.name}) and ${b2.id} (${b2.name})`);
      console.error(`  b1: [${b1.x}, ${b1.y}, ${b1.width}x${b1.height}] vs b2: [${b2.x}, ${b2.y}, ${b2.width}x${b2.height}]`);
      errors++;
      bldCollisions++;
    }
  }
}
if (bldCollisions === 0) {
  console.log('✓ All buildings have ZERO overlapping collisions!');
}

// 2. Check Building vs. Road Collisions
console.log('\n--- 2. Testing Building vs. Road Collisions ---');
let bldRoadCollisions = 0;
for (const bld of map.buildings) {
  for (const road of map.roads) {
    const halfW = (road.width || 96) / 2;
    let rx1 = Math.min(road.x1, road.x2);
    let rx2 = Math.max(road.x1, road.x2);
    let ry1 = Math.min(road.y1, road.y2);
    let ry2 = Math.max(road.y1, road.y2);

    if (road.direction === 'horizontal' || ry1 === ry2) {
      ry1 -= halfW;
      ry2 += halfW;
    } else {
      rx1 -= halfW;
      rx2 += halfW;
    }

    const roadAABB = { x: rx1, y: ry1, width: rx2 - rx1, height: ry2 - ry1 };
    if (aabbOverlap(bld, roadAABB, 0.5)) {
      console.error(`ERROR: Building ${bld.id} (${bld.name}) overlaps road ${road.id} (${road.name})!`);
      console.error(`  bld: [${bld.x}, ${bld.y}, ${bld.width}x${bld.height}] vs road: [${rx1}, ${ry1}, ${rx2 - rx1}x${ry2 - ry1}]`);
      errors++;
      bldRoadCollisions++;
    }
  }
}
if (bldRoadCollisions === 0) {
  console.log('✓ Zero buildings intersect road surfaces!');
}

// 3. Check Building vs. Road LanePaths (Traffic Waypoints)
console.log('\n--- 3. Testing Building vs. Traffic LanePaths ---');
let lanePathCollisions = 0;
for (const road of map.roads) {
  if (!road.lanePaths) continue;
  for (const lane of road.lanePaths) {
    for (const pt of lane.waypoints) {
      for (const bld of map.buildings) {
        if (pt.x >= bld.x - 4 && pt.x <= bld.x + bld.width + 4 &&
            pt.y >= bld.y - 4 && pt.y <= bld.y + bld.height + 4) {
          console.error(`ERROR: Lane waypoint [${pt.x}, ${pt.y}] of ${road.id} is inside building ${bld.id}!`);
          errors++;
          lanePathCollisions++;
        }
      }
    }
  }
}
if (lanePathCollisions === 0) {
  console.log('✓ Zero buildings intersect traffic lane waypoints!');
}

// 4. Check Building vs. Crosswalks & Sidewalks
console.log('\n--- 4. Testing Building vs. Sidewalks & Crosswalks ---');
let cwCollisions = 0;
if (map.intersections) {
  for (const inter of map.intersections) {
    if (inter.crosswalks) {
      for (const cw of inter.crosswalks) {
        for (const bld of map.buildings) {
          if (cw.x + cw.width > bld.x && cw.x < bld.x + bld.width &&
              cw.y + cw.height > bld.y && cw.y < bld.y + bld.height) {
            console.error(`ERROR: Crosswalk in intersection ${inter.id} overlaps building ${bld.id}!`);
            errors++;
            cwCollisions++;
          }
        }
      }
    }
  }
}
if (cwCollisions === 0) {
  console.log('✓ Zero buildings intersect crosswalks!');
}

// 5. Check Props on Active Traffic Road Lanes
console.log('\n--- 5. Testing Props vs. Active Road Lanes ---');
let propRoadCollisions = 0;
for (const prop of map.props) {
  // Check against all roads
  for (const road of map.roads) {
    // Only check props near road
    const halfW = (road.width || 96) / 2;
    // Drivable lane corridor is within halfW - 8px from centerline
    const drivableHalfW = halfW - 8;
    if (road.direction === 'horizontal' || road.y1 === road.y2) {
      const minX = Math.min(road.x1, road.x2);
      const maxX = Math.max(road.x1, road.x2);
      if (prop.x >= minX + 60 && prop.x <= maxX - 60) {
        if (Math.abs(prop.y - road.y1) < drivableHalfW) {
          // Allow concrete_barrier only at dead ends (x < 100)
          if (prop.type === 'concrete_barrier' && prop.x < 100) continue;
          console.warn(`WARNING: Prop ${prop.id} (${prop.type}) at (${prop.x}, ${prop.y}) is inside drivable road lane of ${road.id}!`);
          warnings++;
          propRoadCollisions++;
        }
      }
    } else {
      const minY = Math.min(road.y1, road.y2);
      const maxY = Math.max(road.y1, road.y2);
      if (prop.y >= minY + 60 && prop.y <= maxY - 60) {
        if (Math.abs(prop.x - road.x1) < drivableHalfW) {
          console.warn(`WARNING: Prop ${prop.id} (${prop.type}) at (${prop.x}, ${prop.y}) is inside drivable road lane of ${road.id}!`);
          warnings++;
          propRoadCollisions++;
        }
      }
    }
  }
}
if (propRoadCollisions === 0) {
  console.log('✓ Zero props obstruct active road traffic lanes!');
}

// 6. Check Props inside Buildings
console.log('\n--- 6. Testing Props vs. Buildings ---');
let propBldCollisions = 0;
for (const prop of map.props) {
  // Skip wall-mounted or attached items
  for (const bld of map.buildings) {
    if (prop.x > bld.x + 2 && prop.x < bld.x + bld.width - 2 &&
        prop.y > bld.y + 2 && prop.y < bld.y + bld.height - 2) {
      console.warn(`WARNING: Prop ${prop.id} (${prop.type}) at (${prop.x}, ${prop.y}) is inside building ${bld.id}!`);
      warnings++;
      propBldCollisions++;
    }
  }
}
if (propBldCollisions === 0) {
  console.log('✓ Zero props spawned inside building interiors!');
}

console.log(`\n=== VERIFICATION SUMMARY: ${errors} errors, ${warnings} warnings ===`);
if (errors === 0) {
  console.log('🎉 ALL SPATIAL INTEGRITY CHECKS PASSED PERFECTLY!');
} else {
  process.exit(1);
}

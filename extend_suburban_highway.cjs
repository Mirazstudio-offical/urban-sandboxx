const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public', 'map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('--- EXTENDING SUBURBAN HIGHWAY NETWORK ---');
console.log('Initial map bounds:', map.width, 'x', map.height);
console.log('Initial roads count:', map.roads.length);

// 1. Expand world dimensions to 52000 x 30000 (52 km wide by 30 km tall)
map.width = 52000;
map.height = 30000;

// 2. Filter out old steppe highway roads and temporary steppe props/intersections,
// BUT strictly preserve all village Polynovka elements (road_village_*, bld_village_*, etc.)!
map.roads = map.roads.filter(r => 
  r.id !== 'road_steppe_0' && 
  r.id !== 'road_steppe_roundabout' && 
  !r.id.startsWith('road_highway_') &&
  !r.id.startsWith('road_north_') &&
  !r.id.startsWith('road_south_') &&
  !r.id.startsWith('road_canyon_') &&
  !r.id.startsWith('road_dunes_') &&
  !r.id.startsWith('road_east_') &&
  !r.id.startsWith('road_alpine_')
);

map.intersections = map.intersections.filter(i => 
  !i.id.startsWith('inter_highway_') &&
  !i.id.startsWith('inter_north_') &&
  !i.id.startsWith('inter_south_') &&
  !i.id.startsWith('inter_canyon_') &&
  !i.id.startsWith('inter_dunes_') &&
  !i.id.startsWith('inter_east_') &&
  !i.id.startsWith('inter_alpine_') &&
  i.id !== 'inter_steppe_city_exit'
);

map.roundabouts = [];

// Remove old highway lamps, km posts, distant hay bales
map.props = map.props.filter(p => 
  !p.id.startsWith('lamp_steppe_') &&
  !p.id.startsWith('lamp_highway_') &&
  !p.id.startsWith('km_post_') &&
  !p.id.startsWith('sign_highway_') &&
  !p.id.startsWith('prop_highway_') &&
  !p.id.startsWith('hay_bale_') &&
  !p.id.startsWith('prop_steppe_')
);

// Clean prior trees in the eastern territory outside the city
map.trees = map.trees.filter(t => 
  !t.id.startsWith('tree_pine_') &&
  !t.id.startsWith('tree_steppe_') &&
  !t.id.startsWith('tree_taiga_') &&
  !t.id.startsWith('tree_canyon_')
);

// Helper to generate waypoints sampled along a straight segment
function generateSegmentWaypoints(x1, y1, x2, y2, step = 300) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const count = Math.max(2, Math.ceil(dist / step));
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    pts.push({
      x: Math.round((x1 + t * dx) * 10) / 10,
      y: Math.round((y1 + t * dy) * 10) / 10
    });
  }
  return pts;
}

// Helper to generate a curved turnaround U-turn arc
function generateTurnaroundArc(startX, startY, endX, endY, apexX, apexY, steps = 8) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic Bezier from start to apex to end
    const inv = 1 - t;
    const px = inv * inv * startX + 2 * inv * t * apexX + t * t * endX;
    const py = inv * inv * startY + 2 * inv * t * apexY + t * t * endY;
    pts.push({ x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10 });
  }
  return pts;
}

// Helper to generate a 90-degree corner turning arc across an intersection
function generateCornerArc(startX, startY, endX, endY, steps = 6) {
  const pts = [];
  // Corner control point is either (startX, endY) or (endX, startY)
  const ctrlX = Math.abs(startX - endX) > 0 ? startX : endX;
  const ctrlY = Math.abs(startY - endY) > 0 ? endY : startY;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const px = inv * inv * startX + 2 * inv * t * ctrlX + t * t * endX;
    const py = inv * inv * startY + 2 * inv * t * ctrlY + t * t * endY;
    pts.push({ x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10 });
  }
  return pts;
}

// Helper to build a 4-lane horizontal highway segment
function create4LaneHighway(id, name, x1, x2, y, width = 192) {
  const halfW = width / 2;
  const laneOuter = width * 3 / 8; // 72 for 192
  const laneInner = width * 1 / 8; // 24 for 192
  
  const wpE0 = generateSegmentWaypoints(x1, y + laneOuter, x2, y + laneOuter, 320);
  const wpE1 = generateSegmentWaypoints(x1, y + laneInner, x2, y + laneInner, 320);
  const wpW1 = generateSegmentWaypoints(x2, y - laneInner, x1, y - laneInner, 320);
  const wpW0 = generateSegmentWaypoints(x2, y - laneOuter, x1, y - laneOuter, 320);

  return {
    id,
    x1,
    y1: y,
    x2,
    y2: y,
    lanes: 4,
    width,
    isAvenue: true,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal',
    name,
    lanePaths: [
      {
        laneId: `${id}_w0`,
        laneIndex: 0,
        direction: Math.PI,
        waypoints: wpW0,
        connections: []
      },
      {
        laneId: `${id}_w1`,
        laneIndex: 1,
        direction: Math.PI,
        waypoints: wpW1,
        connections: []
      },
      {
        laneId: `${id}_e1`,
        laneIndex: 2,
        direction: 0,
        waypoints: wpE1,
        connections: []
      },
      {
        laneId: `${id}_e0`,
        laneIndex: 3,
        direction: 0,
        waypoints: wpE0,
        connections: []
      }
    ]
  };
}

// Helper to build a 2-lane road segment (horizontal or vertical)
function create2LaneRoad(id, name, x1, y1, x2, y2, width = 96, isAvenue = false) {
  const isHoriz = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const laneOffset = width / 4; // 24 for 96
  
  const lanePaths = [];

  if (isHoriz) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const y = y1;

    const wpEast = generateSegmentWaypoints(minX, y + laneOffset, maxX, y + laneOffset, 300);
    const wpWest = generateSegmentWaypoints(maxX, y - laneOffset, minX, y - laneOffset, 300);

    lanePaths.push(
      {
        laneId: `${id}_w`,
        laneIndex: 0,
        direction: Math.PI,
        waypoints: wpWest,
        connections: []
      },
      {
        laneId: `${id}_e`,
        laneIndex: 1,
        direction: 0,
        waypoints: wpEast,
        connections: []
      }
    );

    return {
      id,
      x1: minX,
      y1: y,
      x2: maxX,
      y2: y,
      lanes: 2,
      width,
      isAvenue,
      isDirt: false,
      isGravel: false,
      direction: 'horizontal',
      name,
      lanePaths
    };
  } else {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const x = x1;

    const wpSouth = generateSegmentWaypoints(x + laneOffset, minY, x + laneOffset, maxY, 300);
    const wpNorth = generateSegmentWaypoints(x - laneOffset, maxY, x - laneOffset, minY, 300);

    lanePaths.push(
      {
        laneId: `${id}_s`,
        laneIndex: 0,
        direction: Math.PI / 2,
        waypoints: wpSouth,
        connections: []
      },
      {
        laneId: `${id}_n`,
        laneIndex: 1,
        direction: -Math.PI / 2,
        waypoints: wpNorth,
        connections: []
      }
    );

    return {
      id,
      x1: x,
      y1: minY,
      x2: x,
      y2: maxY,
      lanes: 2,
      width,
      isAvenue,
      isDirt: false,
      isGravel: false,
      direction: 'vertical',
      name,
      lanePaths
    };
  }
}

// Helper to create an intersection
function createIntersection(id, x, y, width, height, type = '4way') {
  return {
    id,
    x,
    y,
    width,
    height,
    type,
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [],
    stopLines: [],
    crosswalks: []
  };
}

const newRoads = [];
const newIntersections = [];
const newProps = [];
const newTrees = [];

// =========================================================================
// ROUTE 1: CENTRAL HIGHWAY M-12 «СТЕПНОЕ ШОССЕ» (4-lane expressway, 40 km)
// =========================================================================
const hw1 = create4LaneHighway('road_steppe_0', 'Степное Шоссе (М-12 Участок 1)', 8000, 14400, 4000, 192);
const hw2 = create4LaneHighway('road_highway_m12_seg2', 'Степное Шоссе (М-12 Участок 2)', 14400, 24000, 4000, 192);
const hw3 = create4LaneHighway('road_highway_m12_seg3', 'Степное Шоссе (М-12 Участок 3)', 24000, 36000, 4000, 192);
const hw4 = create4LaneHighway('road_highway_m12_seg4', 'Степное Шоссе (М-12 Участок 4)', 36000, 48000, 4000, 192);

newRoads.push(hw1, hw2, hw3, hw4);

// City exit intersection at x=8000, y=4000
const cityExitInter = createIntersection('inter_steppe_city_exit', 8000, 4000, 192, 192, '4way');
newIntersections.push(cityExitInter);

// Major Highway Interchanges on M-12
const hub1 = createIntersection('inter_highway_hub_1', 14400, 4000, 240, 240, '4way'); // Развилка 1: Степной Узел (14 км)
const hub2 = createIntersection('inter_highway_hub_2', 24000, 4000, 240, 240, '4way'); // Развилка 2: Оазис / Золотые Пески (24 км)
const hub3 = createIntersection('inter_highway_hub_3', 36000, 4000, 240, 240, '4way'); // Развилка 3: Таёжный Перевал (36 км)
const hub4 = createIntersection('inter_highway_east_gate', 48000, 4000, 240, 240, '4way'); // Развилка 4: Восточные Ворота (48 км)

newIntersections.push(hub1, hub2, hub3, hub4);

// =========================================================================
// ROUTE 2: СЕВЕРНЫЙ ТРАКТ И ТАЁЖНЫЙ ПЕРЕВАЛ (North Trunk & Alpine Pass, 46.4 km)
// =========================================================================
// Branch North from Hub 1 (14400, 4000) to (14400, 1200)
const northTrunk1 = create2LaneRoad('road_north_trunk_1', 'Северный Тракт (Подъём)', 14400, 1200, 14400, 4000, 96);
// Поворот 1: at (14400, 1200) turns East
const northTurn1 = createIntersection('inter_north_turn_1', 14400, 1200, 140, 140, '3way_T_south');
// Northern Valley segment 1: from x=14400 to x=24000 at y=1200
const northValley1 = create2LaneRoad('road_north_valley_1', 'Северный Тракт (Долина)', 14400, 1200, 24000, 1200, 96);
// Cross junction with connector from Hub 2
const northCrossOasis = createIntersection('inter_north_cross_oasis', 24000, 1200, 140, 140, '4way');
// Valley link road between M-12 Hub 2 (24000, 4000) and Northern Valley (24000, 1200)
const valleyLink1 = create2LaneRoad('road_valley_link_1', 'Оазисный Проезд (Север-Юг)', 24000, 1200, 24000, 4000, 96);
// Northern Valley segment 2: from x=24000 to x=36000 at y=1200
const northValley2 = create2LaneRoad('road_north_valley_2', 'Таёжный Тракт (Лесной участок)', 24000, 1200, 36000, 1200, 96);
// Cross junction with connector from Hub 3
const northCrossTaiga = createIntersection('inter_north_cross_taiga', 36000, 1200, 140, 140, '4way');
// Taiga link road between M-12 Hub 3 (36000, 4000) and Taiga Highway (36000, 1200)
const taigaLink1 = create2LaneRoad('road_taiga_link_1', 'Таёжная Ветка (Север-Юг)', 36000, 1200, 36000, 4000, 96);

// High Alpine Mountain Pass:
// Ascent from (36000, 1200) up to (36000, 400)
const alpineAscent = create2LaneRoad('road_alpine_ascent', 'Подъём на Перевал Орлиный Пик', 36000, 400, 36000, 1200, 96);
// Поворот 2: at (36000, 400) turns East along Alpine Ridge
const alpinePeak = createIntersection('inter_alpine_peak', 36000, 400, 140, 140, '3way_T_south');
// Alpine Ridge Highway along y=400 from x=36000 to x=48000
const alpineRidge = create2LaneRoad('road_alpine_ridge', 'Высокогорный Хребет (Панорамная Трасса)', 36000, 400, 48000, 400, 96);
// Поворот 3: at (48000, 400) turns South
const alpineEastTurn = createIntersection('inter_alpine_east_turn', 48000, 400, 140, 140, '3way_T_south');
// East Rim North: from (48000, 400) down to Hub 4 (48000, 4000)
const eastRimNorth = create2LaneRoad('road_east_rim_north', 'Восточный Спуск к Трассе М-12', 48000, 400, 48000, 4000, 96);

newRoads.push(
  northTrunk1, northValley1, valleyLink1, northValley2, taigaLink1,
  alpineAscent, alpineRidge, eastRimNorth
);
newIntersections.push(
  northTurn1, northCrossOasis, northCrossTaiga, alpinePeak, alpineEastTurn
);

// =========================================================================
// ROUTE 3: ЮЖНЫЙ ОБЪЕЗД «СТЕПНЫЕ ОЗЁРА» (South Lakes Expressway, 35.1 km)
// =========================================================================
// Branch South from Hub 1 (14400, 4000) to (14400, 8500)
const southLakes1 = create2LaneRoad('road_south_lakes_1', 'Южный Спуск к Озёрам', 14400, 4000, 14400, 8500, 96);
// Поворот 4: at (14400, 8500) turns East
const southTurn1 = createIntersection('inter_south_turn_1', 14400, 8500, 140, 140, '3way_T_north');
// South Lakes segment 1: from x=14400 to x=24000 at y=8500
const southLakesSeg1 = create2LaneRoad('road_south_lakes_seg1', 'Трасса Степных Озёр (Западный берег)', 14400, 8500, 24000, 8500, 96);
// Crossroads at (24000, 8500)
const southHubOasis = createIntersection('inter_south_hub_oasis', 24000, 8500, 160, 160, '4way');
// Connector from Hub 2 (24000, 4000) South to (24000, 8500)
const canyonLink1 = create2LaneRoad('road_canyon_link_1', 'Оазисный Южный Съезд', 24000, 4000, 24000, 8500, 96);
// South Lakes segment 2: from x=24000 to x=36000 at y=8500
const southLakesSeg2 = create2LaneRoad('road_south_lakes_seg2', 'Трасса Степных Озёр (Восточный берег)', 24000, 8500, 36000, 8500, 96);
// Crossroads at (36000, 8500)
const southHubEast = createIntersection('inter_south_hub_east', 36000, 8500, 160, 160, '4way');
// Connector from Hub 3 (36000, 4000) South to (36000, 8500)
const southLakesEastLink = create2LaneRoad('road_south_lakes_east_link', 'Таёжный Южный Подъезд', 36000, 4000, 36000, 8500, 96);
// South Lakes segment 3: from x=36000 to x=40000 at y=8500
const southLakesSeg3 = create2LaneRoad('road_south_lakes_seg3', 'Дальний Озёрный Тракт', 36000, 8500, 40000, 8500, 96);
// Junction at (40000, 8500)
const southLakesFarEast = createIntersection('inter_south_lakes_far_east', 40000, 8500, 140, 140, '3way_T_west');

newRoads.push(
  southLakes1, southLakesSeg1, canyonLink1, southLakesSeg2,
  southLakesEastLink, southLakesSeg3
);
newIntersections.push(
  southTurn1, southHubOasis, southHubEast, southLakesFarEast
);

// =========================================================================
// ROUTE 4: БОЛЬШОЙ КАНЬОННЫЙ СЕРПАНТИН И ПЕСЧАНЫЕ ДЮНЫ (Canyon & Dunes, 79.0 km)
// =========================================================================
// Descent into Canyon from (24000, 8500) South to (24000, 15000)
const canyonDescent = create2LaneRoad('road_canyon_descent', 'Спуск в Большой Каньон', 24000, 8500, 24000, 15000, 96);
// Поворот 5: at (24000, 15000) turns East
const canyonTurn1 = createIntersection('inter_canyon_turn_1', 24000, 15000, 140, 140, '3way_T_north');
// Canyon Shelf 1: from x=24000 to x=32000 at y=15000
const canyonShelf1 = create2LaneRoad('road_canyon_shelf_1', 'Каньонный Карниз (Верхний ярус)', 24000, 15000, 32000, 15000, 96);
// Поворот 6: at (32000, 15000) turns South
const canyonTurn2 = createIntersection('inter_canyon_turn_2', 32000, 15000, 140, 140, '3way_T_west');
// Canyon Drop 1: from y=15000 to y=20000 at x=32000
const canyonDrop1 = create2LaneRoad('road_canyon_drop_1', 'Скалистый Обрыв (Вираж №1)', 32000, 15000, 32000, 20000, 96);
// Поворот 7: at (32000, 20000) turns West
const canyonTurn3 = createIntersection('inter_canyon_turn_3', 32000, 20000, 140, 140, '3way_T_north');
// Canyon Loop West: from x=32000 back to x=20000 at y=20000
const canyonLoopWest = create2LaneRoad('road_canyon_loop_west', 'Каньонный Карниз (Средний ярус)', 20000, 20000, 32000, 20000, 96);
// Поворот 8: at (20000, 20000) turns South
const canyonTurn4 = createIntersection('inter_canyon_turn_4', 20000, 20000, 140, 140, '3way_T_east');
// Canyon Drop 2: from y=20000 to y=26000 at x=20000
const canyonDrop2 = create2LaneRoad('road_canyon_drop_2', 'Выход в Барханы (Вираж №2)', 20000, 20000, 20000, 26000, 96);
// Поворот 9: at (20000, 26000) turns East into the vast Dunes
const canyonTurn5 = createIntersection('inter_canyon_turn_5', 20000, 26000, 140, 140, '3way_T_north');
// Dunes Expressway: runs East from x=20000 to x=40000 at y=26000 (20 km uninterrupted high-speed desert run!)
const dunesExpress = create2LaneRoad('road_dunes_express', 'Барханная Магистраль «Золотые Пески»', 20000, 26000, 40000, 26000, 96);
// Поворот 10: at (40000, 26000) turns North
const dunesTurn6 = createIntersection('inter_dunes_turn_6', 40000, 26000, 140, 140, '3way_T_north');
// East Canyon Rise: from y=26000 up to y=15000 at x=40000
const eastCanyonRise = create2LaneRoad('road_east_canyon_rise', 'Восточный Скальный Подъём', 40000, 15000, 40000, 26000, 96);
// Hub at (40000, 15000)
const eastCanyonHub = createIntersection('inter_east_canyon_hub', 40000, 15000, 160, 160, '4way');
// Connector from (40000, 15000) North to South Lakes at (40000, 8500)
const canyonToLakes = create2LaneRoad('road_canyon_to_lakes', 'Озёрно-Каньонный Перемычка', 40000, 8500, 40000, 15000, 96);

newRoads.push(
  canyonDescent, canyonShelf1, canyonDrop1, canyonLoopWest,
  canyonDrop2, dunesExpress, eastCanyonRise, canyonToLakes
);
newIntersections.push(
  canyonTurn1, canyonTurn2, canyonTurn3, canyonTurn4,
  canyonTurn5, dunesTurn6, eastCanyonHub
);

// =========================================================================
// ROUTE 5: ВОСТОЧНАЯ ПОГРАНИЧНАЯ МАГИСТРАЛЬ (Eastern Border Expressway, 19.0 km)
// =========================================================================
// South from Hub 4 (48000, 4000) to (48000, 15000)
const eastRimSouth = create2LaneRoad('road_east_rim_south', 'Восточный Пограничный Тракт', 48000, 4000, 48000, 15000, 96);
// Поворот 11: at (48000, 15000) turns West
const eastRimCorner = createIntersection('inter_east_rim_corner', 48000, 15000, 140, 140, '3way_T_west');
// Connector between (48000, 15000) and (40000, 15000)
const eastRimConnector = create2LaneRoad('road_east_rim_connector', 'Скалистый Проход (Восток-Запад)', 40000, 15000, 48000, 15000, 96);

newRoads.push(eastRimSouth, eastRimConnector);
newIntersections.push(eastRimCorner);

// =========================================================================
// 3. INTER-ROAD LANE CONNECTIONS & INTERSECTIONS WIRING
// =========================================================================
// Map fast-lookup helper
const roadMap = new Map();
newRoads.forEach(r => roadMap.set(r.id, r));

function connectLanes(sourceLane, targetLane, turnType, pathWaypoints, interId) {
  if (!sourceLane || !targetLane) return;
  sourceLane.connections = sourceLane.connections || [];
  sourceLane.connections.push({
    targetLaneId: targetLane.laneId,
    turnType,
    pathWaypoints,
    intersectionId: interId
  });
}

// Connect City Exit Road `road_h_4_9` with `road_steppe_0`
const cityExitRoad = map.roads.find(r => r.id === 'road_h_4_9');
if (cityExitRoad) {
  const cityE0 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_e0');
  const cityE1 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_e1');
  const cityW0 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_w0');
  const cityW1 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_w1');

  const hwE0 = hw1.lanePaths.find(lp => lp.laneId === 'road_steppe_0_e0');
  const hwE1 = hw1.lanePaths.find(lp => lp.laneId === 'road_steppe_0_e1');
  const hwW0 = hw1.lanePaths.find(lp => lp.laneId === 'road_steppe_0_w0');
  const hwW1 = hw1.lanePaths.find(lp => lp.laneId === 'road_steppe_0_w1');

  if (cityE0 && hwE0) connectLanes(cityE0, hwE0, 'straight', [{ x: 7920, y: 4072 }, { x: 8080, y: 4072 }], 'inter_steppe_city_exit');
  if (cityE1 && hwE1) connectLanes(cityE1, hwE1, 'straight', [{ x: 7920, y: 4024 }, { x: 8080, y: 4024 }], 'inter_steppe_city_exit');
  if (hwW0 && cityW0) connectLanes(hwW0, cityW0, 'straight', [{ x: 8080, y: 3928 }, { x: 7920, y: 3928 }], 'inter_steppe_city_exit');
  if (hwW1 && cityW1) connectLanes(hwW1, cityW1, 'straight', [{ x: 8080, y: 3976 }, { x: 7920, y: 3976 }], 'inter_steppe_city_exit');
}

// Connect village access road `road_village_access` with `road_steppe_0`
const villageAccess = map.roads.find(r => r.id === 'road_village_access');
if (villageAccess) {
  const vS = villageAccess.lanePaths.find(lp => lp.laneId === 'road_village_access_s');
  const hwW0 = hw1.lanePaths.find(lp => lp.laneId === 'road_steppe_0_w0');
  if (vS && hwW0) {
    vS.connections = [
      {
        targetLaneId: 'road_steppe_0_w0',
        turnType: 'right',
        pathWaypoints: [
          { x: 11390, y: 3880 },
          { x: 11385, y: 3920 },
          { x: 11350, y: 3928 }
        ]
      }
    ];
  }
}

// Helper to wire straight continuity between two collinear 4-lane segments across an interchange
function wire4LaneStraight(westRoad, eastRoad, interX, y) {
  const wE0 = westRoad.lanePaths.find(l => l.laneIndex === 3);
  const wE1 = westRoad.lanePaths.find(l => l.laneIndex === 2);
  const eE0 = eastRoad.lanePaths.find(l => l.laneIndex === 3);
  const eE1 = eastRoad.lanePaths.find(l => l.laneIndex === 2);

  const eW0 = eastRoad.lanePaths.find(l => l.laneIndex === 0);
  const eW1 = eastRoad.lanePaths.find(l => l.laneIndex === 1);
  const wW0 = westRoad.lanePaths.find(l => l.laneIndex === 0);
  const wW1 = westRoad.lanePaths.find(l => l.laneIndex === 1);

  if (wE0 && eE0) connectLanes(wE0, eE0, 'straight', [{ x: interX - 80, y: y + 72 }, { x: interX + 80, y: y + 72 }]);
  if (wE1 && eE1) connectLanes(wE1, eE1, 'straight', [{ x: interX - 80, y: y + 24 }, { x: interX + 80, y: y + 24 }]);
  if (eW0 && wW0) connectLanes(eW0, wW0, 'straight', [{ x: interX + 80, y: y - 72 }, { x: interX - 80, y: y - 72 }]);
  if (eW1 && wW1) connectLanes(eW1, wW1, 'straight', [{ x: interX + 80, y: y - 24 }, { x: interX - 80, y: y - 24 }]);
}

wire4LaneStraight(hw1, hw2, 14400, 4000);
wire4LaneStraight(hw2, hw3, 24000, 4000);
wire4LaneStraight(hw3, hw4, 36000, 4000);

// Wire 4-way forks (Interchanges) connecting M-12 with cross routes:
// Hub 1 (14400, 4000): M-12 meets North Trunk & South Lakes
const nTrunk1_n = northTrunk1.lanePaths.find(l => l.laneId === 'road_north_trunk_1_n');
const nTrunk1_s = northTrunk1.lanePaths.find(l => l.laneId === 'road_north_trunk_1_s');
const sLakes1_n = southLakes1.lanePaths.find(l => l.laneId === 'road_south_lakes_1_n');
const sLakes1_s = southLakes1.lanePaths.find(l => l.laneId === 'road_south_lakes_1_s');

const hw1_e0 = hw1.lanePaths.find(l => l.laneId === 'road_steppe_0_e0');
const hw2_w0 = hw2.lanePaths.find(l => l.laneId === 'road_highway_m12_seg2_w0');

// Turn off M-12 North onto North Trunk
if (hw1_e0 && nTrunk1_n) {
  connectLanes(hw1_e0, nTrunk1_n, 'left', generateCornerArc(14320, 4072, 14376, 3900));
}
// Turn off M-12 South onto South Lakes
if (hw1_e0 && sLakes1_s) {
  connectLanes(hw1_e0, sLakes1_s, 'right', generateCornerArc(14320, 4072, 14424, 4100));
}
// From North Trunk onto M-12 Eastbound
if (nTrunk1_s && hw2) {
  const hw2_e0 = hw2.lanePaths.find(l => l.laneId === 'road_highway_m12_seg2_e0');
  if (hw2_e0) connectLanes(nTrunk1_s, hw2_e0, 'left', generateCornerArc(14424, 3900, 14480, 4072));
}
// From South Lakes onto M-12 Westbound
if (sLakes1_n && hw1) {
  const hw1_w0 = hw1.lanePaths.find(l => l.laneId === 'road_steppe_0_w0');
  if (hw1_w0) connectLanes(sLakes1_n, hw1_w0, 'left', generateCornerArc(14376, 4100, 14320, 3928));
}
// North-South straight across Hub 1
if (nTrunk1_s && sLakes1_s) {
  connectLanes(nTrunk1_s, sLakes1_s, 'straight', [{ x: 14424, y: 3900 }, { x: 14424, y: 4100 }]);
}
if (sLakes1_n && nTrunk1_n) {
  connectLanes(sLakes1_n, nTrunk1_n, 'straight', [{ x: 14376, y: 4100 }, { x: 14376, y: 3900 }]);
}

// Wire 90-degree corners (Повороты):
// Поворот 1: (14400, 1200) North Trunk turns East into North Valley
const nVal1_e = northValley1.lanePaths.find(l => l.laneId === 'road_north_valley_1_e');
const nVal1_w = northValley1.lanePaths.find(l => l.laneId === 'road_north_valley_1_w');
if (nTrunk1_n && nVal1_e) connectLanes(nTrunk1_n, nVal1_e, 'right', generateCornerArc(14376, 1280, 14480, 1224));
if (nVal1_w && nTrunk1_s) connectLanes(nVal1_w, nTrunk1_s, 'left', generateCornerArc(14480, 1176, 14424, 1280));

// Поворот 2: (36000, 400) Alpine Ascent turns East into Alpine Ridge
const alpAsc_n = alpineAscent.lanePaths.find(l => l.laneId === 'road_alpine_ascent_n');
const alpAsc_s = alpineAscent.lanePaths.find(l => l.laneId === 'road_alpine_ascent_s');
const alpRdg_e = alpineRidge.lanePaths.find(l => l.laneId === 'road_alpine_ridge_e');
const alpRdg_w = alpineRidge.lanePaths.find(l => l.laneId === 'road_alpine_ridge_w');
if (alpAsc_n && alpRdg_e) connectLanes(alpAsc_n, alpRdg_e, 'right', generateCornerArc(35976, 480, 36080, 424));
if (alpRdg_w && alpAsc_s) connectLanes(alpRdg_w, alpAsc_s, 'left', generateCornerArc(36080, 376, 36024, 480));

// Поворот 3: (48000, 400) Alpine Ridge turns South into East Rim North
const eRimN_s = eastRimNorth.lanePaths.find(l => l.laneId === 'road_east_rim_north_s');
const eRimN_n = eastRimNorth.lanePaths.find(l => l.laneId === 'road_east_rim_north_n');
if (alpRdg_e && eRimN_s) connectLanes(alpRdg_e, eRimN_s, 'right', generateCornerArc(47920, 424, 48024, 480));
if (eRimN_n && alpRdg_w) connectLanes(eRimN_n, alpRdg_w, 'left', generateCornerArc(47976, 480, 47920, 376));

// Поворот 4: (14400, 8500) South Lakes turns East
const sLksSeg1_e = southLakesSeg1.lanePaths.find(l => l.laneId === 'road_south_lakes_seg1_e');
const sLksSeg1_w = southLakesSeg1.lanePaths.find(l => l.laneId === 'road_south_lakes_seg1_w');
if (sLakes1_s && sLksSeg1_e) connectLanes(sLakes1_s, sLksSeg1_e, 'left', generateCornerArc(14424, 8420, 14480, 8524));
if (sLksSeg1_w && sLakes1_n) connectLanes(sLksSeg1_w, sLakes1_n, 'right', generateCornerArc(14480, 8476, 14376, 8420));

// Canyon Serpentine Turns:
// Поворот 5: (24000, 15000) Canyon Descent turns East into Shelf 1
const canDesc_s = canyonDescent.lanePaths.find(l => l.laneId === 'road_canyon_descent_s');
const canDesc_n = canyonDescent.lanePaths.find(l => l.laneId === 'road_canyon_descent_n');
const canSh1_e = canyonShelf1.lanePaths.find(l => l.laneId === 'road_canyon_shelf_1_e');
const canSh1_w = canyonShelf1.lanePaths.find(l => l.laneId === 'road_canyon_shelf_1_w');
if (canDesc_s && canSh1_e) connectLanes(canDesc_s, canSh1_e, 'left', generateCornerArc(24024, 14920, 24080, 15024));
if (canSh1_w && canDesc_n) connectLanes(canSh1_w, canDesc_n, 'right', generateCornerArc(24080, 14976, 23976, 14920));

// Поворот 6: (32000, 15000) Shelf 1 turns South into Drop 1
const canDr1_s = canyonDrop1.lanePaths.find(l => l.laneId === 'road_canyon_drop_1_s');
const canDr1_n = canyonDrop1.lanePaths.find(l => l.laneId === 'road_canyon_drop_1_n');
if (canSh1_e && canDr1_s) connectLanes(canSh1_e, canDr1_s, 'right', generateCornerArc(31920, 15024, 32024, 15080));
if (canDr1_n && canSh1_w) connectLanes(canDr1_n, canSh1_w, 'left', generateCornerArc(31976, 15080, 31920, 14976));

// Поворот 7: (32000, 20000) Drop 1 turns West into Loop West
const canLpW_w = canyonLoopWest.lanePaths.find(l => l.laneId === 'road_canyon_loop_west_w');
const canLpW_e = canyonLoopWest.lanePaths.find(l => l.laneId === 'road_canyon_loop_west_e');
if (canDr1_s && canLpW_w) connectLanes(canDr1_s, canLpW_w, 'right', generateCornerArc(32024, 19920, 31920, 19976));
if (canLpW_e && canDr1_n) connectLanes(canLpW_e, canDr1_n, 'left', generateCornerArc(31920, 20024, 31976, 19920));

// Поворот 8: (20000, 20000) Loop West turns South into Drop 2
const canDr2_s = canyonDrop2.lanePaths.find(l => l.laneId === 'road_canyon_drop_2_s');
const canDr2_n = canyonDrop2.lanePaths.find(l => l.laneId === 'road_canyon_drop_2_n');
if (canLpW_w && canDr2_s) connectLanes(canLpW_w, canDr2_s, 'left', generateCornerArc(20080, 19976, 20024, 20080));
if (canDr2_n && canLpW_e) connectLanes(canDr2_n, canLpW_e, 'right', generateCornerArc(19976, 20080, 20080, 20024));

// Поворот 9: (20000, 26000) Drop 2 turns East into Dunes Expressway
const dExp_e = dunesExpress.lanePaths.find(l => l.laneId === 'road_dunes_express_e');
const dExp_w = dunesExpress.lanePaths.find(l => l.laneId === 'road_dunes_express_w');
if (canDr2_s && dExp_e) connectLanes(canDr2_s, dExp_e, 'left', generateCornerArc(20024, 25920, 20080, 26024));
if (dExp_w && canDr2_n) connectLanes(dExp_w, canDr2_n, 'right', generateCornerArc(20080, 25976, 19976, 25920));

// Поворот 10: (40000, 26000) Dunes Expressway turns North into East Canyon Rise
const eCanRise_n = eastCanyonRise.lanePaths.find(l => l.laneId === 'road_east_canyon_rise_n');
const eCanRise_s = eastCanyonRise.lanePaths.find(l => l.laneId === 'road_east_canyon_rise_s');
if (dExp_e && eCanRise_n) connectLanes(dExp_e, eCanRise_n, 'left', generateCornerArc(39920, 26024, 39976, 25920));
if (eCanRise_s && dExp_w) connectLanes(eCanRise_s, dExp_w, 'right', generateCornerArc(40024, 25920, 39920, 25976));

// Поворот 11: (48000, 15000) East Rim South turns West into Connector
const eRimS_s = eastRimSouth.lanePaths.find(l => l.laneId === 'road_east_rim_south_s');
const eRimS_n = eastRimSouth.lanePaths.find(l => l.laneId === 'road_east_rim_south_n');
const eRimConn_w = eastRimConnector.lanePaths.find(l => l.laneId === 'road_east_rim_connector_w');
const eRimConn_e = eastRimConnector.lanePaths.find(l => l.laneId === 'road_east_rim_connector_e');
if (eRimS_s && eRimConn_w) connectLanes(eRimS_s, eRimConn_w, 'right', generateCornerArc(48024, 14920, 47920, 14976));
if (eRimConn_e && eRimS_n) connectLanes(eRimConn_e, eRimS_n, 'left', generateCornerArc(47920, 15024, 47976, 14920));

// Hub 4 East Gate (48000, 4000): Turnaround & East Rim South Connection
const hw4_e0 = hw4.lanePaths.find(l => l.laneId === 'road_highway_m12_seg4_e0');
const hw4_w0 = hw4.lanePaths.find(l => l.laneId === 'road_highway_m12_seg4_w0');
if (hw4_e0 && eRimS_s) connectLanes(hw4_e0, eRimS_s, 'right', generateCornerArc(47920, 4072, 48024, 4100));
if (eRimN_s && hw4_w0) connectLanes(eRimN_s, hw4_w0, 'right', generateCornerArc(48024, 3900, 47920, 3928));

// Terminal U-turn loop at Hub 4 East Gate so AI cars smoothly turn around at the far eastern border
if (hw4_e0 && hw4_w0) {
  const turnaroundArc = generateTurnaroundArc(48000, 4072, 48000, 3928, 48160, 4000, 8);
  connectLanes(hw4_e0, hw4_w0, 'turnaround', turnaroundArc, 'inter_highway_east_gate');
}

// =========================================================================
// 4. ROADSIDE PROPS, SIGNS, KM POSTS, LAMPS, AND SERVICE STATIONS
// =========================================================================

// Median lamps along 4-lane M-12 Highway (every 220 px)
for (let x = 8150; x < 47900; x += 220) {
  // Avoid placing directly on intersection boxes
  if (
    (x > 14280 && x < 14520) ||
    (x > 23880 && x < 24120) ||
    (x > 35880 && x < 36120)
  ) continue;

  newProps.push({
    id: `lamp_highway_${x}`,
    x,
    y: 4000,
    type: 'lamp_highway',
    angle: 0
  });
}

// Kilometre posts every 2 km across the whole M-12 highway and connected routes
const kmMilestones = [
  { km: 1, x: 9000, y: 3880 },
  { km: 5, x: 13000, y: 3880 },
  { km: 10, x: 18000, y: 3880 },
  { km: 15, x: 23000, y: 3880 },
  { km: 20, x: 28000, y: 3880 },
  { km: 25, x: 33000, y: 3880 },
  { km: 30, x: 38000, y: 3880 },
  { km: 35, x: 43000, y: 3880 },
  { km: 40, x: 47800, y: 3880 },
  // North Route km posts
  { km: 50, x: 18000, y: 1100 },
  { km: 60, x: 28000, y: 1100 },
  { km: 70, x: 38000, y: 320 },
  { km: 80, x: 44000, y: 320 },
  // South Lakes km posts
  { km: 90, x: 18000, y: 8400 },
  { km: 100, x: 28000, y: 8400 },
  { km: 110, x: 34000, y: 8400 },
  // Canyon & Dunes km posts
  { km: 120, x: 28000, y: 14900 },
  { km: 130, x: 26000, y: 19900 },
  { km: 140, x: 24000, y: 25900 },
  { km: 150, x: 34000, y: 25900 }
];

kmMilestones.forEach(({ km, x, y }) => {
  newProps.push({
    id: `km_post_${km}`,
    x,
    y,
    type: 'kiosk',
    color: '#1e293b'
  });
});

// Roadside facilities & Rest Areas:
// Facility 1: Rest Area at x=16000, y=4140 (Just east of Hub 1)
newProps.push(
  { id: 'prop_highway_rest1_b1', x: 16050, y: 4160, type: 'bench', angle: 0 },
  { id: 'prop_highway_rest1_b2', x: 16120, y: 4160, type: 'bench', angle: 0 },
  { id: 'prop_highway_rest1_t1', x: 16085, y: 4160, type: 'trash_can' },
  { id: 'prop_highway_rest1_kiosk', x: 16170, y: 4180, type: 'kiosk', color: '#0369a1' }
);

// Facility 2: «АЗС Транзит-Оазис & Мотель Степной Бриз» at Hub 2 (x=24200, y=4180)
newProps.push(
  { id: 'prop_highway_gas_oasis_sign', x: 24150, y: 4140, type: 'kiosk', color: '#16a34a' },
  { id: 'prop_highway_motel_b1', x: 24320, y: 4220, type: 'bench', angle: 0 },
  { id: 'prop_highway_motel_b2', x: 24380, y: 4220, type: 'bench', angle: 0 },
  { id: 'prop_highway_motel_trash', x: 24350, y: 4220, type: 'trash_can' }
);

// Facility 3: Alpine Lookout Platform «Орлиный Пик» (x=36200, y=300)
newProps.push(
  { id: 'prop_highway_lookout_b1', x: 36250, y: 280, type: 'bench', angle: 0 },
  { id: 'prop_highway_lookout_b2', x: 36320, y: 280, type: 'bench', angle: 0 },
  { id: 'prop_highway_lookout_monument', x: 36285, y: 260, type: 'flowerbed', color: '#38bdf8' }
);

// Facility 4: Canyon Viewpoint «Красные Скалы» (x=32200, y=14900)
newProps.push(
  { id: 'prop_highway_canyon_b1', x: 32250, y: 14880, type: 'bench', angle: 0 },
  { id: 'prop_highway_canyon_trash', x: 32290, y: 14880, type: 'trash_can' }
);

// =========================================================================
// 5. NATURAL BIOME VEGETATION (TREES & FLORA)
// =========================================================================
let seed = 42589;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

const pineColors = ['#0f3e24', '#124c2c', '#165732', '#1b6138'];
const desertShrubColors = ['#715d38', '#856f43', '#5a4f35'];

// Northern Taiga & Alpine Pine Forest Belt (y: 100..2500, x: 12000..50000)
for (let i = 0; i < 350; i++) {
  const x = 12000 + Math.round(random() * 38000);
  const y = 150 + Math.round(random() * 2200);
  // Avoid placing directly on roads
  if (Math.abs(y - 1200) < 80 || Math.abs(y - 400) < 80 || Math.abs(x - 14400) < 80 || Math.abs(x - 24000) < 80 || Math.abs(x - 36000) < 80 || Math.abs(x - 48000) < 80) continue;
  
  newTrees.push({
    id: `tree_taiga_${i}`,
    x,
    y,
    radius: Math.round(18 + random() * 20),
    color: pineColors[Math.floor(random() * pineColors.length)],
    shadowOffset: 7,
    type: 'pine'
  });
}

// Steppe scattered groves (y: 2800..6000, x: 9000..48000)
for (let i = 0; i < 220; i++) {
  const x = 9000 + Math.round(random() * 39000);
  const y = 2800 + Math.round(random() * 2800);
  if (Math.abs(y - 4000) < 140) continue; // Keep clear of M-12 asphalt

  newTrees.push({
    id: `tree_steppe_${i}`,
    x,
    y,
    radius: Math.round(15 + random() * 16),
    color: pineColors[Math.floor(random() * pineColors.length)],
    shadowOffset: 6,
    type: 'pine'
  });
}

// Hay bales across golden steppe fields
for (let i = 0; i < 60; i++) {
  const x = 8500 + Math.round(random() * 38000);
  const y = 3000 + Math.round(random() * 3000);
  if (Math.abs(y - 4000) < 160) continue;

  newProps.push({
    id: `hay_bale_${i}`,
    x,
    y,
    type: 'flowerbed',
    color: '#ca8a04'
  });
}

// Canyon & Desert rocks/shrubs (y: 15000..28000, x: 19000..42000)
for (let i = 0; i < 150; i++) {
  const x = 19500 + Math.round(random() * 22000);
  const y = 15500 + Math.round(random() * 11500);
  // Avoid placing on road corridors
  if (
    Math.abs(y - 15000) < 75 || Math.abs(y - 20000) < 75 || Math.abs(y - 26000) < 75 ||
    Math.abs(x - 24000) < 75 || Math.abs(x - 32000) < 75 || Math.abs(x - 20000) < 75 || Math.abs(x - 40000) < 75
  ) continue;

  newTrees.push({
    id: `tree_canyon_shrub_${i}`,
    x,
    y,
    radius: Math.round(10 + random() * 12),
    color: desertShrubColors[Math.floor(random() * desertShrubColors.length)],
    shadowOffset: 4,
    type: 'shrub'
  });
}

// Add all generated items to map
map.roads.push(...newRoads);
map.intersections.push(...newIntersections);
map.props.push(...newProps);
map.trees.push(...newTrees);

// =========================================================================
// 6. VERIFICATION & METRICS
// =========================================================================
let totalRoadLength = 0;
let suburbanRoadLength = 0;

map.roads.forEach(r => {
  const len = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
  totalRoadLength += len;
  if (
    r.id.startsWith('road_steppe_') ||
    r.id.startsWith('road_highway_') ||
    r.id.startsWith('road_north_') ||
    r.id.startsWith('road_south_') ||
    r.id.startsWith('road_canyon_') ||
    r.id.startsWith('road_dunes_') ||
    r.id.startsWith('road_east_') ||
    r.id.startsWith('road_alpine_') ||
    r.id.startsWith('road_village_')
  ) {
    suburbanRoadLength += len;
  }
});

console.log('=== SUMMARY OF MAP UPDATE ===');
console.log('New World Size:', map.width, 'x', map.height);
console.log('Total roads count:', map.roads.length);
console.log('Total intersections count:', map.intersections.length);
console.log('Total props count:', map.props.length);
console.log('Total trees count:', map.trees.length);
console.log('Suburban Highway Network Length:', Math.round(suburbanRoadLength), 'px =', (suburbanRoadLength / 1000).toFixed(2), 'km');
console.log('Total World Roads Length:', Math.round(totalRoadLength), 'px =', (totalRoadLength / 1000).toFixed(2), 'km');

fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
console.log('Successfully wrote updated map.json!');

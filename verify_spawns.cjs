const fs = require('fs');
const mapData = JSON.parse(fs.readFileSync('./public/map.json', 'utf-8'));

const SPAWN_LOCATIONS = [
  { id: 'car_dealership_loc', name: 'Автосалон', x: 252, y: 5910 },
  { id: 'central_park', name: 'Центральный Парк', x: 4400, y: 2800 },
  { id: 'downtown_plaza', name: 'Центр Города', x: 4350, y: 2000 },
  { id: 'residential_courtyard', name: 'Жилой Двор', x: 2750, y: 2750 },
  { id: 'industrial_district', name: 'Промзона', x: 6530, y: 1030 },
  { id: 'pine_forest', name: 'Лесной Заповедник', x: 550, y: 550 },
  { id: 'highway_junction', name: 'Скоростное Шоссе', x: 4000, y: 4000 },
  { id: 'steppe_highway', name: 'Степное Шоссе', x: 9500, y: 4000 },
  { id: 'steppe_village', name: 'Деревня Полыновка', x: 11480, y: 2500 },
  { id: 'highway_hub_1', name: 'Развилка 1', x: 14400, y: 4000 },
  { id: 'highway_hub_2', name: 'Развилка 2 АЗС Оазис', x: 24000, y: 4000 },
  { id: 'alpine_pass', name: 'Перевал Орлиный Пик', x: 36000, y: 400 },
  { id: 'canyon_descent', name: 'Большой Каньон', x: 24000, y: 15000 },
  { id: 'dunes_express', name: 'Барханная Трасса', x: 20000, y: 26000 },
  { id: 'east_gate_terminal', name: 'Восточные Ворота', x: 48000, y: 4000 }
];

console.log('--- SPAWN POINT VERIFICATION AGAINST ROADS & BUILDINGS ---');

SPAWN_LOCATIONS.forEach(loc => {
  let minRoadDist = Infinity;
  let nearestRoad = null;
  mapData.roads.forEach(r => {
    // distance from point (loc.x, loc.y) to road segment (r.x1, r.y1)-(r.x2, r.y2)
    const dx = r.x2 - r.x1;
    const dy = r.y2 - r.y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((loc.x - r.x1) * dx + (loc.y - r.y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = r.x1 + t * dx;
    const projY = r.y1 + t * dy;
    const dist = Math.hypot(loc.x - projX, loc.y - projY);
    if (dist < minRoadDist) {
      minRoadDist = dist;
      nearestRoad = r;
    }
  });

  let inBuilding = false;
  let hitBld = null;
  mapData.buildings.forEach(b => {
    if (loc.x >= b.x && loc.x <= b.x + b.width && loc.y >= b.y && loc.y <= b.y + b.height) {
      inBuilding = true;
      hitBld = b;
    }
  });

  console.log(`Spawn [${loc.id}] "${loc.name}" @ (${loc.x}, ${loc.y}):`);
  console.log(`  Nearest Road: "${nearestRoad ? nearestRoad.name || nearestRoad.id : 'none'}" at dist ${Math.round(minRoadDist)}px`);
  if (inBuilding) {
    console.log(`  ⚠️ IN BUILDING! Collides with building ${hitBld.id} (${hitBld.name || hitBld.type})`);
  }
});

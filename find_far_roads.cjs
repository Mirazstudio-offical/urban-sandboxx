const fs = require('fs');
const mapData = JSON.parse(fs.readFileSync('./public/map.json', 'utf-8'));

console.log('--- ROADS NEAR ALPINE PASS (x ~ 36000) ---');
mapData.roads.forEach(r => {
  if (Math.max(r.x1, r.x2) >= 30000) {
    console.log(`Road "${r.name || r.id}": (${r.x1}, ${r.y1}) -> (${r.x2}, ${r.y2})`);
  }
});

console.log('\n--- ROADS NEAR DUNES & CANYON ---');
mapData.roads.forEach(r => {
  if (Math.max(r.y1, r.y2) >= 10000) {
    console.log(`Road "${r.name || r.id}": (${r.x1}, ${r.y1}) -> (${r.x2}, ${r.y2})`);
  }
});

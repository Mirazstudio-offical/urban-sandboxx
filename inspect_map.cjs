const fs = require('fs');
const mapData = JSON.parse(fs.readFileSync('./public/map.json', 'utf-8'));

console.log('--- ALL NON-COTTAGE NON-GARAGE BUILDINGS ---');
mapData.buildings.forEach(b => {
  if (b.type && !b.type.includes('garage_box') && !b.type.includes('cottage_') && !b.type.includes('banya_') && !b.type.includes('garage_suburban') && !b.type.includes('suburban')) {
    console.log(`ID: ${b.id.padEnd(30)} | Type: ${(b.type||'').padEnd(20)} | Pos: (${Math.round(b.x)}, ${Math.round(b.y)}) Size: ${b.width}x${b.height} | Name: ${b.name || b.nameRu || ''}`);
  }
});

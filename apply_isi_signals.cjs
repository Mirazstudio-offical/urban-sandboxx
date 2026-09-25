const fs = require('fs');

const mapPath = 'public/map.json';
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

// Run rebuild_railway_canonical.cjs logic to ensure public/map.json is always clean
const { execSync } = require('child_process');
execSync('node rebuild_railway_canonical.cjs', { stdio: 'inherit' });
console.log('apply_isi_signals: Synced with canonical railway system.');

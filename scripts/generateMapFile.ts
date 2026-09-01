import fs from 'fs';
import path from 'path';
import { generateCityWorld } from '../src/cityMap';

console.log('Generating city world and updating public/map.json...');
const world = generateCityWorld();
const outputPath = path.join(process.cwd(), 'public', 'map.json');
fs.writeFileSync(outputPath, JSON.stringify(world, null, 2), 'utf-8');
console.log(`Successfully generated and saved map to ${outputPath} (Roads: ${world.roads.length}, Buildings: ${world.buildings.length})`);

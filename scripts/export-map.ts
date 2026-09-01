import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateCityWorld } from '../src/cityMap';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Generating city world...');
const world = generateCityWorld();

const outPath = join(__dirname, '..', 'public', 'map.json');
writeFileSync(outPath, JSON.stringify(world, null, 2), 'utf-8');

const sizeMB = (Buffer.byteLength(JSON.stringify(world)) / 1024 / 1024).toFixed(2);
console.log(`Map saved to ${outPath} (${sizeMB} MB)`);
console.log(`Roads: ${world.roads.length}, Intersections: ${world.intersections.length}`);
console.log(`Buildings: ${world.buildings.length}, Trees: ${world.trees.length}`);
console.log(`Vehicles: ${world.vehicles.length}, Pedestrians: ${world.pedestrians.length}`);

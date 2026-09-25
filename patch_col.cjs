const fs = require('fs');
let code = fs.readFileSync('src/physics.ts', 'utf-8');

const replacement = `
    // Towing vehicle and hitched trailer must never collide with each other!
    if (vehicle.trailerId === other.id || vehicle.towedById === other.id || other.trailerId === vehicle.id || other.towedById === vehicle.id) {
      continue;
    }

    // Allow semi-trucks to back under semi-trailers (ignore collisions if both are unhitched)
    if ((vehicle.type === 'truck_semi' && other.type === 'trailer_semi') || 
        (vehicle.type === 'trailer_semi' && other.type === 'truck_semi')) {
      const truck = vehicle.type === 'truck_semi' ? vehicle : other;
      const trailer = vehicle.type === 'trailer_semi' ? vehicle : other;
      if (!truck.trailerId && !trailer.towedById) {
        continue;
      }
    }
`;

code = code.replace(`    // Towing vehicle and hitched trailer must never collide with each other!
    if (vehicle.trailerId === other.id || vehicle.towedById === other.id || other.trailerId === vehicle.id || other.towedById === vehicle.id) {
      continue;
    }`, replacement.trim());

fs.writeFileSync('src/physics.ts', code);

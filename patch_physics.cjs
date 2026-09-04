const fs = require('fs');
let code = fs.readFileSync('src/physics.ts', 'utf8');

const target = `      // Manual stalling
      if (eng.transmissionType === 'MANUAL') {
        if (eng.currentGear > 0 && eng.clutchPedal > 0.8 && vehicle.speed < 30 && brake > 0 && throttle === 0) { // 3 km/h = 8.3 px/s`;

const replacement = `      // Manual Shifting
      if (eng.transmissionType === 'MANUAL') {
        eng.shiftCooldown = (eng.shiftCooldown || 0) - dt;
        if (input.shiftUp && eng.shiftCooldown <= 0) {
          if (eng.currentGear < 5) eng.currentGear++;
          eng.shiftCooldown = 0.25;
        }
        if (input.shiftDown && eng.shiftCooldown <= 0) {
          if (eng.currentGear > -1) eng.currentGear--;
          eng.shiftCooldown = 0.25;
        }

        // Manual stalling
        if (eng.currentGear > 0 && eng.clutchPedal > 0.8 && vehicle.speed < 30 && brake > 0 && throttle === 0) { // 3 km/h = 8.3 px/s`;

code = code.replace(target, replacement);
fs.writeFileSync('src/physics.ts', code);

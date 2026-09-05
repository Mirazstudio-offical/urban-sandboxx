const fs = require('fs');
let code = fs.readFileSync('src/physics.ts', 'utf8');

// To easily use clothing stats, let's inject them into the player object or bs
// in the earlier patch we just used variables in that scope. Let's patch updatePlayerPhysiology.

code = code.replace(
  'player.needs.energy = Math.max(0, player.needs.energy - 20 * dt);',
  `
    let mPenalty = 0;
    if (player.equippedClothing) {
      for (const slot of Object.values(player.equippedClothing)) {
        for (const item of Object.values(slot || {})) {
          if (item && item.clothingStats) mPenalty += item.clothingStats.mobilityPenalty || 0;
        }
      }
    }
    player.needs.energy = Math.max(0, player.needs.energy - (20 + mPenalty * 0.4) * dt);
  `
);

fs.writeFileSync('src/physics.ts', code, 'utf8');
console.log("Patched energy logic");

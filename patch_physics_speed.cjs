const fs = require('fs');
let code = fs.readFileSync('src/physics.ts', 'utf8');

const regex = /let targetSpeed = \(canSprint \? 175 : 95\) \* legPenalty;/;
const replacement = `
    let mPenalty = 0;
    if (player.equippedClothing) {
      for (const slot of Object.values(player.equippedClothing)) {
        for (const item of Object.values(slot || {})) {
          if (item && item.clothingStats) mPenalty += item.clothingStats.mobilityPenalty || 0;
        }
      }
    }
    const mobilityFactor = Math.max(0.2, 1.0 - (mPenalty * 0.01));
    let targetSpeed = (canSprint ? 175 : 95) * legPenalty * mobilityFactor;
`;
code = code.replace(regex, replacement);

fs.writeFileSync('src/physics.ts', code, 'utf8');
console.log("Patched physics speed");

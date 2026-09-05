const fs = require('fs');
let code = fs.readFileSync('src/physics.ts', 'utf8');

const regex = /if \(ambientTemp < 18\.0\) \{/;
const replacement = `
  // Calculate clothing stats
  let totalInsulation = 0;
  let totalWaterResist = 0;
  let totalBreathability = 0;
  let totalMobilityPenalty = 0;
  
  if (player.equippedClothing) {
    for (const slot of Object.values(player.equippedClothing)) {
      for (const item of Object.values(slot || {})) {
        if (item && item.clothingStats) {
          totalInsulation += item.clothingStats.insulation || 0;
          totalWaterResist += item.clothingStats.waterResistance || 0;
          totalBreathability += item.clothingStats.breathability || 0;
          totalMobilityPenalty += item.clothingStats.mobilityPenalty || 0;
        }
      }
    }
  }

  // Adjust ambient temp based on clothes
  // If cold outside, clothes keep you warm (increases effective ambient temp)
  const effectiveAmbientTemp = ambientTemp < 18.0 ? ambientTemp + (totalInsulation * 0.25) : ambientTemp;
  const isTooHotClothes = ambientTemp >= 25.0 && totalInsulation > 30;

  if (isTooHotClothes && !player.isInVehicle) {
      // Hot day in heavy clothes
      player.needs.thirst = Math.max(0, player.needs.thirst - (totalInsulation * 0.05) * dt);
      player.needs.energy = Math.max(0, player.needs.energy - (totalMobilityPenalty * 0.05) * dt);
      bs.temperature = Math.min(38.5, bs.temperature + (totalInsulation * 0.0005) * dt);
  }

  if (effectiveAmbientTemp < 18.0) {`;

code = code.replace(regex, replacement);

const regexRain = /const isRaining = world\.weather === 'rain' \|\| world\.weather === 'storm';\n\s*if \(\!player\.isInVehicle \!\!isEnclosed && isRaining\) \{/
// actually the rain logic might be different. Let's find it.

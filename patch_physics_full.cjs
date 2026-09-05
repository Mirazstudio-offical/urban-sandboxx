const fs = require('fs');
let code = fs.readFileSync('src/physics.ts', 'utf8');

// Replace the wetness code and add clothing calculations right above it.
const regex = /  \/\/ 1\. Wetness accumulation \/ drying\n  if \(isExposedToRain\) \{\n    bs\.wetness = Math\.min\(100, bs\.wetness \+ 5\.0 \* dt\);\n  \} else \{/;
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

  // 1. Wetness accumulation / drying
  if (isExposedToRain) {
    const wetRate = Math.max(0, 5.0 - (totalWaterResist * 0.05));
    bs.wetness = Math.min(100, bs.wetness + wetRate * dt);
  } else {`;

code = code.replace(regex, replacement);

const regexCold = /if \(ambientTemp < 18\.0\) \{/;
const replacementCold = `
  // Adjust ambient temp based on clothes
  // If cold outside, clothes keep you warm (increases effective ambient temp)
  const effectiveAmbientTemp = ambientTemp < 18.0 ? ambientTemp + (totalInsulation * 0.25) : ambientTemp;
  const isTooHotClothes = ambientTemp >= 25.0 && totalInsulation > 30;

  if (isTooHotClothes && !player.isInVehicle) {
      // Hot day in heavy clothes
      const sweatRate = Math.max(0, (totalInsulation * 0.05) - (totalBreathability * 0.02));
      player.needs.thirst = Math.max(0, player.needs.thirst - sweatRate * dt);
      player.needs.energy = Math.max(0, player.needs.energy - (totalMobilityPenalty * 0.05) * dt);
      bs.temperature = Math.min(38.5, bs.temperature + (sweatRate * 0.01) * dt);
  }

  if (effectiveAmbientTemp < 18.0) {
    ambientTemp = effectiveAmbientTemp; // Use effective temp for the rest of the cold calculation
`;

code = code.replace(regexCold, replacementCold);

fs.writeFileSync('src/physics.ts', code, 'utf8');
console.log("Patched full clothes physics");

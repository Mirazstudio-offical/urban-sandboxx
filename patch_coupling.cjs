const fs = require('fs');
let code = fs.readFileSync('src/physics.ts', 'utf-8');

const automaticCouplingCode = `
  // Automatic Fifth-Wheel Coupling for Semi-Trucks
  for (const veh of world.vehicles) {
    if (veh.type === 'truck_semi' && !veh.trailerId && veh.speed < -0.1) {
      const vehCfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
      const hitchOffset = veh.hitchOffset !== undefined ? veh.hitchOffset : (vehCfg.hitchOffset !== undefined ? vehCfg.hitchOffset : -vehCfg.length / 2 - 2);
      const hitchX = veh.x + Math.cos(veh.angle) * hitchOffset;
      const hitchY = veh.y + Math.sin(veh.angle) * hitchOffset;

      for (const trailer of world.vehicles) {
        if (trailer.type === 'trailer_semi' && !trailer.towedById) {
          const trailerCfg = CAR_CONFIGS[trailer.type] || CAR_CONFIGS.sedan;
          const couplerOffset = trailer.couplerOffset !== undefined ? trailer.couplerOffset : (trailerCfg.couplerOffset || 50);
          const couplerX = trailer.x + Math.cos(trailer.angle) * couplerOffset;
          const couplerY = trailer.y + Math.sin(trailer.angle) * couplerOffset;
          
          if (Math.hypot(hitchX - couplerX, hitchY - couplerY) < 16) {
            hitchTrailerToVehicle(veh, trailer, world);
            
            // Notify player if they are driving this truck
            if (world.players[0].drivingVehicleId === veh.id) {
              const towName = CAR_CONFIGS[trailer.type]?.name || trailer.type;
              world.players[0]._pendingNotifications = world.players[0]._pendingNotifications || [];
              world.players[0]._pendingNotifications.push({ text: \`Шкворень \${towName} автоматически защелкнут в седле!\`, type: 'info' });
            }
            break; // Only hitch one
          }
        }
      }
    }
  }

  // Update trailer towing physics and tow hitch constraint positioning
  updateTrailerTowingPhysics(world, dt);
`;

code = code.replace('  // Update trailer towing physics and tow hitch constraint positioning\n  updateTrailerTowingPhysics(world, dt);', automaticCouplingCode);

fs.writeFileSync('src/physics.ts', code);

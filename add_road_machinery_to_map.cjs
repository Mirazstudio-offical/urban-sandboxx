const fs = require('fs');

const map = JSON.parse(fs.readFileSync('public/map.json', 'utf8'));

// Helper to create a complete vehicle object
function createRoadMachine(id, type, x, y, angle, color) {
  const configs = {
    paver_asphalt_wheeled: { mass: 18500, width: 32, length: 64, wheelBase: 36, name: 'Асфальтоукладчик колесный' },
    roller_heavy_tandem: { mass: 12500, width: 28, length: 56, wheelBase: 34, name: 'Дорожный каток (ломаная рама)' },
    roller_compact_sidewalk: { mass: 2200, width: 18, length: 32, wheelBase: 18, name: 'Тротуарный каток (ломаная рама)' },
    roller_pneumatic: { mass: 14000, width: 28, length: 58, wheelBase: 36, name: 'Пневмоколесный каток' }
  };

  const cfg = configs[type];

  // Base 16 vertices for deformation mesh
  const halfL = cfg.length / 2;
  const halfW = cfg.width / 2;
  const deformedVertices = [];
  
  const base16 = [
    { localX: halfL, localY: 0 }, { localX: halfL - 0.5, localY: halfW * 0.5 },
    { localX: halfL - 2.5, localY: halfW - 1.5 }, { localX: halfL * 0.5, localY: halfW },
    { localX: 0, localY: halfW }, { localX: -halfL * 0.5, localY: halfW },
    { localX: -halfL + 2.5, localY: halfW - 1.5 }, { localX: -halfL + 0.5, localY: halfW * 0.5 },
    { localX: -halfL, localY: 0 }, { localX: -halfL + 0.5, localY: -halfW * 0.5 },
    { localX: -halfL + 2.5, localY: -halfW + 1.5 }, { localX: -halfL * 0.5, localY: -halfW },
    { localX: 0, localY: -halfW }, { localX: halfL * 0.5, localY: -halfW },
    { localX: halfL - 2.5, localY: -halfW + 1.5 }, { localX: halfL - 0.5, localY: -halfW * 0.5 }
  ];

  for (let i = 0; i < 16; i++) {
    deformedVertices.push({
      localX: base16[i].localX, localY: base16[i].localY,
      offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0,
      structuralType: 'bumper'
    });
  }
  for (let i = 0; i < 12; i++) {
    deformedVertices.push({
      localX: (Math.random() - 0.5) * halfL, localY: (Math.random() - 0.5) * halfW,
      offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0,
      structuralType: 'roof'
    });
  }

  return {
    id,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: angle || 0,
    steerAngle: 0,
    targetSteerAngle: 0,
    speed: 0,
    lateralVelocity: 0,
    angularVelocity: 0,
    isDrifting: false,
    driftFactor: 0,
    mass: cfg.mass,
    width: cfg.width,
    length: cfg.length,
    wheelBase: cfg.wheelBase,
    color: color || '#eab308',
    roofColor: color || '#eab308',
    headlightsOn: false,
    headlightMode: 'off',
    brakeLightsOn: false,
    isReversing: false,
    turnSignal: 'none',
    turnSignalTimer: 0,
    requiredFuel: 'diesel',
    engineState: {
      radiatorWater: 100,
      radiatorPunctured: false,
      oilLevel: 100,
      oilPunctured: false,
      oilPressure: 0,
      batteryCharge: 100,
      starterWorking: true,
      temperature: 20,
      engineRunning: false,
      engineKnocking: false,
      engineStalled: false,
      overheatingSteam: false,
      engineRPM: 0,
      transmissionType: 'MANUAL',
      currentGear: 0,
      gearRatios: [-4.5, 0, 4.8, 3.1, 2.0, 1.42, 1.00, 0.75],
      finalDriveRatio: 4.8,
      clutchPedal: 1,
      isStalled: false,
      engineHealth: 100,
      isSeized: false,
      transmissionHealth: 100,
      transmissionJammed: false
    },
    fuelSystem: {
      fuelType: 'diesel',
      tankLevel: 80,
      tankCapacity: 180,
      tankPunctured: false,
      fuelQuality: 100,
      detonation: false,
      octaneNumber: 45
    },
    damage: {
      frontCrumple: 0, rearCrumple: 0, leftDent: 0, rightDent: 0,
      frontLeftDent: 0, frontRightDent: 0, rearLeftDent: 0, rearRightDent: 0,
      frontLeftSuspensionDamage: 0, frontRightSuspensionDamage: 0,
      rearLeftSuspensionDamage: 0, rearRightSuspensionDamage: 0,
      steeringDrift: 0, wheelRubResistance: 0,
      hoodBuckled: false, windshieldCracked: false, rearGlassCracked: false,
      leftHeadlightBroken: false, rightHeadlightBroken: false,
      leftTaillightBroken: false, rightTaillightBroken: false,
      engineSmoking: false, underHoodSmolder: false, engineFire: false,
      fuelTankFire: false, cabinFire: false, fireOrigin: 'front',
      fireProgress: 0, fireIntensity: 0, fireTimer: 0,
      groundPuddleIgnited: false, fuelTankBurntThrough: false, isFullyBurnt: false,
      scratches: [],
      deformedVertices
    },
    isPlayerControlled: false,
    isParked: true,
    targetSpeed: 0,
    currentLaneId: null,
    targetWaypointIndex: 0,
    routeWaypoints: [],
    aiState: 'parked',
    inIntersection: false,
    plannedTurn: 'straight',
    stuckTimer: 0,
    honkTimer: 0,
    isHonking: false,
    hornEffectTimer: 0
  };
}

map.vehicles = map.vehicles.filter(v => !v.id.startsWith('veh_roadwork_'));

map.vehicles.push(createRoadMachine('veh_roadwork_paver_1', 'paver_asphalt_wheeled', 3920, 1720, 0, '#eab308'));
map.vehicles.push(createRoadMachine('veh_roadwork_roller_heavy_1', 'roller_heavy_tandem', 3980, 1720, 0, '#eab308'));
map.vehicles.push(createRoadMachine('veh_roadwork_roller_compact_1', 'roller_compact_sidewalk', 4040, 1720, 0, '#f97316'));
map.vehicles.push(createRoadMachine('veh_roadwork_roller_pneumatic_1', 'roller_pneumatic', 4100, 1720, 0, '#ea580c'));

map.vehicles.push(createRoadMachine('veh_roadwork_paver_2', 'paver_asphalt_wheeled', 5850, 320, 1.57, '#eab308'));
map.vehicles.push(createRoadMachine('veh_roadwork_roller_heavy_2', 'roller_heavy_tandem', 5900, 320, 1.57, '#eab308'));
map.vehicles.push(createRoadMachine('veh_roadwork_roller_compact_2', 'roller_compact_sidewalk', 5950, 320, 1.57, '#f97316'));
map.vehicles.push(createRoadMachine('veh_roadwork_roller_pneumatic_2', 'roller_pneumatic', 6000, 320, 1.57, '#ea580c'));

fs.writeFileSync('public/map.json', JSON.stringify(map));
console.log('Successfully added road construction machinery to public/map.json! Total vehicles:', map.vehicles.length);

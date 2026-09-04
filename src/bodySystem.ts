import { BodyPartsMap, BodyState, Injury, InjuryType, Player, InputState, Vehicle } from './types';
import { sound } from './audio';
import { addPlayerNotification } from './items';

export const BODY_PART_KEYS: (keyof BodyPartsMap)[] = [
  'head',
  'torso',
  'leftArm',
  'rightArm',
  'leftLeg',
  'rightLeg'
];

export const BODY_PART_NAMES_RU: Record<keyof BodyPartsMap, string> = {
  head: 'Голова',
  torso: 'Грудь / Торс',
  leftArm: 'Левая рука',
  rightArm: 'Правая рука',
  leftLeg: 'Левая нога',
  rightLeg: 'Правая нога'
};

/**
 * Creates an empty default BodyPartsMap
 */
export function createDefaultBodyPartsMap(): BodyPartsMap {
  return {
    head: [],
    torso: [],
    leftArm: [],
    rightArm: [],
    leftLeg: [],
    rightLeg: []
  };
}

/**
 * Creates an initial healthy BodyState
 */
export function createDefaultBodyState(): BodyState {
  return {
    hydration: 100,
    energy: 100,
    temperature: 36.6,
    wetness: 0,
    painLevel: 0,
    effectivePain: 0,
    painPulse: 0,
    heartRate: 70,
    bloodLoss: 0,
    shockLevel: 0,
    panicLevel: 0,
    activeMedications: [],
    shiverIntensity: 0,
    bodyParts: createDefaultBodyPartsMap(),
    coPoisoning: 0,
    dizziness: 0,
    suffocationLevel: 0,
    coughTimer: 0,
    groanTimer: 0,
    heavyBreathTimer: 0,
    shiverTimer: 0,
    tinnitusTimer: 0,
    impactFlashTimer: 0
  };
}

/**
 * Helper to add an injury to a specific body part
 */
export function addInjuryToPart(
  bodyState: BodyState,
  partKey: keyof BodyPartsMap,
  type: InjuryType,
  severity: number = 50,
  burnDegree?: 1 | 2 | 3
): Injury {
  const part = bodyState.bodyParts[partKey];
  const existing = part.find(i => i.type === type && !i.treated);
  if (existing) {
    existing.severity = Math.min(100, (existing.severity || 50) + severity * 0.5);
    if (burnDegree && (!existing.burnDegree || burnDegree > existing.burnDegree)) {
      existing.burnDegree = burnDegree;
    }
    existing.pain = calculateInjuryPain(existing.type, existing.severity, existing.treated, existing.burnDegree);
    return existing;
  }

  const newInj: Injury = {
    id: `inj_${partKey}_${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    treated: false,
    severity: Math.min(100, severity),
    pain: calculateInjuryPain(type, severity, false, burnDegree),
    treatedTimer: 0,
    bleedingRate: type === 'bleeding' ? severity : 0,
    burnDegree: type === 'burn' ? (burnDegree || 1) : undefined
  };

  part.push(newInj);
  return newInj;
}

/**
 * Calculates raw baseline pain for a given injury type and severity
 */
export function calculateInjuryPain(
  type: InjuryType,
  severity: number = 50,
  treated: boolean = false,
  burnDegree?: 1 | 2 | 3
): number {
  let base = 0;
  switch (type) {
    case 'fracture':
      base = treated ? 25 : 55; // Untreated fracture is excruciating
      break;
    case 'burn':
      if (burnDegree === 3) base = treated ? 25 : 65; // 3rd degree deep thermal burn
      else if (burnDegree === 2) base = treated ? 15 : 42; // 2nd degree blister burn
      else base = treated ? 6 : 20; // 1st degree skin redness burn
      break;
    case 'bleeding':
      base = treated ? 10 : 35;
      break;
    case 'sprain':
      base = treated ? 8 : 22;
      break;
    case 'bruise':
      base = treated ? 4 : 14;
      break;
    case 'abrasion':
      base = treated ? 2 : 8;
      break;
  }
  const factor = (severity / 100) * 0.6 + 0.4;
  return Math.min(100, Math.round(base * factor));
}

/**
 * Distributes vehicle impact or fall collision damage across multiple limbs
 * based on impact velocity and angle
 */
export function distributeImpactDamage(
  player: Player,
  impactForce: number, // e.g. 10 to 100
  impactAngle: number = 0,
  isVehicleCollision: boolean = true
) {
  if (!player.bodyState) {
    player.bodyState = createDefaultBodyState();
  }
  const bs = player.bodyState;

  // Impact flash & ringing
  if (impactForce > 20) {
    bs.impactFlashTimer = Math.min(1.5, 0.4 + impactForce * 0.015);
    if (impactForce > 40) {
      bs.tinnitusTimer = Math.min(6.0, 1.5 + impactForce * 0.05);
      sound.playAlert();
    }
  }

  // Calculate damage reduction / health penalty proportional to impact force
  const directHpLoss = Math.min(100, Math.round(impactForce * 0.8));
  player.needs.health = Math.max(1, player.needs.health - directHpLoss);
  player.lastHurtTime = Date.now() / 1000;

  // Trigger traumatic shock, panic attack & potential fainting on heavy impact
  bs.shockLevel = Math.min(100, bs.shockLevel + impactForce * 1.2);
  bs.panicLevel = Math.min(100, (bs.panicLevel || 0) + impactForce * 1.8);
  if (impactForce > 32 || bs.shockLevel > 70) {
    player.isFainting = true;
    player.faintTimer = Math.min(12, Math.max(3, Math.round(impactForce * 0.12)));
    bs.impactFlashTimer = 2.0;
    bs.tinnitusTimer = 3.5;
    sound.playTinnitus(3.5);
    addPlayerNotification(player, `💫 Вы потеряли сознание от сильного удара! (${Math.round(player.faintTimer)}s)`, 'warning');
  }

  // Multi-limb distribution based on realistic mechanics:
  // Car bumper strikes legs first, hood hits torso, head/arms hit windshield or pavement
  if (impactForce >= 25) {
    // 1. Legs (High risk of fracture / heavy contusion above ~25 km/h)
    const legDamage = impactForce * (isVehicleCollision ? 0.95 : 0.65);
    if (legDamage >= 28) {
      // Fracture at least one leg!
      addInjuryToPart(bs, 'leftLeg', 'fracture', legDamage);
      if (legDamage >= 52) {
        // Fractures in BOTH legs on high-speed hit (>40-50 km/h)
        addInjuryToPart(bs, 'rightLeg', 'fracture', legDamage * 0.9);
      } else {
        addInjuryToPart(bs, 'rightLeg', 'sprain', legDamage * 0.8);
      }
    } else {
      addInjuryToPart(bs, 'leftLeg', 'bruise', legDamage);
      addInjuryToPart(bs, 'rightLeg', 'sprain', legDamage * 0.8);
    }
    addInjuryToPart(bs, 'leftLeg', 'bleeding', Math.min(85, legDamage * 0.7));

    // 2. Torso (Blunt chest trauma, rib fractures above ~35 impact Force)
    const torsoDamage = impactForce * 0.7;
    addInjuryToPart(bs, 'torso', 'bruise', torsoDamage);
    if (torsoDamage >= 35) {
      addInjuryToPart(bs, 'torso', 'fracture', torsoDamage * 0.85); // Broken ribs
      addInjuryToPart(bs, 'torso', 'bleeding', torsoDamage * 0.6);
    } else if (torsoDamage >= 18) {
      addInjuryToPart(bs, 'torso', 'abrasion', torsoDamage);
    }

    // 3. Head (Concussion, whiplash, laceration)
    const headDamage = impactForce * 0.5;
    if (headDamage >= 18) {
      addInjuryToPart(bs, 'head', 'bruise', headDamage);
      if (headDamage >= 32) {
        addInjuryToPart(bs, 'head', 'bleeding', headDamage * 0.75);
      }
    }

    // 4. Arms (Defensive reflex injuries / pavement slide / fracture)
    const armDamage = impactForce * 0.55;
    if (armDamage >= 30) {
      addInjuryToPart(bs, Math.random() > 0.5 ? 'leftArm' : 'rightArm', 'fracture', armDamage);
    } else {
      addInjuryToPart(bs, 'leftArm', 'bruise', armDamage);
      addInjuryToPart(bs, 'rightArm', 'abrasion', armDamage);
    }
  } else {
    // Minor low-speed collision (5-20 km/h): scrapes, sprains, and minor bruises
    // Only apply if impactForce is actually significant to avoid injuries from minor car-taps or slow parking bumps
    if (impactForce > 2.5) {
      addInjuryToPart(bs, 'torso', 'bruise', Math.max(1, Math.round(impactForce * 1.2)));
      addInjuryToPart(bs, 'leftLeg', 'abrasion', Math.max(1, Math.round(impactForce * 1.0)));
      if (impactForce > 12) {
        addInjuryToPart(bs, 'rightLeg', 'sprain', Math.round(impactForce * 0.9));
      }
    }
  }

  // Trigger immediate pain groaning sound
  sound.playGroan();
}

/**
 * Calculates and applies trauma/injuries to the driver (player) during a vehicle crash
 * based on modern automotive safety standards (Euro NCAP / NHTSA), vehicle class passive protection,
 * cabin structural integrity and accumulated crumple deformation.
 */
export function applyDriverVehicleCrashTrauma(
  player: Player,
  impactSpeedPx: number,
  obstacleType: string = 'препятствие',
  resistanceFactor: number = 1.0,
  vehicle?: Vehicle
) {
  if (!player.needs) return;

  const now = Date.now() / 1000;
  if (player.lastHurtTime && now - player.lastHurtTime < 0.45) {
    return;
  }

  // Effective impact speed scaled by frangibility/resistance of the obstacle
  const effectiveSpeedPx = impactSpeedPx * resistanceFactor;
  const speedKmh = Math.round(effectiveSpeedPx * 0.36);

  // 1. Determine vehicle class passive safety absorption (Euro NCAP / NHTSA standards)
  let baseSafetyAbsorption = 0.65; // Default modern sedan (65% absorption)
  let safetyTag = '🛡️ [Euro NCAP 5★]';

  if (vehicle) {
    const vType = vehicle.type;
    const isSuvOrPolice = ['suv', 'ambulance_suv', 'police', 'fire_rescue'].includes(vType);
    const isHeavyTruck = ['truck_box', 'truck_dump', 'truck_tanker', 'truck_water', 'truck_flatbed', 'cement_mixer', 'fire_engine', 'fire_ladder', 'garbage_truck'].includes(vType);
    const isSports = ['sports', 'muscle'].includes(vType);
    const isBus = vType === 'bus' || vType === 'bus_minibus';

    if (isSuvOrPolice) {
      baseSafetyAbsorption = 0.75; // Heavy chassis, high seating, multiple airbags & pretensioners
      safetyTag = '🚜 [Рамный кузов/SUV]';
    } else if (isHeavyTruck) {
      baseSafetyAbsorption = obstacleType === 'здание' ? 0.45 : 0.72; // High mass against cars, stiff cab against walls
      safetyTag = '🚛 [Силовой каркас тягача]';
    } else if (isSports) {
      baseSafetyAbsorption = 0.50; // Carbon/steel monocoque, stiffer G-forces
      safetyTag = '🏎️ [Спорткар / Жесткий кузов]';
    } else if (isBus) {
      baseSafetyAbsorption = 0.60;
      safetyTag = '🚌 [Автобус]';
    }
  }

  // 2. Cabin structural integrity & accumulated crumple damage
  let damagePenalty = 1.0;
  let isCabinCompromised = false;
  let isSideImpact = false;

  if (vehicle && vehicle.damage) {
    const dmg = vehicle.damage;
    // Front crumple spent or windshield cracked -> airbags deployed, engine pushed back
    if ((dmg.frontCrumple && dmg.frontCrumple > 7) || dmg.windshieldCracked) {
      damagePenalty += 0.65;
      isCabinCompromised = true;
    }
    // Driver side door crushed -> direct mechanical force to driver body
    if ((dmg.leftDent && dmg.leftDent > 2.5) || (dmg.frontLeftDent && dmg.frontLeftDent > 3.5)) {
      damagePenalty += 0.50;
      isSideImpact = true;
    }
  }

  // Net safety protection ratio
  const netProtection = Math.max(0.12, baseSafetyAbsorption / damagePenalty);

  // Minimum safe threshold: modern pretensioners & crumple zone absorb taps up to safe limit
  const safeThresholdKmh = Math.round(15 * (baseSafetyAbsorption / 0.65));
  if (speedKmh < safeThresholdKmh) return;

  player.lastHurtTime = now;

  // Kinetic force transferred to driver cabin after passive safety absorption & structural penalty
  const netEnergyTransferred = (1.0 - netProtection);
  const driverImpactForce = Math.max(0, (speedKmh - safeThresholdKmh) * 1.3 * netEnergyTransferred * damagePenalty);

  // Apply body state trauma to driver
  distributeImpactDamage(player, driverImpactForce, 0, true);
  sound.playHurt();

  // Speed & Safety calibrated notifications
  if (speedKmh < 35) {
    addPlayerNotification(player, `${safetyTag} Удар о ${obstacleType} (${speedKmh} км/ч). Ремень и подушка уберегли от травм.`, 'warning');
  } else if (speedKmh < 65) {
    if (isCabinCompromised) {
      addPlayerNotification(player, `⚠️ [Деформация салона] ДТП на ${speedKmh} км/ч! Повторный удар по исчерпанной зоне деформации!`, 'warning');
    } else if (isSideImpact) {
      addPlayerNotification(player, `🚗 [Боковой удар] Удар в стойку двери на ${speedKmh} км/ч! Ушиб грудной клетки!`, 'warning');
    } else {
      addPlayerNotification(player, `${safetyTag} Столкновение (${speedKmh} км/ч)! Сработали подушки безопасности и преднатяжители ремней!`, 'warning');
    }
  } else if (speedKmh < 95) {
    if (isCabinCompromised) {
      addPlayerNotification(player, `💥 [Деформация салона] Тяжелая авария на ${speedKmh} км/ч! Смещение педального узла и рулевой колонки!`, 'warning');
    } else {
      addPlayerNotification(player, `💥 Тяжелое ДТП (${speedKmh} км/ч)! Перегрузка >15G, травматический шок и переломы!`, 'warning');
    }
  } else {
    addPlayerNotification(player, `🚨 [Перегрузка >25G] Катастрофический таран на ${speedKmh} км/ч! Разрушение силового каркаса и потеря сознания!`, 'warning');
  }
}

/**
 * Calculates raw base pain from all body parts
 */
export function calculateTotalBasePain(bodyParts: BodyPartsMap): number {
  let total = 0;
  for (const k of BODY_PART_KEYS) {
    const part = bodyParts[k] || [];
    for (const inj of part) {
      const p = inj.pain !== undefined ? inj.pain : calculateInjuryPain(inj.type, inj.severity || 50, inj.treated);
      total += p;
    }
  }
  // Cap base pain at 100 with diminishing returns for very high numbers
  return Math.min(100, Math.round(total * 0.75));
}

/**
 * Main physiology update loop called every frame (dt in seconds)
 */
export function updateBodySystem(
  player: Player,
  input: InputState | null,
  dt: number,
  gameTime: number
) {
  if (!player.bodyState) {
    player.bodyState = createDefaultBodyState();
  }
  const bs = player.bodyState;

  // 1. Clean / update active injuries & timers
  let activeBleedingCount = 0;
  let totalBleedingRate = 0;
  let hasUntreatedLegFracture = false;
  let hasTreatedLegFracture = false;
  let hasLegInjury = false;
  let hasUntreatedArmFracture = false;

  for (const k of BODY_PART_KEYS) {
    const part = bs.bodyParts[k] || [];
    for (let i = part.length - 1; i >= 0; i--) {
      const inj = part[i];
      if (inj.treated) {
        inj.treatedTimer = (inj.treatedTimer || 0) + dt;
        // Treated injuries gradually heal and fade over time:
        // Abrasions & Bruises heal in ~80-100s
        if ((inj.type === 'abrasion' || inj.type === 'bruise') && inj.treatedTimer > 90) {
          part.splice(i, 1);
          continue;
        }
        // Sprains heal in ~150s
        if (inj.type === 'sprain' && inj.treatedTimer > 150) {
          part.splice(i, 1);
          continue;
        }
        // Bleeding wounds heal/close in ~120s once bandaged
        if (inj.type === 'bleeding' && inj.treatedTimer > 120) {
          part.splice(i, 1);
          continue;
        }
        // Fractures heal in ~240s once immobilized with a splint
        if (inj.type === 'fracture' && inj.treatedTimer > 240) {
          part.splice(i, 1);
          continue;
        }
        // Burns heal gradually when treated (1st degree ~160s, 2nd degree ~280s, 3rd degree ~450s)
        if (inj.type === 'burn') {
          const burnHealTime = inj.burnDegree === 3 ? 450 : (inj.burnDegree === 2 ? 280 : 160);
          if (inj.treatedTimer > burnHealTime) {
            part.splice(i, 1);
            continue;
          }
        }
      }

      // Check bleeding
      if (inj.type === 'bleeding' && !inj.treated) {
        activeBleedingCount++;
        totalBleedingRate += (inj.bleedingRate || inj.severity || 50);
      }

      // Check limb conditions
      if (k === 'leftLeg' || k === 'rightLeg') {
        if (inj.type === 'fracture') {
          if (!inj.treated) hasUntreatedLegFracture = true;
          else hasTreatedLegFracture = true;
        }
        if (!inj.treated) hasLegInjury = true;
      }
      if (k === 'leftArm' || k === 'rightArm') {
        if (inj.type === 'fracture' && !inj.treated) {
          hasUntreatedArmFracture = true;
        }
      }

      // Update local pain
      inj.pain = calculateInjuryPain(inj.type, inj.severity || 50, inj.treated, inj.burnDegree);
    }
  }

  // 2. Blood loss & hemorrhagic shock simulation
  if (totalBleedingRate > 0) {
    const bloodLossDelta = (totalBleedingRate / 100) * 0.45 * dt; // Slow steady drain
    bs.bloodLoss = Math.min(100, (bs.bloodLoss || 0) + bloodLossDelta);
    // Continuous health drain from active bleeding
    player.needs.health = Math.max(1, player.needs.health - bloodLossDelta * 0.6);
  } else {
    // Very slow natural blood regeneration if well-hydrated & fed
    if (player.needs.hunger > 50 && player.needs.thirst > 50 && (bs.bloodLoss || 0) > 0) {
      bs.bloodLoss = Math.max(0, (bs.bloodLoss || 0) - 0.05 * dt);
    }
  }

  // Shock level computation
  const traumaShock = (bs.painLevel || 0) * 0.4;
  const bloodShock = (bs.bloodLoss || 0) * 0.7;
  bs.shockLevel = Math.min(100, Math.round(traumaShock + bloodShock));

  // 3. Raw Cumulative Pain
  const rawBasePain = calculateTotalBasePain(bs.bodyParts);
  bs.painLevel = rawBasePain;

  // 4. Dynamic Movement Pain Modulation
  const isMoving = Math.hypot(player.vx, player.vy) > 8;
  const isSprinting = isMoving && (input?.sprint ?? false);
  let movementPainMultiplier = 1.0;
  let dynamicPainBonus = 0;

  if (isMoving) {
    if (hasUntreatedLegFracture) {
      // Acute sharp spike from stepping on a fractured bone!
      movementPainMultiplier = 1.8;
      dynamicPainBonus += isSprinting ? 50 : 35;
    } else if (hasTreatedLegFracture) {
      // Splinted leg: moderate dull ache on movement
      movementPainMultiplier = 1.2;
      dynamicPainBonus += 10;
    } else if (hasLegInjury) {
      movementPainMultiplier = 1.3;
      dynamicPainBonus += isSprinting ? 18 : 8;
    }

    if (hasUntreatedArmFracture && isSprinting) {
      dynamicPainBonus += 12; // Arm flailing
    }
  }

  let totalDynamicPain = Math.min(100, Math.round(rawBasePain * movementPainMultiplier + dynamicPainBonus));

  // 5. Pharmacokinetic Pain Suppression from Active Medications
  let drugPainRelief = 0;
  if (bs.activeMedications && bs.activeMedications.length > 0) {
    for (const med of bs.activeMedications) {
      if (med.type === 'analgesic') {
        drugPainRelief = Math.min(0.95, drugPainRelief + med.currentEffectiveness * med.maxPainkillerPower);
      }
    }
  }

  // Calculate final effective perceived pain
  const effectivePain = Math.max(0, Math.round(totalDynamicPain * (1.0 - drugPainRelief)));
  bs.effectivePain = effectivePain;

  // 6. Panic & Fear Physiology Drive
  // Driven by severe pain (>20), shock level (>20), active bleeding, and low health (<40)
  const painPanicDrive = effectivePain > 20 ? (effectivePain - 20) * 0.22 : 0;
  const shockPanicDrive = (bs.shockLevel || 0) * 0.3;
  const bleedingPanicDrive = activeBleedingCount * 7;
  const healthPanicDrive = player.needs.health < 40 ? (40 - player.needs.health) * 0.35 : 0;
  const targetPanicLevel = Math.min(100, painPanicDrive + shockPanicDrive + bleedingPanicDrive + healthPanicDrive);

  // Smoothly adjust panic level, or decay naturally by ~3.5 units/sec when situation calms
  if ((bs.panicLevel || 0) < targetPanicLevel) {
    bs.panicLevel = Math.min(100, (bs.panicLevel || 0) + (targetPanicLevel - (bs.panicLevel || 0)) * 2.5 * dt);
  } else {
    bs.panicLevel = Math.max(0, (bs.panicLevel || 0) - 3.5 * dt);
  }

  // 7. Rhythmic Heartbeat & Pain/Panic Pulse Engine
  // Base heart rate: 65 BPM. Accelerates up to 185 BPM under intense pain, sprinting, shock, or acute panic
  const targetHeartRate = 65 + (effectivePain * 0.65) + ((bs.panicLevel || 0) * 0.5) + (isSprinting ? 35 : isMoving ? 15 : 0) + ((bs.shockLevel || 0) * 0.4);
  bs.heartRate = (bs.heartRate || 70) + (targetHeartRate - (bs.heartRate || 70)) * 2.0 * dt;

  // Pulse speed (radians per second)
  const pulseSpeed = ((bs.heartRate || 70) / 60) * Math.PI * 2;
  bs.painPulse = Math.sin(gameTime * pulseSpeed);

  // 7. Cold Shiver & Jitter
  if (bs.temperature < 36.5) {
    const coldDeficit = Math.max(0, 36.6 - bs.temperature);
    // Smoothly build up shiver intensity based on temperature drop (1.8 degrees drop = maximum shivering)
    const targetShiver = Math.min(1.0, coldDeficit / 1.8);
    bs.shiverIntensity = (bs.shiverIntensity || 0) + (targetShiver - (bs.shiverIntensity || 0)) * 1.5 * dt;
  } else {
    bs.shiverIntensity = Math.max(0, (bs.shiverIntensity || 0) - 1.5 * dt);
  }

  // 8. Timers for Fainting, Groans, Breathing, Tinnitus, Flash
  if (player.needsHospitalEvacuation) {
    player.isFainting = true;
    player.vx = 0;
    player.vy = 0;
    if (player.isInVehicle) {
      player.isInVehicle = false;
      player.currentVehicleId = null;
    }
  } else if (player.isHospitalized) {
    player.isFainting = false;
    player.faintTimer = 0;
    player.vx = 0;
    player.vy = 0;
  } else if (player.faintTimer && player.faintTimer > 0) {
    player.faintTimer = Math.max(0, player.faintTimer - dt);
    player.isFainting = true;
    player.vx = 0;
    player.vy = 0;
    if (player.faintTimer === 0) {
      player.isFainting = false;
      addPlayerNotification(player, `👁️ Вы пришли в сознание... Голова раскалывается.`, 'warning');
    }
  } else {
    player.isFainting = false;
  }

  if (bs.impactFlashTimer && bs.impactFlashTimer > 0) {
    bs.impactFlashTimer = Math.max(0, bs.impactFlashTimer - dt);
  }
  if (bs.tinnitusTimer && bs.tinnitusTimer > 0) {
    bs.tinnitusTimer = Math.max(0, bs.tinnitusTimer - dt);
  }

  // Random auditory groans when in severe pain and moving
  if (effectivePain > 45 && isMoving) {
    bs.groanTimer = (bs.groanTimer || 0) + dt;
    if (bs.groanTimer > (effectivePain > 75 ? 4.5 : 8.0)) {
      bs.groanTimer = 0;
      sound.playGroan();
    }
  }
}

/**
 * Soothes panic & fear when eating, drinking, or taking calmatives/medications
 */
export function soothePanic(player: Player, amount: number) {
  if (!player.bodyState) return;
  const bs = player.bodyState;
  const prevPanic = bs.panicLevel || 0;
  if (prevPanic > 0) {
    bs.panicLevel = Math.max(0, prevPanic - amount);
    if (prevPanic > 20 && bs.panicLevel <= 20) {
      addPlayerNotification(player, '🧘 Вы смогли перевести дыхание и немного успокоиться...', 'info');
    }
  }
}

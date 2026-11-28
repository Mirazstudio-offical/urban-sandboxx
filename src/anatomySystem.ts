import {
  Animal,
  AnimalAnatomyState,
  AnimalBodyZone,
  BallisticProjectile,
  BodyPartsMap,
  EntityAnatomyState,
  EntityWoundEntry,
  GameWorld,
  InjuryType,
  Pedestrian,
} from './types';
import { addOrGrowFluidStain } from './physics';
import { ANIMAL_SPECIES_CONFIG } from './animalSystem';

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// CONTEXTUAL RUSSIAN VOCALIZATIONS BY ANATOMY & PSYCHOLOGICAL STATE
// ============================================================================

const PED_PHRASES_GUNSHOT_PANIC = [
  'Стреляют!! Ложись!',
  'Оружие!! Бежим отсюда!',
  'Помогите! Тут стрельба!',
  'Спасайтесь! Вызывайте полицию!',
  'Бегите в укрытие!!',
];
const PED_PHRASES_GUNSHOT_COWER = [
  'Не стреляйте!! Пожалуйста!',
  'Только не в меня!!',
  'Господи, помоги...',
  'Я ничего не сделал!!',
];
const PED_PHRASES_GUNSHOT_CALL = [
  'Алло, 112?! Тут стрельба на улице!',
  'Полицию и скорую, срочно! Человек с оружием!',
  '112! Слышны выстрелы, люди разбегаются!',
];
const PED_PHRASES_AIRGUN_STING_ANGRY = [
  'Ай! Кто стреляет из воздушки?!',
  'Эй!! Ты совсем с ума сошёл?!',
  'Больно же! Прекрати сейчас же!',
  'Чёрт, обожгло! Убери ствол!',
];
const PED_PHRASES_AIRGUN_COAT_STOP = [
  'Эй! Чем ты в меня кинул?!',
  'Это пневматика?! Ты что творишь?!',
  'Куртку продырявишь, псих!!',
];
const PED_PHRASES_HIT_HEAD = ['Аааа... голова...', 'В глазах темнеет...', 'Не могу...'];
const PED_PHRASES_HIT_TORSO = ['Дышать не могу...', 'В грудь... скорую!', 'Кровь... помогите!', 'Агх... горит внутри...'];
const PED_PHRASES_HIT_ARM = ['Рука!! Прострелили руку!', 'Ай! Руку не чувствую!', 'Чёрт, кровь из руки!'];
const PED_PHRASES_HIT_LEG = ['Нога!! Не могу идти!', 'Аааа! Прострелили ногу!', 'Помогите, нога подкосилась!'];
const PED_PHRASES_BLEEDOUT = ['Холодно... помогите...', 'Скорую... кто-нибудь...', 'Темнеет в глазах...'];

function pedSpeak(ped: Pedestrian, text: string, duration: number, nowSec: number, force = false): void {
  if (ped.state === 'dead' || ped.state === 'unconscious') return;
  if (!force && ped.psy && nowSec - ped.psy.lastSpeechTime < 2.2) return;
  ped.alertBubbleText = text;
  ped.alertBubbleTimer = duration;
  if (ped.psy) ped.psy.lastSpeechTime = nowSec;
}

// ============================================================================
// ANATOMY INITIALIZERS
// ============================================================================

export function ensurePedestrianAnatomy(ped: Pedestrian): EntityAnatomyState {
  if (!ped.anatomy) {
    ped.anatomy = {
      parts: {
        head: [],
        torso: [],
        leftArm: [],
        rightArm: [],
        leftLeg: [],
        rightLeg: [],
      },
      brainDamage: 0,
      lungHeartDamage: 0,
      arterialBleeding: false,
      bloodLoss: 0,
      painLevel: 0,
      adrenaline: 0,
      shockLevel: 0,
      heartRate: 72,
      consciousness: 100,
      isDead: false,
      deadTimer: 0,
      deathSide: Math.random() < 0.5 ? -1 : 1,
      bloodDripTimer: 0,
      lastHitTime: -10,
      gunshotTraumaCount: 0,
      pneumaticHitCount: 0,
    };
  }
  return ped.anatomy;
}

export function ensureAnimalAnatomy(animal: Animal): AnimalAnatomyState {
  if (!animal.anatomy) {
    animal.anatomy = {
      zones: {
        head: [],
        vitals: [],
        abdomen: [],
        frontLegL: [],
        frontLegR: [],
        hindLegL: [],
        hindLegR: [],
      },
      cnsDamage: 0,
      heartLungDamage: 0,
      visceralDamage: 0,
      brokenLegs: {
        frontL: false,
        frontR: false,
        hindL: false,
        hindR: false,
      },
      bloodLoss: 0,
      painLevel: 0,
      adrenaline: 0,
      shockLevel: 0,
      consciousness: 100,
      bloodDripTimer: 0,
      lastHitTime: -10,
    };
  }
  return animal.anatomy;
}

function pushWound(
  list: EntityWoundEntry[],
  type: InjuryType,
  severity: number,
  bleedingRate: number,
  pain: number,
  caliberMm: number,
  isPenetrating: boolean,
  isPelletSting: boolean,
  nowSec: number
): void {
  if (list.length >= 10) {
    const existing = list.find((w) => w.type === type);
    if (existing) {
      existing.severity = Math.min(100, existing.severity + severity * 0.6);
      existing.bleedingRate = Math.min(100, existing.bleedingRate + bleedingRate * 0.65);
      existing.pain = Math.min(100, existing.pain + pain * 0.55);
      return;
    }
  }
  list.push({
    id: `w_${type}_${Math.floor(nowSec * 1000)}_${Math.floor(Math.random() * 999)}`,
    type,
    severity: clamp(severity, 1, 100),
    bleedingRate: clamp(bleedingRate, 0, 100),
    pain: clamp(pain, 0, 100),
    caliberMm,
    isPenetrating,
    isPelletSting,
    timestamp: nowSec,
  });
}

// ============================================================================
// ANATOMICAL HIT-ZONE RESOLUTION (Exact 2D Local Geometry)
// ============================================================================

export function resolvePedestrianHitZone(
  ped: Pedestrian,
  hitX: number,
  hitY: number,
  projAngle: number
): keyof BodyPartsMap {
  const dx = hitX - ped.x;
  const dy = hitY - ped.y;
  const cosA = Math.cos(ped.angle);
  const sinA = Math.sin(ped.angle);
  // Local coordinates: +lx = forward (face/chest), +ly = right side
  const lx = dx * cosA + dy * sinA;
  const ly = -dx * sinA + dy * cosA;
  const scale = (ped.bio?.heightScale ?? 1.0) * 0.74;
  const nLx = lx / Math.max(0.5, scale);
  const nLy = ly / Math.max(0.5, scale);
  const r = Math.hypot(nLx, nLy);

  // If knocked down / lying flat, map along body axis
  if (ped.state === 'knocked_down' || ped.state === 'unconscious' || ped.state === 'dead' || ped.state === 'crawling_injured') {
    if (nLx > 3.2) return 'head';
    if (nLx < -2.4) return nLy >= 0 ? 'rightLeg' : 'leftLeg';
    if (Math.abs(nLy) > 2.8) return nLy >= 0 ? 'rightArm' : 'leftArm';
    return 'torso';
  }

  // Standing human top-down silhouette + vertical ballistic probability slice:
  // Outer lateral band -> arms
  if (Math.abs(nLy) > 3.15 && Math.abs(nLx) < 3.6) {
    return nLy < 0 ? 'leftArm' : 'rightArm';
  }
  // Center-head core: bullseye shot directly on crown/face
  if (r < 2.25 && Math.random() < 0.42) {
    return 'head';
  }
  // Striding legs protrude front/back when walking or running
  const speedNorm = clamp((ped.speed || 0) / 80, 0, 1);
  if ((Math.abs(nLx) > 2.8 && Math.abs(nLy) < 3.2) || (r > 3.4 && Math.random() < 0.45 + speedNorm * 0.25)) {
    // Also factor shot incidence angle slightly
    const sideBias = nLy !== 0 ? nLy : Math.sin(projAngle - ped.angle);
    return sideBias < 0 ? 'leftLeg' : 'rightLeg';
  }
  // Weighted vertical hit distribution for central torso/head/legs on a standing silhouette
  const roll = Math.random();
  if (r < 2.6 && roll < 0.24) return 'head';
  if (roll < 0.74) return 'torso';
  if (roll < 0.87) return nLy < 0 ? 'leftLeg' : 'rightLeg';
  return nLy < 0 ? 'leftArm' : 'rightArm';
}

export function resolveAnimalHitZone(
  animal: Animal,
  hitX: number,
  hitY: number
): AnimalBodyZone {
  const dx = hitX - animal.x;
  const dy = hitY - animal.y;
  const cosA = Math.cos(animal.angle);
  const sinA = Math.sin(animal.angle);
  const halfLen = Math.max(4, animal.bodyLength * 0.5);
  const halfWid = Math.max(2.5, animal.bodyWidth * 0.5);
  const nx = (dx * cosA + dy * sinA) / halfLen; // -1 (rump) .. +1 (snout/head)
  const ny = (-dx * sinA + dy * cosA) / halfWid; // -1 (left) .. +1 (right)

  if (nx > 0.42) {
    return 'head';
  }
  // Lateral edges near front or rear quarters -> legs
  if (Math.abs(ny) > 0.68) {
    if (nx >= 0) return ny < 0 ? 'frontLegL' : 'frontLegR';
    return ny < 0 ? 'hindLegL' : 'hindLegR';
  }
  if (nx >= -0.05) {
    return 'vitals'; // Thorax: heart & lungs
  }
  if (nx > -0.68) {
    return 'abdomen'; // Liver / stomach / intestines
  }
  return ny < 0 ? 'hindLegL' : 'hindLegR';
}

// ============================================================================
// BALLISTIC TRAUMA APPLICATION — PEDESTRIANS (NPCs)
// ============================================================================

export interface BallisticHitOutcome {
  hitZoneLabelRu: string;
  penetrated: boolean;
  throughPenetrated: boolean;
  fatal: boolean;
  isNonLethalSting: boolean;
}

export function applyBallisticTraumaToPedestrian(
  ped: Pedestrian,
  proj: BallisticProjectile,
  hitX: number,
  hitY: number,
  world: GameWorld,
  shooterX: number,
  shooterY: number,
  nowSec: number
): BallisticHitOutcome {
  const anat = ensurePedestrianAnatomy(ped);
  const zone = resolvePedestrianHitZone(ped, hitX, hitY, proj.angle);
  const zoneNamesRu: Record<keyof BodyPartsMap, string> = {
    head: 'Голова',
    torso: 'Грудь / Торс',
    leftArm: 'Левая рука',
    rightArm: 'Правая рука',
    leftLeg: 'Левая нога',
    rightLeg: 'Правая нога',
  };

  // Real physical kinetic energy in Joules: E = 0.5 * m_kg * v^2
  const energyJ = 0.5 * (proj.massGrams * 0.001) * proj.speedMs * proj.speedMs;

  // Clothing ballistic attenuation (thick winter parka stops weak 3J BBs on torso/arms!)
  const clo = ped.bio?.clothingClo ?? 0.65;
  let clothingResist = 0;
  if (zone === 'torso') clothingResist = clo * 6.0;
  else if (zone === 'leftArm' || zone === 'rightArm') clothingResist = clo * 4.5;
  else if (zone === 'leftLeg' || zone === 'rightLeg') clothingResist = ped.hasShorts ? 0.5 : 4.2;
  else if (zone === 'head') clothingResist = ped.hasHat ? 2.5 : 0.0;

  const effectivePen = Math.max(0, proj.penetration - clothingResist);
  const penetrated = !proj.isNonLethal && (effectivePen > 4.5 || energyJ > 18 + clothingResist * 2.5);
  const throughPenetrated = penetrated && effectivePen > 48 && energyJ > 320 && !proj.isNonLethal;

  anat.lastHitZone = zone;
  anat.lastHitTime = nowSec;
  if (proj.weaponClass === 'pneumatic') anat.pneumaticHitCount += 1;
  else anat.gunshotTraumaCount += 1;

  // Compute physical wound severity (0..100) from kinetic energy, caliber, expansion & blunt factor
  // Reference energies: 4.5mm BB ~2.7J, Hatsan 125 ~28J, EDgun 5.5 ~48J, Ataman 6.35 ~85J, .22LR ~145J, 9x18 ~305J, 9x19 ~520J, 5.45 ~1350J, 7.62x54R ~3400J
  const energyScale = Math.min(100, Math.pow(Math.max(0.5, energyJ), 0.54) * 3.15);
  const rawSeverity = clamp(energyScale * (0.55 + proj.expansion * 0.45), 3, 100);
  const bluntSeverity = clamp(Math.pow(Math.max(0.5, energyJ), 0.48) * 2.4 * proj.bluntFactor, 4, 95);

  const partList = anat.parts[zone];

  // Case A: Stopped by heavy clothing (low-power BB / birdshot on thick winter coat)
  if (!penetrated && !proj.isNonLethal && energyJ < 12 && clothingResist >= 5.5) {
    pushWound(partList, 'bruise', clamp(bluntSeverity * 0.35, 3, 20), 0, clamp(bluntSeverity * 0.5, 4, 22), proj.caliberMm, false, true, nowSec);
    anat.painLevel = clamp(anat.painLevel + 7, 0, 100);
    anat.adrenaline = clamp(anat.adrenaline + 25, 0, 100);
    if (ped.psy) {
      ped.psy.annoyance = clamp(ped.psy.annoyance + 0.65, 0, 1);
      ped.psy.fear = clamp(ped.psy.fear + 0.35, 0, 1);
      ped.psy.lookTargetX = shooterX;
      ped.psy.lookTargetY = shooterY;
      ped.psy.lookTimer = 3.0;
    }
    if (!anat.isDead && ped.state !== 'unconscious') {
      pedSpeak(ped, pick(PED_PHRASES_AIRGUN_COAT_STOP), 3.0, nowSec, true);
      if ((ped.psy?.bravery ?? 0.5) < 0.55) {
        triggerPedestrianFlight(ped, shooterX, shooterY, 5.5);
      } else {
        ped.state = 'startled';
        ped.behaviorTimer = 1.6;
        ped.angle = Math.atan2(shooterY - ped.y, shooterX - ped.x);
      }
    }
    return { hitZoneLabelRu: zoneNamesRu[zone], penetrated: false, throughPenetrated: false, fatal: false, isNonLethalSting: true };
  }

  // Case B: Non-lethal rubber slug or light pneumatic pellet sting
  if (proj.isNonLethal || !penetrated) {
    const isRubberSlug = proj.ammoId === 'ammo_12g_rubber';
    const painAdd = isRubberSlug ? 58 : clamp(10 + energyJ * 1.4, 8, 38);
    const shockAdd = isRubberSlug ? 46 : clamp(4 + energyJ * 0.6, 4, 22);
    pushWound(partList, 'bruise', isRubberSlug ? 72 : clamp(bluntSeverity * 0.65, 8, 42), 0, painAdd, proj.caliberMm, false, !isRubberSlug, nowSec);
    if (!isRubberSlug && energyJ > 5.5 && zone === 'head') {
      // Bare face/skin pellet laceration
      pushWound(partList, 'bleeding', 18, 12, 26, proj.caliberMm, true, true, nowSec);
      addOrGrowFluidStain(world, hitX, hitY, 'blood', 1.4);
    }
    if (isRubberSlug && (zone === 'torso' || zone === 'head') && Math.random() < 0.35) {
      pushWound(partList, 'fracture', 42, 0, 48, proj.caliberMm, false, false, nowSec);
    }
    anat.painLevel = clamp(anat.painLevel + painAdd, 0, 100);
    anat.shockLevel = clamp(anat.shockLevel + shockAdd, 0, 100);
    anat.adrenaline = clamp(anat.adrenaline + 45, 0, 100);
    anat.heartRate = clamp(anat.heartRate + (isRubberSlug ? 42 : 24), 70, 190);
    if (ped.bio) {
      ped.bio.injuryLevel = clamp(ped.bio.injuryLevel + (isRubberSlug ? 38 : 10), 0, 100);
    }

    // Knockdown on heavy rubber slug or head hit
    if ((isRubberSlug || (zone === 'head' && energyJ > 12)) && !anat.isDead) {
      const knockSpeed = isRubberSlug ? 58 : 22;
      ped.state = isRubberSlug && zone === 'head' ? 'unconscious' : 'knocked_down';
      if (ped.bio) {
        ped.bio.knockdownTimer = isRubberSlug ? 4.8 : 2.2;
        ped.bio.knockdownVelX = Math.cos(proj.angle) * knockSpeed;
        ped.bio.knockdownVelY = Math.sin(proj.angle) * knockSpeed;
      }
      if (ped.state === 'unconscious') {
        anat.consciousness = 10;
      }
      ped.hasDroppedProp = true;
      ped.handheldProp = null;
    } else if (!anat.isDead && ped.state !== 'unconscious') {
      if (zone === 'leftLeg' || zone === 'rightLeg') {
        if (ped.bio) ped.bio.limpSide = zone === 'leftLeg' ? -1 : 1;
      }
      if (ped.psy) {
        ped.psy.fear = clamp(ped.psy.fear + (isRubberSlug ? 0.9 : 0.55), 0, 1);
        ped.psy.annoyance = clamp(ped.psy.annoyance + 0.7, 0, 1);
      }
      pedSpeak(ped, pick(PED_PHRASES_AIRGUN_STING_ANGRY), 3.2, nowSec, true);
      triggerPedestrianFlight(ped, shooterX, shooterY, isRubberSlug ? 10 : 6.5);
    }

    return { hitZoneLabelRu: zoneNamesRu[zone], penetrated: false, throughPenetrated: false, fatal: false, isNonLethalSting: true };
  }

  // Case C: Penetrating ballistic trauma (Firearms, high-power PCP/Magnum airguns)
  const isHighPower = energyJ >= 160;
  let bleedRate = clamp(rawSeverity * (0.45 + proj.expansion * 0.45), 8, 95);
  let painAdd = clamp(rawSeverity * 0.82, 14, 88);
  let shockAdd = clamp(rawSeverity * 0.58, 8, 72);
  let instantFatal = false;

  // Blood splatter particles & ground blood stain
  spawnBloodImpactEffects(world, hitX, hitY, proj.angle, clamp(rawSeverity / 55, 0.35, 1.8));

  if (zone === 'head') {
    const skullResist = 16;
    if (effectivePen > skullResist || energyJ > 95) {
      // Cranial penetration -> severe CNS/brain trauma
      const brainDmg = clamp(rawSeverity * 1.45, 35, 100);
      anat.brainDamage = clamp(anat.brainDamage + brainDmg, 0, 100);
      bleedRate = clamp(bleedRate * 1.35, 25, 100);
      shockAdd = clamp(shockAdd * 1.6, 45, 100);
      pushWound(partList, 'bleeding', rawSeverity, bleedRate, painAdd, proj.caliberMm, true, false, nowSec);
      pushWound(partList, 'fracture', clamp(rawSeverity * 1.1, 40, 100), 0, 70, proj.caliberMm, true, false, nowSec);
      if (anat.brainDamage >= 72 || energyJ >= 220) {
        instantFatal = true;
      } else {
        anat.consciousness = Math.min(anat.consciousness, 12);
        ped.state = 'unconscious';
      }
    } else {
      // Grazing / low-energy scalp/facial penetration (e.g., Hatsan 125 / .22 grazing)
      anat.brainDamage = clamp(anat.brainDamage + rawSeverity * 0.35, 0, 100);
      pushWound(partList, 'bleeding', rawSeverity * 0.85, bleedRate * 0.85, painAdd * 1.1, proj.caliberMm, true, false, nowSec);
      anat.consciousness = Math.max(0, anat.consciousness - rawSeverity * 0.7);
      pedSpeak(ped, pick(PED_PHRASES_HIT_HEAD), 3.0, nowSec, true);
    }
  } else if (zone === 'torso') {
    const chestVitalHit = effectivePen > 14 || energyJ > 75;
    if (chestVitalHit) {
      const organDmg = clamp(rawSeverity * (proj.expansion * 0.72), 18, 100);
      anat.lungHeartDamage = clamp(anat.lungHeartDamage + organDmg, 0, 100);
      if (organDmg > 55) anat.arterialBleeding = true;
      bleedRate = clamp(bleedRate * (anat.arterialBleeding ? 1.55 : 1.15), 18, 100);
      shockAdd = clamp(shockAdd * 1.25, 22, 95);
    }
    pushWound(partList, 'bleeding', rawSeverity, bleedRate, painAdd, proj.caliberMm, true, false, nowSec);
    if (isHighPower && Math.random() < 0.55) {
      pushWound(partList, 'fracture', clamp(rawSeverity * 0.85, 30, 95), 0, 58, proj.caliberMm, true, false, nowSec);
    }
    if (anat.lungHeartDamage >= 92 && energyJ >= 650) {
      instantFatal = true;
    } else {
      pedSpeak(ped, pick(PED_PHRASES_HIT_TORSO), 3.2, nowSec, true);
    }
  } else if (zone === 'leftArm' || zone === 'rightArm') {
    pushWound(partList, 'bleeding', rawSeverity * 0.85, bleedRate * 0.72, painAdd * 0.9, proj.caliberMm, true, false, nowSec);
    if (energyJ > 120 && Math.random() < 0.65) {
      pushWound(partList, 'fracture', clamp(rawSeverity * 0.9, 35, 95), 0, 55, proj.caliberMm, true, false, nowSec);
    }
    // Reflexively drops whatever they were holding
    ped.hasDroppedProp = true;
    ped.handheldProp = null;
    ped.hasUmbrella = false;
    pedSpeak(ped, pick(PED_PHRASES_HIT_ARM), 3.2, nowSec, true);
  } else {
    // leftLeg / rightLeg
    const femoralHit = energyJ > 180 && Math.random() < 0.35;
    if (femoralHit) anat.arterialBleeding = true;
    pushWound(partList, 'bleeding', rawSeverity * 0.9, bleedRate * (femoralHit ? 1.45 : 0.8), painAdd, proj.caliberMm, true, false, nowSec);
    if (ped.bio) ped.bio.limpSide = zone === 'leftLeg' ? -1 : 1;
    if (energyJ > 110 || rawSeverity > 34) {
      pushWound(partList, 'fracture', clamp(rawSeverity * 0.95, 40, 100), 0, 66, proj.caliberMm, true, false, nowSec);
      // Broken leg immediately collapses the pedestrian!
      if (!anat.isDead && ped.state !== 'unconscious') {
        ped.state = 'knocked_down';
        if (ped.bio) {
          ped.bio.knockdownTimer = 2.6;
          ped.bio.knockdownVelX = Math.cos(proj.angle) * clamp(energyJ * 0.04, 10, 48);
          ped.bio.knockdownVelY = Math.sin(proj.angle) * clamp(energyJ * 0.04, 10, 48);
        }
      }
    }
    pedSpeak(ped, pick(PED_PHRASES_HIT_LEG), 3.4, nowSec, true);
  }

  // Update systemic physiology
  anat.painLevel = clamp(anat.painLevel + painAdd, 0, 100);
  anat.shockLevel = clamp(anat.shockLevel + shockAdd, 0, 100);
  anat.adrenaline = clamp(anat.adrenaline + (isHighPower ? 75 : 48), 0, 100);
  anat.heartRate = clamp(anat.heartRate + 45, 80, 195);
  anat.bloodLoss = clamp(anat.bloodLoss + (bleedRate * 0.14), 0, 100);

  if (ped.bio) {
    ped.bio.injuryLevel = clamp(ped.bio.injuryLevel + rawSeverity * 0.95, 0, 100);
  }
  if (ped.psy) {
    ped.psy.fear = 1.0;
    ped.psy.arousal = 1.0;
    ped.psy.lastThreatX = shooterX;
    ped.psy.lastThreatY = shooterY;
  }

  // Physical momentum knockback
  const impulseVel = clamp(Math.sqrt(energyJ) * 1.15, 6, 56);
  if (instantFatal) {
    killPedestrian(ped, anat, proj.angle, impulseVel, world);
  } else if (anat.consciousness <= 18 || anat.shockLevel >= 88) {
    ped.state = 'unconscious';
    anat.consciousness = Math.min(anat.consciousness, 14);
    if (ped.bio) {
      ped.bio.knockdownVelX = Math.cos(proj.angle) * impulseVel * 0.8;
      ped.bio.knockdownVelY = Math.sin(proj.angle) * impulseVel * 0.8;
    }
    ped.hasDroppedProp = true;
    ped.handheldProp = null;
  } else if (ped.state !== 'knocked_down') {
    // Adrenaline flight reflex if still mobile!
    const hasLegFracture =
      anat.parts.leftLeg.some((w) => w.type === 'fracture') ||
      anat.parts.rightLeg.some((w) => w.type === 'fracture');
    if (hasLegFracture) {
      ped.state = 'crawling_injured';
      ped.angle = Math.atan2(ped.y - shooterY, ped.x - shooterX);
    } else {
      triggerPedestrianFlight(ped, shooterX, shooterY, 12.0);
    }
  }

  return {
    hitZoneLabelRu: zoneNamesRu[zone],
    penetrated: true,
    throughPenetrated,
    fatal: instantFatal,
    isNonLethalSting: false,
  };
}

function killPedestrian(
  ped: Pedestrian,
  anat: EntityAnatomyState,
  impactAngle: number,
  impulseVel: number,
  world: GameWorld
): void {
  anat.isDead = true;
  anat.consciousness = 0;
  anat.heartRate = 0;
  ped.state = 'dead';
  ped.alertBubbleText = null;
  ped.alertBubbleTimer = 0;
  ped.hasDroppedProp = true;
  ped.handheldProp = null;
  ped.hasUmbrella = false;
  ped.isCyclist = false;
  ped.isScooter = false;
  if (ped.bio) {
    ped.bio.knockdownVelX = Math.cos(impactAngle) * impulseVel;
    ped.bio.knockdownVelY = Math.sin(impactAngle) * impulseVel;
    ped.bio.injuryLevel = 100;
  }
  addOrGrowFluidStain(world, ped.x, ped.y, 'blood', 3.2);
}

function triggerPedestrianFlight(ped: Pedestrian, threatX: number, threatY: number, duration: number): void {
  if (ped.state === 'dead' || ped.state === 'unconscious' || ped.state === 'knocked_down') return;
  ped.state = 'panicking';
  ped.panicTimer = Math.max(ped.panicTimer || 0, duration);
  ped.angle = Math.atan2(ped.y - threatY, ped.x - threatX) + (Math.random() - 0.5) * 0.45;
  if (ped.psy) {
    ped.psy.fear = 1.0;
    ped.psy.arousal = 1.0;
    ped.psy.lastThreatX = threatX;
    ped.psy.lastThreatY = threatY;
  }
}

// ============================================================================
// PER-TICK PEDESTRIAN ANATOMICAL PHYSIOLOGY SIMULATION
// ============================================================================

/**
 * Advances active bleeding, adrenaline decay, hypovolemic shock, consciousness,
 * crawling/collapse, and death for anatomically injured pedestrians.
 * Returns true if the pedestrian is dead/unconscious/crawling/cowering and handled here.
 */
export function updatePedestrianAnatomy(
  ped: Pedestrian,
  world: GameWorld,
  dt: number,
  nowSec: number
): boolean {
  const anat = ped.anatomy;
  if (!anat) return false;

  // 1. Dead state: slide friction, slow final blood pooling, no movement
  if (anat.isDead || ped.state === 'dead') {
    anat.isDead = true;
    ped.state = 'dead';
    anat.deadTimer += dt;
    if (ped.bio) {
      const drag = Math.exp(-6.5 * dt);
      ped.bio.knockdownVelX *= drag;
      ped.bio.knockdownVelY *= drag;
      ped.vx = ped.bio.knockdownVelX;
      ped.vy = ped.bio.knockdownVelY;
      ped.x = clamp(ped.x + ped.vx * dt, 16, world.width - 16);
      ped.y = clamp(ped.y + ped.vy * dt, 16, world.height - 16);
      ped.speed = Math.hypot(ped.vx, ped.vy);
    } else {
      ped.vx = 0;
      ped.vy = 0;
      ped.speed = 0;
    }
    if (anat.deadTimer < 14) {
      anat.bloodDripTimer += dt;
      if (anat.bloodDripTimer > 1.8) {
        anat.bloodDripTimer = 0;
        addOrGrowFluidStain(world, ped.x + (Math.random() - 0.5) * 3, ped.y + (Math.random() - 0.5) * 3, 'blood', 1.8);
      }
    }
    return true;
  }

  // 2. Sum active bleeding & pain across all 6 anatomical parts
  let totalBleedRate = 0;
  let totalRawPain = 0;
  let legFractures = 0;
  const partKeys: (keyof BodyPartsMap)[] = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
  for (const k of partKeys) {
    const list = anat.parts[k];
    for (let i = 0; i < list.length; i++) {
      const w = list[i];
      if (w.type === 'bleeding' && w.bleedingRate > 0) {
        totalBleedRate += w.bleedingRate;
        // Minor wounds gradually clot; major arterial wounds do not
        const clotRate = anat.arterialBleeding || w.bleedingRate > 45 ? 0.08 : 0.45;
        w.bleedingRate = Math.max(0, w.bleedingRate - clotRate * dt);
      }
      totalRawPain += w.pain;
      if (w.type === 'fracture' && (k === 'leftLeg' || k === 'rightLeg')) {
        legFractures++;
      }
    }
  }

  // Internal organ hemorrhage
  if (anat.lungHeartDamage > 25) {
    totalBleedRate += anat.lungHeartDamage * 0.42;
  }

  // 3. Adrenaline, pain, blood loss, shock & consciousness dynamics
  anat.adrenaline = Math.max(0, anat.adrenaline - 4.2 * dt);
  const adrenalineMask = anat.adrenaline * 0.42;
  anat.painLevel = clamp(Math.max(anat.painLevel - 1.5 * dt, Math.min(100, totalRawPain * 0.7) - adrenalineMask * 0.35), 0, 100);

  if (totalBleedRate > 0.5) {
    const bloodDelta = totalBleedRate * 0.045 * dt;
    anat.bloodLoss = clamp(anat.bloodLoss + bloodDelta, 0, 100);

    // Real blood trail on ground proportional to bleeding rate!
    anat.bloodDripTimer += dt * (0.6 + totalBleedRate * 0.025);
    if (anat.bloodDripTimer >= 1.0) {
      anat.bloodDripTimer = 0;
      addOrGrowFluidStain(
        world,
        ped.x + (Math.random() - 0.5) * 2.5,
        ped.y + (Math.random() - 0.5) * 2.5,
        'blood',
        clamp(0.9 + totalBleedRate * 0.022, 0.9, 2.8)
      );
    }
  }

  // Hypovolemic & pain shock progression
  const targetShock = clamp(
    anat.bloodLoss * 0.95 +
      Math.max(0, anat.painLevel - adrenalineMask) * 0.45 +
      anat.lungHeartDamage * 0.65 +
      anat.brainDamage * 0.85,
    0,
    100
  );
  if (targetShock > anat.shockLevel) {
    anat.shockLevel = Math.min(100, anat.shockLevel + (targetShock - anat.shockLevel) * 0.35 * dt + dt * 1.2);
  } else {
    anat.shockLevel = Math.max(0, anat.shockLevel - 1.8 * dt);
  }

  // Heart rate climbs in tachycardia during shock/blood loss, then drops before death
  if (anat.bloodLoss > 78 || anat.brainDamage > 70) {
    anat.heartRate = Math.max(25, anat.heartRate - 18 * dt);
  } else {
    const desiredHr = clamp(72 + anat.adrenaline * 0.65 + anat.bloodLoss * 0.8 + anat.painLevel * 0.35, 65, 192);
    anat.heartRate += (desiredHr - anat.heartRate) * 0.5 * dt;
  }

  // Consciousness decay from blood loss, shock, brain trauma
  if (anat.bloodLoss > 42 || anat.shockLevel > 68 || anat.brainDamage > 35) {
    const drain = (Math.max(0, anat.bloodLoss - 38) * 0.25 + Math.max(0, anat.shockLevel - 62) * 0.22 + anat.brainDamage * 0.25) * dt;
    anat.consciousness = Math.max(0, anat.consciousness - drain);
    if (anat.consciousness < 42 && anat.consciousness > 15 && Math.random() < 0.015) {
      pedSpeak(ped, pick(PED_PHRASES_BLEEDOUT), 2.8, nowSec);
    }
  } else if (ped.state === 'unconscious' && anat.bloodLoss < 35 && anat.brainDamage < 25) {
    // Recovery from non-lethal concussion / rubber bullet knockout
    anat.consciousness = Math.min(100, anat.consciousness + 5.5 * dt);
    if (anat.consciousness > 45) {
      ped.state = legFractures > 0 ? 'crawling_injured' : 'injured_limp';
    }
  }

  // Lethal outcome from exsanguination or fatal organ failure
  if (anat.bloodLoss >= 88 || anat.brainDamage >= 85 || (anat.lungHeartDamage >= 82 && anat.bloodLoss >= 55)) {
    killPedestrian(ped, anat, ped.angle, 0, world);
    return true;
  }

  // Unconscious collapse
  if (anat.consciousness <= 18 && ped.state !== 'unconscious') {
    ped.state = 'unconscious';
    ped.hasDroppedProp = true;
    ped.handheldProp = null;
    ped.alertBubbleText = null;
  }

  if (ped.state === 'unconscious') {
    if (ped.bio) {
      const drag = Math.exp(-6.0 * dt);
      ped.bio.knockdownVelX *= drag;
      ped.bio.knockdownVelY *= drag;
      ped.vx = ped.bio.knockdownVelX;
      ped.vy = ped.bio.knockdownVelY;
      ped.x = clamp(ped.x + ped.vx * dt, 16, world.width - 16);
      ped.y = clamp(ped.y + ped.vy * dt, 16, world.height - 16);
      ped.speed = Math.hypot(ped.vx, ped.vy);
    } else {
      ped.vx = 0;
      ped.vy = 0;
      ped.speed = 0;
    }
    return true;
  }

  // Sync injuryLevel upward so gait/limp reflects real anatomical state
  if (ped.bio) {
    const minInj = clamp(anat.bloodLoss * 0.7 + anat.painLevel * 0.6 + legFractures * 32, 0, 100);
    if (ped.bio.injuryLevel < minInj) {
      ped.bio.injuryLevel = minInj;
    }
  }

  // Crawling injured (broken leg(s) or severe shock, still conscious trying to drag away from shooter)
  if (ped.state === 'crawling_injured' || (legFractures >= 2 && ped.state !== 'knocked_down')) {
    ped.state = 'crawling_injured';
    const threatX = ped.psy?.lastThreatX ?? ped.x;
    const threatY = ped.psy?.lastThreatY ?? ped.y;
    const awayAng = Math.atan2(ped.y - threatY, ped.x - threatX);
    ped.angle = awayAng;
    const crawlSpd = clamp(12 - anat.shockLevel * 0.08 - anat.bloodLoss * 0.06, 2.5, 11);
    ped.speed = crawlSpd;
    ped.vx = Math.cos(ped.angle) * crawlSpd;
    ped.vy = Math.sin(ped.angle) * crawlSpd;
    ped.x = clamp(ped.x + ped.vx * dt, 16, world.width - 16);
    ped.y = clamp(ped.y + ped.vy * dt, 16, world.height - 16);
    ped.walkCycle += dt * 3.2;
    return true;
  }

  // Cowering in place from nearby gunfire
  if (ped.state === 'cowering') {
    ped.behaviorTimer = Math.max(0, (ped.behaviorTimer || 0) - dt);
    ped.vx = 0;
    ped.vy = 0;
    ped.speed = 0;
    if (ped.behaviorTimer <= 0) {
      ped.state = 'panicking';
      ped.panicTimer = 6.0;
    }
    return true;
  }

  return false;
}

// ============================================================================
// BALLISTIC TRAUMA APPLICATION — ANIMALS (Species-Accurate Ethology & Anatomy)
// ============================================================================

export function applyBallisticTraumaToAnimal(
  animal: Animal,
  proj: BallisticProjectile,
  hitX: number,
  hitY: number,
  world: GameWorld,
  shooterX: number,
  shooterY: number,
  nowSec: number
): BallisticHitOutcome {
  const anat = ensureAnimalAnatomy(animal);
  const cfg = ANIMAL_SPECIES_CONFIG[animal.species];
  const zone = resolveAnimalHitZone(animal, hitX, hitY);

  const zoneNamesRu: Record<AnimalBodyZone, string> = {
    head: 'Голова / Череп',
    vitals: 'Грудная клетка (сердце/лёгкие)',
    abdomen: 'Брюшная полость',
    frontLegL: 'Левая передняя нога',
    frontLegR: 'Правая передняя нога',
    hindLegL: 'Левая задняя нога',
    hindLegR: 'Правая задняя нога',
  };

  // Real physical kinetic energy (Joules)
  const energyJ = 0.5 * (proj.massGrams * 0.001) * proj.speedMs * proj.speedMs;

  // Species mass & hide/skull thickness scaling
  // Squirrel 0.4kg -> hide 1, Hare 4.5kg -> hide 2.5, Roe deer 28kg -> hide 7, Boar 135kg -> hide 19 (tough shield!), Bear 265kg -> hide 22, Moose 470kg -> hide 24
  let hideResist = Math.pow(Math.max(0.4, animal.massKg), 0.44) * 1.6;
  if (animal.species === 'wild_boar') hideResist *= 1.32; // Boar cartilaginous shoulder shield
  if (animal.species === 'bear') hideResist *= 1.25;      // Dense fur + fat + thick skull
  if (zone === 'head' && animal.massKg > 80) hideResist *= 1.35; // Thick skull plate

  const effectivePen = Math.max(0, proj.penetration - hideResist * 0.65);
  const minPenEnergy = hideResist * 1.35;
  const penetrated = !proj.isNonLethal && (effectivePen > 3.5 || energyJ > minPenEnergy * 1.4);
  const throughPenetrated = penetrated && effectivePen > hideResist * 1.8 && energyJ > animal.massKg * 4.5;

  anat.lastHitZone = zone;
  anat.lastHitTime = nowSec;
  anat.shooterX = shooterX;
  anat.shooterY = shooterY;
  animal.lastHitTime = nowSec;
  animal.threatX = shooterX;
  animal.threatY = shooterY;

  // Mass-normalized trauma intensity (small animals suffer catastrophic trauma from 15J pellets; moose shrugs off 15J!)
  const massFactor = Math.pow(Math.max(0.4, animal.massKg) / 35, 0.52);
  const rawDamageRatio = clamp((Math.pow(Math.max(0.5, energyJ), 0.58) * (0.55 + proj.expansion * 0.45)) / (massFactor * 16.5), 0.03, 2.5);
  const severity = clamp(rawDamageRatio * 52, 4, 100);

  // Case A: Non-penetrating hit (weak BB / rubber bullet / birdshot on thick-hided megafauna)
  if (!penetrated) {
    pushWound(anat.zones[zone], 'bruise', clamp(severity * 0.5, 4, 35), 0, clamp(severity * 0.85, 8, 55), proj.caliberMm, false, true, nowSec);
    anat.painLevel = clamp(anat.painLevel + clamp(severity * 0.7, 8, 42), 0, 100);
    anat.adrenaline = clamp(anat.adrenaline + 55, 0, 100);
    animal.hp = Math.max(1, animal.hp - Math.max(1, animal.maxHp * rawDamageRatio * 0.14));

    if (animal.state !== 'dead') {
      reactAnimalToTrauma(animal, cfg, shooterX, shooterY, rawDamageRatio, false, world);
    }
    return { hitZoneLabelRu: zoneNamesRu[zone], penetrated: false, throughPenetrated: false, fatal: false, isNonLethalSting: true };
  }

  // Case B: Penetrating anatomical wound
  spawnBloodImpactEffects(world, hitX, hitY, proj.angle, clamp(rawDamageRatio * 1.1, 0.35, 1.9));

  let hpDamage = animal.maxHp * rawDamageRatio * 0.55;
  let bleedRate = clamp(severity * (0.5 + proj.expansion * 0.45), 10, 100);
  let shockAdd = clamp(severity * 0.55, 8, 85);
  let instantFatal = false;

  if (zone === 'head') {
    const cnsDmg = clamp(severity * 1.65, 28, 100);
    anat.cnsDamage = clamp(anat.cnsDamage + cnsDmg, 0, 100);
    hpDamage *= 1.85;
    shockAdd *= 1.6;
    pushWound(anat.zones.head, 'bleeding', severity, bleedRate * 1.2, severity, proj.caliberMm, true, false, nowSec);
    pushWound(anat.zones.head, 'fracture', clamp(severity * 1.2, 35, 100), 0, 80, proj.caliberMm, true, false, nowSec);
    if (anat.cnsDamage >= 68 || hpDamage >= animal.hp) {
      instantFatal = true;
    }
  } else if (zone === 'vitals') {
    const vitalDmg = clamp(severity * (0.85 + proj.expansion * 0.45), 20, 100);
    anat.heartLungDamage = clamp(anat.heartLungDamage + vitalDmg, 0, 100);
    hpDamage *= 1.35;
    bleedRate = clamp(bleedRate * 1.45, 22, 100);
    shockAdd *= 1.25;
    pushWound(anat.zones.vitals, 'bleeding', severity, bleedRate, severity * 0.9, proj.caliberMm, true, false, nowSec);
    if (anat.heartLungDamage >= 92 && energyJ >= animal.massKg * 3.5) {
      instantFatal = true;
    }
  } else if (zone === 'abdomen') {
    const gutDmg = clamp(severity * 0.95, 15, 100);
    anat.visceralDamage = clamp(anat.visceralDamage + gutDmg, 0, 100);
    hpDamage *= 0.85;
    bleedRate = clamp(bleedRate * 0.95, 14, 90);
    pushWound(anat.zones.abdomen, 'bleeding', severity * 0.9, bleedRate, severity * 1.05, proj.caliberMm, true, false, nowSec);
  } else {
    // Limb hit: frontLegL / frontLegR / hindLegL / hindLegR
    hpDamage *= 0.55;
    bleedRate *= 0.72;
    pushWound(anat.zones[zone], 'bleeding', severity * 0.85, bleedRate, severity * 1.0, proj.caliberMm, true, false, nowSec);
    if (severity > 26 || energyJ > animal.massKg * 1.8) {
      pushWound(anat.zones[zone], 'fracture', clamp(severity * 1.0, 38, 100), 0, 75, proj.caliberMm, true, false, nowSec);
      if (zone === 'frontLegL') anat.brokenLegs.frontL = true;
      else if (zone === 'frontLegR') anat.brokenLegs.frontR = true;
      else if (zone === 'hindLegL') anat.brokenLegs.hindL = true;
      else if (zone === 'hindLegR') anat.brokenLegs.hindR = true;
    }
  }

  animal.hp = Math.max(0, animal.hp - hpDamage);
  anat.painLevel = clamp(anat.painLevel + severity * 0.85, 0, 100);
  anat.adrenaline = clamp(anat.adrenaline + 72, 0, 100);
  anat.shockLevel = clamp(anat.shockLevel + shockAdd, 0, 100);
  anat.bloodLoss = clamp(anat.bloodLoss + bleedRate * 0.16, 0, 100);

  const brokenLegCount =
    (anat.brokenLegs.frontL ? 1 : 0) +
    (anat.brokenLegs.frontR ? 1 : 0) +
    (anat.brokenLegs.hindL ? 1 : 0) +
    (anat.brokenLegs.hindR ? 1 : 0);
  animal.injuryLevel = clamp(
    Math.max(animal.injuryLevel, (1 - animal.hp / Math.max(1, animal.maxHp)) * 0.75 + brokenLegCount * 0.34),
    0,
    1
  );

  const knockVel = clamp(Math.sqrt(energyJ) * 1.4 / Math.max(0.5, Math.pow(animal.massKg / 25, 0.55)), 4, 85);
  animal.vx += Math.cos(proj.angle) * knockVel;
  animal.vy += Math.sin(proj.angle) * knockVel;

  if (instantFatal || animal.hp <= 0) {
    animal.hp = 0;
    animal.state = 'dead';
    animal.deadTimer = 0;
    animal.injuryLevel = 1;
    anat.consciousness = 0;
    addOrGrowFluidStain(world, animal.x, animal.y, 'blood', clamp(1.8 + Math.sqrt(animal.massKg) * 0.14, 1.8, 5.2));
  } else if (brokenLegCount >= 2 || anat.shockLevel >= 84 || (zone === 'head' && anat.cnsDamage >= 45)) {
    animal.state = 'knocked_down';
    animal.knockdownTimer = clamp(2.8 + anat.shockLevel * 0.05, 2.5, 8.0);
  } else {
    reactAnimalToTrauma(animal, cfg, shooterX, shooterY, rawDamageRatio, true, world);
  }

  return {
    hitZoneLabelRu: zoneNamesRu[zone],
    penetrated: true,
    throughPenetrated,
    fatal: animal.state === 'dead',
    isNonLethalSting: false,
  };
}

function reactAnimalToTrauma(
  animal: Animal,
  cfg: (typeof ANIMAL_SPECIES_CONFIG)[Animal['species']],
  shooterX: number,
  shooterY: number,
  damageRatio: number,
  penetrated: boolean,
  world: GameWorld
): void {
  const distToShooter = Math.hypot(shooterX - animal.x, shooterY - animal.y);

  // Hedgehogs curl defensively on sting/threat
  if (cfg.curlsOnThreat) {
    animal.state = 'curled';
    animal.stateTimer = 7.0;
    animal.fear = 1.0;
    return;
  }

  // Aggressive/territorial megafauna & predators: wounded bear, boar, moose, wolf counter-charge!
  const enragedCharge =
    cfg.canChargeHuman &&
    distToShooter < Math.max(cfg.chargeDist * 2.1, 240) &&
    (animal.species === 'bear' ||
      animal.species === 'wild_boar' ||
      (animal.species === 'moose' && (animal.temperament !== 'timid' || distToShooter < 150)) ||
      (animal.species === 'wolf' && (animal.temperament === 'aggressive' || !penetrated || distToShooter < 165)) ||
      (animal.species === 'dog' && animal.temperament === 'territorial' && distToShooter < 130));

  if (enragedCharge && animal.injuryLevel < 0.72) {
    animal.state = 'charging';
    animal.stateTimer = 8.0 + damageRatio * 3.0;
    animal.aggression = 1.0;
    animal.fear = Math.max(0.15, animal.fear - 0.3);
    animal.targetX = shooterX;
    animal.targetY = shooterY;
  } else {
    // Prey & timid/severely wounded animals bolt in adrenaline-fueled flight!
    animal.state = 'fleeing';
    animal.stateTimer = 7.5 + Math.random() * 4.0;
    animal.fear = 1.0;
    animal.angle = Math.atan2(animal.y - shooterY, animal.x - shooterX);
  }

  // Alert herd/pack mates immediately
  if (world.animals && animal.groupId) {
    for (let i = 0; i < world.animals.length; i++) {
      const mate = world.animals[i];
      if (mate === animal || mate.groupId !== animal.groupId || mate.state === 'dead' || mate.state === 'knocked_down') continue;
      if (Math.hypot(mate.x - animal.x, mate.y - animal.y) < 280) {
        mate.threatX = shooterX;
        mate.threatY = shooterY;
        mate.fear = Math.max(mate.fear, 0.85);
        mate.alarmDelay = 0.08 + Math.random() * 0.25;
      }
    }
  }
}

// ============================================================================
// PER-TICK ANIMAL ANATOMICAL PHYSIOLOGY SIMULATION
// ============================================================================

export function updateAnimalAnatomy(
  animal: Animal,
  world: GameWorld,
  dt: number
): void {
  const anat = animal.anatomy;
  if (!anat || animal.state === 'dead') return;

  let totalBleedRate = 0;
  const zoneKeys: AnimalBodyZone[] = ['head', 'vitals', 'abdomen', 'frontLegL', 'frontLegR', 'hindLegL', 'hindLegR'];
  for (const zk of zoneKeys) {
    const list = anat.zones[zk];
    for (let i = 0; i < list.length; i++) {
      const w = list[i];
      if (w.type === 'bleeding' && w.bleedingRate > 0) {
        totalBleedRate += w.bleedingRate;
        const clot = w.bleedingRate > 45 ? 0.06 : 0.35;
        w.bleedingRate = Math.max(0, w.bleedingRate - clot * dt);
      }
    }
  }
  if (anat.heartLungDamage > 20) {
    totalBleedRate += anat.heartLungDamage * 0.55;
  }
  if (anat.visceralDamage > 25) {
    totalBleedRate += anat.visceralDamage * 0.28;
  }

  anat.adrenaline = Math.max(0, anat.adrenaline - 4.8 * dt);

  if (totalBleedRate > 0.6) {
    const massBuffer = Math.pow(Math.max(1, animal.massKg) / 40, 0.22);
    const bloodDelta = (totalBleedRate * 0.052 * dt) / massBuffer;
    anat.bloodLoss = clamp(anat.bloodLoss + bloodDelta, 0, 100);
    animal.hp = Math.max(0, animal.hp - (animal.maxHp * bloodDelta * 0.011));

    // Visible blood trail as wounded animal flees/limps!
    anat.bloodDripTimer += dt * (0.65 + totalBleedRate * 0.025);
    if (anat.bloodDripTimer >= 1.0) {
      anat.bloodDripTimer = 0;
      addOrGrowFluidStain(
        world,
        animal.x + (Math.random() - 0.5) * 2.5,
        animal.y + (Math.random() - 0.5) * 2.5,
        'blood',
        clamp(0.85 + Math.sqrt(animal.massKg) * 0.09, 0.9, 3.0)
      );
    }
  }

  const targetShock = clamp(
    anat.bloodLoss * 0.95 +
      anat.heartLungDamage * 0.72 +
      anat.cnsDamage * 0.9 +
      Math.max(0, anat.painLevel - anat.adrenaline * 0.45) * 0.4,
    0,
    100
  );
  anat.shockLevel += (targetShock - anat.shockLevel) * Math.min(1, 0.45 * dt);

  // Broken legs + blood loss impair mobility progressively
  const brokenCount =
    (anat.brokenLegs.frontL ? 1 : 0) +
    (anat.brokenLegs.frontR ? 1 : 0) +
    (anat.brokenLegs.hindL ? 1 : 0) +
    (anat.brokenLegs.hindR ? 1 : 0);

  const minInjury = clamp(anat.bloodLoss * 0.008 + anat.shockLevel * 0.006 + brokenCount * 0.34, 0, 1);
  if (animal.injuryLevel < minInjury) {
    animal.injuryLevel = minInjury;
  }

  // Adrenaline wears off -> bleeding deer/boar collapses from hypovolemic shock!
  if (anat.bloodLoss >= 82 || anat.cnsDamage >= 82 || (anat.heartLungDamage >= 75 && anat.bloodLoss >= 45) || animal.hp <= 0) {
    animal.hp = 0;
    animal.state = 'dead';
    animal.deadTimer = 0;
    animal.injuryLevel = 1;
    anat.consciousness = 0;
    addOrGrowFluidStain(world, animal.x, animal.y, 'blood', clamp(2.0 + Math.sqrt(animal.massKg) * 0.14, 2.0, 5.2));
  } else if (anat.shockLevel >= 78 && anat.adrenaline < 24 && animal.state !== 'knocked_down') {
    animal.state = 'knocked_down';
    animal.knockdownTimer = 6.0;
  }
}

// ============================================================================
// ACOUSTIC GUNSHOT / PNEUMATIC WAVE BROADCAST TO NPCS & WILDLIFE
// ============================================================================

export function broadcastGunshotAlert(
  world: GameWorld,
  originX: number,
  originY: number,
  loudnessDb: number,
  alertRadiusPx: number,
  isFirearm: boolean,
  nowSec: number
): void {
  const radSq = alertRadiusPx * alertRadiusPx;

  // 1. Pedestrian psychological & acoustic response
  if (world.pedestrians) {
    let callersThisShot = 0;
    for (let i = 0; i < world.pedestrians.length; i++) {
      const ped = world.pedestrians[i];
      if (ped.isInsideBuilding || ped.state === 'dead' || ped.state === 'unconscious' || ped.state === 'knocked_down') continue;
      const dx = ped.x - originX;
      const dy = ped.y - originY;
      const dSq = dx * dx + dy * dy;
      if (dSq > radSq) continue;

      const dist = Math.sqrt(dSq);
      const prox = 1 - dist / alertRadiusPx; // 0..1 closeness
      const psy = ped.psy;
      const neurotic = psy?.neuroticism ?? 0.5;
      const bravery = psy?.bravery ?? 0.5;
      const headphonesPenalty = ped.hasHeadphones ? 0.55 : 1.0;

      // Quiet pneumatics (<95 dB) only draw glances unless very close
      if (!isFirearm && loudnessDb < 95) {
        if (dist < 110 * headphonesPenalty && psy) {
          psy.lookTargetX = originX;
          psy.lookTargetY = originY;
          psy.lookTimer = 2.5;
          psy.arousal = clamp(psy.arousal + 0.35 * prox, 0, 1);
          if (dist < 55) {
            psy.fear = clamp(psy.fear + 0.3, 0, 1);
          }
        }
        continue;
      }

      if (psy) {
        psy.lastThreatX = originX;
        psy.lastThreatY = originY;
        psy.fear = clamp(psy.fear + (0.45 + prox * 0.55 + neurotic * 0.25) * headphonesPenalty, 0, 1);
        psy.arousal = 1.0;
        psy.lookTargetX = originX;
        psy.lookTargetY = originY;
        psy.lookTimer = 2.5;
      }

      // Psychomotor reaction delay (0.14 .. 0.52s) before sprinting or ducking
      const reactDelay = clamp((psy?.reactionDelay ?? 0.28) * (0.65 + (1 - prox) * 0.6), 0.1, 0.65);

      // Very close terrified civilians sometimes drop/cower briefly before bolting
      if (dist < 115 && (neurotic > 0.65 || ped.ageGroup === 'elderly') && Math.random() < 0.32) {
        ped.state = 'cowering';
        ped.behaviorTimer = 1.6 + Math.random() * 1.8;
        pedSpeak(ped, pick(PED_PHRASES_GUNSHOT_COWER), 2.8, nowSec);
      } else if (dist > 220 && bravery > 0.62 && callersThisShot < 2 && Math.random() < 0.22) {
        // Brave/conscientious distant witness dials 112
        callersThisShot++;
        ped.state = 'calling_112';
        ped.behaviorTimer = 3.8;
        ped.angle = Math.atan2(originY - ped.y, originX - ped.x);
        pedSpeak(ped, pick(PED_PHRASES_GUNSHOT_CALL), 3.4, nowSec);
      } else if (psy) {
        psy.pendingReactionType = 'panic';
        psy.pendingReactionTimer = reactDelay;
        psy.pendingReactionAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.45;
        psy.pendingReactionText = prox > 0.38 ? pick(PED_PHRASES_GUNSHOT_PANIC) : null;
      } else {
        triggerPedestrianFlight(ped, originX, originY, 8.0);
      }
    }
  }

  // 2. Wildlife & livestock acoustic startle / stampede cascade
  if (world.animals) {
    const animalRadius = alertRadiusPx * (isFirearm ? 1.15 : 0.85);
    const aRadSq = animalRadius * animalRadius;
    for (let i = 0; i < world.animals.length; i++) {
      const a = world.animals[i];
      if (a.state === 'dead' || a.state === 'knocked_down' || a.state === 'in_tree') continue;
      const dx = a.x - originX;
      const dy = a.y - originY;
      const dSq = dx * dx + dy * dy;
      if (dSq > aRadSq) continue;

      const dist = Math.sqrt(dSq);
      const prox = 1 - dist / animalRadius;
      const cfg = ANIMAL_SPECIES_CONFIG[a.species];
      a.threatX = originX;
      a.threatY = originY;
      a.earAlert = 1.0;

      if (!isFirearm && dist > 135) {
        // Subtle airgun pop -> animal snaps head toward sound, goes alert
        if (a.state !== 'fleeing' && a.state !== 'charging') {
          a.state = 'alert';
          a.stateTimer = 3.0;
        }
        continue;
      }

      a.fear = clamp(a.fear + 0.55 + prox * 0.45, 0, 1);
      if (cfg.curlsOnThreat && dist < 240) {
        a.state = 'curled';
        a.stateTimer = 6.0;
      } else if (a.state !== 'charging') {
        a.alarmDelay = Math.min(a.alarmDelay > 0 ? a.alarmDelay : 9, 0.06 + (1 - prox) * 0.35);
      }
    }
  }
}

// ============================================================================
// BLOOD SPLATTER PARTICLE & GROUND STAIN HELPER
// ============================================================================

export function spawnBloodImpactEffects(
  world: GameWorld,
  x: number,
  y: number,
  bulletAngle: number,
  intensity: number
): void {
  addOrGrowFluidStain(world, x, y, 'blood', clamp(1.3 + intensity * 1.4, 1.1, 3.6));
  // Exit spray stain slightly forward along trajectory
  if (intensity > 0.7) {
    addOrGrowFluidStain(
      world,
      x + Math.cos(bulletAngle) * (4 + intensity * 3),
      y + Math.sin(bulletAngle) * (4 + intensity * 3),
      'blood',
      clamp(0.9 + intensity * 1.1, 0.9, 2.8)
    );
  }
  const count = Math.min(12, Math.max(3, Math.round(4 + intensity * 5)));
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 1.15;
    const ang = bulletAngle + spread;
    const spd = 25 + Math.random() * (65 * intensity);
    world.particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      radius: 0.9 + Math.random() * (1.2 * Math.min(1.5, intensity)),
      color: i % 3 === 0 ? '#7f1d1d' : '#b91c1c',
      alpha: 0.9,
      life: 0,
      maxLife: 0.28 + Math.random() * 0.25,
      type: 'water_splash',
      z: 3.5 + Math.random() * 2.5,
      vz: 12 + Math.random() * 22,
    });
  }
}

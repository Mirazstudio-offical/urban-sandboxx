import { ActiveMedication, BodyState, MedicationPhase, Player, BodyPartsMap, Injury } from './types';
import { addPlayerNotification } from './items';
import { sound } from './audio';

/**
 * Pharmacokinetic Model for consumable medications:
 * Phase 1: Absorption (30-40s) — Drug enters bloodstream, effectiveness ramps up from 0% to 25%.
 * Phase 2: Peak (15-25s) — Plasma concentration surges to maximum (25% to 100%).
 * Phase 3: Action / Therapeutic Plateau (180-300s) — Stable maximum pain relief (100%).
 * Phase 4: Decay / Elimination (60-90s) — Gradual metabolic clearance (100% to 0%).
 */

export interface MedicationConfig {
  itemId: string;
  nameRu: string;
  type: 'analgesic' | 'antibiotic' | 'stimulant' | 'antiseptic' | 'sedative';
  absorptionDuration: number;
  peakDuration: number;
  actionDuration: number;
  decayDuration: number;
  maxPainkillerPower: number; // 0.0 to 1.0 pain suppression
}

export const MEDICATION_CONFIGS: Record<string, MedicationConfig> = {
  painkillers: {
    itemId: 'painkillers',
    nameRu: 'Обезболивающее (Анальгетик)',
    type: 'analgesic',
    absorptionDuration: 25, // 25 sec slow onset
    peakDuration: 20,       // 20 sec rapid surge
    actionDuration: 240,    // 4 minutes full therapeutic plateau
    decayDuration: 60,      // 1 minute wearing off
    maxPainkillerPower: 0.85 // 85% pain suppression
  },
  diclofenac_gel: {
    itemId: 'diclofenac_gel',
    nameRu: 'Гель "Диклофенак" (Мазь от боли)',
    type: 'analgesic',
    absorptionDuration: 10,
    peakDuration: 15,
    actionDuration: 200,
    decayDuration: 50,
    maxPainkillerPower: 0.65
  },
  balm_star: {
    itemId: 'balm_star',
    nameRu: 'Бальзам "Золотая Звезда"',
    type: 'stimulant',
    absorptionDuration: 5,
    peakDuration: 10,
    actionDuration: 180,
    decayDuration: 45,
    maxPainkillerPower: 0.35
  },
  vitamins: {
    itemId: 'vitamins',
    nameRu: 'Комплекс витаминов',
    type: 'stimulant',
    absorptionDuration: 20,
    peakDuration: 15,
    actionDuration: 180,
    decayDuration: 60,
    maxPainkillerPower: 0.15
  },
  valerian_drops: {
    itemId: 'valerian_drops',
    nameRu: 'Настойка Валерианы',
    type: 'sedative',
    absorptionDuration: 15,
    peakDuration: 15,
    actionDuration: 220,
    decayDuration: 60,
    maxPainkillerPower: 0.25
  },
  morphine: {
    itemId: 'morphine',
    nameRu: 'Сильнодействующий анальгетик',
    type: 'analgesic',
    absorptionDuration: 10,
    peakDuration: 15,
    actionDuration: 360,
    decayDuration: 90,
    maxPainkillerPower: 0.98
  }
};

/**
 * Calculates remaining active time in seconds for a medication
 */
export function getMedicationRemainingSeconds(med: ActiveMedication): number {
  let rem = 0;
  if (med.phase === 'absorption') {
    rem = Math.max(0, (med.absorptionDuration || 25) - (med.timer || 0)) + (med.peakDuration || 20) + (med.actionDuration || 240) + (med.decayDuration || 60);
  } else if (med.phase === 'peak') {
    rem = Math.max(0, (med.peakDuration || 20) - (med.timer || 0)) + (med.actionDuration || 240) + (med.decayDuration || 60);
  } else if (med.phase === 'action') {
    rem = Math.max(0, (med.actionDuration || 240) - (med.timer || 0)) + (med.decayDuration || 60);
  } else if (med.phase === 'decay') {
    rem = Math.max(0, (med.decayDuration || 60) - (med.timer || 0));
  }
  return Math.max(0, Math.round(rem));
}

/**
 * Calculates real-time drug effectiveness (0.0 to 1.0) using smooth easing curves
 */
export function calculateDrugEffectiveness(med: ActiveMedication): number {
  switch (med.phase) {
    case 'absorption': {
      // Slow exponential-like or quadratic rise from 0 to 0.25
      const progress = Math.min(1.0, med.timer / Math.max(1, med.absorptionDuration));
      return progress * progress * 0.25;
    }
    case 'peak': {
      // Fast surge from 0.25 to 1.0 using smoothstep
      const progress = Math.min(1.0, med.timer / Math.max(1, med.peakDuration));
      const smooth = progress * progress * (3 - 2 * progress);
      return 0.25 + smooth * 0.75;
    }
    case 'action': {
      // Plateau: full 1.0 with subtle natural fluctuation
      return 1.0;
    }
    case 'decay': {
      // Smooth descent from 1.0 to 0.0
      const progress = Math.min(1.0, med.timer / Math.max(1, med.decayDuration));
      const smooth = 1.0 - (progress * progress * (3 - 2 * progress));
      return Math.max(0, smooth);
    }
    default:
      return 0;
  }
}

/**
 * Administers a medication dose to player, registering it in pharmacokinetics engine
 */
export function administerMedication(player: Player, itemId: string) {
  if (!player.bodyState) return;
  const bs = player.bodyState;
  if (!bs.activeMedications) {
    bs.activeMedications = [];
  }

  const config = MEDICATION_CONFIGS[itemId] || MEDICATION_CONFIGS.painkillers;

  // Check if an existing medication of the same type is already active
  const existing = bs.activeMedications.find(m => m.itemId === itemId);
  if (existing) {
    // Refresh / boost dose
    existing.doseCount = (existing.doseCount || 1) + 1;
    if (existing.phase === 'decay') {
      existing.phase = 'peak';
      existing.timer = 0;
    } else if (existing.phase === 'action') {
      existing.timer = Math.max(0, existing.timer - 60); // Extend plateau duration
    }
    addPlayerNotification(
      player,
      `💊 Принята повторная доза: ${config.nameRu}. Действие усилено.`,
      'heal'
    );
    return;
  }

  const newMed: ActiveMedication = {
    id: `med_${itemId}_${Date.now()}`,
    itemId: config.itemId,
    nameRu: config.nameRu,
    type: config.type,
    phase: 'absorption',
    timer: 0,
    totalTimer: 0,
    absorptionDuration: config.absorptionDuration,
    peakDuration: config.peakDuration,
    actionDuration: config.actionDuration,
    decayDuration: config.decayDuration,
    maxPainkillerPower: config.maxPainkillerPower,
    currentEffectiveness: 0,
    doseCount: 1
  };

  bs.activeMedications.push(newMed);
  addPlayerNotification(
    player,
    `💊 Принято: ${config.nameRu}. Начинается медленное всасывание (~${config.absorptionDuration}с)...`,
    'heal'
  );
}

/**
 * Treats a fracture with a splint (immobilizes the bone, removing severe movement pain spike)
 */
export function applySplint(player: Player, targetInjuryId?: string): boolean {
  if (!player.bodyState) return false;
  const parts = player.bodyState.bodyParts;

  for (const k in parts) {
    const key = k as keyof BodyPartsMap;
    const part = parts[key];
    const fracture = targetInjuryId
      ? part.find(i => i.id === targetInjuryId && !i.treated && i.type === 'fracture')
      : part.find(i => !i.treated && i.type === 'fracture');

    if (fracture) {
      fracture.treated = true;
      fracture.treatedTimer = 0;
      fracture.pain = Math.round(fracture.pain ? fracture.pain * 0.45 : 25);
      sound.playUseItem();
      addPlayerNotification(player, `🪵 Наложена шина на ${getPartNameRu(key)}. Перелом зафиксирован!`, 'heal');
      return true;
    }
  }

  return false;
}

/**
 * Treats a burn or abrasion with Panthenol spray/ointment
 */
export function applyPanthenol(player: Player, targetInjuryId?: string): boolean {
  if (!player.bodyState) return false;
  const parts = player.bodyState.bodyParts;

  for (const k in parts) {
    const key = k as keyof BodyPartsMap;
    const part = parts[key];
    const injuryToTreat = targetInjuryId
      ? part.find(i => i.id === targetInjuryId && !i.treated && (i.type === 'burn' || i.type === 'abrasion'))
      : part.find(i => !i.treated && (i.type === 'burn' || i.type === 'abrasion'));

    if (injuryToTreat) {
      injuryToTreat.treated = true;
      injuryToTreat.treatedTimer = 0;
      injuryToTreat.pain = Math.round((injuryToTreat.pain || 20) * 0.35); // Rapid cooling & pain relief
      sound.playUseItem();
      const degText = injuryToTreat.burnDegree ? ` (${injuryToTreat.burnDegree}-я степень)` : '';
      addPlayerNotification(player, `🧴 Нанесен Пантенол на ${getPartNameRu(key)}${degText}. Охлаждающая пена снимает жжение и отек!`, 'heal');
      return true;
    }
  }

  return false;
}

export function applyPanthenolSpray(player: Player, targetInjuryId?: string): boolean {
  return applyPanthenol(player, targetInjuryId);
}

/**
 * Universal regenerating balm Spasatel
 */
export function applySpasatel(player: Player, targetInjuryId?: string): boolean {
  if (!player.bodyState) return false;
  const parts = player.bodyState.bodyParts;

  for (const k in parts) {
    const key = k as keyof BodyPartsMap;
    const part = parts[key];
    const injuryToTreat = targetInjuryId
      ? part.find(i => i.id === targetInjuryId && !i.treated && (i.type === 'burn' || i.type === 'abrasion' || i.type === 'bruise'))
      : part.find(i => !i.treated && (i.type === 'burn' || i.type === 'abrasion' || i.type === 'bruise'));

    if (injuryToTreat) {
      injuryToTreat.treated = true;
      injuryToTreat.treatedTimer = 0;
      injuryToTreat.bleedingRate = 0;
      injuryToTreat.pain = Math.round((injuryToTreat.pain || 15) * 0.4);
      sound.playUseItem();
      addPlayerNotification(player, `🌿 Бальзам "Спасатель" нанесен на ${getPartNameRu(key)}. Запущена ускоренная регенерация тканей.`, 'heal');
      return true;
    }
  }

  return false;
}

export function applySpasatelOintment(player: Player, targetInjuryId?: string): boolean {
  return applySpasatel(player, targetInjuryId);
}

/**
 * Classic Zelenka antiseptic solution
 */
export function applyZelenka(player: Player, targetInjuryId?: string): boolean {
  if (!player.bodyState) return false;
  const parts = player.bodyState.bodyParts;

  for (const k in parts) {
    const key = k as keyof BodyPartsMap;
    const part = parts[key];
    const injuryToTreat = targetInjuryId
      ? part.find(i => i.id === targetInjuryId && !i.treated && (i.type === 'abrasion' || i.type === 'bleeding' || i.type === 'bruise' || i.type === 'burn'))
      : part.find(i => !i.treated && (i.type === 'abrasion' || i.type === 'bleeding' || i.type === 'bruise' || i.type === 'burn'));

    if (injuryToTreat) {
      injuryToTreat.treated = true;
      injuryToTreat.treatedTimer = 0;
      injuryToTreat.bleedingRate = 0;
      injuryToTreat.pain = Math.round((injuryToTreat.pain || 15) * 0.5);
      sound.playUseItem();
      addPlayerNotification(player, `🟢 Зелёнка нанесена на ${getPartNameRu(key)}. Рана обеззаражена и подсушена.`, 'heal');
      return true;
    }
  }

  return false;
}

/**
 * Iodine 5% solution
 */
export function applyIodine(player: Player, targetInjuryId?: string): boolean {
  if (!player.bodyState) return false;
  const parts = player.bodyState.bodyParts;

  for (const k in parts) {
    const key = k as keyof BodyPartsMap;
    const part = parts[key];
    const injuryToTreat = targetInjuryId
      ? part.find(i => i.id === targetInjuryId && !i.treated && (i.type === 'abrasion' || i.type === 'bruise' || i.type === 'sprain'))
      : part.find(i => !i.treated && (i.type === 'abrasion' || i.type === 'bruise' || i.type === 'sprain'));

    if (injuryToTreat) {
      injuryToTreat.treated = true;
      injuryToTreat.treatedTimer = 0;
      injuryToTreat.pain = Math.round((injuryToTreat.pain || 15) * 0.45);
      sound.playUseItem();
      addPlayerNotification(player, `🟤 Йодная сетка нанесена на ${getPartNameRu(key)}. Прогревающий и антисептический эффект.`, 'heal');
      return true;
    }
  }

  return false;
}

/**
 * Diclofenac analgesic gel
 */
export function applyDiclofenac(player: Player, targetInjuryId?: string): boolean {
  if (!player.bodyState) return false;
  const parts = player.bodyState.bodyParts;

  for (const k in parts) {
    const key = k as keyof BodyPartsMap;
    const part = parts[key];
    const injuryToTreat = targetInjuryId
      ? part.find(i => i.id === targetInjuryId && (i.type === 'sprain' || i.type === 'bruise' || i.type === 'fracture' || !i.treated))
      : part.find(i => i.type === 'sprain' || i.type === 'bruise' || i.type === 'fracture' || !i.treated);

    if (injuryToTreat) {
      injuryToTreat.treated = true;
      injuryToTreat.treatedTimer = 0;
      injuryToTreat.pain = Math.round((injuryToTreat.pain || 25) * 0.3);
      administerMedication(player, 'diclofenac_gel');
      sound.playUseItem();
      addPlayerNotification(player, `🧪 Диклофенак гель втерт в ${getPartNameRu(key)}. Воспаление и боль в суставе сняты!`, 'heal');
      return true;
    }
  }

  // If no specific injury, apply topical pain relief
  administerMedication(player, 'diclofenac_gel');
  return true;
}

export function applyDiclofenacGel(player: Player, targetInjuryId?: string): boolean {
  return applyDiclofenac(player, targetInjuryId);
}

/**
 * Hydrogen Peroxide 3%
 */
export function applyHydrogenPeroxide(player: Player, targetInjuryId?: string): boolean {
  if (!player.bodyState) return false;
  const parts = player.bodyState.bodyParts;

  for (const k in parts) {
    const key = k as keyof BodyPartsMap;
    const part = parts[key];
    const injuryToTreat = targetInjuryId
      ? part.find(i => i.id === targetInjuryId && !i.treated && (i.type === 'bleeding' || i.type === 'abrasion'))
      : part.find(i => !i.treated && (i.type === 'bleeding' || i.type === 'abrasion'));

    if (injuryToTreat) {
      injuryToTreat.treated = true;
      injuryToTreat.treatedTimer = 0;
      injuryToTreat.bleedingRate = 0;
      injuryToTreat.pain = Math.round((injuryToTreat.pain || 15) * 0.5);
      sound.playUseItem();
      addPlayerNotification(player, `💧 Перекись водорода промыла рану на ${getPartNameRu(key)}. Пена остановила кровь и очистила ткани.`, 'heal');
      return true;
    }
  }

  return false;
}

/**
 * Ammonia Spirit (Sharp reflex respiratory stimulant)
 */
export function applyAmmoniaSpirit(player: Player): boolean {
  if (!player.bodyState) return false;
  player.isFainting = false;
  player.faintTimer = 0;
  if (player.bodyState) {
    player.bodyState.shockLevel = Math.max(0, (player.bodyState.shockLevel || 0) - 40);
    player.bodyState.panicLevel = Math.max(0, (player.bodyState.panicLevel || 0) - 30);
    player.bodyState.tinnitusTimer = 0;
  }
  player.needs.energy = Math.min(100, (player.needs.energy || 50) + 15);
  sound.playAlert();
  addPlayerNotification(player, `💨 Резкий вдох нашатырного спирта! Чувства мгновенно прояснились, обморок снят!`, 'heal');
  return true;
}

/**
 * Golden Star Balm (Zvezdochka)
 */
export function applyBalmStar(player: Player): boolean {
  if (!player.bodyState) return false;
  administerMedication(player, 'balm_star');
  player.needs.nausea = 0;
  player.needs.sleepiness = Math.max(0, (player.needs.sleepiness || 0) - 25);
  player.needs.energy = Math.min(100, (player.needs.energy || 50) + 10);
  if (player.bodyState) {
    player.bodyState.panicLevel = Math.max(0, (player.bodyState.panicLevel || 0) - 25);
  }
  sound.playUseItem();
  addPlayerNotification(player, `⭐ Бальзам "Звёздочка" нанесен на виски и грудь: эфирные масла снимают головную боль, тошноту и сонливость.`, 'heal');
  return true;
}

/**
 * Activated Charcoal
 */
export function applyActivatedCharcoal(player: Player): boolean {
  player.needs.nausea = 0;
  player.needs.health = Math.min(100, (player.needs.health || 0) + 10);
  sound.playEat();
  addPlayerNotification(player, `⚫ Активированный уголь сорбирует токсины: тяжесть в животе и тошнота полностью прошли.`, 'heal');
  return true;
}

/**
 * Valerian Drops
 */
export function applyValerianDrops(player: Player): boolean {
  if (!player.bodyState) return false;
  administerMedication(player, 'valerian_drops');
  player.bodyState.panicLevel = 0;
  player.bodyState.heartRate = Math.max(65, (player.bodyState.heartRate || 80) - 20);
  sound.playDrink();
  addPlayerNotification(player, `🍃 Капли валерианы приняты: сердцебиение замедлилось, паническая атака и тревога отступили.`, 'heal');
  return true;
}

/**
 * Applies a bandage to treat bleeding, abrasions, burns, or sprains
 */
export function applyBandage(player: Player, targetInjuryId?: string): boolean {
  if (!player.bodyState) return false;
  const parts = player.bodyState.bodyParts;

  for (const k in parts) {
    const key = k as keyof BodyPartsMap;
    const part = parts[key];
    const injuryToTreat = targetInjuryId
      ? part.find(i => i.id === targetInjuryId && !i.treated && (i.type === 'bleeding' || i.type === 'bruise' || i.type === 'abrasion' || i.type === 'sprain' || i.type === 'burn'))
      : part.find(i => !i.treated && (i.type === 'bleeding' || i.type === 'bruise' || i.type === 'abrasion' || i.type === 'sprain' || i.type === 'burn'));

    if (injuryToTreat) {
      injuryToTreat.treated = true;
      injuryToTreat.treatedTimer = 0;
      injuryToTreat.bleedingRate = 0; // Bleeding stopped
      injuryToTreat.pain = Math.round(injuryToTreat.pain ? injuryToTreat.pain * 0.5 : 12);
      sound.playUseItem();
      addPlayerNotification(player, `🩹 Наложена тугая асептическая повязка на ${getPartNameRu(key)} (${injuryToTreat.type === 'bleeding' ? 'Остановка кровотечения' : injuryToTreat.type === 'burn' ? 'Защита ожога' : 'Перевязка'})`, 'heal');
      return true;
    }
  }

  return false;
}

/**
 * Applies a comprehensive trauma medkit
 */
export function applyMedicalPatch(player: Player, targetInjuryId?: string): boolean {
  if (!player.bodyState) return false;
  const parts = player.bodyState.bodyParts;

  for (const k in parts) {
    const key = k as keyof BodyPartsMap;
    const part = parts[key];
    const injuryToTreat = targetInjuryId
      ? part.find(i => i.id === targetInjuryId && !i.treated && (i.type === 'abrasion' || i.type === 'bruise' || i.type === 'burn'))
      : part.find(i => !i.treated && (i.type === 'abrasion' || i.type === 'bruise' || i.type === 'burn'));

    if (injuryToTreat) {
      injuryToTreat.treated = true;
      injuryToTreat.treatedTimer = 0;
      injuryToTreat.bleedingRate = 0;
      injuryToTreat.pain = Math.round((injuryToTreat.pain || 10) * 0.4);
      sound.playUseItem();
      return true;
    }
  }

  return false;
}

export function applyAntiseptic(player: Player, targetInjuryId?: string): boolean {
  if (!player.bodyState) return false;
  const parts = player.bodyState.bodyParts;

  for (const k in parts) {
    const key = k as keyof BodyPartsMap;
    const part = parts[key];
    const injuryToTreat = targetInjuryId
      ? part.find(i => i.id === targetInjuryId && !i.treated && (i.type === 'abrasion' || i.type === 'bleeding' || i.type === 'bruise' || i.type === 'burn'))
      : part.find(i => !i.treated && (i.type === 'abrasion' || i.type === 'bleeding' || i.type === 'bruise' || i.type === 'burn'));

    if (injuryToTreat) {
      injuryToTreat.treated = true;
      injuryToTreat.treatedTimer = 0;
      injuryToTreat.bleedingRate = 0;
      injuryToTreat.pain = Math.round((injuryToTreat.pain || 15) * 0.5);
      sound.playUseItem();
      return true;
    }
  }

  return false;
}

/**
 * Applies a comprehensive trauma medkit
 */
export function applyMedkit(player: Player): boolean {
  if (!player.bodyState) return false;
  const parts = player.bodyState.bodyParts;

  // Restore substantial HP
  player.needs.health = Math.min(100, player.needs.health + 40);

  // Bandage all bleeding, burns and abrasions
  let treatedCount = 0;
  for (const k in parts) {
    const key = k as keyof BodyPartsMap;
    const part = parts[key];
    part.forEach(inj => {
      if (!inj.treated && (inj.type === 'bleeding' || inj.type === 'bruise' || inj.type === 'abrasion' || inj.type === 'sprain' || inj.type === 'burn')) {
        inj.treated = true;
        inj.treatedTimer = 0;
        inj.bleedingRate = 0;
        inj.pain = Math.round((inj.pain || 20) * 0.4);
        treatedCount++;
      }
    });
  }

  // Administer professional analgesic
  administerMedication(player, 'painkillers');
  player.bodyState.temperature = 36.6;
  player.bodyState.wetness = Math.max(0, player.bodyState.wetness - 30);
  sound.playUseItem();
  addPlayerNotification(player, `🧰 Аптечка применена: здоровье восстановлено, кровотечения и ожоги перевязаны, введен анальгетик.`, 'heal');
  return true;
}

/**
 * Main update loop for active medications & pharmacokinetic progression
 */
export function updateMedicineSystem(player: Player, dt: number) {
  if (!player.bodyState || !player.bodyState.activeMedications) return;
  const meds = player.bodyState.activeMedications;

  for (let i = meds.length - 1; i >= 0; i--) {
    const med = meds[i];
    med.timer += dt;
    med.totalTimer += dt;

    // Phase state machine
    if (med.phase === 'absorption') {
      if (med.timer >= med.absorptionDuration) {
        med.phase = 'peak';
        med.timer = 0;
        addPlayerNotification(player, `💊 ${med.nameRu}: наступает активная фаза действия! Боль отступает.`, 'heal');
      }
    } else if (med.phase === 'peak') {
      if (med.timer >= med.peakDuration) {
        med.phase = 'action';
        med.timer = 0;
      }
    } else if (med.phase === 'action') {
      if (med.timer >= med.actionDuration) {
        med.phase = 'decay';
        med.timer = 0;
        addPlayerNotification(player, `⏳ Действие ${med.nameRu} начинает постепенно ослабевать...`, 'info');
      }
    } else if (med.phase === 'decay') {
      if (med.timer >= med.decayDuration) {
        // Drug fully cleared
        meds.splice(i, 1);
        addPlayerNotification(player, `⚠️ Действие ${med.nameRu} полностью завершилось.`, 'warning');
        continue;
      }
    }

    // Compute real-time curve effectiveness
    med.currentEffectiveness = calculateDrugEffectiveness(med);
  }
}

function getPartNameRu(key: keyof BodyPartsMap): string {
  switch (key) {
    case 'head': return 'Голову';
    case 'torso': return 'Грудь';
    case 'leftArm': return 'Левую руку';
    case 'rightArm': return 'Правую руку';
    case 'leftLeg': return 'Левую ногу';
    case 'rightLeg': return 'Правую ногу';
    default: return key;
  }
}

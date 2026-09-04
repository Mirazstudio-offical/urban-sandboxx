import { Player, BodyState, BodyPartStatus, BodyPartsMap, Injury } from './types';
import { BODY_PART_KEYS, BODY_PART_NAMES_RU, createDefaultBodyPartsMap, createDefaultBodyState } from './bodySystem';

export interface BodyPartSensation {
  partNameRu: string;
  status: BodyPartStatus;
  statusRu: string;
  description: string;
  severity: 'healthy' | 'minor' | 'moderate' | 'severe';
  injuries: Injury[];
  fracture: boolean;
  fractureTreated: boolean;
  bleeding: boolean;
  pain: number;
}

export interface DetailedBodySensations {
  healthText: string;
  overallSensorySummary: string;
  hydrationText: string;
  hydrationSeverity: 'full' | 'slight' | 'dry' | 'dehydrated';
  temperatureText: string;
  temperatureSeverity: 'normal' | 'chilly' | 'freezing' | 'fever';
  wetnessText: string;
  wetnessSeverity: 'dry' | 'damp' | 'soaked';
  painText: string;
  painSeverity: 'none' | 'mild' | 'moderate' | 'severe';
  energyText: string;
  energySeverity: 'fresh' | 'tiring' | 'exhausted';
  fullnessText: string;
  fullnessSeverity: 'empty' | 'light' | 'satisfied' | 'stuffed';
  nauseaText: string;
  nauseaSeverity: 'fine' | 'uneasy' | 'nauseous' | 'sick';
  heartRate: number;
  bloodLossText: string;
  activeMedicationsText: string[];
  
  parts: {
    head: BodyPartSensation;
    torso: BodyPartSensation;
    leftArm: BodyPartSensation;
    rightArm: BodyPartSensation;
    leftLeg: BodyPartSensation;
    rightLeg: BodyPartSensation;
  };

  activeSymptoms: Array<{
    id: string;
    label: string;
    description: string;
    severity: 'warning' | 'danger';
    iconType: 'leg' | 'drop' | 'cold' | 'cough' | 'pain' | 'energy' | 'wet' | 'heart' | 'pill';
  }>;
}

export function defaultBodyPartsMap(): BodyPartsMap {
  return createDefaultBodyPartsMap();
}

export function defaultBodyState(): BodyState {
  return createDefaultBodyState();
}

export function getBodyPartLabel(partKey: keyof BodyPartsMap): string {
  return BODY_PART_NAMES_RU[partKey] || partKey;
}

export function getBodyPartStatusText(injuries: Injury[]): string {
  if (!injuries || injuries.length === 0) return 'В норме';
  
  const untrFractures = injuries.filter(i => i.type === 'fracture' && !i.treated);
  const untrBurns = injuries.filter(i => i.type === 'burn' && !i.treated);
  const untrBleeding = injuries.filter(i => i.type === 'bleeding' && !i.treated);
  const trFractures = injuries.filter(i => i.type === 'fracture' && i.treated);

  if (untrFractures.length > 0) return 'Острый перелом (Не зафиксирован)';
  if (untrBurns.length > 0) {
    const maxDeg = Math.max(...untrBurns.map(b => b.burnDegree || 1));
    return `Ожог ${maxDeg}-й степени (Открытый)`;
  }
  if (untrBleeding.length > 0) return 'Открытое кровотечение';
  if (trFractures.length > 0) return 'Зафиксированный перелом';
  if (injuries.some(i => i.type === 'burn' && i.treated)) return 'Ожог (Обработан/Повязка)';
  if (injuries.some(i => i.type === 'sprain' && !i.treated)) return 'Растяжение связок';
  if (injuries.some(i => i.type === 'bruise' && !i.treated)) return 'Сильный ушиб';
  if (injuries.some(i => i.type === 'abrasion' && !i.treated)) return 'Ссадина кожи';
  return 'Обработано (Идёт заживление)';
}

function getPartDetailedDescription(partKey: keyof BodyPartsMap, injuries: Injury[], bodyState?: BodyState): string {
  if (!injuries || injuries.length === 0) {
    if (partKey === 'head' && bodyState && bodyState.temperature < 35.8) {
      return 'Озноб, легкое дрожание в висках от холода';
    }
    if (partKey === 'torso' && bodyState && bodyState.wetness > 60) {
      return 'Одежда промокла, ощущается промозглый холод в груди';
    }
    return 'Без повреждений, неприятных ощущений нет';
  }

  const descriptions: string[] = [];
  const untrFractures = injuries.filter(i => i.type === 'fracture' && !i.treated);
  const trFractures = injuries.filter(i => i.type === 'fracture' && i.treated);
  const untrBurns = injuries.filter(i => i.type === 'burn' && !i.treated);
  const trBurns = injuries.filter(i => i.type === 'burn' && i.treated);
  const untrBleeding = injuries.filter(i => i.type === 'bleeding' && !i.treated);
  const untrBruises = injuries.filter(i => i.type === 'bruise' && !i.treated);
  const untrSprains = injuries.filter(i => i.type === 'sprain' && !i.treated);
  const untrAbrasions = injuries.filter(i => i.type === 'abrasion' && !i.treated);

  if (untrFractures.length > 0) {
    descriptions.push('Острый перелом: адская пронзительная боль при нагрузке, требуется срочная фиксация шиной!');
  } else if (trFractures.length > 0) {
    descriptions.push('Перелом зафиксирован шиной: подвижность кости ограничена, острая боль снята, но сохраняется ноющий фон.');
  }

  if (untrBurns.length > 0) {
    const maxDeg = Math.max(...untrBurns.map(b => b.burnDegree || 1));
    if (maxDeg === 3) {
      descriptions.push('Тяжелый ожог 3-й степени: глубокое термическое поражение дермы, обугливание, сильнейшая жгучая боль! Требуется Пантенол или Бальзам Спасатель.');
    } else if (maxDeg === 2) {
      descriptions.push('Термический ожог 2-й степени: крупные волдыри с серозной жидкостью, резкое жжение и воспаление кожи. Необходима мазь от ожогов.');
    } else {
      descriptions.push('Ожог 1-й степени: гиперемия, покраснение и саднящее жжение эпидермиса.');
    }
  } else if (trBurns.length > 0) {
    descriptions.push('Ожог обработан мазью/забинтован: воспаление купировано, идет длительная регенерация кожи.');
  }

  if (untrBleeding.length > 0) {
    descriptions.push('Кровоточащая рана: пульсирующая боль в такт сердцу, непрерывная потеря крови, необходим бинт.');
  }

  if (untrBruises.length > 0) {
    descriptions.push('Гематома и ушиб: тупая ноющая боль при движении и прикосновениях.');
  }

  if (untrSprains.length > 0) {
    descriptions.push('Растяжение связок: скованность и резкая колющая боль в суставе.');
  }

  if (untrAbrasions.length > 0) {
    descriptions.push('Ссадины кожи: жжение и саднящее ощущение.');
  }

  return descriptions.join(' ') || 'Повреждения обработаны и перевязаны.';
}

export function getDetailedBodySensations(player?: Player): DetailedBodySensations {
  const needs = player?.needs;
  const bodyState = player?.bodyState || defaultBodyState();
  const partsMap = bodyState.bodyParts || defaultBodyPartsMap();

  // Hydration
  const hydr = bodyState.hydration ?? (needs?.thirst ?? 100);
  let hydrationText = 'Организм гидратирован, сухости нет';
  let hydrationSeverity: DetailedBodySensations['hydrationSeverity'] = 'full';
  if (hydr >= 75) {
    hydrationText = 'Отличный водный баланс, сухости нет';
    hydrationSeverity = 'full';
  } else if (hydr >= 45) {
    hydrationText = 'Легкое ощущение сухости в губах';
    hydrationSeverity = 'slight';
  } else if (hydr >= 20) {
    hydrationText = 'Сухость во рту, вялость и тяжелое дыхание';
    hydrationSeverity = 'dry';
  } else {
    hydrationText = 'Мучительное обезвоживание, сухой язык, падение зрения!';
    hydrationSeverity = 'dehydrated';
  }

  // Temperature
  const temp = bodyState.temperature ?? 36.6;
  let temperatureText = `Нормальная температура (${temp.toFixed(1)}°C)`;
  let temperatureSeverity: DetailedBodySensations['temperatureSeverity'] = 'normal';
  if (temp >= 36.2 && temp <= 37.1) {
    temperatureText = `Комфортная температура тела (${temp.toFixed(1)}°C)`;
    temperatureSeverity = 'normal';
  } else if (temp < 36.2 && temp >= 35.2) {
    temperatureText = `Прохладно, ощущается озноб и дрожь (${temp.toFixed(1)}°C)`;
    temperatureSeverity = 'chilly';
  } else if (temp < 35.2) {
    temperatureText = `Опасное переохлаждение / Гипотермия (${temp.toFixed(1)}°C)!`;
    temperatureSeverity = 'freezing';
  } else if (temp >= 39.5) {
    temperatureText = `ОБЖИГАЮЩИЙ ЖАР! Опустошающий тепловой удар и ожоги кожи (${temp.toFixed(1)}°C)!`;
    temperatureSeverity = 'fever';
  } else if (temp >= 37.8) {
    temperatureText = `Мучительный зной и палящая жара (${temp.toFixed(1)}°C)!`;
    temperatureSeverity = 'fever';
  } else {
    temperatureText = `Повышенная температура / Лихорадка (${temp.toFixed(1)}°C)`;
    temperatureSeverity = 'fever';
  }

  // Wetness
  const wetness = bodyState.wetness ?? 0;
  let wetnessText = 'Одежда сухая';
  let wetnessSeverity: DetailedBodySensations['wetnessSeverity'] = 'dry';
  if (wetness <= 15) {
    wetnessText = 'Сухой и комфортно';
    wetnessSeverity = 'dry';
  } else if (wetness <= 55) {
    wetnessText = 'Одежда влажная от осадков';
    wetnessSeverity = 'damp';
  } else {
    wetnessText = 'Одежда полностью промокла насквозь!';
    wetnessSeverity = 'soaked';
  }

  // Pain Level & Pharmacokinetics
  const effectivePain = bodyState.effectivePain ?? bodyState.painLevel ?? 0;
  let painText = 'Болевых ощущений нет';
  let painSeverity: DetailedBodySensations['painSeverity'] = 'none';
  if (effectivePain <= 5) {
    painText = 'Тело не испытывает боли';
    painSeverity = 'none';
  } else if (effectivePain <= 30) {
    painText = 'Умеренная ноющая боль в травмированных конечностях';
    painSeverity = 'mild';
  } else if (effectivePain <= 65) {
    painText = 'Сильная волнообразная боль, пульсирующая в такт сердцу';
    painSeverity = 'moderate';
  } else {
    painText = 'Мучительная острая агония, шоковое состояние!';
    painSeverity = 'severe';
  }

  // Energy
  const energy = bodyState.energy ?? (needs?.energy ?? 100);
  let energyText = 'Полон сил и энергии';
  let energySeverity: DetailedBodySensations['energySeverity'] = 'fresh';
  if (energy >= 70) {
    energyText = 'Бодр и готов к нагрузкам';
    energySeverity = 'fresh';
  } else if (energy >= 30) {
    energyText = 'Ощущается усталость в мышцах';
    energySeverity = 'tiring';
  } else {
    energyText = 'Полное истощение сил и упадок';
    energySeverity = 'exhausted';
  }

  // Blood loss
  const bloodLoss = bodyState.bloodLoss ?? 0;
  let bloodLossText = 'Потери крови нет';
  if (bloodLoss > 40) bloodLossText = 'Критическая кровопотеря: бледность, потеря резкости, предобморок!';
  else if (bloodLoss > 15) bloodLossText = 'Заметная кровопотеря: слабость, потемнение в глазах';

  // Active Medications Text
  const activeMedicationsText: string[] = [];
  if (bodyState.activeMedications && bodyState.activeMedications.length > 0) {
    for (const med of bodyState.activeMedications) {
      let phaseRu = '';
      if (med.phase === 'absorption') phaseRu = 'Всасывание в ЖКТ';
      else if (med.phase === 'peak') phaseRu = 'Нарастание концентрации';
      else if (med.phase === 'action') phaseRu = 'Терапевтическое плато';
      else if (med.phase === 'decay') phaseRu = 'Выведение из организма';

      const pct = Math.round(med.currentEffectiveness * 100);
      activeMedicationsText.push(`${med.nameRu} [${phaseRu}: ${pct}% эфф.]`);
    }
  }

  // Individual body parts analysis
  const partsResult: any = {};
  for (const k of BODY_PART_KEYS) {
    const injuries = partsMap[k] || [];
    let sev: 'healthy' | 'minor' | 'moderate' | 'severe' = 'healthy';
    
    if (injuries.some(i => !i.treated)) sev = 'minor';
    if (injuries.some(i => i.type === 'sprain' && !i.treated)) sev = 'moderate';
    if (injuries.some(i => (i.type === 'fracture' || i.type === 'bleeding') && !i.treated)) sev = 'severe';

    partsResult[k] = {
      partNameRu: BODY_PART_NAMES_RU[k],
      status: getBodyPartStatusText(injuries),
      statusRu: getBodyPartStatusText(injuries),
      description: getPartDetailedDescription(k, injuries, bodyState),
      severity: sev,
      injuries: injuries,
      fracture: injuries.some(i => i.type === 'fracture'),
      fractureTreated: injuries.some(i => i.type === 'fracture' && i.treated),
      bleeding: injuries.some(i => i.type === 'bleeding' && !i.treated),
      pain: injuries.reduce((acc, i) => acc + (i.pain || 0), 0)
    };
  }

  // Active symptoms list for HUD
  const activeSymptoms: DetailedBodySensations['activeSymptoms'] = [];

  // 1. Untreated Fractures
  const hasUntreatedFracture = Object.values(partsMap).some(part => part.some(i => i.type === 'fracture' && !i.treated));
  if (hasUntreatedFracture) {
    activeSymptoms.push({
      id: 'fracture_acute',
      label: 'Острый перелом',
      description: 'Резкая вспышка боли при любом шаге, требуется наложение шины',
      severity: 'danger',
      iconType: 'leg'
    });
  }

  // 2. Bleeding
  const hasActiveBleeding = Object.values(partsMap).some(part => part.some(i => i.type === 'bleeding' && !i.treated));
  if (hasActiveBleeding) {
    activeSymptoms.push({
      id: 'active_bleeding',
      label: 'Кровотечение',
      description: 'Непрерывная потеря крови из раны, требуется бинт или тугая повязка',
      severity: 'danger',
      iconType: 'drop'
    });
  }

  // 2.1 Burns
  const untreatedBurns = Object.values(partsMap).flatMap(part => part.filter(i => i.type === 'burn' && !i.treated));
  if (untreatedBurns.length > 0) {
    const maxDegree = Math.max(...untreatedBurns.map(b => b.burnDegree || 1));
    activeSymptoms.push({
      id: 'active_burn',
      label: `Ожог ${maxDegree}-й степени`,
      description: maxDegree === 3
        ? 'Глубокое термическое поражение дермы, сильнейшее жжение, требуется Пантенол/Спасатель'
        : maxDegree === 2
        ? 'Ожоговые волдыри и воспаление кожи, требуется охлаждающая мазь'
        : 'Термическое покраснение и саднящая боль на коже',
      severity: maxDegree >= 2 ? 'danger' : 'warning',
      iconType: 'cold'
    });
  }

  // 2.2 Carbon Monoxide Intoxication
  const co = bodyState.coPoisoning || 0;
  if (co > 10) {
    activeSymptoms.push({
      id: 'co_poisoning',
      label: `Отравление CO (${Math.round(co)}%)`,
      description: co > 60
        ? 'Острая интоксикация угарным газом: критическая гипоксия мозга, угроза комы!'
        : 'Вдыхание едкого токсичного дыма и продуктов горения, кровь не переносит кислород',
      severity: co > 40 ? 'danger' : 'warning',
      iconType: 'cough'
    });
  }

  // 2.3 Suffocation of varying degrees (1-я до 4-я степень)
  const suffLevel = Math.max(co, bodyState.suffocationLevel || 0);
  if (suffLevel > 10) {
    let suffDegree = 1;
    let suffDesc = 'Першение в горле и раздражение дыхательных путей от дыма';
    if (suffLevel > 80) {
      suffDegree = 4;
      suffDesc = 'Критическое удушье: гипоксический обморок, потеря сознания!';
    } else if (suffLevel > 55) {
      suffDegree = 3;
      suffDesc = 'Тяжёлое удушье, потемнение в глазах, судорожный кашель и спазмы в груди';
    } else if (suffLevel > 28) {
      suffDegree = 2;
      suffDesc = 'Острая нехватка кислорода, частый кашель и сильная одышка';
    }
    activeSymptoms.push({
      id: 'suffocation_symptom',
      label: `Удушье ${suffDegree}-й степени`,
      description: suffDesc,
      severity: suffDegree >= 2 ? 'danger' : 'warning',
      iconType: 'cough'
    });
  }

  // 2.4 Dizziness / Vertigo from Hypoxia and Pain ("Головокружение")
  const dizziness = Math.max(bodyState.dizziness || 0, co * 1.15);
  if (dizziness > 15) {
    activeSymptoms.push({
      id: 'dizziness_symptom',
      label: 'Головокружение',
      description: dizziness > 65
        ? 'Сильное вертиго, предметы плывут перед глазами, земля уходит из-под ног'
        : 'Лёгкое помутнение в голове, пошатывание и дезориентация',
      severity: dizziness > 50 ? 'danger' : 'warning',
      iconType: 'heart'
    });
  }

  // 3. Shock & Blood Loss
  if (bloodLoss > 15 || (bodyState.shockLevel || 0) > 30) {
    activeSymptoms.push({
      id: 'trauma_shock',
      label: 'Травматический шок',
      description: 'Выцветание зрения, сужение поля обзора, слабость',
      severity: 'danger',
      iconType: 'heart'
    });
  }

  // 4. Panic & Fear Attack
  if ((bodyState.panicLevel || 0) > 15) {
    activeSymptoms.push({
      id: 'panic_attack',
      label: 'Паника и страх',
      description: 'Учащенное дыхание, потеря концентрации и дезориентация',
      severity: (bodyState.panicLevel || 0) > 50 ? 'danger' : 'warning',
      iconType: 'heart'
    });
  }

  // 5. Pain
  if (effectivePain > 20) {
    activeSymptoms.push({
      id: 'pain_symptom',
      label: 'Болевой синдром',
      description: effectivePain > 60 ? 'Мучительная волнообразная агония в теле' : 'Ноющая боль в травмированных конечностях',
      severity: effectivePain > 60 ? 'danger' : 'warning',
      iconType: 'pain'
    });
  }

  // 6. Fatigue / Energy Depletion
  const currentEnergy = bodyState.energy ?? (needs?.energy ?? 100);
  if (currentEnergy < 35) {
    activeSymptoms.push({
      id: 'fatigue_symptom',
      label: 'Физическая усталость',
      description: currentEnergy < 15 ? 'Критический упадок сил и мышечное истощение' : 'Ощущение тяжести в мышцах и медленное восстановление',
      severity: currentEnergy < 15 ? 'danger' : 'warning',
      iconType: 'energy'
    });
  }

  // 7. Drowsiness / Sleepiness
  const currentSleepiness = needs?.sleepiness ?? 0;
  if (currentSleepiness > 35) {
    activeSymptoms.push({
      id: 'drowsiness_symptom',
      label: 'Сонливость',
      description: currentSleepiness > 70 ? 'Глаза слипаются, туман перед глазами, предобморочная дремота' : 'Тяжесть в веках и вялость реакций',
      severity: currentSleepiness > 70 ? 'danger' : 'warning',
      iconType: 'energy'
    });
  }

  // 8. Hunger
  const currentHunger = needs?.hunger ?? 100;
  if (currentHunger < 40) {
    activeSymptoms.push({
      id: 'hunger_symptom',
      label: 'Голод',
      description: currentHunger < 15 ? 'Сильное истощение от голода, спазмы желудка' : 'Острый голод и урчание в животе',
      severity: currentHunger < 15 ? 'danger' : 'warning',
      iconType: 'cough'
    });
  }

  // 9. Thirst / Dehydration
  const currentThirst = needs?.thirst ?? 100;
  if (currentThirst < 40 || hydr < 40) {
    activeSymptoms.push({
      id: 'thirst_symptom',
      label: 'Жажда',
      description: currentThirst < 15 ? 'Мучительное обезвоживание, сухой язык, падение зрения' : 'Сухость во рту и потрескавшиеся губы',
      severity: currentThirst < 15 ? 'danger' : 'warning',
      iconType: 'drop'
    });
  }

  // 10. Wetness
  if (wetness > 35) {
    activeSymptoms.push({
      id: 'wetness_symptom',
      label: 'Промокшая одежда',
      description: wetness > 70 ? 'Одежда промокла насквозь, ускоренная потеря тепла' : 'Одежда влажная от осадков',
      severity: wetness > 70 ? 'danger' : 'warning',
      iconType: 'wet'
    });
  }

  // 11. Temperature (Cold or Fever)
  if (temp < 36.2) {
    activeSymptoms.push({
      id: 'cold_symptom',
      label: temp < 35.2 ? 'Гипотермия' : 'Озноб и холод',
      description: `Мышечная дрожь, падение температуры тела (${temp.toFixed(1)}°C)`,
      severity: temp < 35.2 ? 'danger' : 'warning',
      iconType: 'cold'
    });
  } else if (temp > 37.2) {
    activeSymptoms.push({
      id: 'fever_symptom',
      label: 'Лихорадка / Жар',
      description: `Повышенная температура тела (${temp.toFixed(1)}°C), испарина`,
      severity: temp > 38.5 ? 'danger' : 'warning',
      iconType: 'cold'
    });
  }

  // 12. Fullness & Nausea
  const currentFullness = needs?.fullness ?? 0;
  if (currentFullness > 80) {
    activeSymptoms.push({
      id: 'fullness_symptom',
      label: 'Переедание',
      description: 'Тяжесть в желудке от обильного приема пищи',
      severity: 'warning',
      iconType: 'cough'
    });
  }

  const currentNausea = needs?.nausea ?? 0;
  if (currentNausea > 25) {
    activeSymptoms.push({
      id: 'nausea_symptom',
      label: 'Тошнота',
      description: currentNausea > 60 ? 'Сильная тошнота и позывы к рвоте' : 'Легкое недомогание и подташнивание',
      severity: currentNausea > 60 ? 'danger' : 'warning',
      iconType: 'cough'
    });
  }

  // 13. Active Analgesic
  if (bodyState.activeMedications && bodyState.activeMedications.some(m => m.type === 'analgesic' && m.currentEffectiveness > 0.1)) {
    activeSymptoms.push({
      id: 'analgesic_active',
      label: 'Анальгетик активен',
      description: 'Фармакологическое подавление болевых импульсов',
      severity: 'warning',
      iconType: 'pill'
    });
  }

  // Overall summary & health text
  let healthText = 'Организм в норме';
  const hp = needs?.health ?? 100;
  if (hp > 85 && effectivePain < 10) {
    healthText = 'Отличное самочувствие, полон сил';
  } else if (hp > 60 && effectivePain < 35) {
    healthText = 'Умеренное состояние, лёгкий дискомфорт';
  } else if (hp > 30) {
    healthText = 'Плохое самочувствие: боль и травмы';
  } else {
    healthText = 'Критическое состояние! Необходима срочная медпомощь!';
  }

  let overallSensorySummary = healthText;
  if (activeSymptoms.length > 0) {
    overallSensorySummary = activeSymptoms.map(s => `${s.label}: ${s.description}`).join('. ');
  }

  // Fullness & Nausea
  const fullness = needs?.fullness ?? 0;
  let fullnessText = 'Желудок пуст';
  let fullnessSeverity: 'empty' | 'light' | 'satisfied' | 'stuffed' = 'empty';
  if (fullness > 85) { fullnessText = 'Очень сытно, тяжесть в животе'; fullnessSeverity = 'stuffed'; }
  else if (fullness > 60) { fullnessText = 'Сытно, комфортно'; fullnessSeverity = 'satisfied'; }
  else if (fullness > 30) { fullnessText = 'Лёгкая сытость'; fullnessSeverity = 'light'; }
  else if (fullness > 10) { fullnessText = 'Почти пусто'; fullnessSeverity = 'light'; }

  const nausea = needs?.nausea ?? 0;
  let nauseaText = 'Чувствуете себя нормально';
  let nauseaSeverity: 'fine' | 'uneasy' | 'nauseous' | 'sick' = 'fine';
  if (nausea > 70) { nauseaText = 'Сильная тошнота, позывы к рвоте!'; nauseaSeverity = 'sick'; }
  else if (nausea > 40) { nauseaText = 'Тошнит, слабость в теле'; nauseaSeverity = 'nauseous'; }
  else if (nausea > 15) { nauseaText = 'Лёгкая тошнота'; nauseaSeverity = 'uneasy'; }

  return {
    healthText,
    overallSensorySummary,
    hydrationText,
    hydrationSeverity,
    temperatureText,
    temperatureSeverity,
    wetnessText,
    wetnessSeverity,
    painText,
    painSeverity,
    energyText,
    energySeverity,
    fullnessText,
    fullnessSeverity,
    nauseaText,
    nauseaSeverity,
    heartRate: Math.round(bodyState.heartRate || 70),
    bloodLossText,
    activeMedicationsText,
    parts: partsResult,
    activeSymptoms
  };
}

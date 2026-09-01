import { Player, PlayerNeeds, BodyState, BodyPartStatus, BodyPartsMap } from './types';

export interface BodyPartSensation {
  partNameRu: string;
  status: BodyPartStatus;
  statusRu: string;
  description: string;
  severity: 'healthy' | 'minor' | 'moderate' | 'severe';
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
    iconType: 'leg' | 'drop' | 'cold' | 'cough' | 'pain' | 'energy' | 'wet';
  }>;
}

export function defaultBodyPartsMap(): BodyPartsMap {
  return {
    head: [],
    torso: [],
    leftArm: [],
    rightArm: [],
    leftLeg: [],
    rightLeg: []
  };
}

export function defaultBodyState(): BodyState {
  return {
    hydration: 100,
    energy: 100,
    temperature: 36.6,
    wetness: 0,
    painLevel: 0,
    bodyParts: defaultBodyPartsMap(),
    coughTimer: 0,
    groanTimer: 0,
    heavyBreathTimer: 0,
    shiverTimer: 0,
    tinnitusTimer: 0,
    impactFlashTimer: 0
  };
}

export function getBodyPartLabel(partKey: keyof BodyPartsMap): string {
  return PART_NAMES_RU[partKey] || partKey;
}

export function getBodyPartStatusText(injuries: Injury[]): string {
  if (injuries.length === 0) return STATUS_NAMES_RU.healthy;
  // Just show the most severe or a summary
  if (injuries.some(i => i.type === 'fracture' && !i.treated)) return STATUS_NAMES_RU.fractured;
  if (injuries.some(i => i.type === 'bleeding' && !i.treated)) return STATUS_NAMES_RU.bleeding;
  if (injuries.some(i => i.type === 'fracture' && i.treated)) return 'Зафиксированный перелом';
  if (injuries.some(i => i.type === 'sprain' && !i.treated)) return STATUS_NAMES_RU.sprained;
  if (injuries.some(i => i.type === 'bruise' && !i.treated)) return STATUS_NAMES_RU.bruised;
  if (injuries.some(i => i.type === 'abrasion' && !i.treated)) return 'Ссадина';
  return 'Обработано';
}

const PART_NAMES_RU: Record<keyof BodyPartsMap, string> = {
  head: 'Голова',
  torso: 'Торс / Грудь',
  leftArm: 'Левая рука',
  rightArm: 'Правая рука',
  leftLeg: 'Левая нога',
  rightLeg: 'Правая нога'
};

const STATUS_NAMES_RU: Record<string, string> = {
  healthy: 'Здорова',
  bruise: 'Ушиб',
  sprain: 'Растяжение',
  fracture: 'Перелом',
  bleeding: 'Кровотечение',
  abrasion: 'Ссадина'
};

function getPartDescription(partKey: keyof BodyPartsMap, injuries: Injury[], bodyState?: BodyState): string {
  if (injuries.length === 0) {
    if (partKey === 'head' && bodyState && bodyState.temperature < 35.8) {
      return 'Озноб, легкое ознобное дрожание в висках';
    }
    if (partKey === 'torso' && bodyState && bodyState.wetness > 60) {
      return 'Одежда намокла, ощущается сырой холод в груди';
    }
    return 'Без повреждений, неприятных ощущений нет';
  }
  
  const untrFractures = injuries.filter(i => i.type === 'fracture' && !i.treated).length;
  const untrBleeding = injuries.filter(i => i.type === 'bleeding' && !i.treated).length;
  const trFractures = injuries.filter(i => i.type === 'fracture' && i.treated).length;
  
  if (untrFractures > 0) return 'Адская пронзительная боль при малейшей нагрузке, кость повреждена, движение крайне затруднено!';
  if (untrBleeding > 0) return 'Пульсирующая острая боль, рана кровоточит, требуется срочная повязка!';
  if (trFractures > 0) return 'Перелом надежно зафиксирован, но все еще болит.';
  
  if (injuries.some(i => i.type === 'sprain' && !i.treated)) return 'Резкая боль при движении, связки тянет, ограничена подвижность';
  if (injuries.some(i => i.type === 'bruise' && !i.treated)) return 'Тупая ноющая боль при надавливании, синяк и припухлость';
  if (injuries.some(i => i.type === 'abrasion' && !i.treated)) return 'Жжение на поверхности кожи';

  return 'Повреждения обработаны';
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
    temperatureText = `Прохладно, ощущается озноб (${temp.toFixed(1)}°C)`;
    temperatureSeverity = 'chilly';
  } else if (temp < 35.2) {
    temperatureText = `Переохлаждение / Озноб (${temp.toFixed(1)}°C)!`;
    temperatureSeverity = 'freezing';
  } else {
    temperatureText = `Повышенная температура / Жар (${temp.toFixed(1)}°C)`;
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
    wetnessText = 'Одежда влажная от дождя';
    wetnessSeverity = 'damp';
  } else {
    wetnessText = 'Одежда полностью промокла!';
    wetnessSeverity = 'soaked';
  }

  // Pain Level
  const pain = bodyState.painLevel ?? 0;
  let painText = 'Болевых ощущений нет';
  let painSeverity: DetailedBodySensations['painSeverity'] = 'none';
  if (pain <= 5) {
    painText = 'Тело не болит';
    painSeverity = 'none';
  } else if (pain <= 35) {
    painText = 'Умеренная ноющая боль в травмированных зонах';
    painSeverity = 'mild';
  } else if (pain <= 70) {
    painText = 'Сильная пульсирующая боль при движении';
    painSeverity = 'moderate';
  } else {
    painText = 'Мучительная острая боль во всем теле!';
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
    energyText = 'Полное истощение сил';
    energySeverity = 'exhausted';
  }

  // Individual body parts analysis
  const partsResult = {} as any; // Updated dynamic type logic below
  const keys: (keyof BodyPartsMap)[] = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];

  for (const k of keys) {
    const injuries = partsMap[k] || [];
    let sev: 'healthy' | 'minor' | 'moderate' | 'severe' = 'healthy';
    
    if (injuries.some(i => !i.treated)) sev = 'minor';
    if (injuries.some(i => i.type === 'sprain' && !i.treated)) sev = 'moderate';
    if (injuries.some(i => (i.type === 'fracture' || i.type === 'bleeding') && !i.treated)) sev = 'severe';

    partsResult[k] = {
      partNameRu: PART_NAMES_RU[k],
      status: getBodyPartStatusText(injuries),
      statusRu: getBodyPartStatusText(injuries),
      description: getPartDescription(k, injuries, bodyState),
      severity: sev,
      injuries: injuries
    };
  }

  // Dynamic active symptoms summary for HUD icons
  const activeSymptoms: DetailedBodySensations['activeSymptoms'] = [];

  // 1. Leg Injury / Limping
  const leftLegInjured = partsMap.leftLeg.some(i => !i.treated && i.type !== 'abrasion');
  const rightLegInjured = partsMap.rightLeg.some(i => !i.treated && i.type !== 'abrasion');
  
  if (leftLegInjured || rightLegInjured) {
    const isBleed = partsMap.leftLeg.some(i => i.type === 'bleeding' && !i.treated) || 
                    partsMap.rightLeg.some(i => i.type === 'bleeding' && !i.treated);
    activeSymptoms.push({
      id: 'leg_injury',
      label: isBleed ? 'Кровотечение в ноге' : 'Травма ноги (Хромота)',
      description: 'Скорость снижена, характерная хромота при шагах',
      severity: isBleed ? 'danger' : 'warning',
      iconType: 'leg'
    });
  }

  // 2. Dehydration
  if (hydr < 25) {
    activeSymptoms.push({
      id: 'dehydration',
      label: 'Обезвоживание',
      description: 'Пересыхает во рту, тяжело дышать, размывается картинка',
      severity: hydr < 12 ? 'danger' : 'warning',
      iconType: 'drop'
    });
  }

  // 3. Wetness & Cold
  if (wetness > 60 || temp < 35.8) {
    activeSymptoms.push({
      id: 'wetness',
      label: temp < 35.5 ? 'Гипотермия (Озноб)' : 'Промокание',
      description: 'Одежда намокла, снижается температура тела',
      severity: temp < 35.2 ? 'danger' : 'warning',
      iconType: wetness > 60 ? 'wet' : 'cold'
    });
  }

  // 4. Cough / Flu
  if (temp < 35.8 && wetness > 50) {
    activeSymptoms.push({
      id: 'cough',
      label: 'Простуда / Кашель',
      description: 'Периодические приступы кашля и недомогание',
      severity: 'warning',
      iconType: 'cough'
    });
  }

  // 5. Pain / Trauma / Bleeding
  if (pain > 30 || Object.values(partsMap).some(s => s === 'bleeding')) {
    activeSymptoms.push({
      id: 'pain',
      label: pain > 60 ? 'Острая травматическая боль' : 'Болевой синдром',
      description: 'Требуются обезболивающие или бинты для обработки ран',
      severity: pain > 60 ? 'danger' : 'warning',
      iconType: 'pain'
    });
  }

  // 6. Exhaustion
  if (energy < 20) {
    activeSymptoms.push({
      id: 'exhaustion',
      label: 'Сильное истощение',
      description: 'Закончились силы, забиты мышцы',
      severity: 'warning',
      iconType: 'energy'
    });
  }

  // Overall summary & health text
  let healthText = 'Организм в порядке';
  const hp = needs?.health ?? 100;
  if (hp > 85 && pain < 15) {
    healthText = 'Отличное самочувствие, бодр и полон сил';
  } else if (hp > 60) {
    healthText = 'Умеренное самочувствие, лёгкий дискомфорт';
  } else if (hp > 30) {
    healthText = 'Плохое самочувствие, ощущаются боли и недомогание';
  } else {
    healthText = 'Критическое состояние! Необходима медицинская помощь!';
  }

  let overallSensorySummary = healthText;
  if (activeSymptoms.length > 0) {
    overallSensorySummary = activeSymptoms.map(s => `${s.label}: ${s.description}`).join('. ');
  }

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
    parts: partsResult,
    activeSymptoms
  };
}

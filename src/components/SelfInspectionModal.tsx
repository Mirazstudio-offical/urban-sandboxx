import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Player, BodyPartsMap, Injury, InventoryItem } from '../types';
import { getDetailedBodySensations, getBodyPartLabel, getBodyPartStatusText } from '../sensations';
import { useItemOnPlayer, useHandItemOnPlayer } from '../items';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { sound } from '../audio';
import selfInspectionCss from './selfInspection.css?inline';
import {
  Activity,
  Heart,
  ShieldCheck,
  Pill,
  Thermometer,
  Droplet,
  Zap,
  CloudRain,
  AlertTriangle,
  AlertCircle,
  Utensils,
  BatteryLow,
  CheckCircle2,
  X
} from 'lucide-react';

interface SelfInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

export interface AnatomyZoneStyle {
  fill: string;
  stroke: string;
  severity: 'healthy' | 'treated' | 'minor' | 'severe';
  hasFracture?: boolean;
  hasBleeding?: boolean;
  hasBurn?: boolean;
  allTreated?: boolean;
  count: number;
}

const BODY_ZONES: (keyof BodyPartsMap)[] = [
  'head',
  'torso',
  'leftArm',
  'rightArm',
  'leftLeg',
  'rightLeg'
];

const ZONE_CENTERS: Record<keyof BodyPartsMap, { x: number; y: number }> = {
  head: { x: 100, y: 35 },
  torso: { x: 100, y: 112 },
  leftArm: { x: 52, y: 116 },
  rightArm: { x: 148, y: 116 },
  leftLeg: { x: 84, y: 222 },
  rightLeg: { x: 116, y: 222 }
};

/**
 * Clean human silhouette without text, numbers, letters, or badges on the body.
 * Visualizes physical state on each zone: bleeding cuts, fractures, contusions,
 * or wrapped bandage strips when treated.
 * Exported for reuse in LimbTreatmentModal.
 */
export const AnatomyFigureSvg: React.FC<{
  selectedPart: keyof BodyPartsMap;
  onSelectPart: (part: keyof BodyPartsMap) => void;
  getZoneStyle: (part: keyof BodyPartsMap) => AnatomyZoneStyle;
}> = ({ selectedPart, onSelectPart, getZoneStyle }) => {
  const renderZonePart = (partKey: keyof BodyPartsMap, mainPath: string) => {
    const st = getZoneStyle(partKey);
    const isSelected = selectedPart === partKey;
    const strokeColor = isSelected ? '#f0c264' : st.stroke;
    const strokeW = isSelected ? 2.4 : 1.4;
    const c = ZONE_CENTERS[partKey];

    return (
      <g
        key={partKey}
        onClick={() => onSelectPart(partKey)}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-label={getBodyPartLabel(partKey)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectPart(partKey);
          }
        }}
      >
        <path
          d={mainPath}
          fill={st.fill}
          stroke={strokeColor}
          strokeWidth={strokeW}
          strokeLinejoin="round"
        />

        {st.count > 0 && (
          <g transform={`translate(${c.x}, ${c.y})`} style={{ pointerEvents: 'none' }}>
            {st.allTreated && (
              <g stroke="rgba(233, 230, 223, 0.72)" strokeWidth="2.2" strokeLinecap="round">
                <line x1="-8" y1="-4" x2="8" y2="-1" />
                <line x1="-8" y1="1" x2="8" y2="4" />
                <line x1="-7" y1="5" x2="7" y2="2" />
              </g>
            )}

            {st.hasFracture && (
              <path
                d="M-5 -7 L1 -2 L-3 2 L5 8"
                fill="none"
                stroke="#efa690"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {st.hasBleeding && (
              <g>
                <path
                  d="M-6 -3 Q0 -1 6 -4"
                  fill="none"
                  stroke="#e5484d"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M-1 0 C1 3 1.8 4.8 1.8 6.2 A1.8 1.8 0 1 1 -1.8 6.2 C-1.8 4.8 -1 3 -1 0 Z"
                  fill="#e5484d"
                />
                <circle cx="3.5" cy="4" r="1.2" fill="#e5484d" />
              </g>
            )}

            {!st.allTreated && !st.hasFracture && !st.hasBleeding && (
              <ellipse
                cx="0"
                cy="0"
                rx="7"
                ry="5"
                fill={st.hasBurn ? 'rgba(229, 72, 77, 0.45)' : 'rgba(224, 171, 69, 0.4)'}
              />
            )}
          </g>
        )}
      </g>
    );
  };

  return (
    <svg
      viewBox="30 8 140 294"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {renderZonePart(
        'head',
        'M100 13 C88 13 82 22 83 34 C83.5 42 87 49 92 52 L92 58 L108 58 L108 52 C113 49 116.5 42 117 34 C118 22 112 13 100 13 Z'
      )}
      {renderZonePart(
        'torso',
        'M75 61 L92 58 L108 58 L125 61 C131 63 133 70 131 82 L126 124 L124 152 C124 158 117 162 108 162 L100 164 L92 162 C83 162 76 158 76 152 L74 124 L69 82 C67 70 69 63 75 61 Z'
      )}
      {renderZonePart(
        'leftArm',
        'M72 62 C63 64 57 71 54 83 L47 115 L39 148 L35 164 C34 169 38 173 43 171 L49 162 L59 122 L67 90 L72 62 Z'
      )}
      {renderZonePart(
        'rightArm',
        'M128 62 C137 64 143 71 146 83 L153 115 L161 148 L165 164 C166 169 162 173 157 171 L151 162 L141 122 L133 90 L128 62 Z'
      )}
      {renderZonePart(
        'leftLeg',
        'M76 158 L97 163 L93 218 L89 274 L91 291 C91 295 85 297 76 297 C71 297 69 293 72 288 L76 274 L75 218 L76 158 Z'
      )}
      {renderZonePart(
        'rightLeg',
        'M124 158 L103 163 L107 218 L111 274 L109 291 C109 295 115 297 124 297 C129 297 131 293 128 288 L124 274 L125 218 L124 158 Z'
      )}
    </svg>
  );
};

interface AvailableMedEntry {
  source: 'inventory' | 'leftHand' | 'rightHand';
  idx: number;
  item: InventoryItem;
  medId: string;
}

const SYSTEMIC_MED_INFO: Record<string, { roleRu: string; actionLabel: string }> = {
  medkit: { roleRu: 'Перевязка ран и обезболивающее', actionLabel: 'Применить' },
  painkillers: { roleRu: 'Притупляет острую и ноющую боль', actionLabel: 'Принять' },
  pill_painkiller_single: { roleRu: 'Притупляет боль', actionLabel: 'Принять' },
  pill_antipyretic_single: { roleRu: 'Сбивает жар и ломоту', actionLabel: 'Принять' },
  morphine: { roleRu: 'Сильное обезболивающее при тяжёлых травмах', actionLabel: 'Применить' },
  ammonia_spirit: { roleRu: 'Приводит в чувство при шоке и дурноте', actionLabel: 'Вдохнуть' },
  balm_star: { roleRu: 'Проясняет голову, снимает тошноту и дремоту', actionLabel: 'Нанести' },
  activated_charcoal: { roleRu: 'Помогает при тошноте и тяжести в животе', actionLabel: 'Принять' },
  pill_charcoal_single: { roleRu: 'Помогает при тошноте и отравлении', actionLabel: 'Принять' },
  valerian_drops: { roleRu: 'Успокаивает нервы и унимает дрожь', actionLabel: 'Принять' },
  vitamins: { roleRu: 'Поддерживает силы и бодрость', actionLabel: 'Принять' },
  pill_vitamin_single: { roleRu: 'Поддерживает тонус организма', actionLabel: 'Принять' }
};

const SelfInspectionContent: React.FC<{
  player: Player;
  onClose: () => void;
}> = ({ player, onClose }) => {
  const [selectedPart, setSelectedPart] = useState<keyof BodyPartsMap>(() => {
    const parts = player.bodyState?.bodyParts;
    if (!parts) return 'torso';
    const getList = (k: keyof BodyPartsMap): Injury[] => {
      const raw = parts[k];
      return Array.isArray(raw) ? raw : ((raw as any)?.injuries || []);
    };
    const untreated = BODY_ZONES.find(k => getList(k).some(i => !i.treated));
    if (untreated) return untreated;
    const anyInj = BODY_ZONES.find(k => getList(k).length > 0);
    return anyInj || 'torso';
  });
  const [selectedInjuryId, setSelectedInjuryId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [, setTick] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gmRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => attachStageFit(() => wrapRef.current, () => gmRef.current), []);
  useTopmostEscape(onClose);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    let prevSig = '';
    const buildSig = () => {
      const b = player.bodyState;
      const n = player.needs;
      if (!b) return '';
      const injCount = BODY_ZONES.reduce((sum, k) => {
        const raw = b.bodyParts[k];
        const list: Injury[] = Array.isArray(raw) ? raw : ((raw as any)?.injuries || []);
        return sum + list.length * 10 + list.filter(i => i.treated).length;
      }, 0);
      return `${Math.round(n?.health ?? 100)}:${Math.round(n?.hunger ?? 100)}:${Math.round(n?.thirst ?? 100)}:${Math.round(n?.energy ?? 100)}:${Math.round((b.coreTemperature ?? 36.6) * 10)}:${Math.round(b.painLevel ?? 0)}:${Math.round(b.wetness ?? 0)}:${injCount}:${(b.activeMedications || []).length}`;
    };
    prevSig = buildSig();
    const timer = window.setInterval(() => {
      const nextSig = buildSig();
      if (nextSig !== prevSig) {
        prevSig = nextSig;
        setTick(t => t + 1);
      }
    }, 800);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, [player]);

  const bs = player.bodyState!;
  const detailed = getDetailedBodySensations(player);

  const getPartInjuries = (partKey: keyof BodyPartsMap): Injury[] => {
    const raw = bs.bodyParts[partKey];
    return Array.isArray(raw) ? raw : ((raw as any)?.injuries || []);
  };

  const getZoneStyle = (partKey: keyof BodyPartsMap): AnatomyZoneStyle => {
    const injuries = getPartInjuries(partKey);
    if (!injuries || injuries.length === 0) {
      return {
        fill: 'rgba(154, 201, 133, 0.16)',
        stroke: '#9ac985',
        severity: 'healthy',
        count: 0
      };
    }

    const hasUntreatedFracture = injuries.some(i => i.type === 'fracture' && !i.treated);
    const hasUntreatedBleeding = injuries.some(i => i.type === 'bleeding' && !i.treated);
    const hasUntreatedSevereBurn = injuries.some(
      i => i.type === 'burn' && !i.treated && (i.burnDegree || 1) >= 2
    );
    const hasAnyUntreated = injuries.some(i => !i.treated);

    if (hasUntreatedFracture || hasUntreatedBleeding || hasUntreatedSevereBurn) {
      return {
        fill: 'rgba(229, 72, 77, 0.32)',
        stroke: '#e5484d',
        severity: 'severe',
        hasFracture: hasUntreatedFracture,
        hasBleeding: hasUntreatedBleeding,
        hasBurn: hasUntreatedSevereBurn,
        allTreated: false,
        count: injuries.length
      };
    }

    if (hasAnyUntreated) {
      return {
        fill: 'rgba(224, 171, 69, 0.26)',
        stroke: '#e0ab45',
        severity: 'minor',
        hasBurn: injuries.some(i => i.type === 'burn' && !i.treated),
        allTreated: false,
        count: injuries.length
      };
    }

    return {
      fill: 'rgba(201, 146, 43, 0.18)',
      stroke: '#c9922b',
      severity: 'treated',
      allTreated: true,
      count: injuries.length
    };
  };

  const getInjuryHumanName = (injury: Injury) => {
    switch (injury.type) {
      case 'bruise':
        return (injury.severity || 50) > 65 ? 'Обширный синяк и гематома' : 'Ушиб и припухлость';
      case 'sprain':
        return 'Растяжение связок';
      case 'fracture':
        return 'Перелом кости';
      case 'bleeding':
        return (injury.severity || 50) > 60 ? 'Сильное кровотечение из раны' : 'Кровоточащая рана';
      case 'abrasion':
        return 'Содранная кожа и ссадины';
      case 'burn': {
        const deg = injury.burnDegree || 1;
        if (deg === 3) return 'Глубокий тяжёлый ожог кожи';
        if (deg === 2) return 'Ожог с волдырями';
        return 'Покраснение и термический ожог';
      }
      default:
        return 'Повреждение';
    }
  };

  const getInjurySensoryFeeling = (injury: Injury) => {
    if (injury.treated) {
      if (injury.type === 'fracture') return 'Конечность зафиксирована шиной. Острая боль при движении ушла, остался глухой ноющий фон.';
      if (injury.type === 'bleeding') return 'Рана стянута повязкой, кровь больше не течёт';
      if (injury.type === 'burn') return 'Обожжённая кожа покрыта мазью и защищена, жжение стихло';
      return 'Место травмы обработано и перевязано, постепенно заживает';
    }
    switch (injury.type) {
      case 'fracture':
        return 'Резкая пронзительная боль при малейшей нагрузке или движении. Нужна шина для фиксации.';
      case 'bleeding':
        return 'Кровь сочится наружу, рана пульсирует. Нужно промыть перекисью и туго перевязать бинтом.';
      case 'burn': {
        const deg = injury.burnDegree || 1;
        if (deg >= 2) return 'На коже вздулись волдыри, печёт и дёргает от любого касания. Нужен Пантенол или бальзам «Спасатель».';
        return 'Кожа покраснела и сильно печёт. Поможет охлаждающий спрей, мазь или пластырь.';
      }
      case 'sprain':
        return 'Сустав распух, при повороте стреляет резкой болью. Поможет обезболивающий гель или тугая повязка.';
      case 'bruise':
        return 'Тёмный кровоподтёк, тупо ноет при прикосновении. Можно помазать гелем, мазью или йодной сеткой.';
      case 'abrasion':
        return 'Кожа содрана, щиплет и саднит. Стоит обработать антисептиком и заклеить пластырем.';
      default:
        return 'Болезненное место, требует обработки';
    }
  };

  const getInjurySeverityLabel = (injury: Injury) => {
    if (injury.treated) return 'Обработано';
    const sev = injury.severity || 50;
    if (injury.type === 'fracture' || (injury.type === 'burn' && (injury.burnDegree || 1) >= 2) || sev > 70) {
      return 'Тяжёлая травма';
    }
    if (injury.type === 'bleeding' || injury.type === 'sprain' || sev > 40) {
      return 'Ощутимая травма';
    }
    return 'Лёгкое повреждение';
  };

  const getEffectiveMedId = (item: InventoryItem | null | undefined): string | null => {
    if (!item) return null;
    if (item.fluidStorage && (item.fluidStorage.currentMl ?? 0) > 0) {
      return item.fluidStorage.attributes?.medicalEffectId || item.originalCatalogId || item.itemId;
    }
    if (item.isContainer && item.contents) {
      if (item.contents.length === 0) return null;
      return item.contents[0]?.itemId || item.originalCatalogId || item.itemId;
    }
    if (item.singleUseContainer && !item.isOpen) {
      if (item.itemId === 'blister_painkillers') return 'painkillers';
      if (item.itemId === 'blister_antipyretic') return 'pill_antipyretic_single';
      if (item.itemId === 'blister_charcoal') return 'activated_charcoal';
      if (item.itemId === 'blister_vitamins') return 'vitamins';
      if (item.itemId === 'pack_medical_patches') return 'medical_patch';
    }
    return item.originalCatalogId || item.itemId;
  };

  const allMedEntries: AvailableMedEntry[] = [];
  if (player.leftHandItem) {
    const medId = getEffectiveMedId(player.leftHandItem);
    if (medId) allMedEntries.push({ source: 'leftHand', idx: -1, item: player.leftHandItem, medId });
  }
  if (player.rightHandItem) {
    const medId = getEffectiveMedId(player.rightHandItem);
    if (medId) allMedEntries.push({ source: 'rightHand', idx: -2, item: player.rightHandItem, medId });
  }
  if (player.inventory) {
    player.inventory.forEach((item, idx) => {
      if (!item) return;
      const medId = getEffectiveMedId(item);
      if (medId) allMedEntries.push({ source: 'inventory', idx, item, medId });
    });
  }

  const isCompatibleWithInjury = (medId: string, injury: Injury): boolean => {
    if (injury.treated) return false;
    if (medId === 'splint') return injury.type === 'fracture';
    if (medId === 'panthenol' || medId === 'panthenol_spray' || medId === 'panthenol_foam') {
      return injury.type === 'burn' || injury.type === 'abrasion';
    }
    if (medId === 'spasatel_ointment') {
      return injury.type === 'burn' || injury.type === 'abrasion' || injury.type === 'bruise';
    }
    if (medId === 'zelenka') {
      return injury.type === 'abrasion' || injury.type === 'bleeding' || injury.type === 'bruise' || injury.type === 'burn';
    }
    if (medId === 'iodine') {
      return injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'sprain';
    }
    if (medId === 'diclofenac_gel') {
      return injury.type === 'sprain' || injury.type === 'bruise' || injury.type === 'fracture';
    }
    if (medId === 'hydrogen_peroxide') {
      return injury.type === 'bleeding' || injury.type === 'abrasion';
    }
    if (medId === 'bandage') {
      return injury.type === 'bleeding' || injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'burn' || injury.type === 'sprain';
    }
    if (medId === 'medical_patch' || medId === 'patch_bactericidal_single') {
      return injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'burn';
    }
    if (medId === 'antiseptic') {
      return injury.type === 'abrasion' || injury.type === 'bleeding' || injury.type === 'bruise' || injury.type === 'burn';
    }
    return false;
  };

  const getCompatibleItemsForInjury = (injury: Injury): AvailableMedEntry[] =>
    allMedEntries.filter(entry => isCompatibleWithInjury(entry.medId, injury));

  const systemicMedEntries = allMedEntries.filter(entry => Boolean(SYSTEMIC_MED_INFO[entry.medId]));

  const handleUseEntry = (entry: AvailableMedEntry, targetInjuryId?: string) => {
    if (entry.source === 'leftHand') {
      useHandItemOnPlayer(player, 'left', undefined, targetInjuryId);
    } else if (entry.source === 'rightHand') {
      useHandItemOnPlayer(player, 'right', undefined, targetInjuryId);
    } else {
      useItemOnPlayer(player, entry.idx, undefined, targetInjuryId);
    }
    sound.playUseItem();
    setTick(t => t + 1);
  };

  const formatItemWhere = (entry: AvailableMedEntry): string => {
    if (entry.source === 'leftHand') return 'Левая рука';
    if (entry.source === 'rightHand') return 'Правая рука';
    return 'В кармане / сумке';
  };

  const currentInjuries = getPartInjuries(selectedPart);
  const currentPartSensation = detailed.parts[selectedPart];

  const allBodyInjuries = BODY_ZONES.flatMap(k =>
    getPartInjuries(k).map(inj => ({ partKey: k, injury: inj }))
  );
  const totalUntreatedCount = allBodyInjuries.filter(x => !x.injury.treated).length;
  const otherInjuredParts = BODY_ZONES.filter(
    k => k !== selectedPart && getPartInjuries(k).length > 0
  );

  // Qualitative natural sensations (no telemetry percentages or numbers)
  const hp = player.needs.health ?? 100;
  const pulse = detailed.heartRate;
  const temp = bs.temperature ?? 36.6;
  const rawPain = bs.painLevel ?? 0;
  const effectivePain = bs.effectivePain ?? bs.painLevel ?? 0;
  const bloodLoss = bs.bloodLoss ?? 0;
  const shock = bs.shockLevel ?? 0;
  const panic = bs.panicLevel ?? 0;
  const coLevel = Math.max(bs.coPoisoning ?? 0, bs.suffocationLevel ?? 0);
  const energy = player.needs.energy ?? 100;
  const hunger = player.needs.hunger ?? 100;
  const thirst = player.needs.thirst ?? 100;
  const wetness = bs.wetness ?? 0;
  const nausea = player.needs.nausea ?? 0;
  const sleepiness = player.needs.sleepiness ?? 0;
  const activeMeds = bs.activeMedications || [];

  const getPainAndStateTitle = () => {
    if (hp < 25 || shock > 65 || effectivePain > 70) return 'Предобморочное состояние';
    if (effectivePain > 40) return 'Сильная боль в теле';
    if (effectivePain > 12) return 'Умеренная боль';
    if (rawPain > 15 && effectivePain <= 12) return 'Боль притуплена лекарством';
    return 'Хорошее самочувствие';
  };
  const getPainAndStateSub = () => {
    if (bloodLoss > 35) return 'Сильная слабость от потери крови, кружится голова';
    if (bloodLoss > 12) return 'Лёгкая дурнота и бледность от потери крови';
    if (rawPain > effectivePain + 10) return 'Анальгетик действует, острая боль почти не чувствуется';
    return detailed.painText;
  };

  const getHeartAndBreathTitle = () => {
    if (coLevel > 45) return 'Задыхаюсь от дыма';
    if (coLevel > 12) return 'Першит в горле, кашель';
    if (pulse > 125 || panic > 60) return 'Сердце бешено колотится';
    if (pulse > 95 || panic > 25) return 'Сердце стучит быстрее обычного';
    return 'Дыхание и пульс ровные';
  };
  const getHeartAndBreathSub = () => {
    if (coLevel > 12) return 'Тяжело дышать из-за угарного газа и гари';
    if (panic > 45) return 'Сильная тревога, руки слегка дрожат, дыхание сбито';
    if (panic > 15) return 'Внутреннее напряжение и беспокойство';
    if (pulse > 100) return 'Пульс отдаётся в висках после нагрузки или боли';
    return 'Спокойное ровное дыхание, тревоги нет';
  };

  const getThermalTitle = () => {
    if (temp < 35.0) return 'Сильное переохлаждение';
    if (temp < 36.1) return 'Пробирает озноб';
    if (temp > 38.5) return 'Сильный жар';
    if (temp > 37.3) return 'Голова горячая, знобит';
    if (wetness > 60) return 'Промок до нитки';
    if (wetness > 25) return 'Одежда сырая';
    return 'Тепло и сухо';
  };
  const getThermalSub = () => {
    if (temp < 35.5) return 'Пальцы слушаются плохо, бьёт крупная дрожь от холода';
    if (temp > 37.5) return 'На лбу испарина, тело горит';
    if (wetness > 55) return 'Мокрая одежда липнет к телу и вытягивает тепло';
    if (wetness > 20) return 'Ткань слегка влажная от осадков';
    return detailed.comfortText;
  };

  const getEnergyAndNeedsTitle = () => {
    if (thirst < 25) return 'Мучает сильная жажда';
    if (hunger < 25) return 'Сильный голод';
    if (energy < 25 || sleepiness > 70) return 'Валится с ног от усталости';
    if (nausea > 40) return 'Подступает тошнота';
    if (thirst < 60) return 'Хочется пить';
    if (hunger < 60) return 'Хочется перекусить';
    if (energy < 55 || sleepiness > 35) return 'Накопилась усталость';
    return 'Полон сил, сыт';
  };
  const getEnergyAndNeedsSub = () => {
    const parts: string[] = [];
    if (thirst < 30) parts.push('во рту совсем пересохло');
    else if (thirst < 65) parts.push('пересохли губы');
    if (hunger < 30) parts.push('сводит пустой желудок');
    else if (hunger < 65) parts.push('урчит в животе');
    if (nausea > 25) parts.push('мутит');
    if (energy < 35 || sleepiness > 55) parts.push('веки тяжёлые, клонит в сон');
    if (parts.length === 0) return 'Ни жажды, ни голода, голова свежая';
    const joined = parts.join(', ');
    return joined.charAt(0).toUpperCase() + joined.slice(1);
  };

  const cleanSensoryText = (str: string) =>
    str.replace(/\s*\(\d+(\.\d+)?(%|°C)\)/g, '');

  const painTone = effectivePain > 35 || hp < 35 ? 'is-bad' : effectivePain > 12 ? 'is-warn' : '';
  const heartTone = coLevel > 25 || panic > 55 ? 'is-bad' : coLevel > 12 || pulse > 110 || panic > 25 ? 'is-warn' : '';
  const thermalTone = temp < 35.8 || wetness > 55 ? 'is-cold' : temp > 37.5 ? 'is-bad' : '';
  const needsTone = hunger < 25 || thirst < 25 || energy < 20 ? 'is-bad' : hunger < 50 || thirst < 50 || energy < 40 ? 'is-warn' : '';

  const statusColor =
    totalUntreatedCount > 0 ? '#e5484d' : allBodyInjuries.length > 0 ? '#e0ab45' : '#9ac985';
  const statusLabel =
    totalUntreatedCount > 0
      ? 'Есть необработанные раны'
      : allBodyInjuries.length > 0
      ? 'Раны перевязаны и заживают'
      : 'Цел и невредим';

  const selectZone = (part: keyof BodyPartsMap) => {
    setSelectedPart(part);
    setSelectedInjuryId(null);
  };

  const hasExtraSensoryList = detailed.activeSymptoms.length > 0 || activeMeds.length > 0;

  return (
    <ShadowHost css={selfInspectionCss} zIndex={50} background="transparent">
      <div id="w" ref={wrapRef}>
        <div className={'bd' + (!entered ? ' gone' : '')} />
        <div className={'gm' + (!entered ? ' gone' : '')} ref={gmRef}>
          {/* Main Menu ambient glow & dark vignette */}
          <div
            className="a"
            style={{
              inset: 0,
              background: 'radial-gradient(900px 520px at 72% 84%, rgba(201,146,43,.24), transparent 62%)'
            }}
          />
          <div
            className="a"
            style={{
              inset: 0,
              background: 'linear-gradient(90deg, rgba(9,9,10,.88), rgba(9,9,10,.36) 50%, rgba(9,9,10,.6) 100%)'
            }}
          />

          {/* Top Bar */}
          <div className="top">
            <div className="top-l">
              <button
                type="button"
                className="chip back"
                onClick={onClose}
                aria-label="Закрыть самоосмотр"
                title="Закрыть"
              >
                <X size={20} strokeWidth={2} color="#e9e6df" />
              </button>
              <span className="cn ttl">Самоосмотр</span>
              <span className="sub-top">Внешний осмотр тела, ощущения и первая помощь</span>
            </div>

            <div className="top-r">
              <div className="chip">
                <span className="dot" style={{ background: statusColor }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
              </div>
            </div>
          </div>

          {/* 3-Column Horizontal Workspace (never collapses into 1-col tabs) */}
          <div className="si-body">
            {/* COLUMN 1: Silhouette + 6 Zone Buttons (ZERO scroll) */}
            <section className="panel si-col">
              <div className="si-col-head">
                <span className="cn si-col-title">Осмотр тела</span>
                <span className="si-col-meta">6 областей</span>
              </div>

              <div className="si-body-split">
                <div className="si-figure">
                  <AnatomyFigureSvg
                    selectedPart={selectedPart}
                    onSelectPart={selectZone}
                    getZoneStyle={getZoneStyle}
                  />
                </div>

                <div className="si-zones">
                  {BODY_ZONES.map(partKey => {
                    const st = getZoneStyle(partKey);
                    const injs = getPartInjuries(partKey);
                    const isSelected = selectedPart === partKey;
                    const dotColor =
                      st.severity === 'severe'
                        ? '#e5484d'
                        : st.severity === 'minor'
                        ? '#e0ab45'
                        : st.severity === 'treated'
                        ? '#c9922b'
                        : '#9ac985';

                    return (
                      <button
                        key={partKey}
                        type="button"
                        onClick={() => selectZone(partKey)}
                        className={`si-zone-btn${isSelected ? ' on' : ''}`}
                      >
                        <div className="si-zone-top">
                          <span className="si-zone-name">{getBodyPartLabel(partKey)}</span>
                          <span className="dot" style={{ width: 8, height: 8, background: dotColor }} />
                        </div>
                        <div
                          className="si-zone-state"
                          style={{
                            color:
                              st.severity === 'severe'
                                ? '#f2b4a0'
                                : st.severity === 'minor'
                                ? '#f0c264'
                                : undefined
                          }}
                        >
                          {injs.length === 0 ? 'В порядке' : getBodyPartStatusText(injs)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* COLUMN 2: Selected Body Part Treatment + Systemic Medicines */}
            <section className="panel si-col">
              <div className="si-col-head">
                <div style={{ minWidth: 0 }}>
                  <div className="cn si-col-title">{getBodyPartLabel(selectedPart)}</div>
                  <div className="si-col-sub" title={currentPartSensation?.description || 'Ничего не беспокоит'}>
                    {currentPartSensation?.description || 'Без повреждений, неприятных ощущений нет'}
                  </div>
                </div>
                <span
                  className="si-col-meta"
                  style={{
                    fontWeight: 600,
                    color: currentInjuries.some(i => !i.treated)
                      ? '#f2b4a0'
                      : currentInjuries.length > 0
                      ? '#f0c264'
                      : '#9ac985'
                  }}
                >
                  {currentInjuries.length === 0 ? 'Не повреждено' : getBodyPartStatusText(currentInjuries)}
                </span>
              </div>

              <div className={`si-mid-top${currentInjuries.length > 0 ? ' scroll' : ''}`}>
                {currentInjuries.length === 0 ? (
                  <div className="si-healthy-box">
                    <div className="si-healthy-row">
                      <ShieldCheck size={20} strokeWidth={1.8} color="#9ac985" style={{ flex: 'none', marginTop: 1 }} />
                      <div style={{ minWidth: 0 }}>
                        <div className="si-healthy-title">Видимых повреждений и боли нет</div>
                        <div className="si-healthy-sub">
                          Кожа чистая, движения свободные и безболезненные
                        </div>
                      </div>
                    </div>

                    {otherInjuredParts.length > 0 && (
                      <div className="si-other-parts">
                        <div className="si-other-lbl">Беспокоит боль в других областях</div>
                        <div className="si-other-btns">
                          {otherInjuredParts.map(pk => {
                            const hasUntr = getPartInjuries(pk).some(i => !i.treated);
                            return (
                              <button
                                key={pk}
                                type="button"
                                onClick={() => selectZone(pk)}
                                className={`btn btn-xs ${hasUntr ? 'btn-danger' : 'btn-s'}`}
                              >
                                {getBodyPartLabel(pk)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  currentInjuries.map(injury => {
                    const compatibleEntries = getCompatibleItemsForInjury(injury);
                    const isSelected = selectedInjuryId === injury.id;
                    return (
                      <div
                        key={injury.id}
                        onClick={() => setSelectedInjuryId(injury.id)}
                        className={`si-injury${injury.treated ? ' is-treated' : ''}${isSelected ? ' on' : ''}`}
                      >
                        <div className="si-injury-top">
                          <div className="si-injury-name">
                            {injury.treated ? (
                              <CheckCircle2 size={16} strokeWidth={1.8} color="#9ac985" style={{ flex: 'none' }} />
                            ) : (
                              <AlertTriangle size={16} strokeWidth={1.8} color="#f2b4a0" style={{ flex: 'none' }} />
                            )}
                            <span>{getInjuryHumanName(injury)}</span>
                          </div>
                          <span
                            className="si-injury-sev"
                            style={{ color: injury.treated ? '#9ac985' : '#f2b4a0' }}
                          >
                            {getInjurySeverityLabel(injury)}
                          </span>
                        </div>

                        <div className="si-injury-desc">{getInjurySensoryFeeling(injury)}</div>

                        {!injury.treated && (
                          <div className="si-injury-meds" onClick={e => e.stopPropagation()}>
                            <div className="si-injury-meds-lbl">Подходящие средства при себе</div>
                            {compatibleEntries.length === 0 ? (
                              <div style={{ fontSize: 12.5, color: '#f2b4a0' }}>
                                Нет подходящего бинта, шины или мази
                              </div>
                            ) : (
                              compatibleEntries.map(entry => {
                                const isSealedPack =
                                  Boolean(entry.item.singleUseContainer) && !entry.item.isOpen;
                                return (
                                  <div
                                    key={`${entry.source}_${entry.idx}_${entry.item.itemId}`}
                                    className="si-med-row"
                                  >
                                    <div className="si-med-l">
                                      <ItemIconCanvas itemId={entry.item.itemId} item={entry.item} size={24} />
                                      <div style={{ minWidth: 0 }}>
                                        <div className="si-med-name">{entry.item.nameRu}</div>
                                        <div className="si-med-where">{formatItemWhere(entry)}</div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleUseEntry(entry, injury.id)}
                                      className="btn btn-p btn-xs"
                                    >
                                      {isSealedPack ? 'Вскрыть' : 'Обработать'}
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Systemic Medicines Strip */}
              <div className="si-med-section">
                <div className="si-subhead">
                  <span className="cn si-subhead-t">Лекарства при себе</span>
                  <span className="si-col-meta">{systemicMedEntries.length}</span>
                </div>

                <div className={`si-med-list${systemicMedEntries.length > 0 ? ' scroll' : ''}`}>
                  {systemicMedEntries.length === 0 ? (
                    <div className="si-med-empty">
                      С собой нет таблеток, капель, нашатыря или аптечки
                    </div>
                  ) : (
                    systemicMedEntries.map(entry => {
                      const info = SYSTEMIC_MED_INFO[entry.medId] || {
                        roleRu: 'Лекарственное средство',
                        actionLabel: 'Принять'
                      };
                      const isSealedPack =
                        Boolean(entry.item.singleUseContainer) && !entry.item.isOpen;
                      return (
                        <div
                          key={`sys_${entry.source}_${entry.idx}_${entry.item.itemId}`}
                          className="si-med-row"
                        >
                          <div className="si-med-l">
                            <ItemIconCanvas itemId={entry.item.itemId} item={entry.item} size={24} />
                            <div style={{ minWidth: 0 }}>
                              <div className="si-med-name">{entry.item.nameRu}</div>
                              <div className="si-med-where">
                                {formatItemWhere(entry)} · {info.roleRu}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUseEntry(entry)}
                            className="btn btn-s btn-xs"
                          >
                            {isSealedPack ? 'Вскрыть' : info.actionLabel}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* COLUMN 3: Full Natural Sensations & Active Medications */}
            <section className="panel si-col">
              <div className="si-col-head">
                <span className="cn si-col-title">Что я чувствую</span>
                <span className="si-col-meta">
                  {detailed.activeSymptoms.length > 0 ? `${detailed.activeSymptoms.length} симпт.` : 'Спокойно'}
                </span>
              </div>

              <div className={`si-sense-body${hasExtraSensoryList ? ' scroll' : ''}`}>
                {/* Acute symptoms list when present */}
                {detailed.activeSymptoms.map(sym => {
                  const isDanger = sym.severity === 'danger';
                  const toneColor = isDanger ? '#f2b4a0' : '#f0c264';
                  return (
                    <div key={sym.id} className={`si-sym-card${isDanger ? ' is-danger' : ''}`}>
                      <div className="si-sym-head" style={{ color: toneColor }}>
                        {sym.iconType === 'leg' && <AlertCircle size={15} strokeWidth={1.8} style={{ flex: 'none' }} />}
                        {sym.iconType === 'drop' && <Droplet size={15} strokeWidth={1.8} style={{ flex: 'none' }} />}
                        {sym.iconType === 'cold' && <Thermometer size={15} strokeWidth={1.8} style={{ flex: 'none' }} />}
                        {sym.iconType === 'wet' && <CloudRain size={15} strokeWidth={1.8} style={{ flex: 'none' }} />}
                        {sym.iconType === 'pain' && <Zap size={15} strokeWidth={1.8} style={{ flex: 'none' }} />}
                        {sym.iconType === 'energy' && <BatteryLow size={15} strokeWidth={1.8} style={{ flex: 'none' }} />}
                        {sym.iconType === 'heart' && <Heart size={15} strokeWidth={1.8} style={{ flex: 'none' }} />}
                        {sym.iconType === 'pill' && <Pill size={15} strokeWidth={1.8} style={{ flex: 'none' }} />}
                        {sym.iconType === 'cough' && <AlertCircle size={15} strokeWidth={1.8} style={{ flex: 'none' }} />}
                        <span>{cleanSensoryText(sym.label)}</span>
                      </div>
                      <div className="si-sym-desc">{cleanSensoryText(sym.description)}</div>
                    </div>
                  );
                })}

                {/* Core 4 natural sensory cards — full readable text, zero truncation */}
                <div className={`si-sense-card ${painTone}`}>
                  <div className="si-sense-head">
                    <span>Общее состояние</span>
                    <Zap size={14} strokeWidth={1.8} color={painTone === 'is-bad' ? '#f2b4a0' : '#a29e93'} />
                  </div>
                  <div className={`si-sense-title ${painTone}`}>{getPainAndStateTitle()}</div>
                  <div className="si-sense-sub">{cleanSensoryText(getPainAndStateSub())}</div>
                </div>

                <div className={`si-sense-card ${heartTone}`}>
                  <div className="si-sense-head">
                    <span>Сердце и дыхание</span>
                    <Activity size={14} strokeWidth={1.8} color={heartTone === 'is-bad' ? '#f2b4a0' : '#a29e93'} />
                  </div>
                  <div className={`si-sense-title ${heartTone}`}>{getHeartAndBreathTitle()}</div>
                  <div className="si-sense-sub">{cleanSensoryText(getHeartAndBreathSub())}</div>
                </div>

                <div className={`si-sense-card ${thermalTone}`}>
                  <div className="si-sense-head">
                    <span>Тепло и одежда</span>
                    <Thermometer
                      size={14}
                      strokeWidth={1.8}
                      color={thermalTone === 'is-cold' ? '#a5d3ff' : thermalTone === 'is-bad' ? '#f2b4a0' : '#a29e93'}
                    />
                  </div>
                  <div className={`si-sense-title ${thermalTone}`}>{getThermalTitle()}</div>
                  <div className="si-sense-sub">{cleanSensoryText(getThermalSub())}</div>
                </div>

                <div className={`si-sense-card ${needsTone}`}>
                  <div className="si-sense-head">
                    <span>Силы, голод и жажда</span>
                    <Utensils size={14} strokeWidth={1.8} color={needsTone === 'is-bad' ? '#f2b4a0' : '#a29e93'} />
                  </div>
                  <div className={`si-sense-title ${needsTone}`}>{getEnergyAndNeedsTitle()}</div>
                  <div className="si-sense-sub">{cleanSensoryText(getEnergyAndNeedsSub())}</div>
                </div>

                {/* Active medication effects when active */}
                {activeMeds.length > 0 && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 6,
                        borderTop: '1px solid rgba(255,255,255,.08)'
                      }}
                    >
                      <span className="cn si-subhead-t">Действие лекарств</span>
                      <span className="si-col-meta">{activeMeds.length}</span>
                    </div>
                    {activeMeds.map(med => {
                      const phaseOrder = ['absorption', 'peak', 'action', 'decay'];
                      const phaseIdx = phaseOrder.indexOf(med.phase);
                      const feelingDesc =
                        med.phase === 'absorption'
                          ? 'Только принято — усваивается, эффект ещё слабый'
                          : med.phase === 'peak'
                          ? 'Начинает действовать — боль и неприятные ощущения отступают'
                          : med.phase === 'action'
                          ? 'Действует в полную силу — боль заметно притуплена'
                          : 'Действие постепенно проходит — ощущения возвращаются';

                      return (
                        <div key={med.id} className="si-sense-card">
                          <div className="si-sym-head" style={{ color: '#fff' }}>
                            <Pill size={14} strokeWidth={1.8} color="#e0ab45" style={{ flex: 'none' }} />
                            <span>{med.nameRu}</span>
                          </div>
                          <div className="si-sense-sub">{feelingDesc}</div>
                          <div className="si-phases">
                            {phaseOrder.map((p, idx) => (
                              <div
                                key={p}
                                className={`si-phase${idx < phaseIdx ? ' done' : idx === phaseIdx ? ' active' : ''}`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {activeMeds.length === 0 && (
                <div className="si-active-meds-bar">
                  <span>Активных препаратов в организме нет</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>0</span>
                </div>
              )}
            </section>
          </div>

          {/* Bottom Keyboard Hints (auto-hidden on touch via menuCompact.css) */}
          <div className="hint">
            <div className="hint-g">
              <span className="key">ЛКМ</span>
              <span>Осмотреть область</span>
              <span className="key">C</span>
              <span className="key" style={{ marginLeft: 0 }}>Esc</span>
              <span>Закрыть</span>
            </div>
            <div>{statusLabel}</div>
          </div>
        </div>
      </div>
    </ShadowHost>
  );
};

export const SelfInspectionModal: React.FC<SelfInspectionModalProps> = ({
  isOpen,
  onClose,
  player
}) => {
  if (!isOpen || !player || !player.bodyState) return null;
  return <SelfInspectionContent player={player} onClose={onClose} />;
};

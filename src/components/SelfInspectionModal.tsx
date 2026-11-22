import React, { useState, useEffect } from 'react';
import { Player, BodyPartsMap, Injury, InventoryItem } from '../types';
import { getDetailedBodySensations, getBodyPartLabel, getBodyPartStatusText } from '../sensations';
import { useItemOnPlayer, useHandItemOnPlayer } from '../items';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ModalShell, Key, Seg } from './gameUi';
import { sound } from '../audio';
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
  CheckCircle2
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
    const strokeW = isSelected ? 2.2 : 1.35;
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
      viewBox="0 0 200 310"
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

type NarrowPane = 'body' | 'treatment' | 'sensations';

export const SelfInspectionModal: React.FC<SelfInspectionModalProps> = ({
  isOpen,
  onClose,
  player
}) => {
  const [selectedPart, setSelectedPart] = useState<keyof BodyPartsMap>('torso');
  const [selectedInjuryId, setSelectedInjuryId] = useState<string | null>(null);
  const [narrowPane, setNarrowPane] = useState<NarrowPane>('body');
  const [, setTick] = useState(0);

  // Focus injured body part automatically when opening
  useEffect(() => {
    if (!isOpen || !player?.bodyState) return;
    const parts = player.bodyState.bodyParts;
    const getInjList = (k: keyof BodyPartsMap): Injury[] => {
      const raw = parts[k];
      return Array.isArray(raw) ? raw : ((raw as any)?.injuries || []);
    };

    const currentInjs = getInjList(selectedPart);
    if (currentInjs.some(i => !i.treated)) return;

    const untreatedPart = BODY_ZONES.find(k => getInjList(k).some(i => !i.treated));
    if (untreatedPart) {
      setSelectedPart(untreatedPart);
      setSelectedInjuryId(null);
      return;
    }

    const anyInjuredPart = BODY_ZONES.find(k => getInjList(k).length > 0);
    if (anyInjuredPart) {
      setSelectedPart(anyInjuredPart);
      setSelectedInjuryId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => {
      setTick(t => t + 1);
    }, 800);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !player || !player.bodyState) return null;

  const bs = player.bodyState;
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
    if (item.fluidStorage) {
      if ((item.fluidStorage.currentMl ?? 0) <= 0) return null;
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

  const collectAvailableMedEntries = (): AvailableMedEntry[] => {
    const list: AvailableMedEntry[] = [];
    if (player.leftHandItem) {
      const medId = getEffectiveMedId(player.leftHandItem);
      if (medId) list.push({ source: 'leftHand', idx: -1, item: player.leftHandItem, medId });
    }
    if (player.rightHandItem) {
      const medId = getEffectiveMedId(player.rightHandItem);
      if (medId) list.push({ source: 'rightHand', idx: -2, item: player.rightHandItem, medId });
    }
    if (player.inventory) {
      player.inventory.forEach((item, idx) => {
        if (!item) return;
        const medId = getEffectiveMedId(item);
        if (medId) list.push({ source: 'inventory', idx, item, medId });
      });
    }
    return list;
  };

  const allMedEntries = collectAvailableMedEntries();

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

  // Qualitative real-life sensations (no telemetry numbers/percentages)
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

  const selectZone = (part: keyof BodyPartsMap) => {
    setSelectedPart(part);
    setSelectedInjuryId(null);
  };

  return (
    <ModalShell
      id="self-inspection-modal"
      title="Самоосмотр"
      subtitle="Внешний осмотр тела, собственные ощущения и перевязка"
      width={1080}
      tall
      onClose={onClose}
      headRight={
        <div className="gu-row" style={{ gap: 12 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color:
                totalUntreatedCount > 0
                  ? '#efa690'
                  : allBodyInjuries.length > 0
                  ? '#f0c264'
                  : '#9ac985'
            }}
          >
            {totalUntreatedCount > 0
              ? 'Есть необработанные раны'
              : allBodyInjuries.length > 0
              ? 'Раны перевязаны и заживают'
              : 'Цел и невредим'}
          </span>
          <Key>C</Key>
        </div>
      }
      footerHints={[
        ['Клик по силуэту', 'Осмотреть область'],
        ['C / Esc', 'Закрыть']
      ]}
      footerRight={
        <button type="button" onClick={onClose} className="gu-btn gu-btn-s gu-btn-sm">
          Закрыть
        </button>
      }
    >
      {/* 1. TOP SENSORY BAR (4 compact perception blocks, fixed height, no scroll) */}
      <div className="gu-inspect-vitals">
        <div className="gu-inspect-vital">
          <div className="gu-inspect-vital-top">
            <span>Общее состояние</span>
            <Zap size={15} strokeWidth={1.75} color={painTone === 'is-bad' ? '#efa690' : '#a29e93'} />
          </div>
          <div className={`gu-inspect-vital-title ${painTone}`} title={getPainAndStateTitle()}>
            {getPainAndStateTitle()}
          </div>
          <div className="gu-inspect-vital-sub" title={getPainAndStateSub()}>
            {getPainAndStateSub()}
          </div>
        </div>

        <div className="gu-inspect-vital">
          <div className="gu-inspect-vital-top">
            <span>Сердце и дыхание</span>
            <Activity size={15} strokeWidth={1.75} color={heartTone === 'is-bad' ? '#efa690' : '#a29e93'} />
          </div>
          <div className={`gu-inspect-vital-title ${heartTone}`} title={getHeartAndBreathTitle()}>
            {getHeartAndBreathTitle()}
          </div>
          <div className="gu-inspect-vital-sub" title={getHeartAndBreathSub()}>
            {getHeartAndBreathSub()}
          </div>
        </div>

        <div className="gu-inspect-vital">
          <div className="gu-inspect-vital-top">
            <span>Тепло и одежда</span>
            <Thermometer
              size={15}
              strokeWidth={1.75}
              color={thermalTone === 'is-cold' ? '#93c5fd' : thermalTone === 'is-bad' ? '#efa690' : '#a29e93'}
            />
          </div>
          <div className={`gu-inspect-vital-title ${thermalTone}`} title={getThermalTitle()}>
            {getThermalTitle()}
          </div>
          <div className="gu-inspect-vital-sub" title={getThermalSub()}>
            {getThermalSub()}
          </div>
        </div>

        <div className="gu-inspect-vital">
          <div className="gu-inspect-vital-top">
            <span>Силы, голод и жажда</span>
            <Utensils size={15} strokeWidth={1.75} color={needsTone === 'is-bad' ? '#efa690' : '#a29e93'} />
          </div>
          <div className={`gu-inspect-vital-title ${needsTone}`} title={getEnergyAndNeedsTitle()}>
            {getEnergyAndNeedsTitle()}
          </div>
          <div className="gu-inspect-vital-sub" title={getEnergyAndNeedsSub()}>
            {getEnergyAndNeedsSub()}
          </div>
        </div>
      </div>

      {/* Narrow-screen view switcher (prevents column clipping below 900px width) */}
      <div className="gu-inspect-tabs-narrow">
        <Seg
          full
          value={narrowPane}
          onChange={setNarrowPane}
          options={[
            { v: 'body', label: 'Тело' },
            { v: 'treatment', label: `Помощь · ${getBodyPartLabel(selectedPart)}` },
            { v: 'sensations', label: 'Ощущения' }
          ]}
        />
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE (fits 100% inside modal; ONLY explicit lists scroll) */}
      <div className="gu-inspect-grid">
        {/* COLUMN 1: Body Silhouette & 6 Zone Selectors — NEVER scrolls */}
        <div className={`gu-inspect-col ${narrowPane !== 'body' ? 'is-narrow-hidden' : ''}`}>
          <div className="gu-inspect-col-head">
            <span className="gu-inspect-col-title">Осмотр тела</span>
            <span className="gu-inspect-col-meta">6 областей</span>
          </div>

          <div className="gu-inspect-figure-stage">
            <AnatomyFigureSvg
              selectedPart={selectedPart}
              onSelectPart={part => {
                selectZone(part);
              }}
              getZoneStyle={getZoneStyle}
            />
          </div>

          <div className="gu-inspect-zone-list">
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
                  className={`gu-inspect-zone-btn ${isSelected ? 'on' : ''}`}
                >
                  <div className="gu-inspect-zone-top">
                    <span className="gu-inspect-zone-name">{getBodyPartLabel(partKey)}</span>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: dotColor,
                        flex: 'none'
                      }}
                    />
                  </div>
                  <div
                    className="gu-inspect-zone-state"
                    style={{
                      color:
                        st.severity === 'severe'
                          ? '#efa690'
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

        {/* COLUMN 2: Selected Body Part Injuries & Systemic Medicines */}
        <div className={`gu-inspect-col ${narrowPane !== 'treatment' ? 'is-narrow-hidden' : ''}`}>
          <div className="gu-inspect-col-head">
            <div style={{ minWidth: 0 }}>
              <div className="gu-inspect-col-title">{getBodyPartLabel(selectedPart)}</div>
              <div className="gu-inspect-col-sub" title={currentPartSensation?.description || 'Ничего не беспокоит'}>
                {currentPartSensation?.description || 'Ничего не беспокоит'}
              </div>
            </div>
            <div className="gu-inspect-col-meta">
              <span
                style={{
                  color: currentInjuries.some(i => !i.treated)
                    ? '#efa690'
                    : currentInjuries.length > 0
                    ? '#f0c264'
                    : '#9ac985',
                  fontWeight: 600
                }}
              >
                {currentInjuries.length === 0 ? 'Не повреждено' : getBodyPartStatusText(currentInjuries)}
              </span>
            </div>
          </div>

          {/* Section 2A: Injuries list */}
          <div className="gu-inspect-section is-grow">
            {currentInjuries.length === 0 ? (
              <div className="gu-card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                <div className="gu-row" style={{ gap: 10 }}>
                  <ShieldCheck size={18} strokeWidth={1.75} color="#9ac985" style={{ flex: 'none' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gu-ink)' }}>
                      Видимых повреждений и боли нет
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gu-mut)', marginTop: 2 }}>
                      Кожа чистая, движения свободные и безболезненные
                    </div>
                  </div>
                </div>

                {otherInjuredParts.length > 0 && (
                  <div
                    style={{
                      paddingTop: 8,
                      borderTop: '1px solid var(--gu-line)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#f0c264', fontWeight: 600 }}>
                      Беспокоит боль в других областях
                    </div>
                    <div className="gu-row gu-wrap" style={{ gap: 6 }}>
                      {otherInjuredParts.map(pk => {
                        const hasUntr = getPartInjuries(pk).some(i => !i.treated);
                        return (
                          <button
                            key={pk}
                            type="button"
                            onClick={() => selectZone(pk)}
                            className={`gu-btn gu-btn-xs ${hasUntr ? 'gu-btn-danger' : 'gu-btn-s'}`}
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
              <div className="gu-inspect-list-scroll">
                {currentInjuries.map(injury => {
                  const compatibleEntries = getCompatibleItemsForInjury(injury);
                  const isSelected = selectedInjuryId === injury.id;

                  return (
                    <div
                      key={injury.id}
                      onClick={() => setSelectedInjuryId(injury.id)}
                      className={`gu-inspect-injury ${isSelected ? 'on' : ''}`}
                    >
                      <div className="gu-row-between">
                        <div className="gu-row" style={{ gap: 8, minWidth: 0 }}>
                          {injury.treated ? (
                            <CheckCircle2 size={16} strokeWidth={1.75} color="#9ac985" style={{ flex: 'none' }} />
                          ) : (
                            <AlertTriangle size={16} strokeWidth={1.75} color="#efa690" style={{ flex: 'none' }} />
                          )}
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {getInjuryHumanName(injury)}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: injury.treated ? '#9ac985' : '#efa690',
                            whiteSpace: 'nowrap',
                            flex: 'none'
                          }}
                        >
                          {getInjurySeverityLabel(injury)}
                        </span>
                      </div>

                      <div style={{ fontSize: 12.5, color: 'var(--gu-ink-dim)', lineHeight: 1.4 }}>
                        {getInjurySensoryFeeling(injury)}
                      </div>

                      {!injury.treated && (
                        <div
                          style={{
                            paddingTop: 8,
                            borderTop: '1px solid var(--gu-line)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div style={{ fontSize: 12, color: 'var(--gu-mut)' }}>
                            Подходящие средства при себе
                          </div>
                          {compatibleEntries.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#efa690' }}>
                              Нет подходящего бинта, шины или мази
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {compatibleEntries.map(entry => {
                                const isSealedPack =
                                  Boolean(entry.item.singleUseContainer) && !entry.item.isOpen;
                                return (
                                  <div
                                    key={`${entry.source}_${entry.idx}_${entry.item.itemId}`}
                                    className="gu-inspect-med-row"
                                  >
                                    <div className="gu-row" style={{ gap: 8, minWidth: 0 }}>
                                      <ItemIconCanvas
                                        itemId={entry.item.itemId}
                                        item={entry.item}
                                        size={24}
                                      />
                                      <div style={{ minWidth: 0 }}>
                                        <div
                                          style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: '#fff',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}
                                        >
                                          {entry.item.nameRu}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--gu-mut)' }}>
                                          {formatItemWhere(entry)}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleUseEntry(entry, injury.id)}
                                      className="gu-btn gu-btn-p gu-btn-xs"
                                    >
                                      {isSealedPack ? 'Вскрыть' : 'Обработать'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2B: Systemic medicines on person (list scrolls only when populated) */}
          <div
            className={`gu-inspect-section gu-inspect-section-div ${
              systemicMedEntries.length > 0 ? 'is-half' : 'is-fixed'
            }`}
          >
            <div className="gu-row-between" style={{ flex: 'none' }}>
              <span className="gu-inspect-col-title" style={{ fontSize: 14 }}>
                Лекарства при себе
              </span>
              <span className="gu-inspect-col-meta">{systemicMedEntries.length}</span>
            </div>

            {systemicMedEntries.length === 0 ? (
              <div className="gu-card-sm" style={{ fontSize: 12, color: 'var(--gu-mut)', padding: '8px 12px' }}>
                С собой нет таблеток, капель, нашатыря или аптечки
              </div>
            ) : (
              <div className="gu-inspect-list-scroll" style={{ gap: 6 }}>
                {systemicMedEntries.map(entry => {
                  const info = SYSTEMIC_MED_INFO[entry.medId] || {
                    roleRu: 'Лекарственное средство',
                    actionLabel: 'Принять'
                  };
                  const isSealedPack =
                    Boolean(entry.item.singleUseContainer) && !entry.item.isOpen;
                  return (
                    <div
                      key={`sys_${entry.source}_${entry.idx}_${entry.item.itemId}`}
                      className="gu-inspect-med-row"
                    >
                      <div className="gu-row" style={{ gap: 8, minWidth: 0 }}>
                        <ItemIconCanvas
                          itemId={entry.item.itemId}
                          item={entry.item}
                          size={24}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {entry.item.nameRu}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--gu-mut)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {formatItemWhere(entry)} · {info.roleRu}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUseEntry(entry)}
                        className="gu-btn gu-btn-s gu-btn-xs"
                      >
                        {isSealedPack ? 'Вскрыть' : info.actionLabel}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: Active Sensations & Active Medications */}
        <div className={`gu-inspect-col ${narrowPane !== 'sensations' ? 'is-narrow-hidden' : ''}`}>
          <div className="gu-inspect-col-head">
            <span className="gu-inspect-col-title">Что я чувствую</span>
            <span className="gu-inspect-col-meta">
              {detailed.activeSymptoms.length > 0 ? `${detailed.activeSymptoms.length}` : 'Спокойно'}
            </span>
          </div>

          {/* Section 3A: Active symptoms list */}
          <div className="gu-inspect-section is-grow">
            {detailed.activeSymptoms.length === 0 ? (
              <div className="gu-card-sm" style={{ fontSize: 12.5, lineHeight: 1.45, padding: 12 }}>
                <div style={{ fontWeight: 600, color: '#9ac985', marginBottom: 4 }}>
                  {cleanSensoryText(detailed.healthText)}
                </div>
                <div style={{ color: 'var(--gu-ink-dim)' }}>
                  {cleanSensoryText(detailed.comfortText)}. {cleanSensoryText(detailed.temperatureText)}.
                </div>
              </div>
            ) : (
              <div className="gu-inspect-list-scroll" style={{ gap: 6 }}>
                {detailed.activeSymptoms.map(sym => {
                  const isDanger = sym.severity === 'danger';
                  const toneColor = isDanger ? '#efa690' : '#f0c264';
                  return (
                    <div
                      key={sym.id}
                      className="gu-card-sm"
                      style={{
                        padding: '8px 12px',
                        borderColor: isDanger
                          ? 'rgba(217, 116, 90, 0.42)'
                          : 'rgba(201, 146, 43, 0.32)',
                        flex: 'none'
                      }}
                    >
                      <div
                        className="gu-row"
                        style={{ gap: 6, fontSize: 13, fontWeight: 600, color: toneColor, marginBottom: 2 }}
                      >
                        {sym.iconType === 'leg' && <AlertCircle size={14} strokeWidth={1.75} style={{ flex: 'none' }} />}
                        {sym.iconType === 'drop' && <Droplet size={14} strokeWidth={1.75} style={{ flex: 'none' }} />}
                        {sym.iconType === 'cold' && <Thermometer size={14} strokeWidth={1.75} style={{ flex: 'none' }} />}
                        {sym.iconType === 'wet' && <CloudRain size={14} strokeWidth={1.75} style={{ flex: 'none' }} />}
                        {sym.iconType === 'pain' && <Zap size={14} strokeWidth={1.75} style={{ flex: 'none' }} />}
                        {sym.iconType === 'energy' && <BatteryLow size={14} strokeWidth={1.75} style={{ flex: 'none' }} />}
                        {sym.iconType === 'heart' && <Heart size={14} strokeWidth={1.75} style={{ flex: 'none' }} />}
                        {sym.iconType === 'pill' && <Pill size={14} strokeWidth={1.75} style={{ flex: 'none' }} />}
                        {sym.iconType === 'cough' && <AlertCircle size={14} strokeWidth={1.75} style={{ flex: 'none' }} />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cleanSensoryText(sym.label)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gu-ink-dim)', lineHeight: 1.4 }}>
                        {cleanSensoryText(sym.description)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3B: Effect of taken medicines */}
          <div
            className={`gu-inspect-section gu-inspect-section-div ${
              activeMeds.length > 0 ? 'is-half' : 'is-fixed'
            }`}
          >
            <div className="gu-row-between" style={{ flex: 'none' }}>
              <span className="gu-inspect-col-title" style={{ fontSize: 14 }}>
                Действие лекарств
              </span>
              <span className="gu-inspect-col-meta">{activeMeds.length}</span>
            </div>

            {activeMeds.length === 0 ? (
              <div className="gu-card-sm" style={{ fontSize: 12, color: 'var(--gu-mut)', padding: '8px 12px' }}>
                Активных препаратов в организме нет
              </div>
            ) : (
              <div className="gu-inspect-list-scroll" style={{ gap: 6 }}>
                {activeMeds.map(med => {
                  const phaseOrder = ['absorption', 'peak', 'action', 'decay'];
                  const phaseIdx = phaseOrder.indexOf(med.phase);
                  const feelingDesc =
                    med.phase === 'absorption'
                      ? 'Только принято — лекарство усваивается, эффект ещё слабый'
                      : med.phase === 'peak'
                      ? 'Начинает действовать — боль и неприятные ощущения отступают'
                      : med.phase === 'action'
                      ? 'Действует в полную силу — боль заметно притуплена'
                      : 'Действие постепенно проходит — ощущения возвращаются';

                  return (
                    <div key={med.id} className="gu-card-sm" style={{ padding: '8px 12px', flex: 'none' }}>
                      <div className="gu-row" style={{ gap: 6, fontSize: 13, fontWeight: 600, color: '#fff' }}>
                        <Pill size={14} strokeWidth={1.75} color="#e0ab45" style={{ flex: 'none' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {med.nameRu}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gu-ink-dim)', marginTop: 4, lineHeight: 1.35 }}>
                        {feelingDesc}
                      </div>
                      <div className="gu-inspect-phases">
                        {phaseOrder.map((p, idx) => (
                          <div
                            key={p}
                            className={`gu-inspect-phase ${
                              idx < phaseIdx ? 'done' : idx === phaseIdx ? 'active' : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

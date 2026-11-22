import React, { useState, useEffect } from 'react';
import { Player, BodyPartsMap, Injury, InventoryItem } from '../types';
import { getDetailedBodySensations, getBodyPartLabel, getBodyPartStatusText } from '../sensations';
import { useItemOnPlayer, useHandItemOnPlayer } from '../items';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ModalShell, Key } from './gameUi';
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
 * Clean human silhouette without any text, numbers, letters, or artificial badges on the body.
 * Visualizes actual physical state on each limb: bleeding wound streaks, fracture lines,
 * bruise/burn shading, or wrapped bandage strips when treated.
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

        {/* Visual physical signs directly on the body part (no text or number badges) */}
        {st.count > 0 && (
          <g transform={`translate(${c.x}, ${c.y})`} style={{ pointerEvents: 'none' }}>
            {/* Wrapped bandage / splint strips when treated */}
            {st.allTreated && (
              <g stroke="rgba(233, 230, 223, 0.7)" strokeWidth="2.2" strokeLinecap="round">
                <line x1="-8" y1="-4" x2="8" y2="-1" />
                <line x1="-8" y1="1" x2="8" y2="4" />
                <line x1="-7" y1="5" x2="7" y2="2" />
              </g>
            )}

            {/* Untreated bone fracture line */}
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

            {/* Active bleeding cut & blood drops */}
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

            {/* Untreated bruise / burn / sprain soft contusion spot */}
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
    <svg viewBox="0 0 200 310" style={{ width: '100%', height: '100%', maxHeight: 224 }}>
      {/* 1. HEAD & NECK */}
      {renderZonePart(
        'head',
        'M100 13 C88 13 82 22 83 34 C83.5 42 87 49 92 52 L92 58 L108 58 L108 52 C113 49 116.5 42 117 34 C118 22 112 13 100 13 Z'
      )}

      {/* 2. TORSO */}
      {renderZonePart(
        'torso',
        'M75 61 L92 58 L108 58 L125 61 C131 63 133 70 131 82 L126 124 L124 152 C124 158 117 162 108 162 L100 164 L92 162 C83 162 76 158 76 152 L74 124 L69 82 C67 70 69 63 75 61 Z'
      )}

      {/* 3. LEFT ARM */}
      {renderZonePart(
        'leftArm',
        'M72 62 C63 64 57 71 54 83 L47 115 L39 148 L35 164 C34 169 38 173 43 171 L49 162 L59 122 L67 90 L72 62 Z'
      )}

      {/* 4. RIGHT ARM */}
      {renderZonePart(
        'rightArm',
        'M128 62 C137 64 143 71 146 83 L153 115 L161 148 L165 164 C166 169 162 173 157 171 L151 162 L141 122 L133 90 L128 62 Z'
      )}

      {/* 5. LEFT LEG */}
      {renderZonePart(
        'leftLeg',
        'M76 158 L97 163 L93 218 L89 274 L91 291 C91 295 85 297 76 297 C71 297 69 293 72 288 L76 274 L75 218 L76 158 Z'
      )}

      {/* 6. RIGHT LEG */}
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
  medkit: { roleRu: 'Перевязка ран и обезболивающее', actionLabel: 'Использовать' },
  painkillers: { roleRu: 'Притупляет острую и ноющую боль', actionLabel: 'Выпить таблетку' },
  pill_painkiller_single: { roleRu: 'Притупляет боль', actionLabel: 'Выпить таблетку' },
  pill_antipyretic_single: { roleRu: 'Сбивает жар и ломоту', actionLabel: 'Выпить таблетку' },
  morphine: { roleRu: 'Сильное обезболивающее при тяжёлых травмах', actionLabel: 'Применить' },
  ammonia_spirit: { roleRu: 'Приводит в чувство при шоке и дурноте', actionLabel: 'Вдохнуть' },
  balm_star: { roleRu: 'Проясняет голову, снимает тошноту и дремоту', actionLabel: 'Намазать виски' },
  activated_charcoal: { roleRu: 'Помогает при тошноте и тяжести в животе', actionLabel: 'Принять' },
  pill_charcoal_single: { roleRu: 'Помогает при тошноте и отравлении', actionLabel: 'Выпить таблетку' },
  valerian_drops: { roleRu: 'Успокаивает нервы и унимает дрожь', actionLabel: 'Выпить капли' },
  vitamins: { roleRu: 'Поддерживает силы и бодрость', actionLabel: 'Принять' },
  pill_vitamin_single: { roleRu: 'Поддерживает тонус организма', actionLabel: 'Принять драже' }
};

export const SelfInspectionModal: React.FC<SelfInspectionModalProps> = ({
  isOpen,
  onClose,
  player
}) => {
  const [selectedPart, setSelectedPart] = useState<keyof BodyPartsMap>('torso');
  const [selectedInjuryId, setSelectedInjuryId] = useState<string | null>(null);
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
        fill: 'rgba(229, 72, 77, 0.34)',
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
        fill: 'rgba(224, 171, 69, 0.28)',
        stroke: '#e0ab45',
        severity: 'minor',
        hasBurn: injuries.some(i => i.type === 'burn' && !i.treated),
        allTreated: false,
        count: injuries.length
      };
    }

    return {
      fill: 'rgba(201, 146, 43, 0.2)',
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
      if (injury.type === 'fracture') return 'Конечность зафиксирована шиной. Острая боль при движении ушла, остался глухой ноющий фон';
      if (injury.type === 'bleeding') return 'Рана стянута повязкой, кровь больше не течёт';
      if (injury.type === 'burn') return 'Обожжённая кожа покрыта мазью и защищена, жжение стихло';
      return 'Место травмы обработано и перевязано, постепенно заживает';
    }
    switch (injury.type) {
      case 'fracture':
        return 'Резкая пронзительная боль при малейшей нагрузке или движении. Нужна шина для фиксации';
      case 'bleeding':
        return 'Кровь сочится наружу, рана пульсирует. Нужно промыть перекисью и туго перевязать бинтом';
      case 'burn': {
        const deg = injury.burnDegree || 1;
        if (deg >= 2) return 'На коже вздулись волдыри, печёт и дёргает от любого касания. Нужен Пантенол или бальзам «Спасатель»';
        return 'Кожа покраснела и сильно печёт. Поможет охлаждающий спрей, мазь или пластырь';
      }
      case 'sprain':
        return 'Сустав распух, при повороте стреляет резкой болью. Поможет обезболивающий гель или тугая повязка';
      case 'bruise':
        return 'Тёмный кровоподтёк, тупо ноет при прикосновении. Можно помазать гелем, мазью или йодной сеткой';
      case 'abrasion':
        return 'Кожа содрана, щиплет и саднит. Стоит обработать антисептиком и заклеить пластырем';
      default:
        return 'Болезненное место, требует обработки';
    }
  };

  const getInjurySeverityLabel = (injury: Injury) => {
    if (injury.treated) return 'Перевязано / обработано';
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

  const getCompatibleItemsForInjury = (injury: Injury): AvailableMedEntry[] => {
    return allMedEntries.filter(entry => isCompatibleWithInjury(entry.medId, injury));
  };

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
    if (entry.source === 'leftHand') return 'В левой руке';
    if (entry.source === 'rightHand') return 'В правой руке';
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

  // Qualitative real-life sensations (NO numbers, NO percentages, NO telemetry units)
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

  // 1. Overall state & pain feeling
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

  // 2. Heartbeat & breathing feeling
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

  // 3. Thermal & clothing feeling
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

  // 4. Hunger, thirst & fatigue feeling
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

  // Strip any "(XX%)" or "(XX.X°C)" from symptom descriptions so everything reads naturally
  const cleanSensoryText = (str: string) =>
    str.replace(/\s*\(\d+(\.\d+)?(%|°C)\)/g, '');

  return (
    <ModalShell
      id="self-inspection-modal"
      title="Самоосмотр"
      subtitle="Внешний осмотр тела, собственные ощущения и перевязка"
      width={1080}
      tall
      onClose={onClose}
      headRight={
        <div className="gu-row" style={{ gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--gu-mut)' }}>
            {totalUntreatedCount > 0 ? (
              <span style={{ color: '#efa690', fontWeight: 600 }}>
                Есть необработанные раны
              </span>
            ) : allBodyInjuries.length > 0 ? (
              <span style={{ color: '#f0c264', fontWeight: 600 }}>
                Раны перевязаны и заживают
              </span>
            ) : (
              <span style={{ color: '#9ac985', fontWeight: 600 }}>
                Цел и невредим
              </span>
            )}
          </span>
          <Key>C</Key>
        </div>
      }
      footerHints={[
        ['Клик по силуэту', 'Осмотреть часть тела'],
        ['C / Esc', 'Закрыть']
      ]}
      footerRight={
        <button type="button" onClick={onClose} className="gu-btn gu-btn-s gu-btn-sm">
          Закрыть
        </button>
      }
    >
      {/* 1. TOP SENSORY BAR (4 natural perception cards — no numbers, no percentages, no medical gauges) */}
      <div
        className="gu-inspect-vitals"
        style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
      >
        {/* Sensation 1: Pain & General Feeling */}
        <div className="gu-inspect-vital">
          <div className="gu-inspect-vital-top">
            <span>Общее состояние и боль</span>
            <Zap
              className="w-3.5 h-3.5"
              style={{ color: effectivePain > 35 || hp < 35 ? '#efa690' : '#9ac985' }}
            />
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: effectivePain > 35 || hp < 35 ? '#efa690' : '#fff',
              lineHeight: 1.2
            }}
          >
            {getPainAndStateTitle()}
          </div>
          <div className="gu-inspect-vital-sub" title={getPainAndStateSub()}>
            {getPainAndStateSub()}
          </div>
        </div>

        {/* Sensation 2: Heartbeat & Breathing */}
        <div className="gu-inspect-vital">
          <div className="gu-inspect-vital-top">
            <span>Сердце и дыхание</span>
            <Activity
              className="w-3.5 h-3.5"
              style={{ color: coLevel > 15 || pulse > 110 || panic > 40 ? '#efa690' : '#e0ab45' }}
            />
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: coLevel > 25 || panic > 55 ? '#efa690' : '#fff',
              lineHeight: 1.2
            }}
          >
            {getHeartAndBreathTitle()}
          </div>
          <div className="gu-inspect-vital-sub" title={getHeartAndBreathSub()}>
            {getHeartAndBreathSub()}
          </div>
        </div>

        {/* Sensation 3: Warmth & Clothing */}
        <div className="gu-inspect-vital">
          <div className="gu-inspect-vital-top">
            <span>Тепло и одежда</span>
            <Thermometer
              className="w-3.5 h-3.5"
              style={{
                color:
                  temp < 35.8 || wetness > 50
                    ? '#7dd3fc'
                    : temp > 37.5
                    ? '#efa690'
                    : '#9ac985'
              }}
            />
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color:
                temp < 35.8 || wetness > 55
                  ? '#7dd3fc'
                  : temp > 37.5
                  ? '#efa690'
                  : '#fff',
              lineHeight: 1.2
            }}
          >
            {getThermalTitle()}
          </div>
          <div className="gu-inspect-vital-sub" title={getThermalSub()}>
            {getThermalSub()}
          </div>
        </div>

        {/* Sensation 4: Strength, Hunger & Thirst */}
        <div className="gu-inspect-vital">
          <div className="gu-inspect-vital-top">
            <span>Силы, голод и жажда</span>
            <Utensils
              className="w-3.5 h-3.5"
              style={{
                color:
                  hunger < 30 || thirst < 30 || energy < 25 ? '#efa690' : '#e0ab45'
              }}
            />
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color:
                hunger < 25 || thirst < 25 || energy < 20 ? '#efa690' : '#fff',
              lineHeight: 1.2
            }}
          >
            {getEnergyAndNeedsTitle()}
          </div>
          <div className="gu-inspect-vital-sub" title={getEnergyAndNeedsSub()}>
            {getEnergyAndNeedsSub()}
          </div>
        </div>
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE */}
      <div className="gu-inspect-grid">
        {/* COLUMN 1: Visual Body Silhouette */}
        <div className="gu-inspect-col">
          <div className="gu-inspect-col-head">
            <span className="gu-inspect-col-title">Осмотр тела</span>
            <span className="gu-inspect-col-meta">выберите область</span>
          </div>

          <div className="gu-inspect-figure-stage">
            <AnatomyFigureSvg
              selectedPart={selectedPart}
              onSelectPart={part => {
                setSelectedPart(part);
                setSelectedInjuryId(null);
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
                  onClick={() => {
                    setSelectedPart(partKey);
                    setSelectedInjuryId(null);
                  }}
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
                          : 'var(--gu-mut)'
                    }}
                  >
                    {injs.length === 0 ? 'В порядке' : getBodyPartStatusText(injs)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: Selected Body Part Inspection & Treatment */}
        <div className="gu-inspect-col">
          <div className="gu-inspect-col-head">
            <div style={{ minWidth: 0 }}>
              <div className="gu-inspect-col-title">
                {getBodyPartLabel(selectedPart)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gu-mut)', marginTop: 2 }}>
                {currentPartSensation?.description || 'Ничего не беспокоит'}
              </div>
            </div>
            <div className="gu-inspect-col-meta" style={{ textAlign: 'right' }}>
              <span
                style={{
                  color:
                    currentInjuries.some(i => !i.treated)
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

          <div className="gu-inspect-list-scroll">
            {currentInjuries.length === 0 ? (
              <div
                className="gu-card-sm"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: '14px 16px'
                }}
              >
                <div className="gu-row" style={{ gap: 10, color: '#9ac985' }}>
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#e9e6df' }}>
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
                      paddingTop: 10,
                      borderTop: '1px solid var(--gu-line)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: '#f0c264', fontWeight: 600 }}>
                      Беспокоит боль в других местах:
                    </div>
                    <div className="gu-row" style={{ flexWrap: 'wrap', gap: 6 }}>
                      {otherInjuredParts.map(pk => {
                        const pInjs = getPartInjuries(pk);
                        const hasUntr = pInjs.some(i => !i.treated);
                        return (
                          <button
                            key={pk}
                            type="button"
                            onClick={() => {
                              setSelectedPart(pk);
                              setSelectedInjuryId(null);
                            }}
                            className={`gu-btn gu-btn-xs ${hasUntr ? 'gu-btn-danger' : 'gu-btn-s'}`}
                          >
                            <span>Осмотреть: {getBodyPartLabel(pk)}</span>
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
                    className={`gu-inspect-injury ${isSelected ? 'on' : ''}`}
                  >
                    <div className="gu-row-between">
                      <div className="gu-row" style={{ gap: 8, minWidth: 0 }}>
                        {injury.treated ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#9ac985' }} />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#efa690' }} />
                        )}
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>
                          {getInjuryHumanName(injury)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: injury.treated ? '#9ac985' : '#efa690',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {getInjurySeverityLabel(injury)}
                      </span>
                    </div>

                    <div style={{ fontSize: 12.5, color: 'var(--gu-ink-dim)', lineHeight: 1.45 }}>
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
                        <div style={{ fontSize: 11.5, color: 'var(--gu-mut)' }}>
                          Чем можно обработать из того, что с собой:
                        </div>
                        {compatibleEntries.length === 0 ? (
                          <div style={{ fontSize: 12, color: '#efa690' }}>
                            При себе нет подходящего бинта, шины или мази
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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
                                      size={26}
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
                                    {isSealedPack ? 'Вскрыть упаковку' : 'Обработать'}
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
              })
            )}

            {/* General medicines in pockets/hands */}
            <div
              style={{
                marginTop: 4,
                paddingTop: 10,
                borderTop: '1px solid var(--gu-line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div className="gu-row-between">
                <span className="gu-inspect-col-title" style={{ fontSize: 14 }}>
                  Лекарства и средства при себе
                </span>
              </div>

              {systemicMedEntries.length === 0 ? (
                <div className="gu-card-sm" style={{ fontSize: 12, color: 'var(--gu-mut)' }}>
                  С собой нет таблеток, капель, нашатыря или аптечки
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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
                            size={26}
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
        </div>

        {/* COLUMN 3: What I Feel (Sensations & Effect of Taken Medicines without timers/numbers) */}
        <div className="gu-inspect-col">
          <div className="gu-inspect-col-head">
            <span className="gu-inspect-col-title">Что я чувствую</span>
            <span className="gu-inspect-col-meta">ощущения</span>
          </div>

          <div className="gu-inspect-list-scroll">
            {/* Active sensations list */}
            {detailed.activeSymptoms.length === 0 ? (
              <div className="gu-card-sm" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 600, color: '#9ac985', marginBottom: 4 }}>
                  {cleanSensoryText(detailed.healthText)}
                </div>
                <div style={{ color: 'var(--gu-ink-dim)' }}>
                  {cleanSensoryText(detailed.comfortText)}. {cleanSensoryText(detailed.temperatureText)}.
                </div>
              </div>
            ) : (
              detailed.activeSymptoms.map(sym => {
                const isDanger = sym.severity === 'danger';
                return (
                  <div
                    key={sym.id}
                    className="gu-card-sm"
                    style={{
                      padding: '9px 11px',
                      borderColor: isDanger
                        ? 'rgba(217, 116, 90, 0.45)'
                        : 'rgba(201, 146, 43, 0.35)'
                    }}
                  >
                    <div className="gu-row-between" style={{ marginBottom: 3 }}>
                      <span
                        className="gu-row"
                        style={{
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          color: isDanger ? '#efa690' : '#f0c264'
                        }}
                      >
                        {sym.iconType === 'leg' && <AlertCircle className="w-3.5 h-3.5" />}
                        {sym.iconType === 'drop' && <Droplet className="w-3.5 h-3.5" />}
                        {sym.iconType === 'cold' && <Thermometer className="w-3.5 h-3.5" />}
                        {sym.iconType === 'wet' && <CloudRain className="w-3.5 h-3.5" />}
                        {sym.iconType === 'pain' && <Zap className="w-3.5 h-3.5" />}
                        {sym.iconType === 'energy' && <BatteryLow className="w-3.5 h-3.5" />}
                        {sym.iconType === 'heart' && <Heart className="w-3.5 h-3.5" />}
                        {sym.iconType === 'pill' && <Pill className="w-3.5 h-3.5" />}
                        {sym.iconType === 'cough' && <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{cleanSensoryText(sym.label)}</span>
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gu-ink-dim)', lineHeight: 1.4 }}>
                      {cleanSensoryText(sym.description)}
                    </div>
                  </div>
                );
              })
            )}

            {/* Qualitative ощущения от принятых лекарств (без таймеров и процентов) */}
            <div className="gu-inspect-col-head" style={{ marginTop: 6 }}>
              <span className="gu-inspect-col-title">Действие принятых лекарств</span>
            </div>

            {activeMeds.length === 0 ? (
              <div className="gu-card-sm" style={{ fontSize: 12, color: 'var(--gu-mut)' }}>
                Вы не принимали никаких лекарств в последнее время
              </div>
            ) : (
              activeMeds.map(med => {
                const phaseOrder = ['absorption', 'peak', 'action', 'decay'];
                const phaseIdx = phaseOrder.indexOf(med.phase);
                const feelingDesc =
                  med.phase === 'absorption'
                    ? 'Недавно принято — лекарство только усваивается, эффект ещё слабый'
                    : med.phase === 'peak'
                    ? 'Лекарство начинает действовать — боль и неприятные ощущения отступают'
                    : med.phase === 'action'
                    ? 'Действует в полную силу — боль заметно притуплена, стало легче'
                    : 'Действие постепенно проходит — прежние ощущения возвращаются';

                return (
                  <div key={med.id} className="gu-card-sm" style={{ padding: '9px 11px' }}>
                    <div className="gu-row" style={{ gap: 6, fontSize: 13, fontWeight: 600, color: '#fff' }}>
                      <Pill className="w-3.5 h-3.5" style={{ color: '#e0ab45' }} />
                      <span>{med.nameRu}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gu-ink-dim)', marginTop: 4, lineHeight: 1.4 }}>
                      {feelingDesc}
                    </div>
                    <div className="gu-inspect-phases" style={{ marginTop: 6 }}>
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
              })
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

import React, { useState, useEffect } from 'react';
import { Player, BodyPartsMap, Injury, InventoryItem } from '../types';
import { getBodyPartLabel, getBodyPartStatusText } from '../sensations';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ModalShell } from './gameUi';
import { AnatomyFigureSvg, AnatomyZoneStyle } from './SelfInspectionModal';
import { ShieldCheck, Heart, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LimbTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  itemIndex: number;
  targetItem: InventoryItem | null;
  onApplyTreatment: (itemIndex: number, injuryId: string) => void;
}

const BODY_ZONES: (keyof BodyPartsMap)[] = [
  'head',
  'torso',
  'leftArm',
  'rightArm',
  'leftLeg',
  'rightLeg'
];

export const LimbTreatmentModal: React.FC<LimbTreatmentModalProps> = ({
  isOpen,
  onClose,
  player,
  itemIndex,
  targetItem,
  onApplyTreatment
}) => {
  const [selectedPart, setSelectedPart] = useState<keyof BodyPartsMap>('torso');
  const [selectedInjuryId, setSelectedInjuryId] = useState<string | null>(null);

  const isInjuryCompatible = (injury: Injury): boolean => {
    if (!targetItem || injury.treated) return false;

    const itemId =
      targetItem.fluidStorage?.attributes?.medicalEffectId ||
      targetItem.originalCatalogId ||
      (targetItem.contents && targetItem.contents[0]?.itemId) ||
      targetItem.itemId;

    if (itemId === 'splint') return injury.type === 'fracture';
    if (itemId === 'panthenol' || itemId === 'panthenol_spray' || itemId === 'panthenol_foam') {
      return injury.type === 'burn' || injury.type === 'abrasion';
    }
    if (itemId === 'spasatel_ointment') {
      return injury.type === 'burn' || injury.type === 'abrasion' || injury.type === 'bruise';
    }
    if (itemId === 'zelenka') {
      return injury.type === 'abrasion' || injury.type === 'bleeding' || injury.type === 'bruise' || injury.type === 'burn';
    }
    if (itemId === 'iodine') {
      return injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'sprain';
    }
    if (itemId === 'diclofenac_gel') {
      return injury.type === 'sprain' || injury.type === 'bruise' || injury.type === 'fracture';
    }
    if (itemId === 'hydrogen_peroxide') {
      return injury.type === 'bleeding' || injury.type === 'abrasion';
    }
    if (itemId === 'bandage') {
      return injury.type === 'bleeding' || injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'burn' || injury.type === 'sprain';
    }
    if (itemId === 'medical_patch' || itemId === 'patch_bactericidal_single') {
      return injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'burn';
    }
    if (itemId === 'antiseptic') {
      return injury.type === 'abrasion' || injury.type === 'bleeding' || injury.type === 'bruise' || injury.type === 'burn';
    }
    return !injury.treated;
  };

  useEffect(() => {
    if (!isOpen || !player?.bodyState || !targetItem) return;
    const bs = player.bodyState;
    for (const partKey of BODY_ZONES) {
      const partRaw = bs.bodyParts[partKey];
      const injuries: Injury[] = Array.isArray(partRaw) ? partRaw : ((partRaw as any)?.injuries || []);
      const firstComp = injuries.find(i => isInjuryCompatible(i));
      if (firstComp) {
        setSelectedPart(partKey);
        setSelectedInjuryId(firstComp.id);
        return;
      }
    }
  }, [isOpen, targetItem]);

  if (!isOpen || !player || !player.bodyState || !targetItem) return null;

  const bs = player.bodyState;

  const getPartInjuries = (partKey: keyof BodyPartsMap): Injury[] => {
    const raw = bs.bodyParts[partKey];
    return Array.isArray(raw) ? raw : ((raw as any)?.injuries || []);
  };

  const allCompatibleInjuries: { partKey: keyof BodyPartsMap; injury: Injury }[] = [];
  for (const partKey of BODY_ZONES) {
    const injuries = getPartInjuries(partKey);
    for (const inj of injuries) {
      if (isInjuryCompatible(inj)) {
        allCompatibleInjuries.push({ partKey, injury: inj });
      }
    }
  }

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
    const hasComp = injuries.some(i => isInjuryCompatible(i));
    if (hasComp) {
      return {
        fill: 'rgba(229, 72, 77, 0.34)',
        stroke: '#e5484d',
        severity: 'severe',
        hasFracture: injuries.some(i => i.type === 'fracture' && !i.treated),
        hasBleeding: injuries.some(i => i.type === 'bleeding' && !i.treated),
        hasBurn: injuries.some(i => i.type === 'burn' && !i.treated),
        count: injuries.length
      };
    }
    if (injuries.some(i => !i.treated)) {
      return {
        fill: 'rgba(224, 171, 69, 0.25)',
        stroke: '#e0ab45',
        severity: 'minor',
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

  const currentInjuries = getPartInjuries(selectedPart);

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

  const getInjurySensoryDesc = (injury: Injury) => {
    if (injury.treated) return 'Рана уже обработана и перевязана';
    switch (injury.type) {
      case 'fracture': return 'Острая пронзительная боль при движении, требуется фиксация шиной';
      case 'bleeding': return 'Из раны течёт кровь, нужно промыть и туго перевязать';
      case 'burn': return 'Кожа горит и печёт, требуется мазь или повязка от ожогов';
      case 'sprain': return 'Сустав опух и болит при повороте';
      case 'bruise': return 'Кровоподтёк, тупая боль при нажатии';
      case 'abrasion': return 'Кожа содрана и щиплет';
      default: return 'Требуется обработка';
    }
  };

  const handleConfirmApply = () => {
    if (selectedInjuryId && itemIndex >= 0) {
      onApplyTreatment(itemIndex, selectedInjuryId);
      onClose();
    }
  };

  return (
    <ModalShell
      id="limb-treatment-modal"
      title={`Обработка: ${targetItem.nameRu}`}
      subtitle="Выберите повреждённую часть тела и рану"
      width={820}
      onClose={onClose}
      headRight={
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: '#0d0e10',
            border: '1px solid var(--gu-line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ItemIconCanvas itemId={targetItem.itemId} item={targetItem} size={28} />
        </div>
      }
      footerHints={[['Клик', 'Выбрать рану'], ['Esc', 'Отмена']]}
      footerRight={
        <button
          type="button"
          disabled={!selectedInjuryId}
          onClick={handleConfirmApply}
          className="gu-btn gu-btn-p gu-btn-sm"
        >
          <Heart className="w-4 h-4" />
          <span>
            {selectedInjuryId
              ? `Применить ${targetItem.nameRu}`
              : 'Выберите рану'}
          </span>
        </button>
      }
    >
      <div className="gu-limb-split">
        {/* LEFT: Body Silhouette */}
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
                const firstComp = getPartInjuries(part).find(i => isInjuryCompatible(i));
                setSelectedInjuryId(firstComp ? firstComp.id : null);
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
                    const firstComp = getPartInjuries(partKey).find(i => isInjuryCompatible(i));
                    setSelectedInjuryId(firstComp ? firstComp.id : null);
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
                  <div className="gu-inspect-zone-state">
                    {injs.length === 0 ? 'В порядке' : getBodyPartStatusText(injs)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Injury Selection */}
        <div className="gu-inspect-col">
          <div className="gu-inspect-col-head">
            <span className="gu-inspect-col-title">{getBodyPartLabel(selectedPart)}</span>
          </div>

          {allCompatibleInjuries.length === 0 ? (
            <div className="gu-note gu-warn" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <div style={{ fontWeight: 700 }}>Нет подходящих ран</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  На теле нет необработанных повреждений, для которых подходит «{targetItem.nameRu}»
                </div>
              </div>
            </div>
          ) : currentInjuries.length === 0 ? (
            <div className="gu-note gu-ok" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>Здесь повреждений нет. Выберите травмированную часть тела на силуэте</span>
            </div>
          ) : (
            <div className="gu-inspect-list-scroll">
              {currentInjuries.map(injury => {
                const compatible = isInjuryCompatible(injury);
                const isSelected = selectedInjuryId === injury.id;

                return (
                  <div
                    key={injury.id}
                    onClick={() => {
                      if (compatible) setSelectedInjuryId(injury.id);
                    }}
                    className={`gu-inspect-injury ${isSelected ? 'on' : ''}`}
                    style={{
                      cursor: compatible ? 'pointer' : 'not-allowed',
                      opacity: compatible ? 1 : 0.48
                    }}
                  >
                    <div className="gu-row-between">
                      <div className="gu-row" style={{ gap: 8 }}>
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
                          color: injury.treated
                            ? '#9ac985'
                            : compatible
                            ? '#f0c264'
                            : 'var(--gu-mut)'
                        }}
                      >
                        {injury.treated
                          ? 'Уже обработано'
                          : compatible
                          ? 'Можно обработать'
                          : 'Не подходит'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gu-ink-dim)' }}>
                      {getInjurySensoryDesc(injury)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

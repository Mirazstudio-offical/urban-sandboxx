import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Player, BodyPartsMap, Injury, InventoryItem } from '../types';
import { getBodyPartLabel, getBodyPartStatusText } from '../sensations';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { AnatomyFigureSvg, AnatomyZoneStyle } from './SelfInspectionModal';
import selfInspectionCss from './selfInspection.css?inline';
import { ShieldCheck, Heart, AlertTriangle, CheckCircle2, X } from 'lucide-react';

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

const LimbTreatmentModalContent: React.FC<{
  onClose: () => void;
  player: Player;
  itemIndex: number;
  targetItem: InventoryItem;
  onApplyTreatment: (itemIndex: number, injuryId: string) => void;
}> = ({ onClose, player, itemIndex, targetItem, onApplyTreatment }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const gmRef = useRef<HTMLDivElement>(null);
  const [selectedPart, setSelectedPart] = useState<keyof BodyPartsMap>('torso');
  const [selectedInjuryId, setSelectedInjuryId] = useState<string | null>(null);

  useLayoutEffect(() => attachStageFit(() => wrapRef.current, () => gmRef.current), []);
  useTopmostEscape(onClose);

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
    if (!player?.bodyState || !targetItem) return;
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
  }, [targetItem]);

  const bs = player.bodyState!;

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
    if (selectedInjuryId) {
      onApplyTreatment(itemIndex, selectedInjuryId);
      onClose();
    }
  };

  return (
    <ShadowHost zIndex={120} css={selfInspectionCss}>
      <div id="w" ref={wrapRef}>
        <div className="bd" />
        <div className="gm" ref={gmRef} id="limb-treatment-modal">
          <header className="top">
            <div className="top-l">
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 9,
                  background: 'rgba(13, 14, 16, 0.85)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none'
                }}
              >
                <ItemIconCanvas itemId={targetItem.itemId} item={targetItem} size={28} />
              </div>
              <div className="cn ttl">Обработка: {targetItem.nameRu}</div>
              <span className="sub-top">Выберите повреждённую часть тела и рану</span>
            </div>
            <div className="top-r">
              <button
                type="button"
                disabled={!selectedInjuryId}
                onClick={handleConfirmApply}
                className="btn btn-p"
              >
                <Heart width={16} height={16} />
                <span>
                  {selectedInjuryId ? `Применить ${targetItem.nameRu}` : 'Выберите рану'}
                </span>
              </button>
              <button
                type="button"
                className="chip back"
                onClick={onClose}
                aria-label="Закрыть"
                title="Закрыть (Esc)"
              >
                <X width={19} height={19} />
              </button>
            </div>
          </header>

          <main
            className="si-body"
            style={{ gridTemplateColumns: '420px minmax(0, 1fr)' }}
          >
            {/* LEFT: Body Silhouette + 6 Stacked Zones */}
            <section className="panel si-col">
              <div className="si-col-head">
                <div>
                  <div className="si-col-title">Осмотр тела</div>
                  <div className="si-col-sub">Выберите область с необработанной травмой</div>
                </div>
                <span className="si-col-meta">6 областей</span>
              </div>

              <div className="si-body-split">
                <div className="si-figure">
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
                        onClick={() => {
                          setSelectedPart(partKey);
                          const firstComp = getPartInjuries(partKey).find(i => isInjuryCompatible(i));
                          setSelectedInjuryId(firstComp ? firstComp.id : null);
                        }}
                        className={`si-zone-btn ${isSelected ? 'on' : ''}`}
                      >
                        <div className="si-zone-top">
                          <span className="si-zone-name">{getBodyPartLabel(partKey)}</span>
                          <span
                            className="dot"
                            style={{ background: dotColor }}
                          />
                        </div>
                        <div className="si-zone-state">
                          {injs.length === 0 ? 'В порядке' : getBodyPartStatusText(injs)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* RIGHT: Injury Selection */}
            <section className="panel si-col">
              <div className="si-col-head">
                <div>
                  <div className="si-col-title">{getBodyPartLabel(selectedPart)}</div>
                  <div className="si-col-sub">
                    {itemIndex === -1 ? 'Средство находится в активной руке' : 'Средство находится в карманах'}
                  </div>
                </div>
                <span className="si-col-meta">
                  Подходит для ран: {allCompatibleInjuries.length}
                </span>
              </div>

              <div className="si-mid-top scroll">
                {allCompatibleInjuries.length === 0 ? (
                  <div className="si-healthy-box" style={{ borderColor: 'rgba(224,171,69,0.35)', background: 'rgba(201,146,43,0.08)' }}>
                    <div className="si-healthy-row">
                      <AlertTriangle width={20} height={20} color="#e0ab45" style={{ flex: 'none' }} />
                      <div>
                        <div className="si-healthy-title">Нет подходящих ран</div>
                        <div className="si-healthy-sub">
                          На теле нет необработанных повреждений, для которых подходит «{targetItem.nameRu}»
                        </div>
                      </div>
                    </div>
                  </div>
                ) : currentInjuries.length === 0 ? (
                  <div className="si-healthy-box">
                    <div className="si-healthy-row">
                      <ShieldCheck width={20} height={20} color="#9ac985" style={{ flex: 'none' }} />
                      <div>
                        <div className="si-healthy-title">Здесь повреждений нет</div>
                        <div className="si-healthy-sub">
                          Выберите травмированную часть тела на силуэте или перейдите к одной из ран ниже
                        </div>
                      </div>
                    </div>
                    <div className="si-other-parts">
                      <div className="si-other-lbl">Где требуется обработка:</div>
                      <div className="si-other-btns">
                        {allCompatibleInjuries.map(({ partKey, injury }) => (
                          <button
                            key={injury.id}
                            type="button"
                            className="btn btn-s btn-xs"
                            onClick={() => {
                              setSelectedPart(partKey);
                              setSelectedInjuryId(injury.id);
                            }}
                          >
                            {getBodyPartLabel(partKey)}: {getInjuryHumanName(injury)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  currentInjuries.map(injury => {
                    const compatible = isInjuryCompatible(injury);
                    const isSelected = selectedInjuryId === injury.id;

                    return (
                      <div
                        key={injury.id}
                        onClick={() => {
                          if (compatible) setSelectedInjuryId(injury.id);
                        }}
                        className={
                          'si-injury' +
                          (injury.treated ? ' is-treated' : '') +
                          (isSelected ? ' on' : '')
                        }
                        style={{
                          cursor: compatible ? 'pointer' : 'not-allowed',
                          opacity: compatible ? 1 : 0.48
                        }}
                      >
                        <div className="si-injury-top">
                          <div className="si-injury-name">
                            {injury.treated ? (
                              <CheckCircle2 width={16} height={16} color="#9ac985" style={{ flex: 'none' }} />
                            ) : (
                              <AlertTriangle width={16} height={16} color="#efa690" style={{ flex: 'none' }} />
                            )}
                            <span>{getInjuryHumanName(injury)}</span>
                          </div>
                          {compatible ? (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onApplyTreatment(itemIndex, injury.id);
                                onClose();
                              }}
                              className="btn btn-p btn-xs"
                            >
                              Обработать
                            </button>
                          ) : (
                            <span
                              className="si-injury-sev"
                              style={{ color: injury.treated ? '#9ac985' : '#a29e93' }}
                            >
                              {injury.treated ? 'Уже обработано' : 'Не подходит'}
                            </span>
                          )}
                        </div>
                        <div className="si-injury-desc">{getInjurySensoryDesc(injury)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </main>

          <div className="hint">
            <div className="hint-g">
              <span className="key">Клик</span>
              <span>Выбрать рану</span>
              <span className="key">Esc</span>
              <span>Отмена</span>
            </div>
            <div>Быстрая обработка раны выбранным средством</div>
          </div>
        </div>
      </div>
    </ShadowHost>
  );
};

export const LimbTreatmentModal: React.FC<LimbTreatmentModalProps> = ({
  isOpen,
  onClose,
  player,
  itemIndex,
  targetItem,
  onApplyTreatment
}) => {
  if (!isOpen || !player || !player.bodyState || !targetItem) return null;
  return (
    <LimbTreatmentModalContent
      onClose={onClose}
      player={player}
      itemIndex={itemIndex}
      targetItem={targetItem}
      onApplyTreatment={onApplyTreatment}
    />
  );
};

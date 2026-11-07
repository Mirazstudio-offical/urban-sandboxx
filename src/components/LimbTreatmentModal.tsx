import { ItemIconCanvas } from "./ItemIconCanvas";
import React, { useState } from 'react';
import { Player, BodyPartsMap, Injury, InventoryItem } from '../types';
import { getBodyPartLabel } from '../sensations';
import { ModalShell } from './gameUi';
import { ShieldCheck, Heart, AlertTriangle } from 'lucide-react';

interface LimbTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  itemIndex: number;
  targetItem: InventoryItem | null;
  onApplyTreatment: (itemIndex: number, injuryId: string) => void;
}

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

  if (!isOpen || !player || !player.bodyState || !targetItem) return null;

  const bs = player.bodyState;

  // Determine injury compatibility based on item
  const isInjuryCompatible = (injury: Injury) => {
    if (injury.treated) return false;

    const itemId = targetItem.itemId;
    if (itemId === 'splint') {
      return injury.type === 'fracture';
    }
    if (itemId === 'panthenol_spray') {
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
    if (itemId === 'medical_patch') {
      return injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'burn';
    }
    if (itemId === 'antiseptic') {
      return injury.type === 'abrasion' || injury.type === 'bleeding' || injury.type === 'bruise' || injury.type === 'burn';
    }
    // Default medical item
    return !injury.treated;
  };

  // Find all compatible injuries across the whole body
  const allCompatibleInjuries: { partKey: keyof BodyPartsMap; injury: Injury }[] = [];
  for (const partKey of ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'] as (keyof BodyPartsMap)[]) {
    const partRaw = bs.bodyParts[partKey];
    const injuries: Injury[] = Array.isArray(partRaw) ? partRaw : ((partRaw as any)?.injuries || []);
    for (const inj of injuries) {
      if (isInjuryCompatible(inj)) {
        allCompatibleInjuries.push({ partKey, injury: inj });
      }
    }
  }

  const getPartColor = (partKey: keyof BodyPartsMap) => {
    const part = bs.bodyParts[partKey];
    const injuries = Array.isArray(part) ? part : ((part as any)?.injuries || []);
    if (!injuries || injuries.length === 0) return { fill: '#059669', stroke: '#10b981' };
    if (injuries.some(i => isInjuryCompatible(i))) return { fill: '#dc2626', stroke: '#ef4444' };
    if (injuries.some(i => !i.treated)) return { fill: '#d97706', stroke: '#f59e0b' };
    return { fill: '#059669', stroke: '#10b981' };
  };

  const currentPartRaw = bs.bodyParts[selectedPart];
  const currentInjuries: Injury[] = Array.isArray(currentPartRaw) ? currentPartRaw : ((currentPartRaw as any)?.injuries || []);

  const getInjuryTypeName = (type: string) => {
    switch (type) {
      case 'bruise': return 'Глубокий ушиб';
      case 'sprain': return 'Растяжение связок';
      case 'fracture': return 'Перелом кости';
      case 'bleeding': return 'Открытое кровотечение';
      case 'abrasion': return 'Ссадина и рана';
      case 'burn': return 'Термический ожог';
      default: return type;
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
      title={`Медпомощь: ${targetItem.nameRu}`}
      subtitle="Выберите конечность и конкретную травму для применения средства"
      width={780}
      onClose={onClose}
      headRight={
        <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--gu-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ItemIconCanvas itemId={targetItem.itemId} item={targetItem} size={28} />
        </div>
      }
      footerHints={[['Клик', 'Выбрать травму'], ['Esc', 'Отмена']]}
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
              : 'Выберите травму'}
          </span>
        </button>
      }
    >
      <div className="gu-limb-split">
        {/* LEFT: Body Silhouette */}
        <div className="gu-card" style={{ alignItems: 'center' }}>
          <div className="gu-sec" style={{ width: '100%', marginTop: 0 }}>
            <span>Карта конечностей</span>
            <span className="gu-sec-sub">клик по зоне</span>
          </div>

          <div className="relative w-40 h-60 flex items-center justify-center my-1">
            <svg viewBox="0 0 100 160" className="w-full h-full drop-shadow-md">
              <circle
                cx="50" cy="18" r="12"
                fill={getPartColor('head').fill}
                stroke={selectedPart === "head" ? "#e0ab45" : getPartColor('head').stroke}
                strokeWidth={selectedPart === "head" ? "2.5" : "1.5"}
                className="cursor-pointer transition-all hover:opacity-80"
                onClick={() => { setSelectedPart('head'); setSelectedInjuryId(null); }}
              />
              <rect
                x="36" y="34" width="28" height="46" rx="6"
                fill={getPartColor('torso').fill}
                stroke={selectedPart === "torso" ? "#e0ab45" : getPartColor('torso').stroke}
                strokeWidth={selectedPart === "torso" ? "2.5" : "1.5"}
                className="cursor-pointer transition-all hover:opacity-80"
                onClick={() => { setSelectedPart('torso'); setSelectedInjuryId(null); }}
              />
              <rect
                x="18" y="36" width="14" height="44" rx="5"
                fill={getPartColor('leftArm').fill}
                stroke={selectedPart === "leftArm" ? "#e0ab45" : getPartColor('leftArm').stroke}
                strokeWidth={selectedPart === "leftArm" ? "2.5" : "1.5"}
                className="cursor-pointer transition-all hover:opacity-80"
                onClick={() => { setSelectedPart('leftArm'); setSelectedInjuryId(null); }}
              />
              <rect
                x="68" y="36" width="14" height="44" rx="5"
                fill={getPartColor('rightArm').fill}
                stroke={selectedPart === "rightArm" ? "#e0ab45" : getPartColor('rightArm').stroke}
                strokeWidth={selectedPart === "rightArm" ? "2.5" : "1.5"}
                className="cursor-pointer transition-all hover:opacity-80"
                onClick={() => { setSelectedPart('rightArm'); setSelectedInjuryId(null); }}
              />
              <rect
                x="36" y="84" width="12" height="58" rx="5"
                fill={getPartColor('leftLeg').fill}
                stroke={selectedPart === "leftLeg" ? "#e0ab45" : getPartColor('leftLeg').stroke}
                strokeWidth={selectedPart === "leftLeg" ? "2.5" : "1.5"}
                className="cursor-pointer transition-all hover:opacity-80"
                onClick={() => { setSelectedPart('leftLeg'); setSelectedInjuryId(null); }}
              />
              <rect
                x="52" y="84" width="12" height="58" rx="5"
                fill={getPartColor('rightLeg').fill}
                stroke={selectedPart === "rightLeg" ? "#e0ab45" : getPartColor('rightLeg').stroke}
                strokeWidth={selectedPart === "rightLeg" ? "2.5" : "1.5"}
                className="cursor-pointer transition-all hover:opacity-80"
                onClick={() => { setSelectedPart('rightLeg'); setSelectedInjuryId(null); }}
              />
            </svg>
          </div>

          <div className="gu-grid gu-g3" style={{ width: '100%', gap: 6 }}>
            {(['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => { setSelectedPart(p); setSelectedInjuryId(null); }}
                className={`gu-btn gu-btn-xs ${selectedPart === p ? 'gu-btn-p' : ''}`}
              >
                {getBodyPartLabel(p)}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Injury Selection */}
        <div className="gu-card" style={{ minHeight: 340, justifyContent: 'flex-start' }}>
          <div className="gu-sec" style={{ marginTop: 0 }}>
            <span>{getBodyPartLabel(selectedPart)}</span>
            <span className="gu-sec-sub">{currentInjuries.length} травм в области</span>
          </div>

          {allCompatibleInjuries.length === 0 ? (
            <div className="gu-note gu-warn" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <div style={{ fontWeight: 700 }}>Нет подходящих травм</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  У вас нет открытых повреждений, совместимых с предметом «{targetItem.nameRu}».
                </div>
              </div>
            </div>
          ) : currentInjuries.length === 0 ? (
            <div className="gu-note gu-ok" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>В этой области травм нет. Выберите другую конечность с повреждением.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {currentInjuries.map(injury => {
                const compatible = isInjuryCompatible(injury);
                const isSelected = selectedInjuryId === injury.id;

                return (
                  <div
                    key={injury.id}
                    onClick={() => {
                      if (compatible) setSelectedInjuryId(injury.id);
                    }}
                    className={`gu-item ${isSelected ? 'on' : ''}`}
                    style={{
                      cursor: compatible ? 'pointer' : 'not-allowed',
                      opacity: compatible ? 1 : 0.5,
                      flexDirection: 'column',
                      alignItems: 'stretch'
                    }}
                  >
                    <div className="gu-row-between">
                      <span className="gu-item-title">{getInjuryTypeName(injury.type)}</span>
                      {injury.treated ? (
                        <span className="gu-tag good">Уже обработано</span>
                      ) : compatible ? (
                        <span className="gu-tag amber">Подходит для обработки</span>
                      ) : (
                        <span className="gu-tag">Не подходит</span>
                      )}
                    </div>
                    <div className="gu-item-sub">
                      {injury.treated ? 'Травма зафиксирована/обработана.' : 'Острая фаза травмы. Требует вмешательства.'}
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

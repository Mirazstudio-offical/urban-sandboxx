import { ItemIconCanvas } from "./ItemIconCanvas";
import React, { useState } from 'react';
import { Player, BodyPartsMap, Injury, InventoryItem } from '../types';
import { getBodyPartLabel, getBodyPartStatusText } from '../sensations';
import { Stethoscope, X, ShieldCheck, Heart, AlertTriangle } from 'lucide-react';

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
    const injuries: Injury[] = Array.isArray(partRaw) ? partRaw : (partRaw?.injuries || []);
    for (const inj of injuries) {
      if (isInjuryCompatible(inj)) {
        allCompatibleInjuries.push({ partKey, injury: inj });
      }
    }
  }

  const getPartColor = (partKey: keyof BodyPartsMap) => {
    const part = bs.bodyParts[partKey];
    const injuries = Array.isArray(part) ? part : (part?.injuries || []);
    if (!injuries || injuries.length === 0) return { fill: '#059669', stroke: '#10b981' };
    if (injuries.some(i => isInjuryCompatible(i))) return { fill: '#dc2626', stroke: '#ef4444' };
    if (injuries.some(i => !i.treated)) return { fill: '#d97706', stroke: '#f59e0b' };
    return { fill: '#059669', stroke: '#10b981' };
  };

  const currentPartRaw = bs.bodyParts[selectedPart];
  const currentInjuries: Injury[] = Array.isArray(currentPartRaw) ? currentPartRaw : (currentPartRaw?.injuries || []);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ItemIconCanvas itemId={targetItem.itemId} size={28} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Оказание точечной медпомощи: {targetItem.nameRu}</span>
              </h2>
              <p className="text-xs text-slate-400">Выберите конечность и конкретную травму для применения средства</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* LEFT: Body Silhouette (5 cols) */}
          <div className="md:col-span-5 bg-slate-950/70 rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-between">
            <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1">
              <span>Карта конечностей</span>
              <span className="text-[10px] text-emerald-400 lowercase">нажмите конечность</span>
            </div>

            {/* Silhouette SVG */}
            <div className="relative w-40 h-64 flex items-center justify-center my-2">
              <svg viewBox="0 0 100 160" className="w-full h-full drop-shadow-md">
                {/* Head */}
                <circle
                  cx="50" cy="18" r="12"
                  fill={getPartColor('head').fill}
                  stroke={selectedPart === "head" ? "#38bdf8" : getPartColor('head').stroke}
                  strokeWidth={selectedPart === "head" ? "2.5" : "1.5"}
                  className="cursor-pointer transition-all hover:opacity-80"
                  onClick={() => { setSelectedPart('head'); setSelectedInjuryId(null); }}
                />
                
                {/* Torso */}
                <rect
                  x="36" y="34" width="28" height="46" rx="6"
                  fill={getPartColor('torso').fill}
                  stroke={selectedPart === "torso" ? "#38bdf8" : getPartColor('torso').stroke}
                  strokeWidth={selectedPart === "torso" ? "2.5" : "1.5"}
                  className="cursor-pointer transition-all hover:opacity-80"
                  onClick={() => { setSelectedPart('torso'); setSelectedInjuryId(null); }}
                />

                {/* Left Arm */}
                <rect
                  x="18" y="36" width="14" height="44" rx="5"
                  fill={getPartColor('leftArm').fill}
                  stroke={selectedPart === "leftArm" ? "#38bdf8" : getPartColor('leftArm').stroke}
                  strokeWidth={selectedPart === "leftArm" ? "2.5" : "1.5"}
                  className="cursor-pointer transition-all hover:opacity-80"
                  onClick={() => { setSelectedPart('leftArm'); setSelectedInjuryId(null); }}
                />

                {/* Right Arm */}
                <rect
                  x="68" y="36" width="14" height="44" rx="5"
                  fill={getPartColor('rightArm').fill}
                  stroke={selectedPart === "rightArm" ? "#38bdf8" : getPartColor('rightArm').stroke}
                  strokeWidth={selectedPart === "rightArm" ? "2.5" : "1.5"}
                  className="cursor-pointer transition-all hover:opacity-80"
                  onClick={() => { setSelectedPart('rightArm'); setSelectedInjuryId(null); }}
                />

                {/* Left Leg */}
                <rect
                  x="36" y="84" width="12" height="58" rx="5"
                  fill={getPartColor('leftLeg').fill}
                  stroke={selectedPart === "leftLeg" ? "#38bdf8" : getPartColor('leftLeg').stroke}
                  strokeWidth={selectedPart === "leftLeg" ? "2.5" : "1.5"}
                  className="cursor-pointer transition-all hover:opacity-80"
                  onClick={() => { setSelectedPart('leftLeg'); setSelectedInjuryId(null); }}
                />

                {/* Right Leg */}
                <rect
                  x="52" y="84" width="12" height="58" rx="5"
                  fill={getPartColor('rightLeg').fill}
                  stroke={selectedPart === "rightLeg" ? "#38bdf8" : getPartColor('rightLeg').stroke}
                  strokeWidth={selectedPart === "rightLeg" ? "2.5" : "1.5"}
                  className="cursor-pointer transition-all hover:opacity-80"
                  onClick={() => { setSelectedPart('rightLeg'); setSelectedInjuryId(null); }}
                />
              </svg>
            </div>

            {/* Limb buttons */}
            <div className="grid grid-cols-3 gap-1 w-full mt-1">
              {(['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => { setSelectedPart(p); setSelectedInjuryId(null); }}
                  className={`px-1.5 py-1 rounded text-[10px] font-bold border transition ${
                    selectedPart === p
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {getBodyPartLabel(p)}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: Injury Selection & Confirmation (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between gap-4">
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sm font-bold text-slate-200">{getBodyPartLabel(selectedPart)}</span>
                <span className="text-xs text-slate-400 font-mono">
                  {currentInjuries.length} травм в области
                </span>
              </div>

              {allCompatibleInjuries.length === 0 ? (
                <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Нет подходящих травм:</span>
                    <p className="mt-0.5 text-amber-200/80">
                      У вас нет открытых повреждений, совместимых с предметом «{targetItem.nameRu}».
                    </p>
                  </div>
                </div>
              ) : currentInjuries.length === 0 ? (
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>В этой области травм нет. Выберите другую конечность с повреждением.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1">
                  {currentInjuries.map(injury => {
                    const compatible = isInjuryCompatible(injury);
                    const isSelected = selectedInjuryId === injury.id;

                    return (
                      <div
                        key={injury.id}
                        onClick={() => {
                          if (compatible) setSelectedInjuryId(injury.id);
                        }}
                        className={`p-3 rounded-xl border transition-all ${
                          !compatible
                            ? 'bg-slate-950/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-sky-950/60 border-sky-400 text-slate-100 ring-2 ring-sky-400/30 cursor-pointer'
                            : 'bg-slate-900/80 border-slate-700 text-slate-200 hover:border-slate-500 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{getInjuryTypeName(injury.type)}</span>
                          {injury.treated ? (
                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-400 rounded">
                              Уже обработано
                            </span>
                          ) : compatible ? (
                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 border border-emerald-600 text-emerald-300 rounded font-semibold">
                              Подходит для обработки
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-500 rounded">
                              Не подходит для {targetItem.nameRu}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {injury.treated ? 'Травма зафиксирована/обработана.' : `Острая фаза травмы. Требует вмешательства.`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="pt-3 border-t border-slate-800">
              <button
                disabled={!selectedInjuryId}
                onClick={handleConfirmApply}
                className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition ${
                  selectedInjuryId
                    ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white border border-emerald-400/40'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Heart className="w-4 h-4" />
                <span>
                  {selectedInjuryId
                    ? `Применить ${targetItem.nameRu} к выбранной травме`
                    : 'Выберите совместимую травму выше'}
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

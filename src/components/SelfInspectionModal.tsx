import React, { useState } from 'react';
import { Player, BodyPartsMap, Injury } from '../types';
import { getDetailedBodySensations, getBodyPartLabel, getBodyPartStatusText } from '../sensations';
import { getMedicationRemainingSeconds } from '../medicineSystem';
import { useItemOnPlayer } from '../items';
import { sound } from '../audio';
import { Activity, Heart, ShieldCheck, Pill, Stethoscope, X } from 'lucide-react';

interface SelfInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

export const SelfInspectionModal: React.FC<SelfInspectionModalProps> = ({
  isOpen,
  onClose,
  player
}) => {
  const [selectedPart, setSelectedPart] = useState<keyof BodyPartsMap>('torso');
  const [selectedInjuryId, setSelectedInjuryId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  if (!isOpen || !player || !player.bodyState) return null;

  const bs = player.bodyState;
  const detailed = getDetailedBodySensations(player);

  const getPartColor = (partKey: keyof BodyPartsMap) => {
    const part = bs.bodyParts[partKey];
    const injuries = Array.isArray(part) ? part : (part?.injuries || []);
    if (!injuries || injuries.length === 0) return { fill: '#059669', stroke: '#10b981', pulse: false };
    if (injuries.some(i => i.type === 'fracture' && !i.treated)) return { fill: '#7f1d1d', stroke: '#ef4444', pulse: true };
    if (injuries.some(i => i.type === 'burn' && !i.treated)) {
      const maxDeg = Math.max(...injuries.filter(i => i.type === 'burn' && !i.treated).map(b => b.burnDegree || 1));
      return maxDeg >= 2 ? { fill: '#991b1b', stroke: '#ef4444', pulse: true } : { fill: '#c2410c', stroke: '#fb923c', pulse: true };
    }
    if (injuries.some(i => i.type === 'bleeding' && !i.treated)) return { fill: '#dc2626', stroke: '#ef4444', pulse: true };
    if (injuries.some(i => i.type === 'sprain' && !i.treated)) return { fill: '#ea580c', stroke: '#f97316', pulse: false };
    if (injuries.some(i => i.type === 'fracture' && i.treated)) return { fill: '#9f1239', stroke: '#fb7185', pulse: false };
    if (injuries.some(i => i.type === 'burn' && i.treated)) return { fill: '#b45309', stroke: '#f59e0b', pulse: false };
    if (injuries.some(i => (i.type === 'bruise' || i.type === 'abrasion') && !i.treated)) return { fill: '#d97706', stroke: '#f59e0b', pulse: false };
    return { fill: '#059669', stroke: '#10b981', pulse: false };
  };

  const getPartBadgeClass = (injuries: Injury[]) => {
    if (!injuries || injuries.length === 0) return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
    if (injuries.some(i => (i.type === 'fracture' || i.type === 'bleeding') && !i.treated)) return 'bg-red-950/95 text-red-200 border-red-600 animate-pulse';
    if (injuries.some(i => i.type === 'burn' && !i.treated)) return 'bg-orange-950/95 text-orange-200 border-orange-600 animate-pulse';
    if (injuries.some(i => i.type === 'sprain' && !i.treated)) return 'bg-orange-950/80 text-orange-300 border-orange-700/60';
    if (injuries.some(i => !i.treated)) return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
    return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
  };

  const getInjuryTypeName = (injury: Injury) => {
    switch (injury.type) {
      case 'bruise': return 'Глубокий ушиб';
      case 'sprain': return 'Растяжение связок';
      case 'fracture': return 'Перелом кости';
      case 'bleeding': return 'Артериальное / венозное кровотечение';
      case 'abrasion': return 'Ссадина и рана';
      case 'burn': {
        const deg = injury.burnDegree || 1;
        return `Термический ожог (${deg}-я степень)`;
      }
      default: return injury.type;
    }
  };

  const currentPartRaw = bs.bodyParts[selectedPart];
  const currentInjuries: Injury[] = Array.isArray(currentPartRaw) ? currentPartRaw : (currentPartRaw?.injuries || []);
  const currentPartPain = !Array.isArray(currentPartRaw) ? (currentPartRaw?.pain ?? 0) : 0;

  // Find med items in inventory
  const findItemIndex = (itemId: string) => {
    return player.inventory?.findIndex(i => i && i.itemId === itemId) ?? -1;
  };

  const bandageIdx = findItemIndex('bandage');
  const splintIdx = findItemIndex('splint');
  const painkillersIdx = findItemIndex('painkillers');
  const medkitIdx = findItemIndex('medkit');

  const handleUseMedItem = (idx: number) => {
    if (idx >= 0) {
      useItemOnPlayer(player, idx, undefined, selectedInjuryId || undefined);
      sound.playUseItem();
    }
  };

  const selectPart = (part: keyof BodyPartsMap) => {
    setSelectedPart(part);
    setSelectedInjuryId(null);
  };

  const activeMeds = bs.activeMedications || [];

  const getCompatibleInventoryItems = (injury: Injury) => {
    if (!player.inventory || injury.treated) return [];
    
    return player.inventory
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (!item) return false;
        const id = item.itemId;
        if (id === 'splint') return injury.type === 'fracture';
        if (id === 'panthenol_spray') return injury.type === 'burn' || injury.type === 'abrasion';
        if (id === 'spasatel_ointment') return injury.type === 'burn' || injury.type === 'abrasion' || injury.type === 'bruise';
        if (id === 'zelenka') return injury.type === 'abrasion' || injury.type === 'bleeding' || injury.type === 'bruise' || injury.type === 'burn';
        if (id === 'iodine') return injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'sprain';
        if (id === 'diclofenac_gel') return injury.type === 'sprain' || injury.type === 'bruise' || injury.type === 'fracture';
        if (id === 'hydrogen_peroxide') return injury.type === 'bleeding' || injury.type === 'abrasion';
        if (id === 'bandage') return injury.type === 'bleeding' || injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'burn' || injury.type === 'sprain';
        if (id === 'medical_patch') return injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'burn';
        if (id === 'antiseptic') return injury.type === 'abrasion' || injury.type === 'bleeding' || injury.type === 'bruise' || injury.type === 'burn';
        return false;
      });
  };

  const handleApplyToInjury = (itemIdx: number, injuryId: string) => {
    useItemOnPlayer(player, itemIdx, undefined, injuryId);
    sound.playUseItem();
    setTick(t => t + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn pointer-events-auto select-none">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Клинический самоосмотр и фармакотерапия</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-xs border border-slate-700">
                  Клавиша C
                </span>
              </h2>
              <p className="text-xs text-slate-400">Анатомическая карта травм, волновой порог боли и мониторинг действия медикаментов</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* LEFT: Interactive Anatomy Silhouette (4 cols) */}
          <div className="md:col-span-4 bg-slate-950/70 rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-between">
            <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1">
              <span>Карта тела</span>
              <span className="text-[10px] text-sky-400 lowercase">кликните конечность</span>
            </div>

            {/* Vector Human Silhouette SVG */}
            <div className="relative w-48 h-72 flex items-center justify-center my-2">
              <svg viewBox="0 0 100 160" className="w-full h-full drop-shadow-md">
                {/* Head */}
                <circle
                  cx="50"
                  cy="18"
                  r="12"
                  fill={getPartColor('head').fill}
                  stroke={selectedPart === "head" ? "#38bdf8" : getPartColor('head').stroke}
                  strokeWidth={selectedPart === "head" ? "2.5" : "1.5"}
                  className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('head').pulse ? 'animate-pulse' : ''}`}
                  onClick={() => selectPart('head')}
                />
                
                {/* Torso */}
                <rect
                  x="36"
                  y="34"
                  width="28"
                  height="46"
                  rx="6"
                  fill={getPartColor('torso').fill}
                  stroke={selectedPart === "torso" ? "#38bdf8" : getPartColor('torso').stroke}
                  strokeWidth={selectedPart === "torso" ? "2.5" : "1.5"}
                  className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('torso').pulse ? 'animate-pulse' : ''}`}
                  onClick={() => selectPart('torso')}
                />

                {/* Left Arm */}
                <rect
                  x="18"
                  y="36"
                  width="14"
                  height="44"
                  rx="5"
                  fill={getPartColor('leftArm').fill}
                  stroke={selectedPart === "leftArm" ? "#38bdf8" : getPartColor('leftArm').stroke}
                  strokeWidth={selectedPart === "leftArm" ? "2.5" : "1.5"}
                  className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('leftArm').pulse ? 'animate-pulse' : ''}`}
                  onClick={() => selectPart('leftArm')}
                />

                {/* Right Arm */}
                <rect
                  x="68"
                  y="36"
                  width="14"
                  height="44"
                  rx="5"
                  fill={getPartColor('rightArm').fill}
                  stroke={selectedPart === "rightArm" ? "#38bdf8" : getPartColor('rightArm').stroke}
                  strokeWidth={selectedPart === "rightArm" ? "2.5" : "1.5"}
                  className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('rightArm').pulse ? 'animate-pulse' : ''}`}
                  onClick={() => selectPart('rightArm')}
                />

                {/* Left Leg */}
                <rect
                  x="36"
                  y="84"
                  width="12"
                  height="58"
                  rx="5"
                  fill={getPartColor('leftLeg').fill}
                  stroke={selectedPart === "leftLeg" ? "#38bdf8" : getPartColor('leftLeg').stroke}
                  strokeWidth={selectedPart === "leftLeg" ? "2.5" : "1.5"}
                  className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('leftLeg').pulse ? 'animate-pulse' : ''}`}
                  onClick={() => selectPart('leftLeg')}
                />

                {/* Right Leg */}
                <rect
                  x="52"
                  y="84"
                  width="12"
                  height="58"
                  rx="5"
                  fill={getPartColor('rightLeg').fill}
                  stroke={selectedPart === "rightLeg" ? "#38bdf8" : getPartColor('rightLeg').stroke}
                  strokeWidth={selectedPart === "rightLeg" ? "2.5" : "1.5"}
                  className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('rightLeg').pulse ? 'animate-pulse' : ''}`}
                  onClick={() => selectPart('rightLeg')}
                />
              </svg>
            </div>

            {/* Quick Limb Selector Buttons */}
            <div className="grid grid-cols-3 gap-1.5 w-full mt-2">
              {(['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => selectPart(p)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
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

          {/* MIDDLE: Selected Part Details & Injuries (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-3">
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between font-bold text-slate-200">
                <span className="text-base">{getBodyPartLabel(selectedPart)}</span>
                <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${getPartBadgeClass(currentInjuries)}`}>
                  {getBodyPartStatusText(currentInjuries)}
                </span>
              </div>
              
              {currentPartPain > 0 && (
                <div className="flex items-center justify-between text-xs text-rose-400/90 font-mono bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-900/40">
                  <span>Локальная боль:</span>
                  <span className="font-bold">{Math.round(currentPartPain)}%</span>
                </div>
              )}

              <div className="text-xs text-slate-400 mt-1 font-medium flex items-center justify-between">
                <span>Список диагностированных травм:</span>
                <span className="text-[10px] text-slate-500">{currentInjuries.length} травм</span>
              </div>

              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {currentInjuries.length === 0 ? (
                  <div className="text-xs text-emerald-400 italic p-3 text-center border border-emerald-900/50 bg-emerald-950/20 rounded-xl flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Ткани и кости в норме. Повреждений нет.</span>
                  </div>
                ) : (
                  currentInjuries.map(injury => (
                    <div 
                      key={injury.id}
                      onClick={() => setSelectedInjuryId(injury.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedInjuryId === injury.id 
                          ? 'bg-sky-900/40 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]' 
                          : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`text-xs font-bold ${injury.treated ? 'text-emerald-400' : (injury.type === 'fracture' || injury.type === 'bleeding' ? 'text-red-300' : injury.type === 'burn' ? 'text-orange-300' : 'text-amber-200')}`}>
                          {getInjuryTypeName(injury)}
                        </div>
                        {injury.treated ? (
                          <div className="text-[9px] px-1.5 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded font-semibold">
                            Обработано
                          </div>
                        ) : (
                          <div className="text-[9px] px-1.5 py-0.5 bg-rose-950 border border-rose-700 text-rose-300 rounded font-semibold animate-pulse">
                            Острая фаза
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                        <span>
                          {!injury.treated 
                            ? (injury.type === 'fracture' ? '[!] Требуется наложение шины' : (injury.type === 'bleeding' ? '[!] Требуется тугая повязка / бинт' : (injury.type === 'burn' ? '[!] Требуется Пантенол / Бальзам Спасатель' : '[!] Рекомендуется обработка')))
                            : '[+] Повязка/мазь нанесена. Идёт постепенное заживление'
                          }
                        </span>
                      </div>

                      {/* Compatible Inventory Items for Quick Treatment */}
                      {!injury.treated && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
                          <span className="text-[10px] text-slate-400 font-medium">Доступные средства в вашем инвентаре:</span>
                          {getCompatibleInventoryItems(injury).length === 0 ? (
                            <span className="text-[10px] text-amber-400/80 italic">Нет подходящих медикаментов в рюкзаке</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {getCompatibleInventoryItems(injury).map(({ item, idx }) => (
                                <button
                                  key={`${item.itemId}_${idx}`}
                                  onClick={() => handleApplyToInjury(idx, injury.id)}
                                  className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/80 hover:border-emerald-400 text-emerald-200 hover:text-white rounded text-[10px] font-bold flex items-center gap-1 transition active:scale-95"
                                >
                                  <span>{item.nameRu}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Pharmacokinetics Card */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-sky-400" />
                  <span>Активные медикаменты</span>
                </span>
                <span className="text-[10px] font-mono text-sky-400">{activeMeds.length} в крови</span>
              </div>

              {activeMeds.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-2.5 text-center bg-slate-900/50 rounded-xl border border-slate-800/60">
                  Медикаменты не принимались. Всасывание отсутствует.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto">
                  {activeMeds.map(med => (
                    <div key={med.id} className="p-2 bg-slate-900/90 rounded-xl border border-slate-700/60 text-xs">
                      <div className="flex items-center justify-between font-bold text-sky-300">
                        <span>{med.nameRu || (med as any).name || 'Медикамент'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-sky-950 text-sky-400 rounded border border-sky-800 font-mono">
                          {med.phase === 'absorption' && '[Всасывание]'}
                          {med.phase === 'peak' && '[Пик]'}
                          {med.phase === 'action' && '[Терапия]'}
                          {med.phase === 'decay' && '[Выведение]'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>Действие: {Math.round(med.currentEffectiveness * 100)}%</span>
                        <span className="font-mono text-sky-300 font-semibold">{getMedicationRemainingSeconds(med)} сек</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-sky-400 transition-all duration-300"
                          style={{ width: `${Math.round(med.currentEffectiveness * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Vitals & Pain / Pharmacokinetics (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-3">
            
            {/* Effective Pain & Shock Gauge */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <Activity className="w-4 h-4" />
                  <span>Волновой порог боли (с пульсом)</span>
                </span>
                <span className="text-xs font-mono text-rose-300 font-bold">{Math.round(bs.effectivePain || bs.painLevel)} / 100</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.max(0, bs.effectivePain || bs.painLevel))}%` }}
                />
              </div>

              {/* Traumatic Shock */}
              <div className="flex items-center justify-between text-xs text-slate-400 mt-1 pt-2 border-t border-slate-800/80">
                <span>Травматический шок:</span>
                <span className={`font-bold font-mono ${(bs.shockLevel || 0) > 30 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {Math.round(bs.shockLevel || 0)}%
                </span>
              </div>

              {/* Panic Level */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Уровень паники и страха:</span>
                <span className={`font-bold font-mono ${(bs.panicLevel || 0) > 30 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {Math.round(bs.panicLevel || 0)}%
                </span>
              </div>
            </div>

            {/* Clinical Summary Note */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>Общее клиническое резюме</span>
                </span>
              </div>
              
              <div className="text-xs text-slate-300 leading-relaxed p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                {detailed.overallSensorySummary || detailed.healthText}
              </div>

              <div className="text-[11px] text-slate-400 leading-normal p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 mt-auto">
                <span className="text-slate-300 font-bold">Для оказания первой помощи:</span> примените медикаменты (бинт, шину, пластырь, антисептик) напрямую из инвентаря. Вся симптоматика отображается на главном экране.
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};


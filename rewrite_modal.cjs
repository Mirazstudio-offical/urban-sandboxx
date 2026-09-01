const fs = require('fs');

const content = `import React, { useState } from 'react';
import { Player, BodyPartsMap, Injury } from '../types';
import { getDetailedBodySensations, getBodyPartLabel, getBodyPartStatusText } from '../sensations';
import { useItemOnPlayer } from '../items';
import { sound } from '../audio';
import { Activity, ShieldAlert, Heart, Droplet, Thermometer, Wind, Zap, X, PlusCircle, AlertTriangle } from 'lucide-react';

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

  if (!isOpen || !player || !player.bodyState) return null;

  const bs = player.bodyState;
  const detailed = getDetailedBodySensations(player);

  const getPartColor = (injuries: Injury[]) => {
    if (!injuries || injuries.length === 0) return { fill: '#059669', stroke: '#10b981', pulse: false };
    if (injuries.some(i => i.type === 'fracture' && !i.treated)) return { fill: '#7f1d1d', stroke: '#ef4444', pulse: true };
    if (injuries.some(i => i.type === 'bleeding' && !i.treated)) return { fill: '#dc2626', stroke: '#ef4444', pulse: true };
    if (injuries.some(i => i.type === 'sprain' && !i.treated)) return { fill: '#ea580c', stroke: '#f97316', pulse: false };
    if (injuries.some(i => i.type === 'fracture' && i.treated)) return { fill: '#9f1239', stroke: '#fb7185', pulse: false }; // Treated fracture
    if (injuries.some(i => (i.type === 'bruise' || i.type === 'abrasion') && !i.treated)) return { fill: '#d97706', stroke: '#f59e0b', pulse: false };
    return { fill: '#059669', stroke: '#10b981', pulse: false }; // Everything treated
  };

  const getPartBadgeClass = (injuries: Injury[]) => {
    if (!injuries || injuries.length === 0) return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
    if (injuries.some(i => (i.type === 'fracture' || i.type === 'bleeding') && !i.treated)) return 'bg-red-950/95 text-red-200 border-red-600 animate-pulse';
    if (injuries.some(i => i.type === 'sprain' && !i.treated)) return 'bg-orange-950/80 text-orange-300 border-orange-700/60';
    if (injuries.some(i => !i.treated)) return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
    return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
  };

  const getInjuryTypeName = (type: string) => {
    switch (type) {
      case 'bruise': return 'Ушиб';
      case 'sprain': return 'Растяжение';
      case 'fracture': return 'Перелом';
      case 'bleeding': return 'Кровотечение';
      case 'abrasion': return 'Ссадина';
      default: return type;
    }
  };

  const currentInjuries = bs.bodyParts[selectedPart] || [];

  // Find med items in inventory
  const findItemIndex = (itemId: string) => {
    return player.inventory?.findIndex(i => i && i.itemId === itemId) ?? -1;
  };

  const bandageIdx = findItemIndex('bandage');
  const splintIdx = findItemIndex('splint');
  const painkillersIdx = findItemIndex('painkillers');
  const medkitIdx = findItemIndex('medkit');
  const waterIdx = findItemIndex('water_bottle');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn pointer-events-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Самоосмотр и лечение</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-xs border border-slate-700">
                  Клавиша C
                </span>
              </h2>
              <p className="text-xs text-slate-400">Выберите поврежденную часть тела и конкретную травму для лечения</p>
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
          <div className="md:col-span-4 bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-between">
            <div className="w-full text-center text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
              Карта тела
            </div>

            {/* Vector Human Silhouette SVG */}
            <div className="relative w-48 h-72 flex items-center justify-center my-2">
              <svg viewBox="0 0 100 160" className="w-full h-full drop-shadow-md">
                {/* Head */}
                <circle
                  cx="50"
                  cy="18"
                  r="12"
                  fill={getPartColor(bs.bodyParts.head).fill}
                  stroke={selectedPart === "head" ? "#38bdf8" : getPartColor(bs.bodyParts.head).stroke}
                  strokeWidth={selectedPart === "head" ? "2.5" : "1.5"}
                  className={\`cursor-pointer transition-all hover:opacity-80 \${getPartColor(bs.bodyParts.head).pulse ? 'animate-pulse' : ''}\`}
                  onClick={() => selectPart('head')}
                />
                
                {/* Torso */}
                <rect
                  x="36"
                  y="34"
                  width="28"
                  height="46"
                  rx="6"
                  fill={getPartColor(bs.bodyParts.torso).fill}
                  stroke={selectedPart === "torso" ? "#38bdf8" : getPartColor(bs.bodyParts.torso).stroke}
                  strokeWidth={selectedPart === "torso" ? "2.5" : "1.5"}
                  className={\`cursor-pointer transition-all hover:opacity-80 \${getPartColor(bs.bodyParts.torso).pulse ? 'animate-pulse' : ''}\`}
                  onClick={() => selectPart('torso')}
                />

                {/* Left Arm */}
                <rect
                  x="18"
                  y="36"
                  width="14"
                  height="44"
                  rx="5"
                  fill={getPartColor(bs.bodyParts.leftArm).fill}
                  stroke={selectedPart === "leftArm" ? "#38bdf8" : getPartColor(bs.bodyParts.leftArm).stroke}
                  strokeWidth={selectedPart === "leftArm" ? "2.5" : "1.5"}
                  className={\`cursor-pointer transition-all hover:opacity-80 \${getPartColor(bs.bodyParts.leftArm).pulse ? 'animate-pulse' : ''}\`}
                  onClick={() => selectPart('leftArm')}
                />

                {/* Right Arm */}
                <rect
                  x="68"
                  y="36"
                  width="14"
                  height="44"
                  rx="5"
                  fill={getPartColor(bs.bodyParts.rightArm).fill}
                  stroke={selectedPart === "rightArm" ? "#38bdf8" : getPartColor(bs.bodyParts.rightArm).stroke}
                  strokeWidth={selectedPart === "rightArm" ? "2.5" : "1.5"}
                  className={\`cursor-pointer transition-all hover:opacity-80 \${getPartColor(bs.bodyParts.rightArm).pulse ? 'animate-pulse' : ''}\`}
                  onClick={() => selectPart('rightArm')}
                />

                {/* Left Leg */}
                <rect
                  x="36"
                  y="84"
                  width="12"
                  height="58"
                  rx="5"
                  fill={getPartColor(bs.bodyParts.leftLeg).fill}
                  stroke={selectedPart === "leftLeg" ? "#38bdf8" : getPartColor(bs.bodyParts.leftLeg).stroke}
                  strokeWidth={selectedPart === "leftLeg" ? "2.5" : "1.5"}
                  className={\`cursor-pointer transition-all hover:opacity-80 \${getPartColor(bs.bodyParts.leftLeg).pulse ? 'animate-pulse' : ''}\`}
                  onClick={() => selectPart('leftLeg')}
                />

                {/* Right Leg */}
                <rect
                  x="52"
                  y="84"
                  width="12"
                  height="58"
                  rx="5"
                  fill={getPartColor(bs.bodyParts.rightLeg).fill}
                  stroke={selectedPart === "rightLeg" ? "#38bdf8" : getPartColor(bs.bodyParts.rightLeg).stroke}
                  strokeWidth={selectedPart === "rightLeg" ? "2.5" : "1.5"}
                  className={\`cursor-pointer transition-all hover:opacity-80 \${getPartColor(bs.bodyParts.rightLeg).pulse ? 'animate-pulse' : ''}\`}
                  onClick={() => selectPart('rightLeg')}
                />
              </svg>
            </div>
          </div>

          {/* MIDDLE: Selected Part Details & Injuries (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-3">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between font-bold text-slate-200">
                <span className="text-lg">{getBodyPartLabel(selectedPart)}</span>
                <span className={\`px-2 py-0.5 rounded border text-[10px] font-semibold \${getPartBadgeClass(currentInjuries)}\`}>
                  {getBodyPartStatusText(currentInjuries)}
                </span>
              </div>
              
              <div className="text-xs text-slate-400 mt-2 font-medium">Список травм:</div>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                {currentInjuries.length === 0 ? (
                  <div className="text-sm text-emerald-500/80 italic p-3 text-center border border-emerald-900/50 bg-emerald-950/20 rounded-lg">
                    Повреждений нет
                  </div>
                ) : (
                  currentInjuries.map(injury => (
                    <div 
                      key={injury.id}
                      onClick={() => setSelectedInjuryId(injury.id)}
                      className={\`p-3 rounded-lg border cursor-pointer transition-all \${
                        selectedInjuryId === injury.id 
                          ? 'bg-sky-900/40 border-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.2)]' 
                          : 'bg-slate-950/60 border-slate-700 hover:border-slate-500'
                      }\`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={\`font-bold \${injury.treated ? 'text-emerald-400' : 'text-slate-200'}\`}>
                          {getInjuryTypeName(injury.type)}
                        </div>
                        {injury.treated && (
                          <div className="text-[10px] px-1.5 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded">
                            Обработано
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {!injury.treated 
                          ? (injury.type === 'fracture' ? 'Требуется шина' : (injury.type === 'bleeding' ? 'Требуется бинт' : 'Можно наложить бинт'))
                          : 'Медицинская помощь оказана, срастается'
                        }
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Vitals & Treatment Tools (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-4">
            
            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Temperature */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <Thermometer className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Температура</div>
                  <div className="text-sm font-bold text-slate-100">{bs.temperature.toFixed(1)} °C</div>
                </div>
              </div>

              {/* Wetness */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Промокание</div>
                  <div className="text-sm font-bold text-slate-100">{Math.round(bs.wetness)}%</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-slate-400" />
                <div className="text-xs font-bold text-slate-300">Уровень боли</div>
                <div className="ml-auto text-sm font-bold text-rose-400">{Math.round(bs.painLevel)} / 100</div>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-500"
                  style={{ width: \`\${Math.min(100, bs.painLevel)}%\` }}
                />
              </div>
            </div>

            {/* Quick Treatment Bar */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2.5 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Применение медицины</span>
              </div>
              
              {!selectedInjuryId ? (
                <div className="text-[11px] text-amber-500/80 italic p-2 border border-amber-900/30 bg-amber-950/20 rounded">
                  Выберите конкретную травму в списке слева для лечения бинтом или шиной.
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 mt-2">
                {/* Bandage */}
                <button
                  disabled={bandageIdx < 0 || !selectedInjuryId}
                  onClick={() => handleUseMedItem(bandageIdx)}
                  className={\`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition \${
                    bandageIdx >= 0 && selectedInjuryId
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100 active:scale-95' 
                      : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                  }\`}
                >
                  <span>🩹 Использовать Бинт</span>
                  <span className="text-[10px] font-mono opacity-80">{bandageIdx >= 0 ? 'В наличии' : 'Нет'}</span>
                </button>

                {/* Splint */}
                <button
                  disabled={splintIdx < 0 || !selectedInjuryId}
                  onClick={() => handleUseMedItem(splintIdx)}
                  className={\`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition \${
                    splintIdx >= 0 && selectedInjuryId
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100 active:scale-95' 
                      : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                  }\`}
                >
                  <span>🪵 Наложить Шину</span>
                  <span className="text-[10px] font-mono opacity-80">{splintIdx >= 0 ? 'В наличии' : 'Нет'}</span>
                </button>

                {/* Painkillers (Global) */}
                <button
                  disabled={painkillersIdx < 0}
                  onClick={() => handleUseMedItem(painkillersIdx)}
                  className={\`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition mt-4 \${
                    painkillersIdx >= 0 
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100 active:scale-95' 
                      : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                  }\`}
                >
                  <span>💊 Выпить обезболивающее</span>
                  <span className="text-[10px] font-mono opacity-80">{painkillersIdx >= 0 ? 'В наличии' : 'Нет'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
`
fs.writeFileSync('src/components/SelfInspectionModal.tsx', content);

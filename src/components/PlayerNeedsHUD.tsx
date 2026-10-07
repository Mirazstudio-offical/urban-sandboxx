import React from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import { stowItemFromHandToPockets, swapPlayerHands } from '../items';
import { getDetailedBodySensations } from '../sensations';
import { ItemIconCanvas } from './ItemIconCanvas';
import { 
  Package, 
  Heart, 
  Sparkles, 
  AlertCircle, 
  Activity, 
  Droplet, 
  CloudRain, 
  Thermometer, 
  Zap, 
  BatteryLow, 
  Volume2, 
  Trash2,
  Hand,
  ArrowLeftRight,
  ArrowDownToLine,
  Utensils,
  Flame
} from 'lucide-react';

interface PlayerNeedsHUDProps {
  player: Player | null;
  world?: GameWorld | null;
  onOpenInventory: () => void;
  onOpenSelfInspection: () => void;
  onToggleActiveHand?: () => void;
  onSelectActiveHand?: (hand: 'left' | 'right') => void;
  onUseActiveHandItem?: () => void;
  onSelectHotbarItem?: (index: number) => void;
  onSelectHotbarIndex?: (index: number) => void;
  onUseHotbarItem?: (index: number) => void;
  selectedHotbarIndex?: number;
  isMobileTouch?: boolean;
}

export const PlayerNeedsHUD: React.FC<PlayerNeedsHUDProps> = ({
  player,
  world,
  onOpenInventory,
  onOpenSelfInspection,
  onToggleActiveHand,
  onSelectActiveHand,
  onUseActiveHandItem,
  isMobileTouch = false
}) => {
  if (!player || !player.needs) return null;

  const activeHand = player.activeHand || 'right';
  const leftItem = player.leftHandItem;
  const rightItem = player.rightHandItem;
  const activeHandItem = activeHand === 'left' ? leftItem : rightItem;

  const handleHandClick = (hand: 'left' | 'right') => {
    if (onSelectActiveHand) {
      onSelectActiveHand(hand);
    } else {
      player.activeHand = hand;
    }
  };

  const handleSwapHands = () => {
    if (onToggleActiveHand) {
      onToggleActiveHand();
    } else {
      swapPlayerHands(player);
    }
  };

  const handleStowHand = (e: React.MouseEvent, hand: 'left' | 'right') => {
    e.stopPropagation();
    stowItemFromHandToPockets(player, hand);
  };

  const bs = player.bodyState;
  const detailed = getDetailedBodySensations(player);

  const isCritical = player.needs.health < 30 || (bs?.painLevel ?? 0) > 60;
  const isConsuming = !!player.consumption?.isConsuming;
  const tinnitusActive = (bs?.tinnitusTimer || 0) > 0;

  // Determine prompt label for key [E]
  const getPromptLabel = () => {
    if (activeHandItem) {
      if (activeHandItem.isContainer) {
        return `Открыть: ${activeHandItem.nameRu}`;
      }
      if (activeHandItem.category === 'food') {
        const hasPortions = activeHandItem.maxPortions && activeHandItem.maxPortions > 1;
        return hasPortions
          ? `Сделать укус (${activeHandItem.portions ?? activeHandItem.maxPortions}/${activeHandItem.maxPortions}): ${activeHandItem.nameRu}`
          : `Съесть: ${activeHandItem.nameRu}`;
      }
      if (activeHandItem.category === 'drink') {
        const hasPortions = activeHandItem.maxPortions && activeHandItem.maxPortions > 1;
        return hasPortions
          ? `Сделать глоток (${activeHandItem.portions ?? activeHandItem.maxPortions}/${activeHandItem.maxPortions}): ${activeHandItem.nameRu}`
          : `Выпить: ${activeHandItem.nameRu}`;
      }
      if (activeHandItem.category === 'med') {
        const hasPortions = activeHandItem.maxPortions && activeHandItem.maxPortions > 1;
        return hasPortions
          ? `Принять дозу (${activeHandItem.portions ?? activeHandItem.maxPortions}/${activeHandItem.maxPortions}): ${activeHandItem.nameRu}`
          : `Применить: ${activeHandItem.nameRu}`;
      }
      if (activeHandItem.usable) {
        return `Использовать: ${activeHandItem.nameRu}`;
      }
      return `В руке: ${activeHandItem.nameRu}`;
    }

    return null;
  };

  const actionPrompt = getPromptLabel();

  return (
    <>
      {/* 1. SENSORY ALERTS & TINNITUS */}
      {tinnitusActive && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-none z-50 px-4 py-1.5 rounded-[2px] bg-[#c68a35]/20 border border-[#c68a35]/50 backdrop-blur-md text-[#d99a41] text-xs font-bold flex items-center gap-2 animate-bounce font-mono">
          <Volume2 className="w-4 h-4 animate-spin" />
          <span>Звон в ушах... (Контузия)</span>
        </div>
      )}

      {/* 2. BODY SENSATIONS & INSPECTION HUD PANEL (Bento Grid Widget) */}
      <div 
        id="bottom-right-symptoms-bar"
        className={`fixed z-30 flex flex-col items-end gap-2.5 pointer-events-auto transition-all duration-200 ${
          isMobileTouch 
            ? 'top-[92px] sm:top-[140px] right-3 max-w-[200px]' 
            : 'bottom-4 right-4 max-w-[320px]'
        }`}
      >
        {isMobileTouch ? (
          /* Compact Mobile View */
          <button
            id="hud-self-inspection-btn"
            onClick={onOpenSelfInspection}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenSelfInspection();
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-[#14161a]/95 border border-[#2a2e38] rounded-[2px] shadow-2xl text-[#f0f3f6] transition font-mono active:scale-98 cursor-pointer"
            title="Открыть самоосмотр организма (Клавиша C)"
          >
            <div className={`p-1 rounded-[2px] bg-[#0b0c0e] ${isCritical ? 'text-red-400 animate-pulse' : 'text-[#c68a35]'}`}>
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="text-left text-[10px] font-bold uppercase tracking-wider text-[#cbd5e1]">
              СОСТОЯНИЕ: {Math.round(player.needs.health)}% HP
            </div>
          </button>
        ) : (
          /* Premium Bento Diagnostics & Vitals Widget */
          <div className="p-3.5 bg-[#14161a]/95 border border-[#2a2e38] rounded-[2px] shadow-2xl flex flex-col gap-2.5 w-[280px] sm:w-[320px] backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Title / Header */}
            <div className="flex items-center justify-between text-[#9ba3af] text-[9px] font-mono font-bold uppercase tracking-wider border-b border-[#2a2e38] pb-2">
              <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-[#c68a35]" /> ДИАГНОСТИКА</span>
              <span className="font-mono text-[#5a6272]">VITALS</span>
            </div>
            
            {/* Vitals Grid (2 Columns, 2 Rows) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Health Cell */}
              <div className="bg-[#0b0c0e]/60 border border-[#2a2e38] rounded-[2px] p-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-extrabold text-[#9ba3af] flex items-center gap-1">
                    <Heart className={`w-3 h-3 ${player.needs.health < 30 ? 'text-red-500 animate-pulse' : 'text-red-400'}`} /> HP
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${player.needs.health < 30 ? 'text-red-400' : 'text-[#f0f3f6]'}`}>
                    {Math.round(player.needs.health)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#0b0c0e] rounded-none overflow-hidden border border-[#2a2e38]">
                  <div 
                    className={`h-full rounded-none transition-all duration-300 ${player.needs.health < 30 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-red-700'}`}
                    style={{ width: `${player.needs.health}%` }}
                  />
                </div>
              </div>

              {/* Energy Cell */}
              <div className="bg-[#0b0c0e]/60 border border-[#2a2e38] rounded-[2px] p-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-extrabold text-[#9ba3af] flex items-center gap-1">
                    <Zap className={`w-3 h-3 ${player.needs.energy < 25 ? 'text-[#c68a35] animate-pulse' : 'text-[#c68a35]'}`} /> ЭНЕРГИЯ
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${player.needs.energy < 25 ? 'text-[#d99a41]' : 'text-[#f0f3f6]'}`}>
                    {Math.round(player.needs.energy)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#0b0c0e] rounded-none overflow-hidden border border-[#2a2e38]">
                  <div 
                    className={`h-full rounded-none transition-all duration-300 ${player.needs.energy < 25 ? 'bg-[#c68a35] shadow-[0_0_8px_rgba(198,138,53,0.5)]' : 'bg-[#c68a35]'}`}
                    style={{ width: `${player.needs.energy}%` }}
                  />
                </div>
              </div>

              {/* Hunger Cell */}
              <div className="bg-[#0b0c0e]/60 border border-[#2a2e38] rounded-[2px] p-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-extrabold text-[#9ba3af] flex items-center gap-1">
                    <Utensils className={`w-3 h-3 ${player.needs.hunger < 25 ? 'text-[#d99a41] animate-pulse' : 'text-[#c68a35]'}`} /> СЫТОСТЬ
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${player.needs.hunger < 25 ? 'text-[#d99a41]' : 'text-[#f0f3f6]'}`}>
                    {Math.round(player.needs.hunger)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#0b0c0e] rounded-none overflow-hidden border border-[#2a2e38]">
                  <div 
                    className={`h-full rounded-none transition-all duration-300 ${player.needs.hunger < 25 ? 'bg-[#c68a35] shadow-[0_0_8px_rgba(198,138,53,0.5)]' : 'bg-[#9a6a24]'}`}
                    style={{ width: `${player.needs.hunger}%` }}
                  />
                </div>
              </div>

              {/* Thirst Cell */}
              <div className="bg-[#0b0c0e]/60 border border-[#2a2e38] rounded-[2px] p-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-extrabold text-[#9ba3af] flex items-center gap-1">
                    <Droplet className={`w-3 h-3 ${player.needs.thirst < 25 ? 'text-[#cbd5e1] animate-pulse' : 'text-[#9ba3af]'}`} /> ВОДА
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${player.needs.thirst < 25 ? 'text-amber-400' : 'text-[#f0f3f6]'}`}>
                    {Math.round(player.needs.thirst)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#0b0c0e] rounded-none overflow-hidden border border-[#2a2e38]">
                  <div 
                    className={`h-full rounded-none transition-all duration-300 ${player.needs.thirst < 25 ? 'bg-[#c68a35] shadow-[0_0_8px_rgba(198,138,53,0.5)]' : 'bg-slate-500'}`}
                    style={{ width: `${player.needs.thirst}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Self-Inspection Button & Text */}
            <button
              onClick={onOpenSelfInspection}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenSelfInspection();
              }}
              className="w-full py-2 bg-[#0b0c0e] hover:bg-[#1c1f26] active:scale-98 border border-[#2a2e38] hover:border-[#c68a35]/40 rounded-[2px] flex items-center justify-between px-3 transition font-mono group cursor-pointer"
            >
              <span className="text-[9px] font-extrabold uppercase text-[#cbd5e1] tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-none opacity-75 ${isCritical ? 'bg-red-500' : 'bg-[#c68a35]'}`} />
                  <span className={`relative inline-flex rounded-none h-2 w-2 ${isCritical ? 'bg-red-500' : 'bg-[#c68a35]'}`} />
                </span>
                {detailed.healthText}
              </span>
              <span className="px-1.5 py-0.5 bg-[#14161a] group-hover:bg-[#1c1f26] text-[9px] font-mono text-[#c68a35] rounded-[2px] border border-[#2a2e38]">
                C
              </span>
            </button>
          </div>
        )}

        {/* Dynamic Symptom Badges */}
        <div className="flex flex-wrap justify-end gap-1 max-w-[220px] sm:max-w-[320px]">
          {detailed.activeSymptoms.map((symptom) => {
            const isDanger = symptom.severity === 'danger';
            return (
              <button
                key={symptom.id}
                onClick={onOpenSelfInspection}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenSelfInspection();
                }}
                className={`flex items-center gap-1.5 px-2 py-0.5 sm:py-1 border rounded-[2px] text-[10px] sm:text-[11px] font-mono shadow backdrop-blur-sm transition active:scale-98 cursor-pointer ${
                  isDanger 
                    ? 'bg-red-950/90 border-red-700 text-red-200 animate-pulse' 
                    : 'bg-[#14161a]/95 border-[#2a2e38] text-[#cbd5e1] hover:border-[#c68a35]/60 hover:text-white'
                }`}
                title={`${symptom.label}: ${symptom.description}`}
              >
                {symptom.iconType === 'leg' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                {symptom.iconType === 'drop' && <Droplet className="w-3.5 h-3.5 text-[#c68a35]" />}
                {symptom.iconType === 'cold' && <Thermometer className="w-3.5 h-3.5 text-slate-300" />}
                {symptom.iconType === 'wet' && <CloudRain className="w-3.5 h-3.5 text-slate-300" />}
                {symptom.iconType === 'pain' && <Zap className="w-3.5 h-3.5 text-[#c68a35]" />}
                {symptom.iconType === 'energy' && <BatteryLow className="w-3.5 h-3.5 text-[#c68a35]" />}
                {symptom.iconType === 'heart' && <Heart className="w-3.5 h-3.5 text-red-400" />}
                {symptom.iconType === 'pill' && <Sparkles className="w-3.5 h-3.5 text-[#c68a35]" />}
                {symptom.iconType === 'cough' && <AlertCircle className="w-3.5 h-3.5 text-[#d99a41]" />}
                <span className="font-semibold uppercase">{symptom.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONSUMPTION PROGRESS BAR */}
      {isConsuming && player.consumption && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-1">
          <div className="px-3.5 py-1.5 bg-[#14161a]/95 border border-[#2a2e38] rounded-[2px] text-xs font-mono text-[#f0f3f6] shadow-xl flex items-center gap-2">
            <Package className="w-4 h-4 text-[#c68a35]" />
            <span className="font-bold">{player.consumption.itemNameRu}</span>
            {player.consumption.tasteMessage && (
              <span className="text-[#9ba3af] italic">— {player.consumption.tasteMessage}</span>
            )}
          </div>
          <div className="w-52 h-2 bg-[#0b0c0e] rounded-none overflow-hidden border border-[#2a2e38]">
            <div 
              className="h-full bg-[#c68a35] rounded-none transition-all duration-200"
              style={{ width: `${((player.consumption.totalBites - player.consumption.bitesRemaining) / player.consumption.totalBites) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-[#9ba3af] font-mono uppercase tracking-wider">
            ПРОЦЕСС: {player.consumption.totalBites - player.consumption.bitesRemaining}/{player.consumption.totalBites}
          </div>
        </div>
      )}

      {/* 4. BOTTOM DUAL HANDS & POCKETS HUD */}
      {!player.isInVehicle && (
        <div className={`fixed ${isMobileTouch ? 'bottom-1 sm:bottom-2' : 'bottom-4'} left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 sm:gap-2 pointer-events-auto`}>
          {/* MAIN INTERFACE ROW: LEFT HAND | SWAP | RIGHT HAND | DIVIDER | POCKETS 1-6 | INVENTORY BUTTON */}
          <div 
            id="player-dual-hands-hotbar"
            className={`flex items-center gap-1.5 sm:gap-2 bg-[#14161a]/95 backdrop-blur-md border border-[#2a2e38] shadow-2xl transition-all ${
              isMobileTouch ? 'p-1.5 rounded-[2px] scale-75 sm:scale-85 md:scale-100 origin-bottom' : 'p-2.5 rounded-[2px]'
            }`}
          >
            {/* --- HANDS SECTION --- */}
            <div className="flex items-center gap-1.5 bg-[#0b0c0e]/80 p-1 rounded-[2px] border border-[#2a2e38]">
              {/* LEFT HAND */}
              <div 
                id="hud-left-hand-slot"
                onClick={() => handleHandClick('left')}
                onDoubleClick={() => onUseActiveHandItem?.()}
                title={leftItem ? `Левая рука: ${leftItem.nameRu} [Клик - выбрать, Даблклик - использовать]` : 'Левая рука (Свободна) [Клик для выбора]'}
                className={`relative w-14 h-14 rounded-[2px] border flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                  activeHand === 'left'
                    ? 'border-[#c68a35] bg-[#c68a35]/20 shadow-lg ring-1 ring-[#c68a35]/50 scale-105 z-10'
                    : 'border-[#2a2e38] bg-[#14161a] hover:border-white/20 hover:bg-[#1c1f26]'
                }`}
              >
                <div className="absolute top-1 left-1.5 text-[8px] font-mono font-bold tracking-tight text-[#9ba3af] uppercase">
                  ЛЕВ
                </div>
                {activeHand === 'left' && (
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 bg-[#c68a35] text-[#0b0c0e] text-[8px] font-mono font-extrabold rounded-[2px] shadow">
                    АКТИВ
                  </span>
                )}

                {leftItem ? (
                  <>
                    <ItemIconCanvas itemId={leftItem.itemId} item={leftItem} size={28} />
                    {leftItem.surfaceTemperature !== undefined && leftItem.surfaceTemperature >= 52 && (
                      <span 
                        className="absolute -top-1 left-7 p-0.5 bg-[#0b0c0e]/95 border border-amber-500/70 rounded-[2px] text-amber-400 z-10" 
                        title={`Горячо! ${leftItem.surfaceTemperature}°C`}
                      >
                        <Flame className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                      </span>
                    )}
                    {/* Portion indicator if multi-portion */}
                    {leftItem.maxPortions && leftItem.maxPortions > 1 && (
                      <>
                        <span className="absolute top-1 right-1.5 px-1 py-0.2 bg-[#0b0c0e]/90 border border-[#2a2e38] rounded-[2px] text-[8px] font-mono font-bold text-[#d99a41]">
                          {leftItem.portions ?? leftItem.maxPortions}/{leftItem.maxPortions}
                        </span>
                        <div className="absolute bottom-0.5 left-1 right-1 h-1 bg-[#0b0c0e] rounded-none overflow-hidden border border-[#2a2e38]">
                          <div 
                            className="h-full bg-[#c68a35] rounded-none transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, ((leftItem.portions ?? leftItem.maxPortions) / leftItem.maxPortions) * 100))}%` }}
                          />
                        </div>
                      </>
                    )}
                    {leftItem.count > 1 && (
                      <span className="absolute bottom-1 right-1 px-1 bg-[#0b0c0e] border border-[#2a2e38] rounded-[2px] text-[9px] font-mono font-bold text-[#f0f3f6]">
                        x{leftItem.count}
                      </span>
                    )}
                    {/* Quick stow icon button */}
                    <button
                      onClick={(e) => handleStowHand(e, 'left')}
                      className="absolute bottom-1 left-1 p-0.5 rounded-[2px] bg-[#14161a] hover:bg-[#c68a35] text-[#9ba3af] hover:text-[#0b0c0e] transition z-10 cursor-pointer"
                      title="Убрать в карман"
                    >
                      <ArrowDownToLine className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <Hand className="w-5 h-5 text-[#3a3f4d] stroke-[1.5]" />
                )}
              </div>

              {/* SWAP / TOGGLE HANDS BUTTON */}
              <button
                id="hud-swap-hands-btn"
                onClick={handleSwapHands}
                className="px-1.5 h-14 bg-[#14161a] hover:bg-[#1c1f26] active:scale-98 border border-[#2a2e38] rounded-[2px] text-[#9ba3af] hover:text-[#c68a35] flex flex-col items-center justify-center gap-0.5 transition cursor-pointer"
                title="Переключить / Поменять руки местами (Клавиша Q)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span className="text-[8px] font-mono font-bold">Q</span>
              </button>

              {/* RIGHT HAND */}
              <div 
                id="hud-right-hand-slot"
                onClick={() => handleHandClick('right')}
                onDoubleClick={() => onUseActiveHandItem?.()}
                title={rightItem ? `Правая рука: ${rightItem.nameRu} [Клик - выбрать, Даблклик - использовать]` : 'Правая рука (Свободна) [Клик для выбора]'}
                className={`relative w-14 h-14 rounded-[2px] border flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                  activeHand === 'right'
                    ? 'border-[#c68a35] bg-[#c68a35]/20 shadow-lg ring-1 ring-[#c68a35]/50 scale-105 z-10'
                    : 'border-[#2a2e38] bg-[#14161a] hover:border-white/20 hover:bg-[#1c1f26]'
                }`}
              >
                <div className="absolute top-1 left-1.5 text-[8px] font-mono font-bold tracking-tight text-[#9ba3af] uppercase">
                  ПРАВ
                </div>
                {activeHand === 'right' && (
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 bg-[#c68a35] text-[#0b0c0e] text-[8px] font-mono font-extrabold rounded-[2px] shadow">
                    АКТИВ
                  </span>
                )}

                {rightItem ? (
                  <>
                    <ItemIconCanvas itemId={rightItem.itemId} item={rightItem} size={28} />
                    {rightItem.surfaceTemperature !== undefined && rightItem.surfaceTemperature >= 52 && (
                      <span 
                        className="absolute -top-1 left-7 p-0.5 bg-[#0b0c0e]/95 border border-amber-500/70 rounded-[2px] text-amber-400 z-10" 
                        title={`Горячо! ${rightItem.surfaceTemperature}°C`}
                      >
                        <Flame className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                      </span>
                    )}
                    {/* Portion indicator if multi-portion */}
                    {rightItem.maxPortions && rightItem.maxPortions > 1 && (
                      <>
                        <span className="absolute top-1 right-1.5 px-1 py-0.2 bg-[#0b0c0e]/90 border border-[#2a2e38] rounded-[2px] text-[8px] font-mono font-bold text-[#d99a41]">
                          {rightItem.portions ?? rightItem.maxPortions}/{rightItem.maxPortions}
                        </span>
                        <div className="absolute bottom-0.5 left-1 right-1 h-1 bg-[#0b0c0e] rounded-none overflow-hidden border border-[#2a2e38]">
                          <div 
                            className="h-full bg-[#c68a35] rounded-none transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, ((rightItem.portions ?? rightItem.maxPortions) / rightItem.maxPortions) * 100))}%` }}
                          />
                        </div>
                      </>
                    )}
                    {rightItem.count > 1 && (
                      <span className="absolute bottom-1 right-1 px-1 bg-[#0b0c0e] border border-[#2a2e38] rounded-[2px] text-[9px] font-mono font-bold text-[#f0f3f6]">
                        x{rightItem.count}
                      </span>
                    )}
                    {/* Quick stow icon button */}
                    <button
                      onClick={(e) => handleStowHand(e, 'right')}
                      className="absolute bottom-1 left-1 p-0.5 rounded-[2px] bg-[#14161a] hover:bg-[#c68a35] text-[#9ba3af] hover:text-[#0b0c0e] transition z-10 cursor-pointer"
                      title="Убрать в карман"
                    >
                      <ArrowDownToLine className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <Hand className="w-5 h-5 text-[#3a3f4d] stroke-[1.5]" />
                )}
              </div>
            </div>

            {/* SEPARATOR */}
            <div className="h-10 w-px bg-[#2a2e38]" />

            {/* Dedicated Inventory Button */}
            <button
              id="hotbar-bag-toggle-btn"
              onClick={onOpenInventory}
              className="px-3.5 h-14 bg-[#14161a] hover:bg-[#1c1f26] active:scale-98 text-[#f0f3f6] font-mono font-bold rounded-[2px] border border-[#2a2e38] hover:border-[#c68a35]/50 shadow-lg flex flex-col items-center justify-center gap-1 transition cursor-pointer"
              title="Открыть полный инвентарь (Клавиша I или Tab)"
            >
              <Package className="w-5 h-5 text-[#c68a35]" />
              <span className="text-[8px] tracking-widest uppercase text-[#9ba3af]">РЮКЗАК [I]</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

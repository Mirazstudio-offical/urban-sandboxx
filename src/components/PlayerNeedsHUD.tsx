import React from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import { isPlayerNearTrashBin, isPlayerNearEcoVending, stowItemFromHandToPockets, swapPlayerHands } from '../items';
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
  ArrowDownToLine
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

  const isNearLitter = world && world.litter ? world.litter.some(lit => !lit.isAirborne && Math.hypot(player.x - lit.x, player.y - lit.y) < 65) : false;
  const isNearTrash = world ? isPlayerNearTrashBin(player, world) : false;
  const isNearEco = world ? isPlayerNearEcoVending(player, world) : false;

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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-none z-50 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 backdrop-blur-md text-amber-200 text-xs font-bold flex items-center gap-2 animate-bounce">
          <Volume2 className="w-4 h-4 animate-spin" />
          <span>Звон в ушах... (Контузия)</span>
        </div>
      )}

      {/* 2. BODY SENSATIONS & INSPECTION HUD PANEL */}
      <div 
        id="bottom-right-symptoms-bar"
        className={`fixed z-30 flex flex-col items-end gap-1.5 pointer-events-auto transition-all duration-200 ${
          isMobileTouch 
            ? 'top-[92px] sm:top-[140px] right-3 max-w-[200px]' 
            : 'bottom-4 right-4 max-w-[320px]'
        }`}
      >
        {/* Inspection Button Trigger (Key [C]) */}
        <button
          id="hud-self-inspection-btn"
          onClick={onOpenSelfInspection}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenSelfInspection();
          }}
          className={`flex items-center gap-2 ${
            isMobileTouch ? 'px-2.5 py-1.5' : 'px-3.5 py-2'
          } bg-slate-950/95 hover:bg-slate-900 active:scale-95 border border-slate-700/90 rounded-xl shadow-2xl text-slate-200 transition font-mono`}
          title="Открыть самоосмотр организма (Клавиша C)"
        >
          <div className={`p-1 rounded bg-slate-900 ${isCritical ? 'text-rose-400' : 'text-slate-300'}`}>
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="text-left">
            <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400 flex items-center gap-1.5">
              <span>СОСТОЯНИЕ</span>
              <span className="px-1 bg-slate-900 rounded text-[9px] font-mono border border-slate-700 text-slate-300">C</span>
            </div>
            <div className="text-[11px] sm:text-xs font-medium text-slate-200 line-clamp-1 max-w-[120px] sm:max-w-[150px]">
              {detailed.healthText}
            </div>
          </div>
        </button>

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
                className={`flex items-center gap-1.5 px-2 py-0.5 sm:py-1 border rounded-lg text-[10px] sm:text-[11px] font-mono shadow backdrop-blur-sm transition active:scale-95 ${
                  isDanger 
                    ? 'bg-rose-950/90 border-rose-700 text-rose-200 animate-pulse' 
                    : 'bg-slate-950/95 border-slate-700 text-slate-200 hover:border-slate-500'
                }`}
                title={`${symptom.label}: ${symptom.description}`}
              >
                {symptom.iconType === 'leg' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                {symptom.iconType === 'drop' && <Droplet className="w-3.5 h-3.5 text-sky-400" />}
                {symptom.iconType === 'cold' && <Thermometer className="w-3.5 h-3.5 text-cyan-400" />}
                {symptom.iconType === 'wet' && <CloudRain className="w-3.5 h-3.5 text-blue-400" />}
                {symptom.iconType === 'pain' && <Zap className="w-3.5 h-3.5 text-amber-400" />}
                {symptom.iconType === 'energy' && <BatteryLow className="w-3.5 h-3.5 text-amber-400" />}
                {symptom.iconType === 'heart' && <Heart className="w-3.5 h-3.5 text-purple-400" />}
                {symptom.iconType === 'pill' && <Sparkles className="w-3.5 h-3.5 text-sky-400" />}
                {symptom.iconType === 'cough' && <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                <span className="font-semibold uppercase">{symptom.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONSUMPTION PROGRESS BAR */}
      {isConsuming && player.consumption && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-1">
          <div className="px-3.5 py-1.5 bg-slate-950/95 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 shadow-xl flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            <span className="font-bold">{player.consumption.itemNameRu}</span>
            {player.consumption.tasteMessage && (
              <span className="text-slate-400 italic">— {player.consumption.tasteMessage}</span>
            )}
          </div>
          <div className="w-52 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            <div 
              className="h-full bg-amber-400 rounded-full transition-all duration-200"
              style={{ width: `${((player.consumption.totalBites - player.consumption.bitesRemaining) / player.consumption.totalBites) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            ПРОЦЕСС: {player.consumption.totalBites - player.consumption.bitesRemaining}/{player.consumption.totalBites}
          </div>
        </div>
      )}

      {/* 4. BOTTOM DUAL HANDS & POCKETS HUD */}
      {!player.isInVehicle && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-auto">
          {/* Active Hand Action Prompt [E] */}
          {actionPrompt && (
            <div 
              id="hud-active-hand-use-prompt"
              onClick={() => onUseActiveHandItem?.()}
              className="px-4 py-2 bg-slate-950/95 border border-sky-500/70 rounded-xl shadow-2xl text-sky-200 text-xs font-mono uppercase tracking-wider flex items-center gap-2.5 pointer-events-auto cursor-pointer hover:bg-slate-900 active:scale-95 transition animate-fadeIn backdrop-blur-md"
              title="Нажмите E для активации предмета в активной руке"
            >
              <span className="px-2 py-0.5 bg-sky-950 border border-sky-500/60 rounded-md text-[11px] font-bold text-sky-300">
                E
              </span>
              <span className="font-semibold">{actionPrompt}</span>
              <span className="text-[10px] text-slate-400 lowercase">
                ({activeHand === 'left' ? 'лев. рука' : 'прав. рука'})
              </span>
            </div>
          )}

          {/* Quick World Interactions: Trash / Eco / Litter */}
          {isNearLitter && !actionPrompt && (
            <div 
              onClick={() => {
                if (world && player) {
                  import('../items').then(mod => {
                    mod.pickupNearbyLitter(player, world);
                  });
                }
              }}
              className="px-3.5 py-1.5 bg-slate-950/95 border border-slate-700 rounded-xl shadow-xl text-slate-200 text-xs font-mono uppercase tracking-wider flex items-center gap-2 pointer-events-auto cursor-pointer hover:bg-slate-900 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>[E] Подобрать вторсырье</span>
            </div>
          )}
          {isNearEco && (
            <div 
              onClick={onOpenInventory}
              className="px-3.5 py-1.5 bg-slate-950/95 border border-emerald-600/60 rounded-xl shadow-xl text-emerald-300 text-xs font-mono uppercase tracking-wider flex items-center gap-2 pointer-events-auto cursor-pointer hover:bg-slate-900 transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>[I] Эко-фандомат: сдать тару (+$5)</span>
            </div>
          )}
          {isNearTrash && !isNearEco && (
            <div 
              onClick={onOpenInventory}
              className="px-3.5 py-1.5 bg-slate-950/95 border border-slate-700 rounded-xl shadow-xl text-slate-300 text-xs font-mono uppercase tracking-wider flex items-center gap-2 pointer-events-auto cursor-pointer hover:bg-slate-900 transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>[I] Урна: выбросить мусор</span>
            </div>
          )}

          {/* MAIN INTERFACE ROW: LEFT HAND | SWAP | RIGHT HAND | DIVIDER | POCKETS 1-6 | INVENTORY BUTTON */}
          <div 
            id="player-dual-hands-hotbar"
            className="flex items-center gap-2 bg-slate-950/95 backdrop-blur-md border border-slate-800 p-2.5 rounded-2xl shadow-2xl"
          >
            {/* --- HANDS SECTION --- */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80">
              {/* LEFT HAND */}
              <div 
                id="hud-left-hand-slot"
                onClick={() => handleHandClick('left')}
                onDoubleClick={() => onUseActiveHandItem?.()}
                title={leftItem ? `Левая рука: ${leftItem.nameRu} [Клик - выбрать, Даблклик - использовать]` : 'Левая рука (Свободна) [Клик для выбора]'}
                className={`relative w-14 h-14 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                  activeHand === 'left'
                    ? 'border-sky-400 bg-sky-950/70 shadow-lg ring-2 ring-sky-400/50 scale-105 z-10'
                    : 'border-slate-800 bg-slate-950/80 hover:border-slate-600 hover:bg-slate-900'
                }`}
              >
                <div className="absolute top-1 left-1.5 text-[8px] font-mono font-bold tracking-tight text-slate-400 uppercase">
                  ЛЕВ
                </div>
                {activeHand === 'left' && (
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 bg-sky-500 text-slate-950 text-[8px] font-mono font-extrabold rounded-full shadow">
                    АКТИВ
                  </span>
                )}

                {leftItem ? (
                  <>
                    <ItemIconCanvas itemId={leftItem.itemId} size={28} />
                    {/* Portion indicator if multi-portion */}
                    {leftItem.maxPortions && leftItem.maxPortions > 1 && (
                      <>
                        <span className="absolute top-1 right-1.5 px-1 py-0.2 bg-slate-950/90 border border-slate-700/80 rounded text-[8px] font-mono font-bold text-sky-300">
                          {leftItem.portions ?? leftItem.maxPortions}/{leftItem.maxPortions}
                        </span>
                        <div className="absolute bottom-0.5 left-1 right-1 h-1 bg-slate-950/90 rounded-full overflow-hidden border border-slate-700/80">
                          <div 
                            className="h-full bg-sky-400 rounded-full transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, ((leftItem.portions ?? leftItem.maxPortions) / leftItem.maxPortions) * 100))}%` }}
                          />
                        </div>
                      </>
                    )}
                    {leftItem.count > 1 && (
                      <span className="absolute bottom-1 right-1 px-1 bg-slate-950 border border-slate-700 rounded text-[9px] font-mono font-bold text-slate-300">
                        x{leftItem.count}
                      </span>
                    )}
                    {/* Quick stow icon button */}
                    <button
                      onClick={(e) => handleStowHand(e, 'left')}
                      className="absolute bottom-1 left-1 p-0.5 rounded bg-slate-900/80 hover:bg-sky-600 text-slate-400 hover:text-white transition z-10"
                      title="Убрать в карман"
                    >
                      <ArrowDownToLine className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <Hand className="w-5 h-5 text-slate-700 stroke-[1.5]" />
                )}
              </div>

              {/* SWAP / TOGGLE HANDS BUTTON */}
              <button
                id="hud-swap-hands-btn"
                onClick={handleSwapHands}
                className="px-1.5 h-14 bg-slate-950 hover:bg-slate-800 active:scale-95 border border-slate-800 rounded-lg text-slate-400 hover:text-sky-300 flex flex-col items-center justify-center gap-0.5 transition"
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
                className={`relative w-14 h-14 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                  activeHand === 'right'
                    ? 'border-sky-400 bg-sky-950/70 shadow-lg ring-2 ring-sky-400/50 scale-105 z-10'
                    : 'border-slate-800 bg-slate-950/80 hover:border-slate-600 hover:bg-slate-900'
                }`}
              >
                <div className="absolute top-1 left-1.5 text-[8px] font-mono font-bold tracking-tight text-slate-400 uppercase">
                  ПРАВ
                </div>
                {activeHand === 'right' && (
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 bg-sky-500 text-slate-950 text-[8px] font-mono font-extrabold rounded-full shadow">
                    АКТИВ
                  </span>
                )}

                {rightItem ? (
                  <>
                    <ItemIconCanvas itemId={rightItem.itemId} size={28} />
                    {/* Portion indicator if multi-portion */}
                    {rightItem.maxPortions && rightItem.maxPortions > 1 && (
                      <>
                        <span className="absolute top-1 right-1.5 px-1 py-0.2 bg-slate-950/90 border border-slate-700/80 rounded text-[8px] font-mono font-bold text-sky-300">
                          {rightItem.portions ?? rightItem.maxPortions}/{rightItem.maxPortions}
                        </span>
                        <div className="absolute bottom-0.5 left-1 right-1 h-1 bg-slate-950/90 rounded-full overflow-hidden border border-slate-700/80">
                          <div 
                            className="h-full bg-sky-400 rounded-full transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, ((rightItem.portions ?? rightItem.maxPortions) / rightItem.maxPortions) * 100))}%` }}
                          />
                        </div>
                      </>
                    )}
                    {rightItem.count > 1 && (
                      <span className="absolute bottom-1 right-1 px-1 bg-slate-950 border border-slate-700 rounded text-[9px] font-mono font-bold text-slate-300">
                        x{rightItem.count}
                      </span>
                    )}
                    {/* Quick stow icon button */}
                    <button
                      onClick={(e) => handleStowHand(e, 'right')}
                      className="absolute bottom-1 left-1 p-0.5 rounded bg-slate-900/80 hover:bg-sky-600 text-slate-400 hover:text-white transition z-10"
                      title="Убрать в карман"
                    >
                      <ArrowDownToLine className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <Hand className="w-5 h-5 text-slate-700 stroke-[1.5]" />
                )}
              </div>
            </div>

            {/* SEPARATOR */}
            <div className="h-10 w-px bg-slate-800" />

            {/* Dedicated Inventory Button */}
            <button
              id="hotbar-bag-toggle-btn"
              onClick={onOpenInventory}
              className="px-3.5 h-14 bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-200 font-mono font-bold rounded-xl border border-slate-700/80 shadow-lg flex flex-col items-center justify-center gap-1 transition"
              title="Открыть полный инвентарь (Клавиша I или Tab)"
            >
              <Package className="w-5 h-5 text-slate-300" />
              <span className="text-[8px] tracking-widest uppercase text-slate-400">РЮКЗАК [I]</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

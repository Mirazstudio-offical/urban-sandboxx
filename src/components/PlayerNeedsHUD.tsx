import React from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import { stowItemFromHandToPockets, swapPlayerHands } from '../items';
import { getDetailedBodySensations } from '../sensations';
import { ItemIconCanvas } from './ItemIconCanvas';
import './gameUi.css';
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

  return (
    <>
      {/* 1. SENSORY ALERTS & TINNITUS */}
      {tinnitusActive && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-none z-50 gu-hud-card px-4 py-1.5 flex items-center gap-2 text-xs font-bold text-[#f0c264]">
          <Volume2 className="w-4 h-4 animate-spin text-[#e0ab45]" />
          <span>Звон в ушах... (Контузия)</span>
        </div>
      )}

      {/* 2. BODY SENSATIONS & INSPECTION HUD PANEL (Main Menu Glass Style) */}
      <div 
        id="bottom-right-symptoms-bar"
        className={`fixed z-30 flex flex-col items-end gap-2 pointer-events-auto transition-all duration-200 ${
          isMobileTouch 
            ? 'top-[92px] sm:top-[140px] right-3 max-w-[210px]' 
            : 'bottom-12 right-4 max-w-[300px]'
        }`}
      >
        {/* Dynamic Symptom Badges — placed above vitals card so they never collide with bottom-right hints */}
        {detailed.activeSymptoms.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5 max-w-[220px] sm:max-w-[300px]">
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
                  className={`gu-tag cursor-pointer transition active:scale-98 ${isDanger ? 'bad' : 'amber'}`}
                  title={`${symptom.label}: ${symptom.description}`}
                >
                  {symptom.iconType === 'leg' && <AlertCircle className="w-3 h-3" />}
                  {symptom.iconType === 'drop' && <Droplet className="w-3 h-3" />}
                  {symptom.iconType === 'cold' && <Thermometer className="w-3 h-3" />}
                  {symptom.iconType === 'wet' && <CloudRain className="w-3 h-3" />}
                  {symptom.iconType === 'pain' && <Zap className="w-3 h-3" />}
                  {symptom.iconType === 'energy' && <BatteryLow className="w-3 h-3" />}
                  {symptom.iconType === 'heart' && <Heart className="w-3 h-3" />}
                  {symptom.iconType === 'pill' && <Sparkles className="w-3 h-3" />}
                  {symptom.iconType === 'cough' && <AlertCircle className="w-3 h-3" />}
                  <span>{symptom.label}</span>
                </button>
              );
            })}
          </div>
        )}

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
            className="gu-hud-card flex items-center gap-2 px-3 py-1.5 cursor-pointer active:scale-98"
            title="Открыть самоосмотр организма (Клавиша C)"
          >
            <Activity className={`w-3.5 h-3.5 ${isCritical ? 'text-[#efa690]' : 'text-[#e0ab45]'}`} />
            <span className="text-[11px] font-semibold">
              Здоровье: {Math.round(player.needs.health)}%
            </span>
          </button>
        ) : (
          /* Main Menu Styled Diagnostics & Vitals Widget */
          <div className="gu-hud-card p-3 flex flex-col gap-2 w-[280px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#e0ab45] gu-cn">
                <Activity className="w-3.5 h-3.5" /> Состояние организма
              </span>
              <span className="text-[11px] font-mono text-[#a29e93]">{Math.round(player.needs.health)}% HP</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {/* Health */}
              <div className="gu-card-sm !p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#cfcbc1] flex items-center gap-1">
                    <Heart className="w-3 h-3 text-[#efa690]" /> Здоровье
                  </span>
                  <span className="gu-mono font-semibold text-white">
                    {Math.round(player.needs.health)}%
                  </span>
                </div>
                <div className={`gu-bar ${player.needs.health < 30 ? 'bad' : 'good'}`}>
                  <span style={{ width: `${player.needs.health}%` }} />
                </div>
              </div>

              {/* Energy */}
              <div className="gu-card-sm !p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#cfcbc1] flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[#e0ab45]" /> Бодрость
                  </span>
                  <span className="gu-mono font-semibold text-white">
                    {Math.round(player.needs.energy)}%
                  </span>
                </div>
                <div className="gu-bar">
                  <span style={{ width: `${player.needs.energy}%` }} />
                </div>
              </div>

              {/* Hunger */}
              <div className="gu-card-sm !p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#cfcbc1] flex items-center gap-1">
                    <Utensils className="w-3 h-3 text-[#e0ab45]" /> Сытость
                  </span>
                  <span className="gu-mono font-semibold text-white">
                    {Math.round(player.needs.hunger)}%
                  </span>
                </div>
                <div className={`gu-bar ${player.needs.hunger < 25 ? 'bad' : ''}`}>
                  <span style={{ width: `${player.needs.hunger}%` }} />
                </div>
              </div>

              {/* Thirst */}
              <div className="gu-card-sm !p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#cfcbc1] flex items-center gap-1">
                    <Droplet className="w-3 h-3 text-[#7dd3fc]" /> Жажда
                  </span>
                  <span className="gu-mono font-semibold text-white">
                    {Math.round(player.needs.thirst)}%
                  </span>
                </div>
                <div className={`gu-bar ${player.needs.thirst < 25 ? 'bad' : 'cold'}`}>
                  <span style={{ width: `${player.needs.thirst}%` }} />
                </div>
              </div>
            </div>

            <button
              id="hud-self-inspection-btn"
              onClick={onOpenSelfInspection}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenSelfInspection();
              }}
              className="gu-btn gu-btn-s gu-btn-xs gu-btn-block !justify-between"
            >
              <span className="flex items-center gap-2 text-[11px]">
                <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-[#efa690]' : 'bg-[#9ac985]'}`} />
                <span>{detailed.healthText}</span>
              </span>
              <span className="gu-kbd">C</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. CONSUMPTION PROGRESS BAR */}
      {isConsuming && player.consumption && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none gu-hud-card px-4 py-2.5 flex flex-col items-center gap-1.5 min-w-[230px]">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Package className="w-3.5 h-3.5 text-[#e0ab45]" />
            <span>{player.consumption.itemNameRu}</span>
            {player.consumption.tasteMessage && (
              <span className="text-white/60 italic">— {player.consumption.tasteMessage}</span>
            )}
          </div>
          <div className="gu-bar w-full">
            <span
              style={{
                width: `${((player.consumption.totalBites - player.consumption.bitesRemaining) / player.consumption.totalBites) * 100}%`
              }}
            />
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/55">
            ПРОЦЕСС: {player.consumption.totalBites - player.consumption.bitesRemaining}/{player.consumption.totalBites}
          </div>
        </div>
      )}

      {/* 4. BOTTOM DUAL HANDS & POCKETS HUD */}
      {!player.isInVehicle && (
        <div className={`fixed ${isMobileTouch ? 'bottom-1 sm:bottom-2' : 'bottom-4'} left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 sm:gap-2 pointer-events-auto`}>
          {/* MAIN INTERFACE ROW: LEFT HAND | SWAP | RIGHT HAND | INVENTORY BUTTON */}
          <div 
            id="player-dual-hands-hotbar"
            className={`flex items-center gap-2 transition-all ${
              isMobileTouch ? 'scale-75 sm:scale-85 md:scale-100 origin-bottom' : ''
            }`}
          >
            {/* --- HANDS SECTION --- */}
            <div className="flex items-center gap-2">
              {/* LEFT HAND */}
              <div 
                id="hud-left-hand-slot"
                onClick={() => handleHandClick('left')}
                onDoubleClick={() => onUseActiveHandItem?.()}
                title={leftItem ? `Левая рука: ${leftItem.nameRu} [Клик - выбрать, Даблклик - использовать]` : 'Левая рука (Свободна) [Клик для выбора]'}
                className={`relative w-14 h-14 rounded-lg border backdrop-blur-sm flex flex-col items-center justify-center transition-colors cursor-pointer select-none ${
                  activeHand === 'left'
                    ? 'border-[#c9922b] bg-[#141416]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'border-white/12 bg-[#141416]/80 hover:bg-[#1e1e22]/90 hover:border-white/25'
                }`}
              >
                <div className={`absolute top-1 left-1.5 text-[9px] font-mono font-semibold uppercase ${activeHand === 'left' ? 'text-[#f0c264]' : 'text-white/55'}`}>
                  Лев
                </div>
                {activeHand === 'left' && !leftItem?.maxPortions && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#e0ab45]" />
                )}

                {leftItem ? (
                  <>
                    <ItemIconCanvas itemId={leftItem.itemId} item={leftItem} size={28} />
                    {leftItem.surfaceTemperature !== undefined && leftItem.surfaceTemperature >= 52 && (
                      <span 
                        className="absolute -top-1 left-7 text-amber-400 z-10" 
                        title={`Горячо! ${leftItem.surfaceTemperature}°C`}
                      >
                        <Flame className="w-2.5 h-2.5 text-amber-400" />
                      </span>
                    )}
                    {leftItem.maxPortions && leftItem.maxPortions > 1 && (
                      <>
                        <span className="absolute top-1 right-1.5 text-[8px] font-mono font-bold text-[#f0c264]">
                          {leftItem.portions ?? leftItem.maxPortions}/{leftItem.maxPortions}
                        </span>
                        <div className="absolute bottom-1 left-1.5 right-1.5 h-[3px] bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#c9922b] rounded-full transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, ((leftItem.portions ?? leftItem.maxPortions) / leftItem.maxPortions) * 100))}%` }}
                          />
                        </div>
                      </>
                    )}
                    {leftItem.count > 1 && (
                      <span className="absolute bottom-1 right-1.5 text-[9px] font-mono font-bold text-white">
                        x{leftItem.count}
                      </span>
                    )}
                    <button
                      onClick={(e) => handleStowHand(e, 'left')}
                      className="absolute bottom-1 left-1 p-0.5 rounded text-white/60 hover:text-[#f0c264] transition z-10 cursor-pointer"
                      title="Убрать в карман"
                    >
                      <ArrowDownToLine className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <Hand className="w-5 h-5 text-white/35 stroke-[1.5]" />
                )}
              </div>

              {/* SWAP / TOGGLE HANDS BUTTON */}
              <button
                id="hud-swap-hands-btn"
                onClick={handleSwapHands}
                className="hud-btn !h-14 !min-w-0 flex-col !gap-0.5 !px-2.5"
                title="Переключить / Поменять руки местами (Клавиша Q)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span className="text-[9px] font-mono">Q</span>
              </button>

              {/* RIGHT HAND */}
              <div 
                id="hud-right-hand-slot"
                onClick={() => handleHandClick('right')}
                onDoubleClick={() => onUseActiveHandItem?.()}
                title={rightItem ? `Правая рука: ${rightItem.nameRu} [Клик - выбрать, Даблклик - использовать]` : 'Правая рука (Свободна) [Клик для выбора]'}
                className={`relative w-14 h-14 rounded-lg border backdrop-blur-sm flex flex-col items-center justify-center transition-colors cursor-pointer select-none ${
                  activeHand === 'right'
                    ? 'border-[#c9922b] bg-[#141416]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'border-white/12 bg-[#141416]/80 hover:bg-[#1e1e22]/90 hover:border-white/25'
                }`}
              >
                <div className={`absolute top-1 left-1.5 text-[9px] font-mono font-semibold uppercase ${activeHand === 'right' ? 'text-[#f0c264]' : 'text-white/55'}`}>
                  Прав
                </div>
                {activeHand === 'right' && !rightItem?.maxPortions && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#e0ab45]" />
                )}

                {rightItem ? (
                  <>
                    <ItemIconCanvas itemId={rightItem.itemId} item={rightItem} size={28} />
                    {rightItem.surfaceTemperature !== undefined && rightItem.surfaceTemperature >= 52 && (
                      <span 
                        className="absolute -top-1 left-7 text-amber-400 z-10" 
                        title={`Горячо! ${rightItem.surfaceTemperature}°C`}
                      >
                        <Flame className="w-2.5 h-2.5 text-amber-400" />
                      </span>
                    )}
                    {rightItem.maxPortions && rightItem.maxPortions > 1 && (
                      <>
                        <span className="absolute top-1 right-1.5 text-[8px] font-mono font-bold text-[#f0c264]">
                          {rightItem.portions ?? rightItem.maxPortions}/{rightItem.maxPortions}
                        </span>
                        <div className="absolute bottom-1 left-1.5 right-1.5 h-[3px] bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#c9922b] rounded-full transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, ((rightItem.portions ?? rightItem.maxPortions) / rightItem.maxPortions) * 100))}%` }}
                          />
                        </div>
                      </>
                    )}
                    {rightItem.count > 1 && (
                      <span className="absolute bottom-1 right-1.5 text-[9px] font-mono font-bold text-white">
                        x{rightItem.count}
                      </span>
                    )}
                    <button
                      onClick={(e) => handleStowHand(e, 'right')}
                      className="absolute bottom-1 left-1 p-0.5 rounded text-white/60 hover:text-[#f0c264] transition z-10 cursor-pointer"
                      title="Убрать в карман"
                    >
                      <ArrowDownToLine className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <Hand className="w-5 h-5 text-white/35 stroke-[1.5]" />
                )}
              </div>
            </div>

            {/* Dedicated Inventory Button */}
            <button
              id="hotbar-bag-toggle-btn"
              onClick={onOpenInventory}
              className="hud-btn !h-14 flex-col !gap-1 !px-3.5"
              title="Открыть полный инвентарь (Клавиша I или Tab)"
            >
              <Package className="w-5 h-5" />
              <span className="text-[9px]">Рюкзак [I]</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

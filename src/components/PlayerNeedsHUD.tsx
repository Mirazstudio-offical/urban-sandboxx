import React, { useState } from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import { isPlayerNearTrashBin, isPlayerNearEcoVending } from '../items';
import { getDetailedBodySensations, getBodyPartLabel, getBodyPartStatusText } from '../sensations';
import { ItemIconCanvas } from './ItemIconCanvas';
import { Package, Heart, Sparkles, AlertCircle, Eye, Activity, Droplet, CloudRain, Thermometer, Zap, BatteryLow, Volume2, Trash2 } from 'lucide-react';

interface PlayerNeedsHUDProps {
  player: Player | null;
  world?: GameWorld | null;
  onOpenInventory: () => void;
  onOpenSelfInspection: () => void;
  onSelectHotbarItem?: (index: number) => void;
  onSelectHotbarIndex?: (index: number) => void;
  onUseHotbarItem?: (index: number) => void;
  selectedHotbarIndex: number;
}

export const PlayerNeedsHUD: React.FC<PlayerNeedsHUDProps> = ({
  player,
  world,
  onOpenInventory,
  onOpenSelfInspection,
  onSelectHotbarItem,
  onSelectHotbarIndex,
  onUseHotbarItem,
  selectedHotbarIndex
}) => {
  if (!player || !player.needs) return null;

  const handleSelectSlot = (idx: number) => {
    onSelectHotbarItem?.(idx);
    onSelectHotbarIndex?.(idx);
  };

  const selectedItem: InventoryItem | undefined = player.inventory?.[selectedHotbarIndex];

  const bs = player.bodyState;
  const detailed = getDetailedBodySensations(player);

  const isNearLitter = world && world.litter ? world.litter.some(lit => !lit.isAirborne && Math.hypot(player.x - lit.x, player.y - lit.y) < 65) : false;
  const isNearTrash = world ? isPlayerNearTrashBin(player, world) : false;
  const isNearEco = world ? isPlayerNearEcoVending(player, world) : false;

  const isCritical = player.needs.health < 30 || bs?.painLevel! > 60;
  const isDehydrated = player.needs.thirst < 25;
  const isWet = bs ? bs.wetness > 50 : false;
  const isCold = bs ? bs.temperature < 35.8 : false;
  const isPainful = bs ? bs.painLevel > 35 : false;
  const isExhausted = player.needs.energy < 20;
  const isNauseous = (player.needs.nausea || 0) > 30;
  const isStuffed = (player.needs.fullness || 0) > 90;
  const isConsuming = !!player.consumption?.isConsuming;

  const hasLegInjury = bs?.bodyParts && (bs.bodyParts.leftLeg.some(i => !i.treated) || bs.bodyParts.rightLeg.some(i => !i.treated));
  const hasArmInjury = bs?.bodyParts && (bs.bodyParts.leftArm.some(i => !i.treated) || bs.bodyParts.rightArm.some(i => !i.treated));

  const tinnitusActive = (bs?.tinnitusTimer || 0) > 0;
  const impactFlashActive = (bs?.impactFlashTimer || 0) > 0;

  return (
    <>
      {/* 1. SENSORY ALERTS & TINNITUS */}
      {/* Tinnitus Sound Indication Overlay */}
      {tinnitusActive && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-none z-50 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 backdrop-blur-md text-amber-200 text-xs font-bold flex items-center gap-2 animate-bounce">
          <Volume2 className="w-4 h-4 animate-spin" />
          <span>Звон в ушах... (Контузия)</span>
        </div>
      )}

      {/* 2. BODY SENSATIONS & INSPECTION HUD PANEL (Positioned bottom-right on foot, moved under minimap when driving) */}
      <div 
        id="bottom-right-symptoms-bar"
        className={`fixed z-40 flex flex-col items-end gap-1.5 pointer-events-auto transition-all duration-300 ${
          player.isInVehicle 
            ? 'top-[160px] right-4' 
            : 'bottom-4 right-4'
        }`}
      >
        {/* Inspection Button Trigger (Key [C]) */}
        <button
          id="hud-self-inspection-btn"
          onClick={onOpenSelfInspection}
          className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-950/95 hover:bg-slate-900 active:scale-95 border border-slate-700 rounded-lg shadow-2xl text-slate-200 transition font-mono"
          title="Открыть самоосмотр организма (Клавиша C)"
        >
          <div className={`p-1 rounded bg-slate-900 ${isCritical ? 'text-rose-400' : 'text-slate-300'}`}>
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400 flex items-center gap-1.5">
              <span>СОСТОЯНИЕ</span>
              <span className="px-1 bg-slate-900 rounded text-[9px] font-mono border border-slate-700 text-slate-300">C</span>
            </div>
            <div className="text-xs font-medium text-slate-200 line-clamp-1 max-w-[150px]">
              {detailed.healthText}
            </div>
          </div>
        </button>

        {/* Dynamic Symptom Badges */}
        <div className="flex flex-wrap justify-end gap-1 max-w-[320px]">
          {detailed.activeSymptoms.map((symptom) => {
            const isDanger = symptom.severity === 'danger';
            return (
              <button
                key={symptom.id}
                onClick={onOpenSelfInspection}
                className={`flex items-center gap-1.5 px-2 py-1 border rounded text-[11px] font-mono shadow backdrop-blur-sm transition ${
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

      {/* 4. CONSUMPTION PROGRESS BAR */}
      {isConsuming && player.consumption && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-1">
          <div className="px-3 py-1 bg-slate-950/95 border border-slate-700 rounded text-xs font-mono text-slate-200 shadow-lg flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>{player.consumption.itemNameRu}</span>
            {player.consumption.tasteMessage && (
              <span className="ml-2 text-slate-400 italic">— {player.consumption.tasteMessage}</span>
            )}
          </div>
          <div className="w-48 h-1.5 bg-slate-900 rounded-none overflow-hidden border border-slate-700">
            <div 
              className="h-full bg-slate-300 rounded-none transition-all duration-200"
              style={{ width: `${((player.consumption.totalBites - player.consumption.bitesRemaining) / player.consumption.totalBites) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            ПРОЦЕСС: {player.consumption.totalBites - player.consumption.bitesRemaining}/{player.consumption.totalBites}
          </div>
        </div>
      )}

      {/* 5. BOTTOM QUICK HOTBAR & INTERACTION PROMPTS */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none">
        {/* Active Hotbar Selected Item Interaction Prompt [E] */}
        {!player.isInVehicle && selectedItem && selectedItem.usable && (
          <div 
            id="hud-hotbar-use-prompt"
            onClick={() => onUseHotbarItem?.(selectedHotbarIndex)}
            className="px-4 py-2 bg-slate-950/95 border border-emerald-500/60 rounded-lg shadow-2xl text-emerald-300 text-xs font-mono uppercase tracking-wider flex items-center gap-2.5 pointer-events-auto cursor-pointer hover:bg-slate-900 active:scale-95 transition animate-fadeIn backdrop-blur-md"
            title="Нажмите E или кликните здесь для использования"
          >
            <span className="px-1.5 py-0.5 bg-emerald-950/90 border border-emerald-500/50 rounded text-[10px] font-bold text-emerald-300">
              E
            </span>
            <span>
              {selectedItem.category === 'food' 
                ? (selectedItem.maxPortions && selectedItem.maxPortions > 1 
                    ? `Сделать укус (${selectedItem.portions ?? selectedItem.maxPortions}/${selectedItem.maxPortions}): ${selectedItem.nameRu}`
                    : `Съесть: ${selectedItem.nameRu}`)
                : selectedItem.category === 'drink'
                ? (selectedItem.maxPortions && selectedItem.maxPortions > 1
                    ? `Сделать глоток (${selectedItem.portions ?? selectedItem.maxPortions}/${selectedItem.maxPortions}): ${selectedItem.nameRu}`
                    : `Выпить: ${selectedItem.nameRu}`)
                : selectedItem.category === 'med'
                ? (selectedItem.maxPortions && selectedItem.maxPortions > 1
                    ? `Принять дозу (${selectedItem.portions ?? selectedItem.maxPortions}/${selectedItem.maxPortions}): ${selectedItem.nameRu}`
                    : `Применить: ${selectedItem.nameRu}`)
                : `Использовать: ${selectedItem.nameRu}`}
            </span>
          </div>
        )}

        {isNearLitter && (
          <div 
            onClick={() => {
              if (world && player) {
                const worldObj = world;
                const playerObj = player;
                import('../items').then(mod => {
                  mod.pickupNearbyLitter(playerObj, worldObj);
                });
              }
            }}
            className="px-4 py-2 bg-slate-950/95 border border-slate-600 rounded-lg shadow-xl text-slate-200 text-xs font-mono uppercase tracking-wider flex items-center gap-2 pointer-events-auto cursor-pointer hover:bg-slate-900 transition"
          >
            <Sparkles className="w-4 h-4 text-slate-400" />
            <span>[ТАП] ПОДОБРАТЬ ВТОРСЫРЬЕ</span>
          </div>
        )}
        {isNearEco && (
          <div 
            onClick={onOpenInventory}
            className="px-4 py-2 bg-slate-950/95 border border-slate-600 rounded-lg shadow-xl text-slate-200 text-xs font-mono uppercase tracking-wider flex items-center gap-2 pointer-events-auto cursor-pointer hover:bg-slate-900 transition"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
            <span>[I] ЭКО-ФАНТОМАТ: СДАТЬ ТАРУ (+$5)</span>
          </div>
        )}
        {isNearTrash && !isNearEco && (
          <div 
            onClick={onOpenInventory}
            className="px-4 py-2 bg-slate-950/95 border border-slate-600 rounded-lg shadow-xl text-slate-200 text-xs font-mono uppercase tracking-wider flex items-center gap-2 pointer-events-auto cursor-pointer hover:bg-slate-900 transition"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
            <span>[I] УРНА: ВЫБРОСИТЬ ПРЕДМЕТ</span>
          </div>
        )}
      </div>

      {!player.isInVehicle && (
        <div 
          id="player-quick-hotbar"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-1.5 bg-slate-950/95 backdrop-blur-md border border-slate-800 p-2 rounded-xl shadow-2xl"
        >
          {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
            const item: InventoryItem | undefined = player.inventory?.[slotIdx];
            const isSelected = selectedHotbarIndex === slotIdx;
            const hasPortions = item && item.maxPortions && item.maxPortions > 1;
            const remainingPortions = item ? (item.portions ?? item.maxPortions ?? 1) : 0;
            const maxPortions = item?.maxPortions || 1;

            return (
              <button
                key={slotIdx}
                id={`hotbar-slot-${slotIdx + 1}`}
                onClick={() => handleSelectSlot(slotIdx)}
                onDoubleClick={() => onUseHotbarItem?.(slotIdx)}
                title={
                  item 
                    ? `${item.nameRu}${hasPortions ? ` (${remainingPortions}/${maxPortions} ост.)` : ''} [Клавиша ${slotIdx + 1}]` 
                    : `Пустой слот [${slotIdx + 1}]`
                }
                className={`relative w-12 h-12 md:w-14 md:h-14 rounded-lg border flex flex-col items-center justify-center transition-all ${
                  isSelected 
                    ? 'border-sky-400 bg-sky-950/60 shadow-lg ring-2 ring-sky-400/40 scale-105' 
                    : item
                    ? 'border-slate-700 bg-slate-900/80 hover:bg-slate-800 hover:border-slate-500'
                    : 'border-slate-800/80 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-slate-500">
                  {slotIdx + 1}
                </span>

                {item ? (
                  <>
                    <ItemIconCanvas itemId={item.itemId} size={28} />
                    
                    {/* Item count badge (if > 1) */}
                    {item.count > 1 && (
                      <span className="absolute top-1 right-1 px-1 bg-slate-950 border border-slate-700 rounded text-[9px] font-mono font-bold text-slate-300">
                        {item.count}
                      </span>
                    )}

                    {/* Portions gauge / label */}
                    {hasPortions && (
                      <div className="absolute bottom-0.5 left-1 right-1 flex flex-col items-center gap-0.5 pointer-events-none">
                        <div className="w-full bg-slate-950/90 h-1 rounded-full overflow-hidden border border-slate-700/80">
                          <div 
                            className="h-full bg-sky-400 rounded-full transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, (remainingPortions / maxPortions) * 100))}%` }}
                          />
                        </div>
                        <span className="text-[7.5px] font-mono font-bold text-sky-300 leading-none">
                          {remainingPortions}/{maxPortions}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-none bg-slate-800" />
                )}
              </button>
            );
          })}

          {/* Dedicated Inventory Button */}
          <button
            id="hotbar-bag-toggle-btn"
            onClick={onOpenInventory}
            className="ml-1.5 px-3.5 h-12 md:h-14 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 font-mono font-bold rounded-lg border border-slate-700 shadow-lg flex flex-col items-center justify-center gap-0.5 transition"
          >
            <Package className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
            <span className="text-[9px] tracking-widest uppercase">РЮКЗАК</span>
          </button>
        </div>
      )}
    </>
  );
};

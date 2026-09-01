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
  onUseHotbarItem: (index: number) => void;
  selectedHotbarIndex: number;
}

export const PlayerNeedsHUD: React.FC<PlayerNeedsHUDProps> = ({
  player,
  world,
  onOpenInventory,
  onOpenSelfInspection,
  onUseHotbarItem,
  selectedHotbarIndex
}) => {
  if (!player || !player.needs) return null;

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

  const hasLegInjury = bs?.bodyParts && (bs.bodyParts.leftLeg.some(i => !i.treated) || bs.bodyParts.rightLeg.some(i => !i.treated));
  const hasArmInjury = bs?.bodyParts && (bs.bodyParts.leftArm.some(i => !i.treated) || bs.bodyParts.rightArm.some(i => !i.treated));

  const tinnitusActive = (bs?.tinnitusTimer || 0) > 0;
  const impactFlashActive = (bs?.impactFlashTimer || 0) > 0;

  return (
    <>
      {/* 1. DYNAMIC SCREEN SENSORY VIGNETTES & FILTERS */}
      {/* Heavy Impact White Flash */}
      {impactFlashActive && (
        <div className="fixed inset-0 pointer-events-none z-50 bg-white/40 backdrop-blur-[2px] transition-all animate-pulse" />
      )}

      {/* Tinnitus Sound Indication Overlay */}
      {tinnitusActive && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-none z-50 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 backdrop-blur-md text-amber-200 text-xs font-bold flex items-center gap-2 animate-bounce">
          <Volume2 className="w-4 h-4 animate-spin" />
          <span>Звон в ушах... (Оглушение)</span>
        </div>
      )}

      {/* Severe Pain / Bleeding Red Vignette */}
      {isCritical && (
        <div className="fixed inset-0 pointer-events-none z-30 ring-[20px] ring-red-600/50 ring-inset animate-pulse bg-red-950/20 backdrop-blur-[1px]" />
      )}

      {/* Dehydration Dryness Filter Overlay */}
      {isDehydrated && !isCritical && (
        <div 
          className="fixed inset-0 pointer-events-none z-30 ring-[14px] ring-amber-500/30 ring-inset bg-amber-950/10"
          style={{ backdropFilter: 'contrast(0.85) saturate(0.6)' }}
        />
      )}

      {/* Cold / Wetness Tunnel Vignette */}
      {(isCold || isWet) && !isCritical && (
        <div className="fixed inset-0 pointer-events-none z-30 ring-[14px] ring-sky-500/30 ring-inset bg-sky-950/10" />
      )}

      {/* 2. BOTTOM-RIGHT BODY SENSATIONS & INSPECTION HUD PANEL (Replaces Minimap) */}
      <div 
        id="bottom-right-symptoms-bar"
        className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 pointer-events-auto"
      >
        {/* Inspection Button Trigger (Key [C]) */}
        <button
          id="hud-self-inspection-btn"
          onClick={onOpenSelfInspection}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 active:scale-95 border border-slate-700/80 rounded-2xl shadow-xl text-slate-100 transition"
          title="Открыть самоосмотр организма (Клавиша C)"
        >
          <div className={`p-1.5 rounded-xl ${isCritical ? 'bg-rose-950 text-rose-400 animate-pulse' : 'bg-slate-800 text-sky-400'}`}>
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-[9px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1">
              <span>Самоосмотр</span>
              <span className="px-1 bg-slate-800 rounded text-[9px] font-mono border border-slate-700">C</span>
            </div>
            <div className="text-xs font-semibold text-slate-200 line-clamp-1 max-w-[140px]">
              {detailed.healthText}
            </div>
          </div>
        </button>

        {/* Dynamic Symptom Badges */}
        <div className="flex flex-wrap justify-end gap-1.5 max-w-[280px]">
          {/* Leg Injury / Limping */}
          {hasLegInjury && (
            <button
              onClick={onOpenSelfInspection}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-950/90 border border-rose-600/80 rounded-xl text-xs font-semibold text-rose-200 shadow-md animate-pulse"
              title="Травма ног: хромота и замедление шага"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Травма ног</span>
            </button>
          )}

          {/* Pain Badge */}
          {isPainful && (
            <button
              onClick={onOpenSelfInspection}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/90 border border-amber-600/80 rounded-xl text-xs font-semibold text-amber-200 shadow-md"
              title="Боль в теле"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Боль</span>
            </button>
          )}

          {/* Wetness Badge */}
          {isWet && (
            <button
              onClick={onOpenSelfInspection}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-950/90 border border-sky-600/80 rounded-xl text-xs font-semibold text-sky-200 shadow-md"
              title="Промокшая одежда"
            >
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
              <span>Промок</span>
            </button>
          )}

          {/* Cold / Chills Badge */}
          {isCold && (
            <button
              onClick={onOpenSelfInspection}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-950/90 border border-blue-600/80 rounded-xl text-xs font-semibold text-blue-200 shadow-md"
              title="Переохлаждение / Озноб"
            >
              <Thermometer className="w-3.5 h-3.5 text-blue-400" />
              <span>Озноб</span>
            </button>
          )}

          {/* Dehydration Badge */}
          {isDehydrated && (
            <button
              onClick={onOpenSelfInspection}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-950/90 border border-cyan-600/80 rounded-xl text-xs font-semibold text-cyan-200 shadow-md"
              title="Жажда и сухость во рту"
            >
              <Droplet className="w-3.5 h-3.5 text-cyan-400" />
              <span>Жажда</span>
            </button>
          )}

          {/* Exhaustion Badge */}
          {isExhausted && (
            <button
              onClick={onOpenSelfInspection}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-300 shadow-md"
              title="Истощение сил"
            >
              <BatteryLow className="w-3.5 h-3.5 text-slate-400" />
              <span>Усталость</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. DYNAMIC NOTIFICATIONS FEED (Top Left) */}
      <div 
        id="player-vitals-notifications"
        className="fixed top-16 left-4 z-40 flex flex-col gap-2 pointer-events-none"
      >
        {player.notifications && player.notifications.length > 0 && (
          <div className="flex flex-col gap-1.5 pointer-events-none">
            {player.notifications.map((notif) => (
              <div
                key={notif.id}
                className={`px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-lg text-xs font-semibold flex items-center gap-2 transition-all transform animate-fadeIn ${
                  notif.type === 'heal' 
                    ? 'bg-rose-950/90 border-rose-600 text-rose-200' 
                    : notif.type === 'food'
                    ? 'bg-amber-950/90 border-amber-600 text-amber-200'
                    : notif.type === 'drink'
                    ? 'bg-cyan-950/90 border-cyan-600 text-cyan-200'
                    : notif.type === 'warning'
                    ? 'bg-red-950/90 border-red-500 text-red-200'
                    : notif.type === 'sleep'
                    ? 'bg-purple-950/90 border-purple-600 text-purple-200'
                    : 'bg-slate-900/90 border-sky-600 text-sky-200'
                }`}
              >
                <span>{notif.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. BOTTOM QUICK HOTBAR WITH PROCEDURAL 2D ITEM MODELS */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none">
        {isNearLitter && (
          <div 
            onClick={() => {
              if (world && player) {
                // Trigger pickup
                // We can import pickupNearbyLitter or dispatch interact
                const worldObj = world;
                const playerObj = player;
                import('../items').then(mod => {
                  mod.pickupNearbyLitter(playerObj, worldObj);
                });
              }
            }}
            className="px-4 py-2 bg-slate-900/95 border border-sky-500/80 rounded-2xl shadow-xl text-sky-200 text-xs font-bold flex items-center gap-2 animate-bounce pointer-events-auto cursor-pointer hover:bg-slate-800 transition"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>[E / Тап] Подобрать вторсырье (банки/бутылки)</span>
          </div>
        )}
        {isNearEco && (
          <div 
            onClick={onOpenInventory}
            className="px-4 py-2 bg-slate-900/95 border border-emerald-500/80 rounded-2xl shadow-xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-bounce pointer-events-auto cursor-pointer hover:bg-slate-800 transition"
          >
            <Trash2 className="w-4 h-4 text-emerald-400" />
            <span>[I / Инвентарь] Эко-фантомат рядом: сдать тару (+$5/шт)</span>
          </div>
        )}
        {isNearTrash && !isNearEco && (
          <div 
            onClick={onOpenInventory}
            className="px-4 py-2 bg-slate-900/95 border border-slate-500/80 rounded-2xl shadow-xl text-slate-200 text-xs font-bold flex items-center gap-2 animate-bounce pointer-events-auto cursor-pointer hover:bg-slate-800 transition"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
            <span>[I / Инвентарь] Урна рядом: выбросить предмет</span>
          </div>
        )}
      </div>

      <div 
        id="player-quick-hotbar"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-2 rounded-2xl shadow-2xl"
      >
        {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
          const item: InventoryItem | undefined = player.inventory?.[slotIdx];
          const isSelected = selectedHotbarIndex === slotIdx;

          return (
            <button
              key={slotIdx}
              id={`hotbar-slot-${slotIdx + 1}`}
              onClick={() => onUseHotbarItem(slotIdx)}
              title={item ? `${item.nameRu} [Клавиша ${slotIdx + 1}]` : `Пустой слот [${slotIdx + 1}]`}
              className={`relative w-12 h-12 md:w-14 md:h-14 rounded-xl border flex flex-col items-center justify-center transition-all ${
                isSelected 
                  ? 'border-sky-400 bg-sky-950/60 shadow-md ring-2 ring-sky-400/40 scale-105' 
                  : item
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 hover:border-slate-500 active:scale-95'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
              }`}
            >
              <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-slate-400">
                {slotIdx + 1}
              </span>

              {item ? (
                <>
                  <ItemIconCanvas itemId={item.itemId} size={32} />
                  {item.count > 1 && (
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-slate-900/90 border border-slate-700 rounded text-[9px] font-mono font-bold text-slate-200">
                      {item.count}
                    </span>
                  )}
                </>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
              )}
            </button>
          );
        })}

        {/* Dedicated Inventory Button */}
        <button
          id="hotbar-bag-toggle-btn"
          onClick={onOpenInventory}
          className="ml-1.5 px-3.5 h-12 md:h-14 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-95 text-white font-bold rounded-xl border border-sky-400/40 shadow-lg flex flex-col items-center justify-center gap-0.5 transition"
        >
          <Package className="w-4 h-4 md:w-5 md:h-5" />
          <span className="text-[10px] tracking-tight uppercase">Инвентарь</span>
        </button>
      </div>
    </>
  );
};

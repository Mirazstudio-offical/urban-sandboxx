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
  Flame,
  Crosshair,
  RotateCw,
  Shield,
  Gauge,
  AlertTriangle
} from 'lucide-react';
import {
  AMMO_SPECS,
  getFireModeLabelRu,
  getWeaponCurrentAmmoCount,
  getWeaponEffectiveCo2,
} from '../weaponData';
import {
  cycleWeaponFireMode,
  getActiveHeldWeapon,
  inspectOrPumpWeapon,
  startWeaponReload,
} from '../weaponSystem';

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
  onUseHotbarItem,
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
                    <Zap className="w-3 h-3 text-[#e0ab45]" /> Выносливость
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
        <div className={`fixed ${isMobileTouch ? 'bottom-1 sm:bottom-2' : 'bottom-4'} left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 pointer-events-auto`}>
          {/* 6-SLOT POCKET QUICK HOTBAR [1..6] */}
          <div
            id="player-pocket-quick-hotbar"
            className={`flex items-center gap-1.5 transition-all ${
              isMobileTouch ? 'scale-75 sm:scale-85 md:scale-100 origin-bottom' : ''
            }`}
          >
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const slotItem = player.inventory[idx];
              const fluidPct =
                slotItem?.fluidStorage && slotItem.fluidStorage.maxMl > 0
                  ? Math.max(0, Math.min(100, Math.round((slotItem.fluidStorage.currentMl / slotItem.fluidStorage.maxMl) * 100)))
                  : slotItem?.maxPortions && slotItem.maxPortions > 1
                  ? Math.max(0, Math.min(100, Math.round(((slotItem.portions ?? slotItem.maxPortions) / slotItem.maxPortions) * 100)))
                  : null;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => slotItem && onUseHotbarItem?.(idx)}
                  title={
                    slotItem
                      ? `[${idx + 1}] ${slotItem.nameRu} — клик или клавиша ${idx + 1} (взять в руку / применить)`
                      : `Слот кармана ${idx + 1} пуст`
                  }
                  className={`relative w-10 h-10 rounded-md border flex items-center justify-center transition-colors select-none ${
                    slotItem
                      ? 'border-white/15 bg-[#141416]/92 hover:bg-[#1e1e22]/95 hover:border-[#c9922b]/75 cursor-pointer'
                      : 'border-white/8 bg-[#101012]/75 cursor-default'
                  }`}
                >
                  <span className="absolute top-0.5 left-1 text-[8px] font-mono font-semibold text-white/45">
                    {idx + 1}
                  </span>
                  {slotItem && (
                    <>
                      <ItemIconCanvas itemId={slotItem.itemId} item={slotItem} size={22} />
                      {slotItem.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold text-white">
                          x{slotItem.count}
                        </span>
                      )}
                      {fluidPct !== null && (
                        <div className="absolute bottom-0.5 left-1 right-1 h-[2px] bg-white/15 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#c9922b] rounded-full"
                            style={{ width: `${fluidPct}%` }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

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
                className={`relative w-14 h-14 rounded-lg border flex flex-col items-center justify-center transition-colors cursor-pointer select-none ${
                  activeHand === 'left'
                    ? 'border-[#c9922b] bg-[#141416]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'border-white/12 bg-[#141416]/90 hover:bg-[#1e1e22]/95 hover:border-white/25'
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
                className={`relative w-14 h-14 rounded-lg border flex flex-col items-center justify-center transition-colors cursor-pointer select-none ${
                  activeHand === 'right'
                    ? 'border-[#c9922b] bg-[#141416]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'border-white/12 bg-[#141416]/90 hover:bg-[#1e1e22]/95 hover:border-white/25'
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

      {/* 4. ACTIVE WEAPON HUD CARD (Firearms & Pneumatics — Main Menu Obsidian/Amber Standard) */}
      {!player.isInVehicle && (() => {
        const heldWpn = getActiveHeldWeapon(player);
        if (!heldWpn) return null;
        const { item: wItem, spec: wSpec, state: ws } = heldWpn;
        const counts = getWeaponCurrentAmmoCount(wItem);
        const rt = player.weaponRuntime;
        const nextAmmo = counts.nextAmmoId ? AMMO_SPECS[counts.nextAmmoId] : null;
        const reload = rt?.reloadState;

        let ammoDisplay = `${counts.mag}/${counts.maxMag}`;
        if (wSpec.feedType === 'break_double') {
          ammoDisplay = `${counts.total}/2`;
        } else if (wSpec.feedType === 'break_single') {
          ammoDisplay = `${counts.total}/1`;
        } else if (wSpec.feedType === 'cylinder' || wSpec.weaponClass === 'pneumatic') {
          ammoDisplay = `${counts.total}/${counts.maxMag}`;
        } else if (counts.chamber > 0) {
          ammoDisplay = `${counts.mag}+1/${counts.maxMag}`;
        }

        let propLabel: string | null = null;
        let propPct: number | null = null;
        if (wSpec.propellant === 'co2_12g') {
          const co2 = Math.round(getWeaponEffectiveCo2(ws));
          propLabel = `CO2 ${co2}%`;
          propPct = co2;
        } else if (wSpec.propellant === 'pcp_tank') {
          const bar = Math.round(ws.pcpPressureBar ?? 0);
          const maxBar = wSpec.pcpMaxBar || 250;
          propLabel = `${bar}/${maxBar} бар`;
          propPct = Math.round((bar / maxBar) * 100);
        } else if (wSpec.propellant === 'multi_pump') {
          const st = ws.pumpStrokes ?? 0;
          const maxSt = wSpec.maxPumpStrokes || 10;
          propLabel = `Накачка ${st}/${maxSt}`;
          propPct = Math.round((st / maxSt) * 100);
        } else if (wSpec.propellant === 'spring_piston') {
          propLabel = ws.isCocked ? 'Пружина взведена' : 'Не взведена';
          propPct = ws.isCocked ? 100 : 0;
        }

        return (
          <div
            id="weapon-status-hud"
            className={`fixed z-30 pointer-events-auto gu-hud-card px-3 py-2 flex flex-col gap-1.5 min-w-[238px] max-w-[290px] ${
              isMobileTouch ? 'bottom-[138px] right-3' : 'bottom-[168px] right-4'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Crosshair className="w-3.5 h-3.5 text-[#e0ab45] shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#f2eee7] truncate">
                  {wSpec.shortNameRu}
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-[#d4a34f] shrink-0 tabular-nums">
                {wSpec.caliberRu}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className={`text-lg font-mono font-extrabold leading-none ${counts.total === 0 ? 'text-red-400' : 'text-white'}`}>
                  {ammoDisplay}
                </span>
                <span className="text-[10px] font-mono text-white/60 truncate max-w-[125px]">
                  {nextAmmo ? nextAmmo.shortLabelRu : 'Нет патронов'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => cycleWeaponFireMode(player)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                  ws.fireMode === 'safe'
                    ? 'border-red-500/50 bg-red-500/15 text-red-300'
                    : 'border-[#c9922b]/50 bg-[#c9922b]/15 text-[#f0c264]'
                }`}
                title="Переключить режим огня / предохранитель (Клавиша B)"
              >
                {getFireModeLabelRu(ws.fireMode)} [B]
              </button>
            </div>

            {ws.isJammed && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-red-300 bg-red-500/15 border border-red-500/40 rounded px-2 py-0.5">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Клин затвора — нажмите R</span>
              </div>
            )}

            {propLabel && propPct !== null && (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-white/75 tabular-nums">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-[#38bdf8]" />
                    {propLabel}
                  </span>
                  {wSpec.propellant === 'multi_pump' && (
                    <span className="text-[#f0c264]">[V] качать</span>
                  )}
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#38bdf8] transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, propPct))}%` }}
                  />
                </div>
              </div>
            )}

            {reload && (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#f0c264] tabular-nums">
                  <span>{reload.labelRu}</span>
                  <span>{Math.round(Math.min(100, reload.progress * 100))}%</span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#e0ab45]"
                    style={{ width: `${Math.max(0, Math.min(100, reload.progress * 100))}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-1.5 pt-0.5 border-t border-white/10">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startWeaponReload(player)}
                  className="px-2 py-0.5 rounded bg-white/8 hover:bg-white/15 border border-white/12 text-[10px] font-mono text-white/90 flex items-center gap-1 cursor-pointer"
                  title="Перезарядка / взведение / устранение клина (R)"
                >
                  <RotateCw className="w-2.5 h-2.5" />
                  <span>[R]</span>
                </button>
                <button
                  type="button"
                  onClick={() => inspectOrPumpWeapon(player)}
                  className="px-2 py-0.5 rounded bg-white/8 hover:bg-white/15 border border-white/12 text-[10px] font-mono text-white/90 flex items-center gap-1 cursor-pointer"
                  title={wSpec.propellant === 'multi_pump' ? 'Накачать давление (V)' : 'Осмотр патронника и состояния (V)'}
                >
                  <Shield className="w-2.5 h-2.5" />
                  <span>{wSpec.propellant === 'multi_pump' ? 'Кач [V]' : '[V]'}</span>
                </button>
              </div>
              <span className="text-[9px] font-mono text-white/50 whitespace-nowrap">
                ПКМ прицел · Shift вдох
              </span>
            </div>
          </div>
        );
      })()}
    </>
  );
};

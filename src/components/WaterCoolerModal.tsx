import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import {
  FurnitureStorage,
  COOLER_CONFIG,
  ensureCoolerState,
  toggleCoolerCold,
  toggleCoolerHot,
  dispenseCoolerIntoItem,
  drinkFromCooler,
  replaceCoolerBottle,
  refillCoolerBottleFromItem,
  getFurnitureStorageTotalVolume,
  getFurnitureStorageTotalWeight,
  addItemToFurnitureStorage,
  removeItemFromFurnitureStorage,
  canItemFitInFurniture,
  saveFurnitureStoragesToLocalStorage,
} from '../furnitureStorageSystem';
import {
  addItemToPlayer,
  removeItemFromPlayer,
  moveInventoryItem,
  canItemFitInCompartment,
  getPlayerPocketCapacity,
  getPlayerTotalCarriedWeight,
  getItemTotalWeight,
  getItemTotalVolume,
  getPlayerCompartments,
  putItemInHand,
  takeItemFromHand,
  stowItemFromHandToPockets,
} from '../items';
import { getEffectiveFluidWrapper } from '../interactionCrafting';
import { tickCoolerThermodynamics } from '../itemThermalSystem';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { useCachedSlotDrag } from './useCachedSlotDrag';
import { sound } from '../audio';
import kitchenFurnitureCss from './kitchenFurniture.css?inline';
import {
  Droplets,
  Snowflake,
  Flame,
  CupSoda,
  RefreshCw,
  Power,
  Hand,
  User,
  Shirt,
  Luggage,
  X,
} from 'lucide-react';

export interface WaterCoolerModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage: FurnitureStorage | null;
  player: Player | null;
  world?: GameWorld | null;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
}

function formatWeightRu(weightKg: number): string {
  if (!weightKg || weightKg <= 0) return '0 г';
  if (weightKg < 1) {
    const grams = weightKg < 0.01 ? Number((weightKg * 1000).toFixed(1)) : Math.round(weightKg * 1000);
    return `${grams} г`;
  }
  return `${Number(weightKg.toFixed(2))} кг`;
}

function getSlotFillInfo(item: InventoryItem | null | undefined): { pct: number | null; color?: string } {
  if (!item) return { pct: null };
  const wrapper = getEffectiveFluidWrapper(item);
  if (wrapper && wrapper.state.maxMl > 0) {
    const pct = Math.max(0, Math.min(100, Math.round((wrapper.state.currentMl / wrapper.state.maxMl) * 100)));
    return { pct, color: wrapper.state.currentMl > 0 ? '#68a490' : undefined };
  }
  if (item.isContainer && item.containerCapacityL) {
    const used = (item.contents || []).reduce((s, c) => s + (c ? getItemTotalVolume(c) : 0), 0);
    return { pct: Math.max(0, Math.min(100, Math.round((used / item.containerCapacityL) * 100))) };
  }
  return { pct: null };
}

function getTempColor(temp: number): string {
  if (temp >= 52) return '#f0884a';
  if (temp >= 34) return '#e0ab45';
  if (temp <= 14) return '#7dd3fc';
  return '#a29e93';
}

function describeCoolerItemSub(item: InventoryItem): string {
  const parts: string[] = [];
  const temp = Math.round(item.temperature ?? 20);
  parts.push(`${temp > 0 ? '+' : ''}${temp}°C`);
  const wrapper = getEffectiveFluidWrapper(item);
  if (wrapper && wrapper.state.maxMl > 0) {
    parts.push(`${Math.round(wrapper.state.currentMl)}/${Math.round(wrapper.state.maxMl)} мл`);
  } else {
    parts.push(formatWeightRu(getItemTotalWeight(item)));
  }
  return parts.join(' · ');
}

const CoolerBottleSvg: React.FC<{ bottlePct: number }> = ({ bottlePct }) => {
  const clamped = Math.max(0, Math.min(100, bottlePct));
  const waterH = Math.round((clamped / 100) * 44);
  const waterY = 58 - waterH;

  return (
    <svg width="100%" height="100%" viewBox="0 0 96 112" aria-hidden="true">
      {/* Upper 19L Inverted Carboy */}
      <path
        d="M28 16 Q28 10 34 10 L62 10 Q68 10 68 16 L68 54 Q68 60 58 62 L54 66 L42 66 L38 62 Q28 60 28 54 Z"
        fill="rgba(56,189,248,0.06)"
        stroke="rgba(125,211,252,0.42)"
        strokeWidth="1.8"
      />
      {waterH > 0 && (
        <path
          d={`M30 ${waterY} L66 ${waterY} L66 54 Q66 58 58 60 L54 64 L42 64 L38 60 Q30 58 30 54 Z`}
          fill="#38bdf8"
          fillOpacity={0.42}
        />
      )}
      {/* Stand Body */}
      <rect
        x="24"
        y="66"
        width="48"
        height="36"
        rx="4"
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.6"
      />
      {/* Red Hot & Blue Cold Taps */}
      <rect x="33" y="75" width="9" height="6" rx="2" fill="#f0884a" />
      <rect x="54" y="75" width="9" height="6" rx="2" fill="#5ea3d6" />
      {/* Drip Tray */}
      <rect x="30" y="90" width="36" height="4" rx="1.5" fill="#4b5563" />
    </svg>
  );
};

const WaterCoolerModalContent: React.FC<{
  onClose: () => void;
  storage: FurnitureStorage;
  player: Player;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
}> = ({ onClose, storage, player, onInventoryUpdated, onVitalsChange }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const gmRef = useRef<HTMLDivElement>(null);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  const dropHandlerRef = useRef<((targetKey: string, sourceKey: string) => void) | null>(null);

  useLayoutEffect(() => attachStageFit(() => hostRef.current, () => gmRef.current), []);
  useTopmostEscape(onClose);

  const cooler = ensureCoolerState(storage);

  const showToast = (msg: string) => setToastMsg(msg);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    let ticks = 0;
    const id = setInterval(() => {
      const changed = tickCoolerThermodynamics(storage, 0.5, Date.now() / 1000);
      ticks++;
      if (changed) {
        if (ticks % 6 === 0) {
          saveFurnitureStoragesToLocalStorage();
        }
        forceRender(n => n + 1);
        onInventoryUpdated?.();
      }
    }, 500);
    return () => {
      clearInterval(id);
      saveFurnitureStoragesToLocalStorage();
    };
  }, [storage, onInventoryUpdated]);

  const notifyChanged = () => {
    saveFurnitureStoragesToLocalStorage();
    forceRender(n => n + 1);
    onInventoryUpdated?.();
    onVitalsChange?.();
  };

  // ---- Cooler Actions ----
  const handleToggleCold = () => {
    toggleCoolerCold(storage);
    sound.playUseItem();
    notifyChanged();
  };

  const handleToggleHot = () => {
    toggleCoolerHot(storage);
    sound.playUseItem();
    notifyChanged();
  };

  const handleDrink = (tap: 'cold' | 'hot') => {
    const res = drinkFromCooler(storage, player, tap);
    if (res.success) sound.playDrink();
    showToast(res.message);
    notifyChanged();
  };

  const handleReplaceBottle = () => {
    replaceCoolerBottle(storage);
    sound.playWaterSpray();
    showToast('Установлена полная 19-литровая бутыль воды');
    notifyChanged();
  };

  const handleDispenseIntoItem = (item: InventoryItem, tap: 'cold' | 'hot') => {
    const res = dispenseCoolerIntoItem(storage, item, tap, player);
    if (res.success) sound.playWaterSpray();
    showToast(res.message);
    notifyChanged();
  };

  const handleRefillBottle = (item: InventoryItem) => {
    const res = refillCoolerBottleFromItem(storage, item);
    if (res.success) sound.playWaterSpray();
    showToast(res.message);
    notifyChanged();
  };

  // ---- Tray Transfers ----
  const moveTrayItemToPlayer = (idx: number) => {
    const it = storage.items[idx];
    if (!it) return;
    const removed = removeItemFromFurnitureStorage(storage, idx, 1);
    if (!removed) return;
    if (addItemToPlayer(player, removed)) {
      sound.playPickup();
      if (selectedKey === `tray:${idx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      storage.items.splice(Math.min(idx, storage.items.length), 0, removed);
      showToast('В инвентаре игрока нет места');
    }
  };

  const moveTrayItemToHand = (idx: number, hand: 'left' | 'right') => {
    const it = storage.items[idx];
    if (!it) return;
    const curHand = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (curHand) {
      const check = canItemFitInFurniture(storage, curHand);
      if (!check.fits) {
        showToast(check.reason || 'Освободите руку или место на лотке');
        return;
      }
    }
    const removed = removeItemFromFurnitureStorage(storage, idx, 1);
    if (!removed) return;
    const prevHand = curHand ? takeItemFromHand(player, hand) : null;
    const res = putItemInHand(player, hand, removed);
    if (res.success) {
      if (prevHand) addItemToFurnitureStorage(storage, prevHand, 1);
      sound.playPickup();
      if (selectedKey === `tray:${idx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      if (prevHand) putItemInHand(player, hand, prevHand);
      storage.items.splice(Math.min(idx, storage.items.length), 0, removed);
      showToast('Не удалось взять предмет в руку');
    }
  };

  const movePlayerInvToTray = (invIdx: number) => {
    const it = player.inventory[invIdx];
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Предмет не помещается на лоток кулера');
      return;
    }
    const res = addItemToFurnitureStorage(storage, it, 1);
    if (res.success) {
      removeItemFromPlayer(player, invIdx, 1);
      sound.playUseItem();
      if (selectedKey === `inv:${invIdx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      showToast(res.message);
    }
  };

  const movePlayerHandToTray = (hand: 'left' | 'right') => {
    const it = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Предмет не помещается на лоток кулера');
      return;
    }
    const taken = takeItemFromHand(player, hand);
    if (!taken) return;
    const res = addItemToFurnitureStorage(storage, taken, 1);
    if (res.success) {
      sound.playUseItem();
      if (selectedKey === `hand:${hand}`) setSelectedKey(null);
      notifyChanged();
    } else {
      putItemInHand(player, hand, taken);
      showToast(res.message);
    }
  };

  const handleDrop = (targetKey: string, sourceKey: string) => {
    if (!targetKey || !sourceKey || targetKey === sourceKey) return;

    const srcIsTray = sourceKey.startsWith('tray:') && !sourceKey.startsWith('tray:empty');
    const srcIsInv = sourceKey.startsWith('inv:');
    const srcIsHand = sourceKey.startsWith('hand:');

    const dstIsTray = targetKey.startsWith('tray:') || targetKey === 'zone:tray';
    const dstIsInv = targetKey.startsWith('inv:');
    const dstIsHand = targetKey.startsWith('hand:');
    const dstIsPlayerZone = targetKey === 'zone:player';

    if (srcIsTray && dstIsHand) {
      moveTrayItemToHand(parseInt(sourceKey.slice(5), 10), targetKey === 'hand:left' ? 'left' : 'right');
      return;
    }
    if (srcIsTray && (dstIsInv || dstIsPlayerZone)) {
      moveTrayItemToPlayer(parseInt(sourceKey.slice(5), 10));
      return;
    }
    if (srcIsInv && dstIsTray) {
      movePlayerInvToTray(parseInt(sourceKey.slice(4), 10));
      return;
    }
    if (srcIsHand && dstIsTray) {
      movePlayerHandToTray(sourceKey === 'hand:left' ? 'left' : 'right');
      return;
    }

    if (srcIsInv && dstIsInv) {
      const from = parseInt(sourceKey.slice(4), 10);
      const to = parseInt(targetKey.slice(4), 10);
      const item = player.inventory[from];
      if (item && canItemFitInCompartment(player, to, item).fits) {
        moveInventoryItem(player, from, to);
        sound.playUseItem();
        notifyChanged();
      }
      return;
    }
    if (srcIsInv && dstIsHand) {
      const from = parseInt(sourceKey.slice(4), 10);
      const hand = targetKey === 'hand:left' ? 'left' : 'right';
      const removed = removeItemFromPlayer(player, from, 1);
      if (removed) {
        const prevHand = takeItemFromHand(player, hand);
        const res = putItemInHand(player, hand, removed);
        if (res.success) {
          if (prevHand) addItemToPlayer(player, prevHand);
          sound.playPickup();
          notifyChanged();
        } else {
          if (prevHand) putItemInHand(player, hand, prevHand);
          addItemToPlayer(player, removed);
        }
      }
      return;
    }
    if (srcIsHand && (dstIsInv || dstIsPlayerZone)) {
      const hand = sourceKey === 'hand:left' ? 'left' : 'right';
      const stowRes = stowItemFromHandToPockets(player, hand);
      if (stowRes.success) {
        sound.playUseItem();
        notifyChanged();
      } else {
        showToast(stowRes.message || 'В карманах нет места');
      }
    }
  };
  dropHandlerRef.current = handleDrop;

  const handleSlotShiftClick = (slotKey: string) => {
    if (slotKey.startsWith('tray:') && !slotKey.startsWith('tray:empty')) {
      const idx = parseInt(slotKey.slice(5), 10);
      if (!isNaN(idx) && storage.items[idx]) moveTrayItemToPlayer(idx);
      return;
    }
    if (slotKey.startsWith('inv:')) {
      const idx = parseInt(slotKey.slice(4), 10);
      if (!isNaN(idx) && player.inventory[idx]) movePlayerInvToTray(idx);
      return;
    }
    if (slotKey === 'hand:left' || slotKey === 'hand:right') {
      movePlayerHandToTray(slotKey === 'hand:left' ? 'left' : 'right');
    }
  };

  const { dragUi, ghostRef, startSlotDrag } = useCachedSlotDrag<InventoryItem>({
    rootRef: gmRef,
    slotAttr: 'data-kf-slot',
    zoneAttr: 'data-kf-zone',
    onDrop: (targetKey, sourceKey) => {
      dropHandlerRef.current?.(targetKey, sourceKey);
      setSelectedKey(null);
    },
  });

  const startSlotPointer = (
    e: React.PointerEvent<HTMLElement>,
    slotKey: string,
    item: InventoryItem | null | undefined
  ) => {
    if (e.button === 0 && e.shiftKey) {
      e.stopPropagation();
      if (item) handleSlotShiftClick(slotKey);
      return;
    }
    startSlotDrag(e, slotKey, item, () => {
      if (!item) {
        if (selectedKey && selectedKey !== slotKey) {
          dropHandlerRef.current?.(slotKey, selectedKey);
          setSelectedKey(null);
        }
        return;
      }
      setSelectedKey(slotKey);
    });
  };

  // ---- Derived Metrics ----
  const bottlePct = Math.min(100, Math.round((cooler.bottleWaterMl / Math.max(1, cooler.bottleMaxMl)) * 100));
  const storageVol = getFurnitureStorageTotalVolume(storage);
  const storageWt = getFurnitureStorageTotalWeight(storage);
  const volPct = Math.min(100, Math.round((storageVol / COOLER_CONFIG.capacityL) * 100));
  const wtPct = Math.min(100, Math.round((storageWt / COOLER_CONFIG.maxWeightKg) * 100));

  const pocketCap = getPlayerPocketCapacity(player);
  const playerWt = getPlayerTotalCarriedWeight(player);
  const compartments = getPlayerCompartments(player);

  const selectedTrayIdx = selectedKey?.startsWith('tray:') ? parseInt(selectedKey.slice(5), 10) : -1;
  const selectedTrayItem = selectedTrayIdx >= 0 ? storage.items[selectedTrayIdx] || null : null;

  const selectedPlayerItem: InventoryItem | null = (() => {
    if (!selectedKey) return null;
    if (selectedKey === 'hand:left') return player.leftHandItem || null;
    if (selectedKey === 'hand:right') return player.rightHandItem || null;
    if (selectedKey.startsWith('inv:')) return player.inventory[parseInt(selectedKey.slice(4), 10)] || null;
    return null;
  })();

  const isContainerFillable = (it: InventoryItem | null): boolean => {
    if (!it || !it.fluidStorage) return false;
    if (it.itemId.startsWith('sack_') || it.itemId === 'sandbag' || it.itemId === 'package_bag') return false;
    return true;
  };

  const hasWaterToPourIn = (it: InventoryItem | null): boolean => {
    return Boolean(
      it &&
        it.fluidStorage &&
        (it.fluidStorage.currentMl || 0) > 0 &&
        (!it.fluidStorage.liquidId || it.fluidStorage.liquidId === 'water')
    );
  };

  const renderCoolerColumn = () => {
    const slotCount = Math.max(12, storage.items.length + 4);
    const isDropZone = dragUi?.overKey === 'zone:tray';

    return (
      <section
        className={'panel kf-col' + (isDropZone ? ' drop-on' : '')}
        data-kf-zone="zone:tray"
      >
        <div className="kf-col-head">
          <span className="kf-col-title">
            <Droplets width={16} height={16} />
            <span>Бутыль 19 л и краны</span>
          </span>
          <span className="kf-col-meta">
            В бутыли: {(cooler.bottleWaterMl / 1000).toFixed(1)}/{(cooler.bottleMaxMl / 1000).toFixed(0)} л
          </span>
        </div>

        <div className="kf-cool-box">
          <div className="kf-cool-viz">
            <CoolerBottleSvg bottlePct={bottlePct} />
          </div>

          <div className="kf-cool-ctrl">
            <div className="kf-cool-taps">
              <div className="kf-cool-tap-card">
                <div className="kf-cool-tap-head">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#7dd3fc' }}>
                    <Snowflake width={13} height={13} />
                    <span>Холодный</span>
                  </span>
                  <b style={{ color: '#7dd3fc' }}>+{Math.round(cooler.coldTempC)}°C</b>
                </div>
                <div className="kf-cool-tap-acts">
                  <button
                    type="button"
                    className={'btn btn-xs ' + (cooler.coldOn ? 'btn-water-on' : 'btn-s')}
                    onClick={handleToggleCold}
                  >
                    <Power width={12} height={12} />
                    <span>{cooler.coldOn ? 'Охл. Вкл' : 'Выкл'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    onClick={() => handleDrink('cold')}
                  >
                    <CupSoda width={12} height={12} />
                    <span>Попить</span>
                  </button>
                </div>
              </div>

              <div className="kf-cool-tap-card">
                <div className="kf-cool-tap-head">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#f0884a' }}>
                    <Flame width={13} height={13} />
                    <span>Горячий</span>
                  </span>
                  <b style={{ color: '#f0884a' }}>+{Math.round(cooler.hotTempC)}°C</b>
                </div>
                <div className="kf-cool-tap-acts">
                  <button
                    type="button"
                    className={'btn btn-xs ' + (cooler.hotOn ? 'btn-p' : 'btn-s')}
                    onClick={handleToggleHot}
                  >
                    <Power width={12} height={12} />
                    <span>{cooler.hotOn ? 'Нагр. Вкл' : 'Выкл'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    onClick={() => handleDrink('hot')}
                  >
                    <CupSoda width={12} height={12} />
                    <span>Стакан</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="kf-mw-row">
              <button
                type="button"
                className="btn btn-s btn-xs"
                onClick={handleReplaceBottle}
              >
                <RefreshCw width={13} height={13} />
                <span>Заменить бутыль (19 л)</span>
              </button>
              <span className="kf-sink-stats" style={{ marginLeft: 'auto' }}>
                <span>Остаток: <b>{bottlePct}%</b></span>
              </span>
            </div>
          </div>
        </div>

        <div className="kf-meters">
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Поддон и полка кулера</span>
              <b>{storageVol.toFixed(1)} / {COOLER_CONFIG.capacityL.toFixed(0)} л</b>
            </div>
            <div className="kf-bar">
              <i style={{ width: `${volPct}%` }} />
            </div>
          </div>
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Нагрузка</span>
              <b>{storageWt.toFixed(1)} / {COOLER_CONFIG.maxWeightKg.toFixed(0)} кг</b>
            </div>
            <div className="kf-bar">
              <i className="ok" style={{ width: `${wtPct}%` }} />
            </div>
          </div>
        </div>

        <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
          <div className="kf-slots">
            {Array.from({ length: slotCount }, (_, idx) => {
              const it = storage.items[idx];
              const slotKey = it ? `tray:${idx}` : `tray:empty-${idx}`;
              const fill = getSlotFillInfo(it);
              const isDragging = dragUi?.sourceKey === slotKey;
              const isOver = dragUi?.overKey === slotKey;
              const isSel = selectedKey === slotKey;
              const temp = it ? (it.surfaceTemperature ?? it.temperature ?? 20) : 20;

              return (
                <div
                  key={slotKey}
                  data-kf-slot={slotKey}
                  draggable={false}
                  onDragStart={e => e.preventDefault()}
                  onPointerDown={e => startSlotPointer(e, slotKey, it)}
                  onDoubleClick={() => it && moveTrayItemToPlayer(idx)}
                  className={
                    'kf-slot' +
                    (!it ? ' empty' : '') +
                    (isSel ? ' on' : '') +
                    (isOver ? ' drop' : '') +
                    (it && temp >= 52 ? ' hot' : '')
                  }
                  style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                  title={it ? `${it.nameRu} (${describeCoolerItemSub(it)})` : 'Свободное место на лотке'}
                >
                  {it && (
                    <>
                      <ItemIconCanvas itemId={it.itemId} item={it} size={42} />
                      {(temp >= 38 || temp <= 12) && (
                        <span className="kf-temp" style={{ color: getTempColor(temp) }}>
                          {temp > 0 ? '+' : ''}{Math.round(temp)}°
                        </span>
                      )}
                      {it.count > 1 && <span className="kf-cnt">{it.count}</span>}
                      {fill.pct !== null && (
                        <div className="kf-fill">
                          <i style={{ width: `${fill.pct}%`, background: fill.color }} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="kf-foot-bar">
          {selectedTrayItem && selectedTrayIdx >= 0 ? (
            <>
              <div className="kf-foot-item">
                <ItemIconCanvas itemId={selectedTrayItem.itemId} item={selectedTrayItem} size={30} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kf-foot-name">{selectedTrayItem.nameRu}</div>
                  <div className="kf-foot-sub">{describeCoolerItemSub(selectedTrayItem)}</div>
                </div>
              </div>
              <div className="kf-foot-acts">
                {isContainerFillable(selectedTrayItem) && (
                  <>
                    <button
                      type="button"
                      className="btn btn-water-on btn-xs"
                      onClick={() => handleDispenseIntoItem(selectedTrayItem, 'cold')}
                    >
                      Налить хол.
                    </button>
                    <button
                      type="button"
                      className="btn btn-p btn-xs"
                      onClick={() => handleDispenseIntoItem(selectedTrayItem, 'hot')}
                    >
                      Кипяток
                    </button>
                  </>
                )}
                {hasWaterToPourIn(selectedTrayItem) && (
                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    onClick={() => handleRefillBottle(selectedTrayItem)}
                  >
                    В бутыль
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => moveTrayItemToHand(selectedTrayIdx, 'right')}
                >
                  В руку
                </button>
                <button
                  type="button"
                  className="btn btn-p btn-xs"
                  onClick={() => moveTrayItemToPlayer(selectedTrayIdx)}
                >
                  Забрать
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              Выберите кружку, термос или бутылку, чтобы набрать холодной или горячей воды
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderPlayerInventoryColumn = () => {
    const isDropZone = dragUi?.overKey === 'zone:player';
    const renderCompIcon = (id: string) => {
      if (id === 'base') return <User width={14} height={14} />;
      if (id === 'back') return <Luggage width={14} height={14} />;
      return <Shirt width={14} height={14} />;
    };

    return (
      <section
        className={'panel kf-col' + (isDropZone ? ' drop-on' : '')}
        data-kf-zone="zone:player"
      >
        <div className="kf-col-head">
          <span className="kf-col-title">
            <User width={16} height={16} />
            <span>Инвентарь игрока</span>
          </span>
          <span className="kf-col-meta">
            {pocketCap.usedVolumeL.toFixed(1)}/{pocketCap.totalCapacityL.toFixed(1)} л · {playerWt.toFixed(1)} кг
          </span>
        </div>

        <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
          <div className="kf-group">
            <div className="kf-group-h">
              <span className="kf-group-t">
                <Hand width={14} height={14} />
                <span>Активные руки</span>
              </span>
              <span className="kf-group-meta">
                {(player.leftHandItem ? 1 : 0) + (player.rightHandItem ? 1 : 0)}/2
              </span>
            </div>
            <div className="kf-slots">
              {(['left', 'right'] as const).map(hand => {
                const it = hand === 'left' ? player.leftHandItem : player.rightHandItem;
                const slotKey = `hand:${hand}`;
                const fill = getSlotFillInfo(it);
                const isDragging = dragUi?.sourceKey === slotKey;
                const isOver = dragUi?.overKey === slotKey;
                const isSel = selectedKey === slotKey;
                return (
                  <div
                    key={slotKey}
                    data-kf-slot={slotKey}
                    draggable={false}
                    onDragStart={e => e.preventDefault()}
                    onPointerDown={e => startSlotPointer(e, slotKey, it)}
                    onDoubleClick={() => it && movePlayerHandToTray(hand)}
                    className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                    style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                    title={it ? `${it.nameRu} (${describeCoolerItemSub(it)})` : hand === 'left' ? 'Левая рука пуста' : 'Правая рука пуста'}
                  >
                    <span className="kf-badge">{hand === 'left' ? 'Л' : 'П'}</span>
                    {it ? (
                      <>
                        <ItemIconCanvas itemId={it.itemId} item={it} size={42} />
                        {fill.pct !== null && (
                          <div className="kf-fill">
                            <i style={{ width: `${fill.pct}%`, background: fill.color }} />
                          </div>
                        )}
                      </>
                    ) : (
                      <Hand width={18} height={18} color="#4e4b45" style={{ pointerEvents: 'none' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {compartments.map(comp => {
            const slotIndices = Array.from({ length: comp.slotCount }, (_, i) => comp.startIndex + i);
            return (
              <div key={comp.id} className="kf-group">
                <div className="kf-group-h">
                  <span className="kf-group-t">
                    {renderCompIcon(comp.id)}
                    <span>{comp.nameRu}</span>
                  </span>
                  <span className="kf-group-meta">
                    {comp.usedVolumeL.toFixed(1)}/{comp.capacityL.toFixed(1)} л
                  </span>
                </div>
                <div className="kf-slots">
                  {slotIndices.map(slotIdx => {
                    const it = player.inventory[slotIdx];
                    const slotKey = `inv:${slotIdx}`;
                    const fill = getSlotFillInfo(it);
                    const isDragging = dragUi?.sourceKey === slotKey;
                    const isOver = dragUi?.overKey === slotKey;
                    const isSel = selectedKey === slotKey;
                    const temp = it ? (it.surfaceTemperature ?? it.temperature ?? 20) : 20;

                    return (
                      <div
                        key={slotKey}
                        data-kf-slot={slotKey}
                        draggable={false}
                        onDragStart={e => e.preventDefault()}
                        onPointerDown={e => startSlotPointer(e, slotKey, it)}
                        onDoubleClick={() => it && movePlayerInvToTray(slotIdx)}
                        className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                        style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                        title={it ? `${it.nameRu} (${describeCoolerItemSub(it)})` : 'Свободный слот'}
                      >
                        {it && (
                          <>
                            <ItemIconCanvas itemId={it.itemId} item={it} size={42} />
                            {(temp >= 38 || temp <= 12) && (
                              <span className="kf-temp" style={{ color: getTempColor(temp) }}>
                                {temp > 0 ? '+' : ''}{Math.round(temp)}°
                              </span>
                            )}
                            {it.count > 1 && <span className="kf-cnt">{it.count}</span>}
                            {fill.pct !== null && (
                              <div className="kf-fill">
                                <i style={{ width: `${fill.pct}%`, background: fill.color }} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="kf-foot-bar">
          {selectedPlayerItem && selectedKey ? (
            <>
              <div className="kf-foot-item">
                <ItemIconCanvas itemId={selectedPlayerItem.itemId} item={selectedPlayerItem} size={30} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kf-foot-name">{selectedPlayerItem.nameRu}</div>
                  <div className="kf-foot-sub">{describeCoolerItemSub(selectedPlayerItem)}</div>
                </div>
              </div>
              <div className="kf-foot-acts">
                {isContainerFillable(selectedPlayerItem) && (
                  <>
                    <button
                      type="button"
                      className="btn btn-water-on btn-xs"
                      onClick={() => handleDispenseIntoItem(selectedPlayerItem, 'cold')}
                    >
                      Налить хол.
                    </button>
                    <button
                      type="button"
                      className="btn btn-p btn-xs"
                      onClick={() => handleDispenseIntoItem(selectedPlayerItem, 'hot')}
                    >
                      Кипяток
                    </button>
                  </>
                )}
                {hasWaterToPourIn(selectedPlayerItem) && (
                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    onClick={() => handleRefillBottle(selectedPlayerItem)}
                  >
                    В бутыль
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => {
                    if (selectedKey === 'hand:left') movePlayerHandToTray('left');
                    else if (selectedKey === 'hand:right') movePlayerHandToTray('right');
                    else if (selectedKey.startsWith('inv:')) movePlayerInvToTray(parseInt(selectedKey.slice(4), 10));
                  }}
                >
                  На лоток
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              Выберите тару для набора воды или перетащите стакан на лоток кулера
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <ShadowHost css={kitchenFurnitureCss}>
      <div id="w" ref={hostRef}>
        <div className="gm" ref={gmRef} id="water-cooler-modal">
          <div className="kf-bg" />

          <header className="top">
            <div className="top-l">
              <Droplets width={24} height={24} color="#6cb4e8" style={{ flex: 'none' }} />
              <div className="cn ttl">Кулер для воды</div>
              <span className="sub-top">Охлаждение и подогрев 19 л</span>
            </div>
            <div className="top-r">
              <div className="chip">
                <span>Холод.</span>
                <b style={{ color: '#7dd3fc' }}>+{Math.round(cooler.coldTempC)}°C</b>
              </div>
              <div className="chip">
                <span>Горяч.</span>
                <b style={{ color: '#f0884a' }}>+{Math.round(cooler.hotTempC)}°C</b>
              </div>
              <div className="chip">
                <span>Вода</span>
                <b>{(cooler.bottleWaterMl / 1000).toFixed(1)} л</b>
              </div>
              <button
                type="button"
                className="chip back"
                onClick={onClose}
                aria-label="Закрыть"
                title="Закрыть (Esc)"
              >
                <X width={19} height={19} />
              </button>
            </div>
          </header>

          <main className="kf-body kf-body-notab">
            <div className="kf-split">
              {renderCoolerColumn()}
              {renderPlayerInventoryColumn()}
            </div>
          </main>

          {toastMsg && <div className="kf-toast">{toastMsg}</div>}

          <div className="hint">
            <div className="hint-g">
              <span className="key">Esc</span>
              <span>Закрыть</span>
              <span className="key">2× Клик</span>
              <span>На лоток / Забрать</span>
              <span className="key">Бутыль</span>
              <span>Чистая питьевая вода 19 л</span>
            </div>
            <div className="hint-r">
              Поддержка охлаждения (+6°C) и кипятка (+88°C) в реальном времени
            </div>
          </div>
        </div>

        <div ref={ghostRef} className="kf-drag-ghost">
          {dragUi && (
            <ItemIconCanvas itemId={dragUi.item.itemId} item={dragUi.item} size={46} />
          )}
        </div>
      </div>
    </ShadowHost>
  );
};

export const WaterCoolerModal: React.FC<WaterCoolerModalProps> = ({
  isOpen,
  storage,
  player,
  ...rest
}) => {
  if (!isOpen || !storage || !player) return null;
  return <WaterCoolerModalContent storage={storage} player={player} {...rest} />;
};

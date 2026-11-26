import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import {
  FurnitureStorage,
  FURNITURE_STORAGE_CONFIGS,
  ensureMicrowaveState,
  setMicrowavePower,
  addMicrowaveTimer,
  resetMicrowaveTimer,
  startStopMicrowave,
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
import { isMetallicItemForMicrowave, tickMicrowaveThermodynamics } from '../itemThermalSystem';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { useCachedSlotDrag } from './useCachedSlotDrag';
import { sound } from '../audio';
import kitchenFurnitureCss from './kitchenFurniture.css?inline';
import {
  Zap,
  Play,
  Square,
  RotateCcw,
  AlertTriangle,
  Hand,
  User,
  Shirt,
  Luggage,
  X,
} from 'lucide-react';

export interface MicrowaveModalProps {
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

function describeMwItemSub(item: InventoryItem): string {
  const parts: string[] = [];
  const temp = Math.round(item.temperature ?? 20);
  parts.push(`${temp > 0 ? '+' : ''}${temp}°C`);
  if (isMetallicItemForMicrowave(item)) {
    parts.push('Металл');
  } else {
    parts.push(formatWeightRu(getItemTotalWeight(item)));
  }
  return parts.join(' · ');
}

function formatTimerSec(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

const MicrowaveModalContent: React.FC<{
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

  const mw = ensureMicrowaveState(storage);
  const cfg = FURNITURE_STORAGE_CONFIGS.microwave;

  const showToast = (msg: string) => setToastMsg(msg);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    let ticks = 0;
    const id = setInterval(() => {
      const changed = tickMicrowaveThermodynamics(storage, 0.5, Date.now() / 1000);
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

  // ---- Microwave Actions ----
  const handlePower = (watts: 300 | 600 | 900) => {
    setMicrowavePower(storage, watts);
    sound.playUseItem();
    notifyChanged();
  };

  const handleAddTime = (sec: number) => {
    addMicrowaveTimer(storage, sec);
    sound.playUseItem();
    notifyChanged();
  };

  const handleResetTimer = () => {
    resetMicrowaveTimer(storage);
    sound.playUseItem();
    notifyChanged();
  };

  const handleStartStop = () => {
    const res = startStopMicrowave(storage);
    sound.playUseItem();
    showToast(res.message);
    notifyChanged();
  };

  // ---- Transfers ----
  const moveChamberItemToPlayer = (idx: number) => {
    const it = storage.items[idx];
    if (!it) return;
    const removed = removeItemFromFurnitureStorage(storage, idx, 1);
    if (!removed) return;
    if (addItemToPlayer(player, removed)) {
      ensureMicrowaveState(storage);
      sound.playPickup();
      if (selectedKey === `mw:${idx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      storage.items.splice(Math.min(idx, storage.items.length), 0, removed);
      showToast('В инвентаре игрока нет места');
    }
  };

  const moveChamberItemToHand = (idx: number, hand: 'left' | 'right') => {
    const it = storage.items[idx];
    if (!it) return;
    const curHand = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (curHand) {
      const check = canItemFitInFurniture(storage, curHand);
      if (!check.fits) {
        showToast(check.reason || 'Освободите руку или место в камере');
        return;
      }
    }
    const removed = removeItemFromFurnitureStorage(storage, idx, 1);
    if (!removed) return;
    const prevHand = curHand ? takeItemFromHand(player, hand) : null;
    const res = putItemInHand(player, hand, removed);
    if (res.success) {
      if (prevHand) addItemToFurnitureStorage(storage, prevHand, 1);
      ensureMicrowaveState(storage);
      sound.playPickup();
      if (selectedKey === `mw:${idx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      if (prevHand) putItemInHand(player, hand, prevHand);
      storage.items.splice(Math.min(idx, storage.items.length), 0, removed);
      showToast('Не удалось взять предмет в руку');
    }
  };

  const movePlayerInvToChamber = (invIdx: number) => {
    const it = player.inventory[invIdx];
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Предмет не помещается на тарелку СВЧ');
      return;
    }
    const res = addItemToFurnitureStorage(storage, it, 1);
    if (res.success) {
      removeItemFromPlayer(player, invIdx, 1);
      ensureMicrowaveState(storage);
      sound.playUseItem();
      if (selectedKey === `inv:${invIdx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      showToast(res.message);
    }
  };

  const movePlayerHandToChamber = (hand: 'left' | 'right') => {
    const it = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Предмет не помещается на тарелку СВЧ');
      return;
    }
    const taken = takeItemFromHand(player, hand);
    if (!taken) return;
    const res = addItemToFurnitureStorage(storage, taken, 1);
    if (res.success) {
      ensureMicrowaveState(storage);
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

    const srcIsMw = sourceKey.startsWith('mw:') && !sourceKey.startsWith('mw:empty');
    const srcIsInv = sourceKey.startsWith('inv:');
    const srcIsHand = sourceKey.startsWith('hand:');

    const dstIsMw = targetKey.startsWith('mw:') || targetKey === 'zone:mw';
    const dstIsInv = targetKey.startsWith('inv:');
    const dstIsHand = targetKey.startsWith('hand:');
    const dstIsPlayerZone = targetKey === 'zone:player';

    if (srcIsMw && dstIsHand) {
      moveChamberItemToHand(parseInt(sourceKey.slice(3), 10), targetKey === 'hand:left' ? 'left' : 'right');
      return;
    }
    if (srcIsMw && (dstIsInv || dstIsPlayerZone)) {
      moveChamberItemToPlayer(parseInt(sourceKey.slice(3), 10));
      return;
    }
    if (srcIsInv && dstIsMw) {
      movePlayerInvToChamber(parseInt(sourceKey.slice(4), 10));
      return;
    }
    if (srcIsHand && dstIsMw) {
      movePlayerHandToChamber(sourceKey === 'hand:left' ? 'left' : 'right');
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
    if (slotKey.startsWith('mw:') && !slotKey.startsWith('mw:empty')) {
      const idx = parseInt(slotKey.slice(3), 10);
      if (!isNaN(idx) && storage.items[idx]) moveChamberItemToPlayer(idx);
      return;
    }
    if (slotKey.startsWith('inv:')) {
      const idx = parseInt(slotKey.slice(4), 10);
      if (!isNaN(idx) && player.inventory[idx]) movePlayerInvToChamber(idx);
      return;
    }
    if (slotKey === 'hand:left' || slotKey === 'hand:right') {
      movePlayerHandToChamber(slotKey === 'hand:left' ? 'left' : 'right');
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
  const hasMetal = (storage.items || []).some(it => isMetallicItemForMicrowave(it));
  const storageVol = getFurnitureStorageTotalVolume(storage);
  const storageWt = getFurnitureStorageTotalWeight(storage);
  const volPct = Math.min(100, Math.round((storageVol / cfg.capacityL) * 100));
  const wtPct = Math.min(100, Math.round((storageWt / cfg.maxWeightKg) * 100));

  const pocketCap = getPlayerPocketCapacity(player);
  const playerWt = getPlayerTotalCarriedWeight(player);
  const compartments = getPlayerCompartments(player);

  const selectedMwIdx = selectedKey?.startsWith('mw:') ? parseInt(selectedKey.slice(3), 10) : -1;
  const selectedMwItem = selectedMwIdx >= 0 ? storage.items[selectedMwIdx] || null : null;

  const selectedPlayerItem: InventoryItem | null = (() => {
    if (!selectedKey) return null;
    if (selectedKey === 'hand:left') return player.leftHandItem || null;
    if (selectedKey === 'hand:right') return player.rightHandItem || null;
    if (selectedKey.startsWith('inv:')) return player.inventory[parseInt(selectedKey.slice(4), 10)] || null;
    return null;
  })();

  const renderChamberColumn = () => {
    const slotCount = Math.max(12, storage.items.length + 4);
    const isDropZone = dragUi?.overKey === 'zone:mw';

    return (
      <section
        className={'panel kf-col' + (isDropZone ? ' drop-on' : '')}
        data-kf-zone="zone:mw"
      >
        <div className="kf-col-head">
          <span className="kf-col-title">
            <Zap width={16} height={16} />
            <span>Камера СВЧ и таймер</span>
          </span>
          <span className="kf-col-meta">
            {storage.items.length} предм. · {storageVol.toFixed(1)}/{cfg.capacityL.toFixed(0)} л
          </span>
        </div>

        <div className="kf-mw-box">
          <div className={'kf-mw-win' + (hasMetal ? ' warn' : mw.isRunning ? ' active' : '')}>
            <div className="kf-mw-timer-readout" style={{ color: hasMetal ? '#f0884a' : mw.isRunning ? '#e0ab45' : '#f4f1ea' }}>
              {formatTimerSec(mw.remainingSec)}
            </div>
            <div className="kf-mw-plate" />
            <div className="kf-wash-phase">
              {hasMetal ? 'Металл в камере' : mw.isRunning ? 'Разогрев' : 'Готово'}
            </div>
          </div>

          <div className="kf-mw-ctrl">
            <div className="kf-mw-row">
              {([300, 600, 900] as const).map(w => (
                <button
                  key={w}
                  type="button"
                  className={'kf-mw-pill' + (mw.powerWatts === w ? ' on' : '')}
                  onClick={() => handlePower(w)}
                >
                  {w} Вт
                </button>
              ))}
            </div>

            <div className="kf-mw-row">
              <button type="button" className="kf-mw-pill" onClick={() => handleAddTime(15)}>
                +15с
              </button>
              <button type="button" className="kf-mw-pill" onClick={() => handleAddTime(30)}>
                +30с
              </button>
              <button type="button" className="kf-mw-pill" onClick={() => handleAddTime(60)}>
                +1м
              </button>
              <button type="button" className="kf-mw-pill" onClick={handleResetTimer} title="Сбросить таймер">
                <RotateCcw width={13} height={13} />
              </button>
            </div>

            <div className="kf-mw-row">
              <button
                type="button"
                className={'btn btn-xs ' + (mw.isRunning ? 'btn-stop' : 'btn-p')}
                onClick={handleStartStop}
              >
                {mw.isRunning ? <Square width={13} height={13} /> : <Play width={13} height={13} />}
                <span>{mw.isRunning ? 'Стоп' : 'Старт'}</span>
              </button>
              {hasMetal && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#f0884a' }}>
                  <AlertTriangle width={14} height={14} />
                  <span>Уберите металл</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="kf-meters">
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Объём камеры</span>
              <b>{storageVol.toFixed(1)} / {cfg.capacityL.toFixed(0)} л</b>
            </div>
            <div className="kf-bar">
              <i style={{ width: `${volPct}%` }} />
            </div>
          </div>
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Нагрузка</span>
              <b>{storageWt.toFixed(1)} / {cfg.maxWeightKg.toFixed(0)} кг</b>
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
              const slotKey = it ? `mw:${idx}` : `mw:empty-${idx}`;
              const fill = getSlotFillInfo(it);
              const isDragging = dragUi?.sourceKey === slotKey;
              const isOver = dragUi?.overKey === slotKey;
              const isSel = selectedKey === slotKey;
              const temp = it ? (it.surfaceTemperature ?? it.temperature ?? 20) : 20;
              const isMetal = it ? isMetallicItemForMicrowave(it) : false;

              return (
                <div
                  key={slotKey}
                  data-kf-slot={slotKey}
                  draggable={false}
                  onDragStart={e => e.preventDefault()}
                  onPointerDown={e => startSlotPointer(e, slotKey, it)}
                  onDoubleClick={() => it && moveChamberItemToPlayer(idx)}
                  className={
                    'kf-slot' +
                    (!it ? ' empty' : '') +
                    (isSel ? ' on' : '') +
                    (isOver ? ' drop' : '') +
                    (it && temp >= 52 ? ' hot' : '')
                  }
                  style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                  title={it ? `${it.nameRu} (${describeMwItemSub(it)})` : 'Свободное место на тарелке'}
                >
                  {it && (
                    <>
                      <ItemIconCanvas itemId={it.itemId} item={it} size={42} />
                      {isMetal && (
                        <span className="kf-wet-badge" style={{ color: '#f0884a' }}>
                          МЕТ
                        </span>
                      )}
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
          {selectedMwItem && selectedMwIdx >= 0 ? (
            <>
              <div className="kf-foot-item">
                <ItemIconCanvas itemId={selectedMwItem.itemId} item={selectedMwItem} size={30} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kf-foot-name">{selectedMwItem.nameRu}</div>
                  <div className="kf-foot-sub">{describeMwItemSub(selectedMwItem)}</div>
                </div>
              </div>
              <div className="kf-foot-acts">
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => moveChamberItemToHand(selectedMwIdx, 'right')}
                >
                  В руку
                </button>
                <button
                  type="button"
                  className="btn btn-p btn-xs"
                  onClick={() => moveChamberItemToPlayer(selectedMwIdx)}
                >
                  Достать
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              Поставьте еду или напитки без фольги и металла для быстрого разогрева
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
                    onDoubleClick={() => it && movePlayerHandToChamber(hand)}
                    className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                    style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                    title={it ? `${it.nameRu} (${describeMwItemSub(it)})` : hand === 'left' ? 'Левая рука пуста' : 'Правая рука пуста'}
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
                        onDoubleClick={() => it && movePlayerInvToChamber(slotIdx)}
                        className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                        style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                        title={it ? `${it.nameRu} (${describeMwItemSub(it)})` : 'Свободный слот'}
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
                  <div className="kf-foot-sub">{describeMwItemSub(selectedPlayerItem)}</div>
                </div>
              </div>
              <div className="kf-foot-acts">
                <button
                  type="button"
                  className="btn btn-p btn-xs"
                  onClick={() => {
                    if (selectedKey === 'hand:left') movePlayerHandToChamber('left');
                    else if (selectedKey === 'hand:right') movePlayerHandToChamber('right');
                    else if (selectedKey.startsWith('inv:')) movePlayerInvToChamber(parseInt(selectedKey.slice(4), 10));
                  }}
                >
                  В камеру
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              Перетащите блюдо в микроволновку или нажмите 2× для быстрого размещения
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <ShadowHost css={kitchenFurnitureCss}>
      <div id="w" ref={hostRef}>
        <div className="gm" ref={gmRef} id="microwave-modal">
          <div className="kf-bg" />

          <header className="top">
            <div className="top-l">
              <Zap width={24} height={24} color={mw.isRunning ? '#e0ab45' : '#c9922b'} style={{ flex: 'none' }} />
              <div className="cn ttl">Микроволновая печь</div>
              <span className="sub-top">Быстрый разогрев и разморозка</span>
            </div>
            <div className="top-r">
              <div className="chip">
                <span>Мощность</span>
                <b>{mw.powerWatts} Вт</b>
              </div>
              <div className="chip">
                <span>Таймер</span>
                <b style={{ color: mw.isRunning ? '#e0ab45' : '#f4f1ea' }}>{formatTimerSec(mw.remainingSec)}</b>
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
              {renderChamberColumn()}
              {renderPlayerInventoryColumn()}
            </div>
          </main>

          {toastMsg && <div className="kf-toast">{toastMsg}</div>}

          <div className="hint">
            <div className="hint-g">
              <span className="key">Esc</span>
              <span>Закрыть</span>
              <span className="key">2× Клик</span>
              <span>В камеру / Забрать</span>
              <span className="key">Безопасность</span>
              <span>Не запускайте металлическую посуду и ножи</span>
            </div>
            <div className="hint-r">
              Таймер СВЧ работает в реальном времени и отключается сам
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

export const MicrowaveModal: React.FC<MicrowaveModalProps> = ({
  isOpen,
  storage,
  player,
  ...rest
}) => {
  if (!isOpen || !storage || !player) return null;
  return <MicrowaveModalContent storage={storage} player={player} {...rest} />;
};

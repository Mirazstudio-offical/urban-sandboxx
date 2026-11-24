import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import {
  FurnitureStorage,
  FURNITURE_STORAGE_CONFIGS,
  WASHING_PROGRAMS,
  WASHING_DETERGENT_MAX_ML,
  ensureWashingState,
  setWashingProgram,
  pourDetergentIntoWashingMachine,
  clearWashingDetergent,
  startPauseWashingMachine,
  resetWashingMachine,
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
import { isFluidStorageDryForm, LIQUID_REGISTRY, LiquidId } from '../liquidSystem';
import { tickWashingMachineThermodynamics } from '../itemThermalSystem';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { sound } from '../audio';
import kitchenFurnitureCss from './kitchenFurniture.css?inline';
import {
  RotateCw,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Droplets,
  Trash2,
  Lock,
  Hand,
  User,
  Shirt,
  Luggage,
  X,
} from 'lucide-react';

export interface WashingMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage: FurnitureStorage | null;
  player: Player | null;
  world?: GameWorld | null;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
}

const PHASE_LABEL_RU: Record<string, string> = {
  idle: 'Ожидание',
  fill: 'Набор воды',
  wash: 'Стирка',
  rinse: 'Полоскание',
  spin: 'Отжим',
  done: 'Завершено',
};

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
    const liq = wrapper.state.liquidId ? LIQUID_REGISTRY[wrapper.state.liquidId as LiquidId] : undefined;
    const fillColor = wrapper.state.attributes?.customColor || liq?.color || '#68a490';
    return { pct, color: wrapper.state.currentMl > 0 ? fillColor : undefined };
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

function describeWashItemSub(item: InventoryItem): string {
  const parts: string[] = [];
  const temp = Math.round(item.temperature ?? 20);
  parts.push(`${temp > 0 ? '+' : ''}${temp}°C`);
  const wet = Math.round(item.wetness || 0);
  if (wet >= 5) {
    parts.push(`${item.soakedLiquidNameRu || 'Вода'}: ${wet}%`);
  }
  parts.push(formatWeightRu(getItemTotalWeight(item)));
  return parts.join(' · ');
}

function formatTimerSec(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

const WashingMachineModalContent: React.FC<{
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

  const [dragUi, setDragUi] = useState<{
    sourceKey: string;
    item: InventoryItem;
    x: number;
    y: number;
    overKey: string | null;
  } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    sourceKey: string;
    item: InventoryItem;
    startX: number;
    startY: number;
    x: number;
    y: number;
    active: boolean;
    overKey: string | null;
  } | null>(null);
  const dropHandlerRef = useRef<((targetKey: string, sourceKey: string) => void) | null>(null);

  useLayoutEffect(() => attachStageFit(() => hostRef.current, () => gmRef.current), []);
  useTopmostEscape(onClose);

  const wash = ensureWashingState(storage);
  const cfg = FURNITURE_STORAGE_CONFIGS.washing_machine;
  const activeProg = WASHING_PROGRAMS.find(p => p.id === wash.program) || WASHING_PROGRAMS[1];

  const showToast = (msg: string) => setToastMsg(msg);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    let ticks = 0;
    const id = setInterval(() => {
      const changed = tickWashingMachineThermodynamics(storage, 0.5, Date.now() / 1000);
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

  // ---- Controls ----
  const handleSelectProgram = (id: typeof wash.program) => {
    const res = setWashingProgram(storage, id);
    if (!res.success) {
      showToast(res.message);
      return;
    }
    sound.playUseItem();
    notifyChanged();
  };

  const pourDetergentFromSource = (sourceKey: string) => {
    let srcItem: InventoryItem | null | undefined = null;
    if (sourceKey === 'hand:left') srcItem = player.leftHandItem;
    else if (sourceKey === 'hand:right') srcItem = player.rightHandItem;
    else if (sourceKey.startsWith('inv:')) srcItem = player.inventory[parseInt(sourceKey.slice(4), 10)];
    if (!srcItem) return;

    const res = pourDetergentIntoWashingMachine(storage, srcItem);
    showToast(res.message);
    if (res.success) {
      sound.playUseItem();
      notifyChanged();
    }
  };

  const handleClearDetergent = () => {
    const res = clearWashingDetergent(storage);
    showToast(res.message);
    if (res.success) {
      sound.playUseItem();
      notifyChanged();
    }
  };

  const handleStartPause = () => {
    const res = startPauseWashingMachine(storage);
    sound.playUseItem();
    showToast(res.message);
    notifyChanged();
  };

  const handleReset = () => {
    resetWashingMachine(storage);
    sound.playUseItem();
    showToast('Программа сброшена, люк разблокирован');
    notifyChanged();
  };

  // ---- Transfers (Door Lock Guarded) ----
  const moveDrumItemToPlayer = (idx: number) => {
    if (wash.isRunning) {
      showToast('Люк заблокирован во время стирки — поставьте на паузу');
      return;
    }
    const it = storage.items[idx];
    if (!it) return;
    const removed = removeItemFromFurnitureStorage(storage, idx, 1);
    if (!removed) return;
    if (addItemToPlayer(player, removed)) {
      sound.playPickup();
      if (selectedKey === `drum:${idx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      storage.items.splice(Math.min(idx, storage.items.length), 0, removed);
      showToast('В инвентаре игрока нет места');
    }
  };

  const moveDrumItemToHand = (idx: number, hand: 'left' | 'right') => {
    if (wash.isRunning) {
      showToast('Люк заблокирован во время стирки — поставьте на паузу');
      return;
    }
    const it = storage.items[idx];
    if (!it) return;
    const curHand = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (curHand) {
      const check = canItemFitInFurniture(storage, curHand);
      if (!check.fits) {
        showToast(check.reason || 'Освободите руку или место в барабане');
        return;
      }
    }
    const removed = removeItemFromFurnitureStorage(storage, idx, 1);
    if (!removed) return;
    const prevHand = curHand ? takeItemFromHand(player, hand) : null;
    const res = putItemInHand(player, hand, removed);
    if (res.success) {
      if (prevHand) {
        addItemToFurnitureStorage(storage, prevHand, 1);
      }
      sound.playPickup();
      if (selectedKey === `drum:${idx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      if (prevHand) putItemInHand(player, hand, prevHand);
      storage.items.splice(Math.min(idx, storage.items.length), 0, removed);
      showToast('Не удалось взять вещь в руку');
    }
  };

  const movePlayerInvToDrum = (invIdx: number) => {
    if (wash.isRunning) {
      showToast('Люк заблокирован во время стирки — поставьте на паузу');
      return;
    }
    const it = player.inventory[invIdx];
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Вещь не помещается в барабан');
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

  const movePlayerHandToDrum = (hand: 'left' | 'right') => {
    if (wash.isRunning) {
      showToast('Люк заблокирован во время стирки — поставьте на паузу');
      return;
    }
    const it = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Вещь не помещается в барабан');
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

    const srcIsDrum = sourceKey.startsWith('drum:') && !sourceKey.startsWith('drum:empty');
    const srcIsInv = sourceKey.startsWith('inv:');
    const srcIsHand = sourceKey.startsWith('hand:');

    const dstIsDispenser = targetKey === 'dispenser';
    const dstIsDrum = targetKey.startsWith('drum:') || targetKey === 'zone:drum';
    const dstIsInv = targetKey.startsWith('inv:');
    const dstIsHand = targetKey.startsWith('hand:');
    const dstIsPlayerZone = targetKey === 'zone:player';

    if (dstIsDispenser) {
      if (srcIsInv || srcIsHand) {
        pourDetergentFromSource(sourceKey);
      } else {
        showToast('Перетащите упаковку порошка или геля из инвентаря или рук');
      }
      return;
    }

    if (srcIsDrum && dstIsHand) {
      moveDrumItemToHand(parseInt(sourceKey.slice(5), 10), targetKey === 'hand:left' ? 'left' : 'right');
      return;
    }
    if (srcIsDrum && (dstIsInv || dstIsPlayerZone)) {
      moveDrumItemToPlayer(parseInt(sourceKey.slice(5), 10));
      return;
    }
    if (srcIsInv && dstIsDrum) {
      movePlayerInvToDrum(parseInt(sourceKey.slice(4), 10));
      return;
    }
    if (srcIsHand && dstIsDrum) {
      movePlayerHandToDrum(sourceKey === 'hand:left' ? 'left' : 'right');
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

  const findTargetKeyAt = (x: number, y: number): string | null => {
    const root = gmRef.current;
    if (!root) return null;
    const slots = root.querySelectorAll<HTMLElement>('[data-kf-slot]');
    for (let i = 0; i < slots.length; i++) {
      const el = slots[i];
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return el.dataset.kfSlot || null;
      }
    }
    const zones = root.querySelectorAll<HTMLElement>('[data-kf-zone]');
    for (let i = 0; i < zones.length; i++) {
      const el = zones[i];
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return el.dataset.kfZone || null;
      }
    }
    return null;
  };

  const findScrollableAt = (x: number, y: number): HTMLElement | null => {
    const root = gmRef.current;
    if (!root) return null;
    const shadow = root.getRootNode() as ShadowRoot;
    let el: HTMLElement | null =
      shadow && typeof shadow.elementFromPoint === 'function'
        ? (shadow.elementFromPoint(x, y) as HTMLElement | null)
        : null;
    while (el && el !== root) {
      if (el.classList?.contains('scroll') && el.scrollHeight > el.clientHeight + 2) return el;
      el = el.parentElement;
    }
    const list = root.querySelectorAll<HTMLElement>('.scroll');
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const r = c.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && c.scrollHeight > c.clientHeight + 2) {
        return c;
      }
    }
    return null;
  };

  const startSlotPointer = (
    e: React.PointerEvent,
    slotKey: string,
    item: InventoryItem | null | undefined
  ) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    if (dragRef.current && e.pointerId !== dragRef.current.pointerId) {
      const scroller = findScrollableAt(e.clientX, e.clientY);
      if (scroller) {
        const scrollPtrId = e.pointerId;
        let lastY = e.clientY;
        const onMove = (ev: PointerEvent) => {
          if (ev.pointerId !== scrollPtrId) return;
          scroller.scrollTop += lastY - ev.clientY;
          lastY = ev.clientY;
        };
        const onEnd = (ev: PointerEvent) => {
          if (ev.pointerId !== scrollPtrId) return;
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onEnd);
          window.removeEventListener('pointercancel', onEnd);
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);
      }
      return;
    }

    if (!item) {
      if (selectedKey && selectedKey !== slotKey) {
        dropHandlerRef.current?.(slotKey, selectedKey);
        setSelectedKey(null);
      }
      return;
    }

    e.preventDefault();
    const state = {
      pointerId: e.pointerId,
      sourceKey: slotKey,
      item,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      active: false,
      overKey: null as string | null,
    };
    dragRef.current = state;

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;
      d.x = ev.clientX;
      d.y = ev.clientY;
      if (!d.active && Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) >= 6) {
        d.active = true;
      }
      if (d.active) {
        d.overKey = findTargetKeyAt(ev.clientX, ev.clientY);
        setDragUi({ sourceKey: d.sourceKey, item: d.item, x: d.x, y: d.y, overKey: d.overKey });
      }
    };

    const onUp = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      dragRef.current = null;
      setDragUi(null);

      if (d.active) {
        const target = findTargetKeyAt(ev.clientX, ev.clientY);
        if (target && target !== d.sourceKey) {
          dropHandlerRef.current?.(target, d.sourceKey);
          setSelectedKey(null);
        }
      } else {
        setSelectedKey(prev => (prev === d.sourceKey ? null : d.sourceKey));
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // ---- Derived Metrics ----
  const storageVol = getFurnitureStorageTotalVolume(storage);
  const storageWt = getFurnitureStorageTotalWeight(storage);
  const volPct = Math.min(100, Math.round((storageVol / cfg.capacityL) * 100));
  const wtPct = Math.min(100, Math.round((storageWt / cfg.maxWeightKg) * 100));
  const cyclePct =
    wash.totalDurationSec > 0
      ? Math.max(0, Math.min(100, Math.round(((wash.totalDurationSec - wash.remainingSec) / wash.totalDurationSec) * 100)))
      : 0;

  const pocketCap = getPlayerPocketCapacity(player);
  const playerWt = getPlayerTotalCarriedWeight(player);
  const compartments = getPlayerCompartments(player);

  const selectedDrumIdx = selectedKey?.startsWith('drum:') ? parseInt(selectedKey.slice(5), 10) : -1;
  const selectedDrumItem = selectedDrumIdx >= 0 ? storage.items[selectedDrumIdx] || null : null;

  const selectedPlayerItem: InventoryItem | null = (() => {
    if (!selectedKey) return null;
    if (selectedKey === 'hand:left') return player.leftHandItem || null;
    if (selectedKey === 'hand:right') return player.rightHandItem || null;
    if (selectedKey.startsWith('inv:')) return player.inventory[parseInt(selectedKey.slice(4), 10)] || null;
    return null;
  })();

  const renderDrumColumn = () => {
    const slotCount = Math.max(16, storage.items.length + 6);
    const isDropZone = dragUi?.overKey === 'zone:drum';
    const detMaxMl = wash.detergentMaxMl ?? WASHING_DETERGENT_MAX_ML;
    const detMl = wash.detergentMl ?? (wash.hasDetergent ? 100 : 0);
    const detPct = detMaxMl > 0 ? Math.max(0, Math.min(100, Math.round((detMl / detMaxMl) * 100))) : 0;
    const detIsDry = wash.detergentForm ? wash.detergentForm === 'dry' : true;
    const detDensity = detIsDry ? (LIQUID_REGISTRY.detergent?.densityKgPerL || 0.92) : 1;
    const detDisplayQty = Math.round(detMl * detDensity);
    const detMaxDisplayQty = Math.round(detMaxMl * detDensity);
    const detUnit = detMl > 0 ? (detIsDry ? 'г' : 'мл') : 'мл';
    const detColor = wash.detergentColor || '#e0f2fe';
    const selectedIsDetergent =
      selectedPlayerItem?.fluidStorage?.liquidId === 'detergent' &&
      (selectedPlayerItem.fluidStorage.currentMl || 0) > 0;
    const isDetDropOver = dragUi?.overKey === 'dispenser';

    return (
      <section
        className={'panel kf-col' + (isDropZone ? ' drop-on' : '')}
        data-kf-zone="zone:drum"
      >
        <div className="kf-col-head">
          <span className="kf-col-title">
            <RotateCw width={16} height={16} />
            <span>Барабан и программа стирки</span>
          </span>
          <span className="kf-col-meta">
            {storage.items.length} вещ. · {storageVol.toFixed(1)}/{cfg.capacityL.toFixed(0)} л
          </span>
        </div>

        {/* Drum & Program Panel */}
        <div className="kf-wash-box">
          <div className="kf-wash-drum">
            <div className={'kf-wash-ring' + (wash.isRunning ? ' locked' : '')}>
              <div
                className="kf-wash-water"
                style={{
                  height: `${wash.waterLevelPct}%`,
                  background: wash.hasDetergent && wash.detergentColor ? `${wash.detergentColor}70` : undefined,
                }}
              />
              <div className={'kf-wash-rotor' + (wash.isRunning ? ' spinning' : '')}>
                <RotateCw width={28} height={28} color={wash.isRunning ? '#7dd3fc' : '#8d939e'} />
              </div>
            </div>
            <div className="kf-wash-phase">
              {PHASE_LABEL_RU[wash.phase] || 'Ожидание'} · {formatTimerSec(wash.remainingSec)}
            </div>
          </div>

          <div className="kf-wash-ctrl">
            <div className="kf-wash-progs">
              {WASHING_PROGRAMS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  disabled={wash.isRunning}
                  className={'kf-wash-prog' + (wash.program === p.id ? ' on' : '')}
                  onClick={() => handleSelectProgram(p.id)}
                  title={p.descRu}
                >
                  {p.nameRu}
                </button>
              ))}
            </div>

            <div className="kf-prog-bar">
              <i style={{ width: `${cyclePct}%` }} />
            </div>

            <div className="kf-wash-acts">
              <button
                type="button"
                className={'btn btn-xs ' + (wash.isRunning ? 'btn-water-on' : 'btn-p')}
                onClick={handleStartPause}
              >
                {wash.isRunning ? <Pause width={13} height={13} /> : <Play width={13} height={13} />}
                <span>{wash.isRunning ? 'Пауза' : wash.phase === 'done' ? 'Повторить' : 'Старт'}</span>
              </button>

              <button
                type="button"
                className="btn btn-s btn-xs"
                onClick={handleReset}
                title="Сбросить цикл и разблокировать дверцу"
              >
                <RotateCcw width={13} height={13} />
                <span>Сброс</span>
              </button>
            </div>

            <div className="kf-sink-stats">
              <span>
                Вода: <b style={{ color: getTempColor(wash.waterTempC) }}>+{Math.round(wash.waterTempC)}°C</b>
              </span>
              <span>
                Обороты: <b>{wash.spinRpm} об/м</b>
              </span>
              <span>
                Люк: <b style={{ color: wash.isRunning ? '#e0ab45' : '#68a490' }}>
                  {wash.isRunning ? 'Заблокирован' : 'Открыт'}
                </b>
              </span>
            </div>
          </div>
        </div>

        {/* Dedicated Detergent Dispenser Tray Slot (Отсек СМС) */}
        <div
          data-kf-slot="dispenser"
          className={
            'kf-det-tray' +
            (detMl > 0 ? ' filled' : '') +
            (selectedIsDetergent ? ' ready' : '') +
            (isDetDropOver ? ' drop' : '')
          }
          onClick={() => {
            if (selectedIsDetergent && selectedKey) {
              pourDetergentFromSource(selectedKey);
            } else if (detMl <= 0) {
              showToast('Выберите порошок или гель в инвентаре и нажмите «Насыпать в отсек», либо перетащите его сюда');
            }
          }}
          title={
            detMl > 0
              ? `${wash.detergentVarietyRu || 'Моющее средство'}${wash.detergentIngredients ? `\nСостав: ${wash.detergentIngredients}` : ''}`
              : 'Отсек для стирального порошка и жидкого геля (до 250 мл / ~230 г)'
          }
        >
          <div className="kf-det-cup">
            {detMl > 0 && (
              <div
                className="kf-det-fill"
                style={{ height: `${detPct}%`, backgroundColor: detColor }}
              />
            )}
            <span className="kf-det-cup-ico">
              {detMl > 0 && !detIsDry ? (
                <Droplets width={16} height={16} color={detPct > 55 ? '#0f172a' : detColor} />
              ) : (
                <Sparkles width={16} height={16} color={detMl > 0 ? (detPct > 55 ? '#0f172a' : detColor) : '#7a776f'} />
              )}
            </span>
            <span className="kf-det-cup-lbl" style={{ color: detPct > 70 ? '#0f172a' : '#cfcbc1' }}>
              СМС
            </span>
          </div>

          <div className="kf-det-info">
            <div className="kf-det-head">
              <span className="kf-det-title">
                <span>Отсек СМС</span>
                {detMl > 0 && (
                  <span className="kf-det-form">
                    {detIsDry ? 'Сухой порошок' : 'Жидкий гель'}
                  </span>
                )}
              </span>
              <span className="kf-det-qty">
                {detDisplayQty} / {detMaxDisplayQty} {detUnit}
              </span>
            </div>

            <div className="kf-det-sub">
              {detMl > 0 ? (
                <>
                  <i className="kf-det-swatch" style={{ backgroundColor: detColor }} />
                  <span>
                    {wash.detergentVarietyRu || 'Моющее средство'}
                    {wash.detergentColorNameRu ? ` · ${wash.detergentColorNameRu}` : ''}
                  </span>
                </>
              ) : selectedIsDetergent ? (
                <span style={{ color: '#e0ab45' }}>
                  Нажмите на отсек, чтобы {isFluidStorageDryForm(selectedPlayerItem!.fluidStorage!) ? 'насыпать порошок' : 'залить гель'}
                </span>
              ) : (
                <span>Перетащите порошок или гель из инвентаря в этот слот</span>
              )}
            </div>

            <div className="kf-det-bar">
              <i style={{ width: `${detPct}%`, backgroundColor: detMl > 0 ? detColor : 'transparent' }} />
            </div>
          </div>

          {detMl > 0 && !wash.isRunning && (
            <button
              type="button"
              className="btn btn-d btn-xs"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                handleClearDetergent();
              }}
              title="Очистить отсек СМС"
            >
              <Trash2 width={13} height={13} />
            </button>
          )}
        </div>

        {/* Capacity Bars */}
        <div className="kf-meters">
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Загрузка барабана</span>
              <b>{storageVol.toFixed(1)} / {cfg.capacityL.toFixed(0)} л</b>
            </div>
            <div className="kf-bar">
              <i style={{ width: `${volPct}%` }} />
            </div>
          </div>
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Вес белья</span>
              <b>{storageWt.toFixed(1)} / {cfg.maxWeightKg.toFixed(0)} кг</b>
            </div>
            <div className="kf-bar">
              <i className="ok" style={{ width: `${wtPct}%` }} />
            </div>
          </div>
        </div>

        {/* Drum Items Grid */}
        <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
          <div className="kf-slots">
            {Array.from({ length: slotCount }, (_, idx) => {
              const it = storage.items[idx];
              const slotKey = it ? `drum:${idx}` : `drum:empty-${idx}`;
              const fill = getSlotFillInfo(it);
              const isDragging = dragUi?.sourceKey === slotKey;
              const isOver = dragUi?.overKey === slotKey;
              const isSel = selectedKey === slotKey;
              const temp = it ? (it.surfaceTemperature ?? it.temperature ?? 20) : 20;
              const wet = it ? Math.round(it.wetness || 0) : 0;

              return (
                <div
                  key={slotKey}
                  data-kf-slot={slotKey}
                  draggable={false}
                  onDragStart={e => e.preventDefault()}
                  onPointerDown={e => startSlotPointer(e, slotKey, it)}
                  onDoubleClick={() => it && moveDrumItemToPlayer(idx)}
                  className={
                    'kf-slot' +
                    (!it ? ' empty' : '') +
                    (isSel ? ' on' : '') +
                    (isOver ? ' drop' : '') +
                    (it && temp >= 52 ? ' hot' : '')
                  }
                  style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                  title={it ? `${it.nameRu} (${describeWashItemSub(it)})` : 'Свободное место в барабане'}
                >
                  {it && (
                    <>
                      <ItemIconCanvas itemId={it.itemId} item={it} size={42} />
                      {wet >= 10 && <span className="kf-wet-badge">{wet}%</span>}
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
          {selectedDrumItem && selectedDrumIdx >= 0 ? (
            <>
              <div className="kf-foot-item">
                <ItemIconCanvas itemId={selectedDrumItem.itemId} item={selectedDrumItem} size={30} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kf-foot-name">{selectedDrumItem.nameRu}</div>
                  <div className="kf-foot-sub">{describeWashItemSub(selectedDrumItem)}</div>
                </div>
              </div>
              <div className="kf-foot-acts">
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => moveDrumItemToHand(selectedDrumIdx, 'right')}
                >
                  В руку
                </button>
                <button
                  type="button"
                  className="btn btn-p btn-xs"
                  onClick={() => moveDrumItemToPlayer(selectedDrumIdx)}
                >
                  Достать
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              {activeProg.descRu} ({activeProg.tempC}°C · {activeProg.rpm} об/мин)
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
                const wet = it ? Math.round(it.wetness || 0) : 0;
                return (
                  <div
                    key={slotKey}
                    data-kf-slot={slotKey}
                    draggable={false}
                    onDragStart={e => e.preventDefault()}
                    onPointerDown={e => startSlotPointer(e, slotKey, it)}
                    onDoubleClick={() => it && movePlayerHandToDrum(hand)}
                    className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                    style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                    title={it ? `${it.nameRu} (${describeWashItemSub(it)})` : hand === 'left' ? 'Левая рука пуста' : 'Правая рука пуста'}
                  >
                    <span className="kf-badge">{hand === 'left' ? 'Л' : 'П'}</span>
                    {it ? (
                      <>
                        <ItemIconCanvas itemId={it.itemId} item={it} size={42} />
                        {wet >= 10 && <span className="kf-temp" style={{ color: '#7dd3fc' }}>{wet}%</span>}
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
                    const wet = it ? Math.round(it.wetness || 0) : 0;

                    return (
                      <div
                        key={slotKey}
                        data-kf-slot={slotKey}
                        draggable={false}
                        onDragStart={e => e.preventDefault()}
                        onPointerDown={e => startSlotPointer(e, slotKey, it)}
                        onDoubleClick={() => it && movePlayerInvToDrum(slotIdx)}
                        className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                        style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                        title={it ? `${it.nameRu} (${describeWashItemSub(it)})` : 'Свободный слот'}
                      >
                        {it && (
                          <>
                            <ItemIconCanvas itemId={it.itemId} item={it} size={42} />
                            {wet >= 10 && <span className="kf-wet-badge">{wet}%</span>}
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
                  <div className="kf-foot-sub">{describeWashItemSub(selectedPlayerItem)}</div>
                </div>
              </div>
              <div className="kf-foot-acts">
                {selectedPlayerItem.fluidStorage?.liquidId === 'detergent' &&
                  (selectedPlayerItem.fluidStorage.currentMl || 0) > 0 && (
                    <button
                      type="button"
                      className="btn btn-p btn-xs"
                      onClick={() => pourDetergentFromSource(selectedKey)}
                    >
                      <Sparkles width={13} height={13} />
                      <span>
                        {isFluidStorageDryForm(selectedPlayerItem.fluidStorage)
                          ? 'Насыпать в отсек'
                          : 'Залить в отсек'}
                      </span>
                    </button>
                  )}
                <button
                  type="button"
                  className={
                    'btn btn-xs ' +
                    (selectedPlayerItem.fluidStorage?.liquidId === 'detergent' &&
                    (selectedPlayerItem.fluidStorage.currentMl || 0) > 0
                      ? 'btn-s'
                      : 'btn-p')
                  }
                  onClick={() => {
                    if (selectedKey === 'hand:left') movePlayerHandToDrum('left');
                    else if (selectedKey === 'hand:right') movePlayerHandToDrum('right');
                    else if (selectedKey.startsWith('inv:')) movePlayerInvToDrum(parseInt(selectedKey.slice(4), 10));
                  }}
                >
                  В барабан
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              Загрузите вещи в барабан и запустите нужную программу стирки или отжима
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <ShadowHost css={kitchenFurnitureCss}>
      <div id="w" ref={hostRef}>
        <div className="gm" ref={gmRef} id="washing-machine-modal">
          <div className="kf-bg" />

          <header className="top">
            <div className="top-l">
              <RotateCw width={24} height={24} color={wash.isRunning ? '#6cb4e8' : '#c9922b'} style={{ flex: 'none' }} />
              <div className="cn ttl">Стиральная машина</div>
              <span className="sub-top">Стирка, полоскание и отжим</span>
            </div>
            <div className="top-r">
              {wash.isRunning && (
                <div className="chip">
                  <Lock width={14} height={14} color="#e0ab45" />
                  <span>Люк закрыт</span>
                </div>
              )}
              <div className="chip">
                <span>Режим</span>
                <b>{activeProg.nameRu}</b>
              </div>
              <div className="chip">
                <span>Осталось</span>
                <b>{formatTimerSec(wash.remainingSec)}</b>
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
              {renderDrumColumn()}
              {renderPlayerInventoryColumn()}
            </div>
          </main>

          {toastMsg && <div className="kf-toast">{toastMsg}</div>}

          <div className="hint">
            <div className="hint-g">
              <span className="key">Esc</span>
              <span>Закрыть</span>
              <span className="key">2× Клик</span>
              <span>Загрузить / Достать</span>
              <span className="key">Отжим</span>
              <span>Снижает влажность вещей и сушит их</span>
            </div>
            <div className="hint-r">
              Стирка продолжается в реальном времени после закрытия окна
            </div>
          </div>
        </div>

        {dragUi && (
          <div className="kf-drag-ghost" style={{ left: dragUi.x - 32, top: dragUi.y - 32 }}>
            <ItemIconCanvas itemId={dragUi.item.itemId} item={dragUi.item} size={46} />
          </div>
        )}
      </div>
    </ShadowHost>
  );
};

export const WashingMachineModal: React.FC<WashingMachineModalProps> = ({
  isOpen,
  storage,
  player,
  ...rest
}) => {
  if (!isOpen || !storage || !player) return null;
  return <WashingMachineModalContent storage={storage} player={player} {...rest} />;
};

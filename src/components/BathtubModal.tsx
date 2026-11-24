import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import {
  FurnitureStorage,
  BATH_CONFIG,
  ensureSinkState,
  getBathStreamMetrics,
  toggleSinkWater,
  setSinkValves,
  toggleSinkPlug,
  drainSinkBasin,
  fillItemAtSink,
  wetOrRinseItemAtSink,
  emptyContainerInSink,
  takeBathWashPlayer,
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
import { tickSinkStateThermodynamics } from '../itemThermalSystem';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { sound } from '../audio';
import kitchenFurnitureCss from './kitchenFurniture.css?inline';
import {
  Bath,
  Droplets,
  Flame,
  Snowflake,
  Hand,
  User,
  Shirt,
  Luggage,
  Minus,
  Plus,
  Power,
  Waves,
  Trash2,
  Sparkles,
  X,
} from 'lucide-react';

export interface BathtubModalProps {
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

function getSlotFillInfo(item: InventoryItem | null | undefined): { pct: number | null; color?: string; label?: string } {
  if (!item) return { pct: null };
  const wrapper = getEffectiveFluidWrapper(item);
  if (wrapper && wrapper.state.maxMl > 0) {
    const pct = Math.max(0, Math.min(100, Math.round((wrapper.state.currentMl / wrapper.state.maxMl) * 100)));
    return {
      pct,
      color: wrapper.state.currentMl > 0 ? '#68a490' : undefined,
      label:
        wrapper.state.currentMl > 0
          ? `${Math.round(wrapper.state.currentMl)}/${Math.round(wrapper.state.maxMl)} мл`
          : 'Пусто',
    };
  }
  if (item.isContainer && item.containerCapacityL) {
    const used = (item.contents || []).reduce((s, c) => s + (c ? getItemTotalVolume(c) : 0), 0);
    const pct = Math.max(0, Math.min(100, Math.round((used / item.containerCapacityL) * 100)));
    return { pct, label: `${item.contents?.length || 0} предм.` };
  }
  return { pct: null };
}

function getTempColor(temp: number): string {
  if (temp >= 52) return '#f0884a';
  if (temp >= 34) return '#e0ab45';
  if (temp <= 14) return '#7dd3fc';
  return '#a29e93';
}

function getWaterColor(temp: number): string {
  if (temp >= 50) return '#f0884a';
  if (temp >= 34) return '#7dc4c0';
  return '#5ea3d6';
}

function describeBathItemSub(item: InventoryItem): string {
  const parts: string[] = [];
  const temp = Math.round(item.temperature ?? 20);
  parts.push(`${temp > 0 ? '+' : ''}${temp}°C`);

  const wet = Math.round(item.wetness || 0);
  if (wet >= 5) {
    const liq = item.soakedLiquidNameRu || 'Вода';
    parts.push(`${liq}: ${wet}%`);
  }

  const wrapper = getEffectiveFluidWrapper(item);
  if (wrapper && wrapper.state.maxMl > 0) {
    parts.push(`${Math.round(wrapper.state.currentMl)}/${Math.round(wrapper.state.maxMl)} мл`);
  } else {
    parts.push(formatWeightRu(getItemTotalWeight(item)));
  }

  return parts.join(' · ');
}

const BathtubVisualSvg: React.FC<{
  flowing: boolean;
  waterColor: string;
  waterTemp: number;
  basinPct: number;
  plugClosed: boolean;
}> = ({ flowing, waterColor, waterTemp, basinPct, plugClosed }) => {
  const clampedPct = Math.max(0, Math.min(100, basinPct));
  const waterH = Math.round((clampedPct / 100) * 30);
  const waterY = 92 - waterH;
  const showSteam = (flowing || clampedPct > 5) && waterTemp >= 44;

  return (
    <svg width="100%" height="100%" viewBox="0 0 112 112" aria-hidden="true">
      {/* Wall Faucet & Curved Tub Spout */}
      <path
        d="M22 30 L22 20 Q22 14 29 14 L38 14 Q43 14 43 20 L43 26"
        fill="none"
        stroke="#8d939e"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="16" y="29" width="12" height="5" rx="2" fill="#6b7280" />
      <rect x="39" y="25" width="8" height="3.5" rx="1.5" fill="#9ca3af" />

      {/* Tub Shell Silhouette */}
      <path
        d="M10 60 L102 60 L96 86 Q93 94 82 94 L26 94 Q17 94 14 86 Z"
        fill="rgba(255,255,255,0.035)"
        stroke="rgba(255,255,255,0.24)"
        strokeWidth="2"
      />
      {/* Rim */}
      <rect x="8" y="57" width="96" height="5" rx="2.5" fill="rgba(241,245,249,0.22)" />

      {/* Tub Standing Water */}
      {waterH > 0 && (
        <path
          d={`M15 ${waterY} L97 ${waterY} L94 86 Q91 92 82 92 L26 92 Q18 92 16 86 Z`}
          fill={waterColor}
          fillOpacity={0.38}
        />
      )}

      {/* Running Stream */}
      {flowing && (
        <>
          <line
            x1="43"
            y1="29"
            x2="43"
            y2={waterH > 0 ? waterY : 90}
            stroke={waterColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeOpacity={0.85}
          />
          <line
            x1="43"
            y1="29"
            x2="43"
            y2={waterH > 0 ? waterY : 90}
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeDasharray="5 5"
            strokeOpacity={0.55}
          />
        </>
      )}

      {/* Steam */}
      {showSteam && (
        <g stroke="rgba(244,241,234,0.38)" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M36 52 Q33 45 37 38" />
          <path d="M58 50 Q55 43 59 36" />
          <path d="M78 52 Q75 45 79 38" />
        </g>
      )}

      {/* Tub Feet */}
      <rect x="22" y="94" width="6" height="6" rx="2" fill="#6b7280" />
      <rect x="84" y="94" width="6" height="6" rx="2" fill="#6b7280" />

      {/* Drain / Plug */}
      <rect
        x="38"
        y="90"
        width="12"
        height="4"
        rx="2"
        fill={plugClosed ? '#c9922b' : '#4b5563'}
      />
    </svg>
  );
};

const BathtubModalContent: React.FC<{
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

  const bath = ensureSinkState(storage);

  const showToast = (msg: string) => setToastMsg(msg);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    let ticks = 0;
    const id = setInterval(() => {
      const changed = tickSinkStateThermodynamics(storage, 0.5, Date.now() / 1000);
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

  const stopInputKeys = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape') {
      e.stopPropagation();
      e.nativeEvent.stopPropagation();
    }
  };

  // ---- Tap & Bath Actions ----
  const handleToggleWater = () => {
    toggleSinkWater(storage);
    sound.playUseItem();
    notifyChanged();
  };

  const handleColdChange = (val: number) => {
    setSinkValves(storage, val, bath.hotValve);
    notifyChanged();
  };

  const handleHotChange = (val: number) => {
    setSinkValves(storage, bath.coldValve, val);
    notifyChanged();
  };

  const handleTogglePlug = () => {
    toggleSinkPlug(storage);
    sound.playUseItem();
    notifyChanged();
  };

  const handleDrainBath = () => {
    const drained = drainSinkBasin(storage);
    if (drained > 0) {
      sound.playWaterSpray();
      showToast(`Спущено в канализацию: ${(drained / 1000).toFixed(1)} л`);
      notifyChanged();
    }
  };

  const handleTakeBath = () => {
    const res = takeBathWashPlayer(storage, player);
    if (res.success) {
      sound.playWaterSpray();
      showToast(res.message);
      notifyChanged();
    } else {
      showToast(res.message);
    }
  };

  // ---- Item Transfer Helpers ----
  const moveBathItemToPlayer = (bathIdx: number) => {
    const it = storage.items[bathIdx];
    if (!it) return;
    const removed = removeItemFromFurnitureStorage(storage, bathIdx, 1);
    if (!removed) return;
    if (addItemToPlayer(player, removed)) {
      sound.playPickup();
      if (selectedKey === `bath:${bathIdx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      storage.items.splice(Math.min(bathIdx, storage.items.length), 0, removed);
      showToast('В инвентаре игрока нет места');
    }
  };

  const moveBathItemToHand = (bathIdx: number, hand: 'left' | 'right') => {
    const it = storage.items[bathIdx];
    if (!it) return;
    const curHand = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (curHand) {
      const check = canItemFitInFurniture(storage, curHand);
      if (!check.fits) {
        showToast(check.reason || 'Освободите руку или место в ванне');
        return;
      }
    }
    const removed = removeItemFromFurnitureStorage(storage, bathIdx, 1);
    if (!removed) return;
    const prevHand = curHand ? takeItemFromHand(player, hand) : null;
    const res = putItemInHand(player, hand, removed);
    if (res.success) {
      if (prevHand) {
        addItemToFurnitureStorage(storage, prevHand, 1);
      }
      sound.playPickup();
      if (selectedKey === `bath:${bathIdx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      if (prevHand) putItemInHand(player, hand, prevHand);
      storage.items.splice(Math.min(bathIdx, storage.items.length), 0, removed);
      showToast('Не удалось взять предмет в руку');
    }
  };

  const movePlayerInvToBath = (invIdx: number) => {
    const it = player.inventory[invIdx];
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Предмет не помещается в ванну');
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

  const movePlayerHandToBath = (hand: 'left' | 'right') => {
    const it = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Предмет не помещается в ванну');
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

  const handleFillItem = (item: InventoryItem) => {
    const res = fillItemAtSink(storage, item, player);
    if (res.success) sound.playWaterSpray();
    showToast(res.message);
    notifyChanged();
  };

  const handleWetItem = (item: InventoryItem) => {
    const res = wetOrRinseItemAtSink(storage, item);
    if (res.success) sound.playWaterSpray();
    showToast(res.message);
    notifyChanged();
  };

  const handleEmptyItem = (item: InventoryItem) => {
    const res = emptyContainerInSink(storage, item);
    if (res.success) sound.playWaterSpray();
    showToast(res.message);
    notifyChanged();
  };

  // ---- Drag & Drop ----
  const handleDrop = (targetKey: string, sourceKey: string) => {
    if (!targetKey || !sourceKey || targetKey === sourceKey) return;

    const srcIsBath = sourceKey.startsWith('bath:') && !sourceKey.startsWith('bath:empty');
    const srcIsInv = sourceKey.startsWith('inv:');
    const srcIsHand = sourceKey.startsWith('hand:');

    const dstIsBath = targetKey.startsWith('bath:') || targetKey === 'zone:bath';
    const dstIsInv = targetKey.startsWith('inv:');
    const dstIsHand = targetKey.startsWith('hand:');
    const dstIsPlayerZone = targetKey === 'zone:player';

    if (srcIsBath && dstIsHand) {
      moveBathItemToHand(parseInt(sourceKey.slice(5), 10), targetKey === 'hand:left' ? 'left' : 'right');
      return;
    }
    if (srcIsBath && (dstIsInv || dstIsPlayerZone)) {
      moveBathItemToPlayer(parseInt(sourceKey.slice(5), 10));
      return;
    }
    if (srcIsInv && dstIsBath) {
      movePlayerInvToBath(parseInt(sourceKey.slice(4), 10));
      return;
    }
    if (srcIsHand && dstIsBath) {
      movePlayerHandToBath(sourceKey === 'hand:left' ? 'left' : 'right');
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
  const metrics = getBathStreamMetrics(bath);
  const activeTemp = metrics.flowing ? metrics.streamTempC : bath.waterTemperature;
  const waterColor = getWaterColor(activeTemp);
  const basinPct = Math.min(100, Math.round((bath.basinWaterMl / Math.max(1, bath.basinMaxMl)) * 100));

  const storageVol = getFurnitureStorageTotalVolume(storage);
  const storageWt = getFurnitureStorageTotalWeight(storage);
  const volPct = Math.min(100, Math.round((storageVol / BATH_CONFIG.capacityL) * 100));
  const wtPct = Math.min(100, Math.round((storageWt / BATH_CONFIG.maxWeightKg) * 100));

  const pocketCap = getPlayerPocketCapacity(player);
  const playerWt = getPlayerTotalCarriedWeight(player);
  const compartments = getPlayerCompartments(player);

  const selectedBathIdx = selectedKey?.startsWith('bath:') ? parseInt(selectedKey.slice(5), 10) : -1;
  const selectedBathItem = selectedBathIdx >= 0 ? storage.items[selectedBathIdx] || null : null;

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

  const hasLiquidInside = (it: InventoryItem | null): boolean => {
    return Boolean(it && it.fluidStorage && (it.fluidStorage.currentMl || 0) > 0);
  };

  const renderBathColumn = () => {
    const slotCount = Math.max(18, storage.items.length + 6);
    const isDropZone = dragUi?.overKey === 'zone:bath';

    return (
      <section
        className={'panel kf-col' + (isDropZone ? ' drop-on' : '')}
        data-kf-zone="zone:bath"
      >
        <div className="kf-col-head">
          <span className="kf-col-title">
            <Bath width={16} height={16} />
            <span>Ванна и смеситель (160 л)</span>
          </span>
          <span className="kf-col-meta">
            {storage.items.length} предм. · {storageVol.toFixed(1)}/{BATH_CONFIG.capacityL.toFixed(0)} л
          </span>
        </div>

        <div className="kf-sink-mixer">
          <div className="kf-sink-viz">
            <BathtubVisualSvg
              flowing={metrics.flowing}
              waterColor={waterColor}
              waterTemp={activeTemp}
              basinPct={basinPct}
              plugClosed={bath.plugClosed}
            />
          </div>

          <div className="kf-sink-controls">
            <div className="kf-sink-toggles">
              <button
                type="button"
                className={'btn btn-xs ' + (bath.waterOn ? 'btn-water-on' : 'btn-s')}
                onClick={handleToggleWater}
              >
                <Power width={13} height={13} />
                <span>{bath.waterOn ? 'Кран: Вкл' : 'Кран: Выкл'}</span>
              </button>

              <button
                type="button"
                className={'btn btn-xs ' + (bath.plugClosed ? 'btn-p' : 'btn-s')}
                onClick={handleTogglePlug}
              >
                <Waves width={13} height={13} />
                <span>{bath.plugClosed ? 'Пробка' : 'Слив открыт'}</span>
              </button>

              <button
                type="button"
                className="btn btn-s btn-xs"
                disabled={bath.basinWaterMl < 1}
                onClick={handleDrainBath}
                title="Спустить воду из ванны"
              >
                <Trash2 width={13} height={13} />
                <span>Спустить</span>
              </button>

              <button
                type="button"
                className="btn btn-p btn-xs"
                onClick={handleTakeBath}
                title="Освежиться и согреться (от 15 л воды или под душем)"
              >
                <Sparkles width={13} height={13} />
                <span>Помыться</span>
              </button>
            </div>

            <div className="kf-valves">
              <div className="kf-valve-row">
                <span className="kf-valve-lbl">
                  <Snowflake width={13} height={13} color="#6cb4e8" />
                  <span>Холод.</span>
                </span>
                <button
                  type="button"
                  className="kf-valve-step"
                  onClick={() => handleColdChange(bath.coldValve - 10)}
                  aria-label="Уменьшить холодную воду"
                >
                  <Minus width={13} height={13} />
                </button>
                <input
                  type="range"
                  className="kf-range cold"
                  min={0}
                  max={100}
                  step={5}
                  value={bath.coldValve}
                  onChange={e => handleColdChange(Number(e.target.value))}
                  onKeyDown={stopInputKeys}
                  aria-label="Вентиль холодной воды"
                />
                <button
                  type="button"
                  className="kf-valve-step"
                  onClick={() => handleColdChange(bath.coldValve + 10)}
                  aria-label="Увеличить холодную воду"
                >
                  <Plus width={13} height={13} />
                </button>
                <span className="kf-valve-pct">{bath.coldValve}%</span>
              </div>

              <div className="kf-valve-row">
                <span className="kf-valve-lbl">
                  <Flame width={13} height={13} color="#f0884a" />
                  <span>Горяч.</span>
                </span>
                <button
                  type="button"
                  className="kf-valve-step"
                  onClick={() => handleHotChange(bath.hotValve - 10)}
                  aria-label="Уменьшить горячую воду"
                >
                  <Minus width={13} height={13} />
                </button>
                <input
                  type="range"
                  className="kf-range hot"
                  min={0}
                  max={100}
                  step={5}
                  value={bath.hotValve}
                  onChange={e => handleHotChange(Number(e.target.value))}
                  onKeyDown={stopInputKeys}
                  aria-label="Вентиль горячей воды"
                />
                <button
                  type="button"
                  className="kf-valve-step"
                  onClick={() => handleHotChange(bath.hotValve + 10)}
                  aria-label="Увеличить горячую воду"
                >
                  <Plus width={13} height={13} />
                </button>
                <span className="kf-valve-pct">{bath.hotValve}%</span>
              </div>
            </div>

            <div className="kf-sink-stats">
              <span>
                Вода: <b style={{ color: getTempColor(activeTemp) }}>+{Math.round(activeTemp)}°C</b>
              </span>
              <span>
                Поток: <b>{metrics.flowing ? `${metrics.flowMlPerSec} мл/с` : 'Выключен'}</b>
              </span>
              <span>
                Ванна: <b>{(bath.basinWaterMl / 1000).toFixed(1)} / {(bath.basinMaxMl / 1000).toFixed(0)} л</b>
              </span>
            </div>
          </div>
        </div>

        <div className="kf-meters">
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Объём предметов</span>
              <b>{storageVol.toFixed(1)} / {BATH_CONFIG.capacityL.toFixed(0)} л</b>
            </div>
            <div className="kf-bar">
              <i style={{ width: `${volPct}%` }} />
            </div>
          </div>
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Нагрузка</span>
              <b>{storageWt.toFixed(1)} / {BATH_CONFIG.maxWeightKg.toFixed(0)} кг</b>
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
              const slotKey = it ? `bath:${idx}` : `bath:empty-${idx}`;
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
                  onDoubleClick={() => it && moveBathItemToPlayer(idx)}
                  className={
                    'kf-slot' +
                    (!it ? ' empty' : '') +
                    (isSel ? ' on' : '') +
                    (isOver ? ' drop' : '') +
                    (it && temp >= 52 ? ' hot' : '')
                  }
                  style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                  title={it ? `${it.nameRu} (${describeBathItemSub(it)})` : 'Свободное место в ванне'}
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
                      {it.count > 1 ? (
                        <span className="kf-cnt">{it.count}</span>
                      ) : it.isContainer ? (
                        <span className="kf-cnt">{it.contents?.length || 0}</span>
                      ) : null}
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
          {selectedBathItem && selectedBathIdx >= 0 ? (
            <>
              <div className="kf-foot-item">
                <ItemIconCanvas itemId={selectedBathItem.itemId} item={selectedBathItem} size={30} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kf-foot-name">{selectedBathItem.nameRu}</div>
                  <div className="kf-foot-sub">{describeBathItemSub(selectedBathItem)}</div>
                </div>
              </div>
              <div className="kf-foot-acts">
                {isContainerFillable(selectedBathItem) && (
                  <button
                    type="button"
                    className="btn btn-water-on btn-xs"
                    onClick={() => handleFillItem(selectedBathItem)}
                  >
                    Набрать
                  </button>
                )}
                {hasLiquidInside(selectedBathItem) && (
                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    onClick={() => handleEmptyItem(selectedBathItem)}
                  >
                    Слить
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => handleWetItem(selectedBathItem)}
                >
                  Замочить
                </button>
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => moveBathItemToHand(selectedBathIdx, 'right')}
                >
                  В руку
                </button>
                <button
                  type="button"
                  className="btn btn-p btn-xs"
                  onClick={() => moveBathItemToPlayer(selectedBathIdx)}
                >
                  Забрать
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              Наберите воду в ванну для замачивания вещей, наполнения вёдер или купания
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
                    onDoubleClick={() => it && movePlayerHandToBath(hand)}
                    className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                    style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                    title={it ? `${it.nameRu} (${describeBathItemSub(it)})` : hand === 'left' ? 'Левая рука пуста' : 'Правая рука пуста'}
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
                        onDoubleClick={() => it && movePlayerInvToBath(slotIdx)}
                        className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                        style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                        title={it ? `${it.nameRu} (${describeBathItemSub(it)})` : 'Свободный слот'}
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
                            {it.count > 1 ? (
                              <span className="kf-cnt">{it.count}</span>
                            ) : it.isContainer ? (
                              <span className="kf-cnt">{it.contents?.length || 0}</span>
                            ) : null}
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
                  <div className="kf-foot-sub">{describeBathItemSub(selectedPlayerItem)}</div>
                </div>
              </div>
              <div className="kf-foot-acts">
                {isContainerFillable(selectedPlayerItem) && (
                  <button
                    type="button"
                    className="btn btn-water-on btn-xs"
                    onClick={() => handleFillItem(selectedPlayerItem)}
                  >
                    Набрать
                  </button>
                )}
                {hasLiquidInside(selectedPlayerItem) && (
                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    onClick={() => handleEmptyItem(selectedPlayerItem)}
                  >
                    Слить
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => handleWetItem(selectedPlayerItem)}
                >
                  Намочить
                </button>
                <button
                  type="button"
                  className="btn btn-p btn-xs"
                  onClick={() => {
                    if (selectedKey === 'hand:left') movePlayerHandToBath('left');
                    else if (selectedKey === 'hand:right') movePlayerHandToBath('right');
                    else if (selectedKey.startsWith('inv:')) movePlayerInvToBath(parseInt(selectedKey.slice(4), 10));
                  }}
                >
                  В ванну
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              Перетащите предметы в ванну или нажмите 2× для замачивания и набора воды
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <ShadowHost css={kitchenFurnitureCss}>
      <div id="w" ref={hostRef}>
        <div className="gm" ref={gmRef} id="bathtub-modal">
          <div className="kf-bg" />

          <header className="top">
            <div className="top-l">
              <Bath width={24} height={24} color={metrics.flowing ? '#6cb4e8' : '#c9922b'} style={{ flex: 'none' }} />
              <div className="cn ttl">Ванна</div>
              <span className="sub-top">Наполнение, купание и замачивание</span>
            </div>
            <div className="top-r">
              <div className="chip">
                <Droplets width={14} height={14} color={waterColor} />
                <span>Набрано</span>
                <b>{(bath.basinWaterMl / 1000).toFixed(1)} л</b>
              </div>
              <div className="chip">
                <span>Темп.</span>
                <b style={{ color: getTempColor(activeTemp) }}>+{Math.round(activeTemp)}°C</b>
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
              {renderBathColumn()}
              {renderPlayerInventoryColumn()}
            </div>
          </main>

          {toastMsg && <div className="kf-toast">{toastMsg}</div>}

          <div className="hint">
            <div className="hint-g">
              <span className="key">Esc</span>
              <span>Закрыть</span>
              <span className="key">2× Клик</span>
              <span>В ванну / Забрать</span>
              <span className="key">Пробка</span>
              <span>Набрать до 160 л тёплой воды</span>
            </div>
            <div className="hint-r">
              Наполнение и термодинамика ванны продолжаются в реальном времени
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

export const BathtubModal: React.FC<BathtubModalProps> = ({
  isOpen,
  storage,
  player,
  ...rest
}) => {
  if (!isOpen || !storage || !player) return null;
  return <BathtubModalContent storage={storage} player={player} {...rest} />;
};

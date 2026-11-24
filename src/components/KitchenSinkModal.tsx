import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import {
  FurnitureStorage,
  SINK_CONFIG,
  ensureSinkState,
  getSinkStreamMetrics,
  toggleSinkWater,
  setSinkValves,
  toggleSinkPlug,
  drainSinkBasin,
  fillItemAtSink,
  wetOrRinseItemAtSink,
  emptyContainerInSink,
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
  Utensils,
  X,
} from 'lucide-react';

export interface KitchenSinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage: FurnitureStorage | null;
  player: Player | null;
  world?: GameWorld | null;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
  onOpenParentCounter?: () => void;
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
  if (item.isContainer && item.capacityL) {
    const used = (item.contents || []).reduce((s, c) => s + (c ? getItemTotalVolume(c) : 0), 0);
    const pct = Math.max(0, Math.min(100, Math.round((used / item.capacityL) * 100)));
    return { pct, label: `${item.contents?.length || 0} предм.` };
  }
  return { pct: null };
}

function getTempColor(temp: number): string {
  if (temp >= 52) return '#f0884a';
  if (temp >= 38) return '#e0ab45';
  if (temp <= 14) return '#7dd3fc';
  return '#a29e93';
}

function getWaterColor(temp: number): string {
  if (temp >= 50) return '#f0884a';
  if (temp >= 34) return '#7dc4c0';
  return '#5ea3d6';
}

function describeSinkItemSub(item: InventoryItem): string {
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

const SinkVisualSvg: React.FC<{
  flowing: boolean;
  waterColor: string;
  waterTemp: number;
  basinPct: number;
  plugClosed: boolean;
}> = ({ flowing, waterColor, waterTemp, basinPct, plugClosed }) => {
  const clampedPct = Math.max(0, Math.min(100, basinPct));
  const waterH = Math.round((clampedPct / 100) * 32);
  const waterY = 96 - waterH;
  const showSteam = (flowing || clampedPct > 5) && waterTemp >= 46;

  return (
    <svg width="100%" height="100%" viewBox="0 0 112 112" aria-hidden="true">
      {/* Faucet Pipe & Spout */}
      <path
        d="M56 26 L56 16 Q56 10 64 10 L74 10 Q80 10 80 17 L80 28"
        fill="none"
        stroke="#8d939e"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <rect x="47" y="25" width="18" height="5" rx="2" fill="#6b7280" />
      <rect x="76" y="27" width="8" height="4" rx="1.5" fill="#9ca3af" />

      {/* Basin Shell */}
      <path
        d="M16 62 L96 62 L90 94 Q89 98 84 98 L28 98 Q23 98 22 94 Z"
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="2"
      />

      {/* Basin Water Level */}
      {waterH > 0 && (
        <path
          d={`M22 ${waterY} L90 ${waterY} L88 94 Q87 96 84 96 L28 96 Q25 96 24 94 Z`}
          fill={waterColor}
          fillOpacity={0.34}
        />
      )}

      {/* Running Stream */}
      {flowing && (
        <>
          <line
            x1="80"
            y1="32"
            x2="80"
            y2={waterH > 0 ? waterY : 94}
            stroke={waterColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeOpacity={0.85}
          />
          <line
            x1="80"
            y1="32"
            x2="80"
            y2={waterH > 0 ? waterY : 94}
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeDasharray="5 5"
            strokeOpacity={0.55}
          />
        </>
      )}

      {/* Steam Wisps when hot */}
      {showSteam && (
        <g stroke="rgba(244,241,234,0.38)" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M40 56 Q37 49 41 42" />
          <path d="M56 54 Q53 46 57 39" />
          <path d="M70 56 Q67 49 71 43" />
        </g>
      )}

      {/* Drain / Plug */}
      <rect
        x="50"
        y="94"
        width="12"
        height="4"
        rx="2"
        fill={plugClosed ? '#c9922b' : '#4b5563'}
      />
    </svg>
  );
};

const KitchenSinkModalContent: React.FC<{
  onClose: () => void;
  storage: FurnitureStorage;
  player: Player;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
  onOpenParentCounter?: () => void;
}> = ({ onClose, storage, player, onInventoryUpdated, onVitalsChange, onOpenParentCounter }) => {
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

  const sink = ensureSinkState(storage);

  const showToast = (msg: string) => setToastMsg(msg);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Live 500ms tick while sink modal is open
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

  // ---- Faucet & Mixer Actions ----
  const handleToggleWater = () => {
    toggleSinkWater(storage);
    sound.playUseItem();
    notifyChanged();
  };

  const handleColdChange = (val: number) => {
    setSinkValves(storage, val, sink.hotValve);
    notifyChanged();
  };

  const handleHotChange = (val: number) => {
    setSinkValves(storage, sink.coldValve, val);
    notifyChanged();
  };

  const handleTogglePlug = () => {
    toggleSinkPlug(storage);
    sound.playUseItem();
    notifyChanged();
  };

  const handleDrainBasin = () => {
    const drained = drainSinkBasin(storage);
    if (drained > 0) {
      sound.playWaterSpray();
      showToast(`Спущено в канализацию: ${Math.round(drained)} мл`);
      notifyChanged();
    }
  };

  // ---- Item Transfer Helpers ----
  const moveSinkItemToPlayer = (sinkIdx: number) => {
    const it = storage.items[sinkIdx];
    if (!it) return;
    const removed = removeItemFromFurnitureStorage(storage, sinkIdx, 1);
    if (!removed) return;
    if (addItemToPlayer(player, removed)) {
      sound.playPickup();
      if (selectedKey === `sink:${sinkIdx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      storage.items.splice(Math.min(sinkIdx, storage.items.length), 0, removed);
      showToast('В инвентаре игрока нет места');
    }
  };

  const moveSinkItemToHand = (sinkIdx: number, hand: 'left' | 'right') => {
    const it = storage.items[sinkIdx];
    if (!it) return;
    const curHand = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (curHand) {
      const check = canItemFitInFurniture(storage, curHand);
      if (!check.fits) {
        showToast(check.reason || 'Освободите руку или место в раковине');
        return;
      }
    }
    const removed = removeItemFromFurnitureStorage(storage, sinkIdx, 1);
    if (!removed) return;
    const res = putItemInHand(player, hand, removed);
    if (res.success) {
      if (res.displaced) {
        addItemToFurnitureStorage(storage, res.displaced, 1);
      }
      sound.playPickup();
      if (selectedKey === `sink:${sinkIdx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      storage.items.splice(Math.min(sinkIdx, storage.items.length), 0, removed);
      showToast('Не удалось взять предмет в руку');
    }
  };

  const movePlayerInvToSink = (invIdx: number) => {
    const it = player.inventory[invIdx];
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Предмет не помещается в раковину');
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

  const movePlayerHandToSink = (hand: 'left' | 'right') => {
    const it = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Предмет не помещается в раковину');
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

  // ---- Direct Fill / Wet / Empty Actions ----
  const handleFillItem = (item: InventoryItem) => {
    const res = fillItemAtSink(storage, item, player);
    if (res.success) {
      sound.playWaterSpray();
      showToast(res.message);
      notifyChanged();
    } else {
      showToast(res.message);
    }
  };

  const handleWetItem = (item: InventoryItem) => {
    const res = wetOrRinseItemAtSink(storage, item);
    if (res.success) {
      sound.playWaterSpray();
      showToast(res.message);
      notifyChanged();
    } else {
      showToast(res.message);
    }
  };

  const handleEmptyItem = (item: InventoryItem) => {
    const res = emptyContainerInSink(storage, item);
    if (res.success) {
      sound.playWaterSpray();
      showToast(res.message);
      notifyChanged();
    } else {
      showToast(res.message);
    }
  };

  // ---- Unified Drag & Drop Handler ----
  const handleDrop = (targetKey: string, sourceKey: string) => {
    if (!targetKey || !sourceKey || targetKey === sourceKey) return;

    const srcIsSink = sourceKey.startsWith('sink:') && !sourceKey.startsWith('sink:empty');
    const srcIsInv = sourceKey.startsWith('inv:');
    const srcIsHand = sourceKey.startsWith('hand:');

    const dstIsSink = targetKey.startsWith('sink:') || targetKey === 'zone:sink';
    const dstIsInv = targetKey.startsWith('inv:');
    const dstIsHand = targetKey.startsWith('hand:');
    const dstIsPlayerZone = targetKey === 'zone:player';

    if (srcIsSink && dstIsHand) {
      moveSinkItemToHand(parseInt(sourceKey.slice(5), 10), targetKey === 'hand:left' ? 'left' : 'right');
      return;
    }
    if (srcIsSink && (dstIsInv || dstIsPlayerZone)) {
      moveSinkItemToPlayer(parseInt(sourceKey.slice(5), 10));
      return;
    }
    if (srcIsInv && dstIsSink) {
      movePlayerInvToSink(parseInt(sourceKey.slice(4), 10));
      return;
    }
    if (srcIsHand && dstIsSink) {
      movePlayerHandToSink(sourceKey === 'hand:left' ? 'left' : 'right');
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
        const res = putItemInHand(player, hand, removed);
        if (res.success) {
          if (res.displaced) addItemToPlayer(player, res.displaced);
          sound.playPickup();
          notifyChanged();
        } else {
          addItemToPlayer(player, removed);
        }
      }
      return;
    }
    if (srcIsHand && (dstIsInv || dstIsPlayerZone)) {
      const hand = sourceKey === 'hand:left' ? 'left' : 'right';
      if (stowItemFromHandToPockets(player, hand)) {
        sound.playUseItem();
        notifyChanged();
      } else {
        showToast('В карманах нет места');
      }
    }
  };
  dropHandlerRef.current = handleDrop;

  // ---- Shadow-DOM-safe Pointer Drag + 2nd-Finger Scroll ----
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
  const metrics = getSinkStreamMetrics(sink);
  const activeTemp = metrics.flowing ? metrics.streamTempC : sink.waterTemperature;
  const waterColor = getWaterColor(activeTemp);
  const basinPct = Math.min(100, Math.round((sink.basinWaterMl / Math.max(1, sink.basinMaxMl)) * 100));

  const storageVol = getFurnitureStorageTotalVolume(storage);
  const storageWt = getFurnitureStorageTotalWeight(storage);
  const volPct = Math.min(100, Math.round((storageVol / SINK_CONFIG.capacityL) * 100));
  const wtPct = Math.min(100, Math.round((storageWt / SINK_CONFIG.maxWeightKg) * 100));

  const pocketCap = getPlayerPocketCapacity(player);
  const playerWt = getPlayerTotalCarriedWeight(player);
  const compartments = getPlayerCompartments(player);

  const selectedSinkIdx = selectedKey?.startsWith('sink:') ? parseInt(selectedKey.slice(5), 10) : -1;
  const selectedSinkItem = selectedSinkIdx >= 0 ? storage.items[selectedSinkIdx] || null : null;

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

  // ---- Left Column: Mixer Controls + Sink Basin ----
  const renderSinkColumn = () => {
    const slotCount = Math.max(16, storage.items.length + 6);
    const isDropZone = dragUi?.overKey === 'zone:sink';

    return (
      <section
        className={'panel kf-col' + (isDropZone ? ' drop-on' : '')}
        data-kf-zone="zone:sink"
      >
        <div className="kf-col-head">
          <span className="kf-col-title">
            <Droplets width={16} height={16} />
            <span>Смеситель и чаша раковины</span>
          </span>
          <span className="kf-col-meta">
            {storage.items.length} предм. · {storageVol.toFixed(1)}/{SINK_CONFIG.capacityL.toFixed(0)} л
          </span>
        </div>

        {/* Mixer & Tap Valve Controls */}
        <div className="kf-sink-mixer">
          <div className="kf-sink-viz">
            <SinkVisualSvg
              flowing={metrics.flowing}
              waterColor={waterColor}
              waterTemp={activeTemp}
              basinPct={basinPct}
              plugClosed={sink.plugClosed}
            />
          </div>

          <div className="kf-sink-controls">
            <div className="kf-sink-toggles">
              <button
                type="button"
                id="btn-sink-water-toggle"
                className={'btn btn-xs ' + (sink.waterOn ? 'btn-water-on' : 'btn-s')}
                onClick={handleToggleWater}
              >
                <Power width={13} height={13} />
                <span>{sink.waterOn ? 'Вода: Вкл' : 'Вода: Выкл'}</span>
              </button>

              <button
                type="button"
                id="btn-sink-plug-toggle"
                className={'btn btn-xs ' + (sink.plugClosed ? 'btn-p' : 'btn-s')}
                onClick={handleTogglePlug}
              >
                <Waves width={13} height={13} />
                <span>{sink.plugClosed ? 'Пробка: Закрыта' : 'Слив открыт'}</span>
              </button>

              <button
                type="button"
                className="btn btn-s btn-xs"
                disabled={sink.basinWaterMl < 1}
                onClick={handleDrainBasin}
                title="Спустить набранную воду из чаши"
              >
                <Trash2 width={13} height={13} />
                <span>Спустить</span>
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
                  onClick={() => handleColdChange(sink.coldValve - 10)}
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
                  value={sink.coldValve}
                  onChange={e => handleColdChange(Number(e.target.value))}
                  onKeyDown={stopInputKeys}
                  aria-label="Вентиль холодной воды"
                />
                <button
                  type="button"
                  className="kf-valve-step"
                  onClick={() => handleColdChange(sink.coldValve + 10)}
                  aria-label="Увеличить холодную воду"
                >
                  <Plus width={13} height={13} />
                </button>
                <span className="kf-valve-pct">{sink.coldValve}%</span>
              </div>

              <div className="kf-valve-row">
                <span className="kf-valve-lbl">
                  <Flame width={13} height={13} color="#f0884a" />
                  <span>Горяч.</span>
                </span>
                <button
                  type="button"
                  className="kf-valve-step"
                  onClick={() => handleHotChange(sink.hotValve - 10)}
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
                  value={sink.hotValve}
                  onChange={e => handleHotChange(Number(e.target.value))}
                  onKeyDown={stopInputKeys}
                  aria-label="Вентиль горячей воды"
                />
                <button
                  type="button"
                  className="kf-valve-step"
                  onClick={() => handleHotChange(sink.hotValve + 10)}
                  aria-label="Увеличить горячую воду"
                >
                  <Plus width={13} height={13} />
                </button>
                <span className="kf-valve-pct">{sink.hotValve}%</span>
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
                В чаше: <b>{(sink.basinWaterMl / 1000).toFixed(1)} / {(sink.basinMaxMl / 1000).toFixed(0)} л</b>
              </span>
            </div>
          </div>
        </div>

        {/* Capacity Bars */}
        <div className="kf-meters">
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Объём раковины</span>
              <b>{storageVol.toFixed(1)} / {SINK_CONFIG.capacityL.toFixed(0)} л</b>
            </div>
            <div className="kf-bar">
              <i style={{ width: `${volPct}%` }} />
            </div>
          </div>
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Нагрузка</span>
              <b>{storageWt.toFixed(1)} / {SINK_CONFIG.maxWeightKg.toFixed(0)} кг</b>
            </div>
            <div className="kf-bar">
              <i className="ok" style={{ width: `${wtPct}%` }} />
            </div>
          </div>
        </div>

        {/* Basin Items Grid (scrollable) */}
        <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
          <div className="kf-slots">
            {Array.from({ length: slotCount }, (_, idx) => {
              const it = storage.items[idx];
              const slotKey = it ? `sink:${idx}` : `sink:empty-${idx}`;
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
                  onDoubleClick={() => it && moveSinkItemToPlayer(idx)}
                  className={
                    'kf-slot' +
                    (!it ? ' empty' : '') +
                    (isSel ? ' on' : '') +
                    (isOver ? ' drop' : '') +
                    (it && temp >= 52 ? ' hot' : '')
                  }
                  style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                  title={it ? `${it.nameRu} (${describeSinkItemSub(it)})` : 'Свободное место в раковине'}
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
          {selectedSinkItem && selectedSinkIdx >= 0 ? (
            <>
              <div className="kf-foot-item">
                <ItemIconCanvas itemId={selectedSinkItem.itemId} item={selectedSinkItem} size={30} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kf-foot-name">{selectedSinkItem.nameRu}</div>
                  <div className="kf-foot-sub">{describeSinkItemSub(selectedSinkItem)}</div>
                </div>
              </div>
              <div className="kf-foot-acts">
                {isContainerFillable(selectedSinkItem) && (
                  <button
                    type="button"
                    className="btn btn-water-on btn-xs"
                    onClick={() => handleFillItem(selectedSinkItem)}
                  >
                    Набрать
                  </button>
                )}
                {hasLiquidInside(selectedSinkItem) && (
                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    onClick={() => handleEmptyItem(selectedSinkItem)}
                  >
                    Слить
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => handleWetItem(selectedSinkItem)}
                >
                  Намочить
                </button>
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => moveSinkItemToHand(selectedSinkIdx, 'right')}
                >
                  В руку
                </button>
                <button
                  type="button"
                  className="btn btn-p btn-xs"
                  onClick={() => moveSinkItemToPlayer(selectedSinkIdx)}
                >
                  Забрать
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              Открытая тара под струёй наполняется сама, предметы промываются водой
            </div>
          )}
        </div>
      </section>
    );
  };

  // ---- Right Column: Player Inventory ----
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
          {/* Active Hands */}
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
                    onDoubleClick={() => it && movePlayerHandToSink(hand)}
                    className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                    style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                    title={it ? `${it.nameRu} (${describeSinkItemSub(it)})` : hand === 'left' ? 'Левая рука пуста' : 'Правая рука пуста'}
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

          {/* Compartments */}
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
                        onDoubleClick={() => it && movePlayerInvToSink(slotIdx)}
                        className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                        style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                        title={it ? `${it.nameRu} (${describeSinkItemSub(it)})` : 'Свободный слот'}
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
                  <div className="kf-foot-sub">{describeSinkItemSub(selectedPlayerItem)}</div>
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
                    if (selectedKey === 'hand:left') movePlayerHandToSink('left');
                    else if (selectedKey === 'hand:right') movePlayerHandToSink('right');
                    else if (selectedKey.startsWith('inv:')) movePlayerInvToSink(parseInt(selectedKey.slice(4), 10));
                  }}
                >
                  В раковину
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              Перетащите предмет в раковину, нажмите 2× или выберите для набора / намачивания
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <ShadowHost css={kitchenFurnitureCss}>
      <div id="w" ref={hostRef}>
        <div className="gm" ref={gmRef} id="kitchen-sink-modal">
          <div className="kf-bg" />

          {/* Top Bar */}
          <header className="top">
            <div className="top-l">
              <Droplets width={24} height={24} color={metrics.flowing ? '#6cb4e8' : '#c9922b'} style={{ flex: 'none' }} />
              <div className="cn ttl">{onOpenParentCounter ? 'Раковина гарнитура' : 'Раковина'}</div>
              <span className="sub-top">Водопровод, смеситель и промывка</span>
            </div>
            <div className="top-r">
              <div className="chip">
                <span>Вода</span>
                <b style={{ color: metrics.flowing ? waterColor : '#a29e93' }}>
                  {metrics.flowing ? `+${Math.round(activeTemp)}°C` : 'Выкл'}
                </b>
              </div>
              <div className="chip">
                <span>Вместимость</span>
                <b>{storageVol.toFixed(1)} / {SINK_CONFIG.capacityL.toFixed(0)} л</b>
              </div>
              {onOpenParentCounter && (
                <button
                  type="button"
                  id="btn-sink-open-counter"
                  className="chip chip-counter"
                  onClick={onOpenParentCounter}
                  title="Перейти к столешнице и шкафам гарнитура"
                >
                  <Utensils width={15} height={15} color="#e0ab45" />
                  <span>Гарнитур</span>
                </button>
              )}
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

          {/* Body (reuses top offset cleanly under header) */}
          <main className="kf-body kf-body-notab">
            <div className="kf-split">
              {renderSinkColumn()}
              {renderPlayerInventoryColumn()}
            </div>
          </main>

          {toastMsg && <div className="kf-toast">{toastMsg}</div>}

          <div className="hint">
            <div className="hint-g">
              <span className="key">Esc</span>
              <span>Закрыть</span>
              <span className="key">2× Клик</span>
              <span>Положить / Забрать</span>
              <span className="key">Перетаскивание</span>
              <span>Любые предметы в раковину и обратно</span>
            </div>
            <div className="hint-r">
              Вода течёт и заполняет раковину в реальном времени даже после закрытия окна
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

export const KitchenSinkModal: React.FC<KitchenSinkModalProps> = ({
  isOpen,
  storage,
  player,
  ...rest
}) => {
  if (!isOpen || !storage || !player) return null;
  return <KitchenSinkModalContent storage={storage} player={player} {...rest} />;
};

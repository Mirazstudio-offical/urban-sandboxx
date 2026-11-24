import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import {
  FurnitureStorage,
  STOVE_OVEN_CONFIG,
  ensureStoveState,
  toggleStoveBurnerGas,
  placeItemOnStoveBurner,
  removeItemFromStoveBurner,
  toggleStoveOvenGas,
  getStoveOvenTotalVolume,
  getStoveOvenTotalWeight,
  addItemToStoveOven,
  removeItemFromStoveOven,
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
import { tickStoveStateThermodynamics } from '../itemThermalSystem';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { sound } from '../audio';
import kitchenFurnitureCss from './kitchenFurniture.css?inline';
import {
  Flame,
  Power,
  Hand,
  User,
  Shirt,
  Luggage,
  Thermometer,
  Package,
  ArrowUpFromLine,
  X,
} from 'lucide-react';

export interface KitchenStoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage: FurnitureStorage | null;
  player: Player | null;
  world?: GameWorld | null;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
}

const BURNER_LABELS = [
  'Задняя левая',
  'Задняя правая',
  'Передняя левая',
  'Передняя правая',
];

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
  if (wrapper && wrapper.maxMl > 0) {
    const pct = Math.max(0, Math.min(100, Math.round((wrapper.currentMl / wrapper.maxMl) * 100)));
    return {
      pct,
      color: wrapper.currentMl > 0 ? '#68a490' : undefined,
      label: wrapper.currentMl > 0 ? `${Math.round(wrapper.currentMl)}/${Math.round(wrapper.maxMl)} мл` : 'Пусто',
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
  if (temp >= 75) return '#f0884a';
  if (temp >= 45) return '#e0ab45';
  if (temp <= 4) return '#7dd3fc';
  return '#a29e93';
}

function describeCookedItemSub(item: InventoryItem): string {
  const parts: string[] = [];
  const temp = Math.round(item.temperature ?? 20);
  parts.push(`${temp > 0 ? '+' : ''}${temp}°C`);
  if (item.attributes?.stateNameRu) {
    parts.push(item.attributes.stateNameRu);
  }
  const wrapper = getEffectiveFluidWrapper(item);
  if (wrapper && wrapper.currentMl > 0) {
    parts.push(`${Math.round(wrapper.currentMl)} мл`);
  } else if (item.isContainer && item.contents && item.contents.length > 0) {
    parts.push(`внутри ${item.contents.length}`);
  } else {
    parts.push(formatWeightRu(getItemTotalWeight(item)));
  }
  return parts.join(' · ');
}

const BurnerRingSvg: React.FC<{ gasOn: boolean }> = ({ gasOn }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 80 80"
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    aria-hidden="true"
  >
    {/* Cast-iron cross grate */}
    <line x1="40" y1="6" x2="40" y2="22" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="40" y1="58" x2="40" y2="74" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="6" y1="40" x2="22" y2="40" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="58" y1="40" x2="74" y2="40" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" />
    {/* Burner crown */}
    <circle
      cx="40"
      cy="40"
      r="21"
      fill="none"
      stroke={gasOn ? '#f0884a' : 'rgba(255,255,255,0.16)'}
      strokeWidth={gasOn ? '2.5' : '1.5'}
      strokeDasharray={gasOn ? '4 3' : undefined}
    />
    {gasOn && (
      <circle
        cx="40"
        cy="40"
        r="26"
        fill="none"
        stroke="rgba(96, 165, 250, 0.55)"
        strokeWidth="1.5"
        strokeDasharray="3 4"
      />
    )}
  </svg>
);

const KitchenStoveModalContent: React.FC<{
  onClose: () => void;
  storage: FurnitureStorage;
  player: Player;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
}> = ({ onClose, storage, player, onInventoryUpdated, onVitalsChange }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const gmRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'hob' | 'oven'>('hob');
  const [selectedBurner, setSelectedBurner] = useState<number>(0);
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

  useLayoutEffect(() => {
    if (!hostRef.current || !gmRef.current) return;
    return attachStageFit(hostRef.current, gmRef.current);
  }, []);

  useTopmostEscape(true, onClose);

  const stove = ensureStoveState(storage);

  const showToast = (msg: string) => setToastMsg(msg);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Real-time 500ms thermal simulation tick while stove UI is open
  useEffect(() => {
    let ticks = 0;
    const id = setInterval(() => {
      const st = ensureStoveState(storage);
      const changed = tickStoveStateThermodynamics(st, 0.5, Date.now() / 1000);
      ticks++;
      if (changed) {
        if (ticks % 6 === 0) {
          saveFurnitureStoragesToLocalStorage();
        }
        forceRender(n => n + 1);
      }
    }, 500);
    return () => {
      clearInterval(id);
      saveFurnitureStoragesToLocalStorage();
    };
  }, [storage]);

  const notifyChanged = () => {
    saveFurnitureStoragesToLocalStorage();
    forceRender(n => n + 1);
    onInventoryUpdated?.();
    onVitalsChange?.();
  };

  // ---- Burner Actions ----
  const handleToggleBurnerGas = (burnerIdx: number) => {
    toggleStoveBurnerGas(storage, burnerIdx);
    sound.playUseItem();
    notifyChanged();
  };

  const placeFromPlayerToBurner = (sourceKey: string, targetBurnerIdx?: number) => {
    // Choose explicit target burner, or selected burner if free, or first free burner
    let bIdx = targetBurnerIdx;
    if (bIdx === undefined) {
      if (!stove.burners[selectedBurner]?.item) {
        bIdx = selectedBurner;
      } else {
        const freeIdx = stove.burners.findIndex(b => !b.item);
        bIdx = freeIdx >= 0 ? freeIdx : selectedBurner;
      }
    }
    const burner = stove.burners[bIdx];
    if (!burner) return;
    if (burner.item) {
      showToast(`Конфорка ${bIdx + 1} занята — выберите свободную или снимите предмет`);
      return;
    }

    if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
      const hand = sourceKey === 'hand:left' ? 'left' : 'right';
      const item = hand === 'left' ? player.leftHandItem : player.rightHandItem;
      if (!item) return;
      const taken = takeItemFromHand(player, hand);
      if (!taken) return;
      const res = placeItemOnStoveBurner(storage, bIdx, taken);
      if (res.success) {
        sound.playUseItem();
        setSelectedBurner(bIdx);
        if (selectedKey === sourceKey) setSelectedKey(null);
        notifyChanged();
      } else {
        putItemInHand(player, hand, taken);
        showToast(res.message);
      }
      return;
    }

    if (sourceKey.startsWith('inv:')) {
      const invIdx = parseInt(sourceKey.slice(4), 10);
      const item = player.inventory[invIdx];
      if (!item) return;
      const res = placeItemOnStoveBurner(storage, bIdx, item);
      if (res.success) {
        removeItemFromPlayer(player, invIdx, 1);
        sound.playUseItem();
        setSelectedBurner(bIdx);
        if (selectedKey === sourceKey) setSelectedKey(null);
        notifyChanged();
      } else {
        showToast(res.message);
      }
    }
  };

  const takeBurnerItemToPlayer = (burnerIdx: number, hand?: 'left' | 'right') => {
    const item = stove.burners[burnerIdx]?.item;
    if (!item) return;
    const taken = removeItemFromStoveBurner(storage, burnerIdx);
    if (!taken) return;

    if (hand) {
      const curHand = hand === 'left' ? player.leftHandItem : player.rightHandItem;
      if (curHand) {
        // Put item back if hand is occupied and cannot swap cleanly
        const res = putItemInHand(player, hand, taken);
        if (res.success) {
          if (res.displaced && !addItemToPlayer(player, res.displaced)) {
            placeItemOnStoveBurner(storage, burnerIdx, res.displaced);
          }
          sound.playPickup();
          if (selectedKey === `burner:${burnerIdx}`) setSelectedKey(null);
          notifyChanged();
          return;
        }
      } else {
        const res = putItemInHand(player, hand, taken);
        if (res.success) {
          sound.playPickup();
          if (selectedKey === `burner:${burnerIdx}`) setSelectedKey(null);
          notifyChanged();
          return;
        }
      }
    }

    if (addItemToPlayer(player, taken)) {
      sound.playPickup();
      if (selectedKey === `burner:${burnerIdx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      placeItemOnStoveBurner(storage, burnerIdx, taken);
      showToast('В инвентаре игрока нет места');
    }
  };

  const swapBurners = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const tmp = stove.burners[fromIdx].item;
    stove.burners[fromIdx].item = stove.burners[toIdx].item;
    stove.burners[toIdx].item = tmp;
    sound.playUseItem();
    setSelectedBurner(toIdx);
    notifyChanged();
  };

  // ---- Oven Actions ----
  const handleToggleOvenGas = () => {
    toggleStoveOvenGas(storage);
    sound.playUseItem();
    notifyChanged();
  };

  const placeFromPlayerToOven = (sourceKey: string) => {
    if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
      const hand = sourceKey === 'hand:left' ? 'left' : 'right';
      const item = hand === 'left' ? player.leftHandItem : player.rightHandItem;
      if (!item) return;
      const taken = takeItemFromHand(player, hand);
      if (!taken) return;
      const res = addItemToStoveOven(storage, taken);
      if (res.success) {
        sound.playUseItem();
        if (selectedKey === sourceKey) setSelectedKey(null);
        notifyChanged();
      } else {
        putItemInHand(player, hand, taken);
        showToast(res.message);
      }
      return;
    }

    if (sourceKey.startsWith('inv:')) {
      const invIdx = parseInt(sourceKey.slice(4), 10);
      const item = player.inventory[invIdx];
      if (!item) return;
      const res = addItemToStoveOven(storage, item);
      if (res.success) {
        removeItemFromPlayer(player, invIdx, 1);
        sound.playUseItem();
        if (selectedKey === sourceKey) setSelectedKey(null);
        notifyChanged();
      } else {
        showToast(res.message);
      }
    }
  };

  const takeOvenItemToPlayer = (ovenIdx: number, hand?: 'left' | 'right') => {
    const it = stove.oven.items[ovenIdx];
    if (!it) return;
    const taken = removeItemFromStoveOven(storage, ovenIdx);
    if (!taken) return;

    if (hand) {
      const res = putItemInHand(player, hand, taken);
      if (res.success) {
        if (res.displaced && !addItemToPlayer(player, res.displaced)) {
          addItemToStoveOven(storage, res.displaced);
        }
        sound.playPickup();
        if (selectedKey === `oven:${ovenIdx}`) setSelectedKey(null);
        notifyChanged();
        return;
      }
    }

    if (addItemToPlayer(player, taken)) {
      sound.playPickup();
      if (selectedKey === `oven:${ovenIdx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      stove.oven.items.splice(Math.min(ovenIdx, stove.oven.items.length), 0, taken);
      showToast('В инвентаре игрока нет места');
    }
  };

  // ---- Unified Drag & Drop Handler ----
  const handleDrop = (targetKey: string, sourceKey: string) => {
    if (!targetKey || !sourceKey || targetKey === sourceKey) return;

    const srcIsPlayer = sourceKey.startsWith('inv:') || sourceKey.startsWith('hand:');
    const srcIsBurner = sourceKey.startsWith('burner:');
    const srcIsOven = sourceKey.startsWith('oven:') && !sourceKey.startsWith('oven:empty');

    const dstIsBurner = targetKey.startsWith('burner:');
    const dstIsOven = targetKey.startsWith('oven:') || targetKey === 'zone:oven';
    const dstIsInv = targetKey.startsWith('inv:');
    const dstIsHand = targetKey.startsWith('hand:');
    const dstIsPlayerZone = targetKey === 'zone:player';

    // Player -> Burner
    if (srcIsPlayer && dstIsBurner) {
      const bIdx = parseInt(targetKey.slice(7), 10);
      placeFromPlayerToBurner(sourceKey, bIdx);
      return;
    }
    // Burner -> Player
    if (srcIsBurner && (dstIsInv || dstIsHand || dstIsPlayerZone)) {
      const bIdx = parseInt(sourceKey.slice(7), 10);
      takeBurnerItemToPlayer(bIdx, dstIsHand ? (targetKey === 'hand:left' ? 'left' : 'right') : undefined);
      return;
    }
    // Burner <-> Burner
    if (srcIsBurner && dstIsBurner) {
      swapBurners(parseInt(sourceKey.slice(7), 10), parseInt(targetKey.slice(7), 10));
      return;
    }
    // Player -> Oven
    if (srcIsPlayer && dstIsOven) {
      placeFromPlayerToOven(sourceKey);
      return;
    }
    // Oven -> Player
    if (srcIsOven && (dstIsInv || dstIsHand || dstIsPlayerZone)) {
      const oIdx = parseInt(sourceKey.slice(5), 10);
      takeOvenItemToPlayer(oIdx, dstIsHand ? (targetKey === 'hand:left' ? 'left' : 'right') : undefined);
      return;
    }
    // Player internal reordering
    if (sourceKey.startsWith('inv:') && dstIsInv) {
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
    if (sourceKey.startsWith('inv:') && dstIsHand) {
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
    if (sourceKey.startsWith('hand:') && (dstIsInv || dstIsPlayerZone)) {
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
      } else if (slotKey.startsWith('burner:')) {
        setSelectedBurner(parseInt(slotKey.slice(7), 10));
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
        if (d.sourceKey.startsWith('burner:')) {
          setSelectedBurner(parseInt(d.sourceKey.slice(7), 10));
        }
        setSelectedKey(prev => (prev === d.sourceKey ? null : d.sourceKey));
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // ---- Derived Stats ----
  const activeGasBurners = stove.burners.filter(b => b.gasOn).length;
  const occupiedBurners = stove.burners.filter(b => Boolean(b.item)).length;
  const ovenVol = getStoveOvenTotalVolume(storage);
  const ovenWt = getStoveOvenTotalWeight(storage);
  const ovenVolPct = Math.min(100, Math.round((ovenVol / STOVE_OVEN_CONFIG.capacityL) * 100));
  const ovenWtPct = Math.min(100, Math.round((ovenWt / STOVE_OVEN_CONFIG.maxWeightKg) * 100));

  const pocketCap = getPlayerPocketCapacity(player);
  const playerWt = getPlayerTotalCarriedWeight(player);
  const compartments = getPlayerCompartments(player);

  const selectedPlayerItem: InventoryItem | null = (() => {
    if (!selectedKey) return null;
    if (selectedKey === 'hand:left') return player.leftHandItem || null;
    if (selectedKey === 'hand:right') return player.rightHandItem || null;
    if (selectedKey.startsWith('inv:')) return player.inventory[parseInt(selectedKey.slice(4), 10)] || null;
    return null;
  })();

  const selectedOvenIdx = selectedKey?.startsWith('oven:') ? parseInt(selectedKey.slice(5), 10) : -1;
  const selectedOvenItem = selectedOvenIdx >= 0 ? stove.oven.items[selectedOvenIdx] || null : null;

  // ---- Player Inventory Column (Right Side on Both Tabs) ----
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
            {pocketCap.usedL.toFixed(1)}/{pocketCap.maxL.toFixed(1)} л · {playerWt.toFixed(1)} кг
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
                return (
                  <div
                    key={slotKey}
                    data-kf-slot={slotKey}
                    draggable={false}
                    onDragStart={e => e.preventDefault()}
                    onPointerDown={e => startSlotPointer(e, slotKey, it)}
                    onDoubleClick={() => {
                      if (!it) return;
                      if (activeTab === 'hob') placeFromPlayerToBurner(slotKey);
                      else placeFromPlayerToOven(slotKey);
                    }}
                    className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                    style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                    title={it ? it.nameRu : hand === 'left' ? 'Левая рука пуста' : 'Правая рука пуста'}
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

          {/* Compartments */}
          {compartments.map(comp => {
            const slotIndices = Array.from({ length: comp.slotCount }, (_, i) => comp.startSlot + i);
            return (
              <div key={comp.id} className="kf-group">
                <div className="kf-group-h">
                  <span className="kf-group-t">
                    {renderCompIcon(comp.id)}
                    <span>{comp.nameRu}</span>
                  </span>
                  <span className="kf-group-meta">
                    {comp.usedVolumeL.toFixed(1)}/{comp.maxVolumeL.toFixed(1)} л
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
                        onDoubleClick={() => {
                          if (!it) return;
                          if (activeTab === 'hob') placeFromPlayerToBurner(slotKey);
                          else placeFromPlayerToOven(slotKey);
                        }}
                        className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '')}
                        style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                        title={it ? `${it.nameRu} (${formatWeightRu(getItemTotalWeight(it))})` : 'Свободный слот'}
                      >
                        {it && (
                          <>
                            <ItemIconCanvas itemId={it.itemId} item={it} size={42} />
                            {(temp >= 40 || temp <= 4) && (
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
                  <div className="kf-foot-sub">{describeCookedItemSub(selectedPlayerItem)}</div>
                </div>
              </div>
              <div className="kf-foot-acts">
                {activeTab === 'hob' ? (
                  <button
                    type="button"
                    className="btn btn-p btn-xs"
                    onClick={() => placeFromPlayerToBurner(selectedKey)}
                  >
                    На конфорку {selectedBurner + 1}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-p btn-xs"
                    onClick={() => placeFromPlayerToOven(selectedKey)}
                  >
                    В духовку
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              {activeTab === 'hob'
                ? 'Перетащите предмет на любую из 4 конфорок или нажмите 2×'
                : 'Перетащите предмет в духовку слева или нажмите 2×'}
            </div>
          )}
        </div>
      </section>
    );
  };

  // ---- Tab 1 Left: 4-Burner Gas Cooktop ----
  const renderHobColumn = () => (
    <section className="panel kf-col">
      <div className="kf-col-head">
        <span className="kf-col-title">
          <Flame width={16} height={16} />
          <span>Варочная панель · 4 конфорки</span>
        </span>
        <span className="kf-col-meta">
          Газ: {activeGasBurners}/4 · Посуда: {occupiedBurners}/4
        </span>
      </div>

      <div className="kf-cooktop">
        {stove.burners.map((burner, idx) => {
          const slotKey = `burner:${idx}`;
          const isOver = dragUi?.overKey === slotKey;
          const isDragging = dragUi?.sourceKey === slotKey;
          const isSel = selectedBurner === idx;
          const tempRound = Math.round(burner.temperature);
          const item = burner.item;

          return (
            <div
              key={slotKey}
              data-kf-slot={slotKey}
              onClick={() => setSelectedBurner(idx)}
              className={
                'kf-burner' +
                (isSel ? ' selected' : '') +
                (burner.gasOn ? ' gas-on' : '') +
                (isOver ? ' drop-on' : '')
              }
            >
              <div className="kf-burner-top">
                <span className="kf-burner-lbl">
                  #{idx + 1} · {BURNER_LABELS[idx]}
                </span>
                <span
                  className={
                    'kf-burner-temp' +
                    (tempRound >= 90 ? ' hot' : tempRound >= 45 ? ' warm' : '')
                  }
                >
                  +{tempRound}°C
                </span>
              </div>

              <div className="kf-burner-mid">
                <div
                  className={
                    'kf-burner-ring' +
                    (burner.gasOn ? ' gas-on' : '') +
                    (isOver ? ' drop-on' : '')
                  }
                  draggable={false}
                  onDragStart={e => e.preventDefault()}
                  onPointerDown={e => startSlotPointer(e, slotKey, item)}
                  onDoubleClick={() => item && takeBurnerItemToPlayer(idx)}
                  style={{ opacity: isDragging ? 0.35 : 1 }}
                  title={
                    item
                      ? `${item.nameRu} — двойной клик или перетащить в инвентарь, чтобы снять`
                      : `Конфорка ${idx + 1} свободна — перетащите предмет из инвентаря`
                  }
                >
                  <BurnerRingSvg gasOn={burner.gasOn} />
                  {item && (
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>
                      <ItemIconCanvas itemId={item.itemId} item={item} size={46} />
                    </div>
                  )}
                </div>

                <div className="kf-burner-info">
                  <div className={'kf-burner-item' + (!item ? ' empty' : '')}>
                    {item ? item.nameRu : 'Свободная конфорка'}
                  </div>
                  <div className="kf-burner-sub">
                    {item
                      ? describeCookedItemSub(item)
                      : burner.gasOn
                      ? 'Газ горит · 1 предмет макс.'
                      : 'Поставьте 1 предмет из инвентаря'}
                  </div>
                </div>
              </div>

              <div className="kf-burner-foot">
                <button
                  type="button"
                  id={`btn-burner-gas-${idx}`}
                  className={'btn btn-xs ' + (burner.gasOn ? 'btn-gas-on' : 'btn-s')}
                  onClick={e => {
                    e.stopPropagation();
                    handleToggleBurnerGas(idx);
                  }}
                >
                  <Flame width={13} height={13} />
                  <span>{burner.gasOn ? 'Газ: Вкл' : 'Газ: Выкл'}</span>
                </button>

                {item ? (
                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    onClick={e => {
                      e.stopPropagation();
                      takeBurnerItemToPlayer(idx);
                    }}
                  >
                    <ArrowUpFromLine width={12} height={12} />
                    <span>Снять</span>
                  </button>
                ) : (
                  <span className="kf-burner-sub" style={{ fontSize: 11.5 }}>
                    {isSel ? 'Выбрана' : 'Пусто'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  // ---- Tab 2 Left: Unified Spacious Gas Oven Chamber ----
  const renderOvenColumn = () => {
    const ovenTemp = Math.round(stove.oven.temperature);
    const slotCount = Math.max(18, stove.oven.items.length + 6);
    const isDropZone = dragUi?.overKey === 'zone:oven';

    return (
      <section className="panel kf-col">
        <div className={'kf-oven-head' + (stove.oven.gasOn ? ' gas-on' : '')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Thermometer width={18} height={18} color={stove.oven.gasOn ? '#f0884a' : '#a29e93'} />
            <div style={{ minWidth: 0 }}>
              <div className="kf-col-title" style={{ color: stove.oven.gasOn ? '#ffd3b3' : '#e0ab45' }}>
                Духовка · Цельная камера
              </div>
              <div className="kf-col-meta">
                Температура: <strong style={{ color: ovenTemp >= 75 ? '#f0884a' : '#f4f1ea' }}>+{ovenTemp}°C</strong>
                {' · '}
                {stove.oven.items.length} предм.
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-oven-gas-toggle"
            className={'btn btn-sm ' + (stove.oven.gasOn ? 'btn-gas-on' : 'btn-s')}
            onClick={handleToggleOvenGas}
          >
            <Power width={14} height={14} />
            <span>{stove.oven.gasOn ? 'Газ духовки: Вкл' : 'Газ духовки: Выкл'}</span>
          </button>
        </div>

        <div className="kf-meters">
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Объём камеры</span>
              <b>{ovenVol.toFixed(1)} / {STOVE_OVEN_CONFIG.capacityL.toFixed(0)} л</b>
            </div>
            <div className="kf-bar">
              <i className={stove.oven.gasOn ? 'hot' : undefined} style={{ width: `${ovenVolPct}%` }} />
            </div>
          </div>
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Вес в духовке</span>
              <b>{ovenWt.toFixed(1)} / {STOVE_OVEN_CONFIG.maxWeightKg.toFixed(0)} кг</b>
            </div>
            <div className="kf-bar">
              <i className="ok" style={{ width: `${ovenWtPct}%` }} />
            </div>
          </div>
        </div>

        <div
          className={
            'kf-oven-chamber' +
            (stove.oven.gasOn ? ' gas-on' : '') +
            (isDropZone ? ' drop-on' : '')
          }
          data-kf-zone="zone:oven"
        >
          <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
            <div className="kf-slots">
              {Array.from({ length: slotCount }, (_, idx) => {
                const it = stove.oven.items[idx];
                const slotKey = it ? `oven:${idx}` : `oven:empty-${idx}`;
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
                    onDoubleClick={() => it && takeOvenItemToPlayer(idx)}
                    className={
                      'kf-slot' +
                      (!it ? ' empty' : '') +
                      (isSel ? ' on' : '') +
                      (isOver ? ' drop' : '') +
                      (it && temp >= 55 ? ' hot' : '')
                    }
                    style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                    title={it ? `${it.nameRu} (${describeCookedItemSub(it)})` : 'Свободное место в духовке'}
                  >
                    {it && (
                      <>
                        <ItemIconCanvas itemId={it.itemId} item={it} size={42} />
                        {(temp >= 40 || temp <= 4) && (
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
        </div>

        <div className="kf-foot-bar">
          {selectedOvenItem && selectedOvenIdx >= 0 ? (
            <>
              <div className="kf-foot-item">
                <ItemIconCanvas itemId={selectedOvenItem.itemId} item={selectedOvenItem} size={30} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kf-foot-name">{selectedOvenItem.nameRu}</div>
                  <div className="kf-foot-sub">{describeCookedItemSub(selectedOvenItem)}</div>
                </div>
              </div>
              <div className="kf-foot-acts">
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => takeOvenItemToPlayer(selectedOvenIdx, 'right')}
                >
                  В руку
                </button>
                <button
                  type="button"
                  className="btn btn-p btn-xs"
                  onClick={() => takeOvenItemToPlayer(selectedOvenIdx)}
                >
                  Достать
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              {stove.oven.gasOn
                ? 'Духовка нагревается — предметы внутри прогреваются и запекаются'
                : 'Поставьте продукты или посуду в камеру и включите газ духовки'}
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <ShadowHost css={kitchenFurnitureCss}>
      <div id="w" ref={hostRef}>
        <div className="gm" ref={gmRef} id="kitchen-stove-modal">
          <div className="kf-bg" />

          {/* Top Bar */}
          <header className="top">
            <div className="top-l">
              <Flame width={24} height={24} color={activeGasBurners > 0 || stove.oven.gasOn ? '#f0884a' : '#c9922b'} style={{ flex: 'none' }} />
              <div className="cn ttl">Кухонная плита</div>
              <span className="sub-top">4 газовые конфорки и духовой шкаф</span>
            </div>
            <div className="top-r">
              <div className="chip">
                <span>Конфорки</span>
                <b className={activeGasBurners > 0 ? 'hot' : undefined}>
                  {activeGasBurners > 0 ? `Газ ${activeGasBurners}/4` : `${occupiedBurners}/4`}
                </b>
              </div>
              <div className="chip">
                <span>Духовка</span>
                <b className={stove.oven.gasOn ? 'hot' : undefined}>
                  +{Math.round(stove.oven.temperature)}°C
                </b>
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

          {/* Two Tabs: Плита | Духовка */}
          <div className="kf-tabbar">
            <div className="kf-tabs">
              <button
                type="button"
                className={'kf-tab' + (activeTab === 'hob' ? ' on' : '')}
                onClick={() => {
                  setActiveTab('hob');
                  setSelectedKey(null);
                }}
              >
                <Flame width={16} height={16} />
                <span>Плита</span>
                <span className="kf-tab-cnt">{occupiedBurners}/4</span>
              </button>
              <button
                type="button"
                className={'kf-tab' + (activeTab === 'oven' ? ' on' : '')}
                onClick={() => {
                  setActiveTab('oven');
                  setSelectedKey(null);
                }}
              >
                <Package width={16} height={16} />
                <span>Духовка</span>
                <span className="kf-tab-cnt">{stove.oven.items.length}</span>
              </button>
            </div>
            <div className="kf-tab-meta">
              {activeTab === 'hob'
                ? '4 конфорки · по 1 предмету на конфорку'
                : `Цельная камера · ${ovenVol.toFixed(1)}/${STOVE_OVEN_CONFIG.capacityL.toFixed(0)} л`}
            </div>
          </div>

          {/* Body */}
          <main className="kf-body">
            <div className="kf-split-stove">
              {activeTab === 'hob' ? renderHobColumn() : renderOvenColumn()}
              {renderPlayerInventoryColumn()}
            </div>
          </main>

          {toastMsg && <div className="kf-toast">{toastMsg}</div>}

          <div className="hint">
            <div className="hint-g">
              <span className="key">Esc</span>
              <span>Закрыть</span>
              <span className="key">2× Клик</span>
              <span>Поставить / Снять</span>
              <span className="key">Перетаскивание</span>
              <span>Из инвентаря на конфорку или в духовку</span>
            </div>
            <div className="hint-r">
              Нагрев продолжается в реальном времени даже после закрытия окна
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

export const KitchenStoveModal: React.FC<KitchenStoveModalProps> = ({
  isOpen,
  storage,
  player,
  ...rest
}) => {
  if (!isOpen || !storage || !player) return null;
  return <KitchenStoveModalContent storage={storage} player={player} {...rest} />;
};

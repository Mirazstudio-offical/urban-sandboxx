import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import {
  FurnitureStorage,
  FURNITURE_STORAGE_CONFIGS,
  getFurnitureStorageTotalWeight,
  getFurnitureStorageTotalVolume,
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
  addPlayerNotification,
} from '../items';
import {
  InteractionSlotGrid16,
  createEmptyInteractionGrid16,
  evaluateInteractionGrid4x4,
  getEffectiveFluidWrapper,
  getSlotPourDosageLabel,
} from '../interactionCrafting';
import { syncFurnitureStorageThermodynamics } from '../itemThermalSystem';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { sound } from '../audio';
import kitchenFurnitureCss from './kitchenFurniture.css?inline';
import {
  Utensils,
  Layers,
  Package,
  Hand,
  User,
  Shirt,
  Luggage,
  ArrowRight,
  ArrowLeftRight,
  RotateCcw,
  Check,
  Droplets,
  X,
} from 'lucide-react';

export interface KitchenTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage: FurnitureStorage | null;
  player: Player | null;
  world?: GameWorld | null;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
  onOpenBuiltInSink?: () => void;
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
  if (temp >= 65) return '#f0884a';
  if (temp >= 42) return '#e0ab45';
  if (temp <= 4) return '#7dd3fc';
  return '#a29e93';
}

const KitchenTableModalContent: React.FC<{
  onClose: () => void;
  storage: FurnitureStorage;
  player: Player;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
  onOpenBuiltInSink?: () => void;
}> = ({ onClose, storage, player, onInventoryUpdated, onVitalsChange, onOpenBuiltInSink }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const gmRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'storage' | 'interaction'>('storage');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  // 4x4-in -> 4x4-out Interaction Workbench state
  const [wbInputs, setWbInputs] = useState<InteractionSlotGrid16>(() => createEmptyInteractionGrid16());
  const [wbOutputs, setWbOutputs] = useState<InteractionSlotGrid16>(() => createEmptyInteractionGrid16());
  const wbInputsRef = useRef(wbInputs);
  const wbOutputsRef = useRef(wbOutputs);
  wbInputsRef.current = wbInputs;
  wbOutputsRef.current = wbOutputs;

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

  const showToast = (msg: string) => {
    setToastMsg(msg);
  };

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Periodic thermodynamic sync while table is open
  useEffect(() => {
    const id = setInterval(() => {
      syncFurnitureStorageThermodynamics(storage);
      forceRender(n => n + 1);
    }, 2000);
    return () => clearInterval(id);
  }, [storage]);

  const notifyChanged = () => {
    saveFurnitureStoragesToLocalStorage();
    forceRender(n => n + 1);
    onInventoryUpdated?.();
    onVitalsChange?.();
  };

  // Safely return all workbench items back to table storage (fallback: player pockets)
  const returnAllWorkbenchItems = () => {
    const ins = wbInputsRef.current;
    const outs = wbOutputsRef.current;
    let moved = false;

    const returnOne = (item: InventoryItem | null) => {
      if (!item) return;
      moved = true;
      const res = addItemToFurnitureStorage(storage, item, 1);
      if (!res.success) {
        if (!addItemToPlayer(player, item)) {
          // Force-push to storage so item is never lost
          storage.items.push({ ...item, count: 1, maxStack: item.maxStack ?? 1 });
        }
      }
    };

    ins.forEach(returnOne);
    outs.forEach(returnOne);

    if (moved) {
      setWbInputs(createEmptyInteractionGrid16());
      setWbOutputs(createEmptyInteractionGrid16());
      notifyChanged();
    }
  };

  // Safe return on unmount
  useEffect(() => {
    return () => {
      const ins = wbInputsRef.current;
      const outs = wbOutputsRef.current;
      let moved = false;
      const returnOne = (item: InventoryItem | null) => {
        if (!item) return;
        moved = true;
        const res = addItemToFurnitureStorage(storage, item, 1);
        if (!res.success && !addItemToPlayer(player, item)) {
          storage.items.push({ ...item, count: 1, maxStack: item.maxStack ?? 1 });
        }
      };
      ins.forEach(returnOne);
      outs.forEach(returnOne);
      if (moved) {
        saveFurnitureStoragesToLocalStorage();
        onInventoryUpdated?.();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    returnAllWorkbenchItems();
    onClose();
  };

  useTopmostEscape(handleClose);

  const cfg = FURNITURE_STORAGE_CONFIGS[storage.furnitureType] || FURNITURE_STORAGE_CONFIGS.kitchen_counter;
  const storageVol = getFurnitureStorageTotalVolume(storage);
  const storageWt = getFurnitureStorageTotalWeight(storage);
  const volPct = Math.min(100, Math.round((storageVol / Math.max(0.1, cfg.capacityL)) * 100));
  const wtPct = Math.min(100, Math.round((storageWt / Math.max(0.1, cfg.maxWeightKg)) * 100));

  const pocketCap = getPlayerPocketCapacity(player);
  const playerWt = getPlayerTotalCarriedWeight(player);
  const compartments = getPlayerCompartments(player);

  const hasCommittedOutputs = wbOutputs.some(Boolean);
  const evalResult = evaluateInteractionGrid4x4(wbInputs);

  // ---- Transfer Helpers ----
  const moveTableItemToPlayer = (tableIdx: number) => {
    const it = storage.items[tableIdx];
    if (!it) return;
    const removed = removeItemFromFurnitureStorage(storage, tableIdx, 1);
    if (!removed) return;
    const added = addItemToPlayer(player, removed);
    if (added) {
      sound.playPickup();
      if (selectedKey === `table:${tableIdx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      storage.items.splice(Math.min(tableIdx, storage.items.length), 0, removed);
      showToast('В инвентаре игрока нет места');
    }
  };

  const moveTableItemToHand = (tableIdx: number, hand: 'left' | 'right') => {
    const it = storage.items[tableIdx];
    if (!it) return;
    const curHand = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (curHand) {
      const check = canItemFitInFurniture(storage, curHand);
      if (!check.fits) {
        showToast(check.reason || 'Освободите руку или место на столе');
        return;
      }
    }
    const removed = removeItemFromFurnitureStorage(storage, tableIdx, 1);
    if (!removed) return;
    const prevHand = curHand ? takeItemFromHand(player, hand) : null;
    const res = putItemInHand(player, hand, removed);
    if (res.success) {
      if (prevHand) {
        addItemToFurnitureStorage(storage, prevHand, 1);
      }
      sound.playPickup();
      if (selectedKey === `table:${tableIdx}`) setSelectedKey(null);
      notifyChanged();
    } else {
      if (prevHand) putItemInHand(player, hand, prevHand);
      storage.items.splice(Math.min(tableIdx, storage.items.length), 0, removed);
      showToast('Не удалось взять предмет в руку');
    }
  };

  const movePlayerInvToTable = (invIdx: number) => {
    const it = player.inventory[invIdx];
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Предмет не помещается на столе');
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

  const movePlayerHandToTable = (hand: 'left' | 'right') => {
    const it = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!it) return;
    const check = canItemFitInFurniture(storage, it);
    if (!check.fits) {
      showToast(check.reason || 'Предмет не помещается на столе');
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

  // ---- Workbench Helpers (4x4 = 16 slots) ----
  const placeTableItemIntoWbInput = (tableIdx: number, targetInputIdx?: number) => {
    if (hasCommittedOutputs) {
      showToast('Сначала заберите готовый результат на стол');
      return;
    }
    const it = storage.items[tableIdx];
    if (!it) return;
    const slotIdx =
      targetInputIdx !== undefined && targetInputIdx >= 0 && targetInputIdx < 16
        ? targetInputIdx
        : wbInputs.findIndex(s => s === null);
    if (slotIdx < 0) {
      showToast('Все 16 слотов ввода заняты');
      return;
    }
    const existingIn = wbInputs[slotIdx];
    const removed = removeItemFromFurnitureStorage(storage, tableIdx, 1);
    if (!removed) return;
    if (existingIn) {
      addItemToFurnitureStorage(storage, existingIn, 1);
    }
    const next: InteractionSlotGrid16 = [...wbInputs];
    next[slotIdx] = removed;
    setWbInputs(next);
    sound.playUseItem();
    if (selectedKey === `table:${tableIdx}`) setSelectedKey(null);
    notifyChanged();
  };

  const removeWbInputToTable = (inputIdx: number) => {
    const it = wbInputs[inputIdx];
    if (!it) return;
    const res = addItemToFurnitureStorage(storage, it, 1);
    if (!res.success) {
      if (!addItemToPlayer(player, it)) {
        showToast(res.message || 'Нет места для возврата предмета');
        return;
      }
    }
    const next: InteractionSlotGrid16 = [...wbInputs];
    next[inputIdx] = null;
    setWbInputs(next);
    sound.playPickup();
    if (selectedKey === `input:${inputIdx}`) setSelectedKey(null);
    notifyChanged();
  };

  const ensureOutputsCommitted = (): boolean => {
    if (hasCommittedOutputs) return true;
    if (!evalResult.isValid) return false;
    const committedResult = evaluateInteractionGrid4x4(wbInputs, { applyPourJitter: true });
    if (!committedResult.isValid) return false;
    setWbOutputs([...committedResult.previewOutputs]);
    setWbInputs(createEmptyInteractionGrid16());
    sound.playUseItem();
    addPlayerNotification(player, `${committedResult.title}: ${committedResult.subtitle}`, 'info');
    return true;
  };

  const handleExecuteInteraction = () => {
    if (!evalResult.isValid || hasCommittedOutputs) return;
    ensureOutputsCommitted();
  };

  const claimWbOutputToTable = (outputIdx: number) => {
    if (!hasCommittedOutputs) {
      if (!evalResult.isValid) return;
      const committedResult = evaluateInteractionGrid4x4(wbInputs, { applyPourJitter: true });
      if (!committedResult.isValid) return;
      const committed = [...committedResult.previewOutputs];
      const target = committed[outputIdx];
      if (!target) return;
      const res = addItemToFurnitureStorage(storage, target, 1);
      if (!res.success && !addItemToPlayer(player, target)) {
        showToast(res.message || 'Нет места на столе и в карманах');
        return;
      }
      committed[outputIdx] = null;
      setWbInputs(createEmptyInteractionGrid16());
      setWbOutputs(committed);
      sound.playPickup();
      addPlayerNotification(player, `${committedResult.title}: ${committedResult.subtitle}`, 'info');
      notifyChanged();
      return;
    }

    const it = wbOutputs[outputIdx];
    if (!it) return;
    const res = addItemToFurnitureStorage(storage, it, 1);
    if (!res.success && !addItemToPlayer(player, it)) {
      showToast(res.message || 'Нет места на столе и в карманах');
      return;
    }
    const next: InteractionSlotGrid16 = [...wbOutputs];
    next[outputIdx] = null;
    setWbOutputs(next);
    sound.playPickup();
    if (selectedKey === `output:${outputIdx}`) setSelectedKey(null);
    notifyChanged();
  };

  const claimAllWbOutputsToTable = () => {
    let committedResult: ReturnType<typeof evaluateInteractionGrid4x4> | null = null;
    const sourceList: InteractionSlotGrid16 = hasCommittedOutputs
      ? [...wbOutputs]
      : evalResult.isValid
      ? (() => {
          committedResult = evaluateInteractionGrid4x4(wbInputs, { applyPourJitter: true });
          return committedResult.isValid ? [...committedResult.previewOutputs] : createEmptyInteractionGrid16();
        })()
      : createEmptyInteractionGrid16();

    let anyClaimed = false;
    const remaining: InteractionSlotGrid16 = createEmptyInteractionGrid16();
    for (let i = 0; i < 16; i++) {
      const it = sourceList[i];
      if (!it) continue;
      const res = addItemToFurnitureStorage(storage, it, 1);
      if (res.success || addItemToPlayer(player, it)) {
        anyClaimed = true;
      } else {
        remaining[i] = it;
      }
    }
    if (anyClaimed) {
      if (!hasCommittedOutputs) {
        setWbInputs(createEmptyInteractionGrid16());
        if (committedResult) {
          addPlayerNotification(player, `${committedResult.title}: ${committedResult.subtitle}`, 'info');
        }
      }
      setWbOutputs(remaining);
      sound.playPickup();
      notifyChanged();
    } else {
      showToast('Нет места на столе для результата');
    }
  };

  // ---- Unified Drag & Drop Handler ----
  const handleDrop = (targetKey: string, sourceKey: string) => {
    if (!targetKey || !sourceKey || targetKey === sourceKey) return;

    const srcIsTable = sourceKey.startsWith('table:') && !sourceKey.startsWith('table:empty');
    const srcIsInv = sourceKey.startsWith('inv:');
    const srcIsHand = sourceKey.startsWith('hand:');
    const srcIsInput = sourceKey.startsWith('input:');
    const srcIsOutput = sourceKey.startsWith('output:');

    const dstIsTable = targetKey.startsWith('table:') || targetKey === 'zone:table';
    const dstIsInv = targetKey.startsWith('inv:');
    const dstIsHand = targetKey.startsWith('hand:');
    const dstIsPlayerZone = targetKey === 'zone:player';
    const dstIsInput = targetKey.startsWith('input:');
    const dstIsInputZone = targetKey === 'zone:wb-in';

    // Tab 1: Table <-> Player
    if (srcIsTable && dstIsHand) {
      const idx = parseInt(sourceKey.slice(6), 10);
      moveTableItemToHand(idx, targetKey === 'hand:left' ? 'left' : 'right');
      return;
    }
    if (srcIsTable && (dstIsInv || dstIsPlayerZone)) {
      const idx = parseInt(sourceKey.slice(6), 10);
      moveTableItemToPlayer(idx);
      return;
    }
    if (srcIsInv && dstIsTable) {
      const idx = parseInt(sourceKey.slice(4), 10);
      movePlayerInvToTable(idx);
      return;
    }
    if (srcIsHand && dstIsTable) {
      movePlayerHandToTable(sourceKey === 'hand:left' ? 'left' : 'right');
      return;
    }
    // Player internal reordering
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
      const item = player.inventory[from];
      if (!item) return;
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
      const ok = stowItemFromHandToPockets(player, hand).success;
      if (ok) {
        sound.playUseItem();
        notifyChanged();
      } else {
        showToast('В карманах нет места');
      }
      return;
    }

    // Tab 2: Table <-> Workbench Input/Output
    if (srcIsTable && (dstIsInput || dstIsInputZone)) {
      const tIdx = parseInt(sourceKey.slice(6), 10);
      const inIdx = dstIsInput ? parseInt(targetKey.slice(6), 10) : undefined;
      placeTableItemIntoWbInput(tIdx, inIdx);
      return;
    }
    if (srcIsInput && dstIsTable) {
      const inIdx = parseInt(sourceKey.slice(6), 10);
      removeWbInputToTable(inIdx);
      return;
    }
    if (srcIsInput && dstIsInput) {
      const from = parseInt(sourceKey.slice(6), 10);
      const to = parseInt(targetKey.slice(6), 10);
      const next: InteractionSlotGrid16 = [...wbInputs];
      const tmp = next[from];
      next[from] = next[to];
      next[to] = tmp;
      setWbInputs(next);
      sound.playUseItem();
      return;
    }
    if (srcIsOutput && dstIsTable) {
      const outIdx = parseInt(sourceKey.slice(7), 10);
      claimWbOutputToTable(outIdx);
      return;
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

    // 2nd finger scrolls while 1st finger is dragging
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

    // Tap empty target slot when an item is already selected -> move!
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

  // Resolve currently selected item details for column footers
  const resolveItemByKey = (key: string | null): InventoryItem | null => {
    if (!key) return null;
    if (key.startsWith('table:')) {
      const idx = parseInt(key.slice(6), 10);
      return Number.isFinite(idx) ? storage.items[idx] || null : null;
    }
    if (key.startsWith('inv:')) {
      const idx = parseInt(key.slice(4), 10);
      return Number.isFinite(idx) ? player.inventory[idx] || null : null;
    }
    if (key === 'hand:left') return player.leftHandItem || null;
    if (key === 'hand:right') return player.rightHandItem || null;
    if (key.startsWith('input:')) {
      const idx = parseInt(key.slice(6), 10);
      return wbInputs[idx] || null;
    }
    if (key.startsWith('output:')) {
      const idx = parseInt(key.slice(7), 10);
      return wbOutputs[idx] || (!hasCommittedOutputs && evalResult.isValid ? evalResult.previewOutputs[idx] : null);
    }
    return null;
  };

  const selectedTableItem = selectedKey?.startsWith('table:') ? resolveItemByKey(selectedKey) : null;
  const selectedTableIdx = selectedKey?.startsWith('table:') ? parseInt(selectedKey.slice(6), 10) : -1;

  const selectedPlayerItem =
    selectedKey && (selectedKey.startsWith('inv:') || selectedKey.startsWith('hand:'))
      ? resolveItemByKey(selectedKey)
      : null;

  // ---- Reusable Table Storage Panel Renderer ----
  const renderTableStorageColumn = (mode: 'transfer' | 'workbench') => {
    const slotCount = Math.max(24, storage.items.length + 6);
    const isDropZone = dragUi?.overKey === 'zone:table';

    return (
      <section
        className={'panel kf-col' + (isDropZone ? ' drop-on' : '')}
        data-kf-zone="zone:table"
      >
        <div className="kf-col-head">
          <span className="kf-col-title">
            <Package width={16} height={16} />
            <span>Хранилище стола</span>
          </span>
          <span className="kf-col-meta">
            {storage.items.length} предм. · {storageVol.toFixed(1)}/{cfg.capacityL.toFixed(0)} л
          </span>
        </div>

        <div className="kf-meters">
          <div className="kf-meter">
            <div className="kf-meter-r">
              <span>Объём</span>
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
              const slotKey = it ? `table:${idx}` : `table:empty-${idx}`;
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
                    if (mode === 'transfer') moveTableItemToPlayer(idx);
                    else placeTableItemIntoWbInput(idx);
                  }}
                  className={
                    'kf-slot' +
                    (!it ? ' empty' : '') +
                    (isSel ? ' on' : '') +
                    (isOver ? ' drop' : '') +
                    (it && temp >= 55 ? ' hot' : '')
                  }
                  style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                  title={it ? `${it.nameRu} (${formatWeightRu(getItemTotalWeight(it))})` : 'Свободное место на столе'}
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

        <div className="kf-foot-bar">
          {selectedTableItem && selectedTableIdx >= 0 ? (
            <>
              <div className="kf-foot-item">
                <ItemIconCanvas itemId={selectedTableItem.itemId} item={selectedTableItem} size={30} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kf-foot-name">{selectedTableItem.nameRu}</div>
                  <div className="kf-foot-sub">
                    {formatWeightRu(getItemTotalWeight(selectedTableItem))} · {getItemTotalVolume(selectedTableItem).toFixed(2)} л
                    {selectedTableItem.temperature !== undefined ? ` · ${Math.round(selectedTableItem.temperature)}°C` : ''}
                  </div>
                </div>
              </div>
              <div className="kf-foot-acts">
                {mode === 'transfer' ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-s btn-xs"
                      onClick={() => moveTableItemToHand(selectedTableIdx, 'right')}
                    >
                      В руку
                    </button>
                    <button
                      type="button"
                      className="btn btn-p btn-xs"
                      onClick={() => moveTableItemToPlayer(selectedTableIdx)}
                    >
                      В инвентарь
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-p btn-xs"
                    onClick={() => placeTableItemIntoWbInput(selectedTableIdx)}
                  >
                    В слот ввода
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              {mode === 'transfer'
                ? 'Перетащите предмет или дважды нажмите, чтобы переложить в инвентарь'
                : 'Перетащите предмет в слоты ввода слева или дважды нажмите на него'}
            </div>
          )}
        </div>
      </section>
    );
  };

  // ---- Player Inventory Column Renderer (Tab 1 Right) ----
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
                return (
                  <div
                    key={slotKey}
                    data-kf-slot={slotKey}
                    draggable={false}
                    onDragStart={e => e.preventDefault()}
                    onPointerDown={e => startSlotPointer(e, slotKey, it)}
                    onDoubleClick={() => it && movePlayerHandToTable(hand)}
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
            const slotIndices = Array.from({ length: comp.slotCount }, (_, i) => comp.startIndex + i);
            return (
              <div key={comp.id} className="kf-group">
                <div className="kf-group-h">
                  <span className="kf-group-t">
                    {renderCompIcon(comp.id)}
                    <span>{comp.nameRu}</span>
                  </span>
                  <span className="kf-group-meta">
                    {comp.usedVolumeL.toFixed(1)}/{comp.capacityL.toFixed(1)} л · {comp.usedWeightKg.toFixed(1)}/{comp.maxWeightKg.toFixed(1)} кг
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
                        onDoubleClick={() => it && movePlayerInvToTable(slotIdx)}
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
                  <div className="kf-foot-sub">
                    {formatWeightRu(getItemTotalWeight(selectedPlayerItem))} · {getItemTotalVolume(selectedPlayerItem).toFixed(2)} л
                  </div>
                </div>
              </div>
              <div className="kf-foot-acts">
                <button
                  type="button"
                  className="btn btn-p btn-xs"
                  onClick={() => {
                    if (selectedKey === 'hand:left') movePlayerHandToTable('left');
                    else if (selectedKey === 'hand:right') movePlayerHandToTable('right');
                    else if (selectedKey.startsWith('inv:')) movePlayerInvToTable(parseInt(selectedKey.slice(4), 10));
                  }}
                >
                  На стол
                </button>
              </div>
            </>
          ) : (
            <div className="kf-foot-sub">
              Перетащите предмет или дважды нажмите, чтобы положить на стол
            </div>
          )}
        </div>
      </section>
    );
  };

  // ---- Workbench Column Renderer (Tab 2 Left: 4x4-in -> 4x4-out, zero scroll) ----
  const renderWorkbenchColumn = () => {
    const hasAnyInput = wbInputs.some(Boolean);
    const hasAnyOutputOrPreview = hasCommittedOutputs || evalResult.isValid;
    const isDropZone = dragUi?.overKey === 'zone:wb-in';

    const activePourSourceSlots = new Set<number>(
      evalResult.isValid
        ? evalResult.transferDetails
            .filter(d => d.dosagePct !== undefined)
            .map(d => d.fromSlot)
        : []
    );

    const renderWbSlot = (
      slotKey: string,
      item: InventoryItem | null | undefined,
      isPreview: boolean,
      onDoubleClick: () => void,
      dosageLabel?: string | null,
      isActivePour?: boolean
    ) => {
      const fill = getSlotFillInfo(item);
      const isDragging = dragUi?.sourceKey === slotKey;
      const isOver = dragUi?.overKey === slotKey;
      const isSel = selectedKey === slotKey;
      const slotHint = dosageLabel
        ? (item ? `${item.nameRu} · Дозировка: ${dosageLabel}` : `Дозировка слива: ${dosageLabel}`)
        : item?.nameRu;
      return (
        <div
          key={slotKey}
          data-kf-slot={slotKey}
          draggable={false}
          onDragStart={e => e.preventDefault()}
          onPointerDown={e => startSlotPointer(e, slotKey, item)}
          onDoubleClick={onDoubleClick}
          className={
            'kf-slot kf-wb-slot' +
            (!item ? ' empty' : '') +
            (isSel ? ' on' : '') +
            (isOver ? ' drop' : '')
          }
          style={{
            opacity: isDragging ? 0.35 : isPreview ? 0.85 : 1,
            borderStyle: isPreview && !isOver ? 'dashed' : undefined,
            borderColor: isPreview && !isOver ? 'rgba(224, 171, 69, .65)' : undefined,
            cursor: item ? 'grab' : 'default',
          }}
          title={slotHint}
        >
          {dosageLabel && (
            <span className={'kf-dose' + (isActivePour ? ' act' : '') + (item ? ' occ' : '')}>
              {dosageLabel}
            </span>
          )}
          {item && (
            <>
              <ItemIconCanvas itemId={item.itemId} item={item} size={34} />
              {item.count > 1 ? (
                <span className="kf-cnt">{item.count}</span>
              ) : item.isContainer ? (
                <span className="kf-cnt">{item.contents?.length || 0}</span>
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
    };

    const gridIndices = Array.from({ length: 16 }, (_, i) => i);

    return (
      <section
        className={'panel kf-col' + (isDropZone ? ' drop-on' : '')}
        data-kf-zone="zone:wb-in"
      >
        <div className="kf-col-head">
          <span className="kf-col-title">
            <Layers width={16} height={16} />
            <span>Взаимодействие на столе</span>
          </span>
          <span className="kf-col-meta">Слив и нарезка: 1-й слот всё → ~8% на глаз</span>
        </div>

        <div className="kf-wb-body">
          <div className="kf-wb-row">
            {/* 16 Input Slots (4x4) */}
            <div className="kf-wb-block">
              <span className="kf-wb-lbl">Ввод (4×4)</span>
              <div className="kf-wb-grid4">
                {gridIndices.map(idx =>
                  renderWbSlot(
                    `input:${idx}`,
                    wbInputs[idx],
                    false,
                    () => removeWbInputToTable(idx),
                    getSlotPourDosageLabel(idx, 16),
                    activePourSourceSlots.has(idx)
                  )
                )}
              </div>
            </div>

            {/* Execute Arrow */}
            <button
              type="button"
              id="btn-table-execute-interaction"
              className={'btn kf-wb-arrow' + (evalResult.isValid && !hasCommittedOutputs ? ' btn-p' : ' btn-s')}
              disabled={!evalResult.isValid || hasCommittedOutputs}
              onClick={handleExecuteInteraction}
              title={evalResult.isValid ? evalResult.title : 'Поместите предметы в слоты ввода'}
            >
              <ArrowRight width={20} height={20} />
            </button>

            {/* 16 Output Slots (4x4) */}
            <div className="kf-wb-block">
              <span className="kf-wb-lbl">Выход (4×4)</span>
              <div className="kf-wb-grid4">
                {gridIndices.map(idx => {
                  const committed = wbOutputs[idx];
                  const preview = !hasCommittedOutputs && evalResult.isValid ? evalResult.previewOutputs[idx] : null;
                  const displayItem = committed || preview;
                  return renderWbSlot(`output:${idx}`, displayItem, !committed && Boolean(preview), () =>
                    claimWbOutputToTable(idx)
                  );
                })}
              </div>
            </div>
          </div>

          <div className={'kf-wb-status' + (evalResult.isValid || hasCommittedOutputs ? ' valid' : '')}>
            {hasCommittedOutputs
              ? 'Результат готов — перетащите предметы обратно на стол или нажмите «Забрать всё на стол»'
              : evalResult.isValid
              ? `${evalResult.title} — ${evalResult.subtitle}`
              : 'Перетащите предметы из хранилища стола справа в слоты ввода (4×4)'}
          </div>

          <div className="kf-wb-actions">
            <button
              type="button"
              className="btn btn-s btn-sm"
              disabled={!hasAnyInput}
              onClick={() => {
                for (let i = 0; i < 16; i++) {
                  if (wbInputs[i]) {
                    const it = wbInputs[i]!;
                    const res = addItemToFurnitureStorage(storage, it, 1);
                    if (!res.success) addItemToPlayer(player, it);
                  }
                }
                setWbInputs(createEmptyInteractionGrid16());
                sound.playPickup();
                notifyChanged();
              }}
            >
              <RotateCcw width={14} height={14} />
              <span>Вернуть ввод</span>
            </button>
            <button
              type="button"
              className="btn btn-p btn-sm"
              disabled={!hasAnyOutputOrPreview}
              onClick={claimAllWbOutputsToTable}
            >
              <Check width={14} height={14} />
              <span>Забрать всё на стол</span>
            </button>
          </div>
        </div>
      </section>
    );
  };

  const modalTitle = storage.customTitle
    ? storage.customTitle.split(' / ')[0]
    : cfg.nameRu.split(' / ')[0];

  return (
    <ShadowHost css={kitchenFurnitureCss}>
      <div id="w" ref={hostRef}>
        <div className="gm" ref={gmRef} id="kitchen-table-modal">
          <div className="kf-bg" />

          {/* Top Bar */}
          <header className="top">
            <div className="top-l">
              <Utensils width={24} height={24} color="#c9922b" style={{ flex: 'none' }} />
              <div className="cn ttl">{modalTitle}</div>
              <span className="sub-top">Рабочая поверхность и шкафы</span>
            </div>
            <div className="top-r">
              <div className="chip">
                <span>Стол</span>
                <b>{storage.items.length} предм.</b>
              </div>
              <div className="chip">
                <span>Объём</span>
                <b>{storageVol.toFixed(1)} / {cfg.capacityL.toFixed(0)} л</b>
              </div>
              {onOpenBuiltInSink && (
                <button
                  type="button"
                  id="btn-counter-open-sink"
                  className="chip chip-sink"
                  onClick={() => {
                    returnAllWorkbenchItems();
                    onOpenBuiltInSink();
                  }}
                  title="Открыть встроенную раковину кухонного гарнитура"
                >
                  <Droplets width={15} height={15} color="#6cb4e8" />
                  <span>Раковина</span>
                </button>
              )}
              <button
                type="button"
                className="chip back"
                onClick={handleClose}
                aria-label="Закрыть"
                title="Закрыть (Esc)"
              >
                <X width={19} height={19} />
              </button>
            </div>
          </header>

          {/* Two Tabs */}
          <div className="kf-tabbar">
            <div className="kf-tabs">
              <button
                type="button"
                className={'kf-tab' + (activeTab === 'storage' ? ' on' : '')}
                onClick={() => {
                  returnAllWorkbenchItems();
                  setActiveTab('storage');
                  setSelectedKey(null);
                }}
              >
                <ArrowLeftRight width={16} height={16} />
                <span>Хранилище</span>
                <span className="kf-tab-cnt">{storage.items.length}</span>
              </button>
              <button
                type="button"
                className={'kf-tab' + (activeTab === 'interaction' ? ' on' : '')}
                onClick={() => {
                  setActiveTab('interaction');
                  setSelectedKey(null);
                }}
              >
                <Layers width={16} height={16} />
                <span>Взаимодействие</span>
              </button>
            </div>
            <div className="kf-tab-meta">
              {activeTab === 'storage'
                ? 'Слева стол · Справа инвентарь игрока'
                : 'Слева 4×4 ввод / 4×4 выход · Справа хранилище стола'}
            </div>
          </div>

          {/* Body */}
          <main className="kf-body">
            {activeTab === 'storage' ? (
              <div className="kf-split">
                {renderTableStorageColumn('transfer')}
                {renderPlayerInventoryColumn()}
              </div>
            ) : (
              <div className="kf-split-wb">
                {renderWorkbenchColumn()}
                {renderTableStorageColumn('workbench')}
              </div>
            )}
          </main>

          {toastMsg && <div className="kf-toast">{toastMsg}</div>}

          <div className="hint">
            <div className="hint-g">
              <span className="key">Esc</span>
              <span>Закрыть</span>
              <span className="key">2× Клик</span>
              <span>Быстрый перенос</span>
              <span className="key">Перетаскивание</span>
              <span>Между столом, руками и слотами</span>
            </div>
            <div className="hint-r">
              Вес игрока: <strong style={{ color: '#e9e6df' }}>{playerWt.toFixed(1)} кг</strong>
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

export const KitchenTableModal: React.FC<KitchenTableModalProps> = ({
  isOpen,
  storage,
  player,
  ...rest
}) => {
  if (!isOpen || !storage || !player) return null;
  return <KitchenTableModalContent storage={storage} player={player} {...rest} />;
};

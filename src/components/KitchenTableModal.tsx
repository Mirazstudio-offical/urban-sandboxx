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
  setFurnitureStorageUserLabel,
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
import { useCachedSlotDrag } from './useCachedSlotDrag';
import { sound } from '../audio';
import kitchenFurnitureCss from './kitchenFurniture.css?inline';
import {
  StorageFilterCategory,
  countDisposableTrashInList,
  countTransferCandidates,
  findCarryBagsWithItems,
  getItemLogicalGroup,
  getItemReadableTitleRu,
  getPackagedInnerItem,
  getSuitableButtonLabelRu,
  isDisposableTrashOrEmptyPackaging,
  itemMatchesStorageFilter,
  organizeFurnitureStorageInPlace,
  organizePlayerInventoryInPlace,
  quickTransferToStorage,
  sweepTrashFromStorage,
} from '../storageOrganization';
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
  ArrowUpDown,
  CopyPlus,
  FolderInput,
  ShoppingBag,
  Trash2,
  Search,
  LayoutGrid,
  List,
  Pencil,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState<StorageFilterCategory>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(storage.userLabel || '');
  const labelInputRef = useRef<HTMLInputElement | null>(null);
  const [, forceRender] = useState(0);

  // 4x4-in -> 4x4-out Interaction Workbench state
  const [wbInputs, setWbInputs] = useState<InteractionSlotGrid16>(() => createEmptyInteractionGrid16());
  const [wbOutputs, setWbOutputs] = useState<InteractionSlotGrid16>(() => createEmptyInteractionGrid16());
  const wbInputsRef = useRef(wbInputs);
  const wbOutputsRef = useRef(wbOutputs);
  wbInputsRef.current = wbInputs;
  wbOutputsRef.current = wbOutputs;

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

  // Periodic thermodynamic sync while table is open (only re-render when rounded temps/wetness change)
  useEffect(() => {
    const id = setInterval(() => {
      const prevSig = (storage.items || [])
        .map(it => (it ? `${Math.round(it.surfaceTemperature ?? it.temperature ?? 20)}:${Math.round(it.wetness ?? 0)}` : ''))
        .join('|');
      syncFurnitureStorageThermodynamics(storage);
      const nextSig = (storage.items || [])
        .map(it => (it ? `${Math.round(it.surfaceTemperature ?? it.temperature ?? 20)}:${Math.round(it.wetness ?? 0)}` : ''))
        .join('|');
      if (prevSig !== nextSig) {
        forceRender(n => n + 1);
      }
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

  useEffect(() => {
    if (isEditingLabel) {
      setTimeout(() => labelInputRef.current?.focus(), 0);
    }
  }, [isEditingLabel]);

  const handleClose = () => {
    returnAllWorkbenchItems();
    onClose();
  };

  useTopmostEscape(() => {
    if (isEditingLabel) {
      setIsEditingLabel(false);
      setLabelDraft(storage.userLabel || '');
      return;
    }
    handleClose();
  });

  const handleSaveLabel = () => {
    const saved = setFurnitureStorageUserLabel(storage, labelDraft);
    setLabelDraft(saved || '');
    setIsEditingLabel(false);
    sound.playButtonPress();
    showToast(saved ? `Подпись сохранена: «${saved}»` : 'Подпись сброшена');
    notifyChanged();
  };

  const handleOrganizeTable = () => {
    syncFurnitureStorageThermodynamics(storage);
    const res = organizeFurnitureStorageInPlace(storage);
    setSelectedKey(null);
    sound.playPickup();
    showToast(
      res.changed
        ? res.mergedCount > 0
          ? `Порядок наведён (объединено стопок: ${res.mergedCount})`
          : 'Порядок наведён'
        : 'На столе уже порядок'
    );
    notifyChanged();
  };

  const handleOrganizePlayerPockets = () => {
    const res = organizePlayerInventoryInPlace(player);
    setSelectedKey(null);
    sound.playPickup();
    showToast(
      res.changed
        ? res.mergedCount > 0
          ? `Карманы упорядочены (объединено стопок: ${res.mergedCount})`
          : 'Карманы упорядочены'
        : 'В карманах уже порядок'
    );
    notifyChanged();
  };

  const handleQuickTransfer = (mode: 'matching' | 'suitable' | 'unload_bags') => {
    syncFurnitureStorageThermodynamics(storage);
    const res = quickTransferToStorage(player, storage, mode);
    setSelectedKey(null);
    if (res.movedCount > 0) {
      sound.playPickup();
      showToast(res.messageRu);
      addPlayerNotification(player, res.messageRu, 'pickup');
      notifyChanged();
    } else {
      showToast(res.messageRu);
    }
  };

  const handleSweepTableTrash = () => {
    const res = sweepTrashFromStorage(storage);
    setSelectedKey(null);
    if (res.removedCount > 0) {
      sound.playUseItem();
      showToast(res.messageRu);
      if (filterCat === 'trash') setFilterCat('all');
      notifyChanged();
    } else {
      showToast(res.messageRu);
    }
  };

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

  const handleSlotShiftClick = (slotKey: string) => {
    if (slotKey.startsWith('table:') && !slotKey.startsWith('table:empty')) {
      const idx = parseInt(slotKey.slice(6), 10);
      if (!isNaN(idx) && storage.items[idx]) {
        if (activeTab === 'storage') moveTableItemToPlayer(idx);
        else placeTableItemIntoWbInput(idx);
      }
      return;
    }
    if (slotKey.startsWith('inv:')) {
      const idx = parseInt(slotKey.slice(4), 10);
      if (!isNaN(idx) && player.inventory[idx]) movePlayerInvToTable(idx);
      return;
    }
    if (slotKey === 'hand:left' || slotKey === 'hand:right') {
      movePlayerHandToTable(slotKey === 'hand:left' ? 'left' : 'right');
      return;
    }
    if (slotKey.startsWith('input:')) {
      const inIdx = parseInt(slotKey.slice(6), 10);
      if (!isNaN(inIdx)) removeWbInputToTable(inIdx);
      return;
    }
    if (slotKey.startsWith('output:')) {
      const outIdx = parseInt(slotKey.slice(7), 10);
      if (!isNaN(outIdx)) claimWbOutputToTable(outIdx);
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
    const tableTrashCount = countDisposableTrashInList(storage.items);
    const matchingCount = mode === 'transfer' ? countTransferCandidates(player, storage, 'matching') : 0;
    const suitableCount = mode === 'transfer' ? countTransferCandidates(player, storage, 'suitable') : 0;
    const carryBags = mode === 'transfer' ? findCarryBagsWithItems(player) : [];
    const carryBagsTotal = carryBags.reduce((s, b) => s + b.itemCount, 0);
    const suitableLabel = getSuitableButtonLabelRu(storage.furnitureType);
    const hasActiveFilter = filterCat !== 'all' || searchQuery.trim().length > 0;

    const filteredListEntries = storage.items
      .map((item, idx) => ({ item, idx }))
      .filter((entry): entry is { item: InventoryItem; idx: number } =>
        Boolean(entry.item) && itemMatchesStorageFilter(entry.item, filterCat, searchQuery)
      );

    const filterChips: { id: StorageFilterCategory; label: string; count?: number }[] = [
      { id: 'all', label: 'Все' },
      { id: 'food', label: 'Еда' },
      { id: 'drink', label: 'Напитки' },
      { id: 'kitchenware', label: 'Посуда' },
      { id: 'gear', label: 'Вещи' },
      { id: 'trash', label: 'Мусор', count: tableTrashCount > 0 ? tableTrashCount : undefined },
    ];

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
            {storage.items.filter(Boolean).length} предм. · {storageVol.toFixed(1)}/{cfg.capacityL.toFixed(0)} л
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

        {/* Single-row Search + Filters + Grid/List toggle */}
        <div className="kf-org-bar">
          <div className="kf-search">
            <Search width={13} height={13} color="#8f8b81" style={{ flex: 'none' }} />
            <input
              type="text"
              value={searchQuery}
              placeholder="Поиск..."
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  if (searchQuery) {
                    e.stopPropagation();
                    e.nativeEvent.stopPropagation();
                    setSearchQuery('');
                  }
                  return;
                }
                e.stopPropagation();
                e.nativeEvent.stopPropagation();
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="kf-search-clr"
                onClick={() => setSearchQuery('')}
                aria-label="Очистить поиск"
              >
                <X width={12} height={12} />
              </button>
            )}
          </div>

          <div className="kf-filters">
            {filterChips.map(fc => (
              <button
                key={fc.id}
                type="button"
                className={
                  'kf-fchip' +
                  (filterCat === fc.id ? ' on' : '') +
                  (fc.id === 'trash' && fc.count ? ' trash-on' : '')
                }
                onClick={() => setFilterCat(fc.id)}
              >
                <span>{fc.label}</span>
                {fc.count !== undefined && <span className="mono">{fc.count}</span>}
              </button>
            ))}
          </div>

          {mode === 'transfer' && (
            <div className="kf-view-seg" role="group" aria-label="Вид списка">
              <button
                type="button"
                className={'kf-view-btn' + (viewMode === 'grid' ? ' on' : '')}
                onClick={() => setViewMode('grid')}
                title="Сетка"
                aria-label="Сетка"
              >
                <LayoutGrid width={14} height={14} />
              </button>
              <button
                type="button"
                className={'kf-view-btn' + (viewMode === 'list' ? ' on' : '')}
                onClick={() => setViewMode('list')}
                title="Список с названиями"
                aria-label="Список"
              >
                <List width={14} height={14} />
              </button>
            </div>
          )}
        </div>

        {/* Single-row Organization Actions */}
        <div className="kf-act-row">
          <button
            type="button"
            className="kf-act-btn"
            disabled={storage.items.filter(Boolean).length === 0}
            onClick={handleOrganizeTable}
            title="Разложить предметы по группам и объединить одинаковые стопки"
          >
            <ArrowUpDown width={13} height={13} color="#e0ab45" />
            <span>Порядок</span>
          </button>

          {mode === 'transfer' && (
            <>
              <button
                type="button"
                className="kf-act-btn"
                disabled={matchingCount === 0}
                onClick={() => handleQuickTransfer('matching')}
                title="Доложить из карманов похожие предметы"
              >
                <CopyPlus width={13} height={13} />
                <span>Похожее</span>
                {matchingCount > 0 && <span className="kf-act-n">{matchingCount}</span>}
              </button>

              <button
                type="button"
                className="kf-act-btn"
                disabled={suitableCount === 0}
                onClick={() => handleQuickTransfer('suitable')}
                title="Сложить посуду, специи и бакалею на стол"
              >
                <FolderInput width={13} height={13} />
                <span>{suitableLabel}</span>
                {suitableCount > 0 && <span className="kf-act-n">{suitableCount}</span>}
              </button>

              {carryBagsTotal > 0 && (
                <button
                  type="button"
                  className="kf-act-btn accent"
                  onClick={() => handleQuickTransfer('unload_bags')}
                  title={`Выгрузить содержимое из «${carryBags[0].bag.nameRu}»`}
                >
                  <ShoppingBag width={13} height={13} />
                  <span>Выгрузить пакет</span>
                  <span className="kf-act-n">{carryBagsTotal}</span>
                </button>
              )}
            </>
          )}

          {tableTrashCount > 0 && (
            <button
              type="button"
              className="kf-act-btn danger"
              onClick={handleSweepTableTrash}
              title="Убрать пустые упаковки, обёртки и испорченные остатки"
            >
              <Trash2 width={13} height={13} />
              <span>Убрать мусор</span>
              <span className="kf-act-n">{tableTrashCount}</span>
            </button>
          )}
        </div>

        <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
          {mode === 'transfer' && viewMode === 'list' ? (
            filteredListEntries.length > 0 ? (
              <div className="kf-list">
                {filteredListEntries.map(({ item: it, idx }) => {
                  const slotKey = `table:${idx}`;
                  const isSel = selectedKey === slotKey;
                  const pkgInner = getPackagedInnerItem(it);
                  const grp = getItemLogicalGroup(it);
                  const isTrash = isDisposableTrashOrEmptyPackaging(it);
                  const temp = it.surfaceTemperature ?? it.temperature;
                  const tempText =
                    temp !== undefined && (temp >= 38 || temp <= 6)
                      ? ` · ${temp > 0 ? '+' : ''}${Math.round(temp)}°C`
                      : '';
                  return (
                    <div
                      key={slotKey}
                      className={'kf-list-row' + (isSel ? ' on' : '') + (isTrash ? ' is-trash' : '')}
                      onClick={() => setSelectedKey(slotKey)}
                      onDoubleClick={() => moveTableItemToPlayer(idx)}
                    >
                      <div className="kf-list-ic">
                        <ItemIconCanvas itemId={it.itemId} item={it} size={26} />
                        {pkgInner && (
                          <span className="kf-pkg-sub">
                            <ItemIconCanvas itemId={pkgInner.itemId} item={pkgInner} size={13} />
                          </span>
                        )}
                      </div>
                      <div className="kf-list-info">
                        <div className="kf-list-name">{getItemReadableTitleRu(it)}</div>
                        <div className="kf-list-sub">
                          {grp.labelRu}{tempText}
                        </div>
                      </div>
                      <div className="kf-list-meta">
                        {it.count > 1 && <span>×{it.count}</span>}
                        <span>{formatWeightRu(getItemTotalWeight(it))}</span>
                        <button
                          type="button"
                          className="btn btn-s btn-xs"
                          onClick={e => {
                            e.stopPropagation();
                            moveTableItemToPlayer(idx);
                          }}
                        >
                          Забрать
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="kf-list-empty">
                {storage.items.filter(Boolean).length === 0
                  ? 'На столе пока пусто'
                  : 'По текущему фильтру предметы не найдены'}
              </div>
            )
          ) : (
            <div className="kf-slots">
              {Array.from({ length: slotCount }, (_, idx) => {
                const it = storage.items[idx];
                const slotKey = it ? `table:${idx}` : `table:empty-${idx}`;
                const fill = getSlotFillInfo(it);
                const isDragging = dragUi?.sourceKey === slotKey;
                const isOver = dragUi?.overKey === slotKey;
                const isSel = selectedKey === slotKey;
                const temp = it ? (it.surfaceTemperature ?? it.temperature ?? 20) : 20;
                const pkgInner = getPackagedInnerItem(it);
                const isTrash = isDisposableTrashOrEmptyPackaging(it);
                const dimmed = Boolean(it && hasActiveFilter && !itemMatchesStorageFilter(it, filterCat, searchQuery));

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
                      (it && temp >= 55 ? ' hot' : '') +
                      (dimmed ? ' dim' : '') +
                      (isTrash ? ' is-trash' : '')
                    }
                    style={{ opacity: isDragging ? 0.35 : undefined, cursor: it ? 'grab' : 'default' }}
                    title={it ? `${getItemReadableTitleRu(it)} (${formatWeightRu(getItemTotalWeight(it))})` : 'Свободное место на столе'}
                  >
                    {it && (
                      <>
                        <ItemIconCanvas itemId={it.itemId} item={it} size={42} />
                        {pkgInner && (
                          <span className="kf-pkg-sub" title={pkgInner.nameRu}>
                            <ItemIconCanvas itemId={pkgInner.itemId} item={pkgInner} size={18} />
                          </span>
                        )}
                        {(temp >= 40 || temp <= 4) && (
                          <span className="kf-temp" style={{ color: getTempColor(temp) }}>
                            {temp > 0 ? '+' : ''}{Math.round(temp)}°
                          </span>
                        )}
                        {it.count > 1 ? (
                          <span className="kf-cnt">{it.count}</span>
                        ) : it.isContainer && !pkgInner ? (
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
          )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="kf-col-meta">
              {pocketCap.usedVolumeL.toFixed(1)}/{pocketCap.totalCapacityL.toFixed(1)} л · {playerWt.toFixed(1)} кг
            </span>
            <button
              type="button"
              className="kf-act-btn"
              onClick={handleOrganizePlayerPockets}
              title="Упорядочить предметы внутри карманов и рюкзака"
            >
              <ArrowUpDown width={12} height={12} color="#e0ab45" />
              <span>Порядок</span>
            </button>
          </div>
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

                    const pkgInner = getPackagedInnerItem(it);
                    const isTrash = isDisposableTrashOrEmptyPackaging(it);

                    return (
                      <div
                        key={slotKey}
                        data-kf-slot={slotKey}
                        draggable={false}
                        onDragStart={e => e.preventDefault()}
                        onPointerDown={e => startSlotPointer(e, slotKey, it)}
                        onDoubleClick={() => it && movePlayerInvToTable(slotIdx)}
                        className={'kf-slot' + (!it ? ' empty' : '') + (isSel ? ' on' : '') + (isOver ? ' drop' : '') + (isTrash ? ' is-trash' : '')}
                        style={{ opacity: isDragging ? 0.35 : 1, cursor: it ? 'grab' : 'default' }}
                        title={it ? `${getItemReadableTitleRu(it)} (${formatWeightRu(getItemTotalWeight(it))})` : 'Свободный слот'}
                      >
                        {it && (
                          <>
                            <ItemIconCanvas itemId={it.itemId} item={it} size={42} />
                            {pkgInner && (
                              <span className="kf-pkg-sub" title={pkgInner.nameRu}>
                                <ItemIconCanvas itemId={pkgInner.itemId} item={pkgInner} size={18} />
                              </span>
                            )}
                            {(temp >= 40 || temp <= 4) && (
                              <span className="kf-temp" style={{ color: getTempColor(temp) }}>
                                {temp > 0 ? '+' : ''}{Math.round(temp)}°
                              </span>
                            )}
                            {it.count > 1 ? (
                              <span className="kf-cnt">{it.count}</span>
                            ) : it.isContainer && !pkgInner ? (
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
              : evalResult.isValid || hasAnyInput
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

  const baseModalTitle = storage.customTitle
    ? storage.customTitle.split(' / ')[0]
    : cfg.nameRu.split(' / ')[0];
  const savedLabel = storage.userLabel?.trim() || '';
  const modalTitle = savedLabel || baseModalTitle;

  return (
    <ShadowHost css={kitchenFurnitureCss}>
      <div id="w" ref={hostRef}>
        <div className="gm" ref={gmRef} id="kitchen-table-modal">
          <div className="kf-bg" />

          {/* Top Bar */}
          <header className="top">
            <div className="top-l">
              <Utensils width={24} height={24} color="#c9922b" style={{ flex: 'none' }} />
              {isEditingLabel ? (
                <div className="kf-label-form" onClick={e => e.stopPropagation()}>
                  <input
                    ref={labelInputRef}
                    type="text"
                    className="kf-label-input"
                    value={labelDraft}
                    maxLength={36}
                    placeholder="Подпись наклейки, напр. Крупы и специи"
                    onChange={e => setLabelDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        e.nativeEvent.stopPropagation();
                        setIsEditingLabel(false);
                        setLabelDraft(storage.userLabel || '');
                        return;
                      }
                      e.stopPropagation();
                      e.nativeEvent.stopPropagation();
                      if (e.key === 'Enter') {
                        handleSaveLabel();
                      }
                    }}
                  />
                  <button type="button" className="btn btn-p btn-xs" onClick={handleSaveLabel} title="Сохранить">
                    <Check width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    onClick={() => {
                      setIsEditingLabel(false);
                      setLabelDraft(storage.userLabel || '');
                    }}
                    title="Отмена"
                  >
                    <X width={14} height={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="cn ttl" title={modalTitle}>{modalTitle}</div>
                  <button
                    type="button"
                    className="kf-label-btn"
                    onClick={() => {
                      setLabelDraft(storage.userLabel || '');
                      setIsEditingLabel(true);
                    }}
                    title={savedLabel ? 'Изменить подпись наклейки' : 'Подписать стол наклейкой'}
                    aria-label="Подписать стол"
                  >
                    <Pencil width={14} height={14} />
                  </button>
                  <span className="sub-top">
                    {savedLabel ? baseModalTitle : 'Рабочая поверхность и шкафы'}
                  </span>
                </>
              )}
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

        <div ref={ghostRef} className="kf-drag-ghost">
          {dragUi && (
            <ItemIconCanvas itemId={dragUi.item.itemId} item={dragUi.item} size={46} />
          )}
        </div>
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

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Player, GameWorld, InventoryItem } from '../types';
import {
  FurnitureStorage,
  FURNITURE_STORAGE_CONFIGS,
  saveFurnitureStoragesToLocalStorage,
  setFurnitureStorageUserLabel,
} from '../furnitureStorageSystem';
import {
  getItemTotalWeight,
  getItemTotalVolume,
  addItemToPlayer,
  putItemInHand,
  takeItemFromHand,
  canItemFitInCompartment,
  getPlayerCompartments,
  addPlayerNotification,
} from '../items';
import {
  LIQUID_REGISTRY,
  LiquidId,
  isFluidStorageDryForm,
  ensureHybridContainerProps,
  getContainerCapacityBreakdown,
} from '../liquidSystem';
import { getEffectiveFluidWrapper } from '../interactionCrafting';
import { syncFurnitureStorageThermodynamics, getItemThermalDisplayInfo } from '../itemThermalSystem';
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
import { sound } from '../audio';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { useCachedSlotDrag } from './useCachedSlotDrag';
import kitchenFurnitureCss from './kitchenFurniture.css?inline';
import {
  X,
  Package,
  Archive,
  Hand,
  Shirt,
  Luggage,
  User,
  Snowflake,
  Trash2,
  CloudRain,
  ArrowRight,
  ArrowLeft,
  ArrowUpDown,
  CopyPlus,
  FolderInput,
  ShoppingBag,
  Search,
  LayoutGrid,
  List,
  Pencil,
  Check,
  Tag,
  Flame,
} from 'lucide-react';

function formatWeightRu(weightKg: number): string {
  if (!weightKg || weightKg <= 0) return '0 г';
  if (weightKg < 1) {
    const grams = weightKg < 0.01 ? Number((weightKg * 1000).toFixed(1)) : Math.round(weightKg * 1000);
    return `${grams} г`;
  }
  return `${Number(weightKg.toFixed(2))} кг`;
}

export interface FurnitureStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage?: FurnitureStorage | null;
  storageId?: string | null;
  player: Player | null;
  world?: GameWorld | null;
  buildingId?: string;
  floor?: number;
  furnitureIndex?: number;
  furnitureType?: string;
  aptId?: string;
  customTitle?: string;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
  onNotify?: (msg: string, type?: 'info' | 'warning' | 'danger' | 'pickup') => void;
}

const FurnitureStorageContent: React.FC<{
  player: Player;
  world: GameWorld | null;
  storage: FurnitureStorage;
  customTitle?: string;
  onClose: () => void;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
  onNotify?: (msg: string, type?: 'info' | 'warning' | 'danger' | 'pickup') => void;
}> = ({ player, world, storage, customTitle, onClose, onInventoryUpdated, onVitalsChange, onNotify }) => {
  const [, forceRender] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState<StorageFilterCategory>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(storage.userLabel || '');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    slotKey: string;
    item: InventoryItem;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const gmRef = useRef<HTMLDivElement | null>(null);
  const labelInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const dropHandlerRef = useRef<((targetKey: string, sourceKey: string) => void) | null>(null);

  const cfg = FURNITURE_STORAGE_CONFIGS[storage.furnitureType];
  const baseStorageTitle = (customTitle || cfg?.nameRu || storage.id).split(' / ')[0];
  const savedLabel = storage.userLabel?.trim() || '';
  const storageTitle = savedLabel || baseStorageTitle;
  const isFridge =
    storage.furnitureType?.includes('fridge') ||
    baseStorageTitle.toLowerCase().includes('холодильник') ||
    storage.id.includes('fridge');
  const isRadiator = storage.furnitureType === 'radiator';

  useTopmostEscape(() => {
    if (isEditingLabel) {
      setIsEditingLabel(false);
      setLabelDraft(storage.userLabel || '');
      return;
    }
    onClose();
  });
  useLayoutEffect(() => attachStageFit(() => wrapRef.current, () => gmRef.current), []);

  useEffect(() => {
    if (isEditingLabel) {
      setTimeout(() => labelInputRef.current?.focus(), 0);
    }
  }, [isEditingLabel]);

  useEffect(() => {
    syncFurnitureStorageThermodynamics(storage, Date.now() / 1000);
    const interval = setInterval(() => {
      const items = storage.items || [];
      const prevSig = items
        .map(it => (it ? `${Math.round(it.surfaceTemperature ?? it.temperature ?? 20)}:${Math.round(it.wetness ?? 0)}` : ''))
        .join('|');
      syncFurnitureStorageThermodynamics(storage, Date.now() / 1000);
      const nextSig = (storage.items || [])
        .map(it => (it ? `${Math.round(it.surfaceTemperature ?? it.temperature ?? 20)}:${Math.round(it.wetness ?? 0)}` : ''))
        .join('|');
      if (prevSig !== nextSig) {
        forceRender(n => n + 1);
      }
    }, 1000);
    return () => {
      clearInterval(interval);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      saveFurnitureStoragesToLocalStorage();
    };
  }, [storage]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2600);
  };

  const notify = (msg: string, type: 'info' | 'warning' | 'danger' | 'pickup' = 'info') => {
    showToast(msg);
    if (onNotify) onNotify(msg, type);
    else addPlayerNotification(player, msg, type === 'danger' ? 'warning' : type);
  };

  const notifyChanged = () => {
    saveFurnitureStoragesToLocalStorage();
    forceRender(n => n + 1);
    onInventoryUpdated?.();
    onVitalsChange?.();
  };

  const handleSaveLabel = () => {
    const saved = setFurnitureStorageUserLabel(storage, labelDraft);
    setLabelDraft(saved || '');
    setIsEditingLabel(false);
    sound.playButtonPress();
    showToast(saved ? `Подпись сохранена: «${saved}»` : 'Подпись сброшена');
    notifyChanged();
  };

  const handleOrganizeStorage = () => {
    syncFurnitureStorageThermodynamics(storage, Date.now() / 1000);
    const res = organizeFurnitureStorageInPlace(storage);
    setSelectedKey(null);
    sound.playPickup();
    if (res.changed) {
      const mergedPart = res.mergedCount > 0 ? ` (объединено стопок: ${res.mergedCount})` : '';
      showToast(`Порядок наведён${mergedPart}`);
    } else {
      showToast('Вещи уже разложены по порядку');
    }
    notifyChanged();
  };

  const handleOrganizePlayerPockets = () => {
    const res = organizePlayerInventoryInPlace(player);
    setSelectedKey(null);
    sound.playPickup();
    if (res.changed) {
      const mergedPart = res.mergedCount > 0 ? ` (объединено стопок: ${res.mergedCount})` : '';
      showToast(`Карманы упорядочены${mergedPart}`);
    } else {
      showToast('В карманах уже порядок');
    }
    notifyChanged();
  };

  const handleQuickTransfer = (mode: 'matching' | 'suitable' | 'unload_bags') => {
    syncFurnitureStorageThermodynamics(storage, Date.now() / 1000);
    const res = quickTransferToStorage(player, storage, mode);
    setSelectedKey(null);
    if (res.movedCount > 0) {
      sound.playPickup();
      notify(res.messageRu, 'pickup');
      notifyChanged();
    } else {
      notify(res.messageRu, 'info');
    }
  };

  const handleSweepStorageTrash = () => {
    const res = sweepTrashFromStorage(storage);
    setSelectedKey(null);
    if (res.removedCount > 0) {
      sound.playUseItem();
      notify(res.messageRu, 'info');
      if (filterCat === 'trash') setFilterCat('all');
      notifyChanged();
    } else {
      showToast(res.messageRu);
    }
  };

  if (!storage.items) storage.items = [];
  const totalStorageSlots = Math.max(24, storage.items.length + 6);
  const maxWeightKg = cfg?.maxWeightKg || 60;

  const usedStorageSlots = storage.items.filter(Boolean).length;
  const usedWeight = Number(
    storage.items.reduce((acc, it) => acc + (it ? getItemTotalWeight(it) : 0), 0).toFixed(2)
  );
  const compartments = getPlayerCompartments(player);
  const inventory = player.inventory || [];

  const getSlotFillInfo = (item: InventoryItem | null | undefined) => {
    if (!item) return null;
    ensureHybridContainerProps(item);
    const wrap = getEffectiveFluidWrapper(item);
    if (wrap) {
      const st = wrap.state;
      const liq = st.liquidId ? LIQUID_REGISTRY[st.liquidId as LiquidId] : undefined;
      const unit = isFluidStorageDryForm(st) || wrap.isGranularContainer ? 'г' : 'мл';
      const bd = getContainerCapacityBreakdown(item);
      const hasSolids = Boolean(item.contents && item.contents.length > 0);
      const pct =
        bd.totalCapacityMl > 0
          ? Math.max(0, Math.min(100, Math.round(bd.totalPct)))
          : st.maxMl > 0
          ? Math.max(0, Math.min(100, Math.round((st.currentMl / st.maxMl) * 100)))
          : 0;
      const subName =
        st.currentMl <= 0 || !st.liquidId
          ? hasSolids
            ? `Предметы (${item.contents!.length} шт.)`
            : 'Пусто'
          : st.attributes?.varietyRu || liq?.nameRu || st.liquidId;
      const color =
        st.currentMl > 0 && st.liquidId
          ? st.attributes?.customColor || liq?.color || '#38bdf8'
          : hasSolids
          ? '#f59e0b'
          : '#38bdf8';
      return {
        pct,
        color,
        tooltip: `${item.nameRu}\n${subName}: ${Math.round(st.currentMl)} / ${st.maxMl} ${unit}`,
      };
    }
    const pct =
      item.maxPortions && item.maxPortions > 1
        ? Math.max(0, Math.min(100, ((item.portions ?? item.maxPortions) / item.maxPortions) * 100))
        : null;
    const thermal = getItemThermalDisplayInfo(item);
    const tempLine = thermal ? `\n${thermal.coreTempText} (${thermal.tempLabel})` : '';
    const readableName = getItemReadableTitleRu(item);
    return {
      pct,
      color: undefined,
      tooltip: `${readableName}\n${formatWeightRu(getItemTotalWeight(item))} · ${getItemTotalVolume(item)} л${tempLine}`,
    };
  };

  const canAddWeightToStorage = (item: InventoryItem, replacingItem?: InventoryItem | null): boolean => {
    const itemW = getItemTotalWeight(item);
    const repW = replacingItem ? getItemTotalWeight(replacingItem) : 0;
    if (usedWeight - repW + itemW > maxWeightKg + 0.001) {
      notify(
        `Превышен лимит веса (${storageTitle}: макс. ${formatWeightRu(maxWeightKg)})`,
        'warning'
      );
      return false;
    }
    return true;
  };

  const storePlayerItemIntoSlot = (
    source: { type: 'hand'; hand: 'left' | 'right' } | { type: 'inv'; idx: number },
    targetStorageIdx?: number
  ) => {
    syncFurnitureStorageThermodynamics(storage, Date.now() / 1000);

    const srcItem =
      source.type === 'hand'
        ? source.hand === 'left'
          ? player.leftHandItem
          : player.rightHandItem
        : player.inventory[source.idx];
    if (!srcItem) return;

    // 1. Exact slot target
    if (targetStorageIdx !== undefined && targetStorageIdx >= 0 && targetStorageIdx < totalStorageSlots) {
      const targetItem = storage.items[targetStorageIdx];

      if (
        targetItem &&
        targetItem.itemId === srcItem.itemId &&
        targetItem.count < targetItem.maxStack &&
        !targetItem.isContainer &&
        !targetItem.fluidStorage
      ) {
        if (!canAddWeightToStorage(srcItem)) return;
        const canAdd = Math.min(srcItem.count, targetItem.maxStack - targetItem.count);
        if (canAdd > 0) {
          targetItem.count += canAdd;
          srcItem.count -= canAdd;
          if (srcItem.count <= 0) {
            if (source.type === 'hand') takeItemFromHand(player, source.hand);
            else player.inventory[source.idx] = null as any;
          }
          sound.playPickup();
          notifyChanged();
          return;
        }
      }

      if (!targetItem) {
        if (!canAddWeightToStorage(srcItem)) return;
        const taken =
          source.type === 'hand' ? takeItemFromHand(player, source.hand) : player.inventory[source.idx];
        if (!taken) return;
        if (source.type === 'inv') player.inventory[source.idx] = null as any;
        storage.items[targetStorageIdx] = taken;
        sound.playPickup();
        notifyChanged();
        return;
      }

      if (!canAddWeightToStorage(srcItem, targetItem)) return;
      if (source.type === 'hand') {
        const taken = takeItemFromHand(player, source.hand);
        if (!taken) return;
        storage.items[targetStorageIdx] = taken;
        putItemInHand(player, source.hand, targetItem, world);
        sound.playPickup();
        notifyChanged();
        return;
      } else {
        const prev = player.inventory[source.idx];
        player.inventory[source.idx] = null as any;
        const fit = canItemFitInCompartment(player, source.idx, targetItem);
        if (!fit.fits) {
          player.inventory[source.idx] = prev;
          notify(fit.reason || 'Предмет из хранилища не помещается в этот карман', 'warning');
          return;
        }
        storage.items[targetStorageIdx] = prev;
        player.inventory[source.idx] = targetItem;
        sound.playPickup();
        notifyChanged();
        return;
      }
    }

    // 2. Auto-stack or first empty slot
    if (!canAddWeightToStorage(srcItem)) return;
    if (!srcItem.isContainer && !srcItem.fluidStorage && srcItem.maxStack > 1) {
      for (let i = 0; i < totalStorageSlots; i++) {
        const st = storage.items[i];
        if (st && st.itemId === srcItem.itemId && st.count < st.maxStack) {
          const canAdd = Math.min(srcItem.count, st.maxStack - st.count);
          st.count += canAdd;
          srcItem.count -= canAdd;
          if (srcItem.count <= 0) {
            if (source.type === 'hand') takeItemFromHand(player, source.hand);
            else player.inventory[source.idx] = null as any;
            sound.playPickup();
            notifyChanged();
            return;
          }
        }
      }
    }

    let emptyIdx = -1;
    for (let i = 0; i < totalStorageSlots; i++) {
      if (!storage.items[i]) {
        emptyIdx = i;
        break;
      }
    }
    if (emptyIdx === -1) {
      notify(`В хранилище «${storageTitle}» нет свободных ячеек`, 'warning');
      return;
    }

    const taken =
      source.type === 'hand' ? takeItemFromHand(player, source.hand) : player.inventory[source.idx];
    if (!taken) return;
    if (source.type === 'inv') player.inventory[source.idx] = null as any;
    storage.items[emptyIdx] = taken;
    sound.playPickup();
    notifyChanged();
  };

  const takeStorageItemToPlayer = (
    storageIdx: number,
    target?: { type: 'hand'; hand: 'left' | 'right' } | { type: 'inv'; idx: number } | { type: 'auto' }
  ) => {
    syncFurnitureStorageThermodynamics(storage, Date.now() / 1000);

    const stItem = storage.items[storageIdx];
    if (!stItem) return;

    if (target?.type === 'hand') {
      const displaced = takeItemFromHand(player, target.hand);
      if (displaced && !canAddWeightToStorage(displaced, stItem)) {
        putItemInHand(player, target.hand, displaced, world);
        return;
      }
      const res = putItemInHand(player, target.hand, stItem, world);
      if (!res.success) {
        if (displaced) putItemInHand(player, target.hand, displaced, world);
        notify(res.message || 'Не удалось взять в руку', 'warning');
        return;
      }
      storage.items[storageIdx] = (displaced || null) as any;
      sound.playPickup();
      notifyChanged();
      return;
    }

    if (target?.type === 'inv') {
      const existing = player.inventory[target.idx];
      if (!existing) {
        const fit = canItemFitInCompartment(player, target.idx, stItem);
        if (!fit.fits) {
          notify(fit.reason || 'Не помещается в этот карман', 'warning');
          return;
        }
        player.inventory[target.idx] = stItem;
        storage.items[storageIdx] = null as any;
        sound.playPickup();
        notifyChanged();
        return;
      }

      if (
        existing.itemId === stItem.itemId &&
        existing.count < existing.maxStack &&
        !existing.isContainer &&
        !existing.fluidStorage
      ) {
        const canAdd = Math.min(stItem.count, existing.maxStack - existing.count);
        for (let c = 0; c < canAdd; c++) {
          const single = { ...stItem, count: 1 };
          if (!canItemFitInCompartment(player, target.idx, single).fits) break;
          existing.count += 1;
          stItem.count -= 1;
        }
        if (stItem.count <= 0) storage.items[storageIdx] = null as any;
        sound.playPickup();
        notifyChanged();
        return;
      }

      if (!canAddWeightToStorage(existing, stItem)) return;
      player.inventory[target.idx] = null as any;
      const fit = canItemFitInCompartment(player, target.idx, stItem);
      if (!fit.fits) {
        player.inventory[target.idx] = existing;
        notify(fit.reason || 'Не помещается в этот карман', 'warning');
        return;
      }
      player.inventory[target.idx] = stItem;
      storage.items[storageIdx] = existing;
      sound.playPickup();
      notifyChanged();
      return;
    }

    const added = addItemToPlayer(player, stItem);
    if (added) {
      storage.items[storageIdx] = null as any;
      sound.playPickup();
      notifyChanged();
    } else {
      notify('Нет места в карманах или руках', 'warning');
    }
  };

  const handleDropStorageItemToGround = (storageIdx: number) => {
    const stItem = storage.items[storageIdx];
    if (!stItem) return;
    storage.items[storageIdx] = null as any;
    if (world) {
      if (!world.groundItems) world.groundItems = [];
      world.groundItems.push({
        id: `ground_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        x: player.x + (Math.random() * 16 - 8),
        y: player.y + (Math.random() * 16 - 8),
        item: stItem,
        spawnTime: Date.now(),
      });
    }
    sound.playPickup();
    notify(`Выброшено на пол: ${stItem.nameRu}`, 'info');
    notifyChanged();
  };

  const handleUnifiedDrop = (targetKey: string, sourceKey: string) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;

    // 1. Storage slot <-> Storage slot
    if (sourceKey.startsWith('store:') && targetKey.startsWith('store:')) {
      const fromIdx = parseInt(sourceKey.replace('store:', ''), 10);
      const toIdx = parseInt(targetKey.replace('store:', ''), 10);
      if (isNaN(fromIdx) || isNaN(toIdx) || fromIdx === toIdx) return;
      const fromItem = storage.items[fromIdx];
      const toItem = storage.items[toIdx];
      if (!fromItem) return;

      if (
        toItem &&
        toItem.itemId === fromItem.itemId &&
        toItem.count < toItem.maxStack &&
        !toItem.isContainer &&
        !toItem.fluidStorage
      ) {
        const canAdd = Math.min(fromItem.count, toItem.maxStack - toItem.count);
        toItem.count += canAdd;
        fromItem.count -= canAdd;
        if (fromItem.count <= 0) storage.items[fromIdx] = null as any;
      } else {
        storage.items[toIdx] = fromItem;
        storage.items[fromIdx] = (toItem || null) as any;
      }
      sound.playPickup();
      forceRender(n => n + 1);
      return;
    }

    // 2. Player -> Storage
    if (
      (sourceKey === 'hand:left' || sourceKey === 'hand:right' || sourceKey.startsWith('inv:')) &&
      (targetKey.startsWith('store:') || targetKey === 'zone:storage')
    ) {
      const targetIdx = targetKey.startsWith('store:')
        ? parseInt(targetKey.replace('store:', ''), 10)
        : undefined;
      if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
        storePlayerItemIntoSlot(
          { type: 'hand', hand: sourceKey === 'hand:left' ? 'left' : 'right' },
          targetIdx
        );
      } else {
        const invIdx = parseInt(sourceKey.replace('inv:', ''), 10);
        if (!isNaN(invIdx)) storePlayerItemIntoSlot({ type: 'inv', idx: invIdx }, targetIdx);
      }
      return;
    }

    // 3. Storage -> Player
    if (sourceKey.startsWith('store:')) {
      const stIdx = parseInt(sourceKey.replace('store:', ''), 10);
      if (isNaN(stIdx)) return;
      if (targetKey === 'hand:left' || targetKey === 'hand:right') {
        takeStorageItemToPlayer(stIdx, {
          type: 'hand',
          hand: targetKey === 'hand:left' ? 'left' : 'right',
        });
        return;
      }
      if (targetKey.startsWith('inv:')) {
        const invIdx = parseInt(targetKey.replace('inv:', ''), 10);
        if (!isNaN(invIdx)) takeStorageItemToPlayer(stIdx, { type: 'inv', idx: invIdx });
        return;
      }
      if (targetKey === 'zone:player') {
        takeStorageItemToPlayer(stIdx, { type: 'auto' });
        return;
      }
    }

    // 4. Player internal moves (Pocket <-> Pocket, Pocket <-> Hand, Hand <-> Hand)
    if (sourceKey.startsWith('inv:') && targetKey.startsWith('inv:')) {
      const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
      const toIdx = parseInt(targetKey.replace('inv:', ''), 10);
      if (isNaN(fromIdx) || isNaN(toIdx) || fromIdx === toIdx) return;
      const fromItem = player.inventory[fromIdx];
      const toItem = player.inventory[toIdx];
      if (!fromItem) return;
      if (!toItem) {
        if (canItemFitInCompartment(player, toIdx, fromItem).fits) {
          player.inventory[toIdx] = fromItem;
          player.inventory[fromIdx] = null as any;
          sound.playPickup();
          forceRender(n => n + 1);
        }
      } else {
        player.inventory[fromIdx] = null as any;
        player.inventory[toIdx] = null as any;
        if (
          canItemFitInCompartment(player, toIdx, fromItem).fits &&
          canItemFitInCompartment(player, fromIdx, toItem).fits
        ) {
          player.inventory[toIdx] = fromItem;
          player.inventory[fromIdx] = toItem;
          sound.playPickup();
          forceRender(n => n + 1);
        } else {
          player.inventory[fromIdx] = fromItem;
          player.inventory[toIdx] = toItem;
        }
      }
      return;
    }

    if (sourceKey.startsWith('inv:') && (targetKey === 'hand:left' || targetKey === 'hand:right')) {
      const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
      const hand = targetKey === 'hand:left' ? 'left' : 'right';
      const item = player.inventory[fromIdx];
      if (!item) return;
      const displaced = takeItemFromHand(player, hand);
      const res = putItemInHand(player, hand, item, world);
      if (res.success) {
        player.inventory[fromIdx] = (displaced || null) as any;
        sound.playPickup();
        forceRender(n => n + 1);
      } else if (displaced) {
        putItemInHand(player, hand, displaced, world);
      }
      return;
    }

    if ((sourceKey === 'hand:left' || sourceKey === 'hand:right') && targetKey.startsWith('inv:')) {
      const hand = sourceKey === 'hand:left' ? 'left' : 'right';
      const toIdx = parseInt(targetKey.replace('inv:', ''), 10);
      const handItem = takeItemFromHand(player, hand);
      if (!handItem) return;
      const existing = player.inventory[toIdx];
      player.inventory[toIdx] = null as any;
      if (canItemFitInCompartment(player, toIdx, handItem).fits) {
        player.inventory[toIdx] = handItem;
        if (existing) putItemInHand(player, hand, existing, world);
        sound.playPickup();
        forceRender(n => n + 1);
      } else {
        player.inventory[toIdx] = existing;
        putItemInHand(player, hand, handItem, world);
      }
      return;
    }

    if (
      (sourceKey === 'hand:left' || sourceKey === 'hand:right') &&
      (targetKey === 'hand:left' || targetKey === 'hand:right')
    ) {
      const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
      const tgtHand = targetKey === 'hand:left' ? 'left' : 'right';
      const a = takeItemFromHand(player, srcHand);
      if (!a) return;
      const b = takeItemFromHand(player, tgtHand);
      putItemInHand(player, tgtHand, a, world);
      if (b) putItemInHand(player, srcHand, b, world);
      sound.playPickup();
      forceRender(n => n + 1);
    }
  };

  dropHandlerRef.current = handleUnifiedDrop;

  const handleSlotShiftClick = (slotKey: string) => {
    setCtxMenu(null);
    if (slotKey.startsWith('store:')) {
      const stIdx = parseInt(slotKey.replace('store:', ''), 10);
      if (!isNaN(stIdx) && storage.items[stIdx]) {
        takeStorageItemToPlayer(stIdx, { type: 'auto' });
      }
      return;
    }
    if (slotKey === 'hand:left' || slotKey === 'hand:right') {
      const hand = slotKey === 'hand:left' ? 'left' : 'right';
      storePlayerItemIntoSlot({ type: 'hand', hand });
      return;
    }
    if (slotKey.startsWith('inv:')) {
      const invIdx = parseInt(slotKey.replace('inv:', ''), 10);
      if (!isNaN(invIdx) && player.inventory[invIdx]) {
        storePlayerItemIntoSlot({ type: 'inv', idx: invIdx });
      }
    }
  };

  const handleSlotContextMenu = (
    e: React.MouseEvent<HTMLElement>,
    slotKey: string,
    item: InventoryItem | null | undefined
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item) {
      setCtxMenu(null);
      return;
    }
    const maxX = typeof window !== 'undefined' ? window.innerWidth - 210 : e.clientX;
    const maxY = typeof window !== 'undefined' ? window.innerHeight - 200 : e.clientY;
    setCtxMenu({
      x: Math.max(8, Math.min(e.clientX, maxX)),
      y: Math.max(8, Math.min(e.clientY, maxY)),
      slotKey,
      item,
    });
  };

  const { dragUi, ghostRef, startSlotDrag } = useCachedSlotDrag<InventoryItem>({
    rootRef: gmRef,
    slotAttr: 'data-st-slot',
    zoneAttr: 'data-st-zone',
    onDrop: (targetKey, sourceKey) => {
      dropHandlerRef.current?.(targetKey, sourceKey);
      setSelectedKey(null);
    },
  });

  const startPointerDrag = (
    e: React.PointerEvent<HTMLElement>,
    slotKey: string,
    item: InventoryItem | null | undefined
  ) => {
    setCtxMenu(null);
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

  const renderSlotSquare = (
    slotKey: string,
    item: InventoryItem | null | undefined,
    options?: {
      badge?: string;
      emptyIcon?: React.ReactNode;
      dimmed?: boolean;
      onDoubleClick?: () => void;
    }
  ) => {
    const isDragging = dragUi?.sourceKey === slotKey;
    const isOver = dragUi?.overKey === slotKey;
    const isSelected = selectedKey === slotKey;
    const info = getSlotFillInfo(item);
    const temp = item?.surfaceTemperature;
    const isHot = temp !== undefined && temp >= 40;
    const isCold = temp !== undefined && temp <= 4;
    const pkgInner = getPackagedInnerItem(item);
    const isTrash = isDisposableTrashOrEmptyPackaging(item);

    return (
      <div
        key={slotKey}
        data-st-slot={slotKey}
        draggable={false}
        onDragStart={e => e.preventDefault()}
        onContextMenu={e => handleSlotContextMenu(e, slotKey, item)}
        onPointerDown={e => startPointerDrag(e, slotKey, item)}
        onDoubleClick={options?.onDoubleClick}
        className={
          'kf-slot' +
          (!item ? ' empty' : '') +
          (isOver || isSelected ? ' on' : '') +
          (isHot ? ' hot' : '') +
          (isCold ? ' cold' : '') +
          (options?.dimmed ? ' dim' : '') +
          (isTrash ? ' is-trash' : '')
        }
        style={{
          cursor: item ? 'grab' : selectedKey ? 'pointer' : 'default',
          opacity: isDragging ? 0.35 : undefined,
        }}
        title={info?.tooltip}
      >
        {options?.badge && <span className="kf-badge">{options.badge}</span>}
        {item ? (
          <>
            <ItemIconCanvas itemId={item.itemId} item={item} size={42} />
            {pkgInner && (
              <span className="kf-pkg-sub" title={pkgInner.nameRu}>
                <ItemIconCanvas itemId={pkgInner.itemId} item={pkgInner} size={18} />
              </span>
            )}
            {item.count > 1 ? (
              <span className="kf-cnt">{item.count}</span>
            ) : item.isContainer && !pkgInner ? (
              <span className="kf-cnt">{item.contents?.length || 0}</span>
            ) : null}
            {isHot && <span className="kf-temp" style={{ color: '#f0884a' }}>+{Math.round(temp!)}°</span>}
            {isCold && <span className="kf-temp cold">{Math.round(temp!)}°</span>}
            {(item.wetness ?? 0) > 0 && (
              <span className="kf-wet-badge">
                <CloudRain width={11} height={11} />
              </span>
            )}
            {info && info.pct !== null && (
              <div className="kf-fill">
                <i style={{ width: `${info.pct}%`, background: info.color || undefined }} />
              </div>
            )}
          </>
        ) : (
          options?.emptyIcon || null
        )}
      </div>
    );
  };

  const getCompIcon = (type: string) => {
    if (type === 'user') return <User width={14} height={14} />;
    if (type === 'shirt') return <Shirt width={14} height={14} />;
    if (type === 'pants')
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3h12l1 18-5-1-2-9-2 9-5 1z" />
        </svg>
      );
    return <Luggage width={14} height={14} />;
  };

  // Resolve currently selected item for quick footer action bar
  const selectedItemInfo = (() => {
    if (!selectedKey) return null;
    if (selectedKey.startsWith('store:')) {
      const idx = parseInt(selectedKey.replace('store:', ''), 10);
      const it = storage.items[idx];
      return it ? { side: 'storage' as const, idx, item: it } : null;
    }
    if (selectedKey === 'hand:left' || selectedKey === 'hand:right') {
      const hand = selectedKey === 'hand:left' ? ('left' as const) : ('right' as const);
      const it = hand === 'left' ? player.leftHandItem : player.rightHandItem;
      return it ? { side: 'hand' as const, hand, item: it } : null;
    }
    if (selectedKey.startsWith('inv:')) {
      const idx = parseInt(selectedKey.replace('inv:', ''), 10);
      const it = player.inventory[idx];
      return it ? { side: 'inv' as const, idx, item: it } : null;
    }
    return null;
  })();

  const handsCount = (player.leftHandItem ? 1 : 0) + (player.rightHandItem ? 1 : 0);
  const storageTrashCount = countDisposableTrashInList(storage.items);
  const matchingCount = countTransferCandidates(player, storage, 'matching');
  const suitableCount = countTransferCandidates(player, storage, 'suitable');
  const carryBags = findCarryBagsWithItems(player);
  const carryBagsTotalItems = carryBags.reduce((s, b) => s + b.itemCount, 0);
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
    { id: 'trash', label: 'Мусор', count: storageTrashCount > 0 ? storageTrashCount : undefined },
  ];

  return (
    <ShadowHost zIndex={55} css={kitchenFurnitureCss}>
      <div id="w" ref={wrapRef} onClick={() => setCtxMenu(null)}>
        <div
          className="gm"
          ref={gmRef}
          onClick={e => {
            e.stopPropagation();
            setCtxMenu(null);
          }}
        >
          <div className="kf-bg" />

          {/* Top Bar */}
          <header className="top">
            <div className="top-l">
              {isFridge ? (
                <Snowflake width={22} height={22} color="#7dd3fc" style={{ flex: 'none' }} />
              ) : isRadiator ? (
                <Flame width={22} height={22} color="#f0884a" style={{ flex: 'none' }} />
              ) : (
                <Archive width={22} height={22} color="#c9922b" style={{ flex: 'none' }} />
              )}

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
                  <button
                    type="button"
                    className="btn btn-p btn-xs"
                    onClick={handleSaveLabel}
                    title="Сохранить подпись"
                  >
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
                  <div className="cn ttl" title={storageTitle}>{storageTitle}</div>
                  <button
                    type="button"
                    id="btn-edit-storage-label"
                    className="kf-label-btn"
                    onClick={() => {
                      setLabelDraft(storage.userLabel || '');
                      setIsEditingLabel(true);
                    }}
                    title={savedLabel ? 'Изменить подпись наклейки' : 'Подписать хранилище наклейкой'}
                    aria-label="Подписать хранилище"
                  >
                    <Pencil width={14} height={14} />
                  </button>
                  <span className="sub-top">
                    {savedLabel
                      ? baseStorageTitle
                      : isFridge
                      ? 'Холодильная камера +4°C'
                      : isRadiator
                      ? 'Сушка вещей +65°C'
                      : 'Мебельное хранилище'}
                  </span>
                </>
              )}
            </div>

            <div className="top-r">
              <div className="chip mono">
                <span>Слоты</span>
                <b>{usedStorageSlots}/{totalStorageSlots}</b>
              </div>
              <div className="chip mono">
                <span>Вес</span>
                <b>{usedWeight}/{maxWeightKg} кг</b>
              </div>
              <button
                type="button"
                id="btn-close-furniture-storage"
                className="chip back"
                onClick={onClose}
                aria-label="Закрыть"
                title="Закрыть (Esc)"
              >
                <X width={19} height={19} />
              </button>
            </div>
          </header>

          {/* Main 2-column stage */}
          <div className="kf-body kf-body-notab">
            <div className="kf-split">
              {/* LEFT: STORAGE */}
              <section
                className="panel kf-col"
                data-st-zone="zone:storage"
                style={{
                  borderColor: dragUi?.overKey === 'zone:storage' ? '#e0ab45' : undefined,
                }}
              >
                <div className="kf-col-head">
                  <div className="kf-col-title">
                    {savedLabel ? (
                      <Tag width={15} height={15} color="#e0ab45" />
                    ) : isFridge ? (
                      <Snowflake width={16} height={16} color="#7dd3fc" />
                    ) : (
                      <Archive width={16} height={16} color="#e0ab45" />
                    )}
                    <span>{storageTitle}</span>
                  </div>
                  <span className="kf-col-meta mono">
                    {usedStorageSlots} предм. · {formatWeightRu(usedWeight)} / {formatWeightRu(maxWeightKg)}
                  </span>
                </div>

                {/* Single-row Search + Filter Chips + Grid/List Toggle */}
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
                </div>

                {/* Single-row Ergonomic Organization Actions */}
                <div className="kf-act-row">
                  <button
                    type="button"
                    id="btn-storage-organize"
                    className="kf-act-btn"
                    disabled={usedStorageSlots === 0}
                    onClick={handleOrganizeStorage}
                    title="Разложить по группам, объединить одинаковые стопки и убрать пустые промежутки"
                  >
                    <ArrowUpDown width={13} height={13} color="#e0ab45" />
                    <span>Порядок</span>
                  </button>

                  <button
                    type="button"
                    id="btn-storage-quick-matching"
                    className="kf-act-btn"
                    disabled={matchingCount === 0}
                    onClick={() => handleQuickTransfer('matching')}
                    title="Доложить из карманов предметы, которые уже есть в этом хранилище"
                  >
                    <CopyPlus width={13} height={13} />
                    <span>Похожее</span>
                    {matchingCount > 0 && <span className="kf-act-n">{matchingCount}</span>}
                  </button>

                  <button
                    type="button"
                    id="btn-storage-quick-suitable"
                    className="kf-act-btn"
                    disabled={suitableCount === 0}
                    onClick={() => handleQuickTransfer('suitable')}
                    title={`Сложить подходящие предметы в «${baseStorageTitle}»`}
                  >
                    <FolderInput width={13} height={13} />
                    <span>{suitableLabel}</span>
                    {suitableCount > 0 && <span className="kf-act-n">{suitableCount}</span>}
                  </button>

                  {carryBagsTotalItems > 0 && (
                    <button
                      type="button"
                      id="btn-storage-unload-bags"
                      className="kf-act-btn accent"
                      onClick={() => handleQuickTransfer('unload_bags')}
                      title={`Выгрузить содержимое из «${carryBags[0].bag.nameRu}» на полки`}
                    >
                      <ShoppingBag width={13} height={13} />
                      <span>Выгрузить пакет</span>
                      <span className="kf-act-n">{carryBagsTotalItems}</span>
                    </button>
                  )}

                  {storageTrashCount > 0 && (
                    <button
                      type="button"
                      id="btn-storage-sweep-trash"
                      className="kf-act-btn danger"
                      onClick={handleSweepStorageTrash}
                      title="Убрать пустые бумажные упаковки, обёртки и испорченные остатки"
                    >
                      <Trash2 width={13} height={13} />
                      <span>Убрать мусор</span>
                      <span className="kf-act-n">{storageTrashCount}</span>
                    </button>
                  )}
                </div>

                {/* Scrollable Storage Grid or List */}
                <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                  {viewMode === 'grid' ? (
                    <div className="kf-slots">
                      {Array.from({ length: totalStorageSlots }).map((_, idx) => {
                        const stItem = storage.items[idx];
                        const dimmed = Boolean(
                          stItem && hasActiveFilter && !itemMatchesStorageFilter(stItem, filterCat, searchQuery)
                        );
                        return renderSlotSquare(`store:${idx}`, stItem, {
                          dimmed,
                          onDoubleClick: stItem
                            ? () => takeStorageItemToPlayer(idx, { type: 'auto' })
                            : undefined,
                        });
                      })}
                    </div>
                  ) : filteredListEntries.length > 0 ? (
                    <div className="kf-list">
                      {filteredListEntries.map(({ item: stItem, idx }) => {
                        const slotKey = `store:${idx}`;
                        const isSel = selectedKey === slotKey;
                        const pkgInner = getPackagedInnerItem(stItem);
                        const grp = getItemLogicalGroup(stItem);
                        const isTrash = isDisposableTrashOrEmptyPackaging(stItem);
                        const temp = stItem.surfaceTemperature ?? stItem.temperature;
                        const tempText =
                          temp !== undefined && (temp >= 38 || temp <= 6)
                            ? ` · ${temp > 0 ? '+' : ''}${Math.round(temp)}°C`
                            : '';

                        return (
                          <div
                            key={slotKey}
                            className={'kf-list-row' + (isSel ? ' on' : '') + (isTrash ? ' is-trash' : '')}
                            onClick={() => setSelectedKey(slotKey)}
                            onDoubleClick={() => takeStorageItemToPlayer(idx, { type: 'auto' })}
                            onContextMenu={e => handleSlotContextMenu(e, slotKey, stItem)}
                          >
                            <div className="kf-list-ic">
                              <ItemIconCanvas itemId={stItem.itemId} item={stItem} size={26} />
                              {pkgInner && (
                                <span className="kf-pkg-sub">
                                  <ItemIconCanvas itemId={pkgInner.itemId} item={pkgInner} size={13} />
                                </span>
                              )}
                            </div>
                            <div className="kf-list-info">
                              <div className="kf-list-name">{getItemReadableTitleRu(stItem)}</div>
                              <div className="kf-list-sub">
                                {grp.labelRu}{tempText}
                              </div>
                            </div>
                            <div className="kf-list-meta">
                              {stItem.count > 1 && <span>×{stItem.count}</span>}
                              <span>{formatWeightRu(getItemTotalWeight(stItem))}</span>
                              <button
                                type="button"
                                className="btn btn-s btn-xs"
                                onClick={e => {
                                  e.stopPropagation();
                                  takeStorageItemToPlayer(idx, { type: 'auto' });
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
                      {usedStorageSlots === 0
                        ? 'В этом хранилище пока пусто'
                        : 'По текущему фильтру предметы не найдены'}
                    </div>
                  )}
                </div>

                {selectedItemInfo && (
                  <div className="kf-foot-bar">
                    <div className="kf-foot-item">
                      <ItemIconCanvas itemId={selectedItemInfo.item.itemId} item={selectedItemInfo.item} size={28} />
                      <div style={{ minWidth: 0 }}>
                        <div className="kf-foot-name">
                          {getItemReadableTitleRu(selectedItemInfo.item)}
                        </div>
                        <div className="kf-foot-sub">
                          {selectedItemInfo.item.count} шт. · {formatWeightRu(getItemTotalWeight(selectedItemInfo.item))}
                        </div>
                      </div>
                    </div>
                    <div className="kf-foot-acts">
                      {selectedItemInfo.side === 'storage' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-p btn-xs"
                            onClick={() => {
                              takeStorageItemToPlayer(selectedItemInfo.idx, { type: 'auto' });
                              setSelectedKey(null);
                            }}
                          >
                            <ArrowRight width={13} height={13} />
                            <span>Забрать</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-d btn-xs"
                            onClick={() => {
                              handleDropStorageItemToGround(selectedItemInfo.idx);
                              setSelectedKey(null);
                            }}
                            title="Выбросить на пол"
                          >
                            <Trash2 width={13} height={13} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-p btn-xs"
                          onClick={() => {
                            if (selectedItemInfo.side === 'hand') {
                              storePlayerItemIntoSlot({ type: 'hand', hand: selectedItemInfo.hand });
                            } else {
                              storePlayerItemIntoSlot({ type: 'inv', idx: selectedItemInfo.idx });
                            }
                            setSelectedKey(null);
                          }}
                        >
                          <ArrowLeft width={13} height={13} />
                          <span>Положить</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* RIGHT: PLAYER HANDS & POCKETS */}
              <section
                className="panel kf-col"
                data-st-zone="zone:player"
                style={{
                  borderColor: dragUi?.overKey === 'zone:player' ? '#e0ab45' : undefined,
                }}
              >
                <div className="kf-col-head">
                  <div className="kf-col-title">
                    <Package width={16} height={16} color="#9ac985" />
                    <span>Снаряжение игрока</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      id="btn-player-organize-in-storage"
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
                  <div className="kf-group">
                    <div className="kf-group-h">
                      <span className="kf-group-t">
                        <Hand width={14} height={14} />
                        Активные руки
                      </span>
                      <span className="kf-group-meta mono">{handsCount}/2</span>
                    </div>
                    <div className="kf-slots">
                      {renderSlotSquare('hand:left', player.leftHandItem, {
                        badge: 'Л',
                        emptyIcon: <Hand width={18} height={18} color="#5e5b54" />,
                        onDoubleClick: player.leftHandItem
                          ? () => storePlayerItemIntoSlot({ type: 'hand', hand: 'left' })
                          : undefined,
                      })}
                      {renderSlotSquare('hand:right', player.rightHandItem, {
                        badge: 'П',
                        emptyIcon: <Hand width={18} height={18} color="#5e5b54" />,
                        onDoubleClick: player.rightHandItem
                          ? () => storePlayerItemIntoSlot({ type: 'hand', hand: 'right' })
                          : undefined,
                      })}
                    </div>
                  </div>

                  {compartments.map(comp => {
                    const slots = Array.from({ length: comp.slotCount }, (_, i) => comp.startIndex + i);
                    return (
                      <div key={comp.id} className="kf-group">
                        <div className="kf-group-h">
                          <span className="kf-group-t">
                            {getCompIcon(comp.iconType)}
                            {comp.nameRu}
                          </span>
                          <span className="kf-group-meta mono">
                            {comp.usedVolumeL}/{comp.capacityL} л · {comp.usedWeightKg}/{comp.maxWeightKg} кг
                          </span>
                        </div>
                        <div className="kf-slots">
                          {slots.map(slotIdx => {
                            const item = inventory[slotIdx];
                            return renderSlotSquare(`inv:${slotIdx}`, item, {
                              badge: slotIdx < 6 ? String(slotIdx + 1) : undefined,
                              onDoubleClick: item
                                ? () => storePlayerItemIntoSlot({ type: 'inv', idx: slotIdx })
                                : undefined,
                            });
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>

          {toastMsg && <div className="kf-toast">{toastMsg}</div>}

          {/* Bottom hint bar */}
          <div className="hint">
            <div className="hint-g">
              <span className="key">Esc</span>
              <span>Закрыть</span>
              <span className="key">Shift+Клик</span>
              <span>Быстрый перенос</span>
              <span className="key">ПКМ</span>
              <span>Меню</span>
              <span className="key">2× Клик</span>
              <span>Положить / Забрать</span>
            </div>
            <div className="hint-r">
              Лев: <strong style={{ color: '#e9e6df' }}>{player.leftHandItem ? getItemReadableTitleRu(player.leftHandItem) : 'Свободна'}</strong>
              {' · '}
              Прав: <strong style={{ color: '#e9e6df' }}>{player.rightHandItem ? getItemReadableTitleRu(player.rightHandItem) : 'Свободна'}</strong>
            </div>
          </div>
        </div>

        {/* Floating drag ghost outside .gm */}
        <div ref={ghostRef} className="kf-drag-ghost">
          {dragUi && (
            <ItemIconCanvas itemId={dragUi.item.itemId} item={dragUi.item} size={44} />
          )}
        </div>

        {/* Right-click context menu */}
        {ctxMenu && (
          <div
            className="kf-ctx-menu"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <div className="kf-ctx-head">{ctxMenu.item.nameRu}</div>
            {ctxMenu.slotKey.startsWith('store:') && (() => {
              const stIdx = parseInt(ctxMenu.slotKey.replace('store:', ''), 10);
              return (
                <>
                  <button
                    type="button"
                    className="kf-ctx-item primary"
                    onClick={() => {
                      setCtxMenu(null);
                      takeStorageItemToPlayer(stIdx, { type: 'auto' });
                    }}
                  >
                    <Package width={14} height={14} />
                    <span>Забрать в карман</span>
                  </button>
                  <button
                    type="button"
                    className="kf-ctx-item"
                    onClick={() => {
                      setCtxMenu(null);
                      takeStorageItemToPlayer(stIdx, { type: 'hand', hand: 'right' });
                    }}
                  >
                    <Hand width={14} height={14} />
                    <span>В правую руку</span>
                  </button>
                  <button
                    type="button"
                    className="kf-ctx-item"
                    onClick={() => {
                      setCtxMenu(null);
                      takeStorageItemToPlayer(stIdx, { type: 'hand', hand: 'left' });
                    }}
                  >
                    <Hand width={14} height={14} />
                    <span>В левую руку</span>
                  </button>
                  <button
                    type="button"
                    className="kf-ctx-item danger"
                    onClick={() => {
                      setCtxMenu(null);
                      handleDropStorageItemToGround(stIdx);
                    }}
                  >
                    <Trash2 width={14} height={14} />
                    <span>Выбросить на пол</span>
                  </button>
                </>
              );
            })()}
            {(ctxMenu.slotKey === 'hand:left' || ctxMenu.slotKey === 'hand:right') && (() => {
              const hand = ctxMenu.slotKey === 'hand:left' ? 'left' : 'right';
              return (
                <button
                  type="button"
                  className="kf-ctx-item primary"
                  onClick={() => {
                    setCtxMenu(null);
                    storePlayerItemIntoSlot({ type: 'hand', hand });
                  }}
                >
                  <Archive width={14} height={14} />
                  <span>Положить в {storageTitle}</span>
                </button>
              );
            })()}
            {ctxMenu.slotKey.startsWith('inv:') && (() => {
              const invIdx = parseInt(ctxMenu.slotKey.replace('inv:', ''), 10);
              return (
                <button
                  type="button"
                  className="kf-ctx-item primary"
                  onClick={() => {
                    setCtxMenu(null);
                    storePlayerItemIntoSlot({ type: 'inv', idx: invIdx });
                  }}
                >
                  <Archive width={14} height={14} />
                  <span>Положить в {storageTitle}</span>
                </button>
              );
            })()}
          </div>
        )}
      </div>
    </ShadowHost>
  );
};

export const FurnitureStorageModal: React.FC<FurnitureStorageModalProps> = React.memo(({
  isOpen,
  onClose,
  player,
  world,
  storage: propStorage,
  storageId,
  customTitle,
  onInventoryUpdated,
  onVitalsChange,
  onNotify,
}) => {
  if (!isOpen || !player) return null;
  const resolvedStorage =
    propStorage || (storageId && (world as any)?.furnitureStorages?.[storageId]) || null;
  if (!resolvedStorage) return null;
  return (
    <FurnitureStorageContent
      player={player}
      world={world || null}
      storage={resolvedStorage}
      customTitle={customTitle}
      onClose={onClose}
      onInventoryUpdated={onInventoryUpdated}
      onVitalsChange={onVitalsChange}
      onNotify={onNotify}
    />
  );
});

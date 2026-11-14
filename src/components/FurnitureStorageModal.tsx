import React, { useState, useEffect } from 'react';
import { Player, InventoryItem, ItemCategory, GameWorld } from '../types';
import {
  FurnitureStorage,
  FURNITURE_STORAGE_CONFIGS,
  getFurnitureStorage,
  getFurnitureStorageTotalWeight,
  getFurnitureStorageTotalVolume,
  addItemToFurnitureStorage,
  removeItemFromFurnitureStorage,
  canItemFitInFurniture
} from '../furnitureStorageSystem';
import { syncFurnitureStorageThermodynamics } from '../itemThermalSystem';
import {
  addItemToPlayer,
  removeItemFromPlayer,
  moveInventoryItem,
  canItemFitInCompartment,
  canItemFitInContainer,
  addItemToContainer,
  stowItemFromHandToPockets,
  getPlayerPocketCapacity,
  getPlayerTotalCarriedWeight,
  getItemTotalWeight,
  getItemTotalVolume,
  getPlayerCompartments,
  putItemInHand,
  takeItemFromHand,
  addPlayerNotification
} from '../items';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ModalShell } from './gameUi';
import { sound } from '../audio';
import {
  Snowflake,
  ArrowRight,
  ArrowLeft,
  Hand,
  Info,
  Flame,
  CloudRain,
  User,
  Shirt,
  Luggage
} from 'lucide-react';

function formatWeightRu(weightKg: number): string {
  if (!weightKg || weightKg <= 0) return '0 г';
  if (weightKg < 1) {
    const grams = weightKg < 0.01 ? Number((weightKg * 1000).toFixed(1)) : Math.round(weightKg * 1000);
    return `${grams} г`;
  }
  return `${Number(weightKg.toFixed(2))} кг`;
}

interface FurnitureStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage?: FurnitureStorage | null;
  player: Player | null;
  world?: GameWorld | null;
  onVitalsChange?: () => void;
  onInventoryUpdated?: () => void;
  buildingId?: string;
  floor?: number;
  furnitureIndex?: number;
  furnitureType?: string;
  aptId?: string;
  customTitle?: string;
}

export const FurnitureStorageModal: React.FC<FurnitureStorageModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    player,
    world,
    onVitalsChange,
    onInventoryUpdated
  } = props;

  const storage: FurnitureStorage | null =
    props.storage ||
    (props.buildingId && props.furnitureType
      ? getFurnitureStorage(
          props.buildingId,
          props.floor ?? 0,
          props.furnitureIndex ?? 0,
          props.furnitureType,
          props.aptId,
          props.customTitle
        )
      : null);

  const [selectedStorageIdx, setSelectedStorageIdx] = useState<number | null>(0);
  const [selectedInventoryIdx, setSelectedInventoryIdx] = useState<number | null>(null);
  const [selectedHand, setSelectedHand] = useState<'left' | 'right' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, forceRender] = useState(0);
  const [selectedStSlot, setSelectedStSlot] = useState<string | null>(null);
  const [stDragUi, setStDragUi] = useState<{
    sourceKey: string;
    item: InventoryItem;
    x: number;
    y: number;
    overKey: string | null;
  } | null>(null);
  const stDragRef = React.useRef<{
    sourceKey: string;
    item: InventoryItem;
    startX: number;
    startY: number;
    x: number;
    y: number;
    active: boolean;
    overKey: string | null;
  } | null>(null);
  const stDropHandlerRef = React.useRef<((targetKey: string, sourceKey: string) => void) | null>(null);

  useEffect(() => {
    if (!isOpen || !storage) return;
    const interval = setInterval(() => {
      syncFurnitureStorageThermodynamics(storage);
      forceRender(n => n + 1);
    }, 800);
    return () => clearInterval(interval);
  }, [isOpen, storage]);

  if (!isOpen || !storage || !player) return null;

  const cfg = FURNITURE_STORAGE_CONFIGS[storage.furnitureType] || FURNITURE_STORAGE_CONFIGS.wardrobe;
  const isRadiator = storage.furnitureType === 'radiator';
  const isHotSurface = !!cfg.isHot || isRadiator;
  const storageTotalVol = getFurnitureStorageTotalVolume(storage);
  const storageTotalWt = getFurnitureStorageTotalWeight(storage);

  const volPercent = Math.min(100, Math.round((storageTotalVol / cfg.capacityL) * 100));
  const wtPercent = Math.min(100, Math.round((storageTotalWt / cfg.maxWeightKg) * 100));

  const playerCarriedWt = getPlayerTotalCarriedWeight(player);
  const playerPocketCap = getPlayerPocketCapacity(player);

  const notifyChange = () => {
    forceRender(n => n + 1);
    if (onVitalsChange) onVitalsChange();
    if (onInventoryUpdated) onInventoryUpdated();
  };

  // Transfer item from player inventory into furniture storage
  const handleStoreItem = (itemIdx: number, countToTransfer?: number) => {
    setErrorMessage(null);
    if (!player.inventory || itemIdx < 0 || itemIdx >= player.inventory.length) return;
    const invItem = player.inventory[itemIdx];
    if (!invItem) return;

    const count = countToTransfer ?? invItem.count;
    const testItem = { ...invItem, count };
    const check = canItemFitInFurniture(storage, testItem);
    if (!check.fits) {
      setErrorMessage(check.reason || 'Предмет не помещается в хранилище');
      sound.playUseItem();
      return;
    }

    const removed = removeItemFromPlayer(player, itemIdx, count);
    if (!removed) return;

    addItemToFurnitureStorage(storage, removed, count);
    if (!player.inventory[itemIdx]) {
      setSelectedInventoryIdx(null);
    }
    sound.playPickup();
    addPlayerNotification(player, `Помещено ${isRadiator ? 'на батарею' : `в ${cfg.nameRu}`}: ${removed.nameRu} (×${removed.count})`, 'pickup');
    notifyChange();
  };

  // Store item directly from left or right hand
  const handleStoreFromHand = (hand: 'left' | 'right') => {
    setErrorMessage(null);
    const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!handItem) return;

    const check = canItemFitInFurniture(storage, handItem);
    if (!check.fits) {
      setErrorMessage(check.reason || 'Предмет не помещается в хранилище');
      sound.playUseItem();
      return;
    }

    const taken = takeItemFromHand(player, hand);
    if (!taken) return;

    addItemToFurnitureStorage(storage, taken, taken.count);
    setSelectedHand(null);
    sound.playPickup();
    addPlayerNotification(player, `Помещено ${isRadiator ? 'на батарею' : `в ${cfg.nameRu}`}: ${taken.nameRu}`, 'pickup');
    notifyChange();
  };

  // Take item from furniture storage into player pockets (optionally targeting a specific slot)
  const handleTakeItem = (storageIdx: number, countToTake?: number, exactPocketSlotIdx?: number) => {
    setErrorMessage(null);
    if (!storage.items || storageIdx < 0 || storageIdx >= storage.items.length) return;
    const targetItem = storage.items[storageIdx];
    if (!targetItem) return;

    const count = countToTake ?? targetItem.count;

    // If user dropped onto a specific pocket slot
    if (exactPocketSlotIdx !== undefined && exactPocketSlotIdx >= 0) {
      if (!player.inventory) player.inventory = [];
      const existing = player.inventory[exactPocketSlotIdx];

      // If existing slot holds a container that can accept the storage item
      if (
        existing &&
        existing.isContainer &&
        !existing.singleUseContainer &&
        canItemFitInContainer(existing, { ...targetItem, count }).fits
      ) {
        const removed = removeItemFromFurnitureStorage(storage, storageIdx, count);
        if (removed) {
          const cRes = addItemToContainer(existing, removed);
          if (cRes.success) {
            sound.playPickup();
            addPlayerNotification(player, cRes.message, 'pickup');
            notifyChange();
            return;
          } else {
            storage.items.splice(Math.min(storageIdx, storage.items.length), 0, removed);
          }
        }
      }

      const fit = canItemFitInCompartment(player, exactPocketSlotIdx, { ...targetItem, count }, {
        ignoreSlotIdx: existing ? exactPocketSlotIdx : undefined,
      });
      if (!fit.fits) {
        setErrorMessage(fit.reason || 'Предмет не помещается в этот отсек карманов');
        sound.playUseItem();
        return;
      }

      if (!existing) {
        const removed = removeItemFromFurnitureStorage(storage, storageIdx, count);
        if (removed) {
          player.inventory[exactPocketSlotIdx] = removed;
          sound.playPickup();
          addPlayerNotification(player, `Взято ${isRadiator ? 'с батареи' : `из ${cfg.nameRu}`}: ${removed.nameRu}`, 'pickup');
          notifyChange();
          return;
        }
      } else if (canItemFitInFurniture(storage, existing).fits) {
        // Swap storage item with existing pocket slot item
        const removed = removeItemFromFurnitureStorage(storage, storageIdx, count);
        if (removed) {
          player.inventory[exactPocketSlotIdx] = removed;
          addItemToFurnitureStorage(storage, existing, existing.count);
          sound.playPickup();
          notifyChange();
          return;
        }
      }
    }

    const removed = removeItemFromFurnitureStorage(storage, storageIdx, count);
    if (!removed) return;

    const added = addItemToPlayer(player, removed, { preferPockets: true, skipHands: true });
    if (!added) {
      storage.items.splice(Math.min(storageIdx, storage.items.length), 0, removed);
      setErrorMessage('В карманах недостаточно места — перетащите предмет в слот руки');
      sound.playUseItem();
      return;
    }

    if (storage.items.length === 0) {
      setSelectedStorageIdx(null);
    } else if (storageIdx >= storage.items.length) {
      setSelectedStorageIdx(storage.items.length - 1);
    }

    sound.playPickup();
    addPlayerNotification(player, `Взято ${isRadiator ? 'с батареи' : `из ${cfg.nameRu}`}: ${removed.nameRu} (×${removed.count})`, 'pickup');
    notifyChange();
  };

  // Take item directly to hand (or swap with hand if occupied)
  const handleTakeToHand = (storageIdx: number, hand: 'left' | 'right') => {
    setErrorMessage(null);
    if (!storage.items || storageIdx < 0 || storageIdx >= storage.items.length) return;
    const targetItem = storage.items[storageIdx];
    if (!targetItem) return;

    const currentHandItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (currentHandItem) {
      if (canItemFitInFurniture(storage, currentHandItem).fits) {
        const countToTake = targetItem.count > 1 ? 1 : targetItem.count;
        const removed = removeItemFromFurnitureStorage(storage, storageIdx, countToTake);
        if (!removed) return;
        const displaced = takeItemFromHand(player, hand);
        const res = putItemInHand(player, hand, removed, world || undefined);
        if (res.success) {
          if (displaced) addItemToFurnitureStorage(storage, displaced, displaced.count);
          sound.playPickup();
          notifyChange();
          return;
        } else {
          if (displaced) putItemInHand(player, hand, displaced, world || undefined);
          storage.items.splice(Math.min(storageIdx, storage.items.length), 0, removed);
          setErrorMessage(res.message);
          return;
        }
      }
      setErrorMessage(`${hand === 'left' ? 'Левая' : 'Правая'} рука уже занята!`);
      return;
    }

    const countToTake = targetItem.count > 1 ? 1 : targetItem.count;
    const removed = removeItemFromFurnitureStorage(storage, storageIdx, countToTake);
    if (!removed) return;

    const res = putItemInHand(player, hand, removed, world || undefined);
    if (!res.success) {
      storage.items.splice(Math.min(storageIdx, storage.items.length), 0, removed);
      setErrorMessage(res.message);
      return;
    }

    if (storage.items.length === 0) {
      setSelectedStorageIdx(null);
    } else if (storageIdx >= storage.items.length) {
      setSelectedStorageIdx(storage.items.length - 1);
    }

    sound.playPickup();
    addPlayerNotification(player, `Взято в ${hand === 'left' ? 'левую' : 'правую'} руку: ${removed.nameRu}`, 'pickup');
    notifyChange();
  };

  // ==================== CUSTOM POINTER DRAG-AND-DROP ENGINE ====================
  const handleStorageSlotDrop = (targetKey: string, sourceKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return;

    const isSourceStorage = sourceKey.startsWith('storage:') && !sourceKey.startsWith('storage:empty-');
    const isTargetStorage = targetKey.startsWith('storage:') || targetKey === 'zone:storage';

    // 1. Player Inventory Slot -> Storage
    if (sourceKey.startsWith('inv:') && isTargetStorage) {
      const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
      if (!isNaN(fromIdx)) {
        handleStoreItem(fromIdx);
      }
      return;
    }

    // 2. Player Hand -> Storage
    if ((sourceKey === 'hand:left' || sourceKey === 'hand:right') && isTargetStorage) {
      const hand = sourceKey === 'hand:left' ? 'left' : 'right';
      handleStoreFromHand(hand);
      return;
    }

    // 3. Storage -> Player Hand
    if (isSourceStorage && (targetKey === 'hand:left' || targetKey === 'hand:right')) {
      const sIdx = parseInt(sourceKey.replace('storage:', ''), 10);
      const hand = targetKey === 'hand:left' ? 'left' : 'right';
      if (!isNaN(sIdx)) {
        handleTakeToHand(sIdx, hand);
      }
      return;
    }

    // 4. Storage -> Player Inventory Slot or Pockets Zone
    if (isSourceStorage && (targetKey.startsWith('inv:') || targetKey === 'zone:pockets')) {
      const sIdx = parseInt(sourceKey.replace('storage:', ''), 10);
      if (isNaN(sIdx)) return;
      if (targetKey.startsWith('inv:')) {
        const toSlotIdx = parseInt(targetKey.replace('inv:', ''), 10);
        handleTakeItem(sIdx, undefined, isNaN(toSlotIdx) ? undefined : toSlotIdx);
      } else {
        handleTakeItem(sIdx);
      }
      return;
    }

    // 5. Player Inventory Slot <-> Player Inventory Slot
    if (sourceKey.startsWith('inv:') && targetKey.startsWith('inv:')) {
      const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
      const toIdx = parseInt(targetKey.replace('inv:', ''), 10);
      if (!isNaN(fromIdx) && !isNaN(toIdx) && fromIdx !== toIdx) {
        if (moveInventoryItem(player, fromIdx, toIdx)) {
          sound.playPickup();
          setSelectedInventoryIdx(toIdx);
          setSelectedHand(null);
          notifyChange();
        }
      }
      return;
    }

    // 6. Player Inventory Slot -> Player Hand
    if (sourceKey.startsWith('inv:') && (targetKey === 'hand:left' || targetKey === 'hand:right')) {
      const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
      const hand = targetKey === 'hand:left' ? 'left' : 'right';
      if (isNaN(fromIdx)) return;
      const item = player.inventory?.[fromIdx];
      if (!item) return;
      const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
      if (handItem) {
        const fit = canItemFitInCompartment(player, fromIdx, handItem, { ignoreSlotIdx: fromIdx });
        if (!fit.fits) {
          setErrorMessage(fit.reason || 'Предмет из руки не помещается в этот отсек!');
          return;
        }
        const displaced = takeItemFromHand(player, hand);
        player.inventory[fromIdx] = null as any;
        const res = putItemInHand(player, hand, item, world || undefined);
        if (res.success) {
          player.inventory[fromIdx] = displaced as any;
          sound.playPickup();
          notifyChange();
        } else {
          if (displaced) putItemInHand(player, hand, displaced, world || undefined);
          player.inventory[fromIdx] = item;
        }
        return;
      }
      player.inventory[fromIdx] = null as any;
      const res = putItemInHand(player, hand, item, world || undefined);
      if (!res.success) {
        player.inventory[fromIdx] = item;
        setErrorMessage(res.message);
        return;
      }
      sound.playPickup();
      notifyChange();
      return;
    }

    // 7. Player Hand -> Player Inventory Slot or Pockets Zone
    if (
      (sourceKey === 'hand:left' || sourceKey === 'hand:right') &&
      (targetKey.startsWith('inv:') || targetKey === 'zone:pockets')
    ) {
      const hand = sourceKey === 'hand:left' ? 'left' : 'right';
      const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
      if (!handItem) return;

      if (targetKey.startsWith('inv:')) {
        const toIdx = parseInt(targetKey.replace('inv:', ''), 10);
        if (!isNaN(toIdx) && toIdx >= 0) {
          if (!player.inventory) player.inventory = [];
          const existing = player.inventory[toIdx];
          const fit = canItemFitInCompartment(player, toIdx, handItem, {
            ignoreSlotIdx: existing ? toIdx : undefined,
          });
          if (!fit.fits) {
            setErrorMessage(fit.reason || 'Не помещается в этот отсек!');
            return;
          }
          const taken = takeItemFromHand(player, hand);
          if (!taken) return;
          player.inventory[toIdx] = taken;
          if (existing) {
            putItemInHand(player, hand, existing, world || undefined);
          }
          sound.playPickup();
          notifyChange();
          return;
        }
      }

      const res = stowItemFromHandToPockets(player, hand);
      if (res.success) {
        sound.playPickup();
        notifyChange();
      }
      return;
    }

    // 8. Hand <-> Hand
    if (
      (sourceKey === 'hand:left' || sourceKey === 'hand:right') &&
      (targetKey === 'hand:left' || targetKey === 'hand:right')
    ) {
      const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
      const tgtHand = targetKey === 'hand:left' ? 'left' : 'right';
      const srcItem = takeItemFromHand(player, srcHand);
      if (!srcItem) return;
      const displaced = takeItemFromHand(player, tgtHand);
      putItemInHand(player, tgtHand, srcItem, world || undefined);
      if (displaced) {
        putItemInHand(player, srcHand, displaced, world || undefined);
      }
      sound.playPickup();
      notifyChange();
    }
  };

  stDropHandlerRef.current = handleStorageSlotDrop;

  const findTargetStSlotAt = (x: number, y: number, sourceKey: string): string | null => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-st-slot]');
    let bestKey: string | null = null;
    let bestDist = Infinity;

    nodes.forEach(node => {
      const key = node.getAttribute('data-st-slot');
      if (!key || key === sourceKey) return;
      const rect = node.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        bestKey = key;
        bestDist = -1;
        return;
      }
      if (bestDist >= 0) {
        const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
        const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
        const d = Math.hypot(dx, dy);
        if (d <= 16 && d < bestDist) {
          bestDist = d;
          bestKey = key;
        }
      }
    });

    if (!bestKey) {
      const zones = document.querySelectorAll<HTMLElement>('[data-st-zone]');
      zones.forEach(zone => {
        if (bestKey) return;
        const zKey = zone.getAttribute('data-st-zone');
        if (!zKey) return;
        const rect = zone.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          bestKey = zKey;
        }
      });
    }

    return bestKey;
  };

  const startSlotPointerDrag = (
    e: React.PointerEvent<HTMLElement>,
    slotKey: string,
    item: InventoryItem | null | undefined,
    onSelectClick?: () => void
  ) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement)?.closest('button')) return;
    e.stopPropagation();

    if (!item) {
      if (selectedStSlot && selectedStSlot !== slotKey) {
        stDropHandlerRef.current?.(slotKey, selectedStSlot);
        setSelectedStSlot(null);
      } else {
        onSelectClick?.();
      }
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    stDragRef.current = {
      sourceKey: slotKey,
      item,
      startX,
      startY,
      x: startX,
      y: startY,
      active: false,
      overKey: null,
    };

    const onPointerMove = (ev: PointerEvent) => {
      const st = stDragRef.current;
      if (!st) return;
      st.x = ev.clientX;
      st.y = ev.clientY;
      if (!st.active && Math.hypot(ev.clientX - st.startX, ev.clientY - st.startY) > 3) {
        st.active = true;
      }
      if (st.active) {
        const over = findTargetStSlotAt(ev.clientX, ev.clientY, st.sourceKey);
        st.overKey = over;
        setStDragUi({
          sourceKey: st.sourceKey,
          item: st.item,
          x: st.x,
          y: st.y,
          overKey: over,
        });
      }
    };

    const finishDrag = (ev: PointerEvent, cancelled: boolean) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);

      const st = stDragRef.current;
      stDragRef.current = null;
      setStDragUi(null);

      if (!st || cancelled) return;

      if (st.active) {
        const targetKey = findTargetStSlotAt(ev.clientX, ev.clientY, st.sourceKey) || st.overKey;
        if (targetKey && targetKey !== st.sourceKey) {
          stDropHandlerRef.current?.(targetKey, st.sourceKey);
          setSelectedStSlot(null);
        }
      } else {
        onSelectClick?.();
        if (selectedStSlot && selectedStSlot !== slotKey) {
          stDropHandlerRef.current?.(slotKey, selectedStSlot);
          setSelectedStSlot(null);
        } else {
          setSelectedStSlot(prev => (prev === slotKey ? null : slotKey));
        }
      }
    };

    const onPointerUp = (ev: PointerEvent) => finishDrag(ev, false);
    const onPointerCancel = (ev: PointerEvent) => finishDrag(ev, true);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  };

  const compartments = getPlayerCompartments(player);

  const selectedStorageItem =
    selectedStorageIdx !== null && storage.items[selectedStorageIdx] ? storage.items[selectedStorageIdx] : null;
  const selectedPlayerItem: InventoryItem | null =
    selectedHand === 'left'
      ? player.leftHandItem || null
      : selectedHand === 'right'
      ? player.rightHandItem || null
      : selectedInventoryIdx !== null && player.inventory?.[selectedInventoryIdx]
      ? player.inventory[selectedInventoryIdx]!
      : null;

  const renderItemMetaLine = (it: InventoryItem) => {
    const temp = it.surfaceTemperature ?? it.temperature;
    const wet = Math.round(it.wetness ?? 0);
    return (
      <span className="gu-mut gu-mono" style={{ fontSize: 11 }}>
        {it.count > 1 ? `×${it.count} шт. · ` : ''}
        {formatWeightRu(getItemTotalWeight(it))} · {getItemTotalVolume(it)} л
        {temp !== undefined && (
          <span style={{ color: temp >= 40 ? '#efa690' : temp <= 4 ? '#7dd3fc' : 'var(--gu-ink-dim)' }}>
            {' · '}{temp > 0 ? '+' : ''}{Math.round(temp)}°C
          </span>
        )}
        {wet > 0 && (
          <span style={{ color: '#7dd3fc' }}>{' · '}Влага {wet}%</span>
        )}
      </span>
    );
  };

  return (
    <ModalShell
      id="furniture-storage-modal"
      title={storage.customTitle || cfg.nameRu}
      subtitle={
        isRadiator
          ? `Поверхность радиатора · ${storage.items.length} предм. сушится`
          : `Хранилище · ${storage.items.length} предм. внутри`
      }
      width={1060}
      tall
      onClose={onClose}
      headRight={
        <div className="gu-row" style={{ gap: 8 }}>
          {cfg.isCold && (
            <span className="gu-tag cold">
              <Snowflake width={12} height={12} /> Охлаждение (+4°C)
            </span>
          )}
          {isHotSurface && (
            <span className="gu-tag amber">
              <Flame width={12} height={12} /> Нагрев (+{cfg.heatingTemp || 65}°C)
            </span>
          )}
        </div>
      }
      footerHints={[
        ['Перетаскивание', 'Из карманов / рук в хранилище и обратно'],
        ['2× Клик', 'Переместить 1 шт.'],
        ['Esc', 'Закрыть']
      ]}
      footerRight={
        <button type="button" onClick={onClose} className="gu-btn gu-btn-s gu-btn-sm">
          Готово
        </button>
      }
    >
      {errorMessage && (
        <div
          className="gu-note gu-err"
          style={{ flex: 'none', padding: '6px 10px', fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Info width={14} height={14} />
            <span>{errorMessage}</span>
          </span>
          <button type="button" onClick={() => setErrorMessage(null)} className="gu-btn gu-btn-ghost gu-btn-xs">
            Скрыть
          </button>
        </div>
      )}

      <div className="gu-st-split">
        {/* LEFT PANEL: what is inside the furniture */}
        <div
          className="gu-panel gu-st-col"
          data-st-zone="zone:storage"
          style={{
            borderColor: stDragUi?.overKey === 'zone:storage' ? 'var(--gu-amber-hi)' : undefined,
          }}
        >
          <div className="gu-st-head" style={{ marginBottom: 0 }}>
            <span className="gu-st-title" style={{ fontSize: 16 }}>
              {isRadiator ? 'Поверхность радиатора' : 'Слоты хранилища'}
            </span>
            <span className="gu-st-sub gu-mono" style={{ fontSize: 12 }}>
              {storage.items.length} предм.
            </span>
          </div>

          <div className="gu-meters" style={{ flex: 'none', marginBottom: 0, gap: 12 }}>
            <div className="gu-meter">
              <div className="gu-meter-h" style={{ fontSize: 12, marginBottom: 4 }}>
                <span>{isRadiator ? 'Площадь' : 'Объём'}</span>
                <b>{storageTotalVol.toFixed(1)} / {cfg.capacityL.toFixed(1)} л</b>
              </div>
              <div className={`gu-bar ${volPercent > 90 ? 'bad' : ''}`}>
                <span style={{ width: volPercent > 0 ? `${Math.max(2, volPercent)}%` : '0%' }} />
              </div>
            </div>
            <div className="gu-meter">
              <div className="gu-meter-h" style={{ fontSize: 12, marginBottom: 4 }}>
                <span>Нагрузка</span>
                <b>{storageTotalWt.toFixed(1)} / {cfg.maxWeightKg.toFixed(1)} кг</b>
              </div>
              <div className={`gu-bar ${wtPercent > 90 ? 'bad' : 'good'}`}>
                <span style={{ width: wtPercent > 0 ? `${Math.max(2, wtPercent)}%` : '0%' }} />
              </div>
            </div>
          </div>

          <div className="gu-st-scroll">
            <div className="gu-slots">
              {Array.from({ length: Math.max(24, storage.items.length + 6) }, (_, idx) => {
                const it = storage.items[idx];
                const slotKey = it ? `storage:${idx}` : `storage:empty-${idx}`;
                const isBeingDragged = stDragUi?.sourceKey === slotKey;
                const isDropTarget = stDragUi?.overKey === slotKey;

                if (!it) {
                  return (
                    <div
                      key={slotKey}
                      data-st-slot={slotKey}
                      draggable={false}
                      onDragStart={e => e.preventDefault()}
                      onPointerDown={e => startSlotPointerDrag(e, slotKey, null)}
                      className={'gu-slot empty' + (isDropTarget ? ' on' : '')}
                      style={{
                        touchAction: 'none',
                        borderColor: isDropTarget ? 'var(--gu-amber-hi)' : undefined,
                      }}
                    />
                  );
                }

                const itemTemp = it.surfaceTemperature ?? it.temperature ?? 20;
                const isHot = itemTemp >= 40;
                const isCold = itemTemp <= 4;
                const isSelected = selectedStorageIdx === idx || selectedStSlot === slotKey;

                return (
                  <div
                    key={it.id || idx}
                    data-st-slot={slotKey}
                    draggable={false}
                    onDragStart={e => e.preventDefault()}
                    onPointerDown={e =>
                      startSlotPointerDrag(e, slotKey, it, () => {
                        setSelectedStorageIdx(idx);
                        setSelectedInventoryIdx(null);
                        setSelectedHand(null);
                      })
                    }
                    onDoubleClick={() => handleTakeItem(idx, 1)}
                    className={
                      'gu-slot' +
                      (isSelected || isDropTarget ? ' on' : '') +
                      (isHot ? ' hot' : '') +
                      (isCold ? ' cold' : '')
                    }
                    style={{
                      touchAction: 'none',
                      cursor: 'grab',
                      opacity: isBeingDragged ? 0.35 : 1,
                      borderColor: isDropTarget ? 'var(--gu-amber-hi)' : undefined,
                    }}
                    title={`${it.nameRu}\n${formatWeightRu(getItemTotalWeight(it))} · ${getItemTotalVolume(it)} л`}
                  >
                    <ItemIconCanvas itemId={it.itemId} item={it} size={40} />
                    {it.count > 1 && <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>{it.count}</span>}
                    {isHot && <span className="gu-slot-t" style={{ pointerEvents: 'none' }}>+{Math.round(itemTemp)}°</span>}
                    {isCold && <span className="gu-slot-t cold" style={{ pointerEvents: 'none' }}>{Math.round(itemTemp)}°</span>}
                    {(it.wetness ?? 0) > 0 && (
                      <span className="gu-slot-wet" style={{ pointerEvents: 'none' }}>
                        <CloudRain width={11} height={11} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedStorageItem && selectedStorageIdx !== null && (
            <div className="gu-st-pick">
              <div className="gu-row2" style={{ gap: 8, minWidth: 0 }}>
                <div className="gu-ic" style={{ width: 34, height: 34 }}>
                  <ItemIconCanvas itemId={selectedStorageItem.itemId} item={selectedStorageItem} size={26} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedStorageItem.nameRu}
                  </div>
                  {renderItemMetaLine(selectedStorageItem)}
                </div>
              </div>

              <div className="gu-grid gu-g3" style={{ gap: 5 }}>
                <button
                  type="button"
                  onClick={() => handleTakeToHand(selectedStorageIdx, 'left')}
                  className="gu-btn gu-btn-s gu-btn-xs"
                  title="Взять в левую руку"
                >
                  <Hand width={12} height={12} /> В левую
                </button>
                <button
                  type="button"
                  onClick={() => handleTakeToHand(selectedStorageIdx, 'right')}
                  className="gu-btn gu-btn-s gu-btn-xs"
                  title="Взять в правую руку"
                >
                  <Hand width={12} height={12} /> В правую
                </button>
                <button
                  type="button"
                  onClick={() => handleTakeItem(selectedStorageIdx, selectedStorageItem.count > 1 ? 1 : selectedStorageItem.count)}
                  className="gu-btn gu-btn-p gu-btn-xs"
                >
                  <ArrowRight width={12} height={12} /> {selectedStorageItem.count > 1 ? 'В карман (1)' : 'В карманы'}
                </button>
              </div>
              {selectedStorageItem.count > 1 && (
                <button
                  type="button"
                  onClick={() => handleTakeItem(selectedStorageIdx, selectedStorageItem.count)}
                  className="gu-btn gu-btn-s gu-btn-xs gu-btn-block"
                >
                  <ArrowRight width={12} height={12} /> Забрать все (×{selectedStorageItem.count} шт.) в карманы
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: player's active hand slots & pocket slots */}
        <div
          className="gu-panel gu-st-col"
          data-st-zone="zone:pockets"
          style={{
            borderColor: stDragUi?.overKey === 'zone:pockets' ? 'var(--gu-amber-hi)' : undefined,
          }}
        >
          <div className="gu-st-head" style={{ marginBottom: 0 }}>
            <span className="gu-st-title" style={{ fontSize: 16 }}>Слоты игрока (Руки и карманы)</span>
            <span className="gu-st-sub gu-mono" style={{ fontSize: 12 }}>
              {playerCarriedWt.toFixed(1)} кг · {playerPocketCap.usedVolumeL}/{playerPocketCap.totalCapacityL} л
            </span>
          </div>

          <div className="gu-pills" style={{ flex: 'none', marginBottom: 0 }}>
            {(['all', 'clothing', 'food', 'drink', 'tool', 'valuable', 'misc'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`gu-pill ${selectedCategory === cat ? 'on' : ''}`}
                style={{ height: 26, padding: '0 9px', fontSize: 12 }}
              >
                {cat === 'all'
                  ? 'Все'
                  : cat === 'clothing'
                  ? 'Одежда'
                  : cat === 'food'
                  ? 'Еда'
                  : cat === 'drink'
                  ? 'Напитки'
                  : cat === 'tool'
                  ? 'Инструменты'
                  : cat === 'valuable'
                  ? 'Ценности'
                  : 'Разное'}
              </button>
            ))}
          </div>

          <div className="gu-st-scroll">
            {/* Compact Hand Slots inside the scroll block */}
            <div className="gu-group">
              <div className="gu-group-h">
                <span className="gu-group-t"><Hand width={15} height={15} />Активные руки</span>
                <span className="gu-grp-meta">
                  Лев: {player.leftHandItem ? player.leftHandItem.nameRu : 'пусто'} · Прав: {player.rightHandItem ? player.rightHandItem.nameRu : 'пусто'}
                </span>
              </div>
              <div className="gu-slots">
                {(['left', 'right'] as const).map(hand => {
                  const hItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
                  const slotKey = `hand:${hand}`;
                  const isBeingDragged = stDragUi?.sourceKey === slotKey;
                  const isDropTarget = stDragUi?.overKey === slotKey;
                  const isSelected = selectedHand === hand || selectedStSlot === slotKey;
                  const itemTemp = hItem ? (hItem.surfaceTemperature ?? hItem.temperature ?? 20) : 20;
                  const isHot = !!hItem && itemTemp >= 40;
                  const isCold = !!hItem && itemTemp <= 4;

                  return (
                    <div
                      key={hand}
                      data-st-slot={slotKey}
                      draggable={false}
                      onDragStart={e => e.preventDefault()}
                      onPointerDown={e =>
                        startSlotPointerDrag(e, slotKey, hItem, () => {
                          if (!hItem) return;
                          setSelectedHand(hand);
                          setSelectedInventoryIdx(null);
                          setSelectedStorageIdx(null);
                        })
                      }
                      onDoubleClick={() => {
                        if (hItem) handleStoreFromHand(hand);
                      }}
                      className={
                        'gu-slot' +
                        (!hItem ? ' empty' : '') +
                        (isSelected || isDropTarget ? ' on' : '') +
                        (isHot ? ' hot' : '') +
                        (isCold ? ' cold' : '')
                      }
                      style={{
                        touchAction: 'none',
                        cursor: hItem ? 'grab' : selectedStSlot ? 'pointer' : 'default',
                        opacity: isBeingDragged ? 0.35 : 1,
                        borderColor: isDropTarget ? 'var(--gu-amber-hi)' : undefined,
                      }}
                      title={
                        hItem
                          ? `${hand === 'left' ? 'Левая рука' : 'Правая рука'}: ${hItem.nameRu}\n${formatWeightRu(getItemTotalWeight(hItem))} · ${getItemTotalVolume(hItem)} л`
                          : `${hand === 'left' ? 'Левая рука' : 'Правая рука'} (перетащите сюда предмет)`
                      }
                    >
                      <span className="gu-ic-hk" style={{ pointerEvents: 'none' }}>{hand === 'left' ? 'Л' : 'П'}</span>
                      {hItem ? (
                        <>
                          <ItemIconCanvas itemId={hItem.itemId} item={hItem} size={40} />
                          {hItem.count > 1 && <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>{hItem.count}</span>}
                          {isHot && <span className="gu-slot-t" style={{ pointerEvents: 'none' }}>+{Math.round(itemTemp)}°</span>}
                          {isCold && <span className="gu-slot-t cold" style={{ pointerEvents: 'none' }}>{Math.round(itemTemp)}°</span>}
                          {(hItem.wetness ?? 0) > 0 && (
                            <span className="gu-slot-wet" style={{ pointerEvents: 'none' }}>
                              <CloudRain width={11} height={11} />
                            </span>
                          )}
                        </>
                      ) : (
                        <Hand width={18} height={18} color="#5e5b54" style={{ pointerEvents: 'none' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {compartments.map(comp => {
              const slots = Array.from({ length: comp.slotCount }, (_, l) => comp.startIndex + l);
              const CompIcon = comp.iconType === 'user' ? User : comp.iconType === 'shirt' ? Shirt : Luggage;
              return (
                <div key={comp.id} className="gu-group">
                  <div className="gu-group-h">
                    <span className="gu-group-t"><CompIcon width={15} height={15} />{comp.nameRu}</span>
                    <span className="gu-grp-meta">{comp.usedVolumeL}/{comp.capacityL} л · {comp.usedWeightKg}/{comp.maxWeightKg} кг</span>
                  </div>
                  <div className="gu-slots">
                    {slots.map(slotIdx => {
                      const item = (player.inventory || [])[slotIdx];
                      const slotKey = `inv:${slotIdx}`;
                      const isBeingDragged = stDragUi?.sourceKey === slotKey;
                      const isDropTarget = stDragUi?.overKey === slotKey;

                      if (!item) {
                        return (
                          <div
                            key={slotIdx}
                            data-st-slot={slotKey}
                            draggable={false}
                            onDragStart={e => e.preventDefault()}
                            onPointerDown={e => startSlotPointerDrag(e, slotKey, null)}
                            className={'gu-slot empty' + (isDropTarget ? ' on' : '')}
                            style={{
                              touchAction: 'none',
                              borderColor: isDropTarget ? 'var(--gu-amber-hi)' : undefined,
                            }}
                          />
                        );
                      }

                      const itemTemp = item.surfaceTemperature ?? item.temperature ?? 20;
                      const isHot = itemTemp >= 40;
                      const isCold = itemTemp <= 4;
                      const matches = selectedCategory === 'all' || item.category === selectedCategory;
                      const isSel = (selectedHand === null && selectedInventoryIdx === slotIdx) || selectedStSlot === slotKey;

                      return (
                        <div
                          key={slotIdx}
                          data-st-slot={slotKey}
                          draggable={false}
                          onDragStart={e => e.preventDefault()}
                          onPointerDown={e =>
                            startSlotPointerDrag(e, slotKey, item, () => {
                              setSelectedInventoryIdx(slotIdx);
                              setSelectedHand(null);
                              setSelectedStorageIdx(null);
                            })
                          }
                          onDoubleClick={() => handleStoreItem(slotIdx, 1)}
                          className={
                            'gu-slot' +
                            (isSel || isDropTarget ? ' on' : '') +
                            (matches ? '' : ' dim') +
                            (isHot ? ' hot' : '') +
                            (isCold ? ' cold' : '')
                          }
                          style={{
                            touchAction: 'none',
                            cursor: 'grab',
                            opacity: isBeingDragged ? 0.35 : 1,
                            borderColor: isDropTarget ? 'var(--gu-amber-hi)' : undefined,
                          }}
                          title={`${item.nameRu}\n${formatWeightRu(getItemTotalWeight(item))} · ${getItemTotalVolume(item)} л`}
                        >
                          <ItemIconCanvas itemId={item.itemId} item={item} size={40} />
                          {item.count > 1 && <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>{item.count}</span>}
                          {isHot && <span className="gu-slot-t" style={{ pointerEvents: 'none' }}>+{Math.round(itemTemp)}°</span>}
                          {isCold && <span className="gu-slot-t cold" style={{ pointerEvents: 'none' }}>{Math.round(itemTemp)}°</span>}
                          {(item.wetness ?? 0) > 0 && (
                            <span className="gu-slot-wet" style={{ pointerEvents: 'none' }}>
                              <CloudRain width={11} height={11} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedPlayerItem && (
            <div className="gu-st-pick">
              <div className="gu-row2" style={{ gap: 8, minWidth: 0 }}>
                <div className="gu-ic" style={{ width: 34, height: 34 }}>
                  <ItemIconCanvas itemId={selectedPlayerItem.itemId} item={selectedPlayerItem} size={26} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedPlayerItem.nameRu}
                  </div>
                  {renderItemMetaLine(selectedPlayerItem)}
                </div>
              </div>

              {selectedHand ? (
                <button
                  type="button"
                  onClick={() => handleStoreFromHand(selectedHand)}
                  className="gu-btn gu-btn-p gu-btn-xs gu-btn-block"
                >
                  <ArrowLeft width={12} height={12} /> {isRadiator ? 'Положить на батарею' : 'Убрать из руки в хранилище'}
                </button>
              ) : selectedInventoryIdx !== null ? (
                <div className="gu-grid" style={{ gridTemplateColumns: selectedPlayerItem.count > 1 ? '1fr 1fr' : '1fr', gap: 5 }}>
                  <button
                    type="button"
                    onClick={() => handleStoreItem(selectedInventoryIdx, 1)}
                    className="gu-btn gu-btn-p gu-btn-xs gu-btn-block"
                  >
                    <ArrowLeft width={12} height={12} /> {isRadiator ? 'На батарею (1)' : selectedPlayerItem.count > 1 ? 'Убрать 1 шт.' : 'В хранилище'}
                  </button>
                  {selectedPlayerItem.count > 1 && (
                    <button
                      type="button"
                      onClick={() => handleStoreItem(selectedInventoryIdx, selectedPlayerItem.count)}
                      className="gu-btn gu-btn-s gu-btn-xs gu-btn-block"
                    >
                      <ArrowLeft width={12} height={12} /> Убрать все (×{selectedPlayerItem.count})
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING DRAG PREVIEW FOR STORAGE MODAL */}
      {stDragUi && (
        <div
          style={{
            position: 'fixed',
            left: stDragUi.x - 32,
            top: stDragUi.y - 32,
            width: 64,
            height: 64,
            borderRadius: 9,
            background: 'rgba(20, 20, 22, 0.92)',
            border: '1px solid var(--gu-amber-hi)',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <ItemIconCanvas itemId={stDragUi.item.itemId} item={stDragUi.item} size={44} />
        </div>
      )}
    </ModalShell>
  );
};


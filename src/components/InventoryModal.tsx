import React, { useState, useEffect } from 'react';
import { Player, InventoryItem, ItemCategory, GameWorld, GroundItem } from '../types';
import {
  useItemOnPlayer,
  dropItemFromPlayer,
  addItemToPlayer,
  moveInventoryItem,
  isPlayerNearTrashBin,
  disposeTrashInBin,
  equipClothing,
  unequipClothing,
  getPlayerPocketCapacity,
  getPlayerTotalCarriedWeight,
  getItemTotalWeight,
  getItemTotalVolume,
  putItemInHand,
  takeItemFromHand,
  stowItemFromHandToPockets,
  addItemToContainer,
  removeItemFromContainer,
  canItemFitInContainer,
  canItemFitInPockets,
  canItemFitInCompartment,
  addPlayerNotification,
  restoreStarterContainers,
  unpackSingleUseContainer,
  handleCarKeyActivation,
  getTargetVehicleForKey,
  getPlayerCompartments,
  getPlayerTotalSlots,
  getSlotCompartment,
  getCandyPackagingShapeNameRu
} from '../items';
import { getItemThermalDisplayInfo } from '../itemThermalSystem';
import { isFluidContainerClosed, openFluidContainerIfNeeded, LIQUID_REGISTRY, LiquidId } from '../liquidSystem';
import {
  InteractionSlotGrid4,
  evaluateInteractionGrid,
  getEffectiveFluidWrapper,
} from '../interactionCrafting';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ModalShell, Tabs } from './gameUi';
import { sound } from '../audio';

function formatWeightRu(weightKg: number): string {
  if (!weightKg || weightKg <= 0) return '0 г';
  if (weightKg < 1) {
    const grams = weightKg < 0.01
      ? Number((weightKg * 1000).toFixed(1))
      : Math.round(weightKg * 1000);
    return `${grams} г`;
  }
  return `${Number(weightKg.toFixed(2))} кг`;
}
import {
  Package,
  Utensils,
  Zap,
  Trash2,
  Sparkles,
  Shirt,
  Hand,
  Weight,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
  Layers,
  ChevronLeft,
  Smartphone,
  Lock,
  Unlock,
  Lightbulb,
  Volume2,
  User,
  Luggage,
  FileText,
  Scissors,
  Flame,
  CloudRain,
} from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  world: GameWorld | null;
  onSleepInBed?: () => void;
  onRequestLimbTreatment?: (itemIndex: number, item: InventoryItem) => void;
  onInspectDocument?: (item: InventoryItem) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  player,
  world,
  onRequestLimbTreatment,
  onInspectDocument
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedHand, setSelectedHand] = useState<'left' | 'right' | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'interaction' | 'surroundings' | 'clothing'>('inventory');
  const [openContainer, setOpenContainer] = useState<InventoryItem | null>(null);
  const [selectedContainerItemIdx, setSelectedContainerItemIdx] = useState<number>(0);
  const [, forceRender] = useState(0);
  const [selectedWbSlot, setSelectedWbSlot] = useState<string | null>(null);
  const [wbDragUi, setWbDragUi] = useState<{
    sourceKey: string;
    item: InventoryItem;
    x: number;
    y: number;
    overKey: string | null;
  } | null>(null);
  const wbDragRef = React.useRef<{
    sourceKey: string;
    item: InventoryItem;
    startX: number;
    startY: number;
    x: number;
    y: number;
    active: boolean;
    overKey: string | null;
  } | null>(null);
  const wbDropHandlerRef = React.useRef<((targetKey: string, sourceKey: string) => void) | null>(null);

  useEffect(() => {
    if (!isOpen || !player) return;
    const w =
      (player.inventory && player.inventory.some(i => i && i.itemId === 'wallet')) ||
      player.leftHandItem?.itemId === 'wallet' ||
      player.rightHandItem?.itemId === 'wallet';
    const b =
      (player.inventory && player.inventory.some(i => i && i.itemId === 'plastic_bag')) ||
      player.leftHandItem?.itemId === 'plastic_bag' ||
      player.rightHandItem?.itemId === 'plastic_bag';
    if (!w && !b) {
      restoreStarterContainers(player);
      forceRender(n => n + 1);
    }
  }, [isOpen, player]);

  if (!isOpen || !player) return null;

  const inventory = player.inventory || [];
  const compartments = getPlayerCompartments(player);

  const pocketCap = getPlayerPocketCapacity(player);
  const carriedWeight = getPlayerTotalCarriedWeight(player);
  const leftBulky = !!(player.leftHandItem && (player.leftHandItem.volume || 0) >= 10);
  const rightBulky = !!(player.rightHandItem && (player.rightHandItem.volume || 0) >= 10);
  const isBulkyHand = leftBulky || rightBulky;

  const hasWallet =
    inventory.some(i => i && i.itemId === 'wallet') ||
    player.leftHandItem?.itemId === 'wallet' ||
    player.rightHandItem?.itemId === 'wallet';
  const hasBag =
    inventory.some(i => i && i.itemId === 'plastic_bag') ||
    player.leftHandItem?.itemId === 'plastic_bag' ||
    player.rightHandItem?.itemId === 'plastic_bag';

  let weightSpeedPct = 100;
  if (carriedWeight > 8) {
    if (carriedWeight <= 25) {
      weightSpeedPct = Math.round((1.0 - ((carriedWeight - 8) / 17) * 0.25) * 100);
    } else if (carriedWeight <= 45) {
      weightSpeedPct = Math.round((0.75 - ((carriedWeight - 25) / 20) * 0.30) * 100);
    } else {
      weightSpeedPct = Math.round(Math.max(0.25, 0.45 - ((carriedWeight - 45) / 25) * 0.20) * 100);
    }
  }
  if (isBulkyHand) weightSpeedPct = Math.round(weightSpeedPct * 0.82);

  const matchesFilter = (item: InventoryItem | undefined) => {
    if (selectedCategory === 'all') return true;
    if (!item) return false;
    return item.category === selectedCategory;
  };

  const selectedHandItem =
    selectedHand === 'left'
      ? player.leftHandItem
      : selectedHand === 'right'
      ? player.rightHandItem
      : null;

  const selectedEntry =
    selectedHand && selectedHandItem
      ? { item: selectedHandItem, originalIndex: -1, hand: selectedHand }
      : inventory[selectedIndex]
      ? { item: inventory[selectedIndex], originalIndex: selectedIndex, hand: null as 'left' | 'right' | null }
      : null;

  const handleEquipItem = (idx: number) => {
    if (!player) return;
    equipClothing(player, idx, world);
    forceRender(n => n + 1);
  };

  const handleUnequipItem = (slot: any, layer: any) => {
    if (!player) return;
    unequipClothing(player, slot, layer, world);
    forceRender(n => n + 1);
  };

  const handleUseItem = (idx: number) => {
    if (!player) return;
    const item = player.inventory?.[idx];
    if (!item) return;

    if (item.isContainer && !item.singleUseContainer) {
      setOpenContainer(item);
      setSelectedContainerItemIdx(0);
      return;
    }

    const TOPICAL_ITEMS = [
      'bandage',
      'splint',
      'medical_patch',
      'antiseptic',
      'panthenol_spray',
      'spasatel_ointment',
      'zelenka',
      'iodine',
      'diclofenac_gel',
      'hydrogen_peroxide'
    ];
    if (item && item.category === 'med' && TOPICAL_ITEMS.includes(item.itemId)) {
      onRequestLimbTreatment?.(idx, item);
      return;
    }
    useItemOnPlayer(player, idx, world || undefined);
    sound.resume();
    forceRender(n => n + 1);
  };

  const handleDropItem = (idx: number) => {
    if (!player || !world) return;
    dropItemFromPlayer(player, idx, world, 1);
    forceRender(n => n + 1);
  };

  const handleTakeToHand = (hand: 'left' | 'right', invIdx: number) => {
    if (!player) return;
    const item = player.inventory?.[invIdx];
    if (!item) return;
    const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (handItem) {
      // Try swapping if the current hand item fits in invIdx
      const fitCheck = canItemFitInCompartment(player, invIdx, handItem, { ignoreSlotIdx: invIdx });
      if (fitCheck.fits) {
        const displaced = takeItemFromHand(player, hand);
        player.inventory[invIdx] = null as any;
        const res = putItemInHand(player, hand, item, world);
        if (res.success) {
          player.inventory[invIdx] = displaced as any;
          sound.playPickup();
          forceRender(n => n + 1);
          return;
        } else {
          if (displaced) putItemInHand(player, hand, displaced, world);
          player.inventory[invIdx] = item;
          addPlayerNotification(player, res.message, 'warning');
          return;
        }
      }
      addPlayerNotification(player, `${hand === 'left' ? 'Левая' : 'Правая'} рука уже занята!`, 'warning');
      return;
    }
    player.inventory[invIdx] = null as any;
    const res = putItemInHand(player, hand, item, world);
    if (!res.success) {
      player.inventory[invIdx] = item;
      addPlayerNotification(player, res.message, 'warning');
      return;
    }
    sound.playPickup();
    forceRender(n => n + 1);
  };

  const handleStowHand = (hand: 'left' | 'right', targetSlotIdx?: number) => {
    if (!player) return;
    const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!handItem) return;

    if (targetSlotIdx !== undefined && targetSlotIdx >= 0) {
      if (!player.inventory) player.inventory = [];
      const existing = player.inventory[targetSlotIdx];
      // If dropping onto an openable container in that slot, try putting inside container first
      if (
        existing &&
        existing.isContainer &&
        !existing.singleUseContainer &&
        existing.id !== handItem.id &&
        canItemFitInContainer(existing, handItem).fits
      ) {
        const taken = takeItemFromHand(player, hand);
        if (taken) {
          const cRes = addItemToContainer(existing, taken);
          if (cRes.success) {
            sound.playPickup();
            addPlayerNotification(player, cRes.message, 'pickup');
            forceRender(n => n + 1);
            return;
          } else {
            putItemInHand(player, hand, taken, world);
          }
        }
      }

      const fit = canItemFitInCompartment(player, targetSlotIdx, handItem, {
        ignoreSlotIdx: existing ? targetSlotIdx : undefined,
      });
      if (!fit.fits) {
        addPlayerNotification(player, fit.reason || 'Не помещается в этот отсек!', 'warning');
        return;
      }
      const taken = takeItemFromHand(player, hand);
      if (!taken) return;
      player.inventory[targetSlotIdx] = taken;
      if (existing) {
        putItemInHand(player, hand, existing, world);
      }
      sound.playPickup();
      forceRender(n => n + 1);
      return;
    }

    const res = stowItemFromHandToPockets(player, hand);
    if (res.success) {
      sound.playPickup();
    }
    forceRender(n => n + 1);
  };

  const handleDropFromHand = (hand: 'left' | 'right') => {
    if (!player || !world) return;
    const item = takeItemFromHand(player, hand);
    if (item) {
      if (!world.groundItems) world.groundItems = [];
      world.groundItems.push({
        id: `ground_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        x: player.x + (Math.random() * 20 - 10),
        y: player.y + (Math.random() * 20 - 10),
        item,
        spawnTime: Date.now()
      });
      sound.playPickup();
      addPlayerNotification(player, `Брошено на землю: ${item.nameRu}`, 'info');
      forceRender(n => n + 1);
    }
  };

  const handlePutIntoContainer = (container: InventoryItem, invIdx: number) => {
    if (!player) return;
    const item = player.inventory?.[invIdx];
    if (!item || item.id === container.id) return;
    const res = addItemToContainer(container, item);
    if (res.success) {
      player.inventory[invIdx] = null as any;
      sound.playPickup();
      addPlayerNotification(player, res.message, 'pickup');
      forceRender(n => n + 1);
    } else {
      addPlayerNotification(player, res.message, 'warning');
    }
  };

  const handleExtractFromContainer = (
    container: InventoryItem,
    contentIdx: number,
    target: 'pockets' | 'leftHand' | 'rightHand',
    exactPocketSlotIdx?: number
  ) => {
    if (!player || !container.contents) return;
    const item = container.contents[contentIdx];
    if (!item) return;

    if (target === 'pockets') {
      if (exactPocketSlotIdx !== undefined && exactPocketSlotIdx >= 0) {
        if (!player.inventory) player.inventory = [];
        const existing = player.inventory[exactPocketSlotIdx];
        const fit = canItemFitInCompartment(player, exactPocketSlotIdx, item, {
          ignoreSlotIdx: existing ? exactPocketSlotIdx : undefined,
        });
        if (!fit.fits) {
          addPlayerNotification(player, fit.reason || 'Не помещается в этот отсек!', 'warning');
          return;
        }
        if (!existing) {
          const removed = removeItemFromContainer(container, contentIdx, item.count);
          if (removed) {
            player.inventory[exactPocketSlotIdx] = removed;
            sound.playPickup();
            forceRender(n => n + 1);
          }
          return;
        } else if (existing.id !== container.id && canItemFitInContainer(container, existing).fits) {
          const removed = removeItemFromContainer(container, contentIdx, item.count);
          if (removed) {
            player.inventory[exactPocketSlotIdx] = removed;
            addItemToContainer(container, existing);
            sound.playPickup();
            forceRender(n => n + 1);
          }
          return;
        }
      }

      const check = canItemFitInPockets(player, item);
      if (!check.fits) {
        addPlayerNotification(player, check.reason || 'Не помещается в карманы!', 'warning');
        return;
      }
      const removed = removeItemFromContainer(container, contentIdx, item.count);
      if (removed) {
        const added = addItemToPlayer(player, removed, { preferPockets: true, skipHands: true });
        if (!added) {
          addItemToContainer(container, removed);
        } else {
          sound.playPickup();
          forceRender(n => n + 1);
        }
      }
    } else {
      const hand = target === 'leftHand' ? 'left' : 'right';
      const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
      if (handItem) {
        if (handItem.id !== container.id && canItemFitInContainer(container, handItem).fits) {
          const removed = removeItemFromContainer(container, contentIdx, item.count);
          if (removed) {
            const displaced = takeItemFromHand(player, hand);
            putItemInHand(player, hand, removed, world);
            if (displaced) addItemToContainer(container, displaced);
            sound.playPickup();
            forceRender(n => n + 1);
          }
          return;
        }
        addPlayerNotification(player, `${hand === 'left' ? 'Левая' : 'Правая'} рука занята!`, 'warning');
        return;
      }
      const removed = removeItemFromContainer(container, contentIdx, item.count);
      if (removed) {
        putItemInHand(player, hand, removed, world);
        sound.playPickup();
        forceRender(n => n + 1);
      }
    }
  };

  const handleEquipFromHand = (hand: 'left' | 'right') => {
    if (!player) return;
    const item = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!item || !item.clothingStats) return;

    const stats = item.clothingStats;
    player.equippedClothing = player.equippedClothing || {};
    player.equippedClothing[stats.slot] = player.equippedClothing[stats.slot] || {};

    takeItemFromHand(player, hand);

    if (player.equippedClothing[stats.slot]![stats.layer]) {
      unequipClothing(player, stats.slot, stats.layer, world);
    }

    player.equippedClothing[stats.slot]![stats.layer] = item;

    if (item.contents && item.contents.length > 0) {
      const contentsToUnpack = [...item.contents];
      item.contents = [];
      for (const contItem of contentsToUnpack) {
        addItemToPlayer(player, contItem, { preferPockets: true });
      }
    }

    const totalSlots = getPlayerTotalSlots(player);
    player.maxInventorySlots = totalSlots;

    sound.playPickup();
    addPlayerNotification(player, `Надето из руки: ${item.nameRu}`, 'pickup');
    forceRender(n => n + 1);
  };

  const handleDropFromContainer = (container: InventoryItem, contentIdx: number) => {
    if (!player || !world || !container.contents) return;
    const item = removeItemFromContainer(container, contentIdx, 1);
    if (item) {
      if (!world.groundItems) world.groundItems = [];
      world.groundItems.push({
        id: `ground_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        x: player.x + (Math.random() * 20 - 10),
        y: player.y + (Math.random() * 20 - 10),
        item,
        spawnTime: Date.now()
      });
      sound.playPickup();
      addPlayerNotification(player, `Выброшено из контейнера: ${item.nameRu}`, 'info');
      forceRender(n => n + 1);
    }
  };

  const nearbyGroundItems = (world?.groundItems || []).filter(gi => {
    const dist = Math.hypot(player.x - gi.x, player.y - gi.y);
    return dist < 80;
  });

  const handlePickupGroundItem = (gi: GroundItem, targetKey?: string) => {
    if (!player || !world) return;
    if (targetKey === 'hand:left' || targetKey === 'hand:right') {
      const hand = targetKey === 'hand:left' ? 'left' : 'right';
      const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
      if (!handItem) {
        const res = putItemInHand(player, hand, gi.item, world);
        if (res.success) {
          sound.playPickup();
          world.groundItems = (world.groundItems || []).filter(item => item.id !== gi.id);
          forceRender(n => n + 1);
          return;
        }
      }
    } else if (targetKey && targetKey.startsWith('inv:')) {
      const slotIdx = parseInt(targetKey.replace('inv:', ''), 10);
      if (!isNaN(slotIdx) && slotIdx >= 0) {
        if (!player.inventory) player.inventory = [];
        if (!player.inventory[slotIdx]) {
          const fit = canItemFitInCompartment(player, slotIdx, gi.item);
          if (fit.fits) {
            player.inventory[slotIdx] = gi.item;
            sound.playPickup();
            world.groundItems = (world.groundItems || []).filter(item => item.id !== gi.id);
            forceRender(n => n + 1);
            return;
          }
        }
      }
    }

    const added = addItemToPlayer(player, gi.item);
    if (added) {
      sound.playPickup();
      world.groundItems = (world.groundItems || []).filter(item => item.id !== gi.id);
      forceRender(n => n + 1);
    }
  };

  const availableContainers = [
    ...(player.inventory || []).filter(i => i && i.isContainer && !i.singleUseContainer && !i.tornItemId && !i.itemId.startsWith('paper_packaging')),
    ...(player.leftHandItem && player.leftHandItem.isContainer && !player.leftHandItem.singleUseContainer && !player.leftHandItem.tornItemId && !player.leftHandItem.itemId.startsWith('paper_packaging') ? [player.leftHandItem] : []),
    ...(player.rightHandItem && player.rightHandItem.isContainer && !player.rightHandItem.singleUseContainer && !player.rightHandItem.tornItemId && !player.rightHandItem.itemId.startsWith('paper_packaging') ? [player.rightHandItem] : []),
    ...(player.equippedClothing?.back?.outerwear?.isContainer ? [player.equippedClothing.back.outerwear] : [])
  ];

  const CLOTHING_SLOT_LABELS: Record<string, string> = {
    head: 'Голова',
    eyes: 'Глаза и очки',
    neck: 'Шея',
    torso: 'Торс и корпус',
    hands: 'Кисти и перчатки',
    legs: 'Ноги и брюки',
    feet: 'Обувь',
    back: 'Спина и рюкзак'
  };

  const CLOTHING_LAYER_LABELS: Record<string, string> = {
    underwear: 'Нижний слой',
    shirt: 'Рубашка / Кофта',
    sweater: 'Утепляющий слой',
    outerwear: 'Верхний слой',
    vest: 'Разгрузка / Жилет',
    accessory: 'Аксессуар'
  };

  // ==================== 10-SLOT INTERACTION WORKBENCH STATE & HELPERS ====================
  const pAny = player as any;
  if (!pAny._interactionInputs) {
    pAny._interactionInputs = [null, null, null, null] as InteractionSlotGrid4;
  }
  if (!pAny._interactionOutputs) {
    pAny._interactionOutputs = [null, null, null, null] as InteractionSlotGrid4;
  }
  const interactionInputs: InteractionSlotGrid4 = pAny._interactionInputs;
  const interactionOutputs: InteractionSlotGrid4 = pAny._interactionOutputs;

  const hasCommittedOutputs = interactionOutputs.some(it => it !== null);
  const evalResult = evaluateInteractionGrid(interactionInputs);

  const returnWorkbenchItemToPlayer = (item: InventoryItem, preferHand?: 'left' | 'right'): boolean => {
    if (preferHand === 'left' && !player.leftHandItem) {
      const res = putItemInHand(player, 'left', item, world);
      if (res.success) return true;
    }
    if (preferHand === 'right' && !player.rightHandItem) {
      const res = putItemInHand(player, 'right', item, world);
      if (res.success) return true;
    }
    if (!player.leftHandItem) {
      const res = putItemInHand(player, 'left', item, world);
      if (res.success) return true;
    }
    if (!player.rightHandItem) {
      const res = putItemInHand(player, 'right', item, world);
      if (res.success) return true;
    }
    const addedToPockets = addItemToPlayer(player, item, { preferPockets: true, skipHands: false });
    if (addedToPockets) return true;
    if (world) {
      if (!world.groundItems) world.groundItems = [];
      world.groundItems.push({
        id: `ground_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        x: player.x + (Math.random() * 14 - 7),
        y: player.y + (Math.random() * 14 - 7),
        item,
        spawnTime: Date.now()
      });
      addPlayerNotification(player, `Руки и карманы заняты — положено на землю: ${item.nameRu}`, 'warning');
      return true;
    }
    return false;
  };

  const handlePlaceHandIntoInput = (hand: 'left' | 'right', preferredRow: 'top' | 'bottom' | 'any' = 'any', exactSlot?: number) => {
    const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!handItem) return;

    let targetSlot = exactSlot;
    if (targetSlot === undefined) {
      const candidateIndices =
        preferredRow === 'top' ? [0, 1, 2, 3] : preferredRow === 'bottom' ? [2, 3, 0, 1] : [0, 2, 1, 3];
      targetSlot = candidateIndices.find(idx => interactionInputs[idx] === null);
    }
    if (targetSlot === undefined || targetSlot < 0 || targetSlot > 3) {
      addPlayerNotification(player, 'Все 4 слота ввода уже заняты!', 'warning');
      return;
    }

    const taken = takeItemFromHand(player, hand);
    if (!taken) return;

    const displaced = interactionInputs[targetSlot];
    interactionInputs[targetSlot] = taken;
    if (displaced) {
      putItemInHand(player, hand, displaced, world);
    }
    sound.playPickup();
    forceRender(n => n + 1);
  };

  const handleRemoveInputSlot = (slotIdx: number, target?: 'left' | 'right' | 'pockets') => {
    const item = interactionInputs[slotIdx];
    if (!item) return;
    interactionInputs[slotIdx] = null;
    if (target === 'pockets') {
      const added = addItemToPlayer(player, item, { preferPockets: true, skipHands: true });
      if (!added) returnWorkbenchItemToPlayer(item);
    } else {
      returnWorkbenchItemToPlayer(item, target);
    }
    sound.playPickup();
    forceRender(n => n + 1);
  };

  const handleExecuteInteraction = () => {
    if (!evalResult.isValid) return;
    if (hasCommittedOutputs) {
      for (let i = 0; i < 4; i++) {
        if (interactionOutputs[i]) {
          returnWorkbenchItemToPlayer(interactionOutputs[i]!);
          interactionOutputs[i] = null;
        }
      }
    }

    for (let i = 0; i < 4; i++) {
      interactionInputs[i] = null;
      interactionOutputs[i] = evalResult.previewOutputs[i]
        ? JSON.parse(JSON.stringify(evalResult.previewOutputs[i]))
        : null;
    }

    if (evalResult.kind === 'pour_liquid' || evalResult.kind === 'mix_liquid') {
      sound.playWaterSpray();
    } else {
      sound.playUseItem();
    }
    addPlayerNotification(player, `${evalResult.title}: ${evalResult.subtitle}`, 'heal');
    forceRender(n => n + 1);
  };

  const handleClaimOutputSlot = (slotIdx: number, target?: 'left' | 'right' | 'pockets') => {
    const item = interactionOutputs[slotIdx];
    if (!item) return;
    interactionOutputs[slotIdx] = null;
    if (target === 'pockets') {
      const added = addItemToPlayer(player, item, { preferPockets: true, skipHands: true });
      if (!added) returnWorkbenchItemToPlayer(item);
    } else {
      returnWorkbenchItemToPlayer(item, target);
    }
    sound.playPickup();
    forceRender(n => n + 1);
  };

  const workbenchActiveCount =
    interactionInputs.filter(Boolean).length + interactionOutputs.filter(Boolean).length;

  // ==================== UNIFIED CUSTOM POINTER DRAG-AND-DROP ENGINE ====================
  const ensureOutputsCommitted = (): boolean => {
    if (hasCommittedOutputs) return true;
    if (!evalResult.isValid) return false;
    for (let i = 0; i < 4; i++) {
      interactionInputs[i] = null;
      interactionOutputs[i] = evalResult.previewOutputs[i]
        ? JSON.parse(JSON.stringify(evalResult.previewOutputs[i]))
        : null;
    }
    if (evalResult.kind === 'pour_liquid' || evalResult.kind === 'mix_liquid') {
      sound.playWaterSpray();
    } else {
      sound.playUseItem();
    }
    return true;
  };

  const getSlotFillInfo = (item: InventoryItem | null | undefined) => {
    if (!item) return null;
    const wrap = getEffectiveFluidWrapper(item);
    if (wrap) {
      const st = wrap.state;
      const liq = st.liquidId ? LIQUID_REGISTRY[st.liquidId as LiquidId] : undefined;
      const unit = liq?.isGranular || wrap.isGranularContainer ? 'г' : 'мл';
      const pct = st.maxMl > 0 ? Math.max(0, Math.min(100, Math.round((st.currentMl / st.maxMl) * 100))) : 0;
      const subName =
        st.currentMl <= 0 || !st.liquidId
          ? 'Пусто'
          : st.attributes?.varietyRu || liq?.nameRu || st.liquidId;
      const color = st.attributes?.customColor || liq?.color || '#38bdf8';
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
    return {
      pct,
      color: undefined,
      tooltip: `${item.nameRu}\n${formatWeightRu(getItemTotalWeight(item))} · ${getItemTotalVolume(item)} л`,
    };
  };

  // Universal drop handler across all InventoryModal tabs & views:
  // Slot keys:
  // - 'hand:left' | 'hand:right'
  // - 'inv:<slotIdx>'
  // - 'cont:<cIdx>' | 'cont:empty-<idx>' | 'zone:container'
  // - 'input:<0..3>' | 'output:<0..3>'
  // - 'ground:<id>' | 'ground:empty-<idx>' | 'zone:ground'
  // - 'cloth:<slot>:<layer>' | 'zone:clothing'
  // - 'zone:pockets'
  const handleUnifiedSlotDrop = (targetKey: string, sourceKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return;
    if (targetKey.startsWith('output:')) return;

    // 1. Moving between two inventory slots ('inv:A' -> 'inv:B')
    if (sourceKey.startsWith('inv:') && targetKey.startsWith('inv:')) {
      const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
      const toIdx = parseInt(targetKey.replace('inv:', ''), 10);
      if (isNaN(fromIdx) || isNaN(toIdx) || fromIdx === toIdx) return;
      const fromItem = player.inventory?.[fromIdx];
      const toItem = player.inventory?.[toIdx];
      if (!fromItem) return;

      // If target slot contains a container (and isn't the same item), try putting inside the container
      if (
        toItem &&
        toItem.isContainer &&
        !toItem.singleUseContainer &&
        toItem.id !== fromItem.id &&
        canItemFitInContainer(toItem, fromItem).fits
      ) {
        handlePutIntoContainer(toItem, fromIdx);
        return;
      }

      if (moveInventoryItem(player, fromIdx, toIdx)) {
        sound.playPickup();
        setSelectedHand(null);
        setSelectedIndex(toIdx);
        forceRender(n => n + 1);
      }
      return;
    }

    // 2. Inventory slot <-> Hand slot
    if (sourceKey.startsWith('inv:') && (targetKey === 'hand:left' || targetKey === 'hand:right')) {
      const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
      const tgtHand = targetKey === 'hand:left' ? 'left' : 'right';
      if (!isNaN(fromIdx)) {
        handleTakeToHand(tgtHand, fromIdx);
        setSelectedHand(tgtHand);
      }
      return;
    }

    if ((sourceKey === 'hand:left' || sourceKey === 'hand:right') && targetKey.startsWith('inv:')) {
      const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
      const toIdx = parseInt(targetKey.replace('inv:', ''), 10);
      if (!isNaN(toIdx)) {
        handleStowHand(srcHand, toIdx);
        setSelectedHand(null);
        setSelectedIndex(toIdx);
      }
      return;
    }

    if ((sourceKey === 'hand:left' || sourceKey === 'hand:right') && targetKey === 'zone:pockets') {
      const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
      handleStowHand(srcHand);
      setSelectedHand(null);
      return;
    }

    // 3. Hand <-> Hand swap
    if (
      (sourceKey === 'hand:left' || sourceKey === 'hand:right') &&
      (targetKey === 'hand:left' || targetKey === 'hand:right')
    ) {
      const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
      const tgtHand = targetKey === 'hand:left' ? 'left' : 'right';
      const srcItem = takeItemFromHand(player, srcHand);
      if (!srcItem) return;
      const displaced = takeItemFromHand(player, tgtHand);
      putItemInHand(player, tgtHand, srcItem, world);
      if (displaced) {
        putItemInHand(player, srcHand, displaced, world);
      }
      sound.playPickup();
      setSelectedHand(tgtHand);
      forceRender(n => n + 1);
      return;
    }

    // 4. Opened Container ('cont:*' or 'zone:container') <-> Hands / Pockets
    if (openContainer) {
      const isTargetContainer = targetKey.startsWith('cont:') || targetKey === 'zone:container';
      const isSourceContainer = sourceKey.startsWith('cont:') && !sourceKey.startsWith('cont:empty-');

      if (isTargetContainer && sourceKey.startsWith('inv:')) {
        const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
        if (!isNaN(fromIdx)) {
          handlePutIntoContainer(openContainer, fromIdx);
        }
        return;
      }

      if (isTargetContainer && (sourceKey === 'hand:left' || sourceKey === 'hand:right')) {
        const hand = sourceKey === 'hand:left' ? 'left' : 'right';
        const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
        if (!handItem) return;
        if (handItem.id === openContainer.id) {
          addPlayerNotification(player, 'Нельзя положить контейнер сам в себя!', 'warning');
          return;
        }
        const taken = takeItemFromHand(player, hand);
        if (taken) {
          const res = addItemToContainer(openContainer, taken);
          if (res.success) {
            sound.playPickup();
            addPlayerNotification(player, res.message, 'pickup');
            forceRender(n => n + 1);
          } else {
            putItemInHand(player, hand, taken, world);
            addPlayerNotification(player, res.message, 'warning');
          }
        }
        return;
      }

      if (isSourceContainer) {
        const cIdx = parseInt(sourceKey.replace('cont:', ''), 10);
        if (isNaN(cIdx)) return;
        if (targetKey === 'hand:left' || targetKey === 'hand:right') {
          handleExtractFromContainer(openContainer, cIdx, targetKey === 'hand:left' ? 'leftHand' : 'rightHand');
          return;
        }
        if (targetKey.startsWith('inv:')) {
          const toSlotIdx = parseInt(targetKey.replace('inv:', ''), 10);
          handleExtractFromContainer(openContainer, cIdx, 'pockets', isNaN(toSlotIdx) ? undefined : toSlotIdx);
          return;
        }
        if (targetKey === 'zone:pockets') {
          handleExtractFromContainer(openContainer, cIdx, 'pockets');
          return;
        }
      }
    }

    // 5. Ground ('ground:*' / 'zone:ground') <-> Hands / Pockets
    if (sourceKey.startsWith('ground:') && !sourceKey.startsWith('ground:empty-')) {
      const groundId = sourceKey.replace('ground:', '');
      const gi = nearbyGroundItems.find(g => g.id === groundId);
      if (gi) {
        handlePickupGroundItem(gi, targetKey);
      }
      return;
    }

    if (targetKey.startsWith('ground:') || targetKey === 'zone:ground') {
      if (sourceKey.startsWith('inv:')) {
        const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
        if (!isNaN(fromIdx)) handleDropItem(fromIdx);
        return;
      }
      if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
        handleDropFromHand(sourceKey === 'hand:left' ? 'left' : 'right');
        return;
      }
    }

    // 6. Clothing ('cloth:*' / 'zone:clothing') <-> Hands / Pockets
    if (sourceKey.startsWith('cloth:')) {
      const parts = sourceKey.split(':');
      const slot = parts[1];
      const layer = parts[2];
      if (slot && layer) {
        const item = player.equippedClothing?.[slot as any]?.[layer as any];
        if (!item) return;
        handleUnequipItem(slot, layer);
      }
      return;
    }

    if (targetKey.startsWith('cloth:') || targetKey === 'zone:clothing') {
      if (sourceKey.startsWith('inv:')) {
        const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
        if (!isNaN(fromIdx)) handleEquipItem(fromIdx);
        return;
      }
      if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
        handleEquipFromHand(sourceKey === 'hand:left' ? 'left' : 'right');
        return;
      }
    }

    // 7. Interaction Workbench ('input:0..3' / 'output:0..3') <-> Hands / Input
    let draggedItem: InventoryItem | null = null;
    if (sourceKey.startsWith('output:')) {
      const outIdx = parseInt(sourceKey.replace('output:', ''), 10);
      if (isNaN(outIdx) || outIdx < 0 || outIdx > 3) return;
      if (!ensureOutputsCommitted()) return;
      draggedItem = interactionOutputs[outIdx];
      if (!draggedItem) return;
      interactionOutputs[outIdx] = null;
    } else if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
      const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
      draggedItem = takeItemFromHand(player, srcHand);
      if (!draggedItem) return;
    } else if (sourceKey.startsWith('input:')) {
      const inIdx = parseInt(sourceKey.replace('input:', ''), 10);
      if (isNaN(inIdx) || inIdx < 0 || inIdx > 3) return;
      draggedItem = interactionInputs[inIdx];
      if (!draggedItem) return;
      interactionInputs[inIdx] = null;
    } else {
      return;
    }

    if (targetKey === 'hand:left' || targetKey === 'hand:right') {
      const tgtHand = targetKey === 'hand:left' ? 'left' : 'right';
      const displaced = takeItemFromHand(player, tgtHand);
      const res = putItemInHand(player, tgtHand, draggedItem, world);
      if (!res.success) {
        if (displaced) putItemInHand(player, tgtHand, displaced, world);
        returnWorkbenchItemToPlayer(draggedItem);
        forceRender(n => n + 1);
        return;
      }
      if (displaced) {
        if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
          const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
          putItemInHand(player, srcHand, displaced, world);
        } else if (sourceKey.startsWith('input:')) {
          const inIdx = parseInt(sourceKey.replace('input:', ''), 10);
          interactionInputs[inIdx] = displaced;
        } else {
          returnWorkbenchItemToPlayer(displaced);
        }
      }
      sound.playPickup();
      forceRender(n => n + 1);
      return;
    }

    if (targetKey.startsWith('input:')) {
      const tgtIdx = parseInt(targetKey.replace('input:', ''), 10);
      if (isNaN(tgtIdx) || tgtIdx < 0 || tgtIdx > 3) return;
      const displaced = interactionInputs[tgtIdx];
      interactionInputs[tgtIdx] = draggedItem;

      if (displaced) {
        if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
          const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
          putItemInHand(player, srcHand, displaced, world);
        } else if (sourceKey.startsWith('input:')) {
          const srcIdx = parseInt(sourceKey.replace('input:', ''), 10);
          interactionInputs[srcIdx] = displaced;
        } else {
          returnWorkbenchItemToPlayer(displaced);
        }
      }
      sound.playPickup();
      forceRender(n => n + 1);
    }
  };

  wbDropHandlerRef.current = handleUnifiedSlotDrop;

  const findTargetWbSlotAt = (x: number, y: number, sourceKey: string): string | null => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-wb-slot]');
    let bestKey: string | null = null;
    let bestDist = Infinity;

    nodes.forEach(node => {
      const key = node.getAttribute('data-wb-slot');
      if (!key || key === sourceKey || key.startsWith('output:')) return;
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
        if (d <= 18 && d < bestDist) {
          bestDist = d;
          bestKey = key;
        }
      }
    });

    if (!bestKey) {
      const inputGrid = document.querySelector<HTMLElement>('[data-wb-input-grid]');
      if (inputGrid) {
        const gRect = inputGrid.getBoundingClientRect();
        if (
          x >= gRect.left - 16 &&
          x <= gRect.right + 16 &&
          y >= gRect.top - 16 &&
          y <= gRect.bottom + 16
        ) {
          const emptyIdx = [0, 1, 2, 3].find(i => !interactionInputs[i]);
          const fallbackIdx = emptyIdx !== undefined ? emptyIdx : 0;
          const candidate = `input:${fallbackIdx}`;
          if (candidate !== sourceKey) return candidate;
        }
      }

      const zones = document.querySelectorAll<HTMLElement>('[data-wb-drop-zone]');
      zones.forEach(zone => {
        if (bestKey) return;
        const zKey = zone.getAttribute('data-wb-drop-zone');
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
    // Ignore clicks on nested action buttons
    if ((e.target as HTMLElement)?.closest('button')) return;
    e.stopPropagation();

    if (!item) {
      if (selectedWbSlot && selectedWbSlot !== slotKey && !slotKey.startsWith('output:')) {
        wbDropHandlerRef.current?.(slotKey, selectedWbSlot);
        setSelectedWbSlot(null);
      } else {
        onSelectClick?.();
      }
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    wbDragRef.current = {
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
      const st = wbDragRef.current;
      if (!st) return;
      st.x = ev.clientX;
      st.y = ev.clientY;
      if (!st.active && Math.hypot(ev.clientX - st.startX, ev.clientY - st.startY) > 3) {
        st.active = true;
      }
      if (st.active) {
        const over = findTargetWbSlotAt(ev.clientX, ev.clientY, st.sourceKey);
        st.overKey = over;
        setWbDragUi({
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

      const st = wbDragRef.current;
      wbDragRef.current = null;
      setWbDragUi(null);

      if (!st || cancelled) return;

      if (st.active) {
        const targetKey = findTargetWbSlotAt(ev.clientX, ev.clientY, st.sourceKey) || st.overKey;
        if (targetKey && targetKey !== st.sourceKey) {
          wbDropHandlerRef.current?.(targetKey, st.sourceKey);
          setSelectedWbSlot(null);
        }
      } else {
        onSelectClick?.();
        if (selectedWbSlot && selectedWbSlot !== slotKey && !slotKey.startsWith('output:')) {
          wbDropHandlerRef.current?.(slotKey, selectedWbSlot);
          setSelectedWbSlot(null);
        } else {
          setSelectedWbSlot(prev => (prev === slotKey ? null : slotKey));
        }
      }
    };

    const onPointerUp = (ev: PointerEvent) => finishDrag(ev, false);
    const onPointerCancel = (ev: PointerEvent) => finishDrag(ev, true);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  };

  // Compact square Hand Slot (standard .gu-slot size, rendered inside the scrollable compartment list)
  const renderHandSquareSlot = (hand: 'left' | 'right', shortBadge: string, label: string, handItem: InventoryItem | null | undefined) => {
    const slotKey = `hand:${hand}`;
    const isBeingDragged = wbDragUi?.sourceKey === slotKey;
    const isDropTarget = wbDragUi?.overKey === slotKey;
    const isSelected = selectedHand === hand || selectedWbSlot === slotKey;
    const info = getSlotFillInfo(handItem);
    const temp = handItem?.surfaceTemperature;
    const isHot = temp !== undefined && temp >= 40;
    const isCold = temp !== undefined && temp <= 4;

    return (
      <div
        key={slotKey}
        id={`inv-${hand}-hand-card`}
        data-wb-slot={slotKey}
        draggable={false}
        onDragStart={e => e.preventDefault()}
        onPointerDown={e =>
          startSlotPointerDrag(e, slotKey, handItem, () => {
            setSelectedHand(hand);
          })
        }
        onDoubleClick={() => {
          if (!handItem) return;
          if (handItem.isContainer && !handItem.singleUseContainer) {
            setOpenContainer(handItem);
            setSelectedContainerItemIdx(0);
          } else {
            handleStowHand(hand);
          }
        }}
        className={
          'gu-slot' +
          (!handItem ? ' empty' : '') +
          (isDropTarget || isSelected ? ' on' : '') +
          (isHot ? ' hot' : '') +
          (isCold ? ' cold' : '')
        }
        style={{
          touchAction: 'none',
          cursor: handItem ? 'grab' : selectedWbSlot ? 'pointer' : 'default',
          opacity: isBeingDragged ? 0.35 : 1,
          borderColor: isDropTarget ? 'var(--gu-amber-hi)' : undefined,
        }}
        title={info ? `${label}: ${info.tooltip}` : `${label} (пусто — перетащите предмет)`}
      >
        <span className="gu-ic-hk" style={{ pointerEvents: 'none' }}>{shortBadge}</span>
        {handItem ? (
          <>
            <ItemIconCanvas itemId={handItem.itemId} item={handItem} size={44} />
            {handItem.count > 1 ? (
              <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>{handItem.count}</span>
            ) : handItem.isContainer ? (
              <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>{handItem.contents?.length || 0}</span>
            ) : null}
            {isHot && <span className="gu-slot-t" style={{ pointerEvents: 'none' }}>+{Math.round(temp!)}°</span>}
            {isCold && <span className="gu-slot-t cold" style={{ pointerEvents: 'none' }}>{Math.round(temp!)}°</span>}
            {(handItem.wetness ?? 0) > 0 && (
              <span className="gu-slot-wet" style={{ pointerEvents: 'none' }}>
                <CloudRain width={11} height={11} />
              </span>
            )}
            {info && info.pct !== null && (
              <div className="gu-ic-fill" style={{ pointerEvents: 'none' }}>
                <i style={{ width: `${info.pct}%`, background: info.color || undefined }} />
              </div>
            )}
          </>
        ) : (
          <Hand width={18} height={18} color="#5e5b54" style={{ pointerEvents: 'none' }} />
        )}
      </div>
    );
  };

  // Reusable Player Hand + Compartments Slot Grid (all inside the scroll block)
  const renderCompartmentsSlotGrid = () => {
    const getCompIcon = (type: string, size = 15) => {
      if (type === 'user') return <User width={size} height={size} />;
      if (type === 'shirt') return <Shirt width={size} height={size} />;
      if (type === 'pants')
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12l1 18-5-1-2-9-2 9-5 1z" />
          </svg>
        );
      return <Luggage width={size} height={size} />;
    };

    const handsCount = (player.leftHandItem ? 1 : 0) + (player.rightHandItem ? 1 : 0);

    return (
      <div data-wb-drop-zone="zone:pockets">
        {/* Hands as the first compact slot group inside the scroll container */}
        <div className="gu-group">
          <div className="gu-group-h">
            <span className="gu-group-t">
              <Hand width={15} height={15} />
              Активные руки
            </span>
            <span className="gu-grp-meta gu-mono">
              {handsCount}/2 слота · Лев: {player.leftHandItem ? player.leftHandItem.nameRu : 'пусто'} · Прав: {player.rightHandItem ? player.rightHandItem.nameRu : 'пусто'}
            </span>
          </div>
          <div className="gu-slots">
            {renderHandSquareSlot('left', 'Л', 'Левая рука', player.leftHandItem)}
            {renderHandSquareSlot('right', 'П', 'Правая рука', player.rightHandItem)}
          </div>
        </div>
        {compartments.map(comp => {
          const slots = Array.from({ length: comp.slotCount }, (_, l) => comp.startIndex + l);
          const compVolumePct = Math.round((comp.usedVolumeL / comp.capacityL) * 100);
          const compWeightPct = Math.round((comp.usedWeightKg / comp.maxWeightKg) * 100);

          return (
            <div key={comp.id} className="gu-group">
              <div className="gu-group-h">
                <span className="gu-group-t">
                  {getCompIcon(comp.iconType)}
                  {comp.nameRu}
                </span>
                <span className="gu-grp-meta gu-mono">
                  <span className={compVolumePct > 95 ? 'bad' : ''}>{comp.usedVolumeL}/{comp.capacityL} л</span>
                  {' · '}
                  <span className={compWeightPct > 95 ? 'bad' : ''}>{comp.usedWeightKg}/{comp.maxWeightKg} кг</span>
                </span>
              </div>

              <div className="gu-slots">
                {slots.map(slotIdx => {
                  const item = inventory[slotIdx];
                  const slotKey = `inv:${slotIdx}`;
                  const isBeingDragged = wbDragUi?.sourceKey === slotKey;
                  const isDropTarget = wbDragUi?.overKey === slotKey;
                  const isSelected = (!selectedHand && selectedIndex === slotIdx) || selectedWbSlot === slotKey;

                  if (!item) {
                    return (
                      <div
                        key={slotIdx}
                        id={`inventory-slot-${slotIdx}`}
                        data-wb-slot={slotKey}
                        draggable={false}
                        onDragStart={e => e.preventDefault()}
                        onPointerDown={e =>
                          startSlotPointerDrag(e, slotKey, null, () => {
                            setSelectedHand(null);
                            setSelectedIndex(slotIdx);
                          })
                        }
                        className={'gu-slot empty' + (isDropTarget ? ' on' : '')}
                        style={{
                          touchAction: 'none',
                          borderColor: isDropTarget ? 'var(--gu-amber-hi)' : undefined,
                        }}
                      >
                        {slotIdx < 6 && <span className="gu-ic-hk">{slotIdx + 1}</span>}
                      </div>
                    );
                  }

                  const temp = item.surfaceTemperature;
                  const isHot = temp !== undefined && temp >= 40;
                  const isCold = temp !== undefined && temp <= 4;
                  const info = getSlotFillInfo(item);

                  return (
                    <div
                      key={slotIdx}
                      id={`inventory-slot-${slotIdx}`}
                      data-wb-slot={slotKey}
                      draggable={false}
                      onDragStart={e => e.preventDefault()}
                      onPointerDown={e =>
                        startSlotPointerDrag(e, slotKey, item, () => {
                          setSelectedHand(null);
                          setSelectedIndex(slotIdx);
                        })
                      }
                      onDoubleClick={() => {
                        if (openContainer) {
                          if (item.id !== openContainer.id) {
                            handlePutIntoContainer(openContainer, slotIdx);
                          }
                          return;
                        }
                        if (
                          item.isContainer &&
                          !item.singleUseContainer &&
                          !(
                            (item.isOpen ||
                              item.itemId === 'pouch_sealed_snack_torn' ||
                              item.itemId === 'egg_carton_10_open' ||
                              item.itemId === 'lukoshko') &&
                            item.contents &&
                            item.contents.length > 0
                          )
                        ) {
                          setOpenContainer(item);
                          setSelectedContainerItemIdx(0);
                        } else {
                          handleUseItem(slotIdx);
                        }
                      }}
                      className={
                        'gu-slot' +
                        (isSelected || isDropTarget ? ' on' : '') +
                        (matchesFilter(item) ? '' : ' dim') +
                        (isHot ? ' hot' : '') +
                        (isCold ? ' cold' : '')
                      }
                      style={{
                        touchAction: 'none',
                        cursor: 'grab',
                        opacity: isBeingDragged ? 0.35 : 1,
                        borderColor: isDropTarget ? 'var(--gu-amber-hi)' : undefined,
                      }}
                      title={info?.tooltip}
                    >
                      {slotIdx < 6 && <span className="gu-ic-hk" style={{ pointerEvents: 'none' }}>{slotIdx + 1}</span>}
                      <ItemIconCanvas itemId={item.itemId} item={item} size={44} />
                      {item.count > 1 ? (
                        <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>{item.count}</span>
                      ) : item.isContainer ? (
                        <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>{item.contents?.length || 0}</span>
                      ) : null}
                      {isHot && <span className="gu-slot-t" style={{ pointerEvents: 'none' }}>+{Math.round(temp!)}°</span>}
                      {isCold && <span className="gu-slot-t cold" style={{ pointerEvents: 'none' }}>{Math.round(temp!)}°</span>}
                      {(item.wetness ?? 0) > 0 && (
                        <span className="gu-slot-wet" style={{ pointerEvents: 'none' }}>
                          <CloudRain width={11} height={11} />
                        </span>
                      )}
                      {info && info.pct !== null && (
                        <div className="gu-ic-fill" style={{ pointerEvents: 'none' }}>
                          <i style={{ width: `${info.pct}%`, background: info.color || undefined }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ModalShell
      id="inventory-modal"
      title="Инвентарь и нагрузка"
      subtitle="Физический объём (л), вес (кг), карманы и активные руки"
      width={1140}
      tall={activeTab !== 'interaction'}
      onClose={onClose}
      wipeKey={activeTab + '-' + (openContainer?.id || 'root')}
      headRight={
        <div className="gu-row2 gu-hide-s" style={{ gap: 6 }}>
          <div className="gu-chip">
            <Weight width={14} height={14} color="#c9922b" />
            <span className="gu-mut">Вес:</span>
            <strong className="gu-mono" style={{ color: '#fff' }}>{carriedWeight} кг</strong>
          </div>
          <div className="gu-chip">
            <span className="gu-mut">Скорость:</span>
            <strong className="gu-mono" style={{ color: weightSpeedPct >= 95 ? '#9ac985' : weightSpeedPct >= 70 ? '#f0c264' : '#efa690' }}>
              {weightSpeedPct}%{isBulkyHand ? ' (Груз)' : ''}
            </strong>
          </div>
          <div className="gu-chip">
            <span className="gu-mut">Карманы:</span>
            <strong className="gu-mono" style={{ color: '#e0ab45' }}>{pocketCap.usedVolumeL} / {pocketCap.totalCapacityL} л</strong>
          </div>
        </div>
      }
      tabs={
        <div className="gu-tabs-bar">
          <Tabs
            value={activeTab}
            onChange={t => {
              sound.playButtonPress();
              setActiveTab(t);
              setOpenContainer(null);
            }}
            items={[
              {
                id: 'inventory',
                label: 'Карманы',
                icon: <Package width={16} height={16} />,
                badge: inventory.filter(Boolean).length
              },
              {
                id: 'interaction',
                label: 'Взаимодействие',
                icon: <Layers width={16} height={16} />,
                badge: workbenchActiveCount > 0 ? workbenchActiveCount : undefined
              },
              {
                id: 'surroundings',
                label: 'Рядом',
                icon: <Sparkles width={16} height={16} />,
                badge: nearbyGroundItems.length
              },
              {
                id: 'clothing',
                label: 'Одежда',
                icon: <Shirt width={16} height={16} />
              }
            ]}
          />

          {activeTab === 'inventory' && !openContainer && (
            <div className="gu-pills">
              {[
                { id: 'all', label: 'Все' },
                { id: 'food', label: 'Еда' },
                { id: 'drink', label: 'Напитки' },
                { id: 'med', label: 'Медицина' },
                { id: 'tool', label: 'Инструменты' },
                { id: 'valuable', label: 'Ценности' }
              ].map(cat => {
                const on = selectedCategory === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    id={`filter-cat-${cat.id}`}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={'gu-pill' + (on ? ' on' : '')}
                  >
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      }
      footerHints={[
        ['Esc / I', 'Закрыть'],
        ['2× Клик', 'Использовать'],
        ['Перетаскивание', 'В любой слот / руку']
      ]}
      footerRight={
        <span className="gu-mut" style={{ fontSize: 12 }}>
          Лев: <strong style={{ color: '#e9e6df' }}>{player.leftHandItem ? player.leftHandItem.nameRu : 'Свободна'}</strong>
          {' · '}
          Прав: <strong style={{ color: '#e9e6df' }}>{player.rightHandItem ? player.rightHandItem.nameRu : 'Свободна'}</strong>
        </span>
      }
    >
      <div className="gu-stagger gu-inv-root">
        {/* ==================== TAB 1: INVENTORY & POCKETS ==================== */}
        {activeTab === 'inventory' && !openContainer && (
          <div className="gu-inv-split">
            {/* LEFT: PINNED HAND SLOTS + SCROLLABLE COMPARTMENTS & CONTAINERS */}
            <div className="gu-inv-left">
              {(!hasWallet || !hasBag) && (
                <div className="gu-note gu-warn gu-row2" style={{ flex: 'none', justifyContent: 'space-between', padding: '7px 10px' }}>
                  <div className="gu-row2" style={{ gap: 6, fontSize: 12 }}>
                    <Sparkles width={14} height={14} />
                    <span>
                      {!hasWallet && !hasBag
                        ? 'Кошелёк и пакет не найдены в инвентаре'
                        : !hasWallet
                        ? 'Кожаный бумажник не найден'
                        : 'Пакет для покупок не найден'}
                    </span>
                  </div>
                  <button
                    type="button"
                    id="btn-restore-containers"
                    className="gu-btn gu-btn-p gu-btn-xs"
                    onClick={() => {
                      restoreStarterContainers(player);
                      forceRender(n => n + 1);
                    }}
                  >
                    Восстановить
                  </button>
                </div>
              )}

              {/* Scrollable Hands, Compartments & Carried Containers */}
              <div className="gu-inv-left-scroll">
                <div className="gu-panel" style={{ padding: '10px 12px' }}>
                  {renderCompartmentsSlotGrid()}
                </div>

                {/* Standalone Carried Containers */}
                {(() => {
                  const pocketContainers = (player.inventory || []).filter(i => i && i.isContainer && !i.singleUseContainer && !i.tornItemId);
                  const handContainers = [player.leftHandItem, player.rightHandItem].filter(
                    i => i && i.isContainer && !i.singleUseContainer && !i.tornItemId
                  ) as InventoryItem[];
                  const allContainers: { item: InventoryItem; source: string }[] = [];

                  pocketContainers.forEach(c => allContainers.push({ item: c, source: 'В карманах' }));
                  handContainers.forEach(c => allContainers.push({ item: c, source: 'В руке' }));

                  if (allContainers.length === 0) return null;

                  return (
                    <div className="gu-panel" style={{ padding: '8px 10px' }}>
                      <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                        <span className="gu-grp" style={{ fontSize: 11.5 }}>Контейнеры и кошельки ({allContainers.length})</span>
                        <span className="gu-mut gu-hide-s" style={{ fontSize: 11 }}>Клик — открыть в 2 столбика</span>
                      </div>

                      <div className="gu-grid gu-g2" style={{ gap: 6 }}>
                        {allContainers.map((entry, cIdx) => {
                          const cItem = entry.item;
                          const count = cItem.contents?.length || 0;
                          const maxVol = cItem.containerCapacityL || 20;
                          const curVol = (cItem.contents || []).reduce((acc, it) => acc + getItemTotalVolume(it), 0);

                          return (
                            <div key={cIdx} className="gu-card-sm gu-row2" style={{ justifyContent: 'space-between', padding: '6px 8px', gap: 8 }}>
                              <div className="gu-row2" style={{ minWidth: 0, gap: 8 }}>
                                <div className="gu-ic" style={{ width: 34, height: 34 }}>
                                  <ItemIconCanvas itemId={cItem.itemId} item={cItem} size={30} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: 12.5, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {cItem.nameRu}
                                  </div>
                                  <div className="gu-mut gu-mono" style={{ fontSize: 10.5 }}>
                                    {count} предм. · {curVol.toFixed(1)}/{maxVol} л
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="gu-btn gu-btn-p gu-btn-xs"
                                style={{ flexShrink: 0 }}
                                onClick={() => {
                                  setOpenContainer(cItem);
                                  setSelectedContainerItemIdx(0);
                                }}
                              >
                                Открыть
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* RIGHT: PINNED HEADER + SCROLLABLE SPECS + PINNED ACTION FOOTER */}
            <div className="gu-panel gu-inv-detail">
              {selectedEntry && selectedEntry.item ? (
                <>
                  {/* Pinned Item Header */}
                  <div className="gu-row2" style={{ flex: 'none', alignItems: 'flex-start', gap: 10, paddingBottom: 8, borderBottom: '1px solid var(--gu-line)' }}>
                    <div className="gu-ic gu-md" style={{ width: 48, height: 48, flexShrink: 0 }}>
                      <ItemIconCanvas itemId={selectedEntry.item.itemId} item={selectedEntry.item} size={44} />
                    </div>
                    <div className="gu-grow" style={{ minWidth: 0 }}>
                      <div className="gu-cn" style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedEntry.item.nameRu}
                      </div>
                      <div className="gu-mut gu-mono" style={{ fontSize: 11.5, marginTop: 3 }}>
                        <span style={{ color: 'var(--gu-amber-hi)' }}>
                          {selectedEntry.item.category === 'food'
                            ? 'Еда'
                            : selectedEntry.item.category === 'drink'
                            ? 'Напиток'
                            : selectedEntry.item.category === 'med'
                            ? 'Медицина'
                            : selectedEntry.item.category === 'tool'
                            ? 'Инструмент'
                            : 'Предмет'}
                        </span>
                        {' · '}
                        {selectedEntry.item.count} шт.
                        {' · '}
                        {formatWeightRu(getItemTotalWeight(selectedEntry.item))}
                        {' · '}
                        <strong style={{ color: '#e9e6df' }}>{getItemTotalVolume(selectedEntry.item)} л</strong>
                      </div>
                      {selectedEntry.hand ? (
                        <div className="gu-mut" style={{ fontSize: 11, marginTop: 2 }}>
                          <span style={{ color: 'var(--gu-amber-soft)' }}>
                            {selectedEntry.hand === 'left' ? 'Левая рука' : 'Правая рука'}
                          </span>
                        </div>
                      ) : (() => {
                        const slotComp = getSlotCompartment(player, selectedEntry.originalIndex);
                        if (!slotComp) return null;
                        return (
                          <div className="gu-mut" style={{ fontSize: 11, marginTop: 2 }}>
                            <span style={{ color: 'var(--gu-amber-soft)' }}>{slotComp.compartment.nameRu}</span>
                            {slotComp.compartment.sourceItemNameRu && slotComp.compartment.id !== 'base' && (
                              <span> ({slotComp.compartment.sourceItemNameRu})</span>
                            )}
                            <span> · Слот #{selectedEntry.originalIndex + 1}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Middle Scrollable Specs */}
                  <div className="gu-inv-detail-scroll">
                    <div className="gu-note" style={{ lineHeight: 1.4, padding: '7px 10px', fontSize: 12, color: 'var(--gu-ink-dim)' }}>
                      {selectedEntry.item.descriptionRu}
                    </div>

                    {/* Packaging Attributes */}
                    {(selectedEntry.item.packagingShape ||
                      selectedEntry.item.packagingShapeNameRu ||
                      selectedEntry.item.packagingSize ||
                      selectedEntry.item.itemId.startsWith('candy_pouch') ||
                      selectedEntry.item.itemId.startsWith('paper_packaging')) && (() => {
                      const it = selectedEntry.item;
                      const isCandy = it.itemId.startsWith('candy_pouch');
                      const isOpenPkg = Boolean(it.isOpen || it.itemId.includes('_open') || !it.singleUseContainer);
                      const sizeLabels: Record<string, string> = {
                        mini: 'Мини',
                        small: 'Малая',
                        medium: 'Средняя',
                        large: 'Большая'
                      };
                      const shapeLabel =
                        it.packagingShapeNameRu ||
                        (it.packagingShape
                          ? getCandyPackagingShapeNameRu(it.packagingShape)
                          : isCandy
                          ? 'Пластиковый пакет'
                          : 'Пергамент-брикет');

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                            <span className="gu-grp" style={{ fontSize: 11 }}>Упаковка</span>
                            <span className="gu-mut gu-mono" style={{ fontSize: 11, color: 'var(--gu-amber-hi)' }}>
                              {isOpenPkg ? 'Вскрыта' : 'Запаяна'}
                            </span>
                          </div>
                          <div className="gu-kv-grid gu-g4 gu-kv-compact">
                            <div className="gu-kv">
                              <span className="gu-kv-k">Форма</span>
                              <span className="gu-kv-v">{shapeLabel}</span>
                            </div>
                            <div className="gu-kv">
                              <span className="gu-kv-k">Размер</span>
                              <span className="gu-kv-v">{sizeLabels[it.packagingSize || 'medium'] || 'Стандарт'}</span>
                            </div>
                            <div className="gu-kv">
                              <span className="gu-kv-k">Материал</span>
                              <span className="gu-kv-v">{isCandy ? 'Пластик' : 'Пергамент'}</span>
                            </div>
                            <div className="gu-kv">
                              <span className="gu-kv-k">Объём</span>
                              <span className="gu-kv-v">{it.containerCapacityL ? `${it.containerCapacityL} л` : '—'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Gummy Candy Attributes */}
                    {selectedEntry.item.gummyAttributes && (() => {
                      const g = selectedEntry.item.gummyAttributes!;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                            <span className="gu-grp" style={{ fontSize: 11 }}>Мармелад</span>
                            {g.sourDust && (
                              <span className="gu-mut" style={{ fontSize: 11, color: 'var(--gu-amber-hi)' }}>
                                Кислая посыпка
                              </span>
                            )}
                          </div>
                          <div className="gu-kv-grid gu-g3 gu-kv-compact">
                            <div className="gu-kv">
                              <span className="gu-kv-k">Цвет</span>
                              <span className="gu-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span
                                  style={{
                                    width: 9,
                                    height: 9,
                                    borderRadius: 2,
                                    backgroundColor: g.color,
                                    border: '1px solid rgba(255,255,255,0.35)',
                                    display: 'inline-block',
                                    flexShrink: 0
                                  }}
                                />
                                <span>{g.colorNameRu}</span>
                              </span>
                            </div>
                            <div className="gu-kv">
                              <span className="gu-kv-k">Форма</span>
                              <span className="gu-kv-v">{g.shapeNameRu}</span>
                            </div>
                            {g.flavorRu && (
                              <div className="gu-kv">
                                <span className="gu-kv-k">Вкус</span>
                                <span className="gu-kv-v">{g.flavorRu}</span>
                              </div>
                            )}
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Состав</span>
                              <span className="gu-kv-v" style={{ fontSize: 11, lineHeight: 1.3, color: 'var(--gu-ink-soft)', whiteSpace: 'normal' }}>
                                {g.ingredients.join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Thermodynamics */}
                    {(() => {
                      const thermalInfo = getItemThermalDisplayInfo(selectedEntry.item);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                            <span className="gu-grp" style={{ fontSize: 11 }}>Термодинамика</span>
                            {thermalInfo.hazardBadge && (
                              <span className="gu-tag bad" style={{ height: 18, padding: '0 6px', fontSize: 10 }}>
                                <Flame width={10} height={10} />
                                {thermalInfo.hazardBadge.text}
                              </span>
                            )}
                          </div>
                          <div className="gu-kv-grid gu-g4 gu-kv-compact">
                            <div className="gu-kv">
                              <span className="gu-kv-k">Внутри</span>
                              <span className="gu-kv-v">{thermalInfo.coreTempText}</span>
                            </div>
                            <div className="gu-kv">
                              <span className="gu-kv-k">Снаружи</span>
                              <span className="gu-kv-v">{thermalInfo.surfaceTempText}</span>
                            </div>
                            <div className="gu-kv">
                              <span className="gu-kv-k">Потеря</span>
                              <span className="gu-kv-v">{thermalInfo.heatLossText}</span>
                            </div>
                            <div className="gu-kv">
                              <span className="gu-kv-k">Удержание</span>
                              <span className="gu-kv-v">{thermalInfo.retentionText}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Nutritional Profile */}
                    {selectedEntry.item.nutrients && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                          <span className="gu-grp" style={{ fontSize: 11 }}>Пищевая ценность (БЖУ)</span>
                          <span className="gu-mut gu-mono" style={{ fontSize: 11, color: 'var(--gu-amber-hi)' }}>
                            {selectedEntry.item.nutrients.calories} ккал
                          </span>
                        </div>
                        <div className="gu-kv-grid gu-g4 gu-kv-compact">
                          <div className="gu-kv">
                            <span className="gu-kv-k">Белки</span>
                            <span className="gu-kv-v">{selectedEntry.item.nutrients.proteins} г</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Жиры</span>
                            <span className="gu-kv-v" style={{ color: '#f0c264' }}>{selectedEntry.item.nutrients.fats} г</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Углеводы</span>
                            <span className="gu-kv-v">{selectedEntry.item.nutrients.carbs} г</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Сахар{selectedEntry.item.nutrients.salt !== undefined ? ' / Соль' : ''}</span>
                            <span className="gu-kv-v">
                              {selectedEntry.item.nutrients.sugars} г{selectedEntry.item.nutrients.salt !== undefined ? ` · ${selectedEntry.item.nutrients.salt} г` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Smartphone Specs */}
                    {selectedEntry.item.phoneSpecs && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                          <span className="gu-grp" style={{ fontSize: 11 }}>{selectedEntry.item.phoneSpecs.modelName}</span>
                          <span className="gu-mut gu-mono" style={{ fontSize: 11 }}>{selectedEntry.item.phoneSpecs.osName}</span>
                        </div>
                        <div className="gu-kv-grid gu-g4 gu-kv-compact">
                          <div className="gu-kv">
                            <span className="gu-kv-k">Экран</span>
                            <span className="gu-kv-v">{selectedEntry.item.phoneSpecs.screenSize} ({selectedEntry.item.phoneSpecs.refreshRateHz}Hz)</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Камера</span>
                            <span className="gu-kv-v">{selectedEntry.item.phoneSpecs.cameraMegaPixels} MP</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Память</span>
                            <span className="gu-kv-v">{selectedEntry.item.phoneSpecs.storageGb} GB</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Батарея</span>
                            <span className="gu-kv-v">{selectedEntry.item.phoneSpecs.batteryCapacityMah} мАч</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pinned Action Footer */}
                  <div className="gu-inv-detail-foot">
                    {selectedEntry.hand ? (
                      <>
                        {selectedEntry.item.clothingStats && (
                          <button
                            type="button"
                            className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                            onClick={() => handleEquipFromHand(selectedEntry.hand!)}
                          >
                            <Shirt width={14} height={14} />
                            <span>Надеть из руки</span>
                          </button>
                        )}
                        {selectedEntry.item.isContainer && (
                          <button
                            type="button"
                            className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                            onClick={() => {
                              setOpenContainer(selectedEntry.item);
                              setSelectedContainerItemIdx(0);
                            }}
                          >
                            <Package width={14} height={14} />
                            <span>Открыть ({selectedEntry.item.contents?.length || 0} предм.)</span>
                          </button>
                        )}
                        {isFluidContainerClosed(selectedEntry.item) && (
                          <button
                            type="button"
                            className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                            onClick={() => {
                              openFluidContainerIfNeeded(player, selectedEntry.item);
                              sound.resume();
                              forceRender(n => n + 1);
                            }}
                          >
                            <Scissors width={14} height={14} />
                            <span>Открыть крышку / упаковку</span>
                          </button>
                        )}
                        <div className="gu-grid gu-g2" style={{ gap: 6 }}>
                          <button
                            type="button"
                            className="gu-btn gu-btn-s gu-btn-xs"
                            onClick={() => handleStowHand(selectedEntry.hand!)}
                          >
                            <ArrowDownToLine width={12} height={12} />
                            <span>Убрать в карман</span>
                          </button>
                          <button
                            type="button"
                            className="gu-btn gu-btn-d gu-btn-xs"
                            onClick={() => handleDropFromHand(selectedEntry.hand!)}
                          >
                            <Trash2 width={12} height={12} />
                            <span>Бросить на землю</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {selectedEntry.item.clothingStats ? (
                          <button
                            type="button"
                            id="btn-equip-selected-item"
                            className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                            onClick={() => handleEquipItem(selectedEntry.originalIndex)}
                          >
                            <Shirt width={14} height={14} />
                            <span>Надеть / Экипировать</span>
                          </button>
                        ) : selectedEntry.item.isContainer ? (
                          <div className="gu-grid gu-g2" style={{ gap: 6 }}>
                            {(selectedEntry.item.singleUseContainer || selectedEntry.item.tornItemId) &&
                              !selectedEntry.item.isOpen && (
                                <button
                                  type="button"
                                  id="btn-unpack-selected-container"
                                  className="gu-btn gu-btn-p gu-btn-sm"
                                  onClick={() => {
                                    unpackSingleUseContainer(player, selectedEntry.item, world);
                                    sound.resume();
                                    forceRender(n => n + 1);
                                  }}
                                >
                                  <Scissors width={14} height={14} />
                                  <span>
                                    Вскрыть
                                    {selectedEntry.item.contents && selectedEntry.item.contents.length > 0
                                      ? ` (${selectedEntry.item.contents.reduce((acc, it) => acc + (it.count || 1), 0)})`
                                      : ''}
                                  </span>
                                </button>
                              )}
                            {(selectedEntry.item.isOpen ||
                              selectedEntry.item.itemId === 'pouch_sealed_snack_torn' ||
                              selectedEntry.item.itemId === 'egg_carton_10_open' ||
                              selectedEntry.item.itemId === 'lukoshko') &&
                              selectedEntry.item.contents &&
                              selectedEntry.item.contents.length > 0 && (
                                <button
                                  type="button"
                                  id="btn-consume-from-opened-package"
                                  className="gu-btn gu-btn-p gu-btn-sm"
                                  onClick={() => {
                                    useItemOnPlayer(player, selectedEntry.originalIndex, world || undefined);
                                    sound.resume();
                                    forceRender(n => n + 1);
                                  }}
                                >
                                  <Utensils width={14} height={14} />
                                  <span>
                                    {selectedEntry.item.itemId.startsWith('egg_carton')
                                      ? 'Достать 1 шт.'
                                      : selectedEntry.item.contents[0]?.category === 'med'
                                      ? 'Применить 1 шт.'
                                      : 'Съесть 1 шт.'}{' '}
                                    ({selectedEntry.item.contents.reduce((acc, it) => acc + (it.count || 1), 0)})
                                  </span>
                                </button>
                              )}
                            <button
                              type="button"
                              id="btn-open-selected-container"
                              className={`gu-btn ${
                                (selectedEntry.item.singleUseContainer || selectedEntry.item.tornItemId) && !selectedEntry.item.isOpen
                                  ? 'gu-btn-s'
                                  : 'gu-btn-p'
                              } gu-btn-sm`}
                              style={{
                                gridColumn:
                                  !((selectedEntry.item.singleUseContainer || selectedEntry.item.tornItemId) && !selectedEntry.item.isOpen) &&
                                  !(
                                    (selectedEntry.item.isOpen ||
                                      selectedEntry.item.itemId === 'pouch_sealed_snack_torn' ||
                                      selectedEntry.item.itemId === 'egg_carton_10_open' ||
                                      selectedEntry.item.itemId === 'lukoshko') &&
                                    selectedEntry.item.contents &&
                                    selectedEntry.item.contents.length > 0
                                  )
                                    ? '1 / -1'
                                    : undefined
                              }}
                              onClick={() => {
                                setOpenContainer(selectedEntry.item);
                                setSelectedContainerItemIdx(0);
                              }}
                            >
                              <Package width={14} height={14} />
                              <span>Открыть ({selectedEntry.item.contents?.length || 0} предм.)</span>
                            </button>
                          </div>
                        ) : selectedEntry.item.phoneSpecs ||
                          selectedEntry.item.itemId.startsWith('phone_') ||
                          selectedEntry.item.itemId === 'smartphone' ? (
                          <button
                            type="button"
                            id="btn-use-selected-phone"
                            className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                            onClick={() => handleUseItem(selectedEntry.originalIndex)}
                          >
                            <Smartphone width={14} height={14} />
                            <span>Включить экран телефона</span>
                          </button>
                        ) : selectedEntry.item.itemId.startsWith('car_key') ? (
                          <div className="gu-note" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '7px 9px' }}>
                            {(() => {
                              const targetVeh = world ? getTargetVehicleForKey(player, selectedEntry.item, world) : null;
                              const distM = targetVeh ? Math.round(Math.hypot(targetVeh.x - player.x, targetVeh.y - player.y) / 10) : null;
                              const isSmartOrDisplay = selectedEntry.item.keyTier === 'smart' || selectedEntry.item.keyTier === 'display';

                              return (
                                <>
                                  <div className="gu-row2" style={{ justifyContent: 'space-between', fontSize: 11.5 }}>
                                    <span className="gu-grp" style={{ fontSize: 11 }}>
                                      {selectedEntry.item.keyTier === 'display'
                                        ? 'Smart Display Key'
                                        : selectedEntry.item.keyTier === 'smart'
                                        ? 'Smart Keyless-Go'
                                        : selectedEntry.item.keyTier === 'flip'
                                        ? 'Выкидной брелок'
                                        : 'Ключ зажигания'}
                                      {targetVeh && (
                                        <span className="gu-mut gu-mono" style={{ fontWeight: 400, marginLeft: 6 }}>
                                          {targetVeh.isLocked ? 'ЦЗ закрыт' : 'ЦЗ открыт'} · ДВС {targetVeh.engineState?.engineRunning ? 'вкл' : 'выкл'}
                                        </span>
                                      )}
                                    </span>
                                    <span className="gu-mut gu-mono" style={{ color: distM !== null ? 'var(--gu-amber-hi)' : undefined }}>
                                      {distM !== null ? `${distM} м` : 'Вне зоны'}
                                    </span>
                                  </div>

                                  <div className="gu-grid gu-g2" style={{ gap: 5 }}>
                                    <button
                                      type="button"
                                      className="gu-btn gu-btn-s gu-btn-xs"
                                      onClick={() => {
                                        handleCarKeyActivation(player, selectedEntry.item, world, 'toggle_lock');
                                        forceRender(n => n + 1);
                                      }}
                                    >
                                      {targetVeh?.isLocked ? <Unlock width={12} height={12} color="#c9922b" /> : <Lock width={12} height={12} color="#c9922b" />}
                                      <span>{targetVeh?.isLocked ? 'Открыть ЦЗ' : 'Закрыть ЦЗ'}</span>
                                    </button>

                                    {isSmartOrDisplay ? (
                                      <button
                                        type="button"
                                        className="gu-btn gu-btn-p gu-btn-xs"
                                        onClick={() => {
                                          handleCarKeyActivation(player, selectedEntry.item, world, 'toggle_engine');
                                          forceRender(n => n + 1);
                                        }}
                                      >
                                        <Zap width={12} height={12} />
                                        <span>{targetVeh?.engineState?.engineRunning ? 'Заглушить' : 'Автозапуск'}</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="gu-btn gu-btn-s gu-btn-xs"
                                        onClick={() => {
                                          handleCarKeyActivation(player, selectedEntry.item, world, 'horn');
                                          forceRender(n => n + 1);
                                        }}
                                      >
                                        <Volume2 width={12} height={12} color="#c9922b" />
                                        <span>Поиск авто</span>
                                      </button>
                                    )}

                                    {isSmartOrDisplay && (
                                      <button
                                        type="button"
                                        className="gu-btn gu-btn-s gu-btn-xs"
                                        onClick={() => {
                                          handleCarKeyActivation(player, selectedEntry.item, world, 'toggle_headlights');
                                          forceRender(n => n + 1);
                                        }}
                                      >
                                        <Lightbulb width={12} height={12} color="#c9922b" />
                                        <span>{targetVeh?.headlightsOn ? 'Выкл фары' : 'Вкл фары'}</span>
                                      </button>
                                    )}

                                    {isSmartOrDisplay && (
                                      <button
                                        type="button"
                                        className="gu-btn gu-btn-s gu-btn-xs"
                                        onClick={() => {
                                          handleCarKeyActivation(player, selectedEntry.item, world, 'horn');
                                          forceRender(n => n + 1);
                                        }}
                                      >
                                        <Volume2 width={12} height={12} color="#c9922b" />
                                        <span>Сигнал</span>
                                      </button>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        ) : selectedEntry.item.itemId.startsWith('property_') ||
                          selectedEntry.item.itemId === 'car_pts' ||
                          selectedEntry.item.itemId === 'car_tech_passport' ||
                          selectedEntry.item.itemId === 'car_contract_dkp' ? (
                          <button
                            type="button"
                            id="btn-inspect-selected-document"
                            className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                            onClick={() => onInspectDocument?.(selectedEntry.item)}
                          >
                            <FileText width={14} height={14} />
                            <span>Просмотреть документ</span>
                          </button>
                        ) : isFluidContainerClosed(selectedEntry.item) ? (
                          <button
                            type="button"
                            id="btn-open-fluid-container"
                            className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                            onClick={() => {
                              openFluidContainerIfNeeded(player, selectedEntry.item);
                              sound.resume();
                              forceRender(n => n + 1);
                            }}
                          >
                            <Scissors width={14} height={14} />
                            <span>
                              {selectedEntry.item.itemId.startsWith('can_metal_')
                                ? 'Вскрыть консервную банку'
                                : selectedEntry.item.itemId === 'can_alu_330'
                                ? 'Открыть банку (ключ-кольцо)'
                                : selectedEntry.item.itemId.startsWith('cup_plastic_dairy') ||
                                  selectedEntry.item.itemId.startsWith('tetra_pack_') ||
                                  selectedEntry.item.itemId === 'package_sachet'
                                ? 'Вскрыть упаковку'
                                : 'Открыть крышку'}
                            </span>
                          </button>
                        ) : selectedEntry.item.usable ? (
                          <button
                            type="button"
                            id="btn-use-selected-item"
                            className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                            onClick={() => handleUseItem(selectedEntry.originalIndex)}
                          >
                            <Utensils width={14} height={14} />
                            <span>Использовать</span>
                          </button>
                        ) : null}

                        <div className="gu-grid gu-g2" style={{ gap: 6 }}>
                          <button
                            type="button"
                            className="gu-btn gu-btn-s gu-btn-xs"
                            onClick={() => handleTakeToHand('left', selectedEntry.originalIndex)}
                          >
                            <Hand width={12} height={12} />
                            <span>В левую руку</span>
                          </button>
                          <button
                            type="button"
                            className="gu-btn gu-btn-s gu-btn-xs"
                            onClick={() => handleTakeToHand('right', selectedEntry.originalIndex)}
                          >
                            <Hand width={12} height={12} />
                            <span>В правую руку</span>
                          </button>
                        </div>

                        {availableContainers.filter(cont => cont.id !== selectedEntry.item.id).length > 0 && (
                          <div className="gu-row2 gu-wrap" style={{ gap: 4 }}>
                            <span className="gu-mut" style={{ fontSize: 11, marginRight: 2 }}>Убрать в:</span>
                            {availableContainers
                              .filter(cont => cont.id !== selectedEntry.item.id)
                              .map(cont => {
                                const check = canItemFitInContainer(cont, selectedEntry.item);
                                return (
                                  <button
                                    type="button"
                                    key={cont.id}
                                    onClick={() => handlePutIntoContainer(cont, selectedEntry.originalIndex)}
                                    disabled={!check.fits}
                                    className="gu-btn gu-btn-s gu-btn-xs"
                                    style={{ height: 24, padding: '0 7px', fontSize: 11 }}
                                    title={check.fits ? `Положить ${selectedEntry.item.nameRu} в ${cont.nameRu}` : check.reason}
                                  >
                                    <ArrowDownToLine width={11} height={11} color="#c9922b" />
                                    <span>{cont.nameRu}</span>
                                  </button>
                                );
                              })}
                          </div>
                        )}

                        <div className={world && isPlayerNearTrashBin(player, world) ? 'gu-grid gu-g2' : 'gu-row2'} style={{ gap: 6 }}>
                          <button
                            type="button"
                            id="btn-drop-selected-item"
                            className="gu-btn gu-btn-d gu-btn-xs gu-btn-block"
                            onClick={() => handleDropItem(selectedEntry.originalIndex)}
                          >
                            <Trash2 width={12} height={12} />
                            <span>Выбросить 1 шт.</span>
                          </button>

                          {world && isPlayerNearTrashBin(player, world) && (
                            <button
                              type="button"
                              id="btn-dispose-in-trash-bin"
                              className="gu-btn gu-btn-s gu-btn-xs gu-btn-block"
                              style={{ borderColor: 'rgba(201,146,43,0.55)', color: '#f0c264' }}
                              onClick={() => {
                                disposeTrashInBin(player, world, selectedEntry.originalIndex);
                                forceRender(n => n + 1);
                              }}
                            >
                              <Trash2 width={12} height={12} />
                              <span>В урну</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="gu-empty" style={{ flex: 1 }}>
                  <Package width={38} height={38} color="#8f8b81" />
                  <div className="gu-cn" style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                    Выберите предмет в слоте
                  </div>
                  <div className="gu-mut" style={{ fontSize: 12.5, maxWidth: 260 }}>
                    Перетаскивайте предметы между слотами карманов, рук и контейнеров.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SUB-INVENTORY: CONTAINER VIEW (2-COLUMN SLOT LAYOUT) ==================== */}
        {activeTab === 'inventory' && openContainer && (() => {
          const contItems = openContainer.contents || [];
          const totalContSlots = Math.max(18, contItems.length + 6);
          const selectedContItem = contItems[selectedContainerItemIdx] || null;
          const isContainerDropTarget = wbDragUi?.overKey === 'zone:container';

          return (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Compact Pinned Header */}
              <div className="gu-panel gu-row2 gu-wrap" style={{ flex: 'none', justifyContent: 'space-between', padding: '8px 12px' }}>
                <div className="gu-row2" style={{ gap: 10, minWidth: 0 }}>
                  <button id="btn-close-container-view" type="button" className="gu-btn gu-btn-s gu-btn-xs" onClick={() => setOpenContainer(null)}>
                    <ChevronLeft width={14} height={14} color="#c9922b" />
                    <span>В карманы</span>
                  </button>
                  <div className="gu-ic" style={{ width: 34, height: 34, flexShrink: 0 }}>
                    <ItemIconCanvas itemId={openContainer.itemId} item={openContainer} size={30} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="gu-cn" style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                      {openContainer.nameRu}
                    </div>
                    <div className="gu-mut gu-mono" style={{ fontSize: 11 }}>
                      Перетаскивайте предметы из карманов и рук в слоты контейнера и обратно
                    </div>
                  </div>
                </div>

                <div className="gu-row2 gu-mono" style={{ gap: 8, fontSize: 12, color: 'var(--gu-mut)' }}>
                  <span><strong style={{ color: '#fff' }}>{contItems.length}</strong> предм.</span>
                  <span>·</span>
                  <span><strong style={{ color: 'var(--gu-amber-hi)' }}>{getItemTotalVolume(openContainer)}</strong> / {openContainer.containerCapacityL} л</span>
                  <span>·</span>
                  <span><strong style={{ color: '#fff' }}>{formatWeightRu(getItemTotalWeight(openContainer))}</strong></span>
                </div>
              </div>

              {/* 2-Column Slot Layout: Left = Container Slots | Right = Player Hands + Pocket Slots */}
              <div className="gu-st-split" style={{ flex: 1, minHeight: 0 }}>
                {/* LEFT COLUMN: CONTAINER SLOTS */}
                <div
                  className="gu-panel"
                  data-wb-drop-zone="zone:container"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    padding: '10px 12px',
                    borderColor: isContainerDropTarget ? 'var(--gu-amber-hi)' : undefined,
                  }}
                >
                  <div className="gu-row2" style={{ flex: 'none', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="gu-grp" style={{ fontSize: 11.5 }}>Слоты контейнера ({contItems.length})</span>
                    <span className="gu-mut" style={{ fontSize: 11 }}>Перетащите сюда или 2× клик чтобы достать</span>
                  </div>

                  <div className="gu-st-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                    <div className="gu-slots">
                      {Array.from({ length: totalContSlots }).map((_, idx) => {
                        const cItem = contItems[idx];
                        const slotKey = cItem ? `cont:${idx}` : `cont:empty-${idx}`;
                        const isBeingDragged = wbDragUi?.sourceKey === slotKey;
                        const isDropTarget = wbDragUi?.overKey === slotKey;
                        const isSelected = (cItem && selectedContainerItemIdx === idx) || selectedWbSlot === slotKey;
                        const info = getSlotFillInfo(cItem);

                        if (!cItem) {
                          return (
                            <div
                              key={slotKey}
                              data-wb-slot={slotKey}
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

                        return (
                          <div
                            key={slotKey}
                            data-wb-slot={slotKey}
                            draggable={false}
                            onDragStart={e => e.preventDefault()}
                            onPointerDown={e =>
                              startSlotPointerDrag(e, slotKey, cItem, () => {
                                setSelectedContainerItemIdx(idx);
                              })
                            }
                            onDoubleClick={() => handleExtractFromContainer(openContainer, idx, 'pockets')}
                            className={'gu-slot' + (isSelected || isDropTarget ? ' on' : '')}
                            style={{
                              touchAction: 'none',
                              cursor: 'grab',
                              opacity: isBeingDragged ? 0.35 : 1,
                              borderColor: isDropTarget ? 'var(--gu-amber-hi)' : undefined,
                            }}
                            title={info?.tooltip}
                          >
                            <ItemIconCanvas itemId={cItem.itemId} item={cItem} size={44} />
                            {cItem.count > 1 && <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>{cItem.count}</span>}
                            {info && info.pct !== null && (
                              <div className="gu-ic-fill" style={{ pointerEvents: 'none' }}>
                                <i style={{ width: `${info.pct}%`, background: info.color || undefined }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedContItem && (
                    <div className="gu-card-sm gu-row2 gu-wrap" style={{ flex: 'none', marginTop: 8, padding: '7px 10px', justifyContent: 'space-between', gap: 8 }}>
                      <div className="gu-row2" style={{ gap: 8, minWidth: 0 }}>
                        <ItemIconCanvas itemId={selectedContItem.itemId} item={selectedContItem} size={28} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12.5, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {selectedContItem.nameRu}
                          </div>
                          <div className="gu-mut gu-mono" style={{ fontSize: 10.5 }}>
                            {selectedContItem.count} шт. · {formatWeightRu(getItemTotalWeight(selectedContItem))} · {getItemTotalVolume(selectedContItem)} л
                          </div>
                        </div>
                      </div>
                      <div className="gu-row2" style={{ gap: 4 }}>
                        <button
                          type="button"
                          className="gu-btn gu-btn-p gu-btn-xs"
                          onClick={() => handleExtractFromContainer(openContainer, selectedContainerItemIdx, 'pockets')}
                        >
                          <ArrowUpFromLine width={12} height={12} />
                          <span>В карман</span>
                        </button>
                        <button
                          type="button"
                          className="gu-btn gu-btn-s gu-btn-xs"
                          onClick={() => handleExtractFromContainer(openContainer, selectedContainerItemIdx, 'rightHand')}
                        >
                          <Hand width={12} height={12} />
                          <span>В руку</span>
                        </button>
                        <button
                          type="button"
                          className="gu-btn gu-btn-d gu-btn-xs"
                          onClick={() => handleDropFromContainer(openContainer, selectedContainerItemIdx)}
                          title="Выбросить на землю"
                        >
                          <Trash2 width={12} height={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: SCROLLABLE PLAYER HAND SLOTS + POCKET SLOTS */}
                <div className="gu-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, padding: '10px 12px' }}>
                  <div className="gu-st-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                    {renderCompartmentsSlotGrid()}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================== TAB 2: SURROUNDINGS (2-COLUMN SLOT LAYOUT) ==================== */}
        {activeTab === 'surroundings' && (() => {
          const totalGroundSlots = Math.max(18, nearbyGroundItems.length + 6);
          const isGroundZoneTarget = wbDragUi?.overKey === 'zone:ground';

          return (
            <div className="gu-st-split" style={{ flex: 1, minHeight: 0 }}>
              {/* LEFT COLUMN: GROUND SLOTS */}
              <div
                className="gu-panel"
                data-wb-drop-zone="zone:ground"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  padding: '10px 12px',
                  borderColor: isGroundZoneTarget ? 'var(--gu-amber-hi)' : undefined,
                }}
              >
                <div className="gu-row2" style={{ flex: 'none', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="gu-grp" style={{ fontSize: 11.5 }}>Земля рядом ({nearbyGroundItems.length})</span>
                  <span className="gu-mut" style={{ fontSize: 11 }}>Перетащите в карманы / руки или бросьте сюда</span>
                </div>

                <div className="gu-st-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <div className="gu-slots">
                    {Array.from({ length: totalGroundSlots }).map((_, idx) => {
                      const gi = nearbyGroundItems[idx];
                      const slotKey = gi ? `ground:${gi.id}` : `ground:empty-${idx}`;
                      const isBeingDragged = wbDragUi?.sourceKey === slotKey;
                      const isDropTarget = wbDragUi?.overKey === slotKey;
                      const info = getSlotFillInfo(gi?.item);

                      if (!gi) {
                        return (
                          <div
                            key={slotKey}
                            data-wb-slot={slotKey}
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

                      return (
                        <div
                          key={slotKey}
                          data-wb-slot={slotKey}
                          draggable={false}
                          onDragStart={e => e.preventDefault()}
                          onPointerDown={e => startSlotPointerDrag(e, slotKey, gi.item)}
                          onDoubleClick={() => handlePickupGroundItem(gi)}
                          className={'gu-slot' + (isDropTarget || selectedWbSlot === slotKey ? ' on' : '')}
                          style={{
                            touchAction: 'none',
                            cursor: 'grab',
                            opacity: isBeingDragged ? 0.35 : 1,
                            borderColor: isDropTarget ? 'var(--gu-amber-hi)' : undefined,
                          }}
                          title={info?.tooltip}
                        >
                          <ItemIconCanvas itemId={gi.item.itemId} item={gi.item} size={44} />
                          {gi.item.count > 1 && <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>{gi.item.count}</span>}
                          {info && info.pct !== null && (
                            <div className="gu-ic-fill" style={{ pointerEvents: 'none' }}>
                              <i style={{ width: `${info.pct}%`, background: info.color || undefined }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: SCROLLABLE PLAYER HAND SLOTS + POCKET SLOTS */}
              <div className="gu-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, padding: '10px 12px' }}>
                <div className="gu-st-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {renderCompartmentsSlotGrid()}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================== TAB 3: CLOTHING (2-COLUMN SLOT LAYOUT) ==================== */}
        {activeTab === 'clothing' && (() => {
          const equippedEntries: { slot: string; layer: string; item: InventoryItem }[] = [];
          Object.entries(player.equippedClothing || {}).forEach(([slot, layers]) => {
            Object.entries(layers || {}).forEach(([layer, item]) => {
              if (item) equippedEntries.push({ slot, layer, item });
            });
          });
          const isClothZoneTarget = wbDragUi?.overKey === 'zone:clothing';
          const totalClothSlots = Math.max(12, equippedEntries.length + 4);

          return (
            <div className="gu-st-split" style={{ flex: 1, minHeight: 0 }}>
              {/* LEFT COLUMN: EQUIPPED CLOTHING SLOTS */}
              <div
                className="gu-panel"
                data-wb-drop-zone="zone:clothing"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  padding: '10px 12px',
                  borderColor: isClothZoneTarget ? 'var(--gu-amber-hi)' : undefined,
                }}
              >
                <div className="gu-row2" style={{ flex: 'none', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="gu-grp" style={{ fontSize: 11.5 }}>Слоты экипировки ({equippedEntries.length})</span>
                  <span className="gu-mut" style={{ fontSize: 11 }}>Перетащите одежду сюда чтобы надеть, или в карман чтобы снять</span>
                </div>

                <div className="gu-st-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <div className="gu-slots">
                    {Array.from({ length: totalClothSlots }).map((_, idx) => {
                      const entry = equippedEntries[idx];
                      if (!entry) {
                        const emptyKey = idx === equippedEntries.length ? 'zone:clothing' : `cloth:empty-${idx}`;
                        const isOver = wbDragUi?.overKey === emptyKey;
                        return (
                          <div
                            key={emptyKey}
                            data-wb-slot={emptyKey}
                            draggable={false}
                            onDragStart={e => e.preventDefault()}
                            onPointerDown={e => startSlotPointerDrag(e, emptyKey, null)}
                            className={'gu-slot empty' + (isOver ? ' on' : '')}
                            style={{
                              touchAction: 'none',
                              borderColor: isOver ? 'var(--gu-amber-hi)' : undefined,
                            }}
                          />
                        );
                      }

                      const { slot, layer, item } = entry;
                      const slotKey = `cloth:${slot}:${layer}`;
                      const isBeingDragged = wbDragUi?.sourceKey === slotKey;
                      const isDropTarget = wbDragUi?.overKey === slotKey;

                      return (
                        <div
                          key={slotKey}
                          data-wb-slot={slotKey}
                          draggable={false}
                          onDragStart={e => e.preventDefault()}
                          onPointerDown={e => startSlotPointerDrag(e, slotKey, item)}
                          onDoubleClick={() => handleUnequipItem(slot, layer)}
                          className={'gu-slot' + (isDropTarget || selectedWbSlot === slotKey ? ' on' : '')}
                          style={{
                            touchAction: 'none',
                            cursor: 'grab',
                            opacity: isBeingDragged ? 0.35 : 1,
                            borderColor: isDropTarget ? 'var(--gu-amber-hi)' : undefined,
                          }}
                          title={`${item.nameRu}\n${CLOTHING_SLOT_LABELS[slot] || slot} · ${CLOTHING_LAYER_LABELS[layer] || layer}`}
                        >
                          <ItemIconCanvas itemId={item.itemId} item={item} size={44} />
                          {item.clothingStats?.pocketCapacityL ? (
                            <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>+{item.clothingStats.pocketCapacityL}л</span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: SCROLLABLE PLAYER HAND SLOTS + POCKET SLOTS */}
              <div className="gu-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, padding: '10px 12px' }}>
                <div className="gu-st-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {renderCompartmentsSlotGrid()}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================== TAB 4: INTERACTION (10 SLOTS: 2 HANDS + 2x2 INPUT + 2x2 OUTPUT) ==================== */}
        {activeTab === 'interaction' && (() => {
          const renderSquareSlot = (
            slotKey: string,
            item: InventoryItem | null | undefined,
            options?: {
              isPreview?: boolean;
              isHand?: boolean;
              onDoubleClick?: () => void;
            }
          ) => {
            const info = getSlotFillInfo(item);
            const isPreview = Boolean(options?.isPreview);
            const isBeingDragged = wbDragUi?.sourceKey === slotKey;
            const isDropTarget = wbDragUi?.overKey === slotKey;
            const isSelected = selectedWbSlot === slotKey;

            return (
              <div
                key={slotKey}
                id={`slot-${slotKey.replace(':', '-')}`}
                data-wb-slot={slotKey}
                draggable={false}
                onDragStart={e => e.preventDefault()}
                onPointerDown={e => startSlotPointerDrag(e, slotKey, item)}
                onDoubleClick={options?.onDoubleClick}
                className={
                  'gu-slot' +
                  (!item ? ' empty' : '') +
                  (isDropTarget || isSelected ? ' on' : '')
                }
                style={{
                  width: 72,
                  height: 72,
                  touchAction: 'none',
                  cursor: item ? 'grab' : selectedWbSlot && !slotKey.startsWith('output:') ? 'pointer' : 'default',
                  opacity: isBeingDragged ? 0.35 : isPreview ? 0.85 : 1,
                  borderStyle: isPreview && !isDropTarget ? 'dashed' : undefined,
                  borderColor: isDropTarget
                    ? 'var(--gu-amber-hi)'
                    : isPreview
                    ? 'rgba(224, 171, 69, 0.65)'
                    : undefined,
                }}
                title={info?.tooltip}
              >
                {item ? (
                  <>
                    <ItemIconCanvas itemId={item.itemId} item={item} size={48} />
                    {item.count > 1 ? (
                      <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>{item.count}</span>
                    ) : item.isContainer ? (
                      <span className="gu-ic-n" style={{ pointerEvents: 'none' }}>{item.contents?.length || 0}</span>
                    ) : null}
                    {info && info.pct !== null && (
                      <div className="gu-ic-fill" style={{ pointerEvents: 'none' }}>
                        <i
                          style={{
                            width: `${info.pct}%`,
                            background: info.color || undefined,
                          }}
                        />
                      </div>
                    )}
                  </>
                ) : options?.isHand ? (
                  <Hand width={22} height={22} color="#5e5b54" style={{ pointerEvents: 'none' }} />
                ) : null}
              </div>
            );
          };

          return (
            <div
              className="gu-panel gu-pad gu-interaction-board"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 32,
                padding: '20px 24px',
              }}
            >
              {/* 2 HAND SLOTS */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span className="gu-grp">Руки</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 72px)', gap: 8 }}>
                  {renderSquareSlot('hand:left', player.leftHandItem, {
                    isHand: true,
                    onDoubleClick: () => handlePlaceHandIntoInput('left', 'any'),
                  })}
                  {renderSquareSlot('hand:right', player.rightHandItem, {
                    isHand: true,
                    onDoubleClick: () => handlePlaceHandIntoInput('right', 'any'),
                  })}
                </div>
              </div>

              {/* 2x2 INPUT SLOTS */}
              <div
                data-wb-input-grid="true"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
              >
                <span className="gu-grp">Ввод</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 72px)', gap: 8 }}>
                  {[0, 1, 2, 3].map(idx =>
                    renderSquareSlot(`input:${idx}`, interactionInputs[idx], {
                      onDoubleClick: () => handleRemoveInputSlot(idx),
                    })
                  )}
                </div>
              </div>

              {/* ARROW */}
              <button
                type="button"
                id="btn-execute-interaction"
                className={'gu-btn' + (evalResult.isValid ? ' gu-btn-p' : '')}
                disabled={!evalResult.isValid}
                onClick={handleExecuteInteraction}
                style={{ padding: '10px 12px', marginTop: 22 }}
                title={evalResult.isValid ? evalResult.title : undefined}
              >
                <ArrowRight width={20} height={20} />
              </button>

              {/* 2x2 OUTPUT SLOTS */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span className="gu-grp">Результат</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 72px)', gap: 8 }}>
                  {[0, 1, 2, 3].map(idx => {
                    const committed = interactionOutputs[idx];
                    const preview = !hasCommittedOutputs && evalResult.isValid ? evalResult.previewOutputs[idx] : null;
                    const displayItem = committed || preview;
                    return renderSquareSlot(`output:${idx}`, displayItem, {
                      isPreview: !committed && Boolean(preview),
                      onDoubleClick: () => {
                        if (ensureOutputsCommitted()) {
                          handleClaimOutputSlot(idx);
                        }
                      },
                    });
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* GLOBAL FLOATING DRAG PREVIEW FOR ALL INVENTORY TABS */}
        {wbDragUi && (
          <div
            style={{
              position: 'fixed',
              left: wbDragUi.x - 32,
              top: wbDragUi.y - 32,
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
            <ItemIconCanvas itemId={wbDragUi.item.itemId} item={wbDragUi.item} size={46} />
          </div>
        )}
      </div>
    </ModalShell>
  );
};


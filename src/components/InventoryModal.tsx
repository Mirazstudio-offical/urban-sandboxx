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
  Droplets,
  Heart,
  Zap,
  Trash2,
  Sparkles,
  Plus,
  Coins,
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
  Thermometer,
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
  const [activeTab, setActiveTab] = useState<'inventory' | 'interaction' | 'surroundings' | 'clothing'>('inventory');
  const [openContainer, setOpenContainer] = useState<InventoryItem | null>(null);
  const [, setSelectedContainerItemIdx] = useState<number>(0);
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

  const selectedEntry = inventory[selectedIndex]
    ? { item: inventory[selectedIndex], originalIndex: selectedIndex }
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

  const handleStowHand = (hand: 'left' | 'right') => {
    if (!player) return;
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
    if (!item) return;
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
    target: 'pockets' | 'leftHand' | 'rightHand'
  ) => {
    if (!player || !container.contents) return;
    const item = container.contents[contentIdx];
    if (!item) return;

    if (target === 'pockets') {
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
      const handItem = target === 'leftHand' ? player.leftHandItem : player.rightHandItem;
      if (handItem) {
        addPlayerNotification(player, `${target === 'leftHand' ? 'Левая' : 'Правая'} рука занята!`, 'warning');
        return;
      }
      const removed = removeItemFromContainer(container, contentIdx, item.count);
      if (removed) {
        putItemInHand(player, target === 'leftHand' ? 'left' : 'right', removed, world);
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

  const handlePickupGroundItem = (gi: GroundItem) => {
    if (!player || !world) return;
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

  const renderHandCard = (hand: 'left' | 'right', label: string, handItem: InventoryItem | null | undefined) => (
    <div id={`inv-${hand}-hand-card`} className={'gu-hand' + (handItem ? ' full' : '')}>
      <div className="gu-slot" style={{ cursor: 'default' }}>
        {handItem ? (
          <ItemIconCanvas itemId={handItem.itemId} item={handItem} size={44} />
        ) : (
          <Hand width={22} height={22} />
        )}
      </div>
      <div className="gu-li-main">
        <div className="gu-li-sub" style={{ marginTop: 0 }}>{label}</div>
        <div className="gu-li-name">{handItem ? handItem.nameRu : 'Свободна'}</div>
        {handItem && (
          <div className="gu-li-sub">
            {formatWeightRu(getItemTotalWeight(handItem))} · {getItemTotalVolume(handItem)} л
            {handItem.surfaceTemperature !== undefined && (
              <span style={{ marginLeft: 8, color: handItem.surfaceTemperature >= 52 ? '#efa690' : handItem.surfaceTemperature <= 4 ? '#7dd3fc' : 'var(--gu-amber-soft)' }}>
                {handItem.surfaceTemperature > 0 ? '+' : ''}{handItem.surfaceTemperature.toFixed(1)}°C
              </span>
            )}
          </div>
        )}
      </div>

      {handItem && (
        <div className="gu-hand-acts">
          {handItem.clothingStats && (
            <button type="button" className="gu-btn gu-btn-p gu-btn-xs" title="Надеть" onClick={() => handleEquipFromHand(hand)}>
              <Shirt width={14} height={14} />
            </button>
          )}
          {handItem.isContainer && (
            <button
              type="button"
              className="gu-btn gu-btn-p gu-btn-xs"
              title="Открыть"
              onClick={() => { setOpenContainer(handItem); setSelectedContainerItemIdx(0); }}
            >
              <Luggage width={14} height={14} />
            </button>
          )}
          <button type="button" className="gu-btn gu-btn-s gu-btn-xs" title="Убрать в карманы" onClick={() => handleStowHand(hand)}>
            <ArrowDownToLine width={14} height={14} />
          </button>
          <button type="button" className="gu-btn gu-btn-d gu-btn-xs" title="Бросить" onClick={() => handleDropFromHand(hand)}>
            <Trash2 width={14} height={14} />
          </button>
        </div>
      )}
    </div>
  );

  // ==================== 10-SLOT INTERACTION WORKBENCH STATE & HELPERS ====================
  // Persisted on player instance so items placed in the 4 Input or 4 Output slots are never lost across modal closes
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
    // Fallback: drop at feet so item is never lost
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
        ['Перетаскивание', 'Слот']
      ]}
      footerRight={
        <span className="gu-mut" style={{ fontSize: 12 }}>
          Лев: <strong style={{ color: '#e9e6df' }}>{player.leftHandItem ? player.leftHandItem.nameRu : 'Свободна'}</strong>
          {' · '}
          Прав: <strong style={{ color: '#e9e6df' }}>{player.rightHandItem ? player.rightHandItem.nameRu : 'Свободна'}</strong>
        </span>
      }
    >
      <div className="gu-stagger">
        {/* ==================== TAB 1: INVENTORY & POCKETS ==================== */}
        {activeTab === 'inventory' && !openContainer && (
          <div className="gu-inv-split">
            {/* LEFT: HANDS + COMPARTMENTS + CONTAINERS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(!hasWallet || !hasBag) && (
                <div className="gu-note gu-warn gu-row2" style={{ justifyContent: 'space-between', padding: '8px 12px' }}>
                  <div className="gu-row2">
                    <Sparkles width={15} height={15} />
                    <span>
                      {!hasWallet && !hasBag
                        ? 'Кошелёк и пакет не найдены в инвентаре'
                        : !hasWallet
                        ? 'Кожаный бумажник не найден в инвентаре'
                        : 'Пакет для покупок не найден в инвентаре'}
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

              {/* Active Hands */}
              <div className="gu-panel gu-pad" style={{ padding: '10px 12px' }}>
                <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="gu-grp">Активные руки</span>
                  <span className="gu-mut gu-hide-s" style={{ fontSize: 11 }}>Клавиша E — действие с предметом</span>
                </div>
                <div className="gu-grid gu-g2" style={{ gap: 8 }}>
                  {renderHandCard('left', 'Левая рука', player.leftHandItem)}
                  {renderHandCard('right', 'Правая рука', player.rightHandItem)}
                </div>
              </div>

              {/* Pockets / backpack: slot grid grouped by whose slots they are */}
              <div className="gu-panel gu-pad">
                {(() => {
                  const getCompIcon = (type: string, size = 16) => {
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

                  return compartments.map(comp => {
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
                          <span className="gu-grp-meta">
                            <span className={compVolumePct > 95 ? 'bad' : ''}>{comp.usedVolumeL}/{comp.capacityL} л</span>
                            {' · '}
                            <span className={compWeightPct > 95 ? 'bad' : ''}>{comp.usedWeightKg}/{comp.maxWeightKg} кг</span>
                          </span>
                        </div>

                        <div className="gu-slots">
                          {slots.map(slotIdx => {
                            const item = inventory[slotIdx];
                            const dropProps = {
                              onDragOver: (e: React.DragEvent) => e.preventDefault(),
                              onDrop: (e: React.DragEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                if (!isNaN(from) && from !== slotIdx) {
                                  moveInventoryItem(player, from, slotIdx);
                                  forceRender(n => n + 1);
                                }
                              }
                            };

                            if (!item) {
                              return <div key={slotIdx} id={`inventory-slot-${slotIdx}`} className="gu-slot empty" {...dropProps} />;
                            }

                            const temp = item.surfaceTemperature;
                            const isHot = temp !== undefined && temp >= 40;
                            const isCold = temp !== undefined && temp <= 4;
                            const fillPct = item.fluidStorage
                              ? Math.max(0, Math.min(100, (item.fluidStorage.currentMl / (item.fluidStorage.maxMl || 1)) * 100))
                              : item.maxPortions && item.maxPortions > 1
                              ? Math.max(0, Math.min(100, ((item.portions ?? item.maxPortions) / item.maxPortions) * 100))
                              : null;

                            return (
                              <div
                                key={slotIdx}
                                id={`inventory-slot-${slotIdx}`}
                                draggable
                                onDragStart={e => e.dataTransfer.setData('text/plain', slotIdx.toString())}
                                {...dropProps}
                                onClick={() => setSelectedIndex(slotIdx)}
                                onDoubleClick={() => {
                                  if (item.isContainer && !item.singleUseContainer && !((item.isOpen || item.itemId === 'pouch_sealed_snack_torn' || item.itemId === 'egg_carton_10_open' || item.itemId === 'lukoshko') && item.contents && item.contents.length > 0)) {
                                    setOpenContainer(item);
                                    setSelectedContainerItemIdx(0);
                                  } else {
                                    handleUseItem(slotIdx);
                                  }
                                }}
                                className={'gu-slot' + (selectedIndex === slotIdx ? ' on' : '') + (matchesFilter(item) ? '' : ' dim') + (isHot ? ' hot' : '') + (isCold ? ' cold' : '')}
                                title={`${item.nameRu}\n${formatWeightRu(getItemTotalWeight(item))} · ${getItemTotalVolume(item)} л`}
                              >
                                {slotIdx < 6 && <span className="gu-ic-hk">{slotIdx + 1}</span>}
                                <ItemIconCanvas itemId={item.itemId} item={item} size={44} />
                                {item.count > 1 ? (
                                  <span className="gu-ic-n">{item.count}</span>
                                ) : item.isContainer ? (
                                  <span className="gu-ic-n">{item.contents?.length || 0}</span>
                                ) : null}
                                {isHot && <span className="gu-slot-t">+{Math.round(temp!)}°</span>}
                                {isCold && <span className="gu-slot-t cold">{Math.round(temp!)}°</span>}
                                {(item.wetness ?? 0) > 0 && <span className="gu-slot-wet"><CloudRain width={11} height={11} /></span>}
                                {fillPct !== null && <div className="gu-ic-fill"><i style={{ width: `${fillPct}%` }} /></div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
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
                  <div className="gu-panel gu-pad" style={{ padding: '10px 12px' }}>
                    <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                      <span className="gu-grp">Контейнеры и кошельки ({allContainers.length})</span>
                      <span className="gu-mut gu-hide-s" style={{ fontSize: 11 }}>Быстрый доступ</span>
                    </div>

                    <div className="gu-grid gu-g2" style={{ gap: 8 }}>
                      {allContainers.map((entry, cIdx) => {
                        const cItem = entry.item;
                        const count = cItem.contents?.length || 0;
                        const maxVol = cItem.containerCapacityL || 20;
                        const curVol = (cItem.contents || []).reduce((acc, it) => acc + getItemTotalVolume(it), 0);

                        return (
                          <div key={cIdx} className="gu-card-sm gu-row2" style={{ justifyContent: 'space-between', padding: '8px 10px' }}>
                            <div className="gu-row2" style={{ minWidth: 0, gap: 10 }}>
                              <div className="gu-ic">
                                <ItemIconCanvas itemId={cItem.itemId} item={cItem} size={38} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {cItem.nameRu}
                                </div>
                                <div className="gu-mut gu-mono" style={{ fontSize: 11 }}>
                                  {count} предм. · {curVol.toFixed(1)}/{maxVol} л
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="gu-btn gu-btn-p gu-btn-xs"
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

            {/* RIGHT: ITEM DETAILS & ACTIONS */}
            <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedEntry && selectedEntry.item ? (
                <>
                  {/* Item Header */}
                  <div className="gu-row2" style={{ alignItems: 'flex-start', gap: 12 }}>
                    <div className="gu-ic gu-md">
                      <ItemIconCanvas itemId={selectedEntry.item.itemId} item={selectedEntry.item} size={50} />
                    </div>
                    <div className="gu-grow">
                      <div className="gu-row2 gu-wrap" style={{ gap: 6, marginBottom: 3 }}>
                        <span className="gu-tag amber">
                          {selectedEntry.item.category === 'food'
                            ? 'Еда'
                            : selectedEntry.item.category === 'drink'
                            ? 'Напиток'
                            : selectedEntry.item.category === 'med'
                            ? 'Медицина'
                            : selectedEntry.item.category === 'tool'
                            ? 'Инструмент'
                            : 'Ценность'}
                        </span>
                        <span className="gu-mut gu-mono" style={{ fontSize: 12 }}>
                          ×{selectedEntry.item.count} шт. · {formatWeightRu(getItemTotalWeight(selectedEntry.item))} ·{' '}
                          <strong style={{ color: 'var(--gu-amber-hi)' }}>{getItemTotalVolume(selectedEntry.item)} л</strong>
                        </span>
                      </div>
                      <div className="gu-cn" style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                        {selectedEntry.item.nameRu}
                      </div>
                      {(() => {
                        const slotComp = getSlotCompartment(player, selectedEntry.originalIndex);
                        if (!slotComp) return null;
                        return (
                          <div className="gu-mut" style={{ fontSize: 11, marginTop: 2 }}>
                            <span style={{ color: 'var(--gu-amber-hi)' }}>{slotComp.compartment.nameRu}</span>
                            {slotComp.compartment.sourceItemNameRu && slotComp.compartment.id !== 'base' && (
                              <span> ({slotComp.compartment.sourceItemNameRu})</span>
                            )}
                            <span> · Слот #{selectedEntry.originalIndex + 1}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Primary Actions — immediately accessible at the top */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8, borderBottom: '1px solid var(--gu-line)' }}>
                    {selectedEntry.item.clothingStats ? (
                      <button
                        type="button"
                        id="btn-equip-selected-item"
                        className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                        onClick={() => handleEquipItem(selectedEntry.originalIndex)}
                      >
                        <Shirt width={15} height={15} />
                        <span>Надеть / Экипировать</span>
                      </button>
                    ) : selectedEntry.item.isContainer ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(selectedEntry.item.singleUseContainer || selectedEntry.item.tornItemId) &&
                          !selectedEntry.item.isOpen && (
                            <button
                              type="button"
                              id="btn-unpack-selected-container"
                              className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                              onClick={() => {
                                unpackSingleUseContainer(player, selectedEntry.item, world);
                                sound.resume();
                                forceRender(n => n + 1);
                              }}
                            >
                              <Scissors width={15} height={15} />
                              <span>
                                Вскрыть упаковку
                                {selectedEntry.item.contents && selectedEntry.item.contents.length > 0
                                  ? ` (${selectedEntry.item.contents.reduce((acc, it) => acc + (it.count || 1), 0)} шт.)`
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
                              className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                              onClick={() => {
                                useItemOnPlayer(player, selectedEntry.originalIndex, world || undefined);
                                sound.resume();
                                forceRender(n => n + 1);
                              }}
                            >
                              <Utensils width={15} height={15} />
                              <span>
                                {selectedEntry.item.itemId.startsWith('egg_carton')
                                  ? 'Достать 1 шт.'
                                  : selectedEntry.item.contents[0]?.category === 'med'
                                  ? 'Применить 1 шт.'
                                  : 'Съесть 1 шт.'}{' '}
                                (осталось {selectedEntry.item.contents.reduce((acc, it) => acc + (it.count || 1), 0)} шт.)
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
                          } gu-btn-sm gu-btn-block`}
                          onClick={() => {
                            setOpenContainer(selectedEntry.item);
                            setSelectedContainerItemIdx(0);
                          }}
                        >
                          <Package width={15} height={15} />
                          <span>Открыть контейнер ({selectedEntry.item.contents?.length || 0} предм.)</span>
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
                        <Smartphone width={15} height={15} />
                        <span>Включить экран телефона</span>
                      </button>
                    ) : selectedEntry.item.itemId.startsWith('car_key') ? (
                      <div className="gu-note" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 10px' }}>
                        {(() => {
                          const targetVeh = world ? getTargetVehicleForKey(player, selectedEntry.item, world) : null;
                          const distM = targetVeh ? Math.round(Math.hypot(targetVeh.x - player.x, targetVeh.y - player.y) / 10) : null;
                          const isSmartOrDisplay = selectedEntry.item.keyTier === 'smart' || selectedEntry.item.keyTier === 'display';

                          return (
                            <>
                              <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                                <span className="gu-grp" style={{ fontSize: 12 }}>
                                  {selectedEntry.item.keyTier === 'display'
                                    ? 'Smart Display Key'
                                    : selectedEntry.item.keyTier === 'smart'
                                    ? 'Smart Keyless-Go'
                                    : selectedEntry.item.keyTier === 'flip'
                                    ? 'Выкидной брелок'
                                    : 'Ключ зажигания'}
                                </span>
                                {distM !== null ? (
                                  <span className="gu-tag amber">{distM} м до авто</span>
                                ) : (
                                  <span className="gu-tag">Вне зоны</span>
                                )}
                              </div>

                              {targetVeh && (
                                <div className="gu-grid gu-g3" style={{ gap: 6 }}>
                                  <div className="gu-kv" style={{ padding: '5px 8px' }}>
                                    <span className="gu-kv-k">Замок</span>
                                    <span className="gu-kv-v" style={{ color: targetVeh.isLocked ? '#f0c264' : '#9ac985' }}>
                                      {targetVeh.isLocked ? 'Закрыт' : 'Открыт'}
                                    </span>
                                  </div>
                                  <div className="gu-kv" style={{ padding: '5px 8px' }}>
                                    <span className="gu-kv-k">ДВС</span>
                                    <span className="gu-kv-v" style={{ color: targetVeh.engineState?.engineRunning ? '#9ac985' : 'var(--gu-mut)' }}>
                                      {targetVeh.engineState?.engineRunning ? 'Вкл' : 'Выкл'}
                                    </span>
                                  </div>
                                  <div className="gu-kv" style={{ padding: '5px 8px' }}>
                                    <span className="gu-kv-k">Фары</span>
                                    <span className="gu-kv-v" style={{ color: targetVeh.headlightsOn ? '#f0c264' : 'var(--gu-mut)' }}>
                                      {targetVeh.headlightsOn ? 'Вкл' : 'Выкл'}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="gu-grid gu-g2" style={{ gap: 6 }}>
                                <button
                                  type="button"
                                  className="gu-btn gu-btn-s gu-btn-xs"
                                  onClick={() => {
                                    handleCarKeyActivation(player, selectedEntry.item, world, 'toggle_lock');
                                    forceRender(n => n + 1);
                                  }}
                                >
                                  {targetVeh?.isLocked ? <Unlock width={13} height={13} color="#c9922b" /> : <Lock width={13} height={13} color="#c9922b" />}
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
                                    <Zap width={13} height={13} />
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
                                    <Volume2 width={13} height={13} color="#c9922b" />
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
                                    <Lightbulb width={13} height={13} color="#c9922b" />
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
                                    <Volume2 width={13} height={13} color="#c9922b" />
                                    <span>Поиск (Сигнал)</span>
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
                        <FileText width={15} height={15} />
                        <span>Изучить / Просмотреть документ</span>
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
                        <Scissors width={15} height={15} />
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
                        <Utensils width={15} height={15} />
                        <span>Использовать</span>
                      </button>
                    ) : null}

                    <div className="gu-grid gu-g2" style={{ gap: 6 }}>
                      <button
                        type="button"
                        className="gu-btn gu-btn-s gu-btn-xs"
                        onClick={() => handleTakeToHand('left', selectedEntry.originalIndex)}
                        disabled={!!player.leftHandItem}
                      >
                        <Hand width={13} height={13} />
                        <span>В левую руку</span>
                      </button>
                      <button
                        type="button"
                        className="gu-btn gu-btn-s gu-btn-xs"
                        onClick={() => handleTakeToHand('right', selectedEntry.originalIndex)}
                        disabled={!!player.rightHandItem}
                      >
                        <Hand width={13} height={13} />
                        <span>В правую руку</span>
                      </button>
                    </div>

                    {/* Stash into reusable containers */}
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
                                style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                                title={check.fits ? `Положить ${selectedEntry.item.nameRu} в ${cont.nameRu}` : check.reason}
                              >
                                <ArrowDownToLine width={11} height={11} color="#c9922b" />
                                <span>{cont.nameRu}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}

                    <div className="gu-row2" style={{ gap: 6 }}>
                      <button
                        type="button"
                        id="btn-drop-selected-item"
                        className="gu-btn gu-btn-d gu-btn-xs gu-btn-block"
                        onClick={() => handleDropItem(selectedEntry.originalIndex)}
                      >
                        <Trash2 width={13} height={13} />
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
                          <Trash2 width={13} height={13} />
                          <span>В урну (+Деньги)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="gu-note" style={{ lineHeight: 1.45, padding: '8px 12px', fontSize: 12, color: 'var(--gu-ink-dim)' }}>
                    {selectedEntry.item.descriptionRu}
                  </div>

                  {/* Packaging Attributes (Shape, Size, State, Material) */}
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
                        : 'Пергаментный конверт-брикет');

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                          <span className="gu-grp" style={{ fontSize: 12 }}>Характеристики упаковки</span>
                          <span className="gu-tag amber" style={{ fontSize: 10 }}>
                            <Package width={11} height={11} />
                            {isOpenPkg ? 'Вскрыта' : 'Запаяна'}
                          </span>
                        </div>
                        <div className="gu-kv-grid">
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
                            <span className="gu-kv-v">{isCandy ? 'Пищевой пластик (BOPP)' : 'Пищевой пергамент'}</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Вместимость</span>
                            <span className="gu-kv-v">{it.containerCapacityL ? `${it.containerCapacityL} л` : '—'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Gummy Candy Attributes (Color, Shape, Flavor, Ingredients) */}
                  {selectedEntry.item.gummyAttributes && (() => {
                    const g = selectedEntry.item.gummyAttributes!;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                          <span className="gu-grp" style={{ fontSize: 12 }}>Свойства мармелада</span>
                          {g.sourDust && (
                            <span className="gu-tag amber" style={{ fontSize: 10 }}>
                              <Sparkles width={11} height={11} />
                              Кислая посыпка
                            </span>
                          )}
                        </div>
                        <div className="gu-kv-grid">
                          <div className="gu-kv">
                            <span className="gu-kv-k">Цвет</span>
                            <span className="gu-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
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
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Вкус</span>
                              <span className="gu-kv-v">{g.flavorRu}</span>
                            </div>
                          )}
                          <div className="gu-kv" style={{ gridColumn: '1 / -1', alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                            <span className="gu-kv-k">Состав</span>
                            <span className="gu-kv-v" style={{ fontSize: 11, lineHeight: 1.35, color: 'var(--gu-ink-soft)' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                          <span className="gu-grp" style={{ fontSize: 12 }}>Термодинамика</span>
                          {thermalInfo.hazardBadge && (
                            <span className="gu-tag bad">
                              <Flame width={11} height={11} />
                              {thermalInfo.hazardBadge.text}
                            </span>
                          )}
                        </div>
                        <div className="gu-kv-grid">
                          <div className="gu-kv">
                            <span className="gu-kv-k">Внутри</span>
                            <span className="gu-kv-v">{thermalInfo.coreTempText}</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Снаружи</span>
                            <span className="gu-kv-v">{thermalInfo.surfaceTempText}</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Потеря тепла</span>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                        <span className="gu-grp" style={{ fontSize: 12 }}>Пищевая ценность (БЖУ)</span>
                        <span className="gu-tag amber">{selectedEntry.item.nutrients.calories} ккал</span>
                      </div>
                      <div className="gu-kv-grid">
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
                          <span className="gu-kv-k">Сахара</span>
                          <span className="gu-kv-v">{selectedEntry.item.nutrients.sugars} г</span>
                        </div>
                        {selectedEntry.item.nutrients.salt !== undefined && (
                          <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                            <span className="gu-kv-k">Соль (NaCl)</span>
                            <span className="gu-kv-v">{selectedEntry.item.nutrients.salt} г</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Smartphone Specs */}
                  {selectedEntry.item.phoneSpecs && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                        <span className="gu-grp" style={{ fontSize: 12 }}>{selectedEntry.item.phoneSpecs.modelName}</span>
                        <span className="gu-tag">{selectedEntry.item.phoneSpecs.osName}</span>
                      </div>
                      <div className="gu-kv-grid">
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
                </>
              ) : (
                <div className="gu-empty" style={{ minHeight: 320 }}>
                  <Package width={42} height={42} color="#8f8b81" />
                  <div className="gu-cn" style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                    Выберите предмет в ячейке
                  </div>
                  <div className="gu-mut" style={{ fontSize: 13, maxWidth: 280 }}>
                    Отобразятся физические свойства, термодинамика, пищевая ценность и доступные действия.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SUB-INVENTORY: CONTAINER VIEW ==================== */}
        {activeTab === 'inventory' && openContainer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ justifyContent: 'space-between' }}>
              <div className="gu-row2" style={{ gap: 12 }}>
                <button id="btn-close-container-view" type="button" className="gu-btn gu-btn-s gu-btn-sm" onClick={() => setOpenContainer(null)}>
                  <ChevronLeft width={16} height={16} color="#c9922b" />
                  <span>Назад в карманы</span>
                </button>
                <div className="gu-ic">
                  <ItemIconCanvas itemId={openContainer.itemId} item={openContainer} size={38} />
                </div>
                <div>
                  <div className="gu-row2" style={{ gap: 8 }}>
                    <span className="gu-cn" style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                      {openContainer.nameRu}
                    </span>
                    <span className="gu-tag amber">Контейнер</span>
                  </div>
                  <div className="gu-mut gu-mono" style={{ fontSize: 12 }}>
                    Вместимость: {openContainer.containerCapacityL} л · Макс. вес: {openContainer.maxContainedWeightKg} кг
                  </div>
                </div>
              </div>

              <div className="gu-row2 gu-mono" style={{ gap: 10, fontSize: 13, color: 'var(--gu-mut)' }}>
                <span>Предметов: <strong style={{ color: '#fff' }}>{openContainer.contents?.length || 0}</strong></span>
                <span>·</span>
                <span>Объём: <strong style={{ color: 'var(--gu-amber-hi)' }}>{getItemTotalVolume(openContainer)} л</strong></span>
                <span>·</span>
                <span>Вес: <strong style={{ color: '#fff' }}>{formatWeightRu(getItemTotalWeight(openContainer))}</strong></span>
              </div>
            </div>

            {(openContainer.contents || []).length > 0 ? (
              <div className="gu-grid gu-g2" style={{ gap: 8 }}>
                {openContainer.contents!.map((contItem, cIdx) => (
                  <div key={cIdx} className="gu-item" style={{ justifyContent: 'space-between', padding: '8px 12px' }}>
                    <div className="gu-row2" style={{ minWidth: 0, gap: 10 }}>
                      <div className="gu-ic">
                        <ItemIconCanvas itemId={contItem.itemId} item={contItem} size={38} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="gu-item-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contItem.nameRu}
                        </div>
                        <div className="gu-item-sub gu-mono">
                          {contItem.count} шт. · {formatWeightRu(getItemTotalWeight(contItem))} · {getItemTotalVolume(contItem)} л
                        </div>
                        {contItem.gummyAttributes && (
                          <div className="gu-row2" style={{ gap: 6, marginTop: 2, fontSize: 11, color: 'var(--gu-ink-soft)' }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                backgroundColor: contItem.gummyAttributes.color,
                                border: '1px solid rgba(255,255,255,0.35)',
                                display: 'inline-block',
                                flexShrink: 0
                              }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {contItem.gummyAttributes.shapeNameRu} · {contItem.gummyAttributes.colorNameRu}
                              {contItem.gummyAttributes.flavorRu ? ` (${contItem.gummyAttributes.flavorRu})` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="gu-row2" style={{ gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="gu-btn gu-btn-p gu-btn-xs"
                        onClick={() => handleExtractFromContainer(openContainer, cIdx, 'pockets')}
                      >
                        <ArrowUpFromLine width={13} height={13} />
                        <span>В карман</span>
                      </button>
                      <button
                        type="button"
                        className="gu-btn gu-btn-s gu-btn-xs"
                        disabled={!!player.rightHandItem}
                        onClick={() => handleExtractFromContainer(openContainer, cIdx, 'rightHand')}
                      >
                        <Hand width={13} height={13} />
                        <span>В руку</span>
                      </button>
                      <button
                        type="button"
                        className="gu-btn gu-btn-d gu-btn-xs"
                        onClick={() => handleDropFromContainer(openContainer, cIdx)}
                        title="Выбросить на землю"
                      >
                        <Trash2 width={13} height={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gu-panel gu-empty">
                <Package width={38} height={38} color="#8f8b81" />
                <div className="gu-cn" style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Контейнер пуст</div>
                <div className="gu-mut" style={{ fontSize: 13 }}>
                  Выберите предметы ниже, чтобы быстро сложить их внутрь «{openContainer.nameRu}».
                </div>
              </div>
            )}

            {/* Quick Deposit Section */}
            {(() => {
              const depositCandidates: { item: InventoryItem; source: 'inventory' | 'leftHand' | 'rightHand'; index?: number }[] = [];
              (player.inventory || []).forEach((invItem, idx) => {
                if (invItem && invItem.id !== openContainer.id) {
                  depositCandidates.push({ item: invItem, source: 'inventory', index: idx });
                }
              });
              if (player.leftHandItem && player.leftHandItem.id !== openContainer.id) {
                depositCandidates.push({ item: player.leftHandItem, source: 'leftHand' });
              }
              if (player.rightHandItem && player.rightHandItem.id !== openContainer.id) {
                depositCandidates.push({ item: player.rightHandItem, source: 'rightHand' });
              }

              if (depositCandidates.length === 0) return null;

              return (
                <div className="gu-panel gu-pad">
                  <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                    <span className="gu-grp">Положить предмет в {openContainer.nameRu}</span>
                    <span className="gu-mut" style={{ fontSize: 12 }}>Нажмите на предмет для перемещения</span>
                  </div>
                  <div className="gu-grid gu-g4" style={{ gap: 8 }}>
                    {depositCandidates.map((cand, cIdx) => {
                      const check = canItemFitInContainer(openContainer, cand.item);
                      return (
                        <button
                          type="button"
                          key={cIdx}
                          disabled={!check.fits}
                          className="gu-card"
                          style={{ padding: '8px 10px', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}
                          title={check.fits ? `Положить ${cand.item.nameRu} в ${openContainer.nameRu}` : check.reason}
                          onClick={() => {
                            if (cand.source === 'inventory' && cand.index !== undefined) {
                              handlePutIntoContainer(openContainer, cand.index);
                            } else if (cand.source === 'leftHand' || cand.source === 'rightHand') {
                              const hand = cand.source === 'leftHand' ? 'left' : 'right';
                              const itemFromHand = takeItemFromHand(player, hand);
                              if (itemFromHand) {
                                const res = addItemToContainer(openContainer, itemFromHand);
                                if (res.success) {
                                  sound.playPickup();
                                  addPlayerNotification(player, res.message, 'pickup');
                                  forceRender(n => n + 1);
                                } else {
                                  putItemInHand(player, hand, itemFromHand, world);
                                  addPlayerNotification(player, res.message, 'warning');
                                }
                              }
                            }
                          }}
                        >
                          <div className="gu-ic">
                            <ItemIconCanvas itemId={cand.item.itemId} item={cand.item} size={38} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cand.item.nameRu}
                            </div>
                            <div className="gu-mut gu-mono" style={{ fontSize: 11 }}>
                              {getItemTotalVolume(cand.item)} л · {formatWeightRu(getItemTotalWeight(cand.item))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ==================== TAB 2: SURROUNDINGS ==================== */}
        {activeTab === 'surroundings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
              <span className="gu-grp">Предметы и объекты поблизости (в радиусе 8 м)</span>
              <span className="gu-mut gu-mono" style={{ fontSize: 13 }}>Найдено: {nearbyGroundItems.length}</span>
            </div>

            {nearbyGroundItems.length > 0 ? (
              <div className="gu-list">
                {nearbyGroundItems.map(gi => (
                  <div key={gi.id} className="gu-rw">
                    <div className="gu-ic">
                      <ItemIconCanvas itemId={gi.item.itemId} item={gi.item} size={38} />
                    </div>
                    <div className="gu-grow">
                      <div className="gu-rw-t">{gi.item.nameRu}</div>
                      <div className="gu-rw-d gu-mono">
                        {gi.item.count} шт. · {formatWeightRu(getItemTotalWeight(gi.item))} · {getItemTotalVolume(gi.item)} л
                      </div>
                    </div>
                    <div className="gu-rw-end">
                      <button
                        type="button"
                        className="gu-btn gu-btn-p gu-btn-sm"
                        onClick={() => handlePickupGroundItem(gi)}
                      >
                        <Plus width={15} height={15} />
                        <span>Подобрать</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gu-panel gu-empty" style={{ minHeight: 280 }}>
                <Sparkles width={40} height={40} color="#8f8b81" />
                <div className="gu-cn" style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                  Поблизости нет предметов на земле
                </div>
                <div className="gu-mut" style={{ fontSize: 13, maxWidth: 340 }}>
                  Подходите ближе к предметам на улице или в помещениях, чтобы подобрать их в карманы или руки.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: CLOTHING ==================== */}
        {activeTab === 'clothing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="gu-grp">Надетая одежда и вместимость карманов</div>
                <div className="gu-mut" style={{ fontSize: 13, marginTop: 2 }}>
                  Верхняя одежда, брюки и рюкзаки добавляют слоты и литраж карманов
                </div>
              </div>
              <div className="gu-row2 gu-mono" style={{ gap: 8, fontSize: 13 }}>
                <span className="gu-mut">Объём карманов:</span>
                <strong style={{ color: 'var(--gu-amber-hi)' }}>
                  {pocketCap.usedVolumeL} / {pocketCap.totalCapacityL} л
                </strong>
              </div>
            </div>

            {Object.keys(player.equippedClothing || {}).length > 0 ? (
              <div className="gu-grid gu-g2">
                {Object.entries(player.equippedClothing || {}).map(([slot, layers]) => (
                  <div key={slot} className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="gu-grp">{CLOTHING_SLOT_LABELS[slot] || slot}</div>
                    {Object.entries(layers).map(([layer, item]) => (
                      <div key={layer} className="gu-card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div className="gu-row2" style={{ gap: 10, minWidth: 0 }}>
                          <div className="gu-ic">
                            <ItemIconCanvas itemId={item.itemId} item={item} size={38} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.nameRu}
                            </div>
                            <div className="gu-mut" style={{ fontSize: 12 }}>
                              {CLOTHING_LAYER_LABELS[layer] || layer}
                              {item.clothingStats && item.clothingStats.pocketCapacityL ? (
                                <span style={{ color: 'var(--gu-amber-soft)' }}>
                                  {' · '}+{item.clothingStats.pocketCapacityL} л (до {item.clothingStats.maxPocketWeightKg || 1.5} кг)
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="gu-btn gu-btn-d gu-btn-xs"
                          onClick={() => handleUnequipItem(slot, layer)}
                        >
                          Снять
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="gu-panel gu-empty" style={{ minHeight: 260 }}>
                <Shirt width={40} height={40} color="#8f8b81" />
                <div className="gu-cn" style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Нет надетой экипировки</div>
                <div className="gu-mut" style={{ fontSize: 13 }}>Выберите одежду в карманах или руках и нажмите «Надеть».</div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: INTERACTION (10 SLOTS: 2 HANDS + 2x2 INPUT + 2x2 OUTPUT) ==================== */}
        {activeTab === 'interaction' && (() => {
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

          // Helper that commits preview outputs into interactionOutputs if not yet committed
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

          // Universal drag-and-drop handler across the 10 slots:
          // source & target format: 'hand:left' | 'hand:right' | 'input:0..3' | 'output:0..3'
          const handleSlotDrop = (targetKey: string, sourceKey: string) => {
            if (!sourceKey || sourceKey === targetKey) return;

            // Cannot drop items INTO output slots
            if (targetKey.startsWith('output:')) return;

            // Extract item from source
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

            // Place into target (and put any displaced item back into source if possible)
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

          wbDropHandlerRef.current = handleSlotDrop;

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
                if (d <= 22 && d < bestDist) {
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
            }

            return bestKey;
          };

          const startSlotPointerDrag = (
            e: React.PointerEvent<HTMLDivElement>,
            slotKey: string,
            item: InventoryItem | null | undefined
          ) => {
            if (e.button !== 0) return;
            e.stopPropagation();

            // If user clicked an empty target slot while another slot was selected, move immediately
            if (!item) {
              if (selectedWbSlot && selectedWbSlot !== slotKey && !slotKey.startsWith('output:')) {
                wbDropHandlerRef.current?.(slotKey, selectedWbSlot);
                setSelectedWbSlot(null);
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
                // Click without drag: support click-source then click-target
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

              {/* FLOATING DRAG PREVIEW */}
              {wbDragUi && (
                <div
                  style={{
                    position: 'fixed',
                    left: wbDragUi.x - 36,
                    top: wbDragUi.y - 36,
                    width: 72,
                    height: 72,
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
                  <ItemIconCanvas itemId={wbDragUi.item.itemId} item={wbDragUi.item} size={48} />
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </ModalShell>
  );
};


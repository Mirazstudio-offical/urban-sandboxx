import React, { useState, useEffect } from 'react';
import { Player, InventoryItem, ItemCategory, GameWorld, GroundItem } from '../types';
import {
  useItemOnPlayer,
  useHandItemOnPlayer,
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
  getSlotCompartment
} from '../items';
import { getItemThermalDisplayInfo } from '../itemThermalSystem';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ModalShell, Tabs } from './gameUi';
import { sound } from '../audio';
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
  const [selectedHand, setSelectedHand] = useState<'left' | 'right' | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'surroundings' | 'clothing'>('inventory');
  const [openContainer, setOpenContainer] = useState<InventoryItem | null>(null);
  const [selectedContainerItemIdx, setSelectedContainerItemIdx] = useState<number>(0);
  const [, forceRender] = useState(0);

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

  const selHandItem = selectedHand === 'left' ? player.leftHandItem : selectedHand === 'right' ? player.rightHandItem : null;
  const selectedEntry: { item: InventoryItem; originalIndex: number; hand: 'left' | 'right' | null } | null = selectedHand
    ? (selHandItem ? { item: selHandItem, originalIndex: -1, hand: selectedHand } : null)
    : inventory[selectedIndex]
    ? { item: inventory[selectedIndex], originalIndex: selectedIndex, hand: null }
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

    if (item.isContainer) {
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

  const selectInvSlot = (idx: number) => { setSelectedHand(null); setSelectedIndex(idx); };

  const handleUseHandItem = (hand: 'left' | 'right') => {
    if (!player) return;
    const res = useHandItemOnPlayer(player, hand, world || undefined);
    if (!res.success && res.message) addPlayerNotification(player, res.message, 'warning');
    sound.resume();
    forceRender(n => n + 1);
  };

  const handlePutHandIntoContainer = (container: InventoryItem, hand: 'left' | 'right') => {
    if (!player) return;
    const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!handItem || handItem.id === container.id) return;
    const check = canItemFitInContainer(container, handItem);
    if (!check.fits) {
      addPlayerNotification(player, check.reason || 'Не помещается', 'warning');
      return;
    }
    const taken = takeItemFromHand(player, hand);
    if (!taken) return;
    const res = addItemToContainer(container, taken);
    if (res.success) {
      sound.playPickup();
      addPlayerNotification(player, res.message, 'pickup');
    } else {
      putItemInHand(player, hand, taken, world);
      addPlayerNotification(player, res.message, 'warning');
    }
    forceRender(n => n + 1);
  };

  const handlePutSelectedIntoContainer = (container: InventoryItem) => {
    if (!selectedEntry || selectedEntry.item.id === container.id) return;
    if (selectedEntry.hand) handlePutHandIntoContainer(container, selectedEntry.hand);
    else handlePutIntoContainer(container, selectedEntry.originalIndex);
  };

  const renderSlotInner = (item: InventoryItem, hotkey?: number | string) => {
    const temp = item.surfaceTemperature;
    const isHot = temp !== undefined && temp >= 40;
    const isCold = temp !== undefined && temp <= 4;
    const fillPct = item.fluidStorage
      ? Math.max(0, Math.min(100, (item.fluidStorage.currentMl / (item.fluidStorage.maxMl || 1)) * 100))
      : item.maxPortions && item.maxPortions > 1
      ? Math.max(0, Math.min(100, ((item.portions ?? item.maxPortions) / item.maxPortions) * 100))
      : null;
    return (
      <>
        {hotkey !== undefined && <span className="gu-ic-hk">{hotkey}</span>}
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
      </>
    );
  };
  const slotTemp = (item: InventoryItem) => {
    const t = item.surfaceTemperature;
    return (t !== undefined && t >= 40 ? ' hot' : '') + (t !== undefined && t <= 4 ? ' cold' : '');
  };
  const slotTitle = (item: InventoryItem) => `${item.nameRu}\n${getItemTotalWeight(item)} кг · ${getItemTotalVolume(item)} л`;

  /** Both hands as ordinary slots. mode 'inv': drag and drop; mode 'put': items go into the opened container. */
  const renderHands = (mode: 'inv' | 'put') => (
    <div className="gu-group">
      <div className="gu-group-h">
        <span className="gu-group-t"><Hand width={16} height={16} />Руки</span>
        <span className="gu-grp-meta">Л — левая · П — правая</span>
      </div>
      <div className="gu-slots">
        {(['left', 'right'] as const).map(hand => {
          const hi = hand === 'left' ? player.leftHandItem : player.rightHandItem;
          const letter = hand === 'left' ? 'Л' : 'П';
          const dropProps = mode === 'inv' ? {
            onDragOver: (e: React.DragEvent) => e.preventDefault(),
            onDrop: (e: React.DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
              const d = e.dataTransfer.getData('text/plain');
              if (d.startsWith('hand:')) return;
              const from = parseInt(d, 10);
              if (!isNaN(from)) handleTakeToHand(hand, from);
            }
          } : {};
          if (!hi) {
            return (
              <div key={hand} className="gu-slot empty" title={hand === 'left' ? 'Левая рука свободна' : 'Правая рука свободна'} {...dropProps}>
                <span className="gu-ic-hk">{letter}</span>
                <Hand width={18} height={18} style={{ opacity: 0.3 }} />
              </div>
            );
          }
          const dim = mode === 'put' && (hi.id === openContainer?.id || (openContainer ? !canItemFitInContainer(openContainer, hi).fits : false));
          return (
            <div
              key={hand}
              draggable={mode === 'inv'}
              onDragStart={e => e.dataTransfer.setData('text/plain', 'hand:' + hand)}
              onClick={() => { setSelectedHand(hand); }}
              onDoubleClick={() => {
                if (mode === 'put') { if (openContainer) handlePutHandIntoContainer(openContainer, hand); return; }
                if (hi.isContainer) { setOpenContainer(hi); setSelectedContainerItemIdx(0); }
                else if (hi.usable) handleUseHandItem(hand);
              }}
              className={'gu-slot' + (selectedHand === hand ? ' on' : '') + (dim ? ' dim' : '') + slotTemp(hi)}
              title={slotTitle(hi)}
            >
              {renderSlotInner(hi, letter)}
            </div>
          );
        })}
      </div>
    </div>
  );

  /** Pockets / clothing / backpack slots grouped by whose they are. */
  const renderCompartments = (mode: 'inv' | 'put') => compartments.map(comp => {
    const slots = Array.from({ length: comp.slotCount }, (_, l) => comp.startIndex + l);
    const compVolumePct = Math.round((comp.usedVolumeL / comp.capacityL) * 100);
    const compWeightPct = Math.round((comp.usedWeightKg / comp.maxWeightKg) * 100);
    const CompIcon = comp.iconType === 'user' ? User : comp.iconType === 'shirt' ? Shirt : Luggage;
    return (
      <div key={comp.id} className="gu-group">
        <div className="gu-group-h">
          <span className="gu-group-t"><CompIcon width={16} height={16} />{comp.nameRu}</span>
          <span className="gu-grp-meta">
            <span className={compVolumePct > 95 ? 'bad' : ''}>{comp.usedVolumeL}/{comp.capacityL} л</span>
            {' · '}
            <span className={compWeightPct > 95 ? 'bad' : ''}>{comp.usedWeightKg}/{comp.maxWeightKg} кг</span>
          </span>
        </div>
        <div className="gu-slots">
          {slots.map(slotIdx => {
            const item = inventory[slotIdx];
            const dropProps = mode === 'inv' ? {
              onDragOver: (e: React.DragEvent) => e.preventDefault(),
              onDrop: (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                const d = e.dataTransfer.getData('text/plain');
                if (d.startsWith('hand:')) { handleStowHand(d.slice(5) as 'left' | 'right'); return; }
                const from = parseInt(d, 10);
                if (!isNaN(from) && from !== slotIdx) {
                  moveInventoryItem(player, from, slotIdx);
                  forceRender(n => n + 1);
                }
              }
            } : {};
            if (!item) return <div key={slotIdx} id={`inventory-slot-${slotIdx}`} className="gu-slot empty" {...dropProps} />;
            const dim = mode === 'inv'
              ? !matchesFilter(item)
              : item.id === openContainer?.id || (openContainer ? !canItemFitInContainer(openContainer, item).fits : false);
            return (
              <div
                key={slotIdx}
                id={`inventory-slot-${slotIdx}`}
                draggable={mode === 'inv'}
                onDragStart={e => e.dataTransfer.setData('text/plain', slotIdx.toString())}
                {...dropProps}
                onClick={() => selectInvSlot(slotIdx)}
                onDoubleClick={() => {
                  if (mode === 'put') { if (openContainer) handlePutIntoContainer(openContainer, slotIdx); return; }
                  if (item.isContainer) { setOpenContainer(item); setSelectedContainerItemIdx(0); }
                  else handleUseItem(slotIdx);
                }}
                className={'gu-slot' + (selectedIndex === slotIdx && !selectedHand ? ' on' : '') + (dim ? ' dim' : '') + slotTemp(item)}
                title={slotTitle(item)}
              >
                {renderSlotInner(item, mode === 'inv' && slotIdx < 6 ? slotIdx + 1 : undefined)}
              </div>
            );
          })}
        </div>
      </div>
    );
  });

  return (
    <ModalShell
      id="inventory-modal"
      title="Инвентарь и нагрузка"
      subtitle="Физический объём (л), вес (кг), карманы и активные руки"
      width={1140}
      tall
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

              {/* Hands + pockets / clothing / backpack: one slot list */}
              <div className="gu-panel gu-pad">
                {renderHands('inv')}
                {renderCompartments('inv')}
              </div>
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
                          ×{selectedEntry.item.count} шт. · {getItemTotalWeight(selectedEntry.item)} кг ·{' '}
                          <strong style={{ color: 'var(--gu-amber-hi)' }}>{getItemTotalVolume(selectedEntry.item)} л</strong>
                        </span>
                      </div>
                      <div className="gu-cn" style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                        {selectedEntry.item.nameRu}
                      </div>
                      {(() => {
                        if (selectedEntry.hand) {
                          return (
                            <div className="gu-mut" style={{ fontSize: 11, marginTop: 2 }}>
                              <span style={{ color: 'var(--gu-amber-hi)' }}>{selectedEntry.hand === 'left' ? 'Левая рука' : 'Правая рука'}</span>
                            </div>
                          );
                        }
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
                        onClick={() => (selectedEntry.hand ? handleEquipFromHand(selectedEntry.hand) : handleEquipItem(selectedEntry.originalIndex))}
                      >
                        <Shirt width={15} height={15} />
                        <span>Надеть / Экипировать</span>
                      </button>
                    ) : selectedEntry.item.isContainer ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          type="button"
                          id="btn-open-selected-container"
                          className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                          onClick={() => {
                            setOpenContainer(selectedEntry.item);
                            setSelectedContainerItemIdx(0);
                          }}
                        >
                          <Package width={15} height={15} />
                          <span>Открыть</span>
                        </button>
                        {(selectedEntry.item.singleUseContainer || selectedEntry.item.tornItemId) &&
                          selectedEntry.item.contents &&
                          selectedEntry.item.contents.length > 0 && (
                            <button
                              type="button"
                              className="gu-btn gu-btn-s gu-btn-sm gu-btn-block"
                              onClick={() => {
                                unpackSingleUseContainer(player, selectedEntry.item, world);
                                setSelectedIndex(0);
                                forceRender(n => n + 1);
                              }}
                            >
                              <Scissors width={15} height={15} />
                              <span>Вскрыть упаковку ({selectedEntry.item.contents.length} предм.)</span>
                            </button>
                          )}
                      </div>
                    ) : selectedEntry.item.phoneSpecs ||
                      selectedEntry.item.itemId.startsWith('phone_') ||
                      selectedEntry.item.itemId === 'smartphone' ? (
                      <button
                        type="button"
                        id="btn-use-selected-phone"
                        className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                        onClick={() => (selectedEntry.hand ? handleUseHandItem(selectedEntry.hand) : handleUseItem(selectedEntry.originalIndex))}
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
                    ) : selectedEntry.item.usable ? (
                      <button
                        type="button"
                        id="btn-use-selected-item"
                        className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                        onClick={() => (selectedEntry.hand ? handleUseHandItem(selectedEntry.hand) : handleUseItem(selectedEntry.originalIndex))}
                      >
                        <Utensils width={15} height={15} />
                        <span>Использовать</span>
                      </button>
                    ) : null}

                    {selectedEntry.hand ? (
                      <button type="button" className="gu-btn gu-btn-s gu-btn-xs gu-btn-block" onClick={() => handleStowHand(selectedEntry.hand!)}>
                        <ArrowDownToLine width={13} height={13} />
                        <span>Убрать в карманы</span>
                      </button>
                    ) : (
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
                    )}

                    <div className="gu-row2" style={{ gap: 6 }}>
                      <button
                        type="button"
                        id="btn-drop-selected-item"
                        className="gu-btn gu-btn-d gu-btn-xs gu-btn-block"
                        onClick={() => (selectedEntry.hand ? handleDropFromHand(selectedEntry.hand) : handleDropItem(selectedEntry.originalIndex))}
                      >
                        <Trash2 width={13} height={13} />
                        <span>Выбросить 1 шт.</span>
                      </button>

                      {world && !selectedEntry.hand && isPlayerNearTrashBin(player, world) && (
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

        {/* ==================== SUB-INVENTORY: CONTAINER VIEW (one screen: take / put) ==================== */}
        {activeTab === 'inventory' && openContainer && (() => {
          const contents = openContainer.contents || [];
          const curIdx = contents[selectedContainerItemIdx] ? selectedContainerItemIdx : -1;
          const cur = curIdx >= 0 ? contents[curIdx] : null;
          const freeHand: 'leftHand' | 'rightHand' | null = !player.leftHandItem ? 'leftHand' : !player.rightHandItem ? 'rightHand' : null;
          const canPutSel = !!selectedEntry && selectedEntry.item.id !== openContainer.id && canItemFitInContainer(openContainer, selectedEntry.item).fits;
          return (
            <div className="gu-st-split">
              <div className="gu-panel gu-pad">
                <div className="gu-st-head">
                  <span className="gu-row2" style={{ gap: 10, minWidth: 0 }}>
                    <button id="btn-close-container-view" type="button" className="gu-btn gu-btn-s gu-btn-xs" onClick={() => setOpenContainer(null)} title="Назад">
                      <ChevronLeft width={14} height={14} color="#c9922b" />
                    </button>
                    <span className="gu-st-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{openContainer.nameRu}</span>
                  </span>
                  <span className="gu-st-sub">{contents.length} предм.</span>
                </div>
                <div className="gu-meters">
                  <div className="gu-meter">
                    <div className="gu-meter-h"><span>Объём</span><b>{getItemTotalVolume(openContainer)} / {openContainer.containerCapacityL} л</b></div>
                  </div>
                  <div className="gu-meter">
                    <div className="gu-meter-h"><span>Вес</span><b>{getItemTotalWeight(openContainer)} / {openContainer.maxContainedWeightKg} кг</b></div>
                  </div>
                </div>
                <div className="gu-st-scroll">
                  <div className="gu-slots">
                    {Array.from({ length: Math.max(12, contents.length + 4) }, (_, i) => {
                      const ci = contents[i];
                      if (!ci) return <div key={'e' + i} className="gu-slot empty" />;
                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedContainerItemIdx(i)}
                          onDoubleClick={() => handleExtractFromContainer(openContainer, i, 'pockets')}
                          className={'gu-slot' + (curIdx === i ? ' on' : '') + slotTemp(ci)}
                          title={slotTitle(ci)}
                        >
                          {renderSlotInner(ci)}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {cur && (
                  <div className="gu-st-pick">
                    <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{cur.nameRu}</span>
                    <div className="gu-row" style={{ gap: 6 }}>
                      <button type="button" className="gu-btn gu-btn-p gu-btn-xs" onClick={() => handleExtractFromContainer(openContainer, curIdx, 'pockets')}>
                        <ArrowUpFromLine width={13} height={13} /> В карманы
                      </button>
                      <button type="button" className="gu-btn gu-btn-s gu-btn-xs" disabled={!freeHand} onClick={() => freeHand && handleExtractFromContainer(openContainer, curIdx, freeHand)}>
                        <Hand width={13} height={13} /> В руку
                      </button>
                      <button type="button" className="gu-btn gu-btn-d gu-btn-xs" onClick={() => handleDropFromContainer(openContainer, curIdx)} title="Выбросить на землю">
                        <Trash2 width={13} height={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="gu-panel gu-pad">
                <div className="gu-st-head">
                  <span className="gu-st-title">Инвентарь</span>
                  <span className="gu-st-sub">выберите предмет, чтобы положить</span>
                </div>
                <div className="gu-st-scroll">
                  {renderHands('put')}
                  {renderCompartments('put')}
                </div>
                {selectedEntry && selectedEntry.item.id !== openContainer.id && (
                  <div className="gu-st-pick">
                    <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{selectedEntry.item.nameRu}</span>
                    <button type="button" className="gu-btn gu-btn-p gu-btn-xs" disabled={!canPutSel} onClick={() => handlePutSelectedIntoContainer(openContainer)}>
                      <ArrowDownToLine width={13} height={13} /> Положить
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
                        {gi.item.count} шт. · {getItemTotalWeight(gi.item)} кг · {getItemTotalVolume(gi.item)} л
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
      </div>
    </ModalShell>
  );
};


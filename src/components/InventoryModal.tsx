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
  swapPlayerHands,
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
  InventoryCompartment
} from '../items';
import { getItemThermalDisplayInfo } from '../itemThermalSystem';
import { ItemIconCanvas } from './ItemIconCanvas';
import { sound } from '../audio';
import { 
  X, 
  Package, 
  Utensils, 
  Droplets, 
  Heart, 
  Zap, 
  Moon, 
  Trash2, 
  Sparkles,
  Info,
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
  Cpu,
  Lock,
  Unlock,
  Lightbulb,
  Volume2,
  User,
  Luggage,
  FileText,
  Scissors,
  Flame,
  Thermometer
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
  const [activeTab, setActiveTab] = useState<'inventory' | 'surroundings' | 'clothing'>('inventory');
  const [openContainer, setOpenContainer] = useState<InventoryItem | null>(null);
  const [selectedContainerItemIdx, setSelectedContainerItemIdx] = useState<number>(0);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!isOpen || !player) return;
    const w = (player.inventory && player.inventory.some(i => i && i.itemId === 'wallet')) || player.leftHandItem?.itemId === 'wallet' || player.rightHandItem?.itemId === 'wallet';
    const b = (player.inventory && player.inventory.some(i => i && i.itemId === 'plastic_bag')) || player.leftHandItem?.itemId === 'plastic_bag' || player.rightHandItem?.itemId === 'plastic_bag';
    if (!w && !b) {
      restoreStarterContainers(player);
      forceRender(n => n + 1);
    }
  }, [isOpen, player]);

  if (!isOpen || !player) return null;

  const inventory = player.inventory || [];
  const compartments = getPlayerCompartments(player);
  const maxSlots = getPlayerTotalSlots(player);

  // Realistic physical metrics
  const pocketCap = getPlayerPocketCapacity(player);
  const carriedWeight = getPlayerTotalCarriedWeight(player);
  const leftBulky = !!(player.leftHandItem && (player.leftHandItem.volume || 0) >= 10);
  const rightBulky = !!(player.rightHandItem && (player.rightHandItem.volume || 0) >= 10);
  const isBulkyHand = leftBulky || rightBulky;

  // Container recovery check (if wallet or bag were accidentally lost)
  const hasWallet = inventory.some(i => i && i.itemId === 'wallet') || player.leftHandItem?.itemId === 'wallet' || player.rightHandItem?.itemId === 'wallet';
  const hasBag = inventory.some(i => i && i.itemId === 'plastic_bag') || player.leftHandItem?.itemId === 'plastic_bag' || player.rightHandItem?.itemId === 'plastic_bag';
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

  // Category filter check
  const matchesFilter = (item: InventoryItem | undefined) => {
    if (selectedCategory === 'all') return true;
    if (!item) return false;
    return item.category === selectedCategory;
  };

  const selectedEntry = inventory[selectedIndex] ? { item: inventory[selectedIndex], originalIndex: selectedIndex } : null;

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

    // Containers must be opened, never consumed
    if (item.isContainer) {
      setOpenContainer(item);
      setSelectedContainerItemIdx(0);
      return;
    }

    const TOPICAL_ITEMS = ['bandage', 'splint', 'medical_patch', 'antiseptic', 'panthenol_spray', 'spasatel_ointment', 'zelenka', 'iodine', 'diclofenac_gel', 'hydrogen_peroxide'];
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

  // Move item into hand
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
      // Rollback
      player.inventory[invIdx] = item;
      addPlayerNotification(player, res.message, 'warning');
      return;
    }
    sound.playPickup();
    forceRender(n => n + 1);
  };

  // Stow item from hand to pockets
  const handleStowHand = (hand: 'left' | 'right') => {
    if (!player) return;
    const res = stowItemFromHandToPockets(player, hand);
    if (res.success) {
      sound.playPickup();
    }
    forceRender(n => n + 1);
  };

  // Drop item from hand
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

  // Put item into a container
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

  // Extract item from open container to pockets or hands
  const handleExtractFromContainer = (container: InventoryItem, contentIdx: number, target: 'pockets' | 'leftHand' | 'rightHand') => {
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

  // Equip clothing item directly from hand
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

  // Drop item from container directly onto ground
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

  // Nearby Ground Items
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

  // Find all available containers on player (to offer "Положить в...")
  const availableContainers = [
    ...(player.inventory || []).filter(i => i && i.isContainer),
    ...(player.leftHandItem && player.leftHandItem.isContainer ? [player.leftHandItem] : []),
    ...(player.rightHandItem && player.rightHandItem.isContainer ? [player.rightHandItem] : []),
    ...(player.equippedClothing?.back?.outerwear?.isContainer ? [player.equippedClothing.back.outerwear] : [])
  ];

  return (
    <div 
      id="inventory-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#0b0c0e]/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="inventory-modal-window"
        className="relative w-full max-w-5xl max-h-[92vh] bg-[#14161a] border border-[#2a2e38] rounded-[2px] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#2a2e38] bg-[#0b0c0e]/95">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#c68a35]/15 border border-[#c68a35]/40 rounded-[2px] text-[#c68a35]">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#f0f3f6] tracking-wide flex items-center gap-2 font-mono">
                ИНВЕНТАРЬ И НАГРУЗКА
              </h2>
              <p className="text-[11px] sm:text-xs text-[#9ba3af] font-mono">
                Физический объем (л), вес (кг), карманы и активные руки
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="inventory-close-btn"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-[2px] bg-[#14161a] border border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6] hover:bg-[#1c1f26] hover:border-[#c68a35]/50 transition cursor-pointer"
              title="Закрыть (Esc / I)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PHYSICAL CAPACITY & HANDS STATUS BAR */}
        <div className="px-4 sm:px-6 py-2 bg-[#0b0c0e]/70 border-b border-[#2a2e38] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Carried weight & speed */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono">
              <Weight className="w-4 h-4 text-[#c68a35]" />
              <span className="text-[#9ba3af]">Вес:</span>
              <span className="font-bold text-[#f0f3f6]">{carriedWeight} кг</span>
            </div>
            <div className={`px-2.5 py-0.5 rounded-[2px] border text-[11px] font-semibold font-mono ${
              weightSpeedPct >= 95 ? 'bg-[#c68a35]/20 border-[#c68a35]/50 text-[#d99a41]' :
              weightSpeedPct >= 70 ? 'bg-amber-950/60 border-amber-800 text-amber-400' :
              'bg-red-950/60 border-red-800 text-red-400'
            }`}>
              Скорость: {weightSpeedPct}% {isBulkyHand ? '(Груз)' : ''}
            </div>
          </div>

          {/* Pocket Volume Status */}
          <div className="flex items-center gap-2.5 font-mono">
            <span className="text-[#9ba3af]">Объем карманов:</span>
            <div className="w-28 sm:w-36 bg-[#0b0c0e] h-2 rounded-none overflow-hidden border border-[#2a2e38]">
              <div 
                className={`h-full transition-all duration-300 ${
                  pocketCap.usedVolumeL / pocketCap.totalCapacityL > 0.85 ? 'bg-red-500' : 'bg-[#c68a35]'
                }`}
                style={{ width: `${Math.min(100, (pocketCap.usedVolumeL / Math.max(0.1, pocketCap.totalCapacityL)) * 100)}%` }}
              />
            </div>
            <span className="font-mono font-bold text-[#f0f3f6]">
              {pocketCap.usedVolumeL} / {pocketCap.totalCapacityL} л
            </span>
          </div>

          {/* Active Hands Quick Preview */}
          <div className="flex items-center gap-2 font-mono">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-[2px] border text-[11px] ${
              player.leftHandItem ? 'bg-[#c68a35]/20 border-[#c68a35]/50 text-[#d99a41]' : 'bg-[#14161a] border-[#2a2e38] text-[#5a6272]'
            }`}>
              <Hand className="w-3.5 h-3.5" />
              <span>Лев: {player.leftHandItem ? player.leftHandItem.nameRu : 'Свободна'}</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-[2px] border text-[11px] ${
              player.rightHandItem ? 'bg-[#c68a35]/20 border-[#c68a35]/50 text-[#d99a41]' : 'bg-[#14161a] border-[#2a2e38] text-[#5a6272]'
            }`}>
              <Hand className="w-3.5 h-3.5" />
              <span>Прав: {player.rightHandItem ? player.rightHandItem.nameRu : 'Свободна'}</span>
            </div>
          </div>
        </div>

        {/* TABS & CATEGORIES BAR */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2 border-b border-[#2a2e38] bg-[#0b0c0e]/40 gap-2">
          {/* Main View Tabs */}
          <div className="flex items-center gap-1 bg-[#0b0c0e] p-1 rounded-[2px] border border-[#2a2e38] w-full sm:w-auto font-mono">
            <button
              id="tab-inventory-btn"
              onClick={() => { setActiveTab('inventory'); setOpenContainer(null); }}
              className={`min-h-[38px] flex-1 sm:flex-none px-3.5 py-1.5 rounded-[2px] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'inventory' 
                  ? 'bg-[#c68a35] text-[#0b0c0e] font-black shadow' 
                  : 'text-[#9ba3af] hover:text-[#f0f3f6] hover:bg-[#1c1f26]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Карманы ({inventory.filter(Boolean).length})</span>
            </button>
            <button
              id="tab-surroundings-btn"
              onClick={() => { setActiveTab('surroundings'); setOpenContainer(null); }}
              className={`min-h-[38px] flex-1 sm:flex-none px-3.5 py-1.5 rounded-[2px] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'surroundings' 
                  ? 'bg-[#c68a35] text-[#0b0c0e] font-black shadow' 
                  : 'text-[#9ba3af] hover:text-[#f0f3f6] hover:bg-[#1c1f26]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Рядом ({nearbyGroundItems.length})</span>
            </button>
            <button
              id="tab-clothing-btn"
              onClick={() => { setActiveTab('clothing'); setOpenContainer(null); }}
              className={`min-h-[38px] flex-1 sm:flex-none px-3.5 py-1.5 rounded-[2px] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'clothing' 
                  ? 'bg-[#c68a35] text-[#0b0c0e] font-black shadow' 
                  : 'text-[#9ba3af] hover:text-[#f0f3f6] hover:bg-[#1c1f26]'
              }`}
            >
              <Shirt className="w-4 h-4" />
              <span>Одежда</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          {activeTab === 'inventory' && !openContainer && (
            <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-1 max-w-full font-mono">
              {[
                { id: 'all', label: 'Все', icon: Package },
                { id: 'food', label: 'Еда', icon: Utensils },
                { id: 'drink', label: 'Напитки', icon: Droplets },
                { id: 'med', label: 'Медицина', icon: Heart },
                { id: 'tool', label: 'Инструменты', icon: Zap },
                { id: 'valuable', label: 'Ценности', icon: Coins },
              ].map(cat => {
                const IconComp = cat.icon;
                return (
                  <button
                    key={cat.id}
                    id={`filter-cat-${cat.id}`}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`min-h-[34px] px-2.5 py-1 rounded-[2px] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#1c1f26] border border-[#c68a35] text-[#d99a41] font-bold'
                        : 'bg-[#14161a] border border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6] hover:bg-[#1c1f26]'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* MAIN BODY: 2-COLUMN GRID (SLOTS + DETAILS / CONTAINER VIEW) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 font-mono">
          {activeTab === 'inventory' && !openContainer && (
            <>
              {/* LEFT: HANDS + POCKET SLOTS (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {(!hasWallet || !hasBag) && (
                  <div className="px-3.5 py-2.5 bg-[#c68a35]/15 border border-[#c68a35]/40 rounded-[2px] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-[#d99a41]">
                      <Sparkles className="w-4 h-4 text-[#c68a35] shrink-0" />
                      <span>{!hasWallet && !hasBag ? 'Кошелек и пакет не найдены в инвентаре' : !hasWallet ? 'Кожаный бумажник не найден в инвентаре' : 'Пакет для покупок не найден в инвентаре'}</span>
                    </div>
                    <button
                      id="btn-restore-containers"
                      onClick={() => {
                        restoreStarterContainers(player);
                        forceRender(n => n + 1);
                      }}
                      className="px-3 py-1 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-black text-xs rounded-[2px] shadow transition shrink-0 cursor-pointer"
                    >
                      Восстановить
                    </button>
                  </div>
                )}

                {/* ACTIVE HANDS ROW */}
                <div className="bg-[#0b0c0e]/60 border border-[#2a2e38] rounded-[2px] p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#cbd5e1]">
                    <span className="flex items-center gap-1.5">
                      <Hand className="w-4 h-4 text-[#c68a35]" />
                      Активные руки (Для крупных предметов)
                    </span>
                    <span className="text-[10px] text-[#5a6272] hidden sm:inline">Видны на модели персонажа</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* LEFT HAND */}
                    <div className="p-2.5 bg-[#14161a] border border-[#2a2e38] rounded-[2px] flex items-center justify-between gap-2 min-h-[56px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-11 h-11 rounded-[2px] bg-[#0b0c0e] border border-[#2a2e38] flex items-center justify-center shrink-0">
                          {player.leftHandItem ? (
                            <ItemIconCanvas itemId={player.leftHandItem.itemId} item={player.leftHandItem} size={32} />
                          ) : (
                            <Hand className="w-5 h-5 text-[#3a3f4d] stroke-[1.5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-[#9ba3af] font-mono uppercase">Левая рука</div>
                          <div className="text-xs font-bold text-[#f0f3f6] truncate">
                            {player.leftHandItem ? player.leftHandItem.nameRu : 'Пусто'}
                          </div>
                          {player.leftHandItem && (
                            <div className="text-[10px] text-[#9ba3af] font-mono flex items-center gap-1.5 flex-wrap">
                              <span>{getItemTotalWeight(player.leftHandItem)} кг • {getItemTotalVolume(player.leftHandItem)} л</span>
                              {player.leftHandItem.surfaceTemperature !== undefined && (
                                <span className={`flex items-center gap-0.5 ${player.leftHandItem.surfaceTemperature >= 52 ? 'text-amber-400 font-bold' : player.leftHandItem.surfaceTemperature <= 4 ? 'text-sky-300' : 'text-[#cbd5e1]'}`}>
                                  {player.leftHandItem.surfaceTemperature >= 52 ? <Flame className="w-3 h-3 text-amber-400 animate-pulse" /> : <Thermometer className="w-3 h-3 text-[#9ba3af]" />}
                                  {player.leftHandItem.surfaceTemperature > 0 ? '+' : ''}{player.leftHandItem.surfaceTemperature.toFixed(1)}°C
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {player.leftHandItem && (
                        <div className="flex items-center gap-1 shrink-0">
                          {player.leftHandItem.clothingStats && (
                            <button
                              onClick={() => handleEquipFromHand('left')}
                              className="px-2.5 py-1.5 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] rounded-[2px] text-xs font-black min-h-[34px] cursor-pointer"
                              title="Надеть одежду из руки"
                            >
                              Надеть
                            </button>
                          )}
                          {player.leftHandItem.isContainer && (
                            <button
                              onClick={() => { setOpenContainer(player.leftHandItem); setSelectedContainerItemIdx(0); }}
                              className="px-2.5 py-1.5 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] rounded-[2px] text-xs font-black min-h-[34px] cursor-pointer"
                            >
                              Открыть
                            </button>
                          )}
                          <button
                            onClick={() => handleStowHand('left')}
                            className="px-2.5 py-1.5 bg-[#0b0c0e] hover:bg-[#1c1f26] border border-[#2a2e38] text-[#cbd5e1] rounded-[2px] text-xs min-h-[34px] cursor-pointer"
                            title="Убрать в карманы"
                          >
                            В карман
                          </button>
                          <button
                            onClick={() => handleDropFromHand('left')}
                            className="px-2.5 py-1.5 bg-red-950/50 hover:bg-red-900 border border-red-800/60 text-red-300 rounded-[2px] text-xs min-h-[34px] cursor-pointer"
                            title="Бросить на землю"
                          >
                            Бросить
                          </button>
                        </div>
                      )}
                    </div>

                    {/* RIGHT HAND */}
                    <div className="p-2.5 bg-[#14161a] border border-[#2a2e38] rounded-[2px] flex items-center justify-between gap-2 min-h-[56px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-11 h-11 rounded-[2px] bg-[#0b0c0e] border border-[#2a2e38] flex items-center justify-center shrink-0">
                          {player.rightHandItem ? (
                            <ItemIconCanvas itemId={player.rightHandItem.itemId} item={player.rightHandItem} size={32} />
                          ) : (
                            <Hand className="w-5 h-5 text-[#3a3f4d] stroke-[1.5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-[#9ba3af] font-mono uppercase">Правая рука</div>
                          <div className="text-xs font-bold text-[#f0f3f6] truncate">
                            {player.rightHandItem ? player.rightHandItem.nameRu : 'Пусто'}
                          </div>
                          {player.rightHandItem && (
                            <div className="text-[10px] text-[#9ba3af] font-mono flex items-center gap-1.5 flex-wrap">
                              <span>{getItemTotalWeight(player.rightHandItem)} кг • {getItemTotalVolume(player.rightHandItem)} л</span>
                              {player.rightHandItem.surfaceTemperature !== undefined && (
                                <span className={`flex items-center gap-0.5 ${player.rightHandItem.surfaceTemperature >= 52 ? 'text-amber-400 font-bold' : player.rightHandItem.surfaceTemperature <= 4 ? 'text-sky-300' : 'text-[#cbd5e1]'}`}>
                                  {player.rightHandItem.surfaceTemperature >= 52 ? <Flame className="w-3 h-3 text-amber-400 animate-pulse" /> : <Thermometer className="w-3 h-3 text-[#9ba3af]" />}
                                  {player.rightHandItem.surfaceTemperature > 0 ? '+' : ''}{player.rightHandItem.surfaceTemperature.toFixed(1)}°C
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {player.rightHandItem && (
                        <div className="flex items-center gap-1 shrink-0">
                          {player.rightHandItem.clothingStats && (
                            <button
                              onClick={() => handleEquipFromHand('right')}
                              className="px-2.5 py-1.5 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] rounded-[2px] text-xs font-black min-h-[34px] cursor-pointer"
                              title="Надеть одежду из руки"
                            >
                              Надеть
                            </button>
                          )}
                          {player.rightHandItem.isContainer && (
                            <button
                              onClick={() => { setOpenContainer(player.rightHandItem); setSelectedContainerItemIdx(0); }}
                              className="px-2.5 py-1.5 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] rounded-[2px] text-xs font-black min-h-[34px] cursor-pointer"
                            >
                              Открыть
                            </button>
                          )}
                          <button
                            onClick={() => handleStowHand('right')}
                            className="px-2.5 py-1.5 bg-[#0b0c0e] hover:bg-[#1c1f26] border border-[#2a2e38] text-[#cbd5e1] rounded-[2px] text-xs min-h-[34px] cursor-pointer"
                            title="Убрать в карманы"
                          >
                            В карман
                          </button>
                          <button
                            onClick={() => handleDropFromHand('right')}
                            className="px-2.5 py-1.5 bg-red-950/50 hover:bg-red-900 border border-red-800/60 text-red-300 rounded-[2px] text-xs min-h-[34px] cursor-pointer"
                            title="Бросить на землю"
                          >
                            Бросить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CLOTHING COMPARTMENTS GRID */}
                <div className="flex flex-col gap-3">
                  {compartments.map((comp) => {
                    const getCompIcon = (type: string, className = "w-3.5 h-3.5") => {
                      if (type === 'user') return <User className={className} />;
                      if (type === 'shirt') return <Shirt className={className} />;
                      if (type === 'pants') return (
                        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 3h12l1 18-5-1-2-9-2 9-5 1z"/>
                        </svg>
                      );
                      return <Luggage className={className} />;
                    };

                    const compVolumePct = Math.min(100, Math.round((comp.usedVolumeL / comp.capacityL) * 100));
                    const compWeightPct = Math.min(100, Math.round((comp.usedWeightKg / comp.maxWeightKg) * 100));

                    return (
                      <div 
                        key={comp.id} 
                        className="border border-[#2a2e38] rounded-[2px] p-2.5 sm:p-3 flex flex-col gap-2 transition-all bg-[#0b0c0e]/60"
                      >
                        {/* Compartment Header */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#2a2e38] pb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-[2px] border bg-[#14161a] text-[#c68a35] border-[#2a2e38]">
                              {getCompIcon(comp.iconType, "w-3.5 h-3.5")}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[#f0f3f6]">
                                  {comp.nameRu}
                                </span>
                                {comp.sourceItemNameRu && comp.id !== 'base' && (
                                  <span className="text-[11px] font-medium text-[#c68a35] hidden sm:inline">
                                    «{comp.sourceItemNameRu}»
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#9ba3af]">
                                Вместимость: {comp.capacityL}л • Макс. предм: {comp.maxItemVolumeL}л
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2 font-mono">
                            {/* Volume & Weight metrics */}
                            <div className="flex items-center gap-1 text-[10px] bg-[#14161a] px-1.5 sm:px-2 py-0.5 rounded-[2px] border border-[#2a2e38]">
                              <span className="text-[#9ba3af] hidden sm:inline">Объем:</span>
                              <span className={compVolumePct > 90 ? 'text-red-400 font-bold' : 'text-[#f0f3f6] font-bold'}>
                                {comp.usedVolumeL}/{comp.capacityL}л
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] bg-[#14161a] px-1.5 sm:px-2 py-0.5 rounded-[2px] border border-[#2a2e38]">
                              <span className="text-[#9ba3af] hidden sm:inline">Вес:</span>
                              <span className={compWeightPct > 90 ? 'text-red-400 font-bold' : 'text-[#f0f3f6] font-bold'}>
                                {comp.usedWeightKg}/{comp.maxWeightKg}кг
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[#14161a] text-[#c68a35] rounded-[2px] border border-[#2a2e38]">
                              {comp.slotCount} сл.
                            </span>
                          </div>
                        </div>

                        {/* Compartment Slots Grid */}
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {Array.from({ length: comp.slotCount }).map((_, localIdx) => {
                            const slotIdx = comp.startIndex + localIdx;
                            const item = inventory[slotIdx];
                            const isSelected = selectedIndex === slotIdx;
                            const isHotbar = slotIdx < 6;
                            const isMatch = matchesFilter(item);
                            const isDimmed = selectedCategory !== 'all' && item && !isMatch;

                            return (
                              <div
                                key={slotIdx}
                                id={`inventory-slot-${slotIdx}`}
                                draggable={!!item}
                                onDragStart={(e) => {
                                  if (item) {
                                    e.dataTransfer.setData('text/plain', slotIdx.toString());
                                  }
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const fromIdxStr = e.dataTransfer.getData('text/plain');
                                  const fromIdx = parseInt(fromIdxStr, 10);
                                  if (!isNaN(fromIdx) && fromIdx !== slotIdx) {
                                    moveInventoryItem(player, fromIdx, slotIdx);
                                    forceRender(n => n + 1);
                                  }
                                }}
                                onClick={() => {
                                  if (item) setSelectedIndex(slotIdx);
                                }}
                                onDoubleClick={() => {
                                  if (item) {
                                    if (item.isContainer) {
                                      setOpenContainer(item);
                                      setSelectedContainerItemIdx(0);
                                    } else {
                                      handleUseItem(slotIdx);
                                    }
                                  }
                                }}
                                className={`relative aspect-square rounded-[2px] border flex flex-col items-center justify-center cursor-pointer transition-all min-h-[52px] ${
                                  isDimmed ? 'opacity-25 grayscale' : ''
                                } ${
                                  isSelected && item
                                    ? 'border-[#c68a35] bg-[#c68a35]/20 shadow-lg ring-1 ring-[#c68a35]/60 scale-105 z-10'
                                    : item
                                    ? 'border-[#2a2e38] bg-[#14161a] hover:bg-[#1c1f26] hover:border-white/20'
                                    : 'border-[#2a2e38]/60 bg-[#0b0c0e] cursor-default hover:border-[#2a2e38]'
                                }`}
                              >
                                {/* Hotbar Indicator */}
                                {isHotbar && (
                                  <span className="absolute top-1 left-1 text-[9px] font-mono font-bold text-[#c68a35] bg-[#0b0c0e]/90 px-1 rounded-[2px] border border-[#c68a35]/30">
                                    {slotIdx + 1}
                                  </span>
                                )}

                                {/* Pocket/Clothing Origin Icon Watermark */}
                                <div 
                                  className={`absolute bottom-1 left-1.5 pointer-events-none transition-opacity ${
                                    item ? 'opacity-20' : 'opacity-30'
                                  } text-[#c68a35]`}
                                  title={`${comp.nameRu} (Слот #${slotIdx + 1})`}
                                >
                                  {getCompIcon(comp.iconType, "w-2.5 h-2.5")}
                                </div>

                                {item ? (
                                  <>
                                    <ItemIconCanvas itemId={item.itemId} item={item} size={36} className="transform hover:scale-105 transition" />
                                    {/* Thermal Heat Hazard Indicator */}
                                    {item.surfaceTemperature !== undefined && item.surfaceTemperature >= 52 && (
                                      <span 
                                        className="absolute top-1 left-1 p-0.5 bg-[#0b0c0e]/95 border border-amber-500/70 rounded-[2px] text-amber-400 z-10 pointer-events-none" 
                                        title={`Горячо! Снаружи: ${item.surfaceTemperature}°C`}
                                      >
                                        <Flame className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                                      </span>
                                    )}
                                    {item.count > 1 && (
                                      <span className="absolute top-1 right-1 px-1.5 py-0.2 bg-[#0b0c0e] border border-[#2a2e38] rounded-[2px] text-[10px] font-mono font-bold text-[#f0f3f6]">
                                        {item.count}
                                      </span>
                                    )}
                                    {/* Container Badge for standalone nested containers */}
                                    {item.isContainer && (
                                      <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-[#0b0c0e] border border-[#c68a35]/60 rounded-[2px] text-[8px] font-mono font-bold text-[#d99a41]">
                                        {item.contents?.length || 0}
                                      </span>
                                    )}
                                    {/* Liquid / Substance Container Fill Bar */}
                                    {item.fluidStorage ? (
                                      <div className="absolute bottom-1 left-1.5 right-1.5 flex flex-col items-center gap-0.5 pointer-events-none">
                                        <div className="w-full bg-[#0b0c0e] h-1 rounded-none overflow-hidden border border-[#2a2e38]">
                                          <div 
                                            className="h-full bg-[#c68a35] rounded-none transition-all"
                                            style={{ width: `${Math.max(0, Math.min(100, (item.fluidStorage.currentMl / (item.fluidStorage.maxMl || 1)) * 100))}%` }}
                                          />
                                        </div>
                                      </div>
                                    ) : item.maxPortions && item.maxPortions > 1 ? (
                                      <div className="absolute bottom-1 left-1.5 right-1.5 flex flex-col items-center gap-0.5 pointer-events-none">
                                        <div className="w-full bg-[#0b0c0e] h-1 rounded-none overflow-hidden border border-[#2a2e38]">
                                          <div 
                                            className="h-full bg-[#c68a35] rounded-none transition-all"
                                            style={{ width: `${Math.max(0, Math.min(100, ((item.portions ?? item.maxPortions) / item.maxPortions) * 100))}%` }}
                                          />
                                        </div>
                                      </div>
                                    ) : null}
                                  </>
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-none bg-[#2a2e38]" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* STANDALONE CARRIED CONTAINERS (WALLET, SACKS, HAND CONTAINERS) */}
                {(() => {
                  const pocketContainers = (player.inventory || []).filter(i => i && i.isContainer);
                  const handContainers = [player.leftHandItem, player.rightHandItem].filter(i => i && i.isContainer) as InventoryItem[];
                  const allContainers: { item: InventoryItem; source: string }[] = [];

                  pocketContainers.forEach(c => {
                    allContainers.push({ item: c, source: 'В карманах' });
                  });
                  handContainers.forEach(c => {
                    allContainers.push({ item: c, source: 'В руке' });
                  });

                  if (allContainers.length === 0) return null;

                  return (
                    <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          Отдельные хранилища и кошельки ({allContainers.length})
                        </span>
                        <span className="text-[10px] text-zinc-500">Нажмите «Открыть» для просмотра содержимого</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {allContainers.map((entry, cIdx) => {
                          const cItem = entry.item;
                          const count = cItem.contents?.length || 0;
                          const maxVol = cItem.containerCapacityL || 20;
                          const curVol = (cItem.contents || []).reduce((acc, it) => acc + getItemTotalVolume(it), 0);

                          return (
                            <div
                              key={cIdx}
                              className="p-2.5 bg-[#14161a] border border-[#2a2e38] hover:border-[#c68a35]/40 rounded-[2px] flex items-center justify-between gap-2.5 transition"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 rounded-[2px] bg-[#0b0c0e] border border-[#2a2e38] flex items-center justify-center shrink-0">
                                  <ItemIconCanvas itemId={cItem.itemId} item={cItem} size={26} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] text-[#c68a35] font-mono leading-none mb-0.5">{entry.source}</div>
                                  <div className="text-xs font-bold text-[#f0f3f6] truncate">{cItem.nameRu}</div>
                                  <div className="text-[10px] text-[#9ba3af] font-mono">
                                    {count} предм. • {curVol.toFixed(1)} / {maxVol} л
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setOpenContainer(cItem);
                                  setSelectedContainerItemIdx(0);
                                }}
                                className="px-3 py-1.5 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-black rounded-[2px] text-xs transition shrink-0 shadow min-h-[32px] cursor-pointer"
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

              {/* RIGHT: ITEM DETAILS & ACTIONS (5 cols) */}
              <div className="lg:col-span-5 bg-[#0b0c0e]/80 border border-[#2a2e38] rounded-[2px] p-4 sm:p-5 flex flex-col justify-between gap-4">
                {selectedEntry && selectedEntry.item ? (
                  <div className="flex flex-col gap-4">
                    {/* Item Card Banner */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-16 h-16 rounded-[2px] bg-[#14161a] border border-[#2a2e38] flex items-center justify-center shadow-inner shrink-0 p-1">
                        <ItemIconCanvas itemId={selectedEntry.item.itemId} item={selectedEntry.item} size={52} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap font-mono">
                          <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase bg-[#1c1f26] text-[#c68a35] border border-[#c68a35]/40">
                            {selectedEntry.item.category === 'food' ? 'Еда' :
                             selectedEntry.item.category === 'drink' ? 'Напиток' :
                             selectedEntry.item.category === 'med' ? 'Медицина' :
                             selectedEntry.item.category === 'tool' ? 'Инструмент' : 'Ценность'}
                          </span>
                          <span className="text-xs text-[#9ba3af] font-mono">
                            x{selectedEntry.item.count} в пачке
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#f0f3f6] leading-snug">
                          {selectedEntry.item.nameRu}
                        </h3>
                        <p className="text-xs text-[#9ba3af] font-mono">
                          {selectedEntry.item.name}
                        </p>
                      </div>
                    </div>

                    {/* Pocket / Compartment Location Details */}
                    {(() => {
                      const slotComp = getSlotCompartment(player, selectedEntry.originalIndex);
                      if (slotComp) {
                        return (
                          <div className="flex items-center justify-between text-xs bg-[#14161a] px-3 py-2 rounded-[2px] border border-[#2a2e38] font-mono">
                            <span className="text-[#9ba3af] font-medium">Отделение:</span>
                            <span className="text-[#f0f3f6] font-bold flex items-center gap-1.5">
                              <span className="text-[#c68a35]">{slotComp.compartment.nameRu}</span>
                              {slotComp.compartment.sourceItemNameRu && slotComp.compartment.id !== 'base' && (
                                <span className="text-[#9ba3af] font-normal">({slotComp.compartment.sourceItemNameRu})</span>
                              )}
                              <span className="text-[#5a6272] font-mono text-[11px]">• Слот #{selectedEntry.originalIndex + 1}</span>
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Physical Metrics of Item */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 bg-[#14161a] border border-[#2a2e38] rounded-[2px] flex items-center justify-between">
                        <span className="text-[#9ba3af]">Вес:</span>
                        <span className="text-[#f0f3f6] font-bold">{getItemTotalWeight(selectedEntry.item)} кг</span>
                      </div>
                      <div className="p-2 bg-[#14161a] border border-[#2a2e38] rounded-[2px] flex items-center justify-between">
                        <span className="text-[#9ba3af]">Объем:</span>
                        <span className="text-[#c68a35] font-bold">{getItemTotalVolume(selectedEntry.item)} л</span>
                      </div>
                    </div>

                    {/* Thermodynamics Card */}
                    {(() => {
                      const thermalInfo = getItemThermalDisplayInfo(selectedEntry.item);
                      return (
                        <div className="p-2.5 bg-[#14161a] border border-[#2a2e38] rounded-[2px] flex flex-col gap-1.5 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[#9ba3af] flex items-center gap-1.5 font-bold">
                              <Thermometer className="w-3.5 h-3.5 text-[#c68a35]" />
                              Термодинамика:
                            </span>
                            {thermalInfo.hazardBadge && (
                              <span className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-black border flex items-center gap-1 ${thermalInfo.hazardBadge.bgClass} ${thermalInfo.hazardBadge.textClass} ${thermalInfo.hazardBadge.borderClass}`}>
                                <Flame className="w-2.5 h-2.5" />
                                {thermalInfo.hazardBadge.text}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                            <div className="bg-[#0b0c0e] p-1.5 rounded-[2px] border border-[#2a2e38] flex justify-between items-center">
                              <span className="text-[#9ba3af]">Темп. предмета:</span>
                              <span className={`font-mono font-bold ${thermalInfo.tempColorClass}`}>{thermalInfo.coreTempText}</span>
                            </div>
                            <div className="bg-[#0b0c0e] p-1.5 rounded-[2px] border border-[#2a2e38] flex justify-between items-center">
                              <span className="text-[#9ba3af]">Снаружи:</span>
                              <span className={`font-mono font-bold ${thermalInfo.tempColorClass}`}>{thermalInfo.surfaceTempText}</span>
                            </div>
                            <div className="bg-[#0b0c0e] p-1.5 rounded-[2px] border border-[#2a2e38] flex justify-between items-center">
                              <span className="text-[#9ba3af]">Потеря тепла:</span>
                              <span className="font-mono text-[#cbd5e1]">{thermalInfo.heatLossText}</span>
                            </div>
                            <div className="bg-[#0b0c0e] p-1.5 rounded-[2px] border border-[#2a2e38] flex justify-between items-center">
                              <span className="text-[#9ba3af]">Удержание:</span>
                              <span className="font-mono text-[#cbd5e1]">{thermalInfo.retentionText}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Description */}
                    <div className="p-3 bg-[#14161a] border border-[#2a2e38] rounded-[2px] text-xs text-[#cbd5e1] leading-relaxed">
                      {selectedEntry.item.descriptionRu}
                    </div>

                    {/* Smartphone Specs Card */}
                    {selectedEntry.item.phoneSpecs && (
                      <div className="p-3 bg-[#14161a] border border-[#2a2e38] rounded-[2px] flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#c68a35] flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4" />
                            {selectedEntry.item.phoneSpecs.modelName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#0b0c0e] border border-[#2a2e38] rounded-[2px] text-[#9ba3af]">
                            {selectedEntry.item.phoneSpecs.osName}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#cbd5e1]">
                          <div className="bg-[#0b0c0e] p-1.5 rounded-[2px] border border-[#2a2e38] flex justify-between">
                            <span className="text-[#9ba3af]">Экран:</span>
                            <span className="font-mono text-[#f0f3f6]">{selectedEntry.item.phoneSpecs.screenSize} ({selectedEntry.item.phoneSpecs.refreshRateHz}Hz)</span>
                          </div>
                          <div className="bg-[#0b0c0e] p-1.5 rounded-[2px] border border-[#2a2e38] flex justify-between">
                            <span className="text-[#9ba3af]">Камера:</span>
                            <span className="font-mono text-[#f0f3f6]">{selectedEntry.item.phoneSpecs.cameraMegaPixels} MP</span>
                          </div>
                          <div className="bg-[#0b0c0e] p-1.5 rounded-[2px] border border-[#2a2e38] flex justify-between">
                            <span className="text-[#9ba3af]">Память:</span>
                            <span className="font-mono text-[#f0f3f6]">{selectedEntry.item.phoneSpecs.storageGb} GB</span>
                          </div>
                          <div className="bg-[#0b0c0e] p-1.5 rounded-[2px] border border-[#2a2e38] flex justify-between">
                            <span className="text-[#9ba3af]">Батарея:</span>
                            <span className="font-mono text-[#f0f3f6]">{selectedEntry.item.phoneSpecs.batteryCapacityMah} мАч</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Container specs and action */}
                    {selectedEntry.item.isContainer && (
                      <div className="p-3 bg-[#14161a] border border-[#2a2e38] rounded-[2px] flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-[#c68a35] flex items-center gap-1.5">
                            <Layers className="w-4 h-4" />
                            Вместимость контейнера:
                          </span>
                          <span className="font-mono text-[#f0f3f6]">
                            {selectedEntry.item.containerCapacityL} л / {selectedEntry.item.maxContainedWeightKg} кг
                          </span>
                        </div>
                        <div className="text-[11px] text-[#9ba3af]">
                          Внутри: {selectedEntry.item.contents?.length || 0} предметов.
                        </div>
                        <button
                          onClick={() => { setOpenContainer(selectedEntry.item); setSelectedContainerItemIdx(0); }}
                          className="w-full py-2.5 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-black rounded-[2px] text-xs flex items-center justify-center gap-2 shadow min-h-[40px] cursor-pointer"
                        >
                          <Package className="w-4 h-4" />
                          <span>Просмотреть содержимое ({selectedEntry.item.contents?.length || 0})</span>
                        </button>
                        {(selectedEntry.item.singleUseContainer || selectedEntry.item.tornItemId) && selectedEntry.item.contents && selectedEntry.item.contents.length > 0 && (
                          <button
                            onClick={() => {
                              unpackSingleUseContainer(player, selectedEntry.item, world);
                              setSelectedIndex(0);
                              forceRender(n => n + 1);
                            }}
                            className="w-full py-2.5 bg-[#1c1f26] hover:bg-[#2a2e38] border border-[#c68a35]/60 text-[#d99a41] font-bold rounded-[2px] text-xs flex items-center justify-center gap-2 shadow min-h-[40px] cursor-pointer"
                          >
                            <Scissors className="w-4 h-4" />
                            <span>Вскрыть упаковку ({selectedEntry.item.contents.length} предм.)</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Stash into other container option */}
                    {availableContainers.filter(cont => cont.id !== selectedEntry.item.id).length > 0 && (
                      <div className="p-2.5 bg-[#14161a] border border-[#2a2e38] rounded-[2px] flex flex-col gap-1.5 text-xs font-mono">
                        <span className="text-[#9ba3af] font-semibold flex items-center gap-1">
                          <ArrowDownToLine className="w-3.5 h-3.5 text-[#c68a35]" />
                          Спрятать в контейнер:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {availableContainers
                            .filter(cont => cont.id !== selectedEntry.item.id)
                            .map(cont => {
                              const check = canItemFitInContainer(cont, selectedEntry.item);
                              return (
                                <button
                                  key={cont.id}
                                  onClick={() => handlePutIntoContainer(cont, selectedEntry.originalIndex)}
                                  disabled={!check.fits}
                                  className="px-3 py-1.5 bg-[#0b0c0e] hover:bg-[#1c1f26] disabled:opacity-30 disabled:cursor-not-allowed text-[#cbd5e1] rounded-[2px] text-xs font-medium border border-[#2a2e38] min-h-[34px] flex items-center gap-1.5 transition cursor-pointer"
                                  title={check.fits ? `Положить ${selectedEntry.item.nameRu} в ${cont.nameRu}` : check.reason}
                                >
                                  <span>В {cont.nameRu}</span>
                                  {cont.contents && cont.contents.length > 0 && (
                                    <span className="text-[10px] font-mono text-[#c68a35]">({cont.contents.length})</span>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Action buttons: Take in hand, Use, Equip, Drop */}
                    <div className="flex flex-col gap-2 mt-1 font-mono">
                      {/* Hands Action */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleTakeToHand('left', selectedEntry.originalIndex)}
                          disabled={!!player.leftHandItem}
                          className="py-2.5 bg-[#14161a] hover:bg-[#1c1f26] disabled:opacity-40 text-[#cbd5e1] text-xs font-semibold rounded-[2px] border border-[#2a2e38] flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer"
                        >
                          <Hand className="w-3.5 h-3.5" />
                          <span>В левую руку</span>
                        </button>
                        <button
                          onClick={() => handleTakeToHand('right', selectedEntry.originalIndex)}
                          disabled={!!player.rightHandItem}
                          className="py-2.5 bg-[#14161a] hover:bg-[#1c1f26] disabled:opacity-40 text-[#cbd5e1] text-xs font-semibold rounded-[2px] border border-[#2a2e38] flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer"
                        >
                          <Hand className="w-3.5 h-3.5" />
                          <span>В правую руку</span>
                        </button>
                      </div>

                      {selectedEntry.item.clothingStats ? (
                        <button
                          id="btn-equip-selected-item"
                          onClick={() => handleEquipItem(selectedEntry.originalIndex)}
                          className="w-full py-2.5 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-black rounded-[2px] shadow-lg flex items-center justify-center gap-2 text-sm transition min-h-[40px] cursor-pointer"
                        >
                          <span>Надеть / Экипировать</span>
                        </button>
                      ) : selectedEntry.item.isContainer ? (
                        <button
                          id="btn-open-selected-container"
                          onClick={() => {
                            setOpenContainer(selectedEntry.item);
                            setSelectedContainerItemIdx(0);
                          }}
                          className="w-full py-2.5 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-black rounded-[2px] shadow-lg flex items-center justify-center gap-2 text-sm transition min-h-[40px] cursor-pointer"
                        >
                          <Package className="w-4 h-4" />
                          <span>Открыть контейнер ({selectedEntry.item.contents?.length || 0} предм.)</span>
                        </button>
                      ) : (selectedEntry.item.phoneSpecs || selectedEntry.item.itemId.startsWith('phone_') || selectedEntry.item.itemId === 'smartphone') ? (
                        <button
                          id="btn-use-selected-phone"
                          onClick={() => handleUseItem(selectedEntry.originalIndex)}
                          className="w-full py-2.5 bg-[#14161a] hover:bg-[#1c1f26] text-[#f0f3f6] font-bold rounded-[2px] border border-[#2a2e38] shadow flex items-center justify-center gap-2 text-sm transition min-h-[40px] cursor-pointer"
                        >
                          <Smartphone className="w-4 h-4 text-[#c68a35]" />
                          <span>Включить экран телефона</span>
                        </button>
                      ) : selectedEntry.item.itemId.startsWith('car_key') ? (
                        <div className="bg-[#14161a] border border-[#2a2e38] rounded-[2px] p-3 flex flex-col gap-2.5 shadow-inner">
                          {(() => {
                            const targetVeh = world ? getTargetVehicleForKey(player, selectedEntry.item, world) : null;
                            const distM = targetVeh ? Math.round(Math.hypot(targetVeh.x - player.x, targetVeh.y - player.y) / 10) : null;
                            const isSmartOrDisplay = selectedEntry.item.keyTier === 'smart' || selectedEntry.item.keyTier === 'display';

                            return (
                              <>
                                <div className="flex items-center justify-between font-mono">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#c68a35]">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>
                                      {selectedEntry.item.keyTier === 'display' ? 'Smart Display Key' :
                                       selectedEntry.item.keyTier === 'smart' ? 'Smart Keyless-Go' :
                                       selectedEntry.item.keyTier === 'flip' ? 'Выкидной брелок' : 'Ключ зажигания'}
                                    </span>
                                  </div>
                                  {distM !== null ? (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] border bg-[#c68a35]/20 text-[#d99a41] border-[#c68a35]/40">
                                      {distM}м до авто
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono text-[#5a6272]">Вне зоны</span>
                                  )}
                                </div>

                                {targetVeh && (
                                  <div className="grid grid-cols-3 gap-1 text-[10px] font-mono bg-[#0b0c0e] p-2 rounded-[2px] border border-[#2a2e38]">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[#9ba3af]">Замок: </span>
                                      <span className={`font-bold flex items-center gap-0.5 ${targetVeh.isLocked ? 'text-[#c68a35]' : 'text-slate-300'}`}>
                                        {targetVeh.isLocked ? <Lock className="w-3 h-3 inline" /> : <Unlock className="w-3 h-3 inline" />}
                                        {targetVeh.isLocked ? 'Закрыт' : 'Открыт'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[#9ba3af]">ДВС: </span>
                                      <span className={`font-bold flex items-center gap-0.5 ${targetVeh.engineState?.engineRunning ? 'text-[#c68a35]' : 'text-[#5a6272]'}`}>
                                        {targetVeh.engineState?.engineRunning && <Zap className="w-3 h-3 inline text-[#c68a35]" />}
                                        {targetVeh.engineState?.engineRunning ? 'Вкл' : 'Выкл'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[#9ba3af]">Фары: </span>
                                      <span className={`font-bold flex items-center gap-0.5 ${targetVeh.headlightsOn ? 'text-[#c68a35]' : 'text-[#5a6272]'}`}>
                                        {targetVeh.headlightsOn && <Lightbulb className="w-3 h-3 inline text-[#c68a35]" />}
                                        {targetVeh.headlightsOn ? 'Вкл' : 'Выкл'}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Key Buttons Grid */}
                                <div className="grid grid-cols-2 gap-2">
                                  {/* Lock / Unlock */}
                                  <button
                                    onClick={() => {
                                      handleCarKeyActivation(player, selectedEntry.item, world, 'toggle_lock');
                                      forceRender(n => n + 1);
                                    }}
                                    className="py-2 px-2.5 rounded-[2px] font-bold text-xs flex items-center justify-center gap-1.5 border transition min-h-[40px] bg-[#14161a] hover:bg-[#1c1f26] text-[#cbd5e1] border-[#2a2e38] cursor-pointer"
                                  >
                                    {targetVeh?.isLocked ? <Unlock className="w-3.5 h-3.5 text-[#c68a35]" /> : <Lock className="w-3.5 h-3.5 text-[#c68a35]" />}
                                    <span>{targetVeh?.isLocked ? 'Открыть ЦЗ' : 'Закрыть ЦЗ'}</span>
                                  </button>

                                  {/* Remote Engine Start or Finder */}
                                  {isSmartOrDisplay ? (
                                    <button
                                      onClick={() => {
                                        handleCarKeyActivation(player, selectedEntry.item, world, 'toggle_engine');
                                        forceRender(n => n + 1);
                                      }}
                                      className="py-2 px-2.5 rounded-[2px] font-bold text-xs flex items-center justify-center gap-1.5 border transition min-h-[40px] bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-black border-[#c68a35] cursor-pointer"
                                    >
                                      <Zap className="w-3.5 h-3.5" />
                                      <span>{targetVeh?.engineState?.engineRunning ? 'Заглушить' : 'Автозапуск'}</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        handleCarKeyActivation(player, selectedEntry.item, world, 'horn');
                                        forceRender(n => n + 1);
                                      }}
                                      className="py-2 px-2.5 bg-[#14161a] hover:bg-[#1c1f26] text-[#cbd5e1] rounded-[2px] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#2a2e38] transition min-h-[40px] cursor-pointer"
                                    >
                                      <Volume2 className="w-3.5 h-3.5 text-[#c68a35]" />
                                      <span>Поиск авто</span>
                                    </button>
                                  )}

                                  {/* Headlights Remote Toggle */}
                                  {isSmartOrDisplay && (
                                    <button
                                      onClick={() => {
                                        handleCarKeyActivation(player, selectedEntry.item, world, 'toggle_headlights');
                                        forceRender(n => n + 1);
                                      }}
                                      className="py-2 px-2 rounded-[2px] font-bold text-[11px] flex items-center justify-center gap-1 border transition min-h-[40px] bg-[#14161a] hover:bg-[#1c1f26] text-[#cbd5e1] border-[#2a2e38] cursor-pointer"
                                    >
                                      <Lightbulb className="w-3 h-3 text-[#c68a35]" />
                                      <span>{targetVeh?.headlightsOn ? 'Выкл фары' : 'Вкл фары'}</span>
                                    </button>
                                  )}

                                  {/* Horn / Hazard */}
                                  {isSmartOrDisplay && (
                                    <button
                                      onClick={() => {
                                        handleCarKeyActivation(player, selectedEntry.item, world, 'horn');
                                        forceRender(n => n + 1);
                                      }}
                                      className="py-2 px-2 bg-[#14161a] hover:bg-[#1c1f26] text-[#cbd5e1] rounded-[2px] font-bold text-[11px] flex items-center justify-center gap-1 border border-[#2a2e38] transition min-h-[40px] cursor-pointer"
                                    >
                                      <Volume2 className="w-3 h-3 text-[#c68a35]" />
                                      <span>Поиск (Сигнал)</span>
                                    </button>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        selectedEntry.item.itemId.startsWith('property_') ||
                        selectedEntry.item.itemId === 'car_pts' ||
                        selectedEntry.item.itemId === 'car_tech_passport' ||
                        selectedEntry.item.itemId === 'car_contract_dkp'
                      ) ? (
                        <button
                          id="btn-inspect-selected-document"
                          onClick={() => onInspectDocument?.(selectedEntry.item)}
                          className="w-full py-2.5 bg-[#c68a35] hover:bg-[#d99a41] active:scale-98 text-[#0b0c0e] font-black rounded-[2px] shadow-lg flex items-center justify-center gap-2 text-sm transition min-h-[40px] cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-[#0b0c0e]" />
                          <span>Изучить / Просмотреть документ</span>
                        </button>
                      ) : selectedEntry.item.usable && (
                        <button
                          id="btn-use-selected-item"
                          onClick={() => handleUseItem(selectedEntry.originalIndex)}
                          className="w-full py-2.5 bg-[#c68a35] hover:bg-[#d99a41] active:scale-98 text-[#0b0c0e] font-black rounded-[2px] border border-[#c68a35] shadow flex items-center justify-center gap-2 text-sm transition min-h-[40px] cursor-pointer"
                        >
                          <Utensils className="w-4 h-4" />
                          <span>Использовать</span>
                        </button>
                      )}

                      <button
                        id="btn-drop-selected-item"
                        onClick={() => handleDropItem(selectedEntry.originalIndex)}
                        className="w-full py-2 bg-[#14161a] hover:bg-[#1c1f26] active:scale-98 text-[#cbd5e1] font-semibold rounded-[2px] border border-[#2a2e38] flex items-center justify-center gap-2 text-xs transition min-h-[38px] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-[#9ba3af]" />
                        <span>Выбросить 1 шт. на землю</span>
                      </button>

                      {/* Trash Bin Disposal Button */}
                      {world && isPlayerNearTrashBin(player, world) && (
                        <button
                          id="btn-dispose-in-trash-bin"
                          onClick={() => {
                            disposeTrashInBin(player, world, selectedEntry.originalIndex);
                            forceRender(n => n + 1);
                          }}
                          className="w-full py-2 bg-[#c68a35]/20 hover:bg-[#c68a35]/30 active:scale-98 text-[#d99a41] font-bold rounded-[2px] border border-[#c68a35]/50 shadow flex items-center justify-center gap-2 text-xs transition min-h-[38px] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-[#c68a35]" />
                          <span>Выбросить в урну / контейнер (+Деньги)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 text-[#5a6272]">
                    <Package className="w-12 h-12 mb-3 text-[#3a3f4d] stroke-[1.5]" />
                    <p className="text-sm font-medium text-[#9ba3af]">Выберите предмет в ячейке</p>
                    <p className="text-xs text-[#5a6272] mt-1">Отобразятся свойства, параметры и действия с предметом</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* CONTAINER DETAILED VIEW (SUB-INVENTORY) */}
          {activeTab === 'inventory' && openContainer && (
            <div className="lg:col-span-12 flex flex-col gap-4 font-mono">
              {/* Back button & Container Info Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#0b0c0e]/90 border border-[#2a2e38] rounded-[2px] gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setOpenContainer(null)}
                    className="p-2.5 bg-[#14161a] hover:bg-[#1c1f26] border border-[#2a2e38] text-[#f0f3f6] rounded-[2px] flex items-center gap-1 text-xs font-bold transition min-h-[38px] shrink-0 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#c68a35]" />
                    <span>Назад в карманы</span>
                  </button>
                  <div className="w-12 h-12 rounded-[2px] bg-[#14161a] border border-[#2a2e38] flex items-center justify-center shrink-0">
                    <ItemIconCanvas itemId={openContainer.itemId} item={openContainer} size={32} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#f0f3f6] flex items-center gap-2 font-mono">
                      {openContainer.nameRu}
                      <span className="text-[10px] px-2 py-0.5 bg-[#1c1f26] border border-[#c68a35]/40 rounded-[2px] text-[#c68a35] font-mono">
                        Контейнер
                      </span>
                    </h3>
                    <p className="text-xs text-[#9ba3af] font-mono">
                      Вместимость: {openContainer.containerCapacityL} л • Макс. вес: {openContainer.maxContainedWeightKg} кг • Лимит: {openContainer.maxContainedItemVolumeL || openContainer.containerCapacityL} л
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-[#9ba3af] self-end sm:self-center">
                  <div>
                    <span>Предметов: </span>
                    <span className="text-[#f0f3f6] font-bold">{openContainer.contents?.length || 0}</span>
                  </div>
                  <div>
                    <span>Объем: </span>
                    <span className="text-[#c68a35] font-bold">{getItemTotalVolume(openContainer)} л</span>
                  </div>
                  <div>
                    <span>Вес: </span>
                    <span className="text-[#f0f3f6] font-bold">{getItemTotalWeight(openContainer)} кг</span>
                  </div>
                </div>
              </div>

              {/* Contents Grid & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(openContainer.contents || []).length > 0 ? (
                  openContainer.contents!.map((contItem, cIdx) => (
                    <div 
                      key={cIdx} 
                      className="p-3 bg-[#0b0c0e]/80 border border-[#2a2e38] rounded-[2px] flex flex-col justify-between gap-3 hover:border-[#c68a35]/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[2px] bg-[#14161a] border border-[#2a2e38] flex items-center justify-center shrink-0">
                          <ItemIconCanvas itemId={contItem.itemId} item={contItem} size={32} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#f0f3f6] truncate">{contItem.nameRu}</div>
                          <div className="text-xs text-[#9ba3af] font-mono">
                            {contItem.count} шт. • {getItemTotalWeight(contItem)} кг • {getItemTotalVolume(contItem)} л
                          </div>
                        </div>
                      </div>

                      {/* Action buttons for item in container */}
                      <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                        <button
                          onClick={() => handleExtractFromContainer(openContainer, cIdx, 'pockets')}
                          className="py-1.5 px-2 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-black rounded-[2px] flex items-center justify-center gap-1 min-h-[36px] cursor-pointer"
                          title="Переложить в карман"
                        >
                          <ArrowUpFromLine className="w-3.5 h-3.5" />
                          <span>В карман</span>
                        </button>
                        <button
                          onClick={() => handleExtractFromContainer(openContainer, cIdx, 'rightHand')}
                          disabled={!!player.rightHandItem}
                          className="py-1.5 px-2 bg-[#14161a] hover:bg-[#1c1f26] disabled:opacity-40 text-[#cbd5e1] font-semibold rounded-[2px] flex items-center justify-center gap-1 border border-[#2a2e38] min-h-[36px] cursor-pointer"
                          title="Взять в правую руку"
                        >
                          <Hand className="w-3.5 h-3.5" />
                          <span>В руку</span>
                        </button>
                        <button
                          onClick={() => handleDropFromContainer(openContainer, cIdx)}
                          className="py-1.5 px-2 bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-300 font-semibold rounded-[2px] flex items-center justify-center gap-1 min-h-[36px] cursor-pointer"
                          title="Выбросить на землю"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Бросить</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-[#5a6272] bg-[#0b0c0e]/30 border border-dashed border-[#2a2e38] rounded-[2px]">
                    <Package className="w-10 h-10 mb-2 mx-auto text-[#3a3f4d]" />
                    <p className="text-sm font-medium text-[#9ba3af]">Контейнер пуст</p>
                    <p className="text-xs text-[#5a6272] mt-1">Переложите сюда предметы из карманов с помощью кнопки «Спрятать в контейнер»</p>
                  </div>
                )}
              </div>

              {/* Quick Deposit Section: Items from pockets & hands */}
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
                  <div className="p-3.5 bg-[#0b0c0e]/80 border border-[#2a2e38] rounded-[2px] flex flex-col gap-2.5 mt-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#cbd5e1]">
                      <span className="flex items-center gap-1.5 text-[#c68a35]">
                        <ArrowDownToLine className="w-4 h-4" />
                        Положить предмет из карманов или рук в {openContainer.nameRu}:
                      </span>
                      <span className="text-[11px] text-[#5a6272]">Нажмите, чтобы переместить</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {depositCandidates.map((cand, cIdx) => {
                        const check = canItemFitInContainer(openContainer, cand.item);
                        return (
                          <button
                            key={cIdx}
                            disabled={!check.fits}
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
                            className={`p-2 rounded-[2px] border flex items-center gap-2 text-left transition cursor-pointer ${
                              check.fits
                                ? 'bg-[#14161a] hover:bg-[#1c1f26] border-[#2a2e38] text-[#f0f3f6] hover:border-[#c68a35]/60'
                                : 'bg-[#0b0c0e] border-[#2a2e38]/40 text-[#5a6272] opacity-40 cursor-not-allowed'
                            }`}
                            title={check.fits ? `Положить ${cand.item.nameRu} в ${openContainer.nameRu}` : check.reason}
                          >
                            <div className="w-8 h-8 rounded-[2px] bg-[#0b0c0e] border border-[#2a2e38] flex items-center justify-center shrink-0 p-0.5">
                              <ItemIconCanvas itemId={cand.item.itemId} item={cand.item} size={22} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate leading-tight">{cand.item.nameRu}</div>
                              <div className="text-[10px] text-[#9ba3af] font-mono">
                                {getItemTotalVolume(cand.item)}л • {getItemTotalWeight(cand.item)}кг
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

          {/* SURROUNDINGS TAB */}
          {activeTab === 'surroundings' && (
            <div className="lg:col-span-12 flex flex-col gap-4 font-mono">
              <h3 className="text-sm font-bold text-[#f0f3f6]">
                ПРЕДМЕТЫ И ОБЪЕКТЫ ПОБЛИЗОСТИ
              </h3>

              {nearbyGroundItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {nearbyGroundItems.map((gi) => (
                    <div
                      key={gi.id}
                      className="flex items-center justify-between p-3 bg-[#0b0c0e]/80 border border-[#2a2e38] rounded-[2px] hover:border-[#c68a35]/50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-[2px] bg-[#14161a] border border-[#2a2e38] flex items-center justify-center shrink-0">
                          <ItemIconCanvas itemId={gi.item.itemId} item={gi.item} size={32} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[#f0f3f6] truncate">{gi.item.nameRu}</h4>
                          <p className="text-xs text-[#9ba3af]">
                            {gi.item.count} шт. • {getItemTotalWeight(gi.item)} кг • {getItemTotalVolume(gi.item)} л
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePickupGroundItem(gi)}
                        className="px-4 py-2 bg-[#c68a35] hover:bg-[#d99a41] active:scale-98 text-[#0b0c0e] text-xs font-black rounded-[2px] shadow flex items-center gap-1.5 transition min-h-[38px] shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Подобрать</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-[#0b0c0e]/40 border border-dashed border-[#2a2e38] rounded-[2px] text-center text-[#5a6272]">
                  <Sparkles className="w-10 h-10 mb-2 text-[#3a3f4d]" />
                  <p className="text-sm font-medium text-[#9ba3af]">Поблизости нет выброшенных предметов</p>
                  <p className="text-xs text-[#5a6272] mt-1">Вы можете находить еду, напитки и медикаменты на улицах и в зданиях</p>
                </div>
              )}
            </div>
          )}

          {/* CLOTHING & POCKET CAPACITY TAB */}
          {activeTab === 'clothing' && (
            <div className="lg:col-span-12 flex flex-col gap-4 text-[#f0f3f6] font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[#f0f3f6]">НАДЕТАЯ ОДЕЖДА И ВМЕСТИМОСТЬ КАРМАНОВ</h3>
                <span className="text-xs font-mono text-[#9ba3af]">
                  Объем карманов: {pocketCap.totalCapacityL} л (Занято: {pocketCap.usedVolumeL} л)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(player.equippedClothing || {}).map(([slot, layers]) => (
                  <div key={slot} className="bg-[#0b0c0e]/80 border border-[#2a2e38] p-3.5 rounded-[2px] flex flex-col gap-3">
                    <div className="text-xs font-bold text-[#c68a35] uppercase tracking-wider">{slot}</div>
                    {Object.entries(layers).map(([layer, item]) => (
                      <div key={layer} className="flex flex-col gap-2 p-2.5 bg-[#14161a] rounded-[2px] border border-[#2a2e38]">
                        <div className="flex items-center gap-2">
                          <ItemIconCanvas itemId={item.itemId} item={item} size={32} className="rounded-[2px] bg-[#0b0c0e] border border-[#2a2e38] p-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-[#f0f3f6] truncate">{item.nameRu}</div>
                            <div className="text-xs text-[#9ba3af]">Слой: {layer}</div>
                          </div>
                        </div>

                        {/* Pocket info for this clothing item */}
                        {item.clothingStats && item.clothingStats.pocketCapacityL ? (
                          <div className="text-[11px] font-mono text-[#d99a41] bg-[#0b0c0e] p-1.5 rounded-[2px] border border-[#2a2e38]">
                            Карманы: +{item.clothingStats.pocketCapacityL} л (макс. {item.clothingStats.maxPocketItemVolumeL || 0.4}л / предм., +{item.clothingStats.maxPocketWeightKg || 1.5}кг)
                          </div>
                        ) : null}

                        <button 
                          onClick={() => handleUnequipItem(slot, layer)} 
                          className="w-full py-1.5 bg-red-950/40 hover:bg-red-900 text-red-300 text-xs font-semibold rounded-[2px] border border-red-800/60 transition min-h-[34px] cursor-pointer"
                        >
                          Снять
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

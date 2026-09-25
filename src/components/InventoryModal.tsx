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
  handleCarKeyActivation,
  getTargetVehicleForKey,
  getPlayerCompartments,
  getPlayerTotalSlots,
  getSlotCompartment,
  InventoryCompartment
} from '../items';
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
  FileText
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
        if (!player.inventory) player.inventory = [];
        let placed = false;
        for (let i = 0; i < player.inventory.length; i++) {
          if (!player.inventory[i]) {
            player.inventory[i] = removed;
            placed = true;
            break;
          }
        }
        if (!placed) {
          player.inventory.push(removed);
        }
        sound.playPickup();
        addPlayerNotification(player, `Перемещено в карман: ${removed.nameRu}`, 'pickup');
        forceRender(n => n + 1);
      }
    } else {
      const handItem = target === 'leftHand' ? player.leftHandItem : player.rightHandItem;
      if (handItem) {
        addPlayerNotification(player, `${target === 'leftHand' ? 'Левая' : 'Правая'} рука занята!`, 'warning');
        return;
      }
      removeItemFromContainer(container, contentIdx, item.count);
      putItemInHand(player, target === 'leftHand' ? 'left' : 'right', item, world);
      sound.playPickup();
      forceRender(n => n + 1);
    }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="inventory-modal-window"
        className="relative w-full max-w-5xl max-h-[92vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-100 tracking-wide flex items-center gap-2">
                Инвентарь и Нагрузка
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Физический объем (л), вес (кг), карманы и активные руки
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="inventory-close-btn"
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
              title="Закрыть (Esc / I)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PHYSICAL CAPACITY & HANDS STATUS BAR */}
        <div className="px-4 sm:px-6 py-2.5 bg-zinc-950/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Carried weight & speed */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono">
              <Weight className="w-4 h-4 text-amber-400" />
              <span className="text-zinc-400">Вес:</span>
              <span className="font-bold text-zinc-200">{carriedWeight} кг</span>
            </div>
            <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold font-mono ${
              weightSpeedPct >= 95 ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' :
              weightSpeedPct >= 70 ? 'bg-amber-950/60 border-amber-800 text-amber-400' :
              'bg-rose-950/60 border-rose-800 text-rose-400'
            }`}>
              Скорость: {weightSpeedPct}% {isBulkyHand ? '(Груз)' : ''}
            </div>
          </div>

          {/* Pocket Volume Status */}
          <div className="flex items-center gap-2.5">
            <span className="text-zinc-400">Объем карманов:</span>
            <div className="w-28 sm:w-36 bg-zinc-800 h-2.5 rounded-full overflow-hidden border border-zinc-700">
              <div 
                className={`h-full transition-all duration-300 ${
                  pocketCap.usedVolumeL / pocketCap.totalCapacityL > 0.85 ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (pocketCap.usedVolumeL / Math.max(0.1, pocketCap.totalCapacityL)) * 100)}%` }}
              />
            </div>
            <span className="font-mono font-bold text-zinc-200">
              {pocketCap.usedVolumeL} / {pocketCap.totalCapacityL} л
            </span>
          </div>

          {/* Active Hands Quick Preview */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] ${
              player.leftHandItem ? 'bg-amber-950/40 border-amber-600/50 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              <Hand className="w-3.5 h-3.5" />
              <span>Лев: {player.leftHandItem ? player.leftHandItem.nameRu : 'Свободна'}</span>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] ${
              player.rightHandItem ? 'bg-amber-950/40 border-amber-600/50 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              <Hand className="w-3.5 h-3.5" />
              <span>Прав: {player.rightHandItem ? player.rightHandItem.nameRu : 'Свободна'}</span>
            </div>
          </div>
        </div>

        {/* TABS & CATEGORIES BAR */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 border-b border-zinc-800 bg-zinc-950/40 gap-2">
          {/* Main View Tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-full sm:w-auto">
            <button
              id="tab-inventory-btn"
              onClick={() => { setActiveTab('inventory'); setOpenContainer(null); }}
              className={`min-h-[44px] flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'inventory' 
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Карманы ({inventory.filter(Boolean).length})</span>
            </button>
            <button
              id="tab-surroundings-btn"
              onClick={() => { setActiveTab('surroundings'); setOpenContainer(null); }}
              className={`min-h-[44px] flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'surroundings' 
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Рядом ({nearbyGroundItems.length})</span>
            </button>
            <button
              id="tab-clothing-btn"
              onClick={() => { setActiveTab('clothing'); setOpenContainer(null); }}
              className={`min-h-[44px] flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'clothing' 
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Shirt className="w-4 h-4" />
              <span>Одежда</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          {activeTab === 'inventory' && !openContainer && (
            <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-1 max-w-full">
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
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      selectedCategory === cat.id
                        ? 'bg-zinc-800 border border-amber-500/60 text-amber-400 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
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
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {activeTab === 'inventory' && !openContainer && (
            <>
              {/* LEFT: HANDS + POCKET SLOTS (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {(!hasWallet || !hasBag) && (
                  <div className="px-3.5 py-2.5 bg-amber-950/40 border border-amber-600/40 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-amber-200">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{!hasWallet && !hasBag ? 'Кошелек и пакет не найдены в инвентаре' : !hasWallet ? 'Кожаный бумажник не найден в инвентаре' : 'Пакет для покупок не найден в инвентаре'}</span>
                    </div>
                    <button
                      id="btn-restore-containers"
                      onClick={() => {
                        restoreStarterContainers(player);
                        forceRender(n => n + 1);
                      }}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition shrink-0"
                    >
                      Восстановить
                    </button>
                  </div>
                )}

                {/* ACTIVE HANDS ROW */}
                <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Hand className="w-4 h-4 text-amber-400" />
                      Активные руки (Для крупных предметов)
                    </span>
                    <span className="text-[10px] text-zinc-500 hidden sm:inline">Видны на модели персонажа</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* LEFT HAND */}
                    <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between gap-2 min-h-[56px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                          {player.leftHandItem ? (
                            <ItemIconCanvas itemId={player.leftHandItem.itemId} item={player.leftHandItem} size={32} />
                          ) : (
                            <Hand className="w-5 h-5 text-zinc-600 stroke-[1.5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-400 font-mono uppercase">Левая рука</div>
                          <div className="text-xs font-bold text-zinc-100 truncate">
                            {player.leftHandItem ? player.leftHandItem.nameRu : 'Пусто'}
                          </div>
                          {player.leftHandItem && (
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {getItemTotalWeight(player.leftHandItem)} кг • {getItemTotalVolume(player.leftHandItem)} л
                            </div>
                          )}
                        </div>
                      </div>

                      {player.leftHandItem && (
                        <div className="flex items-center gap-1 shrink-0">
                          {player.leftHandItem.isContainer && (
                            <button
                              onClick={() => { setOpenContainer(player.leftHandItem); setSelectedContainerItemIdx(0); }}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold min-h-[36px]"
                            >
                              Открыть
                            </button>
                          )}
                          <button
                            onClick={() => handleStowHand('left')}
                            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs min-h-[36px]"
                            title="Убрать в карманы"
                          >
                            В карман
                          </button>
                          <button
                            onClick={() => handleDropFromHand('left')}
                            className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs min-h-[36px]"
                            title="Бросить на землю"
                          >
                            Бросить
                          </button>
                        </div>
                      )}
                    </div>

                    {/* RIGHT HAND */}
                    <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between gap-2 min-h-[56px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                          {player.rightHandItem ? (
                            <ItemIconCanvas itemId={player.rightHandItem.itemId} item={player.rightHandItem} size={32} />
                          ) : (
                            <Hand className="w-5 h-5 text-zinc-600 stroke-[1.5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-400 font-mono uppercase">Правая рука</div>
                          <div className="text-xs font-bold text-zinc-100 truncate">
                            {player.rightHandItem ? player.rightHandItem.nameRu : 'Пусто'}
                          </div>
                          {player.rightHandItem && (
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {getItemTotalWeight(player.rightHandItem)} кг • {getItemTotalVolume(player.rightHandItem)} л
                            </div>
                          )}
                        </div>
                      </div>

                      {player.rightHandItem && (
                        <div className="flex items-center gap-1 shrink-0">
                          {player.rightHandItem.isContainer && (
                            <button
                              onClick={() => { setOpenContainer(player.rightHandItem); setSelectedContainerItemIdx(0); }}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold min-h-[36px]"
                            >
                              Открыть
                            </button>
                          )}
                          <button
                            onClick={() => handleStowHand('right')}
                            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs min-h-[36px]"
                            title="Убрать в карманы"
                          >
                            В карман
                          </button>
                          <button
                            onClick={() => handleDropFromHand('right')}
                            className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs min-h-[36px]"
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
                    const isBase = comp.id === 'base';
                    const isTorso = comp.id === 'torso';
                    const isLegs = comp.id === 'legs';
                    const isBack = comp.id === 'back';

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
                        className={`border rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2 transition-all ${
                          isBack 
                            ? 'bg-amber-950/20 border-amber-800/40' 
                            : isTorso 
                            ? 'bg-sky-950/20 border-sky-800/40' 
                            : isLegs 
                            ? 'bg-indigo-950/20 border-indigo-800/40' 
                            : 'bg-zinc-950/50 border-zinc-800/80'
                        }`}
                      >
                        {/* Compartment Header */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-zinc-800/60 pb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border ${
                              isBack 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                                : isTorso 
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                : isLegs
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/80'
                            }`}>
                              {getCompIcon(comp.iconType, "w-3.5 h-3.5")}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-zinc-100">
                                  {comp.nameRu}
                                </span>
                                {comp.sourceItemNameRu && comp.id !== 'base' && (
                                  <span className="text-[11px] font-medium text-amber-400/90 hidden sm:inline">
                                    «{comp.sourceItemNameRu}»
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400">
                                Вместимость: {comp.capacityL}л • Макс. предм: {comp.maxItemVolumeL}л
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {/* Volume & Weight metrics */}
                            <div className="flex items-center gap-1 text-[10px] font-mono bg-zinc-900/90 px-1.5 sm:px-2 py-0.5 rounded-md border border-zinc-800">
                              <span className="text-zinc-500 hidden sm:inline">Объем:</span>
                              <span className={compVolumePct > 90 ? 'text-rose-400 font-bold' : 'text-zinc-300 font-bold'}>
                                {comp.usedVolumeL}/{comp.capacityL}л
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-mono bg-zinc-900/90 px-1.5 sm:px-2 py-0.5 rounded-md border border-zinc-800">
                              <span className="text-zinc-500 hidden sm:inline">Вес:</span>
                              <span className={compWeightPct > 90 ? 'text-rose-400 font-bold' : 'text-zinc-300 font-bold'}>
                                {comp.usedWeightKg}/{comp.maxWeightKg}кг
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
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
                                className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all min-h-[52px] ${
                                  isDimmed ? 'opacity-25 grayscale' : ''
                                } ${
                                  isSelected && item
                                    ? 'border-amber-400 bg-amber-950/40 shadow-lg ring-2 ring-amber-400/30 scale-105 z-10'
                                    : item
                                    ? 'border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700/80 hover:border-zinc-500'
                                    : 'border-zinc-800/80 bg-zinc-950/40 cursor-default hover:border-zinc-700/50'
                                }`}
                              >
                                {/* Hotbar Indicator */}
                                {isHotbar && (
                                  <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-amber-400 bg-zinc-950/80 px-1 rounded border border-amber-500/20">
                                    {slotIdx + 1}
                                  </span>
                                )}

                                {/* Pocket/Clothing Origin Icon Watermark */}
                                <div 
                                  className={`absolute bottom-1 left-1.5 pointer-events-none transition-opacity ${
                                    item ? 'opacity-25' : 'opacity-40'
                                  } ${
                                    isBack ? 'text-amber-400' : isTorso ? 'text-sky-400' : isLegs ? 'text-indigo-400' : 'text-zinc-500'
                                  }`}
                                  title={`${comp.nameRu} (Слот #${slotIdx + 1})`}
                                >
                                  {getCompIcon(comp.iconType, "w-2.5 h-2.5")}
                                </div>

                                {item ? (
                                  <>
                                    <ItemIconCanvas itemId={item.itemId} item={item} size={36} className="transform hover:scale-105 transition" />
                                    {item.count > 1 && (
                                      <span className="absolute top-1 right-1 px-1.5 py-0.2 bg-zinc-900/90 border border-zinc-700 rounded text-[10px] font-mono font-bold text-zinc-200">
                                        {item.count}
                                      </span>
                                    )}
                                    {/* Container Badge for standalone nested containers */}
                                    {item.isContainer && (
                                      <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-zinc-900/90 border border-amber-600/60 rounded text-[8px] font-mono font-bold text-amber-300">
                                        {item.contents?.length || 0}
                                      </span>
                                    )}
                                    {item.maxPortions && item.maxPortions > 1 && (
                                      <div className="absolute bottom-1 left-1.5 right-1.5 flex flex-col items-center gap-0.5 pointer-events-none">
                                        <div className="w-full bg-zinc-950/90 h-1 rounded-full overflow-hidden border border-zinc-700/80">
                                          <div 
                                            className="h-full bg-amber-400 rounded-full transition-all"
                                            style={{ width: `${Math.max(0, Math.min(100, ((item.portions ?? item.maxPortions) / item.maxPortions) * 100))}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-800/80" />
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
                              className="p-2.5 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-between gap-2.5 transition"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                                  <ItemIconCanvas itemId={cItem.itemId} item={cItem} size={26} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] text-amber-400/90 font-mono leading-none mb-0.5">{entry.source}</div>
                                  <div className="text-xs font-bold text-zinc-100 truncate">{cItem.nameRu}</div>
                                  <div className="text-[10px] text-zinc-400 font-mono">
                                    {count} предм. • {curVol.toFixed(1)} / {maxVol} л
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setOpenContainer(cItem);
                                  setSelectedContainerItemIdx(0);
                                }}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition shrink-0 shadow min-h-[32px]"
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
              <div className="lg:col-span-5 bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
                {selectedEntry && selectedEntry.item ? (
                  <div className="flex flex-col gap-4">
                    {/* Item Card Banner */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner shrink-0 p-1">
                        <ItemIconCanvas itemId={selectedEntry.item.itemId} item={selectedEntry.item} size={52} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            selectedEntry.item.category === 'food' ? 'bg-amber-950/80 text-amber-400 border border-amber-800' :
                            selectedEntry.item.category === 'drink' ? 'bg-teal-950/80 text-teal-400 border border-teal-800' :
                            selectedEntry.item.category === 'med' ? 'bg-rose-950/80 text-rose-400 border border-rose-800' :
                            'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}>
                            {selectedEntry.item.category === 'food' ? 'Еда' :
                             selectedEntry.item.category === 'drink' ? 'Напиток' :
                             selectedEntry.item.category === 'med' ? 'Медицина' :
                             selectedEntry.item.category === 'tool' ? 'Инструмент' : 'Ценность'}
                          </span>
                          <span className="text-xs text-zinc-400 font-mono">
                            x{selectedEntry.item.count} в пачке
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-zinc-100 leading-snug">
                          {selectedEntry.item.nameRu}
                        </h3>
                        <p className="text-xs text-zinc-400 font-mono">
                          {selectedEntry.item.name}
                        </p>
                      </div>
                    </div>

                    {/* Pocket / Compartment Location Details */}
                    {(() => {
                      const slotComp = getSlotCompartment(player, selectedEntry.originalIndex);
                      if (slotComp) {
                        return (
                          <div className="flex items-center justify-between text-xs bg-zinc-900/90 px-3 py-2 rounded-xl border border-zinc-800">
                            <span className="text-zinc-400 font-medium">Отделение:</span>
                            <span className="text-zinc-200 font-bold flex items-center gap-1.5">
                              <span className="text-amber-400">{slotComp.compartment.nameRu}</span>
                              {slotComp.compartment.sourceItemNameRu && slotComp.compartment.id !== 'base' && (
                                <span className="text-zinc-400 font-normal">({slotComp.compartment.sourceItemNameRu})</span>
                              )}
                              <span className="text-zinc-500 font-mono text-[11px]">• Слот #{selectedEntry.originalIndex + 1}</span>
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Physical Metrics of Item */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
                        <span className="text-zinc-400">Вес:</span>
                        <span className="text-zinc-200 font-bold">{getItemTotalWeight(selectedEntry.item)} кг</span>
                      </div>
                      <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
                        <span className="text-zinc-400">Объем:</span>
                        <span className="text-amber-300 font-bold">{getItemTotalVolume(selectedEntry.item)} л</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-300 leading-relaxed">
                      {selectedEntry.item.descriptionRu}
                    </div>

                    {/* Smartphone Specs Card */}
                    {selectedEntry.item.phoneSpecs && (
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-400 flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4" />
                            {selectedEntry.item.phoneSpecs.modelName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-300">
                            {selectedEntry.item.phoneSpecs.osName}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-300">
                          <div className="bg-zinc-950 p-1.5 rounded border border-zinc-800 flex justify-between">
                            <span className="text-zinc-400">Экран:</span>
                            <span className="font-mono text-zinc-200">{selectedEntry.item.phoneSpecs.screenSize} ({selectedEntry.item.phoneSpecs.refreshRateHz}Hz)</span>
                          </div>
                          <div className="bg-zinc-950 p-1.5 rounded border border-zinc-800 flex justify-between">
                            <span className="text-zinc-400">Камера:</span>
                            <span className="font-mono text-zinc-200">{selectedEntry.item.phoneSpecs.cameraMegaPixels} MP</span>
                          </div>
                          <div className="bg-zinc-950 p-1.5 rounded border border-zinc-800 flex justify-between">
                            <span className="text-zinc-400">Память:</span>
                            <span className="font-mono text-zinc-200">{selectedEntry.item.phoneSpecs.storageGb} GB</span>
                          </div>
                          <div className="bg-zinc-950 p-1.5 rounded border border-zinc-800 flex justify-between">
                            <span className="text-zinc-400">Батарея:</span>
                            <span className="font-mono text-zinc-200">{selectedEntry.item.phoneSpecs.batteryCapacityMah} мАч</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Container specs and action */}
                    {selectedEntry.item.isContainer && (
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-400 flex items-center gap-1.5">
                            <Layers className="w-4 h-4" />
                            Вместимость контейнера:
                          </span>
                          <span className="font-mono text-zinc-200">
                            {selectedEntry.item.containerCapacityL} л / {selectedEntry.item.maxContainedWeightKg} кг
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          Внутри: {selectedEntry.item.contents?.length || 0} предметов.
                        </div>
                        <button
                          onClick={() => { setOpenContainer(selectedEntry.item); setSelectedContainerItemIdx(0); }}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow min-h-[44px]"
                        >
                          <Package className="w-4 h-4" />
                          <span>Открыть содержимое ({selectedEntry.item.contents?.length || 0})</span>
                        </button>
                      </div>
                    )}

                    {/* Stash into other container option */}
                    {!selectedEntry.item.isContainer && availableContainers.length > 0 && (
                      <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col gap-1.5 text-xs">
                        <span className="text-zinc-400 font-semibold flex items-center gap-1">
                          <ArrowDownToLine className="w-3.5 h-3.5 text-amber-400" />
                          Спрятать в контейнер:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {availableContainers.map(cont => (
                            <button
                              key={cont.id}
                              onClick={() => handlePutIntoContainer(cont, selectedEntry.originalIndex)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 min-h-[36px]"
                            >
                              В {cont.nameRu}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons: Take in hand, Use, Equip, Drop */}
                    <div className="flex flex-col gap-2 mt-1">
                      {/* Hands Action */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleTakeToHand('left', selectedEntry.originalIndex)}
                          disabled={!!player.leftHandItem}
                          className="py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center justify-center gap-1.5 min-h-[44px]"
                        >
                          <Hand className="w-3.5 h-3.5" />
                          <span>В левую руку</span>
                        </button>
                        <button
                          onClick={() => handleTakeToHand('right', selectedEntry.originalIndex)}
                          disabled={!!player.rightHandItem}
                          className="py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center justify-center gap-1.5 min-h-[44px]"
                        >
                          <Hand className="w-3.5 h-3.5" />
                          <span>В правую руку</span>
                        </button>
                      </div>

                      {selectedEntry.item.clothingStats ? (
                        <button
                          id="btn-equip-selected-item"
                          onClick={() => handleEquipItem(selectedEntry.originalIndex)}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition min-h-[44px]"
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
                          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition min-h-[44px]"
                        >
                          <Package className="w-4 h-4" />
                          <span>Открыть контейнер ({selectedEntry.item.contents?.length || 0} предм.)</span>
                        </button>
                      ) : (selectedEntry.item.phoneSpecs || selectedEntry.item.itemId.startsWith('phone_') || selectedEntry.item.itemId === 'smartphone') ? (
                        <button
                          id="btn-use-selected-phone"
                          onClick={() => handleUseItem(selectedEntry.originalIndex)}
                          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl border border-zinc-700 shadow flex items-center justify-center gap-2 text-sm transition min-h-[44px]"
                        >
                          <Smartphone className="w-4 h-4 text-amber-400" />
                          <span>Включить экран телефона</span>
                        </button>
                      ) : selectedEntry.item.itemId.startsWith('car_key') ? (
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5 shadow-inner">
                          {(() => {
                            const targetVeh = world ? getTargetVehicleForKey(player, selectedEntry.item, world) : null;
                            const distM = targetVeh ? Math.round(Math.hypot(targetVeh.x - player.x, targetVeh.y - player.y) / 10) : null;
                            const isSmartOrDisplay = selectedEntry.item.keyTier === 'smart' || selectedEntry.item.keyTier === 'display';

                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>
                                      {selectedEntry.item.keyTier === 'display' ? 'Smart Display Key' :
                                       selectedEntry.item.keyTier === 'smart' ? 'Smart Keyless-Go' :
                                       selectedEntry.item.keyTier === 'flip' ? 'Выкидной брелок' : 'Ключ зажигания'}
                                    </span>
                                  </div>
                                  {distM !== null ? (
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                      distM <= 25 ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-amber-950/80 text-amber-300 border-amber-800'
                                    }`}>
                                      {distM}м до авто
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono text-zinc-500">Вне зоны</span>
                                  )}
                                </div>

                                {targetVeh && (
                                  <div className="grid grid-cols-3 gap-1 text-[10px] font-mono bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                                    <div className="flex items-center gap-1">
                                      <span className="text-zinc-500">Замок: </span>
                                      <span className={`font-bold flex items-center gap-0.5 ${targetVeh.isLocked ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {targetVeh.isLocked ? <Lock className="w-3 h-3 inline" /> : <Unlock className="w-3 h-3 inline" />}
                                        {targetVeh.isLocked ? 'Закрыт' : 'Открыт'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-zinc-500">ДВС: </span>
                                      <span className={`font-bold flex items-center gap-0.5 ${targetVeh.engineState?.engineRunning ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                        {targetVeh.engineState?.engineRunning && <Zap className="w-3 h-3 inline text-emerald-400" />}
                                        {targetVeh.engineState?.engineRunning ? 'Вкл' : 'Выкл'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-zinc-500">Фары: </span>
                                      <span className={`font-bold flex items-center gap-0.5 ${targetVeh.headlightsOn ? 'text-amber-400' : 'text-zinc-400'}`}>
                                        {targetVeh.headlightsOn && <Lightbulb className="w-3 h-3 inline text-amber-400" />}
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
                                    className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition min-h-[44px] ${
                                      targetVeh?.isLocked
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/50'
                                        : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500/50'
                                    }`}
                                  >
                                    {targetVeh?.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                    <span>{targetVeh?.isLocked ? 'Открыть ЦЗ' : 'Закрыть ЦЗ'}</span>
                                  </button>

                                  {/* Remote Engine Start or Finder */}
                                  {isSmartOrDisplay ? (
                                    <button
                                      onClick={() => {
                                        handleCarKeyActivation(player, selectedEntry.item, world, 'toggle_engine');
                                        forceRender(n => n + 1);
                                      }}
                                      className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition min-h-[44px] ${
                                        targetVeh?.engineState?.engineRunning
                                          ? 'bg-rose-700 hover:bg-rose-600 text-white border-rose-500/50'
                                          : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400/50 font-bold'
                                      }`}
                                    >
                                      <Zap className="w-3.5 h-3.5" />
                                      <span>{targetVeh?.engineState?.engineRunning ? 'Заглушить ДВС' : 'Автозапуск ДВС'}</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        handleCarKeyActivation(player, selectedEntry.item, world, 'horn');
                                        forceRender(n => n + 1);
                                      }}
                                      className="py-2 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-zinc-700 transition min-h-[44px]"
                                    >
                                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
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
                                      className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 border transition min-h-[44px] ${
                                        targetVeh?.headlightsOn
                                          ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                                      }`}
                                    >
                                      <Lightbulb className="w-3 h-3 text-amber-400" />
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
                                      className="py-2 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 border border-zinc-700 transition min-h-[44px]"
                                    >
                                      <Volume2 className="w-3 h-3 text-amber-400" />
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
                          className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-98 text-zinc-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition min-h-[44px]"
                        >
                          <FileText className="w-4 h-4 text-zinc-950" />
                          <span>Изучить / Просмотреть документ</span>
                        </button>
                      ) : selectedEntry.item.usable && (
                        <button
                          id="btn-use-selected-item"
                          onClick={() => handleUseItem(selectedEntry.originalIndex)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold rounded-xl border border-emerald-400/40 shadow flex items-center justify-center gap-2 text-sm transition min-h-[44px]"
                        >
                          <Utensils className="w-4 h-4" />
                          <span>Использовать</span>
                        </button>
                      )}

                      <button
                        id="btn-drop-selected-item"
                        onClick={() => handleDropItem(selectedEntry.originalIndex)}
                        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-300 font-semibold rounded-xl border border-zinc-700 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                      >
                        <Trash2 className="w-4 h-4 text-zinc-400" />
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
                          className="w-full py-2.5 bg-emerald-950/80 hover:bg-emerald-900 active:scale-98 text-emerald-300 font-bold rounded-xl border border-emerald-600/60 shadow flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                        >
                          <Trash2 className="w-4 h-4 text-emerald-400" />
                          <span>Выбросить в урну / контейнер (+Деньги)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 text-zinc-500">
                    <Package className="w-12 h-12 mb-3 text-zinc-600 stroke-[1.5]" />
                    <p className="text-sm font-medium text-zinc-400">Выберите предмет в ячейке</p>
                    <p className="text-xs text-zinc-600 mt-1">Отобразятся свойства, параметры и действия с предметом</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* CONTAINER DETAILED VIEW (SUB-INVENTORY) */}
          {activeTab === 'inventory' && openContainer && (
            <div className="lg:col-span-12 flex flex-col gap-4">
              {/* Back button & Container Info Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setOpenContainer(null)}
                    className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl flex items-center gap-1 text-xs font-bold transition min-h-[44px] shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Назад в карманы</span>
                  </button>
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <ItemIconCanvas itemId={openContainer.itemId} item={openContainer} size={32} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                      {openContainer.nameRu}
                      <span className="text-[10px] px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-amber-400 font-mono">
                        Контейнер
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono">
                      Вместимость: {openContainer.containerCapacityL} л • Макс. вес: {openContainer.maxContainedWeightKg} кг • Лимит: {openContainer.maxContainedItemVolumeL || openContainer.containerCapacityL} л
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 self-end sm:self-center">
                  <div>
                    <span>Предметов: </span>
                    <span className="text-zinc-200 font-bold">{openContainer.contents?.length || 0}</span>
                  </div>
                  <div>
                    <span>Объем: </span>
                    <span className="text-amber-300 font-bold">{getItemTotalVolume(openContainer)} л</span>
                  </div>
                  <div>
                    <span>Вес: </span>
                    <span className="text-zinc-200 font-bold">{getItemTotalWeight(openContainer)} кг</span>
                  </div>
                </div>
              </div>

              {/* Contents Grid & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(openContainer.contents || []).length > 0 ? (
                  openContainer.contents!.map((contItem, cIdx) => (
                    <div 
                      key={cIdx} 
                      className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl flex flex-col justify-between gap-3 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <ItemIconCanvas itemId={contItem.itemId} item={contItem} size={32} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-zinc-100 truncate">{contItem.nameRu}</div>
                          <div className="text-xs text-zinc-400 font-mono">
                            {contItem.count} шт. • {getItemTotalWeight(contItem)} кг • {getItemTotalVolume(contItem)} л
                          </div>
                        </div>
                      </div>

                      {/* Action buttons for item in container */}
                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <button
                          onClick={() => handleExtractFromContainer(openContainer, cIdx, 'pockets')}
                          className="py-2 px-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg flex items-center justify-center gap-1 min-h-[40px]"
                          title="Переложить в карман"
                        >
                          <ArrowUpFromLine className="w-3.5 h-3.5" />
                          <span>В карман</span>
                        </button>
                        <button
                          onClick={() => handleExtractFromContainer(openContainer, cIdx, 'rightHand')}
                          disabled={!!player.rightHandItem}
                          className="py-2 px-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-semibold rounded-lg flex items-center justify-center gap-1 border border-zinc-700 min-h-[40px]"
                          title="Взять в правую руку"
                        >
                          <Hand className="w-3.5 h-3.5" />
                          <span>В руку</span>
                        </button>
                        <button
                          onClick={() => handleDropFromContainer(openContainer, cIdx)}
                          className="py-2 px-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-semibold rounded-lg flex items-center justify-center gap-1 border border-rose-900/40 min-h-[40px]"
                          title="Выбросить на землю"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Бросить</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-950/30 border border-dashed border-zinc-800 rounded-xl">
                    <Package className="w-10 h-10 mb-2 mx-auto text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-400">Контейнер пуст</p>
                    <p className="text-xs text-zinc-600 mt-1">Переложите сюда предметы из карманов с помощью кнопки «Спрятать в контейнер»</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SURROUNDINGS TAB */}
          {activeTab === 'surroundings' && (
            <div className="lg:col-span-12 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-zinc-200">
                Предметы и объекты поблизости
              </h3>

              {nearbyGroundItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {nearbyGroundItems.map((gi) => (
                    <div
                      key={gi.id}
                      className="flex items-center justify-between p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <ItemIconCanvas itemId={gi.item.itemId} item={gi.item} size={32} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-zinc-100 truncate">{gi.item.nameRu}</h4>
                          <p className="text-xs text-zinc-400">
                            {gi.item.count} шт. • {getItemTotalWeight(gi.item)} кг • {getItemTotalVolume(gi.item)} л
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePickupGroundItem(gi)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition min-h-[44px] shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Подобрать</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
                  <Sparkles className="w-10 h-10 mb-2 text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-400">Поблизости нет выброшенных предметов</p>
                  <p className="text-xs text-zinc-600 mt-1">Вы можете находить еду, напитки и медикаменты на улицах и в зданиях</p>
                </div>
              )}
            </div>
          )}

          {/* CLOTHING & POCKET CAPACITY TAB */}
          {activeTab === 'clothing' && (
            <div className="lg:col-span-12 flex flex-col gap-4 text-zinc-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-base font-bold text-zinc-100">Надетая одежда и вместимость карманов</h3>
                <span className="text-xs font-mono text-zinc-400">
                  Объем карманов: {pocketCap.totalCapacityL} л (Занято: {pocketCap.usedVolumeL} л)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(player.equippedClothing || {}).map(([slot, layers]) => (
                  <div key={slot} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{slot}</div>
                    {Object.entries(layers).map(([layer, item]) => (
                      <div key={layer} className="flex flex-col gap-2 p-2.5 bg-zinc-900 rounded-xl border border-zinc-800">
                        <div className="flex items-center gap-2">
                          <ItemIconCanvas itemId={item.itemId} item={item} size={32} className="rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-zinc-100 truncate">{item.nameRu}</div>
                            <div className="text-xs text-zinc-400">Слой: {layer}</div>
                          </div>
                        </div>

                        {/* Pocket info for this clothing item */}
                        {item.clothingStats && item.clothingStats.pocketCapacityL ? (
                          <div className="text-[11px] font-mono text-amber-300 bg-zinc-950 p-1.5 rounded border border-zinc-800">
                            Карманы: +{item.clothingStats.pocketCapacityL} л (макс. {item.clothingStats.maxPocketItemVolumeL || 0.4}л / предм., +{item.clothingStats.maxPocketWeightKg || 1.5}кг)
                          </div>
                        ) : null}

                        <button 
                          onClick={() => handleUnequipItem(slot, layer)} 
                          className="w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold rounded-lg border border-rose-900/40 transition min-h-[38px]"
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

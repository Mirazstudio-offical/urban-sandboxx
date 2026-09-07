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
  restoreStarterContainers
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
  ChevronLeft
} from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  world: GameWorld | null;
  onSleepInBed?: () => void;
  onRequestLimbTreatment?: (itemIndex: number, item: InventoryItem) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  player,
  world,
  onRequestLimbTreatment
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
  const maxSlots = 24; // Visual slot grid for accessible pockets

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
    equipClothing(player, idx);
    forceRender(n => n + 1);
  };

  const handleUnequipItem = (slot: any, layer: any) => {
    if (!player) return;
    unequipClothing(player, slot, layer);
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
    player.inventory.splice(invIdx, 1);
    putItemInHand(player, hand, item);
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
      player.inventory.splice(invIdx, 1);
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
      putItemInHand(player, target === 'leftHand' ? 'left' : 'right', item);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="inventory-modal-window"
        className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-sky-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                Реалистичный Инвентарь и Нагрузка
              </h2>
              <p className="text-xs text-slate-400">
                Физический объем (литры), вес (кг), вместимость карманов одежды и слоты рук
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="inventory-close-btn"
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              title="Закрыть (Esc / I)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* PHYSICAL CAPACITY & HANDS STATUS BAR */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Carried weight & speed */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono">
              <Weight className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Общий вес:</span>
              <span className="font-bold text-slate-200">{carriedWeight} кг</span>
            </div>
            <div className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold font-mono ${
              weightSpeedPct >= 95 ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' :
              weightSpeedPct >= 70 ? 'bg-amber-950/60 border-amber-800 text-amber-400' :
              'bg-rose-950/60 border-rose-800 text-rose-400'
            }`}>
              Скорость: {weightSpeedPct}% {isBulkyHand ? '(Груз в руках)' : ''}
            </div>
          </div>

          {/* Pocket Volume Status */}
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400">Объем карманов:</span>
            <div className="w-32 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full transition-all duration-300 ${
                  pocketCap.usedVolumeL / pocketCap.totalCapacityL > 0.85 ? 'bg-rose-500' : 'bg-sky-500'
                }`}
                style={{ width: `${Math.min(100, (pocketCap.usedVolumeL / Math.max(0.1, pocketCap.totalCapacityL)) * 100)}%` }}
              />
            </div>
            <span className="font-mono font-bold text-slate-200">
              {pocketCap.usedVolumeL} / {pocketCap.totalCapacityL} л
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              (макс. {pocketCap.maxItemVolumeL}л / предмет)
            </span>
          </div>

          {/* Active Hands Quick Preview */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] ${
              player.leftHandItem ? 'bg-sky-950/40 border-sky-600/50 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <Hand className="w-3.5 h-3.5" />
              <span>Лев: {player.leftHandItem ? player.leftHandItem.nameRu : 'Свободна'}</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] ${
              player.rightHandItem ? 'bg-sky-950/40 border-sky-600/50 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <Hand className="w-3.5 h-3.5" />
              <span>Прав: {player.rightHandItem ? player.rightHandItem.nameRu : 'Свободна'}</span>
            </div>
          </div>
        </div>

        {/* TABS & CATEGORIES BAR */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50 gap-2">
          {/* Main View Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              id="tab-inventory-btn"
              onClick={() => { setActiveTab('inventory'); setOpenContainer(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'inventory' 
                  ? 'bg-sky-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Карманы и Руки ({inventory.filter(Boolean).length})</span>
            </button>
            <button
              id="tab-surroundings-btn"
              onClick={() => { setActiveTab('surroundings'); setOpenContainer(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'surroundings' 
                  ? 'bg-sky-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Вокруг вас ({nearbyGroundItems.length})</span>
            </button>
            <button
              id="tab-clothing-btn"
              onClick={() => { setActiveTab('clothing'); setOpenContainer(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'clothing' 
                  ? 'bg-sky-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Одежда и Карманы</span>
            </button>
          </div>

          {/* Category Filter Pills (if on inventory tab and not in sub-container) */}
          {activeTab === 'inventory' && !openContainer && (
            <div className="flex flex-wrap items-center gap-1">
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                      selectedCategory === cat.id
                        ? 'bg-slate-800 border border-sky-400/50 text-sky-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <IconComp className="w-3 h-3" />
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
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Hand className="w-4 h-4 text-sky-400" />
                      Активные руки (Для крупных предметов: канистра, пакет, оружие)
                    </span>
                    <span className="text-[10px] text-slate-500">Предметы в руках видны на персонаже</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* LEFT HAND */}
                    <div className="p-2.5 bg-slate-900 border border-slate-700/80 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0">
                          {player.leftHandItem ? (
                            <ItemIconCanvas itemId={player.leftHandItem.itemId} size={32} />
                          ) : (
                            <Hand className="w-5 h-5 text-slate-600 stroke-[1.5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400 font-mono uppercase">Левая рука</div>
                          <div className="text-xs font-bold text-white truncate">
                            {player.leftHandItem ? player.leftHandItem.nameRu : 'Пусто'}
                          </div>
                          {player.leftHandItem && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {getItemTotalWeight(player.leftHandItem)} кг • {getItemTotalVolume(player.leftHandItem)} л
                            </div>
                          )}
                        </div>
                      </div>

                      {player.leftHandItem && (
                        <div className="flex flex-col gap-1 shrink-0">
                          {player.leftHandItem.isContainer && (
                            <button
                              onClick={() => { setOpenContainer(player.leftHandItem); setSelectedContainerItemIdx(0); }}
                              className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold"
                            >
                              Открыть
                            </button>
                          )}
                          <button
                            onClick={() => handleStowHand('left')}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                            title="Убрать в карманы"
                          >
                            В карман
                          </button>
                          <button
                            onClick={() => handleDropFromHand('left')}
                            className="px-2 py-0.5 bg-rose-950/50 hover:bg-rose-900 text-rose-300 rounded text-[10px]"
                            title="Бросить на землю"
                          >
                            Бросить
                          </button>
                        </div>
                      )}
                    </div>

                    {/* RIGHT HAND */}
                    <div className="p-2.5 bg-slate-900 border border-slate-700/80 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0">
                          {player.rightHandItem ? (
                            <ItemIconCanvas itemId={player.rightHandItem.itemId} size={32} />
                          ) : (
                            <Hand className="w-5 h-5 text-slate-600 stroke-[1.5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400 font-mono uppercase">Правая рука</div>
                          <div className="text-xs font-bold text-white truncate">
                            {player.rightHandItem ? player.rightHandItem.nameRu : 'Пусто'}
                          </div>
                          {player.rightHandItem && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {getItemTotalWeight(player.rightHandItem)} кг • {getItemTotalVolume(player.rightHandItem)} л
                            </div>
                          )}
                        </div>
                      </div>

                      {player.rightHandItem && (
                        <div className="flex flex-col gap-1 shrink-0">
                          {player.rightHandItem.isContainer && (
                            <button
                              onClick={() => { setOpenContainer(player.rightHandItem); setSelectedContainerItemIdx(0); }}
                              className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold"
                            >
                              Открыть
                            </button>
                          )}
                          <button
                            onClick={() => handleStowHand('right')}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                            title="Убрать в карманы"
                          >
                            В карман
                          </button>
                          <button
                            onClick={() => handleDropFromHand('right')}
                            className="px-2 py-0.5 bg-rose-950/50 hover:bg-rose-900 text-rose-300 rounded text-[10px]"
                            title="Бросить на землю"
                          >
                            Бросить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* POCKETS GRID */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Карманы одежды (Вместимость зависит от надетой куртки, штанов и жилета)</span>
                    <span className="font-mono">Горячие клавиши [1-6]</span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                    {Array.from({ length: maxSlots }).map((_, slotIdx) => {
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
                          className={`relative aspect-square rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                            isDimmed ? 'opacity-25 grayscale' : ''
                          } ${
                            isSelected && item
                              ? 'border-sky-400 bg-sky-950/60 shadow-lg ring-2 ring-sky-400/40 scale-105'
                              : item
                              ? 'border-slate-700/80 bg-slate-800/80 hover:bg-slate-700/80 hover:border-slate-500'
                              : 'border-slate-800 bg-slate-950/40 cursor-default'
                          }`}
                        >
                          {/* Hotbar Indicator */}
                          {isHotbar && (
                            <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-slate-500">
                              {slotIdx + 1}
                            </span>
                          )}

                          {item ? (
                            <>
                              <ItemIconCanvas itemId={item.itemId} size={36} className="transform hover:scale-110 transition" />
                              {item.count > 1 && (
                                <span className="absolute top-1 right-1 px-1.5 py-0.2 bg-slate-900/90 border border-slate-700 rounded-md text-[10px] font-mono font-bold text-slate-200">
                                  {item.count}
                                </span>
                              )}
                              {/* Container Badge */}
                              {item.isContainer && (
                                <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-sky-950/90 border border-sky-600/60 rounded text-[8px] font-mono font-bold text-sky-300">
                                  {item.contents?.length || 0}
                                </span>
                              )}
                              {item.maxPortions && item.maxPortions > 1 && (
                                <div className="absolute bottom-1 left-1.5 right-1.5 flex flex-col items-center gap-0.5 pointer-events-none">
                                  <div className="w-full bg-slate-950/90 h-1 rounded-full overflow-hidden border border-slate-700/80">
                                    <div 
                                      className="h-full bg-sky-400 rounded-full transition-all"
                                      style={{ width: `${Math.max(0, Math.min(100, ((item.portions ?? item.maxPortions) / item.maxPortions) * 100))}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-800/80" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT: ITEM DETAILS & ACTIONS (5 cols) */}
              <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                {selectedEntry && selectedEntry.item ? (
                  <div className="flex flex-col gap-4">
                    {/* Item Card Banner */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner shrink-0 p-1">
                        <ItemIconCanvas itemId={selectedEntry.item.itemId} size={52} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            selectedEntry.item.category === 'food' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            selectedEntry.item.category === 'drink' ? 'bg-sky-950 text-sky-400 border border-sky-800' :
                            selectedEntry.item.category === 'med' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                            'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {selectedEntry.item.category === 'food' ? 'Еда' :
                             selectedEntry.item.category === 'drink' ? 'Напиток' :
                             selectedEntry.item.category === 'med' ? 'Медицина' :
                             selectedEntry.item.category === 'tool' ? 'Инструмент' : 'Ценность'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            x{selectedEntry.item.count} в пачке
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white leading-snug">
                          {selectedEntry.item.nameRu}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          {selectedEntry.item.name}
                        </p>
                      </div>
                    </div>

                    {/* Physical Metrics of Item */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                        <span className="text-slate-400">Вес (общий):</span>
                        <span className="text-slate-200 font-bold">{getItemTotalWeight(selectedEntry.item)} кг</span>
                      </div>
                      <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                        <span className="text-slate-400">Объем (общий):</span>
                        <span className="text-sky-300 font-bold">{getItemTotalVolume(selectedEntry.item)} л</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl text-xs text-slate-300 leading-relaxed">
                      {selectedEntry.item.descriptionRu}
                    </div>

                    {/* Container specs and action */}
                    {selectedEntry.item.isContainer && (
                      <div className="p-3 bg-sky-950/30 border border-sky-800/50 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-sky-300 flex items-center gap-1.5">
                            <Layers className="w-4 h-4" />
                            Вместимость контейнера:
                          </span>
                          <span className="font-mono text-sky-200">
                            {selectedEntry.item.containerCapacityL} л / {selectedEntry.item.maxContainedWeightKg} кг
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Внутри: {selectedEntry.item.contents?.length || 0} предметов. Объем содержимого суммируется с самим контейнером!
                        </div>
                        <button
                          onClick={() => { setOpenContainer(selectedEntry.item); setSelectedContainerItemIdx(0); }}
                          className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow"
                        >
                          <Package className="w-4 h-4" />
                          <span>Открыть содержимое ({selectedEntry.item.contents?.length || 0})</span>
                        </button>
                      </div>
                    )}

                    {/* Stash into other container option */}
                    {!selectedEntry.item.isContainer && availableContainers.length > 0 && (
                      <div className="p-2.5 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-1.5 text-xs">
                        <span className="text-slate-400 font-semibold flex items-center gap-1">
                          <ArrowDownToLine className="w-3.5 h-3.5 text-sky-400" />
                          Спрятать в контейнер:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {availableContainers.map(cont => (
                            <button
                              key={cont.id}
                              onClick={() => handlePutIntoContainer(cont, selectedEntry.originalIndex)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
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
                          className="py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
                        >
                          <Hand className="w-3.5 h-3.5" />
                          <span>В левую руку</span>
                        </button>
                        <button
                          onClick={() => handleTakeToHand('right', selectedEntry.originalIndex)}
                          disabled={!!player.rightHandItem}
                          className="py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
                        >
                          <Hand className="w-3.5 h-3.5" />
                          <span>В правую руку</span>
                        </button>
                      </div>

                      {selectedEntry.item.clothingStats ? (
                        <button
                          id="btn-equip-selected-item"
                          onClick={() => handleEquipItem(selectedEntry.originalIndex)}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold rounded-xl border border-blue-400/40 shadow-lg flex items-center justify-center gap-2 text-sm transition"
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
                          className="w-full py-3 bg-sky-600 hover:bg-sky-500 active:scale-98 text-white font-bold rounded-xl border border-sky-400/40 shadow-lg flex items-center justify-center gap-2 text-sm transition"
                        >
                          <Package className="w-4 h-4" />
                          <span>Открыть контейнер ({selectedEntry.item.contents?.length || 0} предм.)</span>
                        </button>
                      ) : selectedEntry.item.usable && (
                        <button
                          id="btn-use-selected-item"
                          onClick={() => handleUseItem(selectedEntry.originalIndex)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold rounded-xl border border-emerald-400/40 shadow-lg flex items-center justify-center gap-2 text-sm transition"
                        >
                          <Utensils className="w-4 h-4" />
                          <span>Использовать</span>
                        </button>
                      )}

                      <button
                        id="btn-drop-selected-item"
                        onClick={() => handleDropItem(selectedEntry.originalIndex)}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-300 font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-xs transition"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400" />
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
                          className="w-full py-2 bg-emerald-950/80 hover:bg-emerald-900 active:scale-98 text-emerald-300 font-bold rounded-xl border border-emerald-600/60 shadow flex items-center justify-center gap-2 text-xs transition"
                        >
                          <Trash2 className="w-4 h-4 text-emerald-400" />
                          <span>Выбросить в урну / контейнер (+Деньги)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-500">
                    <Package className="w-12 h-12 mb-3 text-slate-600 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-400">Выберите предмет в ячейке</p>
                    <p className="text-xs text-slate-600 mt-1">Отобразятся вес, объем, возможность взять в руки или положить в контейнер</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* CONTAINER DETAILED VIEW (SUB-INVENTORY) */}
          {activeTab === 'inventory' && openContainer && (
            <div className="lg:col-span-12 flex flex-col gap-4">
              {/* Back button & Container Info Header */}
              <div className="flex items-center justify-between p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setOpenContainer(null)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-1 text-xs font-bold transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Назад в карманы</span>
                  </button>
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                    <ItemIconCanvas itemId={openContainer.itemId} size={32} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {openContainer.nameRu}
                      <span className="text-xs px-2 py-0.5 bg-sky-950 border border-sky-800 rounded text-sky-400 font-mono">
                        Контейнер
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Вместимость: {openContainer.containerCapacityL} л • Макс. вес: {openContainer.maxContainedWeightKg} кг • Лимит 1 предмета: {openContainer.maxContainedItemVolumeL || openContainer.containerCapacityL} л
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-400">Предметов: </span>
                    <span className="text-slate-200 font-bold">{openContainer.contents?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Суммарный объем: </span>
                    <span className="text-sky-300 font-bold">{getItemTotalVolume(openContainer)} л</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Суммарный вес: </span>
                    <span className="text-amber-300 font-bold">{getItemTotalWeight(openContainer)} кг</span>
                  </div>
                </div>
              </div>

              {/* Contents Grid & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(openContainer.contents || []).length > 0 ? (
                  openContainer.contents!.map((contItem, cIdx) => (
                    <div 
                      key={cIdx} 
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                          <ItemIconCanvas itemId={contItem.itemId} size={32} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{contItem.nameRu}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            {contItem.count} шт. • {getItemTotalWeight(contItem)} кг • {getItemTotalVolume(contItem)} л
                          </div>
                        </div>
                      </div>

                      {/* Action buttons for item in container */}
                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <button
                          onClick={() => handleExtractFromContainer(openContainer, cIdx, 'pockets')}
                          className="py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg flex items-center justify-center gap-1"
                          title="Переложить в карман"
                        >
                          <ArrowUpFromLine className="w-3 h-3" />
                          <span>В карман</span>
                        </button>
                        <button
                          onClick={() => handleExtractFromContainer(openContainer, cIdx, 'rightHand')}
                          disabled={!!player.rightHandItem}
                          className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold rounded-lg flex items-center justify-center gap-1"
                          title="Взять в правую руку"
                        >
                          <Hand className="w-3 h-3" />
                          <span>В руку</span>
                        </button>
                        <button
                          onClick={() => handleDropFromContainer(openContainer, cIdx)}
                          className="py-1.5 px-2 bg-rose-950/50 hover:bg-rose-900 text-rose-300 font-semibold rounded-lg flex items-center justify-center gap-1"
                          title="Выбросить на землю"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Бросить</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-slate-500 bg-slate-950/30 border border-dashed border-slate-800 rounded-2xl">
                    <Package className="w-10 h-10 mb-2 mx-auto text-slate-600" />
                    <p className="text-sm font-medium text-slate-400">Контейнер пуст</p>
                    <p className="text-xs text-slate-600 mt-1">Переложите сюда предметы из карманов с помощью кнопки «Спрятать в контейнер»</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SURROUNDINGS TAB */}
          {activeTab === 'surroundings' && (
            <div className="lg:col-span-12 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-200">
                Предметы и объекты поблизости
              </h3>

              {nearbyGroundItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {nearbyGroundItems.map((gi) => (
                    <div
                      key={gi.id}
                      className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <ItemIconCanvas itemId={gi.item.itemId} size={32} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{gi.item.nameRu}</h4>
                          <p className="text-xs text-slate-400">
                            {gi.item.count} шт. • {getItemTotalWeight(gi.item)} кг • {getItemTotalVolume(gi.item)} л
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePickupGroundItem(gi)}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Подобрать</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500">
                  <Sparkles className="w-10 h-10 mb-2 text-slate-600" />
                  <p className="text-sm font-medium text-slate-400">Поблизости нет выброшенных предметов</p>
                  <p className="text-xs text-slate-600 mt-1">Вы можете находить еду, напитки и медикаменты на улицах и в зданиях</p>
                </div>
              )}
            </div>
          )}

          {/* CLOTHING & POCKET CAPACITY TAB */}
          {activeTab === 'clothing' && (
            <div className="lg:col-span-12 flex flex-col gap-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-sky-400">Надетая одежда и вместимость карманов</h3>
                <span className="text-xs font-mono text-slate-400">
                  Всего объема карманов: {pocketCap.totalCapacityL} л (Занято: {pocketCap.usedVolumeL} л)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(player.equippedClothing || {}).map(([slot, layers]) => (
                  <div key={slot} className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex flex-col gap-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{slot}</div>
                    {Object.entries(layers).map(([layer, item]) => (
                      <div key={layer} className="flex flex-col gap-2 p-2.5 bg-slate-800 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-2">
                          <ItemIconCanvas itemId={item.itemId} size={32} className="rounded-lg bg-slate-950 border border-slate-700 p-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.nameRu}</div>
                            <div className="text-xs text-slate-400">Слой: {layer}</div>
                          </div>
                        </div>

                        {/* Pocket info for this clothing item */}
                        {item.clothingStats && item.clothingStats.pocketCapacityL ? (
                          <div className="text-[11px] font-mono text-sky-300 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                            Карманы: +{item.clothingStats.pocketCapacityL} л (макс. {item.clothingStats.maxPocketItemVolumeL || 0.4}л / предм., +{item.clothingStats.maxPocketWeightKg || 1.5}кг)
                          </div>
                        ) : null}

                        <button 
                          onClick={() => handleUnequipItem(slot, layer)} 
                          className="w-full py-1 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold rounded transition"
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

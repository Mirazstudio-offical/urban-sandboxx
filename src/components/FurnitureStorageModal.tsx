import React, { useState } from 'react';
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
import { 
  addItemToPlayer, 
  removeItemFromPlayer, 
  getPlayerPocketCapacity, 
  getPlayerTotalCarriedWeight, 
  getItemTotalWeight, 
  getItemTotalVolume,
  putItemInHand,
  addPlayerNotification
} from '../items';
import { ItemIconCanvas } from './ItemIconCanvas';
import { sound } from '../audio';
import { 
  X, 
  Shirt, 
  Snowflake, 
  Utensils, 
  Archive, 
  BookOpen, 
  Folder, 
  Box, 
  PenTool, 
  Table, 
  Lock, 
  Layers, 
  Weight, 
  ArrowRight, 
  ArrowLeft, 
  Hand, 
  Package, 
  Droplets, 
  Zap, 
  Coins, 
  Sparkles,
  Info
} from 'lucide-react';

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

  // Resolve storage object either directly from prop or from ID parameters
  const storage: FurnitureStorage | null = props.storage || (props.buildingId && props.furnitureType ? getFurnitureStorage(
    props.buildingId,
    props.floor ?? 0,
    props.furnitureIndex ?? 0,
    props.furnitureType,
    props.aptId,
    props.customTitle
  ) : null);

  const [selectedStorageIdx, setSelectedStorageIdx] = useState<number | null>(0);
  const [selectedInventoryIdx, setSelectedInventoryIdx] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  if (!isOpen || !storage || !player) return null;

  const cfg = FURNITURE_STORAGE_CONFIGS[storage.furnitureType] || FURNITURE_STORAGE_CONFIGS.wardrobe;
  const storageTotalVol = getFurnitureStorageTotalVolume(storage);
  const storageTotalWt = getFurnitureStorageTotalWeight(storage);

  const volPercent = Math.min(100, Math.round((storageTotalVol / cfg.capacityL) * 100));
  const wtPercent = Math.min(100, Math.round((storageTotalWt / cfg.maxWeightKg) * 100));

  const playerCarriedWt = getPlayerTotalCarriedWeight(player);
  const playerPocketCap = getPlayerPocketCapacity(player);

  const renderIcon = () => {
    switch (cfg.iconName) {
      case 'Shirt': return <Shirt className="w-5 h-5 text-indigo-400" />;
      case 'Snowflake': return <Snowflake className="w-5 h-5 text-cyan-400" />;
      case 'Utensils': return <Utensils className="w-5 h-5 text-amber-400" />;
      case 'Archive': return <Archive className="w-5 h-5 text-blue-400" />;
      case 'BookOpen': return <BookOpen className="w-5 h-5 text-emerald-400" />;
      case 'Folder': return <Folder className="w-5 h-5 text-orange-400" />;
      case 'Box': return <Box className="w-5 h-5 text-yellow-400" />;
      case 'PenTool': return <PenTool className="w-5 h-5 text-purple-400" />;
      case 'Lock': return <Lock className="w-5 h-5 text-rose-400" />;
      default: return <Layers className="w-5 h-5 text-slate-300" />;
    }
  };

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
    sound.playPickup();
    addPlayerNotification(player, `Помещено в ${cfg.nameRu}: ${removed.nameRu} (x${removed.count})`, 'pickup');
    notifyChange();
  };

  // Take item from furniture storage into player inventory
  const handleTakeItem = (storageIdx: number, countToTake?: number) => {
    setErrorMessage(null);
    if (!storage.items || storageIdx < 0 || storageIdx >= storage.items.length) return;
    const targetItem = storage.items[storageIdx];
    if (!targetItem) return;

    const count = countToTake ?? targetItem.count;
    const removed = removeItemFromFurnitureStorage(storage, storageIdx, count);
    if (!removed) return;

    const added = addItemToPlayer(player, removed);
    if (!added) {
      // Revert if inventory cannot take
      storage.items.push(removed);
      setErrorMessage('В карманах игрока недостаточно места!');
      sound.playUseItem();
      return;
    }

    sound.playPickup();
    addPlayerNotification(player, `Взято из ${cfg.nameRu}: ${removed.nameRu} (x${removed.count})`, 'pickup');
    notifyChange();
  };

  // Take item directly to hand
  const handleTakeToHand = (storageIdx: number, hand: 'left' | 'right') => {
    setErrorMessage(null);
    if (!storage.items || storageIdx < 0 || storageIdx >= storage.items.length) return;
    const targetItem = storage.items[storageIdx];
    if (!targetItem) return;

    const currentHandItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (currentHandItem) {
      setErrorMessage(`${hand === 'left' ? 'Левая' : 'Правая'} рука уже занята!`);
      return;
    }

    const countToTake = targetItem.count > 1 ? 1 : targetItem.count;
    const removed = removeItemFromFurnitureStorage(storage, storageIdx, countToTake);
    if (!removed) return;

    const res = putItemInHand(player, hand, removed, world || undefined);
    if (!res.success) {
      storage.items.push(removed);
      setErrorMessage(res.message);
      return;
    }

    sound.playPickup();
    addPlayerNotification(player, `Взято в ${hand === 'left' ? 'левую' : 'правую'} руку: ${removed.nameRu}`, 'pickup');
    notifyChange();
  };

  const filteredInventory = (player.inventory || []).map((it, idx) => ({ item: it, originalIndex: idx })).filter(({ item }) => {
    if (!item) return false;
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800/90 rounded-lg border border-slate-700">
              {renderIcon()}
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-wide flex items-center gap-2 text-white">
                {storage.customTitle || cfg.nameRu}
                {cfg.isCold && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Охлаждение (+4°C)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Физическое хранилище квартиры • {storage.items.length} предметов внутри
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner if any */}
        {errorMessage && (
          <div className="px-5 py-2 bg-rose-950/80 border-b border-rose-800/80 text-rose-200 text-xs flex items-center justify-between animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white text-xs underline">
              Скрыть
            </button>
          </div>
        )}

        {/* Dual Panel Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 flex-1 overflow-hidden min-h-[440px]">
          
          {/* LEFT PANEL: Furniture Storage Contents */}
          <div className="flex flex-col p-4 bg-slate-900/60 overflow-hidden">
            {/* Capacity Gauges */}
            <div className="space-y-2 mb-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-400" /> Вместимость
                  </span>
                  <span className="font-mono text-slate-200">
                    {storageTotalVol.toFixed(1)} / {cfg.capacityL.toFixed(1)} л ({volPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${volPercent > 90 ? 'bg-rose-500' : volPercent > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                    style={{ width: `${volPercent}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Weight className="w-3.5 h-3.5 text-emerald-400" /> Весовая нагрузка
                  </span>
                  <span className="font-mono text-slate-200">
                    {storageTotalWt.toFixed(1)} / {cfg.maxWeightKg.toFixed(1)} кг ({wtPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${wtPercent > 90 ? 'bg-rose-500' : wtPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${wtPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Storage Item Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
              {storage.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Package className="w-12 h-12 stroke-[1.2] mb-2 opacity-40" />
                  <p className="text-sm font-medium">Хранилище пусто</p>
                  <p className="text-xs text-slate-500 mt-1">Выберите предметы из инвентаря справа, чтобы сложить их в шкаф.</p>
                </div>
              ) : (
                storage.items.map((it, idx) => {
                  const isSelected = selectedStorageIdx === idx;
                  const itVol = getItemTotalVolume(it);
                  const itWt = getItemTotalWeight(it);
                  return (
                    <div
                      key={it.id || idx}
                      onClick={() => { setSelectedStorageIdx(idx); setSelectedInventoryIdx(null); }}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                        isSelected 
                          ? 'bg-indigo-950/60 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/50' 
                          : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                          <ItemIconCanvas itemId={it.itemId} item={it} size={32} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100 truncate">
                            {it.nameRu} {it.count > 1 && <span className="text-amber-400 font-mono">x{it.count}</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{itWt.toFixed(2)} кг</span>
                            <span>•</span>
                            <span>{itVol.toFixed(1)} л</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick action buttons on item */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTakeItem(idx, 1); }}
                          className="px-2 py-1 bg-slate-700 hover:bg-indigo-600 text-white rounded text-[11px] font-medium transition-colors"
                          title="Забрать 1 шт"
                        >
                          Взять 1
                        </button>
                        {it.count > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTakeItem(idx, it.count); }}
                            className="px-2 py-1 bg-slate-700 hover:bg-indigo-600 text-white rounded text-[11px] font-medium transition-colors"
                            title="Забрать всю стопку"
                          >
                            Всё
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Storage Selected Item Action Bar */}
            {selectedStorageIdx !== null && storage.items[selectedStorageIdx] && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-950/40 p-2 rounded-lg">
                <span className="text-xs text-slate-300 truncate font-medium">
                  {storage.items[selectedStorageIdx].nameRu}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleTakeToHand(selectedStorageIdx, 'left')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs rounded transition-colors"
                    title="Взять в левую руку"
                  >
                    <Hand className="w-3.5 h-3.5" /> Л. рука
                  </button>
                  <button
                    onClick={() => handleTakeToHand(selectedStorageIdx, 'right')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs rounded transition-colors"
                    title="Взять в правую руку"
                  >
                    <Hand className="w-3.5 h-3.5" /> П. рука
                  </button>
                  <button
                    onClick={() => handleTakeItem(selectedStorageIdx)}
                    className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> В инвентарь
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Player Inventory */}
          <div className="flex flex-col p-4 bg-slate-900/60 overflow-hidden">
            {/* Player Metrics */}
            <div className="flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 mb-2.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Weight className="w-3.5 h-3.5 text-blue-400" /> Вес вещей: <strong className="text-slate-200 font-mono">{playerCarriedWt.toFixed(1)} кг</strong>
              </span>
              <span className="text-slate-400">
                Карманы: <strong className="text-slate-200 font-mono">{playerPocketCap.totalCapacityL.toFixed(1)} л</strong>
              </span>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 no-scrollbar text-xs">
              {(['all', 'clothing', 'food', 'drink', 'tool', 'valuable', 'misc'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                    selectedCategory === cat 
                      ? 'bg-slate-700 text-white font-medium shadow' 
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat === 'all' ? 'Все' : cat === 'clothing' ? 'Одежда' : cat === 'food' ? 'Еда' : cat === 'drink' ? 'Напитки' : cat === 'tool' ? 'Инструменты' : cat === 'valuable' ? 'Ценности' : 'Разное'}
                </button>
              ))}
            </div>

            {/* Inventory List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
              {filteredInventory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Package className="w-12 h-12 stroke-[1.2] mb-2 opacity-40" />
                  <p className="text-sm font-medium">Нет подходящих предметов</p>
                </div>
              ) : (
                filteredInventory.map(({ item, originalIndex }) => {
                  const isSelected = selectedInventoryIdx === originalIndex;
                  const itVol = getItemTotalVolume(item);
                  const itWt = getItemTotalWeight(item);
                  return (
                    <div
                      key={item.id || originalIndex}
                      onClick={() => { setSelectedInventoryIdx(originalIndex); setSelectedStorageIdx(null); }}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                        isSelected 
                          ? 'bg-blue-950/60 border-blue-500/80 shadow-md ring-1 ring-blue-500/50' 
                          : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                          <ItemIconCanvas itemId={item.itemId} item={item} size={32} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100 truncate">
                            {item.nameRu} {item.count > 1 && <span className="text-amber-400 font-mono">x{item.count}</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{itWt.toFixed(2)} кг</span>
                            <span>•</span>
                            <span>{itVol.toFixed(1)} л</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick store button */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStoreItem(originalIndex, 1); }}
                          className="px-2.5 py-1 bg-slate-700 hover:bg-blue-600 text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1"
                          title="Положить 1 шт в хранилище"
                        >
                          <ArrowLeft className="w-3 h-3" /> В шкаф
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Inventory Selected Item Action Bar */}
            {selectedInventoryIdx !== null && player.inventory[selectedInventoryIdx] && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-950/40 p-2 rounded-lg">
                <span className="text-xs text-slate-300 truncate font-medium">
                  {player.inventory[selectedInventoryIdx].nameRu}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleStoreItem(selectedInventoryIdx, 1)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs rounded transition-colors"
                  >
                    Положить 1
                  </button>
                  <button
                    onClick={() => handleStoreItem(selectedInventoryIdx)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Положить всё
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>[E / Клик]: Взаимодействие</span>
            <span>[Esc]: Закрыть хранилище</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Готово
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Player, InventoryItem, ItemCategory, GameWorld, GroundItem } from '../types';
import { useItemOnPlayer, dropItemFromPlayer, addItemToPlayer, ITEM_CATALOG, isPlayerNearTrashBin, disposeTrashInBin, pickupNearbyLitter } from '../items';
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
  ShieldAlert, 
  Trash2, 
  Sparkles,
  Info,
  CheckCircle,
  Plus,
  Bed,
  Refrigerator,
  Coffee,
  Coins
} from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  world: GameWorld | null;
  onSleepInBed?: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  player,
  world,
  onSleepInBed
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'inventory' | 'surroundings'>('inventory');

  if (!isOpen || !player) return null;

  const inventory = player.inventory || [];
  const maxSlots = player.maxInventorySlots || 18;

  // Filter items by category
  const filteredItemsWithIndices = inventory
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => selectedCategory === 'all' || item.category === selectedCategory);

  const selectedEntry = inventory[selectedIndex] ? { item: inventory[selectedIndex], originalIndex: selectedIndex } : null;

  // Handle Using Item
  const handleUseItem = (idx: number) => {
    if (!player) return;
    useItemOnPlayer(player, idx, world || undefined);
    sound.resume();
  };

  // Handle Dropping Item
  const handleDropItem = (idx: number) => {
    if (!player || !world) return;
    dropItemFromPlayer(player, idx, world, 1);
  };

  // Handle Quick Pickup from Nearby items
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
    }
  };

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
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                Инвентарь и Снаряжение
                <span className="text-xs px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full font-mono text-slate-400 font-normal">
                  {inventory.length} / {maxSlots} слотов
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Управляйте предметами, едой, напитками и медикаментами для поддержания жизнедеятельности
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

        {/* TABS & CATEGORIES BAR */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50 gap-2">
          {/* Main View Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              id="tab-inventory-btn"
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'inventory' 
                  ? 'bg-sky-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Рюкзак ({inventory.length})</span>
            </button>
            <button
              id="tab-surroundings-btn"
              onClick={() => setActiveTab('surroundings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'surroundings' 
                  ? 'bg-sky-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Вокруг вас ({nearbyGroundItems.length})</span>
            </button>
          </div>

          {/* Category Filter Pills (if on inventory tab) */}
          {activeTab === 'inventory' && (
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

        {/* MAIN BODY: 2-COLUMN GRID (SLOTS + DETAILS) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {activeTab === 'inventory' ? (
            <>
              {/* LEFT: SLOTS GRID (8 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Ячейки инвентаря</span>
                  <span className="font-mono">Горячие клавиши [1-6] на панели</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {Array.from({ length: maxSlots }).map((_, slotIdx) => {
                    const item = inventory[slotIdx];
                    const isSelected = selectedIndex === slotIdx;
                    const isHotbar = slotIdx < 6;

                    return (
                      <div
                        key={slotIdx}
                        id={`inventory-slot-${slotIdx}`}
                        onClick={() => {
                          if (item) setSelectedIndex(slotIdx);
                        }}
                        onDoubleClick={() => {
                          if (item) handleUseItem(slotIdx);
                        }}
                        className={`relative aspect-square rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
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
                            <ItemIconCanvas itemId={item.itemId} size={38} className="transform hover:scale-110 transition" />
                            {item.count > 1 && (
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.2 bg-slate-900/90 border border-slate-700 rounded-md text-[10px] font-mono font-bold text-slate-200">
                                {item.count}
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-800/80" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Helpful instructions note */}
                <div className="mt-4 p-3 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-300">Совет по выживанию:</span> Ешьте регулярно и пейте воду до того, как показатели упадут до нуля. Полноценный отдых на кровати восстанавливает здоровье и полностью снимает сонливость.
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
                        <div className="flex items-center gap-1.5 mb-1">
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

                    {/* Description */}
                    <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl text-xs text-slate-300 leading-relaxed">
                      {selectedEntry.item.descriptionRu}
                    </div>

                    {/* Effects Breakdown */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Эффекты при использовании:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedEntry.item.effects.health !== undefined && (
                          <div className="flex items-center gap-2 p-2 bg-rose-950/30 border border-rose-800/40 rounded-lg text-xs font-semibold text-rose-300">
                            <Heart className="w-4 h-4 text-rose-400" />
                            <span>+{selectedEntry.item.effects.health} Здоровья</span>
                          </div>
                        )}
                        {selectedEntry.item.effects.hunger !== undefined && (
                          <div className="flex items-center gap-2 p-2 bg-amber-950/30 border border-amber-800/40 rounded-lg text-xs font-semibold text-amber-300">
                            <Utensils className="w-4 h-4 text-amber-400" />
                            <span>+{selectedEntry.item.effects.hunger}% Сытости</span>
                          </div>
                        )}
                        {selectedEntry.item.effects.thirst !== undefined && (
                          <div className="flex items-center gap-2 p-2 bg-sky-950/30 border border-sky-800/40 rounded-lg text-xs font-semibold text-sky-300">
                            <Droplets className="w-4 h-4 text-sky-400" />
                            <span>{selectedEntry.item.effects.thirst > 0 ? '+' : ''}{selectedEntry.item.effects.thirst}% Жажды</span>
                          </div>
                        )}
                        {selectedEntry.item.effects.energy !== undefined && (
                          <div className="flex items-center gap-2 p-2 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-xs font-semibold text-emerald-300">
                            <Zap className="w-4 h-4 text-emerald-400" />
                            <span>+{selectedEntry.item.effects.energy}% Энергии</span>
                          </div>
                        )}
                        {selectedEntry.item.effects.sleepiness !== undefined && (
                          <div className="flex items-center gap-2 p-2 bg-purple-950/30 border border-purple-800/40 rounded-lg text-xs font-semibold text-purple-300">
                            <Moon className="w-4 h-4 text-purple-400" />
                            <span>{selectedEntry.item.effects.sleepiness}% Сонливости</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-col gap-2 mt-2">
                      {selectedEntry.item.usable && (
                        <button
                          id="btn-use-selected-item"
                          onClick={() => handleUseItem(selectedEntry.originalIndex)}
                          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-bold rounded-xl border border-emerald-400/40 shadow-lg flex items-center justify-center gap-2 text-sm transition"
                        >
                          <Utensils className="w-4 h-4" />
                          <span>
                            {selectedEntry.item.category === 'food' ? 'Съесть (Eat)' :
                             selectedEntry.item.category === 'drink' ? 'Выпить (Drink)' :
                             selectedEntry.item.category === 'med' ? 'Применить лечение' : 'Использовать'}
                          </span>
                        </button>
                      )}

                      <button
                        id="btn-drop-selected-item"
                        onClick={() => handleDropItem(selectedEntry.originalIndex)}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-300 font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-xs transition"
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
                          }}
                          className="w-full py-2.5 bg-emerald-950/80 hover:bg-emerald-900 active:scale-98 text-emerald-300 font-bold rounded-xl border border-emerald-600/60 shadow flex items-center justify-center gap-2 text-xs transition"
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
                    <p className="text-xs text-slate-600 mt-1">Здесь появится детальное описание и эффекты</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* SURROUNDINGS / WORLD INTERACTION TAB */
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
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                          {gi.item.icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{gi.item.nameRu}</h4>
                          <p className="text-xs text-slate-400">Количество: {gi.item.count} шт.</p>
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
        </div>
      </div>
    </div>
  );
};

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
  getPlayerPocketCapacity, 
  getPlayerTotalCarriedWeight, 
  getItemTotalWeight, 
  getItemTotalVolume,
  putItemInHand,
  addPlayerNotification
} from '../items';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ModalShell } from './gameUi';
import { sound } from '../audio';
import { 
  Snowflake, 
  Utensils, 
  Weight, 
  ArrowRight, 
  ArrowLeft, 
  Hand, 
  Package, 
  Info,
  Flame,
  CloudRain
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
  onOpenKitchenStation?: () => void;
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

  // Live real-time thermodynamic drying and heating tick while viewing storage
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
    sound.playPickup();
    addPlayerNotification(player, `Помещено ${isRadiator ? 'на батарею' : `в ${cfg.nameRu}`}: ${removed.nameRu} (x${removed.count})`, 'pickup');
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
      storage.items.push(removed);
      setErrorMessage('В карманах игрока недостаточно места!');
      sound.playUseItem();
      return;
    }

    sound.playPickup();
    addPlayerNotification(player, `Взято ${isRadiator ? 'с батареи' : `из ${cfg.nameRu}`}: ${removed.nameRu} (x${removed.count})`, 'pickup');
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
    <ModalShell
      id="furniture-storage-modal"
      title={storage.customTitle || cfg.nameRu}
      subtitle={
        isRadiator
          ? `Поверхность радиатора • ${storage.items.length} предм. сушится`
          : `Физическое хранилище • ${storage.items.length} предм. внутри`
      }
      width={1020}
      tall
      onClose={onClose}
      headRight={
        <div className="gu-row" style={{ gap: 8 }}>
          {cfg.isCold && (
            <span className="gu-tag cold">
              <Snowflake className="w-3 h-3" /> Охлаждение (+4°C)
            </span>
          )}
          {isHotSurface && (
            <span className="gu-tag amber">
              <Flame className="w-3 h-3" /> Нагрев (+{cfg.heatingTemp || 65}°C)
            </span>
          )}
          {props.onOpenKitchenStation && (cfg.type === 'kitchen_counter' || cfg.type === 'stove' || cfg.type === 'table') && (
            <button
              type="button"
              onClick={() => props.onOpenKitchenStation?.()}
              className="gu-btn gu-btn-p gu-btn-sm"
              title="Перейти к рабочей поверхности гарнитура для нарезки и готовки"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Готовка и нарезка</span>
            </button>
          )}
        </div>
      }
      footerHints={[['Клик', 'Выбрать предмет'], ['Esc', 'Закрыть']]}
      footerRight={
        <button type="button" onClick={onClose} className="gu-btn gu-btn-s gu-btn-sm">
          Готово
        </button>
      }
    >
      {errorMessage && (
        <div className="gu-note gu-err" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Info className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </span>
          <button type="button" onClick={() => setErrorMessage(null)} className="gu-btn gu-btn-ghost gu-btn-xs">
            Скрыть
          </button>
        </div>
      )}

      <div className="gu-grid gu-g2" style={{ alignItems: 'stretch' }}>
        {/* LEFT PANEL: Furniture Storage Contents */}
        <div className="gu-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 430 }}>
          <div className="gu-sec" style={{ marginTop: 0 }}>
            <span>{isRadiator ? 'Поверхность радиатора' : 'Содержимое хранилища'}</span>
            <span className="gu-sec-sub">{storage.items.length} предм.</span>
          </div>

          <div className="gu-card-sm" style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div className="gu-row-between" style={{ fontSize: 11, marginBottom: 4 }}>
                <span className="gu-mute" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Package className="w-3.5 h-3.5" style={{ color: 'var(--gu-accent-hi)' }} />
                  {isRadiator ? 'Площадь сушки' : 'Объём хранилища'}
                </span>
                <span className="gu-mono" style={{ fontWeight: 600 }}>
                  {storageTotalVol.toFixed(1)} / {cfg.capacityL.toFixed(1)} л ({volPercent}%)
                </span>
              </div>
              <div className={`gu-bar ${volPercent > 90 ? 'bad' : ''}`}>
                <span style={{ width: `${volPercent}%` }} />
              </div>
            </div>

            <div>
              <div className="gu-row-between" style={{ fontSize: 11, marginBottom: 4 }}>
                <span className="gu-mute" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Weight className="w-3.5 h-3.5" style={{ color: '#9ac985' }} />
                  Весовая нагрузка
                </span>
                <span className="gu-mono" style={{ fontWeight: 600 }}>
                  {storageTotalWt.toFixed(1)} / {cfg.maxWeightKg.toFixed(1)} кг ({wtPercent}%)
                </span>
              </div>
              <div className={`gu-bar ${wtPercent > 90 ? 'bad' : 'good'}`}>
                <span style={{ width: `${wtPercent}%` }} />
              </div>
            </div>
          </div>

          <div style={{ flex: 1, maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
            {storage.items.length === 0 ? (
              <div className="gu-empty" style={{ margin: 'auto 0' }}>
                {isRadiator ? (
                  <>
                    <div className="gu-empty-t">На батарее ничего не сушится</div>
                    <div>Положите сюда сырую одежду, мокрые носки, обувь или напитки для согревания и сушки.</div>
                  </>
                ) : (
                  <>
                    <div className="gu-empty-t">Хранилище пусто</div>
                    <div>Выберите предметы из инвентаря справа, чтобы сложить их сюда.</div>
                  </>
                )}
              </div>
            ) : (
              storage.items.map((it, idx) => {
                const isSelected = selectedStorageIdx === idx;
                const itVol = getItemTotalVolume(it);
                const itWt = getItemTotalWeight(it);
                const isWet = (it.wetness ?? 0) > 0;
                const itemTemp = it.surfaceTemperature ?? it.temperature ?? 20;

                return (
                  <div
                    key={it.id || idx}
                    onClick={() => { setSelectedStorageIdx(idx); setSelectedInventoryIdx(null); }}
                    className={`gu-item ${isSelected ? 'on' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 6, background: 'rgba(10,10,12,0.75)', border: '1px solid var(--gu-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ItemIconCanvas itemId={it.itemId} item={it} size={30} />
                    </div>
                    <div className="gu-item-main">
                      <div className="gu-item-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nameRu}</span>
                        {it.count > 1 && <span className="gu-tag amber">x{it.count}</span>}
                        {itemTemp >= 40 && (
                          <span className="gu-tag amber">+{Math.round(itemTemp)}°C</span>
                        )}
                      </div>
                      <div className="gu-item-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>{itWt.toFixed(2)} кг</span>
                        <span>•</span>
                        <span>{itVol.toFixed(1)} л</span>
                        {isWet && (
                          <span style={{ color: '#7dd3fc', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <CloudRain className="w-3 h-3" /> {Math.round(it.wetness!)}%
                          </span>
                        )}
                        {isHotSurface && isWet && (
                          <span style={{ color: 'var(--gu-accent-bright)', fontWeight: 600 }}>Сушится...</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleTakeItem(idx, 1); }}
                      className="gu-btn gu-btn-xs"
                      title="Забрать предмет в карманы"
                    >
                      {isRadiator ? 'Снять' : 'Забрать'}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {selectedStorageIdx !== null && storage.items[selectedStorageIdx] && (
            <div className="gu-card-sm" style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {storage.items[selectedStorageIdx].nameRu}
              </span>
              <div className="gu-row" style={{ gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handleTakeToHand(selectedStorageIdx, 'left')}
                  className="gu-btn gu-btn-xs"
                  title="Взять в левую руку"
                >
                  <Hand className="w-3 h-3" /> Л. рука
                </button>
                <button
                  type="button"
                  onClick={() => handleTakeToHand(selectedStorageIdx, 'right')}
                  className="gu-btn gu-btn-xs"
                  title="Взять в правую руку"
                >
                  <Hand className="w-3 h-3" /> П. рука
                </button>
                <button
                  type="button"
                  onClick={() => handleTakeItem(selectedStorageIdx)}
                  className="gu-btn gu-btn-p gu-btn-xs"
                >
                  <ArrowRight className="w-3 h-3" /> В карманы
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Player Inventory */}
        <div className="gu-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 430 }}>
          <div className="gu-sec" style={{ marginTop: 0 }}>
            <span>Инвентарь и карманы игрока</span>
            <span className="gu-sec-sub">
              {playerCarriedWt.toFixed(1)} кг • {playerPocketCap.totalCapacityL.toFixed(1)} л
            </span>
          </div>

          <div className="gu-pills" style={{ marginBottom: 10 }}>
            {(['all', 'clothing', 'food', 'drink', 'tool', 'valuable', 'misc'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`gu-pill ${selectedCategory === cat ? 'on' : ''}`}
              >
                {cat === 'all' ? 'Все' : cat === 'clothing' ? 'Одежда' : cat === 'food' ? 'Еда' : cat === 'drink' ? 'Напитки' : cat === 'tool' ? 'Инструменты' : cat === 'valuable' ? 'Ценности' : 'Разное'}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, maxHeight: 330, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
            {filteredInventory.length === 0 ? (
              <div className="gu-empty" style={{ margin: 'auto 0' }}>
                <div className="gu-empty-t">Нет подходящих предметов</div>
                <div>В выбранной категории инвентаря пусто.</div>
              </div>
            ) : (
              filteredInventory.map(({ item, originalIndex }) => {
                const isSelected = selectedInventoryIdx === originalIndex;
                const itVol = getItemTotalVolume(item);
                const itWt = getItemTotalWeight(item);
                const isWet = (item.wetness ?? 0) > 0;
                const itemTemp = item.surfaceTemperature ?? item.temperature ?? 20;

                return (
                  <div
                    key={item.id || originalIndex}
                    onClick={() => { setSelectedInventoryIdx(originalIndex); setSelectedStorageIdx(null); }}
                    className={`gu-item ${isSelected ? 'on' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 6, background: 'rgba(10,10,12,0.75)', border: '1px solid var(--gu-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ItemIconCanvas itemId={item.itemId} item={item} size={30} />
                    </div>
                    <div className="gu-item-main">
                      <div className="gu-item-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nameRu}</span>
                        {item.count > 1 && <span className="gu-tag amber">x{item.count}</span>}
                        {itemTemp >= 40 && (
                          <span className="gu-tag amber">+{Math.round(itemTemp)}°C</span>
                        )}
                      </div>
                      <div className="gu-item-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>{itWt.toFixed(2)} кг</span>
                        <span>•</span>
                        <span>{itVol.toFixed(1)} л</span>
                        {isWet && (
                          <span style={{ color: '#7dd3fc', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <CloudRain className="w-3 h-3" /> {Math.round(item.wetness!)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleStoreItem(originalIndex, 1); }}
                      className="gu-btn gu-btn-p gu-btn-xs"
                      title={isRadiator ? 'Положить на батарею' : 'Положить в хранилище'}
                    >
                      <ArrowLeft className="w-3 h-3" /> {isRadiator ? 'На батарею' : 'В шкаф'}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {selectedInventoryIdx !== null && player.inventory[selectedInventoryIdx] && (
            <div className="gu-card-sm" style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player.inventory[selectedInventoryIdx].nameRu}
              </span>
              <button
                type="button"
                onClick={() => handleStoreItem(selectedInventoryIdx, 1)}
                className="gu-btn gu-btn-p gu-btn-xs"
              >
                <ArrowLeft className="w-3 h-3" /> {isRadiator ? 'Положить на батарею' : 'Положить в шкаф'}
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

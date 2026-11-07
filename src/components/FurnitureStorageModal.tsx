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

      <div className="gu-st-split">
        {/* LEFT PANEL: what is inside the furniture */}
        <div className="gu-panel gu-pad">
          <div className="gu-st-head">
            <span className="gu-st-title">{isRadiator ? 'Поверхность радиатора' : 'Содержимое хранилища'}</span>
            <span className="gu-st-sub">{storage.items.length} предм.</span>
          </div>

          <div className="gu-meters">
            <div className="gu-meter">
              <div className="gu-meter-h">
                <span>{isRadiator ? 'Площадь' : 'Объём'}</span>
                <b>{storageTotalVol.toFixed(1)} / {cfg.capacityL.toFixed(1)} л</b>
              </div>
              <div className={`gu-bar ${volPercent > 90 ? 'bad' : ''}`}><span style={{ width: `${Math.max(1, volPercent)}%` }} /></div>
            </div>
            <div className="gu-meter">
              <div className="gu-meter-h">
                <span>Нагрузка</span>
                <b>{storageTotalWt.toFixed(1)} / {cfg.maxWeightKg.toFixed(1)} кг</b>
              </div>
              <div className={`gu-bar ${wtPercent > 90 ? 'bad' : 'good'}`}><span style={{ width: `${Math.max(1, wtPercent)}%` }} /></div>
            </div>
          </div>

          <div className="gu-st-scroll">
            <div className="gu-li-list">
              {storage.items.length === 0 ? (
                <div className="gu-empty">
                  <Package width={40} height={40} />
                  {isRadiator ? (
                    <>
                      <div className="gu-empty-t">На батарее ничего не сушится</div>
                      <div>Положите сюда сырую одежду, мокрые носки, обувь или напитки для согревания и сушки.</div>
                    </>
                  ) : (
                    <>
                      <div className="gu-empty-t">Хранилище пусто</div>
                      <div>Выберите предметы в инвентаре справа, чтобы сложить их сюда.</div>
                    </>
                  )}
                </div>
              ) : (
                storage.items.map((it, idx) => {
                  const isSelected = selectedStorageIdx === idx;
                  const isWet = (it.wetness ?? 0) > 0;
                  const itemTemp = it.surfaceTemperature ?? it.temperature ?? 20;
                  return (
                    <div
                      key={it.id || idx}
                      onClick={() => { setSelectedStorageIdx(idx); setSelectedInventoryIdx(null); }}
                      className={'gu-li' + (isSelected ? ' on' : '')}
                    >
                      <div className="gu-ic">
                        <ItemIconCanvas itemId={it.itemId} item={it} size={38} />
                        {it.count > 1 && <span className="gu-ic-n">{it.count}</span>}
                      </div>
                      <div className="gu-li-main">
                        <div className="gu-li-name">{it.nameRu}</div>
                        <div className="gu-li-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span>{getItemTotalWeight(it).toFixed(2)} кг · {getItemTotalVolume(it).toFixed(1)} л</span>
                          {isWet && (
                            <span style={{ color: '#7dd3fc', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <CloudRain width={12} height={12} /> {Math.round(it.wetness!)}%
                            </span>
                          )}
                          {isHotSurface && isWet && <span style={{ color: 'var(--gu-amber-hi)', fontWeight: 600 }}>Сушится…</span>}
                        </div>
                      </div>
                      {itemTemp >= 40 && <span className="gu-tag amber">+{Math.round(itemTemp)}°C</span>}
                      {itemTemp <= 4 && <span className="gu-tag cold">{Math.round(itemTemp)}°C</span>}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleTakeItem(idx, 1); }}
                        className="gu-btn gu-btn-s gu-btn-sm"
                        title="Забрать предмет в карманы"
                      >
                        {isRadiator ? 'Снять' : 'Забрать'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {selectedStorageIdx !== null && storage.items[selectedStorageIdx] && (
            <div className="gu-st-pick">
              <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                {storage.items[selectedStorageIdx].nameRu}
              </span>
              <div className="gu-row" style={{ gap: 6 }}>
                <button type="button" onClick={() => handleTakeToHand(selectedStorageIdx, 'left')} className="gu-btn gu-btn-s gu-btn-xs" title="Взять в левую руку">
                  <Hand width={13} height={13} /> Левая рука
                </button>
                <button type="button" onClick={() => handleTakeToHand(selectedStorageIdx, 'right')} className="gu-btn gu-btn-s gu-btn-xs" title="Взять в правую руку">
                  <Hand width={13} height={13} /> Правая рука
                </button>
                <button type="button" onClick={() => handleTakeItem(selectedStorageIdx)} className="gu-btn gu-btn-p gu-btn-xs">
                  <ArrowRight width={13} height={13} /> В карманы
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: the player's pockets */}
        <div className="gu-panel gu-pad">
          <div className="gu-st-head">
            <span className="gu-st-title">Инвентарь и карманы</span>
            <span className="gu-st-sub">
              {playerCarriedWt.toFixed(1)} кг · {playerPocketCap.usedVolumeL} / {playerPocketCap.totalCapacityL} л
            </span>
          </div>

          <div className="gu-pills" style={{ marginBottom: 14 }}>
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

          <div className="gu-st-scroll">
            <div className="gu-li-list">
              {filteredInventory.length === 0 ? (
                <div className="gu-empty">
                  <Package width={40} height={40} />
                  <div className="gu-empty-t">Нет подходящих предметов</div>
                  <div>В выбранной категории инвентаря пусто.</div>
                </div>
              ) : (
                filteredInventory.map(({ item, originalIndex }) => {
                  const isSelected = selectedInventoryIdx === originalIndex;
                  const isWet = (item.wetness ?? 0) > 0;
                  const itemTemp = item.surfaceTemperature ?? item.temperature ?? 20;
                  return (
                    <div
                      key={item.id || originalIndex}
                      onClick={() => { setSelectedInventoryIdx(originalIndex); setSelectedStorageIdx(null); }}
                      className={'gu-li' + (isSelected ? ' on' : '')}
                    >
                      <div className="gu-ic">
                        <ItemIconCanvas itemId={item.itemId} item={item} size={38} />
                        {item.count > 1 && <span className="gu-ic-n">{item.count}</span>}
                      </div>
                      <div className="gu-li-main">
                        <div className="gu-li-name">{item.nameRu}</div>
                        <div className="gu-li-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span>{getItemTotalWeight(item).toFixed(2)} кг · {getItemTotalVolume(item).toFixed(1)} л</span>
                          {isWet && (
                            <span style={{ color: '#7dd3fc', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <CloudRain width={12} height={12} /> {Math.round(item.wetness!)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {itemTemp >= 40 && <span className="gu-tag amber">+{Math.round(itemTemp)}°C</span>}
                      {itemTemp <= 4 && <span className="gu-tag cold">{Math.round(itemTemp)}°C</span>}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleStoreItem(originalIndex, 1); }}
                        className="gu-btn gu-btn-p gu-btn-sm"
                        title={isRadiator ? 'Положить на батарею' : 'Положить в хранилище'}
                      >
                        <ArrowLeft width={14} height={14} /> {isRadiator ? 'На батарею' : 'В шкаф'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

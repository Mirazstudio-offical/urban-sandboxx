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
  getPlayerCompartments,
  putItemInHand,
  addPlayerNotification
} from '../items';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ModalShell } from './gameUi';
import { sound } from '../audio';
import { 
  Snowflake, 
  Weight, 
  ArrowRight, 
  ArrowLeft, 
  Hand, 
  Package, 
  Info,
  Flame,
  CloudRain,
  User,
  Shirt,
  Luggage
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

  const compartments = getPlayerCompartments(player);
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
            {storage.items.length === 0 && (
              <div className="gu-empty" style={{ padding: '14px 0 18px' }}>
                {isRadiator ? (
                  <div>На батарее ничего не сушится. Положите сюда мокрую одежду, обувь или напитки.</div>
                ) : (
                  <div>Хранилище пусто. Выберите предмет в инвентаре справа.</div>
                )}
              </div>
            )}
            <div className="gu-slots">
              {Array.from({ length: Math.max(24, storage.items.length + 6) }, (_, idx) => {
                const it = storage.items[idx];
                if (!it) return <div key={'e' + idx} className="gu-slot empty" />;
                const itemTemp = it.surfaceTemperature ?? it.temperature ?? 20;
                const isHot = itemTemp >= 40;
                const isCold = itemTemp <= 4;
                return (
                  <div
                    key={it.id || idx}
                    onClick={() => { setSelectedStorageIdx(idx); setSelectedInventoryIdx(null); }}
                    onDoubleClick={() => handleTakeItem(idx, 1)}
                    className={'gu-slot' + (selectedStorageIdx === idx ? ' on' : '') + (isHot ? ' hot' : '') + (isCold ? ' cold' : '')}
                    title={`${it.nameRu}\n${getItemTotalWeight(it).toFixed(2)} кг · ${getItemTotalVolume(it).toFixed(1)} л`}
                  >
                    <ItemIconCanvas itemId={it.itemId} item={it} size={44} />
                    {it.count > 1 && <span className="gu-ic-n">{it.count}</span>}
                    {isHot && <span className="gu-slot-t">+{Math.round(itemTemp)}°</span>}
                    {isCold && <span className="gu-slot-t cold">{Math.round(itemTemp)}°</span>}
                    {(it.wetness ?? 0) > 0 && <span className="gu-slot-wet"><CloudRain width={11} height={11} /></span>}
                  </div>
                );
              })}
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
            {compartments.map(comp => {
              const slots = Array.from({ length: comp.slotCount }, (_, l) => comp.startIndex + l);
              const CompIcon = comp.iconType === 'user' ? User : comp.iconType === 'shirt' ? Shirt : Luggage;
              return (
                <div key={comp.id} className="gu-group">
                  <div className="gu-group-h">
                    <span className="gu-group-t"><CompIcon width={16} height={16} />{comp.nameRu}</span>
                    <span className="gu-grp-meta">{comp.usedVolumeL}/{comp.capacityL} л · {comp.usedWeightKg}/{comp.maxWeightKg} кг</span>
                  </div>
                  <div className="gu-slots">
                    {slots.map(slotIdx => {
                      const item = (player.inventory || [])[slotIdx];
                      if (!item) return <div key={slotIdx} className="gu-slot empty" />;
                      const itemTemp = item.surfaceTemperature ?? item.temperature ?? 20;
                      const isHot = itemTemp >= 40;
                      const isCold = itemTemp <= 4;
                      const matches = selectedCategory === 'all' || item.category === selectedCategory;
                      return (
                        <div
                          key={slotIdx}
                          onClick={() => { setSelectedInventoryIdx(slotIdx); setSelectedStorageIdx(null); }}
                          onDoubleClick={() => handleStoreItem(slotIdx, 1)}
                          className={'gu-slot' + (selectedInventoryIdx === slotIdx ? ' on' : '') + (matches ? '' : ' dim') + (isHot ? ' hot' : '') + (isCold ? ' cold' : '')}
                          title={`${item.nameRu}\n${getItemTotalWeight(item).toFixed(2)} кг · ${getItemTotalVolume(item).toFixed(1)} л`}
                        >
                          <ItemIconCanvas itemId={item.itemId} item={item} size={44} />
                          {item.count > 1 && <span className="gu-ic-n">{item.count}</span>}
                          {isHot && <span className="gu-slot-t">+{Math.round(itemTemp)}°</span>}
                          {isCold && <span className="gu-slot-t cold">{Math.round(itemTemp)}°</span>}
                          {(item.wetness ?? 0) > 0 && <span className="gu-slot-wet"><CloudRain width={11} height={11} /></span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedInventoryIdx !== null && (player.inventory || [])[selectedInventoryIdx] && (
            <div className="gu-st-pick">
              <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                {(player.inventory || [])[selectedInventoryIdx]!.nameRu}
              </span>
              <button type="button" onClick={() => handleStoreItem(selectedInventoryIdx)} className="gu-btn gu-btn-p gu-btn-xs">
                <ArrowLeft width={13} height={13} /> {isRadiator ? 'На батарею' : 'В шкаф'}
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

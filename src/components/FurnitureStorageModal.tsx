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
  takeItemFromHand,
  addPlayerNotification
} from '../items';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ModalShell } from './gameUi';
import { sound } from '../audio';
import {
  Snowflake,
  ArrowRight,
  ArrowLeft,
  Hand,
  Info,
  Flame,
  CloudRain,
  User,
  Shirt,
  Luggage
} from 'lucide-react';

function formatWeightRu(weightKg: number): string {
  if (!weightKg || weightKg <= 0) return '0 г';
  if (weightKg < 1) {
    const grams = weightKg < 0.01 ? Number((weightKg * 1000).toFixed(1)) : Math.round(weightKg * 1000);
    return `${grams} г`;
  }
  return `${Number(weightKg.toFixed(2))} кг`;
}

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

  const storage: FurnitureStorage | null =
    props.storage ||
    (props.buildingId && props.furnitureType
      ? getFurnitureStorage(
          props.buildingId,
          props.floor ?? 0,
          props.furnitureIndex ?? 0,
          props.furnitureType,
          props.aptId,
          props.customTitle
        )
      : null);

  const [selectedStorageIdx, setSelectedStorageIdx] = useState<number | null>(0);
  const [selectedInventoryIdx, setSelectedInventoryIdx] = useState<number | null>(null);
  const [selectedHand, setSelectedHand] = useState<'left' | 'right' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, forceRender] = useState(0);

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
    if (!player.inventory[itemIdx]) {
      setSelectedInventoryIdx(null);
    }
    sound.playPickup();
    addPlayerNotification(player, `Помещено ${isRadiator ? 'на батарею' : `в ${cfg.nameRu}`}: ${removed.nameRu} (×${removed.count})`, 'pickup');
    notifyChange();
  };

  // Store item directly from left or right hand
  const handleStoreFromHand = (hand: 'left' | 'right') => {
    setErrorMessage(null);
    const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!handItem) return;

    const check = canItemFitInFurniture(storage, handItem);
    if (!check.fits) {
      setErrorMessage(check.reason || 'Предмет не помещается в хранилище');
      sound.playUseItem();
      return;
    }

    const taken = takeItemFromHand(player, hand);
    if (!taken) return;

    addItemToFurnitureStorage(storage, taken, taken.count);
    setSelectedHand(null);
    sound.playPickup();
    addPlayerNotification(player, `Помещено ${isRadiator ? 'на батарею' : `в ${cfg.nameRu}`}: ${taken.nameRu}`, 'pickup');
    notifyChange();
  };

  // Take item from furniture storage into player pockets
  const handleTakeItem = (storageIdx: number, countToTake?: number) => {
    setErrorMessage(null);
    if (!storage.items || storageIdx < 0 || storageIdx >= storage.items.length) return;
    const targetItem = storage.items[storageIdx];
    if (!targetItem) return;

    const count = countToTake ?? targetItem.count;
    const removed = removeItemFromFurnitureStorage(storage, storageIdx, count);
    if (!removed) return;

    const added = addItemToPlayer(player, removed, { preferPockets: true, skipHands: true });
    if (!added) {
      storage.items.splice(Math.min(storageIdx, storage.items.length), 0, removed);
      setErrorMessage('В карманах недостаточно места — попробуйте взять в левую или правую руку');
      sound.playUseItem();
      return;
    }

    if (storage.items.length === 0) {
      setSelectedStorageIdx(null);
    } else if (storageIdx >= storage.items.length) {
      setSelectedStorageIdx(storage.items.length - 1);
    }

    sound.playPickup();
    addPlayerNotification(player, `Взято ${isRadiator ? 'с батареи' : `из ${cfg.nameRu}`}: ${removed.nameRu} (×${removed.count})`, 'pickup');
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
      storage.items.splice(Math.min(storageIdx, storage.items.length), 0, removed);
      setErrorMessage(res.message);
      return;
    }

    if (storage.items.length === 0) {
      setSelectedStorageIdx(null);
    } else if (storageIdx >= storage.items.length) {
      setSelectedStorageIdx(storage.items.length - 1);
    }

    sound.playPickup();
    addPlayerNotification(player, `Взято в ${hand === 'left' ? 'левую' : 'правую'} руку: ${removed.nameRu}`, 'pickup');
    notifyChange();
  };

  const compartments = getPlayerCompartments(player);

  const selectedStorageItem =
    selectedStorageIdx !== null && storage.items[selectedStorageIdx] ? storage.items[selectedStorageIdx] : null;
  const selectedPlayerItem: InventoryItem | null =
    selectedHand === 'left'
      ? player.leftHandItem || null
      : selectedHand === 'right'
      ? player.rightHandItem || null
      : selectedInventoryIdx !== null && player.inventory?.[selectedInventoryIdx]
      ? player.inventory[selectedInventoryIdx]!
      : null;

  const renderItemMetaLine = (it: InventoryItem) => {
    const temp = it.surfaceTemperature ?? it.temperature;
    const wet = Math.round(it.wetness ?? 0);
    return (
      <span className="gu-mut gu-mono" style={{ fontSize: 11 }}>
        {it.count > 1 ? `×${it.count} шт. · ` : ''}
        {formatWeightRu(getItemTotalWeight(it))} · {getItemTotalVolume(it)} л
        {temp !== undefined && (
          <span style={{ color: temp >= 40 ? '#efa690' : temp <= 4 ? '#7dd3fc' : 'var(--gu-ink-dim)' }}>
            {' · '}{temp > 0 ? '+' : ''}{Math.round(temp)}°C
          </span>
        )}
        {wet > 0 && (
          <span style={{ color: '#7dd3fc' }}>{' · '}Влага {wet}%</span>
        )}
      </span>
    );
  };

  return (
    <ModalShell
      id="furniture-storage-modal"
      title={storage.customTitle || cfg.nameRu}
      subtitle={
        isRadiator
          ? `Поверхность радиатора · ${storage.items.length} предм. сушится`
          : `Хранилище · ${storage.items.length} предм. внутри`
      }
      width={1060}
      tall
      onClose={onClose}
      headRight={
        <div className="gu-row" style={{ gap: 8 }}>
          {cfg.isCold && (
            <span className="gu-tag cold">
              <Snowflake width={12} height={12} /> Охлаждение (+4°C)
            </span>
          )}
          {isHotSurface && (
            <span className="gu-tag amber">
              <Flame width={12} height={12} /> Нагрев (+{cfg.heatingTemp || 65}°C)
            </span>
          )}
        </div>
      }
      footerHints={[['Клик', 'Выбрать'], ['2× Клик', 'Переместить 1 шт.'], ['Esc', 'Закрыть']]}
      footerRight={
        <button type="button" onClick={onClose} className="gu-btn gu-btn-s gu-btn-sm">
          Готово
        </button>
      }
    >
      {errorMessage && (
        <div
          className="gu-note gu-err"
          style={{ flex: 'none', padding: '6px 10px', fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Info width={14} height={14} />
            <span>{errorMessage}</span>
          </span>
          <button type="button" onClick={() => setErrorMessage(null)} className="gu-btn gu-btn-ghost gu-btn-xs">
            Скрыть
          </button>
        </div>
      )}

      <div className="gu-st-split">
        {/* LEFT PANEL: what is inside the furniture */}
        <div className="gu-panel gu-st-col">
          <div className="gu-st-head" style={{ marginBottom: 0 }}>
            <span className="gu-st-title" style={{ fontSize: 16 }}>
              {isRadiator ? 'Поверхность радиатора' : 'Содержимое хранилища'}
            </span>
            <span className="gu-st-sub gu-mono" style={{ fontSize: 12 }}>
              {storage.items.length} предм.
            </span>
          </div>

          <div className="gu-meters" style={{ flex: 'none', marginBottom: 0, gap: 12 }}>
            <div className="gu-meter">
              <div className="gu-meter-h" style={{ fontSize: 12, marginBottom: 4 }}>
                <span>{isRadiator ? 'Площадь' : 'Объём'}</span>
                <b>{storageTotalVol.toFixed(1)} / {cfg.capacityL.toFixed(1)} л</b>
              </div>
              <div className={`gu-bar ${volPercent > 90 ? 'bad' : ''}`}>
                <span style={{ width: volPercent > 0 ? `${Math.max(2, volPercent)}%` : '0%' }} />
              </div>
            </div>
            <div className="gu-meter">
              <div className="gu-meter-h" style={{ fontSize: 12, marginBottom: 4 }}>
                <span>Нагрузка</span>
                <b>{storageTotalWt.toFixed(1)} / {cfg.maxWeightKg.toFixed(1)} кг</b>
              </div>
              <div className={`gu-bar ${wtPercent > 90 ? 'bad' : 'good'}`}>
                <span style={{ width: wtPercent > 0 ? `${Math.max(2, wtPercent)}%` : '0%' }} />
              </div>
            </div>
          </div>

          <div className="gu-st-scroll">
            {storage.items.length === 0 && (
              <div className="gu-mut" style={{ fontSize: 12.5, padding: '6px 0 8px' }}>
                {isRadiator
                  ? 'На батарее ничего не сушится. Выберите мокрую одежду, обувь или предмет справа.'
                  : 'Хранилище пусто. Выберите предмет в руках или карманах справа.'}
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
                    onClick={() => {
                      setSelectedStorageIdx(idx);
                      setSelectedInventoryIdx(null);
                      setSelectedHand(null);
                    }}
                    onDoubleClick={() => handleTakeItem(idx, 1)}
                    className={'gu-slot' + (selectedStorageIdx === idx ? ' on' : '') + (isHot ? ' hot' : '') + (isCold ? ' cold' : '')}
                    title={`${it.nameRu}\n${formatWeightRu(getItemTotalWeight(it))} · ${getItemTotalVolume(it)} л`}
                  >
                    <ItemIconCanvas itemId={it.itemId} item={it} size={40} />
                    {it.count > 1 && <span className="gu-ic-n">{it.count}</span>}
                    {isHot && <span className="gu-slot-t">+{Math.round(itemTemp)}°</span>}
                    {isCold && <span className="gu-slot-t cold">{Math.round(itemTemp)}°</span>}
                    {(it.wetness ?? 0) > 0 && <span className="gu-slot-wet"><CloudRain width={11} height={11} /></span>}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedStorageItem && selectedStorageIdx !== null && (
            <div className="gu-st-pick">
              <div className="gu-row2" style={{ gap: 8, minWidth: 0 }}>
                <div className="gu-ic" style={{ width: 34, height: 34 }}>
                  <ItemIconCanvas itemId={selectedStorageItem.itemId} item={selectedStorageItem} size={26} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedStorageItem.nameRu}
                  </div>
                  {renderItemMetaLine(selectedStorageItem)}
                </div>
              </div>

              <div className="gu-grid gu-g3" style={{ gap: 5 }}>
                <button
                  type="button"
                  onClick={() => handleTakeToHand(selectedStorageIdx, 'left')}
                  disabled={!!player.leftHandItem}
                  className="gu-btn gu-btn-s gu-btn-xs"
                  title="Взять в левую руку"
                >
                  <Hand width={12} height={12} /> В левую
                </button>
                <button
                  type="button"
                  onClick={() => handleTakeToHand(selectedStorageIdx, 'right')}
                  disabled={!!player.rightHandItem}
                  className="gu-btn gu-btn-s gu-btn-xs"
                  title="Взять в правую руку"
                >
                  <Hand width={12} height={12} /> В правую
                </button>
                <button
                  type="button"
                  onClick={() => handleTakeItem(selectedStorageIdx, selectedStorageItem.count > 1 ? 1 : selectedStorageItem.count)}
                  className="gu-btn gu-btn-p gu-btn-xs"
                >
                  <ArrowRight width={12} height={12} /> {selectedStorageItem.count > 1 ? 'В карман (1)' : 'В карманы'}
                </button>
              </div>
              {selectedStorageItem.count > 1 && (
                <button
                  type="button"
                  onClick={() => handleTakeItem(selectedStorageIdx, selectedStorageItem.count)}
                  className="gu-btn gu-btn-s gu-btn-xs gu-btn-block"
                >
                  <ArrowRight width={12} height={12} /> Забрать все (×{selectedStorageItem.count} шт.) в карманы
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: player's active hands & pockets */}
        <div className="gu-panel gu-st-col">
          <div className="gu-st-head" style={{ marginBottom: 0 }}>
            <span className="gu-st-title" style={{ fontSize: 16 }}>Инвентарь игрока</span>
            <span className="gu-st-sub gu-mono" style={{ fontSize: 12 }}>
              {playerCarriedWt.toFixed(1)} кг · {playerPocketCap.usedVolumeL}/{playerPocketCap.totalCapacityL} л
            </span>
          </div>

          {/* Active Hands Strip */}
          <div className="gu-grid gu-g2" style={{ flex: 'none', gap: 6 }}>
            {(['left', 'right'] as const).map(hand => {
              const hItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
              const isSelected = selectedHand === hand;
              return (
                <div
                  key={hand}
                  onClick={() => {
                    if (!hItem) return;
                    setSelectedHand(hand);
                    setSelectedInventoryIdx(null);
                    setSelectedStorageIdx(null);
                  }}
                  className={'gu-hand' + (hItem ? ' full' : '') + (isSelected ? ' on' : '')}
                  style={{
                    cursor: hItem ? 'pointer' : 'default',
                    borderColor: isSelected ? 'var(--gu-amber)' : undefined,
                    background: isSelected ? 'rgba(201, 146, 43, 0.14)' : undefined
                  }}
                >
                  <div className="gu-slot" style={{ cursor: hItem ? 'pointer' : 'default' }}>
                    {hItem ? <ItemIconCanvas itemId={hItem.itemId} item={hItem} size={34} /> : <Hand width={18} height={18} />}
                  </div>
                  <div className="gu-li-main">
                    <div className="gu-li-sub" style={{ marginTop: 0 }}>{hand === 'left' ? 'Левая рука' : 'Правая рука'}</div>
                    <div className="gu-li-name">{hItem ? hItem.nameRu : 'Свободна'}</div>
                  </div>
                  {hItem && (
                    <button
                      type="button"
                      className="gu-btn gu-btn-p gu-btn-xs"
                      style={{ height: 26, padding: '0 7px', fontSize: 11 }}
                      title={isRadiator ? 'Положить на батарею' : 'Убрать в хранилище'}
                      onClick={e => {
                        e.stopPropagation();
                        handleStoreFromHand(hand);
                      }}
                    >
                      <ArrowLeft width={12} height={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="gu-pills" style={{ flex: 'none', marginBottom: 0 }}>
            {(['all', 'clothing', 'food', 'drink', 'tool', 'valuable', 'misc'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`gu-pill ${selectedCategory === cat ? 'on' : ''}`}
                style={{ height: 26, padding: '0 9px', fontSize: 12 }}
              >
                {cat === 'all'
                  ? 'Все'
                  : cat === 'clothing'
                  ? 'Одежда'
                  : cat === 'food'
                  ? 'Еда'
                  : cat === 'drink'
                  ? 'Напитки'
                  : cat === 'tool'
                  ? 'Инструменты'
                  : cat === 'valuable'
                  ? 'Ценности'
                  : 'Разное'}
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
                    <span className="gu-group-t"><CompIcon width={15} height={15} />{comp.nameRu}</span>
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
                      const isSel = selectedHand === null && selectedInventoryIdx === slotIdx;
                      return (
                        <div
                          key={slotIdx}
                          onClick={() => {
                            setSelectedInventoryIdx(slotIdx);
                            setSelectedHand(null);
                            setSelectedStorageIdx(null);
                          }}
                          onDoubleClick={() => handleStoreItem(slotIdx, 1)}
                          className={'gu-slot' + (isSel ? ' on' : '') + (matches ? '' : ' dim') + (isHot ? ' hot' : '') + (isCold ? ' cold' : '')}
                          title={`${item.nameRu}\n${formatWeightRu(getItemTotalWeight(item))} · ${getItemTotalVolume(item)} л`}
                        >
                          <ItemIconCanvas itemId={item.itemId} item={item} size={40} />
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

          {selectedPlayerItem && (
            <div className="gu-st-pick">
              <div className="gu-row2" style={{ gap: 8, minWidth: 0 }}>
                <div className="gu-ic" style={{ width: 34, height: 34 }}>
                  <ItemIconCanvas itemId={selectedPlayerItem.itemId} item={selectedPlayerItem} size={26} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedPlayerItem.nameRu}
                  </div>
                  {renderItemMetaLine(selectedPlayerItem)}
                </div>
              </div>

              {selectedHand ? (
                <button
                  type="button"
                  onClick={() => handleStoreFromHand(selectedHand)}
                  className="gu-btn gu-btn-p gu-btn-xs gu-btn-block"
                >
                  <ArrowLeft width={12} height={12} /> {isRadiator ? 'Положить на батарею' : 'Убрать из руки в хранилище'}
                </button>
              ) : selectedInventoryIdx !== null ? (
                <div className="gu-grid" style={{ gridTemplateColumns: selectedPlayerItem.count > 1 ? '1fr 1fr' : '1fr', gap: 5 }}>
                  <button
                    type="button"
                    onClick={() => handleStoreItem(selectedInventoryIdx, 1)}
                    className="gu-btn gu-btn-p gu-btn-xs gu-btn-block"
                  >
                    <ArrowLeft width={12} height={12} /> {isRadiator ? 'На батарею (1)' : selectedPlayerItem.count > 1 ? 'Убрать 1 шт.' : 'В хранилище'}
                  </button>
                  {selectedPlayerItem.count > 1 && (
                    <button
                      type="button"
                      onClick={() => handleStoreItem(selectedInventoryIdx, selectedPlayerItem.count)}
                      className="gu-btn gu-btn-s gu-btn-xs gu-btn-block"
                    >
                      <ArrowLeft width={12} height={12} /> Убрать все (×{selectedPlayerItem.count})
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};


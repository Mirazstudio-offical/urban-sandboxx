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
  const [, setSelectedContainerItemIdx] = useState<number>(0);
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

  const selectedEntry = inventory[selectedIndex]
    ? { item: inventory[selectedIndex], originalIndex: selectedIndex }
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
    ...(player.inventory || []).filter(i => i && i.isContainer),
    ...(player.leftHandItem && player.leftHandItem.isContainer ? [player.leftHandItem] : []),
    ...(player.rightHandItem && player.rightHandItem.isContainer ? [player.rightHandItem] : []),
    ...(player.equippedClothing?.back?.outerwear?.isContainer ? [player.equippedClothing.back.outerwear] : [])
  ];

  const renderHandCard = (hand: 'left' | 'right', label: string, handItem: InventoryItem | null | undefined) => (
    <div id={`inv-${hand}-hand-card`} className="gu-card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div className="gu-row2" style={{ minWidth: 0, gap: 10 }}>
        <div className={'gu-ico' + (handItem ? '' : ' gu-off')} style={{ width: 38, height: 38 }}>
          {handItem ? (
            <ItemIconCanvas itemId={handItem.itemId} item={handItem} size={26} />
          ) : (
            <Hand width={17} height={17} />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="gu-cn gu-mut" style={{ fontSize: 11 }}>{label}</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {handItem ? handItem.nameRu : 'Свободна'}
          </div>
          {handItem && (
            <div className="gu-row2 gu-wrap" style={{ gap: 6, fontSize: 11, color: 'var(--gu-mut)' }}>
              <span>{getItemTotalWeight(handItem)} кг · {getItemTotalVolume(handItem)} л</span>
              {handItem.surfaceTemperature !== undefined && (
                <span className={'gu-tag ' + (handItem.surfaceTemperature >= 52 ? 'bad' : handItem.surfaceTemperature <= 4 ? 'cold' : 'amber')}>
                  {handItem.surfaceTemperature >= 52 ? <Flame width={10} height={10} /> : <Thermometer width={10} height={10} />}
                  {handItem.surfaceTemperature > 0 ? '+' : ''}{handItem.surfaceTemperature.toFixed(1)}°C
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {handItem && (
        <div className="gu-row2 gu-wrap" style={{ gap: 4, justifyContent: 'flex-end', flexShrink: 0 }}>
          {handItem.clothingStats && (
            <button type="button" className="gu-btn gu-btn-p gu-btn-xs" onClick={() => handleEquipFromHand(hand)}>
              Надеть
            </button>
          )}
          {handItem.isContainer && (
            <button
              type="button"
              className="gu-btn gu-btn-p gu-btn-xs"
              onClick={() => { setOpenContainer(handItem); setSelectedContainerItemIdx(0); }}
            >
              Открыть
            </button>
          )}
          <button type="button" className="gu-btn gu-btn-s gu-btn-xs" onClick={() => handleStowHand(hand)}>
            В карман
          </button>
          <button type="button" className="gu-btn gu-btn-d gu-btn-xs" onClick={() => handleDropFromHand(hand)}>
            Бросить
          </button>
        </div>
      )}
    </div>
  );

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
            <strong style={{ color: '#fff' }}>{carriedWeight} кг</strong>
          </div>
          <div className="gu-chip">
            <span className="gu-mut">Скорость:</span>
            <strong style={{ color: weightSpeedPct >= 95 ? '#9ac985' : weightSpeedPct >= 70 ? '#f0c264' : '#efa690' }}>
              {weightSpeedPct}%{isBulkyHand ? ' (Груз)' : ''}
            </strong>
          </div>
          <div className="gu-chip">
            <span className="gu-mut">Карманы:</span>
            <strong style={{ color: '#e0ab45' }}>{pocketCap.usedVolumeL} / {pocketCap.totalCapacityL} л</strong>
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
                { id: 'all', label: 'Все', icon: Package },
                { id: 'food', label: 'Еда', icon: Utensils },
                { id: 'drink', label: 'Напитки', icon: Droplets },
                { id: 'med', label: 'Медицина', icon: Heart },
                { id: 'tool', label: 'Инструменты', icon: Zap },
                { id: 'valuable', label: 'Ценности', icon: Coins }
              ].map(cat => {
                const IconComp = cat.icon;
                const on = selectedCategory === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    id={`filter-cat-${cat.id}`}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={'gu-pill' + (on ? ' on' : '')}
                  >
                    <IconComp width={13} height={13} />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

              {/* Active Hands */}
              <div className="gu-panel gu-pad" style={{ padding: '10px 12px' }}>
                <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="gu-grp">Активные руки</span>
                  <span className="gu-mut gu-hide-s" style={{ fontSize: 11 }}>Отображаются на персонаже · Клавиша E для действия</span>
                </div>
                <div className="gu-grid gu-g2">
                  {renderHandCard('left', 'Левая рука', player.leftHandItem)}
                  {renderHandCard('right', 'Правая рука', player.rightHandItem)}
                </div>
              </div>

              {/* Clothing Compartments */}
              {compartments.map(comp => {
                const getCompIcon = (type: string, size = 15) => {
                  if (type === 'user') return <User width={size} height={size} />;
                  if (type === 'shirt') return <Shirt width={size} height={size} />;
                  if (type === 'pants')
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 3h12l1 18-5-1-2-9-2 9-5 1z" />
                      </svg>
                    );
                  return <Luggage width={size} height={size} />;
                };

                const compVolumePct = Math.min(100, Math.round((comp.usedVolumeL / comp.capacityL) * 100));
                const compWeightPct = Math.min(100, Math.round((comp.usedWeightKg / comp.maxWeightKg) * 100));

                return (
                  <div key={comp.id} className="gu-panel gu-pad" style={{ padding: '14px 16px' }}>
                    <div className="gu-row2 gu-wrap" style={{ justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--gu-line)' }}>
                      <div className="gu-row2" style={{ gap: 10 }}>
                        <div className="gu-ico" style={{ width: 34, height: 34 }}>
                          {getCompIcon(comp.iconType, 16)}
                        </div>
                        <div>
                          <div className="gu-row2" style={{ gap: 8 }}>
                            <span className="gu-cn" style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                              {comp.nameRu}
                            </span>
                            {comp.sourceItemNameRu && comp.id !== 'base' && (
                              <span className="gu-tag amber">«{comp.sourceItemNameRu}»</span>
                            )}
                          </div>
                          <div className="gu-mut" style={{ fontSize: 12 }}>
                            Вместимость: {comp.capacityL} л · Макс. предмет: {comp.maxItemVolumeL} л
                          </div>
                        </div>
                      </div>

                      <div className="gu-row2" style={{ gap: 6 }}>
                        <span className={'gu-tag ' + (compVolumePct > 90 ? 'bad' : '')}>
                          Объём: {comp.usedVolumeL}/{comp.capacityL} л
                        </span>
                        <span className={'gu-tag ' + (compWeightPct > 90 ? 'bad' : '')}>
                          Вес: {comp.usedWeightKg}/{comp.maxWeightKg} кг
                        </span>
                        <span className="gu-tag amber">{comp.slotCount} сл.</span>
                      </div>
                    </div>

                    <div className="gu-slot-grid">
                      {Array.from({ length: comp.slotCount }).map((_, localIdx) => {
                        const slotIdx = comp.startIndex + localIdx;
                        const item = inventory[slotIdx];
                        const isSelected = selectedIndex === slotIdx;
                        const isHotbar = slotIdx < 6;
                        const isMatch = matchesFilter(item);
                        const isDimmed = selectedCategory !== 'all' && item && !isMatch;

                        const cls =
                          'gu-slot' +
                          (!item ? ' empty' : '') +
                          (isSelected && item ? ' on' : '') +
                          (isDimmed ? ' dim' : '');

                        return (
                          <div
                            key={slotIdx}
                            id={`inventory-slot-${slotIdx}`}
                            draggable={!!item}
                            onDragStart={e => {
                              if (item) e.dataTransfer.setData('text/plain', slotIdx.toString());
                            }}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
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
                            className={cls}
                          >
                            {isHotbar && <span className="gu-slot-num">{slotIdx + 1}</span>}
                            <div className="gu-slot-mark" title={`${comp.nameRu} (Слот #${slotIdx + 1})`}>
                              {getCompIcon(comp.iconType, 11)}
                            </div>

                            {item && (
                              <>
                                <ItemIconCanvas itemId={item.itemId} item={item} size={36} />
                                {item.surfaceTemperature !== undefined && item.surfaceTemperature >= 52 && (
                                  <span
                                    style={{ position: 'absolute', top: 5, left: isHotbar ? 26 : 6, color: '#f0c264' }}
                                    title={`Горячо! Снаружи: ${item.surfaceTemperature}°C`}
                                  >
                                    <Flame width={12} height={12} />
                                  </span>
                                )}
                                {item.count > 1 && <span className="gu-slot-cnt">{item.count}</span>}
                                {item.isContainer && <span className="gu-slot-sub">{item.contents?.length || 0}</span>}
                                {item.fluidStorage ? (
                                  <div className="gu-slot-fill">
                                    <i
                                      style={{
                                        width: `${Math.max(
                                          0,
                                          Math.min(100, (item.fluidStorage.currentMl / (item.fluidStorage.maxMl || 1)) * 100)
                                        )}%`
                                      }}
                                    />
                                  </div>
                                ) : item.maxPortions && item.maxPortions > 1 ? (
                                  <div className="gu-slot-fill">
                                    <i
                                      style={{
                                        width: `${Math.max(
                                          0,
                                          Math.min(100, ((item.portions ?? item.maxPortions) / item.maxPortions) * 100)
                                        )}%`
                                      }}
                                    />
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Standalone Carried Containers */}
              {(() => {
                const pocketContainers = (player.inventory || []).filter(i => i && i.isContainer);
                const handContainers = [player.leftHandItem, player.rightHandItem].filter(
                  i => i && i.isContainer
                ) as InventoryItem[];
                const allContainers: { item: InventoryItem; source: string }[] = [];

                pocketContainers.forEach(c => allContainers.push({ item: c, source: 'В карманах' }));
                handContainers.forEach(c => allContainers.push({ item: c, source: 'В руке' }));

                if (allContainers.length === 0) return null;

                return (
                  <div className="gu-panel gu-pad" style={{ padding: '14px 16px' }}>
                    <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                      <span className="gu-grp">Отдельные хранилища и кошельки ({allContainers.length})</span>
                      <span className="gu-mut" style={{ fontSize: 12 }}>Нажмите «Открыть» для содержимого</span>
                    </div>

                    <div className="gu-grid gu-g2">
                      {allContainers.map((entry, cIdx) => {
                        const cItem = entry.item;
                        const count = cItem.contents?.length || 0;
                        const maxVol = cItem.containerCapacityL || 20;
                        const curVol = (cItem.contents || []).reduce((acc, it) => acc + getItemTotalVolume(it), 0);

                        return (
                          <div key={cIdx} className="gu-card" style={{ flexDirection: 'row', alignItems: 'center', padding: '10px 12px' }}>
                            <div className="gu-row2" style={{ minWidth: 0, gap: 10 }}>
                              <div className="gu-ico" style={{ width: 40, height: 40 }}>
                                <ItemIconCanvas itemId={cItem.itemId} item={cItem} size={26} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div className="gu-cn" style={{ fontSize: 11, color: 'var(--gu-amber-hi)' }}>{entry.source}</div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {cItem.nameRu}
                                </div>
                                <div className="gu-mut" style={{ fontSize: 12 }}>
                                  {count} предм. · {curVol.toFixed(1)} / {maxVol} л
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="gu-btn gu-btn-p gu-btn-sm"
                              onClick={() => {
                                setOpenContainer(cItem);
                                setSelectedContainerItemIdx(0);
                              }}
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

            {/* RIGHT: ITEM DETAILS & ACTIONS */}
            <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedEntry && selectedEntry.item ? (
                <>
                  {/* Item Header */}
                  <div className="gu-row2" style={{ alignItems: 'flex-start', gap: 12 }}>
                    <div className="gu-ico" style={{ width: 54, height: 54, borderRadius: 10 }}>
                      <ItemIconCanvas itemId={selectedEntry.item.itemId} item={selectedEntry.item} size={42} />
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
                        <span className="gu-mut" style={{ fontSize: 12 }}>
                          ×{selectedEntry.item.count} шт. · {getItemTotalWeight(selectedEntry.item)} кг ·{' '}
                          <strong style={{ color: 'var(--gu-amber-hi)' }}>{getItemTotalVolume(selectedEntry.item)} л</strong>
                        </span>
                      </div>
                      <div className="gu-cn" style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                        {selectedEntry.item.nameRu}
                      </div>
                      {(() => {
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
                        onClick={() => handleEquipItem(selectedEntry.originalIndex)}
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
                          <span>Открыть контейнер ({selectedEntry.item.contents?.length || 0} предм.)</span>
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
                        onClick={() => handleUseItem(selectedEntry.originalIndex)}
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
                        onClick={() => handleUseItem(selectedEntry.originalIndex)}
                      >
                        <Utensils width={15} height={15} />
                        <span>Использовать</span>
                      </button>
                    ) : null}

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

                    {/* Stash into other container */}
                    {availableContainers.filter(cont => cont.id !== selectedEntry.item.id).length > 0 && (
                      <div className="gu-row2 gu-wrap" style={{ gap: 5 }}>
                        {availableContainers
                          .filter(cont => cont.id !== selectedEntry.item.id)
                          .map(cont => {
                            const check = canItemFitInContainer(cont, selectedEntry.item);
                            return (
                              <button
                                type="button"
                                key={cont.id}
                                onClick={() => handlePutIntoContainer(cont, selectedEntry.originalIndex)}
                                disabled={!check.fits}
                                className="gu-btn gu-btn-s gu-btn-xs"
                                title={check.fits ? `Положить ${selectedEntry.item.nameRu} в ${cont.nameRu}` : check.reason}
                              >
                                <ArrowDownToLine width={13} height={13} color="#c9922b" />
                                <span>В {cont.nameRu}</span>
                                {cont.contents && cont.contents.length > 0 && (
                                  <span style={{ color: 'var(--gu-amber-hi)' }}>({cont.contents.length})</span>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    )}

                    <div className="gu-row2" style={{ gap: 6 }}>
                      <button
                        type="button"
                        id="btn-drop-selected-item"
                        className="gu-btn gu-btn-d gu-btn-xs gu-btn-block"
                        onClick={() => handleDropItem(selectedEntry.originalIndex)}
                      >
                        <Trash2 width={13} height={13} />
                        <span>Выбросить 1 шт.</span>
                      </button>

                      {world && isPlayerNearTrashBin(player, world) && (
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

        {/* ==================== SUB-INVENTORY: CONTAINER VIEW ==================== */}
        {activeTab === 'inventory' && openContainer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ justifyContent: 'space-between' }}>
              <div className="gu-row2" style={{ gap: 14 }}>
                <button type="button" className="gu-btn gu-btn-s gu-btn-sm" onClick={() => setOpenContainer(null)}>
                  <ChevronLeft width={16} height={16} color="#c9922b" />
                  <span>Назад в карманы</span>
                </button>
                <div className="gu-ico" style={{ width: 46, height: 46 }}>
                  <ItemIconCanvas itemId={openContainer.itemId} item={openContainer} size={32} />
                </div>
                <div>
                  <div className="gu-row2" style={{ gap: 8 }}>
                    <span className="gu-cn" style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
                      {openContainer.nameRu}
                    </span>
                    <span className="gu-tag amber">Контейнер</span>
                  </div>
                  <div className="gu-mut" style={{ fontSize: 12 }}>
                    Вместимость: {openContainer.containerCapacityL} л · Макс. вес: {openContainer.maxContainedWeightKg} кг
                  </div>
                </div>
              </div>

              <div className="gu-row2" style={{ gap: 8 }}>
                <span className="gu-tag">Предметов: {openContainer.contents?.length || 0}</span>
                <span className="gu-tag amber">Объём: {getItemTotalVolume(openContainer)} л</span>
                <span className="gu-tag">Вес: {getItemTotalWeight(openContainer)} кг</span>
              </div>
            </div>

            {(openContainer.contents || []).length > 0 ? (
              <div className="gu-grid gu-g3">
                {openContainer.contents!.map((contItem, cIdx) => (
                  <div key={cIdx} className="gu-card">
                    <div className="gu-card-h">
                      <div className="gu-ico" style={{ width: 44, height: 44 }}>
                        <ItemIconCanvas itemId={contItem.itemId} item={contItem} size={30} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="gu-card-t">{contItem.nameRu}</div>
                        <div className="gu-mut" style={{ fontSize: 12, marginTop: 2 }}>
                          {contItem.count} шт. · {getItemTotalWeight(contItem)} кг · {getItemTotalVolume(contItem)} л
                        </div>
                      </div>
                    </div>

                    <div className="gu-card-a">
                      <button
                        type="button"
                        className="gu-btn gu-btn-p gu-btn-sm"
                        onClick={() => handleExtractFromContainer(openContainer, cIdx, 'pockets')}
                      >
                        <ArrowUpFromLine width={14} height={14} />
                        <span>В карман</span>
                      </button>
                      <button
                        type="button"
                        className="gu-btn gu-btn-s gu-btn-sm"
                        disabled={!!player.rightHandItem}
                        onClick={() => handleExtractFromContainer(openContainer, cIdx, 'rightHand')}
                      >
                        <Hand width={14} height={14} />
                        <span>В руку</span>
                      </button>
                      <button
                        type="button"
                        className="gu-btn gu-btn-d gu-btn-sm"
                        onClick={() => handleDropFromContainer(openContainer, cIdx)}
                      >
                        <Trash2 width={14} height={14} />
                        <span>Бросить</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gu-panel gu-empty">
                <Package width={38} height={38} color="#8f8b81" />
                <div className="gu-cn" style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Контейнер пуст</div>
                <div className="gu-mut" style={{ fontSize: 13 }}>
                  Выберите предметы ниже, чтобы быстро сложить их внутрь «{openContainer.nameRu}».
                </div>
              </div>
            )}

            {/* Quick Deposit Section */}
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
                <div className="gu-panel gu-pad">
                  <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="gu-grp">Положить предмет в {openContainer.nameRu}</span>
                    <span className="gu-mut" style={{ fontSize: 12 }}>Нажмите на предмет для перемещения</span>
                  </div>
                  <div className="gu-grid gu-g4">
                    {depositCandidates.map((cand, cIdx) => {
                      const check = canItemFitInContainer(openContainer, cand.item);
                      return (
                        <button
                          type="button"
                          key={cIdx}
                          disabled={!check.fits}
                          className="gu-card"
                          style={{ padding: '10px 12px', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}
                          title={check.fits ? `Положить ${cand.item.nameRu} в ${openContainer.nameRu}` : check.reason}
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
                        >
                          <div className="gu-ico" style={{ width: 36, height: 36 }}>
                            <ItemIconCanvas itemId={cand.item.itemId} item={cand.item} size={24} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cand.item.nameRu}
                            </div>
                            <div className="gu-mut" style={{ fontSize: 11 }}>
                              {getItemTotalVolume(cand.item)} л · {getItemTotalWeight(cand.item)} кг
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

        {/* ==================== TAB 2: SURROUNDINGS ==================== */}
        {activeTab === 'surroundings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
              <span className="gu-grp">Предметы и объекты поблизости (в радиусе 8 м)</span>
              <span className="gu-mut" style={{ fontSize: 13 }}>Найдено: {nearbyGroundItems.length}</span>
            </div>

            {nearbyGroundItems.length > 0 ? (
              <div className="gu-list">
                {nearbyGroundItems.map(gi => (
                  <div key={gi.id} className="gu-rw">
                    <div className="gu-ico" style={{ width: 44, height: 44 }}>
                      <ItemIconCanvas itemId={gi.item.itemId} item={gi.item} size={30} />
                    </div>
                    <div className="gu-grow">
                      <div className="gu-rw-t">{gi.item.nameRu}</div>
                      <div className="gu-rw-d">
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="gu-grp">Надетая одежда и вместимость карманов</div>
                <div className="gu-mut" style={{ fontSize: 13, marginTop: 2 }}>
                  Верхняя одежда, брюки и рюкзаки добавляют слоты и литраж карманов
                </div>
              </div>
              <div className="gu-row2" style={{ gap: 8 }}>
                <span className="gu-tag amber">
                  Объём карманов: {pocketCap.usedVolumeL} / {pocketCap.totalCapacityL} л
                </span>
              </div>
            </div>

            {Object.keys(player.equippedClothing || {}).length > 0 ? (
              <div className="gu-grid gu-g3">
                {Object.entries(player.equippedClothing || {}).map(([slot, layers]) => (
                  <div key={slot} className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="gu-grp">{slot}</div>
                    {Object.entries(layers).map(([layer, item]) => (
                      <div key={layer} className="gu-card" style={{ padding: 12 }}>
                        <div className="gu-row2" style={{ gap: 10 }}>
                          <div className="gu-ico" style={{ width: 42, height: 42 }}>
                            <ItemIconCanvas itemId={item.itemId} item={item} size={30} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.nameRu}
                            </div>
                            <div className="gu-mut" style={{ fontSize: 12 }}>Слой: {layer}</div>
                          </div>
                        </div>

                        {item.clothingStats && item.clothingStats.pocketCapacityL ? (
                          <div className="gu-kv" style={{ fontSize: 12 }}>
                            <span className="gu-kv-k">Карманы</span>
                            <span className="gu-kv-v" style={{ color: 'var(--gu-amber-soft)' }}>
                              +{item.clothingStats.pocketCapacityL} л (до {item.clothingStats.maxPocketWeightKg || 1.5} кг)
                            </span>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          className="gu-btn gu-btn-d gu-btn-sm gu-btn-block"
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

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
  getSlotCompartment,
  getCandyPackagingShapeNameRu
} from '../items';
import { getItemThermalDisplayInfo } from '../itemThermalSystem';
import { isFluidContainerClosed, openFluidContainerIfNeeded } from '../liquidSystem';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ModalShell, Tabs } from './gameUi';
import { sound } from '../audio';

function formatWeightRu(weightKg: number): string {
  if (!weightKg || weightKg <= 0) return '0 г';
  if (weightKg < 1) {
    const grams = weightKg < 0.01
      ? Number((weightKg * 1000).toFixed(1))
      : Math.round(weightKg * 1000);
    return `${grams} г`;
  }
  return `${Number(weightKg.toFixed(2))} кг`;
}
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
  Thermometer,
  CloudRain,
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

    if (item.isContainer && !item.singleUseContainer) {
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
    ...(player.inventory || []).filter(i => i && i.isContainer && !i.singleUseContainer && !i.tornItemId && !i.itemId.startsWith('paper_packaging')),
    ...(player.leftHandItem && player.leftHandItem.isContainer && !player.leftHandItem.singleUseContainer && !player.leftHandItem.tornItemId && !player.leftHandItem.itemId.startsWith('paper_packaging') ? [player.leftHandItem] : []),
    ...(player.rightHandItem && player.rightHandItem.isContainer && !player.rightHandItem.singleUseContainer && !player.rightHandItem.tornItemId && !player.rightHandItem.itemId.startsWith('paper_packaging') ? [player.rightHandItem] : []),
    ...(player.equippedClothing?.back?.outerwear?.isContainer ? [player.equippedClothing.back.outerwear] : [])
  ];

  const CLOTHING_SLOT_LABELS: Record<string, string> = {
    head: 'Голова',
    eyes: 'Глаза и очки',
    neck: 'Шея',
    torso: 'Торс и корпус',
    hands: 'Кисти и перчатки',
    legs: 'Ноги и брюки',
    feet: 'Обувь',
    back: 'Спина и рюкзак'
  };

  const CLOTHING_LAYER_LABELS: Record<string, string> = {
    underwear: 'Нижний слой',
    shirt: 'Рубашка / Кофта',
    sweater: 'Утепляющий слой',
    outerwear: 'Верхний слой',
    vest: 'Разгрузка / Жилет',
    accessory: 'Аксессуар'
  };

  const renderHandCard = (hand: 'left' | 'right', label: string, handItem: InventoryItem | null | undefined) => (
    <div id={`inv-${hand}-hand-card`} className={'gu-hand' + (handItem ? ' full' : '')}>
      <div className="gu-slot" style={{ cursor: 'default' }}>
        {handItem ? (
          <ItemIconCanvas itemId={handItem.itemId} item={handItem} size={44} />
        ) : (
          <Hand width={22} height={22} />
        )}
      </div>
      <div className="gu-li-main">
        <div className="gu-li-sub" style={{ marginTop: 0 }}>{label}</div>
        <div className="gu-li-name">{handItem ? handItem.nameRu : 'Свободна'}</div>
        {handItem && (
          <div className="gu-li-sub">
            {formatWeightRu(getItemTotalWeight(handItem))} · {getItemTotalVolume(handItem)} л
            {handItem.surfaceTemperature !== undefined && (
              <span style={{ marginLeft: 8, color: handItem.surfaceTemperature >= 52 ? '#efa690' : handItem.surfaceTemperature <= 4 ? '#7dd3fc' : 'var(--gu-amber-soft)' }}>
                {handItem.surfaceTemperature > 0 ? '+' : ''}{handItem.surfaceTemperature.toFixed(1)}°C
              </span>
            )}
          </div>
        )}
      </div>

      {handItem && (
        <div className="gu-hand-acts">
          {handItem.clothingStats && (
            <button type="button" className="gu-btn gu-btn-p gu-btn-xs" title="Надеть" onClick={() => handleEquipFromHand(hand)}>
              <Shirt width={14} height={14} />
            </button>
          )}
          {handItem.isContainer && (
            <button
              type="button"
              className="gu-btn gu-btn-p gu-btn-xs"
              title="Открыть"
              onClick={() => { setOpenContainer(handItem); setSelectedContainerItemIdx(0); }}
            >
              <Luggage width={14} height={14} />
            </button>
          )}
          <button type="button" className="gu-btn gu-btn-s gu-btn-xs" title="Убрать в карманы" onClick={() => handleStowHand(hand)}>
            <ArrowDownToLine width={14} height={14} />
          </button>
          <button type="button" className="gu-btn gu-btn-d gu-btn-xs" title="Бросить" onClick={() => handleDropFromHand(hand)}>
            <Trash2 width={14} height={14} />
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
            <strong className="gu-mono" style={{ color: '#fff' }}>{carriedWeight} кг</strong>
          </div>
          <div className="gu-chip">
            <span className="gu-mut">Скорость:</span>
            <strong className="gu-mono" style={{ color: weightSpeedPct >= 95 ? '#9ac985' : weightSpeedPct >= 70 ? '#f0c264' : '#efa690' }}>
              {weightSpeedPct}%{isBulkyHand ? ' (Груз)' : ''}
            </strong>
          </div>
          <div className="gu-chip">
            <span className="gu-mut">Карманы:</span>
            <strong className="gu-mono" style={{ color: '#e0ab45' }}>{pocketCap.usedVolumeL} / {pocketCap.totalCapacityL} л</strong>
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
                { id: 'all', label: 'Все' },
                { id: 'food', label: 'Еда' },
                { id: 'drink', label: 'Напитки' },
                { id: 'med', label: 'Медицина' },
                { id: 'tool', label: 'Инструменты' },
                { id: 'valuable', label: 'Ценности' }
              ].map(cat => {
                const on = selectedCategory === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    id={`filter-cat-${cat.id}`}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={'gu-pill' + (on ? ' on' : '')}
                  >
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="gu-grp">Активные руки</span>
                  <span className="gu-mut gu-hide-s" style={{ fontSize: 11 }}>Клавиша E — действие с предметом</span>
                </div>
                <div className="gu-grid gu-g2" style={{ gap: 8 }}>
                  {renderHandCard('left', 'Левая рука', player.leftHandItem)}
                  {renderHandCard('right', 'Правая рука', player.rightHandItem)}
                </div>
              </div>

              {/* Pockets / backpack: slot grid grouped by whose slots they are */}
              <div className="gu-panel gu-pad">
                {(() => {
                  const getCompIcon = (type: string, size = 16) => {
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

                  return compartments.map(comp => {
                    const slots = Array.from({ length: comp.slotCount }, (_, l) => comp.startIndex + l);
                    const compVolumePct = Math.round((comp.usedVolumeL / comp.capacityL) * 100);
                    const compWeightPct = Math.round((comp.usedWeightKg / comp.maxWeightKg) * 100);

                    return (
                      <div key={comp.id} className="gu-group">
                        <div className="gu-group-h">
                          <span className="gu-group-t">
                            {getCompIcon(comp.iconType)}
                            {comp.nameRu}
                          </span>
                          <span className="gu-grp-meta">
                            <span className={compVolumePct > 95 ? 'bad' : ''}>{comp.usedVolumeL}/{comp.capacityL} л</span>
                            {' · '}
                            <span className={compWeightPct > 95 ? 'bad' : ''}>{comp.usedWeightKg}/{comp.maxWeightKg} кг</span>
                          </span>
                        </div>

                        <div className="gu-slots">
                          {slots.map(slotIdx => {
                            const item = inventory[slotIdx];
                            const dropProps = {
                              onDragOver: (e: React.DragEvent) => e.preventDefault(),
                              onDrop: (e: React.DragEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                if (!isNaN(from) && from !== slotIdx) {
                                  moveInventoryItem(player, from, slotIdx);
                                  forceRender(n => n + 1);
                                }
                              }
                            };

                            if (!item) {
                              return <div key={slotIdx} id={`inventory-slot-${slotIdx}`} className="gu-slot empty" {...dropProps} />;
                            }

                            const temp = item.surfaceTemperature;
                            const isHot = temp !== undefined && temp >= 40;
                            const isCold = temp !== undefined && temp <= 4;
                            const fillPct = item.fluidStorage
                              ? Math.max(0, Math.min(100, (item.fluidStorage.currentMl / (item.fluidStorage.maxMl || 1)) * 100))
                              : item.maxPortions && item.maxPortions > 1
                              ? Math.max(0, Math.min(100, ((item.portions ?? item.maxPortions) / item.maxPortions) * 100))
                              : null;

                            return (
                              <div
                                key={slotIdx}
                                id={`inventory-slot-${slotIdx}`}
                                draggable
                                onDragStart={e => e.dataTransfer.setData('text/plain', slotIdx.toString())}
                                {...dropProps}
                                onClick={() => setSelectedIndex(slotIdx)}
                                onDoubleClick={() => {
                                  if (item.isContainer && !item.singleUseContainer && !((item.isOpen || item.itemId === 'pouch_sealed_snack_torn' || item.itemId === 'egg_carton_10_open' || item.itemId === 'lukoshko') && item.contents && item.contents.length > 0)) {
                                    setOpenContainer(item);
                                    setSelectedContainerItemIdx(0);
                                  } else {
                                    handleUseItem(slotIdx);
                                  }
                                }}
                                className={'gu-slot' + (selectedIndex === slotIdx ? ' on' : '') + (matchesFilter(item) ? '' : ' dim') + (isHot ? ' hot' : '') + (isCold ? ' cold' : '')}
                                title={`${item.nameRu}\n${formatWeightRu(getItemTotalWeight(item))} · ${getItemTotalVolume(item)} л`}
                              >
                                {slotIdx < 6 && <span className="gu-ic-hk">{slotIdx + 1}</span>}
                                <ItemIconCanvas itemId={item.itemId} item={item} size={44} />
                                {item.count > 1 ? (
                                  <span className="gu-ic-n">{item.count}</span>
                                ) : item.isContainer ? (
                                  <span className="gu-ic-n">{item.contents?.length || 0}</span>
                                ) : null}
                                {isHot && <span className="gu-slot-t">+{Math.round(temp!)}°</span>}
                                {isCold && <span className="gu-slot-t cold">{Math.round(temp!)}°</span>}
                                {(item.wetness ?? 0) > 0 && <span className="gu-slot-wet"><CloudRain width={11} height={11} /></span>}
                                {fillPct !== null && <div className="gu-ic-fill"><i style={{ width: `${fillPct}%` }} /></div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Standalone Carried Containers */}
              {(() => {
                const pocketContainers = (player.inventory || []).filter(i => i && i.isContainer && !i.singleUseContainer && !i.tornItemId);
                const handContainers = [player.leftHandItem, player.rightHandItem].filter(
                  i => i && i.isContainer && !i.singleUseContainer && !i.tornItemId
                ) as InventoryItem[];
                const allContainers: { item: InventoryItem; source: string }[] = [];

                pocketContainers.forEach(c => allContainers.push({ item: c, source: 'В карманах' }));
                handContainers.forEach(c => allContainers.push({ item: c, source: 'В руке' }));

                if (allContainers.length === 0) return null;

                return (
                  <div className="gu-panel gu-pad" style={{ padding: '10px 12px' }}>
                    <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                      <span className="gu-grp">Контейнеры и кошельки ({allContainers.length})</span>
                      <span className="gu-mut gu-hide-s" style={{ fontSize: 11 }}>Быстрый доступ</span>
                    </div>

                    <div className="gu-grid gu-g2" style={{ gap: 8 }}>
                      {allContainers.map((entry, cIdx) => {
                        const cItem = entry.item;
                        const count = cItem.contents?.length || 0;
                        const maxVol = cItem.containerCapacityL || 20;
                        const curVol = (cItem.contents || []).reduce((acc, it) => acc + getItemTotalVolume(it), 0);

                        return (
                          <div key={cIdx} className="gu-card-sm gu-row2" style={{ justifyContent: 'space-between', padding: '8px 10px' }}>
                            <div className="gu-row2" style={{ minWidth: 0, gap: 10 }}>
                              <div className="gu-ic">
                                <ItemIconCanvas itemId={cItem.itemId} item={cItem} size={38} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {cItem.nameRu}
                                </div>
                                <div className="gu-mut gu-mono" style={{ fontSize: 11 }}>
                                  {count} предм. · {curVol.toFixed(1)}/{maxVol} л
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="gu-btn gu-btn-p gu-btn-xs"
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
                    <div className="gu-ic gu-md">
                      <ItemIconCanvas itemId={selectedEntry.item.itemId} item={selectedEntry.item} size={50} />
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
                        <span className="gu-mut gu-mono" style={{ fontSize: 12 }}>
                          ×{selectedEntry.item.count} шт. · {formatWeightRu(getItemTotalWeight(selectedEntry.item))} ·{' '}
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
                        {(selectedEntry.item.singleUseContainer || selectedEntry.item.tornItemId) &&
                          !selectedEntry.item.isOpen && (
                            <button
                              type="button"
                              id="btn-unpack-selected-container"
                              className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                              onClick={() => {
                                unpackSingleUseContainer(player, selectedEntry.item, world);
                                sound.resume();
                                forceRender(n => n + 1);
                              }}
                            >
                              <Scissors width={15} height={15} />
                              <span>
                                Вскрыть упаковку
                                {selectedEntry.item.contents && selectedEntry.item.contents.length > 0
                                  ? ` (${selectedEntry.item.contents.reduce((acc, it) => acc + (it.count || 1), 0)} шт.)`
                                  : ''}
                              </span>
                            </button>
                          )}
                        {(selectedEntry.item.isOpen ||
                          selectedEntry.item.itemId === 'pouch_sealed_snack_torn' ||
                          selectedEntry.item.itemId === 'egg_carton_10_open' ||
                          selectedEntry.item.itemId === 'lukoshko') &&
                          selectedEntry.item.contents &&
                          selectedEntry.item.contents.length > 0 && (
                            <button
                              type="button"
                              id="btn-consume-from-opened-package"
                              className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                              onClick={() => {
                                useItemOnPlayer(player, selectedEntry.originalIndex, world || undefined);
                                sound.resume();
                                forceRender(n => n + 1);
                              }}
                            >
                              <Utensils width={15} height={15} />
                              <span>
                                {selectedEntry.item.itemId.startsWith('egg_carton')
                                  ? 'Достать 1 шт.'
                                  : selectedEntry.item.contents[0]?.category === 'med'
                                  ? 'Применить 1 шт.'
                                  : 'Съесть 1 шт.'}{' '}
                                (осталось {selectedEntry.item.contents.reduce((acc, it) => acc + (it.count || 1), 0)} шт.)
                              </span>
                            </button>
                          )}
                        <button
                          type="button"
                          id="btn-open-selected-container"
                          className={`gu-btn ${
                            (selectedEntry.item.singleUseContainer || selectedEntry.item.tornItemId) && !selectedEntry.item.isOpen
                              ? 'gu-btn-s'
                              : 'gu-btn-p'
                          } gu-btn-sm gu-btn-block`}
                          onClick={() => {
                            setOpenContainer(selectedEntry.item);
                            setSelectedContainerItemIdx(0);
                          }}
                        >
                          <Package width={15} height={15} />
                          <span>Открыть контейнер ({selectedEntry.item.contents?.length || 0} предм.)</span>
                        </button>
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
                    ) : isFluidContainerClosed(selectedEntry.item) ? (
                      <button
                        type="button"
                        id="btn-open-fluid-container"
                        className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                        onClick={() => {
                          openFluidContainerIfNeeded(player, selectedEntry.item);
                          sound.resume();
                          forceRender(n => n + 1);
                        }}
                      >
                        <Scissors width={15} height={15} />
                        <span>
                          {selectedEntry.item.itemId.startsWith('can_metal_')
                            ? 'Вскрыть консервную банку'
                            : selectedEntry.item.itemId === 'can_alu_330'
                            ? 'Открыть банку (ключ-кольцо)'
                            : selectedEntry.item.itemId.startsWith('cup_plastic_dairy') ||
                              selectedEntry.item.itemId.startsWith('tetra_pack_') ||
                              selectedEntry.item.itemId === 'package_sachet'
                            ? 'Вскрыть упаковку'
                            : 'Открыть крышку'}
                        </span>
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

                    {/* Stash into reusable containers */}
                    {availableContainers.filter(cont => cont.id !== selectedEntry.item.id).length > 0 && (
                      <div className="gu-row2 gu-wrap" style={{ gap: 4 }}>
                        <span className="gu-mut" style={{ fontSize: 11, marginRight: 2 }}>Убрать в:</span>
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
                                style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                                title={check.fits ? `Положить ${selectedEntry.item.nameRu} в ${cont.nameRu}` : check.reason}
                              >
                                <ArrowDownToLine width={11} height={11} color="#c9922b" />
                                <span>{cont.nameRu}</span>
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

                  {/* Packaging Attributes (Shape, Size, State, Material) */}
                  {(selectedEntry.item.packagingShape ||
                    selectedEntry.item.packagingShapeNameRu ||
                    selectedEntry.item.packagingSize ||
                    selectedEntry.item.itemId.startsWith('candy_pouch') ||
                    selectedEntry.item.itemId.startsWith('paper_packaging')) && (() => {
                    const it = selectedEntry.item;
                    const isCandy = it.itemId.startsWith('candy_pouch');
                    const isOpenPkg = Boolean(it.isOpen || it.itemId.includes('_open') || !it.singleUseContainer);
                    const sizeLabels: Record<string, string> = {
                      mini: 'Мини',
                      small: 'Малая',
                      medium: 'Средняя',
                      large: 'Большая'
                    };
                    const shapeLabel =
                      it.packagingShapeNameRu ||
                      (it.packagingShape
                        ? getCandyPackagingShapeNameRu(it.packagingShape)
                        : isCandy
                        ? 'Пластиковый пакет'
                        : 'Пергаментный конверт-брикет');

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                          <span className="gu-grp" style={{ fontSize: 12 }}>Характеристики упаковки</span>
                          <span className="gu-tag amber" style={{ fontSize: 10 }}>
                            <Package width={11} height={11} />
                            {isOpenPkg ? 'Вскрыта' : 'Запаяна'}
                          </span>
                        </div>
                        <div className="gu-kv-grid">
                          <div className="gu-kv">
                            <span className="gu-kv-k">Форма</span>
                            <span className="gu-kv-v">{shapeLabel}</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Размер</span>
                            <span className="gu-kv-v">{sizeLabels[it.packagingSize || 'medium'] || 'Стандарт'}</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Материал</span>
                            <span className="gu-kv-v">{isCandy ? 'Пищевой пластик (BOPP)' : 'Пищевой пергамент'}</span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Вместимость</span>
                            <span className="gu-kv-v">{it.containerCapacityL ? `${it.containerCapacityL} л` : '—'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Gummy Candy Attributes (Color, Shape, Flavor, Ingredients) */}
                  {selectedEntry.item.gummyAttributes && (() => {
                    const g = selectedEntry.item.gummyAttributes!;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                          <span className="gu-grp" style={{ fontSize: 12 }}>Свойства мармелада</span>
                          {g.sourDust && (
                            <span className="gu-tag amber" style={{ fontSize: 10 }}>
                              <Sparkles width={11} height={11} />
                              Кислая посыпка
                            </span>
                          )}
                        </div>
                        <div className="gu-kv-grid">
                          <div className="gu-kv">
                            <span className="gu-kv-k">Цвет</span>
                            <span className="gu-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 2,
                                  backgroundColor: g.color,
                                  border: '1px solid rgba(255,255,255,0.35)',
                                  display: 'inline-block',
                                  flexShrink: 0
                                }}
                              />
                              <span>{g.colorNameRu}</span>
                            </span>
                          </div>
                          <div className="gu-kv">
                            <span className="gu-kv-k">Форма</span>
                            <span className="gu-kv-v">{g.shapeNameRu}</span>
                          </div>
                          {g.flavorRu && (
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Вкус</span>
                              <span className="gu-kv-v">{g.flavorRu}</span>
                            </div>
                          )}
                          <div className="gu-kv" style={{ gridColumn: '1 / -1', alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                            <span className="gu-kv-k">Состав</span>
                            <span className="gu-kv-v" style={{ fontSize: 11, lineHeight: 1.35, color: 'var(--gu-ink-soft)' }}>
                              {g.ingredients.join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ justifyContent: 'space-between' }}>
              <div className="gu-row2" style={{ gap: 12 }}>
                <button id="btn-close-container-view" type="button" className="gu-btn gu-btn-s gu-btn-sm" onClick={() => setOpenContainer(null)}>
                  <ChevronLeft width={16} height={16} color="#c9922b" />
                  <span>Назад в карманы</span>
                </button>
                <div className="gu-ic">
                  <ItemIconCanvas itemId={openContainer.itemId} item={openContainer} size={38} />
                </div>
                <div>
                  <div className="gu-row2" style={{ gap: 8 }}>
                    <span className="gu-cn" style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                      {openContainer.nameRu}
                    </span>
                    <span className="gu-tag amber">Контейнер</span>
                  </div>
                  <div className="gu-mut gu-mono" style={{ fontSize: 12 }}>
                    Вместимость: {openContainer.containerCapacityL} л · Макс. вес: {openContainer.maxContainedWeightKg} кг
                  </div>
                </div>
              </div>

              <div className="gu-row2 gu-mono" style={{ gap: 10, fontSize: 13, color: 'var(--gu-mut)' }}>
                <span>Предметов: <strong style={{ color: '#fff' }}>{openContainer.contents?.length || 0}</strong></span>
                <span>·</span>
                <span>Объём: <strong style={{ color: 'var(--gu-amber-hi)' }}>{getItemTotalVolume(openContainer)} л</strong></span>
                <span>·</span>
                <span>Вес: <strong style={{ color: '#fff' }}>{formatWeightRu(getItemTotalWeight(openContainer))}</strong></span>
              </div>
            </div>

            {(openContainer.contents || []).length > 0 ? (
              <div className="gu-grid gu-g2" style={{ gap: 8 }}>
                {openContainer.contents!.map((contItem, cIdx) => (
                  <div key={cIdx} className="gu-item" style={{ justifyContent: 'space-between', padding: '8px 12px' }}>
                    <div className="gu-row2" style={{ minWidth: 0, gap: 10 }}>
                      <div className="gu-ic">
                        <ItemIconCanvas itemId={contItem.itemId} item={contItem} size={38} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="gu-item-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contItem.nameRu}
                        </div>
                        <div className="gu-item-sub gu-mono">
                          {contItem.count} шт. · {formatWeightRu(getItemTotalWeight(contItem))} · {getItemTotalVolume(contItem)} л
                        </div>
                        {contItem.gummyAttributes && (
                          <div className="gu-row2" style={{ gap: 6, marginTop: 2, fontSize: 11, color: 'var(--gu-ink-soft)' }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                backgroundColor: contItem.gummyAttributes.color,
                                border: '1px solid rgba(255,255,255,0.35)',
                                display: 'inline-block',
                                flexShrink: 0
                              }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {contItem.gummyAttributes.shapeNameRu} · {contItem.gummyAttributes.colorNameRu}
                              {contItem.gummyAttributes.flavorRu ? ` (${contItem.gummyAttributes.flavorRu})` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="gu-row2" style={{ gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="gu-btn gu-btn-p gu-btn-xs"
                        onClick={() => handleExtractFromContainer(openContainer, cIdx, 'pockets')}
                      >
                        <ArrowUpFromLine width={13} height={13} />
                        <span>В карман</span>
                      </button>
                      <button
                        type="button"
                        className="gu-btn gu-btn-s gu-btn-xs"
                        disabled={!!player.rightHandItem}
                        onClick={() => handleExtractFromContainer(openContainer, cIdx, 'rightHand')}
                      >
                        <Hand width={13} height={13} />
                        <span>В руку</span>
                      </button>
                      <button
                        type="button"
                        className="gu-btn gu-btn-d gu-btn-xs"
                        onClick={() => handleDropFromContainer(openContainer, cIdx)}
                        title="Выбросить на землю"
                      >
                        <Trash2 width={13} height={13} />
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
                  <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                    <span className="gu-grp">Положить предмет в {openContainer.nameRu}</span>
                    <span className="gu-mut" style={{ fontSize: 12 }}>Нажмите на предмет для перемещения</span>
                  </div>
                  <div className="gu-grid gu-g4" style={{ gap: 8 }}>
                    {depositCandidates.map((cand, cIdx) => {
                      const check = canItemFitInContainer(openContainer, cand.item);
                      return (
                        <button
                          type="button"
                          key={cIdx}
                          disabled={!check.fits}
                          className="gu-card"
                          style={{ padding: '8px 10px', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}
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
                          <div className="gu-ic">
                            <ItemIconCanvas itemId={cand.item.itemId} item={cand.item} size={38} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cand.item.nameRu}
                            </div>
                            <div className="gu-mut gu-mono" style={{ fontSize: 11 }}>
                              {getItemTotalVolume(cand.item)} л · {formatWeightRu(getItemTotalWeight(cand.item))}
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
              <span className="gu-mut gu-mono" style={{ fontSize: 13 }}>Найдено: {nearbyGroundItems.length}</span>
            </div>

            {nearbyGroundItems.length > 0 ? (
              <div className="gu-list">
                {nearbyGroundItems.map(gi => (
                  <div key={gi.id} className="gu-rw">
                    <div className="gu-ic">
                      <ItemIconCanvas itemId={gi.item.itemId} item={gi.item} size={38} />
                    </div>
                    <div className="gu-grow">
                      <div className="gu-rw-t">{gi.item.nameRu}</div>
                      <div className="gu-rw-d gu-mono">
                        {gi.item.count} шт. · {formatWeightRu(getItemTotalWeight(gi.item))} · {getItemTotalVolume(gi.item)} л
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="gu-grp">Надетая одежда и вместимость карманов</div>
                <div className="gu-mut" style={{ fontSize: 13, marginTop: 2 }}>
                  Верхняя одежда, брюки и рюкзаки добавляют слоты и литраж карманов
                </div>
              </div>
              <div className="gu-row2 gu-mono" style={{ gap: 8, fontSize: 13 }}>
                <span className="gu-mut">Объём карманов:</span>
                <strong style={{ color: 'var(--gu-amber-hi)' }}>
                  {pocketCap.usedVolumeL} / {pocketCap.totalCapacityL} л
                </strong>
              </div>
            </div>

            {Object.keys(player.equippedClothing || {}).length > 0 ? (
              <div className="gu-grid gu-g2">
                {Object.entries(player.equippedClothing || {}).map(([slot, layers]) => (
                  <div key={slot} className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="gu-grp">{CLOTHING_SLOT_LABELS[slot] || slot}</div>
                    {Object.entries(layers).map(([layer, item]) => (
                      <div key={layer} className="gu-card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div className="gu-row2" style={{ gap: 10, minWidth: 0 }}>
                          <div className="gu-ic">
                            <ItemIconCanvas itemId={item.itemId} item={item} size={38} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.nameRu}
                            </div>
                            <div className="gu-mut" style={{ fontSize: 12 }}>
                              {CLOTHING_LAYER_LABELS[layer] || layer}
                              {item.clothingStats && item.clothingStats.pocketCapacityL ? (
                                <span style={{ color: 'var(--gu-amber-soft)' }}>
                                  {' · '}+{item.clothingStats.pocketCapacityL} л (до {item.clothingStats.maxPocketWeightKg || 1.5} кг)
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="gu-btn gu-btn-d gu-btn-xs"
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


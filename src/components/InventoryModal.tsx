import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { Player, InventoryItem, ItemCategory, GameWorld, GroundItem, CandyPackagingShape, ChocolatePackagingShape } from '../types';
import {
  useItemOnPlayer,
  useHandItemOnPlayer,
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
  canItemFitInCompartment,
  addPlayerNotification,
  restoreStarterContainers,
  unpackSingleUseContainer,
  handleCarKeyActivation,
  getTargetVehicleForKey,
  getPlayerCompartments,
  getPlayerTotalSlots,
  getSlotCompartment,
  getCandyPackagingShapeNameRu,
  getChocolatePackagingShapeNameRu,
  getUnifiedItemAttributes,
  createItem,
  isPackageContainerItem
} from '../items';
import { getAllFreeCatalogItems, FREE_CATALOG_CATEGORIES, getFreeCategoryLabelRu, FreeCatalogEntry } from '../freeItemCatalog';
import {
  AMMO_SPECS,
  MAGAZINE_SPECS,
  WEAPON_SPECS,
  getWeaponDisplaySubtitleRu,
  isAmmoItemId,
  isMagazineItemId,
  isWeaponItemId,
} from '../weaponData';
import {
  ejectWeaponMagazine,
  loadMagazineFromInventory,
  unloadMagazineToInventory,
} from '../weaponSystem';
import { CatalogAttributeEditor } from './CatalogAttributeEditor';
import { getItemThermalDisplayInfo } from '../itemThermalSystem';
import {
  isFluidContainerClosed,
  openFluidContainerIfNeeded,
  canCloseFluidContainer,
  closeFluidContainer,
  LIQUID_REGISTRY,
  LiquidId,
  ensureHybridContainerProps,
  getContainerCapacityBreakdown,
  drainLiquidFromContainer,
  tryFillOrUseFluidContainer,
  isFluidStorageDryForm,
  getContainerLiquidThermalProfile,
  getLiquidThermalPhaseLabelRu
} from '../liquidSystem';
import {
  InteractionSlotGrid4,
  evaluateInteractionGrid,
  getEffectiveFluidWrapper,
  getSlotPourDosageLabel,
} from '../interactionCrafting';
import {
  describeDoughAppearanceQualitativeRu,
  isDoughFillingVisible,
  summarizeDoughFillingsApproxRu,
  summarizeDoughIngredientsRu,
} from '../doughData';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { useCachedSlotDrag } from './useCachedSlotDrag';
import { sound } from '../audio';
import { formatRgbString } from '../phoneData';
import {
  countDisposableTrashInList,
  countDisposableTrashOnPlayer,
  getEffectiveSubjectItem,
  getItemReadableTitleRu,
  getPackagedInnerItem,
  isDisposableTrashOrEmptyPackaging,
  organizeContainerInPlace,
  organizePlayerInventoryInPlace,
  sweepTrashFromContainer,
  sweepTrashFromPlayerToBin,
} from '../storageOrganization';
import inventoryModalCss from './inventoryModal.css?inline';
import {
  Package,
  Utensils,
  Zap,
  Trash2,
  Sparkles,
  Shirt,
  Hand,
  Weight,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
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
  CloudRain,
  HardHat,
  Glasses,
  Footprints,
  Backpack,
  Thermometer,
  Droplets,
  FlaskConical,
  Search,
  Wand2,
  RotateCcw,
  Check,
  FolderOpen,
  Plus,
  Minus,
  ArrowUpDown,
  X
} from 'lucide-react';

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

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  world: GameWorld | null;
  onSleepInBed?: () => void;
  onRequestLimbTreatment?: (itemIndex: number, item: InventoryItem) => void;
  onInspectDocument?: (item: InventoryItem) => void;
  initialOpenContainerHand?: 'left' | 'right' | null;
}

const InventoryModalContent: React.FC<{
  onClose: () => void;
  player: Player;
  world: GameWorld | null;
  onRequestLimbTreatment?: (itemIndex: number, item: InventoryItem) => void;
  onInspectDocument?: (item: InventoryItem) => void;
  initialOpenContainerHand?: 'left' | 'right' | null;
}> = ({
  onClose,
  player,
  world,
  onRequestLimbTreatment,
  onInspectDocument,
  initialOpenContainerHand
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedHand, setSelectedHand] = useState<'left' | 'right' | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'interaction' | 'surroundings' | 'clothing' | 'catalog'>('inventory');
  const [openContainer, setOpenContainer] = useState<InventoryItem | null>(() => {
    if (initialOpenContainerHand === 'left' && player.leftHandItem?.isContainer) {
      return player.leftHandItem;
    }
    if (initialOpenContainerHand === 'right' && player.rightHandItem?.isContainer) {
      return player.rightHandItem;
    }
    return null;
  });
  const [selectedContainerItemIdx, setSelectedContainerItemIdx] = useState<number>(0);
  const [entered, setEntered] = useState(false);
  const [renderVer, forceRender] = useState(0);
  const [selectedWbSlot, setSelectedWbSlot] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    slotKey: string;
    item: InventoryItem;
  } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const gmRef = useRef<HTMLDivElement>(null);
  const wbDropHandlerRef = useRef<((targetKey: string, sourceKey: string) => void) | null>(null);

  useLayoutEffect(() => attachStageFit(() => wrapRef.current, () => gmRef.current), []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (initialOpenContainerHand === 'left' && player.leftHandItem?.isContainer) {
      setActiveTab('inventory');
      setOpenContainer(player.leftHandItem);
      setSelectedHand('left');
    } else if (initialOpenContainerHand === 'right' && player.rightHandItem?.isContainer) {
      setActiveTab('inventory');
      setOpenContainer(player.rightHandItem);
      setSelectedHand('right');
    }
  }, [initialOpenContainerHand, player]);

  useTopmostEscape(() => {
    if (ctxMenu) {
      setCtxMenu(null);
      return;
    }
    if (openContainer) {
      setOpenContainer(null);
      return;
    }
    onClose();
  });

  useEffect(() => {
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
  }, [player]);

  // Upgrade legacy saved fluid vessels & cookware once per inventory version
  useEffect(() => {
    (player.inventory || []).forEach(it => { if (it) ensureHybridContainerProps(it); });
    if (player.leftHandItem) ensureHybridContainerProps(player.leftHandItem);
    if (player.rightHandItem) ensureHybridContainerProps(player.rightHandItem);
  }, [player, renderVer]);

  // ---- Freeroam "free inventory" catalog tab ----
  const isFreeroam = world?.gameMode === 'freeroam';
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<string>('all');
  const [catalogSelectedId, setCatalogSelectedId] = useState<string | null>(null);
  const [catalogDraft, setCatalogDraft] = useState<InventoryItem | null>(null);
  const [catalogDraftDirty, setCatalogDraftDirty] = useState(false);
  const [catalogGiveCount, setCatalogGiveCount] = useState(1);
  const [catalogLimit, setCatalogLimit] = useState(240);
  const catalogAllItems = React.useMemo(() => (isFreeroam ? getAllFreeCatalogItems() : []), [isFreeroam]);
  const catalogFiltered = React.useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    const cat = FREE_CATALOG_CATEGORIES.find(c => c.id === catalogCategory) || FREE_CATALOG_CATEGORIES[0];
    return catalogAllItems.filter(it => {
      if (!cat.match(it)) return false;
      if (!q) return true;
      return (
        it.nameRu.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q) ||
        it.key.toLowerCase().includes(q) ||
        (it.presetGroup ? it.presetGroup.toLowerCase().includes(q) : false) ||
        (it.searchTags ? it.searchTags.toLowerCase().includes(q) : false)
      );
    });
  }, [catalogAllItems, catalogSearch, catalogCategory]);
  const catalogSelected = React.useMemo(
    () => catalogAllItems.find(it => it.id === catalogSelectedId) || null,
    [catalogAllItems, catalogSelectedId]
  );

  useEffect(() => {
    if (!isFreeroam || !catalogSelected) {
      setCatalogDraft(null);
      setCatalogDraftDirty(false);
      setCatalogGiveCount(1);
      return;
    }
    setCatalogDraft(catalogSelected.create(1));
    setCatalogDraftDirty(false);
    setCatalogGiveCount(1);
  }, [isFreeroam, catalogSelected?.id]);

  const stopGameKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Escape') {
      e.stopPropagation();
      e.nativeEvent.stopPropagation();
    }
  };

  const spawnItemInstance = (source: InventoryItem, count: number): InventoryItem => {
    const cloned = JSON.parse(JSON.stringify(source)) as InventoryItem;
    cloned.id = `${cloned.itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    cloned.count = Math.max(1, Math.min(cloned.maxStack || 1, Math.round(count)));
    return cloned;
  };

  const giveCatalogItemInstance = (itemToGive: InventoryItem, target: 'pockets' | 'hand' = 'pockets') => {
    if (target === 'hand') {
      const preferredHand: 'left' | 'right' =
        player.activeHand === 'left'
          ? (!player.leftHandItem ? 'left' : !player.rightHandItem ? 'right' : 'left')
          : (!player.rightHandItem ? 'right' : !player.leftHandItem ? 'left' : 'right');
      const res = putItemInHand(player, preferredHand, itemToGive, world || undefined);
      if (res.success) {
        addPlayerNotification(player, `В руке: ${itemToGive.nameRu || itemToGive.name}`, 'pickup');
        sound.playUseItem();
      } else {
        addPlayerNotification(player, res.message || 'Руки заняты', 'warning');
      }
      forceRender(n => n + 1);
      return;
    }
    const ok = addItemToPlayer(player, itemToGive);
    if (ok) {
      const qtyStr = itemToGive.count > 1 ? ` x${itemToGive.count}` : '';
      addPlayerNotification(player, `Получено: ${itemToGive.nameRu || itemToGive.name}${qtyStr}`, 'pickup');
      sound.playUseItem();
    } else {
      addPlayerNotification(player, 'Инвентарь заполнен', 'warning');
    }
    forceRender(n => n + 1);
  };

  const handleGiveCatalogEntry = (entry: FreeCatalogEntry, count: number) => {
    const created = entry.create(Math.max(1, Math.min(entry.maxStack || 1, count)));
    giveCatalogItemInstance(created, 'pockets');
  };

  const handleGiveCatalogDraft = (count: number, target: 'pockets' | 'hand' = 'pockets') => {
    if (!catalogDraft) return;
    const instance = spawnItemInstance(catalogDraft, target === 'hand' ? 1 : count);
    giveCatalogItemInstance(instance, target);
  };

  const inventory = player.inventory || [];
  const compartments = React.useMemo(() => getPlayerCompartments(player), [player, renderVer]);
  const pocketCap = React.useMemo(() => getPlayerPocketCapacity(player), [player, renderVer]);
  const carriedWeight = React.useMemo(() => getPlayerTotalCarriedWeight(player), [player, renderVer]);
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

  const availableContainers = useMemo(() => {
    const list: InventoryItem[] = [];
    for (const it of inventory) {
      if (it && it.isContainer && !it.singleUseContainer) list.push(it);
    }
    if (player.leftHandItem?.isContainer && !player.leftHandItem.singleUseContainer) {
      list.push(player.leftHandItem);
    }
    if (player.rightHandItem?.isContainer && !player.rightHandItem.singleUseContainer) {
      list.push(player.rightHandItem);
    }
    return list;
  }, [inventory, player.leftHandItem, player.rightHandItem, renderVer]);

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
    return item.category === selectedCategory || getEffectiveSubjectItem(item).category === selectedCategory;
  };

  const selectedHandItem =
    selectedHand === 'left'
      ? player.leftHandItem
      : selectedHand === 'right'
      ? player.rightHandItem
      : null;

  const selectedEntry =
    selectedHand && selectedHandItem
      ? { item: selectedHandItem, originalIndex: -1, hand: selectedHand }
      : inventory[selectedIndex]
      ? { item: inventory[selectedIndex], originalIndex: selectedIndex, hand: null as 'left' | 'right' | null }
      : null;

  const handleEquipItem = (idx: number) => {
    equipClothing(player, idx, world);
    forceRender(n => n + 1);
  };

  const handleUnequipItem = (slot: any, layer: any) => {
    unequipClothing(player, slot, layer, world);
    forceRender(n => n + 1);
  };

  const shouldOpenContainerOnActivate = (item: InventoryItem): boolean => {
    const id = typeof item?.itemId === 'string' ? item.itemId : '';
    if (id === 'wallet') return true;
    const isClosed = isFluidContainerClosed(item) || Boolean(item.singleUseContainer && !item.isOpen);
    if (isClosed) return false;
    const hasLiquid = Boolean(item.fluidStorage && (item.fluidStorage.currentMl || 0) > 0);
    if (hasLiquid) return false;
    const hasContents = Boolean(item.contents && item.contents.length > 0);
    const isExtractableBagOrPkg =
      isPackageContainerItem(item) ||
      id === 'lukoshko' ||
      id === 'package_bag' ||
      id === 'plastic_bag' ||
      id.startsWith('box_cardboard_') ||
      id.startsWith('sack_cloth_') ||
      id === 'sack_empty';
    if (hasContents && isExtractableBagOrPkg) return false;
    return (
      id === 'package_bag' ||
      id === 'plastic_bag' ||
      id.startsWith('box_cardboard_') ||
      id.startsWith('sack_cloth_') ||
      id === 'sack_empty' ||
      Boolean(item.isContainer && !item.fluidStorage && !item.singleUseContainer)
    );
  };

  const handleUseItem = (idx: number, forceDirectUse: boolean = false) => {
    const item = player.inventory?.[idx];
    if (!item) return;

    ensureHybridContainerProps(item);

    if (shouldOpenContainerOnActivate(item) && !forceDirectUse) {
      setOpenContainer(item);
      setSelectedContainerItemIdx(0);
      return;
    }

    const TOPICAL_ITEMS = [
      'bandage',
      'splint',
      'medical_patch',
      'antiseptic',
      'panthenol',
      'panthenol_spray',
      'spasatel_ointment',
      'zelenka',
      'iodine',
      'diclofenac_gel',
      'hydrogen_peroxide'
    ];
    const effectiveMedId = item.fluidStorage?.attributes?.medicalEffectId || item.originalCatalogId || item.itemId;
    if (item && item.category === 'med' && (TOPICAL_ITEMS.includes(effectiveMedId) || TOPICAL_ITEMS.includes(item.itemId))) {
      onRequestLimbTreatment?.(idx, item);
      return;
    }
    useItemOnPlayer(player, idx, world || undefined);
    sound.resume();
    forceRender(n => n + 1);
  };

  const handleUseHandItem = (hand: 'left' | 'right', forceDirectUse: boolean = false) => {
    const item = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!item) return;
    ensureHybridContainerProps(item);
    if (shouldOpenContainerOnActivate(item) && !forceDirectUse) {
      setOpenContainer(item);
      setSelectedContainerItemIdx(0);
      return;
    }
    const TOPICAL_ITEMS = [
      'bandage',
      'splint',
      'medical_patch',
      'antiseptic',
      'panthenol',
      'panthenol_spray',
      'spasatel_ointment',
      'zelenka',
      'iodine',
      'diclofenac_gel',
      'hydrogen_peroxide'
    ];
    const effectiveMedId = item.fluidStorage?.attributes?.medicalEffectId || item.originalCatalogId || item.itemId;
    if (item.category === 'med' && (TOPICAL_ITEMS.includes(effectiveMedId) || TOPICAL_ITEMS.includes(item.itemId))) {
      player.activeHand = hand;
      onRequestLimbTreatment?.(-1, item);
      return;
    }
    useHandItemOnPlayer(player, hand, world || undefined);
    sound.resume();
    forceRender(n => n + 1);
  };

  const handleDropItem = (idx: number) => {
    if (!world) return;
    dropItemFromPlayer(player, idx, world, 1);
    forceRender(n => n + 1);
  };

  const handleTakeToHand = (hand: 'left' | 'right', invIdx: number) => {
    const item = player.inventory?.[invIdx];
    if (!item) return;
    const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (handItem) {
      const fitCheck = canItemFitInCompartment(player, invIdx, handItem, { ignoreSlotIdx: invIdx });
      if (fitCheck.fits) {
        const displaced = takeItemFromHand(player, hand);
        player.inventory[invIdx] = null as any;
        const res = putItemInHand(player, hand, item, world);
        if (res.success) {
          player.inventory[invIdx] = displaced as any;
          sound.playPickup();
          forceRender(n => n + 1);
          return;
        } else {
          if (displaced) putItemInHand(player, hand, displaced, world);
          player.inventory[invIdx] = item;
          addPlayerNotification(player, res.message, 'warning');
          return;
        }
      }
      addPlayerNotification(player, `${hand === 'left' ? 'Левая' : 'Правая'} рука уже занята`, 'warning');
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

  const handleStowHand = (hand: 'left' | 'right', targetSlotIdx?: number) => {
    const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!handItem) return;

    if (targetSlotIdx !== undefined && targetSlotIdx >= 0) {
      if (!player.inventory) player.inventory = [];
      const existing = player.inventory[targetSlotIdx];
      if (
        existing &&
        existing.isContainer &&
        !existing.singleUseContainer &&
        existing.id !== handItem.id &&
        canItemFitInContainer(existing, handItem).fits
      ) {
        const taken = takeItemFromHand(player, hand);
        if (taken) {
          const cRes = addItemToContainer(existing, taken);
          if (cRes.success) {
            sound.playPickup();
            addPlayerNotification(player, cRes.message, 'pickup');
            forceRender(n => n + 1);
            return;
          } else {
            putItemInHand(player, hand, taken, world);
          }
        }
      }

      const fit = canItemFitInCompartment(player, targetSlotIdx, handItem, {
        ignoreSlotIdx: existing ? targetSlotIdx : undefined,
      });
      if (!fit.fits) {
        addPlayerNotification(player, fit.reason || 'Не помещается в этот отсек', 'warning');
        return;
      }
      const taken = takeItemFromHand(player, hand);
      if (!taken) return;
      player.inventory[targetSlotIdx] = taken;
      if (existing) {
        putItemInHand(player, hand, existing, world);
      }
      sound.playPickup();
      forceRender(n => n + 1);
      return;
    }

    const res = stowItemFromHandToPockets(player, hand);
    if (res.success) {
      sound.playPickup();
    }
    forceRender(n => n + 1);
  };

  const handleDropFromHand = (hand: 'left' | 'right') => {
    if (!world) return;
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
    const item = player.inventory?.[invIdx];
    if (!item || item.id === container.id) return;
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
    target: 'pockets' | 'leftHand' | 'rightHand',
    exactPocketSlotIdx?: number
  ) => {
    if (!container.contents) return;
    const item = container.contents[contentIdx];
    if (!item) return;

    if (target === 'pockets') {
      if (exactPocketSlotIdx !== undefined && exactPocketSlotIdx >= 0) {
        if (!player.inventory) player.inventory = [];
        const existing = player.inventory[exactPocketSlotIdx];
        const fit = canItemFitInCompartment(player, exactPocketSlotIdx, item, {
          ignoreSlotIdx: existing ? exactPocketSlotIdx : undefined,
        });
        if (!fit.fits) {
          addPlayerNotification(player, fit.reason || 'Не помещается в этот отсек', 'warning');
          return;
        }
        if (!existing) {
          const removed = removeItemFromContainer(container, contentIdx, item.count);
          if (removed) {
            player.inventory[exactPocketSlotIdx] = removed;
            sound.playPickup();
            forceRender(n => n + 1);
          }
          return;
        } else if (existing.id !== container.id && canItemFitInContainer(container, existing).fits) {
          const removed = removeItemFromContainer(container, contentIdx, item.count);
          if (removed) {
            player.inventory[exactPocketSlotIdx] = removed;
            addItemToContainer(container, existing);
            sound.playPickup();
            forceRender(n => n + 1);
          }
          return;
        }
      }

      const check = canItemFitInPockets(player, item);
      if (!check.fits) {
        addPlayerNotification(player, check.reason || 'Не помещается в карманы', 'warning');
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
      const hand = target === 'leftHand' ? 'left' : 'right';
      const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
      if (handItem) {
        if (handItem.id !== container.id && canItemFitInContainer(container, handItem).fits) {
          const removed = removeItemFromContainer(container, contentIdx, item.count);
          if (removed) {
            const displaced = takeItemFromHand(player, hand);
            putItemInHand(player, hand, removed, world);
            if (displaced) addItemToContainer(container, displaced);
            sound.playPickup();
            forceRender(n => n + 1);
          }
          return;
        }
        addPlayerNotification(player, `${hand === 'left' ? 'Левая' : 'Правая'} рука занята`, 'warning');
        return;
      }
      const removed = removeItemFromContainer(container, contentIdx, item.count);
      if (removed) {
        putItemInHand(player, hand, removed, world);
        sound.playPickup();
        forceRender(n => n + 1);
      }
    }
  };

  const handleEquipFromHand = (hand: 'left' | 'right') => {
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
    if (!world || !container.contents) return;
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

  const nearbyGroundItems = useMemo(() => {
    const raw = world?.groundItems;
    if (!raw || raw.length === 0) return [];
    const px = player.x;
    const py = player.y;
    const out: GroundItem[] = [];
    for (let i = 0; i < raw.length; i++) {
      const gi = raw[i];
      if (Math.hypot(px - gi.x, py - gi.y) < 80) out.push(gi);
    }
    return out;
  }, [world?.groundItems, world?.groundItems?.length, Math.round(player.x), Math.round(player.y), renderVer, activeTab]);

  const handlePickupGroundItem = (gi: GroundItem, targetKey?: string) => {
    if (!world) return;
    if (targetKey === 'hand:left' || targetKey === 'hand:right') {
      const hand = targetKey === 'hand:left' ? 'left' : 'right';
      const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
      if (!handItem) {
        const res = putItemInHand(player, hand, gi.item, world);
        if (res.success) {
          sound.playPickup();
          world.groundItems = (world.groundItems || []).filter(item => item.id !== gi.id);
          forceRender(n => n + 1);
          return;
        }
      }
    } else if (targetKey && targetKey.startsWith('inv:')) {
      const slotIdx = parseInt(targetKey.replace('inv:', ''), 10);
      if (!isNaN(slotIdx) && slotIdx >= 0) {
        if (!player.inventory) player.inventory = [];
        if (!player.inventory[slotIdx]) {
          const fit = canItemFitInCompartment(player, slotIdx, gi.item);
          if (fit.fits) {
            player.inventory[slotIdx] = gi.item;
            sound.playPickup();
            world.groundItems = (world.groundItems || []).filter(item => item.id !== gi.id);
            forceRender(n => n + 1);
            return;
          }
        }
      }
    }

    const added = addItemToPlayer(player, gi.item);
    if (added) {
      sound.playPickup();
      world.groundItems = (world.groundItems || []).filter(item => item.id !== gi.id);
      forceRender(n => n + 1);
    }
  };

  // ==================== 10-SLOT INTERACTION WORKBENCH ====================
  const pAny = player as any;
  if (!pAny._interactionInputs) {
    pAny._interactionInputs = [null, null, null, null] as InteractionSlotGrid4;
  }
  if (!pAny._interactionOutputs) {
    pAny._interactionOutputs = [null, null, null, null] as InteractionSlotGrid4;
  }
  const interactionInputs: InteractionSlotGrid4 = pAny._interactionInputs;
  const interactionOutputs: InteractionSlotGrid4 = pAny._interactionOutputs;

  const hasCommittedOutputs = interactionOutputs.some(it => it !== null);
  const evalResult = useMemo(() => {
    if (activeTab !== 'interaction' && !interactionInputs.some(Boolean)) {
      return {
        isValid: false,
        kind: 'none' as const,
        title: 'Слоты пусты',
        subtitle: '',
        previewOutputs: [null, null, null, null] as InteractionSlotGrid4,
        transferDetails: [],
      };
    }
    return evaluateInteractionGrid(interactionInputs);
  }, [
    activeTab,
    renderVer,
    interactionInputs[0]?.id,
    interactionInputs[1]?.id,
    interactionInputs[2]?.id,
    interactionInputs[3]?.id,
    interactionInputs[0]?.count,
    interactionInputs[1]?.count,
    interactionInputs[2]?.count,
    interactionInputs[3]?.count,
    interactionInputs[0]?.fluidStorage?.currentMl,
    interactionInputs[1]?.fluidStorage?.currentMl,
    interactionInputs[2]?.fluidStorage?.currentMl,
    interactionInputs[3]?.fluidStorage?.currentMl,
  ]);

  const returnWorkbenchItemToPlayer = (item: InventoryItem, preferHand?: 'left' | 'right'): boolean => {
    if (preferHand === 'left' && !player.leftHandItem) {
      const res = putItemInHand(player, 'left', item, world);
      if (res.success) return true;
    }
    if (preferHand === 'right' && !player.rightHandItem) {
      const res = putItemInHand(player, 'right', item, world);
      if (res.success) return true;
    }
    const addedToPockets = addItemToPlayer(player, item, { preferPockets: true, skipHands: false });
    if (addedToPockets) return true;
    if (!player.leftHandItem) {
      const res = putItemInHand(player, 'left', item, world);
      if (res.success) return true;
    }
    if (!player.rightHandItem) {
      const res = putItemInHand(player, 'right', item, world);
      if (res.success) return true;
    }
    if (world) {
      if (!world.groundItems) world.groundItems = [];
      world.groundItems.push({
        id: `ground_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        x: player.x + (Math.random() * 14 - 7),
        y: player.y + (Math.random() * 14 - 7),
        item,
        spawnTime: Date.now()
      });
      addPlayerNotification(player, `Руки и карманы заняты — положено на землю: ${item.nameRu}`, 'warning');
      return true;
    }
    return false;
  };

  const handleClearWorkbench = () => {
    let moved = 0;
    for (let i = 0; i < 4; i++) {
      if (interactionInputs[i]) {
        returnWorkbenchItemToPlayer(interactionInputs[i]!);
        interactionInputs[i] = null;
        moved++;
      }
      if (interactionOutputs[i]) {
        returnWorkbenchItemToPlayer(interactionOutputs[i]!);
        interactionOutputs[i] = null;
        moved++;
      }
    }
    if (moved > 0) {
      sound.playPickup();
      forceRender(n => n + 1);
    }
  };

  const handlePlacePocketIntoInput = (invIdx: number, exactSlot?: number) => {
    const invItem = player.inventory?.[invIdx];
    if (!invItem) return;
    let targetSlot = exactSlot;
    if (targetSlot === undefined) {
      targetSlot = [0, 1, 2, 3].find(idx => interactionInputs[idx] === null);
    }
    if (targetSlot === undefined || targetSlot < 0 || targetSlot > 3) {
      addPlayerNotification(player, 'Все 4 слота ввода уже заняты', 'warning');
      return;
    }
    let taken: InventoryItem;
    if (invItem.count > 1) {
      taken = { ...invItem, id: `${invItem.itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, count: 1 };
      invItem.count -= 1;
    } else {
      taken = invItem;
      player.inventory[invIdx] = null as any;
    }
    const displaced = interactionInputs[targetSlot];
    interactionInputs[targetSlot] = taken;
    if (displaced) {
      if (!player.inventory[invIdx] && canItemFitInCompartment(player, invIdx, displaced).fits) {
        player.inventory[invIdx] = displaced;
      } else {
        returnWorkbenchItemToPlayer(displaced);
      }
    }
    sound.playPickup();
    forceRender(n => n + 1);
  };

  const handlePlaceHandIntoInput = (hand: 'left' | 'right', preferredRow: 'top' | 'bottom' | 'any' = 'any', exactSlot?: number) => {
    const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!handItem) return;

    let targetSlot = exactSlot;
    if (targetSlot === undefined) {
      const candidateIndices =
        preferredRow === 'top' ? [0, 1, 2, 3] : preferredRow === 'bottom' ? [2, 3, 0, 1] : [0, 2, 1, 3];
      targetSlot = candidateIndices.find(idx => interactionInputs[idx] === null);
    }
    if (targetSlot === undefined || targetSlot < 0 || targetSlot > 3) {
      addPlayerNotification(player, 'Все 4 слота ввода уже заняты', 'warning');
      return;
    }

    const taken = takeItemFromHand(player, hand);
    if (!taken) return;

    const displaced = interactionInputs[targetSlot];
    interactionInputs[targetSlot] = taken;
    if (displaced) {
      putItemInHand(player, hand, displaced, world);
    }
    sound.playPickup();
    forceRender(n => n + 1);
  };

  const handleRemoveInputSlot = (slotIdx: number, target?: 'left' | 'right' | 'pockets') => {
    const item = interactionInputs[slotIdx];
    if (!item) return;
    interactionInputs[slotIdx] = null;
    if (target === 'pockets') {
      const added = addItemToPlayer(player, item, { preferPockets: true, skipHands: true });
      if (!added) returnWorkbenchItemToPlayer(item);
    } else {
      returnWorkbenchItemToPlayer(item, target);
    }
    sound.playPickup();
    forceRender(n => n + 1);
  };

  const handleExecuteInteraction = () => {
    if (!evalResult.isValid) return;
    if (hasCommittedOutputs) {
      for (let i = 0; i < 4; i++) {
        if (interactionOutputs[i]) {
          returnWorkbenchItemToPlayer(interactionOutputs[i]!);
          interactionOutputs[i] = null;
        }
      }
    }

    const finalResult = evaluateInteractionGrid(interactionInputs, { applyPourJitter: true });
    if (!finalResult.isValid) return;

    for (let i = 0; i < 4; i++) {
      interactionInputs[i] = null;
      interactionOutputs[i] = finalResult.previewOutputs[i]
        ? JSON.parse(JSON.stringify(finalResult.previewOutputs[i]))
        : null;
    }

    if (finalResult.kind === 'pour_liquid' || finalResult.kind === 'mix_liquid') {
      sound.playWaterSpray();
    } else {
      sound.playUseItem();
    }
    addPlayerNotification(player, `${finalResult.title}: ${finalResult.subtitle}`, 'heal');
    forceRender(n => n + 1);
  };

  const handleClaimOutputSlot = (slotIdx: number, target?: 'left' | 'right' | 'pockets') => {
    const item = interactionOutputs[slotIdx];
    if (!item) return;
    interactionOutputs[slotIdx] = null;
    if (target === 'pockets') {
      const added = addItemToPlayer(player, item, { preferPockets: true, skipHands: true });
      if (!added) returnWorkbenchItemToPlayer(item);
    } else {
      returnWorkbenchItemToPlayer(item, target);
    }
    sound.playPickup();
    forceRender(n => n + 1);
  };

  const workbenchActiveCount =
    interactionInputs.filter(Boolean).length + interactionOutputs.filter(Boolean).length;

  // ==================== UNIFIED POINTER DRAG-AND-DROP ENGINE (SHADOW-DOM SAFE) ====================
  const ensureOutputsCommitted = (): boolean => {
    if (hasCommittedOutputs) return true;
    const currentEval = evaluateInteractionGrid(interactionInputs);
    if (!currentEval.isValid) return false;
    const finalResult = evaluateInteractionGrid(interactionInputs, { applyPourJitter: true });
    if (!finalResult.isValid) return false;
    for (let i = 0; i < 4; i++) {
      interactionInputs[i] = null;
      interactionOutputs[i] = finalResult.previewOutputs[i]
        ? JSON.parse(JSON.stringify(finalResult.previewOutputs[i]))
        : null;
    }
    if (finalResult.kind === 'pour_liquid' || finalResult.kind === 'mix_liquid') {
      sound.playWaterSpray();
    } else {
      sound.playUseItem();
    }
    return true;
  };

  const getSlotFillInfo = (item: InventoryItem | null | undefined) => {
    if (!item) return null;
    const wrap = getEffectiveFluidWrapper(item);
    if (wrap) {
      const st = wrap.state;
      const liq = st.liquidId ? LIQUID_REGISTRY[st.liquidId as LiquidId] : undefined;
      const unit = isFluidStorageDryForm(st) || wrap.isGranularContainer ? 'г' : 'мл';
      const bd = getContainerCapacityBreakdown(item);
      const hasSolids = Boolean(item.contents && item.contents.length > 0);
      const pct = bd.totalCapacityMl > 0
        ? Math.max(0, Math.min(100, Math.round(bd.totalPct)))
        : (st.maxMl > 0 ? Math.max(0, Math.min(100, Math.round((st.currentMl / st.maxMl) * 100))) : 0);
      const subName =
        st.currentMl <= 0 || !st.liquidId
          ? (hasSolids ? `Предметы (${item.contents!.length} шт.)` : 'Пусто')
          : st.attributes?.varietyRu || liq?.nameRu || st.liquidId;
      const color = st.currentMl > 0 && st.liquidId
        ? (st.attributes?.customColor || liq?.color || '#38bdf8')
        : (hasSolids ? '#f59e0b' : '#38bdf8');
      const breakdownLine = hasSolids
        ? `\nПредметы: ${Math.round(bd.solidMl)} мл (${item.contents!.length} шт.) + Жидкость: ${Math.round(bd.liquidMl)} мл / ${bd.totalCapacityMl} мл`
        : `\n${subName}: ${Math.round(st.currentMl)} / ${st.maxMl} ${unit}`;
      return {
        pct,
        color,
        tooltip: `${item.nameRu}${breakdownLine}`,
      };
    }
    const pct =
      item.maxPortions && item.maxPortions > 1
        ? Math.max(0, Math.min(100, ((item.portions ?? item.maxPortions) / item.maxPortions) * 100))
        : null;
    const soakNote = item.soakedLiquidNameRu && (item.wetness || 0) >= 10
      ? `\nПропитка: ${item.soakedLiquidNameRu} (${Math.round(item.wetness || 0)}%)`
      : '';
    return {
      pct,
      color: undefined,
      tooltip: `${item.nameRu}\n${formatWeightRu(getItemTotalWeight(item))} · ${getItemTotalVolume(item)} л${soakNote}`,
    };
  };

  const handleUnifiedSlotDrop = (targetKey: string, sourceKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return;
    if (targetKey.startsWith('output:')) return;

    // 1. Moving between two inventory slots
    if (sourceKey.startsWith('inv:') && targetKey.startsWith('inv:')) {
      const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
      const toIdx = parseInt(targetKey.replace('inv:', ''), 10);
      if (isNaN(fromIdx) || isNaN(toIdx) || fromIdx === toIdx) return;
      const fromItem = player.inventory?.[fromIdx];
      const toItem = player.inventory?.[toIdx];
      if (!fromItem) return;

      if (toItem && toItem.id !== fromItem.id) {
        ensureHybridContainerProps(toItem);
        if (
          toItem.isContainer &&
          !toItem.singleUseContainer &&
          canItemFitInContainer(toItem, fromItem).fits
        ) {
          handlePutIntoContainer(toItem, fromIdx);
          return;
        }
      }

      if (moveInventoryItem(player, fromIdx, toIdx)) {
        sound.playPickup();
        setSelectedHand(null);
        setSelectedIndex(toIdx);
        forceRender(n => n + 1);
      }
      return;
    }

    // 1b. Pocket slot -> Workbench input slot
    if (sourceKey.startsWith('inv:') && targetKey.startsWith('input:')) {
      const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
      const tgtIdx = parseInt(targetKey.replace('input:', ''), 10);
      if (!isNaN(fromIdx) && !isNaN(tgtIdx)) {
        handlePlacePocketIntoInput(fromIdx, tgtIdx);
      }
      return;
    }

    // 2. Inventory slot <-> Hand slot
    if (sourceKey.startsWith('inv:') && (targetKey === 'hand:left' || targetKey === 'hand:right')) {
      const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
      const tgtHand = targetKey === 'hand:left' ? 'left' : 'right';
      if (!isNaN(fromIdx)) {
        handleTakeToHand(tgtHand, fromIdx);
        setSelectedHand(tgtHand);
      }
      return;
    }

    if ((sourceKey === 'hand:left' || sourceKey === 'hand:right') && targetKey.startsWith('inv:')) {
      const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
      const toIdx = parseInt(targetKey.replace('inv:', ''), 10);
      if (!isNaN(toIdx)) {
        handleStowHand(srcHand, toIdx);
        setSelectedHand(null);
        setSelectedIndex(toIdx);
      }
      return;
    }

    if ((sourceKey === 'hand:left' || sourceKey === 'hand:right') && targetKey === 'zone:pockets') {
      const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
      handleStowHand(srcHand);
      setSelectedHand(null);
      return;
    }

    // 3. Hand <-> Hand swap
    if (
      (sourceKey === 'hand:left' || sourceKey === 'hand:right') &&
      (targetKey === 'hand:left' || targetKey === 'hand:right')
    ) {
      const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
      const tgtHand = targetKey === 'hand:left' ? 'left' : 'right';
      const srcItem = takeItemFromHand(player, srcHand);
      if (!srcItem) return;
      const displaced = takeItemFromHand(player, tgtHand);
      putItemInHand(player, tgtHand, srcItem, world);
      if (displaced) {
        putItemInHand(player, srcHand, displaced, world);
      }
      sound.playPickup();
      setSelectedHand(tgtHand);
      forceRender(n => n + 1);
      return;
    }

    // 4. Opened Container <-> Hands / Pockets
    if (openContainer) {
      const isTargetContainer = targetKey.startsWith('cont:') || targetKey === 'zone:container';
      const isSourceContainer = sourceKey.startsWith('cont:') && !sourceKey.startsWith('cont:empty-');

      if (isTargetContainer && sourceKey.startsWith('inv:')) {
        const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
        if (!isNaN(fromIdx)) {
          handlePutIntoContainer(openContainer, fromIdx);
        }
        return;
      }

      if (isTargetContainer && (sourceKey === 'hand:left' || sourceKey === 'hand:right')) {
        const hand = sourceKey === 'hand:left' ? 'left' : 'right';
        const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
        if (!handItem) return;
        if (handItem.id === openContainer.id) {
          addPlayerNotification(player, 'Нельзя положить контейнер сам в себя', 'warning');
          return;
        }
        const taken = takeItemFromHand(player, hand);
        if (taken) {
          const res = addItemToContainer(openContainer, taken);
          if (res.success) {
            sound.playPickup();
            addPlayerNotification(player, res.message, 'pickup');
            forceRender(n => n + 1);
          } else {
            putItemInHand(player, hand, taken, world);
            addPlayerNotification(player, res.message, 'warning');
          }
        }
        return;
      }

      if (isSourceContainer) {
        const cIdx = parseInt(sourceKey.replace('cont:', ''), 10);
        if (isNaN(cIdx)) return;
        if (targetKey === 'hand:left' || targetKey === 'hand:right') {
          handleExtractFromContainer(openContainer, cIdx, targetKey === 'hand:left' ? 'leftHand' : 'rightHand');
          return;
        }
        if (targetKey.startsWith('inv:')) {
          const toSlotIdx = parseInt(targetKey.replace('inv:', ''), 10);
          handleExtractFromContainer(openContainer, cIdx, 'pockets', isNaN(toSlotIdx) ? undefined : toSlotIdx);
          return;
        }
        if (targetKey === 'zone:pockets') {
          handleExtractFromContainer(openContainer, cIdx, 'pockets');
          return;
        }
      }
    }

    // 5. Ground <-> Hands / Pockets
    if (sourceKey.startsWith('ground:') && !sourceKey.startsWith('ground:empty-')) {
      const groundId = sourceKey.replace('ground:', '');
      const gi = nearbyGroundItems.find(g => g.id === groundId);
      if (gi) {
        handlePickupGroundItem(gi, targetKey);
      }
      return;
    }

    if (targetKey.startsWith('ground:') || targetKey === 'zone:ground') {
      if (sourceKey.startsWith('inv:')) {
        const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
        if (!isNaN(fromIdx)) handleDropItem(fromIdx);
        return;
      }
      if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
        handleDropFromHand(sourceKey === 'hand:left' ? 'left' : 'right');
        return;
      }
    }

    // 6. Clothing <-> Hands / Pockets
    if (sourceKey.startsWith('cloth:')) {
      const parts = sourceKey.split(':');
      const slot = parts[1];
      const layer = parts[2];
      if (slot && layer) {
        const item = player.equippedClothing?.[slot as any]?.[layer as any];
        if (!item) return;
        handleUnequipItem(slot, layer);
      }
      return;
    }

    if (targetKey.startsWith('cloth:') || targetKey === 'zone:clothing') {
      if (sourceKey.startsWith('inv:')) {
        const fromIdx = parseInt(sourceKey.replace('inv:', ''), 10);
        if (!isNaN(fromIdx)) handleEquipItem(fromIdx);
        return;
      }
      if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
        handleEquipFromHand(sourceKey === 'hand:left' ? 'left' : 'right');
        return;
      }
    }

    // 7. Interaction Workbench <-> Hands / Input / Pockets
    let draggedItem: InventoryItem | null = null;
    if (sourceKey.startsWith('output:')) {
      const outIdx = parseInt(sourceKey.replace('output:', ''), 10);
      if (isNaN(outIdx) || outIdx < 0 || outIdx > 3) return;
      if (!ensureOutputsCommitted()) return;
      draggedItem = interactionOutputs[outIdx];
      if (!draggedItem) return;
      interactionOutputs[outIdx] = null;
    } else if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
      const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
      draggedItem = takeItemFromHand(player, srcHand);
      if (!draggedItem) return;
    } else if (sourceKey.startsWith('input:')) {
      const inIdx = parseInt(sourceKey.replace('input:', ''), 10);
      if (isNaN(inIdx) || inIdx < 0 || inIdx > 3) return;
      draggedItem = interactionInputs[inIdx];
      if (!draggedItem) return;
      interactionInputs[inIdx] = null;
    } else {
      return;
    }

    if (targetKey.startsWith('inv:') || targetKey === 'zone:pockets') {
      if (targetKey.startsWith('inv:')) {
        const toIdx = parseInt(targetKey.replace('inv:', ''), 10);
        if (!isNaN(toIdx) && toIdx >= 0) {
          if (!player.inventory) player.inventory = [];
          const existing = player.inventory[toIdx];
          if (!existing && canItemFitInCompartment(player, toIdx, draggedItem).fits) {
            player.inventory[toIdx] = draggedItem;
            sound.playPickup();
            forceRender(n => n + 1);
            return;
          }
        }
      }
      const added = addItemToPlayer(player, draggedItem, { preferPockets: true, skipHands: true });
      if (!added) {
        returnWorkbenchItemToPlayer(draggedItem);
      }
      sound.playPickup();
      forceRender(n => n + 1);
      return;
    }

    if (targetKey === 'hand:left' || targetKey === 'hand:right') {
      const tgtHand = targetKey === 'hand:left' ? 'left' : 'right';
      const displaced = takeItemFromHand(player, tgtHand);
      const res = putItemInHand(player, tgtHand, draggedItem, world);
      if (!res.success) {
        if (displaced) putItemInHand(player, tgtHand, displaced, world);
        returnWorkbenchItemToPlayer(draggedItem);
        forceRender(n => n + 1);
        return;
      }
      if (displaced) {
        if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
          const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
          putItemInHand(player, srcHand, displaced, world);
        } else if (sourceKey.startsWith('input:')) {
          const inIdx = parseInt(sourceKey.replace('input:', ''), 10);
          interactionInputs[inIdx] = displaced;
        } else {
          returnWorkbenchItemToPlayer(displaced);
        }
      }
      sound.playPickup();
      forceRender(n => n + 1);
      return;
    }

    if (targetKey.startsWith('input:')) {
      const tgtIdx = parseInt(targetKey.replace('input:', ''), 10);
      if (isNaN(tgtIdx) || tgtIdx < 0 || tgtIdx > 3) return;
      const displaced = interactionInputs[tgtIdx];
      interactionInputs[tgtIdx] = draggedItem;

      if (displaced) {
        if (sourceKey === 'hand:left' || sourceKey === 'hand:right') {
          const srcHand = sourceKey === 'hand:left' ? 'left' : 'right';
          putItemInHand(player, srcHand, displaced, world);
        } else if (sourceKey.startsWith('input:')) {
          const srcIdx = parseInt(sourceKey.replace('input:', ''), 10);
          interactionInputs[srcIdx] = displaced;
        } else {
          returnWorkbenchItemToPlayer(displaced);
        }
      }
      sound.playPickup();
      forceRender(n => n + 1);
    }
  };

  wbDropHandlerRef.current = handleUnifiedSlotDrop;

  // Quick Shift+Click transfer without drag
  const handleSlotShiftClick = (slotKey: string) => {
    setCtxMenu(null);
    if (slotKey.startsWith('inv:')) {
      const idx = parseInt(slotKey.replace('inv:', ''), 10);
      const item = player.inventory?.[idx];
      if (!item) return;
      if (openContainer && item.id !== openContainer.id) {
        handlePutIntoContainer(openContainer, idx);
        return;
      }
      if (activeTab === 'interaction') {
        handlePlacePocketIntoInput(idx);
        return;
      }
      if (activeTab === 'clothing' && item.category === 'clothing') {
        handleEquipItem(idx);
        return;
      }
      if (activeTab === 'surroundings') {
        handleDropItem(idx);
        return;
      }
      const targetHand: 'left' | 'right' = !player.rightHandItem ? 'right' : !player.leftHandItem ? 'left' : 'right';
      handleTakeToHand(targetHand, idx);
      return;
    }

    if (slotKey === 'hand:left' || slotKey === 'hand:right') {
      const hand = slotKey === 'hand:left' ? 'left' : 'right';
      const handItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
      if (!handItem) return;
      if (openContainer && handItem.id !== openContainer.id) {
        handleUnifiedSlotDrop('zone:container', slotKey);
        return;
      }
      if (activeTab === 'interaction') {
        handlePlaceHandIntoInput(hand, 'any');
        return;
      }
      handleStowHand(hand);
      return;
    }

    if (slotKey.startsWith('cont:') && !slotKey.startsWith('cont:empty-') && openContainer) {
      const cIdx = parseInt(slotKey.replace('cont:', ''), 10);
      if (!isNaN(cIdx)) handleExtractFromContainer(openContainer, cIdx, 'pockets');
      return;
    }

    if (slotKey.startsWith('ground:') && !slotKey.startsWith('ground:empty-')) {
      const groundId = slotKey.replace('ground:', '');
      const gi = nearbyGroundItems.find(g => g.id === groundId);
      if (gi) handlePickupGroundItem(gi);
      return;
    }

    if (slotKey.startsWith('cloth:')) {
      const parts = slotKey.split(':');
      if (parts[1] && parts[2]) handleUnequipItem(parts[1], parts[2]);
      return;
    }

    if (slotKey.startsWith('input:')) {
      const inIdx = parseInt(slotKey.replace('input:', ''), 10);
      if (!isNaN(inIdx)) handleRemoveInputSlot(inIdx, 'pockets');
      return;
    }

    if (slotKey.startsWith('output:')) {
      const outIdx = parseInt(slotKey.replace('output:', ''), 10);
      if (!isNaN(outIdx) && ensureOutputsCommitted()) {
        handleClaimOutputSlot(outIdx, 'pockets');
      }
    }
  };

  const handleSlotContextMenu = (
    e: React.MouseEvent<HTMLElement>,
    slotKey: string,
    item: InventoryItem | null | undefined
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item) {
      setCtxMenu(null);
      return;
    }
    const maxX = typeof window !== 'undefined' ? window.innerWidth - 210 : e.clientX;
    const maxY = typeof window !== 'undefined' ? window.innerHeight - 240 : e.clientY;
    setCtxMenu({
      x: Math.max(8, Math.min(e.clientX, maxX)),
      y: Math.max(8, Math.min(e.clientY, maxY)),
      slotKey,
      item,
    });
  };

  const { dragUi: wbDragUi, ghostRef, startSlotDrag } = useCachedSlotDrag<InventoryItem>({
    rootRef: gmRef,
    slotAttr: 'data-wb-slot',
    zoneAttr: 'data-wb-drop-zone',
    canTargetSlot: (targetKey, sourceKey) => targetKey !== sourceKey && !targetKey.startsWith('output:'),
    resolvePriorityTarget: (x, y, sourceKey, scope) => {
      const inputGrid = scope.querySelector<HTMLElement>('[data-wb-input-grid]');
      if (inputGrid) {
        const gRect = inputGrid.getBoundingClientRect();
        if (x >= gRect.left - 14 && x <= gRect.right + 14 && y >= gRect.top - 14 && y <= gRect.bottom + 14) {
          const emptyIdx = [0, 1, 2, 3].find(i => !interactionInputs[i]);
          const fallbackIdx = emptyIdx !== undefined ? emptyIdx : 0;
          const candidate = `input:${fallbackIdx}`;
          if (candidate !== sourceKey) return candidate;
        }
      }
      return null;
    },
    onDrop: (targetKey, sourceKey) => {
      wbDropHandlerRef.current?.(targetKey, sourceKey);
      setSelectedWbSlot(null);
    },
  });

  const startSlotPointerDrag = (
    e: React.PointerEvent<HTMLElement>,
    slotKey: string,
    item: InventoryItem | null | undefined,
    onSelectClick?: () => void
  ) => {
    setCtxMenu(null);
    if (e.button === 0 && e.shiftKey) {
      e.stopPropagation();
      if (item) handleSlotShiftClick(slotKey);
      return;
    }
    startSlotDrag(e, slotKey, item, () => {
      if (!item) {
        if (selectedWbSlot && selectedWbSlot !== slotKey && !slotKey.startsWith('output:')) {
          wbDropHandlerRef.current?.(slotKey, selectedWbSlot);
          setSelectedWbSlot(null);
        } else {
          onSelectClick?.();
        }
        return;
      }
      onSelectClick?.();
      setSelectedWbSlot(slotKey);
    });
  };

  // Compact square Hand Slot
  const renderHandSquareSlot = (hand: 'left' | 'right', shortBadge: string, label: string, handItem: InventoryItem | null | undefined) => {
    const slotKey = `hand:${hand}`;
    const isBeingDragged = wbDragUi?.sourceKey === slotKey;
    const isDropTarget = wbDragUi?.overKey === slotKey;
    const isSelected = selectedHand === hand || selectedWbSlot === slotKey;
    const info = getSlotFillInfo(handItem);
    const temp = handItem?.surfaceTemperature;
    const isHot = temp !== undefined && temp >= 40;
    const isCold = temp !== undefined && temp <= 4;
    const pkgInner = getPackagedInnerItem(handItem);
    const isTrash = isDisposableTrashOrEmptyPackaging(handItem);

    return (
      <div
        key={slotKey}
        id={`inv-${hand}-hand-card`}
        data-wb-slot={slotKey}
        draggable={false}
        onDragStart={e => e.preventDefault()}
        onContextMenu={e => handleSlotContextMenu(e, slotKey, handItem)}
        onPointerDown={e =>
          startSlotPointerDrag(e, slotKey, handItem, () => {
            setSelectedHand(hand);
          })
        }
        onDoubleClick={() => {
          if (!handItem) return;
          if (openContainer && handItem.id !== openContainer.id) {
            handleUnifiedSlotDrop('zone:container', slotKey);
            return;
          }
          if (activeTab === 'interaction') {
            handlePlaceHandIntoInput(hand, 'any');
            return;
          }
          if (shouldOpenContainerOnActivate(handItem)) {
            setOpenContainer(handItem);
            setSelectedContainerItemIdx(0);
          } else if (handItem.usable || handItem.fluidStorage || handItem.isContainer) {
            handleUseHandItem(hand, true);
          } else {
            handleStowHand(hand);
          }
        }}
        className={
          'inv-slot' +
          (!handItem ? ' empty' : '') +
          (isDropTarget || isSelected ? ' on' : '') +
          (isHot ? ' hot' : '') +
          (isCold ? ' cold' : '') +
          (isTrash ? ' is-trash' : '')
        }
        style={{
          cursor: handItem ? 'grab' : selectedWbSlot ? 'pointer' : 'default',
          opacity: isBeingDragged ? 0.35 : 1,
          borderColor: isDropTarget ? '#e0ab45' : undefined,
        }}
        title={
          handItem
            ? `${label}: ${pkgInner ? getItemReadableTitleRu(handItem) : ''}${pkgInner ? '\n' : ''}${info?.tooltip || handItem.nameRu}`
            : `${label} (пусто — перетащите предмет)`
        }
      >
        <span className="inv-hk">{shortBadge}</span>
        {handItem ? (
          <>
            <ItemIconCanvas itemId={handItem.itemId} item={handItem} size={42} />
            {pkgInner && (
              <span className="inv-pkg-sub" title={pkgInner.nameRu}>
                <ItemIconCanvas itemId={pkgInner.itemId} item={pkgInner} size={18} />
              </span>
            )}
            {handItem.count > 1 ? (
              <span className="inv-cnt">{handItem.count}</span>
            ) : handItem.isContainer && !pkgInner ? (
              <span className="inv-cnt">{handItem.contents?.length || 0}</span>
            ) : null}
            {isHot && <span className="inv-temp">+{Math.round(temp!)}°</span>}
            {isCold && <span className="inv-temp cold">{Math.round(temp!)}°</span>}
            {(handItem.wetness ?? 0) > 0 && (
              <span className="inv-wet">
                <CloudRain width={11} height={11} />
              </span>
            )}
            {info && info.pct !== null && (
              <div className="inv-fill">
                <i style={{ width: `${info.pct}%`, background: info.color || undefined }} />
              </div>
            )}
          </>
        ) : (
          <Hand width={18} height={18} color="#5e5b54" style={{ pointerEvents: 'none' }} />
        )}
      </div>
    );
  };

  // Reusable Player Hands + Compartments Slot Grid
  const renderCompartmentsSlotGrid = () => {
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

    const handsCount = (player.leftHandItem ? 1 : 0) + (player.rightHandItem ? 1 : 0);
    const handsSummary = [
      player.leftHandItem ? `Л: ${player.leftHandItem.nameRu}` : null,
      player.rightHandItem ? `П: ${player.rightHandItem.nameRu}` : null
    ].filter(Boolean).join(' · ');

    return (
      <div data-wb-drop-zone="zone:pockets">
        {/* Hands group — single-line header, never wraps or overflows */}
        <div className="inv-group">
          <div className="inv-group-h">
            <span className="inv-group-t">
              <Hand width={15} height={15} />
              Активные руки
            </span>
            <span className="inv-group-meta mono" title={handsSummary || 'Руки свободны'}>
              {handsCount}/2{handsSummary ? ` · ${handsSummary}` : ' · свободно'}
            </span>
          </div>
          <div className="inv-slots">
            {renderHandSquareSlot('left', 'Л', 'Левая рука', player.leftHandItem)}
            {renderHandSquareSlot('right', 'П', 'Правая рука', player.rightHandItem)}
          </div>
        </div>

        {compartments.map(comp => {
          const slots = Array.from({ length: comp.slotCount }, (_, l) => comp.startIndex + l);
          const compVolumePct = Math.round((comp.usedVolumeL / comp.capacityL) * 100);
          const compWeightPct = Math.round((comp.usedWeightKg / comp.maxWeightKg) * 100);

          return (
            <div key={comp.id} className="inv-group">
              <div className="inv-group-h">
                <span className="inv-group-t">
                  {getCompIcon(comp.iconType)}
                  {comp.nameRu}
                </span>
                <span className="inv-group-meta mono">
                  <span className={compVolumePct > 95 ? 'bad' : ''}>{comp.usedVolumeL}/{comp.capacityL} л</span>
                  {' · '}
                  <span className={compWeightPct > 95 ? 'bad' : ''}>{comp.usedWeightKg}/{comp.maxWeightKg} кг</span>
                </span>
              </div>

              <div className="inv-slots">
                {slots.map(slotIdx => {
                  const item = inventory[slotIdx];
                  const slotKey = `inv:${slotIdx}`;
                  const isBeingDragged = wbDragUi?.sourceKey === slotKey;
                  const isDropTarget = wbDragUi?.overKey === slotKey;
                  const isSelected = (!selectedHand && selectedIndex === slotIdx) || selectedWbSlot === slotKey;

                  if (!item) {
                    return (
                      <div
                        key={slotIdx}
                        id={`inventory-slot-${slotIdx}`}
                        data-wb-slot={slotKey}
                        draggable={false}
                        onDragStart={e => e.preventDefault()}
                        onPointerDown={e =>
                          startSlotPointerDrag(e, slotKey, null, () => {
                            setSelectedHand(null);
                            setSelectedIndex(slotIdx);
                          })
                        }
                        className={'inv-slot empty' + (isDropTarget ? ' on' : '')}
                        style={{ borderColor: isDropTarget ? '#e0ab45' : undefined }}
                      >
                        {slotIdx < 6 && <span className="inv-hk">{slotIdx + 1}</span>}
                      </div>
                    );
                  }

                  const temp = item.surfaceTemperature;
                  const isHot = temp !== undefined && temp >= 40;
                  const isCold = temp !== undefined && temp <= 4;
                  const info = getSlotFillInfo(item);
                  const pkgInner = getPackagedInnerItem(item);
                  const isTrash = isDisposableTrashOrEmptyPackaging(item);

                  return (
                    <div
                      key={slotIdx}
                      id={`inventory-slot-${slotIdx}`}
                      data-wb-slot={slotKey}
                      draggable={false}
                      onDragStart={e => e.preventDefault()}
                      onContextMenu={e => handleSlotContextMenu(e, slotKey, item)}
                      onPointerDown={e =>
                        startSlotPointerDrag(e, slotKey, item, () => {
                          setSelectedHand(null);
                          setSelectedIndex(slotIdx);
                        })
                      }
                      onDoubleClick={() => {
                        if (openContainer) {
                          if (item.id !== openContainer.id) {
                            handlePutIntoContainer(openContainer, slotIdx);
                          }
                          return;
                        }
                        if (activeTab === 'interaction') {
                          handlePlacePocketIntoInput(slotIdx);
                          return;
                        }
                        if (shouldOpenContainerOnActivate(item)) {
                          setOpenContainer(item);
                          setSelectedContainerItemIdx(0);
                        } else {
                          handleUseItem(slotIdx);
                        }
                      }}
                      className={
                        'inv-slot' +
                        (isSelected || isDropTarget ? ' on' : '') +
                        (matchesFilter(item) ? '' : ' dim') +
                        (isHot ? ' hot' : '') +
                        (isCold ? ' cold' : '') +
                        (isTrash ? ' is-trash' : '')
                      }
                      style={{
                        cursor: 'grab',
                        opacity: isBeingDragged ? 0.35 : 1,
                        borderColor: isDropTarget ? '#e0ab45' : undefined,
                      }}
                      title={pkgInner ? `${getItemReadableTitleRu(item)}\n${info?.tooltip || ''}` : info?.tooltip}
                    >
                      {slotIdx < 6 && <span className="inv-hk">{slotIdx + 1}</span>}
                      <ItemIconCanvas itemId={item.itemId} item={item} size={42} />
                      {pkgInner && (
                        <span className="inv-pkg-sub" title={pkgInner.nameRu}>
                          <ItemIconCanvas itemId={pkgInner.itemId} item={pkgInner} size={18} />
                        </span>
                      )}
                      {item.count > 1 ? (
                        <span className="inv-cnt">{item.count}</span>
                      ) : item.isContainer && !pkgInner ? (
                        <span className="inv-cnt">{item.contents?.length || 0}</span>
                      ) : null}
                      {isHot && <span className="inv-temp">+{Math.round(temp!)}°</span>}
                      {isCold && <span className="inv-temp cold">{Math.round(temp!)}°</span>}
                      {(item.wetness ?? 0) > 0 && (
                        <span className="inv-wet">
                          <CloudRain width={11} height={11} />
                        </span>
                      )}
                      {info && info.pct !== null && (
                        <div className="inv-fill">
                          <i style={{ width: `${info.pct}%`, background: info.color || undefined }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const tabItems: {
    id: 'inventory' | 'interaction' | 'surroundings' | 'clothing' | 'catalog';
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { id: 'inventory', label: 'Карманы', icon: <Package width={15} height={15} />, badge: inventory.filter(Boolean).length },
    { id: 'interaction', label: 'Взаимодействие', icon: <Layers width={15} height={15} />, badge: workbenchActiveCount > 0 ? workbenchActiveCount : undefined },
    { id: 'surroundings', label: 'Рядом', icon: <Sparkles width={15} height={15} />, badge: nearbyGroundItems.length },
    { id: 'clothing', label: 'Одежда', icon: <Shirt width={15} height={15} /> },
    ...(isFreeroam
      ? [{ id: 'catalog' as const, label: 'Каталог', icon: <Wand2 width={15} height={15} />, badge: catalogAllItems.length }]
      : [])
  ];

  const speedColor = weightSpeedPct >= 95 ? '#9ac985' : weightSpeedPct >= 70 ? '#f0c264' : '#f2b4a0';

  return (
    <ShadowHost css={inventoryModalCss} zIndex={50} background="transparent">
      <div id="w" ref={wrapRef}>
        <div className={'bd' + (!entered ? ' gone' : '')} />
        <div id="inventory-modal" className={'gm' + (!entered ? ' gone' : '')} ref={gmRef}>
          {/* Main Menu ambient glow & vignette */}
          <div
            className="a"
            style={{
              inset: 0,
              background: 'radial-gradient(900px 520px at 72% 84%, rgba(201,146,43,.22), transparent 62%)'
            }}
          />
          <div
            className="a"
            style={{
              inset: 0,
              background: 'linear-gradient(90deg, rgba(9,9,10,.88), rgba(9,9,10,.36) 50%, rgba(9,9,10,.6) 100%)'
            }}
          />

          {/* Top Bar */}
          <div className="top">
            <div className="top-l">
              <button
                type="button"
                className="chip back"
                onClick={openContainer ? () => setOpenContainer(null) : onClose}
                aria-label={openContainer ? 'Вернуться в карманы' : 'Закрыть инвентарь'}
                title={openContainer ? 'В карманы' : 'Закрыть'}
              >
                {openContainer ? (
                  <ChevronLeft size={21} strokeWidth={2} color="#e9e6df" />
                ) : (
                  <X size={20} strokeWidth={2} color="#e9e6df" />
                )}
              </button>
              <span className="cn ttl">Инвентарь и нагрузка</span>
              <span className="sub-top">Объём, вес, карманы и активные руки</span>
            </div>

            <div className="top-r">
              <div className="chip">
                <Weight width={15} height={15} color="#c9922b" />
                <span className="mut">Вес:</span>
                <strong className="mono" style={{ color: '#fff' }}>{carriedWeight} кг</strong>
              </div>
              <div className="chip">
                <span className="mut">Скорость:</span>
                <strong className="mono" style={{ color: speedColor }}>
                  {weightSpeedPct}%{isBulkyHand ? ' (Груз)' : ''}
                </strong>
              </div>
              <div className="chip">
                <span className="mut">Карманы:</span>
                <strong className="mono" style={{ color: '#e0ab45' }}>
                  {pocketCap.usedVolumeL} / {pocketCap.totalCapacityL} л
                </strong>
              </div>
              {openContainer && (
                <button
                  type="button"
                  className="chip back"
                  onClick={onClose}
                  aria-label="Закрыть инвентарь"
                  title="Закрыть"
                >
                  <X size={19} strokeWidth={2} color="#a29e93" />
                </button>
              )}
            </div>
          </div>

          {/* Main Menu Tabs + Single-Row Category Filter Pills */}
          <div className="inv-tabbar">
            <div className="inv-tabs" role="tablist">
              {tabItems.map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.id}
                  className={'inv-tab' + (activeTab === t.id ? ' on' : '')}
                  onClick={() => {
                    sound.playButtonPress();
                    setActiveTab(t.id);
                    setOpenContainer(null);
                  }}
                >
                  {t.icon}
                  <span>{t.label}</span>
                  {t.badge !== undefined && <span className="inv-tab-n">{t.badge}</span>}
                </button>
              ))}
            </div>

            {activeTab === 'inventory' && !openContainer && (() => {
              const playerTrashCount = countDisposableTrashOnPlayer(player);
              const nearTrashBin = Boolean(world && isPlayerNearTrashBin(player, world));
              return (
                <div className="inv-pills">
                  {[
                    { id: 'all', label: 'Все' },
                    { id: 'weapon', label: 'Оружие' },
                    { id: 'ammo', label: 'Боеприпасы' },
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
                        className={'inv-pill' + (on ? ' on' : '')}
                      >
                        {cat.label}
                      </button>
                    );
                  })}

                  <span className="inv-pill-sep" />

                  <button
                    type="button"
                    id="btn-pockets-organize"
                    className="inv-pill-act"
                    title="Упорядочить предметы и объединить стопки внутри карманов и рюкзака"
                    onClick={() => {
                      const res = organizePlayerInventoryInPlace(player);
                      sound.playPickup();
                      addPlayerNotification(
                        player,
                        res.changed
                          ? res.mergedCount > 0
                            ? `Карманы упорядочены (объединено стопок: ${res.mergedCount})`
                            : 'Карманы упорядочены'
                          : 'В карманах уже порядок',
                        'info'
                      );
                      forceRender(n => n + 1);
                    }}
                  >
                    <ArrowUpDown width={13} height={13} color="#e0ab45" />
                    <span>Порядок</span>
                  </button>

                  {nearTrashBin && playerTrashCount > 0 && world && (
                    <button
                      type="button"
                      id="btn-pockets-sweep-trash"
                      className="inv-pill-act danger"
                      title="Выбросить пустые упаковки, обёртки и уличный мусор в ближайшую урну"
                      onClick={() => {
                        const res = sweepTrashFromPlayerToBin(player, world);
                        if (res.removedCount > 0) {
                          sound.playUseItem();
                          addPlayerNotification(player, res.messageRu, res.ecoReward > 0 ? 'heal' : 'info');
                          forceRender(n => n + 1);
                        }
                      }}
                    >
                      <Trash2 width={13} height={13} />
                      <span>В урну ({playerTrashCount})</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Main Workspace */}
          <div className="inv-body">
            {/* ==================== TAB 1: INVENTORY & POCKETS ==================== */}
            {activeTab === 'inventory' && !openContainer && (
              <div className="inv-split">
                {/* LEFT: Restore banner + Scrollable Hands & Compartments */}
                <div className="inv-left-wrap">
                  {(!hasWallet || !hasBag) && (
                    <div
                      className="note note-warn"
                      style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '6px 12px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <Sparkles width={14} height={14} style={{ flex: 'none' }} />
                        <span>
                          {!hasWallet && !hasBag
                            ? 'Кошелёк и пакет не найдены в инвентаре'
                            : !hasWallet
                            ? 'Кожаный бумажник не найден'
                            : 'Пакет для покупок не найден'}
                        </span>
                      </div>
                      <button
                        type="button"
                        id="btn-restore-containers"
                        className="btn btn-p btn-xs"
                        onClick={() => {
                          restoreStarterContainers(player);
                          forceRender(n => n + 1);
                        }}
                      >
                        Восстановить
                      </button>
                    </div>
                  )}

                  <section className="panel inv-col" style={{ flex: 1 }}>
                    <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                      {renderCompartmentsSlotGrid()}
                    </div>
                  </section>
                </div>

                {/* RIGHT: Selected Item Inspector */}
                <section className="panel inv-col">
                  {selectedEntry && selectedEntry.item ? (
                    <>
                      {/* Pinned Item Header */}
                      <div className="inv-detail-head">
                        <div className="inv-detail-ic">
                          <ItemIconCanvas itemId={selectedEntry.item.itemId} item={selectedEntry.item} size={42} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="cn inv-detail-title" title={selectedEntry.item.nameRu}>
                            {selectedEntry.item.nameRu}
                          </div>
                          <div className="inv-detail-meta mono">
                            <span style={{ color: '#e0ab45', fontWeight: 600 }}>
                              {selectedEntry.item.category === 'food'
                                ? 'Еда'
                                : selectedEntry.item.category === 'drink'
                                ? 'Напиток'
                                : selectedEntry.item.category === 'med'
                                ? 'Медицина'
                                : selectedEntry.item.category === 'tool'
                                ? 'Инструмент'
                                : 'Предмет'}
                            </span>
                            {' · '}
                            {selectedEntry.item.count} шт.
                            {' · '}
                            {formatWeightRu(getItemTotalWeight(selectedEntry.item))}
                            {' · '}
                            <strong style={{ color: '#f4f1ea' }}>{getItemTotalVolume(selectedEntry.item)} л</strong>
                          </div>
                          {selectedEntry.hand ? (
                            <div className="inv-detail-loc">
                              <span style={{ color: '#f0c264' }}>
                                {selectedEntry.hand === 'left' ? 'Левая рука' : 'Правая рука'}
                              </span>
                            </div>
                          ) : (() => {
                            const slotComp = getSlotCompartment(player, selectedEntry.originalIndex);
                            if (!slotComp) return null;
                            return (
                              <div className="inv-detail-loc">
                                <span style={{ color: '#f0c264' }}>{slotComp.compartment.nameRu}</span>
                                {slotComp.compartment.sourceItemNameRu && slotComp.compartment.id !== 'base' && (
                                  <span> ({slotComp.compartment.sourceItemNameRu})</span>
                                )}
                                <span> · Слот #{selectedEntry.originalIndex + 1}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Middle Scrollable Specs */}
                      <div className="inv-detail-scroll scroll">
                        <div className="note" style={{ fontSize: 12.5 }}>
                          {selectedEntry.item.descriptionRu}
                        </div>

                        {/* Weapon / Magazine / Ammo Live Ballistics & Maintenance Controls */}
                        {(isWeaponItemId(selectedEntry.item.itemId) ||
                          isMagazineItemId(selectedEntry.item.itemId) ||
                          isAmmoItemId(selectedEntry.item.itemId)) && (() => {
                          const it = selectedEntry.item;
                          const wSpec = WEAPON_SPECS[it.itemId];
                          const mSpec = MAGAZINE_SPECS[it.itemId];
                          const aSpec = AMMO_SPECS[it.itemId];
                          return (
                            <div
                              style={{
                                marginTop: 8,
                                padding: '8px 10px',
                                borderRadius: 6,
                                border: '1px solid rgba(201, 146, 43, 0.35)',
                                background: 'rgba(20, 20, 22, 0.72)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                fontSize: 11.5,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {wSpec && (
                                <>
                                  <div style={{ color: '#f0c264', fontWeight: 700 }}>
                                    {getWeaponDisplaySubtitleRu(it)}
                                  </div>
                                  <div style={{ color: 'rgba(242,238,231,0.75)' }}>
                                    Начальная скорость: {wSpec.muzzleVelocityMs} м/с · Дальность: {wSpec.effectiveRangeM} м · Нагар: {Math.round(it.weaponState?.fouling ?? 0)}%
                                  </div>
                                  {it.weaponState?.insertedMag && (
                                    <button
                                      type="button"
                                      className="btn btn-s btn-sm"
                                      onClick={() => {
                                        const res = ejectWeaponMagazine(player, it);
                                        addPlayerNotification(player, res.messageRu, res.ok ? 'info' : 'warning');
                                        forceRender(n => n + 1);
                                      }}
                                    >
                                      <span>Извлечь магазин</span>
                                    </button>
                                  )}
                                </>
                              )}
                              {mSpec && (
                                <>
                                  <div style={{ color: '#f0c264', fontWeight: 700 }}>
                                    Калибр {mSpec.caliber} · Снаряжено {it.magazineState?.rounds.length ?? 0}/{mSpec.capacity}
                                    {it.magazineState?.hasIntegratedCo2 ? ` · CO2 ${Math.round(it.magazineState.co2Pressure ?? 0)}%` : ''}
                                  </div>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      className="btn btn-p btn-sm"
                                      onClick={() => {
                                        const res = loadMagazineFromInventory(player, it);
                                        addPlayerNotification(player, res.messageRu, res.loadedCount > 0 ? 'info' : 'warning');
                                        forceRender(n => n + 1);
                                      }}
                                    >
                                      <span>Снарядить</span>
                                    </button>
                                    {(it.magazineState?.rounds.length ?? 0) > 0 && (
                                      <button
                                        type="button"
                                        className="btn btn-s btn-sm"
                                        onClick={() => {
                                          const res = unloadMagazineToInventory(player, it);
                                          addPlayerNotification(player, res.messageRu, res.unloadedCount > 0 ? 'info' : 'warning');
                                          forceRender(n => n + 1);
                                        }}
                                      >
                                        <span>Разрядить</span>
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                              {aSpec && (
                                <div style={{ color: 'rgba(242,238,231,0.82)' }}>
                                  Калибр: {aSpec.caliberRu} · Масса пули: {aSpec.massGrams} г · Пробитие: {aSpec.penetration} · Экспансивность: {aSpec.expansion.toFixed(1)}x
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Unified Attributes */}
                        {(() => {
                          const it = selectedEntry.item;
                          ensureHybridContainerProps(it);
                          const uAttrs = getUnifiedItemAttributes(it);
                          const fs = it.fluidStorage;
                          const liq = fs?.liquidId ? LIQUID_REGISTRY[fs.liquidId as LiquidId] : undefined;
                          const hasFluid = Boolean(fs?.liquidId && fs.currentMl > 0);
                          const hasHybridCapacity = Boolean(fs && it.isContainer);
                          const capBreakdown = hasHybridCapacity ? getContainerCapacityBreakdown(it) : null;
                          const hasSoakedCoating = Boolean(it.soakedLiquidId && (it.wetness || 0) >= 10);
                          const isDryFluid = fs ? isFluidStorageDryForm(fs) : Boolean(liq?.isGranular);
                          const fluidUnit = isDryFluid ? 'г' : 'мл';
                          const fluidCurrentDisplay = fs
                            ? Math.round(isDryFluid ? fs.currentMl * (liq?.densityKgPerL || 1) : fs.currentMl)
                            : 0;
                          const fluidMaxDisplay = fs
                            ? Math.round(isDryFluid ? fs.maxMl * (liq?.densityKgPerL || 1) : fs.maxMl)
                            : 0;

                          const innerFirst = it.contents && it.contents.length > 0 ? it.contents[0] : undefined;
                          const innerAttrs = innerFirst ? getUnifiedItemAttributes(innerFirst) : undefined;
                          const detailSource = (uAttrs.doughNameRu || uAttrs.fillingRu || uAttrs.outerMaterialRu || uAttrs.innerMaterialRu || uAttrs.flavorRu) ? uAttrs : (innerAttrs || uAttrs);

                          const vis = uAttrs.visuals;
                          const swatchColor =
                            vis?.color ||
                            uAttrs.customColor ||
                            (hasFluid ? liq?.color : undefined);

                          const rawIngredients = uAttrs.ingredients ?? uAttrs.sourceIngredients;
                          const ingText = Array.isArray(rawIngredients)
                            ? rawIngredients.filter(Boolean).join(', ')
                            : rawIngredients;

                          const shapeLabel =
                            uAttrs.productShapeRu ||
                            vis?.shapeNameRu ||
                            it.packagingShapeNameRu ||
                            (it.packagingShape
                              ? (it.itemId.startsWith('chocolate_pack')
                                  ? getChocolatePackagingShapeNameRu(it.packagingShape as ChocolatePackagingShape)
                                  : getCandyPackagingShapeNameRu(it.packagingShape as CandyPackagingShape))
                              : undefined);
                          const innerShapeLabel =
                            innerFirst && detailSource !== uAttrs
                              ? detailSource.visuals?.shapeNameRu
                              : undefined;
                          const sizeLabel = vis?.sizeNameRu || uAttrs.sizeNameRu;
                          const innerSizeLabel =
                            innerFirst && detailSource !== uAttrs
                              ? detailSource.visuals?.sizeNameRu || detailSource.sizeNameRu
                              : undefined;
                          const materialLabel = vis?.materialNameRu;

                          const stateBadge =
                            hasHybridCapacity && capBreakdown
                              ? `${Math.round(capBreakdown.usedMl)} / ${capBreakdown.totalCapacityMl} мл`
                              : hasFluid && fs
                              ? (uAttrs.stateNameRu || `${fluidCurrentDisplay} / ${fluidMaxDisplay} ${fluidUnit}`)
                              : uAttrs.stateNameRu;

                          const colorLabel = vis?.colorNameRu || uAttrs.substanceColorRu;
                          const capacityMlVal = uAttrs.capacityMl;
                          const capacityLabel =
                            capacityMlVal !== undefined && capacityMlVal > 0
                              ? (capacityMlVal >= 1000
                                  ? `${Number((capacityMlVal / 1000).toFixed(2))} л (${capacityMlVal} мл)`
                                  : `${capacityMlVal} мл`)
                              : undefined;
                          const hasAnySpec = Boolean(
                            hasFluid ||
                            hasHybridCapacity ||
                            hasSoakedCoating ||
                            shapeLabel ||
                            sizeLabel ||
                            materialLabel ||
                            colorLabel ||
                            uAttrs.patternRu ||
                            uAttrs.coatingRu ||
                            capacityLabel ||
                            uAttrs.lidRu ||
                            uAttrs.handleRu ||
                            uAttrs.featureRu ||
                            uAttrs.dimensionCm ||
                            uAttrs.physicalFormRu ||
                            it.containerCapacityL ||
                            detailSource.flavorRu ||
                            detailSource.doughNameRu ||
                            detailSource.fillingRu ||
                            detailSource.outerMaterialRu ||
                            detailSource.innerMaterialRu ||
                            uAttrs.grainGradeRu ||
                            uAttrs.surfaceTextureRu ||
                            uAttrs.cookingTimeMin ||
                            uAttrs.proteinPer100g !== undefined ||
                            uAttrs.glutenFree !== undefined ||
                            ingText ||
                            uAttrs.preparationMethod ||
                            uAttrs.purpose ||
                            (uAttrs.varietyRu && uAttrs.varietyRu !== it.nameRu)
                          );

                          if (it.doughAttributes && !hasFluid && !hasHybridCapacity) return null;
                          if (!hasAnySpec) return null;

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div className="inv-sec-row">
                                <span className="inv-grp-lbl">
                                  {hasHybridCapacity
                                    ? 'Общая ёмкость (жидкость + предметы)'
                                    : hasFluid
                                    ? `Содержимое (${liq?.nameRu || fs!.liquidId})`
                                    : innerFirst && (innerFirst.pelmenAttributes || innerFirst.gummyAttributes || innerFirst.chocolateAttributes || innerAttrs?.doughNameRu || innerAttrs?.outerMaterialRu)
                                    ? `Упаковка и состав (${it.contents!.length} шт.)`
                                    : 'Атрибуты и состав'}
                                </span>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  {detailSource.sourDust && (
                                    <span style={{ fontSize: 11.5, color: '#e0ab45' }}>Кислая посыпка</span>
                                  )}
                                  {stateBadge && (
                                    <span className="mono" style={{ fontSize: 11.5, color: '#e0ab45', fontWeight: 600 }}>
                                      {stateBadge}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {hasHybridCapacity && capBreakdown && (
                                <div className="inv-meter-box">
                                  <div className="inv-meter-track">
                                    {capBreakdown.solidPct > 0 && (
                                      <div style={{ width: `${capBreakdown.solidPct}%`, background: '#f59e0b', height: '100%' }} />
                                    )}
                                    {capBreakdown.liquidPct > 0 && (
                                      <div style={{ width: `${capBreakdown.liquidPct}%`, background: capBreakdown.liquidColor, height: '100%' }} />
                                    )}
                                  </div>
                                  <div className="inv-meter-legend mono">
                                    <span>Предм.: <strong style={{ color: '#fbbf24' }}>{Math.round(capBreakdown.solidMl)} мл</strong> ({it.contents?.length || 0})</span>
                                    <span>Жидк.: <strong style={{ color: capBreakdown.liquidColor }}>{Math.round(capBreakdown.liquidMl)} мл</strong></span>
                                    <span>Своб.: <strong style={{ color: '#fff' }}>{Math.round(capBreakdown.freeMl)} мл</strong></span>
                                  </div>
                                </div>
                              )}

                              <div className="inv-kv-grid inv-kv-g3">
                                {hasSoakedCoating && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Пропитка жидкостью</span>
                                    <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                      <span className="inv-swatch" style={{ backgroundColor: it.soakedColor || '#38bdf8' }} />
                                      <span>
                                        {it.soakedLiquidNameRu || it.soakedLiquidId} (влажн. {Math.round(it.wetness || 0)}%)
                                        {it.infusionProgress && it.infusionProgress >= 0.45 ? ' · Настоялся' : ''}
                                      </span>
                                    </span>
                                  </div>
                                )}

                                {hasFluid && fs && (
                                  <>
                                    <div className="inv-kv" style={{ gridColumn: 'span 2' }}>
                                      <span className="inv-kv-k">
                                        {fs.liquidId === 'detergent'
                                          ? (isDryFluid ? 'Сыпучее средство' : 'Жидкое средство')
                                          : (isDryFluid ? 'Сыпучая фаза' : 'Жидкая фаза')}
                                      </span>
                                      <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        {swatchColor && <span className="inv-swatch" style={{ backgroundColor: swatchColor }} />}
                                        <span>{liq?.nameRu || fs.liquidId}</span>
                                      </span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">{isDryFluid ? 'Масса / Запас' : 'Объём жидк.'}</span>
                                      <span className="inv-kv-v mono">{fluidCurrentDisplay} / {fluidMaxDisplay} {fluidUnit}</span>
                                    </div>
                                  </>
                                )}

                                {uAttrs.physicalFormRu && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Форма средства</span>
                                    <span className="inv-kv-v">{uAttrs.physicalFormRu}</span>
                                  </div>
                                )}

                                {uAttrs.varietyRu && uAttrs.varietyRu !== it.nameRu && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Вид / Сорт</span>
                                    <span className="inv-kv-v">{uAttrs.varietyRu}</span>
                                  </div>
                                )}

                                {shapeLabel && (
                                  <div className="inv-kv" style={shapeLabel.length > 22 ? { gridColumn: '1 / -1' } : undefined}>
                                    <span className="inv-kv-k">Форма</span>
                                    <span className="inv-kv-v">{shapeLabel}</span>
                                  </div>
                                )}
                                {uAttrs.grainGradeRu && (
                                  <div className="inv-kv" style={{ gridColumn: 'span 2' }}>
                                    <span className="inv-kv-k">Сорт / Группа</span>
                                    <span className="inv-kv-v">{uAttrs.grainGradeRu}</span>
                                  </div>
                                )}
                                {uAttrs.cookingTimeMin && (
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Варка</span>
                                    <span className="inv-kv-v">{uAttrs.cookingTimeMin}</span>
                                  </div>
                                )}
                                {uAttrs.surfaceTextureRu && (
                                  <div className="inv-kv" style={{ gridColumn: 'span 2' }}>
                                    <span className="inv-kv-k">Поверхность</span>
                                    <span className="inv-kv-v">{uAttrs.surfaceTextureRu}</span>
                                  </div>
                                )}
                                {uAttrs.proteinPer100g !== undefined && (
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Белок (100г)</span>
                                    <span className="inv-kv-v mono">{uAttrs.proteinPer100g} г</span>
                                  </div>
                                )}
                                {uAttrs.glutenFree !== undefined && (
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Глютен</span>
                                    <span className="inv-kv-v">{uAttrs.glutenFree ? 'Без глютена' : 'Содержит глютен'}</span>
                                  </div>
                                )}
                                {sizeLabel && (
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Размер</span>
                                    <span className="inv-kv-v">{sizeLabel}</span>
                                  </div>
                                )}
                                {materialLabel && (
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Материал</span>
                                    <span className="inv-kv-v">{materialLabel}</span>
                                  </div>
                                )}
                                {uAttrs.coatingRu && (
                                  <div className="inv-kv" style={uAttrs.coatingRu.length > 20 ? { gridColumn: 'span 2' } : undefined}>
                                    <span className="inv-kv-k">Покрытие</span>
                                    <span className="inv-kv-v">{uAttrs.coatingRu}</span>
                                  </div>
                                )}
                                {capacityLabel && (
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Вмещает объём</span>
                                    <span className="inv-kv-v mono">{capacityLabel}</span>
                                  </div>
                                )}
                                {uAttrs.dimensionCm && (
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Габарит</span>
                                    <span className="inv-kv-v mono">{uAttrs.dimensionCm} см</span>
                                  </div>
                                )}
                                {!hasFluid && !capacityLabel && it.containerCapacityL && (
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Объём тары</span>
                                    <span className="inv-kv-v mono">{it.containerCapacityL} л</span>
                                  </div>
                                )}
                                {colorLabel && (
                                  <div className="inv-kv" style={colorLabel.length > 20 ? { gridColumn: '1 / -1' } : undefined}>
                                    <span className="inv-kv-k">Цвет</span>
                                    <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                      {swatchColor && <span className="inv-swatch" style={{ backgroundColor: swatchColor }} />}
                                      <span>{colorLabel}</span>
                                    </span>
                                  </div>
                                )}
                                {uAttrs.patternRu && (
                                  <div className="inv-kv" style={uAttrs.patternRu.length > 20 ? { gridColumn: 'span 2' } : undefined}>
                                    <span className="inv-kv-k">Узор</span>
                                    <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                      {uAttrs.patternColor && <span className="inv-swatch" style={{ backgroundColor: uAttrs.patternColor }} />}
                                      <span>{uAttrs.patternRu}</span>
                                    </span>
                                  </div>
                                )}
                                {uAttrs.lidRu && (
                                  <div className="inv-kv" style={uAttrs.lidRu.length > 20 ? { gridColumn: 'span 2' } : undefined}>
                                    <span className="inv-kv-k">Крышка</span>
                                    <span className="inv-kv-v">{uAttrs.lidRu}</span>
                                  </div>
                                )}
                                {uAttrs.handleRu && (
                                  <div className="inv-kv" style={uAttrs.handleRu.length > 20 ? { gridColumn: 'span 2' } : undefined}>
                                    <span className="inv-kv-k">Ручка</span>
                                    <span className="inv-kv-v">{uAttrs.handleRu}</span>
                                  </div>
                                )}
                                {uAttrs.featureRu && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Особенности</span>
                                    <span className="inv-kv-v">{uAttrs.featureRu}</span>
                                  </div>
                                )}
                                {detailSource.flavorRu && (
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Вкус</span>
                                    <span className="inv-kv-v">{detailSource.flavorRu}</span>
                                  </div>
                                )}
                                {detailSource.doughNameRu && (
                                  <>
                                    <div className="inv-kv" style={{ gridColumn: 'span 2' }}>
                                      <span className="inv-kv-k">
                                        Тесто{detailSource.doughThicknessMm ? ` (${detailSource.doughThicknessMm} мм)` : ''}
                                      </span>
                                      <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                        {detailSource.doughColor && <span className="inv-swatch" style={{ backgroundColor: detailSource.doughColor }} />}
                                        <span>{detailSource.doughNameRu}</span>
                                      </span>
                                    </div>
                                    {detailSource.fillingRatioPercent !== undefined && (
                                      <div className="inv-kv">
                                        <span className="inv-kv-k">Доля начинки</span>
                                        <span className="inv-kv-v mono">{detailSource.fillingRatioPercent}%</span>
                                      </div>
                                    )}
                                  </>
                                )}
                                {detailSource.fillingRu && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Начинка</span>
                                    <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                      {detailSource.fillingColor && <span className="inv-swatch" style={{ backgroundColor: detailSource.fillingColor }} />}
                                      <span>{detailSource.fillingRu}</span>
                                    </span>
                                  </div>
                                )}
                                {innerShapeLabel && innerShapeLabel !== shapeLabel && (
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Форма внутри</span>
                                    <span className="inv-kv-v">{innerShapeLabel}</span>
                                  </div>
                                )}
                                {innerSizeLabel && innerSizeLabel !== sizeLabel && (
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Размер внутри</span>
                                    <span className="inv-kv-v">{innerSizeLabel}</span>
                                  </div>
                                )}
                                {detailSource.outerMaterialRu && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">
                                      Внешняя часть{detailSource.cocoaPercent !== undefined ? ` (${detailSource.cocoaPercent}% какао)` : ''}
                                    </span>
                                    <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                      {detailSource.outerColor && <span className="inv-swatch" style={{ backgroundColor: detailSource.outerColor }} />}
                                      <span>
                                        {detailSource.outerMaterialRu}
                                        {detailSource.outerColorNameRu ? ` · Цвет: ${detailSource.outerColorNameRu}` : ''}
                                      </span>
                                    </span>
                                  </div>
                                )}
                                {detailSource.innerMaterialRu && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">
                                      Внутренняя часть{detailSource.hasFilling === false ? ' (однородная)' : ' (начинка)'}
                                    </span>
                                    <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                      {detailSource.innerColor && <span className="inv-swatch" style={{ backgroundColor: detailSource.innerColor }} />}
                                      <span>
                                        {detailSource.innerMaterialRu}
                                        {detailSource.innerColorNameRu ? ` · Цвет: ${detailSource.innerColorNameRu}` : ''}
                                      </span>
                                    </span>
                                  </div>
                                )}
                                {ingText && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Состав</span>
                                    <span className="inv-kv-v" style={{ fontWeight: 400, color: '#cfcbc1' }}>{ingText}</span>
                                  </div>
                                )}
                                {uAttrs.preparationMethod && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Приготовление</span>
                                    <span className="inv-kv-v" style={{ fontWeight: 400, color: '#cfcbc1' }}>{uAttrs.preparationMethod}</span>
                                  </div>
                                )}
                                {uAttrs.purpose && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Назначение</span>
                                    <span className="inv-kv-v" style={{ fontWeight: 400, color: '#cfcbc1' }}>{uAttrs.purpose}</span>
                                  </div>
                                )}
                                {uAttrs.tasteNotes && uAttrs.tasteNotes.length > 0 && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Вкусовые ноты</span>
                                    <span className="inv-kv-v" style={{ fontWeight: 400, color: '#cfcbc1' }}>{uAttrs.tasteNotes.join('; ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Thermodynamics */}
                        {(() => {
                          const thermalInfo = getItemThermalDisplayInfo(selectedEntry.item);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div className="inv-sec-row">
                                <span className="inv-grp-lbl">Термодинамика</span>
                                {thermalInfo.hazardBadge && (
                                  <span className="inv-hazard">
                                    <Flame width={11} height={11} />
                                    {thermalInfo.hazardBadge.text}
                                  </span>
                                )}
                              </div>
                              <div className="inv-kv-grid inv-kv-g4">
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Внутри</span>
                                  <span className="inv-kv-v mono">{thermalInfo.coreTempText}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Снаружи</span>
                                  <span className="inv-kv-v mono">{thermalInfo.surfaceTempText}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Потеря</span>
                                  <span className="inv-kv-v mono">{thermalInfo.heatLossText}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Удержание</span>
                                  <span className="inv-kv-v mono">{thermalInfo.retentionText}</span>
                                </div>
                              </div>
                              {(() => {
                                const liqProf = getContainerLiquidThermalProfile(selectedEntry.item);
                                if (!liqProf) return null;
                                const phaseRu = getLiquidThermalPhaseLabelRu(
                                  selectedEntry.item.temperature ?? 20,
                                  liqProf,
                                  liqProf.liquidId
                                );
                                return (
                                  <div className="inv-kv-grid inv-kv-g4">
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">Кипение</span>
                                      <span className="inv-kv-v mono">+{liqProf.boilingPointC}°C</span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">{liqProf.liquidId === 'rendered_fat' ? 'Застыв.' : 'Замерз.'}</span>
                                      <span className="inv-kv-v mono">
                                        {liqProf.freezingPointC > 0 ? '+' : ''}
                                        {liqProf.freezingPointC}°C
                                      </span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">
                                        {typeof liqProf.smokePointC === 'number' ? 'Дымление' : 'Нагрев'}
                                      </span>
                                      <span className="inv-kv-v mono">
                                        {typeof liqProf.smokePointC === 'number'
                                          ? `+${liqProf.smokePointC}°C`
                                          : `×${(1 / Math.max(0.4, liqProf.specificHeatFactor)).toFixed(1)}`}
                                      </span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">{phaseRu ? 'Фаза' : 'Испарение'}</span>
                                      <span className="inv-kv-v mono">
                                        {phaseRu || `${Math.round(liqProf.evaporationRate * 100)}%`}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })()}

                        {/* Nutritional Profile */}
                        {selectedEntry.item.nutrients && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div className="inv-sec-row">
                              <span className="inv-grp-lbl">Пищевая ценность (БЖУ)</span>
                              <span className="mono" style={{ fontSize: 12, color: '#e0ab45', fontWeight: 600 }}>
                                {selectedEntry.item.nutrients.calories} ккал
                              </span>
                            </div>
                            <div className="inv-kv-grid inv-kv-g4">
                              <div className="inv-kv">
                                <span className="inv-kv-k">Белки</span>
                                <span className="inv-kv-v mono">{selectedEntry.item.nutrients.proteins} г</span>
                              </div>
                              <div className="inv-kv">
                                <span className="inv-kv-k">Жиры</span>
                                <span className="inv-kv-v mono" style={{ color: '#f0c264' }}>{selectedEntry.item.nutrients.fats} г</span>
                              </div>
                              <div className="inv-kv">
                                <span className="inv-kv-k">Углеводы</span>
                                <span className="inv-kv-v mono">{selectedEntry.item.nutrients.carbs} г</span>
                              </div>
                              <div className="inv-kv">
                                <span className="inv-kv-k">Сахар{selectedEntry.item.nutrients.salt !== undefined ? ' / Соль' : ''}</span>
                                <span className="inv-kv-v mono">
                                  {selectedEntry.item.nutrients.sugars} г{selectedEntry.item.nutrients.salt !== undefined ? ` · ${selectedEntry.item.nutrients.salt} г` : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Unified Phone Attributes & Installed Hardware Components */}
                        {selectedEntry.item.phoneAttributes ? (
                          (() => {
                            const pa = selectedEntry.item.phoneAttributes;
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div className="inv-sec-row">
                                    <span className="inv-grp-lbl">Телефон · {pa.brand} {pa.modelName}</span>
                                    <span className="mut mono" style={{ fontSize: 11.5 }}>{pa.osName} {pa.osVersion}</span>
                                  </div>
                                  <div className="inv-kv-grid inv-kv-g3">
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">Марка</span>
                                      <span className="inv-kv-v">{pa.brand}</span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">Модель</span>
                                      <span className="inv-kv-v">{pa.modelName}</span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">Серия</span>
                                      <span className="inv-kv-v">{pa.seriesName}</span>
                                    </div>
                                    <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                      <span className="inv-kv-k">Цвет корпуса (RGB)</span>
                                      <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span className="inv-swatch" style={{ backgroundColor: pa.colorHex }} />
                                        <span>{pa.colorNameRu}</span>
                                        <span className="mut mono" style={{ fontSize: 11 }}>{formatRgbString(pa.colorRgb)}</span>
                                      </span>
                                    </div>
                                    <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                      <span className="inv-kv-k">Из чего сделан</span>
                                      <span className="inv-kv-v" style={{ fontWeight: 400, color: '#d8d4ca' }}>{pa.materialRu}</span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">Форм-фактор</span>
                                      <span className="inv-kv-v">{pa.formFactorRu}</span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">Габариты</span>
                                      <span className="inv-kv-v mono">{pa.dimensionsRu}</span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">Защита</span>
                                      <span className="inv-kv-v">{pa.ingressProtectionRu || 'Базовая'}</span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">Вес</span>
                                      <span className="inv-kv-v mono">{pa.weightGrams} г</span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">Объём</span>
                                      <span className="inv-kv-v mono">{pa.volumeL} л</span>
                                    </div>
                                    <div className="inv-kv">
                                      <span className="inv-kv-k">Комплектующих</span>
                                      <span className="inv-kv-v mono">{pa.components.length} шт.</span>
                                    </div>
                                  </div>
                                </div>

                                {pa.components.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <div className="inv-sec-row">
                                      <span className="inv-grp-lbl">Комплектующие ({pa.components.length})</span>
                                      <span className="mut mono" style={{ fontSize: 10.5 }}>ID · атрибуты</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                      {pa.components.map((comp) => {
                                        const ca = comp.attributes;
                                        return (
                                          <div
                                            key={`${comp.slot}-${comp.itemId}`}
                                            className="inv-kv"
                                            style={{ gap: 3, padding: '6px 8px' }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minWidth: 0 }}>
                                              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#f5f2eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {comp.slotNameRu}: {ca.brand} {ca.model}
                                              </span>
                                              <span className="mono" style={{ fontSize: 10, color: '#e0ab45', flexShrink: 0 }}>
                                                {comp.itemId}
                                              </span>
                                            </div>
                                            <div className="mono" style={{ fontSize: 10.5, color: '#d5d1c7' }}>
                                              {ca.specsSummaryRu}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 10, color: '#9c978d' }}>
                                              <span>Подключение: {ca.connectorRu}</span>
                                              <span>·</span>
                                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <span className="inv-swatch" style={{ width: 8, height: 8, backgroundColor: ca.colorHex }} />
                                                <span>{ca.colorNameRu} ({formatRgbString(ca.colorRgb)})</span>
                                              </span>
                                              <span>·</span>
                                              <span className="mono">{ca.dimensionsRu} · {ca.weightGrams} г</span>
                                            </div>
                                            <div style={{ fontSize: 10, color: '#8c877d' }}>
                                              Из чего: {ca.materialRu}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : selectedEntry.item.phoneSpecs ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div className="inv-sec-row">
                              <span className="inv-grp-lbl">{selectedEntry.item.phoneSpecs.modelName}</span>
                              <span className="mut mono" style={{ fontSize: 11.5 }}>{selectedEntry.item.phoneSpecs.osName}</span>
                            </div>
                            <div className="inv-kv-grid inv-kv-g4">
                              <div className="inv-kv">
                                <span className="inv-kv-k">Экран</span>
                                <span className="inv-kv-v mono">{selectedEntry.item.phoneSpecs.screenSize || `${selectedEntry.item.phoneSpecs.screenSizeInches}"`}</span>
                              </div>
                              <div className="inv-kv">
                                <span className="inv-kv-k">ОЗУ</span>
                                <span className="inv-kv-v mono">{selectedEntry.item.phoneSpecs.ramGb} ГБ</span>
                              </div>
                              <div className="inv-kv">
                                <span className="inv-kv-k">Память</span>
                                <span className="inv-kv-v mono">{selectedEntry.item.phoneSpecs.storageGb} ГБ</span>
                              </div>
                              <div className="inv-kv">
                                <span className="inv-kv-k">Батарея</span>
                                <span className="inv-kv-v mono">{selectedEntry.item.phoneSpecs.batteryCapacityMah} мАч</span>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {/* Standalone Hardware Component Attributes */}
                        {selectedEntry.item.hardwareAttributes && (() => {
                          const ha = selectedEntry.item.hardwareAttributes;
                          const specEntries = Object.entries(ha.specs || {});
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div className="inv-sec-row">
                                  <span className="inv-grp-lbl">Комплектующее · {ha.nameRu}</span>
                                  <span className="mono" style={{ fontSize: 11, color: '#e0ab45' }}>{ha.kind}</span>
                                </div>
                                <div className="inv-kv-grid inv-kv-g3">
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Марка</span>
                                    <span className="inv-kv-v">{ha.brand}</span>
                                  </div>
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Модель</span>
                                    <span className="inv-kv-v">{ha.model}</span>
                                  </div>
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Форм-фактор</span>
                                    <span className="inv-kv-v">{ha.formFactorRu}</span>
                                  </div>
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Цвет (RGB)</span>
                                    <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <span className="inv-swatch" style={{ backgroundColor: ha.colorHex }} />
                                      <span>{ha.colorNameRu}</span>
                                      <span className="mut mono" style={{ fontSize: 11 }}>{formatRgbString(ha.colorRgb)}</span>
                                    </span>
                                  </div>
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Из чего сделан</span>
                                    <span className="inv-kv-v" style={{ fontWeight: 400, color: '#d8d4ca' }}>{ha.materialRu}</span>
                                  </div>
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Как подсоединяется</span>
                                    <span className="inv-kv-v">{ha.connectorRu}</span>
                                  </div>
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Размер</span>
                                    <span className="inv-kv-v mono">{ha.dimensionsRu}</span>
                                  </div>
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Вес</span>
                                    <span className="inv-kv-v mono">{ha.weightGrams} г</span>
                                  </div>
                                  <div className="inv-kv">
                                    <span className="inv-kv-k">Объём</span>
                                    <span className="inv-kv-v mono">{ha.volumeL} л</span>
                                  </div>
                                  {ha.compatibilityRu && (
                                    <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                      <span className="inv-kv-k">Совместимость</span>
                                      <span className="inv-kv-v" style={{ fontWeight: 400, color: '#cfcbc1' }}>{ha.compatibilityRu}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {specEntries.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div className="inv-sec-row">
                                    <span className="inv-grp-lbl">Технические характеристики</span>
                                  </div>
                                  <div className="inv-kv-grid inv-kv-g3">
                                    {specEntries.map(([specKey, specVal]) => (
                                      <div className="inv-kv" key={specKey}>
                                        <span className="inv-kv-k">{specKey}</span>
                                        <span className="inv-kv-v mono">{String(specVal)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {selectedEntry.item.produceAttributes && (() => {
                          const pr = selectedEntry.item.produceAttributes!;
                          const pctWhole = Math.round(pr.remainingFraction * 100);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div className="inv-sec-row">
                                <span className="inv-grp-lbl">Свойства продукта</span>
                                <span className="inv-cnt-meta mono">{pr.cutFormRu} · {pr.weightGrams} г</span>
                              </div>
                              <div className="inv-kv-grid inv-kv-g2">
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Сорт / вид</span>
                                  <span className="inv-kv-v">{pr.varietyRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Сочность</span>
                                  <span className="inv-kv-v mono">{pr.juiciness}%</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Вес / доля</span>
                                  <span className="inv-kv-v mono">{pr.weightGrams} г ({pctWhole}%)</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Размер</span>
                                  <span className="inv-kv-v mono">{pr.sizeNameRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Нарезка</span>
                                  <span className="inv-kv-v" style={{ color: '#e6b85c' }}>{pr.cutFormRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Модель / часть</span>
                                  <span className="inv-kv-v">{pr.partNameRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Кожура / вид</span>
                                  <span className="inv-kv-v">
                                    {pr.isDried ? 'Сушёный' : pr.isBoiled ? 'Отварной' : pr.isPeeled ? 'Очищен' : 'В кожуре'}
                                  </span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Цвет</span>
                                  <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: pr.color, border: '1px solid rgba(255,255,255,0.28)', flexShrink: 0 }} />
                                    <span style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: pr.fleshColor, border: '1px solid rgba(255,255,255,0.28)', flexShrink: 0 }} />
                                    <span>{pr.colorNameRu}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {selectedEntry.item.meatAttributes && (() => {
                          const mt = selectedEntry.item.meatAttributes!;
                          const pctWhole = Math.round(mt.remainingFraction * 100);
                          const wLabel = mt.weightGrams >= 1000
                            ? `${Number((mt.weightGrams / 1000).toFixed(2))} кг`
                            : `${mt.weightGrams} г`;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div className="inv-sec-row">
                                <span className="inv-grp-lbl">Свойства мяса / рыбы</span>
                                <span className="inv-cnt-meta mono">{mt.cutFormRu} · {wLabel}</span>
                              </div>
                              <div className="inv-kv-grid inv-kv-g2">
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Вид / отруб</span>
                                  <span className="inv-kv-v">{mt.speciesNameRu} · {mt.anatomicalPartRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Нарезка</span>
                                  <span className="inv-kv-v" style={{ color: '#e6b85c' }}>{mt.cutFormRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Вес / доля</span>
                                  <span className="inv-kv-v mono">{wLabel} ({pctWhole}%)</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Размер</span>
                                  <span className="inv-kv-v mono">{mt.sizeNameRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Сочность</span>
                                  <span className="inv-kv-v mono">{mt.juiciness}%</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Жирность</span>
                                  <span className="inv-kv-v mono">{mt.fatContent}%</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Кость / кожа</span>
                                  <span className="inv-kv-v">
                                    {mt.hasBone ? 'На кости' : 'Без кости'}{mt.hasSkin ? ', с кожей/панцирем' : ''}
                                  </span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Цвет</span>
                                  <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: mt.color, border: '1px solid rgba(255,255,255,0.28)', flexShrink: 0 }} />
                                    <span style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: mt.fatColor, border: '1px solid rgba(255,255,255,0.28)', flexShrink: 0 }} />
                                    <span>{mt.colorNameRu}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {selectedEntry.item.doughAttributes && (() => {
                          const it = selectedEntry.item;
                          const dg = it.doughAttributes!;
                          const vis = describeDoughAppearanceQualitativeRu(dg);
                          const fillingVisible = isDoughFillingVisible(dg, it);
                          const visibleFillingsText = fillingVisible
                            ? summarizeDoughFillingsApproxRu(dg.fillings, {
                                maxItems: 6,
                                capitalize: true,
                                withApproxAmount: true,
                              })
                            : '';
                          const baseIngredientsText = summarizeDoughIngredientsRu(dg.ingredients, {
                            maxItems: 6,
                            capitalize: true,
                          });
                          const hasSoakedCoating = Boolean(it.soakedLiquidId && (it.wetness || 0) >= 10);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div className="inv-sec-row">
                                <span className="inv-grp-lbl">
                                  {dg.cookState === 'raw' ? 'Осмотр теста' : 'Осмотр выпечки'}
                                </span>
                                <span className="inv-cnt-meta">{vis.shapeBriefRu}</span>
                              </div>
                              <div className="inv-kv-grid inv-kv-g2">
                                {hasSoakedCoating && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Пропитка</span>
                                    <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                      <span className="inv-swatch" style={{ backgroundColor: it.soakedColor || '#38bdf8' }} />
                                      <span>{it.soakedLiquidNameRu || it.soakedLiquidId}</span>
                                    </span>
                                  </div>
                                )}
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Вид и размер</span>
                                  <span className="inv-kv-v">{vis.sizeThicknessRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Поверхность</span>
                                  <span
                                    className="inv-kv-v"
                                    style={{
                                      color:
                                        dg.cookState === 'burnt'
                                          ? '#ef4444'
                                          : dg.cookState !== 'raw'
                                          ? '#7fd19a'
                                          : '#cfcbc1',
                                    }}
                                  >
                                    {dg.cookState === 'raw' ? 'Сырое тесто' : vis.crustLookRu}
                                  </span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">{dg.cookState === 'raw' ? 'Тесто' : 'Текстура'}</span>
                                  <span className="inv-kv-v" style={{ color: '#e6b85c' }}>
                                    {dg.cookState === 'raw'
                                      ? `${dg.doughTypeRu} · ${dg.consistencyRu.toLowerCase()}`
                                      : vis.textureLookRu}
                                  </span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Цвет</span>
                                  <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    <span
                                      style={{
                                        width: 9,
                                        height: 9,
                                        borderRadius: 2,
                                        backgroundColor: dg.color,
                                        border: '1px solid rgba(255,255,255,0.28)',
                                        flexShrink: 0,
                                      }}
                                    />
                                    {dg.fleckColor && (
                                      <span
                                        style={{
                                          width: 9,
                                          height: 9,
                                          borderRadius: '50%',
                                          backgroundColor: dg.fleckColor,
                                          border: '1px solid rgba(255,255,255,0.28)',
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}
                                    <span>{dg.colorNameRu}</span>
                                  </span>
                                </div>
                                {dg.embossedPatternRu && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">Оттиск на тесте</span>
                                    <span className="inv-kv-v" style={{ color: '#e6b85c' }}>{dg.embossedPatternRu}</span>
                                  </div>
                                )}
                                {dg.fillings.length > 0 && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">
                                      {!fillingVisible
                                        ? 'Начинка'
                                        : dg.isFolded
                                        ? 'Начинка на срезе'
                                        : 'Видимая начинка'}
                                    </span>
                                    <span
                                      className="inv-kv-v"
                                      style={{
                                        fontWeight: 400,
                                        color: fillingVisible ? '#e6b85c' : '#9c978d',
                                      }}
                                    >
                                      {fillingVisible
                                        ? visibleFillingsText
                                        : 'Скрыта внутри (края закрыты)'}
                                    </span>
                                  </div>
                                )}
                                {baseIngredientsText && (
                                  <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                    <span className="inv-kv-k">По виду в основе</span>
                                    <span className="inv-kv-v" style={{ fontWeight: 400, color: '#cfcbc1' }}>
                                      {baseIngredientsText}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {selectedEntry.item.rollingPinAttributes && (() => {
                          const rp = selectedEntry.item.rollingPinAttributes!;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div className="inv-sec-row">
                                <span className="inv-grp-lbl">Свойства скалки</span>
                                <span className="inv-cnt-meta mono">{rp.lengthCm} см · Ø{rp.diameterMm} мм</span>
                              </div>
                              <div className="inv-kv-grid inv-kv-g2">
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Модель</span>
                                  <span className="inv-kv-v" style={{ color: '#e6b85c' }}>{rp.modelNameRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Форма</span>
                                  <span className="inv-kv-v">{rp.shapeNameRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Материал</span>
                                  <span className="inv-kv-v">{rp.materialRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Цвет</span>
                                  <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: rp.color, border: '1px solid rgba(255,255,255,0.28)', flexShrink: 0 }} />
                                    <span style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: rp.accentColor, border: '1px solid rgba(255,255,255,0.28)', flexShrink: 0 }} />
                                    <span>{rp.colorNameRu}</span>
                                  </span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Узор / поверхность</span>
                                  <span className="inv-kv-v">
                                    {rp.patternNameRu}{rp.embossPatternOnDough ? ' (оттиск на тесте)' : ''}
                                  </span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Эффективность раскатки</span>
                                  <span className="inv-kv-v mono">×{rp.rollingEfficiency.toFixed(2)}</span>
                                </div>
                                <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                  <span className="inv-kv-k">Ручки / конструкция</span>
                                  <span className="inv-kv-v" style={{ fontWeight: 400, color: '#cfcbc1' }}>{rp.handleStyleRu}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {selectedEntry.item.branchAttributes && (() => {
                          const br = selectedEntry.item.branchAttributes!;
                          const att = br.attachedFruit;
                          const totalG = Math.round((selectedEntry.item.weight || 0) * 1000);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div className="inv-sec-row">
                                <span className="inv-grp-lbl">Свойства ветки</span>
                                <span className="inv-cnt-meta mono">{br.branchKindRu} · {br.lengthCm} см</span>
                              </div>
                              <div className="inv-kv-grid inv-kv-g2">
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Тип ветки</span>
                                  <span className="inv-kv-v">{br.branchKindRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Размер</span>
                                  <span className="inv-kv-v mono">{br.sizeNameRu}</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Вес общий / ветка</span>
                                  <span className="inv-kv-v mono">{totalG} г / {br.branchWeightGrams} г</span>
                                </div>
                                <div className="inv-kv">
                                  <span className="inv-kv-k">Свежесть</span>
                                  <span className="inv-kv-v mono">{br.freshness}%</span>
                                </div>
                                <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                  <span className="inv-kv-k">Материал</span>
                                  <span className="inv-kv-v" style={{ fontWeight: 400, color: '#cfcbc1' }}>{br.materialRu}</span>
                                </div>
                                <div className="inv-kv" style={{ gridColumn: '1 / -1' }}>
                                  <span className="inv-kv-k">Плод на ветке</span>
                                  {att && att.count > 0 ? (
                                    <span className="inv-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#e6b85c' }}>
                                      <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: att.fruitAttributes.color, border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                                      <span>{att.nameRu} ({att.fruitAttributes.varietyRu}) · {att.count} / {att.maxCount} шт. · сочность {att.fruitAttributes.juiciness}%</span>
                                    </span>
                                  ) : (
                                    <span className="inv-kv-v" style={{ color: '#9c9689' }}>Пустая ветка (без плодов)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Pinned Action Footer */}
                      <div className="inv-detail-foot">
                        {selectedEntry.hand ? (
                          <>
                            {selectedEntry.item.clothingStats && (
                              <button
                                type="button"
                                className="btn btn-p btn-sm btn-block"
                                onClick={() => handleEquipFromHand(selectedEntry.hand!)}
                              >
                                <Shirt width={14} height={14} />
                                <span>Надеть из руки</span>
                              </button>
                            )}
                            {selectedEntry.item.isContainer && selectedEntry.item.fluidStorage ? (
                              <div className="inv-btn-grid2">
                                {isFluidContainerClosed(selectedEntry.item) ||
                                (selectedEntry.item.singleUseContainer && !selectedEntry.item.isOpen) ? (
                                  <button
                                    type="button"
                                    className="btn btn-p btn-sm"
                                    style={{ gridColumn: '1 / -1' }}
                                    onClick={() => {
                                      const it = selectedEntry.item;
                                      if (
                                        isPackageContainerItem(it) &&
                                        (!it.fluidStorage?.liquidId || (it.fluidStorage.currentMl || 0) <= 0)
                                      ) {
                                        unpackSingleUseContainer(player, it, world || undefined);
                                      } else {
                                        openFluidContainerIfNeeded(player, it);
                                      }
                                      sound.resume();
                                      forceRender(n => n + 1);
                                    }}
                                  >
                                    <Scissors width={14} height={14} />
                                    <span>
                                      Вскрыть / Открыть
                                      {selectedEntry.item.contents && selectedEntry.item.contents.length > 0
                                        ? ` (${selectedEntry.item.contents.reduce((acc, c) => acc + (c.count || 1), 0)})`
                                        : ''}
                                    </span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-p btn-sm"
                                      onClick={() => {
                                        setOpenContainer(selectedEntry.item);
                                        setSelectedContainerItemIdx(0);
                                      }}
                                    >
                                      <Package width={14} height={14} />
                                      <span>Открыть ({selectedEntry.item.contents?.length || 0})</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-s btn-sm"
                                      onClick={() => {
                                        handleUseHandItem(selectedEntry.hand!, true);
                                      }}
                                    >
                                      <Droplets width={14} height={14} />
                                      <span>
                                        {selectedEntry.item.fluidStorage.currentMl > 0
                                          ? 'Выпить / Исп.'
                                          : (selectedEntry.item.contents?.length || 0) > 0 &&
                                            (isPackageContainerItem(selectedEntry.item) ||
                                              selectedEntry.item.itemId === 'lukoshko' ||
                                              selectedEntry.item.itemId === 'package_bag' ||
                                              selectedEntry.item.itemId === 'plastic_bag' ||
                                              selectedEntry.item.itemId.startsWith('box_cardboard_') ||
                                              selectedEntry.item.itemId.startsWith('sack_cloth_') ||
                                              selectedEntry.item.itemId === 'sack_empty')
                                          ? 'Взять / Исп. 1 шт.'
                                          : 'Набрать'}
                                      </span>
                                    </button>
                                    {canCloseFluidContainer(selectedEntry.item) && (
                                      <button
                                        type="button"
                                        className="btn btn-s btn-xs"
                                        style={{ gridColumn: '1 / -1' }}
                                        onClick={() => {
                                          closeFluidContainer(player, selectedEntry.item);
                                          sound.resume();
                                          forceRender(n => n + 1);
                                        }}
                                      >
                                        <Package width={13} height={13} />
                                        <span>Закрыть крышку / клапан</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : (
                              <>
                                {selectedEntry.item.isContainer && (
                                  <button
                                    type="button"
                                    className="btn btn-p btn-sm btn-block"
                                    onClick={() => {
                                      setOpenContainer(selectedEntry.item);
                                      setSelectedContainerItemIdx(0);
                                    }}
                                  >
                                    <Package width={14} height={14} />
                                    <span>Открыть ({selectedEntry.item.contents?.length || 0} предм.)</span>
                                  </button>
                                )}
                                {isFluidContainerClosed(selectedEntry.item) && (
                                  <button
                                    type="button"
                                    className="btn btn-p btn-sm btn-block"
                                    onClick={() => {
                                      openFluidContainerIfNeeded(player, selectedEntry.item);
                                      sound.resume();
                                      forceRender(n => n + 1);
                                    }}
                                  >
                                    <Scissors width={14} height={14} />
                                    <span>Вскрыть / Открыть</span>
                                  </button>
                                )}
                              </>
                            )}
                            {(selectedEntry.item.phoneAttributes ||
                              selectedEntry.item.phoneSpecs ||
                              selectedEntry.item.itemId === 'phone' ||
                              selectedEntry.item.itemId.startsWith('phone_') ||
                              selectedEntry.item.itemId === 'smartphone') && (
                              <button
                                type="button"
                                className="btn btn-p btn-sm btn-block"
                                onClick={() => {
                                  useHandItemOnPlayer(player, selectedEntry.hand!, world || undefined);
                                  sound.resume();
                                  forceRender(n => n + 1);
                                }}
                              >
                                <Smartphone width={14} height={14} />
                                <span>Включить экран телефона</span>
                              </button>
                            )}
                            <div className="inv-btn-grid2">
                              <button
                                type="button"
                                className="btn btn-s btn-xs"
                                onClick={() => handleStowHand(selectedEntry.hand!)}
                              >
                                <ArrowDownToLine width={13} height={13} />
                                <span>Убрать в карман</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-d btn-xs"
                                onClick={() => handleDropFromHand(selectedEntry.hand!)}
                              >
                                <Trash2 width={13} height={13} />
                                <span>Бросить на землю</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            {selectedEntry.item.clothingStats ? (
                              <button
                                type="button"
                                id="btn-equip-selected-item"
                                className="btn btn-p btn-sm btn-block"
                                onClick={() => handleEquipItem(selectedEntry.originalIndex)}
                              >
                                <Shirt width={14} height={14} />
                                <span>Надеть / Экипировать</span>
                              </button>
                            ) : selectedEntry.item.isContainer && selectedEntry.item.fluidStorage ? (
                              <div className="inv-btn-grid2">
                                {isFluidContainerClosed(selectedEntry.item) ||
                                (selectedEntry.item.singleUseContainer && !selectedEntry.item.isOpen) ? (
                                  <button
                                    type="button"
                                    id="btn-open-fluid-container"
                                    className="btn btn-p btn-sm"
                                    style={{ gridColumn: '1 / -1' }}
                                    onClick={() => {
                                      const it = selectedEntry.item;
                                      if (
                                        isPackageContainerItem(it) &&
                                        (!it.fluidStorage?.liquidId || (it.fluidStorage.currentMl || 0) <= 0)
                                      ) {
                                        unpackSingleUseContainer(player, it, world || undefined);
                                      } else {
                                        openFluidContainerIfNeeded(player, it);
                                      }
                                      sound.resume();
                                      forceRender(n => n + 1);
                                    }}
                                  >
                                    <Scissors width={14} height={14} />
                                    <span>
                                      Вскрыть / Открыть
                                      {selectedEntry.item.contents && selectedEntry.item.contents.length > 0
                                        ? ` (${selectedEntry.item.contents.reduce((acc, c) => acc + (c.count || 1), 0)})`
                                        : ''}
                                    </span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      id="btn-open-selected-container"
                                      className="btn btn-p btn-sm"
                                      onClick={() => {
                                        setOpenContainer(selectedEntry.item);
                                        setSelectedContainerItemIdx(0);
                                      }}
                                    >
                                      <Package width={14} height={14} />
                                      <span>Открыть ({selectedEntry.item.contents?.length || 0})</span>
                                    </button>
                                    <button
                                      type="button"
                                      id="btn-use-selected-item"
                                      className="btn btn-s btn-sm"
                                      onClick={() => handleUseItem(selectedEntry.originalIndex, true)}
                                    >
                                      <Droplets width={14} height={14} />
                                      <span>
                                        {selectedEntry.item.fluidStorage.currentMl > 0
                                          ? 'Выпить / Исп.'
                                          : (selectedEntry.item.contents?.length || 0) > 0 &&
                                            (isPackageContainerItem(selectedEntry.item) ||
                                              selectedEntry.item.itemId === 'lukoshko' ||
                                              selectedEntry.item.itemId === 'package_bag' ||
                                              selectedEntry.item.itemId === 'plastic_bag' ||
                                              selectedEntry.item.itemId.startsWith('box_cardboard_') ||
                                              selectedEntry.item.itemId.startsWith('sack_cloth_') ||
                                              selectedEntry.item.itemId === 'sack_empty')
                                          ? 'Взять / Исп. 1 шт.'
                                          : 'Набрать'}
                                      </span>
                                    </button>
                                    {canCloseFluidContainer(selectedEntry.item) && (
                                      <button
                                        type="button"
                                        className="btn btn-s btn-xs"
                                        style={{ gridColumn: '1 / -1' }}
                                        onClick={() => {
                                          closeFluidContainer(player, selectedEntry.item);
                                          sound.resume();
                                          forceRender(n => n + 1);
                                        }}
                                      >
                                        <Package width={13} height={13} />
                                        <span>Закрыть крышку / клапан</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : selectedEntry.item.isContainer ? (
                              <div className="inv-btn-grid2">
                                {(selectedEntry.item.singleUseContainer || selectedEntry.item.tornItemId) &&
                                  !selectedEntry.item.isOpen && (
                                    <button
                                      type="button"
                                      id="btn-unpack-selected-container"
                                      className="btn btn-p btn-sm"
                                      onClick={() => {
                                        unpackSingleUseContainer(player, selectedEntry.item, world);
                                        sound.resume();
                                        forceRender(n => n + 1);
                                      }}
                                    >
                                      <Scissors width={14} height={14} />
                                      <span>
                                        Вскрыть
                                        {selectedEntry.item.contents && selectedEntry.item.contents.length > 0
                                          ? ` (${selectedEntry.item.contents.reduce((acc, it) => acc + (it.count || 1), 0)})`
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
                                      className="btn btn-p btn-sm"
                                      onClick={() => {
                                        useItemOnPlayer(player, selectedEntry.originalIndex, world || undefined);
                                        sound.resume();
                                        forceRender(n => n + 1);
                                      }}
                                    >
                                      <Utensils width={14} height={14} />
                                      <span>
                                        {selectedEntry.item.itemId.startsWith('egg_carton') ||
                                        selectedEntry.item.itemId.startsWith('pelmeni_pack') ||
                                        selectedEntry.item.itemId.startsWith('chocolate_pack') ||
                                        selectedEntry.item.contents[0]?.itemId === 'pelmen' ||
                                        selectedEntry.item.contents[0]?.itemId === 'chocolate'
                                          ? 'Достать 1 шт.'
                                          : selectedEntry.item.contents[0]?.category === 'med'
                                          ? 'Применить 1 шт.'
                                          : 'Съесть 1 шт.'}{' '}
                                        ({selectedEntry.item.contents.reduce((acc, it) => acc + (it.count || 1), 0)})
                                      </span>
                                    </button>
                                  )}
                                <button
                                  type="button"
                                  id="btn-open-selected-container"
                                  className={`btn ${
                                    (selectedEntry.item.singleUseContainer || selectedEntry.item.tornItemId) && !selectedEntry.item.isOpen
                                      ? 'btn-s'
                                      : 'btn-p'
                                  } btn-sm`}
                                  style={{
                                    gridColumn:
                                      !((selectedEntry.item.singleUseContainer || selectedEntry.item.tornItemId) && !selectedEntry.item.isOpen) &&
                                      !(
                                        (selectedEntry.item.isOpen ||
                                          selectedEntry.item.itemId === 'pouch_sealed_snack_torn' ||
                                          selectedEntry.item.itemId === 'egg_carton_10_open' ||
                                          selectedEntry.item.itemId === 'lukoshko') &&
                                        selectedEntry.item.contents &&
                                        selectedEntry.item.contents.length > 0
                                      )
                                        ? '1 / -1'
                                        : undefined
                                  }}
                                  onClick={() => {
                                    setOpenContainer(selectedEntry.item);
                                    setSelectedContainerItemIdx(0);
                                  }}
                                >
                                  <Package width={14} height={14} />
                                  <span>Открыть ({selectedEntry.item.contents?.length || 0} предм.)</span>
                                </button>
                              </div>
                            ) : selectedEntry.item.phoneAttributes ||
                              selectedEntry.item.phoneSpecs ||
                              selectedEntry.item.itemId === 'phone' ||
                              selectedEntry.item.itemId.startsWith('phone_') ||
                              selectedEntry.item.itemId === 'smartphone' ? (
                              <button
                                type="button"
                                id="btn-use-selected-phone"
                                className="btn btn-p btn-sm btn-block"
                                onClick={() => handleUseItem(selectedEntry.originalIndex)}
                              >
                                <Smartphone width={14} height={14} />
                                <span>Включить экран телефона</span>
                              </button>
                            ) : selectedEntry.item.itemId.startsWith('car_key') ? (
                              <div className="note" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px' }}>
                                {(() => {
                                  const targetVeh = world ? getTargetVehicleForKey(player, selectedEntry.item, world) : null;
                                  const distM = targetVeh ? Math.round(Math.hypot(targetVeh.x - player.x, targetVeh.y - player.y) / 10) : null;
                                  const isSmartOrDisplay = selectedEntry.item.keyTier === 'smart' || selectedEntry.item.keyTier === 'display';

                                  return (
                                    <>
                                      <div className="inv-sec-row" style={{ fontSize: 12 }}>
                                        <span className="inv-grp-lbl" style={{ fontSize: 12 }}>
                                          {selectedEntry.item.keyTier === 'display'
                                            ? 'Smart Display Key'
                                            : selectedEntry.item.keyTier === 'smart'
                                            ? 'Smart Keyless-Go'
                                            : selectedEntry.item.keyTier === 'flip'
                                            ? 'Выкидной брелок'
                                            : 'Ключ зажигания'}
                                        </span>
                                        <span className="mut mono" style={{ color: distM !== null ? '#e0ab45' : undefined }}>
                                          {distM !== null ? `${distM} м` : 'Вне зоны'}
                                        </span>
                                      </div>

                                      <div className="inv-btn-grid2" style={{ gap: 6 }}>
                                        <button
                                          type="button"
                                          className="btn btn-s btn-xs"
                                          onClick={() => {
                                            handleCarKeyActivation(player, selectedEntry.item, world, 'toggle_lock');
                                            forceRender(n => n + 1);
                                          }}
                                        >
                                          {targetVeh?.isLocked ? <Unlock width={12} height={12} color="#c9922b" /> : <Lock width={12} height={12} color="#c9922b" />}
                                          <span>{targetVeh?.isLocked ? 'Открыть ЦЗ' : 'Закрыть ЦЗ'}</span>
                                        </button>

                                        {isSmartOrDisplay ? (
                                          <button
                                            type="button"
                                            className="btn btn-p btn-xs"
                                            onClick={() => {
                                              handleCarKeyActivation(player, selectedEntry.item, world, 'toggle_engine');
                                              forceRender(n => n + 1);
                                            }}
                                          >
                                            <Zap width={12} height={12} />
                                            <span>{targetVeh?.engineState?.engineRunning ? 'Заглушить' : 'Автозапуск'}</span>
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            className="btn btn-s btn-xs"
                                            onClick={() => {
                                              handleCarKeyActivation(player, selectedEntry.item, world, 'horn');
                                              forceRender(n => n + 1);
                                            }}
                                          >
                                            <Volume2 width={12} height={12} color="#c9922b" />
                                            <span>Поиск авто</span>
                                          </button>
                                        )}

                                        {isSmartOrDisplay && (
                                          <>
                                            <button
                                              type="button"
                                              className="btn btn-s btn-xs"
                                              onClick={() => {
                                                handleCarKeyActivation(player, selectedEntry.item, world, 'toggle_headlights');
                                                forceRender(n => n + 1);
                                              }}
                                            >
                                              <Lightbulb width={12} height={12} color="#c9922b" />
                                              <span>{targetVeh?.headlightsOn ? 'Выкл фары' : 'Вкл фары'}</span>
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-s btn-xs"
                                              onClick={() => {
                                                handleCarKeyActivation(player, selectedEntry.item, world, 'horn');
                                                forceRender(n => n + 1);
                                              }}
                                            >
                                              <Volume2 width={12} height={12} color="#c9922b" />
                                              <span>Сигнал</span>
                                            </button>
                                          </>
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
                                className="btn btn-p btn-sm btn-block"
                                onClick={() => onInspectDocument?.(selectedEntry.item)}
                              >
                                <FileText width={14} height={14} />
                                <span>Просмотреть документ</span>
                              </button>
                            ) : isFluidContainerClosed(selectedEntry.item) ? (
                              <button
                                type="button"
                                id="btn-open-fluid-container"
                                className="btn btn-p btn-sm btn-block"
                                onClick={() => {
                                  openFluidContainerIfNeeded(player, selectedEntry.item);
                                  sound.resume();
                                  forceRender(n => n + 1);
                                }}
                              >
                                <Scissors width={14} height={14} />
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
                                className="btn btn-p btn-sm btn-block"
                                onClick={() => handleUseItem(selectedEntry.originalIndex)}
                              >
                                <Utensils width={14} height={14} />
                                <span>Использовать</span>
                              </button>
                            ) : null}

                            <div className="inv-btn-grid2">
                              <button
                                type="button"
                                className="btn btn-s btn-xs"
                                onClick={() => handleTakeToHand('left', selectedEntry.originalIndex)}
                              >
                                <Hand width={13} height={13} />
                                <span>В левую руку</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-s btn-xs"
                                onClick={() => handleTakeToHand('right', selectedEntry.originalIndex)}
                              >
                                <Hand width={13} height={13} />
                                <span>В правую руку</span>
                              </button>
                            </div>

                            {availableContainers.filter(cont => cont.id !== selectedEntry.item.id).length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
                                <span className="mut" style={{ fontSize: 11.5 }}>Убрать в:</span>
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
                                        className="btn btn-s btn-xs"
                                        style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}
                                        title={check.fits ? `Положить ${selectedEntry.item.nameRu} в ${cont.nameRu}` : check.reason}
                                      >
                                        <ArrowDownToLine width={11} height={11} color="#c9922b" />
                                        <span>{cont.nameRu}</span>
                                      </button>
                                    );
                                  })}
                              </div>
                            )}

                            <div className={world && isPlayerNearTrashBin(player, world) ? 'inv-btn-grid2' : undefined}>
                              <button
                                type="button"
                                id="btn-drop-selected-item"
                                className="btn btn-d btn-xs btn-block"
                                onClick={() => handleDropItem(selectedEntry.originalIndex)}
                              >
                                <Trash2 width={13} height={13} />
                                <span>Выбросить 1 шт.</span>
                              </button>

                              {world && isPlayerNearTrashBin(player, world) && (
                                <button
                                  type="button"
                                  id="btn-dispose-in-trash-bin"
                                  className="btn btn-s btn-xs btn-block"
                                  style={{ borderColor: 'rgba(201,146,43,.55)', color: '#f0c264' }}
                                  onClick={() => {
                                    disposeTrashInBin(player, world, selectedEntry.originalIndex);
                                    forceRender(n => n + 1);
                                  }}
                                >
                                  <Trash2 width={13} height={13} />
                                  <span>В урну</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="inv-empty">
                      <Package width={38} height={38} color="#8f8b81" />
                      <div className="cn" style={{ fontSize: 19, fontWeight: 700, color: '#fff' }}>
                        Выберите предмет в слоте
                      </div>
                      <div style={{ fontSize: 13, maxWidth: 260 }}>
                        Перетаскивайте предметы между слотами карманов, рук и контейнеров
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ==================== SUB-INVENTORY: CONTAINER VIEW ==================== */}
            {activeTab === 'inventory' && openContainer && (() => {
              ensureHybridContainerProps(openContainer);
              const contItems = openContainer.contents || [];
              const totalContSlots = Math.max(18, contItems.length + 6);
              const selectedContItem = contItems[selectedContainerItemIdx] || null;
              const isContainerDropTarget = wbDragUi?.overKey === 'zone:container';
              const bd = getContainerCapacityBreakdown(openContainer);
              const fs = openContainer.fluidStorage;
              const hasLiquid = Boolean(fs && fs.liquidId && fs.currentMl > 0);
              const liqDef = fs?.liquidId ? LIQUID_REGISTRY[fs.liquidId as LiquidId] : undefined;
              const liquidDisplayName = fs?.attributes?.varietyRu || liqDef?.nameRu || fs?.liquidId || '';

              return (
                <div className="inv-cont-wrap">
                  {/* Single-row Slim Container Header Strip */}
                  <div className="panel inv-cont-bar">
                    <div className="inv-cont-bar-l">
                      <button
                        id="btn-close-container-view"
                        type="button"
                        className="btn btn-s btn-xs"
                        onClick={() => setOpenContainer(null)}
                      >
                        <ChevronLeft width={14} height={14} color="#c9922b" />
                        <span>В карманы</span>
                      </button>
                      <div className="inv-cont-ic">
                        <ItemIconCanvas itemId={openContainer.itemId} item={openContainer} size={30} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cn inv-cont-name" title={openContainer.nameRu}>
                          {openContainer.nameRu}
                        </div>
                        <div className="inv-cont-sub">
                          {fs
                            ? 'Предметы и жидкость делят общую вместимость и смешиваются'
                            : 'Перетаскивайте предметы между контейнером, руками и карманами'}
                        </div>
                      </div>
                    </div>

                    {bd.totalCapacityMl > 0 && (
                      <div className="inv-cont-bar-r">
                        <div className="inv-cont-stats mono">
                          <span>
                            <strong style={{ color: '#fff' }}>{contItems.length}</strong> предм. ·{' '}
                            <strong style={{ color: '#e0ab45' }}>{(bd.usedMl / 1000).toFixed(2)}</strong> / {(bd.totalCapacityMl / 1000).toFixed(2)} л ·{' '}
                            <strong style={{ color: '#fff' }}>{formatWeightRu(getItemTotalWeight(openContainer))}</strong>
                          </span>
                          <span>
                            Своб.: <strong style={{ color: '#9ac985' }}>{Math.round(bd.freeMl)} мл</strong>
                          </span>
                        </div>
                        <div className="inv-meter-track">
                          {bd.solidPct > 0 && (
                            <div
                              style={{ width: `${bd.solidPct}%`, background: '#f59e0b', height: '100%' }}
                              title={`Предметы: ${Math.round(bd.solidMl)} мл`}
                            />
                          )}
                          {bd.liquidPct > 0 && (
                            <div
                              style={{ width: `${bd.liquidPct}%`, background: bd.liquidColor, height: '100%' }}
                              title={`Жидкость: ${Math.round(bd.liquidMl)} мл`}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2-Column Split: Left = Liquid + Container Slots | Right = Hands + Pockets */}
                  <div className="inv-split-even">
                    <section
                      className="panel inv-col"
                      data-wb-drop-zone="zone:container"
                      style={{ borderColor: isContainerDropTarget ? '#e0ab45' : undefined }}
                    >
                      {fs && (
                        <div
                          className="card-sm inv-liquid-strip"
                          style={{ borderColor: hasLiquid ? `${bd.liquidColor}66` : undefined }}
                        >
                          <div className="inv-liquid-l">
                            <Droplets width={16} height={16} color={hasLiquid ? bd.liquidColor : '#64748b'} style={{ flex: 'none' }} />
                            <div style={{ minWidth: 0 }}>
                              <div className="inv-liquid-name" title={hasLiquid ? liquidDisplayName : undefined}>
                                {hasLiquid ? liquidDisplayName : 'Жидкость не налита'}
                              </div>
                              <div className="inv-liquid-meta mono">
                                {hasLiquid
                                  ? `${Math.round(fs.currentMl)} мл · ${Math.round(openContainer.temperature ?? 20)}°C${contItems.length > 0 ? ` · Внутри: ${contItems.length}` : ''}`
                                  : `Свободно для заливки: ${Math.round(bd.freeMl)} мл`}
                              </div>
                            </div>
                          </div>

                          {hasLiquid && (
                            <div className="inv-liquid-acts">
                              <button
                                type="button"
                                className="btn btn-p btn-xs"
                                onClick={() => {
                                  tryFillOrUseFluidContainer(player, openContainer, world || undefined);
                                  sound.resume();
                                  forceRender(n => n + 1);
                                }}
                              >
                                <FlaskConical width={13} height={13} />
                                <span>Выпить / Исп.</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-d btn-xs"
                                title="Слить только жидкость (предметы останутся внутри влажными)"
                                onClick={() => {
                                  const drained = drainLiquidFromContainer(openContainer);
                                  if (drained.drainedMl > 0) {
                                    sound.playWaterSpray();
                                    addPlayerNotification(
                                      player,
                                      `Слито ${drained.drainedMl} мл (${drained.liquidNameRu}).${contItems.length > 0 ? ` Предметы (${contItems.length} шт.) остались внутри.` : ''}`,
                                      'info'
                                    );
                                    forceRender(n => n + 1);
                                  }
                                }}
                              >
                                <Droplets width={13} height={13} />
                                <span>Слить</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="inv-sec-row" style={{ flex: 'none' }}>
                        <span className="inv-grp-lbl">Предметы внутри ({contItems.length})</span>
                        <div className="inv-sec-acts">
                          {contItems.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-s btn-xs"
                              title="Упорядочить и объединить стопки внутри контейнера"
                              onClick={() => {
                                const res = organizeContainerInPlace(openContainer);
                                sound.playPickup();
                                addPlayerNotification(
                                  player,
                                  res.changed ? 'Содержимое упорядочено' : 'Внутри уже порядок',
                                  'info'
                                );
                                forceRender(n => n + 1);
                              }}
                            >
                              <ArrowUpDown width={12} height={12} color="#e0ab45" />
                              <span>Порядок</span>
                            </button>
                          )}
                          {(() => {
                            const contTrash = countDisposableTrashInList(contItems);
                            if (contTrash <= 0) return null;
                            return (
                              <button
                                type="button"
                                className="btn btn-d btn-xs"
                                title="Убрать пустые упаковки и мусор из этого контейнера"
                                onClick={() => {
                                  const res = sweepTrashFromContainer(openContainer);
                                  if (res.removedCount > 0) {
                                    sound.playUseItem();
                                    addPlayerNotification(player, res.messageRu, 'info');
                                    setSelectedContainerItemIdx(0);
                                    forceRender(n => n + 1);
                                  }
                                }}
                              >
                                <Trash2 width={12} height={12} />
                                <span>Мусор ({contTrash})</span>
                              </button>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                        <div className="inv-slots">
                          {Array.from({ length: totalContSlots }).map((_, idx) => {
                            const cItem = contItems[idx];
                            const slotKey = cItem ? `cont:${idx}` : `cont:empty-${idx}`;
                            const isBeingDragged = wbDragUi?.sourceKey === slotKey;
                            const isDropTarget = wbDragUi?.overKey === slotKey;
                            const isSelected = (cItem && selectedContainerItemIdx === idx) || selectedWbSlot === slotKey;
                            const info = getSlotFillInfo(cItem);

                            if (!cItem) {
                              return (
                                <div
                                  key={slotKey}
                                  data-wb-slot={slotKey}
                                  draggable={false}
                                  onDragStart={e => e.preventDefault()}
                                  onPointerDown={e => startSlotPointerDrag(e, slotKey, null)}
                                  className={'inv-slot empty' + (isDropTarget ? ' on' : '')}
                                  style={{ borderColor: isDropTarget ? '#e0ab45' : undefined }}
                                />
                              );
                            }

                            const isSubmerged = Boolean(cItem.soakedLiquidId && (cItem.submersionLevel || 0) > 0);
                            const pkgInner = getPackagedInnerItem(cItem);
                            const isTrash = isDisposableTrashOrEmptyPackaging(cItem);
                            return (
                              <div
                                key={slotKey}
                                data-wb-slot={slotKey}
                                draggable={false}
                                onDragStart={e => e.preventDefault()}
                                onContextMenu={e => handleSlotContextMenu(e, slotKey, cItem)}
                                onPointerDown={e =>
                                  startSlotPointerDrag(e, slotKey, cItem, () => {
                                    setSelectedContainerItemIdx(idx);
                                  })
                                }
                                onDoubleClick={() => handleExtractFromContainer(openContainer, idx, 'pockets')}
                                className={'inv-slot' + (isSelected || isDropTarget ? ' on' : '') + (isTrash ? ' is-trash' : '')}
                                style={{
                                  cursor: 'grab',
                                  opacity: isBeingDragged ? 0.35 : 1,
                                  borderColor: isDropTarget ? '#e0ab45' : (isSubmerged ? `${cItem.soakedColor || '#38bdf8'}99` : undefined),
                                  boxShadow: isSubmerged ? `inset 0 -10px 14px -8px ${cItem.soakedColor || '#38bdf8'}66` : undefined,
                                }}
                                title={pkgInner ? `${getItemReadableTitleRu(cItem)}\n${info?.tooltip || ''}` : info?.tooltip}
                              >
                                <ItemIconCanvas itemId={cItem.itemId} item={cItem} size={42} />
                                {pkgInner && (
                                  <span className="inv-pkg-sub" title={pkgInner.nameRu}>
                                    <ItemIconCanvas itemId={pkgInner.itemId} item={pkgInner} size={18} />
                                  </span>
                                )}
                                {cItem.count > 1 && <span className="inv-cnt">{cItem.count}</span>}
                                {isSubmerged && (
                                  <span className="inv-submerge">
                                    <Droplets width={9} height={9} color={cItem.soakedColor || '#38bdf8'} />
                                  </span>
                                )}
                                {info && info.pct !== null && (
                                  <div className="inv-fill">
                                    <i style={{ width: `${info.pct}%`, background: info.color || undefined }} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {selectedContItem && (
                        <div className="card-sm inv-cont-foot">
                          <div className="inv-liquid-l">
                            <ItemIconCanvas itemId={selectedContItem.itemId} item={selectedContItem} size={28} />
                            <div style={{ minWidth: 0 }}>
                              <div className="inv-liquid-name">{selectedContItem.nameRu}</div>
                              <div className="inv-liquid-meta mono">
                                {selectedContItem.count} шт. · {formatWeightRu(getItemTotalWeight(selectedContItem))} · {Math.round(getItemTotalVolume(selectedContItem) * 1000)} мл
                                {selectedContItem.soakedLiquidNameRu && (selectedContItem.wetness || 0) >= 10
                                  ? ` · ${selectedContItem.soakedLiquidNameRu} (${Math.round(selectedContItem.wetness || 0)}%)`
                                  : ''}
                              </div>
                            </div>
                          </div>
                          <div className="inv-liquid-acts">
                            <button
                              type="button"
                              className="btn btn-p btn-xs"
                              onClick={() => handleExtractFromContainer(openContainer, selectedContainerItemIdx, 'pockets')}
                            >
                              <ArrowUpFromLine width={12} height={12} />
                              <span>В карман</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-s btn-xs"
                              onClick={() => handleExtractFromContainer(openContainer, selectedContainerItemIdx, 'rightHand')}
                            >
                              <Hand width={12} height={12} />
                              <span>В руку</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-d btn-xs"
                              onClick={() => handleDropFromContainer(openContainer, selectedContainerItemIdx)}
                              title="Выбросить на землю"
                              aria-label="Выбросить на землю"
                            >
                              <Trash2 width={13} height={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </section>

                    <section className="panel inv-col">
                      <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                        {renderCompartmentsSlotGrid()}
                      </div>
                    </section>
                  </div>
                </div>
              );
            })()}

            {/* ==================== TAB 2: SURROUNDINGS ==================== */}
            {activeTab === 'surroundings' && (() => {
              const totalGroundSlots = Math.max(18, nearbyGroundItems.length + 6);
              const isGroundZoneTarget = wbDragUi?.overKey === 'zone:ground';

              return (
                <div className="inv-split-even">
                  <section
                    className="panel inv-col"
                    data-wb-drop-zone="zone:ground"
                    style={{ borderColor: isGroundZoneTarget ? '#e0ab45' : undefined }}
                  >
                    <div className="inv-sec-row" style={{ flex: 'none' }}>
                      <span className="inv-grp-lbl">Земля рядом ({nearbyGroundItems.length})</span>
                      <span className="mut" style={{ fontSize: 12 }}>Перетащите в карманы / руки или бросьте сюда</span>
                    </div>

                    <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                      <div className="inv-slots">
                        {Array.from({ length: totalGroundSlots }).map((_, idx) => {
                          const gi = nearbyGroundItems[idx];
                          const slotKey = gi ? `ground:${gi.id}` : `ground:empty-${idx}`;
                          const isBeingDragged = wbDragUi?.sourceKey === slotKey;
                          const isDropTarget = wbDragUi?.overKey === slotKey;
                          const info = getSlotFillInfo(gi?.item);

                          if (!gi) {
                            return (
                              <div
                                key={slotKey}
                                data-wb-slot={slotKey}
                                draggable={false}
                                onDragStart={e => e.preventDefault()}
                                onPointerDown={e => startSlotPointerDrag(e, slotKey, null)}
                                className={'inv-slot empty' + (isDropTarget ? ' on' : '')}
                                style={{ borderColor: isDropTarget ? '#e0ab45' : undefined }}
                              />
                            );
                          }

                          return (
                            <div
                              key={slotKey}
                              data-wb-slot={slotKey}
                              draggable={false}
                              onDragStart={e => e.preventDefault()}
                              onContextMenu={e => handleSlotContextMenu(e, slotKey, gi.item)}
                              onPointerDown={e => startSlotPointerDrag(e, slotKey, gi.item)}
                              onDoubleClick={() => handlePickupGroundItem(gi)}
                              className={'inv-slot' + (isDropTarget || selectedWbSlot === slotKey ? ' on' : '')}
                              style={{
                                cursor: 'grab',
                                opacity: isBeingDragged ? 0.35 : 1,
                                borderColor: isDropTarget ? '#e0ab45' : undefined,
                              }}
                              title={info?.tooltip}
                            >
                              <ItemIconCanvas itemId={gi.item.itemId} item={gi.item} size={42} />
                              {gi.item.count > 1 && <span className="inv-cnt">{gi.item.count}</span>}
                              {info && info.pct !== null && (
                                <div className="inv-fill">
                                  <i style={{ width: `${info.pct}%`, background: info.color || undefined }} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  <section className="panel inv-col">
                    <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                      {renderCompartmentsSlotGrid()}
                    </div>
                  </section>
                </div>
              );
            })()}

            {/* ==================== TAB 5: FREEROAM CATALOG ==================== */}
            {activeTab === 'catalog' && isFreeroam && (
              <div className="inv-split">
                <section className="panel inv-col">
                  <div className="inv-cat-bar">
                    <label className="inv-search">
                      <Search width={15} height={15} color="#a29e93" style={{ flex: 'none' }} />
                      <input
                        id="catalog-search"
                        type="text"
                        value={catalogSearch}
                        onChange={e => {
                          setCatalogSearch(e.target.value);
                          setCatalogLimit(240);
                        }}
                        onKeyDown={stopGameKeys}
                        placeholder="Поиск предметов..."
                        autoComplete="off"
                      />
                    </label>

                    <div className="inv-pills" style={{ paddingBottom: 0, flex: 1 }}>
                      {FREE_CATALOG_CATEGORIES.map(cat => {
                        const on = catalogCategory === cat.id;
                        return (
                          <button
                            type="button"
                            key={cat.id}
                            id={`catalog-cat-${cat.id}`}
                            onClick={() => {
                              setCatalogCategory(cat.id);
                              setCatalogLimit(240);
                            }}
                            className={'inv-pill' + (on ? ' on' : '')}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>

                    <span className="mut mono" style={{ fontSize: 12.5, flex: 'none' }}>
                      {catalogFiltered.length}
                    </span>
                  </div>

                  <div
                    className="scroll"
                    style={{ flex: 1, minHeight: 0, paddingRight: 4 }}
                    onScroll={e => {
                      const el = e.currentTarget;
                      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 240 && catalogLimit < catalogFiltered.length) {
                        setCatalogLimit(n => n + 240);
                      }
                    }}
                  >
                    {catalogFiltered.length === 0 ? (
                      <div className="inv-empty">
                        <span style={{ fontSize: 14 }}>Предметы не найдены</span>
                      </div>
                    ) : (
                      <div className="inv-slots">
                        {catalogFiltered.slice(0, catalogLimit).map(it => (
                          <div
                            key={it.id}
                            role="button"
                            tabIndex={0}
                            data-catalog-slot={it.id}
                            className={'inv-slot' + (catalogSelectedId === it.id ? ' on' : '')}
                            style={{ cursor: 'pointer' }}
                            title={it.presetGroup ? `${it.nameRu} (${it.presetGroup})` : it.nameRu}
                            onClick={() => {
                              setCatalogSelectedId(it.id);
                            }}
                            onDoubleClick={() => {
                              setCatalogSelectedId(it.id);
                              handleGiveCatalogEntry(it, 1);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setCatalogSelectedId(it.id);
                              }
                            }}
                          >
                            <ItemIconCanvas
                              itemId={it.key}
                              item={it.previewItem}
                              size={42}
                              rawBase={Boolean(it.isRawBase)}
                            />
                            {it.kind === 'preset' && <span className="cat-slot-dot" />}
                            {it.kind === 'liquid_jar' && it.accentColor && (
                              <div className="inv-fill">
                                <i style={{ width: '100%', background: it.accentColor }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="panel inv-col">
                  {catalogSelected && catalogDraft ? (
                    <>
                      <div className="inv-detail-head">
                        <div className="inv-detail-ic">
                          <ItemIconCanvas
                            itemId={catalogDraft.itemId}
                            item={catalogDraft}
                            size={44}
                            rawBase={Boolean(catalogSelected.isRawBase && !catalogDraftDirty)}
                          />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="cn inv-detail-title" title={catalogDraft.nameRu}>
                            {catalogDraft.nameRu}
                          </div>
                          <div className="inv-detail-meta mono">
                            <span style={{ color: '#e0ab45', fontWeight: 600 }}>
                              {catalogSelected.presetGroup || getFreeCategoryLabelRu(catalogSelected.category)}
                            </span>
                            {' · '}
                            {formatWeightRu(catalogDraft.weight)}
                            {' · '}
                            стак до {catalogDraft.maxStack || 1}
                          </div>
                        </div>
                        {catalogDraftDirty && (
                          <button
                            type="button"
                            className="btn btn-s btn-xs cat-reset-btn"
                            title="Сбросить изменения к пресету"
                            onClick={() => {
                              setCatalogDraft(catalogSelected.create(1));
                              setCatalogDraftDirty(false);
                            }}
                          >
                            <RotateCcw width={13} height={13} />
                          </button>
                        )}
                      </div>

                      <div className="inv-detail-scroll scroll">
                        {catalogDraft.descriptionRu && (
                          <div className="note cat-ed-desc">
                            {catalogDraft.descriptionRu}
                          </div>
                        )}
                        <CatalogAttributeEditor
                          item={catalogDraft}
                          onChange={nextItem => {
                            setCatalogDraft(nextItem);
                            setCatalogDraftDirty(true);
                          }}
                        />
                      </div>

                      <div className="inv-detail-foot">
                        <div className="cat-foot-row">
                          {(catalogDraft.maxStack || 1) > 1 && (
                            <div className="cat-qty">
                              <button
                                type="button"
                                className="cat-qty-btn"
                                disabled={catalogGiveCount <= 1}
                                onClick={() => setCatalogGiveCount(c => Math.max(1, c - 1))}
                                title="Уменьшить количество"
                              >
                                <Minus width={13} height={13} />
                              </button>
                              <span className="cat-qty-val mono">{catalogGiveCount}</span>
                              <button
                                type="button"
                                className="cat-qty-btn"
                                disabled={catalogGiveCount >= (catalogDraft.maxStack || 1)}
                                onClick={() => setCatalogGiveCount(c => Math.min(catalogDraft.maxStack || 1, c + 1))}
                                title="Увеличить количество"
                              >
                                <Plus width={13} height={13} />
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            id="catalog-give-one"
                            className="btn btn-p btn-sm"
                            style={{ flex: 1, minWidth: 0 }}
                            onClick={() => handleGiveCatalogDraft(catalogGiveCount, 'pockets')}
                          >
                            Выдать{(catalogDraft.maxStack || 1) > 1 && catalogGiveCount > 1 ? ` (${catalogGiveCount})` : ''}
                          </button>
                          <button
                            type="button"
                            id="catalog-give-hand"
                            className="btn btn-s btn-sm"
                            onClick={() => handleGiveCatalogDraft(1, 'hand')}
                            title="Выдать 1 шт. сразу в руку"
                          >
                            <Hand width={14} height={14} />
                            <span>В руку</span>
                          </button>
                          {(catalogDraft.maxStack || 1) > 1 && (
                            <button
                              type="button"
                              id="catalog-give-stack"
                              className="btn btn-s btn-sm"
                              onClick={() => handleGiveCatalogDraft(catalogDraft.maxStack || 1, 'pockets')}
                              title={`Выдать полный стак (${catalogDraft.maxStack} шт.)`}
                            >
                              ×{catalogDraft.maxStack}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="inv-empty">
                      <Wand2 width={34} height={34} color="#8f8b81" />
                      <div style={{ fontSize: 14, maxWidth: 260 }}>
                        Выберите предмет слева, чтобы настроить цвет, материал и характеристики перед выдачей. Двойной клик сразу выдаёт 1 шт.
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ==================== TAB 3: CLOTHING ==================== */}
            {activeTab === 'clothing' && (() => {
              const SLOT_ORDER: { slot: string; label: string; icon: React.ReactNode }[] = [
                { slot: 'head', label: 'Голова', icon: <HardHat width={16} height={16} /> },
                { slot: 'face', label: 'Лицо', icon: <Glasses width={16} height={16} /> },
                { slot: 'torso', label: 'Торс', icon: <Shirt width={16} height={16} /> },
                {
                  slot: 'legs',
                  label: 'Ноги',
                  icon: (
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3h12l1 18-5-1-2-9-2 9-5 1z" />
                    </svg>
                  ),
                },
                { slot: 'hands', label: 'Кисти', icon: <Hand width={16} height={16} /> },
                { slot: 'feet', label: 'Обувь', icon: <Footprints width={16} height={16} /> },
                { slot: 'back', label: 'Спина', icon: <Backpack width={16} height={16} /> },
              ];
              const LAYER_ORDER = ['skin', 'underwear', 'shirt', 'jacket', 'outerwear'];
              const LAYER_LABELS_RU: Record<string, string> = {
                skin: 'Тело',
                underwear: 'Бельё',
                shirt: 'Рубашка',
                jacket: 'Куртка',
                outerwear: 'Верхний слой',
              };

              const worn = player.equippedClothing || {};
              const knownSlots = new Set(SLOT_ORDER.map(r => r.slot));
              const extraSlots = Object.keys(worn).filter(
                sl => !knownSlots.has(sl) && Object.values((worn as any)[sl] || {}).some(Boolean)
              );
              const rows = [
                ...SLOT_ORDER,
                ...extraSlots.map(sl => ({ slot: sl, label: sl, icon: <Shirt width={16} height={16} /> })),
              ].map(r => {
                const layers = ((worn as any)[r.slot] || {}) as Record<string, InventoryItem | undefined>;
                const keys = [
                  ...LAYER_ORDER.filter(l => layers[l]),
                  ...Object.keys(layers).filter(l => !LAYER_ORDER.includes(l) && layers[l]),
                ];
                return { ...r, entries: keys.map(layer => ({ layer, item: layers[layer] as InventoryItem })) };
              });

              let totalInsulation = 0;
              let totalMobility = 0;
              let totalPocketsL = 0;
              let wornCount = 0;
              rows.forEach(r =>
                r.entries.forEach(({ item }) => {
                  wornCount += 1;
                  totalInsulation += item.clothingStats?.insulation || 0;
                  totalMobility += item.clothingStats?.mobilityPenalty || 0;
                  totalPocketsL += item.clothingStats?.pocketCapacityL || 0;
                })
              );
              const coveredCount = rows.filter(r => r.entries.length > 0).length;
              const isClothZoneTarget = wbDragUi?.overKey === 'zone:clothing';
              const fmt = (n: number) => Number(n.toFixed(1)).toString();

              return (
                <div className="inv-split-cloth">
                  <section
                    className="panel inv-col"
                    data-wb-drop-zone="zone:clothing"
                    style={{ borderColor: isClothZoneTarget ? '#e0ab45' : undefined }}
                  >
                    <div className="inv-eq-summary">
                      <div className="inv-eq-stats">
                        <div className="inv-eq-stat" title="Суммарная теплоизоляция">
                          <Thermometer width={15} height={15} color="#e0ab45" />
                          <span>Тепло</span>
                          <b>{fmt(totalInsulation)}</b>
                        </div>
                        <div className="inv-eq-stat" title="Штраф к подвижности">
                          <Weight width={15} height={15} color="#a29e93" />
                          <span>Подвижность</span>
                          <b className={totalMobility > 0 ? 'bad' : ''}>{totalMobility > 0 ? '−' : ''}{fmt(totalMobility)}</b>
                        </div>
                        <div className="inv-eq-stat" title="Объём карманов от одежды">
                          <Package width={15} height={15} color="#9ac985" />
                          <span>Карманы</span>
                          <b>+{fmt(totalPocketsL)} л</b>
                        </div>
                      </div>
                      <span className="mut mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {coveredCount}/{SLOT_ORDER.length} · {wornCount} предм.
                      </span>
                    </div>

                    <div className="inv-eq-list scroll">
                      {rows.map(row => (
                        <div key={row.slot} className={'inv-eq-row' + (row.entries.length === 0 ? ' bare' : '')}>
                          <div className="inv-eq-part">
                            {row.icon}
                            <span>{row.label}</span>
                          </div>

                          <div className="inv-eq-items">
                            {row.entries.length === 0 ? (
                              (() => {
                                const emptyKey = `cloth:empty:${row.slot}`;
                                const isOver = wbDragUi?.overKey === emptyKey;
                                return (
                                  <div
                                    data-wb-slot={emptyKey}
                                    draggable={false}
                                    onDragStart={e => e.preventDefault()}
                                    onPointerDown={e => startSlotPointerDrag(e, emptyKey, null)}
                                    className={'inv-eq-empty' + (isOver ? ' on' : '')}
                                  >
                                    Ничего не надето
                                  </div>
                                );
                              })()
                            ) : (
                              row.entries.map(({ layer, item }) => {
                                const slotKey = `cloth:${row.slot}:${layer}`;
                                const isBeingDragged = wbDragUi?.sourceKey === slotKey;
                                const isDropTarget = wbDragUi?.overKey === slotKey;
                                const st = item.clothingStats;
                                const wet = Math.round(item.wetness ?? st?.wetness ?? 0);
                                const metaParts: string[] = [LAYER_LABELS_RU[layer] || layer];
                                if (st) {
                                  metaParts.push(`Тепло ${Math.round(st.insulation)}`);
                                  if (st.waterResistance > 0) metaParts.push(`Вода ${Math.round(st.waterResistance)}%`);
                                  if (st.pocketCapacityL) metaParts.push(`+${st.pocketCapacityL} л`);
                                }
                                return (
                                  <div
                                    key={slotKey}
                                    data-wb-slot={slotKey}
                                    draggable={false}
                                    onDragStart={e => e.preventDefault()}
                                    onContextMenu={e => handleSlotContextMenu(e, slotKey, item)}
                                    onPointerDown={e => startSlotPointerDrag(e, slotKey, item)}
                                    onDoubleClick={() => handleUnequipItem(row.slot, layer)}
                                    className={'inv-eq-item' + (isDropTarget || selectedWbSlot === slotKey ? ' on' : '')}
                                    style={{ opacity: isBeingDragged ? 0.35 : 1 }}
                                    title="Двойной клик или перетащить в карман, чтобы снять"
                                  >
                                    <ItemIconCanvas itemId={item.itemId} item={item} size={34} />
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <span className="inv-eq-name">{item.nameRu}</span>
                                      <span className="inv-eq-sub mono">{metaParts.join(' · ')}</span>
                                    </div>
                                    {wet > 0 && (
                                      <span className="inv-eq-wet mono" title="Влажность ткани">
                                        <CloudRain width={12} height={12} />
                                        {wet}%
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="inv-eq-hint">
                      Перетащите одежду сюда, чтобы надеть, или в карман, чтобы снять
                    </div>
                  </section>

                  <section className="panel inv-col">
                    <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                      {renderCompartmentsSlotGrid()}
                    </div>
                  </section>
                </div>
              );
            })()}

            {/* ==================== TAB 4: INTERACTION WORKBENCH ==================== */}
            {activeTab === 'interaction' && (() => {
              const renderSquareSlot = (
                slotKey: string,
                item: InventoryItem | null | undefined,
                options?: {
                  isPreview?: boolean;
                  isHand?: boolean;
                  dosageLabel?: string | null;
                  isActivePour?: boolean;
                  onDoubleClick?: () => void;
                }
              ) => {
                const info = getSlotFillInfo(item);
                const isPreview = Boolean(options?.isPreview);
                const isBeingDragged = wbDragUi?.sourceKey === slotKey;
                const isDropTarget = wbDragUi?.overKey === slotKey;
                const isSelected = selectedWbSlot === slotKey;
                const doseLabel = options?.dosageLabel || null;

                return (
                  <div
                    key={slotKey}
                    id={`slot-${slotKey.replace(':', '-')}`}
                    data-wb-slot={slotKey}
                    draggable={false}
                    onDragStart={e => e.preventDefault()}
                    onContextMenu={e => handleSlotContextMenu(e, slotKey, item)}
                    onPointerDown={e => startSlotPointerDrag(e, slotKey, item)}
                    onDoubleClick={options?.onDoubleClick}
                    className={
                      'inv-slot inv-wb-slot' +
                      (!item ? ' empty' : '') +
                      (isDropTarget || isSelected ? ' on' : '')
                    }
                    style={{
                      cursor: item ? 'grab' : selectedWbSlot && !slotKey.startsWith('output:') ? 'pointer' : 'default',
                      opacity: isBeingDragged ? 0.35 : isPreview ? 0.85 : 1,
                      borderStyle: isPreview && !isDropTarget ? 'dashed' : undefined,
                      borderColor: isDropTarget
                        ? '#e0ab45'
                        : isPreview
                        ? 'rgba(224, 171, 69, .65)'
                        : undefined,
                    }}
                    title={
                      doseLabel
                        ? (info?.tooltip ? `${info.tooltip} · Дозировка: ${doseLabel}` : `Дозировка слива: ${doseLabel}`)
                        : info?.tooltip
                    }
                  >
                    {doseLabel && (
                      <span className={'inv-dose' + (options?.isActivePour ? ' act' : '') + (item ? ' occ' : '')}>
                        {doseLabel}
                      </span>
                    )}
                    {item ? (
                      <>
                        <ItemIconCanvas itemId={item.itemId} item={item} size={46} />
                        {item.count > 1 ? (
                          <span className="inv-cnt">{item.count}</span>
                        ) : item.isContainer ? (
                          <span className="inv-cnt">{item.contents?.length || 0}</span>
                        ) : null}
                        {info && info.pct !== null && (
                          <div className="inv-fill">
                            <i style={{ width: `${info.pct}%`, background: info.color || undefined }} />
                          </div>
                        )}
                      </>
                    ) : options?.isHand ? (
                      <Hand width={22} height={22} color="#5e5b54" style={{ pointerEvents: 'none' }} />
                    ) : null}
                  </div>
                );
              };

              const activePourSourceSlots = new Set<number>(
                evalResult.isValid
                  ? evalResult.transferDetails
                      .filter(d => d.dosagePct !== undefined)
                      .map(d => d.fromSlot)
                  : []
              );

              return (
                <div className="inv-split-even">
                  <div className="panel inv-wb-board">
                    <div className="inv-wb-row">
                      {/* 2 HAND SLOTS */}
                      <div className="inv-wb-col">
                        <span className="inv-grp-lbl" style={{ fontSize: 15 }}>Руки</span>
                        <div className="inv-wb-grid2">
                          {renderSquareSlot('hand:left', player.leftHandItem, {
                            isHand: true,
                            onDoubleClick: () => handlePlaceHandIntoInput('left', 'any'),
                          })}
                          {renderSquareSlot('hand:right', player.rightHandItem, {
                            isHand: true,
                            onDoubleClick: () => handlePlaceHandIntoInput('right', 'any'),
                          })}
                        </div>
                      </div>

                      {/* 2x2 INPUT SLOTS */}
                      <div className="inv-wb-col" data-wb-input-grid="true">
                        <span className="inv-grp-lbl" style={{ fontSize: 15 }}>Ввод</span>
                        <div className="inv-wb-grid2">
                          {[0, 1, 2, 3].map(idx =>
                            renderSquareSlot(`input:${idx}`, interactionInputs[idx], {
                              dosageLabel: getSlotPourDosageLabel(idx, 4),
                              isActivePour: activePourSourceSlots.has(idx),
                              onDoubleClick: () => handleRemoveInputSlot(idx),
                            })
                          )}
                        </div>
                      </div>

                      {/* EXECUTE ARROW */}
                      <button
                        type="button"
                        id="btn-execute-interaction"
                        className={'btn' + (evalResult.isValid ? ' btn-p' : ' btn-s')}
                        disabled={!evalResult.isValid}
                        onClick={handleExecuteInteraction}
                        style={{ height: 48, padding: '0 16px', marginTop: 24 }}
                        title={evalResult.isValid ? evalResult.title : undefined}
                      >
                        <ArrowRight width={22} height={22} />
                      </button>

                      {/* 2x2 OUTPUT SLOTS */}
                      <div className="inv-wb-col">
                        <span className="inv-grp-lbl" style={{ fontSize: 15 }}>Результат</span>
                        <div className="inv-wb-grid2">
                          {[0, 1, 2, 3].map(idx => {
                            const committed = interactionOutputs[idx];
                            const preview = !hasCommittedOutputs && evalResult.isValid ? evalResult.previewOutputs[idx] : null;
                            const displayItem = committed || preview;
                            return renderSquareSlot(`output:${idx}`, displayItem, {
                              isPreview: !committed && Boolean(preview),
                              onDoubleClick: () => {
                                if (ensureOutputsCommitted()) {
                                  handleClaimOutputSlot(idx);
                                }
                              },
                            });
                          })}
                        </div>
                      </div>
                    </div>

                    <div className={'inv-wb-status' + (evalResult.isValid ? ' valid' : '')}>
                      {evalResult.isValid || interactionInputs.some(Boolean)
                        ? `${evalResult.title} — ${evalResult.subtitle}`
                        : 'Перетащите предметы из карманов или рук в слоты ввода (или Shift+Клик)'}
                    </div>

                    {workbenchActiveCount > 0 && (
                      <button
                        type="button"
                        className="btn btn-s btn-xs"
                        onClick={handleClearWorkbench}
                      >
                        <RotateCcw width={13} height={13} />
                        <span>Очистить стол ({workbenchActiveCount})</span>
                      </button>
                    )}
                  </div>

                  <section className="panel inv-col">
                    <div className="scroll" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                      {renderCompartmentsSlotGrid()}
                    </div>
                  </section>
                </div>
              );
            })()}
          </div>

          {/* Bottom Keyboard Hints (auto-hidden on touch) */}
          <div className="hint">
            <div className="hint-g">
              <span className="key">Esc / I</span>
              <span>Закрыть</span>
              <span className="key">Shift+Клик</span>
              <span>Быстрый перенос</span>
              <span className="key">ПКМ</span>
              <span>Меню действий</span>
              <span className="key">2× Клик</span>
              <span>Использовать</span>
            </div>
            <div className="hint-r">
              Лев: <strong style={{ color: '#e9e6df' }}>{player.leftHandItem ? player.leftHandItem.nameRu : 'Свободна'}</strong>
              {' · '}
              Прав: <strong style={{ color: '#e9e6df' }}>{player.rightHandItem ? player.rightHandItem.nameRu : 'Свободна'}</strong>
            </div>
          </div>
        </div>

        {/* GLOBAL FLOATING DRAG PREVIEW (outside scaled .gm so clientX/Y match 1:1) */}
        <div ref={ghostRef} className="inv-drag-ghost">
          {wbDragUi && (
            <ItemIconCanvas itemId={wbDragUi.item.itemId} item={wbDragUi.item} size={46} />
          )}
        </div>

        {/* FLOATING RIGHT-CLICK CONTEXT MENU */}
        {ctxMenu && (
          <div
            className="inv-ctx-menu"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <div className="inv-ctx-head">{ctxMenu.item.nameRu}</div>
            {ctxMenu.slotKey.startsWith('inv:') && (() => {
              const idx = parseInt(ctxMenu.slotKey.replace('inv:', ''), 10);
              const it = ctxMenu.item;
              return (
                <>
                  {it.usable && (
                    <button
                      type="button"
                      className="inv-ctx-item primary"
                      onClick={() => {
                        setCtxMenu(null);
                        handleUseItem(idx);
                      }}
                    >
                      <Check width={14} height={14} />
                      <span>Использовать</span>
                    </button>
                  )}
                  {it.isContainer && !isFluidContainerClosed(it) && !(it.singleUseContainer && !it.isOpen) && (
                    <button
                      type="button"
                      className="inv-ctx-item primary"
                      onClick={() => {
                        setCtxMenu(null);
                        setOpenContainer(it);
                        setSelectedContainerItemIdx(0);
                      }}
                    >
                      <FolderOpen width={14} height={14} />
                      <span>Открыть контейнер</span>
                    </button>
                  )}
                  {openContainer && it.id !== openContainer.id && (
                    <button
                      type="button"
                      className="inv-ctx-item"
                      onClick={() => {
                        setCtxMenu(null);
                        handlePutIntoContainer(openContainer, idx);
                      }}
                    >
                      <ArrowDownToLine width={14} height={14} />
                      <span>В контейнер</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="inv-ctx-item"
                    onClick={() => {
                      setCtxMenu(null);
                      handleTakeToHand('right', idx);
                    }}
                  >
                    <Hand width={14} height={14} />
                    <span>В правую руку</span>
                  </button>
                  <button
                    type="button"
                    className="inv-ctx-item"
                    onClick={() => {
                      setCtxMenu(null);
                      handleTakeToHand('left', idx);
                    }}
                  >
                    <Hand width={14} height={14} />
                    <span>В левую руку</span>
                  </button>
                  <button
                    type="button"
                    className="inv-ctx-item"
                    onClick={() => {
                      setCtxMenu(null);
                      handlePlacePocketIntoInput(idx);
                      setActiveTab('interaction');
                    }}
                  >
                    <Layers width={14} height={14} />
                    <span>На стол взаимодействия</span>
                  </button>
                  {it.category === 'clothing' && (
                    <button
                      type="button"
                      className="inv-ctx-item"
                      onClick={() => {
                        setCtxMenu(null);
                        handleEquipItem(idx);
                      }}
                    >
                      <Shirt width={14} height={14} />
                      <span>Надеть</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="inv-ctx-item danger"
                    onClick={() => {
                      setCtxMenu(null);
                      handleDropItem(idx);
                    }}
                  >
                    <Trash2 width={14} height={14} />
                    <span>Выбросить</span>
                  </button>
                </>
              );
            })()}
            {(ctxMenu.slotKey === 'hand:left' || ctxMenu.slotKey === 'hand:right') && (() => {
              const hand = ctxMenu.slotKey === 'hand:left' ? 'left' : 'right';
              const it = ctxMenu.item;
              return (
                <>
                  {it.usable && (
                    <button
                      type="button"
                      className="inv-ctx-item primary"
                      onClick={() => {
                        setCtxMenu(null);
                        handleUseHandItem(hand);
                      }}
                    >
                      <Check width={14} height={14} />
                      <span>Использовать</span>
                    </button>
                  )}
                  {it.isContainer && !isFluidContainerClosed(it) && !(it.singleUseContainer && !it.isOpen) && (
                    <button
                      type="button"
                      className="inv-ctx-item primary"
                      onClick={() => {
                        setCtxMenu(null);
                        setOpenContainer(it);
                        setSelectedContainerItemIdx(0);
                      }}
                    >
                      <FolderOpen width={14} height={14} />
                      <span>Открыть контейнер</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="inv-ctx-item"
                    onClick={() => {
                      setCtxMenu(null);
                      handleStowHand(hand);
                    }}
                  >
                    <Package width={14} height={14} />
                    <span>Убрать в карман</span>
                  </button>
                  <button
                    type="button"
                    className="inv-ctx-item"
                    onClick={() => {
                      setCtxMenu(null);
                      handlePlaceHandIntoInput(hand, 'any');
                      setActiveTab('interaction');
                    }}
                  >
                    <Layers width={14} height={14} />
                    <span>На стол взаимодействия</span>
                  </button>
                  <button
                    type="button"
                    className="inv-ctx-item danger"
                    onClick={() => {
                      setCtxMenu(null);
                      handleDropFromHand(hand);
                    }}
                  >
                    <Trash2 width={14} height={14} />
                    <span>Выбросить</span>
                  </button>
                </>
              );
            })()}
            {ctxMenu.slotKey.startsWith('cont:') && openContainer && (() => {
              const cIdx = parseInt(ctxMenu.slotKey.replace('cont:', ''), 10);
              return (
                <>
                  <button
                    type="button"
                    className="inv-ctx-item primary"
                    onClick={() => {
                      setCtxMenu(null);
                      handleExtractFromContainer(openContainer, cIdx, 'pockets');
                    }}
                  >
                    <ArrowUpFromLine width={14} height={14} />
                    <span>Достать в карман</span>
                  </button>
                  <button
                    type="button"
                    className="inv-ctx-item"
                    onClick={() => {
                      setCtxMenu(null);
                      handleExtractFromContainer(openContainer, cIdx, 'rightHand');
                    }}
                  >
                    <Hand width={14} height={14} />
                    <span>В правую руку</span>
                  </button>
                  <button
                    type="button"
                    className="inv-ctx-item danger"
                    onClick={() => {
                      setCtxMenu(null);
                      handleDropFromContainer(openContainer, cIdx);
                    }}
                  >
                    <Trash2 width={14} height={14} />
                    <span>Выбросить</span>
                  </button>
                </>
              );
            })()}
            {ctxMenu.slotKey.startsWith('ground:') && (() => {
              const groundId = ctxMenu.slotKey.replace('ground:', '');
              const gi = nearbyGroundItems.find(g => g.id === groundId);
              if (!gi) return null;
              return (
                <>
                  <button
                    type="button"
                    className="inv-ctx-item primary"
                    onClick={() => {
                      setCtxMenu(null);
                      handlePickupGroundItem(gi);
                    }}
                  >
                    <Package width={14} height={14} />
                    <span>Подобрать в карман</span>
                  </button>
                  <button
                    type="button"
                    className="inv-ctx-item"
                    onClick={() => {
                      setCtxMenu(null);
                      handlePickupGroundItem(gi, 'hand:right');
                    }}
                  >
                    <Hand width={14} height={14} />
                    <span>Взять в правую руку</span>
                  </button>
                </>
              );
            })()}
            {ctxMenu.slotKey.startsWith('cloth:') && (() => {
              const parts = ctxMenu.slotKey.split(':');
              return (
                <button
                  type="button"
                  className="inv-ctx-item primary"
                  onClick={() => {
                    setCtxMenu(null);
                    if (parts[1] && parts[2]) handleUnequipItem(parts[1], parts[2]);
                  }}
                >
                  <Package width={14} height={14} />
                  <span>Снять в карман</span>
                </button>
              );
            })()}
            {ctxMenu.slotKey.startsWith('input:') && (() => {
              const inIdx = parseInt(ctxMenu.slotKey.replace('input:', ''), 10);
              return (
                <button
                  type="button"
                  className="inv-ctx-item primary"
                  onClick={() => {
                    setCtxMenu(null);
                    handleRemoveInputSlot(inIdx, 'pockets');
                  }}
                >
                  <Package width={14} height={14} />
                  <span>Вернуть в карман</span>
                </button>
              );
            })()}
            {ctxMenu.slotKey.startsWith('output:') && (() => {
              const outIdx = parseInt(ctxMenu.slotKey.replace('output:', ''), 10);
              return (
                <button
                  type="button"
                  className="inv-ctx-item primary"
                  onClick={() => {
                    setCtxMenu(null);
                    if (ensureOutputsCommitted()) handleClaimOutputSlot(outIdx, 'pockets');
                  }}
                >
                  <Package width={14} height={14} />
                  <span>Забрать в карман</span>
                </button>
              );
            })()}
          </div>
        )}
      </div>
    </ShadowHost>
  );
};

export const InventoryModal: React.FC<InventoryModalProps> = React.memo(({
  isOpen,
  player,
  ...rest
}) => {
  if (!isOpen || !player) return null;
  return <InventoryModalContent player={player} {...rest} />;
});

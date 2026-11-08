import React, { useState, useEffect, useRef } from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import { 
  CookwareVessel, 
  createStoveCookwareVessel,
  createCountertopVessel,
  itemToCulinaryIngredient, 
  createWorkpieceFromVessel,
  createDryMixFromVessel,
  unpackWorkpieceIntoVessel,
  cutIngredientAction, 
  stirVesselAction, 
  addRealSeasoningAction, 
  pourRealLiquidToVessel, 
  simulateCookwareTick, 
  finishCookwareToInventoryItem,
  isCookwareItem,
  isKnifeItem,
  isSaltItem,
  isOilOrFatItem,
  isPlateOrBowlItem,
  getVisualAppearanceDescription,
  getSensoryObservations
} from '../cookingEngine';
import { drawLiveCulinaryViewport } from '../graphics/culinaryGraphics';
import { 
  addItemToPlayer, 
  removeItemFromPlayer, 
  addPlayerNotification 
} from '../items';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ModalShell, Tabs } from './gameUi';
import { sound } from '../audio';
import { getBuildingLayout } from '../buildingInteriors';
import { 
  Flame, 
  Droplets, 
  Utensils, 
  RotateCw, 
  Plus, 
  Trash2, 
  Check, 
  Layers, 
  Activity, 
  Sparkles,
  Disc,
  Volume2,
  Package
} from 'lucide-react';

interface KitchenStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  world?: GameWorld | null;
  onInventoryUpdated?: () => void;
  onVitalsChange?: () => void;
  stationName?: string;
  furnitureType?: string;
  onOpenStorage?: () => void;
}

export const KitchenStationModal: React.FC<KitchenStationModalProps> = ({
  isOpen,
  onClose,
  player,
  world,
  onInventoryUpdated,
  onVitalsChange,
  furnitureType = 'kitchen_counter',
  onOpenStorage
}) => {
  if (!isOpen || !player) return null;

  const isStove = furnitureType === 'stove';

  const [mobileTab, setMobileTab] = useState<'station' | 'products' | 'sensory'>('station');

  const safeInventory: InventoryItem[] = (player.inventory || []).filter((i): i is InventoryItem => Boolean(i && i.itemId));

  const [vessel, setVessel] = useState<CookwareVessel>(() => {
    if (isStove) {
      return createStoveCookwareVessel(undefined);
    } else {
      return createCountertopVessel('Кухонная столешница (Разделочный стол)');
    }
  });

  const [selectedIngredientIdx, setSelectedIngredientIdx] = useState<number | null>(null);
  const [lastSensoryLog, setLastSensoryLog] = useState<string>(
    isStove 
      ? 'Конфорка плиты готова к работе. Установите сковороду или кастрюлю.' 
      : 'Разделочная доска на столешнице готова. Выложите продукты для нарезки и смешивания.'
  );
  const [tickCounter, setTickCounter] = useState<number>(0);
  const lastSoundTickRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const carriedKnife = safeInventory.find(i => isKnifeItem(i.itemId)) || 
    (player.leftHandItem && player.leftHandItem.itemId && isKnifeItem(player.leftHandItem.itemId) ? player.leftHandItem : null) ||
    (player.rightHandItem && player.rightHandItem.itemId && isKnifeItem(player.rightHandItem.itemId) ? player.rightHandItem : null);

  const carriedSalt = safeInventory.find(i => isSaltItem(i.itemId));
  const carriedOil = safeInventory.find(i => isOilOrFatItem(i.itemId));
  const carriedPlates = safeInventory.filter(i => isPlateOrBowlItem(i.itemId));
  const carriedCookwareList = safeInventory.filter(i => isCookwareItem(i.itemId));
  const foodItems = safeInventory.filter(i => (i.category === 'food' || i.category === 'drink' || i.itemId === 'prep_workpiece' || i.itemId === 'food_mix') && !i.itemId.startsWith('paper_packaging'));

  const availablePans = carriedCookwareList.filter(c => c.itemId.startsWith('kitchen_pan_'));
  const availablePots = carriedCookwareList.filter(c => c.itemId.startsWith('kitchen_pot_') || c.itemId === 'pot_clay_medium');
  const availableBowls = carriedPlates.filter(c => c.itemId.startsWith('kitchen_bowl_') || c.itemId === 'soup_bowl_empty');

  let hasNearbySink = false;
  if (player.insideBuildingId && world?.buildings) {
    const bld = world.buildings.find(b => b.id === player.insideBuildingId);
    if (bld) {
      const layout = getBuildingLayout(bld, player.currentFloor || 0);
      if (layout && layout.furniture) {
        hasNearbySink = layout.furniture.some(f => f.type === 'sink');
      }
    }
  }

  // Continuous thermodynamic simulation loop (1000ms tick)
  useEffect(() => {
    const timer = setInterval(() => {
      setVessel(prev => {
        if (prev.hasBurner && prev.vesselType === 'surface') {
          return prev;
        }

        const next: CookwareVessel = {
          ...prev,
          ingredients: prev.ingredients.map(ing => ({
            ...ing,
            nutrients: { ...ing.nutrients },
            bioState: { ...ing.bioState }
          })),
          liquids: prev.liquids.map(l => ({ ...l }))
        };

        simulateCookwareTick(next, 1.0, 22.0);

        const now = Date.now();
        if (now - lastSoundTickRef.current > 3000) {
          const hasOilLiquid = next.liquids.some(l => l.isFatOrOil);
          const hasWaterLiquid = next.liquids.some(l => !l.isFatOrOil);

          if (hasOilLiquid && next.temperature >= 140) {
            sound.playUseItem();
            lastSoundTickRef.current = now;
          } else if (hasWaterLiquid && next.temperature >= 95) {
            sound.playDrink();
            lastSoundTickRef.current = now;
          }
        }

        const highestChar = next.ingredients.reduce((m, i) => Math.max(m, i.bioState.charring), 0);
        if (highestChar > 0.4 && next.heatSourcePower >= 3) {
          setLastSensoryLog('Внимание: Едкий сизый дым! Ингредиенты пригорают ко дну — снимите с огня или переверните!');
        } else if (next.smokeIntensity > 0.5) {
          setLastSensoryLog('В воздухе запах гари: масло раскалилось до дыма.');
        }

        return next;
      });
      setTickCounter(c => c + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Redraw Live Culinary Viewport Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(200, Math.floor(rect.width));
    const h = Math.max(160, Math.floor(rect.height));

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    drawLiveCulinaryViewport(ctx, vessel, w, h, isStove, selectedIngredientIdx, tickCounter);
    ctx.restore();
  }, [vessel, selectedIngredientIdx, tickCounter, isStove]);

  const handlePlaceCookwareOnBurner = (cookwareItem: InventoryItem) => {
    if (vessel.ingredients.length > 0 || vessel.liquids.length > 0) {
      addPlayerNotification(player, 'Сначала снимите текущую посуду или освободите ее содержимое.', 'warning');
      return;
    }

    const invIdx = player.inventory.findIndex(i => Boolean(i && i.id === cookwareItem.id));
    if (invIdx < 0) return;

    if (vessel.sourceItem) {
      addItemToPlayer(player, vessel.sourceItem);
    }

    removeItemFromPlayer(player, invIdx, 1);
    const newVessel = createStoveCookwareVessel(cookwareItem);
    setVessel(newVessel);
    sound.playPickup();
    setLastSensoryLog(`На конфорку плиты поставлена «${cookwareItem.nameRu}».`);
    onInventoryUpdated?.();
  };

  const handleRemoveCookwareFromBurner = () => {
    if (!vessel.sourceItem) return;

    if (vessel.ingredients.length > 0 || vessel.liquids.length > 0) {
      const loadedCookware = finishCookwareToInventoryItem(vessel);
      if (loadedCookware) {
        const added = addItemToPlayer(player, loadedCookware);
        if (added) {
          sound.playPickup();
          addPlayerNotification(player, `Снято с плиты: «${loadedCookware.nameRu}».`, 'heal');
          setLastSensoryLog(`«${loadedCookware.nameRu}» снята с плиты вместе со всем содержимым.`);
          setVessel(createStoveCookwareVessel(undefined));
          onInventoryUpdated?.();
          return;
        } else {
          addPlayerNotification(player, 'В инвентаре нет места для посуды!', 'warning');
          return;
        }
      }
    }

    addItemToPlayer(player, vessel.sourceItem);
    sound.playPickup();
    setLastSensoryLog(`«${vessel.sourceItem.nameRu}» снята с плиты и убрана в карман.`);
    setVessel(createStoveCookwareVessel(undefined));
    onInventoryUpdated?.();
  };

  const handlePlaceFoodItem = (invItem: InventoryItem) => {
    if (isStove && vessel.vesselType === 'surface') {
      addPlayerNotification(player, 'Нельзя класть продукты на открытую конфорку! Сначала поставьте сковороду или кастрюлю.', 'warning');
      sound.playUseItem();
      return;
    }

    if (invItem.category !== 'food' && invItem.category !== 'drink' && invItem.itemId !== 'prep_workpiece' && invItem.itemId !== 'food_mix') {
      addPlayerNotification(player, 'На рабочую поверхность можно выкладывать только продукты питания, смеси и заготовки.', 'warning');
      return;
    }

    const invIdx = player.inventory.findIndex(i => Boolean(i && i.id === invItem.id));
    if (invIdx < 0) return;

    if (invItem.itemId === 'prep_workpiece' || invItem.itemId === 'food_mix' || invItem.culinaryData?.isWorkpiece || invItem.culinaryData?.isMix) {
      const res = unpackWorkpieceIntoVessel(vessel, invItem);
      removeItemFromPlayer(player, invIdx, 1);
      sound.playUseItem();
      setLastSensoryLog(res.message);
      setVessel({ ...vessel });
      onInventoryUpdated?.();
      setMobileTab('station');
      return;
    }

    const ing = itemToCulinaryIngredient(invItem);
    vessel.ingredients.push(ing);
    sound.playUseItem();
    setLastSensoryLog(`На рабочую поверхность выложен(а) «${ing.nameRu}».`);
    removeItemFromPlayer(player, invIdx, 1);

    setVessel({ ...vessel });
    onInventoryUpdated?.();
    setMobileTab('station');
  };

  const handleCutIngredient = (idx: number) => {
    const ing = vessel.ingredients[idx];
    if (!ing) return;

    const res = cutIngredientAction(ing, Boolean(carriedKnife));
    if (!res.success) {
      addPlayerNotification(player, res.message, 'warning');
      sound.playUseItem();
      return;
    }

    sound.playUseItem();
    setLastSensoryLog(res.message);
    setVessel({ ...vessel });
  };

  const handleCutAllOnBoard = () => {
    if (vessel.ingredients.length === 0) return;
    if (!carriedKnife) {
      addPlayerNotification(player, 'У вас нет кухонного или складного ножа для нарезки!', 'warning');
      sound.playUseItem();
      return;
    }

    let modified = 0;
    for (const ing of vessel.ingredients) {
      if (ing.bioState.cutLevel < 2) {
        cutIngredientAction(ing, true);
        modified++;
      }
    }

    if (modified > 0) {
      sound.playUseItem();
      setLastSensoryLog('Ножом аккуратно нарезаны и измельчены все ингредиенты на рабочей доске.');
      setVessel({ ...vessel });
    } else {
      setLastSensoryLog('Все ингредиенты на доске уже мелко порублены.');
    }
  };

  const handleStirVessel = () => {
    const msg = stirVesselAction(vessel);
    sound.playUseItem();
    setLastSensoryLog(msg);
    setVessel({ ...vessel });
  };

  const handleAddSaltFromShaker = () => {
    if (!carriedSalt) {
      addPlayerNotification(player, 'У вас нет солонки или соли в инвентаре!', 'warning');
      sound.playUseItem();
      return;
    }

    const msg = addRealSeasoningAction(vessel, carriedSalt.nameRu, true);
    sound.playUseItem();
    setLastSensoryLog(msg);
    setVessel({ ...vessel });
  };

  const handlePourRealOil = () => {
    if (!carriedOil) {
      addPlayerNotification(player, 'У вас нет растительного масла или кулинарного жира в инвентаре!', 'warning');
      sound.playUseItem();
      return;
    }

    pourRealLiquidToVessel(vessel, carriedOil.itemId, carriedOil.nameRu, 30);
    sound.playUseItem();
    setLastSensoryLog(`Плеснули немного масла из «${carriedOil.nameRu}» на дно посуды.`);
    setVessel({ ...vessel });
  };

  const handlePourWater = () => {
    if (!hasNearbySink) {
      const waterBottle = safeInventory.find(i => i.itemId && i.itemId.includes('water'));
      if (!waterBottle) {
        addPlayerNotification(player, 'Рядом нет мойки с краном, и у вас нет бутылки с водой!', 'warning');
        sound.playUseItem();
        return;
      }
    }

    pourRealLiquidToVessel(vessel, 'water', 'Вода из-под крана', 150);
    sound.playDrink();
    setLastSensoryLog('Из кухонного смесителя налито немного воды.');
    setVessel({ ...vessel });
  };

  const handleSetBurnerPower = (power: number) => {
    if (!vessel.hasBurner || vessel.vesselType === 'surface') {
      addPlayerNotification(player, 'Конфорка не может работать без установленной посуды!', 'warning');
      return;
    }

    vessel.heatSourcePower = power;
    sound.playUseItem();
    const knobPositions = [
      'Ручка конфорки переведена в положение 0 (Выключено)',
      'Ручка на отметке 1: слабое томление',
      'Ручка на отметке 2: малый огонь',
      'Ручка на отметке 3: умеренный нагрев / кипение',
      'Ручка на отметке 4: средняя жарка',
      'Ручка на отметке 5: сильный огонь',
      'Ручка на максимуме (6): предельный жар!'
    ];
    setLastSensoryLog(knobPositions[power]);
    setVessel({ ...vessel });
  };

  const handleToggleLid = () => {
    vessel.hasLid = !vessel.hasLid;
    sound.playUseItem();
    setLastSensoryLog(vessel.hasLid ? 'Посуда накрыта крышкой (пар удерживается).' : 'Крышка снята (пар свободно выходит).');
    setVessel({ ...vessel });
  };

  const handleTakeBackIngredient = (idx: number) => {
    const ing = vessel.ingredients[idx];
    if (!ing) return;

    if (ing.bioState.denaturation > 0.4 || ing.bioState.charring > 0.2) {
      addPlayerNotification(player, 'Продукт уже подвергся термообработке. Переложите его в тарелку или завершите блюдо.', 'info');
      return;
    }

    const itemToReturn: InventoryItem = {
      id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemId: ing.sourceItemId,
      name: ing.name,
      nameRu: ing.nameRu,
      category: 'food',
      count: 1,
      maxStack: 5,
      icon: ing.icon,
      description: `Ingredient retrieved from cutting table (${ing.nameRu}).`,
      descriptionRu: `Продукт со столешницы: ${ing.nameRu}.`,
      effects: { hunger: 20 },
      weight: ing.massGrams / 1000,
      usable: true
    };

    addItemToPlayer(player, itemToReturn);
    vessel.ingredients.splice(idx, 1);
    setSelectedIngredientIdx(null);
    sound.playUseItem();
    setLastSensoryLog(`«${ing.nameRu}» убран(а) обратно в инвентарь.`);
    setVessel({ ...vessel });
    onInventoryUpdated?.();
  };

  const handleCollectWorkpiece = () => {
    if (vessel.ingredients.length === 0 && vessel.liquids.length === 0) {
      addPlayerNotification(player, 'Рабочая поверхность пуста — нечего собирать.', 'warning');
      return;
    }

    const wp = createWorkpieceFromVessel(vessel, !isStove ? 'board' : 'paper');
    if (!wp) return;

    const ok = addItemToPlayer(player, wp);
    if (ok) {
      sound.playPickup();
      addPlayerNotification(player, `Собрана заготовка: «${wp.nameRu}».`, 'heal');
      vessel.ingredients = [];
      vessel.liquids = [];
      vessel.saltGrams = 0;
      vessel.seasoningNotes = [];
      setSelectedIngredientIdx(null);
      setLastSensoryLog(`Заготовка «${wp.nameRu}» собрана в руки/карман. Её можно переложить в сковороду или кастрюлю.`);
      setVessel({ ...vessel });
      onInventoryUpdated?.();
    } else {
      addPlayerNotification(player, 'В инвентаре нет места для заготовки!', 'warning');
    }
  };

  const handleCreateDryMix = () => {
    if (vessel.ingredients.length === 0) {
      addPlayerNotification(player, 'На рабочей поверхности нет ингредиентов для смешивания.', 'warning');
      return;
    }

    const mix = createDryMixFromVessel(vessel);
    if (!mix) return;

    const ok = addItemToPlayer(player, mix);
    if (ok) {
      sound.playPickup();
      addPlayerNotification(player, `Смешано: «${mix.nameRu}».`, 'heal');
      vessel.ingredients = [];
      vessel.liquids = [];
      vessel.saltGrams = 0;
      vessel.seasoningNotes = [];
      setSelectedIngredientIdx(null);
      setLastSensoryLog(`Ингредиенты тщательно смешаны в единую смесь «${mix.nameRu}».`);
      setVessel({ ...vessel });
      onInventoryUpdated?.();
    } else {
      addPlayerNotification(player, 'В инвентаре нет места для смеси!', 'warning');
    }
  };

  const handleTransferToPan = () => {
    if (vessel.ingredients.length === 0 && vessel.liquids.length === 0) {
      addPlayerNotification(player, 'На столе пусто — нечего перекладывать в сковороду.', 'warning');
      return;
    }

    if (vessel.vesselType === 'pan') {
      addPlayerNotification(player, 'Ингредиенты уже находятся в сковороде.', 'info');
      return;
    }

    const targetPan = availablePans[0];
    if (!targetPan) {
      addPlayerNotification(player, 'У вас в карманах нет сковороды (чугунной или тефлоновой)!', 'warning');
      sound.playUseItem();
      return;
    }

    const panInvIdx = player.inventory.findIndex(i => Boolean(i && i.id === targetPan.id));
    if (panInvIdx >= 0) {
      removeItemFromPlayer(player, panInvIdx, 1);
    }

    if (vessel.sourceItem) {
      addItemToPlayer(player, vessel.sourceItem);
    }

    vessel.vesselType = 'pan';
    vessel.nameRu = targetPan.nameRu;
    vessel.sourceItem = targetPan;
    sound.playPickup();
    setLastSensoryLog(`Все ингредиенты переложены со стола в «${targetPan.nameRu}».`);
    setVessel({ ...vessel });
    onInventoryUpdated?.();
  };

  const handleTransferToPot = () => {
    if (vessel.ingredients.length === 0 && vessel.liquids.length === 0) {
      addPlayerNotification(player, 'На столе пусто — нечего перекладывать в кастрюлю.', 'warning');
      return;
    }

    if (vessel.vesselType === 'pot') {
      addPlayerNotification(player, 'Ингредиенты уже находятся в кастрюле.', 'info');
      return;
    }

    const targetPot = availablePots[0];
    if (!targetPot) {
      addPlayerNotification(player, 'У вас в карманах нет кастрюли или горшочка!', 'warning');
      sound.playUseItem();
      return;
    }

    const potInvIdx = player.inventory.findIndex(i => Boolean(i && i.id === targetPot.id));
    if (potInvIdx >= 0) {
      removeItemFromPlayer(player, potInvIdx, 1);
    }

    if (vessel.sourceItem) {
      addItemToPlayer(player, vessel.sourceItem);
    }

    vessel.vesselType = 'pot';
    vessel.nameRu = targetPot.nameRu;
    vessel.sourceItem = targetPot;
    sound.playPickup();
    setLastSensoryLog(`Ингредиенты переложены со стола в «${targetPot.nameRu}».`);
    setVessel({ ...vessel });
    onInventoryUpdated?.();
  };

  const handleTransferToBowl = () => {
    if (vessel.ingredients.length === 0 && vessel.liquids.length === 0) {
      addPlayerNotification(player, 'На столе пусто — нечего перекладывать в миску.', 'warning');
      return;
    }

    if (vessel.vesselType === 'bowl') {
      addPlayerNotification(player, 'Ингредиенты уже находятся в миске.', 'info');
      return;
    }

    const targetBowl = availableBowls[0];
    if (!targetBowl) {
      addPlayerNotification(player, 'У вас в карманах нет глубокой миски!', 'warning');
      sound.playUseItem();
      return;
    }

    const bowlInvIdx = player.inventory.findIndex(i => Boolean(i && i.id === targetBowl.id));
    if (bowlInvIdx >= 0) {
      removeItemFromPlayer(player, bowlInvIdx, 1);
    }

    if (vessel.sourceItem) {
      addItemToPlayer(player, vessel.sourceItem);
    }

    vessel.vesselType = 'bowl';
    vessel.nameRu = targetBowl.nameRu;
    vessel.sourceItem = targetBowl;
    sound.playPickup();
    setLastSensoryLog(`Ингредиенты переложены в «${targetBowl.nameRu}».`);
    setVessel({ ...vessel });
    onInventoryUpdated?.();
  };

  const handleFinishAndPlateDish = () => {
    if (vessel.ingredients.length === 0 && vessel.liquids.length === 0) {
      addPlayerNotification(player, 'На столе и в посуде пусто: нечего сервировать.', 'warning');
      return;
    }

    const plateItem = carriedPlates.length > 0 ? carriedPlates[0] : undefined;
    const dish = finishCookwareToInventoryItem(vessel, plateItem);
    if (!dish) return;

    if (plateItem) {
      const plateIdx = player.inventory.findIndex(i => Boolean(i && i.id === plateItem.id));
      if (plateIdx >= 0) {
        removeItemFromPlayer(player, plateIdx, 1);
      }
    }

    const success = addItemToPlayer(player, dish);
    if (success) {
      sound.playEat();
      addPlayerNotification(
        player, 
        `Приготовлено: «${dish.nameRu}»${plateItem ? ` (на ${plateItem.nameRu.toLowerCase()})` : ''}.`, 
        'heal'
      );

      if (!plateItem && vessel.sourceItem) {
        vessel.sourceItem = undefined;
        vessel.vesselType = 'surface';
        vessel.nameRu = isStove ? 'Пустая конфорка плиты' : 'Столешница гарнитура';
      }

      vessel.ingredients = [];
      vessel.liquids = [];
      vessel.saltGrams = 0;
      vessel.seasoningNotes = [];
      setSelectedIngredientIdx(null);

      setLastSensoryLog(`«${dish.nameRu}» готово и переложено в инвентарь.`);
      setVessel({ ...vessel });
      onInventoryUpdated?.();
      onVitalsChange?.();
    } else {
      addPlayerNotification(player, 'В инвентаре нет места для блюда!', 'warning');
    }
  };

  const observations = getSensoryObservations(vessel);

  return (
    <ModalShell
      id="kitchen-station-modal"
      title={isStove ? 'Кухонная плита' : 'Столешница гарнитура'}
      subtitle={vessel.nameRu}
      width={1160}
      onClose={onClose}
      headRight={
        <div className="gu-row" style={{ gap: 8 }}>
          {vessel.temperature > 40 && (
            <span className="gu-tag amber">
              <Flame className="w-3 h-3" /> +{Math.round(vessel.temperature)}°C
            </span>
          )}
          {onOpenStorage && (
            <button
              type="button"
              onClick={onOpenStorage}
              className="gu-btn gu-btn-s gu-btn-sm"
              title="Открыть шкафы кухонного гарнитура"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Шкафы</span>
            </button>
          )}
        </div>
      }
      tabs={
        <div className="gu-kitchen-tabs">
          <Tabs
            value={mobileTab}
            onChange={setMobileTab}
            items={[
              { id: 'station', label: isStove ? 'Плита' : 'Столешница', badge: vessel.ingredients.length || undefined },
              { id: 'products', label: 'Продукты', badge: foodItems.length || undefined },
              { id: 'sensory', label: 'Органолептика' }
            ]}
          />
        </div>
      }
      footerHints={[['Клик', 'Выложить / Нарезать'], ['Esc', 'Закрыть']]}
      footerRight={
        <button type="button" onClick={onClose} className="gu-btn gu-btn-s gu-btn-sm">
          Завершить работу
        </button>
      }
    >
      {/* Cookware Placement Bar on Stove */}
      {isStove && (
        <div className="gu-card-sm" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div className="gu-row" style={{ gap: 8 }}>
            <span className="gu-mute" style={{ fontSize: 12 }}>Посуда на конфорке:</span>
            <span className="gu-tag amber">
              {vessel.sourceItem ? vessel.sourceItem.nameRu : 'Конфорка свободна (открытая спираль)'}
            </span>
          </div>

          <div className="gu-row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {vessel.sourceItem ? (
              <button
                type="button"
                onClick={handleRemoveCookwareFromBurner}
                className="gu-btn gu-btn-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Снять посуду в карман</span>
              </button>
            ) : (
              <>
                <span className="gu-mute" style={{ fontSize: 11 }}>Поставить:</span>
                {carriedCookwareList.length === 0 ? (
                  <span className="gu-mute" style={{ fontSize: 11, fontStyle: 'italic' }}>
                    Нет сковороды или кастрюли в карманах
                  </span>
                ) : (
                  carriedCookwareList.map((cw, cwIdx) => (
                    <button
                      key={cw.id || cwIdx}
                      type="button"
                      onClick={() => handlePlaceCookwareOnBurner(cw)}
                      className="gu-btn gu-btn-p gu-btn-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{cw.nameRu}</span>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 3-Column Workstation Grid */}
      <div className="gu-kitchen-grid">
        {/* LEFT COLUMN: Player Inventory Ingredients */}
        <div className={`gu-panel gu-pad ${mobileTab === 'products' ? '' : 'gu-kitchen-col-hide'}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="gu-sec" style={{ marginTop: 0 }}>
            <span>Продукты и заготовки</span>
            <span className="gu-sec-sub">{foodItems.length} предм.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {foodItems.length === 0 ? (
              <div className="gu-empty" style={{ margin: 'auto 0' }}>
                <div className="gu-empty-t">Нет продуктов</div>
                <div>В карманах нет еды, заготовок и кулинарных ингредиентов.</div>
              </div>
            ) : (
              foodItems.map((item, idx) => {
                const isWp = item.itemId === 'prep_workpiece' || item.itemId === 'food_mix';
                return (
                  <div
                    key={item.id || idx}
                    onClick={() => handlePlaceFoodItem(item)}
                    className={`gu-item ${isWp ? 'on' : ''}`}
                    style={{ cursor: 'pointer', padding: '7px 10px', gap: 8 }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 6, background: 'rgba(10,10,12,0.75)', border: '1px solid var(--gu-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ItemIconCanvas itemId={item.itemId} item={item} size={26} />
                    </div>
                    <div className="gu-item-main">
                      <div className="gu-item-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nameRu || item.name}</span>
                        {isWp && <span className="gu-tag amber">Заготовка</span>}
                      </div>
                      <div className="gu-item-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.descriptionRu?.split('.')[0] || 'Ингредиент'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaceFoodItem(item);
                      }}
                      className="gu-btn gu-btn-p gu-btn-xs"
                      style={{ padding: '0 8px', flexShrink: 0 }}
                      title="Выложить на рабочую поверхность"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Culinary Viewport & Physical Controls */}
        <div className={`gu-panel gu-pad ${mobileTab === 'station' ? '' : 'gu-kitchen-col-hide'}`} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="gu-row-between" style={{ marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                {isStove ? (
                  <Flame className="w-4 h-4" style={{ color: vessel.heatSourcePower > 0 ? 'var(--gu-accent-bright)' : 'var(--gu-dim)' }} />
                ) : (
                  <Utensils className="w-4 h-4" style={{ color: 'var(--gu-accent-hi)' }} />
                )}
                <span>{vessel.nameRu}</span>
              </div>
              <div className="gu-mute" style={{ fontSize: 11 }}>
                {isStove
                  ? (vessel.heatSourcePower > 0 ? `Мощность конфорки: уровень ${vessel.heatSourcePower}` : 'Конфорка выключена (0)')
                  : 'Холодная столешница • Разделочная доска'}
              </div>
            </div>

            {isStove && vessel.sourceItem && (
              <button
                type="button"
                onClick={handleToggleLid}
                className={`gu-btn gu-btn-xs ${vessel.hasLid ? 'gu-btn-p' : ''}`}
              >
                {vessel.hasLid ? 'С крышкой' : 'Без крышки'}
              </button>
            )}
          </div>

          {/* Live Culinary Viewport */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', maxHeight: 220, background: 'rgba(8, 8, 10, 0.9)', borderRadius: 8, border: '1px solid var(--gu-line-hi)', overflow: 'hidden', marginBottom: 10 }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />

            <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 6, pointerEvents: 'none' }}>
              <span className="gu-tag">
                {vessel.vesselType === 'pan' ? 'Сковорода' : vessel.vesselType === 'pot' ? 'Кастрюля' : vessel.vesselType === 'bowl' ? 'Миска' : isStove ? 'Спираль' : 'Доска'}
              </span>
              {vessel.temperature > 40 && (
                <span className="gu-tag amber">
                  <Flame className="w-3 h-3" /> {Math.round(vessel.temperature)}°C
                </span>
              )}
            </div>

            {vessel.ingredients.length > 0 && !isStove && carriedKnife && (
              <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
                <button
                  type="button"
                  onClick={handleCutAllOnBoard}
                  className="gu-btn gu-btn-p gu-btn-xs"
                  title="Нарезать все ингредиенты на доске ножом"
                >
                  <Utensils className="w-3 h-3" />
                  <span>Нарезать всё</span>
                </button>
              </div>
            )}
          </div>

          {/* In-Vessel Ingredients List */}
          <div style={{ flex: 1, maxHeight: 165, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, paddingRight: 2 }}>
            {isStove && !vessel.sourceItem && (
              <div className="gu-empty" style={{ padding: 14 }}>
                <Disc className="w-5 h-5" style={{ margin: '0 auto 4px', opacity: 0.5 }} />
                <div className="gu-empty-t">Спираль конфорки пуста</div>
                <div>Установите сковороду или кастрюлю сверху.</div>
              </div>
            )}

            {vessel.liquids.length > 0 && (
              <div className="gu-card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span className="gu-mute" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Droplets className="w-3.5 h-3.5" style={{ color: '#7dd3fc' }} /> Среда на дне:
                </span>
                <div className="gu-row" style={{ gap: 4, flexWrap: 'wrap' }}>
                  {vessel.liquids.map((liq, lIdx) => (
                    <span key={lIdx} className="gu-tag cold">
                      {liq.nameRu}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(!isStove || vessel.sourceItem) && vessel.ingredients.length === 0 && (
              <div className="gu-empty" style={{ padding: 14 }}>
                <div className="gu-empty-t">Поверхность пуста</div>
                <div>Выберите продукты слева и нажмите «Выложить».</div>
              </div>
            )}

            {vessel.ingredients.map((ing, idx) => {
              const isSelected = selectedIngredientIdx === idx;
              const appearance = getVisualAppearanceDescription(ing);

              return (
                <div
                  key={ing.id}
                  onClick={() => setSelectedIngredientIdx(idx)}
                  className={`gu-item ${isSelected ? 'on' : ''}`}
                  style={{ cursor: 'pointer', padding: '8px 10px' }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background:
                        ing.bioState.charring > 0.35
                          ? '#18181b'
                          : ing.bioState.maillard > 0.35
                          ? '#b45309'
                          : ing.bioState.denaturation > 0.6
                          ? '#a8a29e'
                          : '#f43f5e'
                    }}
                  />
                  <div className="gu-item-main">
                    <div className="gu-item-title">{ing.nameRu}</div>
                    <div className="gu-item-sub" style={{ fontStyle: 'italic' }}>{appearance}</div>
                  </div>
                  <div className="gu-row" style={{ gap: 6 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCutIngredient(idx);
                      }}
                      disabled={!carriedKnife}
                      className="gu-btn gu-btn-xs"
                      title={carriedKnife ? 'Нарезать кухонным ножом' : 'Требуется нож в инвентаре'}
                    >
                      {ing.bioState.cutLevel === 0 ? 'Нарезать' : ing.bioState.cutLevel === 1 ? 'Измельчить' : 'Фарш'}
                    </button>
                    {ing.bioState.denaturation < 0.3 && ing.bioState.charring < 0.1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTakeBackIngredient(idx);
                        }}
                        className="gu-btn gu-btn-danger gu-btn-xs"
                        title="Убрать обратно в инвентарь"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Burner Dial & Tactile Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
            {isStove && vessel.sourceItem && (
              <div className="gu-card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span className="gu-mute" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Flame className="w-3.5 h-3.5" style={{ color: 'var(--gu-accent-hi)' }} /> Мощность конфорки:
                </span>
                <div className="gu-seg">
                  {[0, 1, 2, 3, 4, 5, 6].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSetBurnerPower(p)}
                      className={vessel.heatSourcePower === p ? 'on' : ''}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="gu-grid gu-g4" style={{ gap: 6 }}>
              <button type="button" onClick={handleStirVessel} className="gu-btn gu-btn-xs">
                <RotateCw className="w-3.5 h-3.5" /> Перемешать
              </button>
              <button type="button" onClick={handleAddSaltFromShaker} disabled={!carriedSalt} className="gu-btn gu-btn-xs">
                <Sparkles className="w-3.5 h-3.5" /> Посолить
              </button>
              <button type="button" onClick={handlePourRealOil} disabled={!carriedOil} className="gu-btn gu-btn-xs">
                <Droplets className="w-3.5 h-3.5" /> Масло
              </button>
              <button
                type="button"
                onClick={handlePourWater}
                disabled={!hasNearbySink && !safeInventory.some(i => i.itemId && i.itemId.includes('water'))}
                className="gu-btn gu-btn-xs"
              >
                <Droplets className="w-3.5 h-3.5" /> Вода
              </button>
            </div>

            <div className="gu-grid gu-g4" style={{ gap: 6 }}>
              <button
                type="button"
                onClick={handleTransferToPan}
                disabled={vessel.vesselType === 'pan' || availablePans.length === 0}
                className="gu-btn gu-btn-xs"
              >
                <Utensils className="w-3 h-3" /> В сковороду
              </button>
              <button
                type="button"
                onClick={handleTransferToPot}
                disabled={vessel.vesselType === 'pot' || availablePots.length === 0}
                className="gu-btn gu-btn-xs"
              >
                <Utensils className="w-3 h-3" /> В кастрюлю
              </button>
              <button
                type="button"
                onClick={handleTransferToBowl}
                disabled={vessel.vesselType === 'bowl' || availableBowls.length === 0}
                className="gu-btn gu-btn-xs"
              >
                <Disc className="w-3 h-3" /> В миску
              </button>
              <button
                type="button"
                onClick={handleCollectWorkpiece}
                disabled={vessel.ingredients.length === 0 && vessel.liquids.length === 0}
                className="gu-btn gu-btn-xs"
              >
                <Package className="w-3 h-3" /> Заготовка
              </button>
            </div>

            <div className="gu-grid gu-g2" style={{ gap: 6 }}>
              <button
                type="button"
                onClick={handleCreateDryMix}
                disabled={vessel.ingredients.length === 0}
                className="gu-btn gu-btn-xs"
              >
                <Sparkles className="w-3.5 h-3.5" /> Смешать сухую смесь
              </button>
              <button
                type="button"
                onClick={handleFinishAndPlateDish}
                className="gu-btn gu-btn-p gu-btn-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {carriedPlates.length > 0
                    ? `На ${carriedPlates[0].nameRu.toLowerCase()}`
                    : 'Готовое блюдо в карман'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sensory & Tool Status */}
        <div className={`gu-panel gu-pad ${mobileTab === 'sensory' ? '' : 'gu-kitchen-col-hide'}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="gu-sec" style={{ marginTop: 0 }}>
            <span>Органолептика и утварь</span>
          </div>

          <div className="gu-card-sm">
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gu-accent-hi)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity className="w-3.5 h-3.5" /> Ощущения повара
            </div>
            <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--gu-ink)', lineHeight: 1.45 }}>
              «{lastSensoryLog}»
            </div>
          </div>

          <div className="gu-card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gu-mute)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Volume2 className="w-3.5 h-3.5" style={{ color: 'var(--gu-accent-hi)' }} /> Сенсорный фон
            </div>
            <div>
              <div className="gu-mute" style={{ fontSize: 10, textTransform: 'uppercase' }}>Звук:</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{observations.soundText}</div>
            </div>
            <div>
              <div className="gu-mute" style={{ fontSize: 10, textTransform: 'uppercase' }}>Поведение среды:</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{observations.panSurfaceText}</div>
            </div>
            <div>
              <div className="gu-mute" style={{ fontSize: 10, textTransform: 'uppercase' }}>Воздух и пар:</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{observations.smokeText}</div>
            </div>
          </div>

          <div className="gu-card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gu-mute)', marginBottom: 2 }}>
              Инструменты под рукой
            </div>
            <div className="gu-row-between" style={{ fontSize: 12 }}>
              <span className="gu-mute">Нож:</span>
              <span style={{ color: carriedKnife ? '#9ac985' : 'var(--gu-dim)', fontWeight: 600 }}>{carriedKnife ? carriedKnife.nameRu : 'Нет ножа'}</span>
            </div>
            <div className="gu-row-between" style={{ fontSize: 12 }}>
              <span className="gu-mute">Сковорода:</span>
              <span style={{ color: availablePans.length > 0 ? '#9ac985' : 'var(--gu-dim)', fontWeight: 600 }}>{availablePans.length > 0 ? availablePans[0].nameRu : 'Нет'}</span>
            </div>
            <div className="gu-row-between" style={{ fontSize: 12 }}>
              <span className="gu-mute">Кастрюля:</span>
              <span style={{ color: availablePots.length > 0 ? '#9ac985' : 'var(--gu-dim)', fontWeight: 600 }}>{availablePots.length > 0 ? availablePots[0].nameRu : 'Нет'}</span>
            </div>
            <div className="gu-row-between" style={{ fontSize: 12 }}>
              <span className="gu-mute">Соль:</span>
              <span style={{ color: carriedSalt ? '#9ac985' : 'var(--gu-dim)', fontWeight: 600 }}>{carriedSalt ? carriedSalt.nameRu : 'Нет солонки'}</span>
            </div>
            <div className="gu-row-between" style={{ fontSize: 12 }}>
              <span className="gu-mute">Масло:</span>
              <span style={{ color: carriedOil ? '#9ac985' : 'var(--gu-dim)', fontWeight: 600 }}>{carriedOil ? carriedOil.nameRu : 'Нет масла'}</span>
            </div>
            <div className="gu-row-between" style={{ fontSize: 12 }}>
              <span className="gu-mute">Тарелка:</span>
              <span style={{ color: carriedPlates.length > 0 ? '#9ac985' : 'var(--gu-dim)', fontWeight: 600 }}>{carriedPlates.length > 0 ? carriedPlates[0].nameRu : 'Нет посуды'}</span>
            </div>
          </div>

          {vessel.seasoningNotes.length > 0 && (
            <div className="gu-card-sm">
              <div className="gu-mute" style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Добавлено в блюдо:</div>
              <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {vessel.seasoningNotes.map((sn, sIdx) => (
                  <div key={sIdx}>• {sn}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

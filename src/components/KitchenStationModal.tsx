import React, { useState, useEffect, useRef } from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import { 
  CookwareVessel, 
  createStoveCookwareVessel,
  createCountertopVessel,
  itemToCulinaryIngredient, 
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
import { 
  addItemToPlayer, 
  removeItemFromPlayer, 
  addPlayerNotification 
} from '../items';
import { ItemIconCanvas } from './ItemIconCanvas';
import { sound } from '../audio';
import { getBuildingLayout } from '../buildingInteriors';
import { 
  X, 
  Flame, 
  Droplets, 
  Utensils, 
  RotateCw, 
  ChefHat, 
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
  stationName = 'Кухонный гарнитур',
  furnitureType = 'kitchen_counter',
  onOpenStorage
}) => {
  if (!isOpen || !player) return null;

  const isStove = furnitureType === 'stove';

  // Mobile navigation tabs state ('station' | 'products' | 'sensory')
  const [mobileTab, setMobileTab] = useState<'station' | 'products' | 'sensory'>('station');

  // Safe inventory array filtering out empty/null slots
  const safeInventory: InventoryItem[] = (player.inventory || []).filter((i): i is InventoryItem => Boolean(i && i.itemId));

  // Active Cookware / Surface State
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
      ? 'Конфорка плиты готова к работе. Поставьте сковороду или кастрюлю.' 
      : 'Разделочная столешница готова. Выложите продукты для нарезки и смешивания.'
  );
  const lastSoundTickRef = useRef<number>(0);

  // Check physical tools and resources in player inventory with robust null checks
  const carriedKnife = safeInventory.find(i => isKnifeItem(i.itemId)) || 
    (player.leftHandItem && player.leftHandItem.itemId && isKnifeItem(player.leftHandItem.itemId) ? player.leftHandItem : null) ||
    (player.rightHandItem && player.rightHandItem.itemId && isKnifeItem(player.rightHandItem.itemId) ? player.rightHandItem : null);

  const carriedSalt = safeInventory.find(i => isSaltItem(i.itemId));
  const carriedOil = safeInventory.find(i => isOilOrFatItem(i.itemId));
  const carriedPlates = safeInventory.filter(i => isPlateOrBowlItem(i.itemId));
  const carriedCookwareList = safeInventory.filter(i => isCookwareItem(i.itemId));
  const foodItems = safeInventory.filter(i => i.category === 'food' || i.category === 'drink');

  // Check if a kitchen sink is physically near the player
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
        // If it's a stove with NO cookware placed, do not run pan heating
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

        // Diegetic Sound cues:
        const now = Date.now();
        if (now - lastSoundTickRef.current > 3000) {
          const hasOil = next.liquids.some(l => l.isFatOrOil);
          const hasWater = next.liquids.some(l => !l.isFatOrOil);

          if (hasOil && next.temperature >= 140) {
            sound.playUseItem();
            lastSoundTickRef.current = now;
          } else if (hasWater && next.temperature >= 95) {
            sound.playDrink();
            lastSoundTickRef.current = now;
          }
        }

        // Physical smoke alerts
        const highestChar = next.ingredients.reduce((m, i) => Math.max(m, i.bioState.charring), 0);
        if (highestChar > 0.4 && next.heatSourcePower >= 3) {
          setLastSensoryLog('Внимание: Едкий сизый дым! Ингредиенты пригорают ко дну — снимите с огня или переверните!');
        } else if (next.smokeIntensity > 0.5) {
          setLastSensoryLog('В воздухе запах гари: масло раскалилось до дыма.');
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Place physical cookware on stove burner
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

  // Take cookware off stove back into player inventory
  const handleRemoveCookwareFromBurner = () => {
    if (!vessel.sourceItem) return;

    if (vessel.ingredients.length > 0 || vessel.liquids.length > 0) {
      addPlayerNotification(player, 'В посуде есть продукты. Сначала переложите их в тарелку или завершите блюдо.', 'warning');
      return;
    }

    addItemToPlayer(player, vessel.sourceItem);
    sound.playPickup();
    setLastSensoryLog(`«${vessel.sourceItem.nameRu}» снята с плиты и убрана в инвентарь.`);
    setVessel(createStoveCookwareVessel(undefined));
    onInventoryUpdated?.();
  };

  // Add food item from inventory into cookware/counter
  const handlePlaceFoodItem = (invItem: InventoryItem) => {
    if (isStove && vessel.vesselType === 'surface') {
      addPlayerNotification(player, 'Нельзя класть продукты на открытую конфорку! Сначала поставьте сковороду или кастрюлю.', 'warning');
      sound.playUseItem();
      return;
    }

    if (invItem.category !== 'food' && invItem.category !== 'drink') {
      addPlayerNotification(player, 'На рабочую поверхность можно выкладывать только продукты питания и ингредиенты.', 'warning');
      return;
    }

    const invIdx = player.inventory.findIndex(i => Boolean(i && i.id === invItem.id));
    if (invIdx < 0) return;

    const ing = itemToCulinaryIngredient(invItem);
    vessel.ingredients.push(ing);
    sound.playUseItem();
    setLastSensoryLog(`На поверхность выложен(а) «${ing.nameRu}».`);
    removeItemFromPlayer(player, invIdx, 1);

    setVessel({ ...vessel });
    onInventoryUpdated?.();

    // On mobile, automatically return to active surface tab to see what was placed
    setMobileTab('station');
  };

  // Tactile Cutting Action (Requires Knife in inventory or hand)
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

  // Tactile Stirring Action (Flips bottom layer, redistributes heat)
  const handleStirVessel = () => {
    const msg = stirVesselAction(vessel);
    sound.playUseItem();
    setLastSensoryLog(msg);
    setVessel({ ...vessel });
  };

  // Seasoning Action (Requires real Salt Shaker or Spice item)
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

  // Pour Oil (Requires real oil item in inventory)
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

  // Pour Water (From real water container or nearby sink)
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

  // Regulate Burner Power (Only available if Stove with Cookware!)
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

  // Toggle Lid
  const handleToggleLid = () => {
    vessel.hasLid = !vessel.hasLid;
    sound.playUseItem();
    setLastSensoryLog(vessel.hasLid ? 'Посуда накрыта крышкой (пар удерживается).' : 'Крышка снята (пар свободно выходит).');
    setVessel({ ...vessel });
  };

  // Take raw ingredient back to inventory
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

  // Finish and Plate Dish into Real Plate/Bowl or Take Away
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

      vessel.ingredients = [];
      vessel.liquids = [];
      vessel.saltGrams = 0;
      vessel.seasoningNotes = [];
      setSelectedIngredientIdx(null);

      setLastSensoryLog(`Блюдо «${dish.nameRu}» готово и переложено в инвентарь.`);
      setVessel({ ...vessel });
      onInventoryUpdated?.();
      onVitalsChange?.();
    } else {
      addPlayerNotification(player, 'В инвентаре нет места для готового блюда!', 'warning');
    }
  };

  const observations = getSensoryObservations(vessel);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-3 md:p-4 select-none animate-fadeIn">
      <div className="w-full max-w-5xl h-full sm:h-auto sm:max-h-[94vh] flex flex-col bg-slate-950 border-0 sm:border border-slate-800 rounded-none sm:rounded-2xl shadow-2xl shadow-black/95 overflow-hidden text-slate-100 font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-100 truncate">
                  {isStove ? 'Кухонная плита' : 'Столешница гарнитура'}
                </h2>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 truncate max-w-[130px] sm:max-w-none">
                  {isStove ? (vessel.sourceItem ? vessel.nameRu : 'Нет посуды') : 'Холодный стол'}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate hidden xs:block">
                {isStove 
                  ? 'Конфорка плиты • Установите сковороду или кастрюлю'
                  : 'Холодная зона • Нарезка ножом, миска, специи'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onOpenStorage && (
              <button
                onClick={onOpenStorage}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5 min-h-[36px]"
                title="Открыть шкафы кухонного гарнитура"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden sm:inline">Шкафы</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 border border-slate-700 flex items-center justify-center text-slate-400 transition-colors min-w-[36px] min-h-[36px]"
              title="Закрыть"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs (< lg screens) */}
        <div className="flex lg:hidden items-center bg-slate-900 border-b border-slate-800 text-xs shrink-0 select-none">
          <button
            onClick={() => setMobileTab('station')}
            className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 font-bold transition-colors border-b-2 min-h-[44px] ${
              mobileTab === 'station'
                ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isStove ? <Flame className="w-4 h-4 text-amber-400 shrink-0" /> : <Utensils className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>{isStove ? 'Плита / Посуда' : 'Стол'}</span>
            {vessel.ingredients.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-[10px] text-slate-950 font-black">
                {vessel.ingredients.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileTab('products')}
            className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 font-bold transition-colors border-b-2 min-h-[44px] ${
              mobileTab === 'products'
                ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Продукты ({foodItems.length})</span>
          </button>

          <button
            onClick={() => setMobileTab('sensory')}
            className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 font-bold transition-colors border-b-2 min-h-[44px] ${
              mobileTab === 'sensory'
                ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Чувства</span>
            {vessel.smokeIntensity > 0.3 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-0.5 shrink-0" />
            )}
          </button>
        </div>

        {/* Cookware Placement Bar on Stove (Shown only if Stove!) */}
        {isStove && (
          <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Посуда:</span>
              <span className="font-semibold text-amber-300">
                {vessel.sourceItem ? vessel.sourceItem.nameRu : 'Конфорка свободна'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {vessel.sourceItem ? (
                <button
                  onClick={handleRemoveCookwareFromBurner}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-1 min-h-[34px]"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Снять посуду</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500 text-[11px]">Поставить:</span>
                  {carriedCookwareList.length === 0 ? (
                    <span className="text-amber-500/90 text-[11px] italic">
                      Нет сковороды в карманах
                    </span>
                  ) : (
                    carriedCookwareList.map((cw, cwIdx) => (
                      <button
                        key={cw.id || cwIdx}
                        onClick={() => handlePlaceCookwareOnBurner(cw)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-medium transition-colors flex items-center gap-1 min-h-[34px]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{cw.nameRu}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Workstation Layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Player Inventory Ingredients (4 cols desktop; shown on mobile if mobileTab === 'products') */}
          <div className={`${mobileTab === 'products' ? 'flex' : 'hidden'} lg:flex lg:col-span-4 border-r border-slate-800 flex-col min-h-0 bg-slate-950/50`}>
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Ваши продукты в карманах
              </span>
              <span className="text-[11px] text-slate-500">
                {foodItems.length} предм.
              </span>
            </div>

            <div className="flex-1 p-2.5 sm:p-3 overflow-y-auto space-y-2">
              {foodItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  В карманах нет еды и кулинарных ингредиентов.
                </div>
              ) : (
                foodItems.map((item, idx) => {
                  return (
                    <div
                      key={item.id || idx}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-amber-500/50 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between gap-2.5 transition-all active:scale-[0.99]"
                      onClick={() => handlePlaceFoodItem(item)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0">
                          <ItemIconCanvas itemId={item.itemId} item={item} size={32} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {item.nameRu || item.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {item.descriptionRu?.split('.')[0] || 'Ингредиент'}
                          </div>
                        </div>
                      </div>

                      <button
                        className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/35 text-xs font-semibold text-amber-300 shrink-0 flex items-center gap-1 transition-colors min-h-[36px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaceFoodItem(item);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Выложить</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Center Column: The Cooking Surface / Pan (5 cols desktop; shown on mobile if mobileTab === 'station') */}
          <div className={`${mobileTab === 'station' ? 'flex' : 'hidden'} lg:flex lg:col-span-5 flex-col min-h-0 bg-slate-900/20 border-r border-slate-800`}>
            
            {/* Surface Header */}
            <div className="p-2.5 sm:p-3 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 truncate">
                  {isStove ? (
                    <Flame className={`w-3.5 h-3.5 shrink-0 ${vessel.heatSourcePower > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`} />
                  ) : (
                    <Utensils className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">
                    {isStove 
                      ? (vessel.sourceItem ? vessel.nameRu : 'Открытая конфорка плиты') 
                      : 'Разделочная доска на столешнице'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {isStove 
                    ? (vessel.heatSourcePower > 0 ? `Нагрев от конфорки: положение ${vessel.heatSourcePower}` : 'Конфорка выключена (0)')
                    : 'Холодная поверхность без нагрева'}
                </div>
              </div>

              {/* Lid toggle if pot or pan */}
              {isStove && vessel.sourceItem && (
                <button
                  onClick={handleToggleLid}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors shrink-0 min-h-[34px] ${
                    vessel.hasLid
                      ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {vessel.hasLid ? 'С крышкой' : 'Без крышки'}
                </button>
              )}
            </div>

            {/* Quick Add Product Button for Mobile (Opens Products Tab) */}
            <div className="lg:hidden px-3 pt-2 shrink-0">
              <button
                onClick={() => setMobileTab('products')}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-amber-600/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[38px] active:scale-[0.99]"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Выложить продукты из карманов ({foodItems.length})</span>
              </button>
            </div>

            {/* In-Vessel Contents View */}
            <div className="flex-1 p-2.5 sm:p-3.5 overflow-y-auto space-y-2.5 min-h-[120px]">
              
              {/* Bare Stove Warning */}
              {isStove && !vessel.sourceItem && (
                <div className="h-40 sm:h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl text-center p-4 sm:p-6 text-slate-500">
                  <Disc className="w-8 h-8 sm:w-9 sm:h-9 text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-400">Конфорка пуста</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    На открытые спирали конфорки нельзя сыпать продукты. Поставьте сковороду или кастрюлю сверху.
                  </p>
                </div>
              )}

              {/* Liquids Layer */}
              {vessel.liquids.length > 0 && (
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Среда на дне:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vessel.liquids.map((liq, lIdx) => (
                      <span key={lIdx} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                        {liq.nameRu} ({liq.isFatOrOil ? 'жир/масло' : 'жидкость'})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingredients List */}
              {(!isStove || vessel.sourceItem) && vessel.ingredients.length === 0 && (
                <div className="h-36 sm:h-44 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl text-center p-4 sm:p-6 text-slate-500">
                  <Utensils className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-400">Поверхность пуста</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Выберите продукты и нажмите «Выложить».
                  </p>
                </div>
              )}

              {vessel.ingredients.map((ing, idx) => {
                const isSelected = selectedIngredientIdx === idx;
                const appearance = getVisualAppearanceDescription(ing);

                return (
                  <div
                    key={ing.id}
                    onClick={() => setSelectedIngredientIdx(idx)}
                    className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500/70 shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Visual Color Dot */}
                        <div 
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/40"
                          style={{
                            backgroundColor: ing.bioState.charring > 0.35 
                              ? '#18181b'
                              : ing.bioState.maillard > 0.35
                              ? '#b45309'
                              : ing.bioState.denaturation > 0.6
                              ? '#a8a29e'
                              : '#f43f5e'
                          }}
                        />
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {ing.nameRu}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Physical Cut Action Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCutIngredient(idx);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[36px] min-w-[75px] active:scale-95 flex items-center justify-center ${
                            carriedKnife
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                              : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                          }`}
                          title={carriedKnife ? 'Нарезать кухонным ножом' : 'Требуется нож в инвентаре'}
                        >
                          {ing.bioState.cutLevel === 0 ? 'Нарезать' : ing.bioState.cutLevel === 1 ? 'Измельчить' : 'Фарш'}
                        </button>

                        {/* Take back if raw */}
                        {ing.bioState.denaturation < 0.3 && ing.bioState.charring < 0.1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTakeBackIngredient(idx);
                            }}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                            title="Убрать обратно в инвентарь"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Diegetic Visual Observation */}
                    <div className="text-[11px] text-slate-300 italic">
                      {appearance}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Direct Physical Actions Bar */}
            <div className="p-2.5 sm:p-3 bg-slate-950/80 border-t border-slate-800 space-y-2 shrink-0">
              
              {/* Burner Dial (ONLY on Stove with Cookware!) */}
              {isStove && vessel.sourceItem && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pb-1.5 border-b border-slate-800/80 gap-1.5">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Ручка конфорки:</span>
                  </span>
                  
                  {/* Big touch-friendly rotary selector */}
                  <div className="flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto">
                    {[0, 1, 2, 3, 4, 5, 6].map(p => (
                      <button
                        key={p}
                        onClick={() => handleSetBurnerPower(p)}
                        className={`flex-1 sm:w-8 sm:h-8 py-2 sm:py-0 min-h-[40px] sm:min-h-0 rounded-lg font-bold text-xs sm:text-sm font-mono transition-all active:scale-95 flex items-center justify-center ${
                          vessel.heatSourcePower === p
                            ? p === 0
                              ? 'bg-slate-700 text-white shadow-inner'
                              : p <= 3
                              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                              : 'bg-rose-600 text-white font-black shadow-md shadow-rose-600/40'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                        }`}
                        title={p === 0 ? 'Выкл' : `Положение ${p}`}
                      >
                        {p === 0 ? '0' : p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Physical Interactions Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-xs">
                {/* Stir / Flip */}
                <button
                  onClick={handleStirVessel}
                  className="px-2.5 py-2.5 sm:py-1.5 min-h-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                  title="Перевернуть куски лопаткой"
                >
                  <RotateCw className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Перемешать</span>
                </button>

                {/* Salt (Requires real salt shaker) */}
                <button
                  onClick={handleAddSaltFromShaker}
                  className={`px-2.5 py-2.5 sm:py-1.5 min-h-[44px] rounded-lg border font-medium transition-colors flex items-center justify-center gap-1.5 active:scale-95 ${
                    carriedSalt
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  title={carriedSalt ? 'Посолить из солонки' : 'Нужна солонка в инвентаре'}
                >
                  <Sparkles className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>Посолить</span>
                </button>

                {/* Oil (Requires real oil) */}
                <button
                  onClick={handlePourRealOil}
                  className={`px-2.5 py-2.5 sm:py-1.5 min-h-[44px] rounded-lg border font-medium transition-colors flex items-center justify-center gap-1.5 active:scale-95 ${
                    carriedOil
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  title={carriedOil ? 'Добавить масло из бутылки' : 'Нужно растительное масло в инвентаре'}
                >
                  <Droplets className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Масло</span>
                </button>

                {/* Water (Requires sink or water container) */}
                <button
                  onClick={handlePourWater}
                  className={`px-2.5 py-2.5 sm:py-1.5 min-h-[44px] rounded-lg border font-medium transition-colors flex items-center justify-center gap-1.5 active:scale-95 ${
                    hasNearbySink || safeInventory.some(i => i.itemId && i.itemId.includes('water'))
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  title="Налить воду из мойки или бутылки"
                >
                  <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Вода</span>
                </button>
              </div>

              {/* Service & Plate Food */}
              <button
                onClick={handleFinishAndPlateDish}
                className="w-full py-3 sm:py-2.5 min-h-[46px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Check className="w-4 h-4 stroke-[3] shrink-0" />
                <span className="truncate">
                  {carriedPlates.length > 0 
                    ? `Сервировать на ${carriedPlates[0].nameRu.toLowerCase()}` 
                    : 'Снять готовое блюдо в инвентарь'}
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Sensory Feedback (3 cols desktop; shown on mobile if mobileTab === 'sensory') */}
          <div className={`${mobileTab === 'sensory' ? 'flex' : 'hidden'} lg:flex lg:col-span-3 flex-col min-h-0 bg-slate-950/70 p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto`}>
            
            {/* Real-time Diegetic Sensory Observation */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs shrink-0">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                <Activity className="w-3.5 h-3.5" />
                <span>Органолептика и чувства</span>
              </div>
              <p className="text-slate-300 leading-relaxed italic text-xs">
                «{lastSensoryLog}»
              </p>
            </div>

            {/* Diegetic Sound & Vapor Inspection */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2.5 shrink-0">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Сенсорный фон</span>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 uppercase">Звук:</div>
                <div className="text-slate-200 text-xs font-medium">{observations.soundText}</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 uppercase">Поведение среды:</div>
                <div className="text-slate-200 text-xs font-medium">{observations.panSurfaceText}</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 uppercase">Воздух и пар:</div>
                <div className="text-slate-200 text-xs font-medium">{observations.smokeText}</div>
              </div>
            </div>

            {/* Inventory Real Tool Presence Status */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-xs space-y-2 shrink-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Предметы в руках и карманах
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Нож:</span>
                <span className={carriedKnife ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  {carriedKnife ? carriedKnife.nameRu : 'Нет ножа'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Соль:</span>
                <span className={carriedSalt ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  {carriedSalt ? carriedSalt.nameRu : 'Нет солонки'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Масло / Жир:</span>
                <span className={carriedOil ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  {carriedOil ? carriedOil.nameRu : 'Нет масла'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Тарелка / Посуда:</span>
                <span className={carriedPlates.length > 0 ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  {carriedPlates.length > 0 ? carriedPlates[0].nameRu : 'Нет тарелки'}
                </span>
              </div>
            </div>

            {/* Added Seasonings */}
            {vessel.seasoningNotes.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800 text-xs shrink-0">
                <div className="text-slate-400 font-semibold mb-1">Добавлено в блюдо:</div>
                <div className="text-slate-300 space-y-0.5">
                  {vessel.seasoningNotes.map((sn, sIdx) => (
                    <div key={sIdx}>• {sn}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

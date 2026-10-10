import React, { useState, useEffect, useRef } from 'react';
import { Player, InventoryItem, GameWorld } from '../types';
import { 
  CookwareVessel, 
  CulinaryIngredient, 
  createCookwareVessel, 
  itemToCulinaryIngredient, 
  cutIngredientAction, 
  stirVesselAction, 
  addSeasoningAction, 
  pourLiquidToVessel, 
  simulateCookwareTick, 
  finishCookwareToInventoryItem 
} from '../cookingEngine';
import { 
  addItemToPlayer, 
  removeItemFromPlayer, 
  addPlayerNotification 
} from '../items';
import { ItemIconCanvas } from './ItemIconCanvas';
import { sound } from '../audio';
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
  ShieldAlert, 
  Layers, 
  Activity, 
  ArrowRight, 
  Volume2, 
  Info,
  Sparkles
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
  stationName = 'Кухонный гарнитур и плита',
  furnitureType = 'kitchen_counter',
  onOpenStorage
}) => {
  if (!isOpen || !player) return null;

  // Active Cookware Vessel State
  const [activeVesselType, setActiveVesselType] = useState<'pan' | 'pot' | 'cutting_board' | 'bowl'>(
    furnitureType === 'stove' ? 'pan' : 'cutting_board'
  );

  const [vessel, setVessel] = useState<CookwareVessel>(() => 
    createCookwareVessel(furnitureType === 'stove' ? 'pan' : 'cutting_board')
  );

  const [selectedIngredientIdx, setSelectedIngredientIdx] = useState<number | null>(null);
  const [lastSensoryLog, setLastSensoryLog] = useState<string>('Рабочая поверхность готова. Выложите ингредиенты.');
  const lastSoundTickRef = useRef<number>(0);

  // Switch vessel type
  const handleSelectVesselType = (type: 'pan' | 'pot' | 'cutting_board' | 'bowl') => {
    if (vessel.ingredients.length > 0 || vessel.liquids.length > 0) {
      if (!window.confirm('В текущей посуде есть ингредиенты. Сменить посуду (содержимое будет очищено)?')) {
        return;
      }
    }
    setActiveVesselType(type);
    setVessel(createCookwareVessel(type));
    setSelectedIngredientIdx(null);
    setLastSensoryLog(`Выбрано: ${type === 'pan' ? 'Чугунная сковорода' : type === 'pot' ? 'Эмалированная кастрюля' : type === 'cutting_board' ? 'Разделочная доска' : 'Глубокая миска'}.`);
  };

  // Continuous thermodynamic simulation loop (1000ms tick)
  useEffect(() => {
    const timer = setInterval(() => {
      setVessel(prev => {
        const next = { ...prev };
        // Deep copy ingredients and liquids for mutation
        next.ingredients = prev.ingredients.map(ing => ({
          ...ing,
          nutrients: { ...ing.nutrients },
          bioState: { ...ing.bioState }
        }));
        next.liquids = prev.liquids.map(l => ({ ...l }));

        simulateCookwareTick(next, 1.0, 22.0);

        // Diegetic Sound cues:
        const now = Date.now();
        if (now - lastSoundTickRef.current > 2500) {
          const hasOil = next.liquids.some(l => l.isFatOrOil);
          const hasWater = next.liquids.some(l => !l.isFatOrOil);

          if (hasOil && next.temperature >= 140) {
            // Sizzling fat sound
            sound.playUseItem();
            lastSoundTickRef.current = now;
          } else if (hasWater && next.temperature >= 95) {
            // Boiling water bubbling
            sound.playDrink();
            lastSoundTickRef.current = now;
          }
        }

        // Check for urgent burning/pyrolysis events
        const highestChar = next.ingredients.reduce((m, i) => Math.max(m, i.bioState.charring), 0);
        if (highestChar > 0.4 && next.heatSourcePower >= 3) {
          setLastSensoryLog('Внимание: Едкий сизый дым! Ингредиенты пригорают ко дну — убавьте огонь или перемешайте!');
        } else if (next.smokeIntensity > 0.5) {
          setLastSensoryLog('Чувствуется едкий запах гари: масло превысило точку дымления.');
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Add item from player inventory into cookware
  const handlePlaceItemIntoCookware = (invItem: InventoryItem, invIndex: number) => {
    // Check category: allowed food, drink, and any organic raw items
    if (invItem.category !== 'food' && invItem.category !== 'drink' && !invItem.itemId.includes('meat') && !invItem.itemId.includes('oil')) {
      addPlayerNotification(player, 'На кухонный гарнитур можно выкладывать продукты, жидкости и специи.', 'warning');
      return;
    }

    // Convert item to culinary ingredient or liquid
    if (invItem.itemId.includes('oil') || invItem.itemId.includes('water') || invItem.itemId.includes('milk') || invItem.itemId.includes('broth')) {
      // Pour 100ml liquid
      pourLiquidToVessel(vessel, invItem.itemId, 150, invItem.nameRu);
      sound.playDrink();
      setLastSensoryLog(`Влито 150 мл жидкости «${invItem.nameRu}» на дно посуды.`);
      removeItemFromPlayer(player, invIndex, 1);
    } else {
      const ing = itemToCulinaryIngredient(invItem);
      vessel.ingredients.push(ing);
      sound.playUseItem();
      setLastSensoryLog(`На поверхность выложен(а) «${ing.nameRu}» (${ing.massGrams} г).`);
      removeItemFromPlayer(player, invIndex, 1);
    }

    setVessel({ ...vessel });
    onInventoryUpdated?.();
  };

  // Tactile Cutting Action
  const handleCutIngredient = (idx: number) => {
    const ing = vessel.ingredients[idx];
    if (!ing) return;
    const res = cutIngredientAction(ing);
    sound.playUseItem();
    setLastSensoryLog(res.message);
    setVessel({ ...vessel });
  };

  // Tactile Stirring Action
  const handleStirVessel = () => {
    const msg = stirVesselAction(vessel);
    sound.playUseItem();
    setLastSensoryLog(msg);
    setVessel({ ...vessel });
  };

  // Tactile Seasoning Action
  const handleAddSeasoning = (type: 'salt' | 'black_pepper' | 'sugar' | 'paprika' | 'bay_leaf') => {
    const msg = addSeasoningAction(vessel, type);
    sound.playUseItem();
    setLastSensoryLog(msg);
    setVessel({ ...vessel });
  };

  // Pour Water Action
  const handlePourWaterTap = () => {
    pourLiquidToVessel(vessel, 'water', 200, 'Чистая фильтрованная вода');
    sound.playDrink();
    setLastSensoryLog('Из кухонного крана налито 200 мл чистой холодной воды.');
    setVessel({ ...vessel });
  };

  // Pour Oil Action
  const handlePourOilSplash = () => {
    pourLiquidToVessel(vessel, 'sunflower_oil', 30, 'Подсолнечное масло');
    sound.playUseItem();
    setLastSensoryLog('Капли золотистого подсолнечного масла растеклись по дну сковороды.');
    setVessel({ ...vessel });
  };

  // Regulate Burner Power
  const handleSetBurnerPower = (power: number) => {
    vessel.heatSourcePower = power;
    sound.playUseItem();
    const powerLabels = [
      'Конфорка выключена (0)',
      'Слабый подогрев / томление (1 ~55°C)',
      'Медленный огонь (2 ~85°C)',
      'Кипение / варка (3 ~105°C)',
      'Средняя жарка / соте (4 ~155°C)',
      'Интенсивная жарка / колер (5 ~195°C)',
      'Максимальный жар (6 ~265°C - высокий риск гари!)'
    ];
    setLastSensoryLog(`Тумблер конфорки: ${powerLabels[power]}.`);
    setVessel({ ...vessel });
  };

  // Toggle Lid
  const handleToggleLid = () => {
    vessel.hasLid = !vessel.hasLid;
    sound.playUseItem();
    setLastSensoryLog(vessel.hasLid ? 'Посуда плотно накрыта тяжелой крышкой (пар удерживается).' : 'Крышка снята (влага свободно испаряется).');
    setVessel({ ...vessel });
  };

  // Remove single raw ingredient back to inventory
  const handleTakeBackIngredient = (idx: number) => {
    const ing = vessel.ingredients[idx];
    if (!ing) return;

    if (ing.bioState.denaturation > 0.4 || ing.bioState.charring > 0.2) {
      addPlayerNotification(player, 'Ингредиент уже подвергся термообработке. Завершите блюдо, чтобы разложить его по порциям.', 'info');
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
      description: `Ingredient retrieved from cutting table (${ing.massGrams}g).`,
      descriptionRu: `Продукт со столешницы (${ing.massGrams} г).`,
      effects: { hunger: 20 },
      weight: ing.massGrams / 1000,
      usable: true
    };

    addItemToPlayer(player, itemToReturn);
    vessel.ingredients.splice(idx, 1);
    setSelectedIngredientIdx(null);
    sound.playUseItem();
    setLastSensoryLog(`«${ing.nameRu}» возвращен(а) в инвентарь.`);
    setVessel({ ...vessel });
    onInventoryUpdated?.();
  };

  // Finish and Plate Dish
  const handleFinishDish = () => {
    if (vessel.ingredients.length === 0 && vessel.liquids.length === 0) {
      addPlayerNotification(player, 'Посуда пуста: нечего сервировать.', 'warning');
      return;
    }

    const dish = finishCookwareToInventoryItem(vessel);
    if (!dish) return;

    // Check vessel temperature when handling
    if (vessel.temperature >= 75) {
      addPlayerNotification(player, `Горячая посуда (${Math.round(vessel.temperature)}°C)! Используйте прихватку или осторожно раскладывайте лопаткой.`, 'info');
    }

    const success = addItemToPlayer(player, dish);
    if (success) {
      sound.playEat();
      addPlayerNotification(player, `Приготовлено: «${dish.nameRu}» (${dish.portions} порций, ${dish.nutrients?.calories} ккал).`, 'heal');
      
      // Reset vessel to clean state
      setVessel(createCookwareVessel(activeVesselType));
      setSelectedIngredientIdx(null);
      setLastSensoryLog(`Блюдо «${dish.nameRu}» готово и переложено в инвентарь! Столешница очищена.`);
      onInventoryUpdated?.();
      onVitalsChange?.();
    } else {
      addPlayerNotification(player, 'В инвентаре нет места для готового блюда!', 'warning');
    }
  };

  // Aggregate current vessel nutrition
  const totalNutrients = vessel.ingredients.reduce(
    (acc, ing) => {
      acc.kcal += ing.nutrients.calories;
      acc.p += ing.nutrients.proteins;
      acc.f += ing.nutrients.fats;
      acc.c += ing.nutrients.carbs;
      acc.sugars += ing.nutrients.sugars;
      acc.salt += ing.nutrients.salt;
      acc.water += ing.nutrients.water;
      acc.mass += ing.massGrams;
      return acc;
    },
    { kcal: 0, p: 0, f: 0, c: 0, sugars: 0, salt: vessel.saltGrams, water: 0, mass: 0 }
  );

  // Add liquid mass and fat to total
  for (const liq of vessel.liquids) {
    totalNutrients.mass += liq.volumeMl;
    if (liq.isFatOrOil) {
      totalNutrients.f += Number((liq.volumeMl * 0.9).toFixed(1));
      totalNutrients.kcal += Math.round(liq.volumeMl * 8.5);
    } else {
      totalNutrients.water += liq.volumeMl;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-fadeIn">
      <div className="w-full max-w-6xl max-h-[96vh] flex flex-col bg-slate-950 border border-amber-900/50 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden text-slate-100 font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-b border-amber-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-amber-200">
                  {stationName}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/50 text-amber-300 font-mono">
                  {vessel.vesselType === 'pan' ? 'Сковорода' : vessel.vesselType === 'pot' ? 'Кастрюля' : vessel.vesselType === 'cutting_board' ? 'Доска' : 'Миска'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Физико-химическая кулинарная симуляция (термодинамика, реакции Майяра, нарезка, БЖУ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenStorage && (
              <button
                onClick={onOpenStorage}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
                title="Открыть тумбы гарнитура для хранения предметов"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Шкафы гарнитура</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 hover:text-rose-300 border border-slate-700/80 flex items-center justify-center text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vessel Selector Tabs */}
        <div className="flex items-center gap-2 px-5 py-2 bg-slate-900/60 border-b border-slate-800 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium mr-1">Посуда / Рабочая зона:</span>
          {(['cutting_board', 'pan', 'pot', 'bowl'] as const).map(type => {
            const labels = {
              cutting_board: 'Разделочная доска',
              pan: 'Чугунная сковорода',
              pot: 'Кастрюля для варки',
              bowl: 'Миска для смешивания'
            };
            const isActive = activeVesselType === type;
            return (
              <button
                key={type}
                onClick={() => handleSelectVesselType(type)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-600/30'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {type === 'cutting_board' && <Utensils className="w-3.5 h-3.5" />}
                {type === 'pan' && <Flame className="w-3.5 h-3.5" />}
                {type === 'pot' && <Droplets className="w-3.5 h-3.5" />}
                {type === 'bowl' && <Sparkles className="w-3.5 h-3.5" />}
                <span>{labels[type]}</span>
              </button>
            );
          })}
        </div>

        {/* Main Workstation Layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Player Inventory Ingredients (4 cols) */}
          <div className="lg:col-span-4 border-r border-slate-800/80 flex flex-col min-h-0 bg-slate-950/40">
            <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Ваши продукты и инвентарь
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {player.inventory.filter(i => i.category === 'food' || i.category === 'drink').length} предм.
              </span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {player.inventory.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  В карманах и рюкзаке пусто
                </div>
              ) : (
                player.inventory.map((item, idx) => {
                  const isFoodOrDrink = item.category === 'food' || item.category === 'drink';
                  return (
                    <div
                      key={item.id || idx}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isFoodOrDrink
                          ? 'bg-slate-900/70 border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 cursor-pointer'
                          : 'bg-slate-900/30 border-slate-800/40 opacity-50'
                      }`}
                      onClick={() => isFoodOrDrink && handlePlaceItemIntoCookware(item, idx)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700/60 flex items-center justify-center shrink-0">
                          <ItemIconCanvas itemId={item.itemId} item={item} size={32} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {item.nameRu || item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{item.weight ? `${Math.round(item.weight * 1000)} г` : '100 г'}</span>
                            {item.nutrients && (
                              <span className="text-amber-400/90 font-mono">
                                {item.nutrients.calories} ккал
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isFoodOrDrink && (
                        <button
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-semibold text-amber-300 shrink-0 flex items-center gap-1 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaceItemIntoCookware(item, idx);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          <span>На стол</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Center Column: The Cooking Surface & Tactile Controls (5 cols) */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-slate-900/20 border-r border-slate-800/80">
            
            {/* Thermodynamic Physical Status Header */}
            <div className="p-3.5 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Flame className={`w-3.5 h-3.5 ${vessel.heatSourcePower > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`} />
                  <span>Температура посуды: {Math.round(vessel.temperature)}°C</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {vessel.temperature > 100 
                    ? (vessel.temperature > 180 ? 'Интенсивный сильный жар (риск гари)' : 'Активная реакция Майяра / колер')
                    : (vessel.temperature > 50 ? 'Умеренный прогрев' : 'Холодная поверхность')}
                </div>
              </div>

              {/* Lid status */}
              <button
                onClick={handleToggleLid}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 ${
                  vessel.hasLid
                    ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{vessel.hasLid ? 'Крышка: Накрыто' : 'Крышка: Открыто'}</span>
              </button>
            </div>

            {/* In-Vessel Ingredients Scroll Area */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5">
              
              {/* Liquid layer indicators if any */}
              {vessel.liquids.length > 0 && (
                <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs">
                  <div className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Среда / Жидкая фаза ({vessel.liquids.reduce((s, l) => s + l.volumeMl, 0)} мл)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vessel.liquids.map((liq, lIdx) => (
                      <span key={lIdx} className="px-2 py-0.5 rounded-md bg-cyan-900/40 text-cyan-200 font-mono text-[11px]">
                        {liq.nameRu}: {Math.round(liq.volumeMl)} мл ({Math.round(liq.temperature)}°C)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Solid Ingredients List */}
              {vessel.ingredients.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 rounded-2xl text-center p-6 text-slate-500">
                  <Utensils className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs font-medium">Посуда пуста</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Выберите продукты слева и нажмите «На стол», чтобы положить их в посуду.
                  </p>
                </div>
              ) : (
                vessel.ingredients.map((ing, idx) => {
                  const isSelected = selectedIngredientIdx === idx;
                  const charringLevel = ing.bioState.charring;
                  const maillardLevel = ing.bioState.maillard;
                  const denatLevel = ing.bioState.denaturation;

                  return (
                    <div
                      key={ing.id}
                      onClick={() => setSelectedIngredientIdx(idx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/30 border-amber-500/70 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Visual color dot based on biochemical state */}
                          <div 
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/40 shadow-sm"
                            style={{
                              backgroundColor: charringLevel > 0.35 
                                ? '#18181b' // Charred black
                                : maillardLevel > 0.35
                                ? '#b45309' // Golden brown
                                : denatLevel > 0.6
                                ? '#a8a29e' // Cooked grey-brown
                                : '#f43f5e'  // Raw pink
                            }}
                            title="Цвет органолептики (розовый сырой -> золотистый -> обугленный)"
                          />
                          <span className="text-xs font-bold text-slate-200 truncate">
                            {ing.nameRu}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ({ing.massGrams} г)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Physical action button: Cut/Chop */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCutIngredient(idx);
                            }}
                            className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition-colors"
                            title="Нарезать кухонным ножом"
                          >
                            {ing.bioState.cutLevel === 0 ? 'Нарезать' : ing.bioState.cutLevel === 1 ? 'Измельчить' : 'Фарш'}
                          </button>

                          {/* Take back if raw */}
                          {denatLevel < 0.3 && charringLevel < 0.1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTakeBackIngredient(idx);
                              }}
                              className="p-1 rounded-md bg-slate-800/80 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors"
                              title="Убрать обратно в инвентарь"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Diegetic Visual States (Anti-Slop: NO progress bars, only physical observations) */}
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {/* Cut state */}
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {ing.bioState.cutLevel === 0 ? 'Цельный кусок' : `${ing.bioState.cutPieces} ломтиков`}
                        </span>

                        {/* Cooking state */}
                        {charringLevel > 0.45 ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-rose-300 font-bold">
                            Обугленный нагар (горький)
                          </span>
                        ) : charringLevel > 0.15 ? (
                          <span className="px-1.5 py-0.5 rounded bg-orange-950/80 border border-orange-800/60 text-orange-300">
                            Легкий пригар
                          </span>
                        ) : maillardLevel > 0.3 ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-300 font-semibold">
                            Золотистая корочка (Майяр)
                          </span>
                        ) : denatLevel > 0.6 ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            Сварен / Готов
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300">
                            Сырой продукт
                          </span>
                        )}

                        {/* Hydrolysis / tenderness */}
                        {ing.bioState.hydrolysis > 0.7 && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300">
                            Разварен / Мягкий
                          </span>
                        )}

                        <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono ml-auto">
                          T: {Math.round(ing.surfaceTemp)}°C
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Direct Physical Affordance Tool Bar (Agency) */}
            <div className="p-3 bg-slate-950/70 border-t border-slate-800 space-y-2.5">
              
              {/* Burner Heat Selector (0 to 6) */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Мощность конфорки:</span>
                </span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map(p => (
                    <button
                      key={p}
                      onClick={() => handleSetBurnerPower(p)}
                      className={`w-7 h-7 rounded-lg font-bold text-xs font-mono transition-all ${
                        vessel.heatSourcePower === p
                          ? p === 0
                            ? 'bg-slate-700 text-white'
                            : p <= 3
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : 'bg-rose-600 text-white shadow-md shadow-rose-600/40'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                      }`}
                      title={p === 0 ? 'Выкл' : `Мощность ${p}`}
                    >
                      {p === 0 ? '0' : p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tactile Actions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  onClick={handleStirVessel}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-colors flex items-center justify-center gap-1.5"
                  title="Перевернуть куски лопаткой со дна, распределив жар"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Перемешать</span>
                </button>

                <button
                  onClick={handlePourOilSplash}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-colors flex items-center justify-center gap-1.5"
                  title="Плеснуть растительное масло"
                >
                  <Droplets className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Масло</span>
                </button>

                <button
                  onClick={handlePourWaterTap}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-colors flex items-center justify-center gap-1.5"
                  title="Налить чистую воду из крана"
                >
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+ Вода</span>
                </button>

                <button
                  onClick={() => handleAddSeasoning('salt')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-colors flex items-center justify-center gap-1.5"
                  title="Посолить щепоткой"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-300" />
                  <span>+ Соль</span>
                </button>
              </div>

              {/* Complete & Plate Dish */}
              <button
                onClick={handleFinishDish}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Снять с огня и переложить в тарелку</span>
              </button>
            </div>
          </div>

          {/* Right Column: Sensory Feedback & Biochemical Nutrition (3 cols) */}
          <div className="lg:col-span-3 flex flex-col min-h-0 bg-slate-950/60 p-4 space-y-4 overflow-y-auto">
            
            {/* Real-time Diegetic Sensory Observation */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-2 uppercase tracking-wider text-[11px]">
                <Activity className="w-3.5 h-3.5" />
                <span>Органолептика и чувства</span>
              </div>
              <p className="text-slate-300 leading-relaxed italic text-[11px]">
                «{lastSensoryLog}»
              </p>
            </div>

            {/* Nutrition & Macro Parameters (БЖУ на будущее) */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Биохимический профиль (БЖУ)
                </span>
                <span className="text-amber-400 font-mono font-bold">
                  {totalNutrients.kcal} ккал
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">БЕЛКИ (ПРОТЕИН)</div>
                  <div className="text-slate-200 font-bold text-xs">{totalNutrients.p.toFixed(1)} г</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">ЖИРЫ (ЛИПИДЫ)</div>
                  <div className="text-amber-300 font-bold text-xs">{totalNutrients.f.toFixed(1)} г</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">УГЛЕВОДЫ</div>
                  <div className="text-cyan-300 font-bold text-xs">{totalNutrients.c.toFixed(1)} г</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">САХАРА</div>
                  <div className="text-pink-300 font-bold text-xs">{totalNutrients.sugars.toFixed(1)} г</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">СОЛЬ (NaCl)</div>
                  <div className="text-slate-300 font-bold text-xs">{totalNutrients.salt.toFixed(1)} г</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">ОБЩАЯ МАССА</div>
                  <div className="text-slate-200 font-bold text-xs">{totalNutrients.mass} г</div>
                </div>
              </div>
            </div>

            {/* Spices & Seasoning Log */}
            {vessel.seasoningNotes.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px]">
                <div className="text-slate-400 font-semibold mb-1">Добавленные приправы:</div>
                <div className="text-slate-300 space-y-0.5">
                  {vessel.seasoningNotes.map((sn, sIdx) => (
                    <div key={sIdx}>• {sn}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Simulation Guidance Notes */}
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 text-[10px] text-slate-400 leading-relaxed">
              <div className="font-semibold text-amber-300/90 mb-1 flex items-center gap-1">
                <Info className="w-3 h-3 text-amber-400" />
                <span>Физические законы кухни</span>
              </div>
              При $T \ge 135^\circ$C идет румяная реакция Майяра. Выше $190^\circ$C без влаги и перемешивания продукт обугливается. Для варки супов заливайте воду ($T$ не превысит $100^\circ$C).
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

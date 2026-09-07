import React, { useState, useEffect } from 'react';
import { Vehicle, Player, GroundItem, InventoryItem, CarType } from '../types';
import { CAR_CONFIGS } from '../vehicleHelpers';
import { createItem, ITEM_CATALOG } from '../items';
import { sound } from '../audio';

interface EngineBayModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  player: Player | null;
  groundItems: GroundItem[];
  onUpdateVehicle: (v: Vehicle) => void;
  onUpdatePlayer: (p: Player) => void;
  addNotification: (text: string, type?: 'heal' | 'food' | 'drink' | 'energy' | 'sleep' | 'warning' | 'pickup' | 'info') => void;
}

export const EngineBayModal: React.FC<EngineBayModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  player,
  groundItems,
  onUpdateVehicle,
  onUpdatePlayer,
  addNotification,
}) => {
  const [pouringType, setPouringType] = useState<'coolant' | 'oil' | null>(null);
  const [pouringProgress, setPouringProgress] = useState<number>(0);

  if (!isOpen || !vehicle || !player) return null;

  const eng = vehicle.engineState;
  const cfg = CAR_CONFIGS[vehicle.type] || CAR_CONFIGS.sedan;

  // Determine engine bay category
  const getEngineCategory = (type: CarType): 'classic' | 'modern' | 'heavy' | 'sports' => {
    if (['sports', 'supercar', 'muscle', 'muscle_classic', 'coupe_gt', 'hatch_hot'].includes(type)) {
      return 'sports';
    }
    if (['truck_box', 'truck_dump', 'truck_tanker', 'truck_water', 'truck_flatbed', 'cement_mixer', 'garbage_truck', 'pickup_heavy', 'pickup', 'bus', 'fire_engine', 'offroad_hardcore', 'truck_armored', 'truck_tow'].includes(type)) {
      return 'heavy';
    }
    if (['suv_luxury', 'crossover_compact', 'sedan_luxury', 'sedan_compact', 'wagon_modern', 'wagon_allroad', 'ambulance_suv', 'van_camper', 'bus_minibus'].includes(type)) {
      return 'modern';
    }
    return 'classic';
  };

  const category = getEngineCategory(vehicle.type);

  // Default missing engine fields if undefined
  const batteryInstalled = eng.batteryInstalled ?? true;
  const batteryPosConnected = eng.batteryPosConnected ?? true;
  const batteryNegConnected = eng.batteryNegConnected ?? true;
  const radiatorCapOpen = eng.radiatorCapOpen ?? false;
  const oilCapOpen = eng.oilCapOpen ?? false;
  const dipstickPulled = eng.dipstickPulled ?? false;
  const batteryCharge = eng.batteryCharge ?? 100;
  const radiatorWater = eng.radiatorWater ?? 100; // 0-100%
  const oilLevel = eng.oilLevel ?? 100;           // 0-100%

  // Capacity definitions
  const MAX_COOLANT_ML = 5000; // 5.0 Liters
  const MAX_OIL_ML = 4000;     // 4.0 Liters

  const currentCoolantMl = Math.round((radiatorWater / 100) * MAX_COOLANT_ML);
  const currentOilMl = Math.round((oilLevel / 100) * MAX_OIL_ML);

  const missingCoolantMl = MAX_COOLANT_ML - currentCoolantMl;
  const missingOilMl = MAX_OIL_ML - currentOilMl;

  // Hand items
  const rightHand = player.rightHandItem;
  const leftHand = player.leftHandItem;

  // Find battery or fluid in hands (right hand prioritized)
  const getHandItem = (filterFn: (item: InventoryItem) => boolean): { hand: 'right' | 'left'; item: InventoryItem } | null => {
    if (rightHand && filterFn(rightHand)) return { hand: 'right', item: rightHand };
    if (leftHand && filterFn(leftHand)) return { hand: 'left', item: leftHand };
    return null;
  };

  const batteryInHand = getHandItem(i => i.itemId === 'car_battery');
  const coolantInHand = getHandItem(i => i.itemId === 'antifreeze' && (i.fluidLiters ?? 5.0) > 0);
  const oilInHand = getHandItem(i => i.itemId === 'motor_oil' && (i.fluidLiters ?? 4.0) > 0);

  // Handlers
  const togglePosTerminal = () => {
    if (!batteryInstalled) return;
    const newPos = !batteryPosConnected;
    eng.batteryPosConnected = newPos;
    sound.playUseItem();
    addNotification(newPos ? '➕ Положительная клемма (+12V) подключена' : '🔌 Положительная клемма (+12V) отключена', 'info');
    onUpdateVehicle({ ...vehicle, engineState: { ...eng } });
  };

  const toggleNegTerminal = () => {
    if (!batteryInstalled) return;
    const newNeg = !batteryNegConnected;
    eng.batteryNegConnected = newNeg;
    sound.playUseItem();
    addNotification(newNeg ? '➖ Отрицательная клемма (Масса) подключена' : '🔌 Отрицательная клемма (Масса) отключена', 'info');
    onUpdateVehicle({ ...vehicle, engineState: { ...eng } });
  };

  const handleRemoveBattery = () => {
    if (!batteryInstalled) return;
    if (batteryPosConnected || batteryNegConnected) {
      addNotification('⚠️ Сначала отсоедините обе клеммы от аккумулятора!', 'warning');
      return;
    }

    // Remove battery from car
    eng.batteryInstalled = false;

    // Create battery item with current charge
    const batItem = createItem('car_battery', 1);
    batItem.batteryCharge = Math.round(batteryCharge);

    // Place in right hand, left hand, or ground
    const updatedPlayer = { ...player };
    if (!updatedPlayer.rightHandItem) {
      updatedPlayer.rightHandItem = batItem;
      addNotification(`🔋 Аккумулятор (заряд ${batItem.batteryCharge}%) взят в правую руку`, 'pickup');
    } else if (!updatedPlayer.leftHandItem) {
      updatedPlayer.leftHandItem = batItem;
      addNotification(`🔋 Аккумулятор (заряд ${batItem.batteryCharge}%) взят в левую руку`, 'pickup');
    } else {
      // Ground
      const groundItem: GroundItem = {
        id: `ground_bat_${Date.now()}`,
        x: player.x + (Math.random() - 0.5) * 20,
        y: player.y + (Math.random() - 0.5) * 20,
        item: batItem,
      };
      groundItems.push(groundItem);
      addNotification(`🔋 Руки заняты! Аккумулятор (заряд ${batItem.batteryCharge}%) положен на землю`, 'info');
    }

    sound.playPickup();
    onUpdateVehicle({ ...vehicle, engineState: { ...eng } });
    onUpdatePlayer(updatedPlayer);
  };

  const handleInstallBattery = () => {
    if (batteryInstalled) return;
    if (!batteryInHand) {
      addNotification('⚠️ Возьмите запасной аккумулятор в руку, чтобы установить его!', 'warning');
      return;
    }

    const { hand, item } = batteryInHand;
    const chargeToInstall = item.batteryCharge ?? 100;

    // Install into car
    eng.batteryInstalled = true;
    eng.batteryCharge = chargeToInstall;
    eng.batteryPosConnected = false;
    eng.batteryNegConnected = false;

    // Remove item from hand
    const updatedPlayer = { ...player };
    if (hand === 'right') updatedPlayer.rightHandItem = null;
    else updatedPlayer.leftHandItem = null;

    sound.playUseItem();
    addNotification(`🔋 Аккумулятор установлен (Заряд: ${chargeToInstall}%). Подключите клеммы!`, 'info');
    onUpdateVehicle({ ...vehicle, engineState: { ...eng } });
    onUpdatePlayer(updatedPlayer);
  };

  const toggleRadiatorCap = () => {
    const next = !radiatorCapOpen;
    eng.radiatorCapOpen = next;
    sound.playUseItem();
    addNotification(next ? '🧪 Крышка радиатора откручена' : '🔒 Крышка радиатора закручена', 'info');
    onUpdateVehicle({ ...vehicle, engineState: { ...eng } });
  };

  const handlePourCoolant = () => {
    if (!radiatorCapOpen) {
      addNotification('⚠️ Сначала открутите крышку радиатора!', 'warning');
      return;
    }
    if (!coolantInHand) {
      addNotification('⚠️ Возьмите канистру с антифризом в руку!', 'warning');
      return;
    }
    if (missingCoolantMl <= 0) {
      addNotification('✅ Радиатор залит до максимального уровня (100%)!', 'info');
      return;
    }

    const { hand, item } = coolantInHand;
    const canisterLiters = item.fluidLiters ?? 5.0;
    const canisterMl = canisterLiters * 1000;

    const pourMl = Math.min(missingCoolantMl, canisterMl);
    const newCoolantMl = currentCoolantMl + pourMl;
    const newRadiatorWater = Math.min(100, (newCoolantMl / MAX_COOLANT_ML) * 100);

    eng.radiatorWater = newRadiatorWater;
    eng.radiatorPunctured = false; // sealing effect

    const remainingCanisterMl = canisterMl - pourMl;
    const remainingCanisterLiters = Math.max(0, remainingCanisterMl / 1000);

    const updatedPlayer = { ...player };

    if (remainingCanisterLiters <= 0.05) {
      // Empty canister
      const emptyCanister = createItem('antifreeze_empty', 1);
      if (hand === 'right') updatedPlayer.rightHandItem = emptyCanister;
      else updatedPlayer.leftHandItem = emptyCanister;
      addNotification(`🧪 Залито ${Math.round(pourMl)} мл антифриза. Канистра опустела!`, 'pickup');
    } else {
      // Update canister volume
      const updatedCanister = { ...item, fluidLiters: remainingCanisterLiters };
      if (hand === 'right') updatedPlayer.rightHandItem = updatedCanister;
      else updatedPlayer.leftHandItem = updatedCanister;
      addNotification(`🧪 Залито ${Math.round(pourMl)} мл антифриза. В канистре осталось ${remainingCanisterLiters.toFixed(1)} л.`, 'info');
    }

    sound.playDrink(); // Liquid sound
    setPouringType('coolant');
    setPouringProgress(100);
    setTimeout(() => setPouringType(null), 1000);

    onUpdateVehicle({ ...vehicle, engineState: { ...eng } });
    onUpdatePlayer(updatedPlayer);
  };

  const toggleOilCap = () => {
    const next = !oilCapOpen;
    eng.oilCapOpen = next;
    sound.playUseItem();
    addNotification(next ? '🛢️ Маслозаливная горловина открыта' : '🔒 Маслозаливная горловина закрыта', 'info');
    onUpdateVehicle({ ...vehicle, engineState: { ...eng } });
  };

  const toggleDipstick = () => {
    const next = !dipstickPulled;
    eng.dipstickPulled = next;
    sound.playUseItem();
    if (next) {
      addNotification(`📏 Масляный щуп извлечен (Уровень: ${Math.round(oilLevel)}%)`, 'info');
    } else {
      addNotification('📏 Масляный щуп вставлен на место', 'info');
    }
    onUpdateVehicle({ ...vehicle, engineState: { ...eng } });
  };

  const handlePourOil = () => {
    if (!oilCapOpen) {
      addNotification('⚠️ Сначала откройте пропку маслозаливной горловины!', 'warning');
      return;
    }
    if (!oilInHand) {
      addNotification('⚠️ Возьмите канистру с моторным маслом в руку!', 'warning');
      return;
    }
    if (missingOilMl <= 0) {
      addNotification('✅ Масло заполнено до максимальной отметки MAX (100%)!', 'info');
      return;
    }

    const { hand, item } = oilInHand;
    const canisterLiters = item.fluidLiters ?? 4.0;
    const canisterMl = canisterLiters * 1000;

    const pourMl = Math.min(missingOilMl, canisterMl);
    const newOilMl = currentOilMl + pourMl;
    const newOilLevel = Math.min(100, (newOilMl / MAX_OIL_ML) * 100);

    eng.oilLevel = newOilLevel;
    eng.oilPressure = Math.min(100, Math.max(30, newOilLevel));
    eng.oilPunctured = false;

    const remainingCanisterMl = canisterMl - pourMl;
    const remainingCanisterLiters = Math.max(0, remainingCanisterMl / 1000);

    const updatedPlayer = { ...player };

    if (remainingCanisterLiters <= 0.05) {
      // Empty oil canister
      const emptyCanister = createItem('motor_oil_empty', 1);
      if (hand === 'right') updatedPlayer.rightHandItem = emptyCanister;
      else updatedPlayer.leftHandItem = emptyCanister;
      addNotification(`🛢️ Залито ${Math.round(pourMl)} мл моторного масла. Канистра опустела!`, 'pickup');
    } else {
      const updatedCanister = { ...item, fluidLiters: remainingCanisterLiters };
      if (hand === 'right') updatedPlayer.rightHandItem = updatedCanister;
      else updatedPlayer.leftHandItem = updatedCanister;
      addNotification(`🛢️ Залито ${Math.round(pourMl)} мл масла. В канистре осталось ${remainingCanisterLiters.toFixed(1)} л.`, 'info');
    }

    sound.playDrink();
    setPouringType('oil');
    setPouringProgress(100);
    setTimeout(() => setPouringType(null), 1000);

    onUpdateVehicle({ ...vehicle, engineState: { ...eng } });
    onUpdatePlayer(updatedPlayer);
  };

  const handleClose = () => {
    eng.hoodOpen = false;
    sound.playUseItem();
    onUpdateVehicle({ ...vehicle, engineState: { ...eng } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-1 sm:p-3 md:p-4 select-none text-slate-100 font-sans">
      {/* Container Card */}
      <div className="relative w-full max-w-6xl h-[96vh] sm:h-[92vh] max-h-[900px] bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 sm:px-5 sm:py-3 bg-slate-950/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg sm:text-2xl shadow-inner shrink-0">
              ⚙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-bold tracking-tight text-amber-400 truncate">{cfg.name}</h2>
                <span className="hidden xs:inline-block px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-slate-800 text-amber-300 border border-amber-500/20 uppercase tracking-wider">
                  ({category === 'sports' ? 'Twin-Turbo' : category === 'heavy' ? 'Diesel' : category === 'modern' ? 'DOHC' : 'Carb'})
                </span>
              </div>
              <p className="hidden md:block text-xs text-slate-400">
                Нажимайте прямо на компоненты под капотом для снятия, обслуживания и проверки жидкостей
              </p>
            </div>
          </div>

          {/* Close Hood Button */}
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0"
          >
            <span>🔒 Закрыть капот (Esc)</span>
          </button>
        </div>

        {/* Player Hands HUD Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 sm:px-5 sm:py-2 bg-slate-950 border-b border-slate-800/80 text-[11px] sm:text-xs shrink-0">
          <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-slate-400 font-medium">🖐️ Правая:</span>
              {rightHand ? (
                <span className="px-2 py-0.5 bg-sky-950/80 border border-sky-500/40 text-sky-200 rounded-lg font-medium flex items-center gap-1 shadow-sm text-[10px] sm:text-xs">
                  <span>{rightHand.icon}</span>
                  <span className="truncate max-w-[90px] sm:max-w-none">{rightHand.nameRu}</span>
                  {rightHand.batteryCharge !== undefined && <span className="text-amber-400">({rightHand.batteryCharge}%)</span>}
                  {rightHand.fluidLiters !== undefined && <span className="text-emerald-400">({rightHand.fluidLiters.toFixed(1)}л)</span>}
                </span>
              ) : (
                <span className="text-slate-500 italic bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800 text-[10px] sm:text-xs">Свободна</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-slate-400 font-medium">🤚 Левая:</span>
              {leftHand ? (
                <span className="px-2 py-0.5 bg-sky-950/80 border border-sky-500/40 text-sky-200 rounded-lg font-medium flex items-center gap-1 shadow-sm text-[10px] sm:text-xs">
                  <span>{leftHand.icon}</span>
                  <span className="truncate max-w-[90px] sm:max-w-none">{leftHand.nameRu}</span>
                  {leftHand.batteryCharge !== undefined && <span className="text-amber-400">({leftHand.batteryCharge}%)</span>}
                  {leftHand.fluidLiters !== undefined && <span className="text-emerald-400">({leftHand.fluidLiters.toFixed(1)}л)</span>}
                </span>
              ) : (
                <span className="text-slate-500 italic bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800 text-[10px] sm:text-xs">Свободна</span>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span> Клеммы АКБ</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> Радиатор</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Масло</span>
          </div>
        </div>

        {/* Main Workspace Body */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 p-2 sm:p-4 overflow-y-auto bg-slate-950/60">
          
          {/* Left/Center Column: Realistic Interactive SVG Engine Bay Blueprint */}
          <div className="sm:col-span-7 lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 sm:p-4 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            
            {/* Visual Engine Bay Title & Indicators */}
            <div className="flex justify-between items-center mb-1.5 z-10 text-[11px] sm:text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="hidden xs:inline">Подкапотный отсек:</span> <span className="text-amber-400 font-mono truncate">{cfg.name}</span>
              </span>
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono shrink-0">
                <span className="text-slate-400">ДВС: <strong className="text-slate-200">{eng.engineRunning ? 'Заведён 🟢' : 'Заглушен 🔴'}</strong></span>
                <span className="text-slate-400">Темп: <strong className={eng.temperature > 100 ? 'text-rose-400' : 'text-amber-300'}>{Math.round(eng.temperature || 85)}°C</strong></span>
              </div>
            </div>

            {/* Interactive Animated SVG Engine Bay Space */}
            <div className="relative w-full h-[220px] xs:h-[260px] sm:h-[320px] md:h-[380px] lg:h-[460px] bg-slate-950 rounded-xl border border-slate-800 p-1 sm:p-2 flex items-center justify-center overflow-hidden shadow-inner group">
              
              {/* Background Metal Grid Lines */}
              <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-30"></div>
              
              {/* Pouring Liquid Animation Overlay */}
              {pouringType && (
                <div className="absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none animate-fadeIn">
                  <div className="text-3xl sm:text-4xl animate-bounce mb-1">
                    {pouringType === 'coolant' ? '🧪' : '🛢️'}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-amber-400">
                    {pouringType === 'coolant' ? 'Заливаем антифриз...' : 'Заливаем масло...'}
                  </div>
                  <div className="w-36 sm:w-48 h-2 bg-slate-900 rounded-full overflow-hidden border border-amber-500/40 mt-1.5">
                    <div className="h-full bg-amber-400 animate-pulse" style={{ width: `${pouringProgress}%` }}></div>
                  </div>
                </div>
              )}

              {/* Container wrapping SVG and real HTML Floating Interactive Badges */}
              <div className="relative w-full h-full max-w-[650px] max-h-[440px] flex items-center justify-center">

                {/* DETAILED ENGINE BAY SVG ARTWORK */}
                <svg className="w-full h-full" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Gradients for metal, engine cover, battery, fluids */}
                  <linearGradient id="bodyFrame" x1="0" y1="0" x2="0" y2="400" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                  
                  <linearGradient id="engineBlockGrad" x1="0" y1="0" x2="300" y2="200" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={category === 'sports' ? '#881337' : category === 'heavy' ? '#451a03' : category === 'modern' ? '#1e293b' : '#334155'} />
                    <stop offset="100%" stopColor={category === 'sports' ? '#4c0519' : category === 'heavy' ? '#1c1917' : category === 'modern' ? '#0f172a' : '#1e293b'} />
                  </linearGradient>

                  <linearGradient id="coolantFluid" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.4" />
                  </linearGradient>

                  <linearGradient id="oilFluid" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#d97706" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.5" />
                  </linearGradient>

                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Outer Car Body / Inner Fender Walls */}
                <rect x="20" y="20" width="560" height="360" rx="24" fill="url(#bodyFrame)" stroke="#334155" strokeWidth="4" />
                {/* Firewall (Rear of engine bay) */}
                <rect x="35" y="325" width="530" height="40" rx="8" fill="#020617" stroke="#1e293b" strokeWidth="2" />
                <path d="M40 335 H560" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

                {/* Left & Right Strut Towers (Чашки амортизаторов) */}
                <circle cx="90" cy="200" r="32" fill="#0f172a" stroke="#475569" strokeWidth="3" />
                <circle cx="90" cy="200" r="18" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                <circle cx="80" cy="190" r="3" fill="#94a3b8" />
                <circle cx="100" cy="190" r="3" fill="#94a3b8" />
                <circle cx="90" cy="212" r="3" fill="#94a3b8" />

                <circle cx="510" cy="200" r="32" fill="#0f172a" stroke="#475569" strokeWidth="3" />
                <circle cx="510" cy="200" r="18" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                <circle cx="500" cy="190" r="3" fill="#94a3b8" />
                <circle cx="520" cy="190" r="3" fill="#94a3b8" />
                <circle cx="510" cy="212" r="3" fill="#94a3b8" />

                {/* Strut Tower Brace Bar (Sports / Supercar) */}
                {(category === 'sports' || category === 'heavy') && (
                  <path d="M90 200 L510 200" stroke={category === 'sports' ? '#f43f5e' : '#d97706'} strokeWidth="6" strokeLinecap="round" opacity="0.85" />
                )}

                {/* FRONT RADIATOR SUPPORT BEAM */}
                <rect x="60" y="35" width="480" height="25" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                {/* Radiator Core & Cooling Fins */}
                <rect x="120" y="42" width="360" height="12" rx="2" fill="#020617" stroke="#1e293b" />
                <path d="M125 48 H475" stroke="#334155" strokeWidth="2" strokeDasharray="2 2" />

                {/* Cooling Fan Grill */}
                <circle cx="240" cy="80" r="22" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                <circle cx="360" cy="80" r="22" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                <path d="M240 60 V100 M220 80 H260" stroke="#1e293b" strokeWidth="2" className={eng.engineRunning ? "animate-spin origin-[240px_80px]" : ""} />
                <path d="M360 60 V100 M340 80 H380" stroke="#1e293b" strokeWidth="2" className={eng.engineRunning ? "animate-spin origin-[360px_80px]" : ""} />

                {/* Coolant Hoses (Rubber Pipes) */}
                <path d="M150 50 Q150 110 200 130" stroke="#0f172a" strokeWidth="12" strokeLinecap="round" />
                <path d="M150 50 Q150 110 200 130" stroke="#334155" strokeWidth="8" strokeLinecap="round" />

                {/* AIR FILTER & INTAKE SYSTEM */}
                <g className="cursor-pointer hover:opacity-90 transition-opacity">
                  <rect x="50" y="75" width="70" height="85" rx="10" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                  <rect x="55" y="80" width="60" height="75" rx="6" fill="#020617" />
                  {/* Filter Ribs */}
                  <line x1="60" y1="95" x2="110" y2="95" stroke="#d97706" strokeWidth="3" />
                  <line x1="60" y1="110" x2="110" y2="110" stroke="#d97706" strokeWidth="3" />
                  <line x1="60" y1="125" x2="110" y2="125" stroke="#d97706" strokeWidth="3" />
                  <text x="85" y="150" fill="#94a3b8" fontSize="8" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">AIR FILTER</text>
                  {/* Intake Duct Hose */}
                  <path d="M120 115 C150 115, 160 140, 180 140" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
                  <path d="M120 115 C150 115, 160 140, 180 140" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
                </g>

                {/* BRAKE BOOSTER & MASTER CYLINDER (Rear Left) */}
                <g>
                  <circle cx="80" cy="285" r="20" fill="#020617" stroke="#334155" strokeWidth="2" />
                  <rect x="95" y="275" width="30" height="20" rx="4" fill="#0f172a" stroke="#475569" />
                  <rect x="100" y="270" width="20" height="8" rx="2" fill="#fbbf24" opacity="0.8" />
                  <text x="110" y="290" fill="#64748b" fontSize="7" textAnchor="middle">BRAKE</text>
                </g>

                {/* WINDSHIELD WASHER FLUID TANK */}
                <g>
                  <rect x="50" y="175" width="30" height="40" rx="6" fill="#1e293b" stroke="#334155" />
                  <rect x="52" y="185" width="26" height="28" rx="4" fill="#0284c7" opacity="0.6" />
                  <circle cx="65" cy="180" r="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="65" y="182" fill="#ffffff" fontSize="6" textAnchor="middle" fontWeight="bold">W</text>
                </g>

                {/* MAIN ENGINE BLOCK & CYLINDER HEAD COVER (Center) */}
                <g className="transition-all">
                  {/* Engine Shroud Outer Container */}
                  <rect x="175" y="120" width="250" height="185" rx="18" fill="url(#engineBlockGrad)" stroke="#475569" strokeWidth="3" />
                  <rect x="185" y="130" width="230" height="165" rx="12" fill="#020617" opacity="0.3" />

                  {/* Category Specific Graphics */}
                  {category === 'sports' && (
                    <g>
                      {/* Twin Turbocharge Pipes */}
                      <path d="M190 140 L220 180 M410 140 L380 180" stroke="#f43f5e" strokeWidth="5" strokeLinecap="round" />
                      <text x="300" y="160" fill="#f43f5e" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="2">TWIN TURBO 3.8L</text>
                    </g>
                  )}
                  {category === 'heavy' && (
                    <g>
                      <text x="300" y="160" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="2">TURBODIESEL V8</text>
                      <path d="M210 145 H390 M210 155 H390" stroke="#78350f" strokeWidth="3" />
                    </g>
                  )}
                  {category === 'modern' && (
                    <g>
                      <text x="300" y="160" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="1.5">VVT-i DOHC 16V</text>
                    </g>
                  )}
                  {category === 'classic' && (
                    <g>
                      {/* Round Chrome Air Cleaner */}
                      <circle cx="300" cy="180" r="35" fill="#475569" stroke="#94a3b8" strokeWidth="3" />
                      <circle cx="300" cy="180" r="28" fill="#1e293b" />
                      <text x="300" y="184" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle">1.6L CARB</text>
                    </g>
                  )}

                  {/* Spark Plug Wires / Ignition Coils */}
                  {category !== 'classic' && (
                    <g>
                      <line x1="210" y1="200" x2="390" y2="200" stroke="#ef4444" strokeWidth="3" strokeDasharray="10 15" />
                      <circle cx="230" cy="200" r="4" fill="#dc2626" />
                      <circle cx="270" cy="200" r="4" fill="#dc2626" />
                      <circle cx="330" cy="200" r="4" fill="#dc2626" />
                      <circle cx="370" cy="200" r="4" fill="#dc2626" />
                    </g>
                  )}

                  {/* Belt Pulley System */}
                  <g>
                    <rect x="420" y="150" width="12" height="125" rx="3" fill="#0f172a" stroke="#334155" />
                    <circle cx="426" cy="165" r="8" fill="#334155" className={eng.engineRunning ? "animate-spin origin-[426px_165px]" : ""} />
                    <circle cx="426" cy="200" r="10" fill="#334155" className={eng.engineRunning ? "animate-spin origin-[426px_200px]" : ""} />
                    <circle cx="426" cy="245" r="12" fill="#334155" className={eng.engineRunning ? "animate-spin origin-[426px_245px]" : ""} />
                    <line x1="426" y1="165" x2="426" y2="245" stroke="#020617" strokeWidth="4" />
                  </g>
                </g>

                {/* INTERACTIVE COMPONENT 1: OIL FILLER CAP (On Engine Block) */}
                <g className="cursor-pointer group/oil">
                  <circle cx="220" cy="250" r="20" fill={oilCapOpen ? "#f59e0b" : "#1e293b"} stroke="#f59e0b" strokeWidth="3" className={oilCapOpen ? "animate-pulse" : ""} />
                  <circle cx="220" cy="250" r="26" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" className="animate-spin origin-[220px_250px]" />
                  <rect x="208" y="247" width="24" height="6" rx="2" fill={oilCapOpen ? "#020617" : "#f59e0b"} />
                  <text x="220" y="285" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">
                    {oilCapOpen ? "Горловина [ОТКР]" : "Маслозаливная [ЗАКР]"}
                  </text>
                  {/* Large Touch Target */}
                  <rect 
                    x="180" y="215" width="80" height="75" 
                    fill="transparent" 
                    pointerEvents="all" 
                    className="cursor-pointer"
                    onClick={toggleOilCap}
                    onTouchEnd={(e) => { e.preventDefault(); toggleOilCap(); }}
                  />
                </g>

                {/* INTERACTIVE COMPONENT 2: OIL DIPSTICK (On Engine Block) */}
                <g className="cursor-pointer group/dip">
                  {/* Dipstick Tube */}
                  <path d="M380 250 L380 275" stroke="#eab308" strokeWidth="4" />
                  {/* Dipstick Yellow Ring Handle */}
                  <circle cx="380" cy="245" r="12" fill={dipstickPulled ? "#facc15" : "#854d0e"} stroke="#facc15" strokeWidth="3" className={dipstickPulled ? "animate-bounce" : ""} />
                  <circle cx="380" cy="245" r="18" fill="none" stroke="#facc15" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="380" cy="245" r="4" fill="#020617" />
                  <text x="380" y="285" fill="#facc15" fontSize="9" fontWeight="bold" textAnchor="middle">
                    {dipstickPulled ? "Щуп вынут 📏" : "Масляный щуп"}
                  </text>
                  {/* Large Touch Target */}
                  <rect 
                    x="345" y="215" width="70" height="75" 
                    fill="transparent" 
                    pointerEvents="all" 
                    className="cursor-pointer"
                    onClick={toggleDipstick}
                    onTouchEnd={(e) => { e.preventDefault(); toggleDipstick(); }}
                  />
                </g>

                {/* INTERACTIVE COMPONENT 3: RADIATOR CAP & COOLANT EXPANSION TANK */}
                <g className="cursor-pointer">
                  {/* Translucent Coolant Expansion Reservoir */}
                  <rect x="450" y="70" width="45" height="60" rx="8" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" opacity="0.9" />
                  {/* Fluid Level Fill in Tank */}
                  <rect 
                    x="453" 
                    y={125 - (radiatorWater / 100) * 50} 
                    width="39" 
                    height={(radiatorWater / 100) * 50} 
                    rx="4" 
                    fill="url(#coolantFluid)" 
                  />
                  <text x="472" y="105" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">COOLANT</text>
                  <text x="472" y="120" fill="#a5f3fc" fontSize="8" fontFamily="monospace" textAnchor="middle">{Math.round(radiatorWater)}%</text>

                  {/* Radiator Cap */}
                  <g className="cursor-pointer">
                    <circle cx="300" cy="45" r="18" fill={radiatorCapOpen ? "#22d3ee" : "#334155"} stroke="#06b6d4" strokeWidth="3" className={radiatorCapOpen ? "animate-pulse" : ""} />
                    <circle cx="300" cy="45" r="24" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 3" />
                    <polygon points="300,33 308,45 300,57 292,45" fill={radiatorCapOpen ? "#020617" : "#22d3ee"} />
                    <text x="300" y="22" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">
                      {radiatorCapOpen ? "Крышка [ОТКР] 🔓" : "Крышка радиатора 🔒"}
                    </text>
                    {/* Large Touch Target */}
                    <rect 
                      x="260" y="10" width="80" height="65" 
                      fill="transparent" 
                      pointerEvents="all" 
                      className="cursor-pointer"
                      onClick={toggleRadiatorCap}
                      onTouchEnd={(e) => { e.preventDefault(); toggleRadiatorCap(); }}
                    />
                  </g>
                </g>

                {/* INTERACTIVE COMPONENT 4: CAR BATTERY & TERMINAL CLAMPS */}
                <g className="transition-all">
                  {batteryInstalled ? (
                    <g>
                      {/* Battery Body Box */}
                      <rect x="450" y="240" width="95" height="70" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="3" />
                      <rect x="455" y="245" width="85" height="60" rx="4" fill="#020617" />
                      
                      {/* Battery Brand Label & Charge */}
                      <text x="492" y="275" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="1">VOLT 12V</text>
                      <text x="492" y="290" fill={batteryCharge > 20 ? "#10b981" : "#f43f5e"} fontSize="9" fontFamily="monospace" textAnchor="middle">
                        Заряд: {Math.round(batteryCharge)}%
                      </text>

                      {/* Battery Condition LED Eye */}
                      <circle cx="525" cy="255" r="3" fill={batteryCharge > 30 ? "#10b981" : "#ef4444"} filter="url(#glow)" />

                      {/* POSITIVE TERMINAL (+12V Red Clamp) */}
                      <g className="cursor-pointer">
                        <circle cx="465" cy="240" r="11" fill={batteryPosConnected ? "#ef4444" : "#450a0a"} stroke="#f87171" strokeWidth="2" />
                        <circle cx="465" cy="240" r="16" fill="none" stroke="#f87171" strokeWidth="1" strokeDasharray="2 2" />
                        <text x="465" y="244" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">+</text>
                        <text x="465" y="220" fill="#f87171" fontSize="8" fontWeight="bold" textAnchor="middle">
                          {batteryPosConnected ? "(+) Подкл" : "(+) Откл"}
                        </text>
                        <rect 
                          x="440" y="205" width="45" height="45" 
                          fill="transparent" 
                          pointerEvents="all" 
                          className="cursor-pointer"
                          onClick={togglePosTerminal}
                          onTouchEnd={(e) => { e.preventDefault(); togglePosTerminal(); }}
                        />
                      </g>

                      {/* NEGATIVE TERMINAL (- Ground Black Clamp) */}
                      <g className="cursor-pointer">
                        <circle cx="525" cy="240" r="11" fill={batteryNegConnected ? "#475569" : "#0f172a"} stroke="#94a3b8" strokeWidth="2" />
                        <circle cx="525" cy="240" r="16" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
                        <text x="525" y="243" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">-</text>
                        <text x="525" y="220" fill="#cbd5e1" fontSize="8" fontWeight="bold" textAnchor="middle">
                          {batteryNegConnected ? "(-) Подкл" : "(-) Откл"}
                        </text>
                        <rect 
                          x="500" y="205" width="45" height="45" 
                          fill="transparent" 
                          pointerEvents="all" 
                          className="cursor-pointer"
                          onClick={toggleNegTerminal}
                          onTouchEnd={(e) => { e.preventDefault(); toggleNegTerminal(); }}
                        />
                      </g>

                      {/* Dismount Battery Button Indicator */}
                      <g className="cursor-pointer">
                        <rect x="460" y="298" width="65" height="12" rx="3" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
                        <text x="492" y="306" fill="#fecdd3" fontSize="8" fontWeight="bold" textAnchor="middle">Снять АКБ 📥</text>
                        <rect 
                          x="445" y="260" width="105" height="55" 
                          fill="transparent" 
                          pointerEvents="all" 
                          className="cursor-pointer"
                          onClick={handleRemoveBattery}
                          onTouchEnd={(e) => { e.preventDefault(); handleRemoveBattery(); }}
                        />
                      </g>
                    </g>
                  ) : (
                    /* EMPTY BATTERY TRAY */
                    <g className="cursor-pointer group/tray">
                      <rect x="450" y="240" width="95" height="70" rx="8" fill="#020617" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" className="group-hover/tray:stroke-amber-400 transition-colors" />
                      <text x="497" y="270" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">ПУСТАЯ ПЛОЩАДКА</text>
                      <text x="497" y="285" fill="#94a3b8" fontSize="8" textAnchor="middle">Нажмите чтобы</text>
                      <text x="497" y="296" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">вставить АКБ из руки 🔋</text>
                      <rect 
                        x="445" y="235" width="105" height="80" 
                        fill="transparent" 
                        pointerEvents="all" 
                        className="cursor-pointer"
                        onClick={handleInstallBattery}
                        onTouchEnd={(e) => { e.preventDefault(); handleInstallBattery(); }}
                      />
                    </g>
                  )}
                </g>

                {/* FUSE & RELAY BOX (Near Battery) */}
                <g className="cursor-pointer" onClick={() => addNotification('⚡ Блок предохранителей: Все цепочки и реле 12V исправны', 'info')} onTouchEnd={(e) => { e.preventDefault(); addNotification('⚡ Блок предохранителей: Все цепочки и реле 12V исправны', 'info'); }}>
                  <rect x="450" y="170" width="50" height="40" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                  <rect x="455" y="175" width="40" height="30" rx="4" fill="#0f172a" />
                  <circle cx="465" cy="185" r="3" fill="#ef4444" />
                  <circle cx="475" cy="185" r="3" fill="#eab308" />
                  <circle cx="485" cy="185" r="3" fill="#10b981" />
                  <circle cx="465" cy="195" r="3" fill="#3b82f6" />
                  <circle cx="475" cy="195" r="3" fill="#ec4899" />
                  <text x="475" y="218" fill="#64748b" fontSize="7" textAnchor="middle">FUSES</text>
                  <rect x="445" y="165" width="60" height="50" fill="transparent" pointerEvents="all" />
                </g>

              </svg>

                {/* REAL HTML FLOATING INTERACTIVE BADGES (100% TOUCHABLE & CLICKABLE ON ALL MOBILE DEVICES) */}
                <div className="absolute inset-0 pointer-events-none z-30">
                  {/* Radiator Cap Badge */}
                  <button
                    type="button"
                    style={{ left: '50%', top: '11%' }}
                    onClick={(e) => { e.stopPropagation(); toggleRadiatorCap(); }}
                    onTouchStart={(e) => { e.stopPropagation(); }}
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleRadiatorCap(); }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-2 py-1 rounded-full border text-[10px] font-bold shadow-xl transition-all active:scale-90 flex items-center gap-1 cursor-pointer select-none ${
                      radiatorCapOpen
                        ? 'bg-cyan-500 text-slate-950 border-cyan-200 ring-2 ring-cyan-400 animate-pulse'
                        : 'bg-slate-900/90 text-cyan-300 border-cyan-500/70 hover:bg-cyan-950'
                    }`}
                  >
                    <span>🧪</span>
                    <span>{radiatorCapOpen ? 'Радиатор [ОТКР 🔓]' : 'Радиатор [ЗАКР 🔒]'}</span>
                  </button>

                  {/* Oil Cap Badge */}
                  <button
                    type="button"
                    style={{ left: '36.6%', top: '62.5%' }}
                    onClick={(e) => { e.stopPropagation(); toggleOilCap(); }}
                    onTouchStart={(e) => { e.stopPropagation(); }}
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleOilCap(); }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-2 py-1 rounded-full border text-[10px] font-bold shadow-xl transition-all active:scale-90 flex items-center gap-1 cursor-pointer select-none ${
                      oilCapOpen
                        ? 'bg-amber-500 text-slate-950 border-amber-200 ring-2 ring-amber-400 animate-pulse'
                        : 'bg-slate-900/90 text-amber-300 border-amber-500/70 hover:bg-amber-950'
                    }`}
                  >
                    <span>🛢️</span>
                    <span>{oilCapOpen ? 'Масло [ОТКР 🔓]' : 'Масло [ЗАКР 🔒]'}</span>
                  </button>

                  {/* Oil Dipstick Badge */}
                  <button
                    type="button"
                    style={{ left: '63.3%', top: '61.2%' }}
                    onClick={(e) => { e.stopPropagation(); toggleDipstick(); }}
                    onTouchStart={(e) => { e.stopPropagation(); }}
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleDipstick(); }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-2 py-1 rounded-full border text-[10px] font-bold shadow-xl transition-all active:scale-90 flex items-center gap-1 cursor-pointer select-none ${
                      dipstickPulled
                        ? 'bg-yellow-400 text-slate-950 border-yellow-100 ring-2 ring-yellow-300 animate-bounce'
                        : 'bg-slate-900/90 text-yellow-300 border-yellow-500/70 hover:bg-yellow-950'
                    }`}
                  >
                    <span>📏</span>
                    <span>{dipstickPulled ? 'Щуп [ВЫНУТ 📏]' : 'Щуп [ВСТАВЛЕН]'}</span>
                  </button>

                  {/* Positive Terminal (+) Badge */}
                  {batteryInstalled && (
                    <button
                      type="button"
                      style={{ left: '77.5%', top: '56%' }}
                      onClick={(e) => { e.stopPropagation(); togglePosTerminal(); }}
                      onTouchStart={(e) => { e.stopPropagation(); }}
                      onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); togglePosTerminal(); }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-1.5 py-0.5 rounded-full border text-[9px] font-bold shadow-md transition-all active:scale-90 flex items-center gap-0.5 cursor-pointer select-none ${
                        batteryPosConnected
                          ? 'bg-rose-600 text-white border-rose-300 ring-1 ring-rose-400'
                          : 'bg-slate-900/90 text-rose-300 border-rose-800'
                      }`}
                    >
                      <span>🔴</span>
                      <span>{batteryPosConnected ? '(+) Подкл' : '(+) Откл'}</span>
                    </button>
                  )}

                  {/* Negative Terminal (-) Badge */}
                  {batteryInstalled && (
                    <button
                      type="button"
                      style={{ left: '88%', top: '56%' }}
                      onClick={(e) => { e.stopPropagation(); toggleNegTerminal(); }}
                      onTouchStart={(e) => { e.stopPropagation(); }}
                      onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleNegTerminal(); }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-1.5 py-0.5 rounded-full border text-[9px] font-bold shadow-md transition-all active:scale-90 flex items-center gap-0.5 cursor-pointer select-none ${
                        batteryNegConnected
                          ? 'bg-slate-600 text-white border-slate-300 ring-1 ring-slate-400'
                          : 'bg-slate-900/90 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span>⚫</span>
                      <span>{batteryNegConnected ? '(-) Подкл' : '(-) Откл'}</span>
                    </button>
                  )}

                  {/* Battery Box / Tray Badge */}
                  <button
                    type="button"
                    style={{ left: '83%', top: '78%' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (batteryInstalled) handleRemoveBattery();
                      else handleInstallBattery();
                    }}
                    onTouchStart={(e) => { e.stopPropagation(); }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (batteryInstalled) handleRemoveBattery();
                      else handleInstallBattery();
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-2 py-1 rounded-xl border text-[10px] font-bold shadow-2xl transition-all active:scale-90 flex items-center gap-1 cursor-pointer select-none ${
                      batteryInstalled
                        ? 'bg-slate-900/95 text-emerald-300 border-emerald-500/80 hover:bg-emerald-950'
                        : 'bg-amber-500 text-slate-950 border-amber-200 animate-pulse font-black'
                    }`}
                  >
                    <span>🔋</span>
                    <span>{batteryInstalled ? 'Снять АКБ 📥' : 'Вставить АКБ 🔋'}</span>
                  </button>
                </div>

              </div>

            </div>

            {/* QUICK UNDER-HOOD ACTION BUTTONS BAR (100% Clickable everywhere) */}
            <div className="mt-2 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-1.5 z-10 shrink-0">
              {/* Oil Cap */}
              <button
                onClick={toggleOilCap}
                onTouchEnd={(e) => { e.preventDefault(); toggleOilCap(); }}
                className={`px-2 py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
                  oilCapOpen 
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm' 
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span className="truncate">🛢️ Пробка масла</span>
                <span className={oilCapOpen ? "text-amber-400 font-mono text-[9px]" : "text-slate-400 font-mono text-[9px]"}>
                  {oilCapOpen ? "[ОТКРЫТА 🔓]" : "[ЗАКРЫТА 🔒]"}
                </span>
              </button>

              {/* Oil Dipstick */}
              <button
                onClick={toggleDipstick}
                onTouchEnd={(e) => { e.preventDefault(); toggleDipstick(); }}
                className={`px-2 py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
                  dipstickPulled 
                    ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-sm' 
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span className="truncate">📏 Масляный щуп</span>
                <span className={dipstickPulled ? "text-yellow-400 font-mono text-[9px]" : "text-slate-400 font-mono text-[9px]"}>
                  {dipstickPulled ? "[ИЗВЛЕЧЁН 📏]" : "[ВСТАВЛЕН 🔒]"}
                </span>
              </button>

              {/* Radiator Cap */}
              <button
                onClick={toggleRadiatorCap}
                onTouchEnd={(e) => { e.preventDefault(); toggleRadiatorCap(); }}
                className={`px-2 py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
                  radiatorCapOpen 
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm' 
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span className="truncate">🧪 Радиатор</span>
                <span className={radiatorCapOpen ? "text-cyan-400 font-mono text-[9px]" : "text-slate-400 font-mono text-[9px]"}>
                  {radiatorCapOpen ? "[ОТКРЫТ 🔓]" : "[ЗАКРЫТ 🔒]"}
                </span>
              </button>

              {/* Positive Terminal (+) */}
              <button
                disabled={!batteryInstalled}
                onClick={togglePosTerminal}
                onTouchEnd={(e) => { e.preventDefault(); togglePosTerminal(); }}
                className={`px-2 py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
                  !batteryInstalled
                    ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                    : batteryPosConnected 
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-sm' 
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span className="truncate">🔴 Клемма (+)</span>
                <span className={batteryPosConnected ? "text-rose-400 font-mono text-[9px]" : "text-slate-400 font-mono text-[9px]"}>
                  {batteryPosConnected ? "[ПОДКЛ ⚡]" : "[ОТКЛ 🔌]"}
                </span>
              </button>

              {/* Negative Terminal (-) */}
              <button
                disabled={!batteryInstalled}
                onClick={toggleNegTerminal}
                onTouchEnd={(e) => { e.preventDefault(); toggleNegTerminal(); }}
                className={`px-2 py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
                  !batteryInstalled
                    ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                    : batteryNegConnected 
                    ? 'bg-slate-700 border-slate-400 text-slate-200 shadow-sm' 
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span className="truncate">⚫ Клемма (-)</span>
                <span className={batteryNegConnected ? "text-slate-200 font-mono text-[9px]" : "text-slate-400 font-mono text-[9px]"}>
                  {batteryNegConnected ? "[ПОДКЛ ⚡]" : "[ОТКЛ 🔌]"}
                </span>
              </button>

              {/* Battery Install/Remove */}
              <button
                onClick={() => {
                  if (batteryInstalled) handleRemoveBattery();
                  else handleInstallBattery();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (batteryInstalled) handleRemoveBattery();
                  else handleInstallBattery();
                }}
                className={`px-2 py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
                  batteryInstalled 
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                    : 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                }`}
              >
                <span className="truncate">🔋 АКБ</span>
                <span className="font-mono text-[9px]">
                  {batteryInstalled ? "[СНЯТЬ 📥]" : "[ВСТАВИТЬ 🔋]"}
                </span>
              </button>
            </div>

            {/* Dipstick Inspection View Bar when pulled */}
            {dipstickPulled && (
              <div className="mt-3 p-3 bg-yellow-950/40 border border-yellow-500/50 rounded-xl flex items-center justify-between animate-fadeIn shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl animate-bounce">📏</div>
                  <div>
                    <h4 className="text-xs font-bold text-yellow-400">Масляный щуп извлечён для осмотра</h4>
                    <p className="text-[11px] text-slate-300">
                      Уровень масла: <strong className="text-yellow-300">{Math.round(oilLevel)}% ({currentOilMl} / {MAX_OIL_ML} мл)</strong>
                    </p>
                  </div>
                </div>

                {/* Dipstick Blade Graphic */}
                <div className="relative w-52 h-7 bg-slate-950 border border-slate-700 rounded-full flex items-center px-3 overflow-hidden shadow-inner">
                  <div className="absolute text-[8px] font-mono font-bold text-slate-400 left-3 z-10">MIN</div>
                  <div className="absolute text-[8px] font-mono font-bold text-slate-400 right-3 z-10">MAX</div>
                  {/* Crosshatch Pattern */}
                  <div className="absolute inset-x-8 inset-y-1 bg-[repeating-linear-gradient(45deg,#334155,#334155_2px,transparent_2px,transparent_6px)] opacity-40"></div>
                  {/* Oil Film Level */}
                  <div
                    className="h-3 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400 rounded-full transition-all shadow-md"
                    style={{ width: `${Math.min(100, Math.max(0, oilLevel))}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Diagnostic & Service Controls Panel */}
          <div className="sm:col-span-5 lg:col-span-4 flex flex-col gap-2 sm:gap-3">
            
            {/* System Status Dashboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-lg">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2.5 flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5">📊 Параметры двигателя</span>
                <span className="text-[10px] text-slate-400 font-normal">Диагностика</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                {/* Engine Health */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Состояние ДВС:</span>
                    <span className="font-bold text-emerald-400">{Math.round(eng.engineHealth ?? 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${eng.engineHealth ?? 100}%` }}></div>
                  </div>
                </div>

                {/* Coolant Level */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400 flex items-center gap-1">🧪 Охлаждающая жидкость:</span>
                    <span className="font-bold text-cyan-400">{currentCoolantMl} / {MAX_COOLANT_ML} мл ({Math.round(radiatorWater)}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-cyan-400 h-full transition-all" style={{ width: `${radiatorWater}%` }}></div>
                  </div>
                </div>

                {/* Oil Level */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400 flex items-center gap-1">🛢️ Моторное масло:</span>
                    <span className="font-bold text-amber-400">{currentOilMl} / {MAX_OIL_ML} мл ({Math.round(oilLevel)}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${oilLevel}%` }}></div>
                  </div>
                </div>

                {/* Battery Level */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400 flex items-center gap-1">🔋 Заряд АКБ:</span>
                    <span className={batteryInstalled ? "font-bold text-amber-300" : "font-bold text-rose-400"}>
                      {batteryInstalled ? `${Math.round(batteryCharge)}%` : 'АКБ снят'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className={batteryCharge > 20 ? "bg-amber-400 h-full transition-all" : "bg-rose-500 h-full transition-all"} style={{ width: `${batteryInstalled ? batteryCharge : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Action: Coolant Refill */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <span>🧪</span> Заливка антифриза
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-cyan-500/30">
                  {radiatorCapOpen ? 'Крышка открыта' : 'Крышка закрыта'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 mb-2.5">
                Требуется открыть крышку радиатора и взять канистру с антифризом в руку.
              </p>

              <button
                onClick={handlePourCoolant}
                disabled={!radiatorCapOpen || !coolantInHand || missingCoolantMl <= 0}
                className={`w-full py-2 px-3 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 ${
                  radiatorCapOpen && coolantInHand && missingCoolantMl > 0
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <span>🧪</span>
                <span>
                  {!radiatorCapOpen
                    ? 'Сначала откройте крышку'
                    : !coolantInHand
                    ? 'Возьмите антифриз в руку'
                    : missingCoolantMl <= 0
                    ? 'Радиатор полон (100%)'
                    : `Залить антифриз (+${missingCoolantMl} мл)`}
                </span>
              </button>
            </div>

            {/* Service Action: Motor Oil Refill */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>🛢️</span> Заливка моторного масла
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-amber-300 border border-amber-500/30">
                  {oilCapOpen ? 'Горловина открыта' : 'Горловина закрыта'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 mb-2.5">
                Откройте маслозаливную пробку на двигателе и используйте моторное масло.
              </p>

              <button
                onClick={handlePourOil}
                disabled={!oilCapOpen || !oilInHand || missingOilMl <= 0}
                className={`w-full py-2 px-3 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 ${
                  oilCapOpen && oilInHand && missingOilMl > 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <span>🛢️</span>
                <span>
                  {!oilCapOpen
                    ? 'Сначала откройте пропку'
                    : !oilInHand
                    ? 'Возьмите масло в руку'
                    : missingOilMl <= 0
                    ? 'Масло заполнено (100%)'
                    : `Залить масло (+${missingOilMl} мл)`}
                </span>
              </button>
            </div>

            {/* Quick Mechanics Guide */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-amber-400/90 text-xs flex items-center gap-1 mb-1">
                <span>💡</span> Подсказка автомеханика:
              </div>
              <p>• Нажмите на <strong className="text-rose-400">(+)</strong> и <strong className="text-slate-300">(-)</strong> для обесточивания авто перед снятием АКБ.</p>
              <p>• Извлекайте <strong className="text-yellow-300">Масляный щуп</strong> для визуальной проверки уровня масла.</p>
              <p>• Езда без масла или антифриза приведет к перегреву и заклиниванию ДВС.</p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

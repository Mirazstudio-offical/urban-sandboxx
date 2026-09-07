import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  X,
  Fuel,
  CheckCircle2,
  AlertTriangle,
  Car,
  ChevronRight,
  Sparkles,
  Zap,
  Flame,
  Droplets,
  Coins,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { FuelType, GameWorld, GasPumpDispenser, Player, Vehicle } from '../types';
import { FUEL_GRADES, GAS_STATION_NOZZLES } from '../gasStationSystem';
import { CAR_CONFIGS } from '../vehicleHelpers';
import { sound } from '../audio';

interface GasStationCashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  world: GameWorld;
  player: Player;
  onPayAndFuel: (pumpId: string, liters: number, fuelType: FuelType, totalCost: number) => void;
}

export const GasStationCashierModal: React.FC<GasStationCashierModalProps> = ({
  isOpen,
  onClose,
  world,
  player,
  onPayAndFuel
}) => {
  const [selectedPumpId, setSelectedPumpId] = useState<string>('gas_pump_1');
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>('ai95');
  const [liters, setLiters] = useState<number>(30);
  const [paymentDone, setPaymentDone] = useState<boolean>(false);

  // Auto-detect a pump that has a nozzle currently inserted in a car
  useEffect(() => {
    if (!isOpen || !world.gasPumps) return;
    setPaymentDone(false);

    const insertedPump = world.gasPumps.find(p => p.status === 'inserted' && p.connectedVehicleId);
    if (insertedPump) {
      setSelectedPumpId(insertedPump.id);
      if (insertedPump.connectedFuelType) {
        setSelectedFuelType(insertedPump.connectedFuelType);
      }
      // If vehicle connected, calculate missing liters for convenience
      const veh = world.vehicles?.find(v => v.id === insertedPump.connectedVehicleId);
      if (veh && veh.fuelSystem) {
        const cap = veh.fuelSystem.tankCapacity || 55;
        const currentLiters = (veh.fuelSystem.tankLevel / 100) * cap;
        const missing = Math.max(5, Math.round(cap - currentLiters));
        setLiters(missing);
      }
    } else if (world.gasPumps.length > 0) {
      setSelectedPumpId(world.gasPumps[0].id);
    }
  }, [isOpen, world]);

  if (!isOpen || !world.gasPumps) return null;

  const currentPump = world.gasPumps.find(p => p.id === selectedPumpId) || world.gasPumps[0];
  const connectedVehicle = world.vehicles?.find(v => v.id === currentPump?.connectedVehicleId);
  const grade = FUEL_GRADES[selectedFuelType] || FUEL_GRADES.ai95;

  const totalCost = Math.round(liters * grade.pricePerLiter);

  // Player Cash: check inventory money or fallback
  const getPlayerCash = (): number => {
    let money = 5000;
    if (player.inventory) {
      const cashItem = player.inventory.find(i => i.id === 'money' || i.id === 'cash' || i.nameRu?.includes('Рубли') || i.nameRu?.includes('Деньги'));
      if (cashItem && typeof cashItem.count === 'number') {
        money = cashItem.count;
      }
    }
    return money;
  };

  const playerCash = getPlayerCash();
  const canAfford = playerCash >= totalCost;

  const handleSelectPump = (pump: GasPumpDispenser) => {
    setSelectedPumpId(pump.id);
    if (pump.connectedFuelType) {
      setSelectedFuelType(pump.connectedFuelType);
    }
    sound.playUseItem();
  };

  const handlePresetLiters = (amount: number) => {
    setLiters(amount);
    sound.playUseItem();
  };

  const handleFullTankPreset = () => {
    if (connectedVehicle && connectedVehicle.fuelSystem) {
      const cap = connectedVehicle.fuelSystem.tankCapacity || 55;
      const cur = (connectedVehicle.fuelSystem.tankLevel / 100) * cap;
      const missing = Math.max(1, Math.round(cap - cur));
      setLiters(missing);
    } else {
      setLiters(50);
    }
    sound.playUseItem();
  };

  const handleConfirmPayment = () => {
    if (!canAfford) return;
    sound.playBuySell();
    setPaymentDone(true);

    setTimeout(() => {
      onPayAndFuel(currentPump.id, liters, selectedFuelType, totalCost);
      onClose();
    }, 1200);
  };

  return (
    <div
      id="gas-station-cashier-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="gas-station-cashier-container"
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col animate-scale-up max-h-[92vh]"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  АЗС "Нефть-Магистраль 24/7"
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Кассовый POS-терминал
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Автоматизированная система управления топливораздаточными колонками
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Баланс:</span>
              <span className="font-bold text-amber-300">{playerCash.toLocaleString()} ₽</span>
            </div>
            <button
              id="btn-close-cashier-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payment Success Animation Overlay */}
        {paymentDone ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white">Оплата успешно принята!</h3>
            <p className="text-slate-300 text-sm max-w-md">
              Колонка №{currentPump.pumpNumber} активирована. Заправка {liters} л топлива{' '}
              <span className="font-bold text-emerald-400">{grade.nameRu}</span> началась.
            </p>
            <div className="text-xs text-slate-500">Чек печатается...</div>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
            {/* Left: Pump Selector (5 cols) */}
            <div className="lg:col-span-4 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  1. Выберите колонку
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">4 колонки онлайн</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {world.gasPumps.map((p) => {
                  const isSelected = p.id === selectedPumpId;
                  const veh = world.vehicles?.find(v => v.id === p.connectedVehicleId);

                  let statusBadge = (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      Свободна
                    </span>
                  );

                  if (p.isPumping) {
                    statusBadge = (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                        Заправка...
                      </span>
                    );
                  } else if (p.status === 'inserted') {
                    statusBadge = (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        В баке
                      </span>
                    );
                  } else if (p.status === 'nozzle_held') {
                    statusBadge = (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        В руках
                      </span>
                    );
                  }

                  return (
                    <div
                      key={p.id}
                      id={`pump-card-${p.number}`}
                      onClick={() => handleSelectPump(p)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Fuel className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span className="font-bold text-sm text-white">Колонка {p.pumpNumber}</span>
                        </div>
                      </div>

                      {statusBadge}

                      {veh && (
                        <div className="mt-2 pt-2 border-t border-slate-700/50 text-[11px] text-slate-300 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{CAR_CONFIGS[veh.type]?.name || veh.type}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status Note on Connected Vehicle */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-emerald-400" />
                  <span>
                    {connectedVehicle
                      ? `Подключен: ${CAR_CONFIGS[connectedVehicle.type]?.name || connectedVehicle.type}`
                      : 'Автомобиль у колонки не обнаружен'}
                  </span>
                </div>
                {connectedVehicle && connectedVehicle.fuelSystem && (
                  <div className="text-slate-400 text-[11px]">
                    Текущий бак: {Math.round(connectedVehicle.fuelSystem.tankLevel)}% (
                    {Math.round((connectedVehicle.fuelSystem.tankLevel / 100) * (connectedVehicle.fuelSystem.tankCapacity || 55))} /{' '}
                    {connectedVehicle.fuelSystem.tankCapacity || 55} л)
                  </div>
                )}
              </div>
            </div>

            {/* Center & Right: Fuel Grade & Liters Stepper (8 cols) */}
            <div className="lg:col-span-8 flex flex-col space-y-5">
              {/* 2. Fuel Grade Choice */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    2. Выберите марку топлива
                  </span>
                  <span className="text-xs text-slate-400">
                    Текущая цена: <strong className="text-emerald-400 font-bold">{grade.pricePerLiter.toFixed(2)} ₽/л</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {GAS_STATION_NOZZLES.map((noz) => {
                    const isSelected = selectedFuelType === noz.fuelType;
                    const fGrade = FUEL_GRADES[noz.fuelType];

                    return (
                      <button
                        key={noz.fuelType}
                        id={`btn-fuel-type-${noz.fuelType}`}
                        onClick={() => {
                          setSelectedFuelType(noz.fuelType);
                          sound.playUseItem();
                        }}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-800 border-white shadow-lg ring-2 ring-emerald-500/50'
                            : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs mb-2"
                          style={{
                            backgroundColor: `${fGrade.color}30`,
                            color: fGrade.color,
                            border: `1px solid ${fGrade.color}70`
                          }}
                        >
                          {noz.badgeText}
                        </div>
                        <div className="font-bold text-xs text-white leading-tight">{noz.badgeText}</div>
                        <div className="text-[11px] font-semibold text-emerald-400 mt-1">
                          {noz.pricePerLiter.toFixed(2)} ₽
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Liters Volume Stepper & Presets */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    3. Объем заправки (литры)
                  </span>
                  <span className="text-xs text-slate-300">
                    Выбрано: <strong className="text-xl font-black text-emerald-400">{liters}</strong> л
                  </span>
                </div>

                {/* Preset Quick Buttons */}
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {[10, 20, 30, 50].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handlePresetLiters(amt)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all ${
                        liters === amt
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                          : 'bg-slate-800/60 text-slate-200 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {amt} л
                    </button>
                  ))}
                  <button
                    onClick={handleFullTankPreset}
                    className="py-2 px-2 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Полный бак</span>
                  </button>
                </div>

                {/* Slider and Stepper Controls */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <button
                    onClick={() => setLiters(Math.max(1, liters - 1))}
                    className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-lg font-bold flex items-center justify-center text-slate-200"
                  >
                    -
                  </button>

                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={liters}
                    onChange={(e) => setLiters(parseInt(e.target.value) || 1)}
                    className="flex-1 accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />

                  <button
                    onClick={() => setLiters(Math.min(100, liters + 1))}
                    className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-lg font-bold flex items-center justify-center text-slate-200"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 4. Billing Summary & Action Button */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                <div>
                  <div className="text-xs text-slate-400">Итого к оплате на кассе:</div>
                  <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-2">
                    <span>{totalCost.toLocaleString()} ₽</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({liters} л × {grade.pricePerLiter.toFixed(2)} ₽)
                    </span>
                  </div>
                </div>

                <button
                  id="btn-pay-fuel-order"
                  disabled={!canAfford}
                  onClick={handleConfirmPayment}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl ${
                    canAfford
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 hover:scale-[1.02] cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>{canAfford ? 'Оплатить и заправить' : 'Недостаточно средств'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Качество гарантировано. При заправке двигатель авто должен быть заглушен.</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Закрыть [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};

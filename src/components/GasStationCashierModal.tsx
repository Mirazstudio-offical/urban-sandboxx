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
import { FuelType, GameWorld, GasPumpDispenser, GasPumpNozzle, Player, Vehicle } from '../types';
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
      const veh = world.vehicles?.find(v => v.id === insertedPump.connectedVehicleId);
      if (veh && veh.fuelSystem) {
        const cap = veh.fuelSystem.tankCapacity || 55;
        const currentLiters = (veh.fuelSystem.tankLevel / 100) * cap;
        const missing = Math.max(5, Math.round(cap - currentLiters));
        setLiters(missing);
      }
    } else if (world.gasPumps.length > 0) {
      setSelectedPumpId(world.gasPumps[0].id);
      if (world.gasPumps[0].connectedFuelType) {
        setSelectedFuelType(world.gasPumps[0].connectedFuelType);
      } else if (world.gasPumps[0].nozzles && world.gasPumps[0].nozzles.length > 0) {
        setSelectedFuelType(world.gasPumps[0].nozzles[0].fuelType);
      }
    }
  }, [isOpen, world]);

  if (!isOpen || !world.gasPumps) return null;

  const currentPump = world.gasPumps.find(p => p.id === selectedPumpId) || world.gasPumps[0];
  const connectedVehicle = world.vehicles?.find(v => v.id === currentPump?.connectedVehicleId);

  const availableNozzles: GasPumpNozzle[] = (currentPump?.nozzles && currentPump.nozzles.length > 0)
    ? currentPump.nozzles
    : (currentPump?.id === 'gas_pump_5_lpg'
        ? [
            {
              fuelType: 'lpg',
              nameRu: FUEL_GRADES.lpg.nameRu,
              color: FUEL_GRADES.lpg.color,
              octane: 105,
              pricePerLiter: FUEL_GRADES.lpg.pricePerLiter,
              description: FUEL_GRADES.lpg.description,
              badgeText: 'ГАЗ'
            }
          ]
        : GAS_STATION_NOZZLES);

  const isSelectedTypeValid = availableNozzles.some(n => n.fuelType === selectedFuelType);
  const activeFuelType = isSelectedTypeValid 
    ? selectedFuelType 
    : (currentPump?.connectedFuelType || availableNozzles[0]?.fuelType || 'ai95');

  const grade = FUEL_GRADES[activeFuelType] || FUEL_GRADES.ai95;
  const totalCost = Math.round(liters * grade.pricePerLiter);

  const getPlayerCash = (): number => {
    let money = 5000;
    if (player.inventory) {
      const cashItem = player.inventory.find(i => i && (i.id === 'money' || i.id === 'cash' || i.nameRu?.includes('Рубли') || i.nameRu?.includes('Деньги')));
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
    const pumpNozzles = pump.nozzles && pump.nozzles.length > 0 
      ? pump.nozzles 
      : (pump.id === 'gas_pump_5_lpg' ? [{ fuelType: 'lpg' }] : GAS_STATION_NOZZLES);

    if (pump.connectedFuelType && pumpNozzles.some(n => n.fuelType === pump.connectedFuelType)) {
      setSelectedFuelType(pump.connectedFuelType);
    } else if (!pumpNozzles.some(n => n.fuelType === selectedFuelType)) {
      setSelectedFuelType((pumpNozzles[0] as GasPumpNozzle).fuelType);
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
      onPayAndFuel(currentPump.id, liters, activeFuelType, totalCost);
      onClose();
    }, 1200);
  };

  return (
    <div
      id="gas-station-cashier-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="gas-station-cashier-container"
        className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[92vh] sm:max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700/50">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                  АЗС "Гранд-Ойл 24/7"
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Касса АЗС
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Управление заправочными колонками и выбор марки топлива
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-mono font-bold text-emerald-400">{playerCash.toLocaleString()} ₽</span>
            </div>
            <button
              id="btn-close-cashier-modal"
              onClick={onClose}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {paymentDone ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Оплата успешно принята!</h3>
            <p className="text-zinc-300 text-sm max-w-md">
              Колонка №{currentPump.pumpNumber} активирована. Заправка {liters} л топлива{' '}
              <span className="font-bold text-emerald-400">{grade.nameRu}</span> началась.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto">
            {/* Pump selector */}
            <div className="lg:col-span-4 flex flex-col space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                1. Колонка АЗС
              </span>

              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {world.gasPumps.map((p) => {
                  const isSelected = p.id === selectedPumpId;
                  const veh = world.vehicles?.find(v => v.id === p.connectedVehicleId);

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPump(p)}
                      className={`p-3 min-h-[50px] rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-600/10 border-emerald-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Fuel className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`} />
                          <span className="font-bold text-sm text-zinc-100">ТРК №{p.pumpNumber}</span>
                        </div>
                        {p.status === 'inserted' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            В баке
                          </span>
                        )}
                      </div>

                      {veh && (
                        <div className="mt-1 pt-1 border-t border-zinc-800/80 text-[11px] text-zinc-400 truncate">
                          {CAR_CONFIGS[veh.type]?.name || veh.type}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fuel & Amount selection */}
            <div className="lg:col-span-8 flex flex-col space-y-4">
              {/* Fuel grades */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  2. Марка топлива
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableNozzles.map((noz) => {
                    const isSelected = activeFuelType === noz.fuelType;
                    const fGrade = FUEL_GRADES[noz.fuelType] || FUEL_GRADES.ai95;

                    return (
                      <button
                        key={noz.fuelType}
                        onClick={() => {
                          setSelectedFuelType(noz.fuelType);
                          sound.playUseItem();
                        }}
                        className={`p-3 min-h-[56px] rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-zinc-900 border-emerald-500 text-white'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="font-bold text-xs text-zinc-100">{noz.nameRu || noz.badgeText}</div>
                        <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                          {noz.pricePerLiter.toFixed(2)} ₽/л
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Liters Stepper */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    3. Объем топлива
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {liters} литров
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 mb-3">
                  {[10, 20, 30, 50].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handlePresetLiters(amt)}
                      className={`py-2 min-h-[44px] rounded-xl text-xs font-bold border transition-all ${
                        liters === amt
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      {amt} л
                    </button>
                  ))}
                  <button
                    onClick={handleFullTankPreset}
                    className="py-2 min-h-[44px] rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                  >
                    Полный бак
                  </button>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <button
                    onClick={() => setLiters(Math.max(1, liters - 1))}
                    className="p-2 min-h-[44px] min-w-[44px] rounded-lg bg-zinc-800 text-zinc-100 hover:bg-zinc-700 font-bold"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={liters}
                    onChange={(e) => setLiters(parseInt(e.target.value) || 1)}
                    className="flex-1 accent-emerald-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => setLiters(Math.min(100, liters + 1))}
                    className="p-2 min-h-[44px] min-w-[44px] rounded-lg bg-zinc-800 text-zinc-100 hover:bg-zinc-700 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total & Pay Button */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto">
                <div>
                  <span className="text-xs text-zinc-400 block">К оплате на кассе:</span>
                  <span className="text-2xl font-mono font-bold text-emerald-400">
                    {totalCost.toLocaleString()} ₽
                  </span>
                </div>

                <button
                  disabled={!canAfford}
                  onClick={handleConfirmPayment}
                  className={`w-full sm:w-auto px-6 py-3 min-h-[48px] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    canAfford
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                      : 'bg-zinc-800 text-zinc-500 opacity-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  {canAfford ? 'Оплатить заправку' : 'Недостаточно денег'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

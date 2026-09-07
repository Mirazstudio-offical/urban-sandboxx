import React, { useEffect } from 'react';
import { Fuel, X, Zap, Flame, Droplets, Check, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { FuelType, GasPumpDispenser } from '../types';
import { FUEL_GRADES, GAS_STATION_NOZZLES } from '../gasStationSystem';
import { sound } from '../audio';

interface FuelNozzleSelectorModalProps {
  pump: GasPumpDispenser | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectNozzle: (fuelType: FuelType) => void;
}

export const FuelNozzleSelectorModal: React.FC<FuelNozzleSelectorModalProps> = ({
  pump,
  isOpen,
  onClose,
  onSelectNozzle
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !pump) return;
      if (e.key === 'Escape') {
        onClose();
      } else {
        const keyVal = parseInt(e.key);
        if (!isNaN(keyVal) && keyVal >= 1 && keyVal <= pump.nozzles.length) {
          const selectedNozzle = pump.nozzles[keyVal - 1];
          handleSelect(selectedNozzle.fuelType);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pump]);

  if (!isOpen || !pump) return null;

  const handleSelect = (fuelType: FuelType) => {
    sound.playUseItem();
    onSelectNozzle(fuelType);
  };

  const getFuelIcon = (fuelType: FuelType) => {
    switch (fuelType) {
      case 'ai100':
        return <Flame className="w-6 h-6 text-red-400 animate-pulse" />;
      case 'ai98':
        return <Flame className="w-6 h-6 text-orange-400" />;
      case 'ai95':
        return <Sparkles className="w-6 h-6 text-emerald-400" />;
      case 'ai92':
        return <Fuel className="w-6 h-6 text-amber-400" />;
      case 'diesel':
        return <Droplets className="w-6 h-6 text-slate-300" />;
      case 'lpg':
        return <Zap className="w-6 h-6 text-cyan-400" />;
      default:
        return <Fuel className="w-6 h-6 text-white" />;
    }
  };

  return (
    <div
      id="fuel-nozzle-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="fuel-nozzle-modal-container"
        className="w-full max-w-4xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Топливораздаточная колонка №{pump.pumpNumber}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  АЗС 24/7
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Выберите топливный пистолет нужного октана и типа топлива
              </p>
            </div>
          </div>

          <button
            id="btn-close-nozzle-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Guidance Banner */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              После снятия пистолета подойдите к лючку бензобака вашего автомобиля и нажмите <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono">E</kbd>
            </span>
          </div>
          <span className="text-slate-500 hidden sm:inline">
            Горячие клавиши: {pump.nozzles.map((_, i) => `[${i + 1}]`).join(' - ')}
          </span>
        </div>

        {/* Dynamic Fuel Grades Grid */}
        <div className={`p-6 grid gap-4 grid-cols-1 ${pump.nozzles.length === 1 ? 'md:grid-cols-1 max-w-xs mx-auto' : 'md:grid-cols-5'}`}>
          {pump.nozzles.map((nozzle, idx) => {
            const grade = FUEL_GRADES[nozzle.fuelType];
            const isSelected = pump.nozzleTaken === nozzle.fuelType;

            return (
              <div
                key={nozzle.fuelType}
                id={`fuel-card-${nozzle.fuelType}`}
                onClick={() => handleSelect(nozzle.fuelType)}
                className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-500 hover:scale-[1.02] hover:shadow-lg ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 shadow-amber-500/20'
                    : 'border-slate-800'
                }`}
                style={{
                  boxShadow: isSelected ? `0 0 20px ${grade.accentGlow}` : undefined
                }}
              >
                {/* Hotkey Tag */}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-slate-400">
                  {idx + 1}
                </div>

                {/* Top Section: Octane & Icon */}
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-inner"
                      style={{
                        backgroundColor: `${grade.color}25`,
                        color: grade.color,
                        border: `1.5px solid ${grade.color}60`
                      }}
                    >
                      {nozzle.badgeText}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white leading-tight">
                        {grade.nameRu}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {grade.octane} {nozzle.fuelType === 'diesel' ? 'Цетан' : 'Октан'}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed min-h-[48px] mb-3">
                    {grade.description}
                  </p>
                </div>

                {/* Bottom Section: Price & Button */}
                <div className="pt-3 border-t border-slate-700/60 mt-auto">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-xs text-slate-400">Цена за 1 л:</span>
                    <span className="text-lg font-black text-emerald-400">
                      {grade.pricePerLiter.toFixed(2)} ₽
                    </span>
                  </div>

                  <button
                    id={`btn-take-nozzle-${nozzle.fuelType}`}
                    className="w-full py-2 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
                    style={{
                      backgroundColor: grade.color,
                      color: nozzle.fuelType === 'ai92' ? '#000000' : '#ffffff'
                    }}
                  >
                    <Fuel className="w-4 h-4" />
                    <span>Снять пистолет</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Качество топлива сертифицировано по стандарту Евро-5 / ГОСТ 32513.</span>
          </div>
          <button
            id="btn-cancel-nozzle"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium"
          >
            Отмена [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};

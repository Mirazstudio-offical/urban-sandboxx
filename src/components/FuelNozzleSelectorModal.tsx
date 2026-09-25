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

  return (
    <div
      id="fuel-nozzle-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="fuel-nozzle-modal-container"
        className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[92vh] sm:max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700/50">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                  Топливная колонка №{pump.pumpNumber}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Выбор пистолета
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Выберите заправочный пистолет с нужной маркой топлива
              </p>
            </div>
          </div>

          <button
            id="btn-close-nozzle-modal"
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guidance Banner */}
        <div className="px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Снимите пистолет, затем подойдите к баку авто и нажмите клавишу <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-amber-400 font-mono">E</kbd>
            </span>
          </div>
        </div>

        {/* Fuel Grades Grid */}
        <div className={`p-4 sm:p-6 grid gap-3 grid-cols-1 overflow-y-auto ${pump.nozzles.length === 1 ? 'max-w-sm mx-auto w-full' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {pump.nozzles.map((nozzle, idx) => {
            const grade = FUEL_GRADES[nozzle.fuelType];
            const isSelected = pump.nozzleTaken === nozzle.fuelType;

            return (
              <div
                key={nozzle.fuelType}
                id={`fuel-card-${nozzle.fuelType}`}
                onClick={() => handleSelect(nozzle.fuelType)}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all cursor-pointer bg-zinc-900 hover:bg-zinc-800/80 hover:border-zinc-700 ${
                  isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: `${grade.color}25`,
                        color: grade.color,
                        border: `1px solid ${grade.color}60`
                      }}
                    >
                      {nozzle.badgeText}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-zinc-100">{grade.nameRu}</div>
                      <div className="text-[11px] text-zinc-400">
                        {grade.octane} {nozzle.fuelType === 'diesel' ? 'Цетан' : 'Октан'}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 min-h-[36px] mb-3">{grade.description}</p>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 mt-auto flex items-center justify-between">
                  <div className="text-sm font-mono font-bold text-emerald-400">
                    {grade.pricePerLiter.toFixed(2)} ₽/л
                  </div>

                  <button
                    className="px-4 py-2 min-h-[44px] rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Fuel className="w-4 h-4" />
                    <span>Снять пистолет</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

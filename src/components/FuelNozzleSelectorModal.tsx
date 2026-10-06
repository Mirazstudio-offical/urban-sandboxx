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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#0b0c0e]/85 backdrop-blur-md animate-fadeIn font-mono"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="fuel-nozzle-modal-container"
        className="w-full max-w-4xl bg-[#14161a] border border-[#2a2e38] rounded-[2px] shadow-2xl overflow-hidden text-[#f0f3f6] flex flex-col max-h-[92vh] sm:max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0b0c0e] border-b border-[#2a2e38]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[#1c1f26] text-[#c68a35] border border-[#2a2e38]">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#f0f3f6] uppercase tracking-wider">
                  Топливная колонка №{pump.pumpNumber}
                </h2>
                <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold bg-[#c68a35]/15 text-[#c68a35] border border-[#c68a35]/40 uppercase">
                  Выбор пистолета
                </span>
              </div>
              <p className="text-xs text-[#9ba3af] hidden sm:block">
                Выберите заправочный пистолет с нужной маркой топлива
              </p>
            </div>
          </div>

          <button
            id="btn-close-nozzle-modal"
            onClick={onClose}
            className="p-2 rounded-[2px] bg-[#14161a] hover:bg-[#1c1f26] border border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guidance Banner */}
        <div className="px-4 py-2.5 bg-[#0b0c0e]/60 border-b border-[#2a2e38] flex items-center justify-between text-xs text-[#cbd5e1]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#c68a35] shrink-0" />
            <span>
              Снимите пистолет, затем подойдите к баку авто и нажмите клавишу <kbd className="px-1.5 py-0.5 bg-[#14161a] border border-[#2a2e38] rounded-[2px] text-[#c68a35] font-mono font-bold">E</kbd>
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
                className={`flex flex-col justify-between p-4 rounded-[2px] border transition-all cursor-pointer bg-[#0b0c0e] hover:bg-[#1c1f26] hover:border-[#c68a35]/50 ${
                  isSelected ? 'border-[#c68a35] bg-[#c68a35]/10' : 'border-[#2a2e38]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-[2px] flex items-center justify-center font-bold text-sm bg-[#14161a] text-[#c68a35] border border-[#c68a35]/40"
                    >
                      {nozzle.badgeText}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#f0f3f6]">{grade.nameRu}</div>
                      <div className="text-[11px] text-[#9ba3af]">
                        {grade.octane} {nozzle.fuelType === 'diesel' ? 'Цетан' : 'Октан'}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#9ba3af] min-h-[36px] mb-3">{grade.description}</p>
                </div>

                <div className="pt-3 border-t border-[#2a2e38] mt-auto flex items-center justify-between">
                  <div className="text-sm font-mono font-bold text-[#c68a35]">
                    {grade.pricePerLiter.toFixed(2)} ₽/л
                  </div>

                  <button
                    className="px-3.5 py-1.5 rounded-[2px] font-bold text-xs bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] flex items-center gap-1.5 transition-colors cursor-pointer"
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

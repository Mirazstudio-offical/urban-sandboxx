import React, { useEffect, useState } from 'react';
import {
  Anchor,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  X,
  Compass,
  Power,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { GameWorld, Player, Vehicle } from '../types';
import { sound } from '../audio';
import { isVehicleCraneTruck, getVehicleCraneGeometry } from '../truckChassisVariants';

interface CraneOutriggersModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  player: Player | null;
  world: GameWorld | null;
  onForceUpdate?: () => void;
}

export const CraneOutriggersModal: React.FC<CraneOutriggersModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  player,
  world,
  onForceUpdate,
}) => {
  // Local state for smooth animation display
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !vehicle || !isVehicleCraneTruck(vehicle)) return null;

  const isEngineRunning = vehicle.engineState ? vehicle.engineState.engineRunning : true;
  const isPtoActive = vehicle.isPtoActive !== false;
  const hasHydraulicPressure = isEngineRunning && isPtoActive;

  const ext = vehicle.craneOutriggerExt ?? (vehicle.craneOutriggersDeployed ? 1.0 : 0.0);
  const isDeployed = ext >= 0.85;
  const isPartiallyDeployed = ext > 0.05 && ext < 0.85;

  // Spirit level offset: when fully deployed, bubble is dead-center (0, 0)
  // When retracted, slight ground tilt offset
  const bubbleOffsetX = isDeployed ? 0 : Math.sin(vehicle.angle) * 14;
  const bubbleOffsetY = isDeployed ? 0 : Math.cos(vehicle.angle) * 12;

  const handleToggleOutriggers = (targetState: boolean) => {
    if (!hasHydraulicPressure && targetState) {
      sound.playAlert();
      return;
    }
    sound.playButtonPress();
    sound.playHydraulicHiss(0.45);
    vehicle.craneOutriggersDeployed = targetState;
    setIsDeploying(true);
    setTimeout(() => {
      sound.playOutriggerLock();
      setIsDeploying(false);
      onForceUpdate?.();
    }, 1200);
    onForceUpdate?.();
  };

  const handleTogglePto = () => {
    sound.playButtonPress();
    vehicle.isPtoActive = !vehicle.isPtoActive;
    if (vehicle.isPtoActive) {
      sound.playHydraulicHiss(0.3);
    }
    onForceUpdate?.();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0b0c0e]/80 backdrop-blur-sm select-none p-4 font-mono pointer-events-auto"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[560px] bg-[#121418] border-2 border-[#2a2e38] rounded-[2px] p-4 sm:p-5 shadow-2xl text-[#f0f3f6]"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Top Warning Stripes Banner (GOST) */}
        <div className="h-2 w-full rounded-t-[1px] mb-3 bg-[repeating-linear-gradient(45deg,#eab308,#eab308_10px,#0f172a_10px,#0f172a_20px)] border-b border-[#0f172a]" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#262a33]">
          <div className="flex items-center gap-2">
            <Anchor className="w-4 h-4 text-[#eab308]" />
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-[#f0f3f6]">
                НАРУЖНЫЙ ПУЛЬТ ВЫНОСНЫХ ОПОР
              </h2>
              <div className="text-[9px] text-[#9ba3af]">
                ГИДРОРАСПРЕДЕЛИТЕЛЬ ШАССИ АВТОКРАНА КС-3577
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[2px] bg-[#1a1d24] hover:bg-[#232732] border border-[#2a2e38] text-[#9ba3af] hover:text-white transition-colors cursor-pointer"
            title="Закрыть пульт [Esc / E]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hydraulic Pressure Alert Bar if PTO is OFF */}
        {!hasHydraulicPressure && (
          <div className="mb-3 p-2 rounded-[2px] bg-amber-950/40 border border-amber-600/50 flex items-center justify-between gap-2 text-[9.5px]">
            <div className="flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>НЕТ ДАВЛЕНИЯ В ГИДРОСИСТЕМЕ! ВКЛЮЧИТЕ КОМ (ОТБОР МОЩНОСТИ)</span>
            </div>
            <button
              type="button"
              onClick={handleTogglePto}
              className="px-2 py-1 rounded-[2px] bg-amber-600 hover:bg-amber-500 text-black font-black text-[9px] uppercase tracking-wider shrink-0 cursor-pointer"
            >
              ВКЛЮЧИТЬ КОМ
            </button>
          </div>
        )}

        {/* Instruments: Circular Spirit Level + Pressure Manometer */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* 1. Circular Bubble Spirit Level (Креномер) */}
          <div className="bg-[#0a0b0e] border border-[#262a33] rounded-[2px] p-3 flex flex-col items-center justify-center">
            <div className="flex items-center justify-between w-full mb-1.5 text-[8.5px] text-[#9ba3af]">
              <span className="flex items-center gap-1 font-bold">
                <Compass className="w-3 h-3 text-[#eab308]" />
                КРЕНОМЕР ШАССИ
              </span>
              <span className={isDeployed ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {isDeployed ? 'ГОРИЗОНТ 0.0°' : 'КРЕН 2.4°'}
              </span>
            </div>

            {/* Bullseye graphic */}
            <div className="relative w-28 h-28 rounded-full border-2 border-[#333a46] bg-[#141820] flex items-center justify-center shadow-inner overflow-hidden">
              {/* Outer crosshairs */}
              <div className="absolute w-full h-[1px] bg-[#2a323d]" />
              <div className="absolute h-full w-[1px] bg-[#2a323d]" />
              {/* 3° outer ring */}
              <div className="absolute w-20 h-20 rounded-full border border-dashed border-[#3d4654]" />
              {/* 1.5° inner limit ring */}
              <div className="absolute w-12 h-12 rounded-full border border-[#475569]" />
              {/* Center bullseye green zone */}
              <div className="absolute w-6 h-6 rounded-full border-2 border-emerald-500/80 bg-emerald-500/10" />

              {/* Liquid spirit bubble with physics reflection */}
              <div
                className="absolute w-4 h-4 rounded-full bg-emerald-400/90 shadow-[0_0_8px_#34d399] border border-emerald-200 transition-all duration-300"
                style={{
                  transform: `translate(${bubbleOffsetX}px, ${bubbleOffsetY}px)`,
                }}
              />
            </div>

            <span className="text-[8px] text-[#6b7280] mt-2 text-center">
              {isDeployed
                ? 'Шасси вывешено на подпятники по ГОСТ'
                : 'Опоры не выставлены: опасность опрокидывания'}
            </span>
          </div>

          {/* 2. Hydraulic Manometer & System Status */}
          <div className="bg-[#0a0b0e] border border-[#262a33] rounded-[2px] p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[8.5px] text-[#9ba3af] mb-1.5">
                <span className="flex items-center gap-1 font-bold">
                  <Gauge className="w-3 h-3 text-[#eab308]" />
                  МАНОМЕТР ГИДРОСИСТЕМЫ
                </span>
                <span className={`font-bold ${hasHydraulicPressure ? 'text-emerald-400' : 'text-red-400'}`}>
                  {hasHydraulicPressure ? '16.0 МПа' : '0.0 МПа'}
                </span>
              </div>

              {/* Manometer Dial Visual */}
              <div className="relative w-full h-16 bg-[#141820] border border-[#2a2e38] rounded-[2px] p-2 flex flex-col justify-between overflow-hidden">
                <div className="flex justify-between text-[7px] text-[#6b7280]">
                  <span>0</span>
                  <span>5</span>
                  <span>10</span>
                  <span className="text-emerald-400 font-bold">16 (НОРМА)</span>
                  <span>20</span>
                  <span className="text-red-400">25 МПа</span>
                </div>
                {/* Gauge bar */}
                <div className="w-full h-2.5 bg-[#0b0c0e] rounded-[1px] border border-[#2a2e38] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      hasHydraulicPressure ? 'bg-emerald-500' : 'bg-red-500/50'
                    }`}
                    style={{ width: hasHydraulicPressure ? '64%' : '2%' }}
                  />
                </div>
                <div className="flex items-center justify-between text-[7.5px]">
                  <span className="text-[#9ba3af]">НАСОС ШАССИ (КОМ):</span>
                  <span className={isPtoActive ? 'text-emerald-400 font-bold' : 'text-[#6b7280]'}>
                    {isPtoActive ? 'ПОДКЛЮЧЕН К ДВС' : 'ОТКЛЮЧЕН'}
                  </span>
                </div>
              </div>
            </div>

            {/* Outrigger Extension Progress */}
            <div className="mt-2 pt-2 border-t border-[#1e232d]">
              <div className="flex items-center justify-between text-[8px] mb-1">
                <span className="text-[#9ba3af]">ВЫДВИЖЕНИЕ БАЛОК ОПОР:</span>
                <span className="font-bold tabular-nums text-[#eab308]">
                  {Math.round(ext * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#141820] rounded-[1px] border border-[#2a2e38] overflow-hidden">
                <div
                  className="h-full bg-[#eab308] transition-all duration-200"
                  style={{ width: `${Math.round(ext * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4 Outrigger Legs Schematic & Jack Status */}
        <div className="mb-3 bg-[#0a0b0e] border border-[#262a33] rounded-[2px] p-2.5">
          <div className="text-[8px] text-[#9ba3af] font-bold uppercase tracking-wider mb-2">
            СХЕМА ВЫНОСНЫХ ОПОР ШАССИ (4 ТОЧКИ ОПИРАНИЯ)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[8.5px]">
            <div className="p-1.5 rounded-[2px] bg-[#121418] border border-[#20242d] flex items-center justify-between">
              <span className="text-[#9ba3af]">1. ПЕРЕДНЯЯ ЛЕВАЯ</span>
              <span className={isDeployed ? 'text-emerald-400 font-black' : 'text-[#6b7280]'}>
                {isDeployed ? 'ЗАМКНУТА' : 'СЛОЖЕНА'}
              </span>
            </div>
            <div className="p-1.5 rounded-[2px] bg-[#121418] border border-[#20242d] flex items-center justify-between">
              <span className="text-[#9ba3af]">2. ПЕРЕДНЯЯ ПРАВАЯ</span>
              <span className={isDeployed ? 'text-emerald-400 font-black' : 'text-[#6b7280]'}>
                {isDeployed ? 'ЗАМКНУТА' : 'СЛОЖЕНА'}
              </span>
            </div>
            <div className="p-1.5 rounded-[2px] bg-[#121418] border border-[#20242d] flex items-center justify-between">
              <span className="text-[#9ba3af]">3. ЗАДНЯЯ ЛЕВАЯ</span>
              <span className={isDeployed ? 'text-emerald-400 font-black' : 'text-[#6b7280]'}>
                {isDeployed ? 'ЗАМКНУТА' : 'СЛОЖЕНА'}
              </span>
            </div>
            <div className="p-1.5 rounded-[2px] bg-[#121418] border border-[#20242d] flex items-center justify-between">
              <span className="text-[#9ba3af]">4. ЗАДНЯЯ ПРАВАЯ</span>
              <span className={isDeployed ? 'text-emerald-400 font-black' : 'text-[#6b7280]'}>
                {isDeployed ? 'ЗАМКНУТА' : 'СЛОЖЕНА'}
              </span>
            </div>
          </div>
        </div>

        {/* Master Control Levers / Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => handleToggleOutriggers(true)}
            disabled={isDeploying || isDeployed}
            className={`py-2.5 px-3 rounded-[2px] border text-[9.5px] font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isDeployed
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 cursor-default'
                : 'bg-[#eab308] hover:bg-[#ca8a04] text-black border-[#ca8a04] active:scale-[0.99]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              {isDeployed
                ? 'ОПОРЫ ВЫСТАВЛЕНЫ (ГОСТ)'
                : isDeploying
                ? 'ГИДРОЦИЛИНДРЫ ВЫХОДЯТ...'
                : 'ВЫСТАВИТЬ ОПОРЫ ПО ГОСТ'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleOutriggers(false)}
            disabled={isDeploying || ext === 0}
            className={`py-2.5 px-3 rounded-[2px] border text-[9.5px] font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
              ext === 0
                ? 'bg-[#181a20] text-[#6b7280] border-[#2a2e38] cursor-default'
                : 'bg-[#1e232d] hover:bg-[#282e3b] text-[#cbd5e1] border-[#384152] active:scale-[0.99]'
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>УБРАТЬ В ТРАНСПОРТНОЕ</span>
          </button>
        </div>

        {/* Regulatory Crane Interlock Notice */}
        <div className="p-2 rounded-[2px] bg-[#0a0b0e] border border-[#20242d] text-[8px] text-[#6b7280] leading-relaxed">
          <strong className="text-[#9ba3af]">ПБ 10-382-00 и ГОСТ 27584-88:</strong> При невыставленных
          опорах поворотная платформа и стреловое оборудование в кабине крановщика КС-3577
          электронно заблокированы прибором безопасности ОНК-140.
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Anchor,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Droplet,
  Gauge,
  Link2,
  Minimize2,
  Maximize2,
  Power,
  RotateCcw,
  RotateCw,
  Sliders,
} from 'lucide-react';
import { GameWorld, InputState, Player, Vehicle } from '../types';
import {
  getVehicleCraneGeometry,
  isVehicleCraneTruck,
  isVehicleVacuumTruck,
  resolveVehicleTruckFrameAndBody,
} from '../truckChassisVariants';
import { toggleCraneHookAttach } from '../physics';
import { sound } from '../audio';

interface TruckSuperstructureHUDProps {
  player: Player | null;
  world: GameWorld | null;
  inputRef: React.MutableRefObject<InputState>;
  isMobileTouch?: boolean;
  onForceUpdate?: () => void;
}

interface HoldButtonProps {
  inputKey: keyof InputState;
  inputRef: React.MutableRefObject<InputState>;
  className?: string;
  activeClassName?: string;
  title?: string;
  children: React.ReactNode;
}

const HoldActionButton: React.FC<HoldButtonProps> = ({
  inputKey,
  inputRef,
  className = '',
  activeClassName = 'bg-[#c68a35] text-[#0b0c0e] border-[#d99a41]',
  title,
  children,
}) => {
  const [pressed, setPressed] = useState(false);

  const setInputState = (val: boolean) => {
    (inputRef.current as unknown as Record<string, boolean>)[inputKey] = val;
    setPressed(val);
  };

  return (
    <button
      type="button"
      title={title}
      onTouchStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setInputState(true);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setInputState(false);
      }}
      onTouchCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setInputState(false);
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        setInputState(true);
      }}
      onMouseUp={(e) => {
        e.preventDefault();
        setInputState(false);
      }}
      onMouseLeave={() => {
        if (pressed) setInputState(false);
      }}
      className={`select-none touch-none transition-colors cursor-pointer ${className} ${
        pressed ? activeClassName : 'bg-[#1c1f26] hover:bg-[#232730] text-[#e2e8f0] border-[#2a2e38]'
      }`}
    >
      {children}
    </button>
  );
};

export const TruckSuperstructureHUD: React.FC<TruckSuperstructureHUDProps> = ({
  player,
  world,
  inputRef,
  isMobileTouch = false,
  onForceUpdate,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!player || !world) return null;

  // Determine active vehicle: either the vehicle the player is driving, or the vacuum truck connected to the held hose
  let activeVehicle: Vehicle | null = null;
  if (player.isInVehicle && player.currentVehicleId) {
    activeVehicle = world.vehicles.find((v) => v.id === player.currentVehicleId) || null;
  } else if (player.heldWaterHose) {
    activeVehicle = world.vehicles.find((v) => v.id === player.heldWaterHose?.vehicleId) || null;
  }

  if (!activeVehicle) return null;

  const isCrane = player.isInVehicle && isVehicleCraneTruck(activeVehicle);
  const isVacuum = isVehicleVacuumTruck(activeVehicle);

  if (!isCrane && !isVacuum) return null;

  const resolvedTruck = resolveVehicleTruckFrameAndBody(activeVehicle);
  const bodyTitle = resolvedTruck?.body.modelCode || resolvedTruck?.body.nameRu || 'Спецнадстройка';

  if (collapsed) {
    return (
      <div
        className={`fixed z-30 pointer-events-auto font-mono select-none ${
          isMobileTouch ? 'top-13 right-3' : 'bottom-4 left-4'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            sound.playButtonPress();
            setCollapsed(false);
          }}
          className="px-3 py-1.5 rounded-[2px] bg-[#14161a]/95 border border-[#2a2e38] hover:border-[#c68a35] text-[#f0f3f6] text-[10px] font-bold flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#c68a35]" />
          <span>ПУЛЬТ: {bodyTitle.toUpperCase()}</span>
          <Maximize2 className="w-3 h-3 text-[#9ba3af]" />
        </button>
      </div>
    );
  }

  if (isCrane) {
    const geom = getVehicleCraneGeometry(activeVehicle);
    const deg = Math.round((geom.turretAngle * 180) / Math.PI);
    const outriggerPct = Math.round((geom.outriggerExt ?? 0) * 100);
    const hookedVeh = activeVehicle.craneHookedVehicleId
      ? world.vehicles.find((v) => v.id === activeVehicle!.craneHookedVehicleId)
      : null;

    return (
      <div
        className={`fixed z-30 pointer-events-auto font-mono select-none ${
          isMobileTouch
            ? 'top-12 left-1/2 -translate-x-1/2 w-[330px]'
            : 'bottom-4 left-4 w-[356px]'
        } bg-[#14161a]/95 border border-[#2a2e38] rounded-[2px] p-2.5 shadow-2xl text-[#f0f3f6]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#2a2e38]">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#c68a35]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#f0f3f6]">
              АВТОКРАН КС-3577 «ИВАНОВЕЦ»
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#c68a35] font-bold tabular-nums">
              MAX {geom.maxLoadTons.toFixed(1)} Т
            </span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-0.5 text-[#9ba3af] hover:text-white cursor-pointer"
              title="Свернуть пульт"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Telemetry Readout */}
        <div className="grid grid-cols-3 gap-1.5 mb-2 bg-[#0b0c0e] p-1.5 rounded-[2px] border border-[#2a2e38] text-[9px] tabular-nums">
          <div className="flex flex-col">
            <span className="text-[#6b7280] text-[7.5px]">ВЫЛЕТ СТРЕЛЫ</span>
            <span className="font-black text-[#f0f3f6]">{geom.boomLengthMeters.toFixed(1)} / 21.7 м</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#6b7280] text-[7.5px]">ПОВОРОТ БАШНИ</span>
            <span className="font-black text-[#f0f3f6]">{deg > 0 ? `+${deg}` : deg}°</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#6b7280] text-[7.5px]">ОПОРЫ / ГАК</span>
            <span className={`font-black ${hookedVeh ? 'text-[#10b981]' : 'text-[#c68a35]'}`}>
              {hookedVeh ? 'СТРОП В ЗАЦЕПЕ' : `ОПОРЫ ${outriggerPct}%`}
            </span>
          </div>
        </div>

        {/* Top Row: Outriggers, WASD Crane Mode, Hook Sling */}
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          <button
            type="button"
            onClick={() => {
              sound.playButtonPress();
              activeVehicle!.craneOutriggersDeployed = !activeVehicle!.craneOutriggersDeployed;
              onForceUpdate?.();
            }}
            className={`py-1.5 px-1.5 rounded-[2px] border text-[9px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors ${
              activeVehicle.craneOutriggersDeployed
                ? 'bg-[#c68a35] text-[#0b0c0e] border-[#d99a41]'
                : 'bg-[#1c1f26] hover:bg-[#232730] text-[#cbd5e1] border-[#2a2e38]'
            }`}
            title="Выдвинуть / убрать гидравлические аутригеры"
          >
            <Anchor className="w-3 h-3 shrink-0" />
            <span>{activeVehicle.craneOutriggersDeployed ? 'ОПОРЫ: ВКЛ' : 'ОПОРЫ'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playButtonPress();
              activeVehicle!.craneControlMode = !activeVehicle!.craneControlMode;
              onForceUpdate?.();
            }}
            className={`py-1.5 px-1.5 rounded-[2px] border text-[9px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors ${
              activeVehicle.craneControlMode
                ? 'bg-[#c68a35] text-[#0b0c0e] border-[#d99a41]'
                : 'bg-[#1c1f26] hover:bg-[#232730] text-[#cbd5e1] border-[#2a2e38]'
            }`}
            title="Переключить управление стрелой от руля и педалей (A/D - поворот, W/S - вылет)"
          >
            <Sliders className="w-3 h-3 shrink-0" />
            <span>{activeVehicle.craneControlMode ? 'СТРЕЛА: ВКЛ' : 'РЕЖИМ СТРЕЛЫ'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              toggleCraneHookAttach(activeVehicle!, world, player);
              onForceUpdate?.();
            }}
            className={`py-1.5 px-1.5 rounded-[2px] border text-[9px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors ${
              hookedVeh
                ? 'bg-[#10b981] text-[#0b0c0e] border-[#34d399]'
                : 'bg-[#1c1f26] hover:bg-[#232730] text-[#cbd5e1] border-[#2a2e38]'
            }`}
            title="Зацепить или отцепить четырёхветвевой строп за технику под оголовком стрелы"
          >
            <Link2 className="w-3 h-3 shrink-0" />
            <span>{hookedVeh ? 'ОТЦЕПИТЬ' : 'ЗАЦЕПИТЬ ГАК'}</span>
          </button>
        </div>

        {/* Hydraulic Lever Matrix: Slew Left/Right, Telescope Out/In, Winch Up/Down */}
        <div className="grid grid-cols-6 gap-1">
          <HoldActionButton
            inputKey="craneTurretLeft"
            inputRef={inputRef}
            className="py-2 px-1 rounded-[2px] border text-[8.5px] font-black flex flex-col items-center justify-center gap-0.5"
            title="Поворот башни влево"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ВЛЕВО</span>
          </HoldActionButton>

          <HoldActionButton
            inputKey="craneTurretRight"
            inputRef={inputRef}
            className="py-2 px-1 rounded-[2px] border text-[8.5px] font-black flex flex-col items-center justify-center gap-0.5"
            title="Поворот башни вправо"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>ВПРАВО</span>
          </HoldActionButton>

          <HoldActionButton
            inputKey="craneBoomRetract"
            inputRef={inputRef}
            className="py-2 px-1 rounded-[2px] border text-[8.5px] font-black flex flex-col items-center justify-center gap-0.5"
            title="Втянуть секции стрелы"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>СТРЕЛА −</span>
          </HoldActionButton>

          <HoldActionButton
            inputKey="craneBoomExtend"
            inputRef={inputRef}
            className="py-2 px-1 rounded-[2px] border text-[8.5px] font-black flex flex-col items-center justify-center gap-0.5"
            title="Выдвинуть секции стрелы"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>СТРЕЛА +</span>
          </HoldActionButton>

          <HoldActionButton
            inputKey="craneHookDown"
            inputRef={inputRef}
            className="py-2 px-1 rounded-[2px] border text-[8.5px] font-black flex flex-col items-center justify-center gap-0.5"
            title="Майна (опустить крюковую подвеску)"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>МАЙНА</span>
          </HoldActionButton>

          <HoldActionButton
            inputKey="craneHookUp"
            inputRef={inputRef}
            className="py-2 px-1 rounded-[2px] border text-[8.5px] font-black flex flex-col items-center justify-center gap-0.5"
            title="Вира (поднять крюковую подвеску)"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>ВИРА</span>
          </HoldActionButton>
        </div>
      </div>
    );
  }

  // Vacuum / Sludge / Combined Jetter Truck HUD (КО-503В / КО-505А / КО-560)
  const tank = activeVehicle.fluidTank;
  if (!tank) return null;

  const vol = Math.round(tank.currentVolume ?? tank.currentAmount ?? 0);
  const cap = Math.max(1, tank.capacity);
  const fillPct = Math.min(100, Math.round((vol / cap) * 100));
  const mode = tank.vacuumPumpMode ?? 'suction';
  const isFull = vol >= cap - 1;

  return (
    <div
      className={`fixed z-30 pointer-events-auto font-mono select-none ${
        isMobileTouch
          ? 'top-12 left-1/2 -translate-x-1/2 w-[310px]'
          : 'bottom-4 left-4 w-[336px]'
      } bg-[#14161a]/95 border border-[#2a2e38] rounded-[2px] p-2.5 shadow-2xl text-[#f0f3f6]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#2a2e38]">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-[#c68a35]" />
          <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[210px]">
            {bodyTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-[2px] ${
              isFull
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : activeVehicle.isPtoActive
                ? 'bg-[#c68a35]/20 text-[#c68a35] border border-[#c68a35]/40'
                : 'bg-[#1c1f26] text-[#9ba3af]'
            }`}
          >
            {isFull ? 'СПУ: ПОЛНЫЙ' : activeVehicle.isPtoActive ? 'ВАКУУМ: АКТИВЕН' : 'КОМ: ВЫКЛ'}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-0.5 text-[#9ba3af] hover:text-white cursor-pointer"
            title="Свернуть пульт"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cistern Storage Bar */}
      <div className="mb-2 bg-[#0b0c0e] p-2 rounded-[2px] border border-[#2a2e38]">
        <div className="flex items-center justify-between text-[9px] mb-1 tabular-nums">
          <span className="text-[#9ba3af]">ХРАНИЛИЩЕ ЦИСТЕРНЫ:</span>
          <span className="font-black text-[#f0f3f6]">
            {vol} / {cap} Л ({fillPct}%)
          </span>
        </div>
        <div className="w-full h-2 bg-[#1c1f26] rounded-[1px] overflow-hidden border border-[#2a2e38]">
          <div
            className={`h-full transition-all duration-150 ${
              isFull ? 'bg-rose-500' : mode === 'suction' ? 'bg-[#0284c7]' : 'bg-[#c68a35]'
            }`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* Controls: PTO Pump, 4-Way Valve (Suction / Discharge), Rear Gate Valve */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => {
            sound.playButtonPress();
            activeVehicle!.isPtoActive = !activeVehicle!.isPtoActive;
            onForceUpdate?.();
          }}
          className={`py-1.5 px-1.5 rounded-[2px] border text-[8.5px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeVehicle.isPtoActive
              ? 'bg-[#c68a35] text-[#0b0c0e] border-[#d99a41]'
              : 'bg-[#1c1f26] hover:bg-[#232730] text-[#cbd5e1] border-[#2a2e38]'
          }`}
          title="Включить/выключить коробку отбора мощности и вакуумный насос"
        >
          <Power className="w-3 h-3 shrink-0" />
          <span>{activeVehicle.isPtoActive ? 'НАСОС: ВКЛ' : 'КОМ / НАСОС'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playButtonPress();
            tank.vacuumPumpMode = mode === 'suction' ? 'discharge' : 'suction';
            onForceUpdate?.();
          }}
          className={`py-1.5 px-1.5 rounded-[2px] border text-[8.5px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            mode === 'suction'
              ? 'bg-[#0284c7] text-white border-[#38bdf8]'
              : 'bg-[#c68a35] text-[#0b0c0e] border-[#d99a41]'
          }`}
          title="Переключить четырёхходовой кран: Всасывание луж в цистерну / Напорный слив из цистерны"
        >
          <Droplet className="w-3 h-3 shrink-0" />
          <span>{mode === 'suction' ? 'ОТКАЧКА ЛУЖ' : 'НАПОРНЫЙ СЛИВ'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playButtonPress();
            tank.drainValveOpen = !tank.drainValveOpen;
            onForceUpdate?.();
          }}
          className={`py-1.5 px-1.5 rounded-[2px] border text-[8.5px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            tank.drainValveOpen
              ? 'bg-rose-500 text-white border-rose-400'
              : 'bg-[#1c1f26] hover:bg-[#232730] text-[#cbd5e1] border-[#2a2e38]'
          }`}
          title="Открыть/закрыть заднюю шиберную задвижку АНМ-53 (самотечный слив)"
        >
          <span>{tank.drainValveOpen ? 'ШИБЕР: ОТКР' : 'ШИБЕР: ЗАКР'}</span>
        </button>
      </div>
    </div>
  );
};

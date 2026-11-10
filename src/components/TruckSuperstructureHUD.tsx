import React, { useState } from 'react';
import {
  Anchor,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Droplet,
  Gauge,
  Link2,
  Maximize2,
  Minimize2,
  Power,
  RotateCcw,
  RotateCw,
  Sliders,
  Volume2,
  Lightbulb,
  ShieldAlert,
  ShieldCheck,
  Compass,
  LogOut,
  UserCheck,
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
  onOpenOutriggersModal?: () => void;
  onEnterCraneCab?: () => void;
  onExitCraneCab?: () => void;
}

interface TactileLeverProps {
  label: string;
  sublabel: string;
  hotkeyNegative: string;
  hotkeyPositive: string;
  inputKeyNegative: keyof InputState;
  inputKeyPositive: keyof InputState;
  inputRef: React.MutableRefObject<InputState>;
  disabled?: boolean;
  iconNegative: React.ReactNode;
  iconPositive: React.ReactNode;
}

const TactileHydraulicLever: React.FC<TactileLeverProps> = ({
  label,
  sublabel,
  hotkeyNegative,
  hotkeyPositive,
  inputKeyNegative,
  inputKeyPositive,
  inputRef,
  disabled = false,
  iconNegative,
  iconPositive,
}) => {
  const [activeDir, setActiveDir] = useState<'neg' | 'pos' | null>(null);

  const setKeyVal = (dir: 'neg' | 'pos' | null) => {
    if (disabled && dir !== null) return;
    (inputRef.current as unknown as Record<string, boolean>)[inputKeyNegative] = dir === 'neg';
    (inputRef.current as unknown as Record<string, boolean>)[inputKeyPositive] = dir === 'pos';
    setActiveDir(dir);
    if (dir !== null) {
      sound.playHydraulicHiss(0.18);
    }
  };

  return (
    <div
      className={`flex flex-col items-center bg-[#0d0e12] border rounded-[2px] p-1.5 transition-colors ${
        disabled
          ? 'border-[#1e232d] opacity-50'
          : activeDir !== null
          ? 'border-[#eab308] bg-[#14161f]'
          : 'border-[#262a33] hover:border-[#3a4150]'
      }`}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Title */}
      <span className="text-[8px] font-black tracking-wider text-[#cbd5e1] uppercase">
        {label}
      </span>
      <span className="text-[6.5px] text-[#6b7280] uppercase -mt-0.5 mb-1">
        {sublabel}
      </span>

      {/* Positive Direction Push Button */}
      <button
        type="button"
        disabled={disabled}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setKeyVal('pos');
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setKeyVal(null);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setKeyVal('pos');
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setKeyVal(null);
        }}
        onMouseLeave={() => {
          if (activeDir === 'pos') setKeyVal(null);
        }}
        className={`w-full py-1 rounded-[1px] border text-[7.5px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all select-none ${
          activeDir === 'pos'
            ? 'bg-[#eab308] text-black border-[#ca8a04]'
            : 'bg-[#181a20] hover:bg-[#20242c] text-[#cbd5e1] border-[#2a2e38]'
        }`}
        title={`Клавиша [${hotkeyPositive}]`}
      >
        {iconPositive}
        <span>[{hotkeyPositive}]</span>
      </button>

      {/* Physical Lever Slot Visualization */}
      <div className="relative w-4 h-9 my-1 bg-[#07080a] border border-[#20242d] rounded-[1px] flex items-center justify-center overflow-hidden">
        {/* Center slot track line */}
        <div className="w-[2px] h-full bg-[#14161a]" />
        {/* Chrome lever rod & textured cylinder knob */}
        <div
          className={`absolute w-3.5 h-3 rounded-[1px] border shadow-md transition-transform duration-75 ${
            disabled
              ? 'bg-[#2a2e38] border-[#1e232d]'
              : activeDir === 'pos'
              ? 'bg-[#eab308] border-[#ca8a04] -translate-y-2.5'
              : activeDir === 'neg'
              ? 'bg-[#eab308] border-[#ca8a04] translate-y-2.5'
              : 'bg-[#3b4252] border-[#4c566a] translate-y-0'
          }`}
        />
      </div>

      {/* Negative Direction Pull Button */}
      <button
        type="button"
        disabled={disabled}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setKeyVal('neg');
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setKeyVal(null);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setKeyVal('neg');
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setKeyVal(null);
        }}
        onMouseLeave={() => {
          if (activeDir === 'neg') setKeyVal(null);
        }}
        className={`w-full py-1 rounded-[1px] border text-[7.5px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all select-none ${
          activeDir === 'neg'
            ? 'bg-[#eab308] text-black border-[#ca8a04]'
            : 'bg-[#181a20] hover:bg-[#20242c] text-[#cbd5e1] border-[#2a2e38]'
        }`}
        title={`Клавиша [${hotkeyNegative}]`}
      >
        {iconNegative}
        <span>[{hotkeyNegative}]</span>
      </button>
    </div>
  );
};

export const TruckSuperstructureHUD: React.FC<TruckSuperstructureHUDProps> = ({
  player,
  world,
  inputRef,
  isMobileTouch = false,
  onForceUpdate,
  onOpenOutriggersModal,
  onEnterCraneCab,
  onExitCraneCab,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!player || !world) return null;

  // Determine active vehicle: driven by player, or vacuum truck connected to held hose
  let activeVehicle: Vehicle | null = null;
  if (player.isInVehicle && player.currentVehicleId) {
    activeVehicle = world.vehicles.find((v) => v.id === player.currentVehicleId) || null;
  } else if (player.heldWaterHose) {
    activeVehicle = world.vehicles.find((v) => v.id === player.heldWaterHose?.vehicleId) || null;
  }

  if (!activeVehicle) return null;

  const isCrane = isVehicleCraneTruck(activeVehicle);
  const isVacuum = isVehicleVacuumTruck(activeVehicle);

  if (!isCrane && !isVacuum) return null;

  const resolvedTruck = resolveVehicleTruckFrameAndBody(activeVehicle);
  const bodyTitle = resolvedTruck?.body.modelCode || resolvedTruck?.body.nameRu || 'Спецнадстройка';

  // --- COLLAPSED MINI DOCK (Anchored bottom-right out of center view) ---
  if (collapsed) {
    return (
      <div
        className="fixed z-40 bottom-4 right-4 pointer-events-auto font-mono select-none"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            sound.playButtonPress();
            setCollapsed(false);
          }}
          className="px-3 py-1.5 rounded-[2px] bg-[#121418]/95 border border-[#2a2e38] hover:border-[#eab308] text-[#f0f3f6] text-[10px] font-bold flex items-center gap-2 shadow-2xl cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#eab308]" />
          <span>ПУЛЬТ: {bodyTitle.toUpperCase()}</span>
          <Maximize2 className="w-3 h-3 text-[#9ba3af]" />
        </button>
      </div>
    );
  }

  // =========================================================================
  // 1. BOOM CRANE (КС-3577 «Ивановец» 16 т)
  // =========================================================================
  if (isCrane) {
    const isOperatorInCraneCab = !!(player.isInVehicle && (player.craneOperatorActive || activeVehicle.craneOperatorActive));
    const isEngineRunning = activeVehicle.engineState ? activeVehicle.engineState.engineRunning : true;
    const isPtoActive = activeVehicle.isPtoActive !== false;
    const hasPressure = isEngineRunning && isPtoActive;

    const geom = getVehicleCraneGeometry(activeVehicle);
    const deg = Math.round((geom.turretAngle * 180) / Math.PI);
    const outriggerPct = Math.round((geom.outriggerExt ?? 0) * 100);
    const outriggersOk = (geom.outriggerExt ?? 0) >= 0.70;

    const hookedVeh = activeVehicle.craneHookedVehicleId
      ? world.vehicles.find((v) => v.id === activeVehicle!.craneHookedVehicleId)
      : null;

    // Load moment calculation
    const hookedMassTons = hookedVeh ? (hookedVeh.weight ? +(hookedVeh.weight / 1000).toFixed(1) : 1.8) : 0.0;
    const loadMomentPct = Math.min(100, Math.round((hookedMassTons / Math.max(0.1, geom.maxLoadTons)) * 100));

    // Working radius R (distance from slewing axis to hook in meters)
    const workingRadiusMeters = +(geom.totalBoomReachPx * 0.28).toFixed(1);
    // Working hook elevation angle alpha (degrees)
    const boomAngleDeg = Math.round(15 + (activeVehicle.craneBoomElevation ?? 0.25) * 55);

    // --- CASE A: PLAYER IS IN TRUCK DRIVER'S CABIN (CHASSIS ROAD DRIVING) ---
    if (!isOperatorInCraneCab) {
      return (
        <div
          className="fixed z-40 bottom-4 right-4 w-[320px] pointer-events-auto font-mono select-none bg-[#121418]/95 border border-[#262a33] rounded-[2px] p-2.5 shadow-2xl text-[#f0f3f6]"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#262a33]">
            <div className="flex items-center gap-1.5">
              <Anchor className="w-3.5 h-3.5 text-[#eab308]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#f0f3f6]">
                ШАССИ: КАБИНА ВОДИТЕЛЯ
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-0.5 text-[#9ba3af] hover:text-white cursor-pointer"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          </div>

          {/* PTO Status */}
          <div className="flex items-center justify-between bg-[#0a0b0e] p-2 rounded-[2px] border border-[#20242d] mb-2 text-[9px]">
            <span className="text-[#9ba3af]">КОМ (ГИДРОНАСОС):</span>
            <button
              type="button"
              onClick={() => {
                sound.playButtonPress();
                activeVehicle!.isPtoActive = !activeVehicle!.isPtoActive;
                if (activeVehicle!.isPtoActive) sound.playHydraulicHiss(0.3);
                onForceUpdate?.();
              }}
              className={`px-2 py-0.5 rounded-[1px] font-black uppercase text-[8.5px] cursor-pointer transition-colors ${
                isPtoActive
                  ? 'bg-emerald-600 text-black border border-emerald-400'
                  : 'bg-[#181a20] text-[#9ba3af] border border-[#2a2e38]'
              }`}
            >
              {isPtoActive ? 'КОМ: ВКЛ (16 МПа)' : 'КОМ: ВЫКЛ'}
            </button>
          </div>

          {/* Prompt to enter crane operator cabin */}
          <div className="p-2 rounded-[2px] bg-[#0a0b0e] border border-[#20242d] mb-2 text-[8px] text-[#9ba3af] leading-relaxed">
            Стрела автокрана КС-3577 управляется из поворотной кабины крановщика. Перед
            подъёмом грузов выставьте выносные опоры на наружном пульте шасси.
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (onOpenOutriggersModal) onOpenOutriggersModal();
              }}
              className="py-1.5 px-2 rounded-[2px] bg-[#181a20] hover:bg-[#20242c] border border-[#2a2e38] text-[#cbd5e1] text-[8.5px] font-black flex items-center justify-center gap-1 cursor-pointer"
            >
              <Compass className="w-3 h-3 text-[#eab308]" />
              <span>ПУЛЬТ ОПОР</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onEnterCraneCab) {
                  onEnterCraneCab();
                } else {
                  player.craneOperatorActive = true;
                  activeVehicle!.craneOperatorActive = true;
                  activeVehicle!.craneControlMode = true;
                  sound.playCarDoor();
                }
                onForceUpdate?.();
              }}
              className="py-1.5 px-2 rounded-[2px] bg-[#eab308] hover:bg-[#ca8a04] text-black border border-[#ca8a04] text-[8.5px] font-black flex items-center justify-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3 h-3" />
              <span>В КАБИНУ КРАНА</span>
            </button>
          </div>
        </div>
      );
    }

    // --- CASE B: PLAYER IS IN THE REVOLVING CRANE OPERATOR CABIN ("СКВОРЕЧНИК") ---
    return (
      <div
        className={`fixed z-40 pointer-events-auto font-mono select-none ${
          isMobileTouch
            ? 'bottom-2 right-2 left-2 max-w-[420px] mx-auto'
            : 'bottom-4 right-4 w-[380px]'
        } bg-[#101216]/98 border-2 border-[#262a33] rounded-[2px] p-3 shadow-2xl text-[#f0f3f6]`}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Header: Identity, Interlock Badge, Minimize, Exit */}
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#262a33]">
          <div className="flex items-center gap-1.5">
            <Anchor className="w-3.5 h-3.5 text-[#eab308]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#f0f3f6]">
              КАБИНА КРАНОВЩИКА КС-3577
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Outrigger & Pressure Safety Badge */}
            {!outriggersOk ? (
              <span className="flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-[1px] bg-red-950/80 text-red-300 border border-red-600 animate-pulse">
                <ShieldAlert className="w-2.5 h-2.5" />
                ОПОРЫ НЕ ВЫСТАВЛЕНЫ!
              </span>
            ) : !hasPressure ? (
              <span className="flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-[1px] bg-amber-950/80 text-amber-300 border border-amber-600">
                НЕТ ДАВЛЕНИЯ (КОМ)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-[1px] bg-emerald-950/80 text-emerald-300 border border-emerald-600">
                <ShieldCheck className="w-2.5 h-2.5" />
                ОНК-140: НОРМА
              </span>
            )}

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

        {/* ================================================================= */}
        {/* ОНК-140 / ОНК-160 SAFETY & TELEMETRY COMPUTER SCREEN              */}
        {/* ================================================================= */}
        <div className="mb-2.5 bg-[#07090c] p-2 rounded-[2px] border border-[#20252e] text-[8.5px] tabular-nums">
          {/* Top row: Computer model & load moment bar */}
          <div className="flex items-center justify-between text-[7.5px] text-[#6b7280] mb-1">
            <span className="font-bold text-[#9ba3af]">ПРИБОР БЕЗОПАСНОСТИ ОНК-140-05</span>
            <span className="text-[#cbd5e1]">
              МН: <strong className={loadMomentPct > 90 ? 'text-red-400' : 'text-emerald-400'}>{loadMomentPct}%</strong>
            </span>
          </div>

          {/* LED Multi-Segment Load Moment Indicator Bar */}
          <div className="w-full h-2 bg-[#12151c] rounded-[1px] border border-[#20242d] overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-150 ${
                loadMomentPct > 95
                  ? 'bg-red-500'
                  : loadMomentPct > 75
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(4, loadMomentPct)}%` }}
            />
          </div>

          {/* Telemetry Matrix: 6 Readout Cells */}
          <div className="grid grid-cols-3 gap-1.5 text-[8px]">
            <div className="flex flex-col bg-[#0e1015] p-1 rounded-[1px] border border-[#1a1d24]">
              <span className="text-[#6b7280] text-[6.5px]">ГРУЗ / МАКС Q</span>
              <span className="font-black text-[#f0f3f6]">
                {hookedMassTons > 0 ? `${hookedMassTons.toFixed(1)} т` : '—'} / {geom.maxLoadTons.toFixed(1)} т
              </span>
            </div>

            <div className="flex flex-col bg-[#0e1015] p-1 rounded-[1px] border border-[#1a1d24]">
              <span className="text-[#6b7280] text-[6.5px]">ВЫЛЕТ КРЮКА (R)</span>
              <span className="font-black text-[#eab308]">{workingRadiusMeters} м</span>
            </div>

            <div className="flex flex-col bg-[#0e1015] p-1 rounded-[1px] border border-[#1a1d24]">
              <span className="text-[#6b7280] text-[6.5px]">ДЛИНА СТРЕЛЫ (L)</span>
              <span className="font-black text-[#f0f3f6]">{geom.boomLengthMeters.toFixed(1)} / 21.7 м</span>
            </div>

            <div className="flex flex-col bg-[#0e1015] p-1 rounded-[1px] border border-[#1a1d24]">
              <span className="text-[#6b7280] text-[6.5px]">УГОЛ НАКЛОНА (α)</span>
              <span className="font-black text-[#f0f3f6]">{boomAngleDeg}°</span>
            </div>

            <div className="flex flex-col bg-[#0e1015] p-1 rounded-[1px] border border-[#1a1d24]">
              <span className="text-[#6b7280] text-[6.5px]">ПОВОРОТ БАШНИ (Ψ)</span>
              <span className="font-black text-[#f0f3f6]">{deg > 0 ? `+${deg}` : deg}°</span>
            </div>

            <div className="flex flex-col bg-[#0e1015] p-1 rounded-[1px] border border-[#1a1d24]">
              <span className="text-[#6b7280] text-[6.5px]">ОПОРНЫЙ КОНТУР</span>
              <span className={`font-black ${outriggersOk ? 'text-emerald-400' : 'text-red-400'}`}>
                {outriggersOk ? `ОПОРЫ ${outriggerPct}%` : 'НЕТ ОПОР (БЛОК)'}
              </span>
            </div>
          </div>
        </div>

        {/* Safety Warning Interlock Strip */}
        {!outriggersOk && (
          <div className="mb-2 p-1.5 rounded-[2px] bg-red-950/60 border border-red-500/80 text-[8px] text-red-200 flex items-center justify-between">
            <span className="flex items-center gap-1 font-bold">
              <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />
              БЛОКИРОВКА ОГП! ВЫСТАВЬТЕ ОПОРЫ ДЛЯ РАБОТЫ СТРЕЛОЙ
            </span>
            <button
              type="button"
              onClick={() => onOpenOutriggersModal?.()}
              className="px-2 py-0.5 rounded-[1px] bg-red-600 hover:bg-red-500 text-black font-black uppercase text-[7.5px] cursor-pointer"
            >
              ВЫСТАВИТЬ
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* HYDRAULIC LEVER BANK: 4 REALISTIC CRANE LEVERS                     */}
        {/* ================================================================= */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          {/* Lever 1: Turret Slewing (Left / Right) */}
          <TactileHydraulicLever
            label="ПОВОРОТ"
            sublabel="БАШНЯ"
            hotkeyNegative="A"
            hotkeyPositive="D"
            inputKeyNegative="craneTurretLeft"
            inputKeyPositive="craneTurretRight"
            inputRef={inputRef}
            disabled={!outriggersOk || !hasPressure}
            iconNegative={<RotateCcw className="w-2.5 h-2.5" />}
            iconPositive={<RotateCw className="w-2.5 h-2.5" />}
          />

          {/* Lever 2: Boom Elevation (Down / Up) */}
          <TactileHydraulicLever
            label="ПОДЪЁМ"
            sublabel="СТРЕЛА"
            hotkeyNegative="S"
            hotkeyPositive="W"
            inputKeyNegative="craneBoomDown"
            inputKeyPositive="craneBoomUp"
            inputRef={inputRef}
            disabled={!outriggersOk || !hasPressure}
            iconNegative={<ArrowDown className="w-2.5 h-2.5" />}
            iconPositive={<ArrowUp className="w-2.5 h-2.5" />}
          />

          {/* Lever 3: Telescoping Boom (Retract / Extend) */}
          <TactileHydraulicLever
            label="ТЕЛЕСКОП"
            sublabel="СЕКЦИИ"
            hotkeyNegative="Q"
            hotkeyPositive="E"
            inputKeyNegative="craneBoomRetract"
            inputKeyPositive="craneBoomExtend"
            inputRef={inputRef}
            disabled={!outriggersOk || !hasPressure}
            iconNegative={<ChevronDown className="w-2.5 h-2.5" />}
            iconPositive={<ChevronUp className="w-2.5 h-2.5" />}
          />

          {/* Lever 4: Cargo Winch (Lower Hook / Raise Hook) */}
          <TactileHydraulicLever
            label="ЛЕБЁДКА"
            sublabel="ГАК"
            hotkeyNegative="F"
            hotkeyPositive="R"
            inputKeyNegative="craneHookDown"
            inputKeyPositive="craneHookUp"
            inputRef={inputRef}
            disabled={!hasPressure}
            iconNegative={<ArrowDown className="w-2.5 h-2.5" />}
            iconPositive={<ArrowUp className="w-2.5 h-2.5" />}
          />
        </div>

        {/* ================================================================= */}
        {/* QUICK RIGGING, RIGGER HORN, WORKLIGHT & CAB ACTIONS               */}
        {/* ================================================================= */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {/* Sling Hook Cargo (Строп 4СК) */}
          <button
            type="button"
            onClick={() => {
              toggleCraneHookAttach(activeVehicle!, world, player);
              onForceUpdate?.();
            }}
            className={`py-1.5 px-1 rounded-[2px] border text-[8px] font-black flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors col-span-2 ${
              hookedVeh
                ? 'bg-emerald-600 text-black border-emerald-400'
                : 'bg-[#181a20] hover:bg-[#20242c] text-[#cbd5e1] border-[#2a2e38]'
            }`}
            title="Зацепить или отцепить четырёхветвевой строп 4СК [Пробел]"
          >
            <div className="flex items-center gap-1">
              <Link2 className="w-3 h-3 shrink-0" />
              <span>{hookedVeh ? 'ОТЦЕПИТЬ СТРОП' : 'ЗАЦЕПИТЬ ГАК'}</span>
            </div>
            <span className="text-[6.5px] font-normal opacity-80">
              {hookedVeh ? `ГРУЗ: ${hookedVeh.nameRu || hookedVeh.type}` : '[ПРОБЕЛ]'}
            </span>
          </button>

          {/* Crane Operator Horn */}
          <button
            type="button"
            onClick={() => {
              sound.playCraneHorn();
            }}
            className="py-1.5 px-1 rounded-[2px] bg-[#181a20] hover:bg-[#20242c] border border-[#2a2e38] text-[#cbd5e1] text-[8px] font-black flex flex-col items-center justify-center gap-0.5 cursor-pointer"
            title="Звуковой сигнал крановщика для рабочих в рабочей зоне [H]"
          >
            <Volume2 className="w-3 h-3 text-[#eab308]" />
            <span>СИГНАЛ</span>
          </button>

          {/* Boom Spotlight */}
          <button
            type="button"
            onClick={() => {
              sound.playButtonPress();
              activeVehicle!.craneSpotlightOn = !activeVehicle!.craneSpotlightOn;
              onForceUpdate?.();
            }}
            className={`py-1.5 px-1 rounded-[2px] border text-[8px] font-black flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
              activeVehicle.craneSpotlightOn
                ? 'bg-[#eab308] text-black border-[#ca8a04]'
                : 'bg-[#181a20] hover:bg-[#20242c] text-[#cbd5e1] border-[#2a2e38]'
            }`}
            title="Включить фару-прожектор освещения зоны монтажа на стреле [L]"
          >
            <Lightbulb className="w-3 h-3" />
            <span>ФАРА</span>
          </button>
        </div>

        {/* Bottom Station Switch & Exit Cab */}
        <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#1e232d]">
          <button
            type="button"
            onClick={() => onOpenOutriggersModal?.()}
            className="py-1.5 px-2 rounded-[2px] bg-[#181a20] hover:bg-[#20242c] border border-[#2a2e38] text-[#cbd5e1] text-[8px] font-bold flex items-center justify-center gap-1 cursor-pointer"
          >
            <Compass className="w-3 h-3 text-[#eab308]" />
            <span>ПУЛЬТ ОПОР [E]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onExitCraneCab) {
                onExitCraneCab();
              } else {
                player.craneOperatorActive = false;
                activeVehicle!.craneOperatorActive = false;
                player.isInVehicle = false;
                player.currentVehicleId = null;
                sound.playCarDoor();
              }
              onForceUpdate?.();
            }}
            className="py-1.5 px-2 rounded-[2px] bg-[#1c202a] hover:bg-[#252b38] border border-[#384152] text-[#cbd5e1] text-[8px] font-bold flex items-center justify-center gap-1 cursor-pointer"
            title="Спуститься по трапу на землю [F]"
          >
            <LogOut className="w-3 h-3 text-[#9ba3af]" />
            <span>ВЫЙТИ ИЗ КАБИНЫ [F]</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. VACUUM CISTERN / SEWAGE JETTER (КО-503В / КО-505А / КО-560)
  // =========================================================================
  const tank = activeVehicle.fluidTank;
  if (!tank) return null;

  const vol = Math.round(tank.currentVolume ?? tank.currentAmount ?? 0);
  const cap = Math.max(1, tank.capacity);
  const fillPct = Math.min(100, Math.round((vol / cap) * 100));
  const mode = tank.vacuumPumpMode ?? 'suction';
  const isFull = vol >= cap - 1;

  return (
    <div
      className={`fixed z-40 pointer-events-auto font-mono select-none ${
        isMobileTouch
          ? 'bottom-2 right-2 left-2 max-w-[340px] mx-auto'
          : 'bottom-4 right-4 w-[340px]'
      } bg-[#121418]/95 border border-[#262a33] rounded-[2px] p-2.5 shadow-2xl text-[#f0f3f6]`}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#262a33]">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-[#eab308]" />
          <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[210px]">
            {bodyTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-[1px] ${
              isFull
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : activeVehicle.isPtoActive
                ? 'bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/40'
                : 'bg-[#181a20] text-[#9ba3af]'
            }`}
          >
            {isFull ? 'СПУ: ПОЛНЫЙ' : activeVehicle.isPtoActive ? 'НАСОС: ВКЛ' : 'КОМ: ВЫКЛ'}
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
      <div className="mb-2 bg-[#0a0b0e] p-2 rounded-[2px] border border-[#20252e]">
        <div className="flex items-center justify-between text-[8.5px] mb-1 tabular-nums">
          <span className="text-[#9ba3af]">ЗАПОЛНЕНИЕ ЦИСТЕРНЫ:</span>
          <span className="font-black text-[#f0f3f6]">
            {vol} / {cap} Л ({fillPct}%)
          </span>
        </div>
        <div className="w-full h-2 bg-[#141820] rounded-[1px] overflow-hidden border border-[#2a2e38]">
          <div
            className={`h-full transition-all duration-150 ${
              isFull ? 'bg-rose-500' : mode === 'suction' ? 'bg-[#0284c7]' : 'bg-[#eab308]'
            }`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* Controls: PTO Pump, 4-Way Valve, Rear Drain Gate */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => {
            sound.playButtonPress();
            activeVehicle!.isPtoActive = !activeVehicle!.isPtoActive;
            if (activeVehicle!.isPtoActive) sound.playHydraulicHiss(0.3);
            onForceUpdate?.();
          }}
          className={`py-1.5 px-1.5 rounded-[2px] border text-[8.5px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeVehicle.isPtoActive
              ? 'bg-[#eab308] text-black border-[#ca8a04]'
              : 'bg-[#181a20] hover:bg-[#20242c] text-[#cbd5e1] border-[#2a2e38]'
          }`}
          title="Включить/выключить коробку отбора мощности и насос"
        >
          <Power className="w-3 h-3 shrink-0" />
          <span>{activeVehicle.isPtoActive ? 'НАСОС: ВКЛ' : 'КОМ: ВКЛ'}</span>
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
              : 'bg-[#eab308] text-black border-[#ca8a04]'
          }`}
          title="Переключить 4-ходовой кран (откачка луж / напорный слив)"
        >
          <Droplet className="w-3 h-3 shrink-0" />
          <span>{mode === 'suction' ? 'ОТКАЧКА' : 'НАПОР'}</span>
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
              : 'bg-[#181a20] hover:bg-[#20242c] text-[#cbd5e1] border-[#2a2e38]'
          }`}
          title="Открыть/закрыть заднюю шиберную задвижку"
        >
          <span>{tank.drainValveOpen ? 'ШИБЕР: ОТКР' : 'ШИБЕР: ЗАКР'}</span>
        </button>
      </div>
    </div>
  );
};

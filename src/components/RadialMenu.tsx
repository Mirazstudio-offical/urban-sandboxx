import React, { useEffect, useState } from 'react';
import { Player, GameWorld, Vehicle } from '../types';
import { 
  Lightbulb,
  Power, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  CloudRain, 
  X,
  Fan,
  Wind,
  AlertTriangle,
  Thermometer,
  Gauge,
  Link2,
  Droplet,
  Zap,
  Truck,
  Siren,
  Key,
  Compass,
  Radio,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Activity,
  CheckCircle2,
  Snowflake,
  RefreshCw
} from 'lucide-react';
import { sound } from '../audio';
import { toggleTrailerHitch } from '../physics';
import { getLiquidNameRu, hasRoadTrainLights, getVehicleDiffCapabilities, cycleVehicleDiffLock } from '../vehicleHelpers';
import { getVehicleControlTheme, VehicleControlTheme, CONTROL_THEME_META } from './vehicleControlStyles';

interface RadialMenuProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  world: GameWorld | null;
  onToggleWipers: () => void;
  onToggleHeadlights: () => void;
  onToggleFrontFogLights?: () => void;
  onToggleRearFogLights?: () => void;
  onToggleSiren: () => void;
  onToggleTurnSignal: (signal: 'left' | 'right' | 'hazard') => void;
  onChangeHeaterMode: (mode: 'off' | 'low' | 'med' | 'high') => void;
  onToggleWindow?: () => void;
  onToggleEngine?: () => void;
  onToggleTrailerHitch?: () => void;
  onToggleRoadTrainLights?: () => void;
  onCycleDiffLock?: () => void;
  onToggleAC?: () => void;
  onToggleRecirc?: () => void;
}

export const RadialMenu: React.FC<RadialMenuProps> = ({
  isOpen,
  onClose,
  player,
  world,
  onToggleWipers,
  onToggleHeadlights,
  onToggleFrontFogLights,
  onToggleRearFogLights,
  onToggleSiren,
  onToggleTurnSignal,
  onChangeHeaterMode,
  onToggleWindow,
  onToggleEngine,
  onToggleTrailerHitch,
  onToggleRoadTrainLights,
  onCycleDiffLock,
  onToggleAC,
  onToggleRecirc
}) => {
  // Close menu on Escape or E key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !player || !world) return null;

  const veh = world.vehicles.find(v => v.id === player.currentVehicleId);
  if (!veh) return null;

  const theme: VehicleControlTheme = getVehicleControlTheme(veh.type);
  const themeMeta = CONTROL_THEME_META[theme] || CONTROL_THEME_META.standard;

  const wipersActive = !!veh.wipersOn;
  const headlightsMode = veh.headlightMode || 'off';
  const sirenActive = !!veh.sirenOn;
  const heaterMode = veh.heaterMode || 'off';
  const heaterTemp = Math.round(veh.heaterTemp ?? 18);
  const engTemp = Math.round(typeof veh.engineTemp === 'number' ? veh.engineTemp : (veh.engineState?.temperature ?? 20));
  const rawFog = veh.fogLevel ?? 0;
  const fogPercent = Math.round(rawFog <= 1.0 ? rawFog * 100 : rawFog);
  const rainPercent = Math.round(veh.windshieldRainLevel ?? 0);
  const turnSignal = veh.turnSignal || 'none';
  const isEngineRunning = veh.engineState?.engineRunning ?? false;
  const isStalled = !!veh.engineState?.isStalled || !!veh.engineState?.engineStalled;
  const isWindowOpen = !!veh.windowOpen;
  const acActive = !!veh.acOn;
  const recircActive = !!veh.recircOn;
  const speedKmh = Math.round(Math.abs(veh.speed) * 3.6);
  const rpm = isEngineRunning ? Math.round(veh.engineState?.engineRPM || 800) : 0;
  const batteryCharge = Math.round(veh.engineState?.batteryCharge ?? 100);
  const voltage = isEngineRunning ? (14.1 + (batteryCharge / 100) * 0.3).toFixed(1) : (11.9 + (batteryCharge / 100) * 0.7).toFixed(1);

  // Differential Lock info
  const diffCaps = getVehicleDiffCapabilities(veh.type);
  const dl = veh.diffLock;
  const isDiffLocked = !!(dl?.center || dl?.rear || dl?.front);
  let diffLockDesc = 'СВОБОДНЫЙ';
  if (dl?.front && dl?.rear && dl?.center) diffLockDesc = 'ПОЛНАЯ (100%)';
  else if (dl?.center && dl?.rear) diffLockDesc = 'МОБ + МКБ-З';
  else if (dl?.center) diffLockDesc = 'МОБ (МЕЖОСЕВАЯ)';
  else if (dl?.rear) diffLockDesc = 'МКБ-З (ЗАДНЯЯ)';
  else if (dl?.front) diffLockDesc = 'МКБ-П (ПЕРЕДНЯЯ)';

  // Theme-specific material aesthetics for the physical dashboard panel
  const panelStyles = {
    tractor: {
      panelBg: 'linear-gradient(180deg, #181a20 0%, #14161a 100%)',
      panelTexture: 'radial-gradient(#c68a35 0.5px, transparent 0.5px)',
      textureSize: '12px 12px',
      casingBorder: 'border-[#2a2e38] shadow-2xl',
      plateBorder: 'border-[#2a2e38] bg-[#14161a]',
      headerBg: 'bg-[#0b0c0e] border-[#2a2e38]',
      bezelStyle: 'steel',
      switchType: 'soviet_toggle',
      accentColor: '#c68a35',
      screwColor: 'from-[#3a3f4d] to-[#14161a]'
    },
    truck: {
      panelBg: 'linear-gradient(180deg, #181a20 0%, #14161a 100%)',
      panelTexture: 'none',
      textureSize: '4px 4px',
      casingBorder: 'border-[#2a2e38] shadow-2xl',
      plateBorder: 'border-[#2a2e38] bg-[#14161a]',
      headerBg: 'bg-[#0b0c0e] border-[#2a2e38]',
      bezelStyle: 'steel',
      switchType: 'truck_rocker',
      accentColor: '#c68a35',
      screwColor: 'from-[#3a3f4d] to-[#14161a]'
    },
    retro: {
      panelBg: 'linear-gradient(180deg, #181a20 0%, #14161a 100%)',
      panelTexture: 'none',
      textureSize: '16px 16px',
      casingBorder: 'border-[#2a2e38] shadow-2xl',
      plateBorder: 'border-[#2a2e38] bg-[#14161a]',
      headerBg: 'bg-[#0b0c0e] border-[#2a2e38]',
      bezelStyle: 'steel',
      switchType: 'soviet_toggle',
      accentColor: '#c68a35',
      screwColor: 'from-[#3a3f4d] to-[#14161a]'
    },
    sport: {
      panelBg: 'linear-gradient(180deg, #181a20 0%, #14161a 100%)',
      panelTexture: 'none',
      textureSize: '6px 6px',
      casingBorder: 'border-[#2a2e38] shadow-2xl',
      plateBorder: 'border-[#2a2e38] bg-[#14161a]',
      headerBg: 'bg-[#0b0c0e] border-[#2a2e38]',
      bezelStyle: 'steel',
      switchType: 'missile_switch',
      accentColor: '#c68a35',
      screwColor: 'from-[#3a3f4d] to-[#14161a]'
    },
    luxury: {
      panelBg: 'linear-gradient(180deg, #181a20 0%, #14161a 100%)',
      panelTexture: 'none',
      textureSize: '14px 14px',
      casingBorder: 'border-[#2a2e38] shadow-2xl',
      plateBorder: 'border-[#2a2e38] bg-[#14161a]',
      headerBg: 'bg-[#0b0c0e] border-[#2a2e38]',
      bezelStyle: 'steel',
      switchType: 'luxury_piano',
      accentColor: '#c68a35',
      screwColor: 'from-[#3a3f4d] to-[#14161a]'
    },
    offroad: {
      panelBg: 'linear-gradient(180deg, #181a20 0%, #14161a 100%)',
      panelTexture: 'none',
      textureSize: '6px 6px',
      casingBorder: 'border-[#2a2e38] shadow-2xl',
      plateBorder: 'border-[#2a2e38] bg-[#14161a]',
      headerBg: 'bg-[#0b0c0e] border-[#2a2e38]',
      bezelStyle: 'steel',
      switchType: 'offroad_rocker',
      accentColor: '#c68a35',
      screwColor: 'from-[#3a3f4d] to-[#14161a]'
    },
    emergency: {
      panelBg: 'linear-gradient(180deg, #181a20 0%, #14161a 100%)',
      panelTexture: 'none',
      textureSize: '10px 10px',
      casingBorder: 'border-[#2a2e38] shadow-2xl',
      plateBorder: 'border-[#2a2e38] bg-[#14161a]',
      headerBg: 'bg-[#0b0c0e] border-[#2a2e38]',
      bezelStyle: 'steel',
      switchType: 'tactical_switch',
      accentColor: '#c68a35',
      screwColor: 'from-[#3a3f4d] to-[#14161a]'
    },
    standard: {
      panelBg: 'linear-gradient(180deg, #181a20 0%, #14161a 100%)',
      panelTexture: 'none',
      textureSize: '10px 10px',
      casingBorder: 'border-[#2a2e38] shadow-2xl',
      plateBorder: 'border-[#2a2e38] bg-[#14161a]',
      headerBg: 'bg-[#0b0c0e] border-[#2a2e38]',
      bezelStyle: 'steel',
      switchType: 'standard_oem',
      accentColor: '#c68a35',
      screwColor: 'from-[#3a3f4d] to-[#14161a]'
    }
  }[theme];

  // Screws renderer for the metal chassis
  const renderCornerScrew = (position: string) => (
    <div 
      className={`absolute ${position} w-2.5 h-2.5 rounded-[1px] bg-[#2a2e38] border border-[#14161a] flex items-center justify-center pointer-events-none z-20`}
    >
      <div className="w-1.5 h-0.5 bg-[#0b0c0e]" />
    </div>
  );

  return (
    <div 
      id="radial-menu-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b0c0e]/85 backdrop-blur-md select-none p-3 overflow-y-auto animate-in fade-in duration-200 font-mono"
      onClick={onClose}
    >
      {/* COCKPIT SWITCHBOARD CONSOLE PANEL CHASSIS */}
      <div 
        id="cockpit-switchboard-panel"
        className="relative w-full max-w-[780px] rounded-[2px] border border-[#2a2e38] p-4 sm:p-6 transition-all duration-300 bg-[#14161a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chassis Corner Screws */}
        {renderCornerScrew('top-2 left-2')}
        {renderCornerScrew('top-2 right-2')}
        {renderCornerScrew('bottom-2 left-2')}
        {renderCornerScrew('bottom-2 right-2')}

        {/* Top Header Plate: Cockpit Panel Title & Telemetry Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[2px] border mb-4 bg-[#0b0c0e]/95 border-[#2a2e38] shadow-inner font-mono">
          {/* Vehicle Identity & Archetype Stamped Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-none flex items-center justify-center border border-[#c68a35] bg-[#c68a35]">
              <div className="w-1.5 h-1.5 rounded-none bg-[#0b0c0e]" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-black uppercase tracking-wider text-[#f0f3f6]">
                <span className="text-[#c68a35]">{themeMeta.badgeText}</span>
                <span className="text-[#3a3f4d]">|</span>
                <span className="text-[#cbd5e1]">{veh.nameRu || veh.type}</span>
              </div>
              <div className="text-[10px] text-[#9ba3af] font-mono flex items-center gap-2 mt-0.5">
                <span>БОРТОВАЯ СЕТЬ: <strong className="text-[#c68a35]">{voltage} В</strong></span>
                <span>•</span>
                <span>САЛОН: <strong className="text-[#d99a41]">{heaterTemp}°C</strong></span>
                <span>•</span>
                <span>МОТОР: <strong className={engTemp > 100 ? 'text-red-400 font-black' : 'text-[#c68a35]'}>{engTemp}°C</strong></span>
              </div>
            </div>
          </div>

          {/* Instrument Mini-Cluster & Close Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1 bg-[#14161a] px-3 py-1 rounded-[2px] border border-[#2a2e38] font-mono">
              <span className="text-lg font-black text-[#c68a35]">{speedKmh}</span>
              <span className="text-[9px] text-[#9ba3af] uppercase font-bold">км/ч</span>
              <span className="text-[#3a3f4d] mx-1">|</span>
              <span className="text-xs text-[#cbd5e1] font-bold">{rpm}</span>
              <span className="text-[9px] text-[#5a6272] uppercase">об/мин</span>
            </div>

            <button 
              id="radial-menu-close"
              onClick={onClose}
              className="p-2 rounded-[2px] bg-[#0b0c0e] hover:bg-[#1c1f26] border border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6] hover:border-[#c68a35]/50 transition-all cursor-pointer active:scale-98 shadow-md"
              title="Закрыть панель управления [Esc / E]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN SWITCHBOARD GRID: PHYSICAL TOGGLES, ROCKERS & SWITCHES               */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          
          {/* ================= 1. ENGINE IGNITION & STARTER ================= */}
          <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                ЗАЖИГАНИЕ [J]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-none border border-black ${
                  isEngineRunning 
                    ? 'bg-[#c68a35] shadow-[0_0_8px_#c68a35]' 
                    : isStalled 
                    ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse' 
                    : 'bg-[#2a2e38]'
                }`} 
              />
            </div>

            {/* Push-to-Start Button */}
            <button
              type="button"
              onClick={() => {
                sound.playButtonPress();
                if (onToggleEngine) onToggleEngine();
                if (navigator.vibrate) navigator.vibrate(25);
              }}
              className={`w-full mt-3 py-2.5 px-3 rounded-[2px] border flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                isEngineRunning
                  ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                  : isStalled
                  ? 'bg-amber-800/80 border-amber-500 text-amber-200 animate-pulse'
                  : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
              }`}
            >
              <Power className="w-4 h-4" />
              <span className="text-xs font-mono font-black uppercase tracking-wider">
                {isEngineRunning ? 'МОТОР ВКЛ' : isStalled ? 'ЗАГЛОХ (СТАРТ)' : 'СТАРТ / СТОП'}
              </span>
            </button>

            <span className="text-[8px] text-center font-mono text-[#5a6272] mt-2">
              {isEngineRunning ? 'Холостой ход активен' : 'Двигатель заглушен'}
            </span>
          </div>

          {/* ================= 2. HEADLIGHTS MULTI-POSITION SWITCH ================= */}
          <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                ФАРЫ [L]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-none border border-black ${
                  headlightsMode === 'high' 
                    ? 'bg-[#c68a35] shadow-[0_0_8px_#c68a35]' 
                    : headlightsMode === 'low' 
                    ? 'bg-[#d99a41]' 
                    : 'bg-[#2a2e38]'
                }`} 
              />
            </div>

            {/* 3-Position Rocker / Rotary Selector */}
            <div className="grid grid-cols-3 gap-1 mt-2.5 bg-[#0b0c0e] p-1 rounded-[2px] border border-[#2a2e38]">
              {(['off', 'low', 'high'] as const).map((mode) => {
                const isActive = headlightsMode === mode;
                const label = mode === 'off' ? 'ВЫКЛ' : mode === 'low' ? 'БЛИЖ' : 'ДАЛЬН';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      sound.playButtonPress();
                      if (headlightsMode !== mode) onToggleHeadlights();
                    }}
                    className={`py-1.5 text-[9px] font-mono font-black rounded-[2px] transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#c68a35] text-[#0b0c0e] font-black'
                        : 'text-[#9ba3af] hover:text-[#f0f3f6]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-2 text-[8px] font-mono text-[#9ba3af]">
              <span className="flex items-center gap-1">
                <Lightbulb className={`w-3 h-3 ${headlightsMode !== 'off' ? 'text-[#c68a35]' : 'text-[#5a6272]'}`} />
                <span>РЕЖИМ:</span>
              </span>
              <span className="font-bold text-[#f0f3f6] uppercase">
                {headlightsMode === 'off' ? 'ВЫКЛЮЧЕНЫ' : headlightsMode === 'low' ? 'БЛИЖНИЙ СВЕТ' : 'ДАЛЬНИЙ СВЕТ'}
              </span>
            </div>
          </div>

          {/* ================= 3. FRONT FOG LIGHTS (ПТФ) ================= */}
          <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                ПТФ ПЕРЕД [U]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-none border border-black ${
                  veh.frontFogLightsOn ? 'bg-[#c68a35] shadow-[0_0_8px_#c68a35]' : 'bg-[#2a2e38]'
                }`} 
              />
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playButtonPress();
                if (onToggleFrontFogLights) onToggleFrontFogLights();
                else veh.frontFogLightsOn = !veh.frontFogLightsOn;
              }}
              className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                veh.frontFogLightsOn
                  ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                  : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
              }`}
            >
              <Lightbulb className={`w-4 h-4 ${veh.frontFogLightsOn ? 'text-[#0b0c0e]' : 'text-[#9ba3af]'}`} />
              <span className="text-[11px] font-mono font-black uppercase">
                {veh.frontFogLightsOn ? 'ТУМБЛЕР: ВКЛ' : 'ТУМБЛЕР: ВЫКЛ'}
              </span>
              {veh.frontFogLightsOn ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
            </button>

            <span className="text-[8px] text-[#5a6272] font-mono mt-2">
              Передние противотуманные фары
            </span>
          </div>

          {/* ================= 4. REAR FOG LIGHTS ================= */}
          <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                ПТФ ЗАДНИЕ [Y]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-none border border-black ${
                  veh.rearFogLightsOn ? 'bg-[#c68a35] shadow-[0_0_8px_#c68a35]' : 'bg-[#2a2e38]'
                }`} 
              />
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playButtonPress();
                if (onToggleRearFogLights) onToggleRearFogLights();
                else veh.rearFogLightsOn = !veh.rearFogLightsOn;
              }}
              className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                veh.rearFogLightsOn
                  ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                  : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
              }`}
            >
              <Lightbulb className={`w-4 h-4 ${veh.rearFogLightsOn ? 'text-[#0b0c0e]' : 'text-[#9ba3af]'}`} />
              <span className="text-[11px] font-mono font-black uppercase">
                {veh.rearFogLightsOn ? 'ТУМБЛЕР: ВКЛ' : 'ТУМБЛЕР: ВЫКЛ'}
              </span>
              {veh.rearFogLightsOn ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
            </button>

            <span className="text-[8px] text-[#5a6272] font-mono mt-2">
              Задний фонарь повышенной яркости
            </span>
          </div>

          {/* ================= 5. HAZARD WARNING FLASHER ================= */}
          <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                АВАРИЙКА [X]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-none border border-black ${
                  turnSignal === 'hazard' ? 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping' : 'bg-[#2a2e38]'
                }`} 
              />
            </div>

            {/* Big Red Emergency Hazard Button */}
            <button
              type="button"
              onClick={() => {
                sound.playButtonPress();
                onToggleTurnSignal('hazard');
              }}
              className={`w-full mt-2.5 py-2.5 px-3 rounded-[2px] border flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                turnSignal === 'hazard'
                  ? 'bg-red-700 border-red-500 text-white animate-pulse'
                  : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-red-400 hover:text-red-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-mono font-black uppercase tracking-wider">
                {turnSignal === 'hazard' ? 'АВАРИЙКА: ВКЛ' : 'АВАРИЙКА'}
              </span>
            </button>

            <span className="text-[8px] text-center text-[#5a6272] font-mono mt-2">
              Синхронные указатели поворотов
            </span>
          </div>

          {/* ================= 6. TURN SIGNALS ================= */}
          <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                ПОВОРОТЫ [Z / C]
              </span>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-none ${turnSignal === 'left' ? 'bg-[#c68a35] animate-pulse' : 'bg-[#2a2e38]'}`} />
                <div className={`w-2 h-2 rounded-none ${turnSignal === 'right' ? 'bg-[#c68a35] animate-pulse' : 'bg-[#2a2e38]'}`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  onToggleTurnSignal('left');
                }}
                className={`py-2 px-2 rounded-[2px] border flex items-center justify-center gap-1 text-[10px] font-mono font-black transition-all cursor-pointer ${
                  turnSignal === 'left'
                    ? 'bg-[#c68a35] text-[#0b0c0e] border-[#d99a41]'
                    : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>ЛЕВЫЙ [Z]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  onToggleTurnSignal('right');
                }}
                className={`py-2 px-2 rounded-[2px] border flex items-center justify-center gap-1 text-[10px] font-mono font-black transition-all cursor-pointer ${
                  turnSignal === 'right'
                    ? 'bg-[#c68a35] text-[#0b0c0e] border-[#d99a41]'
                    : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
                }`}
              >
                <span>ПРАВЫЙ [C]</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[8px] font-mono text-[#9ba3af] mt-2">
              <span>СТАТУС:</span>
              <span className="font-bold text-[#f0f3f6] uppercase">
                {turnSignal === 'left' ? 'ЛЕВЫЙ БОРТ' : turnSignal === 'right' ? 'ПРАВЫЙ БОРТ' : turnSignal === 'hazard' ? 'АВАРИЙКА' : 'ВЫКЛЮЧЕНЫ'}
              </span>
            </div>
          </div>

          {/* ================= 7. WINDSHIELD WIPERS ================= */}
          <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                ДВОРНИКИ [K]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-none border border-black ${
                  wipersActive ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'
                }`} 
              />
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playButtonPress();
                onToggleWipers();
              }}
              className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                wipersActive
                  ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                  : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
              }`}
            >
              <CloudRain className="w-4 h-4" />
              <span className="text-[11px] font-mono font-black uppercase">
                {wipersActive ? 'ПРИВОД: ВКЛ' : 'ПРИВОД: ВЫКЛ'}
              </span>
              {wipersActive ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
            </button>

            <span className="text-[8px] text-[#5a6272] font-mono mt-2">
              Очиститель лобового стекла
            </span>
          </div>

          {/* ================= 8. CLIMATE CONTROL / HEATER ================= */}
          <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                КЛИМАТ / ПЕЧКА
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-none border border-black ${
                  heaterMode === 'high' 
                    ? 'bg-[#c68a35]' 
                    : heaterMode === 'med' 
                    ? 'bg-[#d99a41]' 
                    : heaterMode === 'low' 
                    ? 'bg-[#9ba3af]' 
                    : 'bg-[#2a2e38]'
                }`} 
              />
            </div>

            {/* 4-Step Rotary Switch Selector */}
            <div className="grid grid-cols-4 gap-1 mt-2 bg-[#0b0c0e] p-1 rounded-[2px] border border-[#2a2e38]">
              {(['off', 'low', 'med', 'high'] as const).map((m) => {
                const isActive = heaterMode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      sound.playButtonPress();
                      onChangeHeaterMode(m);
                    }}
                    className={`py-1 text-[8.5px] font-mono font-black rounded-[2px] transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#c68a35] text-[#0b0c0e] font-black'
                        : 'text-[#9ba3af] hover:text-[#f0f3f6]'
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* A/C & Recirculation Toggles */}
            <div className="grid grid-cols-2 gap-1.5 mt-2 bg-[#0b0c0e] p-1 rounded-[2px] border border-[#2a2e38]">
              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  if (onToggleAC) onToggleAC();
                }}
                className={`py-1 px-1.5 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 text-[8.5px] font-mono font-black ${
                  acActive
                    ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e]'
                    : 'bg-[#14161a] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Snowflake className="w-3 h-3" />
                  <span>A/C</span>
                </span>
                {acActive ? <span className="text-[7.5px] font-bold">ВКЛ</span> : <span className="text-[7.5px] text-[#5a6272]">ВЫКЛ</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  if (onToggleRecirc) onToggleRecirc();
                }}
                className={`py-1 px-1.5 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 text-[8.5px] font-mono font-black ${
                  recircActive
                    ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e]'
                    : 'bg-[#14161a] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
                }`}
              >
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  <span>РЕЦ.</span>
                </span>
                {recircActive ? <span className="text-[7.5px] font-bold">ВНУТ</span> : <span className="text-[7.5px] text-[#5a6272]">УЛИЦ</span>}
              </button>
            </div>

            <div className="flex items-center justify-between text-[8px] font-mono text-[#9ba3af] mt-2">
              <span className="flex items-center gap-1">
                <Fan className="w-3 h-3 text-[#c68a35]" />
                <span>САЛОН:</span>
              </span>
              <span className="font-bold text-[#f0f3f6]">
                {heaterTemp}°C
              </span>
            </div>
          </div>

          {/* ================= 9. POWER WINDOW ================= */}
          <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                ОКНО ДВЕРИ [O]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-none border border-black ${
                  isWindowOpen ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'
                }`} 
              />
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playUseItem();
                if (onToggleWindow) onToggleWindow();
                else veh.windowOpen = !veh.windowOpen;
              }}
              className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                isWindowOpen
                  ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                  : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
              }`}
            >
              <Wind className="w-4 h-4" />
              <span className="text-[11px] font-mono font-black uppercase">
                {isWindowOpen ? 'ОПУЩЕНО' : 'ПОДНЯТО'}
              </span>
              {isWindowOpen ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
            </button>

            <span className="text-[8px] text-[#5a6272] font-mono mt-2">
              {isWindowOpen ? 'Стекло открыто (приток воздуха)' : 'Стекло закрыто (герметично)'}
            </span>
          </div>

          {/* ================= 10. DIFFERENTIAL LOCK ================= */}
          {diffCaps.supported && (
            <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                  ДИФФЕРЕНЦИАЛ [V]
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-none border border-black ${
                    isDiffLocked ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'
                  }`} 
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onCycleDiffLock) {
                    onCycleDiffLock();
                  } else {
                    const res = cycleVehicleDiffLock(veh);
                    if (res.isEngaged) sound.playDiffLockEngage();
                    else if (res.changed) sound.playDiffLockDisengage();
                    else sound.playDiffLockWarning();
                  }
                }}
                className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                  isDiffLocked
                    ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                    : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[10.5px] font-mono font-black uppercase truncate max-w-[120px]">
                  {diffLockDesc}
                </span>
                {isDiffLocked ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
              </button>

              <span className="text-[8px] text-[#5a6272] font-mono mt-2">
                Блокировка дифференциала
              </span>
            </div>
          )}

          {/* ================= 11. TRAILER HITCH ================= */}
          <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                СЦЕПКА / ПРИЦЕП [H]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-none border border-black ${
                  veh.trailerId ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'
                }`} 
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (onToggleTrailerHitch) {
                  onToggleTrailerHitch();
                } else {
                  toggleTrailerHitch(veh, world);
                }
              }}
              className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                veh.trailerId
                  ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                  : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span className="text-[11px] font-mono font-black uppercase">
                {veh.trailerId ? 'СЦЕПЛЕН' : 'РАСЦЕПЛЕН'}
              </span>
              {veh.trailerId ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
            </button>

            <span className="text-[8px] text-[#5a6272] font-mono mt-2">
              Тягово-сцепное устройство (ТСУ)
            </span>
          </div>

          {/* ================= 12. ROAD TRAIN LIGHTS ================= */}
          {hasRoadTrainLights(veh) && (
            <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                  АВТОПОЕЗД [N]
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-none border border-black ${
                    veh.roadTrainLightsOn !== false ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'
                  }`} 
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  if (onToggleRoadTrainLights) {
                    onToggleRoadTrainLights();
                  } else {
                    veh.roadTrainLightsOn = !veh.roadTrainLightsOn;
                  }
                }}
                className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                  veh.roadTrainLightsOn !== false
                    ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                    : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span className="text-[11px] font-mono font-black uppercase">
                  {veh.roadTrainLightsOn !== false ? 'ОГНИ: ВКЛ' : 'ОГНИ: ВЫКЛ'}
                </span>
                {veh.roadTrainLightsOn !== false ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
              </button>

              <span className="text-[8px] text-[#5a6272] font-mono mt-2">
                3 опознавательных огня автопоезда
              </span>
            </div>
          )}

          {/* ================= 13. SPECIAL: SIREN ================= */}
          {['police', 'ambulance', 'ambulance_van', 'ambulance_suv', 'fire_engine', 'fire_ladder', 'fire_rescue'].includes(veh.type) && (
            <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                  СПЕЦСИГНАЛ [B]
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-none border border-black ${
                    sirenActive ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-ping' : 'bg-[#2a2e38]'
                  }`} 
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  onToggleSiren();
                }}
                className={`w-full mt-2.5 py-2.5 px-3 rounded-[2px] border flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                  sirenActive
                    ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                    : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
                }`}
              >
                <Siren className="w-4 h-4" />
                <span className="text-xs font-mono font-black uppercase tracking-wider">
                  {sirenActive ? 'СИРЕНА: АКТИВНА' : 'СИРЕНА / МАЯК'}
                </span>
              </button>

              <span className="text-[8px] text-center text-[#5a6272] font-mono mt-2">
                Проблесковые маяки и звуковой сигнал
              </span>
            </div>
          )}

          {/* ================= 14. GBO (LPG) ================= */}
          {veh.hasGBO && (
            <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                  ГБО (ПРОПАН) [K]
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-none border border-black ${
                    veh.fuelSystem?.gboActive !== false ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'
                  }`} 
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  if (veh.fuelSystem) {
                    veh.fuelSystem.gboActive = !veh.fuelSystem.gboActive;
                  }
                }}
                className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                  veh.fuelSystem?.gboActive !== false
                    ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                    : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span className="text-[11px] font-mono font-black uppercase">
                  {veh.fuelSystem?.gboActive !== false ? 'ГАЗ: ВКЛ' : 'БЕНЗИН'}
                </span>
                {veh.fuelSystem?.gboActive !== false ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
              </button>

              <span className="text-[8px] text-[#5a6272] font-mono mt-2">
                Запас газа: {Math.round(veh.fuelSystem?.gboLevel ?? 0)}%
              </span>
            </div>
          )}

          {/* ================= 15. SPECIAL: TRUCK WATER PTO PUMP ================= */}
          {(veh.type === 'truck_water' || veh.type === 'fire_engine') && (
            <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider">
                  КОМ / ВОДОНАСОС
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-none border border-black ${
                    veh.isPtoActive ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'
                  }`} 
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  veh.isPtoActive = !veh.isPtoActive;
                }}
                className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                  veh.isPtoActive
                    ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                    : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
                }`}
              >
                <Gauge className="w-4 h-4" />
                <span className="text-[11px] font-mono font-black uppercase">
                  {veh.isPtoActive ? 'НАСОС: ВКЛ' : 'НАСОС: ВЫКЛ'}
                </span>
                {veh.isPtoActive ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
              </button>

              <span className="text-[8px] text-[#5a6272] font-mono mt-2">
                Коробка отбора мощности
              </span>
            </div>
          )}

          {/* ================= 16. FLUID TANK DRAIN VALVE ================= */}
          {veh.fluidTank && veh.fluidTank.capacity > 0 && (
            <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider truncate max-w-[130px]">
                  СЛИВ {getLiquidNameRu(veh.fluidTank.liquidType)}
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-none border border-black ${
                    veh.fluidTank.drainValveOpen ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'
                  }`} 
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  veh.fluidTank!.drainValveOpen = !veh.fluidTank!.drainValveOpen;
                }}
                className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 shadow-sm ${
                  veh.fluidTank.drainValveOpen
                    ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black'
                    : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'
                }`}
              >
                <Droplet className="w-4 h-4" />
                <span className="text-[11px] font-mono font-black uppercase">
                  {veh.fluidTank.drainValveOpen ? 'КРАН: ОТКРЫТ' : 'КРАН: ЗАКРЫТ'}
                </span>
                {veh.fluidTank.drainValveOpen ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
              </button>

              <span className="text-[8px] text-[#5a6272] font-mono mt-2">
                Объём: {Math.round(veh.fluidTank.currentVolume ?? veh.fluidTank.currentAmount ?? 0)} / {veh.fluidTank.capacity} л
              </span>
            </div>
          )}

        </div>

        {/* Bottom Status / Instructions Bar */}
        <div className="mt-5 pt-3 border-t border-[#2a2e38] flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-[#9ba3af]">
          <div>
            Управление: клик мыши по тумблеру или клавиши на клавиатуре <span className="text-[#c68a35] font-bold">[J, L, U, Y, X, Z, C, K, P, O, V, H]</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-[#14161a] hover:bg-[#1c1f26] text-[#cbd5e1] hover:text-[#f0f3f6] rounded-[2px] border border-[#2a2e38] hover:border-[#c68a35]/50 cursor-pointer font-bold"
          >
            Закрыть панель [Esc]
          </button>
        </div>

      </div>
    </div>
  );
};

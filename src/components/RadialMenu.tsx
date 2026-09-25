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
  CheckCircle2
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
  onCycleDiffLock
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
      panelBg: 'linear-gradient(180deg, #292524 0%, #1c1917 40%, #141210 100%)',
      panelTexture: 'radial-gradient(#78350f 1px, transparent 1px)',
      textureSize: '12px 12px',
      casingBorder: 'border-amber-900 shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.1)]',
      plateBorder: 'border-amber-950/80 bg-stone-900/90',
      headerBg: 'bg-stone-950/90 border-amber-900/60',
      bezelStyle: 'brass',
      switchType: 'soviet_toggle',
      accentColor: '#f59e0b',
      screwColor: 'from-amber-600 via-amber-700 to-amber-900'
    },
    truck: {
      panelBg: 'linear-gradient(180deg, #1e293b 0%, #0f172a 40%, #090d16 100%)',
      panelTexture: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 4px)',
      textureSize: '4px 4px',
      casingBorder: 'border-slate-700 shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.15)]',
      plateBorder: 'border-slate-800 bg-slate-950/90',
      headerBg: 'bg-slate-950/95 border-sky-900/60',
      bezelStyle: 'steel',
      switchType: 'truck_rocker',
      accentColor: '#38bdf8',
      screwColor: 'from-slate-400 via-slate-600 to-slate-800'
    },
    retro: {
      panelBg: 'linear-gradient(180deg, #27272a 0%, #18181b 45%, #09090b 100%)',
      panelTexture: 'radial-gradient(#b45309 1px, transparent 1px)',
      textureSize: '16px 16px',
      casingBorder: 'border-amber-700/60 shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(245,230,211,0.2)]',
      plateBorder: 'border-amber-900/60 bg-stone-950/90',
      headerBg: 'bg-stone-950/95 border-amber-800/60',
      bezelStyle: 'chrome',
      switchType: 'soviet_toggle',
      accentColor: '#fbbf24',
      screwColor: 'from-amber-200 via-amber-400 to-amber-700'
    },
    sport: {
      panelBg: 'linear-gradient(180deg, #18181b 0%, #09090b 50%, #020617 100%)',
      panelTexture: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 4px)',
      textureSize: '6px 6px',
      casingBorder: 'border-red-900/80 shadow-[0_20px_60px_rgba(239,68,68,0.2),inset_0_2px_4px_rgba(255,255,255,0.1)]',
      plateBorder: 'border-zinc-800 bg-black/95',
      headerBg: 'bg-black/95 border-red-900/60',
      bezelStyle: 'anodized_red',
      switchType: 'missile_switch',
      accentColor: '#ef4444',
      screwColor: 'from-red-600 via-red-800 to-zinc-900'
    },
    luxury: {
      panelBg: 'linear-gradient(180deg, #1e293b 0%, #0f172a 45%, #020617 100%)',
      panelTexture: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
      textureSize: '14px 14px',
      casingBorder: 'border-slate-500/60 shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_2px_6px_rgba(255,255,255,0.25)]',
      plateBorder: 'border-slate-700 bg-slate-950/90',
      headerBg: 'bg-slate-950/95 border-slate-700',
      bezelStyle: 'platinum',
      switchType: 'luxury_piano',
      accentColor: '#e2e8f0',
      screwColor: 'from-slate-200 via-slate-400 to-slate-600'
    },
    offroad: {
      panelBg: 'linear-gradient(180deg, #1c1917 0%, #0c0a09 45%, #020617 100%)',
      panelTexture: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 3px, transparent 3px, transparent 6px)',
      textureSize: '6px 6px',
      casingBorder: 'border-emerald-800/80 shadow-[0_20px_60px_rgba(16,185,129,0.15),inset_0_2px_4px_rgba(255,255,255,0.1)]',
      plateBorder: 'border-stone-800 bg-stone-950/90',
      headerBg: 'bg-stone-950/95 border-emerald-900/60',
      bezelStyle: 'rubber_ring',
      switchType: 'offroad_rocker',
      accentColor: '#10b981',
      screwColor: 'from-emerald-600 via-stone-700 to-stone-900'
    },
    emergency: {
      panelBg: 'linear-gradient(180deg, #0f172a 0%, #020617 50%, #000000 100%)',
      panelTexture: 'radial-gradient(#0891b2 1px, transparent 1px)',
      textureSize: '10px 10px',
      casingBorder: 'border-cyan-700/80 shadow-[0_20px_60px_rgba(6,182,212,0.25),inset_0_2px_4px_rgba(255,255,255,0.15)]',
      plateBorder: 'border-cyan-900/60 bg-black/95',
      headerBg: 'bg-black/95 border-cyan-800/60',
      bezelStyle: 'steel',
      switchType: 'tactical_switch',
      accentColor: '#06b6d4',
      screwColor: 'from-cyan-400 via-slate-600 to-slate-900'
    },
    standard: {
      panelBg: 'linear-gradient(180deg, #1e293b 0%, #0f172a 40%, #020617 100%)',
      panelTexture: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
      textureSize: '10px 10px',
      casingBorder: 'border-slate-700/80 shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.1)]',
      plateBorder: 'border-slate-800 bg-slate-950/90',
      headerBg: 'bg-slate-950/95 border-slate-800',
      bezelStyle: 'steel',
      switchType: 'standard_oem',
      accentColor: '#94a3b8',
      screwColor: 'from-slate-400 via-slate-600 to-slate-800'
    }
  }[theme];

  // Screws renderer for the metal chassis
  const renderCornerScrew = (position: string) => (
    <div 
      className={`absolute ${position} w-3 h-3 rounded-full bg-linear-to-br ${panelStyles.screwColor} border border-black/80 shadow-md flex items-center justify-center pointer-events-none z-20`}
    >
      <div className="w-2 h-0.5 bg-black/80 transform rotate-45" />
    </div>
  );

  return (
    <div 
      id="radial-menu-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md select-none p-3 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* COCKPIT SWITCHBOARD CONSOLE PANEL CHASSIS */}
      <div 
        id="cockpit-switchboard-panel"
        className={`relative w-full max-w-[780px] rounded-3xl border-2 p-5 sm:p-6 transition-all duration-300 ${panelStyles.casingBorder}`}
        style={{
          background: panelStyles.panelBg,
          backgroundImage: `${panelStyles.panelTexture}, ${panelStyles.panelBg}`,
          backgroundSize: `${panelStyles.textureSize}, 100% 100%`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chassis Corner Screws */}
        {renderCornerScrew('top-3 left-3')}
        {renderCornerScrew('top-3 right-3')}
        {renderCornerScrew('bottom-3 left-3')}
        {renderCornerScrew('bottom-3 right-3')}

        {/* Top Header Plate: Cockpit Panel Title & Telemetry Status */}
        <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border mb-5 ${panelStyles.headerBg} shadow-inner`}>
          {/* Vehicle Identity & Archetype Stamped Badge */}
          <div className="flex items-center gap-2.5">
            <div 
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center border border-black shadow-sm"
              style={{ backgroundColor: panelStyles.accentColor }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-black uppercase tracking-wider text-white">
                <span>{themeMeta.badgeText}</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">{veh.nameRu || veh.type}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <span>БОРТОВАЯ СЕТЬ: <strong className="text-sky-300">{voltage} В</strong></span>
                <span>•</span>
                <span>САЛОН: <strong className="text-amber-300">{heaterTemp}°C</strong></span>
                <span>•</span>
                <span>МОТОР: <strong className={engTemp > 100 ? 'text-rose-400 font-black' : 'text-emerald-400'}>{engTemp}°C</strong></span>
              </div>
            </div>
          </div>

          {/* Instrument Mini-Cluster & Close Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1 bg-black/60 px-3 py-1 rounded-xl border border-white/10 font-mono">
              <span className="text-lg font-black text-white">{speedKmh}</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold">км/ч</span>
              <span className="text-slate-700 mx-1">|</span>
              <span className="text-xs text-slate-300 font-bold">{rpm}</span>
              <span className="text-[9px] text-slate-500 uppercase">об/мин</span>
            </div>

            <button 
              id="radial-menu-close"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95 shadow-md"
              title="Закрыть панель управления [Esc / E]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN SWITCHBOARD GRID: PHYSICAL TOGGLES, ROCKERS & SWITCHES               */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          
          {/* ================= 1. ENGINE IGNITION & STARTER ================= */}
          <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                ЗАЖИГАНИЕ [J]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-full border border-black ${
                  isEngineRunning 
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' 
                    : isStalled 
                    ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse' 
                    : 'bg-rose-500/40'
                }`} 
              />
            </div>

            {/* Heavy Push-to-Start Button / Key Cylinder */}
            <button
              type="button"
              onClick={() => {
                sound.playButtonPress();
                if (onToggleEngine) onToggleEngine();
                if (navigator.vibrate) navigator.vibrate(25);
              }}
              className={`w-full mt-3 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                isEngineRunning
                  ? 'bg-linear-to-b from-emerald-800 to-emerald-950 border-emerald-500 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                  : isStalled
                  ? 'bg-linear-to-b from-amber-800 to-amber-950 border-amber-500 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.35)] animate-pulse'
                  : 'bg-linear-to-b from-rose-900 via-rose-950 to-zinc-950 border-rose-700 text-rose-200'
              }`}
            >
              <Power className="w-4 h-4" />
              <span className="text-xs font-mono font-black uppercase tracking-wider">
                {isEngineRunning ? 'МОТОР ВКЛ' : isStalled ? 'ЗАГЛОХ (СТАРТ)' : 'СТАРТ / СТОП'}
              </span>
            </button>

            <span className="text-[8px] text-center font-mono text-slate-400 mt-2">
              {isEngineRunning ? 'Холостой ход активен' : 'Двигатель заглушен'}
            </span>
          </div>

          {/* ================= 2. HEADLIGHTS MULTI-POSITION SWITCH ================= */}
          <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                ФАРЫ [L]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-full border border-black ${
                  headlightsMode === 'high' 
                    ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' 
                    : headlightsMode === 'low' 
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' 
                    : 'bg-slate-700'
                }`} 
              />
            </div>

            {/* 3-Position Rocker / Rotary Selector */}
            <div className="grid grid-cols-3 gap-1 mt-2.5 bg-black/60 p-1 rounded-xl border border-white/10">
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
                    className={`py-1.5 text-[9px] font-mono font-black rounded-lg transition-all cursor-pointer ${
                      isActive 
                        ? mode === 'high'
                          ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                          : mode === 'low'
                          ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-2 text-[8px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Lightbulb className={`w-3 h-3 ${headlightsMode !== 'off' ? 'text-sky-400' : 'text-slate-600'}`} />
                <span>РЕЖИМ:</span>
              </span>
              <span className="font-bold text-white uppercase">
                {headlightsMode === 'off' ? 'ВЫКЛЮЧЕНЫ' : headlightsMode === 'low' ? 'БЛИЖНИЙ СВЕТ' : 'ДАЛЬНИЙ СВЕТ'}
              </span>
            </div>
          </div>

          {/* ================= 3. FRONT FOG LIGHTS (ПТФ) ================= */}
          <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                ПТФ ПЕРЕД [U]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-full border border-black ${
                  veh.frontFogLightsOn ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-slate-700'
                }`} 
              />
            </div>

            {/* Heavy Toggle Switch Graphic & Button */}
            <button
              type="button"
              onClick={() => {
                sound.playButtonPress();
                if (onToggleFrontFogLights) onToggleFrontFogLights();
                else veh.frontFogLightsOn = !veh.frontFogLightsOn;
              }}
              className={`w-full mt-2.5 py-2 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                veh.frontFogLightsOn
                  ? 'bg-linear-to-r from-amber-900/90 to-amber-950 border-amber-500 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Lightbulb className={`w-4 h-4 ${veh.frontFogLightsOn ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-[11px] font-mono font-black uppercase">
                {veh.frontFogLightsOn ? 'ТУМБЛЕР: ВКЛ' : 'ТУМБЛЕР: ВЫКЛ'}
              </span>
              {veh.frontFogLightsOn ? <ToggleRight className="w-4 h-4 text-amber-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}
            </button>

            <span className="text-[8px] text-slate-400 font-mono mt-2">
              Передние противотуманные фары
            </span>
          </div>

          {/* ================= 4. REAR FOG LIGHTS ================= */}
          <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                ПТФ ЗАДНИЕ [Y]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-full border border-black ${
                  veh.rearFogLightsOn ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-slate-700'
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
              className={`w-full mt-2.5 py-2 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                veh.rearFogLightsOn
                  ? 'bg-linear-to-r from-rose-900/90 to-rose-950 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Lightbulb className={`w-4 h-4 ${veh.rearFogLightsOn ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-[11px] font-mono font-black uppercase">
                {veh.rearFogLightsOn ? 'ТУМБЛЕР: ВКЛ' : 'ТУМБЛЕР: ВЫКЛ'}
              </span>
              {veh.rearFogLightsOn ? <ToggleRight className="w-4 h-4 text-rose-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}
            </button>

            <span className="text-[8px] text-slate-400 font-mono mt-2">
              Задний фонарь повышенной яркости
            </span>
          </div>

          {/* ================= 5. HAZARD WARNING FLASHER ================= */}
          <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                АВАРИЙКА [X]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-full border border-black ${
                  turnSignal === 'hazard' ? 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping' : 'bg-slate-700'
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
              className={`w-full mt-2.5 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                turnSignal === 'hazard'
                  ? 'bg-linear-to-b from-red-600 to-red-950 border-red-400 text-white shadow-[0_0_16px_rgba(239,68,68,0.5)] animate-pulse'
                  : 'bg-linear-to-b from-red-950/60 to-black border-red-900/60 text-red-300 hover:border-red-600'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${turnSignal === 'hazard' ? 'text-white' : 'text-red-400'}`} />
              <span className="text-xs font-mono font-black uppercase tracking-wider">
                {turnSignal === 'hazard' ? 'АВАРИЙКА: ВКЛ' : 'АВАРИЙКА'}
              </span>
            </button>

            <span className="text-[8px] text-center text-slate-400 font-mono mt-2">
              Синхронные указатели поворотов
            </span>
          </div>

          {/* ================= 6. TURN SIGNALS (ПОБОРОТНИКИ) ================= */}
          <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                ПОВОРОТЫ [Z / C]
              </span>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${turnSignal === 'left' ? 'bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]' : 'bg-slate-700'}`} />
                <div className={`w-2 h-2 rounded-full ${turnSignal === 'right' ? 'bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]' : 'bg-slate-700'}`} />
              </div>
            </div>

            {/* 3-Position Lever Rocker */}
            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  onToggleTurnSignal('left');
                }}
                className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1 text-[10px] font-mono font-black transition-all cursor-pointer ${
                  turnSignal === 'left'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
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
                className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1 text-[10px] font-mono font-black transition-all cursor-pointer ${
                  turnSignal === 'right'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <span>ПРАВЫЙ [C]</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 mt-2">
              <span>СТАТУС:</span>
              <span className="font-bold text-white uppercase">
                {turnSignal === 'left' ? 'ЛЕВЫЙ БОРТ' : turnSignal === 'right' ? 'ПРАВЫЙ БОРТ' : turnSignal === 'hazard' ? 'АВАРИЙКА' : 'ВЫКЛЮЧЕНЫ'}
              </span>
            </div>
          </div>

          {/* ================= 7. WINDSHIELD WIPERS ================= */}
          <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                ДВОРНИКИ [K]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-full border border-black ${
                  wipersActive ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' : 'bg-slate-700'
                }`} 
              />
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playButtonPress();
                onToggleWipers();
              }}
              className={`w-full mt-2.5 py-2 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                wipersActive
                  ? 'bg-linear-to-r from-indigo-900/90 to-indigo-950 border-indigo-500 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                  : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <CloudRain className={`w-4 h-4 ${wipersActive ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-[11px] font-mono font-black uppercase">
                {wipersActive ? 'ПРИВОД: ВКЛ' : 'ПРИВОД: ВЫКЛ'}
              </span>
              {wipersActive ? <ToggleRight className="w-4 h-4 text-indigo-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}
            </button>

            <span className="text-[8px] text-slate-400 font-mono mt-2">
              Очиститель лобового стекла
            </span>
          </div>

          {/* ================= 8. CLIMATE CONTROL / HEATER ================= */}
          <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                КЛИМАТ / ПЕЧКА [P]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-full border border-black ${
                  heaterMode === 'high' 
                    ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' 
                    : heaterMode === 'med' 
                    ? 'bg-orange-400 shadow-[0_0_8px_#fb923c]' 
                    : heaterMode === 'low' 
                    ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' 
                    : 'bg-slate-700'
                }`} 
              />
            </div>

            {/* 4-Step Rotary Switch Selector */}
            <div className="grid grid-cols-4 gap-1 mt-2.5 bg-black/60 p-1 rounded-xl border border-white/10">
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
                    className={`py-1 text-[8.5px] font-mono font-black rounded-lg transition-all cursor-pointer ${
                      isActive 
                        ? m === 'high'
                          ? 'bg-rose-500 text-white font-black'
                          : m === 'med'
                          ? 'bg-orange-500 text-white font-black'
                          : m === 'low'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <Fan className={`w-3 h-3 ${heaterMode !== 'off' ? 'text-amber-400 animate-spin' : 'text-slate-600'}`} />
                <span>ТЕМПЕРАТУРА:</span>
              </span>
              <span className="font-bold text-white">
                {heaterTemp}°C
              </span>
            </div>
          </div>

          {/* ================= 9. POWER WINDOW (ОКНО) ================= */}
          <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                ОКНО ДВЕРИ [O]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-full border border-black ${
                  isWindowOpen ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-slate-700'
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
              className={`w-full mt-2.5 py-2 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                isWindowOpen
                  ? 'bg-linear-to-r from-cyan-900/90 to-cyan-950 border-cyan-500 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Wind className={`w-4 h-4 ${isWindowOpen ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-[11px] font-mono font-black uppercase">
                {isWindowOpen ? 'ОПУЩЕНО' : 'ПОДНЯТО'}
              </span>
              {isWindowOpen ? <ToggleRight className="w-4 h-4 text-cyan-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}
            </button>

            <span className="text-[8px] text-slate-400 font-mono mt-2">
              {isWindowOpen ? 'Стекло открыто (приток воздуха)' : 'Стекло закрыто (герметично)'}
            </span>
          </div>

          {/* ================= 10. DIFFERENTIAL LOCK (ЕСЛИ ПОДДЕРЖИВАЕТСЯ) ================= */}
          {diffCaps.supported && (
            <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                  ДИФФЕРЕНЦИАЛ [V]
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-full border border-black ${
                    isDiffLocked ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-pulse' : 'bg-slate-700'
                  }`} 
                />
              </div>

              {/* Safety Guarded Heavy Flip-Switch */}
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
                className={`w-full mt-2.5 py-2 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                  isDiffLocked
                    ? 'bg-linear-to-r from-amber-900/90 via-amber-950 to-black border-amber-400 text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert className={`w-4 h-4 ${isDiffLocked ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="text-[10.5px] font-mono font-black uppercase truncate max-w-[120px]">
                  {diffLockDesc}
                </span>
                {isDiffLocked ? <ToggleRight className="w-4 h-4 text-amber-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}
              </button>

              <span className="text-[8px] text-slate-400 font-mono mt-2">
                Блокировка межосевого/межколесного
              </span>
            </div>
          )}

          {/* ================= 11. TRAILER HITCH / COUPLING ================= */}
          <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                СЦЕПКА / ПРИЦЕП [H]
              </span>
              <div 
                className={`w-2.5 h-2.5 rounded-full border border-black ${
                  veh.trailerId ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-slate-700'
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
              className={`w-full mt-2.5 py-2 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                veh.trailerId
                  ? 'bg-linear-to-r from-amber-900/90 to-amber-950 border-amber-500 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Link2 className={`w-4 h-4 ${veh.trailerId ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="text-[11px] font-mono font-black uppercase">
                {veh.trailerId ? 'СЦЕПЛЕН' : 'РАСЦЕПЛЕН'}
              </span>
              {veh.trailerId ? <ToggleRight className="w-4 h-4 text-amber-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}
            </button>

            <span className="text-[8px] text-slate-400 font-mono mt-2">
              Тягово-сцепное устройство (ТСУ)
            </span>
          </div>

          {/* ================= 12. SPECIAL: ROAD TRAIN LIGHTS ================= */}
          {hasRoadTrainLights(veh) && (
            <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                  АВТОПОЕЗД [N]
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-full border border-black ${
                    veh.roadTrainLightsOn !== false ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-slate-700'
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
                className={`w-full mt-2.5 py-2 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                  veh.roadTrainLightsOn !== false
                    ? 'bg-linear-to-r from-amber-900/90 to-amber-950 border-amber-500 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Truck className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-mono font-black uppercase">
                  {veh.roadTrainLightsOn !== false ? 'ОГНИ: ВКЛ' : 'ОГНИ: ВЫКЛ'}
                </span>
                {veh.roadTrainLightsOn !== false ? <ToggleRight className="w-4 h-4 text-amber-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}
              </button>

              <span className="text-[8px] text-slate-400 font-mono mt-2">
                3 жёлтых опознавательных огня на крыше
              </span>
            </div>
          )}

          {/* ================= 13. SPECIAL: SIREN / EMERGENCY BEACON ================= */}
          {['police', 'ambulance', 'ambulance_van', 'ambulance_suv', 'fire_engine', 'fire_ladder', 'fire_rescue'].includes(veh.type) && (
            <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                  СПЕЦСИГНАЛ [B]
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-full border border-black ${
                    sirenActive ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-ping' : 'bg-slate-700'
                  }`} 
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  onToggleSiren();
                }}
                className={`w-full mt-2.5 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                  sirenActive
                    ? 'bg-linear-to-b from-cyan-600 to-cyan-950 border-cyan-400 text-white shadow-[0_0_16px_rgba(6,182,212,0.5)] animate-pulse'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Siren className={`w-4 h-4 ${sirenActive ? 'text-white animate-spin' : 'text-cyan-400'}`} />
                <span className="text-xs font-mono font-black uppercase tracking-wider">
                  {sirenActive ? 'СИРЕНА: АКТИВНА' : 'СИРЕНА / МАЯК'}
                </span>
              </button>

              <span className="text-[8px] text-center text-slate-400 font-mono mt-2">
                Проблесковые маяки и звуковой сигнал
              </span>
            </div>
          )}

          {/* ================= 14. SPECIAL: GBO (LPG FUEL SYSTEM) ================= */}
          {veh.hasGBO && (
            <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                  ГБО (ПРОПАН) [K]
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-full border border-black ${
                    veh.fuelSystem?.gboActive !== false ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]' : 'bg-slate-700'
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
                className={`w-full mt-2.5 py-2 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                  veh.fuelSystem?.gboActive !== false
                    ? 'bg-linear-to-r from-yellow-900/90 to-yellow-950 border-yellow-500 text-yellow-200 shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-[11px] font-mono font-black uppercase">
                  {veh.fuelSystem?.gboActive !== false ? 'ГАЗ: ВКЛ' : 'БЕНЗИН'}
                </span>
                {veh.fuelSystem?.gboActive !== false ? <ToggleRight className="w-4 h-4 text-yellow-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}
              </button>

              <span className="text-[8px] text-slate-400 font-mono mt-2">
                Запас газа: {Math.round(veh.fuelSystem?.gboLevel ?? 0)}%
              </span>
            </div>
          )}

          {/* ================= 15. SPECIAL: TRUCK WATER PTO PUMP ================= */}
          {(veh.type === 'truck_water' || veh.type === 'fire_engine') && (
            <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                  КОМ / ВОДОНАСОС
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-full border border-black ${
                    veh.isPtoActive ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : 'bg-slate-700'
                  }`} 
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  veh.isPtoActive = !veh.isPtoActive;
                }}
                className={`w-full mt-2.5 py-2 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                  veh.isPtoActive
                    ? 'bg-linear-to-r from-sky-900/90 to-sky-950 border-sky-500 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Gauge className="w-4 h-4 text-sky-400" />
                <span className="text-[11px] font-mono font-black uppercase">
                  {veh.isPtoActive ? 'НАСОС: ВКЛ' : 'НАСОС: ВЫКЛ'}
                </span>
                {veh.isPtoActive ? <ToggleRight className="w-4 h-4 text-sky-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}
              </button>

              <span className="text-[8px] text-slate-400 font-mono mt-2">
                Коробка отбора мощности
              </span>
            </div>
          )}

          {/* ================= 16. SPECIAL: FLUID TANK DRAIN VALVE ================= */}
          {veh.fluidTank && veh.fluidTank.capacity > 0 && (
            <div className={`flex flex-col justify-between p-3.5 rounded-2xl border shadow-lg ${panelStyles.plateBorder}`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider truncate max-w-[130px]">
                  СЛИВ {getLiquidNameRu(veh.fluidTank.liquidType)}
                </span>
                <div 
                  className={`w-2.5 h-2.5 rounded-full border border-black ${
                    veh.fluidTank.drainValveOpen ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping' : 'bg-slate-700'
                  }`} 
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playButtonPress();
                  veh.fluidTank!.drainValveOpen = !veh.fluidTank!.drainValveOpen;
                }}
                className={`w-full mt-2.5 py-2 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
                  veh.fluidTank.drainValveOpen
                    ? 'bg-linear-to-r from-rose-900/90 to-rose-950 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Droplet className="w-4 h-4 text-sky-400" />
                <span className="text-[11px] font-mono font-black uppercase">
                  {veh.fluidTank.drainValveOpen ? 'КРАН: ОТКРЫТ' : 'КРАН: ЗАКРЫТ'}
                </span>
                {veh.fluidTank.drainValveOpen ? <ToggleRight className="w-4 h-4 text-rose-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}
              </button>

              <span className="text-[8px] text-slate-400 font-mono mt-2">
                Объём: {Math.round(veh.fluidTank.currentVolume ?? veh.fluidTank.currentAmount ?? 0)} / {veh.fluidTank.capacity} л
              </span>
            </div>
          )}

        </div>

        {/* Bottom Status / Instructions Bar */}
        <div className="mt-5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-slate-500">
          <div>
            Управление: клик мыши по тумблеру или клавиши на клавиатуре <span className="text-slate-300 font-bold">[J, L, U, Y, X, Z, C, K, P, O, V, H]</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 cursor-pointer font-bold"
          >
            Закрыть панель [Esc]
          </button>
        </div>

      </div>
    </div>
  );
};

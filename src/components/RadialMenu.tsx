import React from 'react';
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
  Gauge
} from 'lucide-react';
import { sound } from '../audio';

interface RadialMenuProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  world: GameWorld | null;
  onToggleWipers: () => void;
  onToggleHeadlights: () => void;
  onToggleSiren: () => void;
  onToggleTurnSignal: (signal: 'left' | 'right' | 'hazard') => void;
  onChangeHeaterMode: (mode: 'off' | 'low' | 'med' | 'high') => void;
  onToggleWindow?: () => void;
  onToggleEngine?: () => void;
}

export const RadialMenu: React.FC<RadialMenuProps> = ({
  isOpen,
  onClose,
  player,
  world,
  onToggleWipers,
  onToggleHeadlights,
  onToggleSiren,
  onToggleTurnSignal,
  onChangeHeaterMode,
  onToggleWindow,
  onToggleEngine
}) => {
  if (!isOpen || !player || !world) return null;

  const veh = world.vehicles.find(v => v.id === player.currentVehicleId);
  if (!veh) return null;

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
  const isWindowOpen = !!veh.windowOpen;
  const speedKmh = Math.round(Math.abs(veh.speed) * 3.6);

  // 8 Orbital sector items around the central cluster
  const menuItems = [
    {
      id: 'headlights',
      label: 'ФАРЫ',
      keyHint: 'L',
      sub: headlightsMode === 'off' ? 'ВЫКЛ' : headlightsMode === 'low' ? 'БЛИЖНИЙ' : 'ДАЛЬНИЙ',
      icon: <Lightbulb className="w-5 h-5" />,
      active: headlightsMode !== 'off',
      badgeColor: headlightsMode === 'high' ? 'bg-sky-500 text-sky-950' : headlightsMode === 'low' ? 'bg-emerald-500 text-emerald-950' : 'bg-slate-700 text-slate-300',
      activeBorder: headlightsMode === 'high' ? 'border-sky-400/80 shadow-sky-500/20 text-sky-400' : headlightsMode === 'low' ? 'border-emerald-400/80 shadow-emerald-500/20 text-emerald-400' : 'border-slate-700/80 text-slate-400',
      action: () => {
        sound.playButtonPress();
        onToggleHeadlights();
      }
    },
    {
      id: 'heater',
      label: 'КЛИМАТ / ПЕЧКА',
      keyHint: 'P',
      sub: heaterMode === 'off' ? 'ВЫКЛ' : `${heaterMode.toUpperCase()} (${heaterTemp}°C)`,
      icon: (
        <Fan 
          className={`w-5 h-5 ${heaterMode !== 'off' ? 'animate-spin text-amber-400' : ''}`} 
          style={{ animationDuration: heaterMode === 'high' ? '0.5s' : heaterMode === 'med' ? '1.0s' : '1.8s' }} 
        />
      ),
      active: heaterMode !== 'off',
      badgeColor: heaterMode === 'high' ? 'bg-rose-500 text-rose-950' : heaterMode === 'med' ? 'bg-orange-500 text-orange-950' : heaterMode === 'low' ? 'bg-amber-500 text-amber-950' : 'bg-slate-700 text-slate-300',
      activeBorder: heaterMode === 'high' ? 'border-rose-400/80 shadow-rose-500/20 text-rose-400' : heaterMode === 'med' ? 'border-orange-400/80 shadow-orange-500/20 text-orange-400' : heaterMode === 'low' ? 'border-amber-400/80 shadow-amber-500/20 text-amber-400' : 'border-slate-700/80 text-slate-400',
      action: () => {
        sound.playButtonPress();
        const modes: ('off' | 'low' | 'med' | 'high')[] = ['off', 'low', 'med', 'high'];
        const nextIdx = (modes.indexOf(heaterMode) + 1) % modes.length;
        onChangeHeaterMode(modes[nextIdx]);
      }
    },
    {
      id: 'window',
      label: 'ОКНО',
      keyHint: 'O',
      sub: isWindowOpen ? 'ОТКРЫТО' : 'ЗАКРЫТО',
      icon: <Wind className={`w-5 h-5 ${isWindowOpen ? 'text-cyan-400 animate-pulse' : ''}`} />,
      active: isWindowOpen,
      badgeColor: isWindowOpen ? 'bg-cyan-500 text-cyan-950' : 'bg-slate-700 text-slate-300',
      activeBorder: isWindowOpen ? 'border-cyan-400/80 shadow-cyan-500/25 text-cyan-400' : 'border-slate-700/80 text-slate-400',
      action: () => {
        sound.playUseItem();
        if (onToggleWindow) {
          onToggleWindow();
        } else {
          veh.windowOpen = !veh.windowOpen;
        }
      }
    },
    {
      id: 'sig_right',
      label: 'ПОВОРОТНИК',
      keyHint: 'C',
      sub: turnSignal === 'right' ? 'ПРАВЫЙ' : 'ВЫКЛ',
      icon: <ChevronRight className={`w-5 h-5 ${turnSignal === 'right' ? 'text-amber-400 animate-pulse' : ''}`} />,
      active: turnSignal === 'right',
      badgeColor: turnSignal === 'right' ? 'bg-amber-500 text-amber-950' : 'bg-slate-700 text-slate-300',
      activeBorder: turnSignal === 'right' ? 'border-amber-400/80 shadow-amber-500/20 text-amber-400' : 'border-slate-700/80 text-slate-400',
      action: () => {
        sound.playButtonPress();
        onToggleTurnSignal('right');
      }
    },
    {
      id: 'hazard',
      label: 'АВАРИЙКА',
      keyHint: 'X',
      sub: turnSignal === 'hazard' ? 'МИГАЕТ' : 'ВЫКЛ',
      icon: <AlertTriangle className={`w-5 h-5 ${turnSignal === 'hazard' ? 'text-red-400 animate-ping' : ''}`} />,
      active: turnSignal === 'hazard',
      badgeColor: turnSignal === 'hazard' ? 'bg-red-500 text-red-950 animate-pulse' : 'bg-slate-700 text-slate-300',
      activeBorder: turnSignal === 'hazard' ? 'border-red-400/80 shadow-red-500/30 text-red-400' : 'border-slate-700/80 text-slate-400',
      action: () => {
        sound.playButtonPress();
        onToggleTurnSignal('hazard');
      }
    },
    {
      id: 'wipers',
      label: 'ДВОРНИКИ',
      keyHint: 'K',
      sub: wipersActive ? 'ВКЛЮЧЕНЫ' : 'ВЫКЛ',
      icon: <CloudRain className={`w-5 h-5 ${wipersActive ? 'text-indigo-400 animate-pulse' : ''}`} />,
      active: wipersActive,
      badgeColor: wipersActive ? 'bg-indigo-500 text-indigo-950' : 'bg-slate-700 text-slate-300',
      activeBorder: wipersActive ? 'border-indigo-400/80 shadow-indigo-500/20 text-indigo-400' : 'border-slate-700/80 text-slate-400',
      action: () => {
        sound.playButtonPress();
        onToggleWipers();
      }
    },
    {
      id: 'engine',
      label: 'ЗАЖИГАНИЕ',
      keyHint: 'J',
      sub: isEngineRunning ? 'РАБОТАЕТ' : 'ВЫКЛ',
      icon: <Power className={`w-5 h-5 ${isEngineRunning ? 'text-green-400' : 'text-red-400'}`} />,
      active: isEngineRunning,
      badgeColor: isEngineRunning ? 'bg-green-500 text-green-950' : 'bg-red-500 text-red-950',
      activeBorder: isEngineRunning ? 'border-green-400/80 shadow-green-500/25 text-green-400' : 'border-slate-700/80 text-red-400',
      action: () => {
        sound.playButtonPress();
        if (onToggleEngine) onToggleEngine();
      }
    },
    {
      id: 'sig_left',
      label: 'ПОВОРОТНИК',
      keyHint: 'Z',
      sub: turnSignal === 'left' ? 'ЛЕВЫЙ' : 'ВЫКЛ',
      icon: <ChevronLeft className={`w-5 h-5 ${turnSignal === 'left' ? 'text-amber-400 animate-pulse' : ''}`} />,
      active: turnSignal === 'left',
      badgeColor: turnSignal === 'left' ? 'bg-amber-500 text-amber-950' : 'bg-slate-700 text-slate-300',
      activeBorder: turnSignal === 'left' ? 'border-amber-400/80 shadow-amber-500/20 text-amber-400' : 'border-slate-700/80 text-slate-400',
      action: () => {
        sound.playButtonPress();
        onToggleTurnSignal('left');
      }
    }
  ];

  return (
    <div 
      id="radial-menu-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-lg select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="radial-menu-container"
        className="relative w-[450px] h-[450px] flex items-center justify-center rounded-full border border-slate-700/50 bg-slate-950/70 shadow-[0_0_80px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Decorative Orbital Ring Track */}
        <div className="absolute inset-8 rounded-full border border-slate-700/30 pointer-events-none" />
        <div className="absolute inset-16 rounded-full border border-dashed border-slate-800 pointer-events-none" />

        {/* Close Button */}
        <button 
          id="radial-menu-close"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900 border border-slate-700/70 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg z-20"
          title="Закрыть меню [E / Esc]"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ================================================================= */}
        {/* CENTER DIGITAL INSTRUMENT CLUSTER */}
        {/* ================================================================= */}
        <div 
          id="radial-menu-cockpit-cluster"
          className="relative w-[164px] h-[164px] rounded-full bg-slate-900 border-2 border-slate-700/70 flex flex-col items-center justify-center text-center p-2.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8),0_0_30px_rgba(15,23,42,0.8)] z-10"
        >
          {/* Top Label & Speed */}
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-slate-400">
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span>СПИДОМЕТР</span>
          </div>
          
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-black tracking-tight text-white font-mono">{speedKmh}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">км/ч</span>
          </div>

          {/* Engine & Cabin Status */}
          <div className="w-full flex flex-col gap-1 mt-1.5 pt-1.5 border-t border-slate-800 text-[10px]">
            {/* Engine coolant temp */}
            <div className="flex items-center justify-between px-1">
              <span className="text-slate-400 text-[9px]">Двигатель:</span>
              <span className={`font-mono font-bold text-[10px] ${engTemp < 60 ? 'text-sky-400' : engTemp > 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {engTemp}°C
              </span>
            </div>

            {/* Cabin climate & window */}
            <div className="flex items-center justify-between px-1">
              <span className="text-slate-400 text-[9px]">Салон:</span>
              <span className={`font-mono font-bold text-[10px] ${heaterTemp < 16 ? 'text-sky-400' : heaterTemp > 28 ? 'text-orange-400' : 'text-slate-200'}`}>
                {heaterTemp}°C {isWindowOpen ? '(откр)' : '(закр)'}
              </span>
            </div>

            {/* Windshield Fog / Rain indicator */}
            {(fogPercent > 0 || rainPercent > 0) && (
              <div className="flex items-center justify-between px-1 text-[9px]">
                <span className="text-slate-400">Стекло:</span>
                <span className={`font-mono font-bold ${fogPercent > 35 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {fogPercent > 0 ? `Туман ${fogPercent}%` : `Дождь ${rainPercent}%`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 8 RADIAL SECTOR BUTTONS (MATHEMATICALLY CALCULATED DISTANCE) */}
        {/* ================================================================= */}
        {menuItems.map((item, index) => {
          // 8 items = 45 degrees step. Start at top (-90 degrees)
          const angle = (index * (360 / menuItems.length) - 90) * (Math.PI / 180);
          const orbitRadius = 146; // Distance from center
          const x = Math.round(Math.cos(angle) * orbitRadius);
          const y = Math.round(Math.sin(angle) * orbitRadius);

          return (
            <button
              key={item.id}
              id={`radial-btn-${item.id}`}
              onClick={() => {
                item.action();
                if (navigator.vibrate) navigator.vibrate(12);
              }}
              className={`absolute w-[78px] h-[72px] rounded-2xl border bg-slate-900/90 hover:bg-slate-800 flex flex-col items-center justify-center text-center p-1.5 shadow-xl transition-all duration-150 hover:scale-105 active:scale-95 group ${item.activeBorder} ${item.active ? 'shadow-md' : ''}`}
              style={{
                transform: `translate(${x}px, ${y}px)`
              }}
            >
              {/* Keyboard shortcut hint badge */}
              <span className="absolute -top-2 -right-1 px-1.5 py-0.2 rounded-md bg-slate-800/90 border border-slate-700 text-[8px] font-mono text-slate-300 font-bold shadow">
                [{item.keyHint}]
              </span>

              {/* Icon */}
              <div className="transition-transform group-hover:scale-110">
                {item.icon}
              </div>

              {/* Title & Sub */}
              <span className="text-[8px] tracking-wider mt-1 uppercase font-black text-slate-200 line-clamp-1">
                {item.label}
              </span>
              <span className={`text-[7px] font-bold mt-0.5 px-1 py-0.2 rounded ${item.badgeColor}`}>
                {item.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

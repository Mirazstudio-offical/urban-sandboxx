import React, { useState } from 'react';
import { Vehicle, CarType } from '../types';
import { 
  Fuel, 
  Thermometer, 
  Droplet, 
  ArrowLeft, 
  ArrowRight, 
  AlertTriangle, 
  Lightbulb, 
  Power, 
  ChevronDown, 
  ChevronUp,
  Gauge,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { sound } from '../audio';

export type DashboardTheme = 'sport' | 'truck' | 'retro' | 'emergency' | 'luxury';

export function getVehicleDashboardTheme(type?: CarType): DashboardTheme {
  if (!type) return 'luxury';
  
  switch (type) {
    case 'supercar':
    case 'sports':
    case 'muscle':
    case 'muscle_classic':
    case 'hatch_hot':
    case 'coupe_gt':
      return 'sport';

    case 'truck_box':
    case 'truck_dump':
    case 'truck_tanker':
    case 'truck_water':
    case 'truck_flatbed':
    case 'truck_tow':
    case 'truck_armored':
    case 'cement_mixer':
    case 'garbage_truck':
    case 'delivery_truck':
    case 'bus':
    case 'bus_minibus':
    case 'pickup':
    case 'offroad_hardcore':
      return 'truck';

    case 'retro_bubble':
    case 'classic_compact':
    case 'micro_car':
    case 'sedan_classic':
    case 'wagon_classic':
      return 'retro';

    case 'police':
    case 'ambulance':
    case 'ambulance_van':
    case 'ambulance_suv':
    case 'fire_engine':
    case 'fire_ladder':
    case 'fire_rescue':
    case 'taxi':
      return 'emergency';

    case 'sedan_luxury':
    case 'suv_luxury':
    case 'wagon_modern':
    case 'wagon_allroad':
    case 'crossover_compact':
    case 'suv':
    case 'suv_classic_box':
    case 'van':
    case 'van_camper':
    case 'van_cargo_old':
    case 'sedan':
    case 'sedan_compact':
    case 'hatchback':
    default:
      return 'luxury';
  }
}

interface SpeedometerHUDProps {
  vehicle: Vehicle | null;
  speedKmh: number;
  gear: 'P' | 'D' | 'R' | string;
  isDrifting?: boolean;
  isHandbraking?: boolean;
  playerTurnSignal?: 'none' | 'left' | 'right' | 'hazard';
  playerHeadlightMode?: 'off' | 'low' | 'high';
  onToggleTurnSignal?: (signal: 'left' | 'right' | 'hazard') => void;
  onToggleHeadlights?: () => void;
  onToggleEngine?: () => void;
  onOpenRadialMenu?: () => void;
  onSelectGear?: (gear: 'P' | 'R' | 'N' | 'D' | number | string) => void;
}

export const SpeedometerHUD: React.FC<SpeedometerHUDProps> = ({
  vehicle,
  speedKmh,
  gear,
  isDrifting = false,
  isHandbraking = false,
  playerTurnSignal = 'none',
  playerHeadlightMode = 'off',
  onToggleTurnSignal,
  onToggleHeadlights,
  onToggleEngine,
  onOpenRadialMenu,
  onSelectGear,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (!vehicle) return null;

  const carType = vehicle.type;
  const theme = getVehicleDashboardTheme(carType);
  const eng = vehicle.engineState;
  const fuel = vehicle.fuelSystem;

  // Real-time sensor values
  const currentRPM = eng?.engineRunning ? Math.round(eng.engineRPM || 800) : 0;
  const coolantTemp = Math.round(eng?.temperature ?? 88);
  const oilPressure = Math.round(eng?.oilPressure ?? (eng?.oilLevel ?? 90));
  const fuelLevel = Math.round(fuel?.tankLevel ?? 75);
  const isEngineRunning = !!eng?.engineRunning;
  const isStalled = !!eng?.isStalled || !!eng?.engineStalled;
  const batteryCharge = Math.round(eng?.batteryCharge ?? 100);

  // Transmission & Gear display
  let currentGearLabel = String(gear);
  if (eng?.transmissionType === 'MANUAL') {
    if (eng.currentGear === -1) currentGearLabel = 'R';
    else if (eng.currentGear === 0) currentGearLabel = 'N';
    else currentGearLabel = String(eng.currentGear);
  } else {
    const autoMode = eng?.autoGearMode || (typeof gear === 'string' && ['P', 'R', 'N', 'D'].includes(gear) ? gear : 'D');
    if (autoMode === 'D') {
      currentGearLabel = eng?.currentGear && eng.currentGear > 1 ? `D${eng.currentGear}` : 'D';
    } else {
      currentGearLabel = autoMode;
    }
  }

  // Max scales based on car theme
  let maxSpeed = 240;
  let maxRPM = 8000;
  let redlineRPM = 6200;

  if (theme === 'sport') {
    maxSpeed = 340;
    maxRPM = 9000;
    redlineRPM = 7000;
  } else if (theme === 'truck') {
    maxSpeed = 140;
    maxRPM = 4500;
    redlineRPM = 3200;
  } else if (theme === 'retro') {
    maxSpeed = 180;
    maxRPM = 6500;
    redlineRPM = 5200;
  } else if (theme === 'emergency') {
    maxSpeed = 260;
    maxRPM = 7500;
    redlineRPM = 6200;
  }

  // Calculate needle angles: -125deg to +125deg for circular main gauges
  const speedRatio = Math.max(0, Math.min(1, speedKmh / maxSpeed));
  const speedAngle = -125 + speedRatio * 250;

  const rpmRatio = Math.max(0, Math.min(1, currentRPM / maxRPM));
  const rpmAngle = -125 + rpmRatio * 250;

  // Small auxiliary gauges: -55deg to +55deg
  const fuelRatio = Math.max(0, Math.min(1, fuelLevel / 100));
  const fuelAngle = -55 + fuelRatio * 110;

  const tempRatio = Math.max(0, Math.min(1, (coolantTemp - 40) / (130 - 40)));
  const tempAngle = -55 + tempRatio * 110;

  const oilRatio = Math.max(0, Math.min(1, oilPressure / 100));
  const oilAngle = -55 + oilRatio * 110;

  // Warning indicators
  const isOverheating = coolantTemp >= 105;
  const isLowOil = oilPressure < 20 || (eng && eng.oilLevel < 15);
  const isLowFuel = fuelLevel < 15;
  const isBatteryLow = batteryCharge < 20 || (!isEngineRunning && batteryCharge < 100);

  // Theme-specific color & style configurations
  const themeStyles = {
    sport: {
      casingBg: 'bg-stone-950',
      border: 'border-rose-900/60 shadow-[0_0_25px_rgba(225,29,72,0.15)]',
      dialFace: '#09090b',
      dialStroke: '#e11d48',
      tickColor: '#e2e8f0',
      subTickColor: '#475569',
      needleColor: '#f43f5e',
      needleGlow: '#fb7185',
      hubColor: '#18181b',
      hubBorder: '#f43f5e',
      textColor: 'text-rose-400',
      accentBadge: 'bg-rose-950/80 border-rose-600/50 text-rose-300',
      title: 'SPORT GT / TRACK',
    },
    truck: {
      casingBg: 'bg-slate-900',
      border: 'border-amber-700/60 shadow-[0_0_20px_rgba(217,119,6,0.2)]',
      dialFace: '#1c1917',
      dialStroke: '#d97706',
      tickColor: '#fbbf24',
      subTickColor: '#78716c',
      needleColor: '#f59e0b',
      needleGlow: '#fbbf24',
      hubColor: '#292524',
      hubBorder: '#d97706',
      textColor: 'text-amber-400',
      accentBadge: 'bg-amber-950/80 border-amber-600/50 text-amber-300',
      title: 'HEAVY DIESEL PRO',
    },
    retro: {
      casingBg: 'bg-[#1c1917]',
      border: 'border-amber-200/40 shadow-[0_0_20px_rgba(245,230,211,0.15)] ring-1 ring-amber-100/20',
      dialFace: '#1e1c18',
      dialStroke: '#a8a29e',
      tickColor: '#fef3c7',
      subTickColor: '#78716c',
      needleColor: '#ea580c',
      needleGlow: '#f97316',
      hubColor: '#44403c',
      hubBorder: '#fef3c7',
      textColor: 'text-amber-200',
      accentBadge: 'bg-amber-950/70 border-amber-300/40 text-amber-200 font-serif',
      title: 'CLASSIC MOTOR CAR',
    },
    emergency: {
      casingBg: 'bg-slate-950',
      border: 'border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.2)]',
      dialFace: '#030712',
      dialStroke: '#0284c7',
      tickColor: '#e0f2fe',
      subTickColor: '#334155',
      needleColor: '#38bdf8',
      needleGlow: '#7dd3fc',
      hubColor: '#0f172a',
      hubBorder: '#38bdf8',
      textColor: 'text-cyan-400',
      accentBadge: 'bg-sky-950/90 border-cyan-500/50 text-cyan-300',
      title: 'TACTICAL INTERCEPTOR',
    },
    luxury: {
      casingBg: 'bg-slate-900',
      border: 'border-slate-700/80 shadow-[0_0_25px_rgba(56,189,248,0.12)]',
      dialFace: '#020617',
      dialStroke: '#3b82f6',
      tickColor: '#f8fafc',
      subTickColor: '#475569',
      needleColor: '#38bdf8',
      needleGlow: '#93c5fd',
      hubColor: '#0f172a',
      hubBorder: '#60a5fa',
      textColor: 'text-sky-400',
      accentBadge: 'bg-slate-900/90 border-slate-700 text-slate-300',
      title: 'EXECUTIVE COCKPIT',
    }
  }[theme];

  // Helper for generating main circular dial tick marks
  const renderDialTicks = (
    cx: number, 
    cy: number, 
    r: number, 
    maxVal: number, 
    steps: number, 
    labelMultiplier: number = 1,
    redlineStartVal?: number
  ) => {
    const ticks = [];
    for (let i = 0; i <= steps; i++) {
      const val = (i / steps) * maxVal;
      const angle = -125 + (i / steps) * 250;
      const rad = ((angle - 90) * Math.PI) / 180;
      const isMajor = i % 2 === 0;
      const isRedline = redlineStartVal && val >= redlineStartVal;
      
      const tickLen = isMajor ? 8 : 4;
      const x1 = cx + (r - tickLen) * Math.cos(rad);
      const y1 = cy + (r - tickLen) * Math.sin(rad);
      const x2 = cx + r * Math.cos(rad);
      const y2 = cy + r * Math.sin(rad);

      ticks.push(
        <line
          key={`tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isRedline ? '#ef4444' : isMajor ? themeStyles.tickColor : themeStyles.subTickColor}
          strokeWidth={isMajor ? 2 : 1}
          strokeLinecap="round"
        />
      );

      if (isMajor) {
        const textRad = r - 16;
        const tx = cx + textRad * Math.cos(rad);
        const ty = cy + textRad * Math.sin(rad);
        ticks.push(
          <text
            key={`lbl-${i}`}
            x={tx}
            y={ty + 3}
            textAnchor="middle"
            fill={isRedline ? '#f87171' : themeStyles.tickColor}
            fontSize={theme === 'truck' ? '8' : '7.5'}
            fontWeight="bold"
            fontFamily={theme === 'retro' ? 'serif' : 'monospace'}
          >
            {Math.round(val * labelMultiplier)}
          </text>
        );
      }
    }
    return ticks;
  };

  // Helper for rendering small auxiliary dial (Fuel, Temp, Oil)
  const renderSmallDialTicks = (cx: number, cy: number, r: number, minLabel: string, midLabel: string, maxLabel: string, isDangerAtHigh: boolean) => {
    const angles = [-55, -27.5, 0, 27.5, 55];
    return (
      <>
        {angles.map((ang, i) => {
          const rad = ((ang - 90) * Math.PI) / 180;
          const isExtreme = i === 0 || i === 4;
          const tickLen = isExtreme ? 5 : 3;
          const x1 = cx + (r - tickLen) * Math.cos(rad);
          const y1 = cy + (r - tickLen) * Math.sin(rad);
          const x2 = cx + r * Math.cos(rad);
          const y2 = cy + r * Math.sin(rad);
          
          let color = themeStyles.subTickColor;
          if (i === 0 && !isDangerAtHigh) color = '#ef4444'; // E is red
          if (i === 4 && isDangerAtHigh) color = '#ef4444';  // H is red

          return (
            <line
              key={`sm-tick-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={isExtreme ? 1.8 : 1}
            />
          );
        })}
        {/* Labels */}
        <text x={cx - 16} y={cy + 8} fontSize="7" fontWeight="bold" fill={!isDangerAtHigh ? '#ef4444' : themeStyles.tickColor} textAnchor="middle">{minLabel}</text>
        <text x={cx} y={cy - 12} fontSize="6" fontWeight="bold" fill={themeStyles.subTickColor} textAnchor="middle">{midLabel}</text>
        <text x={cx + 16} y={cy + 8} fontSize="7" fontWeight="bold" fill={isDangerAtHigh ? '#ef4444' : themeStyles.tickColor} textAnchor="middle">{maxLabel}</text>
      </>
    );
  };

  return (
    <div
      id="speedometer-cluster"
      className="fixed bottom-2 md:bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none transition-all duration-300 flex flex-col items-center"
      style={{ maxWidth: 'calc(100vw - 20px)' }}
    >
      {/* MINIMIZE / EXPAND TOGGLE BAR */}
      <button
        type="button"
        onClick={() => setIsMinimized((prev) => !prev)}
        className="mb-1 px-3 py-0.5 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 text-[10px] text-slate-300 font-mono flex items-center gap-1.5 shadow-lg active:scale-95 transition backdrop-blur-md"
        title="Свернуть / Развернуть приборную панель"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="uppercase font-bold tracking-wider">{vehicle.type.replace('_', ' ')}</span>
        {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* COMPACT MINIMALIST BAR (IF MINIMIZED) */}
      {isMinimized ? (
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border backdrop-blur-md shadow-2xl ${themeStyles.casingBg} ${themeStyles.border} text-white whitespace-nowrap overflow-x-auto max-w-full`}>
          <div className="flex items-baseline gap-1 font-mono whitespace-nowrap shrink-0">
            <span className="text-2xl font-black text-sky-400">{speedKmh}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase">КМ/Ч</span>
          </div>
          <div className="h-4 w-px bg-slate-700 shrink-0" />
          <div className="flex items-center gap-2 font-mono text-xs whitespace-nowrap shrink-0">
            <span className="text-slate-400">RPM:</span>
            <span className={`font-bold ${currentRPM > redlineRPM ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>{currentRPM}</span>
          </div>
          <div className="h-4 w-px bg-slate-700 shrink-0" />
          <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-slate-800 border border-slate-700 text-emerald-400 shrink-0">
            {currentGearLabel}
          </span>
          <div className="h-4 w-px bg-slate-700 shrink-0" />
          {/* Quick Engine start/stop */}
          <button
            type="button"
            onClick={onToggleEngine}
            className={`p-1.5 rounded-lg border flex items-center justify-center transition shrink-0 ${
              isEngineRunning ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-rose-500/20 border-rose-500 text-rose-300'
            }`}
            title="Зажигание [J]"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* FULL ANALOG INSTRUMENT CLUSTER */
        <div
          className={`relative rounded-2xl border-2 p-2.5 md:p-3 shadow-2xl backdrop-blur-xl ${themeStyles.casingBg} ${themeStyles.border} flex flex-col items-center gap-2`}
        >
          {/* TOP ANNUNCIATOR STRIP & SHIFT LIGHTS */}
          <div className="w-full flex items-center justify-between px-2 text-[10px] font-mono border-b border-slate-800/80 pb-1.5">
            {/* Left Signal Indicator */}
            <div className="flex items-center gap-1.5">
              <span className={`p-1 rounded ${playerTurnSignal === 'left' || playerTurnSignal === 'hazard' ? 'bg-emerald-500/30 text-emerald-400 animate-pulse' : 'text-slate-600'}`}>
                <ArrowLeft className="w-3.5 h-3.5" />
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${themeStyles.accentBadge}`}>
                {themeStyles.title}
              </span>
            </div>

            {/* Sport RPM Shift Lights or Truck Air Indicator */}
            {theme === 'sport' ? (
              <div className="flex items-center gap-1">
                {[0.6, 0.7, 0.8, 0.88, 0.95].map((thresh, idx) => {
                  const active = rpmRatio >= thresh;
                  let dotColor = 'bg-emerald-500';
                  if (idx >= 2) dotColor = 'bg-amber-500';
                  if (idx >= 3) dotColor = 'bg-rose-500';
                  return (
                    <span
                      key={idx}
                      className={`w-2.5 h-1.5 rounded-sm transition-all ${active ? `${dotColor} shadow-[0_0_8px_currentColor] animate-pulse` : 'bg-slate-800'}`}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[9px] flex-wrap justify-center">
                {/* Fixed Transmission Type Badge (non-toggleable, archetype fixed) */}
                <div
                  className="select-none px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/80 font-bold flex items-center gap-1"
                  title={`Тип трансмиссии автомобиля: ${eng?.transmissionType === 'MANUAL' ? 'Механическая (МКПП)' : 'Автоматическая (АКПП)'}`}
                >
                  <span className={eng?.transmissionType === 'MANUAL' ? 'text-amber-400 font-black' : 'text-sky-400 font-black'}>
                    {eng?.transmissionType === 'MANUAL' ? 'МКПП' : 'АКПП'}
                  </span>
                </div>

                {/* PRND AUTO SELECTOR BUTTONS / MANUAL GEAR BUTTONS */}
                {eng?.transmissionType === 'AUTO' ? (
                  <div className="flex items-center gap-1 bg-slate-950/90 px-1 py-0.5 rounded border border-slate-800">
                    {(['P', 'R', 'N', 'D'] as const).map((mode) => {
                      const activeMode = eng?.autoGearMode || gear;
                      const isSelected = activeMode === mode;
                      const colorClass = {
                        P: isSelected ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.7)] font-black' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
                        R: isSelected ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.7)] font-black' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
                        N: isSelected ? 'bg-slate-200 text-slate-900 shadow-[0_0_8px_rgba(255,255,255,0.6)] font-black' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
                        D: isSelected ? 'bg-sky-500 text-white shadow-[0_0_8px_rgba(14,165,233,0.7)] font-black' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
                      }[mode];

                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectGear?.(mode);
                          }}
                          className={`w-5 h-4 rounded text-[10px] flex items-center justify-center transition-all cursor-pointer ${colorClass}`}
                          title={`Включить режим ${mode}`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 bg-slate-950/90 px-1 py-0.5 rounded border border-slate-800">
                    {(['R', 'N', '1', '2', '3', '4', '5'] as const).map((g) => {
                      const curG = eng?.currentGear === -1 ? 'R' : eng?.currentGear === 0 ? 'N' : String(eng?.currentGear || 1);
                      const isSelected = curG === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectGear?.(g === 'R' ? 'R' : g === 'N' ? 'N' : Number(g));
                          }}
                          className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500 text-white shadow-[0_0_6px_rgba(14,165,233,0.6)]'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title={`Передача ${g}`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                )}

                <span className={isEngineRunning ? 'text-emerald-400 font-bold' : isStalled ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                  {isEngineRunning ? 'МОТОР ВКЛ' : isStalled ? 'ЗАГЛОХ' : 'МОТОР ВЫКЛ'}
                </span>
              </div>
            )}

            {/* Right Signal Indicator */}
            <div className="flex items-center gap-1.5">
              {playerHeadlightMode !== 'off' && (
                <span className={`p-0.5 rounded ${playerHeadlightMode === 'high' ? 'text-sky-400' : 'text-emerald-400'}`}>
                  <Lightbulb className="w-3.5 h-3.5" />
                </span>
              )}
              <span className={`p-1 rounded ${playerTurnSignal === 'right' || playerTurnSignal === 'hazard' ? 'bg-emerald-500/30 text-emerald-400 animate-pulse' : 'text-slate-600'}`}>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* MAIN GAUGES SVG CANVAS */}
          <div className="relative flex items-center justify-center">
            <svg
              viewBox="0 0 460 135"
              className="w-[310px] sm:w-[380px] md:w-[440px] h-[95px] sm:h-[115px] md:h-[135px] overflow-visible"
            >
              <defs>
                {/* Dial gradient filters */}
                <radialGradient id="dialGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="65%" stopColor={themeStyles.dialFace} />
                  <stop offset="100%" stopColor="#000000" />
                </radialGradient>
                <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="glow" />
                  <feComposite in="SourceGraphic" in2="glow" operator="over" />
                </filter>
              </defs>

              {/* ================= GAUGE 1: TACHOMETER (RPM) ================= */}
              <g id="tachometer-gauge" transform="translate(10, 0)">
                {/* Outer Bezel */}
                <circle cx="70" cy="70" r="58" fill="url(#dialGrad)" stroke={themeStyles.border.includes('amber') ? '#78350f' : '#1e293b'} strokeWidth="3" />
                <circle cx="70" cy="70" r="56" fill="none" stroke={themeStyles.dialStroke} strokeWidth="1" strokeOpacity="0.4" />

                {/* Redline arc */}
                <path
                  d="M 106 32 A 52 52 0 0 1 118 78"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3.5"
                  strokeOpacity="0.7"
                />

                {/* Dial Ticks & Numbers */}
                {renderDialTicks(70, 70, 52, maxRPM, maxRPM <= 5000 ? 8 : 10, 0.001, redlineRPM)}

                {/* Unit label */}
                <text x="70" y="94" textAnchor="middle" fontSize="6.5" fill="#94a3b8" fontFamily="monospace" fontWeight="bold">
                  RPM ×1000
                </text>

                {/* Rotating Needle */}
                <g transform={`rotate(${rpmAngle} 70 70)`} filter="url(#needleGlow)">
                  {/* Needle Counterweight & Pointer */}
                  <polygon
                    points="68.5,82 71.5,82 70.8,24 69.2,24"
                    fill={themeStyles.needleColor}
                  />
                  <line x1="70" y1="24" x2="70" y2="70" stroke={themeStyles.needleGlow} strokeWidth="1" />
                </g>

                {/* Center Hub */}
                <circle cx="70" cy="70" r="8" fill={themeStyles.hubColor} stroke={themeStyles.hubBorder} strokeWidth="2" />
                <circle cx="70" cy="70" r="3" fill={themeStyles.needleColor} />

                {/* Gear Display in Tachometer */}
                <g
                  className="cursor-pointer"
                  onClick={() => {
                    if (eng?.transmissionType === 'AUTO') {
                      const ladder = ['P', 'R', 'N', 'D'] as const;
                      const curMode = eng.autoGearMode || 'D';
                      const nextIdx = (ladder.indexOf(curMode as any) + 1) % ladder.length;
                      onSelectGear?.(ladder[nextIdx]);
                    } else if (eng) {
                      const nextGear = eng.currentGear >= 5 ? -1 : eng.currentGear + 1;
                      onSelectGear?.(nextGear);
                    }
                  }}
                >
                  <rect x="58" y="44" width="24" height="16" rx="3" fill="#020617" stroke="#334155" strokeWidth="1" />
                  <text
                    x="70"
                    y="56"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="900"
                    fill={currentGearLabel.startsWith('R') ? '#f59e0b' : currentGearLabel === 'P' ? '#ef4444' : '#38bdf8'}
                    fontFamily="monospace"
                  >
                    {currentGearLabel}
                  </text>
                </g>
              </g>

              {/* ================= CENTER CLUSTER: AUX GAUGES (OIL, TEMP, FUEL) ================= */}
              <g id="aux-gauges" transform="translate(150, 0)">
                {/* 1. OIL PRESSURE / LEVEL GAUGE (LEFT AUX) */}
                <g transform="translate(25, 36)">
                  <circle cx="0" cy="0" r="23" fill="url(#dialGrad)" stroke="#1e293b" strokeWidth="1.5" />
                  {renderSmallDialTicks(0, 0, 21, 'L', 'NORM', 'H', false)}
                  {/* Rotating Needle */}
                  <g transform={`rotate(${oilAngle} 0 0)`}>
                    <line x1="0" y1="4" x2="0" y2="-17" stroke={themeStyles.needleColor} strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="3.5" fill={themeStyles.hubColor} stroke={themeStyles.hubBorder} strokeWidth="1" />
                  </g>
                  {/* Icon */}
                  <text x="0" y="16" textAnchor="middle" fontSize="6.5" fill={isLowOil ? '#ef4444' : '#64748b'} fontFamily="monospace" fontWeight="bold">МАСЛО</text>
                  {isLowOil && <circle cx="12" cy="-12" r="2" fill="#ef4444" className="animate-ping" />}
                </g>

                {/* 2. COOLANT TEMPERATURE GAUGE (CENTER AUX) */}
                <g transform="translate(80, 36)">
                  <circle cx="0" cy="0" r="23" fill="url(#dialGrad)" stroke="#1e293b" strokeWidth="1.5" />
                  {renderSmallDialTicks(0, 0, 21, '40°', '90°', '130°', true)}
                  {/* Rotating Needle */}
                  <g transform={`rotate(${tempAngle} 0 0)`}>
                    <line x1="0" y1="4" x2="0" y2="-17" stroke={themeStyles.needleColor} strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="3.5" fill={themeStyles.hubColor} stroke={themeStyles.hubBorder} strokeWidth="1" />
                  </g>
                  {/* Icon */}
                  <text x="0" y="16" textAnchor="middle" fontSize="6.5" fill={isOverheating ? '#ef4444' : '#64748b'} fontFamily="monospace" fontWeight="bold">ТЕМП</text>
                  {isOverheating && <circle cx="12" cy="-12" r="2" fill="#ef4444" className="animate-ping" />}
                </g>

                {/* 3. FUEL LEVEL GAUGE (RIGHT AUX) */}
                <g transform="translate(135, 36)">
                  <circle cx="0" cy="0" r="23" fill="url(#dialGrad)" stroke="#1e293b" strokeWidth="1.5" />
                  {renderSmallDialTicks(0, 0, 21, 'E', '1/2', 'F', false)}
                  {/* Rotating Needle */}
                  <g transform={`rotate(${fuelAngle} 0 0)`}>
                    <line x1="0" y1="4" x2="0" y2="-17" stroke={themeStyles.needleColor} strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="3.5" fill={themeStyles.hubColor} stroke={themeStyles.hubBorder} strokeWidth="1" />
                  </g>
                  {/* Icon */}
                  <text x="0" y="16" textAnchor="middle" fontSize="6.5" fill={isLowFuel ? '#f59e0b' : '#64748b'} fontFamily="monospace" fontWeight="bold">БАК</text>
                  {isLowFuel && <circle cx="12" cy="-12" r="2" fill="#f59e0b" className="animate-ping" />}
                </g>

                {/* TELL-TALE WARNING LIGHTS IN CENTER BOTTOM */}
                <g transform="translate(80, 96)">
                  {/* Check Engine Light */}
                  {(() => {
                    const isCheckEngine = isStalled || !isEngineRunning || eng?.engineKnocking || eng?.isSeized || (eng?.engineHealth ?? 100) < 60 || eng?.radiatorPunctured || eng?.oilPunctured || (eng?.temperature ?? 0) > 105;
                    const isTransWarn = eng?.transmissionJammed || (eng?.transmissionHealth ?? 100) < 60;
                    return (
                      <>
                        <g transform="translate(-54, 0)">
                          <rect x="-10" y="-8" width="20" height="15" rx="3" fill={isCheckEngine ? (eng?.isSeized ? '#7f1d1d' : '#78350f') : '#0f172a'} stroke={isCheckEngine ? (eng?.isSeized ? '#ef4444' : '#f59e0b') : '#334155'} strokeWidth="1" />
                          <text x="0" y="2" textAnchor="middle" fontSize="6.5" fill={isCheckEngine ? (eng?.isSeized ? '#fca5a5' : '#f59e0b') : '#475569'} fontWeight="bold">
                            {eng?.isSeized ? 'KLIN' : 'CHECK'}
                          </text>
                        </g>
                        {/* Battery Light */}
                        <g transform="translate(-27, 0)">
                          <rect x="-10" y="-8" width="20" height="15" rx="3" fill={isBatteryLow ? '#7f1d1d' : '#0f172a'} stroke={isBatteryLow ? '#ef4444' : '#334155'} strokeWidth="1" />
                          <text x="0" y="2" textAnchor="middle" fontSize="7" fill={isBatteryLow ? '#ef4444' : '#475569'} fontWeight="bold">BATT</text>
                        </g>
                        {/* Transmission Warning Light */}
                        <g transform="translate(0, 0)">
                          <rect x="-10" y="-8" width="20" height="15" rx="3" fill={isTransWarn ? '#7f1d1d' : '#0f172a'} stroke={isTransWarn ? '#ef4444' : '#334155'} strokeWidth="1" />
                          <text x="0" y="2" textAnchor="middle" fontSize="6.5" fill={isTransWarn ? '#ef4444' : '#475569'} fontWeight="bold">
                            {eng?.transmissionJammed ? 'JAM' : 'TRANS'}
                          </text>
                        </g>
                        {/* Oil Lamp */}
                        <g transform="translate(27, 0)">
                          <rect x="-10" y="-8" width="20" height="15" rx="3" fill={isLowOil ? '#7f1d1d' : '#0f172a'} stroke={isLowOil ? '#ef4444' : '#334155'} strokeWidth="1" />
                          <text x="0" y="2" textAnchor="middle" fontSize="7" fill={isLowOil ? '#ef4444' : '#475569'} fontWeight="bold">OIL</text>
                        </g>
                        {/* Handbrake / Park Lamp */}
                        <g transform="translate(54, 0)">
                          <rect x="-10" y="-8" width="20" height="15" rx="3" fill={isHandbraking ? '#7f1d1d' : '#0f172a'} stroke={isHandbraking ? '#ef4444' : '#334155'} strokeWidth="1" />
                          <text x="0" y="2" textAnchor="middle" fontSize="7" fill={isHandbraking ? '#ef4444' : '#475569'} fontWeight="bold">( P )</text>
                        </g>
                      </>
                    );
                  })()}
                </g>

                {/* Digital Speed & Odometer readout in center */}
                <text x="80" y="122" textAnchor="middle" fontSize="13" fontWeight="900" fill="#f8fafc" fontFamily="monospace" letterSpacing="0.5">
                  {speedKmh} <tspan fontSize="8" fill="#94a3b8">КМ/Ч</tspan>
                </text>
              </g>

              {/* ================= GAUGE 2: SPEEDOMETER ================= */}
              <g id="speedometer-gauge" transform="translate(310, 0)">
                {/* Outer Bezel */}
                <circle cx="70" cy="70" r="58" fill="url(#dialGrad)" stroke={themeStyles.border.includes('amber') ? '#78350f' : '#1e293b'} strokeWidth="3" />
                <circle cx="70" cy="70" r="56" fill="none" stroke={themeStyles.dialStroke} strokeWidth="1" strokeOpacity="0.4" />

                {/* Dial Ticks & Numbers */}
                {renderDialTicks(70, 70, 52, maxSpeed, 12, 1)}

                {/* Unit label */}
                <text x="70" y="94" textAnchor="middle" fontSize="6.5" fill="#94a3b8" fontFamily="monospace" fontWeight="bold">
                  KM / H
                </text>

                {/* Rotating Needle */}
                <g transform={`rotate(${speedAngle} 70 70)`} filter="url(#needleGlow)">
                  <polygon
                    points="68.5,82 71.5,82 70.8,24 69.2,24"
                    fill={themeStyles.needleColor}
                  />
                  <line x1="70" y1="24" x2="70" y2="70" stroke={themeStyles.needleGlow} strokeWidth="1" />
                </g>

                {/* Center Hub */}
                <circle cx="70" cy="70" r="8" fill={themeStyles.hubColor} stroke={themeStyles.hubBorder} strokeWidth="2" />
                <circle cx="70" cy="70" r="3" fill={themeStyles.needleColor} />

                {/* Odometer readout */}
                <rect x="52" y="104" width="36" height="11" rx="2" fill="#020617" stroke="#334155" strokeWidth="0.8" />
                <text x="70" y="112" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#38bdf8" fontFamily="monospace">
                  014829
                </text>
              </g>
            </svg>
          </div>

          {/* BOTTOM QUICK CONTROLS BAR (LIGHTS, SIGNALS, IGNITION, RADIAL MENU) */}
          <div className="w-full flex items-center justify-center gap-1.5 pt-1 border-t border-slate-800/80">
            {/* Left Signal (Q) */}
            <button
              type="button"
              onClick={() => onToggleTurnSignal?.('left')}
              className={`px-2.5 py-1 rounded border text-[10px] font-bold font-mono flex items-center gap-1 transition ${
                playerTurnSignal === 'left' || playerTurnSignal === 'hazard'
                  ? 'bg-amber-500/30 border-amber-400 text-amber-300 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Левый поворотник [Q]"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Q</span>
            </button>

            {/* Hazard (Z) */}
            <button
              type="button"
              onClick={() => onToggleTurnSignal?.('hazard')}
              className={`px-2.5 py-1 rounded border text-[10px] font-bold font-mono flex items-center gap-1 transition ${
                playerTurnSignal === 'hazard'
                  ? 'bg-rose-500/30 border-rose-400 text-rose-300 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Аварийка [Z]"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Z</span>
            </button>

            {/* Right Signal (E) */}
            <button
              type="button"
              onClick={() => onToggleTurnSignal?.('right')}
              className={`px-2.5 py-1 rounded border text-[10px] font-bold font-mono flex items-center gap-1 transition ${
                playerTurnSignal === 'right' || playerTurnSignal === 'hazard'
                  ? 'bg-amber-500/30 border-amber-400 text-amber-300 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Правый поворотник [E]"
            >
              <span>E</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-0.5" />

            {/* Headlights Toggle (L) */}
            <button
              type="button"
              onClick={onToggleHeadlights}
              className={`px-2.5 py-1 rounded border text-[10px] font-bold font-mono flex items-center gap-1 transition ${
                playerHeadlightMode === 'high'
                  ? 'bg-blue-600/30 border-blue-400 text-blue-300'
                  : playerHeadlightMode === 'low'
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Фары: Ближний / Дальний / Выкл [L]"
            >
              <Lightbulb className="w-3 h-3" />
              <span>L</span>
            </button>

            {/* Engine Start / Stop (J) */}
            <button
              type="button"
              onClick={onToggleEngine}
              className={`px-3 py-1 rounded border text-[10px] font-bold font-mono flex items-center gap-1.5 transition ${
                isEngineRunning
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : isStalled
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse'
                  : 'bg-rose-950/80 border-rose-600 text-rose-300'
              }`}
              title="Зажигание: Запустить / Заглушить двигатель [J]"
            >
              <Power className="w-3 h-3" />
              <span>{isEngineRunning ? 'СТАРТ' : 'ЗАПУСК'}</span>
            </button>

            {/* Radial Menu Trigger Button */}
            {onOpenRadialMenu && (
              <button
                type="button"
                onClick={onOpenRadialMenu}
                className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-[10px] font-bold font-mono flex items-center gap-1 transition"
                title="Панель приборов автомобиля"
              >
                <Gauge className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">ПРИБОРЫ</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

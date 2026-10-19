import React, { useState } from 'react';
import { Vehicle, CarType, WeatherType, GameCalendarState } from '../types';
import { getVehicleRequiredKeyType } from '../items';
import { formatGameDate, getRussianSeasonName } from '../calendarSystem';
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
  ShieldAlert,
  Clock,
  Compass,
  Key,
  Lock,
  Unlock,
  Car,
  Calendar,
  Snowflake,
  Battery,
  Wrench,
  Cog
} from 'lucide-react';
import { sound } from '../audio';
import { TaxiFleetSystem } from '../taxiSystem';
import { getOutsideTemperature } from '../physics';
import { getTerrainSlope } from '../terrainElevation';
import {
  getVehicleDiffCapabilities,
  cycleVehicleDiffLock,
  toggleAxleDiffLock
} from '../vehicleHelpers';

export type DashboardTheme = 'sport' | 'truck' | 'retro' | 'emergency' | 'luxury';

export type TripComputerMode = 'eco' | 'range' | 'trip' | 'sys' | 'tank' | 'gbo';

export function getVehicleDashboardTheme(type?: CarType): DashboardTheme {
  if (!type) return 'luxury';

  switch (type) {
    case 'supercar':
    case 'sports':
    case 'muscle':
    case 'muscle_classic':
    case 'hatch_hot':
    case 'coupe_gt':
    case 'moto_sport':
      return 'sport';

    case 'truck_box':
    case 'truck_dump':
    case 'truck_zil_dump':
    case 'truck_semi':
    case 'truck_tanker':
    case 'truck_water':
    case 'truck_flatbed':
    case 'truck_covered':
    case 'truck_tow':
    case 'truck_armored':
    case 'cement_mixer':
    case 'garbage_truck':
    case 'delivery_truck':
    case 'bus':
    case 'bus_minibus':
    case 'pickup':
    case 'offroad_hardcore':
    case 'tractor_mtz82':
    case 'tractor_mtz80':
    case 'tractor_mtz80_old':
      return 'truck';

    case 'retro_bubble':
    case 'classic_compact':
    case 'micro_car':
    case 'sedan_classic':
    case 'wagon_classic':
    case 'liftback_tavria':
    case 'hatch_samara':
    case 'sedan_samara':
    case 'sedan_nexia':
    case 'moto_izh_jupiter':
    case 'moto_ural_sidecar':
    case 'moto_jawa350':
    case 'moto_chopper':
    case 'moped_soviet':
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
  timeHour?: number;
  calendar?: GameCalendarState;
  weather?: WeatherType;
  onToggleTurnSignal?: (signal: 'left' | 'right' | 'hazard') => void;
  onToggleHeadlights?: () => void;
  onToggleEngine?: () => void;
  onOpenRadialMenu?: () => void;
  onSelectGear?: (gear: 'P' | 'R' | 'N' | 'D' | number | string) => void;
  onTakeOutKey?: () => void;
  onInsertKey?: (keyType: 'gold' | 'iron') => void;
  hasKeysInInventory?: ('gold' | 'iron')[];
  onToggleDiffLock?: () => void;
  onToggleAxleDiffLock?: (axle: 'center' | 'rear' | 'front') => void;
  isMobileTouch?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */

const C = {
  panel: 'rgba(13,15,19,0.94)',
  surface: '#151922',
  surfaceHi: '#1c212c',
  line: '#272c38',
  text: '#e9edf3',
  muted: '#9099a8',
  dim: '#5b6372',
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#22c55e',
  blue: '#38bdf8'
};

// Accent color for the dial arcs / active controls depends on the vehicle theme.
const THEME_ACCENT: Record<DashboardTheme, { acc: string; needle: string }> = {
  sport: { acc: '#fb7185', needle: '#f43f5e' },
  truck: { acc: '#fbbf24', needle: '#f59e0b' },
  retro: { acc: '#fcd9a0', needle: '#f97316' },
  emergency: { acc: '#38bdf8', needle: '#7dd3fc' },
  luxury: { acc: '#60a5fa', needle: '#93c5fd' }
};

const ODOMETER_TOTAL = '014829';

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
};

const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const SWEEP_START = -135;
const SWEEP_END = 135;

interface ArcGaugeProps {
  value: number;
  max: number;
  major: number;
  minor: number;
  labelDiv?: number;
  redFrom?: number;
  accent: string;
  needle: string;
  children?: React.ReactNode;
}

/** 270-degree dial: progress arc, readable tick labels and a needle. Centre content is supplied as children. */
const ArcGauge: React.FC<ArcGaugeProps> = ({ value, max, major, minor, labelDiv = 1, redFrom, accent, needle, children }) => {
  const cx = 80;
  const cy = 80;
  const ratio = Math.max(0, Math.min(1, value / max));
  const angle = SWEEP_START + ratio * (SWEEP_END - SWEEP_START);
  const inRed = redFrom !== undefined && value >= redFrom;
  const valueColor = inRed ? C.red : accent;

  const ticks: React.ReactNode[] = [];
  const count = Math.round(max / minor);
  for (let i = 0; i <= count; i++) {
    const v = i * minor;
    const isMajor = Math.abs(v % major) < 1e-6;
    const a = SWEEP_START + (v / max) * (SWEEP_END - SWEEP_START);
    const red = redFrom !== undefined && v >= redFrom;
    const [x1, y1] = polar(cx, cy, isMajor ? 53 : 58, a);
    const [x2, y2] = polar(cx, cy, 62, a);
    ticks.push(
      <line
        key={`t${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={red ? C.red : isMajor ? C.text : C.dim}
        strokeWidth={isMajor ? 2 : 1.2}
        strokeLinecap="round"
      />
    );
    if (isMajor) {
      const [tx, ty] = polar(cx, cy, 41, a);
      ticks.push(
        <text
          key={`l${i}`}
          x={tx}
          y={ty + 3.8}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fill={red ? '#fca5a5' : C.muted}
        >
          {Math.round(v / labelDiv)}
        </text>
      );
    }
  }

  return (
    <svg viewBox="0 0 160 146" className="w-full h-auto block" role="img">
      {/* track */}
      <path d={arcPath(cx, cy, 68, SWEEP_START, SWEEP_END)} fill="none" stroke="#1d222d" strokeWidth="6" strokeLinecap="round" />
      {/* red zone */}
      {redFrom !== undefined && redFrom < max && (
        <path
          d={arcPath(cx, cy, 68, SWEEP_START + (redFrom / max) * (SWEEP_END - SWEEP_START), SWEEP_END)}
          fill="none"
          stroke={C.red}
          strokeOpacity="0.45"
          strokeWidth="6"
          strokeLinecap="round"
        />
      )}
      {/* value arc */}
      {ratio > 0.004 && (
        <path d={arcPath(cx, cy, 68, SWEEP_START, angle)} fill="none" stroke={valueColor} strokeWidth="6" strokeLinecap="round" />
      )}
      {ticks}
      {/* needle */}
      <g transform={`rotate(${angle} ${cx} ${cy})`}>
        <polygon points="78.4,86 81.6,86 80.7,32 79.3,32" fill={needle} />
      </g>
      <circle cx={cx} cy={cy} r="6.5" fill={C.surface} stroke={needle} strokeWidth="2" />
      {children}
    </svg>
  );
};

type Tone = 'acc' | 'red' | 'amber' | 'green' | 'none';

interface BtnProps {
  accent: string;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  tone?: Tone;
  pulse?: boolean;
  className?: string;
  children: React.ReactNode;
}

const toneColor = (tone: Tone, accent: string) =>
  tone === 'red' ? C.red : tone === 'amber' ? C.amber : tone === 'green' ? C.green : accent;

/** One consistent button style for the whole panel (min. 32px tall, readable 12px text). */
const Btn: React.FC<BtnProps> = ({ accent, onClick, title, active = false, tone = 'acc', pulse = false, className = '', children }) => {
  const col = toneColor(tone, accent);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md border text-[12px] font-semibold font-mono whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer ${pulse && active ? 'animate-pulse' : ''} ${className}`}
      style={
        active
          ? { background: `${col}26`, borderColor: `${col}99`, color: col }
          : { background: C.surface, borderColor: C.line, color: C.muted }
      }
    >
      {children}
    </button>
  );
};

interface StatBarProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  ratio: number;
  color: string;
  warn?: boolean;
}

const StatBar: React.FC<StatBarProps> = ({ icon, label, value, ratio, color, warn }) => (
  <div className="min-w-0 rounded-md px-2.5 py-1.5 border" style={{ background: C.surface, borderColor: warn ? `${color}88` : C.line }}>
    <div className="flex items-center justify-between gap-1.5 mb-1">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: warn ? color : C.muted }}>
        {icon}
        {label}
      </span>
      <span className={`text-[13px] font-black font-mono leading-none ${warn ? 'animate-pulse' : ''}`} style={{ color: warn ? color : C.text }}>
        {value}
      </span>
    </div>
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1d222d' }}>
      <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%`, background: color }} />
    </div>
  </div>
);

interface TelltaleProps {
  icon: React.ReactNode;
  label: string;
  level: 'off' | 'amber' | 'red';
  blink?: boolean;
  title?: string;
}

const Telltale: React.FC<TelltaleProps> = ({ icon, label, level, blink, title }) => {
  const col = level === 'red' ? C.red : level === 'amber' ? C.amber : C.dim;
  return (
    <span
      title={title ?? label}
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-md border text-[10px] font-bold font-mono uppercase tracking-wide ${blink ? 'animate-pulse' : ''}`}
      style={{
        color: col,
        borderColor: level === 'off' ? C.line : `${col}88`,
        background: level === 'off' ? 'transparent' : `${col}1f`
      }}
    >
      {icon}
      {label}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const SpeedometerHUD: React.FC<SpeedometerHUDProps> = ({
  vehicle,
  speedKmh,
  gear,
  isDrifting = false,
  isHandbraking = false,
  playerTurnSignal = 'none',
  playerHeadlightMode = 'off',
  timeHour = 12.0,
  calendar,
  weather = 'clear',
  onToggleTurnSignal,
  onToggleHeadlights,
  onToggleEngine,
  onOpenRadialMenu,
  onSelectGear,
  onTakeOutKey,
  onInsertKey,
  hasKeysInInventory = [],
  onToggleDiffLock,
  onToggleAxleDiffLock,
  isMobileTouch = false
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return isMobileTouch || window.innerWidth < 900;
    }
    return false;
  });
  const [tripMode, setTripMode] = useState<TripComputerMode>('eco');

  if (!vehicle) return null;

  const carType = vehicle.type;
  const theme = getVehicleDashboardTheme(carType);
  const { acc, needle } = THEME_ACCENT[theme];
  const eng = vehicle.engineState;
  const fuel = vehicle.fuelSystem;

  // ---- Real-time sensor values -------------------------------------
  const currentRPM = eng?.engineRunning ? Math.round(eng.engineRPM || 800) : 0;
  const coolantTemp = Math.round(eng?.temperature ?? 88);
  const oilPressure = Math.round(eng?.oilPressure ?? (eng?.oilLevel ?? 90));

  const isLpgRunning = !!(vehicle.hasGBO && fuel?.gboActive !== false && (fuel?.gboLevel ?? 0) > 0 && coolantTemp >= 40);
  const fuelLevel = Math.round(isLpgRunning ? (fuel?.gboLevel ?? 100) : (fuel?.tankLevel ?? 75));
  const isEngineRunning = !!eng?.engineRunning;
  const isStalled = !!eng?.isStalled || !!eng?.engineStalled;
  const batteryCharge = Math.round(eng?.batteryCharge ?? 100);

  // ---- On-board computer ------------------------------------------
  let tankCapacityLiters = isLpgRunning ? (fuel?.gboCapacity ?? 42) : (fuel?.tankCapacity || 55);
  let baseAvgConsumption = isLpgRunning ? 9.2 : 7.8; // LPG consumption is ~18% higher by volume
  if (!isLpgRunning) {
    if (theme === 'sport') {
      tankCapacityLiters = fuel?.tankCapacity || 68;
      baseAvgConsumption = 12.5;
    } else if (theme === 'truck') {
      tankCapacityLiters = fuel?.tankCapacity || 180;
      baseAvgConsumption = vehicle.type === 'truck_semi' ? 34.0 : 26.0;
    } else if (theme === 'retro') {
      tankCapacityLiters = fuel?.tankCapacity || 45;
      baseAvgConsumption = 8.5;
    }
  }

  const remainingFuelLiters = ((fuelLevel / 100) * tankCapacityLiters).toFixed(1);

  // ---- Differential lock ------------------------------------------
  const diffCaps = getVehicleDiffCapabilities(vehicle.type);
  const dl = vehicle.diffLock;
  const isDiffLocked = !!(dl?.center || dl?.rear || dl?.front);

  let diffLockDesc = 'СВОБОДНЫЙ';
  if (dl?.front && dl?.rear && dl?.center) diffLockDesc = 'ПОЛНАЯ (100%)';
  else if (dl?.center && dl?.rear) diffLockDesc = 'МОБ + МКБ-З';
  else if (dl?.center) diffLockDesc = 'МОБ (МЕЖОСЕВ.)';
  else if (dl?.rear) diffLockDesc = 'МКБ-З (ЗАДНЯЯ)';
  else if (dl?.front) diffLockDesc = 'МКБ-П (ПЕРЕДН.)';

  const handleCycleDiffLock = () => {
    if (onToggleDiffLock) {
      onToggleDiffLock();
    } else {
      const res = cycleVehicleDiffLock(vehicle);
      if (res.isEngaged) sound.playDiffLockEngage();
      else if (res.changed) sound.playDiffLockDisengage();
      else sound.playDiffLockWarning();
    }
  };

  const handleToggleAxle = (axle: 'center' | 'rear' | 'front') => {
    if (onToggleAxleDiffLock) {
      onToggleAxleDiffLock(axle);
    } else {
      const res = toggleAxleDiffLock(vehicle, axle);
      if (res.success) {
        if (res.state) sound.playDiffLockEngage();
        else sound.playDiffLockDisengage();
      } else {
        sound.playDiffLockWarning();
      }
    }
  };

  // ---- Compass / slope / clock / ambient --------------------------
  const headingDeg = (((vehicle.angle * 180) / Math.PI) % 360 + 360) % 360;
  const compassHeadings = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const compassHeading = compassHeadings[Math.round(headingDeg / 45) % 8];

  const currentSlope = getTerrainSlope(vehicle.x, vehicle.y);
  const slopeAlongHeading = -(currentSlope.slopeX * Math.cos(vehicle.angle) + currentSlope.slopeY * Math.sin(vehicle.angle));
  const gradePercent = Math.round(slopeAlongHeading * 100 * 2.5);

  const safeTimeHour = ((timeHour % 24) + 24) % 24;
  const gameHours = Math.floor(safeTimeHour);
  const gameMinutes = Math.floor((safeTimeHour % 1) * 60);
  const gameTimeStr = `${String(gameHours).padStart(2, '0')}:${String(gameMinutes).padStart(2, '0')}`;

  const currentTempC = Math.round(getOutsideTemperature({ weather, calendar } as any, safeTimeHour));
  const ambientTempStr = `${currentTempC >= 0 ? '+' : ''}${currentTempC}°C`;
  const isIcyRoad = currentTempC <= 0;
  const gameDateStr = calendar ? formatGameDate(calendar, 'dashboard') : '08.10.26';
  const seasonName = calendar ? getRussianSeasonName(calendar.season) : 'Осень';

  // ---- Instant fuel consumption -----------------------------------
  // л/100км в движении, л/ч на холостом ходу, 0.0 при торможении двигателем (ПХХ)
  let consValue = '0.0';
  let consUnit = 'л/100км';
  let isFuelCut = false;
  let ecoBarRatio = 0;

  if (!isEngineRunning) {
    consUnit = 'л/ч';
  } else if (speedKmh < 2) {
    const idleFlow = 0.8 + (currentRPM > 950 ? ((currentRPM - 950) / 1000) * 1.6 : 0);
    consValue = idleFlow.toFixed(1);
    consUnit = 'л/ч';
    ecoBarRatio = Math.min(1, idleFlow / 3.5);
  } else {
    const isDecelCutoff = speedKmh > 18 && (eng?.currentGear && eng.currentGear > 0) && currentRPM > 1300 && (!eng?.clutchPedal || eng.clutchPedal < 0.2);
    if (isDecelCutoff) {
      isFuelCut = true;
      ecoBarRatio = 0.05;
    } else {
      const loadRatio = Math.max(0.35, currentRPM / 2800);
      const calculatedL100 = baseAvgConsumption * loadRatio * (1 + Math.max(0, (speedKmh - 100) / 100) * 0.4);
      const clampedL100 = Math.min(39.9, Math.max(1.8, calculatedL100));
      consValue = clampedL100.toFixed(1);
      ecoBarRatio = Math.min(1, clampedL100 / 22);
    }
  }

  const estimatedRangeKm = Math.max(0, Math.round((Number(remainingFuelLiters) / baseAvgConsumption) * 100));

  const sysVoltageStr = isEngineRunning
    ? (14.0 + (batteryCharge / 100) * 0.4).toFixed(1)
    : (11.8 + (batteryCharge / 100) * 0.8).toFixed(1);

  const tripOdoKm = (((vehicle.distanceTraveled ?? 0) / 1000) % 1000).toFixed(1);

  // ---- Transmission / gear label ----------------------------------
  const isMachinery = carType.startsWith('roller_') || carType.startsWith('paver_');
  let currentGearLabel = String(gear);
  if (eng?.transmissionType === 'MANUAL') {
    if (eng.currentGear === -1) currentGearLabel = 'R';
    else if (eng.currentGear === 0) currentGearLabel = 'N';
    else if (isMachinery) {
      currentGearLabel = eng.currentGear === 1 ? '1 (РАБ)' : '2 (ТР)';
    } else currentGearLabel = String(eng.currentGear);
  } else {
    const autoMode = eng?.autoGearMode || (typeof gear === 'string' && ['P', 'R', 'N', 'D'].includes(gear) ? gear : 'D');
    if (autoMode === 'D') {
      currentGearLabel = eng?.currentGear && eng.currentGear > 1 ? `D${eng.currentGear}` : 'D';
    } else {
      currentGearLabel = autoMode;
    }
  }
  const gearColor = currentGearLabel.startsWith('R') ? C.amber : currentGearLabel === 'P' ? C.red : currentGearLabel === 'N' ? C.muted : acc;

  const handleGearClick = () => {
    if (eng?.transmissionType === 'AUTO') {
      const ladder = ['P', 'R', 'N', 'D'] as const;
      const curMode = eng.autoGearMode || 'D';
      const nextIdx = (ladder.indexOf(curMode as any) + 1) % ladder.length;
      onSelectGear?.(ladder[nextIdx]);
    } else if (eng) {
      const maxForwardGear = (eng.gearRatios?.length || 7) - 2;
      const nextGear = eng.currentGear >= maxForwardGear ? -1 : eng.currentGear + 1;
      onSelectGear?.(nextGear);
    }
  };

  // ---- Dial scales per vehicle class ------------------------------
  let maxSpeed = 240;
  let maxRPM = 8000;
  let redlineRPM = 6200;

  if (isMachinery) {
    maxSpeed = 25;
    maxRPM = 2800;
    redlineRPM = 2200;
  } else if (carType.startsWith('tractor_')) {
    maxSpeed = 45;
    maxRPM = 3000;
    redlineRPM = 2200;
  } else if (carType.startsWith('truck_') || carType === 'bus' || carType === 'bus_minibus' || carType === 'cement_mixer' || carType === 'garbage_truck' || carType === 'fire_engine' || carType === 'fire_ladder' || carType === 'fire_rescue') {
    maxSpeed = 130;
    maxRPM = 3600;
    redlineRPM = 2600;
  } else if (theme === 'sport') {
    maxSpeed = 340;
    maxRPM = 9000;
    redlineRPM = 7000;
  } else if (theme === 'truck') {
    maxSpeed = 160;
    maxRPM = 4500;
    redlineRPM = 3400;
  } else if (theme === 'retro') {
    maxSpeed = 180;
    maxRPM = 6500;
    redlineRPM = 5200;
  } else if (theme === 'emergency') {
    maxSpeed = 260;
    maxRPM = 7500;
    redlineRPM = 6200;
  }

  // Pick a major tick step that gives 5-9 labelled marks.
  const speedMajor = [5, 10, 20, 25, 40, 50].find((s) => maxSpeed / s <= 9) ?? 50;
  const rpmRatio = Math.max(0, Math.min(1, currentRPM / maxRPM));

  // ---- Warning state ----------------------------------------------
  const isOverheating = coolantTemp >= 105;
  const isColdEngine = isEngineRunning && coolantTemp < 55;
  const isLowOil = oilPressure < 20 || (!!eng && eng.oilLevel < 15);
  const isLowFuel = fuelLevel < 15;

  const isSeized = !!eng?.isSeized || (eng?.engineHealth ?? 100) <= 10;
  const isBlinkingCheck = !!(isEngineRunning && (eng?.engineKnocking || fuel?.detonation));
  const isDtcFault = !!(
    isEngineRunning && (
      coolantTemp > 105 ||
      (eng?.engineHealth ?? 100) < 65 ||
      eng?.radiatorPunctured ||
      eng?.oilPunctured ||
      (fuel && (fuel.fuelQuality < 50 || (vehicle.requiredFuel === 'ai95' && fuel.octaneNumber === 92)))
    )
  );
  // Bulb-check: the MIL stays lit while the engine is off.
  const isCheckEngine = !isEngineRunning || isSeized || isBlinkingCheck || isDtcFault;
  const isBattLit = !isEngineRunning || batteryCharge < 20 || eng?.batteryInstalled === false || eng?.batteryPosConnected === false || eng?.batteryNegConnected === false;
  const isTransWarn = !!(eng?.transmissionJammed || (eng?.transmissionHealth ?? 100) < 60);
  const isOilLit = !isEngineRunning || isLowOil;
  const isParkBrakeLit = isHandbraking || (eng?.transmissionType === 'AUTO' && eng?.autoGearMode === 'P');

  const leftSignalOn = playerTurnSignal === 'left' || playerTurnSignal === 'hazard';
  const rightSignalOn = playerTurnSignal === 'right' || playerTurnSignal === 'hazard';

  const engineLabel = isEngineRunning ? 'Мотор вкл' : isStalled ? 'Заглох' : 'Мотор выкл';
  const engineColor = isEngineRunning ? C.green : isStalled ? C.amber : C.red;

  const toggleEngineBtn = (
    <button
      type="button"
      onClick={onToggleEngine}
      title="Зажигание: запустить / заглушить двигатель [J]"
      className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border text-[12px] font-bold font-mono shrink-0 transition active:scale-95 cursor-pointer ${isStalled && !isEngineRunning ? 'animate-pulse' : ''}`}
      style={{ background: `${engineColor}26`, borderColor: `${engineColor}aa`, color: engineColor }}
    >
      <Power className="w-4 h-4" />
      <span>{isEngineRunning ? 'ЗАГЛУШИТЬ' : 'ЗАПУСК'}</span>
    </button>
  );

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div
      id="speedometer-cluster"
      className="fixed bottom-1 sm:bottom-2 md:bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none transition-all duration-300 flex flex-col items-center"
      style={{ maxWidth: 'calc(100vw - 16px)' }}
    >
      {/* Collapse / expand handle */}
      <button
        type="button"
        onClick={() => setIsMinimized((prev) => !prev)}
        className="mb-1 h-6 px-3 rounded-md border text-[11px] font-mono font-bold flex items-center gap-2 shadow-lg backdrop-blur-md cursor-pointer transition active:scale-95"
        style={{ background: C.panel, borderColor: C.line, color: C.text }}
        title="Свернуть / развернуть приборную панель"
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: acc }} />
        <span className="uppercase tracking-wider">Приборы</span>
        {isMinimized ? <ChevronUp className="w-3.5 h-3.5" style={{ color: acc }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: acc }} />}
      </button>

      {isMinimized ? (
        /* ------------------------- COMPACT BAR ------------------------- */
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg border backdrop-blur-md shadow-2xl whitespace-nowrap overflow-x-auto max-w-full animate-in fade-in duration-100"
          style={{ background: C.panel, borderColor: C.line, color: C.text }}
        >
          {/* Speed */}
          <div className="flex items-baseline gap-1 font-mono shrink-0">
            <span className="text-3xl font-black leading-none tabular-nums" style={{ color: acc }}>{speedKmh}</span>
            <span className="text-[11px] font-bold uppercase" style={{ color: C.muted }}>км/ч</span>
          </div>

          <span className="h-6 w-px shrink-0" style={{ background: C.line }} />

          {/* Gear */}
          <span
            className="min-w-[34px] text-center px-2 py-0.5 rounded-md border font-mono font-black text-lg leading-tight shrink-0"
            style={{ background: C.surface, borderColor: C.line, color: gearColor }}
          >
            {currentGearLabel}
          </span>

          {/* RPM mini bar */}
          <div className="flex flex-col gap-1 w-[84px] shrink-0">
            <div className="flex items-baseline justify-between font-mono leading-none">
              <span className="text-[10px] font-bold uppercase" style={{ color: C.muted }}>об/мин</span>
              <span className="text-[13px] font-black tabular-nums" style={{ color: currentRPM > redlineRPM ? C.red : C.text }}>{currentRPM}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1d222d' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, rpmRatio * 100)}%`, background: currentRPM > redlineRPM ? C.red : acc }} />
            </div>
          </div>

          {/* Fuel */}
          <span
            className={`flex items-center gap-1 font-mono text-[13px] font-black shrink-0 ${isLowFuel ? 'animate-pulse' : ''}`}
            style={{ color: isLowFuel ? C.amber : C.text }}
            title={isLpgRunning ? 'Газ (ГБО)' : 'Топливо'}
          >
            <Fuel className="w-4 h-4" />
            {fuelLevel}%
          </span>

          {(isOverheating || isLowOil || isCheckEngine && isEngineRunning) && (
            <span className="flex items-center gap-1 text-[11px] font-bold font-mono shrink-0 animate-pulse" style={{ color: C.red }}>
              <AlertTriangle className="w-4 h-4" />
              {isOverheating ? 'ПЕРЕГРЕВ' : isLowOil ? 'МАСЛО' : 'ДВС'}
            </span>
          )}

          {eng?.hasTransferCase && (
            <span
              className="px-1.5 py-0.5 rounded-md border text-[11px] font-black font-mono shrink-0"
              style={{ background: C.surface, borderColor: C.line, color: eng.transferCaseMode === 'LOW' ? acc : C.muted }}
              title="Делитель [X]"
            >
              {eng.transferCaseMode === 'LOW' ? 'LO' : 'HI'}
            </span>
          )}

          {diffCaps.supported && (
            <Btn accent={acc} active={isDiffLocked} onClick={handleCycleDiffLock} title="Блокировка дифференциала [V]" tone="amber">
              <ShieldAlert className="w-4 h-4" />
              <span>{diffLockDesc}</span>
            </Btn>
          )}

          <span className="h-6 w-px shrink-0" style={{ background: C.line }} />

          {/* Signals */}
          <div className="flex items-center gap-1 shrink-0">
            <ArrowLeft className={`w-5 h-5 ${leftSignalOn ? 'animate-pulse' : ''}`} style={{ color: leftSignalOn ? C.green : C.dim }} />
            <ArrowRight className={`w-5 h-5 ${rightSignalOn ? 'animate-pulse' : ''}`} style={{ color: rightSignalOn ? C.green : C.dim }} />
          </div>

          {toggleEngineBtn}
        </div>
      ) : (
        /* ------------------------- FULL CLUSTER ------------------------- */
        <div
          className="relative rounded-xl border p-3 sm:p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-3 w-[600px] max-w-[96vw] scale-[0.72] sm:scale-[0.86] md:scale-100 origin-bottom animate-in fade-in duration-150"
          style={{ background: C.panel, borderColor: C.line, color: C.text }}
        >
          {/* Status strip: environment on the left, engine and indicators on the right */}
          <div className="flex items-center justify-between gap-2 flex-wrap font-mono text-[12px]">
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap" style={{ color: C.text }}>
              <span className="flex items-center gap-1.5 font-bold" title={`Дата (${seasonName})`}>
                <Calendar className="w-3.5 h-3.5" style={{ color: acc }} />
                {gameDateStr}
              </span>
              <span className="flex items-center gap-1.5 font-bold" title="Игровое время">
                <Clock className="w-3.5 h-3.5" style={{ color: acc }} />
                {gameTimeStr}
              </span>
              <span className="flex items-center gap-1.5 font-bold" title="Температура за бортом">
                <Thermometer className="w-3.5 h-3.5" style={{ color: acc }} />
                {ambientTempStr}
              </span>
              {isIcyRoad && (
                <span className="flex items-center gap-1 font-extrabold animate-pulse" style={{ color: C.blue }} title="Внимание: гололёд, возможно обледенение дороги">
                  <Snowflake className="w-3.5 h-3.5" />
                  ГОЛОЛЁД
                </span>
              )}
              <span className="flex items-center gap-1.5 font-bold" title="Курс">
                <Compass className="w-3.5 h-3.5" style={{ color: acc }} />
                {compassHeading}
              </span>
              {Math.abs(gradePercent) >= 2 && (
                <span className="font-extrabold" style={{ color: acc }} title={gradePercent > 0 ? `Подъём: +${gradePercent}%` : `Спуск: ${gradePercent}%`}>
                  {gradePercent > 0 ? '▲' : '▼'} {gradePercent > 0 ? `+${gradePercent}` : gradePercent}%
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isDrifting && (
                <span className="px-2 h-6 inline-flex items-center rounded-md border text-[10px] font-black uppercase animate-pulse" style={{ color: C.amber, borderColor: `${C.amber}88`, background: `${C.amber}1f` }}>
                  Занос
                </span>
              )}
              <span
                className={`px-2 h-6 inline-flex items-center gap-1.5 rounded-md border text-[11px] font-bold ${isStalled && !isEngineRunning ? 'animate-pulse' : ''}`}
                style={{ color: engineColor, borderColor: `${engineColor}77`, background: `${engineColor}1a` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: engineColor }} />
                {engineLabel}
              </span>
              {playerHeadlightMode !== 'off' && (
                <span title={playerHeadlightMode === 'high' ? 'Дальний свет' : 'Ближний свет'} className="inline-flex">
                  <Lightbulb className="w-5 h-5" style={{ color: playerHeadlightMode === 'high' ? C.blue : C.green }} />
                </span>
              )}
              <ArrowLeft className={`w-6 h-6 ${leftSignalOn ? 'animate-pulse' : ''}`} style={{ color: leftSignalOn ? C.green : C.dim }} />
              <ArrowRight className={`w-6 h-6 ${rightSignalOn ? 'animate-pulse' : ''}`} style={{ color: rightSignalOn ? C.green : C.dim }} />
            </div>
          </div>

          {/* Main row: tachometer | gear + on-board computer | speedometer */}
          <div className="grid items-center gap-2 rounded-lg border p-2" style={{ gridTemplateColumns: '1fr 188px 1fr', background: '#0a0c10', borderColor: C.line }}>
            {/* Tachometer */}
            <ArcGauge value={currentRPM} max={maxRPM} major={1000} minor={500} labelDiv={1000} redFrom={redlineRPM} accent={acc} needle={needle}>
              <text x="80" y="112" textAnchor="middle" fontSize="22" fontWeight="900" fill={currentRPM > redlineRPM ? C.red : C.text} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                {currentRPM}
              </text>
              <text x="80" y="127" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                об/мин ×1000
              </text>
            </ArcGauge>

            {/* Centre: gear + MFD */}
            <div className="flex flex-col gap-2 min-w-0">
              <button
                type="button"
                onClick={handleGearClick}
                title="Передача (клик: переключить)"
                className="flex items-baseline justify-center gap-2 rounded-md border py-1 cursor-pointer transition active:scale-95"
                style={{ background: C.surface, borderColor: C.line }}
              >
                <span className="text-[28px] leading-none font-black font-mono" style={{ color: gearColor }}>{currentGearLabel}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                  {eng?.transmissionType === 'AUTO' ? 'авто' : 'мкпп'}
                </span>
              </button>

              {/* Trip computer */}
              {(() => {
                const availableModes: { id: TripComputerMode; label: string }[] = [
                  { id: 'eco', label: 'РАСХ' },
                  { id: 'range', label: 'ЗАПАС' },
                  { id: 'trip', label: 'ПУТЬ' },
                  { id: 'sys', label: 'СИСТ' }
                ];
                if (vehicle.fluidTank && vehicle.fluidTank.capacity > 0) availableModes.push({ id: 'tank', label: 'ЦИСТ' });
                if (vehicle.hasGBO) availableModes.push({ id: 'gbo', label: 'ГБО' });
                const mode = availableModes.some((m) => m.id === tripMode) ? tripMode : 'eco';

                let title = '';
                let value = '';
                let sub = '';
                let subColor: string = C.muted;
                let valueColor: string = C.text;

                if (mode === 'eco') {
                  title = 'Расход';
                  value = isFuelCut ? 'ПХХ' : `${consValue} ${consUnit}`;
                  sub = isFuelCut ? 'топливо отсечено' : `средний ${baseAvgConsumption.toFixed(1)} л/100км`;
                } else if (mode === 'range') {
                  title = 'Запас хода';
                  value = `${estimatedRangeKm} км`;
                  sub = `${remainingFuelLiters} л из ${tankCapacityLiters} л`;
                } else if (mode === 'trip') {
                  title = 'Поездка А';
                  value = `${tripOdoKm} км`;
                  sub = `средний ${baseAvgConsumption.toFixed(1)} л/100км`;
                } else if (mode === 'sys') {
                  title = 'Бортсеть';
                  value = `${sysVoltageStr} В`;
                  sub = diffCaps.supported ? `Диффер.: ${diffLockDesc}` : `Заряд АКБ ${batteryCharge}%`;
                  subColor = diffCaps.supported && isDiffLocked ? C.amber : C.muted;
                } else if (mode === 'tank' && vehicle.fluidTank) {
                  const ft = vehicle.fluidTank;
                  title = `Цистерна: ${String(ft.liquidType).toUpperCase()}`;
                  value = `${Math.round(ft.currentVolume ?? ft.currentAmount ?? 0)} л`;
                  valueColor = ft.isPunctured ? C.red : C.text;
                  sub = ft.drainValveOpen ? 'сливной клапан открыт' : ft.isPunctured ? 'пробоина цистерны!' : `ёмкость ${ft.capacity} л`;
                  subColor = ft.drainValveOpen ? C.amber : ft.isPunctured ? C.red : C.muted;
                } else if (mode === 'gbo') {
                  const isGboOn = fuel?.gboActive !== false;
                  const hasLpg = (fuel?.gboLevel ?? 0) > 0;
                  const isWarm = coolantTemp >= 40;
                  title = 'Система ГБО';
                  value = !isGboOn ? 'ВЫКЛ (бенз.)' : !isWarm ? 'ПРОГРЕВ' : hasLpg ? 'ГАЗ' : 'НЕТ ГАЗА';
                  valueColor = !isGboOn ? C.muted : !isWarm ? C.amber : hasLpg ? C.green : C.red;
                  sub = `${Math.round(fuel?.gboLevel ?? 0)}% (${(((fuel?.gboLevel ?? 0) / 100) * (fuel?.gboCapacity ?? 42)).toFixed(1)} л), клик: вкл/выкл`;
                }

                return (
                  <div className="rounded-md border overflow-hidden" style={{ background: '#05070a', borderColor: C.line }}>
                    <div className="flex" style={{ borderBottom: `1px solid ${C.line}` }}>
                      {availableModes.map((m) => {
                        const on = m.id === mode;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTripMode(m.id);
                              try { sound.click(); } catch {}
                            }}
                            className="flex-1 py-1 text-[9px] font-bold font-mono cursor-pointer transition"
                            style={{ background: on ? `${acc}26` : 'transparent', color: on ? acc : C.dim }}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    <div
                      className={`px-2.5 py-1.5 ${mode === 'gbo' ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (mode === 'gbo' && fuel) {
                          fuel.gboActive = !fuel.gboActive;
                          try { sound.playButtonPress(); } catch {}
                        }
                      }}
                    >
                      <div className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color: C.muted }}>{title}</div>
                      <div className="text-[17px] leading-tight font-black font-mono tabular-nums truncate" style={{ color: valueColor }}>{value}</div>
                      {mode === 'eco' && (
                        <div className="h-1 rounded-full overflow-hidden my-1" style={{ background: '#1d222d' }}>
                          <div
                            className="h-full rounded-full transition-[width] duration-200"
                            style={{
                              width: `${Math.max(2, ecoBarRatio * 100)}%`,
                              background: ecoBarRatio > 0.75 ? C.red : ecoBarRatio > 0.45 ? C.amber : C.green
                            }}
                          />
                        </div>
                      )}
                      <div className="text-[10px] font-mono truncate" style={{ color: subColor }}>{sub}</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Speedometer */}
            <ArcGauge value={speedKmh} max={maxSpeed} major={speedMajor} minor={speedMajor / 2} accent={acc} needle={needle}>
              <text x="80" y="114" textAnchor="middle" fontSize="30" fontWeight="900" fill={C.text} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                {speedKmh}
              </text>
              <text x="80" y="128" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                км/ч
              </text>
              <text x="80" y="142" textAnchor="middle" fontSize="9" fontWeight="600" fill={C.dim} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                ODO {ODOMETER_TOTAL}
              </text>
            </ArcGauge>
          </div>

          {/* Vital signs */}
          <div className="grid grid-cols-4 gap-2">
            <StatBar
              icon={<Fuel className="w-3 h-3" />}
              label={isLpgRunning ? 'Газ' : vehicle.hasGBO ? 'Бензин' : 'Топливо'}
              value={`${fuelLevel}%`}
              ratio={fuelLevel / 100}
              color={isLowFuel ? C.amber : C.green}
              warn={isLowFuel}
            />
            <StatBar
              icon={<Thermometer className="w-3 h-3" />}
              label="Двигатель"
              value={`${coolantTemp}°`}
              ratio={(coolantTemp - 40) / 90}
              color={isOverheating ? C.red : isColdEngine ? C.blue : C.green}
              warn={isOverheating}
            />
            <StatBar
              icon={<Droplet className="w-3 h-3" />}
              label="Масло"
              value={`${oilPressure}`}
              ratio={oilPressure / 100}
              color={isLowOil ? C.red : C.green}
              warn={isLowOil && isEngineRunning}
            />
            <StatBar
              icon={<Battery className="w-3 h-3" />}
              label="Бортсеть"
              value={`${sysVoltageStr} В`}
              ratio={batteryCharge / 100}
              color={batteryCharge < 20 ? C.red : C.green}
              warn={batteryCharge < 20}
            />
          </div>

          {/* Warning lamps */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <Telltale
              icon={<Wrench className="w-3.5 h-3.5" />}
              label="ДВС"
              level={isCheckEngine ? (isSeized ? 'red' : 'amber') : 'off'}
              blink={isBlinkingCheck}
              title={isSeized ? 'Двигатель заклинил' : isBlinkingCheck ? 'Детонация / пропуски зажигания' : 'Check Engine'}
            />
            <Telltale icon={<Battery className="w-3.5 h-3.5" />} label="АКБ" level={isBattLit ? 'red' : 'off'} title="Зарядка аккумулятора" />
            <Telltale icon={<Cog className="w-3.5 h-3.5" />} label="КПП" level={isTransWarn ? 'red' : 'off'} title="Неисправность трансмиссии" />
            <Telltale icon={<Droplet className="w-3.5 h-3.5" />} label="Масло" level={isOilLit ? 'red' : 'off'} title="Давление масла" />
            <Telltale
              icon={<span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border text-[8px] font-black leading-none" style={{ borderColor: 'currentColor' }}>P</span>}
              label="Стоянка"
              level={isParkBrakeLit ? 'red' : 'off'}
              title="Стояночный тормоз"
            />
            {isOverheating && <Telltale icon={<Thermometer className="w-3.5 h-3.5" />} label="Перегрев" level="red" blink title="Перегрев двигателя" />}
            {isLowFuel && <Telltale icon={<Fuel className="w-3.5 h-3.5" />} label="Топливо" level="amber" blink title="Низкий уровень топлива" />}
            {isColdEngine && <Telltale icon={<Snowflake className="w-3.5 h-3.5" />} label="Холодный" level="off" title="Двигатель не прогрет" />}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap pt-3 border-t" style={{ borderColor: C.line }}>
            <Btn accent={acc} tone="green" active={leftSignalOn} pulse onClick={() => onToggleTurnSignal?.('left')} title="Левый поворотник [Q]">
              <ArrowLeft className="w-4 h-4" />
              <span>Q</span>
            </Btn>
            <Btn accent={acc} tone="red" active={playerTurnSignal === 'hazard'} pulse onClick={() => onToggleTurnSignal?.('hazard')} title="Аварийка [Z]">
              <AlertTriangle className="w-4 h-4" />
              <span>Z</span>
            </Btn>
            <Btn accent={acc} tone="green" active={rightSignalOn} pulse onClick={() => onToggleTurnSignal?.('right')} title="Правый поворотник [E]">
              <span>E</span>
              <ArrowRight className="w-4 h-4" />
            </Btn>

            <span className="h-6 w-px mx-0.5" style={{ background: C.line }} />

            <Btn
              accent={acc}
              tone={playerHeadlightMode === 'high' ? 'acc' : 'green'}
              active={playerHeadlightMode !== 'off'}
              onClick={onToggleHeadlights}
              title="Фары: ближний / дальний / выкл [L]"
            >
              <Lightbulb className="w-4 h-4" />
              <span>L {playerHeadlightMode === 'high' ? 'дальний' : playerHeadlightMode === 'low' ? 'ближний' : ''}</span>
            </Btn>

            {(vehicle.type === 'truck_water' || vehicle.type === 'fire_engine') && (
              <Btn
                accent={acc}
                tone={vehicle.isPtoActive && isEngineRunning ? 'acc' : 'amber'}
                active={!!vehicle.isPtoActive}
                pulse={!!(vehicle.isPtoActive && isEngineRunning)}
                onClick={() => {
                  vehicle.isPtoActive = !vehicle.isPtoActive;
                  sound.playButtonPress();
                }}
                title="КОМ (коробка отбора мощности / привод насоса) [P]"
              >
                <Gauge className="w-4 h-4" />
                <span>
                  КОМ [P]:{' '}
                  {vehicle.isPtoActive && isEngineRunning
                    ? `${(3.8 + Math.min(1.0, Math.max(0, ((vehicle.engineState?.engineRPM || 800) - 750) / 1850)) * 3.8).toFixed(1)} бар`
                    : vehicle.isPtoActive
                    ? 'нет ДВС'
                    : 'самотёк'}
                </span>
              </Btn>
            )}

            {vehicle.type === 'truck_water' && (
              <Btn
                accent={acc}
                tone={vehicle.isPtoActive && isEngineRunning ? 'acc' : 'amber'}
                active={!!vehicle.isWashingNozzlesActive}
                pulse={!!(vehicle.isWashingNozzlesActive && vehicle.isPtoActive && isEngineRunning)}
                onClick={() => {
                  vehicle.isWashingNozzlesActive = !vehicle.isWashingNozzlesActive;
                  sound.playButtonPress();
                }}
                title="Поливомоечные сопла: смывать мусор [G / N]"
              >
                <Droplet className="w-4 h-4" />
                <span>Сопла [G]: {vehicle.isWashingNozzlesActive ? (vehicle.isPtoActive && isEngineRunning ? 'вкл' : 'самотёк') : 'выкл'}</span>
              </Btn>
            )}

            {carType.startsWith('tractor_') && (
              <>
                <Btn
                  accent={acc}
                  tone={vehicle.tractorBrakeLatch !== false ? 'green' : 'amber'}
                  active
                  onClick={() => {
                    vehicle.tractorBrakeLatch = vehicle.tractorBrakeLatch === false;
                    sound.playButtonPress();
                  }}
                  title="Блокировка спаренных педалей тормоза МТЗ [B]"
                >
                  {vehicle.tractorBrakeLatch !== false ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  <span>Тормоза [B]: {vehicle.tractorBrakeLatch !== false ? 'сблокир.' : 'раздельн.'}</span>
                </Btn>
                <div className="flex items-center gap-1 h-8 px-2 rounded-md border text-[11px] font-bold font-mono" style={{ background: C.surface, borderColor: C.line, color: C.muted }}>
                  <span className="text-[9px] uppercase mr-0.5">Педали</span>
                  <span
                    className="px-1.5 rounded transition"
                    style={{ background: (vehicle as any)?._brakeLeftVal > 0.1 ? C.red : '#1d222d', color: (vehicle as any)?._brakeLeftVal > 0.1 ? '#fff' : C.dim }}
                  >
                    Л [,]
                  </span>
                  <span
                    className="px-1.5 rounded transition"
                    style={{ background: (vehicle as any)?._brakeRightVal > 0.1 ? C.red : '#1d222d', color: (vehicle as any)?._brakeRightVal > 0.1 ? '#fff' : C.dim }}
                  >
                    П [.]
                  </span>
                </div>
              </>
            )}

            {diffCaps.supported && (
              <div className="flex items-center gap-1 rounded-md border pl-1 pr-1 h-8" style={{ background: C.surface, borderColor: C.line }}>
                <button
                  type="button"
                  onClick={handleCycleDiffLock}
                  title="Циклическое переключение блокировок дифференциала [V]"
                  className="inline-flex items-center gap-1.5 h-6 px-2 rounded text-[12px] font-mono font-bold cursor-pointer transition active:scale-95"
                  style={{ color: isDiffLocked ? C.amber : C.muted, background: isDiffLocked ? `${C.amber}26` : 'transparent' }}
                >
                  <ShieldAlert className={`w-4 h-4 ${isDiffLocked ? 'animate-pulse' : ''}`} />
                  <span>Дифф [V]</span>
                  <span className="font-black">{diffLockDesc}</span>
                </button>
                {([
                  { axle: 'center' as const, has: diffCaps.hasCenter, label: 'МОБ', title: 'Межосевая блокировка (МОБ) 50:50', on: !!dl?.center },
                  { axle: 'rear' as const, has: diffCaps.hasRear, label: 'МКБ-З', title: 'Межколесная блокировка задней оси (МКБ-З)', on: !!dl?.rear },
                  { axle: 'front' as const, has: diffCaps.hasFront, label: 'МКБ-П', title: 'Межколесная блокировка передней оси (МКБ-П)', on: !!dl?.front }
                ]).filter((a) => a.has).map((a) => (
                  <button
                    key={a.axle}
                    type="button"
                    onClick={() => handleToggleAxle(a.axle)}
                    title={a.title}
                    className="h-6 px-1.5 rounded text-[11px] font-mono font-bold cursor-pointer transition active:scale-90 border"
                    style={
                      a.on
                        ? { background: C.amber, color: '#0d0f13', borderColor: C.amber }
                        : { background: 'transparent', color: C.muted, borderColor: C.line }
                    }
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            {/* Mechanical ignition lock */}
            {(() => {
              const t = vehicle.type || '';
              const requiresMechKey =
                t === 'classic_compact' ||
                t === 'retro_bubble' ||
                t === 'sedan_classic' ||
                t === 'wagon_classic' ||
                t === 'micro_car' ||
                t === 'muscle_classic' ||
                t === 'suv_classic_box' ||
                t === 'offroad_hardcore' ||
                t.startsWith('tractor_') ||
                t.startsWith('truck_') ||
                t === 'van_cargo_old' ||
                t === 'cement_mixer' ||
                t === 'garbage_truck' ||
                t === 'delivery_truck';

              if (!requiresMechKey) return null;

              const isInserted = !!vehicle.insertedKeyType;
              const isGoldKey = vehicle.insertedKeyType === 'gold';
              const keyName = isGoldKey ? 'Золотой' : 'Железный';

              return (
                <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-[12px] font-mono shrink-0" style={{ background: C.surface, borderColor: C.line }}>
                  <span className="text-[10px] font-bold uppercase" style={{ color: C.muted }}>Замок</span>
                  {isInserted ? (
                    <button
                      type="button"
                      onClick={onTakeOutKey}
                      title="Вынуть ключ из зажигания"
                      className="flex items-center gap-1 h-6 px-1.5 rounded border font-bold cursor-pointer transition active:scale-95"
                      style={{ color: C.amber, borderColor: `${C.amber}66`, background: `${C.amber}1a` }}
                    >
                      <Key className="w-3.5 h-3.5" style={{ color: isGoldKey ? C.amber : C.text }} />
                      <span>{keyName}</span>
                      <span className="text-[10px] font-normal underline" style={{ color: C.muted }}>вынуть</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 rounded border font-bold" style={{ color: C.red, borderColor: `${C.red}66`, background: `${C.red}1a` }}>Пусто</span>
                      {(() => {
                        const neededKeyType = getVehicleRequiredKeyType(vehicle);
                        if (!neededKeyType) return null;
                        if (hasKeysInInventory.includes(neededKeyType)) {
                          return (
                            <button
                              type="button"
                              onClick={() => onInsertKey?.(neededKeyType)}
                              title="Вставить подходящий ключ"
                              className="flex items-center gap-1 h-6 px-2 rounded border font-black cursor-pointer transition active:scale-95 animate-pulse"
                              style={{ color: C.green, borderColor: `${C.green}88`, background: `${C.green}26` }}
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>Вставить</span>
                            </button>
                          );
                        }
                        return (
                          <span className="text-[10px] flex items-center gap-1" style={{ color: C.muted }}>
                            нужен {neededKeyType === 'gold' ? 'золотой' : 'железный'} <Key className="w-3 h-3" />
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Taximeter */}
            {(() => {
              const taxi = TaxiFleetSystem.getInstance();
              const order = taxi.activeOrder;
              if (!order && !taxi.profile.isShiftActive) return null;

              if (order) {
                const currentFare = Math.round(
                  order.baseFare +
                  (order.distanceDrivenMeters / 1000) * order.ratePerKm +
                  order.paidWaitingFare
                );
                return (
                  <div className="flex items-center gap-2 h-8 px-2.5 rounded-md border text-[12px] font-mono shrink-0" style={{ background: `${C.amber}1f`, borderColor: `${C.amber}99`, color: C.amber }}>
                    <Car className="w-4 h-4" />
                    <span className="hidden sm:inline font-bold uppercase">Таксометр</span>
                    <span className="font-black text-[14px]">{currentFare} ₽</span>
                    <span style={{ color: `${C.amber}88` }}>|</span>
                    <span style={{ color: C.text }}>
                      {order.stage === 'driving_to_pickup' && 'подача'}
                      {order.stage === 'waiting_for_passenger' && `ожидание (${Math.floor(order.waitingSeconds)} с)`}
                      {order.stage === 'passenger_boarding' && 'посадка'}
                      {order.stage === 'in_transit' && `${(order.distanceDrivenMeters / 1000).toFixed(1)} км`}
                      {order.stage === 'passenger_alighting' && 'высадка'}
                    </span>
                  </div>
                );
              }

              return (
                <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-[12px] font-bold font-mono shrink-0" style={{ background: C.surface, borderColor: `${C.green}66`, color: C.green }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.green }} />
                  <span className="hidden sm:inline">Такси: на линии</span>
                  <span className="sm:hidden">Такси</span>
                </div>
              );
            })()}

            <span className="h-6 w-px mx-0.5" style={{ background: C.line }} />

            {toggleEngineBtn}

            {onOpenRadialMenu && (
              <Btn accent={acc} onClick={onOpenRadialMenu} title="Меню автомобиля">
                <Gauge className="w-4 h-4" style={{ color: acc }} />
                <span className="hidden sm:inline">Меню</span>
              </Btn>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
  Snowflake,
  Battery,
  Wrench,
  Cog,
  Key,
  Lock,
  Unlock,
  Car,
  Route,
  Zap,
  Container,
  Flame
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
/*  Palette: same as the rest of the game HUD (square 2px corners,     */
/*  #14161a panels, #2a2e38 borders, amber #c68a35 accent)             */
/* ------------------------------------------------------------------ */

const C = {
  panel: 'rgba(20,22,26,0.95)',
  well: '#0b0c0e',
  line: '#2a2e38',
  text: '#f0f3f6',
  muted: '#9ba3af',
  dim: '#5a6272',
  amber: '#c68a35',
  amberHi: '#d99a41',
  red: '#ef4444',
  green: '#22c55e',
  blue: '#38bdf8'
};

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
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

const A0 = -135;
const A1 = 135;

interface DialProps {
  value: number;
  max: number;
  redFrom?: number;
  children?: React.ReactNode;
}

/** Compact 270-degree dial: filled arc + ticks, centre content is HTML so text stays sharp. */
const Dial: React.FC<DialProps> = ({ value, max, redFrom, children }) => {
  const ratio = Math.max(0, Math.min(1, value / max));
  const end = A0 + ratio * (A1 - A0);
  const inRed = redFrom !== undefined && value >= redFrom;

  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = A0 + (i / 10) * (A1 - A0);
    const v = (i / 10) * max;
    const [x1, y1] = polar(50, 50, i % 5 === 0 ? 44.5 : 46.5, a);
    const [x2, y2] = polar(50, 50, 49, a);
    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={redFrom !== undefined && v >= redFrom ? C.red : C.dim}
        strokeWidth={i % 5 === 0 ? 1.6 : 1}
      />
    );
  }

  return (
    <div className="relative w-[84px] h-[84px] shrink-0">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <path d={arcPath(50, 50, 38, A0, A1)} fill="none" stroke="#1c1f26" strokeWidth="7" strokeLinecap="round" />
        {redFrom !== undefined && redFrom < max && (
          <path
            d={arcPath(50, 50, 38, A0 + (redFrom / max) * (A1 - A0), A1)}
            fill="none"
            stroke={C.red}
            strokeOpacity="0.4"
            strokeWidth="7"
            strokeLinecap="round"
          />
        )}
        {ratio > 0.01 && (
          <path d={arcPath(50, 50, 38, A0, end)} fill="none" stroke={inRed ? C.red : C.amber} strokeWidth="7" strokeLinecap="round" />
        )}
        {ticks}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">{children}</div>
    </div>
  );
};

type Tone = 'amber' | 'red' | 'green';

interface IconBtnProps {
  onClick?: () => void;
  title: string;
  active?: boolean;
  tone?: Tone;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

const toneCol = (t: Tone) => (t === 'red' ? C.red : t === 'green' ? C.green : C.amberHi);
const toneBg = (t: Tone) => (t === 'red' ? 'rgba(239,68,68,0.18)' : t === 'green' ? 'rgba(34,197,94,0.18)' : 'rgba(198,138,53,0.22)');
const toneBorder = (t: Tone) => (t === 'red' ? 'rgba(239,68,68,0.6)' : t === 'green' ? 'rgba(34,197,94,0.55)' : 'rgba(198,138,53,0.65)');

/** Square icon button (28px) in the game's HUD style. The meaning lives in the tooltip. */
const IconBtn: React.FC<IconBtnProps> = ({ onClick, title, active = false, tone = 'amber', pulse = false, children, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`inline-flex items-center justify-center gap-1 h-7 min-w-[28px] px-1.5 rounded-[2px] border font-mono text-[11px] font-bold shrink-0 transition active:scale-95 cursor-pointer ${active && pulse ? 'animate-pulse' : ''} ${className}`}
    style={
      active
        ? { background: toneBg(tone), borderColor: toneBorder(tone), color: toneCol(tone) }
        : { background: C.well, borderColor: C.line, color: C.muted }
    }
  >
    {children}
  </button>
);

const MiniBar: React.FC<{ icon: React.ReactNode; ratio: number; color: string; warn?: boolean; title: string }> = ({ icon, ratio, color, warn, title }) => (
  <div className="flex items-center gap-1.5" title={title}>
    <span className={warn ? 'animate-pulse' : ''} style={{ color: warn ? color : C.muted }}>{icon}</span>
    <div className="flex-1 h-1.5 overflow-hidden rounded-[1px]" style={{ background: '#1c1f26' }}>
      <div className="h-full transition-[width] duration-200" style={{ width: `${Math.max(3, Math.min(100, ratio * 100))}%`, background: color }} />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const SpeedometerHUD: React.FC<SpeedometerHUDProps> = ({
  vehicle,
  speedKmh,
  gear,
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
  const [tripMode, setTripMode] = useState<TripComputerMode>('range');

  if (!vehicle) return null;

  const carType = vehicle.type;
  const theme = getVehicleDashboardTheme(carType);
  const eng = vehicle.engineState;
  const fuel = vehicle.fuelSystem;

  // ---- Sensors ------------------------------------------------------
  const currentRPM = eng?.engineRunning ? Math.round(eng.engineRPM || 800) : 0;
  const coolantTemp = Math.round(eng?.temperature ?? 88);
  const oilPressure = Math.round(eng?.oilPressure ?? (eng?.oilLevel ?? 90));

  const isLpgRunning = !!(vehicle.hasGBO && fuel?.gboActive !== false && (fuel?.gboLevel ?? 0) > 0 && coolantTemp >= 40);
  const fuelLevel = Math.round(isLpgRunning ? (fuel?.gboLevel ?? 100) : (fuel?.tankLevel ?? 75));
  const isEngineRunning = !!eng?.engineRunning;
  const isStalled = !!eng?.isStalled || !!eng?.engineStalled;
  const batteryCharge = Math.round(eng?.batteryCharge ?? 100);

  // ---- Trip computer ------------------------------------------------
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
  const remainingFuelLiters = (fuelLevel / 100) * tankCapacityLiters;

  // ---- Differential lock --------------------------------------------
  const diffCaps = getVehicleDiffCapabilities(vehicle.type);
  const dl = vehicle.diffLock;
  const isDiffLocked = !!(dl?.center || dl?.rear || dl?.front);

  let diffLockDesc = 'Дифференциал: свободный';
  if (dl?.front && dl?.rear && dl?.center) diffLockDesc = 'Дифференциал: полная блокировка';
  else if (dl?.center && dl?.rear) diffLockDesc = 'Дифференциал: МОБ + МКБ-З';
  else if (dl?.center) diffLockDesc = 'Дифференциал: МОБ (межосевая)';
  else if (dl?.rear) diffLockDesc = 'Дифференциал: МКБ-З (задняя)';
  else if (dl?.front) diffLockDesc = 'Дифференциал: МКБ-П (передняя)';

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

  // ---- Slope / clock / ambient --------------------------------------
  const currentSlope = getTerrainSlope(vehicle.x, vehicle.y);
  const slopeAlongHeading = -(currentSlope.slopeX * Math.cos(vehicle.angle) + currentSlope.slopeY * Math.sin(vehicle.angle));
  const gradePercent = Math.round(slopeAlongHeading * 100 * 2.5);

  const safeTimeHour = ((timeHour % 24) + 24) % 24;
  const gameTimeStr = `${String(Math.floor(safeTimeHour)).padStart(2, '0')}:${String(Math.floor((safeTimeHour % 1) * 60)).padStart(2, '0')}`;

  const currentTempC = Math.round(getOutsideTemperature({ weather, calendar } as any, safeTimeHour));
  const ambientTempStr = `${currentTempC >= 0 ? '+' : ''}${currentTempC}°`;
  const isIcyRoad = currentTempC <= 0;
  const dateTitle = `${calendar ? formatGameDate(calendar, 'dashboard') : '08.10.26'}, ${calendar ? getRussianSeasonName(calendar.season) : 'Осень'}`;

  // ---- Instant consumption (л/100км в движении, л/ч на холостом, ПХХ при торможении двигателем)
  let consText = '0.0 л/ч';
  if (!isEngineRunning) {
    consText = '0.0 л/ч';
  } else if (speedKmh < 2) {
    const idleFlow = 0.8 + (currentRPM > 950 ? ((currentRPM - 950) / 1000) * 1.6 : 0);
    consText = `${idleFlow.toFixed(1)} л/ч`;
  } else {
    const isDecelCutoff = speedKmh > 18 && (eng?.currentGear && eng.currentGear > 0) && currentRPM > 1300 && (!eng?.clutchPedal || eng.clutchPedal < 0.2);
    if (isDecelCutoff) {
      consText = 'ПХХ';
    } else {
      const loadRatio = Math.max(0.35, currentRPM / 2800);
      const l100 = baseAvgConsumption * loadRatio * (1 + Math.max(0, (speedKmh - 100) / 100) * 0.4);
      consText = `${Math.min(39.9, Math.max(1.8, l100)).toFixed(1)} л/100`;
    }
  }

  const estimatedRangeKm = Math.max(0, Math.round((remainingFuelLiters / baseAvgConsumption) * 100));
  const sysVoltage = isEngineRunning ? (14.0 + (batteryCharge / 100) * 0.4).toFixed(1) : (11.8 + (batteryCharge / 100) * 0.8).toFixed(1);
  const tripOdoKm = (((vehicle.distanceTraveled ?? 0) / 1000) % 1000).toFixed(1);

  // ---- Gear label ---------------------------------------------------
  const isMachinery = carType.startsWith('roller_') || carType.startsWith('paver_');
  let gearLabel = String(gear);
  if (eng?.transmissionType === 'MANUAL') {
    if (eng.currentGear === -1) gearLabel = 'R';
    else if (eng.currentGear === 0) gearLabel = 'N';
    else if (isMachinery) gearLabel = eng.currentGear === 1 ? 'Р' : 'Т';
    else gearLabel = String(eng.currentGear);
  } else {
    const autoMode = eng?.autoGearMode || (typeof gear === 'string' && ['P', 'R', 'N', 'D'].includes(gear) ? gear : 'D');
    if (autoMode === 'D') gearLabel = eng?.currentGear && eng.currentGear > 1 ? `D${eng.currentGear}` : 'D';
    else gearLabel = autoMode;
  }
  const gearColor = gearLabel.startsWith('R') ? C.amberHi : gearLabel === 'P' ? C.red : gearLabel === 'N' ? C.muted : C.text;

  const handleGearClick = () => {
    if (eng?.transmissionType === 'AUTO') {
      const ladder = ['P', 'R', 'N', 'D'] as const;
      const nextIdx = (ladder.indexOf((eng.autoGearMode || 'D') as any) + 1) % ladder.length;
      onSelectGear?.(ladder[nextIdx]);
    } else if (eng) {
      const maxForwardGear = (eng.gearRatios?.length || 7) - 2;
      onSelectGear?.(eng.currentGear >= maxForwardGear ? -1 : eng.currentGear + 1);
    }
  };

  // ---- Dial scales per vehicle class --------------------------------
  let maxSpeed = 240;
  let maxRPM = 8000;
  let redlineRPM = 6200;
  if (isMachinery) {
    maxSpeed = 25; maxRPM = 2800; redlineRPM = 2200;
  } else if (carType.startsWith('tractor_')) {
    maxSpeed = 45; maxRPM = 3000; redlineRPM = 2200;
  } else if (carType.startsWith('truck_') || carType === 'bus' || carType === 'bus_minibus' || carType === 'cement_mixer' || carType === 'garbage_truck' || carType === 'fire_engine' || carType === 'fire_ladder' || carType === 'fire_rescue') {
    maxSpeed = 130; maxRPM = 3600; redlineRPM = 2600;
  } else if (theme === 'sport') {
    maxSpeed = 340; maxRPM = 9000; redlineRPM = 7000;
  } else if (theme === 'truck') {
    maxSpeed = 160; maxRPM = 4500; redlineRPM = 3400;
  } else if (theme === 'retro') {
    maxSpeed = 180; maxRPM = 6500; redlineRPM = 5200;
  } else if (theme === 'emergency') {
    maxSpeed = 260; maxRPM = 7500; redlineRPM = 6200;
  }

  // ---- Warnings ----------------------------------------------------
  const isOverheating = coolantTemp >= 105;
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
  const isCheckEngine = !isEngineRunning || isSeized || isBlinkingCheck || isDtcFault; // bulb-check while engine is off
  const isBattLit = !isEngineRunning || batteryCharge < 20 || eng?.batteryInstalled === false || eng?.batteryPosConnected === false || eng?.batteryNegConnected === false;
  const isTransWarn = !!(eng?.transmissionJammed || (eng?.transmissionHealth ?? 100) < 60);
  const isOilLit = !isEngineRunning || isLowOil;
  const isParkBrakeLit = isHandbraking || (eng?.transmissionType === 'AUTO' && eng?.autoGearMode === 'P');

  const leftOn = playerTurnSignal === 'left' || playerTurnSignal === 'hazard';
  const rightOn = playerTurnSignal === 'right' || playerTurnSignal === 'hazard';

  const engineTone: Tone = isEngineRunning ? 'amber' : isStalled ? 'amber' : 'red';
  const engineTitle = isEngineRunning ? 'Заглушить двигатель [J]' : isStalled ? 'Двигатель заглох. Запустить [J]' : 'Запустить двигатель [J]';

  // Lit warning lamps only: icon, tooltip, colour.
  const lamps: { key: string; icon: React.ReactNode; title: string; color: string; blink?: boolean }[] = [];
  if (isCheckEngine) lamps.push({ key: 'mil', icon: <Wrench className="w-3.5 h-3.5" />, title: isSeized ? 'Двигатель заклинил' : isBlinkingCheck ? 'Детонация / пропуски зажигания' : 'Check Engine', color: isSeized ? C.red : C.amberHi, blink: isBlinkingCheck });
  if (isBattLit) lamps.push({ key: 'bat', icon: <Battery className="w-3.5 h-3.5" />, title: 'Зарядка аккумулятора', color: C.red });
  if (isOilLit) lamps.push({ key: 'oil', icon: <Droplet className="w-3.5 h-3.5" />, title: 'Давление масла', color: C.red, blink: isEngineRunning });
  if (isTransWarn) lamps.push({ key: 'trn', icon: <Cog className="w-3.5 h-3.5" />, title: 'Неисправность трансмиссии', color: C.red });
  if (isOverheating) lamps.push({ key: 'hot', icon: <Thermometer className="w-3.5 h-3.5" />, title: 'Перегрев двигателя', color: C.red, blink: true });
  if (isLowFuel) lamps.push({ key: 'fuel', icon: <Fuel className="w-3.5 h-3.5" />, title: 'Мало топлива', color: C.amberHi, blink: true });
  if (isParkBrakeLit) lamps.push({ key: 'park', icon: <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border text-[8px] font-black leading-none">P</span>, title: 'Стояночный тормоз', color: C.red });

  // Trip computer chip: tap to cycle.
  const modes: TripComputerMode[] = ['range', 'eco', 'trip', 'sys'];
  if (vehicle.fluidTank && vehicle.fluidTank.capacity > 0) modes.push('tank');
  if (vehicle.hasGBO) modes.push('gbo');
  const mode: TripComputerMode = modes.includes(tripMode) ? tripMode : 'range';
  const cycleMode = () => {
    setTripMode(modes[(modes.indexOf(mode) + 1) % modes.length]);
    try { sound.click(); } catch {}
  };
  let chipIcon: React.ReactNode = <Fuel className="w-3.5 h-3.5" />;
  let chipText = '';
  let chipTitle = '';
  let chipWarn = false;
  if (mode === 'range') {
    chipIcon = <Fuel className="w-3.5 h-3.5" />;
    chipText = `${estimatedRangeKm} км`;
    chipTitle = `Запас хода. Топливо: ${remainingFuelLiters.toFixed(1)} из ${tankCapacityLiters} л`;
  } else if (mode === 'eco') {
    chipIcon = <Droplet className="w-3.5 h-3.5" />;
    chipText = consText;
    chipTitle = `Мгновенный расход. Средний: ${baseAvgConsumption.toFixed(1)} л/100км`;
  } else if (mode === 'trip') {
    chipIcon = <Route className="w-3.5 h-3.5" />;
    chipText = `${tripOdoKm} км`;
    chipTitle = 'Пробег за поездку';
  } else if (mode === 'sys') {
    chipIcon = <Zap className="w-3.5 h-3.5" />;
    chipText = `${sysVoltage} В`;
    chipTitle = `Напряжение бортсети. Заряд АКБ: ${batteryCharge}%`;
  } else if (mode === 'tank' && vehicle.fluidTank) {
    const ft = vehicle.fluidTank;
    chipIcon = <Container className="w-3.5 h-3.5" />;
    chipText = `${Math.round(ft.currentVolume ?? ft.currentAmount ?? 0)} л`;
    chipTitle = `Цистерна (${String(ft.liquidType)}), ёмкость ${ft.capacity} л${ft.drainValveOpen ? ', сливной клапан открыт' : ''}${ft.isPunctured ? ', пробоина!' : ''}`;
    chipWarn = !!(ft.isPunctured || ft.drainValveOpen);
  } else if (mode === 'gbo') {
    chipIcon = <Flame className="w-3.5 h-3.5" />;
    chipText = `${Math.round(fuel?.gboLevel ?? 0)}%`;
    chipTitle = `Газ (ГБО): ${(((fuel?.gboLevel ?? 0) / 100) * (fuel?.gboCapacity ?? 42)).toFixed(1)} л`;
  }

  const gboWarm = coolantTemp >= 40;
  const gboOn = fuel?.gboActive !== false;

  const requiresMechKey = (() => {
    const t = vehicle.type || '';
    return (
      t === 'classic_compact' || t === 'retro_bubble' || t === 'sedan_classic' || t === 'wagon_classic' ||
      t === 'micro_car' || t === 'muscle_classic' || t === 'suv_classic_box' || t === 'offroad_hardcore' ||
      t.startsWith('tractor_') || t.startsWith('truck_') || t === 'van_cargo_old' ||
      t === 'cement_mixer' || t === 'garbage_truck' || t === 'delivery_truck'
    );
  })();

  const engineBtn = (
    <IconBtn onClick={onToggleEngine} title={engineTitle} active tone={engineTone} pulse={isStalled && !isEngineRunning}>
      <Power className="w-4 h-4" />
    </IconBtn>
  );

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div
      id="speedometer-cluster"
      className="fixed bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none flex flex-col items-center"
      style={{ maxWidth: 'calc(100vw - 16px)' }}
    >
      <button
        type="button"
        onClick={() => setIsMinimized((p) => !p)}
        className="mb-0.5 h-4 w-12 rounded-[2px] border flex items-center justify-center cursor-pointer transition active:scale-95"
        style={{ background: C.panel, borderColor: C.line }}
        title="Свернуть / развернуть приборную панель"
        aria-label="Свернуть / развернуть приборную панель"
      >
        {isMinimized ? <ChevronUp className="w-3.5 h-3.5" style={{ color: C.amber }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: C.amber }} />}
      </button>

      {isMinimized ? (
        /* ------------------------- MINI BAR ------------------------- */
        <div
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[2px] border backdrop-blur-md shadow-2xl whitespace-nowrap overflow-x-auto max-w-full"
          style={{ background: C.panel, borderColor: C.line, color: C.text }}
        >
          <span className="flex items-baseline gap-1 font-mono shrink-0">
            <span className="text-2xl font-black leading-none tabular-nums" style={{ color: C.amberHi }}>{speedKmh}</span>
            <span className="text-[9px] font-bold" style={{ color: C.muted }}>км/ч</span>
          </span>
          <span className="min-w-[26px] text-center px-1 rounded-[2px] border font-mono font-black text-sm shrink-0" style={{ background: C.well, borderColor: C.line, color: gearColor }}>
            {gearLabel}
          </span>
          <span className="flex items-center gap-1 font-mono text-xs font-bold shrink-0" style={{ color: currentRPM > redlineRPM ? C.red : C.muted }} title="Обороты">
            <Gauge className="w-3.5 h-3.5" />
            {(currentRPM / 1000).toFixed(1)}
          </span>
          <span className={`flex items-center gap-1 font-mono text-xs font-bold shrink-0 ${isLowFuel ? 'animate-pulse' : ''}`} style={{ color: isLowFuel ? C.amberHi : C.muted }} title="Топливо">
            <Fuel className="w-3.5 h-3.5" />
            {fuelLevel}
          </span>
          {lamps.filter((l) => l.key !== 'park').slice(0, 3).map((l) => (
            <span key={l.key} title={l.title} className={`shrink-0 ${l.blink ? 'animate-pulse' : ''}`} style={{ color: l.color }}>{l.icon}</span>
          ))}
          <span className="flex items-center gap-0.5 shrink-0">
            <ArrowLeft className={`w-4 h-4 ${leftOn ? 'animate-pulse' : ''}`} style={{ color: leftOn ? C.amberHi : C.dim }} />
            <ArrowRight className={`w-4 h-4 ${rightOn ? 'animate-pulse' : ''}`} style={{ color: rightOn ? C.amberHi : C.dim }} />
          </span>
          {engineBtn}
        </div>
      ) : (
        /* ------------------------- FULL (COMPACT) ------------------------- */
        <div
          className="flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-[2px] border backdrop-blur-md shadow-2xl"
          style={{ background: C.panel, borderColor: C.line, color: C.text, width: 'fit-content', maxWidth: 'min(372px, calc(100vw - 16px))' }}
        >
          {/* Dials */}
          <div className="flex items-center gap-1.5">
            <Dial value={currentRPM} max={maxRPM} redFrom={redlineRPM}>
              <button
                type="button"
                onClick={handleGearClick}
                title="Передача (клик: переключить)"
                className="pointer-events-auto cursor-pointer text-[24px] font-black font-mono leading-none"
                style={{ color: gearColor }}
              >
                {gearLabel}
              </button>
              <span className="mt-1 text-[10px] font-bold font-mono tabular-nums" style={{ color: currentRPM > redlineRPM ? C.red : C.muted }} title="Обороты, тыс/мин">
                {(currentRPM / 1000).toFixed(1)}
              </span>
            </Dial>

            {/* Centre: environment + vitals */}
            <div className="w-[86px] flex flex-col gap-1.5">
              <div className="flex items-center justify-center gap-1.5 font-mono text-[11px] font-bold" style={{ color: C.text }} title={dateTitle}>
                <span>{gameTimeStr}</span>
                <span style={{ color: C.muted }}>{ambientTempStr}</span>
                {isIcyRoad && <Snowflake className="w-3 h-3 animate-pulse" style={{ color: C.blue }} />}
              </div>
              <MiniBar icon={<Fuel className="w-3 h-3" />} ratio={fuelLevel / 100} color={isLowFuel ? C.amberHi : C.green} warn={isLowFuel} title={`Топливо ${fuelLevel}%${isLpgRunning ? ' (газ)' : ''}`} />
              <MiniBar icon={<Thermometer className="w-3 h-3" />} ratio={(coolantTemp - 40) / 90} color={isOverheating ? C.red : coolantTemp < 55 ? C.blue : C.green} warn={isOverheating} title={`Температура двигателя ${coolantTemp}°`} />
              <MiniBar icon={<Droplet className="w-3 h-3" />} ratio={oilPressure / 100} color={isLowOil ? C.red : C.green} warn={isLowOil && isEngineRunning} title={`Давление масла ${oilPressure}`} />
              {Math.abs(gradePercent) >= 2 && (
                <span className="text-center font-mono text-[10px] font-bold" style={{ color: C.amberHi }} title="Уклон дороги">
                  {gradePercent > 0 ? '▲' : '▼'}{Math.abs(gradePercent)}%
                </span>
              )}
            </div>

            <Dial value={speedKmh} max={maxSpeed}>
              <span className="text-[26px] font-black font-mono leading-none tabular-nums" style={{ color: C.text }}>{speedKmh}</span>
              <span className="mt-1 text-[9px] font-bold font-mono" style={{ color: C.muted }}>км/ч</span>
            </Dial>
          </div>

          {/* Lit warning lamps (icons only; hidden when there is nothing to report) */}
          {lamps.length > 0 && (
            <div className="flex items-center justify-center gap-2 h-4">
              {lamps.map((l) => (
                <span key={l.key} title={l.title} className={l.blink ? 'animate-pulse' : ''} style={{ color: l.color }}>{l.icon}</span>
              ))}
            </div>
          )}

          {/* Controls: icons only, meaning is in the tooltip */}
          <div className="flex items-center justify-center gap-1 flex-wrap pt-1.5 border-t w-full" style={{ borderColor: C.line }}>
            <IconBtn active={leftOn} pulse onClick={() => onToggleTurnSignal?.('left')} title="Левый поворотник [Q]"><ArrowLeft className="w-4 h-4" /></IconBtn>
            <IconBtn active={playerTurnSignal === 'hazard'} tone="red" pulse onClick={() => onToggleTurnSignal?.('hazard')} title="Аварийка [Z]"><AlertTriangle className="w-4 h-4" /></IconBtn>
            <IconBtn active={rightOn} pulse onClick={() => onToggleTurnSignal?.('right')} title="Правый поворотник [E]"><ArrowRight className="w-4 h-4" /></IconBtn>
            <IconBtn
              active={playerHeadlightMode !== 'off'}
              tone={playerHeadlightMode === 'high' ? 'green' : 'amber'}
              onClick={onToggleHeadlights}
              title={`Фары: ${playerHeadlightMode === 'high' ? 'дальний' : playerHeadlightMode === 'low' ? 'ближний' : 'выкл'} [L]`}
            >
              <Lightbulb className="w-4 h-4" />
            </IconBtn>

            <IconBtn onClick={cycleMode} active={chipWarn} tone="red" title={`${chipTitle} (клик: следующий режим)`} className="min-w-[64px]">
              {chipIcon}
              <span className="tabular-nums">{chipText}</span>
            </IconBtn>

            {vehicle.hasGBO && (
              <IconBtn
                active={gboOn && gboWarm}
                tone={(fuel?.gboLevel ?? 0) > 0 ? 'green' : 'red'}
                onClick={() => {
                  if (fuel) {
                    fuel.gboActive = !fuel.gboActive;
                    try { sound.playButtonPress(); } catch {}
                  }
                }}
                title={!gboOn ? 'ГБО выключено (бензин). Включить' : !gboWarm ? 'ГБО: прогрев до 40°' : (fuel?.gboLevel ?? 0) > 0 ? 'ГБО работает на газе. Выключить' : 'ГБО: нет газа'}
              >
                <Flame className="w-4 h-4" />
              </IconBtn>
            )}

            {(vehicle.type === 'truck_water' || vehicle.type === 'fire_engine') && (
              <IconBtn
                active={!!vehicle.isPtoActive}
                tone={vehicle.isPtoActive && isEngineRunning ? 'green' : 'amber'}
                pulse={!!(vehicle.isPtoActive && isEngineRunning)}
                onClick={() => {
                  vehicle.isPtoActive = !vehicle.isPtoActive;
                  sound.playButtonPress();
                }}
                title={
                  vehicle.isPtoActive && isEngineRunning
                    ? `КОМ / насос [P]: ${(3.8 + Math.min(1.0, Math.max(0, ((vehicle.engineState?.engineRPM || 800) - 750) / 1850)) * 3.8).toFixed(1)} бар`
                    : vehicle.isPtoActive ? 'КОМ / насос [P]: нет ДВС' : 'КОМ / насос [P]: самотёк'
                }
              >
                <Gauge className="w-4 h-4" />
              </IconBtn>
            )}

            {vehicle.type === 'truck_water' && (
              <IconBtn
                active={!!vehicle.isWashingNozzlesActive}
                tone={vehicle.isPtoActive && isEngineRunning ? 'green' : 'amber'}
                pulse={!!(vehicle.isWashingNozzlesActive && vehicle.isPtoActive && isEngineRunning)}
                onClick={() => {
                  vehicle.isWashingNozzlesActive = !vehicle.isWashingNozzlesActive;
                  sound.playButtonPress();
                }}
                title={`Сопла [G]: ${vehicle.isWashingNozzlesActive ? (vehicle.isPtoActive && isEngineRunning ? 'вкл' : 'самотёк') : 'выкл'}`}
              >
                <Droplet className="w-4 h-4" />
              </IconBtn>
            )}

            {carType.startsWith('tractor_') && (
              <>
                <IconBtn
                  active
                  tone={vehicle.tractorBrakeLatch !== false ? 'green' : 'amber'}
                  onClick={() => {
                    vehicle.tractorBrakeLatch = vehicle.tractorBrakeLatch === false;
                    sound.playButtonPress();
                  }}
                  title={`Тормоза МТЗ [B]: ${vehicle.tractorBrakeLatch !== false ? 'сблокированы' : 'раздельно'}`}
                >
                  {vehicle.tractorBrakeLatch !== false ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </IconBtn>
                <span className="inline-flex items-center gap-0.5 h-7 px-1 rounded-[2px] border font-mono text-[10px] font-bold" style={{ background: C.well, borderColor: C.line }} title="Педали тормоза: левая [,] и правая [.]">
                  <span className="px-1 rounded-[1px]" style={{ background: (vehicle as any)?._brakeLeftVal > 0.1 ? C.red : '#1c1f26', color: (vehicle as any)?._brakeLeftVal > 0.1 ? '#fff' : C.dim }}>Л</span>
                  <span className="px-1 rounded-[1px]" style={{ background: (vehicle as any)?._brakeRightVal > 0.1 ? C.red : '#1c1f26', color: (vehicle as any)?._brakeRightVal > 0.1 ? '#fff' : C.dim }}>П</span>
                </span>
              </>
            )}

            {diffCaps.supported && (
              <>
                <IconBtn active={isDiffLocked} pulse onClick={handleCycleDiffLock} title={`${diffLockDesc} [V]`}>
                  <ShieldAlert className="w-4 h-4" />
                </IconBtn>
                {diffCaps.hasCenter && (
                  <IconBtn active={!!dl?.center} onClick={() => handleToggleAxle('center')} title="Межосевая блокировка (МОБ)">М</IconBtn>
                )}
                {diffCaps.hasRear && (
                  <IconBtn active={!!dl?.rear} onClick={() => handleToggleAxle('rear')} title="Блокировка задней оси (МКБ-З)">З</IconBtn>
                )}
                {diffCaps.hasFront && (
                  <IconBtn active={!!dl?.front} onClick={() => handleToggleAxle('front')} title="Блокировка передней оси (МКБ-П)">П</IconBtn>
                )}
              </>
            )}

            {requiresMechKey && (() => {
              const inserted = !!vehicle.insertedKeyType;
              if (inserted) {
                return (
                  <IconBtn active onClick={onTakeOutKey} title={`Ключ (${vehicle.insertedKeyType === 'gold' ? 'золотой' : 'железный'}) в замке. Вынуть`}>
                    <Key className="w-4 h-4" />
                  </IconBtn>
                );
              }
              const needed = getVehicleRequiredKeyType(vehicle);
              if (needed && hasKeysInInventory.includes(needed)) {
                return (
                  <IconBtn active tone="green" pulse onClick={() => onInsertKey?.(needed)} title="Замок пуст. Вставить ключ">
                    <Key className="w-4 h-4" />
                  </IconBtn>
                );
              }
              return (
                <IconBtn active tone="red" title={needed ? `Замок пуст. Нужен ${needed === 'gold' ? 'золотой' : 'железный'} ключ` : 'Замок пуст'}>
                  <Key className="w-4 h-4" />
                </IconBtn>
              );
            })()}

            {(() => {
              const taxi = TaxiFleetSystem.getInstance();
              const order = taxi.activeOrder;
              if (!order && !taxi.profile.isShiftActive) return null;
              if (order) {
                const fare = Math.round(order.baseFare + (order.distanceDrivenMeters / 1000) * order.ratePerKm + order.paidWaitingFare);
                const stage =
                  order.stage === 'driving_to_pickup' ? 'подача' :
                  order.stage === 'waiting_for_passenger' ? `ожидание ${Math.floor(order.waitingSeconds)} с` :
                  order.stage === 'passenger_boarding' ? 'посадка' :
                  order.stage === 'in_transit' ? `в пути ${(order.distanceDrivenMeters / 1000).toFixed(1)} км` : 'высадка';
                return (
                  <IconBtn active title={`Таксометр: ${stage}`}>
                    <Car className="w-4 h-4" />
                    <span className="tabular-nums">{fare}₽</span>
                  </IconBtn>
                );
              }
              return (
                <IconBtn active tone="green" title="Такси: на линии">
                  <Car className="w-4 h-4" />
                </IconBtn>
              );
            })()}

            {engineBtn}

            {onOpenRadialMenu && (
              <IconBtn onClick={onOpenRadialMenu} title="Меню автомобиля">
                <Gauge className="w-4 h-4" />
              </IconBtn>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

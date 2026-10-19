import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player, GameWorld, Vehicle, WeatherType } from '../types';
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
  Gauge,
  Link2,
  Droplet,
  Zap,
  Truck,
  Siren,
  Compass,
  ToggleLeft,
  ToggleRight,
  Snowflake,
  RefreshCw,
  Wrench,
  MapPin,
  CloudSun,
  CloudDrizzle,
  CloudLightning,
  Cloud,
  TrafficCone,
  SlidersHorizontal,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Clock,
  Palette,
  Users,
  Car
} from 'lucide-react';
import { sound } from '../audio';
import { toggleTrailerHitch } from '../physics';
import { getLiquidNameRu, hasRoadTrainLights, getVehicleDiffCapabilities, cycleVehicleDiffLock } from '../vehicleHelpers';
import { getVehicleControlTheme, VehicleControlTheme, CONTROL_THEME_META } from './vehicleControlStyles';
import { respawnStalledVehicles } from '../aiTraffic';
import { formatGameTime } from '../calendarSystem';
import { performanceConfig, savePerformanceConfig } from '../performanceConfig';
import { VEHICLE_CATALOG } from '../vehicleCatalog';
import {
  ENGINE_VARIANTS,
  TRANSMISSION_VARIANTS,
  TUNE_VARIANTS,
  TIRE_SETS,
  TURBO_KITS,
  getVehiclePowertrainCategory
} from '../powertrainVariants';
import { VehiclePreviewCanvas } from './VehiclePreviewCanvas';

interface VehicleConfigSelection {
  color?: { name: string; hex: string; roofHex?: string };
  powertrain?: {
    engineId?: string;
    transmissionId?: string;
    tuneId?: string;
    tireSetId?: string;
    turboKitId?: string;
  };
}

interface RadialMenuProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  world: GameWorld | null;
  timeHour: number;
  weather: WeatherType;
  isTimeAutoCycling: boolean;
  isTrafficEnabled: boolean;
  onSetTime: (hour: number) => void;
  onSetWeather: (w: WeatherType) => void;
  onToggleTimeAuto: () => void;
  onSetTrafficEnabled: (on: boolean) => void;
  onApplyVehicleConfig: (cfg: VehicleConfigSelection) => void;
  onRepairAllVehicles: () => void;
  onOpenSpawnMenu: () => void;
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

type PanelId = 'board' | 'config' | 'world' | 'traffic' | null;

/* Radial wheel geometry: 6 sectors clockwise, starting from the top */
const N = 6;
const HALF = 360 / N;
/* Linear gap between neighbouring sectors (viewBox units). The gap has the same width at the
   inner and outer contour, so the wheel reads as one solid "donut" cut by parallel slits. */
const GAP_PX = 8;
const RI = 112;
const RO = 262;
const RL = 184;
const C = 320;
const WHEEL_BOX = 600; // design size of the wheel box in px; scaled down on small screens

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(C + r * Math.sin(a)).toFixed(1)} ${(C - r * Math.cos(a)).toFixed(1)}`;
};
/* Angle that shifts a sector edge sideways by GAP_PX / 2 at radius r: the edge stays parallel
   to the radial boundary line, so the slit width is constant along the whole edge. */
const edgeShift = (r: number) => (Math.asin(Math.min(1, GAP_PX / 2 / r)) * 180) / Math.PI;
const sectorPath = (i: number) => {
  const mid = i * HALF;
  const so = edgeShift(RO);
  const si = edgeShift(RI);
  const a0o = mid - HALF / 2 + so;
  const a1o = mid + HALF / 2 - so;
  const a0i = mid - HALF / 2 + si;
  const a1i = mid + HALF / 2 - si;
  return `M${pt(RO, a0o)}A${RO} ${RO} 0 0 1 ${pt(RO, a1o)}L${pt(RI, a1i)}A${RI} ${RI} 0 0 0 ${pt(RI, a0i)}Z`;
};
const labelPos = (i: number) => {
  const a = (i * HALF * Math.PI) / 180;
  return { x: C + RL * Math.sin(a), y: C - RL * Math.cos(a), px: Math.sin(a) * 10, py: -Math.cos(a) * 10 };
};

/* Responsive layout: the wheel is scaled to the viewport, an open panel takes the free side
   (landscape) or the bottom part of the screen (portrait phones). */
const PAD = 8;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface WheelLayout {
  size: number;
  cx: number;
  cy: number;
  panelStyle: React.CSSProperties;
  wide: boolean;
  showHints: boolean;
}

const computeLayout = (vw: number, vh: number, hasPanel: boolean): WheelLayout => {
  const portrait = vw < 640 && vh > vw;
  if (!hasPanel) {
    const hintRoom = !portrait && vh >= 560 ? 36 : 0;
    const size = clamp(Math.min(WHEEL_BOX, vw - 2 * PAD, vh - 2 * PAD - hintRoom), 160, WHEEL_BOX);
    return { size, cx: vw / 2, cy: (vh - hintRoom) / 2, panelStyle: {}, wide: false, showHints: hintRoom > 0 };
  }
  if (portrait) {
    const panelH = Math.round(vh * 0.56);
    const size = clamp(Math.min(WHEEL_BOX, vw - 2 * PAD, vh - panelH - 3 * PAD), 120, WHEEL_BOX);
    return {
      size,
      cx: vw / 2,
      cy: PAD + size / 2,
      panelStyle: { left: PAD, right: PAD, bottom: PAD, maxHeight: panelH },
      wide: false,
      showHints: false
    };
  }
  const panelW = Math.round(Math.min(560, Math.max(300, vw * 0.46)));
  const regionW = vw - panelW - 3 * PAD;
  const size = clamp(Math.min(WHEEL_BOX, vh - 2 * PAD, regionW), 120, WHEEL_BOX);
  return {
    size,
    cx: PAD + regionW / 2,
    cy: vh / 2,
    panelStyle: { top: '50%', right: PAD, width: panelW, maxHeight: vh - 2 * PAD, transform: 'translateY(-50%)' },
    wide: panelW >= 480,
    showHints: vh >= 560
  };
};

const PanelLayoutContext = React.createContext<{ style: React.CSSProperties; wide: boolean }>({ style: {}, wide: true });
const PANEL_BASE = 'fixed z-[110] rounded-[2px] border border-[#2a2e38] bg-[#14161a]/95 backdrop-blur-md shadow-2xl flex flex-col font-mono overflow-hidden';

const WEATHER: { id: WeatherType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'clear', label: 'Ясно', Icon: Sun },
  { id: 'overcast', label: 'Пасмурно', Icon: CloudSun },
  { id: 'drizzle', label: 'Морось', Icon: CloudDrizzle },
  { id: 'rain', label: 'Дождь', Icon: CloudRain },
  { id: 'storm', label: 'Гроза', Icon: CloudLightning },
  { id: 'fog', label: 'Туман', Icon: Cloud },
  { id: 'snow', label: 'Снег', Icon: Snowflake },
  { id: 'blizzard', label: 'Метель', Icon: Wind }
];

const TIME_PRESETS: { label: string; hour: number; Icon: React.ComponentType<{ className?: string }> }[] = [
  { label: 'Рассвет', hour: 6, Icon: Sunrise },
  { label: 'День', hour: 12, Icon: Sun },
  { label: 'Закат', hour: 19, Icon: Sunset },
  { label: 'Ночь', hour: 0, Icon: Moon }
];

const FUEL_LABEL: Record<string, string> = { ai92: 'АИ-92', ai95: 'АИ-95', ai98: 'АИ-98', ai100: 'АИ-100', diesel: 'ДТ' };

/* Small shared UI atoms for side panels */
const Sec: React.FC<{ Icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }> = ({ Icon, children }) => (
  <div className="flex items-center gap-2 text-[9px] font-mono font-black uppercase text-[#9ba3af] tracking-wider mb-1.5">
    {Icon && <Icon className="w-3 h-3 text-[#c68a35]" />}
    <span>{children}</span>
  </div>
);

const Panel: React.FC<{
  title: string;
  sub: string;
  HeaderIcon: React.ComponentType<{ className?: string }>;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, sub, HeaderIcon, onClose, children }) => {
  const { style } = React.useContext(PanelLayoutContext);
  return (
    <section data-radial-panel className={PANEL_BASE} style={style} onClick={(e) => e.stopPropagation()}>
      <div className="flex shrink-0 items-center justify-between gap-2 p-3 border-b border-[#2a2e38] bg-[#0b0c0e]/95">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 flex-none rounded-[2px] border border-[#c68a35]/50 bg-[#c68a35]/10 flex items-center justify-center text-[#c68a35]"><HeaderIcon className="w-4 h-4" /></div>
          <div className="min-w-0">
            <div className="text-sm font-black uppercase tracking-wider text-[#f0f3f6] truncate">{title}</div>
            <div className="text-[10px] text-[#9ba3af] truncate">{sub}</div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex-none p-2 rounded-[2px] bg-[#0b0c0e] hover:bg-[#1c1f26] border border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6] hover:border-[#c68a35]/50 transition-all cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <div className="min-h-0 overflow-y-auto p-3 grid grid-cols-1 gap-3" style={{ scrollbarWidth: 'thin' }}>{children}</div>
    </section>
  );
};

/* Toggle row used across panels */
const ToggleRow: React.FC<{
  title: string;
  sub?: string;
  Icon: React.ComponentType<{ className?: string }>;
  on: boolean;
  onLabel?: string;
  offLabel?: string;
  onChange: () => void;
}> = ({ title, sub, Icon, on, onLabel = 'ВКЛ', offLabel = 'ВЫКЛ', onChange }) => (
  <button type="button" onClick={onChange} className={`w-full py-3 px-3 flex items-center justify-between rounded-[2px] border cursor-pointer text-[10px] font-mono font-black uppercase transition-all active:scale-[0.98] ${on ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e]' : 'bg-[#1c1f26] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}>
    <span className="flex items-center gap-2">
      <Icon className="w-4 h-4" />
      <span className="flex flex-col items-start">
        <span>{title}</span>
        {sub && <span className="text-[8px] normal-case font-bold opacity-70">{sub}</span>}
      </span>
    </span>
    <span className="font-bold">{on ? onLabel : offLabel}</span>
  </button>
);

/* Inline slider for traffic limits */
const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, suffix = '', onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const apply = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onChange(Math.round((min + t * (max - min)) / step) * step);
  };
  return (
    <div className="p-3 rounded-[2px] border border-[#2a2e38] bg-[#14161a]">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[9px] font-mono font-black uppercase text-[#9ba3af] tracking-wider">{label}</span>
        <span className="text-[13px] font-black text-[#e0ab45]">{value}{suffix}</span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className="relative mt-3 h-[6px] rounded-[3px] bg-[#1c1f26] border border-[#2a2e38] cursor-pointer"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); apply(e.clientX); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) apply(e.clientX); }}
      >
        <div className="absolute left-0 top-0 bottom-0 rounded-[3px] bg-[#c68a35]" style={{ width: pct + '%' }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-[16px] h-[16px] rounded-full bg-[#f0c264] border-[3px] border-[#14161a]" style={{ left: `calc(${pct}% - 8px)` }} />
      </div>
    </div>
  );
};

/* Configurator tree node (side tree like the freeroam vehicle select) */
const Node: React.FC<{ id: string; n: string; v: React.ReactNode; openIds: Record<string, boolean>; toggle: (id: string) => void; children: React.ReactNode }> = ({ id, n, v, openIds, toggle, children }) => {
  const on = !!openIds[id];
  return (
    <div>
      <button type="button" onClick={() => toggle(id)} className="w-full flex items-center gap-2 py-2 px-1 rounded-[2px] hover:bg-white/5 transition-colors" aria-expanded={on}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a29e93" strokeWidth="2.6" className={`transition-transform ${on ? 'rotate-90' : ''}`}><path d="M9 5l7 7-7 7" /></svg>
        <span className="text-[12px] font-black uppercase tracking-wide text-[#e9e6df]">{n}</span>
        <span className="ml-auto text-[10px] font-bold text-[#9ba3af] truncate max-w-[220px] text-right">{v}</span>
      </button>
      {on && <div className="ml-4 pl-3 border-l border-white/10 mb-1.5">{children}</div>}
    </div>
  );
};

const Opt: React.FC<{ on: boolean; onClick: () => void; title: string; sub?: string; swatch?: string }> = ({ on, onClick, title, sub, swatch }) => (
  <button type="button" onClick={onClick} className={`w-full flex items-center gap-2 py-1.5 px-2 mb-1 rounded-[2px] border cursor-pointer text-left transition-colors ${on ? 'border-[#c68a35] bg-[#c68a35]/10' : 'border-white/10 hover:bg-white/5'}`}>
    {swatch && <span className="w-3.5 h-3.5 rounded-[2px] border border-black/60 flex-none" style={{ background: swatch }} />}
    <span className={`text-[11px] font-bold ${on ? 'text-white' : 'text-[#cfcbc1]'} truncate`}>{title}</span>
    {sub && <span className="ml-auto text-[9px] text-[#9ba3af] flex-none whitespace-nowrap">{sub}</span>}
  </button>
);

export const RadialMenu: React.FC<RadialMenuProps> = ({
  isOpen,
  onClose,
  player,
  world,
  timeHour,
  weather,
  isTimeAutoCycling,
  isTrafficEnabled,
  onSetTime,
  onSetWeather,
  onToggleTimeAuto,
  onSetTrafficEnabled,
  onApplyVehicleConfig,
  onRepairAllVehicles,
  onOpenSpawnMenu,
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
  const [hover, setHover] = useState<number>(-1);
  const [panel, setPanel] = useState<PanelId>(null);
  const [trafficTick, setTrafficTick] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720
  }));

  /* keep the wheel inside the screen on resize / rotation (mobile) */
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  /* Clockwise from the top: 1 Приборка · 2 Авто · 3 Окружение · 4 Спавн · 5 Починить · 6 Трафик */
  const SLOT = useMemo(() => ([
    { id: 'board', n: 'Приборка', desc: 'Борт панели авто', Icon: Gauge, panel: 'board' as const },
    { id: 'config', n: 'Авто', desc: 'Конфигуратор борта', Icon: SlidersHorizontal, panel: 'config' as const },
    { id: 'world', n: 'Окружение', desc: 'Погода и время', Icon: CloudSun, panel: 'world' as const },
    { id: 'spawn', n: 'Спавн', desc: 'Точка перезда', Icon: MapPin, panel: null },
    { id: 'repair', n: 'Починить', desc: 'Вся техника в мире', Icon: Wrench, panel: null },
    { id: 'traffic', n: 'Трафик', desc: 'Движение города', Icon: TrafficCone, panel: 'traffic' as const }
  ]), []);
  const SLOT_PANEL = SLOT.map((s) => s.panel);

  const showPanel = (id: PanelId) => setPanel((prev) => (prev === id ? null : id));

  const activate = (i: number) => {
    if (i < 0 || !isOpen) return;
    sound.playButtonPress();
    if (navigator.vibrate) navigator.vibrate(15);
    if (SLOT[i].id === 'repair') { onRepairAllVehicles(); onClose(); return; }
    if (SLOT[i].id === 'spawn') { setPanel(null); onClose(); onOpenSpawnMenu(); return; }
    showPanel(SLOT[i].panel as PanelId);
    setHover(i);
  };

  /* full reset when closed */
  useEffect(() => {
    if (!isOpen) { setHover(-1); setPanel(null); }
  }, [isOpen]);

  /* Escape closes the open panel first, then the wheel; digits 1..6 activate sectors */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (panel) setPanel(null); else onClose();
        return;
      }
      const d = ['1', '2', '3', '4', '5', '6'].indexOf(e.key);
      if (d >= 0) { e.preventDefault(); activate(d); return; }
      if (e.key === 'Enter' && hover >= 0) { e.preventDefault(); activate(hover); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, panel, hover]);

  /* live traffic telemetry poll while the traffic panel is open */
  useEffect(() => {
    if (!isOpen || panel !== 'traffic') return;
    const iv = setInterval(() => setTrafficTick((t) => t + 1), 500);
    return () => clearInterval(iv);
  }, [isOpen, panel]);

  if (!isOpen || !player || !world) return null;

  const veh: Vehicle | undefined = world.vehicles.find((v) => v.id === player.currentVehicleId);

  const slotFromPointer = (clientX: number, clientY: number): number => {
    const el = wheelRef.current;
    if (!el) return -1;
    const r = el.getBoundingClientRect();
    const k = r.width / 640;
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    const d = k > 0 ? Math.hypot(dx, dy) / k : 0;
    if (d < RI - 20 || d > RO + 26) return -1;
    const ang = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    return (Math.floor(((ang + HALF / 2) % 360) / HALF)) % N;
  };

  /* Distance from the wheel centre in wheel units (640 viewBox) for the pointer position */
  const pointerRadius = (clientX: number, clientY: number): number => {
    const el = wheelRef.current;
    if (!el) return Infinity;
    const r = el.getBoundingClientRect();
    const k = r.width / 640;
    if (!(k > 0)) return Infinity;
    return Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2)) / k;
  };

  /* One "step back": an open sub-panel closes first, then the whole wheel */
  const stepBack = () => {
    sound.playButtonPress();
    if (panel) { setPanel(null); setHover(-1); } else onClose();
  };

  const onWheelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const i = slotFromPointer(e.clientX, e.clientY);
    if (i >= 0) { activate(i); return; }
    const d = pointerRadius(e.clientX, e.clientY);
    if (d < RI - 20 || d > RO + 26) stepBack(); // hub (centre) or empty area around the ring
  };

  const layout = computeLayout(vp.w, vp.h, !!panel);
  const wheelScale = layout.size / WHEEL_BOX;
  /* keep labels readable when the whole wheel is scaled down */
  const labelScale = wheelScale < 1 ? Math.min(1.5, Math.sqrt(1 / wheelScale)) : 1;

  const hovered = hover >= 0 ? SLOT[hover] : null;
  const hour = ((timeHour % 24) + 24) % 24;

  /* real traffic telemetry */
  const tVehicles = world.vehicles.filter((v) => !v.isPlayerControlled);
  const tPeds = world.pedestrians ? world.pedestrians.length : 0;
  void trafficTick; // timer keeps the readouts fresh

  const theme: VehicleControlTheme = getVehicleControlTheme(veh?.type || 'standard');
  const themeMeta = CONTROL_THEME_META[theme] || CONTROL_THEME_META.standard;
  const ptm = 'text-[9px] font-mono font-bold uppercase text-[#9ba3af] tracking-wider';

  /* vehicle board state readouts */
  const headlightsMode = veh?.headlightMode || 'off';
  const turnSignal = veh?.turnSignal || 'none';
  const wipersActive = !!veh?.wipersOn;
  const heaterMode = veh?.heaterMode || 'off';
  const heaterTemp = Math.round(veh?.heaterTemp ?? 18);
  const engTemp = Math.round(typeof veh?.engineTemp === 'number' ? veh.engineTemp : (veh?.engineState?.temperature ?? 20));
  const isEngineRunning = veh?.engineState?.engineRunning ?? false;
  const isStalled = !!veh?.engineState?.isStalled || !!veh?.engineState?.engineStalled;
  const isWindowOpen = !!veh?.windowOpen;
  const acActive = !!veh?.acOn;
  const recircActive = !!veh?.recircOn;
  const speedKmh = veh ? Math.round(Math.abs(veh.speed) * 3.6) : 0;
  const rpm = isEngineRunning ? Math.round(veh?.engineState?.engineRPM || 800) : 0;
  const batteryCharge = Math.round(veh?.engineState?.batteryCharge ?? 100);
  const voltage = isEngineRunning ? (14.1 + (batteryCharge / 100) * 0.3).toFixed(1) : (11.9 + (batteryCharge / 100) * 0.7).toFixed(1);
  const diffCaps = getVehicleDiffCapabilities(veh?.type || 'sedan');
  const dl = veh?.diffLock;
  const isDiffLocked = !!(dl?.center || dl?.rear || dl?.front);
  let diffLockDesc = 'СВОБОДНЫЙ';
  if (dl?.front && dl?.rear && dl?.center) diffLockDesc = 'ПОЛНАЯ (100%)';
  else if (dl?.center && dl?.rear) diffLockDesc = 'МОБ + МКБ-З';
  else if (dl?.center) diffLockDesc = 'МОБ (МЕЖОСЕВАЯ)';
  else if (dl?.rear) diffLockDesc = 'МКБ-З (ЗАДНЯЯ)';
  else if (dl?.front) diffLockDesc = 'МКБ-П (ПЕРЕДНЯЯ)';

  return (
    <div
      id="radial-menu-backdrop"
      className="fixed inset-0 z-[100] bg-[#0b0c0e]/85 backdrop-blur-sm select-none overflow-hidden font-mono"
      onClick={(e) => {
        /* only a tap on the empty backdrop steps back; taps inside panels never reach here */
        if (e.target !== e.currentTarget) return;
        stepBack();
      }}
      onMouseMove={(e) => {
        if ((e.target as HTMLElement).closest('[data-radial-panel]')) return;
        const i = slotFromPointer(e.clientX, e.clientY);
        if (i !== hover) setHover(i);
      }}
    >
      <PanelLayoutContext.Provider value={{ style: layout.panelStyle, wide: layout.wide }}>
      {/* ================= RADIANT WHEEL ================= */}
      <div
        ref={wheelRef}
        className="absolute top-0 left-0 transition-transform duration-300 ease-out"
        style={{
          width: WHEEL_BOX,
          height: WHEEL_BOX,
          transform: `translate(${(layout.cx - WHEEL_BOX / 2).toFixed(1)}px, ${(layout.cy - WHEEL_BOX / 2).toFixed(1)}px) scale(${wheelScale.toFixed(4)})`
        }}
        onClick={onWheelClick}
      >
        <svg width="600" height="600" viewBox="0 0 640 640" className="absolute inset-0 pointer-events-none">
          <circle cx="320" cy="320" r="296" fill="none" stroke="rgba(198,138,53,.18)" strokeDasharray="2 9" />
          {SLOT.map((s, i) => (
            <path
              key={i}
              d={sectorPath(i)}
              className="transition-all duration-150"
              fill={hover === i ? 'rgba(198,138,53,.26)' : panel && SLOT_PANEL[i] === panel ? 'rgba(198,138,53,.14)' : 'rgba(11,12,14,.9)'}
              stroke={hover === i || (panel && SLOT_PANEL[i] === panel) ? '#c68a35' : 'rgba(255,255,255,.09)'}
              strokeWidth="1.5"
            />
          ))}
        </svg>

        {/* labels */}
        {SLOT.map((s, i) => {
          const p = labelPos(i);
          const on = hover === i;
          const act = !!panel && s.panel === panel;
          return (
            <div
              key={i}
              className="absolute w-0 flex-col items-center gap-1 pointer-events-none flex transition-transform duration-200"
              style={{ left: p.x / 640 * 600, top: p.y / 640 * 600, transform: `translate(calc(-50% + ${on || act ? p.px : 0}px), calc(-50% + ${on || act ? p.py : 0}px)) scale(${labelScale.toFixed(3)})` }}
            >
              <s.Icon className={`w-9 h-9 transition-colors ${on || act ? 'text-[#e0ab45]' : 'text-[#8b929e]'}`} strokeWidth={1.7} />
              <span className={`text-[13px] font-black uppercase tracking-[0.08em] whitespace-nowrap ${on || act ? 'text-white' : 'text-[#a29e93]'}`}>{s.n}</span>
              <span className={`min-w-[22px] h-[20px] px-2 inline-flex items-center justify-center rounded-[2px] border text-[10px] font-bold ${on || act ? 'border-[#c68a35] text-[#e0ab45]' : 'border-white/25 text-[#a29e93] opacity-70'}`}>{i + 1}</span>
            </div>
          );
        })}

        {/* hub */}
        <div className="absolute pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          <div className="w-[200px] h-[200px] rounded-full border border-[#c68a35]/40 bg-[#0b0c0e] flex items-center justify-center text-center">
            <div className="flex flex-col items-center justify-center px-6" style={{ transform: `scale(${labelScale.toFixed(3)})` }}>
              {hovered ? <hovered.Icon className="w-10 h-10 text-[#e0ab45]" strokeWidth={1.6} /> : <Compass className="w-10 h-10 text-[#c68a35]" strokeWidth={1.6} />}
              <div className={`mt-2 text-[15px] font-black uppercase tracking-wider ${hovered ? 'text-[#e9e6df]' : 'text-[#c68a35]'}`}>{hovered ? hovered.n : 'Быстрое меню'}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-[#a29e93] leading-tight">{hovered ? hovered.desc : 'Выберите сектор'}</div>
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] border border-white/20 text-[9px] font-bold uppercase tracking-wider text-[#a29e93]">
                <X className="w-3 h-3" />
                <span>{panel ? 'Закрыть панель' : 'Закрыть'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= PANEL: ПРИБОРКА (bортовые панели, только реально существующие) ================= */}
      {panel === 'board' && veh && (
        <section data-radial-panel className={PANEL_BASE} style={layout.panelStyle} onClick={(e) => e.stopPropagation()}>
          <div className="flex shrink-0 items-center justify-between gap-3 p-3 rounded-[2px] border-b border-[#2a2e38] bg-[#0b0c0e]/95">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-3 h-3 flex items-center justify-center border border-[#c68a35] bg-[#c68a35] flex-none"><div className="w-1.5 h-1.5 bg-[#0b0c0e]" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-mono font-black uppercase tracking-wider">
                  <span className="text-[#c68a35]">{themeMeta.badgeText}</span>
                  <span className="text-[#3a3f4d]">|</span>
                  <span className="text-[#cbd5e1] truncate">{veh.nameRu || veh.type}</span>
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
            <div className="flex items-center gap-3 flex-none">
              <div className="flex items-baseline gap-1 bg-[#14161a] px-3 py-1 rounded-[2px] border border-[#2a2e38]">
                <span className="text-lg font-black text-[#c68a35]">{speedKmh}</span>
                <span className="text-[9px] text-[#9ba3af] uppercase font-bold">км/ч</span>
                <span className="text-[#3a3f4d] mx-1">|</span>
                <span className="text-xs text-[#cbd5e1] font-bold">{rpm}</span>
                <span className="text-[9px] text-[#5a6272] uppercase">об/мин</span>
              </div>
              <button type="button" onClick={() => setPanel(null)} className="p-2 rounded-[2px] bg-[#0b0c0e] hover:bg-[#1c1f26] border border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6] hover:border-[#c68a35]/50 transition-all cursor-pointer" title="Закрыть панель">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-3 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
            <div className={`grid gap-3 ${layout.wide ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {/* 1. ENGINE */}
              <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={ptm}>ЗАЖИГАНИЕ [J]</span>
                  <div className={`w-2.5 h-2.5 rounded-none border border-black ${isEngineRunning ? 'bg-[#c68a35] shadow-[0_0_8px_#c68a35]' : isStalled ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse' : 'bg-[#2a2e38]'}`} />
                </div>
                <button
                  type="button"
                  onClick={() => { sound.playButtonPress(); if (onToggleEngine) onToggleEngine(); if (navigator.vibrate) navigator.vibrate(25); }}
                  className={`w-full mt-3 py-2.5 px-3 rounded-[2px] border flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${isEngineRunning ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : isStalled ? 'bg-amber-800/80 border-amber-500 text-amber-200 animate-pulse' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                >
                  <Power className="w-4 h-4" />
                  <span className="text-xs font-mono font-black uppercase tracking-wider">{isEngineRunning ? 'МОТОР ВКЛ' : isStalled ? 'ЗАГЛОХ (СТАРТ)' : 'СТАРТ / СТОП'}</span>
                </button>
                <span className="text-[8px] text-center font-mono text-[#5a6272] mt-2">{isEngineRunning ? 'Холостой ход активен' : 'Двигатель заглушен'}</span>
              </div>

              {/* 2. HEADLIGHTS */}
              <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={ptm}>ФАРЫ [L]</span>
                  <div className={`w-2.5 h-2.5 rounded-none border border-black ${headlightsMode === 'high' ? 'bg-[#c68a35] shadow-[0_0_8px_#c68a35]' : headlightsMode === 'low' ? 'bg-[#d99a41]' : 'bg-[#2a2e38]'}`} />
                </div>
                <div className="grid grid-cols-3 gap-1 mt-2.5 bg-[#0b0c0e] p-1 rounded-[2px] border border-[#2a2e38]">
                  {(['off', 'low', 'high'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { sound.playButtonPress(); if (headlightsMode !== mode) onToggleHeadlights(); }}
                      className={`py-1.5 text-[9px] font-mono font-black rounded-[2px] transition-all cursor-pointer ${headlightsMode === mode ? 'bg-[#c68a35] text-[#0b0c0e]' : 'text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                    >
                      {mode === 'off' ? 'ВЫКЛ' : mode === 'low' ? 'БЛИЖ' : 'ДАЛЬН'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 text-[8px] font-mono text-[#9ba3af]">
                  <span>РЕЖИМ:</span>
                  <span className="font-bold text-[#f0f3f6] uppercase">{headlightsMode === 'off' ? 'ВЫКЛЮЧЕНЫ' : headlightsMode === 'low' ? 'БЛИЖНИЙ СВЕТ' : 'ДАЛЬНИЙ СВЕТ'}</span>
                </div>
              </div>

              {/* 3. FRONT FOG LIGHTS */}
              <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={ptm}>ПТФ ПЕРЕД [U]</span>
                  <div className={`w-2.5 h-2.5 rounded-none border border-black ${veh.frontFogLightsOn ? 'bg-[#c68a35] shadow-[0_0_8px_#c68a35]' : 'bg-[#2a2e38]'}`} />
                </div>
                <button
                  type="button"
                  onClick={() => { sound.playButtonPress(); if (onToggleFrontFogLights) onToggleFrontFogLights(); else veh.frontFogLightsOn = !veh.frontFogLightsOn; }}
                  className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${veh.frontFogLightsOn ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                >
                  <Lightbulb className={`w-4 h-4 ${veh.frontFogLightsOn ? 'text-[#0b0c0e]' : 'text-[#9ba3af]'}`} />
                  <span className="text-[11px] font-mono font-black uppercase">{veh.frontFogLightsOn ? 'ТУМБЛЕР: ВКЛ' : 'ТУМБЛЕР: ВЫКЛ'}</span>
                  {veh.frontFogLightsOn ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
                </button>
                <span className="text-[8px] text-[#5a6272] font-mono mt-2">Передние противотуманные фары</span>
              </div>

              {/* 4. REAR FOG LIGHTS */}
              <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={ptm}>ПТФ ЗАДНИЕ [Y]</span>
                  <div className={`w-2.5 h-2.5 rounded-none border border-black ${veh.rearFogLightsOn ? 'bg-[#c68a35] shadow-[0_0_8px_#c68a35]' : 'bg-[#2a2e38]'}`} />
                </div>
                <button
                  type="button"
                  onClick={() => { sound.playButtonPress(); if (onToggleRearFogLights) onToggleRearFogLights(); else veh.rearFogLightsOn = !veh.rearFogLightsOn; }}
                  className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${veh.rearFogLightsOn ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                >
                  <Lightbulb className={`w-4 h-4 ${veh.rearFogLightsOn ? 'text-[#0b0c0e]' : 'text-[#9ba3af]'}`} />
                  <span className="text-[11px] font-mono font-black uppercase">{veh.rearFogLightsOn ? 'ТУМБЛЕР: ВКЛ' : 'ТУМБЛЕР: ВЫКЛ'}</span>
                  {veh.rearFogLightsOn ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
                </button>
                <span className="text-[8px] text-[#5a6272] font-mono mt-2">Задний фонарь повышенной яркости</span>
              </div>

              {/* 5. HAZARD */}
              <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={ptm}>АВАРИЙКА [X]</span>
                  <div className={`w-2.5 h-2.5 rounded-none border border-black ${turnSignal === 'hazard' ? 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping' : 'bg-[#2a2e38]'}`} />
                </div>
                <button
                  type="button"
                  onClick={() => { sound.playButtonPress(); onToggleTurnSignal('hazard'); }}
                  className={`w-full mt-2.5 py-2.5 px-3 rounded-[2px] border flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${turnSignal === 'hazard' ? 'bg-red-700 border-red-500 text-white animate-pulse' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-red-400 hover:text-red-300'}`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-mono font-black uppercase tracking-wider">{turnSignal === 'hazard' ? 'АВАРИЙКА: ВКЛ' : 'АВАРИЙКА'}</span>
                </button>
                <span className="text-[8px] text-center text-[#5a6272] font-mono mt-2">Синхронные указатели поворотов</span>
              </div>

              {/* 6. TURN SIGNALS */}
              <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={ptm}>ПОВОРОТЫ [Z / C]</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-none ${turnSignal === 'left' ? 'bg-[#c68a35] animate-pulse' : 'bg-[#2a2e38]'}`} />
                    <div className={`w-2 h-2 rounded-none ${turnSignal === 'right' ? 'bg-[#c68a35] animate-pulse' : 'bg-[#2a2e38]'}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                  <button
                    type="button"
                    onClick={() => { sound.playButtonPress(); onToggleTurnSignal('left'); }}
                    className={`py-2 px-2 rounded-[2px] border flex items-center justify-center gap-1 text-[10px] font-mono font-black transition-all cursor-pointer ${turnSignal === 'left' ? 'bg-[#c68a35] text-[#0b0c0e] border-[#d99a41]' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>ЛЕВЫЙ [Z]</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { sound.playButtonPress(); onToggleTurnSignal('right'); }}
                    className={`py-2 px-2 rounded-[2px] border flex items-center justify-center gap-1 text-[10px] font-mono font-black transition-all cursor-pointer ${turnSignal === 'right' ? 'bg-[#c68a35] text-[#0b0c0e] border-[#d99a41]' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                  >
                    <span>ПРАВЫЙ [C]</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[8px] font-mono text-[#9ba3af] mt-2">
                  <span>СТАТУС:</span>
                  <span className="font-bold text-[#f0f3f6] uppercase">{turnSignal === 'left' ? 'ЛЕВЫЙ БОРТ' : turnSignal === 'right' ? 'ПРАВЫЙ БОРТ' : turnSignal === 'hazard' ? 'АВАРИЙКА' : 'ВЫКЛЮЧЕНЫ'}</span>
                </div>
              </div>

              {/* 7. WIPERS */}
              <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={ptm}>ДВОРНИКИ [K]</span>
                  <div className={`w-2.5 h-2.5 rounded-none border border-black ${wipersActive ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'}`} />
                </div>
                <button
                  type="button"
                  onClick={() => { sound.playButtonPress(); onToggleWipers(); }}
                  className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${wipersActive ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                >
                  <CloudRain className="w-4 h-4" />
                  <span className="text-[11px] font-mono font-black uppercase">{wipersActive ? 'ПРИВОД: ВКЛ' : 'ПРИВОД: ВЫКЛ'}</span>
                  {wipersActive ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
                </button>
                <span className="text-[8px] text-[#5a6272] font-mono mt-2">Очиститель лобового стекла</span>
              </div>

              {/* 8. CLIMATE */}
              <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={ptm}>КЛИМАТ / ПЕЧКА</span>
                  <div className={`w-2.5 h-2.5 rounded-none border border-black ${heaterMode === 'high' ? 'bg-[#c68a35]' : heaterMode === 'med' ? 'bg-[#d99a41]' : heaterMode === 'low' ? 'bg-[#9ba3af]' : 'bg-[#2a2e38]'}`} />
                </div>
                <div className="grid grid-cols-4 gap-1 mt-2 bg-[#0b0c0e] p-1 rounded-[2px] border border-[#2a2e38]">
                  {(['off', 'low', 'med', 'high'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { sound.playButtonPress(); onChangeHeaterMode(m); }}
                      className={`py-1 text-[8.5px] font-mono font-black rounded-[2px] transition-all cursor-pointer ${heaterMode === m ? 'bg-[#c68a35] text-[#0b0c0e]' : 'text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2 bg-[#0b0c0e] p-1 rounded-[2px] border border-[#2a2e38]">
                  <button
                    type="button"
                    onClick={() => { sound.playButtonPress(); if (onToggleAC) onToggleAC(); }}
                    className={`py-1 px-1.5 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 text-[8.5px] font-mono font-black ${acActive ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e]' : 'bg-[#14161a] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                  >
                    <span className="flex items-center gap-1"><Snowflake className="w-3 h-3" /><span>A/C</span></span>
                    {acActive ? <span className="text-[7.5px] font-bold">ВКЛ</span> : <span className="text-[7.5px] text-[#5a6272]">ВЫКЛ</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => { sound.playButtonPress(); if (onToggleRecirc) onToggleRecirc(); }}
                    className={`py-1 px-1.5 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 text-[8.5px] font-mono font-black ${recircActive ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e]' : 'bg-[#14161a] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                  >
                    <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /><span>РЕЦ.</span></span>
                    {recircActive ? <span className="text-[7.5px] font-bold">ВНУТ</span> : <span className="text-[7.5px] text-[#5a6272]">УЛИЦ</span>}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[8px] font-mono text-[#9ba3af] mt-2">
                  <span className="flex items-center gap-1"><Fan className="w-3 h-3 text-[#c68a35]" /><span>САЛОН:</span></span>
                  <span className="font-bold text-[#f0f3f6]">{heaterTemp}°C</span>
                </div>
              </div>

              {/* 9. WINDOW */}
              <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={ptm}>ОКНО ДВЕРИ [O]</span>
                  <div className={`w-2.5 h-2.5 rounded-none border border-black ${isWindowOpen ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'}`} />
                </div>
                <button
                  type="button"
                  onClick={() => { sound.playUseItem(); if (onToggleWindow) onToggleWindow(); else veh.windowOpen = !veh.windowOpen; }}
                  className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${isWindowOpen ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                >
                  <Wind className="w-4 h-4" />
                  <span className="text-[11px] font-mono font-black uppercase">{isWindowOpen ? 'ОПУЩЕНО' : 'ПОДНЯТО'}</span>
                  {isWindowOpen ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
                </button>
                <span className="text-[8px] text-[#5a6272] font-mono mt-2">{isWindowOpen ? 'Стекло открыто (приток воздуха)' : 'Стекло закрыто (герметично)'}</span>
              </div>

              {/* 10. DIFF LOCK (only for supported vehicles) */}
              {diffCaps.supported && (
                <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className={ptm}>ДИФФЕРЕНЦИАЛ [V]</span>
                    <div className={`w-2.5 h-2.5 rounded-none border border-black ${isDiffLocked ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (onCycleDiffLock) onCycleDiffLock(); else { const res = cycleVehicleDiffLock(veh); if (res.isEngaged) sound.playDiffLockEngage(); else if (res.changed) sound.playDiffLockDisengage(); else sound.playDiffLockWarning(); } }}
                    className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${isDiffLocked ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-[10.5px] font-mono font-black uppercase truncate max-w-[120px]">{diffLockDesc}</span>
                    {isDiffLocked ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
                  </button>
                  <span className="text-[8px] text-[#5a6272] font-mono mt-2">Блокировка дифференциала</span>
                </div>
              )}

              {/* 11. TRAILER HITCH */}
              <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={ptm}>СЦЕПКА / ПРИЦЕП [H]</span>
                  <div className={`w-2.5 h-2.5 rounded-none border border-black ${veh.trailerId ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'}`} />
                </div>
                <button
                  type="button"
                  onClick={() => { if (onToggleTrailerHitch) onToggleTrailerHitch(); else toggleTrailerHitch(veh, world); }}
                  className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${veh.trailerId ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                >
                  <Link2 className="w-4 h-4" />
                  <span className="text-[11px] font-mono font-black uppercase">{veh.trailerId ? 'СЦЕПЛЕН' : 'РАСЦЕПЛЕН'}</span>
                  {veh.trailerId ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
                </button>
                <span className="text-[8px] text-[#5a6272] font-mono mt-2">Тягово-сцепное устройство (ТСУ)</span>
              </div>

              {/* 12. ROAD TRAIN LIGHTS (only for trucks) */}
              {hasRoadTrainLights(veh) && (
                <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className={ptm}>АВТОПОЕЗД [N]</span>
                    <div className={`w-2.5 h-2.5 rounded-none border border-black ${veh.roadTrainLightsOn !== false ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => { sound.playButtonPress(); if (onToggleRoadTrainLights) onToggleRoadTrainLights(); else veh.roadTrainLightsOn = !veh.roadTrainLightsOn; }}
                    className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${veh.roadTrainLightsOn !== false ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                  >
                    <Truck className="w-4 h-4" />
                    <span className="text-[11px] font-mono font-black uppercase">{veh.roadTrainLightsOn !== false ? 'ОГНИ: ВКЛ' : 'ОГНИ: ВЫКЛ'}</span>
                    {veh.roadTrainLightsOn !== false ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
                  </button>
                  <span className="text-[8px] text-[#5a6272] font-mono mt-2">3 опознавательных огня автопоезда</span>
                </div>
              )}

              {/* 13. SIREN (only for emergency vehicles) */}
              {['police', 'ambulance', 'ambulance_van', 'ambulance_suv', 'fire_engine', 'fire_ladder', 'fire_rescue'].includes(veh.type) && (
                <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className={ptm}>СПЕЦСИГНАЛ [B]</span>
                    <div className={`w-2.5 h-2.5 rounded-none border border-black ${veh.sirenOn ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-ping' : 'bg-[#2a2e38]'}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => { sound.playButtonPress(); onToggleSiren(); }}
                    className={`w-full mt-2.5 py-2.5 px-3 rounded-[2px] border flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${veh.sirenOn ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                  >
                    <Siren className="w-4 h-4" />
                    <span className="text-xs font-mono font-black uppercase tracking-wider">{veh.sirenOn ? 'СИРЕНА: АКТИВНА' : 'СИРЕНА / МАЯК'}</span>
                  </button>
                  <span className="text-[8px] text-center text-[#5a6272] font-mono mt-2">Проблесковые маяки и звуковой сигнал</span>
                </div>
              )}

              {/* 14. GBO (only with gas system) */}
              {veh.hasGBO && veh.fuelSystem && (
                <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className={ptm}>ГБО (ПРОПАН) [K]</span>
                    <div className={`w-2.5 h-2.5 rounded-none border border-black ${veh.fuelSystem.gboActive !== false ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => { sound.playButtonPress(); veh.fuelSystem!.gboActive = !veh.fuelSystem!.gboActive; }}
                    className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${veh.fuelSystem.gboActive !== false ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                  >
                    <Zap className="w-4 h-4" />
                    <span className="text-[11px] font-mono font-black uppercase">{veh.fuelSystem.gboActive !== false ? 'ГАЗ: ВКЛ' : 'БЕНЗИН'}</span>
                    {veh.fuelSystem.gboActive !== false ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
                  </button>
                  <span className="text-[8px] text-[#5a6272] font-mono mt-2">Запас газа: {Math.round(veh.fuelSystem.gboLevel ?? 0)}%</span>
                </div>
              )}

              {/* 15. WATER PTO PUMP (only for water trucks and fire engines) */}
              {(veh.type === 'truck_water' || veh.type === 'fire_engine') && (
                <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className={ptm}>КОМ / ВОДОНАСОС</span>
                    <div className={`w-2.5 h-2.5 rounded-none border border-black ${veh.isPtoActive ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => { sound.playButtonPress(); veh.isPtoActive = !veh.isPtoActive; }}
                    className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${veh.isPtoActive ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                  >
                    <Gauge className="w-4 h-4" />
                    <span className="text-[11px] font-mono font-black uppercase">{veh.isPtoActive ? 'НАСОС: ВКЛ' : 'НАСОС: ВЫКЛ'}</span>
                    {veh.isPtoActive ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
                  </button>
                  <span className="text-[8px] text-[#5a6272] font-mono mt-2">Коробка отбора мощности</span>
                </div>
              )}

              {/* 16. TANK DRAIN VALVE (only with a fluid tank) */}
              {veh.fluidTank && veh.fluidTank.capacity > 0 && (
                <div className="flex flex-col justify-between p-3.5 rounded-[2px] border border-[#2a2e38] bg-[#14161a] shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className={`${ptm} truncate max-w-[130px]`}>СЛИВ {getLiquidNameRu(veh.fluidTank.liquidType)}</span>
                    <div className={`w-2.5 h-2.5 rounded-none border border-black ${veh.fluidTank.drainValveOpen ? 'bg-[#c68a35]' : 'bg-[#2a2e38]'}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => { sound.playButtonPress(); veh.fluidTank!.drainValveOpen = !veh.fluidTank!.drainValveOpen; }}
                    className={`w-full mt-2.5 py-2 px-3 rounded-[2px] border flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 shadow-sm ${veh.fluidTank.drainValveOpen ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e] font-black' : 'bg-[#1c1f26] hover:bg-[#232730] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}
                  >
                    <Droplet className="w-4 h-4" />
                    <span className="text-[11px] font-mono font-black uppercase">{veh.fluidTank.drainValveOpen ? 'КРАН: ОТКРЫТ' : 'КРАН: ЗАКРЫТ'}</span>
                    {veh.fluidTank.drainValveOpen ? <ToggleRight className="w-4 h-4 text-[#0b0c0e]" /> : <ToggleLeft className="w-4 h-4 text-[#5a6272]" />}
                  </button>
                  <span className="text-[8px] text-[#5a6272] font-mono mt-2">
                    Объём: {Math.round(veh.fluidTank.currentVolume ?? (veh.fluidTank as { currentAmount?: number }).currentAmount ?? 0)} / {veh.fluidTank.capacity} л
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-2 border-t border-[#2a2e38] text-[8.5px] font-mono text-[#5a6272] text-center">
              Клавиши [J, L, U, Y, X, Z, C, K, O, V, B, H] работают и без этого меню
            </div>
          </div>
        </section>
      )}

      {/* ================= PANEL: АВТО (конфигуратор, как дерево при выборе авто во freeroam) ================= */}
      {panel === 'config' && veh && (
        <Configurator
          key={veh.id}
          veh={veh}
          onClose={() => setPanel(null)}
          onApply={(cfg) => { onApplyVehicleConfig(cfg); sound.playButtonPress(); }}
        />
      )}

      {/* ================= PANEL: ОКРУЖЕНИЕ ================= */}
      {panel === 'world' && (
        <Panel title="Окружение" sub="Погода и время суток мира" HeaderIcon={CloudSun} onClose={() => setPanel(null)}>
          <div className="flex flex-col gap-2">
            <Sec Icon={Clock}>Время суток</Sec>
            <div className="flex items-center justify-between p-3 rounded-[2px] border border-[#2a2e38] bg-[#14161a]">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#c68a35]" /><span className="text-2xl font-black text-[#c68a35]">{formatGameTime(hour)}</span></div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { sound.playButtonPress(); onSetTime(Math.round(((hour - 1 + 24) % 24))); }} className="w-8 h-8 rounded-[2px] border border-[#2a2e38] bg-[#1c1f26] text-[#9ba3af] hover:text-[#f0f3f6] cursor-pointer flex items-center justify-center" title="-1 час"><ChevronLeft className="w-4 h-4" /></button>
                <button type="button" onClick={() => { sound.playButtonPress(); onToggleTimeAuto(); }} className={`flex items-center gap-2 py-2 px-3 rounded-[2px] border text-[10px] font-mono font-black uppercase cursor-pointer transition-all ${isTimeAutoCycling ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e]' : 'bg-[#1c1f26] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}>
                  {isTimeAutoCycling ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  <span>{isTimeAutoCycling ? 'ХОД ВРЕМ' : 'ПАУЗА'}</span>
                </button>
                <button type="button" onClick={() => { sound.playButtonPress(); onSetTime(Math.round(((hour + 1) % 24))); }} className="w-8 h-8 rounded-[2px] border border-[#2a2e38] bg-[#1c1f26] text-[#9ba3af] hover:text-[#f0f3f6] cursor-pointer flex items-center justify-center" title="+1 час"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {TIME_PRESETS.map(({ label, hour: h, Icon }) => (
                <button key={label} type="button" onClick={() => { sound.playButtonPress(); onSetTime(h); }} className="py-2 flex flex-col items-center gap-1 rounded-[2px] border border-[#2a2e38] bg-[#1c1f26] text-[9px] font-mono font-black uppercase text-[#9ba3af] hover:text-[#f0f3f6] hover:bg-[#232730] cursor-pointer">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Sec Icon={CloudSun}>Погода</Sec>
            <div className="grid grid-cols-4 gap-1.5">
              {WEATHER.map(({ id, label, Icon }) => (
                <button key={id} type="button" onClick={() => { sound.playButtonPress(); onSetWeather(id); }} className={`py-2.5 px-1 flex flex-col items-center gap-1 rounded-[2px] border cursor-pointer transition-all ${weather === id ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e]' : 'bg-[#1c1f26] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6] hover:bg-[#232730]'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[8.5px] font-mono font-black uppercase">{label}</span>
                </button>
              ))}
            </div>
            <div className="text-[8px] font-mono text-[#5a6272] text-center">Переход погоды плавный, около 16 секунд</div>
          </div>
        </Panel>
      )}

      {/* ================= PANEL: ТРАФИК (настройки движения города) ================= */}
      {panel === 'traffic' && (
        <Panel title="Трафик" sub="Управление движением города" HeaderIcon={TrafficCone} onClose={() => setPanel(null)}>
          <div className="flex flex-col gap-2">
            <Sec>Симуляция движения</Sec>
            <ToggleRow
              title="Трафик вкл / выкл"
              sub={`${tVehicles.length} машин · ${tPeds} пешеходов на карте`}
              Icon={TrafficCone}
              on={isTrafficEnabled}
              onLabel="ВКЛ"
              offLabel="СТОП"
              onChange={() => { sound.playButtonPress(); onSetTrafficEnabled(!isTrafficEnabled); setTrafficTick((t) => t + 1); }}
            />
            <div className="text-[8px] font-mono text-[#5a6272] text-center">
              {isTrafficEnabled ? 'AI-машины и пешеходы едут по городу' : 'Весь трафик остановлен и заморожен'}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Sec Icon={Car}>Количество машин</Sec>
            <Slider
              label="Машин рядом"
              value={performanceConfig.nearbyVehiclesTarget}
              min={0}
              max={24}
              step={1}
              onChange={(v) => { performanceConfig.nearbyVehiclesTarget = v; savePerformanceConfig(performanceConfig); setTrafficTick((t) => t + 1); }}
            />
            <div className="grid grid-cols-3 gap-2">
              {([[5, 'Мало'], [10, 'Обычно'], [18, 'Много']] as [number, string][]).map(([v, l]) => (
                <button key={l} type="button" onClick={() => { sound.playButtonPress(); performanceConfig.nearbyVehiclesTarget = v; savePerformanceConfig(performanceConfig); setTrafficTick((t) => t + 1); }} className={`py-2 rounded-[2px] border text-[9px] font-mono font-black uppercase cursor-pointer transition-all ${performanceConfig.nearbyVehiclesTarget === v ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e]' : 'bg-[#1c1f26] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Sec Icon={Users}>Количество людей</Sec>
            <Slider
              label="Пешеходов"
              value={performanceConfig.maxActivePedestrians}
              min={0}
              max={200}
              step={5}
              onChange={(v) => { performanceConfig.maxActivePedestrians = v; savePerformanceConfig(performanceConfig); setTrafficTick((t) => t + 1); }}
            />
            <div className="grid grid-cols-3 gap-2">
              {([[25, 'Пусто'], [90, 'Обычно'], [180, 'Много']] as [number, string][]).map(([v, l]) => (
                <button key={l} type="button" onClick={() => { sound.playButtonPress(); performanceConfig.maxActivePedestrians = v; savePerformanceConfig(performanceConfig); setTrafficTick((t) => t + 1); }} className={`py-2 rounded-[2px] border text-[9px] font-mono font-black uppercase cursor-pointer transition-all ${performanceConfig.maxActivePedestrians === v ? 'bg-[#c68a35] border-[#d99a41] text-[#0b0c0e]' : 'bg-[#1c1f26] border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6]'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Sec Icon={RefreshCw}>Респавн</Sec>
            <button type="button" onClick={() => { sound.playButtonPress(); respawnStalledVehicles(world, player ? { x: player.x, y: player.y } : undefined); setTrafficTick((t) => t + 1); }} className="py-3 flex items-center justify-center gap-2 rounded-[2px] border border-[#2a2e38] bg-[#1c1f26] text-[10px] font-mono font-black uppercase text-[#9ba3af] hover:text-[#f0f3f6] hover:bg-[#232730] cursor-pointer transition-all active:scale-[0.98]">
              <RefreshCw className="w-4 h-4" />
              <span>Респавн заторевших машин</span>
            </button>
            <div className="text-[8px] font-mono text-[#5a6272] text-center">Застрявшие дольше 6 секунд машины переставляются ближе к вам</div>
          </div>
        </Panel>
      )}

      </PanelLayoutContext.Provider>

      {/* bottom hints (keyboard hints, hidden on small screens) */}
      {layout.showHints && (
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 text-[10px] font-mono uppercase tracking-wider text-[#9ba3af] pointer-events-none">
          <span><kbd className="inline-flex items-center justify-center min-w-[22px] h-[20px] px-2 mr-1.5 rounded-[2px] border border-white/25 text-[10px] font-bold">1–6</kbd>Выбрать</span>
          <span><kbd className="inline-flex items-center justify-center min-w-[22px] h-[20px] px-2 mr-1.5 rounded-[2px] border border-white/25 text-[10px] font-bold">Enter</kbd>Подтвердить</span>
          <span><kbd className="inline-flex items-center justify-center min-w-[22px] h-[20px] px-2 mr-1.5 rounded-[2px] border border-white/25 text-[10px] font-bold">Esc</kbd>Закрыть</span>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Vehicle configurator panel: side tree identical to the freeroam     */
/* vehicle select (color + engine / gearbox / ECU / turbo / tires)     */
/* ------------------------------------------------------------------ */
const Configurator: React.FC<{
  veh: Vehicle;
  onClose: () => void;
  onApply: (cfg: VehicleConfigSelection) => void;
}> = ({ veh, onClose, onApply }) => {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ paint: false, pt: false, eng: false, trn: false, turbo: false, tune: false, tir: false });
  const toggle = (id: string) => setOpenIds((o) => ({ ...o, [id]: !o[id] }));

  const entry = VEHICLE_CATALOG.find((c) => c.type === veh.type);
  const colorList = entry?.colors ?? [];
  const [colorIdx, setColorIdx] = useState(() => {
    const cur = veh.color || '';
    const i = colorList.findIndex((c) => c.hex.toLowerCase() === cur.toLowerCase());
    return i >= 0 ? i : -1;
  });

  const es = veh.engineState || ({} as Vehicle['engineState']);
  const [engId, setEngId] = useState<string>(es?.engineId ?? '');
  const [trnId, setTrnId] = useState<string>(es?.transmissionId ?? '');
  const [tuneId, setTuneId] = useState<string>(es?.tuneId ?? '');
  const [tirId, setTirId] = useState<string>(es?.tireSetId ?? '');
  const [tboId, setTboId] = useState<string>(es?.turboKitId ?? 'trb_none');

  const pwCat = getVehiclePowertrainCategory(veh.type);
  const engPool = useMemo(() => ENGINE_VARIANTS.filter((e) => e.cats.includes(pwCat)), [pwCat]);
  const pickedEng = engPool.find((e) => e.id === engId) || null;
  const trnPool = useMemo(() => TRANSMISSION_VARIANTS.filter((t) => t.cats.includes(pwCat)), [pwCat]);
  const pickedTrn = trnPool.find((t) => t.id === trnId) || null;
  const tunePool = useMemo(() => TUNE_VARIANTS.filter((t) => {
    if (t.requiresTurbo && !(pickedEng ? pickedEng.turbo : false)) return false;
    if (pickedEng) {
      if (pickedEng.fuel === 'diesel') return !!t.isDieselTune;
      if (t.isDieselTune || t.id === 'tune_agricultural') return false;
    } else if (t.isDieselTune) {
      return !!(t.cats && (pwCat === 'truck' || pwCat === 'tractor' || pwCat === 'machinery') && t.cats.includes(pwCat));
    }
    return !t.cats || t.cats.includes(pwCat);
  }), [pickedEng, pwCat]);
  const pickedTune = tunePool.find((t) => t.id === tuneId) || null;
  const tirPool = useMemo(() => TIRE_SETS.filter((t) => !t.cats || t.cats.includes(pwCat)), [pwCat]);
  const pickedTir = tirPool.find((t) => t.id === tirId) || null;
  const factoryTurbo = pickedEng?.turbo || null;
  const pickedTbo = TURBO_KITS.find((k) => k.id === tboId) || null;

  const selColor = colorIdx >= 0 && colorIdx < colorList.length ? colorList[colorIdx] : null;
  const previewColor = selColor ? selColor.hex : (veh.color || '#c68a35');

  const apply = () => {
    onApply({
      color: selColor ?? undefined,
      powertrain: {
        engineId: engId || undefined,
        transmissionId: trnId || undefined,
        tuneId: tuneId || undefined,
        tireSetId: tirId || undefined,
        turboKitId: factoryTurbo ? factoryTurbo.id : (pickedTbo && pickedTbo.id !== 'trb_none' ? pickedTbo.id : 'trb_none')
      }
    });
  };

  const isTrailerLike = (veh.type as string).startsWith('trailer_');

  return (
    <Panel
      title="Авто · Конфигуратор"
      sub={entry ? entry.nameRu : (veh.nameRu || veh.type)}
      HeaderIcon={Palette}
      onClose={onClose}
    >
      {isTrailerLike ? (
        <div className="p-4 rounded-[2px] border border-[#2a2e38] bg-[#14161a] text-center text-[10px] font-mono uppercase text-[#9ba3af]">Прицеп не имеет силовой части</div>
      ) : (
        <>
          {/* preview */}
          <div className="flex flex-wrap items-center gap-3 p-2 rounded-[2px] border border-[#2a2e38] bg-[#0f1116]">
            <VehiclePreviewCanvas carType={veh.type} color={previewColor} roofColor={selColor?.roofHex || undefined} width={220} height={130} showPedestal={false} />
            <div className="min-w-0">
              <div className="cn text-[16px] font-black uppercase tracking-wide text-[#f0f3f6] truncate">{entry ? entry.nameRu : (veh.nameRu || veh.type)}</div>
              <div className="text-[10px] text-[#9ba3af] mt-1">
                {selColor ? selColor.name : 'Текущая окраска'} · {pickedEng ? FUEL_LABEL[pickedEng.fuel] || pickedEng.fuel : 'заводской мотор'} · {pickedTrn ? pickedTrn.nameRu.split(' ')[0] : 'заводская КПП'}
              </div>
              {entry && <div className="text-[9px] text-[#5a6272] mt-0.5">{entry.powerHp} л.с. · {entry.classType}</div>}
            </div>
          </div>

          {/* tree */}
          <div className="p-2 rounded-[2px] border border-[#2a2e38] bg-[#14161a]">
            <Node id="paint" n="Окраска" v={selColor ? selColor.name : 'Текущая'} openIds={openIds} toggle={toggle}>
              {colorList.length > 0 ? (
                colorList.map((cl, i) => (
                  <Opt key={cl.hex + i} on={colorIdx === i} onClick={() => setColorIdx(i)} title={cl.name} swatch={cl.hex} />
                ))
              ) : (
                <div className="text-[10px] text-[#9ba3af] px-2 py-1">У этого борта нет заводской палитры</div>
              )}
            </Node>
            <Node id="pt" n="Силовая часть" v={`${pickedEng ? pickedEng.nameRu : 'Заводской'} · ${pickedTrn ? pickedTrn.nameRu : 'заводская КПП'}`} openIds={openIds} toggle={toggle}>
              <Node id="eng" n="Двигатель" v={pickedEng ? pickedEng.nameRu : 'Текущий'} openIds={openIds} toggle={toggle}>
                {engPool.map((e) => (
                  <Opt key={e.id} on={e.id === engId} onClick={() => setEngId(e.id)} title={e.nameRu} sub={`${FUEL_LABEL[e.fuel] || e.fuel}${e.turbo ? ' · наддув' : ''}`} />
                ))}
              </Node>
              <Node id="trn" n="Коробка передач" v={pickedTrn ? pickedTrn.nameRu : 'Текущая'} openIds={openIds} toggle={toggle}>
                {trnPool.map((t) => (
                  <Opt key={t.id} on={t.id === trnId} onClick={() => setTrnId(t.id)} title={t.nameRu} sub={`${t.isManualYesNo ? 'МКПП' : 'АВТО'} · ${t.massKg} кг`} />
                ))}
              </Node>
              <Node id="turbo" n="Наддув" v={factoryTurbo ? factoryTurbo.nameRu + ' (штатный)' : (pickedTbo && pickedTbo.id !== 'trb_none' ? pickedTbo.nameRu : 'Без наддува')} openIds={openIds} toggle={toggle}>
                {factoryTurbo ? (
                  <div className="text-[10px] text-[#9ba3af] px-2 py-1">Штатный наддув двигателя, замена недоступна</div>
                ) : (
                  TURBO_KITS.map((k) => (
                    <Opt key={k.id} on={k.id === tboId} onClick={() => setTboId(k.id)} title={k.nameRu} sub={k.id === 'trb_none' ? undefined : `+${Math.round(k.boostMax * 100)}% тяги`} />
                  ))
                )}
              </Node>
              <Node id="tune" n="Прошивка ЭБУ" v={pickedTune ? pickedTune.nameRu : 'Текущая'} openIds={openIds} toggle={toggle}>
                {tunePool.map((t) => (
                  <Opt key={t.id} on={t.id === tuneId} onClick={() => setTuneId(t.id)} title={t.nameRu} sub={t.chipLevel > 0 ? `Чип ${t.chipLevel}` : undefined} />
                ))}
              </Node>
              <Node id="tir" n="Шины" v={pickedTir ? pickedTir.nameRu : 'Текущие'} openIds={openIds} toggle={toggle}>
                {tirPool.map((t) => (
                  <Opt key={t.id} on={t.id === tirId} onClick={() => setTirId(t.id)} title={t.nameRu} sub={t.isStudded ? 'Шипы' : t.isOffroad ? 'Внедорожные' : t.isSemiSlick ? 'Полуслик' : undefined} />
                ))}
              </Node>
            </Node>
          </div>

          <button type="button" onClick={apply} className="w-full py-3 flex items-center justify-center gap-2 rounded-[2px] bg-[#c68a35] border border-[#d99a41] text-[#0b0c0e] text-[11px] font-mono font-black uppercase tracking-wider cursor-pointer transition-all active:scale-[0.98] hover:brightness-110">
            <Power className="w-4 h-4" />
            <span>Применить конфигурацию</span>
          </button>
          <div className="text-[8px] font-mono text-[#5a6272] text-center">Сборка устанавливается на борт сразу: двигатель, КПП, наддув, шины и прошивка реально меняют поведение машины</div>
        </>
      )}
    </Panel>
  );
};

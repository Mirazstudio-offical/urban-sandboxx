import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  Palette,
  Check,
  RotateCcw,
  Pause,
  CarFront,
  type LucideIcon
} from 'lucide-react';
import { sound } from '../audio';
import { toggleTrailerHitch } from '../physics';
import { getLiquidNameRu, hasRoadTrainLights, getVehicleDiffCapabilities, cycleVehicleDiffLock } from '../vehicleHelpers';
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
import { ShadowHost, attachStageFit } from './ShadowHost';
import radialCss from './radialMenu.css?inline';

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

/* ------------------------------------------------------------------ */
/* Wheel geometry (identical to radial-menu-v4.html): 6 equal sectors  */
/* of 60 deg, a gap of constant width between them, viewBox 640        */
/* ------------------------------------------------------------------ */
const N = 6;
const SPAN = 360 / N;
const GAP = 7;
const RI = 118;
const RO = 262;
const RL = 190;

const pt = (r: number, a: number) => {
  const rad = (a * Math.PI) / 180;
  return `${(320 + r * Math.sin(rad)).toFixed(1)} ${(320 - r * Math.cos(rad)).toFixed(1)}`;
};
const dl = (r: number) => (Math.asin(GAP / 2 / r) * 180) / Math.PI;
const arc = (i: number) => {
  const c = i * SPAN;
  const h = SPAN / 2;
  const o = dl(RO);
  const n = dl(RI);
  return `M${pt(RO, c - h + o)}A${RO} ${RO} 0 0 1 ${pt(RO, c + h - o)}L${pt(RI, c + h - n)}A${RI} ${RI} 0 0 0 ${pt(RI, c - h + n)}Z`;
};
const push = (i: number): React.CSSProperties => {
  const a = (i * SPAN * Math.PI) / 180;
  return { ['--x' as string]: (9 * Math.sin(a)).toFixed(1) + 'px', ['--y' as string]: (-9 * Math.cos(a)).toFixed(1) + 'px' };
};

const WEATHER: { id: WeatherType; label: string; Icon: LucideIcon }[] = [
  { id: 'clear', label: 'Ясно', Icon: Sun },
  { id: 'overcast', label: 'Пасмурно', Icon: CloudSun },
  { id: 'drizzle', label: 'Морось', Icon: CloudDrizzle },
  { id: 'rain', label: 'Дождь', Icon: CloudRain },
  { id: 'storm', label: 'Гроза', Icon: CloudLightning },
  { id: 'fog', label: 'Туман', Icon: Cloud },
  { id: 'snow', label: 'Снег', Icon: Snowflake },
  { id: 'blizzard', label: 'Метель', Icon: Wind }
];

const TIME_PRESETS: { label: string; hour: number; Icon: LucideIcon }[] = [
  { label: 'Рассвет', hour: 6, Icon: Sunrise },
  { label: 'День', hour: 12, Icon: Sun },
  { label: 'Закат', hour: 19, Icon: Sunset },
  { label: 'Ночь', hour: 0, Icon: Moon }
];

const FUEL_LABEL: Record<string, string> = { ai92: 'АИ-92', ai95: 'АИ-95', ai98: 'АИ-98', ai100: 'АИ-100', diesel: 'ДТ' };

/* ------------------------------------------------------------------ */
/* Small UI atoms in the markup language of the mock-up                */
/* ------------------------------------------------------------------ */

const Sl: React.FC<{ k?: string; children: React.ReactNode }> = ({ k, children }) => (
  <div className="sl">{children}{k && <span className="kc">{k}</span>}</div>
);

const Tile: React.FC<{
  Icon: LucideIcon;
  label?: string;
  on?: boolean;
  cls?: string;
  st?: string;
  size?: number;
  disabled?: boolean;
  onClick: () => void;
}> = ({ Icon, label, on, cls = '', st, size = 22, disabled, onClick }) => (
  <button type="button" className={`tile ${cls} ${on ? 'on' : ''}`} disabled={disabled} onClick={onClick}>
    <Icon width={size} height={size} strokeWidth={1.8} />
    {label && <span>{label}</span>}
    {st !== undefined && <b className="stt">{st}</b>}
  </button>
);

const Seg: React.FC<{ options: { label: string; on: boolean; onPick: () => void }[] }> = ({ options }) => (
  <div className="seg">
    {options.map((o, i) => (
      <span key={i} className={o.on ? 'on' : ''} onClick={o.onPick}>{o.label}</span>
    ))}
  </div>
);

const Tg: React.FC<{ on: boolean; label: string; onClick: () => void }> = ({ on, label, onClick }) => (
  <button type="button" className={`tg ${on ? 'on' : ''}`} aria-label={label} aria-pressed={on} onClick={onClick} />
);

const Sld: React.FC<{ value: number; min: number; max: number; step?: number; label: string; onChange: (v: number) => void }> = ({ value, min, max, step = 1, label, onChange }) => {
  const ref = useRef<HTMLDivElement>(null);
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const apply = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onChange(Math.round((min + p * (max - min)) / step) * step);
  };
  return (
    <div
      ref={ref}
      className="sld-t"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); apply(e.clientX); }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) apply(e.clientX); }}
    >
      <div className="sld-f" style={{ width: pct + '%' }} />
      <div className="sld-k" style={{ left: pct + '%' }} />
    </div>
  );
};

const Panel: React.FC<{
  title: string;
  sub: string;
  HeaderIcon: LucideIcon;
  onClose: () => void;
  fl?: boolean;
  foot?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, sub, HeaderIcon, onClose, fl, foot, children }) => (
  <aside className="panel side" data-radial-panel>
    <div className="ph">
      <span className="pi"><HeaderIcon width={24} height={24} strokeWidth={2} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cn" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
        <div className="mut sub">{sub}</div>
      </div>
      <button type="button" className="xb" aria-label="Закрыть" onClick={onClose}><X width={20} height={20} /></button>
    </div>
    <div className={'pb' + (fl ? ' fl' : '')}>{children}</div>
    {foot && <div className="pf">{foot}</div>}
  </aside>
);

/* configurator tree (same pieces as the freeroam vehicle select) */
const chev = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M9 5l7 7-7 7" /></svg>
);

const Node: React.FC<{ id: string; n: string; v: React.ReactNode; openIds: Record<string, boolean>; toggle: (id: string) => void; children: React.ReactNode }> = ({ id, n, v, openIds, toggle, children }) => (
  <div className={'nd' + (openIds[id] ? ' on' : '')}>
    <button type="button" className="nh" aria-expanded={!!openIds[id]} onClick={() => toggle(id)}>
      {chev}<span className="cn">{n}</span><span className="v">{v}</span>
    </button>
    <div className="nb"><div className="ni"><div className="nc">{children}</div></div></div>
  </div>
);

const Opt: React.FC<{ on: boolean; onClick: () => void; title: string; sub?: string }> = ({ on, onClick, title, sub }) => (
  <button type="button" className={'opt' + (on ? ' on' : '')} onClick={onClick}>
    <span style={{ fontWeight: 600 }}>{title}</span>
    {sub && <span className="mut" style={{ fontSize: 13 }}>{sub}</span>}
  </button>
);

/* ------------------------------------------------------------------ */
/* Public component: mounts the stage only while the menu is open      */
/* ------------------------------------------------------------------ */

export const RadialMenu: React.FC<RadialMenuProps> = (props) => {
  if (!props.isOpen || !props.player || !props.world) return null;
  return <RadialStage {...props} player={props.player} world={props.world} />;
};

const RadialStage: React.FC<RadialMenuProps & { player: Player; world: GameWorld }> = ({
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
  const [tick, setTick] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gmRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGSVGElement>(null);
  const [pop, setPop] = useState(true);

  useLayoutEffect(() => attachStageFit(() => wrapRef.current, () => gmRef.current), []);
  useEffect(() => { const t = window.setTimeout(() => setPop(false), 500); return () => window.clearTimeout(t); }, []);

  /* Clockwise from the top: 1 Приборка · 2 Авто · 3 Окружение · 4 Спавн · 5 Починить · 6 Трафик */
  const SLOT = useMemo(() => ([
    { id: 'board', n: 'Приборка', desc: 'Борт-панели авто', Icon: Gauge, panel: 'board' as const },
    { id: 'config', n: 'Авто', desc: 'Конфигуратор борта', Icon: SlidersHorizontal, panel: 'config' as const },
    { id: 'world', n: 'Окружение', desc: 'Погода и время', Icon: CloudSun, panel: 'world' as const },
    { id: 'spawn', n: 'Спавн', desc: 'Создать автомобиль', Icon: MapPin, panel: null },
    { id: 'repair', n: 'Починить', desc: 'Вся техника в мире', Icon: Wrench, panel: null },
    { id: 'traffic', n: 'Трафик', desc: 'Движение города', Icon: TrafficCone, panel: 'traffic' as const }
  ]), []);

  const showPanel = (id: PanelId) => setPanel((prev) => (prev === id ? null : id));

  const activate = (i: number) => {
    if (i < 0) return;
    sound.playButtonPress();
    if (navigator.vibrate) navigator.vibrate(15);
    if (SLOT[i].id === 'repair') { onRepairAllVehicles(); onClose(); return; }
    if (SLOT[i].id === 'spawn') { setPanel(null); onClose(); onOpenSpawnMenu(); return; }
    showPanel(SLOT[i].panel as PanelId);
    setHover(i);
  };

  /* Escape closes the open panel first, then the wheel; digits 1..6 activate sectors; arrows walk the wheel */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (panel) setPanel(null); else onClose();
        return;
      }
      const d = ['1', '2', '3', '4', '5', '6'].indexOf(e.key);
      if (d >= 0) { e.preventDefault(); activate(d); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setHover((h) => ((h < 0 ? (e.key === 'ArrowRight' ? -1 : 0) : h) + (e.key === 'ArrowRight' ? 1 : -1) + N) % N);
        return;
      }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHover(0); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setHover(3); return; }
      if (e.key === 'Enter' && hover >= 0) { e.preventDefault(); activate(hover); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, hover]);

  /* live telemetry poll while a data panel is open */
  useEffect(() => {
    if (panel !== 'traffic' && panel !== 'board') return;
    const iv = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(iv);
  }, [panel]);

  /* pointer -> sector (distance in wheel units, 640 viewBox) */
  const sectorAt = (clientX: number, clientY: number): number => {
    const el = ringRef.current;
    if (!el) return -1;
    const r = el.getBoundingClientRect();
    const k = r.width / 640;
    if (!(k > 0)) return -1;
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) / k;
    if (d < 70 || d > 285) return -1;
    return Math.floor((((Math.atan2(dx, -dy) * 180) / Math.PI + 360 + SPAN / 2) % 360) / SPAN);
  };

  const stepBack = () => {
    sound.playButtonPress();
    if (panel) { setPanel(null); setHover(-1); } else onClose();
  };

  const onStagePointerMove = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.side')) return;
    const i = sectorAt(e.clientX, e.clientY);
    if (i !== hover) setHover(i);
  };

  const onStageClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('.side') || t.closest('.hc')) return;
    const i = sectorAt(e.clientX, e.clientY);
    if (i >= 0) { activate(i); return; }
    stepBack(); // hub centre or empty area around the ring
  };

  const veh: Vehicle | undefined = world.vehicles.find((v) => v.id === player.currentVehicleId);
  const hovered = hover >= 0 ? SLOT[hover] : null;
  const activeIdx = SLOT.findIndex((s) => s.panel && s.panel === panel);
  const cur = hover >= 0 ? hover : activeIdx;
  const hubItem = cur >= 0 ? SLOT[cur] : null;
  const hour = ((timeHour % 24) + 24) % 24;
  const minutes = Math.round(hour * 60) % 1440;

  /* real traffic telemetry */
  const tVehicles = world.vehicles.filter((v) => !v.isPlayerControlled);
  const tPeds = world.pedestrians ? world.pedestrians.length : 0;
  void tick;

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
  const dlk = veh?.diffLock;
  const isDiffLocked = !!(dlk?.center || dlk?.rear || dlk?.front);
  let diffLockDesc = 'Свободный';
  if (dlk?.front && dlk?.rear && dlk?.center) diffLockDesc = 'Полная (100%)';
  else if (dlk?.center && dlk?.rear) diffLockDesc = 'МОБ + МКБ-З';
  else if (dlk?.center) diffLockDesc = 'МОБ (межосевая)';
  else if (dlk?.rear) diffLockDesc = 'МКБ-З (задняя)';
  else if (dlk?.front) diffLockDesc = 'МКБ-П (передняя)';
  const isEmergency = veh ? ['police', 'ambulance', 'ambulance_van', 'ambulance_suv', 'fire_engine', 'fire_ladder', 'fire_rescue'].includes(veh.type) : false;
  const sfx = (v: boolean) => (v ? 'ВКЛ' : 'ВЫКЛ');
  const click = (fn: () => void) => () => { sound.playButtonPress(); fn(); setTick((t) => t + 1); };

  const carLabel = veh ? (veh.nameRu || veh.type) : 'Пешком';
  const setTraffic = (key: 'nearbyVehiclesTarget' | 'maxActivePedestrians', v: number) => {
    performanceConfig[key] = v;
    savePerformanceConfig(performanceConfig);
    setTick((t) => t + 1);
  };

  return (
    <ShadowHost css={radialCss} background="rgba(9,9,10,.74)" zIndex={100}>
      <div id="w" ref={wrapRef} onPointerMove={onStagePointerMove} onClick={onStageClick}>
        <div className="gm" id="gm" ref={gmRef}>
          <div className="a" style={{ inset: 0, background: 'radial-gradient(900px 520px at 70% 82%,rgba(201,146,43,.22),transparent 62%)' }} />

          <div className="top">
            <div className="row2" style={{ alignItems: 'center', gap: 14 }}>
              <Compass width={30} height={30} style={{ color: '#c9922b' }} />
              <span className="cn ttl">Быстрое меню</span>
            </div>
            <div className="chip"><CarFront width={18} height={18} style={{ color: '#c9922b' }} /><span className="mut" style={{ fontSize: 14 }}>{carLabel}</span></div>
          </div>

          {/* ================= WHEEL ================= */}
          <div id="sh" className={panel ? 'shift' : ''}>
            <div className={'wheel' + (pop ? ' pop' : '')}>
              <svg ref={ringRef} width="640" height="640" viewBox="0 0 640 640" style={{ position: 'absolute', inset: 0 }}>
                <circle cx="320" cy="320" r="292" fill="none" stroke="rgba(224,171,69,.2)" strokeDasharray="2 9" />
                <g>
                  {SLOT.map((s, i) => (
                    <g key={s.id} className={'sec' + (hover === i ? ' on' : '') + (activeIdx === i ? ' act' : '')} style={push(i)}>
                      <path d={arc(i)} />
                    </g>
                  ))}
                </g>
              </svg>
              <div>
                {SLOT.map((s, i) => {
                  const a = (i * SPAN * Math.PI) / 180;
                  return (
                    <div
                      key={s.id}
                      className={'lb' + (hover === i ? ' on' : '') + (activeIdx === i ? ' act' : '')}
                      style={{ left: 320 + RL * Math.sin(a), top: 320 - RL * Math.cos(a), ...push(i) }}
                    >
                      <s.Icon width={38} height={38} strokeWidth={1.7} />
                      <span className="cn nm">{s.n}</span>
                      <span className="key">{i + 1}</span>
                    </div>
                  );
                })}
              </div>
              <div className={'hub' + (cur >= 0 ? ' on' : '')}>
                {hubItem ? <hubItem.Icon width={40} height={40} strokeWidth={1.6} /> : <Compass width={40} height={40} strokeWidth={1.6} />}
                <div className="cn">{hubItem ? hubItem.n : 'Быстрое меню'}</div>
                <div className="mut" style={{ fontSize: 12 }}>{hubItem ? hubItem.desc : 'Выберите сектор'}</div>
                <button type="button" className="hc" onClick={(e) => { e.stopPropagation(); stepBack(); }}>
                  <X width={12} height={12} /><span>{panel ? 'Закрыть панель' : 'Закрыть'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================= PANEL: ПРИБОРКА ================= */}
          {panel === 'board' && veh && (
            <Panel key="board" title="Приборка" sub={veh.nameRu || veh.type} HeaderIcon={Gauge} onClose={() => setPanel(null)}>
              <div className="stats">
                <div><div className="lbl">км/ч</div><b className="cn">{speedKmh}</b></div>
                <div><div className="lbl">об/мин</div><b className="cn">{rpm}</b></div>
                <div><div className="lbl">бортсеть</div><b className="cn">{voltage} В</b></div>
                <div><div className="lbl">мотор</div><b className="cn" style={engTemp > 100 ? { color: '#d9745a' } : undefined}>{engTemp}°C</b></div>
                <div><div className="lbl">салон</div><b className="cn">{heaterTemp}°C</b></div>
              </div>

              <Sl k="J">Зажигание</Sl>
              <Tile Icon={Power} cls="row" on={isEngineRunning} label={isEngineRunning ? 'Мотор включён' : isStalled ? 'Заглох · старт' : 'Старт / Стоп'} onClick={() => { sound.playButtonPress(); onToggleEngine?.(); if (navigator.vibrate) navigator.vibrate(25); setTick((t) => t + 1); }} />
              <div className="note" style={{ marginTop: 6 }}>{isEngineRunning ? 'Двигатель работает' : isStalled ? 'Двигатель заглох' : 'Двигатель заглушен'}</div>

              <Sl k="L">Фары</Sl>
              <Seg options={(['off', 'low', 'high'] as const).map((m) => ({
                label: m === 'off' ? 'Выкл' : m === 'low' ? 'Ближний' : 'Дальний',
                on: headlightsMode === m,
                onPick: click(() => { if (headlightsMode !== m) onToggleHeadlights(); })
              }))} />

              <Sl k="U / Y">Противотуманные</Sl>
              <div className="grid2">
                <Tile Icon={Lightbulb} label="ПТФ перед" st={sfx(!!veh.frontFogLightsOn)} on={!!veh.frontFogLightsOn} onClick={click(() => { if (onToggleFrontFogLights) onToggleFrontFogLights(); else veh.frontFogLightsOn = !veh.frontFogLightsOn; })} />
                <Tile Icon={Lightbulb} label="ПТФ задние" st={sfx(!!veh.rearFogLightsOn)} on={!!veh.rearFogLightsOn} onClick={click(() => { if (onToggleRearFogLights) onToggleRearFogLights(); else veh.rearFogLightsOn = !veh.rearFogLightsOn; })} />
              </div>

              <Sl k="X">Аварийка</Sl>
              <Tile Icon={AlertTriangle} cls="row red blink" label="Аварийка" st={sfx(turnSignal === 'hazard')} on={turnSignal === 'hazard'} onClick={click(() => onToggleTurnSignal('hazard'))} />

              <Sl k="Z / C">Повороты</Sl>
              <div className="grid2">
                <Tile Icon={ChevronLeft} cls="row blink" label="Левый" on={turnSignal === 'left'} onClick={click(() => onToggleTurnSignal('left'))} />
                <Tile Icon={ChevronRight} cls="row blink" label="Правый" on={turnSignal === 'right'} onClick={click(() => onToggleTurnSignal('right'))} />
              </div>

              <Sl k="K">Дворники</Sl>
              <Tile Icon={CloudRain} cls="row" label="Очиститель стекла" st={sfx(wipersActive)} on={wipersActive} onClick={click(onToggleWipers)} />

              <Sl>Климат / печка</Sl>
              <Seg options={(['off', 'low', 'med', 'high'] as const).map((m) => ({
                label: m === 'off' ? 'Выкл' : m === 'low' ? 'Слабо' : m === 'med' ? 'Средне' : 'Сильно',
                on: heaterMode === m,
                onPick: click(() => onChangeHeaterMode(m))
              }))} />
              <div className="grid2" style={{ marginTop: 8 }}>
                <Tile Icon={Snowflake} cls="row sm" label="A/C" on={acActive} st={sfx(acActive)} onClick={click(() => onToggleAC?.())} />
                <Tile Icon={RefreshCw} cls="row sm" label="Рециркуляция" on={recircActive} st={recircActive ? 'ВНУТ' : 'УЛИЦ'} onClick={click(() => onToggleRecirc?.())} />
              </div>
              <div className="note" style={{ textAlign: 'left' }}><Fan width={12} height={12} style={{ verticalAlign: '-2px', marginRight: 6, color: '#c9922b' }} />Салон: {heaterTemp}°C</div>

              <Sl k="O">Окно двери</Sl>
              <Tile Icon={Wind} cls="row" label={isWindowOpen ? 'Опущено' : 'Поднято'} on={isWindowOpen} onClick={() => { sound.playUseItem(); if (onToggleWindow) onToggleWindow(); else veh.windowOpen = !veh.windowOpen; setTick((t) => t + 1); }} />

              {diffCaps.supported && (
                <>
                  <Sl k="V">Дифференциал</Sl>
                  <Tile Icon={ShieldAlert} cls="row" label={diffLockDesc} on={isDiffLocked} onClick={() => { if (onCycleDiffLock) onCycleDiffLock(); else { const res = cycleVehicleDiffLock(veh); if (res.isEngaged) sound.playDiffLockEngage(); else if (res.changed) sound.playDiffLockDisengage(); else sound.playDiffLockWarning(); } setTick((t) => t + 1); }} />
                </>
              )}

              <Sl k="H">Сцепка / прицеп</Sl>
              <Tile Icon={Link2} cls="row" label={veh.trailerId ? 'Сцеплен' : 'Расцеплен'} on={!!veh.trailerId} onClick={() => { if (onToggleTrailerHitch) onToggleTrailerHitch(); else toggleTrailerHitch(veh, world); setTick((t) => t + 1); }} />

              {hasRoadTrainLights(veh) && (
                <>
                  <Sl k="N">Автопоезд</Sl>
                  <Tile Icon={Truck} cls="row" label="Огни автопоезда" st={sfx(veh.roadTrainLightsOn !== false)} on={veh.roadTrainLightsOn !== false} onClick={click(() => { if (onToggleRoadTrainLights) onToggleRoadTrainLights(); else veh.roadTrainLightsOn = !veh.roadTrainLightsOn; })} />
                </>
              )}

              {isEmergency && (
                <>
                  <Sl k="B">Спецсигнал</Sl>
                  <Tile Icon={Siren} cls="row" label={veh.sirenOn ? 'Сирена активна' : 'Сирена / маяк'} on={!!veh.sirenOn} onClick={click(onToggleSiren)} />
                </>
              )}

              {veh.hasGBO && veh.fuelSystem && (
                <>
                  <Sl>ГБО (пропан)</Sl>
                  <Tile Icon={Zap} cls="row" label={veh.fuelSystem.gboActive !== false ? 'Газ' : 'Бензин'} on={veh.fuelSystem.gboActive !== false} onClick={click(() => { veh.fuelSystem!.gboActive = !veh.fuelSystem!.gboActive; })} />
                  <div className="note">Запас газа: {Math.round(veh.fuelSystem.gboLevel ?? 0)}%</div>
                </>
              )}

              {(veh.type === 'truck_water' || veh.type === 'fire_engine') && (
                <>
                  <Sl>КОМ / водонасос</Sl>
                  <Tile Icon={Gauge} cls="row" label="Насос" st={sfx(!!veh.isPtoActive)} on={!!veh.isPtoActive} onClick={click(() => { veh.isPtoActive = !veh.isPtoActive; })} />
                </>
              )}

              {veh.fluidTank && veh.fluidTank.capacity > 0 && (
                <>
                  <Sl>Слив {getLiquidNameRu(veh.fluidTank.liquidType)}</Sl>
                  <Tile Icon={Droplet} cls="row" label={veh.fluidTank.drainValveOpen ? 'Кран открыт' : 'Кран закрыт'} on={!!veh.fluidTank.drainValveOpen} onClick={click(() => { veh.fluidTank!.drainValveOpen = !veh.fluidTank!.drainValveOpen; })} />
                  <div className="note">Объём: {Math.round(veh.fluidTank.currentVolume ?? (veh.fluidTank as { currentAmount?: number }).currentAmount ?? 0)} / {veh.fluidTank.capacity} л</div>
                </>
              )}

              <div className="note" style={{ marginTop: 18 }}>Клавиши J, L, U, Y, X, Z, C, K, O, V, B, H работают и без этого меню</div>
            </Panel>
          )}
          {panel === 'board' && !veh && (
            <Panel key="board0" title="Приборка" sub="Нет автомобиля" HeaderIcon={Gauge} onClose={() => setPanel(null)}>
              <div className="note" style={{ marginTop: 24 }}>Сядьте в автомобиль, чтобы управлять бортовыми системами</div>
            </Panel>
          )}

          {/* ================= PANEL: АВТО ================= */}
          {panel === 'config' && veh && (
            <Configurator
              key={veh.id}
              veh={veh}
              onClose={() => setPanel(null)}
              onApply={(cfg) => { onApplyVehicleConfig(cfg); sound.playButtonPress(); setPanel(null); }}
            />
          )}
          {panel === 'config' && !veh && (
            <Panel key="config0" title="Авто · Конфигуратор" sub="Нет автомобиля" HeaderIcon={Palette} onClose={() => setPanel(null)}>
              <div className="note" style={{ marginTop: 24 }}>Сядьте в автомобиль, чтобы изменить его конфигурацию</div>
            </Panel>
          )}

          {/* ================= PANEL: ОКРУЖЕНИЕ ================= */}
          {panel === 'world' && (
            <Panel key="world" title="Окружение" sub="Погода и время суток мира" HeaderIcon={CloudSun} onClose={() => setPanel(null)}>
              <Sl>Время суток</Sl>
              <div className="trow">
                <span className="cn tm">{formatGameTime(hour)}</span>
                <Tile Icon={ChevronLeft} cls="sq" onClick={click(() => onSetTime(((hour - 1) % 24 + 24) % 24))} />
                <Tile Icon={Pause} cls="row sm" label="Пауза" on={!isTimeAutoCycling} onClick={click(onToggleTimeAuto)} />
                <Tile Icon={ChevronRight} cls="sq" onClick={click(() => onSetTime((hour + 1) % 24))} />
              </div>
              <div style={{ marginTop: 16 }}>
                <Sld label="Время суток" value={minutes} min={0} max={1439} step={15} onChange={(v) => onSetTime(v / 60)} />
              </div>
              <div className="grid4" style={{ marginTop: 16 }}>
                {TIME_PRESETS.map(({ label, hour: h, Icon }) => {
                  const ph = minutes >= 300 && minutes < 480 ? 6 : minutes >= 480 && minutes < 1020 ? 12 : minutes >= 1020 && minutes < 1260 ? 19 : 0;
                  return <Tile key={label} Icon={Icon} label={label} on={ph === h} onClick={click(() => onSetTime(h))} />;
                })}
              </div>

              <Sl>Погода</Sl>
              <div className="grid4">
                {WEATHER.map(({ id, label, Icon }) => (
                  <Tile key={id} Icon={Icon} label={label} on={weather === id} onClick={click(() => onSetWeather(id))} />
                ))}
              </div>
              <div className="note" style={{ marginTop: 14 }}>Переход погоды плавный, около 16 секунд</div>
            </Panel>
          )}

          {/* ================= PANEL: ТРАФИК ================= */}
          {panel === 'traffic' && (
            <Panel key="traffic" title="Трафик" sub="Управление движением города" HeaderIcon={TrafficCone} onClose={() => setPanel(null)}>
              <Sl>Симуляция движения</Sl>
              <div className="set" style={{ borderTop: 0, paddingTop: 4 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Трафик на карте</div>
                  <div className="mut" style={{ fontSize: 13 }}>{isTrafficEnabled ? `${tVehicles.length} машин · ${tPeds} пешеходов на карте` : 'Выключен'}</div>
                </div>
                <Tg on={isTrafficEnabled} label="Трафик" onClick={click(() => onSetTrafficEnabled(!isTrafficEnabled))} />
              </div>
              <div className="note" style={{ margin: '0 0 4px', textAlign: 'left' }}>{isTrafficEnabled ? 'AI-машины и пешеходы едут по городу' : 'Весь трафик остановлен и заморожен'}</div>

              <div className={isTrafficEnabled ? '' : 'dim'}>
                <Sl>Количество машин</Sl>
                <div className="bl"><span>Машин рядом</span><b className="cn">{performanceConfig.nearbyVehiclesTarget}</b></div>
                <Sld label="Машин рядом" value={performanceConfig.nearbyVehiclesTarget} min={0} max={24} onChange={(v) => setTraffic('nearbyVehiclesTarget', v)} />
                <div style={{ marginTop: 14 }}>
                  <Seg options={([[5, 'Мало'], [10, 'Обычно'], [18, 'Много']] as [number, string][]).map(([v, l]) => ({ label: l, on: performanceConfig.nearbyVehiclesTarget === v, onPick: click(() => setTraffic('nearbyVehiclesTarget', v)) }))} />
                </div>

                <Sl>Количество людей</Sl>
                <div className="bl"><span>Пешеходов</span><b className="cn">{performanceConfig.maxActivePedestrians}</b></div>
                <Sld label="Пешеходов" value={performanceConfig.maxActivePedestrians} min={0} max={200} step={5} onChange={(v) => setTraffic('maxActivePedestrians', v)} />
                <div style={{ marginTop: 14 }}>
                  <Seg options={([[25, 'Пусто'], [90, 'Обычно'], [180, 'Много']] as [number, string][]).map(([v, l]) => ({ label: l, on: performanceConfig.maxActivePedestrians === v, onPick: click(() => setTraffic('maxActivePedestrians', v)) }))} />
                </div>

                <Sl>Респавн</Sl>
                <Tile Icon={RefreshCw} cls="row" label="Респавн заторевших машин" onClick={click(() => { respawnStalledVehicles(world, { x: player.x, y: player.y }); })} />
                <div className="note">Застрявшие дольше 6 секунд машины переставляются ближе к вам</div>
              </div>
            </Panel>
          )}

          <div className="hint">
            <div style={{ display: 'flex', alignItems: 'center' }}><span className="key">1–6</span>Выбрать<span className="key">←→</span>Сектор<span className="key">Enter</span>Открыть<span className="key">Esc</span>Закрыть</div>
            <div>Меню — кнопка в HUD</div>
          </div>
        </div>
      </div>
      <div id="rot"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#e0ab45" strokeWidth="1.6"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></svg><span>Поверните устройство горизонтально</span></div>
    </ShadowHost>
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
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ paint: true, pt: false, eng: false, trn: false, turbo: false, tune: false, tir: false });
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

  const initial = useRef({ colorIdx, engId, trnId, tuneId, tirId, tboId });
  const reset = () => {
    const i = initial.current;
    setColorIdx(i.colorIdx); setEngId(i.engId); setTrnId(i.trnId); setTuneId(i.tuneId); setTirId(i.tirId); setTboId(i.tboId);
  };

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
  const name = entry ? entry.nameRu : (veh.nameRu || veh.type);

  const foot = isTrailerLike ? null : (
    <>
      <div className="row2">
        <button type="button" className="btn btn-s" onClick={reset}><RotateCcw width={16} height={16} />Сбросить</button>
        <button type="button" className="btn btn-p" style={{ flex: 1 }} onClick={apply}><Check width={18} height={18} strokeWidth={3} />Применить конфигурацию</button>
      </div>
      <div className="note" style={{ marginTop: 8 }}>Сборка устанавливается на борт сразу</div>
    </>
  );

  return (
    <Panel title="Авто · Конфигуратор" sub={name} HeaderIcon={Palette} onClose={onClose} fl foot={foot}>
      {isTrailerLike ? (
        <div className="note" style={{ marginTop: 24 }}>Прицеп не имеет силовой части</div>
      ) : (
        <>
          <div className="cth" style={{ height: 118, borderRadius: 9, flex: 'none', marginTop: 12 }}>
            <VehiclePreviewCanvas carType={veh.type} color={previewColor} roofColor={selColor?.roofHex || undefined} width={220} height={118} showPedestal={false} />
          </div>
          <div style={{ padding: '12px 4px 0' }}>
            <div className="cn" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
            <div className="mut" style={{ fontSize: 13, marginTop: 3 }}>
              {selColor ? selColor.name : 'Текущая окраска'} · {pickedEng ? FUEL_LABEL[pickedEng.fuel] || pickedEng.fuel : 'заводской мотор'} · {pickedTrn ? pickedTrn.nameRu.split(' ')[0] : 'заводская КПП'}
              {entry ? ` · ${entry.powerHp} л.с.` : ''}
            </div>
          </div>

          <div className="tree">
            <Node id="paint" n="Окраска" v={selColor ? selColor.name : 'Текущая'} openIds={openIds} toggle={toggle}>
              {colorList.length > 0 ? (
                <div className="lf">
                  <div className="lbl">Цвет</div>
                  <div className="sw">
                    {colorList.map((cl, i) => (
                      <button key={cl.hex + i} type="button" className={colorIdx === i ? 'on' : ''} title={cl.name} aria-label={cl.name} style={{ background: cl.hex }} onClick={() => setColorIdx(i)} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="lf mut" style={{ fontSize: 13 }}>У этого борта нет заводской палитры</div>
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
                  <div className="lf mut" style={{ fontSize: 13 }}>Штатный наддув двигателя, замена недоступна</div>
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
        </>
      )}
    </Panel>
  );
};

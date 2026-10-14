import React, { useRef } from 'react';
import {
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Cloud,
  CloudSun,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
  Wind,
  MapPin,
  Wrench,
  Heart,
  Sparkles,
  Radio,
  Users,
  Volume2,
  VolumeX,
  Smartphone,
  Sliders,
  Clock
} from 'lucide-react';
import { WeatherType } from '../types';
import { GameCalendarState, formatGameDate, formatGameTime, getRussianSeasonName } from '../calendarSystem';

export interface GameHudMenuProps {
  calendar: GameCalendarState;
  timeHour: number;
  weather: WeatherType;
  isTimeAutoCycling: boolean;
  isMuted: boolean;
  isCreativeMode: boolean;
  onlineStatus: string;
  onlinePlayerCount: number;
  userLabel: string;
  isMobileTouch: boolean;
  touchUiScale: number;
  onSetTime: (hour: number) => void;
  onStepDay: (delta: number) => void;
  onOpenCalendar: () => void;
  onSetWeather: (w: WeatherType) => void;
  onToggleTimeAuto: () => void;
  onToggleMute: () => void;
  onOpenOnline: () => void;
  onOpenProfile: () => void;
  onOpenSpawn: () => void;
  onRepairAll: () => void;
  onHealSelf: () => void;
  onToggleCreative: () => void;
  onToggleTouch: () => void;
  onCycleTouchScale: () => void;
  onClose: () => void;
}

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

const PRESETS: { label: string; hour: number; Icon: React.ComponentType<{ className?: string }> }[] = [
  { label: 'Рассвет', hour: 6, Icon: Sunrise },
  { label: 'День', hour: 12, Icon: Sun },
  { label: 'Закат', hour: 19, Icon: Sunset },
  { label: 'Ночь', hour: 0, Icon: Moon }
];

const STEP = 1 / 12; // 5 minutes

/** Day scrubber: a draggable track painted like the sky over 24 hours. */
const DayScrubber: React.FC<{ hour: number; onChange: (h: number) => void }> = ({ hour, onChange }) => {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const pct = (((hour % 24) + 24) % 24) / 24 * 100;

  const apply = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const h = Math.min(24 - STEP, Math.round((t * 24) / STEP) * STEP);
    onChange(h);
  };

  return (
    <div className="hud-scrub">
      <div
        ref={ref}
        className="hud-scrub-track"
        role="slider"
        tabIndex={0}
        aria-label="Время суток"
        aria-valuemin={0}
        aria-valuemax={24}
        aria-valuenow={Math.round(hour * 10) / 10}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = true; apply(e.clientX); }}
        onPointerMove={e => { if (drag.current) apply(e.clientX); }}
        onPointerUp={() => { drag.current = false; }}
        onPointerCancel={() => { drag.current = false; }}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); onChange(hour - 0.25); }
          else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); onChange(hour + 0.25); }
        }}
      >
        <div className="hud-scrub-thumb" style={{ left: pct + '%' }} />
      </div>
      <div className="hud-scrub-ticks" aria-hidden="true">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
};

const Row: React.FC<{
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  on?: boolean;
  onClick: () => void;
}> = ({ Icon, label, value, on, onClick }) => (
  <button type="button" className={'hud-row' + (on ? ' on' : '')} onClick={onClick}>
    <Icon className="w-4 h-4 shrink-0" />
    <span className="hud-row-label">{label}</span>
    {value !== undefined && <span className="hud-row-val">{value}</span>}
  </button>
);

export const GameHudMenu: React.FC<GameHudMenuProps> = (p) => {
  const hour = ((p.timeHour % 24) + 24) % 24;

  return (
    <div id="hud-menu" className="hud-menu" onPointerDown={e => e.stopPropagation()}>
      <div className="hud-menu-head">
        <span className="hud-menu-title">Меню</span>
        <button type="button" className="hud-btn hud-sq hud-sm" onClick={p.onClose} aria-label="Закрыть меню">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ---------------- TIME ---------------- */}
      <div className="hud-sec">Время суток</div>
      <div className="hud-time">
        <div className="hud-time-big">{formatGameTime(hour)}</div>
        <div className="hud-time-side">
          <div className="hud-date">
            <button type="button" className="hud-btn hud-sq hud-sm" onClick={() => p.onStepDay(-1)} aria-label="Предыдущий день">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="hud-date-text">{formatGameDate(p.calendar, 'medium')}</span>
            <button type="button" className="hud-btn hud-sq hud-sm" onClick={() => p.onStepDay(1)} aria-label="Следующий день">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="hud-season">{getRussianSeasonName(p.calendar.season)}</div>
        </div>
      </div>

      <DayScrubber hour={hour} onChange={p.onSetTime} />

      <div className="hud-presets">
        {PRESETS.map(({ label, hour: h, Icon }) => (
          <button key={label} type="button" className="hud-btn hud-preset" onClick={() => p.onSetTime(h)}>
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="hud-split">
        <button type="button" className={'hud-btn hud-wide' + (p.isTimeAutoCycling ? ' on' : '')} aria-pressed={p.isTimeAutoCycling} onClick={p.onToggleTimeAuto}>
          <Clock className="w-4 h-4" />
          <span>Ход времени</span>
        </button>
        <button type="button" className="hud-btn hud-wide" onClick={p.onOpenCalendar}>
          <Calendar className="w-4 h-4" />
          <span>Календарь</span>
        </button>
      </div>

      {/* ---------------- WEATHER ---------------- */}
      <div className="hud-sec">Погода</div>
      <div className="hud-weather">
        {WEATHER.map(({ id, label, Icon }) => (
          <button key={id} type="button" className={'hud-btn hud-wx' + (p.weather === id ? ' on' : '')} onClick={() => p.onSetWeather(id)} aria-pressed={p.weather === id}>
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ---------------- WORLD ---------------- */}
      <div className="hud-sec">Мир</div>
      <div className="hud-list">
        <Row Icon={MapPin} label="Точка спавна" onClick={p.onOpenSpawn} />
        <Row Icon={Wrench} label="Починить всю технику" onClick={p.onRepairAll} />
        <Row Icon={Heart} label="Вылечить персонажа" onClick={p.onHealSelf} />
        <Row Icon={Sparkles} label="Режим творчества" value={p.isCreativeMode ? 'ВКЛ' : 'ВЫКЛ'} on={p.isCreativeMode} onClick={p.onToggleCreative} />
      </div>

      {/* ---------------- ONLINE & SOUND ---------------- */}
      <div className="hud-sec">Онлайн и звук</div>
      <div className="hud-list">
        <Row Icon={Radio} label="Онлайн" value={p.onlineStatus === 'connected' ? 'Игроков: ' + p.onlinePlayerCount : 'Не в сети'} on={p.onlineStatus === 'connected'} onClick={p.onOpenOnline} />
        <Row Icon={Users} label="Профиль" value={p.userLabel} onClick={p.onOpenProfile} />
        <Row Icon={p.isMuted ? VolumeX : Volume2} label="Звук" value={p.isMuted ? 'ВЫКЛ' : 'ВКЛ'} on={!p.isMuted} onClick={p.onToggleMute} />
      </div>

      {/* ---------------- TOUCH ---------------- */}
      <div className="hud-sec">Управление</div>
      <div className="hud-list">
        <Row Icon={Smartphone} label="Сенсорные кнопки" value={p.isMobileTouch ? 'ВКЛ' : 'ВЫКЛ'} on={p.isMobileTouch} onClick={p.onToggleTouch} />
        {p.isMobileTouch && (
          <Row Icon={Sliders} label="Размер кнопок" value={Math.round(p.touchUiScale * 100) + '%'} onClick={p.onCycleTouchScale} />
        )}
      </div>
    </div>
  );
};

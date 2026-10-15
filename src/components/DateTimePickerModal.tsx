import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Sun,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Cloud,
  Snowflake,
  Wind,
  Thermometer,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sunrise,
  Sunset,
  Moon,
  Leaf
} from 'lucide-react';
import { WeatherType } from '../types';
import {
  GameCalendarState,
  createInitialCalendarState,
  getDaysInMonth,
  getDayOfWeekNumber,
  getRussianSeasonName,
  getRussianWeatherDescription,
  calculateClimateAtmosphere,
  MONTH_NAMES_NOMINATIVE,
  isLeapYear
} from '../calendarSystem';
import { ModalShell, SkyScrubber, Toggle, Range } from './gameUi';

interface DateTimePickerModalProps {
  currentCalendar: GameCalendarState;
  currentWeather: WeatherType;
  isTimeAutoCycling: boolean;
  onApply: (year: number, month: number, day: number, hour: number, weather: WeatherType) => void;
  onToggleTimeAutoCycling: () => void;
  onClose: () => void;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtClock = (h: number) => `${Math.floor(h)}:${pad2(Math.floor((h % 1) * 60))}`;

const WEATHER_OPTIONS: { id: WeatherType; name: string; icon: React.ComponentType<{ width?: number; height?: number }>; desc: string }[] = [
  { id: 'clear', name: 'Ясно', icon: Sun, desc: 'Безоблачное небо' },
  { id: 'overcast', name: 'Пасмурно', icon: CloudSun, desc: 'Серый облачный покров' },
  { id: 'drizzle', name: 'Морось', icon: CloudDrizzle, desc: 'Сырой асфальт' },
  { id: 'rain', name: 'Дождь', icon: CloudRain, desc: 'Лужи на тракте' },
  { id: 'storm', name: 'Гроза', icon: CloudLightning, desc: 'Ливень и молнии' },
  { id: 'fog', name: 'Туман', icon: Cloud, desc: 'Низкая видимость' },
  { id: 'snow', name: 'Снег', icon: Snowflake, desc: 'Накат на дорогах' },
  { id: 'blizzard', name: 'Метель', icon: Wind, desc: 'Заносы и буран' }
];

const TIME_PRESETS = [
  { label: 'Рассвет', h: 6, Icon: Sunrise },
  { label: 'Полдень', h: 12, Icon: Sun },
  { label: 'Закат', h: 19, Icon: Sunset },
  { label: 'Ночь', h: 0, Icon: Moon }
];

const SCENARIOS: { name: string; info: string; y: number; m: number; d: number; h: number; w: WeatherType; Icon: React.ComponentType<{ width?: number; height?: number }> }[] = [
  { name: 'Зима', info: '15 янв, 12:00, снег', y: 2026, m: 1, d: 15, h: 12, w: 'snow', Icon: Snowflake },
  { name: 'Весна', info: '25 апр, 10:00, ясно', y: 2026, m: 4, d: 25, h: 10, w: 'clear', Icon: Leaf },
  { name: 'Лето', info: '15 июл, 14:00, ясно', y: 2026, m: 7, d: 15, h: 14, w: 'clear', Icon: Sun },
  { name: 'Осень', info: '8 окт, 10:00, дождь', y: 2026, m: 10, d: 8, h: 10, w: 'rain', Icon: CloudRain }
];

export const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({
  currentCalendar,
  currentWeather,
  isTimeAutoCycling,
  onApply,
  onToggleTimeAutoCycling,
  onClose
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(currentCalendar.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentCalendar.month);
  const [selectedDay, setSelectedDay] = useState<number>(currentCalendar.day);
  const [selectedHour, setSelectedHour] = useState<number>(Math.floor(currentCalendar.timeHour));
  const [selectedMinute, setSelectedMinute] = useState<number>(Math.floor((currentCalendar.timeHour % 1) * 60));
  const [selectedWeather, setSelectedWeather] = useState<WeatherType>(currentWeather);

  const maxDays = useMemo(() => getDaysInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const validatedDay = Math.min(selectedDay, maxDays);
  const timeDec = selectedHour + selectedMinute / 60.0;

  const previewCalendar = useMemo(
    () => createInitialCalendarState(selectedYear, selectedMonth, validatedDay, timeDec),
    [selectedYear, selectedMonth, validatedDay, timeDec]
  );
  const atmosphere = useMemo(() => calculateClimateAtmosphere(previewCalendar, selectedWeather), [previewCalendar, selectedWeather]);
  const firstDayOfWeek = useMemo(() => getDayOfWeekNumber(selectedYear, selectedMonth, 1), [selectedYear, selectedMonth]);

  const handleApply = () => {
    onApply(selectedYear, selectedMonth, validatedDay, timeDec, selectedWeather);
    onClose();
  };

  const setTimeFromHours = (h: number) => {
    const total = Math.round(h * 60);
    setSelectedHour(Math.floor(total / 60) % 24);
    setSelectedMinute(total % 60);
  };

  const applyPreset = (year: number, month: number, day: number, hour: number, weather: WeatherType) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedDay(day);
    setSelectedHour(hour);
    setSelectedMinute(0);
    setSelectedWeather(weather);
  };

  const reset = () => {
    const def = createInitialCalendarState(2026, 10, 8, 10.0);
    applyPreset(def.year, def.month, def.day, 10, 'clear');
  };

  const temp = atmosphere.temperature > 0 ? `+${atmosphere.temperature}` : `${atmosphere.temperature}`;

  return (
    <ModalShell
      id="calendar-modal"
      title="Календарь и климат"
      subtitle="Дата, время суток, сезон и погода"
      width={1040}
      tall
      onClose={onClose}
      footerHints={[['Esc', 'Закрыть']]}
      footerRight={
        <>
          <button type="button" className="gu-btn gu-btn-s" onClick={reset} title="Сбросить на 8 окт 2026, 10:00">
            <RotateCcw width={16} height={16} />Сброс
          </button>
          <button type="button" className="gu-btn gu-btn-s" onClick={onClose}>Отмена</button>
          <button type="button" className="gu-btn gu-btn-p" onClick={handleApply}>
            <Check width={18} height={18} strokeWidth={2.6} />Применить
          </button>
        </>
      }
    >
      <div className="gu-stagger">
        {/* preview */}
        <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ justifyContent: 'space-between', gap: 20 }}>
          <div className="gu-row2" style={{ gap: 22 }}>
            <div className="gu-num" style={{ fontSize: 64 }}>{pad2(selectedHour)}:{pad2(selectedMinute)}</div>
            <div>
              <div className="gu-cn" style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>
                {validatedDay} {MONTH_NAMES_NOMINATIVE[selectedMonth]} {selectedYear}
              </div>
              <div className="gu-row2 gu-wrap" style={{ gap: 10, marginTop: 8 }}>
                <span className="gu-pill on" style={{ height: 28, fontSize: 13 }}>{getRussianSeasonName(previewCalendar.season)}</span>
                <span className="gu-mut" style={{ fontSize: 14 }}>{getRussianWeatherDescription(selectedWeather, atmosphere.isFreezing)}</span>
              </div>
            </div>
          </div>
          <div className="gu-row2 gu-wrap" style={{ gap: 22 }}>
            <div className="gu-row2" style={{ gap: 8 }} title="Температура">
              <Thermometer width={18} height={18} color="#c9922b" />
              <span className="gu-num" style={{ fontSize: 28, color: '#fff' }}>{temp}°C</span>
            </div>
            <div className="gu-row2 gu-mut gu-hide-s" style={{ gap: 14, fontSize: 14 }}>
              <span className="gu-row2" style={{ gap: 6 }}><Sunrise width={17} height={17} color="#e0ab45" />{fmtClock(previewCalendar.sunriseHour)}</span>
              <span className="gu-row2" style={{ gap: 6 }}><Sunset width={17} height={17} color="#e0ab45" />{fmtClock(previewCalendar.sunsetHour)}</span>
            </div>
            <div className="gu-row2" style={{ gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }} className="gu-row2">
                {isTimeAutoCycling ? <Play width={14} height={14} color="#9ac985" /> : <Pause width={14} height={14} color="#a29e93" />}
                <span style={{ marginLeft: 8 }}>Ход времени</span>
              </span>
              <Toggle on={isTimeAutoCycling} onChange={onToggleTimeAutoCycling} label="Ход времени" />
            </div>
          </div>
        </div>

        {/* scenarios */}
        <div>
          <div className="gu-grp" style={{ marginBottom: 10 }}>Быстрые сценарии</div>
          <div className="gu-grid gu-g4">
            {SCENARIOS.map(s => (
              <button type="button" key={s.name} className="gu-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }} onClick={() => applyPreset(s.y, s.m, s.d, s.h, s.w)}>
                <span className="gu-ico"><s.Icon width={20} height={20} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="gu-card-t">{s.name}</div>
                  <div className="gu-card-d" style={{ marginTop: 2 }}>{s.info}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="gu-grid gu-g2" style={{ alignItems: 'start' }}>
          {/* date */}
          <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
              <span className="gu-grp"><Calendar width={15} height={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 8 }} />Дата</span>
              <span className="gu-mut" style={{ fontSize: 13 }}>{isLeapYear(selectedYear) ? 'Високосный год' : 'Обычный год'}</span>
            </div>

            <div className="gu-row2" style={{ gap: 6 }}>
              <button type="button" className="gu-btn gu-btn-s gu-btn-sm" onClick={() => setSelectedYear(y => Math.max(1900, y - 10))} title="На 10 лет назад">-10</button>
              <button type="button" className="gu-btn gu-btn-s gu-btn-sm gu-btn-sq" onClick={() => setSelectedYear(y => Math.max(1900, y - 1))} aria-label="Предыдущий год"><ChevronLeft width={18} height={18} /></button>
              <input
                type="number"
                min={1900}
                max={2100}
                className="gu-inp gu-center"
                style={{ height: 36, fontWeight: 700 }}
                value={selectedYear}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setSelectedYear(val);
                }}
              />
              <button type="button" className="gu-btn gu-btn-s gu-btn-sm gu-btn-sq" onClick={() => setSelectedYear(y => Math.min(2100, y + 1))} aria-label="Следующий год"><ChevronRight width={18} height={18} /></button>
              <button type="button" className="gu-btn gu-btn-s gu-btn-sm" onClick={() => setSelectedYear(y => Math.min(2100, y + 10))} title="На 10 лет вперед">+10</button>
            </div>

            <div className="gu-grid gu-g4" style={{ gap: 6 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <button
                  type="button"
                  key={m}
                  className={'gu-pill' + (selectedMonth === m ? ' on' : '')}
                  style={{ justifyContent: 'center', padding: '0 6px', fontSize: 13 }}
                  onClick={() => setSelectedMonth(m)}
                >
                  {MONTH_NAMES_NOMINATIVE[m]}
                </button>
              ))}
            </div>

            <div>
              <div className="gu-grid gu-g7" style={{ marginBottom: 4 }}>
                {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(d => <div className="gu-dow" key={d}>{d}</div>)}
              </div>
              <div className="gu-grid gu-g7">
                {Array.from({ length: firstDayOfWeek - 1 }).map((_, i) => <div key={'e' + i} />)}
                {Array.from({ length: maxDays }, (_, i) => i + 1).map(d => (
                  <button type="button" key={d} className={'gu-day' + (validatedDay === d ? ' on' : '')} style={{ textAlign: 'center' }} onClick={() => setSelectedDay(d)}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* time + weather */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="gu-grp">Время суток</div>
              <SkyScrubber hour={timeDec} onChange={setTimeFromHours} stepMinutes={5} />
              <div className="gu-pills">
                {TIME_PRESETS.map(p => (
                  <button type="button" key={p.label} className="gu-pill" onClick={() => { setSelectedHour(p.h); setSelectedMinute(0); }}>
                    <p.Icon width={15} height={15} />{p.label}
                  </button>
                ))}
              </div>
              <div>
                <div className="gu-row2" style={{ justifyContent: 'space-between' }}>
                  <span className="gu-lbl" style={{ marginBottom: 0 }}>Точная минута</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{pad2(selectedMinute)} мин</span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Range value={selectedMinute} min={0} max={59} step={1} onChange={setSelectedMinute} label="Минуты" />
                </div>
              </div>
            </div>

            <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="gu-grp">Погода</div>
              <div className="gu-grid gu-g2 gu-keep" style={{ gap: 8 }}>
                {WEATHER_OPTIONS.map(opt => {
                  const on = selectedWeather === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      className="gu-rw"
                      style={{
                        minHeight: 52, padding: '6px 12px', borderRadius: 10, gap: 10,
                        borderLeftColor: on ? '#c9922b' : 'transparent',
                        background: on ? 'rgba(201,146,43,.15)' : 'rgba(255,255,255,.04)',
                        borderBottom: 0
                      }}
                      onClick={() => setSelectedWeather(opt.id)}
                      aria-pressed={on}
                    >
                      <opt.icon width={20} height={20} />
                      <div style={{ minWidth: 0 }}>
                        <div className="gu-rw-t" style={{ fontSize: 15, color: on ? '#fff' : undefined }}>{opt.name}</div>
                        <div className="gu-rw-d" style={{ fontSize: 12 }}>{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

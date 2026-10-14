import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
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
  Sparkles
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

interface DateTimePickerModalProps {
  currentCalendar: GameCalendarState;
  currentWeather: WeatherType;
  isTimeAutoCycling: boolean;
  onApply: (year: number, month: number, day: number, hour: number, weather: WeatherType) => void;
  onToggleTimeAutoCycling: () => void;
  onClose: () => void;
}

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

  // Validate day on month or year change
  const maxDays = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const validatedDay = Math.min(selectedDay, maxDays);

  // Computed preview calendar & physical atmosphere
  const previewCalendar = useMemo(() => {
    const timeDec = selectedHour + selectedMinute / 60.0;
    return createInitialCalendarState(selectedYear, selectedMonth, validatedDay, timeDec);
  }, [selectedYear, selectedMonth, validatedDay, selectedHour, selectedMinute]);

  const atmosphere = useMemo(() => {
    return calculateClimateAtmosphere(previewCalendar, selectedWeather);
  }, [previewCalendar, selectedWeather]);

  // First day of month offset for calendar grid (1 = Mon .. 7 = Sun)
  const firstDayOfWeek = useMemo(() => {
    return getDayOfWeekNumber(selectedYear, selectedMonth, 1);
  }, [selectedYear, selectedMonth]);

  const handleApply = () => {
    const timeDec = selectedHour + selectedMinute / 60.0;
    onApply(selectedYear, selectedMonth, validatedDay, timeDec, selectedWeather);
    onClose();
  };

  const handleApplyPreset = (year: number, month: number, day: number, hour: number, weather: WeatherType) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedDay(day);
    setSelectedHour(hour);
    setSelectedMinute(0);
    setSelectedWeather(weather);
  };

  // Weather list definition with strictly Lucide icons
  const weatherOptions: { id: WeatherType; name: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: 'clear', name: 'Ясно', icon: Sun, desc: 'Безоблачное небо, высокая видимость' },
    { id: 'overcast', name: 'Пасмурно', icon: CloudSun, desc: 'Плотный серый покров облаков' },
    { id: 'drizzle', name: 'Морось', icon: CloudDrizzle, desc: 'Мелкая водяная взвесь, сырой асфальт' },
    { id: 'rain', name: 'Дождь', icon: CloudRain, desc: 'Умеренные осадки, лужи на тракте' },
    { id: 'storm', name: 'Гроза', icon: CloudLightning, desc: 'Ливень, раскаты грома и молнии' },
    { id: 'fog', name: 'Туман', icon: Cloud, desc: 'Низкая видимость, рассеянный свет' },
    { id: 'snow', name: 'Снег', icon: Snowflake, desc: 'Зимний снегопад, накат на дорогах' },
    { id: 'blizzard', name: 'Метель', icon: Wind, desc: 'Шквальный снежный буран и заносы' }
  ];

  return (
    <div
      id="calendar-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="calendar-modal-container"
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#111317]/95 border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] text-[#e9e6df] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <header className="px-5 py-3.5 bg-[#16181e] border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_12px_rgba(198,138,53,0.5)]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-wider uppercase font-sans text-white">
                  КАЛЕНДАРЬ И КЛИМАТ
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-[#c68a35]/15 border border-[#c68a35]/40 text-[#f0c264] text-[10px] font-mono font-bold tracking-widest uppercase">
                  SIMULATION TIME
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#8b929e] tracking-wider uppercase">
                Астрономический календарь, сезонный климат и точное время суток
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-mono text-[#8b929e]">
              <span>ЗАКРЫТЬ:</span>
              <kbd className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] font-bold border border-white/10">
                ESC
              </kbd>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#8b929e] hover:text-white transition-colors cursor-pointer"
              title="Закрыть [ESC]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          
          {/* Real-time Environment Preview Card */}
          <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center min-w-[68px]">
                <Clock className="w-4 h-4 text-[#c68a35] mb-0.5" />
                <span className="text-sm font-mono font-bold text-white tabular-nums">
                  {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}
                </span>
              </div>
              <div>
                <div className="text-sm font-bold uppercase tracking-wider text-white font-sans">
                  {validatedDay} {MONTH_NAMES_NOMINATIVE[selectedMonth]} {selectedYear} года
                </div>
                <div className="text-xs text-[#8b929e] flex items-center gap-2 mt-1 font-mono">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    previewCalendar.season === 'winter' ? 'bg-sky-950/60 text-sky-300 border border-sky-500/30' :
                    previewCalendar.season === 'spring' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' :
                    previewCalendar.season === 'summer' ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30' :
                    'bg-orange-950/60 text-orange-300 border border-orange-500/30'
                  }`}>
                    {getRussianSeasonName(previewCalendar.season)}
                  </span>
                  <span>·</span>
                  <span>{getRussianWeatherDescription(selectedWeather, atmosphere.isFreezing)}</span>
                </div>
              </div>
            </div>

            {/* Micro stats & Auto-Cycling Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <Thermometer className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-white text-sm">
                  {atmosphere.temperature > 0 ? `+${atmosphere.temperature}` : atmosphere.temperature}°C
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-[#8b929e]">
                <div className="flex items-center gap-1">
                  <Sunrise className="w-3.5 h-3.5 text-amber-400" />
                  <span>{Math.floor(previewCalendar.sunriseHour)}:{String(Math.floor((previewCalendar.sunriseHour % 1) * 60)).padStart(2, '0')}</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Sunset className="w-3.5 h-3.5 text-orange-400" />
                  <span>{Math.floor(previewCalendar.sunsetHour)}:{String(Math.floor((previewCalendar.sunsetHour % 1) * 60)).padStart(2, '0')}</span>
                </div>
              </div>

              {/* Time auto cycle toggle */}
              <button
                onClick={onToggleTimeAutoCycling}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  isTimeAutoCycling
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-[#8b929e]'
                }`}
              >
                {isTimeAutoCycling ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
                <span>{isTimeAutoCycling ? 'Ход: ВКЛ' : 'Ход: ПАУЗА'}</span>
              </button>
            </div>
          </div>

          {/* Time Scrubber (24 Hours) */}
          <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                Время суток (24 часа):
              </span>
              <div className="flex items-center gap-1">
                {[
                  { label: '06:00 Рассвет', h: 6, m: 0 },
                  { label: '12:00 Полдень', h: 12, m: 0 },
                  { label: '19:00 Закат', h: 19, m: 0 },
                  { label: '00:00 Ночь', h: 0, m: 0 }
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setSelectedHour(p.h); setSelectedMinute(p.m); }}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-mono text-[#e9e6df] rounded-lg transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Draggable sky track slider */}
            <div className="space-y-1.5">
              <div className="relative h-4 rounded-lg overflow-hidden border border-white/20 bg-gradient-to-r from-[#0b0f1a] via-[#1b2440] via-20% via-[#d9944f] via-28% via-[#7fb2e0] via-40% via-[#8ec3ee] via-55% via-[#e0a85a] via-72% via-[#7a4a5c] via-82% to-[#0b0f1a] p-0.5">
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={selectedHour}
                  onChange={e => setSelectedHour(parseInt(e.target.value, 10))}
                  className="w-full h-full opacity-0 cursor-pointer absolute inset-0 z-10"
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#c68a35] shadow-[0_2px_8px_rgba(0,0,0,0.6)] pointer-events-none transition-all"
                  style={{ left: `calc(${(selectedHour / 23) * 100}% - 8px)` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-[#8b929e]">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:59</span>
              </div>
            </div>
          </div>

          {/* Quick Seasonal Presets */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e] block">
              Быстрые климатические сценарии:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => handleApplyPreset(2026, 1, 15, 12, 'snow')}
                className="p-3 bg-[#141720] hover:bg-sky-950/40 border border-white/[0.08] hover:border-sky-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>Зима (Снег)</span>
                </div>
                <div className="text-[10px] font-mono text-[#8b929e]">15 янв · 12:00 · Мороз</div>
              </button>

              <button
                onClick={() => handleApplyPreset(2026, 4, 25, 10, 'clear')}
                className="p-3 bg-[#141720] hover:bg-emerald-950/40 border border-white/[0.08] hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Весна (Ясно)</span>
                </div>
                <div className="text-[10px] font-mono text-[#8b929e]">25 апр · 10:00 · Тепло</div>
              </button>

              <button
                onClick={() => handleApplyPreset(2026, 7, 15, 14, 'clear')}
                className="p-3 bg-[#141720] hover:bg-amber-950/40 border border-white/[0.08] hover:border-amber-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-[#f0c264] text-xs font-bold uppercase tracking-wider mb-0.5">
                  <Sun className="w-3.5 h-3.5" />
                  <span>Лето (Жара)</span>
                </div>
                <div className="text-[10px] font-mono text-[#8b929e]">15 июл · 14:00 · Солнце</div>
              </button>

              <button
                onClick={() => handleApplyPreset(2026, 10, 8, 10, 'rain')}
                className="p-3 bg-[#141720] hover:bg-orange-950/40 border border-white/[0.08] hover:border-orange-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                  <CloudRain className="w-3.5 h-3.5" />
                  <span>Осень (Дождь)</span>
                </div>
                <div className="text-[10px] font-mono text-[#8b929e]">8 окт · 10:00 · Ливень</div>
              </button>
            </div>
          </div>

          {/* Section: Year & Month Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Year Selector */}
            <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                <span className="flex items-center gap-1.5 text-white">
                  <Calendar className="w-3.5 h-3.5 text-[#c68a35]" />
                  Год симуляции:
                </span>
                <span className="text-[10px] text-[#8b929e]">
                  {isLeapYear(selectedYear) ? 'Високосный (366 дн)' : 'Обычный (365 дн)'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedYear(y => Math.max(1900, y - 10))}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-white rounded-lg cursor-pointer transition-colors"
                  title="На 10 лет назад"
                >
                  -10
                </button>
                <button
                  onClick={() => setSelectedYear(y => Math.max(1900, y - 1))}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg cursor-pointer transition-colors"
                  title="Предыдущий год"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <input
                  type="number"
                  min="1900"
                  max="2100"
                  value={selectedYear}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setSelectedYear(val);
                  }}
                  className="flex-1 py-1.5 px-2 bg-[#0d0e12] border border-white/15 focus:border-[#c68a35] rounded-lg text-center font-mono font-bold text-white text-sm focus:outline-none transition-colors"
                />

                <button
                  onClick={() => setSelectedYear(y => Math.min(2100, y + 1))}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg cursor-pointer transition-colors"
                  title="Следующий год"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedYear(y => Math.min(2100, y + 10))}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-white rounded-lg cursor-pointer transition-colors"
                  title="На 10 лет вперед"
                >
                  +10
                </button>
              </div>
            </div>

            {/* Steppers for precise Minute */}
            <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                <span className="flex items-center gap-1.5 text-white">
                  <Clock className="w-3.5 h-3.5 text-[#c68a35]" />
                  Точная минута:
                </span>
                <span className="text-[10px] text-[#f0c264]">
                  {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="59"
                  step="1"
                  value={selectedMinute}
                  onChange={e => setSelectedMinute(parseInt(e.target.value, 10))}
                  className="flex-1 accent-[#c68a35] cursor-pointer"
                />
                <span className="text-sm font-mono font-bold text-white min-w-[36px] text-right">
                  {String(selectedMinute).padStart(2, '0')} м
                </span>
              </div>
            </div>
          </div>

          {/* Month Selector Grid */}
          <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl space-y-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e] block">
              Выберите месяц:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                const isSelected = selectedMonth === m;

                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-center transition-all cursor-pointer border ${
                      isSelected 
                        ? 'bg-[#c68a35] text-black border-[#c68a35] shadow-[0_0_12px_rgba(198,138,53,0.35)]' 
                        : 'bg-white/5 hover:bg-white/10 border-white/[0.08] text-[#e9e6df]'
                    }`}
                  >
                    {MONTH_NAMES_NOMINATIVE[m]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Day Grid */}
          <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                Выберите день ({MONTH_NAMES_NOMINATIVE[selectedMonth]} {selectedYear}):
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedDay(d => Math.max(1, d - 1))}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-mono text-white font-bold cursor-pointer"
                >
                  -1 день
                </button>
                <button
                  onClick={() => setSelectedDay(d => Math.min(maxDays, d + 1))}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-mono text-white font-bold cursor-pointer"
                >
                  +1 день
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-[#8b929e] font-bold uppercase tracking-wider">
              {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(dayName => (
                <div key={dayName} className="py-1">{dayName}</div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty leading offset days */}
              {Array.from({ length: firstDayOfWeek - 1 }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-8 rounded opacity-0 pointer-events-none" />
              ))}

              {/* Day buttons */}
              {Array.from({ length: maxDays }, (_, i) => i + 1).map(d => {
                const isSelected = validatedDay === d;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    className={`h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center border ${
                      isSelected
                        ? 'bg-[#c68a35] text-black border-[#c68a35] shadow-[0_0_12px_rgba(198,138,53,0.4)] scale-105'
                        : 'bg-white/5 hover:bg-white/10 border-white/[0.08] text-[#e9e6df]'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weather Types (8 Variants) */}
          <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl space-y-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e] block">
              Тип погоды и осадки:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {weatherOptions.map(opt => {
                const IconComponent = opt.icon;
                const isSelected = selectedWeather === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedWeather(opt.id)}
                    className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#c68a35]/15 border-[#c68a35] text-white shadow-[0_0_15px_rgba(198,138,53,0.25)]'
                        : 'bg-white/5 hover:bg-white/10 border-white/[0.08] text-[#8b929e] hover:text-white'
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 shrink-0 ${isSelected ? 'text-[#f0c264]' : 'text-[#8b929e]'}`} />
                    <div className="overflow-hidden min-w-0">
                      <div className="text-xs font-bold uppercase tracking-wider text-white truncate font-sans">
                        {opt.name}
                      </div>
                      <div className="text-[10px] font-mono text-[#8b929e] truncate">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer with Reset & Apply */}
        <footer className="px-5 py-3.5 bg-[#16181e] border-t border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => {
              const def = createInitialCalendarState(2026, 10, 8, 10.0);
              setSelectedYear(def.year);
              setSelectedMonth(def.month);
              setSelectedDay(def.day);
              setSelectedHour(10);
              setSelectedMinute(0);
              setSelectedWeather('clear');
            }}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[#8b929e] hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Сбросить на исходную дату (8 окт 2026, 10:00)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сброс</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-[#c68a35] hover:bg-[#d99a41] active:scale-95 text-black text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-[0_0_20px_rgba(198,138,53,0.4)] transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Применить параметры</span>
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};

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
  Compass, 
  RotateCcw, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Play,
  Pause,
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
  DAY_OF_WEEK_SHORT,
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
  const weatherOptions: { id: WeatherType; name: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
    { id: 'clear', name: 'Ясно', icon: Sun, color: 'text-amber-400' },
    { id: 'overcast', name: 'Пасмурно', icon: CloudSun, color: 'text-slate-300' },
    { id: 'drizzle', name: 'Морось', icon: CloudDrizzle, color: 'text-cyan-400' },
    { id: 'rain', name: 'Дождь', icon: CloudRain, color: 'text-blue-400' },
    { id: 'storm', name: 'Гроза', icon: CloudLightning, color: 'text-purple-400' },
    { id: 'fog', name: 'Туман', icon: Cloud, color: 'text-zinc-400' },
    { id: 'snow', name: 'Снег', icon: Snowflake, color: 'text-sky-300' },
    { id: 'blizzard', name: 'Метель', icon: Wind, color: 'text-indigo-300' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
                Управление датой, временем и погодой
              </h2>
              <p className="text-xs text-slate-400">
                Астрономический календарь, любой год и симуляция климата
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Real-time Environment Preview Card */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-amber-400 flex flex-col items-center justify-center min-w-[56px]">
                <Clock className="w-4 h-4 mb-0.5" />
                <span className="text-xs font-mono font-bold text-white">
                  {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {validatedDay} {MONTH_NAMES_NOMINATIVE[selectedMonth]} {selectedYear} года
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className={`px-1.5 py-0.2 rounded font-semibold ${
                    previewCalendar.season === 'winter' ? 'bg-sky-950/60 text-sky-300 border border-sky-500/30' :
                    previewCalendar.season === 'spring' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' :
                    previewCalendar.season === 'summer' ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30' :
                    'bg-orange-950/60 text-orange-300 border border-orange-500/30'
                  }`}>
                    {getRussianSeasonName(previewCalendar.season)}
                  </span>
                  <span>{getRussianWeatherDescription(selectedWeather, atmosphere.isFreezing)}</span>
                </div>
              </div>
            </div>

            {/* Micro stats */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Thermometer className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-white">{atmosphere.temperature > 0 ? `+${atmosphere.temperature}` : atmosphere.temperature}°C</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span>Восход: {Math.floor(previewCalendar.sunriseHour)}:{String(Math.floor((previewCalendar.sunriseHour % 1) * 60)).padStart(2, '0')}</span>
                <span>•</span>
                <span>Закат: {Math.floor(previewCalendar.sunsetHour)}:{String(Math.floor((previewCalendar.sunsetHour % 1) * 60)).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Quick Presets (Seasons & Typical Scenarios) */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Быстрые сезонные пресеты:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleApplyPreset(2026, 1, 15, 12, 'snow')}
                className="p-2 bg-slate-950/40 hover:bg-sky-950/50 border border-slate-800 hover:border-sky-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold mb-0.5">
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>Зима (Снег)</span>
                </div>
                <div className="text-[10px] text-slate-400">15 янв • 12:00 • Мороз</div>
              </button>

              <button
                onClick={() => handleApplyPreset(2026, 4, 25, 10, 'clear')}
                className="p-2 bg-slate-950/40 hover:bg-emerald-950/50 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold mb-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Весна (Ясно)</span>
                </div>
                <div className="text-[10px] text-slate-400">25 апр • 10:00 • Тепло</div>
              </button>

              <button
                onClick={() => handleApplyPreset(2026, 7, 15, 14, 'clear')}
                className="p-2 bg-slate-950/40 hover:bg-amber-950/50 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-0.5">
                  <Sun className="w-3.5 h-3.5" />
                  <span>Лето (Жара)</span>
                </div>
                <div className="text-[10px] text-slate-400">15 июл • 14:00 • Солнце</div>
              </button>

              <button
                onClick={() => handleApplyPreset(2026, 10, 8, 10, 'rain')}
                className="p-2 bg-slate-950/40 hover:bg-orange-950/50 border border-slate-800 hover:border-orange-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold mb-0.5">
                  <CloudRain className="w-3.5 h-3.5" />
                  <span>Осень (Дождь)</span>
                </div>
                <div className="text-[10px] text-slate-400">8 окт • 10:00 • Ливень</div>
              </button>
            </div>
          </div>

          {/* Section 1: Year & Month Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Year Selector with Steppers */}
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Год симуляции
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {isLeapYear(selectedYear) ? 'Високосный (366 дн)' : 'Обычный (365 дн)'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedYear(y => Math.max(1900, y - 10))}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 rounded-lg cursor-pointer transition"
                  title="На 10 лет назад"
                >
                  -10
                </button>
                <button
                  onClick={() => setSelectedYear(y => Math.max(1900, y - 1))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition"
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
                  className="flex-1 py-1.5 px-2 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono font-bold text-white text-sm focus:outline-none focus:border-amber-500"
                />

                <button
                  onClick={() => setSelectedYear(y => Math.min(2100, y + 1))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition"
                  title="Следующий год"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedYear(y => Math.min(2100, y + 10))}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 rounded-lg cursor-pointer transition"
                  title="На 10 лет вперед"
                >
                  +10
                </button>
              </div>
            </div>

            {/* Time of Day Clock */}
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Время суток (ЧЧ:ММ)
                </span>
                <button
                  onClick={onToggleTimeAutoCycling}
                  className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition ${
                    isTimeAutoCycling ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}
                  title="Автоматический ход игрового времени"
                >
                  {isTimeAutoCycling ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5" />}
                  <span>{isTimeAutoCycling ? 'Ход времени: ВКЛ' : 'Ход времени: ПАУЗА'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg p-1 px-2">
                  <input
                    type="range"
                    min="0"
                    max="23"
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-amber-300 min-w-[24px] text-right">
                    {String(selectedHour).padStart(2, '0')}ч
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1 px-2">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={selectedMinute}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                      setSelectedMinute(v);
                    }}
                    className="w-10 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">м</span>
                </div>
              </div>

              {/* Time presets */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {[
                  { label: '06:00', h: 6, m: 0 },
                  { label: '12:00', h: 12, m: 0 },
                  { label: '18:00', h: 18, m: 0 },
                  { label: '23:00', h: 23, m: 0 }
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setSelectedHour(p.h); setSelectedMinute(p.m); }}
                    className="flex-1 py-1 bg-slate-800/80 hover:bg-slate-700 text-[10px] font-mono text-slate-300 rounded cursor-pointer transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Month Grid */}
          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Выберите месяц:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                const isWinter = m === 12 || m === 1 || m === 2;
                const isSpring = m >= 3 && m <= 5;
                const isSummer = m >= 6 && m <= 8;
                const isAutumn = m >= 9 && m <= 11;
                const isSelected = selectedMonth === m;

                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer border ${
                      isSelected 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20' 
                        : isWinter
                        ? 'bg-sky-950/30 hover:bg-sky-900/40 border-sky-500/20 text-sky-200'
                        : isSpring
                        ? 'bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/20 text-emerald-200'
                        : isSummer
                        ? 'bg-amber-950/30 hover:bg-amber-900/40 border-amber-500/20 text-amber-200'
                        : 'bg-orange-950/30 hover:bg-orange-900/40 border-orange-500/20 text-orange-200'
                    }`}
                  >
                    {MONTH_NAMES_NOMINATIVE[m]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Interactive Day Grid for selected Month */}
          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Выберите день ({MONTH_NAMES_NOMINATIVE[selectedMonth]} {selectedYear}):
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedDay(d => Math.max(1, d - 1))}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 font-bold cursor-pointer"
                >
                  -1 день
                </button>
                <button
                  onClick={() => setSelectedDay(d => Math.min(maxDays, d + 1))}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 font-bold cursor-pointer"
                >
                  +1 день
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-slate-500 font-bold">
              {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(dayName => (
                <div key={dayName} className="py-0.5">{dayName}</div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty leading offset days */}
              {Array.from({ length: firstDayOfWeek - 1 }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-7 rounded opacity-0 pointer-events-none" />
              ))}

              {/* Day buttons */}
              {Array.from({ length: maxDays }, (_, i) => i + 1).map(d => {
                const isSelected = validatedDay === d;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    className={`h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30 scale-105'
                        : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: All 8 Weather Types */}
          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Новые типы погоды и атмосферные явления:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {weatherOptions.map(opt => {
                const IconComponent = opt.icon;
                const isSelected = selectedWeather === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedWeather(opt.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${opt.color}`} />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold truncate">{opt.name}</div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider">{opt.id}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer with Apply button */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0 gap-3">
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
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            title="Сбросить на начальную дату (8 окт 2026, 10:00)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Сброс</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Применить дату и погоду</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Play, 
  Settings, 
  Save, 
  PlusCircle, 
  Trash2, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  HardDrive, 
  Compass, 
  Gamepad2, 
  Check, 
  ArrowLeft,
  Monitor,
  Clock,
  MousePointer,
  MapPin,
  Car,
  Shield,
  Info,
  Sparkles,
  TreePine,
  Building2,
  Home,
  Truck
} from 'lucide-react';

export interface SaveSlot {
  id: string;
  name: string;
  date: string;
  playerX: number;
  playerY: number;
  playerAngle?: number;
  isInVehicle: boolean;
  currentVehicleId: string | null;
  timeHour: number;
  weather: string;
  streetName: string;
  gpsDestination?: any;
  needs?: any;
  inventory?: any;
}

export interface SpawnLocation {
  id: string;
  name: string;
  nameRu: string;
  x: number;
  y: number;
  description: string;
  icon: React.ReactNode;
}

interface MainMenuProps {
  onResume: () => void;
  onNewGame: (saveName: string, spawnLocationId: string) => void;
  saves: SaveSlot[];
  onLoadSave: (id: string) => void;
  onDeleteSave: (id: string) => void;
  onCreateSave: (name?: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  settings: {
    fpsLimit: number;
    autoSaveInterval: number;
    timeAutoCycle: boolean;
    mouseSensitivity: number;
  };
  onUpdateSettings: (newSettings: any) => void;
  spawnLocations?: SpawnLocation[];
}

type MenuScreen = 'main' | 'saves' | 'new_game' | 'settings' | 'about';
type SettingsTab = 'graphics' | 'audio' | 'gameplay' | 'controls';

const DEFAULT_SPAWNS: SpawnLocation[] = [
  {
    id: 'central_park',
    name: 'Central Park Promenade',
    nameRu: 'Центральный Парк (Фонтан & Сквер)',
    x: 4400,
    y: 2800,
    description: 'Парковый фонтан, пешеходные аллеи, грузовики и прогулочные зоны',
    icon: <TreePine className="w-5 h-5 text-emerald-400" />
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Центр Города (Парковка & Небоскребы)',
    x: 4350,
    y: 2000,
    description: 'Оживленный перекрёсток проспектов, деловой центр и автопарковка',
    icon: <Building2 className="w-5 h-5 text-sky-400" />
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Двор (Многоэтажки & Парковка)',
    x: 2750,
    y: 2750,
    description: 'Уютный спальный район, подъезды зданий и дворовые проезды',
    icon: <Home className="w-5 h-5 text-amber-400" />
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Yard',
    nameRu: 'Промзона (Грузовая база & Склады)',
    x: 5200,
    y: 4400,
    description: 'Логистический хаб, ангары, склады и стоянка спецтранспорта',
    icon: <Truck className="w-5 h-5 text-stone-400" />
  }
];

export const MainMenu: React.FC<MainMenuProps> = ({ 
  onResume, 
  onNewGame, 
  saves, 
  onLoadSave, 
  onDeleteSave, 
  isMuted,
  onToggleMute,
  settings,
  onUpdateSettings,
  spawnLocations = DEFAULT_SPAWNS
}) => {
  const [screen, setScreen] = useState<MenuScreen>('main');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('graphics');
  const [newGameName, setNewGameName] = useState<string>('Водитель #1');
  const [selectedSpawnId, setSelectedSpawnId] = useState<string>(spawnLocations[0]?.id || 'central_park');

  const hasSaves = saves.length > 0;
  const latestSave = hasSaves ? saves[0] : null;

  const handleStartNewGameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = newGameName.trim() || 'Новая сессия';
    onNewGame(finalName, selectedSpawnId);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#070b14]/95 backdrop-blur-xl text-slate-100 font-sans select-none animate-in fade-in duration-300">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[300px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Container Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#0f1523]/95 border border-slate-800/80 rounded-3xl shadow-2xl flex flex-col p-8 md:p-10 transition-all overflow-hidden">
        
        {/* Top Header Badge & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-900/90 border border-slate-700/60 rounded-full text-slate-300 text-xs font-bold tracking-widest uppercase mb-3 shadow-inner">
            <Compass className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Открытый мир • Автомобильная физика • Выживание
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
            METROPOLIS <span className="text-emerald-400">2D</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Реалистичный симулятор городской жизни, логистики и вождения в бесшовном открытом мегаполисе.
          </p>
        </div>

        {/* SCREEN: MAIN MENU */}
        {screen === 'main' && (
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
            
            {/* Quick Resume Button if saves exist */}
            {hasSaves && latestSave && (
              <button
                onClick={() => onLoadSave(latestSave.id)}
                className="group relative flex items-center justify-between p-5 bg-gradient-to-r from-emerald-950/60 to-slate-900 hover:from-emerald-900/70 hover:to-slate-850 border border-emerald-500/40 hover:border-emerald-400/70 rounded-2xl transition-all active:scale-[0.99] cursor-pointer shadow-xl shadow-emerald-950/20"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-emerald-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Продолжить сессию</div>
                    <div className="text-base font-extrabold text-white mt-0.5">{latestSave.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{latestSave.date}</span>
                      <span>•</span>
                      <span>{latestSave.isInVehicle ? '🚗 В авто' : '🚶 Пешком'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300">Быстрый запуск</span>
                  <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )}

            {/* New Game Button */}
            <button
              onClick={() => setScreen('new_game')}
              className="group flex items-center justify-between p-4.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all active:scale-[0.99] cursor-pointer shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 group-hover:scale-110 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-base font-extrabold text-white">Новая игра</div>
                  <div className="text-xs text-slate-400">Выбор точки спавна и создание новой сессии</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </button>

            {/* Saves Manager Button */}
            <button
              onClick={() => setScreen('saves')}
              className="group flex items-center justify-between p-4.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all active:scale-[0.99] cursor-pointer shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-base font-extrabold text-white">Сохранения ({saves.length})</div>
                  <div className="text-xs text-slate-400">Управление слотами и архивом сессий</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setScreen('settings')}
              className="group flex items-center justify-between p-4.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all active:scale-[0.99] cursor-pointer shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-base font-extrabold text-white">Настройки</div>
                  <div className="text-xs text-slate-400">Графика, звук, управление и игровой мир</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </button>

            {/* About / Info Button */}
            <button
              onClick={() => setScreen('about')}
              className="group flex items-center justify-between p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 rounded-2xl transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
                  <Info className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-300">Об игре и возможностях</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </button>

          </div>
        )}

        {/* SCREEN: SAVES LIST */}
        {screen === 'saves' && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-150">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => setScreen('main')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Назад в меню
              </button>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                Сохраненные сессии ({saves.length})
              </h2>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[310px] overflow-y-auto pr-1">
              {saves.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs italic bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6">
                  Нет сохраненных сессий. Нажмите «Новая игра», чтобы начать исследование мегаполиса.
                </div>
              ) : (
                saves.map((save) => (
                  <div 
                    key={save.id}
                    className="group bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <div className="font-extrabold text-sm text-white truncate flex items-center gap-2">
                        <span>{save.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">ID: {save.id.slice(-6)}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-sky-400" /> {save.date}
                        </span>
                        <span>•</span>
                        <span className="text-slate-300">{save.isInVehicle ? '🚗 В транспорте' : '🚶 Пешком'}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-mono">⏱️ {save.timeHour?.toFixed(1) || '10.0'}ч</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onLoadSave(save.id)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" /> Загрузить
                      </button>

                      <button
                        onClick={() => onDeleteSave(save.id)}
                        className="p-2.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer"
                        title="Удалить сохранение"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SCREEN: NEW GAME SETUP & SPAWN SELECTION */}
        {screen === 'new_game' && (
          <form onSubmit={handleStartNewGameSubmit} className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-150">
            <div className="flex items-center justify-between mb-1">
              <button
                type="button"
                onClick={() => setScreen('main')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Назад в меню
              </button>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                Новая игра и выбор спавна
              </h2>
            </div>

            <div className="space-y-4 max-h-[330px] overflow-y-auto pr-1">
              {/* Driver Name Input */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Имя водителя / Персонажа
                </label>
                <input
                  type="text"
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  maxLength={32}
                  required
                  placeholder="Введите имя..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Spawn Location Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Точка появления в городе
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {spawnLocations.map((loc) => {
                    const isSelected = selectedSpawnId === loc.id;
                    return (
                      <div
                        key={loc.id}
                        onClick={() => setSelectedSpawnId(loc.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/10' 
                            : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                            {loc.icon}
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-xs">
                              ✓
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-white">{loc.nameRu}</div>
                          <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{loc.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" /> Запустить симуляцию
            </button>
          </form>
        )}

        {/* SCREEN: SETTINGS */}
        {screen === 'settings' && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-150">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => setScreen('main')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Назад в меню
              </button>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                Настройки симулятора
              </h2>
            </div>

            {/* Settings Tabs */}
            <div className="grid grid-cols-4 gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
              {[
                { id: 'graphics', label: 'Графика', icon: Monitor },
                { id: 'audio', label: 'Звук', icon: Volume2 },
                { id: 'gameplay', label: 'Игровой мир', icon: Clock },
                { id: 'controls', label: 'Управление', icon: Gamepad2 },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = settingsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id as SettingsTab)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[10px] truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 min-h-[220px] max-h-[260px] overflow-y-auto space-y-4">
              
              {settingsTab === 'graphics' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">Ограничение FPS</div>
                      <div className="text-[10px] text-slate-500">Частота обновления кадров рендеринга</div>
                    </div>
                    <div className="flex gap-1.5">
                      {[60, 120, 0].map((limit) => (
                        <button
                          key={limit}
                          onClick={() => onUpdateSettings({ ...settings, fpsLimit: limit })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            settings.fpsLimit === limit 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          {limit === 0 ? 'Без лимита' : `${limit} FPS`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'audio' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">Глобальный звук</div>
                      <div className="text-[10px] text-slate-500">Моторы, сирены, окружение и интерфейс</div>
                    </div>
                    <button
                      onClick={onToggleMute}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                        isMuted 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                          : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                      }`}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span>{isMuted ? 'Звук выключен' : 'Звук включен'}</span>
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'gameplay' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">Автосохранение</div>
                      <div className="text-[10px] text-slate-500">Интервал автоматической записи прогресса</div>
                    </div>
                    <div className="flex gap-1.5">
                      {[
                        { val: 25, label: '25с' },
                        { val: 60, label: '1 мин' },
                        { val: 0, label: 'Выкл' }
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          onClick={() => onUpdateSettings({ ...settings, autoSaveInterval: opt.val })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            settings.autoSaveInterval === opt.val 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <div>
                      <div className="text-xs font-bold text-slate-200">Динамическое время суток</div>
                      <div className="text-[10px] text-slate-500">Автоматическая смена дня и ночи</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ ...settings, timeAutoCycle: !settings.timeAutoCycle })}
                      className={`w-12 h-6 rounded-full p-1 transition-all cursor-pointer ${
                        settings.timeAutoCycle ? 'bg-emerald-600 flex justify-end' : 'bg-slate-900 border border-slate-800 flex justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow" />
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'controls' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-slate-200 mb-2">Чувствительность мыши</div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={settings.mouseSensitivity}
                        onChange={(e) => onUpdateSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) })}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">{settings.mouseSensitivity.toFixed(1)}x</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 bg-slate-900/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
                    💡 Управление автомобилем: <code className="text-emerald-400">WASD / Стрелки</code>, Ручник: <code className="text-emerald-400">Пробел</code>, Фары: <code className="text-emerald-400">L</code>, Поворотники: <code className="text-emerald-400">Q/E</code>, Инвентарь: <code className="text-emerald-400">I</code>, Пауза: <code className="text-emerald-400">ESC</code>.
                  </div>
                </div>
              )}

            </div>

            <button
              onClick={() => setScreen('main')}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Сохранить и вернуться
            </button>
          </div>
        )}

        {/* SCREEN: ABOUT */}
        {screen === 'about' && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-150">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => setScreen('main')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Назад в меню
              </button>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                О симуляторе
              </h2>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 max-h-[280px] overflow-y-auto space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong className="text-white">Metropolis 2D</strong> — продвинутый градостроительный симулятор с физикой колесного транспорта, интеллектуальным трафиком ИИ, многоэтажными интерьерами зданий и системой выживания.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="font-bold text-emerald-400 mb-0.5">🚗 Физика Авто</div>
                  <div className="text-[11px] text-slate-400">Реалистичный занос, сцепление с дорогой, износ деталей, фары и топливная система.</div>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="font-bold text-sky-400 mb-0.5">❤️ Выживание</div>
                  <div className="text-[11px] text-slate-400">Показатели здоровья, голода, жажды, утомления, медицинская система лечения травм.</div>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="font-bold text-amber-400 mb-0.5">🏢 Интерьеры</div>
                  <div className="text-[11px] text-slate-400">Возможность заходить внутрь зданий, магазинов, больниц и подниматься на лифтах.</div>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="font-bold text-purple-400 mb-0.5">📦 Инвентарь</div>
                  <div className="text-[11px] text-slate-400">Интерактивный рюкзак, еда, медикаменты, инструменты и торговые точки 24/7.</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setScreen('main')}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Понятно
            </button>
          </div>
        )}

        {/* Footer version */}
        <div className="mt-6 text-center text-[10px] text-slate-500 border-t border-slate-800/80 pt-4 flex items-center justify-between">
          <span>Metropolis 2D Simulator</span>
          <span className="font-mono text-emerald-500">Stable v1.4</span>
        </div>

      </div>

    </div>
  );
};

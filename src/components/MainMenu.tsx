import React, { useState } from 'react';
import { hasCustomSavedMap, clearCustomMapStorage } from '../loadMap';
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
  Truck,
  Globe,
  Radio,
  User,
  Map,
  Navigation,
  Briefcase,
  Activity,
  Heart,
  Zap,
  Power,
  Wrench
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
  onOpenOnline?: () => void;
  onOpenProfile?: () => void;
}

type MenuScreen = 'main' | 'saves' | 'new_game' | 'settings' | 'about';
type SettingsTab = 'graphics' | 'audio' | 'gameplay' | 'controls';

const DEFAULT_SPAWNS: SpawnLocation[] = [
  {
    id: 'central_park',
    name: 'Central Park Promenade',
    nameRu: 'Городской Сквер (Фонтан & Сквер)',
    x: 4400,
    y: 2800,
    description: 'Парковый фонтан, аллеи со скамейками, гуляющие горожане и тихие проезды.',
    icon: <TreePine className="w-5 h-5 text-emerald-500" />
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Площадь Администрации (Центр)',
    x: 4350,
    y: 2000,
    description: 'Официальный центр города, парковка перед госучреждениями и проспекты.',
    icon: <Building2 className="w-5 h-5 text-slate-500" />
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Двор (Хрущёвки & Гаражи)',
    x: 2750,
    y: 2750,
    description: 'Панельные пятиэтажки, детская площадка из детства, гаражные боксы и берёзы.',
    icon: <Home className="w-5 h-5 text-amber-600" />
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Yard',
    nameRu: 'Промзона (Автобаза №4 & Склады)',
    x: 6530,
    y: 1030,
    description: 'Грузовые ангары, авторемонтные ямы, стоянка спецтехники и плиты перекрытий.',
    icon: <Truck className="w-5 h-5 text-stone-500" />
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
  spawnLocations = DEFAULT_SPAWNS,
  onOpenOnline,
  onOpenProfile
}) => {
  const [screen, setScreen] = useState<MenuScreen>('main');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('graphics');
  const [newGameName, setNewGameName] = useState<string>('Водитель #1');
  const [selectedSpawnId, setSelectedSpawnId] = useState<string>(spawnLocations[0]?.id || 'central_park');
  const [hoveredOption, setHoveredOption] = useState<string>('resume');

  const hasSaves = saves.length > 0;
  const latestSave = hasSaves ? saves[0] : null;

  const handleStartNewGameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = newGameName.trim() || 'Новая сессия';
    onNewGame(finalName, selectedSpawnId);
  };

  // Safe helper to grab spawn descriptions for preview
  const getSpawnDetails = (id: string) => {
    const s = spawnLocations.find(l => l.id === id);
    if (!s) return { title: 'Неизвестный пункт', desc: '' };
    
    // Cozy CIS-themed flavor text
    let flavor = '';
    if (id === 'central_park') {
      flavor = 'Старый городской сквер с неработающим по осени фонтаном, чугунные решётки забора и укатанный асфальт прогулочных зон. Здесь спокойно и пахнет влажными листьями.';
    } else if (id === 'downtown_plaza') {
      flavor = 'Площадь перед Домом Культуры и местной администрацией. Редкие ели у фасада, серый бетонный плац, припаркованные дежурные машины и широкие проспекты.';
    } else if (id === 'residential_courtyard') {
      flavor = 'Классический спальный район с хрущёвками. Металлические сушилки для белья, покосившиеся турники во дворе, вековые тополя и железные гаражи у забора.';
    } else if (id === 'industrial_district') {
      flavor = 'Автобаза на окраине города. Запах отработанного масла, бетонный забор с колючей проволокой, массивные ремонтные ангары и тяжёлый грузовой спецтранспорт.';
    } else if (id === 'steppe_village') {
      flavor = 'Глухая деревня Полыновка. Деревянные избы с печным отоплением, заброшенный сельский клуб, колодец-журавль у дороги и бескрайнее поле сухой полыни.';
    } else if (id === 'pine_forest') {
      flavor = 'Песчаные лесные дороги заповедника. Сосновый бор, вечно зелёные кроны, глухое лесное озерцо и ухабы, идеальные для старого внедорожника.';
    } else if (id === 'car_dealership_loc') {
      flavor = 'Региональный дилерский центр «Автоэкспорт». Новенькие машины на гравийной площадке, офис продаж с запахом дешёвого кофе и ключи с заводским клеймом.';
    } else {
      flavor = s.description;
    }

    return {
      title: s.nameRu,
      desc: flavor
    };
  };

  const activeSpawnInfo = getSpawnDetails(selectedSpawnId);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/95 text-stone-200 font-sans select-none overflow-y-auto p-4 md:p-6">
      
      {/* Background ambient lighting - soft, foggy, warm amber dashboard color instead of neon blue */}
      <div className="absolute top-1/3 left-1/3 w-[600px] h-[400px] bg-amber-900/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-emerald-950/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Container Card - Compact, rounded-xl (no extreme border radius) */}
      <div className="relative z-10 w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh] md:max-h-[85vh]">
        
        {/* TOP ATMOSPHERIC HEADER */}
        <div className="border-b border-stone-800 bg-stone-900/60 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-col">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest text-emerald-500/90 uppercase">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>СТЕПНЫЕ ДОРОГИ • СНГ СИМУЛЯТОР</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-100 font-mono mt-1">
              СТЕПНОЙ ТРАКТ <span className="text-amber-500 text-lg font-bold">2D</span>
            </h1>
          </div>
          
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-mono text-stone-500 leading-relaxed italic">
              "Шорох шин по асфальту, тусклый свет приборов<br />и запах сухой полыни в открытом окне..."
            </p>
          </div>
        </div>

        {/* SCREEN MODULES */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 min-h-0">
          
          {/* SCREEN: MAIN MENU */}
          {screen === 'main' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch">
              
              {/* LEFT COLUMN: LIST OF OPTIONS (Touch target rich, mobile vertical list) */}
              <div className="lg:col-span-5 flex flex-col gap-2.5">
                
                {/* 1. Resume / Continue session */}
                {hasSaves && latestSave ? (
                  <button
                    onClick={() => onLoadSave(latestSave.id)}
                    onMouseEnter={() => setHoveredOption('resume')}
                    className="w-full min-h-[52px] px-4 py-3 bg-stone-800/80 hover:bg-stone-800 border border-emerald-900/50 hover:border-emerald-700/60 text-stone-100 rounded-xl text-left transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Play className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-emerald-400">Продолжить поездку</span>
                        <span className="block text-[10px] text-stone-400 font-mono truncate max-w-[180px]">{latestSave.name}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => setScreen('new_game')}
                    onMouseEnter={() => setHoveredOption('new_game')}
                    className="w-full min-h-[52px] px-4 py-3 bg-emerald-950/25 hover:bg-emerald-950/45 border border-emerald-900/50 hover:border-emerald-700/60 text-emerald-200 rounded-xl text-left transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <PlusCircle className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-emerald-300">Начать новый выезд</span>
                        <span className="block text-[10px] text-emerald-500/70 font-mono">Выбрать точку старта</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* 2. New Game Setup */}
                <button
                  onClick={() => setScreen('new_game')}
                  onMouseEnter={() => setHoveredOption('new_game')}
                  className="w-full min-h-[52px] px-4 py-3.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-750 text-stone-300 hover:text-white rounded-xl text-left transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <PlusCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Новый выезд</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-500 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 3. Saves Archive */}
                <button
                  onClick={() => setScreen('saves')}
                  onMouseEnter={() => setHoveredOption('saves')}
                  className="w-full min-h-[52px] px-4 py-3.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-750 text-stone-300 hover:text-white rounded-xl text-left transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-4 h-4 text-stone-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Архив поездок ({saves.length})</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-500 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 4. Driver Profile (Cloud DB Sync) */}
                {onOpenProfile && (
                  <button
                    onClick={onOpenProfile}
                    onMouseEnter={() => setHoveredOption('profile')}
                    className="w-full min-h-[52px] px-4 py-3.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-750 text-stone-300 hover:text-white rounded-xl text-left transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-stone-400" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Личное дело</span>
                        <span className="text-[8px] font-bold tracking-widest bg-stone-800 border border-stone-700 text-stone-400 px-1 py-0.5 rounded">ОБЛАКО</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* 5. Online P2P multiplayer */}
                {onOpenOnline && (
                  <button
                    onClick={onOpenOnline}
                    onMouseEnter={() => setHoveredOption('online')}
                    className="w-full min-h-[52px] px-4 py-3.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-750 text-stone-300 hover:text-white rounded-xl text-left transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Radio className="w-4 h-4 text-stone-400" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Диспетчерская P2P</span>
                        <span className="text-[8px] font-bold tracking-widest bg-emerald-950/50 border border-emerald-900 text-emerald-400 px-1 py-0.5 rounded">ОНЛАЙН</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* 6. Dashboard Settings */}
                <button
                  onClick={() => setScreen('settings')}
                  onMouseEnter={() => setHoveredOption('settings')}
                  className="w-full min-h-[52px] px-4 py-3.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-750 text-stone-300 hover:text-white rounded-xl text-left transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-stone-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Настройка кабины</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-500 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 7. Guides & Handbook */}
                <button
                  onClick={() => setScreen('about')}
                  onMouseEnter={() => setHoveredOption('about')}
                  className="w-full min-h-[52px] px-4 py-3.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-750 text-stone-300 hover:text-white rounded-xl text-left transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Info className="w-4 h-4 text-stone-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Справочник</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-500 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 8. Custom Map Cache Detector and Sync button */}
                {hasCustomSavedMap() && (
                  <div className="mt-4 p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl flex flex-col gap-2">
                    <div className="flex gap-2 animate-pulse">
                      <Settings className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <h4 className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Редакторская карта активна</h4>
                        <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                          Обнаружена сохраненная карта из Редактора. Встроенные новые обновления (включая реалистичную Ж/Д сеть, пути и вокзал) скрыты вашей локальной картой.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        clearCustomMapStorage();
                        window.location.reload();
                      }}
                      className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/25 active:scale-[0.98] border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center transition-all cursor-pointer"
                    >
                      Сбросить изменения редактора и загрузить оригинал
                    </button>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: DYNAMIC DOSSIER PREVIEW (Hidden on mobile, beautiful on desktop) */}
              <div className="hidden lg:col-span-7 bg-stone-950/40 border border-stone-800/80 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-stone-800/5 rounded-full blur-3xl pointer-events-none" />
                
                {/* 1. Preview Resume/Active Save (The "Waybill" card) */}
                {hoveredOption === 'resume' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">Путевой лист №СНГ-992</span>
                        <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-900 text-emerald-400 rounded text-[8px] font-mono font-bold uppercase">Активен</span>
                      </div>

                      {hasSaves && latestSave ? (
                        <div className="space-y-4">
                          <h3 className="text-base font-extrabold text-stone-100 uppercase tracking-tight">{latestSave.name}</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-stone-500 uppercase block">Время отбытия</span>
                              <span className="text-xs text-stone-200 font-mono font-bold block">{latestSave.date}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-stone-500 uppercase block">Пункт нахождения</span>
                              <span className="text-xs text-stone-200 font-bold block">{latestSave.streetName || 'Степной тракт'}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-stone-500 uppercase block">Статус движения</span>
                              <span className="text-xs text-stone-200 font-bold flex items-center gap-1">
                                {latestSave.isInVehicle ? <Car className="w-3.5 h-3.5 text-stone-400 inline" /> : <User className="w-3.5 h-3.5 text-stone-400 inline" />}
                                {latestSave.isInVehicle ? 'За рулём авто' : 'Пеший маршрут'}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-stone-500 uppercase block">Моточасы в пути</span>
                              <span className="text-xs text-amber-500 font-mono font-bold block">{latestSave.timeHour?.toFixed(1) || '10.0'} ч.</span>
                            </div>
                          </div>

                          {/* Quick Vitals of the driver */}
                          {latestSave.needs && (
                            <div className="pt-3 border-t border-stone-800/60 mt-3 space-y-2">
                              <span className="text-[9px] font-mono text-stone-500 uppercase block">Физическое состояние водителя</span>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-stone-900/60 border border-stone-800 p-2 rounded-xl flex items-center justify-between">
                                  <span className="text-[9px] font-mono text-stone-400 flex items-center gap-1"><Heart className="w-2.5 h-2.5 text-rose-500" /> HP</span>
                                  <span className="text-xs font-mono font-bold text-stone-200">{Math.round(latestSave.needs.health || 100)}%</span>
                                </div>
                                <div className="bg-stone-900/60 border border-stone-800 p-2 rounded-xl flex items-center justify-between">
                                  <span className="text-[9px] font-mono text-stone-400 flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-amber-500" /> Энергия</span>
                                  <span className="text-xs font-mono font-bold text-stone-200">{Math.round(latestSave.needs.energy || 100)}%</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h3 className="text-base font-extrabold text-stone-100 uppercase tracking-tight">Первый выезд на трассу</h3>
                          <p className="text-xs text-stone-400 leading-relaxed">
                            У вас нет активных сохранённых поездок. Начните новую сессию вождения, выбрав точку появления в СНГ.
                          </p>
                          <ul className="text-xs text-stone-500 space-y-1 list-disc pl-4 mt-2">
                            <li>Перевозка грузов и обслуживание авто</li>
                            <li>Исследование жилых дворов и хрущёвок</li>
                            <li>Реалистичная физика управления и сцепления</li>
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-stone-800 flex items-center justify-between mt-auto">
                      <span className="text-[10px] font-mono text-stone-500">Министерство транспорта • Симулятор</span>
                      {hasSaves && latestSave && (
                        <button
                          onClick={() => onLoadSave(latestSave.id)}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] text-white font-mono text-xs uppercase font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" /> В рейс
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. New Game Preview */}
                {hoveredOption === 'new_game' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">Карта маршрута</span>
                        <span className="px-2 py-0.5 bg-amber-950/40 border border-amber-900 text-amber-500 rounded text-[8px] font-mono font-bold uppercase">Создание</span>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-extrabold text-stone-100 uppercase tracking-tight">Новое назначение</h3>
                        <p className="text-xs text-stone-400 leading-relaxed">
                          Позволяет настроить путевой лист с уникальным именем водителя и заступить на смену в выбранной точке города.
                        </p>
                        <div className="bg-stone-900/60 border border-stone-800 p-3 rounded-xl space-y-1.5">
                          <span className="text-[9px] font-mono text-amber-500 uppercase block font-bold">Выбранный пункт старта</span>
                          <span className="text-xs text-stone-200 font-bold block">{activeSpawnInfo.title}</span>
                          <p className="text-[11px] text-stone-400 leading-relaxed">{activeSpawnInfo.desc}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-800 flex items-center justify-between mt-auto">
                      <span className="text-[10px] font-mono text-stone-500">Маршрутная ведомость</span>
                      <button
                        onClick={() => setScreen('new_game')}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white font-mono text-xs uppercase font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Настроить
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Saves Preview */}
                {hoveredOption === 'saves' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">Архивные ведомости</span>
                        <span className="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-400 rounded text-[8px] font-mono font-bold uppercase">База</span>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-extrabold text-stone-100 uppercase tracking-tight">База данных рейсов</h3>
                        <p className="text-xs text-stone-400 leading-relaxed">
                          Здесь хранится вся хроника ваших поездок. Вы можете вернуться к любому сохранённому состоянию симулятора, чтобы продолжить рейс с того же места.
                        </p>
                        <div className="p-3.5 bg-stone-900/40 rounded-xl border border-stone-850 flex items-center justify-between">
                          <span className="text-[11px] font-mono text-stone-400">Всего записей на диске:</span>
                          <span className="text-sm font-mono font-bold text-stone-200">{saves.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-800 flex items-center justify-between mt-auto font-mono text-[10px] text-stone-500">
                      <span>Формат файла: JSON (Local)</span>
                      <span>Доступно для загрузки</span>
                    </div>
                  </div>
                )}

                {/* 4. Profile Preview */}
                {hoveredOption === 'profile' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">Личное дело водителя</span>
                        <span className="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-400 rounded text-[8px] font-mono font-bold uppercase">Профиль</span>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-extrabold text-stone-100 uppercase tracking-tight">Облачная синхронизация</h3>
                        <p className="text-xs text-stone-400 leading-relaxed">
                          Свяжите симулятор с вашей учётной записью Firestore, чтобы хранить сейвы в надёжном облаке и не беспокоиться за сохранность данных при очистке кэша браузера.
                        </p>
                        <div className="p-3 bg-emerald-950/15 border border-emerald-900/30 text-emerald-300 rounded-xl text-[11px] leading-relaxed flex items-start gap-2">
                          <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Рекомендуется для долгосрочной игры и накопления игровой статистики по пройденному километражу.</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-800 text-[10px] text-stone-500 font-mono">
                      <span>Идентификатор профиля • СНГ-ID</span>
                    </div>
                  </div>
                )}

                {/* 5. Online Preview */}
                {hoveredOption === 'online' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">Диспетчерский узел связи</span>
                        <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-900 text-emerald-400 rounded text-[8px] font-mono font-bold uppercase">P2P</span>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-extrabold text-stone-100 uppercase tracking-tight">Совместное вождение</h3>
                        <p className="text-xs text-stone-400 leading-relaxed">
                          Создайте диспетчерскую комнату или подключитесь по коду лобби к сессии другого водителя. Координируйте движение, общайтесь в рации и делитесь дорожным трафиком в реальном времени.
                        </p>
                        <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-xl flex items-center justify-between">
                          <span className="text-[11px] text-stone-400">Режим соединения:</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">Peer-to-Peer</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-800 text-[10px] text-stone-500 font-mono">
                      <span>Стабильность зависит от пинга хоста</span>
                    </div>
                  </div>
                )}

                {/* 6. Settings Preview */}
                {hoveredOption === 'settings' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">Технический формуляр</span>
                        <span className="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-400 rounded text-[8px] font-mono font-bold uppercase">Кабина</span>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-extrabold text-stone-100 uppercase tracking-tight">Регулировка оборудования</h3>
                        <p className="text-xs text-stone-400 leading-relaxed">
                          Калибровка органов управления симулятором, аудиосистемы двигателя и параметров рендеринга для комфортного вождения.
                        </p>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="bg-stone-900/50 p-2.5 rounded-xl border border-stone-850 text-xs text-stone-300">
                            <span className="text-stone-500 block text-[9px] font-mono uppercase">Графика</span>
                            <span className="font-bold text-stone-200 block mt-0.5">{settings.fpsLimit === 0 ? 'Без лимита' : `${settings.fpsLimit} FPS`}</span>
                          </div>
                          <div className="bg-stone-900/50 p-2.5 rounded-xl border border-stone-850 text-xs text-stone-300">
                            <span className="text-stone-500 block text-[9px] font-mono uppercase">Звуковое вещание</span>
                            <span className="font-bold text-stone-200 block mt-0.5">{isMuted ? 'Отключено' : 'Стереоактивно'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-800 text-[10px] text-stone-500 font-mono">
                      <span>Настройки сохраняются автоматически</span>
                    </div>
                  </div>
                )}

                {/* 7. About Preview */}
                {hoveredOption === 'about' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">Бортовой журнал</span>
                        <span className="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-400 rounded text-[8px] font-mono font-bold uppercase">Инфо</span>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-base font-extrabold text-stone-100 uppercase tracking-tight">Общие сведения</h3>
                        <p className="text-xs text-stone-400 leading-relaxed">
                          Двухмерная физическая песочница, погружающая в атмосферу провинциальных дорог и городских кварталов СНГ.
                        </p>
                        
                        <div className="space-y-1.5 text-[11px] text-stone-400 mt-2">
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Физика заноса задней оси</div>
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Подъёмные лифты в панельках</div>
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Система травм и утомления</div>
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Рабочая КОМ цистерн и сопла</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-800 text-[10px] text-stone-500 font-mono">
                      <span>Версия симулятора: 1.4 Stable</span>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* SCREEN: SAVES LIST */}
          {screen === 'saves' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <button
                  type="button"
                  onClick={() => setScreen('main')}
                  className="min-h-[44px] flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Назад в меню
                </button>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">
                  Архив поездок / Сейвы ({saves.length})
                </h2>
              </div>

              <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto pr-1">
                {saves.length === 0 ? (
                  <div className="text-center py-12 text-stone-500 text-xs italic bg-stone-950/40 border border-stone-850 rounded-xl p-6">
                    Нет зарегистрированных рейсов в архиве. Начните новую игру («Новый выезд»), чтобы сохранить свой прогресс.
                  </div>
                ) : (
                  saves.map((save) => (
                    <div 
                      key={save.id}
                      className="bg-stone-950/50 border border-stone-850 hover:border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <div className="font-bold text-sm text-stone-100 truncate flex items-center gap-2">
                          <span>{save.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-stone-900 rounded border border-stone-800 text-stone-500">ID: {save.id.slice(-6)}</span>
                        </div>
                        <div className="text-[11px] text-stone-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1 font-mono">
                            <HardDrive className="w-3.5 h-3.5 text-stone-500" /> {save.date}
                          </span>
                          <span className="text-stone-700 hidden sm:inline">•</span>
                          <span className="text-stone-300 flex items-center gap-1">
                            {save.isInVehicle ? <Car className="w-3.5 h-3.5 text-stone-400" /> : <User className="w-3.5 h-3.5 text-stone-400" />}
                            {save.isInVehicle ? 'В транспорте' : 'Пешком'}
                          </span>
                          <span className="text-stone-700 hidden sm:inline">•</span>
                          <span className="text-amber-500 font-mono font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            {save.timeHour?.toFixed(1) || '10.0'}ч в пути
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => onLoadSave(save.id)}
                          className="min-h-[44px] px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" /> ВЫЕХАТЬ
                        </button>

                        <button
                          onClick={() => onDeleteSave(save.id)}
                          className="min-h-[44px] px-3 py-2 bg-stone-900 hover:bg-rose-950/60 text-stone-500 hover:text-rose-400 border border-stone-800 hover:border-rose-900/30 rounded-xl transition-all cursor-pointer"
                          title="Списать ведомость"
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

          {/* SCREEN: NEW GAME SETUP */}
          {screen === 'new_game' && (
            <form onSubmit={handleStartNewGameSubmit} className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <button
                  type="button"
                  onClick={() => setScreen('main')}
                  className="min-h-[44px] flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Назад
                </button>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">
                  Путевой лист новой поездки
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 max-h-[380px] overflow-y-auto pr-1">
                
                {/* Driver Name Input Card */}
                <div className="md:col-span-4 bg-stone-950/40 border border-stone-800 rounded-xl p-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
                      Имя водителя в ПТС
                    </label>
                    <input
                      type="text"
                      value={newGameName}
                      onChange={(e) => setNewGameName(e.target.value)}
                      maxLength={32}
                      required
                      placeholder="Введите ваше имя..."
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-3 text-stone-200 text-xs font-bold focus:outline-none focus:border-stone-700 transition-colors"
                    />
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-stone-850 text-[10px] text-stone-500 leading-relaxed italic hidden md:block">
                    Имя водителя запишется в документы транспортного средства при покупке в автосалоне.
                  </div>
                </div>

                {/* Spawn Point Selector Grid */}
                <div className="md:col-span-8 space-y-3">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
                    Пункт назначения (Где начать симуляцию)
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {spawnLocations.map((loc) => {
                      const isSelected = selectedSpawnId === loc.id;
                      return (
                        <div
                          key={loc.id}
                          onClick={() => {
                            setSelectedSpawnId(loc.id);
                            setHoveredOption('new_game');
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isSelected 
                              ? 'bg-amber-950/20 border-amber-550/50 shadow shadow-amber-950/50' 
                              : 'bg-stone-950/40 hover:bg-stone-900/60 border-stone-800 hover:border-stone-750'
                          }`}
                        >
                          <div className={`p-2 rounded-lg border ${
                            isSelected ? 'bg-amber-950/60 border-amber-900 text-amber-500' : 'bg-stone-900 border-stone-850 text-stone-400'
                          }`}>
                            {loc.icon}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-xs font-bold text-stone-100 flex items-center justify-between">
                              <span className="truncate">{loc.nameRu}</span>
                              {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 ml-1" />}
                            </div>
                            <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed truncate">{loc.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              <button
                type="submit"
                className="w-full min-h-[50px] py-3.5 bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white font-mono font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Play className="w-4 h-4 fill-white" /> ПОДПИСАТЬ И ВЫЕХАТЬ
              </button>
            </form>
          )}

          {/* SCREEN: SETTINGS */}
          {screen === 'settings' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <button
                  type="button"
                  onClick={() => setScreen('main')}
                  className="min-h-[44px] flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Назад
                </button>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">
                  Технический формуляр кабины (Настройки)
                </h2>
              </div>

              {/* Muted tab navigation */}
              <div className="grid grid-cols-4 gap-1 bg-stone-950/60 p-1 rounded-xl border border-stone-850">
                {[
                  { id: 'graphics', label: 'Вид', icon: Monitor },
                  { id: 'audio', label: 'Аудио', icon: Volume2 },
                  { id: 'gameplay', label: 'Игровой Мир', icon: Clock },
                  { id: 'controls', label: 'Кабины', icon: Gamepad2 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = settingsTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSettingsTab(tab.id as SettingsTab)}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-stone-800 text-stone-100 border border-stone-700/80 shadow' 
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab options wrapper */}
              <div className="bg-stone-950/30 border border-stone-800 rounded-xl p-4 min-h-[180px] max-h-[220px] overflow-y-auto space-y-4">
                
                {/* Graphics */}
                {settingsTab === 'graphics' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-xs font-bold text-stone-200">Ограничение FPS</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">Лимит частоты смены кадров рендеринга</div>
                      </div>
                      <div className="flex gap-1">
                        {[60, 120, 0].map((limit) => (
                          <button
                            key={limit}
                            type="button"
                            onClick={() => onUpdateSettings({ ...settings, fpsLimit: limit })}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              settings.fpsLimit === limit 
                                ? 'bg-stone-800 text-stone-100 border border-stone-700' 
                                : 'bg-stone-900/60 text-stone-400 hover:bg-stone-850 border border-stone-850'
                            }`}
                          >
                            {limit === 0 ? 'Без лимита' : `${limit} FPS`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio */}
                {settingsTab === 'audio' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-xs font-bold text-stone-200">Глобальный звук</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">Звук мотора автомобиля, сирен и окружения</div>
                      </div>
                      <button
                        type="button"
                        onClick={onToggleMute}
                        className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          isMuted 
                            ? 'bg-rose-950/30 text-rose-400 border border-rose-900/30' 
                            : 'bg-stone-850 text-stone-200 hover:text-white border border-stone-750'
                        }`}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
                        <span>{isMuted ? 'Звуки выключены' : 'Звуки включены'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Gameplay */}
                {settingsTab === 'gameplay' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-xs font-bold text-stone-200">Автосохранение</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">Интервал автоматической записи прогресса рейса</div>
                      </div>
                      <div className="flex gap-1">
                        {[
                          { val: 25, label: '25 с' },
                          { val: 60, label: '1 мин' },
                          { val: 0, label: 'Выкл' }
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => onUpdateSettings({ ...settings, autoSaveInterval: opt.val })}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              settings.autoSaveInterval === opt.val 
                                ? 'bg-stone-800 text-stone-100 border border-stone-700' 
                                : 'bg-stone-900/60 text-stone-400 hover:bg-stone-850 border border-stone-850'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-850">
                      <div>
                        <div className="text-xs font-bold text-stone-200">Время суток</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">Циклическая смена дня и ночи в симуляторе</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, timeAutoCycle: !settings.timeAutoCycle })}
                        className={`w-12 h-6 rounded-full p-1 transition-all cursor-pointer ${
                          settings.timeAutoCycle ? 'bg-emerald-800 flex justify-end' : 'bg-stone-900 border border-stone-850 flex justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-stone-300 shadow" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Controls */}
                {settingsTab === 'controls' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-bold text-stone-200">Чувствительность мыши</div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={settings.mouseSensitivity}
                          onChange={(e) => onUpdateSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) })}
                          className="w-full accent-stone-400 cursor-pointer h-1.5 bg-stone-900 rounded-lg appearance-none"
                        />
                        <span className="text-xs font-mono font-bold text-stone-200 shrink-0">{settings.mouseSensitivity.toFixed(1)}x</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-stone-400 bg-stone-950/50 p-2.5 rounded-lg border border-stone-850 leading-relaxed font-mono">
                      Управление авто: <span className="text-stone-200 font-bold">WASD / Стрелки</span> • Ручник: <span className="text-stone-200 font-bold">Пробел</span> • Свет фар: <span className="text-stone-200 font-bold">L</span> • Поворотники: <span className="text-stone-200 font-bold">Q/E</span> • Инвентарь: <span className="text-stone-200 font-bold">I</span> • Самоосмотр: <span className="text-stone-200 font-bold">C</span> • Пауза: <span className="text-stone-200 font-bold">ESC</span>.
                    </div>
                  </div>
                )}

              </div>

              <button
                type="button"
                onClick={() => setScreen('main')}
                className="w-full min-h-[46px] py-2.5 bg-stone-800 hover:bg-stone-750 text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-stone-700"
              >
                Сохранить параметры
              </button>
            </div>
          )}

          {/* SCREEN: ABOUT */}
          {screen === 'about' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <button
                  type="button"
                  onClick={() => setScreen('main')}
                  className="min-h-[44px] flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Назад
                </button>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">
                  Бортовой журнал симулятора (Справка)
                </h2>
              </div>

              <div className="bg-stone-950/40 border border-stone-800 rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-3.5 text-xs text-stone-300 leading-relaxed">
                <p>
                  <strong className="text-white">Степной Тракт 2D</strong> — это глубокая транспортно-логистическая песочница, воссоздающая атмосферу автомобильной жизни в глубинке СНГ.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-stone-900/60 rounded-xl border border-stone-800">
                    <div className="font-bold text-amber-500 mb-0.5 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Обслуживание ДВС</span>
                    </div>
                    <div className="text-[11px] text-stone-400">Вы можете открыть капот, проверить уровень антифриза и масла, заменить фильтры и свечи зажигания при износе.</div>
                  </div>
                  <div className="p-3 bg-stone-900/60 rounded-xl border border-stone-800">
                    <div className="font-bold text-emerald-500 mb-0.5 flex items-center gap-1.5">
                      <TreePine className="w-3.5 h-3.5" />
                      <span>Деревня Полыновка</span>
                    </div>
                    <div className="text-[11px] text-stone-400">Глубокая атмосферная локация на востоке карты. Жители, печное отопление, колодцы и грунтовые размытые колеи.</div>
                  </div>
                  <div className="p-3 bg-stone-900/60 rounded-xl border border-stone-800">
                    <div className="font-bold text-sky-500 mb-0.5 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5" />
                      <span>Первая Помощь</span>
                    </div>
                    <div className="text-[11px] text-stone-400">Травмы конечностей лечатся бинтами, шинами и мазями. Открыть меню самоосмотра можно по кнопке в HUD или клавише C.</div>
                  </div>
                  <div className="p-3 bg-stone-900/60 rounded-xl border border-stone-800">
                    <div className="font-bold text-stone-300 mb-0.5 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Рюкзак и Карманы</span>
                    </div>
                    <div className="text-[11px] text-stone-400">Вещи можно раскладывать по карманам куртки, брюк или уложить в рюкзак. Рюкзак можно носить на спине или снять на землю.</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScreen('main')}
                className="w-full min-h-[46px] py-2.5 bg-stone-800 hover:bg-stone-750 text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-stone-700"
              >
                Закрыть справку
              </button>
            </div>
          )}

        </div>

        {/* VERSION FOOTER */}
        <div className="border-t border-stone-800 bg-stone-900/40 px-5 py-4 text-center text-[10px] text-stone-500 flex items-center justify-between font-mono shrink-0">
          <span>Сделано с душой • Степной Тракт 2D</span>
          <span className="text-stone-400 font-bold">Версия 1.4 Stable</span>
        </div>

      </div>

    </div>
  );
};

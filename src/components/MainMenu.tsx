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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0b0c0e]/95 text-[#f0f3f6] font-sans select-none overflow-y-auto p-4 md:p-6">
      
      {/* Background ambient lighting - warm ochre dashboard atmosphere */}
      <div className="absolute top-1/3 left-1/3 w-[600px] h-[400px] bg-[#c68a35]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Container Card - BeamNG Rectangular Panel */}
      <div className="relative z-10 w-full max-w-4xl bg-[rgba(20,22,26,0.95)] border border-white/10 rounded-[2px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh] md:max-h-[85vh]">
        
        {/* TOP ATMOSPHERIC HEADER */}
        <div className="border-b border-white/[0.08] bg-[#14161a]/80 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[2px] bg-[#c68a35]/15 border border-[#c68a35]/50 flex items-center justify-center text-[#e5a94e] shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="text-[10px] font-mono font-bold tracking-widest text-[#c68a35] uppercase">
                СТЕПНЫЕ ДОРОГИ • ТРАНСПОРТНЫЙ СИМУЛЯТОР
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white font-mono">
                СТЕПНОЙ ТРАКТ <span className="text-[#c68a35]">2D</span>
              </h1>
            </div>
          </div>
          
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-mono text-[#8b929e] leading-relaxed italic">
              "Шорох шин по асфальту, тусклый свет приборов<br />и запах сухой полыни в открытом окне..."
            </p>
          </div>
        </div>

        {/* SCREEN MODULES */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 min-h-0">
          
          {/* SCREEN: MAIN MENU */}
          {screen === 'main' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch">
              
              {/* LEFT COLUMN: LIST OF OPTIONS */}
              <div className="lg:col-span-5 flex flex-col gap-2">
                
                {/* 1. Resume / Continue session */}
                {hasSaves && latestSave ? (
                  <button
                    onClick={() => onLoadSave(latestSave.id)}
                    onMouseEnter={() => setHoveredOption('resume')}
                    className="group relative w-full min-h-[50px] px-4 py-3 bg-[rgba(20,22,26,0.85)] hover:bg-[rgba(35,38,45,0.95)] border border-[#c68a35]/50 hover:border-[#c68a35] text-[#f0f3f6] rounded-[2px] text-left transition-all flex items-center justify-between cursor-pointer overflow-hidden shadow-[0_2px_12px_rgba(198,138,53,0.15)]"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35]" />
                    <div className="flex items-center gap-3">
                      <Play className="w-4 h-4 text-[#e5a94e] fill-current/20" />
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-[#e5a94e]">Продолжить поездку</span>
                        <span className="block text-[10px] text-[#8b929e] font-mono truncate max-w-[180px]">{latestSave.name}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#c68a35] group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => setScreen('new_game')}
                    onMouseEnter={() => setHoveredOption('new_game')}
                    className="group relative w-full min-h-[50px] px-4 py-3 bg-[rgba(20,22,26,0.85)] hover:bg-[rgba(35,38,45,0.95)] border border-[#c68a35]/40 hover:border-[#c68a35] text-[#f0f3f6] rounded-[2px] text-left transition-all flex items-center justify-between cursor-pointer overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35]" />
                    <div className="flex items-center gap-3">
                      <PlusCircle className="w-4 h-4 text-[#e5a94e]" />
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-[#e5a94e]">Начать новый выезд</span>
                        <span className="block text-[10px] text-[#8b929e] font-mono">Выбрать точку старта</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#c68a35] group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* 2. New Game Setup */}
                <button
                  onClick={() => setScreen('new_game')}
                  onMouseEnter={() => setHoveredOption('new_game')}
                  className="group relative w-full min-h-[50px] px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 text-[#f0f3f6] rounded-[2px] text-left transition-all flex items-center justify-between cursor-pointer overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3">
                    <PlusCircle className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                    <span className="text-xs font-bold uppercase tracking-wider">Новый выезд</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8b929e] group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 3. Saves Archive */}
                <button
                  onClick={() => setScreen('saves')}
                  onMouseEnter={() => setHoveredOption('saves')}
                  className="group relative w-full min-h-[50px] px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 text-[#f0f3f6] rounded-[2px] text-left transition-all flex items-center justify-between cursor-pointer overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                    <span className="text-xs font-bold uppercase tracking-wider">Архив поездок ({saves.length})</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8b929e] group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 4. Driver Profile (Cloud DB Sync) */}
                {onOpenProfile && (
                  <button
                    onClick={onOpenProfile}
                    onMouseEnter={() => setHoveredOption('profile')}
                    className="group relative w-full min-h-[50px] px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 text-[#f0f3f6] rounded-[2px] text-left transition-all flex items-center justify-between cursor-pointer overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Личное дело</span>
                        <span className="text-[8px] font-bold tracking-widest bg-white/[0.06] border border-white/10 text-[#8b929e] px-1 py-0.5 rounded-[2px]">ОБЛАКО</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8b929e] group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* 5. Online P2P multiplayer */}
                {onOpenOnline && (
                  <button
                    onClick={onOpenOnline}
                    onMouseEnter={() => setHoveredOption('online')}
                    className="group relative w-full min-h-[50px] px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 text-[#f0f3f6] rounded-[2px] text-left transition-all flex items-center justify-between cursor-pointer overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3">
                      <Radio className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Диспетчерская P2P</span>
                        <span className="text-[8px] font-bold tracking-widest bg-[#c68a35]/15 border border-[#c68a35]/40 text-[#e5a94e] px-1 py-0.5 rounded-[2px]">ОНЛАЙН</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8b929e] group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* 6. Dashboard Settings */}
                <button
                  onClick={() => setScreen('settings')}
                  onMouseEnter={() => setHoveredOption('settings')}
                  className="group relative w-full min-h-[50px] px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 text-[#f0f3f6] rounded-[2px] text-left transition-all flex items-center justify-between cursor-pointer overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                    <span className="text-xs font-bold uppercase tracking-wider">Настройка кабины</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8b929e] group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 7. Guides & Handbook */}
                <button
                  onClick={() => setScreen('about')}
                  onMouseEnter={() => setHoveredOption('about')}
                  className="group relative w-full min-h-[50px] px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 text-[#f0f3f6] rounded-[2px] text-left transition-all flex items-center justify-between cursor-pointer overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3">
                    <Info className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                    <span className="text-xs font-bold uppercase tracking-wider">Справочник</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8b929e] group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 8. Custom Map Cache Detector and Sync button */}
                {hasCustomSavedMap() && (
                  <div className="mt-3 p-3 bg-[#c68a35]/10 border border-[#c68a35]/40 rounded-[2px] flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Settings className="w-4 h-4 text-[#e5a94e] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[11px] font-bold text-[#e5a94e] uppercase tracking-wider">Редакторская карта активна</h4>
                        <p className="text-[10px] text-[#8b929e] mt-0.5 leading-relaxed">
                          Обнаружена сохраненная карта из Редактора.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        clearCustomMapStorage();
                        window.location.reload();
                      }}
                      className="w-full py-1.5 bg-[#c68a35]/20 hover:bg-[#c68a35]/35 border border-[#c68a35]/50 text-[#e5a94e] rounded-[2px] text-[10px] font-bold uppercase tracking-wider text-center transition-all cursor-pointer"
                    >
                      Сбросить изменения редактора
                    </button>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: DYNAMIC DOSSIER PREVIEW */}
              <div className="hidden lg:col-span-7 bg-[#14161a]/60 border border-white/[0.08] rounded-[2px] p-5 flex flex-col justify-between relative overflow-hidden">
                
                {/* 1. Preview Resume/Active Save */}
                {hoveredOption === 'resume' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8b929e]">Путевой лист №СНГ-992</span>
                        <span className="px-2 py-0.5 bg-[#c68a35]/15 border border-[#c68a35]/40 text-[#e5a94e] rounded-[2px] text-[8px] font-mono font-bold uppercase">Активен</span>
                      </div>

                      {hasSaves && latestSave ? (
                        <div className="space-y-4">
                          <h3 className="text-base font-extrabold text-[#f0f3f6] uppercase tracking-tight">{latestSave.name}</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-[#8b929e] uppercase block">Время отбытия</span>
                              <span className="text-xs text-[#f0f3f6] font-mono font-bold block">{latestSave.date}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-[#8b929e] uppercase block">Пункт нахождения</span>
                              <span className="text-xs text-[#f0f3f6] font-bold block">{latestSave.streetName || 'Степной тракт'}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-[#8b929e] uppercase block">Статус движения</span>
                              <span className="text-xs text-[#f0f3f6] font-bold flex items-center gap-1">
                                {latestSave.isInVehicle ? <Car className="w-3.5 h-3.5 text-[#8b929e] inline" /> : <User className="w-3.5 h-3.5 text-[#8b929e] inline" />}
                                {latestSave.isInVehicle ? 'За рулём авто' : 'Пеший маршрут'}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-[#8b929e] uppercase block">Моточасы в пути</span>
                              <span className="text-xs text-[#e5a94e] font-mono font-bold block">{latestSave.timeHour?.toFixed(1) || '10.0'} ч.</span>
                            </div>
                          </div>

                          {/* Quick Vitals */}
                          {latestSave.needs && (
                            <div className="pt-3 border-t border-white/[0.08] mt-3 space-y-2">
                              <span className="text-[9px] font-mono text-[#8b929e] uppercase block">Физическое состояние водителя</span>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-[#14161a] border border-white/[0.08] p-2 rounded-[2px] flex items-center justify-between">
                                  <span className="text-[9px] font-mono text-[#8b929e] flex items-center gap-1"><Heart className="w-2.5 h-2.5 text-rose-500" /> HP</span>
                                  <span className="text-xs font-mono font-bold text-[#f0f3f6]">{Math.round(latestSave.needs.health || 100)}%</span>
                                </div>
                                <div className="bg-[#14161a] border border-white/[0.08] p-2 rounded-[2px] flex items-center justify-between">
                                  <span className="text-[9px] font-mono text-[#8b929e] flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-[#e5a94e]" /> Энергия</span>
                                  <span className="text-xs font-mono font-bold text-[#f0f3f6]">{Math.round(latestSave.needs.energy || 100)}%</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h3 className="text-base font-extrabold text-[#f0f3f6] uppercase tracking-tight">Первый выезд на трассу</h3>
                          <p className="text-xs text-[#8b929e] leading-relaxed">
                            У вас нет активных сохранённых поездок. Начните новую сессию вождения, выбрав точку появления в СНГ.
                          </p>
                          <ul className="text-xs text-[#8b929e] space-y-1 list-disc pl-4 mt-2">
                            <li>Перевозка грузов и обслуживание авто</li>
                            <li>Исследование жилых дворов и хрущёвок</li>
                            <li>Реалистичная физика управления и сцепления</li>
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between mt-auto">
                      <span className="text-[10px] font-mono text-[#8b929e]">Министерство транспорта • Симулятор</span>
                      {hasSaves && latestSave && (
                        <button
                          onClick={() => onLoadSave(latestSave.id)}
                          className="px-4 py-2 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-mono text-xs uppercase font-extrabold rounded-[2px] transition-all cursor-pointer flex items-center gap-1.5 shadow"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> В рейс
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. New Game Preview */}
                {hoveredOption === 'new_game' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8b929e]">Карта маршрута</span>
                        <span className="px-2 py-0.5 bg-[#c68a35]/15 border border-[#c68a35]/40 text-[#e5a94e] rounded-[2px] text-[8px] font-mono font-bold uppercase">Создание</span>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-extrabold text-[#f0f3f6] uppercase tracking-tight">Новое назначение</h3>
                        <p className="text-xs text-[#8b929e] leading-relaxed">
                          Позволяет настроить путевой лист с уникальным именем водителя и заступить на смену в выбранной точке города.
                        </p>
                        <div className="bg-[#14161a] border border-white/[0.08] p-3 rounded-[2px] space-y-1.5">
                          <span className="text-[9px] font-mono text-[#e5a94e] uppercase block font-bold">Выбранный пункт старта</span>
                          <span className="text-xs text-[#f0f3f6] font-bold block">{activeSpawnInfo.title}</span>
                          <p className="text-[11px] text-[#8b929e] leading-relaxed">{activeSpawnInfo.desc}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between mt-auto">
                      <span className="text-[10px] font-mono text-[#8b929e]">Маршрутная ведомость</span>
                      <button
                        onClick={() => setScreen('new_game')}
                        className="px-4 py-2 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-mono text-xs uppercase font-extrabold rounded-[2px] transition-all cursor-pointer flex items-center gap-1.5 shadow"
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
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8b929e]">Архивные ведомости</span>
                        <span className="px-2 py-0.5 bg-white/[0.06] border border-white/10 text-[#8b929e] rounded-[2px] text-[8px] font-mono font-bold uppercase">База</span>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-extrabold text-[#f0f3f6] uppercase tracking-tight">База данных рейсов</h3>
                        <p className="text-xs text-[#8b929e] leading-relaxed">
                          Здесь хранится вся хроника ваших поездок. Вы можете вернуться к любому сохранённому состоянию симулятора, чтобы продолжить рейс с того же места.
                        </p>
                        <div className="p-3.5 bg-[#14161a] rounded-[2px] border border-white/[0.08] flex items-center justify-between">
                          <span className="text-[11px] font-mono text-[#8b929e]">Всего записей на диске:</span>
                          <span className="text-sm font-mono font-bold text-[#f0f3f6]">{saves.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between mt-auto font-mono text-[10px] text-[#8b929e]">
                      <span>Формат файла: JSON (Local)</span>
                      <span>Доступно для загрузки</span>
                    </div>
                  </div>
                )}

                {/* 4. Profile Preview */}
                {hoveredOption === 'profile' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8b929e]">Личное дело водителя</span>
                        <span className="px-2 py-0.5 bg-white/[0.06] border border-white/10 text-[#8b929e] rounded-[2px] text-[8px] font-mono font-bold uppercase">Профиль</span>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-extrabold text-[#f0f3f6] uppercase tracking-tight">Облачная синхронизация</h3>
                        <p className="text-xs text-[#8b929e] leading-relaxed">
                          Свяжите симулятор с вашей учётной записью Firestore, чтобы хранить сейвы в надёжном облаке.
                        </p>
                        <div className="p-3 bg-[#c68a35]/10 border border-[#c68a35]/30 text-[#e5a94e] rounded-[2px] text-[11px] leading-relaxed flex items-start gap-2">
                          <Shield className="w-4 h-4 text-[#e5a94e] shrink-0 mt-0.5" />
                          <span>Рекомендуется для долгосрочной игры и накопления игровой статистики.</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] text-[10px] text-[#8b929e] font-mono">
                      <span>Идентификатор профиля • СНГ-ID</span>
                    </div>
                  </div>
                )}

                {/* 5. Online Preview */}
                {hoveredOption === 'online' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8b929e]">Диспетчерский узел связи</span>
                        <span className="px-2 py-0.5 bg-[#c68a35]/15 border border-[#c68a35]/40 text-[#e5a94e] rounded-[2px] text-[8px] font-mono font-bold uppercase">P2P</span>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-extrabold text-[#f0f3f6] uppercase tracking-tight">Совместное вождение</h3>
                        <p className="text-xs text-[#8b929e] leading-relaxed">
                          Создайте диспетчерскую комнату или подключитесь по коду лобби к сессии другого водителя. Координируйте движение в реальном времени.
                        </p>
                        <div className="p-3 bg-[#14161a] border border-white/[0.08] rounded-[2px] flex items-center justify-between">
                          <span className="text-[11px] text-[#8b929e]">Режим соединения:</span>
                          <span className="text-xs font-mono font-bold text-[#e5a94e]">Peer-to-Peer</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] text-[10px] text-[#8b929e] font-mono">
                      <span>Стабильность зависит от пинга хоста</span>
                    </div>
                  </div>
                )}

                {/* 6. Settings Preview */}
                {hoveredOption === 'settings' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8b929e]">Технический формуляр</span>
                        <span className="px-2 py-0.5 bg-white/[0.06] border border-white/10 text-[#8b929e] rounded-[2px] text-[8px] font-mono font-bold uppercase">Кабина</span>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-extrabold text-[#f0f3f6] uppercase tracking-tight">Регулировка оборудования</h3>
                        <p className="text-xs text-[#8b929e] leading-relaxed">
                          Калибровка органов управления симулятором, аудиосистемы двигателя и параметров рендеринга.
                        </p>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="bg-[#14161a] p-2.5 rounded-[2px] border border-white/[0.08] text-xs text-[#f0f3f6]">
                            <span className="text-[#8b929e] block text-[9px] font-mono uppercase">Графика</span>
                            <span className="font-bold text-[#f0f3f6] block mt-0.5">{settings.fpsLimit === 0 ? 'Без лимита' : `${settings.fpsLimit} FPS`}</span>
                          </div>
                          <div className="bg-[#14161a] p-2.5 rounded-[2px] border border-white/[0.08] text-xs text-[#f0f3f6]">
                            <span className="text-[#8b929e] block text-[9px] font-mono uppercase">Звуковое вещание</span>
                            <span className="font-bold text-[#f0f3f6] block mt-0.5">{isMuted ? 'Отключено' : 'Стереоактивно'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] text-[10px] text-[#8b929e] font-mono">
                      <span>Настройки сохраняются автоматически</span>
                    </div>
                  </div>
                )}

                {/* 7. About Preview */}
                {hoveredOption === 'about' && (
                  <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8b929e]">Бортовой журнал</span>
                        <span className="px-2 py-0.5 bg-white/[0.06] border border-white/10 text-[#8b929e] rounded-[2px] text-[8px] font-mono font-bold uppercase">Инфо</span>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-base font-extrabold text-[#f0f3f6] uppercase tracking-tight">Общие сведения</h3>
                        <p className="text-xs text-[#8b929e] leading-relaxed">
                          Двухмерная физическая песочница, погружающая в атмосферу провинциальных дорог и городских кварталов СНГ.
                        </p>
                        
                        <div className="space-y-1.5 text-[11px] text-[#8b929e] mt-2">
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#e5a94e]" /> Физика заноса задней оси</div>
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#e5a94e]" /> Подъёмные лифты в панельках</div>
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#e5a94e]" /> Система травм и утомления</div>
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#e5a94e]" /> Рабочая КОМ цистерн и сопла</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] text-[10px] text-[#8b929e] font-mono">
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
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <button
                  type="button"
                  onClick={() => setScreen('main')}
                  className="min-h-[40px] flex items-center gap-2 text-xs font-bold text-[#8b929e] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Назад в меню
                </button>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                  Архив поездок / Сейвы ({saves.length})
                </h2>
              </div>

              <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
                {saves.length === 0 ? (
                  <div className="text-center py-12 text-[#8b929e] text-xs italic bg-[#14161a] border border-white/[0.08] rounded-[2px] p-6">
                    Нет зарегистрированных рейсов в архиве.
                  </div>
                ) : (
                  saves.map((save) => (
                    <div 
                      key={save.id}
                      className="bg-[#14161a] border border-white/[0.08] hover:border-[#c68a35]/40 rounded-[2px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <div className="font-bold text-sm text-[#f0f3f6] truncate flex items-center gap-2">
                          <span>{save.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-white/[0.05] rounded-[2px] border border-white/10 text-[#8b929e]">ID: {save.id.slice(-6)}</span>
                        </div>
                        <div className="text-[11px] text-[#8b929e] flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1 font-mono">
                            <HardDrive className="w-3.5 h-3.5 text-[#8b929e]" /> {save.date}
                          </span>
                          <span className="text-white/20 hidden sm:inline">•</span>
                          <span className="text-[#f0f3f6] flex items-center gap-1">
                            {save.isInVehicle ? <Car className="w-3.5 h-3.5 text-[#8b929e]" /> : <User className="w-3.5 h-3.5 text-[#8b929e]" />}
                            {save.isInVehicle ? 'В транспорте' : 'Пешком'}
                          </span>
                          <span className="text-white/20 hidden sm:inline">•</span>
                          <span className="text-[#e5a94e] font-mono font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#e5a94e]" />
                            {save.timeHour?.toFixed(1) || '10.0'}ч в пути
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => onLoadSave(save.id)}
                          className="min-h-[38px] px-4 py-2 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] rounded-[2px] font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> ВЫЕХАТЬ
                        </button>

                        <button
                          onClick={() => onDeleteSave(save.id)}
                          className="min-h-[38px] px-3 py-2 bg-white/[0.05] hover:bg-rose-950/60 text-[#8b929e] hover:text-rose-400 border border-white/10 hover:border-rose-900/30 rounded-[2px] transition-all cursor-pointer"
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
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <button
                  type="button"
                  onClick={() => setScreen('main')}
                  className="min-h-[40px] flex items-center gap-2 text-xs font-bold text-[#8b929e] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Назад
                </button>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                  Путевой лист новой поездки
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 max-h-[380px] overflow-y-auto pr-1">
                
                {/* Driver Name Input Card */}
                <div className="md:col-span-4 bg-[#14161a] border border-white/[0.08] rounded-[2px] p-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                      Имя водителя в ПТС
                    </label>
                    <input
                      type="text"
                      value={newGameName}
                      onChange={(e) => setNewGameName(e.target.value)}
                      maxLength={32}
                      required
                      placeholder="Введите ваше имя..."
                      className="w-full bg-[#0b0c0e] border border-white/10 focus:border-[#c68a35] rounded-[2px] px-3.5 py-2.5 text-[#f0f3f6] text-xs font-bold focus:outline-none transition-colors"
                    />
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-white/[0.08] text-[10px] text-[#8b929e] leading-relaxed italic hidden md:block">
                    Имя водителя запишется в документы транспортного средства.
                  </div>
                </div>

                {/* Spawn Point Selector Grid */}
                <div className="md:col-span-8 space-y-3">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                    Пункт назначения (Где начать симуляцию)
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {spawnLocations.map((loc) => {
                      const isSelected = selectedSpawnId === loc.id;
                      return (
                        <div
                          key={loc.id}
                          onClick={() => {
                            setSelectedSpawnId(loc.id);
                            setHoveredOption('new_game');
                          }}
                          className={`p-3 rounded-[2px] border transition-all cursor-pointer flex items-start gap-3 ${
                            isSelected 
                              ? 'bg-[#c68a35]/15 border-[#c68a35]/60 shadow-[0_2px_10px_rgba(198,138,53,0.15)]' 
                              : 'bg-[#14161a] hover:bg-[#1a1d22] border-white/[0.08] hover:border-white/20'
                          }`}
                        >
                          <div className={`p-2 rounded-[2px] border ${
                            isSelected ? 'bg-[#c68a35]/20 border-[#c68a35]/40 text-[#e5a94e]' : 'bg-white/[0.05] border-white/10 text-[#8b929e]'
                          }`}>
                            {loc.icon}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-xs font-bold text-[#f0f3f6] flex items-center justify-between">
                              <span className="truncate">{loc.nameRu}</span>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-[1px] bg-[#c68a35] shrink-0 ml-1" />}
                            </div>
                            <p className="text-[10px] text-[#8b929e] mt-0.5 leading-relaxed truncate">{loc.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              <button
                type="submit"
                className="w-full min-h-[46px] py-3 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-mono font-bold text-xs uppercase tracking-widest rounded-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" /> ПОДПИСАТЬ И ВЫЕХАТЬ
              </button>
            </form>
          )}

          {/* SCREEN: SETTINGS */}
          {screen === 'settings' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <button
                  type="button"
                  onClick={() => setScreen('main')}
                  className="min-h-[40px] flex items-center gap-2 text-xs font-bold text-[#8b929e] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Назад
                </button>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                  Технический формуляр кабины (Настройки)
                </h2>
              </div>

              {/* Tab navigation */}
              <div className="grid grid-cols-4 gap-1 bg-[#0b0c0e] p-1 rounded-[2px] border border-white/[0.08]">
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
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 rounded-[2px] text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[#1e222a] text-[#f0f3f6] border border-[#c68a35]/50 shadow' 
                          : 'text-[#8b929e] hover:text-[#f0f3f6] hover:bg-white/[0.04]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-[#e5a94e]" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab options wrapper */}
              <div className="bg-[#14161a] border border-white/[0.08] rounded-[2px] p-4 min-h-[180px] max-h-[220px] overflow-y-auto space-y-4">
                
                {/* Graphics */}
                {settingsTab === 'graphics' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-xs font-bold text-[#f0f3f6]">Ограничение FPS</div>
                        <div className="text-[10px] text-[#8b929e] mt-0.5">Лимит частоты смены кадров рендеринга</div>
                      </div>
                      <div className="flex gap-1">
                        {[60, 120, 0].map((limit) => (
                          <button
                            key={limit}
                            type="button"
                            onClick={() => onUpdateSettings({ ...settings, fpsLimit: limit })}
                            className={`px-3 py-1.5 rounded-[2px] text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              settings.fpsLimit === limit 
                                ? 'bg-[#c68a35]/20 text-[#e5a94e] border border-[#c68a35]/60' 
                                : 'bg-white/[0.04] text-[#8b929e] hover:bg-white/[0.08] border border-white/10'
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
                        <div className="text-xs font-bold text-[#f0f3f6]">Глобальный звук</div>
                        <div className="text-[10px] text-[#8b929e] mt-0.5">Звук мотора автомобиля, сирен и окружения</div>
                      </div>
                      <button
                        type="button"
                        onClick={onToggleMute}
                        className={`min-h-[38px] px-4 py-1.5 rounded-[2px] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          isMuted 
                            ? 'bg-red-950/40 text-red-300 border border-red-800/40' 
                            : 'bg-white/[0.05] text-[#f0f3f6] hover:bg-white/[0.08] border border-white/10'
                        }`}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#e5a94e]" />}
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
                        <div className="text-xs font-bold text-[#f0f3f6]">Автосохранение</div>
                        <div className="text-[10px] text-[#8b929e] mt-0.5">Интервал автоматической записи прогресса рейса</div>
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
                            className={`px-3 py-1.5 rounded-[2px] text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              settings.autoSaveInterval === opt.val 
                                ? 'bg-[#c68a35]/20 text-[#e5a94e] border border-[#c68a35]/60' 
                                : 'bg-white/[0.04] text-[#8b929e] hover:bg-white/[0.08] border border-white/10'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                      <div>
                        <div className="text-xs font-bold text-[#f0f3f6]">Время суток</div>
                        <div className="text-[10px] text-[#8b929e] mt-0.5">Циклическая смена дня и ночи в симуляторе</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, timeAutoCycle: !settings.timeAutoCycle })}
                        className={`w-10 h-5 rounded-[2px] p-0.5 transition-all cursor-pointer border ${
                          settings.timeAutoCycle ? 'bg-[#c68a35]/30 border-[#c68a35] flex justify-end' : 'bg-black/60 border-white/10 flex justify-start'
                        }`}
                      >
                        <div className="w-3.5 h-3.5 rounded-[1px] bg-[#c68a35]" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Controls */}
                {settingsTab === 'controls' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-bold text-[#f0f3f6]">Чувствительность мыши</div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={settings.mouseSensitivity}
                          onChange={(e) => onUpdateSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) })}
                          className="w-full accent-[#c68a35] cursor-pointer h-1.5 bg-[#0b0c0e] rounded-[1px] appearance-none"
                        />
                        <span className="text-xs font-mono font-bold text-[#e5a94e] shrink-0">{settings.mouseSensitivity.toFixed(1)}x</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#8b929e] bg-[#0b0c0e] p-2.5 rounded-[2px] border border-white/[0.08] leading-relaxed font-mono">
                      Управление авто: <span className="text-white font-bold">WASD / Стрелки</span> • Ручник: <span className="text-white font-bold">Пробел</span> • Свет фар: <span className="text-white font-bold">L</span> • Поворотники: <span className="text-white font-bold">Z / C</span> • Аварийка: <span className="text-white font-bold">X</span> • Инвентарь: <span className="text-white font-bold">I</span> • Самоосмотр: <span className="text-white font-bold">C</span> • Пауза: <span className="text-white font-bold">ESC</span>.
                    </div>
                  </div>
                )}

              </div>

              <button
                type="button"
                onClick={() => setScreen('main')}
                className="w-full min-h-[42px] py-2 bg-[#1e222a] hover:bg-[#282c36] border border-white/10 text-[#f0f3f6] font-bold text-xs uppercase tracking-wider rounded-[2px] transition-all cursor-pointer"
              >
                Сохранить параметры
              </button>
            </div>
          )}

          {/* SCREEN: ABOUT */}
          {screen === 'about' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <button
                  type="button"
                  onClick={() => setScreen('main')}
                  className="min-h-[40px] flex items-center gap-2 text-xs font-bold text-[#8b929e] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Назад
                </button>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                  Бортовой журнал симулятора (Справка)
                </h2>
              </div>

              <div className="bg-[#14161a] border border-white/[0.08] rounded-[2px] p-4 max-h-[300px] overflow-y-auto space-y-3 text-xs text-[#8b929e] leading-relaxed">
                <p>
                  <strong className="text-white">Степной Тракт 2D</strong> — транспортно-логистическая песочница с физикой сцепления, детальной системой ДВС и интерактивным миром.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-3 bg-[#0b0c0e] rounded-[2px] border border-white/[0.08]">
                    <div className="font-bold text-[#e5a94e] mb-0.5 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Обслуживание ДВС</span>
                    </div>
                    <div className="text-[11px] text-[#8b929e]">Проверка уровня антифриза и масла, замена фильтров, свечей и аккумулятора.</div>
                  </div>
                  <div className="p-3 bg-[#0b0c0e] rounded-[2px] border border-white/[0.08]">
                    <div className="font-bold text-[#e5a94e] mb-0.5 flex items-center gap-1.5">
                      <TreePine className="w-3.5 h-3.5" />
                      <span>Локации и Трассы</span>
                    </div>
                    <div className="text-[11px] text-[#8b929e]">Городские кварталы, сельская местность, промзоны и лесные заповедники.</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScreen('main')}
                className="w-full min-h-[42px] py-2 bg-[#1e222a] hover:bg-[#282c36] text-[#f0f3f6] font-bold text-xs uppercase tracking-wider rounded-[2px] transition-all cursor-pointer border border-white/10"
              >
                Закрыть справку
              </button>
            </div>
          )}

        </div>

        {/* VERSION FOOTER */}
        <div className="border-t border-white/[0.08] bg-[#14161a] px-6 py-3 text-center text-[10px] text-[#8b929e] flex items-center justify-between font-mono shrink-0">
          <span>СТЕПНОЙ ТРАКТ 2D</span>
          <span className="text-[#e5a94e] font-bold">0.33.2 - RELEASE</span>
        </div>

      </div>

    </div>
  );
};

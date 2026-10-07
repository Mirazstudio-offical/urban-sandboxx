import React, { useState } from 'react';
import { hasCustomSavedMap, clearCustomMapStorage } from '../loadMap';
import { 
  Play, 
  Settings, 
  PlusCircle, 
  Trash2, 
  Volume2, 
  VolumeX, 
  HardDrive, 
  Compass, 
  Gamepad2, 
  ArrowLeft,
  Monitor,
  Clock,
  Info,
  TreePine,
  Building2,
  Home,
  Truck,
  Globe,
  Radio,
  User,
  Car,
  Shield,
  RotateCcw,
  Check,
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
  onCreateSave?: (name?: string) => void;
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
    icon: <TreePine className="w-4 h-4 text-[#c68a35]" />
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Площадь Администрации (Центр)',
    x: 4350,
    y: 2000,
    description: 'Официальный центр города, парковка перед госучреждениями и проспекты.',
    icon: <Building2 className="w-4 h-4 text-[#8b929e]" />
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Двор (Хрущёвки & Гаражи)',
    x: 2750,
    y: 2750,
    description: 'Панельные пятиэтажки, детская площадка из детства, гаражные боксы и берёзы.',
    icon: <Home className="w-4 h-4 text-[#c68a35]" />
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Yard',
    nameRu: 'Промзона (Автобаза №4 & Склады)',
    x: 6530,
    y: 1030,
    description: 'Грузовые ангары, авторемонтные ямы, стоянка спецтехники и плиты перекрытий.',
    icon: <Truck className="w-4 h-4 text-[#8b929e]" />
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

  const hasSaves = saves.length > 0;
  const latestSave = hasSaves ? saves[0] : null;

  const handleStartNewGameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = newGameName.trim() || 'Новая сессия';
    onNewGame(finalName, selectedSpawnId);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0b0c0e]/90 backdrop-blur-md text-[#f0f3f6] font-sans select-none animate-in fade-in duration-150 p-4 overflow-y-auto">
      
      {/* Container Card - BeamNG Rectangular Slate Panel */}
      <div className={`relative z-10 w-full ${screen === 'new_game' || screen === 'settings' ? 'max-w-lg' : 'max-w-md'} bg-[rgba(20,22,26,0.95)] border border-white/10 rounded-[2px] shadow-2xl flex flex-col p-6 md:p-8 transition-all`}>
        
        {/* ========================================================================= */}
        {/* 1. SCREEN: MAIN MENU                                                      */}
        {/* ========================================================================= */}
        {screen === 'main' && (
          <>
            {/* Header */}
            <div className="mb-6 border-b border-white/[0.08] pb-4">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[#c68a35] uppercase mb-1">
                <Compass className="w-3.5 h-3.5" />
                <span>ТРАНСПОРТНЫЙ СИМУЛЯТОР</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">
                ГЛАВНОЕ МЕНЮ
              </h2>
              <p className="text-xs text-[#8b929e] mt-0.5">
                Степной тракт 2D • Выберите действие
              </p>
            </div>

            {/* Buttons List */}
            <div className="flex flex-col gap-2">
              
              {/* 1. Continue / Start session */}
              {hasSaves && latestSave ? (
                <button
                  onClick={() => onLoadSave(latestSave.id)}
                  className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Play className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors fill-current/20" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Продолжить поездку</span>
                    <span className="text-[10px] text-[#8b929e] truncate max-w-[240px]">{latestSave.name}</span>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setScreen('new_game')}
                  className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Play className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors fill-current/20" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Начать поездку</span>
                    <span className="text-[10px] text-[#8b929e]">Первый выезд на трассу</span>
                  </div>
                </button>
              )}

              {/* 2. New Game Setup */}
              <button
                onClick={() => setScreen('new_game')}
                className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                <PlusCircle className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Новый выезд</span>
                  <span className="text-[10px] text-[#8b929e]">Выбрать точку старта и имя водителя</span>
                </div>
              </button>

              {/* 3. Saves Archive */}
              <button
                onClick={() => setScreen('saves')}
                className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                <HardDrive className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Архив поездок</span>
                  <span className="text-[10px] text-[#8b929e]">Сохранённые сессии ({saves.length})</span>
                </div>
              </button>

              {/* 4. Driver Profile (Cloud DB Sync) */}
              {onOpenProfile && (
                <button
                  onClick={onOpenProfile}
                  className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <User className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Личное дело & Облако</span>
                    <span className="text-[10px] text-[#8b929e]">Личное дело водителя и синхронизация</span>
                  </div>
                </button>
              )}

              {/* 5. Online P2P multiplayer */}
              {onOpenOnline && (
                <button
                  onClick={onOpenOnline}
                  className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Globe className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Онлайн режим P2P</span>
                    <span className="text-[10px] text-[#8b929e]">Диспетчерская комната и совместный рейс</span>
                  </div>
                </button>
              )}

              {/* 6. Settings */}
              <button
                onClick={() => setScreen('settings')}
                className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                <Settings className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Настройка кабины</span>
                  <span className="text-[10px] text-[#8b929e]">Графика, звук, физика и управление</span>
                </div>
              </button>

              {/* 7. Guides & Handbook */}
              <button
                onClick={() => setScreen('about')}
                className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                <Info className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Справочник водителя</span>
                  <span className="text-[10px] text-[#8b929e]">Управление, механики и правила мира</span>
                </div>
              </button>

              {/* 8. Custom Map Storage Reset */}
              {hasCustomSavedMap() && (
                <button
                  onClick={() => {
                    clearCustomMapStorage();
                    window.location.reload();
                  }}
                  className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[#c68a35]/15 border border-[#c68a35]/30 hover:border-[#c68a35]/60 rounded-[2px] transition-all text-left cursor-pointer overflow-hidden mt-1"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Wrench className="w-4 h-4 text-[#c68a35]" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#e5a94e]">Сбросить карту редактора</span>
                    <span className="text-[10px] text-[#8b929e]">Очистить локальный кэш карты</span>
                  </div>
                </button>
              )}

            </div>

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-[#8b929e]">
              <span>СТЕПНОЙ ТРАКТ 2D</span>
              <span className="text-[#c68a35] font-bold">0.33.2 RELEASE</span>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* 2. SCREEN: SAVES LIST                                                     */}
        {/* ========================================================================= */}
        {screen === 'saves' && (
          <>
            {/* Header */}
            <div className="mb-6 border-b border-white/[0.08] pb-4">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[#c68a35] uppercase mb-1">
                <HardDrive className="w-3.5 h-3.5" />
                <span>АРХИВ ПОЕЗДОК</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">
                СОХРАНЁННЫЕ РЕЙСЫ
              </h2>
              <p className="text-xs text-[#8b929e] mt-0.5">
                Выберите ведомость для продолжения или удаления
              </p>
            </div>

            {/* Saves Container */}
            <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
              {saves.length === 0 ? (
                <div className="text-center py-10 text-[#8b929e] text-xs font-mono bg-[rgba(20,22,26,0.82)] border border-white/[0.08] rounded-[2px] p-6">
                  Нет зарегистрированных рейсов в архиве
                </div>
              ) : (
                saves.map((save) => (
                  <div
                    key={save.id}
                    className="group relative flex items-center justify-between gap-3 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 rounded-[2px] transition-all overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div 
                      className="flex flex-col flex-1 cursor-pointer overflow-hidden"
                      onClick={() => onLoadSave(save.id)}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white truncate">
                        {save.name}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-[#8b929e] font-mono mt-0.5">
                        <span>{save.date}</span>
                        <span>•</span>
                        <span>{save.streetName || (save.isInVehicle ? 'За рулём' : 'Пешком')}</span>
                        <span>•</span>
                        <span className="text-[#c68a35]">{save.timeHour?.toFixed(1) || '10.0'}ч</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onLoadSave(save.id)}
                        className="px-3 py-1.5 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-mono text-[10px] font-extrabold uppercase rounded-[2px] transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>В рейс</span>
                      </button>
                      <button
                        onClick={() => onDeleteSave(save.id)}
                        className="p-1.5 bg-white/[0.05] hover:bg-rose-950/60 text-[#8b929e] hover:text-rose-400 border border-white/10 hover:border-rose-900/40 rounded-[2px] transition-all cursor-pointer"
                        title="Удалить сохранение"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Back Button */}
            <div className="mt-6 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setScreen('main')}
                className="group relative w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 rounded-[2px] transition-all text-xs font-bold uppercase tracking-wider text-[#f0f3f6] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                <span>Назад в меню</span>
              </button>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* 3. SCREEN: NEW GAME SETUP                                                 */}
        {/* ========================================================================= */}
        {screen === 'new_game' && (
          <form onSubmit={handleStartNewGameSubmit}>
            {/* Header */}
            <div className="mb-6 border-b border-white/[0.08] pb-4">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[#c68a35] uppercase mb-1">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>МАРШРУТНЫЙ ЛИСТ</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">
                НОВЫЙ ВЫЕЗД
              </h2>
              <p className="text-xs text-[#8b929e] mt-0.5">
                Заполните данные водителя и выберите точку старта
              </p>
            </div>

            <div className="flex flex-col gap-4 max-h-[380px] overflow-y-auto pr-1">
              
              {/* Driver Name Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8b929e]">
                  ИМЯ ВОДИТЕЛЯ В ПТС:
                </label>
                <input
                  type="text"
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  maxLength={32}
                  required
                  placeholder="Введите имя..."
                  className="w-full bg-[rgba(20,22,26,0.82)] border border-white/10 focus:border-[#c68a35] rounded-[2px] px-3.5 py-2.5 text-[#f0f3f6] text-xs font-mono font-bold focus:outline-none transition-colors"
                />
              </div>

              {/* Spawn Locations List */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8b929e]">
                  ТОЧКА ВЫЕЗДА:
                </label>

                <div className="flex flex-col gap-2">
                  {spawnLocations.map((loc) => {
                    const isSelected = selectedSpawnId === loc.id;
                    return (
                      <div
                        key={loc.id}
                        onClick={() => setSelectedSpawnId(loc.id)}
                        className={`group relative flex items-start gap-3 px-3.5 py-2.5 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border ${
                          isSelected ? 'border-[#c68a35] shadow-[0_2px_12px_rgba(198,138,53,0.15)]' : 'border-white/[0.08] hover:border-[#c68a35]/40'
                        } rounded-[2px] transition-all cursor-pointer overflow-hidden`}
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} />
                        <div className="mt-0.5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors">
                          {loc.icon}
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-[#e5a94e]' : 'text-[#f0f3f6]'}`}>
                            {loc.nameRu}
                          </span>
                          <span className="text-[10px] text-[#8b929e] mt-0.5 leading-relaxed">
                            {loc.description}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="mt-6 pt-3 border-t border-white/[0.08] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScreen('main')}
                className="group relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 rounded-[2px] transition-all text-xs font-bold uppercase tracking-wider text-[#f0f3f6] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                <span>Назад</span>
              </button>

              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-mono text-xs font-extrabold uppercase tracking-wider rounded-[2px] transition-all cursor-pointer shadow-md"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Выехать в рейс</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* 4. SCREEN: SETTINGS                                                       */}
        {/* ========================================================================= */}
        {screen === 'settings' && (
          <>
            {/* Header */}
            <div className="mb-6 border-b border-white/[0.08] pb-4">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[#c68a35] uppercase mb-1">
                <Settings className="w-3.5 h-3.5" />
                <span>ТЕХНИЧЕСКИЙ ФОРМУЛЯР</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">
                НАСТРОЙКИ КАБИНЫ
              </h2>
              <p className="text-xs text-[#8b929e] mt-0.5">
                Параметры графики, звука, мира и управления
              </p>
            </div>

            {/* Settings Tabs */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {[
                { id: 'graphics', label: 'Вид', icon: Monitor },
                { id: 'audio', label: 'Аудио', icon: Volume2 },
                { id: 'gameplay', label: 'Мир', icon: Clock },
                { id: 'controls', label: 'Кабина', icon: Gamepad2 }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = settingsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSettingsTab(tab.id as SettingsTab)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded-[2px] transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[rgba(35,38,45,0.95)] border-[#c68a35] text-[#e5a94e]'
                        : 'bg-[rgba(20,22,26,0.82)] border-white/[0.08] text-[#8b929e] hover:text-[#f0f3f6]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="bg-[rgba(20,22,26,0.82)] border border-white/[0.08] rounded-[2px] p-4 min-h-[160px] max-h-[220px] overflow-y-auto space-y-4">
              
              {/* Graphics */}
              {settingsTab === 'graphics' && (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6]">Лимит FPS</div>
                    <div className="text-[10px] text-[#8b929e]">Ограничение частоты кадров рендера</div>
                  </div>
                  <div className="flex gap-1">
                    {[60, 120, 0].map((limit) => (
                      <button
                        key={limit}
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, fpsLimit: limit })}
                        className={`px-3 py-1.5 rounded-[2px] text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                          settings.fpsLimit === limit 
                            ? 'bg-[#c68a35]/20 text-[#e5a94e] border-[#c68a35]' 
                            : 'bg-white/[0.04] text-[#8b929e] border-white/10 hover:bg-white/[0.08]'
                        }`}
                      >
                        {limit === 0 ? 'Без лимита' : `${limit} FPS`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio */}
              {settingsTab === 'audio' && (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6]">Общий звук</div>
                    <div className="text-[10px] text-[#8b929e]">Двигатель, подвеска, сирены и радио</div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleMute}
                    className={`px-3.5 py-1.5 rounded-[2px] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                      isMuted 
                        ? 'bg-rose-950/40 text-rose-300 border-rose-800/40' 
                        : 'bg-[#c68a35]/20 text-[#e5a94e] border-[#c68a35]'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>{isMuted ? 'Выключен' : 'Включен'}</span>
                  </button>
                </div>
              )}

              {/* Gameplay */}
              {settingsTab === 'gameplay' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6]">Автосохранение</div>
                      <div className="text-[10px] text-[#8b929e]">Периодичность записи рейса</div>
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
                          className={`px-3 py-1.5 rounded-[2px] text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                            settings.autoSaveInterval === opt.val 
                              ? 'bg-[#c68a35]/20 text-[#e5a94e] border-[#c68a35]' 
                              : 'bg-white/[0.04] text-[#8b929e] border-white/10 hover:bg-white/[0.08]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6]">Цикл дня и ночи</div>
                      <div className="text-[10px] text-[#8b929e]">Автоматический ход времени суток</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, timeAutoCycle: !settings.timeAutoCycle })}
                      className={`px-3 py-1.5 rounded-[2px] text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                        settings.timeAutoCycle
                          ? 'bg-[#c68a35]/20 text-[#e5a94e] border-[#c68a35]'
                          : 'bg-white/[0.04] text-[#8b929e] border-white/10'
                      }`}
                    >
                      {settings.timeAutoCycle ? 'Включен' : 'Отключен'}
                    </button>
                  </div>
                </div>
              )}

              {/* Controls */}
              {settingsTab === 'controls' && (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6]">Чувствительность мыши</div>
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
                    <span className="text-white font-bold">WASD</span>: Движение • <span className="text-white font-bold">Пробел</span>: Ручник • <span className="text-white font-bold">L</span>: Фары • <span className="text-white font-bold">Z/C</span>: Повороты • <span className="text-white font-bold">X</span>: Аварийка • <span className="text-white font-bold">I</span>: Инвентарь • <span className="text-white font-bold">ESC</span>: Пауза.
                  </div>
                </div>
              )}

            </div>

            {/* Back Button */}
            <div className="mt-6 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setScreen('main')}
                className="group relative w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 rounded-[2px] transition-all text-xs font-bold uppercase tracking-wider text-[#f0f3f6] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                <span>Назад в меню</span>
              </button>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* 5. SCREEN: ABOUT / HANDBOOK                                               */}
        {/* ========================================================================= */}
        {screen === 'about' && (
          <>
            {/* Header */}
            <div className="mb-6 border-b border-white/[0.08] pb-4">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[#c68a35] uppercase mb-1">
                <Info className="w-3.5 h-3.5" />
                <span>БОРТОВОЙ ЖУРНАЛ</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">
                СПРАВОЧНИК ВОДИТЕЛЯ
              </h2>
              <p className="text-xs text-[#8b929e] mt-0.5">
                Основные механики и системы симулятора
              </p>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              
              <div className="p-3 bg-[rgba(20,22,26,0.82)] border border-white/[0.08] rounded-[2px]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#e5a94e] mb-1">
                  1. Физика сцепления и ДВС
                </div>
                <p className="text-[11px] text-[#8b929e] leading-relaxed">
                  Машины симулируют массу, нагрузку на оси, пробуксовку шин и нагрев двигателя. Перегрев и отсутствие масла приведут к заклиниванию мотора.
                </p>
              </div>

              <div className="p-3 bg-[rgba(20,22,26,0.82)] border border-white/[0.08] rounded-[2px]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#e5a94e] mb-1">
                  2. Потребности и отдых
                </div>
                <p className="text-[11px] text-[#8b929e] leading-relaxed">
                  Водителю требуется отдых и поддержание энергии. Сон в кровати или на диване восстанавливает бодрость в зависимости от комфорта.
                </p>
              </div>

              <div className="p-3 bg-[rgba(20,22,26,0.82)] border border-white/[0.08] rounded-[2px]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#e5a94e] mb-1">
                  3. Инфраструктура и АЗС
                </div>
                <p className="text-[11px] text-[#8b929e] leading-relaxed">
                  Пополняйте бак на заправочных станциях нужной маркой топлива (АИ-92, АИ-95, ДТ, Пропан). Оплата производится на кассе оператора.
                </p>
              </div>

            </div>

            {/* Back Button */}
            <div className="mt-6 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setScreen('main')}
                className="group relative w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 rounded-[2px] transition-all text-xs font-bold uppercase tracking-wider text-[#f0f3f6] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                <span>Назад в меню</span>
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Settings, 
  Trash2, 
  Volume2, 
  VolumeX, 
  HardDrive, 
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
  User,
  Sliders,
  Check,
  RotateCcw,
  PlusCircle,
  X,
  Compass,
  Car,
  MapPin,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { formatGameDate, formatGameTime, getRussianSeasonName } from '../calendarSystem';
import { hasCustomSavedMap, clearCustomMapStorage } from '../loadMap';

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
  calendar?: any;
  season?: string;
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

const DEFAULT_SPAWNS: SpawnLocation[] = [
  {
    id: 'central_park',
    name: 'Central Park Promenade',
    nameRu: 'Городской Сквер (Фонтан & Сквер)',
    x: 4400,
    y: 2800,
    description: 'Парковый фонтан, асфальтированные аллеи, пешеходная зона и кольцевые проезды.',
    icon: <TreePine className="w-5 h-5 text-[#c68a35]" />
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Площадь Администрации (Центр)',
    x: 4350,
    y: 2000,
    description: 'Официальный центр города, парковка перед госучреждениями и широкий центральный проспект.',
    icon: <Building2 className="w-5 h-5 text-[#c68a35]" />
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Двор (Хрущёвки & Гаражи)',
    x: 2750,
    y: 2750,
    description: 'Панельные пятиэтажки, детская площадка, гаражные боксы и узкие дворовые проезды.',
    icon: <Home className="w-5 h-5 text-[#c68a35]" />
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Yard',
    nameRu: 'Промзона (Автобаза №4 & Склады)',
    x: 6530,
    y: 1030,
    description: 'Грузовые ангары, ремонтные ямы, стоянка спецтехники и дорожные бетонные плиты.',
    icon: <Truck className="w-5 h-5 text-[#c68a35]" />
  }
];

const LOADING_TIPS = [
  'Совет: следите за уровнем моторного масла и температурой охлаждающей жидкости.',
  'Совет: стояночный ручной тормоз (Пробел) помогает при резких поворотах и парковке.',
  'Совет: заправляйте автомобиль подходящей маркой топлива на АЗС (АИ-92, АИ-95, ДТ).',
  'Совет: усталость снижает реакцию водителя — отдыхайте на кроватях в жилых домах.',
  'Совет: клавиша E открывает капот для заливки масла и осмотра двигателя.'
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
  // Navigation State
  const [activeModal, setActiveModal] = useState<'none' | 'play' | 'settings' | 'account'>('none');
  const [playTab, setPlayTab] = useState<'saves' | 'new_game'>('saves');
  const [settingsTab, setSettingsTab] = useState<'graphics' | 'audio' | 'gameplay' | 'controls'>('graphics');
  
  // New Game Form
  const [newGameName, setNewGameName] = useState<string>('Водитель #1');
  const [selectedSpawnId, setSelectedSpawnId] = useState<string>(spawnLocations[0]?.id || 'central_park');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Loading Simulation State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingStageText, setLoadingStageText] = useState<string>('Инициализация мира...');
  const [loadingTipIndex, setLoadingTipIndex] = useState<number>(0);

  // Audio Click Feedback
  const playUiSound = (freq = 800) => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeModal !== 'none') {
          setActiveModal('none');
          playUiSound(500);
        } else {
          onResume();
          playUiSound(600);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, onResume]);

  // Trigger Authentic Game Loading Screen
  const executeWithLoading = (onComplete: () => void) => {
    setIsLoading(true);
    setLoadingProgress(10);
    setLoadingTipIndex(Math.floor(Math.random() * LOADING_TIPS.length));
    setLoadingStageText('Инициализация физики шасси и подвески...');

    setTimeout(() => {
      setLoadingProgress(45);
      setLoadingStageText('Построение дорожного полотна и перекрёстков...');
    }, 200);

    setTimeout(() => {
      setLoadingProgress(75);
      setLoadingStageText('Синхронизация светофоров и трафика...');
    }, 450);

    setTimeout(() => {
      setLoadingProgress(100);
      setLoadingStageText('Прогрев двигателя. Выезд на трассу...');
    }, 700);

    setTimeout(() => {
      setIsLoading(false);
      onComplete();
    }, 900);
  };

  const handleStartNewGame = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    playUiSound(950);
    const finalName = newGameName.trim() || 'Водитель #1';
    executeWithLoading(() => {
      onNewGame(finalName, selectedSpawnId);
    });
  };

  const handleLoadSaveSlot = (saveId: string) => {
    playUiSound(950);
    executeWithLoading(() => {
      onLoadSave(saveId);
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between text-[#f0f3f6] font-sans select-none overflow-hidden bg-[#0b0c0e]/80 backdrop-blur-md">
      
      {/* ========================================================================= */}
      {/* 1. REAL IN-GAME MAP CANVAS / TOPOGRAPHIC SCHEMATIC BACKGROUND             */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle Map Road Network Grid */}
        <svg className="w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="roadGridPattern" width="160" height="160" patternUnits="userSpaceOnUse">
              <path d="M 0 80 L 160 80 M 80 0 L 80 160" stroke="#ffffff" strokeWidth="6" strokeDasharray="16 8" />
              <circle cx="80" cy="80" r="14" fill="none" stroke="#c68a35" strokeWidth="3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#roadGridPattern)" />
        </svg>

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0e] via-transparent to-[#0b0c0e]/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c0e]/90 via-transparent to-[#0b0c0e]/90" />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP BANNER: STEPPE HIGHWAY 2D (AUTHENTIC SHARP LOGO)                   */}
      {/* ========================================================================= */}
      <div className="relative z-10 pt-10 sm:pt-14 flex flex-col items-center justify-center pointer-events-auto">
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#14171d]/90 border border-white/10 rounded-[2px] shadow-2xl">
          <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_12px_rgba(198,138,53,0.5)]" />
          <div className="flex flex-col pr-1">
            <h1 className="text-xl sm:text-2xl font-black italic tracking-wider text-white uppercase font-sans leading-none">
              СТЕПНОЙ ТРАКТ <span className="text-[#c68a35]">2D</span>
            </h1>
            <span className="text-[9px] font-mono font-bold tracking-widest text-[#8b929e] uppercase mt-0.5">
              РЕАЛИСТИЧНЫЙ ТРАНСПОРТНЫЙ СИМУЛЯТОР
            </span>
          </div>
          <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_12px_rgba(198,138,53,0.5)]" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CENTRAL HORIZONTAL BUTTON DOCK (EXACTLY AS IN BEAMNG REFERENCE)        */}
      {/* ========================================================================= */}
      {activeModal === 'none' && !isLoading && (
        <div className="relative z-20 pb-16 sm:pb-24 px-4 flex flex-col items-center justify-center animate-in fade-in duration-150">
          
          <div className="flex flex-wrap items-stretch justify-center gap-2 max-w-4xl w-full">
            
            {/* 1. LARGE PRIMARY PLAY BUTTON */}
            <button
              onClick={() => {
                playUiSound(880);
                setActiveModal('play');
                setPlayTab(saves.length > 0 ? 'saves' : 'new_game');
              }}
              className="group relative flex items-center justify-center gap-4 px-8 py-5 min-w-[200px] sm:min-w-[240px] bg-[#14171d]/90 hover:bg-[#1b1f27] border-2 border-[#c68a35] hover:shadow-[0_0_24px_rgba(198,138,53,0.35)] rounded-[3px] transition-all cursor-pointer overflow-hidden"
            >
              <div className="w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-l-[15px] border-l-[#c68a35] group-hover:scale-110 transition-transform" />
              <div className="flex flex-col text-left">
                <span className="text-lg sm:text-xl font-black italic uppercase tracking-wider text-white font-sans leading-tight">
                  ИГРАТЬ
                </span>
                <span className="text-[10px] text-[#c68a35] font-mono tracking-wide">
                  {saves.length > 0 ? `Рейсов в архиве: ${saves.length}` : 'Новый выезд'}
                </span>
              </div>
            </button>

            {/* 2. SETTINGS BUTTON */}
            <button
              onClick={() => {
                playUiSound(750);
                setActiveModal('settings');
              }}
              className="group relative flex items-center justify-center gap-3 px-6 py-5 min-w-[150px] bg-[#14171d]/90 hover:bg-[#1b1f27] border border-white/10 hover:border-[#c68a35] rounded-[3px] transition-all cursor-pointer"
            >
              <Sliders className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  НАСТРОЙКИ
                </span>
                <span className="text-[9px] text-[#8b929e] font-mono">
                  Графика, звук, клавиши
                </span>
              </div>
            </button>

            {/* 3. ACCOUNT BUTTON */}
            <button
              onClick={() => {
                playUiSound(750);
                if (onOpenProfile) {
                  onOpenProfile();
                } else {
                  setActiveModal('account');
                }
              }}
              className="group relative flex items-center justify-center gap-3 px-6 py-5 min-w-[150px] bg-[#14171d]/90 hover:bg-[#1b1f27] border border-white/10 hover:border-[#c68a35] rounded-[3px] transition-all cursor-pointer"
            >
              <User className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  АККАУНТ
                </span>
                <span className="text-[9px] text-[#8b929e] font-mono">
                  Профиль & Облако
                </span>
              </div>
            </button>

            {/* 4. ONLINE P2P BUTTON */}
            {onOpenOnline && (
              <button
                onClick={() => {
                  playUiSound(750);
                  onOpenOnline();
                }}
                className="group relative flex items-center justify-center gap-3 px-6 py-5 min-w-[150px] bg-[#14171d]/90 hover:bg-[#1b1f27] border border-white/10 hover:border-[#c68a35] rounded-[3px] transition-all cursor-pointer"
              >
                <Globe className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                    ОНЛАЙН
                  </span>
                  <span className="text-[9px] text-[#8b929e] font-mono">
                    Сетевая комната P2P
                  </span>
                </div>
              </button>
            )}

            {/* 5. RESUME CURRENT RUN (IF APPLICABLE) */}
            <button
              onClick={() => {
                playUiSound(900);
                onResume();
              }}
              className="group relative flex items-center justify-center gap-2 px-5 py-5 bg-[#14171d]/90 hover:bg-[#1b1f27] border border-white/10 hover:border-white/30 rounded-[3px] transition-all cursor-pointer"
              title="Вернуться к текущей симуляции (ESC)"
            >
              <RotateCcw className="w-4 h-4 text-[#8b929e] group-hover:text-white transition-colors" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#8b929e] group-hover:text-white font-mono">
                В ИГРУ
              </span>
            </button>

          </div>

          {/* Quick Controls Tip */}
          <div className="mt-6 flex items-center gap-3 text-[11px] font-mono text-[#8b929e]">
            <span>ВЫБОР КНОПКИ МЫШЬЮ</span>
            <span aria-hidden="true">·</span>
            <span>ESC: ЗАКРЫТЬ / ВЕРНУТЬСЯ В ИГРУ</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: PLAY (MODERN TILE GRIDS FOR SAVES & SPAWN POINTS)               */}
      {/* ========================================================================= */}
      {activeModal === 'play' && !isLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-[#12151b] border-2 border-[#c68a35] rounded-[3px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161a22]">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-6 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_10px_rgba(198,138,53,0.5)]" />
                <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-wider text-white font-sans">
                  ВЫЕЗД НА ТРАССУ
                </h2>
                <span className="text-[11px] font-mono text-[#8b929e] hidden sm:inline">
                  · Выберите сохранённую сессию или создайте новый рейс
                </span>
              </div>
              <button
                onClick={() => {
                  playUiSound(500);
                  setActiveModal('none');
                }}
                className="p-1.5 text-[#8b929e] hover:text-white hover:bg-white/10 rounded-[2px] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Play Tabs Switcher */}
            <div className="px-6 pt-4 pb-3 flex gap-3 border-b border-white/[0.08] bg-[#12151b]">
              <button
                onClick={() => {
                  playUiSound(700);
                  setPlayTab('saves');
                }}
                className={`flex items-center gap-2 px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded-[2px] transition-all cursor-pointer border ${
                  playTab === 'saves'
                    ? 'bg-[#c68a35] text-black border-[#c68a35] font-black shadow-[0_0_12px_rgba(198,138,53,0.3)]'
                    : 'bg-[#181c24] text-[#8b929e] border-white/10 hover:text-white hover:bg-[#1e232d]'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Архив сохранений ({saves.length})</span>
              </button>

              <button
                onClick={() => {
                  playUiSound(700);
                  setPlayTab('new_game');
                }}
                className={`flex items-center gap-2 px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded-[2px] transition-all cursor-pointer border ${
                  playTab === 'new_game'
                    ? 'bg-[#c68a35] text-black border-[#c68a35] font-black shadow-[0_0_12px_rgba(198,138,53,0.3)]'
                    : 'bg-[#181c24] text-[#8b929e] border-white/10 hover:text-white hover:bg-[#1e232d]'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Новый заезд</span>
              </button>
            </div>

            {/* TAB 1: SAVES ARCHIVE AS MODERN TILES */}
            {playTab === 'saves' && (
              <div className="p-6 flex-1 overflow-y-auto">
                {saves.length === 0 ? (
                  <div className="py-16 px-6 text-center bg-[#161a22] border border-white/10 rounded-[3px] space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-full bg-[#c68a35]/10 border border-[#c68a35]/30 flex items-center justify-center text-[#c68a35]">
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white font-sans">
                        Архив поездок пуст
                      </h3>
                      <p className="text-xs font-mono text-[#8b929e] mt-1 max-w-md mx-auto">
                        У вас пока нет сохранённых рейсов на Степном Тракте. Начните первый заезд!
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        playUiSound(700);
                        setPlayTab('new_game');
                      }}
                      className="px-6 py-2.5 bg-[#c68a35] text-black font-mono text-xs font-black uppercase rounded-[2px] hover:bg-[#d8963e] transition-colors cursor-pointer shadow-md inline-flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Начать первую поездку</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {saves.map((save) => {
                      const isConfirming = confirmDeleteId === save.id;
                      return (
                        <div
                          key={save.id}
                          className="group relative flex flex-col justify-between bg-[#161a22] hover:bg-[#1a1f29] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_4px_20px_rgba(198,138,53,0.18)] rounded-[3px] p-4 transition-all"
                        >
                          {/* Ochre Accent Edge */}
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity rounded-l-[3px]" />

                          {/* Tile Header: Name & Mode */}
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 rounded-[2px] bg-[#c68a35]/15 border border-[#c68a35]/30 text-[#c68a35] shrink-0">
                                  {save.isInVehicle ? <Car className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-sm font-black uppercase tracking-wider text-white truncate font-sans group-hover:text-[#c68a35] transition-colors">
                                    {save.name}
                                  </h3>
                                  <div className="text-[10px] font-mono text-[#c68a35] font-bold">
                                    {save.isInVehicle ? 'За рулём техники' : 'Пеший режим'}
                                  </div>
                                </div>
                              </div>

                              {/* Delete Action with Confirmation */}
                              {isConfirming ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      playUiSound(500);
                                      onDeleteSave(save.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-mono text-[10px] font-bold uppercase rounded-[2px] transition-all cursor-pointer"
                                  >
                                    Удалить?
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="p-1 text-[#8b929e] hover:text-white"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    playUiSound(500);
                                    setConfirmDeleteId(save.id);
                                  }}
                                  className="p-1.5 bg-white/[0.04] hover:bg-rose-950/60 text-[#8b929e] hover:text-rose-400 border border-white/10 hover:border-rose-900/40 rounded-[2px] transition-all cursor-pointer"
                                  title="Удалить слот"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Tile Details Deck */}
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/[0.07] text-[11px] font-mono">
                              <div className="flex items-center gap-1.5 text-[#8b929e]">
                                <MapPin className="w-3.5 h-3.5 text-[#c68a35] shrink-0" />
                                <span className="truncate text-[#d0d5dc]">{save.streetName || 'Степной Тракт'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#8b929e]">
                                <Clock className="w-3.5 h-3.5 text-[#c68a35] shrink-0" />
                                <span className="text-white font-bold">{formatGameTime(save.timeHour ?? 10.0)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#8b929e]">
                                <Calendar className="w-3.5 h-3.5 text-[#c68a35] shrink-0" />
                                <span>{save.calendar ? formatGameDate(save.calendar, 'medium') : (save.date || '08.10.2026')}</span>
                              </div>
                              <div className="text-[10px] text-[#c68a35] font-bold text-right self-center">
                                {save.calendar?.season ? getRussianSeasonName(save.calendar.season) : (save.season || 'Осень')}
                              </div>
                            </div>
                          </div>

                          {/* Launch Button */}
                          <div className="mt-4 pt-3 border-t border-white/[0.07]">
                            <button
                              onClick={() => handleLoadSaveSlot(save.id)}
                              className="w-full py-2.5 bg-[#c68a35] hover:bg-[#d8963e] text-black font-mono text-xs font-black uppercase rounded-[2px] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md group-hover:shadow-[0_0_12px_rgba(198,138,53,0.35)]"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>ВЫЕХАТЬ В РЕЙС</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: NEW GAME AS MODERN TILES */}
            {playTab === 'new_game' && (
              <form onSubmit={handleStartNewGame} className="p-6 flex-1 overflow-y-auto space-y-5">
                
                {/* Driver Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8b929e]">
                    ИМЯ ВОДИТЕЛЯ В ПТС / ПОЗЫВНОЙ:
                  </label>
                  <input
                    type="text"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    maxLength={32}
                    required
                    placeholder="Введите позывной водителя..."
                    className="w-full bg-[#161a22] border border-white/10 focus:border-[#c68a35] rounded-[2px] px-4 py-3 text-white text-xs font-mono font-bold focus:outline-none transition-colors"
                  />
                </div>

                {/* Spawn Locations as Large Modern Tiles */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8b929e]">
                    ВЫБЕРИТЕ ТОЧКУ ВЫЕЗДА НА КАРТУ:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {spawnLocations.map((loc) => {
                      const isSelected = selectedSpawnId === loc.id;
                      return (
                        <div
                          key={loc.id}
                          onClick={() => {
                            setSelectedSpawnId(loc.id);
                            playUiSound(700);
                          }}
                          className={`group relative flex flex-col justify-between p-4 rounded-[3px] transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#1e2430] border-2 border-[#c68a35] shadow-[0_0_20px_rgba(198,138,53,0.25)]'
                              : 'bg-[#161a22] border-white/10 hover:border-white/20 hover:bg-[#1a1f29]'
                          }`}
                        >
                          {/* Corner selected badge */}
                          {isSelected && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-mono font-bold uppercase text-[#c68a35] bg-[#c68a35]/15 border border-[#c68a35]/40 px-2 py-0.5 rounded-[2px]">
                              <Check className="w-3 h-3 text-[#c68a35]" />
                              <span>ВЫБРАНО</span>
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-[2px] border ${
                                isSelected 
                                  ? 'bg-[#c68a35]/20 border-[#c68a35] text-[#c68a35]' 
                                  : 'bg-white/[0.04] border-white/10 text-[#8b929e] group-hover:text-white'
                              }`}>
                                {loc.icon}
                              </div>
                              <div className="min-w-0 pr-16">
                                <h3 className={`text-sm font-black uppercase tracking-wider truncate font-sans ${
                                  isSelected ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'
                                }`}>
                                  {loc.nameRu}
                                </h3>
                                <div className="text-[10px] font-mono text-[#8b929e]">
                                  {loc.name}
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-[#8b929e] mt-3 leading-relaxed">
                              {loc.description}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-white/[0.07] flex items-center justify-between text-[10px] font-mono text-[#8b929e]">
                            <span>КООРДИНАТЫ:</span>
                            <span className={isSelected ? 'text-[#c68a35] font-bold' : 'text-white/60'}>
                              X: {loc.x} · Y: {loc.y}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Launch */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#c68a35] hover:bg-[#d8963e] text-black font-mono text-xs font-black uppercase tracking-wider rounded-[2px] transition-all cursor-pointer shadow-[0_4px_16px_rgba(198,138,53,0.3)] flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>ВЫЕХАТЬ В СИМУЛЯЦИЮ</span>
                  </button>
                </div>

              </form>
            )}

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-white/10 bg-[#161a22] flex items-center justify-between text-[11px] font-mono text-[#8b929e]">
              <span>СТЕПНОЙ ТРАКТ 2D</span>
              <button
                onClick={() => {
                  playUiSound(500);
                  setActiveModal('none');
                }}
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад в главное меню [ESC]</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: SETTINGS (CLEAN, NO OVERFLOW)                                    */}
      {/* ========================================================================= */}
      {activeModal === 'settings' && !isLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-[#12151b] border-2 border-[#c68a35] rounded-[3px] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161a22]">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-6 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_10px_rgba(198,138,53,0.5)]" />
                <h2 className="text-lg font-black italic uppercase tracking-wider text-white font-sans">
                  НАСТРОЙКИ СИМУЛЯЦИИ
                </h2>
              </div>
              <button
                onClick={() => {
                  playUiSound(500);
                  setActiveModal('none');
                }}
                className="p-1.5 text-[#8b929e] hover:text-white hover:bg-white/10 rounded-[2px] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Settings Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-4 border-b border-white/[0.08] bg-[#12151b]">
              {[
                { id: 'graphics', label: 'ВИДЕО', icon: Monitor },
                { id: 'audio', label: 'АУДИО', icon: Volume2 },
                { id: 'gameplay', label: 'МИР', icon: Clock },
                { id: 'controls', label: 'КЛАВИШИ', icon: Gamepad2 }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = settingsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSettingsTab(tab.id as any);
                      playUiSound(700);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded-[2px] transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#c68a35] text-black border-[#c68a35] font-black'
                        : 'bg-[#181c24] border-white/10 text-[#8b929e] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Settings Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              
              {/* Graphics Tab */}
              {settingsTab === 'graphics' && (
                <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-[#181c24] border border-white/[0.08] rounded-[2px]">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-white">Лимит FPS</div>
                    <div className="text-[10px] text-[#8b929e]">Частота кадров физического тика</div>
                  </div>
                  <div className="flex gap-1.5">
                    {[60, 120, 0].map((limit) => (
                      <button
                        key={limit}
                        type="button"
                        onClick={() => {
                          onUpdateSettings({ ...settings, fpsLimit: limit });
                          playUiSound(800);
                        }}
                        className={`px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold transition-all cursor-pointer border ${
                          settings.fpsLimit === limit 
                            ? 'bg-[#c68a35] text-black border-[#c68a35] font-black' 
                            : 'bg-white/[0.04] text-[#8b929e] border-white/10 hover:bg-white/[0.08]'
                        }`}
                      >
                        {limit === 0 ? 'Без лимита' : `${limit} FPS`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio Tab */}
              {settingsTab === 'audio' && (
                <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-[#181c24] border border-white/[0.08] rounded-[2px]">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-white">Общий звук</div>
                    <div className="text-[10px] text-[#8b929e]">Двигатель, подвеска, шины и радио</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMute();
                      playUiSound(800);
                    }}
                    className={`px-4 py-2 rounded-[2px] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                      isMuted 
                        ? 'bg-rose-950/40 text-rose-300 border-rose-800/40' 
                        : 'bg-[#c68a35] text-black border-[#c68a35] font-black'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>{isMuted ? 'Выключен' : 'Включен'}</span>
                  </button>
                </div>
              )}

              {/* Gameplay Tab */}
              {settingsTab === 'gameplay' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-[#181c24] border border-white/[0.08] rounded-[2px]">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-white">Автосохранение</div>
                      <div className="text-[10px] text-[#8b929e]">Периодичность записи координат</div>
                    </div>
                    <div className="flex gap-1.5">
                      {[
                        { val: 25, label: '25 с' },
                        { val: 60, label: '1 мин' },
                        { val: 0, label: 'Выкл' }
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            onUpdateSettings({ ...settings, autoSaveInterval: opt.val });
                            playUiSound(800);
                          }}
                          className={`px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold transition-all cursor-pointer border ${
                            settings.autoSaveInterval === opt.val 
                              ? 'bg-[#c68a35] text-black border-[#c68a35] font-black' 
                              : 'bg-white/[0.04] text-[#8b929e] border-white/10 hover:bg-white/[0.08]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-[#181c24] border border-white/[0.08] rounded-[2px]">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-white">Ход времени суток</div>
                      <div className="text-[10px] text-[#8b929e]">Суточный цикл дня и ночи</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateSettings({ ...settings, timeAutoCycle: !settings.timeAutoCycle });
                        playUiSound(800);
                      }}
                      className={`px-4 py-1.5 rounded-[2px] text-xs font-mono font-bold transition-all cursor-pointer border ${
                        settings.timeAutoCycle
                          ? 'bg-[#c68a35] text-black border-[#c68a35] font-black'
                          : 'bg-white/[0.04] text-[#8b929e] border-white/10'
                      }`}
                    >
                      {settings.timeAutoCycle ? 'Активен' : 'Отключен'}
                    </button>
                  </div>
                </div>
              )}

              {/* Controls Tab */}
              {settingsTab === 'controls' && (
                <div className="space-y-3">
                  <div className="p-4 bg-[#181c24] border border-white/[0.08] rounded-[2px]">
                    <div className="text-xs font-bold uppercase tracking-wider text-white">Чувствительность мыши</div>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={settings.mouseSensitivity}
                        onChange={(e) => onUpdateSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) })}
                        className="w-full accent-[#c68a35] cursor-pointer h-1.5 bg-[#0b0c0e] rounded-[1px] appearance-none"
                      />
                      <span className="text-xs font-mono font-bold text-[#c68a35] shrink-0">{settings.mouseSensitivity.toFixed(1)}x</span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#181c24] border border-white/[0.08] rounded-[2px] text-[11px] font-mono leading-relaxed text-[#8b929e] space-y-1">
                    <div><span className="text-white font-bold">W / A / S / D</span> — Движение и рулевое управление</div>
                    <div><span className="text-white font-bold">ПРОБЕЛ</span> — Ручной тормоз</div>
                    <div><span className="text-white font-bold">E</span> — Действие (сесть в авто, открыть дверь, капот)</div>
                    <div><span className="text-white font-bold">L</span> — Фары • <span className="text-white font-bold">Z / C</span> — Поворотники • <span className="text-white font-bold">X</span> — Аварийка</div>
                    <div><span className="text-white font-bold">I</span> — Инвентарь • <span className="text-white font-bold">M</span> — Карта • <span className="text-white font-bold">ESC</span> — Пауза</div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/10 bg-[#161a22] flex items-center justify-between text-[11px] font-mono text-[#8b929e]">
              <span>Параметры сохраняются автоматически</span>
              <button
                onClick={() => {
                  playUiSound(500);
                  setActiveModal('none');
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Закрыть [ESC]
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. AUTHENTIC GAME LOADING SCREEN OVERLAY                                  */}
      {/* ========================================================================= */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#0b0c0e] select-none animate-in fade-in duration-100">
          
          <div className="w-full max-w-md flex flex-col items-center text-center space-y-6">
            
            {/* Loading Brand Emblem */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[#14171d] border border-white/10 rounded-[2px]">
              <div className="w-2 h-6 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_12px_rgba(198,138,53,0.5)]" />
              <span className="text-lg font-black italic tracking-wider text-white uppercase font-sans">
                СТЕПНОЙ ТРАКТ 2D
              </span>
              <div className="w-2 h-6 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_12px_rgba(198,138,53,0.5)]" />
            </div>

            {/* Stage Title */}
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                {loadingStageText}
              </h3>
              <p className="text-[11px] font-mono text-[#8b929e]">
                Подготовка транспортной симуляции...
              </p>
            </div>

            {/* Ochre Progress Bar */}
            <div className="w-full space-y-1.5">
              <div className="w-full h-2 bg-[#181c24] border border-white/10 rounded-[1px] overflow-hidden">
                <div 
                  className="h-full bg-[#c68a35] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(198,138,53,0.6)]"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#8b929e]">
                <span>ЗАГРУЗКА РЕСУРСОВ</span>
                <span className="text-[#c68a35] font-bold">{loadingProgress}%</span>
              </div>
            </div>

            {/* Helpful Driver Tip */}
            <div className="p-3 bg-[#14171d] border border-white/[0.08] rounded-[2px] text-[11px] font-mono text-[#8b929e] leading-relaxed max-w-sm">
              {LOADING_TIPS[loadingTipIndex]}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CLEAN BOTTOM FOOTER BAR                                                */}
      {/* ========================================================================= */}
      <footer className="relative z-10 px-6 py-2.5 flex items-center justify-between text-[10px] font-mono text-[#8b929e] border-t border-white/[0.06] bg-[#0b0c0e]/90">
        <div>
          <span>СТЕПНОЙ ТРАКТ 2D</span>
          <span className="mx-2">·</span>
          <span>ТРАНСПОРТНЫЙ СИМУЛЯТОР</span>
        </div>
        <div>
          <span className="text-[#c68a35] font-bold">СБОРКА 0.33.2</span>
        </div>
      </footer>

    </div>
  );
};

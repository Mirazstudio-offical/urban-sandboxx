import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Trash2, 
  Volume2, 
  VolumeX, 
  HardDrive, 
  Gamepad2, 
  ArrowLeft,
  Monitor,
  Clock,
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
  Car,
  MapPin,
  Calendar
} from 'lucide-react';
import { formatGameDate, formatGameTime, getRussianSeasonName } from '../calendarSystem';

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
    description: 'Парковый фонтан, асфальтированные широкие аллеи, пешеходная зона и кольцевые проезды.',
    icon: <TreePine className="w-6 h-6 text-[#c68a35]" />
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Площадь Администрации (Центр)',
    x: 4350,
    y: 2000,
    description: 'Официальный центр города, парковка перед госучреждениями и широкий центральный проспект.',
    icon: <Building2 className="w-6 h-6 text-[#c68a35]" />
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Двор (Хрущёвки & Гаражи)',
    x: 2750,
    y: 2750,
    description: 'Панельные пятиэтажки, детская площадка, гаражные боксы и узкие дворовые проезды.',
    icon: <Home className="w-6 h-6 text-[#c68a35]" />
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Yard',
    nameRu: 'Промзона (Автобаза №4 & Склады)',
    x: 6530,
    y: 1030,
    description: 'Грузовые ангары, ремонтные ямы, стоянка спецтехники и дорожные бетонные плиты.',
    icon: <Truck className="w-6 h-6 text-[#c68a35]" />
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
    <div className="absolute inset-0 z-50 flex flex-col justify-between text-[#f0f3f6] font-sans select-none overflow-hidden bg-[#080a0e]/85 backdrop-blur-xl">
      
      {/* ========================================================================= */}
      {/* 1. REAL IN-GAME MAP CANVAS / TOPOGRAPHIC SCHEMATIC BACKGROUND             */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle Map Road Network Grid */}
        <svg className="w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="roadGridPattern" width="180" height="180" patternUnits="userSpaceOnUse">
              <path d="M 0 90 L 180 90 M 90 0 L 90 180" stroke="#ffffff" strokeWidth="6" strokeDasharray="18 10" />
              <circle cx="90" cy="90" r="16" fill="none" stroke="#c68a35" strokeWidth="3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#roadGridPattern)" />
        </svg>

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080a0e] via-transparent to-[#080a0e]/85" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080a0e]/95 via-transparent to-[#080a0e]/95" />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP BANNER: STEPPE HIGHWAY 2D WITH GENEROUS AIRY MARGINS               */}
      {/* ========================================================================= */}
      <div className="relative z-10 pt-12 sm:pt-16 flex flex-col items-center justify-center pointer-events-auto">
        <div className="flex items-center gap-3 px-6 py-3.5 bg-[#12151d]/90 border border-white/10 rounded-[3px] shadow-2xl">
          <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_14px_rgba(198,138,53,0.5)]" />
          <div className="flex flex-col pr-2">
            <h1 className="text-xl sm:text-2xl font-black italic tracking-widest text-white uppercase font-sans leading-none">
              СТЕПНОЙ ТРАКТ <span className="text-[#c68a35]">2D</span>
            </h1>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#8b929e] uppercase mt-1">
              РЕАЛИСТИЧНЫЙ ТРАНСПОРТНЫЙ СИМУЛЯТОР
            </span>
          </div>
          <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_14px_rgba(198,138,53,0.5)]" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CENTRAL HORIZONTAL BUTTON DOCK (SPACIOUS, NO TIGHT CRAMMING)           */}
      {/* ========================================================================= */}
      {activeModal === 'none' && !isLoading && (
        <div className="relative z-20 pb-20 sm:pb-28 px-6 flex flex-col items-center justify-center animate-in fade-in duration-200">
          
          <div className="flex flex-wrap items-center justify-center gap-4 max-w-5xl w-full">
            
            {/* 1. LARGE PRIMARY PLAY BUTTON */}
            <button
              onClick={() => {
                playUiSound(880);
                setActiveModal('play');
                setPlayTab(saves.length > 0 ? 'saves' : 'new_game');
              }}
              className="group relative flex items-center justify-center gap-5 px-10 py-6 min-w-[240px] sm:min-w-[280px] bg-[#141720]/95 hover:bg-[#1a1e2a] border-2 border-[#c68a35] hover:shadow-[0_0_30px_rgba(198,138,53,0.4)] rounded-[4px] transition-all cursor-pointer overflow-hidden"
            >
              <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-[#c68a35] group-hover:scale-115 transition-transform shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-xl sm:text-2xl font-black italic uppercase tracking-wider text-white font-sans leading-tight">
                  ИГРАТЬ
                </span>
                <span className="text-[11px] text-[#c68a35] font-mono tracking-wide mt-0.5">
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
              className="group relative flex items-center justify-center gap-3.5 px-7 py-6 min-w-[160px] bg-[#141720]/90 hover:bg-[#1a1e2a] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_4px_20px_rgba(198,138,53,0.15)] rounded-[4px] transition-all cursor-pointer"
            >
              <Sliders className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  НАСТРОЙКИ
                </span>
                <span className="text-[10px] text-[#8b929e] font-mono mt-0.5">
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
              className="group relative flex items-center justify-center gap-3.5 px-6 py-6 min-w-[150px] bg-[#141720]/90 hover:bg-[#1a1e2a] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_4px_20px_rgba(198,138,53,0.15)] rounded-[4px] transition-all cursor-pointer"
            >
              <User className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  АККАУНТ
                </span>
                <span className="text-[10px] text-[#8b929e] font-mono mt-0.5">
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
                className="group relative flex items-center justify-center gap-3.5 px-6 py-6 min-w-[150px] bg-[#141720]/90 hover:bg-[#1a1e2a] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_4px_20px_rgba(198,138,53,0.15)] rounded-[4px] transition-all cursor-pointer"
              >
                <Globe className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                    ОНЛАЙН
                  </span>
                  <span className="text-[10px] text-[#8b929e] font-mono mt-0.5">
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
              className="group relative flex items-center justify-center gap-3 px-6 py-6 bg-[#141720]/90 hover:bg-[#1a1e2a] border border-white/10 hover:border-white/30 rounded-[4px] transition-all cursor-pointer"
              title="Вернуться к текущей симуляции (ESC)"
            >
              <RotateCcw className="w-4 h-4 text-[#8b929e] group-hover:text-white transition-colors" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#8b929e] group-hover:text-white font-mono">
                В ИГРУ
              </span>
            </button>

          </div>

          {/* Quick Controls Tip with generous margin */}
          <div className="mt-8 flex items-center gap-4 text-xs font-mono text-[#8b929e]">
            <span>ВЫБОР КНОПКИ МЫШЬЮ</span>
            <span aria-hidden="true">·</span>
            <span>ESC: ЗАКРЫТЬ / ВЕРНУТЬСЯ В ИГРУ</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: PLAY (EXPANSIVE, AIRY TILES, NO CRAMMING)                       */}
      {/* ========================================================================= */}
      {activeModal === 'play' && !isLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl bg-[#12151d] border-2 border-[#c68a35] rounded-[4px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header with generous clearance */}
            <div className="px-8 py-5 border-b border-white/10 flex items-center justify-between bg-[#161a24]">
              <div className="flex items-center gap-3.5">
                <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_12px_rgba(198,138,53,0.5)]" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-wider text-white font-sans leading-none">
                    ВЫЕЗД НА ТРАССУ
                  </h2>
                  <p className="text-xs font-mono text-[#8b929e] mt-1 hidden sm:block">
                    Выберите ранее сохранённый рейс или инициализируйте новую сессию
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  playUiSound(500);
                  setActiveModal('none');
                }}
                className="p-2 text-[#8b929e] hover:text-white hover:bg-white/10 rounded-[3px] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Play Tabs Switcher */}
            <div className="px-8 pt-5 pb-3 flex gap-4 border-b border-white/[0.08] bg-[#12151d]">
              <button
                onClick={() => {
                  playUiSound(700);
                  setPlayTab('saves');
                }}
                className={`flex items-center gap-2.5 px-7 py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-[3px] transition-all cursor-pointer border ${
                  playTab === 'saves'
                    ? 'bg-[#c68a35] text-black border-[#c68a35] font-black shadow-[0_0_16px_rgba(198,138,53,0.35)]'
                    : 'bg-[#181c26] text-[#8b929e] border-white/10 hover:text-white hover:bg-[#1e2330]'
                }`}
              >
                <HardDrive className="w-4 h-4" />
                <span>Архив сохранений ({saves.length})</span>
              </button>

              <button
                onClick={() => {
                  playUiSound(700);
                  setPlayTab('new_game');
                }}
                className={`flex items-center gap-2.5 px-7 py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-[3px] transition-all cursor-pointer border ${
                  playTab === 'new_game'
                    ? 'bg-[#c68a35] text-black border-[#c68a35] font-black shadow-[0_0_16px_rgba(198,138,53,0.35)]'
                    : 'bg-[#181c26] text-[#8b929e] border-white/10 hover:text-white hover:bg-[#1e2330]'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Новый заезд</span>
              </button>
            </div>

            {/* TAB 1: SAVES ARCHIVE AS EXPANSIVE TILES */}
            {playTab === 'saves' && (
              <div className="p-8 flex-1 overflow-y-auto">
                {saves.length === 0 ? (
                  <div className="py-20 px-8 text-center bg-[#161a24] border border-white/10 rounded-[4px] space-y-5 max-w-xl mx-auto">
                    <div className="w-16 h-16 mx-auto rounded-full bg-[#c68a35]/15 border border-[#c68a35]/30 flex items-center justify-center text-[#c68a35]">
                      <HardDrive className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold uppercase tracking-wider text-white font-sans">
                        Архив поездок пуст
                      </h3>
                      <p className="text-xs font-mono text-[#8b929e] mt-1.5 leading-relaxed">
                        У вас пока нет сохранённых рейсов на Степном Тракте. Вы можете инициализировать первый заезд прямо сейчас.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        playUiSound(700);
                        setPlayTab('new_game');
                      }}
                      className="px-8 py-3 bg-[#c68a35] text-black font-mono text-xs font-black uppercase rounded-[3px] hover:bg-[#d8963e] transition-colors cursor-pointer shadow-lg inline-flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Начать первую поездку</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {saves.map((save) => {
                      const isConfirming = confirmDeleteId === save.id;
                      return (
                        <div
                          key={save.id}
                          className="group relative flex flex-col justify-between bg-[#161a24] hover:bg-[#1b202c] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_8px_30px_rgba(198,138,53,0.2)] rounded-[4px] p-6 transition-all"
                        >
                          {/* Ochre Accent Edge */}
                          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity rounded-l-[4px]" />

                          {/* Tile Header: Name & Mode */}
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="p-3 rounded-[3px] bg-[#c68a35]/15 border border-[#c68a35]/30 text-[#c68a35] shrink-0">
                                  {save.isInVehicle ? <Car className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-base font-black uppercase tracking-wider text-white truncate font-sans group-hover:text-[#c68a35] transition-colors">
                                    {save.name}
                                  </h3>
                                  <div className="text-[11px] font-mono text-[#c68a35] font-bold mt-0.5">
                                    {save.isInVehicle ? 'За рулём техники' : 'Пеший режим'}
                                  </div>
                                </div>
                              </div>

                              {/* Delete Action with Confirmation */}
                              {isConfirming ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => {
                                      playUiSound(500);
                                      onDeleteSave(save.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-mono text-[10px] font-bold uppercase rounded-[2px] transition-all cursor-pointer"
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
                                  className="p-2 bg-white/[0.04] hover:bg-rose-950/60 text-[#8b929e] hover:text-rose-400 border border-white/10 hover:border-rose-900/40 rounded-[3px] transition-all cursor-pointer"
                                  title="Удалить слот"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Tile Details Deck with generous margins */}
                            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/[0.08] text-xs font-mono">
                              <div className="flex items-center gap-2 text-[#8b929e]">
                                <MapPin className="w-4 h-4 text-[#c68a35] shrink-0" />
                                <span className="truncate text-[#d0d5dc]">{save.streetName || 'Степной Тракт'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[#8b929e]">
                                <Clock className="w-4 h-4 text-[#c68a35] shrink-0" />
                                <span className="text-white font-bold">{formatGameTime(save.timeHour ?? 10.0)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[#8b929e]">
                                <Calendar className="w-4 h-4 text-[#c68a35] shrink-0" />
                                <span>{save.calendar ? formatGameDate(save.calendar, 'medium') : (save.date || '08.10.2026')}</span>
                              </div>
                              <div className="text-xs text-[#c68a35] font-bold text-right self-center">
                                {save.calendar?.season ? getRussianSeasonName(save.calendar.season) : (save.season || 'Осень')}
                              </div>
                            </div>
                          </div>

                          {/* Launch Button */}
                          <div className="mt-5 pt-4 border-t border-white/[0.08]">
                            <button
                              onClick={() => handleLoadSaveSlot(save.id)}
                              className="w-full py-3 bg-[#c68a35] hover:bg-[#d8963e] text-black font-mono text-xs font-black uppercase rounded-[3px] transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-md group-hover:shadow-[0_0_16px_rgba(198,138,53,0.4)]"
                            >
                              <Play className="w-4 h-4 fill-current" />
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

            {/* TAB 2: NEW GAME AS EXPANSIVE TILES */}
            {playTab === 'new_game' && (
              <form onSubmit={handleStartNewGame} className="p-8 flex-1 overflow-y-auto space-y-6">
                
                {/* Driver Name Input */}
                <div className="flex flex-col gap-2 max-w-xl">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#8b929e]">
                    ИМЯ ВОДИТЕЛЯ В ПТС / ПОЗЫВНОЙ:
                  </label>
                  <input
                    type="text"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    maxLength={32}
                    required
                    placeholder="Введите позывной водителя..."
                    className="w-full bg-[#161a24] border border-white/10 focus:border-[#c68a35] rounded-[3px] px-5 py-3.5 text-white text-sm font-mono font-bold focus:outline-none transition-colors"
                  />
                </div>

                {/* Spawn Locations as Expansive Tiles with Generous Margins */}
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#8b929e]">
                    ВЫБЕРИТЕ ТОЧКУ ВЫЕЗДА НА КАРТУ:
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {spawnLocations.map((loc) => {
                      const isSelected = selectedSpawnId === loc.id;
                      return (
                        <div
                          key={loc.id}
                          onClick={() => {
                            setSelectedSpawnId(loc.id);
                            playUiSound(700);
                          }}
                          className={`group relative flex flex-col justify-between p-6 rounded-[4px] transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#1d2330] border-2 border-[#c68a35] shadow-[0_0_24px_rgba(198,138,53,0.3)]'
                              : 'bg-[#161a24] border-white/10 hover:border-white/20 hover:bg-[#1a1f2c]'
                          }`}
                        >
                          {/* Selected badge in top corner */}
                          {isSelected && (
                            <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-[#c68a35] bg-[#c68a35]/15 border border-[#c68a35]/40 px-2.5 py-1 rounded-[2px]">
                              <Check className="w-3.5 h-3.5 text-[#c68a35]" />
                              <span>ВЫБРАНО</span>
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-[3px] border ${
                                isSelected 
                                  ? 'bg-[#c68a35]/20 border-[#c68a35] text-[#c68a35]' 
                                  : 'bg-white/[0.04] border-white/10 text-[#8b929e] group-hover:text-white'
                              }`}>
                                {loc.icon}
                              </div>
                              <div className="min-w-0 pr-16">
                                <h3 className={`text-base font-black uppercase tracking-wider truncate font-sans ${
                                  isSelected ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'
                                }`}>
                                  {loc.nameRu}
                                </h3>
                                <div className="text-xs font-mono text-[#8b929e] mt-0.5">
                                  {loc.name}
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-[#8b929e] mt-4 leading-relaxed">
                              {loc.description}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#8b929e]">
                            <span>КООРДИНАТЫ ЛОКАЦИИ:</span>
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
                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#c68a35] hover:bg-[#d8963e] text-black font-mono text-sm font-black uppercase tracking-wider rounded-[3px] transition-all cursor-pointer shadow-[0_6px_20px_rgba(198,138,53,0.35)] flex items-center justify-center gap-3"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>ВЫЕХАТЬ В СИМУЛЯЦИЮ</span>
                  </button>
                </div>

              </form>
            )}

            {/* Modal Footer with generous clearance */}
            <div className="px-8 py-4 border-t border-white/10 bg-[#161a24] flex items-center justify-between text-xs font-mono text-[#8b929e]">
              <span>СТЕПНОЙ ТРАКТ 2D</span>
              <button
                onClick={() => {
                  playUiSound(500);
                  setActiveModal('none');
                }}
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад в главное меню [ESC]</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: SETTINGS (SPACIOUS, GENEROUS BREATHING ROOM)                    */}
      {/* ========================================================================= */}
      {activeModal === 'settings' && !isLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#12151d] border-2 border-[#c68a35] rounded-[4px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="px-8 py-5 border-b border-white/10 flex items-center justify-between bg-[#161a24]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_12px_rgba(198,138,53,0.5)]" />
                <h2 className="text-xl font-black italic uppercase tracking-wider text-white font-sans">
                  НАСТРОЙКИ СИМУЛЯЦИИ
                </h2>
              </div>
              <button
                onClick={() => {
                  playUiSound(500);
                  setActiveModal('none');
                }}
                className="p-2 text-[#8b929e] hover:text-white hover:bg-white/10 rounded-[3px] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Settings Tabs */}
            <div className="grid grid-cols-4 gap-2.5 p-5 border-b border-white/[0.08] bg-[#12151d]">
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
                    className={`flex items-center justify-center gap-2 py-3 px-2 text-xs font-mono font-bold uppercase tracking-wider rounded-[3px] transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#c68a35] text-black border-[#c68a35] font-black'
                        : 'bg-[#181c26] border-white/10 text-[#8b929e] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Settings Body with comfortable spacing */}
            <div className="p-8 flex-1 overflow-y-auto space-y-5">
              
              {/* Graphics Tab */}
              {settingsTab === 'graphics' && (
                <div className="flex items-center justify-between flex-wrap gap-4 p-5 bg-[#161a24] border border-white/[0.08] rounded-[3px]">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-wider text-white">Лимит частоты кадров (FPS)</div>
                    <div className="text-xs text-[#8b929e] mt-0.5">Ограничение частоты обновления физического тика</div>
                  </div>
                  <div className="flex gap-2">
                    {[60, 120, 0].map((limit) => (
                      <button
                        key={limit}
                        type="button"
                        onClick={() => {
                          onUpdateSettings({ ...settings, fpsLimit: limit });
                          playUiSound(800);
                        }}
                        className={`px-4 py-2 rounded-[3px] text-xs font-mono font-bold transition-all cursor-pointer border ${
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
                <div className="flex items-center justify-between flex-wrap gap-4 p-5 bg-[#161a24] border border-white/[0.08] rounded-[3px]">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-wider text-white">Общее воспроизведение звука</div>
                    <div className="text-xs text-[#8b929e] mt-0.5">Двигатель, подвеска, шины и радио</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMute();
                      playUiSound(800);
                    }}
                    className={`px-5 py-2.5 rounded-[3px] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4 p-5 bg-[#161a24] border border-white/[0.08] rounded-[3px]">
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-white">Автосохранение рейса</div>
                      <div className="text-xs text-[#8b929e] mt-0.5">Периодичность записи координат и состояния авто</div>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { val: 25, label: '25 сек' },
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
                          className={`px-4 py-2 rounded-[3px] text-xs font-mono font-bold transition-all cursor-pointer border ${
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

                  <div className="flex items-center justify-between flex-wrap gap-4 p-5 bg-[#161a24] border border-white/[0.08] rounded-[3px]">
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-white">Суточный ход времени</div>
                      <div className="text-xs text-[#8b929e] mt-0.5">Цикл смены дня и ночи</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateSettings({ ...settings, timeAutoCycle: !settings.timeAutoCycle });
                        playUiSound(800);
                      }}
                      className={`px-5 py-2 rounded-[3px] text-xs font-mono font-bold transition-all cursor-pointer border ${
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
                <div className="space-y-4">
                  <div className="p-5 bg-[#161a24] border border-white/[0.08] rounded-[3px]">
                    <div className="text-sm font-bold uppercase tracking-wider text-white">Чувствительность мыши</div>
                    <div className="flex items-center gap-4 mt-3">
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={settings.mouseSensitivity}
                        onChange={(e) => onUpdateSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) })}
                        className="w-full accent-[#c68a35] cursor-pointer h-2 bg-[#0b0c0e] rounded-[1px] appearance-none"
                      />
                      <span className="text-sm font-mono font-bold text-[#c68a35] shrink-0">{settings.mouseSensitivity.toFixed(1)}x</span>
                    </div>
                  </div>

                  <div className="p-5 bg-[#161a24] border border-white/[0.08] rounded-[3px] text-xs font-mono leading-relaxed text-[#8b929e] space-y-2">
                    <div><span className="text-white font-bold">W / A / S / D</span> — Движение и рулевое управление</div>
                    <div><span className="text-white font-bold">ПРОБЕЛ</span> — Ручной стояночный тормоз</div>
                    <div><span className="text-white font-bold">E</span> — Действие (сесть в авто, открыть дверь, капот)</div>
                    <div><span className="text-white font-bold">L</span> — Фары • <span className="text-white font-bold">Z / C</span> — Поворотники • <span className="text-white font-bold">X</span> — Аварийка</div>
                    <div><span className="text-white font-bold">I</span> — Инвентарь • <span className="text-white font-bold">M</span> — Карта • <span className="text-white font-bold">ESC</span> — Пауза</div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-white/10 bg-[#161a24] flex items-center justify-between text-xs font-mono text-[#8b929e]">
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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 bg-[#080a0e] select-none animate-in fade-in duration-150">
          
          <div className="w-full max-w-lg flex flex-col items-center text-center space-y-8">
            
            {/* Loading Brand Emblem */}
            <div className="flex items-center gap-3 px-6 py-3 bg-[#12151d] border border-white/10 rounded-[3px]">
              <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_14px_rgba(198,138,53,0.5)]" />
              <span className="text-xl font-black italic tracking-widest text-white uppercase font-sans">
                СТЕПНОЙ ТРАКТ 2D
              </span>
              <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_14px_rgba(198,138,53,0.5)]" />
            </div>

            {/* Stage Title */}
            <div className="space-y-1.5">
              <h3 className="text-base font-bold uppercase tracking-wider text-white font-mono">
                {loadingStageText}
              </h3>
              <p className="text-xs font-mono text-[#8b929e]">
                Подготовка транспортной симуляции...
              </p>
            </div>

            {/* Ochre Progress Bar */}
            <div className="w-full space-y-2">
              <div className="w-full h-2.5 bg-[#181c26] border border-white/10 rounded-[2px] overflow-hidden">
                <div 
                  className="h-full bg-[#c68a35] transition-all duration-300 ease-out shadow-[0_0_12px_rgba(198,138,53,0.7)]"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-[#8b929e]">
                <span>ЗАГРУЗКА РЕСУРСОВ</span>
                <span className="text-[#c68a35] font-bold">{loadingProgress}%</span>
              </div>
            </div>

            {/* Helpful Driver Tip with comfortable padding */}
            <div className="p-4 bg-[#12151d] border border-white/[0.08] rounded-[3px] text-xs font-mono text-[#8b929e] leading-relaxed max-w-md">
              {LOADING_TIPS[loadingTipIndex]}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CLEAN BOTTOM FOOTER BAR WITH SPACIOUS MARGINS                          */}
      {/* ========================================================================= */}
      <footer className="relative z-10 px-8 py-3.5 flex items-center justify-between text-xs font-mono text-[#8b929e] border-t border-white/[0.08] bg-[#080a0e]/95">
        <div>
          <span>СТЕПНОЙ ТРАКТ 2D</span>
          <span className="mx-2.5">·</span>
          <span>ТРАНСПОРТНЫЙ СИМУЛЯТОР</span>
        </div>
        <div>
          <span className="text-[#c68a35] font-bold">СБОРКА 0.33.2</span>
        </div>
      </footer>

    </div>
  );
};

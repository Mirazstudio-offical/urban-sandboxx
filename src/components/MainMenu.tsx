import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Trash2, 
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
  Calendar,
  Volume2,
  Compass,
  AlertTriangle
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
  const [activeModal, setActiveModal] = useState<'none' | 'play' | 'settings'>('none');
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
    setLoadingProgress(15);
    setLoadingTipIndex(Math.floor(Math.random() * LOADING_TIPS.length));
    setLoadingStageText('Инициализация физики шасси и подвески...');

    setTimeout(() => {
      setLoadingProgress(50);
      setLoadingStageText('Построение дорожного полотна и перекрёстков...');
    }, 180);

    setTimeout(() => {
      setLoadingProgress(80);
      setLoadingStageText('Синхронизация светофоров и трафика...');
    }, 380);

    setTimeout(() => {
      setLoadingProgress(100);
      setLoadingStageText('Прогрев двигателя. Выезд на трассу...');
    }, 580);

    setTimeout(() => {
      setIsLoading(false);
      onComplete();
    }, 750);
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
    <div className="fixed inset-0 z-50 flex flex-col justify-between text-[#f0f3f6] font-sans select-none overflow-hidden bg-[#080a0e]/85 backdrop-blur-2xl">
      
      {/* Background Stylized Topographic Map Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg className="w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="steppeMapGrid" width="160" height="160" patternUnits="userSpaceOnUse">
              <path d="M 0 80 L 160 80 M 80 0 L 80 160" stroke="#ffffff" strokeWidth="4" strokeDasharray="16 10" />
              <circle cx="80" cy="80" r="14" fill="none" stroke="#c68a35" strokeWidth="2.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#steppeMapGrid)" />
        </svg>

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080a0e] via-transparent to-[#080a0e]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080a0e]/95 via-transparent to-[#080a0e]/95" />
      </div>

      {/* TOP HEADER: Clean Brand Emblem with Generous Breathing Room */}
      <header className="relative z-10 pt-12 sm:pt-16 px-8 flex flex-col items-center justify-center pointer-events-auto">
        <div className="flex items-center gap-4 px-7 py-4 bg-[#121620]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md">
          <div className="w-3 h-8 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_16px_rgba(198,138,53,0.6)]" />
          <div className="flex flex-col pr-2">
            <h1 className="text-2xl sm:text-3xl font-black italic tracking-widest text-white uppercase font-sans leading-none">
              СТЕПНОЙ ТРАКТ <span className="text-[#c68a35]">2D</span>
            </h1>
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#8b929e] uppercase mt-1">
              РЕАЛИСТИЧНЫЙ ТРАНСПОРТНЫЙ СИМУЛЯТОР
            </span>
          </div>
          <div className="w-3 h-8 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_16px_rgba(198,138,53,0.6)]" />
        </div>
      </header>

      {/* MAIN SCREEN ACTION TILES (Spacious Dock with Generous Clearance) */}
      {activeModal === 'none' && !isLoading && (
        <main className="relative z-20 pb-20 sm:pb-28 px-6 flex flex-col items-center justify-center animate-in fade-in duration-200">
          
          <div className="flex flex-wrap items-center justify-center gap-6 max-w-5xl w-full">
            
            {/* 1. LARGE PRIMARY PLAY BUTTON TILE */}
            <button
              onClick={() => {
                playUiSound(880);
                setActiveModal('play');
                setPlayTab(saves.length > 0 ? 'saves' : 'new_game');
              }}
              className="group relative flex items-center justify-center gap-6 px-10 py-7 min-w-[280px] sm:min-w-[320px] bg-gradient-to-r from-[#151924] via-[#1a2030] to-[#141824] hover:from-[#1b2234] hover:to-[#171d2b] border-2 border-[#c68a35] hover:shadow-[0_0_35px_rgba(198,138,53,0.4)] rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden shadow-2xl"
            >
              <div className="w-12 h-12 rounded-xl bg-[#c68a35] text-black flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(198,138,53,0.5)] group-hover:scale-105 transition-transform duration-200">
                <Play className="w-6 h-6 fill-current translate-x-0.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl sm:text-3xl font-black italic uppercase tracking-wider text-white font-sans leading-tight">
                  ИГРАТЬ
                </span>
                <span className="text-xs text-[#c68a35] font-mono tracking-wide mt-1 font-bold">
                  {saves.length > 0 ? `Архив рейсов: ${saves.length}` : 'Начать новую поездку'}
                </span>
              </div>
            </button>

            {/* 2. SETTINGS TILE */}
            <button
              onClick={() => {
                playUiSound(750);
                setActiveModal('settings');
              }}
              className="group relative flex items-center justify-center gap-4 px-8 py-7 min-w-[200px] bg-[#121620] hover:bg-[#181d2a] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_8px_25px_rgba(198,138,53,0.2)] rounded-2xl transition-all duration-200 cursor-pointer shadow-xl text-left"
            >
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-[#8b929e] group-hover:text-[#c68a35] group-hover:border-[#c68a35]/40 transition-colors shrink-0">
                <Sliders className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  НАСТРОЙКИ
                </span>
                <span className="text-[11px] text-[#8b929e] font-mono mt-0.5">
                  Видео, звук, клавиши
                </span>
              </div>
            </button>

            {/* 3. ACCOUNT TILE */}
            <button
              onClick={() => {
                playUiSound(750);
                if (onOpenProfile) onOpenProfile();
              }}
              className="group relative flex items-center justify-center gap-4 px-8 py-7 min-w-[200px] bg-[#121620] hover:bg-[#181d2a] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_8px_25px_rgba(198,138,53,0.2)] rounded-2xl transition-all duration-200 cursor-pointer shadow-xl text-left"
            >
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-[#8b929e] group-hover:text-[#c68a35] group-hover:border-[#c68a35]/40 transition-colors shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  АККАУНТ
                </span>
                <span className="text-[11px] text-[#8b929e] font-mono mt-0.5">
                  Досье водителя & облако
                </span>
              </div>
            </button>

            {/* 4. ONLINE P2P TILE */}
            {onOpenOnline && (
              <button
                onClick={() => {
                  playUiSound(750);
                  onOpenOnline();
                }}
                className="group relative flex items-center justify-center gap-4 px-8 py-7 min-w-[200px] bg-[#121620] hover:bg-[#181d2a] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_8px_25px_rgba(198,138,53,0.2)] rounded-2xl transition-all duration-200 cursor-pointer shadow-xl text-left"
              >
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-[#8b929e] group-hover:text-[#c68a35] group-hover:border-[#c68a35]/40 transition-colors shrink-0">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                    ОНЛАЙН
                  </span>
                  <span className="text-[11px] text-[#8b929e] font-mono mt-0.5">
                    Сетевая комната P2P
                  </span>
                </div>
              </button>
            )}

            {/* 5. RESUME CURRENT RUN */}
            <button
              onClick={() => {
                playUiSound(900);
                onResume();
              }}
              className="group relative flex items-center justify-center gap-3 px-6 py-7 bg-[#121620] hover:bg-[#181d2a] border border-white/10 hover:border-white/30 rounded-2xl transition-all duration-200 cursor-pointer shadow-xl"
              title="Вернуться к текущей симуляции [ESC]"
            >
              <RotateCcw className="w-5 h-5 text-[#8b929e] group-hover:text-white transition-colors" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#8b929e] group-hover:text-white font-mono">
                В ИГРУ
              </span>
            </button>

          </div>

          {/* Quick Subtitle with Generous Margin */}
          <div className="mt-10 flex items-center gap-4 text-xs font-mono text-[#8b929e]">
            <span>ВЫБОР КНОПКИ МЫШЬЮ</span>
            <span aria-hidden="true" className="text-white/20">·</span>
            <span>ESC: ВЕРНУТЬСЯ В ИГРУ</span>
          </div>
        </main>
      )}

      {/* MODAL 1: PLAY (SAVES ARCHIVE & NEW GAME WITH RICH MODERN TILES) */}
      {activeModal === 'play' && !isLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-8 md:p-10 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl bg-[#10141d] border-2 border-[#c68a35] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Header with Generous Clearance */}
            <div className="px-8 sm:px-10 py-6 border-b border-white/10 flex items-center justify-between bg-[#141924]">
              <div className="flex items-center gap-4">
                <div className="w-3 h-8 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_14px_rgba(198,138,53,0.6)]" />
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-wider text-white font-sans leading-none">
                    ВЫЕЗД НА ТРАССУ
                  </h2>
                  <p className="text-xs font-mono text-[#8b929e] mt-1.5 hidden sm:block">
                    Выберите ранее сохранённый рейс из архива или инициализируйте новую поездку
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  playUiSound(500);
                  setActiveModal('none');
                }}
                className="p-2.5 text-[#8b929e] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Play Tabs Switcher */}
            <div className="px-8 sm:px-10 pt-6 pb-4 flex gap-4 border-b border-white/[0.08] bg-[#10141d]">
              <button
                onClick={() => {
                  playUiSound(700);
                  setPlayTab('saves');
                }}
                className={`flex items-center gap-3 px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border ${
                  playTab === 'saves'
                    ? 'bg-[#c68a35] text-black border-[#c68a35] font-black shadow-[0_0_20px_rgba(198,138,53,0.4)]'
                    : 'bg-[#151924] text-[#8b929e] border-white/10 hover:text-white hover:bg-[#1a202e]'
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
                className={`flex items-center gap-3 px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border ${
                  playTab === 'new_game'
                    ? 'bg-[#c68a35] text-black border-[#c68a35] font-black shadow-[0_0_20px_rgba(198,138,53,0.4)]'
                    : 'bg-[#151924] text-[#8b929e] border-white/10 hover:text-white hover:bg-[#1a202e]'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Новый заезд</span>
              </button>
            </div>

            {/* TAB 1: SAVES ARCHIVE (EXPANSIVE TILES WITH BREATHING ROOM) */}
            {playTab === 'saves' && (
              <div className="p-8 sm:p-10 flex-1 overflow-y-auto">
                {saves.length === 0 ? (
                  <div className="py-24 px-8 text-center bg-[#141924] border border-white/10 rounded-2xl space-y-6 max-w-xl mx-auto shadow-2xl">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-[#c68a35]/15 border border-[#c68a35]/30 flex items-center justify-center text-[#c68a35]">
                      <HardDrive className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold uppercase tracking-wider text-white font-sans">
                        Архив поездок пуст
                      </h3>
                      <p className="text-xs font-mono text-[#8b929e] mt-2 leading-relaxed max-w-md mx-auto">
                        У вас пока нет сохранённых рейсов. Перейдите во вкладку «Новый заезд» для выбора стартовой точки и выхода на трассу.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        playUiSound(700);
                        setPlayTab('new_game');
                      }}
                      className="px-8 py-3.5 bg-[#c68a35] text-black font-mono text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[#d8963e] transition-colors cursor-pointer shadow-lg inline-flex items-center gap-2.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Инициализировать новую поездку</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {saves.map((save) => {
                      const isConfirming = confirmDeleteId === save.id;
                      return (
                        <div
                          key={save.id}
                          className="group relative flex flex-col justify-between bg-gradient-to-b from-[#151924] to-[#10131c] hover:from-[#1a2030] hover:to-[#121622] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_12px_32px_rgba(198,138,53,0.25)] rounded-2xl p-6 transition-all duration-200"
                        >
                          {/* Ochre Accent Top Line */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />

                          {/* Top Row: Mode badge & Delete Button */}
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="p-3 rounded-xl bg-[#c68a35]/15 border border-[#c68a35]/30 text-[#c68a35] shrink-0 group-hover:bg-[#c68a35] group-hover:text-black transition-colors">
                                  {save.isInVehicle ? <Car className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white truncate font-sans group-hover:text-[#c68a35] transition-colors">
                                    {save.name}
                                  </h3>
                                  <div className="text-[11px] font-mono text-[#c68a35] font-bold mt-0.5">
                                    {save.isInVehicle ? 'За рулём техники' : 'Пеший маршрут'}
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
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-mono text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer shadow-md"
                                  >
                                    Удалить?
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="p-1 text-[#8b929e] hover:text-white"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    playUiSound(500);
                                    setConfirmDeleteId(save.id);
                                  }}
                                  className="p-2.5 bg-white/[0.04] hover:bg-rose-950/60 text-[#8b929e] hover:text-rose-400 border border-white/10 hover:border-rose-900/40 rounded-lg transition-all cursor-pointer"
                                  title="Удалить слот"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Details Grid Deck with Generous Air */}
                            <div className="grid grid-cols-2 gap-3.5 mt-5 pt-4 border-t border-white/[0.08] text-xs font-mono">
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

                          {/* Launch Action */}
                          <div className="mt-6 pt-4 border-t border-white/[0.08]">
                            <button
                              onClick={() => handleLoadSaveSlot(save.id)}
                              className="w-full py-3.5 bg-[#c68a35] hover:bg-[#d8963e] text-black font-mono text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-md group-hover:shadow-[0_0_20px_rgba(198,138,53,0.45)]"
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

            {/* TAB 2: NEW GAME (EXPANSIVE TILES FOR SPAWN POINTS WITH BREATHING ROOM) */}
            {playTab === 'new_game' && (
              <form onSubmit={handleStartNewGame} className="p-8 sm:p-10 flex-1 overflow-y-auto space-y-8">
                
                {/* Driver Name Input with Comfortable Air */}
                <div className="flex flex-col gap-2.5 max-w-xl">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                    ИМЯ ВОДИТЕЛЯ В ПТС / ПОЗЫВНОЙ:
                  </label>
                  <input
                    type="text"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    maxLength={32}
                    required
                    placeholder="Введите позывной водителя..."
                    className="w-full h-14 bg-[#141924] border border-white/10 focus:border-[#c68a35] rounded-xl px-5 text-white text-base font-mono font-bold focus:outline-none transition-colors shadow-inner"
                  />
                </div>

                {/* Spawn Locations as Expansive Tiles with Generous Margins */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b929e]">
                      ВЫБЕРИТЕ ТОЧКУ ВЫЕЗДА НА КАРТУ:
                    </label>
                    <span className="text-xs font-mono text-[#c68a35]">
                      {spawnLocations.length} СЕКТОРА ДОСТУПНО
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {spawnLocations.map((loc, idx) => {
                      const isSelected = selectedSpawnId === loc.id;
                      const sectorNum = String(idx + 1).padStart(2, '0');
                      return (
                        <div
                          key={loc.id}
                          onClick={() => {
                            setSelectedSpawnId(loc.id);
                            playUiSound(700);
                          }}
                          className={`group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl transition-all duration-200 cursor-pointer border shadow-lg ${
                            isSelected
                              ? 'bg-gradient-to-b from-[#1b2332] to-[#141a26] border-2 border-[#c68a35] shadow-[0_0_30px_rgba(198,138,53,0.3)] ring-1 ring-[#c68a35]/50'
                              : 'bg-[#141924] border-white/10 hover:border-white/20 hover:bg-[#181e2b] hover:-translate-y-0.5'
                          }`}
                        >
                          {/* Sector Badge & Selected Indicator */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[11px] font-mono font-bold text-[#8b929e] uppercase tracking-widest">
                              СЕКТОР {sectorNum}
                            </span>
                            {isSelected && (
                              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase text-[#c68a35] bg-[#c68a35]/15 border border-[#c68a35]/40 px-3 py-1 rounded-md">
                                <Check className="w-3.5 h-3.5 text-[#c68a35]" />
                                <span>ВЫБРАНО</span>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-4">
                              <div className={`p-3.5 rounded-xl border ${
                                isSelected 
                                  ? 'bg-[#c68a35]/20 border-[#c68a35] text-[#c68a35]' 
                                  : 'bg-white/[0.04] border-white/10 text-[#8b929e] group-hover:text-white'
                              }`}>
                                {loc.icon}
                              </div>
                              <div className="min-w-0 pr-4">
                                <h3 className={`text-lg font-black uppercase tracking-wider truncate font-sans ${
                                  isSelected ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'
                                }`}>
                                  {loc.nameRu}
                                </h3>
                                <div className="text-xs font-mono text-[#8b929e] mt-0.5">
                                  {loc.name}
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-[#8b929e] mt-4 leading-relaxed font-sans">
                              {loc.description}
                            </p>
                          </div>

                          <div className="mt-5 pt-3.5 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-[#8b929e]">
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

                {/* Submit Launch Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4.5 bg-[#c68a35] hover:bg-[#d8963e] text-black font-mono text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_8px_25px_rgba(198,138,53,0.4)] flex items-center justify-center gap-3"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>ВЫЕХАТЬ В СИМУЛЯЦИЮ</span>
                  </button>
                </div>

              </form>
            )}

            {/* Footer with Generous Clearance */}
            <div className="px-8 sm:px-10 py-5 border-t border-white/10 bg-[#141924] flex items-center justify-between text-xs font-mono text-[#8b929e]">
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

      {/* MODAL 2: SETTINGS (SPACIOUS, GENEROUS BREATHING ROOM) */}
      {activeModal === 'settings' && !isLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-[#10141d] border-2 border-[#c68a35] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="px-8 sm:px-10 py-6 border-b border-white/10 flex items-center justify-between bg-[#141924]">
              <div className="flex items-center gap-4">
                <div className="w-3 h-8 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_14px_rgba(198,138,53,0.6)]" />
                <h2 className="text-2xl font-black italic uppercase tracking-wider text-white font-sans">
                  НАСТРОЙКИ СИМУЛЯЦИИ
                </h2>
              </div>
              <button
                onClick={() => {
                  playUiSound(500);
                  setActiveModal('none');
                }}
                className="p-2.5 text-[#8b929e] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Settings Tabs Switcher */}
            <div className="grid grid-cols-4 gap-3 p-6 border-b border-white/[0.08] bg-[#10141d]">
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
                    className={`flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#c68a35] text-black border-[#c68a35] font-black shadow-[0_0_15px_rgba(198,138,53,0.3)]'
                        : 'bg-[#151924] text-[#8b929e] border-white/10 hover:text-white hover:bg-[#1a202e]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Settings Content Deck */}
            <div className="p-8 sm:p-10 flex-1 overflow-y-auto space-y-6">
              
              {/* Graphics Tab */}
              {settingsTab === 'graphics' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4 p-6 bg-[#141924] border border-white/[0.08] rounded-xl shadow-lg">
                    <div>
                      <div className="text-base font-bold uppercase tracking-wider text-white">Ограничение частоты кадров (FPS)</div>
                      <div className="text-xs text-[#8b929e] mt-1 font-mono">Фиксация вертикальной синхронизации рендера</div>
                    </div>
                    <div className="flex gap-2">
                      {[30, 60, 120, 0].map((fps) => (
                        <button
                          key={fps}
                          type="button"
                          onClick={() => {
                            onUpdateSettings({ ...settings, fpsLimit: fps });
                            playUiSound(800);
                          }}
                          className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                            settings.fpsLimit === fps
                              ? 'bg-[#c68a35] text-black border-[#c68a35] font-black'
                              : 'bg-white/[0.04] text-[#8b929e] border-white/10 hover:text-white'
                          }`}
                        >
                          {fps === 0 ? 'Без лимита' : `${fps} FPS`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Audio Tab */}
              {settingsTab === 'audio' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4 p-6 bg-[#141924] border border-white/[0.08] rounded-xl shadow-lg">
                    <div>
                      <div className="text-base font-bold uppercase tracking-wider text-white">Звуковые эффекты двигателя и мира</div>
                      <div className="text-xs text-[#8b929e] mt-1 font-mono">Шум мотора, скрип шин, переключение КПП, интерфейс</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleMute();
                        playUiSound(800);
                      }}
                      className={`px-6 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                        !isMuted
                          ? 'bg-[#c68a35] text-black border-[#c68a35] font-black'
                          : 'bg-rose-950/60 text-rose-300 border-rose-800/40'
                      }`}
                    >
                      {!isMuted ? 'Звук включен' : 'Звук заглушен'}
                    </button>
                  </div>
                </div>
              )}

              {/* Gameplay / World Tab */}
              {settingsTab === 'gameplay' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4 p-6 bg-[#141924] border border-white/[0.08] rounded-xl shadow-lg">
                    <div>
                      <div className="text-base font-bold uppercase tracking-wider text-white">Интервал автосохранения</div>
                      <div className="text-xs text-[#8b929e] mt-1 font-mono">Периодичность записи состояния в секундах</div>
                    </div>
                    <div className="flex gap-2">
                      {[30, 60, 120, 300].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => {
                            onUpdateSettings({ ...settings, autoSaveInterval: sec });
                            playUiSound(800);
                          }}
                          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                            settings.autoSaveInterval === sec
                              ? 'bg-[#c68a35] text-black border-[#c68a35] font-black'
                              : 'bg-white/[0.04] text-[#8b929e] border-white/10 hover:text-white'
                          }`}
                        >
                          {sec} сек
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-4 p-6 bg-[#141924] border border-white/[0.08] rounded-xl shadow-lg">
                    <div>
                      <div className="text-base font-bold uppercase tracking-wider text-white">Суточный ход времени</div>
                      <div className="text-xs text-[#8b929e] mt-1 font-mono">Автоматический цикл смены дня и ночи</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateSettings({ ...settings, timeAutoCycle: !settings.timeAutoCycle });
                        playUiSound(800);
                      }}
                      className={`px-6 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
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
                <div className="space-y-6">
                  <div className="p-6 bg-[#141924] border border-white/[0.08] rounded-xl shadow-lg">
                    <div className="text-base font-bold uppercase tracking-wider text-white">Чувствительность мыши</div>
                    <div className="flex items-center gap-5 mt-4">
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={settings.mouseSensitivity}
                        onChange={(e) => onUpdateSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) })}
                        className="w-full accent-[#c68a35] cursor-pointer h-2 bg-[#0b0c0e] rounded-lg appearance-none"
                      />
                      <span className="text-sm font-mono font-bold text-[#c68a35] shrink-0">{settings.mouseSensitivity.toFixed(1)}x</span>
                    </div>
                  </div>

                  <div className="p-6 bg-[#141924] border border-white/[0.08] rounded-xl text-xs font-mono leading-relaxed text-[#8b929e] space-y-3 shadow-lg">
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
            <div className="px-8 sm:px-10 py-5 border-t border-white/10 bg-[#141924] flex items-center justify-between text-xs font-mono text-[#8b929e]">
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

      {/* LOADING SCREEN OVERLAY (BEAMNG SIMULATION STYLE) */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 bg-[#080a0e] select-none animate-in fade-in duration-150">
          
          <div className="w-full max-w-lg flex flex-col items-center text-center space-y-8">
            
            {/* Loading Brand Emblem */}
            <div className="flex items-center gap-4 px-7 py-3.5 bg-[#121620] border border-white/10 rounded-xl shadow-2xl">
              <div className="w-3 h-8 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_16px_rgba(198,138,53,0.6)]" />
              <span className="text-2xl font-black italic tracking-widest text-white uppercase font-sans">
                СТЕПНОЙ ТРАКТ 2D
              </span>
              <div className="w-3 h-8 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_16px_rgba(198,138,53,0.6)]" />
            </div>

            {/* Stage Title */}
            <div className="space-y-2">
              <h3 className="text-base font-bold uppercase tracking-wider text-white font-mono">
                {loadingStageText}
              </h3>
              <p className="text-xs font-mono text-[#8b929e]">
                Подготовка транспортной симуляции...
              </p>
            </div>

            {/* Ochre Progress Bar */}
            <div className="w-full space-y-2.5">
              <div className="w-full h-3 bg-[#181d2a] border border-white/10 rounded-lg overflow-hidden p-0.5">
                <div 
                  className="h-full bg-[#c68a35] rounded transition-all duration-300 ease-out shadow-[0_0_16px_rgba(198,138,53,0.8)]"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-[#8b929e]">
                <span>ЗАГРУЗКА РЕСУРСОВ</span>
                <span className="text-[#c68a35] font-bold">{loadingProgress}%</span>
              </div>
            </div>

            {/* Helpful Driver Tip */}
            <div className="p-5 bg-[#121620] border border-white/[0.08] rounded-xl text-xs font-mono text-[#8b929e] leading-relaxed max-w-md shadow-lg">
              {LOADING_TIPS[loadingTipIndex]}
            </div>

          </div>

        </div>
      )}

      {/* BOTTOM FOOTER BAR WITH SPACIOUS MARGINS */}
      <footer className="relative z-10 px-8 py-4 flex items-center justify-between text-xs font-mono text-[#8b929e] border-t border-white/[0.08] bg-[#080a0e]/95">
        <div>
          <span>СТЕПНОЙ ТРАКТ 2D</span>
          <span className="mx-2.5 text-white/20">·</span>
          <span>ТРАНСПОРТНЫЙ СИМУЛЯТОР</span>
        </div>
        <div>
          <span className="text-[#c68a35] font-bold">СБОРКА 0.33.2</span>
        </div>
      </footer>

    </div>
  );
};

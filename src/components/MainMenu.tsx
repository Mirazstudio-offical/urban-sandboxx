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
  Bell
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
    icon: <TreePine className="w-5 h-5 text-[#c9922b]" />
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Площадь Администрации (Центр)',
    x: 4350,
    y: 2000,
    description: 'Официальный центр города, парковка перед госучреждениями и широкий центральный проспект.',
    icon: <Building2 className="w-5 h-5 text-[#c9922b]" />
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Двор (Хрущёвки & Гаражи)',
    x: 2750,
    y: 2750,
    description: 'Панельные пятиэтажки, детская площадка, гаражные боксы и узкие дворовые проезды.',
    icon: <Home className="w-5 h-5 text-[#c9922b]" />
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Yard',
    nameRu: 'Промзона (Автобаза №4 & Склады)',
    x: 6530,
    y: 1030,
    description: 'Грузовые ангары, ремонтные ямы, стоянка спецтехники и дорожные бетонные плиты.',
    icon: <Truck className="w-5 h-5 text-[#c9922b]" />
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
  // Navigation & Modals State matching reference layout
  const [activeModal, setActiveModal] = useState<'none' | 'saves' | 'new' | 'settings'>('none');
  const [settingsTab, setSettingsTab] = useState<'gfx' | 'sound' | 'ctrl' | 'game'>('gfx');
  
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

  const latestSave = saves.length > 0 ? saves[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0e10] overflow-hidden select-none font-['Barlow',system-ui,sans-serif] text-[#e9e6df] text-[15px]">
      <div className="relative w-full max-w-[1440px] aspect-[1440/900] max-h-screen overflow-hidden bg-[#121315]">
        
        {/* Background Atmosphere & Gradient Glow matching reference */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#17140f] via-[#2b2218] to-[#120f0b]" />
        <div className="absolute -left-[200px] top-0 w-[1840px] h-[900px] bg-[radial-gradient(900px_520px_at_70%_82%,rgba(201,146,43,0.42),transparent_62%)] pointer-events-none" />
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />

        {/* LOADING SCREEN OVERLAY */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-[#080a0e]">
            <div className="w-full max-w-lg flex flex-col items-center text-center space-y-8 animate-in fade-in duration-150">
              <div className="flex items-center gap-4 px-7 py-3.5 bg-[#121620] border border-white/10 rounded-xl shadow-2xl">
                <div className="w-3 h-8 bg-[#c9922b] -skew-x-12 shrink-0 shadow-[0_0_16px_rgba(201,146,43,0.6)]" />
                <span className="text-2xl font-black italic tracking-widest text-white uppercase font-['Barlow_Condensed',sans-serif]">
                  СТЕПНОЙ ТРАКТ 2D
                </span>
                <div className="w-3 h-8 bg-[#c9922b] -skew-x-12 shrink-0 shadow-[0_0_16px_rgba(201,146,43,0.6)]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold uppercase tracking-wider text-white font-mono">
                  {loadingStageText}
                </h3>
                <p className="text-xs font-mono text-[#a29e93]">
                  Подготовка транспортной симуляции...
                </p>
              </div>
              <div className="w-full space-y-2.5">
                <div className="w-full h-3 bg-[#181d2a] border border-white/10 rounded-lg overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-[#c9922b] rounded transition-all duration-300 ease-out shadow-[0_0_16px_rgba(201,146,43,0.8)]"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-mono text-[#a29e93]">
                  <span>ЗАГРУЗКА РЕСУРСОВ</span>
                  <span className="text-[#c9922b] font-bold">{loadingProgress}%</span>
                </div>
              </div>
              <div className="p-5 bg-[#121620] border border-white/[0.08] rounded-xl text-xs font-mono text-[#a29e93] leading-relaxed max-w-md shadow-lg">
                {LOADING_TIPS[loadingTipIndex]}
              </div>
            </div>
          </div>
        )}

        {/* 1. MAIN MENU SCREEN */}
        {activeModal === 'none' && !isLoading && (
          <div className="absolute inset-0 bg-gradient-to-r from-[#090a0e]/90 via-[#090a0e]/60 to-transparent">
            {/* Top Bar */}
            <div className="absolute left-[64px] right-[64px] top-[34px] h-[44px] flex items-center justify-between z-10">
              <div className="flex items-center gap-[14px]">
                <svg width="36" height="36" viewBox="0 0 36 36"><path d="M18 2 32 10v16L18 34 4 26V10z" fill="none" stroke="#c9922b" strokeWidth="2.5"/><path d="M11 22 18 11l7 11z" fill="#c9922b"/></svg>
                <span className="font-['Barlow_Condensed',sans-serif] text-[15px] font-semibold uppercase tracking-[0.08em]">Главное меню</span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => playUiSound(700)} 
                  className="flex items-center gap-[10px] h-[44px] px-[16px] rounded-[10px] bg-[#161618]/70 border border-white/10 hover:border-[#c9922b]/50 transition-all cursor-pointer"
                  title="Уведомления"
                >
                  <Bell className="w-5 h-5 text-[#cfcbc1]" />
                  <span className="text-[#a29e93] text-[14px]">0</span>
                </button>
                <button 
                  onClick={() => {
                    playUiSound(700);
                    if (onOpenProfile) onOpenProfile();
                  }}
                  className="flex items-center gap-[10px] h-[44px] px-[16px] rounded-[10px] bg-[#161618]/70 border border-white/10 hover:border-[#c9922b]/50 transition-all cursor-pointer"
                >
                  <span className="w-[26px] h-[26px] rounded-full bg-[#c9922b] text-[#1a1409] inline-flex items-center justify-center font-bold text-[13px]">И</span>
                  <span className="font-medium">Игрок_0417</span>
                </button>
              </div>
            </div>

            {/* Left Vertical Menu */}
            <div className="absolute left-[64px] top-[176px] w-[420px] flex flex-col gap-[6px]">
              {/* Continue Latest Save */}
              <button
                onClick={() => {
                  playUiSound(900);
                  if (latestSave) {
                    handleLoadSaveSlot(latestSave.id);
                  } else {
                    setActiveModal('new');
                  }
                }}
                className="flex flex-col justify-center items-start gap-[2px] h-[84px] px-[22px] bg-[rgba(201,146,43,0.16)] border-l-[3px] border-[#c9922b] text-white font-['Barlow_Condensed',sans-serif] text-[27px] font-semibold uppercase tracking-[0.08em] hover:bg-white/15 transition-all cursor-pointer"
              >
                <span>Продолжить</span>
                <span className="font-['Barlow',sans-serif] font-normal text-[14px] text-[#a29e93] normal-case tracking-normal">
                  {latestSave ? `«${latestSave.name}» — последняя сессия` : 'Нет сохранений · Начать новую'}
                </span>
              </button>

              <button
                onClick={() => {
                  playUiSound(750);
                  setActiveModal('new');
                }}
                className="flex items-center gap-[18px] h-[62px] px-[22px] border-l-[3px] border-transparent font-['Barlow_Condensed',sans-serif] text-[27px] font-semibold uppercase tracking-[0.08em] text-[#cfcbc1] hover:bg-white/[0.06] hover:text-white hover:border-l-[#c9922b] hover:pl-[30px] transition-all cursor-pointer"
              >
                <PlusCircle className="w-6 h-6 text-[#c9922b]" />
                <span>Новая сессия</span>
              </button>

              <button
                onClick={() => {
                  playUiSound(750);
                  setActiveModal('saves');
                }}
                className="flex items-center gap-[18px] h-[62px] px-[22px] border-l-[3px] border-transparent font-['Barlow_Condensed',sans-serif] text-[27px] font-semibold uppercase tracking-[0.08em] text-[#cfcbc1] hover:bg-white/[0.06] hover:text-white hover:border-l-[#c9922b] hover:pl-[30px] transition-all cursor-pointer"
              >
                <HardDrive className="w-6 h-6 text-[#c9922b]" />
                <span>Загрузить</span>
              </button>

              {onOpenOnline && (
                <button
                  onClick={() => {
                    playUiSound(750);
                    onOpenOnline();
                  }}
                  className="flex items-center gap-[18px] h-[62px] px-[22px] border-l-[3px] border-transparent font-['Barlow_Condensed',sans-serif] text-[27px] font-semibold uppercase tracking-[0.08em] text-[#cfcbc1] hover:bg-white/[0.06] hover:text-white hover:border-l-[#c9922b] hover:pl-[30px] transition-all cursor-pointer"
                >
                  <Globe className="w-6 h-6 text-[#c9922b]" />
                  <span>Онлайн</span>
                </button>
              )}

              <button
                onClick={() => {
                  playUiSound(750);
                  if (onOpenProfile) onOpenProfile();
                }}
                className="flex items-center gap-[18px] h-[62px] px-[22px] border-l-[3px] border-transparent font-['Barlow_Condensed',sans-serif] text-[27px] font-semibold uppercase tracking-[0.08em] text-[#cfcbc1] hover:bg-white/[0.06] hover:text-white hover:border-l-[#c9922b] hover:pl-[30px] transition-all cursor-pointer"
              >
                <User className="w-6 h-6 text-[#c9922b]" />
                <span>Аккаунт</span>
              </button>

              <button
                onClick={() => {
                  playUiSound(750);
                  setActiveModal('settings');
                }}
                className="flex items-center gap-[18px] h-[62px] px-[22px] border-l-[3px] border-transparent font-['Barlow_Condensed',sans-serif] text-[27px] font-semibold uppercase tracking-[0.08em] text-[#cfcbc1] hover:bg-white/[0.06] hover:text-white hover:border-l-[#c9922b] hover:pl-[30px] transition-all cursor-pointer"
              >
                <Sliders className="w-6 h-6 text-[#c9922b]" />
                <span>Настройки</span>
              </button>

              <button
                onClick={() => {
                  playUiSound(600);
                  onResume();
                }}
                className="flex items-center gap-[18px] h-[62px] px-[22px] border-l-[3px] border-transparent font-['Barlow_Condensed',sans-serif] text-[27px] font-semibold uppercase tracking-[0.08em] text-[#a29e93] hover:bg-white/[0.06] hover:text-white hover:border-l-[#a29e93] hover:pl-[30px] transition-all cursor-pointer mt-[14px]"
              >
                <ArrowLeft className="w-6 h-6 text-[#a29e93]" />
                <span>В игру [ESC]</span>
              </button>
            </div>

            {/* Right Panel: Last Session Preview Card */}
            <div className="absolute left-[880px] top-[176px] w-[496px] bg-[rgba(20,20,22,0.82)] border border-white/10 rounded-[14px] p-[14px]">
              <div className="h-[268px] rounded-[10px] bg-gradient-to-b from-[#3b2a1b] to-[#c47a2a] relative overflow-hidden flex items-center justify-center">
                <Car className="w-20 h-20 text-white/30" />
              </div>
              <div className="p-[16px_8px_6px]">
                <div className="font-['Barlow_Condensed',sans-serif] text-[#a29e93] text-[13px] uppercase tracking-[0.08em]">Последняя сессия</div>
                <div className="font-['Barlow_Condensed',sans-serif] text-[30px] font-bold uppercase tracking-[0.08em] mt-[4px]">
                  {latestSave ? latestSave.name : 'Степной Тракт · Свободная езда'}
                </div>
                <div className="text-[#a29e93] flex gap-[26px] mt-[12px] text-[14px]">
                  <span>Карта: Степной регион</span>
                  <span>Время: {latestSave ? formatGameTime(latestSave.timeHour || 10) : '10:00'}</span>
                </div>
                <button
                  onClick={() => {
                    playUiSound(900);
                    if (latestSave) handleLoadSaveSlot(latestSave.id);
                    else setActiveModal('new');
                  }}
                  className="mt-[18px] inline-flex items-center justify-center gap-[8px] h-[46px] px-[24px] rounded-[10px] bg-[#c9922b] text-[#1a1409] font-bold text-[16px] hover:brightness-115 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Продолжить</span>
                </button>
              </div>
            </div>

            {/* Hint Bar */}
            <div className="absolute left-[64px] right-[64px] bottom-[34px] flex items-center justify-between text-[13px] text-[#a29e93]">
              <div className="flex items-center">
                <span className="inline-flex items-center justify-center min-w-[28px] h-[26px] px-[8px] rounded-[6px] border border-white/22 font-semibold text-[12px] mr-[8px]">↑↓</span>Навигация
                <span className="inline-flex items-center justify-center min-w-[28px] h-[26px] px-[8px] rounded-[6px] border border-white/22 font-semibold text-[12px] ml-[22px] mr-[8px]">Enter</span>Выбрать
                <span className="inline-flex items-center justify-center min-w-[28px] h-[26px] px-[8px] rounded-[6px] border border-white/22 font-semibold text-[12px] ml-[22px] mr-[8px]">Esc</span>Назад
              </div>
              <div>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Степной Тракт</div>
            </div>
          </div>
        )}

        {/* 2. SAVES / LOAD MODAL SCREEN */}
        {activeModal === 'saves' && !isLoading && (
          <div className="absolute inset-0 bg-[#121315] z-30 flex flex-col">
            <div className="absolute left-[64px] right-[64px] top-[34px] h-[44px] flex items-center justify-between">
              <div className="flex items-center gap-[16px]">
                <button 
                  onClick={() => setActiveModal('none')}
                  className="flex items-center justify-center w-[44px] h-[44px] rounded-[10px] bg-[#161618] border border-white/10 hover:border-[#c9922b] transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 text-[#e9e6df]" />
                </button>
                <span className="font-['Barlow_Condensed',sans-serif] text-[26px] font-bold uppercase tracking-[0.08em]">Загрузить сессию</span>
              </div>
            </div>

            <div className="absolute left-[64px] right-[64px] top-[112px] bottom-[100px] overflow-y-auto pr-4">
              {saves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                  <HardDrive className="w-16 h-16 text-[#c9922b]" />
                  <div className="font-['Barlow_Condensed',sans-serif] text-2xl uppercase tracking-wider">Сохранений не найдено</div>
                  <button
                    onClick={() => setActiveModal('new')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#c9922b] text-[#1a1409] font-bold text-base cursor-pointer"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Создать новую сессию</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-[20px]">
                  {saves.map((s, idx) => (
                    <div 
                      key={s.id} 
                      onClick={() => handleLoadSaveSlot(s.id)}
                      className="group bg-[rgba(20,20,22,0.86)] border border-white/10 hover:border-[#c9922b] rounded-[13px] overflow-hidden transition-all cursor-pointer hover:-translate-y-1"
                    >
                      <div className="h-[178px] bg-gradient-to-b from-[#2b2218] to-[#120f0b] flex items-center justify-center">
                        <Car className="w-14 h-14 text-white/30 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="p-[14px_16px]">
                        <div className="font-['Barlow_Condensed',sans-serif] text-[22px] font-bold uppercase tracking-[0.08em] truncate">{s.name}</div>
                        <div className="flex justify-between text-[13px] text-[#a29e93] mt-[8px]">
                          <span>{s.streetName || 'Степной Тракт'}</span>
                          <span>{formatGameTime(s.timeHour || 10)}</span>
                        </div>
                        <div className="flex justify-between text-[13px] text-[#a29e93] mt-[4px]">
                          <span>{s.calendar ? formatGameDate(s.calendar, 'medium') : '08.10.2026'}</span>
                          <span className="text-[#c9922b] font-semibold">{idx === 0 ? 'Последнее' : ''}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="absolute left-[64px] right-[64px] bottom-[34px] flex items-center justify-between text-[13px] text-[#a29e93]">
              <div>Нажмите на сохранение для загрузки сессии</div>
              <button onClick={() => setActiveModal('none')} className="hover:text-white transition-colors cursor-pointer">Назад [Esc]</button>
            </div>
          </div>
        )}

        {/* 3. NEW SESSION / MAP & SPAWN MODAL SCREEN */}
        {activeModal === 'new' && !isLoading && (
          <div className="absolute inset-0 bg-[#121315] z-30 flex flex-col">
            <div className="absolute left-[64px] right-[64px] top-[34px] h-[44px] flex items-center justify-between">
              <div className="flex items-center gap-[16px]">
                <button 
                  onClick={() => setActiveModal('none')}
                  className="flex items-center justify-center w-[44px] h-[44px] rounded-[10px] bg-[#161618] border border-white/10 hover:border-[#c9922b] transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 text-[#e9e6df]" />
                </button>
                <span className="font-['Barlow_Condensed',sans-serif] text-[26px] font-bold uppercase tracking-[0.08em]">Новая сессия</span>
              </div>
              <div className="text-[#a29e93] text-[14px]">
                <b className="text-[#c9922b]">1</b> Выбор точки выезда <span className="mx-2">—</span> <b className="text-[#c9922b]">2</b> Запуск симуляции
              </div>
            </div>

            <div className="absolute left-[64px] top-[112px] w-[880px] bottom-[90px] overflow-y-auto pr-4">
              <div className="font-['Barlow_Condensed',sans-serif] text-[18px] font-bold uppercase tracking-[0.08em] mb-[16px]">Доступные сектора спавна на карте</div>
              <div className="grid grid-cols-2 gap-[20px]">
                {spawnLocations.map((loc) => {
                  const isSelected = selectedSpawnId === loc.id;
                  return (
                    <div
                      key={loc.id}
                      onClick={() => {
                        setSelectedSpawnId(loc.id);
                        playUiSound(700);
                      }}
                      className={`group p-[20px] rounded-[14px] border transition-all cursor-pointer bg-[rgba(20,20,22,0.86)] ${
                        isSelected 
                          ? 'border-[#c9922b] shadow-[0_0_20px_rgba(201,146,43,0.3)] bg-[rgba(201,146,43,0.08)]' 
                          : 'border-white/10 hover:border-[#c9922b]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#c9922b]">
                          {loc.icon}
                        </div>
                        {isSelected && (
                          <span className="px-3 py-1 rounded bg-[#c9922b] text-[#1a1409] font-bold text-[11px] font-mono uppercase">
                            Выбрано
                          </span>
                        )}
                      </div>
                      <div className="font-['Barlow_Condensed',sans-serif] text-[22px] font-bold uppercase tracking-[0.08em]">{loc.nameRu}</div>
                      <div className="text-[#a29e93] text-[13px] mt-2">{loc.description}</div>
                      <div className="mt-4 pt-3 border-t border-white/10 text-[12px] font-mono text-[#a29e93] flex justify-between">
                        <span>Координаты: X:{loc.x} Y:{loc.y}</span>
                        <span className="text-[#c9922b]">Степной Тракт</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right configuration panel for new game */}
            <div className="absolute right-[64px] top-[112px] w-[400px] bottom-[90px] bg-[rgba(20,20,22,0.82)] border border-white/10 rounded-[14px] p-[20px] flex flex-col justify-between">
              <div className="space-y-[20px]">
                <div className="font-['Barlow_Condensed',sans-serif] text-[24px] font-bold uppercase tracking-[0.08em]">Параметры поездки</div>
                <div>
                  <div className="text-[12px] text-[#a29e93] mb-[8px] uppercase tracking-wider font-mono">Имя водителя / позывной</div>
                  <input
                    type="text"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    maxLength={32}
                    className="w-full h-[52px] px-[16px] rounded-[10px] bg-white/[0.06] border-[1.5px] border-[#c9922b] text-[18px] font-medium text-white focus:outline-none"
                  />
                </div>
                <div>
                  <div className="text-[12px] text-[#a29e93] mb-[8px] uppercase tracking-wider font-mono">Режим симуляции</div>
                  <div className="flex rounded-[10px] overflow-hidden border border-white/14">
                    <span className="flex-1 flex items-center justify-center h-[40px] bg-[#c9922b] text-[#1a1409] font-semibold text-[14px]">Свободная езда</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartNewGame()}
                className="w-full h-[52px] rounded-[10px] bg-[#c9922b] text-[#1a1409] font-bold text-[17px] inline-flex items-center justify-center gap-[8px] hover:brightness-115 transition-all cursor-pointer shadow-lg"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Начать сессию</span>
              </button>
            </div>

            <div className="absolute left-[64px] right-[64px] bottom-[34px] flex items-center justify-between text-[13px] text-[#a29e93]">
              <div>Выберите стартовую точку и введите имя для выезда на трассу</div>
              <button onClick={() => setActiveModal('none')} className="hover:text-white transition-colors cursor-pointer">Назад [Esc]</button>
            </div>
          </div>
        )}

        {/* 4. SETTINGS MODAL SCREEN */}
        {activeModal === 'settings' && !isLoading && (
          <div className="absolute inset-0 bg-[#121315] z-30 flex flex-col">
            <div className="absolute left-[64px] right-[64px] top-[34px] h-[44px] flex items-center justify-between">
              <div className="flex items-center gap-[16px]">
                <button 
                  onClick={() => setActiveModal('none')}
                  className="flex items-center justify-center w-[44px] h-[44px] rounded-[10px] bg-[#161618] border border-white/10 hover:border-[#c9922b] transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 text-[#e9e6df]" />
                </button>
                <span className="font-['Barlow_Condensed',sans-serif] text-[26px] font-bold uppercase tracking-[0.08em]">Настройки</span>
              </div>
            </div>

            {/* Sub-navigation tabs for Settings matching reference */}
            <div className="absolute left-[64px] top-[112px] w-[260px] flex flex-col gap-[4px]">
              {[
                { id: 'gfx', label: 'Графика' },
                { id: 'sound', label: 'Звук' },
                { id: 'ctrl', label: 'Управление' },
                { id: 'game', label: 'Геймплей' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSettingsTab(tab.id as any);
                    playUiSound(700);
                  }}
                  className={`flex items-center h-[52px] px-[20px] font-['Barlow_Condensed',sans-serif] text-[22px] font-semibold uppercase tracking-[0.08em] border-l-[3px] transition-all cursor-pointer ${
                    settingsTab === tab.id 
                      ? 'bg-[rgba(201,146,43,0.16)] border-l-[#c9922b] text-white' 
                      : 'border-l-transparent text-[#cfcbc1] hover:bg-white/[0.05]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Settings Content Panel */}
            <div className="absolute left-[350px] top-[112px] w-[700px] bottom-[90px] bg-[rgba(20,20,22,0.82)] border border-white/10 rounded-[14px] overflow-y-auto">
              {settingsTab === 'gfx' && (
                <div className="p-6 space-y-6">
                  <div className="font-['Barlow_Condensed',sans-serif] text-[#c9922b] text-[16px] uppercase tracking-wider">Производительность и FPS</div>
                  <div className="flex items-center justify-between py-3 border-t border-white/10">
                    <span className="font-medium">Лимит кадров (FPS)</span>
                    <div className="flex gap-2">
                      {[30, 60, 120, 0].map((fps) => (
                        <button
                          key={fps}
                          onClick={() => {
                            onUpdateSettings({ ...settings, fpsLimit: fps });
                            playUiSound(800);
                          }}
                          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                            settings.fpsLimit === fps
                              ? 'bg-[#c9922b] text-[#1a1409] border-[#c9922b]'
                              : 'bg-white/[0.04] text-[#a29e93] border-white/10 hover:text-white'
                          }`}
                        >
                          {fps === 0 ? 'Без лимита' : `${fps}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'sound' && (
                <div className="p-6 space-y-6">
                  <div className="font-['Barlow_Condensed',sans-serif] text-[#c9922b] text-[16px] uppercase tracking-wider">Аудиосистема</div>
                  <div className="flex items-center justify-between py-3 border-t border-white/10">
                    <span className="font-medium">Звуки двигателя и эффекты мира</span>
                    <button
                      onClick={() => {
                        onToggleMute();
                        playUiSound(800);
                      }}
                      className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                        !isMuted ? 'bg-[#c9922b] text-[#1a1409] border-[#c9922b]' : 'bg-rose-950/60 text-rose-300 border-rose-800'
                      }`}
                    >
                      {!isMuted ? 'Звук включен' : 'Заглушено'}
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'ctrl' && (
                <div className="p-6 space-y-6">
                  <div className="font-['Barlow_Condensed',sans-serif] text-[#c9922b] text-[16px] uppercase tracking-wider">Управление и мышь</div>
                  <div className="py-3 border-t border-white/10 space-y-3">
                    <div className="flex justify-between font-medium">
                      <span>Чувствительность мыши</span>
                      <span className="text-[#c9922b] font-mono font-bold">{settings.mouseSensitivity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={settings.mouseSensitivity}
                      onChange={(e) => onUpdateSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) })}
                      className="w-full accent-[#c9922b] cursor-pointer h-2 bg-[#0b0c0e] rounded-lg appearance-none"
                    />
                  </div>
                </div>
              )}

              {settingsTab === 'game' && (
                <div className="p-6 space-y-6">
                  <div className="font-['Barlow_Condensed',sans-serif] text-[#c9922b] text-[16px] uppercase tracking-wider">Параметры мира</div>
                  <div className="flex items-center justify-between py-3 border-t border-white/10">
                    <span className="font-medium">Автосохранение</span>
                    <span className="text-[#c9922b] font-mono">{settings.autoSaveInterval} сек</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-t border-white/10">
                    <span className="font-medium">Суточный цикл времени</span>
                    <button
                      onClick={() => {
                        onUpdateSettings({ ...settings, timeAutoCycle: !settings.timeAutoCycle });
                        playUiSound(800);
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                        settings.timeAutoCycle ? 'bg-[#c9922b] text-[#1a1409] border-[#c9922b]' : 'bg-white/5 text-[#a29e93] border-white/10'
                      }`}
                    >
                      {settings.timeAutoCycle ? 'Активен' : 'Отключен'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute left-[64px] right-[64px] bottom-[34px] flex items-center justify-between text-[13px] text-[#a29e93]">
              <div>Изменения применяются мгновенно</div>
              <button onClick={() => setActiveModal('none')} className="hover:text-white transition-colors cursor-pointer">Назад [Esc]</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

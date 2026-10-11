import React, { useState, useEffect } from 'react';
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
  Wrench,
  Navigation,
  Flag,
  Award,
  Layers,
  ChevronRight,
  ExternalLink,
  Fuel,
  Activity,
  Sliders,
  Cpu,
  Sparkles,
  Zap
} from 'lucide-react';
import { formatGameDate, formatGameTime, getRussianSeasonName } from '../calendarSystem';

// High-fidelity BeamNG visual assets
import menuHeroImg from '../assets/images/beamng_menu_hero_1791703353250.jpg';
import freeroamMapImg from '../assets/images/beamng_freeroam_map_1791703364957.jpg';
import garagePreviewImg from '../assets/images/beamng_garage_preview_1791703391663.jpg';
import scenarioPreviewImg from '../assets/images/beamng_scenario_preview_1791703403438.jpg';

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

export type BeamMenuCategory = 
  | 'freeroam' 
  | 'career' 
  | 'scenarios' 
  | 'saves' 
  | 'garage' 
  | 'multiplayer' 
  | 'settings' 
  | 'editor' 
  | 'about';

type SettingsTab = 'graphics' | 'audio' | 'gameplay' | 'controls';

const DEFAULT_SPAWNS: SpawnLocation[] = [
  {
    id: 'central_park',
    name: 'Central Park Promenade',
    nameRu: 'Городской Сквер (Фонтан & Сквер)',
    x: 4400,
    y: 2800,
    description: 'Парковый фонтан, асфальтированные аллеи, пешеходная зона и кольцевые проезды.',
    icon: <TreePine className="w-4 h-4 text-[#ff6600]" />
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Площадь Администрации (Центр)',
    x: 4350,
    y: 2000,
    description: 'Центральный проспект города, широкая парковка перед госучреждениями и светофоры.',
    icon: <Building2 className="w-4 h-4 text-[#ff6600]" />
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Двор (Хрущёвки & Гаражи)',
    x: 2750,
    y: 2750,
    description: 'Панельные пятиэтажки, узкие дворовые проезды, гаражные кооперативы и грунтовые обочины.',
    icon: <Home className="w-4 h-4 text-[#ff6600]" />
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Yard',
    nameRu: 'Промзона (Автобаза №4 & Склады)',
    x: 6530,
    y: 1030,
    description: 'Грузовые ангары, асфальтобетонные плиты, ремонтные эстакады и грузовые подъезды.',
    icon: <Truck className="w-4 h-4 text-[#ff6600]" />
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
  const [activeCategory, setActiveCategory] = useState<BeamMenuCategory>('freeroam');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('graphics');
  const [driverName, setDriverName] = useState<string>('Водитель #1');
  const [selectedSpawnId, setSelectedSpawnId] = useState<string>(spawnLocations[0]?.id || 'central_park');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const hasSaves = saves.length > 0;
  const latestSave = hasSaves ? saves[0] : null;

  // Lightweight synthesized BeamNG mechanical UI audio feedback
  const playSoundEffect = (type: 'hover' | 'click' | 'launch') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'hover') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.02);
        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.025);
      } else if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.035);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.042);
      } else if (type === 'launch') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.11);
      }
    } catch {}
  };

  // Keyboard shortcut for quick actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeCategory !== 'freeroam') {
          setActiveCategory('freeroam');
          playSoundEffect('click');
        } else {
          onResume();
          playSoundEffect('click');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCategory, onResume]);

  const handleStartGame = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    playSoundEffect('launch');
    const finalName = driverName.trim() || 'Водитель #1';
    onNewGame(finalName, selectedSpawnId);
  };

  const handleSelectScenario = (scenarioName: string, spawnId: string) => {
    playSoundEffect('launch');
    onNewGame(scenarioName, spawnId);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#0b0c0e] text-[#f0f3f6] font-sans select-none overflow-hidden">
      
      {/* ========================================================================= */}
      {/* 1. CINEMATIC FULL-SCREEN BACKDROP WITH BEAMNG AESTHETIC                   */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Proving Grounds Pro Shot */}
        <img 
          src={menuHeroImg} 
          alt="BeamNG Proving Ground Backdrop" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
        />

        {/* Ambient Dark Gradient Vignette for 100% Contrast & Legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c0e]/95 via-[#0b0c0e]/85 to-[#0b0c0e]/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0e] via-transparent to-[#0b0c0e]/60" />

        {/* Subtle Proving Ground Technical Grid Scanlines */}
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP BAR CONTRACT: BRAND LOGO — STATUS & QUICK ACTIONS                  */}
      {/* ========================================================================= */}
      <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-4 border-b border-white/[0.08] bg-[#0e1014]/80 backdrop-blur-md">
        
        {/* Zone 1: BeamNG Stylized Logo */}
        <div className="flex items-center gap-3.5 shrink-0">
          {/* Authentic BeamNG Node Truss Emblem */}
          <div className="relative flex items-center justify-center w-9 h-9 bg-black/60 border border-[#ff6600]/40 rounded-[2px] shadow-[0_0_15px_rgba(255,102,0,0.2)]">
            <svg className="w-5 h-5" viewBox="0 0 100 100" fill="none">
              <line x1="50" y1="22" x2="22" y2="76" stroke="#ff6600" strokeWidth="12" strokeLinecap="round" />
              <line x1="50" y1="22" x2="78" y2="76" stroke="#ff6600" strokeWidth="12" strokeLinecap="round" />
              <line x1="22" y1="76" x2="78" y2="76" stroke="#ff6600" strokeWidth="12" strokeLinecap="round" />
              <circle cx="50" cy="22" r="13" fill="#ff6600" />
              <circle cx="22" cy="76" r="13" fill="#ff6600" />
              <circle cx="78" cy="76" r="13" fill="#ff6600" />
              <circle cx="50" cy="58" r="7" fill="#ffffff" />
            </svg>
          </div>

          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-xl font-black tracking-tight text-white uppercase font-sans">
                BEAMNG
              </span>
              <span className="text-xl font-black tracking-tight text-[#ff6600] font-sans">
                .DRIVE
              </span>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#8b929e] uppercase ml-1">
                2D SIMULATOR
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#8b929e] tracking-wider mt-0.5">
              STEPPE EXPEDITION • SOFTBODY & POWERTRAIN
            </div>
          </div>
        </div>

        {/* Zone 2: Quick Status Information */}
        <div className="hidden lg:flex items-center gap-6 text-xs text-[#8b929e] font-mono whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="text-white/60">КАРТА:</span>
            <span className="text-white font-bold">Степной Тракт</span>
          </div>
          <span aria-hidden="true">·</span>
          <div className="flex items-center gap-2">
            <span className="text-white/60">СЛОТОВ В АРХИВЕ:</span>
            <span className="text-[#ff6600] font-bold">{saves.length}</span>
          </div>
          <span aria-hidden="true">·</span>
          <div className="flex items-center gap-2">
            <span className="text-white/60">ВЕРСИЯ:</span>
            <span className="text-white/80">0.33.2.0 • x64</span>
          </div>
        </div>

        {/* Zone 3: Quick Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Resume Session Button */}
          <button
            onClick={() => {
              playSoundEffect('click');
              onResume();
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-[#f0f3f6] hover:text-white rounded-[2px] transition-all text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
            title="Вернуться к текущему сеансу (ESC)"
          >
            <Play className="w-3.5 h-3.5 text-[#ff6600] fill-current" />
            <span className="hidden sm:inline">В игру</span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => {
              playSoundEffect('click');
              onToggleMute();
            }}
            className={`p-2 rounded-[2px] border transition-all cursor-pointer ${
              isMuted 
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/40 hover:bg-rose-900/50' 
                : 'bg-white/[0.04] text-[#8b929e] hover:text-white border-white/10 hover:bg-white/[0.08]'
            }`}
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Driver Profile Button */}
          {onOpenProfile && (
            <button
              onClick={() => {
                playSoundEffect('click');
                onOpenProfile();
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-[#8b929e] hover:text-white rounded-[2px] transition-all text-xs font-mono cursor-pointer"
              title="Личное дело водителя и облако"
            >
              <User className="w-3.5 h-3.5 text-[#ff6600]" />
              <span className="hidden md:inline font-bold">Профиль</span>
            </button>
          )}

          {/* Online Multiplayer Button */}
          {onOpenOnline && (
            <button
              onClick={() => {
                playSoundEffect('click');
                onOpenOnline();
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#ff6600]/40 text-[#8b929e] hover:text-white rounded-[2px] transition-all text-xs font-mono cursor-pointer"
              title="Сетевая игра P2P"
            >
              <Globe className="w-3.5 h-3.5 text-[#ff6600]" />
              <span className="hidden md:inline font-bold">Онлайн</span>
            </button>
          )}

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE: BEAMNG SPLIT GRID (LEFT NAV + RIGHT INSPECTOR)          */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full items-start">
        
        {/* ======================================================================= */}
        {/* LEFT COLUMN: BEAMNG MODE SELECTION STACK (5 cols)                       */}
        {/* ======================================================================= */}
        <div className="md:col-span-4 lg:col-span-4 flex flex-col gap-1.5">
          
          <div className="text-[10px] font-mono font-bold tracking-widest text-[#8b929e] uppercase mb-1 px-1">
            РЕЖИМЫ СИМУЛЯЦИИ
          </div>

          {/* 1. FREEROAM */}
          <button
            onClick={() => {
              setActiveCategory('freeroam');
              playSoundEffect('click');
            }}
            onMouseEnter={() => playSoundEffect('hover')}
            className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-[2px] transition-all text-left cursor-pointer border ${
              activeCategory === 'freeroam'
                ? 'bg-[#181b20] border-[#ff6600] shadow-[0_4px_20px_rgba(255,102,0,0.18)]'
                : 'bg-[#101216]/90 hover:bg-[#16181e] border-white/[0.07] hover:border-white/20'
            }`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-[#ff6600] transition-opacity ${activeCategory === 'freeroam' ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
            <Compass className={`w-5 h-5 shrink-0 transition-colors ${activeCategory === 'freeroam' ? 'text-[#ff6600]' : 'text-[#8b929e] group-hover:text-white'}`} />
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`text-xs font-black uppercase tracking-wider truncate font-sans ${activeCategory === 'freeroam' ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'}`}>
                СВОБОДНЫЙ ЗАЕЗД
              </span>
              <span className="text-[10px] text-[#8b929e] font-mono truncate">
                Freeroam • Выбор локации и старт
              </span>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeCategory === 'freeroam' ? 'text-[#ff6600] translate-x-0.5' : 'text-white/20'}`} />
          </button>

          {/* 2. CAREER */}
          <button
            onClick={() => {
              setActiveCategory('career');
              playSoundEffect('click');
            }}
            onMouseEnter={() => playSoundEffect('hover')}
            className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-[2px] transition-all text-left cursor-pointer border ${
              activeCategory === 'career'
                ? 'bg-[#181b20] border-[#ff6600] shadow-[0_4px_20px_rgba(255,102,0,0.18)]'
                : 'bg-[#101216]/90 hover:bg-[#16181e] border-white/[0.07] hover:border-white/20'
            }`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-[#ff6600] transition-opacity ${activeCategory === 'career' ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
            <Award className={`w-5 h-5 shrink-0 transition-colors ${activeCategory === 'career' ? 'text-[#ff6600]' : 'text-[#8b929e] group-hover:text-white'}`} />
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`text-xs font-black uppercase tracking-wider truncate font-sans ${activeCategory === 'career' ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'}`}>
                КАРЬЕРА ВОДИТЕЛЯ
              </span>
              <span className="text-[10px] text-[#8b929e] font-mono truncate">
                Career • Прогресс, авто и недвижимость
              </span>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeCategory === 'career' ? 'text-[#ff6600] translate-x-0.5' : 'text-white/20'}`} />
          </button>

          {/* 3. SCENARIOS */}
          <button
            onClick={() => {
              setActiveCategory('scenarios');
              playSoundEffect('click');
            }}
            onMouseEnter={() => playSoundEffect('hover')}
            className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-[2px] transition-all text-left cursor-pointer border ${
              activeCategory === 'scenarios'
                ? 'bg-[#181b20] border-[#ff6600] shadow-[0_4px_20px_rgba(255,102,0,0.18)]'
                : 'bg-[#101216]/90 hover:bg-[#16181e] border-white/[0.07] hover:border-white/20'
            }`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-[#ff6600] transition-opacity ${activeCategory === 'scenarios' ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
            <Flag className={`w-5 h-5 shrink-0 transition-colors ${activeCategory === 'scenarios' ? 'text-[#ff6600]' : 'text-[#8b929e] group-hover:text-white'}`} />
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`text-xs font-black uppercase tracking-wider truncate font-sans ${activeCategory === 'scenarios' ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'}`}>
                СЦЕНАРИИ & МИССИИ
              </span>
              <span className="text-[10px] text-[#8b929e] font-mono truncate">
                Scenarios • Доставка, дрифт и вызовы
              </span>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeCategory === 'scenarios' ? 'text-[#ff6600] translate-x-0.5' : 'text-white/20'}`} />
          </button>

          {/* 4. SAVES ARCHIVE */}
          <button
            onClick={() => {
              setActiveCategory('saves');
              playSoundEffect('click');
            }}
            onMouseEnter={() => playSoundEffect('hover')}
            className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-[2px] transition-all text-left cursor-pointer border ${
              activeCategory === 'saves'
                ? 'bg-[#181b20] border-[#ff6600] shadow-[0_4px_20px_rgba(255,102,0,0.18)]'
                : 'bg-[#101216]/90 hover:bg-[#16181e] border-white/[0.07] hover:border-white/20'
            }`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-[#ff6600] transition-opacity ${activeCategory === 'saves' ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
            <HardDrive className={`w-5 h-5 shrink-0 transition-colors ${activeCategory === 'saves' ? 'text-[#ff6600]' : 'text-[#8b929e] group-hover:text-white'}`} />
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase tracking-wider truncate font-sans ${activeCategory === 'saves' ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'}`}>
                  АРХИВ ПОЕЗДОК
                </span>
                <span className="text-[10px] font-mono text-[#ff6600] font-bold">
                  {saves.length}
                </span>
              </div>
              <span className="text-[10px] text-[#8b929e] font-mono truncate">
                Saves • Загрузка рейсов и слотов
              </span>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeCategory === 'saves' ? 'text-[#ff6600] translate-x-0.5' : 'text-white/20'}`} />
          </button>

          {/* 5. GARAGE & POWERTRAIN */}
          <button
            onClick={() => {
              setActiveCategory('garage');
              playSoundEffect('click');
            }}
            onMouseEnter={() => playSoundEffect('hover')}
            className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-[2px] transition-all text-left cursor-pointer border ${
              activeCategory === 'garage'
                ? 'bg-[#181b20] border-[#ff6600] shadow-[0_4px_20px_rgba(255,102,0,0.18)]'
                : 'bg-[#101216]/90 hover:bg-[#16181e] border-white/[0.07] hover:border-white/20'
            }`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-[#ff6600] transition-opacity ${activeCategory === 'garage' ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
            <Wrench className={`w-5 h-5 shrink-0 transition-colors ${activeCategory === 'garage' ? 'text-[#ff6600]' : 'text-[#8b929e] group-hover:text-white'}`} />
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`text-xs font-black uppercase tracking-wider truncate font-sans ${activeCategory === 'garage' ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'}`}>
                ГАРАЖ & ДИАГНОСТИКА
              </span>
              <span className="text-[10px] text-[#8b929e] font-mono truncate">
                Garage • Узлы ДВС, подвеска и детали
              </span>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeCategory === 'garage' ? 'text-[#ff6600] translate-x-0.5' : 'text-white/20'}`} />
          </button>

          {/* 6. MULTIPLAYER ONLINE */}
          <button
            onClick={() => {
              setActiveCategory('multiplayer');
              playSoundEffect('click');
            }}
            onMouseEnter={() => playSoundEffect('hover')}
            className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-[2px] transition-all text-left cursor-pointer border ${
              activeCategory === 'multiplayer'
                ? 'bg-[#181b20] border-[#ff6600] shadow-[0_4px_20px_rgba(255,102,0,0.18)]'
                : 'bg-[#101216]/90 hover:bg-[#16181e] border-white/[0.07] hover:border-white/20'
            }`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-[#ff6600] transition-opacity ${activeCategory === 'multiplayer' ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
            <Globe className={`w-5 h-5 shrink-0 transition-colors ${activeCategory === 'multiplayer' ? 'text-[#ff6600]' : 'text-[#8b929e] group-hover:text-white'}`} />
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`text-xs font-black uppercase tracking-wider truncate font-sans ${activeCategory === 'multiplayer' ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'}`}>
                СЕТЕВАЯ ИГРА
              </span>
              <span className="text-[10px] text-[#8b929e] font-mono truncate">
                BeamMP P2P • Совместные заезды
              </span>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeCategory === 'multiplayer' ? 'text-[#ff6600] translate-x-0.5' : 'text-white/20'}`} />
          </button>

          {/* 7. SETTINGS */}
          <button
            onClick={() => {
              setActiveCategory('settings');
              playSoundEffect('click');
            }}
            onMouseEnter={() => playSoundEffect('hover')}
            className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-[2px] transition-all text-left cursor-pointer border ${
              activeCategory === 'settings'
                ? 'bg-[#181b20] border-[#ff6600] shadow-[0_4px_20px_rgba(255,102,0,0.18)]'
                : 'bg-[#101216]/90 hover:bg-[#16181e] border-white/[0.07] hover:border-white/20'
            }`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-[#ff6600] transition-opacity ${activeCategory === 'settings' ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
            <Settings className={`w-5 h-5 shrink-0 transition-colors ${activeCategory === 'settings' ? 'text-[#ff6600]' : 'text-[#8b929e] group-hover:text-white'}`} />
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`text-xs font-black uppercase tracking-wider truncate font-sans ${activeCategory === 'settings' ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'}`}>
                НАСТРОЙКИ (OPTIONS)
              </span>
              <span className="text-[10px] text-[#8b929e] font-mono truncate">
                Графика, физика, звук и клавиши
              </span>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeCategory === 'settings' ? 'text-[#ff6600] translate-x-0.5' : 'text-white/20'}`} />
          </button>

          {/* 8. MAP EDITOR */}
          <button
            onClick={() => {
              setActiveCategory('editor');
              playSoundEffect('click');
            }}
            onMouseEnter={() => playSoundEffect('hover')}
            className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-[2px] transition-all text-left cursor-pointer border ${
              activeCategory === 'editor'
                ? 'bg-[#181b20] border-[#ff6600] shadow-[0_4px_20px_rgba(255,102,0,0.18)]'
                : 'bg-[#101216]/90 hover:bg-[#16181e] border-white/[0.07] hover:border-white/20'
            }`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-[#ff6600] transition-opacity ${activeCategory === 'editor' ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
            <Layers className={`w-5 h-5 shrink-0 transition-colors ${activeCategory === 'editor' ? 'text-[#ff6600]' : 'text-[#8b929e] group-hover:text-white'}`} />
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`text-xs font-black uppercase tracking-wider truncate font-sans ${activeCategory === 'editor' ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'}`}>
                РЕДАКТОР КАРТЫ & МОДЫ
              </span>
              <span className="text-[10px] text-[#8b929e] font-mono truncate">
                World Editor • Инструменты карты
              </span>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeCategory === 'editor' ? 'text-[#ff6600] translate-x-0.5' : 'text-white/20'}`} />
          </button>

          {/* 9. ABOUT / HANDBOOK */}
          <button
            onClick={() => {
              setActiveCategory('about');
              playSoundEffect('click');
            }}
            onMouseEnter={() => playSoundEffect('hover')}
            className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-[2px] transition-all text-left cursor-pointer border ${
              activeCategory === 'about'
                ? 'bg-[#181b20] border-[#ff6600] shadow-[0_4px_20px_rgba(255,102,0,0.18)]'
                : 'bg-[#101216]/90 hover:bg-[#16181e] border-white/[0.07] hover:border-white/20'
            }`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-[#ff6600] transition-opacity ${activeCategory === 'about' ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
            <Info className={`w-5 h-5 shrink-0 transition-colors ${activeCategory === 'about' ? 'text-[#ff6600]' : 'text-[#8b929e] group-hover:text-white'}`} />
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`text-xs font-black uppercase tracking-wider truncate font-sans ${activeCategory === 'about' ? 'text-white' : 'text-[#d0d5dc] group-hover:text-white'}`}>
                СПРАВОЧНИК СИМУЛЯЦИИ
              </span>
              <span className="text-[10px] text-[#8b929e] font-mono truncate">
                Физика, заправки и управление
              </span>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeCategory === 'about' ? 'text-[#ff6600] translate-x-0.5' : 'text-white/20'}`} />
          </button>

        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: BEAMNG INTERACTIVE INSPECTOR PANEL (8 cols)                */}
        {/* ======================================================================= */}
        <div className="md:col-span-8 lg:col-span-8 bg-[#121418]/95 border border-white/10 rounded-[2px] shadow-2xl overflow-hidden flex flex-col min-h-[560px]">
          
          {/* ===================================================================== */}
          {/* A. VIEW: FREEROAM (MAP & SPAWN CONFIGURATOR)                          */}
          {/* ===================================================================== */}
          {activeCategory === 'freeroam' && (
            <div className="flex flex-col h-full animate-in fade-in duration-150">
              
              {/* Map Showcase Header */}
              <div className="relative h-44 sm:h-52 w-full overflow-hidden border-b border-white/10 bg-slate-900">
                <img 
                  src={freeroamMapImg} 
                  alt="Proving Ground Map Preview" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121418] via-[#121418]/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#121418]/80 to-transparent" />

                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-bold tracking-widest text-[#ff6600] uppercase mb-1">
                      ОСНОВНОЙ РЕЖИМ СИМУЛЯЦИИ
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase font-sans">
                      СТЕПНОЙ ТРАКТ: ПОЛИГОН & ГОРОД
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-[#8b929e] font-mono mt-1">
                      <span>Площадь: 10,000 × 10,000 px</span>
                      <span aria-hidden="true">·</span>
                      <span>Асфальт & Грунтовка</span>
                      <span aria-hidden="true">·</span>
                      <span>Ж/Д магистраль</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 flex flex-col flex-1 justify-between gap-5">
                
                <div className="space-y-4">
                  
                  {/* Driver Name Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8b929e]">
                      ИМЯ ВОДИТЕЛЯ / ПОЗЫВНОЙ В ПТС:
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      maxLength={32}
                      placeholder="Введите имя водителя..."
                      className="w-full bg-[#181b20] border border-white/10 focus:border-[#ff6600] rounded-[2px] px-3.5 py-2.5 text-white text-xs font-mono font-bold focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Spawn Location Picker */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8b929e]">
                      ТОЧКА ВЫЕЗДА НА КАРТУ:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {spawnLocations.map((loc) => {
                        const isSelected = selectedSpawnId === loc.id;
                        return (
                          <div
                            key={loc.id}
                            onClick={() => {
                              setSelectedSpawnId(loc.id);
                              playSoundEffect('click');
                            }}
                            onMouseEnter={() => playSoundEffect('hover')}
                            className={`group relative flex items-start gap-3 p-3 rounded-[2px] transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-[#1c2026] border-[#ff6600] shadow-[0_2px_12px_rgba(255,102,0,0.18)]'
                                : 'bg-[#181b20] border-white/[0.08] hover:border-white/20'
                            }`}
                          >
                            <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-[#ff6600] transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                            <div className="mt-0.5 text-[#ff6600]">
                              {loc.icon}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className={`text-xs font-bold uppercase tracking-wider truncate ${isSelected ? 'text-white' : 'text-[#d0d5dc]'}`}>
                                {loc.nameRu}
                              </span>
                              <span className="text-[10px] text-[#8b929e] mt-0.5 leading-relaxed line-clamp-2">
                                {loc.description}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Bottom Launch Button */}
                <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
                  <div className="text-[11px] font-mono text-[#8b929e]">
                    Клавиша быстрого старта: <span className="text-white font-bold">ENTER</span>
                  </div>

                  <button
                    onClick={() => handleStartGame()}
                    className="flex items-center gap-2.5 px-6 py-3 bg-[#ff6600] hover:bg-[#ff771a] text-black font-mono text-xs font-black uppercase tracking-wider rounded-[2px] transition-all cursor-pointer shadow-[0_4px_16px_rgba(255,102,0,0.35)]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>ВЫЕЗД НА ТРАССУ (SPAWN)</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* B. VIEW: CAREER (DRIVER DOSSIER & PROGRESSION)                        */}
          {/* ===================================================================== */}
          {activeCategory === 'career' && (
            <div className="p-6 flex flex-col h-full justify-between gap-6 animate-in fade-in duration-150">
              <div className="space-y-5">
                
                <div className="border-b border-white/[0.08] pb-4">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-[#ff6600] uppercase mb-1">
                    ЛИЧНОЕ ДЕЛО И ПРОГРЕСС
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase font-sans">
                    КАРЬЕРА ВОДИТЕЛЯ
                  </h2>
                  <p className="text-xs text-[#8b929e] mt-1">
                    Сюжетная линия: покупка автомобилей, аренда квартир, работа и физический износ
                  </p>
                </div>

                {latestSave ? (
                  <div className="p-4 bg-[#181b20] border border-white/10 rounded-[2px] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#ff6600]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                          Текущий водитель: {latestSave.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#ff6600] font-bold">
                        ПОСЛЕДНИЙ РЕЙС
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/[0.08] text-[11px] font-mono">
                      <div>
                        <div className="text-[#8b929e] text-[9px] uppercase">Локация</div>
                        <div className="text-white font-bold truncate">{latestSave.streetName || 'Степной Тракт'}</div>
                      </div>
                      <div>
                        <div className="text-[#8b929e] text-[9px] uppercase">Время</div>
                        <div className="text-white font-bold">{formatGameTime(latestSave.timeHour ?? 10.0)}</div>
                      </div>
                      <div>
                        <div className="text-[#8b929e] text-[9px] uppercase">Сезон</div>
                        <div className="text-white font-bold">{latestSave.season || 'Осень'}</div>
                      </div>
                      <div>
                        <div className="text-[#8b929e] text-[9px] uppercase">Статус</div>
                        <div className="text-[#ff6600] font-bold">{latestSave.isInVehicle ? 'За рулём' : 'Пешком'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-[#181b20] border border-white/10 rounded-[2px] text-center text-[#8b929e] text-xs font-mono">
                    Нет сохранённых данных карьеры. Начните первый заезд для инициализации профиля водителя.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-[#181b20] border border-white/[0.08] rounded-[2px]">
                    <Car className="w-4 h-4 text-[#ff6600] mb-2" />
                    <div className="text-xs font-bold uppercase text-white mb-1">Автопарк</div>
                    <div className="text-[10px] text-[#8b929e] leading-relaxed">
                      Покупка техники в автосалоне города, ПТС и ключи зажигания.
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#181b20] border border-white/[0.08] rounded-[2px]">
                    <Home className="w-4 h-4 text-[#ff6600] mb-2" />
                    <div className="text-xs font-bold uppercase text-white mb-1">Недвижимость</div>
                    <div className="text-[10px] text-[#8b929e] leading-relaxed">
                      Квартиры в пятиэтажках, сон на кровати для восстановления сил.
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#181b20] border border-white/[0.08] rounded-[2px]">
                    <Fuel className="w-4 h-4 text-[#ff6600] mb-2" />
                    <div className="text-xs font-bold uppercase text-white mb-1">Сервис & АЗС</div>
                    <div className="text-[10px] text-[#8b929e] leading-relaxed">
                      Заправка нужной маркой топлива и замена моторного масла.
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
                {latestSave ? (
                  <button
                    onClick={() => {
                      playSoundEffect('launch');
                      onLoadSave(latestSave.id);
                    }}
                    className="flex items-center gap-2.5 px-6 py-3 bg-[#ff6600] hover:bg-[#ff771a] text-black font-mono text-xs font-black uppercase tracking-wider rounded-[2px] transition-all cursor-pointer shadow-[0_4px_16px_rgba(255,102,0,0.35)]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>ПРОДОЛЖИТЬ КАРЬЕРУ</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setActiveCategory('freeroam');
                      playSoundEffect('click');
                    }}
                    className="flex items-center gap-2.5 px-6 py-3 bg-[#ff6600] hover:bg-[#ff771a] text-black font-mono text-xs font-black uppercase tracking-wider rounded-[2px] transition-all cursor-pointer shadow-[0_4px_16px_rgba(255,102,0,0.35)]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>НАЧАТЬ ПЕРВЫЙ ВЫЕЗД</span>
                  </button>
                )}
              </div>

            </div>
          )}

          {/* ===================================================================== */}
          {/* C. VIEW: SCENARIOS (CHALLENGE MISSIONS)                               */}
          {/* ===================================================================== */}
          {activeCategory === 'scenarios' && (
            <div className="flex flex-col h-full animate-in fade-in duration-150">
              
              <div className="relative h-40 w-full overflow-hidden border-b border-white/10 bg-slate-900">
                <img 
                  src={scenarioPreviewImg} 
                  alt="Scenario Trial Course" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121418] via-[#121418]/60 to-transparent" />
                <div className="absolute bottom-3 left-6 right-6">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-[#ff6600] uppercase mb-0.5">
                    ИСПЫТАНИЯ И ВЫЗОВЫ
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase font-sans">
                    СЦЕНАРИИ ВОЖДЕНИЯ
                  </h2>
                </div>
              </div>

              <div className="p-6 flex flex-col flex-1 justify-between gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Scenario 1 */}
                  <div className="p-4 bg-[#181b20] border border-white/10 hover:border-[#ff6600]/60 rounded-[2px] flex flex-col justify-between transition-all group">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#ff6600] font-bold mb-1">
                        <span>СЛОЖНОСТЬ: СРЕДНЯЯ</span>
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-black uppercase text-white group-hover:text-[#ff6600] transition-colors">
                        Срочный рейс на Автобазу
                      </h3>
                      <p className="text-[10px] text-[#8b929e] mt-1.5 leading-relaxed">
                        Доставьте груз в промзону через скоростной проспект, избегая столкновений в плотном трафике.
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectScenario('Срочный рейс на Автобазу', 'downtown_plaza')}
                      className="mt-4 w-full py-2 bg-white/[0.06] hover:bg-[#ff6600] hover:text-black text-white font-mono text-[10px] font-bold uppercase rounded-[2px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>СТАРТ МИССИИ</span>
                    </button>
                  </div>

                  {/* Scenario 2 */}
                  <div className="p-4 bg-[#181b20] border border-white/10 hover:border-[#ff6600]/60 rounded-[2px] flex flex-col justify-between transition-all group">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#ff6600] font-bold mb-1">
                        <span>СЛОЖНОСТЬ: ЛЁГКАЯ</span>
                        <TreePine className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-black uppercase text-white group-hover:text-[#ff6600] transition-colors">
                        Слалом вокруг Фонтана
                      </h3>
                      <p className="text-[10px] text-[#8b929e] mt-1.5 leading-relaxed">
                        Тестирование поворачиваемости и заноса на аллеях городского сквера. Ручной тормоз и маневры.
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectScenario('Слалом у Фонтана', 'central_park')}
                      className="mt-4 w-full py-2 bg-white/[0.06] hover:bg-[#ff6600] hover:text-black text-white font-mono text-[10px] font-bold uppercase rounded-[2px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>СТАРТ МИССИИ</span>
                    </button>
                  </div>

                  {/* Scenario 3 */}
                  <div className="p-4 bg-[#181b20] border border-white/10 hover:border-[#ff6600]/60 rounded-[2px] flex flex-col justify-between transition-all group">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#ff6600] font-bold mb-1">
                        <span>СЛОЖНОСТЬ: ВЫСОКАЯ</span>
                        <Home className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-black uppercase text-white group-hover:text-[#ff6600] transition-colors">
                        Дворовый лабиринт
                      </h3>
                      <p className="text-[10px] text-[#8b929e] mt-1.5 leading-relaxed">
                        Лавирование в узких дворовых проездах между пятиэтажками, гаражами и припаркованным транспортом.
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectScenario('Дворовый лабиринт', 'residential_courtyard')}
                      className="mt-4 w-full py-2 bg-white/[0.06] hover:bg-[#ff6600] hover:text-black text-white font-mono text-[10px] font-bold uppercase rounded-[2px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>СТАРТ МИССИИ</span>
                    </button>
                  </div>

                </div>

                <div className="text-[10px] font-mono text-[#8b929e] pt-3 border-t border-white/[0.08]">
                  Каждый сценарий инициализирует дорожную обстановку и стартовую точку на полигоне Степного Тракта.
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* D. VIEW: SAVES ARCHIVE (FILE SLOTS)                                   */}
          {/* ===================================================================== */}
          {activeCategory === 'saves' && (
            <div className="p-6 flex flex-col h-full justify-between gap-5 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="border-b border-white/[0.08] pb-4">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-[#ff6600] uppercase mb-1">
                    БОРТОВОЙ ЖУРНАЛ СЕССИЙ
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase font-sans">
                    АРХИВ ПОЕЗДОК
                  </h2>
                  <p className="text-xs text-[#8b929e] mt-1">
                    Всего записей рейсов: {saves.length}. Выберите слот для загрузки или удаления.
                  </p>
                </div>

                <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {saves.length === 0 ? (
                    <div className="text-center py-12 text-[#8b929e] text-xs font-mono bg-[#181b20] border border-white/10 rounded-[2px] p-6">
                      В архиве нет зарегистрированных рейсов. Начните поездку, и она сохранится автоматически.
                    </div>
                  ) : (
                    saves.map((save) => {
                      const isConfirming = confirmDeleteId === save.id;
                      return (
                        <div
                          key={save.id}
                          className="group relative flex items-center justify-between gap-3 px-4 py-3 bg-[#181b20] hover:bg-[#1e222a] border border-white/[0.08] hover:border-[#ff6600]/40 rounded-[2px] transition-all overflow-hidden"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#ff6600] opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div 
                            className="flex flex-col flex-1 cursor-pointer overflow-hidden"
                            onClick={() => {
                              playSoundEffect('launch');
                              onLoadSave(save.id);
                            }}
                          >
                            <span className="text-xs font-bold uppercase tracking-wider text-white truncate">
                              {save.name}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-[#8b929e] font-mono mt-0.5">
                              <span>{save.calendar ? formatGameDate(save.calendar, 'medium') : (save.date || '08.10.2026')}</span>
                              <span>•</span>
                              <span>{save.calendar?.season ? getRussianSeasonName(save.calendar.season) : (save.season || 'Осень')}</span>
                              <span>•</span>
                              <span>{save.streetName || (save.isInVehicle ? 'За рулём' : 'Пешком')}</span>
                              <span>•</span>
                              <span className="text-[#ff6600] font-bold">{formatGameTime(save.timeHour ?? 10.0)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                playSoundEffect('launch');
                                onLoadSave(save.id);
                              }}
                              className="px-3.5 py-1.5 bg-[#ff6600] hover:bg-[#ff771a] text-black font-mono text-[10px] font-black uppercase rounded-[2px] transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>В рейс</span>
                            </button>

                            {isConfirming ? (
                              <button
                                onClick={() => {
                                  playSoundEffect('click');
                                  onDeleteSave(save.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-mono text-[10px] font-bold uppercase rounded-[2px] transition-all cursor-pointer"
                              >
                                Подтвердить
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  playSoundEffect('click');
                                  setConfirmDeleteId(save.id);
                                }}
                                className="p-1.5 bg-white/[0.05] hover:bg-rose-950/60 text-[#8b929e] hover:text-rose-400 border border-white/10 hover:border-rose-900/40 rounded-[2px] transition-all cursor-pointer"
                                title="Удалить сохранение"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center text-[10px] font-mono text-[#8b929e]">
                <span>Периодичность автосохранения рейса: {settings.autoSaveInterval > 0 ? `${settings.autoSaveInterval} сек.` : 'Отключено'}</span>
                <span>Формат: JSON Local Storage</span>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* E. VIEW: GARAGE & VEHICLE POWERTRAIN DIAGNOSTICS                      */}
          {/* ===================================================================== */}
          {activeCategory === 'garage' && (
            <div className="flex flex-col h-full animate-in fade-in duration-150">
              
              <div className="relative h-44 w-full overflow-hidden border-b border-white/10 bg-slate-900">
                <img 
                  src={garagePreviewImg} 
                  alt="Vehicle Garage Workshop" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121418] via-[#121418]/60 to-transparent" />
                <div className="absolute bottom-3 left-6 right-6">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-[#ff6600] uppercase mb-0.5">
                    СИМУЛЯЦИЯ МЕХАНИЧЕСКИХ УЗЛОВ
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase font-sans">
                    ГАРАЖ И УЗЛЫ ТРАНСПОРТА
                  </h2>
                </div>
              </div>

              <div className="p-6 flex flex-col flex-1 justify-between gap-5">
                <div className="space-y-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-[#181b20] border border-white/[0.08] rounded-[2px]">
                      <div className="text-xs font-bold uppercase text-white mb-1 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#ff6600]" />
                        <span>Силовой агрегат (ДВС)</span>
                      </div>
                      <p className="text-[10px] text-[#8b929e] leading-relaxed">
                        Моделирование рабочей температуры ОЖ, уровня моторного масла, давления и риска заклинивания поршней при перегреве.
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#181b20] border border-white/[0.08] rounded-[2px]">
                      <div className="text-xs font-bold uppercase text-white mb-1 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-[#ff6600]" />
                        <span>Сцепление и КПП</span>
                      </div>
                      <p className="text-[10px] text-[#8b929e] leading-relaxed">
                        Реалистичный диапазон передаточных чисел, пробуксовка диска сцепления и торможение передачей на спуске.
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#181b20] border border-white/[0.08] rounded-[2px]">
                      <div className="text-xs font-bold uppercase text-white mb-1 flex items-center gap-1.5">
                        <Fuel className="w-3.5 h-3.5 text-[#ff6600]" />
                        <span>Топливная аппаратура</span>
                      </div>
                      <p className="text-[10px] text-[#8b929e] leading-relaxed">
                        Бензобак, фильтры и совместимость с видами топлива (АИ-92, АИ-95, Дизель, Газ Пропан).
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#181b20] border border-white/[0.08] rounded-[2px]">
                      <div className="text-xs font-bold uppercase text-white mb-1 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-[#ff6600]" />
                        <span>Подвеска и тормоза</span>
                      </div>
                      <p className="text-[10px] text-[#8b929e] leading-relaxed">
                        Амортизаторы, колодки, ручной стояночный тормоз и сцепление протектора шин с грунтом и мокрым асфальтом.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#181b20] border border-[#ff6600]/30 rounded-[2px] text-[11px] font-mono text-[#8b929e] flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">ПОДСКАЗКА:</span>
                    <span>Для открытия капота и залива масла в двигатель подойдите к машине спереди и нажмите клавишу <span className="text-white font-bold">E</span>.</span>
                  </div>

                </div>

                <div className="pt-3 border-t border-white/[0.08] flex justify-end">
                  <button
                    onClick={() => {
                      setActiveCategory('freeroam');
                      playSoundEffect('click');
                    }}
                    className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] text-white font-mono text-xs font-bold uppercase rounded-[2px] transition-all cursor-pointer"
                  >
                    Вернуться к выбору выезда
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* F. VIEW: MULTIPLAYER ONLINE                                           */}
          {/* ===================================================================== */}
          {activeCategory === 'multiplayer' && (
            <div className="p-6 flex flex-col h-full justify-between gap-5 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="border-b border-white/[0.08] pb-4">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-[#ff6600] uppercase mb-1">
                    СЕТЕВОЙ МОДУЛЬ СИНХРОНИЗАЦИИ
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase font-sans">
                    СЕТЕВАЯ ИГРА (BEAMMP P2P)
                  </h2>
                  <p className="text-xs text-[#8b929e] mt-1">
                    Прямая P2P синхронизация позиций машин, физики столкновений и онлайн чата между игроками
                  </p>
                </div>

                <div className="p-5 bg-[#181b20] border border-white/10 rounded-[2px] space-y-3">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-[#ff6600]" />
                    <div>
                      <div className="text-xs font-bold uppercase text-white">Диспетчерская P2P комната</div>
                      <div className="text-[10px] text-[#8b929e]">Создайте комнату или подключитесь по 6-значному коду</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#8b929e] leading-relaxed font-mono">
                    Вы можете пригласить друзей в общую сессию, исследовать карту Степного Тракта, устраивать заезды и синхронные рейсы.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#8b929e]">WebRTC DataChannel • Без задержек</span>
                
                {onOpenOnline && (
                  <button
                    onClick={() => {
                      playSoundEffect('click');
                      onOpenOnline();
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-[#ff6600] hover:bg-[#ff771a] text-black font-mono text-xs font-black uppercase tracking-wider rounded-[2px] transition-all cursor-pointer shadow-md"
                  >
                    <Globe className="w-4 h-4" />
                    <span>ОТКРЫТЬ ЛОББИ ОНЛАЙН</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* G. VIEW: OPTIONS / SETTINGS                                           */}
          {/* ===================================================================== */}
          {activeCategory === 'settings' && (
            <div className="p-6 flex flex-col h-full justify-between gap-5 animate-in fade-in duration-150">
              <div className="space-y-4">
                
                <div className="border-b border-white/[0.08] pb-4">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-[#ff6600] uppercase mb-1">
                    ТЕХНИЧЕСКИЙ ФОРМУЛЯР
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase font-sans">
                    НАСТРОЙКИ СИМУЛЯЦИИ
                  </h2>
                  <p className="text-xs text-[#8b929e] mt-1">
                    Параметры графики, звука, частоты кадров и раскладки управления
                  </p>
                </div>

                {/* Settings Sub-Tabs */}
                <div className="grid grid-cols-4 gap-1.5">
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
                          setSettingsTab(tab.id as SettingsTab);
                          playSoundEffect('click');
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded-[2px] transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-[#1c2026] border-[#ff6600] text-[#ff6600]'
                            : 'bg-[#181b20] border-white/[0.08] text-[#8b929e] hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Tab Panel */}
                <div className="bg-[#181b20] border border-white/[0.08] rounded-[2px] p-5 space-y-4 min-h-[220px]">
                  
                  {/* Graphics Tab */}
                  {settingsTab === 'graphics' && (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-white">Лимит частоты кадров (FPS)</div>
                        <div className="text-[10px] text-[#8b929e]">Синхронизация частоты обновления физического тика</div>
                      </div>
                      <div className="flex gap-1.5">
                        {[60, 120, 0].map((limit) => (
                          <button
                            key={limit}
                            type="button"
                            onClick={() => {
                              onUpdateSettings({ ...settings, fpsLimit: limit });
                              playSoundEffect('click');
                            }}
                            className={`px-3.5 py-1.5 rounded-[2px] text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                              settings.fpsLimit === limit 
                                ? 'bg-[#ff6600]/20 text-[#ff6600] border-[#ff6600]' 
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
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-white">Общее воспроизведение звука</div>
                        <div className="text-[10px] text-[#8b929e]">Двигатель, подвеска, свист шин и окружение</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleMute();
                          playSoundEffect('click');
                        }}
                        className={`px-4 py-2 rounded-[2px] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                          isMuted 
                            ? 'bg-rose-950/40 text-rose-300 border-rose-800/40' 
                            : 'bg-[#ff6600]/20 text-[#ff6600] border-[#ff6600]'
                        }`}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        <span>{isMuted ? 'Звук отключен' : 'Звук включен'}</span>
                      </button>
                    </div>
                  )}

                  {/* Gameplay Tab */}
                  {settingsTab === 'gameplay' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-white">Автосохранение рейса</div>
                          <div className="text-[10px] text-[#8b929e]">Интервал сохранения координат и состояния техники</div>
                        </div>
                        <div className="flex gap-1.5">
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
                                playSoundEffect('click');
                              }}
                              className={`px-3.5 py-1.5 rounded-[2px] text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                                settings.autoSaveInterval === opt.val 
                                  ? 'bg-[#ff6600]/20 text-[#ff6600] border-[#ff6600]' 
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
                          <div className="text-xs font-bold uppercase tracking-wider text-white">Суточный цикл дня и ночи</div>
                          <div className="text-[10px] text-[#8b929e]">Естественное движение солнца и смена освещения</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateSettings({ ...settings, timeAutoCycle: !settings.timeAutoCycle });
                            playSoundEffect('click');
                          }}
                          className={`px-4 py-1.5 rounded-[2px] text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                            settings.timeAutoCycle
                              ? 'bg-[#ff6600]/20 text-[#ff6600] border-[#ff6600]'
                              : 'bg-white/[0.04] text-[#8b929e] border-white/10'
                          }`}
                        >
                          {settings.timeAutoCycle ? 'Активен' : 'Остановлен'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Controls Tab */}
                  {settingsTab === 'controls' && (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-white">Чувствительность мыши</div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={settings.mouseSensitivity}
                            onChange={(e) => onUpdateSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) })}
                            className="w-full accent-[#ff6600] cursor-pointer h-1.5 bg-[#0b0c0e] rounded-[1px] appearance-none"
                          />
                          <span className="text-xs font-mono font-bold text-[#ff6600] shrink-0">{settings.mouseSensitivity.toFixed(1)}x</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#8b929e] bg-[#101216] p-3 rounded-[2px] border border-white/[0.08] leading-relaxed font-mono space-y-1">
                        <div><span className="text-white font-bold">W / S / A / D</span> — Газ, тормоз / задний ход, поворот руля</div>
                        <div><span className="text-white font-bold">ПРОБЕЛ</span> — Ручной тормоз (стояночный)</div>
                        <div><span className="text-white font-bold">E</span> — Интерактивное действие (сесть в авто, открыть дверь, капот)</div>
                        <div><span className="text-white font-bold">L</span> — Ближний / дальний свет фар</div>
                        <div><span className="text-white font-bold">Z / C</span> — Поворотники • <span className="text-white font-bold">X</span> — Аварийная сигнализация</div>
                        <div><span className="text-white font-bold">I</span> — Инвентарь и карманы водителя • <span className="text-white font-bold">M</span> — Карта местности</div>
                        <div><span className="text-white font-bold">ESC</span> — Пауза / Главное меню</div>
                      </div>
                    </div>
                  )}

                </div>

              </div>

              <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center text-[10px] font-mono text-[#8b929e]">
                <span>Конфигурация сохраняется автоматически</span>
                <span className="text-[#ff6600] font-bold">BEAMNG INPUT MAPPER</span>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* H. VIEW: MAP EDITOR & MODS                                            */}
          {/* ===================================================================== */}
          {activeCategory === 'editor' && (
            <div className="p-6 flex flex-col h-full justify-between gap-5 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="border-b border-white/[0.08] pb-4">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-[#ff6600] uppercase mb-1">
                    ИНСТРУМЕНТЫ КАРТОГРАФИИ
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase font-sans">
                    РЕДАКТОР КАРТЫ & МОДЫ
                  </h2>
                  <p className="text-xs text-[#8b929e] mt-1">
                    Автономная студия картографии Степного Тракта (public/editor.html)
                  </p>
                </div>

                <div className="p-4 bg-[#181b20] border border-white/10 rounded-[2px] space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#ff6600]" />
                    <span className="text-xs font-bold uppercase text-white">Портативный редактор локаций</span>
                  </div>
                  <p className="text-[11px] text-[#8b929e] leading-relaxed">
                    Редактор карты работает прямо в браузере. Вы можете проектировать здания, прокладывать рельсовые пути, настраивать дорожные знаки, заправки и спавнить пропсы с экспортом в <span className="text-white font-mono">map.json</span>.
                  </p>
                  
                  <div className="pt-2">
                    <a
                      href="/editor.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.08] hover:bg-[#ff6600] hover:text-black text-white font-mono text-xs font-bold uppercase rounded-[2px] transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Открыть редактор в новом окне</span>
                    </a>
                  </div>
                </div>

                {hasCustomSavedMap() && (
                  <div className="p-4 bg-[#181b20] border border-[#ff6600]/40 rounded-[2px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-white">Локальный кэш карты редактора</span>
                      <span className="text-[10px] font-mono text-[#ff6600] font-bold">АКТИВЕН</span>
                    </div>
                    <p className="text-[10px] text-[#8b929e]">
                      Обнаружены сохранённые изменения карты из редактора в локальном хранилище браузера.
                    </p>
                    <button
                      onClick={() => {
                        clearCustomMapStorage();
                        window.location.reload();
                      }}
                      className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 font-mono text-[10px] font-bold uppercase rounded-[2px] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Сбросить кэш карты к базовой версии</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.08] text-[10px] font-mono text-[#8b929e]">
                Все статические объекты мира зафиксированы в map.json согласно регламенту.
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* I. VIEW: ABOUT & HANDBOOK                                             */}
          {/* ===================================================================== */}
          {activeCategory === 'about' && (
            <div className="p-6 flex flex-col h-full justify-between gap-5 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="border-b border-white/[0.08] pb-4">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-[#ff6600] uppercase mb-1">
                    ТЕХНИЧЕСКИЙ БОРТОВОЙ ЖУРНАЛ
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase font-sans">
                    СПРАВОЧНИК СИМУЛЯЦИИ
                  </h2>
                  <p className="text-xs text-[#8b929e] mt-1">
                    Физическая модель движения, повреждений и выживания
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  <div className="p-3.5 bg-[#181b20] border border-white/[0.08] rounded-[2px]">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#ff6600] mb-1">
                      1. Динамика шин и эллипс сцепления
                    </div>
                    <p className="text-[11px] text-[#8b929e] leading-relaxed">
                      Машины рассчитывают продольное и поперечное сцепление колёс. При резком торможении или заносе колёса срываются в скольжение с характерным звуком трения и следами покрышек.
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#181b20] border border-white/[0.08] rounded-[2px]">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#ff6600] mb-1">
                      2. Тепловой баланс двигателя и масло
                    </div>
                    <p className="text-[11px] text-[#8b929e] leading-relaxed">
                      Мотор греется под нагрузкой. Недостаток масла или утечка радиатора приводят к стуку клапанов и заклиниванию коленвала.
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#181b20] border border-white/[0.08] rounded-[2px]">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#ff6600] mb-1">
                      3. Городская инфраструктура
                    </div>
                    <p className="text-[11px] text-[#8b929e] leading-relaxed">
                      Заправляйте бак на АЗС, соблюдайте светофоры и знаки приоритета. Для отдыха используйте кровати в открытых жилых домах.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-[#8b929e]">
                <span>СТЕПНОЙ ТРАКТ 2D • BEAMNG EDITION</span>
                <span className="text-[#ff6600] font-bold">RELEASE 0.33.2</span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM STATUS FOOTER                                                   */}
      {/* ========================================================================= */}
      <footer className="relative z-20 flex items-center justify-between px-6 py-2.5 border-t border-white/[0.08] bg-[#0b0c0e]/95 text-[10px] font-mono text-[#8b929e]">
        <div className="flex items-center gap-3">
          <span className="text-white/60">BEAMNG.DRIVE 2D</span>
          <span aria-hidden="true">·</span>
          <span>СТЕПНОЙ ТРАКТ СИМУЛЯТОР</span>
          <span aria-hidden="true">·</span>
          <span>ДВИЖОК: 2D SOFTBODY & POWERTRAIN</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-white/40">ESC: НАЗАД / В ИГРУ</span>
          <span className="text-[#ff6600] font-bold">READY</span>
        </div>
      </footer>

    </div>
  );
};

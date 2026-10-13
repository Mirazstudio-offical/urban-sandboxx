import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Plus, 
  FolderOpen, 
  Globe, 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  ChevronLeft, 
  Check, 
  Volume2, 
  VolumeX, 
  Monitor, 
  Gamepad2, 
  Sliders, 
  Shield, 
  Search, 
  Lock, 
  Star, 
  Activity, 
  RefreshCw,
  X,
  Compass,
  Key,
  Trash2,
  MapPin,
  Clock,
  CloudSun,
  Radio,
  Users,
  Eye,
  Sparkles,
  Wifi,
  WifiOff,
  Flame,
  ArrowRight,
  Sun,
  CloudRain,
  Cloud,
  Snowflake,
  Car
} from 'lucide-react';
import { SPAWN_LOCATIONS, SpawnLocation } from '../spawnLocations';
import { performanceConfig, savePerformanceConfig } from '../performanceConfig';
import { sound } from '../audio';
import { onlineManager, OnlineStatus } from '../onlineSystem';
import { 
  subscribeToP2PServers, 
  createP2PServerDoc, 
  P2PServerRoom, 
  auth, 
  type User as FirebaseUser 
} from '../firebase';
import { WeatherType } from '../types';

export interface SaveSlotData {
  id: string;
  name: string;
  date: string;
  playerX: number;
  playerY: number;
  playerAngle?: number;
  isInVehicle: boolean;
  currentVehicleId?: string | null;
  timeHour?: number;
  weather?: string;
  streetName?: string;
  cash?: number;
  vehicles?: any[];
  season?: string;
}

export interface MainMenuProps {
  onResume: () => void;
  saves: SaveSlotData[];
  onLoadSave: (saveId: string) => void;
  onDeleteSave: (saveId: string) => void;
  onNewGame: (options: {
    spawnId: string;
    saveName: string;
    timeHour: number;
    weather: WeatherType;
  }) => void;
  currentSettings: {
    fpsLimit: number;
    autoSaveInterval: number;
    timeAutoCycle: boolean;
    mouseSensitivity: number;
  };
  onUpdateSettings: (newSettings: any) => void;
  currentUser?: FirebaseUser | null;
}

type ScreenType = 'main' | 'new' | 'saves' | 'servers' | 'account' | 'settings' | 'notif' | 'create';

export const MainMenu: React.FC<MainMenuProps> = ({ 
  onResume, 
  saves = [], 
  onLoadSave, 
  onDeleteSave, 
  onNewGame,
  currentSettings,
  onUpdateSettings,
  currentUser
}) => {
  const [cur, setCur] = useState<ScreenType>('main');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [directionBack, setDirectionBack] = useState<boolean>(false);

  // New Game Creation States
  const [selectedSpawnIndex, setSelectedSpawnIndex] = useState<number>(0);
  const [spawnCategory, setSpawnCategory] = useState<string>('all');
  const [newGameName, setNewGameName] = useState<string>('Новый рейс: ' + SPAWN_LOCATIONS[0].nameRu);
  const [newGameTimeHour, setNewGameTimeHour] = useState<number>(12.0);
  const [newGameWeather, setNewGameWeather] = useState<WeatherType>('clear');

  // Saves Management States
  const [selectedSaveId, setSelectedSaveId] = useState<string>(saves[0]?.id || '');

  // Online & P2P Servers States
  const [servers, setServers] = useState<P2PServerRoom[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [directRoomCode, setDirectRoomCode] = useState<string>('');
  const [serverSearchQuery, setServerSearchQuery] = useState<string>('');
  
  // Host Server Form States
  const [hostServerName, setHostServerName] = useState<string>('Сервер ' + onlineManager.localPlayerName);
  const [hostRoomCode, setHostRoomCode] = useState<string>('room-' + Math.floor(1000 + Math.random() * 9000));
  const [hostMaxPlayers, setHostMaxPlayers] = useState<number>(8);
  const [hostGameMode, setHostGameMode] = useState<string>('free_roam');
  const [isCreatingServer, setIsCreatingServer] = useState<boolean>(false);

  // Settings State (Graphics / Sound / Controls / Gameplay)
  const [settingsTab, setSettingsTab] = useState<'set-gfx' | 'set-sound' | 'set-ctrl' | 'set-game'>('set-gfx');
  const [perfConfig, setPerfConfig] = useState(() => ({ ...performanceConfig }));
  const [audioMuted, setAudioMuted] = useState<boolean>(() => sound.getMuted());
  const [masterVol, setMasterVol] = useState<number>(() => Math.round(sound.getMasterVolume() * 100));
  const [engineVol, setEngineVol] = useState<number>(() => Math.round(sound.getEngineVolume() * 100));
  const [localSettings, setLocalSettings] = useState(() => ({ ...currentSettings }));

  // Account State
  const [accTab, setAccTab] = useState<string>('acc-profile');
  const [playerNickname, setPlayerNickname] = useState<string>(onlineManager.localPlayerName);
  const [nicknameSavedFeedback, setNicknameSavedFeedback] = useState<boolean>(false);

  const [scale, setScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep selected save ID in sync with available saves
  useEffect(() => {
    if (saves.length > 0 && (!selectedSaveId || !saves.some(s => s.id === selectedSaveId))) {
      setSelectedSaveId(saves[0].id);
    }
  }, [saves, selectedSaveId]);

  // Subscribe to real Firestore P2P servers
  useEffect(() => {
    const unsub = subscribeToP2PServers((fetched) => {
      setServers(fetched);
      if (fetched.length > 0 && !selectedServerId) {
        setSelectedServerId(fetched[0].id);
      }
    });
    return unsub;
  }, [selectedServerId]);

  // Viewport scaling
  useEffect(() => {
    const updateScale = () => {
      if (!wrapperRef.current) return;
      const width = wrapperRef.current.clientWidth;
      const height = wrapperRef.current.clientHeight;
      const scaleX = width / 1440;
      const scaleY = height / 900;
      setScale(Math.min(scaleX, scaleY));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Update default new save name when location selection changes
  const filteredSpawnLocations = SPAWN_LOCATIONS.filter(loc => {
    if (spawnCategory === 'all') return true;
    return loc.category === spawnCategory;
  });

  const selectedSpawn = SPAWN_LOCATIONS[selectedSpawnIndex] || SPAWN_LOCATIONS[0];

  const handleSelectSpawn = (index: number) => {
    setSelectedSpawnIndex(index);
    const loc = SPAWN_LOCATIONS[index] || SPAWN_LOCATIONS[0];
    setNewGameName('Старт: ' + loc.nameRu.split('(')[0].trim());
  };

  const go = (target: ScreenType, back: boolean = false) => {
    if (isTransitioning || target === cur) return;
    setIsTransitioning(true);
    setDirectionBack(back);
    
    setTimeout(() => {
      setCur(target);
      setIsTransitioning(false);
    }, 200);
  };

  // Keyboard navigation: Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cur === 'main') {
          onResume();
        } else if (cur === 'create') {
          go('servers', true);
        } else {
          go('main', true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cur, isTransitioning, onResume]);

  // Helper to update performance configuration directly
  const handleUpdatePerf = (patch: Partial<typeof perfConfig>) => {
    const updated = { ...perfConfig, ...patch };
    setPerfConfig(updated);
    Object.assign(performanceConfig, updated);
    savePerformanceConfig(performanceConfig);
  };

  // Helper to update gameplay settings
  const handleUpdateGameplaySettings = (patch: Partial<typeof localSettings>) => {
    const updated = { ...localSettings, ...patch };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  // Connect to P2P server
  const handleConnectToServer = (roomCode: string) => {
    const clean = onlineManager.sanitizeRoomCode(roomCode);
    if (!clean) return;
    onlineManager.joinOrCreateRoom(clean, playerNickname, false);
    onResume();
  };

  // Host new server
  const handleCreateAndHostServer = async () => {
    if (isCreatingServer) return;
    setIsCreatingServer(true);
    try {
      const cleanRoom = onlineManager.sanitizeRoomCode(hostRoomCode);
      await createP2PServerDoc({
        name: hostServerName.trim() || 'Сервер ' + playerNickname,
        peerId: cleanRoom,
        hostUid: currentUser?.uid || 'guest_' + Date.now(),
        hostName: playerNickname,
        mapName: 'Степной Тракт 2D',
        gameMode: hostGameMode,
        isPrivate: false,
        currentPlayers: 1,
        maxPlayers: hostMaxPlayers,
        status: 'active'
      });
      onlineManager.joinOrCreateRoom(cleanRoom, playerNickname, true);
      onResume();
    } catch (err) {
      console.error('Failed to create server', err);
      // Fallback: connect anyway in local room
      onlineManager.joinOrCreateRoom(hostRoomCode, playerNickname, true);
      onResume();
    } finally {
      setIsCreatingServer(false);
    }
  };

  // Filtered servers
  const filteredServers = servers.filter(s => {
    if (!serverSearchQuery.trim()) return true;
    const q = serverSearchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.hostName.toLowerCase().includes(q) || (s.peerId && s.peerId.toLowerCase().includes(q));
  });

  const selectedServer = servers.find(s => s.id === selectedServerId) || filteredServers[0] || null;

  // Selected save
  const selectedSave = saves.find(s => s.id === selectedSaveId) || saves[0] || null;

  return (
    <div 
      ref={wrapperRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0e10] overflow-hidden select-none"
    >
      <style>{`
        .gmw {
          position: relative;
          width: 1440px;
          height: 900px;
          overflow: hidden;
          background: #121315;
          font-family: 'Barlow', system-ui, sans-serif;
          color: #e9e6df;
          font-size: 15px;
        }
        .cn {
          font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .mut { color: #a29e93; }
        .chip {
          display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 16px; border-radius: 10px;
          background: rgba(22,22,24,.75); border: 1px solid rgba(255,255,255,.09); transition: filter .15s, border-color .15s;
          cursor: pointer;
        }
        .chip:hover { filter: brightness(1.2); border-color: rgba(201,146,43,.5); }
        .panel {
          background: rgba(20,20,22,.85); border: 1px solid rgba(255,255,255,.09); border-radius: 14px;
        }
        .menu-i {
          display: flex; align-items: center; gap: 18px; height: 58px; padding: 0 22px;
          border-left: 3px solid transparent; font-size: 24px; font-weight: 600; color: #cfcbc1; width: 100%;
          transition: background .18s, border-color .18s, color .18s, padding .18s; cursor: pointer; text-align: left;
        }
        .menu-i:hover {
          background: rgba(255,255,255,.06); color: #fff; border-left-color: rgba(201,146,43,.8); padding-left: 28px;
        }
        .nav-i {
          display: flex; align-items: center; height: 48px; padding: 0 18px;
          border-left: 3px solid transparent; font-size: 18px; font-weight: 600; color: #cfcbc1; width: 100%;
          transition: background .18s, border-color .18s, color .18s, padding .18s; cursor: pointer; text-align: left;
        }
        .nav-i:hover { background: rgba(255,255,255,.05); padding-left: 22px; }
        .nav-on { background: rgba(201,146,43,.16); border-left-color: #c9922b; color: #fff; }
        .tab-btn {
          height: 40px; padding: 0 18px; display: inline-flex; align-items: center; font-size: 18px; font-weight: 600;
          color: #a29e93; border-bottom: 3px solid transparent; transition: color .15s, border-color .15s; cursor: pointer;
        }
        .tab-btn:hover { color: #fff; }
        .tab-btn-on { color: #fff; border-bottom-color: #c9922b; }
        .pill-btn {
          display: inline-flex; align-items: center; height: 32px; padding: 0 14px; border-radius: 16px;
          background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); font-size: 13px; cursor: pointer; transition: all .15s;
        }
        .pill-btn:hover { background: rgba(255,255,255,.1); }
        .pill-btn-on { background: rgba(201,146,43,.25); border-color: rgba(201,146,43,.7); color: #f0c264; font-weight: 600; }
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 22px;
          border-radius: 10px; font-weight: 600; font-size: 15px; transition: filter .15s, transform .15s; cursor: pointer;
        }
        .btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .btn-p { background: #c9922b; color: #1a1409; font-weight: 700; font-size: 15px; }
        .btn-s { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); color: #e9e6df; }
        .card {
          display: block; width: 100%; border-radius: 12px; overflow: hidden; background: rgba(20,20,22,.86);
          border: 1px solid rgba(255,255,255,.09); transition: transform .18s, border-color .18s, box-shadow .18s; cursor: pointer; text-align: left;
        }
        .card:hover { transform: translateY(-2px); border-color: rgba(201,146,43,.6); }
        .card-on { border-color: #c9922b; box-shadow: 0 0 0 1px #c9922b, 0 10px 30px rgba(201,146,43,.2); }
        .tg {
          position: relative; width: 44px; height: 24px; border-radius: 12px; background: rgba(255,255,255,.14);
          transition: background .2s; flex: none; cursor: pointer;
        }
        .tg::after {
          content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%;
          background: #cfcbc1; transition: left .2s cubic-bezier(.3,.7,.2,1), background .2s;
        }
        .tg.on { background: #c9922b; }
        .tg.on::after { left: 22px; background: #1a1409; }
        .seg { display: flex; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,.14); }
        .seg > button {
          flex: 1; display: flex; align-items: center; justify-content: center; height: 36px; padding: 0 12px;
          font-size: 12px; font-weight: 600; background: rgba(255,255,255,.04); border-left: 1px solid rgba(255,255,255,.1);
          color: #cfcbc1; cursor: pointer; transition: background .15s, color .15s;
        }
        .seg > button:first-child { border-left: 0; }
        .seg > button.on { background: #c9922b; color: #1a1409; font-weight: 700; }
        .key {
          display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 22px; padding: 0 6px;
          border-radius: 5px; border: 1px solid rgba(255,255,255,.22); font-size: 11px; font-weight: 600; margin-right: 6px;
        }
        .row-hover {
          display: grid; grid-template-columns: 28px 1fr 140px 90px 40px; align-items: center; gap: 12px;
          width: 100%; height: 52px; padding: 0 16px; border-left: 3px solid transparent; border-bottom: 1px solid rgba(255,255,255,.05);
          transition: background .15s; cursor: pointer; text-align: left;
        }
        .row-hover:hover { background: rgba(255,255,255,.05); }
        .row-on { background: rgba(201,146,43,.15); border-left-color: #c9922b; }
        @keyframes inF { from { opacity: 0; transform: translateX(36px); } to { opacity: 1; transform: none; } }
        @keyframes inB { from { opacity: 0; transform: translateX(-36px); } to { opacity: 1; transform: none; } }
        .scr-anim-in { animation: inF .28s cubic-bezier(.2,.8,.2,1) both; }
        .scr-anim-in-back { animation: inB .28s cubic-bezier(.2,.8,.2,1) both; }
      `}</style>

      {/* Main 1440x900 viewport wrapper scaled smoothly */}
      <div 
        ref={containerRef}
        className="gmw shrink-0 shadow-2xl"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        {/* Parallax Background & Atmospheric Sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#14120e] via-[#241c14] to-[#0f0d0a]" />
        
        {/* Glow */}
        <div 
          className="absolute -left-[200px] top-0 w-[1840px] h-[900px] pointer-events-none"
          style={{
            background: 'radial-gradient(900px 520px at 70% 82%, rgba(201,146,43,0.32), transparent 62%)'
          }}
        />

        {/* Mountain Silhouette Layers */}
        <svg className="absolute left-0 top-0 w-[1760px] h-[900px] pointer-events-none opacity-60" viewBox="0 0 1760 900" preserveAspectRatio="none">
          <path d="M0 640 180 520 330 600 520 430 700 580 880 470 1080 600 1260 500 1440 590 1600 520 1760 600V900H0Z" fill="#241a10" />
        </svg>
        <svg className="absolute left-0 top-0 w-[1760px] h-[900px] pointer-events-none opacity-80" viewBox="0 0 1760 900" preserveAspectRatio="none">
          <path d="M0 720 220 610 420 700 640 590 860 710 1060 630 1260 720 1440 650 1600 700 1760 640V900H0Z" fill="#18130c" />
        </svg>
        <svg className="absolute left-0 top-0 w-[1760px] h-[900px] pointer-events-none" viewBox="0 0 1760 900" preserveAspectRatio="none">
          <path d="M0 800 300 740 620 800 980 750 1440 810 1760 770V900H0Z" fill="#0d0a07" />
        </svg>

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-[rgba(9,9,10,0.55)] pointer-events-none" />

        {/* ========================================================= */}
        {/* SCREEN 1: MAIN MENU */}
        {/* ========================================================= */}
        {cur === 'main' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(9,9,10,0.92)] via-[rgba(9,9,10,0.65)] to-transparent pointer-events-none" />

            {/* Header */}
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 border-2 border-[#c9922b] flex items-center justify-center -skew-x-6 shadow-[0_0_15px_rgba(201,146,43,0.4)]">
                  <div className="w-4 h-4 bg-[#c9922b]" />
                </div>
                <div>
                  <span className="cn text-base font-bold text-white tracking-wider">СТЕПНОЙ ТРАКТ 2D</span>
                  <div className="text-[10px] text-[#a29e93] font-mono tracking-widest uppercase">HARDCORE VEHICULAR SIMULATION</div>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => go('notif')}
                  className="chip"
                  title="Статус системы"
                >
                  <Activity className="w-4 h-4 text-[#c9922b]" />
                  <span className="mut text-xs font-mono font-bold">СИСТЕМА</span>
                </button>
                <button 
                  onClick={() => go('account')}
                  className="chip"
                >
                  <span className="w-6 h-6 rounded-full bg-[#c9922b] text-[#1a1409] inline-flex items-center justify-center font-bold text-xs">
                    {playerNickname.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium text-sm text-white">{playerNickname}</span>
                </button>
              </div>
            </div>

            {/* Navigation Menu Links */}
            <div className="absolute left-16 top-40 w-[420px] flex flex-col gap-1.5 z-10">
              {/* Primary Resume / Start Button */}
              {saves.length > 0 ? (
                <button 
                  onClick={() => {
                    if (saves[0]) {
                      onLoadSave(saves[0].id);
                    } else {
                      onResume();
                    }
                  }}
                  className="menu-i cn bg-[rgba(201,146,43,0.16)] border-l-[#c9922b] text-white flex-col items-start justify-center gap-0.5 h-[80px]"
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-5 h-5 fill-current text-[#e0ab45]" />
                    <span>Продолжить</span>
                  </div>
                  <span className="mut font-normal text-xs font-sans normal-case tracking-normal pl-7 truncate max-w-[360px]">
                    «{saves[0].name}» — {saves[0].date}
                  </span>
                </button>
              ) : (
                <button 
                  onClick={onResume}
                  className="menu-i cn bg-[rgba(201,146,43,0.16)] border-l-[#c9922b] text-white flex-col items-start justify-center gap-0.5 h-[80px]"
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-5 h-5 fill-current text-[#e0ab45]" />
                    <span>В игру</span>
                  </div>
                  <span className="mut font-normal text-xs font-sans normal-case tracking-normal pl-7">
                    Центральный Парк · Свободная езда
                  </span>
                </button>
              )}

              <button onClick={() => go('new')} className="menu-i cn">
                <Plus className="w-5 h-5 text-[#c9922b]" />
                <span>Новая сессия</span>
              </button>

              <button onClick={() => go('saves')} className="menu-i cn">
                <FolderOpen className="w-5 h-5 text-[#c9922b]" />
                <span>Сохранения ({saves.length})</span>
              </button>

              <button onClick={() => go('servers')} className="menu-i cn">
                <Globe className="w-5 h-5 text-[#c9922b]" />
                <span>Онлайн-серверы</span>
              </button>

              <button onClick={() => go('account')} className="menu-i cn">
                <User className="w-5 h-5 text-[#c9922b]" />
                <span>Профиль игрока</span>
              </button>

              <button onClick={() => go('settings')} className="menu-i cn">
                <Settings className="w-5 h-5 text-[#c9922b]" />
                <span>Настройки симуляции</span>
              </button>

              <button 
                onClick={onResume}
                className="menu-i cn mt-2 text-[#a29e93] hover:text-white"
              >
                <LogOut className="w-5 h-5 text-[#a29e93]" />
                <span>Вернуться к управлению</span>
              </button>
            </div>

            {/* Right Side: Real Save Snapshot Card & Online Stats */}
            <div className="panel absolute left-[880px] top-40 w-[496px] p-5 z-10">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="cn text-xs font-bold text-[#c9922b] flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  <span>{saves.length > 0 ? 'ПОСЛЕДНЕЕ СОХРАНЕНИЕ' : 'СТАТУС МИРА'}</span>
                </div>
                <span className="mut text-xs font-mono">{saves.length} слот(ов)</span>
              </div>

              {saves.length > 0 ? (
                <div className="pt-4 flex flex-col gap-3">
                  <div className="cn text-2xl font-bold text-white truncate">{saves[0].name}</div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono text-[#cfcbc1] bg-white/[0.03] p-3 rounded-lg border border-white/5">
                    <div>
                      <span className="text-[#a29e93] block">Локация:</span>
                      <span className="font-semibold text-white">{saves[0].streetName || 'Степной Тракт'}</span>
                    </div>
                    <div>
                      <span className="text-[#a29e93] block">Дата записи:</span>
                      <span className="font-semibold text-white">{saves[0].date}</span>
                    </div>
                    <div>
                      <span className="text-[#a29e93] block">Статус:</span>
                      <span className="font-semibold text-white">{saves[0].isInVehicle ? 'В автомобиле' : 'Пешком'}</span>
                    </div>
                    <div>
                      <span className="text-[#a29e93] block">Капитал:</span>
                      <span className="font-semibold text-[#7fbf6a]">{saves[0].cash !== undefined ? `${saves[0].cash.toLocaleString()} ₽` : '0 ₽'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onLoadSave(saves[0].id)}
                    className="btn btn-p w-full mt-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Загрузить и продолжить</span>
                  </button>
                </div>
              ) : (
                <div className="pt-4 flex flex-col gap-3">
                  <div className="cn text-2xl font-bold text-white">Степной Тракт — Открытый Мир</div>
                  <p className="text-xs text-[#a29e93] leading-relaxed font-sans">
                    Единая бесшовная карта с более чем 48 км дорог, реалистичной физикой деформации Node-Beam, живым ИИ-трафиком, сетью АЗС и интерактивными объектами.
                  </p>
                  <button 
                    onClick={() => go('new')}
                    className="btn btn-p w-full mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Создать первое сохранение</span>
                  </button>
                </div>
              )}
            </div>

            {/* Online Status Card */}
            <div className="absolute left-[880px] top-[470px] w-[496px] z-10">
              <button 
                onClick={() => go('servers')}
                className="panel w-full p-5 block text-left cursor-pointer hover:border-[rgba(201,146,43,0.5)] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="cn text-xs font-bold text-[#c9922b] flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>СЕТЬ МУЛЬТИПЛЕЕРА (P2P FIRESTORE)</span>
                  </span>
                  <span className={`text-xs font-mono font-bold ${servers.length > 0 ? 'text-[#7fbf6a]' : 'text-[#a29e93]'}`}>
                    {servers.length > 0 ? 'СЕРВЕРЫ В СЕТИ' : 'ОЖИДАНИЕ ХОСТА'}
                  </span>
                </div>
                <div className="cn text-3xl font-bold mt-2 text-white">
                  {servers.length} {servers.length === 1 ? 'АКТИВНЫЙ СЕРВЕР' : servers.length > 1 && servers.length < 5 ? 'АКТИВНЫХ СЕРВЕРА' : 'АКТИВНЫХ СЕРВЕРОВ'}
                </div>
                <div className="mut text-xs mt-1 font-mono">
                  {servers.length > 0 
                    ? 'Нажмите для просмотра открытых комнат и подключения'
                    : 'Создайте свою комнату или подключитесь по коду друга'}
                </div>
              </button>
            </div>

            {/* Bottom Hints */}
            <div className="absolute left-16 right-16 bottom-8 flex items-center justify-between text-xs text-[#a29e93] font-mono z-10">
              <div className="flex items-center">
                <span className="key">Esc</span>В игру
                <span className="key ml-4">Enter</span>Выбрать
              </div>
              <div>МЕТРОПОЛИС 2D · РЕАЛИСТИЧНАЯ СИМУЛЯЦИЯ</div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: NEW SESSION (REAL OPEN WORLD SPAWN LOCATIONS) */}
        {/* ========================================================= */}
        {cur === 'new' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <span className="cn text-2xl font-bold text-white">Новая сессия</span>
                  <span className="mut text-xs ml-3 font-mono">Выбор стартовой локации в открытом мире</span>
                </div>
              </div>
              <div className="mut text-xs flex items-center gap-2 font-mono">
                <b className="text-[#e0ab45]">1</b> Точка старта <span className="w-6 h-[1px] bg-white/20" /> <b className="text-[#e0ab45]">2</b> Параметры
              </div>
            </div>

            {/* Category Filter and Locations Grid */}
            <div className="absolute left-16 top-24 w-[880px] z-10">
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'all', label: 'Все локации' },
                  { id: 'city', label: 'Город & Центр' },
                  { id: 'highway', label: 'Трасса М-12' },
                  { id: 'nature', label: 'Природа & Деревни' },
                  { id: 'mountain', label: 'Горы & Каньоны' },
                  { id: 'industrial', label: 'Промзона & Гаражи' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSpawnCategory(cat.id)}
                    className={`pill-btn ${spawnCategory === cat.id ? 'pill-btn-on' : ''}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-3 gap-3.5 h-[590px] overflow-y-auto pr-2">
                {filteredSpawnLocations.map((loc, idx) => {
                  const globalIdx = SPAWN_LOCATIONS.findIndex(s => s.id === loc.id);
                  const isSelected = selectedSpawnIndex === globalIdx;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => handleSelectSpawn(globalIdx)}
                      className={`card p-3.5 flex flex-col justify-between ${isSelected ? 'card-on' : ''}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                            {loc.icon}
                          </div>
                          <span className="mut text-[11px] font-mono">
                            X: {Math.round(loc.x)} | Y: {Math.round(loc.y)}
                          </span>
                        </div>
                        <div className="cn text-base font-bold text-white line-clamp-1">{loc.nameRu}</div>
                        <p className="mut text-xs mt-1 line-clamp-2 leading-relaxed">{loc.description}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                        <span className="text-[#a29e93] capitalize">{loc.category || 'открытый мир'}</span>
                        {isSelected && <span className="text-[#e0ab45] font-bold">Выбрано</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Configuration panel */}
            <div className="panel absolute left-[976px] top-24 w-[400px] h-[670px] p-5 flex flex-col z-10">
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <div className="p-2.5 bg-[#c9922b]/20 border border-[#c9922b]/40 rounded-xl text-[#c9922b]">
                  {selectedSpawn.icon}
                </div>
                <div className="min-w-0">
                  <div className="cn mut text-[11px]">Стартовая точка</div>
                  <div className="cn text-xl font-bold text-white truncate">{selectedSpawn.nameRu}</div>
                </div>
              </div>

              <div className="mt-4 flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                <div>
                  <label className="text-xs text-[#a29e93] mb-1.5 block font-mono">Название нового сохранения</label>
                  <input
                    type="text"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-[#c9922b]/50 text-white text-sm outline-none focus:border-[#c9922b]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#a29e93] mb-1.5 block font-mono">Время суток при старте</label>
                  <div className="seg">
                    <button 
                      onClick={() => setNewGameTimeHour(6.0)}
                      className={newGameTimeHour === 6.0 ? 'on' : ''}
                    >
                      Рассвет 06:00
                    </button>
                    <button 
                      onClick={() => setNewGameTimeHour(12.0)}
                      className={newGameTimeHour === 12.0 ? 'on' : ''}
                    >
                      День 12:00
                    </button>
                    <button 
                      onClick={() => setNewGameTimeHour(19.0)}
                      className={newGameTimeHour === 19.0 ? 'on' : ''}
                    >
                      Закат 19:00
                    </button>
                    <button 
                      onClick={() => setNewGameTimeHour(23.5)}
                      className={newGameTimeHour === 23.5 ? 'on' : ''}
                    >
                      Ночь 23:30
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#a29e93] mb-1.5 block font-mono">Погодные условия</label>
                  <div className="seg">
                    <button 
                      onClick={() => setNewGameWeather('clear')}
                      className={newGameWeather === 'clear' ? 'on' : ''}
                    >
                      Ясно
                    </button>
                    <button 
                      onClick={() => setNewGameWeather('overcast')}
                      className={newGameWeather === 'overcast' ? 'on' : ''}
                    >
                      Пасмурно
                    </button>
                    <button 
                      onClick={() => setNewGameWeather('rain')}
                      className={newGameWeather === 'rain' ? 'on' : ''}
                    >
                      Дождь
                    </button>
                    <button 
                      onClick={() => setNewGameWeather('fog')}
                      className={newGameWeather === 'fog' ? 'on' : ''}
                    >
                      Туман
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs font-mono text-[#a29e93] leading-relaxed">
                  <div className="text-white font-semibold mb-1">Справка о локации:</div>
                  {selectedSpawn.description}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 mt-2">
                <button
                  onClick={() => {
                    onNewGame({
                      spawnId: selectedSpawn.id,
                      saveName: newGameName.trim() || 'Старт: ' + selectedSpawn.nameRu,
                      timeHour: newGameTimeHour,
                      weather: newGameWeather
                    });
                  }}
                  className="btn btn-p w-full h-11 text-base cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Начать сессию</span>
                </button>
              </div>
            </div>

            <div className="absolute left-16 right-16 bottom-6 flex items-center justify-between text-xs text-[#a29e93] font-mono z-10">
              <div className="flex items-center">
                <span className="key">Esc</span>Назад в главное меню
              </div>
              <div>Единая карта мира Степной Тракт · 48 км открытых дорог</div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: SAVES (REAL USER SAVES FROM LOCALSTORAGE) */}
        {/* ========================================================= */}
        {cur === 'saves' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <span className="cn text-2xl font-bold text-white">Список сохранений</span>
                  <span className="mut text-xs ml-3 font-mono">Реальные слоты сохранения в хранилище</span>
                </div>
              </div>
              <button 
                onClick={() => go('new')}
                className="chip bg-[#c9922b]/20 border-[#c9922b]/50 text-white"
              >
                <Plus className="w-4 h-4 text-[#e0ab45]" />
                <span className="font-semibold text-sm">Новая сессия</span>
              </button>
            </div>

            {/* List of real saves */}
            <div className="absolute left-16 top-24 w-[1312px] h-[640px] z-10 flex flex-col justify-between">
              {saves.length > 0 ? (
                <>
                  <div className="grid grid-cols-4 gap-4 max-h-[550px] overflow-y-auto pr-2">
                    {saves.map((save) => {
                      const isSelected = selectedSaveId === save.id;
                      return (
                        <button
                          key={save.id}
                          onClick={() => setSelectedSaveId(save.id)}
                          className={`card p-4 flex flex-col justify-between min-h-[160px] ${isSelected ? 'card-on' : ''}`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="cn text-xs font-bold text-[#c9922b] truncate max-w-[180px]">
                                {save.streetName || 'Степной Тракт'}
                              </span>
                              <span className="text-[10px] text-[#a29e93] font-mono">{save.date.split(' в ')[0]}</span>
                            </div>
                            <div className="cn text-lg font-bold text-white truncate">{save.name}</div>
                            
                            <div className="mt-3 flex flex-col gap-1 text-xs font-mono text-[#a29e93]">
                              <div className="flex justify-between">
                                <span>Время в мире:</span>
                                <span className="text-white">
                                  {save.timeHour !== undefined ? `${Math.floor(save.timeHour)}:${Math.floor((save.timeHour % 1) * 60).toString().padStart(2, '0')}` : 'День'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Позиция:</span>
                                <span className="text-white">{save.isInVehicle ? 'В автомобиле' : 'Пешком'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Капитал:</span>
                                <span className="text-[#7fbf6a] font-semibold">{save.cash !== undefined ? `${save.cash.toLocaleString()} ₽` : '—'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
                            <span className="text-[#8f8b81]">{save.date.split(' в ')[1] ? `в ${save.date.split(' в ')[1]}` : ''}</span>
                            {isSelected && <span className="text-[#e0ab45] font-bold">Выбрано</span>}
                          </div>
                        </button>
                      );
                    })}

                    {/* New session slot card */}
                    <button
                      onClick={() => go('new')}
                      className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#c9922b]/40 bg-[#c9922b]/[0.04] hover:bg-[#c9922b]/[0.1] rounded-xl text-[#e0ab45] transition-all cursor-pointer min-h-[160px]"
                    >
                      <Plus className="w-8 h-8" />
                      <span className="cn text-base font-bold">Создать новое сохранение</span>
                    </button>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="mut text-sm font-mono flex items-center gap-2">
                      <span>Выбрано:</span>
                      <span className="text-white font-bold">{selectedSave ? selectedSave.name : '—'}</span>
                    </div>

                    <div className="flex gap-3">
                      {selectedSave && (
                        <button 
                          onClick={() => {
                            if (confirm(`Удалить сохранение «${selectedSave.name}»?`)) {
                              onDeleteSave(selectedSave.id);
                            }
                          }}
                          className="btn btn-s text-rose-400 hover:text-rose-300 border-rose-900/40 hover:border-rose-700/60"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Удалить слот</span>
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          if (selectedSave) {
                            onLoadSave(selectedSave.id);
                          }
                        }}
                        disabled={!selectedSave}
                        className="btn btn-p disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Загрузить сохранение</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Empty Saves State */
                <div className="panel flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#c9922b] mb-4">
                    <FolderOpen className="w-8 h-8" />
                  </div>
                  <h3 className="cn text-2xl font-bold text-white">Сохраненных сессий пока нет</h3>
                  <p className="mut text-sm max-w-md mt-2 leading-relaxed">
                    Начните новую сессию и исследуйте открытый мир. Во время игры вы можете сохранить текущий прогресс через меню паузы [Esc] или дождаться автосохранения.
                  </p>
                  <button 
                    onClick={() => go('new')}
                    className="btn btn-p mt-6"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Начать новую игру</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 4: SERVERS (REAL FIRESTORE P2P MULTIPLAYER) */}
        {/* ========================================================= */}
        {cur === 'servers' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <span className="cn text-2xl font-bold text-white">Онлайн-мультиплеер P2P</span>
                  <span className="mut text-xs ml-3 font-mono">Живой список комнат в реальном времени</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => go('create')} className="chip bg-[#c9922b]/20 border-[#c9922b]/50 text-white">
                  <Plus className="w-4 h-4 text-[#e0ab45]" />
                  <span className="font-semibold text-sm">Создать сервер</span>
                </button>
                <div className="chip">
                  <span className="w-6 h-6 rounded-full bg-[#c9922b] text-[#1a1409] inline-flex items-center justify-center font-bold text-xs">
                    {playerNickname.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium text-sm">{playerNickname}</span>
                </div>
              </div>
            </div>

            {/* Direct Connect & Search Bar */}
            <div className="absolute left-16 top-24 w-[1312px] flex items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#a29e93]" />
                  <input
                    type="text"
                    value={serverSearchQuery}
                    onChange={(e) => setServerSearchQuery(e.target.value)}
                    placeholder="Поиск по названию или хосту..."
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.06] border border-white/10 text-white text-xs outline-none focus:border-[#c9922b]"
                  />
                </div>
              </div>

              {/* Direct Code Join */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={directRoomCode}
                  onChange={(e) => setDirectRoomCode(e.target.value)}
                  placeholder="Ввести код комнаты..."
                  className="w-56 h-10 px-3 rounded-lg bg-white/[0.06] border border-white/10 text-white text-xs outline-none focus:border-[#c9922b] font-mono"
                />
                <button
                  onClick={() => handleConnectToServer(directRoomCode)}
                  disabled={!directRoomCode.trim()}
                  className="btn btn-s h-10 px-4 text-xs font-mono disabled:opacity-40"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Подключиться по коду</span>
                </button>
              </div>
            </div>

            {/* Table of real servers */}
            <div className="panel absolute left-16 top-38 w-[860px] h-[610px] overflow-hidden flex flex-col z-10">
              <div className="grid grid-cols-[28px_1fr_140px_90px_40px] items-center gap-3 px-4 h-10 border-b border-white/10 text-xs font-mono text-[#8f8b81] shrink-0">
                <span />
                <span>Название и хост</span>
                <span>Режим</span>
                <span>Игроки</span>
                <span />
              </div>

              <div className="overflow-y-auto flex-1">
                {filteredServers.length > 0 ? (
                  filteredServers.map((srv) => {
                    const isSelected = selectedServer?.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedServerId(srv.id)}
                        className={`row-hover ${isSelected ? 'row-on' : ''}`}
                      >
                        <Radio className={`w-3.5 h-3.5 ${srv.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <div className="truncate">
                          <div className="font-semibold text-white truncate text-sm">{srv.name}</div>
                          <div className="mut text-xs font-mono truncate">Хост: {srv.hostName} · Код: {srv.peerId}</div>
                        </div>
                        <span className="text-xs text-[#cfcbc1] truncate capitalize">
                          {srv.gameMode === 'free_roam' ? 'Свободная езда' : srv.gameMode}
                        </span>
                        <span className="text-xs font-mono text-[#cfcbc1]">{srv.currentPlayers || 1} / {srv.maxPlayers || 8}</span>
                        <ArrowRight className="w-4 h-4 text-[#a29e93]" />
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <WifiOff className="w-10 h-10 text-[#a29e93] mb-3" />
                    <div className="cn text-lg font-bold text-white">В данный момент нет открытых серверов</div>
                    <p className="mut text-xs max-w-sm mt-1 leading-relaxed">
                      Создайте собственную комнату кнопкой «Создать сервер» выше, либо введите код комнаты для прямого P2P-подключения к сессии друга.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Server details card */}
            <div className="panel absolute left-[948px] top-38 w-[428px] h-[610px] p-5 flex flex-col justify-between z-10">
              {selectedServer ? (
                <>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#c9922b]">
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      <span>АКТИВНАЯ СЕССИЯ FIRESTORE</span>
                    </div>

                    <div className="cn text-2xl font-bold text-white leading-tight">{selectedServer.name}</div>
                    <div className="text-xs font-mono text-[#a29e93]">
                      Прямой P2P-канал по протоколу WebRTC / PeerJS
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono bg-white/[0.03] p-3.5 rounded-xl border border-white/5">
                      <div>
                        <div className="mut">Хост сервера:</div>
                        <div className="text-white font-medium">{selectedServer.hostName}</div>
                      </div>
                      <div>
                        <div className="mut">Код комнаты:</div>
                        <div className="text-white font-medium">{selectedServer.peerId}</div>
                      </div>
                      <div>
                        <div className="mut">Игровая карта:</div>
                        <div className="text-white font-medium">{selectedServer.mapName || 'Степной Тракт'}</div>
                      </div>
                      <div>
                        <div className="mut">Режим:</div>
                        <div className="text-white font-medium capitalize">
                          {selectedServer.gameMode === 'free_roam' ? 'Свободная езда' : selectedServer.gameMode}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="mut">Заполненность</span>
                        <span className="text-white font-bold">{selectedServer.currentPlayers || 1} / {selectedServer.maxPlayers || 8}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#c9922b]"
                          style={{ width: `${Math.min(100, ((selectedServer.currentPlayers || 1) / (selectedServer.maxPlayers || 8)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10">
                    <button 
                      onClick={() => handleConnectToServer(selectedServer.peerId)}
                      className="btn btn-p w-full h-11"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Подключиться к серверу</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Globe className="w-12 h-12 text-[#a29e93]/50 mb-3" />
                  <div className="cn text-lg font-bold text-white">Выберите сервер</div>
                  <p className="mut text-xs mt-1">
                    Выберите сервер из списка слева или создайте новый для совместной езды.
                  </p>
                  <button 
                    onClick={() => go('create')}
                    className="btn btn-p mt-4 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Создать новый сервер</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 5: CREATE SERVER (REAL FIRESTORE & WEBRTC ROOM) */}
        {/* ========================================================= */}
        {cur === 'create' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('servers', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <span className="cn text-2xl font-bold text-white">Создать игровой сервер</span>
                  <span className="mut text-xs ml-3 font-mono">Хостинг открытой сессии мультиплеера</span>
                </div>
              </div>
            </div>

            <div className="panel absolute left-16 top-24 w-[880px] h-[670px] p-7 flex flex-col justify-between z-10">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-[#a29e93] mb-1.5 block font-mono">Название сервера</label>
                  <input
                    type="text"
                    value={hostServerName}
                    onChange={(e) => setHostServerName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg bg-white/[0.06] border border-[#c9922b]/60 text-white text-sm outline-none focus:border-[#c9922b]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#a29e93] mb-1.5 block font-mono">Код P2P-комнаты (для приглашения друзей)</label>
                  <input
                    type="text"
                    value={hostRoomCode}
                    onChange={(e) => setHostRoomCode(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg bg-white/[0.06] border border-white/10 text-white text-sm outline-none font-mono focus:border-[#c9922b]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#a29e93] mb-1.5 block font-mono">Игровой режим</label>
                  <div className="seg">
                    {[
                      { id: 'free_roam', name: 'Свободная езда' },
                      { id: 'drift', name: 'Дрифт движ' },
                      { id: 'street_race', name: 'Стрит-рейсинг' },
                      { id: 'delivery', name: 'Грузоперевозки' }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setHostGameMode(m.id)}
                        className={hostGameMode === m.id ? 'on' : ''}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#a29e93] mb-1.5 font-mono">
                    <span>Максимум игроков: {hostMaxPlayers}</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="16" 
                    value={hostMaxPlayers}
                    onChange={(e) => setHostMaxPlayers(Number(e.target.value))}
                    className="w-full accent-[#c9922b]" 
                  />
                </div>

                <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs font-mono text-[#a29e93] leading-relaxed">
                  <div className="text-white font-semibold mb-1">Сетевая синхронизация:</div>
                  Сервер публикуется в базе Firestore и регистрируется как хост в P2P-сети PeerJS. Подключенные игроки синхронизируют автомобили, физические повреждения софтбоди, свет фар, поворотники и звуковые сигналы.
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button onClick={() => go('servers', true)} className="btn btn-s flex-1">
                  Отмена
                </button>
                <button 
                  onClick={handleCreateAndHostServer} 
                  disabled={isCreatingServer}
                  className="btn btn-p flex-1"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isCreatingServer ? 'Регистрация сервера...' : 'Запустить сервер'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 6: REAL SETTINGS (PERFORMANCE, SOUND, CONTROLS, GAMEPLAY) */}
        {/* ========================================================= */}
        {cur === 'settings' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <span className="cn text-2xl font-bold text-white">Параметры симуляции</span>
                  <span className="mut text-xs ml-3 font-mono">Реальная конфигурация физики, графики и звука</span>
                </div>
              </div>
            </div>

            {/* Navigation Categories */}
            <div className="absolute left-16 top-24 w-[240px] flex flex-col gap-1 z-10">
              <button 
                onClick={() => setSettingsTab('set-gfx')}
                className={`nav-i cn ${settingsTab === 'set-gfx' ? 'nav-on' : ''}`}
              >
                Графика и рендер
              </button>
              <button 
                onClick={() => setSettingsTab('set-sound')}
                className={`nav-i cn ${settingsTab === 'set-sound' ? 'nav-on' : ''}`}
              >
                Звук и аудио
              </button>
              <button 
                onClick={() => setSettingsTab('set-ctrl')}
                className={`nav-i cn ${settingsTab === 'set-ctrl' ? 'nav-on' : ''}`}
              >
                Управление
              </button>
              <button 
                onClick={() => setSettingsTab('set-game')}
                className={`nav-i cn ${settingsTab === 'set-game' ? 'nav-on' : ''}`}
              >
                Геймплей и время
              </button>
            </div>

            {/* REAL GRAPHICS SETTINGS */}
            {settingsTab === 'set-gfx' && (
              <div className="panel absolute left-[320px] top-24 w-[1008px] h-[670px] p-6 overflow-y-auto flex flex-col gap-4 z-10">
                <div className="cn text-sm text-[#e0ab45] font-bold">Настройки рендеринга и графической производительности</div>
                
                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Режим оптимизации для слабых устройств (Low Quality)</div>
                    <div className="text-xs text-[#a29e93]">Отключение мелких декоративных линий и фоновых деталей крыш</div>
                  </div>
                  <button 
                    onClick={() => handleUpdatePerf({ lowQualityRendering: !perfConfig.lowQualityRendering })} 
                    className={`tg ${perfConfig.lowQualityRendering ? 'on' : ''}`} 
                  />
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Динамические тени (Shadows)</div>
                    <div className="text-xs text-[#a29e93]">Рендеринг мягких теней от зданий, автомобилей и деревьев</div>
                  </div>
                  <button 
                    onClick={() => handleUpdatePerf({ enableShadows: !perfConfig.enableShadows })} 
                    className={`tg ${perfConfig.enableShadows ? 'on' : ''}`} 
                  />
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Капли дождя на лобовом стекле / экране</div>
                    <div className="text-xs text-[#a29e93]">Анимированные брызги и капли воды при осадках</div>
                  </div>
                  <button 
                    onClick={() => handleUpdatePerf({ enableRainDroplets: !perfConfig.enableRainDroplets })} 
                    className={`tg ${perfConfig.enableRainDroplets ? 'on' : ''}`} 
                  />
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Архитектурная детализация зданий</div>
                    <div className="text-xs text-[#a29e93]">Отрисовка балконов, пожарных лестниц и кондиционеров</div>
                  </div>
                  <button 
                    onClick={() => handleUpdatePerf({ enableBalconyDetails: !perfConfig.enableBalconyDetails })} 
                    className={`tg ${perfConfig.enableBalconyDetails ? 'on' : ''}`} 
                  />
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Мини-карта (HUD Радар)</div>
                    <div className="text-xs text-[#a29e93]">Отображение радара с дорожной разметкой в углу экрана</div>
                  </div>
                  <button 
                    onClick={() => handleUpdatePerf({ enableMinimap: !perfConfig.enableMinimap })} 
                    className={`tg ${perfConfig.enableMinimap ? 'on' : ''}`} 
                  />
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Лимит частиц дыма, пара и огня</div>
                    <div className="text-xs text-[#a29e93]">Максимальное число частиц физических повреждений в кадре</div>
                  </div>
                  <div className="flex items-center gap-3 w-72">
                    <input 
                      type="range" 
                      min="100" 
                      max="600" 
                      step="50"
                      value={perfConfig.particleLimit}
                      onChange={(e) => handleUpdatePerf({ particleLimit: Number(e.target.value) })}
                      className="flex-1 accent-[#c9922b]"
                    />
                    <span className="text-xs font-mono font-bold w-12 text-right">{perfConfig.particleLimit}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Плотность ИИ-автомобилей в трафике</div>
                    <div className="text-xs text-[#a29e93]">Количество симулируемых машин в активной зоне</div>
                  </div>
                  <div className="flex items-center gap-3 w-72">
                    <input 
                      type="range" 
                      min="5" 
                      max="45" 
                      step="1"
                      value={perfConfig.maxVehicles}
                      onChange={(e) => handleUpdatePerf({ maxVehicles: Number(e.target.value) })}
                      className="flex-1 accent-[#c9922b]"
                    />
                    <span className="text-xs font-mono font-bold w-12 text-right">{perfConfig.maxVehicles}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <div>
                    <div className="font-medium text-sm text-white">Плотность пешеходов</div>
                    <div className="text-xs text-[#a29e93]">Количество пешеходов на тротуарах и переходах</div>
                  </div>
                  <div className="flex items-center gap-3 w-72">
                    <input 
                      type="range" 
                      min="20" 
                      max="200" 
                      step="10"
                      value={perfConfig.maxActivePedestrians}
                      onChange={(e) => handleUpdatePerf({ maxActivePedestrians: Number(e.target.value) })}
                      className="flex-1 accent-[#c9922b]"
                    />
                    <span className="text-xs font-mono font-bold w-12 text-right">{perfConfig.maxActivePedestrians}</span>
                  </div>
                </div>
              </div>
            )}

            {/* REAL SOUND SETTINGS */}
            {settingsTab === 'set-sound' && (
              <div className="panel absolute left-[320px] top-24 w-[1008px] h-[670px] p-6 flex flex-col gap-5 z-10">
                <div className="cn text-sm text-[#e0ab45] font-bold">Процедурный синтез звука (Web Audio API)</div>
                
                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Общий звук симулятора</div>
                    <div className="text-xs text-[#a29e93]">Мгновенное отключение / включение всех аудиоканалов</div>
                  </div>
                  <button 
                    onClick={() => {
                      const res = sound.toggleMute();
                      setAudioMuted(res);
                    }} 
                    className={`tg ${!audioMuted ? 'on' : ''}`} 
                  />
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Общая громкость (Master Volume)</div>
                    <div className="text-xs text-[#a29e93]">Мастер-уровень звукового тракта</div>
                  </div>
                  <div className="flex items-center gap-3 w-72">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={masterVol}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMasterVol(val);
                        sound.setMasterVolume(val / 100);
                      }}
                      className="flex-1 accent-[#c9922b]"
                    />
                    <span className="text-xs font-mono font-bold w-12 text-right">{masterVol}%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Громкость двигателя и выхлопа (Engine Layer)</div>
                    <div className="text-xs text-[#a29e93]">Синтез поршневых импульсов, резонанса выхлопа и турбины</div>
                  </div>
                  <div className="flex items-center gap-3 w-72">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={engineVol}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEngineVol(val);
                        sound.setEngineVolume(val / 100);
                      }}
                      className="flex-1 accent-[#c9922b]"
                    />
                    <span className="text-xs font-mono font-bold w-12 text-right">{engineVol}%</span>
                  </div>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs font-mono text-[#a29e93] leading-relaxed mt-2">
                  <div className="text-white font-semibold mb-1">Диегетическая звуковая модель:</div>
                  Игра использует гармонические осцилляторы и шумовые генераторы Web Audio API без предзаписанных аудиодорожек: обороты двигателя, трение покрышек об асфальт, свист нагнетателя и удары металла рассчитываются по физическим уравнениям в реальном времени.
                </div>
              </div>
            )}

            {/* REAL CONTROLS KEYBINDINGS */}
            {settingsTab === 'set-ctrl' && (
              <div className="panel absolute left-[320px] top-24 w-[1008px] h-[670px] p-6 flex flex-col gap-4 z-10 overflow-y-auto">
                <div className="cn text-sm text-[#e0ab45] font-bold">Раскладка управления и чувствительность</div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Чувствительность обзора мыши</div>
                    <div className="text-xs text-[#a29e93]">Скорость вращения прицела и взаимодействия</div>
                  </div>
                  <div className="flex items-center gap-3 w-72">
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2.5" 
                      step="0.1"
                      value={localSettings.mouseSensitivity}
                      onChange={(e) => handleUpdateGameplaySettings({ mouseSensitivity: Number(e.target.value) })}
                      className="flex-1 accent-[#c9922b]"
                    />
                    <span className="text-xs font-mono font-bold w-12 text-right">{localSettings.mouseSensitivity.toFixed(1)}x</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col gap-2.5 text-xs font-mono">
                    <div className="text-[#c9922b] font-bold pb-1 border-b border-white/10 uppercase">Управление автомобилем</div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Газ / Тормоз</span><span className="text-white font-bold">[W] / [S] или [↑] / [↓]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Руление</span><span className="text-white font-bold">[A] / [D] или [←] / [→]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Ручной тормоз (Дрифт)</span><span className="text-white font-bold">[Пробел]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Свет фар (Выкл / Ближний / Дальний)</span><span className="text-white font-bold">[L]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Звуковой сигнал (Клаксон)</span><span className="text-white font-bold">[H]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Поворотники (Левый / Правый)</span><span className="text-white font-bold">[Q] / [Z]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Аварийная сигнализация</span><span className="text-white font-bold">[X]</span></div>
                  </div>

                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col gap-2.5 text-xs font-mono">
                    <div className="text-[#c9922b] font-bold pb-1 border-b border-white/10 uppercase">Персонаж и взаимодействие</div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Действие / Сесть в авто / Взять</span><span className="text-white font-bold">[E]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Быстрый инвентарь / Карманы</span><span className="text-white font-bold">[Tab] / [1-6]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Самодиагностика травм и тела</span><span className="text-white font-bold">[F]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Карта навигации (GPS)</span><span className="text-white font-bold">[M]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Масштаб камеры</span><span className="text-white font-bold">[C]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Сетка деформации кузова BeamNG</span><span className="text-white font-bold">[G]</span></div>
                    <div className="flex justify-between"><span className="text-[#a29e93]">Меню паузы / Выход в меню</span><span className="text-white font-bold">[Esc]</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* REAL GAMEPLAY SETTINGS */}
            {settingsTab === 'set-game' && (
              <div className="panel absolute left-[320px] top-24 w-[1008px] h-[670px] p-6 flex flex-col gap-5 z-10">
                <div className="cn text-sm text-[#e0ab45] font-bold">Параметры игрового процесса и симуляции</div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Интервал автосохранения</div>
                    <div className="text-xs text-[#a29e93]">Фоновая периодическая запись позиции и состояния мира</div>
                  </div>
                  <div className="seg w-72">
                    {[
                      { val: 0, label: 'Выкл' },
                      { val: 15, label: '15 с' },
                      { val: 25, label: '25 с' },
                      { val: 60, label: '1 мин' },
                      { val: 120, label: '2 мин' }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => handleUpdateGameplaySettings({ autoSaveInterval: opt.val })}
                        className={localSettings.autoSaveInterval === opt.val ? 'on' : ''}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Автоматический суточный ход времени</div>
                    <div className="text-xs text-[#a29e93]">Плавная смена дня, заката, ночи и рассвета</div>
                  </div>
                  <button 
                    onClick={() => handleUpdateGameplaySettings({ timeAutoCycle: !localSettings.timeAutoCycle })} 
                    className={`tg ${localSettings.timeAutoCycle ? 'on' : ''}`} 
                  />
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <div>
                    <div className="font-medium text-sm text-white">Целевой лимит кадров (FPS Cap)</div>
                    <div className="text-xs text-[#a29e93]">Ограничение частоты кадров для экономии батареи</div>
                  </div>
                  <div className="seg w-72">
                    {[30, 60, 120, 0].map(limit => (
                      <button
                        key={limit}
                        onClick={() => handleUpdateGameplaySettings({ fpsLimit: limit })}
                        className={localSettings.fpsLimit === limit ? 'on' : ''}
                      >
                        {limit === 0 ? 'Max' : `${limit}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs font-mono text-[#a29e93] leading-relaxed mt-2">
                  <div className="text-white font-semibold mb-1">Принцип реализма и разделения воли:</div>
                  В симуляторе отсутствуют искусственные мета-кнопки для прерывания биологических процессов (сна, потери сознания, приступа боли, голода). Все параметры тела и погоды симулируются независимо от действий игрока.
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 7: NOTIFICATIONS & SYSTEM STATUS */}
        {/* ========================================================= */}
        {cur === 'notif' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <span className="cn text-2xl font-bold text-white">Статус симуляции и служб</span>
                  <span className="mut text-xs ml-3 font-mono">Телеметрия подсистем движка</span>
                </div>
              </div>
            </div>

            <div className="absolute left-16 top-24 w-[1312px] flex flex-col gap-3.5 z-10">
              <div className="panel p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Физический движок Node-Beam (BeamNG 2D)</div>
                    <div className="mut text-xs font-mono mt-0.5">Упругопластические связи, зоны деформации кузова и непрерывный солвер активны</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded">
                  ОНЛАЙН · 60 HZ
                </span>
              </div>

              <div className="panel p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Сетевой протокол P2P (PeerJS / WebRTC)</div>
                    <div className="mut text-xs font-mono mt-0.5">Статус: {onlineManager.status} · Локальный позывной: {playerNickname}</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/40 border border-sky-500/30 px-3 py-1 rounded">
                  {onlineManager.status.toUpperCase()}
                </span>
              </div>

              <div className="panel p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Хранилище сохранений (LocalStorage)</div>
                    <div className="mut text-xs font-mono mt-0.5">Записано {saves.length} слот(ов) сохранений мира</div>
                  </div>
                </div>
                <button onClick={() => go('saves')} className="btn btn-s text-xs h-8 px-3">
                  Открыть сохраненные игры
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 8: ACCOUNT & PROFILE */}
        {/* ========================================================= */}
        {cur === 'account' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <span className="cn text-2xl font-bold text-white">Профиль игрока</span>
                  <span className="mut text-xs ml-3 font-mono">Позывной и синхронизация</span>
                </div>
              </div>
            </div>

            {/* Account Card */}
            <div className="panel absolute left-16 top-24 w-[1312px] p-7 flex flex-col gap-6 z-10">
              <div className="flex items-center gap-6 pb-6 border-b border-white/10">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#e0ab45] to-[#a8741c] flex items-center justify-center font-bold text-3xl text-[#1a1409]">
                  {playerNickname.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="cn text-3xl font-bold text-white">{playerNickname}</div>
                  <div className="mut text-xs mt-1 font-mono">
                    {currentUser ? `Связано с аккаунтом: ${currentUser.email || currentUser.displayName}` : 'Гостевой локальный профиль (P2P)'}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#9ac985]">
                    <span className="w-2 h-2 rounded-full bg-[#7fbf6a]" />
                    <span>Степной Тракт 2D · Готов к рейсу</span>
                  </div>
                </div>
              </div>

              <div className="max-w-md">
                <label className="text-xs text-[#a29e93] mb-1.5 block font-mono">Изменить игровой позывной (Nickname)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerNickname}
                    maxLength={20}
                    onChange={(e) => setPlayerNickname(e.target.value)}
                    className="flex-1 h-11 px-3.5 rounded-lg bg-white/[0.06] border border-white/10 text-white text-sm outline-none focus:border-[#c9922b]"
                  />
                  <button
                    onClick={() => {
                      onlineManager.setPlayerName(playerNickname);
                      setNicknameSavedFeedback(true);
                      setTimeout(() => setNicknameSavedFeedback(false), 2000);
                    }}
                    className="btn btn-p h-11 px-5"
                  >
                    {nicknameSavedFeedback ? <Check className="w-4 h-4 stroke-[3]" /> : 'Сохранить'}
                  </button>
                </div>
                {nicknameSavedFeedback && (
                  <span className="text-xs text-emerald-400 font-mono mt-1.5 block">Позывной успешно сохранен!</span>
                )}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
};
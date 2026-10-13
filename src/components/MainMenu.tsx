import React, { useState, useEffect } from 'react';
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
  Activity, 
  Trash2, 
  Radio, 
  WifiOff, 
  ArrowRight, 
  Search,
  Sparkles,
  Shield,
  Layers,
  Monitor
} from 'lucide-react';
import { SPAWN_LOCATIONS, SpawnLocation } from '../spawnLocations';
import { performanceConfig, savePerformanceConfig } from '../performanceConfig';
import { sound } from '../audio';
import { onlineManager } from '../onlineSystem';
import { 
  subscribeToP2PServers, 
  createP2PServerDoc, 
  P2PServerRoom, 
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
  const [playerNickname, setPlayerNickname] = useState<string>(onlineManager.localPlayerName);
  const [nicknameSavedFeedback, setNicknameSavedFeedback] = useState<boolean>(false);

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
        setSelectedServerId(fetched[0].id || '');
      }
    });
    return unsub;
  }, [selectedServerId]);

  // Filtered spawn locations
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
    }, 180);
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
  const selectedSave = saves.find(s => s.id === selectedSaveId) || saves[0] || null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0d0e10] text-[#e9e6df] font-sans select-none flex flex-col justify-between">
      {/* Universal Responsive Styles */}
      <style>{`
        .cn {
          font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          letter-spacing: .06em;
        }
        .mut { color: #a29e93; }
        .chip {
          display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px; border-radius: 8px;
          background: rgba(22,22,24,.8); border: 1px solid rgba(255,255,255,.09); transition: all .15s;
          cursor: pointer;
        }
        .chip:hover { filter: brightness(1.2); border-color: rgba(201,146,43,.5); }
        .panel {
          background: rgba(20,20,22,.88); border: 1px solid rgba(255,255,255,.09); border-radius: 12px;
        }
        .menu-i {
          display: flex; align-items: center; gap: 10px; min-height: 38px; padding: 6px 12px;
          border-left: 3px solid transparent; font-size: 15px; font-weight: 600; color: #cfcbc1; width: 100%;
          border-radius: 0 8px 8px 0;
          transition: all .15s; cursor: pointer; text-align: left;
        }
        @media (min-width: 640px) {
          .menu-i {
            min-height: 48px; padding: 10px 16px; font-size: 18px; gap: 14px;
          }
        }
        .menu-i:hover {
          background: rgba(255,255,255,.06); color: #fff; border-left-color: rgba(201,146,43,.8); padding-left: 16px;
        }
        .nav-i {
          display: flex; align-items: center; height: 42px; padding: 0 14px;
          border-left: 3px solid transparent; font-size: 15px; font-weight: 600; color: #cfcbc1; width: 100%;
          border-radius: 0 6px 6px 0;
          transition: all .15s; cursor: pointer; text-align: left;
        }
        .nav-i:hover { background: rgba(255,255,255,.05); padding-left: 18px; }
        .nav-on { background: rgba(201,146,43,.18); border-left-color: #c9922b; color: #fff; }
        .pill-btn {
          display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border-radius: 16px;
          background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); font-size: 12px; cursor: pointer; transition: all .15s;
        }
        .pill-btn:hover { background: rgba(255,255,255,.12); }
        .pill-btn-on { background: rgba(201,146,43,.25); border-color: rgba(201,146,43,.7); color: #f0c264; font-weight: 600; }
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px;
          border-radius: 8px; font-weight: 600; font-size: 13px; transition: all .15s; cursor: pointer;
        }
        .btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .btn-p { background: #c9922b; color: #1a1409; font-weight: 700; }
        .btn-s { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); color: #e9e6df; }
        .card {
          display: block; width: 100%; border-radius: 10px; background: rgba(20,20,22,.86);
          border: 1px solid rgba(255,255,255,.09); transition: all .15s; cursor: pointer; text-align: left;
        }
        .card:hover { transform: translateY(-2px); border-color: rgba(201,146,43,.6); }
        .card-on { border-color: #c9922b; box-shadow: 0 0 0 1px #c9922b, 0 8px 24px rgba(201,146,43,.2); }
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
        .seg { display: flex; border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,.14); }
        .seg > button {
          flex: 1; display: flex; align-items: center; justify-content: center; height: 34px; padding: 0 8px;
          font-size: 12px; font-weight: 600; background: rgba(255,255,255,.04); border-left: 1px solid rgba(255,255,255,.1);
          color: #cfcbc1; cursor: pointer; transition: all .15s;
        }
        .seg > button:first-child { border-left: 0; }
        .seg > button.on { background: #c9922b; color: #1a1409; font-weight: 700; }
        .key {
          display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 22px; padding: 0 6px;
          border-radius: 4px; border: 1px solid rgba(255,255,255,.2); font-size: 11px; font-weight: 600; margin-right: 6px;
        }
        .row-hover {
          display: grid; grid-template-columns: 20px 1fr auto; align-items: center; gap: 10px;
          width: 100%; min-height: 48px; padding: 8px 12px; border-left: 3px solid transparent; border-bottom: 1px solid rgba(255,255,255,.05);
          transition: background .15s; cursor: pointer; text-align: left;
        }
        @media (min-width: 640px) {
          .row-hover {
            grid-template-columns: 24px 1fr auto auto 24px; gap: 12px; padding: 8px 14px;
          }
        }
        .row-hover:hover { background: rgba(255,255,255,.05); }
        .row-on { background: rgba(201,146,43,.15); border-left-color: #c9922b; }
      `}</style>

      {/* Atmospheric Landscape Backdrop (Fixed, non-interfering) */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#14120e] via-[#241c14] to-[#0f0d0a] z-0" />
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(900px 520px at 70% 82%, rgba(201,146,43,0.22), transparent 65%)'
        }}
      />
      <svg className="fixed left-0 bottom-0 w-full h-[50vh] pointer-events-none opacity-40 z-0" viewBox="0 0 1760 600" preserveAspectRatio="none">
        <path d="M0 440 180 320 330 400 520 230 700 380 880 270 1080 400 1260 300 1440 390 1600 320 1760 400V600H0Z" fill="#241a10" />
      </svg>
      <svg className="fixed left-0 bottom-0 w-full h-[35vh] pointer-events-none opacity-60 z-0" viewBox="0 0 1760 400" preserveAspectRatio="none">
        <path d="M0 240 220 150 420 230 640 130 860 250 1060 170 1260 260 1440 190 1600 240 1760 180V400H0Z" fill="#140f09" />
      </svg>

      {/* Main Responsive Container */}
      <div className="relative z-10 w-full max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12 py-3 sm:py-6 flex flex-col h-full justify-between gap-3 overflow-hidden">
        
        {/* TOP HEADER BAR */}
        <header className="w-full flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#c9922b] flex items-center justify-center -skew-x-6 shadow-[0_0_12px_rgba(201,146,43,0.4)]">
              <div className="w-3.5 h-3.5 bg-[#c9922b]" />
            </div>
            <div>
              <span className="cn text-base sm:text-lg font-bold text-white tracking-wider">СТЕПНОЙ ТРАКТ 2D</span>
              <div className="text-[10px] text-[#a29e93] font-mono tracking-widest uppercase hidden sm:block">
                СИМУЛЯТОР ОТКРЫТОГО МИРА
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => go('notif')}
              className="chip"
              title="Статус системы"
            >
              <Activity className="w-4 h-4 text-[#c9922b]" />
              <span className="mut text-xs font-mono font-bold hidden sm:inline">СИСТЕМА</span>
            </button>
            <button 
              onClick={() => go('account')}
              className="chip"
            >
              <span className="w-5 h-5 rounded-full bg-[#c9922b] text-[#1a1409] inline-flex items-center justify-center font-bold text-xs">
                {playerNickname.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium text-xs sm:text-sm text-white max-w-[120px] truncate">{playerNickname}</span>
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* SCREEN 1: MAIN MENU (RESPONSIVE FLUID DASHBOARD) */}
        {/* ========================================================= */}
        {cur === 'main' && (
          <main className="my-auto py-6 sm:py-8 w-full flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-10 items-start w-full">
              
              {/* Left Column: Navigation Buttons */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                {saves.length > 0 ? (
                  <button 
                    onClick={() => {
                      if (saves[0]) onLoadSave(saves[0].id);
                      else onResume();
                    }}
                    className="menu-i cn bg-[rgba(201,146,43,0.18)] border-l-[#c9922b] text-white flex-col items-start justify-center gap-0.5 min-h-[52px] sm:min-h-[68px]"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-[#e0ab45]" />
                      <span className="text-lg sm:text-2xl">Продолжить</span>
                    </div>
                    <span className="mut font-normal text-[11px] sm:text-xs font-sans normal-case tracking-normal pl-6 sm:pl-7 truncate max-w-[340px]">
                      «{saves[0].name}» — {saves[0].date}
                    </span>
                  </button>
                ) : (
                  <button 
                    onClick={onResume}
                    className="menu-i cn bg-[rgba(201,146,43,0.18)] border-l-[#c9922b] text-white flex-col items-start justify-center gap-0.5 min-h-[52px] sm:min-h-[68px]"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-[#e0ab45]" />
                      <span className="text-lg sm:text-2xl">В игру</span>
                    </div>
                    <span className="mut font-normal text-[11px] sm:text-xs font-sans normal-case tracking-normal pl-6 sm:pl-7">
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
                  <span>Онлайн-серверы ({servers.length})</span>
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

              {/* Right Column: Dynamic Status & Info Panels */}
              <div className="flex flex-col gap-4 w-full">
                
                {/* Save Slot Card */}
                <div className="panel p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="cn text-xs font-bold text-[#c9922b] flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      <span>{saves.length > 0 ? 'АКТИВНЫЙ СЛОТ СОХРАНЕНИЯ' : 'СОХРАНЕНИЯ МИРА'}</span>
                    </span>
                    <span className="mut text-xs font-mono">{saves.length} слот(ов)</span>
                  </div>

                  {saves.length > 0 ? (
                    <div className="pt-3.5 flex flex-col gap-3">
                      <div className="cn text-xl sm:text-2xl font-bold text-white truncate">{saves[0].name}</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono text-[#cfcbc1] bg-white/[0.03] p-3 rounded-lg border border-white/5">
                        <div>
                          <span className="text-[#a29e93] block text-[11px]">Локация:</span>
                          <span className="font-semibold text-white truncate block">{saves[0].streetName || 'Степной Тракт'}</span>
                        </div>
                        <div>
                          <span className="text-[#a29e93] block text-[11px]">Запись:</span>
                          <span className="font-semibold text-white truncate block">{saves[0].date.split(' в ')[0]}</span>
                        </div>
                        <div>
                          <span className="text-[#a29e93] block text-[11px]">Позиция:</span>
                          <span className="font-semibold text-white">{saves[0].isInVehicle ? 'В авто' : 'Пешком'}</span>
                        </div>
                        <div>
                          <span className="text-[#a29e93] block text-[11px]">Капитал:</span>
                          <span className="font-semibold text-[#7fbf6a]">
                            {saves[0].cash !== undefined ? `${saves[0].cash.toLocaleString()} ₽` : '0 ₽'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => onLoadSave(saves[0].id)}
                        className="btn btn-p w-full"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Загрузить последнее сохранение</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-3.5 flex flex-col gap-2">
                      <div className="cn text-xl font-bold text-white">Степной Тракт — 48 км открытых дорог</div>
                      <p className="text-xs text-[#a29e93] leading-relaxed">
                        Единый бесшовный мир с симуляцией софтбоди Node-Beam, живым трафиком, сетью АЗС, магазинами и поездами РЖД.
                      </p>
                      <button 
                        onClick={() => go('new')}
                        className="btn btn-p w-full mt-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Создать первую сессию</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Online P2P Multiplayer Card */}
                <button 
                  onClick={() => go('servers')}
                  className="panel p-5 block text-left cursor-pointer hover:border-[rgba(201,146,43,0.5)] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="cn text-xs font-bold text-[#c9922b] flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>МУЛЬТИПЛЕЕР (P2P FIRESTORE)</span>
                    </span>
                    <span className={`text-xs font-mono font-bold ${servers.length > 0 ? 'text-[#7fbf6a]' : 'text-[#a29e93]'}`}>
                      {servers.length > 0 ? 'СЕРВЕРЫ В СЕТИ' : 'КОМНАТА P2P'}
                    </span>
                  </div>
                  <div className="cn text-2xl sm:text-3xl font-bold mt-2 text-white">
                    {servers.length} {servers.length === 1 ? 'АКТИВНЫЙ СЕРВЕР' : servers.length > 1 && servers.length < 5 ? 'АКТИВНЫХ СЕРВЕРА' : 'АКТИВНЫХ СЕРВЕРОВ'}
                  </div>
                  <p className="mut text-xs mt-1 font-mono">
                    {servers.length > 0 
                      ? 'Нажмите для просмотра комнат и прямого подключения' 
                      : 'Создайте свою комнату или подключитесь по коду сессии друга'}
                  </p>
                </button>

              </div>

            </div>
          </main>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: NEW SESSION (REAL WORLD SPAWN SELECTION) */}
        {/* ========================================================= */}
        {cur === 'new' && (
          <div className="py-4 flex-1 flex flex-col min-h-0 gap-4">
            {/* Sub-header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => go('main', true)} className="chip" title="Назад">
                  <ChevronLeft className="w-4 h-4 text-white" />
                  <span className="text-xs">Назад</span>
                </button>
                <div>
                  <h2 className="cn text-xl sm:text-2xl font-bold text-white">Новая сессия</h2>
                  <p className="mut text-xs font-mono">Выбор стартовой локации в едином открытом мире</p>
                </div>
              </div>
            </div>

            {/* Categories filter */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 shrink-0">
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

            {/* Content: Location Cards + Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 items-start">
              
              {/* Left Locations Grid */}
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto max-h-[56vh] lg:max-h-[64vh] pr-1.5">
                  {filteredSpawnLocations.map((loc) => {
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
                            <span className="mut text-[10px] font-mono">
                              X:{Math.round(loc.x)} | Y:{Math.round(loc.y)}
                            </span>
                          </div>
                          <div className="cn text-base font-bold text-white line-clamp-1">{loc.nameRu}</div>
                          <p className="mut text-xs mt-1 line-clamp-2 leading-relaxed">{loc.description}</p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                          <span className="text-[#a29e93] capitalize">{loc.category || 'мир'}</span>
                          {isSelected && <span className="text-[#e0ab45] font-bold">Выбрано</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Configuration Panel */}
              <div className="lg:col-span-5 xl:col-span-4 panel p-5 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="p-2.5 bg-[#c9922b]/20 border border-[#c9922b]/40 rounded-xl text-[#c9922b] shrink-0">
                      {selectedSpawn.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="cn mut text-[11px]">Точка старта</div>
                      <div className="cn text-lg font-bold text-white truncate">{selectedSpawn.nameRu}</div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#a29e93] mb-1 block font-mono">Название сохранения</label>
                    <input
                      type="text"
                      value={newGameName}
                      onChange={(e) => setNewGameName(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-[#c9922b]/50 text-white text-sm outline-none focus:border-[#c9922b]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#a29e93] mb-1 block font-mono">Время суток</label>
                    <div className="seg">
                      <button onClick={() => setNewGameTimeHour(6.0)} className={newGameTimeHour === 6.0 ? 'on' : ''}>06:00</button>
                      <button onClick={() => setNewGameTimeHour(12.0)} className={newGameTimeHour === 12.0 ? 'on' : ''}>12:00</button>
                      <button onClick={() => setNewGameTimeHour(19.0)} className={newGameTimeHour === 19.0 ? 'on' : ''}>19:00</button>
                      <button onClick={() => setNewGameTimeHour(23.5)} className={newGameTimeHour === 23.5 ? 'on' : ''}>23:30</button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#a29e93] mb-1 block font-mono">Погода</label>
                    <div className="seg">
                      <button onClick={() => setNewGameWeather('clear')} className={newGameWeather === 'clear' ? 'on' : ''}>Ясно</button>
                      <button onClick={() => setNewGameWeather('overcast')} className={newGameWeather === 'overcast' ? 'on' : ''}>Пасмурно</button>
                      <button onClick={() => setNewGameWeather('rain')} className={newGameWeather === 'rain' ? 'on' : ''}>Дождь</button>
                      <button onClick={() => setNewGameWeather('fog')} className={newGameWeather === 'fog' ? 'on' : ''}>Туман</button>
                    </div>
                  </div>

                  <p className="text-xs font-mono text-[#a29e93] p-2.5 bg-white/[0.02] border border-white/5 rounded-lg leading-relaxed">
                    {selectedSpawn.description}
                  </p>
                </div>

                <button
                  onClick={() => {
                    onNewGame({
                      spawnId: selectedSpawn.id,
                      saveName: newGameName.trim() || 'Старт: ' + selectedSpawn.nameRu,
                      timeHour: newGameTimeHour,
                      weather: newGameWeather
                    });
                  }}
                  className="btn btn-p w-full h-11 text-base cursor-pointer mt-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Начать сессию</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: SAVES LIST (REAL LOCALSTORAGE SLOTS) */}
        {/* ========================================================= */}
        {cur === 'saves' && (
          <div className="py-4 flex-1 flex flex-col min-h-0 gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => go('main', true)} className="chip" title="Назад">
                  <ChevronLeft className="w-4 h-4 text-white" />
                  <span className="text-xs">Назад</span>
                </button>
                <div>
                  <h2 className="cn text-xl sm:text-2xl font-bold text-white">Список сохранений</h2>
                  <p className="mut text-xs font-mono">Архив реальных слотов в памяти браузера</p>
                </div>
              </div>
              <button 
                onClick={() => go('new')}
                className="chip bg-[#c9922b]/20 border-[#c9922b]/50 text-white"
              >
                <Plus className="w-4 h-4 text-[#e0ab45]" />
                <span className="font-semibold text-xs sm:text-sm">Новая сессия</span>
              </button>
            </div>

            {saves.length > 0 ? (
              <div className="flex-1 flex flex-col justify-between min-h-0 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 overflow-y-auto max-h-[60vh] pr-1.5">
                  {saves.map((save) => {
                    const isSelected = selectedSaveId === save.id;
                    return (
                      <button
                        key={save.id}
                        onClick={() => setSelectedSaveId(save.id)}
                        className={`card p-4 flex flex-col justify-between min-h-[140px] ${isSelected ? 'card-on' : ''}`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="cn text-xs font-bold text-[#c9922b] truncate max-w-[160px]">
                              {save.streetName || 'Степной Тракт'}
                            </span>
                            <span className="text-[10px] text-[#a29e93] font-mono">{save.date.split(' в ')[0]}</span>
                          </div>
                          <div className="cn text-lg font-bold text-white truncate">{save.name}</div>
                          
                          <div className="mt-2.5 flex flex-col gap-1 text-xs font-mono text-[#a29e93]">
                            <div className="flex justify-between">
                              <span>Позиция:</span>
                              <span className="text-white">{save.isInVehicle ? 'В авто' : 'Пешком'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Баланс:</span>
                              <span className="text-[#7fbf6a] font-semibold">{save.cash !== undefined ? `${save.cash.toLocaleString()} ₽` : '—'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
                          <span className="text-[#8f8b81]">{save.date.split(' в ')[1] ? `в ${save.date.split(' в ')[1]}` : ''}</span>
                          {isSelected && <span className="text-[#e0ab45] font-bold">Выбрано</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Actions bottom bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-white/10 shrink-0">
                  <div className="mut text-xs font-mono flex items-center gap-2">
                    <span>Выбран слот:</span>
                    <span className="text-white font-bold">{selectedSave ? selectedSave.name : '—'}</span>
                  </div>

                  <div className="flex gap-2.5 w-full sm:w-auto">
                    {selectedSave && (
                      <button 
                        onClick={() => {
                          if (confirm(`Удалить сохранение «${selectedSave.name}»?`)) {
                            onDeleteSave(selectedSave.id);
                          }
                        }}
                        className="btn btn-s text-rose-400 hover:text-rose-300 border-rose-900/40 text-xs flex-1 sm:flex-none"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Удалить</span>
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (selectedSave) onLoadSave(selectedSave.id);
                      }}
                      disabled={!selectedSave}
                      className="btn btn-p disabled:opacity-50 text-xs flex-1 sm:flex-none"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Загрузить сохранение</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="panel flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center my-auto">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#c9922b] mb-3">
                  <FolderOpen className="w-7 h-7" />
                </div>
                <h3 className="cn text-xl sm:text-2xl font-bold text-white">Сохраненных сессий пока нет</h3>
                <p className="mut text-xs max-w-sm mt-1.5 leading-relaxed">
                  Начните новую игру, чтобы исследовать мир. Сохранение доступно в любой момент через меню паузы [Esc].
                </p>
                <button onClick={() => go('new')} className="btn btn-p mt-5">
                  <Plus className="w-4 h-4" />
                  <span>Создать первую сессию</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 4: SERVERS (FIRESTORE P2P MULTIPLAYER) */}
        {/* ========================================================= */}
        {cur === 'servers' && (
          <div className="py-4 flex-1 flex flex-col min-h-0 gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => go('main', true)} className="chip" title="Назад">
                  <ChevronLeft className="w-4 h-4 text-white" />
                  <span className="text-xs">Назад</span>
                </button>
                <div>
                  <h2 className="cn text-xl sm:text-2xl font-bold text-white">Онлайн-мультиплеер P2P</h2>
                  <p className="mut text-xs font-mono">Список открытых серверов в реальном времени</p>
                </div>
              </div>
              <button onClick={() => go('create')} className="chip bg-[#c9922b]/20 border-[#c9922b]/50 text-white">
                <Plus className="w-4 h-4 text-[#e0ab45]" />
                <span className="font-semibold text-xs sm:text-sm">Создать сервер</span>
              </button>
            </div>

            {/* Search & Direct Code Join Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#a29e93]" />
                <input
                  type="text"
                  value={serverSearchQuery}
                  onChange={(e) => setServerSearchQuery(e.target.value)}
                  placeholder="Поиск по названию или хосту..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.06] border border-white/10 text-white text-xs outline-none focus:border-[#c9922b]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={directRoomCode}
                  onChange={(e) => setDirectRoomCode(e.target.value)}
                  placeholder="Код комнаты..."
                  className="w-36 sm:w-48 h-9 px-3 rounded-lg bg-white/[0.06] border border-white/10 text-white text-xs outline-none font-mono focus:border-[#c9922b]"
                />
                <button
                  onClick={() => handleConnectToServer(directRoomCode)}
                  disabled={!directRoomCode.trim()}
                  className="btn btn-s h-9 px-3 text-xs font-mono disabled:opacity-40 whitespace-nowrap"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Войти</span>
                </button>
              </div>
            </div>

            {/* Layout: Server list table + Details panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 items-start">
              
              {/* Left Server List */}
              <div className="lg:col-span-7 xl:col-span-8 panel overflow-hidden flex flex-col max-h-[58vh]">
                <div className="grid grid-cols-[20px_1fr_auto] sm:grid-cols-[24px_1fr_auto_auto_24px] items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 h-9 border-b border-white/10 text-xs font-mono text-[#8f8b81] shrink-0">
                  <span />
                  <span>Название и хост</span>
                  <span className="hidden sm:inline">Режим</span>
                  <span>Игроки</span>
                  <span className="hidden sm:inline" />
                </div>

                <div className="overflow-y-auto flex-1">
                  {filteredServers.length > 0 ? (
                    filteredServers.map((srv) => {
                      const isSelected = selectedServer?.id === srv.id;
                      return (
                        <div
                          key={srv.id}
                          onClick={() => setSelectedServerId(srv.id || '')}
                          className={`row-hover ${isSelected ? 'row-on' : ''}`}
                        >
                          <Radio className={`w-3.5 h-3.5 ${srv.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`} />
                          <div className="truncate min-w-0">
                            <div className="font-semibold text-white truncate text-xs sm:text-sm">{srv.name}</div>
                            <div className="mut text-[11px] font-mono truncate">Хост: {srv.hostName} · Код: {srv.peerId}</div>
                          </div>
                          <span className="hidden sm:inline text-xs text-[#cfcbc1] truncate capitalize">
                            {srv.gameMode === 'free_roam' ? 'Свободная езда' : srv.gameMode}
                          </span>
                          <span className="text-xs font-mono text-[#cfcbc1] whitespace-nowrap">{srv.currentPlayers || 1} / {srv.maxPlayers || 8}</span>
                          <span className="hidden sm:inline"><ArrowRight className="w-3.5 h-3.5 text-[#a29e93]" /></span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center my-auto">
                      <WifiOff className="w-8 h-8 text-[#a29e93] mb-2" />
                      <div className="cn text-base font-bold text-white">В данный момент нет открытых серверов</div>
                      <p className="mut text-xs max-w-sm mt-1">
                        Создайте свою комнату или подключитесь по коду сессии друга.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Server Details */}
              <div className="lg:col-span-5 xl:col-span-4 panel p-5 flex flex-col justify-between gap-4">
                {selectedServer ? (
                  <>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-mono text-[#c9922b]">
                        <Radio className="w-3.5 h-3.5 text-emerald-400" />
                        <span>АКТИВНАЯ СЕССИЯ FIRESTORE</span>
                      </div>

                      <div className="cn text-xl font-bold text-white">{selectedServer.name}</div>
                      <div className="text-xs font-mono text-[#a29e93]">
                        Прямой P2P-канал по протоколу WebRTC / PeerJS
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white/[0.03] p-3 rounded-lg border border-white/5">
                        <div>
                          <div className="mut text-[11px]">Хост:</div>
                          <div className="text-white font-medium truncate">{selectedServer.hostName}</div>
                        </div>
                        <div>
                          <div className="mut text-[11px]">Код комнаты:</div>
                          <div className="text-white font-medium truncate">{selectedServer.peerId}</div>
                        </div>
                        <div>
                          <div className="mut text-[11px]">Карта:</div>
                          <div className="text-white font-medium truncate">{selectedServer.mapName || 'Степной Тракт'}</div>
                        </div>
                        <div>
                          <div className="mut text-[11px]">Режим:</div>
                          <div className="text-white font-medium capitalize truncate">
                            {selectedServer.gameMode === 'free_roam' ? 'Свободная езда' : selectedServer.gameMode}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
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

                    <button 
                      onClick={() => handleConnectToServer(selectedServer.peerId)}
                      className="btn btn-p w-full h-11"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Подключиться к серверу</span>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center my-auto">
                    <Globe className="w-10 h-10 text-[#a29e93]/40 mb-2" />
                    <div className="cn text-base font-bold text-white">Выберите сервер</div>
                    <p className="mut text-xs mt-1">
                      Выберите сервер слева или создайте свой.
                    </p>
                    <button onClick={() => go('create')} className="btn btn-p mt-4 text-xs">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Создать сервер</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 5: CREATE SERVER FORM */}
        {/* ========================================================= */}
        {cur === 'create' && (
          <div className="py-4 flex-1 flex flex-col min-h-0 gap-4">
            <div className="flex items-center gap-3 pb-2 border-b border-white/10 shrink-0">
              <button onClick={() => go('servers', true)} className="chip" title="Назад">
                <ChevronLeft className="w-4 h-4 text-white" />
                <span className="text-xs">Назад</span>
              </button>
              <div>
                <h2 className="cn text-xl sm:text-2xl font-bold text-white">Создать игровой сервер</h2>
                <p className="mut text-xs font-mono">Хостинг открытой сессии мультиплеера</p>
              </div>
            </div>

            <div className="max-w-2xl mx-auto w-full panel p-6 sm:p-8 flex flex-col gap-4 my-auto">
              <div>
                <label className="text-xs text-[#a29e93] mb-1 block font-mono">Название сервера</label>
                <input
                  type="text"
                  value={hostServerName}
                  onChange={(e) => setHostServerName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg bg-white/[0.06] border border-[#c9922b]/60 text-white text-sm outline-none focus:border-[#c9922b]"
                />
              </div>

              <div>
                <label className="text-xs text-[#a29e93] mb-1 block font-mono">Код комнаты (для друзей)</label>
                <input
                  type="text"
                  value={hostRoomCode}
                  onChange={(e) => setHostRoomCode(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg bg-white/[0.06] border border-white/10 text-white text-sm outline-none font-mono focus:border-[#c9922b]"
                />
              </div>

              <div>
                <label className="text-xs text-[#a29e93] mb-1 block font-mono">Игровой режим</label>
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
                <div className="flex justify-between text-xs text-[#a29e93] mb-1 font-mono">
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

              <div className="flex gap-3 pt-3 border-t border-white/10 mt-2">
                <button onClick={() => go('servers', true)} className="btn btn-s flex-1">
                  Отмена
                </button>
                <button 
                  onClick={handleCreateAndHostServer} 
                  disabled={isCreatingServer}
                  className="btn btn-p flex-1"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isCreatingServer ? 'Регистрация...' : 'Запустить сервер'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 6: REAL SETTINGS */}
        {/* ========================================================= */}
        {cur === 'settings' && (
          <div className="py-4 flex-1 flex flex-col min-h-0 gap-4">
            <div className="flex items-center gap-3 pb-2 border-b border-white/10 shrink-0">
              <button onClick={() => go('main', true)} className="chip" title="Назад">
                <ChevronLeft className="w-4 h-4 text-white" />
                <span className="text-xs">Назад</span>
              </button>
              <div>
                <h2 className="cn text-xl sm:text-2xl font-bold text-white">Параметры симуляции</h2>
                <p className="mut text-xs font-mono">Реальная конфигурация физики, графики и звука</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 items-start">
              
              {/* Category tabs */}
              <div className="md:col-span-3 flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 shrink-0">
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

              {/* Settings Controls Panel */}
              <div className="md:col-span-9 panel p-5 sm:p-6 overflow-y-auto max-h-[64vh] flex flex-col gap-4">
                
                {/* Graphics */}
                {settingsTab === 'set-gfx' && (
                  <>
                    <div className="cn text-xs text-[#e0ab45] font-bold">Рендеринг и детализация</div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                      <div>
                        <div className="font-medium text-sm text-white">Режим оптимизации (Low Quality)</div>
                        <div className="text-xs text-[#a29e93]">Отключение мелких декоративных линий для слабых устройств</div>
                      </div>
                      <button 
                        onClick={() => handleUpdatePerf({ lowQualityRendering: !perfConfig.lowQualityRendering })} 
                        className={`tg ${perfConfig.lowQualityRendering ? 'on' : ''}`} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                      <div>
                        <div className="font-medium text-sm text-white">Динамические тени (Shadows)</div>
                        <div className="text-xs text-[#a29e93]">Тени от зданий, автомобилей и деревьев</div>
                      </div>
                      <button 
                        onClick={() => handleUpdatePerf({ enableShadows: !perfConfig.enableShadows })} 
                        className={`tg ${perfConfig.enableShadows ? 'on' : ''}`} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                      <div>
                        <div className="font-medium text-sm text-white">Капли дождя на лобовом стекле / экране</div>
                        <div className="text-xs text-[#a29e93]">Анимированные брызги воды при осадках</div>
                      </div>
                      <button 
                        onClick={() => handleUpdatePerf({ enableRainDroplets: !perfConfig.enableRainDroplets })} 
                        className={`tg ${perfConfig.enableRainDroplets ? 'on' : ''}`} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                      <div>
                        <div className="font-medium text-sm text-white">Мини-карта (HUD Радар)</div>
                        <div className="text-xs text-[#a29e93]">Отображение радара с дорожной разметкой</div>
                      </div>
                      <button 
                        onClick={() => handleUpdatePerf({ enableMinimap: !perfConfig.enableMinimap })} 
                        className={`tg ${perfConfig.enableMinimap ? 'on' : ''}`} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                      <div>
                        <div className="font-medium text-sm text-white">Лимит частиц дыма, пара и огня</div>
                        <div className="text-xs text-[#a29e93]">Максимальное число частиц физических повреждений</div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-64">
                        <input 
                          type="range" 
                          min="100" 
                          max="600" 
                          step="50"
                          value={perfConfig.particleLimit}
                          onChange={(e) => handleUpdatePerf({ particleLimit: Number(e.target.value) })}
                          className="flex-1 accent-[#c9922b]"
                        />
                        <span className="text-xs font-mono font-bold w-10 text-right">{perfConfig.particleLimit}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                      <div>
                        <div className="font-medium text-sm text-white">Плотность ИИ-автомобилей в трафике</div>
                        <div className="text-xs text-[#a29e93]">Количество симулируемых машин в активной зоне</div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-64">
                        <input 
                          type="range" 
                          min="5" 
                          max="45" 
                          step="1"
                          value={perfConfig.maxVehicles}
                          onChange={(e) => handleUpdatePerf({ maxVehicles: Number(e.target.value) })}
                          className="flex-1 accent-[#c9922b]"
                        />
                        <span className="text-xs font-mono font-bold w-10 text-right">{perfConfig.maxVehicles}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Sound */}
                {settingsTab === 'set-sound' && (
                  <>
                    <div className="cn text-xs text-[#e0ab45] font-bold">Процедурный синтез звука (Web Audio API)</div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                      <div>
                        <div className="font-medium text-sm text-white">Общий звук симулятора</div>
                        <div className="text-xs text-[#a29e93]">Включение / отключение всех аудиоканалов</div>
                      </div>
                      <button 
                        onClick={() => {
                          const res = sound.toggleMute();
                          setAudioMuted(res);
                        }} 
                        className={`tg ${!audioMuted ? 'on' : ''}`} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                      <div>
                        <div className="font-medium text-sm text-white">Общая громкость (Master Volume)</div>
                        <div className="text-xs text-[#a29e93]">Мастер-уровень звукового тракта</div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-64">
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
                        <span className="text-xs font-mono font-bold w-10 text-right">{masterVol}%</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                      <div>
                        <div className="font-medium text-sm text-white">Громкость двигателя (Engine Layer)</div>
                        <div className="text-xs text-[#a29e93]">Синтез поршневых импульсов, резонанса выхлопа и турбины</div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-64">
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
                        <span className="text-xs font-mono font-bold w-10 text-right">{engineVol}%</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Controls */}
                {settingsTab === 'set-ctrl' && (
                  <>
                    <div className="cn text-xs text-[#e0ab45] font-bold">Раскладка управления</div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                      <div>
                        <div className="font-medium text-sm text-white">Чувствительность обзора мыши</div>
                        <div className="text-xs text-[#a29e93]">Скорость вращения прицела</div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-64">
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2.5" 
                          step="0.1"
                          value={localSettings.mouseSensitivity}
                          onChange={(e) => handleUpdateGameplaySettings({ mouseSensitivity: Number(e.target.value) })}
                          className="flex-1 accent-[#c9922b]"
                        />
                        <span className="text-xs font-mono font-bold w-10 text-right">{localSettings.mouseSensitivity.toFixed(1)}x</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 text-xs font-mono">
                      <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex flex-col gap-2">
                        <div className="text-[#c9922b] font-bold pb-1 border-b border-white/10 uppercase">Автомобиль</div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Газ / Тормоз</span><span className="text-white font-bold">[W] / [S]</span></div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Руление</span><span className="text-white font-bold">[A] / [D]</span></div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Ручной тормоз</span><span className="text-white font-bold">[Пробел]</span></div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Свет фар</span><span className="text-white font-bold">[L]</span></div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Клаксон</span><span className="text-white font-bold">[H]</span></div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Поворотники</span><span className="text-white font-bold">[Q] / [Z]</span></div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Аварийка</span><span className="text-white font-bold">[X]</span></div>
                      </div>

                      <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex flex-col gap-2">
                        <div className="text-[#c9922b] font-bold pb-1 border-b border-white/10 uppercase">Персонаж & Мир</div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Действие / Сесть</span><span className="text-white font-bold">[E]</span></div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Инвентарь</span><span className="text-white font-bold">[Tab]</span></div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Осмотр тела</span><span className="text-white font-bold">[F]</span></div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Карта (GPS)</span><span className="text-white font-bold">[M]</span></div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Сетка BeamNG</span><span className="text-white font-bold">[G]</span></div>
                        <div className="flex justify-between"><span className="text-[#a29e93]">Меню паузы</span><span className="text-white font-bold">[Esc]</span></div>
                      </div>
                    </div>
                  </>
                )}

                {/* Gameplay */}
                {settingsTab === 'set-game' && (
                  <>
                    <div className="cn text-xs text-[#e0ab45] font-bold">Игровой процесс и время</div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                      <div>
                        <div className="font-medium text-sm text-white">Интервал автосохранения</div>
                        <div className="text-xs text-[#a29e93]">Периодическая фоновая запись мира</div>
                      </div>
                      <div className="seg w-full sm:w-64">
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

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                      <div>
                        <div className="font-medium text-sm text-white">Автоматический суточный ход времени</div>
                        <div className="text-xs text-[#a29e93]">Смена дня, заката, ночи и рассвета</div>
                      </div>
                      <button 
                        onClick={() => handleUpdateGameplaySettings({ timeAutoCycle: !localSettings.timeAutoCycle })} 
                        className={`tg ${localSettings.timeAutoCycle ? 'on' : ''}`} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                      <div>
                        <div className="font-medium text-sm text-white">Целевой лимит кадров (FPS Cap)</div>
                        <div className="text-xs text-[#a29e93]">Ограничение частоты кадров для энергосбережения</div>
                      </div>
                      <div className="seg w-full sm:w-64">
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
                  </>
                )}

              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 7: SYSTEM TELEMETRY */}
        {/* ========================================================= */}
        {cur === 'notif' && (
          <div className="py-4 flex-1 flex flex-col min-h-0 gap-4">
            <div className="flex items-center gap-3 pb-2 border-b border-white/10 shrink-0">
              <button onClick={() => go('main', true)} className="chip" title="Назад">
                <ChevronLeft className="w-4 h-4 text-white" />
                <span className="text-xs">Назад</span>
              </button>
              <div>
                <h2 className="cn text-xl sm:text-2xl font-bold text-white">Статус симуляции и служб</h2>
                <p className="mut text-xs font-mono">Телеметрия подсистем движка</p>
              </div>
            </div>

            <div className="max-w-2xl mx-auto w-full flex flex-col gap-3 my-auto">
              <div className="panel p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Физический движок Node-Beam (BeamNG 2D)</div>
                    <div className="mut text-xs font-mono">Софтбоди деформация кузова активна (60 Гц)</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded">
                  ОНЛАЙН
                </span>
              </div>

              <div className="panel p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Сетевой протокол P2P (PeerJS / WebRTC)</div>
                    <div className="mut text-xs font-mono">Статус: {onlineManager.status}</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/40 border border-sky-500/30 px-2.5 py-1 rounded">
                  {onlineManager.status.toUpperCase()}
                </span>
              </div>

              <div className="panel p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Хранилище сохранений (LocalStorage)</div>
                    <div className="mut text-xs font-mono">{saves.length} слот(ов) сохранений мира</div>
                  </div>
                </div>
                <button onClick={() => go('saves')} className="btn btn-s text-xs h-8 px-3">
                  Слоты
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 8: ACCOUNT PROFILE */}
        {/* ========================================================= */}
        {cur === 'account' && (
          <div className="py-4 flex-1 flex flex-col min-h-0 gap-4">
            <div className="flex items-center gap-3 pb-2 border-b border-white/10 shrink-0">
              <button onClick={() => go('main', true)} className="chip" title="Назад">
                <ChevronLeft className="w-4 h-4 text-white" />
                <span className="text-xs">Назад</span>
              </button>
              <div>
                <h2 className="cn text-xl sm:text-2xl font-bold text-white">Профиль игрока</h2>
                <p className="mut text-xs font-mono">Позывной и синхронизация</p>
              </div>
            </div>

            <div className="max-w-2xl mx-auto w-full panel p-6 sm:p-8 flex flex-col gap-5 my-auto">
              <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-[#e0ab45] to-[#a8741c] flex items-center justify-center font-bold text-2xl text-[#1a1409]">
                  {playerNickname.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="cn text-2xl font-bold text-white truncate">{playerNickname}</div>
                  <div className="mut text-xs mt-0.5 font-mono truncate">
                    {currentUser ? `Связано: ${currentUser.email || currentUser.displayName}` : 'Гостевой профиль (P2P)'}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-[#9ac985]">
                    <span className="w-2 h-2 rounded-full bg-[#7fbf6a]" />
                    <span>Степной Тракт 2D · Готов к рейсу</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#a29e93] mb-1.5 block font-mono">Изменить позывной (Nickname)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerNickname}
                    maxLength={20}
                    onChange={(e) => setPlayerNickname(e.target.value)}
                    className="flex-1 h-10 px-3.5 rounded-lg bg-white/[0.06] border border-white/10 text-white text-sm outline-none focus:border-[#c9922b]"
                  />
                  <button
                    onClick={() => {
                      onlineManager.setPlayerName(playerNickname);
                      setNicknameSavedFeedback(true);
                      setTimeout(() => setNicknameSavedFeedback(false), 2000);
                    }}
                    className="btn btn-p h-10 px-4 text-xs font-bold"
                  >
                    {nicknameSavedFeedback ? <Check className="w-4 h-4 stroke-[3]" /> : 'Сохранить'}
                  </button>
                </div>
                {nicknameSavedFeedback && (
                  <span className="text-xs text-emerald-400 font-mono mt-1 block">Позывной успешно сохранен!</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM HINTS FOOTER */}
        <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-white/10 shrink-0 text-xs font-mono text-[#a29e93]">
          <div className="flex items-center">
            <span className="key">Esc</span>В игру
            <span className="key ml-3">Enter</span>Выбрать
          </div>
          <div>СТЕПНОЙ ТРАКТ 2D · РЕЖИМ СИМУЛЯЦИИ</div>
        </footer>

      </div>
    </div>
  );
};
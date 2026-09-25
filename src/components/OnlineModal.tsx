import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  Users, 
  Wifi, 
  WifiOff, 
  Copy, 
  Check, 
  X, 
  Car, 
  User, 
  Sparkles, 
  Shuffle, 
  LogOut, 
  Radio, 
  ShieldCheck, 
  MessageSquare,
  Plus,
  Search,
  Filter,
  Tag,
  Server,
  Play,
  Crown,
  Map
} from 'lucide-react';
import { onlineManager, OnlineStatus } from '../onlineSystem';
import { sound } from '../audio';
import { CAR_CONFIGS } from '../vehicleHelpers';
import { 
  auth, 
  subscribeToP2PServers, 
  createP2PServerDoc, 
  updateP2PServerHeartbeat, 
  removeP2PServerDoc, 
  P2PServerRoom 
} from '../firebase';

interface OnlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVehicleId?: string | null;
  onOpenFriends?: () => void;
}

const GAME_MODES = [
  { id: 'free_roam', name: 'Свободная Езда' },
  { id: 'street_race', name: 'Стрит-Рейсинг' },
  { id: 'delivery', name: 'Грузоперевозки' },
  { id: 'drift', name: 'Дрифт Движ' }
];

const MAP_NAMES = [
  { id: 'metropolis', name: 'Мегаполис' },
  { id: 'steppe_highway', name: 'Степное Шоссе' },
  { id: 'industrial', name: 'Промзона' }
];

export const OnlineModal: React.FC<OnlineModalProps> = ({ isOpen, onClose, onOpenFriends }) => {
  const [status, setStatus] = useState<OnlineStatus>(onlineManager.status);
  const [errorMessage, setErrorMessage] = useState<string | null>(onlineManager.errorMessage);
  const [roomCode, setRoomCode] = useState<string>(onlineManager.roomCode || 'metropolis-1');
  const [nickname, setNickname] = useState<string>(onlineManager.localPlayerName);
  const [copied, setCopied] = useState<boolean>(false);
  const [, setTick] = useState<number>(0);

  // Firestore P2P Server List States
  const [viewMode, setViewMode] = useState<'server_browser' | 'create_server' | 'direct_code'>('server_browser');
  const [servers, setServers] = useState<P2PServerRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<string>('all');
  
  // Host Server Form States
  const [serverName, setServerName] = useState<string>('Сервер ' + (auth.currentUser?.displayName || 'Пилота'));
  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [selectedMap, setSelectedMap] = useState<string>('metropolis');
  const [selectedGameMode, setSelectedGameMode] = useState<string>('free_roam');

  const activeDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubOnline = onlineManager.subscribe(() => {
      setStatus(onlineManager.status);
      setErrorMessage(onlineManager.errorMessage);
      setTick((t) => t + 1);
    });

    const unsubFirestore = subscribeToP2PServers((fetchedServers) => {
      setServers(fetchedServers);
    });

    return () => {
      unsubOnline();
      unsubFirestore();
    };
  }, []);

  // Update heartbeat when connected as host
  useEffect(() => {
    let interval: any;
    if (status === 'connected' && onlineManager.isHost && activeDocIdRef.current) {
      interval = setInterval(() => {
        const count = onlineManager.getRemotePlayersArray().length + 1;
        updateP2PServerHeartbeat(activeDocIdRef.current!, count, 'active');
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [status]);

  if (!isOpen) return null;

  const handleRandomizeNick = () => {
    sound.playButtonPress();
    const prefixes = ['Гонщик', 'Пилот', 'Дрифтер', 'Механик', 'Шофер', 'Шериф', 'Сталкер', 'Турбо'];
    const randP = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randN = Math.floor(100 + Math.random() * 900);
    const newNick = `${randP}_${randN}`;
    setNickname(newNick);
    onlineManager.setPlayerName(newNick);
  };

  const handleSaveNick = (name: string) => {
    setNickname(name);
    onlineManager.setPlayerName(name);
  };

  const handleCreateServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playButtonPress();
    handleSaveNick(nickname);

    const generatedCode = `room-${Math.floor(1000 + Math.random() * 9000)}`;
    setRoomCode(generatedCode);

    // Join or create room locally in PeerJS
    onlineManager.joinOrCreateRoom(generatedCode, nickname, true);

    // Register P2P Server document in Firestore!
    try {
      const docId = await createP2PServerDoc({
        hostUid: auth.currentUser?.uid || 'anon',
        hostName: nickname,
        name: serverName.trim() || 'P2P Сервер',
        peerId: generatedCode,
        maxPlayers,
        currentPlayers: 1,
        mapName: selectedMap,
        gameMode: selectedGameMode,
        isPrivate: false,
        status: 'active'
      });
      activeDocIdRef.current = docId;
    } catch (err) {
      console.error('Failed to create Firestore server entry:', err);
    }
  };

  const handleJoinServerFromList = (server: P2PServerRoom) => {
    sound.playButtonPress();
    handleSaveNick(nickname);
    setRoomCode(server.peerId || server.name);
    onlineManager.joinOrCreateRoom(server.peerId || server.name, nickname, false);
  };

  const handleLeaveRoom = () => {
    sound.playButtonPress();
    if (activeDocIdRef.current) {
      removeP2PServerDoc(activeDocIdRef.current);
      activeDocIdRef.current = null;
    }
    onlineManager.leaveRoom();
  };

  const handleCopyCode = () => {
    sound.playButtonPress();
    try {
      navigator.clipboard.writeText(onlineManager.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const filteredServers = servers.filter(srv => {
    const matchQuery = srv.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       srv.hostName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchMode = filterMode === 'all' || srv.gameMode === filterMode;
    return matchQuery && matchMode;
  });

  const remotePlayers = onlineManager.getRemotePlayersArray();
  const totalPlayers = remotePlayers.length + (status === 'connected' ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl flex items-center justify-center ${
              status === 'connected' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
            }`}>
              {status === 'connected' ? <Radio className="w-6 h-6 animate-pulse" /> : <Globe className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide text-white uppercase">
                  P2P Мультиплеер & Серверы
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Firestore Lobby
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Запуск своих серверов, браузер комнат и метаданные заездов
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playButtonPress();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-200 text-sm">
          
          {/* Player Nickname Banner */}
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="text"
                value={nickname}
                maxLength={20}
                onChange={(e) => handleSaveNick(e.target.value)}
                placeholder="Ваш позывной..."
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-white font-semibold text-xs focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleRandomizeNick}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
                title="Случайный никнейм"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">
                {auth.currentUser ? `Игрок: ${auth.currentUser.displayName || nickname}` : 'Гость'}
              </span>
              
              {onOpenFriends && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playButtonPress();
                    onOpenFriends();
                  }}
                  className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg flex items-center gap-1 text-xs font-bold transition-all cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Друзья</span>
                </button>
              )}
            </div>
          </div>

          {/* VIEW IF CONNECTED TO A ROOM */}
          {status === 'connected' ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-300 font-bold uppercase">В СЕТИ:</span>
                      <span className="text-base font-black text-white font-mono bg-slate-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                        {onlineManager.roomCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                      {onlineManager.isHost ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-400" /> Хост сервера
                        </span>
                      ) : (
                        <span>Участник</span>
                      )}
                      <span>•</span>
                      <span>{totalPlayers} игроков онлайн</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/60 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                    <span>{copied ? 'Скопировано' : 'Код комнаты'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Покинуть</span>
                  </button>
                </div>
              </div>

              {/* Connected Players List */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400" /> Игроки в комнате ({totalPlayers})
                  </span>
                  <span className="text-emerald-400 text-[11px]">WebRTC Active</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-sky-500/30 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                        Я
                      </div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{onlineManager.localPlayerName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-sky-950 text-sky-300 border border-sky-500/40 rounded">
                          Вы {onlineManager.isHost && '• Хост'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono">0 ms</span>
                  </div>

                  {remotePlayers.map((player) => {
                    const carCfg = player.vehicleState ? CAR_CONFIGS[player.vehicleState.type] : null;
                    return (
                      <div key={player.peerId} className="flex items-center justify-between p-2.5 bg-slate-900/50 border border-slate-800 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {player.isInVehicle ? <Car className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{player.name}</span>
                              {player.isInVehicle && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-amber-950/60 text-amber-300 border border-amber-500/40 rounded">
                                  {carCfg?.name || 'Авто'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* VIEW IF DISCONNECTED: SERVER BROWSER OR HOST FORM */
            <div className="space-y-4">
              
              {/* Navigation Tabs */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => { sound.playButtonPress(); setViewMode('server_browser'); }}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'server_browser' 
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Server className="w-4 h-4" /> Список Серверов ({servers.length})
                </button>

                <button
                  onClick={() => { sound.playButtonPress(); setViewMode('create_server'); }}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'create_server' 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Plus className="w-4 h-4" /> Создать Сервер
                </button>

                <button
                  onClick={() => { sound.playButtonPress(); setViewMode('direct_code'); }}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'direct_code' 
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Radio className="w-4 h-4" /> Вход по Коду
                </button>
              </div>

              {/* TAB 1: SERVER BROWSER (FIRESTORE REALTIME) */}
              {viewMode === 'server_browser' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  
                  {/* Search and Filter bar */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по названию или имени хоста..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <select
                      value={filterMode}
                      onChange={(e) => setFilterMode(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="all">Все режимы</option>
                      {GAME_MODES.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Server Cards List */}
                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {filteredServers.length === 0 ? (
                      <div className="text-center py-10 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 text-xs text-slate-500 italic space-y-2">
                        <div>Активных P2P серверов в базе данных не найдено.</div>
                        <button
                          onClick={() => setViewMode('create_server')}
                          className="px-3.5 py-1.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs hover:bg-emerald-600/30 transition-colors cursor-pointer"
                        >
                          + Создать первый сервер
                        </button>
                      </div>
                    ) : (
                      filteredServers.map((srv) => (
                        <div key={srv.id} className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white">{srv.name}</span>
                              <span className="px-2 py-0.2 bg-sky-950 text-sky-300 border border-sky-500/40 rounded text-[10px] font-bold uppercase">
                                {GAME_MODES.find(g => g.id === srv.gameMode)?.name || srv.gameMode}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center gap-3">
                              <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-amber-400" /> Хост: <strong>{srv.hostName}</strong></span>
                              <span>•</span>
                              <span className="flex items-center gap-1"><Map className="w-3 h-3 text-sky-400" /> Карта: {srv.mapName}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-mono font-bold text-emerald-400">
                                {srv.currentPlayers} / {srv.maxPlayers}
                              </div>
                              <div className="text-[10px] text-slate-500">Игроки</div>
                            </div>

                            <button
                              onClick={() => handleJoinServerFromList(srv)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" /> Войти
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: CREATE P2P SERVER FORM */}
              {viewMode === 'create_server' && (
                <form onSubmit={handleCreateServerSubmit} className="space-y-3.5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Название сервера</label>
                      <input
                        type="text"
                        value={serverName}
                        onChange={(e) => setServerName(e.target.value)}
                        required
                        placeholder="Например: Дрифт Ночь Метрополис"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Макс. Игроков</label>
                      <select
                        value={maxPlayers}
                        onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        {[2, 4, 8, 12, 16].map(num => (
                          <option key={num} value={num}>{num} Игроков</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Игровой Режим</label>
                      <select
                        value={selectedGameMode}
                        onChange={(e) => setSelectedGameMode(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        {GAME_MODES.map(gm => (
                          <option key={gm.id} value={gm.id}>{gm.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Карта Локации</label>
                      <select
                        value={selectedMap}
                        onChange={(e) => setSelectedMap(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        {MAP_NAMES.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Запустить & Опубликовать Сервер
                  </button>
                </form>
              )}

              {/* TAB 3: DIRECT CODE ENTRY */}
              {viewMode === 'direct_code' && (
                <div className="space-y-4 animate-in fade-in duration-150 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <label className="text-xs font-semibold text-slate-400 block">
                    Ввести прямой код или PeerJS ID комнаты:
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={roomCode}
                      maxLength={24}
                      onChange={(e) => setRoomCode(e.target.value)}
                      placeholder="Код комнаты..."
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playButtonPress();
                      handleSaveNick(nickname);
                      onlineManager.joinOrCreateRoom(roomCode, nickname, false);
                    }}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Wifi className="w-4 h-4" /> Присоединиться напрямую
                  </button>
                </div>
              )}

            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Горячая клавиша: <strong>[ O ]</strong></span>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playButtonPress();
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Готово
          </button>
        </div>

      </div>
    </div>
  );
};

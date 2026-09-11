import React, { useState, useEffect } from 'react';
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
  Layers, 
  MessageSquare,
  Link,
  ChevronRight
} from 'lucide-react';
import { onlineManager, OnlineStatus } from '../onlineSystem';
import { sound } from '../audio';
import { CAR_CONFIGS } from '../vehicleHelpers';

interface OnlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVehicleId?: string | null;
}

const PRESET_ROOMS = [
  { code: 'metropolis-1', name: 'Метрополис #1' },
  { code: 'street-drift', name: 'Стрит-Дрифт' },
  { code: 'central-hub', name: 'Центральный Хаб' },
  { code: 'free-roam', name: 'Свободная Езда' }
];

export const OnlineModal: React.FC<OnlineModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<OnlineStatus>(onlineManager.status);
  const [errorMessage, setErrorMessage] = useState<string | null>(onlineManager.errorMessage);
  const [roomCode, setRoomCode] = useState<string>(onlineManager.roomCode || 'metropolis-1');
  const [nickname, setNickname] = useState<string>(onlineManager.localPlayerName);
  const [copied, setCopied] = useState<boolean>(false);
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    const unsub = onlineManager.subscribe(() => {
      setStatus(onlineManager.status);
      setErrorMessage(onlineManager.errorMessage);
      setTick((t) => t + 1);
    });
    return unsub;
  }, []);

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

  const handleCreateRoom = () => {
    sound.playButtonPress();
    handleSaveNick(nickname);
    onlineManager.joinOrCreateRoom(roomCode, nickname, true);
  };

  const handleJoinRoom = () => {
    sound.playButtonPress();
    handleSaveNick(nickname);
    onlineManager.joinOrCreateRoom(roomCode, nickname, false);
  };

  const handleLeaveRoom = () => {
    sound.playButtonPress();
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

  const remotePlayers = onlineManager.getRemotePlayersArray();
  const totalPlayers = remotePlayers.length + (status === 'connected' ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      {/* Container Card */}
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
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
                  Онлайн Режим
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  P2P WebRTC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Синхронизация игроков, машин, поломок и чата без выделенного сервера
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playButtonPress();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm">
          
          {/* Player Nickname Section */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Ваш игровой позывной / никнейм:</span>
              <span className="text-[11px] text-slate-500">Отображается над персонажем и в чате</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={nickname}
                  maxLength={20}
                  onChange={(e) => handleSaveNick(e.target.value)}
                  placeholder="Введите имя..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white font-medium text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={handleRandomizeNick}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                title="Случайный никнейм"
              >
                <Shuffle className="w-4 h-4 text-sky-400" />
                <span>Случайно</span>
              </button>
            </div>
          </div>

          {/* Connection Status / Room Setup */}
          {status === 'connected' ? (
            /* CONNECTED VIEW */
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Room Info Bar */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider">Комната:</span>
                      <span className="text-base font-black text-white font-mono bg-slate-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                        {onlineManager.roomCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {onlineManager.isHost ? '👑 Вы создатель (Хост комнаты)' : 'Участник P2P сети'} • {totalPlayers} игроков в сети
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/60 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                    <span>{copied ? 'Скопировано!' : 'Код комнаты'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Выйти</span>
                  </button>
                </div>
              </div>

              {/* Connected Players List */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    Список игроков ({totalPlayers})
                  </span>
                  <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Активно
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {/* Local Player Item */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-sky-500/30 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                        Я
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{onlineManager.localPlayerName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-sky-950 text-sky-300 border border-sky-500/40 rounded">
                            Вы {onlineManager.isHost && '• Хост'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {onlineManager.status === 'connected' ? 'В сети' : 'Подключение...'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono">0 ms</span>
                  </div>

                  {/* Remote Players Items */}
                  {remotePlayers.map((player) => {
                    const carCfg = player.vehicleState ? CAR_CONFIGS[player.vehicleState.type] : null;
                    return (
                      <div 
                        key={player.peerId}
                        className="flex items-center justify-between p-2.5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
                      >
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
                            <div className="text-[10px] text-slate-400">
                              {player.isInVehicle 
                                ? `За рулём (${Math.round(player.speed * 0.36)} км/ч)` 
                                : 'Пешком'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                          <span className="text-[11px] text-slate-400 font-mono">P2P</span>
                        </div>
                      </div>
                    );
                  })}

                  {remotePlayers.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                      В комнате пока нет других игроков. Скопируйте код комнаты и отправьте друзьям!
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* DISCONNECTED / CONNECTING VIEW */
            <div className="space-y-4">
              
              {/* Room Code Selection */}
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-3">
                <label className="text-xs font-semibold text-slate-400 block">
                  Код / Название комнаты:
                </label>
                
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={roomCode}
                    maxLength={24}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="Например: metropolis-1..."
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white font-mono font-medium text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      sound.playButtonPress();
                      setRoomCode(`room-${Math.floor(100 + Math.random() * 900)}`);
                    }}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    title="Сгенерировать случайный код"
                  >
                    Случайный
                  </button>
                </div>

                {/* Suggested Rooms */}
                <div>
                  <div className="text-[11px] text-slate-500 mb-1.5">Популярные комнаты:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_ROOMS.map((pr) => (
                      <button
                        key={pr.code}
                        type="button"
                        onClick={() => {
                          sound.playButtonPress();
                          setRoomCode(pr.code);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          roomCode === pr.code 
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/60' 
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {pr.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  disabled={status === 'connecting'}
                  onClick={handleCreateRoom}
                  className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{status === 'connecting' ? 'Создание...' : 'Создать комнату (Хост)'}</span>
                </button>

                <button
                  type="button"
                  disabled={status === 'connecting'}
                  onClick={handleJoinRoom}
                  className="px-5 py-3.5 bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Wifi className="w-4 h-4" />
                  <span>{status === 'connecting' ? 'Подключение...' : 'Войти в комнату'}</span>
                </button>
              </div>

              {/* Error Alert if any */}
              {errorMessage && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <WifiOff className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Feature Highlights Grid */}
          <div className="border-t border-slate-800/80 pt-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Возможности онлайн режима
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-start gap-2">
                <User className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">Синхронизация игрока</div>
                  <div className="text-[11px] text-slate-400">Положение, слои одежды, предметы в руках, анимации бега и прыжков</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-start gap-2">
                <Car className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">Синхронизация транспорта</div>
                  <div className="text-[11px] text-slate-400">Вмятины, геометрия softbody, фары, поворотники, клаксон и прицепы</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">Общий чат и реплики</div>
                  <div className="text-[11px] text-slate-400">Мгновенные сообщения и речевые облачка над головой и крышей машины</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">Без выделенного сервера</div>
                  <div className="text-[11px] text-slate-400">Прямое P2P соединение WebRTC + BroadcastChannel для браузерных вкладок</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Горячая клавиша: <strong>[ O ]</strong> (Online)</span>
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

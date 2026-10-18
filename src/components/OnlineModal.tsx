import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Car,
  User,
  Shuffle,
  LogOut,
  Server,
  Plus,
  Search,
  Play,
  Crown,
  Hash
} from 'lucide-react';
import { onlineManager, OnlineStatus } from '../onlineSystem';
import { sound } from '../audio';
import { ModalShell, Tabs } from './gameUi';
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
  { id: 'flatbody', name: 'Flatbody' },
  { id: 'steppe_highway', name: 'Степное Шоссе' },
  { id: 'industrial', name: 'Промзона' }
];

export const OnlineModal: React.FC<OnlineModalProps> = ({ isOpen, onClose, onOpenFriends }) => {
  const [status, setStatus] = useState<OnlineStatus>(onlineManager.status);
  const [errorMessage, setErrorMessage] = useState<string | null>(onlineManager.errorMessage);
  const [roomCode, setRoomCode] = useState<string>(onlineManager.roomCode || 'flatbody-1');
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
  const [selectedMap, setSelectedMap] = useState<string>('flatbody');
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

  const modeName = (id: string) => GAME_MODES.find(g => g.id === id)?.name || id;
  const mapName = (id: string) => MAP_NAMES.find(m => m.id === id)?.name || id;
  const fillClass = (cur: number, max: number) => {
    const r = cur / Math.max(1, max);
    return r < 0.6 ? '#9ac985' : r < 0.9 ? '#e0ab45' : '#d9745a';
  };

  const connected = status === 'connected';
  const subtitle = connected
    ? `Комната ${onlineManager.roomCode} · игроков: ${totalPlayers}`
    : 'Серверы P2P, создание комнаты и вход по коду';

  const NickRow = (
    <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ justifyContent: 'space-between', gap: 14 }}>
      <div className="gu-row2" style={{ flex: '1 1 320px', minWidth: 0 }}>
        <span className="gu-av">{(nickname || '?').charAt(0).toUpperCase()}</span>
        <div className="gu-grow">
          <div className="gu-lbl" style={{ marginBottom: 4 }}>
            {auth.currentUser ? `Аккаунт: ${auth.currentUser.displayName || nickname}` : 'Гостевой профиль'}
          </div>
          <div className="gu-row2" style={{ gap: 8 }}>
            <input
              type="text"
              className="gu-inp"
              style={{ height: 40, fontSize: 15 }}
              value={nickname}
              maxLength={20}
              onChange={e => handleSaveNick(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              placeholder="Ваш позывной"
              aria-label="Позывной"
            />
            <button type="button" className="gu-btn gu-btn-s gu-btn-sm gu-btn-sq" style={{ height: 40, width: 40 }} onClick={handleRandomizeNick} title="Случайный никнейм" aria-label="Случайный никнейм">
              <Shuffle width={17} height={17} />
            </button>
          </div>
        </div>
      </div>
      {onOpenFriends && (
        <button type="button" className="gu-btn gu-btn-s" onClick={() => { sound.playButtonPress(); onOpenFriends(); }}>
          <Users width={18} height={18} color="#e0ab45" />Друзья
        </button>
      )}
    </div>
  );

  return (
    <ModalShell
      id="online-modal"
      title="Онлайн"
      subtitle={subtitle}
      width={920}
      tall={!connected}
      onClose={() => { sound.playButtonPress(); onClose(); }}
      wipeKey={connected ? 'connected' : viewMode}
      bodyKey={connected ? 'connected' : viewMode}
      headRight={
        <div className="gu-pill gu-hide-s" style={{ height: 44, borderRadius: 10 }}>
          <span className={'gu-dot' + (connected ? ' gu-on' : '')} />
          {connected ? 'В сети' : 'Не в сети'}
        </div>
      }
      tabs={
        !connected ? (
          <Tabs
            value={viewMode}
            onChange={m => { sound.playButtonPress(); setViewMode(m); }}
            items={[
              { id: 'server_browser', label: 'Серверы', icon: <Server width={18} height={18} />, badge: servers.length || undefined },
              { id: 'create_server', label: 'Создать', icon: <Plus width={18} height={18} /> },
              { id: 'direct_code', label: 'По коду', icon: <Hash width={18} height={18} /> }
            ]}
          />
        ) : undefined
      }
      footerHints={[['Esc', 'Закрыть'], ['O', 'Открыть и закрыть']]}
      footerRight={<button type="button" className="gu-btn gu-btn-s gu-btn-sm" onClick={() => { sound.playButtonPress(); onClose(); }}>Готово</button>}
    >
      <div className="gu-stagger">
        {NickRow}

        {errorMessage && (
          <div className="gu-note gu-err gu-row2">
            <WifiOff width={18} height={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ======================= CONNECTED ======================= */}
        {connected && (
          <>
            <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div className="gu-lbl" style={{ marginBottom: 6 }}>Код комнаты</div>
                <div className="gu-row2" style={{ gap: 12 }}>
                  <span className="gu-num" style={{ fontSize: 32, color: '#fff', fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{onlineManager.roomCode}</span>
                  {onlineManager.isHost && (
                    <span className="gu-pill on" style={{ height: 28, fontSize: 13 }}><Crown width={14} height={14} />Хост</span>
                  )}
                </div>
              </div>
              <div className="gu-row2">
                <button type="button" className="gu-btn gu-btn-s" onClick={handleCopyCode}>
                  {copied ? <Check width={18} height={18} color="#9ac985" /> : <Copy width={18} height={18} />}
                  {copied ? 'Скопировано' : 'Скопировать код'}
                </button>
                <button type="button" className="gu-btn gu-btn-d" onClick={handleLeaveRoom}>
                  <LogOut width={18} height={18} />Покинуть
                </button>
              </div>
            </div>

            <div>
              <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="gu-grp">Игроки в комнате</span>
                <span className="gu-mut" style={{ fontSize: 13 }}>{totalPlayers}</span>
              </div>
              <div className="gu-list">
                <div className="gu-rw on">
                  <span className="gu-av">{(onlineManager.localPlayerName || '?').charAt(0).toUpperCase()}</span>
                  <div className="gu-grow">
                    <div className="gu-rw-t">{onlineManager.localPlayerName}</div>
                    <div className="gu-rw-d">Вы{onlineManager.isHost ? ' · хост' : ''}</div>
                  </div>
                  <div className="gu-rw-end"><span className="gu-dot gu-on" /></div>
                </div>
                {remotePlayers.map(player => {
                  const carCfg = player.vehicleState ? CAR_CONFIGS[player.vehicleState.type] : null;
                  return (
                    <div key={player.peerId} className="gu-rw">
                      <span className="gu-ico gu-off" style={{ width: 40, height: 40, borderRadius: '50%' }}>
                        {player.isInVehicle ? <Car width={18} height={18} /> : <User width={18} height={18} />}
                      </span>
                      <div className="gu-grow">
                        <div className="gu-rw-t">{player.name}</div>
                        <div className="gu-rw-d">{player.isInVehicle ? (carCfg?.name || 'В автомобиле') : 'Пешком'}</div>
                      </div>
                      <div className="gu-rw-end"><span className="gu-dot gu-on" /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ======================= SERVER BROWSER ======================= */}
        {!connected && viewMode === 'server_browser' && (
          <>
            <div className="gu-row2 gu-wrap" style={{ justifyContent: 'space-between' }}>
              <div className="gu-pills">
                <button type="button" className={'gu-pill' + (filterMode === 'all' ? ' on' : '')} onClick={() => setFilterMode('all')}>Все режимы</button>
                {GAME_MODES.map(m => (
                  <button type="button" key={m.id} className={'gu-pill' + (filterMode === m.id ? ' on' : '')} onClick={() => setFilterMode(m.id)}>{m.name}</button>
                ))}
              </div>
              <label className="gu-search" style={{ flex: '1 1 240px', maxWidth: 320 }}>
                <Search width={18} height={18} color="#a29e93" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder="Название или хост" />
              </label>
            </div>

            <div className="gu-list">
              {filteredServers.length === 0 ? (
                <div className="gu-empty">
                  <div className="gu-cn" style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Нет открытых серверов</div>
                  <div style={{ fontSize: 14, maxWidth: 380 }}>Создайте свой сервер или подключитесь к другу по коду комнаты.</div>
                  <button type="button" className="gu-btn gu-btn-p" onClick={() => setViewMode('create_server')}>
                    <Plus width={18} height={18} />Создать сервер
                  </button>
                </div>
              ) : (
                filteredServers.map(srv => {
                  const cp = srv.currentPlayers || 1;
                  const mp = srv.maxPlayers || 8;
                  return (
                    <div key={srv.id} className="gu-rw">
                      <span className="gu-dot gu-on" />
                      <div className="gu-grow">
                        <div className="gu-rw-t">{srv.name}</div>
                        <div className="gu-rw-d">Хост: {srv.hostName} · {mapName(srv.mapName)} · {modeName(srv.gameMode)}</div>
                      </div>
                      <div className="gu-rw-end">
                        <span style={{ fontWeight: 600, color: fillClass(cp, mp), fontVariantNumeric: 'tabular-nums' }}>{cp} / {mp}</span>
                        <button type="button" className="gu-btn gu-btn-p gu-btn-sm" onClick={() => handleJoinServerFromList(srv)} disabled={cp >= mp}>
                          <Play width={14} height={14} fill="#1a1409" />Войти
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ======================= CREATE SERVER ======================= */}
        {!connected && viewMode === 'create_server' && (
          <form onSubmit={handleCreateServerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="gu-panel gu-pad">
              <div className="gu-grid gu-g2" style={{ gap: 16 }}>
                <div>
                  <div className="gu-lbl">Название сервера</div>
                  <input type="text" className="gu-inp" value={serverName} onChange={e => setServerName(e.target.value)} onKeyDown={e => e.stopPropagation()} required placeholder="Например: Ночной дрифт" />
                </div>
                <div>
                  <div className="gu-lbl">Максимум игроков</div>
                  <select className="gu-inp" value={maxPlayers} onChange={e => setMaxPlayers(parseInt(e.target.value))}>
                    {[2, 4, 8, 12, 16].map(num => <option key={num} value={num}>{num} игроков</option>)}
                  </select>
                </div>
                <div>
                  <div className="gu-lbl">Игровой режим</div>
                  <select className="gu-inp" value={selectedGameMode} onChange={e => setSelectedGameMode(e.target.value)}>
                    {GAME_MODES.map(gm => <option key={gm.id} value={gm.id}>{gm.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="gu-lbl">Карта</div>
                  <select className="gu-inp" value={selectedMap} onChange={e => setSelectedMap(e.target.value)}>
                    {MAP_NAMES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <button type="submit" className="gu-btn gu-btn-p gu-btn-block"><Plus width={18} height={18} />Запустить и опубликовать</button>
          </form>
        )}

        {/* ======================= DIRECT CODE ======================= */}
        {!connected && viewMode === 'direct_code' && (
          <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div className="gu-lbl">Код комнаты или PeerJS ID</div>
              <input
                type="text"
                className="gu-inp gu-mono"
                value={roomCode}
                maxLength={24}
                onChange={e => setRoomCode(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                placeholder="Код комнаты"
              />
            </div>
            <button
              type="button"
              className="gu-btn gu-btn-p gu-btn-block"
              disabled={!roomCode.trim()}
              onClick={() => {
                sound.playButtonPress();
                handleSaveNick(nickname);
                onlineManager.joinOrCreateRoom(roomCode, nickname, false);
              }}
            >
              <Wifi width={18} height={18} />Присоединиться
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
